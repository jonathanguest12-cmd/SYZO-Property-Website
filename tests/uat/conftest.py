"""
Shared infrastructure for the SYZO UAT regression suite.

Every test module imports from this file:
- TestCase / StepResult dataclasses
- Seeder for creating + tearing down Supabase test data
- Playwright helpers (new_page, take_screenshot)
- Supabase helpers (pick_available_slot, clear_rate_limit, clean_pre_run)
- Constants for known test properties

Nothing in this file reads from the conversation or from a brief —
it is purely a library used by test_*.py modules and suite.py.
"""

from __future__ import annotations

import os
import re
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

import httpx
from dotenv import load_dotenv
from playwright.sync_api import BrowserContext, Page, Error as PlaywrightError

# ----------------------------------------------------------------------------
# Paths and env
# ----------------------------------------------------------------------------

REPO_ROOT = Path.home() / "Documents" / "SYZO" / "syzo-property-website"
TESTS_DIR = REPO_ROOT / "tests" / "uat"
BASELINES_DIR = TESTS_DIR / "baselines"

load_dotenv(REPO_ROOT / ".env.local")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SECRET_KEY_PARROT", "")
REDIS_URL = os.environ.get("UPSTASH_REDIS_REST_URL", "")
REDIS_TOK = os.environ.get("UPSTASH_REDIS_REST_TOKEN", "")

SB_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

# Seed properties in viewing_slots — stable across runs.
PROPERTY_REF_WITH_SLOTS = "test-property-001"
PROPERTY_NAME_WITH_SLOTS = "Radnor Place"
PROPERTY_REF_FOREIGN = "test-property-002"
PROPERTY_NAME_FOREIGN = "Alexandra Road"

# Any email matching this pattern is safe to nuke in global cleanup.
UAT_EMAIL_PREFIX = "uat-"

# Viewports — pick per test based on whether the feature renders mobile or desktop.
MOBILE_VIEWPORT = {"width": 390, "height": 844}
DESKTOP_VIEWPORT = {"width": 1280, "height": 900}

# Per-test max wall time (seconds). Playwright's own default action timeout
# is 30s, so we set the wall-clock slightly higher to let assertions finish.
DEFAULT_TEST_TIMEOUT = 40


# ----------------------------------------------------------------------------
# Result / test case types
# ----------------------------------------------------------------------------

@dataclass
class StepResult:
    index: int
    name: str
    kind: str  # "ui" | "api" | "data" | "visual" | "manual"
    status: str = "PENDING"  # PENDING | PASS | FAIL | SKIP | VISUAL_REGRESSION | BASELINE_CAPTURED
    url: str = ""
    expected: str = ""
    observed: str = ""
    screenshot: str = ""
    diff_image: str = ""
    diff_ratio: float = 0.0
    console_errors: list = field(default_factory=list)
    page_errors: list = field(default_factory=list)
    duration_ms: int = 0
    reason: str = ""
    module: str = ""


@dataclass
class TestCase:
    name: str
    kind: str  # "ui" | "api" | "data" | "visual" | "manual"
    run: Callable[[BrowserContext, "Seeder", StepResult], None] = field(
        default=lambda *_: None
    )
    skip_reason: str = ""
    module: str = ""  # filled by the suite runner
    # Per-test viewport override. Default is mobile to match the mobile-first
    # design; tests that need the desktop layout (e.g. inline filter pills)
    # should set this to DESKTOP_VIEWPORT.
    viewport: dict = field(default_factory=lambda: dict(MOBILE_VIEWPORT))


# ----------------------------------------------------------------------------
# Seeder — track every Supabase row we create so teardown always happens.
# ----------------------------------------------------------------------------

class Seeder:
    def __init__(self) -> None:
        self.applications: list[str] = []

    def seed_application(
        self,
        property_ref: str,
        property_name: str,
        tier: str = "green",
        annual_income: str = "high",
        smokes: bool = False,
        has_pets: bool = False,
        adverse_credit: bool = False,
        length_of_stay: str = "12+ months",
        who_moving_in: str = "Just me",
        has_guarantor: Any = None,
    ) -> str:
        """Insert a single throwaway application. Returns the id."""
        ts = int(time.time() * 1000)
        payload = {
            "room_name": "UAT Room",
            "property_name": property_name,
            "property_ref": property_ref,
            "rent_pcm": 600,
            "who_moving_in": who_moving_in,
            "move_in_timeline": "Within 4 weeks",
            "employment_status": "Employed",
            "annual_income": annual_income,
            "smokes": smokes,
            "has_pets": has_pets,
            "length_of_stay": length_of_stay,
            "adverse_credit": adverse_credit,
            "has_guarantor": has_guarantor,
            "full_name": "UAT Runner",
            "email": f"{UAT_EMAIL_PREFIX}seed+{ts}@syzo.local",
            "phone": "07000000000",
            "score": 100 if tier == "green" else 60 if tier == "amber" else 20,
            "tier": tier,
            "red_reason": None,
            "scoring_flags": [],
        }
        r = httpx.post(
            f"{SUPABASE_URL}/rest/v1/applications?select=id",
            headers={**SB_HEADERS, "Prefer": "return=representation"},
            json=payload,
            timeout=10.0,
        )
        r.raise_for_status()
        app_id: str = r.json()[0]["id"]
        self.applications.append(app_id)
        return app_id

    def cleanup(self) -> dict[str, Any]:
        """Best-effort cleanup — safe to call even if partially complete."""
        summary: dict[str, Any] = {
            "applications_deleted": 0,
            "slots_reset": 0,
            "errors": [],
        }

        for app_id in list(self.applications):
            try:
                r = httpx.patch(
                    f"{SUPABASE_URL}/rest/v1/viewing_slots"
                    f"?applicant_id=eq.{app_id}&status=eq.booked",
                    headers={**SB_HEADERS, "Prefer": "return=minimal"},
                    json={"status": "available", "applicant_id": None},
                    timeout=10.0,
                )
                if r.status_code in (200, 204):
                    summary["slots_reset"] += 1
            except Exception as e:
                summary["errors"].append(f"slot reset {app_id}: {e}")

        for app_id in list(self.applications):
            try:
                r = httpx.delete(
                    f"{SUPABASE_URL}/rest/v1/applications?id=eq.{app_id}",
                    headers=SB_HEADERS,
                    timeout=10.0,
                )
                if r.status_code in (200, 204):
                    summary["applications_deleted"] += 1
            except Exception as e:
                summary["errors"].append(f"delete app {app_id}: {e}")

        return summary


