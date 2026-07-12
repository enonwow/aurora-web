# Aurora Web Item Properties / UTI field matrix - 2026-07-05

Reference source: `C:\Projects\New Folder` decompiled/exported Aurora data.
Editable target: `C:\Projects\aurora-web`.

## Closed in this pass

- Script slots now round-trip for supported GFF-safe item fields:
  - UI/scene: `SceneObject.itemProperties.scripts`.
  - Frontend payload: `ItemApiBlueprintCreatePayload.scripts`.
  - HTTP schema: `scripts` record, key max 16 chars, value ResRef.
  - Backend command: `ItemBlueprintCreateCommand.scripts`.
  - UTI writer: script fields are emitted as GFF `ResRef` fields, not placeholder text.
  - Parser/catalog metadata: on-demand custom item metadata now preserves `script.<label>`.
- Item Properties dialog apply now notifies `WorkspaceLayout`; for existing custom item blueprints, the edited object is written through `updateItemBlueprint(... overwrite: true)` and preview/custom caches are refreshed.
- Placed area item instances now preserve parsed GIT item fields into the web scene:
  - Backend GIT parser exports `itemMetadata` for item placements.
  - Area snapshot repository and API contracts carry `itemMetadata`.
  - Frontend area mapper merges `itemMetadata` into `SceneObject.itemProperties`.
  - Covered fields include identity/text, base item, model parts, armor body parts, material colors, cost/charges/stack, flags, scripts, and `PropertiesList`.
- GIT `ItemList` writer proof now exists for placed item properties:
  - `serializeAreaItemPlacementsToGitGff(...)` writes real GFF `GIT ` bytes containing `ItemList`.
  - The writer covers position/bearing plus the same item property subset preserved by the parser.
  - The parser can read the produced bytes back with item metadata intact.
- Area item export is exposed through the application/web boundary:
  - Backend: `GET /api/v1/areas/:areaId/export/items.git`.
  - Service: `getAreaItemGitExport(...)` filters placed item objects and returns GFF bytes.
  - Frontend port: `exportAreaItemsGit(...)` downloads the binary payload and metadata.
- Whole-area native export is exposed for the supported current area model:
  - Backend: `GET /api/v1/areas/:areaId/export/area.git` writes supported GIT root lists for placeables, doors, creatures, encounters, items, sounds, stores, triggers, and waypoints.
  - Backend: `GET /api/v1/areas/:areaId/export/area.are` writes supported ARE metadata and `Tile_List`.
  - Item entries inside whole-area `.git` reuse the same writer as `items.git`, so armor/body parts, material colors, scripts, and `PropertiesList` do not diverge.
  - Frontend port exposes `exportAreaGit(...)` and `exportAreaAre(...)` with binary metadata headers.
- Cloak model row edits now persist through the native UTI model field:
  - `cloakModelRow` is serialized as `ModelPart1` when `modelPart1` is not explicitly present.
  - The same fallback is used for item preview/process visual overrides.
  - Derived cloak preview fields (`cloakModel`, `cloakTexture`, `cloakIcon`, resolved ResRefs) are read-only in the item properties dialog; `Model Row` remains the editable native control.
- Known long script aliases now normalize to native GFF-safe labels:
  - UI/API alias `oninventorydisturbed` is accepted and written as `oninvdisturbed`.
  - The mapping is covered in frontend payload building, backend schema parsing, backend command normalization, and the UTI writer.
  - Area item properties dialog script labels and script ResRefs are capped to Aurora/GFF-safe 16-character identifiers both at input time and at apply time.
