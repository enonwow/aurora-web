#!/usr/bin/env python3
"""Smoke-test Aurora Toolset live evidence manifest initialization."""

from __future__ import annotations

import argparse
import importlib.util
import json
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


EXPECTED_RECORD_ID = "aurora-live-20260618-small-location-first-pass"
EXPECTED_MANIFEST_ID = "aurora-live-evidence-manifest-20260618-small-location-first-pass"
EXPECTED_REFERENCES = [
    "draft-skills/nwn-server-gamedev/references/locations-areas-tilesets.md",
    "draft-skills/nwn-server-gamedev/references/items-equipment-loot.md",
    "draft-skills/nwn-server-gamedev/references/creatures-encounters-ai.md",
    "draft-skills/nwn-server-gamedev/references/nwscript-events-systems.md",
    "draft-skills/nwn-server-gamedev/references/feature-design-output-template.md",
]


@dataclass
class InitManifestCheck:
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


def load_manifest_validator(root: Path):
    checker_path = root / "tools" / "check_aurora_live_evidence_manifest.py"
    if not checker_path.exists():
        raise FileNotFoundError(f"missing checker: {checker_path}")
    spec = importlib.util.spec_from_file_location("check_aurora_live_evidence_manifest", checker_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not import checker: {checker_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module.validate_manifest


def run(root: Path) -> InitManifestCheck:
    result = InitManifestCheck()
    record_init = root / "tools" / "init_aurora_live_record.py"
    manifest_init = root / "tools" / "init_aurora_live_evidence_manifest.py"
    if not record_init.exists():
        result.error("tools/init_aurora_live_record.py is missing")
        return result
    if not manifest_init.exists():
        result.error("tools/init_aurora_live_evidence_manifest.py is missing")
        return result

    try:
        validate_manifest = load_manifest_validator(root)
    except Exception as exc:
        result.error(f"could not load evidence manifest validator: {exc}")
        return result

    with tempfile.TemporaryDirectory(prefix="aurora-live-manifest-init-") as tmp:
        tmp_path = Path(tmp)
        record = tmp_path / f"{EXPECTED_RECORD_ID}.json"
        manifest = tmp_path / f"{EXPECTED_MANIFEST_ID}.json"
        evidence = tmp_path / "evidence"
        live_record_label = f"knowledge-inbox/aurora-live-records/{EXPECTED_RECORD_ID}.json"

        record_proc = subprocess.run(
            [
                sys.executable,
                str(record_init),
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
        if record_proc.returncode != 0:
            result.error(f"live-record initializer failed: {record_proc.stdout.strip()}")
            return result
        result.ok("live-record initializer prepared a source record for manifest initialization")

        manifest_proc = subprocess.run(
            [
                sys.executable,
                str(manifest_init),
                str(root),
                "--live-record",
                str(record),
                "--live-record-path",
                live_record_label,
                "--evidence-dir",
                f"docs/nwn-skill-pack/.codex-tmp/aurora-live-evidence/{EXPECTED_RECORD_ID}",
                "--scenario",
                "small-location-first-pass",
                "--date",
                "20260618",
                "--out",
                str(manifest),
            ],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        if manifest_proc.returncode != 0:
            result.error(f"evidence-manifest initializer failed: {manifest_proc.stdout.strip()}")
            return result
        result.ok("evidence-manifest initializer created a manifest")

        data = load_json(manifest)
        validation_errors = validate_manifest(data)
        if validation_errors:
            result.error(f"initialized evidence manifest did not validate: {'; '.join(validation_errors)}")
        else:
            result.ok("initialized evidence manifest validates with check_aurora_live_evidence_manifest.py logic")

        if data.get("id") == EXPECTED_MANIFEST_ID:
            result.ok("initialized evidence manifest id is deterministic from date and scenario")
        else:
            result.error(f"unexpected evidence manifest id: {data.get('id')!r}")
        if data.get("live_record_id") == EXPECTED_RECORD_ID and data.get("live_record_path") == live_record_label:
            result.ok("initialized evidence manifest is linked to the live record id and path label")
        else:
            result.error("initialized evidence manifest did not preserve live-record routing")
        artifacts = data.get("artifacts")
        if isinstance(artifacts, list) and artifacts and isinstance(artifacts[0], dict):
            first = artifacts[0]
            if first.get("redaction_status") == "pending-redaction" and first.get("notes"):
                result.ok("initializer leaves artifact row pending-redaction with replacement notes")
            else:
                result.error("initializer must leave artifact row pending-redaction with replacement notes")
        else:
            result.error("initialized evidence manifest must include a placeholder artifact row")

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
            print(f"Aurora live evidence manifest initializer check failed: {len(result.errors)} error(s)")
        else:
            print("Aurora live evidence manifest initializer check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
