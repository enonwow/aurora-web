# Existing Area Creature name localized-string mutation audit v1

Date: 2026-08-26  
Status: source-closed; offline implementation verified; browser, Toolset, and NWN proof pending

Superseding note (2026-09-13): the complete ordered inline printable-ASCII
entry-list profile is implemented and governed by
`area-existing-creature-ordered-inline-localized-string-editor-audit-v1-2026-09-13.md`.
This audit remains the authority for the original scalar profile and native
FirstName/LastName lineage.

## Decision

Aurora Web may carry the complete exact native storage of `FirstName` and
`LastName` for one retained type-`4` Area GIT Creature. It may replace either
field only inside the same deterministic localized-string profile already
admitted for retained Placeable localized strings:

- the native field exists exactly once with its exact case-sensitive label;
- its native type is `CExoLocString` (GFF type `12`);
- `strRef` is exactly `0xffffffff`;
- the ordered entry list is empty or contains exactly one non-empty entry;
- the sole entry has numeric language/gender identifier `0`;
- every source and target byte is printable ASCII `0x20..0x7e`;
- empty target text is serialized as an empty entry list;
- non-empty target text is serialized as one identifier-`0` entry;
- each name is product-bounded to 256 bytes.

There is no trimming, Unicode normalization, case folding, fallback lookup,
encoding conversion, silent truncation, field creation, or TLK replacement.
Absent, TLK-backed, multilingual, nonzero-identifier, duplicate, explicit
empty-entry, control-byte, non-ASCII, malformed, or over-budget storage is
retained exactly and exposed as `PRESERVE_ONLY`.

The 256-byte limit is an Aurora Web request and memory budget. The inspected
Toolset form does not serialize a `MaxLength` property for either name edit,
so this audit does not misrepresent that product budget as a native limit.

## Primary authority and immutable identities

The primary decompilation source is
`C:/Projects/New Folder/export/decompiled_all.c`, size `30,366,020` bytes,
SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
Its symbol/string report
`C:/Projects/New Folder/export/strings.tsv` has SHA-256
`864ae0139451d5333307cb2bbccce725bbd2d2c6056ac2d5f80f9b5ea50f190f`.

