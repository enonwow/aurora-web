#!/usr/bin/env python3
"""Check the Aurora live promotion proof-gate dashboard."""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path


DASHBOARD_PATH = Path("aurora-live-promotion-proof-gates.md")
GENERATED_RE = re.compile(r"^Generated: .+$", re.MULTILINE)


@dataclass
class CheckResult:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def normalize(text: str) -> str:
    return GENERATED_RE.sub("Generated: <ignored>", text).replace("\r\n", "\n")


def load_generator(root: Path):
    path = root / "tools" / "generate_aurora_live_promotion_proof_gates.py"
    if not path.exists():
        raise FileNotFoundError(f"proof-gates generator is missing: {path}")
    spec = importlib.util.spec_from_file_location("generate_aurora_live_promotion_proof_gates", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not import proof-gates generator: {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    if not hasattr(module, "generate"):
        raise RuntimeError("proof-gates generator does not expose generate(root)")
    return module.generate


def run(root: Path) -> CheckResult:
    result = CheckResult()
    dashboard = root / DASHBOARD_PATH
    manifest_path = root / "version-manifest.json"
    if not dashboard.exists():
        result.error(f"{DASHBOARD_PATH} is missing")
        return result
    if not manifest_path.exists():
        result.error("version-manifest.json is missing")
        return result

    text = dashboard.read_text(encoding="utf-8")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    required_tokens = [
        "Aurora Live Promotion Proof Gates",
        str(manifest.get("package_name", "")),
        str(manifest.get("version", "")),
        "Retest records path",
        "Promotion decision records path",
        "Bridge status",
        "Gate Snapshot",
        "source-retail-retest-pass-records",
        "promotion-bridge-candidates",
        "maintainer-promotion-decision",
        "reference-patch-and-release-sync",
        "release-candidate-gate",
        "Retest Result Counts",
        "Promotion Decision Counts",
        "Current Blocking Path",
        "do not patch from a synthetic or blocked retest",
        "Release-Candidate Blockers",
        "check_aurora_live_retest_result_records.py",
        "check_aurora_live_retest_promotion_bridge.py",
        "check_aurora_live_retest_promotion_decision.py",
        "check_reference_promotion_records.py",
        "generate_aurora_live_promotion_proof_gates.py",
        "check_aurora_live_promotion_proof_gates.py",
        "Does Not Prove",
        "automatic skill improvement",
    ]
    for token in required_tokens:
        if token not in text:
            result.error(f"{DASHBOARD_PATH} missing token: {token}")
    if not result.errors:
        result.ok("proof-gates dashboard includes required gate, command, and boundary tokens")

    try:
        generator = load_generator(root)
        current = generator(root)
    except Exception as exc:
        result.error(f"proof-gates freshness check failed: {exc}")
        return result

    if normalize(text) == normalize(current):
        result.ok("aurora-live-promotion-proof-gates.md matches current generated dashboard except timestamp")
    else:
        result.error(
            "aurora-live-promotion-proof-gates.md is stale; regenerate with tools/generate_aurora_live_promotion_proof_gates.py"
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
            print(f"Aurora live promotion proof-gates check failed: {len(result.errors)} error(s)")
        else:
            print("Aurora live promotion proof-gates check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
