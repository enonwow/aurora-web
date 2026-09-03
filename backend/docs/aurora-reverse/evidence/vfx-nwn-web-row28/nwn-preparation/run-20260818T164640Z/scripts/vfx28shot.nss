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

    WriteTimestampedLogEntry("AURORA_VFX_PROOF_TRIGGER fixture=vfx-nwn-web-row28 row=28 count=1 run=20260818T164640Z");
    effect eVisual = EffectVisualEffect(VFX_FNF_METEOR_SWARM);
    ApplyEffectAtLocation(DURATION_TYPE_INSTANT, eVisual, GetLocation(oTarget));
}
