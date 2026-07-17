#!/usr/bin/env python3
"""Smoke-test one-command Aurora Toolset live-session preparation."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


EXPECTED_RECORD_ID = "aurora-live-20260618-small-location-first-pass"
EXPECTED_MANIFEST_ID = "aurora-live-evidence-manifest-20260618-small-location-first-pass"
EXPECTED_CANDIDATE_REFERENCES = [
    "draft-skills/nwn-server-gamedev/references/locations-areas-tilesets.md",
    "draft-skills/nwn-server-gamedev/references/items-equipment-loot.md",
    "draft-skills/nwn-server-gamedev/references/creatures-encounters-ai.md",
    "draft-skills/nwn-server-gamedev/references/nwscript-events-systems.md",
    "draft-skills/nwn-server-gamedev/references/feature-design-output-template.md",
]


@dataclass
class PrepareSessionCheck:
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
        raise ValueError(f"{path} must contain an object")
    return data


def run(root: Path) -> PrepareSessionCheck:
    result = PrepareSessionCheck()
    prepare_tool = root / "tools" / "prepare_aurora_live_session.py"
    if not prepare_tool.exists():
        result.error("tools/prepare_aurora_live_session.py is missing")
        return result

    with tempfile.TemporaryDirectory(prefix="aurora-live-session-") as tmp:
        tmp_path = Path(tmp)
        record = tmp_path / f"{EXPECTED_RECORD_ID}.json"
        manifest = tmp_path / f"{EXPECTED_MANIFEST_ID}.json"
        evidence = tmp_path / "evidence"

        proc = subprocess.run(
            [
                sys.executable,
                str(prepare_tool),
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
                EXPECTED_CANDIDATE_REFERENCES[0],
                "--candidate-reference",
                EXPECTED_CANDIDATE_REFERENCES[1],
                "--candidate-reference",
                EXPECTED_CANDIDATE_REFERENCES[2],
                "--candidate-reference",
                EXPECTED_CANDIDATE_REFERENCES[3],
                "--candidate-reference",
                EXPECTED_CANDIDATE_REFERENCES[4],
                "--record-out",
                str(record),
                "--manifest-out",
                str(manifest),
                "--json",
            ],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        if proc.returncode != 0:
            result.error(f"prepare session failed: {proc.stdout.strip()}")
            return result
        result.ok("prepare session command completed")

        try:
            output = json.loads(proc.stdout)
        except Exception as exc:
            result.error(f"prepare session did not emit JSON: {exc}; output={proc.stdout.strip()}")
            return result
        if output.get("record_id") == EXPECTED_RECORD_ID and output.get("manifest_id") == EXPECTED_MANIFEST_ID:
            result.ok("prepare session emits deterministic record and manifest ids")
        else:
            result.error("prepare session JSON did not include expected ids")

        if record.exists() and manifest.exists():
            result.ok("prepare session writes record and manifest outputs")
        else:
            result.error("prepare session did not write both record and manifest")
        if (evidence / "screenshots").is_dir() and (evidence / "logs").is_dir():
            result.ok("prepare session creates screenshot and log evidence folders")
        else:
            result.error("prepare session did not create screenshot/log evidence folders")

        record_data = load_json(record)
        manifest_data = load_json(manifest)
        if record_data.get("overall_result") == "not-run":
            result.ok("prepared live record remains not-run")
        else:
            result.error("prepared live record must remain not-run")

        atoms = record_data.get("atoms")
        if isinstance(atoms, list) and atoms:
            unsafe_atoms = []
            for atom in atoms:
                if not isinstance(atom, dict):
                    unsafe_atoms.append("<non-object>")
                    continue
                if (
                    atom.get("status") != "not-run"
                    or atom.get("evidence_label") != "local-reverse-lead"
                    or atom.get("observations") != []
                    or atom.get("artifacts") != []
                    or atom.get("blockers") != []
                    or atom.get("promotion_ready") is not False
                ):
                    unsafe_atoms.append(str(atom.get("atom", "<unknown>")))
            if unsafe_atoms:
                result.error(
                    "prepared live record must keep every atom not-run/local-reverse-lead/promotion_ready=false: "
                    + ", ".join(unsafe_atoms)
                )
            else:
                result.ok("prepared live record keeps every atom initialized-only")
        else:
            result.error("prepared live record must contain atom rows")

        promotion = record_data.get("promotion")
        candidate_references = promotion.get("candidate_references") if isinstance(promotion, dict) else None
        if candidate_references == EXPECTED_CANDIDATE_REFERENCES:
            result.ok("prepared live record preserves first-pass candidate reference routing")
        else:
            result.error("prepared live record did not preserve first-pass candidate reference routing")

        if manifest_data.get("live_record_id") == record_data.get("id"):
            result.ok("prepared evidence manifest links to the prepared live record")
        else:
            result.error("prepared evidence manifest does not link to live record")
        if manifest_data.get("redaction_reviewed") is False:
            result.ok("prepared evidence manifest starts redaction_reviewed=false")
        else:
            result.error("prepared evidence manifest must start redaction_reviewed=false")
        artifacts = manifest_data.get("artifacts")
        if isinstance(artifacts, list) and artifacts and artifacts[0].get("redaction_status") == "pending-redaction":
            result.ok("prepared evidence manifest starts with pending-redaction artifact row")
        else:
            result.error("prepared evidence manifest must start with pending-redaction artifact row")
        not_proven = manifest_data.get("not_proven")
        if isinstance(not_proven, list) and any("Toolset screenshots are not runtime proof." == item for item in not_proven):
            result.ok("prepared evidence manifest preserves not-runtime-proof boundary")
        else:
            result.error("prepared evidence manifest must preserve not-runtime-proof boundary")

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
            print(f"Aurora live session preparation check failed: {len(result.errors)} error(s)")
        else:
            print("Aurora live session preparation check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
