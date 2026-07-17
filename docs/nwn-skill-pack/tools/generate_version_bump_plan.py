#!/usr/bin/env python3
"""Generate a version bump plan from accepted reference promotion records."""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from types import ModuleType
from typing import Any


SEMVER_RE = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$")
ORDER = {"NONE": 0, "PATCH": 1, "MINOR": 2, "MAJOR": 3}
ACCEPTED_RESULTS = {"accepted", "accepted-with-follow-up"}


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


def parse_semver(version: str) -> tuple[int, int, int]:
    match = SEMVER_RE.match(version)
    if not match:
        raise ValueError(f"version must be strict x.y.z semver without suffix: {version!r}")
    return int(match.group(1)), int(match.group(2)), int(match.group(3))


def bump_version(version: str, bump_class: str) -> str:
    major, minor, patch = parse_semver(version)
    if bump_class == "MAJOR":
        return f"{major + 1}.0.0"
    if bump_class == "MINOR":
        return f"{major}.{minor + 1}.0"
    if bump_class == "PATCH":
        return f"{major}.{minor}.{patch + 1}"
    return version


def load_records(root: Path, records_dir: Path) -> tuple[list[dict[str, Any]], list[str]]:
    validator = load_module(root / "tools" / "reference_promotion_record.py", "reference_promotion_record_for_version_plan")
    records: list[dict[str, Any]] = []
    errors: list[str] = []
    if not records_dir.exists():
        return records, errors
    for path in sorted(records_dir.glob("*.json")):
        try:
            record = load_json(path)
            record_errors = validator.validate_record(record)
        except Exception as exc:
            record = {}
            record_errors = [str(exc)]
        if record_errors:
            errors.append(f"{path}: {'; '.join(record_errors)}")
            continue
        record["_path"] = str(path)
        records.append(record)
    return records, errors


def plan(root: Path, records_dir: Path) -> dict[str, Any]:
    manifest = load_json(root / "version-manifest.json")
    current_version = str(manifest.get("version", ""))
    parse_semver(current_version)
    records, errors = load_records(root, records_dir)
    accepted = [
        record for record in records
        if record.get("result") in ACCEPTED_RESULTS
    ]
    highest = "NONE"
    for record in accepted:
        semver = str(record.get("semver", "NONE"))
        if ORDER.get(semver, 0) > ORDER[highest]:
            highest = semver
    return {
        "generated_at": now_iso(),
        "current_version": current_version,
        "proposed_bump": highest,
        "proposed_version": bump_version(current_version, highest),
        "records_dir": str(records_dir),
        "records": records,
        "accepted_records": accepted,
        "invalid_record_errors": errors,
        "result_counts": Counter(str(record.get("result", "unknown")) for record in records),
        "semver_counts": Counter(str(record.get("semver", "unknown")) for record in accepted),
    }


def lines_for_counts(counter: Counter[str]) -> list[str]:
    if not counter:
        return ["- none"]
    return [f"- `{key}`: {counter[key]}" for key in sorted(counter)]


