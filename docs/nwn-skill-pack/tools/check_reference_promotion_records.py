#!/usr/bin/env python3
"""Check reference promotion record schema, validator, and aggregate output."""

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


SCHEMA = Path("knowledge-inbox/schema/reference-promotion-record.schema.json")
AGGREGATE = Path("knowledge-inbox/reference-promotions/aggregate.md")
RECORD_DIR = Path("knowledge-inbox/reference-promotions/records")
SCRATCH = Path(".codex-tmp/reference-promotion-records")


@dataclass
class PromotionRecordCheck:
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


def base_record(result: str = "accepted") -> dict[str, Any]:
    return {
        "schema_version": "1",
        "id": "rpr-fixture-reference-promotion",
        "created_at": "2026-06-18T19:56:05+00:00",
        "feedback_record_id": "fixture-reference-promotion",
        "proposal_path": "knowledge-inbox/reference-promotion-proposals/fixture-reference-promotion.md",
        "result": result,
        "maintainer": "fixture-maintainer",
        "target_references": [
            "draft-skills/nwn-server-gamedev/references/nui-player-ui.md",
            "draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev/references/nui-player-ui.md",
        ],
        "evidence_label": "docs-verified",
        "semver": "MINOR",
        "verification": {
            "proposal_reviewed": True,
            "references_patched": True,
            "authoring_and_plugin_synced": True,
            "privacy_checked": True,
            "checks_run": [
                "check_skill_routes.py authoring",
                "check_skill_routes.py plugin",
                "check_domain_reference_status.py",
                "run_repo_artifact_preflight.py",
            ],
            "checks_passed": [
                "check_skill_routes.py authoring",
                "check_skill_routes.py plugin",
                "check_domain_reference_status.py",
                "run_repo_artifact_preflight.py",
            ],
        },
        "release_updates": {
            "version_manifest_updated": True,
            "plugin_manifest_updated": True,
            "release_handoff_updated": True,
            "source_of_truth_updated": True,
            "promoted_record_path": "knowledge-inbox/promoted/fixture-reference-promotion.json",
        },
        "follow_up_actions": [],
        "non_proof_boundaries": [
            "Does not prove NWN runtime behavior.",
            "Does not prove future Codex answer improvement.",
        ],
        "notes": "Synthetic accepted promotion record fixture.",
    }


def compare_set(result: PromotionRecordCheck, label: str, left: object, right: object) -> None:
    left_set = set(left) if isinstance(left, (list, set, tuple)) else set()
    right_set = set(right) if isinstance(right, (list, set, tuple)) else set()
    if left_set != right_set:
        result.error(
            f"{label} mismatch: schema-only={sorted(left_set - right_set)}, "
            f"tool-only={sorted(right_set - left_set)}"
        )
    else:
        result.ok(f"{label} matches")


def nested_properties(schema: dict[str, Any], *keys: str) -> dict[str, Any]:
    value: Any = schema
    for key in keys:
        if not isinstance(value, dict):
            return {}
        value = value.get(key, {})
    return value if isinstance(value, dict) else {}


def run(root: Path) -> PromotionRecordCheck:
    result = PromotionRecordCheck()
    tool = load_module(root / "tools" / "reference_promotion_record.py", "reference_promotion_record_check")

    schema_path = root / SCHEMA
    if not schema_path.exists():
        result.error(f"{SCHEMA} is missing")
        return result
    schema = load_json(schema_path)
    result.ok(f"{SCHEMA} exists and parses")

    compare_set(result, "reference promotion required fields", schema.get("required", []), tool.REQUIRED_FIELDS)
    compare_set(
        result,
        "reference promotion result enum",
        nested_properties(schema, "properties", "result").get("enum", []),
        tool.ALLOWED_RESULTS,
    )
    compare_set(
        result,
        "reference promotion semver enum",
        nested_properties(schema, "properties", "semver").get("enum", []),
        tool.ALLOWED_SEMVER,
    )
    compare_set(
        result,
        "reference promotion evidence label enum",
        nested_properties(schema, "properties", "evidence_label").get("enum", []),
        tool.ALLOWED_EVIDENCE_LABELS,
    )
    compare_set(
        result,
        "reference promotion verification required fields",
        nested_properties(schema, "properties", "verification").get("required", []),
        tool.REQUIRED_VERIFICATION_FIELDS,
    )
    compare_set(
        result,
        "reference promotion release update required fields",
        nested_properties(schema, "properties", "release_updates").get("required", []),
        tool.REQUIRED_RELEASE_UPDATE_FIELDS,
    )

    good = base_record()
    good_errors = tool.validate_record(good)
    if good_errors:
        result.error("accepted promotion fixture should validate: " + "; ".join(good_errors))
    else:
        result.ok("accepted promotion fixture validates")

    bad = base_record()
    bad["semver"] = "NONE"
    bad["verification"]["authoring_and_plugin_synced"] = False
    bad["target_references"] = ["draft-skills/nwn-server-gamedev/references/nui-player-ui.md"]
    bad_errors = tool.validate_record(bad)
    if (
        any("semver" in error for error in bad_errors)
        and any("authoring_and_plugin_synced" in error for error in bad_errors)
        and any("plugin-packaged reference target" in error for error in bad_errors)
    ):
        result.ok("accepted promotion fixture rejects missing semver, sync, and plugin target")
    else:
        result.error("accepted promotion fixture did not reject required negative conditions")

    held = base_record(result="held")
    held["semver"] = "NONE"
    held["evidence_label"] = "unverified"
    held["target_references"] = []
    held["verification"]["references_patched"] = False
    held["verification"]["authoring_and_plugin_synced"] = False
    held["verification"]["checks_run"] = []
    held["verification"]["checks_passed"] = []
    held["release_updates"]["version_manifest_updated"] = False
    held["release_updates"]["plugin_manifest_updated"] = False
    held["release_updates"]["source_of_truth_updated"] = False
    held["release_updates"]["promoted_record_path"] = ""
    held["notes"] = "Synthetic held promotion record fixture."
    held_errors = tool.validate_record(held)
    if held_errors:
        result.error("held promotion fixture should validate: " + "; ".join(held_errors))
    else:
        result.ok("held promotion fixture validates without patching references")

    scratch_records = root / SCRATCH / "records"
    write_json(scratch_records / "accepted.json", good)
    write_json(scratch_records / "held.json", held)
    scratch_aggregate = root / SCRATCH / "aggregate.md"
    completed = subprocess.run(
        [
            sys.executable,
            str(root / "tools" / "reference_promotion_record.py"),
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
        result.error(f"reference promotion aggregate command failed: {completed.stdout.strip()}")
    elif not scratch_aggregate.exists():
        result.error("reference promotion aggregate command did not write output")
    else:
        text = scratch_aggregate.read_text(encoding="utf-8")
        required_tokens = {
            "Reference Promotion Records Aggregate",
            "`accepted`: 1",
            "`held`: 1",
            "process only",
            "NWN runtime behavior",
        }
        missing = sorted(token for token in required_tokens if token not in text)
        if missing:
            result.error(f"reference promotion aggregate missing tokens: {', '.join(missing)}")
        else:
            result.ok("reference promotion aggregate includes counts and trust boundaries")

    aggregate = root / AGGREGATE
    if aggregate.exists() and "Reference Promotion Records Aggregate" in aggregate.read_text(encoding="utf-8"):
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
        result.ok(f"existing reference promotion records checked: {len(existing)}")
    else:
        result.ok("no reference promotion records directory yet; no real promotions recorded")

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
            print(f"Reference promotion record check failed: {len(result.errors)} error(s)")
        else:
            print("Reference promotion record check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
