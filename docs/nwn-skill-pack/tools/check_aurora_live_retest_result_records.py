#!/usr/bin/env python3
"""Check Aurora live retest result record tooling and aggregate."""

from __future__ import annotations

import argparse
import importlib.util
import json
import shutil
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType
from typing import Any


SCHEMA = Path("knowledge-inbox/schema/aurora-live-retest-result-record.schema.json")
TEMPLATE = Path("knowledge-inbox/templates/aurora-live-retest-result-record-template.json")
AGGREGATE = Path("knowledge-inbox/aurora-live-retest-results/aggregate.md")
RECORDS_DIR = Path("knowledge-inbox/aurora-live-retest-results/records")
SCRATCH = Path(".codex-tmp/aurora-live-retest-result-records")
REQUIRED_TEMPLATE_TOKENS = [
    "alrr-YYYYMMDD-small-location-first-pass-toolset-build",
    "alro-YYYYMMDD-small-location-first-pass",
    "aurora-live-YYYYMMDD-small-location-first-pass",
    "aurora-live-evidence-manifest-YYYYMMDD-small-location-first-pass.json",
]
STALE_TEMPLATE_TOKENS = [
    "alrr-YYYYMMDD-small-location-toolset-build",
    "alro-YYYYMMDD-small-location\"",
    "aurora-live-YYYYMMDD-small-location\"",
    "aurora-live-YYYYMMDD-small-location.json",
    "aurora-live-evidence-manifest-YYYYMMDD-small-location.json",
]


@dataclass
class RetestResultRecordsCheck:
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


def require_text(result: RetestResultRecordsCheck, text: str, token: str, label: str) -> None:
    if token in text:
        result.ok(f"{label} includes {token}")
    else:
        result.error(f"{label} missing token: {token}")


def ensure_inside(root: Path, path: Path) -> None:
    resolved_root = root.resolve()
    resolved = path.resolve()
    if resolved != resolved_root and resolved_root not in resolved.parents:
        raise ValueError(f"refusing path outside package root: {path}")


