"""
Booking flow regression tests.

Covers every edge case from the P02c Definition of Done plus the Greptile
P1 fixes that landed in follow-up commits (property cross-check, already-
booked state, atomic claim).
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

import httpx
from playwright.sync_api import BrowserContext

from conftest import (
    PROPERTY_NAME_FOREIGN,
    PROPERTY_NAME_WITH_SLOTS,
    PROPERTY_REF_FOREIGN,
    PROPERTY_REF_WITH_SLOTS,
    SB_HEADERS,
    SUPABASE_URL,
    Seeder,
    StepResult,
    TestCase,
    UAT_EMAIL_PREFIX,
    clear_rate_limit,
    new_page,
    pick_available_slot,
    take_screenshot,
)

# Populated by the suite runner via set_runtime(...).
_RUNTIME: dict = {"target_url": None, "out_dir": None}


def set_runtime(target_url: str, out_dir) -> None:
    _RUNTIME["target_url"] = target_url
    _RUNTIME["out_dir"] = out_dir


# Shared across sequential tests: the happy-path app id and slot id so later
# tests can assert on the same booking state.
_STATE: dict = {"happy_app_id": None, "happy_slot_id": None}


# ----------------------------------------------------------------------------
# Test bodies
# ----------------------------------------------------------------------------


def _chk_bogus_app_redirects(ctx: BrowserContext, seeder: Seeder, result: StepResult) -> None:
    target = _RUNTIME["target_url"]
    out_dir = _RUNTIME["out_dir"]
    page, ce, pe = new_page(ctx)
    try:
        bogus = "11111111-1111-1111-1111-111111111111"
        url = f"{target}/book-viewing/{bogus}"
        result.url = url
        result.expected = "no booking form rendered (server redirect to /)"
        page.goto(url, wait_until="networkidle", timeout=20_000)
        result.screenshot = take_screenshot(page, out_dir, result.index, result.name)
        body = page.inner_text("body").lower()
        result.observed = body[:200].replace("\n", " ")
        if "book a viewing" not in body and "confirm your viewing" not in body:
            result.status = "PASS"
        else:
            result.status = "FAIL"
            result.reason = "booking UI was rendered for a bogus application id"
        result.console_errors = ce
        result.page_errors = pe
    finally:
        page.close()


def _chk_green_booking_page(ctx: BrowserContext, seeder: Seeder, result: StepResult) -> None:
    """Verify green app renders date picker + time slots (new calendar UX)."""
    target = _RUNTIME["target_url"]
    out_dir = _RUNTIME["out_dir"]
    app_id = seeder.seed_application(PROPERTY_REF_WITH_SLOTS, PROPERTY_NAME_WITH_SLOTS, tier="green")
    clear_rate_limit(app_id)
    page, ce, pe = new_page(ctx)
    try:
        url = f"{target}/book-viewing/{app_id}"
        result.url = url
        result.expected = f'"Book a viewing" header + "{PROPERTY_NAME_WITH_SLOTS}" + date pills + time slots'
        page.goto(url, wait_until="networkidle", timeout=20_000)
        result.screenshot = take_screenshot(page, out_dir, result.index, result.name)
        body = page.inner_text("body")
        body_lower = body.lower()
        result.observed = body[:300].replace("\n", " ")
        has_header = "book a viewing" in body_lower
        has_property = PROPERTY_NAME_WITH_SLOTS in body
        # Date picker shows short weekday names (Mon, Tue, etc.)
        has_date_pill = bool(re.search(r"\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b", body))
        # Time slots in HH:MM AM/PM format
        has_slot = bool(re.search(r"\b\d{1,2}:\d{2}\s?(AM|PM)\b", body))
        if has_header and has_property and has_date_pill and has_slot:
            result.status = "PASS"
        else:
            result.status = "FAIL"
            result.reason = f"header={has_header} property={has_property} date_pill={has_date_pill} slot={has_slot}"
        result.console_errors = ce
        result.page_errors = pe
    finally:
        page.close()


def _chk_api_invalid_uuid(ctx: BrowserContext, seeder: Seeder, result: StepResult) -> None:
    target = _RUNTIME["target_url"]
    url = f"{target}/api/book-viewing"
    result.url = url
    result.expected = "HTTP 400 + error='Invalid application id'"
    r = httpx.post(
        url,
        json={"applicationId": "not-a-uuid", "slotId": "also-not-a-uuid"},
        timeout=10.0,
    )
    result.observed = f"HTTP {r.status_code} body={r.text[:200]}"
    try:
        err = r.json().get("error", "")
    except Exception:
        err = ""
    if r.status_code == 400 and "Invalid application id" in err:
        result.status = "PASS"
    else:
        result.status = "FAIL"
        result.reason = "expected 400 with 'Invalid application id' error"


def _chk_api_happy_path(ctx: BrowserContext, seeder: Seeder, result: StepResult) -> None:
    target = _RUNTIME["target_url"]
    app_id = seeder.seed_application(PROPERTY_REF_WITH_SLOTS, PROPERTY_NAME_WITH_SLOTS, tier="green")
    clear_rate_limit(app_id)
    slot = pick_available_slot(PROPERTY_REF_WITH_SLOTS)
    if not slot:
        result.status = "FAIL"
        result.reason = "no available slot on test-property-001 to claim"
        return
    url = f"{target}/api/book-viewing"
    result.url = url
    result.expected = "success=true with slot payload"
    r = httpx.post(url, json={"applicationId": app_id, "slotId": slot["id"]}, timeout=15.0)
    result.observed = f"HTTP {r.status_code} body={r.text[:240]}"
    ok = False
    try:
        data = r.json()
        ok = bool(data.get("success")) and data.get("slot", {}).get("id") == slot["id"]
        _STATE["happy_app_id"] = app_id
        _STATE["happy_slot_id"] = slot["id"]
    except Exception as e:
        result.reason = f"json parse: {e}"
    result.status = "PASS" if ok else "FAIL"
    if not ok and not result.reason:
        result.reason = "success flag or slot id mismatch"


def _chk_api_reclaim_already_booked(ctx: BrowserContext, seeder: Seeder, result: StepResult) -> None:
    target = _RUNTIME["target_url"]
    app_id = _STATE.get("happy_app_id")
    slot_id = _STATE.get("happy_slot_id")
    if not app_id or not slot_id:
        result.status = "FAIL"
        result.reason = "previous happy-path test didn't leave state"
        return
    url = f"{target}/api/book-viewing"
    result.url = url
    result.expected = "success=false with error=already_booked (or slot_taken)"
    r = httpx.post(url, json={"applicationId": app_id, "slotId": slot_id}, timeout=15.0)
    result.observed = f"HTTP {r.status_code} body={r.text[:240]}"
    try:
        data = r.json()
        err = data.get("error", "")
        if data.get("success") is False and err in ("already_booked", "slot_taken"):
            result.status = "PASS"
        else:
            result.status = "FAIL"
            result.reason = f"unexpected response: {data}"
    except Exception as e:
        result.status = "FAIL"
        result.reason = f"json parse: {e}"


def _chk_api_cross_property_guard(ctx: BrowserContext, seeder: Seeder, result: StepResult) -> None:
    target = _RUNTIME["target_url"]
    app_id = seeder.seed_application(PROPERTY_REF_WITH_SLOTS, PROPERTY_NAME_WITH_SLOTS, tier="green")
    clear_rate_limit(app_id)
    foreign_slot = pick_available_slot(PROPERTY_REF_FOREIGN)
    if not foreign_slot:
        result.status = "FAIL"
        result.reason = "no available slot on test-property-002 to use as foreign target"
        return
    url = f"{target}/api/book-viewing"
    result.url = url
    result.expected = "success=false (slot_taken) AND foreign slot remains available"
    r = httpx.post(
        url,
        json={"applicationId": app_id, "slotId": foreign_slot["id"]},
        timeout=15.0,
    )
    result.observed = f"HTTP {r.status_code} body={r.text[:240]}"
    ok_api = False
    try:
        data = r.json()
        ok_api = data.get("success") is False and data.get("error") == "slot_taken"
    except Exception:
        pass
    # Verify the foreign slot was not mutated.
    check = httpx.get(
        f"{SUPABASE_URL}/rest/v1/viewing_slots"
        f"?id=eq.{foreign_slot['id']}&select=status,applicant_id",
        headers=SB_HEADERS,
        timeout=10.0,
    )
    untouched = False
    try:
        rows = check.json()
        if rows and rows[0]["status"] == "available" and rows[0]["applicant_id"] is None:
            untouched = True
    except Exception:
        pass
    if ok_api and untouched:
        result.status = "PASS"
    else:
        result.status = "FAIL"
        result.reason = f"api_rejected={ok_api} foreign_untouched={untouched}"


def _chk_ui_confirmation_view(ctx: BrowserContext, seeder: Seeder, result: StepResult) -> None:
    target = _RUNTIME["target_url"]
    out_dir = _RUNTIME["out_dir"]
    app_id = _STATE.get("happy_app_id")
    if not app_id:
        result.status = "FAIL"
        result.reason = "no happy-path app id in state"
        return
    page, ce, pe = new_page(ctx)
    try:
        url = f"{target}/book-viewing/{app_id}"
        result.url = url
        result.expected = '"Your viewing is confirmed." + WhatsApp 24h copy'
        page.goto(url, wait_until="networkidle", timeout=20_000)
        result.screenshot = take_screenshot(page, out_dir, result.index, result.name)
        body = page.inner_text("body")
        result.observed = body[:260].replace("\n", " ")
        has_confirmed = "Your viewing is confirmed" in body
        has_whatsapp = "WhatsApp" in body and "24 hours" in body
        if has_confirmed and has_whatsapp:
            result.status = "PASS"
        else:
            result.status = "FAIL"
            result.reason = f"confirmed={has_confirmed} whatsapp={has_whatsapp}"
        result.console_errors = ce
        result.page_errors = pe
    finally:
        page.close()


def _chk_api_rate_limit(ctx: BrowserContext, seeder: Seeder, result: StepResult) -> None:
    target = _RUNTIME["target_url"]
    app_id = seeder.seed_application(PROPERTY_REF_WITH_SLOTS, PROPERTY_NAME_WITH_SLOTS, tier="green")
    clear_rate_limit(app_id)
    url = f"{target}/api/book-viewing"
    result.url = url
    result.expected = "4th attempt → HTTP 429 rate_limited"
    # Well-formed but non-existent UUID — passes validation, misses the slot,
    # returns slot_taken. After 3 of those, the 4th triggers the rate limit.
    fake_slot = "22222222-2222-4222-8222-222222222222"
    statuses: list = []
    for _ in range(4):
        r = httpx.post(
            url,
            json={"applicationId": app_id, "slotId": fake_slot},
            timeout=10.0,
        )
        statuses.append(r.status_code)
    result.observed = f"statuses={statuses}"
    if statuses[:3].count(429) == 0 and statuses[3] == 429:
        result.status = "PASS"
    else:
        result.status = "FAIL"
        result.reason = "rate limit did not fire on the 4th attempt"


def _chk_ui_no_slots_fallback(ctx: BrowserContext, seeder: Seeder, result: StepResult) -> None:
    target = _RUNTIME["target_url"]
    out_dir = _RUNTIME["out_dir"]
    # Seed a green app whose property_ref has zero slots (unique per run).
    import time as _time
    empty_ref = f"uat-empty-{int(_time.time() * 1000)}"
    empty_name = "UAT Empty Property"
    app_id = seeder.seed_application(empty_ref, empty_name, tier="green")
    clear_rate_limit(app_id)
    page, ce, pe = new_page(ctx)
    try:
        url = f"{target}/book-viewing/{app_id}"
        result.url = url
        result.expected = '"No viewing slots" fallback message + applicant details pre-filled'
        page.goto(url, wait_until="networkidle", timeout=20_000)
        result.screenshot = take_screenshot(page, out_dir, result.index, result.name)
        body = page.inner_text("body")
        result.observed = body[:260].replace("\n", " ")
        has_fallback = "No viewing slots" in body
        has_details = "UAT Runner" in body or UAT_EMAIL_PREFIX in body
        if has_fallback and has_details:
            result.status = "PASS"
        else:
            result.status = "FAIL"
            result.reason = f"fallback={has_fallback} details={has_details}"
        result.console_errors = ce
        result.page_errors = pe
    finally:
        page.close()


def _chk_48h_minimum_window(ctx: BrowserContext, seeder: Seeder, result: StepResult) -> None:
    """Verify no slots within 48 hours of now are shown on the booking page."""
    target = _RUNTIME["target_url"]
    out_dir = _RUNTIME["out_dir"]
    app_id = seeder.seed_application(PROPERTY_REF_WITH_SLOTS, PROPERTY_NAME_WITH_SLOTS, tier="green")
    clear_rate_limit(app_id)
    page, ce, pe = new_page(ctx)
    try:
        url = f"{target}/book-viewing/{app_id}"
        result.url = url
        result.expected = "All displayed slots are >48 hours from now"
        page.goto(url, wait_until="networkidle", timeout=20_000)
        result.screenshot = take_screenshot(page, out_dir, result.index, result.name)
        body = page.inner_text("body")
        result.observed = body[:260].replace("\n", " ")

        # If the fallback is shown, the filter did its job (or there are no slots).
        if "No viewing slots" in body:
            result.status = "PASS"
            result.console_errors = ce
            result.page_errors = pe
            return

        # Verify via the API that the slots in the DB within 48h are NOT on the page.
        now = datetime.now(timezone.utc)
        cutoff = now + timedelta(hours=48)
        r = httpx.get(
            f"{SUPABASE_URL}/rest/v1/viewing_slots"
            f"?property_ref=eq.{PROPERTY_REF_WITH_SLOTS}&status=eq.available"
            f"&select=slot_date,start_time&order=slot_date.asc,start_time.asc",
            headers=SB_HEADERS,
            timeout=10.0,
        )
        all_slots = r.json() if r.status_code == 200 else []
        slots_within_48h = [
            s for s in all_slots
            if datetime.fromisoformat(f"{s['slot_date']}T{s['start_time']}+00:00") <= cutoff
        ]

        if slots_within_48h:
            violations = []
            for s in slots_within_48h:
                h, m, *_ = s["start_time"].split(":")
                hour = int(h)
                minute = int(m)
                period = "PM" if hour >= 12 else "AM"
                hour12 = hour % 12 or 12
                time_label = f"{hour12}:{minute:02d} {period}"
                if time_label in body:
                    violations.append(f"{s['slot_date']} {time_label}")
            if violations:
                result.status = "FAIL"
                result.reason = f"Slots within 48h shown on page: {violations}"
            else:
                result.status = "PASS"
        else:
            result.status = "PASS"

        result.console_errors = ce
        result.page_errors = pe
    finally:
        page.close()


def _chk_rebook_banner(ctx: BrowserContext, seeder: Seeder, result: StepResult) -> None:
    """Verify the rebook banner appears when cancel_count > 0."""
    target = _RUNTIME["target_url"]
    out_dir = _RUNTIME["out_dir"]
    app_id = seeder.seed_application(PROPERTY_REF_WITH_SLOTS, PROPERTY_NAME_WITH_SLOTS, tier="green")
    clear_rate_limit(app_id)

    # Set cancel_count = 1 on the test application.
    httpx.patch(
        f"{SUPABASE_URL}/rest/v1/applications?id=eq.{app_id}",
        headers={**SB_HEADERS, "Prefer": "return=minimal"},
        json={"cancel_count": 1},
        timeout=10.0,
    )

    page, ce, pe = new_page(ctx)
    try:
        url = f"{target}/book-viewing/{app_id}"
        result.url = url
        result.expected = "Rebook banner with 'previous viewing was cancelled' text"
        page.goto(url, wait_until="networkidle", timeout=20_000)
        result.screenshot = take_screenshot(page, out_dir, result.index, result.name)
        body = page.inner_text("body")
        result.observed = body[:300].replace("\n", " ")
        has_banner = "previous viewing was cancelled" in body.lower()
        if has_banner:
            result.status = "PASS"
        else:
            result.status = "FAIL"
            result.reason = "rebook banner not found on page"
        result.console_errors = ce
        result.page_errors = pe
    finally:
        page.close()


# ----------------------------------------------------------------------------
# Exported TESTS list — the suite runner concatenates all of these.
# ----------------------------------------------------------------------------

TESTS: list[TestCase] = [
    TestCase(name="Booking: bogus applicationId blocked", kind="ui", run=_chk_bogus_app_redirects),
    TestCase(name="Booking: green app renders date picker + slots", kind="ui", run=_chk_green_booking_page),
    TestCase(name="Booking API: invalid UUID returns 400", kind="api", run=_chk_api_invalid_uuid),
    TestCase(name="Booking API: happy path claim succeeds", kind="api", run=_chk_api_happy_path),
    TestCase(name="Booking API: re-claim returns already_booked", kind="api", run=_chk_api_reclaim_already_booked),
    TestCase(name="Booking API: cross-property guard rejects foreign slot", kind="api", run=_chk_api_cross_property_guard),
    TestCase(name="Booking UI: confirmation view + WhatsApp 24h copy", kind="ui", run=_chk_ui_confirmation_view),
    TestCase(name="Booking API: rate limit at 4th attempt", kind="api", run=_chk_api_rate_limit),
    TestCase(name="Booking UI: no-slots fallback with pre-filled details", kind="ui", run=_chk_ui_no_slots_fallback),
    TestCase(name="Booking UI: 48h minimum booking window enforced", kind="ui", run=_chk_48h_minimum_window),
    TestCase(name="Booking UI: rebook banner when cancel_count > 0", kind="ui", run=_chk_rebook_banner),
]