- Area item properties dialog now persists edits for retail/source-backed items by creating a module-backed overwrite blueprint when no existing custom blueprint row exists; existing custom blueprints still use `updateItemBlueprint(... overwrite: true)`.
- Localized string references now round-trip for item identity/description fields:
  - Backend create/update schema accepts `localizedNameStrRef`, `descriptionStrRef`, and `identifiedDescriptionStrRef`.
  - `ItemBlueprintCreateCommand` carries those fields into the UTI writer, which emits native `CExoLocString` StrRef data for `LocName`, `Description`, and `DescIdentified`.
  - Item catalog metadata now preserves those three fields for parsed/custom item blueprints instead of dropping them after write.
  - Frontend catalog and area mappers preserve those fields on `SceneObject.itemProperties`.
  - Item Properties dialog exposes `Name StrRef`, `Description StrRef`, and `Identified StrRef` as editable fields.
  - Frontend blueprint payload building sends those fields back during custom item create/overwrite.
  - Frontend blueprint payload now writes UTI `LocName` from `SceneObject.itemProperties.localizedName`; `SceneObject.name` is only the fallback scene label.
  - Runtime proof runner exposes the currently loaded `StrRef` values as `data-proof-*StrRef` attributes alongside real dialog screenshots.
  - Runtime proof runner tab switching is now functional, so Basic/Comments screenshots can be captured from one loaded real fixture.

## Full UTI round-trip fields

- Identity/text: `TemplateResRef`, `LocName`, `LocName.StrRef`, `Description`, `Description.StrRef`, `DescIdentified`, `DescIdentified.StrRef`, `Comment`, `PaletteID`, `Tag`.
- Flags/state: `Plot`, `Identified`, `Stolen`, `Cursed`.
- Base/pricing/charges: `BaseItem`, `Cost`, `AddCost`, `CostTable`, `CostValue`, `Charges`, `StackSize`.
- Simple model parts: `ModelPart1`, `ModelPart2`, `ModelPart3`.
- Armor model parts: all supported `ArmorPart_*` slots.
- Material colors: `Leather1Color`, `Leather2Color`, `Cloth1Color`, `Cloth2Color`, `Metal1Color`, `Metal2Color`.
- Item properties list: `PropertiesList` entries with `PropertyName`, `Subtype`, `CostTable`, `CostValue`, `Param1`, `Param1Value`, `ChanceAppear`.
- Script slots: parser-known GFF-safe labels up to 16 chars, e.g. `onused`, `onheartbeat`.

## Still intentionally not full writer parity

- Script labels and script ResRefs over 16 characters are normalized to 16 characters because native GFF labels/ResRefs cannot safely store arbitrary long identifiers.
- Whole-area `.git/.are` export is source-backed for fields already present in the current web area model. It does not claim untouched Toolset parity for data the model does not yet preserve, such as unsupported per-object fields outside the parsed current contracts.
- Cloak derived preview fields remain read-only metadata derived from `cloakmodel.2da`; the writable native UTI control is the cloak row/`ModelPart1`.

## UTC inventory/equipment writer decision - 2026-07-06

The current creature writer scope is intentionally narrow but implemented, not a placeholder:

- Writer: `backend/src/modules/catalog/adapters/outbound/blob/aurora-gff-utc-writer.ts`.
- Supported root: `UTC `.
- Supported identity fields: `TemplateResRef`, `Tag`, and `FirstName` as a native localized string.
- Supported inventory list: `ItemList` with `InventoryRes`, embedded `Item`, `RandomResRef`, `RandomList`, `Repos_PosX`, `Repos_Posy`, `Dropable`, `Pickpocketable`, and `Infinite`.
- Supported equipment list: `Equip_ItemList` with `EquippedRes`, embedded `Item`, `RandomResRef`, `RandomList`, `Dropable`, `Pickpocketable`, `Infinite`, and native slot mask via struct type id.
- Embedded item data reuses the same supported UTI field subset as the item writer, so item identity, visual parts, material colors, properties, flags, costs, charges, scripts, comments, and StrRefs do not diverge between standalone UTI and UTC inventory/equipment.

This does not claim to be a full creature blueprint writer. The closed item requirement is that item data inside creature inventory/equipment can be serialized and parsed back through the supported fields without fake data.

Follow-up proof command:

- `npm.cmd test -- aurora-gff-template-parser.spec.ts capture-item-visual-matrix-script.spec.ts --runInBand`
- Result: `2 test suites passed`, `23 tests passed`.

## Proof commands run

- Backend:
  - `npm.cmd test -- --runInBand test/unit/catalog.application.service.spec.ts test/unit/aurora-gff-template-parser.spec.ts test/unit/template-processing.schemas.spec.ts`
  - Result: `3 passed`, `183 tests passed`.
