#!/usr/bin/env python3
"""Generate a maintainer bridge from accepted Aurora live retest results to reference promotion work."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from types import ModuleType
from typing import Any


DEFAULT_RECORDS = Path("knowledge-inbox/aurora-live-retest-results/records")
DEFAULT_OUTPUT = Path("knowledge-inbox/aurora-live-retest-promotion-bridge.md")
REQUIRED_PASS_VERIFICATION = [
    "dispatch_check",
    "result_template_check",
    "records_check",
    "evidence_manifest_check",
    "intake_consistency_check",
    "redaction_policy_check",
    "visual_redaction_check",
]
AUTHOR_REFERENCE_PREFIX = "draft-skills/nwn-server-gamedev/references/"
PLUGIN_REFERENCE_PREFIX = "draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev/references/"


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


def display_path(root: Path, path: Path) -> str:
    try:
        return str(path.resolve().relative_to(root.resolve())).replace("\\", "/")
    except ValueError:
        return str(path).replace("\\", "/")


def nonempty_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def pass_candidate_errors(record: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if record.get("result") != "pass":
        errors.append("result is not pass")
    target_atom = str(record.get("target_atom", "")).strip()
    if target_atom not in nonempty_list(record.get("passed_atoms")):
        errors.append("target_atom is not in passed_atoms")
    if not nonempty_list(record.get("returned_artifacts")):
        errors.append("returned_artifacts is empty")
    if not record.get("artifact_hashes"):
        errors.append("artifact_hashes is empty")

    privacy = record.get("privacy_confirmation")
    if not isinstance(privacy, dict):
        errors.append("privacy_confirmation is missing")
    else:
        if privacy.get("no_private_data") is not True:
            errors.append("privacy_confirmation.no_private_data is not true")
        if privacy.get("quarantine_required") is True:
            errors.append("privacy_confirmation.quarantine_required is true")
    if nonempty_list(record.get("privacy_findings")):
        errors.append("privacy_findings is not empty")

    verification = record.get("maintainer_verification")
    if not isinstance(verification, dict):
        errors.append("maintainer_verification is missing")
    else:
        for field in REQUIRED_PASS_VERIFICATION:
            if verification.get(field) is not True:
                errors.append(f"maintainer_verification.{field} is not true")
    checks_run = set(nonempty_list(record.get("checks_run")))
    checks_passed = set(nonempty_list(record.get("checks_passed")))
    missing_checks = sorted(checks_run - checks_passed)
    if missing_checks:
        errors.append("checks_run not included in checks_passed: " + ", ".join(missing_checks))
    return errors


def classify_records(root: Path, record_dir: Path, tool: ModuleType) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    candidates: list[dict[str, Any]] = []
    held: list[dict[str, Any]] = []
    invalid: list[dict[str, Any]] = []
    if not record_dir.exists():
        return candidates, held, invalid
    for path in sorted(record_dir.glob("*.json")):
        try:
            record = load_json(path)
            validation_errors = tool.validate_record(record)
        except Exception as exc:
            invalid.append({"path": path, "errors": [str(exc)]})
            continue
        entry = {
            "path": path,
            "record": record,
            "validation_errors": validation_errors,
            "candidate_errors": pass_candidate_errors(record),
        }
        if validation_errors:
            invalid.append(entry)
        elif not entry["candidate_errors"]:
            candidates.append(entry)
        else:
            held.append(entry)
    return candidates, held, invalid


def default_targets(record: dict[str, Any]) -> tuple[str, str]:
    atom = str(record.get("target_atom", "aurora-live")).replace(".", "-").lower()
    filename = f"aurora-live-{atom}.md"
    return AUTHOR_REFERENCE_PREFIX + filename, PLUGIN_REFERENCE_PREFIX + filename


def bullet_lines(items: list[str], fallback: str = "- none") -> list[str]:
    if not items:
        return [fallback]
    return [f"- {item}" for item in items]


def render_candidate(root: Path, entry: dict[str, Any], index: int) -> list[str]:
    record = entry["record"]
    author_target, plugin_target = default_targets(record)
    artifacts = [
        f"{item.get('path', '')} ({item.get('sha256', '')})"
        for item in record.get("artifact_hashes", [])
        if isinstance(item, dict)
    ]
    lines = [
        f"### Candidate {index}: `{record.get('id')}`",
        "",
        f"- Source retest result: `{display_path(root, entry['path'])}`",
        f"- Source review outcome: `{record.get('source_review_outcome_id')}`",
        f"- Live record: `{record.get('live_record_id')}`",
        f"- Evidence manifest: `{record.get('evidence_manifest_path') or 'not supplied'}`",
        f"- Target atom: `{record.get('target_atom')}`",
        "- Evidence label to use: `runtime-tested`",
        f"- Maintainer decision summary: {record.get('decision_summary')}",
        "",
        "Returned artifact hashes:",
        "",
        *bullet_lines(artifacts),
        "",
        "Required manual promotion steps:",
        "",
        "1. Open the returned artifacts and evidence manifest locally.",
        "2. Confirm screenshots/logs are truthful enough for the claim and are redacted.",
        "3. Choose exact reference wording and target files.",
        "4. Patch both authoring and plugin-packaged reference copies.",
        "5. Write a reference promotion record only after patching and checks pass.",
        "",
        "Reference promotion proposal draft:",
        "",
        "```markdown",
        "# Reference Promotion Proposal",
        "",
        "Generated from an accepted Aurora live retest result record.",
        "",
        "This is not automatic learning. It does not self-update an installed skill, does not prove future Codex answer quality, and does not replace a versioned release.",
        "",
        "## Source Retest Result",
        "",
        f"- Source retest result id: `{record.get('id')}`",
        f"- Source retest result path: `{display_path(root, entry['path'])}`",
        f"- Source dispatch: `{record.get('source_dispatch_path')}`",
        f"- Source review outcome: `{record.get('source_review_outcome_id')}`",
        f"- Live record: `{record.get('live_record_id')}`",
        f"- Target atom: `{record.get('target_atom')}`",
        "- Required result: `pass`",
        "- Required evidence label: `runtime-tested`",
        "",
        "## Claim To Promote",
        "",
        f"- Claim: {record.get('decision_summary')}",
        "- Target reference section: maintainer decision",
        f"- Authoring reference target: `{author_target}`",
        f"- Plugin-packaged reference target: `{plugin_target}`",
        "",
        "## Evidence",
        "",
        *bullet_lines(artifacts),
        "",
        "## Privacy And Scope",
        "",
        f"- Privacy summary: {record.get('privacy_confirmation', {}).get('summary', '') if isinstance(record.get('privacy_confirmation'), dict) else ''}",
        "- Private data excluded: maintainer confirmed by retest result record",
        "- Quarantine required: no",
        "",
        "## Does Not Prove",
        "",
        "This proposal does not prove automatic skill improvement, future answer quality, plugin installation, public marketplace behavior, server balance, or privacy safety beyond maintainer review.",
        "```",
        "",
    ]
    return lines


def render(root: Path, record_dir: Path = DEFAULT_RECORDS) -> str:
    tool = load_module(root / "tools" / "aurora_live_retest_result_record.py", "aurora_live_retest_result_bridge")
    candidates, held, invalid = classify_records(root, record_dir, tool)
    status = "promotion-candidates-ready" if candidates else "no-promotion-candidates"

    lines = [
        "# Aurora Live Retest Promotion Bridge",
        "",
        f"Generated: {now_iso()}",
        f"Input: `{display_path(root, record_dir)}`",
        f"Status: `{status}`",
        f"Promotion candidates: {len(candidates)}",
        f"Held records: {len(held)}",
        f"Invalid records: {len(invalid)}",
        "",
        "## Purpose",
        "",
        "This bridge turns accepted Aurora live retest result records into maintainer-owned reference promotion work. It does not patch skill files, does not create release evidence by itself, and does not allow automatic skill improvement.",
        "",
        "A record can become a candidate only when it is a validated `pass` retest result with returned artifacts, SHA-256 hashes, no privacy findings, no quarantine, all required maintainer verification flags, and all checks passed.",
        "",
        "## Promotion Candidates",
        "",
    ]
    if candidates:
        for index, entry in enumerate(candidates, start=1):
            lines.extend(render_candidate(root, entry, index))
    else:
        lines.append("- none")
        lines.append("")

    lines.extend([
        "## Held Or Non-Passing Records",
        "",
    ])
    if held:
        for entry in held:
            record = entry["record"]
            lines.append(f"- `{record.get('id', display_path(root, entry['path']))}`")
            lines.append(f"  - result: `{record.get('result')}`")
            for error in entry["candidate_errors"]:
                lines.append(f"  - blocker: {error}")
    else:
        lines.append("- none")
    lines.extend(["", "## Invalid Records", ""])
    if invalid:
        for entry in invalid:
            lines.append(f"- `{display_path(root, entry['path'])}`")
            for error in entry.get("validation_errors") or entry.get("errors", []):
                lines.append(f"  - {error}")
    else:
        lines.append("- none")

    lines.extend([
        "",
        "## Verification Commands Before Any Patch",
        "",
        "```powershell",
        "python docs\\nwn-skill-pack\\tools\\aurora_live_retest_result_record.py validate docs\\nwn-skill-pack\\knowledge-inbox\\aurora-live-retest-results\\records",
        "python docs\\nwn-skill-pack\\tools\\check_aurora_live_retest_result_records.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_aurora_live_intake_consistency.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_aurora_live_redaction_policy.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_aurora_live_visual_redaction_records.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\run_repo_artifact_preflight.py docs\\nwn-skill-pack",
        "```",
        "",
        "## Does Not Prove",
        "",
        "This bridge does not prove outside delivery, operator independence, screenshot truth, log truth, NWN runtime behavior beyond reviewed returned evidence, plugin installation, release readiness, privacy safety beyond maintainer review, or automatic skill improvement.",
        "",
    ])
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--records", default=str(DEFAULT_RECORDS))
    parser.add_argument("--out", default=str(DEFAULT_OUTPUT))
    args = parser.parse_args()

    root = Path(args.root)
    records = Path(args.records)
    if not records.is_absolute():
        records = root / records
    out = Path(args.out)
    if not out.is_absolute():
        out = root / out
    text = render(root, records)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding="utf-8")
    print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
