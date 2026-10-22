# Existing Area Creature class spell-list clear audit v1

Date: 2026-09-13  
Status: source-closed bounded contract frozen; offline implementation complete;
live certification pending

## Decision

Aurora Web may destructively remove every canonical `KnownList0..13` and
`MemorizedList0..13` field from one or more unchanged retained Creature class
slots. The operation requires explicit confirmation and exact compare-and-swap
provenance for the complete native `ClassList` graph. It does not admit spell
addition, individual spell mutation, class or level mutation, class-slot
resize, spell legality inference, package application, or automatic repair.

This is a deliberately bounded step toward complete class spell-graph
authoring. Arbitrary spell selection remains blocked until the effective
`classes.2da`/`spells.2da` eligibility and level-adjustment graph is separately
closed and implemented.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |

No xoreos or other GPL source was inspected or used.

## Native closure

Common Creature reader `FUN_00532174` clears all eight runtime class slots,
opens canonical `ClassList`, and reads up to fourteen level-indexed spell
containers per active slot at `decompiled_all.c:194835-194995`. Spell structs
use type `3` and exact `Spell : Word`, `SpellMetaMagic : Byte`, and
`SpellFlags : Byte` members. Class IDs `1` and `9` read `KnownListN`; every
class also probes `MemorizedListN`.

The Creature dialog commit path `FUN_0044d028` resets every destination slot
with `FUN_00512d14` and rebuilds its fourteen spell containers through
`FUN_0046a76c`. A zero-count selection emits no runtime spell entry.

Reciprocal common writer `FUN_0053521c` at
`decompiled_all.c:195288-195370` iterates the fourteen containers in ascending
level order and creates a spell-list field only when its container count is
positive. It writes `KnownListN` for class IDs `1` and `9`, otherwise
`MemorizedListN`. Therefore an unchanged class slot with all spell-container
counts cleared serializes with no canonical known or memorized spell-list
field. Its `Class : Int`, `ClassLevel : Short`, sibling fields, other class
slots, and unrelated Creature members are unaffected by this write rule.

`FUN_00463fe8` proves that rebuilding a class's spell model begins by calling
`FUN_0045f778`, which destroys and clears the complete selected-slot spell
model. The already source-closed class-identity mutation uses this same native
destructive result for changed class IDs. The present profile applies only the
storage result to explicitly selected unchanged slots and does not claim the
class-change side effects.

## Frozen additive contract

The immutable source remains the exact `creatureClassIdentityState` already
published by Area detail. It contains one complete `ClassList` SHA-256 plus
ordered class IDs, levels, canonical spell-list counts, spell-entry counts,
and opaque sibling counts.

`creatureProperties` additively carries:

- `classSpellClearSlotIndices`: a strictly increasing unique array of one to
  eight zero-based source slot indices;
- `classSpellClearConfirmed: true`.

Every target index must identify a source slot that contains at least one
canonical spell-list field. The complete target `classEntries` vector must
equal the source class IDs and levels. The clear cannot compose with
class-identity, class-level, or class-slot-count mutation in this first
profile.

Projected `propertyMutations` additively carries
`classSpellClear:{expectedClassIds,expectedLevels,classListGraphSha256,classSlotIndices,destructiveSpellClearConfirmed:true}`.
Unknown keys, coercion, duplicate or unsorted indices, empty targets, stale
hashes, changed class/level vectors, absent lists, and missing confirmation
fail closed.

Planning reparses the immutable Creature ordinal and compares the complete
source graph. Writing removes only canonical
`KnownList0..13|MemorizedList0..13` fields from the selected source structs.
All non-selected structs, opaque siblings, unrelated GIT fields, and paired
GIC/ARE/IFO bytes remain unchanged. Candidate readback must prove the selected
slots have zero canonical spell-list fields and the class/level vectors are
unchanged before atomic publication.

The existing Area Update endpoint, authorization, permissions, approved token,
budgets, optimistic revision fence, idempotency, journal, rollback/recovery,
and receipts remain unchanged. No binary body, pagination, streaming, or
chunking is added. The additive payload is bounded by eight slot indices.

Diagnostics expose only revision, Creature family, bounded operation,
outcome/reason, selected-slot count, changed-field count, and duration. Spell
IDs, metamagic, flags, object identity, hashes, paths, raw GFF data,
credentials, and host paths remain prohibited from routine logs and metric
labels.

## Implemented offline boundary

The backend now validates the destructive request, projects the exact source
graph, replans against the immutable Creature ordinal, removes only the
canonical spell-list members, and verifies candidate plus persisted readback
inside the existing atomic publication transaction. The frontend derives the
source-owned slots from the exact class graph, deep-clones draft/history state,
requires explicit confirmation, clears staged entries in the selected slots,
and carries the mutation through Apply, reopen, OK, and local Save. Invalid,
stale, conflicting, source-less, or unconfirmed requests fail closed.

The writer receipt names the bounded `ClassList.SpellLists(clear)` property and
reports its changed-field count through the existing Area Update diagnostic
path. No spell value, object identity, source hash, path, or raw GFF content is
added to routine telemetry.

## Remaining gates

Browser Save/reopen, exact-candidate Toolset Save/Build/reopen, and NWN runtime
proof remain independent release gates. Arbitrary spell selection remains
blocked on exact effective-table eligibility and spell-level semantics.
