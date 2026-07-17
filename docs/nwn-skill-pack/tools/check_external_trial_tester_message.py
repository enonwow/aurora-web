#!/usr/bin/env python3
"""Check the generated EXT-001 tester message."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType


TESTER_MESSAGE = Path("knowledge-inbox/external-trials/ext-001-tester-message.md")

REQUIRED_TOKENS = {
    "External Contributor Trial Tester Message EXT-001",
    "Copy This Message",
    "no-coaching usability trial",
    "START-HERE.md",
    "knowledge-inbox/external-contributor-trial-packet.md",
    "new",
    "validate",
    "bundle",
    "verify-bundle",
    "user-feedback-form.md",
    "command transcript",
    "friction list",
    "private-data confirmation",
    "pass",
    "partial",
    "fail",
    "SHA-256",
    "does not self-update",
    "not NWN runtime proof",
    "not release-candidate evidence",
    "untrusted until maintainer review",
    "check_external_trial_cleanroom.py",
    "build_external_trial_dispatch_bundle.py",
    "check_external_trial_dispatch_bundle.py",
    "check_external_trial_received_dispatch.py",
    ".codex-tmp/external-trial-dispatch/ext-001/",
    "--cleanroom-check",
    "--independent-tester",
}

FORBIDDEN_TOKENS = {
    "reviewer-matrix.json",
    "reviewer-packet.md",
    "expected_reference",
    "expected references file",
    "rc-blocker-burndown.md",
    "release-readiness.md",
}


@dataclass
class TesterMessageCheck:
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


def load_json(path: Path) -> dict[str, object]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain an object")
    return data


def run(root: Path) -> TesterMessageCheck:
    result = TesterMessageCheck()
    message_path = root / TESTER_MESSAGE
    if not message_path.exists():
        result.error(f"{TESTER_MESSAGE} is missing")
        return result

    text = message_path.read_text(encoding="utf-8")
    missing = [token for token in sorted(REQUIRED_TOKENS) if token not in text]
    if missing:
        result.error(f"{TESTER_MESSAGE} missing tokens: {', '.join(missing)}")
    else:
        result.ok("tester message includes required workflow and boundary tokens")

    forbidden = [token for token in sorted(FORBIDDEN_TOKENS) if token in text]
    if forbidden:
        result.error(f"{TESTER_MESSAGE} includes forbidden reviewer-only tokens: {', '.join(forbidden)}")
    else:
        result.ok("tester message avoids reviewer-only tokens")

    try:
        generator = load_module(root / "tools" / "generate_external_trial_tester_message.py", "generate_external_trial_tester_message_check")
        expected = generator.render(root, "EXT-001")
    except Exception as exc:
        result.error(f"cannot render expected tester message: {exc}")
        return result

    if text != expected:
        result.error(f"{TESTER_MESSAGE} is stale; regenerate with tools/generate_external_trial_tester_message.py")
    else:
        result.ok("tester message matches generator output")

    try:
        packet_manifest = load_json(root / ".codex-tmp" / "external-trial-public-packet" / "ext-001" / "PUBLIC-PACKET-MANIFEST.json")
        archive_value = packet_manifest.get("archive")
        if not isinstance(archive_value, str) or not archive_value:
            result.error("public packet manifest archive path is missing")
            return result
        archive = Path(archive_value)
        if not archive.is_absolute():
            archive = root / archive
        archive_hash = generator.sha256(archive)
    except Exception as exc:
        result.error(f"cannot verify tester message archive hash: {exc}")
        return result

    if archive_hash in text:
        result.ok("tester message includes current ZIP SHA-256")
    else:
        result.error("tester message does not include current ZIP SHA-256")

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
            print(f"External trial tester message check failed: {len(result.errors)} error(s)")
        else:
            print("External trial tester message check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
