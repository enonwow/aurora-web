# Existing Area Waypoint map-note vector audit v1

Date: 2026-09-01  
Status: source-closed; additive contract frozen; offline implementation verified; live proof pending

## Decision

Aurora Web may expose and mutate an existing Waypoint map note only as one
complete native vector:

- `HasMapNote : Byte` with value `0|1`;
- `MapNote : CExoLocString`;
- `MapNoteEnabled : Byte` with value `0|1`.

All three exact case-sensitive members must occur once on the same retained
type-`5` `WaypointList` GIT struct. The admitted localized-string profile is
unsigned `strRef=0xffffffff`, empty or one language/gender-`0` entry, printable
ASCII only, with a 4,096-byte product ceiling. Empty and whitespace text is
preserved exactly. Missing, partial, duplicated, wrong-case, wrongly typed,
non-binary, TLK-backed, multilingual, malformed, non-ASCII, or over-budget
storage is `PRESERVE_ONLY`.

The three members are never authored as independent mutations. One complete
expected vector and one complete target vector form one compare-and-swap;
at least one component must change. There is no field synthesis, trimming,
normalization, silent truncation, default inference, or partial publication.

This slice does not authorize Waypoint `Appearance`, `LinkedTo`, variables,
template identity, runtime target/reference behavior, or construction.
`Appearance` remains deferred until its effective `waypoint.2da` catalog
binding is source-closed.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |

No xoreos or other GPL source was inspected or used.

## Native reader/writer closure

Common Waypoint reader `FUN_00658170` begins at decompiled line `346780`.
Its map-note block at lines `347024..347037` reads exact `HasMapNote` through
the Byte helper with default `0`, reads exact `MapNote` through the localized-
string helper, then reads exact `MapNoteEnabled` through the Byte helper with
default `1`. The values are stored in the same common Waypoint object at
members `0x16`, `0x14`, and `0x17` respectively.

Reciprocal common writer `FUN_00658b4c` begins at line `347158`. Lines
`347182..347188` write the same three members under exact labels
`HasMapNote`, `MapNote`, and `MapNoteEnabled`, using the native Byte and
localized-string writers. The reciprocal ownership closes storage semantics;
Aurora Web deliberately rejects the native reader defaults as retained-source
provenance when any physical member is absent.

Frozen RCDATA report
`C:/Projects/nwn-last-city/Aurora/reverse/runs/NWTOOLSET_RCDATA_REFRESH_2026-05-20.json`
records dialog resource `TDLGWAYPOINTEDIT`, size `3368`, RVA `0x00BBC168`.
Its Advanced-tab controls include `lMapNote` / `Map Note Text`, `eMapNote`,
`bMapNote`, `cbHasMapNote` / `Waypoint Contains a Map Note` with handler
`cbHasMapNoteClick`, and `cbMapNoteEnabled` / `Map Note Enabled`. This is UI
ownership evidence only; it does not establish runtime map-pin behavior.

## Frozen additive contract

Area detail adds `waypointMapNote` only for the admitted complete native
storage vector. The frontend deep-copies it under immutable
`source.waypointMapNoteStorage` and materializes a separate logical target:

```json
{
  "hasMapNote": true,
  "mapNoteText": " Northern gate ",
  "mapNoteEnabled": false
}
```

A changed retained Waypoint emits one optional property member:

```json
{
  "kind": "waypoint",
  "sourceObjectId": "waypoint:0:nw_waypoint001:source",
  "sourceIndex": 0,
  "mapNote": {
    "expectedValue": {
      "hasMapNote": false,
      "mapNoteText": "Old marker",
      "mapNoteEnabled": true
    },
    "value": {
      "hasMapNote": true,
      "mapNoteText": " Northern gate ",
      "mapNoteEnabled": false
    }
  }
}
```

Projection requires exact retained storage and a complete target. Planning
reparses the exact source GIT, resolves the immutable Waypoint ordinal, and
compares all three logical source values. Writing validates all three physical
members before constructing a replacement entry, replaces the existing fields
in place, and performs exact candidate readback. A map-note-only mutation
preserves GIC and module IFO bytes; revision-fenced atomic publication retains
the existing authorization, idempotency, optimistic-concurrency, journal,
rollback, recovery, and ARE/GIT/GIC/IFO transaction contracts.

## Frontend ownership and UI

The HTTP adapter validates the complete wire vector and rejects foreign-family
ownership. The scene mapper and history clone detach nested localized-string
storage. Draft validation permits a target only when exact source storage is
present and the localized member is in the admitted inline profile. The scene
facade applies one complete logical vector and preserves immutable provenance.

The Aurora-shaped Waypoint Properties `Advanced` tab exposes the frozen native
labels `Waypoint Contains a Map Note`, `Map Note Text`, and `Map Note Enabled`.
The vector is `ACTIVE_NOW` only for admitted exact provenance; otherwise all
three controls are `PRESERVE_ONLY`. Map-note text and enabled state are disabled
while `HasMapNote` is false, without deleting or normalizing their stored
values. Cancel, Apply, reopen, OK, history clone, and local Save retain the
complete target and unchanged source vector.

## Diagnosability and completion boundary

The additive low-cardinality event is `area_waypoint_map_note_cas.v1` with
bounded operations `parse_source|plan|write|readback`, outcome, stable result
code, changed-field count (`0|3`), and duration. Map-note content, base64, raw
bytes, object IDs, ordinals, hashes, paths, source/storage keys, credentials,
and host paths are prohibited from event fields and metric labels. Telemetry
failure must not alter validation, mutation, transaction, rollback, recovery,
or publication.

Offline verification passed `14/14` backend domain/parser assertions, `9/9`
projector assertions, `3/3` bounded planner/writer persistence assertions,
the targeted candidate-compiler assertion, the targeted atomic-publication
assertion, and the backend production build. Frontend HTTP/mapper/workspace-
draft/domain/facade/properties coverage passed `1075/1075`, the dialog passed
`2/2`, the real Workspace Cancel/Apply/reopen/OK/local-Save regression passed,
and the frontend production build passed.

Fresh guarded browser Save/reopen and exact-candidate Toolset
Save/Build/reopen with packed GIT readback remain release gates. A separate NWN
runtime proof is required before claiming map-pin presentation or interaction.
This audit does not certify complete Waypoint authoring, full Area CRUD, tile
rendering, the 99-tileset matrix, or PathConnect/WOK.

## Resource/process statement

This work used immutable decompilation, frozen RCDATA evidence, repository
implementation, and one bounded offline verification process at a time. No
Docker command, container, service, watcher, browser, Chrome, capture,
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source was used.
