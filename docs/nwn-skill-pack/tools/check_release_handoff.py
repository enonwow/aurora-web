#!/usr/bin/env python3
"""Check release handoff template structure and filled handoff readiness."""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path


HANDOFF_TEMPLATE_PATH = Path("release-handoff-template.md")
VERSION_MANIFEST_PATH = Path("version-manifest.json")
REQUIRED_SECTIONS = [
    "## Handoff State",
    "## Release Notes Template",
    "## Receiver Instructions",
    "## Feedback Record Command Template",
    "## Reviewer Acceptance",
    "## Stop Conditions",
]
REQUIRED_TOKENS = [
    "Current draft package state:",
    "Contributor-facing intake packet:",
    "docs/nwn-skill-pack/contributor-feedback-packet.md",
    "python docs\\nwn-skill-pack\\tools\\nwn_skill_feedback.py new",
    "python docs\\nwn-skill-pack\\tools\\nwn_skill_feedback.py review",
    "docs/nwn-skill-pack/knowledge-inbox/templates/user-feedback-form.md",
    "docs/nwn-skill-pack/knowledge-inbox/templates/github-issue-body.md",
    "Do not hand off as installable when:",
]
PLACEHOLDER_PATTERNS = [
    r"<[^>\n]+>",
]
EMPTY_RELEASE_NOTE_FIELD_RE = re.compile(r"^- [A-Za-z0-9 /_-][A-Za-z0-9 /_-]*:\s*$", re.MULTILINE)
FILLED_HANDOFF_REQUIRED_SECTIONS = [
    "## Handoff State",
    "## State",
    "## Verified In This Release",
    "## Known Gaps",
    "## Feedback Path",
    "## Receiver Instructions",
    "## Stop Conditions",
]


@dataclass
class HandoffCheck:
    checks: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def handoff_state(text: str) -> str:
    marker = "Current draft package state:"
    for line in text.splitlines():
        if marker not in line:
            continue
        raw_state = line.split(marker, 1)[1].strip()
        if "`" in raw_state:
            parts = raw_state.split("`")
            if len(parts) >= 3:
                return parts[1].strip()
        return raw_state.strip("`").rstrip(".").strip()
    return ""


def read_version_manifest(root: Path) -> dict[str, object]:
    path = root / VERSION_MANIFEST_PATH
    if not path.exists():
        return {}
    import json

    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        return {}
    return data


def configured_release_handoff(root: Path) -> Path | None:
    manifest = read_version_manifest(root)
    raw_path = manifest.get("release_handoff")
    if not isinstance(raw_path, str) or not raw_path.strip():
        return None
    return Path(raw_path.strip())


def resolve_path(root: Path, path: Path) -> Path:
    if path.is_absolute():
        return path
    return root / path


def check_template(result: HandoffCheck, root: Path) -> str:
    path = root / HANDOFF_TEMPLATE_PATH
    if not path.exists():
        result.error(f"{HANDOFF_TEMPLATE_PATH} is missing")
        return ""

    text = path.read_text(encoding="utf-8")
    for section in REQUIRED_SECTIONS:
        if section in text:
            result.ok(f"template section exists: {section}")
        else:
            result.error(f"template missing section: {section}")

    for token in REQUIRED_TOKENS:
        if token in text:
            result.ok(f"template required token exists: {token}")
        else:
            result.error(f"template missing required token: {token}")

    state = handoff_state(text)
    if state:
        result.ok(f"template handoff state marker found: {state}")
    else:
        result.error("template handoff state marker is missing")

    if state == "repo artifact":
        result.warn("handoff template is process scaffolding; use the concrete release_handoff path before RC")

    return text


def filled_handoff_problems(text: str) -> list[str]:
    problems: list[str] = []
    state = handoff_state(text)
    if not state:
        problems.append("filled handoff state marker is missing")

    for section in FILLED_HANDOFF_REQUIRED_SECTIONS:
        if section not in text:
            problems.append(f"filled handoff missing section: {section}")

    for pattern in PLACEHOLDER_PATTERNS:
        if re.search(pattern, text):
            problems.append(f"filled handoff still contains placeholder pattern: {pattern}")

    empty_fields = EMPTY_RELEASE_NOTE_FIELD_RE.findall(text)
    if empty_fields:
        problems.append(f"filled handoff still has empty release-note fields: {len(empty_fields)}")

    return problems


def check_concrete_handoff(
    result: HandoffCheck,
    root: Path,
    handoff_path: Path,
    require_filled: bool,
) -> None:
    path = resolve_path(root, handoff_path)
    display_path = str(handoff_path).replace("\\", "/")
    if not path.exists():
        message = f"configured release handoff is missing: {display_path}"
        if require_filled:
            result.error(message)
        else:
            result.warn(message)
        return

    text = path.read_text(encoding="utf-8")
    result.ok(f"configured release handoff exists: {display_path}")
    state = handoff_state(text)
    if state:
        result.ok(f"configured release handoff state marker found: {state}")

    problems = filled_handoff_problems(text)
    if problems:
        for problem in problems:
            if require_filled:
                result.error(problem)
            else:
                result.warn(problem)
    else:
        result.ok("configured release handoff has no placeholder or empty release-note fields")


def run(
    root: Path,
    require_filled: bool,
    handoff_path: Path | None = None,
) -> HandoffCheck:
    result = HandoffCheck()
    check_template(result, root)

    concrete_path = handoff_path if handoff_path is not None else configured_release_handoff(root)
    if concrete_path is None:
        message = "version-manifest.json has no release_handoff path"
        if require_filled:
            result.error(message)
        else:
            result.warn(message)
        return result

    check_concrete_handoff(result, root, concrete_path, require_filled)

    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--require-filled", action="store_true")
    parser.add_argument(
        "--handoff",
        help="Concrete handoff path to check. Defaults to version-manifest.json release_handoff.",
    )
    args = parser.parse_args()

    handoff_path = Path(args.handoff) if args.handoff else None
    result = run(Path(args.root), args.require_filled, handoff_path=handoff_path)
    for check in result.checks:
        print(f"OK: {check}")
    for warning in result.warnings:
        print(f"WARN: {warning}")
    for error in result.errors:
        print(f"ERROR: {error}")
    if result.errors:
        print(f"Release handoff check failed: {len(result.errors)} error(s)")
    else:
        print("Release handoff check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
