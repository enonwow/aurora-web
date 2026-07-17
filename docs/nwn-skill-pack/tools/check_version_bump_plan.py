#!/usr/bin/env python3
"""Check version bump plan generation from reference promotion records."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path


PLAN = Path("version-bump-plan.md")
SCRATCH = Path(".codex-tmp/version-bump-plan")


@dataclass
class VersionPlanCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def write_json(path: Path, data: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def load_json(path: Path) -> dict[str, object]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def major_bump(version: str) -> str:
    major = int(version.split(".", 1)[0])
    return f"{major + 1}.0.0"


def promotion_record(record_id: str, semver: str) -> dict[str, object]:
    return {
        "schema_version": "1",
        "id": record_id,
        "created_at": "2026-06-18T20:06:35+00:00",
        "feedback_record_id": f"feedback-{record_id}",
        "proposal_path": f"knowledge-inbox/reference-promotion-proposals/{record_id}.md",
        "result": "accepted",
        "maintainer": "fixture-maintainer",
        "target_references": [
            "draft-skills/nwn-server-gamedev/references/nui-player-ui.md",
            "draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev/references/nui-player-ui.md",
        ],
        "evidence_label": "docs-verified",
        "semver": semver,
        "verification": {
            "proposal_reviewed": True,
            "references_patched": True,
            "authoring_and_plugin_synced": True,
            "privacy_checked": True,
            "checks_run": [
                "check_skill_routes.py",
                "run_repo_artifact_preflight.py",
            ],
            "checks_passed": [
                "check_skill_routes.py",
                "run_repo_artifact_preflight.py",
            ],
        },
        "release_updates": {
            "version_manifest_updated": True,
            "plugin_manifest_updated": True,
            "release_handoff_updated": True,
            "source_of_truth_updated": True,
            "promoted_record_path": f"knowledge-inbox/promoted/{record_id}.json",
        },
        "follow_up_actions": [],
        "non_proof_boundaries": [
            "Does not prove NWN runtime behavior.",
        ],
        "notes": "Synthetic version bump fixture.",
    }


def run_generator(root: Path, records_dir: Path, out: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            sys.executable,
            str(root / "tools" / "generate_version_bump_plan.py"),
            str(root),
            "--records-dir",
            str(records_dir),
            "--out",
            str(out),
        ],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )


def require_tokens(result: VersionPlanCheck, label: str, text: str, tokens: set[str]) -> None:
    missing = sorted(token for token in tokens if token not in text)
    if missing:
        result.error(f"{label} missing tokens: {', '.join(missing)}")
    else:
        result.ok(f"{label} includes required tokens")


def run(root: Path) -> VersionPlanCheck:
    result = VersionPlanCheck()
    current_version = str(load_json(root / "version-manifest.json").get("version", ""))
    plan_path = root / PLAN
    if not plan_path.exists():
        result.error(f"{PLAN} is missing")
    else:
        require_tokens(result, str(PLAN), plan_path.read_text(encoding="utf-8"), {
            "Version Bump Plan",
            f"Current version: `{current_version}`",
            "Proposed SemVer class: `NONE`",
            f"Proposed next version: `{current_version}`",
            "No-bump reason: No accepted reference promotion records exist.",
            "Local Aurora reverse/thread leads",
            "local-aurora-reverse-ingestion.md",
            "local-thread-019ed62e-aurora-ui-gallery-intake.md",
            "local-aurora-live-gap-queue.md",
            "not accepted reference promotion records",
            "do not justify a SemVer bump",
            "reviewed Aurora live records or exact blockers",
            "synced authoring/plugin references",
            "check_version_bump_plan.py",
            "Does Not Prove",
        })

    no_records_dir = root / SCRATCH / "empty-records"
    no_records_dir.mkdir(parents=True, exist_ok=True)
    empty_out = root / SCRATCH / "empty-plan.md"
    empty = run_generator(root, no_records_dir, empty_out)
    if empty.returncode != 0:
        result.error(f"empty version bump plan generation failed: {empty.stdout.strip()}")
    else:
        text = empty_out.read_text(encoding="utf-8")
        require_tokens(result, "empty scratch version plan", text, {
            "Proposed SemVer class: `NONE`",
            f"Proposed next version: `{current_version}`",
            "No accepted reference promotion records exist.",
            "not accepted reference promotion records",
            "do not justify a SemVer bump",
        })

    records_dir = root / SCRATCH / "mixed-records"
    write_json(records_dir / "patch.json", promotion_record("rpr-fixture-patch", "PATCH"))
    write_json(records_dir / "minor.json", promotion_record("rpr-fixture-minor", "MINOR"))
    write_json(records_dir / "major.json", promotion_record("rpr-fixture-major", "MAJOR"))
    mixed_out = root / SCRATCH / "mixed-plan.md"
    mixed = run_generator(root, records_dir, mixed_out)
    if mixed.returncode != 0:
        result.error(f"mixed version bump plan generation failed: {mixed.stdout.strip()}")
    else:
        text = mixed_out.read_text(encoding="utf-8")
        require_tokens(result, "mixed scratch version plan", text, {
            "Proposed SemVer class: `MAJOR`",
            f"Proposed next version: `{major_bump(current_version)}`",
            "Accepted promotion records counted: 3",
            "`PATCH`: 1",
            "`MINOR`: 1",
            "`MAJOR`: 1",
            "This plan is advisory.",
            "not accepted reference promotion records",
            "do not justify a SemVer bump",
        })

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
            print(f"Version bump plan check failed: {len(result.errors)} error(s)")
        else:
            print("Version bump plan check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
