# Existing Area ground-Item `BaseItem` and appearance audit v1

Status: **source-closed; contract frozen; offline implementation complete; live proof pending**.

## Scope

This audit defines one catalog-bound compare-and-swap mutation for the native
`BaseItem` and its complete common Item appearance vector on one retained
type-`0` ground Item in an Area GIT. It covers cross-`ModelType` transitions
only when the client supplies a complete explicit target vector. It does not
activate `PaletteID`, cloak-only extension fields, pricing fields outside the
already closed instance-state vector, inventory/equipment, or arbitrary UTI
creation.

## Primary Aurora evidence

The primary source is:

- `C:\Projects\New Folder\export\decompiled_all.c`
- SHA-256:
  `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`
- common Item reader: `FUN_00604db8`, address `0x00604db8`, beginning near
  line 299920;
- common Item writer: `FUN_00605b0c`, address `0x00605b0c`, beginning near
  line 300282;
- retained ground-Item parent reader/writer: `FUN_006077a8` /
  `FUN_00607ccc`.

The reader loads `BaseItem` through the signed 32-bit GFF integer helper with
default `0`, resolves the corresponding base-item definition through
`FUN_0050418c`, and derives an internal model profile before reading appearance
members. The writer always emits `BaseItem` through the same signed integer
family and selects the serialized appearance field set from that resolved
profile.

The retail table used to verify the physical row contract is:

- `C:\Projects\New Folder\item-retail-extract\2da\baseitems.2da`
- SHA-256:
  `3FBDCD012B55F0B869C6324CC7D4ECE44ED63A78F00E7889E7ACEFAC28C8FDF4`
- canonical columns include `Name`, `label`, `ModelType`, and `ItemClass`;
- `ModelType` is the numeric physical-row value `0`, `1`, `2`, or `3`.

No xoreos source or other GPL source was inspected or used.

## Native appearance profiles

The common reader and writer agree on the following exact case-sensitive
field profiles:

1. `ModelType=0`: `ModelPart1:Word`.
2. `ModelType=1`: `ModelPart1:Word`, followed by
   `Leather1Color`, `Leather2Color`, `Cloth1Color`, `Cloth2Color`,
   `Metal1Color`, and `Metal2Color`, each `Byte`.
3. `ModelType=2`: `ModelPart1`, `ModelPart2`, and `ModelPart3`, each `Word`.
4. `ModelType=3`: the 19 `ArmorPart_*:Word` members in native writer order,
   followed by the same six material-color bytes.

All appearance reader calls use explicit zero defaults, but this contract does
not synthesize missing source members. Mutation authority requires one exact
physically complete source profile for the source row's effective
`ModelType`. A cross-profile target is admitted only when the target contains
every member of the target profile and no member of another profile.

## Effective `baseitems.2da` authority

The mutation is bound to the strongest complete effective resource selected in
Aurora order: module, ordered HAK, then vanilla. A descriptor contains exact
resource name, object key, source layer, SHA-256, byte size, and physical row
count. Rows expose physical row index, numeric `ModelType`, and bounded display
metadata. A merged first-seen lookup or the development retail fallback is not
write authority.

The source and target `BaseItem` must both name actual rows in the same exact
effective table. The compiler re-resolves that table immediately before the
candidate write and rejects descriptor drift, a missing row, or a changed
`ModelType`.

## Contract and CAS invariants

Area detail exposes:

- one bounded `itemBaseItemCatalog` for the effective table; and
- on a retained Item, `itemBaseAppearance` containing the immutable exact
  source value and the same table digest/count.

A changed Item may add one member to its existing property mutation:

```text
baseAppearance = {
  expectedValue,
  value,
  tableSha256,
  tableRowCount
}
```

Each value is a discriminated `modelType` `0..3`, one physical non-negative
signed-32 `baseItem`, and the complete exact appearance object for that model
type. Source and target must differ. Values, field order, descriptor identity,
source ordinal, and family are compare-and-swap state.

The writer replaces the single exact `BaseItem:Int`, removes only the complete
recognized source appearance profile, inserts the complete target profile in
native writer order immediately after the common Item state fields, and
preserves every unrelated GIT field and all GIC bytes unless an independent
editor-Comment mutation is also present. Candidate readback must reproduce the
exact target vector before revision-fenced atomic publication.

## Fail-closed cases

Mutation is rejected for an absent, duplicated, aliased, wrong-case, wrongly
typed, negative, or non-signed-32 `BaseItem`; a missing or malformed catalog;
an unresolved physical row; an invalid `ModelType`; incomplete, extra,
duplicated, stale, or out-of-range appearance members; descriptor drift;
unchanged source/target vectors; wrong family or ordinal; mutation/deletion
collision; or preservation/readback drift.

Loose `itemMetadata`, template metadata, the Items-mode catalog response,
labels, model resrefs, preview state, and construction-profile identities never
grant write authority.

## Budgets and diagnostics

- effective source: at most 16 MiB and 4096 rows;
- source object key: at most 2048 code units;
- label/display string: at most 256/1024 code units;
- one mutation member: below 8 KiB;
- Area-detail catalog JSON: hard budget 2 MiB;
- no streaming, chunking, binary body, endpoint, or API-major change.

The additive diagnostic event is `area_item_base_appearance_cas.v1`. It exposes
only contract revision, Item family, bounded stage, outcome, stable reason,
source/target model types, changed-field count, row count, and duration. It
must not expose row values, object identity, ordinal, digest, path, source key,
raw GFF fields/bytes, credentials, or host paths.

## Completion gates

Offline completion requires parser/domain malformed-input tests, projection,
planner, paired-writer round trip, authoritative catalog revalidation,
candidate readback, preservation tests, frontend contract/mapping/history and
dialog tests, focused regression smoke, and both production builds.

Release completion additionally requires a fresh guarded browser
Apply/Save/reopen capture, exact-candidate Toolset Save/Build/reopen with packed
GFF readback, and NWN inspection. Those live gates remain independent and
missing until recorded.

## Offline implementation checkpoint — 2026-08-30

The backend now resolves one exact effective `baseitems.2da`, binds retained
Item provenance to its digest and row count, projects the complete CAS pair,
revalidates the table before compilation, writes the native profile atomically,
and performs whole-candidate readback before publication. Focused domain,
parser, projection, planner/writer, compiler, snapshot-repository, cache, and
application-service suites pass, and the backend production build passes.

The frontend now validates and clones the exact API catalog/provenance,
fail-closes stale bindings while mapping an Area scene, keeps immutable source
provenance separate from the editable target, materializes the exact target
profile into the renderer-facing Item fields, and exposes a retained-Item
`Base Item` selector. Controls are activated only for the selected row's
numeric `ModelType`. A cross-profile selection clears the old profile fields,
so Apply/OK remain disabled until every target member is supplied explicitly.

The focused frontend checkpoint passes 831 assertions across domain,
HTTP-boundary, scene-mapper, draft-boundary, cloning, materialization, dialog,
and App-level regression-smoke coverage. The frontend production build also
passes. No watcher, development server, Docker command, browser capture,
Toolset session, or NWN session was started for this offline checkpoint.
