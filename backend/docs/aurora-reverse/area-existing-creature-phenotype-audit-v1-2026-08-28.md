# Existing Area Creature `Phenotype` audit v1

Date: 2026-08-28  
Status: offline implemented and build-verified; browser, Toolset, and NWN release proof pending

## Decision

Aurora Web may expose the exact existing `Phenotype : Int` field of one
retained type-`4` Area GIT Creature as a catalog-bound compare-and-swap
mutation. The editable identity is a physical row ordinal of the one effective
`phenotype.2da`, constrained to the byte stored by the native Creature object.

The native reader rewrites source value `1` to `0` immediately. Physical row
`1` is therefore not round-trippable and must never be an admitted mutation
target. Safe web targets are physical rows `0..255`, excluding `1`, admitted by
the exact effective table. A display string is never persistence authority.

Phenotype selection is active only for the exact retained Appearance row when
that row has `MODELTYPE=P`. The first implementation intentionally rejects a
simultaneous `Appearance_Type` and `Phenotype` change: phenotype admission is
bound to both immutable table identities and the unchanged retained Appearance
row.

## Immutable primary authority

The admitted read-only sources are:

- `C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
- `C:/Projects/New Folder/export/functions.tsv`, SHA-256
  `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`;
- retail `nwtoolset.exe`, SHA-256
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`;
- refreshed Toolset RCDATA report, SHA-256
  `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`;
- immutable `TDLGCREATUREEDIT` RCDATA payload, SHA-256
  `75e2fdb157501321e5b6b2b93d3e49c9cc769dd8e6e9cf6b1046840b0acd820e`;
- retail `phenotype.2da`, extracted read-only through the repository KEY/BIF
  reader, 337 bytes, SHA-256
  `0403b3862e95c3bcf8418526d82192b83b27601a8b207b76379db1c016329ab5`.

No xoreos or other GPL source was inspected or used. No Docker command,
service, watcher, browser, capture, Toolset process, NWN process, or mutation
test was started for this slice.

## Native GFF closure

The common Creature reader `FUN_00532174` reads exact label `Phenotype`
through the generic scalar reader with native GFF type id `5` (`Int`) at
decompiled lines `194235-194239`. The result is cached as a byte at Creature
offset `+0x6d`; source value `1` is normalized to `0` before the value can be
retained.

The common Creature writer `FUN_0053521c` writes exact label `Phenotype` at
lines `195148-195149`, using the generic scalar writer with native type id `5`
and the cached byte value. Area parsing and writing must consequently preserve
exact case, native `Int` storage, presence, signed source payload for unchanged
round-trip, and the physical target byte constraint.

The paired GIC record does not own this field and remains byte-identical for a
Phenotype-only mutation.

## Toolset and table closure

The Creature editor owns ComboBox `cbPhenotype`. Its enabled state is derived
from the current Appearance row and is active only when `MODELTYPE` equals
`P` (decompiled lines `69587-69665`). Dialog save writes `0` when the selector
is disabled or has no selection; otherwise it writes the selected item-data
low byte (lines `70750-70760`).

Population routine `FUN_00458ec8` (lines `76807-76875`) loads
`phenotype.2da`, reads logical column `NAME`, resolves the StringRef through
TLK, and stores the physical row ordinal as ComboBox item data. The retail
header spells the column `Name`; table parsing therefore applies the native
logical case-insensitive column lookup. There is no `LABEL` fallback for
selector admission.

The inspected retail table admits these physical rows after native constraints:

| Int/byte | Label | NAME StringRef | DefaultPhenoType |
| ---: | --- | ---: | ---: |
| 0 | `Normal` | 2223 | 0 |
| 2 | `Large` | 2225 | 0 |
| 3 | `Normal_M` | 111015 | 0 |
| 5 | `Large_M` | 111016 | 2 |
| 6 | `N_Joust_M` | 111017 | 0 |
| 8 | `L_Joust_M` | 111018 | 2 |

Rows `4` and `7` have no usable `NAME`. Row `1` is excluded even though the
retail resource contains it, because the native Creature reader rewrites it.
Module and ordered-HAK resources may replace the complete table, so the retail
row list is evidence, not a hardcoded current-module catalog.

## Frozen cross-boundary contract

Area detail preserves exact storage:

```ts
type CreaturePhenotypeStorage =
  | { present: false }
  | {
      present: true;
      nativeType: "int";
      value: number;
      table?: {
        resourceName: "phenotype.2da";
        sourceObjectKey: string;
        sourceLayer: "module" | "hak" | "vanilla";
        sha256: string;
        sizeBytes: number;
        rowCount: number;
        rowIndex: number;
      };
    };
```

Only safe and admitted values receive `table`; malformed, absent, row-`1`,
negative, out-of-byte-range, missing-name, or stale state is retained for
preservation but is not editable.

A changed target projects exactly:

```json
{
  "kind": "creature",
  "sourceIndex": 0,
  "phenotype": {
    "expectedValue": 0,
    "value": 5,
    "tableSha256": "<exact phenotype.2da sha256>",
    "rowCount": 9,
    "appearanceExpectedValue": 18,
    "appearanceTableSha256": "<exact appearance.2da sha256>",
    "appearanceRowCount": 1000
  }
}
```

The authenticated additive catalog endpoint is
`GET /api/v1/catalog/creatures/phenotypes`. It requires both exact table
identities and the retained Appearance row, then proves `MODELTYPE=P` before
returning bounded Toolset-admitted physical rows.

## Implementation closure

The offline implementation now includes:

1. exact presence-sensitive `Phenotype : Int` Area parsing and immutable
   module/ordered-HAK/vanilla table binding;
2. whole-table first-hit resolution, logical `NAME` parsing, TLK presentation,
   physical row preservation, and explicit row-`1` exclusion;
3. authenticated backend catalog, frontend HTTP validation, facade, immutable
   two-table provenance, search, reducer, and materialization;
4. numeric `phenotypeId` scene state, normalization, history cloning,
   workspace-draft validation, `ACTIVE_NOW` selector, and visible
   `PRESERVE_ONLY` failure state;
5. exact-source projector, independent deletion planner, fresh compiler
   admission, one-field `Int` writer, readback validation, and rejection of a
   simultaneous Appearance mutation;
6. renderer override and cache fingerprint propagation; a phenotype change
   rebuilds part-model candidates under the new native model prefix rather
   than reusing stale phenotype-0 candidates;
7. capability-catalog evidence and explicit browser/Toolset/NWN blockers.

Bounded verification on this working tree passed:

- backend production build;
- 137 focused backend assertions across the new domain/effective-table/catalog
  admission, process schema, renderer projection helpers, and capability catalog;
- frontend production build;
- 742 focused frontend assertions across domain/provenance, HTTP Area and
  Creature-catalog mapping,
  scene mapping and normalization, workspace validation/clone/drafts, dialog,
  renderer payload override, and capability-catalog contract alignment.

These counts are the explicitly executed focused files, not a repository-wide
test or release-proof claim.

## Completion boundary

The slice is offline implemented. Release remains blocked until a separately
coordinated, resource-safe proof window records fresh browser renderer
readback, native Toolset Save/Build/reopen, and NWN runtime evidence under the
proof-capture safety contract. No live proof is claimed by this document.
