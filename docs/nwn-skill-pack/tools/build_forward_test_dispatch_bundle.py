#!/usr/bin/env python3
"""Build a no-leak dispatch bundle for prompt forward tests."""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from types import ModuleType
from typing import Any


DEFAULT_TEST_IDS = ["FT-002", "FT-003", "FT-008"]
DEFAULT_OUTPUT = Path(".codex-tmp/forward-test-dispatch/rc-minimum")
MANIFEST = Path("DISPATCH-MANIFEST.json")
SHA256SUMS = Path("SHA256SUMS.txt")
INSTRUCTIONS = Path("TESTER-INSTRUCTIONS.md")


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
        raise ValueError("forward-test dispatch output must be under root/.codex-tmp")
    if not force and output.exists() and any(output.iterdir()):
        raise FileExistsError(f"output already exists and is not empty: {output}")
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True, exist_ok=True)


def load_capture_initializer(root: Path) -> ModuleType:
    path = root / "tools" / "init_forward_test_capture.py"
    spec = importlib.util.spec_from_file_location("init_forward_test_capture_dispatch", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules["init_forward_test_capture_dispatch"] = module
    spec.loader.exec_module(module)
    return module


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


def file_record(path: Path, output: Path) -> dict[str, Any]:
    return {
        "path": rel(path, output),
        "sha256": sha256(path),
        "size_bytes": path.stat().st_size,
    }


def write_instructions(
    output: Path,
    manifest: dict[str, Any],
    tests: list[dict[str, Any]],
) -> Path:
    lines = [
        "# Forward-Test Dispatch Bundle",
        "",
        "Use this bundle in a clean context before opening any reviewer-only materials.",
        "",
        "## Rules",
        "",
        "- Use the skill path named below and the prompt files in `prompts/`.",
        "- Paste the raw answer into the matching file in `captures/` immediately after the model responds.",
        "- Do not open reviewer-only scoring materials until every raw answer is captured.",
        "- Return the filled `captures/` files to the maintainer for scoring.",
        "",
        "## Skill Under Test",
        "",
        f"- Package: `{manifest.get('package_name')}` `{manifest.get('package_version')}`",
        f"- State: `{manifest.get('package_state')}`",
        f"- Skill path: `{manifest.get('skill_path')}`",
        "",
        "## Tests",
        "",
    ]
    for test in tests:
        lines.extend([
            f"### {test['test_id']}: {test['title']}",
            "",
            f"- Prompt: `{test['prompt_target']}`",
            f"- Capture sheet: `{test['capture_target']}`",
            "",
        ])
    lines.extend([
        "## Not Proven By This Bundle",
        "",
        "- Model answer quality",
        "- Human scoring correctness",
        "- NWN runtime behavior",
        "- Release-candidate readiness",
        "- Automatic skill improvement",
        "",
    ])
    path = output / INSTRUCTIONS
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def build(root: Path, output: Path, test_ids: list[str], force: bool) -> dict[str, Any]:
    safe_prepare_output(root, output, force)
    manifest = load_json(root / "version-manifest.json")
    capture = load_capture_initializer(root)
    tests_by_id = load_tests(root)
    created_at = now_iso()

    prompt_dir = output / "prompts"
    capture_dir = output / "captures"
    prompt_dir.mkdir(parents=True, exist_ok=True)
    capture_dir.mkdir(parents=True, exist_ok=True)

    test_records: list[dict[str, Any]] = []
    copied_files: list[Path] = []
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

        prompt_target = prompt_dir / prompt_source.name
        shutil.copy2(prompt_source, prompt_target)

        capture_target = capture_dir / f"{test_id.lower()}-capture.md"
        capture_text = capture.generate(root, test_id, created_at)
        capture_target.write_text(capture_text, encoding="utf-8")

        copied_files.extend([prompt_target, capture_target])
        test_records.append({
            "test_id": test_id,
            "title": title,
            "prompt_source": prompt_file,
            "prompt_target": rel(prompt_target, output),
            "capture_target": rel(capture_target, output),
        })

    dispatch_manifest: dict[str, Any] = {
        "schema_version": "1",
        "created_at": created_at,
        "bundle_id": "RC-MINIMUM-PROMPT-FORWARD",
        "source_root": str(root),
        "output": rel(output, root),
        "package_name": manifest.get("package_name"),
        "package_version": manifest.get("version"),
        "package_state": manifest.get("package_state"),
        "skill_path": f"{root.as_posix()}/{manifest.get('authoring_skill')}",
        "test_ids": test_ids,
        "tests": test_records,
        "verified_boundary": (
            "This dispatch bundle contains only prompts, blank capture sheets, hashes, "
            "and tester instructions; it is not reviewer scoring evidence."
        ),
        "not_proven": [
            "model answer quality",
            "human scoring correctness",
            "NWN runtime behavior",
            "release-candidate readiness",
            "automatic skill improvement",
        ],
    }

    instructions_path = write_instructions(output, dispatch_manifest, test_records)
    copied_files.append(instructions_path)

    sums = "\n".join(
        f"{sha256(path)}  {rel(path, output)}"
        for path in sorted(copied_files, key=lambda item: rel(item, output))
    ) + "\n"
    (output / SHA256SUMS).write_text(sums, encoding="utf-8")
    dispatch_manifest["files"] = [
        file_record(path, output)
        for path in sorted(copied_files, key=lambda item: rel(item, output))
    ] + [file_record(output / SHA256SUMS, output)]
    (output / MANIFEST).write_text(json.dumps(dispatch_manifest, indent=2) + "\n", encoding="utf-8")
    return dispatch_manifest


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
            print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps(manifest, indent=2))
    else:
        print(f"OK: built forward-test dispatch bundle: {output}")
        for test in manifest["tests"]:
            print(f"OK: {test['test_id']} prompt: {test['prompt_target']}")
            print(f"OK: {test['test_id']} capture: {test['capture_target']}")
        print(f"OK: wrote SHA256SUMS: {output / SHA256SUMS}")
        print(f"OK: wrote manifest: {output / MANIFEST}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
