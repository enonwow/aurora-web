#!/usr/bin/env python3
"""Generate the release-candidate blocker burn-down for the NWN skill pack."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path
from types import ModuleType
from typing import Any


RECOMMENDED_TRIO = ["FT-002", "FT-003", "FT-008"]


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def load_module(path: Path, name: str) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def load_reviewer_tests(root: Path) -> dict[str, dict[str, Any]]:
    matrix = load_json(root / "forward-tests" / "reviewer-matrix.json")
    tests = matrix.get("tests", [])
    if not isinstance(tests, list):
        return {}
    result: dict[str, dict[str, Any]] = {}
    for item in tests:
        if isinstance(item, dict) and isinstance(item.get("test_id"), str):
            result[item["test_id"]] = item
    return result


def references_for(test: dict[str, Any]) -> str:
    refs = test.get("expected_references", [])
    if not isinstance(refs, list) or not refs:
        return "none"
    return ", ".join(f"`{ref}`" for ref in refs)


def generate(root: Path) -> str:
    manifest = load_json(root / "version-manifest.json")
    release_gate = load_module(root / "tools" / "check_release_gate.py", "check_release_gate_burndown")
    report = release_gate.evaluate(root, "release-candidate")
    tests = load_reviewer_tests(root)

    lines = [
        "# Release-Candidate Blocker Burn-Down",
        "",
        f"Generated from package metadata last updated: {manifest.get('last_updated', '')}",
        "",
        "## Package",
        "",
        f"- Package: `{manifest.get('package_name', '')}`",
        f"- Version: `{manifest.get('version', '')}`",
        f"- State: `{manifest.get('package_state', '')}`",
        "- Target gate: `release-candidate`",
        "",
        "## Current Gate Result",
        "",
    ]

    if report.blockers:
        lines.append(f"- `BLOCKED` Release-candidate gate has {len(report.blockers)} blocker(s).")
    else:
        lines.append("- `PASS` Release-candidate gate currently passes.")

    lines.extend(["", "## Blockers", ""])
    if report.blockers:
        for blocker in report.blockers:
            lines.append(f"- {blocker}")
    else:
        lines.append("- none")

    lines.extend([
        "",
        "## Minimal Forward-Test Path",
        "",
        "Run these first in fresh contexts, one prompt per context, then score with `forward-tests/reviewer-packet.md`:",
        "",
    ])

    for test_id in RECOMMENDED_TRIO:
        test = tests.get(test_id, {})
        lines.append(
            f"- `{test_id}` `{test.get('title', '')}`: "
            f"`{test.get('prompt_file', '')}`; expected coverage: {references_for(test)}"
        )

    lines.extend([
        "",
        "Why this trio:",
        "",
        "- It gives the required three independent prompt forward tests.",
        "- It covers NUI through FT-003 and FT-008.",
        "- It covers 2DA/HAK/TLK or packaging through FT-002.",
        "- It covers runtime QA through all three prompts.",
        "- It covers economy/progression through FT-003.",
        "- It covers human feedback contribution through FT-008.",
        "",
        "## Return-Capture Gate Before Scoring",
        "",
        "After the fresh contexts answer, initialize or fill the capture sheets for the same trio and run the returned-capture check before opening reviewer-only materials:",
        "",
        "```powershell",
        "python docs\\nwn-skill-pack\\tools\\init_forward_test_capture.py docs\\nwn-skill-pack --test-id FT-002 --out docs\\nwn-skill-pack\\.codex-tmp\\forward-test-return-captures\\ft-002-capture.md",
        "python docs\\nwn-skill-pack\\tools\\init_forward_test_capture.py docs\\nwn-skill-pack --test-id FT-003 --out docs\\nwn-skill-pack\\.codex-tmp\\forward-test-return-captures\\ft-003-capture.md",
        "python docs\\nwn-skill-pack\\tools\\init_forward_test_capture.py docs\\nwn-skill-pack --test-id FT-008 --out docs\\nwn-skill-pack\\.codex-tmp\\forward-test-return-captures\\ft-008-capture.md",
        "python docs\\nwn-skill-pack\\tools\\check_forward_test_return_captures.py docs\\nwn-skill-pack --captures docs\\nwn-skill-pack\\.codex-tmp\\forward-test-return-captures",
        "```",
        "",
        "Blank initialized capture sheets must fail this gate. Treat that failure as the expected blocker until raw answers and session facts are pasted into the capture sheets.",
        "",
        "Do not score with `forward-tests/reviewer-packet.md` until `check_forward_test_return_captures.py` passes on filled returned captures.",
        "",
        "## Install-Smoke Path",
        "",
        "After RC evidence exists, run the install-smoke handoff instead of treating sandbox generation as proof:",
        "",
        "```powershell",
        "python docs\\nwn-skill-pack\\tools\\generate_install_smoke_packet.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\forward-tests\\install-smoke-packet.md",
        "python docs\\nwn-skill-pack\\tools\\check_install_smoke_packet.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_install_smoke_playbook.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_install_smoke_records.py docs\\nwn-skill-pack",
        "```",
        "",
        "Then record the actual result with `tools/forward_test_record.py`; a pass requires `install_verification` from a fresh Codex context that discovers and invokes the plugin/skill.",
        "",
        "For the short human execution packet, refresh `forward-tests/minimum-rc-proof-packet.md`.",
        "",
        "## Required Refresh Commands",
        "",
        "```powershell",
        "python docs\\nwn-skill-pack\\tools\\generate_minimum_rc_proof_packet.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\forward-tests\\minimum-rc-proof-packet.md",
        "python docs\\nwn-skill-pack\\tools\\check_minimum_rc_proof_packet.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_rc_blocker_burndown.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\run_repo_artifact_preflight.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_release_gate.py docs\\nwn-skill-pack --target release-candidate",
        "```",
        "",
        "## Verified",
        "",
        "- This burn-down is generated from `version-manifest.json`, `forward-tests/reviewer-matrix.json`, and `tools/check_release_gate.py`.",
        "- The current repo-artifact preflight can pass while the release-candidate gate remains blocked.",
        "",
        "## Still Hypothesis",
        "",
        "- The recommended forward-test trio is a planning shortcut, not test evidence.",
        "- A fresh Codex context may still expose trigger, installation, or answer-quality issues.",
        "- Passing static checks does not prove NWN runtime behavior.",
    ])

    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--out", default="docs/nwn-skill-pack/rc-blocker-burndown.md")
    args = parser.parse_args()

    output = generate(Path(args.root))
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(output, encoding="utf-8")
    print(out_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
