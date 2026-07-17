#!/usr/bin/env python3
"""Check that the RC blocker burn-down is fresh."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType


REPORT = Path("rc-blocker-burndown.md")


@dataclass
class BurnDownCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def load_module(path: Path, name: str) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def run(root: Path) -> BurnDownCheck:
    result = BurnDownCheck()
    report_path = root / REPORT
    if not report_path.exists():
        result.error(f"{REPORT} is missing")
        return result

    generator = load_module(
        root / "tools" / "generate_rc_blocker_burndown.py",
        "generate_rc_blocker_burndown_check",
    )
    expected = generator.generate(root)
    actual = report_path.read_text(encoding="utf-8")
    if actual != expected:
        result.error("rc-blocker-burndown.md is stale; regenerate with tools/generate_rc_blocker_burndown.py")
    else:
        result.ok("rc-blocker-burndown.md matches current generated report")

    required_tokens = {
        "FT-002",
        "FT-003",
        "FT-008",
        "release-candidate",
        "Return-Capture Gate Before Scoring",
        "init_forward_test_capture.py",
        "check_forward_test_return_captures.py",
        "Blank initialized capture sheets must fail this gate.",
        "Do not score with `forward-tests/reviewer-packet.md` until `check_forward_test_return_captures.py` passes",
        "Install-Smoke Path",
        "Verified",
        "Still Hypothesis",
    }
    missing = sorted(token for token in required_tokens if token not in actual)
    if missing:
        result.error(f"rc-blocker-burndown.md missing tokens: {', '.join(missing)}")
    else:
        result.ok("rc-blocker-burndown.md includes required planning tokens")

    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    result = run(Path(args.root))
    if args.json:
        print(json.dumps({"checks": result.checks, "errors": result.errors}, indent=2))
    else:
        for check in result.checks:
            print(f"OK: {check}")
        for error in result.errors:
            print(f"ERROR: {error}")
        if result.errors:
            print(f"RC blocker burn-down check failed: {len(result.errors)} error(s)")
        else:
            print("RC blocker burn-down check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
