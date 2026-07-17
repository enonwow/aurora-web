#!/usr/bin/env python3
"""Check that release-evidence-index.md is fresh."""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path


REPORT_PATH = Path("release-evidence-index.md")
GENERATED_RE = re.compile(r"^Generated: .*$", re.MULTILINE)
REQUIRED_TOKENS = [
    "Aurora live review outcome records",
    "Aurora Live Review Outcomes",
    "Aurora Live Review Outcome Details",
    "Gate Blocker Details",
    "check_release_gate.py",
    "contextual validation",
    "live_record_path",
    "Minimum First Live Pass",
    "knowledge-inbox/aurora-live-review-outcomes/records",
    "blocked_atoms",
    "next_actions",
    "Local Aurora reverse/thread leads",
    "local-aurora-reverse-ingestion.md",
    "local-thread-019ed62e-aurora-ui-gallery-intake.md",
    "local-aurora-live-gap-queue.md",
    "release-routing evidence only",
    "local-reverse-lead",
    "maintainer-decision-index.md",
    "Aurora Live Promotion Proof Gates",
    "aurora-live-promotion-proof-gates.md",
    "Proof-gates are control evidence",
    "source-retail-retest-pass-records",
    "promotion-bridge-candidates",
    "maintainer-promotion-decision",
    "reference-patch-and-release-sync",
    "release-candidate-gate",
    "automatic skill improvement",
]


@dataclass
class EvidenceIndexCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def normalize(text: str) -> str:
    return GENERATED_RE.sub("Generated: <ignored>", text).strip()


def load_generator(root: Path):
    tool_path = root / "tools" / "generate_release_evidence_index.py"
    if not tool_path.exists():
        raise FileNotFoundError(f"release evidence index generator is missing: {tool_path}")
    spec = importlib.util.spec_from_file_location("generate_release_evidence_index", tool_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not import release evidence index generator: {tool_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    if not hasattr(module, "generate"):
        raise RuntimeError("release evidence index generator does not expose generate(root)")
    return module.generate


def write_json(path: Path, data: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def run_synthetic_review_outcome_fixture(root: Path, result: EvidenceIndexCheck) -> None:
    try:
        generator = load_generator(root)
    except Exception as exc:
        result.error(f"release evidence index fixture could not load generator: {exc}")
        return

    scratch_parent = root / ".codex-tmp"
    scratch_parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="release-evidence-index-", dir=scratch_parent) as tmp:
        scratch = Path(tmp)
        write_json(scratch / "version-manifest.json", {
            "package_name": "nwn-server-gamedev-pack",
            "version": "0.0.0-fixture",
            "package_state": "fixture",
            "skill_name": "nwn-server-gamedev",
        })
        tool_dir = scratch / "tools"
        tool_dir.mkdir(parents=True, exist_ok=True)
        (tool_dir / "check_release_gate.py").write_text(
            "\n".join([
                "from types import SimpleNamespace",
                "",
                "def evaluate(root, target):",
                "    blockers = []",
                "    warnings = []",
                "    if target == 'release-candidate':",
                "        blockers = ['Aurora live review outcome: synthetic held atom requires retest']",
                "    if target == 'repo-artifact':",
                "        warnings = ['synthetic repo-artifact warning']",
                "    return SimpleNamespace(checks=['synthetic gate check'], warnings=warnings, blockers=blockers)",
                "",
            ]),
            encoding="utf-8",
        )
        write_json(
            scratch
            / "knowledge-inbox"
            / "aurora-live-review-outcomes"
            / "records"
            / "alro-synthetic-hold.json",
            {
                "schema_version": "1",
                "id": "alro-synthetic-hold",
                "created_at": "2099-01-01T00:00:00+00:00",
                "live_record_id": "aurora-live-synthetic-minimum-pass",
                "live_record_path": "knowledge-inbox/aurora-live-records/aurora-live-synthetic-minimum-pass.json",
                "evidence_manifest_path": "knowledge-inbox/aurora-live-evidence-manifests/aurora-live-evidence-manifest-synthetic-minimum-pass.json",
                "reviewer": "fixture-maintainer",
                "outcome": "hold-for-retest",
                "decision_summary": "Synthetic hold fixture for release evidence index rendering.",
                "promotion_proposal_path": "",
                "reference_promotion_allowed": False,
                "accepted_atoms": [],
                "held_atoms": ["toolset.buildAndClientRun"],
                "rejected_atoms": [],
                "blocked_atoms": ["toolset.buildAndClientRun: client run evidence missing"],
                "visual_redaction_record_ids": [],
                "checks_run": ["check_aurora_live_records.py"],
                "checks_passed": [],
                "privacy_findings": [],
                "schema_expansion_candidates": [],
                "next_actions": ["Repeat Minimum First Live Pass with client run logs."],
                "non_proof_boundaries": [
                    "Synthetic review outcome fixture does not prove Aurora Toolset behavior or NWN runtime behavior."
                ],
                "notes": "Created only in .codex-tmp by check_release_evidence_index.py.",
            },
        )

        try:
            rendered = generator(scratch)
        except Exception as exc:
            result.error(f"release evidence index fixture could not render: {exc}")
            return

    required_fixture_tokens = [
        "alro-synthetic-hold",
        "hold-for-retest",
        "aurora-live-synthetic-minimum-pass",
        "toolset.buildAndClientRun",
        "Repeat Minimum First Live Pass",
        "Aurora live review outcome: synthetic held atom requires retest",
    ]
    missing = [token for token in required_fixture_tokens if token not in rendered]
    if missing:
        result.error(
            "release-evidence-index synthetic hold-for-retest fixture did not render: "
            + ", ".join(missing)
        )
    else:
        result.ok("release-evidence-index renders a synthetic hold-for-retest review outcome and gate blocker")


def run(root: Path) -> EvidenceIndexCheck:
    result = EvidenceIndexCheck()
    report_path = root / REPORT_PATH
    if not report_path.exists():
        result.error(f"release evidence index is missing: {REPORT_PATH}")
        return result

    try:
        actual = report_path.read_text(encoding="utf-8")
    except Exception as exc:
        result.error(f"release evidence index cannot be read: {exc}")
        return result

    try:
        expected = load_generator(root)(root)
    except Exception as exc:
        result.error(f"release evidence index could not be regenerated: {exc}")
        return result

    if normalize(actual) == normalize(expected):
        result.ok("release-evidence-index.md matches current generated report except timestamp")
    else:
        result.error("release-evidence-index.md is stale; regenerate with generate_release_evidence_index.py")

    for token in REQUIRED_TOKENS:
        if token in actual:
            result.ok(f"release-evidence-index.md documents {token}")
        else:
            result.error(f"release-evidence-index.md must document {token}")

    run_synthetic_review_outcome_fixture(root, result)
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--json", action="store_true", help="Emit JSON report.")
    args = parser.parse_args()

    result = run(Path(args.root))
    if args.json:
        print(json.dumps({
            "checks": result.checks,
            "errors": result.errors,
        }, indent=2))
    else:
        for check in result.checks:
            print(f"OK: {check}")
        for error in result.errors:
            print(f"ERROR: {error}")
        if result.errors:
            print(f"Release evidence index check failed: {len(result.errors)} error(s)")
        else:
            print("Release evidence index check passed")

    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
