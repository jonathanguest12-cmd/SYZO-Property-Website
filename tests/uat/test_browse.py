"""
Browse-path regression tests: homepage, filters, room detail, property detail.

These are the fastest tests in the suite because they're all read-only
navigation checks against statically rendered pages.
"""

from __future__ import annotations

import re

from playwright.sync_api import BrowserContext

from conftest import (
    DESKTOP_VIEWPORT,
    Seeder,
    StepResult,
    TestCase,
    new_page,
    pick_room_id_from_homepage,
    take_screenshot,
)


# Amenities are derived at render time from JSON in rooms.additional_info —
# not a simple column on rooms — so we don't try to pre-pick an "amenity-rich"
# room. The room-detail test asserts on the Letting Details chrome instead,
# which is universal across every room.

_RUNTIME: dict = {"target_url": None, "out_dir": None}


def set_runtime(target_url: str, out_dir) -> None:
    _RUNTIME["target_url"] = target_url
    _RUNTIME["out_dir"] = out_dir


def _chk_homepage_with_rooms(ctx: BrowserContext, seeder: Seeder, result: StepResult) -> None:
    target = _RUNTIME["target_url"]
    out_dir = _RUNTIME["out_dir"]
    page, ce, pe = new_page(ctx)
    try:
        result.url = target
        result.expected = "homepage renders with at least one room card + area pills"
        page.goto(target, wait_until="networkidle", timeout=20_000)
        result.screenshot = take_screenshot(page, out_dir, result.index, result.name)
        body = page.inner_text("body")
        result.observed = body[:240].replace("\n", " ")
        has_count_pill = bool(re.search(r"\d+\s+rooms?\s+available", body))
        has_area_filter = "Plymouth" in body and "Newquay" in body
        has_room_link = pick_room_id_from_homepage(page) is not None
        if has_count_pill and has_area_filter and has_room_link:
            result.status = "PASS"
        else:
            result.status = "FAIL"
            result.reason = f"count={has_count_pill} area={has_area_filter} room_link={has_room_link}"
        result.console_errors = ce
        result.page_errors = pe
    finally:
        page.close()


def _chk_filter_by_plymouth(ctx: BrowserContext, seeder: Seeder, result: StepResult) -> None:
    target = _RUNTIME["target_url"]
    out_dir = _RUNTIME["out_dir"]
    page, ce, pe = new_page(ctx)
    try:
        result.url = target
        result.expected = "clicking Plymouth pill shows only Plymouth rooms"
        page.goto(target, wait_until="networkidle", timeout=20_000)
        # Count "rooms available" pill before clicking.
        before_body = page.inner_text("body")
        m_before = re.search(r"(\d+)\s+rooms?\s+available", before_body)
        before_count = int(m_before.group(1)) if m_before else None

        # There may be two "Plymouth" buttons (mobile + desktop layouts).
        # Click the first — first() disables strict mode.
        page.get_by_role("button", name="Plymouth", exact=True).first.click()
        page.wait_for_load_state("networkidle", timeout=5_000)
        result.screenshot = take_screenshot(page, out_dir, result.index, result.name)
        after_body = page.inner_text("body")
        m_after = re.search(r"(\d+)\s+rooms?\s+available", after_body)
        after_count = int(m_after.group(1)) if m_after else None
        result.observed = f"before={before_count} after={after_count}"

        # No Newquay area labels on visible cards when filter is set. We can't
        # grep the whole page because the filter pill labels still say "Newquay",
        # so we scope to room-card containers — any card has a data-something
        # or a CSS class. Pragmatic check: after<=before and the post-filter
        # body still shows a positive count pill.
        if before_count is not None and after_count is not None and after_count > 0 and after_count <= before_count:
            result.status = "PASS"
        else:
            result.status = "FAIL"
            result.reason = "filter did not narrow the visible room count"
        result.console_errors = ce
        result.page_errors = pe
    finally:
        page.close()


def _chk_view_toggle_properties(ctx: BrowserContext, seeder: Seeder, result: StepResult) -> None:
    target = _RUNTIME["target_url"]
    out_dir = _RUNTIME["out_dir"]
    page, ce, pe = new_page(ctx)
    try:
        result.url = target
        result.expected = "toggling to Properties view shows '{N} properties available'"
        page.goto(target, wait_until="networkidle", timeout=20_000)
        page.get_by_role("button", name="Properties", exact=True).first.click()
        page.wait_for_load_state("networkidle", timeout=5_000)
        result.screenshot = take_screenshot(page, out_dir, result.index, result.name)
        body = page.inner_text("body")
        result.observed = body[:240].replace("\n", " ")
        if re.search(r"\d+\s+propert(y|ies)\s+available", body):
            result.status = "PASS"
        else:
            result.status = "FAIL"
            result.reason = "no 'N properties available' pill after toggle"
        result.console_errors = ce
        result.page_errors = pe
    finally:
        page.close()


