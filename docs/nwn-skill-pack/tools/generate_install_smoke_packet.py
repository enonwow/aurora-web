#!/usr/bin/env python3
"""Generate the INSTALL-001 tester packet from the current local marketplace sandbox."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


MARKETPLACE_ROOT = Path(".codex-tmp/marketplace-candidate")
MARKETPLACE_FILE = MARKETPLACE_ROOT / "marketplace.json"
PLUGIN_ROOT = MARKETPLACE_ROOT / "plugins" / "nwn-server-gamedev-pack"
SKILL_PATH = PLUGIN_ROOT / "skills" / "nwn-server-gamedev"
SMOKE_PROMPT = (
    "Use $nwn-server-gamedev to list which references you would read before "
    "designing a small NWN:EE crafting NUI, and label what would still need runtime evidence."
)


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def command(path: Path) -> str:
    return str(path).replace("/", "\\")


def absolute(path: Path) -> str:
    return str(path.resolve())


def generate(root: Path) -> str:
    marketplace_path = root / MARKETPLACE_FILE
    plugin_root = root / PLUGIN_ROOT
    skill_path = root / SKILL_PATH
    marketplace_root = root / MARKETPLACE_ROOT
    manifest_path = root / "version-manifest.json"

    marketplace = load_json(marketplace_path)
    manifest = load_json(manifest_path)
    plugins = marketplace.get("plugins", [])
    plugin_entry = plugins[0] if isinstance(plugins, list) and plugins else {}
    source = plugin_entry.get("source", {}) if isinstance(plugin_entry, dict) else {}
    policy = plugin_entry.get("policy", {}) if isinstance(plugin_entry, dict) else {}

    lines = [
        "# INSTALL-001 Tester Packet",
        "",
        f"Generated from package metadata last updated: {manifest.get('last_updated')}",
        "",
        "## Purpose",
        "",
        "Run one install smoke test for the NWN server gamedev plugin. This packet is a handoff aid, not proof that the install has happened.",
        "",
        "## Current Package State",
        "",
        f"- Package: `{manifest.get('package_name')}`",
        f"- Version: `{manifest.get('version')}`",
        f"- State: `{manifest.get('package_state')}`",
        f"- Marketplace sandbox: `{absolute(marketplace_root)}`",
        f"- Marketplace file: `{absolute(marketplace_path)}`",
        f"- Plugin root: `{absolute(plugin_root)}`",
        f"- Skill path: `{absolute(skill_path)}`",
        "",
        "## Marketplace Entry",
        "",
        f"- Marketplace name: `{marketplace.get('name')}`",
        f"- Plugin name: `{plugin_entry.get('name') if isinstance(plugin_entry, dict) else ''}`",
        f"- Source type: `{source.get('source') if isinstance(source, dict) else ''}`",
        f"- Source path: `{source.get('path') if isinstance(source, dict) else ''}`",
        f"- Installation policy: `{policy.get('installation') if isinstance(policy, dict) else ''}`",
        f"- Authentication policy: `{policy.get('authentication') if isinstance(policy, dict) else ''}`",
        f"- Category: `{plugin_entry.get('category') if isinstance(plugin_entry, dict) else ''}`",
        "",
        "## Preparation Commands",
        "",
        "Run these from the repository root before the actual install smoke:",
        "",
        "```powershell",
        "python docs\\nwn-skill-pack\\tools\\build_plugin_install_candidate.py docs\\nwn-skill-pack --force",
        "python docs\\nwn-skill-pack\\tools\\build_local_marketplace_candidate.py docs\\nwn-skill-pack --force",
        "python docs\\nwn-skill-pack\\tools\\check_isolated_install_layout.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_plugin_package.py docs\\nwn-skill-pack",
        "$env:PYTHONPATH='C:\\Projects\\aurora-web\\.codex-tmp\\pydeps'",
        "python C:\\Users\\enonw\\.codex\\skills\\.system\\plugin-creator\\scripts\\validate_plugin.py docs\\nwn-skill-pack\\.codex-tmp\\marketplace-candidate\\plugins\\nwn-server-gamedev-pack",
        "python C:\\Users\\enonw\\.codex\\skills\\.system\\skill-creator\\scripts\\quick_validate.py docs\\nwn-skill-pack\\.codex-tmp\\marketplace-candidate\\plugins\\nwn-server-gamedev-pack\\skills\\nwn-server-gamedev",
        "```",
        "",
        "The isolated layout check writes:",
        "",
        "- `docs/nwn-skill-pack/.codex-tmp/isolated-install-layout/INSTALL-001/`",
        "- `docs/nwn-skill-pack/.codex-tmp/isolated-install-layout/INSTALL-001/ISOLATED-INSTALL-LAYOUT-SUMMARY.json`",
        "",
        "That local layout smoke is preparation evidence only and must not be recorded as an install-smoke-test pass.",
        "",
        "## Install Or Register Step",
        "",
        "This step intentionally changes Codex plugin configuration. Run it only in the test environment selected for INSTALL-001.",
        "",
        "For this repo-local marketplace sandbox, the expected command shape is:",
        "",
        "```powershell",
        f"codex plugin marketplace add \"{absolute(marketplace_root)}\"",
        "```",
        "",
        "If the tester uses the Codex app UI instead of the CLI, record the exact UI path and the same marketplace root.",
        "",
        "## New Thread Smoke Prompt",
        "",
        "After install or registration, start a fresh Codex thread and run:",
        "",
        "```text",
        SMOKE_PROMPT,
        "```",
        "",
        "A passing response must mention the relevant NUI, NWScript, and runtime QA references and must not claim NWN runtime completion.",
        "",
        "## Passing Observations",
        "",
        "- New thread was started after install or registration.",
        "- `$nwn-server-gamedev` was visible or explicitly invokable.",
        "- The answer routed to `nui-player-ui.md`, `nwscript-events-systems.md`, and `testing-runtime-qa.md`.",
        "- The answer kept runtime evidence separate from design/static evidence.",
        "- No private module files, credentials, server logs, or private community transcripts were copied into the plugin.",
        "- The record command includes install verification flags for registered/installed source, fresh context, visible skill, expected reference routing, and runtime-boundary preservation.",
        "",
        "## Result Decision Table",
        "",
        "- `pass`: the plugin was registered or installed in the selected test environment, a new Codex thread could invoke `$nwn-server-gamedev`, the smoke answer routed to all expected references, and the answer kept runtime evidence separate from install evidence.",
        "- `partial`: install or registration partly worked, but skill visibility, routing, freshness, or evidence labeling was incomplete. Record an improvement action.",
        "- `fail`: install or registration failed, the old cached skill was used, a required packaged file was missing, privacy-sensitive data entered the package, or the smoke answer made false runtime claims. Record at least one issue and an improvement action.",
        "- `not-run`: the tester could not change Codex plugin configuration, could not start a fresh thread, or did not run the smoke prompt. This is not release evidence.",
        "",
        "Do not record `pass` from preparation commands alone. `install-smoke-test` pass records require `install_verification` fields proving the package was registered or installed, a fresh context was started, the skill was visible or invokable, expected references routed, runtime evidence was not overstated, and the result was not preparation-only.",
        "",
        "## Record Command",
        "",
        "Replace bracketed placeholders with the actual tester, Codex build/channel, and observed install evidence:",
        "",
        "```powershell",
        "python docs\\nwn-skill-pack\\tools\\forward_test_record.py new `",
        "  --record-type install-smoke-test `",
        "  --test-id INSTALL-001 `",
        "  --id install-001-local-plugin-install-smoke `",
        "  --title \"Local plugin install smoke\" `",
        "  --result pass `",
        "  --tester \"[tester]\" `",
        f"  --context \"[Codex build/channel]; marketplace root: {absolute(marketplace_root)}; fresh thread: yes\" `",
        f"  --prompt-or-command \"codex plugin marketplace add '{absolute(marketplace_root)}' ; {SMOKE_PROMPT}\" `",
        f"  --skill-path \"{command(root / SKILL_PATH)}\" `",
        "  --expected-reference nui-player-ui.md `",
        "  --expected-reference nwscript-events-systems.md `",
        "  --expected-reference testing-runtime-qa.md `",
        "  --observed-reference nui-player-ui.md `",
        "  --observed-reference nwscript-events-systems.md `",
        "  --observed-reference testing-runtime-qa.md `",
        "  --evidence-label install-smoke `",
        "  --evidence \"[skill visible or invokable in a fresh thread]\" `",
        "  --evidence \"[routing answer preserved runtime-evidence boundary]\" `",
        "  --install-registered-or-installed `",
        "  --install-fresh-context `",
        "  --install-skill-visible `",
        "  --install-expected-references-routed `",
        "  --install-runtime-boundary-preserved `",
        "  --missing-evidence \"No NWN module/runtime evidence; install smoke only.\"",
        "```",
        "",
        "Then regenerate derived reports:",
        "",
        "```powershell",
        "python docs\\nwn-skill-pack\\tools\\forward_test_record.py validate docs\\nwn-skill-pack\\forward-tests\\records\\install-001-local-plugin-install-smoke.json",
        "python docs\\nwn-skill-pack\\tools\\check_install_smoke_records.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\forward_test_record.py aggregate docs\\nwn-skill-pack\\forward-tests\\records --out docs\\nwn-skill-pack\\forward-tests\\aggregate.md",
        "python docs\\nwn-skill-pack\\tools\\generate_release_readiness.py docs\\nwn-skill-pack --out docs\\nwn-skill-pack\\release-readiness.md",
        "python docs\\nwn-skill-pack\\tools\\generate_package_inventory.py docs\\nwn-skill-pack --out-json docs\\nwn-skill-pack\\package-inventory.json --out-md docs\\nwn-skill-pack\\package-inventory.md",
        "```",
        "",
        "## Feedback Candidate Command",
        "",
        "For `partial` or `fail`, create a feedback candidate after the install-smoke record exists. This captures reusable package, trigger, routing, cache, privacy, or runtime-boundary lessons without changing the installed skill or plugin automatically.",
        "",
        "```powershell",
        "python docs\\nwn-skill-pack\\tools\\nwn_skill_feedback.py new `",
        "  --domain deployment `",
        "  --title \"INSTALL-001 install-smoke gap: [short gap]\" `",
        "  --summary \"[what failed in install/register/fresh context/skill visibility/reference routing/evidence boundary]\" `",
        "  --source-type maintainer-review `",
        "  --status unverified `",
        "  --evidence \"install-smoke record: docs\\nwn-skill-pack\\forward-tests\\records\\install-001-local-plugin-install-smoke.json\" `",
        "  --files-or-scripts \"docs\\nwn-skill-pack\\forward-tests\\install-smoke-packet.md\" `",
        "  --files-or-scripts \"docs\\nwn-skill-pack\\forward-tests\\install-smoke-execution-playbook.md\" `",
        "  --failure-mode \"[registration failed, skill invisible, stale cache, routing miss, false runtime claim, privacy/package leak]\" `",
        "  --proposed-file \"draft-skills/nwn-server-gamedev/SKILL.md\" `",
        "  --proposed-summary \"[trigger/routing/package guidance improvement, or write 'plugin packaging fix required outside skill']\" `",
        "  --notes \"INSTALL-001 feedback candidate; does not update installed skill/plugin until reviewed and promoted.\"",
        "```",
        "",
        "Then validate and review the candidate conservatively:",
        "",
        "```powershell",
        "python docs\\nwn-skill-pack\\tools\\nwn_skill_feedback.py validate docs\\nwn-skill-pack\\knowledge-inbox\\incoming",
        "python docs\\nwn-skill-pack\\tools\\nwn_skill_feedback.py review <record> --reviewer \"[reviewer]\" --decision needs-more-evidence --status project-specific --required-action \"[required install proof, package patch, or skill routing patch]\" --notes \"[review notes]\"",
        "```",
        "",
        "## Failure Handling",
        "",
        "Record `partial` or `fail` if the plugin cannot be registered, the skill is not visible, an old cached skill appears, the smoke answer skips evidence labels, or the answer fails to route to expected references. `partial` and `fail` records must include an improvement action.",
    ]
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--out", default="docs/nwn-skill-pack/forward-tests/install-smoke-packet.md")
    args = parser.parse_args()

    root = Path(args.root)
    try:
        output = generate(root)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(output, encoding="utf-8")
    print(out_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
