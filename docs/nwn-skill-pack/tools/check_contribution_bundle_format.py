#!/usr/bin/env python3
"""Check the feedback contribution bundle workflow contract."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType


FORMAT_DOC = Path("knowledge-inbox/contribution-bundle-format.md")

DOC_TOKENS = {
    "nwn_skill_feedback.py bundle",
    "nwn_skill_feedback.py verify-bundle",
    "manifest.json",
    "SUMMARY.md",
    "feedback-records/",
    "contains_official_skill_update",
    "review_required_before_promotion",
    "SHA-256",
    "does not update the official skill",
    "human-feedback-release-workflow.md",
}

PRIVACY_TOKENS = {
    "credentials",
    "tokens",
    "IP",
    "account",
    "private player data",
    "private module",
    "private server logs",
}


@dataclass
class ContributionBundleCheck:
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
    result: ContributionBundleCheck,
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


def run(root: Path) -> ContributionBundleCheck:
    result = ContributionBundleCheck()
    doc_path = root / FORMAT_DOC
    if not doc_path.exists():
        result.error(f"{FORMAT_DOC} is missing")
        return result

    text = doc_path.read_text(encoding="utf-8")
    result.ok(f"{FORMAT_DOC} exists")
    require_tokens(result, "contribution bundle doc", text, DOC_TOKENS, case_sensitive=True)
    require_tokens(result, "contribution bundle privacy guidance", text, PRIVACY_TOKENS)

    feedback = load_module(root / "tools" / "nwn_skill_feedback.py", "nwn_skill_feedback_bundle_check")
    parser_help = feedback.build_parser().format_help()
    require_tokens(result, "feedback CLI top-level help", parser_help, {"bundle"})

    required_symbols = [
        "PRIVACY_SCAN_TERMS",
        "command_bundle",
        "command_verify_bundle",
        "entry_bundle_path",
        "scan_privacy_terms",
        "sha256",
    ]
    for symbol in required_symbols:
        if hasattr(feedback, symbol):
            result.ok(f"feedback CLI exposes {symbol}")
        else:
            result.error(f"feedback CLI missing {symbol}")

    terms = getattr(feedback, "PRIVACY_SCAN_TERMS", [])
    if not isinstance(terms, list) or len(terms) < 5:
        result.error("PRIVACY_SCAN_TERMS should contain at least five terms")
    else:
        result.ok("privacy scan vocabulary is present")

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
            print(f"Contribution bundle format check failed: {len(result.errors)} error(s)")
        else:
            print("Contribution bundle format check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
