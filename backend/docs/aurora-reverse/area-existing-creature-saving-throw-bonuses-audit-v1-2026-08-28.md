# Existing Area Creature saving-throw bonuses audit v1

Date: 2026-08-28  
Status: `OFFLINE_IMPLEMENTED`; release certification pending

## Decision

Aurora Web may replace an exact existing `fortbonus`, `refbonus`, or
`willbonus` `Short` member of one retained type-`4` Area GIT Creature as an
independently presence-sensitive compare-and-swap mutation. The admitted
authoring interval is the Toolset's bounded edit range `0..250`. Missing,
duplicated, aliased, wrong-case, wrong-type, non-integer, out-of-range, or
stale storage remains `PRESERVE_ONLY`; this contract does not create or remove
a native field.

The three native labels are deliberately lowercase and case-sensitive. The
web names map as follows:

| Web member | Native GFF label | Native Creature offset |
| --- | --- | --- |
| `fortitude` | `fortbonus` | `0xfc` |
| `reflex` | `refbonus` | `0xf8` |
| `will` | `willbonus` | `0xfa` |

Base saves, racial modifiers, ability modifiers, totals, class progression,
feats, effects, and runtime saving-throw behavior are not admitted by this
slice. The visible totals remain presentation-only and must not authorize
another persisted mutation.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096FE106E5767EE6ECEB31C8B085091359060351B1D10195E96F666BC69FE` |
| installed retail `nwtoolset.exe` | `4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24` |
| retail `TDLGCREATUREEDIT` RCDATA | `75E2DCFD5B0886DBB13BFB7CB32290CCCE842CADA84CFB806510ABDE52E7820E` |
| frozen RCDATA report | `3D9C5D29709BCF4AA037554781D229A2094F3D85370C44A6A5DF9A222F8D87FA` |

The RCDATA is the 52,662-byte `TPF0` form `TDLGCREATUREEDIT` at RVA
`0x00AE4698`. Static Delphi RTTI binds its 132-entry method table at VA
`0x00BBDB84`, its 378-entry field table at VA `0x00BBC054`, and the form VMT
at VA `0x00BBBEE4`. No xoreos or other GPL source was consulted.

## Native storage findings

The common Creature reader `FUN_00532174` reads `refbonus`, `willbonus`, and
`fortbonus` through `FUN_00aeee20` at decompiled lines `194711-194716` and
stores them at Creature offsets `0xf8`, `0xfa`, and `0xfc`. The helper admits
only GFF type id `3`, the repository's signed native `SHORT`, and uses zero
when storage is missing.

The reciprocal common Creature writer `FUN_0053521c` writes the same offsets
and labels through `FUN_00aefdf4` at lines `195231-195233`. That helper creates
or updates GFF type id `3` and writes the sign-preserving 16-bit payload.
Native creation capability does not authorize Aurora Web to create an absent
retained-instance field.

The placed-Creature type-`4` reader and writer wrap the common Creature path,
so the members belong to the GIT record. A saving-throw-only candidate must
change only the requested GIT Shorts while preserving every sibling and the
paired GIC plus module IFO byte-for-byte.

## Toolset input and display findings

The Delphi method table binds the shared handlers as follows:

| Handler | Code address |
| --- | --- |
| `eSaveExit` | `0x004610F8` |
| `udSaveClick` | `0x004612E0` |
| `eSaveKeyDown` | `0x0046134C` |

The field table binds `udSaveFortitudeBonus`, `udSaveReflexBonus`, and
`udSaveWillBonus` at dialog offsets `0x54c`, `0x550`, and `0x554`. The common
exit handler calls `FUN_005f3eb8` with inclusive bounds `0..250`; Enter invokes
that same exit handler. It then recomputes visible Fortitude, Reflex, and Will
totals. Static inspection found no second serialized member write in the exit,
key, or spin-control handler.

The form's Creature-to-dialog materialization sign-extends the exact native
Shorts into those three controls at VAs `0x0044BE00-0x0044BE31`. The inverse
dialog-to-Creature materialization reads the controls and writes only
`refbonus`, `willbonus`, and `fortbonus` at VAs
`0x0044E2EB-0x0044E320`. The save order is native `reflex`, `will`, then
`fortitude`. Values outside the proven edit interval remain preserve-only even
though signed Short storage itself has a wider representation domain.

## Frozen additive cross-boundary contract

Area detail may add one exact three-member group:

```ts
type CreatureSavingThrowBonusStorage =
  | { present: false }
  | { present: true; nativeType: "short"; value: number };

