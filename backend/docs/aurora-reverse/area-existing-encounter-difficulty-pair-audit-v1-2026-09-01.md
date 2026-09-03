# Existing Area Encounter `Difficulty` / `DifficultyIndex` audit v1

Date: 2026-09-01  
Status: source-closed; offline implementation and bounded verification complete;
fresh browser, Toolset, and NWN release gates remain open

## Decision

Aurora Web may edit retained type-`7` Area GIT Encounter difficulty only as one
complete catalog-bound pair:

- `Difficulty : INT` is the selected physical `EncDifficulty.2da` row's exact
  `VALUE`, constrained by the native Properties spinner to `-20..20`;
- `DifficultyIndex : INT` is that selected row's physical zero-based ordinal.

The pair is editable only when Aurora Web owns the exact effective ordered
`EncDifficulty.2da`, every physical row has one admitted `STRREF` and `VALUE`,
the retained index resolves to a row, and retained `Difficulty` equals that
row's `VALUE`. Missing, partial, duplicate, wrong-case-label, wrong-type,
out-of-range, stale-catalog, incoherent, or absent storage is `PRESERVE_ONLY`.
Display text is TLK-derived presentation and is never mutation identity.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| frozen Toolset RCDATA export | `3d9c5d29709bc4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa` |

No xoreos or other GPL source was inspected or used.

## Native storage and exact catalog mapping

Common Encounter reader `FUN_0055d470` reads exact `Difficulty` and
`DifficultyIndex` through the native INT reader into members `0x15` and `0x16`
at decompiled lines `215191..215194`. Reciprocal writer `FUN_0055dbf8` writes
both members through the native INT writer at lines `215398..215399`. The
placed-Encounter writer carries this common type-`7` GIT record; GIC has no
second difficulty copy.

Properties initialization `FUN_00497348` constrains the Difficulty numeric
control to signed `-20..20` at lines `109648..109649`. Catalog loader
`FUN_004973ec` loads `EncDifficulty` at line `109706`, iterates every table row
in physical order `0..rowCount-1`, reads exact `STRREF` and `VALUE` columns,
localizes `STRREF` for the combo label, appends the label, and stores the row's
`VALUE` in a same-ordinal vector at lines `109721..109816`.

Properties save `FUN_00498278` stores the numeric control as `Difficulty` and
the combo's selected physical index as `DifficultyIndex` at lines
`110928..110931`. Properties load `FUN_00498b48` selects the stored index, then
sets the numeric control from the selected combo row's stored `VALUE` at lines
`111098..111103`; it does not use a mismatching stored `Difficulty` as the UI
authority. Combo handler `FUN_00499dcc` performs the same index-to-`VALUE`
projection at lines `111871..111880`. Therefore the two native fields form one
catalog-coherent authoring unit rather than two independent numeric controls.

## Frozen additive contract

Area detail may add exact raw storage plus a complete effective catalog:

```json
{
  "encounterDifficulty": {
    "difficulty": { "present": true, "nativeType": "int", "value": 0 },
    "difficultyIndex": { "present": true, "nativeType": "int", "value": 2 }
  },
  "encounterDifficultyCatalog": {
    "schemaVersion": "area-encounter-difficulty-catalog.v1",
    "descriptor": {
      "resourceName": "encdifficulty.2da",
      "sourceObjectKey": "<bounded opaque key>",
      "sourceLayer": "module|hak|vanilla",
      "sha256": "<64 lowercase hex>",
      "sizeBytes": 1,
      "rowCount": 3
    },
    "rows": [
      {
        "rowIndex": 0,
        "strRef": 1,
        "value": -5,
        "displayName": "<bounded TLK text>",
        "displaySource": "strref|row_index"
      }
    ]
  }
}
```

The frontend detaches immutable source pair plus catalog digest/count from the
editable selected row. A changed retained Encounter sends one complete pair:

```json
{
  "difficulty": {
    "expectedValue": { "difficulty": 0, "difficultyIndex": 2 },
    "value": { "difficulty": 5, "difficultyIndex": 3 },
    "catalogSha256": "<64 lowercase hex>",
    "catalogRowCount": 4
  }
}
```

