#!/usr/bin/env python3
"""Check the NWN skill-pack versioning policy against local release metadata."""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


POLICY = Path("versioning-policy.md")
PLUGIN_MANIFEST = Path("draft-plugins/nwn-server-gamedev-pack/.codex-plugin/plugin.json")
SEMVER_RE = re.compile(
    r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)"
    r"(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?"
    r"(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$"
)

REQUIRED_STATES = {
    "repo artifact",
    "release candidate",
    "local install candidate",
    "public release",
}

REQUIRED_SECTIONS = {
    "## Package States",
    "## SemVer Rules",
    "## Human Feedback Release Path",
    "## Compatibility Rules",
    "## Release Checklist",
    "## Current Status",
    "## Verified Boundary",
}

REQUIRED_TOKENS = {
    "version-manifest.json",
    ".codex-plugin/plugin.json",
    "nwn_skill_feedback.py new",
    "nwn_skill_feedback.py validate",
    "nwn_skill_feedback.py review",
    "promotion-backlog.md",
    "reference_promotion_record.py",
    "reference-promotions/aggregate.md",
    "version-bump-plan.md",
    "generate_version_bump_plan.py",
    "check_version_bump_plan.py",
    "PATCH",
    "MINOR",
    "MAJOR",
    "check_versioning_policy.py",
    "check_version_manifest.py",
    "run_repo_artifact_preflight.py",
    "check_release_gate.py",
    "install-smoke",
    "forward tests",
    "does not update installed skills by itself",
    "credentials",
    "tokens",
    "IP",
    "account",
    "private player data",
    "server logs",
}


@dataclass
class VersioningPolicyCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def require_tokens(
    result: VersioningPolicyCheck,
    label: str,
    text: str,
    tokens: set[str],
) -> None:
    missing = sorted(token for token in tokens if token not in text)
    if missing:
        result.error(f"{label} missing tokens: {', '.join(missing)}")
    else:
        result.ok(f"{label} includes required tokens")


def run(root: Path) -> VersioningPolicyCheck:
    result = VersioningPolicyCheck()
    policy_path = root / POLICY
    if not policy_path.exists():
        result.error(f"{POLICY} is missing")
        return result

    result.ok(f"{POLICY} exists")
    text = policy_path.read_text(encoding="utf-8")
    require_tokens(result, "versioning policy sections", text, REQUIRED_SECTIONS)
    require_tokens(result, "versioning policy vocabulary", text, REQUIRED_TOKENS)
    require_tokens(result, "versioning policy states", text, REQUIRED_STATES)

    try:
        manifest = load_json(root / "version-manifest.json")
        plugin = load_json(root / PLUGIN_MANIFEST)
    except Exception as exc:
        result.error(f"could not read version metadata: {exc}")
        return result

    version = manifest.get("version")
    if not isinstance(version, str) or not SEMVER_RE.match(version):
        result.error(f"manifest version is not strict semver: {version!r}")
    elif f"Current version: `{version}`" not in text:
        result.error(f"versioning policy current version does not match manifest: {version}")
    else:
        result.ok("versioning policy current version matches manifest")

    state = manifest.get("package_state")
    if not isinstance(state, str) or state not in REQUIRED_STATES:
        result.error(f"manifest package_state is not a recognized policy state: {state!r}")
    elif f"Current state: `{state}`" not in text:
        result.error(f"versioning policy current state does not match manifest: {state}")
    else:
        result.ok("versioning policy current state matches manifest")

    if plugin.get("version") != version:
        result.error("plugin version does not match version manifest")
    else:
        result.ok("plugin version matches version manifest")

    semver_policy = manifest.get("semver_policy")
    if not isinstance(semver_policy, dict):
        result.error("version manifest semver_policy must be an object")
    else:
        for key in ("patch", "minor", "major"):
            if not semver_policy.get(key):
                result.error(f"version manifest semver_policy.{key} is missing")
        if not any(error.startswith("version manifest semver_policy.") for error in result.errors):
            result.ok("version manifest semver policy is complete")

    gate = manifest.get("release_gate")
    if isinstance(gate, dict) and gate.get("rc_allowed") is False:
        result.ok("versioning policy matches blocked release-candidate status")
    else:
        result.error("versioning policy expects current release-candidate status to be blocked")

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
            print(f"Versioning policy check failed: {len(result.errors)} error(s)")
        else:
            print("Versioning policy check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
