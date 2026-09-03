# Existing Area Creature `Tag` audit v1

Date: 2026-08-26  
Status: source-closed; offline implementation verified; browser and native recertification pending

## Scope and decision

Aurora Web may replace the exact existing `Tag : CExoString` of one retained
type-`4` Area GIT Creature. The admitted value is a JavaScript string of at
most 32 UTF-16 code units without U+0000. Empty and whitespace-containing
values are not normalized or guessed. Missing, duplicate, aliased,
wrong-case, wrongly typed, over-budget, or otherwise ambiguous native storage
is preserve-only and cannot authorize a write.

This slice does not admit `TemplateResRef`, `FirstName`, `LastName`,
`Description`, conversation, faction, statistics, scripts, variables, or any
other Creature property. It may be combined atomically with an independently
valid retained `ItemList` and/or `Equip_ItemList` mutation for the same
Creature.

## Primary Aurora authority

The primary decompilation source is
`C:/Projects/New Folder/export/decompiled_all.c`, size `30,366,020` bytes,
SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
The installed Toolset is
`C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
size `12,201,984` bytes, SHA-256
`4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`.
No xoreos or other GPL source was inspected or used.

The recovered storage lineage is:

1. Area Creature reader `FUN_0053ab24` calls the complete Creature property
   reader `FUN_00532174` at decompiled line `197530`.
2. `FUN_00532174`, beginning at line `193907`, reads the exact label pointer
   `DAT_00bfdfa9` through CExoString helper `FUN_00aef090` into the Creature
   Tag member at lines `194173..194174`.
3. Area Creature writer `FUN_0053ae80` calls complete Creature property writer
   `FUN_0053521c` at decompiled line `197590`.
4. `FUN_0053521c`, beginning at line `195081`, writes the same member through
   CExoString helper `FUN_00af0084` and exact label pointer `DAT_00bfe4ba` at
   line `195157`.
5. Direct read-only PE mapping of those two virtual addresses against image
   base `0x00400000` resolves bytes `54 61 67 00` at both locations, proving
   exact case-sensitive label `Tag` independently of Ghidra's short-string
   symbol naming.
6. The retail `nw_chicken.UTC` and its accepted type-`4` GIT construction
   profile contain exactly `Tag : CExoString`; the bounded compiler already
   verifies this field and its type during complete source/candidate readback.

The immutable RCDATA report
`C:/Projects/nwn-last-city/Aurora/reverse/runs/NWTOOLSET_RCDATA_REFRESH_2026-05-20.json`,
SHA-256
`3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`,
binds `TDLGCREATUREEDIT` at RVA `0x00AE4698`. Its binary form contains the
Basic-tab `eTag` edit control and `eTagChange` handler. Direct inspection of
the same form bytes at relative offset `0x1BD0` decodes
`MaxLength` as Delphi integer value `0x20`, establishing the Toolset's
32-character edit limit.

## Frozen mutation contract

Area detail adds presence-sensitive exact provenance:

```json
{
  "creatureTag": {
    "present": true,
    "value": "NW_CHICKEN"
  }
}
```

Absence is represented as `{ "present": false }`; it is not equivalent to an
empty string and does not authorize materializing a new native field. The
frontend retains this detached immutable value as `source.creatureTag`.

A changed target projects exactly:

```json
{
  "kind": "creature",
  "sourceObjectId": "creature:0:nw_chicken:...",
  "sourceIndex": 0,
  "tag": {
    "expectedValue": "NW_CHICKEN",
    "value": "CHICKEN_GUARD"
  }
}
```

Both values must be strings of at most 32 UTF-16 code units without U+0000,
must differ exactly, and permit no unknown keys. The backend resolves the
immutable Creature ordinal, reparses exactly one canonical `Tag : CExoString`,
compares the complete expected value, replaces only that field value, and
preserves field order, every unrelated GIT field, and all GIC bytes. The
independent whole-candidate readback and existing revision-fenced atomic
ARE/GIT/GIC/IFO publication remain mandatory.

## Diagnosability and failure behavior

Malformed provenance, target values, unknown keys, stale comparison,
unchanged pairs, deletion collision, preservation drift, or readback drift
fails closed with `422 AREA_UPDATE_OBJECT_MUTATION_INVALID`. Existing
diagnostics remain bounded to family, ordinal, stage, counts, duration, and a
stable result code. They do not expose Tag content, raw fields, storage keys,
host paths, or resource bytes.

## Completion boundary

Implementation requires focused domain, parser, projection, planner, writer,
candidate-readback, combined-mutation, frontend provenance/dialog/workspace,
draft-boundary, and regression coverage. Browser Save/reopen, exact-candidate
Toolset Save/Build/reopen, and NWN runtime Tag behavior remain separate gates.
All other Creature identity and property controls stay preserve-only until
their own Aurora-first contracts are closed.

The offline implementation gate completed on 2026-08-26. It covers the exact
backend and frontend path above, a 31-assertion atomic-publication integration
suite, a 237-assertion focused frontend group including Save/reopen regression,
the Area capability catalog, and both production builds. This does not promote
the browser, Toolset, or NWN gates; their evidence remains pending.
