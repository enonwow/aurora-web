from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
VFX_ROOT = Path(r"C:\Projects\nwn\VFX")
BASE_RUNNER = VFX_ROOT / "scripts" / "source-scripts" / "run-skrytobojca-mark-nwn-proof.py"
NWN_USER_DIR = Path.home() / "Documents" / "Neverwinter Nights"
MODULES_DIR = NWN_USER_DIR / "modules"
SOURCE_MODULE = MODULES_DIR / "tlc_vfx_catalog_lab_iter1.mod"
TEST_MODULE_NAME = "codex_vfx_row68"
TEST_MODULE = MODULES_DIR / f"{TEST_MODULE_NAME}.mod"
NWN_EXE = Path(
    r"C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwmain.exe"
)
CLIENT_LOG = NWN_USER_DIR / "logs" / "nwclientLog1.txt"
FIXTURE_ROOT = (
    REPO_ROOT / "backend" / "docs" / "aurora-reverse" / "evidence" / "vfx-nwn-web-row68"
)
SOURCE_REPORT = FIXTURE_ROOT / "source-preparation.json"
SOURCE_MODEL = FIXTURE_ROOT / "sources" / "vim_heal04.mdl"
FIXTURE_ID = "vfx-nwn-web-row68"
SOURCE_ROW = 68
SOURCE_LABEL = "VFX_IMP_HEALING_M"
MARK_SCRIPT = "vfx68shot"
ENTRY_SCRIPT = "vfx68entry"
ARTIFACT_PREFIX = "nwn-row68-one-trigger"
SOURCE_MODEL_RESREF = "vim_heal04"
APPLICATION_MODE = "object"
RAW_INVOCATION = "ApplyEffectToObject(DURATION_TYPE_INSTANT, EffectVisualEffect(VFX_IMP_HEALING_M), first-pc)"
TRIGGER_DELAY_SECONDS = 16.0
CAPTURE_MAX_SECONDS = 27.0
TRIGGER_MARKER = f"AURORA_VFX_PROOF_TRIGGER fixture={FIXTURE_ID} row={SOURCE_ROW} count=1"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().lower()


