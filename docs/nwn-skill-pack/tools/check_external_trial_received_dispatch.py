#!/usr/bin/env python3
"""Smoke-test an external trial dispatch bundle as a received-only artifact."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


DEFAULT_DISPATCH = Path(".codex-tmp/external-trial-dispatch/ext-001")
DEFAULT_RECEIVED_ROOT = Path(".codex-tmp/external-trial-received-dispatch/ext-001")
SUMMARY_NAME = "RECEIVED-DISPATCH-SUMMARY.json"
EXPECTED_DISPATCH_FILES = {
    "ext-001.zip",
    "ext-001-tester-message.md",
    "SHA256SUMS.txt",
    "DISPATCH-MANIFEST.json",
}
REQUIRED_EXTRACTED_FILES = {
    "START-HERE.md",
    "PUBLIC-PACKET-MANIFEST.json",
    "tools/nwn_skill_feedback.py",
    "knowledge-inbox/external-contributor-trial-packet.md",
    "knowledge-inbox/contributor-intake-quickstart.md",
    "knowledge-inbox/contribution-bundle-format.md",
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
class ReceivedDispatchCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain an object")
    return data


def iter_files(root: Path) -> list[Path]:
    return sorted(path for path in root.rglob("*") if path.is_file())


def in_tmp(root: Path, path: Path) -> bool:
    tmp_root = (root / ".codex-tmp").resolve()
    resolved = path.resolve()
    return resolved == tmp_root or tmp_root in resolved.parents


def parse_sha256sums(path: Path) -> dict[str, str]:
    entries: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        parts = line.split()
        if len(parts) != 2:
            raise ValueError(f"invalid SHA256SUMS line: {line!r}")
        digest, filename = parts
        entries[filename] = digest
    return entries


def safe_zip_names(names: list[str]) -> list[str]:
    return [
        name
        for name in names
        if Path(name).is_absolute() or ".." in Path(name).parts
    ]


def run_command(
    result: ReceivedDispatchCheck,
    label: str,
    command: list[str],
    cwd: Path,
    required_tokens: list[str],
) -> str:
    completed = subprocess.run(
        command,
        cwd=cwd,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    output = completed.stdout
    if completed.returncode != 0:
        result.error(f"{label} failed with exit {completed.returncode}: {output.strip()}")
        return output
    missing = [token for token in required_tokens if token not in output]
    if missing:
        result.error(f"{label} output missing tokens: {', '.join(missing)}")
    else:
        result.ok(f"{label} passed")
    return output


def run_received_cli_smoke(
    result: ReceivedDispatchCheck,
    root: Path,
    received_packet: Path,
    smoke_root: Path,
) -> None:
    script = received_packet / "tools" / "nwn_skill_feedback.py"
    if not script.exists():
        result.error("received ZIP CLI script is missing: tools/nwn_skill_feedback.py")
        return

    help_smokes = [
        (["--help"], ["new", "validate", "bundle", "verify-bundle"]),
        (["new", "--help"], ["--domain", "--source-type", "--proposed-file"]),
        (["validate", "--help"], ["paths"]),
        (["bundle", "--help"], ["--bundle-id", "--fail-on-risky"]),
        (["verify-bundle", "--help"], ["--fail-on-risky", "bundle"]),
    ]
    for args, required_tokens in help_smokes:
        label = " ".join(["received nwn_skill_feedback.py", *args])
        run_command(
            result,
            label,
            [sys.executable, str(script.resolve()), *args],
            received_packet,
            required_tokens,
        )

    if not in_tmp(root, smoke_root):
        result.error(f"received dispatch smoke root is outside .codex-tmp: {smoke_root}")
        return
    if smoke_root.exists():
        shutil.rmtree(smoke_root)
    smoke_root.mkdir(parents=True, exist_ok=True)

    records_dir = smoke_root / "feedback-records"
    bundle_dir = smoke_root / "bundle"
    run_command(
        result,
        "received ZIP command path: new",
        [
            sys.executable,
            str(script.resolve()),
            "new",
            "--out",
            str(records_dir.resolve()),
            "--domain",
            "nui",
            "--title",
            "EXT-001 received dispatch smoke NUI note",
            "--summary",
            "Synthetic checker record proving the received dispatch ZIP CLI can create a feedback record.",
            "--source-type",
            "docs-research",
            "--status",
            "unverified",
            "--nwn-version",
            "NWN EE synthetic",
            "--server-context",
            "received dispatch smoke only",
            "--evidence",
            "Synthetic checker evidence; no target module was executed.",
            "--runtime-steps",
            "No game run; this is a local received-dispatch smoke.",
            "--failure-mode",
            "If this command fails, the dispatch bundle is not usable from received files only.",
            "--proposed-file",
            "draft-skills/nwn-server-gamedev/references/nui-player-ui.md",
            "--proposed-summary",
            "No promotion; smoke only.",
            "--notes",
            "Generated by check_external_trial_received_dispatch.py in scratch storage.",
        ],
        received_packet,
        [".json"],
    )
    if not records_dir.is_dir() or not list(records_dir.glob("*.json")):
        result.error("received ZIP command path did not create a feedback JSON record")
    else:
        result.ok("received ZIP command path created a feedback JSON record")

    run_command(
        result,
        "received ZIP command path: validate",
        [
            sys.executable,
            str(script.resolve()),
            "validate",
            str(records_dir.resolve()),
        ],
        received_packet,
        ["OK"],
    )
    run_command(
        result,
        "received ZIP command path: bundle",
        [
            sys.executable,
            str(script.resolve()),
            "bundle",
            str(records_dir.resolve()),
            "--out",
            str(bundle_dir.resolve()),
            "--bundle-id",
            "ext-001-received-dispatch-smoke",
            "--force",
            "--fail-on-risky",
        ],
        received_packet,
        [str(bundle_dir.resolve())],
    )
    if (bundle_dir / "manifest.json").exists() and (bundle_dir / "SUMMARY.md").exists():
        result.ok("received ZIP command path created bundle manifest and summary")
    else:
        result.error("received ZIP command path did not create bundle manifest and summary")

    run_command(
        result,
        "received ZIP command path: verify-bundle",
        [
            sys.executable,
            str(script.resolve()),
            "verify-bundle",
            str(bundle_dir.resolve()),
            "--fail-on-risky",
        ],
        received_packet,
        ["OK: manifest schema_version is 1", "Contribution bundle verification passed"],
    )


def run(
    root: Path,
    dispatch_relative: Path = DEFAULT_DISPATCH,
    received_relative: Path = DEFAULT_RECEIVED_ROOT,
) -> ReceivedDispatchCheck:
    result = ReceivedDispatchCheck()
    dispatch_root = dispatch_relative if dispatch_relative.is_absolute() else root / dispatch_relative
    if not dispatch_root.is_dir():
        result.error(f"dispatch bundle root is missing: {dispatch_relative}")
        return result

    received_root = root / received_relative
    if not in_tmp(root, received_root):
        result.error(f"received dispatch root is outside .codex-tmp: {received_root}")
        return result
    if received_root.exists():
        shutil.rmtree(received_root)
    received_root.mkdir(parents=True, exist_ok=True)
    inbox = received_root / "inbox"
    inbox.mkdir(parents=True, exist_ok=True)

    actual_dispatch_files = {
        str(path.relative_to(dispatch_root)).replace("\\", "/")
        for path in iter_files(dispatch_root)
    }
    if actual_dispatch_files == EXPECTED_DISPATCH_FILES:
        result.ok("source dispatch has exact expected file set")
    else:
        result.error(
            "source dispatch file set differs; "
            f"expected {sorted(EXPECTED_DISPATCH_FILES)}, got {sorted(actual_dispatch_files)}"
        )

    for relative in sorted(EXPECTED_DISPATCH_FILES & actual_dispatch_files):
        target = inbox / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(dispatch_root / relative, target)
    result.ok(f"copied dispatch files into received inbox: {inbox}")

    inbox_files = {
        str(path.relative_to(inbox)).replace("\\", "/")
        for path in iter_files(inbox)
    }
    if inbox_files == EXPECTED_DISPATCH_FILES:
        result.ok("received inbox has exact expected dispatch file set")
    else:
        result.error(
            "received inbox file set differs; "
            f"expected {sorted(EXPECTED_DISPATCH_FILES)}, got {sorted(inbox_files)}"
        )

    manifest_path = inbox / "DISPATCH-MANIFEST.json"
    sums_path = inbox / "SHA256SUMS.txt"
    zip_path = inbox / "ext-001.zip"
    message_path = inbox / "ext-001-tester-message.md"

    try:
        manifest = load_json(manifest_path)
        result.ok("received dispatch manifest parses")
    except Exception as exc:
        result.error(f"received dispatch manifest is invalid: {exc}")
        manifest = {}

    if manifest.get("schema_version") == "1":
        result.ok("received dispatch manifest schema_version is 1")
    else:
        result.error("received dispatch manifest schema_version must be 1")
    if manifest.get("trial_id") == "EXT-001":
        result.ok("received dispatch manifest trial_id is EXT-001")
    else:
        result.error("received dispatch manifest trial_id must be EXT-001")

    try:
        sums = parse_sha256sums(sums_path)
        result.ok("received SHA256SUMS.txt parses")
    except Exception as exc:
        result.error(f"received SHA256SUMS.txt is invalid: {exc}")
        sums = {}
    if set(sums) == {"ext-001.zip", "ext-001-tester-message.md"}:
        result.ok("received SHA256SUMS covers exactly ZIP and tester message")
    else:
        result.error("received SHA256SUMS must cover exactly ZIP and tester message")

    for filename in ["ext-001.zip", "ext-001-tester-message.md"]:
        path = inbox / filename
        if not path.exists():
            result.error(f"received dispatch file is missing: {filename}")
            continue
        digest = sha256(path)
        if sums.get(filename) == digest:
            result.ok(f"received hash matches SHA256SUMS: {filename}")
        else:
            result.error(f"received hash mismatch for {filename}")

    if message_path.exists():
        message = message_path.read_text(encoding="utf-8")
        zip_hash = sha256(zip_path) if zip_path.exists() else ""
        required_tokens = [
            "External Contributor Trial Tester Message EXT-001",
            "START-HERE.md",
            "knowledge-inbox/external-contributor-trial-packet.md",
            "no-coaching usability trial",
            "private-data confirmation",
            "does not self-update",
            "not NWN runtime proof",
            "not release-candidate evidence",
            "untrusted until maintainer review",
        ]
        missing = [token for token in required_tokens if token not in message]
        if missing:
            result.error(f"received tester message missing tokens: {', '.join(missing)}")
        else:
            result.ok("received tester message includes required user-facing boundary tokens")
        if zip_hash and zip_hash in message:
            result.ok("received tester message names the received ZIP SHA-256")
        else:
            result.error("received tester message does not name the received ZIP SHA-256")
        forbidden = [token for token in sorted(FORBIDDEN_TOKENS) if token in message]
        if forbidden:
            result.error(f"received tester message includes forbidden reviewer-only tokens: {', '.join(forbidden)}")
        else:
            result.ok("received tester message avoids reviewer-only tokens")

    not_proven = manifest.get("not_proven")
    required_boundaries = {
        "outside delivery",
        "tester independence",
        "private-data safety",
        "feedback truth",
        "NWN runtime behavior",
        "automatic skill improvement",
    }
    if isinstance(not_proven, list) and required_boundaries <= set(not_proven):
        result.ok("received dispatch manifest preserves not-proven boundaries")
    else:
        result.error("received dispatch manifest missing required not-proven boundaries")

    received_packet = received_root / "received"
    if not zip_path.exists():
        result.error("received ZIP is missing")
    else:
        try:
            with zipfile.ZipFile(zip_path, "r") as handle:
                names = [name for name in handle.namelist() if not name.endswith("/")]
                unsafe = safe_zip_names(names)
                if unsafe:
                    result.error(f"received ZIP has unsafe paths: {', '.join(unsafe)}")
                else:
                    handle.extractall(received_packet)
                    result.ok(f"received ZIP extracted to: {received_packet}")
        except zipfile.BadZipFile as exc:
            result.error(f"received ZIP is invalid: {exc}")

    if received_packet.exists():
        extracted_files = {
            str(path.relative_to(received_packet)).replace("\\", "/")
            for path in iter_files(received_packet)
        }
        missing_extracted = sorted(REQUIRED_EXTRACTED_FILES - extracted_files)
        if missing_extracted:
            result.error(f"received ZIP missing required tester-facing files: {', '.join(missing_extracted)}")
        else:
            result.ok("received ZIP includes required tester-facing files")
        run_received_cli_smoke(
            result,
            root,
            received_packet,
            received_root / "cli-smoke",
        )

    summary = {
        "schema_version": "1",
        "trial_id": manifest.get("trial_id", "EXT-001"),
        "source_dispatch": str(dispatch_root),
        "received_root": str(received_root.relative_to(root)).replace("\\", "/"),
        "inbox": str(inbox.relative_to(root)).replace("\\", "/"),
        "received_packet": str(received_packet.relative_to(root)).replace("\\", "/"),
        "checks": result.checks,
        "errors": result.errors,
        "verified_boundary": (
            "Local received-dispatch smoke proves only that the send-ready folder can be copied into a scratch "
            "inbox, its ZIP and tester message hashes match, and the extracted ZIP can run a synthetic feedback "
            "command path without reading repo sources."
        ),
        "not_proven": [
            "outside delivery",
            "tester independence",
            "tester comprehension",
            "real contributor completion",
            "private-data safety",
            "feedback truth",
            "NWN runtime behavior",
            "release-candidate readiness",
            "automatic skill improvement",
        ],
    }
    (received_root / SUMMARY_NAME).write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    result.ok(f"received dispatch summary written: {received_root / SUMMARY_NAME}")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--dispatch", default=str(DEFAULT_DISPATCH))
    parser.add_argument("--received", default=str(DEFAULT_RECEIVED_ROOT))
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    result = run(Path(args.root), Path(args.dispatch), Path(args.received))
    if args.json:
        print(json.dumps({"checks": result.checks, "errors": result.errors}, indent=2))
    else:
        for check in result.checks:
            print(f"OK: {check}")
        for error in result.errors:
            print(f"ERROR: {error}")
        if result.errors:
            print(f"External trial received dispatch check failed: {len(result.errors)} error(s)")
        else:
            print("External trial received dispatch check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
