# Area Update materialization contract v1

Date: 2026-08-12  
Status: active additive contract; implementation in progress  
Scope: replace the ARE of one existing production Area while preserving its
GIT, GIC, IFO membership, and unsupported ARE fields

## Outcome and Aurora-first boundary

`area-update-command.v1` publishes one exact owner-scoped draft revision as a
new immutable module snapshot. The admitted v1 mutation changes only ARE
topology fields already covered by the preserve-first writer, Stage 5 native
tile-edit evidence, and parse/serialize/parse preservation tests. GIT, GIC, and
`module.ifo` are retained byte-for-byte and are included in the staged and
read-back transaction boundary.

No new Aurora semantic is inferred. Object lists, runtime GIC state, scripts,
Area properties outside the admitted ARE writer, and IFO membership changes
are rejected or preserved. This slice does not expand the independently
certified tileset/profile matrix.

## Endpoint and command

`PUT /api/v1/modules/{moduleId}/areas/{areaResRef}`

Required authorization and headers:

- authenticated actor with role `admin` and permission
  `area.materialize.update`;
- `Idempotency-Key`: 1..128 characters from `[A-Za-z0-9._:-]`;
- strong `If-Match` containing exactly the expected current module revision;
- `Content-Type: application/json`.

The strict JSON body is:

```json
{
  "schemaVersion": "area-update-command.v1",
  "moduleId": "workspace-module-id",
  "areaResRef": "crypt01",
  "expectedModuleRevision": "64-lowercase-hex",
  "draft": {
    "id": "draft_01",
    "revision": 7,
    "normalizedSha256": "64-lowercase-hex"
  },
  "clientCommandId": "client-command-01"
}
```

Unknown fields are rejected at every object boundary. Path and body identities
must match. ResRefs and SHA-256 values normalize to lowercase; opaque IDs are
preserved exactly. The command hash is SHA-256 of canonical UTF-8 JSON with
recursively sorted object keys. A validation receipt is optional evidence and
is never trusted as mutation authority: the server repeats all draft, source,
SET, candidate, and revision checks while holding the module lease.

## Transaction and preservation boundary

The server must perform these phases in order:

1. validate the command, idempotency key, and `If-Match` before mutation;
2. resolve an existing idempotency result or authorize the actor;
3. acquire the shared per-module fencing lease;
4. repeat idempotency and module revision/quarantine checks under the lease;
5. load the exact retained draft revision and project the admitted editing
   state;
6. re-read and fingerprint the source ARE and SET, compile a preserve-first
   ARE, and independently parse and compare the candidate;
7. load the existing ARE/GIT/GIC/IFO descriptors and bytes from the captured
   baseline snapshot; require ARE, GIT, GIC, and IFO membership to exist;
8. create a durable prepared journal before snapshot mutation;
9. stage content-addressed ARE/GIT/GIC/IFO objects and a successor manifest;
10. atomically compare-and-set the module head from the captured baseline to
    the successor;
11. read the published head, all four objects, hashes, descriptors, Area
    identity, exact candidate ARE semantics, and unchanged companion hashes;
12. atomically retain the verified receipt and idempotency result, then release
    the lease.

Failure after journaling triggers baseline restoration and readback. If
restoration cannot be proved, the module is quarantined and future mutations
fail closed. A process interruption leaves a recoverable durable journal; it
must not permit a conflicting Area Create, Update, or Delete transaction.

## Success receipt

Success is `200` with `area-update-receipt.v1` containing transaction ID,
command hash, Area and module identity, previous and new module revisions,
source/candidate ARE hashes, exact draft identity, SET fingerprint, validator
version, all staged resource descriptors, unchanged-companion evidence,
`readbackStatus=verified`, bounded warnings, and `updatedAt`.

The response carries the new module revision as a strong `ETag`,
`Cache-Control: no-store`, and `Idempotency-Status: created|replayed`. A replay
returns the original immutable receipt and performs no publication.

## Stable errors

