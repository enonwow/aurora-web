# Existing Area Creature `PerceptionRange` audit v1

Date: 2026-08-28  
Status: offline source-closed and implemented; live release proof pending

## Decision

Aurora Web may expose the exact existing `PerceptionRange : Byte` field of one
retained type-`4` Area GIT Creature as a catalog-bound compare-and-swap
mutation. The persistence identity is the physical row ordinal of the one
effective complete `ranges.2da`; display labels, localized TLK text, range
distances, and legacy frontend strings are never persistence authority.

The retail Toolset does not enumerate this table. It attempts exactly physical
rows `8`, `9`, `10`, and `11`, reads logical column `Name`, resolves that
StringRef through the current talk table, and stores the exact row ordinal as
ComboBox item data. Module and ordered-HAK overrides may replace the complete
table, but they cannot expand this Toolset selector beyond those four rows.

Missing exact storage remains distinct from the native reader default `11`.
It must remain preserve-only and does not authorize field creation.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| frozen Toolset RCDATA report | `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa` |
| retail `TDLGCREATUREEDIT` RCDATA payload | `75e2dcfd5b0886dbb13bfb7cb32290ccce842cada84cfb806510abde52e7820e` |
| retail `ranges.2da` from `nwn_base.key` / `base_2da.bif` | `b25a93da8e7a89d9f20665fcca527fd2ad9a91e41564ecd471b6f921f56260a3` |
| retail English `dialog.tlk` | `1d6da70e0659e411012b44f956a093cc8fb61aed3b9355198ba42eb17e0649c9` |
| retail Polish `dialog.tlk` | `57ad772de605f0f13aebe63c6491ca65d76cce206b139eaa018350a9a5aea764` |

The RCDATA is the 52,662-byte `TPF0` resource `TDLGCREATUREEDIT` at RVA
`0x00AE4698`. The inspected `ranges.2da` is the 1,220-byte resource index `518`
in `base_2da.bif`; `nwn_retail.key` does not contain another `ranges` resource.

No xoreos or other GPL source was inspected or used.

## Native GFF closure

The common Creature reader `FUN_00532174` reads exact case-sensitive label
`PerceptionRange` through `FUN_00aeed68` at decompiled lines
`194725-194726`. That helper is the native GFF type-id-`0` Byte reader. It uses
default `0x0B` (`11`) when the exact field is absent and stores the result at
Creature offset `+0x108`.

The common Creature writer `FUN_0053521c` writes the low byte at the same
offset through `FUN_00aefd1c` at line `195239`, under the same exact label and
native Byte type. Area parsing and writing must therefore preserve exact case,
presence, native type, and the source byte for unchanged round-trip. The paired
GIC record does not own this field and remains byte-identical for a
PerceptionRange-only mutation.

## Toolset selector closure

The Creature editor owns ComboBox `cbPerceptionRange` at form offset `+0x75c`.
Its immutable RCDATA has no `OnChange` callback; the value is materialized only
through dialog load/save.

Population routine `FUN_0044a85c` loads resource `RANGES` at lines
`68930-68940`. Raw bytes at Toolset VA `0x00BB1E0A..0x00BB1E28` close the
adjacent strings as `RANGES` followed by four copies of `Name`. The routine
then attempts exactly these physical rows:

| Physical row | `Name` read | localized text add | stored item data |
| ---: | --- | --- | ---: |
| 8 | lines `68981-68987` | lines `68988-69003` | 8 |
| 9 | lines `69037-69043` | lines `69044-69059` | 9 |
| 10 | lines `69093-69099` | lines `69100-69115` | 10 |
| 11 | lines `69149-69155` | lines `69156-69171` | 11 |

A row is omitted when its `Name` cell cannot be read. Dialog load
`FUN_0044b110` searches ComboBox item data for the exact Creature value and
selects the matching item at lines `69776-69779`. Dialog save
`FUN_0044d360` obtains the selected item and writes its item data unchanged to
Creature offset `+0x108` at lines `71035-71040`. If the dialog has no selected
item, that save block performs no replacement.

This proves that list order, localized text, `Label`, `PrimaryRange`, and
`SecondaryRange` cannot identify a write. Only one of the four admitted
physical row ordinals can.

## Retail table and TLK evidence

The retail table header is:

```text
Label  PrimaryRange  SecondaryRange  Name
```

The Toolset-admitted rows are:

| Byte/physical row | Label | PrimaryRange | SecondaryRange | `Name` StringRef | English TLK | Polish TLK |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 8 | `PercepRngShrt` | 10 | 10 | 6668 | `Short` | `Krótki` |
| 9 | `PercepRngMed` | 20 | 20 | 6669 | `Medium` | `Średni` |
| 10 | `PercepRngLng` | 35 | 20 | 6670 | `Long` | `Daleki` |
| 11 | `PercepRngDefault` | `****` | `****` | 6671 | `Default` | `Domyślne` |

These labels are evidence for the inspected retail resources, not hardcoded
current-module authority. The existing frontend guesses `Near`, `Far`, and
`Infinite` are not native rows and must be removed from the retained selector.

## Frozen implementation contract

Area detail preserves exact storage:

```ts
type CreaturePerceptionRangeStorage =
  | { present: false }
  | {
      present: true;
      nativeType: "byte";
      value: number;
      table?: {
        resourceName: "ranges.2da";
        sourceObjectKey: string;
        sourceLayer: "module" | "hak" | "vanilla";
        sha256: string;
        sizeBytes: number;
        rowCount: number;
        rowIndex: 8 | 9 | 10 | 11;
      };
    };
```

