from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import time
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
VFX_ROOT = Path(r"C:\Projects\nwn\VFX")
BASE_RUNNER = VFX_ROOT / "scripts" / "source-scripts" / "run-skrytobojca-mark-nwn-proof.py"
PROFILE_ROOT = (
    REPO_ROOT
    / "backend"
    / "docs"
    / "aurora-reverse"
    / "evidence"
    / "vfx-placeable-object-attachment-row50"
    / "profile-v2"
)
PROFILE_PATH = PROFILE_ROOT / "proof-profile.json"
TARGET_UTP = PROFILE_ROOT / "vfxplcproof.utp"
EVIDENCE_ROOT = PROFILE_ROOT.parent / "nwn" / "profile-v2"
NWN_USER_DIR = Path.home() / "Documents" / "Neverwinter Nights"
MODULES_DIR = NWN_USER_DIR / "modules"
TEST_MODULE_NAME = "codex_vfxplc50"
TEST_MODULE = MODULES_DIR / f"{TEST_MODULE_NAME}.mod"
MARK_SCRIPT = "vfxplc50shot"
ENTRY_SCRIPT = "vfxplc50entry"
TARGET_TEMPLATE = "vfxplcproof"
TARGET_TAG = "vfx_placeable_target"
TARGET_APPEARANCE_ROW = 779
TARGET_MODEL = "plc_lancrak1"
TARGET_IMPACT_NODE = "lancrak1_impact"
RESOURCE_TYPE_UTP = 2044
FIXTURE_ID = "vfx-broad-row50-placeable"
SOURCE_ROW = 50
SOURCE_LABEL = "VFX_IMP_DEATH"
TRIGGER_MARKER = (
    f"AURORA_VFX_PROOF_TRIGGER fixture={FIXTURE_ID} row={SOURCE_ROW} count=1"
)
TARGET_MARKER = (
    f"AURORA_VFX_PROOF_TARGET fixture={FIXTURE_ID} count=1"
)
CLIENT_LOG = NWN_USER_DIR / "logs" / "nwclientLog1.txt"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().lower()


def load_profile() -> dict:
    profile = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
    if profile.get("version") != "aurora-vfx-placeable-object-attachment-proof-profile/v2":
        raise RuntimeError("Unexpected placeable proof profile version")
    if profile.get("status") != "offline-preflight-ready":
        raise RuntimeError("Placeable proof profile is not offline-preflight-ready")
    if profile.get("sourcePolicy", {}).get("auroraFirst") is not True:
        raise RuntimeError("Placeable proof profile is not Aurora-first")
    if profile.get("sourcePolicy", {}).get("xoreosUsed") is not False:
        raise RuntimeError("Placeable proof profile violates the xoreos boundary")
    return profile


def validate_profile_files(profile: dict) -> dict:
    checks = []

    def check(path_value: str, expected_hash: str, label: str) -> None:
        path = Path(path_value)
        if not path.exists():
            raise RuntimeError(f"Missing profile file for {label}: {path}")
        actual = sha256(path)
        if actual != expected_hash.lower():
            raise RuntimeError(
                f"Profile hash changed for {label}: expected {expected_hash}, got {actual}"
            )
        checks.append({"label": label, "path": str(path), "sha256": actual})

    source_module = profile["sourceModule"]
    check(source_module["path"], source_module["sha256"], "source-module")
    for hak in source_module["orderedHaks"]:
        check(hak["path"], hak["sha256"], f"ordered-hak:{hak['index']}:{hak['name']}")
    check(profile["target"]["utpPath"], profile["target"]["utpSha256"], "target-utp")
    check(
        profile["sourceActor"]["bicPath"],
        profile["sourceActor"]["bicSha256"],
        "source-bic",
    )
    check(
        profile["runtime"]["executablePath"],
        profile["runtime"]["executableSha256"],
        "nwn-executable",
    )
    if profile["runtime"]["effect"] != {
        "table": "visualeffects.2da",
        "rowId": 50,
        "label": "VFX_IMP_DEATH",
        "lifecycle": "fire-and-forget",
        "triggerCount": 1,
    }:
        raise RuntimeError("Runtime effect contract changed from the one-trigger row50 profile")
    return {"status": "pass", "checkCount": len(checks), "checks": checks}


