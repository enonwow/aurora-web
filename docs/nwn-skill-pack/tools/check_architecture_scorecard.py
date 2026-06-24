#!/usr/bin/env python3
"""Check architecture escalation scorecard coverage and boundaries."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path


SCORECARD = Path("architecture-escalation-scorecard.md")


@dataclass
class ScorecardCheck:
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
    result: ScorecardCheck,
    label: str,
    text: str,
    tokens: list[str],
) -> None:
    missing = [token for token in tokens if token not in text]
    if missing:
        result.error(f"{label} missing tokens: {', '.join(missing)}")
    else:
        result.ok(f"{label} includes required tokens")


def run(root: Path) -> ScorecardCheck:
    result = ScorecardCheck()
    path = root / SCORECARD
    if not path.exists():
        result.error(f"{SCORECARD} is missing")
        return result

    text = path.read_text(encoding="utf-8")
    require_tokens(result, str(SCORECARD), text, [
        "Current Recommendation",
        "Current package state: `repo artifact`",
        "Codex skill",
        "Plugin",
        "Git repo",
        "Local workflow tooling",
        "Repo template",
        "GitHub issues/PRs",
        "MCP",
        "Docs/RAG",
        "Hosted workflow tooling",
        "Use now",
        "Keep as draft package",
        "Defer",
        "Hard Gates Before Escalation",
        "run_repo_artifact_preflight.py",
        "check_release_gate.py",
        "INSTALL-001",
        "prompt-forward",
        "SemVer",
        "unreviewed incoming records",
        "model-only claims",
        "new ADR",
        "Verified",
        "Still Hypothesis",
        "Does Not Prove",
    ])

    try:
        manifest = load_manifest(root)
    except Exception as exc:
        result.error(f"could not read version manifest: {exc}")
        return result

    if manifest.get("package_state") == "repo artifact":
        result.ok("scorecard matches current repo artifact state")
    else:
        result.error("scorecard must be updated before package_state changes from repo artifact")

    gate = manifest.get("release_gate")
    if not isinstance(gate, dict):
        result.error("version manifest release_gate must be an object")
    elif gate.get("rc_allowed") is False:
        result.ok("scorecard matches blocked release-candidate state")
    else:
        result.error("scorecard must be updated before claiming release-candidate is allowed")

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
            print(f"Architecture scorecard check failed: {len(result.errors)} error(s)")
        else:
            print("Architecture scorecard check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
