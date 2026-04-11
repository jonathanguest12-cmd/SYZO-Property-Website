"""
SYZO UAT suite orchestrator.

Invoked by the syzo-uat skill (or directly) to run every persistent test
module under tests/uat/, capture a unified pass/fail report, and clean up
any seeded data.

Usage:
    python3 tests/uat/suite.py [--target http://localhost:3000] [--update-baselines]

Exit codes:
    0 — all non-manual tests PASS (VISUAL_REGRESSION and BASELINE_CAPTURED
        are treated as non-fatal)
    1 — one or more tests FAIL
    2 — preflight failure (env missing, target unreachable, etc.)
"""

from __future__ import annotations

import argparse
import importlib
import json
import os
import signal
import subprocess
import sys
import time
import traceback
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path

# Make conftest and test_* importable when running via `python3 tests/uat/suite.py`.
SUITE_DIR = Path(__file__).resolve().parent
if str(SUITE_DIR) not in sys.path:
    sys.path.insert(0, str(SUITE_DIR))

import httpx
from playwright.sync_api import sync_playwright

from conftest import (  # noqa: E402
    BASELINES_DIR,
    DEFAULT_TEST_TIMEOUT,
    MOBILE_VIEWPORT,
    REPO_ROOT,
    SUPABASE_KEY,
    SUPABASE_URL,
    Seeder,
    StepResult,
    TestCase,
    clean_pre_run,
)

TEST_MODULES = ["test_browse", "test_booking", "test_screening", "test_chatbot", "test_visual"]

# ----------------------------------------------------------------------------
# Preflight
# ----------------------------------------------------------------------------

def preflight_env() -> tuple[bool, str]:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return False, "missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY_PARROT in .env.local"
    return True, "ok"


def preflight_target(target_url: str) -> tuple[bool, str]:
    try:
        r = httpx.get(target_url, timeout=5.0, follow_redirects=True)
        if r.status_code >= 500:
            return False, f"target returned HTTP {r.status_code}"
    except Exception as e:
        return False, f"target unreachable: {e}"
    return True, "ok"


def try_start_dev_server() -> subprocess.Popen | None:
    """Spawn `npm run dev` if nothing is listening on :3000.

    Returns the Popen handle so the caller can terminate it after the run.
    Returns None if a server is already running (we don't manage it).
    """
    try:
        httpx.get("http://localhost:3000", timeout=2.0)
        return None  # already up
    except Exception:
        pass

    print("[suite] starting `npm run dev` in background")
    proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=str(REPO_ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        preexec_fn=os.setsid,  # so we can kill the whole process group
    )
    # Wait for it to come up.
    for _ in range(30):
        try:
            r = httpx.get("http://localhost:3000", timeout=2.0)
            if r.status_code < 500:
                print(f"[suite] dev server ready")
                return proc
        except Exception:
            time.sleep(1)
    # Didn't come up — tear down.
    try:
        os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
    except Exception:
        pass
    return None


def stop_dev_server(proc: subprocess.Popen | None) -> None:
    if proc is None:
        return
    try:
        os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
    except Exception:
        pass


# ----------------------------------------------------------------------------
# Test collection
# ----------------------------------------------------------------------------

def load_tests(target_url: str, out_dir: Path) -> list[TestCase]:
    tests: list[TestCase] = []
    for modname in TEST_MODULES:
        try:
            module = importlib.import_module(modname)
        except Exception as e:
            print(f"[suite] failed to import {modname}: {e}")
            continue
        if hasattr(module, "set_runtime"):
            module.set_runtime(target_url, out_dir)
        mod_tests: list[TestCase] = getattr(module, "TESTS", [])
        for t in mod_tests:
            t.module = modname
            tests.append(t)
    return tests


# ----------------------------------------------------------------------------
# Per-test wall-clock timeout (Unix only)
# ----------------------------------------------------------------------------

class _Timeout(Exception):
    pass


def _alarm(signum, frame):
    raise _Timeout("test exceeded wall-clock timeout")


# ----------------------------------------------------------------------------
# Report writers
# ----------------------------------------------------------------------------

def _status_emoji(s: str) -> str:
    return {
        "PASS": "PASS",
        "FAIL": "FAIL",
        "SKIP": "SKIP",
        "VISUAL_REGRESSION": "WARN",
        "BASELINE_CAPTURED": "BASE",
        "PENDING": "????",
    }.get(s, s)


