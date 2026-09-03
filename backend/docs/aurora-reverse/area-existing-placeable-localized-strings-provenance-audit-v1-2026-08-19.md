# Existing Area Placeable localized-string provenance audit v1

Date: 2026-08-19
Status: exact read-only storage boundary admitted; text mutation remains blocked

## Decision

An existing type-`9` GIT Placeable may expose the complete native storage of
`LocName` and `Description` without interpreting their text bytes. The
boundary preserves the unsigned string reference, ordered substring records,
numeric language/gender identifiers, duplicate identifiers, empty byte
strings, and exact substring bytes.

This checkpoint does not enable either editor control. A JavaScript string is
not an authoritative replacement for a native localized substring until the
source text-encoding profile is independently proven. The current display
alias remains non-authoritative and must never be projected back into either
native field.

## Scope and authority

The scope is one retained Placeable entry in the exact `Placeable List` of an
Area GIT. It covers only:

- `LocName : CExoLocString`;
- `Description : CExoLocString`.

It excludes Tag, Comments in GIC, TemplateResRef, TLK resolution, localized
string editing, language selection, encoding conversion, and every other GIT
family.

Aurora authority is the already recovered situated-object lineage documented
in `area-existing-placeable-basic-identity-audit-v1-2026-08-17.md`:

- `FUN_0063ae68` reads the complete common `LocName` member;
- `FUN_0063b8a0` writes that complete member;
- `FUN_0063d0d8` / `FUN_0063d3d8` bind the common state to a placed type-`9`
  object;
- `FUN_006f4690` / `FUN_006f4b40` copy the complete localized value between
  the object and the Toolset basic frame rather than treating the visible edit
  text as the complete value.

The repository's independent GFF construction fixtures and raw parser/writer
round trips establish the storage layout. No xoreos source or other GPL
implementation was consulted.

## Exact GFF storage boundary

A type-`12` GFF field-data payload is parsed as:

```text
uint32 totalSize
uint32 strRef
uint32 substringCount
repeat substringCount times:
  uint32 languageId
  uint32 textByteLength
  byte[textByteLength] textBytes
```

`totalSize` excludes its own four-byte prefix and includes the `strRef`, count,
and every substring record. Exact admission requires `totalSize >= 8`, every
read to remain inside both the declared payload and the GFF field-data region,
and the final cursor to equal the declared payload end. Trailing or truncated
bytes are malformed rather than silently ignored.

`strRef` and `languageId` are preserved as unsigned 32-bit values, including
`0xffffffff`. Substring order and duplicate language identifiers are
preserved. An empty substring is present data and is represented by zero text
bytes. An empty substring list is distinct from an absent GFF field.

## Encoding boundary

The substring payload is bytes, not intrinsically a JavaScript UTF-8 string.
Classic content can use legacy single-byte code pages, while other source
profiles may use different encodings. Decoding every payload as UTF-8 is
therefore lossy and is explicitly outside this checkpoint.

The contract carries canonical base64 of the exact bytes. It does not carry a
guessed `text`, `encoding`, locale name, gender token, or resolved TLK value.
The existing `localizedName` and `description` display aliases remain useful
for presentation only and are not mutation provenance.

## Additive v1 wire shape

For an exact retained Placeable, Area detail may add:

```json
{
  "placeableLocalizedStrings": {
    "locName": {
      "present": true,
      "strRef": 4294967295,
      "entries": [
        { "languageId": 0, "textBytesBase64": "Q2hlc3Q=" },
        { "languageId": 0, "textBytesBase64": "" }
      ]
    },
    "description": { "present": false }
  }
}
```

Every object boundary is exact-keyed. A present value has exactly `present`,
`strRef`, and `entries`; an absent value has only `present`. Each entry has
exactly `languageId` and `textBytesBase64`. Base64 must be canonical and may be
empty.

The complete pair is emitted only when both native members are classified
exactly as present or absent. A duplicate normalized label, wrong case, wrong
native type, invalid field-data range, truncated record, trailing payload,
invalid base64 projection, or budget violation omits the complete optional
property. Omission means preserve-only and never means an empty localized
string.

## Budgets and versioning

The boundary is bounded per localized field:

- at most `64` substring entries;
- at most `16,384` raw bytes in one substring;
- at most `65,536` raw substring bytes in total;
- one optional pair per retained Placeable.

Over-budget source remains readable through the existing non-authoritative
display path but receives no write-authorizing provenance. This additive
metadata uses the existing Area-detail response and Area draft versioning,
authorization, cache, pagination, and streaming behavior. It adds no binary
download endpoint and no mutation.

## Diagnosability and determinism

The exact pair participates in the Area object dependency fingerprint. The
frontend copies it into immutable source provenance and deep-clones both entry
arrays for snapshot, cancel, and undo flows. Invalid or wrong-family input is
omitted fail-closed. Logs and UI must not print decoded guesses or the complete
raw payload as a label.

## Required TDD coverage

The read-only checkpoint requires tests for:

1. exact present and absent fields;
2. `strRef` values `0` and `0xffffffff`;
3. ordered entries, duplicate language IDs, and empty text bytes;
4. non-UTF-8 bytes surviving backend-to-frontend as exact base64;
5. wrong case, duplicate fields, wrong native type, truncation, trailing data,
   over-count, per-entry, and aggregate budgets;
6. strict frontend HTTP/domain validation and wrong-family rejection;
7. immutable mapping plus independent clone/cancel/undo copies;
8. focused unit tests, production builds, and regression smoke. A dedicated
   critical-logic mutation run is optional and requires an explicit user request.

## Mutation admission blockers

Name and localized Description remain preserve-only until a later Aurora-first
checkpoint proves and freezes:

1. the source encoding/profile decision and byte-exact encode/decode behavior;
2. the Toolset language/gender identifier vocabulary and add/remove/reorder
   behavior;
3. TLK-backed versus inline edit semantics, including `strRef` transitions;
4. exact expected/target pairs, ordinal-bound stale checks, whole-struct
   readback, and GIC byte identity;
5. fresh Toolset Save/Build/reopen proof and, where applicable, NWN runtime
   proof.

This document closes only lossless storage provenance. It does not claim
localized-string CRUD or native certification.
