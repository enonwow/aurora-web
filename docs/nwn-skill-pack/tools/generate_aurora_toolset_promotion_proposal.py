#!/usr/bin/env python3
"""Generate a reference-promotion proposal from an Aurora Toolset live record."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from types import ModuleType
from typing import Any


def now_date() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


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


def resolve_package_path(root: Path, value: Any) -> Path:
    path = Path(str(value).strip())
    if path.is_absolute():
        return path
    return root / path


def display_path(root: Path, path: Path) -> str:
    try:
        return str(path.resolve().relative_to(root.resolve())).replace("\\", "/")
    except ValueError:
        return str(path).replace("\\", "/")


def artifact_key(root: Path, value: Any) -> str:
    raw = str(value).strip()
    if not raw:
        return ""
    normalized = raw.replace("\\", "/")
    if "://" in normalized or normalized.startswith(("external:", "urn:")):
        return normalized
    path = Path(raw)
    candidates = [path]
    if not path.is_absolute():
        candidates.append(root / path)

    for candidate in candidates:
        try:
            return str(candidate.resolve().relative_to(root.resolve())).replace("\\", "/")
        except (OSError, ValueError):
            continue
    return normalized.lstrip("./")


def bullet_list(items: list[Any], fallback: str = "- none") -> list[str]:
    values = [str(item).strip() for item in items if str(item).strip()]
    if not values:
        return [fallback]
    return [f"- {value}" for value in values]


def iter_visual_record_paths(root: Path, explicit: str = "") -> list[Path]:
    if explicit:
        return [Path(explicit)]
    records_dir = root / "knowledge-inbox" / "aurora-live-visual-redaction-records" / "records"
    if not records_dir.exists():
        return []
    return sorted(records_dir.glob("*.json"))


def manifest_artifact_hashes(root: Path, manifest_path_label: Any) -> dict[tuple[str, str], str]:
    manifest_path = resolve_package_path(root, manifest_path_label)
    if not manifest_path.exists():
        raise ValueError(f"evidence manifest does not exist: {display_path(root, manifest_path)}")

    manifest_tool = load_module(
        root / "tools" / "check_aurora_live_evidence_manifest.py",
        "aurora_live_evidence_manifest_for_promotion",
    )
    manifest = load_json(manifest_path)
    errors = manifest_tool.validate_manifest(manifest)
    if errors:
        raise ValueError(
            "evidence manifest is invalid: "
            + display_path(root, manifest_path)
            + ": "
            + "; ".join(errors)
        )

    rows: dict[tuple[str, str], str] = {}
    for artifact in manifest.get("artifacts", []):
        if not isinstance(artifact, dict):
            continue
        key = (
            str(artifact.get("atom", "")),
            artifact_key(root, artifact.get("path", "")),
        )
        rows[key] = str(artifact.get("sha256", "")).strip().lower()
    return rows


def validate_visual_redaction_gate(
    root: Path,
    record_id: str,
    promotion_ready: list[dict[str, Any]],
    explicit_record: str = "",
) -> list[dict[str, Any]]:
    visual_tool = load_module(
        root / "tools" / "aurora_live_visual_redaction_record.py",
        "aurora_visual_redaction_gate",
    )
    matching: list[dict[str, Any]] = []
    invalid: list[str] = []
    for path in iter_visual_record_paths(root, explicit_record):
        try:
            data = load_json(path)
        except Exception as exc:
            invalid.append(f"{display_path(root, path)}: {exc}")
            continue
        errors = visual_tool.validate_record(data)
        if errors:
            invalid.append(f"{display_path(root, path)}: {'; '.join(errors)}")
            continue
        if data.get("live_record_id") == record_id and data.get("result") == "pass":
            data["_path"] = display_path(root, path)
            matching.append(data)

    if invalid and explicit_record:
        raise ValueError("visual redaction record is invalid: " + "; ".join(invalid))
    if not matching:
        raise ValueError(
            "missing pass visual redaction review record for live record id "
            f"{record_id}; run aurora_live_visual_redaction_record.py after human screenshot/log review"
        )

    covered: set[tuple[str, str]] = set()
    hash_mismatches: list[str] = []
    for record in matching:
        manifest_hashes = manifest_artifact_hashes(root, record.get("evidence_manifest_path", ""))
        artifacts = record.get("artifacts_reviewed", [])
        if not isinstance(artifacts, list):
            continue
        for artifact in artifacts:
            if not isinstance(artifact, dict):
                continue
            if artifact.get("review_result") != "passed":
                continue
            if artifact.get("redaction_status") not in {"redacted", "not-private"}:
                continue
            coverage_ref = artifact.get("source_artifact_ref") or artifact.get("path_or_external_ref", "")
            key = (str(artifact.get("atom", "")), artifact_key(root, coverage_ref))
            source_hash = str(artifact.get("source_artifact_sha256", "")).strip().lower()
            if source_hash:
                manifest_hash = manifest_hashes.get(key, "")
                if not manifest_hash:
                    hash_mismatches.append(
                        f"{key[0]}:{coverage_ref} has source_artifact_sha256 but no matching evidence manifest sha256"
                    )
                    continue
                if manifest_hash != source_hash:
                    hash_mismatches.append(
                        f"{key[0]}:{coverage_ref} source_artifact_sha256 mismatch "
                        f"(visual={source_hash}, manifest={manifest_hash})"
                    )
                    continue
            covered.add(key)

    if hash_mismatches:
        raise ValueError(
            "visual redaction source hashes do not match evidence manifest: "
            + "; ".join(sorted(hash_mismatches))
        )

    missing_artifacts: list[str] = []
    for atom in promotion_ready:
        atom_name = str(atom.get("atom", ""))
        artifacts = atom.get("artifacts", [])
        if not isinstance(artifacts, list):
            continue
        for artifact in artifacts:
            artifact_path = str(artifact)
            if (atom_name, artifact_key(root, artifact_path)) not in covered:
                missing_artifacts.append(f"{atom_name}:{artifact_path}")
    if missing_artifacts:
        raise ValueError(
            "visual redaction pass records do not cover promotion-ready artifacts: "
            + ", ".join(sorted(missing_artifacts))
        )
    return matching


def visual_record_lines(records: list[dict[str, Any]]) -> list[str]:
    if not records:
        return ["- none"]
    lines: list[str] = []
    for record in records:
        lines.append(f"- `{record.get('id', '')}` from `{record.get('_path', '')}`")
        lines.append(f"  - reviewer: `{record.get('reviewer', '')}`")
        lines.append(f"  - result: `{record.get('result', '')}`")
        lines.append(f"  - artifacts reviewed: `{len(record.get('artifacts_reviewed', []))}`")
    return lines


def atom_lines(atoms: list[dict[str, Any]]) -> list[str]:
    lines: list[str] = []
    for atom in atoms:
        lines.extend(
            [
                f"### `{atom.get('atom', '')}`",
                "",
                f"- Status: `{atom.get('status', '')}`",
                f"- Evidence label: `{atom.get('evidence_label', '')}`",
                f"- Promotion ready: `{str(atom.get('promotion_ready', False)).lower()}`",
                "",
                "Observations:",
                "",
                *bullet_list(atom.get("observations", [])),
                "",
                "Artifacts:",
                "",
                *bullet_list(atom.get("artifacts", [])),
                "",
                "Blockers:",
                "",
                *bullet_list(atom.get("blockers", [])),
                "",
            ]
        )
    return lines


def generate(
    root: Path,
    record_path: Path,
    maintainer: str,
    semver: str,
    allow_empty: bool,
    visual_redaction_record: str = "",
) -> str:
    live_tool = load_module(root / "tools" / "aurora_toolset_live_record.py", "aurora_live_promotion_generator")
    record = load_json(record_path)
    errors = live_tool.validate_record(record)
    if errors:
        raise ValueError("Aurora Toolset live record is invalid: " + "; ".join(errors))

    promotion_ready = [
        atom for atom in record.get("atoms", [])
        if isinstance(atom, dict) and atom.get("promotion_ready") is True
    ]
    non_promotion_ready = [
        atom for atom in record.get("atoms", [])
        if isinstance(atom, dict) and atom.get("promotion_ready") is not True
    ]
    if not promotion_ready and not allow_empty:
        raise ValueError("Aurora Toolset live record has no promotion_ready atoms")
    visual_records: list[dict[str, Any]] = []
    if promotion_ready:
        visual_records = validate_visual_redaction_gate(
            root,
            str(record.get("id", "")),
            promotion_ready,
            visual_redaction_record,
        )

    promotion = record.get("promotion", {})
    environment = record.get("environment", {})
    candidate_refs = promotion.get("candidate_references", [])
    readiness_line = "none" if promotion_ready else "no promotion_ready atoms"

    lines = [
        "# Aurora Toolset Reference Promotion Proposal",
        "",
        "Generated from an Aurora Toolset live-operator record.",
        "",
        "## Purpose",
        "",
        "Use this proposal to turn filled live Toolset evidence into a reviewed, compact reference patch for `nwn-server-gamedev`.",
        "",
        "This is not automatic learning. It does not self-update an installed skill, does not prove unrelated NWN behavior, and does not replace a versioned release.",
        "",
        "## Source Live Record",
        "",
        f"- Source record path: `{display_path(root, record_path)}`",
        f"- Source record id: `{record.get('id', '')}`",
        f"- Checklist path: `{record.get('checklist_path', '')}`",
        f"- Overall result: `{record.get('overall_result', '')}`",
        f"- Maintainer: `{maintainer or record.get('operator', '')}`",
        f"- Date: `{now_date()}`",
        f"- Promotion readiness blocker: {readiness_line}",
        "",
        "## Environment",
        "",
        f"- Toolset version: `{environment.get('toolset_version', '')}`",
        f"- NWN version: `{environment.get('nwn_version', '')}`",
        f"- Module path or copy id: `{environment.get('module_path_or_copy_id', '')}`",
        f"- HAK list: `{', '.join(environment.get('hak_list', [])) if isinstance(environment.get('hak_list'), list) else environment.get('hak_list', '')}`",
        f"- Custom TLK: `{environment.get('custom_tlk', '')}`",
        f"- Screenshots folder: `{environment.get('screenshots_folder', '')}`",
        f"- Log folder: `{environment.get('log_folder', '')}`",
        "",
        "## Promotion-Ready Atoms",
        "",
        *atom_lines(promotion_ready),
        "## Non-Promotion-Ready Atoms",
        "",
        "These rows may explain the blocker, but they are not reference-promotion material until a human marks the atom `promotion_ready=true` and the visual redaction gate passes.",
        "",
        *atom_lines(non_promotion_ready),
        "## Visual Redaction Review Gate",
        "",
        "Proposal generation requires at least one `pass` visual redaction review record for this live record, and every promotion-ready artifact must be covered by a passed reviewed artifact row.",
        "When a reviewed artifact is a redacted copy or external handoff bundle, its `source_artifact_ref` must name the original live-record artifact it covers.",
        "For redacted-copy or external-bundle coverage, require `source_artifact_sha256` and `reviewed_artifact_sha256` so the maintainer can compare provenance before patching references.",
        "When `source_artifact_sha256` is present, proposal generation compares it with the evidence manifest `sha256` for the covered source artifact.",
        "Rows marked `redaction_status=redacted` must have `reviewed_artifact_sha256` differ from `source_artifact_sha256`; unchanged reviewed artifacts must use `redaction_status=not-private`.",
        "For external reviewed artifacts, require `external_provenance_note` with explicit immutable-storage, access, and SHA-256 hash-check notes plus `external_storage_provider` and `external_access_checked_at`.",
        "",
        *visual_record_lines(visual_records),
        "",
        "## Candidate Target References",
        "",
        *bullet_list(candidate_refs),
        "",
        "Patch both authoring and plugin-packaged copies or stop.",
        "",
        "Likely targets:",
        "",
        "- `draft-skills/nwn-server-gamedev/references/locations-areas-tilesets.md`",
        "- `draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev/references/locations-areas-tilesets.md`",
        "- `draft-skills/nwn-server-gamedev/references/items-equipment-loot.md`",
        "- `draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev/references/items-equipment-loot.md`",
        "- optional new `references/aurora-toolset-operation-taxonomy.md` after enough atoms are confirmed",
        "",
        "## Proposed Patch Notes",
        "",
        "```text",
        "Fill exact target section, compact wording, and evidence label before patching references.",
        "Do not copy raw decompilation. Use only operator-observed behavior and reviewed artifact paths.",
        "```",
        "",
        "## Evidence Label Decision",
        "",
        "- Use `runtime-tested` only for atoms with client/server/log proof.",
        "- Use `toolset-observed` only for Toolset UI observations that do not prove runtime behavior.",
        "- Use `static-checked` or `compiled` only when the filled record proves that level.",
        "- Keep unproven local reverse leads out of installed skill references.",
        "",
        "## SemVer Decision",
        "",
        f"- Proposed SemVer class: `{semver}`",
        "",
        "## Verification Commands After Patching",
        "",
        "```powershell",
        "python docs\\nwn-skill-pack\\tools\\check_skill_routes.py docs\\nwn-skill-pack\\draft-skills\\nwn-server-gamedev",
        "python docs\\nwn-skill-pack\\tools\\check_skill_routes.py docs\\nwn-skill-pack\\draft-plugins\\nwn-server-gamedev-pack\\skills\\nwn-server-gamedev",
        "python docs\\nwn-skill-pack\\tools\\check_domain_reference_status.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_record_contracts.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_aurora_live_visual_redaction_records.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_reference_promotion_records.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_release_gate.py docs\\nwn-skill-pack --target repo-artifact",
        "```",
        "",
        "## Promotion Result",
        "",
        "- Accepted into reference files: pending",
        "- Reference promotion record written: pending",
        "- Source of truth updated: pending",
        "- Version/release metadata updated: pending",
        "- Follow-up runtime or forward test needed: maintainer decision",
        "",
        "## Does Not Prove",
        "",
        "This proposal does not prove all Toolset workflows, all NWN versions, all module setups, balance, fun, plugin installation, fresh Codex answer quality, public release readiness, or future automatic skill improvement.",
    ]
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", help="Path to docs/nwn-skill-pack root.")
    parser.add_argument("record", help="Aurora Toolset live record JSON.")
    parser.add_argument("--out", default="", help="Output markdown path.")
    parser.add_argument("--maintainer", default="")
    parser.add_argument("--semver", default="MINOR", choices=["PATCH", "MINOR", "MAJOR"])
    parser.add_argument("--allow-empty", action="store_true", help="Generate a blocked draft even with no promotion-ready atoms.")
    parser.add_argument("--visual-redaction-record", default="", help="Optional explicit visual redaction review record JSON.")
    args = parser.parse_args()

    root = Path(args.root)
    record_path = Path(args.record)
    try:
        output = generate(
            root,
            record_path,
            args.maintainer,
            args.semver,
            args.allow_empty,
            args.visual_redaction_record,
        )
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    if args.out:
        out = Path(args.out)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(output, encoding="utf-8")
        print(f"Wrote {out}")
    else:
        print(output, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
