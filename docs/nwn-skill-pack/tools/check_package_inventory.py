#!/usr/bin/env python3
"""Check whether package-inventory.json matches the current repository artifact."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


TOP_LEVEL_FIELDS = [
    "schema_version",
    "root",
    "file_count",
    "total_size_bytes",
    "warnings",
]
ENTRY_FIELDS = [
    "role",
    "size_bytes",
    "sha256",
    "repo_artifact_include",
    "install_candidate_include",
    "plugin_install_include",
]


@dataclass
class InventoryCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def load_generator(root: Path):
    tool_path = root / "tools" / "generate_package_inventory.py"
    if not tool_path.exists():
        raise FileNotFoundError(f"inventory generator is missing: {tool_path}")

    spec = importlib.util.spec_from_file_location("generate_package_inventory", tool_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not import inventory generator: {tool_path}")

    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    if not hasattr(module, "generate"):
        raise RuntimeError("inventory generator does not expose generate(root)")
    return module.generate


def load_recorded_inventory(root: Path) -> dict[str, Any]:
    path = root / "package-inventory.json"
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError("package-inventory.json must contain a JSON object")
    return data


def entry_map(inventory: dict[str, Any]) -> dict[str, dict[str, Any]]:
    raw_entries = inventory.get("entries", [])
    if not isinstance(raw_entries, list):
        raise ValueError("inventory entries must be a list")

    mapped: dict[str, dict[str, Any]] = {}
    for entry in raw_entries:
        if not isinstance(entry, dict):
            raise ValueError("inventory entries must be JSON objects")
        path = entry.get("path")
        if not isinstance(path, str) or not path:
            raise ValueError("every inventory entry must have a non-empty path")
        if path in mapped:
            raise ValueError(f"duplicate inventory path: {path}")
        mapped[path] = entry
    return mapped


def compare_inventories(
    check: InventoryCheck,
    recorded: dict[str, Any],
    current: dict[str, Any],
) -> None:
    for field_name in TOP_LEVEL_FIELDS:
        if recorded.get(field_name) != current.get(field_name):
            check.error(
                f"{field_name} is stale: recorded={recorded.get(field_name)!r}, "
                f"current={current.get(field_name)!r}"
            )

    recorded_entries = entry_map(recorded)
    current_entries = entry_map(current)
    recorded_paths = set(recorded_entries)
    current_paths = set(current_entries)

    for path in sorted(current_paths - recorded_paths):
        check.error(f"inventory is missing current file: {path}")
    for path in sorted(recorded_paths - current_paths):
        check.error(f"inventory contains removed file: {path}")

    for path in sorted(recorded_paths & current_paths):
        recorded_entry = recorded_entries[path]
        current_entry = current_entries[path]
        for field_name in ENTRY_FIELDS:
            if recorded_entry.get(field_name) != current_entry.get(field_name):
                check.error(
                    f"{path} {field_name} is stale: "
                    f"recorded={recorded_entry.get(field_name)!r}, "
                    f"current={current_entry.get(field_name)!r}"
                )

    if not check.errors:
        check.ok("package-inventory.json matches current file set and checksums")


def run(root: Path) -> InventoryCheck:
    check = InventoryCheck()
    inventory_path = root / "package-inventory.json"
    if not inventory_path.exists():
        check.error(f"package inventory is missing: {inventory_path}")
        return check

    try:
        recorded = load_recorded_inventory(root)
        generator = load_generator(root)
        current = generator(root)
        compare_inventories(check, recorded, current)
    except Exception as exc:
        check.error(f"package inventory check failed: {exc}")

    return check


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "root",
        nargs="?",
        default="docs/nwn-skill-pack",
        help="Path to docs/nwn-skill-pack root.",
    )
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
            print(f"Package inventory check failed: {len(result.errors)} error(s)")
        else:
            print("Package inventory check passed")

    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
