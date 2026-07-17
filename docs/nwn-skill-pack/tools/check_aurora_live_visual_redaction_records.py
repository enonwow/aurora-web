#!/usr/bin/env python3
"""Check Aurora live visual redaction review record schema, CLI, and aggregate."""

from __future__ import annotations

import argparse
import importlib.util
import json
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType
from typing import Any


SCHEMA = Path("knowledge-inbox/schema/aurora-live-visual-redaction-record.schema.json")
AGGREGATE = Path("knowledge-inbox/aurora-live-visual-redaction-records/aggregate.md")
RECORD_DIR = Path("knowledge-inbox/aurora-live-visual-redaction-records/records")
SCRATCH = Path(".codex-tmp/aurora-live-visual-redaction-records")


@dataclass
class VisualRecordCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


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


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def nested_properties(schema: dict[str, Any], *keys: str) -> dict[str, Any]:
    value: Any = schema
    for key in keys:
        if not isinstance(value, dict):
            return {}
        value = value.get(key, {})
    return value if isinstance(value, dict) else {}


def compare_set(result: VisualRecordCheck, label: str, left: object, right: object) -> None:
    left_set = set(left) if isinstance(left, (list, set, tuple)) else set()
    right_set = set(right) if isinstance(right, (list, set, tuple)) else set()
    if left_set != right_set:
        result.error(
            f"{label} mismatch: schema-only={sorted(left_set - right_set)}, "
            f"tool-only={sorted(right_set - left_set)}"
        )
    else:
        result.ok(f"{label} matches")


