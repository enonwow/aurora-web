// VFX-P12-C retail capture harness.
//
// Fixture:
// - visualeffects.2da row: 50
// - constant: VFX_IMP_DEATH
// - constructor: EffectVisualEffect
// - raw invocation:
//   ApplyEffectToObject(DURATION_TYPE_INSTANT, EffectVisualEffect(VFX_IMP_DEATH), oTarget);
//
// Operator steps:
// 1. Add a creature or placeable target with tag "vfx_retail_target" in the
//    capture area.
// 2. Compile this script as "vfx_p12_row50" in the retail module.
// 3. Set camera/lighting according to capture.json.
// 4. Run "dm_runscript vfx_p12_row50" from the DM console.
// 5. Capture screenshot/video and update capture.json/comparison.json.

void main()
{
    object oTarget = GetObjectByTag("vfx_retail_target");

    if (!GetIsObjectValid(oTarget))
    {
        oTarget = GetFirstPC();
    }

    if (!GetIsObjectValid(oTarget))
    {
        return;
    }

    effect eVisual = EffectVisualEffect(VFX_IMP_DEATH);
    ApplyEffectToObject(DURATION_TYPE_INSTANT, eVisual, oTarget);
}
