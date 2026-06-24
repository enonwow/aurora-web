#!/usr/bin/env python3
"""Generate a no-answer-leak execution queue for prompt forward tests."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any


MATRIX_PATH = Path("forward-tests/reviewer-matrix.json")
RECORD_DIR = Path("forward-tests/records")
OUTPUT_PATH = Path("forward-tests/execution-queue.md")
BOUNDARY_HANDOFFS = {
    "FT-009": "forward-tests/ft-009-local-intake-clean-session-handoff.md",
    "FT-010": "forward-tests/ft-010-full-slice-clean-session-handoff.md",
}


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def load_records(record_dir: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    if not record_dir.exists():
        return records
    for path in sorted(record_dir.rglob("*.json")):
        try:
            record = load_json(path)
        except Exception:
            continue
        record["_path"] = str(path)
        records.append(record)
    return records


def result_state(records: list[dict[str, Any]]) -> str:
    if not records:
        return "pending"
    results = {str(record.get("result", "")) for record in records}
    if "fail" in results:
        return "fail"
    if "partial" in results:
        return "partial"
    if "pass" in results:
        return "pass"
    return "not-run"


def next_action(test_id: str, state: str, prompt_file: str) -> str:
    handoff = BOUNDARY_HANDOFFS.get(test_id)
    if state == "pending":
        if handoff:
            return (
                f"Run the boundary handoff `{handoff}` in a fresh context, "
                "then validate its returned capture before reviewer scoring."
            )
        return (
            f"Run `{prompt_file}` in a fresh context, capture the raw answer, "
            "run `check_forward_test_return_captures.py`, then score with `reviewer-packet.md`."
        )
    if state == "pass":
        return "No rerun needed unless the skill or references changed materially."
    if state == "partial":
        return "Review improvement action, patch the skill or references, then rerun in fresh context."
    if state == "fail":
        return "Treat as release blocker, create improvement work, then rerun in fresh context."
    return "Record why it was not run or schedule a fresh-context run."


def generate(root: Path) -> str:
    manifest = load_json(root / "version-manifest.json")
    matrix = load_json(root / MATRIX_PATH)
    tests_raw = matrix.get("tests")
    if not isinstance(tests_raw, list):
        raise ValueError("reviewer matrix tests must be a list")

    records = [
        record for record in load_records(root / RECORD_DIR)
        if record.get("record_type") == "prompt-forward-test"
    ]
    records_by_test: dict[str, list[dict[str, Any]]] = {}
    for record in records:
        test_id = str(record.get("test_id", ""))
        records_by_test.setdefault(test_id, []).append(record)

    rows: list[tuple[str, str, str, str, int, str]] = []
    for entry in tests_raw:
        if not isinstance(entry, dict):
            continue
        test_id = str(entry.get("test_id", ""))
        title = str(entry.get("title", ""))
        prompt_file = str(entry.get("prompt_file", ""))
        matching = records_by_test.get(test_id, [])
        state = result_state(matching)
        rows.append((test_id, title, prompt_file, state, len(matching), next_action(test_id, state, prompt_file)))

    counts = Counter(row[3] for row in rows)
    passed = counts.get("pass", 0)
    pending = counts.get("pending", 0)

    lines = [
        "# Forward-Test Execution Queue",
        "",
        f"Generated from package metadata last updated: {manifest.get('last_updated')}",
        "",
        "## Purpose",
        "",
        "Use this no-answer-leak queue to schedule the reviewer-matrix prompt forward tests.",
        "Do not give this file to the agent under test; give the agent exactly one prompt file.",
        "",
        "## Summary",
        "",
        f"- Prompt tests passed: {passed}",
        f"- Prompt tests pending: {pending}",
        f"- Prompt tests required before RC: 3",
        "",
        "## Queue",
        "",
        "| Test | Title | Prompt file | State | Records | Next action |",
        "| --- | --- | --- | --- | ---: | --- |",
    ]
    for test_id, title, prompt_file, state, count, action in rows:
        lines.append(f"| `{test_id}` | {title} | `{prompt_file}` | `{state}` | {count} | {action} |")

    lines.extend([
        "",
        "## Boundary Test Lanes",
        "",
    ])
    if BOUNDARY_HANDOFFS:
        for test_id, handoff in sorted(BOUNDARY_HANDOFFS.items()):
            lines.append(
                f"- `{test_id}` uses `{handoff}` for custom clean-session, received-pack, "
                "and returned-capture checks. It is additional boundary coverage, not part of the minimum RC trio."
            )
    else:
        lines.append("- none")

    lines.extend([
        "",
        "## Reviewer Files",
        "",
        "- Give the agent only one file from `forward-tests/prompts/`.",
        "- Use `forward-tests/tester-packet.md` for no-answer-leak tester workflow.",
        "- Use `forward-tests/answer-capture-template.md` or `tools/init_forward_test_capture.py` before reviewer-only scoring.",
        "- Run `tools/check_forward_test_return_captures.py --captures <returned-captures-dir>` before opening `forward-tests/reviewer-packet.md`; blank initialized capture sheets must fail this gate.",
        "- Use `forward-tests/reviewer-packet.md` only after the returned-capture check passes.",
        "- Use `forward-tests/record-command-templates.md` only when recording results.",
        "",
        "## Refresh Commands",
        "",
        "```powershell",
        "python docs\\nwn-skill-pack\\tools\\check_forward_test_prompts.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\forward_test_record.py aggregate docs\\nwn-skill-pack\\forward-tests\\records --out docs\\nwn-skill-pack\\forward-tests\\aggregate.md",
        "python docs\\nwn-skill-pack\\tools\\generate_release_readiness.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\release-readiness.md",
        "python docs\\nwn-skill-pack\\tools\\generate_package_inventory.py docs\\nwn-skill-pack --out-json docs\\nwn-skill-pack\\package-inventory.json --out-md docs\\nwn-skill-pack\\package-inventory.md",
        "```",
        "",
        "This queue is scheduling evidence only. It does not prove that any fresh-context prompt test has passed.",
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
