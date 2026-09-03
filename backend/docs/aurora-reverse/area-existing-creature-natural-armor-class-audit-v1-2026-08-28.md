# Existing Area Creature `NaturalAC` audit v1

Date: 2026-08-28  
Status: `OFFLINE_IMPLEMENTED`; fresh browser and native release certification pending

## Decision

Aurora Web may replace the exact existing `NaturalAC : Byte` member of one
retained type-`4` Area GIT Creature as a presence-sensitive compare-and-swap
mutation. A present admitted value is an integer in the complete storage-safe
range `0..255`. Missing, duplicated, aliased, wrong-case, wrong-type,
non-integer, out-of-range, or stale storage is `PRESERVE_ONLY`; this contract
does not create or remove the native field.

The Toolset text control accepts a wider `0..1000` interval and then narrows the
saved value to the Creature byte slot. Aurora Web must not reproduce the
resulting wraparound behavior. Its authoring range is deliberately limited to
the exact lossless serialized Byte domain. This is a storage-safety boundary,
not a claim that the native editor rejects every larger text value.

Only the stored natural-armor contribution is admitted. Base AC, Dexterity
bonus, size modifier, total AC, feats, equipment effects, and all other derived
armor-class values remain presentation-only or preserve-only.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096FE106E5767EE6ECEB31C8B085091359060351B1D10195E96F666BC69FE` |
| installed retail `nwtoolset.exe` | `4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24` |
| retail `TDLGCREATUREEDIT` RCDATA | `75E2DCFD5B0886DBB13BFB7CB32290CCCE842CADA84CFB806510ABDE52E7820E` |
| frozen RCDATA report | `3D9C5D29709BCF4AA037554781D229A2094F3D85370C44A6A5DF9A222F8D87FA` |
| `backend/test/support/area-creature-construction-fixture.ts` | `6D3061F65E9FC89825B884E838E241505F731B9EA3C542BB3919ACC94E81A214` |

The RCDATA is the 52,662-byte `TPF0` form `TDLGCREATUREEDIT` at RVA
`0x00AE4698`. No xoreos or other GPL source was consulted.

## Native storage findings

The common Creature reader `FUN_00532174` reads the exact case-sensitive
`NaturalAC` field at decompiled lines `194709-194710` through
`FUN_00aeed68`, stores it at Creature offset `0xf6`, and uses zero for missing
storage. `FUN_00aeed68` admits only GFF type id `0`, the repository's native
`BYTE`.

The reciprocal common Creature writer `FUN_0053521c` writes the same offset and
label through `FUN_00aefd1c` at decompiled line `195227`. That helper creates
or updates GFF type id `0`. The construction fixture independently carries
exact `NaturalAC : byte` storage with value zero. Native creation capability
does not authorize Aurora Web to create a missing retained-instance field.

The placed-Creature type-`4` reader and writer wrap the common Creature path.
The field therefore belongs to the GIT record. A `NaturalAC`-only candidate
must change only the requested GIT Byte while preserving every sibling and the
paired GIC plus module IFO byte-for-byte.

## Toolset input and display findings

The Delphi method table maps the form handlers as follows:

| Handler | Code address |
| --- | --- |
| `eNaturalACExit` | `0x00461300` |
| `udNaturalACClick` | `0x00461330` |
| `eNaturalACKeyDown` | `0x00461360` |

The exit path clamps the edit text through `FUN_005f3eb8` with inclusive bounds
`0..1000`, records the dialog integer, and calls `FUN_004574fc`. The spin-control
path calls the same recomputation helper, while Enter invokes the exit path.
Dialog load reads the byte at Creature offset `0xf6`; dialog save converts the
control integer back to that byte slot. Values above `255` can therefore lose
information during native narrowing and are outside the Aurora Web contract.

`FUN_004574fc` recomputes the visible armor-class presentation from the current
dialog state. Static inspection found no second serialized field mutation
coupled to `NaturalAC`. The derived display does not authorize writes to base,
Dexterity, size, total, equipment, feat, or effect values.

## Frozen additive cross-boundary contract

Area detail may add:

```ts
type CreatureNaturalArmorClassStorage =
  | { present: false }
  | { present: true; nativeType: "byte"; value: number };
