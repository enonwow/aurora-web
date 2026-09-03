# VFX shared rand15 stream audit (2026-08-07)

## Scope

This audit answers one shared-runtime question: whether Aurora gives every MDL emitter an
independent random seed or consumes one runtime random stream while emitters are updated.
It applies to all emitter families and source-MDL hosts, including placeables. It does not
claim that a deterministic Web seed equals the unknown seed/state of a saved retail run.

## Sources

- Primary decompilation: `C:\Projects\New Folder\export\decompiled_all.c`
- SHA-256: `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`
- No xoreos or other GPL secondary source was used.

## Primary observations

1. `FUN_00b90fe8`, lines 1061777-1061789, reads and writes one thread-runtime state,
   advances it as `state * 0x015a4e35 + 1`, and returns `(state >> 16) & 0x7fff`.
2. `FUN_00b90fbc`, lines 1061762-1061772, is the matching seed/reset path. It writes the
   same runtime state, clears the adjacent high word, and advances the generator once.
3. Client startup, lines 237909-237910, seeds that runtime state from the local-time helper
   `FUN_00b95f20`. The helper implementation at lines 1066540-1066552 reads local system
   date/time and resolves an integer time value.
4. Particle construction and emitter-family helpers call the same `FUN_00b90fe8` entry:
   examples occur at lines 852778-852780, 853018-853045, 853172-853191,
   855219-855287, and 857814-857834.
5. There is no `FUN_00b90fbc` reseed call in the audited VFX runtime range
   852700-857900. Therefore those emitter updates advance one existing runtime stream;
   emitter names and emitter indices do not create independent Aurora seeds.

## Previous Web divergence

`VfxApplicationService` initialized emitter zero from the requested deterministic seed,
then initialized later emitters from a SHA-derived value containing the emitter index and
node name. This made every emitter an independent random sequence. It could change the
relative distribution of waves, chunks, Fountain particles, P2P paths, and Lightning
jitter in every multi-emitter effect.

## Implementation

- `backend/src/modules/vfx/application/vfx.application.service.ts` now owns one
  `aurora-rand15` state for an entire runtime package.
- Each emitter receives the current shared state immediately before its update.
- The resulting state is handed to the next emitter in source update order and carried
  into the next substep/tick.
- The old node-name/index seed derivation was removed.
- `createAuroraEmitterRuntimeState` keeps its explicit per-state seed API for isolated unit
  tests and deterministic single-emitter replay; package orchestration is the owner of
  cross-emitter stream continuity.
- There are no row, model, emitter-name, Fireball, or host-category conditions.

## Regression

`backend/test/unit/vfx.application.service.spec.ts` runs two randomized Fountain emitters
for two ticks. Each spawned particle consumes four rectangle samples. The assertions prove
that emitter one ends at sample 12 and emitter two continues to sample 16 of the same
stream. Before the implementation, emitter two ended on its independent hashed sequence.

## Open retail facts

- The exact RNG state at the beginning of the saved NWN capture is unavailable.
- Other systems may consume the process/thread stream before or between the observed VFX
  updates; their complete ordering has not been recovered.
- The deterministic Web `runtime.seed` is therefore a replay state, not a claim that it is
  the retail `srand` argument or the exact state from an encoded NWN frame.
- Visual differences must not be corrected by searching seeds until a retail runtime state
  and call-order proof exists.

## Verification

- Focused application regression: 42/42 passed.
- Runtime state, application, render-contract, and wind-manager suites: 170/170 passed.
- Seven broad fixtures regenerated offline.
- Broad comparison context: 7/7 passed.
- Resource gate: 98 edges, 67 resolved, 9 unresolved sound/ProgFX-row edges, and
  22 source-only edges.
- Row 44 animation-origin and source-scene gates passed; all emitters ended at zero.
- Row 50 source-scene gate passed.
- Row 210 Lightning gate preserved the native 3/65-point paths.
- `nest build` emitted the updated VFX application module. The command returned nonzero
  on the unrelated existing `scripts/build-area-create-native-proof-module.ts:350`
  resource-type union error; no Area code was changed for this VFX task.

## Fresh row 22 proof

The guarded static preflight used build identity `worktree-v76` with image digest
`sha256:177778de33b719881ffbe5b8587b169124a397f5597f701491a017e94d352b2f`.
Identity, host graph, asset settlement, draw ledger, particle shader ledger, playback
guard, and proof gate passed; the blocker manifest was empty and playback hooks were not
available to preflight.

Exactly one Aurora Web playback was then captured. The shell wrapper timed out while the
same child process was still encoding; the process completed and wrote its MP4/summary.
No retry or second playback was started.

- Web MP4:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/web/aurora-web-row22-one-trigger-v76-shared-rand15-stream-20260807.mp4`
- Web SHA-256: `9300ae50f8a8ca5afb619dc4bba3fd8122cced555438b7bcf0068cdc2141b585`
- Saved NWN MP4 reused without rerun, SHA-256:
  `f6414e0d184131ce74836c208e6334bb62cf023c502725223758185dd41f0983`
- Onset-aligned comparison MP4 SHA-256:
  `d5c223fd6980f4d344e01c0704a71d84091e99122fd7ca333beface7b46fa766`
- Comparison PNG SHA-256:
  `6215636a4dc88f244ad6d09c2dbe1741028059166a11ddbc0e5435080b1526e4`

Validation proves one playback, loop disabled, overlap zero, proof-gate PASS, a clean
post-roll, and zero final particles for all six emitters. All eight Chunk particles land
and disappear; the collision ledger records 1208 queries, 187 applied hits, and 1021
static no-hits.

The shared stream removes the unsupported per-emitter hash and changes the relative
particle/chunk distribution. Visual parity remains open: the Web core is larger and more
overexposed, its red tail is broader, and camera/scene/actors do not match the saved NWN
view. The saved NWN MP4 has no per-frame runtime timestamps, so encoded-frame differences
do not authorize lifecycle tuning. Status is
`diagnostic-only-single-playback-open-context-gaps`, not parity.
