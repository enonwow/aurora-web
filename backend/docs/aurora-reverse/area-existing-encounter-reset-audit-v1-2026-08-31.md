# Existing Area Encounter `Reset` audit v1

Date: 2026-08-31  
Status: source-closed; offline implementation accepted; live gates pending

## Decision

Aurora Web may replace the exact existing `Reset : BYTE` of one retained
type-`7` Area GIT Encounter only when the decoded source byte is exactly `0`
or `1`. The admitted storage is `{ resetByte: 0 | 1 }`. Missing, duplicated,
aliased, wrong-case, wrong-type, or noncanonical storage is `PRESERVE_ONLY`
and cannot authorize field creation or normalization.

The UI presents this byte as the Toolset's **Reset** checkbox. Its handler
changes only enabled-state presentation for Reset-time and respawn controls;
it does not write their values. This bounded slice therefore admits an exact
Reset-only compare-and-swap while preserving `ResetTime`, `Respawns`, and
every other field. It does not prove runtime reset/exhaustion timing,
respawning, party/associate behavior, spawn-point behavior, or interaction
with Active, PlayerOnly, scripts, faction, difficulty, and CreatureList.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| frozen Toolset RCDATA report | `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa` |

No xoreos or other GPL source was inspected or used.

## Native GFF storage closure

Common Encounter reader `FUN_0055d470` reads exact case-sensitive
`Reset : BYTE` through `FUN_00aeed68` into the byte at native object offset
`0x4c` (`param_1[0x13]`) at decompiled lines `215204-215206`. Reciprocal
common writer `FUN_0055dbf8` writes the same byte through `FUN_00aefd1c` and
exact label `Reset` at line `215404`. Placed-Encounter writer `FUN_0055e71c`
delegates the common type-`7` GIT payload at line `215834`; its GIC Comment
lane remains distinct. Reset-only authoring therefore mutates GIT only.

## Toolset checkbox, handler, and canonicalization closure

Installed `TDLGENCOUNTEREDIT` is the same 9,574-byte `TPF0` RCDATA resource at
VA `0x00af8314`, SHA-256
`291d98dc67af0aa0e32925ecf205e9dbe2aabadfffb43b0f9941def9308d96ee`.
Its `xbReset : TCheckBox` name begins at relative resource offset `0x204b` and
its serialized `xbResetClick` handler name at `0x239d`.

The complete 28-entry published-method table at VA `0x00bcde86` maps entry 17
`xbResetClick` to code VA `0x00499fe8`. Exact x86 disassembly reads the
checkbox boolean from form member `+0x4a8` and calls `FUN_0049723c`; it does
not access the Encounter data object. `FUN_0049723c` at decompiled lines
`109587-109631` changes only UI enabled state for controls at `+0x49c`,
`+0x4a4`, `+0x4a0`, `+0x4ec`, and `+0x4e8`, and conditionally delegates more
enabled-state changes to `FUN_0049730c`. It never assigns ResetTime,
Respawns, Reset, or another persisted Encounter member.

Properties load `FUN_00498b48` sets checkbox member `+0x4a8` from
`param_2[0x13] != 0` at line `111177`. Save `FUN_00498278` gets that checkbox
boolean and assigns it to `param_2[0x13]` at lines `111000-111001`. Load thus
renders any nonzero source byte checked, while Save canonicalizes to `1`; only
exact source bytes `0|1` are non-lossy and editable.

## Frozen additive contract

Area detail may expose optional exact Encounter storage:

```json
{
  "encounterReset": {
    "resetByte": 1
  }
}
```

The frontend detaches it as immutable `source.encounterResetStorage` and
authors a separate `encounterReset` target. A changed retained Encounter may
add `reset={expectedValue,value}` beside independently admitted `tag`,
`active`, and `playerOnly` members. At least one member is required and every
present member is complete, canonical, and changed.

Planning reparses one exact type-`7` ordinal, requires one canonical
`Reset : BYTE`, performs complete expected-storage CAS, and rejects wrong
family/ordinal, duplicate mutation, deletion collision, or stale provenance.
Writing replaces only the existing byte in place and retains field order,
`ResetTime`, `Respawns`, Geometry, SpawnPointList, every unrelated GIT member,
paired GIC, ARE, IFO, and resource ordering. Candidate and persisted readback
must reproduce the exact target before publication.

## Diagnostics and completion boundary

The low-cardinality event is `area_encounter_reset_cas.v1` with bounded
operation, outcome, stable result code, changed-field count, and duration.
Reset values, object IDs, ordinals, hashes, paths, storage keys, raw fields or
bytes, credentials, and host paths are prohibited from metric labels and
routine logs.

Offline acceptance requires strict domain/parser tests, detached API and scene
provenance, guarded draft/UI materialization, exact projector/planner/writer
and candidate readback, coexistence with Tag/Active/PlayerOnly, GIC/IFO
preservation, atomic publication, capability-catalog update, and production
builds.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed `Reset : BYTE` readback, and NWN reset behavior remain separate
release gates. This audit does not certify full Encounter, Area, tile, or
PathConnect completion.

## Resource/process statement

This audit used immutable decompilation exports, read-only installed PE/RCDATA
bytes, one passive method-table decode, and bounded x86 disassembly. The
Toolset was not started. No Docker command, container, service, watcher,
browser, Chrome, capture, Toolset/NWN process, mutation test, sub-agent,
xoreos source, or other GPL source was used. No installed skill matches this
offline static-decompilation and TypeScript contract slice; Toolset operation
and proof skills remain reserved for the later live gates.

## Offline implementation acceptance

Aurora Web now implements the frozen boundary end to end. Backend Area detail,
snapshot cloning, processing identity, draft projection, immutable-ordinal
planning, exact GFF member replacement, candidate readback, and atomic
publication carry detached `{ resetByte: 0|1 }` storage. Frontend HTTP, scene,
workspace, history, polygon Properties, viewport port, and mutation facade keep
immutable source provenance separate from the editable target and expose Reset
only as `ACTIVE_NOW` for an exact retained Encounter.

Resource-bounded acceptance on 2026-08-31 passed six focused backend suites
with `2010/2010` assertions, all `69/69` Area Update atomic-publication cases,
`1002/1002` assertions across ten focused frontend unit files, the focused
Workspace Apply/Cancel/reopen/OK/local-Save regression, and both production
builds. The writer test proves exact sibling retention for `ResetTime` and
`Respawns`; atomic integration proves complete GIC and module IFO preservation.
Capability revision `2026-08-31.125` records the slice without promoting full
Encounter authoring or release readiness.

The ordinary backend ts-jest unit configuration exceeded its enforced 1 GiB
heap while loading this unusually large shared dirty tree. The repository's
resource-safe isolated-module bounded configuration completed the exact same
focused suites without raising the heap limit. No failed semantic assertion
was hidden by that runner substitution.
