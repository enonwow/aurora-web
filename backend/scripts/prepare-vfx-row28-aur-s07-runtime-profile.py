from __future__ import annotations

import hashlib
import importlib.util
import json
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
BASE_PARSER = Path(r"C:\Projects\nwn\VFX\scripts\source-scripts\run-skrytobojca-mark-nwn-proof.py")
NWN_ROOT = Path.home() / "Documents" / "Neverwinter Nights"
SOURCE_MODULE = NWN_ROOT / "modules" / "tlc_vfx_catalog_lab_iter1.mod"
SOURCE_MODULE_SHA256 = "fda307d129f0c0e17411fb5820c6c528ee66e3a079202be5e8e38be781cff010"
AREA = "enon_test_effect"
ENTRY_POINT = [9.5, 3.799999952316284, 0]
FIXTURE_POSITION = [9.5, 6.8, 0]
RUN_ROOT = REPO_ROOT / "backend" / "docs" / "aurora-reverse" / "evidence" / "vfx-nwn-web-row28" / "nwn-preparation" / "run-20260818T164640Z"
NATIVE_ROOT = RUN_ROOT / "native-geometry-v7-run-05"
BOOTSTRAP_PROFILE = NATIVE_ROOT / "post-native-save-binary-bootstrap-profile.json"
NATIVE_MANIFEST = NATIVE_ROOT / "binary-native-geometry-manifest.json"
PREFLIGHT = RUN_ROOT / "preflight.json"
OUTPUT_ROOT = REPO_ROOT / "backend" / "docs" / "aurora-reverse" / "evidence" / "vfx-nwn-web-row28" / "nwn-runtime" / "v1"
GEOMETRY_GATE = OUTPUT_ROOT / "predecessor-geometry-gate.json"
RUNTIME_PROFILE = OUTPUT_ROOT / "aur-s07-runtime-profile.json"
TILE_FIELDS = [
    "Tile_ID", "Tile_Orientation", "Tile_Height", "Tile_MainLight1", "Tile_MainLight2",
    "Tile_SrcLight1", "Tile_SrcLight2", "Tile_AnimLoop1", "Tile_AnimLoop2", "Tile_AnimLoop3",
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().lower()


def load_json(path: Path) -> dict:
    if not path.is_file():
        raise RuntimeError(f"missing:{path}")
    return json.loads(path.read_text(encoding="utf-8"))


def load_base_parser():
    if not BASE_PARSER.is_file():
        raise RuntimeError(f"predecessor_base_parser_missing:{BASE_PARSER}")
    spec = importlib.util.spec_from_file_location("vfx_row28_predecessor_base", BASE_PARSER)
    if spec is None or spec.loader is None:
        raise RuntimeError("predecessor_base_parser_import_failed")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def exact_hash(path: Path, expected: str, code: str) -> None:
    if not path.is_file() or sha256(path) != expected:
        raise RuntimeError(code)


def area_semantics(base, module_path: Path) -> dict:
    erf = base.read_erf_entries(module_path.read_bytes(), module_path)
    matches = [entry for entry in erf["entries"] if entry["resref"] == AREA and entry["type"] == 2012]
    if len(matches) != 1:
        raise RuntimeError(f"exact_area_are_missing:{module_path}:{len(matches)}")
    gff = base.parse_gff(matches[0]["bytes"], f"{module_path}:{AREA}.are")
    root = {field["label"]: field["value"] for field in gff["structs"][0]["fields"]}
    tile_indices = root.get("Tile_List")
    if not isinstance(tile_indices, list):
        raise RuntimeError(f"area_tile_list_missing:{module_path}")
    tiles = []
    for index in tile_indices:
        fields = {field["label"]: field["value"] for field in gff["structs"][index]["fields"]}
        tiles.append({name: fields.get(name) for name in TILE_FIELDS})
    return {"width": root.get("Width"), "height": root.get("Height"), "tileset": root.get("Tileset"), "tiles": tiles}


def validate_native_lineage(profile: dict, manifest: dict) -> None:
    module = profile["module"]
    exact_hash(Path(module["path"]), module["sha256"], "row28_module_hash_mismatch")
    haks = profile.get("orderedHakList") or []
    if len(haks) != 59:
        raise RuntimeError(f"ordered_hak_count_mismatch:{len(haks)}")
    for index, hak in enumerate(haks):
        exact_hash(Path(hak["path"]), hak["sha256"], f"ordered_hak_hash_mismatch:{index}:{hak.get('resref')}")
    if manifest.get("status") != "geometry_saved_pending_entry_observation":
        raise RuntimeError("native_geometry_manifest_status_invalid")
    save = manifest.get("nativeSave") or {}
    if save.get("areaWasSaved") is not True or save.get("invalidLocationsDialog") is not False or save.get("inaccessibleObjectsDialog") is not False:
        raise RuntimeError("native_save_gate_invalid")
    structural = manifest.get("postSaveStructural") or {}
    if structural.get("status") != "binary_bootstrap_structural_readback_valid" or structural.get("module", {}).get("sha256") != module["sha256"]:
        raise RuntimeError("post_save_structural_readback_invalid")
    git = manifest.get("nativeGitReadback") or {}
    if git.get("moduleSha256") != module["sha256"] or git.get("area") != AREA or git.get("objectCounts", {}).get("creatures") != 1:
        raise RuntimeError("native_git_readback_invalid")
    creature = (git.get("creatures") or [{}])[0]
    if creature.get("templateResRef") != "nw_innkeeper" or creature.get("appearanceType") != 233 or creature.get("position") != FIXTURE_POSITION:
        raise RuntimeError("native_fixture_readback_invalid")
    entry = manifest.get("nativeEntryReadback") or {}
    if entry.get("moduleSha256") != module["sha256"] or entry.get("area") != AREA or entry.get("position") != ENTRY_POINT or entry.get("direction") != [0, 1]:
        raise RuntimeError("native_entry_readback_invalid")


def validate_one_trigger(preflight: dict) -> dict:
    scripts = preflight.get("scripts") or {}
    for name in ("vfx28entry", "vfx28shot"):
        record = scripts.get(name) or {}
        exact_hash(Path(record.get("path", "")), record.get("sha256", ""), f"script_hash_mismatch:{name}")
    entry_text = Path(scripts["vfx28entry"]["path"]).read_text(encoding="ascii")
    shot_text = Path(scripts["vfx28shot"]["path"]).read_text(encoding="ascii")
    if 'DelayCommand(16.0, ExecuteScript("vfx28shot", oModule));' not in entry_text:
        raise RuntimeError("row28_trigger_delay_invalid")
    if shot_text.count("ApplyEffectAtLocation(") != 1 or "EffectVisualEffect(VFX_FNF_METEOR_SWARM)" not in shot_text:
        raise RuntimeError("row28_effect_invocation_invalid")
    marker = "AURORA_VFX_PROOF_TRIGGER fixture=vfx-nwn-web-row28 row=28 count=1 run=20260818T164640Z"
    if marker not in shot_text:
        raise RuntimeError("row28_trigger_marker_invalid")
    return {"delaySeconds": 16.0, "intentionalTriggerCount": 1, "marker": marker}


def main() -> None:
    for output in (GEOMETRY_GATE, RUNTIME_PROFILE):
        if output.exists():
            raise RuntimeError(f"refusing_to_overwrite:{output}")
    exact_hash(SOURCE_MODULE, SOURCE_MODULE_SHA256, "source_module_hash_mismatch")
    profile = load_json(BOOTSTRAP_PROFILE)
    manifest = load_json(NATIVE_MANIFEST)
    preflight = load_json(PREFLIGHT)
    validate_native_lineage(profile, manifest)
    trigger = validate_one_trigger(preflight)
    base = load_base_parser()
    source_semantics = area_semantics(base, SOURCE_MODULE)
    target_path = Path(profile["module"]["path"])
    target_semantics = area_semantics(base, target_path)
    if source_semantics != target_semantics or source_semantics["width"] != 2 or source_semantics["height"] != 2 or source_semantics["tileset"] != "tin01":
        raise RuntimeError("predecessor_area_semantics_mismatch")

    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    generated_at = datetime.now(timezone.utc).isoformat()
    geometry = {
        "version": "vfx-row28-predecessor-geometry-gate/v1",
        "generatedAt": generated_at,
        "status": "verified",
        "method": "exact ERF/GFF semantic ARE comparison using the predecessor proof parser, plus native Toolset Save/GIT/IFO readback",
        "source": {"path": str(SOURCE_MODULE), "sha256": SOURCE_MODULE_SHA256, "area": AREA, "semantics": source_semantics},
        "candidate": {"path": str(target_path), "sha256": profile["module"]["sha256"], "area": AREA, "semantics": target_semantics},
        "semanticAreaEqual": True,
        "nativeSave": {"areaWasSaved": True, "invalidLocationsDialog": False, "inaccessibleObjectsDialog": False, "manifest": str(NATIVE_MANIFEST)},
        "nativeReadback": {"structuralStatus": manifest["postSaveStructural"]["status"], "gitSha256": manifest["nativeGitReadback"]["gitSha256"], "entryPoint": ENTRY_POINT, "entryDirection": [0, 1]},
    }
    GEOMETRY_GATE.write_text(json.dumps(geometry, indent=2) + "\n", encoding="utf-8")
    runtime = {
        "version": "aur-s07-runtime-profile/v1",
        "id": "vfx-row28-predecessor-retail-runtime-v1",
        "module": {"path": str(target_path), "sha256": profile["module"]["sha256"], "area": AREA, "entryPoint": ENTRY_POINT},
        "orderedHakList": profile["orderedHakList"],
        "geometryGate": {"status": "verified", "artifact": str(GEOMETRY_GATE), "sha256": sha256(GEOMETRY_GATE)},
        "fixtures": [{
            "id": "vfx-nwn-web-row28", "resref": "vff_rainmeteor", "templateResRef": "nw_innkeeper",
            "appearanceRow": 233, "position": FIXTURE_POSITION, "sourceRow": 28,
            "sourceLabel": "VFX_FNF_METEOR_SWEARM", "publicConstant": "VFX_FNF_METEOR_SWARM",
            "triggerScript": "vfx28shot", "triggerDelaySeconds": trigger["delaySeconds"],
            "intentionalTriggerCount": trigger["intentionalTriggerCount"], "triggerMarker": trigger["marker"],
        }],
        "launch": {"mode": "central_guarded_test_module_action", "processName": "nwmain"},
    }
    RUNTIME_PROFILE.write_text(json.dumps(runtime, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"ok": True, "status": "verified", "geometryGate": str(GEOMETRY_GATE), "runtimeProfile": str(RUNTIME_PROFILE), "moduleSha256": profile["module"]["sha256"], "orderedHakCount": len(profile["orderedHakList"])}, indent=2))


if __name__ == "__main__":
    main()
