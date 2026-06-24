#!/usr/bin/env python3
"""Check that the install-smoke execution playbook matches current scaffolding."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


PLAYBOOK = Path("forward-tests/install-smoke-execution-playbook.md")
EXPECTED_REFS = [
    "nui-player-ui.md",
    "nwscript-events-systems.md",
    "testing-runtime-qa.md",
]


@dataclass
class InstallSmokePlaybookCheck:
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


def run(root: Path) -> InstallSmokePlaybookCheck:
    result = InstallSmokePlaybookCheck()
    playbook_path = root / PLAYBOOK
    if not playbook_path.exists():
        result.error(f"{PLAYBOOK} is missing")
        return result

    text = playbook_path.read_text(encoding="utf-8")
    manifest = load_json(root / "version-manifest.json")

    required_tokens = [
        "Boundary Rule",
        "Do not record `pass` from preparation commands alone.",
        "Phase 0: Refresh The Sandbox",
        "Phase 1: Choose The Test Environment",
        "Phase 2: Register Or Install",
        "Phase 3: Fresh Context Smoke Prompt",
        "Phase 4: Record The Result",
        "Phase 5: Recheck Gates",
        "codex plugin marketplace add",
        "INSTALL-001",
        "$nwn-server-gamedev",
        "forward_test_record.py",
        "install_verification",
        "--install-registered-or-installed",
        "--install-fresh-context",
        "--install-skill-visible",
        "--install-expected-references-routed",
        "--install-runtime-boundary-preserved",
        "run_repo_artifact_preflight.py",
        "check_install_candidate.py",
        "check_isolated_install_layout.py",
        "check_install_smoke_packet.py",
        "check_install_smoke_records.py",
        "check_release_gate.py",
        "--target release-candidate",
        "--target install-candidate",
        "--improvement-needed",
        "--improvement-summary",
        "nwn_skill_feedback.py new",
        "--domain deployment",
        "INSTALL-001 install-smoke gap",
        "--source-type maintainer-review",
        "--status unverified",
        "install-smoke record: docs\\nwn-skill-pack\\forward-tests\\records\\install-001-local-plugin-install-smoke.json",
        "--proposed-file \"draft-skills/nwn-server-gamedev/SKILL.md\"",
        "nwn_skill_feedback.py validate",
        "nwn_skill_feedback.py review",
        "needs-more-evidence",
        "does not update installed skill/plugin until reviewed and promoted",
        "not-run",
        "Verified",
        "Still Hypothesis",
    ]
    for token in required_tokens:
        if token not in text:
            result.error(f"{PLAYBOOK} missing token: {token}")

    if not result.errors:
        result.ok("playbook includes required boundary, install, record, and gate tokens")

    for key in [
        "install_candidate_check",
        "isolated_install_layout_check",
        "install_smoke_packet",
        "install_smoke_packet_check",
        "install_smoke_records_check",
        "release_gate",
    ]:
        if key == "release_gate":
            if isinstance(manifest.get(key), dict):
                result.ok("version manifest has release_gate object")
            else:
                result.error("version-manifest.json missing release_gate object")
            continue
        value = manifest.get(key)
        if not isinstance(value, str) or not value:
            result.error(f"version-manifest.json missing {key}")
            continue
        if value not in text:
            result.error(f"{PLAYBOOK} does not mention manifest artifact {key}: {value}")
        elif not (root / value).exists():
            result.error(f"manifest artifact does not exist for {key}: {value}")
        else:
            result.ok(f"playbook mentions existing manifest artifact: {key}")

    packet_path = root / str(manifest.get("install_smoke_packet", ""))
    if packet_path.exists():
        packet = packet_path.read_text(encoding="utf-8")
        for ref in EXPECTED_REFS:
            if ref not in text:
                result.error(f"{PLAYBOOK} does not mention expected reference: {ref}")
            elif ref not in packet:
                result.error(f"install-smoke packet does not mention expected reference: {ref}")
            else:
                result.ok(f"playbook and packet mention expected reference: {ref}")

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
            print(f"Install-smoke playbook check failed: {len(result.errors)} error(s)")
        else:
            print("Install-smoke playbook check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