def load_base_runner(profile: dict):
    os.environ["VFX_REQUIRE_CLEAN_NWN"] = "1"
    os.environ["VFX_CAPTURE_OFFSET_SECONDS"] = "0"
    os.environ["VFX_MAX_CAPTURE_SECONDS"] = "36"
    os.environ["VFX_FORCE_GAMEPLAY_SECONDS"] = "10"
    os.environ["VFX_NWN_WINDOW_PLACEMENT"] = "secondary"
    spec = importlib.util.spec_from_file_location("aurora_vfx_placeable_proof_base", BASE_RUNNER)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load proof base: {BASE_RUNNER}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.SOURCE_MODULE = Path(profile["sourceModule"]["path"])
    module.TEST_MODULE_NAME = TEST_MODULE_NAME
    module.TEST_MODULE = TEST_MODULE
    module.DEFAULT_BIC_RESREF = "codexvfxproofpc"
    exact_bic = Path(profile["sourceActor"]["bicPath"])
    module.latest_local_bic = lambda: exact_bic
    return module


def build_sources(run_id: str) -> tuple[str, str]:
    mark = f'''void main()
{{
    object oModule = GetModule();
    if (GetLocalInt(oModule, "AURORA_VFX_PLACEABLE_TRIGGERED"))
    {{
        return;
    }}

    object oTarget = GetObjectByTag("{TARGET_TAG}");
    if (!GetIsObjectValid(oTarget) || GetObjectType(oTarget) != OBJECT_TYPE_PLACEABLE)
    {{
        WriteTimestampedLogEntry("AURORA_VFX_PROOF_PRECONDITION_FAILED fixture={FIXTURE_ID} reason=placeable-target-missing run={run_id}");
        return;
    }}

    SetLocalInt(oModule, "AURORA_VFX_PLACEABLE_TRIGGERED", 1);
    WriteTimestampedLogEntry("{TRIGGER_MARKER} run={run_id}");
    SendMessageToPC(GetFirstPC(), "Aurora VFX proof: row 50 on exact placeable impact node");
    ApplyEffectToObject(
        DURATION_TYPE_INSTANT,
        EffectVisualEffect(VFX_IMP_DEATH),
        oTarget
    );
}}
'''
    entry = f'''void main()
{{
    object oModule = GetModule();
    object oPC = GetFirstPC();
    if (!GetIsObjectValid(oPC) || GetLocalInt(oModule, "AURORA_VFX_PLACEABLE_SCHEDULED"))
    {{
        return;
    }}

    SetLocalInt(oModule, "AURORA_VFX_PLACEABLE_SCHEDULED", 1);
    location lSource = Location(GetArea(oPC), Vector(12.5, 3.8, 0.0), 0.0);
    AssignCommand(oPC, ClearAllActions(TRUE));
    AssignCommand(oPC, ActionJumpToLocation(lSource));

    object oTarget = GetObjectByTag("{TARGET_TAG}");
    if (!GetIsObjectValid(oTarget))
    {{
        WriteTimestampedLogEntry("AURORA_VFX_PROOF_PRECONDITION_FAILED fixture={FIXTURE_ID} reason=placeable-create-failed run={run_id}");
        return;
    }}
    WriteTimestampedLogEntry("{TARGET_MARKER} run={run_id}");

    DelayCommand(0.5, AssignCommand(oPC, SetFacingPoint(GetPosition(oTarget))));
    AssignCommand(oPC, SetCameraFacing(90.0, 5.8, 55.0, CAMERA_TRANSITION_TYPE_SNAP));
    SetCameraHeight(oPC, 1.1);
    DelayCommand(1.0, AssignCommand(oPC, SetCameraFacing(90.0, 5.8, 55.0, CAMERA_TRANSITION_TYPE_SNAP)));
    DelayCommand(1.1, SetCameraHeight(oPC, 1.1));
    DelayCommand(18.0, ExecuteScript("{MARK_SCRIPT}", oModule));
}}
'''
    return mark, entry


