# Existing Area Waypoint `LocalizedName` audit v1

Date: 2026-09-01  
Status: source-closed; additive contract frozen; offline implementation verified; native proof pending

## Decision

Aurora Web may retain the complete exact native `LocalizedName` storage of one
existing type-`5` Area GIT Waypoint and replace it only inside the deterministic
inline localized-string profile already admitted for retained Creature,
Placeable, Item, and Encounter names:

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
Toolset form does not serialize `MaxLength` for its Waypoint name edit, so this
product budget is not represented as a native limit.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| frozen `TDLGWAYPOINTEDIT` RCDATA | `8a228ea412ed5763283486b4211d42752fec0a335159dfe1138d3e3dc6959506` |

No xoreos or other GPL source was inspected or used.

## Native storage closure

Common Waypoint reader `FUN_00658170` reads exact `LocalizedName` through the
native localized-string helper `FUN_00aef678` at decompiled line `346921`.
Reciprocal common writer `FUN_00658b4c` copies the same member and emits exact
`LocalizedName` through `FUN_00af0144` at lines `347176..347178`. This is the
same complete native helper family independently audited for other retained
localized-string fields; it preserves unsigned `strRef`, ordered numeric entry
identifiers, byte lengths, and byte strings.

The placed Waypoint belongs to exact `WaypointList`, struct type `5`. Position,
bearing, `TemplateResRef`, Tag, Description, LinkedTo, map-note fields, scripts,
variables, paired GIC, ARE, and IFO remain independent preservation lanes.

## Toolset Properties boundary

The frozen 3,368-byte `TDLGWAYPOINTEDIT` `TPF0` form contains a visible Basic-
tab `Name` label, `eLocName : TEdit`, and adjacent `bLocName : TButton` with
caption `...`. Neither active localized-name control serializes
`Visible = false`; the adjacent hidden `eLinkedTo` does. `eLocName` has no
serialized `MaxLength` or `OnChange` property. The localization button and
native complete-value reader/writer establish that the plain edit presents a
`CExoLocString`; it is not authority to flatten arbitrary TLK or multilingual
storage into one string.

## Frozen additive contract

Area detail may expose complete presence-sensitive storage:

```json
{
  "waypointLocalizedName": {
    "present": true,
    "strRef": 4294967295,
    "entries": [
      { "languageId": 0, "textBytesBase64": "UGF0cm9sIFBvaW50" }
    ]
  }
}
```

The frontend deep-copies this storage under immutable
`source.waypointLocalizedNameStorage`. Only an admitted inline profile may
author a separate `waypointLocalizedName` target. A changed retained Waypoint
adds an optional localized-name pair beside independently admitted Tag CAS:

```json
{
  "kind": "waypoint",
  "sourceObjectId": "waypoint:0:nw_waypoint001:source",
  "sourceIndex": 0,
  "localizedName": {
    "expectedValue": "Patrol Point",
    "value": "North Patrol Point"
  }
}
```

At least one of `tag` or `localizedName` must be present and changed; unknown
keys fail closed. Planning reparses one canonical type-`5` Waypoint, validates
complete expected storage, rejects deletion collision or duplicate mutation,
and replaces only the existing native member in place. Exact candidate and
persisted readback are required before revision-fenced publication.

## Diagnosability and completion boundary

The additive low-cardinality event is
`area_waypoint_localized_name_cas.v1`. It may expose only contract revision,
Waypoint family, bounded stage, outcome, stable result code,
changed-field count, and duration. Names, base64, raw bytes, TLK text, object
IDs, ordinals, hashes, source keys, paths, credentials, and host paths are
prohibited from metric labels and routine logs.

Offline acceptance requires strict domain/parser tests, full storage transport
and cloning, detached source/target state, preserve-only presentation,
Apply/Cancel/reopen/OK/local Save, projector/planner/writer/candidate readback,
combination with Waypoint Tag and transform mutations, atomic publication,
regression coverage, capability-catalog coverage, and production builds.

The offline implementation now satisfies that acceptance boundary. Backend
domain/parser/projector/planner/writer/candidate and atomic-publication tests,
frontend HTTP/mapper/draft/clone/domain/facade/dialog tests, the Workspace
Cancel/Apply/reopen/OK/local-Save regression, and the production frontend build
all pass under the repository's bounded single-worker/1 GiB process policy.
The capability remains partial and release-blocked only by the live proof gates
below and by the wider incomplete Waypoint property matrix.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed localized-string readback, and NWN name presentation remain
independent release gates. This audit does not certify full Waypoint, Area,
tile, or PathConnect completion.

## Resource/process statement

This audit used immutable decompilation exports and read-only installed
PE/RCDATA bytes. No Docker command, container, service, watcher, browser,
Chrome, capture, Toolset/NWN process, mutation test, sub-agent, xoreos source,
or other GPL source was used.
