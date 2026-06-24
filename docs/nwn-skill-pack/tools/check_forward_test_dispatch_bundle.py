#!/usr/bin/env python3
"""Check the no-leak dispatch bundle for prompt forward tests."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType
from typing import Any


DEFAULT_DISPATCH = Path(".codex-tmp/forward-test-dispatch/rc-minimum")
EXPECTED_TEST_IDS = ["FT-002", "FT-003", "FT-008"]
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
class ForwardDispatchCheck:
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


def run(root: Path, dispatch_relative: Path = DEFAULT_DISPATCH) -> ForwardDispatchCheck:
    result = ForwardDispatchCheck()
    dispatch = root / dispatch_relative
    if not dispatch.is_dir():
        result.error(f"forward-test dispatch bundle root is missing: {dispatch_relative}")
        return result
    if not in_tmp(root, dispatch):
        result.error(f"forward-test dispatch bundle root is outside .codex-tmp: {dispatch_relative}")
        return result
    result.ok(f"forward-test dispatch bundle root exists under .codex-tmp: {dispatch_relative}")

    try:
        builder = load_module(root / "tools" / "build_forward_test_dispatch_bundle.py", "build_forward_test_dispatch_bundle_check")
    except Exception as exc:
        result.error(f"cannot import forward-test dispatch builder: {exc}")
        return result

    expected_files = {
        "DISPATCH-MANIFEST.json",
        "SHA256SUMS.txt",
        "TESTER-INSTRUCTIONS.md",
    }
    for test_id in EXPECTED_TEST_IDS:
        lower = test_id.lower()
        expected_files.add(f"captures/{lower}-capture.md")
    expected_files.update({
        "prompts/ft-002-custom-spear-2da-hak-tlk.txt",
        "prompts/ft-003-nui-crafting-panel.txt",
        "prompts/ft-008-feedback-contribution.txt",
    })

    actual_files = {str(path.relative_to(dispatch)).replace("\\", "/") for path in iter_files(dispatch)}
    if actual_files == expected_files:
        result.ok("forward-test dispatch bundle has exact expected file set")
    else:
        result.error(f"dispatch file set differs; expected {sorted(expected_files)}, got {sorted(actual_files)}")

    manifest_path = dispatch / "DISPATCH-MANIFEST.json"
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

    if manifest.get("bundle_id") == "RC-MINIMUM-PROMPT-FORWARD":
        result.ok("dispatch manifest bundle_id is RC-MINIMUM-PROMPT-FORWARD")
    else:
        result.error("dispatch manifest bundle_id is wrong")

    if manifest.get("test_ids") == EXPECTED_TEST_IDS:
        result.ok("dispatch manifest test_ids match minimum RC prompt tests")
    else:
        result.error("dispatch manifest test_ids must be FT-002, FT-003, FT-008")

    sums_path = dispatch / "SHA256SUMS.txt"
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
        for path in iter_files(dispatch)
        if path.name not in {"DISPATCH-MANIFEST.json", "SHA256SUMS.txt"}
    )
    expected_hash_targets = {str(path.relative_to(dispatch)).replace("\\", "/") for path in hash_files}
    if set(sums) == expected_hash_targets:
        result.ok("SHA256SUMS.txt covers prompts, captures, and tester instructions")
    else:
        result.error("SHA256SUMS.txt does not cover exactly prompts, captures, and tester instructions")
    for target, digest in sums.items():
        target_path = dispatch / target
        if not target_path.exists():
            result.error(f"SHA target is missing: {target}")
        elif builder.sha256(target_path) == digest:
            result.ok(f"SHA256SUMS hash matches: {target}")
        else:
            result.error(f"SHA256SUMS hash mismatch: {target}")

    all_text = "\n".join(path.read_text(encoding="utf-8", errors="replace") for path in iter_files(dispatch))
    lowered = all_text.lower()
    for token in FORBIDDEN_TOKENS:
        if token.lower() in lowered:
            result.error(f"dispatch bundle leaks reviewer/scoring token: {token}")
    for token in sorted(reviewer_reference_tokens(root)):
        if token.lower() in lowered:
            result.error(f"dispatch bundle leaks expected reference token: {token}")
    if not result.errors:
        result.ok("dispatch bundle avoids reviewer-only scoring and expected-reference tokens")

    required_boundary = {
        "model answer quality",
        "human scoring correctness",
        "NWN runtime behavior",
        "release-candidate readiness",
        "automatic skill improvement",
    }
    not_proven = manifest.get("not_proven")
    if isinstance(not_proven, list) and required_boundary <= set(not_proven):
        result.ok("dispatch manifest preserves not-proven boundaries")
    else:
        result.error("dispatch manifest missing required not-proven boundaries")

    instructions = dispatch / "TESTER-INSTRUCTIONS.md"
    if instructions.exists():
        text = instructions.read_text(encoding="utf-8")
        required = [
            "clean context",
            "Do not open reviewer-only scoring materials",
            "Return the filled `captures/` files",
            "Skill path:",
        ]
        for token in required:
            if token in text:
                result.ok(f"tester instructions include: {token}")
            else:
                result.error(f"tester instructions missing: {token}")

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
            print(f"Forward-test dispatch bundle check failed: {len(result.errors)} error(s)")
        else:
            print("Forward-test dispatch bundle check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
