#!/usr/bin/env python3
"""Generate the public tester message for EXT-001."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any


DEFAULT_OUT = Path("knowledge-inbox/external-trials/ext-001-tester-message.md")
DEFAULT_PACKET = Path(".codex-tmp/external-trial-public-packet/ext-001")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain an object")
    return data


def rel(path: Path, root: Path) -> str:
    return str(path.relative_to(root)).replace("\\", "/")


def render(root: Path, trial_id: str = "EXT-001", packet_relative: Path = DEFAULT_PACKET) -> str:
    manifest = load_json(root / "version-manifest.json")
    packet_manifest = load_json(root / packet_relative / "PUBLIC-PACKET-MANIFEST.json")
    archive_value = packet_manifest.get("archive")
    if not isinstance(archive_value, str) or not archive_value:
        raise ValueError("public packet manifest archive path is missing")
    archive = Path(archive_value)
    if not archive.is_absolute():
        archive = root / archive
    if not archive.exists():
        raise FileNotFoundError(f"public packet archive is missing: {archive}")

    archive_name = archive.name
    archive_rel = rel(archive, root)
    archive_hash = sha256(archive)

    return "\n".join([
        f"# External Contributor Trial Tester Message {trial_id}",
        "",
        "## Copy This Message",
        "",
        "Hi,",
        "",
        f"I am sending `{archive_name}` for a no-coaching usability trial of the NWN server gamedev skill-pack feedback intake.",
        "",
        "Please use only the files inside the ZIP. Start with `START-HERE.md`, then follow `knowledge-inbox/external-contributor-trial-packet.md`.",
        "",
        "Package details:",
        "",
        f"- package: `{manifest.get('package_name')}`",
        f"- version: `{manifest.get('version')}`",
        f"- package state: `{manifest.get('package_state')}`",
        f"- trial id: `{trial_id}`",
        f"- ZIP file: `{archive_name}`",
        f"- SHA-256: `{archive_hash}`",
        "",
        "Please do this without maintainer coaching:",
        "",
        "1. Extract the ZIP.",
        "2. Use one real or synthetic NWN server lesson from areas, items, creatures, 2DA/HAK/TLK, NWScript, NUI, quests, economy, persistence, deployment, testing, or ops.",
        "3. Try the command path first: `new`, `validate`, `bundle`, then `verify-bundle`.",
        "4. If commands cannot run, use the form path in `knowledge-inbox/templates/user-feedback-form.md`.",
        "5. Return the created bundle or completed form, command transcript, friction list, and private-data confirmation.",
        "",
        "Please do not include credentials, tokens, IP addresses, account names, private player data, private module files, or private server logs unless they are explicitly approved and redacted.",
        "",
        "Reply with:",
        "",
        "- result: `pass`, `partial`, or `fail`",
        "- path used: command, form, or mixed",
        "- returned artifact path or archive name",
        "- command transcript or command failure notes",
        "- friction list",
        "- private-data confirmation",
        "- whether any instruction made you think the official skill updates itself automatically",
        "",
        "Boundary:",
        "",
        "- this trial does not self-update an installed skill,",
        "- this trial is not NWN runtime proof,",
        "- this trial is not release-candidate evidence by itself,",
        "- returned feedback remains untrusted until maintainer review.",
        "",
        "## Maintainer Notes",
        "",
        f"- Source ZIP: `{archive_rel}`",
        "- Attach or send the ZIP and this message from `.codex-tmp/external-trial-dispatch/ext-001/` after running `tools/build_external_trial_dispatch_bundle.py`.",
        "- Run `tools/check_external_trial_cleanroom.py`, `tools/check_external_trial_dispatch_bundle.py`, and `tools/check_external_trial_received_dispatch.py` before sending, then record `--cleanroom-check` when creating the trial record.",
        "- Add `--independent-tester` only for a real outside tester or accepted clean-clone run; never for local smoke alone.",
        "- Do not send reviewer-only scoring notes, expected references, release blockers, or prior trial records.",
        "",
    ]) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--trial-id", default="EXT-001")
    parser.add_argument("--packet", default=str(DEFAULT_PACKET))
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    args = parser.parse_args()

    root = Path(args.root)
    out = root / args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(render(root, args.trial_id, Path(args.packet)), encoding="utf-8")
    print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
