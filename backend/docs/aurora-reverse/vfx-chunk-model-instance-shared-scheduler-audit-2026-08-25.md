# VFX Chunk Model-Instance Shared Scheduler Audit

Date: 2026-08-25  
Status: implemented, source-backed runtime contract; fresh retail differential proof pending

## Scope

This audit closes the runtime-architecture defect that caused a resolved Chunk
model payload to be simulated once and then cloned into every active parent
particle. The implementation is asset-identity-neutral. It does not compare a
VFX row, constant, ResRef, filename, fixture identity, emitter name, or model
name to select behavior.

The retail differential target that exposed the defect is retained only as
proof provenance. The production correction applies to every recursive Chunk
model admitted through the typed runtime-tree contract.

## Aurora authority

The implementation follows the already recovered Aurora model-instance and
particle lifecycle evidence:

- `FUN_00a28a38` (`C:/Projects/New Folder/export/decompiled_all.c`, around
  lines 853365-853375) initializes the live Chunk model owned by a particle and
  immediately starts its model animation path.
- `FUN_00a2d9c4` retains and releases the live model with the parent particle
  lifecycle.
- `FUN_00a31070` updates and draws each live model with its own particle
  transform.
- `FUN_00a2625c` consumes the caller-provided `rand` state during particle
  reset. This establishes continuation of one mutable RNG stream; it does not
  justify a separately seeded child payload.

These anchors establish distinct live child instances, lifecycle ownership,
per-instance transforms, and shared RNG continuation. They do not establish a
recoverable retail presentation seed. The deterministic proof seed remains an
explicit presentation input and is not claimed as the native seed.

## Defect in the previous pipeline

The previous fixture path built one complete child model runtime payload with
`seed + 1`, then cloned and age-seeked that payload for every active Chunk
particle. This violated the recovered semantics in three ways:

1. Multiple live parent particles did not own distinct child runtime states.
2. Root and child emitters did not consume one continuous RNG state.
3. A child's local animation/runtime clock was inferred by seeking a shared
   payload instead of advancing the instance from its activation boundary.

The fallback child resource payload remains useful only for immutable model
graph, material, texture, and static emitter-contract data. It is no longer
the live state of an active Chunk instance when an instance-bound scheduler
frame is present.

## Implemented contract

`VfxApplicationService.processVfxRuntimeTree` is the generic scheduler entry
point. Its input contains one root model command and a bounded list of child
model sources keyed by normalized requested resource reference. The key is
resource resolution data, not a behavior selector.

For every bounded root tick the scheduler:

1. resumes root emitter states and the exact shared RNG state;
2. advances root emitters in source order;
3. discovers active resolved Chunk model-instance references;
4. creates one child runtime state per newly live instance;
5. advances live child instances in insertion order and each child's emitters
   in source order while threading the same RNG state;
6. recursively discovers descendants;
7. releases instances no longer owned by a live parent particle; and
8. attaches an instance-bound child frame to the owning parent particle.

The declared scheduler order is
`model-instance-insertion-order-then-emitter-source-order`. Root and every
child slice publish `aurora-vfx-shared-rng-lineage/v1` with exact initial and
final RNG states.

The frontend accepts an instance frame only when its version and
`modelInstanceRef` match the owning particle and every child emitter matches a
static resource emitter by both source index and emitter name. A missing or
invalid match fails back to the immutable resource payload; no parameter is
invented.

## Compact child-frame transport

The first correct scheduler serialization repeated a complete render contract
for every live child instance and produced a 356,430,821-byte proof payload.
That representation was rejected as unsafe for the local proof workstation.

`aurora-vfx-child-render-contract-frame/v1` now transports only dynamic render
counts, lane, compact particle draw records, an optional recursive Chunk lane,
and an optional dynamic type-4 light record. Static render mode, blend mode,
render state, render order, topology, material state, and static diagnostics
are hydrated from the already resolved immutable child resource payload. The
hydration path is generic and validates emitter index plus name before use.

The current generated proof payload is 121,837,501 bytes. Generation completes
inside the repository's 1 GB Node heap limit. Further root-frame transport
compaction is a performance follow-up, not a semantic substitute for the
implemented scheduler.

## Cache correction

`bypassCache: true` previously skipped cache reads but still wrote every
transient scheduler slice. Recursive simulation therefore accumulated hundreds
of large entries and exhausted the 1 GB heap. Bypassed processing now returns a
transient cache descriptor and performs no cache write. A regression test
proves that the returned key is absent from the shared cache.

## Asset-identity-neutral proof

The unit tests use arbitrary root, child, emitter, model, and resource names.
They prove:

- deterministic continuation from an exact emitter and RNG state;
- distinct child instance frames on one shared RNG stream;
- compact frames contain no repeated render mode, blend mode, or render state;
- the frontend renders two arbitrary instances from their distinct frames; and
- two arbitrary proof-scene maximum-height values drive the same typed mesh
  visibility algorithm.

The static asset-identity-neutral branch gate covers 15 production/proof
surfaces, including the application scheduler, renderer, fixture loader,
profile mapper, runner, and contract types.

## Remaining evidence boundaries

- The exact engine-wide inter-model scheduler order is not symbolically named
  in the recovered binary. The declared deterministic order is the narrowest
  order consistent with the recovered live-instance calls and source emitter
  iteration. Fresh NWN-versus-Web visual evidence remains required.
- Runtime-tree continuation does not yet carry a nontrivial time-varying wind
  manager across model slices. The current proof source has a zero wind vector,
  so this does not change this candidate, but global nonzero recursive-wind
  parity is not claimed.
- The 2DA camera shake event is preserved with delay, type, and duration, but
  its client camera transform semantics remain unmapped. No guessed shake
  amplitude or waveform is implemented.
- Renderer eligibility is not retail parity. Completion requires a fresh,
  profile-bound Web capture, trigger-aligned MP4, frame comparison sheet, and
  an explicit visual verdict against the immutable NWN capture.

## Verification completed before capture

- backend focused unit gate: 50/50 passed;
- frontend canonical renderer gate: 88/88 passed;
- frontend comparison-runner gate: 56/56 passed;
- backend build: passed;
- frontend build: passed;
- asset-identity-neutral static gate: passed on 15 surfaces;
- fixture regeneration: passed under a 1 GB Node heap.

## Fresh proof result

Profile `proof-profile-v41.json` bound the guarded v35 capture to runtime
source digest
`4604aa60fc83e6ab4901c570136340d6e0ac27248b54370f8e13e695be59d14c`.
The digest was identical immediately before and after capture. The run recorded
one trigger, no loop, 108 encoded frames at 12 fps, settled assets, and no
unexpected runtime proof blocker while the effect was active.

The parity result is nevertheless **rejected / BAD**. The v6 validator measured
the last visible Web frame at trigger `+3.0833333333 s`, outside the bound
`+3.2254050926 s` source endpoint by about 142 ms. At the `+1.3333333333 s`
visual anchor, Web contained 43 draw particles, 52 live Chunk models, and 76
raw-gamma additive VFX meshes, but its positive-delta-luma energy was 82.9%
below the native anchor because the stochastic impacts did not overlap in the
same screen region. A large Web impact also remained near trigger `+3.0 s`
where the native oracle showed only residual fires.

The rejected diagnostic comparison and its explicit `BAD` classification are
recorded in
`evidence/vfx-nwn-web-row28/comparison-v35-shared-scheduler-instance-frames-rejected-diagnostic/comparison-manifest.json`.
No validator tolerance, native oracle, seed, or asset-specific behavior was
changed to convert this rejection into a pass.