- `AREA_UPDATE_INVALID` (`422`);
- `AREA_UPDATE_PERMISSION_DENIED` (`401` or `403`);
- `AREA_UPDATE_IDEMPOTENCY_CONFLICT` (`409`);
- `AREA_UPDATE_DRAFT_NOT_FOUND` (`404`);
- `AREA_UPDATE_DRAFT_REVISION_CONFLICT` (`412`);
- `AREA_UPDATE_MODULE_REVISION_CONFLICT` (`412`);
- `AREA_UPDATE_SOURCE_MISSING` (`404`);
- `AREA_UPDATE_SOURCE_STALE` (`409`);
- `AREA_UPDATE_TILESET_STALE` (`409`);
- `AREA_UPDATE_COMPANION_MISSING` (`409`);
- `AREA_UPDATE_CANDIDATE_INVALID` (`422`);
- `AREA_UPDATE_READBACK_FAILED` (`500`);
- `AREA_UPDATE_TRANSACTION_FAILED` (`500`);
- `AREA_UPDATE_ROLLBACK_FAILED` (`500`);
- `AREA_UPDATE_STORAGE_UNAVAILABLE` (`503`).

Errors use the common v1 envelope and bounded `path/reason` details. Raw
filesystem paths, object bytes, tokens, and unbounded journal diagnostics are
never returned.

## Budgets, versioning, and diagnostics

The request budget is 4 KiB and the response budget is 16 KiB. Binary content
remains server-side. Pagination, streaming, and chunking do not apply to one
transaction receipt. Breaking changes require API v2.

Structured events cover request, authorization, lease acquisition, draft and
source resolution, compilation, validation, journal transition, staging,
publication, readback, compensation, quarantine, completion, and replay.
Module, Area, transaction, draft, revision, and candidate context is retained
in bounded local events/traces and never used as high-cardinality metric
labels. Sensitive payloads and bytes are excluded.

## Exit gate

The slice is complete only after contract, authorization, precondition,
idempotency, compiler preservation, atomic snapshot, journal/recovery,
readback, compensation/quarantine, controller, authenticated HTTP, round-trip,
determinism, mutation, and regression tests pass. Product-level Update remains
uncertified until the exact committed candidate also passes fresh Toolset
Save/Build/reopen and NWN runtime proof.

## Addendum: existing creature transform materialization (2026-08-12)

The existing-object mutation boundary additionally admits position and yaw
changes for retained `creature` instances whose `aurora_git` provenance resolves
to exactly one immutable `Creature List` ordinal. The complete Aurora-first
authority and transform mapping are frozen in
`area-existing-creature-transform-audit-v1-2026-08-12.md`.

The server may replace only native float fields `XPosition`, `YPosition`,
`ZPosition`, `XOrientation`, and `YOrientation`. It rejects missing, duplicate,
wrong-type, or ambiguous `Bearing` fields, duplicate transform commands,
transform/deletion collisions, and transforms for every other family with
`422 AREA_UPDATE_OBJECT_MUTATION_INVALID`. Coordinates are converted from
scene tile space to native units by multiplication by ten. Scene yaw radians
become the float32 vector `(cos(yaw), -sin(yaw))`.

A transform preserves family cardinality and leaves the paired GIC byte-exact
when no deletion is present. A combined deletion plus transform preserves the
source ordinal meaning until both GIT and GIC survivor lists are filtered.
Independent candidate verification covers the five exact float32 fields,
per-family deletion/transformation counts, pair cardinality, hashes, and the
existing atomic readback boundary. The receipt remains
`area-update-receipt.v1` and gains additive `transformedCounts` and
`totalTransformed` fields inside `objectMutation`; response and request budgets
remain unchanged.

## Addendum: existing placeable transform materialization (2026-08-12)

The existing-object mutation boundary also admits `X/Y/Z/Bearing` changes for
a retained `placeable` whose provenance resolves to one immutable
`Placeable List` ordinal. The Aurora-first authority is frozen in
`area-existing-placeable-transform-audit-v1-2026-08-12.md`.

