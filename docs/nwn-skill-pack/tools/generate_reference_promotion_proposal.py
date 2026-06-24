#!/usr/bin/env python3
"""Generate a reference promotion proposal from an accepted feedback record."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from types import ModuleType
from typing import Any


AUTHOR_SKILL_PREFIX = "draft-skills/nwn-server-gamedev/"
PLUGIN_SKILL_PREFIX = "draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev/"


def now_date() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


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


def display_path(root: Path, path: Path) -> str:
    try:
        return str(path.resolve().relative_to(root.resolve())).replace("\\", "/")
    except ValueError:
        return str(path).replace("\\", "/")


def normalize_target(raw_target: str) -> tuple[str, str]:
    target = raw_target.replace("\\", "/").strip()
    if target.startswith(AUTHOR_SKILL_PREFIX):
        return target, PLUGIN_SKILL_PREFIX + target.removeprefix(AUTHOR_SKILL_PREFIX)
    if target.startswith(PLUGIN_SKILL_PREFIX):
        return AUTHOR_SKILL_PREFIX + target.removeprefix(PLUGIN_SKILL_PREFIX), target
    if target.startswith("references/"):
        return AUTHOR_SKILL_PREFIX + target, PLUGIN_SKILL_PREFIX + target
    if target.startswith("draft-skills/") or target.startswith("draft-plugins/"):
        return target, ""
    return f"{AUTHOR_SKILL_PREFIX}{target}", f"{PLUGIN_SKILL_PREFIX}{target}"


def evidence_label(status: str) -> str:
    if status == "runtime-verified":
        return "runtime-tested"
    if status in {"docs-verified", "project-specific"}:
        return status
    return "unverified"


def bullet_list(items: list[Any], fallback: str = "- none") -> list[str]:
    values = [str(item).strip() for item in items if str(item).strip()]
    if not values:
        return [fallback]
    return [f"- {value}" for value in values]


def review_ready_errors(record: dict[str, Any]) -> list[str]:
    review = record.get("review")
    if not isinstance(review, dict):
        return ["record has no review object"]
    errors: list[str] = []
    if review.get("decision") != "accept-for-promotion":
        errors.append("review.decision is not accept-for-promotion")
    if review.get("promotion_ready") is not True:
        errors.append("review.promotion_ready is not true")
    target = review.get("target_reference") or record.get("proposed_skill_update", {}).get("file")
    if not isinstance(target, str) or not target.strip():
        errors.append("review target_reference or proposed_skill_update.file is missing")
    return errors


def generate(root: Path, record_path: Path, maintainer: str, source_bundle_id: str, semver: str, allow_unready: bool = False) -> str:
    feedback = load_module(root / "tools" / "nwn_skill_feedback.py", "nwn_skill_feedback_promotion_generator")
    record = load_json(record_path)
    errors = feedback.validate_record(record)
    if errors:
        raise ValueError("feedback record is invalid: " + "; ".join(errors))

    readiness_errors = review_ready_errors(record)
    if readiness_errors and not allow_unready:
        raise ValueError("feedback record is not promotion-ready: " + "; ".join(readiness_errors))

    review = record.get("review", {})
    proposed = record.get("proposed_skill_update", {})
    raw_target = str(review.get("target_reference") or proposed.get("file") or "")
    author_target, plugin_target = normalize_target(raw_target)
    label = evidence_label(str(record.get("status", "")))
    privacy_hits = feedback.scan_privacy_terms(record)
    proposal_id = f"RPP-{record.get('id', 'unknown')}"
    blocked_line = "none" if not readiness_errors else "; ".join(readiness_errors)
    runtime_steps = record.get("runtime_steps", [])
    evidence = record.get("evidence", [])

    lines = [
        "# Reference Promotion Proposal",
        "",
        "Generated from an accepted feedback record.",
        "",
        "## Purpose",
        "",
        "Use this proposal to turn one reviewed feedback record into a controlled reference patch for `nwn-server-gamedev`.",
        "",
        "This is not automatic learning. It does not self-update an installed skill, does not prove an NWN claim by itself, and does not replace a versioned release.",
        "",
        "## Source Feedback Record",
        "",
        f"- Proposal id: `{proposal_id}`",
        f"- Source record path: `{display_path(root, record_path)}`",
        f"- Source record id: `{record.get('id', '')}`",
        f"- Source bundle id, if any: `{source_bundle_id or 'none'}`",
        "- Required review state: `review.decision=accept-for-promotion`",
        "- Required promotion flag: `review.promotion_ready=true`",
        f"- Current review decision: `{review.get('decision', '')}`",
        f"- Current promotion flag: `{str(review.get('promotion_ready', '')).lower()}`",
        f"- Promotion readiness blocker: {blocked_line}",
        f"- Maintainer: `{maintainer or review.get('reviewer', '')}`",
        f"- Date: `{now_date()}`",
        "",
        "## Claim To Promote",
        "",
        f"- One-sentence claim: {record.get('summary', '')}",
        f"- Why it is useful for NWN server gamedev: {proposed.get('summary', '')}",
        f"- Domain: `{record.get('domain', '')}`",
        f"- Source type: `{record.get('source_type', '')}`",
        f"- Existing reference section affected: `{raw_target}`",
        f"- New wording or patch summary: {proposed.get('summary', '')}",
        "",
        "## Evidence Label",
        "",
        f"- Selected label: `{label}`",
        "",
        "Evidence summary:",
        "",
        *bullet_list(evidence),
        "",
        "Runtime/Toolset/client/server/logs/module evidence:",
        "",
        *bullet_list(runtime_steps),
        "",
        "Known uncertainty:",
        "",
        f"- {record.get('failure_mode') or 'Maintainer must confirm scope before patching references.'}",
        "",
        "## Target Reference Patch",
        "",
        "Patch both copies or stop:",
        "",
        f"- Authoring reference target: `{author_target}`",
        f"- Plugin-packaged reference target: `{plugin_target or 'MISSING - choose matching plugin-packaged copy before patching'}`",
        "- `SKILL.md` routing change needed: maintainer decision",
        "- `source-of-truth-map.md` update needed: yes",
        "- `external-nwn-source-registry.md` update needed: if a new source lane is introduced",
        "- `version-manifest.json` update needed: yes, through SemVer and release metadata",
        "",
        "Proposed patch notes:",
        "",
        "```text",
        str(proposed.get("summary", "")).strip() or "Fill exact reference section, heading, or insertion point before patching.",
        "```",
        "",
        "## Privacy And Scope",
        "",
        "Confirm the proposal excludes credentials, tokens, IP addresses, account names, private player data, private module names or files without permission, and private server logs unless redacted.",
        "",
        f"- Privacy scan terms in source record: `{', '.join(privacy_hits) if privacy_hits else 'none'}`",
        f"- Server context: `{record.get('server_context', '') or 'not supplied'}`",
        f"- NWN version: `{record.get('nwn_version', '') or 'not supplied'}`",
        "",
        "Scope decision:",
        "",
        f"- Global reusable guidance: {'yes' if label in {'docs-verified', 'runtime-tested'} else 'maintainer decision'}",
        f"- Project-specific guidance: {'yes' if label == 'project-specific' else 'maintainer decision'}",
        "- Rejected or held because: fill only if maintainer stops the proposal",
        "",
        "## SemVer Decision",
        "",
        f"- Proposed SemVer class: `{semver}`",
        "",
        "Version files to update:",
        "",
        "- `version-manifest.json`",
        "- `draft-plugins/nwn-server-gamedev-pack/.codex-plugin/plugin.json`",
        "- release handoff under `release-handoffs/`",
        "",
        "## Verification Commands",
        "",
        "Run after patching:",
        "",
        "```powershell",
        "python docs\\nwn-skill-pack\\tools\\check_skill_routes.py docs\\nwn-skill-pack\\draft-skills\\nwn-server-gamedev",
        "python docs\\nwn-skill-pack\\tools\\check_skill_routes.py docs\\nwn-skill-pack\\draft-plugins\\nwn-server-gamedev-pack\\skills\\nwn-server-gamedev",
        "python docs\\nwn-skill-pack\\tools\\check_domain_reference_status.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_versioning_policy.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_plugin_package.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_release_gate.py docs\\nwn-skill-pack --target repo-artifact",
        "python docs\\nwn-skill-pack\\tools\\run_repo_artifact_preflight.py docs\\nwn-skill-pack",
        "```",
        "",
        "## Promotion Result",
        "",
        "- Accepted into reference files: pending",
        "- Moved or copied to `knowledge-inbox/promoted/`: pending",
        "- Reference promotion record written under `knowledge-inbox/reference-promotions/records/`: pending",
        "- Release handoff updated: pending",
        "- Follow-up forward test needed: maintainer decision",
        "- Follow-up runtime test needed: maintainer decision",
        "",
        "After patching and promotion, validate the decision record and refresh the aggregate:",
        "",
        "```powershell",
        "python docs\\nwn-skill-pack\\tools\\reference_promotion_record.py validate docs\\nwn-skill-pack\\knowledge-inbox\\reference-promotions\\records",
        "python docs\\nwn-skill-pack\\tools\\reference_promotion_record.py aggregate docs\\nwn-skill-pack\\knowledge-inbox\\reference-promotions\\records --out docs\\nwn-skill-pack\\knowledge-inbox\\reference-promotions\\aggregate.md",
        "python docs\\nwn-skill-pack\\tools\\check_reference_promotion_records.py docs\\nwn-skill-pack",
        "```",
        "",
        "## Does Not Prove",
        "",
        "This proposal does not prove fresh Codex behavior, plugin installation, public marketplace behavior, NWN runtime behavior, balance, fun, security, privacy safety beyond maintainer review, or future automatic skill improvement.",
    ]
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", help="Path to docs/nwn-skill-pack root.")
    parser.add_argument("record", help="Accepted reviewed feedback record JSON.")
    parser.add_argument("--out", default="", help="Output markdown path.")
    parser.add_argument("--maintainer", default="")
    parser.add_argument("--source-bundle-id", default="")
    parser.add_argument("--semver", default="MINOR", choices=["PATCH", "MINOR", "MAJOR"])
    parser.add_argument("--allow-unready", action="store_true", help="Generate a blocked draft even when review is not promotion-ready.")
    args = parser.parse_args()

    root = Path(args.root)
    record_path = Path(args.record)
    try:
        output = generate(
            root,
            record_path,
            maintainer=args.maintainer,
            source_bundle_id=args.source_bundle_id,
            semver=args.semver,
            allow_unready=args.allow_unready,
        )
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    record_id = load_json(record_path).get("id", "proposal")
    out_path = Path(args.out) if args.out else root / "knowledge-inbox" / "reference-promotion-proposals" / f"{record_id}.md"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(output, encoding="utf-8")
    print(out_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
