#!/usr/bin/env python3
"""Check local Aurora reverse-engineering scope and packaging boundaries."""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


LOCAL_AURORA_DOCS = [
    Path("local-aurora-reverse-ingestion.md"),
    Path("local-thread-019ed62e-aurora-ui-gallery-intake.md"),
    Path("local-aurora-symbol-index.md"),
    Path("local-aurora-skill-reference-gap-analysis.md"),
    Path("local-aurora-small-location-live-operator-checklist.md"),
    Path("local-aurora-live-gap-queue.md"),
]

REQUIRED_TOKENS = {
    "local-aurora-reverse-ingestion.md": [
        "019ed62e-3e0f-7253-91ff-f529be54abfe",
        r"C:\Projects\New Folder",
        r"C:\Projects\New Folder\export\decompiled_all.c",
        "heartbeat-co-1-min",
        "no new verified screen",
        "2026-06-19T08:19:16Z fresh thread probe",
        "2026-06-19T09:03:17Z newest five-turn thread probe",
        "targeted gaps such as inventory/loot, door transition, sound, area light/fog, and palette",
        "paginating one",
        "live Toolset verification or an Aurora live record",
        "local-reverse-lead",
        "not official NWN documentation",
        "not live Toolset verification",
        "not a source to copy wholesale into the installed skill",
    ],
    "local-thread-019ed62e-aurora-ui-gallery-intake.md": [
        "screen-supported",
        "verified-live",
        "heartbeat-co-1-min",
        "Fresh Thread Probe - 2026-06-19T08:19:16Z",
        "Fresh Thread Probe - 2026-06-19T09:03:17Z",
        "newest five turns",
        "minimal `read_thread` call with only `threadId` succeeded",
        "Batch82 remains the newest useful passive UI intake",
        "do not keep mining this same thread by default",
        "live Toolset verification or an Aurora live record",
        "Aurora Toolset or local reverse evidence",
        "did not expose a new verified screen",
        "Thread mining is paused",
        "Do not patch compact skill references from this thread alone",
        "Not live-tested",
    ],
    "local-aurora-symbol-index.md": [
        "Evidence label: `local-reverse-lead`",
        r"Reverse root: `C:\Projects\New Folder`",
        "Do not copy raw decompilation into the installed skill",
        "Still Hypothesis",
    ],
    "local-aurora-skill-reference-gap-analysis.md": [
        "Evidence label: `local-reverse-lead`",
        "not be copied directly into the installed skill",
        "After a live operator confirms enough steps",
        "Still Hypothesis",
    ],
    "local-aurora-small-location-live-operator-checklist.md": [
        "local-reverse-lead",
        "disposable module",
        "First Live Record Seed",
        "small-location-first-pass",
        "prepare_aurora_live_session.py",
        "Promotion-critical atoms",
        "Defer these until the first pass",
        "runtime behavior is claimed",
        "Minimum First Live Pass",
        "placeable.createOrEditContainer",
        "inventory.insertItem",
        "toolset.buildAndClientRun",
        "Record the exact blocker",
        "not-run",
        "promotion_ready",
        "local-aurora-live-gap-queue.md",
    ],
    "local-aurora-live-gap-queue.md": [
        "Evidence label before completion: `local-reverse-lead`",
        "not installed skill content",
        "2026-06-19T09:03:17Z freshness probe",
        r"C:\Projects\New Folder",
        "small-location-first-pass",
        "gap-trigger-geometry-script",
        "gap-store-setup-inventory",
        "gap-resource-picker-generic",
        "gap-sound-resource-picker",
        "gap-faction-editor-selector",
        "gap-encounter-wizard-spawn",
        "reviewed Aurora live record",
        "not-run",
    ],
}

