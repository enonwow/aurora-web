#!/usr/bin/env python3
"""Check NWN skill-pack boundaries between skill, plugin, and repo artifacts."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


PLUGIN_PREFIX = "draft-plugins/nwn-server-gamedev-pack/"
AUTHORING_PREFIX = "draft-skills/nwn-server-gamedev/"
INCOMING_PREFIX = "knowledge-inbox/incoming/"

SKILL_TOP_LEVEL = {"SKILL.md", "agents", "references", "scripts", "assets"}
PLUGIN_TOP_LEVEL = {".codex-plugin", "skills", "assets", "scripts", ".app.json", ".mcp.json"}
SKILL_FORBIDDEN_DOCS = {
    "README.md",
    "INSTALLATION_GUIDE.md",
    "QUICK_REFERENCE.md",
    "CHANGELOG.md",
    "RELEASE_NOTES.md",
}
SKILL_FORBIDDEN_SEGMENTS = {
    ".codex-plugin",
    ".codex-tmp",
    "draft-plugins",
    "draft-skills",
    "forward-tests",
    "knowledge-inbox",
    "tools",
}
PLUGIN_FORBIDDEN_SEGMENTS = {
    ".codex-tmp",
    "draft-skills",
    "forward-tests",
    "knowledge-inbox",
}
PLUGIN_FORBIDDEN_FILES = {
    "package-inventory.json",
    "package-inventory.md",
    "release-readiness.md",
    "release-notes-draft.md",
    "release-handoff-template.md",
    "plugin-release-candidate-checklist.md",
    "source-of-truth-map.md",
    "version-manifest.json",
}


@dataclass
class BoundaryCheck:
    checks: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def rel(path: Path, root: Path) -> str:
    return str(path.relative_to(root)).replace("\\", "/")


def read_frontmatter(path: Path) -> dict[str, str]:
    lines = path.read_text(encoding="utf-8").splitlines()
    if not lines or lines[0].strip() != "---":
        return {}

    fields: dict[str, str] = {}
    for line in lines[1:]:
        if line.strip() == "---":
            break
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        fields[key.strip()] = value.strip()
    return fields


def check_skill_dir(result: BoundaryCheck, skill_dir: Path, label: str) -> None:
    if not skill_dir.exists():
        result.error(f"{label} skill directory is missing: {skill_dir}")
        return

    unexpected = sorted(entry.name for entry in skill_dir.iterdir() if entry.name not in SKILL_TOP_LEVEL)
    for name in unexpected:
        result.error(f"{label} skill has non-skill top-level entry: {name}")
    if not unexpected:
        result.ok(f"{label} skill top-level entries stay within skill-creator structure")

    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        result.error(f"{label} skill is missing SKILL.md")
    else:
        fields = read_frontmatter(skill_md)
        if set(fields) != {"name", "description"}:
            result.error(
                f"{label} SKILL.md frontmatter must contain only name and description; found {sorted(fields)}"
            )
        elif not fields["name"] or not fields["description"]:
            result.error(f"{label} SKILL.md name and description must be non-empty")
        else:
            result.ok(f"{label} SKILL.md frontmatter is minimal")

        line_count = len(skill_md.read_text(encoding="utf-8").splitlines())
        if line_count > 500:
            result.warn(f"{label} SKILL.md is {line_count} lines; skill-creator recommends under 500")
        else:
            result.ok(f"{label} SKILL.md stays under 500 lines")

    for path in skill_dir.rglob("*"):
        if not path.is_file():
            continue
        relative_parts = path.relative_to(skill_dir).parts
        forbidden_segments = sorted(SKILL_FORBIDDEN_SEGMENTS & set(relative_parts))
        for segment in forbidden_segments:
            result.error(f"{label} skill contains forbidden segment {segment}: {rel(path, skill_dir)}")
        if path.name in SKILL_FORBIDDEN_DOCS:
            result.error(f"{label} skill contains process doc that belongs outside the skill: {path.name}")
        if relative_parts and relative_parts[0] == "references" and len(relative_parts) > 2:
            result.warn(f"{label} skill has nested reference path: {rel(path, skill_dir)}")

    result.ok(f"{label} skill boundary scan completed")


def check_plugin_root(result: BoundaryCheck, plugin_root: Path) -> None:
    if not plugin_root.exists():
        result.error(f"plugin root is missing: {plugin_root}")
        return

    unexpected = sorted(entry.name for entry in plugin_root.iterdir() if entry.name not in PLUGIN_TOP_LEVEL)
    for name in unexpected:
        result.error(f"plugin root has non-plugin top-level entry: {name}")
    if not unexpected:
        result.ok("plugin root top-level entries stay within plugin structure")

    manifest = plugin_root / ".codex-plugin" / "plugin.json"
    if manifest.exists():
        result.ok("plugin root contains .codex-plugin/plugin.json")
    else:
        result.error("plugin root is missing .codex-plugin/plugin.json")

    for path in plugin_root.rglob("*"):
        if not path.is_file():
            continue
        relative_parts = path.relative_to(plugin_root).parts
        for segment in sorted(PLUGIN_FORBIDDEN_SEGMENTS & set(relative_parts)):
            result.error(f"plugin package contains repo-only segment {segment}: {rel(path, plugin_root)}")
        if path.name in PLUGIN_FORBIDDEN_FILES:
            result.error(f"plugin package contains repo-only file: {rel(path, plugin_root)}")

    result.ok("plugin root boundary scan completed")


def load_inventory(root: Path) -> dict[str, Any] | None:
    path = root / "package-inventory.json"
    if not path.exists():
        return None
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError("package-inventory.json must contain an object")
    return data


def check_inventory_boundaries(result: BoundaryCheck, root: Path) -> None:
    inventory = load_inventory(root)
    if inventory is None:
        result.error("package-inventory.json is missing")
        return

    entries = inventory.get("entries")
    if not isinstance(entries, list):
        result.error("package-inventory.json entries must be a list")
        return

    for entry in entries:
        if not isinstance(entry, dict):
            result.error("package-inventory.json contains a non-object entry")
            continue
        path = entry.get("path")
        if not isinstance(path, str):
            result.error("package-inventory.json entry is missing path")
            continue

        plugin_install = bool(entry.get("plugin_install_include"))
        handoff_include = bool(entry.get("install_candidate_include"))
        role = entry.get("role")

        if path.startswith(PLUGIN_PREFIX):
            if role != "plugin-package":
                result.error(f"{path} should have role plugin-package, found {role!r}")
            if not plugin_install:
                result.error(f"{path} should be included in plugin install boundary")
        elif plugin_install:
            result.error(f"{path} is outside plugin root but marked plugin_install_include=true")

        if path.startswith(AUTHORING_PREFIX) and handoff_include:
            result.error(f"{path} is authoring-only but marked install_candidate_include=true")
        if path.startswith(INCOMING_PREFIX) and handoff_include:
            result.error(f"{path} is unreviewed incoming feedback but marked install_candidate_include=true")

    if not result.errors:
        result.ok("package inventory boundary flags are consistent")


def run(root: Path) -> BoundaryCheck:
    result = BoundaryCheck()
    author_skill = root / "draft-skills" / "nwn-server-gamedev"
    plugin_root = root / "draft-plugins" / "nwn-server-gamedev-pack"
    packaged_skill = plugin_root / "skills" / "nwn-server-gamedev"

    check_skill_dir(result, author_skill, "authoring")
    check_plugin_root(result, plugin_root)
    check_skill_dir(result, packaged_skill, "plugin-packaged")
    try:
        check_inventory_boundaries(result, root)
    except Exception as exc:
        result.error(f"package inventory boundary check failed: {exc}")
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
            print(f"Package boundary check failed: {len(result.errors)} error(s)")
        else:
            suffix = f", {len(result.warnings)} warning(s)" if result.warnings else ""
            print(f"Package boundary check passed{suffix}")

    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
