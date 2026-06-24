#!/usr/bin/env python3
"""Check the Aurora live return packet for required evidence and privacy boundaries."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


PACKET = Path("knowledge-inbox/aurora-live-return-packet.md")

REQUIRED_TOKENS = [
    "Aurora Live Return Packet",
    "prepare_aurora_live_session.py",
    "knowledge-inbox/aurora-live-records",
    "knowledge-inbox/aurora-live-evidence-manifests",
    ".codex-tmp/aurora-live-evidence",
    "aurora-live-YYYYMMDD-small-location-first-pass",
    "aurora-live-evidence-manifest-YYYYMMDD-small-location-first-pass",
    "aurora_toolset_live_record.py validate",
    "check_aurora_live_records.py",
    "check_aurora_live_redaction_policy.py",
    "check_aurora_live_visual_redaction_checklist.py",
    "aurora_live_visual_redaction_record.py",
    "check_aurora_live_visual_redaction_records.py",
    "check_aurora_live_evidence_manifest.py",
    "check_aurora_live_intake_consistency.py",
    "generate_aurora_live_review_queue.py",
    "check_aurora_live_review_queue.py",
    "check_aurora_live_status.py",
    "check_aurora_live_return_roundtrip.py",
    "check_aurora_live_record_review_checklist.py",
    "aurora_live_review_outcome_record.py from-live-record",
    "aurora_live_review_outcome_record.py new",
    "knowledge-inbox/aurora-live-review-outcomes/records",
    "--dry-run",
    "--root docs\\nwn-skill-pack",
    "check_aurora_live_review_outcome_records.py",
    "generate_release_evidence_index.py",
    "check_release_evidence_index.py",
    "release-evidence-index.md",
    "generate_aurora_toolset_promotion_proposal.py",
    "aurora-live-record-review-checklist.md",
    "promotion_ready=false",
    "promotion_ready=true",
    "promotion.candidate_references",
    "local-reverse-lead",
    "toolset-observed",
    "static-checked",
    "compiled",
    "runtime-tested",
    "rejected",
    "Toolset UI evidence is not runtime proof.",
    "redaction_reviewed=true",
    "redaction_status",
    "visual redaction review record",
    "matching `pass` visual redaction review record",
    "proposal generator blocks",
    "sha256",
    "source_artifact_ref",
    "source_artifact_sha256",
    "reviewed_artifact_sha256",
    "`source_artifact_sha256` matches the evidence manifest `sha256`",
    "`reviewed_artifact_sha256` that differs from `source_artifact_sha256`",
    "redaction_status=redacted",
    "external_provenance_note",
    "external_storage_provider",
    "external_access_checked_at",
    "immutable-storage",
    "SHA-256",
    "raw decompilation",
    "private module",
    "private player data",
    "account names",
    "IP addresses",
    "tokens",
    "credentials",
    "unredacted private server logs",
    "not an automatic skill update",
    "Do not copy sample or self-test records",
    "synthetic fixtures stay under `.codex-tmp`",
    "Accept, Hold, Reject",
    "hold-for-retest",
    "reject",
    "Still Hypothesis",
]


@dataclass
class ReturnPacketCheck:
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


def require_tokens(result: ReturnPacketCheck, label: str, text: str, tokens: list[str]) -> None:
    missing = [token for token in tokens if token not in text]
    if missing:
        result.error(f"{label} missing tokens: {', '.join(missing)}")
    else:
        result.ok(f"{label} includes required return, evidence, privacy, and proposal tokens")


def require_manifest_path(
    result: ReturnPacketCheck,
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


def run(root: Path) -> ReturnPacketCheck:
    result = ReturnPacketCheck()
    packet_path = root / PACKET
    if not packet_path.exists():
        result.error(f"{PACKET} is missing")
        return result

    text = packet_path.read_text(encoding="utf-8")
    require_tokens(result, str(PACKET), text, REQUIRED_TOKENS)

    try:
        manifest = load_json(root / "version-manifest.json")
    except Exception as exc:
        result.error(f"could not read version manifest: {exc}")
        return result

    require_manifest_path(
        result,
        root,
        manifest,
        "aurora_live_return_packet",
        PACKET.as_posix(),
        "Aurora live return packet",
    )
    require_manifest_path(
        result,
        root,
        manifest,
        "aurora_live_return_packet_check",
        "tools/check_aurora_live_return_packet.py",
        "Aurora live return packet checker",
    )
    require_manifest_path(
        result,
        root,
        manifest,
        "aurora_live_return_roundtrip_check",
        "tools/check_aurora_live_return_roundtrip.py",
        "Aurora live return roundtrip checker",
    )

    for support in [
        "aurora_live_operator_execution_packet",
        "aurora_live_record_review_checklist",
        "aurora_live_redaction_policy",
        "aurora_live_visual_redaction_checklist",
        "aurora_live_visual_redaction_checklist_check",
        "aurora_live_visual_redaction_record_tool",
        "aurora_live_visual_redaction_record_schema",
        "aurora_live_visual_redaction_record_aggregate",
        "aurora_live_visual_redaction_record_check",
        "aurora_live_evidence_manifest_check",
        "aurora_live_intake_consistency_check",
        "aurora_live_status_check",
    ]:
        value = manifest.get(support)
        if not isinstance(value, str) or not value:
            result.error(f"version manifest missing support artifact: {support}")
        elif not (root / value).exists():
            result.error(f"support artifact does not exist for {support}: {value}")
        else:
            result.ok(f"version manifest includes return-packet support artifact: {support}")

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
            print(f"Aurora live return packet check failed: {len(result.errors)} error(s)")
        else:
            print("Aurora live return packet check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
