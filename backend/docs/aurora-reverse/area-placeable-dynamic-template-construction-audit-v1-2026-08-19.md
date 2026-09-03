# Dynamic Area Placeable template construction audit v1

Date: 2026-08-19
Status: offline implementation, resource-safe source sync, guarded local browser verification, packed candidate readback, and native Toolset open complete; native Save/capture and NWN proof pending
Scope: create a type-`9` Area Placeable from one exact effective catalog
`UTP `/`V3.2` blueprint instead of the single frozen `plc_watertrough` profile

## Decision

Aurora Web may add a catalog Placeable under the bounded profile
`effective-catalog-utp-placeable-copy-v1` when all of the following remain
true at compilation time:

- the catalog winner is an actual `utp` object, not a synthetic
  `placeables.2da` preview row;
- immutable provenance contains its exact repository-owned `sourceObjectKey`,
  lowercase byte SHA-256, template ResRef, and source Tag;
- the backend re-resolves that same effective catalog winner, reads the object
  through the catalog repository, and independently reproduces its SHA-256;
- the document is at most 1 MiB, exact `UTP `/`V3.2`, root type
  `0xffffffff`, with no duplicate root labels;
- `TemplateResRef : ResRef` equals the catalog/template identity and
  `Tag : CExoString` equals the retained source Tag verbatim;
- every admitted common and Placeable member has its native GFF type;
- `ItemList` is absent or empty, or it matches one of the three exact retail
  dependency-closed profiles frozen below. Any other non-empty blueprint
  inventory remains fail-closed;
- optional `VarTable` is fully admitted only under the already frozen native
  type-`1|2|3` Placeable variable profile.

Only placement is authored by the scene: `X/Y/Z = float32(scene * 10)` and
`Bearing = float32(scene.bearing)`. Blueprint identity and properties are not
client overrides. The paired GIC type-`9` struct receives the exact UTP
`Comment : CExoString`.

This profile supplements rather than silently changes the older immutable
`nwn-base-key-utp-plc-watertrough-v1` proof profile. The old profile remains a
compatibility fixture until the dynamic path receives its own Toolset/NWN
certification.

## Primary Aurora authority

