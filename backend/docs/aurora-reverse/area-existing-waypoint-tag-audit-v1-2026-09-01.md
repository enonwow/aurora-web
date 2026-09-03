# Existing Area Waypoint `Tag` audit v1

Date: 2026-09-01  
Status: source-closed; contract frozen; offline implementation verified; live exact-candidate proof pending

## Decision

Aurora Web may replace the exact existing `Tag : CExoString` of one retained
type-`5` Area GIT Waypoint. The admitted value is a JavaScript string of at
most 32 UTF-16 code units without U+0000. Empty strings and whitespace remain
exact values; they are never trimmed, normalized, case-folded, or synthesized.
Missing, duplicate, aliased, wrong-case, wrong-type, over-budget, or otherwise
ambiguous storage is `PRESERVE_ONLY` and cannot authorize adding a field.

This is an exact storage compare-and-swap lane. It does not activate
`LocalizedName`, `Description`, `LinkedTo`, map-note fields, appearance,
scripts, variables, template identity, or arbitrary Waypoint-template Create.
It may coexist atomically with the independently admitted retained Waypoint
transform mutation for the same immutable ordinal.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| frozen `TDLGWAYPOINTEDIT` RCDATA | `8a228ea412ed5763283486b4211d42752fec0a335159dfe1138d3e3dc6959506` |

No xoreos or other GPL source was inspected or used.

## Native GFF storage closure

Common Waypoint reader `FUN_00658170` reads `TemplateResRef`, then the string
member at offset `+0x34` through CExoString helper `FUN_00aef090` and label
pointer `DAT_00c5b9c1` at decompiled line `346867`. The immutable export places
that four-byte datum immediately after the NUL-terminated
`TemplateResRef` string and immediately before `LocalizedName`; its bytes are
`54 61 67 00`, the exact case-sensitive label `Tag`.

The reciprocal common Waypoint writer `FUN_00658b4c` writes the same member
through CExoString helper `FUN_00af0084` and label pointer `DAT_00c5ba4a` at
line `347175`. That four-byte datum occupies the identical field position and
also resolves to `54 61 67 00`. The admitted placed-family profile is exact
`WaypointList`, struct type `5`. Paired GIC does not own this field and must
remain byte-identical for a Tag-only mutation.

## Toolset boundary and observed coupling

The frozen 3,368-byte `TDLGWAYPOINTEDIT` Delphi form contains
`TEdit eTag`, `MaxLength = 0x20`, and `OnChange = eTagChange`. This independently
establishes the 32-character Toolset control boundary.

The accepted native proof at
`evidence/waypoint-tag-live-standard-2026-07-14/` opened exactly one
`TdlgWaypointEdit`, changed only
`NW_WAYPOINT001 -> CODEX_WAYPOINT_PROOF`, saved, and read the packed Area GIT
back. `TemplateResRef`, X/Y/Z, bearing, Waypoint count, and total object count
were identical before and after. The proof therefore closes the bounded
persisted coupling question for this exact field lane; it does not certify the
wider Waypoint property matrix.

## Frozen additive contract

Area detail may expose exact presence-sensitive provenance:

```json
{
  "waypointTag": {
    "present": true,
    "value": "NW_WAYPOINT001"
  }
}
```

Absence is `{ "present": false }`; it is distinct from one physically present
empty string and remains preserve-only. The frontend detaches this object
under immutable `source.waypointTag`. Generic metadata, object IDs, template
identity, and display labels are never write authority.

A changed retained Waypoint adds one member to the existing Area Update object
property collection:

```json
{
  "kind": "waypoint",
  "sourceObjectId": "waypoint:0:nw_waypoint001:source",
  "sourceIndex": 0,
  "tag": {
    "expectedValue": "NW_WAYPOINT001",
    "value": "  AREA_DESTINATION  "
  }
}
```

Both values must satisfy the exact boundary, differ by UTF-16 code unit, and
admit no unknown keys. Planning reparses one canonical type-`5` Waypoint,
requires exactly one `Tag : CExoString`, performs complete expected-value CAS,
and rejects deletion collision or duplicate mutation. Writing replaces only
the existing field value in place and preserves field order, all unrelated GIT
members, position/orientation, and every GIC/ARE/IFO byte. Candidate and
persisted readback must reproduce the exact target before the revision-fenced
transaction may publish.

## Diagnostics and completion boundary

The additive low-cardinality event is `area_waypoint_tag_cas.v1`. It reports
only operation, outcome, stable result code, changed-field count, and duration.
Tag contents, object IDs, ordinals, hashes, paths, source/storage keys, raw
fields/bytes, credentials, and host paths are prohibited from metric labels
and routine logs.

Offline acceptance requires strict domain/parser tests, presence-sensitive API
transport, detached scene/workspace/clone provenance, guarded reducer and UI
materialization, exact projector/planner/writer/candidate readback, coexistence
with transform mutation, paired-resource preservation, atomic publication,
dialog Apply/Cancel/reopen/local-Save regression, capability catalog update,
and production builds.

The 2026-07-14 native Toolset proof is valid primary precedent for exact Tag
coupling, but it predates this implementation candidate. Fresh guarded browser
Save/reopen and exact-candidate Toolset Save/Build/reopen plus NWN lookup remain
release gates. This audit does not certify full Waypoint, Area, tile, or
PathConnect completion.

## Implementation verification

Implementation checkpoint `209` and capability revision `2026-09-01.141`
connect the full offline lane: exact parser/storage and hash/clone state,
detached frontend transport/workspace/history provenance, guarded scene and
viewport mutation ports, list/context/sidebar routing, the Waypoint Properties
dialog, compare-and-swap projection/planning, exact in-place GIT writing,
candidate readback, and revision-fenced atomic publication.

Resource-bounded verification passes `38/38` focused backend assertions across
six suites, the full `81/81` Area Update atomic-publication suite, `13/13`
capability-catalog assertions, `1061/1061` focused frontend assertions across
ten suites, the expanded `18/18` Scene Object List assertions, the targeted
hidden-marker properties gate, the real Workspace Apply/Cancel/reopen/OK/local
Save regression, and both production builds. The ordinary type-checking Jest
transform exhausted its fixed 1 GiB heap before executing the large candidate
compiler file; the repository's bounded isolated transform passed the exact
test without increasing the memory cap.

The integration reads the published GIT back, verifies the exact whitespace-
preserving target, and proves paired GIC and module IFO byte identity. The real
Workspace regression proves that the list action remains connected even when
the Waypoint canvas marker is hidden and that immutable source provenance is
unchanged after local Save.

## Resource/process statement

This audit used immutable decompilation exports, read-only PE/RCDATA bytes, and
the existing accepted Toolset evidence packet. The installed Toolset was not
started. No Docker command, container, service, watcher, browser, Chrome,
capture, Toolset/NWN process, mutation test, sub-agent, xoreos source, or other
GPL source was used.
