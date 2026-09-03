# Existing Area Placeable Variable Table Audit v1

Date: 2026-08-19  
Status: Aurora semantics source-closed; implementation contract frozen  
Scope: existing type-`9` Placeables in an Area GIT

## Sources and licensing boundary

- Primary runtime authority: `C:\Projects\New Folder\export\decompiled_all.c`.
- SHA-256: `36BB244A9696F3D5F453D464468EF6D7A755CBD458C66B8E85E819A8C199C572`.
- No xoreos or other GPL source was inspected or used.
- Existing creature-variable code was reviewed only as local project code. It
  is not authority for Placeable runtime semantics.

## Aurora findings

The Placeable reader `FUN_0063ae68` calls the shared variable-table reader
`FUN_005e966c` after every ordinary Placeable field has been read. The
Placeable writer `FUN_0063b8a0` symmetrically calls `FUN_005e9f50` after every
ordinary field has been written. Both calls use the Placeable object's shared
variable-table member at `param_1[0x10]`.

The shared reader has this exact native shape:

- root field `VarTable : List`;
- every entry is accepted in physical list order;
- entry field `Name : CExoString`;
- entry field `Type : DWord`;
- supported `Type` values are exactly:
  - `1`: `Value : Int`;
  - `2`: `Value : Float`;
  - `3`: `Value : CExoString`;
- unsupported types are not added to the in-memory table;
- absent `VarTable` produces an empty in-memory table;
- explicit empty `Name` and string `Value` survive the reader.

The shared writer has this exact behavior:

- when the in-memory table is empty it writes no `VarTable` field;
- otherwise it writes one `VarTable : List`;
- each list entry has struct type `0`;
- entries are emitted in the in-memory order;
- `Name` is written as `CExoString` and `Type` as `DWord`;
- `Value` is written as `Int`, `Float`, or `CExoString` according to type
  `1`, `2`, or `3`.

`FUN_005e92ac` compares two tables as unordered multisets. It requires equal
cardinality and matches each complete `(Name, Type, Value)` entry once. The
lookup helper `FUN_005e953c` searches physical order and returns the first
entry matching the exact `(Name, Type)` pair. Therefore order is preserved and
observable when duplicate `(Name, Type)` pairs exist even though whole-table
equality itself is order-insensitive. The editor must not silently sort,
deduplicate, trim, fold, or normalize entries.

## Frozen product profile

The v1 web editor admits the complete native type set `1..3`, but adds explicit
resource budgets. These are web safety limits, not claims about Aurora limits:

- at most `1024` entries;
- `Name`: exact `CExoString`, `0..64` ECMAScript code units, no U+0000;
- integer: exact signed 32-bit value `-2147483648..2147483647`;
- float: finite IEEE-754 single-precision value; frontend candidates are
  materialized through their exact `Math.fround` value;
- string: exact `CExoString`, `0..4096` ECMAScript code units, no U+0000;
- total combined name and string-value budget: `1 MiB` of ECMAScript code
  units per mutation;
- physical order and duplicates are preserved;
- add, edit, remove, and reorder are admitted;
- an empty target table removes `VarTable`, matching Aurora's writer.

Any malformed list, entry struct type, duplicate label, unknown label, wrong
native field type, unsupported `Type`, invalid value, or over-budget table is
fail-closed and remains preserve-only. The parser never turns a partially
understood native table into an editable target.

## Cross-boundary contract

Version: additive contract v1.

Read provenance on an existing Placeable:

```text
placeableVariables: {
  expectedEntries: [
    { sourceIndex, name, type: "int", value },
    { sourceIndex, name, type: "float", value },
    { sourceIndex, name, type: "string", value }
  ]
}
```

The mutable target is a separate ordered `placeableProperties.variables`
array with the same typed entries but without `sourceIndex`. The immutable
source list is never edited in place.

Backend mutation pair:

```text
variables: {
  expectedEntries: [...exact source entries...],
  entries: [...complete target entries...]
}
```

Projection emits the pair only when the full table changes. Planning reparses
the exact current GIT ordinal and rejects stale, unchanged, malformed,
cross-family, or deletion-colliding mutations. The writer replaces only the
one exact `VarTable` root field, preserves all other GIT fields and every GIC
byte, reparses the result, and requires exact typed readback. The compiler
does not resolve blueprints or external catalogs for this self-contained
native field.

## Tests required before completion

- strict parser coverage for absent, empty, all three types, order,
  duplicates, boundaries, wrong native types, unknown/duplicate labels,
  unsupported type, invalid float, and budgets;
- projector/planner stale and unchanged coverage;
- writer whole-struct replacement and parse/serialize/parse readback;
- GIC byte-identity and unrelated-GIT-field preservation;
- frontend domain admission, mapper provenance, CRUD/reorder reducer,
  materializer, clone/cancel/undo, and dialog coverage;
- focused backend/frontend tests, full unit/regression gates, and both builds;
- browser verification for the admitted editor or an explicit environment
  blocker;
- fresh Toolset Save/Build/reopen and NWN certification remain separate native
  proof gates.

## Implementation checkpoint

Offline implementation completed on 2026-08-19.

- focused backend domain/parser/projector/planner/writer/compiler gates:
  `1504/1504` passed;
- complete backend unit gate: `240/240` suites and `4089/4089` tests passed;
- focused frontend domain/application/mapper/HTTP/clone/dialog gates:
  `198/198` passed;
- complete frontend unit gate: `272/272` files and `2847/2847` tests passed;
- backend production build: passed;
- frontend Vite production bundle: passed (`326` modules; only the existing
  chunk-size warning);
- frontend regression smoke: `77/78`; one timing-sensitive authentication test
  failed in the complete run and passed immediately in an isolated rerun;
- the repository-wide frontend `tsc` command remains blocked by the unrelated
  pre-existing `ArrayBufferView<ArrayBufferLike>` cast in
  `workspaceThreeRuntime.ts`;
- mutation analysis was not run because project policy requires explicit user
  opt-in;
- fresh admitted browser proof and Toolset Save/Build/reopen, packed readback,
  and NWN proof remain open and are not claimed by this checkpoint.
