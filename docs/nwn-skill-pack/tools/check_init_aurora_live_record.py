#!/usr/bin/env python3
"""Smoke-test Aurora Toolset live-record initialization."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path


EXPECTED_RECORD_ID = "aurora-live-20260618-small-location-first-pass"
EXPECTED_REFERENCES = [
    "draft-skills/nwn-server-gamedev/references/locations-areas-tilesets.md",
    "draft-skills/nwn-server-gamedev/references/items-equipment-loot.md",
    "draft-skills/nwn-server-gamedev/references/creatures-encounters-ai.md",
    "draft-skills/nwn-server-gamedev/references/nwscript-events-systems.md",
    "draft-skills/nwn-server-gamedev/references/feature-design-output-template.md",
]


@dataclass
class InitRecordCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def load_json(path: Path) -> dict[str, object]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain an object")
    return data


def run(root: Path) -> InitRecordCheck:
    result = InitRecordCheck()
    init_tool = root / "tools" / "init_aurora_live_record.py"
    validate_tool = root / "tools" / "aurora_toolset_live_record.py"
    if not init_tool.exists():
        result.error("tools/init_aurora_live_record.py is missing")
        return result
    if not validate_tool.exists():
        result.error("tools/aurora_toolset_live_record.py is missing")
        return result

    with tempfile.TemporaryDirectory(prefix="aurora-live-init-") as tmp:
        tmp_path = Path(tmp)
        record = tmp_path / f"{EXPECTED_RECORD_ID}.json"
        evidence = tmp_path / "evidence"
        init = subprocess.run(
            [
                sys.executable,
                str(init_tool),
                str(root),
                "--operator",
                "checker",
                "--scenario",
                "small-location-first-pass",
                "--date",
                "20260618",
                "--toolset-version",
                "test-toolset",
                "--nwn-version",
                "test-nwn",
                "--module-path-or-copy-id",
                "disposable-module-copy",
                "--evidence-dir",
                str(evidence),
                "--candidate-reference",
                EXPECTED_REFERENCES[0],
                "--candidate-reference",
                EXPECTED_REFERENCES[1],
                "--candidate-reference",
                EXPECTED_REFERENCES[2],
                "--candidate-reference",
                EXPECTED_REFERENCES[3],
                "--candidate-reference",
                EXPECTED_REFERENCES[4],
                "--out",
                str(record),
                "--create-evidence-dirs",
            ],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        if init.returncode != 0:
            result.error(f"initializer failed: {init.stdout.strip()}")
            return result
        result.ok("initializer created a record")

        validate = subprocess.run(
            [sys.executable, str(validate_tool), "validate", str(record)],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        if validate.returncode != 0:
            result.error(f"initialized record did not validate: {validate.stdout.strip()}")
            return result
        result.ok("initialized record validates with aurora_toolset_live_record.py")

        data = load_json(record)
        if data.get("id") == EXPECTED_RECORD_ID:
            result.ok("initialized record id is deterministic from date and scenario")
        else:
            result.error(f"unexpected record id: {data.get('id')!r}")

        atoms = data.get("atoms")
        if isinstance(atoms, list) and atoms:
            if all(isinstance(atom, dict) and atom.get("status") == "not-run" for atom in atoms):
                result.ok("initializer leaves every atom not-run")
            else:
                result.error("initializer must leave every atom not-run")
            if all(isinstance(atom, dict) and atom.get("promotion_ready") is False for atom in atoms):
                result.ok("initializer leaves every atom not promotion-ready")
            else:
                result.error("initializer must leave every atom promotion_ready=false")
        else:
            result.error("initialized record atoms must be a non-empty list")

        promotion = data.get("promotion")
        if isinstance(promotion, dict) and promotion.get("candidate_references", []) == EXPECTED_REFERENCES:
            result.ok("initializer preserves first-pass candidate reference input")
        else:
            result.error("initializer did not preserve first-pass candidate reference input")

        if (evidence / "screenshots").is_dir() and (evidence / "logs").is_dir():
            result.ok("initializer creates screenshot and log folders when requested")
        else:
            result.error("initializer did not create screenshot/log evidence folders")

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
            print(f"Aurora live-record initializer check failed: {len(result.errors)} error(s)")
        else:
            print("Aurora live-record initializer check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
