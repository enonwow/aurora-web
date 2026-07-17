#!/usr/bin/env python3
"""Build one-prompt-per-fresh-thread handoffs for forward tests."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_TEST_IDS = ["FT-002", "FT-003", "FT-008"]
DEFAULT_OUTPUT = Path(".codex-tmp/forward-test-clean-session-prompts/rc-minimum")
DEFAULT_PACK_ID = "RC-MINIMUM-CLEAN-SESSION-PROMPTS"
CUSTOM_PACK_ID = "CUSTOM-CLEAN-SESSION-PROMPTS"
MANIFEST = Path("CLEAN-SESSION-MANIFEST.json")
SHA256SUMS = Path("SHA256SUMS.txt")
README = Path("README.md")


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
        raise ValueError(f"{path} must contain a JSON object")
    return data


def in_tmp(root: Path, path: Path) -> bool:
    tmp_root = (root / ".codex-tmp").resolve()
    resolved = path.resolve()
    return resolved == tmp_root or tmp_root in resolved.parents


def safe_prepare_output(root: Path, output: Path, force: bool) -> None:
    if not in_tmp(root, output):
        raise ValueError("clean-session prompt output must be under root/.codex-tmp")
    if not force and output.exists() and any(output.iterdir()):
        raise FileExistsError(f"output already exists and is not empty: {output}")
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True, exist_ok=True)


def load_tests(root: Path) -> dict[str, dict[str, Any]]:
    matrix = load_json(root / "forward-tests" / "reviewer-matrix.json")
    tests = matrix.get("tests", [])
    if not isinstance(tests, list):
        raise ValueError("reviewer matrix tests must be a list")
    result: dict[str, dict[str, Any]] = {}
    for item in tests:
        if isinstance(item, dict) and isinstance(item.get("test_id"), str):
            result[item["test_id"]] = item
    return result


def skill_path(root: Path, manifest: dict[str, Any]) -> str:
    authoring_skill = str(manifest.get("authoring_skill", "")).strip()
    if not authoring_skill:
        raise ValueError("version manifest is missing authoring_skill")
    return f"{root.as_posix()}/{authoring_skill}"


def file_record(path: Path, output: Path) -> dict[str, Any]:
    return {
        "path": rel(path, output),
        "sha256": sha256(path),
        "size_bytes": path.stat().st_size,
    }


def write_readme(output: Path, manifest: dict[str, Any], tests: list[dict[str, Any]]) -> Path:
    lines = [
        "# Clean Session Prompt Pack",
        "",
        "Use this pack when each prompt must be run in a separate fresh Codex thread.",
        "It provides one file per fresh Codex thread; each file in `prompts/` is self-contained and should be pasted alone.",
        "",
        "## Skill Under Test",
        "",
        f"- Package: `{manifest.get('package_name')}` `{manifest.get('package_version')}`",
        f"- State: `{manifest.get('package_state')}`",
        f"- Skill path: `{manifest.get('skill_path')}`",
        "",
        "## Prompt Files",
        "",
    ]
    for test in tests:
        lines.extend([
            f"- `{test['test_id']}`: `{test['prompt_target']}`",
        ])
    lines.extend([
        "",
        "## Boundaries",
        "",
        "- No reference answer is included.",
        "- Do not open private maintainer materials before capturing the raw answer.",
        "- The pack does not prove answer quality, install behavior, tester independence, or NWN runtime behavior.",
        "",
    ])
    path = output / README
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def clean_session_prompt(
    root: Path,
    test_id: str,
    title: str,
    raw_prompt: str,
    package_manifest: dict[str, Any],
) -> str:
    lower = test_id.lower()
    capture_path = (
        "docs\\nwn-skill-pack\\.codex-tmp\\forward-test-return-captures\\"
        f"{lower}-capture.md"
    )
    skill = skill_path(root, package_manifest)
    return "\n".join([
        f"# {test_id} Clean Session Prompt",
        "",
        f"Test: {title}",
        "",
        "## Before You Start",
        "",
        "- Open a fresh Codex thread for this one test.",
        "- Use workspace `C:\\Projects\\aurora-web` when the tester can select a workspace.",
        "- Paste only the prompt block below as the user request.",
        "- Do not add hints, source notes, private maintainer materials, or expected answer fragments.",
        "- After the model responds, save the raw answer before opening any private maintainer materials.",
        "",
        "## Skill Under Test",
        "",
        f"- Skill path: `{skill}`",
        "",
        "## Prompt Block",
        "",
        "```text",
        raw_prompt.strip(),
        "```",
        "",
        "## Capture Immediately After Response",
        "",
        "Create or reuse the matching capture sheet, then paste the raw answer into its raw-answer section:",
        "",
        "```powershell",
        (
            "python docs\\nwn-skill-pack\\tools\\init_forward_test_capture.py "
            f"docs\\nwn-skill-pack --test-id {test_id} --out {capture_path}"
        ),
        "```",
        "",
        f"- Return capture file: `{capture_path}`",
        "- Keep the answer unedited except for removing private data that should never leave the tester machine.",
        "- Note any redaction clearly inside the capture sheet.",
        "",
        "## Not Proven By This Prompt File",
        "",
        "- No reference answer is included.",
        "- This file does not prove answer quality.",
        "- This file does not prove install behavior.",
        "- This file does not prove tester independence.",
        "- This file does not prove NWN runtime behavior.",
        "",
    ]) + "\n"


def build(root: Path, output: Path, test_ids: list[str], force: bool) -> dict[str, Any]:
    safe_prepare_output(root, output, force)
    package_manifest = load_json(root / "version-manifest.json")
    tests_by_id = load_tests(root)
    created_at = now_iso()

    prompt_dir = output / "prompts"
    prompt_dir.mkdir(parents=True, exist_ok=True)

    test_records: list[dict[str, Any]] = []
    created_files: list[Path] = []
    for test_id in test_ids:
        test = tests_by_id.get(test_id)
        if not test:
            raise ValueError(f"unknown forward-test id: {test_id}")
        prompt_file = str(test.get("prompt_file", "")).strip()
        title = str(test.get("title", "")).strip()
        if not prompt_file:
            raise ValueError(f"{test_id} has no prompt_file")
        prompt_source = root / prompt_file
        if not prompt_source.is_file():
            raise FileNotFoundError(f"prompt file is missing: {prompt_file}")

        prompt_text = prompt_source.read_text(encoding="utf-8")
        target = prompt_dir / f"{test_id.lower()}-clean-session.md"
        target.write_text(
            clean_session_prompt(root, test_id, title, prompt_text, package_manifest),
            encoding="utf-8",
        )
        created_files.append(target)
        test_records.append({
            "test_id": test_id,
            "title": title,
            "prompt_source": prompt_file,
            "prompt_target": rel(target, output),
            "return_capture_target": (
                "docs/nwn-skill-pack/.codex-tmp/forward-test-return-captures/"
                f"{test_id.lower()}-capture.md"
            ),
        })

    clean_manifest: dict[str, Any] = {
        "schema_version": "1",
        "created_at": created_at,
        "pack_id": DEFAULT_PACK_ID if test_ids == DEFAULT_TEST_IDS else CUSTOM_PACK_ID,
        "source_root": str(root),
        "output": rel(output, root),
        "package_name": package_manifest.get("package_name"),
        "package_version": package_manifest.get("version"),
        "package_state": package_manifest.get("package_state"),
        "skill_path": skill_path(root, package_manifest),
        "test_ids": test_ids,
        "tests": test_records,
        "verified_boundary": (
            "This pack contains self-contained fresh-thread prompt files and hashes only; "
            "it is not returned-answer evidence or release-candidate proof."
        ),
        "not_proven": [
            "answer quality",
            "install behavior",
            "tester independence",
            "NWN runtime behavior",
            "release-candidate readiness",
        ],
    }

    readme_path = write_readme(output, clean_manifest, test_records)
    created_files.append(readme_path)

    sums = "\n".join(
        f"{sha256(path)}  {rel(path, output)}"
        for path in sorted(created_files, key=lambda item: rel(item, output))
    ) + "\n"
    (output / SHA256SUMS).write_text(sums, encoding="utf-8")
    clean_manifest["files"] = [
        file_record(path, output)
        for path in sorted(created_files, key=lambda item: rel(item, output))
    ] + [file_record(output / SHA256SUMS, output)]
    (output / MANIFEST).write_text(json.dumps(clean_manifest, indent=2) + "\n", encoding="utf-8")
    return clean_manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--out", default="")
    parser.add_argument("--test-id", action="append", dest="test_ids")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    root = Path(args.root)
    output = Path(args.out) if args.out else root / DEFAULT_OUTPUT
    test_ids = args.test_ids or DEFAULT_TEST_IDS
    try:
        manifest = build(root, output, test_ids, args.force)
    except Exception as exc:
        if args.json:
            print(json.dumps({"error": str(exc)}, indent=2))
        else:
            print(f"ERROR: {exc}")
        return 1

    if args.json:
        print(json.dumps(manifest, indent=2))
    else:
        print(f"OK: built clean-session prompt pack: {output}")
        for test in manifest["tests"]:
            print(f"OK: {test['test_id']} prompt: {test['prompt_target']}")
        print(f"OK: wrote SHA256SUMS: {output / SHA256SUMS}")
        print(f"OK: wrote manifest: {output / MANIFEST}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
