#!/usr/bin/env python3
"""Validate and aggregate Aurora Toolset live-operator records."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any


ATOMS = [
    "area.createWithWizard",
    "area.editProperties",
    "palette.switchBlueprintSource",
    "palette.selectObjectFamilyByIcon",
    "placeable.editBlueprintOrInstance",
    "inventory.insertItem",
    "item.editBlueprint",
    "creature.editBlueprintOrInstance",
    "door.editBlueprintOrInstance",
    "door.linkAreaTransition",
    "trigger.editBlueprintOrInstance",
    "sound.editPlacedSound",
    "conversation.editAndTest",
    "script.createEditSearch",
    "module.configureEventsAndEntry",
    "customContent.verify2daHakTlkLoad",
    "toolset.buildAndClientRun",
]
ALLOWED_STATUSES = {
    "not-run",
    "observed-toolset",
    "static-checked",
    "compiled",
    "runtime-tested",
    "blocked",
    "rejected",
}
ALLOWED_EVIDENCE_LABELS = {
    "local-reverse-lead",
    "toolset-observed",
    "static-checked",
    "compiled",
    "runtime-tested",
    "rejected",
}
ALLOWED_RESULTS = {"not-run", "partial", "pass", "blocked", "rejected"}
REQUIRED_FIELDS = [
    "schema_version",
    "id",
    "created_at",
    "checklist_path",
    "operator",
    "environment",
    "atoms",
    "overall_result",
    "promotion",
]
REQUIRED_ENV_FIELDS = [
    "toolset_version",
    "nwn_version",
    "module_path_or_copy_id",
    "hak_list",
    "custom_tlk",
    "screenshots_folder",
    "log_folder",
]
REQUIRED_ATOM_FIELDS = [
    "atom",
    "status",
    "evidence_label",
    "observations",
    "artifacts",
    "blockers",
    "promotion_ready",
]
REQUIRED_PROMOTION_FIELDS = [
    "candidate_references",
    "requires_reference_promotion_proposal",
    "notes",
]


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def validate_string_list(value: Any, field: str, errors: list[str]) -> None:
    if not isinstance(value, list):
        errors.append(f"{field} must be a list")
    elif not all(isinstance(item, str) for item in value):
        errors.append(f"{field} must contain only strings")


def validate_record(data: dict[str, Any]) -> list[str]:
    errors: list[str] = []

    for field in REQUIRED_FIELDS:
        if field not in data:
            errors.append(f"missing required field: {field}")

    if data.get("schema_version") != "1":
        errors.append("schema_version must be '1'")

    for field in ["id", "created_at", "checklist_path"]:
        if field in data and not str(data.get(field, "")).strip():
            errors.append(f"{field} must be a non-empty string")

    environment = data.get("environment")
    if not isinstance(environment, dict):
        errors.append("environment must be an object")
        environment = {}
    for field in REQUIRED_ENV_FIELDS:
        if field not in environment:
            errors.append(f"environment.{field} is required")
    validate_string_list(environment.get("hak_list", []), "environment.hak_list", errors)

    atoms = data.get("atoms")
    if not isinstance(atoms, list):
        errors.append("atoms must be a list")
        atoms = []

    seen_atoms: list[str] = []
    status_counts: Counter[str] = Counter()
    for index, atom_record in enumerate(atoms):
        prefix = f"atoms[{index}]"
        if not isinstance(atom_record, dict):
            errors.append(f"{prefix} must be an object")
            continue
        for field in REQUIRED_ATOM_FIELDS:
            if field not in atom_record:
                errors.append(f"{prefix}.{field} is required")
        atom = atom_record.get("atom")
        status = atom_record.get("status")
        evidence_label = atom_record.get("evidence_label")
        if atom not in ATOMS:
            errors.append(f"{prefix}.atom must be one of known atoms")
        else:
            seen_atoms.append(atom)
        if status not in ALLOWED_STATUSES:
            errors.append(f"{prefix}.status must be one of: {', '.join(sorted(ALLOWED_STATUSES))}")
        else:
            status_counts[str(status)] += 1
        if evidence_label not in ALLOWED_EVIDENCE_LABELS:
            errors.append(
                f"{prefix}.evidence_label must be one of: {', '.join(sorted(ALLOWED_EVIDENCE_LABELS))}"
            )
        for field in ["observations", "artifacts", "blockers"]:
            validate_string_list(atom_record.get(field, []), f"{prefix}.{field}", errors)
        if "promotion_ready" in atom_record and not isinstance(atom_record["promotion_ready"], bool):
            errors.append(f"{prefix}.promotion_ready must be boolean")

        if status in {"observed-toolset", "static-checked", "compiled", "runtime-tested"}:
            if not atom_record.get("observations"):
                errors.append(f"{prefix}.observations is required for status={status}")
            if not atom_record.get("artifacts"):
                errors.append(f"{prefix}.artifacts is required for status={status}")
        if status == "runtime-tested" and evidence_label != "runtime-tested":
            errors.append(f"{prefix}.runtime-tested status requires evidence_label=runtime-tested")
        if status == "compiled" and evidence_label not in {"compiled", "runtime-tested"}:
            errors.append(f"{prefix}.compiled status requires compiled or runtime-tested evidence label")
        if status == "blocked" and not atom_record.get("blockers"):
            errors.append(f"{prefix}.blockers is required for status=blocked")
        if status == "rejected" and evidence_label != "rejected":
            errors.append(f"{prefix}.rejected status requires evidence_label=rejected")
        if atom_record.get("promotion_ready") is True:
            if status not in {"observed-toolset", "static-checked", "compiled", "runtime-tested"}:
                errors.append(f"{prefix}.promotion_ready requires positive observed/checked status")
            if not atom_record.get("observations") or not atom_record.get("artifacts"):
                errors.append(f"{prefix}.promotion_ready requires observations and artifacts")

    missing_atoms = sorted(set(ATOMS) - set(seen_atoms))
    extra_duplicates = sorted(atom for atom, count in Counter(seen_atoms).items() if count > 1)
    if missing_atoms:
        errors.append(f"atoms missing required atom records: {', '.join(missing_atoms)}")
    if extra_duplicates:
        errors.append(f"atoms contains duplicate atom records: {', '.join(extra_duplicates)}")

    overall_result = data.get("overall_result")
    if overall_result not in ALLOWED_RESULTS:
        errors.append(f"overall_result must be one of: {', '.join(sorted(ALLOWED_RESULTS))}")
    if overall_result == "pass":
        if status_counts["runtime-tested"] < 1:
            errors.append("overall_result=pass requires at least one runtime-tested atom")
        if status_counts["blocked"] or status_counts["rejected"] or status_counts["not-run"]:
            errors.append("overall_result=pass cannot include blocked, rejected, or not-run atoms")
    if overall_result == "blocked" and not status_counts["blocked"]:
        errors.append("overall_result=blocked requires at least one blocked atom")
    if overall_result == "rejected" and not status_counts["rejected"]:
        errors.append("overall_result=rejected requires at least one rejected atom")

    promotion = data.get("promotion")
    if not isinstance(promotion, dict):
        errors.append("promotion must be an object")
        promotion = {}
    for field in REQUIRED_PROMOTION_FIELDS:
        if field not in promotion:
            errors.append(f"promotion.{field} is required")
    validate_string_list(promotion.get("candidate_references", []), "promotion.candidate_references", errors)
    if "requires_reference_promotion_proposal" in promotion and not isinstance(
        promotion["requires_reference_promotion_proposal"], bool
    ):
        errors.append("promotion.requires_reference_promotion_proposal must be boolean")

    promotion_ready_count = sum(
        1 for atom_record in atoms if isinstance(atom_record, dict) and atom_record.get("promotion_ready") is True
    )
    if promotion_ready_count and not promotion.get("requires_reference_promotion_proposal"):
        errors.append("promotion-ready atoms require promotion.requires_reference_promotion_proposal=true")
    if promotion_ready_count and not promotion.get("candidate_references"):
        errors.append("promotion-ready atoms require promotion.candidate_references")

    return errors


def iter_record_paths(paths: list[str]) -> list[Path]:
    resolved: list[Path] = []
    for raw_path in paths:
        path = Path(raw_path)
        if path.is_dir():
            resolved.extend(sorted(path.glob("*.json")))
        else:
            resolved.append(path)
    return resolved


def command_validate(args: argparse.Namespace) -> int:
    ok = True
    for path in iter_record_paths(args.paths):
        try:
            data = load_json(path)
        except Exception as exc:
            print(f"ERROR {path}: {exc}", file=sys.stderr)
            ok = False
            continue
        errors = validate_record(data)
        if errors:
            ok = False
            print(f"ERROR {path}:")
            for error in errors:
                print(f"  - {error}")
        else:
            print(f"OK {path}")
    return 0 if ok else 1


def command_aggregate(args: argparse.Namespace) -> int:
    records: list[dict[str, Any]] = []
    invalid: list[str] = []
    for path in iter_record_paths(args.paths):
        try:
            data = load_json(path)
        except Exception as exc:
            invalid.append(f"{path}: {exc}")
            continue
        errors = validate_record(data)
        if errors:
            invalid.append(f"{path}: {'; '.join(errors)}")
        else:
            records.append(data)

    result_counts = Counter(str(record.get("overall_result")) for record in records)
    atom_status_counts: Counter[str] = Counter()
    promotion_ready_atoms: Counter[str] = Counter()
    for record in records:
        for atom_record in record.get("atoms", []):
            if not isinstance(atom_record, dict):
                continue
            atom_status_counts[str(atom_record.get("status"))] += 1
            if atom_record.get("promotion_ready") is True:
                promotion_ready_atoms[str(atom_record.get("atom"))] += 1

    lines = [
        "# Aurora Toolset Live Operator Aggregate",
        "",
        f"Valid records: `{len(records)}`",
        f"Invalid records: `{len(invalid)}`",
        "",
        "## Overall Results",
        "",
    ]
    for result, count in sorted(result_counts.items()):
        lines.append(f"- `{result}`: `{count}`")
    lines.extend(["", "## Atom Status Counts", ""])
    for status, count in sorted(atom_status_counts.items()):
        lines.append(f"- `{status}`: `{count}`")
    lines.extend(["", "## Promotion-Ready Atoms", ""])
    if promotion_ready_atoms:
        for atom, count in sorted(promotion_ready_atoms.items()):
            lines.append(f"- `{atom}`: `{count}`")
    else:
        lines.append("- None.")
    if invalid:
        lines.extend(["", "## Invalid Records", ""])
        for item in invalid:
            lines.append(f"- {item}")

    if args.out:
        Path(args.out).write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"Wrote {args.out}")
    else:
        print("\n".join(lines))
    return 0 if not invalid else 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    validate = subparsers.add_parser("validate", help="Validate one or more live-operator records")
    validate.add_argument("paths", nargs="+", help="Record JSON file(s) or directories")
    validate.set_defaults(func=command_validate)

    aggregate = subparsers.add_parser("aggregate", help="Aggregate valid live-operator records")
    aggregate.add_argument("paths", nargs="+", help="Record JSON file(s) or directories")
    aggregate.add_argument("--out", help="Optional Markdown output path")
    aggregate.set_defaults(func=command_aggregate)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
