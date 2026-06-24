#!/usr/bin/env python3
"""Smoke-test contribution bundle creation and verification roundtrip."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class RoundtripCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def run_command(args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, *args],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )


def require_success(result: RoundtripCheck, label: str, completed: subprocess.CompletedProcess[str]) -> bool:
    if completed.returncode == 0:
        result.ok(f"{label} succeeded")
        return True
    result.error(f"{label} failed with exit {completed.returncode}: {completed.stdout.strip()}")
    return False


def load_manifest(path: Path) -> dict[str, object]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def run(root: Path) -> RoundtripCheck:
    result = RoundtripCheck()
    tool = root / "tools" / "nwn_skill_feedback.py"
    if not tool.exists():
        result.error(f"feedback CLI is missing: {tool}")
        return result

    work_dir = root / ".codex-tmp" / "contribution-bundle-roundtrip"
    if work_dir.exists():
        shutil.rmtree(work_dir)
    incoming = work_dir / "incoming"
    bundle = work_dir / "bundle"
    incoming.mkdir(parents=True, exist_ok=True)

    new_record = run_command([
        str(tool),
        "new",
        "--out",
        str(incoming),
        "--domain",
        "nui",
        "--title",
        "Roundtrip bundle smoke test",
        "--summary",
        "Fixture record used to prove bundle creation and verification behavior.",
        "--source-type",
        "codex-session",
        "--status",
        "unverified",
        "--nwn-version",
        "NWN:EE fixture",
        "--server-context",
        "Local non-runtime fixture created by check_contribution_bundle_roundtrip.py.",
        "--evidence",
        "Synthetic fixture evidence; not a domain claim.",
        "--proposed-file",
        "references/nui-player-ui.md",
        "--proposed-summary",
        "No promotion; fixture exists only for bundle roundtrip smoke testing.",
        "--notes",
        "Generated under .codex-tmp and not intended for promotion.",
    ])
    if not require_success(result, "create fixture feedback record", new_record):
        return result

    validate = run_command([str(tool), "validate", str(incoming)])
    if not require_success(result, "validate fixture incoming records", validate):
        return result

    make_bundle = run_command([
        str(tool),
        "bundle",
        str(incoming),
        "--out",
        str(bundle),
        "--bundle-id",
        "roundtrip-smoke",
        "--force",
        "--fail-on-risky",
    ])
    if not require_success(result, "build contribution bundle", make_bundle):
        return result

    verify = run_command([str(tool), "verify-bundle", str(bundle), "--fail-on-risky"])
    if not require_success(result, "verify clean contribution bundle", verify):
        return result

    try:
        manifest = load_manifest(bundle / "manifest.json")
        records = manifest.get("records")
        if not isinstance(records, list) or not records:
            result.error("roundtrip bundle manifest has no records")
            return result
        first = records[0]
        if not isinstance(first, dict) or not first.get("bundle_path"):
            result.error("roundtrip bundle manifest first record has no bundle_path")
            return result
        record_path = bundle / str(first["bundle_path"])
        record_path.write_text(record_path.read_text(encoding="utf-8") + "\n", encoding="utf-8")
    except Exception as exc:
        result.error(f"could not tamper roundtrip bundle record: {exc}")
        return result

    tampered_verify = run_command([str(tool), "verify-bundle", str(bundle)])
    if tampered_verify.returncode == 0:
        result.error("verify-bundle unexpectedly passed after record hash tamper")
    elif "sha256 mismatch" not in tampered_verify.stdout:
        result.error(f"verify-bundle failed after tamper but did not report sha256 mismatch: {tampered_verify.stdout.strip()}")
    else:
        result.ok("verify-bundle rejects tampered bundle record hash")

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
            print(f"Contribution bundle roundtrip check failed: {len(result.errors)} error(s)")
        else:
            print("Contribution bundle roundtrip check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
