#!/usr/bin/env python3
"""Check the no-answer-leak forward-test answer capture template."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path


TEMPLATE = Path("forward-tests/answer-capture-template.md")

REQUIRED_TOKENS = [
    "## Purpose",
    "## Capture Status",
    "## Prompt Delivery",
    "## Raw Answer Preservation",
    "## First-Pass Observations",
    "## No-Leak Confirmation",
    "## Handoff To Reviewer",
    "## Verification Boundary",
    "one prompt file only",
    "Saved answer path or transcript location",
    "First Implementable Slice named by the answer",
    "Files/assets/data rows/scripts touched or requested for that slice",
    "Expected proof named for that slice",
    "Rollback or safety path named for that slice",
    "Evidence limits or unproven claims around that slice",
    "Reviewer-only material was not opened before this capture",
    "mark this run as contaminated",
    "does not prove NWN runtime behavior",
]

FORBIDDEN_TOKENS = [
    "expected reference",
    "expected behavior",
    "scoring rubric",
    "reviewer-matrix.json",
    "forward-tests/reviewer-matrix.json",
    "forward-tests/reviewer-packet.md",
    "forward-tests/record-command-templates.md",
    "--expected-reference",
    "--first-implementable-slice",
    "reviewer_assertions",
    "pass|partial|fail",
]


@dataclass
class CaptureTemplateCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def run(root: Path) -> CaptureTemplateCheck:
    result = CaptureTemplateCheck()
    path = root / TEMPLATE
    if not path.exists():
        result.error(f"{TEMPLATE} is missing")
        return result

    text = path.read_text(encoding="utf-8")
    lowered = text.lower()
    result.ok(f"{TEMPLATE} exists")

    for token in REQUIRED_TOKENS:
        if token in text:
            result.ok(f"capture template token exists: {token}")
        else:
            result.error(f"capture template missing token: {token}")

    for token in FORBIDDEN_TOKENS:
        if token.lower() in lowered:
            result.error(f"capture template leaks reviewer/scoring token: {token}")

    if "reviewer-only packet" in lowered and "after this capture is complete" in lowered:
        result.ok("capture template gates reviewer-only packet until after capture")
    else:
        result.error("capture template must gate reviewer-only packet until after capture")

    tester_packet = root / "forward-tests" / "tester-packet.md"
    if tester_packet.exists():
        tester_text = tester_packet.read_text(encoding="utf-8")
        if str(TEMPLATE).replace("\\", "/") in tester_text:
            result.ok("tester packet routes to answer capture template")
        else:
            result.error("tester packet does not route to answer capture template")
    else:
        result.error("forward-tests/tester-packet.md is missing")

    rc_playbook = root / "forward-tests" / "rc-unblock-playbook.md"
    if rc_playbook.exists():
        rc_text = rc_playbook.read_text(encoding="utf-8")
        if str(TEMPLATE).replace("\\", "/") in rc_text:
            result.ok("RC unblock playbook routes to answer capture template")
        else:
            result.error("RC unblock playbook does not route to answer capture template")
    else:
        result.error("forward-tests/rc-unblock-playbook.md is missing")

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
            print(f"Forward-test capture template check failed: {len(result.errors)} error(s)")
        else:
            print("Forward-test capture template check passed")

    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
