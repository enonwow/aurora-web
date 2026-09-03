# Existing Area Name entry-reorder audit v1

Date: 2026-08-25  
Status: Aurora storage semantics, additive contract, and offline implementation
verified; browser and native runtime proof pending

## Decision

Aurora Web may explicitly reorder already-existing entries of an admitted
inline printable-ASCII Area `Name : CExoLocString`. Reordering remains part of
the existing complete-list compare-and-set mutation. The target must retain
identifier `0`, may contain only unique identifiers from the complete source
list, and may also remove alternate entries or change retained text. It may
not add or reinsert an identifier that is absent from the immutable source.

This decision authors serialized native collection order. It does not claim
that the retail Toolset exposes a separate move command, that entry order
changes localized lookup priority, or that arbitrary numeric identifiers are
safe add choices. The product continues to keep add/reinsert, TLK-backed
storage, non-ASCII encodings, and a complete language/gender add catalog out of
this bounded profile.

## Primary evidence

The inspected primary artifacts are:

- `C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
- `C:/Projects/New Folder/export/functions.tsv`, SHA-256
  `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`;
- retail `nwtoolset.exe`, SHA-256
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`;
- `C:/Projects/nwn-last-city/Aurora/reverse/reverse/nwtoolset_rcdata_report.json`,
  SHA-256
  `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`.

No GPL source was inspected or used.

## Native order semantics

The retained localized-entry collection is an insertion-ordered doubly linked
list. `FUN_00acdae4` at `decompiled_all.c:947734-947760` appends a node to the
tail. `FUN_00acdc2c` at `947816-947831` advances through the next link, and
`FUN_00acdc60` at `947835-947865` removes one node while retaining every other
relative position.

The generic `CExoLocString` writer `FUN_00af0144` at
`decompiled_all.c:968986-969107` obtains the collection count and enumerates
indices from zero. For each index it resolves the corresponding
language/gender/text entry and writes the identifier/text record immediately
to the next output position. The serialized GFF entry order is therefore the
native collection order and is real retained file state, not a sorted or
display-only projection.

Aurora Web already parses and writes the complete ordered native list and
independently compares that order during candidate and persisted readback.
Writing the requested permutation is consequently source-closed at the file
boundary. No runtime display-order effect is inferred; localized lookup
behavior remains keyed by language/gender as documented in the preceding
multi-entry audits.

## Frozen additive contract

The payload shape remains unchanged:

```json
{
  "name": {
    "expectedValue": "Crypt",
    "value": "Crypt",
    "expectedProfile": "multi_entry_inline_ascii",
    "expectedEntries": [
      { "languageId": 0, "text": "Crypt" },
      { "languageId": 2, "text": "Krypta" },
      { "languageId": 5, "text": "Crypte" }
    ],
    "valueEntries": [
      { "languageId": 5, "text": "Crypte" },
      { "languageId": 0, "text": "Crypt" },
      { "languageId": 2, "text": "Stara krypta" }
    ]
  }
}
```

Both arrays remain complete, bounded, unique, printable-ASCII lists. Target
identifiers must be a set subset of source identifiers and must contain
identifier `0` exactly once; target order is explicit and may differ. At least
one text, retained member, or retained-member position must change. The source
profile still derives exactly from `expectedEntries`; the target profile
derives from `valueEntries` and changes only when removals reduce the list to
one default entry.

The existing endpoint, API major version, request budget, authorization,
idempotency, journal, atomic publication, and recovery behavior are unchanged.
Diagnostics may expose bounded counts and numeric removed/moved identifiers,
but not localized text, raw bytes, ResRefs, or host paths.

## Completion boundary

Offline closure requires domain/schema, projector, writer, candidate,
persisted readback, atomic storage, frontend facade/history/dialog, regression,
and production-build evidence. Browser Save/reopen, Toolset Save/Build/reopen,
and NWN localized-display proof remain separate release gates. Arbitrary
add/reinsert and language-label authoring remain blocked on their own complete
source audit.

## Offline implementation closure

The existing complete-list CAS now admits an explicit target permutation only
when every target identifier is unique, identifier `0` remains present, and
the target identifier set is a subset of the immutable source set. Backend
schema validation, draft projection, retained-ARE writing, candidate
validation, atomic transaction transfer, and persisted semantic readback all
retain and compare the requested order exactly. A text edit, removal, and
reorder may coexist in one operation without synthesizing an identifier.

The frontend domain and properties facade apply the same source-closed rule.
Area Properties exposes bounded move-up and move-down actions for existing
alternate entries, including movement across the visually separate default
identifier-`0` entry. The committed draft, Verify/Export mutation, and history
retain the exact resulting list. Adding or reinserting entries remains absent
from the UI and fails closed at every boundary.

The accepted bounded gate passed 7 backend suites with 578 assertions, 4
frontend suites with 53 assertions including a dedicated regression smoke,
12 immutable capability-catalog assertions, and both production builds. No
managed service, browser, Toolset, or NWN process was started for this offline
closure. Fresh browser Save/reopen, exact-candidate Toolset Save/Build/reopen,
and NWN localized-display behavior remain open release proof.
