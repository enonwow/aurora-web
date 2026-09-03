# VFX row 28 overpopulation and visible-tail root-cause audit (2026-08-25)

## Status and scope

Status: **NO-GO for visual parity; root renderer defect confirmed; no fix was
implemented by this audit.**

This audit answers the observed questions "why does Aurora Web show too many
effects?" and "why do they remain visible too long?" for the current row-28
Meteor Swarm candidate. It is Aurora-first and asset-identity-neutral. It does
not authorize or propose a condition on a VFX row, constant, label, ResRef,
file name, fixture id, emitter name, tile, creature, placeable, or any other
content identity.

The audit uses existing immutable NWN and Web captures, the generated runtime
payload, current source, the Toolset decompiler export, and a read-only
disassembly of the installed NWN EE client. It did not start Toolset, NWN,
Chrome, backend, frontend, or a capture process.

## Executive verdict

The user-visible excess is real. In the current deterministic Web payload two
outer Fountain emitters create 104 distinct live `fx_meteor` activations. Every
one of those activations reaches all three nested Explosion lanes. At peak,
54 outer model instances own 632 nested draw particles.

That population is made visually excessive by a confirmed renderer hierarchy
defect:

1. Aurora passes each outer Chunk particle's sampled size (approximately
   `0.1` here) into the live child model's scale setter.
2. The live model recomputes final scale recursively for its child nodes.
3. A nested PartEmitter reads its owner's adjusted scale and multiplies its
   authored particle size by that value.
4. Aurora Web applies `0.1` only to the cloned child-model geometry, then adds
   the nested emitter runtime as a sibling in scale `1`.

Consequently the current Web render presents nested Ring, sparks, Smoke, and
Metorflame particles at approximately ten times the linear size implied by the
live-model hierarchy. The exact multiplication varies with authored node
scales, but omitting the outer `0.1` factor is unambiguous.

The same defect explains the apparent long tail. Late child activations are
validly retained by their source lifetimes, but their Ring/Smoke/Flame output
remains large and threshold-visible instead of becoming a small residual
layer. There is no evidence of an orphaned-instance leak or simultaneous
fallback-plus-instance rendering.

A second, independent authority gap remains: the proof fixture simulates at a
hard-coded `1/60 s` step although the recovered Fountain routine consumes its
caller's delta and resets its accumulator after an emission. Therefore 104 is
the exact count produced by the current Web proof clock, but it is not yet an
established native NWN count. This may contribute additional population
divergence, but the current evidence does not justify claiming a specific NWN
client cadence.

## Bound authorities

### Native and Web visual artifacts

- accepted native lifecycle summary:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/nwn-final/v1/validated-summary.json`;
- current Web capture:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/web-v35-shared-scheduler-instance-frames/aurora-web-row28-one-trigger-v35-shared-scheduler-instance-frames.mp4`,
  SHA-256
  `5304dfb9488e2617d90f89eed4f2e56e06790048013e4d06b45918afabd7b6a2`;
- rejected trigger-relative diagnostic comparison:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/comparison-v35-shared-scheduler-instance-frames-rejected-diagnostic/comparison-manifest.json`;
- first-visible-onset-aligned diagnostic MP4:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/comparison-v35-shared-scheduler-onset-aligned-diagnostic-v3/nwn-vs-aurora-web-v35-first-visible-onset-aligned-v3.mp4`,
  SHA-256
  `7bfb3f970b0ca710d22e19bfabe5a3170767441131818237c0e147e44efc152b`;
- onset-aligned frame sheet:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/comparison-v35-shared-scheduler-onset-aligned-diagnostic-v3/nwn-vs-aurora-web-v35-first-visible-onset-aligned-v3-frames.png`,
  SHA-256
  `2306bad6eb07c03d6cc4b21396861d4a90568c79d355f30d058df4f88430c303`;
- onset-alignment manifest:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/comparison-v35-shared-scheduler-onset-aligned-diagnostic-v3/nwn-vs-aurora-web-v35-first-visible-onset-aligned-v3-manifest.json`.

The onset-aligned comparison is diagnostic, not trigger-timing proof. Its
manifest binds first-visible NWN `5.000000 s` and Web `2.416667 s` to the same
comparison time `0.500000 s`, and classifies the visual result as `BAD`.

### Current runtime artifacts and source

- root payload:
  `frontend/public/dev-fixtures/vfx-nwn-web-row28/payload.json`, 121,837,501
  bytes, SHA-256
  `ce429ec86b8a344d74e74825e722f6e4e8abb8d4725d707653c6e40e9bbe34ef`;
