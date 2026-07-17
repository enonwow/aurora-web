#!/usr/bin/env python3
"""Check clean-session prompt files for forward tests."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType
from typing import Any


DEFAULT_PACK = Path(".codex-tmp/forward-test-clean-session-prompts/rc-minimum")
DEFAULT_EXPECTED_TEST_IDS = ["FT-002", "FT-003", "FT-008"]
DEFAULT_PACK_ID = "RC-MINIMUM-CLEAN-SESSION-PROMPTS"
CUSTOM_PACK_ID = "CUSTOM-CLEAN-SESSION-PROMPTS"
FORBIDDEN_TOKENS = [
    "expected_references",
    "review_focus",
    "reviewer-matrix.json",
    "reviewer-packet.md",
    "record-command-templates.md",
    "--expected-reference",
    "--first-implementable-slice",
    "reviewer_assertions",
    "pass|partial|fail",
]


@dataclass
class CleanSessionPromptCheck:
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
        raise ValueError(f"{path} must contain a JSON object")
    return data


def in_tmp(root: Path, path: Path) -> bool:
    tmp_root = (root / ".codex-tmp").resolve()
    resolved = path.resolve()
    return resolved == tmp_root or tmp_root in resolved.parents


def iter_files(root: Path) -> list[Path]:
    return sorted(path for path in root.rglob("*") if path.is_file())


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


def reviewer_reference_tokens(root: Path) -> set[str]:
    matrix = load_json(root / "forward-tests" / "reviewer-matrix.json")
    result: set[str] = set()
    tests = matrix.get("tests", [])
    if not isinstance(tests, list):
        return result
    for test in tests:
        if not isinstance(test, dict):
            continue
        refs = test.get("expected_references", [])
        if isinstance(refs, list):
            result.update(str(ref) for ref in refs)
    return result


def expected_pack_id(expected_test_ids: list[str], explicit_pack_id: str | None = None) -> str:
    if explicit_pack_id:
        return explicit_pack_id
    if expected_test_ids == DEFAULT_EXPECTED_TEST_IDS:
        return DEFAULT_PACK_ID
    return CUSTOM_PACK_ID


def run(
    root: Path,
    pack_relative: Path = DEFAULT_PACK,
    expected_test_ids: list[str] | None = None,
    pack_id: str | None = None,
) -> CleanSessionPromptCheck:
    result = CleanSessionPromptCheck()
    expected_test_ids = expected_test_ids or DEFAULT_EXPECTED_TEST_IDS
    pack = root / pack_relative
    if not pack.is_dir():
        result.error(f"clean-session prompt pack root is missing: {pack_relative}")
        return result
    if not in_tmp(root, pack):
        result.error(f"clean-session prompt pack root is outside .codex-tmp: {pack_relative}")
        return result
    result.ok(f"clean-session prompt pack root exists under .codex-tmp: {pack_relative}")

    try:
        builder = load_module(
            root / "tools" / "build_forward_test_clean_session_prompts.py",
            "build_forward_test_clean_session_prompts_check",
        )
    except Exception as exc:
        result.error(f"cannot import clean-session prompt builder: {exc}")
        return result

    expected_files = {
        "CLEAN-SESSION-MANIFEST.json",
        "README.md",
        "SHA256SUMS.txt",
    } | {f"prompts/{test_id.lower()}-clean-session.md" for test_id in expected_test_ids}
    actual_files = {str(path.relative_to(pack)).replace("\\", "/") for path in iter_files(pack)}
    if actual_files == expected_files:
        result.ok("clean-session prompt pack has exact expected file set")
    else:
        result.error(f"clean-session file set differs; expected {sorted(expected_files)}, got {sorted(actual_files)}")

    manifest_path = pack / "CLEAN-SESSION-MANIFEST.json"
    if not manifest_path.exists():
        result.error("clean-session manifest is missing")
        return result
    try:
        manifest = load_json(manifest_path)
    except Exception as exc:
        result.error(f"clean-session manifest is invalid: {exc}")
        return result

    if manifest.get("schema_version") == "1":
        result.ok("clean-session manifest schema_version is 1")
    else:
        result.error("clean-session manifest schema_version must be 1")

    expected_id = expected_pack_id(expected_test_ids, pack_id)
    if manifest.get("pack_id") == expected_id:
        result.ok(f"clean-session manifest pack_id is {expected_id}")
    else:
        result.error("clean-session manifest pack_id is wrong")

    if manifest.get("test_ids") == expected_test_ids:
        result.ok(f"clean-session manifest test_ids match: {', '.join(expected_test_ids)}")
    else:
        result.error(f"clean-session manifest test_ids must be {', '.join(expected_test_ids)}")

    sums_path = pack / "SHA256SUMS.txt"
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

    hash_files = sorted(
        path
        for path in iter_files(pack)
        if path.name not in {"CLEAN-SESSION-MANIFEST.json", "SHA256SUMS.txt"}
    )
    expected_hash_targets = {str(path.relative_to(pack)).replace("\\", "/") for path in hash_files}
    if set(sums) == expected_hash_targets:
        result.ok("SHA256SUMS.txt covers README and prompt files")
    else:
        result.error("SHA256SUMS.txt does not cover exactly README and prompt files")
    for target, digest in sums.items():
        target_path = pack / target
        if not target_path.exists():
            result.error(f"SHA target is missing: {target}")
        elif builder.sha256(target_path) == digest:
            result.ok(f"SHA256SUMS hash matches: {target}")
        else:
            result.error(f"SHA256SUMS hash mismatch: {target}")

    all_text = "\n".join(path.read_text(encoding="utf-8", errors="replace") for path in iter_files(pack))
    lowered = all_text.lower()
    for token in FORBIDDEN_TOKENS:
        if token.lower() in lowered:
            result.error(f"clean-session prompt pack leaks private review token: {token}")
    for token in sorted(reviewer_reference_tokens(root)):
        if token.lower() in lowered:
            result.error(f"clean-session prompt pack leaks expected reference token: {token}")
    if not result.errors:
        result.ok("clean-session prompt pack avoids private review and expected-reference tokens")

    required_boundary = {
        "answer quality",
        "install behavior",
        "tester independence",
        "NWN runtime behavior",
        "release-candidate readiness",
    }
    not_proven = manifest.get("not_proven")
    if isinstance(not_proven, list) and required_boundary <= set(not_proven):
        result.ok("clean-session manifest preserves not-proven boundaries")
    else:
        result.error("clean-session manifest missing required not-proven boundaries")

    for test_id in expected_test_ids:
        path = pack / "prompts" / f"{test_id.lower()}-clean-session.md"
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        required = [
            "fresh Codex thread",
            "Paste only the prompt block",
            "Prompt Block",
            "init_forward_test_capture.py",
            "forward-test-return-captures",
            "No reference answer is included.",
            "This file does not prove answer quality.",
        ]
        for token in required:
            if token in text:
                result.ok(f"{test_id} clean prompt includes: {token}")
            else:
                result.error(f"{test_id} clean prompt missing: {token}")

    readme = pack / "README.md"
    if readme.exists():
        text = readme.read_text(encoding="utf-8")
        required = [
            "one file per fresh Codex thread",
            "No reference answer is included.",
            "The pack does not prove answer quality",
        ]
        for token in required:
            if token in text:
                result.ok(f"README includes: {token}")
            else:
                result.error(f"README missing: {token}")

    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--pack", default=str(DEFAULT_PACK))
    parser.add_argument("--test-id", action="append", dest="test_ids")
    parser.add_argument("--pack-id", default="")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    result = run(
        Path(args.root),
        Path(args.pack),
        args.test_ids or DEFAULT_EXPECTED_TEST_IDS,
        args.pack_id or None,
    )
    if args.json:
        print(json.dumps({"checks": result.checks, "errors": result.errors}, indent=2))
    else:
        for check in result.checks:
            print(f"OK: {check}")
        for error in result.errors:
            print(f"ERROR: {error}")
        if result.errors:
            print(f"Clean-session prompt pack check failed: {len(result.errors)} error(s)")
        else:
            print("Clean-session prompt pack check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
