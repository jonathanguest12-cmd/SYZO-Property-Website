"""
Chatbot ("Ask a Question") modal tests.

The chatbot is opened from the room detail page via the 'Ask a Question'
button. It posts to /api/ask which calls Anthropic. The response is LLM-
generated so tests must assert on shape, not exact content:

  - modal opens (header 'Ask a Question' visible)
  - quick-reply suggestion chips render before any user message
  - clicking a chip produces an assistant message that isn't the error
    fallback ("Sorry, I'm having trouble connecting...")
  - response contains NO markdown tokens (**, __, ##, backticks)
  - response contains NO exclamation marks (system prompt forbids them)
  - response has at least a few words
  - closing the modal removes it from the DOM

The endpoint is rate limited to 20/hr per IP (Upstash sliding window).
If a test hits that limit we mark SKIP and carry on — don't fail the suite.
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
    take_screenshot,
)

_RUNTIME: dict = {"target_url": None, "out_dir": None}


def set_runtime(target_url: str, out_dir) -> None:
    _RUNTIME["target_url"] = target_url
    _RUNTIME["out_dir"] = out_dir


# Tokens the system prompt forbids. Markdown shouldn't render as literals.
MARKDOWN_TOKENS = ("**", "__", "##", "```", "* ", "- ", "1. ")
ERROR_FALLBACK = "Sorry, I'm having trouble connecting"


def _chk_chatbot_full_flow(ctx: BrowserContext, seeder: Seeder, result: StepResult) -> None:
    target = _RUNTIME["target_url"]
    out_dir = _RUNTIME["out_dir"]
    page, ce, pe = new_page(ctx)
    try:
        # Find a room.
        page.goto(target, wait_until="networkidle", timeout=20_000)
        room_id = pick_room_id_from_homepage(page)
        if not room_id:
            result.status = "FAIL"
            result.reason = "no /room/<uuid> link on homepage"
            return
        room_url = f"{target}/room/{room_id}"
        result.url = room_url
        result.expected = (
            "modal opens, chip click yields assistant reply with no markdown/!, modal closes"
        )
        page.goto(room_url, wait_until="networkidle", timeout=20_000)

        # Open the modal. There may be several "Ask a Question" buttons on
        # the page (main CTA + sticky bar + etc) — take the first visible.
        ask_buttons = page.get_by_role("button", name="Ask a Question", exact=True)
        ask_buttons.first.click()
        # "Ask a Question" text appears in multiple places. The modal's input
        # placeholder is a unique open-state signal.
        page.wait_for_selector('input[placeholder="Type your question..."]', timeout=10_000)
        # Chips only render before the first user message.
        page.wait_for_selector("text=Are bills included?", timeout=10_000)

        # Click a deterministic chip. Assistant bubbles (greeting, loading
        # indicator, and real reply) all share the same border-radius, so
        # counting alone is not enough — the loading dots bubble will trip
        # the detection. Filter out bubbles whose text is only dot/middot
        # characters so we wait for the genuine reply.
        assistant_bubble_selector = 'div[style*="border-radius: 18px 18px 18px 4px"]'

        def _real_bubbles() -> list:
            raw = page.locator(assistant_bubble_selector).all_text_contents()
            return [
                b
                for b in raw
                if b.strip()
                and not all(ch in "\u00b7. \n\t" for ch in b.strip())
            ]

        initial_real = len(_real_bubbles())
        page.get_by_role("button", name="Are bills included?", exact=True).click()

        rate_limited = False
        got_reply = False
        for _ in range(60):  # up to ~30s
            page.wait_for_timeout(500)
            body = page.inner_text("body")
            if "Message limit reached" in body:
                rate_limited = True
                break
            if len(_real_bubbles()) > initial_real:
                got_reply = True
                break

        result.screenshot = take_screenshot(page, out_dir, result.index, result.name)

        if rate_limited:
            result.status = "SKIP"
            result.reason = "chatbot /api/ask rate-limited (20/hr per IP) — expected when re-running"
            return
        if not got_reply:
            result.status = "FAIL"
            result.reason = "no assistant reply rendered within 15s"
            return

        body = page.inner_text("body")
        result.observed = body[:320].replace("\n", " ")

        if ERROR_FALLBACK in body:
            result.status = "FAIL"
            result.reason = "chatbot returned connection-error fallback message"
            return

        # Extract the assistant reply text. The body contains the full page,
        # so we look for the first message bubble AFTER the user message.
        # Simplest check: ensure the body has some non-header content added
        # after the chip click, then scan for forbidden tokens.
        reply_markdown = [tok for tok in MARKDOWN_TOKENS if tok in body]
        reply_exclaim = "!" in body and body.count("!") > 0
        # The chatbot answer must not contain "!" per system prompt. But
        # other parts of the page might (e.g. a room name that has "!"). We
        # can't cleanly isolate the reply without a selector, so we target
        # the last message bubble via its known CSS border-radius style class.
        try:
            real = _real_bubbles()
        except Exception:
            real = []
        reply_text = real[-1] if real else ""

        reply_md_hits = [tok for tok in MARKDOWN_TOKENS if tok in reply_text]
        reply_has_exclaim = "!" in reply_text
        reply_long_enough = len(reply_text.split()) >= 3

        # Close the modal via the X button, then verify it's gone.
        page.keyboard.press("Escape")
        page.wait_for_timeout(300)
        closed = "Type your question..." not in page.inner_text("body")

        if (
            not reply_md_hits
            and not reply_has_exclaim
            and reply_long_enough
            and closed
        ):
            result.status = "PASS"
            result.observed = f"reply={reply_text[:160]!r}"
        else:
            result.status = "FAIL"
            result.reason = (
                f"markdown={reply_md_hits} exclaim={reply_has_exclaim} "
                f"long_enough={reply_long_enough} closed={closed}"
            )
            result.observed = f"reply={reply_text[:240]!r}"

        result.console_errors = ce
        result.page_errors = pe
    finally:
        page.close()


TESTS: list[TestCase] = [
    TestCase(
        name="Chatbot: open → send chip → assistant reply → close",
        kind="ui",
        run=_chk_chatbot_full_flow,
    ),
]