- Frontend:
  - `npx.cmd tsc -p tsconfig.app.json --noEmit`
  - `npx.cmd vitest run tests/unit/modules/items/itemCreationWizard.test.ts tests/unit/modules/layout/components/properties/ItemPropertiesDialog.test.tsx tests/unit/modules/layout/workspaceObjectPropertyDrafts.itemProperties.test.ts`
  - Result: typecheck passed, `3 test files passed`, `18 tests passed`.
- Area item instance import:
  - `npm.cmd test -- --runInBand test/unit/aurora-gff-area-parser.spec.ts`
  - Result before `ItemList` writer: `1 passed`, `9 tests passed`.
  - `npx.cmd vitest run tests/unit/modules/areas/areaSceneMapper.test.ts`
  - Result: `1 test file passed`, `9 tests passed`.
  - `npm.cmd run build`
  - Result: backend build passed.
- Area item instance GIT writer:
  - `npm.cmd test -- --runInBand test/unit/aurora-gff-area-parser.spec.ts`
  - Result after `ItemList` writer: `1 passed`, `10 tests passed`.
  - `npm.cmd test -- --runInBand test/unit/areas.application.service.spec.ts test/unit/aurora-gff-area-parser.spec.ts`
  - Result after export service: `2 passed`, `34 tests passed`.
  - `npm.cmd run build`
  - Result: backend build passed.
- Frontend area item export port:
  - `npx.cmd vitest run tests/unit/modules/areas/httpAreaApiPort.test.ts tests/unit/modules/areas/areaTextureAtlasReadiness.test.ts`
  - Result: `2 test files passed`, `19 tests passed`.
  - `npx.cmd tsc -p tsconfig.app.json --noEmit`
  - Follow-up whole-area export pass:
    - Backend: `npm test -- aurora-gff-area-parser.spec.ts areas.application.service.spec.ts` -> `2 passed`, `37 tests passed`.
    - Backend: `npx.cmd tsc -p tsconfig.json --noEmit` -> passed.
    - Frontend: `npx.cmd vitest run tests/unit/modules/layout/components/properties/ItemPropertiesDialog.test.tsx tests/unit/modules/areas/httpAreaApiPort.test.ts tests/unit/modules/areas/areaTextureAtlasReadiness.test.ts` -> `3 passed`, `29 tests passed`.
    - Frontend: `npx.cmd tsc -p tsconfig.app.json --noEmit` -> passed.
  - Result: frontend typecheck passed.
- Frontend cloak model row persistence:
  - `npx.cmd vitest run tests/unit/modules/items/itemCreationWizard.test.ts`
  - Result: `1 test file passed`, `13 tests passed`.
  - `npx.cmd tsc -p tsconfig.app.json --noEmit`
  - Result: frontend typecheck passed.
- Script alias normalization:
  - `npm.cmd test -- --runInBand test/unit/template-processing.schemas.spec.ts test/unit/aurora-gff-template-parser.spec.ts test/unit/catalog.application.service.spec.ts`
  - Result: `3 test files passed`, `183 tests passed`.
  - `npx.cmd vitest run tests/unit/modules/items/itemCreationWizard.test.ts`
  - Result: `1 test file passed`, `13 tests passed`.
  - `npx.cmd tsc -p tsconfig.app.json --noEmit`
  - Result: frontend typecheck passed.
  - `npm.cmd run build`
  - Result: backend build passed.
