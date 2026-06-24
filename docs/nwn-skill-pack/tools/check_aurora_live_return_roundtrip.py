#!/usr/bin/env python3
"""Smoke-test the Aurora live return path with synthetic temporary records only."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


ATOM = "area.createWithWizard"
PRIMARY_REFERENCE = "draft-skills/nwn-server-gamedev/references/locations-areas-tilesets.md"
FIRST_PASS_REFERENCES = [
    PRIMARY_REFERENCE,
    "draft-skills/nwn-server-gamedev/references/items-equipment-loot.md",
    "draft-skills/nwn-server-gamedev/references/creatures-encounters-ai.md",
    "draft-skills/nwn-server-gamedev/references/nwscript-events-systems.md",
    "draft-skills/nwn-server-gamedev/references/feature-design-output-template.md",
]
SYNTHETIC_MARKER = "Synthetic smoke only; this is not real Aurora evidence."


@dataclass
class RoundtripCheck:
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


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


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


def copy_package_to_temp(root: Path) -> tuple[tempfile.TemporaryDirectory[str], Path]:
    temp_parent = root / ".codex-tmp"
    temp_parent.mkdir(parents=True, exist_ok=True)
    temp_dir = tempfile.TemporaryDirectory(prefix="aurora-live-return-roundtrip-", dir=str(temp_parent))
    sandbox_root = Path(temp_dir.name) / "nwn-skill-pack"
    shutil.copytree(
        root,
        sandbox_root,
        ignore=shutil.ignore_patterns(".codex-tmp", "__pycache__"),
    )
    return temp_dir, sandbox_root


def find_atom(record: dict[str, Any], atom_name: str) -> dict[str, Any]:
    atoms = record.get("atoms")
    if not isinstance(atoms, list):
        raise ValueError("live record atoms must be a list")
    for atom in atoms:
        if isinstance(atom, dict) and atom.get("atom") == atom_name:
            return atom
    raise ValueError(f"live record missing atom {atom_name}")


def synthesize_returned_bundle(record_path: Path, manifest_path: Path, sandbox_root: Path) -> None:
    screenshot_rel = "screenshots/area-wizard-step-01.png"
    screenshot_path = sandbox_root / ".codex-tmp" / "aurora-live-evidence" / "aurora-live-20990101-roundtrip-smoke" / screenshot_rel
    screenshot_path.parent.mkdir(parents=True, exist_ok=True)
    screenshot_bytes = b"synthetic-return-path-smoke-not-real-aurora-evidence\n"
    screenshot_path.write_bytes(screenshot_bytes)
    screenshot_hash = hashlib.sha256(screenshot_bytes).hexdigest()

    record = load_json(record_path)
    atom = find_atom(record, ATOM)
    atom["status"] = "observed-toolset"
    atom["evidence_label"] = "toolset-observed"
    atom["observations"] = [
        "Synthetic smoke observation for return-path mechanics only; not real Aurora evidence."
    ]
    atom["artifacts"] = [screenshot_rel]
    atom["blockers"] = []
    atom["promotion_ready"] = True
    record["overall_result"] = "partial"
    record["promotion"] = {
        "candidate_references": FIRST_PASS_REFERENCES,
        "requires_reference_promotion_proposal": True,
        "notes": SYNTHETIC_MARKER,
    }
    write_json(record_path, record)

    manifest = load_json(manifest_path)
    manifest["redaction_reviewed"] = True
    manifest["privacy_notes"] = (
        "Synthetic smoke artifact with no private data; not real Aurora evidence."
    )
    manifest["not_proven"] = [
        "Synthetic roundtrip proves return-path mechanics only.",
        "It does not prove Aurora Toolset behavior, screenshot truth, runtime behavior, or reference correctness.",
    ]
    manifest["artifacts"] = [
        {
            "artifact_id": "area-wizard-step-01",
            "atom": ATOM,
            "kind": "screenshot",
            "path": screenshot_rel,
            "description": "Synthetic placeholder screenshot path for return-path mechanics only.",
            "evidence_label": "toolset-observed",
            "redaction_status": "redacted",
            "sha256": screenshot_hash,
            "notes": SYNTHETIC_MARKER,
        }
    ]
    write_json(manifest_path, manifest)


def require_text(text: str, token: str, label: str) -> None:
    if token not in text:
        raise ValueError(f"{label} missing token: {token}")


def run(root: Path) -> RoundtripCheck:
    result = RoundtripCheck()
    if not root.exists():
        result.error(f"package root does not exist: {root}")
        return result

    try:
        temp_dir, sandbox_root = copy_package_to_temp(root)
        with temp_dir:
            prepare_output = run_command(
                [
                    sys.executable,
                    str(sandbox_root / "tools" / "prepare_aurora_live_session.py"),
                    str(sandbox_root),
                    "--operator",
                    "synthetic-return-smoke",
                    "--scenario",
                    "roundtrip-smoke",
                    "--date",
                    "20990101",
                    "--toolset-version",
                    "synthetic-toolset",
                    "--nwn-version",
                    "synthetic-nwn-ee",
                    "--module-path-or-copy-id",
                    "synthetic-disposable-module",
                    "--candidate-reference",
                    FIRST_PASS_REFERENCES[0],
                    "--candidate-reference",
                    FIRST_PASS_REFERENCES[1],
                    "--candidate-reference",
                    FIRST_PASS_REFERENCES[2],
                    "--candidate-reference",
                    FIRST_PASS_REFERENCES[3],
                    "--candidate-reference",
                    FIRST_PASS_REFERENCES[4],
                    "--notes",
                    SYNTHETIC_MARKER,
                    "--force",
                    "--json",
                ],
                cwd=sandbox_root,
            )
            prepared = json.loads(prepare_output)
            record_id = str(prepared["record_id"])
            record_path = Path(prepared["record_path"])
            manifest_path = Path(prepared["manifest_path"])
            synthesize_returned_bundle(record_path, manifest_path, sandbox_root)
            result.ok("prepared and synthesized a temporary Aurora live return bundle")

            checks = [
                [
                    sys.executable,
                    str(sandbox_root / "tools" / "aurora_toolset_live_record.py"),
                    "validate",
                    str(record_path),
                ],
                [sys.executable, str(sandbox_root / "tools" / "check_aurora_live_records.py"), str(sandbox_root)],
                [
                    sys.executable,
                    str(sandbox_root / "tools" / "check_aurora_live_redaction_policy.py"),
                    str(sandbox_root),
                ],
                [
                    sys.executable,
                    str(sandbox_root / "tools" / "check_aurora_live_visual_redaction_checklist.py"),
                    str(sandbox_root),
                ],
                [
                    sys.executable,
                    str(sandbox_root / "tools" / "check_aurora_live_evidence_manifest.py"),
                    str(sandbox_root),
                ],
                [
                    sys.executable,
                    str(sandbox_root / "tools" / "check_aurora_live_intake_consistency.py"),
                    str(sandbox_root),
                ],
                [
                    sys.executable,
                    str(sandbox_root / "tools" / "check_aurora_live_return_packet.py"),
                    str(sandbox_root),
                ],
            ]
            for command in checks:
                run_command(command, cwd=sandbox_root)
            result.ok("temporary live record, redaction, visual checklist, evidence manifest, intake consistency, and return packet checks passed")

            visual_records = sandbox_root / "knowledge-inbox" / "aurora-live-visual-redaction-records" / "records"
            visual_record_path_output = run_command(
                [
                    sys.executable,
                    str(sandbox_root / "tools" / "aurora_live_visual_redaction_record.py"),
                    "new",
                    "--out",
                    str(visual_records),
                    "--live-record-id",
                    record_id,
                    "--evidence-manifest-path",
                    str(manifest_path.relative_to(sandbox_root)),
                    "--reviewer",
                    "synthetic-return-smoke",
                    "--result",
                    "pass",
                    "--artifact",
                    f"area-wizard-step-01|{ATOM}|screenshot|screenshots/area-wizard-step-01.png|redacted|passed",
                    "--all-artifacts-opened",
                    "--screenshots-reviewed",
                    "--logs-reviewed",
                    "--no-private-data-visible",
                    "--redaction-irreversible",
                    "--hashes-or-external-notes-checked",
                    "--raw-reverse-excluded",
                    "--check-run",
                    "check_aurora_live_visual_redaction_checklist.py",
                    "--check-passed",
                    "check_aurora_live_visual_redaction_checklist.py",
                    "--non-proof-boundary",
                    "Synthetic visual review record proves route mechanics only.",
                    "--notes",
                    SYNTHETIC_MARKER,
                ],
                cwd=sandbox_root,
            )
            visual_record_path = Path(visual_record_path_output.strip())
            run_command(
                [
                    sys.executable,
                    str(sandbox_root / "tools" / "aurora_live_visual_redaction_record.py"),
                    "validate",
                    str(visual_record_path),
                ],
                cwd=sandbox_root,
            )
            run_command(
                [
                    sys.executable,
                    str(sandbox_root / "tools" / "aurora_live_visual_redaction_record.py"),
                    "aggregate",
                    str(visual_records),
                    "--out",
                    str(sandbox_root / "knowledge-inbox" / "aurora-live-visual-redaction-records" / "aggregate.md"),
                ],
                cwd=sandbox_root,
            )
            run_command(
                [
                    sys.executable,
                    str(sandbox_root / "tools" / "check_aurora_live_visual_redaction_records.py"),
                    str(sandbox_root),
                ],
                cwd=sandbox_root,
            )
            result.ok("temporary human visual redaction review record validates and aggregates without becoming proof")

            queue_path = sandbox_root / "knowledge-inbox" / "aurora-live-review-queue.md"
            run_command(
                [
                    sys.executable,
                    str(sandbox_root / "tools" / "generate_aurora_live_review_queue.py"),
                    str(sandbox_root),
                    "--out",
                    str(queue_path),
                ],
                cwd=sandbox_root,
            )
            run_command(
                [
                    sys.executable,
                    str(sandbox_root / "tools" / "check_aurora_live_review_queue.py"),
                    str(sandbox_root),
                ],
                cwd=sandbox_root,
            )
            queue_text = queue_path.read_text(encoding="utf-8")
            require_text(queue_text, "Status: `promotion-review-needed`", "synthetic review queue")
            require_text(queue_text, ATOM, "synthetic review queue")
            require_text(queue_text, PRIMARY_REFERENCE, "synthetic review queue")
            require_text(queue_text, "feature-design-output-template.md", "synthetic review queue")
            require_text(queue_text, "not proof by itself", "synthetic review queue")
            result.ok("temporary review queue reaches promotion-review-needed without becoming proof")

            outcome_records = sandbox_root / "knowledge-inbox" / "aurora-live-review-outcomes" / "records"
            accept_preview = subprocess.run(
                [
                    sys.executable,
                    str(sandbox_root / "tools" / "aurora_live_review_outcome_record.py"),
                    "from-live-record",
                    str(record_path),
                    "--out",
                    str(outcome_records / "dry-run-should-not-exist"),
                    "--id",
                    "alro-synthetic-return-accept-preview",
                    "--reviewer",
                    "synthetic-return-smoke",
                    "--outcome",
                    "accept-for-proposal",
                    "--reference-promotion-allowed",
                    "--accepted-standard-checks",
                    "--next-action",
                    "Generate and review a reference promotion proposal.",
                    "--dry-run",
                ],
                cwd=str(sandbox_root),
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
            )
            if accept_preview.returncode != 1:
                raise ValueError("synthetic accept dry-run should be rejected until the Minimum First Live Pass is complete")
            require_text(accept_preview.stdout, "Minimum First Live Pass incomplete", "synthetic accept dry-run rejection")
            require_text(accept_preview.stdout, "toolset.buildAndClientRun", "synthetic accept dry-run rejection")
            if (outcome_records / "dry-run-should-not-exist").exists():
                raise ValueError("synthetic accept dry-run wrote a records directory")
            result.ok("temporary review outcome accept dry-run is rejected until the minimum pass is complete")

            hold_record_path_output = run_command(
                [
                    sys.executable,
                    str(sandbox_root / "tools" / "aurora_live_review_outcome_record.py"),
                    "from-live-record",
                    str(record_path),
                    "--out",
                    str(outcome_records),
                    "--id",
                    "alro-synthetic-return-hold",
                    "--reviewer",
                    "synthetic-return-smoke",
                    "--outcome",
                    "hold-for-retest",
                    "--decision-summary",
                    "Synthetic hold; route mechanics only.",
                    "--held-atom",
                    ATOM,
                    "--blocked-atom",
                    "area.createWithWizard: synthetic bundle is not real Aurora evidence",
                    "--next-action",
                    "Repeat the return workflow with real Aurora Toolset screenshots and logs.",
                ],
                cwd=sandbox_root,
            )
            hold_record_path = Path(hold_record_path_output.strip())
            run_command(
                [
                    sys.executable,
                    str(sandbox_root / "tools" / "aurora_live_review_outcome_record.py"),
                    "validate",
                    str(hold_record_path),
                    "--root",
                    str(sandbox_root),
                ],
                cwd=sandbox_root,
            )
            run_command(
                [
                    sys.executable,
                    str(sandbox_root / "tools" / "aurora_live_review_outcome_record.py"),
                    "aggregate",
                    str(outcome_records),
                    "--out",
                    str(sandbox_root / "knowledge-inbox" / "aurora-live-review-outcomes" / "aggregate.md"),
                    "--root",
                    str(sandbox_root),
                ],
                cwd=sandbox_root,
            )
            run_command(
                [
                    sys.executable,
                    str(sandbox_root / "tools" / "check_aurora_live_review_outcome_records.py"),
                    str(sandbox_root),
                ],
                cwd=sandbox_root,
            )
            result.ok("temporary hold-for-retest review outcome validates, aggregates, and passes outcome checks")

            release_evidence_index = sandbox_root / "release-evidence-index.md"
            run_command(
                [
                    sys.executable,
                    str(sandbox_root / "tools" / "generate_release_evidence_index.py"),
                    str(sandbox_root),
                    "--out",
                    str(release_evidence_index),
                ],
                cwd=sandbox_root,
            )
            run_command(
                [
                    sys.executable,
                    str(sandbox_root / "tools" / "check_release_evidence_index.py"),
                    str(sandbox_root),
                ],
                cwd=sandbox_root,
            )
            release_index_text = release_evidence_index.read_text(encoding="utf-8")
            require_text(release_index_text, "alro-synthetic-return-hold", "synthetic release evidence index")
            require_text(release_index_text, "hold-for-retest", "synthetic release evidence index")
            require_text(release_index_text, "area.createWithWizard: synthetic bundle is not real Aurora evidence", "synthetic release evidence index")
            require_text(release_index_text, "Repeat the return workflow with real Aurora Toolset screenshots and logs.", "synthetic release evidence index")
            require_text(release_index_text, "Aurora Live Review Outcome Details", "synthetic release evidence index")
            result.ok("temporary release evidence index shows the held review outcome with blocker and next action")

            record_text = record_path.read_text(encoding="utf-8")
            manifest_text = manifest_path.read_text(encoding="utf-8")
            require_text(record_text, "Synthetic smoke", "synthetic live record")
            require_text(manifest_text, "Synthetic smoke", "synthetic evidence manifest")
            result.ok("synthetic record and manifest are explicitly marked as not real evidence")
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
            print(f"Aurora live return roundtrip check failed: {len(result.errors)} error(s)")
        else:
            print("Aurora live return roundtrip check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
