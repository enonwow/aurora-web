void main()
{
    object oModule = GetModule();
    if (GetLocalInt(oModule, "AURORA_VFX_PROOF_TRIGGERED"))
    {
        return;
    }

    SetLocalInt(oModule, "AURORA_VFX_PROOF_TRIGGERED", 1);
    object oTarget = GetFirstPC();
    if (!GetIsObjectValid(oTarget))
    {
        return;
    }

    WriteTimestampedLogEntry("AURORA_VFX_PROOF_TRIGGER fixture=vfx-nwn-web-row68 row=68 count=1 run=20260714T132224Z");
    effect eVisual = EffectVisualEffect(VFX_IMP_HEALING_M);
    ApplyEffectToObject(DURATION_TYPE_INSTANT, eVisual, oTarget);
}
