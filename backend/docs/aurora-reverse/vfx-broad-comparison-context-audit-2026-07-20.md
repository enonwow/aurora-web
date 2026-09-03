# VFX broad comparison-context audit (2026-07-20)

## Scope

This Aurora-first audit classifies why visible differences remain across the
current broad VFX matrix. It separates source-backed runtime progress from the
camera, scene, actor, lighting, material, and timing context required for a
visual-parity claim.

No xoreos source was used.

## Fixture classification

| Fixture | Source-backed progress | Open comparison context |
| --- | --- | --- |
| row 22 Fireball | source emitters, chunks, WOK contacts, exact floor/rug receivers, global ARE lighting, one resolved tile source light | inferred camera, floor-only mesh filter, no owner/target parity, five unresolved source lights, six static main-light lanes |
| row 44 acid impact | animation-origin detonate, exact 4/4 HAK-backed tile scene with source tile lights, target actor and scripted orientation | source actor, exact native camera, material/postprocess and retail RNG |
| row 50 death impact | object Impact-node attachment, exact 4/4 HAK-backed tile scene with source tile lights, target actor, exact RGBA texture binding, corrected runtime cadence, longitudinal camera fit | source actor, exact native camera, material/alpha/bloom/postprocess and retail RNG |
| row 210 fire beam | Type-7 attachment and native Lightning scheduling | host actors, full scene, exact camera, material/postprocess and retail RNG |
| row 216 fire lash | source/target Impact-node attachment from exact capture-derived model hierarchies | full rendered actors and scene, exact camera, remaining particle shape/cadence and material response |
| row 181 MIRV | Type-10 projectile owner and path style 4 | rendered source/target actors, full scene, exact camera, particle material and light response |
| row 1 darkness | duration visual-owner lifecycle | creatures, full scene, local tile lights, exact camera and negative-light material/postprocess response |
| AOE 0 acid fog | 20-owner scheduling, duration/cessation cycle, and exact 4/4 HAK-backed tile scene with source tile lights | exact retail RNG, walkmesh grounding, sound scheduling, actors, and exact native camera parity |

## Shared finding

Every current broad fixture has at least one unmatched comparison-context lane.
Most have several. These gaps change the apparent VFX even when the underlying
runtime phase, emitter lifecycle, attachment, or collision behavior is already
source-backed.

The common visual consequences are:

- different apparent scale and axis direction from unmatched projection and
  camera pose;
- different brightness, alpha perception, and bloom from incomplete scene
  lighting and missing occluders;
- different silhouettes from omitted actors, walls, ceilings, and tiles;
- different contact and grounding from incomplete walkmesh or collision
  context;
- false duration impressions when encoded video PTS is not accepted runtime
  time.

## Implemented contract

All broad fixture manifests now carry an explicit `comparisonContext`:

```text
cameraMatchEstablished=false
sceneMatchEstablished=false
ownerTargetMatchEstablished=false
```

`NwnVfxComparisonRunner` consumes that contract through a separate
`visualParityReadiness` lane. Missing or false context fails closed to
`diagnostic-only`. It does not change or weaken the technical runtime proof
gate.

The fixture contract test is:

`backend/scripts/test-vfx-broad-comparison-context-fixtures.mjs`

## Verdict

The remaining differences are not evidence that every source emitter is
individually wrong. They are a mixture of effect-runtime gaps and shared
comparison-context gaps. Further visual tuning must first identify which lane
owns the observed difference; emitter parameters must not be changed to
compensate for an unmatched scene or camera.
