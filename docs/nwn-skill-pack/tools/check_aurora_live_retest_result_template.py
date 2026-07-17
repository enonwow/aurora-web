#!/usr/bin/env python3
"""Check the Aurora live retest result template."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path


RESULT_TEMPLATE = Path("knowledge-inbox/aurora-live-retest-result-template.md")

REQUIRED_TOKENS = {
    "Aurora Live Retest Result Template",
    "aurora-live-retest-dispatch.md",
    "check_aurora_live_retest_dispatch.py",
    "check_aurora_live_retest_dispatch_roundtrip.py",
    "check_aurora_live_retest_result_template.py",
    "aurora_toolset_live_record.py validate",
    "aurora-live-YYYYMMDD-small-location-first-pass.json",
    "check_aurora_live_records.py",
    "check_aurora_live_evidence_manifest.py",
    "check_aurora_live_intake_consistency.py",
    "check_aurora_live_redaction_policy.py",
    "check_aurora_live_visual_redaction_checklist.py",
    "aurora_live_visual_redaction_record.py aggregate",
    "check_aurora_live_visual_redaction_records.py",
    "aurora_live_retest_result_record.py new",
    "aurora_live_retest_result_record.py validate",
    "aurora_live_retest_result_record.py aggregate",
    "check_aurora_live_retest_result_records.py",
    "aurora-live-retest-results",
    "aurora_live_review_outcome_record.py from-live-record",
    "--dry-run",
    "hold-for-retest",
    "check_aurora_live_review_outcome_records.py",
    "generate_aurora_live_review_queue.py",
    "generate_aurora_live_retest_dispatch.py",
    "generate_aurora_live_status.py",
    "generate_release_evidence_index.py",
    "check_release_evidence_index.py",
    "Source dispatch path",
    "Dispatch manifest path",
    "Source review outcome ID",
    "Target atom",
    "Requested next action",
    "Retest result",
    "pass",
    "partial",
    "fail",
    "blocked",
    "not installed skill content",
    "not docs/RAG source material",
    "not NWN runtime proof by itself",
    "not privacy proof by itself",
    "not release readiness",
    "not an automatic skill update",
    "Toolset UI evidence is not runtime proof.",
    "quarantine",
    "automatic skill improvement",
}

PRIVACY_TOKENS = {
    "raw decompilation",
    "private module",
    "private player data",
    "account names",
    "IP addresses",
    "tokens",
    "credentials",
    "unredacted private server logs",
}

STALE_TOKENS = {
    "aurora-live-YYYYMMDD-small-location.json",
}


@dataclass
class RetestResultTemplateCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def require_tokens(
    result: RetestResultTemplateCheck,
    label: str,
    text: str,
    tokens: set[str],
    case_sensitive: bool = True,
) -> None:
    haystack = text if case_sensitive else text.lower()
    missing = []
    for token in sorted(tokens):
        needle = token if case_sensitive else token.lower()
        if needle not in haystack:
            missing.append(token)
    if missing:
        result.error(f"{label} missing tokens: {', '.join(missing)}")
    else:
        result.ok(f"{label} includes required tokens")


def require_manifest_path(
    result: RetestResultTemplateCheck,
    root: Path,
    manifest: dict[str, object],
    key: str,
    expected: str,
    label: str,
) -> None:
    value = manifest.get(key)
    if value != expected:
        result.error(f"version manifest {key} must point at {expected}")
        return
    if not (root / expected).exists():
        result.error(f"manifest artifact does not exist for {label}: {expected}")
        return
    result.ok(f"version manifest points at {label}")


def load_manifest(path: Path) -> dict[str, object]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError("version-manifest.json must contain a JSON object")
    return data


def run(root: Path) -> RetestResultTemplateCheck:
    result = RetestResultTemplateCheck()
    path = root / RESULT_TEMPLATE
    if not path.exists():
        result.error(f"{RESULT_TEMPLATE} is missing")
        return result

    result.ok(f"{RESULT_TEMPLATE} exists")
    text = path.read_text(encoding="utf-8")
    require_tokens(result, "retest result template workflow", text, REQUIRED_TOKENS)
    require_tokens(result, "retest result template privacy guidance", text, PRIVACY_TOKENS, case_sensitive=False)
    stale = sorted(token for token in STALE_TOKENS if token in text)
    if stale:
        result.error(f"retest result template contains stale first-pass path tokens: {', '.join(stale)}")
    else:
        result.ok("retest result template does not contain stale pre-first-pass path tokens")

    try:
        manifest = load_manifest(root / "version-manifest.json")
    except Exception as exc:
        result.error(f"could not read version manifest: {exc}")
        return result

    require_manifest_path(
        result,
        root,
        manifest,
        "aurora_live_retest_result_template",
        RESULT_TEMPLATE.as_posix(),
        "Aurora live retest result template",
    )
    require_manifest_path(
        result,
        root,
        manifest,
        "aurora_live_retest_result_template_check",
        "tools/check_aurora_live_retest_result_template.py",
        "Aurora live retest result template checker",
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
            print(f"Aurora live retest result template check failed: {len(result.errors)} error(s)")
        else:
            print("Aurora live retest result template check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
