#!/usr/bin/env python3
"""Check the FT-009 local-intake clean-session handoff."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass, field
from pathlib import Path


HANDOFF = Path("forward-tests/ft-009-local-intake-clean-session-handoff.md")

REQUIRED_TOKENS = [
    "# FT-009 Local Intake Clean-Session Handoff",
    "build_forward_test_clean_session_prompts.py",
    "check_forward_test_clean_session_prompts.py",
    "check_forward_test_clean_session_received_pack.py",
    "init_forward_test_capture.py",
    "check_forward_test_return_captures.py",
    "tools/forward_test_record.py",
    ".codex-tmp\\forward-test-clean-session-prompts\\ft-009-local-intake-boundary",
    ".codex-tmp\\forward-test-clean-session-received\\ft-009-local-intake-boundary",
    ".codex-tmp\\forward-test-return-captures\\ft-009-local-intake-boundary\\ft-009-capture.md",
    "prompts/ft-009-clean-session.md",
    "--test-id FT-009",
    "--captures docs\\nwn-skill-pack\\.codex-tmp\\forward-test-return-captures\\ft-009-local-intake-boundary --test-id FT-009",
    "Do not open `forward-tests/reviewer-matrix.json`, `forward-tests/reviewer-packet.md`, or `forward-tests/record-command-templates.md` before the raw answer is captured.",
    "validate the returned capture before opening reviewer-only scoring material",
    "additional boundary coverage",
    "does not replace the minimum release-candidate prompt trio `FT-002`, `FT-003`, and `FT-008`",
    "source-registry.md",
    "feedback-and-versioning.md",
    "testing-runtime-qa.md",
    "common-antipatterns.md",
    "local-intake",
    "redaction",
    "evidence label",
    "maintainer decision",
    "verification or blocker",
    "rollback",
    "First Implementable Slice",
    "does not prove the model answer",
    "tester independence",
    "NWN runtime behavior",
    "release-candidate readiness",
]

ORDERED_TOKENS = [
    "## Build The Prompt Pack",
    "## Prompt To Paste",
    "Do not open `forward-tests/reviewer-matrix.json`",
    "## Capture And Score",
    "validate the returned capture before opening reviewer-only scoring material",
    "After capture, score with reviewer-only material",
    "## Expected Boundary",
    "## Verification Boundary",
]

FORBIDDEN_TOKENS = [
    "expected_references",
    "review_focus",
    "--expected-reference",
    "--first-implementable-slice",
    "pass|partial|fail",
]


@dataclass
class HandoffCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def run(root: Path) -> HandoffCheck:
    result = HandoffCheck()
    path = root / HANDOFF
    if not path.exists():
        result.error(f"{HANDOFF} is missing")
        return result

    text = path.read_text(encoding="utf-8")
    result.ok(f"{HANDOFF} exists")

    for token in REQUIRED_TOKENS:
        if token in text:
            result.ok(f"handoff token exists: {token}")
        else:
            result.error(f"handoff missing token: {token}")

    cursor = -1
    for token in ORDERED_TOKENS:
        index = text.find(token, cursor + 1)
        if index == -1:
            result.error(f"handoff ordered token missing or out of order: {token}")
        else:
            cursor = index
    if cursor >= 0:
        result.ok("handoff sections and no-leak gates are in expected order")

    lowered = text.lower()
    for token in FORBIDDEN_TOKENS:
        if token.lower() in lowered:
            result.error(f"handoff leaks reviewer/scoring token: {token}")

    if not result.errors:
        result.ok("FT-009 handoff stays executable, no-leak, and boundary-labeled")
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
            print(f"FT-009 local-intake handoff check failed: {len(result.errors)} error(s)")
        else:
            print("FT-009 local-intake handoff check passed")

    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
