#!/usr/bin/env python3
"""Generate reviewer-only forward-test record command templates from the matrix."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


MATRIX_PATH = Path("forward-tests/reviewer-matrix.json")
OUTPUT_PATH = Path("forward-tests/record-command-templates.md")
SKILL_PATH = "docs\\nwn-skill-pack\\draft-skills\\nwn-server-gamedev"


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value[:64] or "forward-test"


def ps_path(path: str) -> str:
    return path.replace("/", "\\")


def generate(root: Path) -> str:
    manifest = load_json(root / "version-manifest.json")
    matrix = load_json(root / MATRIX_PATH)
    tests = matrix.get("tests")
    if not isinstance(tests, list):
        raise ValueError("reviewer matrix tests must be a list")

    lines = [
        "# Forward-Test Record Command Templates",
        "",
        f"Generated from package metadata last updated: {manifest.get('last_updated')}",
        "",
        "## Purpose",
        "",
        "Use these reviewer-only templates after a fresh-context prompt forward test has run.",
        "Do not give this file to the agent under test; it contains expected references from the reviewer matrix.",
        "",
        "Replace bracketed placeholders before running a command. Keep `partial` and `fail` records tied to an improvement action.",
        "",
    ]

    for entry in tests:
        if not isinstance(entry, dict):
            raise ValueError("reviewer matrix tests must contain objects")
        test_id = str(entry.get("test_id", "")).strip()
        title = str(entry.get("title", "")).strip()
        prompt_file = str(entry.get("prompt_file", "")).strip()
        expected_refs = entry.get("expected_references")
        focus = entry.get("review_focus", [])
        if not test_id or not title or not prompt_file:
            raise ValueError("reviewer matrix entry must include test_id, title, and prompt_file")
        if not isinstance(expected_refs, list) or not all(isinstance(item, str) for item in expected_refs):
            raise ValueError(f"{test_id} expected_references must be a list of strings")
        if not isinstance(focus, list) or not all(isinstance(item, str) for item in focus):
            raise ValueError(f"{test_id} review_focus must be a list of strings")

        record_id = f"{test_id.lower()}-{slugify(title)}-fresh-thread"
        lines.extend([
            f"## {test_id}: {title}",
            "",
            f"- Prompt file: `{prompt_file}`",
            "- Expected references:",
            "",
        ])
        for ref in expected_refs:
            lines.append(f"  - `{ref}`")
        lines.extend(["", "- Review focus:", ""])
        for item in focus:
            lines.append(f"  - {item}")
        lines.extend([
            "",
            "Pass and partial records must keep `--first-implementable-slice` only when reviewer scoring confirmed the answer names files/assets touched, expected proof, rollback, and evidence limits. Remove the flag for fail/not-run records.",
            "",
            "```powershell",
            "python docs\\nwn-skill-pack\\tools\\forward_test_record.py new `",
            "  --record-type prompt-forward-test `",
            f"  --test-id {test_id} `",
            f"  --id {record_id} `",
            f"  --title \"{test_id} {title}\" `",
            "  --result [pass|partial|fail] `",
            "  --tester \"[tester]\" `",
            "  --context \"[fresh context; model/build; no expected-answer leakage; raw answer captured before reviewer-only scoring]\" `",
            f"  --prompt-or-command \"@docs\\nwn-skill-pack\\{ps_path(prompt_file)}\" `",
            f"  --skill-path \"{SKILL_PATH}\" `",
        ])
        for ref in expected_refs:
            lines.append(f"  --expected-reference {ref} `")
        lines.extend([
            "  --observed-reference [observed-reference.md] `",
            "  --evidence-label [design-only|static-checked|runtime-tested|project-specific] `",
            "  --evidence \"[short observed behavior]\" `",
            "  --issue \"[missing First Implementable Slice or weak behavior, if any]\" `",
            "  --missing-evidence \"[runtime/module/log evidence still missing]\" `",
            "  --artifact \"[filled returned capture sheet under docs\\nwn-skill-pack\\.codex-tmp\\forward-test-return-captures\\]\" `",
        ])
        if test_id == "FT-010":
            lines.extend([
                "  --artifact \"docs\\nwn-skill-pack\\.codex-tmp\\forward-test-reviews\\full-slice-ft010\\ft-010-review.md\" `",
            ])
        lines.extend([
            "  --first-implementable-slice `",
            "  --improvement-summary \"[required for partial/fail; empty for pass]\"",
            "```",
            "",
        ])

    lines.extend([
        "## After Recording",
        "",
        "```powershell",
        "python docs\\nwn-skill-pack\\tools\\forward_test_record.py validate docs\\nwn-skill-pack\\forward-tests\\records\\<record>.json",
        "python docs\\nwn-skill-pack\\tools\\forward_test_record.py aggregate docs\\nwn-skill-pack\\forward-tests\\records --out docs\\nwn-skill-pack\\forward-tests\\aggregate.md",
        "python docs\\nwn-skill-pack\\tools\\generate_release_readiness.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\release-readiness.md",
        "python docs\\nwn-skill-pack\\tools\\generate_package_inventory.py docs\\nwn-skill-pack --out-json docs\\nwn-skill-pack\\package-inventory.json --out-md docs\\nwn-skill-pack\\package-inventory.md",
        "```",
        "",
    ])
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--out", default="docs/nwn-skill-pack/forward-tests/record-command-templates.md")
    args = parser.parse_args()

    try:
        output = generate(Path(args.root))
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
