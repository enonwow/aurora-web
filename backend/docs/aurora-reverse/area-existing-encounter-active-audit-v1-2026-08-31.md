# Existing Area Encounter `Active` audit v1

Date: 2026-08-31  
Status: source-closed; offline implementation accepted; live gates pending

## Decision

Aurora Web may replace the exact existing `Active : BYTE` of one retained
type-`7` Area GIT Encounter only when its decoded source byte is exactly `0`
or `1`. The admitted storage value is `{ activeByte: 0 | 1 }`; missing,
duplicate, aliased, wrong-case, wrong-type, or noncanonical byte storage is
`PRESERVE_ONLY` and cannot authorize adding or normalizing a field.

The UI presents the admitted byte as an unchecked/checked boolean, but the
mutation remains an exact storage compare-and-swap. This slice does not prove
Encounter runtime activation timing, spawn suppression, savegame state, or
interaction with difficulty, faction, reset, respawn, creature, script, or
spawn-point controls. It may coexist atomically with independently admitted
retained Encounter Tag, position, and polygon mutations for the same immutable
ordinal.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| frozen Toolset RCDATA report | `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa` |

No xoreos or other GPL source was inspected or used.

## Native GFF storage closure

Common Encounter reader `FUN_0055d470`, beginning at decompiled line
`215106`, reads exact case-sensitive `Active` through BYTE helper
`FUN_00aeed68` into the byte at native object offset `0x48`
(`param_1[0x12]`) at lines `215188-215190`.

The reciprocal common Encounter writer `FUN_0055dbf8`, beginning at line
`215380`, writes the same byte through BYTE helper `FUN_00aefd1c` and exact
label `Active` at line `215397`. Placed-Encounter writer `FUN_0055e71c`
delegates its common GIT payload to that writer at line `215834`; origin,
type-`1` Geometry, type-`2` SpawnPointList, and optional paired GIC Comment are
serialized in distinct lanes. An Active-only mutation therefore changes GIT
only and must retain the complete GIC exactly.

## Toolset checkbox and canonicalization closure

The installed `TDLGENCOUNTEREDIT` RCDATA is a 9,574-byte `TPF0` resource at RVA
`0x00af8314`, SHA-256
`291d98dc67af0aa0e32925ecf205e9dbe2aabadfffb43b0f9941def9308d96ee`.
Its `xbActive : TCheckBox` component name begins at relative offset `0x2089`.
The component has no serialized `OnClick`, `OnChange`, or other event binding,
and `xbActive` is absent from the form's complete 28-entry published-method
table at `0x00bcde86`.

Encounter Properties load function `FUN_00498b48` calls the checkbox boolean
setter on form member `+0x4b8` with `param_2[0x12] != 0` at decompiled line
`111097`. Save function `FUN_00498278` calls the same checkbox boolean getter
and assigns its result to `param_2[0x12]` at lines `110926-110927`. The load
path therefore renders every nonzero source byte as checked while the save
path canonicalizes it to `1`. Only source bytes `0` and `1` are admitted for
non-lossy editing; every other byte is preserve-only.

There is no dedicated Active handler and no call from these exact load/save
statements to reset, respawn, spawn-option, difficulty, faction, CR,
CreatureList, SpawnPointList, script, or variable logic. No coupled persisted
mutation is required for this bounded storage lane.

## Frozen additive contract

Area detail may expose optional exact Encounter provenance:

```json
{
  "encounterActive": {
    "activeByte": 1
  }
}
```

Omission means that no admitted editable field exists. The frontend detaches
the tuple under immutable `source.encounterActiveStorage` and authors a
separate `encounterActive` target. Generic booleans, labels, metadata, object
IDs, template identity, and runtime state are never write authority.

A changed retained Encounter may add `active={expectedValue,value}` beside the
independently admitted `tag` member in one existing object-property mutation:

```json
{
  "kind": "encounter",
  "sourceObjectId": "encounter:0:x2_gnoll001:source",
  "sourceIndex": 0,
  "active": {
    "expectedValue": { "activeByte": 1 },
    "value": { "activeByte": 0 }
  }
}
```

