#!/usr/bin/env python3
"""Create maintainer reference-promotion decision records for Aurora live retest results."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from types import ModuleType
from typing import Any


DEFAULT_OUT = Path("knowledge-inbox/reference-promotions/records")
AUTHOR_REF_PREFIX = "draft-skills/nwn-server-gamedev/references/"
PLUGIN_REF_PREFIX = "draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev/references/"
DEFAULT_CHECKS = [
    "check_skill_routes.py authoring",
    "check_skill_routes.py plugin",
    "check_domain_reference_status.py",
    "check_versioning_policy.py",
    "check_plugin_package.py",
    "run_repo_artifact_preflight.py",
]
NON_PROOF_BOUNDARIES = [
    "Reference promotion decision records prove maintainer process only.",
    "They do not prove screenshot truth, log truth, NWN runtime behavior beyond reviewed returned evidence, install behavior, release readiness, or automatic skill improvement.",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def load_module(path: Path, name: str) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def slugify(value: str) -> str:
    import re

    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value[:80] or "promotion-decision"


def normalize_reference_targets(values: list[str]) -> list[str]:
    normalized = [value.replace("\\", "/").strip() for value in values if value.strip()]
    if not normalized:
        return []
    expanded: list[str] = []
    for value in normalized:
        expanded.append(value)
        if value.startswith(AUTHOR_REF_PREFIX):
            expanded.append(PLUGIN_REF_PREFIX + value.removeprefix(AUTHOR_REF_PREFIX))
        elif value.startswith(PLUGIN_REF_PREFIX):
            expanded.append(AUTHOR_REF_PREFIX + value.removeprefix(PLUGIN_REF_PREFIX))
    deduped: list[str] = []
    for value in expanded:
        if value not in deduped:
            deduped.append(value)
    return deduped


def validate_source_retest_result(root: Path, path: Path) -> dict[str, Any]:
    tool = load_module(root / "tools" / "aurora_live_retest_result_record.py", "aurora_retest_promotion_decision_source")
    record = load_json(path)
    errors = tool.validate_record(record)
    if errors:
        raise ValueError("source retest result record is invalid: " + "; ".join(errors))
    return record


def build_record(root: Path, args: argparse.Namespace) -> dict[str, Any]:
    source_path = Path(args.source_retest_result)
    if not source_path.is_absolute():
        source_path = root / source_path
    source = validate_source_retest_result(root, source_path)

    ref_record = load_module(root / "tools" / "reference_promotion_record.py", "reference_promotion_record_decision")
    result = args.result
    accepted = result in {"accepted", "accepted-with-follow-up"}
    target_references = normalize_reference_targets(args.target_reference)
    checks_run = args.check_run or DEFAULT_CHECKS
    checks_passed = args.check_passed or ([] if not accepted else checks_run)
    semver = args.semver if accepted else "NONE"
    evidence_label = "runtime-tested" if accepted else "unverified"

    if accepted and source.get("result") != "pass":
        raise ValueError("accepted promotion decisions require source retest result=result pass")
    if accepted and not target_references:
        raise ValueError("accepted promotion decisions require --target-reference")
    if accepted and not args.references_patched:
        raise ValueError("accepted promotion decisions require --references-patched")
    if accepted and not args.authoring_and_plugin_synced:
        raise ValueError("accepted promotion decisions require --authoring-and-plugin-synced")
    if accepted and not args.privacy_checked:
        raise ValueError("accepted promotion decisions require --privacy-checked")
    if accepted and not args.version_manifest_updated:
        raise ValueError("accepted promotion decisions require --version-manifest-updated")
    if accepted and not args.plugin_manifest_updated:
        raise ValueError("accepted promotion decisions require --plugin-manifest-updated")
    if accepted and not args.source_of_truth_updated:
        raise ValueError("accepted promotion decisions require --source-of-truth-updated")
    if accepted and not args.promoted_record_path:
        raise ValueError("accepted promotion decisions require --promoted-record-path")

    record_id = args.id or f"rpr-{slugify(str(source.get('id', 'aurora-retest')))}"
    record = {
        "schema_version": "1",
        "id": record_id,
        "created_at": now_iso(),
        "feedback_record_id": str(source.get("id", "")),
        "proposal_path": args.proposal_path,
        "result": result,
        "maintainer": args.maintainer,
        "target_references": target_references,
        "evidence_label": evidence_label,
        "semver": semver,
        "verification": {
            "proposal_reviewed": args.proposal_reviewed or accepted,
            "references_patched": args.references_patched,
            "authoring_and_plugin_synced": args.authoring_and_plugin_synced,
            "privacy_checked": args.privacy_checked,
            "checks_run": checks_run,
            "checks_passed": checks_passed,
        },
        "release_updates": {
            "version_manifest_updated": args.version_manifest_updated,
            "plugin_manifest_updated": args.plugin_manifest_updated,
            "release_handoff_updated": args.release_handoff_updated,
            "source_of_truth_updated": args.source_of_truth_updated,
            "promoted_record_path": args.promoted_record_path,
        },
        "follow_up_actions": args.follow_up_action,
        "non_proof_boundaries": args.non_proof_boundary or NON_PROOF_BOUNDARIES,
        "notes": (
            args.notes
            or "Generated from an Aurora live retest result. This record is a maintainer decision, not automatic skill learning."
        ),
        "source_retest_result_path": str(source_path.relative_to(root)).replace("\\", "/")
        if root.resolve() in source_path.resolve().parents or source_path.resolve() == root.resolve()
        else str(source_path),
        "source_retest_target_atom": source.get("target_atom", ""),
        "source_retest_artifact_hashes": source.get("artifact_hashes", []),
    }
    errors = ref_record.validate_record(record)
    if errors:
        raise ValueError("generated reference promotion record is invalid: " + "; ".join(errors))
    return record


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--source-retest-result", required=True)
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    parser.add_argument("--id", default="")
    parser.add_argument("--proposal-path", required=True)
    parser.add_argument("--result", required=True, choices=["accepted", "accepted-with-follow-up", "held", "rejected"])
    parser.add_argument("--maintainer", required=True)
    parser.add_argument("--semver", default="MINOR", choices=["PATCH", "MINOR", "MAJOR"])
    parser.add_argument("--target-reference", action="append", default=[])
    parser.add_argument("--proposal-reviewed", action="store_true")
    parser.add_argument("--references-patched", action="store_true")
    parser.add_argument("--authoring-and-plugin-synced", action="store_true")
    parser.add_argument("--privacy-checked", action="store_true")
    parser.add_argument("--version-manifest-updated", action="store_true")
    parser.add_argument("--plugin-manifest-updated", action="store_true")
    parser.add_argument("--release-handoff-updated", action="store_true")
    parser.add_argument("--source-of-truth-updated", action="store_true")
    parser.add_argument("--promoted-record-path", default="")
    parser.add_argument("--check-run", action="append", default=[])
    parser.add_argument("--check-passed", action="append", default=[])
    parser.add_argument("--follow-up-action", action="append", default=[])
    parser.add_argument("--non-proof-boundary", action="append", default=[])
    parser.add_argument("--notes", default="")
    args = parser.parse_args()

    root = Path(args.root)
    try:
        record = build_record(root, args)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    out_dir = Path(args.out)
    if not out_dir.is_absolute():
        out_dir = root / out_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{record['id']}.json"
    path.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