Only an exact stored Byte in `{8,9,10,11}` whose same physical row has one
usable positive `Name` StringRef in the strongest complete effective table
receives `table`. Missing, duplicate, aliased, wrong-case, wrong-type,
out-of-selector, missing-name, malformed-table, or unavailable-table state is
retained for preservation but is not editable.

Effective resolution is complete-resource first hit in module, ordered HAK,
then vanilla order. Rows are never merged. A stronger present but malformed
resource blocks weaker fallback. Resource input is bounded to 64 MiB and at
most 1,000,000 physical rows.

The frontend writable identity is numeric
`creatureProperties.advancedSettings.perceptionRangeId`. The legacy string
`perceptionRange` remains presentation-only. A changed target projects:

```json
{
  "kind": "creature",
  "sourceIndex": 0,
  "perceptionRange": {
    "expectedValue": 11,
    "value": 9,
    "tableSha256": "<exact ranges.2da sha256>",
    "rowCount": 12
  }
}
```

The authenticated additive catalog endpoint is
`GET /api/v1/catalog/creatures/perception-ranges`. It is bound to the requested
table digest and returns only the currently admitted subset of physical rows
`8..11` with bounded localized presentation. Candidate compilation must
re-resolve the current strongest table and reject digest, row-count, or target
row drift before one-field Byte replacement and complete-candidate readback.

## Explicit exclusions

- This slice does not alter Creature `WalkRate`. Static findings show that
  field uses exact native `Int`, a missing-field fallback through Appearance
  `MOVERATE` / `creaturespeed.2da`, and a direct Toolset ordinal mapping. Its
  current frontend labels/order are also not authoritative, but that coupled
  field remains a separate audit and implementation slice.
- This slice does not infer runtime AI sensing mechanics from the distance
  columns. It authors only the exact Toolset-selected stored row identity.
- It does not create or remove an absent native field and does not coerce an
  out-of-selector retained byte into a supported row.

## Offline implementation checkpoint

Capability catalog revision `2026-08-28.84` now binds this audit and records
the browser, Toolset, and NWN release blockers. The implemented path includes:

1. a bounded first-hit module, ordered-HAK, then vanilla `ranges.2da` resolver,
   immutable digest/count provenance, strict physical-row parsing, and no row
   merging or malformed-stronger fallback;
2. presence-sensitive Area GIT parsing, snapshot table binding, detached HTTP
   and scene cloning, and numeric advanced-settings draft identity;
3. authenticated digest-bound catalog query/controller/service/HTTP adapter,
   immutable frontend facade, exact-row recovery during filtered searches,
   duplicate rejection, and fail-closed stale/unavailable states;
4. guarded UI reduction and final materialization, exact source ordinal
   projection, fresh catalog admission, native ordinal reparsing, exact Byte
   compare-and-swap, complete candidate readback, and revision-fenced atomic
   publication;
5. one regression flow covering catalog load, `11 -> 9`, Apply, OK, reopen,
   and local Save while the retained source/table CAS remains unchanged.

Accepted backend verification includes `10/10` effective-table domain,
`17/17` storage, `4/4` fresh-catalog admission, `521/521` draft projector,
`857/857` paired writer, `224/224` Area parser, `367/367` ordinal planner,
`21/21` catalog-schema, `2/2` snapshot precedence, `1/1` snapshot Area
binding, `1/1` controller, `1/1` selected catalog-service, and `13/13`
capability-catalog assertions. The backend production build passed.

Accepted frontend verification includes `12/12` domain/facade/provenance,
`15/15` HTTP adapter, `1/1` Area-to-scene mapping, `5/5` workspace boundary,
`2/2` dialog, and `1/1` complete interaction regression assertions. The
frontend production build passed. The interaction regression found and closed
one stale React callback: the PerceptionRange reducer had captured the initial
null catalog and silently rejected otherwise valid selections.

The complete shared backend catalog-service file currently reports `176`
passing assertions and one unrelated existing VFX expectation that omits the
new `sourceModelHash`; the selected PerceptionRange service assertion passes.
A mistakenly broad frontend unit invocation was stopped after its script
expanded the requested file to all of `tests/unit`; before interruption it
reported two unrelated existing failures in placeable texture/render-package
expectations. Neither result is represented as a green full-suite gate.

## Completion boundary

The Aurora storage, Toolset selector, effective-table identity, implementation,
focused unit/regression verification, production builds, contract, capability
accounting, and program checkpoint are closed for this bounded offline slice.

Release remains blocked until a separately coordinated resource-safe window
records fresh browser Apply/Save/reopen, exact-candidate Toolset
Save/Build/reopen with packed `PerceptionRange:Byte` readback, and NWN runtime
evidence under the proof-capture safety contract. No live proof is claimed by
this document.

## Resource/process statement

This audit used read-only decompilation, PE/RCDATA byte inspection, retail
KEY/BIF extraction, read-only TLK parsing, sequential bounded one-shot tests,
and production builds. The accidentally expanded frontend unit process was
terminated by its owner and left no watcher or service. The installed Toolset
executable was never started. No Docker command, container, service, watcher,
browser, capture, Toolset/NWN process, mutation test, or external GPL source
was used.
