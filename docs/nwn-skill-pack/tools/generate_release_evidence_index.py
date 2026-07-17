#!/usr/bin/env python3
"""Generate a release evidence index for the NWN skill pack."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


RECORD_DIR = Path("forward-tests/records")
REVIEW_OUTCOME_RECORD_DIR = Path("knowledge-inbox/aurora-live-review-outcomes/records")
PROMOTION_PROOF_GATES = Path("aurora-live-promotion-proof-gates.md")
GATE_TARGETS = ["repo-artifact", "release-candidate", "install-candidate"]


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def load_records(root: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    record_dir = root / RECORD_DIR
    if not record_dir.is_dir():
        return records
    for path in sorted(record_dir.glob("*.json")):
        try:
            record = load_json(path)
        except Exception:
            continue
        record["_path"] = str(path.relative_to(root)).replace("\\", "/")
        records.append(record)
    return records


def load_json_records(root: Path, record_dir: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    path = root / record_dir
    if not path.is_dir():
        return records
    for record_path in sorted(path.glob("*.json")):
        try:
            record = load_json(record_path)
        except Exception:
            continue
        record["_path"] = str(record_path.relative_to(root)).replace("\\", "/")
        records.append(record)
    return records


def load_release_gate(root: Path):
    tool_path = root / "tools" / "check_release_gate.py"
    if not tool_path.exists():
        raise FileNotFoundError(f"release gate checker is missing: {tool_path}")
    spec = importlib.util.spec_from_file_location("check_release_gate", tool_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not import release gate checker: {tool_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    if not hasattr(module, "evaluate"):
        raise RuntimeError("release gate checker does not expose evaluate(root, target)")
    return module.evaluate


def count_by(records: list[dict[str, Any]], field_name: str) -> Counter[str]:
    counts: Counter[str] = Counter()
    for record in records:
        counts[str(record.get(field_name, "unknown"))] += 1
    return counts


def labels(record: dict[str, Any]) -> str:
    value = record.get("evidence_labels", [])
    if not isinstance(value, list) or not value:
        return "none"
    return ", ".join(f"`{item}`" for item in value)


def compact(value: str, fallback: str = "none") -> str:
    value = value.replace("\n", " ").strip()
    return value if value else fallback


def table_cell(value: str) -> str:
    return compact(value).replace("|", "\\|")


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.exists() else ""


def markdown_value(label: str, text: str, default: str = "unknown") -> str:
    for line in text.splitlines():
        if not line.startswith(f"- {label}:"):
            continue
        value = line.split(":", 1)[1].strip()
        if value.startswith("`") and value.endswith("`"):
            value = value[1:-1]
        return value
    return default


def markdown_int(label: str, text: str) -> int:
    value = markdown_value(label, text, "0")
    try:
        return int(value)
    except ValueError:
        return 0


def proof_gate_rows(text: str) -> list[str]:
    rows: list[str] = []
    for line in text.splitlines():
        if not line.startswith("| `"):
            continue
        if any(
            gate in line
            for gate in [
                "source-retail-retest-pass-records",
                "promotion-bridge-candidates",
                "maintainer-promotion-decision",
                "reference-patch-and-release-sync",
                "release-candidate-gate",
            ]
        ):
            rows.append(line)
    return rows


def list_count(record: dict[str, Any], field_name: str) -> int:
    value = record.get(field_name, [])
    return len(value) if isinstance(value, list) else 0


def generate(root: Path) -> str:
    manifest = load_json(root / "version-manifest.json")
    records = load_records(root)
    review_outcome_records = load_json_records(root, REVIEW_OUTCOME_RECORD_DIR)
    proof_gates_text = read_text(root / PROMOTION_PROOF_GATES)
    evaluate_gate = load_release_gate(root)
    gates = {target: evaluate_gate(root, target) for target in GATE_TARGETS}

    type_counts = count_by(records, "record_type")
    result_counts = count_by(records, "result")
    prompt_records = [record for record in records if record.get("record_type") == "prompt-forward-test"]
    install_records = [record for record in records if record.get("record_type") == "install-smoke-test"]
    static_records = [record for record in records if record.get("record_type") == "static-check"]
    review_outcome_counts = count_by(review_outcome_records, "outcome")

    lines = [
        "# NWN Skill Pack Release Evidence Index",
        "",
        f"Generated: {now_iso()}",
        "",
        "## Package",
        "",
        f"- Package: `{manifest.get('package_name', '')}`",
        f"- Version: `{manifest.get('version', '')}`",
        f"- State: `{manifest.get('package_state', '')}`",
        f"- Skill: `{manifest.get('skill_name', '')}`",
        "",
        "## Evidence Meaning",
        "",
        "- `static-check`: machine check over files in this repository; proves package shape or freshness only.",
        "- `install-smoke-test`: fresh Codex install/invocation evidence; proves discovery or trigger behavior only.",
        "- `prompt-forward-test`: independent task run using the skill; proves behavior for that prompt only.",
        "- `runtime-tested`: NWN Toolset, server, client, logs, or module runtime evidence; not implied by static package checks.",
        "- Aurora live review outcome records become gate evidence only after `check_release_gate.py` runs `aurora_live_review_outcome_record.py` contextual validation; local `live_record_path` records cannot accept the Minimum First Live Pass until every required atom has returned evidence or an exact blocker.",
        "- The `Aurora Live Review Outcomes` table below surfaces `blocked_atoms`, `held_atoms`, and `next_actions` so release blockers can be traced back to the maintainer review record.",
        "- Local Aurora reverse/thread leads from `local-aurora-reverse-ingestion.md`, `local-thread-019ed62e-aurora-ui-gallery-intake.md`, and `local-aurora-live-gap-queue.md` are release-routing evidence only; they must remain `local-reverse-lead` material until a reviewed Aurora live record or exact blocker routes them through `maintainer-decision-index.md`.",
        "- Aurora live promotion proof-gates are control evidence only: they summarize retest, bridge, maintainer decision, reference patch, and release-gate blockers but do not prove runtime behavior or automatic skill improvement.",
        "",
        "## Record Counts",
        "",
        f"- Total records: {len(records)}",
        f"- Static checks: {len(static_records)}",
        f"- Prompt forward tests: {len(prompt_records)}",
        f"- Install smoke tests: {len(install_records)}",
        "",
        "Record types:",
        "",
    ]

    if type_counts:
        for key in sorted(type_counts):
            lines.append(f"- `{key}`: {type_counts[key]}")
    else:
        lines.append("- none")

    lines.extend(["", "Results:", ""])
    if result_counts:
        for key in sorted(result_counts):
            lines.append(f"- `{key}`: {result_counts[key]}")
    else:
        lines.append("- none")

    lines.extend([
        "",
        "## Gate Snapshot",
        "",
        "| Target | Status | Checks | Warnings | Blockers |",
        "| --- | --- | ---: | ---: | ---: |",
    ])
    for target in GATE_TARGETS:
        gate = gates[target]
        status = "PASS" if not gate.blockers else "BLOCKED"
        lines.append(
            f"| `{target}` | {status} | {len(gate.checks)} | "
            f"{len(gate.warnings)} | {len(gate.blockers)} |"
        )

    lines.extend([
        "",
        "## Gate Blocker Details",
        "",
        "| Target | Type | Detail |",
        "| --- | --- | --- |",
    ])
    gate_detail_count = 0
    for target in GATE_TARGETS:
        gate = gates[target]
        for warning in gate.warnings:
            gate_detail_count += 1
            lines.append(f"| `{target}` | warning | {table_cell(warning)} |")
        for blocker in gate.blockers:
            gate_detail_count += 1
            lines.append(f"| `{target}` | blocker | {table_cell(blocker)} |")
    if gate_detail_count == 0:
        lines.append("| all | none | no warnings or blockers reported by the gate snapshot |")

    proof_gate_status = "present" if proof_gates_text else "missing"
    lines.extend([
        "",
        "## Aurora Live Promotion Proof Gates",
        "",
        f"- Dashboard: `{PROMOTION_PROOF_GATES.as_posix()}`",
        f"- Dashboard status: `{proof_gate_status}`",
        f"- Valid pass retest records: {markdown_int('Valid pass retest records', proof_gates_text)}",
        f"- Bridge status: `{markdown_value('Bridge status', proof_gates_text)}`",
        f"- Accepted promotion decision records: {markdown_int('Accepted promotion decision records', proof_gates_text)}",
        f"- Release-ready accepted promotion records: {markdown_int('Release-ready accepted promotion records', proof_gates_text)}",
        f"- Release-candidate blockers: {markdown_int('Release-candidate blockers', proof_gates_text)}",
        "",
        "Proof-gates are control evidence, not runtime evidence. Keep skill-strengthening claims blocked until this dashboard shows real pass retest records, bridge candidates, maintainer decisions, reference patch/release sync, and release-candidate gate clearance.",
        "",
        "| Gate | Status | Evidence | Next action |",
        "| --- | --- | --- | --- |",
    ])
    rows = proof_gate_rows(proof_gates_text)
    if rows:
        lines.extend(rows)
    else:
        lines.append("| `missing-proof-gates-dashboard` | BLOCKED | no dashboard rows found | Regenerate `aurora-live-promotion-proof-gates.md`. |")

    lines.extend([
        "",
        "## Aurora Live Review Outcomes",
        "",
        f"- Source directory: `{REVIEW_OUTCOME_RECORD_DIR.as_posix()}`",
        f"- Records: {len(review_outcome_records)}",
        "",
        "Outcome counts:",
        "",
    ])
    if review_outcome_counts:
        for outcome in sorted(review_outcome_counts):
            lines.append(f"- `{outcome}`: {review_outcome_counts[outcome]}")
    else:
        lines.append("- none")

    lines.extend([
        "",
        "| Record | Outcome | Live Record | Accepted | Held | Blocked | Next Actions | Promotion | Artifact |",
        "| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- |",
    ])
    if review_outcome_records:
        for record in review_outcome_records:
            lines.append(
                f"| `{table_cell(str(record.get('id', '')))}` "
                f"| `{table_cell(str(record.get('outcome', 'unknown')))}` "
                f"| `{table_cell(str(record.get('live_record_id', '')))}` "
                f"| {list_count(record, 'accepted_atoms')} "
                f"| {list_count(record, 'held_atoms')} "
                f"| {list_count(record, 'blocked_atoms')} "
                f"| {list_count(record, 'next_actions')} "
                f"| `{table_cell(str(record.get('promotion_proposal_path', '')))}` "
                f"| `{table_cell(str(record.get('_path', '')))}` |"
            )
    else:
        lines.append("| none | none | none | 0 | 0 | 0 | 0 | none | none |")

    lines.extend([
        "",
        "## Aurora Live Review Outcome Details",
        "",
        "| Record | Field | Detail |",
        "| --- | --- | --- |",
    ])
    detail_count = 0
    for record in review_outcome_records:
        record_id = table_cell(str(record.get("id", "")))
        for field_name in ["held_atoms", "blocked_atoms", "next_actions"]:
            value = record.get(field_name, [])
            if not isinstance(value, list):
                continue
            for item in value:
                detail_count += 1
                lines.append(
                    f"| `{record_id}` | `{field_name}` | {table_cell(str(item))} |"
                )
    if detail_count == 0:
        lines.append("| none | none | no held atoms, blocked atoms, or next actions recorded |")

    lines.extend([
        "",
        "## Evidence Records",
        "",
        "| Test | Type | Result | Labels | Proof Scope | Missing Evidence | Artifact |",
        "| --- | --- | --- | --- | --- | --- | --- |",
    ])
    if records:
        for record in records:
            evidence = record.get("evidence", [])
            missing = record.get("missing_evidence", [])
            proof_scope = evidence[0] if isinstance(evidence, list) and evidence else ""
            missing_scope = missing[0] if isinstance(missing, list) and missing else ""
            lines.append(
                f"| `{table_cell(str(record.get('test_id', '')))}: "
                f"{table_cell(str(record.get('title', '')))}` "
                f"| `{table_cell(str(record.get('record_type', 'unknown')))}` "
                f"| `{table_cell(str(record.get('result', 'unknown')))}` "
                f"| {labels(record)} "
                f"| {table_cell(proof_scope)} "
                f"| {table_cell(missing_scope)} "
                f"| `{table_cell(str(record.get('_path', '')))}` |"
            )
    else:
        lines.append("| none | none | none | none | none | none | none |")

    lines.extend([
        "",
        "## Current Gaps",
        "",
    ])
    release_candidate = gates["release-candidate"]
    if release_candidate.blockers:
        for blocker in release_candidate.blockers:
            lines.append(f"- {blocker}")
    else:
        lines.append("- release-candidate gate currently has no blockers")

    lines.extend([
        "",
        "## Interpretation",
        "",
        "This index is release evidence bookkeeping. It does not prove NWN runtime correctness, public plugin availability, or quality of future model answers.",
    ])

    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--out", default="docs/nwn-skill-pack/release-evidence-index.md")
    args = parser.parse_args()

    output = generate(Path(args.root))
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(output, encoding="utf-8")
    print(out_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
