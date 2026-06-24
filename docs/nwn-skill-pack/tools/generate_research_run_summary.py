#!/usr/bin/env python3
"""Generate a human-readable summary of the NWN skill-pack research loop log."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any


LOG_PATH = Path("research-run-log.jsonl")
DEFAULT_OUT = Path("research-run-summary.md")
RECENT_LIMIT = 12
NEXT_LIMIT = 8


def load_entries(root: Path) -> list[dict[str, Any]]:
    log_path = root / LOG_PATH
    entries: list[dict[str, Any]] = []
    for line_number, line in enumerate(log_path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        entry = json.loads(line)
        if not isinstance(entry, dict):
            raise ValueError(f"line {line_number}: entry must be a JSON object")
        entries.append(entry)
    return entries


def entry_format(entry: dict[str, Any]) -> str:
    return "structured" if any(key in entry for key in ["verified", "hypothesis", "next"]) else "legacy"


def event_family(event: str) -> str:
    if event.startswith("preflight_checked_"):
        return "preflight_checked"
    if event.startswith("added_"):
        return "added"
    if event.startswith("generated_"):
        return "generated"
    if event.startswith("validated_"):
        return "validated"
    return event.split("_", 1)[0] if "_" in event else event


def clean_cell(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", " ").strip()


def short(value: str, limit: int = 120) -> str:
    value = " ".join(value.split())
    if len(value) <= limit:
        return value
    return value[: limit - 3].rstrip() + "..."


def entry_note(entry: dict[str, Any]) -> str:
    if entry_format(entry) == "legacy":
        return short(str(entry.get("summary", "")))
    verified = entry.get("verified")
    if isinstance(verified, list) and verified:
        return short(str(verified[0]))
    return ""


def latest_structured_entries(entries: list[dict[str, Any]], limit: int) -> list[dict[str, Any]]:
    return [entry for entry in entries if entry_format(entry) == "structured"][-limit:]


def generate(root: Path) -> str:
    entries = load_entries(root)
    if not entries:
        raise ValueError(f"{LOG_PATH} has no entries")

    formats = Counter(entry_format(entry) for entry in entries)
    families = Counter(event_family(str(entry.get("event", ""))) for entry in entries)
    preflight_entries = [
        entry for entry in entries
        if str(entry.get("event", "")).startswith("preflight_checked_")
    ]
    latest = entries[-1]
    earliest = entries[0]
    latest_structured = latest_structured_entries(entries, NEXT_LIMIT)

    lines = [
        "# Research Run Summary",
        "",
        f"Source: `{LOG_PATH.as_posix()}`",
        "",
        "## Counts",
        "",
        f"- Entries: {len(entries)}",
        f"- Legacy summary entries: {formats.get('legacy', 0)}",
        f"- Structured audit entries: {formats.get('structured', 0)}",
        f"- Distinct event names: {len({str(entry.get('event', '')) for entry in entries})}",
        f"- Preflight audit entries: {len(preflight_entries)}",
        f"- Earliest entry: `{earliest.get('time', '')}` `{earliest.get('event', '')}`",
        f"- Latest entry: `{latest.get('time', '')}` `{latest.get('event', '')}`",
        "",
        "## Event Families",
        "",
        "| Family | Entries |",
        "| --- | ---: |",
    ]
    for family, count in sorted(families.items()):
        lines.append(f"| `{clean_cell(family)}` | {count} |")

    lines.extend([
        "",
        "## Recent Entries",
        "",
        "| Time | Event | Format | Note |",
        "| --- | --- | --- | --- |",
    ])
    for entry in entries[-RECENT_LIMIT:]:
        lines.append(
            f"| `{clean_cell(str(entry.get('time', '')) )}` | "
            f"`{clean_cell(str(entry.get('event', '')) )}` | "
            f"{entry_format(entry)} | {clean_cell(entry_note(entry))} |"
        )

    lines.extend([
        "",
        "## Latest Structured Next Items",
        "",
    ])
    if latest_structured:
        for entry in latest_structured:
            event = str(entry.get("event", ""))
            next_items = entry.get("next")
            if not isinstance(next_items, list) or not next_items:
                continue
            lines.append(f"### `{event}`")
            lines.append("")
            for item in next_items:
                lines.append(f"- {item}")
            lines.append("")
    else:
        lines.append("- No structured entries yet.")

    lines.extend([
        "## Does Not Prove",
        "",
        "This summary proves only that the research log was parsed and summarized. It does not prove the truth of historical claims, run missing forward tests, install the plugin, promote human feedback, or prove NWN runtime behavior.",
    ])

    return "\n".join(lines).rstrip() + "\n"


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
