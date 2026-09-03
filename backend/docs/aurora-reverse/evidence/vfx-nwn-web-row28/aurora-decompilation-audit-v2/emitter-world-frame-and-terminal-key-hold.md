# Aurora VFX emitter world-frame and terminal-key audit

Date: 2026-08-21

Status: implementation validated; fresh NWN-vs-Web visual proof pending

## Scope and authority

- Primary semantic authority: admitted Aurora Toolset decompilation at
  `C:/Projects/New Folder/export/decompiled_all.c`.
- Admitted Toolset binary SHA-256:
  `4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24`.
- Retail source model: `vff_rainmeteor.mdl`, SHA-256
  `ea57f0346166314602d9d473873cedde791f9911ef90722c114481a0b6ebf29b`.
- Immutable retail runtime oracle: `../nwn-runtime/v1/capture/nwn-row28-meteor-swarm-one-trigger-v8.mp4`,
  SHA-256 `bdddeb001cf59bb2d6476909adc3b1d022674b06b59749f39fc11fc290dc31de`.
- xoreos used: no.
- No Toolset or NWN process was launched for this audit. The existing immutable
  retail oracle remains the comparison authority.

## Recovered Aurora behavior

`FUN_00a2625c` resets a particle from the emitter's live evaluated state:

- `decompiled_all.c:852762-852768` copies the live emitter orientation into the
  new particle;
- `decompiled_all.c:852793-852795` copies the live emitter origin at offsets
  `+0x1b0/+0x1b4/+0x1b8` into the new particle position;
- `decompiled_all.c:852800-852805` preserves that origin as the previous
  position before the inheritance-velocity branch;
- `decompiled_all.c:854704-854720` separately preserves either the current
  emitter origin or the active source-part origin for the recovered inheritance
  branches.

Together with the previously recovered source-node parent graph, this requires
particle reset to consume the emitter's composed model-graph world transform.
The authored emitter-local transform alone is not a valid runtime spawn frame.

Aurora animation controllers also retain the terminal key after their final
timestamp. Returning the first key after the timeline ends would introduce a
non-source discontinuity and, for a trail emitter, an artificial full-path
burst.

## Defects found

1. The backend supplied only the emitter-local transform as `sourceMotion`.
   Parent transforms were available solely to the optional `inherit_local` and
   `inherit_part` active-particle lanes. Child emitters therefore spawned at
   local coordinates even when their parent mesh or pivot was animated.
2. The position, orientation, and scalar samplers checked `nextIndex <= 0`
   before `nextIndex < 0`. The `-1` result used after the final key therefore
   returned the first key instead of the last key.
3. Parent base timelines were sampled with the repeated local interval
   `0..dt`, rather than the actual previous/current source times.

These defects are shared runtime defects. None is specific to a VFX row,
resource name, node name, tile, creature, placeable, or model identity.

## Asset-neutral implementation

- The application service composes the previous/current parent world transform
  with the evaluated emitter-local transform and supplies the result as the
  runtime `sourceMotion` fallback.
- An explicit host `sourceMotionResolver` still has precedence.
- `ownerMotion` and `partMotion` remain separate and preserve their recovered
  inheritance semantics; the change does not enable inheritance flags that are
  absent from source data.
- Parent base timelines use the actual monotonically advancing source times.
- Position, orientation, and scalar samplers now distinguish `nextIndex === 0`
  from `nextIndex < 0`, retaining the terminal key after the timeline ends.

No implementation branch selects behavior by VFX ID, 2DA row, resref, node
name, or asset category.

## Regression evidence

Neutral test fixtures in `backend/test/unit/vfx.application.service.spec.ts`
cover:

- a child emitter under a translated, rotated, and scaled parent;
- future births following a moving parent while prior particles remain in world
  space when inheritance is disabled;
- terminal position, orientation, and scale keys after a finite timeline;
- inherited particles reprojected through an animated parent world frame.

The four tests failed against the prior implementation and pass after the
shared fix.

Regenerated row-28 fixture SHA-256:
`76DEB077899378BF8789D208DDF2BE550FCCA5A92C6B1814E530CDB5383416E8`.

Observed regenerated runtime facts:

- all six smoke emitters now follow six distinct falling parent trajectories;
- their peak active counts are 10 rather than the artificial 23-25 particle
  reset bursts;
- each smoke source retains its final impact-side position instead of
  teleporting back to the initial high position;
- both child emitters under the rotating pivot traverse the composed world
  orbit.

These facts validate the corrected runtime contract but do not by themselves
establish visual parity. Acceptance still requires a fresh guarded Aurora Web
MP4, the immutable NWN-vs-Web comparison MP4, frame contact sheet, validator
pass, and visual classification.