def write_reports(
    out_dir: Path,
    target_url: str,
    commit: str,
    branch: str,
    results: list[StepResult],
    seed_summary: dict,
    duration_s: float,
    uncovered_dod: list[str],
) -> None:
    payload = {
        "target": target_url,
        "commit": commit,
        "branch": branch,
        "date": datetime.now(timezone.utc).isoformat(),
        "duration_s": duration_s,
        "seed_summary": seed_summary,
        "uncovered_dod": uncovered_dod,
        "results": [asdict(r) for r in results],
    }
    (out_dir / "results.json").write_text(json.dumps(payload, indent=2))

    n_pass = sum(1 for r in results if r.status == "PASS")
    n_fail = sum(1 for r in results if r.status == "FAIL")
    n_skip = sum(1 for r in results if r.status == "SKIP")
    n_warn = sum(1 for r in results if r.status == "VISUAL_REGRESSION")
    n_base = sum(1 for r in results if r.status == "BASELINE_CAPTURED")

    lines: list[str] = []
    lines.append(f"# UAT Report — SYZO Property Website")
    lines.append("")
    lines.append(f"**Target:**   {target_url}")
    lines.append(f"**Commit:**   {commit} (branch: {branch})")
    lines.append(f"**Date:**     {datetime.now(timezone.utc).isoformat()}")
    lines.append(f"**Duration:** {duration_s:.1f}s")
    lines.append(
        f"**Result:**   {n_pass} PASS · {n_fail} FAIL · {n_skip} SKIP · "
        f"{n_warn} VISUAL_REGRESSION · {n_base} BASELINE_CAPTURED"
    )
    lines.append("")

    # Group by module.
    by_module: dict = {}
    for r in results:
        by_module.setdefault(r.module or "misc", []).append(r)

    for mod in sorted(by_module.keys()):
        lines.append(f"## {mod}")
        lines.append("")
        for r in by_module[mod]:
            lines.append(f"### {r.index:02d}. [{_status_emoji(r.status)}] {r.name}")
            lines.append(f"- Kind: {r.kind}")
            if r.url:
                lines.append(f"- URL: {r.url}")
            if r.expected:
                lines.append(f"- Expected: {r.expected}")
            if r.observed:
                lines.append(f"- Observed: {r.observed}")
            if r.screenshot:
                lines.append(f"- Screenshot: {r.screenshot}")
            if r.diff_image:
                lines.append(f"- Diff image: {r.diff_image}")
            if r.diff_ratio:
                lines.append(f"- Diff ratio: {r.diff_ratio*100:.2f}%")
            if r.duration_ms:
                lines.append(f"- Duration: {r.duration_ms}ms")
            if r.reason:
                lines.append(f"- Reason: {r.reason}")
            if r.console_errors:
                lines.append("- Console:")
                for err in r.console_errors[:5]:
                    lines.append(f"  - {err[:200]}")
            if r.page_errors:
                lines.append("- Page errors:")
                for err in r.page_errors[:5]:
                    lines.append(f"  - {err[:200]}")
            lines.append("")

    if uncovered_dod:
        lines.append("## Uncovered Definition of Done items")
        lines.append("")
        lines.append(
            "The current brief's Definition of Done contains items that "
            "don't appear to be covered by any test in the regression suite. "
            "Add tests to `tests/uat/test_*.py` or mark them as intentionally "
            "manual."
        )
        lines.append("")
        for item in uncovered_dod:
            lines.append(f"- [ ] {item}")
        lines.append("")

    lines.append("## Seeded test data")
    lines.append("")
    lines.append(f"- Applications deleted: {seed_summary.get('applications_deleted', 0)}")
    lines.append(f"- Slots reset: {seed_summary.get('slots_reset', 0)}")
    if seed_summary.get("errors"):
        lines.append("- Cleanup errors:")
        for e in seed_summary["errors"]:
            lines.append(f"  - {e}")

    (out_dir / "UAT-REPORT.md").write_text("\n".join(lines))


# ----------------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------------

def _git_meta() -> tuple[str, str]:
    try:
        sha = subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"], cwd=str(REPO_ROOT), text=True
        ).strip()
    except Exception:
        sha = "unknown"
    try:
        branch = subprocess.check_output(
            ["git", "branch", "--show-current"], cwd=str(REPO_ROOT), text=True
        ).strip()
    except Exception:
        branch = "unknown"
    return sha, branch


