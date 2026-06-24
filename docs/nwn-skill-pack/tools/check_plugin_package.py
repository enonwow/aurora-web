#!/usr/bin/env python3
"""Audit the NWN skill-pack plugin package before RC handoff."""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable


SEMVER_RE = re.compile(
    r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)"
    r"(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?"
    r"(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$"
)

IGNORED_DIRS = {"__pycache__", ".git"}
IGNORED_SUFFIXES = {".pyc", ".pyo"}


@dataclass
class Audit:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    checks: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def iter_files(root: Path) -> Iterable[Path]:
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        if any(part in IGNORED_DIRS for part in path.relative_to(root).parts):
            continue
        if path.suffix in IGNORED_SUFFIXES:
            continue
        yield path


def rel_file_map(root: Path) -> dict[str, str]:
    return {
        str(path.relative_to(root)).replace("\\", "/"): sha256(path)
        for path in iter_files(root)
    }


def require_path(audit: Audit, path: Path, label: str) -> bool:
    if path.exists():
        audit.ok(f"{label} exists: {path}")
        return True
    audit.error(f"{label} is missing: {path}")
    return False


def check_manifest(audit: Audit, plugin_root: Path) -> None:
    manifest_path = plugin_root / ".codex-plugin" / "plugin.json"
    if not require_path(audit, manifest_path, "plugin manifest"):
        return

    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        audit.error(f"plugin manifest is invalid JSON: {exc}")
        return

    folder_name = plugin_root.name
    if manifest.get("name") != folder_name:
        audit.error(
            f"plugin name {manifest.get('name')!r} does not match folder {folder_name!r}"
        )
    else:
        audit.ok("plugin name matches folder")

    version = manifest.get("version")
    if not isinstance(version, str) or not SEMVER_RE.match(version):
        audit.error(f"plugin version is not strict semver: {version!r}")
    else:
        audit.ok(f"plugin version is strict semver: {version}")

    if manifest.get("skills") != "./skills/":
        audit.error("plugin manifest should use skills path './skills/'")
    elif not (plugin_root / "skills").is_dir():
        audit.error("plugin manifest declares skills but plugin skills directory is missing")
    else:
        audit.ok("plugin skills path is valid")

    companion_fields = {
        "apps": ".app.json",
        "mcpServers": ".mcp.json",
    }
    for field_name, relative_path in companion_fields.items():
        if field_name in manifest and not (plugin_root / relative_path).exists():
            audit.error(
                f"plugin manifest declares {field_name} but {relative_path} is missing"
            )

    interface = manifest.get("interface")
    required_interface = [
        "displayName",
        "shortDescription",
        "longDescription",
        "developerName",
        "category",
        "capabilities",
        "defaultPrompt",
    ]
    if not isinstance(interface, dict):
        audit.error("plugin manifest is missing interface object")
        return

    for key in required_interface:
        if key not in interface:
            audit.error(f"plugin interface is missing {key}")
    audit.ok("plugin interface required fields checked")

    for asset_key in ("composerIcon", "logo"):
        asset = interface.get(asset_key)
        if asset and not (plugin_root / asset).exists():
            audit.error(f"plugin interface {asset_key} points to missing file: {asset}")

    screenshots = interface.get("screenshots", [])
    if screenshots and not isinstance(screenshots, list):
        audit.error("plugin interface screenshots must be a list")
    for screenshot in screenshots if isinstance(screenshots, list) else []:
        if not isinstance(screenshot, str):
            audit.error("plugin interface screenshots must contain strings")
        elif not (plugin_root / screenshot).exists():
            audit.error(f"plugin screenshot path is missing: {screenshot}")


