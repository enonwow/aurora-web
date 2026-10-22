# Existing Area Creature class spell-entry reorder audit v1

Date: 2026-09-13  
Status: source-closed bounded offline implementation verified; live proof pending

## Decision

Aurora Web may reorder exact existing spell structs within an unchanged
canonical `KnownList0..13` or `MemorizedList0..13` field of one retained
Creature `ClassList`. Each target is a complete non-identity permutation of
the source physical indices of that same list. Entries cannot cross lists and
the operation cannot add, remove, duplicate, substitute, or mutate a spell.

This profile does not infer spell eligibility, class progression,
memorization capacity, metamagic legality, or effective
`classes.2da`/`spells.2da` coupling. Those semantics remain required before
arbitrary spell authoring is activated.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |

No xoreos or other GPL source was inspected or used.

## Native closure

Common Creature reader `FUN_00532174` opens the numbered spell-list fields,
iterates their type-`3` structs in physical index order, reads exact
`Spell : Word`, `SpellMetaMagic : Byte`, and `SpellFlags : Byte` members, and
appends the decoded records to the level container in that same order at
`decompiled_all.c:194835-194995`.

The Creature dialog commit path `FUN_0044d028` supplies the selected spell
model to `FUN_0046a76c`. That rebuild clears every destination level
container, walks the source model in physical order, and appends each rebuilt
record to its destination container through `FUN_0080d1f8` at
`decompiled_all.c:86282-86680`. This establishes ordered-container ownership;
it does not authorize new values.

Reciprocal common writer `FUN_0053521c` iterates each non-empty runtime spell
container from index zero to count minus one and emits one type-`3` GFF struct
per record in that order at `decompiled_all.c:195288-195370`. Consequently a
permutation containing each exact source record once serializes the same
list membership and values in the requested physical order.

These facts close same-list permutation of retained exact structs. They do
not close cross-list movement or entry mutation because list assignment and
value changes depend on the still-unclosed eligibility and level-adjustment
graph.

## Frozen additive contract

The source is the complete bounded `creatureClassIdentityState` detail already
published by Area detail. Reorder is available only when the whole canonical
graph contains at most 256 exact spell structs.

`creatureProperties` additively accepts:

- `classSpellReorders`: one to 224 unique canonical-order list records with
  `classSlotIndex`, `listKind`, `spellLevel`, and `entryOrder`;
- `classSpellReorderConfirmed: true`.

Every `entryOrder` must contain every physical source index for its selected
list exactly once, must differ from the identity order, and must have at least
two entries. Across all records, at most 256 indices may be carried. The
complete target class ID/level vector must equal source provenance. Reorder
cannot compose with class identity, class level, class-slot resize, full-list
clear, or entry removal.

Projection emits
`classSpellReorder:{expectedClassIds,expectedLevels,classListGraphSha256,reorders,spellReorderConfirmed:true}`.
Planning reparses the exact Creature ordinal, compares the complete graph, and
resolves every requested list before writing. Unknown keys, coercion, stale
hashes, absent detail, malformed or identity permutations, duplicate list
paths, and missing confirmation fail closed.

Writing replaces only the selected list's physical struct sequence with
references to every exact source struct in requested order. All entry fields,
opaque siblings, list ownership, class IDs/levels, unrelated class and GIT
fields, plus GIC/ARE/IFO bytes remain unchanged. Candidate and persisted
readback must prove the exact reordered graph before existing atomic
publication.

The request adds at most 256 bounded integer indices. It changes no endpoint,
binary body, pagination, streaming, chunking, authorization, permission,
approved-token, optimistic revision, idempotency, fencing, journal,
rollback/recovery, or receipt contract.

Diagnostics expose only revision, Creature family, bounded operation,
outcome/reason, reordered-list count, reordered-entry count, changed-field
count, and duration. Spell values, permutations, list paths, object identity,
hashes, raw GFF, credentials, and host paths remain prohibited from routine
logs and metric labels.

## Implemented path

The backend now parses the additive request at a strict boundary, projects an
immutable `classSpellReorder` mutation, replans the exact retained Creature
ordinal against the complete class graph, and permutes only the selected GFF
list structs. Candidate and persisted readback verify the requested physical
order before the existing revision-fenced ARE/GIT/GIC/IFO transaction can
publish. The diagnostic receipt reports
`ClassList.SpellEntries(reorder)` without exposing spell content or source
identity.

The frontend now retains detached source detail through HTTP mapping, scene
normalization, draft/history cloning, and saved-draft validation. The Creature
properties dialog exposes explicit confirmation plus list-local Move Up and
Move Down controls only for exact source lists with at least two entries.
Returning a list to identity removes its staged reorder. Clear, removal,
reorder, identity, level, and slot-resize profiles remain mutually exclusive,
and Apply/reopen/OK/local Save carries the complete canonical permutation.

Capability revision `2026-09-13.187` records the parser, GFF reorder helper,
projector, planner, writer, frontend provenance, dialog, workspace, regression,
integration, and this primary-source audit as the evidence surface. Catalog
totals remain 81 rows: 52 implemented, 25 partial, and 4 not started; the
bounded profile extends the partial Creature row without claiming arbitrary
spell authoring.

## Verification

Verification passes the focused backend chain at `85/85`, all `516/516`
backend unit suites with `8,522/8,522` assertions, all `93/93` Area Update
integration assertions, and all `10/10` backend e2e suites with `113/113`
assertions. Frontend verification passes all `593/593` unit files with
`6,080/6,080` assertions and all `49/49` regression-smoke files with
`143/143` assertions. Both production builds pass.

The first frontend regression run observed one unrelated timing failure while
opening the existing topbar drawer; the isolated assertion passed `1/1`, and
the complete rerun passed `143/143`. Initial backend golden runs exposed that
the standard `ts-jest` configurations exceeded their fixed 1 GB heap before
tests executed. The unit and e2e golden configurations now use the existing
isolated transform profile and execute in band; the exact golden commands pass
without increasing heap limits or worker counts.

## Completion boundary

The bounded offline profile is closed: strict backend and frontend validation,
immutable projection, exact-ordinal planning, source-struct permutation,
candidate and persisted readback, atomic-publication integration, detached
draft/history state, visible reorder controls, Apply/reopen/OK/local-Save
regression, capability evidence, and both production builds pass.

Fresh guarded browser readback, exact-candidate Toolset Save/Build/reopen, and
NWN runtime proof remain separate release gates. Spell addition, cross-list
movement, replacement, and value mutation remain blocked.

## Resource/process statement

The source audit used read-only immutable decompilation and existing frozen
evidence. Implementation and verification used bounded local build and test
processes only. No Docker command, container startup, service, watcher,
browser, Chrome, capture, Toolset/NWN process, mutation test, sub-agent, xoreos
source, or other GPL source was used.
