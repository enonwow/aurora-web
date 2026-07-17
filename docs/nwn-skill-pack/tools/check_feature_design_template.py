#!/usr/bin/env python3
"""Check the NWN feature design output template in both skill copies."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass, field
from pathlib import Path


REFERENCE = Path("references/feature-design-output-template.md")
AUTHORING_SKILL = Path("draft-skills/nwn-server-gamedev")
PLUGIN_SKILL = Path("draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev")
REQUIRED_TOKENS = [
    "## Source Status",
    "## When To Use",
    "## Required Output Sections",
    "## Cross-Domain Checklist",
    "## Verification Ladder",
    "## Stop Conditions",
    "## Minimum Deliverable Contract",
    "## Compact Answer Skeleton",
    "First Implementable Slice",
    "smallest useful change",
    "Toolset check",
    "NWScript compile",
    "clean-client download",
    "repo/module target is known",
    "safe design-only slice",
    "locations",
    "items",
    "creatures",
    "2DA",
    "TLK",
    "HAK",
    "NWSync",
    "NWScript",
    "NUI",
    "quest",
    "economy",
    "persistence",
    "deployment",
    "runtime-tested",
    "docs-verified",
    "static-checked",
    "design-only",
    "project-specific",
    "unverified",
    "Feedback Candidate",
]
FORBIDDEN_PLACEHOLDERS = ["TODO", "TBD", "<scope>", "<artifact>", "<evidence>"]


@dataclass
class FeatureTemplateCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def read_file(result: FeatureTemplateCheck, root: Path, relative: Path, label: str) -> str:
    path = root / relative
    if not path.exists():
        result.error(f"{label} is missing: {relative}")
        return ""
    result.ok(f"{label} exists: {relative}")
    return path.read_text(encoding="utf-8")


def require_tokens(result: FeatureTemplateCheck, text: str, label: str) -> None:
    folded = text.lower()
    for token in REQUIRED_TOKENS:
        if token.lower() in folded:
            result.ok(f"{label} token exists: {token}")
        else:
            result.error(f"{label} missing token: {token}")
    for placeholder in FORBIDDEN_PLACEHOLDERS:
        if placeholder in text:
            result.error(f"{label} contains placeholder: {placeholder}")


def check_skill_route(result: FeatureTemplateCheck, skill_md: str, label: str) -> None:
    route = str(REFERENCE).replace("\\", "/")
    if route in skill_md:
        result.ok(f"{label} SKILL.md routes to feature design template")
    else:
        result.error(f"{label} SKILL.md does not route to {route}")


def run(root: Path) -> FeatureTemplateCheck:
    result = FeatureTemplateCheck()
    author_ref = read_file(result, root, AUTHORING_SKILL / REFERENCE, "authoring feature template")
    plugin_ref = read_file(result, root, PLUGIN_SKILL / REFERENCE, "plugin feature template")
    author_skill = read_file(result, root, AUTHORING_SKILL / "SKILL.md", "authoring SKILL.md")
    plugin_skill = read_file(result, root, PLUGIN_SKILL / "SKILL.md", "plugin SKILL.md")

    if author_ref:
        require_tokens(result, author_ref, "authoring feature template")
    if plugin_ref:
        require_tokens(result, plugin_ref, "plugin feature template")
    if author_ref and plugin_ref:
        if author_ref == plugin_ref:
            result.ok("authoring and plugin feature templates are synchronized")
        else:
            result.error("authoring and plugin feature templates differ")
    if author_skill:
        check_skill_route(result, author_skill, "authoring")
    if plugin_skill:
        check_skill_route(result, plugin_skill, "plugin")
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
            print(f"Feature design template check failed: {len(result.errors)} error(s)")
        else:
            print("Feature design template check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
