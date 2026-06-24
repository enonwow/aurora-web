#!/usr/bin/env python3
"""Check the generated Aurora live retest operator bundle."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType
from typing import Any


DEFAULT_BUNDLE = Path(".codex-tmp/aurora-live-retest-operator-bundle/current")


@dataclass
class RetestOperatorBundleCheck:
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


def add_nested_result(result: RetestOperatorBundleCheck, prefix: str, nested: Any) -> None:
    for check in getattr(nested, "checks", []):
        result.ok(f"{prefix}: {check}")
    for error in getattr(nested, "errors", []):
        result.error(f"{prefix}: {error}")


def check_artifact_hashes(
    result: RetestOperatorBundleCheck,
    root: Path,
    bundle_root: Path,
    builder: ModuleType,
    manifest: dict[str, Any],
    sums: dict[str, str],
) -> None:
    source_artifacts = manifest.get("source_artifacts")
    if not isinstance(source_artifacts, dict):
        result.error("bundle manifest source_artifacts must be an object")
        return

    expected_artifacts = {
        "dispatch": builder.DISPATCH,
        "result_template": builder.RESULT_TEMPLATE,
    }
    for key, source_relative in expected_artifacts.items():
        item = source_artifacts.get(key)
        if not isinstance(item, dict):
            result.error(f"bundle manifest source_artifacts.{key} must be an object")
            continue
        source_value = item.get("source")
        target_value = item.get("target")
        digest_value = item.get("sha256")
        if not isinstance(source_value, str) or not isinstance(target_value, str) or not isinstance(digest_value, str):
            result.error(f"bundle manifest source_artifacts.{key} is missing source, target, or sha256")
            continue
        if source_value != str(source_relative).replace("\\", "/"):
            result.error(f"bundle manifest source for {key} differs: {source_value}")
            continue
        source_path = root / source_relative
        target_path = bundle_root / target_value
        if not source_path.exists():
            result.error(f"bundle source is missing for {key}: {source_relative}")
            continue
        if not target_path.exists():
            result.error(f"bundle target is missing for {key}: {target_value}")
            continue
        source_hash = builder.sha256(source_path)
        target_hash = builder.sha256(target_path)
        if source_hash == target_hash == digest_value == sums.get(target_value):
            result.ok(f"bundle copied hash matches source and SHA256SUMS: {key}")
        else:
            result.error(f"bundle hash mismatch for {key}")


def run(root: Path, bundle_relative: Path = DEFAULT_BUNDLE) -> RetestOperatorBundleCheck:
    result = RetestOperatorBundleCheck()
    bundle_root = root / bundle_relative
    if not bundle_root.is_dir():
        result.error(f"retest operator bundle root is missing: {bundle_relative}")
        return result
    if not in_tmp(root, bundle_root):
        result.error(f"retest operator bundle root is outside .codex-tmp: {bundle_relative}")
        return result
    result.ok(f"retest operator bundle root exists under .codex-tmp: {bundle_relative}")

    try:
        builder = load_module(
            root / "tools" / "build_aurora_live_retest_operator_bundle.py",
            "build_aurora_live_retest_operator_bundle_check",
        )
    except Exception as exc:
        result.error(f"cannot import retest operator bundle builder: {exc}")
        return result

    expected_files = {
        builder.DISPATCH.name,
        builder.RESULT_TEMPLATE.name,
        str(builder.SHA256SUMS).replace("\\", "/"),
        str(builder.BUNDLE_MANIFEST).replace("\\", "/"),
    }
    actual_files = {
        str(path.relative_to(bundle_root)).replace("\\", "/")
        for path in iter_files(bundle_root)
    }
    if actual_files == expected_files:
        result.ok("retest operator bundle has exact expected file set")
    else:
        result.error(
            "retest operator bundle file set differs; "
            f"expected {sorted(expected_files)}, got {sorted(actual_files)}"
        )

    manifest_path = bundle_root / builder.BUNDLE_MANIFEST
    if not manifest_path.exists():
        result.error("retest operator bundle manifest is missing")
        return result
    try:
        manifest = load_json(manifest_path)
    except Exception as exc:
        result.error(f"retest operator bundle manifest is invalid: {exc}")
        return result

    if manifest.get("schema_version") == "1":
        result.ok("retest operator bundle manifest schema_version is 1")
    else:
        result.error("retest operator bundle manifest schema_version must be 1")

    if manifest.get("bundle_type") == "aurora-live-retest-operator":
        result.ok("retest operator bundle manifest bundle_type is aurora-live-retest-operator")
    else:
        result.error("retest operator bundle manifest bundle_type must be aurora-live-retest-operator")

    dispatch_status = manifest.get("dispatch_status")
    try:
        current_status = builder.dispatch_status(root / builder.DISPATCH)
    except Exception as exc:
        result.error(f"could not read current dispatch status: {exc}")
        current_status = None
    if dispatch_status == current_status:
        result.ok("retest operator bundle manifest dispatch_status matches current dispatch")
    else:
        result.error(f"dispatch_status mismatch: manifest={dispatch_status!r}, current={current_status!r}")

    ready_to_send = manifest.get("ready_to_send")
    if ready_to_send == (dispatch_status == "retest-requests-ready"):
        result.ok("retest operator bundle ready_to_send matches dispatch status")
    else:
        result.error("retest operator bundle ready_to_send must match dispatch status")

    send_instruction = manifest.get("send_instruction")
    if dispatch_status == "retest-requests-ready":
        if isinstance(send_instruction, str) and "Send exactly the dispatch and retest-result template" in send_instruction:
            result.ok("retest operator bundle send instruction is active for ready dispatches")
        else:
            result.error("ready retest operator bundle must instruct sending dispatch and template")
    else:
        if isinstance(send_instruction, str) and "Do not send this bundle yet" in send_instruction:
            result.ok("retest operator bundle send instruction blocks inactive dispatches")
        else:
            result.error("inactive retest operator bundle must block sending")

    bundle_files = manifest.get("bundle_files")
    if isinstance(bundle_files, list) and set(bundle_files) == expected_files:
        result.ok("retest operator bundle manifest lists the exact bundle files")
    else:
        result.error("retest operator bundle manifest bundle_files must list the exact bundle files")

    sums_path = bundle_root / builder.SHA256SUMS
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

    check_artifact_hashes(result, root, bundle_root, builder, manifest, sums)

    if set(sums) == {builder.DISPATCH.name, builder.RESULT_TEMPLATE.name}:
        result.ok("SHA256SUMS.txt covers only dispatch and retest result template")
    else:
        result.error("SHA256SUMS.txt should cover exactly the dispatch and retest result template")

    not_proven = manifest.get("not_proven")
    required_boundaries = {
        "outside delivery",
        "operator completion",
        "screenshot truth",
        "log truth",
        "NWN runtime behavior",
        "privacy safety",
        "automatic skill improvement",
    }
    if isinstance(not_proven, list) and required_boundaries <= set(not_proven):
        result.ok("retest operator bundle manifest preserves not-proven boundaries")
    else:
        result.error("retest operator bundle manifest missing required not-proven boundaries")

    try:
        dispatch_checker = load_module(
            root / "tools" / "check_aurora_live_retest_dispatch.py",
            "check_aurora_live_retest_dispatch_bundle",
        )
        add_nested_result(result, "retest dispatch check", dispatch_checker.run(root))
    except Exception as exc:
        result.error(f"cannot run retest dispatch check: {exc}")

    try:
        template_checker = load_module(
            root / "tools" / "check_aurora_live_retest_result_template.py",
            "check_aurora_live_retest_result_template_bundle",
        )
        add_nested_result(result, "retest result template check", template_checker.run(root))
    except Exception as exc:
        result.error(f"cannot run retest result template check: {exc}")

    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--bundle", default=str(DEFAULT_BUNDLE))
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    result = run(Path(args.root), Path(args.bundle))
    if args.json:
        print(json.dumps({"checks": result.checks, "errors": result.errors}, indent=2))
    else:
        for check in result.checks:
            print(f"OK: {check}")
        for error in result.errors:
            print(f"ERROR: {error}")
        if result.errors:
            print(f"Aurora live retest operator bundle check failed: {len(result.errors)} error(s)")
        else:
            print("Aurora live retest operator bundle check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