The corresponding Toolset binary is
`C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
size `12,201,984` bytes, SHA-256
`4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`.
The immutable RCDATA report is
`C:/Projects/nwn-last-city/Aurora/reverse/runs/NWTOOLSET_RCDATA_REFRESH_2026-05-20.json`,
SHA-256
`3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`.

Only these primary artifacts, installed retail resources, and repository
fixtures were inspected. No Toolset, NWN, browser, server, Docker process, or
capture was started. No xoreos or other GPL source was inspected or used.

## Creature GFF read/write lineage

The placed Creature reader `FUN_0053ab24` calls the complete Creature property
reader `FUN_00532174` at decompiled line `197530`. Inside that reader:

1. lines `194125..194131` read exact label `FirstName` through localized-string
   helper `FUN_00aef678` and copy the complete result into the member at
   `param_1 + 0x5c`;
2. lines `194135..194141` do the same for exact label `LastName` and the member
   at `param_1 + 0x64` (decimal `100`).

The placed Creature writer `FUN_0053ae80` calls the complete Creature property
writer `FUN_0053521c` at line `197590`. That writer emits:

1. `FirstName` through `FUN_00af0144` at lines `195138..195141`;
2. `LastName` through the same helper at lines `195142..195145`.

The string table independently binds exact case-sensitive labels at virtual
addresses `0x00bfdf96`, `0x00bfdfa0`, `0x00bfe46f`, and `0x00bfe479`.

`FUN_00aef678` accepts only native type `0x0c`, reads the base `strRef`, entry
count, each stored numeric identifier and byte length, reconstructs the
language/gender key, and rejects a payload with trailing or missing bytes.
`FUN_00af0144` creates/uses native type `0x0c`, computes the exact payload size,
writes the base `strRef`, ordered count, every numeric identifier, byte length,
and byte string. This is the same native value and helper family independently
audited for retained Placeable localized strings.

## Toolset form evidence

The RCDATA report binds `TDLGCREATUREEDIT` at RVA `0x00AE4698`, size `52,662`.
Direct read-only PE mapping resolves the binary form at file offset
`0x009ddc98`. The Basic profile group contains:

- `eFirstName : TEdit` followed by `bLocFirstName : TButton`;
- `eLastName : TEdit` followed by `bLocLastName : TButton`;
- `eTag : TEdit` separately.

The exact `eFirstName` object occupies relative bytes beginning at `0x1714`;
its serialized properties end after `TabOrder` at `0x1765`. The exact
`eLastName` object begins at `0x17cc`; its properties end after `TabOrder` at
`0x1813`. Neither object contains `MaxLength`. The separate `eTag` object at
`0x1b9a` contains `MaxLength` at `0x1bd9` with value `0x20`. This prevents the
Tag limit from being incorrectly applied as native name semantics.

The localization buttons corroborate that the adjacent plain edits are only
one presentation of complete localized values; they are not plain
`CExoString` storage contracts.

## Retail construction fixture

The exact accepted `nw_chicken` construction fixture records:

```text
FirstName : CExoLocString = { strRef: 12416, entries: [] }
LastName  : CExoLocString = { strRef: 0xffffffff, entries: [] }
```

Accordingly the canonical chicken First Name remains `PRESERVE_ONLY` because
it is TLK-backed, while its empty inline Last Name is eligible for the bounded
profile. A displayed TLK resolution is never projected back as an inline value.

## Additive boundary and mutation contract

Area detail may add the complete exact pair:

```json
{
  "creatureLocalizedStrings": {
    "firstName": {
      "present": true,
      "strRef": 4294967295,
      "entries": [
        { "languageId": 0, "textBytesBase64": "R3VhcmQ=" }
      ]
    },
    "lastName": { "present": true, "strRef": 4294967295, "entries": [] }
  }
}
```

Each member is presence-sensitive. Present storage retains unsigned `strRef`,
ordered unsigned identifiers, duplicates, empty byte strings, and canonical
base64 bytes. Each field is bounded to 64 entries, 16,384 raw bytes per entry,
and 65,536 aggregate text bytes. If either member is ambiguous or outside
those provenance budgets, the complete optional pair is omitted fail-closed.

The frontend deep-copies this pair to immutable
`source.creatureLocalizedStrings`. A changed admitted target projects one
native-order list:

```json
{
  "kind": "creature",
  "sourceObjectId": "creature:0:nw_guard:...",
  "sourceIndex": 0,
  "localizedStrings": [
    { "field": "FirstName", "expectedValue": "Guard", "value": "Captain" },
    { "field": "LastName", "expectedValue": "", "value": "Aribeth" }
  ]
}
```

The only tokens are `FirstName` then `LastName`; each occurs at most once and
native order is mandatory. Each entry contains exactly `field`,
`expectedValue`, and `value`, and the complete list contains at most two
entries. At least one pair must change. The immutable locator is
`(sourceKind=creature, sourceIndex)`; `sourceObjectId` is diagnostic only.

## Writer, transaction, and diagnosability requirements

Planning reparses the exact Creature ordinal and compares the complete admitted
source bytes with `expectedValue`. The writer replaces only one existing exact
type-`12` field per requested pair, preserves label and field order, preserves
all unrelated GIT fields, and preserves the entire paired GIC byte-for-byte.
Independent whole-candidate readback is required before the existing
revision-fenced, idempotent, journaled ARE/GIT/GIC/IFO transaction may commit.

The pair may coexist atomically with independently valid retained Creature
Tag, `ItemList`, and `Equip_ItemList` mutations. Mutation plus deletion of the
same ordinal, duplicates, unknown keys, stale source, unsupported profiles,
unchanged pairs, or preservation/readback drift fails with
`422 AREA_UPDATE_OBJECT_MUTATION_INVALID`.

Diagnostics expose only family, ordinal, field token, bounded counts, stage,
duration, and stable reason codes. They must not expose names, base64, raw
bytes, TLK text, ResRefs, storage keys, content keys, or host paths. The
extension adds no endpoint, binary body, pagination, streaming, or chunking
and retains existing request budgets and authorization.

## Offline implementation result — 2026-08-26

The bounded profile is implemented across the backend localized-string
storage and mutation domains, GFF parsing, repository snapshots, draft
projection, independent planning, paired-object writing, candidate
compilation/readback, and atomic publication. The frontend now carries the
exact pair through the HTTP boundary, Area-to-scene mapping, immutable scene
cloning, saved-draft validation, per-member control-state derivation, the
Creature properties dialog, and reducer/materializer flow. Editable targets
retain whitespace and empty text verbatim; immutable source storage remains
separate for admission and optimistic comparison.

The accepted bounded offline gate is:

- nine focused backend unit suites: `1832/1832` assertions;
- Area Update atomic-publication integration: `32/32` assertions;
- nine focused frontend unit/regression suites: `322/322` assertions;
- passing backend production build;
- passing frontend production build, with only the pre-existing large-chunk
  advisory.

Capability catalog revision `2026-08-26.54` records the implementation and
its exact source audit while deliberately retaining `PARTIAL/BLOCKED` for
Creature authoring. No Docker engine, container, server, watcher, browser,
capture, Toolset, NWN, or mutation-test process was started for this slice.
These offline results are not runtime proof.

## Completion boundary

Offline completion requires domain, parser, repository clone/fingerprint,
frontend HTTP/domain mapping, immutable clone, dialog activation state,
reducer/materializer, projector, independent planner, writer, whole-candidate
readback, combination, regression, round-trip, integration, build, and
capability-catalog coverage.

This bounded profile is progress toward Creature CRUD, not complete localized
name parity. Full TLK replacement, arbitrary code-page text, multilingual and
gender-aware editing, multiple/duplicate entries, explicit empty entries,
random-name behavior, browser Save/reopen, Toolset Save/Build/reopen, and NWN
runtime presentation remain separate required gates.
