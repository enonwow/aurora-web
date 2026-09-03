# Existing Area Trigger `Tag` audit v1

Date: 2026-08-31  
Status: source-closed; offline implementation verified; live proof pending

## Decision

Aurora Web may replace the exact existing `Tag : CExoString` of one retained
type-`1` Area GIT Trigger. The admitted value is a JavaScript string of at
most 32 UTF-16 code units without U+0000. Empty strings and whitespace remain
exact values; they are never trimmed, normalized, case-folded, or synthesized.
Missing, duplicate, aliased, wrong-case, wrong-type, over-budget, or otherwise
ambiguous storage is `PRESERVE_ONLY` and cannot authorize adding a field.

This is an exact storage compare-and-swap lane. It does not activate localized
name, type, faction, key/link/transition fields, trap properties, scripts,
variables, rotation, runtime activation, or arbitrary Trigger-template Create.
It may coexist atomically with the independently admitted retained Trigger
position and polygon mutations for the same immutable ordinal.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| frozen Toolset RCDATA report | `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa` |

No xoreos or other GPL source was inspected or used.

## Native GFF storage closure

Common Trigger reader `FUN_00656720`, beginning at decompiled line `345687`,
reads the Trigger string member at offset `+0x34` through CExoString helper
`FUN_00aef090` and label pointer `0x00c5b668` at line `345802`. Direct
read-only PE mapping resolves that pointer to bytes `54 61 67 00`, proving
exact case-sensitive label `Tag`.

The reciprocal common Trigger writer `FUN_0065752c`, beginning at line
`346102`, writes the same member through CExoString helper `FUN_00af0084` and
label pointer `0x00c5b79f` at line `346112`. Direct PE mapping resolves the
same `54 61 67 00` bytes. Placed-Trigger writer `FUN_00657de0` delegates the
GIT payload to this common writer at line `346628`; paired GIC owns editor
`Comment`, not `Tag`, and must remain exact for a Tag-only mutation.

The installed `newgeneric.UTT` and the accepted native type-`1` Trigger GIT
lineage independently contain exact `Tag : CExoString = "GenericTrigger"`.
Their immutable identities and readbacks remain recorded by
`area-trigger-construction-audit-v1-2026-08-13.md`.

## Toolset field boundary and coupling closure

The frozen `TDLGTRIGGEREDIT` RCDATA is a 13,240-byte `TPF0` resource at RVA
`0x00BB62F8`. Its Advanced-tab `eTag : TEdit` serializes `MaxLength` as Delphi
integer `0x20`, independently establishing the 32-character Trigger limit.
The form binds `eTagChange`.

A bounded read-only VMT probe locates Pascal class `TdlgTriggerEdit`, the VMT
at `0x00ca1a90`, and its 32-entry published method table at `0x00ca2331`.
Entry `25` maps `eTagChange` to `FUN_00722f10` at `0x00722f10`. The complete
58-byte handler obtains the edit control, passes only that control through the
shared tag-validation path `FUN_005f4b50`, and restores its edit-state flag.
It does not call the Trigger reader/writer, transition helpers, trap logic,
script logic, or another property calculator. The shared validation path reads
and, when necessary, replaces text in the same edit control; it does not
materialize another Trigger field. No coupled persisted mutation is therefore
required for this bounded exact storage lane.

## Frozen additive contract

Area detail may expose exact presence-sensitive provenance:

```json
{
  "triggerTag": {
    "present": true,
    "value": "GenericTrigger"
  }
}
```

Absence is `{ "present": false }`; it is distinct from a physically present
empty string and remains preserve-only. The frontend detaches this object
under immutable `source.triggerTag`. Generic metadata, object IDs, template
identity, and display labels are never write authority.

A changed retained Trigger adds one member to the existing Area Update object
property collection:

```json
{
  "kind": "trigger",
  "sourceObjectId": "trigger:0:newgeneric:source",
  "sourceIndex": 0,
  "tag": {
    "expectedValue": "GenericTrigger",
    "value": "  AREA_EXIT  "
  }
}
```

Both values must satisfy the exact boundary, differ by UTF-16 code unit, and
admit no unknown keys. Planning reparses one canonical type-`1` Trigger,
requires exactly one `Tag : CExoString`, performs complete expected-value CAS,
and rejects deletion collision or duplicate mutation. Writing replaces only
the existing field value in place and preserves field order, all unrelated
GIT members, the complete Geometry list, orientation, and every GIC/ARE/IFO
byte. Candidate and persisted readback must reproduce the exact target before
the revision-fenced transaction may publish.

## Diagnostics and completion boundary

The additive low-cardinality event is `area_trigger_tag_cas.v1`. It reports
only contract revision, Trigger family, bounded stage, outcome, stable result
code, changed-field count, and duration. Tag contents, object IDs, ordinals,
hashes, source keys, paths, raw fields/bytes, credentials, and host paths are
prohibited from metric labels and routine logs.

Offline acceptance requires strict domain/parser tests, presence-sensitive API
transport, detached scene/workspace/clone provenance, guarded reducer and
materializer behavior, exact projector/planner/writer/candidate readback,
coexistence with polygon mutation, paired-resource preservation, atomic
publication, dialog Apply/Cancel/reopen/local-Save regression, capability
catalog update, and production builds.

## Offline implementation closure

The bounded retained-instance lane is implemented end to end. Backend parsing,
HTTP schemas, projection, immutable-ordinal planning, exact GFF mutation,
candidate readback, and revision-fenced atomic publication share one strict
presence-sensitive CAS contract. The atomic integration publishes the exact
whitespace-bearing target `"  AREA_EXIT  "` into the retained Trigger GIT,
reports one Trigger property update, and preserves paired GIC plus module IFO
bytes exactly.

The frontend carries detached immutable `source.triggerTag` provenance through
HTTP mapping, workspace admission, clone/history, local persistence, and final
export. Trigger Properties exposes the exact 32-code-unit editor only for an
`ACTIVE_NOW` source and remains `PRESERVE_ONLY` otherwise. Apply, Cancel,
reopen, OK, and Ctrl+S local Save preserve the target exactly and never mutate
the source snapshot. Logical Trigger/Encounter properties remain reachable
from the object list even when their canvas overlays are disabled.

Accepted resource-safe gates on 2026-08-31 are:

- seven bounded backend suites: `2130/2130`;
- exact retained Trigger Tag atomic publication: `1/1`;
- fourteen admitted frontend files, including the retained Trigger Workspace
  regression: `966/966`;
- targeted hidden-overlay logical-properties filter: `1/1`;
- backend and frontend production builds.

The wider combined frontend run has `1075` passing assertions and the complete
render-filter file still has one independent dirty-tree
Placeable material-sidedness failure (`THREE.DoubleSide` expected while the
current loader assigns `FrontSide`). The Trigger reachability assertion in the
same file passes independently. This unrelated failure does not certify or
invalidate the Trigger Tag contract and is not modified by this slice.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed `Tag : CExoString` readback, and NWN runtime Tag lookup behavior
remain separate release gates. This audit does not certify full Trigger, Area,
tile, or PathConnect completion.

## Resource/process statement

This audit used immutable decompilation exports, read-only PE/RCDATA bytes, and
bounded static VMT inspection. The installed Toolset was not started. No
Docker command, container, service, watcher, browser, Chrome, capture,
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source was used. No installed skill matches this offline static-decompilation
and TypeScript contract slice; Toolset operation/proof skills remain reserved
for the later live gates.