SYMBOL_ROW_RE = re.compile(r"^- Parsed text rows: `(?P<count>\d+)`$", re.MULTILINE)
LOCAL_AURORA_PREFIXES = (
    "local-aurora-",
    "local-thread-019ed62e-",
)
FIRST_PASS_REFERENCE_TOKENS = [
    "draft-skills/nwn-server-gamedev/references/locations-areas-tilesets.md",
    "draft-skills/nwn-server-gamedev/references/items-equipment-loot.md",
    "draft-skills/nwn-server-gamedev/references/creatures-encounters-ai.md",
    "draft-skills/nwn-server-gamedev/references/nwscript-events-systems.md",
    "draft-skills/nwn-server-gamedev/references/feature-design-output-template.md",
]
LIVE_GAP_QUEUE_IDS = [
    "gap-trigger-geometry-script",
    "gap-store-setup-inventory",
    "gap-resource-picker-generic",
    "gap-sound-resource-picker",
    "gap-faction-editor-selector",
    "gap-encounter-wizard-spawn",
]


@dataclass
class LocalAuroraScopeCheck:
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


def check_docs(root: Path, result: LocalAuroraScopeCheck) -> None:
    for relative in LOCAL_AURORA_DOCS:
        path = root / relative
        if not path.exists():
            result.error(f"{relative} is missing")
            continue
        text = path.read_text(encoding="utf-8")
        normalized_text = " ".join(text.split())
        missing = []
        for token in REQUIRED_TOKENS.get(str(relative), []):
            normalized_token = " ".join(token.split())
            if token not in text and normalized_token not in normalized_text:
                missing.append(token)
        if missing:
            result.error(f"{relative} missing tokens: {', '.join(missing)}")
        else:
            result.ok(f"{relative} preserves local reverse evidence boundaries")

    symbol_path = root / "local-aurora-symbol-index.md"
    if symbol_path.exists():
        match = SYMBOL_ROW_RE.search(symbol_path.read_text(encoding="utf-8"))
        if not match:
            result.error("local-aurora-symbol-index.md does not report parsed text rows")
        else:
            row_count = int(match.group("count"))
            if row_count < 1000:
                result.error(f"local-aurora-symbol-index.md parsed row count is too small: {row_count}")
            else:
                result.ok(f"local Aurora symbol index has a substantial generated corpus: {row_count} rows")


def check_first_pass_command(root: Path, result: LocalAuroraScopeCheck) -> None:
    path = root / "local-aurora-small-location-live-operator-checklist.md"
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")
    start_marker = "## First Live Record Seed"
    end_marker = "## Prioritized Pass From Local Crosswalks"
    try:
        section = text.split(start_marker, 1)[1].split(end_marker, 1)[0]
    except IndexError:
        result.error("local Aurora first live record seed section is missing or malformed")
        return

    missing = [reference for reference in FIRST_PASS_REFERENCE_TOKENS if reference not in section]
    if missing:
        result.error(f"local Aurora first-pass command missing candidate references: {', '.join(missing)}")
    else:
        result.ok("local Aurora first-pass command includes all five candidate references")

    candidate_flag_count = section.count("--candidate-reference")
    if candidate_flag_count < len(FIRST_PASS_REFERENCE_TOKENS):
        result.error(
            "local Aurora first-pass command has fewer --candidate-reference flags "
            f"than required: {candidate_flag_count}"
        )
    else:
        result.ok("local Aurora first-pass command has enough candidate-reference flags")


def parse_markdown_table(section: str) -> list[list[str]]:
    rows: list[list[str]] = []
    for line in section.splitlines():
        stripped = line.strip()
        if not stripped.startswith("|") or "`gap-" not in stripped:
            continue
        cells = [cell.strip() for cell in stripped.strip("|").split("|")]
        if len(cells) >= 7:
            rows.append(cells)
    return rows


