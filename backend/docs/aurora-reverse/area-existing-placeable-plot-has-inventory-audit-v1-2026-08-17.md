# Existing Placeable `Plot` / `HasInventory` audit v1 — 2026-08-17

## Status and scope

This audit admits bounded storage mutation for the explicit native `Plot` and
`HasInventory` byte fields on a retained `aurora_git` Placeable. It does not
admit `ItemList` contents, inventory entry creation/removal, `BodyBag`, or any
other common/placeable property.

Offline status: verified. Primary Aurora storage lineage, exact field
identity/type, accepted source profiles, the cross-boundary contract,
production mutation, saved-workspace admission, focused tests, atomic Area
Update integration, and builds are complete. The older opt-in mutation result
remains historical evidence; no mutation runner was invoked for the
2026-08-26 closure. Fresh exact-candidate browser and Toolset
Save/Build/reopen remain outside this offline checkpoint.

## Primary Aurora authority and GPL boundary

The sole behavioral authority is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
No xoreos code, structure, or runtime conclusion is used.

The common situated-object reader `FUN_0063ae68` reads the byte at object
offset `0x64` through the native byte reader at decompiled lines 329674-329680;
it prefers the native `Plot` label and accepts `Invulnerable` only as the
legacy fallback label. The matching common writer `FUN_0063b8a0` writes the
same byte through the native byte writer at line 329875. The exact
`plc_watertrough.UTP` retail fixture identifies this field as `Plot`, GFF type
`Byte`, value `0`.

The Placeable extension reader `FUN_0063bf74` reads `HasInventory` through the
native byte reader at lines 330054-330056. The matching writer
`FUN_0063c0a8` writes it through the native byte writer at line 330084. The
placed-instance reader/writer lineage is `FUN_0063d0d8` / `FUN_0063d3d8`.
Both the retail UTP fixture and the accepted native-instance readback record
`HasInventory=0`.

## Frozen mutation contract

Area detail already preserves explicit booleans as
`placeableMetadata.plot` and `placeableMetadata.hasInventory`. Presence is
mandatory provenance: an explicit `false` is writable, while absence or a
non-boolean value remains preserve-only.

The frontend retains exact source values as `source.placeablePlot` and
`source.placeableHasInventory`. Editable targets remain
`placeableProperties.plot` and `placeableProperties.hasInventory`. The update
projector emits only changed complete pairs:

```json
{
  "kind": "placeable",
  "sourceObjectId": "plc:0:plc_watertrough:...",
  "expectedPlot": false,
  "plot": true,
  "expectedHasInventory": false,
  "hasInventory": true
}
```

Either pair may be omitted and the same mutation may combine with previously
admitted Placeable property/script pairs. The backend resolves the immutable
Placeable ordinal, requires exactly one native `Byte` per selected field,
verifies the current byte against retained provenance, writes only `0` or `1`,
preserves every other GIT field and every GIC byte, and independently verifies
the complete candidate struct.

`HasInventory` is only the native capability flag. It neither materializes nor
changes `ItemList`; inventory entries stay byte-for-byte preserved and require
a separate Aurora-first contract before authoring is enabled.

## Fail-closed and completion boundary

Missing/partial pairs, non-boolean values, missing/duplicate/wrongly typed
native fields, stale provenance, unchanged pairs, unsupported families,
duplicate mutations, deletion collisions, or readback drift fail closed with
bounded object/field diagnostics. Counts remain per mutated Placeable object.

Offline completion requires parser/mapper presence tests, frontend UI and
Apply guards, projector/planner/writer negative and combined round-trip tests,
Area Update integration, and production builds. Focused mutation testing is
optional and requires an explicit user request. Fresh exact-candidate Toolset
Save/Build/reopen remains mandatory; no NWN behavior claim is made for either
storage flag.

## Offline verification checkpoint

The completed implementation keeps the two booleans presence-sensitive from
the parsed native source through frontend provenance and the update draft.
The frontend enables each control only when its exact boolean source value is
proven and restores unproven values before Apply. The backend independently
rechecks family, immutable ordinal, source metadata, complete expected/target
pairs, native field cardinality and type, stale provenance, deletion
collision, GIC preservation, and complete candidate readback.

Verification completed on 2026-08-17:

- backend focused tests: 5/5 suites and 738/738 tests passed;
- frontend focused tests: 3/3 files and 35/35 tests passed;
- Area Update atomic integration: 1/1 suite and 20/20 tests passed;
- backend and frontend production builds passed; the frontend emitted only the
  existing Vite chunk-size warning;
- backend focused mutation: 132/132 active mutants killed, zero survived,
  timed out, or uncovered, 100%; report SHA-256
  `fbf1f462bc7359f64d03d6801049c6cec48f2e618d8d600f32e676d304a17c07`;
- frontend focused mutation: 47/47 active mutants killed, zero survived, timed
  out, or uncovered, 100%; report SHA-256
  `5d387e2caa42f3f1be9431941fdba0c0363898ad1aee19872a24dd4c1250b897`.

The backend mutation scope targets the changed normalization, projection, and
planning decisions. Structurally equivalent post-normalization `&&`/`||`
variants are excluded from mutation scoring; exact native `Byte` writes,
complete candidate readback, and GIC preservation remain covered by the
successful combined round-trip and candidate-compiler tests.

The machine-readable checkpoint is
`backend/docs/aurora-reverse/evidence/area-existing-placeable-plot-has-inventory-2026-08-17/offline-verification-summary.json`.
No Toolset or NWN completion claim is made by this checkpoint.

## Current Area CRUD closure — 2026-08-26

The saved-workspace boundary now validates the exact retained Placeable
family, `aurora_git` layer, non-negative source ordinal, and each independently
proven `Plot`/`HasInventory` source-target pair. When neither native source
member is present, presentation-only fallback state remains loadable but
cannot become writable provenance. An explicit source member requires its
matching editable target to be an explicit boolean.

The current Area Update integration changes one retained Placeable from
`Plot=0, HasInventory=0` to `Plot=1, HasInventory=1`, verifies both exact native
Bytes, and proves paired GIC and IFO byte identity. The operation does not add,
remove, or rewrite `ItemList`. The dedicated frontend regression covers Apply
plus OK, a separate Cancel, another OK, reopen, and local Save while immutable
source values remain unchanged and no inventory collection is materialized.

The accepted resource-bounded gate is seven backend unit suites with
`1801/1801` assertions, the Area Update integration suite with `41/41`
assertions, six frontend unit/regression files with `461/461` assertions, and
passing backend and frontend production builds. The frontend build retains
only the existing large-chunk advisory. Capability catalog revision
`2026-08-26.63` records this audit under the consolidated remaining-property
and live-proof blockers.

This closure is offline evidence only. Fresh browser readback, an exact packed
candidate, and Toolset Save/Build/reopen certification remain open. No NWN
behavior claim is made for either storage flag. No Docker engine, container,
managed service, watcher, browser, capture, Chrome, Toolset, NWN, or
mutation-test process was started for this closure.
