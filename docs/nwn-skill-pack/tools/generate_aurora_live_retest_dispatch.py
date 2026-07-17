#!/usr/bin/env python3
"""Generate a send-ready retest dispatch from held Aurora live review outcomes."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from types import ModuleType
from typing import Any


DEFAULT_REVIEW_OUTCOME_DIR = Path("knowledge-inbox/aurora-live-review-outcomes/records")
DEFAULT_OUT = Path("knowledge-inbox/aurora-live-retest-dispatch.md")


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_module(path: Path, name: str) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def rel(root: Path, path: Path) -> str:
    try:
        return str(path.relative_to(root)).replace("\\", "/")
    except ValueError:
        return str(path).replace("\\", "/")


def string_list(record: dict[str, Any], key: str) -> list[str]:
    value = record.get(key, [])
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if str(item).strip()]


def collect(
    root: Path,
    review_outcome_dir: Path = DEFAULT_REVIEW_OUTCOME_DIR,
) -> dict[str, Any]:
    review_tool = load_module(
        root / "tools" / "aurora_live_review_outcome_record.py",
        "aurora_live_retest_dispatch_review_outcome_tool",
    )
    records_path = root / review_outcome_dir
    record_paths = sorted(records_path.glob("*.json")) if records_path.is_dir() else []
    valid: list[tuple[Path, dict[str, Any]]] = []
    invalid: list[tuple[Path, list[str]]] = []
    held: list[tuple[Path, dict[str, Any]]] = []

    for path in record_paths:
        try:
            record = load_json(path)
        except Exception as exc:
            invalid.append((path, [str(exc)]))
            continue
        errors = review_tool.validate_record(record)
        if errors:
            invalid.append((path, errors))
            continue
        valid.append((path, record))
        if record.get("outcome") == "hold-for-retest":
            held.append((path, record))

    return {
        "records_path": records_path,
        "record_paths": record_paths,
        "valid": valid,
        "invalid": invalid,
        "held": held,
    }


def primary_atom(record: dict[str, Any]) -> str:
    held_atoms = string_list(record, "held_atoms")
    if held_atoms:
        return held_atoms[0]
    blocked_atoms = string_list(record, "blocked_atoms")
    if blocked_atoms:
        return blocked_atoms[0]
    next_actions = string_list(record, "next_actions")
    if next_actions:
        return next_actions[0]
    return "unlisted-retake-atom"


def bullet_values(values: list[str], empty: str = "none") -> list[str]:
    if not values:
        return [f"  - {empty}"]
    return [f"  - {value}" for value in values]


def render_dispatch_items(root: Path, held: list[tuple[Path, dict[str, Any]]]) -> list[str]:
    if not held:
        return ["- No active retest requests. Wait for a real `hold-for-retest` review outcome record."]

    lines: list[str] = []
    for index, (path, record) in enumerate(held, start=1):
        atom = primary_atom(record)
        held_atoms = string_list(record, "held_atoms")
        blocked_atoms = string_list(record, "blocked_atoms")
        next_actions = string_list(record, "next_actions")
        lines.extend([
            f"### Retest {index}: `{atom}`",
            "",
            f"- review outcome: `{record.get('id')}`",
            f"- live record: `{record.get('live_record_id')}`",
            f"- live record path: `{record.get('live_record_path')}`",
            f"- review outcome file: `{rel(root, path)}`",
            "- smallest missing atom:",
            f"  - `{atom}`",
            "- held atoms:",
            *bullet_values(held_atoms),
            "- blocked atoms:",
            *bullet_values(blocked_atoms),
            "- requested next actions:",
            *bullet_values(next_actions),
            "",
            "#### Operator Message",
            "",
            "```text",
            "Please rerun only the smallest missing Aurora/NWN evidence atom below.",
            f"Target atom: {atom}",
            f"Review outcome: {record.get('id')}",
            f"Live record: {record.get('live_record_id')}",
            "",
            "Return only evidence for this atom unless you hit a blocker:",
            "- one concise Toolset observation,",
            "- screenshot or screen-backed artifact path when UI state matters,",
            "- client log and server log excerpt path when runtime/build behavior matters,",
            "- exact blocker text if the atom cannot be completed,",
            "- a completed knowledge-inbox/aurora-live-retest-result-template.md entry for the returned retest,",
            "- confirmation that private module, player, account, token, and IP data were removed.",
            "",
            "Do not send raw decompilation, private module files, player data, account data, tokens, or IPs.",
            "Do not claim runtime behavior without client/server/log evidence.",
            "This retest request is not skill knowledge, not runtime proof, and not release readiness.",
            "```",
            "",
        ])
    return lines


def render(root: Path, review_outcome_dir: Path = DEFAULT_REVIEW_OUTCOME_DIR) -> str:
    data = collect(root, review_outcome_dir)
    status = "no-retest-requests"
    if data["invalid"]:
        status = "invalid-review-outcomes"
    elif data["held"]:
        status = "retest-requests-ready"

    lines = [
        "# Aurora Live Retest Dispatch",
        "",
        f"Generated: {now_iso()}",
        "",
        "## Purpose",
        "",
        "Turn reviewed `hold-for-retest` outcomes into a small operator handoff for the next Aurora Toolset/NWN evidence pass. Each request asks for the smallest missing atom instead of broad retesting.",
        "",
        "This dispatch is maintainer handoff material. It is not installed skill content, not skill knowledge, not docs/RAG source material, not runtime proof, not privacy proof, and not release readiness.",
        "",
        "## Summary",
        "",
        f"- Status: `{status}`",
        f"- Review outcome directory: `{rel(root, data['records_path'])}`",
        f"- Review outcome records: `{len(data['record_paths'])}`",
        f"- Valid review outcome records: `{len(data['valid'])}`",
        f"- Invalid review outcome records: `{len(data['invalid'])}`",
        f"- Held review outcomes: `{len(data['held'])}`",
        "",
        "## Retest Dispatch Items",
        "",
        *render_dispatch_items(root, data["held"]),
        "## Invalid Review Outcome Records",
        "",
    ]

    if data["invalid"]:
        for path, errors in data["invalid"]:
            lines.append(f"- `{rel(root, path)}`")
            for error in errors:
                lines.append(f"  - {error}")
    else:
        lines.append("- none")

    lines.extend([
        "",
        "## Maintainer Commands",
        "",
        "```powershell",
        "python docs\\nwn-skill-pack\\tools\\aurora_live_review_outcome_record.py validate docs\\nwn-skill-pack\\knowledge-inbox\\aurora-live-review-outcomes\\records --root docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\generate_aurora_live_review_queue.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\knowledge-inbox\\aurora-live-review-queue.md",
        "python docs\\nwn-skill-pack\\tools\\check_aurora_live_review_queue.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\generate_aurora_live_retest_dispatch.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\knowledge-inbox\\aurora-live-retest-dispatch.md",
        "python docs\\nwn-skill-pack\\tools\\check_aurora_live_retest_dispatch.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_aurora_live_retest_result_template.py docs\\nwn-skill-pack",
        "```",
        "",
        "## Intake After Return",
        "",
        "When the operator returns the retest, ask for `knowledge-inbox/aurora-live-retest-result-template.md` to be completed, then record the evidence as a new Aurora live record or update the relevant returned bundle. Run review outcome intake again. Do not edit the skill references directly from this dispatch. Promotion still requires validated live records, evidence manifests, redaction review, maintainer review outcome records, and release evidence index refresh.",
        "",
        "## Still Hypothesis",
        "",
        "- The operator can complete the requested atom without additional context.",
        "- The returned screenshot/log paths will be complete and redacted.",
        "- The held atom will become acceptable for a future promotion proposal.",
        "- The resulting evidence will improve future NWN server gamedev skill answers.",
        "",
    ])
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    args = parser.parse_args()

    root = Path(args.root)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(render(root), encoding="utf-8")
    print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
