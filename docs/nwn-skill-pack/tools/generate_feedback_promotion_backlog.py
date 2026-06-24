#!/usr/bin/env python3
"""Generate a maintainer backlog for NWN skill feedback promotion."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from types import ModuleType
from typing import Any


INBOX_DIRS = ["incoming", "reviewed", "promoted", "rejected"]
REVIEWED_COPY_STATES = {"reviewed", "promoted", "rejected"}


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


def iter_records(root: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    inbox_root = root / "knowledge-inbox"
    for state in INBOX_DIRS:
        folder = inbox_root / state
        if not folder.exists():
            continue
        for path in sorted(folder.glob("*.json")):
            try:
                record = load_json(path)
            except Exception as exc:
                records.append({
                    "_path": str(path),
                    "_state": state,
                    "_invalid": [str(exc)],
                })
                continue
            record["_path"] = str(path)
            record["_state"] = state
            records.append(record)
    return records


def record_label(record: dict[str, Any]) -> str:
    return (
        f"`{record.get('id', 'unknown')}` "
        f"**{record.get('title', 'Untitled')}** "
        f"({record.get('domain', 'unknown')}, {record.get('status', 'unknown')})"
    )


def generate(root: Path) -> str:
    feedback = load_module(root / "tools" / "nwn_skill_feedback.py", "nwn_feedback_backlog")
    records = iter_records(root)

    status_counts: Counter[str] = Counter()
    state_counts: Counter[str] = Counter()
    domain_counts: Counter[str] = Counter()
    invalid: list[dict[str, Any]] = []
    promotion_ready: list[dict[str, Any]] = []
    needs_review: list[dict[str, Any]] = []
    needs_evidence: list[dict[str, Any]] = []
    reviewed_not_ready: list[dict[str, Any]] = []
    incoming_with_review_copy: list[dict[str, Any]] = []

    ids_by_state: dict[str, set[str]] = defaultdict(set)
    paths_by_id: dict[str, list[str]] = defaultdict(list)

    for record in records:
        record_id = str(record.get("id", ""))
        if not record_id:
            continue
        ids_by_state[record_id].add(str(record.get("_state", "unknown")))
        paths_by_id[record_id].append(str(record.get("_path", "")))

    for record in records:
        state = str(record.get("_state", "unknown"))
        state_counts[state] += 1
        record_id = str(record.get("id", ""))

        errors = record.get("_invalid")
        if not errors:
            errors = feedback.validate_record(record)
        if errors:
            record["_errors"] = errors
            invalid.append(record)
            continue

        status_counts[str(record.get("status", "unknown"))] += 1
        domain_counts[str(record.get("domain", "unknown"))] += 1
        review = record.get("review", {})
        decision = review.get("decision") if isinstance(review, dict) else ""
        promotion_flag = bool(review.get("promotion_ready")) if isinstance(review, dict) else False
        states_for_id = ids_by_state.get(record_id, set())
        incoming_has_review_copy = (
            state == "incoming"
            and bool(states_for_id & REVIEWED_COPY_STATES)
        )

        if state == "incoming":
            if incoming_has_review_copy:
                incoming_with_review_copy.append(record)
            else:
                needs_review.append(record)
        if not incoming_has_review_copy and (
            decision == "needs-more-evidence" or record.get("status") == "unverified"
        ):
            needs_evidence.append(record)
        if state == "reviewed" and promotion_flag and decision == "accept-for-promotion":
            promotion_ready.append(record)
        elif state == "reviewed":
            reviewed_not_ready.append(record)

    duplicates = {
        record_id: sorted(states)
        for record_id, states in ids_by_state.items()
        if len(states) > 1
    }

    lines = [
        "# Feedback Promotion Backlog",
        "",
        f"Generated: {now_iso()}",
        "",
        "## Summary",
        "",
        f"- Records scanned: {len(records)}",
        f"- Invalid records: {len(invalid)}",
        f"- Incoming records needing review: {len(needs_review)}",
        f"- Incoming records with reviewed/rejected/promoted copies: {len(incoming_with_review_copy)}",
        f"- Promotion-ready reviewed records: {len(promotion_ready)}",
        f"- Records needing more evidence or unverified: {len(needs_evidence)}",
        f"- Duplicate ids across inbox states: {len(duplicates)}",
        "",
        "State counts:",
        "",
    ]

    if state_counts:
        for state in sorted(state_counts):
            lines.append(f"- `{state}`: {state_counts[state]}")
    else:
        lines.append("- none")

    lines.extend(["", "Status counts:", ""])
    if status_counts:
        for status in sorted(status_counts):
            lines.append(f"- `{status}`: {status_counts[status]}")
    else:
        lines.append("- none")

    lines.extend(["", "Domain counts:", ""])
    if domain_counts:
        for domain in sorted(domain_counts):
            lines.append(f"- `{domain}`: {domain_counts[domain]}")
    else:
        lines.append("- none")

    lines.extend(["", "## Promotion Ready", ""])
    if promotion_ready:
        for record in promotion_ready:
            review = record.get("review", {})
            target = review.get("target_reference", "") if isinstance(review, dict) else ""
            lines.append(f"- {record_label(record)}")
            lines.append(f"  - target: `{target}`")
            lines.append(f"  - path: `{record.get('_path')}`")
    else:
        lines.append("- none")

    lines.extend(["", "## Needs Maintainer Review", ""])
    if needs_review:
        for record in needs_review:
            proposed = record.get("proposed_skill_update", {})
            target = proposed.get("file", "") if isinstance(proposed, dict) else ""
            lines.append(f"- {record_label(record)}")
            lines.append(f"  - proposed target: `{target}`")
            lines.append(f"  - path: `{record.get('_path')}`")
    else:
        lines.append("- none")

    lines.extend(["", "## Incoming With Existing Review Copy", ""])
    if incoming_with_review_copy:
        for record in incoming_with_review_copy:
            record_id = str(record.get("id", ""))
            states = sorted(ids_by_state.get(record_id, []))
            lines.append(f"- {record_label(record)}")
            lines.append(f"  - states: {', '.join(states)}")
            lines.append(f"  - source path: `{record.get('_path')}`")
            for path in paths_by_id.get(record_id, []):
                if path != record.get("_path"):
                    lines.append(f"  - review copy: `{path}`")
    else:
        lines.append("- none")

    lines.extend(["", "## Needs More Evidence Or Verification", ""])
    if needs_evidence:
        for record in needs_evidence:
            lines.append(f"- {record_label(record)}")
            lines.append(f"  - path: `{record.get('_path')}`")
    else:
        lines.append("- none")

    lines.extend(["", "## Reviewed But Not Promotion Ready", ""])
    if reviewed_not_ready:
        for record in reviewed_not_ready:
            review = record.get("review", {})
            decision = review.get("decision", "") if isinstance(review, dict) else ""
            lines.append(f"- {record_label(record)}")
            lines.append(f"  - decision: `{decision}`")
            lines.append(f"  - path: `{record.get('_path')}`")
    else:
        lines.append("- none")

    lines.extend(["", "## Duplicate IDs Across Inbox States", ""])
    if duplicates:
        for record_id, states in sorted(duplicates.items()):
            lines.append(f"- `{record_id}` in states: {', '.join(states)}")
            for path in paths_by_id[record_id]:
                lines.append(f"  - `{path}`")
    else:
        lines.append("- none")

    lines.extend(["", "## Invalid Records", ""])
    if invalid:
        for record in invalid:
            lines.append(f"- `{record.get('_path')}`")
            for error in record.get("_errors", []):
                lines.append(f"  - {error}")
    else:
        lines.append("- none")

    lines.extend([
        "",
        "## Interpretation",
        "",
        "This backlog is a maintainer triage view. It does not prove that any submitted NWN claim is true.",
    ])

    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--out", default="docs/nwn-skill-pack/knowledge-inbox/promotion-backlog.md")
    args = parser.parse_args()

    output = generate(Path(args.root))
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(output, encoding="utf-8")
    print(out_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
