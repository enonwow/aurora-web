#!/usr/bin/env python3
"""Generate a maintainer status report for feedback intake and promotion."""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


FEEDBACK_STATE_DIRS = {
    "incoming": Path("knowledge-inbox/incoming"),
    "reviewed": Path("knowledge-inbox/reviewed"),
    "rejected": Path("knowledge-inbox/rejected"),
    "promoted": Path("knowledge-inbox/promoted"),
}
REFERENCE_PROMOTION_RECORDS = Path("knowledge-inbox/reference-promotions/records")


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def version_plan_value(root: Path, label: str, default: str = "unknown") -> str:
    path = root / "version-bump-plan.md"
    if not path.exists():
        return default
    text = path.read_text(encoding="utf-8")
    pattern = rf"^- {re.escape(label)}: `?([^`\n]+)`?$"
    match = re.search(pattern, text, flags=re.MULTILINE)
    return match.group(1).strip() if match else default


def load_feedback_records(root: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for state, rel_dir in FEEDBACK_STATE_DIRS.items():
        directory = root / rel_dir
        if not directory.is_dir():
            continue
        for path in sorted(directory.glob("*.json")):
            try:
                record = load_json(path)
            except Exception:
                continue
            record["_state"] = state
            record["_path"] = str(path.relative_to(root)).replace("\\", "/")
            records.append(record)
    return records


def load_reference_promotion_records(root: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    directory = root / REFERENCE_PROMOTION_RECORDS
    if not directory.is_dir():
        return records
    for path in sorted(directory.glob("*.json")):
        try:
            record = load_json(path)
        except Exception:
            continue
        record["_path"] = str(path.relative_to(root)).replace("\\", "/")
        records.append(record)
    return records


def reviewed_promotion_ready(record: dict[str, Any]) -> bool:
    review = record.get("review")
    return (
        isinstance(review, dict)
        and review.get("decision") == "accept-for-promotion"
        and review.get("promotion_ready") is True
    )


def by_id(records: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        grouped[str(record.get("id", ""))].append(record)
    return grouped


def generate(root: Path) -> str:
    feedback_records = load_feedback_records(root)
    promotion_records = load_reference_promotion_records(root)
    grouped = by_id(feedback_records)

    state_counts = Counter(str(record.get("_state", "unknown")) for record in feedback_records)
    status_counts = Counter(str(record.get("status", "unknown")) for record in feedback_records)
    domain_counts = Counter(str(record.get("domain", "unknown")) for record in feedback_records)
    source_counts = Counter(str(record.get("source_type", "unknown")) for record in feedback_records)
    reviewed_ready = [
        record for record in feedback_records
        if record.get("_state") == "reviewed" and reviewed_promotion_ready(record)
    ]
    incoming_needing_review = [
        record for record in feedback_records
        if record.get("_state") == "incoming"
        and len(grouped.get(str(record.get("id", "")), [])) == 1
    ]
    incoming_with_existing_review = [
        record for record in feedback_records
        if record.get("_state") == "incoming"
        and len(grouped.get(str(record.get("id", "")), [])) > 1
    ]
    accepted_promotions = [
        record for record in promotion_records
        if str(record.get("result", "")).startswith("accepted")
    ]

    semver_class = version_plan_value(root, "Proposed SemVer class", "UNKNOWN")
    next_version = version_plan_value(root, "Proposed next version", "unknown")

    lines = [
        "# NWN Skill Pack Feedback Intake Status",
        "",
        f"Generated: {now_iso()}",
        "",
        "## Summary",
        "",
        f"- Feedback records scanned: {len(feedback_records)}",
        f"- Incoming records needing maintainer review: {len(incoming_needing_review)}",
        f"- Incoming records with reviewed/rejected/promoted copies: {len(incoming_with_existing_review)}",
        f"- Promotion-ready reviewed records: {len(reviewed_ready)}",
        f"- Reference promotion records: {len(promotion_records)}",
        f"- Accepted reference promotion records: {len(accepted_promotions)}",
        f"- Proposed SemVer class: `{semver_class}`",
        f"- Proposed next version: `{next_version}`",
        "",
        "## Counts",
        "",
        "State counts:",
        "",
    ]

    for label, counter in [
        ("State counts", state_counts),
        ("Status counts", status_counts),
        ("Domain counts", domain_counts),
        ("Source type counts", source_counts),
    ]:
        if label != "State counts":
            lines.extend(["", f"{label}:", ""])
        if counter:
            for key in sorted(counter):
                lines.append(f"- `{key}`: {counter[key]}")
        else:
            lines.append("- none")

    lines.extend([
        "",
        "## Promotion Ready",
        "",
    ])
    if reviewed_ready:
        for record in reviewed_ready:
            lines.append(f"- `{record.get('id')}` {record.get('title')} -> `{record.get('_path')}`")
    else:
        lines.append("- none")

    lines.extend([
        "",
        "## Incoming Needing Review",
        "",
    ])
    if incoming_needing_review:
        for record in incoming_needing_review:
            lines.append(f"- `{record.get('id')}` {record.get('title')} -> `{record.get('_path')}`")
    else:
        lines.append("- none")

    lines.extend([
        "",
        "## Incoming With Existing Review Copy",
        "",
    ])
    if incoming_with_existing_review:
        for record in incoming_with_existing_review:
            siblings = grouped.get(str(record.get("id", "")), [])
            states = ", ".join(sorted(str(item.get("_state", "unknown")) for item in siblings))
            lines.append(f"- `{record.get('id')}` states: {states}")
            lines.append(f"  - incoming: `{record.get('_path')}`")
    else:
        lines.append("- none")

    lines.extend([
        "",
        "## Maintainer Next Actions",
        "",
        "1. Do not patch skill references from `incoming` records.",
        "2. Validate returned records with `tools/nwn_skill_feedback.py validate`.",
        "3. Review records with `tools/nwn_skill_feedback.py review` and set `promotion_ready=true` only when evidence is strong enough.",
        "4. For promotion-ready records, run `tools/generate_reference_promotion_proposal.py` before editing authoring and plugin-packaged references.",
        "5. After patching references, write a `tools/reference_promotion_record.py` record and regenerate `knowledge-inbox/reference-promotions/aggregate.md`.",
        "6. Regenerate `version-bump-plan.md`; do not bump while Proposed SemVer class remains `NONE`.",
        "7. Treat `model-suggestion`, `claude-opus-import`, and `codex-session` records as untrusted until reviewed against docs or runtime evidence.",
        "",
        "## Required Commands",
        "",
        "```powershell",
        "python docs\\nwn-skill-pack\\tools\\nwn_skill_feedback.py validate docs\\nwn-skill-pack\\knowledge-inbox\\incoming docs\\nwn-skill-pack\\knowledge-inbox\\reviewed docs\\nwn-skill-pack\\knowledge-inbox\\rejected",
        "python docs\\nwn-skill-pack\\tools\\generate_feedback_promotion_backlog.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\knowledge-inbox\\promotion-backlog.md",
        "python docs\\nwn-skill-pack\\tools\\reference_promotion_record.py aggregate docs\\nwn-skill-pack\\knowledge-inbox\\reference-promotions\\records --out docs\\nwn-skill-pack\\knowledge-inbox\\reference-promotions\\aggregate.md",
        "python docs\\nwn-skill-pack\\tools\\generate_version_bump_plan.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\version-bump-plan.md",
        "python docs\\nwn-skill-pack\\tools\\generate_feedback_intake_status.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\feedback-intake-status.md",
        "python docs\\nwn-skill-pack\\tools\\check_feedback_intake_status.py docs\\nwn-skill-pack",
        "```",
        "",
        "## Does Not Prove",
        "",
        "This status report does not prove any submitted NWN claim, privacy safety, reference correctness, install behavior, fresh Codex answer quality, or NWN runtime behavior. It only summarizes current intake and promotion state.",
    ])

    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--out", default="docs/nwn-skill-pack/feedback-intake-status.md")
    args = parser.parse_args()

    output = generate(Path(args.root))
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(output, encoding="utf-8")
    print(out_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
