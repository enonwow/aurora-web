#!/usr/bin/env python3
"""Generate a human-facing release-notes draft for the NWN skill pack."""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


VERSION_VALUE_RE = re.compile(r"^- (?P<label>[^:]+): `?(?P<value>[^`\n]+)`?$", re.MULTILINE)


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.exists() else ""


def version_plan_values(text: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for match in VERSION_VALUE_RE.finditer(text):
        values[match.group("label").strip()] = match.group("value").strip()
    return values


def role_counts(inventory: dict[str, Any]) -> Counter[str]:
    entries = inventory.get("entries")
    counter: Counter[str] = Counter()
    if not isinstance(entries, list):
        return counter
    for entry in entries:
        if isinstance(entry, dict):
            counter[str(entry.get("role", "unknown"))] += 1
    return counter


def first_number(pattern: str, text: str, default: str = "0") -> str:
    match = re.search(pattern, text)
    return match.group(1) if match else default


def generate(root: Path) -> str:
    manifest = load_json(root / "version-manifest.json")
    version_plan = version_plan_values(read_text(root / "version-bump-plan.md"))
    readiness = read_text(root / "release-readiness.md")
    inventory_path = root / "package-inventory.json"
    inventory = load_json(inventory_path) if inventory_path.exists() else {}
    counts = role_counts(inventory)

    package = str(manifest.get("package_name", "nwn-server-gamedev-pack"))
    version = str(manifest.get("version", "0.0.0"))
    state = str(manifest.get("package_state", "unknown"))
    skill = str(manifest.get("skill_name", "nwn-server-gamedev"))
    proposed_class = version_plan.get("Proposed SemVer class", "UNKNOWN")
    proposed_next = version_plan.get("Proposed next version", version)
    accepted_promotions = version_plan.get("Accepted promotion records counted", "0")
    prompt_tests = first_number(r"- Prompt forward tests: (\d+)", readiness)
    install_smoke_tests = first_number(r"- Install smoke tests: (\d+)", readiness)
    accepted_install_smoke_tests = first_number(
        r"- Accepted passed install smoke tests: (\d+)", readiness
    )

    blockers = []
    gate = manifest.get("release_gate")
    if isinstance(gate, dict):
        raw_blockers = gate.get("blockers", [])
        if isinstance(raw_blockers, list):
            blockers = [str(blocker) for blocker in raw_blockers]

    role_summary = ", ".join(
        f"{role}={counts[role]}" for role in sorted(counts)
    ) or "none"

    lines = [
        f"# {package} {version} Release Notes Draft",
        "",
        f"Generated: {now_iso()}",
        "",
        "## Release State",
        "",
        f"- Package: {package}",
        f"- Version: {version}",
        f"- State: {state}",
        f"- Skill: {skill}",
        f"- Current version: {version_plan.get('Current version', version)}",
        f"- Proposed SemVer class: {proposed_class}",
        f"- Proposed next version: {proposed_next}",
        f"- Accepted promotion records counted: {accepted_promotions}",
        "- Release candidate: not a release candidate",
        "- Install candidate: not an install candidate",
        "",
        "## What This Helps With",
        "",
        "- Locations, areas, tilesets, and encounter-space planning.",
        "- Items, equipment, loot tables, merchants, and reward loops.",
        "- Creatures, encounters, AI, faction behavior, and balance notes.",
        "- 2DA, HAK, TLK, custom content packaging, and compatibility review.",
        "- NWScript events, server systems, quests, dialogue, and journal logic.",
        "- NUI player interfaces, server/client UI state, and interaction flows.",
        "- Economy, crafting, progression, persistence, database, and NWNX design.",
        "- Deployment, NWSync, operational checks, and runtime QA planning.",
        "",
        "## Verified Locally",
        "",
        "- Repo artifact preflight is the canonical local verification route.",
        "- Version manifest, version bump plan, release readiness, release evidence index, package inventory, package boundaries, and plugin package audit are checked by tooling.",
        f"- Package inventory roles: {role_summary}.",
        f"- Prompt forward tests recorded: {prompt_tests}.",
        f"- Install smoke tests recorded: {install_smoke_tests}.",
        f"- Accepted install smoke tests recorded: {accepted_install_smoke_tests}.",
        "",
        "## Known Gaps",
        "",
        "- This is not a release candidate.",
        "- There are zero prompt forward tests accepted for release-candidate proof.",
        "- There are zero install smoke tests accepted for install-candidate proof.",
        "- There are no accepted reference promotion records, so the version bump plan stays at NONE.",
        "- Local Aurora reverse/thread leads are release-routing material only; they are not a release-note claim of strengthened skill behavior.",
        "- Public marketplace behavior has not been proven.",
        "- NWN Toolset, dedicated server, client, module, log, or runtime behavior has not been proven.",
        "- Model answer quality on fresh external tasks remains unproven until forward-test records exist.",
    ]

    if blockers:
        lines.extend(["", "Active manifest blockers:"])
        lines.extend(f"- {blocker}" for blocker in blockers)

    lines.extend([
        "",
        "## Feedback Path",
        "",
        "- Use the contributor intake quickstart to collect structured human feedback.",
        "- Use the feedback CLI and contribution bundle format to keep incoming reports reviewable.",
        "- Convert accepted human knowledge into a reference promotion proposal.",
        "- Promote only reviewed claims through a reference promotion record.",
        "- Regenerate the reference promotion aggregate and version bump plan before changing package version.",
        "",
        "## Maintainer Commands",
        "",
        "```powershell",
        "python docs\\nwn-skill-pack\\tools\\run_repo_artifact_preflight.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_plugin_package.py docs\\nwn-skill-pack",
        "python docs\\nwn-skill-pack\\tools\\check_release_gate.py docs\\nwn-skill-pack --target release-candidate",
        "python docs\\nwn-skill-pack\\tools\\check_release_gate.py docs\\nwn-skill-pack --target install-candidate",
        "```",
        "",
        "## Does Not Prove",
        "",
        "This draft does not update the plugin, does not install the plugin, does not prove Codex UI discovery, does not prove public marketplace availability, does not prove fresh-thread answer quality, does not promote local Aurora reverse/thread leads into installed skill guidance, and does not prove NWN runtime behavior.",
    ])

    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--out", default="docs/nwn-skill-pack/release-notes-draft.md")
    args = parser.parse_args()

    output = generate(Path(args.root))
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(output, encoding="utf-8")
    print(out_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
