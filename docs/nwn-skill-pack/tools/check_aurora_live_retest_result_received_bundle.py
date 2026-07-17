#!/usr/bin/env python3
"""Smoke-test an Aurora live retest operator bundle as a received result inbox."""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType
from typing import Any


DEFAULT_BUNDLE = Path(".codex-tmp/aurora-live-retest-operator-bundle/current")
DEFAULT_RECEIVED = Path(".codex-tmp/aurora-live-retest-result-received/current")
SUMMARY_NAME = "RECEIVED-RETEST-RESULT-SUMMARY.json"
SYNTHETIC_RESULT_ID = "alrr-synthetic-received-retest-result"
SYNTHETIC_ATOM = "toolset.buildAndClientRun"
REAL_RESULT_RECORD_DIR = Path("knowledge-inbox/aurora-live-retest-results/records")
REAL_RESULT_AGGREGATE = Path("knowledge-inbox/aurora-live-retest-results/aggregate.md")


@dataclass
class ReceivedRetestResultCheck:
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


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def iter_files(root: Path) -> list[Path]:
    return sorted(path for path in root.rglob("*") if path.is_file())


def rel(path: Path, root: Path) -> str:
    return str(path.relative_to(root)).replace("\\", "/")


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


def run_command(command: list[str], cwd: Path) -> str:
    completed = subprocess.run(
        command,
        cwd=str(cwd),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    output = completed.stdout.strip()
    if completed.returncode != 0:
        raise RuntimeError("command failed: " + " ".join(command) + "\n" + output)
    return output


def real_paths_containing(root: Path, token: str) -> list[str]:
    hits: list[str] = []
    candidates: list[Path] = []
    real_records = root / REAL_RESULT_RECORD_DIR
    if real_records.exists():
        candidates.extend(sorted(real_records.glob("*.json")))
    real_aggregate = root / REAL_RESULT_AGGREGATE
    if real_aggregate.exists():
        candidates.append(real_aggregate)
    for path in candidates:
        try:
            if token in path.read_text(encoding="utf-8"):
                hits.append(rel(path, root))
        except UnicodeDecodeError:
            continue
    return hits


def add_nested_result(result: ReceivedRetestResultCheck, prefix: str, nested: Any) -> None:
    for check in getattr(nested, "checks", []):
        result.ok(f"{prefix}: {check}")
    for error in getattr(nested, "errors", []):
        result.error(f"{prefix}: {error}")


def create_scratch_blocked_result(root: Path, inbox: Path, records_dir: Path) -> Path:
    output = run_command(
        [
            sys.executable,
            str(root / "tools" / "aurora_live_retest_result_record.py"),
            "new",
            "--out",
            str(records_dir),
            "--id",
            SYNTHETIC_RESULT_ID,
            "--source-dispatch-path",
            rel(inbox / "aurora-live-retest-dispatch.md", root),
            "--dispatch-manifest-path",
            rel(inbox / "RETEST-OPERATOR-BUNDLE-MANIFEST.json", root),
            "--source-review-outcome-id",
            "alro-synthetic-received-retest-result",
            "--source-review-outcome-path",
            "knowledge-inbox/aurora-live-review-outcomes/records/alro-synthetic-received-retest-result.json",
            "--live-record-id",
            "aurora-live-synthetic-received-retest-result",
            "--live-record-path",
            "knowledge-inbox/aurora-live-records/aurora-live-synthetic-received-retest-result.json",
            "--evidence-manifest-path",
            "knowledge-inbox/aurora-live-evidence-manifests/aurora-live-synthetic-received-retest-result.json",
            "--target-atom",
            SYNTHETIC_ATOM,
            "--requested-next-action",
            "Repeat only the smallest missing Aurora live runtime atom.",
            "--operator",
            "synthetic-received-retest-result",
            "--toolset-version",
            "synthetic Toolset",
            "--nwn-ee-version",
            "synthetic NWN EE",
            "--environment-summary",
            "Scratch received-result checker; no Aurora or NWN runtime was executed.",
            "--result",
            "blocked",
            "--decision-summary",
            "Synthetic received-result smoke reports an exact blocker, not a pass.",
            "--blocked-atom",
            SYNTHETIC_ATOM,
            "--check-run",
            "check_aurora_live_retest_result_template.py",
            "--check-run",
            "check_aurora_live_retest_result_records.py",
            "--privacy-summary",
            "Scratch record contains no real module, player, account, token, or IP data.",
            "--dispatch-check",
            "--result-template-check",
            "--records-check",
            "--evidence-manifest-check",
            "--intake-consistency-check",
            "--redaction-policy-check",
            "--visual-redaction-check",
            "--verification-notes",
            "Synthetic received-bundle smoke only.",
            "--next-action",
            "Collect a real operator return before any promotion decision.",
            "--non-proof-boundary",
            "Received retest result bundle smoke proves local intake mechanics only.",
            "--non-proof-boundary",
            "It does not prove screenshot truth, log truth, NWN runtime behavior, privacy safety, release readiness, or automatic skill improvement.",
            "--notes",
            "Generated by check_aurora_live_retest_result_received_bundle.py under .codex-tmp only.",
        ],
        cwd=root,
    )
    path = Path(output.splitlines()[-1])
    if not path.is_absolute():
        path = root / path
    return path


def run(
    root: Path,
    bundle_relative: Path = DEFAULT_BUNDLE,
    received_relative: Path = DEFAULT_RECEIVED,
) -> ReceivedRetestResultCheck:
    result = ReceivedRetestResultCheck()
    root = root.resolve()
    bundle_root = root / bundle_relative
    received_root = root / received_relative

    try:
        if not bundle_root.is_dir():
            result.error(f"source retest operator bundle is missing: {bundle_relative}")
            return result
        if not in_tmp(root, bundle_root):
            result.error(f"source retest operator bundle is outside .codex-tmp: {bundle_relative}")
            return result
        if not in_tmp(root, received_root):
            result.error(f"received retest result root is outside .codex-tmp: {received_root}")
            return result
        if received_root.exists():
            shutil.rmtree(received_root)

        inbox = received_root / "inbox"
        records_dir = received_root / "records"
        inbox.mkdir(parents=True, exist_ok=True)
        records_dir.mkdir(parents=True, exist_ok=True)

        operator_checker = load_module(
            root / "tools" / "check_aurora_live_retest_operator_bundle.py",
            "check_aurora_live_retest_operator_bundle_received_result",
        )
        builder = load_module(
            root / "tools" / "build_aurora_live_retest_operator_bundle.py",
            "build_aurora_live_retest_operator_bundle_received_result",
        )
        record_tool = load_module(
            root / "tools" / "aurora_live_retest_result_record.py",
            "aurora_live_retest_result_record_received_result",
        )
        nested = operator_checker.run(root, bundle_relative)
        add_nested_result(result, "source retest operator bundle check", nested)

        expected_files = {
            builder.DISPATCH.name,
            builder.RESULT_TEMPLATE.name,
            str(builder.SHA256SUMS).replace("\\", "/"),
            str(builder.BUNDLE_MANIFEST).replace("\\", "/"),
        }
        source_files = {rel(path, bundle_root) for path in iter_files(bundle_root)}
        if source_files == expected_files:
            result.ok("source retest operator bundle has exact expected file set")
        else:
            result.error(
                "source retest operator bundle file set differs; "
                f"expected {sorted(expected_files)}, got {sorted(source_files)}"
            )

        for path in iter_files(bundle_root):
            target = inbox / path.relative_to(bundle_root)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target)
        result.ok(f"copied retest operator bundle into received inbox: {inbox}")

        inbox_files = {rel(path, inbox) for path in iter_files(inbox)}
        if inbox_files == expected_files:
            result.ok("received retest result inbox has exact expected file set")
        else:
            result.error(
                "received retest result inbox file set differs; "
                f"expected {sorted(expected_files)}, got {sorted(inbox_files)}"
            )

        manifest = load_json(inbox / builder.BUNDLE_MANIFEST)
        if manifest.get("schema_version") == "1":
            result.ok("received retest operator bundle manifest schema_version is 1")
        else:
            result.error("received retest operator bundle manifest schema_version must be 1")
        if manifest.get("bundle_type") == "aurora-live-retest-operator":
            result.ok("received retest operator bundle manifest bundle_type is aurora-live-retest-operator")
        else:
            result.error("received retest operator bundle manifest bundle_type must be aurora-live-retest-operator")

        sums = parse_sha256sums(inbox / builder.SHA256SUMS)
        for filename, digest in sums.items():
            source_file = bundle_root / filename
            received_file = inbox / filename
            if source_file.exists() and received_file.exists() and sha256(source_file) == sha256(received_file) == digest:
                result.ok(f"received retest file hash matches source and SHA256SUMS: {filename}")
            else:
                result.error(f"received retest file hash mismatch: {filename}")

        template_text = (inbox / builder.RESULT_TEMPLATE.name).read_text(encoding="utf-8")
        dispatch_text = (inbox / builder.DISPATCH.name).read_text(encoding="utf-8")
        for token in [
            "Retest result: `pass`, `partial`, `fail`, or `blocked`",
            "privacy confirmation",
            "not skill knowledge",
            "not runtime proof",
            "automatic skill improvement",
        ]:
            combined = template_text + "\n" + dispatch_text
            if token in combined:
                result.ok(f"received retest inbox preserves boundary token: {token}")
            else:
                result.error(f"received retest inbox missing boundary token: {token}")

        blocked_record_path = create_scratch_blocked_result(root, inbox, records_dir)
        if not in_tmp(root, blocked_record_path):
            result.error(f"scratch retest result record escaped .codex-tmp: {blocked_record_path}")
        else:
            result.ok(f"created scratch blocked retest result record: {blocked_record_path}")

        blocked_errors = record_tool.validate_record(load_json(blocked_record_path))
        if blocked_errors:
            result.error("scratch blocked retest result record should validate: " + "; ".join(blocked_errors))
        else:
            result.ok("scratch blocked retest result record validates")

        aggregate_path = received_root / "aggregate.md"
        run_command(
            [
                sys.executable,
                str(root / "tools" / "aurora_live_retest_result_record.py"),
                "aggregate",
                str(records_dir),
                "--out",
                str(aggregate_path),
            ],
            cwd=root,
        )
        aggregate_text = aggregate_path.read_text(encoding="utf-8")
        for token in [
            "Aurora Live Retest Result Records Aggregate",
            "`blocked`: 1",
            SYNTHETIC_ATOM,
            "automatic skill improvement",
        ]:
            if token in aggregate_text:
                result.ok(f"scratch received retest aggregate includes {token}")
            else:
                result.error(f"scratch received retest aggregate missing {token}")

        run_command(
            [
                sys.executable,
                str(root / "tools" / "aurora_live_retest_result_record.py"),
                "validate",
                str(records_dir),
            ],
            cwd=root,
        )
        result.ok("scratch received retest result records validate through CLI")

        run_command(
            [
                sys.executable,
                str(root / "tools" / "check_aurora_live_retest_result_records.py"),
                str(root),
            ],
            cwd=root,
        )
        result.ok("real retest result records checker still passes without scratch promotion")

        real_hits = real_paths_containing(root, SYNTHETIC_RESULT_ID)
        if real_hits:
            result.error("synthetic received retest result id leaked into real records: " + ", ".join(real_hits))
        else:
            result.ok("synthetic received retest result id did not leak into real records or aggregate")

        summary = {
            "schema_version": "1",
            "source_bundle": rel(bundle_root, root),
            "received_root": rel(received_root, root),
            "inbox": rel(inbox, root),
            "scratch_records": rel(records_dir, root),
            "scratch_aggregate": rel(aggregate_path, root),
            "scratch_record_id": SYNTHETIC_RESULT_ID,
            "checks": result.checks,
            "errors": result.errors,
            "verified_boundary": (
                "This received-result smoke proves only that the repo-local retest operator bundle can be copied "
                "into a scratch inbox, preserve hashes and boundaries, and produce a validated scratch retest "
                "result record without promoting it into real records."
            ),
            "not_proven": [
                "outside delivery",
                "operator completion",
                "screenshot truth",
                "log truth",
                "NWN runtime behavior",
                "privacy safety",
                "release readiness",
                "automatic skill improvement",
            ],
        }
        (received_root / SUMMARY_NAME).write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
        result.ok(f"received retest result summary written: {received_root / SUMMARY_NAME}")
    except Exception as exc:
        result.error(str(exc))

    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--bundle", default=str(DEFAULT_BUNDLE))
    parser.add_argument("--received", default=str(DEFAULT_RECEIVED))
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    result = run(Path(args.root), Path(args.bundle), Path(args.received))
    if args.json:
        print(json.dumps({"checks": result.checks, "errors": result.errors}, indent=2))
    else:
        for check in result.checks:
            print(f"OK: {check}")
        for error in result.errors:
            print(f"ERROR: {error}")
        if result.errors:
            print(f"Aurora live retest result received bundle check failed: {len(result.errors)} error(s)")
        else:
            print("Aurora live retest result received bundle check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
