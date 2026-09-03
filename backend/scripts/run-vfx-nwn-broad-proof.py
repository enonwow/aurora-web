from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
import subprocess
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import cv2


REPO_ROOT = Path(__file__).resolve().parents[2]
BASE_RUNNER = Path(r"C:\Projects\nwn\VFX\scripts\source-scripts\run-skrytobojca-mark-nwn-proof.py")
NWN_USER_DIR = Path.home() / "Documents" / "Neverwinter Nights"
MODULES_DIR = NWN_USER_DIR / "modules"
SOURCE_MODULE = MODULES_DIR / "tlc_vfx_catalog_lab_iter1.mod"
NWN_EXE = Path(r"C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwmain.exe")
CLIENT_LOG = NWN_USER_DIR / "logs" / "nwclientLog1.txt"
EVIDENCE_ROOT = REPO_ROOT / "backend" / "docs" / "aurora-reverse" / "evidence" / "vfx-nwn-broad-proof-2026-07-16"
PREFLIGHT_ROOT = REPO_ROOT / ".codex-tmp" / "vfx-nwn-broad-proof-preflight"
USER_APPROVAL = "2026-07-16 user request: teraz zrob dla nich proof w nwn"


@dataclass(frozen=True)
class FixtureSpec:
    slug: str
    fixture_id: str
    source_table: str
    source_row: int
    source_label: str
    lifecycle: str
    duration_seconds: float
    mark_script: str
    entry_script: str
    module_name: str
    artifact_prefix: str
    invocation: str
    target_ref: str
    camera_facing: float
    camera_distance: float
    camera_pitch: float
    camera_height: float
    capture_seconds: float
    previous_invalid_capture: str | None = None