def load_base_runner():
    os.environ["VFX_REQUIRE_CLEAN_NWN"] = "1"
    os.environ["VFX_CAPTURE_OFFSET_SECONDS"] = "0"
    os.environ["VFX_FORCE_GAMEPLAY_SECONDS"] = "12"
    os.environ["VFX_MAX_CAPTURE_SECONDS"] = str(CAPTURE_MAX_SECONDS)
    os.environ["VFX_NWN_WINDOW_PLACEMENT"] = "secondary"
    spec = importlib.util.spec_from_file_location("aurora_vfx_row68_base", BASE_RUNNER)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load proof base: {BASE_RUNNER}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def build_sources(run_id: str) -> tuple[str, str]:
    mark = f'''void main()
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
    effect eVisual = EffectVisualEffect(VFX_IMP_HEALING_M);
    ApplyEffectToObject(DURATION_TYPE_INSTANT, eVisual, oTarget);
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
    return mark, entry


def read_trigger_lines(run_id: str) -> list[str]:
    if not CLIENT_LOG.exists():
        return []
    marker = f"{TRIGGER_MARKER} run={run_id}"
    text = CLIENT_LOG.read_text(encoding="utf-8", errors="replace")
    return [line.strip() for line in text.splitlines() if marker in line]


def main() -> None:
    prerequisites = [BASE_RUNNER, SOURCE_MODULE, NWN_EXE, SOURCE_REPORT, SOURCE_MODEL]
    missing = [str(path) for path in prerequisites if not path.exists()]
    if missing:
        raise RuntimeError(f"NWN proof prerequisites are incomplete: {missing}")

    output_dir = FIXTURE_ROOT / "nwn"
    existing_mp4s = sorted(output_dir.glob("*.mp4"))
    if existing_mp4s:
        raise RuntimeError(
            "An NWN MP4 already exists for this fixture. Reuse it instead of launching NWN: "
            + ", ".join(str(path) for path in existing_mp4s)
        )
    if TEST_MODULE.exists():
        raise RuntimeError(
            f"Refusing to overwrite an existing proof module without inspection: {TEST_MODULE}"
        )

    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    output_dir.mkdir(parents=True, exist_ok=True)
    source_dir = output_dir / "scripts"
    source_dir.mkdir(parents=True, exist_ok=False)
    base = load_base_runner()
    base.SOURCE_MODULE = SOURCE_MODULE
    base.TEST_MODULE_NAME = TEST_MODULE_NAME
    base.TEST_MODULE = TEST_MODULE
    base.SCRIPT_DIR = source_dir
    base.OUTPUT_DIR = output_dir
    base.MARK_SCRIPT = MARK_SCRIPT
    base.ON_ENTER_SCRIPT = ENTRY_SCRIPT
    base.DEFAULT_BIC_RESREF = "codexvfxproofpc"

    mark_text, entry_text = build_sources(run_id)
    mark_path = source_dir / f"{MARK_SCRIPT}.nss"
    entry_path = source_dir / f"{ENTRY_SCRIPT}.nss"
    mark_path.write_text(mark_text, encoding="ascii")
    entry_path.write_text(entry_text, encoding="ascii")
    preflight = {
        "version": "aurora-vfx-one-trigger-preflight/v1",
        "fixtureId": FIXTURE_ID,
        "runId": run_id,
        "attemptCount": 1,
        "lifecycle": "fire-and-forget",
        "intentionalTriggerCount": 1,
        "source": {
            "table": "visualeffects.2da",
            "rowId": SOURCE_ROW,
            "label": SOURCE_LABEL,
            "modelResref": SOURCE_MODEL_RESREF,
        },
        "effectContext": {
            "constructorKind": "EffectVisualEffect",
            "applicationMode": APPLICATION_MODE,
            "durationType": "instant",
            "durationSeconds": 0,
            "targetRef": "first-pc",
            "rawInvocation": RAW_INVOCATION,
        },
        "timing": {
            "captureStartsAtGameplayDetection": True,
            "captureOffsetSeconds": 0,
            "forcedGameplayDetectionSeconds": 12,
            "triggerDelayAfterValidPcSeconds": TRIGGER_DELAY_SECONDS,
            "captureMaxSeconds": CAPTURE_MAX_SECONDS,
            "captureFps": 12.0,
        },
        "sourceModel": {"path": str(SOURCE_MODEL), "sha256": sha256(SOURCE_MODEL)},
        "sourcePreparation": {"path": str(SOURCE_REPORT), "sha256": sha256(SOURCE_REPORT)},
        "scripts": {
            MARK_SCRIPT: {"path": str(mark_path), "sha256": sha256(mark_path)},
            ENTRY_SCRIPT: {"path": str(entry_path), "sha256": sha256(entry_path)},
        },
        "sourceModule": {"path": str(SOURCE_MODULE), "sha256": sha256(SOURCE_MODULE)},
        "nwnExecutable": {"path": str(NWN_EXE), "sha256": sha256(NWN_EXE)},
    }
    (output_dir / "preflight.json").write_text(
        json.dumps(preflight, indent=2), encoding="utf-8"
    )

    compiled = [base.compile_script(mark_path), base.compile_script(entry_path)]
    module_info = base.prepare_module(
        compiled,
        real_aurora=False,
        custom_runtime=False,
        custom_hak=False,
    )

    runtime = None
    error = None
    try:
        runtime = base.capture_runtime(
            keep_open=False,
            module_name=module_info["moduleName"],
            output_dir=output_dir,
            artifact_prefix=ARTIFACT_PREFIX,
        )
    except Exception as exc:
        error = f"{type(exc).__name__}: {exc}"

    trigger_lines = []
    log_flush_deadline = time.monotonic() + 5.0
    while time.monotonic() < log_flush_deadline:
        trigger_lines = read_trigger_lines(run_id)
        if trigger_lines:
            break
        time.sleep(0.25)
    ledger = {
        "version": "aurora-vfx-trigger-ledger/v1",
        "fixtureId": FIXTURE_ID,
        "runId": run_id,
        "intentionalTriggerCount": 1,
        "observedTriggerLogCount": len(trigger_lines),
        "validSingleTrigger": len(trigger_lines) == 1,
        "triggerLogLines": trigger_lines,
        "scriptIdentity": MARK_SCRIPT,
        "sourceRowId": SOURCE_ROW,
        "sourceLabel": SOURCE_LABEL,
        "durationSeconds": 0,
        "targetRef": "first-pc",
    }
    (output_dir / "trigger-ledger.json").write_text(
        json.dumps(ledger, indent=2), encoding="utf-8"
    )
    media = [
        {"path": str(path), "sha256": sha256(path), "sizeBytes": path.stat().st_size}
        for path in sorted(output_dir.glob(f"{ARTIFACT_PREFIX}*"))
        if path.is_file()
    ]
    has_mp4 = any(item["path"].lower().endswith(".mp4") for item in media)
    status = (
        "nwn-capture-recorded-pending-lifecycle-inspection"
        if error is None and ledger["validSingleTrigger"] and has_mp4
        else "invalid-capture"
    )
    summary = {
        "version": "aurora-vfx-nwn-one-trigger-proof/v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "fixtureId": FIXTURE_ID,
        "runId": run_id,
        "status": status,
        "attemptCount": 1,
        "automaticRetry": False,
        "error": error,
        "preflight": str(output_dir / "preflight.json"),
        "triggerLedger": str(output_dir / "trigger-ledger.json"),
        "module": module_info,
        "runtime": runtime,
        "media": media,
    }
    summary_path = output_dir / "summary.json"
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps({**summary, "summary": str(summary_path)}, indent=2), flush=True)
    if status == "invalid-capture":
        raise SystemExit(2)


if __name__ == "__main__":
    main()
