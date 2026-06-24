#!/usr/bin/env python3
"""Generate a release-readiness report for the NWN skill pack."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


FORWARD_RECORD_DIR = Path("forward-tests/records")
FEEDBACK_DIRS = [
    Path("knowledge-inbox/incoming"),
    Path("knowledge-inbox/reviewed"),
    Path("knowledge-inbox/rejected"),
    Path("knowledge-inbox/promoted"),
]
INSTALL_SMOKE_TRUE_FIELDS = [
    "registered_or_installed",
    "fresh_context_started",
    "skill_visible_or_invokable",
    "expected_references_routed",
    "runtime_boundary_preserved",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def load_records(paths: list[Path]) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for path in paths:
        if not path.exists() or path.name == "aggregate.md":
            continue
        if path.is_dir():
            records.extend(load_records(sorted(path.glob("*.json"))))
            continue
        if path.suffix.lower() != ".json":
            continue
        try:
            record = load_json(path)
        except Exception:
            continue
        record["_path"] = str(path)
        records.append(record)
    return records


def status_icon(ok: bool) -> str:
    return "PASS" if ok else "BLOCKED"


def count_by(records: list[dict[str, Any]], field: str) -> Counter[str]:
    counter: Counter[str] = Counter()
    for record in records:
        counter[str(record.get(field, "unknown"))] += 1
    return counter


def lines_for_counts(counter: Counter[str]) -> list[str]:
    if not counter:
        return ["- none"]
    return [f"- `{key}`: {counter[key]}" for key in sorted(counter)]


def install_smoke_pass_is_accepted(record: dict[str, Any]) -> bool:
    if record.get("record_type") != "install-smoke-test" or record.get("result") != "pass":
        return False
    if not str(record.get("test_id", "")).startswith("INSTALL-"):
        return False
    verification = record.get("install_verification")
    if not isinstance(verification, dict):
        return False
    if any(verification.get(field) is not True for field in INSTALL_SMOKE_TRUE_FIELDS):
        return False
    return verification.get("preparation_only") is False


def generate(root: Path) -> str:
    manifest = load_json(root / "version-manifest.json")
    forward_records = load_records([root / FORWARD_RECORD_DIR])
    feedback_records = load_records([root / path for path in FEEDBACK_DIRS])

    forward_by_result = count_by(forward_records, "result")
    forward_by_type = count_by(forward_records, "record_type")
    prompt_tests = [
        record for record in forward_records
        if record.get("record_type") == "prompt-forward-test"
    ]
    install_smoke_tests = [
        record for record in forward_records
        if record.get("record_type") == "install-smoke-test"
    ]
    passed_install_smoke_tests = [
        record for record in install_smoke_tests
        if install_smoke_pass_is_accepted(record)
    ]
    failed_tests = [
        record for record in forward_records
        if record.get("result") == "fail"
    ]
    partial_tests = [
        record for record in forward_records
        if record.get("result") == "partial"
    ]

    release_gate = manifest.get("release_gate", {})
    blockers = []
    if isinstance(release_gate, dict):
        raw_blockers = release_gate.get("blockers", [])
        if isinstance(raw_blockers, list):
            blockers.extend(str(item) for item in raw_blockers)

    inferred_gate = {
        "At least three prompt forward tests": len(prompt_tests) >= 3,
        "At least one install smoke test has accepted pass evidence": len(passed_install_smoke_tests) >= 1,
        "No failed forward tests": len(failed_tests) == 0,
        "No partial tests without improvement action": all(
            isinstance(record.get("improvement_action"), dict)
            and record["improvement_action"].get("needed")
            for record in partial_tests
        ),
        "Version manifest allows RC": bool(
            isinstance(release_gate, dict) and release_gate.get("rc_allowed")
        ),
    }

    lines = [
        "# NWN Skill Pack Release Readiness",
        "",
        f"Generated: {now_iso()}",
        "",
        "## Package",
        "",
        f"- Package: `{manifest.get('package_name', '')}`",
        f"- Version: `{manifest.get('version', '')}`",
        f"- State: `{manifest.get('package_state', '')}`",
        f"- Skill: `{manifest.get('skill_name', '')}`",
        "",
        "## Gate Summary",
        "",
    ]

    for label, ok in inferred_gate.items():
        lines.append(f"- `{status_icon(ok)}` {label}")

    lines.extend([
        "",
        "## Active Blockers",
        "",
    ])
    if blockers:
        for blocker in blockers:
            lines.append(f"- {blocker}")
    else:
        lines.append("- none recorded in version manifest")

    lines.extend([
        "",
        "## Forward Tests",
        "",
        f"- Records: {len(forward_records)}",
        f"- Prompt forward tests: {len(prompt_tests)}",
        f"- Install smoke tests: {len(install_smoke_tests)}",
        f"- Accepted passed install smoke tests: {len(passed_install_smoke_tests)}",
        "",
        "Result counts:",
        "",
        *lines_for_counts(forward_by_result),
        "",
        "Record type counts:",
        "",
        *lines_for_counts(forward_by_type),
        "",
        "## Feedback Records",
        "",
        f"- Records: {len(feedback_records)}",
        "",
        "Status counts:",
        "",
        *lines_for_counts(count_by(feedback_records, "status")),
        "",
        "Source type counts:",
        "",
        *lines_for_counts(count_by(feedback_records, "source_type")),
        "",
        "## Required Verification Commands",
        "",
        "```powershell",
        "python docs\\nwn-skill-pack\\tools\\run_repo_artifact_preflight.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_version_manifest.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_release_handoff.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_release_readiness.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\generate_release_notes_draft.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\release-notes-draft.md",
        "python docs\\nwn-skill-pack\\tools\\check_release_notes_draft.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\generate_release_next_actions.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\release-next-actions.md",
        "python docs\\nwn-skill-pack\\tools\\check_release_next_actions.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\generate_release_evidence_index.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\release-evidence-index.md",
        "python docs\\nwn-skill-pack\\tools\\check_release_evidence_index.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\generate_aurora_live_promotion_proof_gates.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\aurora-live-promotion-proof-gates.md",
        "python docs\\nwn-skill-pack\\tools\\check_aurora_live_promotion_proof_gates.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\generate_rc_blocker_burndown.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\rc-blocker-burndown.md",
        "python docs\\nwn-skill-pack\\tools\\check_rc_blocker_burndown.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\generate_minimum_rc_proof_packet.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\forward-tests\\minimum-rc-proof-packet.md",
        "python docs\\nwn-skill-pack\\tools\\check_minimum_rc_proof_packet.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_rc_unblock_playbook.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_record_contracts.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_feedback_intake_docs.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_feedback_review_rubric.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_reference_promotion_proposal_template.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_reference_promotion_proposal_tool.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\reference_promotion_record.py aggregate docs\\nwn-skill-pack\\knowledge-inbox\\reference-promotions\\records --out docs\\nwn-skill-pack\\knowledge-inbox\\reference-promotions\\aggregate.md",
        "python docs\\nwn-skill-pack\\tools\\check_reference_promotion_records.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_contributor_intake_quickstart.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_model_import_policy.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_knowledge_index_policy.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_architecture_scorecard.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_architecture_decisions.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_maintainer_decision_index.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_versioning_policy.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\generate_version_bump_plan.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\version-bump-plan.md",
        "python docs\\nwn-skill-pack\\tools\\check_version_bump_plan.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_external_source_registry.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_domain_reference_status.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_capability_map.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_feature_design_template.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\generate_feedback_promotion_backlog.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\knowledge-inbox\\promotion-backlog.md",
        "python docs\\nwn-skill-pack\\tools\\generate_feedback_intake_status.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\feedback-intake-status.md",
        "python docs\\nwn-skill-pack\\tools\\check_feedback_intake_status.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\generate_package_inventory.py docs\\nwn-skill-pack --out-json docs\\nwn-skill-pack\\package-inventory.json --out-md docs\\nwn-skill-pack\\package-inventory.md",
        "python docs\\nwn-skill-pack\\tools\\check_package_inventory.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_package_boundaries.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\generate_forward_test_execution_queue.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\forward-tests\\execution-queue.md",
        "python docs\\nwn-skill-pack\\tools\\generate_forward_test_reviewer_packet.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\forward-tests\\reviewer-packet.md",
        "python docs\\nwn-skill-pack\\tools\\generate_forward_test_record_templates.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\forward-tests\\record-command-templates.md",
        "python docs\\nwn-skill-pack\\tools\\check_forward_test_prompts.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\build_plugin_install_candidate.py docs\\nwn-skill-pack --force",
        "python docs\\nwn-skill-pack\\tools\\build_local_marketplace_candidate.py docs\\nwn-skill-pack --force",
        "python docs\\nwn-skill-pack\\tools\\check_install_candidate.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_isolated_install_layout.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\generate_install_smoke_packet.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\forward-tests\\install-smoke-packet.md",
        "python docs\\nwn-skill-pack\\tools\\check_install_smoke_packet.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_install_smoke_playbook.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_install_smoke_records.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_plugin_package.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_release_gate.py docs\\nwn-skill-pack --target repo-artifact",
        "python docs\\nwn-skill-pack\\tools\\check_skill_routes.py docs\\nwn-skill-pack\\draft-skills\\nwn-server-gamedev",
        "python docs\\nwn-skill-pack\\tools\\check_skill_routes.py docs\\nwn-skill-pack\\draft-plugins\\nwn-server-gamedev-pack\\skills\\nwn-server-gamedev",
        "```",
        "",
        "## Candidate Gate Commands",
        "",
        "These are stricter candidate checks. A filled repo-artifact handoff can pass the handoff check, but staged release gates must still block until the claimed package state and evidence exist:",
        "",
        "```powershell",
        "python docs\\nwn-skill-pack\\tools\\check_release_handoff.py docs\\nwn-skill-pack --require-filled",
        "python docs\\nwn-skill-pack\\tools\\check_release_gate.py docs\\nwn-skill-pack --target release-candidate",
        "python docs\\nwn-skill-pack\\tools\\check_release_gate.py docs\\nwn-skill-pack --target install-candidate",
        "```",
        "",
        "## Maintainer Handoff Before Candidate Promotion",
        "",
        "- Read `release-evidence-index.md` and `aurora-live-promotion-proof-gates.md` before changing `package_state` away from `repo artifact`.",
        "- Treat local Aurora reverse/thread leads from `local-aurora-reverse-ingestion.md`, `local-thread-019ed62e-aurora-ui-gallery-intake.md`, and `local-aurora-live-gap-queue.md` as release-routing evidence only; they do not unblock release-candidate or install-candidate gates without reviewed Aurora live records or exact blockers routed through `maintainer-decision-index.md`.",
        "- Treat the proof-gates dashboard as control evidence only; it summarizes blockers and does not prove NWN runtime behavior or automatic skill improvement.",
        "- Do not claim the skill was strengthened until real pass retest records, bridge candidates, accepted maintainer decisions, reference patch/release sync, and release-candidate gate clearance are all present.",
        "- This handoff does not replace prompt forward tests, install smoke tests, privacy review, or release handoff review.",
        "",
        "## Aurora Live Review Outcome Gate",
        "",
        "- `check_release_gate.py` validates `knowledge-inbox/aurora-live-review-outcomes/records` with `aurora_live_review_outcome_record.py` contextual validation.",
        "- When a review outcome has a local `live_record_path`, accepted atoms are checked against the linked Aurora live record; the Minimum First Live Pass cannot be accepted until every required atom has returned evidence or an exact blocker.",
        "- Missing or unavailable live records remain maintainer-risk cases. They are not NWN runtime proof.",
        "",
        "## Interpretation",
        "",
        "This report summarizes local release metadata and records. It does not prove NWN runtime correctness.",
    ])

    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--out", default="docs/nwn-skill-pack/release-readiness.md")
    args = parser.parse_args()

    output = generate(Path(args.root))
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(output, encoding="utf-8")
    print(out_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
