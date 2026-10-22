# Existing Area Creature class spell-entry replacement audit v1

Date: 2026-09-14  
Status: source-closed bounded contract frozen; implementation pending

## Decision

Aurora Web may replace only the `Spell : Word` value of an exact existing
no-metamagic Creature class-spell struct. The replacement remains in the same
class slot, the same canonical `KnownList0..13` or `MemorizedList0..13` field,
and the same physical entry position. The target spell must be a different
visible physical row of the effective `spells.2da`, eligible for that exact
class through its effective `classes.2da` `SpellTableColumn`, and its native
class level must equal the unchanged numbered list level.

This profile deliberately preserves list cardinality, final spell level,
`SpellMetaMagic`, `SpellFlags`, every opaque sibling field, and physical order.
It therefore does not alter the capacity calculation that Aurora validates at
dialog commit. Spell addition, cross-list movement, metamagic edits, flag
edits, and replacement across native levels remain blocked.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |

No xoreos or other GPL source was inspected or used.

## Native closure

`FUN_00463fe8` builds the available-spell model from the physical
`classes.2da` row selected by the class combobox and reads its
`SpellTableColumn`. Retail fallback columns are `Bard`, `Cleric`, `Druid`,
`Paladin`, `Ranger`, and shared `Wiz_Sorc` for class IDs `1`, `2`, `3`, `6`,
`7`, `9`, and `10`. The function then walks physical `spells.2da` rows and
accepts a row only when the selected class column parses as a number,
`Master` does not parse as a number, and `Name` is a nonzero numeric StringRef
(`decompiled_all.c:83271-83759`). The physical row index is the spell ID and
the selected class-column byte is the native spell level.

The retail executable's read-only PE mapping independently resolves the
previously ambiguous constant at virtual address `0x00bb23e0` to exact ASCII
`Name`. The surrounding immutable string blocks at virtual addresses
`0x00bb23a0`, `0x00bb2770`, and `0x00bb2930` also contain the exact
`SpellTableColumn`, class-column fallbacks, `Master`, `SpellDesc`,
`NumSpellLevels`, `SpellLevel%d`, and `cls_spgn_*`/`cls_spkn_*` resource names.

`FUN_00456700` restores each of the fourteen spell containers and calls
`FUN_0046b310` for every persisted entry (`decompiled_all.c:75163-75287`).
`FUN_0046b310` finds the exact spell ID in the available model and increments
the counter selected by metamagic byte `0`, `8`, `1`, `2`, `4`, `16`, or `32`
(`decompiled_all.c:86708-86744`).

`FUN_0046a76c` rebuilds all fourteen destination containers. It emits base
entries at their native spell level, emits metamagic entries at the native
level plus the corresponding effective `metamagic.2da` `LevelAdjustment`,
and preserves only the native bit used from `SpellFlags`
(`decompiled_all.c:86282-86703`). Consequently this first profile admits only
source `SpellMetaMagic == 0` and an unchanged numbered list whose level equals
the target row's class-native level.

`FUN_004701f0` and `FUN_00471680` additionally validate spell-list capacity,
casting ability, `NumSpellLevels`, `SpellLevel%d`, and the hardcoded
`cls_spgn_*`/`cls_spkn_*` progression tables (`decompiled_all.c:89366-90997`).
The retail instruction stream at `0x472cf2` proves the ability-score threshold
comparison, while `0x4730f6-0x47314d` proves the prepared-caster bonus formula.
Because the bounded replacement keeps both list count and final level
unchanged, these capacity inputs and the selected count remain unchanged.
They are not inferred or recomputed by Aurora Web.

Common Creature reader `FUN_00532174` and writer `FUN_0053521c` establish that
the canonical numbered list contains ordered type-`3` structs with exact
`Spell : Word`, `SpellMetaMagic : Byte`, and `SpellFlags : Byte` fields
(`decompiled_all.c:194835-194995`, `195288-195370`). Replacing only the exact
Word field retains list ownership, cardinality, and every other source field.

## Frozen additive contract

Exact source authority is the complete bounded
`source.creatureClassIdentityState` graph, extended with immutable effective
`classes.2da` and `spells.2da` descriptors. Replacement is available only
when the entire canonical class-spell graph contains at most 256 exact spell
structs and both effective tables are present, valid, and current.

`creatureProperties` additively accepts:

- `classSpellReplacements`: one to 256 unique canonical-order records with
  `classSlotIndex`, `listKind`, `spellLevel`, `entryIndex`,
  `expectedSpellId`, and `targetSpellId`;
- `classSpellReplacementConfirmed: true`.

Every target must resolve to one published source entry, that entry must have
`spellMetaMagic == 0`, and `expectedSpellId` must match it. Class ID `1` and
`9` use only `known`; the other supported class IDs use only `memorized`.
The target must differ from the source, fit Word range, resolve to a visible
eligible `spells.2da` row, and have the same class-native level as
`spellLevel`. Records are sorted by class slot, list kind, level, and entry
index and may target each physical source entry at most once.

The complete target class ID/level vector must equal source provenance.
Replacement cannot compose with class identity, class level, class-slot
resize, full-list clear, spell-entry removal, or spell-entry reorder.

Projection emits
`classSpellReplacement:{expectedClassIds,expectedLevels,classListGraphSha256,classesTableSha256,classesRowCount,spellsTableSha256,spellsRowCount,replacements,spellReplacementConfirmed:true}`.
Planning reparses the exact immutable Creature ordinal, compares the complete
class graph and both current effective table descriptors, and resolves every
target before writing. Unknown keys, coercion, absent exact provenance,
malformed or oversized input, duplicate or unsorted paths, stale hashes or
row counts, changed class/level vectors, unsupported list ownership, and
missing confirmation fail closed.

Writing changes only the selected existing type-`2` Word field named exactly
`Spell` inside each selected type-`3` struct. It preserves
`SpellMetaMagic`, `SpellFlags`, opaque siblings, list cardinality and order,
class fields, unrelated GIT fields, and paired GIC/ARE/IFO bytes. Exact
candidate and persisted readback are mandatory before the existing atomic
publication fence.

The additive request carries at most 256 bounded records. It adds no endpoint,
binary body, pagination, streaming, chunking, authorization, permission,
approved-token, optimistic revision, idempotency, fencing, journal,
rollback/recovery, receipt, or API-major change.

## Diagnostics

Routine diagnostics expose only revision, Creature family, bounded operation,
outcome/reason, replacement count, affected-list count, changed-field count,
effective source layers, and duration. Spell IDs, replacement pairs, list
paths, object identities, table or graph hashes, raw GFF/2DA content,
credentials, and host paths remain prohibited from logs and metric labels.

## Completion boundary

This audit closes the Aurora semantic and freezes the bounded contract. It is
not an implementation or runtime completion claim. Parser/resolver, backend
admission, exact writer, frontend catalog/provenance/UI, test, capability,
browser Save/reopen, Toolset Save/Build/reopen, and NWN runtime gates remain
pending. Arbitrary addition and all other spell-value editing remain blocked.

## Resource/process statement

Research used read-only immutable decompilation and retail-binary inspection.
No Docker command, container startup, service, watcher, browser, Chrome,
capture, Toolset/NWN process, mutation test, sub-agent, xoreos source, or
other GPL source was used.