FIXTURES = {
    spec.slug: spec
    for spec in [
        FixtureSpec("row44", "vfx-nwn-broad-row44", "visualeffects.2da", 44, "VFX_IMP_ACID_S", "fire-and-forget", 0.0, "vb44shot", "vb44entry", "codex_vb_row44", "nwn-row44-one-trigger-approved-recapture", "ApplyEffectAtLocation(DURATION_TYPE_INSTANT, EffectVisualEffect(VFX_IMP_ACID_S), GetLocation(oTarget));", "effect_test-location", 180.0, 5.5, 45.0, 1.1, 31.0, "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row44/nwn/nwn-row44-one-trigger.mp4"),
        FixtureSpec("row50", "vfx-nwn-broad-row50", "visualeffects.2da", 50, "VFX_IMP_DEATH", "fire-and-forget", 0.0, "vb50shot", "vb50entry", "codex_vb_row50", "nwn-row50-one-trigger-approved-recapture", "ApplyEffectToObject(DURATION_TYPE_INSTANT, EffectVisualEffect(VFX_IMP_DEATH), oTarget);", "effect_test", 90.0, 5.8, 55.0, 1.1, 32.0, ".codex-tmp/aurora-live-evidence/vfx-one-trigger/vfx-retail-scripted-effectvisualeffect-row-50-*/nwn-row50-one-trigger.mp4"),
        FixtureSpec("row210", "vfx-nwn-broad-row210", "visualeffects.2da", 210, "VFX_BEAM_FIRE", "duration", 20.0, "vb210shot", "vb210entry", "codex_vb_r210", "nwn-row210-one-trigger", "ApplyEffectToObject(DURATION_TYPE_TEMPORARY, EffectBeam(VFX_BEAM_FIRE, oSource, BODY_NODE_CHEST), oTarget, 20.0);", "first-pc-to-effect_test", 90.0, 6.0, 60.0, 1.1, 49.0),
        FixtureSpec("row216", "vfx-nwn-broad-row216", "visualeffects.2da", 216, "VFX_BEAM_FIRE_LASH", "duration", 20.0, "vb216shot", "vb216entry", "codex_vb_r216", "nwn-row216-one-trigger", "ApplyEffectToObject(DURATION_TYPE_TEMPORARY, EffectBeam(VFX_BEAM_FIRE_LASH, oSource, BODY_NODE_CHEST), oTarget, 20.0);", "first-pc-to-effect_test", 90.0, 6.0, 60.0, 1.1, 49.0),
        FixtureSpec("row181", "vfx-nwn-broad-row181", "visualeffects.2da", 181, "VFX_IMP_MIRV", "fire-and-forget", 0.0, "vb181shot", "vb181entry", "codex_vb_r181b", "nwn-row181-one-trigger-approved-recapture", "AssignCommand(oSource, ApplyEffectToObject(DURATION_TYPE_INSTANT, EffectVisualEffect(VFX_IMP_MIRV), oTarget));", "first-pc-to-effect_test", 90.0, 5.8, 55.0, 1.1, 34.0, "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row181/nwn/nwn-row181-one-trigger.mp4"),
        FixtureSpec("row1", "vfx-nwn-broad-row1", "visualeffects.2da", 1, "VFX_DUR_DARKNESS", "duration", 20.0, "vb1shot", "vb1entry", "codex_vb_row1", "nwn-row1-one-trigger", "ApplyEffectToObject(DURATION_TYPE_TEMPORARY, EffectVisualEffect(VFX_DUR_DARKNESS), oTarget, 20.0);", "effect_test", 90.0, 5.8, 55.0, 1.1, 49.0),
        FixtureSpec("aoe0", "vfx-nwn-broad-aoe0", "vfx_persistent.2da", 0, "VFX_PER_FOGACID", "duration", 20.0, "vba0shot", "vba0entry", "codex_vb_aoe0", "nwn-aoe0-one-trigger", "ApplyEffectAtLocation(DURATION_TYPE_TEMPORARY, EffectAreaOfEffect(AOE_PER_FOGACID), GetLocation(oTarget), 20.0);", "effect_test-location", 180.0, 6.0, 48.0, 1.2, 49.0),
    ]
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().lower()


def retime_capture_to_wall_clock(video_path: Path, runtime: dict, capture_end_seconds: float) -> dict:
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise RuntimeError(f"Could not open captured MP4 for wall-clock retiming: {video_path}")
    source_fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    first_gameplay = float(runtime["firstGameplay"])
    wall_clock_span = capture_end_seconds - first_gameplay
    if frame_count < 2 or width <= 0 or height <= 0 or wall_clock_span <= 0:
        capture.release()
        raise RuntimeError("Captured MP4 metadata cannot establish a wall-clock timeline")

    wall_clock_fps = (frame_count - 1) / wall_clock_span
    temp_path = video_path.with_name(f".{video_path.stem}.wall-clock.mp4")
    writer = cv2.VideoWriter(
        str(temp_path),
        cv2.VideoWriter_fourcc(*"mp4v"),
        wall_clock_fps,
        (width, height),
    )
    if not writer.isOpened():
        capture.release()
        raise RuntimeError(f"Could not open wall-clock MP4 writer: {temp_path}")
    written = 0
    try:
        while True:
            ok, frame = capture.read()
            if not ok:
                break
            writer.write(frame)
            written += 1
    finally:
        capture.release()
        writer.release()
    if written != frame_count:
        temp_path.unlink(missing_ok=True)
        raise RuntimeError(f"Wall-clock MP4 rewrite lost frames: expected {frame_count}, wrote {written}")
    raw_dir = video_path.parent / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    raw_path = raw_dir / video_path.name
    if raw_path.exists():
        temp_path.unlink(missing_ok=True)
        raise RuntimeError(f"Raw capture already exists and will not be overwritten: {raw_path}")
    os.replace(video_path, raw_path)
    try:
        os.replace(temp_path, video_path)
    except Exception:
        os.replace(raw_path, video_path)
        raise
    return {
        "method": "frame-preserving-fps-retime",
        "sourceFps": source_fps,
        "wallClockFps": wall_clock_fps,
        "frameCount": frame_count,
        "captureStartProcessSeconds": first_gameplay,
        "captureEndProcessSeconds": capture_end_seconds,
        "wallClockDurationSeconds": wall_clock_span,
        "rawVideo": {"path": str(raw_path), "sha256": sha256(raw_path), "sizeBytes": raw_path.stat().st_size},
        "retimedVideo": {"path": str(video_path), "sha256": sha256(video_path), "sizeBytes": video_path.stat().st_size},
        "vfxRetriggered": False,
    }


def retime_existing_capture(spec: FixtureSpec) -> None:
    output_dir = EVIDENCE_ROOT / spec.slug / "nwn"
    summary_path = output_dir / "summary.json"
    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    runtime = summary.get("runtime")
    if not isinstance(runtime, dict):
        raise RuntimeError(f"Missing runtime metadata in {summary_path}")
    if runtime.get("wallClockRetiming"):
        raise RuntimeError(f"Capture is already wall-clock retimed: {summary_path}")
    video_path = Path(runtime["video"])
    runtime["wallClockRetiming"] = retime_capture_to_wall_clock(video_path, runtime, spec.capture_seconds)
    summary["generatedAt"] = datetime.now(timezone.utc).isoformat()
    summary["postProcessing"] = {
        "wallClockRetimedAt": summary["generatedAt"],
        "vfxRetriggered": False,
        "captureAttemptCountUnchanged": True,
    }
    for media in summary.get("media", []):
        path = Path(media["path"])
        if path == video_path:
            media["sha256"] = sha256(path)
            media["sizeBytes"] = path.stat().st_size
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps({
        "status": "existing-single-trigger-capture-retimed-without-retrigger",
        "fixtureId": spec.fixture_id,
        "video": str(video_path),
        "wallClockRetiming": runtime["wallClockRetiming"],
        "summary": str(summary_path),
    }, indent=2), flush=True)


