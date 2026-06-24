#!/usr/bin/env python3
"""Check repo-local install and marketplace candidates against current inventory."""

from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable


PLUGIN_PREFIX = "draft-plugins/nwn-server-gamedev-pack/"
PLUGIN_NAME = "nwn-server-gamedev-pack"
MARKETPLACE_NAME = "nwn-server-gamedev-local"
INSTALL_CANDIDATE_ROOT = Path(".codex-tmp/install-candidate/nwn-server-gamedev-pack")
INSTALL_BUILD_MANIFEST = Path(".codex-tmp/install-candidate/build-manifest.json")
MARKETPLACE_ROOT = Path(".codex-tmp/marketplace-candidate")
MARKETPLACE_FILE = MARKETPLACE_ROOT / "marketplace.json"
MARKETPLACE_PLUGIN_ROOT = MARKETPLACE_ROOT / "plugins" / PLUGIN_NAME
MARKETPLACE_BUILD_MANIFEST = MARKETPLACE_ROOT / "build-manifest.json"
MARKETPLACE_PLUGIN_BUILD_MANIFEST = (
    MARKETPLACE_ROOT / "plugins" / f"{PLUGIN_NAME}.build-manifest.json"
)

IGNORED_DIRS = {"__pycache__", ".git"}
IGNORED_SUFFIXES = {".pyc", ".pyo"}


@dataclass
class InstallCandidateCheck:
    checks: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


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
        rel_parts = path.relative_to(root).parts
        if any(part in IGNORED_DIRS for part in rel_parts):
            continue
        if path.suffix in IGNORED_SUFFIXES:
            continue
        yield path


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def selected_entries(inventory: dict[str, Any]) -> dict[str, dict[str, Any]]:
    entries = inventory.get("entries")
    if not isinstance(entries, list):
        raise ValueError("package-inventory.json entries must be a list")

    selected: dict[str, dict[str, Any]] = {}
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError("package-inventory.json entries must be objects")
        if not entry.get("plugin_install_include"):
            continue
        source = entry.get("path")
        if not isinstance(source, str) or not source.startswith(PLUGIN_PREFIX):
            raise ValueError(f"plugin_install_include path outside plugin boundary: {source!r}")
        target = source.removeprefix(PLUGIN_PREFIX)
        selected[target] = entry
    if not selected:
        raise ValueError("no plugin_install_include entries found in package-inventory.json")
    return selected


def candidate_file_map(root: Path) -> dict[str, str]:
    return {
        str(path.relative_to(root)).replace("\\", "/"): sha256(path)
        for path in iter_files(root)
    }


def check_build_manifest(
    result: InstallCandidateCheck,
    root: Path,
    relative: Path,
    inventory_generated_at: str | None,
    expected_file_count: int,
    label: str,
) -> None:
    path = root / relative
    if not path.exists():
        result.error(f"{label} build manifest is missing: {relative}")
        return
    try:
        manifest = load_json(path)
    except Exception as exc:
        result.error(f"{label} build manifest is invalid: {exc}")
        return

    result.ok(f"{label} build manifest exists: {relative}")
    if manifest.get("source_inventory_generated_at") == inventory_generated_at:
        result.ok(f"{label} build manifest inventory timestamp matches")
    else:
        result.error(
            f"{label} build manifest inventory timestamp is stale: "
            f"{manifest.get('source_inventory_generated_at')!r}"
        )
    if manifest.get("file_count") == expected_file_count:
        result.ok(f"{label} build manifest file_count matches: {expected_file_count}")
    else:
        result.error(
            f"{label} build manifest file_count must be {expected_file_count}, "
            f"got {manifest.get('file_count')!r}"
        )


def check_candidate_root(
    result: InstallCandidateCheck,
    root: Path,
    relative_root: Path,
    expected_entries: dict[str, dict[str, Any]],
    label: str,
) -> None:
    candidate_root = root / relative_root
    if not candidate_root.is_dir():
        result.error(f"{label} root is missing: {relative_root}")
        return
    result.ok(f"{label} root exists: {relative_root}")

    actual = candidate_file_map(candidate_root)
    expected_hashes = {
        target: str(entry.get("sha256", ""))
        for target, entry in expected_entries.items()
    }

    missing = sorted(set(expected_hashes) - set(actual))
    extra = sorted(set(actual) - set(expected_hashes))
    changed = sorted(
        target for target in set(expected_hashes) & set(actual)
        if actual[target] != expected_hashes[target]
    )

    for target in missing:
        result.error(f"{label} missing plugin file: {target}")
    for target in extra:
        result.error(f"{label} has unexpected plugin file: {target}")
    for target in changed:
        result.error(f"{label} plugin file hash differs from inventory: {target}")

    if not missing and not extra and not changed:
        result.ok(f"{label} plugin files match current inventory")


