# Existing Area Encounter CreatureList structural audit v1

Date: 2026-09-01  
Status: offline implementation verified; guarded browser and native live proof pending  
Scope: add, remove, reorder, replace, and edit `SingleSpawn` in the complete
ordered `CreatureList` of one retained type-`7` GIT Encounter

## Authority and licensing boundary

The primary authority is the frozen Toolset decompilation:

- `C:\Projects\New Folder\export\decompiled_all.c`;
- SHA-256: `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`;
- symbol index `C:\Projects\New Folder\export\functions.tsv`;
- SHA-256: `394096FE106E5767EE6ECEB31C8B085091359060351B1D10195E96F666BC69FE`.

The independently frozen retail `x2_gnoll001.UTE` and native placed-Encounter
readbacks in `area-encounter-construction-audit-v1-2026-08-13.md` provide the
typed corpus. No xoreos source, comment, implementation structure, or runtime
conclusion was inspected or used.

## Confirmed native semantics

`FUN_0055d8a8`, lines `215235..215376`, opens exact `CreatureList` and reads
entries in physical list order. For every entry it first reads `ResRef` and
attempts native creature-template resolution. The two branches are materially
different:

- when template resolution succeeds, the native object supplies creature
  identity data and the list contributes `SingleSpawn`;
- when resolution is not admitted, the fallback branch reads stored
  `Appearance`, `CR`, and `SingleSpawn` directly from the list entry.

`FUN_0055ddd0`, lines `215421..215447`, writes the in-memory vector in order.
It emits a type-`0` struct with ordered fields `Appearance : Int`, `CR : Float`,
`ResRef : ResRef`, and `SingleSpawn : Byte`, but only when the entry's internal
resolved/admitted byte at offset `+0x25` is non-zero. `FUN_0055dea0`, lines
`215451..215479`, removes entries whose same byte is zero.

This proves all of the following:

1. physical list order and duplicates are meaningful and must be preserved;
2. arbitrary client-authored `(Appearance, CR, ResRef)` tuples are not a safe
   authoring surface;
3. retained entries can be removed or reordered by exact source identity;
4. additions and replacements must bind to an effective, immutable creature
   UTC which the backend resolves again before writing;
5. the backend, not the client, derives the persisted `Appearance`, `CR`, and
   `ResRef` tuple from that resolved UTC;
6. `SingleSpawn` remains an entry-local boolean serialized canonically as
   byte `0|1`.

The frozen `x2_gnoll001.UTE` corpus contains exact tuples
`(388, 1, nw_gnoll001, 0)` and `(389, 3, nw_gnoll002, 1)`. It confirms the
native field types and ordered encoding but does not authorize identity-
specific product behavior.

## Frozen structural contract

Read provenance remains the complete immutable source vector:

```text
encounterCreatureList: {
  expectedEntries: [
    { sourceIndex, appearance, challengeRating, resRef, singleSpawnByte }
  ]
}
```

The editable target is a complete ordered vector of discriminated entries:

```text
retained = {
  entryKind: "retained",
  sourceIndex,
  appearance,
  challengeRating,
  resRef,
  singleSpawn
}

effective blueprint = {
  entryKind: "effective_blueprint",
  sourceProfileId: "effective-catalog-utc-encounter-creature-list-v1",
  templateId,
  resRef,
  appearance,
  challengeRating,
  sourceObjectKey,
  sourceSizeBytes,
  sourceSha256,
  singleSpawn
}
```

The retained shape references one unique source index and repeats its tuple
only as a fail-fast client/readback guard. Reordering changes only target
order. Omitting a retained entry removes it. A retained source index may occur
at most once; duplicating a creature requires adding the same effective
blueprint through the catalog-bound shape.

