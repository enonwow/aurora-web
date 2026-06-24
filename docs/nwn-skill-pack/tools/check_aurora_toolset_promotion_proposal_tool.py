#!/usr/bin/env python3
"""Smoke-test Aurora Toolset live-record promotion proposal generation."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path


SCRATCH = Path(".codex-tmp/aurora-toolset-promotion-proposal")
TEMPLATE = Path("knowledge-inbox/templates/aurora-toolset-live-record-template.json")


@dataclass
class ToolCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_positive_record(root: Path, path: Path) -> None:
    record = load_json(root / TEMPLATE)
    record["id"] = "aurora-live-fixture-small-location"
    record["created_at"] = "2026-06-18T21:18:06Z"
    record["operator"] = "fixture-operator"
    record["environment"]["toolset_version"] = "fixture Toolset"
    record["environment"]["nwn_version"] = "fixture NWN:EE"
    record["environment"]["module_path_or_copy_id"] = "fixture-disposable-module"
    record["environment"]["screenshots_folder"] = ".codex-tmp/aurora-fixture/screens"
    record["environment"]["log_folder"] = ".codex-tmp/aurora-fixture/logs"
    record["overall_result"] = "partial"
    record["promotion"]["candidate_references"] = [
        "draft-skills/nwn-server-gamedev/references/locations-areas-tilesets.md",
        "draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev/references/locations-areas-tilesets.md",
    ]
    record["promotion"]["notes"] = "Synthetic fixture for proposal generation."
    for atom_record in record["atoms"]:
        if atom_record["atom"] == "area.createWithWizard":
            atom_record["status"] = "observed-toolset"
            atom_record["evidence_label"] = "toolset-observed"
            atom_record["observations"] = [
                "Fixture observed area wizard fields and saved the created area.",
            ]
            atom_record["artifacts"] = [
                ".codex-tmp/aurora-fixture/screens/area-create-with-wizard.png",
            ]
            atom_record["promotion_ready"] = True
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_prepared_only_record(root: Path, path: Path) -> None:
    record = load_json(root / TEMPLATE)
    record["id"] = "aurora-live-prepared-only-fixture"
    record["created_at"] = "2026-06-19T04:24:12Z"
    record["operator"] = "fixture-operator"
    record["environment"]["toolset_version"] = "fixture Toolset"
    record["environment"]["nwn_version"] = "fixture NWN:EE"
    record["environment"]["module_path_or_copy_id"] = "fixture-disposable-prepared-only-module"
    record["environment"]["screenshots_folder"] = ".codex-tmp/aurora-fixture/prepared-only/screens"
    record["environment"]["log_folder"] = ".codex-tmp/aurora-fixture/prepared-only/logs"
    record["overall_result"] = "not-run"
    record["promotion"]["candidate_references"] = [
        "draft-skills/nwn-server-gamedev/references/locations-areas-tilesets.md",
        "draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev/references/locations-areas-tilesets.md",
    ]
    record["promotion"]["notes"] = "Synthetic prepared-only fixture; this is not live evidence."
    for atom_record in record["atoms"]:
        atom_record["status"] = "not-run"
        atom_record["evidence_label"] = "local-reverse-lead"
        atom_record["observations"] = []
        atom_record["artifacts"] = []
        atom_record["blockers"] = []
        atom_record["promotion_ready"] = False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_partial_unready_record(root: Path, path: Path) -> None:
    record = load_json(root / TEMPLATE)
    record["id"] = "aurora-live-partial-unready-fixture"
    record["created_at"] = "2026-06-19T04:29:42Z"
    record["operator"] = "fixture-operator"
    record["environment"]["toolset_version"] = "fixture Toolset"
    record["environment"]["nwn_version"] = "fixture NWN:EE"
    record["environment"]["module_path_or_copy_id"] = "fixture-disposable-partial-unready-module"
    record["environment"]["screenshots_folder"] = ".codex-tmp/aurora-fixture/partial-unready/screens"
    record["environment"]["log_folder"] = ".codex-tmp/aurora-fixture/partial-unready/logs"
    record["overall_result"] = "partial"
    record["promotion"]["candidate_references"] = [
        "draft-skills/nwn-server-gamedev/references/locations-areas-tilesets.md",
        "draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev/references/locations-areas-tilesets.md",
    ]
    record["promotion"]["notes"] = "Synthetic partial-unready fixture; observed but not promotion-ready."
    for atom_record in record["atoms"]:
        atom_record["status"] = "not-run"
        atom_record["evidence_label"] = "local-reverse-lead"
        atom_record["observations"] = []
        atom_record["artifacts"] = []
        atom_record["blockers"] = []
        atom_record["promotion_ready"] = False
        if atom_record["atom"] == "area.createWithWizard":
            atom_record["status"] = "observed-toolset"
            atom_record["evidence_label"] = "toolset-observed"
            atom_record["observations"] = [
                "Synthetic fixture observed area wizard fields; not real Toolset evidence.",
            ]
            atom_record["artifacts"] = [
                ".codex-tmp/aurora-fixture/partial-unready/screens/area-create-with-wizard.png",
            ]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_evidence_manifest(root: Path, path: Path, source_sha: str) -> None:
    manifest = {
        "schema_version": "1",
        "id": "fixture-small-location-manifest",
        "created_at": "2026-06-18T23:38:38Z",
        "operator": "fixture-operator",
        "live_record_id": "aurora-live-fixture-small-location",
        "live_record_path": str(SCRATCH / "positive-live-record.json").replace("\\", "/"),
        "evidence_root": str(root / ".codex-tmp" / "aurora-fixture").replace("\\", "/"),
        "redaction_reviewed": True,
        "privacy_notes": "Synthetic fixture; not real Aurora evidence.",
        "artifacts": [
            {
                "artifact_id": "area-create-with-wizard",
                "atom": "area.createWithWizard",
                "kind": "screenshot",
                "path": ".codex-tmp/aurora-fixture/screens/area-create-with-wizard.png",
                "description": "Synthetic fixture screenshot row; not real Aurora evidence.",
                "evidence_label": "toolset-observed",
                "redaction_status": "redacted",
                "sha256": source_sha,
                "notes": "Synthetic proposal fixture.",
            }
        ],
        "not_proven": [
            "Synthetic fixture proves generator gate mechanics only.",
            "It does not prove Aurora Toolset behavior, runtime behavior, or visual truth.",
        ],
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_visual_redaction_record(root: Path, path: Path, manifest_path: Path, source_sha: str) -> None:
    source_artifact = root / ".codex-tmp" / "aurora-fixture" / "screens" / "area-create-with-wizard.png"
    record = {
        "schema_version": "1",
        "id": "avr-fixture-small-location",
        "created_at": "2026-06-18T23:38:38Z",
        "live_record_id": "aurora-live-fixture-small-location",
        "evidence_manifest_path": str(manifest_path.relative_to(root)).replace("\\", "/"),
        "reviewer": "fixture-maintainer",
        "result": "pass",
        "artifacts_reviewed": [
            {
                "artifact_id": "area-create-with-wizard",
                "atom": "area.createWithWizard",
                "kind": "screenshot",
                "path_or_external_ref": "https://example.invalid/aurora-redacted-bundle.zip",
                "source_artifact_ref": str(source_artifact.resolve()),
                "source_artifact_sha256": source_sha,
                "reviewed_artifact_sha256": "b" * 64,
                "external_provenance_note": "Synthetic immutable external bundle note; maintainer checked access and SHA-256 hash.",
                "external_storage_provider": "artifact-vault",
                "external_access_checked_at": "2026-06-18T23:38:38Z",
                "redaction_status": "redacted",
                "review_result": "passed",
                "notes": "Synthetic proposal fixture; not real Aurora evidence.",
            }
        ],
        "visual_review": {
            "all_artifacts_opened": True,
            "screenshots_reviewed": True,
            "logs_reviewed": True,
            "no_private_data_visible": True,
            "redaction_irreversible": True,
            "hashes_or_external_notes_checked": True,
            "raw_reverse_excluded": True,
        },
        "privacy_findings": [],
        "blocked_atoms": [],
        "checks_run": [
            "check_aurora_live_visual_redaction_checklist.py",
            "check_aurora_live_visual_redaction_records.py",
        ],
        "checks_passed": [
            "check_aurora_live_visual_redaction_checklist.py",
            "check_aurora_live_visual_redaction_records.py",
        ],
        "non_proof_boundaries": [
            "Synthetic visual redaction record proves generator gate mechanics only."
        ],
        "notes": "Synthetic proposal fixture; not real Aurora evidence.",
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def run_generator(root: Path, record: Path, out: Path, *extra: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            sys.executable,
            str(root / "tools" / "generate_aurora_toolset_promotion_proposal.py"),
            str(root),
            str(record),
            "--out",
            str(out),
            "--maintainer",
            "fixture-maintainer",
            "--semver",
            "MINOR",
            *extra,
        ],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )


def run(root: Path) -> ToolCheck:
    result = ToolCheck()
    scratch = root / SCRATCH
    positive_record = scratch / "positive-live-record.json"
    prepared_only_record = scratch / "prepared-only-live-record.json"
    partial_unready_record = scratch / "partial-unready-live-record.json"
    evidence_manifest = scratch / "positive-evidence-manifest.json"
    visual_redaction_record = scratch / "positive-visual-redaction-record.json"
    mismatched_visual_redaction_record = scratch / "mismatched-visual-redaction-record.json"
    positive_proposal = scratch / "positive-proposal.md"
    prepared_only_proposal = scratch / "prepared-only-proposal.md"
    partial_unready_proposal = scratch / "partial-unready-proposal.md"
    empty_proposal = scratch / "empty-proposal.md"
    template_record = root / TEMPLATE

    write_positive_record(root, positive_record)
    write_prepared_only_record(root, prepared_only_record)
    write_partial_unready_record(root, partial_unready_record)
    write_evidence_manifest(root, evidence_manifest, "a" * 64)
    write_visual_redaction_record(root, visual_redaction_record, evidence_manifest, "a" * 64)
    write_visual_redaction_record(root, mismatched_visual_redaction_record, evidence_manifest, "c" * 64)

    missing_visual = run_generator(root, positive_record, positive_proposal)
    if missing_visual.returncode == 0:
        result.error("positive live record unexpectedly generated a proposal without visual redaction record")
        return result
    if "missing pass visual redaction review record" not in missing_visual.stdout:
        result.error(f"positive live record failed for the wrong missing-visual reason: {missing_visual.stdout.strip()}")
        return result
    result.ok("positive promotion-ready Aurora live record is blocked without a pass visual redaction record")

    positive = run_generator(
        root,
        positive_record,
        positive_proposal,
        "--visual-redaction-record",
        str(visual_redaction_record),
    )
    if positive.returncode != 0:
        result.error(f"positive live record proposal generation failed: {positive.stdout.strip()}")
        return result
    result.ok("positive promotion-ready Aurora live record generated a proposal")
    result.ok("visual redaction artifact coverage accepts source_artifact_ref for redacted-copy paths")

    mismatch = run_generator(
        root,
        positive_record,
        positive_proposal,
        "--visual-redaction-record",
        str(mismatched_visual_redaction_record),
    )
    if mismatch.returncode == 0:
        result.error("positive live record unexpectedly generated a proposal with mismatched source hash")
    elif "source_artifact_sha256 mismatch" not in mismatch.stdout:
        result.error(f"mismatched visual source hash failed for the wrong reason: {mismatch.stdout.strip()}")
    else:
        result.ok("visual redaction source_artifact_sha256 must match evidence manifest sha256")

    text = positive_proposal.read_text(encoding="utf-8") if positive_proposal.exists() else ""
    required_tokens = {
        "Aurora Toolset Reference Promotion Proposal",
        "aurora-live-fixture-small-location",
        "area.createWithWizard",
        "toolset-observed",
        "fixture-disposable-module",
        "draft-skills/nwn-server-gamedev/references/locations-areas-tilesets.md",
        "draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev/references/locations-areas-tilesets.md",
        "check_record_contracts.py",
        "Visual Redaction Review Gate",
        "avr-fixture-small-location",
        "source_artifact_ref",
        "source_artifact_sha256",
        "reviewed_artifact_sha256",
        "external_provenance_note",
        "external_storage_provider",
        "external_access_checked_at",
        "evidence manifest `sha256`",
        "`reviewed_artifact_sha256` differ from `source_artifact_sha256`",
        "check_aurora_live_visual_redaction_records.py",
        "check_reference_promotion_records.py",
        "Does Not Prove",
        "future automatic skill improvement",
    }
    missing = sorted(token for token in required_tokens if token not in text)
    if missing:
        result.error(f"positive proposal missing tokens: {', '.join(missing)}")
    else:
        result.ok("positive proposal includes required source, evidence, target, and boundary tokens")

    empty = run_generator(root, template_record, empty_proposal)
    if empty.returncode == 0:
        result.error("not-run template unexpectedly generated a proposal without --allow-empty")
    elif "no promotion_ready atoms" not in empty.stdout:
        result.error(f"not-run template failed for the wrong reason: {empty.stdout.strip()}")
    else:
        result.ok("not-run template is rejected unless --allow-empty is set")

    prepared_only = run_generator(root, prepared_only_record, prepared_only_proposal)
    if prepared_only.returncode == 0:
        result.error("prepared-only scaffold unexpectedly generated a proposal without --allow-empty")
    elif "no promotion_ready atoms" not in prepared_only.stdout:
        result.error(f"prepared-only scaffold failed for the wrong reason: {prepared_only.stdout.strip()}")
    else:
        result.ok("prepared-only scaffold is rejected unless --allow-empty is set")

    allowed_prepared_only = run_generator(root, prepared_only_record, prepared_only_proposal, "--allow-empty")
    if allowed_prepared_only.returncode != 0:
        result.error(f"--allow-empty prepared-only draft generation failed: {allowed_prepared_only.stdout.strip()}")
    else:
        prepared_text = prepared_only_proposal.read_text(encoding="utf-8")
        prepared_required = {
            "aurora-live-prepared-only-fixture",
            "fixture-disposable-prepared-only-module",
            "Promotion readiness blocker: no promotion_ready atoms",
            "Promotion-Ready Atoms",
            "Does Not Prove",
            "future automatic skill improvement",
        }
        missing_prepared = sorted(token for token in prepared_required if token not in prepared_text)
        if missing_prepared:
            result.error(f"--allow-empty prepared-only proposal missing tokens: {', '.join(missing_prepared)}")
        else:
            result.ok("--allow-empty prepared-only scaffold writes a blocked draft with no promotion-ready atoms")

    partial_unready = run_generator(root, partial_unready_record, partial_unready_proposal)
    if partial_unready.returncode == 0:
        result.error("partial-unready observation unexpectedly generated a proposal without --allow-empty")
    elif "no promotion_ready atoms" not in partial_unready.stdout:
        result.error(f"partial-unready observation failed for the wrong reason: {partial_unready.stdout.strip()}")
    else:
        result.ok("partial-unready observation is rejected unless --allow-empty is set")

    allowed_partial_unready = run_generator(root, partial_unready_record, partial_unready_proposal, "--allow-empty")
    if allowed_partial_unready.returncode != 0:
        result.error(f"--allow-empty partial-unready draft generation failed: {allowed_partial_unready.stdout.strip()}")
    else:
        partial_text = partial_unready_proposal.read_text(encoding="utf-8")
        partial_required = {
            "aurora-live-partial-unready-fixture",
            "fixture-disposable-partial-unready-module",
            "area.createWithWizard",
            "toolset-observed",
            "Promotion readiness blocker: no promotion_ready atoms",
            "Promotion-Ready Atoms",
            "Does Not Prove",
            "future automatic skill improvement",
        }
        missing_partial = sorted(token for token in partial_required if token not in partial_text)
        if missing_partial:
            result.error(f"--allow-empty partial-unready proposal missing tokens: {', '.join(missing_partial)}")
        else:
            result.ok("--allow-empty partial-unready observation writes a blocked draft with no promotion-ready atoms")

    allowed_empty = run_generator(root, template_record, empty_proposal, "--allow-empty")
    if allowed_empty.returncode != 0:
        result.error(f"--allow-empty blocked draft generation failed: {allowed_empty.stdout.strip()}")
    elif "Promotion readiness blocker: no promotion_ready atoms" not in empty_proposal.read_text(encoding="utf-8"):
        result.error("--allow-empty proposal does not record the promotion readiness blocker")
    else:
        result.ok("--allow-empty writes a blocked draft with readiness blocker text")

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
            print(f"Aurora Toolset promotion proposal tool check failed: {len(result.errors)} error(s)")
        else:
            print("Aurora Toolset promotion proposal tool check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
