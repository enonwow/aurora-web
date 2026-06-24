#!/usr/bin/env python3
"""Check external NWN source registry and compact skill source-registry copies."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass, field
from pathlib import Path


EXTERNAL_REGISTRY = Path("external-nwn-source-registry.md")
AUTHORING_COMPACT = Path("draft-skills/nwn-server-gamedev/references/source-registry.md")
PLUGIN_COMPACT = Path(
    "draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev/references/source-registry.md"
)
TRUST_TIERS = ["primary", "strong-community", "community-example", "local-runtime"]
EXTERNAL_REQUIRED_TOKENS = [
    "## Trust Tiers",
    "## Codex Skill System Sources",
    "## NWN / NWN:EE Sources",
    "| Source | Tier | Domains | Use For | Promotion Rules |",
    "Beamdog NWN:EE docs/changelog",
    "NWN Lexicon main page",
    "nwn.wiki NUI page",
    "NWNX:EE docs",
    "neverwinter.nim",
    "Promotion Rules",
]
COMPACT_REQUIRED_TOKENS = [
    "## Trust Tiers",
    "## Preferred Sources By Domain",
    "Codex skill behavior",
    "NUI scripting",
    "2DA, TLK, and HAK structure",
    "NWNX",
    "NWSync tooling",
    "local-intake",
    "Aurora Toolset live intake",
    "promotion decision",
    "External documentation can suggest an implementation path. It does not replace runtime testing in the target module/server.",
]
FORBIDDEN_PLACEHOLDERS = ["TODO", "TBD", "<source>", "<tier>"]


@dataclass
class SourceRegistryCheck:
    checks: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def read_text(result: SourceRegistryCheck, root: Path, relative: Path) -> str:
    path = root / relative
    if not path.exists():
        result.error(f"missing source registry file: {relative}")
        return ""
    result.ok(f"source registry file exists: {relative}")
    return path.read_text(encoding="utf-8")


def require_tokens(
    result: SourceRegistryCheck,
    text: str,
    tokens: list[str],
    label: str,
) -> None:
    for token in tokens:
        if token in text:
            result.ok(f"{label} token exists: {token}")
        else:
            result.error(f"{label} missing token: {token}")


def check_tiers(result: SourceRegistryCheck, text: str, label: str) -> None:
    for tier in TRUST_TIERS:
        if f"`{tier}`" in text:
            result.ok(f"{label} trust tier exists: {tier}")
        else:
            result.error(f"{label} missing trust tier: {tier}")


def check_placeholders(result: SourceRegistryCheck, text: str, label: str) -> None:
    for placeholder in FORBIDDEN_PLACEHOLDERS:
        if placeholder in text:
            result.error(f"{label} contains placeholder: {placeholder}")


def run(root: Path) -> SourceRegistryCheck:
    result = SourceRegistryCheck()
    external = read_text(result, root, EXTERNAL_REGISTRY)
    authoring = read_text(result, root, AUTHORING_COMPACT)
    plugin = read_text(result, root, PLUGIN_COMPACT)

    if external:
        require_tokens(result, external, EXTERNAL_REQUIRED_TOKENS, "external registry")
        check_tiers(result, external, "external registry")
        check_placeholders(result, external, "external registry")

    if authoring:
        require_tokens(result, authoring, COMPACT_REQUIRED_TOKENS, "authoring compact registry")
        check_tiers(result, authoring, "authoring compact registry")
        check_placeholders(result, authoring, "authoring compact registry")

    if plugin:
        require_tokens(result, plugin, COMPACT_REQUIRED_TOKENS, "plugin compact registry")
        check_tiers(result, plugin, "plugin compact registry")
        check_placeholders(result, plugin, "plugin compact registry")

    if authoring and plugin:
        if authoring == plugin:
            result.ok("authoring and plugin compact source registries are synchronized")
        else:
            result.error("authoring and plugin compact source registries differ")

    result.warn("source registry check is static; it does not verify that external URLs are live")
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
            "warnings": result.warnings,
            "errors": result.errors,
        }, indent=2))
    else:
        for check in result.checks:
            print(f"OK: {check}")
        for warning in result.warnings:
            print(f"WARN: {warning}")
        for error in result.errors:
            print(f"ERROR: {error}")
        if result.errors:
            print(f"External source registry check failed: {len(result.errors)} error(s)")
        else:
            suffix = f", {len(result.warnings)} warning(s)" if result.warnings else ""
            print(f"External source registry check passed{suffix}")

    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
