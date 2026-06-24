#!/usr/bin/env python3
"""Generate the maintainer review queue for submitted Aurora Toolset live records."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from types import ModuleType
from typing import Any


DEFAULT_RECORD_DIR = Path("knowledge-inbox/aurora-live-records")
DEFAULT_REVIEW_OUTCOME_DIR = Path("knowledge-inbox/aurora-live-review-outcomes/records")


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


def collect(
    root: Path,
    records_dir: Path = DEFAULT_RECORD_DIR,
    review_outcome_dir: Path = DEFAULT_REVIEW_OUTCOME_DIR,
) -> dict[str, Any]:
    live_tool = load_module(
        root / "tools" / "aurora_toolset_live_record.py",
        "aurora_toolset_live_record_review_queue_generator",
    )
    review_outcome_tool = load_module(
        root / "tools" / "aurora_live_review_outcome_record.py",
        "aurora_live_review_outcome_review_queue_generator",
    )
    records_path = root / records_dir
    record_paths = sorted(records_path.glob("*.json")) if records_path.is_dir() else []
    review_outcome_path = root / review_outcome_dir
    review_outcome_paths = sorted(review_outcome_path.glob("*.json")) if review_outcome_path.is_dir() else []

    valid: list[tuple[Path, dict[str, Any]]] = []
    invalid: list[tuple[Path, list[str]]] = []
    review_outcomes: list[tuple[Path, dict[str, Any]]] = []
    invalid_review_outcomes: list[tuple[Path, list[str]]] = []
    held_review_outcomes: list[tuple[Path, dict[str, Any]]] = []
    promotion_ready: list[dict[str, Any]] = []
    blockers: list[dict[str, Any]] = []
    rejects: list[dict[str, Any]] = []
    label_risks: list[dict[str, Any]] = []
    status_counts: Counter[str] = Counter()
    evidence_counts: Counter[str] = Counter()
    review_outcome_counts: Counter[str] = Counter()
    initialized_only = 0

    for path in record_paths:
        try:
            record = load_json(path)
        except Exception as exc:
            invalid.append((path, [str(exc)]))
            continue
        errors = live_tool.validate_record(record)
        if errors:
            invalid.append((path, errors))
            continue
        valid.append((path, record))
        record_id = str(record.get("id", path.stem))
        candidate_refs = record.get("promotion", {}).get("candidate_references", [])
        atoms = record.get("atoms", [])
        if isinstance(atoms, list) and atoms:
            if all(isinstance(atom, dict) and atom.get("status") == "not-run" for atom in atoms):
                initialized_only += 1
        for atom in atoms:
            if not isinstance(atom, dict):
                continue
            status = str(atom.get("status", "unknown"))
            evidence_label = str(atom.get("evidence_label", "unknown"))
            name = str(atom.get("atom", "unknown"))
            status_counts[status] += 1
            evidence_counts[evidence_label] += 1
            item = {
                "record_id": record_id,
                "record_path": rel(root, path),
                "atom": name,
                "status": status,
                "evidence_label": evidence_label,
                "observations": atom.get("observations", []),
                "artifacts": atom.get("artifacts", []),
                "blockers": atom.get("blockers", []),
                "candidate_references": candidate_refs,
            }
            if atom.get("promotion_ready") is True:
                promotion_ready.append(item)
            if status == "blocked":
                blockers.append(item)
            if status == "rejected":
                rejects.append(item)
            if status in {"observed-toolset", "compiled", "runtime-tested"} and evidence_label == "local-reverse-lead":
                label_risks.append(item)
            if status == "runtime-tested" and evidence_label != "runtime-tested":
                label_risks.append(item)

    for path in review_outcome_paths:
        try:
            record = load_json(path)
        except Exception as exc:
            invalid_review_outcomes.append((path, [str(exc)]))
            continue
        errors = review_outcome_tool.validate_record(record)
        if errors:
            invalid_review_outcomes.append((path, errors))
            continue
        review_outcomes.append((path, record))
        outcome = str(record.get("outcome", "unknown"))
        review_outcome_counts[outcome] += 1
        if outcome == "hold-for-retest":
            held_review_outcomes.append((path, record))

    return {
        "records_path": records_path,
        "record_paths": record_paths,
        "review_outcome_path": review_outcome_path,
        "review_outcome_paths": review_outcome_paths,
        "valid": valid,
        "invalid": invalid,
        "review_outcomes": review_outcomes,
        "invalid_review_outcomes": invalid_review_outcomes,
        "held_review_outcomes": held_review_outcomes,
        "promotion_ready": promotion_ready,
        "blockers": blockers,
        "rejects": rejects,
        "label_risks": label_risks,
        "status_counts": status_counts,
        "evidence_counts": evidence_counts,
        "review_outcome_counts": review_outcome_counts,
        "initialized_only": initialized_only,
    }


def count_lines(counter: Counter[str]) -> list[str]:
    if not counter:
        return ["- none"]
    return [f"- `{key}`: `{counter[key]}`" for key in sorted(counter)]


def item_lines(items: list[dict[str, Any]], empty: str) -> list[str]:
    if not items:
        return [f"- {empty}"]
    lines: list[str] = []
    for item in items:
        lines.append(
            "- "
            f"`{item['atom']}` from `{item['record_id']}` "
            f"({item['record_path']}) status=`{item['status']}` label=`{item['evidence_label']}`"
        )
        lines.append(f"  - artifacts: `{len(item['artifacts'])}`; observations: `{len(item['observations'])}`")
        if item["candidate_references"]:
            refs = ", ".join(f"`{ref}`" for ref in item["candidate_references"])
            lines.append(f"  - candidate references: {refs}")
        if item["blockers"]:
            lines.append(f"  - blockers: {'; '.join(str(blocker) for blocker in item['blockers'])}")
    return lines


def review_outcome_lines(items: list[tuple[Path, dict[str, Any]]], root: Path) -> list[str]:
    if not items:
        return ["- No held review outcomes are waiting for retest dispatch."]

    lines: list[str] = []
    for path, record in items:
        held_atoms = record.get("held_atoms", [])
        blocked_atoms = record.get("blocked_atoms", [])
        next_actions = record.get("next_actions", [])
        if not isinstance(held_atoms, list):
            held_atoms = []
        if not isinstance(blocked_atoms, list):
            blocked_atoms = []
        if not isinstance(next_actions, list):
            next_actions = []

        lines.append(
            "- "
            f"`{record.get('id')}` outcome=`{record.get('outcome')}` "
            f"live record=`{record.get('live_record_id')}` file=`{rel(root, path)}`"
        )
        lines.append(f"  - held atoms: {', '.join(f'`{atom}`' for atom in held_atoms) if held_atoms else '`0`'}")
        lines.append(f"  - blocked atoms: {', '.join(str(atom) for atom in blocked_atoms) if blocked_atoms else '`0`'}")
        lines.append(f"  - next actions: {', '.join(str(action) for action in next_actions) if next_actions else '`0`'}")
        lines.append(
            "  - dispatch: ask the operator for the smallest missing atom evidence before any reference promotion."
        )
        lines.append(
            "  - boundary: this hold-for-retest outcome is not skill knowledge, not runtime proof, and not release readiness."
        )
    return lines


def generate(
    root: Path,
    records_dir: Path = DEFAULT_RECORD_DIR,
    review_outcome_dir: Path = DEFAULT_REVIEW_OUTCOME_DIR,
) -> str:
    data = collect(root, records_dir, review_outcome_dir)
    record_paths: list[Path] = data["record_paths"]
    review_outcome_paths: list[Path] = data["review_outcome_paths"]
    valid: list[tuple[Path, dict[str, Any]]] = data["valid"]
    invalid: list[tuple[Path, list[str]]] = data["invalid"]
    review_outcomes: list[tuple[Path, dict[str, Any]]] = data["review_outcomes"]
    invalid_review_outcomes: list[tuple[Path, list[str]]] = data["invalid_review_outcomes"]
    held_review_outcomes: list[tuple[Path, dict[str, Any]]] = data["held_review_outcomes"]
    promotion_ready: list[dict[str, Any]] = data["promotion_ready"]
    blockers: list[dict[str, Any]] = data["blockers"]
    label_risks: list[dict[str, Any]] = data["label_risks"]

    status = "no-records"
    if invalid or invalid_review_outcomes:
        status = "invalid-records"
    elif held_review_outcomes:
        status = "retest-request-needed"
    elif label_risks:
        status = "label-review-needed"
    elif promotion_ready:
        status = "promotion-review-needed"
    elif valid and data["initialized_only"] == len(valid):
        status = "prepared-only-no-review"
    elif valid:
        status = "records-present-no-promotion-ready"

    lines = [
        "# Aurora Live Record Review Queue",
        "",
        f"Generated: {now_iso()}",
        "",
        "## Summary",
        "",
        f"- Status: `{status}`",
        f"- Records directory: `{rel(root, data['records_path'])}`",
        f"- Submitted JSON records: `{len(record_paths)}`",
        f"- Valid records: `{len(valid)}`",
        f"- Invalid records: `{len(invalid)}`",
        f"- Review outcome directory: `{rel(root, data['review_outcome_path'])}`",
        f"- Review outcome records: `{len(review_outcome_paths)}`",
        f"- Valid review outcome records: `{len(review_outcomes)}`",
        f"- Invalid review outcome records: `{len(invalid_review_outcomes)}`",
        f"- Held review outcomes: `{len(held_review_outcomes)}`",
        f"- Initialized-only records: `{data['initialized_only']}`",
        f"- Promotion-ready atom rows: `{len(promotion_ready)}`",
        f"- Blocked atom rows: `{len(blockers)}`",
        f"- Label-risk rows: `{len(label_risks)}`",
        "",
        "This queue is maintainer triage. It is not installed skill content, not skill knowledge, not docs/RAG source material, and not proof by itself.",
        "",
        "## Required Review Gate",
        "",
        "- Use `knowledge-inbox/aurora-live-record-review-checklist.md` before generating a proposal.",
        "- Keep `screen-backed` and `symbol-only` crosswalk leads separate from evidence labels.",
        "- Do not turn `toolset-observed` into runtime guidance.",
        "- Require `runtime-tested` client/server/log evidence before runtime behavior claims.",
        "- Reject raw decompilation, private module data, player data, account data, tokens, and IPs.",
        "",
        "## Atom Status Counts",
        "",
        *count_lines(data["status_counts"]),
        "",
        "## Evidence Label Counts",
        "",
        *count_lines(data["evidence_counts"]),
        "",
        "## Review Outcome Counts",
        "",
        *count_lines(data["review_outcome_counts"]),
        "",
        "## Retest Requests",
        "",
        *review_outcome_lines(held_review_outcomes, root),
        "",
        "## Promotion Review Queue",
        "",
        *item_lines(promotion_ready, "No promotion-ready atom rows are waiting for review."),
        "",
        "## Label Risks",
        "",
        *item_lines(label_risks, "No label-risk rows found."),
        "",
        "## Blockers",
        "",
        *item_lines(blockers, "No blocked atom rows found."),
        "",
        "## Rejections",
        "",
        *item_lines(data["rejects"], "No rejected atom rows found."),
        "",
        "## Invalid Records",
        "",
    ]
    if invalid:
        for path, errors in invalid:
            lines.append(f"- `{rel(root, path)}`")
            for error in errors:
                lines.append(f"  - {error}")
        else:
            lines.append("- none")

    lines.extend(["", "## Invalid Review Outcome Records", ""])
    if invalid_review_outcomes:
        for path, errors in invalid_review_outcomes:
            lines.append(f"- `{rel(root, path)}`")
            for error in errors:
                lines.append(f"  - {error}")
    else:
        lines.append("- none")

    lines.extend([
        "",
        "## Commands",
        "",
        "```powershell",
        "python docs\\nwn-skill-pack\\tools\\aurora_toolset_live_record.py validate docs\\nwn-skill-pack\\knowledge-inbox\\aurora-live-records",
        "python docs\\nwn-skill-pack\\tools\\check_aurora_live_records.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\aurora_live_review_outcome_record.py validate docs\\nwn-skill-pack\\knowledge-inbox\\aurora-live-review-outcomes\\records --root docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\aurora_live_review_outcome_record.py aggregate docs\\nwn-skill-pack\\knowledge-inbox\\aurora-live-review-outcomes\\records --out docs\\nwn-skill-pack\\knowledge-inbox\\aurora-live-review-outcomes\\aggregate.md --root docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_aurora_live_review_outcome_records.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\generate_aurora_live_review_queue.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\knowledge-inbox\\aurora-live-review-queue.md",
        "python docs\\nwn-skill-pack\\tools\\check_aurora_live_review_queue.py docs\\nwn-skill-pack",
        "```",
        "",
        "## Next Action",
        "",
        "If status is `no-records`, run the one-session live operator path first. If status is `prepared-only-no-review`, wait for returned observations, artifacts, and redaction review before queueing promotion. If status is `retest-request-needed`, send the Retest Requests section to the operator and ask only for the smallest missing atom from the `hold-for-retest` outcome; do not promote references yet. If status is `promotion-review-needed`, review the rows with `aurora-live-record-review-checklist.md` before generating a promotion proposal.",
    ])
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--out", default="docs/nwn-skill-pack/knowledge-inbox/aurora-live-review-queue.md")
    args = parser.parse_args()

    output = generate(Path(args.root))
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(output, encoding="utf-8")
    print(out_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
