#!/usr/bin/env python3
"""Check consistency between submitted Aurora live records and evidence manifests."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType
from typing import Any


DEFAULT_RECORD_DIR = Path("knowledge-inbox/aurora-live-records")
DEFAULT_MANIFEST_DIR = Path("knowledge-inbox/aurora-live-evidence-manifests")
POSITIVE_STATUSES = {"observed-toolset", "static-checked", "compiled", "runtime-tested"}


@dataclass
class IntakeConsistencyCheck:
    checks: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def rel(root: Path, path: Path) -> str:
    try:
        return str(path.relative_to(root)).replace("\\", "/")
    except ValueError:
        return str(path).replace("\\", "/")


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def load_module(path: Path, name: str) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def normalize_path(value: Any) -> str:
    return str(value or "").strip().replace("\\", "/")


def load_records(root: Path, result: IntakeConsistencyCheck, records_dir: Path) -> dict[str, tuple[Path, dict[str, Any]]]:
    records_path = root / records_dir
    if not records_path.exists():
        result.ok(f"{records_dir} is absent; no Aurora live records to cross-check")
        return {}
    if not records_path.is_dir():
        result.error(f"{records_dir} must be a directory")
        return {}

    try:
        live_tool = load_module(
            root / "tools" / "aurora_toolset_live_record.py",
            "aurora_toolset_live_record_intake_consistency",
        )
    except Exception as exc:
        result.error(f"cannot import Aurora live record validator: {exc}")
        return {}

    records: dict[str, tuple[Path, dict[str, Any]]] = {}
    for path in sorted(records_path.glob("*.json")):
        try:
            record = load_json(path)
        except Exception as exc:
            result.error(f"{rel(root, path)} is invalid JSON: {exc}")
            continue
        errors = live_tool.validate_record(record)
        if errors:
            result.error(f"{rel(root, path)} failed live-record validation: {'; '.join(errors)}")
            continue
        record_id = str(record.get("id", "")).strip()
        if not record_id:
            result.error(f"{rel(root, path)} is missing id")
            continue
        if record_id in records:
            result.error(f"duplicate Aurora live record id: {record_id}")
            continue
        records[record_id] = (path, record)
    if records:
        result.ok(f"loaded {len(records)} valid Aurora live record(s)")
    return records


def load_manifests(root: Path, result: IntakeConsistencyCheck, manifest_dir: Path) -> list[tuple[Path, dict[str, Any]]]:
    manifests_path = root / manifest_dir
    if not manifests_path.exists():
        result.ok(f"{manifest_dir} is absent; no Aurora evidence manifests to cross-check")
        return []
    if not manifests_path.is_dir():
        result.error(f"{manifest_dir} must be a directory")
        return []

    try:
        manifest_tool = load_module(
            root / "tools" / "check_aurora_live_evidence_manifest.py",
            "aurora_live_evidence_manifest_intake_consistency",
        )
    except Exception as exc:
        result.error(f"cannot import Aurora evidence manifest checker: {exc}")
        return []

    manifests: list[tuple[Path, dict[str, Any]]] = []
    for path in sorted(manifests_path.glob("*.json")):
        try:
            manifest = load_json(path)
        except Exception as exc:
            result.error(f"{rel(root, path)} is invalid JSON: {exc}")
            continue
        errors = manifest_tool.validate_manifest(manifest)
        if errors:
            result.error(f"{rel(root, path)} failed evidence-manifest validation: {'; '.join(errors)}")
            continue
        manifests.append((path, manifest))
    if manifests:
        result.ok(f"loaded {len(manifests)} valid Aurora evidence manifest(s)")
    return manifests


def atom_records(record: dict[str, Any]) -> dict[str, dict[str, Any]]:
    atoms = record.get("atoms", [])
    return {
        str(atom.get("atom")): atom
        for atom in atoms
        if isinstance(atom, dict) and atom.get("atom")
    }


def manifest_artifacts(manifest: dict[str, Any]) -> dict[tuple[str, str], dict[str, Any]]:
    artifacts = manifest.get("artifacts", [])
    rows: dict[tuple[str, str], dict[str, Any]] = {}
    for artifact in artifacts:
        if not isinstance(artifact, dict):
            continue
        key = (str(artifact.get("atom", "")), normalize_path(artifact.get("path")))
        rows[key] = artifact
    return rows


def check_record_manifest_pair(
    result: IntakeConsistencyCheck,
    root: Path,
    record_path: Path,
    record: dict[str, Any],
    manifest_path: Path,
    manifest: dict[str, Any],
) -> None:
    record_id = str(record.get("id"))
    manifest_id = str(manifest.get("id"))
    atoms = atom_records(record)
    rows = manifest_artifacts(manifest)
    positive_artifacts = 0
    promotion_ready_artifacts = 0

    live_record_path = normalize_path(manifest.get("live_record_path"))
    if live_record_path:
        pointed = root / live_record_path
        if pointed.exists() and pointed.resolve() != record_path.resolve():
            result.error(
                f"{rel(root, manifest_path)} live_record_path points at {live_record_path}, "
                f"not {rel(root, record_path)}"
            )
        elif not pointed.exists():
            result.warn(f"{rel(root, manifest_path)} live_record_path does not exist locally: {live_record_path}")

    for atom_name, atom in atoms.items():
        status = atom.get("status")
        artifact_paths = [normalize_path(path) for path in atom.get("artifacts", [])]
        if status not in POSITIVE_STATUSES:
            continue
        if not artifact_paths:
            result.error(f"{rel(root, record_path)} {atom_name} has positive status but no artifacts")
            continue
        for artifact_path in artifact_paths:
            positive_artifacts += 1
            row = rows.get((atom_name, artifact_path))
            if row is None:
                result.error(
                    f"{rel(root, record_path)} {atom_name} artifact {artifact_path} is missing from "
                    f"{rel(root, manifest_path)}"
                )
                continue
            if row.get("evidence_label") != atom.get("evidence_label"):
                result.error(
                    f"{rel(root, manifest_path)} {atom_name} artifact {artifact_path} label "
                    f"{row.get('evidence_label')!r} does not match record label {atom.get('evidence_label')!r}"
                )
            if atom.get("promotion_ready") is True:
                promotion_ready_artifacts += 1
                if manifest.get("redaction_reviewed") is not True:
                    result.error(f"{rel(root, manifest_path)} must set redaction_reviewed=true for promotion-ready record {record_id}")
                redaction_status = row.get("redaction_status")
                if redaction_status not in {"redacted", "not-private"}:
                    result.error(
                        f"{rel(root, manifest_path)} {atom_name} artifact {artifact_path} has "
                        f"redaction_status={redaction_status!r}; promotion-ready artifacts require redacted or not-private"
                    )
                if not str(row.get("sha256", "")).strip():
                    result.error(
                        f"{rel(root, manifest_path)} {atom_name} artifact {artifact_path} needs sha256 before promotion review"
                    )

    for (atom_name, artifact_path), row in rows.items():
        atom = atoms.get(atom_name)
        if atom is None:
            result.error(f"{rel(root, manifest_path)} artifact {artifact_path} references unknown atom {atom_name}")
            continue
        record_artifacts = {normalize_path(path) for path in atom.get("artifacts", [])}
        if artifact_path not in record_artifacts:
            if atom.get("status") == "not-run":
                result.warn(
                    f"{rel(root, manifest_path)} artifact {artifact_path} is not referenced by not-run atom {atom_name}; "
                    "this may be an unfilled placeholder"
                )
            else:
                result.error(
                    f"{rel(root, manifest_path)} artifact {artifact_path} is not referenced by record atom {atom_name}"
                )

    result.ok(
        f"{manifest_id} cross-check complete for {record_id}: "
        f"{positive_artifacts} positive artifact link(s), {promotion_ready_artifacts} promotion-ready artifact link(s)"
    )


def run(
    root: Path,
    records_dir: Path = DEFAULT_RECORD_DIR,
    manifest_dir: Path = DEFAULT_MANIFEST_DIR,
) -> IntakeConsistencyCheck:
    result = IntakeConsistencyCheck()
    records = load_records(root, result, records_dir)
    manifests = load_manifests(root, result, manifest_dir)

    if result.errors:
        return result
    if not records and not manifests:
        result.warn("Aurora live evidence is still not present")
        return result
    if records and not manifests:
        positive_records = [
            record_id
            for record_id, (_, record) in records.items()
            if any(
                isinstance(atom, dict) and atom.get("status") in POSITIVE_STATUSES
                for atom in record.get("atoms", [])
            )
        ]
        if positive_records:
            result.error(
                "positive Aurora live records require evidence manifests: "
                + ", ".join(sorted(positive_records))
            )
        else:
            result.warn("records exist but no evidence manifests were submitted")
        return result
    if manifests and not records:
        result.error("evidence manifests were submitted without matching live records")
        return result

    seen_manifest_records: set[str] = set()
    for manifest_path, manifest in manifests:
        record_id = str(manifest.get("live_record_id", "")).strip()
        record_pair = records.get(record_id)
        if record_pair is None:
            result.error(f"{rel(root, manifest_path)} references missing live_record_id: {record_id}")
            continue
        seen_manifest_records.add(record_id)
        record_path, record = record_pair
        check_record_manifest_pair(result, root, record_path, record, manifest_path, manifest)

    for record_id, (record_path, record) in records.items():
        if record_id in seen_manifest_records:
            continue
        positive = any(
            isinstance(atom, dict) and atom.get("status") in POSITIVE_STATUSES
            for atom in record.get("atoms", [])
        )
        if positive:
            result.error(f"{rel(root, record_path)} has positive atom rows but no matching evidence manifest")
        else:
            result.warn(f"{rel(root, record_path)} has no matching evidence manifest and no positive atom rows")

    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--records-dir", default=str(DEFAULT_RECORD_DIR))
    parser.add_argument("--manifest-dir", default=str(DEFAULT_MANIFEST_DIR))
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    result = run(Path(args.root), Path(args.records_dir), Path(args.manifest_dir))
    if args.json:
        print(json.dumps({
            "checks": result.checks,
            "warnings": result.warnings,
            "errors": result.errors,
        }, indent=2))
    else:
        for check in result.checks:
            print(f"OK: {check}")
        for warning in result.warnings:
            print(f"WARN: {warning}")
        for error in result.errors:
            print(f"ERROR: {error}")
        if result.errors:
            print(f"Aurora live intake consistency check failed: {len(result.errors)} error(s)")
        else:
            suffix = f", {len(result.warnings)} warning(s)" if result.warnings else ""
            print(f"Aurora live intake consistency check passed{suffix}")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
