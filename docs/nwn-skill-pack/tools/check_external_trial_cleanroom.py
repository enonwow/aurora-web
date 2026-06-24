#!/usr/bin/env python3
"""Run a cleanroom smoke from the generated EXT-001 public ZIP."""

from __future__ import annotations

import argparse
import importlib.util
import json
import shutil
import sys
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType
from typing import Any


DEFAULT_PACKET = Path(".codex-tmp/external-trial-public-packet/ext-001")
DEFAULT_CLEANROOM_ROOT = Path(".codex-tmp/external-trial-cleanroom/ext-001")
SUMMARY_NAME = "CLEANROOM-SUMMARY.json"


@dataclass
class CleanroomCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


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
        raise ValueError(f"{path} must contain an object")
    return data


def in_tmp(root: Path, path: Path) -> bool:
    tmp_root = (root / ".codex-tmp").resolve()
    resolved = path.resolve()
    return resolved == tmp_root or tmp_root in resolved.parents


def safe_zip_names(names: list[str]) -> list[str]:
    return [
        name
        for name in names
        if Path(name).is_absolute() or ".." in Path(name).parts
    ]


def run(
    root: Path,
    packet_relative: Path = DEFAULT_PACKET,
    cleanroom_relative: Path = DEFAULT_CLEANROOM_ROOT,
) -> CleanroomCheck:
    result = CleanroomCheck()
    public_checker_path = root / "tools" / "check_external_trial_public_packet.py"
    try:
        public_checker = load_module(public_checker_path, "check_external_trial_public_packet_cleanroom")
    except Exception as exc:
        result.error(f"cannot import public packet checker: {exc}")
        return result

    packet_root = root / packet_relative
    manifest_path = packet_root / "PUBLIC-PACKET-MANIFEST.json"
    if not manifest_path.exists():
        result.error(f"public packet manifest is missing: {manifest_path}")
        return result

    try:
        manifest = load_json(manifest_path)
    except Exception as exc:
        result.error(f"public packet manifest is invalid: {exc}")
        return result

    archive_value = manifest.get("archive")
    if not isinstance(archive_value, str) or not archive_value:
        result.error("public packet manifest archive path is missing")
        return result
    archive = Path(archive_value)
    if not archive.is_absolute():
        archive = root / archive
    if not archive.exists():
        result.error(f"public packet archive is missing: {archive}")
        return result
    result.ok(f"cleanroom source archive exists: {archive}")

    cleanroom_root = root / cleanroom_relative
    if not in_tmp(root, cleanroom_root):
        result.error(f"cleanroom root is outside .codex-tmp: {cleanroom_root}")
        return result
    if cleanroom_root.exists():
        shutil.rmtree(cleanroom_root)
    cleanroom_root.mkdir(parents=True, exist_ok=True)

    inbox = cleanroom_root / "inbox"
    inbox.mkdir(parents=True, exist_ok=True)
    received_archive = inbox / archive.name
    shutil.copy2(archive, received_archive)
    result.ok(f"cleanroom copied archive into inbox: {received_archive}")

    received_root = cleanroom_root / "received"
    smoke_root = cleanroom_root / "cli-smoke"
    try:
        with zipfile.ZipFile(received_archive, "r") as handle:
            names = [name for name in handle.namelist() if not name.endswith("/")]
            unsafe = safe_zip_names(names)
            if unsafe:
                result.error(f"public packet archive has unsafe paths: {', '.join(unsafe)}")
                return result
            handle.extractall(received_root)
    except zipfile.BadZipFile as exc:
        result.error(f"public packet archive is invalid zip: {exc}")
        return result

    result.ok(f"cleanroom extracted archive to: {received_root}")

    extracted_files = {
        str(path.relative_to(received_root)).replace("\\", "/")
        for path in public_checker.iter_files(received_root)
    }
    required = {
        "START-HERE.md",
        "PUBLIC-PACKET-MANIFEST.json",
        "tools/nwn_skill_feedback.py",
        "knowledge-inbox/external-contributor-trial-packet.md",
        "knowledge-inbox/contributor-intake-quickstart.md",
        "knowledge-inbox/contribution-bundle-format.md",
    }
    missing = sorted(required - extracted_files)
    if missing:
        result.error(f"cleanroom extracted packet missing required files: {', '.join(missing)}")
    else:
        result.ok("cleanroom extracted packet includes required tester-facing files")

    public_checker.run_packet_cli_smoke(
        result,
        root,
        received_root,
        smoke_root,
        "cleanroom received ZIP",
    )

    summary = {
        "schema_version": "1",
        "trial_id": manifest.get("trial_id", "EXT-001"),
        "source_archive": str(archive.relative_to(root)).replace("\\", "/"),
        "received_archive": str(received_archive.relative_to(root)).replace("\\", "/"),
        "cleanroom_root": str(cleanroom_root.relative_to(root)).replace("\\", "/"),
        "received_root": str(received_root.relative_to(root)).replace("\\", "/"),
        "smoke_root": str(smoke_root.relative_to(root)).replace("\\", "/"),
        "checks": result.checks,
        "errors": result.errors,
        "verified_boundary": (
            "Local cleanroom smoke proves only that the generated ZIP can be copied into a scratch inbox, extracted, "
            "and its copied feedback CLI can run a synthetic command path from scratch storage."
        ),
        "not_proven": [
            "outside tester delivery",
            "tester independence",
            "real contributor completion",
            "private-data safety",
            "feedback truth",
            "NWN runtime behavior",
        ],
    }
    summary_path = cleanroom_root / SUMMARY_NAME
    summary_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    result.ok(f"cleanroom summary written: {summary_path}")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--packet", default=str(DEFAULT_PACKET))
    parser.add_argument("--cleanroom", default=str(DEFAULT_CLEANROOM_ROOT))
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    result = run(Path(args.root), Path(args.packet), Path(args.cleanroom))
    if args.json:
        print(json.dumps({"checks": result.checks, "errors": result.errors}, indent=2))
    else:
        for check in result.checks:
            print(f"OK: {check}")
        for error in result.errors:
            print(f"ERROR: {error}")
        if result.errors:
            print(f"External trial cleanroom check failed: {len(result.errors)} error(s)")
        else:
            print("External trial cleanroom check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
