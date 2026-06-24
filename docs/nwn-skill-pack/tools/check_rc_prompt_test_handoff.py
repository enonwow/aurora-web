#!/usr/bin/env python3
"""Check the generated no-answer-leak RC prompt-test handoff."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path


HANDOFF = Path("forward-tests/rc-prompt-test-handoff.md")
GENERATOR = Path("tools/generate_rc_prompt_test_handoff.py")
REQUIRED_TRIO = ["FT-002", "FT-003", "FT-008"]
REQUIRED_PROMPTS = {
    "FT-002": "forward-tests/prompts/ft-002-custom-spear-2da-hak-tlk.txt",
    "FT-003": "forward-tests/prompts/ft-003-nui-crafting-panel.txt",
    "FT-008": "forward-tests/prompts/ft-008-feedback-contribution.txt",
}
REQUIRED_TOKENS = [
    "## Purpose",
    "## Current Package",
    "## Tester Instructions",
    "## Blank Capture Guard",
    "## Minimal RC Trio",
    "## Return To Maintainer",
    "## Verification Boundary",
    "fresh Codex thread or clean model session",
    "Paste only that clean-session prompt file",
    "build_forward_test_clean_session_prompts.py",
    "check_forward_test_clean_session_received_pack.py",
    ".codex-tmp/forward-test-clean-session-received/rc-minimum/inbox",
    ".codex-tmp/forward-test-clean-session-received/rc-minimum/RECEIVED-CLEAN-SESSION-SUMMARY.json",
    "tools/init_forward_test_capture.py",
    ".codex-tmp/forward-test-return-captures/",
    "check_forward_test_return_captures.py",
    "Blank initialized sheets must fail this gate.",
    "expected blocker until the tester returns filled capture sheets",
    "forward-tests/answer-capture-template.md",
    "Do not send prior test results",
    "expected references",
    "does not prove a test was run",
]
FORBIDDEN_TOKENS = [
    "expected_references",
    "review_focus",
    "nui-player-ui.md",
    "two-da-hak-tlk-pipeline.md",
    "items-equipment-loot.md",
    "nwscript-events-systems.md",
    "testing-runtime-qa.md",
    "economy-crafting-progression.md",
    "feedback-and-versioning.md",
    "reviewer-matrix.json",
    "reviewer-packet.md",
    "record-command-templates.md",
    "--expected-reference",
]


@dataclass
class HandoffCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def load_generator(root: Path):
    generator_path = root / GENERATOR
    spec = importlib.util.spec_from_file_location("generate_rc_prompt_test_handoff", generator_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not import generator: {generator_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def run(root: Path) -> HandoffCheck:
    result = HandoffCheck()
    handoff_path = root / HANDOFF
    if not handoff_path.exists():
        result.error(f"{HANDOFF} is missing")
        return result
    result.ok(f"{HANDOFF} exists")

    try:
        generator = load_generator(root)
        expected = generator.generate(root)
    except Exception as exc:
        result.error(f"could not generate expected handoff: {exc}")
        return result

    actual = handoff_path.read_text(encoding="utf-8")
    if actual == expected:
        result.ok("RC prompt-test handoff matches generator")
    else:
        result.error("RC prompt-test handoff is stale")

    for token in REQUIRED_TOKENS:
        if token in actual:
            result.ok(f"handoff token exists: {token}")
        else:
            result.error(f"handoff missing token: {token}")

    for test_id, prompt in REQUIRED_PROMPTS.items():
        if test_id in actual and prompt in actual:
            result.ok(f"handoff includes {test_id} prompt path")
        else:
            result.error(f"handoff missing {test_id} prompt path")
        clean_prompt = (
            ".codex-tmp/forward-test-clean-session-received/rc-minimum/inbox/"
            f"prompts/{test_id.lower()}-clean-session.md"
        )
        if clean_prompt in actual:
            result.ok(f"handoff includes {test_id} clean-session prompt path")
        else:
            result.error(f"handoff missing {test_id} clean-session prompt path")
        if not (root / prompt).exists():
            result.error(f"{test_id} prompt file is missing: {prompt}")

    lowered = actual.lower()
    for token in FORBIDDEN_TOKENS:
        if token.lower() in lowered:
            result.error(f"handoff leaks reviewer-only token: {token}")

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
            print(f"RC prompt-test handoff check failed: {len(result.errors)} error(s)")
        else:
            print("RC prompt-test handoff check passed")

    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
