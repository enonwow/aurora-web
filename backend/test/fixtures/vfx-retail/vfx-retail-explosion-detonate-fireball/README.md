# VFX-P12-E Retail Fixture: Explosion Detonate Fireball

Fixture id: `vfx-retail-explosion-detonate-fireball`

Case: `Explosion emitter with explicit detonate event`

Candidate source:

- `visualeffects.2da`
- row `22`
- label `VFX_FNF_FIREBALL`
- invocation: `EffectVisualEffect(VFX_FNF_FIREBALL) plus MDL animation event detonate`

This directory is a prepared capture pack skeleton only. It is not retail
evidence and must not be used to mark the fixture `passed` or
`behaviorClaim: "canonical"`.

Retail operator steps:

1. Add a waypoint or visible marker tagged `retail-fireball-location`.
2. Compile `effect-fireball-script.nss` as `vfx_p12_fireball22`.
3. Set a static camera that sees the fireball location before effect start,
   during `detonate`, and after particles appear.
4. Run `dm_runscript vfx_p12_fireball22` from the DM console.
5. Capture at least 1 second before detonate and at least 2 seconds after
   detonate.
6. Record the frame/tick time for effect start, `detonate`, and first visible
   particle.
7. Fill the JSON files with retail build/profile, source row, parser snapshot,
   resolver trace, runtime tick dump, render contract snapshot, capture media,
   SHA-256 hashes, and comparison result.
