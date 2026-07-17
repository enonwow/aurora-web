#!/usr/bin/env python3
"""Generate a maintainer next-action dashboard for the NWN skill pack."""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


TARGETS = ["repo-artifact", "release-candidate", "install-candidate"]
MINIMUM_RC_PROMPTS = [
    "forward-tests/prompts/ft-002-custom-spear-2da-hak-tlk.txt",
    "forward-tests/prompts/ft-003-nui-crafting-panel.txt",
    "forward-tests/prompts/ft-008-feedback-contribution.txt",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.exists() else ""


def load_release_gate(root: Path):
    tool_path = root / "tools" / "check_release_gate.py"
    if not tool_path.exists():
        raise FileNotFoundError(f"release gate checker is missing: {tool_path}")
    spec = importlib.util.spec_from_file_location("check_release_gate", tool_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not import release gate checker: {tool_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    if not hasattr(module, "evaluate"):
        raise RuntimeError("release gate checker does not expose evaluate(root, target)")
    return module.evaluate


def first_number(pattern: str, text: str, default: int = 0) -> int:
    match = re.search(pattern, text)
    return int(match.group(1)) if match else default


def version_plan_value(label: str, text: str, default: str = "unknown") -> str:
    pattern = rf"^- {re.escape(label)}: `?([^`\n]+)`?$"
    match = re.search(pattern, text, flags=re.MULTILINE)
    return match.group(1).strip() if match else default


def load_forward_records(root: Path) -> list[dict[str, Any]]:
    record_dir = root / "forward-tests" / "records"
    records: list[dict[str, Any]] = []
    if not record_dir.is_dir():
        return records
    for path in sorted(record_dir.glob("*.json")):
        try:
            record = load_json(path)
        except Exception:
            continue
        record["_path"] = str(path.relative_to(root)).replace("\\", "/")
        records.append(record)
    return records


def generate(root: Path) -> str:
    manifest = load_json(root / "version-manifest.json")
    readiness = read_text(root / "release-readiness.md")
    version_plan = read_text(root / "version-bump-plan.md")
    evaluate_gate = load_release_gate(root)
    gates = {target: evaluate_gate(root, target) for target in TARGETS}
    records = load_forward_records(root)

    prompt_tests = first_number(r"- Prompt forward tests: (\d+)", readiness)
    install_smoke_tests = first_number(r"- Install smoke tests: (\d+)", readiness)
    accepted_install_smoke = first_number(
        r"- Accepted passed install smoke tests: (\d+)", readiness
    )
    static_records = [
        record for record in records
        if record.get("record_type") == "static-check"
    ]

    package = str(manifest.get("package_name", "nwn-server-gamedev-pack"))
    version = str(manifest.get("version", "0.0.0"))
    state = str(manifest.get("package_state", "unknown"))
    semver_class = version_plan_value("Proposed SemVer class", version_plan, "UNKNOWN")
    next_version = version_plan_value("Proposed next version", version_plan, version)

    lines = [
        "# NWN Skill Pack Release Next Actions",
        "",
        f"Generated: {now_iso()}",
        "",
        "## Current State",
        "",
        f"- Package: `{package}`",
        f"- Version: `{version}`",
        f"- State: `{state}`",
        f"- Proposed SemVer class: `{semver_class}`",
        f"- Proposed next version: `{next_version}`",
        f"- Static package records: {len(static_records)}",
        f"- Prompt forward tests: {prompt_tests}",
        f"- Install smoke tests: {install_smoke_tests}",
        f"- Accepted install smoke tests: {accepted_install_smoke}",
        "",
        "## Gate Snapshot",
        "",
        "| Target | Status | Checks | Warnings | Blockers |",
        "| --- | --- | ---: | ---: | ---: |",
    ]

    for target in TARGETS:
        gate = gates[target]
        status = "PASS" if not gate.blockers else "BLOCKED"
        lines.append(
            f"| `{target}` | {status} | {len(gate.checks)} | "
            f"{len(gate.warnings)} | {len(gate.blockers)} |"
        )

    lines.extend([
        "",
        "## Ordered Next Actions",
        "",
        "1. Keep the package state as `repo artifact` until stricter gates pass.",
        "2. Run the minimum no-answer-leak prompt-forward tests for RC:",
    ])
    for prompt in MINIMUM_RC_PROMPTS:
        lines.append(f"   - `{prompt}`")
    lines.extend([
        "3. Build `.codex-tmp/forward-test-dispatch/rc-minimum/` with `tools/build_forward_test_dispatch_bundle.py`, then give that no-leak bundle to the clean tester.",
        "4. Build `.codex-tmp/forward-test-clean-session-prompts/rc-minimum/` with `tools/build_forward_test_clean_session_prompts.py`, then run `tools/check_forward_test_clean_session_received_pack.py` to prove the copied prompt pack still passes no-leak/hash checks.",
        "5. Paste exactly one clean-session prompt file into each fresh Codex thread.",
        "6. Initialize or use the included capture sheets from `tools/init_forward_test_capture.py`, then capture each raw answer before opening reviewer-only materials with `forward-tests/answer-capture-template.md`.",
        "7. Run `tools/check_forward_test_return_captures.py --captures <returned-captures-dir>` before reviewer scoring; blank dispatch capture sheets must fail this gate.",
        "8. Score after the return-capture check with `forward-tests/reviewer-packet.md` and record results with `tools/forward_test_record.py`.",
        "9. Optional boundary lane: run `forward-tests/ft-009-local-intake-clean-session-handoff.md` to test Aurora local-intake handling; if you only have local Aurora reverse/thread leads, route through `local-aurora-reverse-ingestion.md`, `local-thread-019ed62e-aurora-ui-gallery-intake.md`, `local-aurora-small-location-live-operator-checklist.md`, `local-aurora-live-gap-queue.md`, and `maintainer-decision-index.md` before patching references. If doing live Toolset evidence intake, run the prepared-only smoke test in `knowledge-inbox/aurora-live-first-session-command-sheet.md` with `tools/check_prepare_aurora_live_session.py` and `tools/check_aurora_live_status.py` before opening Toolset. This does not replace the RC minimum trio.",
        "10. Recommended full-slice probe: run `forward-tests/ft-010-full-slice-clean-session-handoff.md` to test the hub-to-dungeon vertical slice path across locations, items, creatures, 2DA/HAK/TLK, NWScript, NUI, quests, economy, persistence, deployment, and QA. After the returned-capture check passes, initialize the reviewer worksheet with `tools/init_ft010_full_slice_review.py --capture .codex-tmp\\forward-test-return-captures\\full-slice-ft010\\ft-010-capture.md --out .codex-tmp\\forward-test-reviews\\full-slice-ft010\\ft-010-review.md`. Treat it as extra prompt-forward evidence after a filled capture sheet and reviewer scoring, not as automatic RC proof.",
        "11. Run or hand off `INSTALL-001` with `forward-tests/install-smoke-execution-playbook.md` and `forward-tests/install-smoke-packet.md`.",
        "12. If outside-builder contribution is the next lane, send `.codex-tmp/external-trial-dispatch/ext-001/` and record the result with `tools/external_trial_record.py`.",
        "13. For the Aurora live retest promotion lane, regenerate `aurora-live-promotion-proof-gates.md` with `tools/generate_aurora_live_promotion_proof_gates.py`, run `tools/check_aurora_live_promotion_proof_gates.py`, and keep every proof gate blocked until real retest, maintainer decision, reference patch, and release metadata evidence exists.",
        "14. Only after accepted records exist, regenerate feedback intake status, promotion aggregate, version bump plan, release notes, proof-gates dashboard, and this dashboard.",
        "",
        "## Current Release-Candidate Blockers",
        "",
    ])

    rc_blockers = gates["release-candidate"].blockers
    if rc_blockers:
        for blocker in rc_blockers:
            lines.append(f"- {blocker}")
    else:
        lines.append("- none")

    lines.extend([
        "",
        "## Current Install-Candidate Blockers",
        "",
    ])
    install_blockers = gates["install-candidate"].blockers
    if install_blockers:
        for blocker in install_blockers:
            lines.append(f"- {blocker}")
    else:
        lines.append("- none")

    lines.extend([
        "",
        "## Refresh Commands",
        "",
        "```powershell",
        "python docs\\nwn-skill-pack\\tools\\run_repo_artifact_preflight.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\build_forward_test_clean_session_prompts.py docs\\nwn-skill-pack --force",
        "python docs\\nwn-skill-pack\\tools\\check_forward_test_clean_session_prompts.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_forward_test_clean_session_received_pack.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_release_gate.py docs\\nwn-skill-pack --target release-candidate",
        "python docs\\nwn-skill-pack\\tools\\check_release_gate.py docs\\nwn-skill-pack --target install-candidate",
        "python docs\\nwn-skill-pack\\tools\\generate_aurora_live_promotion_proof_gates.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\aurora-live-promotion-proof-gates.md",
        "python docs\\nwn-skill-pack\\tools\\check_aurora_live_promotion_proof_gates.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\generate_release_next_actions.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\release-next-actions.md",
        "python docs\\nwn-skill-pack\\tools\\check_release_next_actions.py docs\\nwn-skill-pack",
        "```",
        "",
        "## Does Not Prove",
        "",
        "This dashboard proves only that current local release blockers were summarized. The forward-test dispatch bundle and proof-gates dashboard are transport/control scaffolding, not prompt evidence or runtime evidence. This dashboard does not run prompt-forward tests, install the plugin, prove external tester independence, promote human feedback, patch references, or prove NWN runtime behavior.",
    ])

    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--out", default="docs/nwn-skill-pack/release-next-actions.md")
    args = parser.parse_args()

    output = generate(Path(args.root))
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(output, encoding="utf-8")
    print(out_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