def load_base_runner(spec: FixtureSpec, script_dir: Path):
    os.environ["VFX_REQUIRE_CLEAN_NWN"] = "1"
    os.environ["VFX_CAPTURE_OFFSET_SECONDS"] = "0"
    os.environ["VFX_FORCE_GAMEPLAY_SECONDS"] = "12"
    os.environ["VFX_MAX_CAPTURE_SECONDS"] = str(spec.capture_seconds)
    os.environ["VFX_NWN_WINDOW_PLACEMENT"] = "secondary"
    module_name = f"aurora_vfx_broad_{spec.slug}_{time.time_ns()}"
    module_spec = importlib.util.spec_from_file_location(module_name, BASE_RUNNER)
    if module_spec is None or module_spec.loader is None:
        raise RuntimeError(f"Could not load proof base: {BASE_RUNNER}")
    module = importlib.util.module_from_spec(module_spec)
    module_spec.loader.exec_module(module)
    module.SOURCE_MODULE = SOURCE_MODULE
    module.TEST_MODULE_NAME = spec.module_name
    module.TEST_MODULE = MODULES_DIR / f"{spec.module_name}.mod"
    module.SCRIPT_DIR = script_dir
    module.MARK_SCRIPT = spec.mark_script
    module.ON_ENTER_SCRIPT = spec.entry_script
    module.DEFAULT_BIC_RESREF = "codexvfxproofpc"
    return module


