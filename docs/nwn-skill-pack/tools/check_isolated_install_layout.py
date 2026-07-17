#!/usr/bin/env python3
"""Check the plugin candidate inside an isolated fake CODEX_HOME layout."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


PLUGIN_NAME = "nwn-server-gamedev-pack"
SKILL_NAME = "nwn-server-gamedev"
MARKETPLACE_NAME = "nwn-server-gamedev-local"
INSTALL_CANDIDATE_ROOT = Path(".codex-tmp/install-candidate") / PLUGIN_NAME
MARKETPLACE_ROOT = Path(".codex-tmp/marketplace-candidate")
ISOLATED_ROOT = Path(".codex-tmp/isolated-install-layout/INSTALL-001")
SUMMARY_NAME = "ISOLATED-INSTALL-LAYOUT-SUMMARY.json"

IGNORED_DIRS = {"__pycache__", ".git"}
IGNORED_SUFFIXES = {".pyc", ".pyo"}

REQUIRED_REFERENCES = [
    "nui-player-ui.md",
    "nwscript-events-systems.md",
    "testing-runtime-qa.md",
    "feature-design-output-template.md",
]
ROUTING_TOKENS = [
    "references/nui-player-ui.md",
    "references/nwscript-events-systems.md",
    "references/testing-runtime-qa.md",
    "references/feature-design-output-template.md",
    "scripts/nwn_skill_feedback.py",
]
ALLOWED_SKILL_TOP_LEVEL = {
    "SKILL.md",
    "agents",
    "references",
    "scripts",
    "assets",
}
NOT_PROVEN = [
    "Codex marketplace registration",
    "fresh Codex thread visibility",
    "skill trigger behavior",
    "NWN runtime behavior",
    "install-smoke-test record",
    "release-candidate readiness",
]


@dataclass
class LayoutCheck:
    checks: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    summary_path: str = ""

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


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


def file_map(root: Path) -> dict[str, str]:
    return {
        str(path.relative_to(root)).replace("\\", "/"): sha256(path)
        for path in iter_files(root)
    }


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def parse_frontmatter(path: Path) -> dict[str, str]:
    lines = path.read_text(encoding="utf-8").splitlines()
    if not lines or lines[0].strip() != "---":
        return {}

    values: dict[str, str] = {}
    for line in lines[1:]:
        if line.strip() == "---":
            return values
        if ":" not in line:
            values[f"invalid:{len(values)}"] = line
            continue
        key, value = line.split(":", 1)
        values[key.strip()] = value.strip()
    return {}


def prepare_isolated_root(root: Path) -> Path:
    scratch = root / ISOLATED_ROOT
    scratch_resolved = scratch.resolve()
    tmp_resolved = (root / ".codex-tmp").resolve()
    if scratch_resolved == root.resolve():
        raise ValueError("isolated root must not be the package root")
    if not (scratch_resolved == tmp_resolved or tmp_resolved in scratch_resolved.parents):
        raise ValueError("isolated root must stay under root/.codex-tmp")
    if scratch.exists():
        shutil.rmtree(scratch)
    scratch.mkdir(parents=True, exist_ok=True)
    return scratch


def copy_layout(root: Path, result: LayoutCheck) -> tuple[Path, Path, Path]:
    install_candidate = root / INSTALL_CANDIDATE_ROOT
    marketplace_root = root / MARKETPLACE_ROOT
    if not install_candidate.is_dir():
        result.error(
            f"install candidate is missing: {INSTALL_CANDIDATE_ROOT}; "
            "run build_plugin_install_candidate.py first"
        )
        raise FileNotFoundError(install_candidate)
    if not marketplace_root.is_dir():
        result.error(
            f"marketplace candidate is missing: {MARKETPLACE_ROOT}; "
            "run build_local_marketplace_candidate.py first"
        )
        raise FileNotFoundError(marketplace_root)

    isolated = prepare_isolated_root(root)
    codex_home = isolated / "CODEX_HOME"
    plugin_copy = codex_home / "plugins" / PLUGIN_NAME
    marketplace_copy = codex_home / "marketplaces" / MARKETPLACE_NAME
    plugin_copy.parent.mkdir(parents=True, exist_ok=True)
    marketplace_copy.parent.mkdir(parents=True, exist_ok=True)

    shutil.copytree(install_candidate, plugin_copy)
    shutil.copytree(marketplace_root, marketplace_copy)
    result.ok(f"isolated CODEX_HOME layout created: {ISOLATED_ROOT}")
    return isolated, plugin_copy, marketplace_copy


def compare_file_sets(
    result: LayoutCheck,
    expected_root: Path,
    actual_root: Path,
    label: str,
) -> None:
    expected = file_map(expected_root)
    actual = file_map(actual_root)
    missing = sorted(set(expected) - set(actual))
    extra = sorted(set(actual) - set(expected))
    changed = sorted(
        rel for rel in set(expected) & set(actual)
        if expected[rel] != actual[rel]
    )

    for rel in missing:
        result.error(f"{label} missing copied file: {rel}")
    for rel in extra:
        result.error(f"{label} has unexpected copied file: {rel}")
    for rel in changed:
        result.error(f"{label} copied file hash differs: {rel}")

    if not missing and not extra and not changed:
        result.ok(f"{label} file set matches source candidate")


def check_plugin_manifest(result: LayoutCheck, root: Path, plugin_copy: Path) -> None:
    version_manifest = root / "version-manifest.json"
    manifest_path = plugin_copy / ".codex-plugin" / "plugin.json"
    if not manifest_path.exists():
        result.error("isolated plugin manifest is missing")
        return

    try:
        plugin = load_json(manifest_path)
        package = load_json(version_manifest)
    except Exception as exc:
        result.error(f"isolated plugin manifest cannot be checked: {exc}")
        return

    expected = {
        "name": PLUGIN_NAME,
        "version": package.get("version"),
        "skills": "./skills/",
    }
    for key, expected_value in expected.items():
        if plugin.get(key) == expected_value:
            result.ok(f"isolated plugin manifest {key} matches")
        else:
            result.error(
                f"isolated plugin manifest {key} must be {expected_value!r}, "
                f"got {plugin.get(key)!r}"
            )


def check_skill_layout(result: LayoutCheck, plugin_copy: Path) -> None:
    skill_root = plugin_copy / "skills" / SKILL_NAME
    if not skill_root.is_dir():
        result.error(f"isolated skill folder is missing: skills/{SKILL_NAME}")
        return

    top_level = {path.name for path in skill_root.iterdir()}
    unexpected = sorted(top_level - ALLOWED_SKILL_TOP_LEVEL)
    if unexpected:
        for name in unexpected:
            result.error(f"isolated skill has unexpected top-level entry: {name}")
    else:
        result.ok("isolated skill top-level entries are allowed")

    skill_md = skill_root / "SKILL.md"
    if not skill_md.exists():
        result.error("isolated skill SKILL.md is missing")
        return

    frontmatter = parse_frontmatter(skill_md)
    allowed = {"name", "description"}
    extra_keys = sorted(set(frontmatter) - allowed)
    missing_keys = sorted(allowed - set(frontmatter))
    for key in extra_keys:
        result.error(f"isolated skill frontmatter has unsupported key: {key}")
    for key in missing_keys:
        result.error(f"isolated skill frontmatter is missing key: {key}")
    if not extra_keys and not missing_keys:
        result.ok("isolated skill frontmatter uses only name and description")

    if frontmatter.get("name") == SKILL_NAME:
        result.ok("isolated skill frontmatter name matches")
    else:
        result.error(
            f"isolated skill frontmatter name must be {SKILL_NAME!r}, "
            f"got {frontmatter.get('name')!r}"
        )

    text = skill_md.read_text(encoding="utf-8")
    for token in ROUTING_TOKENS:
        if token in text:
            result.ok(f"isolated skill routes {token}")
        else:
            result.error(f"isolated skill is missing route token: {token}")

    for reference in REQUIRED_REFERENCES:
        path = skill_root / "references" / reference
        if path.exists():
            result.ok(f"isolated skill reference exists: {reference}")
        else:
            result.error(f"isolated skill reference is missing: {reference}")

    script = skill_root / "scripts" / "nwn_skill_feedback.py"
    if script.exists():
        result.ok("isolated feedback script exists")
    else:
        result.error("isolated feedback script is missing")


def check_marketplace(result: LayoutCheck, marketplace_copy: Path) -> None:
    marketplace_path = marketplace_copy / "marketplace.json"
    if not marketplace_path.exists():
        result.error("isolated marketplace.json is missing")
        return

    try:
        marketplace = load_json(marketplace_path)
    except Exception as exc:
        result.error(f"isolated marketplace.json is invalid: {exc}")
        return

    if marketplace.get("name") == MARKETPLACE_NAME:
        result.ok("isolated marketplace name matches")
    else:
        result.error(f"isolated marketplace name must be {MARKETPLACE_NAME!r}")

    plugins = marketplace.get("plugins")
    if not isinstance(plugins, list) or len(plugins) != 1:
        result.error("isolated marketplace must contain exactly one plugin")
        return

    entry = plugins[0]
    if not isinstance(entry, dict):
        result.error("isolated marketplace plugin entry must be an object")
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
            result.ok(f"isolated marketplace {key} matches")
        else:
            result.error(
                f"isolated marketplace {key} must be {expected_value!r}, "
                f"got {actual.get(key)!r}"
            )


def write_summary(root: Path, result: LayoutCheck, isolated: Path | None) -> None:
    summary_path = (isolated or (root / ISOLATED_ROOT)) / SUMMARY_NAME
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema_version": "1",
        "created_at": now_iso(),
        "isolated_root": str((isolated or (root / ISOLATED_ROOT)).resolve()),
        "checks": result.checks,
        "warnings": result.warnings,
        "errors": result.errors,
        "not_proven": NOT_PROVEN,
    }
    summary_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    result.summary_path = str(summary_path)


def run(root: Path) -> LayoutCheck:
    result = LayoutCheck()
    isolated: Path | None = None
    try:
        isolated, plugin_copy, marketplace_copy = copy_layout(root, result)
    except FileNotFoundError:
        write_summary(root, result, isolated)
        return result
    except Exception as exc:
        result.error(f"isolated layout could not be prepared: {exc}")
        write_summary(root, result, isolated)
        return result

    compare_file_sets(
        result,
        root / INSTALL_CANDIDATE_ROOT,
        plugin_copy,
        "isolated plugin copy",
    )
    compare_file_sets(
        result,
        root / MARKETPLACE_ROOT,
        marketplace_copy,
        "isolated marketplace copy",
    )
    check_plugin_manifest(result, root, plugin_copy)
    check_skill_layout(result, plugin_copy)
    check_marketplace(result, marketplace_copy)
    result.warn(
        "isolated layout smoke does not register a marketplace, install a plugin, "
        "or prove skill trigger behavior"
    )
    write_summary(root, result, isolated)
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
            "summary_path": result.summary_path,
            "not_proven": NOT_PROVEN,
        }, indent=2))
    else:
        for check in result.checks:
            print(f"OK: {check}")
        for warning in result.warnings:
            print(f"WARN: {warning}")
        for error in result.errors:
            print(f"ERROR: {error}")
        if result.summary_path:
            print(f"OK: wrote summary: {result.summary_path}")
        if result.errors:
            print(f"Isolated install layout check failed: {len(result.errors)} error(s)")
        else:
            suffix = f", {len(result.warnings)} warning(s)" if result.warnings else ""
            print(f"Isolated install layout check passed{suffix}")

    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
