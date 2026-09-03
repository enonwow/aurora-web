# Existing Area ground-Item localized-string mutation audit v1

Date: 2026-08-29
Status: source-closed; bounded offline implementation verified; live certification pending
Scope: exact `LocalizedName`, `Description`, and `DescIdentified`
`CExoLocString` provenance plus bounded inline language-0 printable-ASCII
compare-and-swap replacement for one retained type-`0` ground Item

## Decision

Aurora Web may retain the complete exact native storage of the three common
Item localized strings. It may replace one of them only inside the same
deterministic profile already admitted for retained Placeable and Creature
localized strings:

- the exact case-sensitive field exists once with GFF type `12`;
- `strRef` is exactly `0xffffffff`;
- the ordered entry list is empty or contains one non-empty entry;
- the sole entry has numeric language/gender identifier `0`;
- every source and target byte is printable ASCII `0x20..0x7e`;
- empty target text becomes an empty entry list;
- non-empty target text becomes one identifier-`0` entry;
- `LocalizedName` is product-bounded to 256 bytes;
- `Description` and `DescIdentified` are each product-bounded to 4,096 bytes.

There is no trimming, normalization, fallback resolution, encoding
conversion, silent truncation, field creation, TLK replacement, or synthesis
from display metadata. Absent, TLK-backed, multilingual, duplicate,
nonzero-identifier, explicit-empty-entry, control-byte, non-ASCII, malformed,
or over-budget storage remains byte-preserved and `PRESERVE_ONLY`.

These byte limits are Aurora Web request and memory budgets, not claimed
native Toolset maxima. The complete multilingual localized-string editor is a
separate scope.

## Primary Aurora authority