type CreatureSavingThrowBonusesStorage = {
  fortitude: CreatureSavingThrowBonusStorage;
  reflex: CreatureSavingThrowBonusStorage;
  will: CreatureSavingThrowBonusStorage;
};
```

A present value is an integer in `0..250`. The frontend retains a detached
immutable copy under `source.creatureSavingThrowBonuses`. Writable targets
remain `creatureProperties.statistics.fortitudeBonus`, `reflexBonus`, and
`willBonus`. Loose statistics metadata may populate presentation for legacy or
seed input but never authorizes a retained native write.

Each retained control is independently `ACTIVE_NOW` only for exact
`aurora_git` Creature identity, a non-negative immutable family ordinal, and
its own present admitted source member. Every other retained state is visibly
`PRESERVE_ONLY`. New or seed Creature drafts may retain bounded `0..250`
authoring without claiming retained native provenance.

A changed subset adds `savingThrowBonuses` to the existing Creature property
mutation. Each requested member is exact `{expectedValue,value}`, both values
are distinct integers in `0..250`, and at least one member is required. The
group may coexist with independently admitted Creature mutations on the same
ordinal but never with deletion of that ordinal.

## Writer, transaction, diagnosability, and budgets

Projection, parsing, exact-ordinal planning, paired writing, and complete
candidate readback fail closed independently. Planning reparses one exact
case-sensitive native Short per requested member and performs full-value CAS.
Writing replaces only requested existing fields in native order, preserves all
sibling GIT data and byte-identical GIC and IFO resources, and uses the
existing revision-fenced, authorized, idempotent, journaled, recoverable atomic
ARE/GIT/GIC/IFO publication path.

No endpoint, binary body, pagination, chunking, streaming, authorization,
permission, idempotency, fencing, recovery, or transaction budget changes.
The complete group is below one KiB and remains inside existing API-v1 request,
object, and property limits. Routine diagnostics may expose only contract
revision, Creature family, bounded ordinal, one of the three approved native
field tokens, changed-member count, stage, duration, and stable result code.
Values, object IDs, hashes, raw bytes, source/storage keys, credentials, and
host paths are prohibited metric labels.

## Completion boundary

Offline closure requires strict domain parsing, exact Area-detail extraction,
HTTP validation, detached frontend scene/workspace/history state, independent
UI gating and bounds, reducer plus final-Apply enforcement,
Apply/OK/reopen/local-Save regression, projection, exact-ordinal planning,
native-order Short-only paired writing, complete candidate readback,
combined-mutation coverage, atomic-publication integration, capability
evidence, and production builds.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed GFF readback, and NWN inspection remain independent release gates.
This audit does not certify base/racial/ability/total saving-throw calculations,
absent-field creation/removal, arbitrary Creature templates, full Area CRUD,
renderer parity, PathConnect/WOK parity, or the 99-tileset program.

## Offline implementation closure

The source-closed contract is implemented across strict backend domain
validation, exact GIT parsing, detached snapshot cloning, process identity,
draft projection, immutable-ordinal planning, per-member CAS, native-order
paired writing, complete candidate compilation/readback, and atomic
ARE/GIT/GIC/IFO publication. The frontend now carries the exact three-member
group through its HTTP boundary, scene mapping, saved-workspace validation,
history cloning, per-control provenance, guarded draft reduction, final Apply,
dialog status, reopen, and local Save. Only present exact retained members are
editable; new/seed values remain bounded without acquiring retained-source
authority.

Accepted sequential offline gates are:

- `2,133/2,133` assertions across nine bounded backend unit suites;
- `58/58` assertions in the complete Area Update integration suite;
- `671/671` assertions across eight focused frontend unit/regression files;
- passing backend and frontend production builds, with only the existing
  frontend large-chunk advisory.

Capability catalog revision `2026-08-28.79` binds the direct backend/frontend
domain tests and this audit while retaining the 64-test-reference budget. The
previous per-field ChallengeRating, ability-score, and NaturalAC live proof
tokens are truthfully consolidated with this lane into three still-open
Creature-statistics blockers: guarded browser readback, Toolset
Save/Build/reopen, and NWN runtime inspection. No live proof is claimed.

## Resource/process statement

This audit used read-only decompilation, PE resource inspection, Delphi RTTI
parsing, and bounded static x86 disassembly. The installed Toolset executable
was never started. No Docker command, service, watcher, browser, capture,
Toolset/NWN process, mutation test, xoreos source, or other GPL source was used.
