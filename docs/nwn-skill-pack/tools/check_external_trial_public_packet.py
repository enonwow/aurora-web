#!/usr/bin/env python3
"""Check the generated public-only external contributor trial packet."""

from __future__ import annotations

import argparse
import importlib.util
import json
import shutil
import subprocess
import sys
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType


DEFAULT_PACKET = Path(".codex-tmp/external-trial-public-packet/ext-001")
DEFAULT_SMOKE_ROOT = Path(".codex-tmp/external-trial-public-packet-smoke/ext-001")
DEFAULT_UNZIP_SMOKE_ROOT = Path(".codex-tmp/external-trial-public-packet-unzip-smoke/ext-001")


@dataclass
class PublicPacketCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def load_module(path: Path, name: str) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def load_json(path: Path) -> dict[str, object]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain an object")
    return data


def iter_files(root: Path) -> list[Path]:
    return sorted(path for path in root.rglob("*") if path.is_file())


def run_command(
    result: PublicPacketCheck,
    label: str,
    command: list[str],
    cwd: Path,
    required_tokens: list[str],
) -> str:
    completed = subprocess.run(
        command,
        cwd=cwd,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    output = completed.stdout
    if completed.returncode != 0:
        result.error(f"{label} failed with exit {completed.returncode}: {output.strip()}")
        return output
    missing = [token for token in required_tokens if token not in output]
    if missing:
        result.error(f"{label} output missing tokens: {', '.join(missing)}")
    else:
        result.ok(f"{label} passed")
    return output


def run_packet_cli_smoke(
    result: PublicPacketCheck,
    root: Path,
    packet_root: Path,
    smoke_root: Path,
    label_prefix: str,
) -> None:
    script = packet_root / "tools" / "nwn_skill_feedback.py"
    if not script.exists():
        result.error(f"{label_prefix} CLI script is missing: tools/nwn_skill_feedback.py")
        return

    help_smokes = [
        (["--help"], ["new", "validate", "bundle", "verify-bundle"]),
        (["new", "--help"], ["--domain", "--source-type", "--proposed-file"]),
        (["validate", "--help"], ["paths"]),
        (["bundle", "--help"], ["--bundle-id", "--fail-on-risky"]),
        (["verify-bundle", "--help"], ["--fail-on-risky", "bundle"]),
    ]
    for args, required_tokens in help_smokes:
        completed = subprocess.run(
            [sys.executable, str(script.resolve()), *args],
            cwd=packet_root,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        label = " ".join(["nwn_skill_feedback.py", *args])
        output = completed.stdout
        if completed.returncode != 0:
            result.error(f"{label_prefix} CLI help failed for {label}: exit {completed.returncode}")
            continue
        missing = [token for token in required_tokens if token not in output]
        if missing:
            result.error(f"{label_prefix} CLI help for {label} missing tokens: {', '.join(missing)}")
        else:
            result.ok(f"{label_prefix} CLI help works: {label}")

    tmp_root = (root / ".codex-tmp").resolve()
    smoke_resolved = smoke_root.resolve()
    if not (smoke_resolved == tmp_root or tmp_root in smoke_resolved.parents):
        result.error(f"{label_prefix} smoke root is outside .codex-tmp: {smoke_root}")
        return
    if smoke_root.exists():
        shutil.rmtree(smoke_root)
    smoke_root.mkdir(parents=True, exist_ok=True)

    records_dir = smoke_root / "feedback-records"
    bundle_dir = smoke_root / "bundle"
    run_command(
        result,
        f"{label_prefix} CLI command path: new",
        [
            sys.executable,
            str(script.resolve()),
            "new",
            "--out",
            str(records_dir.resolve()),
            "--domain",
            "nui",
            "--title",
            "EXT-001 public packet smoke NUI note",
            "--summary",
            "Synthetic checker record proving the copied public packet CLI can create a feedback record.",
            "--source-type",
            "docs-research",
            "--status",
            "unverified",
            "--nwn-version",
            "NWN EE synthetic",
            "--server-context",
            "public packet smoke only",
            "--evidence",
            "Synthetic checker evidence; no target module was executed.",
            "--runtime-steps",
            "No game run; this is a local transport smoke.",
            "--failure-mode",
            "If this command fails, the public packet command path is not usable.",
            "--proposed-file",
            "draft-skills/nwn-server-gamedev/references/nui-player-ui.md",
            "--proposed-summary",
            "No promotion; smoke only.",
            "--notes",
            "Generated by check_external_trial_public_packet.py in scratch storage.",
        ],
        packet_root,
        [".json"],
    )
    if not records_dir.is_dir() or not list(records_dir.glob("*.json")):
        result.error(f"{label_prefix} command path did not create a feedback JSON record")
    else:
        result.ok(f"{label_prefix} command path created a feedback JSON record")

    run_command(
        result,
        f"{label_prefix} CLI command path: validate",
        [
            sys.executable,
            str(script.resolve()),
            "validate",
            str(records_dir.resolve()),
        ],
        packet_root,
        ["OK"],
    )
    run_command(
        result,
        f"{label_prefix} CLI command path: bundle",
        [
            sys.executable,
            str(script.resolve()),
            "bundle",
            str(records_dir.resolve()),
            "--out",
            str(bundle_dir.resolve()),
            "--bundle-id",
            "ext-001-public-packet-smoke",
            "--force",
            "--fail-on-risky",
        ],
        packet_root,
        [str(bundle_dir.resolve())],
    )
    if (bundle_dir / "manifest.json").exists() and (bundle_dir / "SUMMARY.md").exists():
        result.ok(f"{label_prefix} command path created bundle manifest and summary")
    else:
        result.error(f"{label_prefix} command path did not create bundle manifest and summary")

    run_command(
        result,
        f"{label_prefix} CLI command path: verify-bundle",
        [
            sys.executable,
            str(script.resolve()),
            "verify-bundle",
            str(bundle_dir.resolve()),
            "--fail-on-risky",
        ],
        packet_root,
        ["OK: manifest schema_version is 1", "Contribution bundle verification passed"],
    )


def run(root: Path, packet_relative: Path = DEFAULT_PACKET) -> PublicPacketCheck:
    result = PublicPacketCheck()
    packet_root = root / packet_relative
    if not packet_root.is_dir():
        result.error(f"public packet root is missing: {packet_relative}")
        return result

    try:
        builder = load_module(root / "tools" / "build_external_trial_public_packet.py", "build_external_trial_public_packet_check")
    except Exception as exc:
        result.error(f"cannot import public packet builder: {exc}")
        return result

    manifest_path = packet_root / builder.PUBLIC_MANIFEST
    if not manifest_path.exists():
        result.error(f"public packet manifest is missing: {manifest_path}")
        return result

    try:
        manifest = load_json(manifest_path)
    except Exception as exc:
        result.error(f"public packet manifest is invalid: {exc}")
        return result

    result.ok(f"public packet root exists: {packet_relative}")
    if manifest.get("schema_version") == "1":
        result.ok("public packet manifest schema_version is 1")
    else:
        result.error("public packet manifest schema_version must be 1")

    public_files = manifest.get("public_files")
    if not isinstance(public_files, list):
        result.error("public packet manifest public_files must be a list")
        public_files = []

    copied_sources: dict[str, str] = {}
    for item in public_files:
        if not isinstance(item, dict):
            result.error("public packet manifest public_files entries must be objects")
            continue
        source = item.get("source")
        digest = item.get("sha256")
        if not isinstance(source, str) or not isinstance(digest, str):
            result.error("public packet manifest public file entry is missing source or sha256")
            continue
        copied_sources[source] = digest

    expected_sources = set(builder.PUBLIC_FILES)
    if set(copied_sources) == expected_sources:
        result.ok("public packet includes exactly the expected source files")
    else:
        result.error(
            "public packet source list differs; "
            f"expected {sorted(expected_sources)}, got {sorted(copied_sources)}"
        )

    expected_files = set(expected_sources)
    expected_files.add(str(builder.START_HERE).replace("\\", "/"))
    expected_files.add(str(builder.PUBLIC_MANIFEST).replace("\\", "/"))
    actual_files = {
        str(path.relative_to(packet_root)).replace("\\", "/")
        for path in iter_files(packet_root)
    }
    if actual_files == expected_files:
        result.ok("public packet has no unexpected files")
    else:
        result.error(
            "public packet file set differs; "
            f"expected {sorted(expected_files)}, got {sorted(actual_files)}"
        )

    for source in sorted(expected_sources):
        source_path = root / source
        target_path = packet_root / source
        if not target_path.exists():
            result.error(f"public packet missing copied source: {source}")
            continue
        if builder.sha256(source_path) == builder.sha256(target_path) == copied_sources.get(source):
            result.ok(f"public packet copied hash matches source: {source}")
        else:
            result.error(f"public packet copied hash differs from source: {source}")

    archive_path_for_smoke: Path | None = None
    archive_value = manifest.get("archive")
    if not isinstance(archive_value, str) or not archive_value:
        result.error("public packet manifest archive path is missing")
    else:
        archive_path = Path(archive_value)
        if not archive_path.is_absolute():
            archive_path = root / archive_path
        if not archive_path.exists():
            result.error(f"public packet archive is missing: {archive_path}")
        else:
            archive_path_for_smoke = archive_path
            try:
                with zipfile.ZipFile(archive_path, "r") as handle:
                    names = sorted(name for name in handle.namelist() if not name.endswith("/"))
                    if set(names) == expected_files:
                        result.ok("public packet archive has exact file set")
                    else:
                        result.error(
                            "public packet archive file set differs; "
                            f"expected {sorted(expected_files)}, got {names}"
                        )
                    for name in names:
                        target = packet_root / name
                        if not target.exists():
                            continue
                        zipped = handle.read(name)
                        current = target.read_bytes()
                        if zipped != current:
                            result.error(f"public packet archive content differs from packet file: {name}")
                            break
                    else:
                        result.ok("public packet archive contents match packet directory")
            except zipfile.BadZipFile as exc:
                result.error(f"public packet archive is invalid zip: {exc}")

    start_here = packet_root / builder.START_HERE
    if not start_here.exists():
        result.error("public packet START-HERE.md is missing")
    else:
        text = start_here.read_text(encoding="utf-8")
        required = [
            "Start with `knowledge-inbox/external-contributor-trial-packet.md`.",
            "python tools\\nwn_skill_feedback.py --help",
            "python tools\\nwn_skill_feedback.py new --help",
            "python tools\\nwn_skill_feedback.py bundle --help",
            "python tools\\nwn_skill_feedback.py verify-bundle --help",
            "not NWN runtime proof",
            "not release-candidate evidence",
            "returned feedback remains untrusted",
        ]
        missing = [token for token in required if token not in text]
        if missing:
            result.error(f"START-HERE.md missing tokens: {', '.join(missing)}")
        else:
            result.ok("START-HERE.md includes tester boundary tokens")

    forbidden_path_hits = []
    for actual in actual_files:
        parts = set(Path(actual).parts)
        hits = sorted(builder.FORBIDDEN_PATH_PARTS & parts)
        if hits:
            forbidden_path_hits.append(f"{actual}: {', '.join(hits)}")
    if forbidden_path_hits:
        result.error(f"public packet has forbidden paths: {'; '.join(forbidden_path_hits)}")
    else:
        result.ok("public packet paths avoid repo-only segments")

    forbidden_content_hits = []
    for path in iter_files(packet_root):
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for token in sorted(builder.FORBIDDEN_CONTENT_TOKENS):
            if token in text:
                forbidden_content_hits.append(f"{path.relative_to(packet_root)}: {token}")
    if forbidden_content_hits:
        result.error(f"public packet includes forbidden content tokens: {'; '.join(forbidden_content_hits)}")
    else:
        result.ok("public packet content avoids reviewer-only file tokens")

    run_packet_cli_smoke(
        result,
        root,
        packet_root,
        root / DEFAULT_SMOKE_ROOT,
        "public packet",
    )

    if archive_path_for_smoke is not None and archive_path_for_smoke.exists():
        unzip_root = root / DEFAULT_UNZIP_SMOKE_ROOT
        tmp_root = (root / ".codex-tmp").resolve()
        unzip_resolved = unzip_root.resolve()
        if not (unzip_resolved == tmp_root or tmp_root in unzip_resolved.parents):
            result.error(f"public packet archive extraction root is outside .codex-tmp: {unzip_root}")
            return result
        if unzip_root.exists():
            shutil.rmtree(unzip_root)
        unzip_root.mkdir(parents=True, exist_ok=True)
        try:
            with zipfile.ZipFile(archive_path_for_smoke, "r") as handle:
                unsafe_names = [
                    name
                    for name in handle.namelist()
                    if Path(name).is_absolute() or ".." in Path(name).parts
                ]
                if unsafe_names:
                    result.error(f"public packet archive has unsafe paths: {', '.join(unsafe_names)}")
                else:
                    handle.extractall(unzip_root)
                    extracted_files = {
                        str(path.relative_to(unzip_root)).replace("\\", "/")
                        for path in iter_files(unzip_root)
                    }
                    if extracted_files == expected_files:
                        result.ok("public packet archive extracts to the expected file set")
                    else:
                        result.error(
                            "public packet archive extraction file set differs; "
                            f"expected {sorted(expected_files)}, got {sorted(extracted_files)}"
                        )
                    run_packet_cli_smoke(
                        result,
                        root,
                        unzip_root,
                        root / DEFAULT_UNZIP_SMOKE_ROOT.parent / "cli-smoke",
                        "public packet archive extraction",
                    )
        except zipfile.BadZipFile as exc:
            result.error(f"public packet archive extraction failed: {exc}")

    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--packet", default=str(DEFAULT_PACKET))
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    result = run(Path(args.root), Path(args.packet))
    if args.json:
        print(json.dumps({"checks": result.checks, "errors": result.errors}, indent=2))
    else:
        for check in result.checks:
            print(f"OK: {check}")
        for error in result.errors:
            print(f"ERROR: {error}")
        if result.errors:
            print(f"External trial public packet check failed: {len(result.errors)} error(s)")
        else:
            print("External trial public packet check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
