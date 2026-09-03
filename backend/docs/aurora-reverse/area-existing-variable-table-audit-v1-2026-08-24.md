# Existing Area Variable Table Audit v1

Date: 2026-08-24  
Status: Aurora semantics source-closed; offline implementation verified; live
proof still required  
Scope: the scripting-variable table owned by one existing Area

## Authority and licensing boundary

The primary runtime authority is the current frozen Toolset decompilation:

- `C:\Projects\New Folder\export\decompiled_all.c`
- SHA-256:
  `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`
- symbol index `C:\Projects\New Folder\export\functions.tsv`
- SHA-256:
  `394096FE106E5767EE6ECEB31C8B085091359060351B1D10195E96F666BC69FE`

Supporting independent evidence is limited to these frozen artifacts:

- `LC_AURORA_RE_ARTIFACT_2026-05-18_0600_are_git_ifo_deep_profile.json`,
  SHA-256
  `BA059F274D4491ABAFA0E2601AA3CFDEC112CA34634E2B9408AC432BDB05F169`;
- `LC_AURORA_RE_ARTIFACT_2026-05-18_0418_vartable_matrix.json`, SHA-256
  `54E6FC9D90994B5B7534ED3B853F802C7E0575F2962CE05AD3CAC94477700392`;
- `LC_AURORA_RE_ARTIFACT_2026-05-18_0427_git_top_list_and_vartable.json`,
  SHA-256
  `530EE3124A36CF2E3CEC56A83C7A62B44403C0350D3A829F2200D0FB19886A68`;
- `nwtoolset_rcdata_report.json`, SHA-256
  `3D9C5D29709BCF4AA037554781D229A2094F3D85370C44A6A5DF9A222F8D87FA`.

No xoreos source, comment, implementation structure, or runtime conclusion was
used. In particular,
`LC_AURORA_RE_ARTIFACT_2026-05-18_0728_import_camera_placeable_vartable.json`
was excluded because it contains xoreos source references. The product
implementation must be derived from the native observations and local GFF
abstractions only.

The current decompilation digest differs from an older digest recorded by the
Placeable-variable sibling audit. This audit deliberately re-binds every line
anchor below to the current frozen export instead of copying that older
digest.

## Storage ownership: GIT, not ARE

Area scripting variables are a top-level `VarTable : List` in the Area's GIT
companion. They are not an ARE root field.

The GIT/GIC loader `FUN_00567dcc` is indexed at address `0x00567dcc`, size
`2096`. Current decompilation lines `221342..221359` open resource type
`0x7e7` (GIT) and optional resource type `0x7fe` (GIC). After the ordinary GIT
header/properties reader, line `221379` calls:

```text
FUN_005e966c((undefined4 *)param_1[0x1b], param_1[2], &local_4c)
```

The same root cursor is then used for `Creature List`, `Door List`, and the
remaining GIT object lists. This locates the variable table at the GIT root,
outside every object struct.

The symmetric saver `FUN_005685fc` is indexed at address `0x005685fc`, size
`4581`. After writing ordinary GIT root properties, line `221755` calls:

```text
FUN_005e9f50(*(int **)(local_c0 + 0x6c),
             *(int **)(local_c0 + 8),
             &local_c4)
```

It creates `Creature List` and the other object lists only after that call.
The existing ARE field reader/writer handles Area properties such as
`ChanceLightning`, `LoadScreenID`, and `Tile List`; it does not call either
shared variable-table function. Consequently an Area-variable mutation must
change only the retained GIT companion unless another independently admitted
mutation is composed in the same transaction.

## Native table semantics

The generic reader `FUN_005e966c` is indexed at address `0x005e966c`, size
`1937`, and begins at current decompilation line `284482`.

- It clears the in-memory table before inspecting storage (`284550..284552`).
- It opens the exact root label `VarTable` as a list (`284567`).
- Absence therefore leaves an admitted empty in-memory table.
- It walks the physical list from index `0` to count minus one
  (`284569..284572`).
- Every admitted entry reads exact `Name : CExoString` and `Type : DWord`.
- `Type = 1` reads `Value : Int` (`284671..284699`).
- `Type = 2` reads `Value : Float` (`284700..284730`).
- `Type = 3` reads `Value : CExoString` (`284731..284843`).
- An unsupported type allocates no native entry and is not added to the
  in-memory table (`284670..284847`).
