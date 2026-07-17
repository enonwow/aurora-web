#!/usr/bin/env python3
"""Initialize an Aurora Toolset live evidence manifest from the checked template."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


TEMPLATE = Path("knowledge-inbox/templates/aurora-live-evidence-manifest-template.json")
DEFAULT_MANIFEST_DIR = Path("knowledge-inbox/aurora-live-evidence-manifests")
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
    return str(path).replace("\\", "/")


def path_label(root: Path, path: Path, fallback: str) -> str:
    try:
        return display_path(path.resolve().relative_to(root.resolve()))
    except ValueError:
        return fallback


def build_manifest(args: argparse.Namespace) -> tuple[dict[str, Any], Path]:
    root = Path(args.root)
    template_path = root / TEMPLATE
    data = load_json(template_path)

    now = utc_now()
    date = args.date or now.strftime("%Y%m%d")
    scenario = safe_slug(args.scenario)
    record_data: dict[str, Any] = {}
    if args.live_record:
        record_data = load_json(Path(args.live_record))

    record_id = args.record_id or str(record_data.get("id") or f"aurora-live-{date}-{scenario}")
    created_at = args.created_at or str(record_data.get("created_at") or timestamp_text(now))
    operator = args.operator or str(record_data.get("operator") or "")
    if not operator.strip():
        raise ValueError("--operator is required unless --live-record contains operator")

    manifest_id = args.manifest_id or f"aurora-live-evidence-manifest-{date}-{scenario}"
    manifest_path = Path(args.out) if args.out else root / DEFAULT_MANIFEST_DIR / f"{manifest_id}.json"

    default_record_path = root / DEFAULT_RECORD_DIR / f"{record_id}.json"
    if args.live_record_path:
        live_record_label = args.live_record_path
    elif args.live_record:
        live_record_label = path_label(root, Path(args.live_record), str(DEFAULT_RECORD_DIR / f"{record_id}.json"))
    else:
        live_record_label = display_path(DEFAULT_RECORD_DIR / f"{record_id}.json")

    if args.evidence_dir:
        evidence_root = Path(args.evidence_dir)
        evidence_label = path_label(root, evidence_root, display_path(evidence_root))
    else:
        evidence_root = root / DEFAULT_EVIDENCE_DIR / record_id
        package_root_label = display_path(root)
        evidence_label = f"{package_root_label}/{display_path(DEFAULT_EVIDENCE_DIR / record_id)}"

    data["id"] = manifest_id
    data["created_at"] = created_at
    data["operator"] = operator
    data["live_record_id"] = record_id
    data["live_record_path"] = live_record_label or display_path(default_record_path)
    data["evidence_root"] = evidence_label
    data["redaction_reviewed"] = False
    data["privacy_notes"] = args.privacy_notes

    artifacts = data.get("artifacts")
    if isinstance(artifacts, list) and artifacts and isinstance(artifacts[0], dict):
        first = artifacts[0]
        first["artifact_id"] = args.placeholder_artifact_id
        first["path"] = args.placeholder_path
        first["description"] = args.placeholder_description
        first["notes"] = "Initialized placeholder row; replace or edit before review."
        first["redaction_status"] = "pending-redaction"
        first["sha256"] = ""

    return data, manifest_path


def command_init(args: argparse.Namespace) -> int:
    try:
        data, out_path = build_manifest(args)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    if out_path.exists() and not args.force:
        print(f"ERROR: output already exists, pass --force to overwrite: {out_path}", file=sys.stderr)
        return 1

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out_path}")
    print("Manifest starts with a placeholder artifact row; replace it with returned redacted evidence before review.")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--scenario", default="small-location")
    parser.add_argument("--date", help="Date stamp for ids, e.g. 20260618.")
    parser.add_argument("--record-id", help="Explicit live record id.")
    parser.add_argument("--manifest-id", help="Explicit evidence manifest id.")
    parser.add_argument("--created-at", help="Explicit ISO timestamp.")
    parser.add_argument("--operator", default="")
    parser.add_argument("--live-record", help="Existing live-record JSON to infer id, created_at, and operator.")
    parser.add_argument("--live-record-path", help="Relative path label to store in live_record_path.")
    parser.add_argument("--evidence-dir", help="Evidence root directory label/path to store in evidence_root.")
    parser.add_argument("--privacy-notes", default="")
    parser.add_argument("--placeholder-artifact-id", default="replace-with-artifact-id")
    parser.add_argument("--placeholder-path", default="screenshots/replace-with-redacted-file.png")
    parser.add_argument(
        "--placeholder-description",
        default="Placeholder row; replace with a redacted artifact description before review.",
    )
    parser.add_argument("--out", help="Output JSON manifest path.")
    parser.add_argument("--force", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return command_init(args)


if __name__ == "__main__":
    raise SystemExit(main())
