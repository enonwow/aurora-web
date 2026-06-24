#!/usr/bin/env python3
"""Generate a maintainer status report for Aurora Toolset live evidence."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from types import ModuleType
from typing import Any


DEFAULT_RECORD_DIR = Path("knowledge-inbox/aurora-live-records")


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


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


def rel(root: Path, path: Path) -> str:
    try:
        return str(path.relative_to(root)).replace("\\", "/")
    except ValueError:
        return str(path).replace("\\", "/")


def collect(root: Path, records_dir: Path = DEFAULT_RECORD_DIR) -> dict[str, Any]:
    live_tool = load_module(
        root / "tools" / "aurora_toolset_live_record.py",
        "aurora_toolset_live_record_status_generator",
    )
    records_path = root / records_dir
    record_paths = sorted(records_path.glob("*.json")) if records_path.is_dir() else []

    valid: list[tuple[Path, dict[str, Any]]] = []
    invalid: list[tuple[Path, list[str]]] = []
    status_counts: Counter[str] = Counter()
    evidence_counts: Counter[str] = Counter()
    atom_counts: Counter[str] = Counter()
    promotion_ready_atoms: Counter[str] = Counter()
    runtime_tested_atoms: Counter[str] = Counter()
    initialized_only = 0

    for path in record_paths:
        try:
            record = load_json(path)
        except Exception as exc:
            invalid.append((path, [str(exc)]))
            continue
        errors = live_tool.validate_record(record)
        if errors:
            invalid.append((path, errors))
            continue
        valid.append((path, record))
        atoms = record.get("atoms", [])
        if isinstance(atoms, list) and atoms:
            if all(isinstance(atom, dict) and atom.get("status") == "not-run" for atom in atoms):
                initialized_only += 1
            for atom in atoms:
                if not isinstance(atom, dict):
                    continue
                name = str(atom.get("atom", "unknown"))
                status = str(atom.get("status", "unknown"))
                label = str(atom.get("evidence_label", "unknown"))
                status_counts[status] += 1
                evidence_counts[label] += 1
                atom_counts[name] += 1
                if atom.get("promotion_ready") is True:
                    promotion_ready_atoms[name] += 1
                if status == "runtime-tested":
                    runtime_tested_atoms[name] += 1

    return {
        "records_path": records_path,
        "record_paths": record_paths,
        "valid": valid,
        "invalid": invalid,
        "status_counts": status_counts,
        "evidence_counts": evidence_counts,
        "atom_counts": atom_counts,
        "promotion_ready_atoms": promotion_ready_atoms,
        "runtime_tested_atoms": runtime_tested_atoms,
        "initialized_only": initialized_only,
    }


def count_lines(counter: Counter[str]) -> list[str]:
    if not counter:
        return ["- none"]
    return [f"- `{key}`: `{counter[key]}`" for key in sorted(counter)]


def generate(root: Path, records_dir: Path = DEFAULT_RECORD_DIR) -> str:
    data = collect(root, records_dir)
    records_path: Path = data["records_path"]
    record_paths: list[Path] = data["record_paths"]
    valid: list[tuple[Path, dict[str, Any]]] = data["valid"]
    invalid: list[tuple[Path, list[str]]] = data["invalid"]
    promotion_ready_atoms: Counter[str] = data["promotion_ready_atoms"]
    runtime_tested_atoms: Counter[str] = data["runtime_tested_atoms"]
    status = "no-evidence-yet"
    if invalid:
        status = "invalid-records"
    elif promotion_ready_atoms:
        status = "promotion-ready"
    elif valid and data["initialized_only"] == len(valid):
        status = "prepared-only-no-live-evidence"
    elif valid:
        status = "records-present-no-promotion-ready"

    lines = [
        "# Aurora Toolset Live Evidence Status",
        "",
        f"Generated: {now_iso()}",
        "",
        "## Summary",
        "",
        f"- Status: `{status}`",
        f"- Records directory: `{rel(root, records_path)}`",
        f"- Submitted JSON records: `{len(record_paths)}`",
        f"- Valid records: `{len(valid)}`",
        f"- Invalid records: `{len(invalid)}`",
        f"- Initialized-only records: `{data['initialized_only']}`",
        f"- Promotion-ready atoms: `{sum(promotion_ready_atoms.values())}`",
        f"- Runtime-tested atoms: `{sum(runtime_tested_atoms.values())}`",
        "",
        "## Atom Status Counts",
        "",
        *count_lines(data["status_counts"]),
        "",
        "## Evidence Label Counts",
        "",
        *count_lines(data["evidence_counts"]),
        "",
        "## Promotion-Ready Atoms",
        "",
        *count_lines(promotion_ready_atoms),
        "",
        "## Runtime-Tested Atoms",
        "",
        *count_lines(runtime_tested_atoms),
        "",
        "## Valid Records",
        "",
    ]
    if valid:
        for path, record in valid:
            lines.append(f"- `{record.get('id', 'unknown')}` -> `{rel(root, path)}`")
    else:
        lines.append("- none")

    lines.extend(["", "## Invalid Records", ""])
    if invalid:
        for path, errors in invalid:
            lines.append(f"- `{rel(root, path)}`")
            for error in errors:
                lines.append(f"  - {error}")
    else:
        lines.append("- none")

    lines.extend([
        "",
        "## Maintainer Next Actions",
        "",
        "1. If status is `no-evidence-yet`, start from `knowledge-inbox/aurora-live-first-session-command-sheet.md` and run `tools/prepare_aurora_live_session.py` with `--scenario small-location-first-pass` before the first Toolset session.",
        "2. If status is `prepared-only-no-live-evidence`, the session scaffold exists but the operator has not returned live observations yet.",
        "3. Use `tools/init_aurora_live_record.py` and `tools/init_aurora_live_evidence_manifest.py` only as lower-level fallbacks.",
        "4. Validate returned records with `tools/check_aurora_live_records.py` before proposal generation.",
        "5. Generate a proposal only when promotion-ready atoms are present and candidate references are filled.",
        "6. Treat `toolset-observed` as Toolset evidence, not runtime proof.",
        "7. Require `runtime-tested` client/server/log evidence before making runtime behavior claims.",
        "",
        "## Required Commands",
        "",
        "```powershell",
        "python docs\\nwn-skill-pack\\tools\\prepare_aurora_live_session.py docs\\nwn-skill-pack --operator <name> --scenario small-location-first-pass --date YYYYMMDD --toolset-version <toolset-version> --nwn-version <nwn-version> --module-path-or-copy-id <module-copy> --candidate-reference draft-skills/nwn-server-gamedev/references/locations-areas-tilesets.md --candidate-reference draft-skills/nwn-server-gamedev/references/items-equipment-loot.md --candidate-reference draft-skills/nwn-server-gamedev/references/creatures-encounters-ai.md --candidate-reference draft-skills/nwn-server-gamedev/references/nwscript-events-systems.md --candidate-reference draft-skills/nwn-server-gamedev/references/feature-design-output-template.md",
        "python docs\\nwn-skill-pack\\tools\\init_aurora_live_record.py docs\\nwn-skill-pack --operator <name> --scenario small-location-first-pass --date YYYYMMDD --create-evidence-dirs",
        "python docs\\nwn-skill-pack\\tools\\check_aurora_live_records.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\generate_aurora_live_status.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\knowledge-inbox\\aurora-live-status.md",
        "python docs\\nwn-skill-pack\\tools\\check_aurora_live_status.py docs\\nwn-skill-pack",
        "```",
        "",
        "## Does Not Prove",
        "",
        "This status report does not prove Toolset correctness, client/server runtime behavior, fresh Codex answer quality, plugin install behavior, or release-candidate readiness. It only summarizes submitted Aurora live-record state.",
    ])
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--out", default="docs/nwn-skill-pack/knowledge-inbox/aurora-live-status.md")
    args = parser.parse_args()

    output = generate(Path(args.root))
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(output, encoding="utf-8")
    print(out_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