```

The frontend retains a detached immutable copy under
`source.creatureNaturalArmorClass`. The writable target remains
`creatureProperties.statistics.naturalArmorClass`. Loose `naturalAc` metadata
may populate presentation for legacy or seed inputs but never authorizes a
retained native write.

For a retained `aurora_git` Creature, the control is `ACTIVE_NOW` only for
exact Creature identity, a non-negative immutable family ordinal, and one
present admitted source Byte. Every other retained state is visibly
`PRESERVE_ONLY`. New or seed Creature drafts may continue bounded `0..255`
authoring without claiming retained native provenance.

A changed retained value adds the following member to the existing Creature
property mutation:

```json
{
  "kind": "creature",
  "sourceObjectId": "creature:0:nw_dwarfmerc001:source",
  "sourceIndex": 0,
  "naturalArmorClass": {
    "expectedValue": 0,
    "value": 2
  }
}
```

Both values are distinct integers in `0..255`. The member may coexist with
independently admitted Creature property mutations on the same ordinal but
never with deletion of that ordinal.

## Writer, transaction, diagnosability, and budgets

Projection, parsing, exact-ordinal planning, paired writing, and complete
candidate readback fail closed independently. Planning reparses one exact
case-sensitive `NaturalAC : Byte` and performs full-value CAS. Writing replaces
only that existing Byte, preserves all sibling GIT data and byte-identical GIC
and IFO resources, and uses the existing revision-fenced, authorized,
idempotent, journaled, recoverable atomic ARE/GIT/GIC/IFO publication path.

No endpoint, binary body, pagination, chunking, streaming, authorization,
permission, idempotency, fencing, recovery, or transaction budget changes. The
member is well below the existing API-v1 request, object, and property budgets.
Routine diagnostics may expose only contract revision, Creature family,
bounded ordinal, approved `NaturalAC` field token, stage, duration, and stable
result code. Values, object IDs, hashes, raw bytes, source/storage keys,
credentials, and host paths are prohibited metric labels.

## Completion boundary

Offline closure requires strict domain parsing, exact Area-detail extraction,
HTTP validation, detached frontend scene/workspace/history state, explicit UI
gating and bounds, reducer plus final-Apply enforcement, Apply/OK/reopen/local-
Save regression, projection, exact-ordinal planning, Byte-only paired writing,
complete candidate readback, combined-mutation coverage, atomic-publication
integration, capability evidence, and production builds.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed GFF readback, and NWN inspection remain independent release gates.
This audit does not certify derived armor-class calculations, absent-field
creation/removal, arbitrary Creature templates, full Area CRUD, renderer or
PathConnect/WOK parity, or the 99-tileset program.

## Resource/process statement

This audit used read-only decompilation, PE resource inspection, and bounded
static x86 disassembly. The installed Toolset executable was never started. No
Docker command, service, watcher, browser, capture, Toolset/NWN process,
mutation test, or external GPL source was used.

## Offline implementation closure

Capability catalog revision `2026-08-28.78` now binds this audit, the strict
backend and frontend domain tests, and three explicit live-proof blockers to
the still-partial `objects_creature_authoring` capability. The complete
cross-boundary path is implemented: exact GFF extraction and process identity,
detached repository/API/scene/workspace/history state, retained-versus-seed UI
gating, reducer and final-Apply enforcement, exact ordinal CAS planning,
Byte-only GIT replacement, complete candidate readback, revision-fenced atomic
publication, and GIC/IFO identity preservation.

The accepted final offline gates are:

- `2,116/2,116` assertions across nine bounded backend unit suites;
- `57/57` assertions in the complete Area Update integration suite;
- `656/656` assertions across eight focused frontend unit/regression files;
- a passing backend production build and the previously accepted frontend
  production build (with only its existing large-chunk advisory).

All commands were sequential one-shot runs using the repository's 1 GiB and
single-worker bounds. One mistyped integration script name failed immediately
before starting Jest and was replaced with the repository-defined
`test:integration:area-update` gate. No Docker engine or container command,
managed service, watcher, browser, Chrome, capture, Toolset/NWN process,
mutation test, xoreos source, or other GPL source was used for implementation
or verification.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed GFF readback, and NWN inspection remain mandatory release gates.
This checkpoint therefore does not promote Creature authoring or the overall
Area program to complete.
