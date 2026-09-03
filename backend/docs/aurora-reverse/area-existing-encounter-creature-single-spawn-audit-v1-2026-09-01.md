# Existing Area Encounter Creature Single-Spawn Audit v1

Date: 2026-09-01  
Status: Aurora semantics source-closed; offline implementation complete; live proof pending  
Scope: bounded editing of the `SingleSpawn` booleans in one existing type-`7`
Encounter-owned GIT `CreatureList`; creature identity and list structure remain
immutable

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

## Native read and write lineage

The placed reader `FUN_0055e1f8` calls wrapper `FUN_0055d444`. That wrapper
first calls common reader `FUN_0055d470` and then `FUN_0055d8a8`. The latter is
indexed at address `0x0055d8a8`, size `721`, and occupies decompilation lines
`215235..215376`.

`FUN_0055d8a8` opens exact `CreatureList`, retains physical list order, and for
each admitted entry reads exact `ResRef : ResRef`, `Appearance : Int`,
`CR : Float`, and `SingleSpawn : Byte`. Both its template-resolved and fallback
branches read `SingleSpawn`; the returned byte is converted to an internal
boolean with `cVar2 != '\0'`.

Common writer `FUN_0055dbf8`, address `0x0055dbf8`, size `470`, calls
`FUN_0055ddd0` after the ordinary Encounter fields and VarTable.
`FUN_0055ddd0`, address `0x0055ddd0`, size `208`, lines `215421..215447`, emits
exact `CreatureList` type-`0` entries with ordered fields `Appearance : Int`,
`CR : Float`, `ResRef : ResRef`, and `SingleSpawn : Byte`. The boolean member is
written through the native byte writer. Placed writer `FUN_0055e71c` reaches
this path through `FUN_0055dbf8` before writing origin, Geometry,
SpawnPointList, and optional paired-GIC Comment.

The direct reader/writer pair therefore establishes that `SingleSpawn` belongs
to each Encounter-owned GIT creature-list entry, is order-sensitive, and is a
boolean persisted canonically through one byte. It is not creature-blueprint
state and it is not paired-GIC metadata.

## Frozen bounded profile

Aurora Web admits this lane only when all of the following are true:

- exactly one exact-case `CreatureList : List` exists on the retained type-`7`
  Encounter;
- the list contains at most `1024` entries;
- every entry has struct type `0` and exactly the four native fields in native
  order;
- `Appearance` is a signed int32, `CR` is finite exact binary32, `ResRef` is
  NUL-free `[A-Za-z0-9_]{1,16}`, and `SingleSpawn` is exactly byte `0|1`;
- physical order, entry count, duplicate ResRefs, Appearance, CR, and ResRef
  remain immutable;
- only one or more `SingleSpawn` targets may change, and each target is
  canonicalized to byte `0|1`.

Missing, duplicate, wrong-case, wrong-type, wrong-order, malformed,
over-budget, stale, reordered, added, removed, or identity-mutated input is
preserve-only. Full list CRUD and creature-template replacement remain outside
this slice because they require additional palette/template semantics and
catalog-bound recomputation of Appearance and CR.

## Cross-layer CAS

Read provenance is additive:

```text
encounterCreatureList: {
  expectedEntries: [
    { sourceIndex, appearance, challengeRating, resRef, singleSpawnByte }
  ]
}
```

The independent scene target is the complete ordered
`encounterProperties.creatureList` projection with boolean `singleSpawn`.
Projection emits one complete CAS only when at least one flag changes:

```text
creatureList: {
  expectedEntries: [...exact retained entries...],
  entries: [...same identity/order with changed singleSpawnByte values...]
}
```

Planning reparses the exact current Encounter ordinal and rejects stale or
structurally changed source. The writer replaces only existing nested
`SingleSpawn` bytes and requires exact candidate plus persisted readback while
preserving every other GIT field and complete ARE/GIC/IFO data.

## Proof and completion boundary

Required offline evidence is strict domain, parser, projection, planner,
nested-writer, candidate, HTTP/scene/workspace/clone/dialog, regression, atomic
publication, build, and diff-hygiene coverage. Routine telemetry must never
log ResRefs, Appearance, CR, object IDs, ordinals, hashes, paths, source keys,
or raw fields.

Fresh browser Save/reopen and exact-candidate Toolset Save/Build/reopen plus
NWN behavior proof remain required for release. Until those artifacts exist,
this lane and aggregate Encounter authoring remain partial and
release-blocked.

## Offline implementation checkpoint

Capability revision `2026-09-01.136` implements the frozen boundary end to
end. The backend retains strict parser provenance, hashes and clones it,
projects the complete vector CAS, replans it against the current immutable
Encounter ordinal, validates the exact nested list schema, and replaces only
the selected `SingleSpawn : Byte` fields before complete candidate readback
and revision-fenced publication. The frontend validates and independently
clones transport/source/target state, exposes read-only ResRef/Appearance/CR
identity plus one checkbox per retained entry, and preserves the immutable
source through Apply, Cancel, reopen, OK, and local Save.

Accepted bounded gates are: the two focused parser cases; `804/804` backend
domain/projector/candidate assertions; `423/423` planner assertions;
`977/977` pair-writer assertions; `1079/1079` frontend transport/mapper/
workspace/authoring/facade/clone/domain assertions; the complete `1/1`
Workspace Encounter regression; the full `76/76` Area Update atomic-
publication suite; and both production builds. No Docker,
service, watcher, browser, Chrome, capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used.

Fresh guarded browser Save/reopen remains blocked by the previously recorded
`getaddrinfo ENOTFOUND mysql` environment failure and was not retried. Native
Toolset Save/Build/reopen and NWN behavioral proof also remain open, as do
full CreatureList add/remove/reorder/template replacement semantics.
