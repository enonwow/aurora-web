#!/usr/bin/env python3
"""Smoke-test the clean-session prompt pack as a received-only handoff."""

from __future__ import annotations

import argparse
import importlib.util
import json
import shutil
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType


DEFAULT_PACK = Path(".codex-tmp/forward-test-clean-session-prompts/rc-minimum")
DEFAULT_RECEIVED = Path(".codex-tmp/forward-test-clean-session-received/rc-minimum")
SUMMARY_NAME = "RECEIVED-CLEAN-SESSION-SUMMARY.json"
DEFAULT_EXPECTED_TEST_IDS = ["FT-002", "FT-003", "FT-008"]


def expected_files(test_ids: list[str]) -> set[str]:
    return {
        "CLEAN-SESSION-MANIFEST.json",
        "README.md",
        "SHA256SUMS.txt",
    } | {f"prompts/{test_id.lower()}-clean-session.md" for test_id in test_ids}


@dataclass
class ReceivedCleanSessionCheck:
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


def in_tmp(root: Path, path: Path) -> bool:
    tmp_root = (root / ".codex-tmp").resolve()
    resolved = path.resolve()
    return resolved == tmp_root or tmp_root in resolved.parents


def iter_files(root: Path) -> list[Path]:
    return sorted(path for path in root.rglob("*") if path.is_file())


def rel(path: Path, root: Path) -> str:
    return str(path.relative_to(root)).replace("\\", "/")


def run(
    root: Path,
    pack_relative: Path = DEFAULT_PACK,
    received_relative: Path = DEFAULT_RECEIVED,
    expected_test_ids: list[str] | None = None,
) -> ReceivedCleanSessionCheck:
    result = ReceivedCleanSessionCheck()
    expected_test_ids = expected_test_ids or DEFAULT_EXPECTED_TEST_IDS
    expected = expected_files(expected_test_ids)
    source = root / pack_relative
    if not source.is_dir():
        result.error(f"source clean-session prompt pack is missing: {pack_relative}")
        return result
    if not in_tmp(root, source):
        result.error(f"source clean-session prompt pack is outside .codex-tmp: {pack_relative}")
        return result

    try:
        builder = load_module(
            root / "tools" / "build_forward_test_clean_session_prompts.py",
            "build_forward_test_clean_session_prompts_received_check",
        )
        clean_checker = load_module(
            root / "tools" / "check_forward_test_clean_session_prompts.py",
            "check_forward_test_clean_session_prompts_received_check",
        )
    except Exception as exc:
        result.error(f"cannot import clean-session prompt tooling: {exc}")
        return result

    source_files = {rel(path, source) for path in iter_files(source)}
    if source_files == expected:
        result.ok("source clean-session prompt pack has exact expected file set")
    else:
        result.error(
            "source clean-session prompt pack file set differs; "
            f"expected {sorted(expected)}, got {sorted(source_files)}"
        )
        return result

    received_root = root / received_relative
    if not in_tmp(root, received_root):
        result.error(f"received clean-session root is outside .codex-tmp: {received_root}")
        return result
    if received_root.exists():
        shutil.rmtree(received_root)
    inbox = received_root / "inbox"
    inbox.mkdir(parents=True, exist_ok=True)

    for path in iter_files(source):
        relative = path.relative_to(source)
        target = inbox / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)
    result.ok(f"copied clean-session prompt pack into received inbox: {inbox}")

    inbox_files = {rel(path, inbox) for path in iter_files(inbox)}
    if inbox_files == expected:
        result.ok("received clean-session inbox has exact expected file set")
    else:
        result.error(
            "received clean-session inbox file set differs; "
            f"expected {sorted(expected)}, got {sorted(inbox_files)}"
        )

    for relative in sorted(expected):
        source_file = source / relative
        received_file = inbox / relative
        if not received_file.exists():
            result.error(f"received file is missing: {relative}")
        elif builder.sha256(source_file) == builder.sha256(received_file):
            result.ok(f"received file hash matches source: {relative}")
        else:
            result.error(f"received file hash differs from source: {relative}")

    nested = clean_checker.run(root, received_relative / "inbox", expected_test_ids)
    result.checks.extend(f"received no-leak check: {check}" for check in nested.checks)
    result.errors.extend(f"received no-leak check: {error}" for error in nested.errors)

    manifest = inbox / "CLEAN-SESSION-MANIFEST.json"
    if manifest.exists():
        text = manifest.read_text(encoding="utf-8")
        expected_pack_id = clean_checker.expected_pack_id(expected_test_ids)
        required = [
            expected_pack_id,
            "not returned-answer evidence",
            "release-candidate proof",
        ]
        for token in required:
            if token in text:
                result.ok(f"received manifest includes boundary token: {token}")
            else:
                result.error(f"received manifest missing boundary token: {token}")

    summary = {
        "schema_version": "1",
        "source_pack": rel(source, root),
        "received_root": rel(received_root, root),
        "inbox": rel(inbox, root),
        "checks": result.checks,
        "errors": result.errors,
        "verified_boundary": (
            "Local received-pack smoke proves only that the clean-session prompt pack can be copied "
            "into a scratch inbox and still pass the no-leak/hash checks."
        ),
        "not_proven": [
            "outside delivery",
            "fresh Codex thread execution",
            "raw answer capture",
            "tester independence",
            "answer quality",
            "install behavior",
            "NWN runtime behavior",
            "release-candidate readiness",
        ],
    }
    summary_path = received_root / SUMMARY_NAME
    summary_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    result.ok(f"received clean-session summary written: {summary_path}")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--pack", default=str(DEFAULT_PACK))
    parser.add_argument("--received", default=str(DEFAULT_RECEIVED))
    parser.add_argument("--test-id", action="append", dest="test_ids")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    result = run(Path(args.root), Path(args.pack), Path(args.received), args.test_ids)
    if args.json:
        print(json.dumps({"checks": result.checks, "errors": result.errors}, indent=2))
    else:
        for check in result.checks:
            print(f"OK: {check}")
        for error in result.errors:
            print(f"ERROR: {error}")
        if result.errors:
            print(f"Clean-session received pack check failed: {len(result.errors)} error(s)")
        else:
            print("Clean-session received pack check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
