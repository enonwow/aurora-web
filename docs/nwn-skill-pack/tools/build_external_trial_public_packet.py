#!/usr/bin/env python3
"""Build the public-only packet for an external contributor trial."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_OUTPUT = Path(".codex-tmp/external-trial-public-packet/ext-001")
DEFAULT_ARCHIVE = Path(".codex-tmp/external-trial-public-packet/ext-001.zip")
PUBLIC_MANIFEST = Path("PUBLIC-PACKET-MANIFEST.json")
START_HERE = Path("START-HERE.md")
PUBLIC_FILES = [
    "knowledge-inbox/external-contributor-trial-packet.md",
    "knowledge-inbox/contributor-intake-quickstart.md",
    "knowledge-inbox/contribution-bundle-format.md",
    "tools/nwn_skill_feedback.py",
    "knowledge-inbox/templates/user-feedback-form.md",
]
FORBIDDEN_PATH_PARTS = {
    "forward-tests",
    "release-handoffs",
    "draft-skills",
    "draft-plugins",
    ".codex-tmp",
}
FORBIDDEN_CONTENT_TOKENS = {
    "reviewer-matrix.json",
    "reviewer-packet.md",
    "expected_reference",
    "expected references file",
    "rc-blocker-burndown.md",
    "release-readiness.md",
}


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


def load_manifest(root: Path) -> dict[str, Any]:
    path = root / "version-manifest.json"
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError("version-manifest.json must contain an object")
    return data


def safe_prepare_output(root: Path, output: Path, force: bool) -> None:
    root_resolved = root.resolve()
    tmp_root = (root / ".codex-tmp").resolve()
    output_resolved = output.resolve()

    if output_resolved == root_resolved:
        raise ValueError("output must not be the package root")
    if not (output_resolved == tmp_root or tmp_root in output_resolved.parents):
        raise ValueError("external trial public packet output must be under root/.codex-tmp")
    if not force and output.exists() and any(output.iterdir()):
        raise FileExistsError(f"output already exists and is not empty: {output}")

    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True, exist_ok=True)


def check_source_paths() -> None:
    for relative in PUBLIC_FILES:
        parts = set(Path(relative).parts)
        forbidden = sorted(FORBIDDEN_PATH_PARTS & parts)
        if forbidden:
            raise ValueError(f"public packet source has forbidden path segment: {relative}")


def render_start_here(manifest: dict[str, Any], trial_id: str) -> str:
    return "\n".join([
        f"# NWN Skill Pack External Trial {trial_id}",
        "",
        "Start with `knowledge-inbox/external-contributor-trial-packet.md`.",
        "",
        "Use one real or synthetic NWN server lesson and follow either the command path or the form path.",
        "",
        "Quick command smoke check:",
        "",
        "```powershell",
        "python tools\\nwn_skill_feedback.py --help",
        "python tools\\nwn_skill_feedback.py new --help",
        "python tools\\nwn_skill_feedback.py bundle --help",
        "python tools\\nwn_skill_feedback.py verify-bundle --help",
        "```",
        "",
        "Return the created bundle or completed form, command transcript, friction list, and private-data confirmation to the maintainer.",
        "",
        "This packet is public tester material only. It does not include reviewer-only scoring notes, release blockers, expected answers, or maintainer decision records.",
        "",
        "Boundary:",
        "",
        "- the packet does not self-update an installed skill,",
        "- the packet is not NWN runtime proof,",
        "- the packet is not release-candidate evidence by itself,",
        "- returned feedback remains untrusted until maintainer review.",
        "",
        "Source:",
        "",
        f"- package: `{manifest.get('package_name')}`",
        f"- version: `{manifest.get('version')}`",
        f"- package state: `{manifest.get('package_state')}`",
        "",
    ]) + "\n"


def write_archive(packet_root: Path, archive: Path, force: bool) -> None:
    packet_resolved = packet_root.resolve()
    archive_resolved = archive.resolve()
    if packet_resolved == archive_resolved or packet_resolved in archive_resolved.parents:
        raise ValueError("archive must not be inside the packet root")
    if archive.exists():
        if not force:
            raise FileExistsError(f"archive already exists: {archive}")
        archive.unlink()
    archive.parent.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as handle:
        for path in sorted(packet_root.rglob("*")):
            if not path.is_file():
                continue
            arcname = str(path.relative_to(packet_root)).replace("\\", "/")
            handle.write(path, arcname)


def manifest_path(path: Path, root: Path) -> str:
    try:
        return rel(path.resolve(), root.resolve())
    except ValueError:
        return str(path)


def build(root: Path, output: Path, archive: Path, trial_id: str, force: bool) -> dict[str, Any]:
    check_source_paths()
    manifest = load_manifest(root)
    safe_prepare_output(root, output, force)
    tmp_root = (root / ".codex-tmp").resolve()
    archive_resolved = archive.resolve()
    if not (archive_resolved == tmp_root or tmp_root in archive_resolved.parents):
        raise ValueError("external trial public packet archive must be under root/.codex-tmp")

    copied: list[dict[str, Any]] = []
    for relative in PUBLIC_FILES:
        source = root / relative
        if not source.is_file():
            raise FileNotFoundError(f"public packet source file is missing: {relative}")
        target = output / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        copied.append({
            "source": relative,
            "target": rel(target, output),
            "sha256": sha256(source),
            "size_bytes": source.stat().st_size,
        })

    start_here = render_start_here(manifest, trial_id)
    (output / START_HERE).write_text(start_here, encoding="utf-8")

    packet_manifest = {
        "schema_version": "1",
        "created_at": now_iso(),
        "trial_id": trial_id,
        "source_root": str(root),
        "output": str(output),
        "package_name": manifest.get("package_name"),
        "package_version": manifest.get("version"),
        "package_state": manifest.get("package_state"),
        "public_files": copied,
        "generated_files": [str(START_HERE).replace("\\", "/"), str(PUBLIC_MANIFEST).replace("\\", "/")],
        "archive": manifest_path(archive, root),
        "boundary": [
            "This public packet is tester-facing intake material only.",
            "It does not include reviewer-only expected answers or release blockers.",
            "It is not NWN runtime proof, not privacy proof, and not automatic skill improvement.",
        ],
    }
    (output / PUBLIC_MANIFEST).write_text(json.dumps(packet_manifest, indent=2) + "\n", encoding="utf-8")
    write_archive(output, archive, force)
    return packet_manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--out", default="")
    parser.add_argument("--archive", default="")
    parser.add_argument("--trial-id", default="EXT-001")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    root = Path(args.root)
    output = Path(args.out) if args.out else root / DEFAULT_OUTPUT
    archive = Path(args.archive) if args.archive else root / DEFAULT_ARCHIVE
    try:
        manifest = build(root, output, archive, args.trial_id, args.force)
    except Exception as exc:
        if args.json:
            print(json.dumps({"error": str(exc)}, indent=2))
        else:
            print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps(manifest, indent=2))
    else:
        print(f"OK: built external trial public packet: {output}")
        print(f"OK: copied public files: {len(manifest['public_files'])}")
        print(f"OK: wrote manifest: {output / PUBLIC_MANIFEST}")
        print(f"OK: wrote archive: {archive}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