The writer replaces only native float fields `X`, `Y`, `Z`, and `Bearing`.
Scene coordinates are multiplied by ten; scene bearing is already radians and
is stored as float32 without applying the Toolset UI-bearing presentation
mapping. The writer must not create or alter `VisualTransform`. Missing,
duplicate, wrong-type, or ambiguous alias fields, duplicate transforms,
transform/deletion collisions, and all unsupported families fail with
`422 AREA_UPDATE_OBJECT_MUTATION_INVALID`.

The additive receipt counts the operation under
`objectMutation.transformedCounts.placeable` and `totalTransformed`. Pair
cardinality, hashes, GIC preservation for transform-only updates, atomic
ARE/GIT/GIC/IFO publication, recovery, budgets, and v1 versioning are
unchanged.

## Addendum: existing waypoint transform materialization (2026-08-12)

The existing-object mutation boundary additionally admits position and yaw
changes for a retained `waypoint` whose provenance resolves to one immutable
`WaypointList` ordinal. The Aurora-first authority and mapping are frozen in
`area-existing-waypoint-transform-audit-v1-2026-08-12.md`.

The writer may replace only native float fields `XPosition`, `YPosition`,
`ZPosition`, `XOrientation`, and `YOrientation`. Scene coordinates are
multiplied by ten, and scene bearing radians are stored as float32
`(cos(bearing), -sin(bearing))`. Missing, duplicate, wrongly typed, or
ambiguous `Bearing` fields, duplicate transforms, transform/deletion
collisions, identity/property changes, and unsupported families fail with
`422 AREA_UPDATE_OBJECT_MUTATION_INVALID`.

The additive receipt reports the operation under
`objectMutation.transformedCounts.waypoint` and `totalTransformed`. Pair
cardinality, hashes, GIC byte preservation for transform-only updates, atomic
ARE/GIT/GIC/IFO publication, recovery, budgets, and v1 versioning remain
unchanged.

## Addendum: existing ground-item transform materialization (2026-08-12)

The existing-object mutation boundary additionally admits position and yaw
changes for a retained ground `item` whose provenance resolves to one immutable
GIT `List` ordinal. The Area ground-item label is `List`, not inventory
`ItemList`. The Aurora-first authority and mapping are frozen in
`area-existing-item-transform-audit-v1-2026-08-12.md`.

The writer may replace only native float fields `XPosition`, `YPosition`,
`ZPosition`, `XOrientation`, and `YOrientation`. Scene coordinates are
multiplied by ten, and scene bearing radians are stored as float32
`(cos(bearing), -sin(bearing))`. Missing, duplicate, wrongly typed, or
ambiguous `Bearing` fields, duplicate transforms, transform/deletion
collisions, identity/property changes, inventory operations, and unsupported
families fail with `422 AREA_UPDATE_OBJECT_MUTATION_INVALID`.

The additive receipt reports the operation under
`objectMutation.transformedCounts.item` and `totalTransformed`. Pair
cardinality, hashes, GIC byte preservation for transform-only updates, atomic
ARE/GIT/GIC/IFO publication, recovery, budgets, and v1 versioning remain
unchanged.

## Addendum: existing sound position materialization (2026-08-12)

The existing-object mutation boundary additionally admits position-only
changes for a retained `sound` whose provenance resolves to one immutable
`SoundList` ordinal. The Aurora-first authority and mapping are frozen in
`area-existing-sound-transform-audit-v1-2026-08-12.md`.

The writer may replace only native float fields `XPosition`, `YPosition`, and
`ZPosition`; scene coordinates are multiplied by ten and stored as float32.
Sound transforms have no bearing member. A scene bearing delta, or a native
target containing `Bearing`, `XOrientation`, or `YOrientation`, is rejected
rather than silently discarded. Missing, duplicate, wrongly typed, or
ambiguous position fields, duplicate transforms, transform/deletion
collisions, identity/property changes, and unsupported families fail with
`422 AREA_UPDATE_OBJECT_MUTATION_INVALID`.

The additive receipt reports the operation under
`objectMutation.transformedCounts.sound` and `totalTransformed`. Pair
cardinality, hashes, GIC byte preservation for transform-only updates, atomic
ARE/GIT/GIC/IFO publication, recovery, budgets, and v1 versioning remain
unchanged. Sound construction, properties, and runtime audio behavior remain
outside this extension.

