#!/usr/bin/env python3
"""Smoke-test Aurora live retest dispatch handoff without promoting synthetic records."""

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


SCRATCH = Path(".codex-tmp/aurora-live-retest-dispatch-roundtrip")
REAL_OUTCOME_RECORD_DIR = Path("knowledge-inbox/aurora-live-review-outcomes/records")
REAL_DISPATCH = Path("knowledge-inbox/aurora-live-retest-dispatch.md")
SYNTHETIC_ID = "alro-synthetic-retest-dispatch-roundtrip"
SYNTHETIC_LIVE_RECORD_ID = "aurora-live-synthetic-retest-dispatch-roundtrip"
SYNTHETIC_ATOM = "toolset.buildAndClientRun"


@dataclass
class RetestDispatchRoundtripCheck:
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


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def require_text(text: str, token: str, label: str) -> None:
    if token not in text:
        raise ValueError(f"{label} missing token: {token}")


def ensure_inside(root: Path, path: Path) -> None:
    root_resolved = root.resolve()
    path_resolved = path.resolve()
    if root_resolved != path_resolved and root_resolved not in path_resolved.parents:
        raise ValueError(f"path escapes package root: {path}")


def write_hold_outcome(path: Path) -> None:
    record = {
        "schema_version": "1",
        "id": SYNTHETIC_ID,
        "created_at": "2026-06-19T06:27:44+00:00",
        "live_record_id": SYNTHETIC_LIVE_RECORD_ID,
        "live_record_path": f"knowledge-inbox/aurora-live-records/{SYNTHETIC_LIVE_RECORD_ID}.json",
        "evidence_manifest_path": (
            "knowledge-inbox/aurora-live-evidence-manifests/"
            "aurora-live-evidence-manifest-synthetic-retest-dispatch-roundtrip.json"
        ),
        "reviewer": "synthetic-retest-dispatch-roundtrip",
        "outcome": "hold-for-retest",
        "decision_summary": "Synthetic roundtrip hold outcome; not real Aurora evidence.",
        "promotion_proposal_path": "",
        "reference_promotion_allowed": False,
        "accepted_atoms": [],
        "held_atoms": [SYNTHETIC_ATOM],
        "rejected_atoms": [],
        "blocked_atoms": [f"{SYNTHETIC_ATOM}: missing real client and server logs."],
        "visual_redaction_record_ids": [],
        "checks_run": ["check_aurora_live_records.py"],
        "checks_passed": ["check_aurora_live_records.py"],
        "privacy_findings": [],
        "schema_expansion_candidates": [],
        "next_actions": ["Repeat only build/client runtime evidence with real redacted logs."],
        "non_proof_boundaries": [
            "Synthetic retest dispatch roundtrip records do not prove Aurora Toolset or NWN runtime behavior."
        ],
        "notes": "Synthetic roundtrip fixture; keep under .codex-tmp only.",
    }
    write_json(path, record)


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
    real_records = root / REAL_OUTCOME_RECORD_DIR
    if real_records.exists():
        candidates.extend(sorted(real_records.glob("*.json")))
    real_dispatch = root / REAL_DISPATCH
    if real_dispatch.exists():
        candidates.append(real_dispatch)

    for path in candidates:
        try:
            if token in path.read_text(encoding="utf-8"):
                hits.append(str(path.relative_to(root)).replace("\\", "/"))
        except UnicodeDecodeError:
            continue
    return hits


