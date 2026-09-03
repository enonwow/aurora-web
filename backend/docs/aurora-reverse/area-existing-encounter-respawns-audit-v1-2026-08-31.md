# Existing Area Encounter `Respawns` audit v1

Date: 2026-08-31  
Status: offline accepted; live release proof pending

## Decision

Aurora Web may replace one exact existing `Respawns : INT` of a retained
type-`7` Area GIT Encounter only when the source and target are either the
sentinel `-1` or an integer in the inclusive finite range `0..32000`. The
frozen storage is `{ respawns: -1 | integer 0..32000 }`. Missing, duplicated,
aliased, wrong-case, wrong-type, or out-of-range storage is `PRESERVE_ONLY`
and cannot authorize field creation, coercion, clamping, or normalization.

The native Properties shell presents `-1` as checked `Infinite Respawn` and a
finite editor value of `0`. A finite value is presented with the checkbox
unchecked and the exact value in `Number of times to respawn`. The Infinite
checkbox is enabled only while Reset is enabled, and the finite editor is
enabled only while Reset is enabled and Infinite is unchecked. The complete
Reset family is additionally gated by `SpawnOption = Continuous`. These are
presentation gates: the common save path serializes Respawns independently,
and changing Reset or SpawnOption does not itself erase Respawns. This slice
does not claim how the runtime counts respawns, exhaustion, activation,
creature instances, parties, scripts, or multiplayer state.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| installed English `dialog.tlk` | `1d6da70e0659e411012b44f956a093cc8fb61aed3b9355198ba42eb17e0649c9` |
| `nwtoolset_rcdata_report.json` | `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa` |

No xoreos or other GPL source was inspected or used.

## Native GFF storage closure

Common Encounter reader `FUN_0055d470` reads exact case-sensitive
`Respawns : INT` through `FUN_00aeeed8` into native member `param_1[0x19]` at
decompiled lines `215209-215210`. Reciprocal common writer `FUN_0055dbf8`
writes the same member through `FUN_00aefecc` at line `215406`.
Placed-Encounter writer `FUN_0055e71c` delegates the common type-`7` GIT
payload; GIC remains separate. Respawns-only authoring therefore mutates GIT
only. Constructor `FUN_0055d018` initializes the member at offset `0x64` to
`0` at line `214901`.

## Toolset sentinel, range, and presentation closure

Installed `TDLGENCOUNTEREDIT` is the frozen 9,574-byte `TPF0` RCDATA resource
at RVA `0x00af8314`. It binds `eRespawns`, `udRespawns`, and
`xbRespawnInfinite`, publishes `eRespawnsExit` and
`xbRespawnInfiniteClick`, and carries the literal labels
`Number of times to respawn` and `Infinite Respawn`.

Initialization `FUN_00497348` sets the Respawns up/down control at member
`+0x4c4` to the inclusive range `0..32000`. Properties save
`FUN_00498278` reads `xbRespawnInfinite` at lines `111004-111010`: unchecked
stores the exact finite editor value in `param_2[0x19]`, while checked stores
`0xffffffff`, the signed INT sentinel `-1`. Properties load `FUN_00498b48`
at lines `111179-111185` maps `-1` to editor value `0` plus a checked Infinite
box, and otherwise loads the exact INT with the checkbox unchecked.

`FUN_004972bc` gates the Reset family by exact continuous SpawnOption. Within
that family, `FUN_0049723c` enables the Infinite control only when Reset is
enabled and calls `FUN_0049730c` with true only when Infinite is unchecked.
`FUN_0049730c` then enables the finite label, editor, and up/down members at
`+0x4bc`, `+0x4c0`, and `+0x4c4`. No branch in these presentation functions
rewrites the retained native member.

## Frozen additive contract

Area detail may expose optional exact Encounter storage:

```json
{
  "encounterRespawns": {
    "respawns": -1
  }
}
```

The frontend detaches it as immutable
`source.encounterRespawnsStorage`. Its draft presentation separates a finite
`encounterRespawns` value in `0..32000` from
`encounterRespawnsInfinite : boolean`. A source sentinel initializes the
presentation to finite value `0` plus Infinite checked, exactly as Toolset
load does. Checking Infinite materializes `-1`; unchecking it materializes the
current finite draft. Switching presentation gates never erases the finite
draft or source storage.

A changed retained Encounter may add `respawns={expectedValue,value}` beside
independently admitted `tag`, `active`, `playerOnly`, `reset`, `resetTime`,
and `spawnOption` members. Every present member is complete, canonical,
changed, and bound to the same immutable family ordinal.

Planning reparses one exact type-`7` ordinal, requires one canonical
`Respawns : INT`, performs complete expected-storage CAS, and rejects wrong
family/ordinal, duplicate mutation, deletion collision, or stale provenance.
Writing replaces only the existing INT in place and retains field order,
Reset, ResetTime, SpawnOption, Geometry, SpawnPointList, every unrelated GIT
member, paired GIC, ARE, IFO, and resource ordering. Candidate and persisted
readback must reproduce the exact target before publication.

## Frontend control gates

The Infinite control is `ACTIVE_NOW` only with exact Respawns, Reset, and
SpawnOption source provenance, an editable Reset target, `reset = true`, and
`spawnOption = 0`. The finite editor additionally requires
`encounterRespawnsInfinite = false`. Missing or malformed provenance keeps
the controls disabled as `PRESERVE_ONLY`; it never fabricates Respawns.

Reset, ResetTime, SpawnOption, and Respawns may be composed in one Apply when
each own source pair is exact. A final Single Shot or Reset-off target may be
saved together with an independently valid Respawns target selected earlier
in the same dialog, because native save serializes the members independently.
The disabled final presentation does not silently discard an already changed
draft.

## Diagnostics and completion boundary

The low-cardinality event is `area_encounter_respawns_cas.v1` with bounded
operation, outcome, stable result code, changed-field count, and duration.
Respawns values, Infinite state, object IDs, ordinals, hashes, paths, storage
keys, raw fields or bytes, credentials, and host paths are prohibited from
metric labels and routine logs.

Offline acceptance requires exact storage/parser tests, detached API and scene
provenance, target-driven Reset/SpawnOption/Infinite gating without finite
value erasure, exact projector/planner/writer and candidate readback,
coexistence with previously admitted Encounter members, atomic publication,
capability-catalog update, focused regression, and production builds.

That offline gate is accepted. Resource-bounded verification passes six focused
backend suites with `2047/2047` assertions, all `72/72` Area Update atomic-
publication cases, `1053/1053` assertions across ten focused frontend unit
files, the complete frontend regression-smoke suite (`43/43` files and
`134/134` tests), and both production builds. Capability revision
`2026-08-31.128` records the slice while Encounter authoring remains `partial`
and release-blocked.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed `Respawns : INT` readback for both finite and sentinel storage,
and NWN respawn behavior remain separate release gates. This audit does not
certify full Encounter, Area, tile, or PathConnect completion.

## Resource/process statement

This audit used immutable decompilation exports and read-only installed
PE/RCDATA/TLK bytes. The Toolset was not started. No Docker command,
container, service, watcher, browser, Chrome, capture, Toolset/NWN process,
mutation test, sub-agent, xoreos source, or other GPL source was used. No
installed skill matches this offline static-decompilation and TypeScript
contract slice; Toolset operation and proof skills remain reserved for later
live gates.
