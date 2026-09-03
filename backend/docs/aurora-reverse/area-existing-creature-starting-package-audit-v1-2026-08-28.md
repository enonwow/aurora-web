# Existing Area Creature `StartingPackage` audit v1

Date: 2026-08-28  
Status: offline source-closed, implemented, and bounded-backend verified; live
release proof pending

## Decision

Aurora Web may expose the exact existing `StartingPackage : Byte` of one
retained type-`4` Area GIT Creature only as a class-filtered,
`packages.2da`-bound compare-and-swap mutation. The persisted value is the
physical package-table row ordinal, not a boolean. The existing web checkbox
model is therefore not persistence-compatible and must not authorize a
retained-Creature write.

The selector is editable only when the canonical Byte is present exactly once,
the complete canonical `ClassList` supplies at least one exact non-negative
`Class : Int`, and the retained plus target package rows are admitted by the
same immutable effective table for one of those class IDs. Missing storage is
distinct from native default `0` and never authorizes field creation.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| frozen Toolset RCDATA report | `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa` |
| retail `TDLGCREATUREEDIT` RCDATA payload | `75e2dcfd5b0886dbb13bfb7cb32290ccce842cada84cfb806510abde52e7820e` |
| retail `packages.2da` from `nwn_base.key` | `e3a1565caa21b606817cbe950de01eb242dd044e618ef2ddac86256e7ff23464` |

The independently extracted retail table is 30,510 bytes with 132 physical
rows and exact header
`Label Name Description ClassID Attribute Gold School Domain1 Domain2 Associate SpellPref2DA FeatPref2DA SkillPref2DA Equip2DA Soundset PlayerClass`.
Rows `68` and `69` are blank; the other 130 retail rows have package identity,
display StringRef, and class identity. The final physical row is `131`, so the
entire retail table fits the lossless Byte domain.

One broad local discovery search unintentionally returned unrelated snippets
from a checked-out xoreos reference directory. Those snippets were discarded
immediately and did not contribute to any finding, contract, or code. Every
claim in this audit derives from the Aurora decompilation, Toolset resources,
or retail KEY/BIF bytes listed above.

## Native GFF closure

The common Creature reader `FUN_00532174` reads exact case-sensitive
`StartingPackage` through Byte reader `FUN_00aeed68` at decompiled lines
`194496-194497`, with native default `0`, into Creature offset `+0xC8`.
The reciprocal common writer `FUN_0053521c` writes that same byte and exact
label through `FUN_00aefd1c` at line `195173`. The established placed-Creature
lineage uses those common routines; paired GIC does not own the member.

The same common Creature reader opens canonical `ClassList`. For each retained
entry it reads `ClassLevel : Short` and `Class : Int` at lines
`194839-194864`. The common writer emits canonical `Class : Int` and
`ClassLevel : Short` at lines `195288-195296`. A package admission decision
must therefore use exact native class IDs, not localized class names or the
current frontend labels.

## Toolset selector closure

Retail `TDLGCREATUREEDIT` identifies `cbStartingPackage` under the Classes tab
with the visible label `Package`. The form stores that control at object offset
`+0x96C`. Loader `FUN_00445b08` opens global table `Packages`, clears the
control, obtains the selected IDs of all eight class controls, and subtracts
their one-based UI sentinel. It iterates every physical package row, reads
exact `ClassID`, and admits the row only when that value equals one current
Creature class ID.

For an admitted row the loader first attempts numeric `Name` and localizes the
result. When `Name` is not numeric, it requires usable fallback `Label`.
The physical loop index is stored as ComboBox item data; skipped rows are not
renumbered. Every class-control change calls `FUN_00445b08`, so the package
selector is dynamically coupled to the current class set.

Creature dialog load `FUN_0044b110` maps the retained byte at offset `+0xC8`
back through ComboBox item data at lines `70087-70099`. If no exact item is
found but the filtered list is non-empty, it selects the first admitted row
for presentation. Aurora Web must not turn that fallback into source
provenance. Dialog save `FUN_0044d360` writes item data to offset `+0xC8` at
lines `70879-70887`, or writes `0` only when there is no selected item.

This proves a physical-row selector with class-dependent admission. It does
not prove that a checkbox, label match, response position, or defaulted first
row represents native storage.

## Frozen additive contract

