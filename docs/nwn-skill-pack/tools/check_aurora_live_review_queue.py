#!/usr/bin/env python3
"""Check whether aurora-live-review-queue.md matches submitted Aurora live records."""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path


QUEUE_PATH = Path("knowledge-inbox/aurora-live-review-queue.md")
TEMPLATE_PATH = Path("knowledge-inbox/templates/aurora-toolset-live-record-template.json")
GENERATED_RE = re.compile(r"^Generated: .+$", re.MULTILINE)


@dataclass
class AuroraLiveReviewQueueCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def normalize(text: str) -> str:
    return GENERATED_RE.sub("Generated: <ignored>", text).replace("\r\n", "\n")


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def load_generator(root: Path):
    tool_path = root / "tools" / "generate_aurora_live_review_queue.py"
    if not tool_path.exists():
        raise FileNotFoundError(f"Aurora live review queue generator is missing: {tool_path}")
    spec = importlib.util.spec_from_file_location("generate_aurora_live_review_queue", tool_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not import Aurora live review queue generator: {tool_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    if not hasattr(module, "generate") or not hasattr(module, "collect"):
        raise RuntimeError("Aurora live review queue generator does not expose generate(root) and collect(root)")
    return module


def write_prepared_only_fixture(root: Path, records_dir: Path) -> Path:
    record = load_json(root / TEMPLATE_PATH)
    record["id"] = "aurora-live-prepared-only-fixture"
    record["created_at"] = "2026-06-19T04:19:42Z"
    record["operator"] = "checker-fixture"
    environment = record.setdefault("environment", {})
    environment["toolset_version"] = "fixture-toolset"
    environment["nwn_version"] = "fixture-nwn"
    environment["module_path_or_copy_id"] = "disposable-fixture-module"
    environment["hak_list"] = []
    environment["custom_tlk"] = ""
    environment["screenshots_folder"] = "fixture/screenshots"
    environment["log_folder"] = "fixture/logs"
    record["overall_result"] = "not-run"
    promotion = record.setdefault("promotion", {})
    promotion["candidate_references"] = [
        "draft-skills/nwn-server-gamedev/references/locations-areas-tilesets.md"
    ]
    promotion["requires_reference_promotion_proposal"] = True
    promotion["notes"] = "Synthetic checker fixture; not live evidence."
    for atom in record.get("atoms", []):
        if not isinstance(atom, dict):
            continue
        atom["status"] = "not-run"
        atom["evidence_label"] = "local-reverse-lead"
        atom["observations"] = []
        atom["artifacts"] = []
        atom["blockers"] = []
        atom["promotion_ready"] = False

    records_dir.mkdir(parents=True, exist_ok=True)
    out = records_dir / "aurora-live-prepared-only-fixture.json"
    out.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    return out


def write_hold_review_outcome_fixture(review_outcome_dir: Path) -> Path:
    record = {
        "schema_version": "1",
        "id": "alro-fixture-retest-request",
        "created_at": "2026-06-19T06:14:44+00:00",
        "live_record_id": "aurora-live-fixture-retest",
        "live_record_path": "knowledge-inbox/aurora-live-records/aurora-live-fixture-retest.json",
        "evidence_manifest_path": (
            "knowledge-inbox/aurora-live-evidence-manifests/"
            "aurora-live-evidence-manifest-fixture-retest.json"
        ),
        "reviewer": "fixture-maintainer",
        "outcome": "hold-for-retest",
        "decision_summary": "Synthetic hold outcome requiring a retest request.",
        "promotion_proposal_path": "",
        "reference_promotion_allowed": False,
        "accepted_atoms": [],
        "held_atoms": ["toolset.buildAndClientRun"],
        "rejected_atoms": [],
        "blocked_atoms": ["toolset.buildAndClientRun: missing client log"],
        "visual_redaction_record_ids": [],
        "checks_run": ["check_aurora_live_records.py"],
        "checks_passed": ["check_aurora_live_records.py"],
        "privacy_findings": [],
        "schema_expansion_candidates": [],
        "next_actions": ["Repeat Minimum First Live Pass with client/server logs."],
        "non_proof_boundaries": [
            "Review outcome records do not prove Aurora Toolset behavior or NWN runtime behavior."
        ],
        "notes": "Synthetic queue fixture; not live evidence.",
    }

    review_outcome_dir.mkdir(parents=True, exist_ok=True)
    out = review_outcome_dir / "alro-fixture-retest-request.json"
    out.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    return out


def write_partial_unready_fixture(root: Path, records_dir: Path) -> Path:
    record = load_json(root / TEMPLATE_PATH)
    record["id"] = "aurora-live-partial-unready-fixture"
    record["created_at"] = "2026-06-19T04:26:42Z"
    record["operator"] = "checker-fixture"
    environment = record.setdefault("environment", {})
    environment["toolset_version"] = "fixture-toolset"
    environment["nwn_version"] = "fixture-nwn"
    environment["module_path_or_copy_id"] = "disposable-partial-fixture-module"
    environment["hak_list"] = []
    environment["custom_tlk"] = ""
    environment["screenshots_folder"] = "fixture/screenshots"
    environment["log_folder"] = "fixture/logs"
    record["overall_result"] = "partial"
    promotion = record.setdefault("promotion", {})
    promotion["candidate_references"] = [
        "draft-skills/nwn-server-gamedev/references/locations-areas-tilesets.md"
    ]
    promotion["requires_reference_promotion_proposal"] = True
    promotion["notes"] = "Synthetic partial-unready fixture; not promotion material."
    for atom in record.get("atoms", []):
        if not isinstance(atom, dict):
            continue
        atom["status"] = "not-run"
        atom["evidence_label"] = "local-reverse-lead"
        atom["observations"] = []
        atom["artifacts"] = []
        atom["blockers"] = []
        atom["promotion_ready"] = False
        if atom.get("atom") == "area.createWithWizard":
            atom["status"] = "observed-toolset"
            atom["evidence_label"] = "toolset-observed"
            atom["observations"] = [
                "Synthetic fixture observation; not real Toolset evidence.",
            ]
            atom["artifacts"] = [
                "fixture/screenshots/area-create-with-wizard.png",
            ]

    records_dir.mkdir(parents=True, exist_ok=True)
    out = records_dir / "aurora-live-partial-unready-fixture.json"
    out.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    return out


def check_prepared_only_fixture(root: Path, generator_module, result: AuroraLiveReviewQueueCheck) -> None:
    with tempfile.TemporaryDirectory(prefix="aurora-live-review-queue-fixture-") as tmp:
        records_dir = Path(tmp) / "records"
        review_outcome_dir = Path(tmp) / "review-outcomes"
        write_prepared_only_fixture(root, records_dir)
        data = generator_module.collect(root, records_dir, review_outcome_dir)
        report = generator_module.generate(root, records_dir, review_outcome_dir)

    if len(data["valid"]) == 1 and data["initialized_only"] == 1:
        result.ok("synthetic prepared-only live record is counted as initialized-only in review queue")
    else:
        result.error("synthetic prepared-only live record was not counted as initialized-only in review queue")
    required_tokens = [
        "Status: `prepared-only-no-review`",
        "Submitted JSON records: `1`",
        "Valid records: `1`",
        "Initialized-only records: `1`",
        "Promotion-ready atom rows: `0`",
        "Label-risk rows: `0`",
        "wait for returned observations, artifacts, and redaction review",
    ]
    for token in required_tokens:
        if token not in report:
            result.error(f"synthetic prepared-only review queue missing token: {token}")
    if not any(error.startswith("synthetic prepared-only") for error in result.errors):
        result.ok("synthetic prepared-only review queue stays out of promotion review")


def check_partial_unready_fixture(root: Path, generator_module, result: AuroraLiveReviewQueueCheck) -> None:
    with tempfile.TemporaryDirectory(prefix="aurora-live-review-queue-partial-fixture-") as tmp:
        records_dir = Path(tmp) / "records"
        review_outcome_dir = Path(tmp) / "review-outcomes"
        write_partial_unready_fixture(root, records_dir)
        data = generator_module.collect(root, records_dir, review_outcome_dir)
        report = generator_module.generate(root, records_dir, review_outcome_dir)

    if len(data["valid"]) == 1 and data["initialized_only"] == 0:
        result.ok("synthetic partial-unready live record is not counted as initialized-only in review queue")
    else:
        result.error("synthetic partial-unready live record was miscounted as initialized-only in review queue")
    required_tokens = [
        "Status: `records-present-no-promotion-ready`",
        "Submitted JSON records: `1`",
        "Valid records: `1`",
        "Initialized-only records: `0`",
        "Promotion-ready atom rows: `0`",
        "Label-risk rows: `0`",
        "`observed-toolset`: `1`",
        "`toolset-observed`: `1`",
        "No promotion-ready atom rows are waiting for review.",
    ]
    for token in required_tokens:
        if token not in report:
            result.error(f"synthetic partial-unready review queue missing token: {token}")
    if not any(error.startswith("synthetic partial-unready") for error in result.errors):
        result.ok("synthetic partial-unready review queue stays out of promotion review")


def check_hold_review_outcome_fixture(root: Path, generator_module, result: AuroraLiveReviewQueueCheck) -> None:
    with tempfile.TemporaryDirectory(prefix="aurora-live-review-queue-hold-fixture-") as tmp:
        records_dir = Path(tmp) / "records"
        review_outcome_dir = Path(tmp) / "review-outcomes"
        records_dir.mkdir(parents=True, exist_ok=True)
        write_hold_review_outcome_fixture(review_outcome_dir)
        data = generator_module.collect(root, records_dir, review_outcome_dir)
        report = generator_module.generate(root, records_dir, review_outcome_dir)

    if len(data["review_outcomes"]) == 1 and len(data["held_review_outcomes"]) == 1:
        result.ok("synthetic held review outcome is counted as a retest request")
    else:
        result.error("synthetic held review outcome was not counted as a retest request")
    required_tokens = [
        "Status: `retest-request-needed`",
        "Review outcome records: `1`",
        "Held review outcomes: `1`",
        "Retest Requests",
        "alro-fixture-retest-request",
        "toolset.buildAndClientRun",
        "Repeat Minimum First Live Pass",
        "smallest missing atom",
        "not skill knowledge",
    ]
    for token in required_tokens:
        if token not in report:
            result.error(f"synthetic held review outcome queue missing token: {token}")
    if not any(error.startswith("synthetic held review outcome") for error in result.errors):
        result.ok("synthetic held review outcome becomes retest dispatch instead of promotion review")


def run(root: Path) -> AuroraLiveReviewQueueCheck:
    result = AuroraLiveReviewQueueCheck()
    path = root / QUEUE_PATH
    if not path.exists():
        result.error(f"{QUEUE_PATH} is missing")
        return result

    text = path.read_text(encoding="utf-8")
    required_tokens = [
        "Aurora Live Record Review Queue",
        "Status: `",
        "Submitted JSON records:",
        "Valid records:",
        "Invalid records:",
        "Review outcome records:",
        "Held review outcomes:",
        "Initialized-only records:",
        "Promotion-ready atom rows:",
        "Label-risk rows:",
        "Required Review Gate",
        "aurora-live-record-review-checklist.md",
        "screen-backed",
        "symbol-only",
        "toolset-observed",
        "runtime-tested",
        "raw decompilation",
        "Review Outcome Counts",
        "Retest Requests",
        "retest-request-needed",
        "hold-for-retest",
        "Promotion Review Queue",
        "Label Risks",
        "Blockers",
        "prepared-only-no-review",
        "wait for returned observations, artifacts, and redaction review",
        "aurora_live_review_outcome_record.py validate",
        "check_aurora_live_review_outcome_records.py",
        "smallest missing atom",
        "not skill knowledge",
        "check_aurora_live_review_queue.py",
        "not proof by itself",
    ]
    for token in required_tokens:
        if token not in text:
            result.error(f"{QUEUE_PATH} missing token: {token}")
    if not result.errors:
        result.ok("Aurora live review queue includes required summary, review-gate, evidence-label, and privacy-boundary tokens")

    try:
        generator = load_generator(root)
        current = generator.generate(root)
    except Exception as exc:
        result.error(f"Aurora live review queue freshness check failed: {exc}")
        return result

    if normalize(text) == normalize(current):
        result.ok("aurora-live-review-queue.md matches current generated report except timestamp")
    else:
        result.error(
            "aurora-live-review-queue.md is stale; regenerate with tools/generate_aurora_live_review_queue.py"
        )

    try:
        check_prepared_only_fixture(root, generator, result)
    except Exception as exc:
        result.error(f"Aurora live review queue prepared-only fixture check failed: {exc}")

    try:
        check_partial_unready_fixture(root, generator, result)
    except Exception as exc:
        result.error(f"Aurora live review queue partial-unready fixture check failed: {exc}")

    try:
        check_hold_review_outcome_fixture(root, generator, result)
    except Exception as exc:
        result.error(f"Aurora live review queue held review outcome fixture check failed: {exc}")

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
            print(f"Aurora live review queue check failed: {len(result.errors)} error(s)")
        else:
            print("Aurora live review queue check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
