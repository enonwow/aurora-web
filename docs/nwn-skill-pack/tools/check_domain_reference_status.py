#!/usr/bin/env python3
"""Check source-status hygiene in NWN domain reference files."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass, field
from pathlib import Path


AUTHORING_REFERENCES = Path("draft-skills/nwn-server-gamedev/references")
PLUGIN_REFERENCES = Path(
    "draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev/references"
)

DOMAIN_FILES = [
    "locations-areas-tilesets.md",
    "items-equipment-loot.md",
    "creatures-encounters-ai.md",
    "nwscript-events-systems.md",
    "two-da-hak-tlk-pipeline.md",
    "nui-player-ui.md",
    "persistence-database-nwnx.md",
    "deployment-nwsync-ops.md",
    "economy-crafting-progression.md",
    "quests-dialogues-journal.md",
    "testing-runtime-qa.md",
]

STANDARD_REQUIRED_TOKENS = [
    "## Source Status",
    "`docs-verified`",
    "`runtime-tested`",
    "## Source-Backed Facts To Preserve",
    "## Runtime Verification",
    "## Sources",
]

TESTING_QA_REQUIRED_TOKENS = [
    "Source Status:",
    "docs-verified",
    "Runtime evidence is still required",
    "## Evidence Ladder",
    "`runtime-tested`",
    "## Source-Backed Testing Facts",
    "## Sources",
]

FORBIDDEN_PLACEHOLDERS = ["TODO", "TBD", "<source-status>", "<runtime-evidence>"]


@dataclass
class DomainReferenceStatusCheck:
    checks: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def contains(text: str, token: str) -> bool:
    return token.lower() in text.lower()


def read_reference(
    result: DomainReferenceStatusCheck,
    root: Path,
    references_dir: Path,
    file_name: str,
    label: str,
) -> str:
    relative = references_dir / file_name
    path = root / relative
    if not path.exists():
        result.error(f"{label} reference is missing: {relative}")
        return ""
    result.ok(f"{label} reference exists: {relative}")
    return path.read_text(encoding="utf-8")


def require_tokens(
    result: DomainReferenceStatusCheck,
    text: str,
    tokens: list[str],
    label: str,
) -> None:
    for token in tokens:
        if contains(text, token):
            result.ok(f"{label} token exists: {token}")
        else:
            result.error(f"{label} missing token: {token}")


def check_placeholders(
    result: DomainReferenceStatusCheck,
    text: str,
    label: str,
) -> None:
    for placeholder in FORBIDDEN_PLACEHOLDERS:
        if placeholder in text:
            result.error(f"{label} contains placeholder: {placeholder}")


def run(root: Path) -> DomainReferenceStatusCheck:
    result = DomainReferenceStatusCheck()

    for file_name in DOMAIN_FILES:
        authoring = read_reference(
            result,
            root,
            AUTHORING_REFERENCES,
            file_name,
            "authoring",
        )
        plugin = read_reference(
            result,
            root,
            PLUGIN_REFERENCES,
            file_name,
            "plugin",
        )

        tokens = (
            TESTING_QA_REQUIRED_TOKENS
            if file_name == "testing-runtime-qa.md"
            else STANDARD_REQUIRED_TOKENS
        )

        if authoring:
            require_tokens(result, authoring, tokens, f"authoring {file_name}")
            check_placeholders(result, authoring, f"authoring {file_name}")
        if plugin:
            require_tokens(result, plugin, tokens, f"plugin {file_name}")
            check_placeholders(result, plugin, f"plugin {file_name}")
        if authoring and plugin:
            if authoring == plugin:
                result.ok(f"authoring and plugin references are synchronized: {file_name}")
            else:
                result.error(f"authoring and plugin references differ: {file_name}")

    result.warn(
        "domain reference status check is static; it verifies labeling hygiene, not NWN runtime correctness"
    )
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
            print(f"Domain reference status check failed: {len(result.errors)} error(s)")
        else:
            suffix = f", {len(result.warnings)} warning(s)" if result.warnings else ""
            print(f"Domain reference status check passed{suffix}")

    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
