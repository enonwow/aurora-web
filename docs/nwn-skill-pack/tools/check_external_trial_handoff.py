#!/usr/bin/env python3
"""Check the generated external contributor trial handoff."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType


HANDOFF = Path("knowledge-inbox/external-trials/ext-001-handoff.md")

REQUIRED_TOKENS = {
    "External Contributor Trial Handoff EXT-001",
    "knowledge-inbox/external-contributor-trial-packet.md",
    "knowledge-inbox/contributor-intake-quickstart.md",
    "knowledge-inbox/contribution-bundle-format.md",
    "knowledge-inbox/external-contributor-trial-result-template.md",
    "tools/nwn_skill_feedback.py",
    "tools/external_trial_record.py",
    "check_external_trial_handoff.py",
    "build_external_trial_public_packet.py",
    "check_external_trial_public_packet.py",
    "check_external_trial_cleanroom.py",
    "knowledge-inbox/external-trials/ext-001-tester-message.md",
    "generate_external_trial_tester_message.py",
    "check_external_trial_tester_message.py",
    "build_external_trial_dispatch_bundle.py",
    "check_external_trial_dispatch_bundle.py",
    "check_external_trial_received_dispatch.py",
    "ZIP SHA-256",
    ".codex-tmp/external-trial-public-packet/ext-001/",
    ".codex-tmp/external-trial-public-packet/ext-001.zip",
    ".codex-tmp/external-trial-dispatch/ext-001/",
    ".codex-tmp/external-trial-received-dispatch/ext-001/",
    "PUBLIC-PACKET-MANIFEST.json",
    "DISPATCH-MANIFEST.json",
    "SHA256SUMS.txt",
    "RECEIVED-DISPATCH-SUMMARY.json",
    "START-HERE.md",
    "external_trial_record.py new",
    "external_trial_record.py validate",
    "external_trial_record.py aggregate",
    "check_external_trial_records.py",
    "Trial Friction Feedback Candidate",
    "EXT-001 intake friction",
    "--domain ops",
    "--source-type maintainer-review",
    "--status unverified",
    "external trial record: docs\\nwn-skill-pack\\knowledge-inbox\\external-trials\\records\\<record-id>.json",
    "--proposed-file \"draft-skills/nwn-server-gamedev/references/feedback-and-versioning.md\"",
    "nwn_skill_feedback.py validate",
    "nwn_skill_feedback.py review",
    "needs-more-evidence",
    "does not update installed skill until reviewed and promoted",
    "command transcript",
    "private-data confirmation",
    "--independent-tester",
    "pass",
    "partial",
    "fail",
    "no-coaching",
    "not NWN runtime proof",
    "not release-candidate evidence",
    "not automatic skill improvement",
    "local smoke rather than an independent tester",
    "cleanroom checker proves only",
    "Still hypothesis",
}


@dataclass
class HandoffCheck:
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


def run(root: Path) -> HandoffCheck:
    result = HandoffCheck()
    path = root / HANDOFF
    if not path.exists():
        result.error(f"{HANDOFF} is missing")
        return result

    text = path.read_text(encoding="utf-8")
    missing = [token for token in sorted(REQUIRED_TOKENS) if token not in text]
    if missing:
        result.error(f"{HANDOFF} missing tokens: {', '.join(missing)}")
    else:
        result.ok("external trial handoff includes required workflow and boundary tokens")

    try:
        generator = load_module(root / "tools" / "generate_external_trial_handoff.py", "generate_external_trial_handoff_check")
        expected = generator.render(root, "EXT-001")
    except Exception as exc:
        result.error(f"cannot render expected handoff: {exc}")
        return result

    if text != expected:
        result.error(f"{HANDOFF} is stale; regenerate with tools/generate_external_trial_handoff.py")
    else:
        result.ok("external trial handoff matches generator output")

    try:
        manifest = json.loads((root / "version-manifest.json").read_text(encoding="utf-8"))
    except Exception as exc:
        result.error(f"cannot read version-manifest.json: {exc}")
        return result

    manifest_path = manifest.get("external_contributor_trial_handoff")
    if manifest_path != str(HANDOFF).replace("\\", "/"):
        result.error("version-manifest.json external_contributor_trial_handoff does not point to ext-001 handoff")
    else:
        result.ok("version manifest points to the external trial handoff")

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
            print(f"External trial handoff check failed: {len(result.errors)} error(s)")
        else:
            print("External trial handoff check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