def render(plan_data: dict[str, Any]) -> str:
    records = plan_data["records"]
    accepted = plan_data["accepted_records"]
    invalid = plan_data["invalid_record_errors"]
    bump = plan_data["proposed_bump"]
    current = plan_data["current_version"]
    proposed = plan_data["proposed_version"]
    no_bump_reason = "No accepted reference promotion records exist." if bump == "NONE" else ""

    lines = [
        "# Version Bump Plan",
        "",
        f"Generated: {plan_data['generated_at']}",
        f"Records input: `{plan_data['records_dir']}`",
        "",
        "## Recommendation",
        "",
        f"- Current version: `{current}`",
        f"- Proposed SemVer class: `{bump}`",
        f"- Proposed next version: `{proposed}`",
        f"- Accepted promotion records counted: {len(accepted)}",
    ]
    if no_bump_reason:
        lines.append(f"- No-bump reason: {no_bump_reason}")
    lines.extend([
        "",
        "This plan is advisory. It does not edit `version-manifest.json`, does not edit `.codex-plugin/plugin.json`, does not create a release, and does not prove NWN runtime behavior.",
        "Local Aurora reverse/thread leads from `local-aurora-reverse-ingestion.md`, `local-thread-019ed62e-aurora-ui-gallery-intake.md`, and `local-aurora-live-gap-queue.md` are not accepted reference promotion records and do not justify a SemVer bump until reviewed Aurora live records or exact blockers produce accepted reference promotion records with synced authoring/plugin references.",
        "",
        "## Counts",
        "",
        "Result counts:",
        "",
        *lines_for_counts(plan_data["result_counts"]),
        "",
        "Accepted SemVer counts:",
        "",
        *lines_for_counts(plan_data["semver_counts"]),
        "",
        "## Accepted Promotion Records",
        "",
    ])
    if accepted:
        for record in accepted:
            lines.append(f"- `{record.get('semver')}` **{record.get('id')}**")
            lines.append(f"  - feedback: `{record.get('feedback_record_id')}`")
            lines.append(f"  - result: `{record.get('result')}`")
            lines.append(f"  - evidence label: `{record.get('evidence_label')}`")
            lines.append(f"  - file: `{record.get('_path')}`")
            follow_up = record.get("follow_up_actions", [])
            if follow_up:
                lines.append(f"  - follow-up actions: {len(follow_up)}")
            lines.append("")
    else:
        lines.append("- none")
        lines.append("")
    lines.extend([
        "## Invalid Promotion Records",
        "",
    ])
    if invalid:
        for error in invalid:
            lines.append(f"- {error}")
    else:
        lines.append("- none")
    lines.extend([
        "",
        "## Maintainer Actions",
        "",
    ])
    if bump == "NONE":
        lines.extend([
            "- Do not bump package version for feedback promotion yet.",
            "- Continue collecting, reviewing, and promoting feedback records.",
        ])
    else:
        lines.extend([
            f"- Update `version-manifest.json` from `{current}` to `{proposed}`.",
            f"- Update `draft-plugins/nwn-server-gamedev-pack/.codex-plugin/plugin.json` from `{current}` to `{proposed}`.",
            "- Regenerate release readiness, evidence index, package inventory, install packet, and local sandbox artifacts.",
            "- Fill or update the concrete release handoff for the claimed package state.",
        ])
    lines.extend([
        "",
        "## Required Verification Commands",
        "",
        "```powershell",
        "python docs\\nwn-skill-pack\\tools\\reference_promotion_record.py validate docs\\nwn-skill-pack\\knowledge-inbox\\reference-promotions\\records",
        "python docs\\nwn-skill-pack\\tools\\reference_promotion_record.py aggregate docs\\nwn-skill-pack\\knowledge-inbox\\reference-promotions\\records --out docs\\nwn-skill-pack\\knowledge-inbox\\reference-promotions\\aggregate.md",
        "python docs\\nwn-skill-pack\\tools\\generate_version_bump_plan.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\version-bump-plan.md",
        "python docs\\nwn-skill-pack\\tools\\check_version_bump_plan.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_version_manifest.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_versioning_policy.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\run_repo_artifact_preflight.py docs\\nwn-skill-pack",
        "```",
        "",
        "## Does Not Prove",
        "",
        "This plan does not prove a promoted claim, fresh Codex answer quality, plugin installation, public marketplace behavior, balance, fun, security, privacy safety beyond maintainer review, or NWN runtime behavior.",
    ])
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--records-dir", default="")
    parser.add_argument("--out", default="docs/nwn-skill-pack/version-bump-plan.md")
    args = parser.parse_args()

    root = Path(args.root)
    records_dir = Path(args.records_dir) if args.records_dir else root / "knowledge-inbox" / "reference-promotions" / "records"
    try:
        plan_data = plan(root, records_dir)
        output = render(plan_data)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(output, encoding="utf-8")
    print(out_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