At least one of `tag` or `active` is required. Each admitted member is complete
and changed, unknown keys are rejected, and independently valid members may
coexist on the same ordinal. Planning reparses one canonical type-`7`
Encounter, requires exactly one `Active : BYTE`, performs complete expected
storage CAS, and rejects deletion collision or duplicate mutation. Writing
replaces only the existing byte in place and preserves field order, all
unrelated GIT members, Geometry, SpawnPointList, every GIC/ARE/IFO byte, and
resource ordering. Candidate and persisted readback must reproduce the exact
target before the revision-fenced transaction may publish.

## Diagnostics and completion boundary

The additive low-cardinality event is `area_encounter_active_cas.v1`. It
reports only contract revision, Encounter family, bounded stage, outcome,
stable result code, changed-field count, and duration. Active values, object
IDs, ordinals, hashes, source keys, paths, raw fields/bytes, credentials, and
host paths are prohibited from metric labels and routine logs.

Offline acceptance requires strict domain/parser tests, detached API and scene
provenance, guarded draft/UI materialization, exact projector/planner/writer/
candidate readback, coexistence with Tag/position/polygon mutation, paired
resource preservation, atomic publication, capability-catalog update, and
production builds.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed `Active : BYTE` readback, and NWN runtime activation behavior
remain separate release gates. This audit does not certify full Encounter,
Area, tile, or PathConnect completion.

## Resource/process statement

This audit used immutable decompilation exports, read-only PE/RCDATA bytes,
and bounded static VMT inspection. The installed Toolset was not started. No
Docker command, container, service, watcher, browser, Chrome, capture,
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source was used. No installed skill matches this offline static-decompilation
and TypeScript contract slice; Toolset operation/proof skills remain reserved
for the later live gates.

## Offline implementation checkpoint — 2026-08-31

The exact retained storage lane is implemented end to end. The backend domain
admits only `{ activeByte: 0 | 1 }`; the packed-GFF parser detaches canonical
type-`7` provenance; draft projection and immutable-ordinal planning require a
complete changed CAS; and the writer replaces only the existing canonical
`Active : BYTE` in GIT. Candidate readback and the revision-fenced transaction
verify the target while preserving complete GIC and module IFO bytes. The
atomic publication fixture changes `1` to `0` and reports one Encounter
property update.

The frontend HTTP boundary, scene mapper, workspace admission, clone boundary,
polygon Properties draft, checkbox, viewport port, and scene mutation facade
retain immutable source storage separately from the editable target. The
control is `ACTIVE_NOW` only for exact Encounter provenance and is otherwise
disabled as `PRESERVE_ONLY`. Apply atomically commits polygon, Tag, and Active;
Cancel discards the uncommitted draft; reopen and local Save retain the exact
target without changing source provenance.

Capability revision `2026-08-31.123` records the slice while keeping
`objects_encounter_authoring` `partial` and release-blocked. Resource-safe
offline verification passed:

- `2246/2246` assertions across ten bounded backend unit suites;
- `67/67` Area Update atomic-publication integration cases;
- `974/974` assertions across ten focused frontend unit files;
- `2/2` focused frontend regression-smoke cases, including full Encounter
  Apply/Cancel/reopen/OK/Save behavior;
- backend and frontend production builds.

An auxiliary broader backend selection also exposed an unrelated existing
Item-export expectation: `areas.application.service.spec.ts` expects
`script.onused` in a placed Item payload, while the current dirty-worktree
fixture omits it. The four Encounter pipeline suites in that same selection
passed independently; no Encounter Active code touches that Item field.

Fresh guarded browser Save/reopen remains blocked by the unchanged
`getaddrinfo ENOTFOUND mysql` fingerprint and was not retried. Exact-candidate
Toolset Save/Build/reopen with packed-byte readback, NWN activation behavior,
remaining Encounter properties and spawn configuration, complete 99-tileset
Add/Render certification, and independent PathConnect/WOK proof remain open.
This checkpoint does not certify full Encounter, Area, tile, or PathConnect
completion.
