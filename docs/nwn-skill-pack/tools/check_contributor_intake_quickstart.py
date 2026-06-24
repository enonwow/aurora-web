#!/usr/bin/env python3
"""Check the contributor intake quickstart against the feedback workflow contract."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType


QUICKSTART = Path("knowledge-inbox/contributor-intake-quickstart.md")
INTAKE_STATUS_EXCLUSIONS = {"promoted", "rejected", "superseded"}

PRIVACY_TOKENS = {
    "credentials",
    "tokens",
    "IP",
    "account",
    "private player data",
    "private module",
    "private server logs",
}

WORKFLOW_TOKENS = {
    "does not self-update",
    "new release",
    "maintainer review",
    "SemVer",
    "human-feedback-release-workflow.md",
    "lifecycle-policy.md",
    "contributor-feedback-packet.md",
    "contribution-bundle-format.md",
    "feedback-record.schema.json",
    "user-feedback-form.md",
    "github-issue-body.md",
    "promotion-backlog.md",
}

COMMAND_TOKENS = {
    "nwn_skill_feedback.py new",
    "nwn_skill_feedback.py validate",
    "nwn_skill_feedback.py review",
    "nwn_skill_feedback.py aggregate",
    "nwn_skill_feedback.py bundle",
    "nwn_skill_feedback.py verify-bundle",
    "generate_feedback_promotion_backlog.py",
    "check_feedback_intake_docs.py",
    "check_contributor_intake_quickstart.py",
    "run_repo_artifact_preflight.py",
    "check_release_gate.py",
}

EVIDENCE_LABEL_TOKENS = {
    "unverified",
    "project-specific",
    "docs-verified",
    "runtime-verified",
    "runtime-tested",
}


@dataclass
class QuickstartCheck:
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


def require_tokens(
    result: QuickstartCheck,
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


def run(root: Path) -> QuickstartCheck:
    result = QuickstartCheck()
    quickstart_path = root / QUICKSTART
    if not quickstart_path.exists():
        result.error(f"{QUICKSTART} is missing")
        return result

    result.ok(f"{QUICKSTART} exists")
    text = quickstart_path.read_text(encoding="utf-8")
    feedback = load_module(root / "tools" / "nwn_skill_feedback.py", "nwn_skill_feedback_quickstart")

    intake_statuses = set(feedback.ALLOWED_STATUSES) - INTAKE_STATUS_EXCLUSIONS
    review_statuses = set(feedback.ALLOWED_STATUSES)
    domains = set(feedback.ALLOWED_DOMAINS)
    source_types = set(feedback.ALLOWED_SOURCE_TYPES)

    require_tokens(result, "quickstart workflow", text, WORKFLOW_TOKENS, case_sensitive=True)
    require_tokens(result, "quickstart commands", text, COMMAND_TOKENS)
    require_tokens(result, "quickstart privacy guidance", text, PRIVACY_TOKENS)
    require_tokens(result, "quickstart intake statuses", text, intake_statuses)
    require_tokens(result, "quickstart review statuses", text, review_statuses)
    require_tokens(result, "quickstart source types", text, source_types)
    require_tokens(result, "quickstart domains", text, domains)
    require_tokens(result, "quickstart evidence labels", text, EVIDENCE_LABEL_TOKENS)

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
            print(f"Contributor intake quickstart check failed: {len(result.errors)} error(s)")
        else:
            print("Contributor intake quickstart check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