The effective-blueprint shape is admitted only for exact lowercase
`[a-z0-9_]{1,16}` ResRefs, bounded catalog identifiers and source keys, a
positive source size no larger than 1 MiB, a lowercase SHA-256, finite exact
binary32 CR, and signed int32 Appearance. The compiler resolves the exact
effective catalog winner using `(kind=creature, templateId, sourceObjectKey,
sourceSha256)`, verifies byte length and hash, parses exact `UTC `/`V3.2` root
type `0xffffffff`, and requires canonical `TemplateResRef`, `Appearance_Type`,
and `ChallengeRating`. The values derived from bytes must equal the client
readback guards. Any drift is a `409` stale-source result; malformed or
unsupported bytes are a `422` invalid mutation.

For compatibility, the previous four-field target shape is accepted only for
same-length, same-order `SingleSpawn` updates. It can never add, remove,
reorder, duplicate, or replace an entry. Newly materialized scene state uses
the discriminated structural shape.

The complete list remains capped at 1024 entries. An empty target removes all
entries but preserves the exact `CreatureList : List` field. The writer always
rebuilds the nested list with type-`0` entries and the four native fields in
native order. It performs source CAS first and exact candidate plus persisted
readback afterwards. ARE, paired GIC, module IFO, every other GIT field, and
all unrelated Encounter fields remain byte-preserved by the existing
transactional candidate/publication path.

## UI and diagnostics boundary

The existing effective creature catalog is the only addition/replacement
source. The properties window exposes add, remove, move up/down, replace, and
`SingleSpawn`. Appearance and CR are read-only catalog values. Apply, Cancel,
OK, clone, local draft, Save, and reopen must preserve target order and the
immutable blueprint binding without aliasing.

Routine telemetry records only contract revision, operation stage, outcome,
result code, target entry count, retained entry count, blueprint entry count,
and changed structural count. It must not emit ResRefs, template IDs, source
keys, hashes, object IDs, paths, ordinals, Appearance, CR, or raw GFF values.

## Offline implementation checkpoint

Implementation checkpoint `206` and capability revision `2026-09-01.138`
now implement the frozen boundary end to end. The backend admits legacy and
structural targets, re-resolves every effective creature UTC, validates exact
source identity and the derived native tuple, rebuilds the complete nested
list, verifies candidate readback, and publishes through the existing
revision-fenced ARE/GIT/GIC/IFO transaction. The frontend migrates legacy
targets to source-index-bound retained entries and exposes catalog-bound add,
replace, remove, move up/down, and `SingleSpawn` controls while keeping source
provenance detached.

Accepted resource-bounded gates are `2222/2222` across the five focused
backend domain/planner/writer/projector/compiler suites, `78/78` Area Update
atomic-publication integration assertions, `1096/1096` dependent frontend
boundary assertions, `7/7` dialog plus real Workspace regression assertions,
and both production builds. Compiler-specific coverage is `171/171` and
includes stale winner plus mismatched UTC tuple rejection. The atomic
integration proves physical reorder/replacement and exact GIC/IFO preservation.

No Docker command, service, watcher, browser, Chrome, capture, Toolset/NWN
process, mutation test, sub-agent, xoreos source, or other GPL source was used.
The known browser proof blocker remains the recorded `getaddrinfo ENOTFOUND
mysql`; it was not retried in this offline checkpoint.

## Acceptance and proof boundary

Required offline gates are domain compatibility/negative tests, parser
provenance, projection, current-source planning, effective UTC resolution,
nested-list writer/readback, candidate compilation, atomic publication,
frontend transport/mapper/workspace/clone/authoring/facade/dialog regression,
and production builds. Round-trip coverage must prove add, remove, reorder,
replace, duplicate blueprint selection, empty list, stale source, stale
blueprint, wrong UTC identity, wrong field type, over-budget input, and
composition with another Encounter mutation.

Fresh guarded browser Save/reopen and exact-candidate Toolset Save/Build/reopen
plus NWN behavior remain required release proof. Until those artifacts exist,
this structural lane and aggregate Encounter authoring remain partial rather
than release-complete.
