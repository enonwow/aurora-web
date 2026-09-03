# Existing Area Encounter `Tag` audit v1

Date: 2026-08-31  
Status: source-closed; offline implementation verified; live proof pending

## Decision

Aurora Web may replace the exact existing `Tag : CExoString` of one retained
type-`7` Area GIT Encounter. The admitted value is a JavaScript string of at
most 32 UTF-16 code units without U+0000. Empty strings and whitespace remain
exact values; they are never trimmed, normalized, case-folded, or synthesized.
Missing, duplicate, aliased, wrong-case, wrong-type, over-budget, or otherwise
ambiguous storage is `PRESERVE_ONLY` and cannot authorize adding a field.

This exact storage compare-and-swap lane does not activate localized name,
template identity, activity/difficulty/spawn controls, faction, scripts,
variables, `CreatureList`, `SpawnPointList`, runtime spawning, or arbitrary
Encounter-template Create. It may coexist atomically with independently
admitted retained Encounter position and polygon mutations for the same
immutable ordinal.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| frozen Toolset RCDATA report | `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa` |

No xoreos or other GPL source was inspected or used.

## Native GFF storage closure

Common Encounter reader `FUN_0055d470`, beginning at decompiled line
`215106`, reads the Encounter string member at `param_1 + 0x0d` through
CExoString helper `FUN_00aef090` and label pointer `0x00c14c7e` at line
`215137`. Direct read-only PE mapping resolves bytes `54 61 67 00`, proving
exact case-sensitive label `Tag`.

The reciprocal common Encounter writer `FUN_0055dbf8`, beginning at line
`215380`, writes the same member through CExoString helper `FUN_00af0084` and
label pointer `0x00c14d79` at line `215392`. Direct PE mapping resolves the
same bytes. Placed-Encounter writer `FUN_0055e71c` delegates the GIT payload to
this common writer at line `215834`; it serializes origin, type-`1` Geometry,
type-`2` SpawnPointList, and optional paired GIC Comment in distinct lanes.
An Encounter Tag-only mutation therefore changes GIT only and must retain the
complete GIC exactly.

The immutable `x2_gnoll001.UTE` and accepted native type-`7` Encounter GIT
lineage independently contain exact `Tag : CExoString = "X2_GNOLL001"`.
Their identities and typed readbacks remain frozen by
`area-encounter-construction-audit-v1-2026-08-13.md`.

## Toolset field boundary and coupling closure

The installed `TDLGENCOUNTEREDIT` RCDATA is a 9,574-byte `TPF0` resource at RVA
`0x00af8314`, SHA-256
`291d98dc67af0aa0e32925ecf205e9dbe2aabadfffb43b0f9941def9308d96ee`.
Its `eTag : TEdit` begins at relative offset `0x092c`; its serialized
`MaxLength` property at `0x0966` is Delphi integer `0x20`. The form binds
`eTagChange` at relative offset `0x0987`.

Read-only PE inspection locates Pascal class `TdlgEncounterEdit`, VMT
`0x00bcd764`, and its 28-entry published method table at `0x00bcde86`. Entry
`20` maps `eTagChange` to stub `0x0049a028`. The complete 11-byte stub is
`b8 70 ef d3 00 e8 1e ab 15 00 c3`: it loads the shared validation owner,
calls `FUN_005f4b50` at `0x005f4b50`, and returns. It does not call the
Encounter reader/writer, spawn/difficulty/faction/script logic, CR
recalculation, or another property setter. No coupled persisted mutation is
required for this bounded exact storage lane.

## Frozen additive contract

Area detail may expose exact presence-sensitive provenance:

```json
{
  "encounterTag": {
    "present": true,
    "value": "X2_GNOLL001"
  }
}
```

Absence is `{ "present": false }`; it is distinct from a physically present
empty string and remains preserve-only. The frontend detaches this object
under immutable `source.encounterTag`. Generic metadata, display labels,
object IDs, and template identity are never write authority.

A changed retained Encounter adds one member to the existing Area Update
object-property collection:

```json
{
  "kind": "encounter",
  "sourceObjectId": "encounter:0:x2_gnoll001:source",
  "sourceIndex": 0,
  "tag": {
    "expectedValue": "X2_GNOLL001",
    "value": "  GNOLL_AMBUSH  "
  }
}
```

Both values must satisfy the exact boundary, differ by UTF-16 code unit, and
admit no unknown keys. Planning reparses one canonical type-`7` Encounter,
requires exactly one `Tag : CExoString`, performs complete expected-value CAS,
and rejects deletion collision or duplicate mutation. Writing replaces only
the existing field value in place and preserves field order, all unrelated
GIT members, the complete Geometry and SpawnPointList, every GIC/ARE/IFO byte,
and all resource ordering. Candidate and persisted readback must reproduce the
exact target before the revision-fenced transaction may publish.

## Diagnostics and completion boundary

The additive low-cardinality event is `area_encounter_tag_cas.v1`. It reports
only contract revision, Encounter family, bounded stage, outcome, stable
result code, changed-field count, and duration. Tag contents, object IDs,
ordinals, hashes, source keys, paths, raw fields/bytes, credentials, and host
paths are prohibited from metric labels and routine logs.

Offline acceptance requires strict domain/parser tests, presence-sensitive API
transport, detached scene/workspace/clone provenance, guarded reducer and
materializer behavior, exact projector/planner/writer/candidate readback,
coexistence with position and polygon mutation, paired-resource preservation,
atomic publication, dialog Apply/Cancel/reopen/local-Save regression,
capability catalog update, and production builds.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed `Tag : CExoString` readback, and applicable NWN Encounter lookup or
script behavior remain separate release gates. This audit does not certify
full Encounter, Area, tile, or PathConnect completion.

## Resource/process statement

This audit used immutable decompilation exports, read-only PE/RCDATA bytes,
and bounded static VMT inspection. The installed Toolset was not started. No
Docker command, container, service, watcher, browser, Chrome, capture,
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source was used. No installed skill matches this offline static-decompilation
and TypeScript contract slice; Toolset operation/proof skills remain reserved
for the later live gates.

## Offline implementation result

Capability revision `2026-08-31.122` implements the frozen contract across
the backend domain/parser/fingerprint, detached HTTP and scene provenance,
workspace/history/local Save, Properties reducer/materializer, projection,
raw-GIT ordinal replanning, exact writer/readback, and revision-fenced atomic
publication. The integration candidate replaces only the exact retained
type-`7` `Tag`, reports one Encounter property update, and preserves complete
GIC and module IFO bytes.

Accepted bounded verification includes `2167/2167` assertions across nine
backend suites, all `66/66` atomic Area Update publication cases,
`971/971` assertions across fourteen focused frontend unit/regression files,
the full Workspace Encounter Apply/Cancel/reopen/OK/Ctrl+S flow, and both
production builds. Fresh guarded browser, Toolset Save/Build/reopen, and
applicable NWN runtime proof remain pending and are not implied by this
offline result.
