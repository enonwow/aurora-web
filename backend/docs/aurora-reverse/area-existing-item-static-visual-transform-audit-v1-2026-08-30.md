# Existing Area ground-Item static visual-transform audit v1

Date: 2026-08-30  
Status: offline implementation verified; guarded browser and native certification pending  
Scope: exact create, replace, or removal of one canonical static base-scope
`VisTransformList` on a retained type-`0` Area ground Item

## Decision

Aurora Web may persist the existing scene visual-transform controls for one
retained ground Item only when the source is either physically absent or one
canonical static base-scope list. The admitted native value vector is:

```text
{ scaleX, scaleY, scaleZ, rotateX, rotateY, rotateZ,
  translateX, translateY, translateZ }
```

Physical absence represents the exact default vector `1,1,1,0,0,0,0,0,0`.
A non-default target emits one canonical `VisTransformList`; a default target
removes it. The bounded product profile requires finite IEEE-754 binary32
values, scale axes in `0.01..1000`, rotations in `-360000..360000` degrees,
and translations in `-1000000..1000000` native GIT units. These bounds are
Aurora Web safety limits, not claimed native Toolset maxima.

The source is mutation-authoritative only when:

- exactly one case-sensitive `VisTransformList : List` exists and no
  case-insensitive alias or `VisualTransform` field exists;
- the list contains exactly one child struct of native type `6`;
- that child has exactly `Scope : Int = 0` plus the ten native controller
  fields `AnimationSpeed`, `ScaleX/Y/Z`, `RotateX/Y/Z`, and
  `TranslateX/Y/Z`, each as one `Struct` of native type `0`;
- every controller has exactly `TimerType : Int = 0`,
  `ValueTo : Float`, and `LerpType : Int = 0`;
- `AnimationSpeed.ValueTo` is exactly `1`, the nine authored values satisfy
  the product profile, and the vector is non-default.

Legacy `VisualTransform`, multiple scopes, nonzero Scope, timers, lerps,
missing/extra/duplicate/wrong-case/wrong-type members, aliases, non-finite
floats, unsafe ranges, or a physically present default list remain
`PRESERVE_ONLY`. Animation authoring is deliberately outside this slice.

## Primary Aurora authority

The primary source is the frozen Aurora Toolset decompilation
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
No xoreos or other GPL source was inspected or used.

The recovered lineage is:

1. Ground-Item reader `FUN_006077a8`, beginning at line `301397`, delegates
   visual-transform readback to `FUN_0050fc18` at line `301595` after the
   common Item and inventory readers.
2. Ground-Item writer `FUN_00607ccc`, beginning at line `301621`, delegates
   visual-transform publication to `FUN_0050f528` at line `301657` after the
   common Item and optional nested `ItemList` writers.
3. `FUN_0050fc18`, beginning at line `172538`, first reads
   `VisTransformList`; only when that field is absent does it fall back to the
   legacy single `VisualTransform` struct. Each list entry reads `Scope` and
   then the complete controller vector through `FUN_0050c158`.
4. `FUN_0050c158`, beginning at line `169972`, reads
   `AnimationSpeed`, `ScaleX/Y/Z`, `RotateX/Y/Z`, and
   `TranslateX/Y/Z`. Scale and speed defaults are `1`; rotation and
   translation defaults are `0`.
5. Controller reader `FUN_0050f2e0`, beginning at line `172127`, admits the
   static value and the richer timer/lerp struct containing `TimerType`,
   `ValueTo`, `LerpType`, and conditional `ValueFrom`, `LerpDuration`, and
   `LerpProgress`. The richer animation state is the reason this bounded slice
   rejects nonzero timer/lerp values rather than flattening them.
6. `FUN_0050f528`, beginning at line `172211`, omits visual-transform storage
   when the aggregate speed/scale/rotation/translation vector is default. For
   a non-default vector it creates `VisTransformList`, emits child struct type
   `6`, writes `Scope`, and delegates all controllers to `FUN_0050c070`.
7. `FUN_0050c070`, beginning at line `169954`, writes all ten named controller
   fields. Controller writer `FUN_0050f470`, beginning at line `172189`, emits
   `TimerType`, `ValueTo`, and `LerpType`, adding the three lerp members only
   for a nonzero lerp type.

## Additive contract v1