def run(root: Path) -> RetestDispatchRoundtripCheck:
    result = RetestDispatchRoundtripCheck()
    root = root.resolve()
    try:
        scratch = root / SCRATCH
        ensure_inside(root, scratch)
        if scratch.exists():
            shutil.rmtree(scratch)
        outcome_dir = scratch / "review-outcomes" / "records"
        dispatch_dir = scratch / "dispatch"
        received_inbox = scratch / "received" / "inbox"
        dispatch_dir.mkdir(parents=True, exist_ok=True)
        received_inbox.mkdir(parents=True, exist_ok=True)

        outcome_path = outcome_dir / f"{SYNTHETIC_ID}.json"
        write_hold_outcome(outcome_path)
        result.ok("wrote synthetic hold-for-retest review outcome under .codex-tmp only")

        review_tool = root / "tools" / "aurora_live_review_outcome_record.py"
        run_command(
            [
                sys.executable,
                str(review_tool),
                "validate",
                str(outcome_path),
                "--root",
                str(root),
            ],
            cwd=root,
        )
        result.ok("synthetic hold-for-retest review outcome validates from scratch storage")

        generator = load_module(
            root / "tools" / "generate_aurora_live_retest_dispatch.py",
            "generate_aurora_live_retest_dispatch_roundtrip",
        )
        report = generator.render(root, outcome_dir)
        require_text(report, "Status: `retest-requests-ready`", "scratch retest dispatch")
        require_text(report, f"Retest 1: `{SYNTHETIC_ATOM}`", "scratch retest dispatch")
        require_text(report, "Operator Message", "scratch retest dispatch")
        require_text(report, "not skill knowledge", "scratch retest dispatch")
        require_text(report, "not runtime proof", "scratch retest dispatch")
        require_text(report, "Do not edit the skill references directly from this dispatch.", "scratch retest dispatch")
        result.ok("scratch dispatch renders focused operator message and non-promotion boundaries")

        dispatch_path = dispatch_dir / "aurora-live-retest-dispatch.md"
        dispatch_path.write_text(report, encoding="utf-8")
        manifest_path = dispatch_dir / "RETEST-DISPATCH-MANIFEST.json"
        manifest = {
            "schema_version": "1",
            "dispatch_type": "aurora-live-retest",
            "source": str(outcome_path.relative_to(root)).replace("\\", "/"),
            "files": ["aurora-live-retest-dispatch.md"],
            "sha256": {
                "aurora-live-retest-dispatch.md": sha256(dispatch_path),
            },
            "not_proven": [
                "outside delivery",
                "operator completion",
                "screenshot truth",
                "redaction truth",
                "NWN runtime behavior",
                "skill reference improvement",
            ],
            "synthetic_fixture": True,
        }
        write_json(manifest_path, manifest)
        result.ok("scratch dispatch manifest records hash and not-proven boundaries")

        for path in [dispatch_path, manifest_path]:
            target = received_inbox / path.name
            shutil.copy2(path, target)
        result.ok("copied retest dispatch into scratch received inbox")

        received_dispatch = received_inbox / dispatch_path.name
        received_manifest = received_inbox / manifest_path.name
        received_manifest_data = json.loads(received_manifest.read_text(encoding="utf-8"))
        expected_hash = received_manifest_data.get("sha256", {}).get(dispatch_path.name)
        if expected_hash != sha256(received_dispatch):
            raise ValueError("received retest dispatch hash does not match manifest")
        received_text = received_dispatch.read_text(encoding="utf-8")
        require_text(received_text, SYNTHETIC_ID, "received retest dispatch")
        require_text(received_text, SYNTHETIC_ATOM, "received retest dispatch")
        require_text(received_text, "private module, player, account, token, and IP data", "received retest dispatch")
        require_text(received_text, "not skill knowledge", "received retest dispatch")
        result.ok("received retest dispatch preserves hash, target atom, and privacy boundaries")

        run_command(
            [
                sys.executable,
                str(root / "tools" / "check_aurora_live_retest_dispatch.py"),
                str(root),
            ],
            cwd=root,
        )
        result.ok("real retest dispatch still passes freshness and fixture checks")

        real_hits = real_paths_containing(root, SYNTHETIC_ID)
        if real_hits:
            raise ValueError("synthetic retest dispatch id leaked into real records: " + ", ".join(real_hits))
        result.ok("synthetic retest dispatch id did not leak into real review outcome records or real dispatch")

        summary = {
            "schema_version": "1",
            "dispatch_type": "aurora-live-retest",
            "scratch_root": str(scratch.relative_to(root)).replace("\\", "/"),
            "source_outcome": str(outcome_path.relative_to(root)).replace("\\", "/"),
            "dispatch": str(dispatch_path.relative_to(root)).replace("\\", "/"),
            "received_inbox": str(received_inbox.relative_to(root)).replace("\\", "/"),
            "checks": result.checks,
            "errors": result.errors,
            "verified_boundary": (
                "This roundtrip proves only that a held review outcome can create a scratch retest dispatch, "
                "be copied into a received inbox, and preserve hash/privacy/non-promotion boundaries."
            ),
            "not_proven": [
                "operator received the dispatch",
                "operator completed the atom",
                "screenshot truth",
                "redaction truth",
                "NWN runtime behavior",
                "skill reference improvement",
            ],
        }
        write_json(scratch / "RETEST-DISPATCH-ROUNDTRIP-SUMMARY.json", summary)
        result.ok("wrote scratch retest dispatch roundtrip summary")
    except Exception as exc:
        result.error(str(exc))

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
            print(f"Aurora live retest dispatch roundtrip check failed: {len(result.errors)} error(s)")
        else:
            print("Aurora live retest dispatch roundtrip check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
