# VFX row 216 P2P gravity runtime audit (2026-08-12)

## Status

- Aurora-first audit: complete.
- Fresh Aurora Web proof: complete, one accepted playback.
- Runtime tuning decision: no particle-math change is justified before the fresh proof comparison.
- xoreos: not consulted.

## Candidate contract

The selected effect is `visualeffects.2da#216`, label `VFX_BEAM_FIRE_LASH`.
Its duration owner is `progfx.2da#607`: Type `7`, model `vim_lashfire`,
animation `cast01`, requested duration `20.0` seconds.

Immutable source evidence:

- `evidence/vfx-nwn-broad-proof-2026-07-16/row216/sources/vim_lashfire.mdl`
- source SHA-256: `89561022afa322832b3c034b21c9b5a69d2c6e9e8caec762a76c21092f4b27bc`
- approved one-trigger NWN recording:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row216/nwn/nwn-row216-one-trigger.mp4`
- NWN recording SHA-256:
  `0b0d5e91d176710c5b38cd9b4c7c2b885c3c08ab3c10142d8242e96495484f67`
- validated NWN onset: `10.5238540692` video seconds
- validated NWN last visible frame: `30.4022450889` video seconds
- validated requested effect duration: `20.0` seconds
- validator result: one trigger, expected end marker, no retry, decodable MP4.

The NWN recording is the reusable retail oracle. It must not be replayed merely
to obtain alternate crops or timing samples.

## Source emitter graph

`vim_lashfire` contains five emitters:

| Emitter | Update/render | Texture | Birth rate | Life | Velocity | Size | P2P |
| --- | --- | --- | ---: | ---: | ---: | --- | --- |
| `Fire01` | Fountain / Linked / Lighten | `fxpa_white` | 50 | 1.5 | 4 | 0.03 to 0.02 | gravity 20, drag 0.1, inherited |
| `Fire02` | Fountain / Linked / Lighten | `fxpa_white` | 50 | 1.5 | 4 | 0.03 to 0.02 | gravity 20, drag 0.1, inherited |
| `Fire03aa01` | Fountain / Normal / Lighten | `fxpa_flare` | 50 | 1.3 | 4 | 1.0 to 0.1 | gravity 20, drag about 0.1, inherited |
| `Fire03aa` | Fountain / Normal / Lighten | `fxpa_flare` | 50 | 1.3 | 4 | 1.0 to 0.1 | gravity 20, drag about 0.1, inherited |
| `handbal` | Fountain / Normal / Lighten | `fxpa_flare` | 100 | 0.5 | 1 | 0.5 to 0 | local spread, no P2P target |

The four lash emitters reference `OmenRef02`. EffectBeam Type 7 reattaches the
source and target through the evaluated `Impact` nodes. The current fixture
binds source appearance `pfh0` and target appearance `c_yinnkeep`, separated by
approximately three metres. There are no source MDL light nodes; the visible
energy is additive particle material output.

## Primary Aurora decompilation evidence

Primary source: `C:\Projects\New Folder\export\decompiled_all.c`.

The native P2P update is recovered in `FUN_00a2c36c` around lines
`854383-855142`. The emitter flag accessors around lines `852420-852503`
independently establish the P2P and P2P-Bezier flag fields used by the runtime
contract.

For particles active before the current spawn pass, the gravity-target branch
uses this order:

1. Integrate current velocity into position.
2. Apply optional wind.
3. Resolve target pointer and target vector.
4. Evaluate the target-distance threshold.
5. Multiply velocity by `pow(drag, delta)`.
6. Add normalized target-direction gravity to velocity and position.
7. Derive motion direction and segment threshold state.
8. Apply inherited velocity.
9. Apply mass vertical acceleration and inherited-velocity decay.
10. Spawn new particles after the active-particle update.

This ordering is behavior evidence from Aurora decompilation, not from a
secondary implementation.

## Current implementation comparison

`backend/src/modules/vfx/domain/aurora-vfx-runtime-state.ts` currently:

- snapshots `activeParticleIds` before spawning;
- dispatches gravity P2P through `applyP2PGravityTargetMotion`;
- integrates existing velocity before target acceleration;
- uses `Math.pow(drag, dtSeconds)`;
- requires a resolved target context instead of inventing an origin fallback;
- performs P2P work before Fountain spawning;
- retains a diagnostic requirement for matched retail/runtime confirmation.

The current generated fixture has a `1/30` runtime tick, a `20.0` second
requested duration, `600` ticks, a `cast01` animation clip, five emitters, and
the exact `SRC_ALPHA / ONE` Lighten blend contract. Its payload SHA-256 at audit
time is `fec4b8040bd65edb5822fedfd2e73878e931a34e997bfe6f08a26a644bf8f61d`.

The recovered native ordering and current implementation agree. Therefore this
audit does not authorize speculative changes to drag, gravity, lifetime,
birthrate, P2P arrival, source/target attachment, or additive blending.

## Remaining proof questions

The fresh proof must determine whether the remaining visible differences belong
to one of these evidence classes:

- camera and scene composition;
- character `Impact` attachment pose or scale;
- linked-ribbon width, winding, or texture sampling;
- additive material intensity and RGB/RGBA handling;
- deterministic runtime phase at the aligned comparison frame.

Only a difference isolated by telemetry and matched NWN/Aurora Web frames may
authorize a shared renderer or runtime change. A Web-only image is not parity
proof.

## Proof gate

Acceptance requires:

- one fresh Aurora Web playback and no retry;
- exact `20.0` second requested duration;
- settled assets and canonical host graph;
- non-empty draw ledger for all expected lanes;
- runtime build identity and blocker manifest;
- saved Web MP4 plus an onset-aligned comparison against the immutable NWN MP4;
- visible frames shown to the user before claiming parity.

## Fresh proof result

The accepted Aurora Web proof is:

- `evidence/vfx-nwn-broad-proof-2026-07-16/row216/aurora-web/aurora-web-row216-one-trigger-p2p-audited-current-global-20260812.mp4`
- SHA-256: `fed5123aa1f809edc8600662faebde4d0b6e10e13d58266602b11c5ac4504382`
- deterministic capture: `720` encoded frames at `30` fps, `24.0` seconds;
- lifecycle: `2 + 20 + 2` seconds;
- playback: one trigger, no loop, zero overlap;
- final state: completed, post-duration hidden, proof gate `pass`, empty blocker manifest;
- host graph: exact five emitter names;
- assets: settled;
- draw ledger: Linked and ordinary textured lanes present;
- debug overlay: disabled.

The saved NWN MP4 was reused without launching or replaying NWN. The durable
onset-aligned comparison is:

- `evidence/vfx-nwn-broad-proof-2026-07-16/row216/comparison/nwn-vs-aurora-web-row216-p2p-audited-onset-aligned-20260812.mp4`
- comparison SHA-256:
  `d584d46168dddfc09819de1675348e196110ffa007994846fbdd4f9e1ae92342`
- contact sheet SHA-256:
  `da2b22990e17d75c17fb616ef71dad8182a8ef338063b469a3f460750d92d1f5`
- machine manifest:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row216/comparison/nwn-vs-aurora-web-row216-p2p-audited-onset-aligned-20260812.json`.

The current Web proof shows the same two smooth linked lash strands, additive
fire envelope, and source flare family as the retail oracle. The obsolete
segmented zig-zag shape is absent. Both effects cease in the post-effect sample.

Status remains `matched-with-open-camera-scene-gaps`, not pixel parity. The Web
fixture does not contain the retail room or actors and uses a different camera
composition, so apparent screen scale, actor occlusion, environmental spill,
and saturation cannot authorize particle-math or material tuning.

Focused verification completed before capture:

- backend P2P runtime: `95/95` tests;
- frontend canonical renderer, proof runner, and observability: `132/132` tests;
- broad resource-resolution fixture gate: `pass`.
