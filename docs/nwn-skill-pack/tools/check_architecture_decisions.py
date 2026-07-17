#!/usr/bin/env python3
"""Check NWN skill-pack architecture decision records."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path


ADR = Path("architecture-decisions/adr-0001-skill-plugin-first.md")

REQUIRED_SECTIONS = {
    "## Status",
    "## Context",
    "## Decision",
    "## Options Considered",
    "## Promotion Gates",
    "## Consequences",
    "## Validation",
}

REQUIRED_TOKENS = {
    "skill-creator",
    "plugin-creator",
    "Codex skill",
    "Plugin",
    "Git repo",
    "Repo template",
    "MCP",
    "Docs/RAG",
    "Workflow tooling",
    "does not self-update",
    "human feedback",
    "SemVer",
    "forward tests",
    "install smoke",
    "release candidate",
    "version-manifest.json",
    "architecture-escalation-roadmap.md",
    "run_repo_artifact_preflight.py",
    "check_release_gate.py",
}


@dataclass
class AdrCheck:
    errors: list[str] = field(default_factory=list)
    checks: list[str] = field(default_factory=list)

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


def require_tokens(result: AdrCheck, label: str, text: str, tokens: set[str]) -> None:
    missing = sorted(token for token in tokens if token not in text)
    if missing:
        result.error(f"{label} missing tokens: {', '.join(missing)}")
    else:
        result.ok(f"{label} includes required tokens")


def run(root: Path) -> AdrCheck:
    result = AdrCheck()
    adr_path = root / ADR
    if not adr_path.exists():
        result.error(f"{ADR} is missing")
        return result

    result.ok(f"{ADR} exists")
    text = adr_path.read_text(encoding="utf-8")

    require_tokens(result, "ADR sections", text, REQUIRED_SECTIONS)
    require_tokens(result, "ADR vocabulary", text, REQUIRED_TOKENS)

    try:
        manifest = load_manifest(root)
    except Exception as exc:
        result.error(f"could not read version manifest: {exc}")
        return result

    if manifest.get("package_state") != "repo artifact":
        result.error("ADR-0001 is scoped to current repo artifact state; update ADR before changing package_state")
    else:
        result.ok("ADR state matches repo artifact manifest state")

    gate = manifest.get("release_gate")
    if not isinstance(gate, dict):
        result.error("version manifest release_gate must be an object")
    elif gate.get("rc_allowed") is not False:
        result.error("ADR-0001 expects release candidate gate to remain blocked")
    else:
        result.ok("ADR state matches blocked release-candidate gate")

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
            print(f"Architecture decision check failed: {len(result.errors)} error(s)")
        else:
            print("Architecture decision check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
