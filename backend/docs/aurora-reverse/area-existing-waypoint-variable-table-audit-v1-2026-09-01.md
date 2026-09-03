# Existing Waypoint ordered `VarTable` audit v1

Date: 2026-09-01

## Scope and conclusion

This audit closes the offline Aurora semantic required to edit the ordered
top-level GIT `VarTable` of one retained type-`5` Waypoint. Aurora uses the
same common variable-table reader and writer for Waypoints as for the other
variable-owning object families. The admitted native entry variants are exact
`INT`, `FLOAT`, and `CExoString` values selected by native `Type` DWord values
`1`, `2`, and `3`. Physical order, duplicate names, empty names, and empty
strings are significant and are not normalized.

The implementation may therefore reuse the shared bounded Aurora variable
domain and writer algorithm. It must still bind provenance and diagnostics to
the Waypoint family and exact immutable Waypoint ordinal. Malformed or
unsupported storage remains preserve-only.

## Immutable authority

| Artifact | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| `NWTOOLSET_RCDATA_REFRESH_2026-05-20.json` | `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa` |

No xoreos or other GPL source was consulted.

## Decompilation findings

1. Waypoint reader `FUN_00658170` begins at decompilation line `346780` and
   calls common reader `FUN_005e966c((undefined4 *)param_1[0x10], ...)` at line
   `347038`, after the other Waypoint fields have been loaded.
2. Common reader `FUN_005e966c` begins at line `284482`. It opens exact
   `VarTable` at line `284567`, iterates the physical list in increasing index
   order, reads exact `Name : CExoString` and `Type : DWord`, and dispatches:
   `1 -> Value : Int`, `2 -> Value : Float`, `3 -> Value : CExoString`.
3. Waypoint writer `FUN_00658b4c` begins at line `347158` and calls common
   writer `FUN_005e9f50((int *)param_1[0x10], ...)` at line `347189`.
4. Common writer `FUN_005e9f50` begins at line `284872`, creates `VarTable` at
   line `284902`, writes each entry in current physical order, and emits exact
   `Name`, `Type`, and typed `Value` members. When the internal table is empty,
   it does not emit `VarTable`.

## Frozen dialog evidence

The frozen `TDLGWAYPOINTEDIT` RCDATA resource has size `3368`, RVA
`0x00BBC168`, and contains the `bVariables` button, caption `Variables...`, and
handler `bVariablesClick`. This independently confirms that variables belong
to the Waypoint property workflow.

## Admitted contract

- Exact absence is an editable empty table.
- A non-empty source requires one case-sensitive `VarTable : List`.
- Every list entry is type `0` and contains exactly one case-sensitive
  `Name : CExoString`, `Type : DWord`, and compatible typed `Value`.
- The shared resource budget is at most 1024 entries, names up to 64 NUL-free
  ECMAScript code units, strings up to 4096 NUL-free code units, and 1 MiB of
  aggregate name/string text.
- Integers are signed int32. Floats are finite values exactly materialized as
  binary32. Order and duplicates are preserved.
- A complete changed target can add, edit, remove, or reorder entries. An
  empty target removes `VarTable`.
- The backend reparses and compares the complete expected source vector before
  replacing only `VarTable`; candidate and persisted readback remain required.

## Remaining live proof

Fresh browser Save/reopen, exact-candidate Toolset Save/Build/reopen with
packed `VarTable` readback, and NWN scripting-variable behavior remain
independent release gates. This offline audit does not claim those gates.
