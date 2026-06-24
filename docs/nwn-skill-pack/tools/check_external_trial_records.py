#!/usr/bin/env python3
"""Check external contributor trial record tooling, schema, and aggregate."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType


SCHEMA = Path("knowledge-inbox/schema/external-contributor-trial-record.schema.json")
RECORDS_DIR = Path("knowledge-inbox/external-trials/records")
AGGREGATE = Path("knowledge-inbox/external-trials/aggregate.md")
TOOL = Path("tools/external_trial_record.py")
REQUIRED_COMMANDS = {"command_new", "command_validate", "command_aggregate", "validate_record"}
AGGREGATE_TOKENS = {
    "# External Contributor Trial Aggregate",
    "Result Counts",
    "Records:",
    "not NWN runtime proof",
    "not automatic skill improvement",
}


@dataclass
class ExternalTrialRecordsCheck:
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


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def run(root: Path) -> ExternalTrialRecordsCheck:
    result = ExternalTrialRecordsCheck()
    tool_path = root / TOOL
    schema_path = root / SCHEMA
    aggregate_path = root / AGGREGATE

    for path, label in [
        (tool_path, "external trial record tool"),
        (schema_path, "external trial record schema"),
        (aggregate_path, "external trial aggregate"),
    ]:
        if path.exists():
            result.ok(f"{label} exists: {path.relative_to(root)}")
        else:
            result.error(f"{label} is missing: {path.relative_to(root)}")

    if result.errors:
        return result

    try:
        schema = load_json(schema_path)
    except Exception as exc:
        result.error(f"external trial schema is invalid JSON: {exc}")
        return result
    if "$schema" not in schema or "properties" not in schema:
        result.error("external trial schema is not shaped like a JSON Schema object")
    else:
        result.ok("external trial schema parses as JSON Schema")

    try:
        module = load_module(tool_path, "external_trial_record_checker")
    except Exception as exc:
        result.error(f"cannot import external trial record tool: {exc}")
        return result

    missing_commands = [
        command for command in sorted(REQUIRED_COMMANDS)
        if not callable(getattr(module, command, None))
    ]
    if missing_commands:
        result.error(f"external trial record tool missing commands: {', '.join(missing_commands)}")
    else:
        result.ok("external trial record tool exposes required commands")

    synthetic_pass = {
        "schema_version": "1",
        "id": "ext-999-synthetic-pass",
        "created_at": "2026-06-18T00:00:00+00:00",
        "trial_id": "EXT-999",
        "title": "Synthetic external trial validation guard",
        "result": "pass",
        "packet_path": "knowledge-inbox/external-contributor-trial-packet.md",
        "result_template_path": "knowledge-inbox/external-contributor-trial-result-template.md",
        "tester_role": "outside NWN builder",
        "tester_environment": "synthetic",
        "path_used": "command",
        "public_inputs": ["knowledge-inbox/external-contributor-trial-packet.md"],
        "returned_artifacts": ["received-bundle"],
        "command_transcript": ["synthetic transcript"],
        "friction": [],
        "privacy_confirmation": {
            "no_private_data": True,
            "quarantine_required": False,
            "summary": "Synthetic no-private-data confirmation.",
        },
        "maintainer_verification": {
            "packet_check": True,
            "result_template_check": True,
            "cleanroom_check": True,
            "independent_tester": False,
            "verify_bundle": True,
            "validate_records": True,
            "notes": "Synthetic validation guard.",
        },
        "issues": [],
        "feedback_record_ids": [],
        "improvement_action": {
            "needed": False,
            "summary": "",
        },
        "notes": "",
    }
    errors_without_independent = module.validate_record(synthetic_pass)
    expected_error = "pass results require maintainer_verification.independent_tester=true"
    if expected_error in errors_without_independent:
        result.ok("pass trial records require independent_tester=true")
    else:
        result.error("pass trial records are not rejected when independent_tester=false")

    synthetic_pass["maintainer_verification"]["independent_tester"] = True
    errors_with_independent = module.validate_record(synthetic_pass)
    if not errors_with_independent:
        result.ok("synthetic pass record validates when independent_tester=true")
    else:
        result.error(
            "synthetic pass record with independent_tester=true is invalid: "
            + "; ".join(errors_with_independent)
        )

    records_dir = root / RECORDS_DIR
    record_paths = sorted(records_dir.glob("*.json")) if records_dir.exists() else []
    invalid_count = 0
    for path in record_paths:
        try:
            data = load_json(path)
            errors = module.validate_record(data)
        except Exception as exc:
            errors = [str(exc)]
        if errors:
            invalid_count += 1
            result.error(f"external trial record invalid: {path.relative_to(root)}: {'; '.join(errors)}")
    if record_paths and invalid_count == 0:
        result.ok(f"external trial records valid: {len(record_paths)}")
    elif not record_paths:
        result.ok("external trial records directory has no records yet")

    aggregate_text = aggregate_path.read_text(encoding="utf-8")
    missing_tokens = [token for token in sorted(AGGREGATE_TOKENS) if token not in aggregate_text]
    if missing_tokens:
        result.error(f"external trial aggregate missing tokens: {', '.join(missing_tokens)}")
    else:
        result.ok("external trial aggregate includes required boundary tokens")

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
            print(f"External trial records check failed: {len(result.errors)} error(s)")
        else:
            print("External trial records check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
