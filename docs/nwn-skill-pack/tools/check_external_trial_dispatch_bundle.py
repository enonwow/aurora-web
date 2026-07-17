#!/usr/bin/env python3
"""Check the generated send-ready external contributor trial dispatch bundle."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType
from typing import Any


DEFAULT_DISPATCH = Path(".codex-tmp/external-trial-dispatch/ext-001")


@dataclass
class DispatchBundleCheck:
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


def iter_files(root: Path) -> list[Path]:
    return sorted(path for path in root.rglob("*") if path.is_file())


def in_tmp(root: Path, path: Path) -> bool:
    tmp_root = (root / ".codex-tmp").resolve()
    resolved = path.resolve()
    return resolved == tmp_root or tmp_root in resolved.parents


def parse_sha256sums(path: Path) -> dict[str, str]:
    entries: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        parts = line.split()
        if len(parts) != 2:
            raise ValueError(f"invalid SHA256SUMS line: {line!r}")
        digest, filename = parts
        entries[filename] = digest
    return entries


def add_nested_result(
    result: DispatchBundleCheck,
    prefix: str,
    nested: Any,
) -> None:
    for check in getattr(nested, "checks", []):
        result.ok(f"{prefix}: {check}")
    for error in getattr(nested, "errors", []):
        result.error(f"{prefix}: {error}")


def run(root: Path, dispatch_relative: Path = DEFAULT_DISPATCH) -> DispatchBundleCheck:
    result = DispatchBundleCheck()
    dispatch_root = root / dispatch_relative
    if not dispatch_root.is_dir():
        result.error(f"dispatch bundle root is missing: {dispatch_relative}")
        return result
    if not in_tmp(root, dispatch_root):
        result.error(f"dispatch bundle root is outside .codex-tmp: {dispatch_relative}")
        return result
    result.ok(f"dispatch bundle root exists under .codex-tmp: {dispatch_relative}")

    try:
        builder = load_module(
            root / "tools" / "build_external_trial_dispatch_bundle.py",
            "build_external_trial_dispatch_bundle_check",
        )
    except Exception as exc:
        result.error(f"cannot import dispatch bundle builder: {exc}")
        return result

    expected_files = {
        builder.PUBLIC_ARCHIVE.name,
        builder.TESTER_MESSAGE.name,
        str(builder.SHA256SUMS).replace("\\", "/"),
        str(builder.DISPATCH_MANIFEST).replace("\\", "/"),
    }
    actual_files = {
        str(path.relative_to(dispatch_root)).replace("\\", "/")
        for path in iter_files(dispatch_root)
    }
    if actual_files == expected_files:
        result.ok("dispatch bundle has exact expected file set")
    else:
        result.error(
            "dispatch bundle file set differs; "
            f"expected {sorted(expected_files)}, got {sorted(actual_files)}"
        )

    manifest_path = dispatch_root / builder.DISPATCH_MANIFEST
    if not manifest_path.exists():
        result.error("dispatch manifest is missing")
        return result
    try:
        manifest = load_json(manifest_path)
    except Exception as exc:
        result.error(f"dispatch manifest is invalid: {exc}")
        return result

    if manifest.get("schema_version") == "1":
        result.ok("dispatch manifest schema_version is 1")
    else:
        result.error("dispatch manifest schema_version must be 1")

    if manifest.get("trial_id") == "EXT-001":
        result.ok("dispatch manifest trial_id is EXT-001")
    else:
        result.error("dispatch manifest trial_id must be EXT-001")

    dispatch_files = manifest.get("dispatch_files")
    if isinstance(dispatch_files, list) and set(dispatch_files) == expected_files:
        result.ok("dispatch manifest lists the exact dispatch files")
    else:
        result.error("dispatch manifest dispatch_files must list the exact dispatch files")

    source_artifacts = manifest.get("source_artifacts")
    if not isinstance(source_artifacts, dict):
        result.error("dispatch manifest source_artifacts must be an object")
        source_artifacts = {}

    expected_artifacts = {
        "public_archive": builder.PUBLIC_ARCHIVE,
        "tester_message": builder.TESTER_MESSAGE,
    }
    sums_path = dispatch_root / builder.SHA256SUMS
    if not sums_path.exists():
        result.error("SHA256SUMS.txt is missing")
        sums = {}
    else:
        try:
            sums = parse_sha256sums(sums_path)
            result.ok("SHA256SUMS.txt parses")
        except Exception as exc:
            result.error(f"SHA256SUMS.txt is invalid: {exc}")
            sums = {}

    for key, source_relative in expected_artifacts.items():
        item = source_artifacts.get(key)
        if not isinstance(item, dict):
            result.error(f"dispatch manifest source_artifacts.{key} must be an object")
            continue
        source_value = item.get("source")
        target_value = item.get("target")
        digest_value = item.get("sha256")
        if not isinstance(source_value, str) or not isinstance(target_value, str) or not isinstance(digest_value, str):
            result.error(f"dispatch manifest source_artifacts.{key} is missing source, target, or sha256")
            continue
        if source_value != str(source_relative).replace("\\", "/"):
            result.error(f"dispatch manifest source for {key} differs: {source_value}")
            continue
        source_path = root / source_relative
        target_path = dispatch_root / target_value
        if not source_path.exists():
            result.error(f"dispatch source is missing for {key}: {source_relative}")
            continue
        if not target_path.exists():
            result.error(f"dispatch target is missing for {key}: {target_value}")
            continue
        source_hash = builder.sha256(source_path)
        target_hash = builder.sha256(target_path)
        if source_hash == target_hash == digest_value == sums.get(target_value):
            result.ok(f"dispatch copied hash matches source and SHA256SUMS: {key}")
        else:
            result.error(f"dispatch hash mismatch for {key}")

    if set(sums) == {builder.PUBLIC_ARCHIVE.name, builder.TESTER_MESSAGE.name}:
        result.ok("SHA256SUMS.txt covers only ZIP and tester message")
    else:
        result.error("SHA256SUMS.txt should cover exactly the ZIP and tester message")

    message_path = dispatch_root / builder.TESTER_MESSAGE.name
    if message_path.exists():
        try:
            tester_checker = load_module(
                root / "tools" / "check_external_trial_tester_message.py",
                "check_external_trial_tester_message_dispatch",
            )
            message_text = message_path.read_text(encoding="utf-8")
            forbidden = [
                token
                for token in sorted(tester_checker.FORBIDDEN_TOKENS)
                if token in message_text
            ]
            if forbidden:
                result.error(f"dispatch tester message includes forbidden tokens: {', '.join(forbidden)}")
            else:
                result.ok("dispatch tester message avoids reviewer-only tokens")
            add_nested_result(result, "tester message check", tester_checker.run(root))
        except Exception as exc:
            result.error(f"cannot run tester message check: {exc}")

    try:
        public_checker = load_module(
            root / "tools" / "check_external_trial_public_packet.py",
            "check_external_trial_public_packet_dispatch",
        )
        add_nested_result(result, "public packet check", public_checker.run(root))
    except Exception as exc:
        result.error(f"cannot run public packet check: {exc}")

    try:
        cleanroom_checker = load_module(
            root / "tools" / "check_external_trial_cleanroom.py",
            "check_external_trial_cleanroom_dispatch",
        )
        add_nested_result(result, "cleanroom check", cleanroom_checker.run(root))
    except Exception as exc:
        result.error(f"cannot run cleanroom check: {exc}")

    not_proven = manifest.get("not_proven")
    required_boundaries = {
        "outside delivery",
        "tester independence",
        "private-data safety",
        "feedback truth",
        "NWN runtime behavior",
        "automatic skill improvement",
    }
    if isinstance(not_proven, list) and required_boundaries <= set(not_proven):
        result.ok("dispatch manifest preserves not-proven boundaries")
    else:
        result.error("dispatch manifest missing required not-proven boundaries")

    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--dispatch", default=str(DEFAULT_DISPATCH))
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    result = run(Path(args.root), Path(args.dispatch))
    if args.json:
        print(json.dumps({"checks": result.checks, "errors": result.errors}, indent=2))
    else:
        for check in result.checks:
            print(f"OK: {check}")
        for error in result.errors:
            print(f"ERROR: {error}")
        if result.errors:
            print(f"External trial dispatch bundle check failed: {len(result.errors)} error(s)")
        else:
            print("External trial dispatch bundle check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