def check_marketplace_json(result: InstallCandidateCheck, root: Path) -> None:
    path = root / MARKETPLACE_FILE
    if not path.exists():
        result.error(f"marketplace candidate file is missing: {MARKETPLACE_FILE}")
        return
    try:
        marketplace = load_json(path)
    except Exception as exc:
        result.error(f"marketplace candidate JSON is invalid: {exc}")
        return

    result.ok(f"marketplace candidate file exists: {MARKETPLACE_FILE}")
    if marketplace.get("name") == MARKETPLACE_NAME:
        result.ok("marketplace candidate name matches")
    else:
        result.error(f"marketplace candidate name must be {MARKETPLACE_NAME!r}")

    plugins = marketplace.get("plugins")
    if not isinstance(plugins, list) or len(plugins) != 1:
        result.error("marketplace candidate must contain exactly one plugin entry")
        return

    entry = plugins[0]
    if not isinstance(entry, dict):
        result.error("marketplace candidate plugin entry must be an object")
        return

    source = entry.get("source")
    policy = entry.get("policy")
    expected = {
        "name": PLUGIN_NAME,
        "source.source": "local",
        "source.path": f"./plugins/{PLUGIN_NAME}",
        "policy.installation": "AVAILABLE",
        "policy.authentication": "ON_INSTALL",
    }
    actual = {
        "name": entry.get("name"),
        "source.source": source.get("source") if isinstance(source, dict) else None,
        "source.path": source.get("path") if isinstance(source, dict) else None,
        "policy.installation": policy.get("installation") if isinstance(policy, dict) else None,
        "policy.authentication": policy.get("authentication") if isinstance(policy, dict) else None,
    }
    for key, expected_value in expected.items():
        if actual.get(key) == expected_value:
            result.ok(f"marketplace candidate {key} matches")
        else:
            result.error(
                f"marketplace candidate {key} must be {expected_value!r}, "
                f"got {actual.get(key)!r}"
            )


def run(root: Path) -> InstallCandidateCheck:
    result = InstallCandidateCheck()
    inventory_path = root / "package-inventory.json"
    if not inventory_path.exists():
        result.error("package-inventory.json is missing")
        return result

    try:
        inventory = load_json(inventory_path)
        expected_entries = selected_entries(inventory)
    except Exception as exc:
        result.error(f"package inventory cannot be used: {exc}")
        return result

    inventory_generated_at = inventory.get("generated_at")
    if not isinstance(inventory_generated_at, str):
        result.error("package-inventory.json generated_at is missing")
        inventory_generated_at = None
    else:
        result.ok("package inventory generated_at exists")

    expected_file_count = len(expected_entries)
    check_build_manifest(
        result,
        root,
        INSTALL_BUILD_MANIFEST,
        inventory_generated_at,
        expected_file_count,
        "install candidate",
    )
    check_candidate_root(
        result,
        root,
        INSTALL_CANDIDATE_ROOT,
        expected_entries,
        "install candidate",
    )

    if (root / MARKETPLACE_BUILD_MANIFEST).exists():
        result.ok(f"marketplace build manifest exists: {MARKETPLACE_BUILD_MANIFEST}")
    else:
        result.error(f"marketplace build manifest is missing: {MARKETPLACE_BUILD_MANIFEST}")
    check_build_manifest(
        result,
        root,
        MARKETPLACE_PLUGIN_BUILD_MANIFEST,
        inventory_generated_at,
        expected_file_count,
        "marketplace plugin",
    )
    check_marketplace_json(result, root)
    check_candidate_root(
        result,
        root,
        MARKETPLACE_PLUGIN_ROOT,
        expected_entries,
        "marketplace plugin",
    )

    result.warn(
        "install candidate check is static; it does not register a marketplace, install a plugin, or prove Codex trigger behavior"
    )
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--json", action="store_true", help="Emit JSON report.")
    args = parser.parse_args()

    result = run(Path(args.root))
    if args.json:
        print(json.dumps({
            "checks": result.checks,
            "warnings": result.warnings,
            "errors": result.errors,
        }, indent=2))
    else:
        for check in result.checks:
            print(f"OK: {check}")
        for warning in result.warnings:
            print(f"WARN: {warning}")
        for error in result.errors:
            print(f"ERROR: {error}")
        if result.errors:
            print(f"Install candidate check failed: {len(result.errors)} error(s)")
        else:
            suffix = f", {len(result.warnings)} warning(s)" if result.warnings else ""
            print(f"Install candidate check passed{suffix}")

    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
