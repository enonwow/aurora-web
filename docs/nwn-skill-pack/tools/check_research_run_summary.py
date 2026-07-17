#!/usr/bin/env python3
"""Check whether research-run-summary.md matches the current research log."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path


SUMMARY_PATH = Path("research-run-summary.md")


@dataclass
class SummaryCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def load_generator(root: Path):
    tool_path = root / "tools" / "generate_research_run_summary.py"
    if not tool_path.exists():
        raise FileNotFoundError(f"research run summary generator is missing: {tool_path}")
    spec = importlib.util.spec_from_file_location("generate_research_run_summary", tool_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not import research run summary generator: {tool_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    if not hasattr(module, "generate"):
        raise RuntimeError("research run summary generator does not expose generate(root)")
    return module.generate


def run(root: Path) -> SummaryCheck:
    result = SummaryCheck()
    path = root / SUMMARY_PATH
    if not path.exists():
        result.error(f"{SUMMARY_PATH} is missing")
        return result

    text = path.read_text(encoding="utf-8")
    required_tokens = [
        "Research Run Summary",
        "Source: `research-run-log.jsonl`",
        "Legacy summary entries",
        "Structured audit entries",
        "Preflight audit entries",
        "Event Families",
        "Recent Entries",
        "Latest Structured Next Items",
        "Does Not Prove",
        "does not prove the truth of historical claims",
    ]
    for token in required_tokens:
        if token not in text:
            result.error(f"{SUMMARY_PATH} missing token: {token}")
    if not result.errors:
        result.ok("research run summary includes required audit and boundary tokens")

    try:
        generator = load_generator(root)
        expected = generator(root)
    except Exception as exc:
        result.error(f"research run summary freshness check failed: {exc}")
        return result

    if text.replace("\r\n", "\n") == expected.replace("\r\n", "\n"):
        result.ok("research-run-summary.md matches current generated summary")
    else:
        result.error(
            "research-run-summary.md is stale; regenerate with tools/generate_research_run_summary.py"
        )

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
            print(f"Research run summary check failed: {len(result.errors)} error(s)")
        else:
            print("Research run summary check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
