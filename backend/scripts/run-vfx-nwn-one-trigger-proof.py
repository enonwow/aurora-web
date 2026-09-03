from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import shutil
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
VFX_ROOT = Path(r"C:\Projects\nwn\VFX")
BASE_RUNNER = VFX_ROOT / "scripts" / "source-scripts" / "run-skrytobojca-mark-nwn-proof.py"
NWN_USER_DIR = Path.home() / "Documents" / "Neverwinter Nights"
MODULES_DIR = NWN_USER_DIR / "modules"
SOURCE_MODULE = MODULES_DIR / "tlc_vfx_catalog_lab_iter1.mod"
TEST_MODULE_NAME = "codex_vfx_1shot"
TEST_MODULE = MODULES_DIR / f"{TEST_MODULE_NAME}.mod"
NWN_EXE = Path(
    r"C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwmain.exe"
)
CLIENT_LOG = NWN_USER_DIR / "logs" / "nwclientLog1.txt"
FIXTURE_ID = "vfx-retail-scripted-effectvisualeffect-row-50"
SOURCE_ROW = 50
SOURCE_LABEL = "VFX_IMP_DEATH"
SOURCE_TABLE_HASH = "ACEFE76F7FB14E88916AE1ADE40DD5108B8A2F601EAADA82A67F751B4EB56EA2"
MARK_SCRIPT = "vfx1shot"
ENTRY_SCRIPT = "vfx1entry"
TRIGGER_MARKER = f"AURORA_VFX_PROOF_TRIGGER fixture={FIXTURE_ID} row={SOURCE_ROW} count=1"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def load_base_runner():
    os.environ["VFX_REQUIRE_CLEAN_NWN"] = "1"
    os.environ["VFX_CAPTURE_OFFSET_SECONDS"] = "0"
    os.environ["VFX_MAX_CAPTURE_SECONDS"] = "70"
    os.environ["VFX_NWN_WINDOW_PLACEMENT"] = "secondary"
    spec = importlib.util.spec_from_file_location("aurora_vfx_proof_base", BASE_RUNNER)
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
    object oTarget = GetObjectByTag("vfx_retail_target");
    if (!GetIsObjectValid(oTarget))
    {{
        oTarget = GetFirstPC();
    }}
    if (!GetIsObjectValid(oTarget))
    {{
        return;
    }}

    WriteTimestampedLogEntry("{TRIGGER_MARKER} run={run_id}");
    SendMessageToPC(GetFirstPC(), "Aurora VFX proof: single trigger row 50");
    effect eVisual = EffectVisualEffect(VFX_IMP_DEATH);
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
    AssignCommand(oPC, SetCameraFacing(90.0, 5.0, 55.0, CAMERA_TRANSITION_TYPE_SNAP));
    DelayCommand(35.0, ExecuteScript("{MARK_SCRIPT}", oModule));
}}
'''
    return mark, entry


def read_new_trigger_lines(before_size: int) -> list[str]:
    if not CLIENT_LOG.exists():
        return []
    current_size = CLIENT_LOG.stat().st_size
    with CLIENT_LOG.open("rb") as stream:
        stream.seek(before_size if current_size >= before_size else 0)
        text = stream.read().decode("utf-8", errors="replace")
    return [line.strip() for line in text.splitlines() if TRIGGER_MARKER in line]


def main() -> None:
    if not BASE_RUNNER.exists() or not SOURCE_MODULE.exists() or not NWN_EXE.exists():
        raise RuntimeError("NWN proof prerequisites are incomplete")

    evidence_root = REPO_ROOT / ".codex-tmp" / "aurora-live-evidence" / "vfx-one-trigger"
    existing_mp4s = sorted(evidence_root.glob(f"{FIXTURE_ID}-*/nwn-row50-one-trigger.mp4"))
    if existing_mp4s and os.environ.get("VFX_EXPLICIT_RECAPTURE_APPROVED") != "1":
        existing = "\n".join(f"- {path}" for path in existing_mp4s)
        raise RuntimeError(
            "An NWN MP4 already exists for this fixture. Analyze the existing recording instead of "
            "launching NWN again. A new capture requires explicit user approval and "
            "VFX_EXPLICIT_RECAPTURE_APPROVED=1.\n"
            f"{existing}"
        )

    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    output_dir = (
        evidence_root
        / f"{FIXTURE_ID}-{run_id}"
    )
    source_dir = output_dir / "sources"
    source_dir.mkdir(parents=True, exist_ok=False)
    log_size_before = CLIENT_LOG.stat().st_size if CLIENT_LOG.exists() else 0

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
            "tableHash": SOURCE_TABLE_HASH,
            "rowId": SOURCE_ROW,
            "label": SOURCE_LABEL,
        },
        "effectContext": {
            "constructorKind": "EffectVisualEffect",
            "applicationMode": "object",
            "durationType": "instant",
            "durationSeconds": 0,
            "targetRef": "vfx_retail_target-or-first-pc",
        },
        "timing": {
            "triggerDelayAfterValidPcSeconds": 35.0,
            "captureMaxSeconds": 70.0,
            "captureFps": 12.0,
        },
        "scripts": {
            MARK_SCRIPT: {"path": str(mark_path), "sha256": sha256(mark_path)},
            ENTRY_SCRIPT: {"path": str(entry_path), "sha256": sha256(entry_path)},
        },
        "sourceModule": {"path": str(SOURCE_MODULE), "sha256": sha256(SOURCE_MODULE)},
        "nwnExecutable": {"path": str(NWN_EXE), "sha256": sha256(NWN_EXE)},
    }
    (output_dir / "preflight.json").write_text(json.dumps(preflight, indent=2), encoding="utf-8")

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
            artifact_prefix="nwn-row50-one-trigger",
        )
    except Exception as exc:
        error = f"{type(exc).__name__}: {exc}"

    trigger_lines = read_new_trigger_lines(log_size_before)
    media = []
    for path in sorted(output_dir.glob("nwn-row50-one-trigger*")):
        if path.is_file():
            media.append({"path": str(path), "sha256": sha256(path), "sizeBytes": path.stat().st_size})

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
        "targetRef": "vfx_retail_target-or-first-pc",
    }
    (output_dir / "trigger-ledger.json").write_text(json.dumps(ledger, indent=2), encoding="utf-8")

    summary = {
        "version": "aurora-vfx-nwn-one-trigger-proof/v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "fixtureId": FIXTURE_ID,
        "runId": run_id,
        "status": (
            "nwn-capture-recorded-pending-lifecycle-inspection"
            if error is None and ledger["validSingleTrigger"]
            else "invalid-capture"
        ),
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

    if summary["status"] == "invalid-capture":
        raise SystemExit(2)


if __name__ == "__main__":
    main()