The primary source is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`.
No xoreos or other GPL source was used.

Recovered lineage:

- `FUN_0063aac4` (decompilation line 329429) initializes the common blueprint
  defaults;
- `FUN_0063ae68` (329549) reads common UTP/GIT members using the initialized
  value when a member is absent;
- `FUN_0063b8a0` (329850) writes the common members;
- `FUN_0063bf04` (330026) initializes Placeable-specific defaults;
- `FUN_0063bf74` (330044) reads inventory plus `HasInventory`, `BodyBag`,
  `Type`, `Useable`, `Static`, `OnInvDisturbed`, and `OnUsed`;
- specifically, absent `BodyBag` reads as `0`, while absent `Static` reads as
  `!Useable`;
- `FUN_0063c0a8` (330079) writes the complete common/Placeable state;
- the instance constructor `FUN_0063c424` (330146) accepts a blueprint object;
  its resource-load call site at 177321 constructs the instance and then calls
  `FUN_0063bcb8(instance + 0x22, blueprint + 3)`;
- `FUN_0063bcb8` (329917) invokes the full common copy `FUN_0063a338`
  (329200), then copies the Placeable flags, scripts, and inventory state;
- `FUN_0063d0d8` (330504) reads placement and paired GIC Comment;
- `FUN_0063d3d8` (330621) writes the copied Placeable state, placement,
  paired Comment, and inventory when present;
- the UTP loader wrapper `FUN_0064d3b0` (340388) uses the same Placeable
  reader and separately retains palette/editor Comment data.

The authority therefore is blueprint-copy semantics with known Aurora
defaulting, not a display-name-to-property guess. In particular, Tag is a
copied native identity. The historical Water Trough UI-created tag difference
is not generalized into a sanitizer.

## Retail corpus audit

The read-only corpus used installed
`C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/data/nwn_base.key`,
SHA-256
`09CDAFB6DBFB9CDB544993154C514C65EF9FD5BE4E0C1B8FD971ED05AFF90935`.
The production KEY/BIF reader and raw GFF parser enumerated all resource type
2044 entries.

Results:

- 1,453/1,453 resources read and parsed;
- 1,453/1,453 are `UTP `/`V3.2`, root `0xffffffff`;
- zero duplicate root-label profiles;
- sizes: 1,745 minimum, 1,858 p50, 1,999 p95, 2,124 p99, 3,346 maximum;
- all 1,453 have exact `TemplateResRef : ResRef`, matching the KEY ResRef;
- all 1,453 have exact non-empty `Tag : CExoString` and
  `Comment : CExoString`;
- `HasInventory=0` on 1,339 and `HasInventory=1` on 114;
- only three blueprints contain a non-empty `ItemList` (`plc_fenbush`,
  `plc_pilestones`, `x0_treepine2`). The bounded dependency closure below
  admits those three exact profiles, raising the retail construction corpus
  from 1,450/1,453 to 1,453/1,453 without claiming arbitrary UTI support;
- `BodyBag` is absent on 172 and `Static` on 175, confirming that exact Aurora
  defaults are required instead of an all-fields-present rule;
- `OnClick` is absent on 521 and defaults to the initialized empty ResRef;
- five blueprints contain a non-empty `VarTable`; every entry is canonical
  struct type `0` and native integer type `1`, already covered by the frozen
  variable-table contract;
- 1,273 templates use canonical `PortraitId : Word`; it is copied exactly,
  including valid source values whose current row is not selectable;
- 180 templates use legacy `Portrait : ResRef`. Removing the exact `po_`
  resource prefix and comparing case-insensitively to physical
  `portraits.2da/BaseResRef` maps all 180 to exactly one row, with zero missing
  or ambiguous matches.

The installed retail `portraits.2da` is 944,115 bytes and has 16,001 physical
rows. This also proves that the current unrelated 4,096-row selector budget is
too small for full retail portrait parity; it must not be used to reject an
otherwise canonical UTP `PortraitId` during construction.

## Frozen native mapping

The GIT writer emits one type-`9` struct in Aurora member order. It copies the
source values, with only these source-format conversions/defaults:

```text
UTP PaletteID                  -> omitted from GIT
UTP Comment                    -> paired GIC Comment
UTP PortraitId : Word          -> GIT PortraitId unchanged
UTP Portrait : ResRef          -> exact physical portraits.2da row Word
absent BodyBag                 -> BodyBag : Byte = 0
absent Static                  -> Static : Byte = (Useable == 0 ? 1 : 0)
absent OnClick                 -> OnClick : ResRef = ""
absent or empty ItemList       -> no GIT ItemList
exact admitted ItemList        -> full Aurora mode-2 GIT ItemList
non-empty canonical VarTable   -> copied as canonical GIT VarTable
X, Y, Z                        -> float32(scene coordinate * 10)
Bearing                        -> float32(scene bearing)
```

All other admitted members retain the exact source value. The writer must not
trim, uppercase, humanize, or synthesize Tag/ResRef/name/script values.

## Bounded non-empty ItemList dependency closure

The installed retail corpus was reread on 2026-08-19 with the production
KEY/BIF reader and raw GFF parser. The complete non-empty UTP inventory set is:

| UTP ResRef | UTP bytes | UTP SHA-256 | exact ordered ItemList |
|---|---:|---|---|
| `plc_fenbush` | 1,994 | `3959afbdbf84a510875f8448df5df769eb5ee6d928de4421ad16ab6cb08da880` | `nw_it_msmlmisc12` at Word `(0,0)` |
| `plc_pilestones` | 1,991 | `ae07fe2ae97cc47ddf57f1333a723a40cef6e387b418286f9a4a4062029ff8e7` | `nw_it_msmlmisc11` at Word `(0,0)` |
| `x0_treepine2` | 2,069 | `6d15dbd1e48cbca9f2b4ef443e382a4ecbf0faf23bf3f40dcf485d7e853ab50d` | `nw_it_msmlmisc12` at Word `(0,0)`, then `nw_it_msmlmisc11` at Word `(1,0)` |

Every source entry is a sequential struct (`typeId` equals its zero-based
ordinal) with exactly `InventoryRes : ResRef`, `Repos_PosX : Word`, and
`Repos_Posy : Word`. No embedded `Item` struct and none of
`Dropable`/`Droppable`, `Pickpocketable`, or `Infinite` is present.

The only referenced resources are exact base-key UTI dependencies:

| UTI ResRef | bytes | SHA-256 | GFF identity |
|---|---:|---|---|
| `nw_it_msmlmisc11` | 694 | `1074b864af23880f07f69c46a2a838e79ad7914eef8ea7381262c1d6d25b00bc` | `UTI `/`V3.2`, root `0xffffffff` |
| `nw_it_msmlmisc12` | 694 | `dd6de4bd38d2323b7cd9ac578181d1e1ef1a1918673814ce6fb463602f0c4386` | `UTI `/`V3.2`, root `0xffffffff` |

Both UTIs contain the exact 17-field retail profile
`PaletteID, BaseItem, PropertiesList, StackSize, Cost, LocalizedName,
ModelPart1, TemplateResRef, Comment, DescIdentified, Tag, Charges,
Description, Stolen, AddCost, Plot, Identified`. `Cursed` is absent and is
materialized as Aurora's proven default `Byte 0`; `PaletteID` and `Comment`
are UTI editor fields and are omitted from the embedded Area item.

The catalog repository must resolve each dependency as the current effective
`item` winner by ResRef, require exact UTI metadata, recompute and match that
winner's recorded digest, and read bytes only from its repository-owned object
key. The retail SHA-256 values above are evidence, not a hard-coded digest
allowlist: an override is admitted only when its current effective bytes still
match the exact frozen 17-field semantic profile. A missing, stale, reordered,
duplicated, extra-field, wrong-type, wrong-hash, or wrong-identity dependency
fails closed. The compiler carries defensive copies of the resolved
dependencies into the internal addition; no binary dependency or host path
crosses the HTTP boundary.

The Area writer independently revalidates the UTP profile, ordered dependency
manifest, dependency digests, UTI identity and field order. It expands each
UTI to Aurora mode-2 inventory fields with `X/Y/ZPosition=-1`, orientation
`(0,1)`, copied native item state, `xModelPart1 : Word`, copied
`PropertiesList`, and the retained repository Words. The nested struct type ID
remains the source ordinal. This reuses the already proven Store and existing
Placeable inventory construction semantics; it does not generalize them to
arbitrary UTI layouts.

## Cross-boundary provenance and source closure

The catalog API already transports a primitive metadata bag. For an addable
UTP row it must publish exact `sourceObjectKey`, `sourceSha256`,
`sourceExtension=utp`, `sourceFileType=UTP `, `sourceFileVersion=V3.2`,
`sourceStructTypeId=4294967295`, `templateResRef`, and `tag`.

The catalog `templateId` is the stable catalog-record identifier (for example
`plc_plc_watertrough`), not an Aurora ResRef. `templateResRef` and the scene
object `resRef` both carry the exact native UTP `TemplateResRef` (for example
`plc_watertrough`) and must match. Compilation uses `templateId` to re-resolve
the catalog winner and `templateResRef`/`resRef` to validate native identity.

The frontend retains those members in immutable
`source.aurora_blueprint` provenance and uses exact source Tag and ResRef. A
2DA-only preview, missing metadata, malformed digest, wrong family, or local
fallback remains visible but is not addable to a persisted Area.

The client never supplies bytes or a host path. Compilation re-resolves the
effective catalog record by kind/template, requires the same object key and
digest, reads only that repository-owned object, and fails stale when source
precedence changed. No arbitrary object-key read is exposed as an HTTP API.

## Diagnostics and limits

Failures must distinguish at least: stale effective winner, missing object,
digest mismatch, wrong GFF identity, duplicate or wrong-type native field,
ResRef/Tag mismatch, unsupported portrait conversion, malformed VarTable,
unsupported non-empty inventory profile, dependency winner/hash/identity
mismatch, and malformed native ItemList. Source paths and storage secrets must
not be returned.

The existing total 1,024-addition budget remains authoritative. A single UTP
is capped at 1 MiB, source-object keys at 2,048 code units, and all existing
ResRef/string/VarTable limits continue to apply.

## Offline implementation checkpoint

The bounded profile is implemented across catalog synchronization and
indexing, repository-owned blueprint resolution, draft projection, candidate
compilation, paired GIT/GIC writing/readback, frontend catalog mapping,
drag/drop cloning, production-draft persistence, and retail portrait-table
handling. The frontend keeps synthetic `placeables.2da` rows previewable but
removes construction provenance from them, so only exact effective UTP rows
can reach Area Update.

The 2026-08-19 focused verification is green:

- backend writer, catalog repository, runtime synchronization, projector,
  compiler, and effective portraits suites: `1276/1276` after the final
  fail-closed source-key, Tag, and portrait-identity cases;
- frontend dynamic construction, catalog mapping, drag/drop payload,
  production-draft persistence, and portrait-range coverage: `46/46`;
- renderer type-safety follow-up: `25/25`;
- complete backend unit: `240/240` suites and `4110/4110` tests;
- complete frontend unit: `274/274` files and `2876/2876` tests;
- frontend regression smoke: `10/10` files and `78/78` tests;
- backend E2E: `10/10` suites and `113/113` tests;
- backend and frontend production builds pass; frontend retains only the
  existing Vite chunk-size warning.

Mutation analysis was not run because it requires explicit user opt-in. At
this offline checkpoint no fresh Toolset Save/Build/reopen, packed candidate
readback, NWN run, HAK/module precedence proof, or zero-stale-asset runtime
capture was claimed.

## Resource-safe source synchronization checkpoint

The first isolated local proof attempt exposed a resource defect in the full
supplement rebuild: it bulk-read every vanilla Placeable MDL/PWK into the
backend process even though model delivery already has a targeted/on-demand
path. The preflight reached approximately 11.2 GiB working set and 36.9 GiB
private memory before the owned proof services were stopped. This was a local
proof blocker and is not classified as a renderer or blueprint-format failure.

The synchronization boundary is now split explicitly:

- catalog construction sources synchronize the bounded Placeable 2DA set and
  UTP templates;
- vanilla UTP is read from KEY/BIF and HAK UTP is read through the indexed ERF
  resource path;
- full supplement rebuild does not bulk-stage vanilla Placeable MDL/PWK;
- requested model ResRefs and their referenced textures remain targeted and
  on demand.

Red-first runtime-settings tests proved both the missing UTP source path and
the accidental bulk-model path before implementation. The completed service
suite is `44/44` and the backend production build passes. On the isolated
runtime the targeted sync completed in 3.2 seconds and stored 1,503 files
(1,497 UTP plus 6 2DA), 13,684,942 bytes, with no bulk model files.

The resulting effective catalog resolved the exact retail Water Trough record
as `templateId=plc_plc_watertrough`, native
`TemplateResRef=plc_watertrough`, object key
`modules/current/__aurora/sources/vanilla/templates/plc_watertrough.utp`,
1,771 bytes, exact `UTP `/`V3.2` root, retained Tag `Water Trough`, and lookup
model `plc_n02`.

The live response also exposed cross-family metadata contamination: the
Placeable `Appearance=42` ordinal had been enriched from creature
`appearance.2da` as `Demon_Quasit`. Creature appearance, race, gender,
phenotype, part-model, portrait, size, and sound-set enrichments are now
strictly creature-only. The repository test reproduced the wrong label before
the fix and is green at `45/45`; the backend production build remains green.

## Guarded local runtime verification checkpoint

The guarded CDP harness captured a fresh, strict, settled local frame for
`_winds_study` after the source-sync repair. The accepted retry is stored at:

- `evidence/area-dynamic-utp-placeable-create-2026-08-19/browser/dynamic-utp-winds-study-current-build-retry2.frame.json`;
- `evidence/area-dynamic-utp-placeable-create-2026-08-19/browser/dynamic-utp-winds-study-current-build-retry2.png`;
- `evidence/area-dynamic-utp-placeable-create-2026-08-19/browser/dynamic-utp-winds-study-current-build-retry2.canvas.png`.

The frame reports a 2x2 Area, four of four tile models loaded, zero pending,
failed, or bridge tiles, four visible tile meshes with four mapped materials,
four of four Placeables model-ready, zero primitive fallbacks, all 19 binary
asset requests HTTP 200, no in-flight or failed assets, camera coverage pass,
and zero clipped corners. The first cold-list timeout remains preserved as
`dynamic-utp-winds-study-current-build.failure.frame.json`; it is not presented
as a successful frame.

A separate Playwright catalog check searched exact `plc_watertrough`, returned
one effective row, and rendered the textured wooden trough through the live
generic Placeable model path. That check found and closed an inspector defect:
backend source-MDL emitter metadata could incorrectly reclassify a generic
Placeable as VFX. VFX preservation now requires the explicit catalog/render
classification. The post-fix inspector reports `Status: ready`,
`Type: placeable / subtype: generic`, `Model URL: yes`, and five textures. The
visual artifact is
`../../../output/playwright/dynamic-utp-water-trough-catalog-classification-fixed.png`.
The focused catalog/inspector/viewport flow is `103/103` green. A current full
frontend production-build rerun is not claimed after this small follow-up: it
is blocked in an unrelated dirty renderer change by the unused
`AURORA_LIGHT_LINEAR_FALLOFF_DECAY` constant.

These are local web runtime results. They prove catalog discovery, targeted
model delivery, generic/VFX classification, and a fresh settled Area renderer
frame. They do not prove that Water Trough was added and persisted in that
Area, do not replace paired packed GIT/GIC readback, and do not promote retail
or native parity (`canonicalParityPromoted=false`,
`localOnlyNotRetailEvidence=true`).

The dynamic profile now also has an atomic publication integration checkpoint.
An immutable snapshot successor is published with the paired GIT/GIC mutation,
verified through the persisted-readback verifier, and read independently from
the committed manifest. The retained type-`9` struct has exact dynamic profile
identity, source Tag, PortraitId, Aurora defaults, and float32 transform; its
paired GIC Comment is exact. The focused atomic publication suite is `21/21`.
This closes local transactional GIT/GIC persistence/readback for the fixture,
but it is not a packed MOD/HAK Toolset reopen or NWN certification.

## Packed candidate and native Toolset checkpoint

The product writer now also produces a disposable packed native candidate from
an independently built empty 2x2 Area source. The immutable source is
`aw_area_create_proof_dp01.mod` with SHA-256
`772f715879d4b0d2dc38cd4ed655522b886278e551e51727f957864f615f0c2d`.
The resulting `aw_dp_proof_01.mod` pre-native candidate has SHA-256
`ebbd1732fc486bd07dc93a979476c8a13101578cd5bc0d7319415fc9a2c89fd4`.
Independent packed readback validates one exact type-`9` Placeable at ordinal
zero with `TemplateResRef=plc_watertrough`, `Tag=Water Trough`,
`PortraitId=462`, position `10,10,0`, and paired GIC
`Comment=Water Trough`. All untargeted resources are byte-identical and the
ordered HAK names and hashes are frozen in the proof profile.

The central binary-bootstrap validator admits the dedicated
`aurora-toolset-binary-dynamic-placeable-profile/v1` schema and rejects profile,
GIT, GIC, capture-target, or source-lineage mismatches before Toolset launch.
Both new contract tests, central dry-run, startup-admission dry-run, and
preflight pass. The central open phase launched one Toolset process and
observed the exact module title. `geometry-observe` opened `awdp01`, then the
native Save helper correctly rejected the clean offline-built module with
`module_not_dirty_before_save`; no Save command was sent. The runner recorded
`native_geometry_save_unverified`, with no Invalid Locations or Inaccessible
Objects dialog.

This was a central continuation-contract gap, not a GFF or renderer failure.
The existing public clean-noop Area Properties continuation now admits the
exact dynamic Placeable profile while preserving the historical model-fixture
behavior. A new pure admission validator binds the dynamic proof kind, source
profile, profile digest, module lineage, Area identity, and locked-file stat.
It defers only the MOD SHA-256 revalidation until Toolset close, matching the
already established clean Area Create safety boundary. Positive model/dynamic
cases and wrong version, proof kind, source profile, digest, module lineage,
timestamp, and malformed timestamp cases are contract-tested. The focused
admission test and the full central runner contract test both pass.

No live continuation was attempted after this offline implementation. The
exact Toolset frame still exists but is hidden, so its required one-visible-
frame precondition is false. The live Toolset session remains open because
close authority was not part of the execution contract; no unchanged retry,
direct leaf Save, global input, or hidden-frame restoration was attempted. A
read-only visual capture was also blocked, so no PNG and no visual proof are
claimed. The exact frozen blocker and the offline implementation hashes are stored at
`evidence/area-dynamic-placeable-native-proof-2026-08-19/native/native-continuation-blocker.json`.

The remaining native boundary is therefore explicit: after the current
Toolset process is terminal under authorized session handling, reopen the same
immutable candidate, run the now-tested central continuation, perform one
exact unchanged Area Properties transition, Save/read back the packed pair,
and capture the exact `awdp01` Placeable viewport. NWN proof remains a separate
gate because the candidate entry Area is `demo`, not `awdp01`.

## Completion criteria

Implementation requires red-first domain, repository, projector, compiler,
writer, frontend mapper/factory/drag-drop, clone/undo, and full pair-readback
tests. Focused and full ordinary suites plus backend/frontend production
builds are mandatory. Mutation testing is not run without explicit opt-in.

Offline and local browser completion do not certify native parity. Final certification still
requires a fresh exact-candidate Toolset Save/Build/reopen and NWN run for at
least: a canonical PortraitId template, a legacy Portrait template, a
HasInventory=1 empty container, a non-empty VarTable template, and a
HAK/module-precedence template, with exact GIT/GIC readback and zero stale
renderer asset failures.