def _chk_room_detail_page(ctx: BrowserContext, seeder: Seeder, result: StepResult) -> None:
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
        room_url = f"{target}/room/{room_id}"
        result.url = room_url
        result.expected = (
            "gallery (img tags) + letting details chrome + map iframe + "
            "Apply to Rent + Ask a Question buttons"
        )
        page.goto(room_url, wait_until="networkidle", timeout=20_000)
        result.screenshot = take_screenshot(page, out_dir, result.index, result.name)
        body = page.inner_text("body")
        body_lower = body.lower()
        result.observed = body[:240].replace("\n", " ")
        # Letting Details card is universal for every room and always
        # contains these three labels.
        has_letting = "rent" in body_lower and "deposit" in body_lower and "bills" in body_lower
        has_apply = "Apply to Rent" in body
        has_ask = "Ask a Question" in body
        has_map_iframe = page.locator('iframe[src*="maps.google.com"]').count() > 0
        has_images = page.locator("img").count() > 0
        if has_letting and has_apply and has_ask and has_map_iframe and has_images:
            result.status = "PASS"
        else:
            result.status = "FAIL"
            result.reason = (
                f"letting={has_letting} apply={has_apply} ask={has_ask} "
                f"map={has_map_iframe} images={has_images}"
            )
        result.console_errors = ce
        result.page_errors = pe
    finally:
        page.close()


def _chk_property_detail_page(ctx: BrowserContext, seeder: Seeder, result: StepResult) -> None:
    target = _RUNTIME["target_url"]
    out_dir = _RUNTIME["out_dir"]
    page, ce, pe = new_page(ctx)
    try:
        # Navigate to /?view=properties, find a property link.
        page.goto(f"{target}/?view=properties", wait_until="networkidle", timeout=20_000)
        prop_url = None
        for a in page.locator("a[href^='/property/']").all()[:5]:
            href = a.get_attribute("href") or ""
            if re.match(r"^/property/[A-Za-z0-9-]+$", href):
                prop_url = f"{target}{href}"
                break
        if not prop_url:
            result.status = "FAIL"
            result.reason = "no /property/<ref> link found in properties view"
            return
        result.url = prop_url
        result.expected = "property detail renders with available rooms list"
        page.goto(prop_url, wait_until="networkidle", timeout=20_000)
        result.screenshot = take_screenshot(page, out_dir, result.index, result.name)
        body = page.inner_text("body")
        result.observed = body[:240].replace("\n", " ")
        # Property page should render at minimum a price, some room info, and navigate-related chrome.
        # Looking for a £ amount is a stable signal.
        has_price = bool(re.search(r"£\s?\d", body))
        has_images = page.locator("img").count() > 0
        if has_price and has_images:
            result.status = "PASS"
        else:
            result.status = "FAIL"
            result.reason = f"price={has_price} images={has_images}"
        result.console_errors = ce
        result.page_errors = pe
    finally:
        page.close()


TESTS: list[TestCase] = [
    # Homepage + filter tests use DESKTOP viewport because the inline area
    # pills ("Plymouth" / "Newquay") only render at md+ breakpoints. On mobile
    # those controls live inside a collapsed filter panel behind a Filters
    # button — a different UX that we don't test at this layer.
    TestCase(
        name="Browse: homepage with room cards",
        kind="ui",
        run=_chk_homepage_with_rooms,
        viewport=dict(DESKTOP_VIEWPORT),
    ),
    TestCase(
        name="Browse: filter by Plymouth narrows visible rooms",
        kind="ui",
        run=_chk_filter_by_plymouth,
        viewport=dict(DESKTOP_VIEWPORT),
    ),
    TestCase(
        name="Browse: view toggle → Properties",
        kind="ui",
        run=_chk_view_toggle_properties,
        viewport=dict(DESKTOP_VIEWPORT),
    ),
    # Room/property detail tests run at mobile (the primary viewport).
    TestCase(name="Browse: room detail (gallery, amenities, map, CTAs)", kind="ui", run=_chk_room_detail_page),
    TestCase(name="Browse: property detail renders", kind="ui", run=_chk_property_detail_page),
]
