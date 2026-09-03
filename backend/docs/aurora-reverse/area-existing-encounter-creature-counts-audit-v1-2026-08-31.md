# Existing Area Encounter creature-count pair audit v1

Date: 2026-08-31  
Status: source-closed; offline implementation accepted; live release proof pending

## Decision

Aurora Web may edit retained type-`7` Area GIT Encounter `MaxCreatures : INT`
and `RecCreatures : INT` only as one complete exact pair satisfying
`1 <= recCreatures <= maxCreatures <= 8`. The frozen storage is
`{ maxCreatures: integer 1..8, recCreatures: integer 1..8 }`. Missing,
duplicated, aliased, wrong-case, wrong-type, out-of-range, or relationally
incoherent storage is `PRESERVE_ONLY` and cannot authorize creation,
coercion, clamping, or normalization.

The native Properties shell labels these controls `Maximum Creatures` and
`Minimum Creatures`. Editing Maximum below the current Minimum lowers Minimum
to the new Maximum. Editing Minimum above the current Maximum raises Maximum
to the new Minimum. Aurora Web therefore authors the pair atomically and
mirrors those target-side corrections. This slice does not claim runtime
spawn selection, party scaling, encounter difficulty, exhaustion, creature-
list, or multiplayer semantics.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| `nwtoolset_rcdata_report.json` | `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa` |

No xoreos or other GPL source was inspected or used.

## Native storage closure

Common Encounter reader `FUN_0055d470` reads exact case-sensitive
`MaxCreatures : INT` into member `param_1[0x17]` at decompiled lines
`215197-215198` and `RecCreatures : INT` into member `param_1[0x18]` at
`215202-215203`. Reciprocal writer `FUN_0055dbf8` writes those same members at
lines `215401` and `215403`. Placed-Encounter writer `FUN_0055e71c` delegates
the common type-`7` payload; GIC remains separate. Constructor
`FUN_0055d018` initializes Maximum to `4` at native offset `0x5c` and Minimum
to `2` at offset `0x60` (lines `214902` and `214904`).

## Toolset range and pair relationship closure

Installed `TDLGENCOUNTEREDIT` is the frozen 9,574-byte `TPF0` RCDATA resource
at RVA `0x00af8314`. It binds `eMaxCreatures`/`udMaxCreatures` and
`eRecCreatures`/`udRecCreatures`, publishes their Exit and Click handlers, and
carries the literal labels `Maximum Creatures` and `Minimum Creatures`.

Initialization `FUN_00497348` sets both up/down controls to the inclusive
range `1..8` at lines `109650-109653`. Properties save `FUN_00498278` reads
Maximum into member `0x17` and Minimum into member `0x18` at lines
`110934-110939`. Properties load `FUN_00498b48` restores Maximum at line
`111105` and Minimum at line `111189`.

Maximum handler body `FUN_00499b6c` compares the admitted Maximum candidate
with the current Minimum and, when Maximum is lower, writes that same value to
Minimum before committing Maximum (lines `111783-111805`). Minimum handler
body `FUN_00499c2c` compares the admitted Minimum candidate with current
Maximum and, when Minimum is higher, writes that same value to Maximum before
committing Minimum (lines `111830-111852`). Together with the two frozen
`1..8` control ranges, the native editable invariant is exactly
`1 <= Minimum <= Maximum <= 8`.

## Frozen additive contract

Area detail may expose optional exact Encounter storage:

```json
{
  "encounterCreatureCounts": {
    "maxCreatures": 4,
    "recCreatures": 2
  }
}
```

The frontend detaches this pair under immutable
`source.encounterCreatureCountsStorage` and keeps a separate complete target.
Changing Maximum applies `recCreatures = min(currentRecCreatures,
candidateMaxCreatures)`. Changing Minimum applies
`maxCreatures = max(currentMaxCreatures, candidateRecCreatures)`. Invalid
input preserves the current target; no source value is rewritten.

A changed retained Encounter may add
`creatureCounts={expectedValue,value}` beside independently admitted `tag`,
`active`, `playerOnly`, `reset`, `resetTime`, `spawnOption`, and `respawns`.
The pair is always complete, canonical, changed, and bound to the same
immutable family ordinal.

Planning reparses one exact type-`7` ordinal, requires one canonical INT of
each exact label, performs complete pair CAS, and rejects wrong family or
ordinal, duplicate mutation, deletion collision, or stale provenance. Writing
replaces only those two existing INT fields in place and retains field order,
every unrelated GIT member, paired GIC, ARE, IFO, and resource ordering.
Candidate and persisted readback must reproduce the exact target pair before
publication.

## Diagnostics and completion boundary

The low-cardinality event is `area_encounter_creature_counts_cas.v1` with
bounded operation, outcome, stable result code, changed-field count, and
duration. Count values, object IDs, ordinals, hashes, paths, storage keys, raw
fields or bytes, credentials, and host paths are prohibited from metric labels
and routine logs.

Offline acceptance requires exact pair/parser tests, detached API and scene
provenance, target-side native coupling, exact projector/planner/writer and
candidate readback, coexistence with previously admitted Encounter members,
atomic publication, capability-catalog update, focused regression, and both
production builds.

Offline acceptance passed on 2026-08-31: six focused backend suites passed
`2049/2049` assertions, Area Update atomic publication passed `73/73`, ten
focused frontend unit files passed `1061/1061`, the complete frontend
regression-smoke suite passed `43/43` files and `134/134` tests, and both
production builds passed. Capability catalog revision `2026-08-31.129`
records the source-closed pair while Encounter authoring remains `partial`
and release-blocked. The ordinary backend ts-jest profile reached its enforced
1 GiB heap during the focused catalog check; the repository bounded
isolated-module profile passed the same catalog assertions without raising the
heap ceiling.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed pair readback, and NWN spawning behavior remain separate release
gates. This audit does not certify full Encounter, Area, tile, or PathConnect
completion.

## Resource/process statement

This audit used immutable decompilation exports and read-only installed
PE/RCDATA bytes. The Toolset was not started. No Docker command, container,
service, watcher, browser, Chrome, capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used. Playwright remains
reserved for the later live browser gate; the unchanged backend
`getaddrinfo ENOTFOUND mysql` blocker was not retried.
