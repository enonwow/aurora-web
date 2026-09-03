# VFX Animation-Origin Event Boundary Audit

Date: 2026-07-19  
Scope: first selected-animation interval and model-header `event 0 detonate` dispatch  
Policy: Aurora-first; no xoreos or other GPL secondary source was used

## Status

Confirmed for implementation.

Aurora Web must preserve the recovered normal forward event interval
`(previousTimeSeconds, currentTimeSeconds]`. The first interval of a newly
started selected-animation playback must additionally admit source events at
the animation origin (`timeSeconds == 0`) exactly once. This is a playback
start rule, not a global change from an exclusive to an inclusive lower
boundary.

## Primary decompilation evidence

`FUN_00a186fc` is the Aurora animation event interval scanner:

- `C:\Projects\New Folder\export\decompiled_all.c:844407-844461`
- Forward scanning accepts each event whose time is greater than the previous
  time and less than or equal to the current time.
- Wrapped forward scanning is split through the positive and negative
  sentinel ranges, preserving the origin-side half of the interval.
- The scan iterates source rows independently, so duplicate same-time rows
  remain duplicate callbacks.

The active-animation update records the previous animation time, advances the
current time, evaluates animation state, and calls the event scanner:

- `C:\Projects\New Folder\export\decompiled_all.c:846113-846168`

The detonate callback and Explosion update remain separate stages:

- `C:\Projects\New Folder\export\decompiled_all.c:852370-852374`
- `C:\Projects\New Folder\export\decompiled_all.c:857152-857297`

This evidence confirms the normal interval equation and callback-before-family
update order. It does not justify making every lower boundary inclusive.

## Primary retail and source evidence

Fixture row 44 resolves `VFX_IMP_ACID_S` to the retail binary model
`vim_explacid.mdl`.

- Model SHA-256:
  `64c610ac4ebce0f7c0b79af2432e430943fe5280db5948df8300a2360cb7c6d3`
- Source manifest:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row44/source-manifest.json`
- The model contains two model-animation-header rows:
  `{ time: 0, type: "detonate", animationName: "impact" }`.
- The model contains two Explosion emitters, `sparks` and `acid`, plus one
  Fountain emitter, `cloud`.
- Neither Explosion emitter has a direct/key/bezier detonate field that can
  replace the model-header event.

The saved retail NWN capture proves that one application of row 44 visibly
executes its impact:

- MP4:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row44/nwn/nwn-row44-one-trigger-approved-recapture.mp4`
- MP4 SHA-256:
  `6db297444b59edaee29c3b9e4b465cb6bee29013a693d9cec22ad0302ee5c95d`
- Trigger ledger records exactly one trigger and no retry.
- Validated onset is `11.5919629057187 s`; last visible time is
  `12.87995878413189 s`.

The paired source and retail result independently require the two source
events at animation time zero to be reachable on playback start. Otherwise
both Explosion emitters remain empty, which is the current Aurora Web row-44
failure (`maxActiveParticleCount: 0` for both emitters).

## Implementation contract

1. Keep normal forward scans as `(previous, current]`.
2. Keep wrap scans as `(previous, animationLength] U [0, current]`.
3. Mark only the first sampled interval of a newly started selected-animation
   playback as `includesAnimationOrigin`.
4. For that first interval, accept `time == 0` in addition to the normal
   forward interval.
5. Preserve duplicate source rows and callback trace entries.
6. Keep the detonate latch byte semantics: duplicate callbacks in one update
   do not become multiple additive bursts.
7. Dispatch model-header events to every Explosion emitter in the model, not
   to Fountain emitters.
8. Do not replay the origin event on later non-wrap ticks.
9. A real loop wrap may include origin events again through the already
   recovered wrap interval.

## Required verification

- Unit regression: a playback from `0` through its first positive boundary
  dispatches both duplicate `t=0` model-header callbacks to every Explosion
  emitter exactly once and dispatches none to a Fountain emitter.
- Existing non-origin forward and wrap interval tests remain green.
- Regenerated row-44 fixture reports non-zero peak particle counts for
  `sparks` and `acid`, and zero final particles. Its simulation step must be
  `1/60 s` or finer because both Explosion emitters have `lifeExp = 0.1 s`;
  the fixture must prove a non-zero previous/current Motion Blur segment for
  `sparks` and positive post-start size for `acid`, not only active-particle
  counters.
- One fresh guarded Aurora Web capture must pass runtime identity, canonical
  host graph, asset settlement, draw ledger, single-playback guard, and proof
  gate checks.
- Comparison must reuse the saved NWN MP4 and align both videos by measured
  onset. No second NWN trigger is allowed.

## GPL boundary

No xoreos source, comments, algorithms, naming observations, or other
GPL-covered secondary material were consulted or used for this audit.