Area detail may add one exact `itemVisualTransform` source value:

```text
{ present:false }
```

or:

```text
{ present:true, value:{scaleX,scaleY,scaleZ,rotateX,rotateY,rotateZ,
                       translateX,translateY,translateZ} }
```

The frontend stores a detached immutable copy under
`source.itemVisualTransform` and a separate exact authored native target under
`itemProperties.visualTransform`. Presentation continues to use the existing
scene `visualTransform`, where offsets are native translations divided by
`10`, rotations are radians with `pitch=RotateX`, `roll=RotateY`, and
`yaw=RotateZ`, and `scale` is the mean of the three native axes. A retained
Item is editable only when both exact stores exist. Scene mutations update the
native target and presentation together, while saved-draft validation requires
them to be an exact projection of one another. The immutable source value,
never either mutable representation, is compare-and-swap authority.

A changed retained Item projects one optional property mutation member:

```text
visualTransform: { expectedValue:<exact source>, value:<exact target> }
```

Frontend materialization converts the edited scene values back to native
axes, GIT units, and degrees and rounds every target through `Math.fround`.
An unchanged exact vector is not projected.

## Mutation, preservation, and diagnostics

Planning reparses the exact source GIT and requires complete equality with
`expectedValue`. For an admitted present source, the writer retains outer and
controller field order and changes only the nine `ValueTo : Float` members.
Absent-to-present appends the canonical native list after existing Item fields.
Present-to-absent removes only `VisTransformList`. Candidate readback must
reproduce the exact target. Every other Item field and paired GIC bytes remain
unchanged unless an independently admitted mutation changes them.

The existing authorization, approved-token, outer source digest,
revision/fencing, idempotency, journal, rollback/recovery, atomic
ARE/GIT/GIC/IFO publication, persisted readback, and receipt contracts remain
unchanged. Invalid, stale, noncanonical, no-op, wrong-owner, preservation-drift,
or candidate-readback state fails closed with stable
`422 AREA_UPDATE_OBJECT_MUTATION_INVALID` diagnostics.

Diagnostics expose only contract revision, Item family, presence transition,
changed-component count, bounded stage, outcome, stable reason, and duration.
Raw floats, identities, ordinals, hashes, paths, source keys, bytes, and
credentials are prohibited from metric labels.

## Completion boundary

Required offline evidence is strict domain validation, exact parser
admission/rejection, source compare-and-swap planning, create/replace/remove
writer behavior, unrelated-field and GIC preservation, candidate readback,
deterministic output, API and scene mapping, detached provenance, saved-draft
validation, scene-history cloning, visual-transform edit projection, and
Save/reopen regression coverage.

Fresh guarded browser visual evidence and exact-candidate Toolset
Save/Build/reopen remain separate completion gates. Any gameplay/render-parity
claim additionally requires a fresh comparable NWN capture. This offline lane
uses no Docker command, service, watcher, browser, capture, Chrome,
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source.

## Offline implementation outcome

The bounded retained-instance slice is implemented across the complete offline
path:

- strict binary32 domain validation and exact absent/present equality;
- canonical GIT parser provenance and detached repository/API mapping;
- frontend source/target/presentation separation, workspace admission,
  history cloning, gizmo/Adjust Location gating, and synchronized edits;
- draft projection, exact source reparse, immutable-ordinal CAS planning,
  create/replace/remove writing, unrelated-field preservation, candidate
  readback, and unchanged paired GIC bytes;
- one whole-candidate compiler proof and one JSDOM Apply, reopen, and local
  Save regression retaining the immutable source while persisting a coherent
  native target.

Accepted resource-safe verification on 2026-08-30 is:

- backend: `41/41` visual-transform-focused assertions plus `7/7` complete
  module-snapshot repository assertions;
- frontend: `70/70` domain/rules/clone/mutation/regression assertions plus
  `14/14` HTTP/mapper/workspace-boundary assertions;
- backend and frontend production builds, each under the one-GiB Node heap
  ceiling and with one test worker.

The offline result is not live certification. The capability remains blocked
by `ground_item_static_visual_transform_live_proof_pending` until a fresh
guarded browser capture proves presentation and Save/reopen against the exact
candidate and Aurora Toolset Save/Build/reopen verifies the packed GIT. Any NWN
visibility or renderer-parity statement requires its own comparable capture.
