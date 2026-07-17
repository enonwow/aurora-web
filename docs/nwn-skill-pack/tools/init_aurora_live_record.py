#!/usr/bin/env python3
"""Initialize an Aurora Toolset live-operator record from the checked template."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


TEMPLATE = Path("knowledge-inbox/templates/aurora-toolset-live-record-template.json")
DEFAULT_RECORD_DIR = Path("knowledge-inbox/aurora-live-records")
DEFAULT_EVIDENCE_DIR = Path(".codex-tmp/aurora-live-evidence")


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def timestamp_text(now: datetime) -> str:
    return now.isoformat().replace("+00:00", "Z")


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


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
    return str(path).replace("/", "\\")


def build_record(args: argparse.Namespace) -> tuple[dict[str, Any], Path, list[Path]]:
    root = Path(args.root)
    template_path = root / TEMPLATE
    data = load_json(template_path)

    now = utc_now()
    date = args.date or now.strftime("%Y%m%d")
    scenario = safe_slug(args.scenario)
    record_id = args.record_id or f"aurora-live-{date}-{scenario}"

    out_path = Path(args.out) if args.out else root / DEFAULT_RECORD_DIR / f"{record_id}.json"
    evidence_root = Path(args.evidence_dir) if args.evidence_dir else root / DEFAULT_EVIDENCE_DIR / record_id
    screenshots = Path(args.screenshots_folder) if args.screenshots_folder else evidence_root / "screenshots"
    logs = Path(args.log_folder) if args.log_folder else evidence_root / "logs"

    environment = data.setdefault("environment", {})
    if not isinstance(environment, dict):
        raise ValueError("template environment must be an object")

    data["id"] = record_id
    data["created_at"] = args.created_at or timestamp_text(now)
    data["operator"] = args.operator
    environment["toolset_version"] = args.toolset_version
    environment["nwn_version"] = args.nwn_version
    environment["module_path_or_copy_id"] = args.module_path_or_copy_id
    environment["hak_list"] = args.hak
    environment["custom_tlk"] = args.custom_tlk
    environment["screenshots_folder"] = display_path(screenshots)
    environment["log_folder"] = display_path(logs)

    promotion = data.setdefault("promotion", {})
    if not isinstance(promotion, dict):
        raise ValueError("template promotion must be an object")
    promotion["candidate_references"] = args.candidate_reference
    promotion["requires_reference_promotion_proposal"] = True
    promotion["notes"] = (
        args.notes
        or "Initialized only; no live observations captured yet. Keep all atoms not-run until Toolset evidence is captured."
    )

    data["overall_result"] = "not-run"
    for atom_record in data.get("atoms", []):
        if not isinstance(atom_record, dict):
            continue
        atom_record["status"] = "not-run"
        atom_record["evidence_label"] = "local-reverse-lead"
        atom_record["observations"] = []
        atom_record["artifacts"] = []
        atom_record["blockers"] = []
        atom_record["promotion_ready"] = False

    evidence_paths = [screenshots, logs]
    return data, out_path, evidence_paths


def command_init(args: argparse.Namespace) -> int:
    try:
        data, out_path, evidence_paths = build_record(args)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    if out_path.exists() and not args.force:
        print(f"ERROR: output already exists, pass --force to overwrite: {out_path}", file=sys.stderr)
        return 1

    out_path.parent.mkdir(parents=True, exist_ok=True)
    if args.create_evidence_dirs:
        for path in evidence_paths:
            path.mkdir(parents=True, exist_ok=True)

    out_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out_path}")
    if args.create_evidence_dirs:
        for path in evidence_paths:
            print(f"Prepared {path}")
    print("All atoms remain not-run/local-reverse-lead until a human fills live evidence.")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--scenario", default="small-location")
    parser.add_argument("--date", help="Date stamp for the record id, e.g. 20260618.")
    parser.add_argument("--record-id", help="Explicit record id.")
    parser.add_argument("--created-at", help="Explicit ISO timestamp.")
    parser.add_argument("--operator", required=True)
    parser.add_argument("--toolset-version", default="")
    parser.add_argument("--nwn-version", default="")
    parser.add_argument("--module-path-or-copy-id", default="")
    parser.add_argument("--hak", action="append", default=[], help="HAK dependency. Repeat as needed.")
    parser.add_argument("--custom-tlk", default="")
    parser.add_argument("--screenshots-folder", help="Evidence screenshot folder path to store in the record.")
    parser.add_argument("--log-folder", help="Evidence log folder path to store in the record.")
    parser.add_argument("--evidence-dir", help="Base evidence directory when screenshot/log folders are not provided.")
    parser.add_argument("--candidate-reference", action="append", default=[], help="Reference path that may receive promoted guidance. Repeat as needed.")
    parser.add_argument("--notes", default="")
    parser.add_argument("--out", help="Output JSON record path.")
    parser.add_argument("--create-evidence-dirs", action="store_true")
    parser.add_argument("--force", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return command_init(args)


if __name__ == "__main__":
    raise SystemExit(main())
