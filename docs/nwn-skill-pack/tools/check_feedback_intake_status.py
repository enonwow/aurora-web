#!/usr/bin/env python3
"""Check whether feedback-intake-status.md matches current intake records."""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path


STATUS_PATH = Path("feedback-intake-status.md")
GENERATED_RE = re.compile(r"^Generated: .+$", re.MULTILINE)


@dataclass
class FeedbackIntakeStatusCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def normalize(text: str) -> str:
    return GENERATED_RE.sub("Generated: <ignored>", text).replace("\r\n", "\n")


def load_generator(root: Path):
    tool_path = root / "tools" / "generate_feedback_intake_status.py"
    if not tool_path.exists():
        raise FileNotFoundError(f"feedback intake status generator is missing: {tool_path}")
    spec = importlib.util.spec_from_file_location("generate_feedback_intake_status", tool_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not import feedback intake status generator: {tool_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    if not hasattr(module, "generate"):
        raise RuntimeError("feedback intake status generator does not expose generate(root)")
    return module.generate


def run(root: Path) -> FeedbackIntakeStatusCheck:
    result = FeedbackIntakeStatusCheck()
    path = root / STATUS_PATH
    if not path.exists():
        result.error(f"{STATUS_PATH} is missing")
        return result

    text = path.read_text(encoding="utf-8")
    required_tokens = [
        "Feedback Intake Status",
        "Feedback records scanned: 2",
        "Incoming records needing maintainer review: 0",
        "Incoming records with reviewed/rejected/promoted copies: 1",
        "Promotion-ready reviewed records: 0",
        "Accepted reference promotion records: 0",
        "Proposed SemVer class: `NONE`",
        "Incoming With Existing Review Copy",
        "nwn_skill_feedback.py validate",
        "nwn_skill_feedback.py review",
        "generate_reference_promotion_proposal.py",
        "reference_promotion_record.py",
        "generate_version_bump_plan.py",
        "model-suggestion",
        "claude-opus-import",
        "codex-session",
        "Does Not Prove",
    ]
    for token in required_tokens:
        if token not in text:
            result.error(f"{STATUS_PATH} missing token: {token}")
    if not result.errors:
        result.ok("feedback intake status includes required counts, workflow, model-import, and boundary tokens")

    try:
        generator = load_generator(root)
        current = generator(root)
    except Exception as exc:
        result.error(f"feedback intake status freshness check failed: {exc}")
        return result

    if normalize(text) == normalize(current):
        result.ok("feedback-intake-status.md matches current generated report except timestamp")
    else:
        result.error(
            "feedback-intake-status.md is stale; regenerate with tools/generate_feedback_intake_status.py"
        )

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
            print(f"Feedback intake status check failed: {len(result.errors)} error(s)")
        else:
            print("Feedback intake status check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
