#!/usr/bin/env python3
"""Initialize a reviewer-only FT-010 full-slice review worksheet."""

from __future__ import annotations

import argparse
import re
import sys
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_CAPTURE = Path(".codex-tmp/forward-test-return-captures/full-slice-ft010/ft-010-capture.md")
DEFAULT_OUT = Path(".codex-tmp/forward-test-reviews/full-slice-ft010/ft-010-review.md")

DOMAINS = [
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
]


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def value_for(text: str, prefix: str) -> str:
    for line in text.splitlines():
        if line.startswith(prefix):
            return line[len(prefix):].strip()
    return ""


def read_capture(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"capture sheet is missing: {path}")
    return path.read_text(encoding="utf-8")


def compact(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip())


def generate(root: Path, capture: Path, reviewed_at: str | None = None) -> str:
    capture_path = capture if capture.is_absolute() else root / capture
    capture_text = read_capture(capture_path)
    reviewed = reviewed_at or now_iso()

    test_id = value_for(capture_text, "- Test id:") or "FT-010"
    raw_answer = value_for(capture_text, "- Saved answer path or transcript location:")
    tester = value_for(capture_text, "- Tester:")
    model = value_for(capture_text, "- Model or session label:")
    first_slice = value_for(capture_text, "- First Implementable Slice named by the answer:")

    if test_id != "FT-010":
        raise ValueError(f"expected FT-010 capture, got {test_id!r}")

    lines = [
        "# FT-010 Full-Slice Review Worksheet",
        "",
        "## Reviewer-Only Boundary",
        "",
        "Use this worksheet only after the raw FT-010 answer has been preserved and `tools/check_forward_test_return_captures.py --test-id FT-010` has passed.",
        "Do not give this worksheet to the agent under test.",
        "",
        "## Source Capture",
        "",
        f"- Capture sheet: `{capture_path.as_posix()}`",
        f"- Raw answer transcript: `{compact(raw_answer) or '[missing]'}`",
        f"- Tester: {compact(tester) or '[missing]'}",
        f"- Model or session label: {compact(model) or '[missing]'}",
        f"- Reviewed at: {reviewed}",
        f"- First Implementable Slice from capture: {compact(first_slice) or '[missing]'}",
        "",
        "## Pre-Review Gate Results",
        "",
        "- Return-capture check passed for FT-010:",
        "- Reviewer-only materials opened only after capture:",
        "- Fresh-context confirmation remained true:",
        "- Raw answer transcript path is usable:",
        "- Contamination or deviation:",
        "",
        "## Full-Slice Coverage Table",
        "",
        "Use statuses exactly: `covered`, `weak`, `missing`, or `out-of-scope`.",
        "",
        "| Domain | Status | Captured-answer evidence | Proof, rollback, or blocker named |",
        "| --- | --- | --- | --- |",
    ]
    for domain in DOMAINS:
        lines.append(f"| {domain} |  |  |  |")

    lines.extend([
        "",
        "## Reviewer Conclusion",
        "",
        "- Overall FT-010 result: [pass|partial|fail]",
        "- Strongest covered domain:",
        "- Weakest or missing domain:",
        "- Did a single domain stand in for the whole slice:",
        "- Did the answer name a credible First Implementable Slice:",
        "- Does the answer need a feedback record:",
        "- Feedback or reference-promotion candidate:",
        "",
        "## Verification Boundary",
        "",
        "This worksheet records reviewer analysis for one captured FT-010 answer. It does not prove NWN runtime behavior, external tester independence, plugin installation, release-candidate readiness, or automatic RC proof.",
    ])
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--capture", default=str(DEFAULT_CAPTURE))
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    parser.add_argument("--reviewed-at", default="")
    parser.add_argument("--stdout", action="store_true")
    args = parser.parse_args()

    root = Path(args.root)
    capture = Path(args.capture)
    try:
        output = generate(root, capture, args.reviewed_at or None)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    if args.stdout:
        print(output, end="")
        return 0

    out_path = Path(args.out)
    if not out_path.is_absolute():
        out_path = root / out_path
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(output, encoding="utf-8")
    print(out_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