def inject_target_placeable(base, module_info: dict) -> dict:
    module_path = Path(module_info["module"])
    erf = base.read_erf_entries(module_path.read_bytes(), module_path)
    target_entry = {
        "resref": TARGET_TEMPLATE,
        "type": RESOURCE_TYPE_UTP,
        "bytes": TARGET_UTP.read_bytes(),
    }
    erf["entries"] = [
        entry
        for entry in erf["entries"]
        if (entry["resref"], entry["type"]) != (TARGET_TEMPLATE, RESOURCE_TYPE_UTP)
    ]
    erf["entries"].append(target_entry)
    target_git_entry = next(
        (
            entry
            for entry in erf["entries"]
            if entry["resref"] == "enon_test_effect" and entry["type"] == 2023
        ),
        None,
    )
    source_git_entry = next(
        (
            entry
            for entry in erf["entries"]
            if entry["resref"] == "enon_bakery" and entry["type"] == 2023
        ),
        None,
    )
    if target_git_entry is None or source_git_entry is None:
        raise RuntimeError("Source or target GIT is missing for the saved placeable instance")
    target_git = base.parse_gff(target_git_entry["bytes"], "enon_test_effect.git")
    source_git = base.parse_gff(source_git_entry["bytes"], "enon_bakery.git")
    source_list = next(
        field
        for field in source_git["structs"][0]["fields"]
        if field["label"] == "Placeable List"
    )
    source_struct = next(
        source_git["structs"][index]
        for index in source_list["value"]
        if not any(
            field["typeId"] in (base.FIELD_TYPE["STRUCT"], base.FIELD_TYPE["LIST"])
            for field in source_git["structs"][index]["fields"]
        )
    )
    target_struct = deepcopy(source_struct)
    patch_saved_placeable_field(base, target_struct, "Tag", "CEXOSTRING", TARGET_TAG)
    patch_saved_placeable_field(base, target_struct, "TemplateResRef", "RESREF", TARGET_TEMPLATE)
    patch_saved_placeable_field(
        base, target_struct, "Appearance", "DWORD", TARGET_APPEARANCE_ROW
    )
    patch_saved_placeable_field(base, target_struct, "X", "FLOAT", 12.5)
    patch_saved_placeable_field(base, target_struct, "Y", "FLOAT", 6.8)
    patch_saved_placeable_field(base, target_struct, "Z", "FLOAT", 0.0)
    patch_saved_placeable_field(base, target_struct, "Bearing", "FLOAT", 3.1415927410125732)
    patch_saved_placeable_field(base, target_struct, "Static", "BYTE", 0)
    patch_saved_placeable_field(base, target_struct, "Useable", "BYTE", 0)
    patch_saved_placeable_field(base, target_struct, "Plot", "BYTE", 1)
    for field in target_struct["fields"]:
        if field["typeId"] == base.FIELD_TYPE["RESREF"] and field["label"].startswith("On"):
            field["value"] = ""
    target_list = next(
        field
        for field in target_git["structs"][0]["fields"]
        if field["label"] == "Placeable List"
    )
    if target_list["value"]:
        raise RuntimeError("The source target Area unexpectedly contains placeables")
    target_struct_index = len(target_git["structs"])
    target_git["structs"].append(target_struct)
    target_list["value"].append(target_struct_index)
    patched_git_bytes = base.build_gff(target_git)
    target_git_entry["bytes"] = patched_git_bytes
    readback_git = base.parse_gff(patched_git_bytes, "enon_test_effect.git-readback")
    readback_list = next(
        field
        for field in readback_git["structs"][0]["fields"]
        if field["label"] == "Placeable List"
    )
    if len(readback_list["value"]) != 1:
        raise RuntimeError("Saved target GIT placeable count did not read back as one")
    readback_struct = readback_git["structs"][readback_list["value"][0]]
    readback_fields = {field["label"]: field.get("value") for field in readback_struct["fields"]}
    expected_readback = {
        "Tag": TARGET_TAG,
        "TemplateResRef": TARGET_TEMPLATE,
        "Appearance": TARGET_APPEARANCE_ROW,
        "X": 12.5,
        "Y": 6.800000190734863,
        "Z": 0.0,
        "Static": 0,
    }
    for label, expected in expected_readback.items():
        if readback_fields.get(label) != expected:
            raise RuntimeError(
                f"Saved target GIT field {label} failed readback: "
                f"expected {expected}, got {readback_fields.get(label)}"
            )
    module_path.write_bytes(base.build_erf(erf))
    next_info = dict(module_info)
    next_info["moduleSha256"] = sha256(module_path)
    next_info["entryCount"] = len(erf["entries"])
    next_info["injected"] = sorted(set(module_info["injected"] + [TARGET_TEMPLATE]))
    next_info["targetUtp"] = {
        "resref": TARGET_TEMPLATE,
        "resourceType": RESOURCE_TYPE_UTP,
        "sourcePath": str(TARGET_UTP),
        "sha256": sha256(TARGET_UTP),
    }
    next_info["targetSavedGitInstance"] = {
        "areaResref": "enon_test_effect",
        "placeableCount": 1,
        "tag": TARGET_TAG,
        "templateResRef": TARGET_TEMPLATE,
        "appearanceRowId": TARGET_APPEARANCE_ROW,
        "positionAurora": [12.5, 6.8, 0.0],
        "gitSha256": hashlib.sha256(patched_git_bytes).hexdigest(),
        "readback": expected_readback,
    }
    return next_info