- child payload:
  `frontend/public/dev-fixtures/vfx-nwn-web-row28/fx_meteor.runtime.json`,
  10,433,290 bytes, SHA-256
  `9bb08e5989b26e91d539ab499027b4cd9d6f4f79a44bcfd2fd3bac25c8da66dc`;
- renderer:
  `frontend/src/modules/layout/adapters/three/auroraVfxCanonicalRenderer.ts`,
  inspected SHA-256
  `974433195441d2b30f9a21386d6d8865050b7ae43d102dfdd4ad7b6dab70545b`;
- emitter runtime:
  `backend/src/modules/vfx/domain/aurora-vfx-runtime-state.ts`, inspected
  SHA-256
  `8a5b2903fd304532cf444332ea46dd74643bc4288c1f34250a3e77309e8eb474`;
- proof fixture generator:
  `backend/scripts/create-vfx-nwn-web-row28-fixture.ts`, inspected SHA-256
  `9c9da2f481c2f8463cebc2e15963366deafdcd109524b9033cc98913bfc6f5c1`.

### Aurora binaries and decompiler export

- Toolset decompiler export:
  `C:/Projects/New Folder/export/decompiled_all.c`;
- installed NWN EE client:
  `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwmain.exe`;
- client version: `89.8193.37-17`;
- client SHA-256:
  `3b7cb1252e0edb2ce22d7971f333aade027039ae30a45b4bc64732c3e6bec73a`.

No xoreos source was used.

## Measured visual mismatch

The accepted native lifecycle summary reports:

- first threshold-visible frame: `5.083333 s`;
- last threshold-visible frame: `7.083333 s`;
- threshold-visible duration: `2.000000 s`.

The current rejected Web comparison manifest reports:

- onset relative to Web trigger: `+0.500000 s`;
- peak: `+1.250000 s`;
- last visible frame: `+3.083333 s`;
- visible duration: `2.583333 s`.

Under these saved visibility measurements, Web is visible for approximately
`0.583333 s`, or `29.2%`, longer than native. This is independent of the
first-visible alignment used for the human comparison.

The Web group's `effectiveWallDurationSeconds = 4.616667` is not the visible
effect duration. It is a playback/lifecycle guard and must not be compared
directly with the native two-second threshold-visible interval.

The rejected validator's statement that Web source-clock last-visible
`3.083333 s` is about 142 ms earlier than its bound source endpoint
`3.225405 s` does not contradict the longer visible interval above. That gate
compares an absolute source-clock endpoint; the user-visible duration also
depends on when visibility begins. It cannot replace onset-to-last-visible
comparison.

## Exact current Web population ledger

The root source has two resolved Fountain Chunk emitters:

- `OmenEmitter02`, source X approximately `+8.2483`;
- `OmenEmitter03`, source X approximately `-8.1349`.

Both use `chunkName = fx_meteor`, `sizeStart = sizeEnd = 0.1`,
`lifeExp = 1.3`, `spawnType = 0`, and a birthrate timeline that remains at 25
until source time approximately `2.6333 s` before turning negative.

Scanning every serialized root runtime frame gives:

| Quantity | Exact current value |
| --- | ---: |
| Distinct `fx_meteor` activations from `OmenEmitter02` | 52 |
| Distinct `fx_meteor` activations from `OmenEmitter03` | 52 |
| Total distinct child-model instance references | 104 |
| Maximum active outer instances per source emitter | 27 |
| Maximum simultaneous outer instances | 54 |
| Child activations reaching at least one Explosion draw | 104 / 104 |
| Child activations reaching Ring, sparks, and Smoke draws | 104 / 104 |
| Maximum simultaneous nested draw particles | 632 |

The 632-particle nested peak consists of:

| Nested emitter | Draw particles at peak |
| --- | ---: |
| Ring | 10 |
| sparks | 250 |
| Smoke | 252 |
| Metorflame | 120 |

Selected source-clock samples are:

| Source time | Outer instances | Nested draw particles |
| ---: | ---: | ---: |
| 0.333 s | 12 | 18 |
| 0.667 s | 26 | 398 |
| 1.000 s | 40 | 460 |
| 1.333 s | 52 | 574 |
| 1.667 s | 54 | 632 |
| 2.000 s | 54 | 574 |
| 2.333 s | 52 | 574 |
| 2.667 s | 52 | 632 |
| 3.000 s | 38 | 486 |
| 3.333 s | 24 | 204 |
| 3.667 s | 12 | 90 |
| 4.000 s | 0 | 0 |

This proves a multiplicative visual chain, but it does not by itself prove
that Aurora Web emits more outer Chunk models than NWN. Native per-emitter
birth telemetry was not captured.

## Confirmed cause: nested runtime is detached from live-model scale

### NWN EE client chain