def clean_pre_run() -> None:
    """Delete any residue left by previous UAT runs.

    Uses the UAT_EMAIL_PREFIX so we never touch real applicant data.
    Also clears the /api/submit Upstash rate-limit buckets, since a UAT
    run will blow past the 5/hr-per-IP limit with 8 form walks.
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        return
    try:
        httpx.delete(
            f"{SUPABASE_URL}/rest/v1/applications?email=like.{UAT_EMAIL_PREFIX}*",
            headers=SB_HEADERS,
            timeout=10.0,
        )
    except Exception:
        pass
    try:
        httpx.patch(
            f"{SUPABASE_URL}/rest/v1/viewing_slots"
            f"?property_ref=in.({PROPERTY_REF_WITH_SLOTS},{PROPERTY_REF_FOREIGN})"
            f"&status=eq.booked",
            headers={**SB_HEADERS, "Prefer": "return=minimal"},
            json={"status": "available", "applicant_id": None},
            timeout=10.0,
        )
    except Exception:
        pass
    # Clear the /api/submit rate limit keys for every IP that localhost
    # might appear as. The key template is `apply-submit:submit:<ip>` and
    # there's also a `book-viewing:book:<appId>` space but that's per-app
    # and already handled by the Seeder.
    for ip in ("unknown", "127.0.0.1", "::1"):
        _del_redis_key(f"apply-submit:submit:{ip}")


def _del_redis_key(key: str) -> None:
    if not REDIS_URL or not REDIS_TOK:
        return
    try:
        httpx.get(
            f"{REDIS_URL}/del/{key}",
            headers={"Authorization": f"Bearer {REDIS_TOK}"},
            timeout=5.0,
        )
    except Exception:
        pass


# ----------------------------------------------------------------------------
# Playwright helpers
# ----------------------------------------------------------------------------

def new_page(context: BrowserContext) -> tuple[Page, list, list]:
    console_errors: list = []
    page_errors: list = []
    page = context.new_page()
    page.on(
        "console",
        lambda msg: (
            console_errors.append(f"{msg.type}: {msg.text}")
            if msg.type in ("error", "warning")
            else None
        ),
    )
    page.on("pageerror", lambda exc: page_errors.append(str(exc)))
    return page, console_errors, page_errors


_SAFE_NAME_RE = re.compile(r"[^A-Za-z0-9_-]+")


def take_screenshot(page: Page, out_dir: Path, index: int, name: str) -> str:
    """Capture a numbered full-page PNG under out_dir and return the filename."""
    safe = _SAFE_NAME_RE.sub("-", name).strip("-")[:40] or "screenshot"
    filename = f"step-{index:02d}-{safe}.png"
    path = out_dir / filename
    try:
        page.screenshot(path=str(path), full_page=True)
    except PlaywrightError:
        page.screenshot(path=str(path))
    return filename


# ----------------------------------------------------------------------------
# Supabase / Upstash helpers
# ----------------------------------------------------------------------------

def pick_available_slot(property_ref: str) -> dict | None:
    try:
        r = httpx.get(
            f"{SUPABASE_URL}/rest/v1/viewing_slots"
            f"?property_ref=eq.{property_ref}&status=eq.available"
            f"&select=id,slot_date,start_time&order=slot_date.asc,start_time.asc&limit=1",
            headers=SB_HEADERS,
            timeout=10.0,
        )
        if r.status_code != 200:
            return None
        rows = r.json()
        return rows[0] if rows else None
    except Exception:
        return None


def clear_rate_limit(app_id: str, prefix: str = "book-viewing:book") -> None:
    """Delete the Upstash sliding-window key for a given application id."""
    if not REDIS_URL or not REDIS_TOK:
        return
    key = f"{prefix}:{app_id}"
    try:
        httpx.get(
            f"{REDIS_URL}/del/{key}",
            headers={"Authorization": f"Bearer {REDIS_TOK}"},
            timeout=5.0,
        )
    except Exception:
        pass


# ----------------------------------------------------------------------------
# Screening form helper — used by every test_screening.py path.
# ----------------------------------------------------------------------------

def pick_room_id_from_homepage(page: Page) -> str | None:
    """Find the first /room/<uuid> link on the homepage."""
    for a in page.locator("a[href^='/room/']").all()[:10]:
        href = a.get_attribute("href") or ""
        m = re.match(r"^/room/([0-9a-f-]{36})$", href)
        if m:
            return m.group(1)
    return None


def screening_contact_fields(page: Page, email_suffix: str) -> None:
    """Fill in the contact form on step 10 and submit. Uses a unique UAT email."""
    ts = int(time.time() * 1000)
    page.wait_for_selector("#fullName", timeout=10_000)
    page.fill("#fullName", "UAT Runner")
    page.fill("#email", f"{UAT_EMAIL_PREFIX}form{ts}-{email_suffix}@syzo.local")
    page.fill("#phone", "07000000000")
    page.get_by_role("button", name="Submit Application", exact=True).click()
