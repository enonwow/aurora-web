#!/usr/bin/env python3
"""Check the model-import policy against the feedback CLI contract."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType


POLICY = Path("knowledge-inbox/model-import-policy.md")
MODEL_SOURCE_TYPES = {"claude-opus-import", "model-suggestion", "codex-session"}
REQUIRED_STATUSES = {"unverified", "project-specific", "docs-verified", "runtime-verified"}
REQUIRED_TOKENS = {
    "Claude",
    "Opus",
    "Codex",
    "model agreement",
    "not verification",
    "nwn_skill_feedback.py new",
    "nwn_skill_feedback.py validate",
    "generate_feedback_promotion_backlog.py",
    "feedback-record.schema.json",
    "check_model_import_policy.py",
    "source code",
    "Toolset",
    "server runtime",
    "controlled test module",
    "proposed target reference file",
    "what would verify or falsify the claim",
}
PRIVACY_TOKENS = {
    "credentials",
    "tokens",
    "IP",
    "account",
    "private player data",
    "private module",
    "private server logs",
    "private Discord/forum transcripts",
}


@dataclass
class ModelImportPolicyCheck:
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


def require_tokens(
    result: ModelImportPolicyCheck,
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


def run(root: Path) -> ModelImportPolicyCheck:
    result = ModelImportPolicyCheck()
    policy_path = root / POLICY
    if not policy_path.exists():
        result.error(f"{POLICY} is missing")
        return result

    result.ok(f"{POLICY} exists")
    text = policy_path.read_text(encoding="utf-8")
    feedback = load_module(root / "tools" / "nwn_skill_feedback.py", "nwn_skill_feedback_model_import")

    require_tokens(result, "model import policy", text, REQUIRED_TOKENS, case_sensitive=True)
    require_tokens(result, "model import privacy guidance", text, PRIVACY_TOKENS)
    require_tokens(result, "model import source types", text, MODEL_SOURCE_TYPES)
    require_tokens(result, "model import statuses", text, REQUIRED_STATUSES)

    missing_source_types = sorted(MODEL_SOURCE_TYPES - set(feedback.ALLOWED_SOURCE_TYPES))
    if missing_source_types:
        result.error(f"feedback CLI missing model source types: {', '.join(missing_source_types)}")
    else:
        result.ok("feedback CLI includes model import source types")

    missing_statuses = sorted(REQUIRED_STATUSES - set(feedback.ALLOWED_STATUSES))
    if missing_statuses:
        result.error(f"feedback CLI missing model import statuses: {', '.join(missing_statuses)}")
    else:
        result.ok("feedback CLI includes model import statuses")

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
            print(f"Model import policy check failed: {len(result.errors)} error(s)")
        else:
            print("Model import policy check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
