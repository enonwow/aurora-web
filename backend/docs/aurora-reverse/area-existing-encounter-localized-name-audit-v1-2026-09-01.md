# Existing Area Encounter `LocalizedName` audit v1

Date: 2026-09-01  
Status: source-closed; offline implementation and focused verification complete;
live release proof pending

## Decision

Aurora Web may retain the complete exact native `LocalizedName` storage of one
existing type-`7` Area GIT Encounter and replace it only inside the same
deterministic inline localized-string profile already admitted for retained
Creature, Placeable, and Item names:

- the exact case-sensitive `LocalizedName` field exists once as native
  `CExoLocString` (GFF type `12`);
- `strRef` is exactly unsigned `0xffffffff`;
- the ordered entry list is empty or contains exactly one non-empty entry;
- the sole entry has numeric language/gender identifier `0`;
- source and target bytes are printable ASCII `0x20..0x7e`;
- empty target text serializes as an empty entry list;
- non-empty target text serializes as one identifier-`0` entry;
- source and target are bounded to 256 bytes.

There is no trimming, Unicode normalization, case folding, fallback lookup,
encoding conversion, silent truncation, field creation, or TLK replacement.
Absent, duplicate, aliased, wrong-case-label, wrong-type, TLK-backed,
multilingual, nonzero-identifier, duplicate-entry, explicit empty-entry,
control-byte, non-ASCII, malformed, or over-budget storage is
`PRESERVE_ONLY`.

The 256-byte ceiling is an Aurora Web request and memory budget. The inspected
Toolset form does not serialize `MaxLength` for its Encounter name edit, so the
product budget is not represented as a native limit.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| installed `TDLGENCOUNTEREDIT` RCDATA | `291d98dc67af0aa0e32925ecf205e9dbe2aabadfffb43b0f9941def9308d96ee` |

No xoreos or other GPL source was inspected or used.

## Native storage closure

Common Encounter reader `FUN_0055d470` reads exact `LocalizedName` through
native localized-string helper `FUN_00aef678` into the Encounter's complete
localized value at decompiled line `215183`. Reciprocal common writer
`FUN_0055dbf8` copies the same value and emits exact `LocalizedName` through
`FUN_00af0144` at lines `215393..215395`. The helper family reads and writes
native type `12`, base `strRef`, ordered numeric entry identifiers, byte
lengths, and byte strings; it is the same complete storage path independently
audited for retained Creature and Placeable localized strings.

Placed-Encounter writer `FUN_0055e71c` delegates the type-`7` GIT payload to
the common writer. Geometry, SpawnPointList, optional paired GIC Comment, ARE,
IFO, and every unrelated field therefore remain separate preservation lanes.

The accepted immutable `x2_gnoll001.UTE` contains
`LocalizedName = { strRef: 91345, entries: [] }`. It is useful negative
authority: the TLK-backed retail value remains exact and `PRESERVE_ONLY`; a
resolved display string must never be projected back as inline storage.

## Toolset Properties closure

The installed 9,574-byte `TDLGENCOUNTEREDIT` `TPF0` form contains a Basic-tab
`Name` label, `eLocName : TEdit`, and adjacent `bLocName : TButton` with
caption `...`. The `eLocName` component occupies relative bytes
`0x0a30..0x0a80`; its serialized properties are `Tag`, position/size,
`HelpContext`, and `TabOrder`, with no `MaxLength`.

Encounter Properties load `FUN_00498b48` copies the complete Encounter
localized value into the dialog-owned localized state at lines
`111060..111062`. Save `FUN_00498278` copies the complete dialog-owned value
back to the Encounter at line `110745` before it reads the plain Tag and
Template controls. The adjacent localization button and complete-value copies
prove that visible text is presentation over `CExoLocString`, not an
independent `CExoString` or TLK rewrite contract.

## Frozen additive contract

Area detail may expose complete presence-sensitive storage:

```json
{
  "encounterLocalizedName": {
    "present": true,
    "strRef": 4294967295,
    "entries": [
      { "languageId": 0, "textBytesBase64": "R25vbGwgQW1idXNo" }
    ]
  }
}
```

