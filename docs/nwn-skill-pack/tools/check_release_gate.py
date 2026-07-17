#!/usr/bin/env python3
"""Check staged release gates for the NWN skill pack."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


TARGETS = {
    "repo-artifact",
    "release-candidate",
    "install-candidate",
    "public-release",
}

COVERAGE_RULES = {
    "NUI": {"nui-player-ui.md"},
    "2DA/HAK/TLK or packaging": {
        "two-da-hak-tlk-pipeline.md",
        "deployment-nwsync-ops.md",
    },
    "runtime QA": {"testing-runtime-qa.md"},
    "economy/progression": {"economy-crafting-progression.md"},
    "human feedback contribution": {"feedback-and-versioning.md"},
}
FRESH_CONTEXT_TOKENS = ["fresh context", "clean session", "fresh codex"]
NO_LEAK_TOKENS = [
    "no expected-answer leakage",
    "no-answer-leak",
    "no expected references",
]
CAPTURE_ARTIFACT_TOKENS = [
    "answer-capture",
    "answer capture",
    "raw answer",
    "transcript",
]
RETURNED_CAPTURE_ARTIFACT_TOKENS = [
    "forward-test-return-captures",
]
CONTAMINATION_TOKENS = [
    "contaminated",
    "saw reviewer-only",
    "with expected-answer leakage",
    "leaked expected answer",
    "leaked expected references",
]
INSTALL_SMOKE_TRUE_FIELDS = [
    "registered_or_installed",
    "fresh_context_started",
    "skill_visible_or_invokable",
    "expected_references_routed",
    "runtime_boundary_preserved",
]


@dataclass
class GateReport:
    target: str
    checks: list[str] = field(default_factory=list)
    blockers: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def block(self, message: str) -> None:
        self.blockers.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def load_module(path: Path, name: str) -> Any:
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not import {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def load_records(root: Path) -> list[dict[str, Any]]:
    record_dir = root / "forward-tests" / "records"
    if not record_dir.is_dir():
        return []
    records: list[dict[str, Any]] = []
    for path in sorted(record_dir.glob("*.json")):
        try:
            record = load_json(path)
        except Exception:
            continue
        record["_path"] = str(path)
        records.append(record)
    return records


def reference_set(record: dict[str, Any]) -> set[str]:
    refs: set[str] = set()
    for field_name in ("expected_references", "observed_references"):
        value = record.get(field_name, [])
        if isinstance(value, list):
            refs.update(str(item).replace("\\", "/").split("/")[-1] for item in value)
    return refs


def text_contains_any(value: str, tokens: list[str]) -> bool:
    lowered = value.lower()
    return any(token in lowered for token in tokens)


def record_text(record: dict[str, Any], field_names: list[str]) -> str:
    parts: list[str] = []
    for field_name in field_names:
        value = record.get(field_name)
        if isinstance(value, str):
            parts.append(value)
        elif isinstance(value, list):
            parts.extend(str(item) for item in value)
    return "\n".join(parts)


def prompt_record_acceptance_errors(record: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if record.get("record_type") != "prompt-forward-test":
        errors.append("record is not a prompt-forward-test")
        return errors

    if record.get("result") not in {"pass", "partial"}:
        errors.append("result is not pass or partial")

    reviewer_assertions = record.get("reviewer_assertions")
    if not isinstance(reviewer_assertions, dict):
        errors.append("missing reviewer_assertions object")
    elif reviewer_assertions.get("first_implementable_slice") is not True:
        errors.append("reviewer did not confirm First Implementable Slice")

    context = str(record.get("context", ""))
    if not text_contains_any(context, FRESH_CONTEXT_TOKENS):
        errors.append("context does not state fresh context or clean session")
    if not text_contains_any(context, NO_LEAK_TOKENS):
        errors.append("context does not state no expected-answer leakage")

    artifact_text = record_text(record, ["artifacts"])
    if not text_contains_any(artifact_text, CAPTURE_ARTIFACT_TOKENS):
        errors.append("missing answer capture artifact or raw transcript path")
    if not text_contains_any(artifact_text, RETURNED_CAPTURE_ARTIFACT_TOKENS):
        errors.append("missing returned capture sheet artifact path")

    contamination_text = record_text(record, ["context", "evidence", "issues", "notes"])
    if text_contains_any(contamination_text, CONTAMINATION_TOKENS):
        errors.append("record describes contamination or expected-answer leakage")

    return errors


def install_smoke_acceptance_errors(record: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if record.get("record_type") != "install-smoke-test":
        errors.append("record is not an install-smoke-test")
        return errors
    if record.get("result") != "pass":
        errors.append("result is not pass")
    if not str(record.get("test_id", "")).startswith("INSTALL-"):
        errors.append("test_id is not INSTALL-###")

    verification = record.get("install_verification")
    if not isinstance(verification, dict):
        errors.append("missing install_verification object")
        return errors

    for field_name in INSTALL_SMOKE_TRUE_FIELDS:
        if verification.get(field_name) is not True:
            errors.append(f"install_verification.{field_name} is not true")
    if verification.get("preparation_only") is not False:
        errors.append("install_verification.preparation_only is not false")
    return errors


def accepted_prompt_forward_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        record for record in records
        if not prompt_record_acceptance_errors(record)
    ]


def has_coverage(records: list[dict[str, Any]], expected_refs: set[str]) -> bool:
    for record in records:
        if reference_set(record) & expected_refs:
            return True
    return False


def handoff_state(path: Path) -> str:
    if not path.exists():
        return ""
    marker = "Current draft package state:"
    for line in path.read_text(encoding="utf-8").splitlines():
        if marker in line:
            raw_state = line.split(marker, 1)[1].strip()
            if "`" in raw_state:
                parts = raw_state.split("`")
                if len(parts) >= 3:
                    return parts[1].strip()
            return raw_state.strip("`").rstrip(".").strip()
    return ""


def configured_handoff_path(root: Path, manifest: dict[str, Any]) -> Path | None:
    raw_path = manifest.get("release_handoff")
    if not isinstance(raw_path, str) or not raw_path.strip():
        return None
    path = Path(raw_path.strip())
    if path.is_absolute():
        return path
    return root / path


def release_handoff_errors(root: Path) -> list[str]:
    tool_path = root / "tools" / "check_release_handoff.py"
    if not tool_path.exists():
        return ["tools/check_release_handoff.py is missing"]

    try:
        module = load_module(tool_path, "check_release_handoff")
        result = module.run(root, require_filled=True)
    except Exception as exc:
        return [f"release handoff checker failed: {exc}"]
    return list(result.errors)


def aurora_review_outcome_errors(root: Path, record_dir: Path | None = None) -> list[str]:
    tool_path = root / "tools" / "aurora_live_review_outcome_record.py"
    if not tool_path.exists():
        return ["tools/aurora_live_review_outcome_record.py is missing"]

    try:
        tool = load_module(tool_path, "aurora_review_outcome_release_gate")
    except Exception as exc:
        return [f"Aurora live review outcome tool could not be imported: {exc}"]

    records_dir = record_dir or root / "knowledge-inbox" / "aurora-live-review-outcomes" / "records"
    if not records_dir.is_dir():
        return []

    errors: list[str] = []
    for path in sorted(records_dir.glob("*.json")):
        try:
            record_errors = tool.validate_record_with_live_context(load_json(path), root)
        except Exception as exc:
            record_errors = [str(exc)]
        for error in record_errors:
            label = path.relative_to(root) if path.is_relative_to(root) else path
            errors.append(f"{label}: {error}")
    return errors


def evaluate(root: Path, target: str) -> GateReport:
    report = GateReport(target=target)

    manifest_path = root / "version-manifest.json"
    if not manifest_path.exists():
        report.block("version-manifest.json is missing")
        return report

    try:
        manifest = load_json(manifest_path)
    except Exception as exc:
        report.block(f"version-manifest.json could not be read: {exc}")
        return report

    package_state = str(manifest.get("package_state", ""))
    release_gate = manifest.get("release_gate", {})
    manifest_blockers: list[str] = []
    if isinstance(release_gate, dict):
        raw_blockers = release_gate.get("blockers", [])
        if isinstance(raw_blockers, list):
            manifest_blockers = [str(item) for item in raw_blockers]

    records = load_records(root)
    prompt_tests = [
        record for record in records
        if record.get("record_type") == "prompt-forward-test"
        and record.get("result") != "not-run"
    ]
    accepted_prompt_tests = accepted_prompt_forward_records(records)
    rejected_prompt_tests = [
        record for record in prompt_tests
        if prompt_record_acceptance_errors(record)
    ]
    install_smoke_passes = [
        record for record in records
        if record.get("record_type") == "install-smoke-test"
        and record.get("result") == "pass"
        and not install_smoke_acceptance_errors(record)
    ]
    rejected_install_smoke_passes = [
        record for record in records
        if record.get("record_type") == "install-smoke-test"
        and record.get("result") == "pass"
        and install_smoke_acceptance_errors(record)
    ]
    failed_records = [record for record in records if record.get("result") == "fail"]
    partial_without_action = [
        record for record in records
        if record.get("result") == "partial"
        and not (
            isinstance(record.get("improvement_action"), dict)
            and record["improvement_action"].get("needed")
        )
    ]

    if package_state:
        report.ok(f"manifest package_state is {package_state!r}")
    else:
        report.block("manifest package_state is missing")

    if records:
        report.ok(f"forward-test records found: {len(records)}")
    else:
        report.warn("no forward-test records found")

    if failed_records:
        report.block(f"failed forward-test records: {len(failed_records)}")
    else:
        report.ok("no failed forward-test records")

    if partial_without_action:
        report.block(
            f"partial records without improvement action: {len(partial_without_action)}"
        )
    else:
        report.ok("all partial records have improvement actions")

    review_outcome_errors = aurora_review_outcome_errors(root)
    if review_outcome_errors:
        for error in review_outcome_errors:
            report.block(f"Aurora live review outcome: {error}")
    else:
        report.ok("Aurora live review outcome records contextually validate")

    if target == "repo-artifact":
        if package_state != "repo artifact":
            report.warn(f"repo-artifact target checked while package_state is {package_state!r}")
        if manifest_blockers:
            report.warn(f"manifest still lists blockers: {len(manifest_blockers)}")
        return report

    if rejected_prompt_tests:
        report.warn(
            f"prompt forward tests rejected by evidence policy: {len(rejected_prompt_tests)}"
        )

    if len(accepted_prompt_tests) >= 3:
        report.ok(f"accepted prompt forward tests run: {len(accepted_prompt_tests)}")
    else:
        report.block(
            f"accepted prompt forward tests run: {len(accepted_prompt_tests)}; required: 3"
        )

    for label, refs in COVERAGE_RULES.items():
        if has_coverage(accepted_prompt_tests, refs):
            report.ok(f"coverage present: {label}")
        else:
            report.block(f"coverage missing: {label}")

    if isinstance(release_gate, dict) and release_gate.get("rc_allowed"):
        report.ok("version manifest allows RC")
    else:
        report.block("version manifest does not allow RC")

    for blocker in manifest_blockers:
        report.block(f"manifest blocker: {blocker}")

    handoff_path = configured_handoff_path(root, manifest)
    if handoff_path is None:
        report.block("version manifest does not configure a concrete release_handoff path")
        state = ""
    else:
        report.ok(f"release handoff path is {handoff_path.relative_to(root) if handoff_path.is_relative_to(root) else handoff_path}")
        state = handoff_state(handoff_path)
    if state and state != "repo artifact":
        report.ok(f"handoff package state is {state!r}")
    else:
        report.block("release handoff is still marked as repo artifact or unfilled")
    for error in release_handoff_errors(root):
        report.block(f"release handoff: {error}")

    if target == "release-candidate":
        return report

    if rejected_install_smoke_passes:
        report.warn(
            f"install-smoke pass records rejected by evidence policy: {len(rejected_install_smoke_passes)}"
        )

    if install_smoke_passes:
        report.ok(f"passed install smoke tests: {len(install_smoke_passes)}")
    else:
        report.block("no passed install-smoke-test record")

    if target == "install-candidate":
        return report

    if package_state == "public release":
        report.ok("manifest package_state is public release")
    else:
        report.block("manifest package_state is not public release")

    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument(
        "--target",
        default="release-candidate",
        choices=sorted(TARGETS),
        help="Release stage to evaluate.",
    )
    parser.add_argument("--json", action="store_true", help="Emit JSON report.")
    args = parser.parse_args()

    report = evaluate(Path(args.root), args.target)

    if args.json:
        print(json.dumps({
            "target": report.target,
            "checks": report.checks,
            "warnings": report.warnings,
            "blockers": report.blockers,
            "passed": not report.blockers,
        }, indent=2))
    else:
        for check in report.checks:
            print(f"OK: {check}")
        for warning in report.warnings:
            print(f"WARN: {warning}")
        for blocker in report.blockers:
            print(f"BLOCKED: {blocker}")
        if report.blockers:
            print(f"Release gate blocked for {report.target}: {len(report.blockers)} blocker(s)")
        else:
            print(f"Release gate passed for {report.target}")

    return 1 if report.blockers else 0


if __name__ == "__main__":
    sys.exit(main())