- Accepted entries are appended in physical list order (`284845..284849`).

The generic writer `FUN_005e9f50` is indexed at address `0x005e9f50`, size
`465`, and begins at line `284872`.

- A zero-count in-memory table returns without writing `VarTable`
  (`284890..284893`).
- A non-empty table creates exactly one `VarTable : List` (`284902`).
- It emits entries in in-memory order (`284904`).
- Every entry uses struct type `0` (`284905`).
- It writes exact `Name : CExoString`, `Type : DWord`, and a typed `Value`
  selected only by native type `1`, `2`, or `3` (`284906..284930`).

These are the same generic native routines used by Placeable variable tables.
The storage location differs, but the ordered entry grammar does not. Physical
order and duplicate complete entries must therefore be preserved; no product
layer may sort, trim, case-fold, deduplicate, or normalize them.

## Toolset UI evidence

The frozen RCDATA report identifies `TDLGAREAPROPERTIES` at RVA `0x00AC67B0`,
size `16478`. Its resource includes `stVariables`, the visible label
`Variables`, button `bVariablesEdit`, and handler `bVariablesEditClick`.

The generic editor resource `TDLGVARTABLE` is at RVA `0x00BB9C08`, size
`2188`. It is captioned `Scripting Variables` and contains the visible
Name/Type/Value controls, ordered list view, and Replace/Add/Delete handlers.
RCDATA proves that the Area properties surface opens the shared editor. The
GIT reader/writer call chain above, not RCDATA alone, proves the storage
mapping.

## Retail corpus evidence

The deep profile scanned 18 MOD containers and 25 GIT resources with no scan
errors. A top-level `VarTable` occurred in 2 of 25 GIT resources and had list
length `1` in both occurrences. These are duplicate module copies rather than
two independent semantic fixtures, so the evidence must not be reported as
broad content diversity.

The exact semantic sample in the independent matrix is:

```text
module: DEMO-Plague.mod
area resref: temple
container: top.VarTable
entry: { Name = "PLG_AREA_FREEZE_DISEASE", Type = 1, Value = 1 }
```

This corpus evidence confirms real authored top-level GIT storage. Native
decompilation remains the authority for the full type profile, absence
behavior, and save behavior.

## Frozen web product profile

Area-variable editing admits the complete native type set `1..3` with the
same shared web-safety budgets as other Aurora variable tables. These budgets
are product limits, not claims about Aurora limits:

- at most `1024` ordered entries;
- `Name`: exact NUL-free `CExoString`, `0..64` ECMAScript code units;
- integer: exact signed 32-bit value `-2147483648..2147483647`;
- float: finite IEEE-754 binary32 value, materialized as exact `Math.fround`
  output at the frontend boundary;
- string: exact NUL-free `CExoString`, `0..4096` ECMAScript code units;
- at most `1 MiB` combined name and string-value ECMAScript code units per
  complete target table;
- physical order and duplicates are retained;
- add, edit, remove, and reorder are admitted;
- an empty target removes the one exact `VarTable` field.

Parsing is all-or-nothing. Multiple case-insensitive root labels, wrong exact
case or native type, a nonzero entry struct type, missing/duplicate/unknown
entry labels, wrong value type, unsupported `Type`, a non-finite/non-binary32
float, or any exceeded budget makes the complete source table preserve-only.
A partially understood list is never projected as an editable table.

Unlike fixed retained-field mutations, an absent root `VarTable` is an
editable empty source. This admission is directly supported by the native
pair: the reader first clears the table and treats absence as empty, while the
writer materializes one non-empty list when entries are later present. This
special case does not authorize creation of any other missing GIT field.

## Additive FE-BE contract v1

Area detail may expose immutable source provenance:

```text
variables: {
  expectedEntries: [
    { sourceIndex, name, type: "int", value },
    { sourceIndex, name, type: "float", value },
    { sourceIndex, name, type: "string", value }
  ]
}
```

For an absent native field this object is present with
`expectedEntries: []`. A malformed source omits `variables` and remains
preserve-only. The editable scene owns a separate ordered `areaVariables`
target without `sourceIndex`; immutable source entries are never mutated in
place.