def check_skill_sync(audit: Audit, author_skill: Path, packaged_skill: Path) -> None:
    if not require_path(audit, author_skill, "authoring skill"):
        return
    if not require_path(audit, packaged_skill, "plugin-packaged skill"):
        return

    author_files = rel_file_map(author_skill)
    packaged_files = rel_file_map(packaged_skill)

    missing = sorted(set(author_files) - set(packaged_files))
    extra = sorted(set(packaged_files) - set(author_files))
    changed = sorted(
        rel for rel in set(author_files) & set(packaged_files)
        if author_files[rel] != packaged_files[rel]
    )

    for rel in missing:
        audit.error(f"plugin-packaged skill is missing {rel}")
    for rel in extra:
        audit.error(f"plugin-packaged skill has extra file {rel}")
    for rel in changed:
        audit.error(f"plugin-packaged skill differs from authoring skill: {rel}")

    if not missing and not extra and not changed:
        audit.ok("authoring skill and plugin-packaged skill are synchronized")


def check_release_docs(audit: Audit, root: Path) -> None:
    required = [
        "plugin-release-candidate-checklist.md",
        "release-handoff-template.md",
        "release-readiness.md",
        "release-notes-draft.md",
        "release-next-actions.md",
        "release-evidence-index.md",
        "rc-blocker-burndown.md",
        "forward-tests/rc-prompt-test-handoff.md",
        "forward-tests/minimum-rc-proof-packet.md",
        "forward-tests/rc-unblock-playbook.md",
        "package-inventory.json",
        "package-inventory.md",
        "package-boundaries.md",
        "contributor-feedback-packet.md",
        "human-feedback-release-workflow.md",
        "knowledge-inbox/feedback-review-rubric.md",
        "feedback-intake-status.md",
        "knowledge-inbox/reference-promotion-proposal-template.md",
        "knowledge-inbox/reference-promotions/aggregate.md",
        "knowledge-inbox/contribution-bundle-format.md",
        "knowledge-inbox/contributor-intake-quickstart.md",
        "knowledge-inbox/external-contributor-trial-packet.md",
        "knowledge-inbox/external-contributor-trial-result-template.md",
        "knowledge-inbox/external-trials/ext-001-handoff.md",
        "knowledge-inbox/external-trials/ext-001-tester-message.md",
        "knowledge-inbox/model-import-policy.md",
        "knowledge-inbox/aurora-live-first-session-command-sheet.md",
        "knowledge-inbox/aurora-live-first-review-command-sheet.md",
        "knowledge-index-policy.md",
        "architecture-escalation-scorecard.md",
        "architecture-decisions/adr-0001-skill-plugin-first.md",
        "maintainer-decision-index.md",
        "versioning-policy.md",
        "version-bump-plan.md",
        "version-manifest.json",
        "architecture-escalation-roadmap.md",
        "plugin-distribution-plan.md",
        "release-and-review-checklists.md",
        "source-of-truth-map.md",
        "external-nwn-source-registry.md",
        "forward-test-plan.md",
        "forward-test-results.md",
        "forward-tests/evidence-acceptance-policy.md",
        "forward-tests/answer-capture-template.md",
        "forward-tests/ft-009-local-intake-clean-session-handoff.md",
        "forward-tests/reviewer-matrix.json",
        "forward-tests/execution-queue.md",
        "forward-tests/reviewer-packet.md",
        "forward-tests/record-command-templates.md",
        "forward-tests/install-smoke-checklist.md",
        "forward-tests/install-smoke-packet.md",
        "forward-tests/install-smoke-execution-playbook.md",
        "tools/check_skill_routes.py",
        "tools/nwn_skill_feedback.py",
        "tools/forward_test_record.py",
        "tools/check_record_contracts.py",
        "tools/check_feedback_intake_docs.py",
        "tools/check_feedback_review_rubric.py",
        "tools/generate_feedback_intake_status.py",
        "tools/check_feedback_intake_status.py",
        "tools/check_reference_promotion_proposal_template.py",
        "tools/generate_reference_promotion_proposal.py",
        "tools/check_reference_promotion_proposal_tool.py",
        "tools/reference_promotion_record.py",
        "tools/check_reference_promotion_records.py",
        "tools/check_contribution_bundle_format.py",
        "tools/check_contribution_bundle_roundtrip.py",
        "tools/check_contributor_intake_quickstart.py",
        "tools/check_external_contributor_trial_packet.py",
        "tools/check_external_contributor_trial_result_template.py",
        "tools/generate_external_trial_handoff.py",
        "tools/check_external_trial_handoff.py",
        "tools/generate_external_trial_tester_message.py",
        "tools/check_external_trial_tester_message.py",
        "tools/build_external_trial_public_packet.py",
        "tools/check_external_trial_public_packet.py",
        "tools/check_external_trial_cleanroom.py",
        "tools/build_external_trial_dispatch_bundle.py",
        "tools/check_external_trial_dispatch_bundle.py",
        "tools/check_external_trial_received_dispatch.py",
        "tools/external_trial_record.py",
        "tools/check_external_trial_records.py",
        "tools/check_model_import_policy.py",
        "tools/check_knowledge_index_policy.py",
        "tools/check_architecture_scorecard.py",
        "tools/check_architecture_decisions.py",
        "tools/check_maintainer_decision_index.py",
        "tools/check_versioning_policy.py",
        "tools/generate_version_bump_plan.py",
        "tools/check_version_bump_plan.py",
        "tools/check_external_source_registry.py",
        "tools/check_domain_reference_status.py",
        "tools/check_capability_map.py",
        "tools/check_feature_design_template.py",
        "tools/check_version_manifest.py",
        "tools/check_release_readiness.py",
        "tools/generate_release_notes_draft.py",
        "tools/check_release_notes_draft.py",
        "tools/generate_release_next_actions.py",
        "tools/check_release_next_actions.py",
        "tools/generate_release_evidence_index.py",
        "tools/check_release_evidence_index.py",
        "tools/generate_rc_blocker_burndown.py",
        "tools/check_rc_blocker_burndown.py",
        "tools/generate_rc_prompt_test_handoff.py",
        "tools/check_rc_prompt_test_handoff.py",
        "tools/generate_minimum_rc_proof_packet.py",
        "tools/check_minimum_rc_proof_packet.py",
        "tools/check_rc_unblock_playbook.py",
        "tools/check_release_handoff.py",
        "tools/generate_release_readiness.py",
        "tools/generate_feedback_promotion_backlog.py",
        "tools/generate_package_inventory.py",
        "tools/check_package_inventory.py",
        "tools/check_package_boundaries.py",
        "tools/build_plugin_install_candidate.py",
        "tools/build_local_marketplace_candidate.py",
        "tools/check_install_candidate.py",
        "tools/check_isolated_install_layout.py",
        "tools/generate_install_smoke_packet.py",
        "tools/check_install_smoke_packet.py",
        "tools/check_install_smoke_playbook.py",
        "tools/check_install_smoke_records.py",
        "tools/check_forward_test_evidence_policy.py",
        "tools/check_forward_test_capture_template.py",
        "tools/check_ft009_local_intake_handoff.py",
        "tools/generate_forward_test_execution_queue.py",
        "tools/generate_forward_test_record_templates.py",
        "tools/generate_forward_test_reviewer_packet.py",
        "tools/check_forward_test_prompts.py",
        "tools/check_release_gate.py",
        "tools/run_repo_artifact_preflight.py",
        "knowledge-inbox/schema/feedback-record.schema.json",
        "knowledge-inbox/schema/reference-promotion-record.schema.json",
        "knowledge-inbox/schema/external-contributor-trial-record.schema.json",
        "knowledge-inbox/lifecycle-policy.md",
        "knowledge-inbox/promotion-backlog.md",
        "knowledge-inbox/external-trials/aggregate.md",
        "knowledge-inbox/templates/user-feedback-form.md",
        "knowledge-inbox/templates/github-issue-body.md",
        "forward-tests/schema/forward-test-record.schema.json",
        "forward-tests/aggregate.md",
    ]
    for rel in required:
        require_path(audit, root / rel, rel)

    for rel in [
        "package-inventory.json",
        "knowledge-inbox/schema/feedback-record.schema.json",
        "knowledge-inbox/schema/reference-promotion-record.schema.json",
        "knowledge-inbox/schema/external-contributor-trial-record.schema.json",
        "forward-tests/schema/forward-test-record.schema.json",
    ]:
        path = root / rel
        if not path.exists():
            continue
        try:
            parsed = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            audit.error(f"{rel} is invalid JSON: {exc}")
            continue
        if rel == "package-inventory.json":
            if not isinstance(parsed, dict) or "entries" not in parsed:
                audit.error("package-inventory.json is missing entries")
            else:
                audit.ok("package-inventory.json parses and has entries")
            continue
        schema = parsed
        if not isinstance(schema, dict) or "$schema" not in schema or "properties" not in schema:
            audit.error(f"{rel} is not shaped like a JSON Schema object")
        else:
            audit.ok(f"{rel} parses as JSON Schema")

    results = root / "forward-test-results.md"
    if results.exists() and "Pending Forward Tests" in results.read_text(encoding="utf-8"):
        audit.warn("forward tests are still marked pending; package is not RC yet")

    records = root / "forward-tests" / "records"
    if not records.is_dir():
        audit.warn("forward-tests/records is missing; no forward-test records are available")
    elif not list(records.glob("*.json")):
        audit.warn("forward-tests/records has no JSON records")
    else:
        audit.ok("forward-test records directory has JSON records")
        install_smoke_count = 0
        accepted_install_smoke_pass_count = 0
        for record_path in records.glob("*.json"):
            try:
                record = json.loads(record_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue
            if record.get("record_type") == "install-smoke-test":
                install_smoke_count += 1
                verification = record.get("install_verification")
                if (
                    record.get("result") == "pass"
                    and isinstance(verification, dict)
                    and verification.get("registered_or_installed") is True
                    and verification.get("fresh_context_started") is True
                    and verification.get("skill_visible_or_invokable") is True
                    and verification.get("expected_references_routed") is True
                    and verification.get("runtime_boundary_preserved") is True
                    and verification.get("preparation_only") is False
                ):
                    accepted_install_smoke_pass_count += 1
        if accepted_install_smoke_pass_count:
            audit.ok(f"accepted install-smoke-test pass records found: {accepted_install_smoke_pass_count}")
        elif install_smoke_count:
            audit.warn(
                "install-smoke-test records exist but no pass record has complete install_verification; install candidate gate remains blocked"
            )
        else:
            audit.warn("no install-smoke-test record found; install candidate gate remains blocked")


def check_record_contracts(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_record_contracts.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_record_contracts", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import record contract checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"record contract checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"record contract: {check}")
    for error in result.errors:
        audit.error(f"record contract: {error}")


def check_feedback_intake_docs(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_feedback_intake_docs.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_feedback_intake_docs", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import feedback intake doc checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"feedback intake doc checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"feedback intake docs: {check}")
    for error in result.errors:
        audit.error(f"feedback intake docs: {error}")


def check_feedback_intake_status(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_feedback_intake_status.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_feedback_intake_status", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import feedback intake status checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"feedback intake status checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"feedback intake status: {check}")
    for error in result.errors:
        audit.error(f"feedback intake status: {error}")


def check_feedback_review_rubric(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_feedback_review_rubric.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_feedback_review_rubric", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import feedback review rubric checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"feedback review rubric checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"feedback review rubric: {check}")
    for error in result.errors:
        audit.error(f"feedback review rubric: {error}")


def check_reference_promotion_proposal_template(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_reference_promotion_proposal_template.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_reference_promotion_proposal_template", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import reference promotion proposal template checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"reference promotion proposal template checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"reference promotion proposal template: {check}")
    for error in result.errors:
        audit.error(f"reference promotion proposal template: {error}")


def check_reference_promotion_proposal_tool(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_reference_promotion_proposal_tool.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_reference_promotion_proposal_tool", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import reference promotion proposal tool checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"reference promotion proposal tool checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"reference promotion proposal tool: {check}")
    for error in result.errors:
        audit.error(f"reference promotion proposal tool: {error}")


def check_reference_promotion_records(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_reference_promotion_records.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_reference_promotion_records", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import reference promotion records checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"reference promotion records checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"reference promotion records: {check}")
    for error in result.errors:
        audit.error(f"reference promotion records: {error}")


def check_contributor_intake_quickstart(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_contributor_intake_quickstart.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_contributor_intake_quickstart", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import contributor intake quickstart checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"contributor intake quickstart checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"contributor intake quickstart: {check}")
    for error in result.errors:
        audit.error(f"contributor intake quickstart: {error}")


def check_contribution_bundle_format(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_contribution_bundle_format.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_contribution_bundle_format", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import contribution bundle checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"contribution bundle checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"contribution bundle: {check}")
    for error in result.errors:
        audit.error(f"contribution bundle: {error}")


def check_contribution_bundle_roundtrip(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_contribution_bundle_roundtrip.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_contribution_bundle_roundtrip", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import contribution bundle roundtrip checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"contribution bundle roundtrip checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"contribution bundle roundtrip: {check}")
    for error in result.errors:
        audit.error(f"contribution bundle roundtrip: {error}")


def check_external_contributor_trial_packet(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_external_contributor_trial_packet.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_external_contributor_trial_packet", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import external contributor trial packet checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"external contributor trial packet checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"external contributor trial packet: {check}")
    for error in result.errors:
        audit.error(f"external contributor trial packet: {error}")


def check_external_contributor_trial_result_template(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_external_contributor_trial_result_template.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_external_contributor_trial_result_template", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import external contributor trial result template checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"external contributor trial result template checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"external contributor trial result template: {check}")
    for error in result.errors:
        audit.error(f"external contributor trial result template: {error}")


def check_external_trial_handoff(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_external_trial_handoff.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_external_trial_handoff", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import external trial handoff checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"external trial handoff checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"external trial handoff: {check}")
    for error in result.errors:
        audit.error(f"external trial handoff: {error}")


def check_external_trial_tester_message(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_external_trial_tester_message.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_external_trial_tester_message", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import external trial tester message checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"external trial tester message checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"external trial tester message: {check}")
    for error in result.errors:
        audit.error(f"external trial tester message: {error}")


def check_external_trial_public_packet(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_external_trial_public_packet.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_external_trial_public_packet", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import external trial public packet checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"external trial public packet checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"external trial public packet: {check}")
    for error in result.errors:
        audit.error(f"external trial public packet: {error}")


def check_external_trial_cleanroom(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_external_trial_cleanroom.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_external_trial_cleanroom", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import external trial cleanroom checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"external trial cleanroom checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"external trial cleanroom: {check}")
    for error in result.errors:
        audit.error(f"external trial cleanroom: {error}")


def check_external_trial_dispatch_bundle(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_external_trial_dispatch_bundle.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_external_trial_dispatch_bundle", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import external trial dispatch bundle checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"external trial dispatch bundle checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"external trial dispatch bundle: {check}")
    for error in result.errors:
        audit.error(f"external trial dispatch bundle: {error}")


def check_external_trial_received_dispatch(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_external_trial_received_dispatch.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_external_trial_received_dispatch", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import external trial received dispatch checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"external trial received dispatch checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"external trial received dispatch: {check}")
    for error in result.errors:
        audit.error(f"external trial received dispatch: {error}")


def check_external_trial_records(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_external_trial_records.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_external_trial_records", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import external trial records checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"external trial records checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"external trial records: {check}")
    for error in result.errors:
        audit.error(f"external trial records: {error}")


def check_model_import_policy(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_model_import_policy.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_model_import_policy", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import model import policy checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"model import policy checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"model import policy: {check}")
    for error in result.errors:
        audit.error(f"model import policy: {error}")


def check_knowledge_index_policy(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_knowledge_index_policy.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_knowledge_index_policy", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import knowledge index policy checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"knowledge index policy checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"knowledge index policy: {check}")
    for error in result.errors:
        audit.error(f"knowledge index policy: {error}")


def check_architecture_decisions(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_architecture_decisions.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_architecture_decisions", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import architecture decision checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"architecture decision checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"architecture decisions: {check}")
    for error in result.errors:
        audit.error(f"architecture decisions: {error}")


def check_architecture_scorecard(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_architecture_scorecard.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_architecture_scorecard", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import architecture scorecard checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"architecture scorecard checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"architecture scorecard: {check}")
    for error in result.errors:
        audit.error(f"architecture scorecard: {error}")


def check_maintainer_decision_index(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_maintainer_decision_index.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_maintainer_decision_index", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import maintainer decision index checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"maintainer decision index checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"maintainer decision index: {check}")
    for error in result.errors:
        audit.error(f"maintainer decision index: {error}")


def check_versioning_policy(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_versioning_policy.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_versioning_policy", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import versioning policy checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"versioning policy checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"versioning policy: {check}")
    for error in result.errors:
        audit.error(f"versioning policy: {error}")


def check_version_bump_plan(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_version_bump_plan.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_version_bump_plan", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import version bump plan checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"version bump plan checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"version bump plan: {check}")
    for error in result.errors:
        audit.error(f"version bump plan: {error}")


def check_external_source_registry(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_external_source_registry.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_external_source_registry", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import external source registry checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"external source registry checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"external source registry: {check}")
    for warning in result.warnings:
        audit.warn(f"external source registry: {warning}")
    for error in result.errors:
        audit.error(f"external source registry: {error}")


def check_domain_reference_status(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_domain_reference_status.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_domain_reference_status", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import domain reference status checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"domain reference status checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"domain reference status: {check}")
    for warning in result.warnings:
        audit.warn(f"domain reference status: {warning}")
    for error in result.errors:
        audit.error(f"domain reference status: {error}")


def check_capability_map(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_capability_map.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_capability_map", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import capability map checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"capability map checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"capability map: {check}")
    for error in result.errors:
        audit.error(f"capability map: {error}")


def check_feature_design_template(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_feature_design_template.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_feature_design_template", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import feature design template checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"feature design template checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"feature design template: {check}")
    for error in result.errors:
        audit.error(f"feature design template: {error}")


def check_version_manifest(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_version_manifest.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_version_manifest", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import version manifest checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"version manifest checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"version manifest: {check}")
    for warning in result.warnings:
        audit.warn(f"version manifest: {warning}")
    for error in result.errors:
        audit.error(f"version manifest: {error}")


def check_release_handoff(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_release_handoff.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_release_handoff", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import release handoff checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root, require_filled=False)
    except Exception as exc:
        audit.error(f"release handoff checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"release handoff: {check}")
    for warning in result.warnings:
        audit.warn(f"release handoff: {warning}")
    for error in result.errors:
        audit.error(f"release handoff: {error}")


def check_release_readiness(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_release_readiness.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_release_readiness", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import release readiness checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"release readiness checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"release readiness: {check}")
    for error in result.errors:
        audit.error(f"release readiness: {error}")


def check_release_notes_draft(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_release_notes_draft.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_release_notes_draft", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import release notes draft checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"release notes draft checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"release notes draft: {check}")
    for error in result.errors:
        audit.error(f"release notes draft: {error}")


def check_release_next_actions(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_release_next_actions.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_release_next_actions", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import release next-actions checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"release next-actions checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"release next-actions: {check}")
    for error in result.errors:
        audit.error(f"release next-actions: {error}")


def check_release_evidence_index(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_release_evidence_index.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_release_evidence_index", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import release evidence index checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"release evidence index checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"release evidence index: {check}")
    for error in result.errors:
        audit.error(f"release evidence index: {error}")


def check_rc_blocker_burndown(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_rc_blocker_burndown.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_rc_blocker_burndown", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import RC blocker burn-down checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"RC blocker burn-down checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"RC blocker burn-down: {check}")
    for error in result.errors:
        audit.error(f"RC blocker burn-down: {error}")


def check_rc_prompt_test_handoff(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_rc_prompt_test_handoff.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_rc_prompt_test_handoff", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import RC prompt-test handoff checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"RC prompt-test handoff checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"RC prompt-test handoff: {check}")
    for error in result.errors:
        audit.error(f"RC prompt-test handoff: {error}")


def check_minimum_rc_proof_packet(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_minimum_rc_proof_packet.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_minimum_rc_proof_packet", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import minimum RC proof packet checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"minimum RC proof packet checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"minimum RC proof packet: {check}")
    for error in result.errors:
        audit.error(f"minimum RC proof packet: {error}")


def check_rc_unblock_playbook(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_rc_unblock_playbook.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_rc_unblock_playbook", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import RC unblock playbook checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"RC unblock playbook checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"RC unblock playbook: {check}")
    for error in result.errors:
        audit.error(f"RC unblock playbook: {error}")


def check_package_inventory(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_package_inventory.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_package_inventory", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import package inventory checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"package inventory checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"package inventory: {check}")
    for error in result.errors:
        audit.error(f"package inventory: {error}")


def check_package_boundaries(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_package_boundaries.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_package_boundaries", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import package boundary checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"package boundary checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"package boundaries: {check}")
    for warning in result.warnings:
        audit.warn(f"package boundaries: {warning}")
    for error in result.errors:
        audit.error(f"package boundaries: {error}")


def check_install_candidate(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_install_candidate.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_install_candidate", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import install candidate checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"install candidate checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"install candidate: {check}")
    for warning in result.warnings:
        audit.warn(f"install candidate: {warning}")
    for error in result.errors:
        audit.error(f"install candidate: {error}")


def check_isolated_install_layout(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_isolated_install_layout.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_isolated_install_layout", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import isolated install layout checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"isolated install layout checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"isolated install layout: {check}")
    for warning in result.warnings:
        audit.warn(f"isolated install layout: {warning}")
    for error in result.errors:
        audit.error(f"isolated install layout: {error}")


def check_install_smoke_playbook(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_install_smoke_playbook.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_install_smoke_playbook", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import install-smoke playbook checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"install-smoke playbook checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"install-smoke playbook: {check}")
    for error in result.errors:
        audit.error(f"install-smoke playbook: {error}")


def check_install_smoke_records(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_install_smoke_records.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_install_smoke_records", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import install-smoke records checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"install-smoke records checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"install-smoke records: {check}")
    for warning in result.warnings:
        audit.warn(f"install-smoke records: {warning}")
    for error in result.errors:
        audit.error(f"install-smoke records: {error}")


def check_forward_test_prompts(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_forward_test_prompts.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_forward_test_prompts", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import forward-test prompt checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"forward-test prompt checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"forward-test prompts: {check}")
    for error in result.errors:
        audit.error(f"forward-test prompts: {error}")


def check_forward_test_capture_template(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_forward_test_capture_template.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_forward_test_capture_template", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import forward-test capture template checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"forward-test capture template checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"forward-test capture template: {check}")
    for error in result.errors:
        audit.error(f"forward-test capture template: {error}")


def check_ft009_local_intake_handoff(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_ft009_local_intake_handoff.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_ft009_local_intake_handoff", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import FT-009 local-intake handoff checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"FT-009 local-intake handoff checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"FT-009 local-intake handoff: {check}")
    for error in result.errors:
        audit.error(f"FT-009 local-intake handoff: {error}")


def check_forward_test_evidence_policy(audit: Audit, root: Path) -> None:
    tool_path = root / "tools" / "check_forward_test_evidence_policy.py"
    if not tool_path.exists():
        return

    spec = importlib.util.spec_from_file_location("check_forward_test_evidence_policy", tool_path)
    if spec is None or spec.loader is None:
        audit.error(f"could not import forward-test evidence policy checker: {tool_path}")
        return

    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.run(root)
    except Exception as exc:
        audit.error(f"forward-test evidence policy checker failed: {exc}")
        return

    for check in result.checks:
        audit.ok(f"forward-test evidence policy: {check}")
    for error in result.errors:
        audit.error(f"forward-test evidence policy: {error}")


def check_forbidden_package_paths(audit: Audit, plugin_root: Path) -> None:
    forbidden_names = {".codex-tmp", "knowledge-inbox"}
    for path in plugin_root.rglob("*"):
        rel_parts = set(path.relative_to(plugin_root).parts)
        for forbidden in forbidden_names & rel_parts:
            audit.error(f"plugin package contains forbidden path segment: {forbidden}")
    audit.ok("forbidden plugin package path scan completed")


def run_audit(root: Path) -> Audit:
    audit = Audit()
    author_skill = root / "draft-skills" / "nwn-server-gamedev"
    plugin_root = root / "draft-plugins" / "nwn-server-gamedev-pack"
    packaged_skill = plugin_root / "skills" / "nwn-server-gamedev"

    check_release_docs(audit, root)
    check_record_contracts(audit, root)
    check_feedback_intake_docs(audit, root)
    check_feedback_review_rubric(audit, root)
    check_feedback_intake_status(audit, root)
    check_reference_promotion_proposal_template(audit, root)
    check_reference_promotion_proposal_tool(audit, root)
    check_reference_promotion_records(audit, root)
    check_contribution_bundle_format(audit, root)
    check_contribution_bundle_roundtrip(audit, root)
    check_contributor_intake_quickstart(audit, root)
    check_external_contributor_trial_packet(audit, root)
    check_external_contributor_trial_result_template(audit, root)
    check_external_trial_handoff(audit, root)
    check_external_trial_tester_message(audit, root)
    check_external_trial_public_packet(audit, root)
    check_external_trial_cleanroom(audit, root)
    check_external_trial_dispatch_bundle(audit, root)
    check_external_trial_received_dispatch(audit, root)
    check_external_trial_records(audit, root)
    check_model_import_policy(audit, root)
    check_knowledge_index_policy(audit, root)
    check_architecture_scorecard(audit, root)
    check_architecture_decisions(audit, root)
    check_maintainer_decision_index(audit, root)
    check_versioning_policy(audit, root)
    check_version_bump_plan(audit, root)
    check_external_source_registry(audit, root)
    check_domain_reference_status(audit, root)
    check_capability_map(audit, root)
    check_feature_design_template(audit, root)
    check_version_manifest(audit, root)
    check_release_readiness(audit, root)
    check_release_notes_draft(audit, root)
    check_release_next_actions(audit, root)
    check_release_evidence_index(audit, root)
    check_rc_blocker_burndown(audit, root)
    check_rc_prompt_test_handoff(audit, root)
    check_minimum_rc_proof_packet(audit, root)
    check_rc_unblock_playbook(audit, root)
    check_release_handoff(audit, root)
    check_package_inventory(audit, root)
    check_package_boundaries(audit, root)
    check_install_candidate(audit, root)
    check_isolated_install_layout(audit, root)
    check_install_smoke_playbook(audit, root)
    check_install_smoke_records(audit, root)
    check_forward_test_evidence_policy(audit, root)
    check_forward_test_capture_template(audit, root)
    check_forward_test_prompts(audit, root)
    check_ft009_local_intake_handoff(audit, root)
    check_manifest(audit, plugin_root)
    check_skill_sync(audit, author_skill, packaged_skill)
    check_forbidden_package_paths(audit, plugin_root)
    return audit


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Audit NWN skill-pack plugin packaging and sync."
    )
    parser.add_argument(
        "root",
        nargs="?",
        default="docs/nwn-skill-pack",
        help="Path to docs/nwn-skill-pack root.",
    )
    parser.add_argument("--json", action="store_true", help="Emit JSON report.")
    args = parser.parse_args()

    root = Path(args.root)
    audit = run_audit(root)

    if args.json:
        print(json.dumps({
            "errors": audit.errors,
            "warnings": audit.warnings,
            "checks": audit.checks,
        }, indent=2))
    else:
        for check in audit.checks:
            print(f"OK: {check}")
        for warning in audit.warnings:
            print(f"WARN: {warning}")
        for error in audit.errors:
            print(f"ERROR: {error}")
        if audit.errors:
            print(f"Package audit failed: {len(audit.errors)} error(s)")
        else:
            suffix = f", {len(audit.warnings)} warning(s)" if audit.warnings else ""
            print(f"Package audit passed{suffix}")

    return 1 if audit.errors else 0


if __name__ == "__main__":
    sys.exit(main())
