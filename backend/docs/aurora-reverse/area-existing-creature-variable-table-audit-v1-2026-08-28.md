# Existing Area Creature Variable Table Audit v1

Date: 2026-08-28  
Status: Aurora semantics source-closed; offline implementation and focused verification complete; live proof pending  
Scope: the scripting-variable table owned by one existing type-`4` Creature
in an Area GIT

## Authority and licensing boundary

The primary runtime authority is the current frozen Toolset decompilation:

- `C:\Projects\New Folder\export\decompiled_all.c`
- SHA-256:
  `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`
- symbol index `C:\Projects\New Folder\export\functions.tsv`
- SHA-256:
  `394096FE106E5767EE6ECEB31C8B085091359060351B1D10195E96F666BC69FE`

No xoreos source, comment, implementation structure, or runtime conclusion was
used. The already source-closed Area and Placeable variable-table audits were
used only to identify the local shared product abstraction after the Creature
ownership and native call path had independently been established below.

## Storage ownership and native call path

The common Creature-field reader `FUN_00532174` is indexed at address
`0x00532174`, size `11581`, and begins at current decompilation line `193907`.
It reads ordinary Creature fields, `SkillList`, `FeatList`, class/spell lists,
and all script ResRefs before calling the generic variable-table reader at
line `195067`:

```text
FUN_005e966c(*(undefined4 **)(param_1 + 0x40), param_2, local_140)
```

The symmetric common Creature-field writer `FUN_0053521c` is indexed at
address `0x0053521c`, size `3697`, and begins at line `195081`. After writing
the same ordinary and nested Creature fields, it calls the generic table
writer at line `195374`:

```text
FUN_005e9f50(*(int **)(param_1 + 0x40), param_2, local_50)
```

The placed-Creature reader `FUN_0053ab24` reads position/orientation and then
calls `FUN_00532174` at line `197530`. Its writer `FUN_0053ae80` writes
position/orientation and then calls `FUN_0053521c` at line `197590`. Therefore
an existing Area Creature owns `VarTable` directly inside its type-`4` entry
in the GIT `Creature List`.

The UTC template reader/writer pair `FUN_006427a4` / `FUN_00642de4` also calls
the same common Creature reader/writer at lines `333768` and `334022`. This
proves grammar parity between placed instances and UTC templates, but a
retained Area mutation must target the exact GIT Creature ordinal and must not
rewrite the source UTC blueprint.

## Native ordered-table grammar

The Creature call path delegates to the same generic native functions already
audited for other Aurora variable-table owners:

- reader `FUN_005e966c`, address `0x005e966c`, size `1937`, lines
  `284482..284867`;
- writer `FUN_005e9f50`, address `0x005e9f50`, size `465`, lines
  `284872..284930`.

The exact admitted grammar is:

- one optional exact `VarTable : List` field;
- absence reads as an empty table;
- physical entry order is retained;
- every entry has struct type `0` and exact fields
  `Name : CExoString`, `Type : DWord`, and `Value`;
- native `Type = 1` uses `Value : Int`;
- native `Type = 2` uses `Value : Float`;
- native `Type = 3` uses `Value : CExoString`;
- unsupported native types are not admitted for editing;
- an empty in-memory table is written by omitting `VarTable`;
- a non-empty table is emitted in the retained target order.

Order and duplicates are observable and must not be sorted, trimmed,
case-folded, deduplicated, or normalized.

## Frozen web profile and boundary contract

Creature variables use the already frozen shared Aurora web-safety profile:

- at most `1024` ordered entries;
- NUL-free `Name`, `0..64` ECMAScript code units;
- signed 32-bit integer values;
- finite, exactly materialized binary32 float values;
- NUL-free string values, `0..4096` ECMAScript code units;
- at most `1 MiB` combined name and string-value code units;
- add, edit, remove, and reorder are admitted;
- an empty target removes the exact Creature-owned `VarTable` field.

Parsing and mutation are all-or-nothing. Wrong case, native type, struct type,
field count, duplicated or unknown labels, unsupported value types, invalid
binary32 values, or exceeded budgets leave the complete table preserve-only.

Read provenance on one retained Creature is additive:

```text
creatureVariables: {
  expectedEntries: [
    { sourceIndex, name, type: "int", value },
    { sourceIndex, name, type: "float", value },
    { sourceIndex, name, type: "string", value }
  ]
}
```

The mutable target is the separate ordered `creatureProperties.variables`
array. Draft projection emits a complete CAS pair only when the table changes:

```text
variables: {
  expectedEntries: [...exact retained entries...],
  entries: [...complete target entries...]
}
```

Planning must reparse the exact current GIT Creature ordinal and reject stale,
malformed, unchanged, cross-family, duplicate, or deletion-colliding
mutations. The writer replaces, creates, or removes only that Creature's exact
`VarTable`; unrelated Creature fields and all ARE/GIC/IFO bytes remain governed
by the existing atomic Area Update transaction.

## Proof state and required closure

The earlier Toolset source-of-truth ledger records `C06` Creature variable
add/readback/delete rollback as accepted. That proves the native Toolset
surface, but it is not proof for the web implementation or its exact candidate.

The offline implementation now includes strict parsing, detached provenance,
complete-table CAS projection, immutable-ordinal planning, canonical
replace/create/remove writing, candidate parsing, frontend HTTP and scene
contracts, CRUD/reorder helpers, workspace admission, independent cloning,
and `ACTIVE_NOW`/`PRESERVE_ONLY` dialog gating. Focused resource-bounded tests
and both application typechecks pass.

Completion still requires:

- the full required unit/regression gates and both production builds;
- fresh browser Save/reopen proof for the admitted editor;
- fresh exact-candidate Toolset Save/Build/reopen and NWN runtime proof.

Until those artifacts exist and validate, the capability remains partial and
the aggregate capability blocker is
`creature_variable_table_live_proof_pending`; its live proof state is
`missing`, never `verified`.
