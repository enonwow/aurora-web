#!/usr/bin/env python3
"""Check INSTALL-* install-smoke records against the evidence policy."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType
from typing import Any


RECORD_DIR = Path("forward-tests/records")
EXPECTED_REFS = {
    "nui-player-ui.md",
    "nwscript-events-systems.md",
    "testing-runtime-qa.md",
}
TRUE_INSTALL_FIELDS = [
    "registered_or_installed",
    "fresh_context_started",
    "skill_visible_or_invokable",
    "expected_references_routed",
    "runtime_boundary_preserved",
]


@dataclass
class InstallSmokeRecordCheck:
    checks: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)

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


def base_install_record() -> dict[str, Any]:
    return {
        "schema_version": "1",
        "id": "install-001-install-smoke-record-policy-smoke",
        "created_at": "2026-06-18T00:00:00Z",
        "record_type": "install-smoke-test",
        "test_id": "INSTALL-001",
        "title": "Install smoke record policy smoke",
        "result": "pass",
        "prompt_or_command": "synthetic",
        "skill_path": "docs/nwn-skill-pack/draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev",
        "expected_references": sorted(EXPECTED_REFS),
        "observed_references": sorted(EXPECTED_REFS),
        "evidence_labels": ["install-smoke"],
        "evidence": ["synthetic"],
        "issues": [],
        "missing_evidence": ["No NWN module/runtime evidence; install smoke only."],
        "artifacts": [],
        "feedback_record_ids": [],
        "improvement_action": {
            "needed": False,
            "summary": "",
        },
        "notes": "",
    }


def install_pass_policy_errors(record: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if record.get("record_type") != "install-smoke-test":
        errors.append("record_type is not install-smoke-test")
        return errors
    if not str(record.get("test_id", "")).startswith("INSTALL-"):
        errors.append("test_id must be INSTALL-###")
    if record.get("result") != "pass":
        return errors

    verification = record.get("install_verification")
    if not isinstance(verification, dict):
        errors.append("pass record is missing install_verification")
        return errors

    for field_name in TRUE_INSTALL_FIELDS:
        if verification.get(field_name) is not True:
            errors.append(f"install_verification.{field_name} must be true")
    if verification.get("preparation_only") is not False:
        errors.append("install_verification.preparation_only must be false")

    expected = set(record.get("expected_references", []))
    observed = set(record.get("observed_references", []))
    missing_expected = sorted(EXPECTED_REFS - expected)
    missing_observed = sorted(EXPECTED_REFS - observed)
    for reference in missing_expected:
        errors.append(f"missing expected reference: {reference}")
    for reference in missing_observed:
        errors.append(f"missing observed reference: {reference}")

    labels = set(record.get("evidence_labels", []))
    if "install-smoke" not in labels:
        errors.append("pass record requires evidence label install-smoke")
    missing_evidence = "\n".join(str(item) for item in record.get("missing_evidence", []))
    if "runtime" not in missing_evidence.lower():
        errors.append("pass record must explicitly preserve missing NWN runtime evidence")
    return errors


def run_synthetic_contract(result: InstallSmokeRecordCheck, module: ModuleType) -> None:
    negative = base_install_record()
    negative_errors = module.validate_record(negative)
    if any("install_verification" in error for error in negative_errors):
        result.ok("synthetic install-smoke pass without install_verification is rejected")
    else:
        result.error("synthetic install-smoke pass without install_verification should be rejected")

    positive = base_install_record()
    positive["install_verification"] = {
        "registered_or_installed": True,
        "fresh_context_started": True,
        "skill_visible_or_invokable": True,
        "expected_references_routed": True,
        "runtime_boundary_preserved": True,
        "preparation_only": False,
    }
    positive_errors = module.validate_record(positive)
    positive_errors.extend(install_pass_policy_errors(positive))
    if positive_errors:
        result.error(
            "synthetic install-smoke pass with full verification should be accepted: "
            + "; ".join(positive_errors)
        )
    else:
        result.ok("synthetic install-smoke pass with full verification is accepted")


def check_records(root: Path, result: InstallSmokeRecordCheck, module: ModuleType) -> None:
    record_dir = root / RECORD_DIR
    if not record_dir.is_dir():
        result.warn(f"install-smoke record directory is missing: {RECORD_DIR}")
        return

    install_records = 0
    accepted_passes = 0
    for record_path in sorted(record_dir.glob("*.json")):
        try:
            record = load_json(record_path)
        except Exception as exc:
            result.error(f"{record_path} cannot be read: {exc}")
            continue
        if record.get("record_type") != "install-smoke-test":
            continue

        install_records += 1
        validation_errors = module.validate_record(record)
        for error in validation_errors:
            result.error(f"{record_path}: {error}")

        policy_errors = install_pass_policy_errors(record)
        for error in policy_errors:
            result.error(f"{record_path}: {error}")
        if not validation_errors and not policy_errors and record.get("result") == "pass":
            accepted_passes += 1

    if install_records:
        result.ok(f"install-smoke records found: {install_records}")
    else:
        result.warn("no install-smoke-test records found; install candidate gate remains blocked")

    if accepted_passes:
        result.ok(f"accepted install-smoke pass records found: {accepted_passes}")
    else:
        result.warn("no accepted install-smoke pass record found")


def run(root: Path) -> InstallSmokeRecordCheck:
    result = InstallSmokeRecordCheck()
    try:
        module = load_module(root / "tools" / "forward_test_record.py", "forward_test_record_install_policy")
    except Exception as exc:
        result.error(f"could not import forward_test_record.py: {exc}")
        return result

    run_synthetic_contract(result, module)
    check_records(root, result, module)
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    result = run(Path(args.root))
    if args.json:
        print(json.dumps({
            "checks": result.checks,
            "warnings": result.warnings,
            "errors": result.errors,
        }, indent=2))
    else:
        for check in result.checks:
            print(f"OK: {check}")
        for warning in result.warnings:
            print(f"WARN: {warning}")
        for error in result.errors:
            print(f"ERROR: {error}")
        if result.errors:
            print(f"Install-smoke record check failed: {len(result.errors)} error(s)")
        else:
            suffix = f", {len(result.warnings)} warning(s)" if result.warnings else ""
            print(f"Install-smoke record check passed{suffix}")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
