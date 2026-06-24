#!/usr/bin/env python3
"""Check the Aurora live-record review checklist and manifest wiring."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


CHECKLIST = Path("knowledge-inbox/aurora-live-record-review-checklist.md")

REQUIRED_TOKENS = [
    "Aurora Live Record Review Checklist",
    "aurora-live-evidence-workflow.md",
    "aurora-live-operator-execution-packet.md",
    "knowledge-inbox/aurora-live-first-review-command-sheet.md",
    "knowledge-inbox/aurora-live-return-packet.md",
    "local-aurora-small-location-live-operator-checklist.md",
    "knowledge-inbox/aurora-live-review-queue.md",
    "knowledge-inbox/aurora-live-redaction-policy.md",
    "knowledge-inbox/aurora-live-visual-redaction-checklist.md",
    "knowledge-inbox/aurora-live-visual-redaction-records/aggregate.md",
    "knowledge-inbox/templates/aurora-live-review-outcome-record-template.json",
    "knowledge-inbox/schema/aurora-live-review-outcome-record.schema.json",
    "knowledge-inbox/aurora-live-review-outcomes/aggregate.md",
    "knowledge-inbox/templates/aurora-toolset-live-record-template.json",
    "knowledge-inbox/templates/aurora-live-evidence-manifest-template.json",
    "knowledge-inbox/aurora-live-evidence-manifests/*.json",
    "knowledge-inbox/aurora-live-records/*.json",
    "aurora_toolset_live_record.py validate",
    "check_aurora_live_records.py",
    "check_aurora_live_status.py",
    "check_aurora_live_redaction_policy.py",
    "check_aurora_live_visual_redaction_checklist.py",
    "aurora_live_visual_redaction_record.py",
    "check_aurora_live_visual_redaction_records.py",
    "check_aurora_live_evidence_manifest.py",
    "check_aurora_live_intake_consistency.py",
    "generate_aurora_live_review_queue.py",
    "aurora_live_review_outcome_record.py",
    "aurora_live_review_outcome_record.py new",
    "aurora_live_review_outcome_record.py from-live-record",
    "--dry-run",
    "--accepted-standard-checks",
    "check_aurora_live_review_outcome_records.py",
    "generate_aurora_toolset_promotion_proposal.py",
    "Minimum First Live Pass Review Gate",
    "placeable.createOrEditContainer",
    "inventory.insertItem",
    "area.placeStartLocation",
    "toolset.buildAndClientRun",
    "hold-for-retest",
    "not `accept-for-proposal`",
    "accept-for-proposal",
    "hold-for-retest",
    "promotion_ready=true",
    "promotion_ready=false",
    "candidate_references",
    "screen-backed",
    "symbol-only",
    "local-reverse-lead",
    "toolset-observed",
    "static-checked",
    "compiled",
    "runtime-tested",
    "rejected",
    "Toolset UI evidence is used as runtime proof",
    "raw decompilation",
    "private module data",
    "reference_promotion_record.py",
    "visual redaction review record",
    "covers every promotion-ready artifact",
    "source_artifact_ref",
    "source_artifact_sha256",
    "reviewed_artifact_sha256",
    "must match the source row `sha256` in the evidence manifest",
    "`reviewed_artifact_sha256` that differs from `source_artifact_sha256`",
    "redaction_status=redacted",
    "external_provenance_note",
    "external_storage_provider",
    "external_access_checked_at",
    "immutable-storage",
    "SHA-256",
    "proposal generator enforces",
    "repo-artifact preflight",
    "Schema Expansion Gate",
    "Do not add new live-record atoms",
    "current core-atom model",
    "Schema expansion remains hypothesis",
    "Still Hypothesis",
]


@dataclass
class ChecklistCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def require_tokens(result: ChecklistCheck, label: str, text: str, tokens: list[str]) -> None:
    missing = [token for token in tokens if token not in text]
    if missing:
        result.error(f"{label} missing tokens: {', '.join(missing)}")
    else:
        result.ok(f"{label} includes required review, evidence-label, privacy, and promotion-boundary tokens")


def run(root: Path) -> ChecklistCheck:
    result = ChecklistCheck()
    checklist_path = root / CHECKLIST
    if not checklist_path.exists():
        result.error(f"{CHECKLIST} is missing")
        return result

    text = checklist_path.read_text(encoding="utf-8")
    require_tokens(result, str(CHECKLIST), text, REQUIRED_TOKENS)

    try:
        manifest = load_json(root / "version-manifest.json")
    except Exception as exc:
        result.error(f"could not read version manifest: {exc}")
        return result

    manifest_checklist = manifest.get("aurora_live_record_review_checklist")
    if manifest_checklist == CHECKLIST.as_posix():
        result.ok("version manifest points at Aurora live-record review checklist")
    else:
        result.error("version manifest aurora_live_record_review_checklist must point at knowledge-inbox/aurora-live-record-review-checklist.md")

    manifest_check = manifest.get("aurora_live_record_review_checklist_check")
    if manifest_check == "tools/check_aurora_live_record_review_checklist.py":
        result.ok("version manifest points at Aurora live-record review checklist checker")
    else:
        result.error("version manifest aurora_live_record_review_checklist_check must point at tools/check_aurora_live_record_review_checklist.py")

    for manifest_key in [
        "aurora_live_operator_execution_packet",
        "aurora_live_records_check",
        "aurora_live_status",
        "aurora_live_visual_redaction_checklist",
        "aurora_live_visual_redaction_checklist_check",
        "aurora_live_visual_redaction_record_tool",
        "aurora_live_visual_redaction_record_schema",
        "aurora_live_visual_redaction_record_aggregate",
        "aurora_live_visual_redaction_record_check",
        "reference_promotion_record_tool",
        "repo_artifact_preflight",
    ]:
        value = manifest.get(manifest_key)
        if not isinstance(value, str) or not value:
            result.error(f"version manifest missing {manifest_key}")
        elif not (root / value).exists():
            result.error(f"manifest artifact does not exist for {manifest_key}: {value}")
        else:
            result.ok(f"version manifest includes existing support artifact: {manifest_key}")

    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    result = run(Path(args.root))
    if args.json:
        print(json.dumps({"checks": result.checks, "errors": result.errors}, indent=2))
    else:
        for check in result.checks:
            print(f"OK: {check}")
        for error in result.errors:
            print(f"ERROR: {error}")
        if result.errors:
            print(f"Aurora live-record review checklist check failed: {len(result.errors)} error(s)")
        else:
            print("Aurora live-record review checklist check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