def fixture_record(result: str) -> dict[str, Any]:
    target_atom = "toolset.buildAndClientRun"
    record = {
        "schema_version": "1",
        "id": f"alrr-fixture-{result}",
        "created_at": "2026-06-19T06:44:44Z",
        "source_dispatch_path": "knowledge-inbox/aurora-live-retest-dispatch.md",
        "dispatch_manifest_path": ".codex-tmp/aurora-live-retest-operator-bundle/current/RETEST-OPERATOR-BUNDLE-MANIFEST.json",
        "source_review_outcome_id": "alro-fixture-retest-result",
        "source_review_outcome_path": "knowledge-inbox/aurora-live-review-outcomes/records/alro-fixture-retest-result.json",
        "live_record_id": "aurora-live-fixture-retest-result",
        "live_record_path": "knowledge-inbox/aurora-live-records/aurora-live-fixture-retest-result.json",
        "evidence_manifest_path": "knowledge-inbox/aurora-live-evidence-manifests/aurora-live-evidence-manifest-fixture-retest-result.json",
        "target_atom": target_atom,
        "requested_next_action": "Repeat Minimum First Live Pass for build and client runtime evidence.",
        "operator": {
            "handle": "fixture-operator",
            "toolset_version": "fixture-toolset",
            "nwn_ee_version": "fixture-nwn-ee",
            "environment_summary": "synthetic checker environment",
        },
        "result": result,
        "decision_summary": f"Synthetic {result} retest result.",
        "passed_atoms": [],
        "partial_atoms": [],
        "failed_atoms": [],
        "blocked_atoms": [],
        "returned_artifacts": [],
        "artifact_hashes": [],
        "checks_run": [],
        "checks_passed": [],
        "privacy_confirmation": {
            "no_private_data": False,
            "quarantine_required": False,
            "summary": "Synthetic privacy state.",
        },
        "privacy_findings": [],
        "maintainer_verification": {
            "dispatch_check": False,
            "result_template_check": False,
            "records_check": False,
            "evidence_manifest_check": False,
            "intake_consistency_check": False,
            "redaction_policy_check": False,
            "visual_redaction_check": False,
            "notes": "Synthetic verification state.",
        },
        "next_actions": [],
        "non_proof_boundaries": [
            "Retest result records prove maintainer intake process only.",
            "They do not prove screenshot truth, log truth, NWN runtime behavior, redaction completeness, release readiness, or automatic skill improvement.",
        ],
        "notes": "Synthetic checker fixture.",
    }
    if result == "pass":
        record["passed_atoms"] = [target_atom]
        record["returned_artifacts"] = [
            ".codex-tmp/aurora-live-evidence/fixture/logs/client.log",
            ".codex-tmp/aurora-live-evidence/fixture/logs/server.log",
        ]
        record["artifact_hashes"] = [
            {"path": ".codex-tmp/aurora-live-evidence/fixture/logs/client.log", "sha256": "a" * 64},
            {"path": ".codex-tmp/aurora-live-evidence/fixture/logs/server.log", "sha256": "b" * 64},
        ]
        record["checks_run"] = [
            "check_aurora_live_retest_dispatch.py",
            "check_aurora_live_retest_result_template.py",
            "check_aurora_live_records.py",
            "check_aurora_live_evidence_manifest.py",
            "check_aurora_live_intake_consistency.py",
            "check_aurora_live_redaction_policy.py",
            "check_aurora_live_visual_redaction_records.py",
        ]
        record["checks_passed"] = list(record["checks_run"])
        record["privacy_confirmation"] = {
            "no_private_data": True,
            "quarantine_required": False,
            "summary": "Synthetic scrub found no private data.",
        }
        record["maintainer_verification"] = {
            "dispatch_check": True,
            "result_template_check": True,
            "records_check": True,
            "evidence_manifest_check": True,
            "intake_consistency_check": True,
            "redaction_policy_check": True,
            "visual_redaction_check": True,
            "notes": "Synthetic pass verification.",
        }
        record["next_actions"] = ["Run maintainer review outcome intake before promotion."]
    elif result == "blocked":
        record["blocked_atoms"] = [target_atom]
        record["decision_summary"] = "Synthetic blocked retest with exact blocker."
        record["next_actions"] = ["Return exact blocker to maintainer and regenerate retest dispatch."]
    return record


def run_self_test(root: Path, tool: ModuleType, result: RetestResultRecordsCheck) -> None:
    scratch = root / SCRATCH
    ensure_inside(root, scratch)
    if scratch.exists():
        shutil.rmtree(scratch)
    records = scratch / "records"
    records.mkdir(parents=True, exist_ok=True)

    pass_record = fixture_record("pass")
    pass_errors = tool.validate_record(pass_record)
    if pass_errors:
        result.error("synthetic pass retest result record should be accepted: " + "; ".join(pass_errors))
    else:
        result.ok("synthetic pass retest result record is accepted")

    invalid_pass = fixture_record("pass")
    invalid_pass["returned_artifacts"] = []
    invalid_pass["privacy_confirmation"]["no_private_data"] = False
    invalid_errors = tool.validate_record(invalid_pass)
    if (
        any("returned_artifacts" in error for error in invalid_errors)
        and any("no private data" in error for error in invalid_errors)
    ):
        result.ok("synthetic pass without artifacts and privacy clearance is rejected")
    else:
        result.error("synthetic pass without artifacts and privacy clearance should be rejected")

    blocked_record = fixture_record("blocked")
    blocked_errors = tool.validate_record(blocked_record)
    if blocked_errors:
        result.error("synthetic blocked retest result record should be accepted: " + "; ".join(blocked_errors))
    else:
        result.ok("synthetic blocked retest result record is accepted")

    for record in [pass_record, blocked_record]:
        (records / f"{record['id']}.json").write_text(
            json.dumps(record, indent=2) + "\n",
            encoding="utf-8",
        )
    aggregate_path = scratch / "aggregate.md"
    aggregate_args = argparse.Namespace(
        input=str(records),
        out=str(aggregate_path),
        include_invalid=False,
    )
    exit_code = tool.command_aggregate(aggregate_args)
    if exit_code != 0:
        result.error("synthetic retest result aggregate command failed")
        return
    text = aggregate_path.read_text(encoding="utf-8")
    for token in [
        "Aurora Live Retest Result Records Aggregate",
        "`pass`: 1",
        "`blocked`: 1",
        "toolset.buildAndClientRun",
        "automatic skill improvement",
    ]:
        require_text(result, text, token, "synthetic retest result aggregate")