Draft projection emits a mutation only when the complete typed ordered table
changes:

```text
variables: {
  expectedEntries: [...exact source entries...],
  entries: [...complete target entries...],
  sourceGitSha256: "<64 lower-case hex>"
}
```

The source digest comes from production-draft provenance and is not accepted
from a free-form UI field. Unknown keys, missing arrays, unchanged pairs,
partial tables, coerced values, invalid `sourceIndex`, and over-budget targets
fail closed.

The compiler reparses the retained GIT under the module fencing lease, checks
the original descriptor digest and exact expected table, and composes the
mutation on the current `candidateGitBytes` after already admitted object and
audio mutations. It replaces, creates, or removes only one exact root
`VarTable`. Candidate and persisted readback must reproduce the complete typed
ordered target exactly. ARE and GIC bytes remain identical, and IFO remains
identical unless another admitted mutation changes it in the same atomic
publication.

The existing Area Update command, authorization, optimistic revision, request
idempotency, journal, recovery, envelope, and API major version remain
unchanged. The fixed maximum table is carried in the existing bounded draft;
there is no pagination, streaming, or chunking.

## Diagnosability and completion gates

Diagnostics must identify module/Area/draft plus the source GIT digest and use
bounded codes rather than raw native bytes or host paths. At minimum, source
malformation, stale expected table/digest, budget rejection, candidate
readback mismatch, and persisted readback mismatch must remain distinguishable.

Required offline gates are:

- strict parser tests for absence, empty/non-empty, all three types, order,
  duplicates, wrong case/type/struct, missing/duplicate/unknown labels,
  unsupported types, invalid floats, and every budget boundary;
- shared domain, projector, stale-CAS, writer replacement/materialization/
  removal, parse-serialize-parse, unrelated-field, and companion-byte tests;
- frontend shared-domain, mapper provenance, CRUD/reorder, clone/cancel/undo,
  facade, dialog, and update-payload coverage;
- focused backend/frontend gates followed by complete unit/regression gates
  and both production builds.

Offline tests and persisted readback are not release proof. Browser Save/reopen
must produce a fresh exact capture under the proof-capture safety contract.
Exact-candidate Toolset Save/Build/reopen and NWN runtime validation remain
separate native proof points. Until those artifacts exist and validate, this
feature's proof state is `missing`, never `verified`.

## Offline implementation checkpoint

Immutable capability catalog revision `2026-08-24.27` removes Area variables
from the aggregate `properties_advanced_flags` preserve-only blocker. The row
truthfully remains `verified/partial/blocked`: other advanced controls and the
browser, Toolset, and NWN proof gates are still open.

The implemented production chain now covers:

- strict root-GIT `VarTable` parsing and immutable source projection;
- the shared typed ordered variable domain in backend and frontend;
- Area workspace draft cloning, facade mutation construction, and shared
  Add/Edit/Delete/Reorder UI;
- strict HTTP request and receipt contracts with source-index and binary32
  validation;
- draft projection with retained source digest and unchanged-table rejection;
- CAS writer replacement, creation, removal, round trip, and preservation of
  unrelated GIT fields;
- composition after object and audio GIT mutations while binding every summary
  to one final candidate GIT digest;
- independent candidate validation against both declared summaries and parsed
  candidate bytes;
- transaction receipt propagation and exact persisted semantic readback; and
- atomic companion publication with byte-identical ARE, GIC, and IFO when no
  separately admitted mutation targets those companions.

The resource-bounded verification recorded on 2026-08-24 is:

- capability catalog: 12/12;
- compiler, validation, and transaction coordinator: 86/86;
- Area variable domain, writer, persisted verifier, and atomic storage adapter:
  42/42;
- atomic Area-variable publication integration: 1/1; and
- frontend shared domain, workspace draft, facade, HTTP adapter, and Area
  dialog: 106/106.

Both production builds pass. The earlier complete frontend unit run remains
non-green because three shared-worktree VFX/placeable/viewport-layout failures
outside this Area-variable slice are still present. Consequently the complete
unit/regression gate is not claimed. No backend/frontend service, browser,
capture, Toolset, or NWN process was started for this checkpoint.
