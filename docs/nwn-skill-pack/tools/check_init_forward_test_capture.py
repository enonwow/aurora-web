#!/usr/bin/env python3
"""Check the forward-test capture initializer does not leak reviewer-only data."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType
from typing import Any


TOOL = Path("tools/init_forward_test_capture.py")
SAMPLE_TEST_ID = "FT-003"
SAMPLE_CAPTURED_AT = "2026-06-19T00:00:00+00:00"

REQUIRED_TOKENS = [
    "## Capture Status",
    "## Prompt Delivery",
    "## Raw Answer Preservation",
    "## First-Pass Observations",
    "## No-Leak Confirmation",
    "Test id: FT-003",
    "forward-tests/prompts/ft-003-nui-crafting-panel.txt",
    "docs/nwn-skill-pack/draft-skills/nwn-server-gamedev",
    "First Implementable Slice named by the answer",
    "Files/assets/data rows/scripts touched or requested for that slice",
    "Expected proof named for that slice",
    "Rollback or safety path named for that slice",
    "Evidence limits or unproven claims around that slice",
    "No reviewer-only expected references or scoring fields are included",
]

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
class InitCaptureCheck:
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
        raise ValueError(f"{path} must contain a JSON object")
    return data


def load_module(path: Path, name: str) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not import {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def reviewer_tests(root: Path) -> list[dict[str, Any]]:
    matrix = load_json(root / "forward-tests" / "reviewer-matrix.json")
    tests = matrix.get("tests", [])
    if not isinstance(tests, list):
        return []
    return [test for test in tests if isinstance(test, dict)]


def reviewer_reference_tokens(root: Path) -> set[str]:
    result: set[str] = set()
    for test in reviewer_tests(root):
        refs = test.get("expected_references", [])
        if isinstance(refs, list):
            result.update(str(ref) for ref in refs)
    return result


def run(root: Path) -> InitCaptureCheck:
    result = InitCaptureCheck()
    tool_path = root / TOOL
    if not tool_path.exists():
        result.error(f"{TOOL} is missing")
        return result
    result.ok(f"{TOOL} exists")

    try:
        module = load_module(tool_path, "init_forward_test_capture_check")
        generated = module.generate(root, SAMPLE_TEST_ID, SAMPLE_CAPTURED_AT)
    except Exception as exc:
        result.error(f"capture initializer failed: {exc}")
        return result

    for token in REQUIRED_TOKENS:
        if token in generated:
            result.ok(f"generated capture token exists: {token}")
        else:
            result.error(f"generated capture missing token: {token}")

    lowered = generated.lower()
    for token in FORBIDDEN_TOKENS:
        if token.lower() in lowered:
            result.error(f"generated capture leaks reviewer/scoring token: {token}")

    for token in sorted(reviewer_reference_tokens(root)):
        if token.lower() in lowered:
            result.error(f"generated capture leaks expected reference token: {token}")
    if not result.errors:
        result.ok("generated capture does not leak reviewer-only expected reference tokens")

    tests = reviewer_tests(root)
    if not tests:
        result.error("reviewer matrix has no test objects")
    else:
        checked_ids: list[str] = []
        expected_refs = sorted(reviewer_reference_tokens(root))
        for test in tests:
            test_id = str(test.get("test_id", "")).strip()
            prompt_file = str(test.get("prompt_file", "")).strip()
            if not test_id:
                result.error("reviewer matrix test is missing test_id")
                continue
            try:
                per_test = module.generate(root, test_id, SAMPLE_CAPTURED_AT)
            except Exception as exc:
                result.error(f"capture initializer failed for {test_id}: {exc}")
                continue
            checked_ids.append(test_id)
            per_test_lowered = per_test.lower()
            for token in [
                f"Test id: {test_id}",
                prompt_file,
                "## No-Leak Confirmation",
                "No reviewer-only expected references or scoring fields are included",
            ]:
                if token and token in per_test:
                    continue
                result.error(f"generated capture for {test_id} missing token: {token}")
            for token in FORBIDDEN_TOKENS:
                if token.lower() in per_test_lowered:
                    result.error(
                        f"generated capture for {test_id} leaks reviewer/scoring token: {token}"
                    )
            for token in expected_refs:
                if token.lower() in per_test_lowered:
                    result.error(
                        f"generated capture for {test_id} leaks expected reference token: {token}"
                    )
        if checked_ids and not result.errors:
            result.ok(
                "generated capture stays no-leak for all reviewer-matrix tests: "
                + ", ".join(checked_ids)
            )

    out_path = module.output_path(root, SAMPLE_TEST_ID, SAMPLE_CAPTURED_AT)
    normalized = out_path.as_posix()
    if ".codex-tmp/forward-test-captures" in normalized and SAMPLE_TEST_ID.lower() in out_path.name:
        result.ok("default output path uses .codex-tmp/forward-test-captures")
    else:
        result.error(f"default output path is unexpected: {normalized}")

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
            print(f"Forward-test capture initializer check failed: {len(result.errors)} error(s)")
        else:
            print("Forward-test capture initializer check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