def run(root: Path) -> RetestResultRecordsCheck:
    result = RetestResultRecordsCheck()
    for path, label in [
        (root / SCHEMA, "Aurora live retest result schema"),
        (root / TEMPLATE, "Aurora live retest result record template"),
        (root / AGGREGATE, "Aurora live retest result aggregate"),
    ]:
        if path.exists():
            result.ok(f"{label} exists")
        else:
            result.error(f"{label} is missing: {path}")

    try:
        tool = load_module(root / "tools" / "aurora_live_retest_result_record.py", "aurora_live_retest_result_record_check")
    except Exception as exc:
        result.error(f"cannot import Aurora live retest result record tool: {exc}")
        return result

    try:
        schema = load_json(root / SCHEMA)
        template = load_json(root / TEMPLATE)
    except Exception as exc:
        result.error(f"could not read retest result schema/template: {exc}")
        return result

    if set(schema.get("required", [])) == set(tool.REQUIRED_FIELDS):
        result.ok("retest result schema required fields match tool")
    else:
        result.error("retest result schema required fields differ from tool")

    enum = schema.get("properties", {}).get("result", {}).get("enum", [])
    if set(enum) == set(tool.ALLOWED_RESULTS):
        result.ok("retest result schema result enum matches tool")
    else:
        result.error("retest result schema result enum differs from tool")

    template_errors = tool.validate_record(template)
    if template_errors:
        result.error("retest result not-run template should be accepted: " + "; ".join(template_errors))
    else:
        result.ok("retest result not-run template is accepted")
    template_text = (root / TEMPLATE).read_text(encoding="utf-8")
    missing = [token for token in REQUIRED_TEMPLATE_TOKENS if token not in template_text]
    if missing:
        result.error("retest result template missing first-pass tokens: " + ", ".join(missing))
    else:
        result.ok("retest result template includes first-pass id/path tokens")
    stale = [token for token in STALE_TEMPLATE_TOKENS if token in template_text]
    if stale:
        result.error("retest result template contains stale pre-first-pass tokens: " + ", ".join(stale))
    else:
        result.ok("retest result template does not contain stale pre-first-pass path tokens")

    try:
        run_self_test(root, tool, result)
    except Exception as exc:
        result.error(f"retest result record self-test failed: {exc}")

    records_dir = root / RECORDS_DIR
    if records_dir.exists():
        for path in sorted(records_dir.glob("*.json")):
            try:
                errors = tool.validate_record(load_json(path))
            except Exception as exc:
                errors = [str(exc)]
            if errors:
                result.error(f"real retest result record is invalid: {path}: {'; '.join(errors)}")
        if not result.errors:
            result.ok("real retest result records validate")
    else:
        result.ok("real retest result records directory is absent; no real retest results yet")

    aggregate_text = (root / AGGREGATE).read_text(encoding="utf-8") if (root / AGGREGATE).exists() else ""
    for token in [
        "Aurora Live Retest Result Records Aggregate",
        "Result Counts",
        "Interpretation",
        "automatic skill improvement",
    ]:
        require_text(result, aggregate_text, token, str(AGGREGATE))

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
            print(f"Aurora live retest result records check failed: {len(result.errors)} error(s)")
        else:
            print("Aurora live retest result records check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