## Addendum: existing store transform materialization (2026-08-13)

The existing-object mutation boundary additionally admits position and yaw
changes for a retained `store` whose provenance resolves to one immutable
`StoreList` ordinal. The Aurora-first authority and mapping are frozen in
`area-existing-store-transform-audit-v1-2026-08-13.md`.

The writer may replace only native float fields `XPosition`, `YPosition`,
`ZPosition`, `XOrientation`, and `YOrientation`. Scene coordinates are
multiplied by ten, and scene bearing radians are stored as float32
`(cos(bearing), -sin(bearing))`. Missing, duplicate, wrongly typed, or
ambiguous `Bearing` fields, duplicate transforms, transform/deletion
collisions, identity/property/inventory changes, and unsupported families fail
with `422 AREA_UPDATE_OBJECT_MUTATION_INVALID`.

The additive receipt reports the operation under
`objectMutation.transformedCounts.store` and `totalTransformed`. Pair
cardinality, hashes, GIC byte preservation for transform-only updates, atomic
ARE/GIT/GIC/IFO publication, recovery, budgets, and v1 versioning remain
unchanged. Store construction, properties, scripts, inventory, and runtime
commerce behavior remain outside this extension.

## Addendum: existing trigger position materialization (2026-08-13)

The existing-object mutation boundary additionally admits position-only
changes for a retained `trigger` whose provenance resolves to one immutable
`TriggerList` ordinal. The Aurora-first authority and mapping are frozen in
`area-existing-trigger-position-transform-audit-v1-2026-08-13.md`.

The writer may replace only native float fields `XPosition`, `YPosition`, and
`ZPosition`; scene coordinates are multiplied by ten and stored as float32.
The complete local `Geometry` list and all three native orientation fields are
preserved. Trigger transforms have no bearing member. A scene bearing delta or
an explicit native `Bearing` field is rejected rather than silently discarded.
Missing, duplicate, or wrongly typed position/geometry fields, invalid geometry
struct types, duplicate transforms, transform/deletion collisions,
identity/property/vertex changes, and unsupported families fail with
`422 AREA_UPDATE_OBJECT_MUTATION_INVALID`.

The additive receipt reports the operation under
`objectMutation.transformedCounts.trigger` and `totalTransformed`. Pair
cardinality, hashes, GIC byte preservation for transform-only updates, atomic
ARE/GIT/GIC/IFO publication, recovery, budgets, and v1 versioning remain
unchanged. Trigger construction, polygon editing, rotation, properties,
scripts, links, and runtime activation remain outside this extension.

## Addendum: existing encounter position materialization (2026-08-13)

The existing-object mutation boundary additionally admits position-only
changes for a retained `encounter` whose provenance resolves to one immutable
`Encounter List` ordinal and whose native `SpawnPointList` is present and
empty. The Aurora-first authority and mapping are frozen in
`area-existing-encounter-position-transform-audit-v1-2026-08-13.md`.

The writer may replace only native float fields `XPosition`, `YPosition`, and
`ZPosition`; scene coordinates are multiplied by ten and stored as float32.
The complete local type-`1` `Geometry` list and empty `SpawnPointList` remain
exact. Encounter transforms have no bearing member. A scene bearing delta;
native bearing/orientation alias; populated spawn-point list; missing,
duplicate, or wrongly typed position, geometry, or spawn-point field; invalid
geometry struct; duplicate transform; transform/deletion collision; or
identity/property/vertex change fails with
`422 AREA_UPDATE_OBJECT_MUTATION_INVALID`.

The additive receipt reports the operation under
`objectMutation.transformedCounts.encounter` and `totalTransformed`. Pair
cardinality, hashes, GIC byte preservation for transform-only updates, atomic
ARE/GIT/GIC/IFO publication, recovery, budgets, and v1 versioning remain
unchanged. Encounter construction, polygon editing, rotation, populated spawn
points, properties, scripts, and runtime spawning remain outside this
extension.

## Addendum: exact base-UTW waypoint construction (2026-08-13)

