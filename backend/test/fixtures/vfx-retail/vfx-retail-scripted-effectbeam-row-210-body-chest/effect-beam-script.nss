// VFX-P12-D retail capture harness.
//
// Fixture:
// - visualeffects.2da row: 210
// - constant: VFX_BEAM_FIRE
// - constructor: EffectBeam
// - body node: BODY_NODE_CHEST
// - duration: 3.0 seconds
// - raw invocation:
//   ApplyEffectToObject(DURATION_TYPE_TEMPORARY, EffectBeam(VFX_BEAM_FIRE, oSource, BODY_NODE_CHEST), oTarget, 3.0);
//
// Operator steps:
// 1. Add a visible source object with tag "retail-beam-source".
// 2. Add a visible target object with tag "retail-beam-target".
// 3. Place camera so source, target, beam start, and beam end are all visible.
// 4. Compile this script as "vfx_p12_beam210" in the retail module.
// 5. Run "dm_runscript vfx_p12_beam210" from the DM console.
// 6. Capture at least 3 seconds of video and note whether the beam anchors to
//    BODY_NODE_CHEST on the source object.

void main()
{
    object oSource = GetObjectByTag("retail-beam-source");
    object oTarget = GetObjectByTag("retail-beam-target");

    if (!GetIsObjectValid(oSource) || !GetIsObjectValid(oTarget))
    {
        return;
    }

    effect eBeam = EffectBeam(VFX_BEAM_FIRE, oSource, BODY_NODE_CHEST);
    ApplyEffectToObject(DURATION_TYPE_TEMPORARY, eBeam, oTarget, 3.0);
}
