from __future__ import annotations

import importlib.util
import json
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
BASE_SCRIPT = REPO_ROOT / "backend" / "scripts" / "run-vfx-nwn-web-row68-proof.py"
FIXTURE_ROOT = (
    REPO_ROOT
    / "backend"
    / "docs"
    / "aurora-reverse"
    / "evidence"
    / "vfx-nwn-web-row22"
)


def load_base():
    spec = importlib.util.spec_from_file_location("aurora_vfx_row22_base", BASE_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load proof base: {BASE_SCRIPT}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def build_sources(run_id: str) -> tuple[str, str]:
    trigger_marker = (
        "AURORA_VFX_PROOF_TRIGGER fixture=vfx-nwn-web-row22 row=22 count=1"
    )
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

    WriteTimestampedLogEntry("{trigger_marker} run={run_id}");
    effect eVisual = EffectVisualEffect(VFX_FNF_FIREBALL);
    ApplyEffectAtLocation(DURATION_TYPE_INSTANT, eVisual, GetLocation(oTarget));
}}
'''
    entry = '''void main()
{
    object oModule = GetModule();
    object oPC = GetFirstPC();
    if (!GetIsObjectValid(oPC) || GetLocalInt(oModule, "AURORA_VFX_PROOF_SCHEDULED"))
    {
        return;
    }

    SetLocalInt(oModule, "AURORA_VFX_PROOF_SCHEDULED", 1);
    AssignCommand(oPC, SetCameraFacing(180.0, 7.0, 62.0, CAMERA_TRANSITION_TYPE_SNAP));
    DelayCommand(16.0, ExecuteScript("vfx22shot", oModule));
}
'''
    return mark, entry


def main() -> None:
    base = load_base()
    base.TEST_MODULE_NAME = "codex_vfx_row22"
    base.TEST_MODULE = base.MODULES_DIR / "codex_vfx_row22.mod"
    base.FIXTURE_ROOT = FIXTURE_ROOT
    base.SOURCE_REPORT = FIXTURE_ROOT / "source-preparation.json"
    base.SOURCE_MODEL = FIXTURE_ROOT / "sources" / "vff_explfire.mdl"
    base.FIXTURE_ID = "vfx-nwn-web-row22"
    base.SOURCE_ROW = 22
    base.SOURCE_LABEL = "VFX_FNF_FIREBALL"
    base.MARK_SCRIPT = "vfx22shot"
    base.ENTRY_SCRIPT = "vfx22entry"
    base.ARTIFACT_PREFIX = "nwn-row22-one-trigger"
    base.SOURCE_MODEL_RESREF = "vff_explfire"
    base.APPLICATION_MODE = "location"
    base.RAW_INVOCATION = (
        "ApplyEffectAtLocation(DURATION_TYPE_INSTANT, "
        "EffectVisualEffect(VFX_FNF_FIREBALL), first-pc-location)"
    )
    base.TRIGGER_MARKER = (
        "AURORA_VFX_PROOF_TRIGGER fixture=vfx-nwn-web-row22 row=22 count=1"
    )
    base.build_sources = build_sources

    output_dir = FIXTURE_ROOT / "nwn"
    if list(output_dir.glob("*.mp4")):
        raise RuntimeError(
            "An NWN MP4 already exists for row 22. Reuse it; this runner never recaptures."
        )
    preflight = {
        "version": "aurora-vfx-row22-runner-preflight/v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "fixtureId": base.FIXTURE_ID,
        "sourceRowId": base.SOURCE_ROW,
        "sourceLabel": base.SOURCE_LABEL,
        "sourceModelResref": "vff_explfire",
        "lifecycle": "fire-and-forget",
        "intentionalTriggerCount": 1,
        "automaticRetry": False,
        "nwnExistingMp4Count": 0,
        "rawInvocation": (
            "ApplyEffectAtLocation(DURATION_TYPE_INSTANT, "
            "EffectVisualEffect(VFX_FNF_FIREBALL), first-pc-location)"
        ),
    }
    FIXTURE_ROOT.mkdir(parents=True, exist_ok=True)
    (FIXTURE_ROOT / "row22-runner-preflight.json").write_text(
        json.dumps(preflight, indent=2), encoding="ascii"
    )
    base.main()


if __name__ == "__main__":
    main()
