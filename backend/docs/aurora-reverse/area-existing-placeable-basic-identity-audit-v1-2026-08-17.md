# Existing Area Placeable basic-identity audit v1

Date: 2026-08-17; checkpoints through 2026-08-18  
Status: Appearance, Tag, and bounded inline-ASCII Name/Description are offline-verified; complete multilingual editing and live native certification remain open

## Decision

The three Toolset controls do not form one interchangeable string identity:

| Toolset label | Native GIT field | Native type | Meaning | Audit disposition |
| --- | --- | --- | --- | --- |
| `Name` | `LocName` | `CExoLocString` | Language-sensitive localized display name | Offline-verified only for the exact inline language-0 printable-ASCII profile; all other storage remains preserve-only |
| `Tag` | `Tag` | `CExoString` | Script/editor tag stored on the instance | Offline-verified through immutable family-ordinal identity, exact provenance, writer, and readback |
| `Appearance Type` | `Appearance` | canonical `DWord`; legacy `Byte` accepted on read | Physical row ordinal in the effective `placeables.2da` | Offline-verified mutation only for a present canonical `DWord`, exact effective-table provenance, and an existing physical target row |
| `Description` | `Description` | `CExoLocString` | Localized gameplay description | Offline-verified only for the same bounded inline language-0 printable-ASCII profile; all other storage remains preserve-only |

`TemplateResRef` is a fourth, separate `ResRef`. It is not the Appearance Type,
does not select a `placeables.2da` row, and must not be changed as an indirect
way to change appearance.

The base audit recorded the exact source boundary and the prerequisites for
later mutation slices. The 2026-08-18 checkpoints below activate the separate
Appearance and Tag writers. The 2026-08-19 checkpoint at the end of this audit
adds only the narrower source-closed inline-ASCII `LocName` and `Description`
profile; it does not authorize full multilingual localized-string editing.

## Scope, rules, and authority

The scope is a retained type-`9` Placeable in an Area GIT and the corresponding
UTP/template lineage needed to distinguish placed state from template state.
It excludes new-object construction, palette authoring, Portrait, Description,
variables, gameplay/runtime appearance changes, and Toolset/NWN proof.

