# Existing Area Creature class spell-entry removal audit v1

Date: 2026-09-13  
Status: offline implementation and automated round-trip complete; live
certification pending

## Decision

Aurora Web may destructively remove one or more exact existing spell structs
from canonical `KnownList0..13` or `MemorizedList0..13` members of an unchanged
retained Creature `ClassList`. The operation is a strict source-subset edit:
every surviving native struct remains unchanged and no spell entry can be
added, reordered, substituted, or synthesized.

This profile does not infer spell eligibility, class spell progression,
metamagic legality, memorization capacity, or `spells.2da`/`classes.2da`
coupling. Those semantics remain required before arbitrary spell authoring can
be activated.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |

No xoreos or other GPL source was inspected or used.

## Native closure

Common Creature reader `FUN_00532174` opens `ClassList`, resolves up to
fourteen numbered spell containers per active class slot, iterates every
contained struct in physical order, and reads exact `Spell : Word`,
`SpellMetaMagic : Byte`, and `SpellFlags : Byte` members at
`decompiled_all.c:194835-194995`. Class IDs `1` and `9` admit numbered
`KnownListN` containers; every class probes numbered `MemorizedListN`
containers.

The Creature dialog commit path `FUN_0044d028` resets destination slots and
rebuilds their fourteen spell containers through `FUN_0046a76c` from the
retained selection. The rebuild first clears every destination container and
then appends one runtime spell record per selected source record. Therefore a
source selection with one record omitted yields the same ordered model without
that record; it does not require constructing a new spell identity.

Reciprocal common writer `FUN_0053521c` at
`decompiled_all.c:195288-195370` iterates each runtime container in physical
order and writes one type-`3` GFF struct per record. It creates a numbered
spell-list field only when the corresponding container is non-empty. Removing
one source record therefore serializes the ordered survivor subset, while
removing the final record removes that numbered list field. `Class : Int`,
`ClassLevel : Short`, other class slots, and unrelated Creature members are
outside this rule.

These reader/rebuild/writer facts close exact deletion of retained entries.
They do not close addition or value mutation, because those operations still
depend on eligibility and level-adjustment semantics.

## Frozen additive contract

Exact `creatureClassIdentityState.entries[]` may add `spellLists` when the
complete canonical graph contains at most 256 spell structs. Each list record
carries its physical kind (`known|memorized`), level (`0..13`), and ordered
exact entries. Each entry carries `spellId`, `spellMetaMagic`, `spellFlags`,
and its opaque sibling-field count. If exact bounded provenance cannot be
published, the removal control remains `PRESERVE_ONLY`.

`creatureProperties` additively accepts:

- `classSpellRemovalTargets`: one to 256 unique targets in strict canonical
  order, each containing `classSlotIndex`, `listKind`, `spellLevel`, and the
  zero-based physical `entryIndex`;
- `classSpellRemovalConfirmed: true`.

The complete target `classEntries` vector must equal the source class IDs and
levels. Every target must resolve to one exact published source entry. This
first profile cannot compose with class identity, class level, class-slot
resize, or complete class spell-list clear.

Projected `propertyMutations` additively carries
`classSpellRemoval:{expectedClassIds,expectedLevels,classListGraphSha256,targets,destructiveSpellRemovalConfirmed:true}`.
Unknown keys, coercion, empty or oversized targets, duplicate or unsorted
paths, out-of-range indices, absent exact provenance, stale graph hashes,
changed class/level vectors, and missing confirmation fail closed.

Writing resolves targets against the immutable source graph, filters only the
selected physical type-`3` structs, removes a numbered list field only when
its survivor count becomes zero, and preserves every survivor and unrelated
field exactly. Candidate and persisted readback must prove the expected
survivor graph before the existing atomic publication fence.

The request adds at most 256 four-field target records. It adds no endpoint,
binary body, pagination, streaming, chunking, or major-version change.
Existing authorization, permissions, approved-token, optimistic revision,
idempotency, fencing, journal, rollback/recovery, and receipt contracts remain
unchanged.

Diagnostics expose only revision, Creature family, bounded operation,
outcome/reason, target count, affected-list count, changed-field count, and
duration. Spell IDs, metamagic, flags, entry paths, object identity, hashes,
raw GFF data, credentials, and host paths remain prohibited from routine logs
and metric labels.

## Offline implementation result

The backend publishes the bounded exact graph from the GIT parser, validates
the removal command, projects and replans it against immutable source
provenance, filters only the requested physical structs, and verifies both the
candidate and persisted Area snapshot. The frontend validates and deep-clones
the exact source graph, exposes explicit confirm/remove/undo controls, rejects
composition with class or full-list mutations, filters only the matching
display entry, and retains the request through Apply, reopen, OK, and local
Save.

Unit coverage includes malformed graphs, stale hashes, missing confirmation,
ordering, duplicate and out-of-range paths, exact survivor preservation,
empty-list field removal, draft validation, deep cloning, and display
filtering. The Area Update integration reparses the atomically published GIT,
proves the requested entry absent, proves its same-list survivor plus opaque
sibling unchanged, and proves GIC and IFO byte-identical. Workspace regression
proves exact selection, Apply, reopen, and local-Save round-trip.

Complete-checkout verification passes `515/515` backend unit suites with
`8,494/8,494` assertions, `92/92` Area Update integration assertions,
`592/592` frontend unit files with `6,062/6,062` assertions, `49/49`
regression-smoke files with `142/142` assertions, `14/14` capability-catalog
assertions, and both production builds. The catalog revision is
`2026-09-13.186`; its 81-row implementation counts remain unchanged because
Creature authoring is still a partial capability.

## Remaining gates

Fresh guarded browser readback, exact-candidate Toolset Save/Build/reopen, and
NWN runtime proof remain open. Arbitrary known/memorized spell addition,
replacement, reordering, and value mutation remain blocked.
