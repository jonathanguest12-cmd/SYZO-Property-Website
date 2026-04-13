"""
Screening form regression tests — every tier-producing path.

Each test walks the live 9-step form and asserts the rendered result.
The scoring table used to predict the expected tier is in
src/lib/scoring.ts (verified 2026-04-11):

  - smokes=yes OR pets=yes             → RED (hard disqualifier, form short-circuits)
  - short stay / adverse credit / family / low-income-without-guarantor → AMBER
  - low-income + guarantor=yes + clean otherwise → GREEN (guarantor clears flag)
  - everything clean + ≥75% score      → GREEN

Brief-exact result copy:
  GREEN: "Great news." + "You're a strong fit for this room. Book a viewing slot below to secure your place."
  AMBER: "Thanks for applying." + "Thanks for applying. We'll review your application within 2 working days and be in touch."
  RED:   "Thanks for applying." + "Thanks for applying. Unfortunately we're unable to proceed with your application at this time."

"Book a Viewing" CTA must appear ONLY on green.
"""

from __future__ import annotations

import re

from playwright.sync_api import BrowserContext

from conftest import (
    Seeder,
    StepResult,
    TestCase,
    new_page,
    pick_room_id_from_homepage,
    screening_contact_fields,
    take_screenshot,
)

# The /api/submit endpoint is rate-limited 5/hr per IP. We walk the form 8
# times so the suite runner (suite.py) assigns each test a unique
# X-Forwarded-For header via extra_http_headers — every test hits the API
# as a distinct IP and has its own fresh bucket. No Redis surgery needed.

_RUNTIME: dict = {"target_url": None, "out_dir": None}


def set_runtime(target_url: str, out_dir) -> None:
    _RUNTIME["target_url"] = target_url
    _RUNTIME["out_dir"] = out_dir


# ----------------------------------------------------------------------------
# Form walker
# ----------------------------------------------------------------------------

# Income button labels use formatGBP (nbsp before the digits). Regex is the
# most robust way to target them.
INCOME_REGEX = {
    "under_low": re.compile(r"Under\s+\S?20,000"),
    "low": re.compile(r"20,000.*28,000"),
    "medium": re.compile(r"28,000.*40,000"),
    "high": re.compile(r"40,000\s+or\s+more"),
}


def _walk_and_submit(page, target_url, room_id, plan: dict, email_tag: str) -> None:
    """Walk the 9-step form with the given plan and submit the contact form.

    plan keys: who, move, employment, income, smokes, pets, stay, adverse, guarantor
    - smokes=True short-circuits from Q5 to contact (skips pets/stay/adverse/guarantor)
    - pets=True short-circuits from Q6 to contact
    - guarantor is only asked if income is under_low or low
    """
    page.goto(f"{target_url}/apply/{room_id}", wait_until="networkidle", timeout=20_000)
    page.get_by_role("button", name="Start Application", exact=True).click()

    # Q1 who
    page.get_by_role("button", name=plan["who"], exact=True).click()
    # Q2 move
    page.get_by_role("button", name=plan["move"], exact=True).click()
    # Q3 employment
    page.get_by_role("button", name=plan["employment"], exact=True).click()
    # Q4 income
    page.get_by_role("button", name=INCOME_REGEX[plan["income"]]).click()
    # Q5 smokes
    if plan["smokes"]:
        page.get_by_role("button", name="Yes", exact=True).click()
        # Skip to contact
        screening_contact_fields(page, email_tag)
        return
    page.get_by_role("button", name="No", exact=True).click()
    # Q6 pets
    if plan["pets"]:
        page.get_by_role("button", name="Yes", exact=True).click()
        screening_contact_fields(page, email_tag)
        return
    page.get_by_role("button", name="No", exact=True).click()
    # Q7 stay
    page.get_by_role("button", name=plan["stay"], exact=True).click()
    # Q8 adverse credit
    page.get_by_role("button", name="Yes" if plan["adverse"] else "No", exact=True).click()
    # Q9 guarantor (only for low income)
    if plan["income"] in ("under_low", "low"):
        page.get_by_role("button", name="Yes" if plan["guarantor"] else "No", exact=True).click()
    # Contact form
    screening_contact_fields(page, email_tag)


