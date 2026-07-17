#!/usr/bin/env python3
"""Check the Aurora live-operator execution packet and its manifest wiring."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


PACKET = Path("aurora-live-operator-execution-packet.md")
FIRST_SESSION_SHEET = Path("knowledge-inbox/aurora-live-first-session-command-sheet.md")
FIRST_REVIEW_SHEET = Path("knowledge-inbox/aurora-live-first-review-command-sheet.md")

REQUIRED_TOKENS = [
    "Aurora Live Operator Execution Packet",
    "local-aurora-symbol-index.md",
    "local-aurora-skill-reference-gap-analysis.md",
    "local-aurora-small-location-live-operator-checklist.md",
    "knowledge-inbox/templates/aurora-toolset-live-record-template.json",
    "knowledge-inbox/templates/aurora-live-evidence-manifest-template.json",
    "knowledge-inbox/aurora-live-first-session-command-sheet.md",
    "knowledge-inbox/aurora-live-return-packet.md",
    "aurora-live-evidence-workflow.md",
    "disposable module",
    "Do not run desktop automation that controls the global mouse or keyboard unless the user explicitly approves it.",
    "init_aurora_live_record.py",
    "init_aurora_live_evidence_manifest.py",
    "prepare_aurora_live_session.py",
    "--scenario small-location-first-pass",
    "feature-design-output-template.md",
    "aurora-live-YYYYMMDD-small-location-first-pass",
    "Use `knowledge-inbox/aurora-live-first-session-command-sheet.md` as the shortest operator entrypoint",
    "First Live Record Seed",
    "knowledge-inbox\\aurora-live-records",
    "knowledge-inbox\\aurora-live-evidence-manifests",
    ".codex-tmp\\aurora-live-evidence",
    "not-run",
    "Prepared-Only Route Smoke Test",
    "This uses temporary files only.",
    "does not create live Toolset evidence",
    "First Operator Brief",
    "Minimum First Live Pass",
    "placeable.createOrEditContainer",
    "inventory.insertItem",
    "area.placeStartLocation",
    "toolset.buildAndClientRun",
    "record the exact blocker",
    "Do not create new JSON atom names.",
    "filled live record JSON",
    "redacted screenshots",
    "One-Session Run Order",
    "Prioritized Pass From Local Crosswalks",
    "screen-backed",
    "symbol-only",
    "aurora_toolset_live_record.py validate",
    "aurora_toolset_live_record.py aggregate",
    "check_aurora_live_records.py",
    "check_prepare_aurora_live_session.py",
    "check_aurora_live_return_packet.py",
    "check_init_aurora_live_evidence_manifest.py",
    "check_aurora_live_evidence_manifest.py",
    "check_aurora_live_status.py",
    "generate_aurora_toolset_promotion_proposal.py",
    "reference-promotion-proposals",
    "promotion_ready",
    "candidate_references",
    "local-reverse-lead",
    "toolset-observed",
    "static-checked",
    "compiled",
    "runtime-tested",
    "rejected",
    "Toolset UI evidence is not runtime proof.",
    "private module, player, account, token, IP, or credential data",
    "Return Handoff",
    "Still not proven",
    "fresh Codex answer improvement",
    "release-candidate readiness",
]

FIRST_SESSION_TOKENS = [
    "Aurora Live First Session Command Sheet",
    "disposable module copy",
    "Do not use a private module as the only source.",
    "Do not run desktop automation that controls the global mouse or keyboard unless the user explicitly approves it.",
    "prepare_aurora_live_session.py",
    "--scenario small-location-first-pass",
    "candidate-reference draft-skills/nwn-server-gamedev/references/locations-areas-tilesets.md",
    "candidate-reference draft-skills/nwn-server-gamedev/references/items-equipment-loot.md",
    "candidate-reference draft-skills/nwn-server-gamedev/references/creatures-encounters-ai.md",
    "candidate-reference draft-skills/nwn-server-gamedev/references/nwscript-events-systems.md",
    "candidate-reference draft-skills/nwn-server-gamedev/references/feature-design-output-template.md",
    "First-Pass Scope",
    "First Live Record Seed",
    "Promotion-critical atoms",
    "Defer until useful evidence or exact blocker",
    "Runtime claims require `toolset.buildAndClientRun`",
    "not-run",
    "local-reverse-lead",
    "Do not treat preparation as evidence.",
    "Prepared-Only Route Smoke Test",
    "check_prepare_aurora_live_session.py",
    "The smoke test uses temporary files only.",
    "does not make the package release-ready",
    "Run `Minimum First Live Pass` first",
    "placeable.createOrEditContainer",
    "inventory.insertItem",
    "area.placeStartLocation",
    "toolset.buildAndClientRun",
    "record the exact blocker",
    "Run the rest of Track A only after the minimum pass succeeds",
    "Run Track B only when the UI route is actually visible",
    "Do not add Track B names as JSON atoms.",
    "Toolset UI evidence is not runtime proof.",
    "runtime-tested",
    "promotion_ready=false",
    "aurora_toolset_live_record.py validate",
    "aurora-live-<DATE>-small-location-first-pass",
    "check_aurora_live_records.py",
    "check_aurora_live_evidence_manifest.py",
    "redacted screenshots",
    "exact blockers",
    "raw decompilation text",
    "private module files",
    "Still Not Proven",
    "Schema expansion remains blocked",
]

FIRST_REVIEW_TOKENS = [
    "Aurora Live First Review Command Sheet",
    "filled live record JSON",
    "filled evidence manifest JSON",
    "redacted screenshots",
    "exact blockers",
    "Hold review if the bundle includes raw decompilation text",
    "aurora_toolset_live_record.py validate",
    "check_aurora_live_records.py",
    "check_aurora_live_evidence_manifest.py",
    "check_aurora_live_intake_consistency.py",
    "check_aurora_live_redaction_policy.py",
    "check_aurora_live_visual_redaction_checklist.py",
    "check_aurora_live_visual_redaction_records.py",
    "generate_aurora_live_review_queue.py",
    "check_aurora_live_status.py",
    "check_aurora_live_record_review_checklist.py",
    "check_aurora_live_review_outcome_records.py",
    "Minimum First Live Pass Review Gate",
    "local-aurora-small-location-live-operator-checklist.md",
    "placeable.createOrEditContainer",
    "inventory.insertItem",
    "area.placeStartLocation",
    "toolset.buildAndClientRun",
    "hold-for-retest",
    "promotion_ready=true",
    "Toolset UI evidence is used as runtime proof",
    "generate_aurora_toolset_promotion_proposal.py",
    "reference_promotion_record.py",
    "aurora_live_review_outcome_record.py from-live-record",
    "accept-for-proposal",
    "hold-for-retest",
    "reject",
    "Do not add new JSON atoms",
    "Still Not Proven",
]


@dataclass
class PacketCheck:
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


def require_tokens(result: PacketCheck, label: str, text: str, tokens: list[str]) -> None:
    missing = [token for token in tokens if token not in text]
    if missing:
        result.error(f"{label} missing tokens: {', '.join(missing)}")
    else:
        result.ok(f"{label} includes required live-operator, evidence, privacy, and promotion tokens")


def run(root: Path) -> PacketCheck:
    result = PacketCheck()
    packet_path = root / PACKET
    if not packet_path.exists():
        result.error(f"{PACKET} is missing")
        return result

    text = packet_path.read_text(encoding="utf-8")
    require_tokens(result, str(PACKET), text, REQUIRED_TOKENS)

    for relative, tokens in [
        (FIRST_SESSION_SHEET, FIRST_SESSION_TOKENS),
        (FIRST_REVIEW_SHEET, FIRST_REVIEW_TOKENS),
    ]:
        path = root / relative
        if not path.exists():
            result.error(f"{relative} is missing")
            continue
        require_tokens(result, str(relative), path.read_text(encoding="utf-8"), tokens)

    try:
        manifest = load_json(root / "version-manifest.json")
    except Exception as exc:
        result.error(f"could not read version manifest: {exc}")
        return result

    manifest_packet = manifest.get("aurora_live_operator_execution_packet")
    if manifest_packet == str(PACKET):
        result.ok("version manifest points at Aurora live-operator execution packet")
    else:
        result.error("version manifest aurora_live_operator_execution_packet must point at aurora-live-operator-execution-packet.md")

    manifest_check = manifest.get("aurora_live_operator_execution_packet_check")
    if manifest_check == "tools/check_aurora_live_operator_packet.py":
        result.ok("version manifest points at Aurora live-operator execution packet checker")
    else:
        result.error("version manifest aurora_live_operator_execution_packet_check must point at tools/check_aurora_live_operator_packet.py")

    if manifest.get("aurora_live_first_session_command_sheet") == FIRST_SESSION_SHEET.as_posix():
        result.ok("version manifest points at Aurora live first-session command sheet")
    else:
        result.error("version manifest aurora_live_first_session_command_sheet must point at knowledge-inbox/aurora-live-first-session-command-sheet.md")

    if manifest.get("aurora_live_first_review_command_sheet") == FIRST_REVIEW_SHEET.as_posix():
        result.ok("version manifest points at Aurora live first-review command sheet")
    else:
        result.error("version manifest aurora_live_first_review_command_sheet must point at knowledge-inbox/aurora-live-first-review-command-sheet.md")

    for manifest_key in [
        "knowledge_index_policy",
        "maintainer_decision_index",
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
            print(f"Aurora live-operator packet check failed: {len(result.errors)} error(s)")
        else:
            print("Aurora live-operator packet check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
