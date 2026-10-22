# Existing Area Trigger Variable Table Audit v1

Date: 2026-09-05  
Status: Aurora semantics source-closed; test-first implementation pending  
Scope: the ordered scripting-variable table owned by one exact retained
type-`1` Trigger in an Area GIT

## Decision

Aurora Web may expose and mutate the exact ordered `VarTable` of one retained
Trigger by reusing the already frozen shared Aurora variable-table grammar.
Exact absence is an editable empty table. A non-empty table retains physical
entry order, duplicate names, empty names, and empty string values. It is not
sorted, trimmed, case-folded, deduplicated, normalized, or synthesized.

The admitted entry variants are exact struct type `0` records with exactly one
case-sensitive `Name : CExoString`, `Type : DWord`, and compatible `Value`:

- native `Type = 1` uses `Value : Int`;
- native `Type = 2` uses `Value : Float`;
- native `Type = 3` uses `Value : CExoString`.

Unsupported native types and malformed or ambiguous storage remain
`PRESERVE_ONLY`.

## Immutable authority and licensing boundary

| Artifact | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| `NWTOOLSET_RCDATA_REFRESH_2026-05-20.json` | `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa` |

No xoreos or other GPL source was inspected or used. Earlier source-closed
Aurora Web variable-table audits are secondary product references only; the
Trigger ownership and native call path below were established directly first.

## Trigger ownership and native call path

The common Trigger reader `FUN_00656720`, address `0x00656720`, size `3596`,
begins at decompilation line `345687`. After reading the Trigger's ordinary
identity, flags, transition fields, trap fields, and event scripts, it invokes
the generic variable-table reader at line `346095`:

```text
FUN_005e966c((undefined4 *)param_1[0x10], param_2, param_3)
```

The symmetric common Trigger writer `FUN_0065752c`, address `0x0065752c`, size
`649`, begins at line `346102` and calls the generic table writer at line
`346143`:

```text
FUN_005e9f50((int *)param_1[0x10], param_2, param_3)
```

Placed Trigger reader/writer `FUN_00657a88` / `FUN_00657de0` delegate the
common Trigger record before the instance placement, Geometry, and paired-GIC
Comment lanes. Therefore `VarTable` belongs directly to the exact type-`1`
GIT Trigger record; it is not paired-GIC metadata and is not authorized by the
UTT blueprint.

## Native ordered-table grammar

Generic reader `FUN_005e966c`, address `0x005e966c`, size `1937`, spans lines
`284482..284867`. It opens exact `VarTable` at line `284567`, iterates physical
list order, reads `Name` and `Type`, and dispatches `Value` by native type.
Generic writer `FUN_005e9f50`, address `0x005e9f50`, size `465`, spans lines
`284872..284936`. It omits `VarTable` for an empty internal table; otherwise it
creates the list and writes each exact typed entry in current order.

Frozen `TDLGTRIGGEREDIT`, size `13240` at RVA `0x00BB62F8`, independently
contains `bVariablesEdit`, handler `bVariablesEditClick`, and label
`Variables`. This confirms a dedicated Trigger Properties variables surface;
it does not prove NWN scripting behavior.

## Frozen additive contract

Trigger variables use the shared Aurora Web safety profile:

- at most `1024` ordered entries;
- NUL-free `Name`, `0..64` ECMAScript code units;
- signed 32-bit integer values;
- finite values exactly materialized as binary32 floats;
- NUL-free string values, `0..4096` ECMAScript code units;
- at most `1 MiB` combined name and string-value code units;
- add, edit, remove, and reorder are admitted;
- an empty target removes the exact Trigger-owned `VarTable` field.

Area detail may add immutable source provenance only for an exact admitted
type-`1` record:

```text
triggerVariables: {
  expectedEntries: [
    { sourceIndex, name, type: "int", value },
    { sourceIndex, name, type: "float", value },
    { sourceIndex, name, type: "string", value }
  ]
}
```

The frontend deep-copies that provenance under `source.triggerVariables` and
authors a separate ordered `triggerProperties.variables` target. A real
change projects exactly one complete CAS member:

```text
variables: {
  expectedEntries: [...exact retained entries...],
  entries: [...complete target entries...]
}
```

Planning reparses the exact current type-`1` ordinal and rejects stale,
malformed, unchanged, cross-family, duplicate, or deletion-colliding
mutations. Writing creates, replaces, or removes only that Trigger's exact
`VarTable`, then requires whole-candidate and persisted readback. Every
unrelated Trigger field and all paired GIC, ARE, and IFO bytes remain governed
by the existing revision-fenced atomic Area Update transaction.

## Diagnosability and completion boundary

The additive low-cardinality event is
`area_trigger_variable_table_cas.v1` with operations
`parse_source|plan|write|readback`, outcome, stable result code,
`changedEntryCount`, and duration. Variable names and values, object IDs,
ordinals, hashes, paths, source/storage keys, raw fields or bytes,
credentials, and host paths are prohibited from routine logs and metric
labels. A telemetry sink failure cannot affect validation, mutation,
transaction, rollback, recovery, or publication.

Offline acceptance requires exact parser rejection coverage, detached source
and target state, saved-draft/history cloning, visible
`ACTIVE_NOW`/`PRESERVE_ONLY` ordered CRUD/reorder controls,
Apply/Cancel/reopen/OK/local Save, projector/planner/writer/candidate and
persisted readback, resource preservation, coexistence with other Trigger
changes, integration, regression, capability-catalog coverage, and both
production builds.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed `VarTable` readback, and NWN scripting-variable behavior remain
independent release gates. This audit does not certify complete Trigger,
Area, tile, PathConnect, or 99-tileset-matrix completion.

## Resource/process statement

This source audit used immutable decompilation exports and frozen RCDATA only.
No Docker command, container, service, watcher, browser, Chrome, capture,
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source was used. No installed skill matches this offline static-decompilation
and TypeScript contract slice.
