# Existing Area Encounter Variable Table Audit v1

Date: 2026-09-01  
Status: Aurora semantics source-closed; offline implementation and focused verification complete; live proof pending  
Scope: the scripting-variable table owned by one existing type-`7` Encounter in an Area GIT

## Authority and licensing boundary

The primary runtime authority is the current frozen Toolset decompilation:

- `C:\Projects\New Folder\export\decompiled_all.c`
- SHA-256: `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`
- symbol index `C:\Projects\New Folder\export\functions.tsv`
- SHA-256: `394096FE106E5767EE6ECEB31C8B085091359060351B1D10195E96F666BC69FE`

No xoreos source, comment, implementation structure, or runtime conclusion was
used. Earlier source-closed Area-object variable-table audits were used only
after the Encounter ownership and native call path below had been established
directly.

## Storage ownership and native call path

The common Encounter reader `FUN_0055d470` is indexed at address `0x0055d470`,
size `1077`, and begins at decompilation line `215106`. After reading the
ordinary Encounter identity, flags, limits, scripts, Faction, and spawn fields,
it calls the generic variable-table reader at line `215228`:

```text
FUN_005e966c((undefined4 *)param_1[0x10], param_2, param_3)
```

The symmetric common writer `FUN_0055dbf8` is indexed at address `0x0055dbf8`,
size `470`, begins at line `215380`, and calls the generic writer at line
`215413`:

```text
FUN_005e9f50((int *)param_1[0x10], param_2, param_3)
```

The placed-Encounter reader `FUN_0055e1f8`, address `0x0055e1f8`, size `1206`,
begins at line `215585`. It delegates common fields through `FUN_0055d444`,
which immediately calls `FUN_0055d470`, before reading position, `Geometry`,
`SpawnPointList`, and paired-GIC `Comment`. The placed writer `FUN_0055e71c`,
address `0x0055e71c`, size `503`, calls `FUN_0055dbf8` before writing those
placed fields. Therefore the table is owned by the exact type-`7` Encounter
entry in the GIT `Encounter List`; it is not paired-GIC metadata and it is not
owned by the UTE blueprint.

## Native ordered-table grammar

The delegated generic functions are:

- reader `FUN_005e966c`, address `0x005e966c`, size `1937`, lines
  `284482..284867`;
- writer `FUN_005e9f50`, address `0x005e9f50`, size `465`, lines
  `284872..284930`.

They establish the exact admitted grammar:

- one optional exact `VarTable : List` field;
- absence reads as an empty table;
- physical entry order is retained;
- every entry has struct type `0` and exact fields `Name : CExoString`,
  `Type : DWord`, and `Value`;
- native `Type = 1` uses `Value : Int`;
- native `Type = 2` uses `Value : Float`;
- native `Type = 3` uses `Value : CExoString`;
- unsupported native types are preserve-only;
- an empty in-memory table is written by omitting `VarTable`;
- a non-empty table is emitted in the target order.

Order and duplicates are observable. Names and string values are not sorted,
trimmed, case-folded, deduplicated, normalized, or synthesized.

## Frozen web profile and boundary contract

Encounter variables use the shared Aurora web-safety profile:

- at most `1024` ordered entries;
- NUL-free `Name`, `0..64` ECMAScript code units;
- signed 32-bit integer values;
- finite, exactly materialized binary32 float values;
- NUL-free string values, `0..4096` ECMAScript code units;
- at most `1 MiB` combined name and string-value code units;
- add, edit, remove, and reorder are admitted;
- an empty target removes the exact Encounter-owned `VarTable` field.

Parsing and mutation are all-or-nothing. Wrong case, native type, struct type,
field count, duplicate or unknown labels, unsupported value types, invalid
binary32 values, or exceeded budgets leave the complete table preserve-only.

Read provenance is additive:

```text
encounterVariables: {
  expectedEntries: [
    { sourceIndex, name, type: "int", value },
    { sourceIndex, name, type: "float", value },
    { sourceIndex, name, type: "string", value }
  ]
}
```

The mutable target is the independent ordered
`encounterProperties.variables` array. Draft projection emits a complete CAS
pair only when the table changes:

```text
variables: {
  expectedEntries: [...exact retained entries...],
  entries: [...complete target entries...]
}
```

Planning reparses the exact current GIT Encounter ordinal and rejects stale,
malformed, unchanged, cross-family, duplicate, or deletion-colliding
mutations. The writer replaces, creates, or removes only that Encounter's
exact `VarTable`; unrelated GIT fields and all ARE/GIC/IFO bytes remain under
the existing atomic Area Update transaction.

## Offline verification and remaining proof

The implementation includes strict parsing, detached provenance, complete CAS
projection, immutable-ordinal planning, canonical create/replace/remove
writing, candidate parsing, HTTP and scene contracts, workspace admission,
independent cloning, CRUD/reorder helpers, and `ACTIVE_NOW`/`PRESERVE_ONLY`
dialog gating.

Focused verification completed under the repository's 1 GiB bounded profiles:

- Encounter variable domain: `7/7`;
- Area Update projector: `627/627`;
- exact-source planner: `422/422`;
- GIT/GIC pair writer: `976/976`;
- Area Update candidate compiler: `167/167`;
- capability catalog: `13/13`;
- Area Update atomic publication: `76/76`;
- frontend Encounter domain and polygon authoring: `33/33`;
- frontend HTTP/mapper/workspace/facade/dialog/clone/provenance group:
  `1043/1043`;
- real Workspace Apply/Cancel/reopen/OK/local-Save regression: `1/1`;
- backend and frontend production builds: passed.

The general parser suite admitted both new Encounter tests; its overall result
remains `321/323` because of the same two pre-existing, unrelated placed-item
metadata expectation failures.

Completion still requires fresh browser Save/reopen proof and exact-candidate
Toolset Save/Build/reopen plus NWN runtime proof. Until those artifacts exist,
the capability remains partial and the aggregate blocker is
`encounter_variable_table_live_proof_pending`; its live proof state is
`missing`, never `verified`.
