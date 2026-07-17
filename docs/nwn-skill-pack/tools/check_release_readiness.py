#!/usr/bin/env python3
"""Check whether release-readiness.md matches the current generated report."""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path


READINESS_PATH = Path("release-readiness.md")
GENERATED_RE = re.compile(r"^Generated: .+$", re.MULTILINE)
REQUIRED_TOKENS = [
    "Aurora Live Review Outcome Gate",
    "check_release_gate.py",
    "contextual validation",
    "live_record_path",
    "Minimum First Live Pass",
    "Maintainer Handoff Before Candidate Promotion",
    "release-evidence-index.md",
    "aurora-live-promotion-proof-gates.md",
    "local Aurora reverse/thread leads",
    "local-aurora-reverse-ingestion.md",
    "local-thread-019ed62e-aurora-ui-gallery-intake.md",
    "local-aurora-live-gap-queue.md",
    "release-routing evidence only",
    "do not unblock release-candidate or install-candidate gates",
    "reviewed Aurora live records or exact blockers",
    "maintainer-decision-index.md",
    "proof-gates dashboard as control evidence only",
    "automatic skill improvement",
    "Do not claim the skill was strengthened",
    "check_aurora_live_promotion_proof_gates.py",
]


@dataclass
class ReadinessCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def normalize(text: str) -> str:
    return GENERATED_RE.sub("Generated: <ignored>", text).replace("\r\n", "\n")


def load_generator(root: Path):
    tool_path = root / "tools" / "generate_release_readiness.py"
    if not tool_path.exists():
        raise FileNotFoundError(f"release-readiness generator is missing: {tool_path}")

    spec = importlib.util.spec_from_file_location("generate_release_readiness", tool_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not import release-readiness generator: {tool_path}")

    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    if not hasattr(module, "generate"):
        raise RuntimeError("release-readiness generator does not expose generate(root)")
    return module.generate


def run(root: Path) -> ReadinessCheck:
    result = ReadinessCheck()
    path = root / READINESS_PATH
    if not path.exists():
        result.error(f"{READINESS_PATH} is missing")
        return result

    try:
        generator = load_generator(root)
        recorded = path.read_text(encoding="utf-8")
        current = generator(root)
    except Exception as exc:
        result.error(f"release-readiness check failed: {exc}")
        return result

    if normalize(recorded) == normalize(current):
        result.ok("release-readiness.md matches current generated report except timestamp")
    else:
        result.error(
            "release-readiness.md is stale; regenerate with tools/generate_release_readiness.py"
        )

    for token in REQUIRED_TOKENS:
        if token in recorded:
            result.ok(f"release-readiness.md documents {token}")
        else:
            result.error(f"release-readiness.md must document {token}")

    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--json", action="store_true", help="Emit JSON report.")
    args = parser.parse_args()

    result = run(Path(args.root))
    if args.json:
        print(json.dumps({
            "checks": result.checks,
            "errors": result.errors,
        }, indent=2))
    else:
        for check in result.checks:
            print(f"OK: {check}")
        for error in result.errors:
            print(f"ERROR: {error}")
        if result.errors:
            print(f"Release readiness check failed: {len(result.errors)} error(s)")
        else:
            print("Release readiness check passed")

    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
