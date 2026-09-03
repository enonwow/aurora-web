# Existing Area Creature `Conversation` audit v1

Date: 2026-08-27  
Status: source-closed; offline implementation verified; live certification pending

## Scope and decision

Aurora Web may replace the exact existing `Conversation : ResRef` of one
retained type-`4` Area GIT Creature. Empty ResRef is a valid present value and
remains distinct from an absent field. The editable target is either empty or
one canonical lowercase `[a-z0-9_]{1,16}` ResRef. It is never trimmed,
case-folded, truncated, or synthesized by the web boundary.

This slice does not create or edit a DLG resource or conversation graph. It
does not admit `Interruptable`, statistics, faction, appearance, portrait,
scripts, variables, Description, or any other Creature property. The visible
`No Interrupt` control remains `PRESERVE_ONLY` until its Toolset UI-to-native
polarity is independently source-closed.

## Primary Aurora authority

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

## Recovered native lineage

The placed-Creature reader `FUN_0053ab24`, beginning at decompiled line
`197397`, calls the complete Creature property reader `FUN_00532174` at line
`197530`. That reader begins at line `193907` and reads exact label
`Conversation` through `FUN_00aeef98` at lines `194241..194243` into the
17-byte CResRef member at offset `0x89`.

The symmetric placed-Creature writer `FUN_0053ae80`, beginning at line
`197558`, calls complete Creature property writer `FUN_0053521c` at line
`197590`. That writer begins at line `195081` and writes the same member through
`FUN_00aeffa4` with exact label `Conversation` at line `195158`.

The helper implementations close two additional facts:

1. `FUN_00aeef98`, beginning at line `968044`, accepts native GFF type `0x0b`
   (`ResRef`) and copies its length-prefixed payload; missing or wrongly typed
   storage takes the supplied default path.
2. `FUN_00aeffa4`, beginning at line `968883`, creates/uses type `0x0b`, writes
   the length-prefixed payload, and converts every ASCII `A..Z` byte to
   lowercase. Aurora Web therefore requires an already canonical lowercase
   target and does not perform an implicit case conversion at its boundary.

The exact accepted `nw_chicken.UTC` construction fixture contains
`Conversation : ResRef = ""`, and its independently bound retail type-`4`
instance mapping retains that field. This establishes a valid present-empty
source without treating absence as empty.

The Toolset `TDLGCREATUREEDIT` form at RVA `0x00AE4698` contains the Basic-tab
Conversation selector and browse action. The adjacent `xbNoInterrupt` control
is useful surface evidence only; this audit deliberately does not infer its
polarity from its caption.

## Frozen additive contract

Area detail may add presence-sensitive exact storage:

```json
{
  "creatureConversation": {
    "present": true,
    "value": ""
  }
}
```

Absence is `{ "present": false }`; it never authorizes materializing a new
native field. The frontend retains a detached immutable copy as
`source.creatureConversation` and derives the Conversation control state from
that value plus exact `aurora_git`, `sourceKind=creature`, and zero-based
`sourceIndex` provenance.

A changed admitted target projects exactly:

```json
{
  "kind": "creature",
  "sourceObjectId": "creature:0:nw_chicken:...",
  "sourceIndex": 0,
  "conversation": {
    "expectedResRef": "",
    "resRef": "chicken_dialog"
  }
}
```

The source value is either empty or an exact 1..16-byte ASCII alphanumeric or
underscore ResRef; uppercase source bytes remain admissible immutable
provenance so a pre-existing noncanonical field can still be compared and
preserved. The target must be empty or canonical lowercase. The pair must be
complete, contain no unknown keys, and change exactly.

## Writer, transaction, and diagnosability requirements

Planning resolves the immutable Creature ordinal, requires exactly one
case-sensitive `Conversation : ResRef`, and compares the exact source value.
The writer replaces only that field while preserving field order, every
unrelated GIT field, and all paired GIC bytes. Independent whole-candidate
readback precedes the existing revision-fenced, idempotent, journaled
ARE/GIT/GIC/IFO publication.

The mutation may coexist with independently valid Creature Tag, name,
`ItemList`, and `Equip_ItemList` changes on the same ordinal. Missing,
duplicate, aliased, wrong-case, wrongly typed, over-budget, stale, unchanged,
noncanonical-target, deletion-colliding, preservation-drifting, or readback-
drifting state fails closed with `422 AREA_UPDATE_OBJECT_MUTATION_INVALID`.

Diagnostics expose only bounded family, ordinal, field token, counts, stage,
duration, and stable reason code. Conversation contents, raw fields, bytes,
hashes, resource keys, storage keys, and host paths remain redacted. The
extension adds no endpoint, binary body, pagination, streaming, or chunking
and retains the existing Area Update budgets, authorization, fencing,
idempotency, recovery, and receipt contracts.

## Completion boundary

Offline completion requires domain, strict parser provenance, repository
clone/fingerprint, frontend HTTP and scene mapping, immutable clone,
saved-workspace validation, control-state derivation, reducer/materializer,
projector, independent planner, writer, whole-candidate readback, combined
mutation, round-trip, integration, regression, capability-catalog, and build
coverage.

Fresh browser Save/reopen and exact-candidate Toolset Save/Build/reopen remain
separate release gates. Conversation selection and DLG runtime behavior in NWN
also remain unproved. `Interruptable` stays preserve-only until its own
source-closed UI polarity contract exists.

## Offline verification closure

On 2026-08-27 the complete bounded implementation path passed:

1. nine backend unit suites with `1871/1871` tests;
2. the Area Update atomic-publication integration suite with `45/45` tests;
3. ten frontend unit/regression files with `479/479` tests, including
   Apply/OK/Cancel/reopen and local Ctrl+S readback while immutable
   `source.creatureConversation` remains unchanged; and
4. both backend and frontend production builds.

The frontend build emitted only its existing large-chunk advisory. No Docker
engine or container command, managed service, watcher, browser, capture,
Chrome, Toolset, NWN, or mutation-test process was started for this closure.
Capability catalog revision `2026-08-27.66` binds the implementation tests and
this authority record while retaining explicit browser, Toolset, and NWN
blockers. These offline results do not satisfy those live release gates and do
not prove DLG graph authoring or Creature `Interruptable` semantics.
