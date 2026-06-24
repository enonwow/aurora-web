#!/usr/bin/env python3
"""Generate the Aurora live retest-to-promotion proof-gate dashboard."""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


RETEST_RECORDS = Path("knowledge-inbox/aurora-live-retest-results/records")
PROMOTION_RECORDS = Path("knowledge-inbox/reference-promotions/records")
BRIDGE_REPORT = Path("knowledge-inbox/aurora-live-retest-promotion-bridge.md")
DEFAULT_OUT = Path("aurora-live-promotion-proof-gates.md")
ACCEPTED_RESULTS = {"accepted", "accepted-with-follow-up"}
REQUIRED_ACCEPTED_VERIFICATION = [
    "proposal_reviewed",
    "references_patched",
    "authoring_and_plugin_synced",
    "privacy_checked",
]
REQUIRED_ACCEPTED_RELEASE_UPDATES = [
    "version_manifest_updated",
    "plugin_manifest_updated",
    "source_of_truth_updated",
]
DOES_NOT_PROVE = (
    "This dashboard summarizes local gates only. It does not prove screenshot truth, "
    "log truth, external operator independence, NWN runtime correctness, privacy safety "
    "beyond maintainer review, release readiness, public distribution, or automatic skill improvement."
)


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


def load_module(path: Path, name: str):
    if not path.exists():
        raise FileNotFoundError(f"required module is missing: {path}")
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not import module: {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def load_records(root: Path, rel_dir: Path, validator) -> tuple[list[dict[str, Any]], list[str]]:
    records: list[dict[str, Any]] = []
    invalid: list[str] = []
    directory = root / rel_dir
    if not directory.is_dir():
        return records, invalid
    for path in sorted(directory.glob("*.json")):
        rel_path = str(path.relative_to(root)).replace("\\", "/")
        try:
            data = load_json(path)
            errors = validator(data)
        except Exception as exc:
            errors = [str(exc)]
            data = {}
        if errors:
            invalid.append(f"{rel_path}: {'; '.join(errors)}")
            continue
        data["_path"] = rel_path
        records.append(data)
    return records, invalid


def bridge_value(label: str, text: str, default: str = "unknown") -> str:
    match = re.search(rf"^{re.escape(label)}: `?([^`\n]+)`?$", text, flags=re.MULTILINE)
    return match.group(1).strip() if match else default


def bridge_count(label: str, text: str) -> int:
    value = bridge_value(label, text, "0")
    try:
        return int(value)
    except ValueError:
        return 0


def accepted_record_is_release_ready(record: dict[str, Any]) -> bool:
    verification = record.get("verification")
    release_updates = record.get("release_updates")
    if not isinstance(verification, dict) or not isinstance(release_updates, dict):
        return False
    for field in REQUIRED_ACCEPTED_VERIFICATION:
        if verification.get(field) is not True:
            return False
    for field in REQUIRED_ACCEPTED_RELEASE_UPDATES:
        if release_updates.get(field) is not True:
            return False
    if not str(release_updates.get("promoted_record_path", "")).strip():
        return False
    target_references = record.get("target_references", [])
    return isinstance(target_references, list) and len(target_references) >= 2


def gate_row(name: str, status: bool, evidence: str, next_action: str) -> str:
    rendered = "PASS" if status else "BLOCKED"
    return f"| `{name}` | {rendered} | {evidence} | {next_action} |"


def generate(root: Path) -> str:
    manifest = load_json(root / "version-manifest.json")
    retest_module = load_module(root / "tools" / "aurora_live_retest_result_record.py", "aurora_retest_gate_records")
    promotion_module = load_module(root / "tools" / "reference_promotion_record.py", "reference_promotion_gate_records")
    release_gate_module = load_module(root / "tools" / "check_release_gate.py", "release_gate_for_promotion_proof")

    retest_records, invalid_retests = load_records(root, RETEST_RECORDS, retest_module.validate_record)
    promotion_records, invalid_promotions = load_records(root, PROMOTION_RECORDS, promotion_module.validate_record)
    bridge_text = read_text(root / BRIDGE_REPORT)
    bridge_status = bridge_value("Status", bridge_text)
    bridge_candidates = bridge_count("Promotion candidates", bridge_text)
    bridge_held = bridge_count("Held records", bridge_text)
    bridge_invalid = bridge_count("Invalid records", bridge_text)
    release_candidate_gate = release_gate_module.evaluate(root, "release-candidate")

    retest_result_counts = Counter(str(record.get("result", "unknown")) for record in retest_records)
    promotion_result_counts = Counter(str(record.get("result", "unknown")) for record in promotion_records)
    pass_retests = [record for record in retest_records if record.get("result") == "pass"]
    accepted_promotions = [
        record for record in promotion_records
        if record.get("result") in ACCEPTED_RESULTS
    ]
    release_ready_promotions = [
        record for record in accepted_promotions
        if accepted_record_is_release_ready(record)
    ]

    package = str(manifest.get("package_name", "nwn-server-gamedev-pack"))
    version = str(manifest.get("version", "0.0.0"))
    state = str(manifest.get("package_state", "unknown"))

    lines = [
        "# Aurora Live Promotion Proof Gates",
        "",
        f"Generated: {now_iso()}",
        "",
        "## Current Package",
        "",
        f"- Package: `{package}`",
        f"- Version: `{version}`",
        f"- State: `{state}`",
        f"- Retest records path: `{RETEST_RECORDS.as_posix()}`",
        f"- Promotion decision records path: `{PROMOTION_RECORDS.as_posix()}`",
        f"- Promotion bridge report: `{BRIDGE_REPORT.as_posix()}`",
        "",
        "## Input Snapshot",
        "",
        f"- Valid Aurora live retest result records: {len(retest_records)}",
        f"- Valid pass retest records: {len(pass_retests)}",
        f"- Invalid Aurora live retest result records: {len(invalid_retests)}",
        f"- Bridge status: `{bridge_status}`",
        f"- Bridge promotion candidates: {bridge_candidates}",
        f"- Bridge held records: {bridge_held}",
        f"- Bridge invalid records: {bridge_invalid}",
        f"- Valid promotion decision records: {len(promotion_records)}",
        f"- Accepted promotion decision records: {len(accepted_promotions)}",
        f"- Release-ready accepted promotion records: {len(release_ready_promotions)}",
        f"- Invalid promotion decision records: {len(invalid_promotions)}",
        f"- Release-candidate blockers: {len(release_candidate_gate.blockers)}",
        "",
        "## Gate Snapshot",
        "",
        "| Gate | Status | Evidence | Next action |",
        "| --- | --- | --- | --- |",
        gate_row(
            "source-retail-retest-pass-records",
            len(pass_retests) > 0,
            f"{len(pass_retests)} pass retest record(s)",
            "Run/receive Aurora live retest and validate the result record.",
        ),
        gate_row(
            "promotion-bridge-candidates",
            bridge_status == "promotion-candidates-ready" and bridge_candidates > 0,
            f"status `{bridge_status}`, candidates {bridge_candidates}",
            "Regenerate the bridge after accepted pass retest records exist.",
        ),
        gate_row(
            "maintainer-promotion-decision",
            len(accepted_promotions) > 0,
            f"{len(accepted_promotions)} accepted promotion decision record(s)",
            "Use aurora_live_retest_promotion_decision.py after maintainer review.",
        ),
        gate_row(
            "reference-patch-and-release-sync",
            len(release_ready_promotions) > 0,
            f"{len(release_ready_promotions)} release-ready accepted promotion record(s)",
            "Patch authoring/plugin references and update release metadata before accepting.",
        ),
        gate_row(
            "release-candidate-gate",
            len(release_candidate_gate.blockers) == 0,
            f"{len(release_candidate_gate.blockers)} release-candidate blocker(s)",
            "Clear release-candidate blockers without treating proof scaffolding as runtime evidence.",
        ),
        "",
        "## Retest Result Counts",
        "",
    ]

    if retest_result_counts:
        for key, value in sorted(retest_result_counts.items()):
            lines.append(f"- `{key}`: {value}")
    else:
        lines.append("- none")

    lines.extend([
        "",
        "## Promotion Decision Counts",
        "",
    ])
    if promotion_result_counts:
        for key, value in sorted(promotion_result_counts.items()):
            lines.append(f"- `{key}`: {value}")
    else:
        lines.append("- none")

    lines.extend([
        "",
        "## Current Blocking Path",
        "",
        "1. Produce a validated Aurora live retest result record with `result=pass` and maintainer privacy verification.",
        "2. Regenerate `knowledge-inbox/aurora-live-retest-promotion-bridge.md` and confirm it reports promotion candidates.",
        "3. Patch both authoring and plugin-packaged references; do not patch from a synthetic or blocked retest.",
        "4. Create an accepted promotion decision record with `tools/aurora_live_retest_promotion_decision.py` only after the patch and release metadata are real.",
        "5. Regenerate promotion aggregate, release readiness, release evidence index, version bump plan, and this dashboard.",
        "6. Run release-candidate and install-candidate gates; keep package state as `repo artifact` until those gates pass.",
        "",
        "## Release-Candidate Blockers",
        "",
    ])

    if release_candidate_gate.blockers:
        for blocker in release_candidate_gate.blockers:
            lines.append(f"- {blocker}")
    else:
        lines.append("- none")

    lines.extend([
        "",
        "## Verification Commands",
        "",
        "```powershell",
        "python docs\\nwn-skill-pack\\tools\\check_aurora_live_retest_result_records.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_aurora_live_retest_promotion_bridge.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_aurora_live_retest_promotion_decision.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_reference_promotion_records.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_release_gate.py docs\\nwn-skill-pack --target release-candidate",
        "python docs\\nwn-skill-pack\\tools\\generate_aurora_live_promotion_proof_gates.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\aurora-live-promotion-proof-gates.md",
        "python docs\\nwn-skill-pack\\tools\\check_aurora_live_promotion_proof_gates.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\run_repo_artifact_preflight.py docs\\nwn-skill-pack",
        "```",
        "",
        "## Does Not Prove",
        "",
        DOES_NOT_PROVE,
    ])

    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--out", default=str(Path("docs/nwn-skill-pack") / DEFAULT_OUT))
    args = parser.parse_args()

    output = generate(Path(args.root))
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(output, encoding="utf-8")
    print(out_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
