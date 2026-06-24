#!/usr/bin/env python3
"""Check Aurora live evidence manifest templates and submitted manifest text."""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from aurora_toolset_live_record import ALLOWED_EVIDENCE_LABELS, ATOMS


TEMPLATE = Path("knowledge-inbox/templates/aurora-live-evidence-manifest-template.json")
MANIFEST_DIR = Path("knowledge-inbox/aurora-live-evidence-manifests")

ALLOWED_KINDS = {
    "screenshot",
    "toolset-build-log",
    "client-log",
    "server-log",
    "saved-module-note",
    "external-note",
    "hash-only",
    "other",
}
ALLOWED_REDACTION_STATUSES = {
    "pending-redaction",
    "redacted",
    "not-private",
    "rejected",
}
REQUIRED_TOP_FIELDS = [
    "schema_version",
    "id",
    "created_at",
    "operator",
    "live_record_id",
    "live_record_path",
    "evidence_root",
    "redaction_reviewed",
    "privacy_notes",
    "artifacts",
    "not_proven",
]
REQUIRED_ARTIFACT_FIELDS = [
    "artifact_id",
    "atom",
    "kind",
    "path",
    "description",
    "evidence_label",
    "redaction_status",
    "sha256",
    "notes",
]
REQUIRED_TEMPLATE_TOKENS = [
    "aurora-live-evidence-manifest-YYYYMMDD-small-location-first-pass",
    "knowledge-inbox/aurora-live-records/aurora-live-YYYYMMDD-small-location-first-pass.json",
    "docs/nwn-skill-pack/.codex-tmp/aurora-live-evidence/aurora-live-YYYYMMDD-small-location-first-pass",
    "area.createWithWizard",
    "screenshot",
    "toolset-observed",
    "pending-redaction",
    "Toolset screenshots are not runtime proof.",
    "does not prove referenced files are present or visually redacted",
    "Promotion still requires live-record validation",
]
STALE_TEMPLATE_TOKENS = [
    "aurora-live-evidence-manifest-YYYYMMDD-small-location.json",
    "knowledge-inbox/aurora-live-records/aurora-live-YYYYMMDD-small-location.json",
    "docs/nwn-skill-pack/.codex-tmp/aurora-live-evidence/aurora-live-YYYYMMDD-small-location\"",
]

