#!/usr/bin/env python3
"""Smoke-test generation of reference promotion proposals from feedback records."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path


SCRATCH = Path(".codex-tmp/reference-promotion-proposal")


@dataclass
class ToolCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def write_record(path: Path, promotion_ready: bool) -> None:
    record = {
        "schema_version": "1",
        "id": "fixture-reference-promotion",
        "created_at": "2026-06-18T19:49:04+00:00",
        "domain": "nui",
        "title": "Fixture accepted NUI correction",
        "summary": "NUI feedback should preserve evidence labels before being promoted.",
        "source_type": "maintainer-review",
        "status": "docs-verified",
        "nwn_version": "NWN:EE fixture",
        "server_context": "synthetic checker fixture",
        "evidence": [
            "docs-verified fixture evidence for promotion proposal generation",
            "source registry lane reviewed by maintainer",
        ],
        "files_or_scripts": [],
        "runtime_steps": [
            "No runtime evidence; this is a generator fixture.",
        ],
        "failure_mode": "Generated proposal is not proof of claim truth.",
        "proposed_skill_update": {
            "file": "draft-skills/nwn-server-gamedev/references/nui-player-ui.md",
            "summary": "Add a concise guardrail reminding maintainers to preserve evidence labels for NUI feedback.",
        },
        "notes": "Synthetic record used by check_reference_promotion_proposal_tool.py.",
        "review": {
            "reviewed_at": "2026-06-18T19:49:04+00:00",
            "reviewer": "fixture-maintainer",
            "decision": "accept-for-promotion" if promotion_ready else "needs-more-evidence",
            "promotion_ready": promotion_ready,
            "target_reference": "draft-skills/nwn-server-gamedev/references/nui-player-ui.md",
            "required_actions": [
                "Generate a proposal before patching references.",
            ],
            "notes": "Synthetic promotion-ready fixture." if promotion_ready else "Synthetic unready fixture.",
        },
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def run_generator(root: Path, record: Path, out: Path, *extra: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            sys.executable,
            str(root / "tools" / "generate_reference_promotion_proposal.py"),
            str(root),
            str(record),
            "--out",
            str(out),
            "--maintainer",
            "fixture-maintainer",
            "--source-bundle-id",
            "fixture-bundle",
            "--semver",
            "MINOR",
            *extra,
        ],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )


def run(root: Path) -> ToolCheck:
    result = ToolCheck()
    scratch = root / SCRATCH
    accepted_record = scratch / "accepted-record.json"
    blocked_record = scratch / "blocked-record.json"
    proposal = scratch / "accepted-proposal.md"
    blocked_proposal = scratch / "blocked-proposal.md"

    write_record(accepted_record, promotion_ready=True)
    write_record(blocked_record, promotion_ready=False)

    accepted = run_generator(root, accepted_record, proposal)
    if accepted.returncode != 0:
        result.error(f"accepted record proposal generation failed: {accepted.stdout.strip()}")
        return result
    result.ok("accepted promotion-ready record generated a proposal")

    if not proposal.exists():
        result.error(f"accepted proposal was not written: {proposal}")
        return result
    text = proposal.read_text(encoding="utf-8")
    required_tokens = {
        "Reference Promotion Proposal",
        "fixture-reference-promotion",
        "review.decision=accept-for-promotion",
        "review.promotion_ready=true",
        "draft-skills/nwn-server-gamedev/references/nui-player-ui.md",
        "draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev/references/nui-player-ui.md",
        "Selected label: `docs-verified`",
        "Privacy scan terms in source record: `none`",
        "Proposed SemVer class: `MINOR`",
        "reference_promotion_record.py validate",
        "reference-promotions",
        "aggregate.md",
        "check_reference_promotion_records.py",
        "run_repo_artifact_preflight.py",
        "Does Not Prove",
        "future automatic skill improvement",
    }
    missing = sorted(token for token in required_tokens if token not in text)
    if missing:
        result.error(f"accepted proposal missing tokens: {', '.join(missing)}")
    else:
        result.ok("accepted proposal includes required promotion, patch, and boundary tokens")

    blocked = run_generator(root, blocked_record, blocked_proposal)
    if blocked.returncode == 0:
        result.error("unready feedback record unexpectedly generated a proposal without --allow-unready")
    elif "not promotion-ready" not in blocked.stdout:
        result.error(f"unready feedback record failed for the wrong reason: {blocked.stdout.strip()}")
    else:
        result.ok("unready feedback record is rejected unless --allow-unready is set")

    allowed = run_generator(root, blocked_record, blocked_proposal, "--allow-unready")
    if allowed.returncode != 0:
        result.error(f"--allow-unready blocked draft generation failed: {allowed.stdout.strip()}")
    elif "review.decision is not accept-for-promotion" not in blocked_proposal.read_text(encoding="utf-8"):
        result.error("--allow-unready proposal does not record the readiness blocker")
    else:
        result.ok("--allow-unready writes a blocked draft with readiness blocker text")

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
            print(f"Reference promotion proposal tool check failed: {len(result.errors)} error(s)")
        else:
            print("Reference promotion proposal tool check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
