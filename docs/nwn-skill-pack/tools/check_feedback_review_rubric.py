#!/usr/bin/env python3
"""Check the feedback review rubric for promotion decision guardrails."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path


RUBRIC = Path("knowledge-inbox/feedback-review-rubric.md")


@dataclass
class RubricCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def require_tokens(result: RubricCheck, label: str, text: str, tokens: list[str]) -> None:
    missing = [token for token in tokens if token not in text]
    if missing:
        result.error(f"{label} missing tokens: {', '.join(missing)}")
    else:
        result.ok(f"{label} includes required tokens")


def run(root: Path) -> RubricCheck:
    result = RubricCheck()
    path = root / RUBRIC
    if not path.exists():
        result.error(f"{RUBRIC} is missing")
        return result

    text = path.read_text(encoding="utf-8")
    require_tokens(result, str(RUBRIC), text, [
        "not automatic learning",
        "review.decision",
        "accept-for-promotion",
        "needs-more-evidence",
        "project-specific-only",
        "reject",
        "supersede",
        "rejected",
        "superseded",
        "review.promotion_ready=true",
        "promotion_ready=false",
        "unverified",
        "docs-verified",
        "runtime-tested",
        "project-specific",
        "model-import-policy.md",
        "reference-promotion-proposal-template.md",
        "generate_reference_promotion_proposal.py",
        "generate_feedback_intake_status.py",
        "version-bump-plan.md",
        "versioning-policy.md",
        "draft-skills/nwn-server-gamedev/references/",
        "draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev/references/",
        "credentials",
        "tokens",
        "IP addresses",
        "account names",
        "private player data",
        "private module",
        "Does Not Prove",
        "does not prove a submitted NWN claim is true",
    ])
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
            print(f"Feedback review rubric check failed: {len(result.errors)} error(s)")
        else:
            print("Feedback review rubric check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
