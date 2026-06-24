#!/usr/bin/env python3
"""Generate a no-answer-leak RC prompt-test handoff for external testers."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


MATRIX_PATH = Path("forward-tests/reviewer-matrix.json")
OUTPUT_PATH = Path("forward-tests/rc-prompt-test-handoff.md")
REQUIRED_TRIO = ["FT-002", "FT-003", "FT-008"]


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def load_tests(root: Path) -> dict[str, dict[str, Any]]:
    matrix = load_json(root / MATRIX_PATH)
    tests = matrix.get("tests", [])
    if not isinstance(tests, list):
        raise ValueError("reviewer matrix tests must be a list")
    by_id: dict[str, dict[str, Any]] = {}
    for test in tests:
        if isinstance(test, dict) and isinstance(test.get("test_id"), str):
            by_id[test["test_id"]] = test
    return by_id


def generate(root: Path) -> str:
    manifest = load_json(root / "version-manifest.json")
    tests = load_tests(root)
    lines = [
        "# RC Prompt-Test Handoff",
        "",
        "## Purpose",
        "",
        "Use this handoff when asking another person or clean model session to run the minimal prompt-forward-test trio for the current RC blocker set.",
        "",
        "This file is safe tester handoff material. It must not be pasted to the agent under test; give the agent only one prompt file.",
        "",
        "## Current Package",
        "",
        f"- Package: `{manifest.get('package_name')}`",
        f"- Version: `{manifest.get('version')}`",
        f"- State: `{manifest.get('package_state')}`",
        f"- Skill path for prompts: `{manifest.get('authoring_skill')}`",
        "",
        "## Tester Instructions",
        "",
        "0. Maintainer refreshes the prompt pack and received inbox before handoff:",
        "",
        "   ```powershell",
        "   python docs\\nwn-skill-pack\\tools\\build_forward_test_clean_session_prompts.py docs\\nwn-skill-pack --force",
        "   python docs\\nwn-skill-pack\\tools\\check_forward_test_clean_session_received_pack.py docs\\nwn-skill-pack",
        "   ```",
        "",
        "1. Open a fresh Codex thread or clean model session.",
        "2. Choose exactly one clean-session prompt from the received inbox list below.",
        "3. Paste only that clean-session prompt file into the clean session.",
        "4. Initialize a capture sheet with `tools/init_forward_test_capture.py`, then save the raw answer immediately with `forward-tests/answer-capture-template.md`.",
        "5. Return the captured answer to the maintainer.",
        "6. Start a new clean session for the next prompt.",
        "",
        "Do not send prior test results, suspected failures, reviewer notes, expected references, scoring guidance, or this handoff to the agent under test.",
        "",
        "## Blank Capture Guard",
        "",
        "Initialized capture sheets are placeholders until the raw answer and session facts are pasted into them.",
        "",
        "Before reviewer scoring, the maintainer must run:",
        "",
        "```powershell",
        "python docs\\nwn-skill-pack\\tools\\check_forward_test_return_captures.py docs\\nwn-skill-pack --captures docs\\nwn-skill-pack\\.codex-tmp\\forward-test-return-captures",
        "```",
        "",
        "Blank initialized sheets must fail this gate. Treat that failure as the expected blocker until the tester returns filled capture sheets.",
        "",
        "## Minimal RC Trio",
        "",
        "| Test | Title | Clean-session prompt | Source prompt | Capture requirement |",
        "| --- | --- | --- | --- | --- |",
    ]

    for test_id in REQUIRED_TRIO:
        test = tests.get(test_id)
        if not test:
            raise ValueError(f"reviewer matrix missing required test: {test_id}")
        title = str(test.get("title") or test_id)
        prompt_file = str(test.get("prompt_file") or "")
        if not prompt_file:
            raise ValueError(f"reviewer matrix {test_id} has no prompt_file")
        clean_prompt = (
            ".codex-tmp/forward-test-clean-session-received/rc-minimum/inbox/"
            f"prompts/{test_id.lower()}-clean-session.md"
        )
        lines.append(
            f"| `{test_id}` | {title} | `{clean_prompt}` | `{prompt_file}` | Use `forward-tests/answer-capture-template.md` before scoring. |"
        )

    lines.extend([
        "",
        "## Return To Maintainer",
        "",
        "For each run, return:",
        "",
        "- test id",
        "- prompt file",
        "- model or session label",
        "- fresh-context confirmation",
        "- raw answer path or transcript",
        "- any contamination or deviation",
        "- filled capture sheet path, preferably under `.codex-tmp/forward-test-return-captures/`",
        "- received prompt-pack summary path: `.codex-tmp/forward-test-clean-session-received/rc-minimum/RECEIVED-CLEAN-SESSION-SUMMARY.json`",
        "",
        "## Verification Boundary",
        "",
        "This handoff proves only the intended no-answer-leak execution procedure. It does not prove a test was run, a prompt passed, a plugin installed, or any NWN runtime behavior.",
        "",
    ])
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--out", default=str(Path("docs/nwn-skill-pack") / OUTPUT_PATH))
    args = parser.parse_args()

    root = Path(args.root)
    output = Path(args.out)
    output.write_text(generate(root), encoding="utf-8")
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
