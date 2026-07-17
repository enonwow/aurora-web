#!/usr/bin/env python3
"""Check the external contributor trial packet against the intake workflow."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType


TRIAL_PACKET = Path("knowledge-inbox/external-contributor-trial-packet.md")

PRIVACY_TOKENS = {
    "credentials",
    "tokens",
    "IP",
    "account",
    "private player data",
    "private module",
    "private server logs",
}

REQUIRED_TOKENS = {
    "contributor-intake-quickstart.md",
    "contribution-bundle-format.md",
    "user-feedback-form.md",
    "external-contributor-trial-result-template.md",
    "nwn_skill_feedback.py new",
    "nwn_skill_feedback.py validate",
    "nwn_skill_feedback.py bundle",
    "nwn_skill_feedback.py verify-bundle",
    "check_external_trial_cleanroom.py",
    "manifest.json",
    "SUMMARY.md",
    "command transcript",
    "pass",
    "partial",
    "fail",
    "private-data confirmation",
    "friction list",
    "does not self-update",
    "not RC evidence",
    "not NWN runtime proof",
    "human-feedback-release-workflow.md",
    "promotion-backlog.md",
    "generate_feedback_promotion_backlog.py",
    "without maintainer help",
    "without maintainer coaching",
}

FEEDBACK_COMMANDS = {
    "command_new",
    "command_validate",
    "command_bundle",
    "command_verify_bundle",
}


@dataclass
class TrialPacketCheck:
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
    result: TrialPacketCheck,
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


def run(root: Path) -> TrialPacketCheck:
    result = TrialPacketCheck()
    packet_path = root / TRIAL_PACKET
    if not packet_path.exists():
        result.error(f"{TRIAL_PACKET} is missing")
        return result

    result.ok(f"{TRIAL_PACKET} exists")
    text = packet_path.read_text(encoding="utf-8")

    require_tokens(result, "trial packet workflow", text, REQUIRED_TOKENS, case_sensitive=True)
    require_tokens(result, "trial packet privacy guidance", text, PRIVACY_TOKENS)

    try:
        feedback = load_module(root / "tools" / "nwn_skill_feedback.py", "nwn_skill_feedback_trial_packet")
    except Exception as exc:
        result.error(f"cannot import nwn_skill_feedback.py: {exc}")
        return result

    missing_commands = [
        command for command in sorted(FEEDBACK_COMMANDS)
        if not callable(getattr(feedback, command, None))
    ]
    if missing_commands:
        result.error(f"feedback CLI missing callable commands: {', '.join(missing_commands)}")
    else:
        result.ok("feedback CLI exposes required contribution commands")

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
            print(f"External contributor trial packet check failed: {len(result.errors)} error(s)")
        else:
            print("External contributor trial packet check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
