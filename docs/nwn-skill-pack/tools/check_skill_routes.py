#!/usr/bin/env python3
"""Check that a Codex skill routes to its bundled references and scripts."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


ROUTE_RE = re.compile(r"`((?:references|scripts)/[^`]+)`")


def normalize_route(route: str) -> str:
    return route.replace("\\", "/").strip()


def collect_routes(skill_md: str) -> set[str]:
    return {normalize_route(match.group(1)) for match in ROUTE_RE.finditer(skill_md)}


def collect_files(root: Path, folder: str) -> set[str]:
    base = root / folder
    if not base.exists():
        return set()
    return {
        f"{folder}/{path.relative_to(base).as_posix()}"
        for path in base.rglob("*")
        if path.is_file()
    }


def check_skill(skill_root: Path) -> dict:
    skill_md_path = skill_root / "SKILL.md"
    if not skill_md_path.exists():
        return {
            "skill_root": str(skill_root),
            "ok": False,
            "errors": ["SKILL.md is missing"],
            "warnings": [],
        }

    skill_md = skill_md_path.read_text(encoding="utf-8")
    declared_routes = collect_routes(skill_md)
    bundled_routes = collect_files(skill_root, "references") | collect_files(skill_root, "scripts")

    missing_files = sorted(route for route in declared_routes if not (skill_root / route).exists())
    unmentioned_references = sorted(
        route for route in bundled_routes if route.startswith("references/") and route not in declared_routes
    )
    unmentioned_scripts = sorted(
        route for route in bundled_routes if route.startswith("scripts/") and route not in declared_routes
    )

    errors = [f"Route points to a missing file: {route}" for route in missing_files]
    warnings = [
        f"Bundled reference is not routed from SKILL.md: {route}"
        for route in unmentioned_references
    ]
    warnings.extend(
        f"Bundled script is not mentioned from SKILL.md: {route}"
        for route in unmentioned_scripts
    )

    return {
        "skill_root": str(skill_root),
        "ok": not errors,
        "declared_route_count": len(declared_routes),
        "bundled_file_count": len(bundled_routes),
        "errors": errors,
        "warnings": warnings,
        "declared_routes": sorted(declared_routes),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate SKILL.md reference/script routing.")
    parser.add_argument("skill_root", help="Path to a skill folder containing SKILL.md")
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON")
    parser.add_argument("--strict", action="store_true", help="Treat warnings as failures")
    args = parser.parse_args()

    result = check_skill(Path(args.skill_root))
    if args.json:
        print(json.dumps(result, indent=2, sort_keys=True))
    else:
        status = "OK" if result["ok"] else "FAIL"
        print(f"{status}: {result['skill_root']}")
        print(f"Declared routes: {result.get('declared_route_count', 0)}")
        print(f"Bundled files: {result.get('bundled_file_count', 0)}")
        for error in result["errors"]:
            print(f"ERROR: {error}")
        for warning in result["warnings"]:
            print(f"WARNING: {warning}")

    if result["errors"] or (args.strict and result["warnings"]):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
