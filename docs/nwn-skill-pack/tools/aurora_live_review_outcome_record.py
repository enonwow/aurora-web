#!/usr/bin/env python3
"""Validate and aggregate Aurora live-record maintainer review outcome records."""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ALLOWED_OUTCOMES = {"accept-for-proposal", "hold-for-retest", "reject", "not-run"}
STANDARD_ACCEPTED_CHECKS = [
    "check_aurora_live_records.py",
    "check_aurora_live_evidence_manifest.py",
    "check_aurora_live_intake_consistency.py",
    "check_aurora_live_visual_redaction_records.py",
]
MINIMUM_FIRST_PASS_CHECKLIST_TOKEN = "local-aurora-small-location-live-operator-checklist.md"
MINIMUM_FIRST_PASS_REQUIRED_ATOMS = [
    "area.createWithWizard",
    "palette.switchBlueprintSource",
    "palette.selectObjectFamilyByIcon",
    "placeable.editBlueprintOrInstance",
    "inventory.insertItem",
    "creature.editBlueprintOrInstance",
    "door.linkAreaTransition",
    "toolset.buildAndClientRun",
]
REQUIRED_FIELDS = [
    "schema_version",
    "id",
    "created_at",
    "live_record_id",
    "live_record_path",
    "evidence_manifest_path",
    "reviewer",
    "outcome",
    "decision_summary",
    "promotion_proposal_path",
    "reference_promotion_allowed",
    "accepted_atoms",
    "held_atoms",
    "rejected_atoms",
    "blocked_atoms",
    "visual_redaction_record_ids",
    "checks_run",
    "checks_passed",
    "privacy_findings",
    "schema_expansion_candidates",
    "next_actions",
    "non_proof_boundaries",
    "notes",
]
LIST_FIELDS = [
    "accepted_atoms",
    "held_atoms",
    "rejected_atoms",
    "blocked_atoms",
    "visual_redaction_record_ids",
    "checks_run",
    "checks_passed",
    "privacy_findings",
    "schema_expansion_candidates",
    "next_actions",
    "non_proof_boundaries",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value[:64] or "review-outcome"


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def resolve_live_record_path(root: Path, live_record_path: str) -> Path:
    path = Path(live_record_path)
    if path.is_absolute() or path.exists():
        return path
    rooted = root / path
    if rooted.exists():
        return rooted
    return path


def validate_string_list(data: dict[str, Any], field: str, errors: list[str]) -> None:
    value = data.get(field, [])
    if not isinstance(value, list):
        errors.append(f"{field} must be a list")
    elif not all(isinstance(item, str) for item in value):
        errors.append(f"{field} must contain only strings")


def append_unique(values: list[str], additions: list[str]) -> list[str]:
    combined = list(values)
    for addition in additions:
        if addition not in combined:
            combined.append(addition)
    return combined


def default_manifest_path(live_record_id: str) -> str:
    suffix = live_record_id
    if suffix.startswith("aurora-live-"):
        suffix = suffix[len("aurora-live-"):]
    return f"knowledge-inbox/aurora-live-evidence-manifests/aurora-live-evidence-manifest-{suffix}.json"


def default_proposal_path(live_record_id: str) -> str:
    return f"knowledge-inbox/reference-promotion-proposals/{live_record_id}.md"


def default_visual_redaction_record_id(live_record_id: str) -> str:
    suffix = live_record_id
    if suffix.startswith("aurora-live-"):
        suffix = suffix[len("aurora-live-"):]
    return f"avr-{suffix}"


def atom_names_by_status(live_record: dict[str, Any], *statuses: str) -> list[str]:
    atoms: list[str] = []
    for atom_record in live_record.get("atoms", []):
        if not isinstance(atom_record, dict):
            continue
        atom = str(atom_record.get("atom", "")).strip()
        if atom and atom_record.get("status") in statuses:
            atoms.append(atom)
    return atoms


def promotion_ready_atom_names(live_record: dict[str, Any]) -> list[str]:
    atoms: list[str] = []
    for atom_record in live_record.get("atoms", []):
        if not isinstance(atom_record, dict):
            continue
        atom = str(atom_record.get("atom", "")).strip()
        if atom and atom_record.get("promotion_ready") is True:
            atoms.append(atom)
    return atoms


def requires_minimum_first_pass(live_record: dict[str, Any]) -> bool:
    checklist_path = str(live_record.get("checklist_path", "")).replace("\\", "/")
    return MINIMUM_FIRST_PASS_CHECKLIST_TOKEN in checklist_path


def incomplete_minimum_first_pass_atoms(live_record: dict[str, Any]) -> list[str]:
    atom_records: dict[str, dict[str, Any]] = {}
    for atom_record in live_record.get("atoms", []):
        if not isinstance(atom_record, dict):
            continue
        atom = str(atom_record.get("atom", "")).strip()
        if atom:
            atom_records[atom] = atom_record

    incomplete: list[str] = []
    for atom in MINIMUM_FIRST_PASS_REQUIRED_ATOMS:
        atom_record = atom_records.get(atom)
        if atom_record is None or atom_record.get("promotion_ready") is not True:
            incomplete.append(atom)
    return incomplete


def validate_record(data: dict[str, Any]) -> list[str]:
    errors: list[str] = []

    for field in REQUIRED_FIELDS:
        if field not in data:
            errors.append(f"missing required field: {field}")

    if data.get("schema_version") != "1":
        errors.append("schema_version must be '1'")

    for field in ["id", "live_record_id", "live_record_path", "evidence_manifest_path"]:
        if field in data and not str(data.get(field, "")).strip():
            errors.append(f"{field} must be a non-empty string")

    if data.get("outcome") not in ALLOWED_OUTCOMES:
        errors.append(f"outcome must be one of: {', '.join(sorted(ALLOWED_OUTCOMES))}")

    if "reference_promotion_allowed" in data and not isinstance(data.get("reference_promotion_allowed"), bool):
        errors.append("reference_promotion_allowed must be boolean")

    for field in LIST_FIELDS:
        validate_string_list(data, field, errors)

    outcome = data.get("outcome")
    checks_run = data.get("checks_run", [])
    checks_passed = data.get("checks_passed", [])
    if not isinstance(checks_run, list):
        checks_run = []
    if not isinstance(checks_passed, list):
        checks_passed = []

    if outcome == "accept-for-proposal":
        if not str(data.get("reviewer", "")).strip():
            errors.append("accept-for-proposal records require reviewer")
        if not str(data.get("decision_summary", "")).strip():
            errors.append("accept-for-proposal records require decision_summary")
        if not data.get("reference_promotion_allowed"):
            errors.append("accept-for-proposal records require reference_promotion_allowed=true")
        if not str(data.get("promotion_proposal_path", "")).strip():
            errors.append("accept-for-proposal records require promotion_proposal_path")
        if not data.get("accepted_atoms"):
            errors.append("accept-for-proposal records require accepted_atoms")
        if not data.get("visual_redaction_record_ids"):
            errors.append("accept-for-proposal records require visual_redaction_record_ids")
        if data.get("privacy_findings"):
            errors.append("accept-for-proposal records require empty privacy_findings")
        if not checks_run:
            errors.append("accept-for-proposal records require checks_run")
        if not checks_passed:
            errors.append("accept-for-proposal records require checks_passed")
        if set(str(item) for item in checks_run) - set(str(item) for item in checks_passed):
            errors.append("accept-for-proposal records require every check in checks_run to appear in checks_passed")
        if not data.get("non_proof_boundaries"):
            errors.append("accept-for-proposal records require non_proof_boundaries")

    if outcome == "hold-for-retest":
        if data.get("reference_promotion_allowed") is not False:
            errors.append("hold-for-retest records require reference_promotion_allowed=false")
        if data.get("accepted_atoms"):
            errors.append("hold-for-retest records require empty accepted_atoms")
        has_hold_reason = bool(data.get("held_atoms") or data.get("blocked_atoms") or data.get("next_actions"))
        if not has_hold_reason:
            errors.append("hold-for-retest records require held_atoms, blocked_atoms, or next_actions")
        if str(data.get("promotion_proposal_path", "")).strip():
            errors.append("hold-for-retest records must not set promotion_proposal_path")

    if outcome == "reject":
        if data.get("reference_promotion_allowed") is not False:
            errors.append("reject records require reference_promotion_allowed=false")
        if data.get("accepted_atoms"):
            errors.append("reject records require empty accepted_atoms")
        has_reject_reason = bool(
            data.get("rejected_atoms")
            or data.get("privacy_findings")
            or str(data.get("decision_summary", "")).strip()
        )
        if not has_reject_reason:
            errors.append("reject records require rejected_atoms, privacy_findings, or decision_summary")
        if str(data.get("promotion_proposal_path", "")).strip():
            errors.append("reject records must not set promotion_proposal_path")

    if outcome == "not-run":
        if data.get("reference_promotion_allowed") is not False:
            errors.append("not-run records require reference_promotion_allowed=false")
        if data.get("accepted_atoms"):
            errors.append("not-run records require empty accepted_atoms")
        if str(data.get("promotion_proposal_path", "")).strip():
            errors.append("not-run records must not set promotion_proposal_path")

    return errors


def validate_record_with_live_context(data: dict[str, Any], root: Path) -> list[str]:
    errors = validate_record(data)
    if data.get("outcome") != "accept-for-proposal":
        return errors

    live_record_label = str(data.get("live_record_path", "")).strip()
    if not live_record_label:
        return errors

    live_record_path = resolve_live_record_path(root, live_record_label)
    if not live_record_path.exists():
        return errors

    try:
        live_record = load_json(live_record_path)
    except Exception as exc:
        errors.append(f"live_record_path could not be read for contextual validation: {exc}")
        return errors

    if requires_minimum_first_pass(live_record):
        incomplete_atoms = incomplete_minimum_first_pass_atoms(live_record)
        if incomplete_atoms:
            errors.append(
                "Minimum First Live Pass incomplete for accept-for-proposal: "
                + ", ".join(incomplete_atoms)
                + ". Use hold-for-retest until these atoms are promotion_ready."
            )
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
    paths = iter_record_paths(args.paths)
    root = Path(args.root)
    ok = True
    if not paths:
        print("no Aurora live review outcome records found")
    for path in paths:
        try:
            errors = validate_record_with_live_context(load_json(path), root)
        except Exception as exc:
            errors = [str(exc)]
        if errors:
            ok = False
            print(f"{path}: INVALID")
            for error in errors:
                print(f"  - {error}")
        else:
            print(f"{path}: OK")
    return 0 if ok else 1


def command_new(args: argparse.Namespace) -> int:
    output_dir = Path(args.out)
    output_dir.mkdir(parents=True, exist_ok=True)
    record_id = args.id or f"alro-{slugify(args.live_record_id)}"
    non_proof_boundaries = args.non_proof_boundary or [
        "Review outcome records do not prove Aurora Toolset behavior or NWN runtime behavior."
    ]
    record = {
        "schema_version": "1",
        "id": record_id,
        "created_at": now_iso(),
        "live_record_id": args.live_record_id,
        "live_record_path": args.live_record_path,
        "evidence_manifest_path": args.evidence_manifest_path,
        "reviewer": args.reviewer,
        "outcome": args.outcome,
        "decision_summary": args.decision_summary,
        "promotion_proposal_path": args.promotion_proposal_path,
        "reference_promotion_allowed": args.reference_promotion_allowed,
        "accepted_atoms": args.accepted_atom,
        "held_atoms": args.held_atom,
        "rejected_atoms": args.rejected_atom,
        "blocked_atoms": args.blocked_atom,
        "visual_redaction_record_ids": args.visual_redaction_record_id,
        "checks_run": args.check_run,
        "checks_passed": args.check_passed,
        "privacy_findings": args.privacy_finding,
        "schema_expansion_candidates": args.schema_expansion_candidate,
        "next_actions": args.next_action,
        "non_proof_boundaries": non_proof_boundaries,
        "notes": args.notes,
    }
    errors = validate_record_with_live_context(record, Path(args.root))
    if errors:
        for error in errors:
            print(f"[ERROR] {error}", file=sys.stderr)
        return 1
    path = output_dir / f"{record_id}.json"
    path.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(path)
    return 0


def command_from_live_record(args: argparse.Namespace) -> int:
    live_record_path = Path(args.live_record)
    try:
        live_record = load_json(live_record_path)
    except Exception as exc:
        print(f"[ERROR] could not read live record: {exc}", file=sys.stderr)
        return 1

    live_record_id = str(live_record.get("id", "")).strip()
    if not live_record_id:
        print("[ERROR] live record must contain a non-empty id", file=sys.stderr)
        return 1
    if args.accepted_standard_checks and args.outcome != "accept-for-proposal":
        print("[ERROR] --accepted-standard-checks is only valid with --outcome accept-for-proposal", file=sys.stderr)
        return 1
    if args.outcome == "accept-for-proposal" and requires_minimum_first_pass(live_record):
        incomplete_atoms = incomplete_minimum_first_pass_atoms(live_record)
        if incomplete_atoms:
            print(
                "[ERROR] Minimum First Live Pass incomplete for accept-for-proposal: "
                + ", ".join(incomplete_atoms)
                + ". Use hold-for-retest until these atoms are promotion_ready.",
                file=sys.stderr,
            )
            return 1

    accepted_atoms = args.accepted_atom
    if args.outcome == "accept-for-proposal" and not accepted_atoms:
        accepted_atoms = promotion_ready_atom_names(live_record)
    held_atoms = args.held_atom or atom_names_by_status(live_record, "blocked")
    rejected_atoms = args.rejected_atom or atom_names_by_status(live_record, "rejected")
    visual_record_ids = args.visual_redaction_record_id
    if args.outcome == "accept-for-proposal" and not visual_record_ids:
        visual_record_ids = [default_visual_redaction_record_id(live_record_id)]

    record_id = args.id or f"alro-{slugify(live_record_id)}"
    non_proof_boundaries = args.non_proof_boundary or [
        "Review outcome records do not prove Aurora Toolset behavior or NWN runtime behavior."
    ]
    promotion_proposal_path = args.promotion_proposal_path
    if args.outcome == "accept-for-proposal" and not promotion_proposal_path:
        promotion_proposal_path = default_proposal_path(live_record_id)
    evidence_manifest_path = args.evidence_manifest_path or default_manifest_path(live_record_id)
    decision_summary = args.decision_summary
    if not decision_summary:
        decision_summary = f"Maintainer recorded {args.outcome} for {live_record_id}."
    checks_run = args.check_run
    checks_passed = args.check_passed
    if args.accepted_standard_checks:
        checks_run = append_unique(checks_run, STANDARD_ACCEPTED_CHECKS)
        checks_passed = append_unique(checks_passed, STANDARD_ACCEPTED_CHECKS)

    record = {
        "schema_version": "1",
        "id": record_id,
        "created_at": now_iso(),
        "live_record_id": live_record_id,
        "live_record_path": str(live_record_path).replace("\\", "/"),
        "evidence_manifest_path": evidence_manifest_path,
        "reviewer": args.reviewer,
        "outcome": args.outcome,
        "decision_summary": decision_summary,
        "promotion_proposal_path": promotion_proposal_path,
        "reference_promotion_allowed": args.reference_promotion_allowed,
        "accepted_atoms": accepted_atoms,
        "held_atoms": held_atoms,
        "rejected_atoms": rejected_atoms,
        "blocked_atoms": args.blocked_atom,
        "visual_redaction_record_ids": visual_record_ids,
        "checks_run": checks_run,
        "checks_passed": checks_passed,
        "privacy_findings": args.privacy_finding,
        "schema_expansion_candidates": args.schema_expansion_candidate,
        "next_actions": args.next_action,
        "non_proof_boundaries": non_proof_boundaries,
        "notes": args.notes,
    }
    errors = validate_record(record)
    if errors:
        for error in errors:
            print(f"[ERROR] {error}", file=sys.stderr)
        return 1
    if args.dry_run:
        print(json.dumps(record, indent=2, ensure_ascii=False))
        return 0
    output_dir = Path(args.out)
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / f"{record_id}.json"
    path.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(path)
    return 0


def command_aggregate(args: argparse.Namespace) -> int:
    input_dir = Path(args.input)
    root = Path(args.root)
    records: list[dict[str, Any]] = []
    invalid: list[tuple[Path, list[str]]] = []
    for path in sorted(input_dir.glob("*.json")):
        try:
            data = load_json(path)
            errors = validate_record_with_live_context(data, root)
        except Exception as exc:
            data = {}
            errors = [str(exc)]
        if errors:
            invalid.append((path, errors))
            if not args.include_invalid:
                continue
        data["_path"] = str(path)
        records.append(data)

    counts = Counter(str(record.get("outcome", "unknown")) for record in records)
    lines = [
        "# Aurora Live Review Outcome Records Aggregate",
        "",
        f"Generated: {now_iso()}",
        f"Input: `{input_dir}`",
        f"Records: {len(records)}",
        f"Invalid records: {len(invalid)}",
        "",
        "## Outcome Counts",
        "",
    ]
    for outcome in sorted(ALLOWED_OUTCOMES):
        lines.append(f"- `{outcome}`: {counts[outcome]}")
    lines.extend(["", "## Records", ""])
    if records:
        for record in records:
            lines.append(f"- `{record.get('outcome')}` **{record.get('id')}**")
            lines.append(f"  - live record: `{record.get('live_record_id')}`")
            lines.append(f"  - proposal: `{record.get('promotion_proposal_path')}`")
            lines.append(f"  - reference promotion allowed: `{record.get('reference_promotion_allowed')}`")
            lines.append(f"  - accepted atoms: `{len(record.get('accepted_atoms', []))}`")
            lines.append(f"  - held atoms: `{len(record.get('held_atoms', []))}`")
            lines.append(f"  - rejected atoms: `{len(record.get('rejected_atoms', []))}`")
            blocked_atoms = record.get("blocked_atoms", [])
            if not isinstance(blocked_atoms, list):
                blocked_atoms = []
            lines.append(f"  - blocked atoms: `{len(blocked_atoms)}`")
            for atom in blocked_atoms[:3]:
                lines.append(f"    - {atom}")
            if len(blocked_atoms) > 3:
                lines.append(f"    - ... {len(blocked_atoms) - 3} more")
            lines.append(f"  - privacy findings: `{len(record.get('privacy_findings', []))}`")
            next_actions = record.get("next_actions", [])
            if not isinstance(next_actions, list):
                next_actions = []
            lines.append(f"  - next actions: `{len(next_actions)}`")
            for action in next_actions[:3]:
                lines.append(f"    - {action}")
            if len(next_actions) > 3:
                lines.append(f"    - ... {len(next_actions) - 3} more")
            lines.append(f"  - file: `{record.get('_path')}`")
            lines.append("")
    else:
        lines.append("- none")
        lines.append("")
    lines.extend(["## Invalid Records", ""])
    if invalid:
        for path, errors in invalid:
            lines.append(f"- `{path}`")
            for error in errors:
                lines.append(f"  - {error}")
    else:
        lines.append("- none")
    lines.extend([
        "",
        "## Interpretation",
        "",
        "Aurora live review outcome records prove maintainer process only. They do not prove Aurora Toolset behavior, NWN runtime behavior, privacy by themselves, reference patch acceptance, release readiness, or fresh Codex answer improvement.",
        "",
    ])

    output = Path(args.out)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\n".join(lines), encoding="utf-8")
    print(output)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    new_parser = subparsers.add_parser("new", help="create an Aurora live review outcome record")
    new_parser.add_argument("--out", default="docs/nwn-skill-pack/knowledge-inbox/aurora-live-review-outcomes/records")
    new_parser.add_argument("--id", default="")
    new_parser.add_argument("--live-record-id", required=True)
    new_parser.add_argument("--live-record-path", required=True)
    new_parser.add_argument("--evidence-manifest-path", required=True)
    new_parser.add_argument("--reviewer", default="")
    new_parser.add_argument("--outcome", required=True, choices=sorted(ALLOWED_OUTCOMES))
    new_parser.add_argument("--decision-summary", default="")
    new_parser.add_argument("--promotion-proposal-path", default="")
    new_parser.add_argument("--reference-promotion-allowed", action="store_true")
    new_parser.add_argument("--accepted-atom", action="append", default=[])
    new_parser.add_argument("--held-atom", action="append", default=[])
    new_parser.add_argument("--rejected-atom", action="append", default=[])
    new_parser.add_argument("--blocked-atom", action="append", default=[])
    new_parser.add_argument("--visual-redaction-record-id", action="append", default=[])
    new_parser.add_argument("--check-run", action="append", default=[])
    new_parser.add_argument("--check-passed", action="append", default=[])
    new_parser.add_argument("--privacy-finding", action="append", default=[])
    new_parser.add_argument("--schema-expansion-candidate", action="append", default=[])
    new_parser.add_argument("--next-action", action="append", default=[])
    new_parser.add_argument("--non-proof-boundary", action="append", default=[])
    new_parser.add_argument("--notes", default="")
    new_parser.add_argument("--root", default="docs/nwn-skill-pack")
    new_parser.set_defaults(func=command_new)

    from_parser = subparsers.add_parser(
        "from-live-record",
        help="create an Aurora live review outcome record from a live record JSON",
    )
    from_parser.add_argument("live_record")
    from_parser.add_argument("--out", default="docs/nwn-skill-pack/knowledge-inbox/aurora-live-review-outcomes/records")
    from_parser.add_argument("--id", default="")
    from_parser.add_argument("--evidence-manifest-path", default="")
    from_parser.add_argument("--reviewer", required=True)
    from_parser.add_argument("--outcome", required=True, choices=sorted(ALLOWED_OUTCOMES))
    from_parser.add_argument("--decision-summary", default="")
    from_parser.add_argument("--promotion-proposal-path", default="")
    from_parser.add_argument("--reference-promotion-allowed", action="store_true")
    from_parser.add_argument("--accepted-atom", action="append", default=[])
    from_parser.add_argument("--held-atom", action="append", default=[])
    from_parser.add_argument("--rejected-atom", action="append", default=[])
    from_parser.add_argument("--blocked-atom", action="append", default=[])
    from_parser.add_argument("--visual-redaction-record-id", action="append", default=[])
    from_parser.add_argument("--check-run", action="append", default=[])
    from_parser.add_argument("--check-passed", action="append", default=[])
    from_parser.add_argument(
        "--accepted-standard-checks",
        action="store_true",
        help="add the standard accepted-bundle check_run and check_passed set",
    )
    from_parser.add_argument("--privacy-finding", action="append", default=[])
    from_parser.add_argument("--schema-expansion-candidate", action="append", default=[])
    from_parser.add_argument("--next-action", action="append", default=[])
    from_parser.add_argument("--non-proof-boundary", action="append", default=[])
    from_parser.add_argument("--notes", default="")
    from_parser.add_argument("--dry-run", action="store_true", help="print the derived record JSON without writing it")
    from_parser.set_defaults(func=command_from_live_record)

    validate_parser = subparsers.add_parser("validate", help="validate Aurora live review outcome records")
    validate_parser.add_argument("paths", nargs="+")
    validate_parser.add_argument("--root", default="docs/nwn-skill-pack")
    validate_parser.set_defaults(func=command_validate)

    aggregate_parser = subparsers.add_parser("aggregate", help="write a markdown aggregate")
    aggregate_parser.add_argument("input")
    aggregate_parser.add_argument("--out", default="docs/nwn-skill-pack/knowledge-inbox/aurora-live-review-outcomes/aggregate.md")
    aggregate_parser.add_argument("--include-invalid", action="store_true")
    aggregate_parser.add_argument("--root", default="docs/nwn-skill-pack")
    aggregate_parser.set_defaults(func=command_aggregate)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