def _verify_result(
    page,
    expected_tier: str,
    result: StepResult,
    out_dir,
) -> None:
    """Wait for the result view, screenshot it, and assert on heading + body + CTA."""
    if expected_tier == "green":
        page.wait_for_selector("text=Great news", timeout=20_000)
    else:
        page.wait_for_selector("text=Thanks for applying", timeout=20_000)

    result.screenshot = take_screenshot(page, out_dir, result.index, result.name)
    body = page.inner_text("body")
    result.observed = body[:320].replace("\n", " ")

    # Must not contain literal unicode escape sequences.
    has_escape_leak = "\\u2019" in body or "\\u201" in body

    if expected_tier == "green":
        ok_heading = "Great news." in body
        ok_body = (
            "You're a strong fit for this room" in body
            and "Book a viewing slot below" in body
        )
        ok_cta = "Book a Viewing" in body
        if ok_heading and ok_body and ok_cta and not has_escape_leak:
            result.status = "PASS"
        else:
            result.status = "FAIL"
            result.reason = (
                f"heading={ok_heading} body={ok_body} cta={ok_cta} escape_leak={has_escape_leak}"
            )
    elif expected_tier == "amber":
        ok_heading = "Thanks for applying." in body
        ok_body = "review your application within 2 working days" in body
        ok_no_cta = "Book a Viewing" not in body
        if ok_heading and ok_body and ok_no_cta and not has_escape_leak:
            result.status = "PASS"
        else:
            result.status = "FAIL"
            result.reason = (
                f"heading={ok_heading} body={ok_body} no_cta={ok_no_cta} escape_leak={has_escape_leak}"
            )
    else:  # red
        ok_heading = "Thanks for applying." in body
        ok_body = "unable to proceed with your application" in body
        ok_no_cta = "Book a Viewing" not in body
        if ok_heading and ok_body and ok_no_cta and not has_escape_leak:
            result.status = "PASS"
        else:
            result.status = "FAIL"
            result.reason = (
                f"heading={ok_heading} body={ok_body} no_cta={ok_no_cta} escape_leak={has_escape_leak}"
            )


# ----------------------------------------------------------------------------
# Per-path plans (verified against scoring.ts)
# ----------------------------------------------------------------------------

PLAN_GREEN_BASE = {
    "who": "Just me",
    "move": "Within 4 weeks",
    "employment": "Employed",
    "income": "high",
    "smokes": False,
    "pets": False,
    "stay": "12+ months",
    "adverse": False,
    "guarantor": None,
}


def _run_path(tier: str, email_tag: str, plan: dict):
    def _inner(ctx: BrowserContext, seeder: Seeder, result: StepResult) -> None:
        target = _RUNTIME["target_url"]
        out_dir = _RUNTIME["out_dir"]
        page, ce, pe = new_page(ctx)
        try:
            page.goto(target, wait_until="networkidle", timeout=20_000)
            room_id = pick_room_id_from_homepage(page)
            if not room_id:
                result.status = "FAIL"
                result.reason = "no /room/<uuid> link on homepage"
                return
            result.url = f"{target}/apply/{room_id}"
            result.expected = f"tier={tier} (heading + body + CTA gating)"
            _walk_and_submit(page, target, room_id, plan, email_tag)
            _verify_result(page, tier, result, out_dir)
            result.console_errors = ce
            result.page_errors = pe
        finally:
            page.close()
    return _inner


# ----------------------------------------------------------------------------
# TESTS
# ----------------------------------------------------------------------------

TESTS: list[TestCase] = [
    TestCase(
        name="Screening GREEN — happy path (Just me, employed, high income, clean)",
        kind="ui",
        run=_run_path("green", "green-happy", {**PLAN_GREEN_BASE}),
    ),
    TestCase(
        name="Screening AMBER — Under 6 months stay",
        kind="ui",
        run=_run_path("amber", "amber-shortstay", {**PLAN_GREEN_BASE, "stay": "Under 6 months"}),
    ),
    TestCase(
        name="Screening AMBER — adverse credit",
        kind="ui",
        run=_run_path("amber", "amber-adverse", {**PLAN_GREEN_BASE, "adverse": True}),
    ),
    TestCase(
        name="Screening AMBER — low income without guarantor",
        kind="ui",
        run=_run_path(
            "amber",
            "amber-lowincome",
            {**PLAN_GREEN_BASE, "income": "under_low", "guarantor": False},
        ),
    ),
    TestCase(
        name="Screening AMBER — Me and family",
        kind="ui",
        run=_run_path("amber", "amber-family", {**PLAN_GREEN_BASE, "who": "Me and family"}),
    ),
    TestCase(
        name="Screening RED — smoker",
        kind="ui",
        run=_run_path("red", "red-smoker", {**PLAN_GREEN_BASE, "smokes": True}),
    ),
    TestCase(
        name="Screening RED — pet owner",
        kind="ui",
        run=_run_path("red", "red-pets", {**PLAN_GREEN_BASE, "pets": True}),
    ),
    TestCase(
        name="Screening GREEN — guarantor clears low income",
        kind="ui",
        run=_run_path(
            "green",
            "green-guarantor",
            {**PLAN_GREEN_BASE, "income": "under_low", "guarantor": True},
        ),
    ),
]
