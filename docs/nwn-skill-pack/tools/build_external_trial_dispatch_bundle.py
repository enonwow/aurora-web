#!/usr/bin/env python3
"""Build the send-ready dispatch bundle for an external contributor trial."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_OUTPUT = Path(".codex-tmp/external-trial-dispatch/ext-001")
PUBLIC_ARCHIVE = Path(".codex-tmp/external-trial-public-packet/ext-001.zip")
TESTER_MESSAGE = Path("knowledge-inbox/external-trials/ext-001-tester-message.md")
DISPATCH_MANIFEST = Path("DISPATCH-MANIFEST.json")
SHA256SUMS = Path("SHA256SUMS.txt")


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


def in_tmp(root: Path, path: Path) -> bool:
    tmp_root = (root / ".codex-tmp").resolve()
    resolved = path.resolve()
    return resolved == tmp_root or tmp_root in resolved.parents


def safe_prepare_output(root: Path, output: Path, force: bool) -> None:
    if not in_tmp(root, output):
        raise ValueError("external trial dispatch bundle output must be under root/.codex-tmp")
    if not force and output.exists() and any(output.iterdir()):
        raise FileExistsError(f"output already exists and is not empty: {output}")
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True, exist_ok=True)


def artifact_record(root: Path, source: Path, target: Path, output: Path) -> dict[str, Any]:
    return {
        "source": rel(source, root),
        "target": rel(target, output),
        "sha256": sha256(target),
        "size_bytes": target.stat().st_size,
    }


def build(root: Path, output: Path, trial_id: str, force: bool) -> dict[str, Any]:
    manifest = load_manifest(root)
    safe_prepare_output(root, output, force)

    archive_source = root / PUBLIC_ARCHIVE
    message_source = root / TESTER_MESSAGE
    if not archive_source.is_file():
        raise FileNotFoundError(f"public ZIP is missing: {PUBLIC_ARCHIVE}")
    if not message_source.is_file():
        raise FileNotFoundError(f"tester message is missing: {TESTER_MESSAGE}")

    archive_target = output / archive_source.name
    message_target = output / message_source.name
    shutil.copy2(archive_source, archive_target)
    shutil.copy2(message_source, message_target)

    archive = artifact_record(root, archive_source, archive_target, output)
    tester_message = artifact_record(root, message_source, message_target, output)

    sums = "\n".join([
        f"{archive['sha256']}  {archive['target']}",
        f"{tester_message['sha256']}  {tester_message['target']}",
    ]) + "\n"
    (output / SHA256SUMS).write_text(sums, encoding="utf-8")

    dispatch_manifest = {
        "schema_version": "1",
        "created_at": now_iso(),
        "trial_id": trial_id,
        "source_root": str(root),
        "output": rel(output, root),
        "package_name": manifest.get("package_name"),
        "package_version": manifest.get("version"),
        "package_state": manifest.get("package_state"),
        "source_artifacts": {
            "public_archive": archive,
            "tester_message": tester_message,
        },
        "dispatch_files": [
            archive["target"],
            tester_message["target"],
            str(SHA256SUMS).replace("\\", "/"),
            str(DISPATCH_MANIFEST).replace("\\", "/"),
        ],
        "sha256sums": str(SHA256SUMS).replace("\\", "/"),
        "send_instruction": (
            "Send exactly the ZIP archive and tester message from this directory; keep "
            "SHA256SUMS.txt and DISPATCH-MANIFEST.json as maintainer-side verification evidence."
        ),
        "verified_boundary": (
            "This dispatch bundle proves only that the current public ZIP and tester message were copied "
            "into a single repo-local scratch directory with hashes."
        ),
        "not_proven": [
            "outside delivery",
            "tester independence",
            "tester comprehension",
            "real contributor completion",
            "private-data safety",
            "feedback truth",
            "NWN runtime behavior",
            "release-candidate readiness",
            "automatic skill improvement",
        ],
    }
    (output / DISPATCH_MANIFEST).write_text(
        json.dumps(dispatch_manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    return dispatch_manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--out", default="")
    parser.add_argument("--trial-id", default="EXT-001")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    root = Path(args.root)
    output = Path(args.out) if args.out else root / DEFAULT_OUTPUT
    try:
        manifest = build(root, output, args.trial_id, args.force)
    except Exception as exc:
        if args.json:
            print(json.dumps({"error": str(exc)}, indent=2))
        else:
            print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps(manifest, indent=2))
    else:
        print(f"OK: built external trial dispatch bundle: {output}")
        print(f"OK: copied ZIP: {manifest['source_artifacts']['public_archive']['target']}")
        print(f"OK: copied tester message: {manifest['source_artifacts']['tester_message']['target']}")
        print(f"OK: wrote SHA256SUMS: {output / SHA256SUMS}")
        print(f"OK: wrote manifest: {output / DISPATCH_MANIFEST}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