def check_gap_queue(root: Path, result: LocalAuroraScopeCheck) -> None:
    path = root / "local-aurora-live-gap-queue.md"
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")
    try:
        queue_section = text.split("## Queue", 1)[1].split("## Not Yet Promotion-Ready", 1)[0]
    except IndexError:
        result.error("local Aurora live gap queue table section is missing or malformed")
        return

    rows = parse_markdown_table(queue_section)
    if len(rows) != len(LIVE_GAP_QUEUE_IDS):
        result.error(f"local Aurora live gap queue must have {len(LIVE_GAP_QUEUE_IDS)} rows, found {len(rows)}")
        return

    seen_ids: list[str] = []
    for expected_priority, row in enumerate(rows, start=1):
        priority, queue_id_cell, _family, lead_type, _question, required_evidence, promotion_target = row[:7]
        queue_id = queue_id_cell.strip("`")
        seen_ids.append(queue_id)
        if priority != str(expected_priority):
            result.error(f"{queue_id} priority must be {expected_priority}, found {priority}")
        if "symbol-led" not in lead_type:
            result.error(f"{queue_id} lead type must remain symbol-led before live evidence")
        if "exact blocker" not in required_evidence:
            result.error(f"{queue_id} required evidence must allow exact blocker capture")
        if ".md" not in promotion_target:
            result.error(f"{queue_id} promotion target must point to reference markdown files")

    if seen_ids == LIVE_GAP_QUEUE_IDS:
        result.ok("local Aurora live gap queue has expected row ids and priority order")
    else:
        result.error(f"local Aurora live gap queue ids/order drifted: {seen_ids}")

    not_ready_section = text.split("## Not Yet Promotion-Ready", 1)[-1]
    for token in [
        "All queue rows are `not-run`",
        "All queue rows remain `local-reverse-lead`",
        "Passive screenshots can prioritize a row",
    ]:
        if token not in not_ready_section:
            result.error(f"local Aurora live gap queue missing not-ready rule: {token}")
    if not result.errors:
        result.ok("local Aurora live gap queue keeps all rows not-run/local-reverse-lead")


def check_inventory(root: Path, result: LocalAuroraScopeCheck) -> None:
    inventory_path = root / "package-inventory.json"
    if not inventory_path.exists():
        result.error("package-inventory.json is missing")
        return

    try:
        inventory = load_json(inventory_path)
    except Exception as exc:
        result.error(f"package-inventory.json is invalid: {exc}")
        return

    entries = inventory.get("entries")
    if not isinstance(entries, list):
        result.error("package-inventory.json entries must be a list")
        return

    local_entries: list[dict[str, Any]] = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        path = str(entry.get("path", ""))
        if path.startswith(LOCAL_AURORA_PREFIXES) or path == "tools/generate_local_aurora_symbol_index.py":
            local_entries.append(entry)

    if len(local_entries) < 6:
        result.error(f"expected local Aurora maintainer artifacts in package inventory, found {len(local_entries)}")
        return

    for entry in local_entries:
        path = str(entry.get("path", ""))
        if entry.get("plugin_install_include") is not False:
            result.error(f"{path} must not be included in plugin install boundary")
        if entry.get("install_candidate_include") is not True:
            result.error(f"{path} should remain in maintainer handoff boundary")
        role = entry.get("role")
        if role not in {"release-doc", "release-tooling"}:
            result.error(f"{path} has unexpected package inventory role: {role!r}")

    if not result.errors:
        result.ok("local Aurora reverse artifacts stay out of plugin install boundary and remain handoff-only")


def check_manifest(root: Path, result: LocalAuroraScopeCheck) -> None:
    manifest_path = root / "version-manifest.json"
    if not manifest_path.exists():
        result.error("version-manifest.json is missing")
        return
    try:
        manifest = load_json(manifest_path)
    except Exception as exc:
        result.error(f"version-manifest.json is invalid: {exc}")
        return

    expected = "tools/check_local_aurora_reverse_scope.py"
    if manifest.get("local_aurora_reverse_scope_check") == expected:
        result.ok("version manifest points at local Aurora reverse scope checker")
    else:
        result.error(f"version manifest local_aurora_reverse_scope_check must be {expected}")


def run(root: Path) -> LocalAuroraScopeCheck:
    result = LocalAuroraScopeCheck()
    check_docs(root, result)
    check_first_pass_command(root, result)
    check_gap_queue(root, result)
    check_inventory(root, result)
    check_manifest(root, result)
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
            print(f"Local Aurora reverse scope check failed: {len(result.errors)} error(s)")
        else:
            print("Local Aurora reverse scope check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
