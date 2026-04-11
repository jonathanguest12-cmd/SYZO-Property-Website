"""
Visual regression baseline comparison.

Scope (v1): only pages that are fully static and don't depend on seeded
data. If a page needs test data to render (e.g. /book-viewing/<id>),
keep it out of visual regression so baselines don't churn.

Workflow:
- On first run, no baseline exists → capture current as the baseline in
  tests/uat/baselines/<name>.png and record BASELINE_CAPTURED.
- On subsequent runs, compare pixel-for-pixel against the baseline.
  - If identical (diff_ratio == 0) → PASS
  - If diff_ratio <= 0.05 → PASS (tiny font anti-aliasing tolerance)
  - If diff_ratio > 0.05 → VISUAL_REGRESSION (warning, not failure)
- Diff images (side-by-side baseline|current|diff) land in {UAT_DIR}.

To intentionally refresh baselines (after a design change), delete the
relevant PNG under tests/uat/baselines/ and re-run the suite — the next
run will recapture it.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops
from playwright.sync_api import BrowserContext

from conftest import (
    BASELINES_DIR,
    DESKTOP_VIEWPORT,
    Seeder,
    StepResult,
    TestCase,
    new_page,
)

_RUNTIME: dict = {"target_url": None, "out_dir": None}


def set_runtime(target_url: str, out_dir) -> None:
    _RUNTIME["target_url"] = target_url
    _RUNTIME["out_dir"] = out_dir


# Per-pixel channel delta that we consider "changed".
PIXEL_DELTA_THRESHOLD = 10
# Image-level ratio above which we mark a visual regression warning.
REGRESSION_RATIO_THRESHOLD = 0.05


def _pixel_diff_ratio(baseline_path: Path, current_path: Path) -> tuple[float, Image.Image | None]:
    """Return (ratio_changed, diff_image).

    Handles size mismatch by padding to the larger bounding box with white.
    """
    base = Image.open(baseline_path).convert("RGB")
    curr = Image.open(current_path).convert("RGB")

    if base.size != curr.size:
        # Pad both to a common size so the diff is meaningful rather than 100%.
        max_w = max(base.size[0], curr.size[0])
        max_h = max(base.size[1], curr.size[1])
        base_pad = Image.new("RGB", (max_w, max_h), (255, 255, 255))
        base_pad.paste(base, (0, 0))
        curr_pad = Image.new("RGB", (max_w, max_h), (255, 255, 255))
        curr_pad.paste(curr, (0, 0))
        base, curr = base_pad, curr_pad

    diff = ImageChops.difference(base, curr)
    # Count pixels where any channel delta exceeds the threshold.
    # .getdata() returns tuples of (R, G, B).
    total = base.size[0] * base.size[1]
    if total == 0:
        return 0.0, None
    changed = sum(
        1 for (r, g, b) in diff.getdata()
        if r > PIXEL_DELTA_THRESHOLD or g > PIXEL_DELTA_THRESHOLD or b > PIXEL_DELTA_THRESHOLD
    )
    return changed / total, diff


def _save_composite(baseline: Path, current: Path, diff: Image.Image | None, out_path: Path) -> None:
    """Render a side-by-side baseline | current | diff composite for the report."""
    a = Image.open(baseline).convert("RGB")
    b = Image.open(current).convert("RGB")
    # Resize all to the same height for side-by-side layout.
    target_h = min(800, max(a.size[1], b.size[1]))

    def _resize_h(img: Image.Image, h: int) -> Image.Image:
        if img.size[1] == h:
            return img
        ratio = h / img.size[1]
        return img.resize((int(img.size[0] * ratio), h))

    a_r = _resize_h(a, target_h)
    b_r = _resize_h(b, target_h)
    # If no diff (size mismatch fallback) — just skip the diff panel.
    if diff is not None:
        d_r = _resize_h(diff.convert("RGB"), target_h)
        total_w = a_r.size[0] + b_r.size[0] + d_r.size[0] + 20
    else:
        d_r = None
        total_w = a_r.size[0] + b_r.size[0] + 10

    canvas = Image.new("RGB", (total_w, target_h), (240, 240, 240))
    canvas.paste(a_r, (0, 0))
    canvas.paste(b_r, (a_r.size[0] + 10, 0))
    if d_r is not None:
        canvas.paste(d_r, (a_r.size[0] + b_r.size[0] + 20, 0))
    canvas.save(out_path)


def _run_visual(name: str, path: str):
    def _inner(ctx: BrowserContext, seeder: Seeder, result: StepResult) -> None:
        target = _RUNTIME["target_url"]
        out_dir = _RUNTIME["out_dir"]
        page, ce, pe = new_page(ctx)
        try:
            url = f"{target}{path}"
            result.url = url
            result.expected = f"pixel diff vs baseline <= {REGRESSION_RATIO_THRESHOLD*100:.0f}%"
            page.goto(url, wait_until="networkidle", timeout=20_000)

            # Always take a fresh shot for this run.
            current_file = out_dir / f"visual-{name}-current.png"
            page.screenshot(path=str(current_file), full_page=True)
            result.screenshot = current_file.name

            baseline_file = BASELINES_DIR / f"{name}.png"
            if not baseline_file.exists():
                # First run — adopt the current image as the baseline.
                BASELINES_DIR.mkdir(parents=True, exist_ok=True)
                import shutil
                shutil.copy(current_file, baseline_file)
                result.status = "BASELINE_CAPTURED"
                result.observed = f"baseline written to {baseline_file}"
                return

            ratio, diff_img = _pixel_diff_ratio(baseline_file, current_file)
            result.diff_ratio = ratio
            if ratio == 0:
                result.status = "PASS"
                result.observed = "0% diff vs baseline"
            elif ratio <= REGRESSION_RATIO_THRESHOLD:
                result.status = "PASS"
                result.observed = f"{ratio*100:.2f}% diff (within tolerance)"
            else:
                composite = out_dir / f"visual-{name}-diff.png"
                try:
                    _save_composite(baseline_file, current_file, diff_img, composite)
                    result.diff_image = composite.name
                except Exception as e:
                    result.reason = f"diff composite failed: {e}"
                result.status = "VISUAL_REGRESSION"
                result.observed = f"{ratio*100:.2f}% diff vs baseline (> {REGRESSION_RATIO_THRESHOLD*100:.0f}%)"

            result.console_errors = ce
            result.page_errors = pe
        finally:
            page.close()
    return _inner


# Visual baselines are captured at a fixed DESKTOP viewport so the stored
# PNGs are reproducible across machines regardless of the default mobile
# setting. Mobile visual regression can be added later with its own baselines.
TESTS: list[TestCase] = [
    TestCase(
        name="Visual: homepage (rooms view)",
        kind="visual",
        run=_run_visual("home-rooms", "/"),
        viewport=dict(DESKTOP_VIEWPORT),
    ),
    TestCase(
        name="Visual: homepage (properties view)",
        kind="visual",
        run=_run_visual("home-props", "/?view=properties"),
        viewport=dict(DESKTOP_VIEWPORT),
    ),
]
