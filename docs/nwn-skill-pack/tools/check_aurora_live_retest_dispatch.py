#!/usr/bin/env python3
"""Check the generated Aurora live retest dispatch."""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType


DISPATCH_PATH = Path("knowledge-inbox/aurora-live-retest-dispatch.md")
GENERATED_RE = re.compile(r"^Generated: .+$", re.MULTILINE)


@dataclass
class RetestDispatchCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def normalize(text: str) -> str:
    return GENERATED_RE.sub("Generated: <ignored>", text).replace("\r\n", "\n")


def load_module(path: Path, name: str) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def write_hold_fixture(outcome_dir: Path) -> Path:
    record = {
        "schema_version": "1",
        "id": "alro-fixture-retest-dispatch",
        "created_at": "2026-06-19T06:21:14+00:00",
        "live_record_id": "aurora-live-fixture-retest-dispatch",
        "live_record_path": "knowledge-inbox/aurora-live-records/aurora-live-fixture-retest-dispatch.json",
        "evidence_manifest_path": (
            "knowledge-inbox/aurora-live-evidence-manifests/"
            "aurora-live-evidence-manifest-fixture-retest-dispatch.json"
        ),
        "reviewer": "fixture-maintainer",
        "outcome": "hold-for-retest",
        "decision_summary": "Synthetic hold outcome requiring one focused operator retest.",
        "promotion_proposal_path": "",
        "reference_promotion_allowed": False,
        "accepted_atoms": [],
        "held_atoms": ["toolset.buildAndClientRun"],
        "rejected_atoms": [],
        "blocked_atoms": ["toolset.buildAndClientRun: missing client log and server log."],
        "visual_redaction_record_ids": [],
        "checks_run": ["check_aurora_live_records.py"],
        "checks_passed": ["check_aurora_live_records.py"],
        "privacy_findings": [],
        "schema_expansion_candidates": [],
        "next_actions": ["Repeat Minimum First Live Pass for build and client runtime evidence."],
        "non_proof_boundaries": [
            "Review outcome records do not prove Aurora Toolset behavior or NWN runtime behavior."
        ],
        "notes": "Synthetic retest dispatch fixture; not live evidence.",
    }
    outcome_dir.mkdir(parents=True, exist_ok=True)
    path = outcome_dir / "alro-fixture-retest-dispatch.json"
    path.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    return path


def check_hold_fixture(root: Path, generator: ModuleType, result: RetestDispatchCheck) -> None:
    with tempfile.TemporaryDirectory(prefix="aurora-live-retest-dispatch-fixture-") as tmp:
        outcome_dir = Path(tmp) / "review-outcomes"
        write_hold_fixture(outcome_dir)
        data = generator.collect(root, outcome_dir)
        report = generator.render(root, outcome_dir)

    if len(data["held"]) == 1 and not data["invalid"]:
        result.ok("synthetic hold-for-retest outcome is collected for retest dispatch")
    else:
        result.error("synthetic hold-for-retest outcome was not collected for retest dispatch")

    required_tokens = [
        "Status: `retest-requests-ready`",
        "Retest 1: `toolset.buildAndClientRun`",
        "alro-fixture-retest-dispatch",
        "Operator Message",
        "Please rerun only the smallest missing Aurora/NWN evidence atom below.",
        "Target atom: toolset.buildAndClientRun",
        "client log and server log",
        "knowledge-inbox/aurora-live-retest-result-template.md",
        "private module, player, account, token, and IP data",
        "not skill knowledge",
        "not runtime proof",
        "not release readiness",
        "Do not edit the skill references directly from this dispatch.",
    ]
    for token in required_tokens:
        if token not in report:
            result.error(f"synthetic hold-for-retest dispatch missing token: {token}")
    if not any(error.startswith("synthetic hold-for-retest") for error in result.errors):
        result.ok("synthetic hold-for-retest dispatch renders a focused operator message")


def run(root: Path) -> RetestDispatchCheck:
    result = RetestDispatchCheck()
    path = root / DISPATCH_PATH
    if not path.exists():
        result.error(f"{DISPATCH_PATH} is missing")
        return result

    text = path.read_text(encoding="utf-8")
    required_tokens = [
        "Aurora Live Retest Dispatch",
        "Status: `",
        "Review outcome records:",
        "Held review outcomes:",
        "Retest Dispatch Items",
        "No active retest requests",
        "hold-for-retest",
        "smallest missing atom",
        "not skill knowledge",
        "not runtime proof",
        "not release readiness",
        "aurora_live_review_outcome_record.py validate",
        "generate_aurora_live_review_queue.py",
        "check_aurora_live_review_queue.py",
        "generate_aurora_live_retest_dispatch.py",
        "check_aurora_live_retest_dispatch.py",
        "check_aurora_live_retest_result_template.py",
        "knowledge-inbox/aurora-live-retest-result-template.md",
        "Do not edit the skill references directly from this dispatch.",
        "Still Hypothesis",
    ]
    for token in required_tokens:
        if token not in text:
            result.error(f"{DISPATCH_PATH} missing token: {token}")
    if not result.errors:
        result.ok("Aurora live retest dispatch includes required summary, command, and boundary tokens")

    try:
        generator = load_module(
            root / "tools" / "generate_aurora_live_retest_dispatch.py",
            "generate_aurora_live_retest_dispatch_check",
        )
        current = generator.render(root)
    except Exception as exc:
        result.error(f"Aurora live retest dispatch freshness check failed: {exc}")
        return result

    if normalize(text) == normalize(current):
        result.ok("aurora-live-retest-dispatch.md matches current generated report except timestamp")
    else:
        result.error(
            "aurora-live-retest-dispatch.md is stale; regenerate with tools/generate_aurora_live_retest_dispatch.py"
        )

    try:
        check_hold_fixture(root, generator, result)
    except Exception as exc:
        result.error(f"Aurora live retest dispatch fixture check failed: {exc}")

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
            print(f"Aurora live retest dispatch check failed: {len(result.errors)} error(s)")
        else:
            print("Aurora live retest dispatch check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