- Localized string `StrRef` preservation:
  - `npm.cmd test -- --runInBand test/unit/template-processing.schemas.spec.ts test/unit/catalog.application.service.spec.ts`
  - Result: `2 test files passed`, `163 tests passed`.
  - `npm.cmd test -- --runInBand test/unit/module-snapshot-template-catalog.repository.spec.ts test/unit/template-processing.schemas.spec.ts test/unit/catalog.application.service.spec.ts --silent`
  - Result after catalog metadata fix: `3 test files passed`, `196 tests passed`.
  - `npx.cmd vitest run tests/unit/modules/items/itemCreationWizard.test.ts tests/unit/modules/items/itemSceneObjectMapper.test.ts tests/unit/modules/areas/areaSceneMapper.test.ts`
  - Result: `3 test files passed`, `31 tests passed`.
  - `npx.cmd vitest run tests/unit/modules/layout/components/properties/ItemPropertiesDialog.test.tsx tests/unit/modules/layout/workspaceObjectPropertyDrafts.itemProperties.test.ts tests/unit/modules/items/itemCreationWizard.test.ts --reporter=dot`
  - Result after dialog StrRef editor fix: `3 test files passed`, `20 tests passed`.
  - `npx.cmd vitest run tests/unit/modules/items/itemCreationWizard.test.ts tests/unit/modules/layout/components/properties/ItemPropertiesDialog.test.tsx tests/unit/modules/layout/workspaceObjectPropertyDrafts.itemProperties.test.ts tests/unit/modules/items/itemSceneObjectMapper.test.ts tests/unit/modules/areas/areaSceneMapper.test.ts --reporter=dot`
  - Result after `Localized Name -> LocName` and proof-runner tab fix: `5 test files passed`, `38 tests passed`.
  - `npm.cmd run build`
  - Result: backend build passed.
  - `npx.cmd tsc -p tsconfig.app.json --noEmit`
  - Earlier result: frontend typecheck passed before the unrelated placeables drift.
  - Current rerun after dialog StrRef editor fix: item changes type-check cleanly, but full app typecheck is blocked by pre-existing unused declarations in `frontend/src/modules/placeables/application/placeableRenderPayloadResolver.ts` (`processPlaceableWithOptionalSignal`, `processPlaceablesWithOptionalSignal`, `getPlaceableViewportRenderPayloadBatchWithOptionalSignal`, `getPlaceableAssetContractsWithOptionalSignal`, `getPlaceableAssetContractsBatchWithOptionalSignal`).
- Runtime Item Properties dialog proof:
  - Route: `http://127.0.0.1:5173/aurora-evidence/item-properties-dialog-proof`.
  - Summary: `frontend/public/aurora-evidence/item-properties-runtime-proof-2026-07-05-strref-pass/item-properties-runtime-proof-summary.json`.
  - Screenshots:
    - `frontend/public/aurora-evidence/item-properties-runtime-proof-2026-07-05-strref-pass/item-properties-dialog-basic.png`
    - `frontend/public/aurora-evidence/item-properties-runtime-proof-2026-07-05-strref-pass/item-properties-dialog-visual.png`
    - `frontend/public/aurora-evidence/item-properties-runtime-proof-2026-07-05-strref-pass/item-properties-dialog-colors.png`
    - `frontend/public/aurora-evidence/item-properties-runtime-proof-2026-07-05-strref-pass/item-properties-dialog-properties.png`
    - `frontend/public/aurora-evidence/item-properties-runtime-proof-2026-07-05-strref-pass/item-properties-dialog-scripts.png`
    - `frontend/public/aurora-evidence/item-properties-runtime-proof-2026-07-05-strref-pass/item-properties-dialog-comments.png`
  - Result: all six tabs report `data-proof-status="ready"` for `aarcl009`; runtime dataset includes `data-proof-localized-name-str-ref="12840"`.
- Runtime Item Properties dialog StrRef editor proof:
  - Summary: `frontend/public/aurora-evidence/item-properties-runtime-proof-2026-07-05-dialog-strref-editor/summary.json`.
  - Screenshots:
    - `frontend/public/aurora-evidence/item-properties-runtime-proof-2026-07-05-dialog-strref-editor/item-properties-dialog-basic-strref-editor.png`
    - `frontend/public/aurora-evidence/item-properties-runtime-proof-2026-07-05-dialog-strref-editor/item-properties-dialog-comments-strref-editor.png`
  - Result: Basic tab reports `data-proof-status="ready"` and shows `Name StrRef=12840`; Comments tab reports `data-proof-status="ready"` and exposes editable `Description StrRef` and `Identified StrRef` fields. The real `aarcl009` fixture has no description StrRef values, so those two runtime fields are intentionally empty in this screenshot.
