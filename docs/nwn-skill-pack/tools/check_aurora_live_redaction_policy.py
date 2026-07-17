#!/usr/bin/env python3
"""Check Aurora live-evidence redaction policy and submitted live-record text."""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


POLICY = Path("knowledge-inbox/aurora-live-redaction-policy.md")
RECORD_DIR = Path("knowledge-inbox/aurora-live-records")

REQUIRED_TOKENS = [
    "Aurora Live Evidence Redaction Policy",
    "knowledge-inbox/aurora-live-records/*.json",
    "knowledge-inbox/aurora-live-evidence-manifests/*.json",
    "knowledge-inbox/templates/aurora-live-evidence-manifest-template.json",
    "knowledge-inbox/aurora-live-visual-redaction-checklist.md",
    "knowledge-inbox/aurora-live-visual-redaction-records/aggregate.md",
    "aurora-live-review-queue.md",
    "aurora-live-record-review-checklist.md",
    "credentials",
    "passwords",
    "bearer tokens",
    "API keys",
    "IP addresses",
    "account names",
    "player names",
    "private module",
    "absolute user paths",
    "raw decompilation",
    "raw symbol dumps",
    "private player data",
    "<redacted-ip>",
    "<redacted-user>",
    "<module-copy-id>",
    "check_aurora_live_redaction_policy.py",
    "check_aurora_live_visual_redaction_checklist.py",
    "aurora_live_visual_redaction_record.py",
    "check_aurora_live_visual_redaction_records.py",
    "check_aurora_live_evidence_manifest.py",
    "does not prove that images or external logs are visually redacted",
    "promotion_ready=true",
    "Still Hypothesis",
]

TEXT_PATTERNS = [
    ("email address", re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")),
    ("IPv4 address", re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")),
    ("windows user path", re.compile(r"[A-Za-z]:\\Users\\[^\\\s]+", re.IGNORECASE)),
    ("home user path", re.compile(r"/home/[^/\s]+", re.IGNORECASE)),
    ("password assignment", re.compile(r"\b(password|passwd|pwd)\s*[:=]", re.IGNORECASE)),
    ("token assignment", re.compile(r"\b(token|bearer|session[_-]?id|cookie|api[_-]?key|secret)\s*[:=]", re.IGNORECASE)),
    ("raw Aurora export filename", re.compile(r"\b(decompiled_all\.c|functions\.tsv|strings\.tsv|xrefs_domain\.txt)\b", re.IGNORECASE)),
    ("private key marker", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
]


@dataclass
class RedactionCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def iter_text(value: Any, prefix: str = "$") -> list[tuple[str, str]]:
    found: list[tuple[str, str]] = []
    if isinstance(value, str):
        found.append((prefix, value))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            found.extend(iter_text(item, f"{prefix}[{index}]"))
    elif isinstance(value, dict):
        for key, item in value.items():
            found.extend(iter_text(item, f"{prefix}.{key}"))
    return found


def check_policy(result: RedactionCheck, root: Path) -> None:
    path = root / POLICY
    if not path.exists():
        result.error(f"{POLICY} is missing")
        return
    text = path.read_text(encoding="utf-8")
    missing = [token for token in REQUIRED_TOKENS if token not in text]
    if missing:
        result.error(f"{POLICY} missing tokens: {', '.join(missing)}")
    else:
        result.ok("redaction policy includes required private-data, raw-reverse, checker, and promotion-boundary tokens")


def check_records(result: RedactionCheck, root: Path) -> None:
    record_root = root / RECORD_DIR
    if not record_root.exists():
        result.ok("Aurora live-record directory does not exist yet; no submitted record text to scan")
        return
    paths = sorted(record_root.glob("*.json"))
    if not paths:
        result.ok("Aurora live-record directory is empty; no submitted record text to scan")
        return

    issue_count = 0
    for path in paths:
        try:
            data = load_json(path)
        except Exception as exc:
            result.error(f"{path.relative_to(root)} is not valid JSON for redaction scan: {exc}")
            continue
        for location, text in iter_text(data):
            for label, pattern in TEXT_PATTERNS:
                if pattern.search(text):
                    issue_count += 1
                    result.error(
                        f"{path.relative_to(root)} {location} contains possible {label}; redact before review"
                    )
    if issue_count == 0:
        result.ok(f"scanned {len(paths)} Aurora live-record file(s) with no obvious text redaction issues")


def run(root: Path) -> RedactionCheck:
    result = RedactionCheck()
    check_policy(result, root)
    check_records(result, root)
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
            print(f"Aurora live redaction policy check failed: {len(result.errors)} error(s)")
        else:
            print("Aurora live redaction policy check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
