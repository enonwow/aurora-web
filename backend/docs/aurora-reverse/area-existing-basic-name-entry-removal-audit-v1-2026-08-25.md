# Existing Area Name entry-removal audit v1

Date: 2026-08-25  
Status: offline implementation verified; browser and native proof pending

## Decision

Aurora Web may remove one or more already-existing alternate entries from an
admitted inline printable-ASCII Area `Name : CExoLocString`. The mutation is a
complete-list compare-and-set operation. Its target identifiers must be an
order-preserving subset of the immutable source identifiers and must retain
identifier `0` exactly once.

The same request may also change text in retained entries. It may not add a
new identifier, reinsert a removed identifier, reorder retained identifiers,
remove identifier `0`, change `strRef`, admit TLK-backed storage, or author a
non-ASCII byte sequence. Removing the final alternate entry changes the
derived target profile from `multi_entry_inline_ascii` to
`simple_inline_ascii`; `expectedProfile` remains the source-profile CAS token.

The UI exposes removal as an explicit action. Empty alternate text remains an
existing empty entry and is not silently interpreted as deletion.

## Primary evidence

The inspected primary artifacts are:

- `C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
- `C:/Projects/New Folder/export/functions.tsv`, SHA-256
  `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`;
- `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
  SHA-256
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`;
- `C:/Projects/nwn-last-city/Aurora/reverse/reverse/nwtoolset_rcdata_report.json`,
  SHA-256
  `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`.

No xoreos or other GPL source was inspected or used.

## Native collection and order semantics

The localized-string entry collection is an insertion-ordered doubly linked
list rather than a key-sorted map:

- `FUN_00acdae4` at `decompiled_all.c:947734-947760` appends a new list node to
  the tail;
- `FUN_00acdc2c` at `decompiled_all.c:947816-947831` advances through the next
  link;
- `FUN_00acdc60` at `decompiled_all.c:947835-947865` splices one selected node
  while retaining the relative order of all other nodes;
- `FUN_00ace784` at `decompiled_all.c:948382-948509` replaces an existing key
  in place or appends a previously absent key;
- `FUN_00acf598` at `decompiled_all.c:949009-949044` finds the exact numeric key
  and removes it through `FUN_00acf64c`.

The generic `CExoLocString` writer `FUN_00af0144` at
`decompiled_all.c:968986-969107` enumerates the native collection by index and
writes each key/text pair in that list order. Order is therefore real retained
file state. There is no separately evidenced move operation. A future
remove-and-reinsert path would append the reinserted key and is outside this
slice because reinsertion requires a source-closed add catalog.

## Toolset removal behavior

RCDATA form `TDLGLOCSTRING` is the Toolset `String Edit` dialog. It exposes a
localized-string grid, edit/apply/reset actions, and a text editor. The dialog
receives a full-value copy through `FUN_0070e4d0`.

On commit, `FUN_0070e8ec` reads the selected text. At
`decompiled_all.c:451582-451584`, empty text calls `FUN_00ace524`, which removes
the selected language/gender key. At `decompiled_all.c:451623-451624`, nonempty
text calls `FUN_00acdf2c`, which inserts or replaces the selected key. The Area
Properties transfer functions retain the complete localized value, as frozen
in the preceding multi-entry and existing-entry audits.

This proves exact-key removal and retained-order preservation. It does not
prove a complete stable product catalog for every addable Toolset language and
gender slot. Consequently arbitrary add/reinsert remains blocked rather than
being inferred from numeric GFF identifiers.

## Frozen additive contract

The existing entry-aware Name mutation keeps the same payload shape:

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
      { "languageId": 0, "text": "Crypt" }
    ]
  }
}
```

Both lists remain complete, bounded, unique, printable-ASCII lists. The source
list must derive exactly `expectedProfile`. The target list must contain
identifier `0`, its identifiers must form an order-preserving subset of the
source identifiers, and its default text must equal `value`. At least one text
or list member must change. The target profile is derived from `valueEntries`
and may differ from `expectedProfile` only through admitted removal.

The existing endpoint, authorization, idempotency, request budget, journal,
atomic publication, and recovery contracts remain unchanged. Diagnostics may
record source/target profiles, source/target entry counts, removed numeric
identifiers, stage, and stable result code. They may not record localized
text, raw bytes, ResRefs, or host paths.

## Writer and verification requirements

Immediately before writing, the backend reparses the retained exact Name,
proves the complete expected list, rejects a new/reordered/missing-default
target, retains `strRef=0xffffffff`, and serializes exactly the complete target
list. Candidate validation independently proves both the target list and the
ordered-subset relation against the source. Persisted readback proves the
derived target profile, target default text, complete target list, exact ARE
candidate hash, and byte-identical unrelated GIT/GIC/IFO companions.

Frontend HTTP, scene, draft, history, facade, export, and dialog boundaries
must detach and validate both lists. The dialog may remove only nonzero
identifiers and must recompute the target profile immediately.

## Completion boundary

Offline completion requires domain/schema, projector, writer, candidate,
persisted-readback, atomic integration, frontend facade/history/UI, regression,
and production-build evidence. Browser Save/reopen, exact-candidate Toolset
Save/Build/reopen, and NWN localized-display proof remain release gates.

Adding or reinserting entries, a complete language/gender label catalog,
explicit order authoring, TLK-backed mutation, and non-ASCII encoding remain
separate source gaps.

## Offline implementation checkpoint

Capability catalog revision `2026-08-25.37` implements this exact bounded
profile through backend and frontend. The shared domain parser accepts only a
complete target whose identifiers retain `0` and form an order-preserving
source subset. A profile transition is legal only when complete source and
target lists are present; a profile-only spoof fails closed.

Backend projection keeps `expectedProfile` bound to the immutable source,
while the writer serializes exactly `valueEntries`. Candidate validation and
persisted readback independently derive the target profile and compare the
complete target list. Atomic publication proves the final-alternate-removal
case as `multi_entry_inline_ascii` to `simple_inline_ascii` and verifies that
GIT, GIC, and module IFO remain byte-identical.

Frontend Area Properties exposes an explicit remove button only for nonzero
identifiers, immediately derives the remaining-list profile, and preserves an
empty alternate entry until that button is used. Facade apply and direct
export reject additions, reorder, missing default, inconsistent profiles,
malformed provenance, and a target list that is not a source subsequence.

Accepted offline gates are 573/573 focused backend layer assertions, 150/150
backend application/compiler assertions, 29/29 Area Update atomic-publication
integration assertions, 244/244 focused frontend boundary/component
assertions, 85/85 full frontend regression assertions, 12/12 immutable
catalog assertions, and passing backend/frontend production builds. The
existing React `act(...)` and Vite chunk-size messages remain non-failing
warnings.

No managed service, browser capture, Toolset, or NWN process was started or
stopped for this slice because another coordinated task owns that runtime
lane. Browser Save/reopen, exact-candidate Toolset Save/Build/reopen, and NWN
localized-display behavior therefore remain release gates rather than inferred
completion.
