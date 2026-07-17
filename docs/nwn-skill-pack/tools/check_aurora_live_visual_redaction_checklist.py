#!/usr/bin/env python3
"""Check the Aurora live visual redaction checklist and manifest wiring."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


CHECKLIST = Path("knowledge-inbox/aurora-live-visual-redaction-checklist.md")

REQUIRED_TOKENS = [
    "Aurora Live Visual Redaction Checklist",
    "knowledge-inbox/aurora-live-records/*.json",
    "knowledge-inbox/aurora-live-evidence-manifests/*.json",
    "knowledge-inbox/aurora-live-redaction-policy.md",
    "knowledge-inbox/aurora-live-record-review-checklist.md",
    "knowledge-inbox/aurora-live-return-packet.md",
    "knowledge-inbox/schema/aurora-live-visual-redaction-record.schema.json",
    "knowledge-inbox/aurora-live-visual-redaction-records/aggregate.md",
    "screenshots",
    "logs",
    "visual review",
    "redaction_reviewed=false",
    "redaction_status=redacted",
    "redaction_status=not-private",
    "redaction_status=pending-redaction",
    "source_artifact_ref",
    "source_artifact_sha256",
    "reviewed_artifact_sha256",
    "must match the source row `sha256` in the evidence manifest",
    "`reviewed_artifact_sha256` must differ from `source_artifact_sha256`",
    "redaction_status=not-private",
    "external_provenance_note",
    "external_storage_provider",
    "external_access_checked_at",
    "immutable-storage",
    "SHA-256",
    "promotion_ready=true",
    "promotion_ready=false",
    "account names",
    "player names",
    "private module",
    "IP addresses",
    "hostnames",
    "tokens",
    "credentials",
    "absolute user paths",
    "raw decompilation",
    "raw symbol dumps",
    "private server logs",
    "check_aurora_live_redaction_policy.py",
    "check_aurora_live_evidence_manifest.py",
    "check_aurora_live_intake_consistency.py",
    "aurora_live_visual_redaction_record.py",
    "check_aurora_live_visual_redaction_records.py",
    "check_aurora_live_record_review_checklist.py",
    "not proof by itself",
    "does not inspect images automatically",
    "Still Hypothesis",
]


@dataclass
class VisualRedactionChecklistCheck:
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


def require_manifest_path(
    result: VisualRedactionChecklistCheck,
    root: Path,
    manifest: dict[str, Any],
    key: str,
    expected: str,
    label: str,
) -> None:
    value = manifest.get(key)
    if value != expected:
        result.error(f"version manifest {key} must point at {expected}")
        return
    if not (root / expected).exists():
        result.error(f"manifest artifact does not exist for {label}: {expected}")
        return
    result.ok(f"version manifest points at {label}")


def run(root: Path) -> VisualRedactionChecklistCheck:
    result = VisualRedactionChecklistCheck()
    checklist_path = root / CHECKLIST
    if not checklist_path.exists():
        result.error(f"{CHECKLIST} is missing")
        return result

    text = checklist_path.read_text(encoding="utf-8")
    missing = [token for token in REQUIRED_TOKENS if token not in text]
    if missing:
        result.error(f"{CHECKLIST} missing tokens: {', '.join(missing)}")
    else:
        result.ok("visual redaction checklist includes required privacy, artifact, command, and boundary tokens")

    try:
        manifest = load_json(root / "version-manifest.json")
    except Exception as exc:
        result.error(f"could not read version manifest: {exc}")
        return result

    require_manifest_path(
        result,
        root,
        manifest,
        "aurora_live_visual_redaction_checklist",
        CHECKLIST.as_posix(),
        "Aurora live visual redaction checklist",
    )
    require_manifest_path(
        result,
        root,
        manifest,
        "aurora_live_visual_redaction_checklist_check",
        "tools/check_aurora_live_visual_redaction_checklist.py",
        "Aurora live visual redaction checklist checker",
    )
    for key in [
        "aurora_live_redaction_policy",
        "aurora_live_redaction_policy_check",
        "aurora_live_evidence_manifest_check",
        "aurora_live_intake_consistency_check",
        "aurora_live_visual_redaction_record_tool",
        "aurora_live_visual_redaction_record_schema",
        "aurora_live_visual_redaction_record_aggregate",
        "aurora_live_visual_redaction_record_check",
        "aurora_live_record_review_checklist",
        "aurora_live_record_review_checklist_check",
    ]:
        value = manifest.get(key)
        if not isinstance(value, str) or not value:
            result.error(f"version manifest missing support artifact: {key}")
        elif not (root / value).exists():
            result.error(f"support artifact does not exist for {key}: {value}")
        else:
            result.ok(f"version manifest includes visual-redaction support artifact: {key}")

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
            print(f"Aurora live visual redaction checklist check failed: {len(result.errors)} error(s)")
        else:
            print("Aurora live visual redaction checklist check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
