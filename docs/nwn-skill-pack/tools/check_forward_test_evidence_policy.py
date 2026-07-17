#!/usr/bin/env python3
"""Check forward-test evidence acceptance policy and release-gate wiring."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path


POLICY = Path("forward-tests/evidence-acceptance-policy.md")

REQUIRED_POLICY_TOKENS = [
    "## Purpose",
    "## Countable Prompt-Forward Evidence",
    "## Non-Countable Evidence",
    "## Coverage Rules",
    "## Reviewer Workflow",
    "## Verification Boundary",
    "`prompt-forward-test` record counts toward RC only",
    "`result` is `pass` or `partial`",
    "`context` states a fresh context or clean session was used",
    "no expected-answer leakage",
    "`artifacts` includes a filled returned capture sheet path under `.codex-tmp/forward-test-return-captures/`",
    "the returned capture sheet has passed `tools/check_forward_test_return_captures.py`",
    "reviewer score confirms the answer includes a First Implementable Slice",
    "`reviewer_assertions.first_implementable_slice=true`",
    "`--first-implementable-slice`",
    "does not describe the run as contaminated",
    "Coverage gates",
    "`--artifact`",
]
REQUIRED_RELEASE_GATE_TOKENS = [
    "def prompt_record_acceptance_errors",
    "def accepted_prompt_forward_records",
    "answer capture artifact",
    "RETURNED_CAPTURE_ARTIFACT_TOKENS",
    "missing returned capture sheet artifact path",
    "fresh context or clean session",
    "no expected-answer leakage",
    "accepted prompt forward tests run",
    "reviewer did not confirm First Implementable Slice",
]
REQUIRED_TEMPLATE_TOKENS = [
    "raw answer captured before reviewer-only scoring",
    "--artifact",
    "forward-test-return-captures",
    "First Implementable Slice",
    "--first-implementable-slice",
]
REQUIRED_RECORD_VALIDATOR_TOKENS = [
    "RETURNED_CAPTURE_ARTIFACT_TOKEN",
    "has_returned_capture_artifact",
    "prompt-forward-test pass/partial results require an artifact path",
    "forward-test-return-captures",
]


@dataclass
class EvidencePolicyCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def require_tokens(result: EvidencePolicyCheck, text: str, tokens: list[str], label: str) -> None:
    for token in tokens:
        if token in text:
            result.ok(f"{label} token exists: {token}")
        else:
            result.error(f"{label} missing token: {token}")


def run(root: Path) -> EvidencePolicyCheck:
    result = EvidencePolicyCheck()
    policy_path = root / POLICY
    if not policy_path.exists():
        result.error(f"{POLICY} is missing")
        return result
    result.ok(f"{POLICY} exists")
    require_tokens(result, policy_path.read_text(encoding="utf-8"), REQUIRED_POLICY_TOKENS, "policy")

    release_gate = root / "tools" / "check_release_gate.py"
    if not release_gate.exists():
        result.error("tools/check_release_gate.py is missing")
    else:
        require_tokens(
            result,
            release_gate.read_text(encoding="utf-8"),
            REQUIRED_RELEASE_GATE_TOKENS,
            "release gate",
        )

    record_validator = root / "tools" / "forward_test_record.py"
    if not record_validator.exists():
        result.error("tools/forward_test_record.py is missing")
    else:
        require_tokens(
            result,
            record_validator.read_text(encoding="utf-8"),
            REQUIRED_RECORD_VALIDATOR_TOKENS,
            "record validator",
        )

    template_generator = root / "tools" / "generate_forward_test_record_templates.py"
    if not template_generator.exists():
        result.error("tools/generate_forward_test_record_templates.py is missing")
    else:
        require_tokens(
            result,
            template_generator.read_text(encoding="utf-8"),
            REQUIRED_TEMPLATE_TOKENS,
            "record template generator",
        )

    templates = root / "forward-tests" / "record-command-templates.md"
    if templates.exists():
        require_tokens(
            result,
            templates.read_text(encoding="utf-8"),
            REQUIRED_TEMPLATE_TOKENS,
            "record templates",
        )
    else:
        result.error("forward-tests/record-command-templates.md is missing")

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
            print(f"Forward-test evidence policy check failed: {len(result.errors)} error(s)")
        else:
            print("Forward-test evidence policy check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
