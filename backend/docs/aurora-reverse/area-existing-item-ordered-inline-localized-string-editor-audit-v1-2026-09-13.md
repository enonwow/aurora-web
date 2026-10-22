# Existing Area Item ordered inline localized-string editor audit v1

Date: 2026-09-13  
Status: source-closed bounded implementation offline verified; runtime proof pending

## Decision

Aurora Web may expose and mutate the complete ordered entry list of an existing
type-`0` GIT Item `LocalizedName`, `Description`, or `DescIdentified`
`CExoLocString` when that field is an exact lossless inline printable-ASCII
profile:

- the native field is present exactly once with type `CExoLocString`;
- `strRef` is exactly `0xffffffff`;
- the list contains `0..64` ordered entries with unique unsigned-32-bit
  identifiers;
- a nonempty list contains identifier `0` exactly once;
- every substring contains `0..16,384` printable-ASCII bytes and aggregate
  text is at most `65,536` bytes;
- identifier `0`, when present, is limited to 256 bytes for `LocalizedName`
  and 4,096 bytes for each description field.

The complete list is authoritative. Editing may change existing texts, remove
entries, reorder retained entries, and add or reinsert only identifiers from
the frozen Western-language catalog
`aurora-area-name-language-catalog.v1`. A newly added entry must be nonempty.
Existing unknown identifiers may be preserved, edited, moved, or removed but
must never be synthesized. A target may become the exact empty list; it may
not contain alternate entries without identifier `0`.

TLK-backed values, duplicate identifiers, non-ASCII bytes, nonzero-only lists,
and over-budget or malformed payloads remain preserve-only. This checkpoint
does not claim arbitrary ANSI conversion, TLK-to-inline transition, or the
four unresolved native localized-editor rows.

## Primary Aurora evidence

The inspected primary artifacts are:

- `C:/Projects/New Folder/export/decompiled_all.c`, 30,366,020 bytes, SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
- `C:/Projects/New Folder/export/functions.tsv`, 1,928,975 bytes, SHA-256
  `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`;
- retail `nwtoolset.exe`, SHA-256
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`;
- the frozen Toolset RCDATA report, SHA-256
  `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`.

No xoreos or other GPL source was inspected or used.

The common Item reader `FUN_00604db8`, beginning at
`decompiled_all.c:299920`, uses the native localized-string reader
`FUN_00aef678` and complete-value copy `FUN_00acdefc` for `LocalizedName`,
`DescIdentified`, and `Description`. The symmetric common writer
`FUN_00605b0c`, beginning at line `300282`, uses complete-value copy
`FUN_00acdde0` and localized-string writer `FUN_00af0144` in serialized order
`LocalizedName`, `Description`, then `DescIdentified`. Retained ground-Item
writer `FUN_00607ccc` delegates its payload to that common writer, establishing
type-`0` GIT ownership for all three fields.

The generic GFF localized-string reader `FUN_00aef678` at line `968351`
consumes the stored count and every ordered identifier/text tuple. The
symmetric writer `FUN_00af0144` at line `968986` emits the retained `strRef`,
complete native map, and reconstructed identifiers. Full-value copy
`FUN_00acdefc` preserves both the map and `strRef`.

The generic localized editor setter `FUN_00acdf2c` computes
`language * 2 + gender`, forces English gender to zero, and inserts or replaces
that key. `FUN_00ace524` removes the same key. Dialog commit
`FUN_0070e8ec` selects insertion for nonempty text and removal for empty text.
The audited `FUN_0070e318` catalog proves only identifiers
`{0,2,3,4,5,6,7,8,9,10,11}`; those are therefore the only identifiers this
bounded editor may add.

The Toolset RCDATA binding for `TDLGITEMEDIT` records separate localized Name,
unidentified Description, and identified Description controls. It corroborates
the three editor members but does not replace the binary reader/writer proof.

## Additive contract

For each admitted field, `itemProperties` may carry a detached complete target
list beside its identifier-`0` text:

```json
{
  "localizedName": "Sword",
  "localizedNameEntries": [
    { "languageId": 42, "text": "Retained source row" },
    { "languageId": 0, "text": "Sword" },
    { "languageId": 10, "text": "Miecz" }
  ]
}
```

`descriptionEntries` and `identifiedDescriptionEntries` are the corresponding
targets for `Description` and `DescIdentified`. When an entry list is present,
its identifier-`0` text, or `""` for an empty list, must equal the scalar
target. Source raw storage remains immutable provenance.

The projected `localizedStrings` element additively accepts the exact six-key
shape:

```json
{
  "field": "LocalizedName",
  "expectedValue": "Sword",
  "value": "Sword 2",
  "expectedProfile": "multi_entry_inline_ascii",
  "expectedEntries": [{ "languageId": 0, "text": "Sword" }],
  "valueEntries": [{ "languageId": 0, "text": "Sword 2" }]
}
```

Profiles are `empty_inline_ascii`, `simple_inline_ascii`, and
`multi_entry_inline_ascii`, derived only from source entry count. The legacy
three-key scalar pair remains accepted only for the previously admitted empty
or one-entry identifier-`0` profile. A list mutation requires exact complete
source CAS and at least one text, member, or position change. The field tokens
remain limited to native writer order `LocalizedName`, `Description`, and
`DescIdentified`.

## Preservation, diagnostics, and completion gates

Planning reparses the exact immutable Item ordinal and compares the complete
expected list. The writer replaces exactly one existing native type-`12` field
with `strRef=0xffffffff` and the complete requested target in requested order.
Candidate and persisted readback compare that target list; all unrelated GIT
fields and all GIC bytes remain unchanged.

HTTP, scene, persisted-draft, history, facade, export, and dialog boundaries
must detach all three lists. Routine diagnostics may expose only family,
ordinal, field token, source/target profile, bounded counts, changed numeric
identifiers, stage, and stable reason code. Localized text, base64, hashes,
ResRefs, object keys, and host paths are excluded.

Required TDD covers admission and every rejection boundary, scalar backward
compatibility, complete-list projection, stale CAS, exact writer ordering,
candidate and persisted readback, GIC identity, frontend clone/history,
Apply/Cancel/reopen/OK/local Save, and visible add/edit/remove/reorder controls.
Production builds and focused regression tests must pass.

## Implemented offline evidence

Capability revision `2026-09-13.183` implements the contract across the full
offline path:

- API-to-scene mapping decodes and detaches every admitted ordered entry;
- dialog drafts, cancel/undo snapshots, workspace persistence, and the scene
  mutation facade retain independent complete targets;
- visible controls for all three fields edit, add, remove, and reorder entries,
  keep scalar identifier-`0` text coherent, and expose only the frozen catalog
  for newly synthesized identifiers;
- projection and source replanning require complete profile/value/list CAS;
- the native writer replaces only the exact type-`12` field, preserves order,
  and verifies complete candidate and persisted readback;
- paired GIC and module IFO bytes remain unchanged.

Focused domain, projector, planner, writer, mapper, provenance, workspace,
dialog, regression, candidate-compiler, and atomic-publication tests are green.
Final whole-suite counts are recorded in the Area program checkpoint rather
than duplicated here.

This source audit admits the bounded implementation only. Full arbitrary
code-page editing, TLK transitions, duplicate/nonzero-only recovery, the four
unresolved language rows, fresh guarded browser Save/reopen, Toolset
Save/Build/reopen, and NWN localized display remain separate gates. The former
`item_full_localized_string_editor_pending` blocker is therefore narrowed to
`item_tlk_codepage_and_unresolved_language_entry_authoring_pending`.
