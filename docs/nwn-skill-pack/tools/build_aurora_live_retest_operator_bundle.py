#!/usr/bin/env python3
"""Build a send-ready Aurora live retest operator bundle."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_OUTPUT = Path(".codex-tmp/aurora-live-retest-operator-bundle/current")
DISPATCH = Path("knowledge-inbox/aurora-live-retest-dispatch.md")
RESULT_TEMPLATE = Path("knowledge-inbox/aurora-live-retest-result-template.md")
BUNDLE_MANIFEST = Path("RETEST-OPERATOR-BUNDLE-MANIFEST.json")
SHA256SUMS = Path("SHA256SUMS.txt")
STATUS_RE = re.compile(r"^- Status: `([^`]+)`$", re.MULTILINE)


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


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain an object")
    return data


def dispatch_status(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    match = STATUS_RE.search(text)
    if not match:
        raise ValueError(f"could not find dispatch status in {path}")
    return match.group(1)


def in_tmp(root: Path, path: Path) -> bool:
    tmp_root = (root / ".codex-tmp").resolve()
    resolved = path.resolve()
    return resolved == tmp_root or tmp_root in resolved.parents


def safe_prepare_output(root: Path, output: Path, force: bool) -> None:
    if not in_tmp(root, output):
        raise ValueError("Aurora live retest operator bundle output must be under root/.codex-tmp")
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


def build(root: Path, output: Path, force: bool) -> dict[str, Any]:
    manifest = load_json(root / "version-manifest.json")
    safe_prepare_output(root, output, force)

    dispatch_source = root / DISPATCH
    template_source = root / RESULT_TEMPLATE
    if not dispatch_source.is_file():
        raise FileNotFoundError(f"dispatch is missing: {DISPATCH}")
    if not template_source.is_file():
        raise FileNotFoundError(f"retest result template is missing: {RESULT_TEMPLATE}")

    dispatch_target = output / dispatch_source.name
    template_target = output / template_source.name
    shutil.copy2(dispatch_source, dispatch_target)
    shutil.copy2(template_source, template_target)

    dispatch = artifact_record(root, dispatch_source, dispatch_target, output)
    result_template = artifact_record(root, template_source, template_target, output)
    status = dispatch_status(dispatch_source)

    sums = "\n".join([
        f"{dispatch['sha256']}  {dispatch['target']}",
        f"{result_template['sha256']}  {result_template['target']}",
    ]) + "\n"
    (output / SHA256SUMS).write_text(sums, encoding="utf-8")

    ready_to_send = status == "retest-requests-ready"
    bundle_manifest = {
        "schema_version": "1",
        "bundle_type": "aurora-live-retest-operator",
        "created_at": now_iso(),
        "source_root": str(root),
        "output": rel(output, root),
        "package_name": manifest.get("package_name"),
        "package_version": manifest.get("version"),
        "package_state": manifest.get("package_state"),
        "dispatch_status": status,
        "ready_to_send": ready_to_send,
        "source_artifacts": {
            "dispatch": dispatch,
            "result_template": result_template,
        },
        "bundle_files": [
            dispatch["target"],
            result_template["target"],
            str(SHA256SUMS).replace("\\", "/"),
            str(BUNDLE_MANIFEST).replace("\\", "/"),
        ],
        "sha256sums": str(SHA256SUMS).replace("\\", "/"),
        "send_instruction": (
            "Send exactly the dispatch and retest-result template from this directory to the operator."
            if ready_to_send
            else "Do not send this bundle yet; the current dispatch has no active retest requests."
        ),
        "operator_instruction": (
            "The operator completes the copied aurora-live-retest-result-template.md and returns it with "
            "only the requested evidence atom, redacted screenshots/logs, or exact blocker text."
        ),
        "verified_boundary": (
            "This bundle proves only that current retest handoff files were copied into one repo-local "
            "scratch directory with hashes."
        ),
        "not_proven": [
            "outside delivery",
            "operator completion",
            "screenshot truth",
            "log truth",
            "NWN runtime behavior",
            "privacy safety",
            "release readiness",
            "automatic skill improvement",
        ],
    }
    (output / BUNDLE_MANIFEST).write_text(
        json.dumps(bundle_manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    return bundle_manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--out", default="")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    root = Path(args.root)
    output = Path(args.out) if args.out else root / DEFAULT_OUTPUT
    try:
        manifest = build(root, output, args.force)
    except Exception as exc:
        if args.json:
            print(json.dumps({"error": str(exc)}, indent=2))
        else:
            print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps(manifest, indent=2))
    else:
        print(f"OK: built Aurora live retest operator bundle: {output}")
        print(f"OK: dispatch status: {manifest['dispatch_status']}")
        print(f"OK: ready_to_send: {manifest['ready_to_send']}")
        print(f"OK: copied dispatch: {manifest['source_artifacts']['dispatch']['target']}")
        print(f"OK: copied retest template: {manifest['source_artifacts']['result_template']['target']}")
        print(f"OK: wrote SHA256SUMS: {output / SHA256SUMS}")
        print(f"OK: wrote manifest: {output / BUNDLE_MANIFEST}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
