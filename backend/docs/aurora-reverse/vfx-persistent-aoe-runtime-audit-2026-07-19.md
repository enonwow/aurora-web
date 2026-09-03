# Persistent AOE visual runtime audit - 2026-07-19

## Verdict

Aurora's persistent AOE client runtime does not render one looping model at
the effect origin. It owns one independently scheduled visual model for every
active footprint entry declared by `NUMACT01..03`.

For `VFX_PER_FOGACID` (`vfx_persistent.2da` row 0), retail therefore owns 20
visual model instances:

- 5 instances of group 1, `DURATION01=3400`;
- 10 instances of group 2, `DURATION02=1100`;
- 5 instances of group 3, `DURATION03=1900`.

Every instance cycles through:

```text
random position -> impact -> duration -> cessation -> random position
```

The current Aurora Web comparison fixture, which loops one `duration`
animation at one origin, is not the retail ownership model. This is the
confirmed cause of the compact isolated cloud in the old broad proof.

## Source classification

Primary Aurora runtime evidence:

- retail NWN Linux client static decompilation;
- retail NWN Linux server static decompilation;
- retail `vfx_persistent.2da` and `vps_fogacid.mdl` source assets.

No xoreos source, comments, executable behavior, or derived implementation
structure were used. `sourceClass: secondary-gpl-reference` is therefore not
applicable to this audit.

## Audited binaries

Client:

- source:
  `C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\linux-x86\nwmain-linux`
- analysis copy:
  `C:\Users\enonw\AppData\Local\Temp\aurora-nwmain-linux-analysis`
- SHA-256:
  `6D19C39BC646AF5DDBC333FF31797A4ACD9019506BCB45EF1B93B1BD5925E700`
- ELF build ID:
  `3f0beeb9434ae21995d4b03c8b20989a3d09d132`

Server:

- source:
  `C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\linux-x86\nwserver-linux`
- analysis copy:
  `C:\Users\enonw\AppData\Local\Temp\aurora-nwserver-linux-analysis`
- SHA-256:
  `D6D952826B671FC62C376DCA912E87F1AA45D4AA81C620E912CEB4D8E051111D`

The analysis was static. No NWN or Toolset process was started.

## Server ownership

`CNWSAreaOfEffectObject::LoadAreaEffect(int)` at `0x5d3990` reads:

- `SHAPE`;
- `RADIUS` for a circle, or `WIDTH` and `LENGTH` for a rectangle;
- `ONENTER`, `HEARTBEAT`, and `ONEXIT`;
- `LABEL`.

It calls `SetShape` and owns the gameplay sub-area and script lifecycle.
The server loader does not read `MODEL*`, `NUMACT*`, `DURATION*`, or
`EDGEWGHT*`. Those fields belong to the client visual owner.

Relevant server symbols:

- `CNWSAreaOfEffectObject::SetShape`: `0x5d37a0`;
- `CNWSAreaOfEffectObject::UpdateSubAreas`: `0x5d5880`;
- `CNWSAreaOfEffectObject::AIUpdate`: `0x5d7c80`.

## Client load contract

`CNWCAreaOfEffectObject::LoadEffect(unsigned int)` at `0x717e20` reads:

- `OrientWithGround`;
- `DurationVFX`;
- `SHAPE`, plus its circle or rectangle dimensions;
- `MODEL01..03`, or `MODELMIN01..03` under the low-quality option;
- `NUMACT01..03`;
- `DURATION01..03`;
- `EDGEWGHT01..03`;
- the impact, duration, cessation, and one-shot sound fields.

It sums `NUMACT01..03`, allocates exactly that many
`CNWCAnimBaseVisualEffect` owners, and loads the model selected for each
group. For row 0 the sum is `5 + 10 + 5 = 20`.

The three `EDGEWGHT` floats are converted at `0x7189ef..0x718a2d`:

```text
edgePercent = min(trunc(edgeWeight * 100.0), 100)
```

