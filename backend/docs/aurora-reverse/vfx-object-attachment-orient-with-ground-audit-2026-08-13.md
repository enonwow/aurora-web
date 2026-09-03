# VFX object attachment OrientWithGround audit

Date: 2026-08-13

Status: `primary-runtime-semantics-implemented`; visual parity remains subject
to matched per-fixture proof.

## Source policy

- Aurora-first: yes. Implementation followed retail-client disassembly before
  code changes.
- Primary binary:
  `C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\linux-x86\nwmain-linux`.
- Binary SHA-256:
  `6D19C39BC646AF5DDBC333FF31797A4ACD9019506BCB45EF1B93B1BD5925E700`.
- xoreos used: no.
- NWN or Toolset launched: no.
- Existing NWN and Aurora Web MP4 files were not replaced during this audit.

## Recovered contract

`CNWCVisualEffectOnObject::LoadVisualEffect` reads the exact
`OrientWithGround` column at `0x81882b-0x8188a9`. The embedded column string is
present at `0x131b350`. The parsed flag is stored at visual-effect object offset
`+0x120` (`0x818821` for zero and `0x8191c8` for nonzero).

`CNWCVisualEffectOnObject::ReAttachVisualEffect` at `0x8170a0` selects a
different attachment-node namespace for each target category. The recovered
mapping is:

| Target | Ground/root slot | Impact slot | Head slot |
| --- | --- | --- | --- |
| Creature/default object | Gob root, represented by an empty node name | `impact` | `head` |
| Placeable | `<exactModelPrefix>_ground` | `<exactModelPrefix>_impact` | `<exactModelPrefix>_head_hit` |
| Door | `<exactDoorPrefix>grnd` | `<exactDoorPrefix>impc` | `<exactDoorPrefix>hhit` |

The creature head node is therefore `head`. The source column name
`Imp_HeadCon_Node` does not authorize substituting the separate model node
`headconjure`. Placeable and door names require their exact source-backed
prefix; the implementation must not guess it from display labels.

For each admitted effect Gob, `ReAttachVisualEffect` then dispatches through
`Gob::AttachToObject`:

- when `OrientWithGround != 0`, calls at `0x817330-0x817335`,
  `0x817414-0x817419`, and `0x8174f6-0x8174fb` pass mode `0`;
- when `OrientWithGround == 0`, branches at `0x817738`, `0x8177a0`, and
  `0x817810` pass mode `3`.

`Gob::AttachToObject` at `0x43e0e0` maps those modes to distinct behavior
classes:

- mode `0` constructs `CAurBehaviorAttach` at `0x43e1d0-0x43e1e9`;
- mode `3` constructs `CAurBehaviorAttachNoOrientation` at
  `0x43e160-0x43e179`.

The base constructor and `CAurBehaviorAttach::UpdateGobPosition` copy both the
part world position and quaternion into the attached Gob
(`0x4a2dfa-0x4a2e0d`, `0x49f479-0x49f495`). The no-orientation control path
saves the Gob quaternion, invokes the base attach control, and restores that
quaternion through the orientation setter (`0x4a2bfa-0x4a2c55`). Scale is not
copied by this path.

Therefore the source-backed runtime rule is:

```text
OrientWithGround == 0  -> follow attachment position, preserve VFX orientation
OrientWithGround != 0  -> follow attachment position and attachment quaternion
```

The column name must not be interpreted as a generic scene-ground rotation.
It directly selects the two native Gob attachment behaviors for object-applied
visual effects.

## Implementation

`frontend/src/modules/vfx/application/auroraVfxObjectAttachment.ts` now:

- resolves all impact and cessation root, impact, and head source slots;
- selects the native creature, placeable, or door node namespace explicitly;
- uses the creature Gob root for root slots and the exact `impact`/`head`
  names for the other creature slots;
- requires an exact special-node prefix for placeables and doors and fails
  closed when that prefix is unavailable;
- resolves `OrientWithGround` from the selected source row;
- follows the anchor world position in both modes;
- converts the anchor world quaternion into the effect parent's local space
  only for the nonzero mode;
- preserves effect scale;
- fails closed to no-orientation when the source value is missing or invalid;
- reports the raw source value, source classification, applied world
  quaternion, and selected policy in proof telemetry.

This is shared object-attachment behavior. No row-specific visual constant or
image-derived adjustment was added.

## Row 68 consequence

`visualeffects.2da` row `68`, `VFX_IMP_HEALING_M`, has
`OrientWithGround=0`. Its correct policy is therefore
`aurora-attach-no-orientation`. The v20 fixture correctly preserved the VFX
quaternion but incorrectly interpreted `Imp_HeadCon_Node` as `headconjure`, at
world position `[0, 2.3296814959, -0.0278785005]`. The native creature mapping
instead selects `head`, measured in the same source BIC actor at approximately
`[-0.0917738342, 1.8527234790, -0.0192046997]`.

The shared resolver and comparison runner now follow the native `head` anchor
after each actor-animation sample. Fresh v22 telemetry records
`Imp_HeadCon_Node -> creature/head`, source `OrientWithGround=0`, and policy
`aurora-attach-no-orientation`; the recorded position is
`[-0.0917738822, 1.8515989271, -0.0242502596]`.

This correction materially lowers the Web effect toward the retail location.
The remaining taller core/column is not attributed to attachment anymore;
emitter-space composition, exact camera projection, room material/lighting,
and encoded timing remain separate Aurora-first audit items.

## Row 68 v22 proof

- Static preflight PNG SHA-256:
  `968AC53CD2B71D6CA669AD8A8240B3E0AE5DAF64F25EB2BC8282EA300F665EFC`.
- Aurora Web MP4: exactly one playback, no loop, retry, or overlap; SHA-256
  `19B4385CB564BF193428D84A60E9697B160B446B457DBE9351534590070A19FE`.
- Saved NWN MP4 reused without rerun; SHA-256
  `672B1D798C35DF688770683A42071BA6E4A79829D162F276D345246DC88EC01C`.
- Onset-aligned comparison MP4 SHA-256:
  `CA5B07137F035480BF8838A71BB1360A7098FCD9B705666EBD048FEA333E8648`.
- Comparison contact-sheet SHA-256:
  `BCF07E78A2240A09593AFCD22A17D4E3EC9AE4EA591C5B50384B97C23CFE3142`.
- Validated Web visible span is `1.667 s`; saved NWN is `1.417 s` under the
  shared encoded-pixel metric. The `+0.250 s` delta is descriptive only and
  does not authorize lifecycle tuning while camera/material/postprocess
  response and encoder cadence differ.
- Status:
  `valid-comparison-source-backed-scene-bic-target-calibrated-camera-open-pixel-and-timing-gaps`;
  canonical visual parity is not claimed.

## Regression evidence

- `frontend/tests/unit/modules/vfx/application/auroraVfxObjectAttachment.test.ts`
  covers source-zero and source-nonzero behavior, parent-space quaternion
  conversion, live position following, scale preservation, the creature root
  and head mappings, exact placeable-prefix mapping, ambiguity rejection, and
  missing-anchor rejection.
- Focused object-attachment and comparison-runner suite: `43/43` passed.
- Frontend TypeScript check: passed.