def patch_saved_placeable_field(base, struct: dict, label: str, type_name: str, value) -> None:
    expected_type = base.FIELD_TYPE[type_name]
    field = next((item for item in struct["fields"] if item["label"] == label), None)
    if field is None:
        struct["fields"].append({"label": label, "typeId": expected_type, "value": value})
        return
    if field["typeId"] != expected_type:
        raise RuntimeError(
            f"Saved placeable template field {label} has type {field['typeId']}, expected {expected_type}"
        )
    field["value"] = value


def read_new_marker_lines(before_size: int, marker: str) -> list[str]:
    if not CLIENT_LOG.exists():
        return []
    current_size = CLIENT_LOG.stat().st_size
    with CLIENT_LOG.open("rb") as stream:
        stream.seek(before_size if current_size >= before_size else 0)
        text = stream.read().decode("utf-8", errors="replace")
    logical_lines = []
    for physical_line in text.splitlines():
        line = physical_line.strip()
        if not line:
            continue
        if line.startswith("[") or not logical_lines:
            logical_lines.append(line)
        else:
            logical_lines[-1] += line
    return [line for line in logical_lines if marker in line]


def main() -> None:
    if not BASE_RUNNER.exists() or not PROFILE_PATH.exists() or not TARGET_UTP.exists():
        raise RuntimeError("NWN placeable proof prerequisites are incomplete")

    existing_mp4s = sorted(EVIDENCE_ROOT.glob("**/*.mp4"))
    if existing_mp4s and os.environ.get("VFX_EXPLICIT_RECAPTURE_APPROVED") != "1":
        existing = "\n".join(f"- {path}" for path in existing_mp4s)
        raise RuntimeError(
            "An NWN placeable oracle already exists. Reuse it instead of launching NWN again. "
            "A recapture requires explicit user approval and VFX_EXPLICIT_RECAPTURE_APPROVED=1.\n"
            f"{existing}"
        )

    profile = load_profile()
    profile_validation = validate_profile_files(profile)
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    output_dir = EVIDENCE_ROOT / f"run-{run_id}"
    source_dir = output_dir / "scripts"
    source_dir.mkdir(parents=True, exist_ok=False)
    log_size_before = CLIENT_LOG.stat().st_size if CLIENT_LOG.exists() else 0

    base = load_base_runner(profile)
    base.SCRIPT_DIR = source_dir
    base.OUTPUT_DIR = output_dir
    base.MARK_SCRIPT = MARK_SCRIPT
    base.ON_ENTER_SCRIPT = ENTRY_SCRIPT

    mark_text, entry_text = build_sources(run_id)
    mark_path = source_dir / f"{MARK_SCRIPT}.nss"
    entry_path = source_dir / f"{ENTRY_SCRIPT}.nss"
    mark_path.write_text(mark_text, encoding="ascii")
    entry_path.write_text(entry_text, encoding="ascii")
    compiled = [base.compile_script(mark_path), base.compile_script(entry_path)]
    module_info = inject_target_placeable(
        base,
        base.prepare_module(
            compiled,
            real_aurora=False,
            custom_runtime=False,
            custom_hak=False,
        ),
    )

    preflight = {
        "version": "aurora-vfx-placeable-object-attachment-live-preflight/v1",
        "fixtureId": FIXTURE_ID,
        "runId": run_id,
        "status": "ready",
        "attemptCount": 1,
        "automaticRetry": False,
        "profile": {"path": str(PROFILE_PATH), "sha256": sha256(PROFILE_PATH)},
        "profileValidation": profile_validation,
        "preparedModule": module_info,
        "scripts": {
            MARK_SCRIPT: {"path": str(mark_path), "sha256": sha256(mark_path)},
            ENTRY_SCRIPT: {"path": str(entry_path), "sha256": sha256(entry_path)},
        },
        "target": profile["target"],
        "effect": profile["runtime"]["effect"],
        "capture": {
            "maxSeconds": 36,
            "fps": 12,
            "triggerDelaySeconds": 18,
            "intentionalTriggerCount": 1,
            "overlapAllowed": False,
        },
    }
    preflight_path = output_dir / "preflight.json"
    preflight_path.write_text(json.dumps(preflight, indent=2), encoding="utf-8")
    if os.environ.get("VFX_PREFLIGHT_ONLY") == "1":
        print(
            json.dumps(
                {
                    "status": "offline-live-preflight-ready",
                    "runId": run_id,
                    "preflight": str(preflight_path),
                    "preparedModule": module_info,
                },
                indent=2,
            ),
            flush=True,
        )
        return

    runtime = None
    error = None
    try:
        runtime = base.capture_runtime(
            keep_open=False,
            module_name=module_info["moduleName"],
            output_dir=output_dir,
            artifact_prefix="nwn-row50-placeable-one-trigger",
        )
    except Exception as exc:
        error = f"{type(exc).__name__}: {exc}"

    trigger_lines = read_new_marker_lines(log_size_before, TRIGGER_MARKER)
    target_lines = read_new_marker_lines(log_size_before, TARGET_MARKER)
    ledger = {
        "version": "aurora-vfx-placeable-trigger-ledger/v1",
        "fixtureId": FIXTURE_ID,
        "runId": run_id,
        "intentionalTriggerCount": 1,
        "observedTriggerLogCount": len(trigger_lines),
        "observedTargetCreationLogCount": len(target_lines),
        "validSingleTrigger": len(trigger_lines) == 1,
        "validSingleTargetCreation": len(target_lines) == 1,
        "triggerLogLines": trigger_lines,
        "targetLogLines": target_lines,
        "automaticRetry": False,
        "loop": False,
        "targetTag": TARGET_TAG,
        "targetTemplate": TARGET_TEMPLATE,
        "targetAppearanceRowId": TARGET_APPEARANCE_ROW,
        "targetModel": TARGET_MODEL,
        "targetImpactNode": TARGET_IMPACT_NODE,
    }
    ledger_path = output_dir / "trigger-ledger.json"
    ledger_path.write_text(json.dumps(ledger, indent=2), encoding="utf-8")

    media = []
    for path in sorted(output_dir.glob("nwn-row50-placeable-one-trigger*")):
        if path.is_file():
            media.append(
                {
                    "path": str(path),
                    "sha256": sha256(path),
                    "sizeBytes": path.stat().st_size,
                }
            )
    valid = (
        error is None
        and ledger["validSingleTrigger"]
        and ledger["validSingleTargetCreation"]
        and any(item["path"].lower().endswith(".mp4") for item in media)
    )
    summary = {
        "version": "aurora-vfx-nwn-placeable-object-attachment-proof/v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "fixtureId": FIXTURE_ID,
        "runId": run_id,
        "status": "capture-recorded-pending-visual-validation" if valid else "invalid-capture",
        "proofCompleteness": "missing",
        "modelVisibility": "not_tested",
        "attemptCountThisRun": 1,
        "automaticRetry": False,
        "error": error,
        "preflight": str(preflight_path),
        "triggerLedger": str(ledger_path),
        "module": module_info,
        "runtime": runtime,
        "media": media,
    }
    summary_path = output_dir / "summary.json"
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps({**summary, "summary": str(summary_path)}, indent=2), flush=True)
    if not valid:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
