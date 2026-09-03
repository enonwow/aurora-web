from __future__ import annotations

import hashlib
import importlib.util
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
BASE_RUNNER = Path(
    r"C:\Projects\nwn\VFX\scripts\source-scripts\run-skrytobojca-mark-nwn-proof.py"
)
NWN_USER_DIR = Path.home() / "Documents" / "Neverwinter Nights"
MODULES_DIR = NWN_USER_DIR / "modules"
SOURCE_MODULE = MODULES_DIR / "tlc_vfx_catalog_lab_iter1.mod"
SOURCE_MODULE_SHA256 = "fda307d129f0c0e17411fb5820c6c528ee66e3a079202be5e8e38be781cff010"
TEST_MODULE_NAME = "codex_vfx_row28"
TEST_MODULE = MODULES_DIR / f"{TEST_MODULE_NAME}.mod"
DEFAULT_BIC = NWN_USER_DIR / "localvault" / "avriemail461.bic"
DEFAULT_BIC_SHA256 = "5edc2ce0232dad09db9649401db55ccb9956ecfe98ff172e152a11ac5c1d7cc0"
FIXTURE_ROOT = (
    REPO_ROOT
    / "backend"
    / "docs"
    / "aurora-reverse"
    / "evidence"
    / "vfx-nwn-web-row28"
)
SOURCE_MODEL = FIXTURE_ROOT / "sources" / "vff_rainmeteor.mdl"
SOURCE_MODEL_SHA256 = "ea57f0346166314602d9d473873cedde791f9911ef90722c114481a0b6ebf29b"
SOURCE_TABLE = FIXTURE_ROOT / "sources" / "visualeffects.2da"
SOURCE_TABLE_SHA256 = "acefe76f7fb14e88916ae1ade40dd5108b8a2f601eaada82a67f751b4eb56ea2"
HAK_LINEAGE_PROFILE = (
    REPO_ROOT
    / "backend"
    / "docs"
    / "aurora-reverse"
    / "evidence"
    / "vfx-placeable-object-attachment-row50"
    / "profile-v2"
    / "proof-profile.json"
)
FIXTURE_ID = "vfx-nwn-web-row28"
SOURCE_ROW = 28
SOURCE_LABEL_2DA = "VFX_FNF_METEOR_SWEARM"
SOURCE_CONSTANT = "VFX_FNF_METEOR_SWARM"
SOURCE_MODEL_RESREF = "vff_rainmeteor"
MARK_SCRIPT = "vfx28shot"
ENTRY_SCRIPT = "vfx28entry"
DEFAULT_BIC_RESREF = "codexvfxproofpc"
TRIGGER_DELAY_SECONDS = 16.0
TRIGGER_MARKER = (
    f"AURORA_VFX_PROOF_TRIGGER fixture={FIXTURE_ID} row={SOURCE_ROW} count=1"
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().lower()


def assert_exact_file(path: Path, expected_sha256: str, label: str) -> None:
    if not path.is_file():
        raise RuntimeError(f"Missing {label}: {path}")
    actual = sha256(path)
    if actual != expected_sha256:
        raise RuntimeError(
            f"{label} hash mismatch: expected={expected_sha256} actual={actual} path={path}"
        )


def ensure_destination_absent(destination: Path) -> None:
    if destination.exists():
        raise RuntimeError(
            f"Refusing to overwrite an existing row28 proof module: {destination}"
        )


def build_sources(run_id: str) -> tuple[str, str]:
    trigger = f'''void main()
{{
    object oModule = GetModule();
    if (GetLocalInt(oModule, "AURORA_VFX_PROOF_TRIGGERED"))
    {{
        return;
    }}

    SetLocalInt(oModule, "AURORA_VFX_PROOF_TRIGGERED", 1);
    object oTarget = GetFirstPC();
    if (!GetIsObjectValid(oTarget))
    {{
        return;
    }}

    WriteTimestampedLogEntry("{TRIGGER_MARKER} run={run_id}");
    effect eVisual = EffectVisualEffect({SOURCE_CONSTANT});
    ApplyEffectAtLocation(DURATION_TYPE_INSTANT, eVisual, GetLocation(oTarget));
}}
'''
    entry = f'''void main()
{{
    object oModule = GetModule();
    object oPC = GetFirstPC();
    if (!GetIsObjectValid(oPC) || GetLocalInt(oModule, "AURORA_VFX_PROOF_SCHEDULED"))
    {{
        return;
    }}

    SetLocalInt(oModule, "AURORA_VFX_PROOF_SCHEDULED", 1);
    AssignCommand(oPC, SetCameraFacing(180.0, 7.0, 62.0, CAMERA_TRANSITION_TYPE_SNAP));
    DelayCommand({TRIGGER_DELAY_SECONDS:.1f}, ExecuteScript("{MARK_SCRIPT}", oModule));
}}
'''
    return trigger, entry


def build_binary_bootstrap_profile(
    *, module_path: Path, module_sha256: str, ordered_haks: list[dict]
) -> dict:
    return {
        "version": "aurora-toolset-binary-module-bootstrap-profile/v1",
        "id": "vfx-row28-retail-oracle-exact-one-trigger",
        "module": {
            "resref": TEST_MODULE_NAME,
            "path": str(module_path),
            "sha256": module_sha256,
        },
        "area": {"resref": "enon_test_effect", "width": 2, "height": 2},
        "entryPoint": {
            "area": "enon_test_effect",
            "position": [9.5, 3.799999952316284, 0],
        },
        "orderedHakList": [
            {
                "resref": item["name"],
                "path": item["path"],
                "sha256": item["sha256"],
            }
            for item in ordered_haks
        ],
        "fixtures": [
            {
                "id": "enon_test_effect:creature-0",
                "templateResRef": "nw_innkeeper",
                "appearanceType": 233,
                "position": [9.5, 6.8, 0],
            }
        ],
        "noLocalToolsetAdapter": True,
    }


def load_base_runner():
    spec = importlib.util.spec_from_file_location("aurora_vfx_row28_asset_base", BASE_RUNNER)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load asset pipeline base: {BASE_RUNNER}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def read_ordered_haks() -> list[dict]:
    if not HAK_LINEAGE_PROFILE.is_file():
        raise RuntimeError(f"Missing exact HAK lineage profile: {HAK_LINEAGE_PROFILE}")
    profile = json.loads(HAK_LINEAGE_PROFILE.read_text(encoding="utf-8"))
    source_module = profile.get("sourceModule") or {}
    if source_module.get("sha256") != SOURCE_MODULE_SHA256:
        raise RuntimeError("HAK lineage profile is not bound to the exact source module")
    ordered_haks = source_module.get("orderedHaks") or []
    if len(ordered_haks) != 59:
        raise RuntimeError(f"Expected 59 ordered HAKs, got {len(ordered_haks)}")
    for expected_index, item in enumerate(ordered_haks):
        if item.get("index") != expected_index:
            raise RuntimeError(f"HAK order index mismatch at {expected_index}")
        if not Path(item.get("path", "")).is_file():
            raise RuntimeError(f"Missing ordered HAK at index {expected_index}: {item.get('path')}")
    return ordered_haks


def main() -> None:
    assert_exact_file(SOURCE_MODULE, SOURCE_MODULE_SHA256, "source module")
    assert_exact_file(DEFAULT_BIC, DEFAULT_BIC_SHA256, "default BIC")
    assert_exact_file(SOURCE_MODEL, SOURCE_MODEL_SHA256, "row28 source model")
    assert_exact_file(SOURCE_TABLE, SOURCE_TABLE_SHA256, "visualeffects.2da")
    if not BASE_RUNNER.is_file():
        raise RuntimeError(f"Missing caller-owned ERF/GFF asset pipeline: {BASE_RUNNER}")
    ensure_destination_absent(TEST_MODULE)
    ordered_haks = read_ordered_haks()

    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_dir = FIXTURE_ROOT / "nwn-preparation" / f"run-{run_id}"
    source_dir = run_dir / "scripts"
    source_dir.mkdir(parents=True, exist_ok=False)

    trigger_text, entry_text = build_sources(run_id)
    trigger_path = source_dir / f"{MARK_SCRIPT}.nss"
    entry_path = source_dir / f"{ENTRY_SCRIPT}.nss"
    trigger_path.write_text(trigger_text, encoding="ascii")
    entry_path.write_text(entry_text, encoding="ascii")

    base = load_base_runner()
    base.SOURCE_MODULE = SOURCE_MODULE
    base.TEST_MODULE_NAME = TEST_MODULE_NAME
    base.TEST_MODULE = TEST_MODULE
    base.SCRIPT_DIR = source_dir
    base.MARK_SCRIPT = MARK_SCRIPT
    base.ON_ENTER_SCRIPT = ENTRY_SCRIPT
    base.DEFAULT_BIC_RESREF = DEFAULT_BIC_RESREF
    base.latest_local_bic = lambda: DEFAULT_BIC

    compiled = [base.compile_script(trigger_path), base.compile_script(entry_path)]
    preparing_module = MODULES_DIR / f".{TEST_MODULE_NAME}.{run_id}.preparing.mod"
    ensure_destination_absent(preparing_module)
    shutil.copy2(SOURCE_MODULE, preparing_module)
    try:
        module_info = base.inject_scripts(
            preparing_module,
            compiled,
            custom_runtime=False,
            custom_hak=False,
        )
        ensure_destination_absent(TEST_MODULE)
        preparing_module.replace(TEST_MODULE)
    except Exception:
        preparing_module.unlink(missing_ok=True)
        raise

    module_hash = sha256(TEST_MODULE)
    module_info.update(
        {
            "module": str(TEST_MODULE),
            "moduleSha256": module_hash,
            "moduleName": TEST_MODULE_NAME,
            "mode": "caller-owned-offline-erf-gff-asset-pipeline",
        }
    )
    profile = build_binary_bootstrap_profile(
        module_path=TEST_MODULE,
        module_sha256=module_hash,
        ordered_haks=ordered_haks,
    )
    profile_path = run_dir / "binary-module-bootstrap-profile.json"
    profile_path.write_text(json.dumps(profile, indent=2), encoding="utf-8")

    preflight = {
        "version": "aurora-vfx-row28-retail-module-preflight/v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "fixtureId": FIXTURE_ID,
        "runId": run_id,
        "status": "offline-module-prepared-runtime-proof-not-yet-captured",
        "intentionalTriggerCount": 1,
        "automaticRetry": False,
        "effect": {
            "table": "visualeffects.2da",
            "rowId": SOURCE_ROW,
            "sourceLabel": SOURCE_LABEL_2DA,
            "publicConstant": SOURCE_CONSTANT,
            "modelResref": SOURCE_MODEL_RESREF,
            "applicationMode": "location",
            "rawInvocation": (
                "ApplyEffectAtLocation(DURATION_TYPE_INSTANT, "
                "EffectVisualEffect(VFX_FNF_METEOR_SWARM), first-pc-location)"
            ),
        },
        "sourceModule": {"path": str(SOURCE_MODULE), "sha256": SOURCE_MODULE_SHA256},
        "sourceModel": {"path": str(SOURCE_MODEL), "sha256": SOURCE_MODEL_SHA256},
        "sourceTable": {"path": str(SOURCE_TABLE), "sha256": SOURCE_TABLE_SHA256},
        "defaultBic": {"path": str(DEFAULT_BIC), "sha256": DEFAULT_BIC_SHA256},
        "scripts": {
            MARK_SCRIPT: {"path": str(trigger_path), "sha256": sha256(trigger_path)},
            ENTRY_SCRIPT: {"path": str(entry_path), "sha256": sha256(entry_path)},
        },
        "compiledScripts": [
            {"path": str(path), "sha256": sha256(path)} for path in compiled
        ],
        "module": module_info,
        "binaryBootstrapProfile": str(profile_path),
        "orderedHakCount": len(ordered_haks),
        "safety": {
            "startsToolset": False,
            "startsNwn": False,
            "usesGlobalInput": False,
            "overwritesExistingModule": False,
        },
    }
    preflight_path = run_dir / "preflight.json"
    preflight_path.write_text(json.dumps(preflight, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "ok": True,
                "status": preflight["status"],
                "module": module_info,
                "profile": str(profile_path),
                "preflight": str(preflight_path),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
