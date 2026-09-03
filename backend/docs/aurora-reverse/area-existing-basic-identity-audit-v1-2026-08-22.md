# Existing Area Basic Identity Audit v1 (2026-08-22, source closure 2026-08-25)

## Decision

The native Area identity/description matrix is source-closed. Aurora has no
Area `Description` field or Area Properties `Description` control. `Comments`
is a separate root `CExoString` and a separate Toolset tab; it is covered by
the existing Comments audit and implementation.

Aurora Web may edit two already-present Area root fields under a bounded,
preserve-first contract:

| Application value | Exact ARE label | GFF type | Admitted editable storage |
| --- | --- | --- | --- |
| Area name | `Name` | 12 / `CExoLocString` | bounded inline strRef `0xffffffff` profile with one required language-id `0` printable-ASCII entry; alternate ordered printable-ASCII entries are preserved exactly |
| Area tag | `Tag` | 10 / `CExoString` | 0-64 printable ASCII bytes without U+0000 |

The additive multi-entry contract is source-closed in
`area-existing-basic-name-multi-entry-inline-mutation-audit-v1-2026-08-25.md`.
TLK-backed values, non-ASCII entries, malformed/over-budget values, and
independent editing of alternate language/gender entries remain preserve-only.

`ResRef` is not admitted as an ordinary field mutation. The Toolset copies it
between the Area object and the properties dialog, but the Area reader derives
the in-memory value from the resource name supplied to the reader instead of
reading the root `ResRef` field. A changed `ResRef` therefore requires a
separately source-closed, transactional resource rename across the module,
including reference discovery and atomic rollback. That transaction is not
implemented by this checkpoint.

## Native identity and description matrix

| Native value | Reader evidence | Writer evidence | Toolset authoring surface | Aurora Web disposition |
| --- | --- | --- | --- | --- |
| `ID` | exact label, type 5 / `Int` | exact label, type 5 / `Int` | none in Area Properties | preserve native metadata |
| `Creator_ID` | exact label, type 5 / `Int` | exact label, type 5 / `Int` | none in Area Properties | preserve native metadata |
| `Version` | exact label, type 4 / `DWord` | exact label, type 4 / `DWord` | none in Area Properties | preserve native metadata |
| `Name` | exact label, localized-string helper | exact label, localized-string helper | Basic tab | bounded editable profile above |
| resource identity / `ResRef` | copied from the reader's resource-name argument into Area member `+0xaa`; root `ResRef` is not read | exact `ResRef`, type 11 / `ResRef`, from member `+0xaa` | Advanced tab | blocked pending transactional rename |
| `Tag` | exact label, type 10 / `CExoString` helper | exact label, type 10 / `CExoString` helper | Advanced tab | bounded editable profile above |
| `Comments` | exact label, type 10 / `CExoString` helper | exact label, type 10 / `CExoString` helper | separate Comments tab | implemented under the Comments audit |
| `Description` | no reader label or field | no writer label or field | no Area Properties control | not an Area capability; do not invent one |

`ID`, `Creator_ID`, and `Version` are serialization metadata, not missing
free-form identity controls. Their absence from the web dialog is intentional
until independent native evidence establishes a supported authoring workflow.

## Primary Aurora evidence

Audited source artifacts:

