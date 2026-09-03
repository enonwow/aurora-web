# Object duration VFX owner runtime audit - 2026-07-19

## Verdict

Aurora does not implement a `Type_FD=D` object VFX by starting directly in a
proof-selected `duration` animation and hiding the model when the requested
effect duration expires. The client visual owner drives the same loaded model
through:

```text
impact -> looping duration -> cessation -> visual-owner removal
```

For `visualeffects.2da#1` `VFX_DUR_DARKNESS`, the loaded
`Imp_Root_M_Node=vdr_darkness` model contains all three animations. The
cessation animation is selected on that same model even though the row has no
separate `Ces_Root_M_Node`.

## Source classification

Primary Aurora runtime evidence:

- retail NWN Linux client static disassembly;
- retail `visualeffects.2da#1`;
- retail `vdr_darkness.mdl`;
- preserved validated single-trigger NWN runtime proof.

No xoreos source, comments, executable behavior, or derived implementation
structure were used. `sourceClass: secondary-gpl-reference` is not applicable.

## Audited client

- source:
  `C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\linux-x86\nwmain-linux`;
- analysis copy:
  `C:\Users\enonw\AppData\Local\Temp\aurora-nwmain-linux-analysis`;
- SHA-256:
  `6D19C39BC646AF5DDBC333FF31797A4ACD9019506BCB45EF1B93B1BD5925E700`;
- ELF build ID:
  `3f0beeb9434ae21995d4b03c8b20989a3d09d132`.

The analysis was static. No NWN or Toolset process was started.

## Start contract

`CNWCVisualEffectOnObject::StartVisualEffect` begins at `0x81b4b0`.

For each of the three possible loaded model owners at object offsets
`0x88`, `0x90`, and `0x98`, the function:

1. clears the corresponding owner timer;
2. asks the model for animation `_impact`/`impact`;
3. if present, selects it, writes owner state `1`, and stores the recovered
   animation length in milliseconds;
4. if `impact` is absent and the VFX is a duration owner, selects `duration`
   immediately and writes owner state `2`;
5. otherwise installs the one-second fallback timer used by non-duration
   completion.

Relevant ranges:

- owner loop: `0x81b500..0x81b565`;
- impact success and length: `0x81bae0..0x81bb29`;
- duration fallback: `0x81bb30..0x81bb5e`.

The selected-source row's `SoundImpact` and `SoundDuration` stay separate:
impact is a one-shot at the target position, while duration creates a looping
3D sound source.

## Update contract

`CNWCVisualEffectOnObject::Update(unsigned int)` begins at `0x81c0b0`.
It decrements each non-zero model-owner timer.

When a state-1 impact timer expires:

- a non-duration owner is marked done;
- a duration owner writes state `2` and selects `duration`.

Relevant range: `0x81c240..0x81c2c8`.

State `2` has no owner completion timer. The `duration` animation therefore
continues under the effect owner's lifetime until the server-side temporary
effect is removed. The requested temporary effect duration is not replaced by
the model animation length.

## Stop and cessation contract

`CNWCVisualEffectOnObject::StopVisualEffect(int)` begins at `0x81bc80`.

For every loaded model owner it:

1. asks for `cessation`;
2. selects `cessation`;
3. if present, writes state `3` and stores its animation length in
   milliseconds;
4. sets the post-removal timer to `cessation length + 3000 ms`;
5. if absent, uses a `3000 ms` post-removal timer and marks that owner done.

Relevant ranges:

- owner cessation loop: `0x81bccd..0x81bd60`;
- successful cessation length/state: `0x81bd25..0x81bd52`;
- absent-cessation fallback: `0x81bf30..0x81bf44`.

When the state-3 timer expires, `Update` calls `SetEffectDone`, marks removal
state, and prevents the owner from returning to duration:
`0x81c255..0x81c283`.

`SoundCessation` is a separate one-shot. The looping duration sound source is
stopped and destroyed at `0x81bee3..0x81bf06`.

## Row 1 source facts

`visualeffects.2da#1`:

- label: `VFX_DUR_DARKNESS`;
- `Type_FD=D`;
- `Imp_Root_M_Node=vdr_darkness`;
- `SoundImpact=sdr_darkness`;
- no duration ProgFX or sound;
- no separate cessation model slot.

`vdr_darkness.mdl`:

- one `Single` emitter, `DARK_Spot`;
- render mode `Billboard_to_World_Z`;
- blend `Normal`;
- texture `fxpa_Dot01`;
- one ambient-only dynamic light, source name `Negitive_Light`;
- light color `[-1,-1,-1]`;
- light multiplier `8`;
- light is source-marked `fadingLight`.

Recovered animation data:

| Animation | Length | Negative-light radius |
| --- | ---: | --- |
| `impact` | about `0.300000 s` | `0 -> 5.5` |
| `duration` | about `1.666670 s` | `5.5 -> 6.0 -> 5.5`, looping |
| `cessation` | about `0.633333 s` | `5.5 -> 0` |

## Retail proof boundary

The preserved oracle is:

- `evidence/vfx-nwn-broad-proof-2026-07-16/row1/nwn/nwn-row1-one-trigger.mp4`;
- SHA-256:
  `9cdc57cf5f559f58f019994e9680266d64b2b2e527b6fea395710b2b4fdb78c7`;
- validation:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row1/nwn/validated-summary.json`;
- requested duration: `20.0 s`;
- exactly one trigger and expected end marker.

The oracle shows both the black world-Z volume and the negative-light response
on retail scene receivers and creatures. An isolated transparent canvas or
solid background cannot prove that scene-integrated behavior.

## Implementation boundary

The implementation may now:

- add a versioned object-duration owner schedule to runtime input/output;
- select model/emitter and light animation per runtime frame;
- keep the requested 20-second owner lifetime independent of the duration
  animation loop length;
- append the proven cessation interval after effect removal;
- expose current owner phase, animation time, removal state, and source-light
  radius in telemetry;
- evaluate the VFX against source-backed retail-area receiver geometry.

The following remained outside the parity claim at this checkpoint:

- exact client tick quantization around the server removal packet;
- retail creature material response in the proof scene;
- omitted modular source/target creature models;
- local tile lights and exact retail camera;
- exact negative-light/material/postprocess pixel response.

The integer tick and packet-order item was subsequently resolved by
`vfx-object-duration-owner-integer-tick-audit-2026-08-13.md`. The other open
items still do not permit a duration-only animation loop or a scene-parity
claim.

## Implemented checkpoint and fresh proof

At this historical checkpoint Aurora Web packaged
`aurora-object-duration-visual-owner/v1`. That continuous schedule was
superseded on 2026-08-13 by
`aurora-object-duration-visual-owner/v2`, which follows the retail integer
timer and same-frame update contract. Row 1 now uses:

- a `300 ms` impact owner timer;
- looping `duration` until requested removal at `20.0 s`;
- a `633 ms` cessation owner timer and `3633 ms` post-removal timer;
- update-boundary release, with zero particle draw and zero source lights once
  the model owner is done.

The fixture uses four source-backed horizontal floor receiver models and
fourteen source textures from the preserved retail Area packet. It no longer
uses the old isolated gray receiver as parity evidence.

The formerly accepted Web proof is:

- `evidence/vfx-nwn-broad-proof-2026-07-16/row1/aurora-web/aurora-web-row1-one-trigger-native-owner-scene-observability-v2-20260719.mp4`;
- SHA-256:
  `eff912b5e885384ba0c741c2efd450cf689c8207468fc4415d5c28628a237e00`;
- duration `24.75 s`, `198` deterministic CDP frames at `8 fps`;
- `2 s` baseline, one `20.75 s` owner playback, and clean post-roll;
- observability `aurora-vfx-runtime-observability/v1`: identity ready, host
  graph pass, `20/20` assets settled, one draw record, one trigger, no loop,
  no overlap, final overlay disabled, and proof gate pass with zero blockers.

The saved NWN MP4 was reused without starting NWN. The comparison packet is
`evidence/vfx-nwn-broad-proof-2026-07-16/row1/comparisons/object-duration-owner-comparison-v2-20260719.json`.
Its status was
`matched-with-open-scene-camera-creature-negative-light-material-gaps`, not
pixel parity. It predates owner runtime `v2` and is therefore historical, not
current proof for integer tick behavior. Its draw ledger reports a roughly `33.94 x 33.94`
textured `DARK_Spot` footprint while the source-light radius remains in the
recovered `5.5..6.0` range. Therefore the visible halo outside the partial
receiver geometry is not assigned to negative-light attenuation without a
complete receiver scene.

The first `v1` CDP attempt is retained only as a fail-closed blocker manifest.
Its MP4 was deleted because the capture validator initially understood only
catalog visibility fields. The validator now has a separate comparison-runner
contract test; `v1` is not proof and was not folded into `v2`.
