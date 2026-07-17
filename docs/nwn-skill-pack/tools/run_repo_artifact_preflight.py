#!/usr/bin/env python3
"""Run the NWN skill-pack repo-artifact generation and verification flow."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class Step:
    name: str
    args: list[str]
    expected_exit: int = 0


@dataclass
class PreflightResult:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def tool(root: Path, name: str) -> str:
    return str(root / "tools" / name)


def core_tool_paths(root: Path) -> list[str]:
    return [str(path) for path in sorted((root / "tools").glob("*.py"))]


def is_inside_generated_scratch(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root / ".codex-tmp")
        return True
    except ValueError:
        return False


def check_repo_artifact_hygiene(root: Path, result: PreflightResult) -> None:
    forbidden: list[str] = []
    for path in sorted(root.rglob("*")):
        if is_inside_generated_scratch(path, root):
            continue
        if path.is_dir() and path.name == "__pycache__":
            forbidden.append(str(path.relative_to(root)).replace("\\", "/") + "/")
        elif path.is_file() and path.suffix in {".pyc", ".pyo"}:
            forbidden.append(str(path.relative_to(root)).replace("\\", "/"))

    if forbidden:
        result.error("repo artifact contains generated Python cache files: " + ", ".join(forbidden[:20]))
        if len(forbidden) > 20:
            result.error(f"repo artifact contains {len(forbidden) - 20} additional generated Python cache path(s)")
    else:
        result.ok("repo artifact has no generated Python cache files outside .codex-tmp")


def run_repo_artifact_hygiene_self_test(root: Path, result: PreflightResult) -> None:
    scratch = root / ".codex-tmp" / "preflight-hygiene-self-test"
    if scratch.exists():
        shutil.rmtree(scratch)
    fake_root = scratch / "fake-root"
    forbidden_cache = fake_root / "tools" / "__pycache__" / "sample.cpython-312.pyc"
    forbidden_suffix = fake_root / "tools" / "sample.pyc"
    allowed_scratch_cache = fake_root / ".codex-tmp" / "pycache" / "scratch.cpython-312.pyc"
    try:
        for path in [forbidden_cache, forbidden_suffix, allowed_scratch_cache]:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b"synthetic bytecode cache")

        fixture_result = PreflightResult()
        check_repo_artifact_hygiene(fake_root, fixture_result)
        joined_errors = "\n".join(fixture_result.errors)
        if (
            "tools/__pycache__/" in joined_errors
            and "tools/sample.pyc" in joined_errors
            and ".codex-tmp/pycache" not in joined_errors
        ):
            result.ok("repo artifact hygiene self-test rejects generated Python cache and ignores scratch cache")
        else:
            result.error("repo artifact hygiene self-test did not detect the expected cache paths")
            for error in fixture_result.errors:
                result.error(error)
    finally:
        if scratch.exists():
            shutil.rmtree(scratch)


def generation_steps(root: Path) -> list[Step]:
    return [
        Step(
            "generate feedback promotion backlog",
            [
                tool(root, "generate_feedback_promotion_backlog.py"),
                str(root),
                "--out",
                str(root / "knowledge-inbox" / "promotion-backlog.md"),
            ],
        ),
        Step(
            "generate reference promotion record aggregate",
            [
                tool(root, "reference_promotion_record.py"),
                "aggregate",
                str(root / "knowledge-inbox" / "reference-promotions" / "records"),
                "--out",
                str(root / "knowledge-inbox" / "reference-promotions" / "aggregate.md"),
            ],
        ),
        Step(
            "generate version bump plan",
            [
                tool(root, "generate_version_bump_plan.py"),
                str(root),
                "--out",
                str(root / "version-bump-plan.md"),
            ],
        ),
        Step(
            "generate feedback intake status",
            [
                tool(root, "generate_feedback_intake_status.py"),
                str(root),
                "--out",
                str(root / "feedback-intake-status.md"),
            ],
        ),
        Step(
            "generate Aurora live evidence status",
            [
                tool(root, "generate_aurora_live_status.py"),
                str(root),
                "--out",
                str(root / "knowledge-inbox" / "aurora-live-status.md"),
            ],
        ),
        Step(
            "generate Aurora live review queue",
            [
                tool(root, "generate_aurora_live_review_queue.py"),
                str(root),
                "--out",
                str(root / "knowledge-inbox" / "aurora-live-review-queue.md"),
            ],
        ),
        Step(
            "generate Aurora live retest dispatch",
            [
                tool(root, "generate_aurora_live_retest_dispatch.py"),
                str(root),
                "--out",
                str(root / "knowledge-inbox" / "aurora-live-retest-dispatch.md"),
            ],
        ),
        Step(
            "build Aurora live retest operator bundle",
            [
                tool(root, "build_aurora_live_retest_operator_bundle.py"),
                str(root),
                "--force",
            ],
        ),
        Step(
            "generate Aurora live retest result aggregate",
            [
                tool(root, "aurora_live_retest_result_record.py"),
                "aggregate",
                str(root / "knowledge-inbox" / "aurora-live-retest-results" / "records"),
                "--out",
                str(root / "knowledge-inbox" / "aurora-live-retest-results" / "aggregate.md"),
            ],
        ),
        Step(
            "generate Aurora live retest promotion bridge",
            [
                tool(root, "generate_aurora_live_retest_promotion_bridge.py"),
                str(root),
                "--out",
                str(Path("knowledge-inbox") / "aurora-live-retest-promotion-bridge.md"),
            ],
        ),
        Step(
            "generate Aurora live promotion proof-gates dashboard",
            [
                tool(root, "generate_aurora_live_promotion_proof_gates.py"),
                str(root),
                "--out",
                str(root / "aurora-live-promotion-proof-gates.md"),
            ],
        ),
        Step(
            "generate Aurora live visual redaction aggregate",
            [
                tool(root, "aurora_live_visual_redaction_record.py"),
                "aggregate",
                str(root / "knowledge-inbox" / "aurora-live-visual-redaction-records" / "records"),
                "--out",
                str(root / "knowledge-inbox" / "aurora-live-visual-redaction-records" / "aggregate.md"),
            ],
        ),
        Step(
            "generate external contributor trial aggregate",
            [
                tool(root, "external_trial_record.py"),
                "aggregate",
                str(root / "knowledge-inbox" / "external-trials" / "records"),
                "--out",
                str(root / "knowledge-inbox" / "external-trials" / "aggregate.md"),
            ],
        ),
        Step(
            "generate external contributor trial handoff",
            [
                tool(root, "generate_external_trial_handoff.py"),
                str(root),
                "--trial-id",
                "EXT-001",
                "--out",
                str(Path("knowledge-inbox") / "external-trials" / "ext-001-handoff.md"),
            ],
        ),
        Step(
            "build external contributor trial public packet",
            [
                tool(root, "build_external_trial_public_packet.py"),
                str(root),
                "--trial-id",
                "EXT-001",
                "--force",
            ],
        ),
        Step(
            "generate external contributor trial tester message",
            [
                tool(root, "generate_external_trial_tester_message.py"),
                str(root),
                "--trial-id",
                "EXT-001",
                "--out",
                str(Path("knowledge-inbox") / "external-trials" / "ext-001-tester-message.md"),
            ],
        ),
        Step(
            "build external contributor trial dispatch bundle",
            [
                tool(root, "build_external_trial_dispatch_bundle.py"),
                str(root),
                "--trial-id",
                "EXT-001",
                "--force",
            ],
        ),
        Step(
            "generate forward-test execution queue",
            [
                tool(root, "generate_forward_test_execution_queue.py"),
                str(root),
                "--out",
                str(root / "forward-tests" / "execution-queue.md"),
            ],
        ),
        Step(
            "generate forward-test reviewer packet",
            [
                tool(root, "generate_forward_test_reviewer_packet.py"),
                str(root),
                "--out",
                str(root / "forward-tests" / "reviewer-packet.md"),
            ],
        ),
        Step(
            "generate forward-test record templates",
            [
                tool(root, "generate_forward_test_record_templates.py"),
                str(root),
                "--out",
                str(root / "forward-tests" / "record-command-templates.md"),
            ],
        ),
        Step(
            "generate release evidence index",
            [
                tool(root, "generate_release_evidence_index.py"),
                str(root),
                "--out",
                str(root / "release-evidence-index.md"),
            ],
        ),
        Step(
            "generate RC blocker burn-down",
            [
                tool(root, "generate_rc_blocker_burndown.py"),
                str(root),
                "--out",
                str(root / "rc-blocker-burndown.md"),
            ],
        ),
        Step(
            "generate RC prompt-test handoff",
            [
                tool(root, "generate_rc_prompt_test_handoff.py"),
                str(root),
                "--out",
                str(root / "forward-tests" / "rc-prompt-test-handoff.md"),
            ],
        ),
        Step(
            "build forward-test dispatch bundle",
            [tool(root, "build_forward_test_dispatch_bundle.py"), str(root), "--force"],
        ),
        Step(
            "build forward-test clean-session prompt pack",
            [tool(root, "build_forward_test_clean_session_prompts.py"), str(root), "--force"],
        ),
        Step(
            "generate minimum RC proof packet",
            [
                tool(root, "generate_minimum_rc_proof_packet.py"),
                str(root),
                "--out",
                str(root / "forward-tests" / "minimum-rc-proof-packet.md"),
            ],
        ),
        Step(
            "generate release readiness",
            [
                tool(root, "generate_release_readiness.py"),
                str(root),
                "--out",
                str(root / "release-readiness.md"),
            ],
        ),
        Step(
            "generate install smoke packet",
            [
                tool(root, "generate_install_smoke_packet.py"),
                str(root),
                "--out",
                str(root / "forward-tests" / "install-smoke-packet.md"),
            ],
        ),
        Step(
            "generate research run summary",
            [
                tool(root, "generate_research_run_summary.py"),
                str(root),
                "--out",
                str(root / "research-run-summary.md"),
            ],
        ),
    ]


def inventory_and_sandbox_steps(root: Path) -> list[Step]:
    return [
        Step(
            "generate package inventory",
            [
                tool(root, "generate_package_inventory.py"),
                str(root),
                "--out-json",
                str(root / "package-inventory.json"),
                "--out-md",
                str(root / "package-inventory.md"),
            ],
        ),
        Step(
            "build plugin install candidate",
            [tool(root, "build_plugin_install_candidate.py"), str(root), "--force"],
        ),
        Step(
            "build local marketplace candidate",
            [tool(root, "build_local_marketplace_candidate.py"), str(root), "--force"],
        ),
    ]


def release_notes_step(root: Path) -> Step:
    return Step(
        "generate release notes draft",
        [
            tool(root, "generate_release_notes_draft.py"),
            str(root),
            "--out",
            str(root / "release-notes-draft.md"),
        ],
    )


def release_next_actions_step(root: Path) -> Step:
    return Step(
        "generate release next-actions dashboard",
        [
            tool(root, "generate_release_next_actions.py"),
            str(root),
            "--out",
            str(root / "release-next-actions.md"),
        ],
    )


def check_steps(root: Path) -> list[Step]:
    return [
        Step("check release evidence index", [tool(root, "check_release_evidence_index.py"), str(root)]),
        Step("check RC blocker burn-down", [tool(root, "check_rc_blocker_burndown.py"), str(root)]),
        Step("check RC prompt-test handoff", [tool(root, "check_rc_prompt_test_handoff.py"), str(root)]),
        Step("check minimum RC proof packet", [tool(root, "check_minimum_rc_proof_packet.py"), str(root)]),
        Step("check RC unblock playbook", [tool(root, "check_rc_unblock_playbook.py"), str(root)]),
        Step("check install candidate", [tool(root, "check_install_candidate.py"), str(root)]),
        Step("check isolated install layout", [tool(root, "check_isolated_install_layout.py"), str(root)]),
        Step("check domain reference status", [tool(root, "check_domain_reference_status.py"), str(root)]),
        Step("check capability map", [tool(root, "check_capability_map.py"), str(root)]),
        Step("check feature design template", [tool(root, "check_feature_design_template.py"), str(root)]),
        Step("check external source registry", [tool(root, "check_external_source_registry.py"), str(root)]),
        Step("check version manifest", [tool(root, "check_version_manifest.py"), str(root)]),
        Step("check release readiness", [tool(root, "check_release_readiness.py"), str(root)]),
        Step("check release notes draft", [tool(root, "check_release_notes_draft.py"), str(root)]),
        Step("check release next-actions dashboard", [tool(root, "check_release_next_actions.py"), str(root)]),
        Step("check package inventory", [tool(root, "check_package_inventory.py"), str(root)]),
        Step("check package boundaries", [tool(root, "check_package_boundaries.py"), str(root)]),
        Step("check record contracts", [tool(root, "check_record_contracts.py"), str(root)]),
        Step("check feedback intake docs", [tool(root, "check_feedback_intake_docs.py"), str(root)]),
        Step("check feedback review rubric", [tool(root, "check_feedback_review_rubric.py"), str(root)]),
        Step("check feedback intake status", [tool(root, "check_feedback_intake_status.py"), str(root)]),
        Step("check feedback lifecycle", [tool(root, "check_feedback_lifecycle.py"), str(root)]),
        Step("check Aurora live evidence status", [tool(root, "check_aurora_live_status.py"), str(root)]),
        Step("check reference promotion proposal template", [tool(root, "check_reference_promotion_proposal_template.py"), str(root)]),
        Step("check reference promotion proposal generator", [tool(root, "check_reference_promotion_proposal_tool.py"), str(root)]),
        Step("check reference promotion records", [tool(root, "check_reference_promotion_records.py"), str(root)]),
        Step("check contribution bundle format", [tool(root, "check_contribution_bundle_format.py"), str(root)]),
        Step("check contribution bundle roundtrip", [tool(root, "check_contribution_bundle_roundtrip.py"), str(root)]),
        Step("check contributor intake quickstart", [tool(root, "check_contributor_intake_quickstart.py"), str(root)]),
        Step("check external contributor trial packet", [tool(root, "check_external_contributor_trial_packet.py"), str(root)]),
        Step("check external contributor trial result template", [tool(root, "check_external_contributor_trial_result_template.py"), str(root)]),
        Step("check external contributor trial handoff", [tool(root, "check_external_trial_handoff.py"), str(root)]),
        Step("check external contributor trial tester message", [tool(root, "check_external_trial_tester_message.py"), str(root)]),
        Step("check external contributor trial public packet", [tool(root, "check_external_trial_public_packet.py"), str(root)]),
        Step("check external contributor trial cleanroom", [tool(root, "check_external_trial_cleanroom.py"), str(root)]),
        Step("check external contributor trial dispatch bundle", [tool(root, "check_external_trial_dispatch_bundle.py"), str(root)]),
        Step("check external contributor trial received dispatch", [tool(root, "check_external_trial_received_dispatch.py"), str(root)]),
        Step("check external contributor trial records", [tool(root, "check_external_trial_records.py"), str(root)]),
        Step("check model import policy", [tool(root, "check_model_import_policy.py"), str(root)]),
        Step("check knowledge index policy", [tool(root, "check_knowledge_index_policy.py"), str(root)]),
        Step("check local Aurora reverse scope", [tool(root, "check_local_aurora_reverse_scope.py"), str(root)]),
        Step("check Aurora live-operator packet", [tool(root, "check_aurora_live_operator_packet.py"), str(root)]),
        Step("check Aurora live return packet", [tool(root, "check_aurora_live_return_packet.py"), str(root)]),
        Step("check Aurora live return roundtrip", [tool(root, "check_aurora_live_return_roundtrip.py"), str(root)]),
        Step("check Aurora live session preparer", [tool(root, "check_prepare_aurora_live_session.py"), str(root)]),
        Step("check Aurora live-record initializer", [tool(root, "check_init_aurora_live_record.py"), str(root)]),
        Step("check Aurora live evidence manifest initializer", [tool(root, "check_init_aurora_live_evidence_manifest.py"), str(root)]),
        Step("check Aurora live records", [tool(root, "check_aurora_live_records.py"), str(root)]),
        Step("check Aurora live redaction policy", [tool(root, "check_aurora_live_redaction_policy.py"), str(root)]),
        Step("check Aurora live visual redaction checklist", [tool(root, "check_aurora_live_visual_redaction_checklist.py"), str(root)]),
        Step("check Aurora live visual redaction records", [tool(root, "check_aurora_live_visual_redaction_records.py"), str(root)]),
        Step("check Aurora live evidence manifest", [tool(root, "check_aurora_live_evidence_manifest.py"), str(root)]),
        Step("check Aurora live intake consistency", [tool(root, "check_aurora_live_intake_consistency.py"), str(root)]),
        Step("check Aurora live-record review checklist", [tool(root, "check_aurora_live_record_review_checklist.py"), str(root)]),
        Step("check Aurora live review queue", [tool(root, "check_aurora_live_review_queue.py"), str(root)]),
        Step("check Aurora live retest dispatch", [tool(root, "check_aurora_live_retest_dispatch.py"), str(root)]),
        Step("check Aurora live retest dispatch roundtrip", [tool(root, "check_aurora_live_retest_dispatch_roundtrip.py"), str(root)]),
        Step("check Aurora live retest result template", [tool(root, "check_aurora_live_retest_result_template.py"), str(root)]),
        Step("check Aurora live retest result records", [tool(root, "check_aurora_live_retest_result_records.py"), str(root)]),
        Step("check Aurora live retest operator bundle", [tool(root, "check_aurora_live_retest_operator_bundle.py"), str(root)]),
        Step("check Aurora live retest result received bundle", [tool(root, "check_aurora_live_retest_result_received_bundle.py"), str(root)]),
        Step("check Aurora live retest promotion bridge", [tool(root, "check_aurora_live_retest_promotion_bridge.py"), str(root)]),
        Step("check Aurora live retest promotion decision helper", [tool(root, "check_aurora_live_retest_promotion_decision.py"), str(root)]),
        Step("check Aurora live promotion proof-gates dashboard", [tool(root, "check_aurora_live_promotion_proof_gates.py"), str(root)]),
        Step("check architecture scorecard", [tool(root, "check_architecture_scorecard.py"), str(root)]),
        Step("check architecture decisions", [tool(root, "check_architecture_decisions.py"), str(root)]),
        Step("check maintainer decision index", [tool(root, "check_maintainer_decision_index.py"), str(root)]),
        Step("check versioning policy", [tool(root, "check_versioning_policy.py"), str(root)]),
        Step("check version bump plan", [tool(root, "check_version_bump_plan.py"), str(root)]),
        Step("check research run log", [tool(root, "check_research_run_log.py"), str(root)]),
        Step("check research run summary", [tool(root, "check_research_run_summary.py"), str(root)]),
        Step("check forward-test prompts", [tool(root, "check_forward_test_prompts.py"), str(root)]),
        Step("check install smoke packet", [tool(root, "check_install_smoke_packet.py"), str(root)]),
        Step("check install-smoke playbook", [tool(root, "check_install_smoke_playbook.py"), str(root)]),
        Step("check install-smoke records", [tool(root, "check_install_smoke_records.py"), str(root)]),
        Step("check forward-test evidence policy", [tool(root, "check_forward_test_evidence_policy.py"), str(root)]),
        Step("check forward-test capture template", [tool(root, "check_forward_test_capture_template.py"), str(root)]),
        Step("check forward-test capture initializer", [tool(root, "check_init_forward_test_capture.py"), str(root)]),
        Step("check FT-010 review initializer", [tool(root, "check_init_ft010_full_slice_review.py"), str(root)]),
        Step("check forward-test dispatch bundle", [tool(root, "check_forward_test_dispatch_bundle.py"), str(root)]),
        Step("check forward-test clean-session prompt pack", [tool(root, "check_forward_test_clean_session_prompts.py"), str(root)]),
        Step("check forward-test clean-session received pack", [tool(root, "check_forward_test_clean_session_received_pack.py"), str(root)]),
        Step("check forward-test return captures self-test", [tool(root, "check_forward_test_return_captures.py"), str(root), "--self-test"]),
        Step("check FT-009 local-intake handoff", [tool(root, "check_ft009_local_intake_handoff.py"), str(root)]),
        Step("check FT-010 full-slice handoff", [tool(root, "check_ft010_full_slice_handoff.py"), str(root)]),
        Step("check FT-010 full-slice capture review", [tool(root, "check_ft010_full_slice_capture_review.py"), str(root)]),
        Step("check plugin package", [tool(root, "check_plugin_package.py"), str(root)]),
        Step("check repo-artifact release gate", [tool(root, "check_release_gate.py"), str(root), "--target", "repo-artifact"]),
        Step("check authoring skill routes", [tool(root, "check_skill_routes.py"), str(root / "draft-skills" / "nwn-server-gamedev")]),
        Step(
            "check plugin skill routes",
            [
                tool(root, "check_skill_routes.py"),
                str(root / "draft-plugins" / "nwn-server-gamedev-pack" / "skills" / "nwn-server-gamedev"),
            ],
        ),
    ]


def run_step(step: Step, result: PreflightResult, verbose: bool, root: Path) -> None:
    command = [sys.executable, *step.args]
    env = os.environ.copy()
    env["PYTHONPYCACHEPREFIX"] = str(Path(os.environ.get("TEMP", str(root.parent))) / "nwn-skill-pack-pycache")
    completed = subprocess.run(
        command,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        env=env,
    )
    output = completed.stdout.strip()
    if completed.returncode == step.expected_exit:
        result.ok(f"{step.name} passed")
        if verbose and output:
            print(output)
        return
    result.error(
        f"{step.name} failed with exit {completed.returncode}; expected {step.expected_exit}"
    )
    if output:
        result.error(output)


def run(root: Path, verbose: bool = False) -> PreflightResult:
    result = PreflightResult()
    compile_step = Step("compile release tooling", ["-m", "py_compile", *core_tool_paths(root)])
    run_step(compile_step, result, verbose, root)
    if result.errors:
        return result
    run_repo_artifact_hygiene_self_test(root, result)
    if result.errors:
        return result
    check_repo_artifact_hygiene(root, result)
    if result.errors:
        return result

    for step in generation_steps(root):
        run_step(step, result, verbose, root)
        if result.errors:
            return result

    for step in inventory_and_sandbox_steps(root):
        run_step(step, result, verbose, root)
        if result.errors:
            return result

    # The install packet names the current marketplace sandbox. Regenerate it once
    # after sandbox creation, then refresh inventory and sandbox hashes again.
    for step in [
        generation_steps(root)[-1],
        release_notes_step(root),
        release_next_actions_step(root),
        *inventory_and_sandbox_steps(root),
    ]:
        run_step(step, result, verbose, root)
        if result.errors:
            return result

    for step in check_steps(root):
        run_step(step, result, verbose, root)
        if result.errors:
            return result

    check_repo_artifact_hygiene(root, result)

    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--json", action="store_true", help="Emit JSON report.")
    parser.add_argument("--verbose", action="store_true", help="Print step output.")
    args = parser.parse_args()

    result = run(Path(args.root), verbose=args.verbose)
    if args.json:
        print(json.dumps({
            "checks": result.checks,
            "errors": result.errors,
            "passed": not result.errors,
        }, indent=2))
    else:
        for check in result.checks:
            print(f"OK: {check}")
        for error in result.errors:
            print(f"ERROR: {error}")
        if result.errors:
            print(f"Repo artifact preflight failed: {len(result.errors)} error(s)")
        else:
            print("Repo artifact preflight passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