- `C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
  `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`;
- `C:/Projects/New Folder/export/functions.tsv`, SHA-256
  `394096FE106E5767EE6ECEB31C8B085091359060351B1D10195E96F666BC69FE`;
- `C:/Projects/New Folder/export/strings.tsv`, SHA-256
  `864AE0139451D5333307CB2BBCCCE725BBD2D2C6056AC2D5F80F9B5EA50F190F`;
- `C:/Projects/nwn-last-city/Aurora/reverse/reverse/nwtoolset_rcdata_report.json`,
  SHA-256
  `3D9C5D29709BCF4AA037554781D229A2094F3D85370C44A6A5DF9A222F8D87FA`.

### ARE reader and writer

Area reader `FUN_005a7fc8(int *param_1, char *param_2, char param_3)` opens the
ARE family with exact retail bytes `ARE ` at RVA `0x00c29691`. It reads:

- `ID` with `FUN_00aeeed8`, which accepts only GFF type 5;
- `Creator_ID` with the same type-5 helper;
- `Version` with `FUN_00aeee7c`, which accepts only GFF type 4;
- `Tag` with `FUN_00aef090`;
- `Name` with `FUN_00aef678`;
- `Comments` with `FUN_00aef090`.

At decompiled lines 255131-255132 it copies `param_2` through the ResRef helper
into Area member `+0xaa`. There is no root `ResRef` read in this reader.

Area writer `FUN_005a9f30` emits the matching identity sequence:

- `ID` and `Creator_ID` with `FUN_00aefecc`, whose created field type is 5;
- `Version` with `FUN_00aefe60`, whose created field type is 4;
- `Tag` with `FUN_00af0084`;
- `Name` with `FUN_00af0144`;
- `ResRef` from Area member `+0xaa` with `FUN_00aeffa4`, whose created field
  type is `0x0b` and whose payload is lower-cased;
- `Comments` with `FUN_00af0084`.

The independently decoded retail strings at RVAs `0x00c29696`, `0x00c296ac`,
`0x00c296b1`, `0x00c2992d`, `0x00c29943`, `0x00c2994c`, and `0x00c29953`
confirm the exact `ID`, `Tag`, `Name`, `ID`, `Tag`, `ResRef`, and `Comments`
labels used by those calls.

### Toolset Area Properties state transfer

`FUN_00553710` transfers the loaded Area into the Area Properties dialog:

- Area member `+0x94` (`Name`) to dialog member `+0x648`;
- Area member `+0xaa` (`ResRef`) to dialog member `+0x65e`;
- Area member `+0xbc` (`Tag`) to dialog member `+0x670`.

`FUN_0055404c` transfers those same three members back to the Area after the
dialog is accepted. The ResRef control is therefore genuinely editable in the
Toolset, but its persistence semantics remain resource-bound.

### Area Properties form

RCDATA form `TDLGAREAPROPERTIES`, RVA `0x00AC67B0`, size 16,478 bytes, exposes:

- Basic: `Name`, `Tileset`, `Length`, and `Width`;
- Advanced: World Map fields, PvP, `ResRef`, No Rest, Listen/Spot modifiers,
  Time, `Tag`, terrain flags, Loading Screen, and Variables;
- a separate `Comments` tab.

The decoded form contains no Area `Description` caption or control. This is
consistent with the reader/writer field sequence and closes the previously
vague description-matrix gap.

No xoreos source was used.

## Frozen application contract

- `Name` editing is admitted only for the exact `simple_inline_ascii` or
  `multi_entry_inline_ascii` profile frozen by the child audit. Both require
  strRef `0xffffffff`, exactly one language-id `0` printable-ASCII entry of
  1-256 bytes that is not whitespace-only, unique bounded ordered entries, and
  profile-bound CAS. Only identifier `0` changes; all siblings remain exact.
- `Tag` editing is admitted only for one exact `Tag : CExoString` whose value
  and target are printable ASCII, 0-64 bytes, with no U+0000.
- Values are not trimmed, normalized, case-folded, truncated, transliterated,
  or replaced.
- Absence is distinct from an empty Tag. Missing/unsupported Name or Tag stays
  preserve-only.
- Every change carries a complete exact CAS pair. Missing, duplicate,
  wrong-case, wrong-type, stale, unchanged, malformed, or over-budget requests
  fail closed.
- A changed scene `areaName` without exact immutable Name provenance must fail;
  it must never be silently reported as persistable while the retained ARE
  keeps the old value.
- Unrelated ARE fields and GIT/GIC/IFO companions remain preserved.
- `ID`, `Creator_ID`, and `Version` must not be added to the ordinary Area
  authoring payload.
- `ResRef` must not be changed through the existing basic-identity CAS. It
  requires a distinct rename command, idempotency identity, impact preview,
  fencing lease, atomic resource publication, readback verification, and
  compensation/recovery contract.

## Transactional rename audit boundary

Before implementation, the rename audit must prove and freeze every affected
resource and reference class. At minimum it must independently decide:

1. the logical ARE/GIT/GIC resource-name move and the ARE root `ResRef` write;
2. IFO `Mod_Area_list` membership replacement and `Mod_Entry_Area` replacement
   when it targets the renamed Area;
3. all native transitions, world-map links, object fields, or other module
   references that actually store an Area ResRef;
4. collisions, missing/multiple companions, duplicate IFO membership,
   case-only changes, packed/unpacked storage identity, and stale snapshots;
5. deterministic impact preview, authorization, idempotency, journaling,
   fencing, rollback, persisted semantic readback, and old-resource absence.

The list above is an audit agenda, not an assertion that every named reference
class exists. No reference surface may be mutated until primary Aurora or
exact project-format evidence proves it.

## Remaining proof boundary

TLK-backed and non-ASCII localized storage, independent alternate-entry
editing, browser interaction/readback, Toolset Save/Build/reopen, and NWN
localized display/tag behavior remain separate blockers. Transactional Area
ResRef rename is implemented under its own capability row but still awaits its
separate browser/packed/native/runtime proof. The bounded existing-field
implementation does not certify any of those cases.