Read-only disassembly of the bound client closes the ambiguity left by the
earlier static audit:

1. `ChunkyParticle::initialize` at `0x1400663d0` preserves its third scalar in
   `xmm7`. At `0x14006640e` it copies that scalar to `xmm1`, sets `r8d = 0`,
   and calls the live model's virtual slot `+0x1b0` at `0x140066414`. It then
   starts the model animation through virtual slot `+0x30`.
2. RTTI/vtable inspection maps the relevant `Gob` and `StringGob` slot
   `+0x1b0` to `0x140094860`.
3. `0x140094860` writes the scalar to the local model-scale field
   `[rcx + 0x4a0]` for selector zero and calls `0x14008cc80`.
4. `0x14008cc80` calculates final scale. It inherits a parent final scale from
   `[parent + 0x49c]`, multiplies local scale fields `[+0x4a0]` and `[+0x4a4]`,
   stores the result at `[+0x49c]`, and recursively calls itself for every
   child pointer in `[+0x4a8]`/`[+0x4b0]`.
5. `Gob::GetAdjustedScale` at `0x14008e390` evaluates the animated scale track
   and multiplies it by final scale `[+0x49c]`.

Therefore the sampled Chunk particle scalar is a live model-hierarchy scale,
not a geometry-only presentation scalar.

### Toolset PartEmitter chain

The stable Toolset export independently establishes how that final scale
reaches particle geometry:

- `FUN_00a2e250`, lines 855838-855846, calls the emitter owner's adjusted-scale
  virtual and stores the result in `local_54`;
- lines 856187-856208 multiply authored start/end X/Y particle sizes by
  `local_54 * 0.5` before vertex construction.

The client-side recursive final-scale calculation and the Toolset-side owner
adjusted-scale read form one complete semantic chain: PartEmitter nodes inside
the live child model inherit the outer Chunk particle's sampled model scale.

### Current Aurora Web split

The current renderer breaks that hierarchy:

- lines 2701-2721 calculate `chunkUniformScale` and apply it only to
  `instance.scale`;
- lines 2750-2777 create the child emitter group as a separate object and set
  `nestedRuntimeGroup.scale` to `templateBaseScale`, excluding
  `chunkUniformScale`;
- lines 2801-2804 explicitly label the behavior
  `nested-emitter-runtime-excludes-live-chunk-model-visual-scale`;
- lines 2813 and 2892 add the nested runtime group and model instance as
  siblings.

For the current source, authored child emitters include Ring `2 -> 5`, sparks
`5 -> 1`, Smoke `0 -> 5`, and Metorflame `0.4 -> 0.7`. Rendering those lanes
without the outer `0.1` model scale makes the repeated nested impacts dominate
the frame.

## Correction of the previous nested-scale conclusion

`vfx-row28-source-location-and-nested-chunk-scale-audit-2026-08-25.md`
concluded that large native disks proved nested emitters did not inherit the
outer scale. Its decisive visual premise was that disks appearing at several
positions could not come from "the root Ring event at one fixed source
position."

That premise is false in the exact current source payload:

- the root `Ring` emitter is an Explosion with source size `0.5 -> 17`;
- its position timeline jumps among multiple authored world positions,
  including approximately `[0.465, 1.732]`, `[-9.861, -6.052]`,
  `[8.694, 8.509]`, `[-6.962, 7.915]`, `[8.649, -4.198]`, and
  `[-4.417, -1.650]`;
- its final runtime ledger contains four emitted root rings.

Large native disks at multiple positions therefore cannot identify the nested
child Ring lane. The visual observation did not falsify scale inheritance.
The binary chain above positively confirms inheritance. The earlier Finding 2
is superseded by this audit; its source-location findings are not affected.

## Why the excess is not a duplicate-render or leak defect

`resolveCanonicalChunkInstanceRuntimePayload()` validates an instance-bound
frame and replaces the fallback payload's `runtimeEmitters` with hydrated
instance emitters. It does not render fallback live particles in addition to
the instance frame. The nested group is created once per active outer
particle.

The runtime ledger also reaches zero outer instances and zero nested draw
particles at source time `4.000 s`. This rules out an orphaned child-model
lifecycle leak in the inspected payload.

The long visible tail instead comes from valid late parent activations plus
source child lifetimes (Smoke and Metorflame reach one second), amplified by
the incorrect full-size nested rendering. Correcting scale need not shorten
the internal simulation lifetime to shorten the user-visible threshold tail.

## Secondary unresolved cause: proof cadence is not engine-authoritative

Toolset `FUN_00a31288` at lines 856916-857040 shows normal Fountain semantics:

- it consumes caller-provided `param_2` delta;
- computes interval `1 / birthrate`;
- accumulates the caller delta;
- enters the birth path after the interval is reached;
- uses integer conversion/modulo helpers for the birth count; and
- resets the accumulator to zero at line 857038.

The current generic Web implementation mirrors float32 interval/accumulator
behavior and the zero reset at
`backend/src/modules/vfx/domain/aurora-vfx-runtime-state.ts:802-819`.

However, the proof fixture generator fixes the simulation step to `1 / 60` at
`backend/scripts/create-vfx-nwn-web-row28-fixture.ts:31` and justifies it with
a shared proof setting, adaptive VSync, and a 60 Hz display at lines 419-422.
Those facts establish deterministic replay conditions, not the caller-delta
sequence used by the NWN EE client emitter scheduler.

Because the normal Fountain path discards interval remainder by resetting the
accumulator, birth count is cadence-dependent. At birthrate 25, the current
`1/60 s` fixture reaches the `0.04 s` threshold every three steps and produces
52 activations per source emitter over this timeline. A different caller-delta
sequence can produce a different count even with identical MDL data.

Missing authority: the exact NWN EE client PartEmitter caller delta sequence or
equivalent native birth telemetry. Until recovered, the Web count of 104 must
be described as deterministic fixture output, not as a confirmed native count.
No alternate native cadence is inferred by this audit.

## Classification ledger

| Finding | Classification | Consequence |
| --- | --- | --- |
| Web visible duration is 2.583 s versus native 2.000 s under saved visibility measurements. | Confirmed by artifacts | The user's long-tail observation is measurable. |
| Current payload creates 104 child model activations and peaks at 632 nested draw particles. | Confirmed by exact payload scan | The current Web visual workload is highly multiplicative. |
| Every current child activation reaches Ring, sparks, and Smoke Explosion draws. | Confirmed by exact payload scan | The density is not caused by only a small subset of children. |
| Aurora's live child-model scale propagates recursively and participates in PartEmitter size. | Confirmed by bound client disassembly plus Toolset decompilation | Nested runtime must inherit the outer Chunk model scale. |
| Aurora Web excludes `chunkUniformScale` from the nested runtime group. | Confirmed in current frontend source | Nested child particles are rendered too large. |
| The scale defect makes late child output remain prominently visible. | Confirmed mechanism; visual magnitude to be remeasured after fix | Explains the apparent excess and long tail without changing authored lifetimes. |
| Fallback and instance-bound child payloads are rendered simultaneously. | Falsified in current source | Not a cause. |
| Child runtime leaks after parent death. | Falsified in current payload | Not a cause. |
| 104 is also the exact native NWN outer activation count. | Missing authority | Requires native caller-delta/birth evidence. |
| The exact retail RNG state and resulting screen-space overlap are known. | Missing authority | Spatial identity cannot be claimed from the current native MP4. |

## Global, data-driven remediation contract

Any implementation following this audit must satisfy all of these conditions:

1. A live nested model runtime is composed under the same generic model
   transform hierarchy as that model's geometry. Position, rotation, authored
   template scale, sampled particle model scale, and descendant node scales
   must have one owner chain.
2. No behavior branch may inspect VFX row, constant, label, ResRef, file name,
   node/emitter name, fixture id, tile, creature, placeable, or other content
   identity.
3. Static resource data and instance-bound dynamic frames remain separate, but
   the renderer must not turn that transport separation into a transform
   hierarchy separation.
4. The proof clock must be described as deterministic fixture cadence until a
   native caller-delta contract is recovered. A later clock correction must be
   global and typed, never row-specific.
5. Telemetry must expose per frame: active outer Chunk models, distinct child
   activations, nested draw counts by generic emitter lane, and the effective
   inherited model scale used for each nested runtime.

## Completion gates for the future fix

The defect is not closed until all gates pass:

- a generic unit test with arbitrary model/emitter/resource names proves that
  a child PartEmitter group inherits a non-unit sampled parent model scale;
- a regression test proves no identity-based selector was introduced;
- focused backend and frontend tests plus builds pass under repository worker
  and heap limits;
- a fresh immutable-profile Web capture is bound to the post-fix source digest
  and runtime build identity;
- the comparison MP4 aligns NWN and Web at the same first-visible onset;
- a second artifact compares onset-relative frames;
- saved telemetry demonstrates no duplicate live child payload and no orphaned
  tail;
- the onset-to-last-visible Web interval is within one encoded proof frame of
  the native interval, unless a stricter recovered native contract applies;
- human visual review classifies density, scale, peak composition, and tail as
  matched or closely approximated, not `BAD`.

Until those gates pass, row-28 visual parity remains **NO-GO**.