The frozen Toolset decompilation is
`C:/Projects/New Folder/export/decompiled_all.c`, size `30,366,020` bytes,
SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
The installed binary is
`C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
size `12,201,984` bytes, SHA-256
`4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`.
No xoreos or other GPL source was inspected or used.

The common Item reader `FUN_00604db8`, beginning at decompiled line `299920`,
uses native localized-string reader `FUN_00aef678` and complete-value copy
`FUN_00acdefc` for:

1. `LocalizedName` at the Item object base;
2. `DescIdentified` at byte offset `0x90`;
3. `Description` at byte offset `0x08`.

The symmetric common Item writer `FUN_00605b0c`, beginning at line `300282`,
uses complete-value copy `FUN_00acdde0` and native localized-string writer
`FUN_00af0144` in serialized order `LocalizedName`, `Description`, then
`DescIdentified`. Direct read-only PE mapping independently resolves the exact
labels:

| Use | VA | File offset | Exact ASCII |
| --- | ---: | ---: | --- |
| reader | `0x00c47a91` | `0x00846a91` | `LocalizedName` |
| reader | `0x00c47a9f` | `0x00846a9f` | `DescIdentified` |
| reader | `0x00c47aae` | `0x00846aae` | `Description` |
| writer | `0x00c47d6f` | `0x00846d6f` | `LocalizedName` |
| writer | `0x00c47d7d` | `0x00846d7d` | `Description` |
| writer | `0x00c47d89` | `0x00846d89` | `DescIdentified` |

Retained ground-Item writer `FUN_00607ccc` delegates its Item payload to
`FUN_00605b0c`; all three fields therefore belong to the type-`0` GIT Item
struct, not its paired GIC Comment struct.

The native type-`12` payload, language/gender identifier `0`, TLK/fallback,
editor add/remove, ANSI-code-page, raw-preservation, and bounded inline-ASCII
semantics are independently established in
`area-existing-placeable-localized-string-mutation-audit-v1-2026-08-19.md`.
This audit reuses that shared value contract rather than inventing a second
encoding path.

The immutable RCDATA report
`C:/Projects/nwn-last-city/Aurora/reverse/runs/NWTOOLSET_RCDATA_REFRESH_2026-05-20.json`
binds `TDLGITEMEDIT` at RVA `0x00B5F870`, size `18,562`, and records `eName`
with `bLocName`, plus `meDescUnidentified`/`bDescUnidentified` and
`meDescIdentified`/`bDescIdentified`. This corroborates three separately
localized editor values; the plain controls are not the complete native
storage.

## Additive contract v1

Area detail may expose one complete exact triple:

```json
{
  "itemLocalizedStrings": {
    "localizedName": {
      "present": true,
      "strRef": 4294967295,
      "entries": [{ "languageId": 0, "textBytesBase64": "U3dvcmQ=" }]
    },
    "description": { "present": true, "strRef": 4294967295, "entries": [] },
    "identifiedDescription": {
      "present": true,
      "strRef": 4294967295,
      "entries": []
    }
  }
}
```

Each storage member is presence-sensitive; native absence is represented as
`{present:false}`, while native presence retains unsigned `strRef`,
ordered unsigned identifiers, duplicates, empty byte strings, and canonical
base64 bytes. Each field is bounded to 64 entries, 16,384 bytes per entry, and
65,536 aggregate text bytes. If any present member is ambiguous, wrongly typed,
or outside those provenance budgets, the complete optional triple is omitted
fail-closed.

The frontend deep-copies the triple to immutable
`source.itemLocalizedStrings`. A changed admitted target projects one
native-order list:

```json
{
  "kind": "item",
  "sourceObjectId": "item:0:nw_sword:source",
  "sourceIndex": 0,
  "localizedStrings": [
    { "field": "LocalizedName", "expectedValue": "Sword", "value": "Sword 2" },
    { "field": "Description", "expectedValue": "", "value": "Unknown blade" },
    { "field": "DescIdentified", "expectedValue": "", "value": "Known blade" }
  ]
}
```

The only field tokens, in mandatory order, are `LocalizedName`, `Description`,
and `DescIdentified`; each occurs at most once. Every entry has exactly
`field`, `expectedValue`, and `value`; at least one pair changes. This member
may coexist with independently valid Item `templateResRef`, `tag`,
`instanceState`, and paired-GIC `editorComment` mutations for the same ordinal.

## Mutation, preservation, and diagnostics

Planning reparses one canonical type-`0` Item ordinal, revalidates the complete
source storage and exact expected ASCII bytes, and rejects stale or unsupported
profiles. The writer replaces only an existing selected type-`12` field in
place, preserving label, type, order, every unrelated GIT field, and complete
GIC bytes unless the independent Comment CAS also changes. Whole-candidate
readback must reproduce the exact target storage before the existing
revision-fenced ARE/GIT/GIC/IFO transaction may publish.

Unknown keys, invalid order, duplicates, no-op pairs, wrong family or ordinal,
mutation plus deletion, stale storage, preservation drift, or readback mismatch
fails closed with `422 AREA_UPDATE_OBJECT_MUTATION_INVALID`. Existing API-v1
authorization, approved-token, optimistic concurrency, idempotency, fencing,
journaling, rollback/recovery, persisted-readback, receipt, payload, and
mutation-count contracts remain unchanged. The extension adds no endpoint,
binary body, pagination, streaming, chunking, or major version.

Diagnostics expose only contract revision, Item family, operation, outcome,
stable reason, changed-field count, and duration. Text, base64, `strRef`, object
identity, ordinal, hashes, paths, source/storage keys, raw fields/bytes,
credentials, and host paths are prohibited from event fields and metric labels.

## Offline implementation verification

The backend now retains and clones the exact complete triple, fingerprints it,
projects independent per-member expected/value CAS entries in native writer
order, replans them against the immutable Item ordinal, replaces only selected
existing GIT type-`12` fields, and requires whole-candidate readback while
preserving the paired GIC for GIT-only changes. The frontend strictly validates
and deep-copies the API triple, maps only admitted inline values onto editable
targets, keeps unsupported members independently `PRESERVE_ONLY`, applies the
audited byte budgets in the Item dialog, and retains the immutable source
through history cloning, Apply, Cancel, reopen, OK, and local Save.

Resource-safe verification on 2026-08-29 passed `2,243/2,243` focused backend
domain/parser/repository/projector/planner/writer/candidate assertions,
`778/778` focused frontend boundary/domain/mapper/workspace/provenance/clone/
dialog/regression assertions, `13/13` capability-catalog
assertions, and both production builds. Each test runner used one worker and a
one-GiB Node heap ceiling. No Docker command, service, watcher, browser,
capture, live Toolset/NWN process, mutation test, sub-agent, xoreos source, or
other GPL source was used.

## Required completion gates

TDD must prove exact storage parsing and cloning; all admitted and rejected
profiles; native-order exact-key mutation validation; independent per-field
frontend admission; immutable provenance across clone/cancel/undo/save/reopen;
projector and planner CAS; exact GIT replacement; unrelated raw localized-byte
preservation; byte-identical GIC for GIT-only changes; combined Item mutations;
whole-candidate readback; deterministic output; focused unit, integration,
round-trip, regression, and production-build gates.

Fresh guarded browser Apply/Save/reopen, exact-candidate Toolset
Save/Build/reopen, and applicable NWN presentation remain separate release
gates. This source-closed audit authorizes the bounded offline implementation;
it does not claim runtime or full multilingual parity.