The existing Area Update transaction additionally admits new waypoint
construction for one immutable source profile. A new scene object must carry
`source.type=aurora_blueprint`, `sourceKind=waypoint`,
`sourceProfileId=nwn-base-key-utw-v1`, `templateId=nw_waypoint001`, GFF identity
`UTW `/`V3.2`/`0xffffffff`, and source SHA-256
`13122a96b64f277c1c6aecb8984f1b5b9c133fb9fb514ce24a1bef564a53055a`.
The server resolves and hashes the exact type-2058 resource from configured
`nwn_base.key`; the draft never supplies binary content or host paths.

The new GIT and GIC `WaypointList` entries both use struct type `5`. GIT fields
are derived from the verified Aurora blueprint loader/writer mapping plus
float32 scene position/orientation. GIC receives the exact blueprint
`Comment`; blueprint-only `PaletteID` is omitted. Scene ResRef and Tag must
equal the immutable blueprint identity in this first profile. Existing source
deletions and transforms are applied by source ordinal before additions are
appended in scene order.

At most 1024 additions and 100000 total scene objects are accepted in one
update. A missing/mismatched profile, digest, resource, field type, GFF
identity, duplicate local object identity, property override, unsupported
source layer, or pair mismatch fails with
`422 AREA_UPDATE_OBJECT_MUTATION_INVALID`; source I/O unavailability maps to
`503 AREA_UPDATE_STORAGE_UNAVAILABLE`. Diagnostics never expose host paths or
blueprint bytes.

The additive `objectMutation` receipt gains `addedCounts`, `totalAdded`, and a
bounded `blueprintSources` list containing profile ID, template ResRef, source
SHA-256, and added count. All hashes, paired cardinalities, atomic
ARE/GIT/GIC/IFO publication, recovery, readback, and v1 versioning rules remain
unchanged. The exact authority is frozen in
`area-waypoint-construction-audit-v1-2026-08-13.md`.

## Addendum: exact base-UTS sound construction (2026-08-13)

The same Area Update transaction additionally admits new sound construction
for one immutable source profile. A new scene object must carry
`source.type=aurora_blueprint`, `sourceKind=sound`,
`sourceProfileId=nwn-base-key-uts-animalcriesday-v1`,
`templateId=animalcriesday`, GFF identity `UTS `/`V3.2`/`0xffffffff`, and
source SHA-256
`a0d185c2813db9cd2649e104715e94c01511f83b97f3319a0ee3c31b8c3357b4`.
The server resolves and hashes the exact type-2035 resource from configured
`nwn_base.key`; the draft never supplies binary content or host paths.

The new GIT and GIC `SoundList` entries both use struct type `6`. GIT common
fields are copied through the verified Aurora blueprint loader/writer mapping;
the nested `Sounds` entries are rewritten as type-`0` structs, effective
`Priority` is derived as `20` for this non-looping positional profile, and
`GeneratedType=0` plus float32 scene position are appended. GIC receives
`PlayInToolset=1` and the exact blueprint `Comment`; blueprint-only
`PaletteID` is omitted. Scene kind, ResRef, Tag, and bearing must be
`sounds`, `animalcriesday`, `AnimalCriesDay`, and `0` respectively.

The third admitted construction profile is the exact immutable base-game UTP
placeable profile documented in
`area-placeable-construction-audit-v1-2026-08-13.md`.
It requires `sourceKind=placeable`, scene family `placeables`,
`sourceProfileId=nwn-base-key-utp-plc-watertrough-v1`, template
`plc_watertrough`, SHA-256
`a1b00834837b3c516d823f63e00054b2331044bdbccca1d49f1bc121f854c531`,
and GFF identity `UTP `/`V3.2`/`0xffffffff`. The retained draft uses native
instance tag `WaterTrough`; the immutable blueprint tag is `Water Trough`.
Materialization appends paired type-`9` `Placeable List` entries, maps scene
position to float32 `X/Y/Z * 10`, retains the radian `Bearing`, applies the
proven `Portrait -> PortraitId` and static defaults, and emits no inventory for
this profile. Sound, waypoint, and placeable additions share the 1,024-object
budget.

