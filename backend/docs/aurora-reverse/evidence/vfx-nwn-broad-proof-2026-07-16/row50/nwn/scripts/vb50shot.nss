void main()
{
    object oModule = GetModule();
    if (GetLocalInt(oModule, "AURORA_VFX_PROOF_TRIGGERED"))
    {
        return;
    }

    object oSource = GetFirstPC();
    object oTarget = GetObjectByTag("effect_test");
    if (!GetIsObjectValid(oTarget))
    {
        oTarget = GetNearestObject(OBJECT_TYPE_CREATURE, oSource, 1);
    }
    if (!GetIsObjectValid(oSource) || !GetIsObjectValid(oTarget) || oSource == oTarget)
    {
        WriteTimestampedLogEntry("AURORA_VFX_PROOF_PRECONDITION_FAILED fixture=vfx-nwn-broad-row50 run=20260716T154559Z");
        return;
    }

    SetLocalInt(oModule, "AURORA_VFX_PROOF_TRIGGERED", 1);
    AssignCommand(oSource, SetFacingPoint(GetPosition(oTarget)));
    AssignCommand(oTarget, SetFacingPoint(GetPosition(oSource)));
    WriteTimestampedLogEntry("AURORA_VFX_PROOF_TRIGGER fixture=vfx-nwn-broad-row50 row=50 count=1 run=20260716T154559Z");
    ApplyEffectToObject(DURATION_TYPE_INSTANT, EffectVisualEffect(VFX_IMP_DEATH), oTarget);
}
