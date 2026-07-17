#!/usr/bin/env python3
"""Build a clean local plugin install candidate from package-inventory.json."""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PLUGIN_PREFIX = "draft-plugins/nwn-server-gamedev-pack/"
DEFAULT_OUTPUT = ".codex-tmp/install-candidate/nwn-server-gamedev-pack"
DEFAULT_MANIFEST = ".codex-tmp/install-candidate/build-manifest.json"


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def rel(path: Path, root: Path) -> str:
    return str(path.relative_to(root)).replace("\\", "/")


def load_inventory(root: Path) -> dict[str, Any]:
    path = root / "package-inventory.json"
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError("package-inventory.json must contain a JSON object")
    return data


def selected_entries(inventory: dict[str, Any]) -> list[dict[str, Any]]:
    entries = inventory.get("entries", [])
    if not isinstance(entries, list):
        raise ValueError("package-inventory.json entries must be a list")

    selected: list[dict[str, Any]] = []
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError("inventory entries must be JSON objects")
        if entry.get("plugin_install_include"):
            path = entry.get("path")
            if not isinstance(path, str) or not path.startswith(PLUGIN_PREFIX):
                raise ValueError(f"plugin_install_include path is outside plugin boundary: {path!r}")
            selected.append(entry)
    if not selected:
        raise ValueError("package inventory has no plugin_install_include entries")
    return selected


def safe_prepare_output(root: Path, output: Path, force: bool) -> None:
    root_resolved = root.resolve()
    source_root = (root / PLUGIN_PREFIX).resolve()
    output_resolved = output.resolve()
    default_parent = (root / ".codex-tmp").resolve()

    if output_resolved == root_resolved or output_resolved == source_root:
        raise ValueError("output must not be the package root or source plugin root")
    if source_root in output_resolved.parents:
        raise ValueError("output must not be inside the source plugin root")
    if not force and output.exists() and any(output.iterdir()):
        raise FileExistsError(f"output already exists and is not empty: {output}")

    if output.exists():
        if not (output_resolved == default_parent or default_parent in output_resolved.parents):
            raise ValueError("refusing to clean an existing output outside root/.codex-tmp")
        shutil.rmtree(output)
    output.mkdir(parents=True, exist_ok=True)


def build(root: Path, output: Path, manifest_out: Path, force: bool) -> dict[str, Any]:
    inventory = load_inventory(root)
    entries = selected_entries(inventory)
    safe_prepare_output(root, output, force)

    copied: list[dict[str, Any]] = []
    for entry in entries:
        source_rel = str(entry["path"])
        source = root / source_rel
        if not source.is_file():
            raise FileNotFoundError(f"inventory source file is missing: {source}")

        target_rel = source_rel.removeprefix(PLUGIN_PREFIX)
        target = output / target_rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        copied.append({
            "source": source_rel,
            "target": rel(target, output),
            "sha256": entry.get("sha256"),
            "size_bytes": entry.get("size_bytes"),
        })

    manifest = {
        "schema_version": "1",
        "created_at": now_iso(),
        "source_root": str(root),
        "source_inventory_generated_at": inventory.get("generated_at"),
        "plugin_prefix": PLUGIN_PREFIX,
        "output": str(output),
        "file_count": len(copied),
        "copied": copied,
        "notes": [
            "This is a local filesystem build of the plugin install boundary only.",
            "It does not prove Codex marketplace installation or NWN runtime correctness.",
        ],
    }
    manifest_out.parent.mkdir(parents=True, exist_ok=True)
    manifest_out.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--out", default="")
    parser.add_argument("--manifest-out", default="")
    parser.add_argument("--force", action="store_true", help="Replace an existing default output.")
    parser.add_argument("--json", action="store_true", help="Emit JSON report.")
    args = parser.parse_args()

    root = Path(args.root)
    output = Path(args.out) if args.out else root / DEFAULT_OUTPUT
    manifest_out = Path(args.manifest_out) if args.manifest_out else root / DEFAULT_MANIFEST

    try:
        manifest = build(root, output, manifest_out, args.force)
    except Exception as exc:
        if args.json:
            print(json.dumps({"error": str(exc)}, indent=2))
        else:
            print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps(manifest, indent=2))
    else:
        print(f"OK: built plugin install candidate: {output}")
        print(f"OK: wrote build manifest: {manifest_out}")
        print(f"OK: copied files: {manifest['file_count']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