The 1024-addition limit is shared across all admitted object families, not
applied once per family. Additions are appended per native family in retained
scene order after existing source entries. A missing/mismatched profile,
digest, resource, nested sound list, field type, GFF identity, duplicate local
object identity, property override, nonzero bearing, unsupported source layer,
or pair mismatch fails with `422 AREA_UPDATE_OBJECT_MUTATION_INVALID`; source
I/O unavailability maps to `503 AREA_UPDATE_STORAGE_UNAVAILABLE`.

`blueprintSources` contains one bounded aggregate per exact
profile/template/hash tuple so mixed waypoint and sound additions retain
complete provenance. Existing hashes, paired cardinalities, atomic
ARE/GIT/GIC/IFO publication, recovery, readback, and v1 versioning rules remain
unchanged. The exact authority is frozen in
`area-sound-construction-audit-v1-2026-08-13.md`.

## Addendum: exact base-UTI ground-item construction (2026-08-13)

The same Area Update transaction additionally admits new `items` scene
objects from one immutable source: `source.type=aurora_blueprint`,
`sourceKind=item`, profile `nwn-base-key-uti-nw-cloth022-v1`, template and tag
`nw_cloth022`/`NW_CLOTH022`, GFF identity `UTI `/`V3.2`/`0xffffffff`, type
`2025`, and SHA-256
`606788a4d7e44de76e4c3f38ce4b2b7bae06d64721140995efa011066b5279a6`.

The server resolves the exact bytes from configured `nwn_base.key`, validates
the frozen 40-field profile, and appends type-`0` GIT/GIC structs to root
`List`. Placement uses the existing item `scene * 10` plus orientation-vector
mapping. The emitted native profile adds proven default `Cursed=0`, emits all
19 legacy byte and extended word armor-part pairs, adds default
`ArmorPart_Robe=0`, retains the six colors and empty `PropertiesList`, and
writes blueprint comment `1` only to paired GIC.

Arbitrary templates, field/property/stack/identity/appearance overrides,
inventory/equipment semantics, custom source precedence, and draft bytes or
paths fail closed. Item, placeable, sound, and waypoint additions share the
1,024-addition and 100,000-scene-object budgets, atomic publication, recovery,
stable diagnostics, provenance receipts, and independent readback rules. The
authority is `area-item-construction-audit-v1-2026-08-13.md`.

## Addendum: production tile admission and durable provenance (2026-08-21)

After compilation under the fenced module lease and before `journal.begin`,
Update evaluates every distinct Tile_ID in the complete projected candidate
against the configured immutable certification report. A blocked or
unavailable decision starts no journal or storage mutation and releases the
lease. Success retains the exact `area-tile-production-admission.v1` binding
in both the byte-free candidate manifest and verified receipt; memory and
MySQL control stores reject readback when any binding field drifts. Replays
return the original immutable binding without reading a newer report. See
`area-tile-server-materialization-admission-contract-v1-2026-08-21.md` for the
complete rule, stable errors, and the proof dimensions this gate does not
claim.

## Addendum: retained Store editor Comment (2026-08-30)

The existing-object mutation boundary additionally admits one exact
compare-and-swap mutation of `Comment : CExoString` in the ordinal-paired GIC
`StoreList` struct type `11`. The source and target are NUL-free exact strings
of at most 4096 UTF-16 code units; whitespace and empty strings are significant.
Missing, duplicated, mistyped, over-budget, unpaired, stale, unchanged,
wrong-family, duplicate, or deletion-colliding mutations fail with
`422 AREA_UPDATE_OBJECT_MUTATION_INVALID`.

The writer replaces only the matching GIC field. ARE, GIT, and IFO remain
byte-identical for a comment-only update, and independent candidate plus
persisted readback must equal the exact target. All existing authorization,
budgets, revision fencing, idempotency, journal, recovery, rollback,
publication, receipt, and v1 compatibility rules remain unchanged. Store
inventory, commerce, pricing, scripts, variables, identity, and runtime
merchant behavior remain outside this extension. The exact authority is frozen
in `area-existing-store-editor-comment-audit-v1-2026-08-30.md`.
