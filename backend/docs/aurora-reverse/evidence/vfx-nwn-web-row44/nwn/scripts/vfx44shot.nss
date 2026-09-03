void main()
{
    object oModule = GetModule();
    if (GetLocalInt(oModule, "AURORA_VFX_PROOF_TRIGGERED"))
    {
        return;
    }

    SetLocalInt(oModule, "AURORA_VFX_PROOF_TRIGGERED", 1);
    object oTarget = GetObjectByTag("vfx_retail_target");
    if (!GetIsObjectValid(oTarget))
    {
        oTarget = GetFirstPC();
    }
    if (!GetIsObjectValid(oTarget))
    {
        return;
    }

    WriteTimestampedLogEntry("AURORA_VFX_PROOF_TRIGGER fixture=vfx-nwn-web-row44 row=44 count=1 run=20260714T082755Z");
    effect eVisual = EffectVisualEffect(VFX_IMP_ACID_S);
    ApplyEffectAtLocation(DURATION_TYPE_INSTANT, eVisual, GetLocation(oTarget));
}
