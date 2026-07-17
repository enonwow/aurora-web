#!/usr/bin/env python3
"""Check whether release-next-actions.md matches current release blockers."""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path


DASHBOARD_PATH = Path("release-next-actions.md")
GENERATED_RE = re.compile(r"^Generated: .+$", re.MULTILINE)


@dataclass
class NextActionsCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def normalize(text: str) -> str:
    return GENERATED_RE.sub("Generated: <ignored>", text).replace("\r\n", "\n")


def load_generator(root: Path):
    tool_path = root / "tools" / "generate_release_next_actions.py"
    if not tool_path.exists():
        raise FileNotFoundError(f"release next-actions generator is missing: {tool_path}")
    spec = importlib.util.spec_from_file_location("generate_release_next_actions", tool_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not import release next-actions generator: {tool_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    if not hasattr(module, "generate"):
        raise RuntimeError("release next-actions generator does not expose generate(root)")
    return module.generate


def run(root: Path) -> NextActionsCheck:
    result = NextActionsCheck()
    path = root / DASHBOARD_PATH
    manifest_path = root / "version-manifest.json"
    if not path.exists():
        result.error(f"{DASHBOARD_PATH} is missing")
        return result
    if not manifest_path.exists():
        result.error("version-manifest.json is missing")
        return result

    text = path.read_text(encoding="utf-8")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    required_tokens = [
        "Release Next Actions",
        str(manifest.get("package_name", "")),
        str(manifest.get("version", "")),
        "repo artifact",
        "Proposed SemVer class: `NONE`",
        "Gate Snapshot",
        "`repo-artifact` | PASS",
        "`release-candidate` | BLOCKED",
        "`install-candidate` | BLOCKED",
        "Ordered Next Actions",
        "ft-002-custom-spear-2da-hak-tlk.txt",
        "ft-003-nui-crafting-panel.txt",
        "ft-008-feedback-contribution.txt",
        "forward-test-dispatch/rc-minimum",
        "build_forward_test_dispatch_bundle.py",
        "forward-test-clean-session-prompts/rc-minimum",
        "build_forward_test_clean_session_prompts.py",
        "check_forward_test_clean_session_prompts.py",
        "check_forward_test_clean_session_received_pack.py",
        "no-leak/hash checks",
        "clean-session prompt file",
        "answer-capture-template.md",
        "init_forward_test_capture.py",
        "check_forward_test_return_captures.py",
        "blank dispatch capture sheets must fail",
        "reviewer-packet.md",
        "forward_test_record.py",
        "ft-009-local-intake-clean-session-handoff.md",
        "Aurora local-intake handling",
        "local Aurora reverse/thread leads",
        "local-aurora-reverse-ingestion.md",
        "local-thread-019ed62e-aurora-ui-gallery-intake.md",
        "local-aurora-small-location-live-operator-checklist.md",
        "local-aurora-live-gap-queue.md",
        "maintainer-decision-index.md",
        "live Toolset evidence intake",
        "prepared-only smoke test",
        "aurora-live-first-session-command-sheet.md",
        "check_prepare_aurora_live_session.py",
        "check_aurora_live_status.py",
        "does not replace the RC minimum trio",
        "ft-010-full-slice-clean-session-handoff.md",
        "Recommended full-slice probe",
        "hub-to-dungeon vertical slice",
        "locations, items, creatures, 2DA/HAK/TLK, NWScript, NUI, quests, economy, persistence, deployment, and QA",
        "returned-capture check passes",
        "init_ft010_full_slice_review.py",
        "forward-test-reviews\\full-slice-ft010\\ft-010-review.md",
        "extra prompt-forward evidence",
        "filled capture sheet",
        "not as automatic RC proof",
        "INSTALL-001",
        "install-smoke-execution-playbook.md",
        "external-trial-dispatch/ext-001",
        "external_trial_record.py",
        "aurora-live-promotion-proof-gates.md",
        "generate_aurora_live_promotion_proof_gates.py",
        "check_aurora_live_promotion_proof_gates.py",
        "real retest, maintainer decision, reference patch, and release metadata evidence",
        "feedback intake status",
        "Current Release-Candidate Blockers",
        "Current Install-Candidate Blockers",
        "accepted prompt forward tests",
        "no passed install-smoke-test record",
        "Does Not Prove",
        "proof-gates dashboard are transport/control scaffolding",
        "patch references",
    ]
    for token in required_tokens:
        if token not in text:
            result.error(f"{DASHBOARD_PATH} missing token: {token}")
    if not result.errors:
        result.ok("next-actions dashboard includes required gate, action, blocker, and boundary tokens")

    try:
        generator = load_generator(root)
        current = generator(root)
    except Exception as exc:
        result.error(f"release next-actions freshness check failed: {exc}")
        return result

    if normalize(text) == normalize(current):
        result.ok("release-next-actions.md matches current generated dashboard except timestamp")
    else:
        result.error(
            "release-next-actions.md is stale; regenerate with tools/generate_release_next_actions.py"
        )

    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--json", action="store_true", help="Emit JSON report.")
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
            print(f"Release next-actions check failed: {len(result.errors)} error(s)")
        else:
            print("Release next-actions check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
