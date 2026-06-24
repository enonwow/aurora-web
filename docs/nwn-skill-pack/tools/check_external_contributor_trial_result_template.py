#!/usr/bin/env python3
"""Check the external contributor trial result template."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path


RESULT_TEMPLATE = Path("knowledge-inbox/external-contributor-trial-result-template.md")

PRIVACY_TOKENS = {
    "credentials",
    "tokens",
    "IP addresses",
    "account names",
    "private player data",
    "private module",
    "private server logs",
}

REQUIRED_TOKENS = {
    "external-contributor-trial-packet.md",
    "contributor-intake-quickstart.md",
    "contribution-bundle-format.md",
    "nwn_skill_feedback.py",
    "check_external_contributor_trial_packet.py",
    "check_external_contributor_trial_result_template.py",
    "check_external_trial_cleanroom.py",
    "check_external_trial_dispatch_bundle.py",
    "check_external_trial_received_dispatch.py",
    "nwn_skill_feedback.py verify-bundle",
    "nwn_skill_feedback.py validate",
    "nwn_skill_feedback.py review",
    "external_trial_record.py new",
    "--cleanroom-check",
    "--independent-tester",
    "external_trial_record.py validate",
    "external_trial_record.py aggregate",
    "check_external_trial_records.py",
    "Trial Friction Feedback Candidate",
    "EXT-001 intake friction",
    "--domain ops",
    "--source-type maintainer-review",
    "--status unverified",
    "external trial record: docs\\nwn-skill-pack\\knowledge-inbox\\external-trials\\records\\<record-id>.json",
    "--proposed-file \"draft-skills/nwn-server-gamedev/references/feedback-and-versioning.md\"",
    "nwn_skill_feedback.py validate",
    "nwn_skill_feedback.py review",
    "needs-more-evidence",
    "does not update installed skill until reviewed and promoted",
    "manifest.json",
    "SUMMARY.md",
    "user-feedback-form.md",
    "command transcript",
    "friction list",
    "private-data confirmation",
    "pass",
    "partial",
    "fail",
    "quarantine",
    "does not self-update",
    "not RC evidence",
    "not NWN runtime proof",
    "without maintainer coaching",
    "never for local smoke alone",
    "promotion-backlog.md",
    "generate_feedback_promotion_backlog.py",
    "human-feedback-release-workflow.md",
    "Version manifest path",
    "Packet version or commit",
    "Tester role",
    "Tester environment",
    "Decision:",
    "Rationale:",
    "automatic skill improvement",
}


@dataclass
class TrialResultTemplateCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def require_tokens(
    result: TrialResultTemplateCheck,
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


def run(root: Path) -> TrialResultTemplateCheck:
    result = TrialResultTemplateCheck()
    template_path = root / RESULT_TEMPLATE
    if not template_path.exists():
        result.error(f"{RESULT_TEMPLATE} is missing")
        return result

    result.ok(f"{RESULT_TEMPLATE} exists")
    text = template_path.read_text(encoding="utf-8")

    require_tokens(result, "trial result template workflow", text, REQUIRED_TOKENS, case_sensitive=True)
    require_tokens(result, "trial result template privacy guidance", text, PRIVACY_TOKENS)

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
            print(f"External contributor trial result template check failed: {len(result.errors)} error(s)")
        else:
            print("External contributor trial result template check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