def build_sources(spec: FixtureSpec, run_id: str) -> tuple[str, str]:
    marker = trigger_marker(spec, run_id)
    end_marker = expected_end_marker(spec, run_id)
    duration_log = (
        f'    DelayCommand({spec.duration_seconds:.1f}, WriteTimestampedLogEntry("{end_marker}"));\n'
        if spec.duration_seconds > 0
        else ""
    )
    mark = f'''void main()
{{
    object oModule = GetModule();
    if (GetLocalInt(oModule, "AURORA_VFX_PROOF_TRIGGERED"))
    {{
        return;
    }}

    object oSource = GetFirstPC();
    object oTarget = GetObjectByTag("effect_test");
    if (!GetIsObjectValid(oTarget))
    {{
        oTarget = GetNearestObject(OBJECT_TYPE_CREATURE, oSource, 1);
    }}
    if (!GetIsObjectValid(oSource) || !GetIsObjectValid(oTarget) || oSource == oTarget)
    {{
        WriteTimestampedLogEntry("AURORA_VFX_PROOF_PRECONDITION_FAILED fixture={spec.fixture_id} run={run_id}");
        return;
    }}

    SetLocalInt(oModule, "AURORA_VFX_PROOF_TRIGGERED", 1);
    AssignCommand(oSource, SetFacingPoint(GetPosition(oTarget)));
    AssignCommand(oTarget, SetFacingPoint(GetPosition(oSource)));
    WriteTimestampedLogEntry("{marker}");
    {spec.invocation}
{duration_log}}}
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
    AssignCommand(oPC, SetCameraFacing({spec.camera_facing:.1f}, {spec.camera_distance:.1f}, {spec.camera_pitch:.1f}, CAMERA_TRANSITION_TYPE_SNAP));
    SetCameraHeight(oPC, {spec.camera_height:.1f});
    DelayCommand(1.0, AssignCommand(oPC, SetCameraFacing({spec.camera_facing:.1f}, {spec.camera_distance:.1f}, {spec.camera_pitch:.1f}, CAMERA_TRANSITION_TYPE_SNAP)));
    DelayCommand(1.1, SetCameraHeight(oPC, {spec.camera_height:.1f}));
    DelayCommand(18.0, ExecuteScript("{spec.mark_script}", oModule));
}}
'''
    return mark, entry


def trigger_marker(spec: FixtureSpec, run_id: str) -> str:
    return f"AURORA_VFX_PROOF_TRIGGER fixture={spec.fixture_id} row={spec.source_row} count=1 run={run_id}"


def expected_end_marker(spec: FixtureSpec, run_id: str) -> str:
    return f"AURORA_VFX_PROOF_EXPECTED_END fixture={spec.fixture_id} duration={spec.duration_seconds:.1f} run={run_id}"


def write_and_compile(spec: FixtureSpec, run_id: str, script_dir: Path):
    script_dir.mkdir(parents=True, exist_ok=True)
    base = load_base_runner(spec, script_dir)
    mark_text, entry_text = build_sources(spec, run_id)
    mark_path = script_dir / f"{spec.mark_script}.nss"
    entry_path = script_dir / f"{spec.entry_script}.nss"
    mark_path.write_text(mark_text, encoding="ascii")
    entry_path.write_text(entry_text, encoding="ascii")
    compiled = [base.compile_script(mark_path), base.compile_script(entry_path)]
    return base, mark_path, entry_path, compiled


def validate_all() -> None:
    if not BASE_RUNNER.exists() or not SOURCE_MODULE.exists() or not NWN_EXE.exists():
        raise RuntimeError("NWN broad-proof prerequisites are incomplete")
    results = []
    for spec in FIXTURES.values():
        source_manifest = EVIDENCE_ROOT / spec.slug / "source-manifest.json"
        if not source_manifest.exists():
            raise RuntimeError(f"Missing Aurora-first source manifest: {source_manifest}")
        script_dir = PREFLIGHT_ROOT / spec.slug
        _, mark_path, entry_path, compiled = write_and_compile(spec, "PREFLIGHT_NO_TRIGGER", script_dir)
        results.append({
            "fixtureId": spec.fixture_id,
            "sourceManifest": str(source_manifest),
            "scripts": [str(mark_path), str(entry_path)],
            "compiled": [str(path) for path in compiled],
            "triggered": False,
        })
    output = {
        "version": "aurora-vfx-nwn-broad-preflight/v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "status": "ready-no-nwn-launched-no-vfx-triggered",
        "fixtureCount": len(results),
        "fixtures": results,
    }
    PREFLIGHT_ROOT.mkdir(parents=True, exist_ok=True)
    path = PREFLIGHT_ROOT / "preflight-all.json"
    path.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(json.dumps({**output, "path": str(path)}, indent=2), flush=True)


