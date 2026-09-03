# Dynamic effective-catalog Item UTI construction audit v1

Date: 2026-08-30  
Status: **source-closed; offline implementation verified; live release proof pending**

## Scope

This audit replaces the single frozen `nw_cloth022` Area-addition limitation
with a hash-bound effective-catalog UTI profile. It covers construction of one
new type-`0` ground Item from an actual current effective `item` catalog
winner, its complete common Item state, effective-`baseitems.2da` appearance,
ordered `PropertiesList`, canonical `VarTable`, source editor Comment, and
scene placement.

The profile also admits canonical non-empty blueprint `ItemList` and
`Equip_ItemList` through the recursively resolved effective-UTI closure and
embedded-instance construction contract frozen in
`area-item-dynamic-nested-inventory-construction-audit-v1-2026-08-30.md`.
Fresh live Toolset/NWN proof remains a separate release gate.

## Primary Aurora authority

The primary source is the frozen Aurora decompilation:

- `C:/Projects/New Folder/export/decompiled_all.c`;
- SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
- common Item reader/writer `FUN_00604db8` / `FUN_00605b0c`, beginning near
  lines 299920/300282;
- Area ground-Item reader/writer `FUN_006077a8` / `FUN_00607ccc`, beginning
  near lines 301397/301621;
- UTI wrapper reader/writer lineage ending in `FUN_00648ec8`, beginning near
  line 337710;
- inventory reader and reference/embedded writers `FUN_0052ad40`,
  `FUN_0052b920`, and `FUN_0052b55c`, beginning near lines
  189085/189590/189445.

The UTI wrapper writes the common Item, an optional reference-form
`ItemList`/`Equip_ItemList`, UTI-only `PaletteID`, and UTI editor `Comment`.
This corrects the shorthand in the earlier phantom-field audit, which did not
enumerate the optional inventory wrapper call. The ground-Item writer writes
placement, paired GIC Comment, the common Item, optional embedded inventory,
and generic instance data. Ground Items remain root `List` type-`0` records.

No xoreos source or other GPL source was inspected or used.

## Aurora common-Item semantics

The reader applies these source defaults before the writer emits canonical
instance fields: `BaseItem=0`, empty TemplateResRef and Tag, empty localized
strings, `Charges=50`, `Cost=0`, `AddCost=0`, `Stolen=0`, `StackSize=1`,
`Plot=0`, `Identified=0`, and `Cursed=0`. The writer always emits the common
state and a `PropertiesList`; `VarTable` is emitted only when non-empty.

`BaseItem : Int` selects a physical row of the current effective
`baseitems.2da`. Its numeric `ModelType` selects exactly one canonical ground
instance appearance profile:

1. type `0`: `ModelPart1 : Word`;
2. type `1`: `ModelPart1 : Word` plus six material-color Bytes;
3. type `2`: `ModelPart1..3 : Word`;
4. type `3`: 19 `ArmorPart_* : Word` values plus six material-color Bytes.

The UTI reader uses zero defaults for absent appearance values. Legacy source
UTIs may physically carry a Byte where the reader widens the value; the
ground-instance writer emits the canonical Word profile above. Duplicated,
aliased, wrong-case, nonnumeric, or out-of-range appearance members fail
closed instead of selecting behavior by asset identity.

Each source `PropertiesList` child is type `0`. Aurora defaults missing child
members to `PropertyName=0`, `Subtype=65535`, an implementation-initialized
CostTable Byte, `CostValue=0`, `Param1=255`, `Param1Value=0`, and
`ChanceAppear=100`, then writes all seven canonical fields. Aurora Web keeps
the already frozen property-48/CostTable-24 invariant and 4096-entry bound.
Canonical variables retain the shared integer/float/string VarTable contract.

## Frozen dynamic profile

The profile ID is `effective-catalog-uti-item-copy-v1`. An addable catalog row
must have an actual effective `uti` object and exact primitive metadata:

- stable catalog `templateId`;
- native `templateResRef` and Tag;
- `sourceObjectKey`, lowercase SHA-256, and byte size;
- `sourceExtension=uti`, `sourceFileType=UTI `,
  `sourceFileVersion=V3.2`, and root type `0xffffffff`.

The client retains those values as immutable binary-free
`source.aurora_blueprint` provenance. It does not send GFF bytes, object-store
credentials, or a host path. Compilation re-resolves the current effective
catalog winner by kind and stable template ID, then requires the same object
key, digest, native ResRef, Tag, and GFF identity. Source-precedence or content
drift is a stale conflict.

The writer accepts at most 1 MiB per UTI and independently reparses the bytes.
Unknown root fields, duplicate/case-aliased fields, wrong native types,
noncanonical properties, variables, inventory references, or equipment slots
fail closed. Admitted lists are recursively expanded into complete embedded
GIT instances under the frozen depth/count/byte limits. `PaletteID` is never copied to GIT. UTI Comment becomes the
ordinal-matched GIC Comment. Only position and bearing come from the scene.
All common Item values come from the source/default semantics above.

## Mapping and determinism

The GIT record begins with float32 `X/Y/ZPosition` and
`XOrientation=cos(bearing)`, `YOrientation=-sin(bearing)`, then the common
Item writer order and canonical appearance selected by effective ModelType.
`PropertiesList` and optional non-empty `VarTable` preserve order. The paired
GIC type-`0` record contains only source editor Comment. Identical immutable
inputs must produce byte-identical GIT/GIC output and independent readback.

The existing global 1024-addition limit, Area optimistic lock, idempotency,
transactional ARE/GIT/GIC/IFO publication, rollback, and recovery contracts
remain unchanged. No endpoint, API-major version, streaming protocol, or
public binary-read surface is added.

## Diagnostics

The implemented additive low-cardinality event is
`area_dynamic_item_blueprint_copy.v1`. A dedicated application port and Nest
logging adapter distinguish catalog resolve, source identity, GFF parse,
effective BaseItem admission, common-profile admission, write, and readback.
Stable result codes distinguish missing catalog, stale winner, wrong
family/identity, size/GFF failure, missing BaseItem row, inconsistent catalog,
malformed common/property/variable/reference profile, missing/stale/extra
dependency, dependency BaseItem failure, resource-budget failure, and
candidate-pair rejection. Successful candidate generation records all seven
ordered stages. Telemetry is emitted once per unique immutable source
resolution used by the candidate.

Events and metric labels do not contain template IDs, ResRefs, Tags, hashes,
source keys, paths, object IDs, localized text, variable/property values, raw
fields or bytes, credentials, or host paths. Telemetry failure never changes
validation, writing, transaction, rollback, recovery, or publication; this is
covered by a sink-failure compilation test.

## Completion gates

Offline completion requires red-first domain/projector/compiler/repository
tests, all four ModelType writer profiles, defaults, PropertiesList and
VarTable round trips, stale identity tests, deterministic paired readback,
frontend catalog provenance/drag-drop/draft tests, regression smoke, and both
bounded production builds.

The offline gates are satisfied. Accepted resource-bounded evidence is
`17/17` dynamic writer assertions, `572/572` projector assertions, `142/142`
candidate-compiler assertions, `63/63` effective-template repository
assertions, `13/13` capability-catalog assertions, `7/7` module-wiring
assertions, `37/37` focused frontend provenance/mapper/placement assertions,
and `42/42` workspace regression-smoke assertions. Backend and frontend
production builds pass under the one-GiB Node heap ceiling. The regression
suite still prints pre-existing React `act(...)` warnings but has no failed
assertions.

Release completion additionally requires fresh guarded browser Save/reopen,
packed GIT/GIC readback, Toolset Save/Build/reopen, and NWN inspection. Those
live gates remain separate and unverified until captured.
