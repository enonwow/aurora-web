#!/usr/bin/env python3
"""Check that the RC unblock playbook matches current release scaffolding."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


PLAYBOOK = Path("forward-tests/rc-unblock-playbook.md")
REQUIRED_TRIO = ["FT-002", "FT-003", "FT-008"]


@dataclass
class PlaybookCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def matrix_tests(root: Path) -> dict[str, dict[str, Any]]:
    matrix = load_json(root / "forward-tests" / "reviewer-matrix.json")
    tests = matrix.get("tests", [])
    if not isinstance(tests, list):
        return {}
    result: dict[str, dict[str, Any]] = {}
    for item in tests:
        if isinstance(item, dict) and isinstance(item.get("test_id"), str):
            result[item["test_id"]] = item
    return result


def run(root: Path) -> PlaybookCheck:
    result = PlaybookCheck()
    playbook_path = root / PLAYBOOK
    if not playbook_path.exists():
        result.error(f"{PLAYBOOK} is missing")
        return result

    text = playbook_path.read_text(encoding="utf-8")
    manifest = load_json(root / "version-manifest.json")
    tests = matrix_tests(root)

    required_tokens = [
        "No-Leak Rule",
        "Phase 0: Refresh Static State",
        "Phase 1: Minimal Prompt Forward Tests",
        "Phase 2: Review And Record",
        "Phase 3: Recheck RC Gate",
        "Phase 4: Install-Smoke Comes After RC Evidence",
        "forward-tests/reviewer-packet.md",
        "forward-tests/reviewer-matrix.json",
        "forward-tests/record-command-templates.md",
        "forward-tests/rc-prompt-test-handoff.md",
        "tools/build_forward_test_clean_session_prompts.py",
        "tools/check_forward_test_clean_session_prompts.py",
        "tools/check_forward_test_clean_session_received_pack.py",
        ".codex-tmp/forward-test-clean-session-received/rc-minimum/inbox/",
        ".codex-tmp/forward-test-clean-session-received/rc-minimum/inbox/prompts/ft-002-clean-session.md",
        ".codex-tmp/forward-test-clean-session-received/rc-minimum/inbox/prompts/ft-003-clean-session.md",
        ".codex-tmp/forward-test-clean-session-received/rc-minimum/inbox/prompts/ft-008-clean-session.md",
        "tools/check_forward_test_return_captures.py",
        "docs\\nwn-skill-pack\\.codex-tmp\\forward-test-return-captures",
        "Blank initialized capture sheets must fail this gate.",
        "only after the returned-capture check passes",
        "tools/forward_test_record.py",
        "run_repo_artifact_preflight.py",
        "check_release_gate.py",
        "--target release-candidate",
        "received inbox exists and passes no-leak/hash checks",
        "transport hygiene only",
        "release_gate.rc_allowed=true",
        "Preparation commands alone are not an install-smoke pass.",
        "Verified",
        "Still Hypothesis",
    ]
    for token in required_tokens:
        if token not in text:
            result.error(f"{PLAYBOOK} missing token: {token}")
    if not result.errors:
        result.ok("playbook includes required no-leak, record, gate, and hypothesis tokens")

    for key in [
        "rc_blocker_burndown",
        "rc_prompt_test_handoff",
        "forward_test_reviewer_matrix",
        "forward_test_execution_queue",
        "forward_test_reviewer_packet",
        "forward_test_record_templates",
        "forward_test_clean_session_prompt_builder",
        "forward_test_clean_session_prompt_check",
        "forward_test_clean_session_received_check",
    ]:
        value = manifest.get(key)
        if not isinstance(value, str) or not value:
            result.error(f"version-manifest.json missing {key}")
            continue
        if value not in text:
            result.error(f"{PLAYBOOK} does not mention manifest artifact {key}: {value}")
        elif not (root / value).exists():
            result.error(f"manifest artifact does not exist for {key}: {value}")
        else:
            result.ok(f"playbook mentions existing manifest artifact: {key}")

    for test_id in REQUIRED_TRIO:
        test = tests.get(test_id)
        if not test:
            result.error(f"reviewer matrix missing required test: {test_id}")
            continue
        prompt_file = test.get("prompt_file")
        if not isinstance(prompt_file, str) or not prompt_file:
            result.error(f"reviewer matrix {test_id} has no prompt_file")
            continue
        if test_id not in text:
            result.error(f"{PLAYBOOK} does not mention {test_id}")
        if prompt_file not in text:
            result.error(f"{PLAYBOOK} does not mention {test_id} prompt file: {prompt_file}")
        if not (root / prompt_file).exists():
            result.error(f"{test_id} prompt file is missing: {prompt_file}")
        if test_id in text and prompt_file in text and (root / prompt_file).exists():
            result.ok(f"playbook names {test_id} and its prompt file")

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
            print(f"RC unblock playbook check failed: {len(result.errors)} error(s)")
        else:
            print("RC unblock playbook check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
