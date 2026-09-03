# Existing Area Name bounded entry-add audit v1

Date: 2026-08-25  
Status: bounded Western-language catalog, additive contract, and offline
implementation verified; runtime proof pending

## Decision

Aurora Web may add or reinsert an inline printable-ASCII Area
`Name : CExoLocString` entry only for one of eleven source-closed numeric
language/gender identifiers:

| Entry identifier | Language | Gender |
|---:|---|---|
| 0 | English | Male/default; native gender is forced to zero |
| 2 | French | Male |
| 3 | French | Female |
| 4 | German | Male |
| 5 | German | Female |
| 6 | Italian | Male |
| 7 | Italian | Female |
| 8 | Spanish | Male |
| 9 | Spanish | Female |
| 10 | Polish | Male |
| 11 | Polish | Female |

Every other absent identifier remains forbidden. Already-existing identifiers
outside this bounded catalog may still be retained, edited, reordered, or
removed under the preceding source-bound contracts, but they are never
synthesized. This closes a safe bounded Add/Reinsert slice without claiming a
complete catalog for the four unresolved rows in the native ten-row grid.

## Primary evidence

The inspected primary artifacts are:

- `C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
- `C:/Projects/New Folder/export/functions.tsv`, SHA-256
  `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`;
- retail `nwtoolset.exe`, SHA-256
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`;
- retail English `dialog.tlk`, SHA-256
  `1d6da70e0659e411012b44f956a093cc8fb61aed3b9355198ba42eb17e0649c9`;
- `C:/Projects/nwn-last-city/Aurora/reverse/reverse/nwtoolset_rcdata_report.json`,
  SHA-256
  `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`.

No GPL source was inspected or used.

## Native catalog boundary

`FUN_0070e318` at `decompiled_all.c:451297-451363` constructs the
`TDLGLOCSTRING` grid. Its static table begins at virtual address `0x00b9d1cc`
and contains the following six contiguous language/TLK pairs in the exact
retail image:

```text
language 0 -> strref 58268 -> English
language 1 -> strref 58269 -> French
language 2 -> strref 58270 -> German
language 3 -> strref 58346 -> Italian
language 4 -> strref 58347 -> Spanish
language 5 -> strref  3094 -> Polish
```

The labels above are independently read from the pinned retail English
`dialog.tlk`. The form translation table also resolves strrefs `156` and `157`
to `Male` and `Female`. `FUN_0070ec60` at `451637-451685` reads the selected
language row and gender control.

The constructor loop is ten rows long, but the next four static pairs in this
Western retail executable do not decode as valid language/TLK pairs. They are
therefore explicitly unresolved and excluded. Common external enum memories
or another engine implementation are not used to fill this gap.

## Identifier construction and insertion

`FUN_00acdf2c` at `decompiled_all.c:948002-948051` inserts or replaces an entry
using exactly:

```text
language * 2 + (gender & 0xff)
```

When language is zero, the function first forces gender to zero. The removal
path `FUN_00ace524` at `948295-948302` applies the same rule. The native String
Edit commit `FUN_0070e8ec` at `451508-451632` calls the insertion path for
nonempty text and the removal path for empty text.

Consequently the six verified language rows yield exactly identifiers
`0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11`. Identifier `1` is not reachable because
English gender is forced to zero. Printable ASCII remains the deterministic
encoding boundary across the Toolset's active ANSI code pages.

## Frozen additive contract

The existing complete `expectedEntries`/`valueEntries` CAS shape is unchanged.
The complete target must retain identifier `0`, contain unique identifiers,
and may combine text edits, removals, reordering, and additions. Every target
identifier must be either present in the immutable source list or a member of
the exact bounded set `{0,2,3,4,5,6,7,8,9,10,11}`. At least one complete-list
member, position, or text must change.

The UI may offer only missing bounded catalog entries. A newly added entry
requires a nonempty printable-ASCII value and is inserted at an explicit
target position. Existing unknown numeric entries stay numeric and
source-bound; the UI must not assign them a guessed language label.

The existing endpoint, API major version, request budget, authorization,
idempotency, journal, atomic publication, and recovery contracts remain
unchanged. Candidate and persisted readback compare the exact complete target
list and derived storage profile. Routine diagnostics may expose the bounded
catalog revision, counts, and numeric added identifiers, but never localized
text, raw bytes, ResRefs, hashes, or host paths.

## Completion boundary

Offline closure requires domain/schema, projector, writer, independent
candidate and persisted readback, transaction transfer, frontend facade,
dialog, history/export, regression, immutable catalog, and production-build
evidence. The four unresolved grid rows, TLK-backed mutation, non-ASCII
encoding, browser Save/reopen, Toolset Save/Build/reopen, and NWN localized
display remain separate gates.

The `aurora-toolset-operate` and `aurora-toolset-prove` preflight found no
versioned public profile for a new String Edit modal observation, so no live
Toolset process or module action was started. Native observation for this slice
is `missing`, not inferred from static evidence.

## Offline implementation verification

Immutable catalog `aurora-area-name-language-catalog.v1` is mirrored at the
backend and frontend domain boundaries. The complete-list validator admits an
absent target identifier only when it occurs in that catalog and its new text
is nonempty printable ASCII. Existing unknown identifiers remain editable,
reorderable, removable, and retainable only when present in immutable source
provenance.

Backend schema, draft projection, preserve-first GFF writing, independent
candidate validation, transaction transfer, and persisted semantic readback
carry the exact target list and derived profile. Frontend scene/draft/facade,
HTTP export, and Area Properties carry the same detached list. The dialog
offers only missing catalog entries, requires valid text before Add, appends at
the explicit requested target position, and returns an entry to the selector
after explicit removal.

Accepted bounded gates are 9 backend suites with 621 assertions, 9 frontend
suites with 195 assertions, 12 immutable capability-catalog assertions, the
dedicated Add/Reinsert and reorder regression smokes, and passing backend and
frontend production builds. The frontend build emits only the pre-existing
chunk-size advisory. No managed service, browser, Toolset, or NWN process was
started for this offline checkpoint.