TEXT_PATTERNS = [
    ("email address", re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")),
    ("IPv4 address", re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")),
    ("windows user path", re.compile(r"[A-Za-z]:\\Users\\[^\\\s]+", re.IGNORECASE)),
    ("home user path", re.compile(r"/home/[^/\s]+", re.IGNORECASE)),
    ("password assignment", re.compile(r"\b(password|passwd|pwd)\s*[:=]", re.IGNORECASE)),
    ("token assignment", re.compile(r"\b(token|bearer|session[_-]?id|cookie|api[_-]?key|secret)\s*[:=]", re.IGNORECASE)),
    ("raw Aurora export filename", re.compile(r"\b(decompiled_all\.c|functions\.tsv|strings\.tsv|xrefs_domain\.txt)\b", re.IGNORECASE)),
    ("private key marker", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
]


@dataclass
class EvidenceManifestCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def iter_text(value: Any, prefix: str = "$") -> list[tuple[str, str]]:
    found: list[tuple[str, str]] = []
    if isinstance(value, str):
        found.append((prefix, value))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            found.extend(iter_text(item, f"{prefix}[{index}]"))
    elif isinstance(value, dict):
        for key, item in value.items():
            found.extend(iter_text(item, f"{prefix}.{key}"))
    return found


def validate_string(value: Any, field: str, errors: list[str], allow_empty: bool = False) -> None:
    if not isinstance(value, str):
        errors.append(f"{field} must be a string")
    elif not allow_empty and not value.strip():
        errors.append(f"{field} must be a non-empty string")


def validate_string_list(value: Any, field: str, errors: list[str]) -> None:
    if not isinstance(value, list):
        errors.append(f"{field} must be a list")
    elif not all(isinstance(item, str) for item in value):
        errors.append(f"{field} must contain only strings")


def validate_manifest(data: Any, *, is_template: bool = False) -> list[str]:
    errors: list[str] = []
    if not isinstance(data, dict):
        return ["manifest must be a JSON object"]

    for field in REQUIRED_TOP_FIELDS:
        if field not in data:
            errors.append(f"missing required field: {field}")

    if data.get("schema_version") != "1":
        errors.append("schema_version must be '1'")

    for field in ["id", "live_record_id", "live_record_path", "evidence_root"]:
        if field in data:
            validate_string(data.get(field), field, errors)
    for field in ["created_at", "operator", "privacy_notes"]:
        if field in data:
            validate_string(data.get(field), field, errors, allow_empty=is_template or field == "privacy_notes")

    if "redaction_reviewed" in data and not isinstance(data["redaction_reviewed"], bool):
        errors.append("redaction_reviewed must be boolean")

    validate_string_list(data.get("not_proven", []), "not_proven", errors)

    artifacts = data.get("artifacts")
    if not isinstance(artifacts, list):
        errors.append("artifacts must be a list")
        artifacts = []
    elif not artifacts:
        errors.append("artifacts must include at least one artifact entry")

    for index, artifact in enumerate(artifacts):
        prefix = f"artifacts[{index}]"
        if not isinstance(artifact, dict):
            errors.append(f"{prefix} must be an object")
            continue
        for field in REQUIRED_ARTIFACT_FIELDS:
            if field not in artifact:
                errors.append(f"{prefix}.{field} is required")

        for field in ["artifact_id", "path", "description"]:
            if field in artifact:
                validate_string(artifact.get(field), f"{prefix}.{field}", errors)
        for field in ["sha256", "notes"]:
            if field in artifact:
                validate_string(artifact.get(field), f"{prefix}.{field}", errors, allow_empty=True)

        atom = artifact.get("atom")
        if atom not in ATOMS:
            errors.append(f"{prefix}.atom must be one of known Aurora live atoms")
        kind = artifact.get("kind")
        if kind not in ALLOWED_KINDS:
            errors.append(f"{prefix}.kind must be one of: {', '.join(sorted(ALLOWED_KINDS))}")
        evidence_label = artifact.get("evidence_label")
        if evidence_label not in ALLOWED_EVIDENCE_LABELS:
            errors.append(f"{prefix}.evidence_label must be one of: {', '.join(sorted(ALLOWED_EVIDENCE_LABELS))}")
        redaction_status = artifact.get("redaction_status")
        if redaction_status not in ALLOWED_REDACTION_STATUSES:
            errors.append(
                f"{prefix}.redaction_status must be one of: {', '.join(sorted(ALLOWED_REDACTION_STATUSES))}"
            )
        if redaction_status == "rejected" and not str(artifact.get("notes", "")).strip():
            errors.append(f"{prefix}.notes is required when redaction_status=rejected")

    if data.get("redaction_reviewed") is True:
        pending = [
            str(artifact.get("artifact_id", f"index-{index}"))
            for index, artifact in enumerate(artifacts)
            if isinstance(artifact, dict) and artifact.get("redaction_status") == "pending-redaction"
        ]
        if pending:
            errors.append(
                "redaction_reviewed=true cannot include pending-redaction artifacts: "
                + ", ".join(pending)
            )

    return errors


def scan_text(path: Path, root: Path, data: Any, result: EvidenceManifestCheck) -> None:
    issue_count = 0
    for location, text in iter_text(data):
        for label, pattern in TEXT_PATTERNS:
            if pattern.search(text):
                issue_count += 1
                result.error(f"{path.relative_to(root)} {location} contains possible {label}; redact before review")
    if issue_count == 0:
        result.ok(f"{path.relative_to(root)} has no obvious text redaction issues")


def check_template(result: EvidenceManifestCheck, root: Path) -> None:
    path = root / TEMPLATE
    if not path.exists():
        result.error(f"{TEMPLATE} is missing")
        return
    try:
        data = load_json(path)
    except Exception as exc:
        result.error(f"{TEMPLATE} is not valid JSON: {exc}")
        return

    errors = validate_manifest(data, is_template=True)
    if errors:
        result.error(f"{TEMPLATE} shape errors: {'; '.join(errors)}")
    else:
        result.ok("Aurora live evidence manifest template has required shape, atom, label, redaction, and not-proven fields")

    text = path.read_text(encoding="utf-8")
    missing = [token for token in REQUIRED_TEMPLATE_TOKENS if token not in text]
    if missing:
        result.error(f"{TEMPLATE} missing tokens: {', '.join(missing)}")
    else:
        result.ok("Aurora live evidence manifest template includes required evidence-boundary tokens")
    stale = [token for token in STALE_TEMPLATE_TOKENS if token in text]
    if stale:
        result.error(f"{TEMPLATE} contains stale pre-first-pass tokens: {', '.join(stale)}")
    else:
        result.ok("Aurora live evidence manifest template does not contain stale pre-first-pass path tokens")

    scan_text(path, root, data, result)


def check_submitted_manifests(result: EvidenceManifestCheck, root: Path) -> None:
    manifest_root = root / MANIFEST_DIR
    if not manifest_root.exists():
        result.ok("Aurora live evidence manifest directory does not exist yet; no submitted evidence manifest text to scan")
        return
    paths = sorted(manifest_root.glob("*.json"))
    if not paths:
        result.ok("Aurora live evidence manifest directory is empty; no submitted evidence manifest text to scan")
        return

    valid_count = 0
    for path in paths:
        try:
            data = load_json(path)
        except Exception as exc:
            result.error(f"{path.relative_to(root)} is not valid JSON: {exc}")
            continue
        errors = validate_manifest(data)
        if errors:
            result.error(f"{path.relative_to(root)} shape errors: {'; '.join(errors)}")
        else:
            valid_count += 1
            result.ok(f"{path.relative_to(root)} has valid evidence manifest shape")
        scan_text(path, root, data, result)
    if valid_count:
        result.ok(f"validated {valid_count} submitted Aurora live evidence manifest file(s)")


def run(root: Path) -> EvidenceManifestCheck:
    result = EvidenceManifestCheck()
    check_template(result, root)
    check_submitted_manifests(result, root)
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    result = run(Path(args.root))
    if args.json:
        print(json.dumps({"checks": result.checks, "errors": result.errors}, indent=2))
    else:
        for check in result.checks:
            print(f"OK: {check}")
        for error in result.errors:
            print(f"ERROR: {error}")
        if result.errors:
            print(f"Aurora live evidence manifest check failed: {len(result.errors)} error(s)")
        else:
            print("Aurora live evidence manifest check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
