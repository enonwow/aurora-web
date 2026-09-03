# Existing Area Encounter `ResetTime` audit v1

Date: 2026-08-31  
Status: offline implementation accepted; browser and native certification pending

## Decision

Aurora Web may replace one exact existing `ResetTime : INT` of a retained
type-`7` Area GIT Encounter only when the decoded value is an integer in the
Toolset spinner's admitted range `1..32000`. The frozen storage is
`{ resetTime: integer 1..32000 }`. Missing, duplicated, aliased, wrong-case,
wrong-type, out-of-range, or otherwise malformed storage is `PRESERVE_ONLY`
and cannot authorize field creation, coercion, or clamping.

The Reset Time editor is enabled by the Encounter Reset checkbox. Toggling
Reset changes UI enabled state but does not rewrite the spinner value. The
Properties save path always reads ResetTime independently after reading Reset.
This bounded slice therefore permits member-level ResetTime CAS, including in
the same atomic mutation as Reset, while preserving Reset, Respawns, and every
other field. It does not prove the runtime time unit, reset/exhaustion timing,
respawn behavior, party/associate behavior, or script interaction.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |

No xoreos or other GPL source was inspected or used.

## Native GFF storage closure

Common Encounter reader `FUN_0055d470` reads exact case-sensitive
`ResetTime : INT` through `FUN_00aeeed8` into native member `param_1[0x14]`
at decompiled lines `215207-215208`. Reciprocal common writer `FUN_0055dbf8`
writes that same member through `FUN_00aefecc` and exact label `ResetTime` at
line `215405`. Placed-Encounter writer `FUN_0055e71c` delegates the common
type-`7` GIT payload; GIC remains separate. ResetTime-only authoring therefore
mutates GIT only.

## Toolset control identity, range, and persistence

The installed published-form table contains `lResetTime`, `udResetTime`,
`eResetTime`, and `xbReset` at file offsets `0x7ccc8c`, `0x7ccc9d`,
`0x7cccaf`, and `0x7cccc0`. The table binds the Reset Time up/down control to
form member `+0x4a0`, its editor to `+0x4a4`, and Reset checkbox to `+0x4a8`.

Initialization `FUN_00497348` calls `FUN_0091d260(+0x4a0, 1)` and
`FUN_0091d2a0(+0x4a0, 32000)` at lines `109654-109655`. Those callees store
the lower and upper members and send Win32 `UDM_SETRANGE32` (`0x46f`), proving
the inclusive spinner range. `FUN_0091d218` uses `UDM_GETPOS32` (`0x472`), and
`FUN_0091d33c` uses `UDM_SETPOS32` (`0x471`).

Properties load `FUN_00498b48` writes native `param_2[0x14]` into the up/down
control at line `111178`. Save `FUN_00498278` reads that control and assigns
the result back to `param_2[0x14]` at lines `111002-111003`. Reset handler
target `FUN_0049723c` changes enabled state of `+0x4a0` and its companions but
does not assign any Encounter data member. Save reads ResetTime regardless of
the checkbox state. Values outside `1..32000` are not admitted because a
load/edit/save cycle can clamp or otherwise normalize them through the bounded
up/down control.

## Frozen additive contract

Area detail may expose optional exact Encounter storage:

```json
{
  "encounterResetTime": {
    "resetTime": 60
  }
}
```

The frontend detaches it as immutable `source.encounterResetTimeStorage` and
authors a separate `encounterResetTime` target. A changed retained Encounter
may add `resetTime={expectedValue,value}` beside independently admitted `tag`,
`active`, `playerOnly`, and `reset` members. Every present member is complete,
canonical, changed, and bound to the same immutable family ordinal.

Planning reparses one exact type-`7` ordinal, requires one canonical
`ResetTime : INT`, performs complete expected-storage CAS, and rejects wrong
family/ordinal, duplicate mutation, deletion collision, or stale provenance.
Writing replaces only the existing INT in place and retains field order,
Reset, Respawns, Geometry, SpawnPointList, every unrelated GIT member, paired
GIC, ARE, IFO, and resource ordering. Candidate and persisted readback must
reproduce the exact target before publication.

## Diagnostics and completion boundary

The low-cardinality event is `area_encounter_reset_time_cas.v1` with bounded
operation, outcome, stable result code, changed-field count, and duration.
ResetTime values, object IDs, ordinals, hashes, paths, storage keys, raw fields
or bytes, credentials, and host paths are prohibited from metric labels and
routine logs.

Offline acceptance requires strict range/parser tests, detached API and scene
provenance, Reset-gated draft/UI materialization, exact projector/planner/
writer and candidate readback, coexistence with Tag/Active/PlayerOnly/Reset,
Reset and Respawns preservation, atomic publication, capability-catalog
update, focused regression, and production builds.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed `ResetTime : INT` readback, and NWN timing behavior remain separate
release gates. This audit does not certify full Encounter, Area, tile, or
PathConnect completion.

## Offline acceptance

The bounded implementation is accepted offline. Six focused backend suites
pass `2024/2024` assertions, the Area Update atomic-publication integration
passes `70/70`, ten focused frontend unit files pass `1021/1021`, and the real
Workspace Apply/Cancel/reopen/OK/local-Save regression passes its retained
Encounter case. Backend and frontend production builds both pass. Capability
catalog revision `2026-08-31.126` carries the domain, parser, provenance,
clone, integration, and audit evidence.

This acceptance is deliberately narrower than release certification. The
unchanged guarded-browser dependency blocker, exact-candidate Toolset
Save/Build/reopen, packed-field readback, NWN timing behavior, arbitrary
Encounter authoring, complete Area CRUD, the 99-tileset matrix, and independent
PathConnect/WOK proof remain open.

## Resource/process statement

This audit used immutable decompilation exports and read-only installed PE/form
bytes. The Toolset was not started. No Docker command, container, service,
watcher, browser, Chrome, capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used. No installed skill
matches this offline static-decompilation and TypeScript contract slice;
Toolset operation and proof skills remain reserved for the later live gates.
