#!/usr/bin/env python3
"""Check whether aurora-live-status.md matches submitted Aurora live records."""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path


STATUS_PATH = Path("knowledge-inbox/aurora-live-status.md")
TEMPLATE_PATH = Path("knowledge-inbox/templates/aurora-toolset-live-record-template.json")
GENERATED_RE = re.compile(r"^Generated: .+$", re.MULTILINE)


@dataclass
class AuroraLiveStatusCheck:
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
    tool_path = root / "tools" / "generate_aurora_live_status.py"
    if not tool_path.exists():
        raise FileNotFoundError(f"Aurora live status generator is missing: {tool_path}")
    spec = importlib.util.spec_from_file_location("generate_aurora_live_status", tool_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not import Aurora live status generator: {tool_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    if not hasattr(module, "generate") or not hasattr(module, "collect"):
        raise RuntimeError("Aurora live status generator does not expose generate(root) and collect(root)")
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


def check_prepared_only_fixture(root: Path, generator_module, result: AuroraLiveStatusCheck) -> None:
    with tempfile.TemporaryDirectory(prefix="aurora-live-status-fixture-") as tmp:
        records_dir = Path(tmp)
        write_prepared_only_fixture(root, records_dir)
        data = generator_module.collect(root, records_dir)
        report = generator_module.generate(root, records_dir)

    if len(data["valid"]) == 1 and data["initialized_only"] == 1:
        result.ok("synthetic prepared-only live record is counted as initialized-only")
    else:
        result.error("synthetic prepared-only live record was not counted as initialized-only")
    required_tokens = [
        "Status: `prepared-only-no-live-evidence`",
        "Submitted JSON records: `1`",
        "Valid records: `1`",
        "Initialized-only records: `1`",
        "Promotion-ready atoms: `0`",
        "Runtime-tested atoms: `0`",
        "session scaffold exists but the operator has not returned live observations yet",
    ]
    for token in required_tokens:
        if token not in report:
            result.error(f"synthetic prepared-only status report missing token: {token}")
    if not any(error.startswith("synthetic prepared-only") for error in result.errors):
        result.ok("synthetic prepared-only status report preserves scaffold/evidence boundary")


def check_partial_unready_fixture(root: Path, generator_module, result: AuroraLiveStatusCheck) -> None:
    with tempfile.TemporaryDirectory(prefix="aurora-live-status-partial-fixture-") as tmp:
        records_dir = Path(tmp)
        write_partial_unready_fixture(root, records_dir)
        data = generator_module.collect(root, records_dir)
        report = generator_module.generate(root, records_dir)

    if len(data["valid"]) == 1 and data["initialized_only"] == 0:
        result.ok("synthetic partial-unready live record is not counted as initialized-only")
    else:
        result.error("synthetic partial-unready live record was miscounted as initialized-only")
    required_tokens = [
        "Status: `records-present-no-promotion-ready`",
        "Submitted JSON records: `1`",
        "Valid records: `1`",
        "Initialized-only records: `0`",
        "Promotion-ready atoms: `0`",
        "Runtime-tested atoms: `0`",
        "`observed-toolset`: `1`",
        "`toolset-observed`: `1`",
    ]
    for token in required_tokens:
        if token not in report:
            result.error(f"synthetic partial-unready status report missing token: {token}")
    if not any(error.startswith("synthetic partial-unready") for error in result.errors):
        result.ok("synthetic partial-unready status report stays out of promotion/runtime claims")


def run(root: Path) -> AuroraLiveStatusCheck:
    result = AuroraLiveStatusCheck()
    path = root / STATUS_PATH
    if not path.exists():
        result.error(f"{STATUS_PATH} is missing")
        return result

    text = path.read_text(encoding="utf-8")
    required_tokens = [
        "Aurora Toolset Live Evidence Status",
        "Status: `no-evidence-yet`",
        "Submitted JSON records: `0`",
        "Valid records: `0`",
        "Invalid records: `0`",
        "Initialized-only records:",
        "Promotion-ready atoms: `0`",
        "Runtime-tested atoms: `0`",
        "Maintainer Next Actions",
        "prepared-only-no-live-evidence",
        "session scaffold exists but the operator has not returned live observations yet",
        "knowledge-inbox/aurora-live-first-session-command-sheet.md",
        "prepare_aurora_live_session.py",
        "--scenario small-location-first-pass",
        "feature-design-output-template.md",
        "init_aurora_live_record.py",
        "init_aurora_live_evidence_manifest.py",
        "check_aurora_live_records.py",
        "generate_aurora_live_status.py",
        "check_aurora_live_status.py",
        "toolset-observed",
        "runtime-tested",
        "Does Not Prove",
        "release-candidate readiness",
    ]
    for token in required_tokens:
        if token not in text:
            result.error(f"{STATUS_PATH} missing token: {token}")
    if not result.errors:
        result.ok("Aurora live status includes required no-evidence, workflow, and boundary tokens")

    try:
        generator = load_generator(root)
        current = generator.generate(root)
    except Exception as exc:
        result.error(f"Aurora live status freshness check failed: {exc}")
        return result

    if normalize(text) == normalize(current):
        result.ok("aurora-live-status.md matches current generated report except timestamp")
    else:
        result.error(
            "aurora-live-status.md is stale; regenerate with tools/generate_aurora_live_status.py"
        )

    try:
        check_prepared_only_fixture(root, generator, result)
    except Exception as exc:
        result.error(f"Aurora live status prepared-only fixture check failed: {exc}")

    try:
        check_partial_unready_fixture(root, generator, result)
    except Exception as exc:
        result.error(f"Aurora live status partial-unready fixture check failed: {exc}")

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
            print(f"Aurora live status check failed: {len(result.errors)} error(s)")
        else:
            print("Aurora live status check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