def base_record(result_value: str = "pass") -> dict[str, Any]:
    return {
        "schema_version": "1",
        "id": "avr-fixture-visual-redaction",
        "created_at": "2026-06-18T23:26:07+00:00",
        "live_record_id": "aurora-live-20990101-roundtrip-smoke",
        "evidence_manifest_path": "knowledge-inbox/aurora-live-evidence-manifests/aurora-live-evidence-manifest-20990101-roundtrip-smoke.json",
        "reviewer": "fixture-maintainer",
        "result": result_value,
        "artifacts_reviewed": [
            {
                "artifact_id": "area-wizard-step-01",
                "atom": "area.createWithWizard",
                "kind": "screenshot",
                "path_or_external_ref": "redacted/area-wizard-step-01.png",
                "source_artifact_ref": "screenshots/area-wizard-step-01.png",
                "source_artifact_sha256": "a" * 64,
                "reviewed_artifact_sha256": "b" * 64,
                "redaction_status": "redacted",
                "review_result": "passed",
                "notes": "Synthetic fixture path only.",
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
            "check_aurora_live_redaction_policy.py",
            "check_aurora_live_visual_redaction_checklist.py",
        ],
        "checks_passed": [
            "check_aurora_live_redaction_policy.py",
            "check_aurora_live_visual_redaction_checklist.py",
        ],
        "non_proof_boundaries": [
            "Visual redaction review does not prove Aurora Toolset behavior or NWN runtime behavior."
        ],
        "notes": "Synthetic accepted visual redaction fixture.",
    }


def run(root: Path) -> VisualRecordCheck:
    result = VisualRecordCheck()
    tool = load_module(root / "tools" / "aurora_live_visual_redaction_record.py", "aurora_visual_record_check")

    schema_path = root / SCHEMA
    if not schema_path.exists():
        result.error(f"{SCHEMA} is missing")
        return result
    schema = load_json(schema_path)
    result.ok(f"{SCHEMA} exists and parses")

    compare_set(result, "visual redaction required fields", schema.get("required", []), tool.REQUIRED_FIELDS)
    compare_set(
        result,
        "visual redaction result enum",
        nested_properties(schema, "properties", "result").get("enum", []),
        tool.ALLOWED_RESULTS,
    )
    artifact_schema = nested_properties(schema, "properties", "artifacts_reviewed", "items")
    compare_set(
        result,
        "visual redaction artifact required fields",
        artifact_schema.get("required", []),
        tool.REQUIRED_ARTIFACT_FIELDS,
    )
    compare_set(
        result,
        "visual redaction artifact kind enum",
        nested_properties(artifact_schema, "properties", "kind").get("enum", []),
        tool.ALLOWED_ARTIFACT_KINDS,
    )
    compare_set(
        result,
        "visual redaction artifact redaction enum",
        nested_properties(artifact_schema, "properties", "redaction_status").get("enum", []),
        tool.ALLOWED_REDACTION_STATUSES,
    )
    compare_set(
        result,
        "visual redaction artifact review enum",
        nested_properties(artifact_schema, "properties", "review_result").get("enum", []),
        tool.ALLOWED_REVIEW_RESULTS,
    )
    if nested_properties(artifact_schema, "properties", "source_artifact_ref").get("type") == "string":
        result.ok("visual redaction artifact source_artifact_ref is optional and schema-described")
    else:
        result.error("visual redaction artifact source_artifact_ref must be schema-described as a string")
    for field in ["source_artifact_sha256", "reviewed_artifact_sha256"]:
        if nested_properties(artifact_schema, "properties", field).get("pattern") == "^[a-fA-F0-9]{64}$":
            result.ok(f"visual redaction artifact {field} is optional and SHA-256 schema-described")
        else:
            result.error(f"visual redaction artifact {field} must be schema-described as SHA-256")
    if nested_properties(artifact_schema, "properties", "external_provenance_note").get("type") == "string":
        result.ok("visual redaction artifact external_provenance_note is optional and schema-described")
    else:
        result.error("visual redaction artifact external_provenance_note must be schema-described as a string")
    for field in ["external_storage_provider", "external_access_checked_at"]:
        if nested_properties(artifact_schema, "properties", field).get("type") == "string":
            result.ok(f"visual redaction artifact {field} is optional and schema-described")
        else:
            result.error(f"visual redaction artifact {field} must be schema-described as a string")
    compare_set(
        result,
        "visual redaction review required fields",
        nested_properties(schema, "properties", "visual_review").get("required", []),
        tool.REQUIRED_VISUAL_REVIEW_FIELDS,
    )

    good = base_record()
    good_errors = tool.validate_record(good)
    if good_errors:
        result.error("pass visual redaction fixture should validate: " + "; ".join(good_errors))
    else:
        result.ok("pass visual redaction fixture validates")

    equal_hash = base_record()
    equal_hash["artifacts_reviewed"][0]["reviewed_artifact_sha256"] = "a" * 64
    equal_hash_errors = tool.validate_record(equal_hash)
    if any("reviewed_artifact_sha256 to differ" in error for error in equal_hash_errors):
        result.ok("pass visual redaction fixture rejects redacted copies whose reviewed hash equals the source hash")
    else:
        result.error("pass visual redaction fixture should reject redacted copies whose reviewed hash equals the source hash")

    bad = base_record()
    bad["visual_review"]["no_private_data_visible"] = False
    bad["artifacts_reviewed"][0]["redaction_status"] = "pending-redaction"
    bad["artifacts_reviewed"][0]["source_artifact_ref"] = ""
    bad["artifacts_reviewed"][0]["source_artifact_sha256"] = "not-a-sha"
    bad_errors = tool.validate_record(bad)
    if (
        any("no_private_data_visible" in error for error in bad_errors)
        and any("redaction_status" in error for error in bad_errors)
        and any("source_artifact_ref" in error for error in bad_errors)
        and any("source_artifact_sha256" in error for error in bad_errors)
    ):
        result.ok("pass visual redaction fixture rejects unreviewed private-data, pending-redaction, blank source artifact, and bad hash states")
    else:
        result.error("pass visual redaction fixture did not reject required negative conditions")

    parsed_artifact = tool.parse_artifact(
        "area-wizard-step-01|area.createWithWizard|screenshot|redacted/area-wizard-step-01.png|redacted|passed|screenshots/area-wizard-step-01.png|"
        + "a" * 64
        + "|"
        + "b" * 64
        + "|Synthetic immutable external provenance note; access checked; SHA-256 hash checked"
        + "|artifact-vault"
        + "|2026-06-18T23:26:07Z"
    )
    if (
        parsed_artifact.get("source_artifact_ref") == "screenshots/area-wizard-step-01.png"
        and parsed_artifact.get("source_artifact_sha256") == "a" * 64
        and parsed_artifact.get("reviewed_artifact_sha256") == "b" * 64
        and parsed_artifact.get("external_provenance_note")
        == "Synthetic immutable external provenance note; access checked; SHA-256 hash checked"
        and parsed_artifact.get("external_storage_provider") == "artifact-vault"
        and parsed_artifact.get("external_access_checked_at") == "2026-06-18T23:26:07Z"
    ):
        result.ok("visual redaction CLI artifact parser accepts optional source_artifact_ref, hashes, provenance note, provider, and access timestamp")
    else:
        result.error("visual redaction CLI artifact parser should accept optional source_artifact_ref, hashes, provenance note, provider, and access timestamp")

    held = base_record("hold")
    held["artifacts_reviewed"][0]["review_result"] = "held"
    held["artifacts_reviewed"][0]["redaction_status"] = "pending-redaction"
    held["blocked_atoms"] = ["area.createWithWizard"]
    held["privacy_findings"] = ["Synthetic held fixture for pending visual review."]
    held_errors = tool.validate_record(held)
    if held_errors:
        result.error("held visual redaction fixture should validate: " + "; ".join(held_errors))
    else:
        result.ok("held visual redaction fixture validates with blocker fields")

    external = base_record()
    external["artifacts_reviewed"][0]["path_or_external_ref"] = "https://example.invalid/aurora-redacted-bundle.zip"
    missing_external_note_errors = tool.validate_record(external)
    if any("external_provenance_note" in error for error in missing_external_note_errors):
        result.ok("pass visual redaction fixture rejects external reviewed artifacts without provenance notes")
    else:
        result.error("pass visual redaction fixture should reject external reviewed artifacts without provenance notes")
    external["artifacts_reviewed"][0]["external_provenance_note"] = "Synthetic external note without required topics."
    vague_external_note_errors = tool.validate_record(external)
    if any("immutable storage" in error for error in vague_external_note_errors):
        result.ok("pass visual redaction fixture rejects vague external provenance notes")
    else:
        result.error("pass visual redaction fixture should reject vague external provenance notes")
    external["artifacts_reviewed"][0]["external_provenance_note"] = (
        "Synthetic immutable external bundle note; maintainer checked access and SHA-256 hash."
    )
    missing_structured_external_errors = tool.validate_record(external)
    if (
        any("external_storage_provider" in error for error in missing_structured_external_errors)
        and any("external_access_checked_at" in error for error in missing_structured_external_errors)
    ):
        result.ok("pass visual redaction fixture rejects external provenance without provider and access timestamp")
    else:
        result.error("pass visual redaction fixture should reject external provenance without provider and access timestamp")
    external["artifacts_reviewed"][0]["external_storage_provider"] = "artifact-vault"
    external["artifacts_reviewed"][0]["external_access_checked_at"] = "not-a-date"
    bad_timestamp_external_errors = tool.validate_record(external)
    if any("external_access_checked_at" in error for error in bad_timestamp_external_errors):
        result.ok("pass visual redaction fixture rejects invalid external access timestamp")
    else:
        result.error("pass visual redaction fixture should reject invalid external access timestamp")
    external["artifacts_reviewed"][0]["external_access_checked_at"] = "2026-06-18T23:26:07Z"
    external_errors = tool.validate_record(external)
    if external_errors:
        result.error(
            "external pass visual redaction fixture should validate with structured provenance fields: "
            + "; ".join(external_errors)
        )
    else:
        result.ok("external pass visual redaction fixture validates with structured provenance fields")

    scratch_records = root / SCRATCH / "records"
    write_json(scratch_records / "pass.json", good)
    write_json(scratch_records / "hold.json", held)
    scratch_aggregate = root / SCRATCH / "aggregate.md"
    completed = subprocess.run(
        [
            sys.executable,
            str(root / "tools" / "aurora_live_visual_redaction_record.py"),
            "aggregate",
            str(scratch_records),
            "--out",
            str(scratch_aggregate),
        ],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if completed.returncode != 0:
        result.error(f"visual redaction aggregate command failed: {completed.stdout.strip()}")
    elif not scratch_aggregate.exists():
        result.error("visual redaction aggregate command did not write output")
    else:
        text = scratch_aggregate.read_text(encoding="utf-8")
        required_tokens = {
            "Aurora Live Visual Redaction Records Aggregate",
            "`pass`: 1",
            "`hold`: 1",
            "human visual review decision",
            "do not OCR screenshots",
            "NWN runtime behavior",
        }
        missing = sorted(token for token in required_tokens if token not in text)
        if missing:
            result.error(f"visual redaction aggregate missing tokens: {', '.join(missing)}")
        else:
            result.ok("visual redaction aggregate includes counts and trust boundaries")

    aggregate = root / AGGREGATE
    if aggregate.exists() and "Aurora Live Visual Redaction Records Aggregate" in aggregate.read_text(encoding="utf-8"):
        result.ok(f"{AGGREGATE} exists and has expected heading")
    else:
        result.error(f"{AGGREGATE} is missing or has wrong heading")

    records_dir = root / RECORD_DIR
    if records_dir.exists():
        existing = sorted(records_dir.glob("*.json"))
        for path in existing:
            try:
                errors = tool.validate_record(load_json(path))
            except Exception as exc:
                errors = [str(exc)]
            if errors:
                result.error(f"{path.relative_to(root)} is invalid: {'; '.join(errors)}")
        result.ok(f"existing visual redaction records checked: {len(existing)}")
    else:
        result.ok("no visual redaction records directory yet; no real visual reviews recorded")

    manifest = load_json(root / "version-manifest.json")
    for key, expected in {
        "aurora_live_visual_redaction_record_tool": "tools/aurora_live_visual_redaction_record.py",
        "aurora_live_visual_redaction_record_schema": SCHEMA.as_posix(),
        "aurora_live_visual_redaction_record_aggregate": AGGREGATE.as_posix(),
        "aurora_live_visual_redaction_record_check": "tools/check_aurora_live_visual_redaction_records.py",
    }.items():
        value = manifest.get(key)
        if value != expected:
            result.error(f"version manifest {key} must point at {expected}")
        elif not (root / expected).exists():
            result.error(f"manifest artifact does not exist for {key}: {expected}")
        else:
            result.ok(f"version manifest points at {key}")

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
            print(f"Aurora live visual redaction record check failed: {len(result.errors)} error(s)")
        else:
            print("Aurora live visual redaction record check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