def run(target_url: str, out_dir: Path, uncovered_dod: list[str]) -> int:
    commit, branch = _git_meta()
    print(f"[suite] target={target_url} commit={commit} branch={branch}")
    print(f"[suite] out_dir={out_dir}")

    clean_pre_run()

    tests = load_tests(target_url, out_dir)
    print(f"[suite] {len(tests)} tests loaded across {len(TEST_MODULES)} modules")

    # Write the plan before running.
    (out_dir / "test-plan.json").write_text(
        json.dumps(
            {
                "target": target_url,
                "tests": [
                    {"index": i + 1, "module": t.module, "name": t.name, "kind": t.kind}
                    for i, t in enumerate(tests)
                ],
            },
            indent=2,
        )
    )

    seeder = Seeder()
    results: list[StepResult] = []
    start = time.time()

    # One browser for the whole suite — fresh context per test for isolation.
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                for i, tc in enumerate(tests, start=1):
                    result = StepResult(index=i, name=tc.name, kind=tc.kind, module=tc.module)
                    t0 = time.time()

                    if tc.kind == "manual":
                        result.status = "SKIP"
                        result.reason = tc.skip_reason or "manual verification only"
                    else:
                        # Per-test X-Forwarded-For so each test hits the API
                        # routes as a different IP. Upstash rate limits are
                        # keyed by IP, so this sidesteps /api/submit (5/hr)
                        # and /api/ask (20/hr) without touching Redis. Any
                        # fetch() from the page (apply submit, chatbot ask,
                        # book-viewing claim) inherits this header.
                        context = browser.new_context(
                            viewport=tc.viewport or MOBILE_VIEWPORT,
                            extra_http_headers={"x-forwarded-for": f"10.42.0.{i}"},
                        )
                        try:
                            signal.signal(signal.SIGALRM, _alarm)
                            signal.alarm(DEFAULT_TEST_TIMEOUT)
                            tc.run(context, seeder, result)
                        except _Timeout:
                            result.status = "FAIL"
                            result.reason = f"wall-clock timeout after {DEFAULT_TEST_TIMEOUT}s"
                        except Exception as e:
                            result.status = "FAIL"
                            result.reason = f"exception: {e.__class__.__name__}: {e}"
                            result.page_errors.append(traceback.format_exc()[:2000])
                        finally:
                            signal.alarm(0)
                            try:
                                context.close()
                            except Exception:
                                pass

                    result.duration_ms = int((time.time() - t0) * 1000)
                    results.append(result)
                    print(f"[{_status_emoji(result.status):4}] {i:02d}. [{tc.module}] {tc.name}")
            finally:
                browser.close()
    finally:
        seed_summary = seeder.cleanup()
        clean_pre_run()  # Also wipes any uat-* emails from form-walk tests.
        duration_s = time.time() - start
        write_reports(
            out_dir,
            target_url,
            commit,
            branch,
            results,
            seed_summary,
            duration_s,
            uncovered_dod,
        )

    n_fail = sum(1 for r in results if r.status == "FAIL")
    n_pass = sum(1 for r in results if r.status == "PASS")
    n_skip = sum(1 for r in results if r.status == "SKIP")
    n_warn = sum(1 for r in results if r.status == "VISUAL_REGRESSION")
    n_base = sum(1 for r in results if r.status == "BASELINE_CAPTURED")
    print(
        f"[suite] done — {n_pass} PASS · {n_fail} FAIL · {n_skip} SKIP · "
        f"{n_warn} WARN · {n_base} BASELINE · {duration_s:.1f}s"
    )
    return 1 if n_fail else 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the SYZO UAT regression suite")
    parser.add_argument("--target", default="http://localhost:3000", help="Target base URL")
    parser.add_argument(
        "--update-baselines",
        action="store_true",
        help="Delete existing visual baselines before running (next run will recapture)",
    )
    parser.add_argument(
        "--out",
        default=None,
        help="Output directory (default: .uat-reports/<timestamp>)",
    )
    parser.add_argument(
        "--uncovered",
        default=None,
        help="Path to a newline-separated file of uncovered Definition-of-Done bullets",
    )
    args = parser.parse_args()

    if args.update_baselines:
        removed = 0
        for f in BASELINES_DIR.glob("*.png"):
            f.unlink()
            removed += 1
        print(f"[suite] removed {removed} existing baselines")

    out_dir = Path(args.out) if args.out else (
        REPO_ROOT / ".uat-reports" / datetime.now().strftime("%Y%m%d-%H%M%S")
    )
    out_dir.mkdir(parents=True, exist_ok=True)

    uncovered: list[str] = []
    if args.uncovered:
        try:
            uncovered = [
                ln.strip("- ").strip()
                for ln in Path(args.uncovered).read_text().splitlines()
                if ln.strip()
            ]
        except Exception as e:
            print(f"[suite] could not read --uncovered file: {e}")

    ok, msg = preflight_env()
    if not ok:
        print(f"[suite] preflight failed: {msg}")
        return 2

    # Auto-start the dev server if nothing is on port 3000 yet. We own the
    # process only if we started it — an existing server is left alone.
    dev_proc = try_start_dev_server()
    try:
        ok, msg = preflight_target(args.target)
        if not ok:
            print(f"[suite] target preflight failed: {msg}")
            return 2
        return run(args.target, out_dir, uncovered)
    finally:
        stop_dev_server(dev_proc)


if __name__ == "__main__":
    sys.exit(main())