Projection, immutable-ordinal replanning, fresh effective-catalog resolution,
two-field INT compare-and-swap, candidate readback, and persisted readback must
all agree. The target `difficulty` must equal the target row's catalog `VALUE`.
All unrelated GIT fields, field order, complete GIC, ARE, IFO, and source 2DA
bytes remain exact.

## Offline implementation

The backend now resolves the exact effective `encdifficulty.2da` through the
existing module, ordered-HAK, and vanilla precedence chain, localizes admitted
`STRREF` values through the effective TLK, and exposes a bounded immutable
catalog descriptor and physical-row list in Area detail. The strict parser
rejects missing or duplicate required columns, malformed rows, invalid
numeric ranges, and budget violations. Area GIT parsing retains exact raw
`Difficulty` and `DifficultyIndex` storage without normalizing malformed or
partial input.

The update pipeline carries detached source pair plus catalog digest/count,
projects only a complete changed compare-and-swap, replans against one
immutable Encounter ordinal, freshly resolves the effective catalog, rejects
stale or incoherent requests, replaces only the two canonical INT fields, and
requires exact candidate and persisted readback before revision-fenced
publication. The pair composes with the previously admitted Encounter origin,
polygon, Tag, Active, PlayerOnly, Reset, ResetTime, SpawnOption, Respawns,
creature-count, event-script, and Faction mutations while preserving field
order and every unrelated GIT, GIC, ARE, and IFO value.

The frontend validates and deep-clones the exact catalog and source pair at
the HTTP, scene, workspace, history, and viewport boundaries. Encounter
Properties exposes only physical catalog rows, derives labels from the
resolved catalog, detaches the selected target from immutable provenance, and
exports the complete pair only when it changed. Malformed, partial,
out-of-catalog, or catalog-incoherent retained storage is visibly
`PRESERVE_ONLY`. Apply, reset-to-source, Cancel, reopen, OK, clone/history, and
local Save retain the source pair and catalog binding.

## Completion boundary and diagnostics

Tests must cover strict 2DA columns and rows, physical order, TLK fallback,
catalog budgets, raw pair parsing, mismatched source pair, stale digest/count,
projector/planner/writer/candidate readback, combined Encounter mutation,
HTTP/scene/workspace detachment, selector behavior, Apply/Cancel/reopen/OK/local
Save, integration publication, regression, and both builds.

The low-cardinality event will be `area_encounter_difficulty_cas.v1`. It may
expose only bounded stage, outcome, stable result code, changed-pair count, and
duration. Numeric difficulty, row index, labels, STRREFs, hashes, object IDs,
source keys, paths, raw fields/bytes, credentials, and host paths are prohibited
from metric labels and routine logs.

Fresh browser Save/reopen, exact-candidate Toolset Save/Build/reopen with packed
pair readback, and NWN difficulty behavior remain independent release gates.
This audit does not certify full Encounter, Area, tile, or PathConnect
completion.

## Offline verification

- eight bounded backend suites pass `2278/2278` tests across catalog parsing,
  raw pair parsing, domain validation, catalog resolution, projection,
  replanning, GFF writing, and candidate compilation;
- the Area capability catalog passes `13/13`, and all Area Update atomic-
  publication cases pass `75/75`;
- nine focused frontend files pass `1061/1061`, including HTTP, mapper,
  workspace, clone, domain, authoring, dialog, facade, and viewport contracts;
- the dedicated Encounter Difficulty Apply/Cancel/reopen/OK/local-Save
  regression passes `1/1`;
- the complete frontend regression-smoke gate passes `43/43` files and
  `134/134` tests;
- backend and frontend production builds pass, and `git diff --check` exits
  `0` with only repository-wide LF-to-CRLF warnings.

Capability revision `2026-09-01.132` records the offline slice while keeping
Encounter authoring `partial` and all live release gates explicit.

## Resource/process statement

This source audit used immutable decompilation exports and existing read-only
project evidence. No Docker command, container, service, watcher, browser,
Chrome, capture, Toolset/NWN process, mutation test, sub-agent, xoreos source,
or other GPL source was used.
