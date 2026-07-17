#!/usr/bin/env python3
"""Check future knowledge-index policy coverage and package-state boundaries."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path


POLICY = Path("knowledge-index-policy.md")

REQUIRED_TOKENS = [
    "knowledge-index-policy.md",
    "docs/RAG",
    "reviewed knowledge",
    "knowledge-inbox/incoming/",
    "incoming",
    "unverified",
    "docs-verified",
    "runtime-tested",
    "project-specific",
    "local-reverse-lead",
    "toolset-observed",
    "static-checked",
    "compiled",
    "rejected",
    "claude-opus-import",
    "model-suggestion",
    "codex-session",
    "model-import-policy.md",
    "feedback-review-rubric.md",
    "reference-promotion-proposal-template.md",
    "reference_promotion_record.py",
    "aurora-live-evidence-workflow.md",
    "aurora-toolset-live-record.schema.json",
    "aurora_toolset_live_record.py",
    "generate_aurora_toolset_promotion_proposal.py",
    "check_aurora_toolset_promotion_proposal_tool.py",
    "check_record_contracts.py",
    "promotion_ready",
    "version-manifest.json",
    "local-aurora-reverse-ingestion.md",
    "local-thread-019ed62e-aurora-ui-gallery-intake.md",
    "local-aurora-symbol-index.md",
    "local-aurora-small-location-live-operator-checklist.md",
    "local-aurora-live-gap-queue.md",
    "reviewed Aurora live records",
    "external-nwn-source-registry.md",
    "source-registry.md",
    "draft-skills/nwn-server-gamedev/references/",
    "draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev/references/",
    ".codex-tmp",
    "credentials",
    "tokens",
    "IP",
    "account",
    "private player data",
    "private module",
    "run_repo_artifact_preflight.py",
    "check_domain_reference_status.py",
    "check_external_source_registry.py",
    "check_model_import_policy.py",
    "check_local_aurora_reverse_scope.py",
    "check_architecture_scorecard.py",
    "ADR",
    "Does Not Prove",
]


@dataclass
class KnowledgeIndexPolicyCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def load_manifest(root: Path) -> dict[str, object]:
    path = root / "version-manifest.json"
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError("version-manifest.json must contain an object")
    return data


def require_tokens(
    result: KnowledgeIndexPolicyCheck,
    label: str,
    text: str,
    tokens: list[str],
) -> None:
    missing = [token for token in tokens if token not in text]
    if missing:
        result.error(f"{label} missing tokens: {', '.join(missing)}")
    else:
        result.ok(f"{label} includes required tokens")


def run(root: Path) -> KnowledgeIndexPolicyCheck:
    result = KnowledgeIndexPolicyCheck()
    path = root / POLICY
    if not path.exists():
        result.error(f"{POLICY} is missing")
        return result

    text = path.read_text(encoding="utf-8")
    require_tokens(result, str(POLICY), text, REQUIRED_TOKENS)

    try:
        manifest = load_manifest(root)
    except Exception as exc:
        result.error(f"could not read version manifest: {exc}")
        return result

    if manifest.get("package_state") == "repo artifact":
        result.ok("knowledge index policy matches current repo artifact state")
    else:
        result.error("knowledge index policy must be reviewed before package_state changes from repo artifact")

    gate = manifest.get("release_gate")
    if not isinstance(gate, dict):
        result.error("version manifest release_gate must be an object")
    elif gate.get("rc_allowed") is False:
        result.ok("knowledge index policy matches blocked release-candidate state")
    else:
        result.error("knowledge index policy must be reviewed before claiming release-candidate is allowed")

    manifest_policy = manifest.get("knowledge_index_policy")
    if manifest_policy == str(POLICY):
        result.ok("version manifest points at knowledge index policy")
    else:
        result.error("version manifest knowledge_index_policy must point at knowledge-index-policy.md")

    manifest_check = manifest.get("knowledge_index_policy_check")
    if manifest_check == "tools/check_knowledge_index_policy.py":
        result.ok("version manifest points at knowledge index policy checker")
    else:
        result.error("version manifest knowledge_index_policy_check must point at tools/check_knowledge_index_policy.py")

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
            print(f"Knowledge index policy check failed: {len(result.errors)} error(s)")
        else:
            print("Knowledge index policy check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