The storage keeps unsigned `strRef`, ordered identifiers, duplicates, empty
byte strings, and canonical base64 within the existing 64-entry, 16,384-byte
per-entry, and 65,536-byte aggregate provenance budgets. Invalid or excessive
storage is omitted fail-closed rather than normalized.

The frontend deep-copies this storage under immutable
`source.encounterLocalizedNameStorage`. Only an admitted inline profile may
author a separate `encounterLocalizedName` target. A changed retained
Encounter adds one pair to the existing property mutation:

```json
{
  "kind": "encounter",
  "sourceObjectId": "encounter:0:x2_custom:source",
  "sourceIndex": 0,
  "localizedName": {
    "expectedValue": "Gnoll Ambush",
    "value": "Night Ambush"
  }
}
```

Expected and target values are exact printable ASCII strings of at most 256
bytes and must differ. Planning reparses one canonical type-`7` Encounter,
requires exactly one `LocalizedName : CExoLocString`, validates the complete
source storage against the admitted expected text, and rejects deletion
collision or duplicate mutation. Writing replaces only that existing native
value in place and preserves label and field order. Exact candidate and
persisted readback are required before revision-fenced publication.

## Diagnosability and completion boundary

The additive low-cardinality event is
`area_encounter_localized_name_cas.v1`. It may expose only contract revision,
Encounter family, bounded stage, outcome, stable result code, changed-field
count, and duration. Names, base64, raw bytes, TLK text, object IDs, ordinals,
hashes, source keys, paths, credentials, and host paths are prohibited from
metric labels and routine logs.

Offline acceptance requires strict domain/parser tests, full storage transport
and cloning, detached source/target state, preserve-only presentation,
Apply/Cancel/reopen/OK/local Save, projector/planner/writer/candidate readback,
combination with other Encounter mutations, atomic publication, regression,
capability-catalog coverage, and both production builds.

## Offline implementation and verification

The backend now carries the complete exact storage through Area parsing,
snapshot cloning, processing identity, draft projection, ordinal-bound CAS
planning, field-only GFF replacement, candidate readback, persisted readback,
and revision-fenced atomic publication. The frontend carries a detached deep
copy through HTTP, scene, workspace, history, and clone boundaries; presents
the Basic-tab Name control as `ACTIVE_NOW` only for the admitted inline
profile; and exports a changed target only after strict validation. Reset,
Apply, Cancel, reopen, OK, and local Save preserve immutable source provenance.

Resource-safe verification completed with no Docker, service, browser, or
native runtime process:

- seven focused backend suites pass `2213/2213` tests;
- the Area Update atomic-publication integration passes `75/75` tests;
- nine focused frontend files pass `1063/1063` tests;
- the dedicated Encounter Save/reopen regression passes `1/1`;
- the complete frontend regression-smoke gate passes `43/43` files and
  `134/134` tests;
- backend and frontend production builds pass.

The broader bounded backend unit gate is not green: `436/447` suites and
`7602/7626` tests pass. Its `11` failing suites are outside this
LocalizedName slice and cover Catalog animation expectations, Area Item
`script.onused`, generic template metadata, HTTP health/VFX revision,
placeable-lighting proof fixtures, Store metadata aggregation, VFX capture
manifest wording, Creature WalkRate catalog binding, bootstrap adapter mocks,
and two general Area GFF ground-item metadata round trips. No failing assertion
targets Encounter `LocalizedName`; this audit records the wider gate as an
independent repository blocker rather than hiding or reclassifying it.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed localized-string readback, and NWN name presentation remain
independent release gates. This audit does not certify full Encounter, Area,
tile, or PathConnect completion.

## Resource/process statement

This source audit used immutable decompilation exports, read-only installed PE
and RCDATA bytes, and retained readback evidence. No Docker command, container,
service, watcher, browser, Chrome, capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used. No installed skill
matches this offline static-decompilation and TypeScript contract slice.
