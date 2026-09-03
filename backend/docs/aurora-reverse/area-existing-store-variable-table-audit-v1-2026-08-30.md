# Existing Area Store variable-table audit v1

Date: 2026-08-30; offline implementation verified 2026-08-31  
Status: contract and offline implementation verified; live certification
pending  
Scope: exact ordered `VarTable` read and compare-and-swap mutation for one
retained type-`11` GIT `StoreList` entry

## Decision

Aurora Web may expose the Store-owned `VarTable` through the already
source-closed shared Aurora variable grammar:

- optional exact `VarTable : List`; physical absence is an empty table;
- every entry has struct type `0` and exact `Name`, `Type`, `Value` fields;
- native `Type=1` binds `Value : Int`, `Type=2` binds `Value : Float`, and
  `Type=3` binds `Value : CExoString`;
- physical order and duplicate names are retained;
- empty target tables serialize by removing `VarTable`;
- unsupported types, aliases, partial or ambiguous storage are preserve-only.

The shared web safety profile remains at most 1024 entries, NUL-free names of
at most 64 ECMAScript code units, signed int32 values, finite exact binary32
floats, NUL-free strings of at most 4096 code units, and at most 1 MiB combined
name/string-value code units. No trim, sort, case folding, deduplication, or
coercion is authorized.

This slice does not authorize Store restrictions, inventory mutation,
arbitrary UTM authoring, identity mutation, or any runtime merchant claim.

## Primary Aurora authority

The primary source is `C:/Projects/New Folder/export/decompiled_all.c`, whose
SHA-256 was re-read as
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
No xoreos or other GPL source was consulted.

The common Store reader `FUN_00640870` calls the generic variable-table reader
`FUN_005e966c((undefined4 *)local_54[0x10],param_2,param_3)` after the exact
commerce, script-ResRef, `WillNotBuy`, and `WillOnlyBuy` paths. The symmetric
common Store writer `FUN_00641058` calls
`FUN_005e9f50((int *)local_2c[0x10],param_2,param_3)` after writing those same
independent members. Both accesses bind the same Store member. The retained
type-`11` reader/writer delegates to this common pair, so the table belongs to
the Store GIT struct and is neither paired-GIC state nor UTM replacement.

The delegated generic reader/writer pair and exact ordered three-type grammar
are independently source-closed in the existing Area, Placeable, Creature,
and ground-Item variable-table audits. The admitted retail
`x2_merc_dye.UTM` contains no physical `VarTable`, corroborating the exact
absence/empty boundary without authorizing synthesis of malformed storage.

## Additive contract v1

Area detail may add:

```text
storeMetadata.variables = {
  expectedEntries: [
    { sourceIndex, name, type: "int"|"float"|"string", value }
  ]
}
```

The frontend detaches this as immutable `source.storeVariables` and initializes
the separately editable ordered `storeProperties.variables` target without
`sourceIndex`. A changed retained Store projects the optional member:

```text
variables = {
  expectedEntries: <complete exact source list>,
  entries: <complete distinct target list>
}
```

It may coexist with the independently admitted Store Comment, commerce, and
script-ResRef members. Planning reparses the exact current Store ordinal and
compares the complete typed ordered table. Writing replaces, creates, or
removes only the exact Store-owned `VarTable` and requires typed ordered
candidate readback. A variables-only mutation preserves paired GIC, IFO, field
ordering, restriction lists, inventory buckets, identity, and every unrelated
GIT member inside the existing revision-fenced atomic transaction.

Malformed, partial, stale, unchanged, cross-family, duplicate, out-of-budget,
deletion-colliding, or preservation-drifting mutations fail with the existing
`422 AREA_UPDATE_OBJECT_MUTATION_INVALID` envelope. Existing authorization,
request budgets, optimistic concurrency, fencing, journal, rollback, recovery,
receipts, endpoint, streaming, chunking, and API-major contracts do not change.

## Diagnosability

The additive content-free event is `area_store_variable_table_cas.v1` with
`operation=parse_source|admit_profile|plan|write|readback`, outcome, stable
result code, target entry count, and duration. Variable names and values,
object identity, ordinal, hashes, paths, source/storage keys, raw fields or
bytes, credentials, and host paths are prohibited. Telemetry failure cannot
affect validation, mutation, publication, rollback, or recovery.

## Required implementation and evidence

1. [verified offline] Backend Store alias/domain and exact parser
   admission/rejection.
2. [verified offline] Detached repository projection and dependency
   fingerprinting.
3. [verified offline] Projector/planner complete-table CAS and fail-closed
   coverage.
4. [verified offline] Exact GIT mutation/readback, coexistence, byte
   preservation, and
   complete candidate coverage.
5. [verified offline] Frontend HTTP, mapper, workspace, clone, local draft,
   variable
   editor CRUD/reorder, and Apply/Cancel/OK regression coverage.
6. [verified offline] Content-free telemetry and sink-failure isolation.
7. [pending] Fresh guarded browser Save/reopen proof.
8. [pending] Fresh Toolset Save/Build/reopen and applicable NWN proof.

Proof completeness remains `missing` until both live axes are fresh,
identity-bound, validated, and accepted. Offline tests cannot replace them.

## Offline verification

The accepted bounded backend gate runs eight Store-variable-relevant suites in
one Jest worker under the repository 1-GiB heap cap. It passes `2099/2099`
tests across the exact domain/parser, snapshot repository, draft projector,
immutable-ordinal planner, paired GIT/GIC writer, candidate compiler, telemetry,
and capability catalog. The production Nest build passes.

The accepted bounded frontend gate runs nine files in one Vitest worker under
the same heap cap. It passes `907/907` tests across the exact variable domain,
HTTP boundary, Area mapper, workspace validation, detached cloning, local
drafts, property-draft materialization, Store Properties CRUD/reorder, and the
Apply/Cancel/OK regression smoke. The production TypeScript/Vite build passes
with only the pre-existing large-chunk advisory.

Capability revision `2026-08-31.115` records this audit, implementation, tests,
and the two still-open live proof axes. These offline results do not authorize
Store restrictions, inventory mutation, arbitrary Store-template authoring, or
any Toolset/NWN runtime claim.

## Resource-safety record

The audit used read-only decompilation and existing first-party audit/fixture
inspection. It started no Docker command, service, watcher, browser, capture,
Toolset, NWN, mutation runner, or subagent. Evidence classification follows
the `aurora-toolset-prove` workflow; no live function runner or proof profile
was invoked.
