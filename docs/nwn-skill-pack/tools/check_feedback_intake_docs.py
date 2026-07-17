#!/usr/bin/env python3
"""Check human feedback intake docs against the feedback CLI contract."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType


PACKET = Path("contributor-feedback-packet.md")
WORKFLOW = Path("human-feedback-release-workflow.md")
REFERENCE_PROMOTION_TEMPLATE = Path("knowledge-inbox/reference-promotion-proposal-template.md")
CONTRIBUTION_BUNDLE = Path("knowledge-inbox/contribution-bundle-format.md")
USER_FORM = Path("knowledge-inbox/templates/user-feedback-form.md")
GITHUB_BODY = Path("knowledge-inbox/templates/github-issue-body.md")

INTAKE_STATUS_EXCLUSIONS = {"promoted", "rejected", "superseded"}
REQUIRED_PRIVACY_TOKENS = {
    "credentials",
    "tokens",
    "IP",
    "account",
    "private player data",
    "private module",
}


@dataclass
class IntakeDocCheck:
    errors: list[str] = field(default_factory=list)
    checks: list[str] = field(default_factory=list)

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


def read_required(root: Path, rel_path: Path, result: IntakeDocCheck) -> str:
    path = root / rel_path
    if not path.exists():
        result.error(f"{rel_path} is missing")
        return ""
    result.ok(f"{rel_path} exists")
    return path.read_text(encoding="utf-8")


def require_tokens(
    result: IntakeDocCheck,
    label: str,
    text: str,
    tokens: set[str],
    case_sensitive: bool = False,
) -> None:
    haystack = text if case_sensitive else text.lower()
    missing = []
    for token in sorted(tokens):
        needle = token if case_sensitive else token.lower()
        if needle not in haystack:
            missing.append(token)
    if missing:
        result.error(f"{label} missing tokens: {', '.join(missing)}")
    else:
        result.ok(f"{label} includes required tokens")


def run(root: Path) -> IntakeDocCheck:
    result = IntakeDocCheck()
    feedback = load_module(root / "tools" / "nwn_skill_feedback.py", "nwn_skill_feedback_intake")

    packet = read_required(root, PACKET, result)
    workflow = read_required(root, WORKFLOW, result)
    reference_promotion_template = read_required(root, REFERENCE_PROMOTION_TEMPLATE, result)
    contribution_bundle = read_required(root, CONTRIBUTION_BUNDLE, result)
    user_form = read_required(root, USER_FORM, result)
    github_body = read_required(root, GITHUB_BODY, result)

    intake_statuses = set(feedback.ALLOWED_STATUSES) - INTAKE_STATUS_EXCLUSIONS
    domains = set(feedback.ALLOWED_DOMAINS)
    source_types = set(feedback.ALLOWED_SOURCE_TYPES)

    require_tokens(result, "contributor packet", packet, {
        "feedback-record.schema.json",
        "nwn_skill_feedback.py validate",
        "nwn_skill_feedback.py new",
        "nwn_skill_feedback.py review",
        "new release",
    })
    require_tokens(result, "contributor packet privacy guidance", packet, REQUIRED_PRIVACY_TOKENS)

    require_tokens(result, "human feedback release workflow", workflow, {
        "does not self-update",
        "Feedback Source Map",
        "No row self-updates the installed skill.",
        "forward-tests/ft-010-full-slice-capture-review.md",
        "forward-tests/install-smoke-packet.md",
        "install-smoke-execution-playbook.md",
        "external-contributor-trial-result-template.md",
        "external-trials/ext-001-handoff.md",
        "external-nwn-source-registry.md",
        "model-import-policy.md",
        "knowledge-index-policy.md",
        "knowledge-inbox/promotion-backlog.md",
        "version-bump-plan.md",
        "raw signal",
        "nwn_skill_feedback.py review",
        "generate_feedback_promotion_backlog.py",
        "reference-promotion-proposal-template.md",
        "reference_promotion_record.py",
        "aurora-live-promotion-proof-gates.md",
        "aurora_live_retest_promotion_decision.py",
        "check_aurora_live_promotion_proof_gates.py",
        "generate_version_bump_plan.py",
        "check_version_bump_plan.py",
        "version-manifest.json",
        "SemVer",
        "release-handoff-template.md",
        "check_release_gate.py",
        "does not self-update",
        "Do not patch from a synthetic, blocked, partial, or unreviewed retest result.",
    }, case_sensitive=True)
    require_tokens(result, "human feedback release workflow privacy guidance", workflow, REQUIRED_PRIVACY_TOKENS)

    require_tokens(result, "reference promotion proposal template", reference_promotion_template, {
        "generate_reference_promotion_proposal.py",
        "reference_promotion_record.py",
        "check_reference_promotion_records.py",
        "review.decision=accept-for-promotion",
        "review.promotion_ready=true",
        "Target Reference Patch",
        "draft-skills/nwn-server-gamedev/references/",
        "draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev/references/",
        "SemVer Decision",
        "Verification Commands",
        "Does Not Prove",
    }, case_sensitive=True)
    require_tokens(result, "reference promotion proposal privacy guidance", reference_promotion_template, REQUIRED_PRIVACY_TOKENS)

    require_tokens(result, "contribution bundle format", contribution_bundle, {
        "nwn_skill_feedback.py bundle",
        "nwn_skill_feedback.py verify-bundle",
        "manifest.json",
        "feedback-records/",
        "does not update the official skill",
        "review_required_before_promotion",
    }, case_sensitive=True)
    require_tokens(result, "contribution bundle privacy guidance", contribution_bundle, REQUIRED_PRIVACY_TOKENS)

    for label, text in {
        "user feedback form": user_form,
        "github issue body": github_body,
    }.items():
        require_tokens(result, f"{label} domains", text, domains)
        require_tokens(result, f"{label} source types", text, source_types)
        require_tokens(result, f"{label} intake statuses", text, intake_statuses)
        require_tokens(result, f"{label} privacy guidance", text, REQUIRED_PRIVACY_TOKENS)

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
            print(f"Feedback intake doc check failed: {len(result.errors)} error(s)")
        else:
            print("Feedback intake doc check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
