#!/usr/bin/env python3
"""Check the reference promotion proposal template for feedback-to-skill updates."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType


TEMPLATE = Path("knowledge-inbox/reference-promotion-proposal-template.md")


@dataclass
class TemplateCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

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


def require_tokens(result: TemplateCheck, label: str, text: str, tokens: set[str]) -> None:
    missing = sorted(token for token in tokens if token not in text)
    if missing:
        result.error(f"{label} missing tokens: {', '.join(missing)}")
    else:
        result.ok(f"{label} includes required tokens")


def run(root: Path) -> TemplateCheck:
    result = TemplateCheck()
    path = root / TEMPLATE
    if not path.exists():
        result.error(f"{TEMPLATE} is missing")
        return result

    text = path.read_text(encoding="utf-8")
    feedback = load_module(root / "tools" / "nwn_skill_feedback.py", "nwn_skill_feedback_reference_promotion")

    if "accept-for-promotion" not in feedback.ALLOWED_REVIEW_DECISIONS:
        result.error("feedback CLI no longer exposes accept-for-promotion review decision")
    else:
        result.ok("feedback CLI exposes accept-for-promotion review decision")

    required_tokens = {
        "Reference Promotion Proposal Template",
        "not automatic learning",
        "does not self-update",
        "generate_reference_promotion_proposal.py",
        "reference_promotion_record.py validate",
        "reference-promotions",
        "aggregate.md",
        "check_reference_promotion_records.py",
        "review.decision=accept-for-promotion",
        "review.promotion_ready=true",
        "nwn_skill_feedback.py validate",
        "generate_feedback_promotion_backlog.py",
        "Claim To Promote",
        "Evidence Label",
        "docs-verified",
        "runtime-tested",
        "project-specific",
        "Toolset",
        "client",
        "server",
        "logs",
        "module",
        "Target Reference Patch",
        "draft-skills/nwn-server-gamedev/references/",
        "draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev/references/",
        "SKILL.md",
        "source-of-truth-map.md",
        "external-nwn-source-registry.md",
        "version-manifest.json",
        "Privacy And Scope",
        "credentials",
        "tokens",
        "IP",
        "account",
        "private player data",
        "private module",
        "SemVer Decision",
        "PATCH",
        "MINOR",
        "MAJOR",
        "Verification Commands",
        "check_skill_routes.py",
        "check_domain_reference_status.py",
        "check_versioning_policy.py",
        "check_plugin_package.py",
        "check_release_gate.py",
        "run_repo_artifact_preflight.py",
        "knowledge-inbox/promoted/",
        "Does Not Prove",
        "NWN runtime behavior",
        "future automatic skill improvement",
    }
    require_tokens(result, str(TEMPLATE), text, required_tokens)

    forbidden_tokens = {
        "auto-train",
        "automatic training",
        "self-learning skill",
        "updates installed skills automatically",
    }
    leaked = sorted(token for token in forbidden_tokens if token.lower() in text.lower())
    if leaked:
        result.error(f"{TEMPLATE} contains misleading self-learning tokens: {', '.join(leaked)}")
    else:
        result.ok(f"{TEMPLATE} avoids misleading self-learning claims")

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
            print(f"Reference promotion proposal template check failed: {len(result.errors)} error(s)")
        else:
            print("Reference promotion proposal template check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
