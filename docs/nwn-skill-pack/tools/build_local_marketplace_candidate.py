#!/usr/bin/env python3
"""Build a repo-local marketplace sandbox for NWN skill-pack install-smoke prep."""

from __future__ import annotations

import argparse
import importlib.util
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PLUGIN_NAME = "nwn-server-gamedev-pack"
MARKETPLACE_NAME = "nwn-server-gamedev-local"
DEFAULT_OUTPUT = ".codex-tmp/marketplace-candidate"
DEFAULT_BUILD_MANIFEST = ".codex-tmp/marketplace-candidate/build-manifest.json"
ALLOWED_INSTALLATION = {"NOT_AVAILABLE", "AVAILABLE", "INSTALLED_BY_DEFAULT"}
ALLOWED_AUTHENTICATION = {"ON_INSTALL", "ON_USE"}


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_install_builder(root: Path):
    tool_path = root / "tools" / "build_plugin_install_candidate.py"
    if not tool_path.exists():
        raise FileNotFoundError(f"plugin install candidate builder is missing: {tool_path}")

    spec = importlib.util.spec_from_file_location("build_plugin_install_candidate", tool_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not import install candidate builder: {tool_path}")

    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    if not hasattr(module, "build"):
        raise RuntimeError("install candidate builder does not expose build(root, output, manifest_out, force)")
    return module.build


def safe_prepare_output(root: Path, output: Path, force: bool) -> None:
    default_parent = (root / ".codex-tmp").resolve()
    output_resolved = output.resolve()
    if output_resolved == root.resolve():
        raise ValueError("output must not be the package root")
    if not (output_resolved == default_parent or default_parent in output_resolved.parents):
        raise ValueError("marketplace sandbox output must stay under root/.codex-tmp")
    if not force and output.exists() and any(output.iterdir()):
        raise FileExistsError(f"output already exists and is not empty: {output}")

    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True, exist_ok=True)


def write_marketplace(output: Path, category: str) -> Path:
    marketplace = {
        "name": MARKETPLACE_NAME,
        "interface": {
            "displayName": "NWN Server Gamedev Local",
        },
        "plugins": [
            {
                "name": PLUGIN_NAME,
                "source": {
                    "source": "local",
                    "path": f"./plugins/{PLUGIN_NAME}",
                },
                "policy": {
                    "installation": "AVAILABLE",
                    "authentication": "ON_INSTALL",
                },
                "category": category,
            }
        ],
    }
    path = output / "marketplace.json"
    path.write_text(json.dumps(marketplace, indent=2) + "\n", encoding="utf-8")
    return path


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def validate_marketplace(output: Path) -> list[str]:
    errors: list[str] = []
    marketplace_path = output / "marketplace.json"
    plugin_root = output / "plugins" / PLUGIN_NAME
    plugin_manifest_path = plugin_root / ".codex-plugin" / "plugin.json"

    try:
        marketplace = load_json(marketplace_path)
    except Exception as exc:
        return [f"marketplace.json is invalid: {exc}"]

    if marketplace.get("name") != MARKETPLACE_NAME:
        errors.append(f"marketplace name must be {MARKETPLACE_NAME!r}")
    interface = marketplace.get("interface")
    if not isinstance(interface, dict) or not interface.get("displayName"):
        errors.append("marketplace interface.displayName is required")
    plugins = marketplace.get("plugins")
    if not isinstance(plugins, list) or len(plugins) != 1:
        errors.append("marketplace must contain exactly one plugin entry")
        return errors

    entry = plugins[0]
    if not isinstance(entry, dict):
        errors.append("plugin entry must be an object")
        return errors
    if entry.get("name") != PLUGIN_NAME:
        errors.append(f"plugin entry name must be {PLUGIN_NAME!r}")
    source = entry.get("source")
    if not isinstance(source, dict):
        errors.append("plugin entry source must be an object")
    else:
        if source.get("source") != "local":
            errors.append("plugin entry source.source must be 'local'")
        if source.get("path") != f"./plugins/{PLUGIN_NAME}":
            errors.append(f"plugin entry source.path must be './plugins/{PLUGIN_NAME}'")

    policy = entry.get("policy")
    if not isinstance(policy, dict):
        errors.append("plugin entry policy must be an object")
    else:
        if policy.get("installation") not in ALLOWED_INSTALLATION:
            errors.append("plugin entry policy.installation is invalid")
        if policy.get("authentication") not in ALLOWED_AUTHENTICATION:
            errors.append("plugin entry policy.authentication is invalid")
        if "products" in policy:
            errors.append("plugin entry policy.products should be omitted for this sandbox")
    if not entry.get("category"):
        errors.append("plugin entry category is required")

    if not plugin_manifest_path.exists():
        errors.append(f"plugin manifest is missing at {plugin_manifest_path}")
    else:
        try:
            plugin_manifest = load_json(plugin_manifest_path)
        except Exception as exc:
            errors.append(f"plugin manifest is invalid: {exc}")
        else:
            if plugin_manifest.get("name") != PLUGIN_NAME:
                errors.append("plugin manifest name does not match marketplace entry")

    return errors


def build(root: Path, output: Path, force: bool, category: str) -> dict[str, Any]:
    safe_prepare_output(root, output, force)
    plugin_output = output / "plugins" / PLUGIN_NAME
    plugin_manifest_out = output / "plugins" / f"{PLUGIN_NAME}.build-manifest.json"
    install_builder = load_install_builder(root)
    plugin_build_manifest = install_builder(root, plugin_output, plugin_manifest_out, True)
    marketplace_path = write_marketplace(output, category)
    errors = validate_marketplace(output)
    if errors:
        raise ValueError("; ".join(errors))

    manifest = {
        "schema_version": "1",
        "created_at": now_iso(),
        "source_root": str(root),
        "output": str(output),
        "marketplace": str(marketplace_path),
        "plugin_root": str(plugin_output),
        "plugin_file_count": plugin_build_manifest.get("file_count"),
        "marketplace_name": MARKETPLACE_NAME,
        "plugin_name": PLUGIN_NAME,
        "notes": [
            "This sandbox prepares a repo-local marketplace shape only.",
            "It does not add the marketplace to Codex, install the plugin, or prove trigger behavior.",
        ],
    }
    build_manifest = root / DEFAULT_BUILD_MANIFEST
    build_manifest.parent.mkdir(parents=True, exist_ok=True)
    build_manifest.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--out", default="")
    parser.add_argument("--category", default="Productivity")
    parser.add_argument("--force", action="store_true", help="Replace an existing sandbox output.")
    parser.add_argument("--json", action="store_true", help="Emit JSON report.")
    args = parser.parse_args()

    root = Path(args.root)
    output = Path(args.out) if args.out else root / DEFAULT_OUTPUT

    try:
        manifest = build(root, output, args.force, args.category)
    except Exception as exc:
        if args.json:
            print(json.dumps({"error": str(exc)}, indent=2))
        else:
            print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps(manifest, indent=2))
    else:
        print(f"OK: built marketplace sandbox: {output}")
        print(f"OK: wrote marketplace: {manifest['marketplace']}")
        print(f"OK: copied plugin files: {manifest['plugin_file_count']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
