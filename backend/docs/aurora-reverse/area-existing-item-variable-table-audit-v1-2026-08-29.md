# Existing Area Ground-Item Variable Table Audit v1

Date: 2026-08-29  
Status: Aurora semantics source-closed; implementation contract frozen  
Scope: the scripting-variable table owned by one retained type-`0` ground
Item in an Area GIT, plus the adjacent Item-script UI boundary

## Decision

Aurora Web may expose the exact ordered `VarTable` owned by a retained ground
Item. It uses the already source-closed shared Aurora variable-table grammar:

- optional exact root member `VarTable : List`;
- absence is the empty in-memory table;
- every entry has struct type `0` and exact fields `Name`, `Type`, and `Value`;
- native `Type = 1` uses `Value : Int`;
- native `Type = 2` uses `Value : Float`;
- native `Type = 3` uses `Value : CExoString`;
- physical order and duplicates are retained;
- unsupported types are not admitted for editing;
- an empty table is serialized by omitting `VarTable`.

The web profile remains the shared bounded profile: at most `1024` entries,
NUL-free names of at most `64` ECMAScript code units, signed 32-bit integers,
finite exact binary32 floats, NUL-free strings of at most `4096` code units,
and at most `1 MiB` combined name and string-value code units. Add, edit,
remove, and reorder are admitted without trimming, sorting, case folding,
deduplication, or normalization.

Per-Item event scripts are not a native Item-editor surface and are not an
admitted mutation. The existing Aurora Web Item `Scripts` tab is therefore a
misleading shell rather than pending native parity. It must not serialize the
loose compatibility metadata keys `script.onused`, `script.onheartbeat`,
`script.onuserdefined`, or `script.oninventorydisturbed`. The shell is to be
replaced by the native Variables surface; retained unknown fields continue to
be preserved byte-for-byte by the exact-field mutation writer.

## Authority and licensing boundary

Primary runtime authority:

- `C:\Projects\New Folder\export\decompiled_all.c`
- SHA-256:
  `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`
- `C:\Projects\New Folder\export\functions.tsv`
- SHA-256 recorded by the current Creature-variable audit:
  `394096FE106E5767EE6ECEB31C8B085091359060351B1D10195E96F666BC69FE`

Primary native-window corroboration:

- `C:\Projects\nwn-last-city\Aurora\reverse\runs\NWTOOLSET_RCDATA_REFRESH_2026-05-20.json`
- `TDLGITEMEDIT`, RVA `0x00B5F870`, size `18562`, `401` extracted strings.

No xoreos source, comment, implementation structure, or other GPL source was
inspected or used. Existing Placeable and Creature audits were used only after
the independent Item ownership path below was established.

## Native ownership and call path

The common Item reader `FUN_00604db8`, address `0x00604db8`, starts at current
decompilation line `299920`. After reading the ordinary Item fields, property
list, model parts, armor parts, and colors, it calls the generic variable-table
reader at line `300275`:

```text
FUN_005e966c((undefined4 *)param_1[0x10], param_2, param_3)
```

The symmetric common Item writer `FUN_00605b0c` starts at line `300282`. After
writing the ordinary and nested Item state, it calls the generic writer at line
`300420`:

```text
FUN_005e9f50(*(int **)(param_1 + 0x40), param_2, (uint *)param_3)
```

Both accesses address the same Item member at byte offset `0x40`.

The retained ground-Item reader `FUN_006077a8`, address `0x006077a8`, calls the
common reader for its embedded Item payload at line `301464`, before reading
the Item placement coordinates and orientation:

```text
FUN_00604db8(param_1 + 0x22, param_2, local_38)
```

The retained ground-Item writer `FUN_00607ccc`, address `0x00607ccc`, writes
placement coordinates and the independently paired GIC editor comment, then
calls the common Item writer for the GIT payload at line `301653`:

```text
FUN_00605b0c(param_1 + 0x88, param_2, (undefined1 *)param_3)
```

This binds `VarTable` to the exact type-`0` Item struct in the GIT root `List`.
It is not GIC state and must not resolve or rewrite a UTI blueprint.

The delegated generic reader/writer pair is the already audited
`FUN_005e966c` / `FUN_005e9f50`, addresses `0x005e966c` / `0x005e9f50`, whose
exact ordered three-type grammar is frozen in the Placeable and Creature
variable-table audits.

## Native Item-window boundary

The extracted `TDLGITEMEDIT` resource contains handlers `bVariablesClick` and
`bInventoryClick`. Its strings define the native Item pages `General`,
`Appearance`, `Properties`, `Description`, and `Comments`, followed by the
buttons `Variables...` and `Inventory ...`. The resource contains no Item
`Scripts` page, no event-script controls, and no event-script handler.

An exhaustive inspection of the common Item reader/writer range
`FUN_00604db8` / `FUN_00605b0c` likewise contains no event-script ResRef read
or write before delegating to `VarTable`. The `Script Name` label in the
resource belongs to the General identity row adjacent to Blueprint Name; it
does not establish an event-script table.

Accordingly, loose `script.*` compatibility metadata remains non-authoritative
read-only data. It cannot be used to invent an Item mutation contract.

## Additive contract v1

Area-detail readback may add exact immutable Item provenance:

```text
itemVariables: {
  expectedEntries: [
    { sourceIndex, name, type: "int", value },
    { sourceIndex, name, type: "float", value },
    { sourceIndex, name, type: "string", value }
  ]
}
```

The mutable frontend target is the separate ordered
`itemProperties.variables` array without `sourceIndex`. The source list is
detached and never edited in place. Projection emits a complete compare-and-
swap pair only when the target differs:

```text
variables: {
  expectedEntries: [...exact retained entries...],
  entries: [...complete target entries...]
}
```

Planning reparses the exact current GIT Item ordinal and rejects malformed,
stale, unchanged, cross-family, duplicate, out-of-range, or deletion-colliding
mutations. The writer replaces, creates, or removes only the Item-owned exact
`VarTable` field and independently reparses the candidate for exact typed
ordered readback. Every unrelated GIT field and all ARE/GIC/IFO bytes remain
governed by the existing revision-fenced atomic Area Update transaction.

## Diagnosability and required proof

Stable failure categories are `invalid_shape`, `ambiguous_field`,
`wrong_case`, `wrong_type`, `unsupported_type`, `budget_exceeded`,
`stale_storage`, `unchanged`, `deleted_target`, and
`candidate_readback_mismatch`. Telemetry may expose only contract revision,
object family, bounded stage, outcome, stable result code, entry count, and
duration. Variable names, values, object IDs, ordinals, source keys, paths,
hashes, and raw bytes are excluded from metric labels.

Offline completion requires strict parser tests, detached repository
provenance, projector/planner full-table CAS tests, writer
parse/serialize/parse readback and byte-preservation tests, frontend boundary
validation, mapping, reducer/materializer/clone tests, dialog CRUD/reorder and
cancel/reopen coverage, focused unit/regression gates, and both builds.

Fresh guarded browser Save/reopen proof and exact-candidate Toolset
Save/Build/reopen and NWN proof remain separate live certification gates. No
live proof is claimed by this source-closure audit.

## Resource-safety decision

This implementation lane uses no Docker command, service, watcher, browser,
capture, Chrome, live Toolset/NWN process, mutation testing, sub-agent, xoreos,
or other GPL source. Verification is sequential through repository scripts,
with one worker and the one-GiB Node heap ceiling.
