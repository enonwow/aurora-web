#!/usr/bin/env python3
"""Check submitted Aurora Toolset live records, if any exist."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType
from typing import Any


DEFAULT_RECORD_DIR = Path("knowledge-inbox/aurora-live-records")


@dataclass
class LiveRecordsCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)


def load_module(path: Path, name: str) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def run(root: Path, records_dir: Path = DEFAULT_RECORD_DIR) -> LiveRecordsCheck:
    result = LiveRecordsCheck()
    live_tool_path = root / "tools" / "aurora_toolset_live_record.py"
    if not live_tool_path.exists():
        result.error("tools/aurora_toolset_live_record.py is missing")
        return result

    records_path = root / records_dir
    if not records_path.exists():
        result.ok(f"{records_dir} is absent; no live records submitted yet")
        result.warn("Aurora live Toolset evidence is still not present")
        return result
    if not records_path.is_dir():
        result.error(f"{records_dir} must be a directory")
        return result

    record_paths = sorted(records_path.glob("*.json"))
    if not record_paths:
        result.ok(f"{records_dir} exists but contains no JSON live records")
        result.warn("Aurora live Toolset evidence is still not present")
        return result

    try:
        live_tool = load_module(live_tool_path, "aurora_toolset_live_record_live_records_check")
    except Exception as exc:
        result.error(f"cannot import aurora_toolset_live_record.py: {exc}")
        return result

    promotion_ready = 0
    runtime_tested = 0
    not_run_only = 0
    for path in record_paths:
        try:
            data = load_json(path)
        except Exception as exc:
            result.error(f"{path} is invalid JSON: {exc}")
            continue
        errors = live_tool.validate_record(data)
        if errors:
            result.error(f"{path} failed validation: {'; '.join(errors)}")
            continue
        result.ok(f"{path} validates")
        atoms = data.get("atoms", [])
        if isinstance(atoms, list):
            if all(isinstance(atom, dict) and atom.get("status") == "not-run" for atom in atoms):
                not_run_only += 1
            promotion_ready += sum(
                1
                for atom in atoms
                if isinstance(atom, dict) and atom.get("promotion_ready") is True
            )
            runtime_tested += sum(
                1
                for atom in atoms
                if isinstance(atom, dict) and atom.get("status") == "runtime-tested"
            )

    if result.errors:
        return result

    result.ok(f"valid Aurora live record count: {len(record_paths)}")
    if promotion_ready:
        result.ok(f"promotion-ready atom count: {promotion_ready}")
    else:
        result.warn("no promotion-ready Aurora live atoms submitted yet")
    if runtime_tested:
        result.ok(f"runtime-tested atom count: {runtime_tested}")
    else:
        result.warn("no runtime-tested Aurora live atoms submitted yet")
    if not_run_only:
        result.warn(f"{not_run_only} record(s) are initialized only and contain no live observations")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--records-dir", default=str(DEFAULT_RECORD_DIR))
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    result = run(Path(args.root), Path(args.records_dir))
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
            print(f"Aurora live records check failed: {len(result.errors)} error(s)")
        else:
            suffix = f", {len(result.warnings)} warning(s)" if result.warnings else ""
            print(f"Aurora live records check passed{suffix}")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
