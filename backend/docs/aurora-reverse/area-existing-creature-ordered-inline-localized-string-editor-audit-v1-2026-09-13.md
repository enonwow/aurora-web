# Existing Area Creature ordered inline localized-string editor audit v1

Date: 2026-09-13  
Status: source-closed bounded implementation offline verified; runtime proof pending

## Decision

Aurora Web may expose and mutate the complete ordered entry list of an existing
type-`4` GIT Creature `FirstName`, `LastName`, or `Description`
`CExoLocString` when that field is an exact lossless inline printable-ASCII
profile:

- the native field is present exactly once with type `CExoLocString`;
- `strRef` is exactly `0xffffffff`;
- the list contains `0..64` ordered entries with unique unsigned-32-bit
  identifiers;
- a nonempty list contains identifier `0` exactly once;
- every substring contains `0..16,384` printable-ASCII bytes and aggregate
  text is at most `65,536` bytes;
- identifier `0`, when present, is limited to 256 bytes for either name and
  4,096 bytes for `Description`.

The complete list is authoritative. Editing may change existing texts, remove
entries, reorder retained entries, and add or reinsert only identifiers from
the frozen Western-language catalog
`aurora-area-name-language-catalog.v1`. A newly added entry must be nonempty.
Existing unknown identifiers may be preserved, edited, moved, or removed but
must never be synthesized. A target may become the exact empty list; it may
not contain alternate entries without identifier `0`.

TLK-backed values, duplicate identifiers, non-ASCII bytes, nonzero-only lists,
and over-budget or malformed payloads remain preserve-only. This checkpoint
does not claim arbitrary ANSI conversion, TLK-to-inline transition, random-
name behavior, or the four unresolved native localized-editor rows.

## Primary Aurora evidence

This decision reuses the already frozen primary-source lineage in:

- `area-existing-creature-name-localized-string-mutation-audit-v1-2026-08-26.md`;
- `area-existing-creature-description-localized-string-mutation-audit-v1-2026-09-02.md`;
- `area-existing-item-ordered-inline-localized-string-editor-audit-v1-2026-09-13.md`.

The inspected immutable primary artifacts remain:

- `C:/Projects/New Folder/export/decompiled_all.c`, 30,366,020 bytes, SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
- `C:/Projects/New Folder/export/functions.tsv`, 1,928,975 bytes, SHA-256
  `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`;
- retail `nwtoolset.exe`, SHA-256
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`;
- the frozen Toolset RCDATA report, SHA-256
  `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`.

No xoreos or other GPL source was inspected or used.

The placed Creature reader `FUN_0053ab24` delegates to common Creature reader
`FUN_00532174`. That common reader uses native localized-string reader
`FUN_00aef678` plus complete-value copy `FUN_00acdefc` for exact labels
`FirstName`, `LastName`, and `Description`. The reciprocal placed writer
`FUN_0053ae80` delegates to common writer `FUN_0053521c`, which uses complete-
value copy `FUN_00acdde0` and native writer `FUN_00af0144` for all three
members. This establishes type-`4` GIT ownership and complete-value symmetry.

The generic reader consumes the stored count and every ordered identifier/text
tuple. The generic writer emits the retained `strRef`, complete native map,
and reconstructed identifiers. The generic localized editor setter
`FUN_00acdf2c` computes `language * 2 + gender`, forces English gender to zero,
and inserts or replaces that key; `FUN_00ace524` removes the same key. Dialog
commit `FUN_0070e8ec` selects insertion for nonempty text and removal for empty
text. The audited `FUN_0070e318` catalog proves only identifiers
`{0,2,3,4,5,6,7,8,9,10,11}`; those are therefore the only identifiers this
bounded editor may add.

The frozen `TDLGCREATUREEDIT` form independently binds separate localization
buttons to the Basic-tab First Name, Last Name, and Description controls. It
corroborates that their plain edits are presentations of complete localized
values, not `CExoString` persistence authority.

## Additive contract

For each admitted field, `creatureProperties` may carry a detached complete
target list beside its identifier-`0` scalar text:

```json
{
  "firstName": "Captain",
  "firstNameEntries": [
    { "languageId": 42, "text": "Retained source row" },
    { "languageId": 0, "text": "Captain" },
    { "languageId": 10, "text": "Straznik" }
  ]
}
```

`lastNameEntries` and `descriptionEntries` are the corresponding complete
targets. When an entry list is present, its identifier-`0` text, or `""` for
an empty list, must equal the scalar target. Raw source storage remains
immutable provenance under `source.creatureLocalizedStrings`.

The projected `localizedStrings` element additively accepts the exact six-key
shape:

```json
{
  "field": "FirstName",
  "expectedValue": "Guard",
  "value": "Captain",
  "expectedProfile": "multi_entry_inline_ascii",
  "expectedEntries": [{ "languageId": 0, "text": "Guard" }],
  "valueEntries": [{ "languageId": 0, "text": "Captain" }]
}
```

Profiles are `empty_inline_ascii`, `simple_inline_ascii`, and
`multi_entry_inline_ascii`, derived only from source entry count. The legacy
three-key scalar pair remains accepted only for the previously admitted empty
or one-entry identifier-`0` profile. A list mutation requires exact complete
source CAS and at least one text, member, or position change. Field tokens are
ordered `FirstName`, `LastName`, and `Description`.

## Preservation, diagnostics, and completion gates

Planning reparses the exact immutable Creature ordinal and compares the
complete expected list. The writer replaces exactly one existing native type-
`12` field with `strRef=0xffffffff` and the complete requested target in
requested order. Candidate and persisted readback compare that target list;
all unrelated GIT fields and all paired GIC and module IFO bytes remain
unchanged.

HTTP, scene, persisted-draft, history, facade, export, and dialog boundaries
must detach all three lists. Routine diagnostics may expose only family,
ordinal, field token, source/target profile, bounded counts, changed numeric
identifiers, stage, and stable reason code. Localized text, base64, hashes,
ResRefs, object keys, and host paths are excluded.

Required TDD covers admission and every rejection boundary, scalar backward
compatibility, complete-list projection, stale CAS, exact writer ordering,
candidate and persisted readback, GIC/IFO identity, frontend clone/history,
Apply/Cancel/reopen/OK/local Save, and visible add/edit/remove/reorder controls.
Production builds plus focused and full regression gates must pass.

## Implemented offline evidence

Capability revision `2026-09-13.184` implements the contract across the full
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

This source audit closes only the bounded inline printable-ASCII editor. Full
arbitrary code-page editing, TLK transitions, duplicate/nonzero-only recovery,
new unresolved language identifiers, fresh guarded browser Save/reopen,
Toolset Save/Build/reopen, and NWN localized display remain separate gates.
The former `creature_full_localized_string_editor_pending` blocker is therefore
narrowed to
`creature_tlk_codepage_and_unresolved_language_entry_authoring_pending`.
