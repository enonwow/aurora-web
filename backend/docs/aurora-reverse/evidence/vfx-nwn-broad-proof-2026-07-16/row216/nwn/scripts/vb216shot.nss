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
        WriteTimestampedLogEntry("AURORA_VFX_PROOF_PRECONDITION_FAILED fixture=vfx-nwn-broad-row216 run=20260716T155017Z");
        return;
    }

    SetLocalInt(oModule, "AURORA_VFX_PROOF_TRIGGERED", 1);
    AssignCommand(oSource, SetFacingPoint(GetPosition(oTarget)));
    AssignCommand(oTarget, SetFacingPoint(GetPosition(oSource)));
    WriteTimestampedLogEntry("AURORA_VFX_PROOF_TRIGGER fixture=vfx-nwn-broad-row216 row=216 count=1 run=20260716T155017Z");
    ApplyEffectToObject(DURATION_TYPE_TEMPORARY, EffectBeam(VFX_BEAM_FIRE_LASH, oSource, BODY_NODE_CHEST), oTarget, 20.0);
    DelayCommand(20.0, WriteTimestampedLogEntry("AURORA_VFX_PROOF_EXPECTED_END fixture=vfx-nwn-broad-row216 duration=20.0 run=20260716T155017Z"));
}
