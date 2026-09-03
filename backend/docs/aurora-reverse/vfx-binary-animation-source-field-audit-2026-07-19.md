# VFX binary animation source-field audit (2026-07-19)

## Scope

This Aurora-first audit covers a global binary-MDL parser defect exposed by
the row-50 `VFX_IMP_DEATH` comparison. The pre-fix Web capture showed sharp,
long-lived `souldust` Motion_Blur streaks that are absent from the saved NWN
oracle.

No xoreos source was used. No NWN or Toolset process was launched.

## Aurora evidence

Exact retail source:

- model: `vim_negdeath.mdl`;
- SHA-256:
  `9f46fed4f702d1e438ada87c400ea6c55b0590d2c279112188447e94b34a85b1`;
- base emitter `souldust`: `Fountain`, `Motion_Blur`, `spawntype=1`,
  `birthrate=0`, `lifeExp=1.5`;
- selected `impact` animation: keyed `birthrate`, `mass`, and `grav`
  controllers.

`FUN_00a31288` at
`C:\Projects\New Folder\export\decompiled_all.c:856916-857129` obtains the
source emitter pointer from runtime emitter `+0x04` and selects normal versus
trail Fountain scheduling by reading source emitter `+0x84`. The branch is:

- source `spawntype == 0`: time-accumulator Fountain;
- source `spawntype != 0`: movement-distance trail.

The binary animation node contains controller records for `birthrate`, `mass`,
and `grav`. Its fixed source-layout fields are not animation controllers.
Before this correction, the parser copied the animation node's fixed
`spawntype=0` default into `emitterState.simulation`, overwriting the base
retail `spawntype=1`.

## Correction

Binary animation passes now expose only simulation properties backed by an
actual binary controller record. Controller timelines and color timelines
remain preserved. Fixed source-layout fields and flags are no longer copied
from the animation node into the runtime animation override.

This correction is deliberately limited to binary animation parsing. It does
not change manually supplied or ASCII animation-pass semantics without a
separate Aurora audit.

## Row-50 effect

The exact source model was regenerated with a `1/60 s` simulation step and
every second tick serialized:

| Emitter | Pre-fix maximum | Corrected maximum |
| --- | ---: | ---: |
| `sparks` | 25 | 25 |
| `Smoke` | 6 | 6 |
| `Smoke01` | 9 | 9 |
| `souldust` | 46 | 0 |
| `WIND_Dummy` | 0 | 0 |

The corrected payload is 3,696,188 bytes. All emitters finish at zero active
particles. A static no-playback preflight at effect time `1.0 s` reports 11
draw particles, no playback hooks, stable `Impact` attachment, and only the
source-backed `Smoke` and `Smoke01` particle meshes. Its PNG SHA-256 is
`8bb8fed52380b6d8472681211673ba199c10c9c4a79d97ef3103983305ce681a`.

Current fixture hashes:

- payload:
  `671c2855b6b0b13e00f96eeccd6c1413e689ec1e5d6261a0e5c0807c537c51cb`;
- manifest:
  `f30430364446d67128a79a57cb04a2cef1adb07a5126f8eaa3bd1124e37f0872`.

## Verification

- binary MDL parser tests: 21/21 passed;
- VFX application and runtime-state tests: 129/129 passed;
- row-50 source-scene fixture gate passed;
- backend production build passed;
- frontend production build passed with the existing large-chunk warning.

## Proof status

Accepted Web v8 proves the corrected binary-animation source fields:

- Web MP4 SHA-256:
  `13b75eda099b7773ad8312afceaf5654543bb752e989cff4b481f20c75e998bf`;
- comparison MP4 SHA-256:
  `f7b73096dccff3061d73eaeac92f200372d59b5df2a4f3e077b9f2b917783a7b`;
- contact sheet SHA-256:
  `ff1d1994d5f324b5506fd18750fd18efa1e2abac1d2700ed42a4849bf6b96580`;
- comparison manifest SHA-256:
  `9ff45044b9612df7614fffffab61de6f56f303fba14d26ee1cc36833ee0a0948`.

The capture contains 315 deterministic frames at 30 fps, one trigger, no loop
or overlap, stable `Impact` attachment, passing runtime identity, host, asset,
draw, playback and proof gates, an empty blocker manifest, and zero terminal
draws. The approved NWN MP4 was reused without rerun.

The comparison is `matched-with-gaps`, not parity. The erroneous late vertical
`souldust` spikes are gone. The remaining differences are an oversized clipped
initial flash, a compact saturated peak instead of the taller translucent
retail column, scene/camera differences, and open material, alpha, light,
bloom, postprocess and retail-RNG context.

A later source-backed float32 Fountain cadence correction changes row-50
`Smoke01` from 9 to 11 particles. Web v8 is therefore valid for this parser
checkpoint but historical for the current fixture. See
`vfx-fountain-float32-cadence-and-source-motion-audit-2026-07-19.md`.