The resulting percentage byte is used during random placement to choose
between an edge point and an interior point.

## Initial scheduling

`LoadEffect` gives every owner a deterministic initial delay:

| Group | Local index `i` | Initial delay |
| --- | ---: | ---: |
| 1 | `0..NUMACT01-1` | `i * 300 ms` |
| 2 | `0..NUMACT02-1` | `300 + i * 400 ms` |
| 3 | `0..NUMACT03-1` | `700 + i * 350 ms` |

The formulas are visible at:

- group 1: `0x71989f..0x7198bd`;
- group 2: `0x7199f6..0x719a31`;
- group 3: `0x719b65..0x719b96`.

For `VFX_PER_FOGACID`, the first scheduled starts are:

```text
group 1: 0, 300, 600, 900, 1200
group 2: 300, 700, 1100, 1500, 1900, 2300, 2700, 3100, 3500, 3900
group 3: 700, 1050, 1400, 1750, 2100
```

## Per-instance phase machine

Relevant client symbols:

- `CNWCAreaOfEffectObject::SetAnimation`: `0x714ff0`;
- `CNWCAreaOfEffectObject::ResetTimer`: `0x715160`;
- `CNWCAreaOfEffectObject::SetMoveTimer`: `0x7153f0`;
- `CNWCAreaOfEffectObject::SetInstanceRandomPosition`: `0x7159e0`;
- `CNWCAreaOfEffectObject::UpdateInstancePosition`: `0x716620`;
- `CNWCAreaOfEffectObject::AIUpdate`: `0x716a60`;
- `CNWCAreaOfEffectObject::StopEffect`: `0x7151d0`.

Recovered state transitions:

1. Initial delay reaches zero.
2. `SetInstanceRandomPosition(index)` chooses a new footprint point.
3. `SetAnimation(1,index)` plays `impact`.
4. When `impact` finishes, `AIUpdate` calls `SetAnimation(2,index)`.
5. `ResetTimer(index)` selects the matching `DURATION01..03` value.
6. While state 2 is active, `UpdateInstancePosition` decrements that duration.
7. At zero it calls `SetAnimation(3,index)` for `cessation`.
8. When `cessation` finishes, `AIUpdate` installs a 1 ms move timer.
9. On the next move expiry, the owner receives a new random position and
   returns to `impact`.

The model animations in `vps_fogacid.mdl` expose all three required phases:

- `impact`: approximately `0.3 s`;
- `duration`: `2.0 s`, while the group duration timer controls residency;
- `cessation`: `2.0 s`.

The `duration` animation may repeat while its group timer remains positive.
The owner does not change position during that residency.

## Footprint placement

`SetInstanceRandomPosition` selects the group from cumulative active counts.
It then compares `rand() % 100` with the group's `edgePercent`.

For a circular shape:

- edge placement chooses one coordinate and derives the other from
  `sqrt(radius^2 - coordinate^2)`, with independently randomized signs;
- interior placement chooses `x` on a 0.01 grid and then chooses `y` within
  `[-sqrt(radius^2-x^2), +sqrt(radius^2-x^2)]`.

For a rectangle, the corresponding branch uses half-width and half-length
extents and the same edge-versus-interior decision.

If `OrientWithGround` is enabled, retail performs a floor hit query, moves the
owner to the hit point, and applies `RotationArc` from world up to the hit
normal. Moving the AOE anchor updates all owner positions and repeats ground
orientation as required.

## Stop contract

`CNWCAreaOfEffectObject::StopEffect`:

- plays `SoundCessation`;
- stops `SoundDuration`;
- marks the AOE visual owner as stopping;
- selects animation 3 for the optional `DurationVFX`;
- selects `cessation` for every footprint owner;
- clears their timers;
- installs a 3000 ms post-removal timer.

No new random positions or impact phases may begin after stop.

## Row 0 source facts

`VFX_PER_FOGACID` declares:

- shape `C`;
- radius `5`;
- `MODEL01..03=vps_fogacid`;
- `MODELMIN01..03=vps_fogacid_L`;
- active counts `5,10,5`;
- durations `3400,1100,1900 ms`;
- edge weights `0,0.25,0.25`;
- duration sound `sps_fog_loop`;
- one-shot sound `sps_fog`;
- one-shot probability `0.3`.

## Implementation boundary

The implementation may now reproduce the recovered ownership, scheduling,
phase, stop, and geometric placement contracts. It must remain additive and
versioned across the backend/frontend boundary.

The following details remain outside the parity claim until separately proven:

- exact retail `rand()` sequence and seed;
- walkmesh collision provider and final floor-normal sampling in the isolated
  proof fixture;
- sound playback parity;
- low-quality model selection UI policy;
- exact retail proof camera and scene lighting.

Those unknowns do not justify replacing the confirmed 20-owner state machine
with a single proof-only loop. They must instead remain explicit diagnostics
and comparison limitations.

## Implemented contract

The recovered contract is implemented in:

- `backend/src/modules/vfx/domain/aurora-vfx-aoe-visual-runtime.ts`;
- `backend/src/modules/vfx/domain/aurora-vfx-source.parser.ts`;
- `backend/src/modules/vfx/application/vfx.application.service.ts`;
- `frontend/src/modules/layout/adapters/three/auroraVfxCanonicalRenderer.ts`.

The backend now builds 20 independent visual owners for row 0, applies the
three recovered initial-delay formulas, and advances each owner through
`waiting`, `impact`, `duration`, and `cessation`. Each owner carries its own
group, model, position, edge/interior placement decision, timer, cycle, and
phase into the render package. The two emitters in `vps_fogacid.mdl` therefore
produce 40 runtime emitter instances rather than two emitters at one origin.

The proof fixture uses a deterministic replay seed so that Web captures are
repeatable. It is explicitly labelled
`deterministic-replay-seed-not-retail-seed`; it is not a claim about Aurora's
runtime seed. The canonical renderer materializes only the selected frame for
this 81-frame, 28 MB fixture and exposes deduplicated owner/phase telemetry.

Focused verification after implementation:

- backend VFX tests: `58/58` passed;
- frontend canonical renderer/proof tests: `62/62` passed;
- backend production build: passed;
- frontend production build: passed.

## Fresh comparison proof

The NWN side is the already validated single-trigger oracle. NWN was not
started again:

- MP4:
  `evidence/vfx-nwn-broad-proof-2026-07-16/aoe0/nwn/nwn-aoe0-one-trigger.mp4`;
- SHA-256:
  `bcb3d4d9ba1b056770ca33548b2660ef73fab7d2f67baf73d55dcc977d025c09`;
- validation:
  `evidence/vfx-nwn-broad-proof-2026-07-16/aoe0/nwn/validated-summary.json`;
- accepted status: `valid-single-trigger-visible-nwn-oracle`;
- requested AOE duration: `20.0 s`;
- exactly one trigger marker and one expected end marker.

The Web side is one fresh continuous playback of the new implementation:

- MP4:
  `evidence/vfx-nwn-broad-proof-2026-07-16/aoe0/web/aurora-web-aoe0-one-trigger-native-20-owner-v4-20260719.mp4`;
- SHA-256:
  `0f38002255086895e5604dab9172f842041f70d4f19224484bd71acde1cf4c7f`;
- capture summary:
  `evidence/vfx-nwn-broad-proof-2026-07-16/aoe0/web/aurora-web-aoe0-one-trigger-native-20-owner-v4-20260719-summary.json`;
- trigger count: `1`;
- loop: `false`;
- active runtime frames: `80`;
- active visual owners: `20`;
- runtime emitter instances: `40`;
- requested effect duration: `20.0 s`.

The final post-roll sample intentionally reports zero active owners and zero
draws. The accepted owner count is taken from the active timeline, not from
that post-removal sample.

Visual comparison artifacts:

- fresh Web still:
  `evidence/vfx-nwn-broad-proof-2026-07-16/aoe0/web/aurora-web-aoe0-native-20-owner-t3-20260719.png`;
- active-phase NWN/Web comparison:
  `evidence/vfx-nwn-broad-proof-2026-07-16/aoe0/comparisons/nwn-t14-vs-aurora-web-native-20-owner-t3-20260719.png`;
- machine-readable verdict:
  `evidence/vfx-nwn-broad-proof-2026-07-16/aoe0/comparisons/native-20-owner-comparison-validation-20260719.json`.

Verdict: `matched-with-open-scene-material-gaps`. The principal ownership and
footprint defect is closed: Web now renders a broad, independently phased fog
field instead of one compact origin cloud. Pixel parity is not claimed because
the isolated Web fixture lacks the retail scene, occlusion and lighting, and
the exact retail RNG, walkmesh grounding, sound scheduling and material
response remain open.

## 2026-08-07 exact-scene comparison update

The comparison fixture now uses the exact saved `enon_test_effect` ARE/GIT
sources extracted from the immutable AOE proof module. The extractor admits
only the two base-tiles resolved by `tin01.set`; the two unresolved source tile
ids and both unavailable actors remain explicit omissions rather than fallback
geometry. The source hashes are:

- module: `bfc6992cdb2d72d34e1cf421fb860e922f173fd649e20bb24aea33535c31a4c4`;
- ARE: `afdb077f76ae1a9cde5175333a82b276a7cbac0e93517cf040fa24dba2c402c6`;
- GIT: `bd3637343c89bb7c719a260cd61d07f5774be21a9b840107451abe9c046df8e6`.

The Web proof camera is fitted against the saved NWN baseline and seven exact
source-scene origin/table correspondences. The fit has `6.499439491 px` RMS
reprojection error under the declared `8 px` diagnostic tolerance. This is a
measured proof-harness camera, not a recovered Aurora camera. Full method and
input points are recorded in
`vfx-aoe0-proof-camera-planar-calibration-audit-2026-08-07.md`.

The current deterministic Web timeline does not call a playback hook. It
renders one non-looping 27-second timeline containing the requested 20-second
effect, the recovered 3-second cessation envelope, and post-roll:

- Web MP4:
  `evidence/vfx-nwn-broad-proof-2026-07-16/aoe0/aurora-web/aurora-web-aoe0-static-timeline-v87-aoe-exact-scene-calibrated-camera.mp4`;
- Web SHA-256:
  `4fc840047392daec49b12508d630f7b0ec69ebc066daa3755bf95aad6eacd4b4`;
- onset-aligned NWN/Web MP4:
  `evidence/vfx-nwn-broad-proof-2026-07-16/aoe0/comparisons/nwn-vs-aurora-web-aoe0-v87-exact-scene-calibrated-camera-onset-aligned.mp4`;
- comparison SHA-256:
  `33bcb2b95f6fb4e9b99a48f9bdb1f3d0622ed087cee6e53d5f27d969725709dc`;
- contact sheet SHA-256:
  `9703e07b1f498fcd3d3962588cb219c11fe44c6a18aaf8c4399345db91df8342`.

The active proof gate passes with 20 owners, 40 attached emitter instances,
settled assets, and no overlapping playback. The intentionally empty final
post-effect sample fails the active draw-ledger gate while independently
passing `completed=true` and `postDurationHidden=true`; it is cessation
evidence, not an active-frame proof sample.

No RGBA correction is justified by this comparison. The retail binary source
for `vps_fogacid` contains complementary `Ring01` and `Ring02` alpha lanes
(`0 -> 1` and `1 -> 0`), both use `Normal`, and the renderer uses the
Aurora-first confirmed `GL_SRC_ALPHA / GL_ONE_MINUS_SRC_ALPHA` path. Exact RNG,
walkmesh grounding, sound, the unresolved half of the source tiles, actor
occlusion, exact retail camera, and exact scene lighting remain outside the
parity claim. No xoreos source was used.
