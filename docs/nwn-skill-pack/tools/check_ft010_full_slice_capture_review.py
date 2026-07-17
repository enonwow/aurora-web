#!/usr/bin/env python3
"""Check the FT-010 full-slice capture review bridge."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass, field
from pathlib import Path


BRIDGE = Path("forward-tests/ft-010-full-slice-capture-review.md")

REQUIRED_TOKENS = [
    "# FT-010 Full-Slice Capture Review Bridge",
    "Use this bridge only after the raw `FT-010` answer has been pasted into a capture sheet",
    "check_forward_test_return_captures.py",
    "--test-id FT-010",
    ".codex-tmp/forward-test-return-captures/full-slice-ft010/ft-010-capture.md",
    "reviewer-only material",
    "Do not give it to the agent under test.",
    "init_ft010_full_slice_review.py",
    ".codex-tmp\\forward-test-reviews\\full-slice-ft010\\ft-010-review.md",
    "Optional reviewer worksheet initialized by `tools/init_ft010_full_slice_review.py`",
    "Pre-Review Gates",
    "First Implementable Slice",
    "covered / weak / missing / out-of-scope",
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
    "single-domain answer cannot pass FT-010",
    "script, NUI mockup, content table, or checklist cannot stand in for the whole server slice",
    "tools/nwn_skill_feedback.py",
    "--domain concept",
    "--source-type maintainer-review",
    "--status unverified",
    "FT-010 full-slice gap",
    "capture: docs\\nwn-skill-pack\\.codex-tmp\\forward-test-return-captures\\full-slice-ft010\\ft-010-capture.md",
    "review: docs\\nwn-skill-pack\\.codex-tmp\\forward-test-reviews\\full-slice-ft010\\ft-010-review.md",
    "--failure-mode",
    "--proposed-file \"draft-skills/nwn-server-gamedev/references/server-gamedev-capability-map.md\"",
    "nwn_skill_feedback.py validate",
    "nwn_skill_feedback.py review",
    "needs-more-evidence",
    "reference-promotion process",
    "extra prompt-forward evidence, not automatic RC proof",
    "does not prove the model passed FT-010",
    "NWN runtime behavior",
    "release-candidate readiness",
]

ORDERED_TOKENS = [
    "## Purpose",
    "## Required Inputs",
    "## Pre-Review Gates",
    "## Full-Slice Coverage Table",
    "## Review Rules",
    "## Feedback And Versioning",
    "## Verification Boundary",
]


@dataclass
class BridgeCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def run(root: Path) -> BridgeCheck:
    result = BridgeCheck()
    path = root / BRIDGE
    if not path.exists():
        result.error(f"{BRIDGE} is missing")
        return result

    text = path.read_text(encoding="utf-8")
    result.ok(f"{BRIDGE} exists")

    for token in REQUIRED_TOKENS:
        if token in text:
            result.ok(f"bridge token exists: {token}")
        else:
            result.error(f"bridge missing token: {token}")

    cursor = -1
    for token in ORDERED_TOKENS:
        index = text.find(token, cursor + 1)
        if index == -1:
            result.error(f"bridge ordered token missing or out of order: {token}")
        else:
            cursor = index
    if cursor >= 0:
        result.ok("bridge sections are in expected order")

    if text.count("| Domain | Status | Captured-answer evidence | Proof, rollback, or blocker named |") == 1:
        result.ok("bridge has exactly one coverage table header")
    else:
        result.error("bridge must have exactly one coverage table header")

    if "automatic RC proof" in text and "not automatic RC proof" in text:
        result.ok("bridge preserves automatic-RC-proof boundary")
    else:
        result.error("bridge must explicitly reject automatic RC proof")

    if not result.errors:
        result.ok("FT-010 capture review bridge stays post-capture, full-slice, and boundary-labeled")
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
            print(f"FT-010 full-slice capture review check failed: {len(result.errors)} error(s)")
        else:
            print("FT-010 full-slice capture review check passed")

    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
