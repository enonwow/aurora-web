// VFX-P12-E retail capture harness.
//
// Fixture:
// - visualeffects.2da row: 22
// - constant: VFX_FNF_FIREBALL
// - constructor: EffectVisualEffect
// - application mode: location
// - duration: instant / 0 seconds
// - required event: MDL animation event "detonate"
// - raw invocation:
//   EffectVisualEffect(VFX_FNF_FIREBALL) plus MDL animation event detonate
//
// Operator steps:
// 1. Add a waypoint or visible marker with tag "retail-fireball-location".
// 2. Point the camera at that location and keep it static for the full capture.
// 3. Compile this script as "vfx_p12_fireball22" in the retail module.
// 4. Run "dm_runscript vfx_p12_fireball22" from the DM console.
// 5. Capture at least 1 second before detonate and at least 2 seconds after it.
// 6. Record effect start, detonate, and first-particle frame/tick times.

void main()
{
    object oMarker = GetWaypointByTag("retail-fireball-location");

    if (!GetIsObjectValid(oMarker))
    {
        oMarker = GetObjectByTag("retail-fireball-location");
    }

    if (!GetIsObjectValid(oMarker))
    {
        oMarker = GetFirstPC();
    }

    if (!GetIsObjectValid(oMarker))
    {
        return;
    }

    location lFireball = GetLocation(oMarker);
    effect eFireball = EffectVisualEffect(VFX_FNF_FIREBALL);
    ApplyEffectAtLocation(DURATION_TYPE_INSTANT, eFireball, lFireball);
}
