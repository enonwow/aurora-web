# Existing Area Encounter `SpawnOption` audit v1

Date: 2026-08-31  
Status: offline accepted; live release proof pending

## Decision

Aurora Web may replace one exact existing `SpawnOption : INT` of a retained
type-`7` Area GIT Encounter only when its value is the Toolset combo index `0`
or `1`. The frozen storage is `{ spawnOption: 0 | 1 }`, with immutable labels
`0 = Continuous` and `1 = Single Shot`. Missing, duplicated, aliased,
wrong-case, wrong-type, or noncanonical storage is `PRESERVE_ONLY` and cannot
authorize field creation or normalization.

The native shell enables the Reset family only for combo index `0`. Selecting
index `1` changes enabled-state presentation but does not erase Reset,
ResetTime, or Respawns; the common Properties save path still serializes each
member independently. Aurora Web must therefore gate Reset-family controls by
the editable SpawnOption target while preserving their values. This slice
does not claim activation, exhaustion, respawn, creature-list, party, script,
or multiplayer runtime semantics.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| installed English `dialog.tlk` | `1d6da70e0659e411012b44f956a093cc8fb61aed3b9355198ba42eb17e0649c9` |

No xoreos or other GPL source was inspected or used.

## Native GFF storage closure

Common Encounter reader `FUN_0055d470` reads exact case-sensitive
`SpawnOption : INT` through `FUN_00aeeed8` into native member
`param_1[0x1a]` at decompiled lines `215211-215212`. Reciprocal common writer
`FUN_0055dbf8` writes the same member through `FUN_00aefecc` at line `215407`.
Placed-Encounter writer `FUN_0055e71c` delegates the common type-`7` GIT
payload; GIC remains separate. SpawnOption-only authoring therefore mutates
GIT only.

## Toolset combo identity and exact index set

Installed `TDLGENCOUNTEREDIT` is the frozen 9,574-byte `TPF0` RCDATA resource
at RVA `0x00af8314`. It binds `cbSpawnOption : TComboBox` to form member
`+0x414`, uses `csDropDownList`, and serializes `cbSpawnOptionChange`.

Constructor `FUN_004964a8` appends exactly two localized entries to the combo
at decompiled lines `109222-109247`, in this order:

1. TLK strref `7216` (`0x1c30`) — `Continuous`;
2. TLK strref `67134` (`0x1063e`) — `Single Shot`.

The published-method table maps `cbSpawnOptionChange` to VA `0x0049a140`.
Properties save `FUN_00498278` reads the selected index from `+0x414` into
`param_2[0x1a]` at lines `111012-111013`. Load `FUN_00498b48` sets the combo
index from the same member at line `111187`; it then calls `FUN_004972bc` with
`param_2[0x1a] == 0` at line `111188`. That function enables the Reset shell
only for index `0`. Constructor `FUN_0055d018` initializes the native member to
index `1` at line `214905`. Values outside `0|1` are not admitted because they
cannot select either of the exact two Toolset rows and can normalize through a
load/edit/save cycle.

## Frozen additive contract

Area detail may expose optional exact Encounter storage:

```json
{
  "encounterSpawnOption": {
    "spawnOption": 0
  }
}
```

The frontend detaches it as immutable
`source.encounterSpawnOptionStorage` and authors a separate
`encounterSpawnOption` target. A changed retained Encounter may add
`spawnOption={expectedValue,value}` beside independently admitted `tag`,
`active`, `playerOnly`, `reset`, and `resetTime` members. Every present member
is complete, canonical, changed, and bound to the same immutable family
ordinal.

Planning reparses one exact type-`7` ordinal, requires one canonical
`SpawnOption : INT`, performs complete expected-storage CAS, and rejects wrong
family/ordinal, duplicate mutation, deletion collision, or stale provenance.
Writing replaces only the existing INT in place and retains field order,
Reset, ResetTime, Respawns, Geometry, SpawnPointList, every unrelated GIT
member, paired GIC, ARE, IFO, and resource ordering. Candidate and persisted
readback must reproduce the exact target before publication.

## Diagnostics and completion boundary

The low-cardinality event is `area_encounter_spawn_option_cas.v1` with bounded
operation, outcome, stable result code, changed-field count, and duration.
SpawnOption values and labels, object IDs, ordinals, hashes, paths, storage
keys, raw fields or bytes, credentials, and host paths are prohibited from
metric labels and routine logs.

Offline acceptance requires exact option/parser tests, detached API and scene
provenance, target-driven Reset-family gating without value erasure, exact
projector/planner/writer and candidate readback, coexistence with previously
admitted Encounter members, atomic publication, capability-catalog update,
focused regression, and production builds.

That offline boundary is accepted on the shared 2026-08-31 tree. Six focused
backend suites pass `2032/2032`, Area Update atomic publication passes `71/71`,
eleven focused frontend unit files pass `1042/1042`, the Workspace
Apply/Cancel/reopen/OK/local-Save regression passes `1/1`, and both production
builds pass. Capability catalog revision `2026-08-31.127` records the slice
while retaining Encounter authoring as partial and release-blocked.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed `SpawnOption : INT` readback, and NWN continuous/single-shot
behavior remain separate release gates. This audit does not certify full
Encounter, Area, tile, or PathConnect completion.

## Resource/process statement

This audit used immutable decompilation exports and read-only installed
PE/RCDATA/TLK bytes. The Toolset was not started. No Docker command, container,
service, watcher, browser, Chrome, capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used. No installed skill
matches this offline static-decompilation and TypeScript contract slice;
Toolset operation and proof skills remain reserved for later live gates.
