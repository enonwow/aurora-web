#!/usr/bin/env python3
"""Prepare an Aurora Toolset live session record, evidence folders, and evidence manifest."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_RECORD_DIR = Path("knowledge-inbox/aurora-live-records")
DEFAULT_MANIFEST_DIR = Path("knowledge-inbox/aurora-live-evidence-manifests")
DEFAULT_EVIDENCE_DIR = Path(".codex-tmp/aurora-live-evidence")


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def safe_slug(value: str) -> str:
    cleaned = []
    for char in value.strip().lower():
        if char.isalnum():
            cleaned.append(char)
        elif char in {"-", "_", ".", " "}:
            cleaned.append("-")
    slug = "".join(cleaned).strip("-")
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug or "small-location"


def display_path(path: Path) -> str:
    return str(path).replace("\\", "/")


def run_command(command: list[str]) -> str:
    completed = subprocess.run(
        command,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if completed.returncode != 0:
        raise RuntimeError(completed.stdout.strip())
    return completed.stdout.strip()


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def build_paths(args: argparse.Namespace) -> dict[str, Path | str]:
    root = Path(args.root)
    date = args.date or utc_now().strftime("%Y%m%d")
    scenario = safe_slug(args.scenario)
    record_id = args.record_id or f"aurora-live-{date}-{scenario}"
    manifest_id = args.manifest_id or f"aurora-live-evidence-manifest-{date}-{scenario}"

    record_path = Path(args.record_out) if args.record_out else root / DEFAULT_RECORD_DIR / f"{record_id}.json"
    manifest_path = (
        Path(args.manifest_out)
        if args.manifest_out
        else root / DEFAULT_MANIFEST_DIR / f"{manifest_id}.json"
    )
    evidence_root = Path(args.evidence_dir) if args.evidence_dir else root / DEFAULT_EVIDENCE_DIR / record_id

    return {
        "root": root,
        "date": date,
        "scenario": scenario,
        "record_id": record_id,
        "manifest_id": manifest_id,
        "record_path": record_path,
        "manifest_path": manifest_path,
        "evidence_root": evidence_root,
    }


def prepare_session(args: argparse.Namespace) -> dict[str, str]:
    paths = build_paths(args)
    root = paths["root"]
    record_id = str(paths["record_id"])
    manifest_id = str(paths["manifest_id"])
    record_path = Path(paths["record_path"])
    manifest_path = Path(paths["manifest_path"])
    evidence_root = Path(paths["evidence_root"])

    record_tool = root / "tools" / "init_aurora_live_record.py"
    manifest_tool = root / "tools" / "init_aurora_live_evidence_manifest.py"
    record_validator = root / "tools" / "aurora_toolset_live_record.py"
    manifest_validator = root / "tools" / "check_aurora_live_evidence_manifest.py"

    if not args.force:
        existing = [path for path in [record_path, manifest_path] if path.exists()]
        if existing:
            raise FileExistsError(
                "output already exists, pass --force to overwrite: "
                + ", ".join(str(path) for path in existing)
            )

    record_command = [
        sys.executable,
        str(record_tool),
        str(root),
        "--operator",
        args.operator,
        "--date",
        str(paths["date"]),
        "--record-id",
        record_id,
        "--toolset-version",
        args.toolset_version,
        "--nwn-version",
        args.nwn_version,
        "--module-path-or-copy-id",
        args.module_path_or_copy_id,
        "--evidence-dir",
        str(evidence_root),
        "--out",
        str(record_path),
        "--create-evidence-dirs",
    ]
    for hak in args.hak:
        record_command.extend(["--hak", hak])
    if args.custom_tlk:
        record_command.extend(["--custom-tlk", args.custom_tlk])
    for reference in args.candidate_reference:
        record_command.extend(["--candidate-reference", reference])
    if args.notes:
        record_command.extend(["--notes", args.notes])
    if args.force:
        record_command.append("--force")

    record_output = run_command(record_command)

    manifest_command = [
        sys.executable,
        str(manifest_tool),
        str(root),
        "--live-record",
        str(record_path),
        "--live-record-path",
        display_path(DEFAULT_RECORD_DIR / f"{record_id}.json"),
        "--evidence-dir",
        display_path(root / DEFAULT_EVIDENCE_DIR / record_id),
        "--date",
        str(paths["date"]),
        "--record-id",
        record_id,
        "--manifest-id",
        manifest_id,
        "--out",
        str(manifest_path),
    ]
    if args.force:
        manifest_command.append("--force")

    manifest_output = run_command(manifest_command)
    live_record_check = run_command([sys.executable, str(record_validator), "validate", str(record_path)])
    manifest_data = load_json(manifest_path)
    if manifest_data.get("live_record_id") != record_id:
        raise ValueError("evidence manifest live_record_id does not match prepared record id")
    if manifest_data.get("redaction_reviewed") is not False:
        raise ValueError("prepared evidence manifest must start redaction_reviewed=false")
    if not manifest_data.get("artifacts"):
        raise ValueError("prepared evidence manifest must include a placeholder artifact row")

    # The submitted-manifest checker scans repo manifests only; use it here to keep
    # template and checker imports exercised during a full preparation run.
    manifest_template_check = run_command([sys.executable, str(manifest_validator), str(root)])

    return {
        "record_id": record_id,
        "manifest_id": manifest_id,
        "record_path": str(record_path),
        "manifest_path": str(manifest_path),
        "evidence_root": str(evidence_root),
        "screenshots_path": str(evidence_root / "screenshots"),
        "logs_path": str(evidence_root / "logs"),
        "record_output": record_output,
        "manifest_output": manifest_output,
        "live_record_check": live_record_check,
        "manifest_template_check": manifest_template_check,
    }


def command_prepare(args: argparse.Namespace) -> int:
    try:
        result = prepare_session(args)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"Prepared live record: {result['record_path']}")
        print(f"Prepared evidence manifest: {result['manifest_path']}")
        print(f"Prepared screenshots folder: {result['screenshots_path']}")
        print(f"Prepared logs folder: {result['logs_path']}")
        print("All atoms remain not-run/local-reverse-lead and artifact rows remain pending-redaction.")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--operator", required=True)
    parser.add_argument("--scenario", default="small-location")
    parser.add_argument("--date", help="Date stamp for ids, e.g. 20260618.")
    parser.add_argument("--record-id", help="Explicit live record id.")
    parser.add_argument("--manifest-id", help="Explicit evidence manifest id.")
    parser.add_argument("--toolset-version", default="")
    parser.add_argument("--nwn-version", default="")
    parser.add_argument("--module-path-or-copy-id", default="")
    parser.add_argument("--hak", action="append", default=[], help="HAK dependency. Repeat as needed.")
    parser.add_argument("--custom-tlk", default="")
    parser.add_argument(
        "--candidate-reference",
        action="append",
        default=[],
        help="Reference path that may receive promoted guidance. Repeat as needed.",
    )
    parser.add_argument("--notes", default="")
    parser.add_argument("--evidence-dir", help="Base evidence directory.")
    parser.add_argument("--record-out", help="Output live-record JSON path.")
    parser.add_argument("--manifest-out", help="Output evidence-manifest JSON path.")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--json", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return command_prepare(args)


if __name__ == "__main__":
    raise SystemExit(main())