def read_run_log_lines(marker: str) -> list[str]:
    if not CLIENT_LOG.exists():
        return []
    text = CLIENT_LOG.read_text(encoding="utf-8", errors="replace")
    return [line.strip() for line in text.splitlines() if marker in line]


def select_output_dir(spec: FixtureSpec, approved_recapture: bool) -> Path:
    primary = EVIDENCE_ROOT / spec.slug / "nwn"
    existing = sorted(primary.glob("*.mp4")) if primary.exists() else []
    if not existing:
        return primary
    validation_path = primary / "validated-summary.json"
    validation = json.loads(validation_path.read_text(encoding="utf-8")) if validation_path.exists() else {}
    if approved_recapture and validation.get("status") == "invalid-nwn-oracle":
        recapture = EVIDENCE_ROOT / spec.slug / "nwn-recapture-2"
        recapture_existing = sorted(recapture.glob("*.mp4")) if recapture.exists() else []
        if recapture_existing:
            raise RuntimeError("Approved recapture MP4 already exists; reuse it: " + ", ".join(map(str, recapture_existing)))
        return recapture
    raise RuntimeError("Broad-proof MP4 already exists; reuse it: " + ", ".join(map(str, existing)))


def run_fixture(spec: FixtureSpec, approved_recapture: bool, approval_text: str | None) -> None:
    if spec.previous_invalid_capture and not approved_recapture:
        raise RuntimeError(
            f"{spec.slug} has previous invalid capture evidence. This run requires --approved-recapture."
        )
    if approved_recapture and not approval_text:
        raise RuntimeError("--approval-text is required for an approved recapture")
    output_dir = select_output_dir(spec, approved_recapture)
    source_manifest = EVIDENCE_ROOT / spec.slug / "source-manifest.json"
    if not source_manifest.exists():
        raise RuntimeError(f"Missing Aurora-first source manifest: {source_manifest}")
    if subprocess.run(
        ["powershell", "-NoProfile", "-Command", "@(Get-Process nwmain -ErrorAction SilentlyContinue).Count"],
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip() != "0":
        raise RuntimeError("Refusing to prepare proof while nwmain.exe is running")

    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    script_dir = output_dir / "scripts"
    base, mark_path, entry_path, compiled = write_and_compile(spec, run_id, script_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    preflight = {
        "version": "aurora-vfx-nwn-broad-fixture-preflight/v1",
        "fixtureId": spec.fixture_id,
        "runId": run_id,
        "attemptCountThisApprovedRun": 1,
        "automaticRetry": False,
        "lifecycle": spec.lifecycle,
        "intentionalTriggerCount": 1,
        "source": {
            "table": spec.source_table,
            "rowId": spec.source_row,
            "label": spec.source_label,
            "manifest": str(source_manifest),
            "manifestSha256": sha256(source_manifest),
        },
        "effectContext": {
            "rawInvocation": spec.invocation,
            "targetRef": spec.target_ref,
            "durationSeconds": spec.duration_seconds,
        },
        "timing": {
            "triggerDelayAfterValidPcSeconds": 18.0,
            "forcedGameplayDetectionSeconds": 12.0,
            "captureOffsetSeconds": 0.0,
            "captureMaxSeconds": spec.capture_seconds,
            "captureFps": 12.0,
        },
        "recapture": {
            "approved": approved_recapture,
            "approval": approval_text if approved_recapture else None,
            "previousInvalidCapture": spec.previous_invalid_capture,
        },
        "scripts": {
            spec.mark_script: {"path": str(mark_path), "sha256": sha256(mark_path)},
            spec.entry_script: {"path": str(entry_path), "sha256": sha256(entry_path)},
        },
        "sourceModule": {"path": str(SOURCE_MODULE), "sha256": sha256(SOURCE_MODULE)},
        "nwnExecutable": {"path": str(NWN_EXE), "sha256": sha256(NWN_EXE)},
    }
    (output_dir / "preflight.json").write_text(json.dumps(preflight, indent=2), encoding="utf-8")
    module_info = base.prepare_module(compiled, real_aurora=False, custom_runtime=False, custom_hak=False)

    runtime = None
    error = None
    try:
        runtime = base.capture_runtime(
            keep_open=False,
            module_name=module_info["moduleName"],
            output_dir=output_dir,
            artifact_prefix=spec.artifact_prefix,
        )
        video_path = Path(runtime["video"])
        runtime["wallClockRetiming"] = retime_capture_to_wall_clock(
            video_path,
            runtime,
            spec.capture_seconds,
        )
    except Exception as exc:
        error = f"{type(exc).__name__}: {exc}"

    time.sleep(1.0)
    trigger_lines = read_run_log_lines(trigger_marker(spec, run_id))
    end_lines = read_run_log_lines(expected_end_marker(spec, run_id)) if spec.duration_seconds > 0 else []
    ledger = {
        "version": "aurora-vfx-trigger-ledger/v1",
        "fixtureId": spec.fixture_id,
        "runId": run_id,
        "intentionalTriggerCount": 1,
        "observedTriggerLogCount": len(trigger_lines),
        "validSingleTrigger": len(trigger_lines) == 1,
        "triggerLogLines": trigger_lines,
        "expectedEndLogCount": len(end_lines),
        "expectedEndLogLines": end_lines,
        "scriptIdentity": spec.mark_script,
        "sourceRowId": spec.source_row,
        "sourceLabel": spec.source_label,
        "durationSeconds": spec.duration_seconds,
        "targetRef": spec.target_ref,
    }
    ledger_path = output_dir / "trigger-ledger.json"
    ledger_path.write_text(json.dumps(ledger, indent=2), encoding="utf-8")
    media = [
        {"path": str(path), "sha256": sha256(path), "sizeBytes": path.stat().st_size}
        for path in sorted(output_dir.glob(f"{spec.artifact_prefix}*"))
        if path.is_file()
    ]
    has_mp4 = any(item["path"].lower().endswith(".mp4") for item in media)
    status = (
        "nwn-capture-recorded-pending-visual-validation"
        if error is None and ledger["validSingleTrigger"] and has_mp4
        else "invalid-capture-no-automatic-retry"
    )
    summary = {
        "version": "aurora-vfx-nwn-broad-proof/v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "fixtureId": spec.fixture_id,
        "runId": run_id,
        "status": status,
        "attemptCountThisApprovedRun": 1,
        "automaticRetry": False,
        "error": error,
        "preflight": str(output_dir / "preflight.json"),
        "triggerLedger": str(ledger_path),
        "module": module_info,
        "runtime": runtime,
        "media": media,
    }
    summary_path = output_dir / "summary.json"
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps({**summary, "summary": str(summary_path)}, indent=2), flush=True)
    if status.startswith("invalid"):
        raise SystemExit(2)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixture", choices=sorted(FIXTURES))
    parser.add_argument("--validate-all", action="store_true")
    parser.add_argument("--approved-recapture", action="store_true")
    parser.add_argument("--approval-text")
    parser.add_argument("--retime-existing", choices=sorted(FIXTURES))
    args = parser.parse_args()
    if args.validate_all:
        validate_all()
        return
    if args.retime_existing:
        retime_existing_capture(FIXTURES[args.retime_existing])
        return
    if not args.fixture:
        parser.error("--fixture is required unless --validate-all is used")
    run_fixture(FIXTURES[args.fixture], args.approved_recapture, args.approval_text)


if __name__ == "__main__":
    main()
