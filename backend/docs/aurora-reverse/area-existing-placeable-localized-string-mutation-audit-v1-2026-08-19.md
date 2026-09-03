# Existing Area Placeable localized-string mutation audit v1

Date: 2026-08-19  
Status: bounded inline language-0 printable-ASCII profile offline-verified; native proof pending

## Decision

The complete Aurora localized-string editor is not safe to reproduce as a
single JavaScript text field. The native value carries a string reference,
language/gender keyed inline values, fallback behavior, and byte strings that
pass through the Toolset's active ANSI code page.

A deliberately smaller mutation profile is nevertheless deterministic and
is admitted for implementation:

- the native field already exists exactly once as `CExoLocString`;
- `strRef` is exactly `0xffffffff` (inline/custom text, not a TLK reference);
- the entry list is either empty or contains exactly one entry;
- that one entry has numeric identifier `0` and a non-empty byte string;
- every source and target byte is printable ASCII `0x20..0x7e`;
- empty target text is represented by an empty entry list;
- non-empty target text is represented by exactly one identifier-`0` entry;
- `LocName` is product-bounded to 256 bytes and `Description` to 4,096 bytes.

Within that profile the web control edits the default inline language-0,
gender-0 slot. It does not claim to be the complete Toolset localized-string
dialog. Any TLK-backed, multi-entry, duplicate-entry, nonzero-identifier,
empty-present-entry, control-character, non-ASCII, absent, malformed, or
over-budget value remains preserve-only.

## Primary evidence inventory

The primary decompilation authority is:

- `C:/Projects/New Folder/export/decompiled_all.c`;
- size `30,366,020` bytes;
- SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.

The corresponding retail Toolset binary is:

- `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`;
- size `12,201,984` bytes;
- SHA-256
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`.

The installed English base talk table inspected read-only is:

- `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/lang/en/data/dialog.tlk`;
- size `12,780,184` bytes;
- SHA-256
  `1d6da70e0659e411012b44f956a093cc8fb61aed3b9355198ba42eb17e0649c9`;
- header `TLK ` / `V3.0`, language ID `0`, `112,228` strings, string-data
  offset `4,489,140`.

Only the local binary, decompilation, PE bytes, TLK header, and repository
fixtures were inspected. No Toolset or NWN process was started or controlled.
No xoreos or other GPL source was inspected or used.

## Native value and copy lineage

The storage and placed-object lineage remains the one established by
`area-existing-placeable-basic-identity-audit-v1-2026-08-17.md` and the
read-only provenance checkpoint:

- `FUN_0063ae68` reads the complete common `LocName`;
- `FUN_0063b8a0` writes the complete common `LocName`;
- `FUN_0063d0d8` / `FUN_0063d3d8` bind that state to a placed type-`9`
  Placeable;
- `FUN_006f4690` copies the complete value into the situated basic frame via
  `FUN_00acdde0`;
- `FUN_006f4b40` copies the complete value back via `FUN_00acdefc`.

`FUN_00acdefc` copies both the inline map and the `strRef`; the visible text
control is therefore not the complete native value.

## Language and gender key semantics

`FUN_00acdf2c` is the native inline setter. It computes the map key as:

```text
languageId * 2 + (gender & 0xff)
```

When `languageId == 0`, it forces gender to `0` before computing the key.
`FUN_00ace524` applies the same rule when removing an inline entry.
`FUN_00ace47c` and the exact lookup at the start of `FUN_00ace0dc` use the
same key construction.

Consequently, numeric entry ID `0` is exactly language `0`, gender `0`; it is
not an inferred locale label. This is the only identifier admitted by the
bounded web profile.

## Editor add/remove behavior

`FUN_006086bc` creates the localized-string editor and dispatches its edit
method. `FUN_0070e4d0` copies the complete input value, stores the selected
language, and resolves the selected language/gender value for the edit
control.

On commit, `FUN_0070e8ec` reads the edit text. When the control is empty it
calls `FUN_00ace524`, removing the selected language/gender entry. When the
control is non-empty it calls `FUN_00acdf2c`, inserting or replacing that
entry. For language `0`, both paths are necessarily identifier `0` because
gender is forced to `0`.

The product therefore represents an empty bounded value as `entries: []`,
not as one present zero-length entry. A source containing an explicit empty
entry remains preserved but is not admitted for this mutation profile.

## TLK and fallback boundary

`FUN_00ace0dc` performs substantially more work than a plain map lookup:

1. exact language/gender inline lookup;
2. optional opposite-gender lookup for nonzero languages;
3. base `strRef` lookup through the active TLK object;
4. language-0 inline fallback when the resolved TLK value is empty;
5. fixed fallback-language probes for both gender choices.

The fixed four-language table at virtual address `0x00d0be18` is in the
binary's `.data` section, file offset `0x90ae18`. Its exact 16 bytes are:

```text
01 00 00 00 02 00 00 00 03 00 00 00 04 00 00 00
```

Thus the fallback language IDs are exactly `[1, 2, 3, 4]`. The bounded web
mutation avoids that entire decision tree by requiring `strRef=0xffffffff`
and editing only identifier `0`. It does not resolve, replace, or synthesize
a TLK reference.

## Encoding boundary

The Toolset initializes its active ANSI code page with `GetACP()` in
`FUN_007683d8` (`decompiled_all.c:509231`). Its string/UI bridge uses code-page
argument `0` in both directions:

- `MultiByteToWideChar(0, ...)` at lines `418438` and `483193`;
- `WideCharToMultiByte(0, ...)` at lines `483214-483215`.

The inspected workstation ACP is currently `1250`, but that is machine
configuration, not a file-format invariant. Therefore arbitrary JavaScript
Unicode, UTF-8, or a fixed Windows code page cannot be selected as an Aurora
authority.

Printable ASCII `0x20..0x7e` is invariant across the relevant ANSI code pages
and UTF-8. Restricting both admitted source bytes and target text to that
range makes the byte result deterministic without guessing a source locale.
Tabs, line breaks, NUL, DEL, and every non-ASCII code point are excluded in
this first mutation slice. No trim, normalization, case folding, line-ending
conversion, replacement character, or truncation is permitted.

## Additive mutation contract

For one retained Placeable, the projected property mutation may add an
ordered exact-keyed list:

```json
{
  "localizedStrings": [
    { "field": "LocName", "expectedValue": "Chest", "value": "Chest 2" },
    { "field": "Description", "expectedValue": "Storage", "value": "Storage room" }
  ]
}
```

The only field tokens are `LocName` then `Description`; each may occur at
most once and native order is required. Every entry has exactly `field`,
`expectedValue`, and `value`. The complete list has at most two entries.
Unchanged, incomplete, unknown-keyed, reordered, duplicated, invalid, absent,
or stale pairs fail closed.

The immutable retained locator is `(sourceKind=placeable, sourceIndex)`.
`sourceObjectId` remains diagnostic only. Planning reparses the exact source
ordinal and requires the source storage to decode to the bounded profile and
to equal `expectedValue` byte-for-byte.

## Writer and preservation requirements

The writer must replace exactly one existing native type-`12` field per
mutation and must never materialize a missing field or change its label/type.
The target payload is exactly:

```text
uint32 totalSize
uint32 0xffffffff
uint32 count                 // 0 for empty, 1 otherwise
[uint32 0, uint32 length, byte[length] printableAscii] when count == 1
```

The generic raw-GFF rebuild path must preserve the original byte payload of
every unmodified `CExoString` and `CExoLocString`; decoding an unrelated
legacy value as UTF-8 and re-encoding it is forbidden. Whole-struct readback
must compare the exact target storage and prove all other Placeable fields
unchanged. GIC must remain byte-identical for a localized-string-only GIT
mutation. Combined mutations remain valid only when the same raw-preservation
and exact readback checks pass.

## Frontend boundary

The frontend derives editable `name` and localized `description` only from
valid immutable `source.placeableLocalizedStrings`, never from the legacy
display aliases. The explicit persisted target keys are
`placeableProperties.localizedName` and `placeableProperties.description`;
their presence gates the new mutation path so older clients cannot
accidentally project a display alias. Admission is independent per native
field. The control is enabled only for an exact existing `aurora_git`
Placeable whose field matches the bounded profile.

Invalid or unproven apply preserves the current object and cannot create a
target field. Clone, cancel, undo, save, and reopen preserve the immutable raw
source pair independently from the mutable ASCII target. Unsupported
localized profiles remain visible as `PRESERVE_ONLY` rather than being
silently flattened.

## Diagnosability and limits

Diagnostics identify the Area object family ordinal, native field token, and
a bounded reason code such as `missing`, `wrong_type`, `stale`,
`unsupported_strref`, `unsupported_entries`, `invalid_ascii`, `unchanged`, or
`preservation_mismatch`. Raw text and base64 payloads must not be emitted as
metric labels or unrestricted logs.

This contract adds at most two bounded pairs per retained Placeable. It uses
the existing Area draft revision, authorization, idempotency, atomic pair
write, receipt, and recovery flow. It adds no endpoint, binary body,
pagination, streaming, or chunking.

## Required TDD and completion gates

Implementation is not complete until tests prove:

1. empty and one-entry identifier-0 source admission;
2. exact printable-ASCII boundaries and both product byte budgets;
3. rejection of TLK-backed, absent, multi-entry, duplicate, nonzero-ID,
   empty-present-entry, control-byte, non-ASCII, invalid, stale, unchanged,
   cross-family, and deletion-collision states;
4. exact-key, unique, native-order mutation validation;
5. raw preservation of unrelated non-UTF-8 `CExoString` and
   `CExoLocString` payloads;
6. exact GIT field replacement, whole-struct readback, and byte-identical GIC;
7. frontend immutable provenance, independent per-field admission,
   reducer/materializer, disabled unsupported states, clone/cancel/undo, and
   save projection;
8. focused unit/integration/round-trip tests, production builds, regression
   gates, and dedicated backend/frontend mutation scores of 100% for the
   changed semantic ranges.

Fresh Toolset Save/Build/reopen evidence remains a separate native
certification gate. This audit admits the bounded implementation; it does not
claim that native proof or full multilingual localized-string parity.

## Implementation checkpoint — 2026-08-19

The admitted bounded profile is implemented end to end for retained type-`9`
GIT Placeables. Backend parsing retains the exact raw storage provenance;
projection and planning emit and independently revalidate ordered
`expectedValue`/`value` pairs; the pair writer replaces only the selected
native type-`12` field and performs exact readback; compiler receipts preserve
the complete GIC byte-for-byte for this GIT-only lane. Unmodified legacy
`CExoString` and `CExoLocString` payload bytes are attached as immutable,
non-enumerable raw payloads and survive generic GFF reconstruction unchanged.

The frontend maps only admitted storage to explicit mutable target keys.
`Name` and localized `Description` are enabled independently for exact
`aurora_git` Placeable provenance with an immutable family ordinal. Apply,
OK, Cancel, clone, snapshot, undo, and redo preserve the raw source pair;
invalid, absent, TLK-backed, multilingual, non-ASCII, or otherwise unsupported
storage remains visibly preserve-only and cannot be materialized.

Final verification:

- backend focused: 6 suites, 1,444 tests passed;
- frontend focused: 6 files, 136 tests passed;
- backend unit: 228 suites, 3,820 tests passed;
- frontend unit: 254 files, 2,731 tests passed;
- frontend regression smoke: 10 files, 78 tests passed;
- backend E2E: 10 suites, 113 tests passed;
- backend and frontend production builds passed; the frontend retained only
  the existing large-chunk warning;
- backend mutation: 275 killed, zero survived, timed out, uncovered, or errored
  active mutants, 100%;
- frontend mutation: 266 killed, zero survived, timed out, uncovered, or
  errored active mutants, 100%.

The regression pass also closed an independent Area render-payload lifecycle
defect: recovery workers now stop when the workspace is unmounted and no
longer schedule browser-window timers after test/runtime teardown. The focused
viewport wiring suite passed 93/93 and the full 78/78 smoke gate then completed
without unhandled rejections.

The mutation report hashes and machine-readable result are frozen under
`evidence/area-existing-placeable-localized-string-mutation-2026-08-19/`.
The formerly stale Runtime Settings texture-index E2E setup now follows the
confirmed generation-rebuild contract, waits for publication, reauthenticates
after global session revocation, and passes 2/2; the complete backend E2E gate
is 113/113. No exact runnable browser fixture carries the admitted
localized-string provenance, so no UI runtime proof is claimed. Fresh Toolset
Save/Build/reopen and NWN certification also remain open.
