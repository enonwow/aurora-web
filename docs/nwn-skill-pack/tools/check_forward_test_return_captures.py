#!/usr/bin/env python3
"""Check returned forward-test capture sheets before reviewer scoring."""

from __future__ import annotations

import argparse
import importlib.util
import json
import shutil
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType


EXPECTED_TEST_IDS = ["FT-002", "FT-003", "FT-008"]
SELF_TEST_DIR = Path(".codex-tmp/forward-test-return-check/fixture")
BLANK_VALUES = {"", "todo", "tbd", "n/a", "na", "none", "-", "unknown"}

FIELD_PREFIXES = [
    "- Test id:",
    "- Prompt file:",
    "- Skill path:",
    "- Tester:",
    "- Model or session label:",
    "- Captured at:",
    "- Fresh context confirmation:",
    "- The agent received one prompt file only:",
    "- The agent received the skill path named in that prompt:",
    "- The agent did not receive prior test results:",
    "- The agent did not receive suspected failures or reviewer notes:",
    "- Saved answer path or transcript location:",
    "- Answer was copied before review began:",
    "- Answer was not edited after capture:",
    "- First Implementable Slice named by the answer:",
    "- Expected proof named for that slice:",
    "- Evidence limits or unproven claims around that slice:",
    "- Runtime proof missing or requested by the answer:",
    "- Reviewer-only material was not opened before this capture:",
    "- Scoring began only after raw answer preservation:",
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
class ReturnCaptureCheck:
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


def value_for(text: str, prefix: str) -> str:
    for line in text.splitlines():
        if line.startswith(prefix):
            return line[len(prefix):].strip()
    return ""


def has_value(text: str, prefix: str) -> bool:
    return value_for(text, prefix).strip().lower() not in BLANK_VALUES


def in_tmp(root: Path, path: Path) -> bool:
    tmp_root = (root / ".codex-tmp").resolve()
    resolved = path.resolve()
    return resolved == tmp_root or tmp_root in resolved.parents


def self_test_dir(root: Path, expected_test_ids: list[str]) -> Path:
    suffix = "-".join(test_id.lower() for test_id in expected_test_ids)
    return root / SELF_TEST_DIR / suffix


def prepare_self_test(root: Path, expected_test_ids: list[str]) -> Path:
    target = self_test_dir(root, expected_test_ids)
    if not in_tmp(root, target):
        raise ValueError("self-test return directory must stay under .codex-tmp")
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True, exist_ok=True)

    initializer = load_module(
        root / "tools" / "init_forward_test_capture.py",
        "init_forward_test_capture_return_check",
    )
    for test_id in expected_test_ids:
        text = initializer.generate(root, test_id, "2026-06-19T01:12:09Z")
        replacements = {
            "- Tester:": " synthetic-clean-tester",
            "- Model or session label:": " synthetic-forward-test-session",
            "- Fresh context confirmation:": " yes, synthetic self-test fixture",
            "- The agent received one prompt file only:": " yes",
            "- The agent received the skill path named in that prompt:": " yes",
            "- The agent did not receive prior test results:": " yes",
            "- The agent did not receive suspected failures or reviewer notes:": " yes",
            "- Any deviation:": " none",
            "- Saved answer path or transcript location:": f" synthetic-transcripts/{test_id.lower()}-answer.md",
            "- Answer was copied before review began:": " yes",
            "- Answer was not edited after capture:": " yes",
            "- References or files the answer chose to mention:": " source-registry.md, feature design template",
            "- Evidence labels the answer used:": " docs-verified, runtime-test-required",
            "- First Implementable Slice named by the answer:": " create a tiny verified first slice before broad rollout",
            "- Files/assets/data rows/scripts touched or requested for that slice:": " requested module-local files and one script hook",
            "- Expected proof named for that slice:": " compile result plus runtime observation",
            "- Rollback or safety path named for that slice:": " disable the new resource and revert changed local files",
            "- Evidence limits or unproven claims around that slice:": " no live NWN runtime proof in the synthetic answer",
            "- Runtime proof claimed by the answer:": " none",
            "- Runtime proof missing or requested by the answer:": " Toolset/server/client proof still required",
            "- Project-specific assumptions stated by the answer:": " target module path would need maintainer confirmation",
            "- Exact blocker stated by the answer, if any:": " no target project files provided",
            "- Feedback or follow-up candidate stated by the answer:": " capture project-specific convention as reviewed feedback",
            "- Reviewer-only material was not opened before this capture:": " yes",
            "- Scoring began only after raw answer preservation:": " yes",
        }
        lines: list[str] = []
        for line in text.splitlines():
            for prefix, value in replacements.items():
                if line.startswith(prefix):
                    line = f"{prefix} {value}"
                    break
            lines.append(line)
        (target / f"{test_id.lower()}-capture.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return target


def run(
    root: Path,
    captures: Path | None = None,
    self_test: bool = False,
    expected_test_ids: list[str] | None = None,
) -> ReturnCaptureCheck:
    result = ReturnCaptureCheck()
    expected_test_ids = expected_test_ids or EXPECTED_TEST_IDS
    capture_dir = (
        prepare_self_test(root, expected_test_ids)
        if self_test
        else (captures or root / SELF_TEST_DIR)
    )
    if not capture_dir.is_dir():
        result.error(f"capture return directory is missing: {capture_dir}")
        return result
    result.ok(f"capture return directory exists: {capture_dir}")

    expected_files = {f"{test_id.lower()}-capture.md" for test_id in expected_test_ids}
    actual_files = {path.name for path in capture_dir.glob("*-capture.md") if path.is_file()}
    if actual_files == expected_files:
        result.ok("capture return directory has exact expected capture sheets")
    else:
        result.error(f"capture return file set differs; expected {sorted(expected_files)}, got {sorted(actual_files)}")

    for test_id in expected_test_ids:
        path = capture_dir / f"{test_id.lower()}-capture.md"
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")
        if value_for(text, "- Test id:") == test_id:
            result.ok(f"{test_id} capture sheet records matching test id")
        else:
            result.error(f"{test_id} capture sheet has wrong or missing test id")
        for prefix in FIELD_PREFIXES:
            if has_value(text, prefix):
                result.ok(f"{test_id} capture has filled field: {prefix}")
            else:
                result.error(f"{test_id} capture is missing filled field: {prefix}")
        lowered = text.lower()
        for token in FORBIDDEN_TOKENS:
            if token.lower() in lowered:
                result.error(f"{test_id} capture leaks reviewer/scoring token: {token}")

    if not result.errors:
        result.ok("returned captures are filled and avoid reviewer-only leakage")
    result.ok(
        "return-capture check allows reference filenames in raw-answer observations; "
        "initializer checks guard blank-sheet expected-reference leakage"
    )
    result.ok("return-capture check does not score model quality or prove NWN runtime behavior")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--captures", default="")
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--test-id", action="append", dest="test_ids")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    root = Path(args.root)
    captures = Path(args.captures) if args.captures else None
    result = run(
        root,
        captures=captures,
        self_test=args.self_test,
        expected_test_ids=args.test_ids,
    )
    if args.json:
        print(json.dumps({"checks": result.checks, "errors": result.errors}, indent=2))
    else:
        for check in result.checks:
            print(f"OK: {check}")
        for error in result.errors:
            print(f"ERROR: {error}")
        if result.errors:
            print(f"Forward-test return capture check failed: {len(result.errors)} error(s)")
        else:
            print("Forward-test return capture check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
