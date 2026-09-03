# Item root phantom fields and serialization audit v1

Date: 2026-08-30  
Status: **source-closed; contract frozen; offline implementation complete; live proof pending**

## Scope

This audit separates native common Item root fields from Item-property child
fields and closes an unsafe Aurora Web authoring ambiguity. It applies to Item
blueprint create/update publication, construction of new type-`0` ground Items
in an Area GIT, and common embedded Item serialization in creature, placeable,
and store inventories. Existing unknown root members remain opaque preserved
data; this audit does not authorize rewriting or deleting them from retained
resources.

## Primary Aurora authority

The primary source is the frozen Aurora Toolset decompilation:

- `C:/Projects/New Folder/export/decompiled_all.c`;
- SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
- common Item reader `FUN_00604db8`, beginning near line 299920;
- common Item writer `FUN_00605b0c`, beginning near line 300282;
- UTI wrapper writer `FUN_00648ec8`, beginning near line 337710;
- Area ground-Item writer lineage `FUN_00607ccc` as frozen by
  `area-item-construction-audit-v1-2026-08-13.md`.

The common reader/writer pair contains root `Cost` and `AddCost`, but no root
`CostTable` or `CostValue`. The only `CostTable`/`CostValue` reads and writes in
that lineage are inside each type-`0` `PropertiesList` child struct:

| owner | label | GFF type |
|---|---|---|
| Item root | `Cost` | DWord |
| Item root | `AddCost` | DWord |
| `PropertiesList[]` | `CostTable` | Byte |
| `PropertiesList[]` | `CostValue` | Word |

The UTI wrapper writes the common Item profile, then UTI-only `PaletteID` and
`Comment`. It does not write Item event-script slots. The common Item writer
uses `LocalizedName`, signed GFF Int `BaseItem`, and Byte `Charges`. The frozen
retail `nw_cloth022.UTI` readback independently confirms those three labels and
types in
`evidence/area-item-construction-2026-08-13/base-uti-source-readback.json`.

No xoreos or other GPL source was read or used.

## Frozen contract

1. Item blueprint create/update rejects unknown root keys, including
   `costTable`, `costValue`, and `scripts`.
2. `propertyList[].costTable` and `propertyList[].costValue` remain admitted
   with their exact Byte/Word ranges.
3. The UTI serializer never emits root `CostTable`, root `CostValue`, or Item
   event-script labels, even when a forged internal value carries them.
4. New ground-Item GIT construction never emits `PaletteID`, blueprint
   `Comment`, root `CostTable`, root `CostValue`, or Item event-script labels.
   Ground-Item editor comments belong to the ordinal-matched GIC record.
5. Common embedded Item serialization in creature, placeable, and store
   inventory records also omits the three non-native root families while
   retaining `PropertiesList` child costs.
6. The UTI serializer writes `LocalizedName : CExoLocString`, `BaseItem : Int`,
   and `Charges : Byte`.
7. The frontend exposes no root Cost Table/Cost Value controls and never adds
   the three rejected root families to a blueprint request. The existing
   `PropertiesList` editor remains unchanged.
8. Broad parsers may retain compatibility metadata for inspection and
   byte-preserving round trips. Compatibility metadata is not mutation
   authority.

## Failure and diagnostics contract

The HTTP boundary is strict. A request containing any rejected root key fails
before application service or writer execution through the existing request
validation error path. Serializer regression tests also forge internal input
to prove that a boundary bypass cannot publish the fields. No fallback,
aliasing, silent root-to-property migration, or guessed default is permitted.

## Completion criteria

- strict backend request tests cover all three rejected root families and one
  accepted nested property vector;
- UTI, common embedded Item, and ground-Item GIT writer tests prove the
  negative root profile and the positive nested property profile;
- frontend payload and dialog tests prove that the phantom controls and request
  keys are absent;
- focused one-worker tests and production builds pass under the repository
  one-GiB heap ceiling;
- live Toolset Save/Build/reopen proof remains a separate release gate.

## Offline implementation checkpoint

The backend HTTP boundary is strict for new UTI create/update commands. The
application command and builder no longer carry the rejected root fields. The
UTI writer emits native `LocalizedName`, signed `BaseItem`, and Byte `Charges`
types; both the UTI/common embedded writer path and the new Area ground-Item
writer omit forged root costs and scripts while retaining child-property
costs. Compatibility parsing remains deliberately broader than mutation.

The frontend create payload type and wizard mapper omit the rejected families.
The Item Properties dialog no longer renders root Cost Table or Cost Value
controls; the existing `PropertiesList` Cost Table/Cost Value columns remain
available because they are native child members.

Accepted bounded evidence is `47/47` backend assertions across UTI, ground
Item, request-schema, common embedded round-trip, and catalog update tests plus
`56/56` frontend assertions across dialog, payload, materialization, and HTTP
adapter regressions. Backend and frontend production builds pass under a
one-GiB Node heap. The ordinary broad Jest preset reached that intentional
heap ceiling during the initial red-test run and is not accepted as evidence;
all accepted backend checks used the one-worker bounded preset.

No Docker command, service, watcher, browser, capture, Toolset/NWN process,
mutation test, sub-agent, xoreos source, or other GPL source was used. Fresh
Toolset Save/Build/reopen and applicable packed-resource readback remain open
release proof.