Primary decompilation authority is
`C:/Projects/New Folder/export/decompiled_all.c`, 30,366,020 bytes, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
The corresponding binary is
`C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
12,201,984 bytes, SHA-256
`4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`.
Only read-only PE resources, decompilation, installed KEY/BIF resources, and
existing repository readbacks were inspected. No Toolset or NWN process was
started. No xoreos or other GPL source was inspected or used.

## Evidence inventory

The existing immutable construction evidence is:

- `evidence/area-placeable-construction-2026-08-13/base-utp-source-readback.json`,
  SHA-256
  `4262fcad87d13413cf7f1c771c1f7cba92c2b504d222b31460c1609699694781`;
- `evidence/area-placeable-construction-2026-08-13/native-instance-readback.json`,
  SHA-256
  `64c26a28ae287ba4b163803b2b7c40d5a4ff33b90675bf2c07e804c1032c0048`;
- source `plc_watertrough.UTP`, 1,771 bytes, SHA-256
  `a1b00834837b3c516d823f63e00054b2331044bdbccca1d49f1bc121f854c531`.

The installed resource chain inspected read-only was:

- `data/nwn_retail.key`, SHA-256
  `dc1a96582a44e614bcd55ce42abf119416848ba47a9ef2a8818b227832c7b37a`;
- `data/nwn_base.key`, SHA-256
  `09cdafb6dbfb9cdb544993154c514c65ef9fd5be4e0c1b8fd971ed05aff90935`;
- `data/base_2da.bif`, SHA-256
  `ecf1162d2af8375c2ab0d68befd1e1f79cec57545fd6c7953155ea55ee8c9c57`.

`nwn_retail.key` does not resolve `placeables.2da`. `nwn_base.key` resolves it
to resource index `501` in `base_2da.bif`. The extracted resource is 3,019,695
bytes, SHA-256
`b772eafec5e6b380ad41e163e2a52585f2ddcec1c5bd7acea230b7e1a618df90`.

## Native storage lineage

### Common situated-object state

`FUN_0063aac4` initializes the common situated-object members. It creates an
empty localized name, an empty tag, and numeric Appearance `0`.

`FUN_0063ae68` is the common reader. In relevant order it:

1. reads `TemplateResRef` as a ResRef;
2. reads `Tag` through the native string reader;
3. reads `LocName` through the native localized-string reader;
4. inspects the native type of `Appearance`, reading legacy type `Byte` when
   present and otherwise reading the canonical `DWord` representation.

`FUN_0063b8a0` is the symmetric common writer. It writes:

- `Tag` with the `CExoString` writer;
- the complete `LocName` with the `CExoLocString` writer;
- `Appearance` with the `DWord` writer.

The UTP Placeable reader/writer `FUN_0063bf74` / `FUN_0063c0a8` call this
common lineage. The placed-object reader/writer `FUN_0063d0d8` /
`FUN_0063d3d8` call the Placeable lineage and then handle instance/Area state.
Consequently, a type-`9` GIT Placeable carries its own complete `LocName`,
`Tag`, and `Appearance`; these are not looked up dynamically through
`TemplateResRef` when the Area is read or written.

The native writer emits the common fields even when their values equal the
in-memory defaults. That native materialization behavior must not be copied by
the product's lossless retained-object writer: absence and an explicit default
are different optimistic-lock provenance states.

### Placed state versus template state

The admitted source UTP contains:

```text
TemplateResRef : ResRef        = plc_watertrough
Tag            : CExoString    = "Water Trough"
LocName        : CExoLocString = { strRef: 5747, entries: [] }
Appearance     : DWord         = 104
```

The native placed instance readback contains, independently:

```text
TemplateResRef : ResRef     = plc_watertrough
Tag            : CExoString = "WaterTrough"
Appearance     : DWord      = 104
```

The different UTP and placed tags are direct evidence that the placed value is
owned by the instance and is not a live template alias. Appearance remaining
`104` in both records proves copied/stored value lineage, not a relationship
between Appearance and the string `plc_watertrough`.

## `Name` means complete `LocName`, not a plain string

The `TFRASITUATEDBASIC` PE resource contains `eName` and `bName`. The situated
basic-frame controller owns both a localized-string working value and the
object value. `FUN_006f4690` copies the full native `CExoLocString` into the
controller through `FUN_00acdde0`; `FUN_006f4b40` copies the full value back
through `FUN_00acdefc`. The button therefore opens localized-string editing;
the text edit is not a complete mutation contract.

A GFF `CExoLocString` contains a `strRef : uint32` followed by ordered localized
substrings. Each substring carries its numeric language/gender identifier and
text. The identifier, order, duplicate identifiers, empty strings, and base
`strRef` are all semantically relevant source state.

The current backend helper advances past each substring identifier and returns
only text strings. The display-name helper then trims, deduplicates, and
case-normalizes aliases. The frontend `Name` field is a single plain string.
That path cannot round-trip a `CExoLocString`, so none of the following is
authorized:

- replacing only the first localized substring;
- replacing `strRef` with a custom string;
- trimming, deduplicating, sorting, or case-folding substrings;
- projecting the current display alias back into `LocName`.

`LocName` remains preserve-only until the boundary carries the exact
presence-sensitive localized structure and the parser/writer proves all
languages and the complete struct round trip.

## `Tag` is a native instance `CExoString`

The same PE frame contains `eTag : TEdit`. Its serialized `MaxLength` is
`32`. `FUN_006f4690` loads the common situated-object tag member into `eTag`;
`FUN_006f4b40` reads the edit control and assigns it back to the same native
`CExoString` member. There is no `placeables.2da` lookup and no template
resolution on this path.

The value can be empty natively. The Toolset control limit is 32 editor
characters; it is not evidence that the underlying `CExoString` format has a
32-byte capacity. A future product boundary may deliberately use `0..32`
ECMAScript code units as its own stricter budget, but must state that this is a
product limit and must reject NUL, trimming, Unicode normalization,
case-folding, and silent truncation.

The original blocker was circular identity: `sourceObjectId` incorporated a
normalized Tag, so changing the same value used to identify a retained object
could retarget the mutation. The 2026-08-18 ordinal checkpoint removes that
authority. `(sourceKind, sourceIndex)` is now the immutable locator, while
`sourceObjectId` is diagnostic and remains a compatibility fallback only for
older non-Tag drafts. Exact empty/present Tag provenance crosses the boundary,
and Tag editing is admitted only when the family ordinal is present.

## `Appearance Type` is an effective `placeables.2da` row ordinal

### Toolset control and mapping

The `TFRASITUATEDBASIC` PE resource contains
`cbAppearanceType : TComboBox` with:

```text
Style         = csDropDownList
Sorted        = True
DropDownCount = 20
ItemHeight    = 13
```

`csDropDownList` disallows arbitrary text. `DropDownCount=20` is only the
visible dropdown height, not the number of valid appearances.

`FUN_0068e5a0` loads the effective table named `placeables`, obtains its row
count, and iterates every physical row ordinal. It resolves display text from
`StrRef`, falling back to `Label`, then stores the physical row ordinal as the
combo item's hidden data. `Sorted=True` sorts only the displayed text; it does
not renumber the hidden values.

`FUN_0068e558` returns the selected hidden row ordinal, or `-1` when no item is
selected. `FUN_0068ead4` selects an item whose hidden value equals the object's
numeric Appearance. `FUN_0068f234` writes that hidden value back only when it
is non-negative. Therefore an unresolved existing numeric value is not
silently overwritten just because the control cannot select it.

### Effective-table semantics

The installed base `placeables.2da` columns are:

```text
Label StrRef ModelName LightColor LightOffsetX LightOffsetY LightOffsetZ
SoundAppType ShadowSize BodyBag LowGore Reflection Static
```

It has 16,500 physical rows, numbered `0..16499`. Row `104` is:

```text
Label=WaterTrough  StrRef=5747  ModelName=PLC_N02
SoundAppType=17    ShadowSize=1  BodyBag=0        Static=1
```

The admitted UTP and placed GIT both store `Appearance : DWord = 104`, which
selects that physical row. The field is not a model ResRef; `ModelName` is a
separate column reached only after resolving the table row.

The base-table count is not a global numeric limit. An effective module may
override/extend `placeables.2da` through its ordered resource stack. Native
storage is unsigned `DWord`, but the Toolset only offers physical rows in the
effective table. A safe product target is therefore not merely any uint32: it
must be an existing physical row in the exact table bytes resolved for the
candidate.

Legacy `Appearance : Byte` is accepted by the native reader. The canonical
writer emits `DWord`. A retained lossless update must not use this fact to
migrate a legacy Byte or materialize an absent field. Legacy Byte, wrong type,
duplicate field, and absent field are preserve-only in this audit.

## Historical product mismatch and correction

Before the checkpoints, `PlaceablePropertiesDialog.tsx` presented three plain
text inputs:

- `Name` writes `draft.name`;
- `Tag` writes `draft.tag`;
- the field labelled `Appearance Type` writes `draft.resRef`.

The scene mutation facade trims these strings. `resRef` represents
`TemplateResRef`, not the numeric `Appearance` field, so the label and target
are semantically wrong. The UI also cannot represent a complete localized
name or a table-backed appearance selection.

The backend intentionally prevents silent persistence of this mismatch.
`planRetainedObjectTransform` compares retained `resRef` with source
`TemplateResRef` and retained `tag` with source `Tag`, then rejects differences
with `Existing-object deletion cannot silently persist other object
mutations.` This is a correct fail-closed guard, not Basic Identity CRUD.

The separate Appearance checkpoint replaced the incorrect ResRef alias with a
digest-bound physical-row selector. The Tag checkpoint enables only the exact
ordinal-bound Tag control and preserves text verbatim. Name and TemplateResRef
remain disabled and non-destructive.

## Frozen source boundary and future admission conditions

Only the following source facts are closed by this audit:

1. exact presence and value of `Tag : CExoString`, including empty string;
2. exact presence, native type, and unsigned value of `Appearance`;
3. for canonical DWord Appearance, exact effective `placeables.2da` bytes,
   their SHA-256, physical row count, and the selected physical row ordinal;
4. `TemplateResRef`, `Tag`, `LocName`, and `Appearance` are distinct members.

The additive Area-detail contract now exposes immutable source provenance
equivalent to:

```json
{
  "placeableBasicIdentity": {
    "tag": { "present": true, "value": "WaterTrough" },
    "appearance": {
      "present": true,
      "nativeType": "dword",
      "value": 104,
      "table": {
        "resourceName": "placeables.2da",
        "sourceObjectKey": "hak:ordered/content/placeables.2da",
        "sourceLayer": "hak",
        "sha256": "<64 lowercase hex>",
        "sizeBytes": 8192,
        "rowCount": 16500,
        "rowIndex": 104
      }
    }
  }
}
```

This is the active read-only semantic shape. Missing provenance never means
default `Tag=""` or `Appearance=0` and never authorizes field creation.

The table descriptor is exact-keyed. `resourceName` is
`"placeables.2da"`; `sourceObjectKey` is non-empty and at most 2048 ECMAScript
code units; `sourceLayer` is `"module"`, `"hak"`, or `"vanilla"`; `sha256` is
the lowercase SHA-256 of the complete selected bytes; `sizeBytes` is an
integer in `1..67108864`; `rowCount` is the complete physical row count in
`1..1000000`; and `rowIndex` equals the canonical DWord Appearance value and
is smaller than `rowCount`. The descriptor is omitted for legacy Byte or
absent Appearance, invalid or over-budget table bytes, invalid physical row
identifiers, an out-of-row Appearance value, or a source layer outside the
authoritative module/ordered-HAK/vanilla chain. The table is selected as one
whole authoritative resource; rows from multiple sources are never merged.

This is bounded fixed metadata per Placeable in the existing Area-detail
response. It does not change streaming, chunking, versioning, authorization,
atomicity, idempotency, or recovery semantics and does not itself admit a
write.

No `LocName` wire shape is frozen in v1. It stays preserve-only because a
complete contract must still define exact language/gender identifiers,
ordering, duplicates, empty substrings, `strRef`, text encoding/decoding, and
lossless readback.

Tag mutation is now admitted only through the immutable family ordinal.
`sourceObjectId` remains present for diagnostics and backward compatibility,
but it is not authoritative for a Tag mutation. Old drafts without
`sourceIndex` retain their non-Tag behavior and cannot authorize Tag editing.

The base audit did not activate an Appearance mutation pair. The later
2026-08-18 source-closed checkpoint admits only a complete changed pair for a
present native DWord, bound to the same exact table digest. The backend must
re-resolve the immutable
Placeable ordinal, revalidate the current GIT value and table digest, require
the target to be an existing physical row, mutate exactly one `Appearance :
DWord`, preserve `TemplateResRef`, `Tag`, `LocName`, every other GIT field, and
every GIC byte, then perform exact whole-struct and receipt readback.

Any absent, legacy-Byte, duplicate, wrong-type, stale-table, stale-value,
out-of-range, nonexistent-row, unchanged, deletion-colliding, or readback-
drifting request must fail closed. Row label, localized display text,
`ModelName`, UTP ResRef, and TemplateResRef are not acceptable aliases for the
numeric row ordinal.

## Required implementation and test sequence

If product CRUD is later authorized, the slices must remain separate:

1. lossless source parser/provenance for Tag and canonical DWord Appearance;
2. exact effective `placeables.2da` resolution descriptor and row list;
3. frontend table-backed Appearance control that never writes `resRef`;
4. immutable object identity decoupled from Tag before enabling Tag edits;
5. projector/planner exact expected/target pairs;
6. pair writer and compiler receipt with GIC byte identity and full GIT struct
   readback;
7. focused negative, combination, build, and 100% critical mutation gates;
8. fresh exact-candidate Toolset Save/Build/reopen proof before completion.

Minimum negative coverage includes absent/explicit-default distinction,
legacy Byte, wrong/duplicate native types, stale expected value, stale table
digest, row equal to row count, arbitrary uint32 without a physical row,
sorted-display versus hidden-row mapping, empty Tag, 32/33-unit Tag policy
boundaries, Tag identity stability, deletion collision, and drift in every
preserved sibling field.

## Completion boundary

This audit and its later checkpoints make Appearance and Tag editing
offline-verified, but do not make Basic Identity CRUD complete. Name/LocName
remains preserve-only, and fresh native proof remains required for both active
mutation lanes.

## Post-audit preservation checkpoint

The frontend mismatch identified above was corrected on 2026-08-17 without
activating a native writer. `Template ResRef` is now labelled and represented
separately from `Appearance Type`. Retained `aurora_git` Name, Tag, and Template
ResRef controls are disabled and the same preservation rule is enforced by the
draft reducer and Apply materializer. Appearance Type accepts only an exact
unsigned DWord for read-only display; it never writes `resRef` or any native
field.

Focused verification passed 60/60 tests, the frontend production build passed,
and the dedicated mutation gate killed 30/30 active mutants with zero survived
or uncovered. The mutation report SHA-256 is
`677b97f43c5673fcd30161317773d74694d906787cf574591d91c6e39ce95d4c`.
This closes the unsafe UI binding only; every future-admission condition and
the Basic Identity CRUD completion boundary above remain unchanged.

## Post-audit read-only storage provenance checkpoint

The first narrower source boundary was implemented on 2026-08-17 without
activating a native writer. The backend now emits exact type-`9` Placeable
storage states for Tag presence/value and Appearance presence/native
DWord-or-legacy-Byte type/value. Duplicate, noncanonical, wrong-family,
wrong-type, and malformed inputs omit the complete property. The module
snapshot repository, process fingerprint, strict frontend HTTP/domain
boundary, mapper, clone path, and read-only UI preserve the same shape.

Focused backend verification passed 45/45 tests and focused frontend
verification passed 127/127 tests. The backend production build passed after
the slice changes; a later rerun was blocked by an unrelated untracked VFX
fixture TS2322. The final frontend production build passed. Dedicated
mutation gates killed 52/52 backend and 96/96 frontend active mutants with no
survivors or uncovered mutants. Reports are recorded in
`evidence/area-existing-placeable-basic-identity-provenance-2026-08-17/`.
This closes storage provenance only; the table descriptor was closed by the
separate checkpoint below, while the physical row list, Tag-independent
identity, LocName, writer/readback, and live proof prerequisites remain open.

## Post-audit effective-table provenance checkpoint

The optional effective-table descriptor was activated on 2026-08-17 without
activating a native writer. The catalog selects one complete authoritative
`placeables.2da` from the existing module, ordered-HAK, and vanilla precedence;
the descriptor hashes those complete bytes and counts their physical rows.
The Area repository resolves that descriptor once per snapshot and binds it
only to a present canonical DWord Appearance whose ordinal is an existing row.
Legacy Byte, absent, invalid, over-budget, wrong-source, and out-of-row states
omit the descriptor. The strict frontend HTTP/domain/mapper/clone path carries
the exact same nested value without treating it as mutation authority.

Focused backend verification passed 90/90 tests and focused frontend
verification passed 109/109 tests. Both production builds passed. Dedicated
backend and frontend mutation reports and exact hashes are retained in
`evidence/effective-placeables-two-da-provenance-2026-08-17/`.

This checkpoint closes the immutable whole-table descriptor only. The row
list, editable table-backed Appearance control, mutation pairs, writer,
readback, and native proof remain open, so Basic Identity CRUD is not claimed.

## Frozen physical-row query boundary

The next read-only slice exposes the physical rows of the same whole table
through a digest-bound, paginated catalog query. Every item carries the
zero-based physical `rowIndex`; optional StrRef and decoded Label are display
metadata only. Display resolution follows the recovered Toolset order:
resolved StrRef text, then Label, then an explicit product-only `Row <n>`
fallback when neither bounded source string is usable. Sorting or filtering
must never change the hidden physical ordinal.

The page is limited to 256 entries, search input to 128 code units, resolved
display text to 1024 code units, and decoded Label to 256 code units. The
caller supplies the exact lowercase table digest from Area provenance; stale
or unavailable tables fail closed. This avoids duplicating up to one million
rows in every Area object while preserving deterministic pagination and
diagnosability. The response remains read-only and does not activate the
Appearance writer.

## Post-audit physical-row catalog checkpoint

The digest-bound physical-row catalog was implemented on 2026-08-18 without
activating the Appearance writer. The repository selects the same single
authoritative whole table as the Area provenance descriptor, parses exact
physical row ordinals, and exposes bounded pagination and filtering through
`GET /api/v1/catalog/placeables/appearances`. The service requires the current
lowercase SHA-256 and fails closed with `404` when no exact catalog exists and
`409` when the requested digest is stale.

Each row preserves its zero-based physical ordinal. Display text is derived
only from bounded TLK text, then bounded decoded Label, then the explicit
`Row <n>` fallback. The row ordinal, optional StrRef, and optional Label remain
separate; filtering never renumbers rows. A stronger unreadable table is
skipped in favor of the next exact table, while an exact table containing only
reserved rows remains a valid catalog.

Focused verification passed 251/251 backend tests and 21/21 frontend tests.
Both production builds passed; the frontend retained only its existing chunk
size warning. Dedicated mutation gates killed 107/107 backend and 57/57
frontend active mutants with zero survivors, timeouts, errors, or uncovered
mutants. Exact report hashes and the one equivalent vanilla-empty-source
exclusion are recorded in
`evidence/effective-placeables-two-da-row-catalog-2026-08-18/`.

This checkpoint closes the read-only row-list prerequisite only. The UI is
still preserve-only and Appearance projector/planner/writer/readback plus live
Toolset proof remain open.

## Post-audit Appearance mutation checkpoint

The exact Existing Placeable `Appearance` mutation slice was activated on
2026-08-18. The frontend control is enabled only for retained
`source.type = aurora_git`, `sourceKind = placeable` objects carrying one
canonical native `Appearance : DWord` and the exact effective-table
descriptor. Its options come only from the digest-bound physical-row catalog;
the selected value is always the zero-based physical ordinal and is never a
ResRef, TemplateResRef, Label, StrRef, display string, or model name.

The backend projects one exact changed pair containing `expectedValue`,
`value`, `tableSha256`, and `rowCount`. Planning revalidates the immutable
Placeable ordinal and canonical native DWord. Compilation re-resolves the
current authoritative whole table, requires the same digest and row count,
and proves that the target physical row exists. The pair writer replaces
exactly one existing `Appearance : DWord`, performs whole-struct and receipt
readback, preserves every other GIT field, and preserves the complete GIC
byte-for-byte. Absent or legacy-Byte storage, unknown keys, incomplete or
unchanged pairs, stale expected values, stale tables, invalid/nonexistent
rows, cross-family provenance, and deletion collisions fail closed.

Final focused verification passed 1314/1314 backend tests and 122/122 frontend
tests. Both production builds passed; the frontend retained only the existing
chunk-size warning. Dedicated mutation gates reached 100%: backend detected
all 443 active mutants (441 killed and 2 timed out), while frontend killed all
386 active mutants. Both reports contain zero survivors, uncovered mutants,
or errors. Exact report sizes, hashes, configuration boundaries, and
equivalent/unreachable exclusions are recorded in
`evidence/area-existing-placeable-appearance-2026-08-18/`.

This closes offline Appearance editing and native serialization. It does not
claim fresh Toolset Save/Build/reopen or NWN runtime certification. `Name`
remains preserve-only until complete lossless `CExoLocString` provenance is
admitted. Tag is closed by the separate ordinal checkpoint below.

## Frozen ordinal identity and Tag mutation boundary — 2026-08-18

The prerequisite is now contract-closed without changing Aurora semantics.
Every Area-detail object exposes its zero-based ordinal within the exact GIT
family as `sourceIndex`. The immutable mutation locator is
`(sourceKind, sourceIndex)`. The existing tag-derived `sourceObjectId` remains
only a diagnostic/UI handle and a compatibility fallback for older non-Tag
drafts. A Tag mutation is never admitted without the ordinal locator, so
changing or reopening a Tag cannot change the authoritative target.

The Tag pair is `{ expectedValue, value }`. Both strings use the deliberately
stricter product budget of `0..32` ECMAScript code units, reject U+0000, and
are otherwise byte-for-text exact at the product boundary: no trimming,
normalization, folding, substitution, or truncation. Empty string is valid and
distinct from absent provenance. Only a present canonical type-`9`
`Tag : CExoString` authorizes editing.

The implementation resolves the ordinal, independently reparses and compares
the native value, permit only the matching explicit Tag delta in the retained
object guard, replace exactly that CExoString, preserve all other GIT fields
and all GIC bytes, and performs full readback. Name/LocName is outside this
boundary.

## Post-audit ordinal identity and Tag mutation checkpoint

The ordinal identity and exact Existing Placeable Tag mutation slice was
implemented on 2026-08-18. Area-detail objects now carry their zero-based
family `sourceIndex`; the frontend preserves it as immutable source
provenance. Projector and planner resolution prefer `(sourceKind,
sourceIndex)`, so a changed Tag and a deliberately unrelated diagnostic
`sourceObjectId` still resolve the same exact native Placeable.

The frontend enables Tag only for an exact existing `aurora_git` Placeable
with a safe non-negative ordinal and present valid Tag provenance. It applies
the `0..32` ECMAScript-code-unit product budget without trimming or other
normalization. Name and TemplateResRef remain preserve-only. The backend emits
one exact changed pair, rejects missing/duplicate/stale/cross-family/deletion-
colliding provenance, replaces exactly one canonical `Tag : CExoString`,
performs exact whole-struct readback, and preserves the complete GIC bytes in
the isolated writer case.

Focused verification, both production builds, and dedicated 100% mutation
gates passed. The backend killed 241/241 active mutants and the frontend killed
78/78, with zero survivors, uncovered mutants, timeouts, or errors. Exact
report hashes and gate metadata are recorded in
`evidence/area-existing-placeable-tag-2026-08-18/`.

This closes offline Tag editing and its immutable locator. Fresh Toolset
Save/Build/reopen, packed readback, and NWN certification remain open; no live
native completion claim is made.

## Post-audit lossless localized-string provenance checkpoint

On 2026-08-19 the complete read-only storage provenance for existing type-`9`
GIT Placeable `LocName` and `Description` crossed the backend/frontend
boundary. Each member is exact and presence-sensitive. Present members retain
the unsigned `strRef`, ordered unsigned language identifiers, duplicate and
empty entries, and opaque text bytes as canonical base64; no text decoding,
normalization, trimming, fallback, or target materialization occurs. The
backend parser also bounds the complete payload to the native GFF `fieldData`
section, and repository/cache/frontend clone paths preserve the structure
deeply.

Focused tests, full backend/frontend unit suites, frontend regression, both
production builds, and dedicated 100% mutation gates passed. The backend gate
killed 82/82 active mutants and the frontend killed 147/147, with zero
survivors or uncovered active mutants. Exact report hashes and gate metadata
are frozen in
`evidence/area-existing-placeable-localized-strings-provenance-2026-08-19/`.

This closes the lossless read prerequisite only. `Name` and localized
`Description` remain disabled/preserve-only because native code-page,
language/gender ID, and TLK fallback semantics are not yet source-closed and no
expected/target writer/readback lane exists. No Toolset or NWN completion claim
is made.

## Post-audit bounded localized-string mutation checkpoint

The separate source audit
`area-existing-placeable-localized-string-mutation-audit-v1-2026-08-19.md`
closed a deliberately smaller deterministic profile. A field is editable only
when it exists exactly once as `CExoLocString`, has `strRef=0xffffffff`, and is
either an empty entry list or one non-empty identifier-`0` entry containing
only printable ASCII bytes `0x20..0x7e`. Targets use the same representation;
`LocName` is limited to 256 bytes and `Description` to 4,096 bytes. No trimming,
normalization, fallback, implicit encoding conversion, or field creation is
allowed.

That profile is now implemented across immutable frontend provenance,
independently gated controls, reducers/materializers, projector, planner,
pair writer, compiler receipt, exact whole-struct readback, and byte-identical
GIC preservation. Unmodified legacy string payload bytes also survive generic
GFF rebuild unchanged. Full backend/frontend unit and regression gates and both
builds passed. Dedicated mutation gates reached 100%: backend 275/275 and
frontend 266/266 active mutants detected, with zero survivors or uncovered
mutants.

This supersedes the preceding read-only checkpoint only for the admitted
inline-ASCII profile. TLK-backed, multilingual, nonzero-identifier, empty-entry,
non-ASCII, absent, malformed, and over-budget values remain preserve-only.
Fresh Toolset Save/Build/reopen and NWN certification remain open.
