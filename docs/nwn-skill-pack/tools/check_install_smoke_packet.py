#!/usr/bin/env python3
"""Check that INSTALL-001 tester packet matches the current marketplace sandbox."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


MARKETPLACE_ROOT = Path(".codex-tmp/marketplace-candidate")
MARKETPLACE_FILE = MARKETPLACE_ROOT / "marketplace.json"
PLUGIN_NAME = "nwn-server-gamedev-pack"
MARKETPLACE_NAME = "nwn-server-gamedev-local"
PLUGIN_ROOT = MARKETPLACE_ROOT / "plugins" / PLUGIN_NAME
SKILL_PATH = PLUGIN_ROOT / "skills" / "nwn-server-gamedev"
PACKET_PATH = Path("forward-tests/install-smoke-packet.md")
SMOKE_PROMPT = (
    "Use $nwn-server-gamedev to list which references you would read before "
    "designing a small NWN:EE crafting NUI, and label what would still need runtime evidence."
)
EXPECTED_REFS = [
    "nui-player-ui.md",
    "nwscript-events-systems.md",
    "testing-runtime-qa.md",
]


@dataclass
class PacketCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def absolute(path: Path) -> str:
    return str(path.resolve())


def command(path: Path) -> str:
    return str(path).replace("/", "\\")


def cwd_relative(path: Path) -> str | None:
    try:
        return command(path.resolve().relative_to(Path.cwd().resolve()))
    except ValueError:
        return None


def require_contains(check: PacketCheck, text: str, needle: str, label: str) -> None:
    if needle in text:
        check.ok(label)
    else:
        check.error(f"install smoke packet is missing {label}: {needle!r}")


def require_any_contains(
    check: PacketCheck,
    text: str,
    needles: list[str],
    label: str,
) -> None:
    for needle in needles:
        if needle and needle in text:
            check.ok(label)
            return
    check.error(f"install smoke packet is missing {label}: {needles!r}")


def check_marketplace_json(check: PacketCheck, marketplace_path: Path) -> dict[str, Any]:
    if not marketplace_path.exists():
        check.error(
            "marketplace sandbox is missing; run "
            "tools/build_local_marketplace_candidate.py before this check"
        )
        return {}

    try:
        marketplace = load_json(marketplace_path)
    except Exception as exc:
        check.error(f"marketplace sandbox JSON is invalid: {exc}")
        return {}

    if marketplace.get("name") == MARKETPLACE_NAME:
        check.ok("marketplace name matches sandbox contract")
    else:
        check.error(f"marketplace name must be {MARKETPLACE_NAME!r}")

    interface = marketplace.get("interface")
    if isinstance(interface, dict) and interface.get("displayName"):
        check.ok("marketplace interface.displayName exists")
    else:
        check.error("marketplace interface.displayName is missing")

    plugins = marketplace.get("plugins")
    if not isinstance(plugins, list) or len(plugins) != 1:
        check.error("marketplace must contain exactly one plugin entry")
        return marketplace

    entry = plugins[0]
    if not isinstance(entry, dict):
        check.error("marketplace plugin entry must be an object")
        return marketplace

    source = entry.get("source")
    policy = entry.get("policy")
    expected_entry = {
        "name": PLUGIN_NAME,
        "source.source": "local",
        "source.path": f"./plugins/{PLUGIN_NAME}",
        "policy.installation": "AVAILABLE",
        "policy.authentication": "ON_INSTALL",
        "category": "Productivity",
    }
    actual_entry = {
        "name": entry.get("name"),
        "source.source": source.get("source") if isinstance(source, dict) else None,
        "source.path": source.get("path") if isinstance(source, dict) else None,
        "policy.installation": policy.get("installation") if isinstance(policy, dict) else None,
        "policy.authentication": policy.get("authentication") if isinstance(policy, dict) else None,
        "category": entry.get("category"),
    }
    for key, expected in expected_entry.items():
        if actual_entry.get(key) == expected:
            check.ok(f"marketplace {key} matches sandbox contract")
        else:
            check.error(
                f"marketplace {key} must be {expected!r}, got {actual_entry.get(key)!r}"
            )

    return marketplace


def check_packet_text(
    check: PacketCheck,
    root: Path,
    manifest: dict[str, Any],
    marketplace: dict[str, Any],
    text: str,
) -> None:
    marketplace_root = root / MARKETPLACE_ROOT
    marketplace_path = root / MARKETPLACE_FILE
    plugin_root = root / PLUGIN_ROOT
    skill_path = root / SKILL_PATH

    required = {
        "manifest last_updated": (
            f"Generated from package metadata last updated: {manifest.get('last_updated')}"
        ),
        "package name": f"- Package: `{manifest.get('package_name')}`",
        "package version": f"- Version: `{manifest.get('version')}`",
        "package state": f"- State: `{manifest.get('package_state')}`",
        "absolute marketplace root": f"- Marketplace sandbox: `{absolute(marketplace_root)}`",
        "absolute marketplace file": f"- Marketplace file: `{absolute(marketplace_path)}`",
        "absolute plugin root": f"- Plugin root: `{absolute(plugin_root)}`",
        "absolute skill path": f"- Skill path: `{absolute(skill_path)}`",
        "marketplace add command": (
            f"codex plugin marketplace add \"{absolute(marketplace_root)}\""
        ),
        "smoke prompt": SMOKE_PROMPT,
        "install-smoke record type": "--record-type install-smoke-test",
        "INSTALL-001 test id": "--test-id INSTALL-001",
        "install verification registered flag": "--install-registered-or-installed",
        "install verification fresh-context flag": "--install-fresh-context",
        "install verification skill-visible flag": "--install-skill-visible",
        "install verification expected-routing flag": "--install-expected-references-routed",
        "install verification runtime-boundary flag": "--install-runtime-boundary-preserved",
        "install verification boundary text": "install-smoke-test` pass records require `install_verification`",
        "install-smoke records checker": "check_install_smoke_records.py",
        "runtime boundary evidence": "No NWN module/runtime evidence; install smoke only.",
        "handoff-not-proof boundary": (
            "This packet is a handoff aid, not proof that the install has happened."
        ),
        "result decision table": "## Result Decision Table",
        "partial decision": "`partial`: install or registration partly worked",
        "fail decision": "`fail`: install or registration failed",
        "not-run decision": "`not-run`: the tester could not change Codex plugin configuration",
        "preparation commands are not pass evidence": (
            "Do not record `pass` from preparation commands alone."
        ),
        "improvement action requirement": "Record an improvement action.",
        "isolated install layout command": "check_isolated_install_layout.py",
        "isolated install layout path": ".codex-tmp/isolated-install-layout/INSTALL-001/",
        "isolated install layout summary": "ISOLATED-INSTALL-LAYOUT-SUMMARY.json",
        "isolated layout is not pass evidence": (
            "must not be recorded as an install-smoke-test pass"
        ),
        "feedback candidate command section": "## Feedback Candidate Command",
        "feedback candidate CLI": "nwn_skill_feedback.py new",
        "feedback candidate domain": "--domain deployment",
        "feedback candidate title": "INSTALL-001 install-smoke gap",
        "feedback candidate source type": "--source-type maintainer-review",
        "feedback candidate status": "--status unverified",
        "feedback candidate evidence": (
            "install-smoke record: docs\\nwn-skill-pack\\forward-tests\\records\\install-001-local-plugin-install-smoke.json"
        ),
        "feedback candidate proposed file": (
            '--proposed-file "draft-skills/nwn-server-gamedev/SKILL.md"'
        ),
        "feedback candidate validate command": "nwn_skill_feedback.py validate",
        "feedback candidate review command": "nwn_skill_feedback.py review",
        "feedback candidate conservative review": "needs-more-evidence",
        "feedback candidate no auto update": (
            "does not update installed skill/plugin until reviewed and promoted"
        ),
    }

    plugins = marketplace.get("plugins", [])
    entry = plugins[0] if isinstance(plugins, list) and plugins else {}
    source = entry.get("source", {}) if isinstance(entry, dict) else {}
    policy = entry.get("policy", {}) if isinstance(entry, dict) else {}
    required.update({
        "marketplace name": f"- Marketplace name: `{marketplace.get('name')}`",
        "plugin entry name": f"- Plugin name: `{entry.get('name') if isinstance(entry, dict) else ''}`",
        "source type": f"- Source type: `{source.get('source') if isinstance(source, dict) else ''}`",
        "source path": f"- Source path: `{source.get('path') if isinstance(source, dict) else ''}`",
        "installation policy": (
            f"- Installation policy: `{policy.get('installation') if isinstance(policy, dict) else ''}`"
        ),
        "authentication policy": (
            f"- Authentication policy: `{policy.get('authentication') if isinstance(policy, dict) else ''}`"
        ),
        "category": f"- Category: `{entry.get('category') if isinstance(entry, dict) else ''}`",
    })

    for label, needle in required.items():
        require_contains(check, text, needle, label)

    skill_path_needles = [
        f'--skill-path "{command(skill_path)}"',
        f'--skill-path "{absolute(skill_path)}"',
    ]
    rel_skill_path = cwd_relative(skill_path)
    if rel_skill_path:
        skill_path_needles.append(f'--skill-path "{rel_skill_path}"')
    require_any_contains(check, text, skill_path_needles, "record command skill path")

    for ref in EXPECTED_REFS:
        require_contains(check, text, ref, f"expected reference {ref}")


def run(root: Path) -> PacketCheck:
    check = PacketCheck()
    packet_path = root / PACKET_PATH
    manifest_path = root / "version-manifest.json"
    marketplace_path = root / MARKETPLACE_FILE

    if not packet_path.exists():
        check.error(f"install smoke packet is missing: {packet_path}")
        return check
    if not manifest_path.exists():
        check.error(f"version manifest is missing: {manifest_path}")
        return check

    try:
        manifest = load_json(manifest_path)
    except Exception as exc:
        check.error(f"version manifest is invalid: {exc}")
        return check

    try:
        text = packet_path.read_text(encoding="utf-8")
    except Exception as exc:
        check.error(f"install smoke packet cannot be read: {exc}")
        return check

    marketplace = check_marketplace_json(check, marketplace_path)
    if marketplace:
        check_packet_text(check, root, manifest, marketplace, text)

    if not check.errors:
        check.ok("install smoke packet matches manifest and marketplace sandbox")
    return check


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--json", action="store_true", help="Emit JSON report.")
    args = parser.parse_args()

    result = run(Path(args.root))
    if args.json:
        print(json.dumps({
            "checks": result.checks,
            "errors": result.errors,
        }, indent=2))
    else:
        for check in result.checks:
            print(f"OK: {check}")
        for error in result.errors:
            print(f"ERROR: {error}")
        if result.errors:
            print(f"Install smoke packet check failed: {len(result.errors)} error(s)")
        else:
            print("Install smoke packet check passed")

    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
