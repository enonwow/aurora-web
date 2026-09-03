void main()
{
    object oModule = GetModule();
    if (GetLocalInt(oModule, "AURORA_VFX_PLACEABLE_TRIGGERED"))
    {
        return;
    }

    object oTarget = GetLocalObject(oModule, "AURORA_VFX_PLACEABLE_TARGET");
    if (!GetIsObjectValid(oTarget))
    {
        oTarget = GetObjectByTag("vfx_placeable_target");
    }
    if (!GetIsObjectValid(oTarget) || GetObjectType(oTarget) != OBJECT_TYPE_PLACEABLE)
    {
        WriteTimestampedLogEntry("AURORA_VFX_PROOF_PRECONDITION_FAILED fixture=vfx-broad-row50-placeable reason=placeable-target-missing run=20260813T154921Z");
        return;
    }

    SetLocalInt(oModule, "AURORA_VFX_PLACEABLE_TRIGGERED", 1);
    WriteTimestampedLogEntry("AURORA_VFX_PROOF_TRIGGER fixture=vfx-broad-row50-placeable row=50 count=1 run=20260813T154921Z");
    SendMessageToPC(GetFirstPC(), "Aurora VFX proof: row 50 on exact placeable impact node");
    ApplyEffectToObject(
        DURATION_TYPE_INSTANT,
        EffectVisualEffect(VFX_IMP_DEATH),
        oTarget
    );
}
