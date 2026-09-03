# VFX Fountain float32 cadence and source-motion audit (2026-07-19)

## Scope

This Aurora-first audit covers two shared Fountain inputs exposed by the
row-50 `VFX_IMP_DEATH` comparison:

- the world-space source motion used by distance-trail emitters;
- the stored float cadence used by normal Fountain emitters.

No xoreos source was used. No NWN or Toolset process was launched.

## Primary Aurora evidence

`FUN_00a31288` at
`C:\Projects\New Folder\export\decompiled_all.c:856916-857129` reads the source
emitter `spawntype` at `+0x84`.

For a distance trail it consumes:

- previous runtime position at `+0x170/+0x174/+0x178`;
- current runtime position at `+0x1b0/+0x1b4/+0x1b8`;
- residual vector at `+0x138/+0x13c/+0x140`.

For a normal Fountain it:

- loads evaluated birthrate from the runtime float slot `+0x58`;
- stores `1 / birthrate` in a local `float`;
- adds the tick delta to the runtime float accumulator at `+0x16c`;
- compares the stored interval and accumulator;
- resets the complete accumulator after the spawn transaction.

The implementation must therefore reproduce float32 storage boundaries. A
JavaScript double accumulator is observably different at exact cadence
boundaries.

## Source-motion correction

The shared runtime previously ignored `context.sourceMotion` in the trail
scheduler, while the application service supplied only the emitter's fixed
local MDL position. The runtime now prefers the resolved current and previous
host positions. The application service resolves that motion independently
for each emitter and each simulation boundary, then falls back to local
emitter motion when no host resolver is present.

A browser-side source-backed `nw_innkeeper` / `c_yinnkeep` `pause1` audit
sampled the actor `Impact` node for the complete row-50 effect:

- base Three position:
  `(0.0247812236, 1.4320385553, -0.0977130138)`;
- 370 samples at 60 Hz;
- total path: approximately `0.02676145 m`;
- path during the active `souldust` birthrate window:
  approximately `0.01107995 m`;
- source trail spacing at birthrate `50`: `0.02 m`;
- whole trail spawns: `0`.

The corrected row-50 `souldust=0` result is therefore expected for this exact
proof actor and animation phase. The missing retail body column must not be
replaced with an invented `souldust` trail.

## Float32 cadence correction

At birthrate `10` and a `1/60 s` simulation step, six JavaScript double
increments remain slightly below `0.1`. Aurora's stored float increments reach
the stored float interval on the sixth tick. The old Web scheduler therefore
waited for a seventh tick, then discarded the overshoot when it performed the
correct whole-accumulator reset.

The shared normal-Fountain scheduler now:

1. evaluates birthrate as float32;
2. stores `1 / birthrate` as float32;
3. stores each accumulator update as float32;
4. retains the recovered whole-accumulator reset and truncated spawn count.

The focused regression fails on the old implementation with zero particles
after six ticks and passes after the correction with one particle and a zeroed
accumulator.

## Row-50 result

Regenerating the exact row-50 source fixture at `1/60 s` changes only the
normal Fountain cadence:

| Emitter | Before cadence fix | After cadence fix |
| --- | ---: | ---: |
| `sparks` | 25 | 25 |
| `Smoke` | 6 | 6 |
| `Smoke01` | 9 | 11 |
| `souldust` | 0 | 0 |
| `WIND_Dummy` | 0 | 0 |

All emitters still finish at zero active particles.

Current fixture identity:

- payload bytes: `3,769,315`;
- payload SHA-256:
  `fb86d11e0d0d8e5788e7fe85f7f149798164ef199c9b6acbf10409073765d76d`;
- manifest SHA-256:
  `ae1659bb0aad56c39594ddf889073564a4f3767018d5950514fb7c771a57ea0c`.

## Verification

- focused red/green float32 cadence regression: passed after failing on the
  old implementation;
- runtime and application service suites: 132/132 passed;
- row-50 source-scene fixture gate: passed;
- backend production build: passed;
- frontend production build: passed, with the existing large-chunk warning;
- fresh guarded Web proof v9 and saved-NWN comparison: passed.

## Proof status

Accepted Web v9:

- MP4:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row50/aurora-web/aurora-web-row50-one-trigger-fountain-float32-cadence-source-motion-observability-v9-20260719.mp4`;
- MP4 SHA-256:
  `f2c01ea95319fe198e1dad181213ea9cb4c33284986c4cda2816ebb4c1abfde2`;
- frame manifest SHA-256:
  `91cfd6628ea18d9b4bc6c7a437bea1f14373725fd859765127ff0d7e3a3722aa`;
- runtime identity:
  `working-tree-1720ffdc0fd186b05625afd05ea4cccee4888049252bfe9bb8b17bbdd7cc4024`.

The recording contains 315 deterministic frames at 30 fps, exactly one
trigger, no loop or overlap, matching frontend/backend identity, stable
`Impact` attachment, settled assets, passing host/draw/playback/proof gates,
an empty blocker manifest, a disabled debug overlay, and zero terminal draws.

The approved NWN MP4 was reused without rerun. The onset-aligned comparison:

- MP4 SHA-256:
  `74cbc359ae811b91759b7e847539862e5e3b3cd922569882fab55d49af1f9ccb`;
- contact-sheet SHA-256:
  `deb942fe3733bff7a7a33049574eb3681603dfc520d27632c73bf12c2d2a168a`;
- comparison-manifest SHA-256:
  `3b9abfbfa3026bcc48cbef67666d26a8dd549164aa67bce4ae51966f1cb7c335`;
- verdict: `matched-with-gaps`.

The float32 correction restores the missing `Smoke01` emissions and increases
the visible early/late column density. It does not close the remaining
source-visible differences: the Web initial flash is still oversized and
clipped, its cyan/white layer is shorter and less translucent, and its peak is
still a compact saturated core rather than the taller retail body column.
Scene/camera, material, alpha, light, bloom, postprocess, and retail RNG parity
remain open.

Accepted Web v8 remains valid historical evidence for the preceding
binary-animation source-field and trail correction. It must not be presented
as proof of the current float32 fixture.
