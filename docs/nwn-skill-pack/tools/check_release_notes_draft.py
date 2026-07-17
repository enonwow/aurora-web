#!/usr/bin/env python3
"""Check whether release-notes-draft.md is current and honest."""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path


NOTES_PATH = Path("release-notes-draft.md")
GENERATED_RE = re.compile(r"^Generated: .+$", re.MULTILINE)


@dataclass
class ReleaseNotesCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def normalize(text: str) -> str:
    return GENERATED_RE.sub("Generated: <ignored>", text).replace("\r\n", "\n")


def load_generator(root: Path):
    tool_path = root / "tools" / "generate_release_notes_draft.py"
    if not tool_path.exists():
        raise FileNotFoundError(f"release notes generator is missing: {tool_path}")

    spec = importlib.util.spec_from_file_location("generate_release_notes_draft", tool_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not import release notes generator: {tool_path}")

    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    if not hasattr(module, "generate"):
        raise RuntimeError("release notes generator does not expose generate(root)")
    return module.generate


def run(root: Path) -> ReleaseNotesCheck:
    result = ReleaseNotesCheck()
    notes_path = root / NOTES_PATH
    manifest_path = root / "version-manifest.json"
    if not notes_path.exists():
        result.error(f"{NOTES_PATH} is missing")
        return result
    if not manifest_path.exists():
        result.error("version-manifest.json is missing")
        return result

    text = notes_path.read_text(encoding="utf-8")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    required_tokens = [
        "Release Notes Draft",
        str(manifest.get("package_name", "")),
        str(manifest.get("version", "")),
        "repo artifact",
        "Proposed SemVer class: NONE",
        "Accepted promotion records counted: 0",
        "What This Helps With",
        "NUI",
        "NWScript",
        "2DA",
        "HAK",
        "TLK",
        "NWSync",
        "NWNX",
        "Verified Locally",
        "Known Gaps",
        "zero prompt forward tests",
        "zero install smoke tests",
        "not a release candidate",
        "Local Aurora reverse/thread leads",
        "release-routing material only",
        "not a release-note claim of strengthened skill behavior",
        "Feedback Path",
        "reference promotion proposal",
        "reference promotion record",
        "run_repo_artifact_preflight.py",
        "check_plugin_package.py",
        "check_release_gate.py",
        "Does Not Prove",
        "does not promote local Aurora reverse/thread leads into installed skill guidance",
    ]
    for token in required_tokens:
        if token not in text:
            result.error(f"{NOTES_PATH} missing token: {token}")
    if not result.errors:
        result.ok("release notes draft includes required state, evidence, gap, and feedback tokens")

    try:
        generator = load_generator(root)
        current = generator(root)
    except Exception as exc:
        result.error(f"release notes freshness check failed: {exc}")
        return result

    if normalize(text) == normalize(current):
        result.ok("release-notes-draft.md matches current generated draft except timestamp")
    else:
        result.error(
            "release-notes-draft.md is stale; regenerate with tools/generate_release_notes_draft.py"
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
            print(f"Release notes draft check failed: {len(result.errors)} error(s)")
        else:
            print("Release notes draft check passed")

    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
