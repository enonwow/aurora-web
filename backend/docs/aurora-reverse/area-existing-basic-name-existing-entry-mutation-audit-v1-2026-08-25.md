# Existing Area Name existing-entry mutation audit v1

Date: 2026-08-25  
Status: offline implementation verified; browser and native proof pending

## Decision

Aurora Web may edit the text of any existing inline printable-ASCII substring
in an admitted Area `Name : CExoLocString` value. The mutation is admitted only
when both the immutable expected list and target list preserve the exact source
entry count, numeric identifiers, and order. Only one or more text values may
change.

This scope does not add, remove, or reorder entries. It does not edit a TLK
`strRef`, admit non-ASCII bytes, infer a language label, normalize text, or
claim NWN display-language behavior. The numeric identifier is exposed as
source provenance because its native mapping is proven; it is not converted to
an invented product locale catalog. No xoreos code or semantics were used.

## Primary Aurora evidence

The primary evidence and hashes are frozen in
`area-existing-basic-name-multi-entry-inline-mutation-audit-v1-2026-08-25.md`:

- `C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
- `C:/Projects/New Folder/export/functions.tsv`, SHA-256
  `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`;
- `C:/Projects/nwn-last-city/Aurora/reverse/reverse/nwtoolset_rcdata_report.json`,
  SHA-256
  `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`.

At `decompiled_all.c:968351`, `FUN_00aef678` reads every ordered substring
record and maps its stored identifier to `language = signedIdentifier / 2` and
`gender = signedIdentifier & 1`. At `decompiled_all.c:968986`,
`FUN_00af0144` writes every native map entry with the identifier reconstructed
as `language * 2 + gender`.

At `decompiled_all.c:948003`, `FUN_00acdf2c` inserts or replaces one selected
language/gender entry. `FUN_00ace524` at `decompiled_all.c:948295` removes a
selected key. The Area Properties transfer functions `FUN_00553710` and
`FUN_0055404c` copy the complete localized value, while the Toolset localized
editor `FUN_0070e8ec` commits the selected key without flattening siblings.

This evidence proves that the sibling identifiers are native editable members
of the same value. It does not prove a stable UI label catalog for every
numeric language value or a byte encoding beyond the already admitted
printable-ASCII profile.

## Frozen additive contract

When the complete Name storage is admitted, `AreaBasicIdentity` exposes the
ordered immutable source list:

```json
{
  "name": "Crypt",
  "nameProfile": "multi_entry_inline_ascii",
  "nameEntries": [
    { "languageId": 0, "text": "Crypt" },
    { "languageId": 2, "text": "Krypta" }
  ],
  "tag": "crypt_tag"
}
```

`nameEntries` is all-or-nothing and uses the existing bounds: `1..64` entries,
unique unsigned-32-bit identifiers, exactly one identifier `0`, printable
ASCII only, at most `16,384` characters per entry, at most `65,536` aggregate
characters, and a valid non-empty default identifier-`0` name.

An entry-aware Name mutation extends the existing Name CAS pair with both
complete lists:

```json
{
  "name": {
    "expectedValue": "Crypt",
    "value": "Crypt",
    "expectedProfile": "multi_entry_inline_ascii",
    "expectedEntries": [
      { "languageId": 0, "text": "Crypt" },
      { "languageId": 2, "text": "Krypta" }
    ],
    "valueEntries": [
      { "languageId": 0, "text": "Crypt" },
      { "languageId": 2, "text": "Stara krypta" }
    ]
  }
}
```

The two lists must have the same length and identical identifiers in the same
order. Their identifier-`0` texts must equal `expectedValue` and `value`.
`expectedProfile` must match both lists and the retained ARE. At least one text
must change. Both list members are required together. Existing clients may
continue to send the prior default-entry-only pair; it remains unable to alter
a sibling entry.

The optional arrays remain inside the existing Area Update request budget and
API major version. They add no endpoint, pagination, streaming, or binary body.
Diagnostics may record the profile, entry count, changed identifiers, stage,
and stable result code, but not localized text, raw bytes, ResRefs, or host
paths.

## Writer and verification requirements

Immediately before writing, the backend must reparse the retained exact
`Name : CExoLocString`, compare every expected identifier and text, and reject
stale, partial, reordered, duplicate, malformed, profile-mismatched, or
unchanged input. The candidate keeps `strRef=0xffffffff`, every identifier, and
the source order, replacing only target text values.

Independent candidate and persisted readback must prove the complete target
entry list, derived profile, ordinary default Area name, exact candidate ARE
hash, and byte-identical unrelated GIT/GIC/IFO companions. Frontend parsing,
workspace drafts, cloning, history, export, and dialog state must preserve
detached ordered lists and fail closed when provenance is missing.

## Completion boundary

Offline completion requires contract tests, parser exposure, immutable
repository/API transfer, frontend source/target separation, existing-entry UI,
full-list CAS validation, writer replacement, candidate/persisted readback,
atomic integration, regression smoke, and production builds.

Release remains blocked by fresh browser Save/reopen, exact-candidate Toolset
Save/Build/reopen, and NWN localized-display proof. TLK-backed and non-ASCII
values plus entry add/remove/reorder authoring remain separate source gaps.

## Offline implementation checkpoint

Capability catalog revision `2026-08-25.36` records this existing-entry slice
without changing the broader `properties_basic_identity` row from
`verified/partial/blocked`. The backend now validates complete lists at the
HTTP schema and draft projector, replaces text through the preserve-first ARE
writer, rechecks the complete candidate, and compares the complete persisted
target. The application-service and atomic Area Update paths retain the lists
through compilation and publication. GIT, GIC, and module IFO remain
byte-identical for a Name-only mutation.

The frontend validates and detaches lists at HTTP, scene, and persisted-draft
boundaries. Area Properties exposes numeric source identifiers and edits only
existing text. Its facade supports default-only, sibling-only, and combined
changes, and rejects a changed count, identifier, order, default text, or
derived profile. Invalid Name provenance is discarded without discarding an
independently valid Tag.

Accepted bounded evidence is 467/467 backend schema/projector/candidate/
persisted-readback assertions, 22/22 backend application-service assertions,
28/28 Area Update atomic-publication integration assertions, 242/242 focused
frontend unit/component assertions, 85/85 frontend regression-smoke
assertions, 12/12 immutable catalog assertions, and passing backend/frontend
production builds. The standard multi-suite ts-jest invocation exceeded the
mandatory 1 GiB heap before producing assertions; the repository's isolated-
module bounded config passed the constituent suites without raising the heap.

No managed service, browser capture, Toolset, or NWN process was started or
stopped. Therefore the browser and native completion boundary above remains
open.