Area detail may add exact storage shaped as:

```ts
type CreatureStartingPackageStorage =
  | { present: false }
  | {
      present: true;
      nativeType: "byte";
      value: number;
      classIds?: readonly number[];
      table?: {
        resourceName: "packages.2da";
        sourceObjectKey: string;
        sourceLayer: "module" | "hak" | "vanilla";
        sha256: string;
        sizeBytes: number;
        rowCount: number;
        rowIndex: number;
        classId: number;
      };
    };
```

When present, `classIds` preserves canonical `ClassList` order, is bounded to
eight entries, and contains exact non-negative Int values. Malformed or
ambiguous ClassList state omits that dependency and remains preserve-only
without losing the exact StartingPackage byte. A table binding is attached only
when the stored physical row is in `0..255`, has an exact non-negative
`ClassID` matching at least one source class ID, and has either numeric
`Name` or usable `Label` display provenance. Physical `rowIndex` remains the
only persistence identity.

The strongest complete effective `packages.2da` wins in module,
ordered-HAK, then vanilla order. Rows are never merged. A stronger present but
malformed resource blocks weaker fallback. Input is bounded to 16 MiB and at
most 256 physical rows so every admitted row remains lossless in the native
Byte. Sparse unusable rows are omitted without renumbering.

The authenticated additive catalog endpoint is
`GET /api/v1/catalog/creatures/starting-packages`. Requests bind the current
table digest, exact immutable class IDs, bounded pagination, and either bounded
text search or one physical row. Responses contain the immutable descriptor
and admitted rows only.

The frontend target is numeric
`creatureProperties.advancedSettings.startingPackageId`. The legacy boolean
`startingPackage` may remain presentation-only for backward compatibility but
cannot authorize a retained write. A changed target projects:

```json
{
  "kind": "creature",
  "sourceIndex": 0,
  "startingPackage": {
    "expectedValue": 4,
    "value": 23,
    "expectedClassIds": [4],
    "tableSha256": "<exact packages.2da sha256>",
    "rowCount": 132
  }
}
```

Planning reparses exact canonical `StartingPackage:Byte` plus the complete
canonical `ClassList` class IDs and compares both expected values. Compilation
independently resolves the strongest current table and revalidates descriptor,
retained row, target row, and class admission. Writing replaces only the
existing Byte, preserves every sibling GIT field and byte-identical GIC, ARE,
and IFO, and requires complete candidate readback.

## Offline implementation status

The bounded retained-field lane is implemented through exact GFF parsing,
ClassList capture, strongest-layer `packages.2da` resolution, authenticated
class-filtered catalog transport, detached frontend provenance, numeric dialog
selection, guarded reduction/materialization, source plus ClassList
compare-and-swap, fresh compiler admission, Byte-only GIT replacement, and
candidate readback. The Area Update publisher continues to preserve paired
GIC, ARE, and IFO bytes outside the changed GIT resource.

The focused frontend package covers strict domain parsing, HTTP transport,
scene mapping, workspace admission, deep cloning, facade/provenance behavior,
and the dialog's `ACTIVE_NOW`/`PRESERVE_ONLY` boundary. Backend application
source and frontend application source typechecks pass under the repository
1 GiB Node heap ceiling. Dedicated domain/table/admission, projection,
immutable-ordinal planning, Byte-only writing/readback, and compiler-routing
cases now pass through `test:unit:bounded` as part of the combined `117/117`
Creature catalog-property gate. Capability revision `2026-08-28.94` therefore
removes the backend StartingPackage Jest blocker without changing any live
proof status.

## Completion boundary

This audit authorizes only retained existing-field package selection. It does
not authorize ClassList editing, level-up package application, generated
skills/feats/spells/equipment, arbitrary Creature-template creation, missing
field creation/removal, or any label-based write. Fresh guarded browser
Apply/Save/reopen, exact-candidate Toolset Save/Build/reopen with packed
Byte/ClassList readback, and NWN `GetCreatureStartingPackage` behavior remain
release gates. No live proof is claimed.

## Resource/process statement

The intended evidence work used read-only decompilation, Toolset resources,
and one bounded production KEY/BIF reader process. The installed Toolset and
NWN were not started. No Docker command, container, service, watcher, browser,
capture, Chrome, or mutation test was used.
