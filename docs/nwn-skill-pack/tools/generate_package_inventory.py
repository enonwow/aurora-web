#!/usr/bin/env python3
"""Generate a checksum inventory for the NWN skill-pack repo artifact."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


SKIP_DIRS = {".git", ".codex-tmp", "__pycache__"}
SKIP_SUFFIXES = {".pyc", ".pyo"}
SKIP_FILES = {"package-inventory.json", "package-inventory.md"}


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def rel(path: Path, root: Path) -> str:
    return str(path.relative_to(root)).replace("\\", "/")


def should_skip(path: Path, root: Path) -> bool:
    relative = path.relative_to(root)
    if any(part in SKIP_DIRS for part in relative.parts):
        return True
    if path.name in SKIP_FILES:
        return True
    if path.suffix in SKIP_SUFFIXES:
        return True
    return False


def role_for(relative_path: str) -> str:
    if relative_path.startswith("draft-plugins/nwn-server-gamedev-pack/"):
        return "plugin-package"
    if relative_path.startswith("draft-skills/nwn-server-gamedev/"):
        return "authoring-skill"
    if relative_path.startswith("tools/"):
        return "release-tooling"
    if relative_path.startswith("forward-tests/"):
        return "forward-test-evidence"
    if relative_path.startswith("knowledge-inbox/schema/"):
        return "feedback-schema"
    if relative_path.startswith("knowledge-inbox/templates/"):
        return "feedback-template"
    if relative_path.startswith("knowledge-inbox/incoming/"):
        return "feedback-source-incoming"
    if relative_path.startswith("knowledge-inbox/reviewed/"):
        return "feedback-reviewed"
    if relative_path.startswith("knowledge-inbox/rejected/"):
        return "feedback-rejected"
    if relative_path.startswith("knowledge-inbox/promoted/"):
        return "feedback-promoted"
    if relative_path.startswith("knowledge-inbox/"):
        return "feedback-process"
    return "release-doc"


def install_candidate_include(relative_path: str) -> bool:
    role = role_for(relative_path)
    if role == "authoring-skill":
        return False
    if role == "feedback-source-incoming":
        return False
    return True


def plugin_install_include(relative_path: str) -> bool:
    return relative_path.startswith("draft-plugins/nwn-server-gamedev-pack/")


def generate(root: Path) -> dict[str, object]:
    entries: list[dict[str, object]] = []
    warnings: list[str] = []

    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        if should_skip(path, root):
            continue
        relative_path = rel(path, root)
        stat = path.stat()
        entries.append({
            "path": relative_path,
            "role": role_for(relative_path),
            "size_bytes": stat.st_size,
            "sha256": sha256(path),
            "repo_artifact_include": True,
            "install_candidate_include": install_candidate_include(relative_path),
            "plugin_install_include": plugin_install_include(relative_path),
        })

    if any(entry["role"] == "feedback-source-incoming" for entry in entries):
        warnings.append(
            "knowledge-inbox/incoming records are present; install candidates should include them only intentionally."
        )
    if any(entry["role"] == "authoring-skill" for entry in entries):
        warnings.append(
            "authoring skill files are inventory-tracked for repo review but not required in the install candidate package."
        )

    return {
        "schema_version": "1",
        "generated_at": now_iso(),
        "root": str(root),
        "file_count": len(entries),
        "total_size_bytes": sum(int(entry["size_bytes"]) for entry in entries),
        "warnings": warnings,
        "entries": entries,
    }


def write_markdown(inventory: dict[str, object], output: Path) -> None:
    entries = inventory.get("entries", [])
    warnings = inventory.get("warnings", [])
    role_counts: dict[str, int] = {}
    if isinstance(entries, list):
        for entry in entries:
            if isinstance(entry, dict):
                role = str(entry.get("role", "unknown"))
                role_counts[role] = role_counts.get(role, 0) + 1

    lines = [
        "# Package Inventory",
        "",
        f"Generated: {inventory.get('generated_at')}",
        f"Root: `{inventory.get('root')}`",
        f"Files: {inventory.get('file_count')}",
        f"Total size bytes: {inventory.get('total_size_bytes')}",
        "",
        "## Warnings",
        "",
    ]

    if isinstance(warnings, list) and warnings:
        for warning in warnings:
            lines.append(f"- {warning}")
    else:
        lines.append("- none")

    lines.extend(["", "## Role Counts", ""])
    if role_counts:
        for role in sorted(role_counts):
            lines.append(f"- `{role}`: {role_counts[role]}")
    else:
        lines.append("- none")

    lines.extend(["", "## Files", ""])
    if isinstance(entries, list):
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            handoff_include = "yes" if entry.get("install_candidate_include") else "no"
            plugin_include = "yes" if entry.get("plugin_install_include") else "no"
            lines.append(
                f"- `{entry.get('path')}` | role: `{entry.get('role')}` | "
                f"handoff bundle: `{handoff_include}` | "
                f"plugin install: `{plugin_include}` | "
                f"sha256: `{entry.get('sha256')}`"
            )

    output.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--out-json", default="docs/nwn-skill-pack/package-inventory.json")
    parser.add_argument("--out-md", default="docs/nwn-skill-pack/package-inventory.md")
    args = parser.parse_args()

    inventory = generate(Path(args.root))
    json_path = Path(args.out_json)
    md_path = Path(args.out_md)
    json_path.write_text(json.dumps(inventory, indent=2) + "\n", encoding="utf-8")
    write_markdown(inventory, md_path)
    print(json_path)
    print(md_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
