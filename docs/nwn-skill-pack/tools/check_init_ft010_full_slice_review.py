#!/usr/bin/env python3
"""Check the FT-010 full-slice review worksheet initializer."""

from __future__ import annotations

import argparse
import importlib.util
import json
import shutil
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType


TOOL = Path("tools/init_ft010_full_slice_review.py")
FIXTURE_DIR = Path(".codex-tmp/ft010-review-init-check")
FIXTURE_CAPTURE = FIXTURE_DIR / "ft-010-capture.md"

REQUIRED_TOKENS = [
    "# FT-010 Full-Slice Review Worksheet",
    "Reviewer-Only Boundary",
    "tools/check_forward_test_return_captures.py --test-id FT-010",
    "Do not give this worksheet to the agent under test.",
    "Source Capture",
    "Raw answer transcript",
    "First Implementable Slice from capture",
    "Pre-Review Gate Results",
    "Full-Slice Coverage Table",
    "Use statuses exactly: `covered`, `weak`, `missing`, or `out-of-scope`.",
    "Locations, areas, tilesets",
    "Items, equipment, loot",
    "Creatures, encounters, AI",
    "2DA, HAK, TLK pipeline",
    "NWScript events and systems",
    "NUI player UI",
    "Quests, dialogue, journal",
    "Economy, crafting, progression",
    "Persistence, database, NWNX",
    "Deployment, NWSync, operations",
    "Testing, runtime QA",
    "Overall FT-010 result: [pass|partial|fail]",
    "Feedback or reference-promotion candidate",
    "does not prove NWN runtime behavior",
    "automatic RC proof",
]


@dataclass
class InitReviewCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def load_module(path: Path, name: str) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not import {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def fixture_capture_text() -> str:
    return "\n".join([
        "# Forward-Test Answer Capture Template",
        "",
        "## Capture Status",
        "",
        "- Test id: FT-010",
        "- Prompt file: forward-tests/prompts/ft-010-full-feature-server-slice.txt",
        "- Skill path: docs/nwn-skill-pack/draft-skills/nwn-server-gamedev",
        "- Tester: synthetic-clean-tester",
        "- Model or session label: synthetic-ft010-session",
        "- Captured at: 2026-06-19T07:53:15Z",
        "- Fresh context confirmation: yes",
        "",
        "## Raw Answer Preservation",
        "",
        "- Saved answer path or transcript location: synthetic-transcripts/ft-010-answer.md",
        "- Answer was copied before review began: yes",
        "- Answer was not edited after capture: yes",
        "",
        "## First-Pass Observations",
        "",
        "- First Implementable Slice named by the answer: hub-to-dungeon slice with one area, one quest, one item, one creature, and NUI status panel",
        "- Expected proof named for that slice: compile, module load, client smoke test",
        "- Evidence limits or unproven claims around that slice: no runtime proof captured",
        "- Runtime proof missing or requested by the answer: Toolset/server/client verification",
        "",
        "## No-Leak Confirmation",
        "",
        "- Reviewer-only material was not opened before this capture: yes",
        "- Scoring began only after raw answer preservation: yes",
        "",
    ]) + "\n"


def prepare_fixture(root: Path) -> Path:
    target = root / FIXTURE_DIR
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True, exist_ok=True)
    capture = root / FIXTURE_CAPTURE
    capture.write_text(fixture_capture_text(), encoding="utf-8")
    return FIXTURE_CAPTURE


def run(root: Path) -> InitReviewCheck:
    result = InitReviewCheck()
    tool_path = root / TOOL
    if not tool_path.exists():
        result.error(f"{TOOL} is missing")
        return result
    result.ok(f"{TOOL} exists")

    try:
        module = load_module(tool_path, "init_ft010_full_slice_review_check")
        capture = prepare_fixture(root)
        worksheet = module.generate(root, capture, "2026-06-19T07:53:15Z")
    except Exception as exc:
        result.error(f"FT-010 review initializer failed: {exc}")
        return result

    for token in REQUIRED_TOKENS:
        if token in worksheet:
            result.ok(f"worksheet token exists: {token}")
        else:
            result.error(f"worksheet missing token: {token}")

    if worksheet.count("| Domain | Status | Captured-answer evidence | Proof, rollback, or blocker named |") == 1:
        result.ok("worksheet has exactly one coverage table header")
    else:
        result.error("worksheet must have exactly one coverage table header")

    if "synthetic-transcripts/ft-010-answer.md" in worksheet:
        result.ok("worksheet imports raw answer transcript path from capture")
    else:
        result.error("worksheet does not import raw answer transcript path from capture")

    if "hub-to-dungeon slice" in worksheet:
        result.ok("worksheet imports First Implementable Slice from capture")
    else:
        result.error("worksheet does not import First Implementable Slice from capture")

    try:
        module.generate(root, capture, "2026-06-19T07:53:15Z")
    except Exception as exc:
        result.error(f"FT-010 review initializer is not deterministic on fixture: {exc}")

    bad_capture = FIXTURE_DIR / "ft-003-capture.md"
    (root / bad_capture).write_text(fixture_capture_text().replace("- Test id: FT-010", "- Test id: FT-003"), encoding="utf-8")
    try:
        module.generate(root, bad_capture, "2026-06-19T07:53:15Z")
        result.error("initializer accepted a non-FT-010 capture")
    except ValueError:
        result.ok("initializer rejects non-FT-010 captures")
    except Exception as exc:
        result.error(f"initializer rejected non-FT-010 capture with unexpected error: {exc}")

    if not result.errors:
        result.ok("FT-010 review initializer creates a reviewer-only full-slice worksheet")
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
            print(f"FT-010 review initializer check failed: {len(result.errors)} error(s)")
        else:
            print("FT-010 review initializer check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
