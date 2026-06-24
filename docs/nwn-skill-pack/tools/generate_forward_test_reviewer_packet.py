#!/usr/bin/env python3
"""Generate reviewer-only forward-test packet from reviewer-matrix.json."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


MATRIX_PATH = Path("forward-tests/reviewer-matrix.json")
OUTPUT_PATH = Path("forward-tests/reviewer-packet.md")


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def require_list(value: object, label: str) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        raise ValueError(f"{label} must be a list")
    result: list[dict[str, Any]] = []
    for index, item in enumerate(value):
        if not isinstance(item, dict):
            raise ValueError(f"{label}[{index}] must be an object")
        result.append(item)
    return result


def add_bullets(lines: list[str], values: object) -> None:
    if not isinstance(values, list):
        return
    for value in values:
        lines.append(f"- `{value}`" if isinstance(value, str) and value.endswith(".md") else f"- {value}")


def generate(root: Path) -> str:
    manifest = load_json(root / "version-manifest.json")
    matrix = load_json(root / MATRIX_PATH)
    tests = require_list(matrix.get("tests"), "reviewer matrix tests")

    lines = [
        "# Forward-Test Reviewer Packet",
        "",
        f"Generated from package metadata last updated: {manifest.get('last_updated')}",
        "",
        "## Purpose",
        "",
        "Use this reviewer-only packet only after the raw answer has been captured and `check_forward_test_return_captures.py` passes on the filled returned capture sheet.",
        "Do not give this file, the reviewer matrix, record-command templates, prior results, or expected references to the agent under test.",
        "",
        "## Reviewer Workflow",
        "",
        "1. Run `python docs\\nwn-skill-pack\\tools\\check_forward_test_prompts.py docs\\nwn-skill-pack`.",
        "2. Open a fresh Codex thread or clean model session.",
        "3. Paste exactly one file from `docs/nwn-skill-pack/forward-tests/prompts/`.",
        "4. Fill a capture sheet from `forward-tests/answer-capture-template.md` or `tools/init_forward_test_capture.py` before reading reviewer-only expected references.",
        "5. Run `python docs\\nwn-skill-pack\\tools\\check_forward_test_return_captures.py docs\\nwn-skill-pack --captures <returned-captures-dir>` on the filled returned capture sheet.",
        "6. Do not score before the returned-capture check passes; blank initialized capture sheets must fail this gate.",
        "7. Compare the answer against the matching section below.",
        "8. Record `pass`, `partial`, or `fail` with `tools/forward_test_record.py`; pass/partial records require `--first-implementable-slice` after reviewer confirmation.",
        "9. Regenerate `forward-tests/aggregate.md`, `release-readiness.md`, and package inventory.",
        "",
        "## Scoring Rules",
        "",
        "- `pass`: expected references or equivalent routing are present, evidence status is labeled, runtime proof is not invented, the answer names a First Implementable Slice, and it gives an actionable NWN server-gamedev workflow.",
        "- `partial`: the answer is useful but misses one important reference, evidence label, First Implementable Slice detail, runtime QA step, rollback/contribution step, or project-specific caveat. Record an improvement action.",
        "- `fail`: the answer invents runtime proof, treats unverified claims as general NWN facts, ignores the skill references, skips the task, omits a buildable first slice, or gives unsafe release/custom-content guidance. Record at least one issue and an improvement action.",
        "",
        "Forward-test records prove skill behavior in one session. They do not prove NWN domain facts by themselves.",
        "",
        "## Test Matrix",
        "",
    ]

    for entry in tests:
        test_id = entry.get("test_id", "")
        title = entry.get("title", "")
        prompt_file = entry.get("prompt_file", "")
        lines.extend([
            f"### {test_id}: {title}",
            "",
            f"- Prompt file: `{prompt_file}`",
            "- Expected references:",
            "",
        ])
        add_bullets(lines, entry.get("expected_references"))
        lines.extend([
            "",
            "- Review focus:",
            "",
        ])
        add_bullets(lines, entry.get("review_focus"))
        lines.append("")

    lines.extend([
        "## Record And Regenerate",
        "",
        "Use `forward-tests/record-command-templates.md` after scoring. Replace placeholders before running a command.",
        "",
        "```powershell",
        "python docs\\nwn-skill-pack\\tools\\forward_test_record.py validate docs\\nwn-skill-pack\\forward-tests\\records\\<record>.json",
        "python docs\\nwn-skill-pack\\tools\\forward_test_record.py aggregate docs\\nwn-skill-pack\\forward-tests\\records --out docs\\nwn-skill-pack\\forward-tests\\aggregate.md",
        "python docs\\nwn-skill-pack\\tools\\generate_release_readiness.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\release-readiness.md",
        "python docs\\nwn-skill-pack\\tools\\generate_package_inventory.py docs\\nwn-skill-pack --out-json docs\\nwn-skill-pack\\package-inventory.json --out-md docs\\nwn-skill-pack\\package-inventory.md",
        "```",
        "",
        "Promote reusable NWN lessons only through reviewed feedback records and the human feedback release workflow.",
    ])

    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--out", default=str(Path("docs/nwn-skill-pack") / OUTPUT_PATH))
    args = parser.parse_args()

    root = Path(args.root)
    try:
        output = generate(root)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(output, encoding="utf-8")
    print(out_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
