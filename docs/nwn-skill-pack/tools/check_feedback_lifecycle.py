#!/usr/bin/env python3
"""Check feedback inbox lifecycle invariants."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType
from typing import Any


INBOX_DIRS = ("incoming", "reviewed", "promoted", "rejected")
REVIEWED_STATES = {"reviewed", "promoted", "rejected"}
LIFECYCLE_POLICY = Path("knowledge-inbox/lifecycle-policy.md")


@dataclass
class LifecycleCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def load_module(path: Path, name: str) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def collect_records(root: Path) -> dict[str, list[tuple[Path, dict[str, Any], list[str]]]]:
    feedback = load_module(root / "tools" / "nwn_skill_feedback.py", "nwn_skill_feedback_lifecycle")
    records: dict[str, list[tuple[Path, dict[str, Any], list[str]]]] = {}
    for directory in INBOX_DIRS:
        records[directory] = []
        for path in sorted((root / "knowledge-inbox" / directory).glob("*.json")):
            try:
                data = load_json(path)
                errors = feedback.validate_record(data)
            except Exception as exc:
                data = {}
                errors = [str(exc)]
            records[directory].append((path, data, errors))
    return records


def review_state(data: dict[str, Any]) -> str:
    review = data.get("review")
    if isinstance(review, dict):
        return str(review.get("decision", "")).strip()
    return ""


def promotion_ready(data: dict[str, Any]) -> bool:
    review = data.get("review")
    return isinstance(review, dict) and review.get("promotion_ready") is True


def run(root: Path) -> LifecycleCheck:
    result = LifecycleCheck()
    policy = root / LIFECYCLE_POLICY
    if not policy.exists():
        result.error(f"{LIFECYCLE_POLICY} is missing")
        return result

    text = policy.read_text(encoding="utf-8")
    required_tokens = [
        "source history",
        "Incoming With Existing Review Copy",
        "Do not delete raw incoming records",
        "promotion_ready",
        "accept-for-promotion",
        "The backlog is triage. It does not prove",
    ]
    for token in required_tokens:
        if token not in text:
            result.error(f"{LIFECYCLE_POLICY} missing token: {token}")
    if not result.errors:
        result.ok("feedback lifecycle policy preserves audit-history and no-proof boundaries")

    try:
        records = collect_records(root)
    except Exception as exc:
        result.error(f"could not collect feedback records: {exc}")
        return result

    ids_by_state: dict[str, set[str]] = defaultdict(set)
    locations_by_id: dict[str, list[tuple[str, Path, dict[str, Any]]]] = defaultdict(list)
    total = 0
    for directory, entries in records.items():
        for path, data, errors in entries:
            total += 1
            relative = path.relative_to(root)
            if errors:
                result.error(f"{relative} failed feedback record validation: {'; '.join(errors)}")
                continue
            record_id = str(data.get("id", "")).strip()
            if not record_id:
                result.error(f"{relative} has blank id")
                continue
            ids_by_state[directory].add(record_id)
            locations_by_id[record_id].append((directory, relative, data))

            status = data.get("status")
            if directory == "incoming" and status in {"promoted", "rejected", "superseded"}:
                result.error(f"{relative} is incoming but has terminal status {status!r}")
            if directory == "promoted" and status != "promoted":
                result.error(f"{relative} is in promoted/ but status is {status!r}")
            if directory == "rejected" and status != "rejected":
                result.error(f"{relative} is in rejected/ but status is {status!r}")
            if directory in REVIEWED_STATES and "review" not in data:
                result.error(f"{relative} is in {directory}/ but has no review object")
            if directory == "incoming" and "review" in data:
                result.error(f"{relative} is incoming but already contains review metadata")
            if directory == "rejected" and promotion_ready(data):
                result.error(f"{relative} is rejected but review.promotion_ready=true")
            if directory == "promoted" and not promotion_ready(data):
                result.error(f"{relative} is promoted but review.promotion_ready is not true")
            if directory == "promoted" and review_state(data) != "accept-for-promotion":
                result.error(f"{relative} is promoted but review.decision is not accept-for-promotion")

    if total == 0:
        result.error("no feedback records found in knowledge-inbox lifecycle folders")
        return result
    result.ok(f"feedback lifecycle scanned {total} record file(s)")

    incoming_with_review_copy = ids_by_state["incoming"] & (
        ids_by_state["reviewed"] | ids_by_state["promoted"] | ids_by_state["rejected"]
    )
    incoming_needing_review = ids_by_state["incoming"] - incoming_with_review_copy
    result.ok(f"incoming source-history copies: {len(incoming_with_review_copy)}")
    result.ok(f"incoming records needing review: {len(incoming_needing_review)}")

    for record_id, locations in sorted(locations_by_id.items()):
        directories = {directory for directory, _, _ in locations}
        if "promoted" in directories and "rejected" in directories:
            paths = ", ".join(str(path) for _, path, _ in locations)
            result.error(f"{record_id} appears in both promoted and rejected states: {paths}")
        if "promoted" in directories:
            promoted_records = [data for directory, _, data in locations if directory == "promoted"]
            for data in promoted_records:
                evidence = data.get("evidence", [])
                proposed = data.get("proposed_skill_update", {})
                target = ""
                if isinstance(proposed, dict):
                    target = str(proposed.get("file", "")).strip()
                if not evidence:
                    result.error(f"{record_id} promoted record has no evidence")
                if not target:
                    result.error(f"{record_id} promoted record has no proposed_skill_update.file")

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
            print(f"Feedback lifecycle check failed: {len(result.errors)} error(s)")
        else:
            print("Feedback lifecycle check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
