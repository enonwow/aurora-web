# Existing Area Encounter `Faction` audit v1

Date: 2026-09-01  
Status: source-closed and offline implementation verified; live certification pending

## Decision

Aurora Web may edit one retained type-`7` Area GIT Encounter
`Faction : DWord` only when the value is bound to the exact immutable module
`repute.fac` catalog. Unlike Placeable and Creature faction selectors, the
Encounter selector excludes physical faction row `0`: selectable and writable
values are the catalog's physical ordinals `1..factionCount-1`.

Missing, duplicate, wrong-case-label, wrong-type, value `0`, out-of-catalog,
stale-catalog, malformed, or absent storage is `PRESERVE_ONLY`. Aurora Web does
not create, normalize, or remap the native field. It does not edit faction
names, parents, global flags, directed reputations, or `repute.fac` bytes.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| frozen Toolset RCDATA export | `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa` |

No xoreos or other GPL source was inspected or used.

## Native storage and selector closure

Common Encounter reader `FUN_0055d470` calls the native DWord reader for exact
`Faction` and stores the value in member `0x11` at decompiled line `215195`.
Reciprocal writer `FUN_0055dbf8` writes the same member through the DWord writer
at line `215400`. The placed-Encounter writer carries this common record into
the type-`7` GIT struct; the paired GIC struct contains no faction copy.

Dialog population `FUN_00497798` starts at line `109831`, clears the Encounter
Faction combo, loads the Toolset's physical module faction vector, and loops
from physical ordinal `1` while the ordinal is below the catalog count at line
`109853`. It therefore deliberately omits row `0`. Properties save
`FUN_00498278` stores `selectedIndex + 1` at line `110933`; Properties load
`FUN_00498b48` restores `Faction - 1` at line `111104`. This closes the exact
one-based selector-to-physical-row mapping without guessing a numeric range.

The strict `repute.fac` loader, serializer, limits, and retained five-row corpus
are already source-closed in
`area-existing-placeable-faction-audit-v1-2026-08-19.md`. The shared catalog is
module-owned, digest-bound, ordered by physical `FactionList` ordinal, limited
to `1..1024` rows, and requires the complete valid `RepList`. Encounter editing
requires at least two catalog rows and never exposes row `0` as selectable.

## Frozen additive contract

Area detail may expose exact raw Encounter storage:

```json
{
  "encounterFaction": {
    "present": true,
    "nativeType": "dword",
    "value": 1
  }
}
```

The frontend binds that DWord to the existing shared
`placeableFactionCatalog`, then detaches immutable source provenance containing
`expectedValue`, `catalogSha256`, and `catalogFactionCount` from editable
`encounterFactionId`. Only catalog rows `1..count-1` are admitted. Display text
comes from the catalog row and is never mutation identity.

A changed retained Encounter adds one complete pair to its existing property
mutation:

```json
{
  "faction": {
    "expectedValue": 1,
    "value": 4,
    "catalogSha256": "<64 lowercase hex>",
    "catalogFactionCount": 5
  }
}
```

Projection, immutable-ordinal replanning, fresh catalog re-resolution, DWord
field-only CAS, candidate readback, and persisted readback must all agree.
Faction may coexist with every independently admitted Encounter property,
origin, and polygon mutation. All unrelated GIT fields, field order, complete
GIC, ARE, IFO, and `repute.fac` bytes remain exact.

## Tests, diagnostics, and completion boundary

Test-first coverage must include strict storage/provenance/mutation admission,
row-`0` rejection, catalog count/digest drift, parser absence and malformed
fields, projector and deletion planner, candidate catalog revalidation, exact
DWord write/readback, combined Encounter mutation, HTTP/scene/workspace
detachment, selector gating, Apply/Cancel/reopen/OK/local Save, full regression,
and both builds.

The low-cardinality event is `area_encounter_faction_cas.v1`. It may expose
only bounded stage, outcome, stable result code, changed-field count, and
duration. Faction IDs/names, object IDs, ordinals, catalog hashes, source keys,
paths, raw fields or bytes, credentials, and host paths are prohibited from
metric labels and routine logs.

Fresh browser Save/reopen, exact-candidate Toolset Save/Build/reopen with packed
GIT readback, and NWN faction behavior remain independent release gates. This
audit does not certify full Encounter, Area, tile, or PathConnect completion.

## Implemented slice and offline results

The backend now parses exact presence-sensitive Encounter `Faction : DWord`,
retains it in processing identity and repository clones, projects a changed
catalog-bound compare-and-swap, replans it against one immutable Encounter
ordinal, re-resolves the exact current `repute.fac` catalog, replaces only the
existing native DWord, and requires candidate plus persisted readback before
publication. The mutation composes with the existing origin, polygon, identity,
spawn configuration, creature-count, and event-script mutations.

The frontend validates the shared catalog and source binding, detaches source
provenance from the editable target across HTTP, scene, workspace, history and
clone boundaries, exposes only physical rows `1..count-1`, and sends a faction
member only when the final value changed. Apply, Cancel, reopen, OK and local
Save are covered through the existing Encounter regression flow. The capability
catalog records this slice at revision `2026-09-01.131` while retaining
Encounter authoring as `partial` and release-blocked.

Resource-safe verification passed:

- backend domain/parser `21/21`;
- projector `623/623`, deletion planner `419/419`, pair writer `971/971`, and
  candidate compiler `162/162`;
- capability catalog `13/13` and full Area Update atomic publication `74/74`;
- ten focused frontend files `1056/1056`;
- complete frontend regression smoke `43/43` files and `134/134` tests;
- backend and frontend production builds.

The broader general GFF parser suite retains two pre-existing ground-item
metadata round-trip failures unrelated to Encounter Faction; the dedicated
Faction parser suite passes. Fresh browser proof was not retried because its
known dependency blocker remains `getaddrinfo ENOTFOUND mysql`. Toolset and NWN
certification remain open, as does Difficulty authoring until Aurora Web owns a
complete effective `EncDifficulty.2da` catalog.

## Resource/process statement

This source audit used immutable decompilation exports and existing read-only
catalog evidence. No Docker command, container, service, watcher, browser,
Chrome, capture, Toolset/NWN process, mutation test, sub-agent, xoreos source,
or other GPL source was used.
