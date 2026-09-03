# Effective Area `loadscreens.2da` catalog audit v1

Date: 2026-08-24

## Decision

Aurora Web may expose one immutable, provenance-bound effective
`loadscreens.2da` catalog beside an Area detail response. The catalog resolves
the Area root `LoadScreenID : Word` as a physical table-row index; it does not
reinterpret the retained Word, create a missing field, or claim NWN runtime
display behavior.

The catalog may expose exact `Label`, `BMPResRef`, `TileSet`, and `StrRef`
cells, a bounded display label, and an optional immutable descriptor for the
effective TGA image resource named by `BMPResRef`. The selected 2DA and every
selected TGA are whole effective resources under module > ordered HAK >
vanilla precedence. Rows and resources are never merged across layers.

## Primary Aurora evidence

The primary artifact is
`C:\Projects\New Folder\export\decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.

- `FUN_004e050c`, lines 149814-150003, opens exact table name `loadscreens`.
  For a nonzero Area row it queries `StrRef` first and resolves it through the
  talk table; when that query is unavailable it queries `Label`. The Area
  caller at line 106614 passes the retained unsigned Word and Area-mode flag
  `1`.
- The same function special-cases Area row `0` at lines 149991-150000 and
  resolves talk-table strRef `0xf933` (63795), without consulting table row 0.
  The installed English `dialog.tlk` resolves 63795 to `Default`. The product
  still treats localized TLK text as optional provenance rather than a fixed
  English constant.
- `FUN_004e0a3c`, lines 150008-150033, constructs the `loadscreens` table used
  by the loading-screen dialog.
- `FUN_004e0e7c`, beginning at line 150217, reads the physical row count from
  the loaded table at line 150381 and iterates the ordinal `iVar2`. It queries
  `BMPResRef` at line 150425, checks the referenced resource through resource
  type `3` at line 150527, associates the admitted UI item with the same
  physical ordinal at line 150685, and optionally filters by the exact
  `TileSet` column at lines 150704-150741. `NWN_KEY_BIF_RESOURCE_TYPES.TGA = 3`
  independently identifies that resource type in the repository's retail KEY
  reader.
- Within the same enumeration path, lines 150573-150649 resolve `StrRef` first
  and fall back to `Label`. A row without a usable `BMPResRef` or effective TGA
  resource is not admitted to the native image chooser.

This establishes that the stored Word and chooser association use the
physical row ordinal, not the numeric token printed at the start of a 2DA
source line. The source row token is retained only as diagnostic provenance.

## Retail corroboration

Read-only extraction through the repository's `NwnKeyBifResourceReader` found
`loadscreens.2da` in installed `nwn_base.key` and not in `nwn_retail.key`.
The exact extracted resource has SHA-256
`24849fd9f809355f270c29529875a243ce3c0062389c384416218ffe05d52674`,
28,487 bytes, 334 physical rows, and the exact columns:

`Label ScriptingName BMPResRef TileSet StrRef`

The retail table has 270 rows with `BMPResRef`, 269 corresponding TGA
resources in `nwn_base.key`, 105 rows with `StrRef`, 272 rows with `Label`, and
266 rows with `TileSet`. All 334 retail source row tokens happen to equal their
physical ordinals, but the contract does not rely on that retail coincidence.
Row 258 (`SteamWork06`, `LS_TSW_09`) names the single retail TGA that is not
present in either installed KEY file and therefore remains visibly
unavailable rather than receiving a fabricated fallback.

No xoreos source or other GPL implementation was consulted.

## Additive v1 contract

Area detail may contain optional `loadingScreenCatalog` with exact
`schemaVersion = "area-loading-screen-catalog.v1"`, one immutable table
descriptor, and physical rows sorted by `rowIndex`.

The table descriptor is exactly
`{ resourceName, sourceObjectKey, sourceLayer, sha256, sizeBytes, rowCount }`,
where `resourceName` is `loadscreens.2da` and `sourceLayer` is
`module | hak | vanilla`.

Each row contains exact `rowIndex`, diagnostic `sourceRowId`, optional raw
`label`, `imageResRef`, `tileSetResRef`, and `strRef`, plus bounded
`displayName`, exact `displaySource`, and `toolsetSelectable`. An optional
`imageAsset` descriptor is exactly
`{ resourceName, sourceObjectKey, sourceLayer, sha256, sizeBytes }` and binds
the effective TGA bytes. `toolsetSelectable` is true exactly when a valid
`imageResRef` has an effective TGA descriptor. Missing image bytes leave the
row in the catalog with `toolsetSelectable = false`; they do not trigger a
weaker-layer or identity-based substitute.

For Area row 0, display resolution requests TLK strRef 63795 and uses
`displaySource = area_default_strref` only when bounded text resolves.
Otherwise it reports `Row 0` with `row_index`. Nonzero rows prefer a resolved
`StrRef`, then raw `Label`, then `Row N`. The application never uses Area,
tileset, filename, fixture, or catalog identity to choose different behavior.

The editor offers the explicit Area default value 0, every native-selectable
catalog row, and the retained current value when it is otherwise unresolved.
The numeric physical row remains storage truth. Selection reuses the existing
exact `LoadScreenID` CAS mutation; catalog data never enters a mutation body.

## Budgets and failure policy

- selected `loadscreens.2da`: at most 16 MiB and 4096 physical rows;
- source object key: at most 2048 ECMAScript code units and no NUL;
- raw label: at most 256 code units; resolved display: at most 1024;
- effective image: at most 16 MiB each, at most 512 distinct images, and at
  most 256 MiB of total image bytes inspected per catalog build;
- serialized catalog: at most 1 MiB;
- one Area-detail query response, with no pagination, chunking, streaming, or
  embedded image bytes.

Required columns must occur exactly once. Invalid physical-row coverage,
malformed numeric/ResRef cells, duplicate physical indices, an invalid source
descriptor, a violated I/O budget, or an oversized serialized result omits the
whole catalog. A malformed strongest 2DA or TGA never falls through to a
weaker resource. Individual blank or missing TGA references remain explicit
row states and do not invalidate an otherwise sound table.

## Diagnosability and remaining proof

Cache identity includes the complete catalog descriptor and rows. Diagnostics
may report schema version, source layer, table hash, row count, selectable
image count, unresolved current row, and a stable omission code. Logs must not
contain raw resource bytes, TLK text payloads, credentials, or host-local
paths.

This offline catalog and selector do not prove browser Save/reopen, TGA visual
presentation, Toolset Save/Build/reopen, or NWN loading-screen behavior. Those
remain separate fresh release gates. Storage success and label resolution must
not be reported as runtime display proof.

## Offline implementation checkpoint

The evidence-bound slice is implemented in capability catalog revision
`2026-08-24.25`.

- The backend parses and validates physical rows in
  `effective-area-loading-screen-two-da.ts`, resolves one effective table and
  each effective TGA in `module-snapshot-template-catalog.repository.ts`, and
  exposes the immutable catalog only on hydrated Area detail/processed
  payloads. Non-contract source layers cannot shadow module, ordered HAK, or
  vanilla resources. A malformed strongest resource inside those admitted
  layers still fails closed without weaker fallback.
- Retail BIF TGA descriptors are hashed through bounded 1 MiB reads in
  `NwnKeyBifResourceReader.describe`; image bytes are not accumulated in the
  Area response. The exact size/hash result and out-of-range BIF rejection are
  covered by a multi-chunk KEY/BIF fixture.
- Area processing cache identity includes the complete table/image
  provenance and display rows. Area repository and application projections
  deep-clone descriptors, rows, and nested image descriptors.
- The frontend admits only the exact bounded schema at the HTTP and persisted
  workspace boundaries, clones it into scene/property state, and derives a
  selector containing value 0, rows with effective TGA provenance, and the
  retained unresolved current Word. The selector reports table and selected
  image provenance. Changing it reuses the existing exact
  `{ expectedValue, value }` `LoadScreenID` mutation; the catalog remains
  query-only.

Accepted offline validation is 75 focused backend assertions, 196 focused
frontend unit/component assertions, two loading-screen regression-smoke
assertions, and passing backend/frontend production builds. Runtime services,
browser capture, Toolset, and NWN were not started by this lane. The fresh
browser Save/reopen and native presentation gates listed above remain open.
