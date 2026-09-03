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

    WriteTimestampedLogEntry("AURORA_VFX_PROOF_TRIGGER fixture=vfx-nwn-web-row22 row=22 count=1 run=20260714T141332Z");
    effect eVisual = EffectVisualEffect(VFX_FNF_FIREBALL);
    ApplyEffectAtLocation(DURATION_TYPE_INSTANT, eVisual, GetLocation(oTarget));
}
