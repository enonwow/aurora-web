# Existing Area Creature `Description` localized-string mutation audit v1

Date: 2026-09-02  
Status: source-closed; bounded offline implementation verified; live
certification and full multilingual editing pending

## Decision

Aurora Web may retain the complete exact native `Description : CExoLocString`
of one type-`4` Area GIT Creature and may replace it only inside the same
deliberately narrow profile already admitted for Creature `FirstName` and
`LastName`:

- the exact case-sensitive field exists once with GFF type `12`;
- `strRef` is exactly `0xffffffff`;
- the ordered entry list is empty or contains one non-empty entry;
- the sole entry has numeric language/gender identifier `0`;
- every source and target byte is printable ASCII `0x20..0x7e`;
- empty target text becomes an empty entry list;
- non-empty target text becomes one identifier-`0` entry;
- source and target are bounded to 4,096 bytes.

There is no trimming, normalization, fallback resolution, encoding conversion,
silent truncation, field creation, TLK replacement, or synthesis from display
metadata. Absent, TLK-backed, multilingual, duplicate, nonzero-identifier,
explicit-empty-entry, control-byte, non-ASCII, malformed, or over-budget
storage remains byte-preserved and `PRESERVE_ONLY`. The 4,096-byte ceiling is
an Aurora Web request and memory budget, not a claimed native Toolset maximum.

## Immutable primary authority

This audit used only read-only local authority:

- `C:/Projects/New Folder/export/decompiled_all.c`, 30,366,020 bytes, SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
- `C:/Projects/New Folder/export/functions.tsv`, SHA-256
  `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`;
- retail
  `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
  12,201,984 bytes, SHA-256
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`;
- `C:/Projects/nwn-last-city/Aurora/reverse/runs/NWTOOLSET_RCDATA_REFRESH_2026-05-20.json`,
  SHA-256
  `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`;
- the frozen 52,662-byte `TDLGCREATUREEDIT` `TPF0` form at RVA
  `0x00AE4698`, SHA-256
  `75e2dcfd5b0886dbb13bfb7cb32290ccce842cada84cfb806510abde52e7820e`.

No xoreos or other GPL source was inspected or used. No Docker command,
container, service, watcher, browser, Chrome, Toolset, NWN, capture, mutation
test, or sub-agent was started.

## Native storage and UI lineage

The complete common Creature reader `FUN_00532174`, beginning at decompiled
line `193907`, reads exact `Description` through native localized-string reader
`FUN_00aef678` at line `194228`. It copies the complete value with
`FUN_00acdefc` into Creature offset `+0x08` at line `194230`.

The reciprocal common Creature writer `FUN_0053521c`, beginning at line
`195081`, copies that same complete value with `FUN_00acdde0` and emits exact
`Description` through native localized-string writer `FUN_00af0144` at lines
`195153-195156`. The placed-Creature reader/writer
`FUN_0053ab24` / `FUN_0053ae80` delegate the type-`4` Area GIT payload to this
common lineage at lines `197530` / `197590`.

The frozen form independently contains the Basic-tab `Description` label,
plain edit control `eDescription`, and localized-string action
`bLocDescription`. The plain edit is a current presentation of the complete
localized value; it does not reduce the native field to `CExoString` and does
not authorize replacement of unsupported storage.

## Additive contract

Area detail extends the existing exact Creature localized-string provenance:

```json
{
  "creatureLocalizedStrings": {
    "firstName": { "present": true, "strRef": 4294967295, "entries": [] },
    "lastName": { "present": true, "strRef": 4294967295, "entries": [] },
    "description": {
      "present": true,
      "strRef": 4294967295,
      "entries": [{ "languageId": 0, "textBytesBase64": "RGVzY3JpcHRpb24=" }]
    }
  }
}
```

The backend parser always supplies exact presence-sensitive `Description`
storage for a parsed type-`4` Creature. The frontend boundary accepts the new
member additively so older saved local drafts containing only the already
published name pair remain readable. A fresh backend response carries all
three members. Each complete value retains unsigned `strRef`, ordered unsigned
identifiers, duplicates, empty byte strings, and canonical base64 bytes within
the shared localized-string provenance budgets.

A changed admitted value projects the third and final native-order member:

```json
{
  "kind": "creature",
  "sourceObjectId": "creature:0:nw_guard:source",
  "sourceIndex": 0,
  "localizedStrings": [
    {
      "field": "Description",
      "expectedValue": "Old description",
      "value": "New description"
    }
  ]
}
```

When siblings are changed, mandatory order is `FirstName`, `LastName`, then
`Description`. Each token occurs at most once, every member is an exact changed
expected/value pair, and the group may coexist with independently admitted
Creature property or collection mutations at the same ordinal.

## Mutation, transaction, and UI behavior

Planning reparses the exact type-`4` ordinal, validates complete source storage,
and rejects stale or unsupported profiles. The writer replaces only the one
existing selected type-`12` field in place, preserving label, type, field
order, all unrelated GIT fields, and the complete paired GIC unless an
independent Comment mutation is also present. Whole-candidate readback must
reproduce the exact target before revision-fenced ARE/GIT/GIC/IFO publication.

The frontend maps admitted inline bytes into the Basic-tab Description editor,
retains the detached immutable source storage, and exposes
`ACTIVE_NOW`/`PRESERVE_ONLY` explicitly. The textarea is disabled for an
unsupported source and applies the 4,096-byte product limit. Apply, OK, Cancel,
reopen, undo/redo cloning, and local Save retain source provenance independently
from the editable target.

Unknown keys, wrong order, duplicates, no-op pairs, wrong family or ordinal,
mutation plus deletion, stale storage, preservation drift, or readback mismatch
fails closed with `422 AREA_UPDATE_OBJECT_MUTATION_INVALID`. Diagnostics expose
only bounded contract/stage/outcome/reason/count data; text, base64, `strRef`,
object identity, hashes, paths, storage keys, and raw fields/bytes are excluded.

## Verification and remaining boundary

The change was introduced test-first: backend storage/mutation assertions
failed before the third member and its 4,096-byte budget were implemented.
Focused parser, projection, ordinal planning, writer, candidate compiler,
frontend boundary, mapper, saved-draft, provenance, dialog, and real Workspace
regression gates cover admission, malformed input, preservation, exact-order
CAS, GIT replacement, GIC preservation, Apply/OK/reopen, and local Save. The
bounded backend closure passes `2285/2285` assertions in seven suites, plus
`6/6` focused Creature parser assertions; the capability contract passes
`14/14`. The non-overlapping focused frontend groups pass `1099/1099`,
`88/88`, and `15/15` assertions. Both Nest and TypeScript/Vite production
builds pass. The full parser file still exposes two separately tracked Item
metadata fixture failures; neither failure crosses the Creature Description
path, and the focused Creature parser gate remains green.

This slice does not close the full Creature matrix. Full multilingual editing
for all three Creature localized strings remains
`creature_full_localized_string_editor_pending`. Body-part/color/wings/tail
authoring, the coupled `CRAdjust` calculator, arbitrary class spell graphs,
special abilities, and existing live browser/Toolset/NWN gates remain separate
work. Creature authoring therefore remains `PARTIAL/BLOCKED`.
