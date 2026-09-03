# Existing Area Trigger `LocalizedName` audit v1

Date: 2026-09-02  
Status: source-closed; offline implementation verified; fresh browser,
Toolset, and NWN proof pending

## Decision

Aurora Web may retain the complete exact native `LocalizedName` storage of one
existing type-`1` Area GIT Trigger and replace it only inside this deterministic
inline localized-string profile:

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
Toolset form does not serialize `MaxLength` for its Trigger display-name edit,
so the product budget is not represented as a native limit.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| frozen RCDATA report | `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa` |

The RCDATA report identifies `TDLGTRIGGEREDIT` as the 13,240-byte `TPF0` form
at RVA `0x00BB62F8`. No xoreos or other GPL source was inspected or used.

## Native storage closure

Common Trigger reader `FUN_00656720` invokes native localized-string reader
`FUN_00aef678` with exact label `LocalizedName` at decompiled line `345855`,
then copies the complete value into the common Trigger object through
`FUN_00acdefc` at line `345857`. Reciprocal common writer `FUN_0065752c`
selects exact `LocalizedName` at line `346116`, copies the complete stored value
through `FUN_00acdde0`, and emits it through native localized-string writer
`FUN_00af0144` at line `346118`.

The helper lineage reads and writes native type `12`, unsigned base `strRef`,
ordered numeric entry identifiers, byte lengths, and byte strings. Tag,
TemplateResRef, faction, cursor, key/link fields, trap state, scripts,
variables, position, orientation, and Geometry use independent members and
calls. Placed Trigger writer `FUN_00657de0` delegates the common type-`1`
payload at line `346628` before its separate placement and paired-GIC lanes.

The production-adapter `newgeneric.UTT` readback contains
`LocalizedName.strRef = 14759`. It is useful negative authority: this
TLK-backed retail name remains exact and `PRESERVE_ONLY`; a resolved display
string must never be projected back as inline storage. The accepted native
type-`1` GIT readback proves that placed Trigger records retain exact
`LocalizedName` independently from `TemplateResRef`, Tag, Geometry, and GIC.

## Toolset Properties closure

Frozen `TDLGTRIGGEREDIT` contains Basic-tab label `Display Name`, edit
`eDisplayName`, and adjacent localization button `bDisplayName`. The following
Tag edit serializes `MaxLength`; `eDisplayName` does not. This is consistent
with complete `CExoLocString` presentation and does not establish a native
plain-string length contract.

The control evidence and independent common reader/writer member close the
bounded storage contract without claiming localization-dialog, TLK-authoring,
instance-propagation, link, trap, script, variable, transition, or runtime
activation semantics.

## Frozen additive contract

Area detail may expose complete presence-sensitive storage:

```json
{
  "triggerLocalizedName": {
    "present": true,
    "strRef": 4294967295,
    "entries": [
      { "languageId": 0, "textBytesBase64": "R2F0ZSBUcmlnZ2Vy" }
    ]
  }
}
```

The storage keeps unsigned `strRef`, ordered identifiers, duplicates, empty
byte strings, and canonical base64 within the existing 64-entry, 16,384-byte
per-entry, and 65,536-byte aggregate provenance budgets. Invalid or excessive
storage is omitted fail-closed rather than normalized.

The frontend deep-copies this storage under immutable
`source.triggerLocalizedNameStorage`. Only an admitted inline profile may
author a separate `triggerLocalizedName` target. A changed retained Trigger
adds one pair to the existing property mutation:

```json
{
  "kind": "trigger",
  "sourceObjectId": "trigger:0:newgeneric:source",
  "sourceIndex": 0,
  "localizedName": {
    "expectedValue": "Gate Trigger",
    "value": "Inner Gate Trigger"
  }
}
```

Expected and target values are exact printable ASCII strings of at most 256
bytes and must differ. Planning reparses one canonical type-`1` Trigger,
requires exactly one `LocalizedName : CExoLocString`, validates the complete
source storage against the admitted expected text, and rejects deletion
collision or duplicate mutation. Writing replaces only that existing native
value in place and preserves label and field order. Exact candidate and
persisted readback are required before revision-fenced publication.

## Diagnosability and completion boundary

The additive low-cardinality event is
`area_trigger_localized_name_cas.v1`. It may expose only contract revision,
Trigger family, bounded stage, outcome, stable result code,
changed-field count, and duration. Names, base64, raw bytes, TLK text, object
IDs, ordinals, hashes, source keys, paths, credentials, and host paths are
prohibited from metric labels and routine logs.

Offline acceptance requires strict domain/parser tests, full storage transport
and cloning, detached source/target state, preserve-only presentation,
Apply/Cancel/reopen/OK/local Save, projector/planner/writer/candidate readback,
combination with other Trigger mutations, atomic publication, regression,
capability-catalog coverage, and both production builds.

The backend now carries complete exact storage through Area parsing, snapshot
cloning, processing identity, detached expected/target projection,
immutable-ordinal CAS planning, field-only GFF replacement, candidate
readback, persisted readback, and revision-fenced atomic publication. The
frontend carries a detached deep copy through HTTP, scene, workspace, history,
and clone boundaries; presents Trigger Name as `ACTIVE_NOW` only for the
admitted inline profile; and applies it without changing renderer `resRef`.
Reset, Apply, Cancel, reopen, OK, and local Save preserve immutable source
provenance.

Resource-safe verification completed with no Docker, service, browser, or
native runtime process:

- five focused backend suites pass `228/228` tests;
- the Area Update atomic-publication integration passes `88/88` tests and
  publishes Trigger Tag plus LocalizedName in one companion-preserving
  transaction;
- nine focused frontend files pass `1,228/1,228` tests, including the visible
  Trigger Properties Save/reopen regression;
- backend and frontend production builds pass.

Capability catalog revision is `2026-09-02.175`. Wider repository gates and
fresh guarded runtime evidence remain independent program requirements.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed localized-string readback, and NWN name presentation remain
independent release gates. This audit does not certify full Trigger, Area,
tile, PathConnect, or 99-tileset-matrix completion.

## Resource/process statement

This source audit used immutable decompilation exports, read-only installed PE
and RCDATA evidence, and retained readback evidence. No Docker command,
container, service, watcher, browser, Chrome, capture, Toolset/NWN process,
mutation test, sub-agent, xoreos source, or other GPL source was used.

## Immutable source binding

The completed offline slice is bound to runtime profile
`tile-add-connect-runtime-v29-trigger-localized-name-bound-2026-09-02`, built
at `2026-09-02T15:48:48.587Z`. It records 1,828 files, 30,958,350 bytes,
runtime digest
`271a8496398aedbd92dbfb987c1b3147976f68aa2fe3cf4fbfa3d9ddb3ed6911`,
profile SHA-256
`26074783ac4cf4f1f0e5378733ae53946e6cfd9c28137171fae6dfd545c837f0`,
and source-manifest SHA-256
`46ff547811bd118771eadb48c6f2de7ec18f32a3ada51749400b3bef510f80d9`.

Replacement matrix plan
`ca4a8178e85c04ebf939607ec0ff178513327fb8ed2558dc64b1052c16ced97d`
is `ready` with verified runtime-source identity and explicitly replaces v28.
It preserves the 99-tileset, 53,700-row, 3,380-chunk scope and remains at
zero captures and zero accepted PathConnect rows; it is a reproducibility
binding, not runtime completion evidence.
