#!/usr/bin/env python3
"""Check that the minimum RC proof packet is fresh and preserves evidence boundaries."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType


REPORT = Path("forward-tests/minimum-rc-proof-packet.md")


@dataclass
class PacketCheck:
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


def load_manifest(root: Path) -> dict[str, object]:
    with (root / "version-manifest.json").open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError("version-manifest.json must contain a JSON object")
    return data


def run(root: Path) -> PacketCheck:
    result = PacketCheck()
    report_path = root / REPORT
    if not report_path.exists():
        result.error(f"{REPORT} is missing")
        return result

    generator = load_module(
        root / "tools" / "generate_minimum_rc_proof_packet.py",
        "generate_minimum_rc_proof_packet_check",
    )
    expected = generator.generate(root)
    actual = report_path.read_text(encoding="utf-8")
    if actual != expected:
        result.error("minimum-rc-proof-packet.md is stale; regenerate with tools/generate_minimum_rc_proof_packet.py")
    else:
        result.ok("minimum-rc-proof-packet.md matches current generated report")

    manifest = load_manifest(root)
    expected_metadata = f"Generated from package metadata last updated: {manifest.get('last_updated', '')}"
    if expected_metadata not in actual:
        result.error("minimum-rc-proof-packet.md does not match manifest last_updated metadata")
    else:
        result.ok("minimum-rc-proof-packet.md records current manifest last_updated metadata")

    required_tokens = {
        "Minimum Prompt-Forward Evidence",
        "fresh/no-leak",
        "build_forward_test_clean_session_prompts.py",
        "check_forward_test_clean_session_received_pack.py",
        ".codex-tmp/forward-test-clean-session-received/rc-minimum/inbox/prompts/ft-002-clean-session.md",
        ".codex-tmp/forward-test-clean-session-received/rc-minimum/inbox/prompts/ft-003-clean-session.md",
        ".codex-tmp/forward-test-clean-session-received/rc-minimum/inbox/prompts/ft-008-clean-session.md",
        ".codex-tmp/forward-test-clean-session-received/rc-minimum/RECEIVED-CLEAN-SESSION-SUMMARY.json",
        "FT-002",
        "FT-003",
        "FT-008",
        "forward-tests/prompts/ft-002-custom-spear-2da-hak-tlk.txt",
        "forward-tests/prompts/ft-003-nui-crafting-panel.txt",
        "forward-tests/prompts/ft-008-feedback-contribution.txt",
        "Recommended Full-Slice Probe",
        "FT-010",
        "full-slice-ft010",
        "forward-tests/prompts/ft-010-full-feature-server-slice.txt",
        ".codex-tmp/forward-test-clean-session-prompts/full-slice-ft010/prompts/ft-010-clean-session.md",
        "CUSTOM-CLEAN-SESSION-PROMPTS",
        "--test-id FT-010",
        "extra prompt-forward evidence",
        "filled capture sheet",
        "forward-tests/answer-capture-template.md",
        "forward-tests/reviewer-packet.md",
        "forward-tests/record-command-templates.md",
        "First Implementable Slice",
        "files/assets touched",
        "expected proof",
        "rollback",
        "evidence limits",
        "reviewer_assertions.first_implementable_slice=true",
        "--first-implementable-slice",
        "check_forward_test_evidence_policy.py",
        "check_release_gate.py docs\\nwn-skill-pack --target release-candidate",
        "Minimum Install-Smoke Evidence",
        "check_install_candidate.py",
        "check_isolated_install_layout.py",
        "check_install_smoke_packet.py",
        "check_install_smoke_playbook.py",
        "check_install_smoke_records.py",
        "install_verification",
        "preparation_only=false",
        "check_release_gate.py docs\\nwn-skill-pack --target install-candidate",
        "External Feedback Is Not A Substitute",
        "docs/nwn-skill-pack/.codex-tmp/external-trial-dispatch/ext-001/",
        "check_external_trial_received_dispatch.py",
        "external_trial_record.py",
        "Aurora Live Intake Is Optional Runtime Evidence",
        "aurora-live-first-session-command-sheet.md",
        "check_prepare_aurora_live_session.py",
        "check_aurora_live_status.py",
        "prepared-only route writes scaffold files without marking atoms observed",
        "Local Aurora reverse/thread leads",
        "local-aurora-reverse-ingestion.md",
        "local-thread-019ed62e-aurora-ui-gallery-intake.md",
        "local-aurora-live-gap-queue.md",
        "live-session planning inputs only",
        "not RC proof or NWN runtime proof",
        "Do not count the prepared-only smoke test as RC proof",
        "real returned record",
        "evidence manifest",
        "redacted artifacts",
        "maintainer review outcome",
        "Runtime Evidence Is Separate",
        "prepared-only Aurora scaffolds",
        "Toolset",
        "server",
        "logs",
        "module",
        "fewer than 3 accepted prompt-forward tests",
        "accepted install-smoke pass",
        "EXT-001",
        "isolated layout smoke",
        "prepared-only Aurora session scaffolds",
        "NWN runtime evidence",
        "Prepared-only Aurora smoke checks prove route mechanics, not Toolset truth.",
        "Still Hypothesis",
    }
    missing = sorted(token for token in required_tokens if token not in actual)
    if missing:
        result.error(f"minimum-rc-proof-packet.md missing tokens: {', '.join(missing)}")
    else:
        result.ok("minimum-rc-proof-packet.md includes required release-proof boundary tokens")

    forbidden_tokens = {
        "two-da-hak-tlk-pipeline.md",
        "nui-player-ui.md",
        "testing-runtime-qa.md",
        "economy-crafting-progression.md",
        "feedback-and-versioning.md",
    }
    leaked = sorted(token for token in forbidden_tokens if token in actual)
    if leaked:
        result.error(f"minimum-rc-proof-packet.md leaks reviewer-only reference tokens: {', '.join(leaked)}")
    else:
        result.ok("minimum-rc-proof-packet.md does not leak reviewer-only expected-reference filenames")

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
            print(f"Minimum RC proof packet check failed: {len(result.errors)} error(s)")
        else:
            print("Minimum RC proof packet check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
