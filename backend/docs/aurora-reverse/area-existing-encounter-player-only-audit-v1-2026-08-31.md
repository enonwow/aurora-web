# Existing Area Encounter `PlayerOnly` audit v1

Date: 2026-08-31  
Status: source-closed; offline implementation accepted; live gates pending

## Decision

Aurora Web may replace the exact existing `PlayerOnly : BYTE` of one retained
type-`7` Area GIT Encounter only when its decoded source byte is exactly `0`
or `1`. The admitted storage value is `{ playerOnlyByte: 0 | 1 }`; missing,
duplicate, aliased, wrong-case, wrong-type, or noncanonical byte storage is
`PRESERVE_ONLY` and cannot authorize adding or normalizing a field.

The UI presents the admitted byte as the Toolset's **Player Triggered Only**
checkbox, but the mutation remains an exact storage compare-and-swap. This
slice does not prove trigger-volume entry rules, party/associate behavior,
multiplayer ownership, encounter activation timing, or interaction with
Active, Reset, respawn, difficulty, faction, scripts, CreatureList, or spawn
points. It may coexist atomically with independently admitted retained
Encounter Tag, Active, position, and polygon mutations for the same immutable
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
`215106`, reads exact case-sensitive `PlayerOnly` through BYTE helper
`FUN_00aeed68` into the byte at native object offset `0xcc`
(`param_1[0x33]`) at lines `215199-215201`.

The reciprocal common Encounter writer `FUN_0055dbf8`, beginning at line
`215380`, writes the same byte through BYTE helper `FUN_00aefd1c` and exact
label `PlayerOnly` at line `215402`. Placed-Encounter writer `FUN_0055e71c`
delegates its common GIT payload to that writer at line `215834`; origin,
type-`1` Geometry, type-`2` SpawnPointList, and optional paired GIC Comment are
serialized in distinct lanes. A PlayerOnly-only mutation therefore changes
GIT only and must retain the complete GIC exactly.

## Toolset checkbox and canonicalization closure

The installed `TDLGENCOUNTEREDIT` RCDATA is a 9,574-byte `TPF0` resource at RVA
`0x00af8314`, SHA-256
`291d98dc67af0aa0e32925ecf205e9dbe2aabadfffb43b0f9941def9308d96ee`.
Its `xbPlayerTriggeredOnly : TCheckBox` component name begins at relative
offset `0x20ff`. Unlike neighboring `xbReset` and `xbRespawnInfinite`, it has
no serialized click/change handler; `xbPlayerTriggeredOnlyClick` is absent.
It is also absent from the form's complete 28-entry published-method table at
`0x00bcde86`.

Encounter Properties load function `FUN_00498b48` calls the checkbox boolean
setter on form member `+0x4d4` with `param_2[0x33] != 0` at decompiled line
`111176`. Save function `FUN_00498278` calls the same checkbox boolean getter
and assigns its result to `param_2[0x33]` at lines `110936-110937`. The load
path therefore renders every nonzero source byte as checked while the save
path canonicalizes it to `1`. Only source bytes `0` and `1` are admitted for
non-lossy editing; every other byte is preserve-only.

There is no dedicated Player Triggered Only handler and no call from these
exact load/save statements to Active, Reset, respawn, spawn-option,
difficulty, faction, CR, CreatureList, SpawnPointList, script, or variable
logic. No coupled persisted mutation is required for this bounded storage
lane.

## Frozen additive contract

Area detail may expose optional exact Encounter provenance:

```json
{
  "encounterPlayerOnly": {
    "playerOnlyByte": 1
  }
}
```

Omission means that no admitted editable field exists. The frontend detaches
the tuple under immutable `source.encounterPlayerOnlyStorage` and authors a
separate `encounterPlayerOnly` target. Generic booleans, labels, metadata,
object IDs, template identity, and runtime state are never write authority.

A changed retained Encounter may add
`playerOnly={expectedValue,value}` beside independently admitted `tag` and
`active` members in one existing object-property mutation. At least one
member is required. Each admitted member is complete and changed, unknown
keys are rejected, and independently valid members may coexist on the same
ordinal. Planning reparses one canonical type-`7` Encounter, requires exactly
one `PlayerOnly : BYTE`, performs complete expected-storage CAS, and rejects
deletion collision or duplicate mutation. Writing replaces only the existing
byte in place and preserves field order, all unrelated GIT members, Geometry,
SpawnPointList, every GIC/ARE/IFO byte, and resource ordering. Candidate and
persisted readback must reproduce the exact target before publication.

## Diagnostics and completion boundary

The additive low-cardinality event is
`area_encounter_player_only_cas.v1`. It reports only contract revision,
Encounter family, bounded stage, outcome, stable result code,
changed-field count, and duration. PlayerOnly values, object IDs, ordinals,
hashes, source keys, paths, raw fields/bytes, credentials, and host paths are
prohibited from metric labels and routine logs.

Offline acceptance requires strict domain/parser tests, detached API and scene
provenance, guarded draft/UI materialization, exact projector/planner/writer/
candidate readback, coexistence with Tag/Active/position/polygon mutation,
paired-resource preservation, atomic publication, capability-catalog update,
and production builds.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed `PlayerOnly : BYTE` readback, and NWN player-only activation
behavior remain separate release gates. This audit does not certify full
Encounter, Area, tile, or PathConnect completion.

## Resource/process statement

This audit used immutable decompilation exports, read-only PE/RCDATA bytes,
and bounded static VMT inspection. The installed Toolset was not started. No
Docker command, container, service, watcher, browser, Chrome, capture,
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source was used. No installed skill matches this offline static-decompilation
and TypeScript contract slice; Toolset operation/proof skills remain reserved
for the later live gates.

## Offline implementation checkpoint

The backend now admits only the exact `{ playerOnlyByte: 0 | 1 }` storage,
parses one canonical type-`7` `PlayerOnly : BYTE`, includes it in snapshot and
processing identity, projects a changed member-level compare-and-swap, replans
it against the immutable raw-GIT ordinal, and replaces only the exact native
field. The candidate writer's complete-entry readback and the atomic Area
Update publication gate verify the target while retaining paired GIC and
module IFO bytes exactly. PlayerOnly composes with independently admitted
Encounter Tag and Active members on one property mutation.

The frontend strictly validates the additive API member, detaches immutable
`source.encounterPlayerOnlyStorage` from the editable target, retains both
through workspace persistence and history cloning, and exposes the proven
Player Triggered Only checkbox in the Encounter Properties shell. The control
is `ACTIVE_NOW` only for complete exact retained provenance and otherwise
remains visibly `PRESERVE_ONLY`. Apply routes polygon, Tag, Active, and
PlayerOnly through one atomic viewport-port/facade mutation; Reset, Cancel,
reopen, OK, and local Save preserve source authority.

Resource-safe acceptance passed five focused backend suites with `1989/1989`
assertions, all `68/68` Area Update integration cases, ten focused frontend
unit files with `988/988` assertions, two focused regression-smoke cases, and
both production builds. Capability catalog revision `2026-08-31.124` records
the slice while Encounter authoring remains `partial` and release-blocked.

No live gate was attempted: the unchanged browser dependency fingerprint is
`getaddrinfo ENOTFOUND mysql`, and native Toolset/NWN proof remains separately
scheduled. No Docker command, container, service, watcher, browser, Chrome,
capture, Toolset/NWN process, mutation test, sub-agent, xoreos source, or other
GPL source was used for this checkpoint.
