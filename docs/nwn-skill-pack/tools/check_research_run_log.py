#!/usr/bin/env python3
"""Validate the NWN skill-pack research loop JSONL run log."""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


LOG_PATH = Path("research-run-log.jsonl")
TIME_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")
EVENT_RE = re.compile(r"^[a-z0-9]+(?:_[a-z0-9]+)*$")


@dataclass
class LogCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def parse_time(value: str) -> datetime | None:
    if not TIME_RE.match(value):
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def require_string_list(
    result: LogCheck,
    entry: dict[str, Any],
    field_name: str,
    line_number: int,
) -> None:
    value = entry.get(field_name)
    if not isinstance(value, list) or not value:
        result.error(f"line {line_number}: {field_name} must be a non-empty list")
        return
    for index, item in enumerate(value):
        if not isinstance(item, str) or not item.strip():
            result.error(
                f"line {line_number}: {field_name}[{index}] must be a non-empty string"
            )


def run(root: Path) -> LogCheck:
    result = LogCheck()
    log_path = root / LOG_PATH
    if not log_path.exists():
        result.error(f"{LOG_PATH} is missing")
        return result

    lines = log_path.read_text(encoding="utf-8").splitlines()
    if not lines:
        result.error(f"{LOG_PATH} must contain at least one JSONL entry")
        return result

    previous_time: datetime | None = None
    events: set[str] = set()
    legacy_entries = 0
    structured_entries = 0
    preflight_events = 0
    for line_number, line in enumerate(lines, start=1):
        if not line.strip():
            result.error(f"line {line_number}: blank lines are not allowed")
            continue
        try:
            entry = json.loads(line)
        except json.JSONDecodeError as exc:
            result.error(f"line {line_number}: invalid JSON: {exc}")
            continue
        if not isinstance(entry, dict):
            result.error(f"line {line_number}: entry must be a JSON object")
            continue

        is_structured = any(field in entry for field in ["verified", "hypothesis", "next"])
        allowed_fields = {"time", "event", "verified", "hypothesis", "next"} if is_structured else {
            "time",
            "event",
            "summary",
            "automationId",
        }
        unexpected = sorted(set(entry) - allowed_fields)
        if unexpected:
            result.error(f"line {line_number}: unexpected fields: {', '.join(unexpected)}")

        timestamp = entry.get("time")
        if not isinstance(timestamp, str):
            result.error(f"line {line_number}: time must be a string")
            parsed_time = None
        else:
            parsed_time = parse_time(timestamp)
            if parsed_time is None:
                result.error(f"line {line_number}: time must use YYYY-MM-DDTHH:MM:SSZ")
            elif previous_time is not None and parsed_time < previous_time:
                result.error(f"line {line_number}: time moves backwards")
        if parsed_time is not None:
            previous_time = parsed_time

        event = entry.get("event")
        if not isinstance(event, str) or not EVENT_RE.match(event):
            result.error(
                f"line {line_number}: event must be lowercase snake_case with digits allowed"
            )
        else:
            events.add(event)
            if event.startswith("preflight_checked_"):
                preflight_events += 1

        if is_structured:
            structured_entries += 1
            for field_name in ["verified", "hypothesis", "next"]:
                require_string_list(result, entry, field_name, line_number)
        else:
            legacy_entries += 1
            summary = entry.get("summary")
            if not isinstance(summary, str) or not summary.strip():
                result.error(f"line {line_number}: legacy entry summary must be a non-empty string")

    if structured_entries == 0:
        result.error(f"{LOG_PATH} must contain at least one structured verified/hypothesis/next entry")
    if preflight_events == 0:
        result.error(f"{LOG_PATH} must contain at least one preflight_checked_* audit entry")
    if not result.errors:
        result.ok(f"{LOG_PATH} contains {len(lines)} valid entries")
        result.ok(f"{LOG_PATH} contains {legacy_entries} legacy summary entries")
        result.ok(f"{LOG_PATH} contains {structured_entries} structured audit entries")
        result.ok(f"{LOG_PATH} contains {len(events)} distinct event names")
        result.ok(f"{LOG_PATH} contains {preflight_events} preflight audit entries")
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
            print(f"Research run log check failed: {len(result.errors)} error(s)")
        else:
            print("Research run log check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
