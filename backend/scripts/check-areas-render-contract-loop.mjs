#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..");
const PNG_SIGNATURE_HEX = "89504e470d0a1a0a";

const checks = [
  {
    id: "process-query-area-instance-facts",
    file: "backend/src/modules/catalog/domain/template.types.ts",
    required: ["appearanceType?: number", "genericType?: number"],
  },
  {
    id: "http-process-payload-area-instance-facts",
    file: "backend/src/modules/catalog/adapters/inbound/http/placeables.schemas.ts",
    required: ["appearanceType: z.coerce.number().int().nonnegative().optional()", "genericType: z.coerce.number().int().nonnegative().optional()"],
  },
  {
    id: "catalog-port-aurora-lookups",
    file: "backend/src/modules/catalog/application/ports/template-catalog-repository.port.ts",
    required: ["resolvePlaceableAppearanceModel", "resolveDoorAppearanceModel", "PlaceableAppearanceModelLookupResult", "DoorAppearanceModelLookupResult"],
  },
  {
    id: "snapshot-index-aurora-2da-lookups",
    file: "backend/src/modules/catalog/adapters/outbound/blob/module-snapshot-template-catalog.repository.ts",
    required: ["placeableAppearanceModelByRowId", "doorTwoDaLookup", "resolvePlaceableAppearanceModel", "resolveDoorAppearanceModel"],
  },
  {
    id: "process-placeable-uses-area-instance-contract",
    file: "backend/src/modules/catalog/application/catalog.application.service.ts",
    required: ["resolveAreaInstancePlaceableRenderMetadata", "buildAreaInstanceRenderFingerprint", "areaInstanceModelLookupStatus", "lookupModelResRef"],
  },
  {
    id: "area-instance-cache-cannot-poison-placeables-mode",
    file: "frontend/src/modules/layout/application/workspacePlaceableRenderContracts.ts",
    required: ["AREA_INSTANCE_RENDER_ROW_CACHE_KEY_PREFIX", "area-instance-render-row", "buildAreaInstanceRenderPayloadCacheKey", "objectKind: object.kind", "sourceInstanceIndexKey", "publishTemplateAliases", "publishTemplateAliases: !hasAreaInstanceRenderOverride"],
  },
  {
    id: "areas-dedupe-git-render-payloads-by-render-facts",
    file: "frontend/src/modules/layout/application/workspacePlaceableRenderContracts.ts",
    required: ["normalizeRenderPayloadCacheKeyPart", "AREA_INSTANCE_RENDER_ROW_CACHE_KEY_PREFIX", "appearance:${appearance}", "generic:${generic}"],
  },
  {
    id: "areas-batch-dedupes-git-render-payload-lookups",
    file: "frontend/src/modules/layout/components/WorkspaceMockLayout.tsx",
    required: ["lookupByCacheKey.has(lookup.cacheKey)", "lookupByCacheKey.set(lookup.cacheKey, lookup)"],
  },
  {
    id: "areas-forward-git-instance-facts-to-backend",
    file: "frontend/src/modules/layout/application/workspacePlaceableRenderContracts.ts",
    required: ["appearanceType: sourceAppearanceType", "genericType: sourceGenericType", "object.source?.type === \"aurora_git\""],
  },
  {
    id: "areas-git-placeables-request-generic-render-contract",
    file: "frontend/src/modules/layout/application/workspacePlaceableRenderContracts.ts",
    required: ["object.source?.type === \"aurora_git\" && object.kind === \"placeables\"", "\"generic\"", "...(subtypeHint ? { subtypeHint } : {})"],
  },
  {
    id: "areas-object-add-panel-is-not-buried-under-area-loader",
    file: "frontend/src/modules/layout/components/AreasModePanel.tsx",
    requiredOrdered: ["activeMode.showAreaSelectionPanel", "<SceneObjectAddPanel"],
  },
  {
    id: "area-actions-stay-near-area-list",
    file: "frontend/src/modules/layout/components/AreaSelectionPanel.tsx",
    required: ["area-selection-panel", "area-selection-actions", "Open Selected Area"],
  },
  {
    id: "canvas-wheel-does-not-scroll-workspace",
    file: "frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx",
    required: ["type WheelEvent", "handleCanvasWheel", "event.preventDefault()", "onWheel={handleCanvasWheel}"],
  },
  {
    id: "areas-canvas-and-panels-contain-scroll",
    file: "frontend/src/styles.css",
    required: [".workspace-canvas-layer", "overscroll-behavior: none", ".area-selection-actions", ".area-selection-panel .scene-object-list", ".workspace-sidebar-left .scene-object-add-panel"],
  },
  {
    id: "aurora-git-world-units-map-to-area-tile-space",
    file: "backend/src/modules/areas/adapters/outbound/blob/module-snapshot-area.repository.ts",
    required: ["AURORA_GIT_UNITS_PER_TILE = 10", "toAreaSceneTileCoordinate", "x: clampCoordinate(toAreaSceneTileCoordinate(placement.x))", "y: clampCoordinate(toAreaSceneTileCoordinate(placement.y))"],
  },
  {
    id: "area-process-cache-invalidates-coordinate-contract",
    file: "backend/src/modules/areas/domain/area-processing.builders.ts",
    required: ["area-process/v8", "object.resRef ?? \"\"", "tile.modelResRef ?? \"\"", "tile.tileId ?? \"\""],
  },
  {
    id: "backend-areas-auto-syncs-missing-vanilla-tileset-set-sources",
    file: "backend/src/modules/areas/adapters/outbound/blob/module-snapshot-area.repository.ts",
    required: ["RuntimeSettingsApplicationService", "collectMissingTilesetSetResRefs", "syncVanillaTilesetSetSources", "areas-tileset-set-auto-sync", "refreshCandidateTilesetsFromLookup", "stringifyTilesetFingerprint"],
  },
  {
    id: "backend-runtime-tileset-set-sync-includes-hak-tile-sources",
    file: "backend/src/modules/runtime-settings/application/runtime-settings.application.service.ts",
    required: ["readHakTilesetSetAssets", "settings.sources.tile.includeHaks", "resolveHakSettingsByAsset(settings, moduleIfoHakList).tile.hakPaths", "__aurora/sources/hak/${hakName}/${asset.fileName}", "extension !== \"set\""],
  },
  {
    id: "backend-runtime-tile-model-sync-includes-hak-model-sources",
    file: "backend/src/modules/runtime-settings/application/runtime-settings.application.service.ts",
    required: ["readHakTileModelAssets", "settings.sources.tile.includeHaks", "tileHakPaths", "VANILLA_TILE_MODEL_RESOURCE_TYPES", "__aurora/sources/hak/${hakName}/${asset.fileName}", "missingModelResRefs", "tile_model_sources_disabled"],
  },
  {
    id: "backend-tile-model-sync-targets-mdl-texture-references",
    file: "backend/src/modules/runtime-settings/application/runtime-settings.application.service.ts",
    required: ["collectAuroraMdlTextureReferencesFromFiles", "readHakTextureAssets", "readVanillaTextureAssetsFromKeyBif", "missingTextureResRefs", "upsertTextureIndexFiles", "__aurora/sources/vanilla/textures"],
  },
  {
    id: "runtime-settings-enables-lc-tiles-hak-source-for-area-tilesets",
    file: "backend/config/runtime-settings.json",
    required: ["\"tile\"", "\"includeHaks\": true", "\"hakProfileId\": \"lc_tiles\"", "\"medieval.hak\""],
  },
  {
    id: "runtime-defaults-map-lc-tiles-profile-to-real-tcm01-source",
    file: "backend/src/modules/runtime-settings/domain/runtime-settings.defaults.ts",
    required: ["lc_tiles: [\"medieval.hak\"]"],
  },
  {
    id: "areas-preserve-raw-git-template-resref-for-placeable-fetch",
    file: "backend/src/modules/areas/adapters/outbound/blob/module-snapshot-area.repository.ts",
    required: ["buildAreaObjectTemplateId", "resRef: templateResRef", "prefixedPattern.test(templateResRef)"],
  },
  {
    id: "frontend-area-uses-raw-git-resref-for-placeable-render-fetch",
    file: "frontend/src/modules/areas/application/areaSceneMapper.ts",
    required: ["sourceResRef", "resRef: sourceResRef", "templateId: entry.templateId"],
  },
  {
    id: "frontend-area-http-adapter-preserves-raw-git-resref",
    file: "frontend/src/modules/areas/adapters/httpAreaApiPort.ts",
    required: ["resRef: z.string().min(1).optional()", "resRef: input.resRef"],
  },
  {
    id: "aurora-tile-list-renders-even-when-model-metadata-is-incomplete",
    file: "frontend/src/modules/layout/adapters/three/workspaceTerrainMesh.ts",
    required: ["modelResolvedCount < tileCount", "code: \"source_backed_tile_model_bridge\"", "renderGenericMesh: true", "model geometry blocked"],
  },
  {
    id: "areas-runtime-exposes-backend-render-contract-readiness",
    file: "frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx",
    required: ["resolveAreaObjectBackendRenderContractDiagnostics", "areaObjectBackendRenderContractStatus", "areaObjectBackendRenderPayloadReadyCount", "areaObjectBackendRenderModelUrlReadyCount", "areaObjectPrimitiveFallbackIds"],
  },
  {
    id: "areas-render-payload-requests-are-queued",
    file: "frontend/src/modules/layout/components/WorkspaceMockLayout.tsx",
    required: ["AREAS_RENDER_PAYLOAD_QUEUE_CONCURRENCY", "AREAS_RENDER_PAYLOAD_QUEUE_YIELD_MS", "const runWorker = async ()", "Math.min(AREAS_RENDER_PAYLOAD_QUEUE_CONCURRENCY, lookups.length)"],
  },
  {
    id: "areas-render-payload-requests-use-batch-fast-path",
    file: "frontend/src/modules/layout/components/WorkspaceMockLayout.tsx",
    required: ["AREAS_RENDER_PAYLOAD_BATCH_SIZE", "fetchPlaceableViewportRenderPayloadBatch", "placeableApiPort.processPlaceables", "runBatchQueue", "render_payload_batch_loaded", "render_payload_batch_failed"],
  },
  {
    id: "areas-render-payload-batch-queue-runs-concurrent-workers",
    file: "frontend/src/modules/layout/components/WorkspaceMockLayout.tsx",
    required: ["const runBatchWorker = async ()", "AREAS_RENDER_PAYLOAD_BATCH_QUEUE_CONCURRENCY", "Promise.all(Array.from({ length: workerCount }, () => runBatchWorker()))", "snapshot.batchSize * AREAS_RENDER_PAYLOAD_BATCH_QUEUE_CONCURRENCY"],
  },
  {
    id: "areas-ikea-hot-render-payload-batch-window-is-pinned",
    file: "frontend/src/modules/layout/components/WorkspaceMockLayout.tsx",
    required: [
      "const AREAS_RENDER_PAYLOAD_BATCH_QUEUE_CONCURRENCY = 2;",
      "const AREAS_RENDER_PAYLOAD_BATCH_SIZE = 128;",
    ],
  },
  {
    id: "backend-placeables-exposes-render-payload-batch-process",
    file: "backend/src/modules/catalog/adapters/inbound/http/placeables.controller.ts",
    required: ["@Post(\"process/batch\")", "parsePlaceableProcessBatchPayload", "processPlaceablesBatch"],
  },
  {
    id: "backend-placeables-exposes-asset-contract-batch-process",
    file: "backend/src/modules/catalog/adapters/inbound/http/placeables.controller.ts",
    required: ["@Post(\"cache/assets/contracts/batch\")", "parsePlaceableAssetDeliveryBatchPayload", "getProcessedPlaceableAssetDeliveryBatch"],
  },
  {
    id: "frontend-placeables-port-exposes-optional-process-batch",
    file: "frontend/src/modules/placeables/ports/placeableApiPort.ts",
    required: ["processPlaceables?", "getPlaceableAssetContractsBatch?", "PlaceableApiProcessBatchResult", "PlaceableApiAssetContractsBatchRequestItem", "PlaceableApiProcessPayload[]"],
  },
  {
    id: "frontend-placeables-http-adapter-posts-process-batch",
    file: "frontend/src/modules/placeables/adapters/httpPlaceableApiPort.ts",
    required: ["placeableProcessBatchEnvelopeSchema", "placeableAssetContractsBatchEnvelopeSchema", "/catalog/placeables/process/batch", "/catalog/placeables/cache/assets/contracts/batch", "processPlaceables", "getPlaceableAssetContractsBatch", "JSON.stringify({ items: requestPayloads })"],
  },
  {
    id: "frontend-render-payload-batch-resolves-asset-contracts-in-batch",
    file: "frontend/src/modules/placeables/application/placeableRenderPayloadResolver.ts",
    required: ["resolveViewportRenderPayloadsFromProcessResultsBatch", "getPlaceableAssetContractsBatch", "PlaceableApiAssetContractsBatchRequestItem", "initialContractRequests", "retryRequests"],
  },
  {
    id: "frontend-render-payload-batch-splits-failed-process-batches",
    file: "frontend/src/modules/placeables/application/placeableRenderPayloadResolver.ts",
    required: ["PLACEABLE_VIEWPORT_RENDER_PAYLOAD_BATCH_SPLIT_THRESHOLD", "fetchPlaceableViewportRenderPayloadProcessBatchWithRecovery", "entries.slice(0, midpoint)", "placeableApiPort.processPlaceable"],
  },
  {
    id: "frontend-render-payload-asset-contract-recovery-is-bounded",
    file: "frontend/src/modules/placeables/application/placeableRenderPayloadResolver.ts",
    required: ["PLACEABLE_ASSET_CONTRACT_SINGLE_RECOVERY_CONCURRENCY", "mapWithConcurrency", "getPlaceableAssetContracts"],
  },
  {
    id: "areas-camera-frames-real-aurora-tile-and-git-bounds",
    file: "frontend/src/modules/layout/adapters/three/workspaceThreeRuntime.ts",
    required: ["resolveSceneFrameBounds", "aurora_tile_list_and_git_objects", "sceneData.tiles.forEach", "sceneData.objects.forEach", "areaCameraFrameStatus", "resolveSceneFrameDistance"],
  },
  {
    id: "areas-camera-bounds-include-declared-area-dimensions",
    file: "frontend/src/modules/layout/adapters/three/workspaceThreeRuntime.ts",
    required: ["Math.max(1, sceneData.width)", "Math.max(1, sceneData.height)", "expandSceneFrameBounds(bounds, 0, 0, 0)", "if (!objectPreview)"],
  },
  {
    id: "areas-publish-placeable-render-payloads-by-scene-object-id",
    file: "frontend/src/modules/layout/application/workspacePlaceableRenderContracts.ts",
    required: ["sourceInstanceIndexKey", "object.source?.type === \"aurora_git\" ? objectId : null"],
  },
  {
    id: "areas-bind-render-payloads-by-scene-object-id",
    file: "frontend/src/modules/layout/components/WorkspaceMockLayout.tsx",
    required: ["payloadByObjectId[object.id] = payload", "placeableRenderPayloadByObjectId={placeableRenderPayloadByObjectId}"],
  },
  {
    id: "areas-open-runs-tile-process-contract-readiness",
    file: "frontend/src/modules/layout/components/AreaSelectionPanel.tsx",
    required: ["const openSelectedArea = useCallback(async () =>", "resolveAreaTileProcessContractReadiness", "tileProcessContractStatus", "open_tile_process_readiness_failed", "setIsCheckingTerrainReadiness(true)"],
  },
  {
    id: "areas-runtime-proves-shared-placeables-renderer-binding",
    file: "frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx",
    required: ["areaObjectSharedRendererPath", "areaObjectSharedRendererPayloadBoundCount", "areaObjectSharedRendererModelReadyCount", "areaObjectSharedRendererPrimitiveFallbackCount", "areaObjectSharedRendererMissingPayloadIds"],
  },
  {
    id: "area-object-meshes-carry-shared-renderer-runtime-evidence",
    file: "frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts",
    required: ["isAreaObjectSharedPlaceablesRendererTarget", "auroraAreaObjectSharedRendererPath", "auroraAreaObjectSharedRendererPayloadStatus", "auroraAreaObjectSharedRendererGeometryStatus", "shared-placeables-renderer"],
  },
  {
    id: "runtime-hud-surfaces-area-shared-renderer-evidence",
    file: "frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx",
    required: ["areaObjectSharedRendererDiagnostics", "Area PLC/DOR renderer", "payloadReadyCount", "modelUrlReadyCount", "primitiveFallbackCount", "missingPayloadIds"],
  },
  {
    id: "areas-shared-renderer-snapshot-is-browser-readable",
    file: "frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx",
    required: ["AREA_SHARED_RENDERER_SNAPSHOT_EVENT", "aurora:areas:shared-renderer-snapshot", "areaObjectSharedRendererSnapshot", "writeAreaSharedRendererRuntimeSnapshot", "aurora-areas-shared-renderer-runtime/v1"],
  },
  {
    id: "frontend-tile-process-preserves-backend-render-asset-contract",
    file: "frontend/src/modules/tiles/adapters/httpTileApiPort.ts",
    required: ["tileSourceAssetContractSchema", "tileRenderAssetContractSchema", "sourceAsset: tileSourceAssetContractSchema.optional()", "renderAssetContract: tileRenderAssetContractSchema.optional()", "rendererHandoffStatus"],
  },
  {
    id: "area-selection-publishes-tile-process-readiness-to-runtime",
    file: "frontend/src/modules/layout/components/AreaSelectionPanel.tsx",
    required: ["onTileProcessReadinessChange", "publishTileProcessReadiness", "publishTileProcessReadiness(nextTileProcessReadiness)", "publishTileProcessReadiness(null)"],
  },
  {
    id: "areas-tile-process-readiness-flows-to-canvas-runtime",
    file: "frontend/src/modules/layout/components/WorkspaceMockLayout.tsx",
    required: ["AreaTileProcessContractReadiness", "areaTileProcessReadiness", "setAreaTileProcessReadiness", "onTileProcessReadinessChange={setAreaTileProcessReadiness}", "areaTileProcessReadiness={areaTileProcessReadiness}"],
  },
  {
    id: "runtime-hud-surfaces-real-area-tile-process-contracts",
    file: "frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx",
    required: ["areaTileProcessReadiness", "areaTileProcessRuntimeStatus", "Tile process runtime", "sourceAssetReadyCount", "renderLoaderReadyCount", "mdlSourceReadyCount", "glbGeometryReadyCount"],
  },
  {
    id: "areas-tile-process-runtime-snapshot-is-browser-readable",
    file: "frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx",
    required: ["AREA_TILE_PROCESS_RUNTIME_SNAPSHOT_EVENT", "aurora:areas:tile-process-runtime-snapshot", "AreaTileProcessRuntimeSnapshot", "areaTileProcessRuntimeSnapshot", "aurora-areas-tile-process-runtime/v1", "backend-tile-process-contract", "renderAssetContractBlockerSummary"],
  },
  {
    id: "backend-tile-process-cache-invalidates-derived-model-contract",
    file: "backend/src/modules/tiles/domain/tile-processing.builders.ts",
    required: ["tile-process/v4", "tile.renderModelObjectKey", "tile.renderModelExtension", "tile.renderModelSizeBytes", "tile.renderModelEtag"],
  },
  {
    id: "backend-tile-process-bypass-refreshes-module-snapshot-index",
    file: "backend/src/modules/tiles/application/tiles.application.service.ts",
    required: ["query.bypassCache", "refreshTileRepositorySnapshotForBypass", "TILE_REPOSITORY_SNAPSHOT_REFRESH_DEBOUNCE_MS", "tileRepositorySnapshotRefreshedAtMs", "resolveTileRecordForProcess(query.tileId, query.bypassCache)"],
  },
  {
    id: "backend-tile-process-auto-syncs-missing-vanilla-model-source",
    file: "backend/src/modules/tiles/application/tiles.application.service.ts",
    required: ["RuntimeSettingsApplicationService", "TILE_AUTO_SOURCE_SYNC_TRIGGERED_BY", "areas-tile-process-auto-sync", "resolveTileRecordForProcess", "syncMissingVanillaTileModelSource", "parseTileModelResRefFromCatalogId", "syncVanillaTileModelSources", "Attempted vanilla tile model source sync"],
  },
  {
    id: "backend-tile-snapshot-binds-derived-glb-model-assets",
    file: "backend/src/modules/tiles/adapters/outbound/blob/module-snapshot-tile.repository.ts",
    required: ["DERIVED_MODEL_EXTENSIONS", "__aurora/derived/models/", "renderModelObjectKey", "renderModelExtension", "derivedModelByResref", "derivedModelScore"],
  },
  {
    id: "backend-tile-snapshot-index-refresh-is-callable",
    file: "backend/src/modules/tiles/adapters/outbound/blob/module-snapshot-tile.repository.ts",
    required: ["refreshSnapshot(): void", "this.snapshotIndex = null", "this.snapshotIndexPromise = null"],
  },
  {
    id: "backend-tile-snapshot-index-build-is-deduped",
    file: "backend/src/modules/tiles/adapters/outbound/blob/module-snapshot-tile.repository.ts",
    required: ["snapshotIndexPromise", "return this.snapshotIndexPromise", "this.snapshotIndexPromise = this.rebuildSnapshotIndex(now)", "finally", "rebuildSnapshotIndex(now: number)"],
  },
  {
    id: "backend-tile-snapshot-indexes-derived-only-tile-models",
    file: "backend/src/modules/tiles/adapters/outbound/blob/module-snapshot-tile.repository.ts",
    required: ["buildDerivedOnlyTileModelCandidates", "sourceCandidatesByResref.has(resref)", "looksLikeTileResref(resref, renderModel.sourceKey)", "renderModel"],
  },
  {
    id: "backend-tile-render-contract-exposes-model-loader-handoff",
    file: "backend/src/modules/tiles/application/tiles.application.service.ts",
    required: ["getProcessedTileModel", "buildTileRenderModelAssetContract", "buildTileModelDeliveryPath", "modelDeliveryStatus", "rendererHandoffStatus: modelAsset ? \"ready\"", "expectedDerivedModelObjectKey", "derived_model_asset"],
  },
  {
    id: "backend-tile-render-contract-exposes-mdl-material-textures",
    file: "backend/src/modules/tiles/application/tiles.application.service.ts",
    required: ["resolveTileMaterialTextureAssets", "collectTileMdlTextureReferences", "getTextureDeliveryContracts", "materialTextureAssets", "texture_material_contract_ready"],
  },
  {
    id: "backend-tile-render-contract-distinguishes-derived-model-source-blockers",
    file: "backend/src/modules/tiles/application/tiles.application.service.ts",
    required: ["resolveTileMaterialBindingStatus", "resolveTileSourceAssetBlocker", "blocked_tile_material_binding_derived_model_only", "tile_source_asset_derived_model_only"],
  },
  {
    id: "backend-tile-texture-contract-does-not-serve-derived-model-as-texture",
    file: "backend/src/modules/tiles/application/tiles.application.service.ts",
    required: ["assertTileTextureDeliveryAvailable", "resolveTileTextureDeliveryStatus", "blocked_tile_texture_contract_derived_model_only", "TILE_TEXTURE_CONTRACT_NOT_AVAILABLE"],
  },
  {
    id: "backend-tile-controller-streams-derived-model",
    file: "backend/src/modules/tiles/adapters/inbound/http/tiles.controller.ts",
    required: ["@Get(\"cache/:cacheKey/model\")", "getProcessedTileModel", "X-Aurora-Tile-Model-Object-Key", "tile-model."],
  },
  {
    id: "backend-vanilla-tile-model-sync-generates-derived-model-assets",
    file: "backend/src/modules/runtime-settings/application/runtime-settings.application.service.ts",
    required: ["syncVanillaTileModelSources", "const derivedAssets = await this.generateDerivedAssetFiles(settings, sourceFiles)", "for (const file of [...textureFiles, ...sourceFiles, ...derivedAssets.files])", "derivedAssets: derivedAssets.summary", "buildSkippedDerivedAssetSummary"],
  },
  {
    id: "backend-host-local-runtime-mode-is-explicit",
    file: "backend/src/common/config/env.schema.ts",
    required: ["AURORA_HOST_LOCAL_RUNTIME", "AURORA_LOCAL_BLOB_MIRROR"],
  },
  {
    id: "backend-host-local-runtime-uses-memory-infra",
    file: "backend/src/common/config/app-config.service.ts",
    required: ["hostLocalRuntime", "localBlobMirrorPath", "useMemoryInfrastructure", "this.hostLocalRuntime ? \"memory\""],
  },
  {
    id: "backend-host-local-runtime-binds-local-blob-storage",
    file: "backend/src/modules/runtime-settings/runtime-settings.module.ts",
    required: ["LocalModuleBlobStorageService", "config.hostLocalRuntime ? localStorage : s3Storage"],
  },
  {
    id: "backend-host-local-runtime-file-blob-storage-is-local-mirror",
    file: "backend/src/modules/runtime-settings/adapters/outbound/file/local-module-blob-storage.service.ts",
    required: ["LocalModuleBlobStorageService", "ModuleBlobStoragePort", "listModuleSnapshot", "getModuleObject", "putModuleObject", "replaceModuleSnapshot", "source: \"local_blob_mirror\""],
  },
  {
    id: "backend-host-local-runtime-skips-bootstrap-sync",
    file: "backend/src/modules/runtime-settings/application/runtime-settings-bootstrap.service.ts",
    required: ["config.hostLocalRuntime", "isBootstrapSyncDisabled(this.config)"],
  },
  {
    id: "backend-ikea-tile-source-readiness-audit-is-executable",
    file: "backend/scripts/check-areas-ikea-tile-source-readiness.mjs",
    required: [
      "aurora-areas-ikea-tile-source-readiness/v1",
      "TARGET_AREA_ID = \"area__ikea\"",
      "TARGET_AREA_QUERY = \"_ikea\"",
      "processTile({",
      "sourceAssetReadyCount",
      "renderAssetContractCount",
      "modelAssetReadyCount",
      "topBlockers",
      "canonicalParityPromoted: false",
      "visualParityPromoted: false",
      "module_blob_storage_endpoint_unresolvable",
      "AREAS_AUDIT_BLOB_ENDPOINT",
      "--blobEndpoint",
      "compose_dns_host_default",
      "host_blob_storage_endpoint_unavailable",
      "AREAS_AUDIT_LOCAL_BLOB_MIRROR",
      "--localBlobMirror",
      "local_blob_mirror",
      "local_blob_mirror_unavailable",
      "source_direct_files",
      "source_direct_parser_unavailable",
      "parseAreaMetadataFromAreGff",
      "parseAuroraSetTiles",
      "readNwnErfResource",
      "NwnKeyBifResourceReader",
      "tileCountMatchesExpectedIkea256",
      "source_direct_mdl_missing",
      "source_direct_mdl_texture_refs_unavailable",
      "source_direct_texture_missing",
      "source_direct_mdl_source_ready",
      "collectTileMdlTextureReferences",
      "NWN_KEY_BIF_RESOURCE_TYPES.MDL",
      "NWN_KEY_BIF_RESOURCE_TYPES.DDS",
      "renderContractBridge",
      "source_direct_render_contract_bridge",
      "dry_run_would_write",
      "source_direct_contract_dry_run_not_written",
      "buildTileProcessCacheKey",
      "buildTileRenderAssetContract",
      "convertAuroraMdlToGlb",
      "wouldWrite",
      "__aurora/derived/models/",
      "moduleSnapshotManifestObjectKey",
      "AREAS_AUDIT_WRITE_LOCAL_BLOB_MIRROR",
      "--writeLocalBlobMirror",
      "writeSourceDirectLocalBlobMirror",
      "local_blob_mirror_written",
      "area_are_source",
      "tileset_set_source",
    ],
  },
  {
    id: "frontend-tile-contract-accepts-ready-model-loader",
    file: "frontend/src/modules/tiles/adapters/httpTileApiPort.ts",
    required: ["glbGeometryStatus: z.enum", "\"ready\"", "rendererHandoffStatus: z.enum", "modelDeliveryStatus", "modelAsset", "expectedDerivedModelObjectKey"],
  },
  {
    id: "frontend-area-tile-readiness-counts-real-glb-loader-ready",
    file: "frontend/src/modules/tiles/application/areaTileProcessContractReadiness.ts",
    required: ["AreaTileGlbGeometryStatus", "| \"ready\"", "renderAssetEvidence.glbGeometryStatus", "renderAssetContract?.rendererHandoffStatus", "glbGeometryStatus !== \"ready\""],
  },
  {
    id: "frontend-tile-readiness-exposes-model-delivery-contract",
    file: "frontend/src/modules/tiles/application/areaTileProcessContractReadiness.ts",
    required: ["modelDeliveryStatus", "modelDeliveryUrl", "modelAssetObjectKey", "expectedDerivedModelObjectKey", "renderAssetContract?.modelAsset?.deliveryUrl"],
  },
  {
    id: "frontend-tile-readiness-does-not-block-model-delivery-on-texture-contract",
    file: "frontend/src/modules/tiles/application/areaTileProcessContractReadiness.ts",
    required: ["const processed = await tileApiPort.processTile", "textureContractStatus: \"not_checked\"", "modelDeliveryUrl: renderAssetEvidence.modelDeliveryUrl", "renderLoaderHandoffStatus: renderAssetEvidence.renderLoaderHandoffStatus", "renderAssetContractBlockers.length > 0", ": \"none\""],
  },
  {
    id: "frontend-tile-readiness-preserves-backend-material-blockers",
    file: "frontend/src/modules/tiles/application/areaTileProcessContractReadiness.ts",
    required: ["resolveAreaTileMaterialReadinessStatus", "blocked_tile_material_binding_derived_model_only", "blocked_tile_process_contract_missing_material_bindings", "isAreaTileMaterialBindingBlocked", "textureContractStatus: \"not_checked\""],
  },
  {
    id: "frontend-tile-readiness-preserves-backend-texture-blockers",
    file: "frontend/src/modules/tiles/application/areaTileProcessContractReadiness.ts",
    required: ["resolveAreaTileTextureDeliveryFailureStatus", "blocked_tile_texture_contract_derived_model_only", "renderAssetEvidence.textureDeliveryStatus"],
  },
  {
    id: "frontend-tile-readiness-summarizes-texture-material-blockers",
    file: "frontend/src/modules/tiles/application/areaTileProcessContractReadiness.ts",
    required: ["textureMaterialBlockerSummary", "texture=", "material=", "isAreaTileMaterialBindingBlocked(entry.materialReadinessStatus)", "blocked_tile_texture_contract_derived_model_only"],
  },
  {
    id: "frontend-tile-readiness-does-not-mark-material-blocked-tiles-ready",
    file: "frontend/src/modules/tiles/application/areaTileProcessContractReadiness.ts",
    required: ["resolveAreaTileProcessEntryStatus", "isAreaTileMaterialBindingBlocked(input.materialReadinessStatus)", "formatTileContractEntryBlocker", "mdlGlbMaterialBlockers"],
  },
  {
    id: "frontend-area-tile-readiness-preserves-process-failure-blockers",
    file: "frontend/src/modules/tiles/application/areaTileProcessContractReadiness.ts",
    required: ["formatTileProcessContractFailureBlocker", "tile_process_contract_failed:${code}", "renderAssetContractBlockers: processFailureBlocker", "buildMdlGlbMaterialBlockers", "getStringField(error, \"code\")", "normalizedMessage"],
  },
  {
    id: "frontend-tile-readiness-processes-all-area-model-contracts",
    file: "frontend/src/modules/tiles/application/areaTileProcessContractReadiness.ts",
    required: ["TILE_PROCESS_CONTRACT_QUEUE_CONCURRENCY", "processTileContractCandidates", "new Array(candidates.length)", "entries[index] = await resolveTileProcessContractEntry", "checkedCandidateCount: entries.length"],
  },
  {
    id: "frontend-area-tile-readiness-uses-backend-cache-for-area-open",
    file: "frontend/src/modules/tiles/application/areaTileProcessContractReadiness.ts",
    required: ["AreaTileProcessContractReadinessOptions", "tileApiPort.processTile", "bypassCache: options.bypassCache ?? false"],
  },
  {
    id: "frontend-area-manual-terrain-readiness-can-refresh-tile-process-cache",
    file: "frontend/src/modules/layout/components/AreaSelectionPanel.tsx",
    required: ["terrain_readiness_checked", "resolveAreaTileProcessContractReadiness", "bypassCache: true"],
  },
  {
    id: "frontend-terrain-uses-shared-placeables-loader-for-tile-models",
    file: "frontend/src/modules/layout/adapters/three/workspaceTerrainMesh.ts",
    required: ["ensurePlaceableModel", "TILE_MODEL_LAYER_NAME", "terrain-backend-tile-models", "TILE_MODEL_LOADER_PATH", "shared-placeables-gltf-loader", "buildTileModelContractsByModelResRef", "resolvePlaceableAssetDeliveryUrl", "areaTerrainTileModelLoadedCount", "bridgeTiles"],
  },
  {
    id: "frontend-terrain-applies-tile-material-textures-with-shared-placeables-loader",
    file: "frontend/src/modules/layout/adapters/three/workspaceTerrainMesh.ts",
    required: ["ensurePlaceableTexturesByReference", "applyPlaceableTexturesToModel", "textureUrlsByReference", "auroraTerrainTileMaterialTextureStatus", "modelMaterialTextureAppliedTileCount"],
  },
  {
    id: "frontend-shared-texture-loader-accepts-backend-texture-format-query",
    file: "frontend/src/modules/placeables/adapters/three/placeableThreeAssetLoader.ts",
    required: ["searchParams.get(\"format\")", "shouldAttemptAuroraTpcDecode", "extension === \".dds\""],
  },
  {
    id: "frontend-placeable-model-delivery-bypasses-vite-proxy-in-dev",
    file: "frontend/src/modules/placeables/application/placeableRenderAssetResolver.ts",
    required: ["isViteDevServerOrigin", "return DEFAULT_BACKEND_DELIVERY_ORIGIN", "!isViteDevServerOrigin(deliveryOrigin)"],
  },
  {
    id: "frontend-terrain-renders-declared-area-extent-footprint",
    file: "frontend/src/modules/layout/adapters/three/workspaceTerrainMesh.ts",
    required: ["TILE_AREA_EXTENT_LAYER_NAME", "terrain-area-extent-footprint", "TILE_AREA_EXTENT_FOOTPRINT_STATUS", "scene-dimensions-footprint-backed-by-area-contract", "rebuildTerrainExtentLayer", "sceneData.width", "sceneData.height", "areaTerrainExtentFootprintSize", "clearTerrainExtentLayer"],
  },
  {
    id: "frontend-terrain-tile-model-runtime-snapshot-is-browser-readable",
    file: "frontend/src/modules/layout/adapters/three/workspaceTerrainMesh.ts",
    required: ["AREA_TERRAIN_TILE_MODEL_RUNTIME_SNAPSHOT_EVENT", "aurora:areas:terrain-tile-model-runtime-snapshot", "AreaTerrainTileModelRuntimeSnapshot", "aurora-areas-terrain-tile-model-runtime/v1", "areaTerrainTileModelRuntimeSnapshot", "runtime.scene.userData.auroraTerrainTileModelRuntimeSnapshot", "new CustomEvent<AreaTerrainTileModelRuntimeSnapshot>"],
  },
  {
    id: "frontend-terrain-tile-model-loader-failures-are-exact",
    file: "frontend/src/modules/layout/adapters/three/workspaceTerrainMesh.ts",
    required: ["modelFailedTileCount", "modelLoaderErrorSample", "areaTerrainTileModelFailedCount", "areaTerrainTileModelLoaderErrorSample", "formatTerrainTileModelLoaderError", "markTerrainTileModelLoadFailed", "failedTileIds", "loaderErrorsByTileId", "tile_model_loader_failed", "tile_model_loader_returned_null"],
  },
  {
    id: "frontend-canvas-passes-tile-readiness-to-terrain-renderer",
    file: "frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx",
    required: ["areaTileProcessReadiness ?? null", "formatAreaTileModelLoaderRuntimeStatus", "Tile model loader"],
  },
  {
    id: "frontend-canvas-exposes-tile-texture-material-runtime-blockers",
    file: "frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx",
    required: ["materialTextureContractReadyCount", "materialBindingBlockedCount", "textureMaterialBlockerSummary", "areaTileProcessRuntimeTextureMaterialBlockers", "Tile texture/material blockers"],
  },
  {
    id: "backend-package-exposes-areas-runtime-capture",
    file: "backend/package.json",
    required: ["\"areas:runtime-capture\": \"node scripts/capture-areas-runtime-cdp.mjs\""],
  },
  {
    id: "backend-package-exposes-areas-retail-oracle-gate",
    file: "backend/package.json",
    required: ["\"areas:retail-oracle-gate\": \"node scripts/check-areas-retail-oracle.mjs\""],
  },
  {
    id: "backend-package-exposes-areas-toolset-reset-gate",
    file: "backend/package.json",
    required: ["\"areas:toolset-reset-gate\": \"node scripts/check-areas-toolset-reset-controls.mjs\""],
  },
  {
    id: "areas-toolset-reset-controls-gate-is-executable",
    file: "backend/scripts/check-areas-toolset-reset-controls.mjs",
    required: [
      "aurora-toolset-reset-controls-extract/v2",
      "tbModuleDisplay",
      "sbFindStart",
      "Goto Start Location",
      "actFindStartExecute",
      "sbRecenter",
      "Reorient Camera",
      "sbRecenterClick",
      "usesGlobalCursor: false",
    ],
  },
  {
    id: "areas-ikea-retail-toolset-oracle-is-executable",
    file: "backend/scripts/check-areas-retail-oracle.mjs",
    required: [
      "aurora-areas-retail-toolset-oracle/v1",
      "EXPECTED_AREA_RESREF = \"_ikea\"",
      "retail_toolset_ikea_opened",
      "manifest.canonicalParityPromoted === false",
      "DISPLAY6",
      "WM_MOUSEWHEEL",
      "bRotateClockwise",
      "bGobRotateClockwise",
    ],
  },
  {
    id: "areas-ikea-retail-toolset-oracle-manifest-is-source-backed",
    file: "backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/aurora-toolset-ikea-oracle-manifest.json",
    required: [
      "aurora-areas-retail-toolset-oracle/v1",
      "the_last_city \\u2014 codex.mod",
      "\"areaResRef\": \"_ikea\"",
      "retail_toolset_ikea_opened",
      "\"canonicalParityPromoted\": false",
      "toolset-reset-controls-extract.json",
      "actFindStartExecute",
      "toolset-display2-after-correct-window-resize-20260617-194750.png",
      "toolset-ikea-controlled-zoom-in-20260617-195807.png",
      "toolset-ikea-camera-rotate-clockwise-20260617-200951.png",
      "bGobRotateClockwise",
    ],
  },
  {
    id: "areas-ikea-readiness-classifies-plc-dor-renderer-blockers",
    file: "backend/scripts/check-areas-ikea-readiness.mjs",
    required: [
      "PLC_DOR_RENDER_CLASSIFICATION",
      "plc_dor_missing_render_payloads",
      "frontend_backend_render_payload_contract_missing",
      "render_payload_queue_in_progress",
      "frontend_runtime_render_payload_queue_in_progress",
      "in_progress_not_final_missing_payload",
      "final_missing_payload_after_queue_settled",
      "userVisibleBlocker",
      "finalMissingPayload",
      "summarizeRenderPayloadQueue",
      "queueRequestCounts",
      "payloadResponseCounts",
      "batchRequestCounts",
      "batchDiagnostics",
      "hangingRequests",
      "hangingRequestItemSamples",
      "hangingPlaceableProcessBatch",
      "hangingPlaceableProcessBatchItemSamples",
      "placeableProcessBatchInFlightRequests",
      "placeableProcessBatchInFlightRequestedItems",
      "oldestInFlightAgeMs",
      "appearanceType",
      "resref",
      "queueLoaded",
      "queueTotal",
      "plc_dor_nonrenderable_user_placeable",
      "exact_source_nonrenderable_placeables_2da",
      "placeables.2da",
      "plc_dor_missing_derived_glb",
      "asset_pipeline_missing_derived_glb",
      "plc_dor_rendered_payload_ready",
      "real_rendered_payload",
      "buildPlcDorRenderClassifications",
      "classifications",
    ],
  },
  {
    id: "areas-toolset-oracle-runbook-documents-safe-controls",
    file: "backend/docs/aurora-reverse/areas-toolset-oracle-controls.md",
    required: [
      "Areas Toolset Oracle Controls",
      "DISPLAY6",
      "WM_MOUSEWHEEL",
      "bRotateClockwise",
      "bGobRotateClockwise",
      "Do not use the red circular buttons for camera rotation",
    ],
  },
  {
    id: "areas-runtime-cdp-capture-records-terrain-tile-model-snapshot",
    file: "backend/scripts/capture-areas-runtime-cdp.mjs",
    required: ["aurora-areas-runtime-cdp-capture/v1", "areas_mode", "Open Selected Area", "data-area-terrain-tile-model-runtime-snapshot", "areaTerrainTileModelRuntimeSnapshot", "aurora-areas-terrain-tile-model-runtime/v1", "Page.captureScreenshot", "canonicalParityPromoted: false", "localOnlyNotRetailEvidence: true"],
  },
  {
    id: "areas-runtime-cdp-capture-records-ikea-tile-process-snapshot",
    file: "backend/scripts/capture-areas-runtime-cdp.mjs",
    required: ["--target ikea", "resolveCaptureTargetAreaQuery", "return \"_ikea\"", "data-area-tile-process-runtime-snapshot", "areaTileProcessRuntimeSnapshot", "tileProcessRuntimeSnapshot", "tileProcessRuntimeDataset", "renderAssetContractBlockers", "mdlGlbMaterialBlockers"],
  },
  {
    id: "areas-runtime-cdp-capture-rejects-stale-ikea-snapshots",
    file: "backend/scripts/capture-areas-runtime-cdp.mjs",
    required: ["areaExpectation", "isExpectedAreaRuntimeSnapshot", "Expected Area runtime snapshot did not settle", "extentFootprintSize", "tileProcessSnapshot.status === \"not_checked\"", "captureWaitElapsedMs"],
  },
  {
    id: "areas-runtime-cdp-capture-preserves-clear-marker-across-canvas-remount",
    file: "backend/scripts/capture-areas-runtime-cdp.mjs",
    required: [
      "window.__auroraAreasRuntimeCaptureClearedAt",
      "dataset.areasRuntimeCaptureClearedAt ??",
      "workspaceCanvasLayer.dataset.areasRuntimeCaptureClearedAt",
      "aurora_areas_runtime_capture_cleared_at",
      "runtime_dataset_was_cleared_before_open",
    ],
  },
  {
    id: "areas-canvas-remounts-when-external-area-scene-changes",
    file: "frontend/src/modules/layout/components/WorkspaceMockLayout.tsx",
    required: [
      "externalSceneSeedKey",
      "externalSceneSeed.sceneId",
      "key={`workspace-canvas-${externalSceneSeedKey}`",
      "data-external-scene-id={externalSceneSeed.sceneId}",
    ],
  },
  {
    id: "areas-canvas-initializes-history-from-external-scene-seed",
    file: "frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx",
    required: ["externalSceneSeed", "sceneViewportPort.createHistoryFromScene(externalSceneSeed)", "if (externalSceneSeed)", "return;"],
  },
  {
    id: "areas-canvas-exposes-current-and-external-scene-diagnostics",
    file: "frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx",
    required: [
      "data-current-scene-id={scene.sceneId}",
      "data-current-scene-size={`${scene.width}x${scene.height}`}",
      "data-external-scene-id={externalSceneSeed?.sceneId ?? \"\"}",
      "data-external-scene-size={",
    ],
  },
  {
    id: "areas-mode-persists-selected-aurora-scene-across-reload",
    file: "frontend/src/modules/layout/components/WorkspaceMockLayout.tsx",
    required: [
      "AREAS_MODE_SELECTED_SCENE_STORAGE_KEY",
      "loadPersistedAreaSceneSeed",
      "persistAreaSceneSeed",
      "record.source === \"aurora_area\"",
      "window.sessionStorage",
    ],
  },
  {
    id: "areas-mode-restores-tile-process-readiness-after-scene-restore",
    file: "frontend/src/modules/layout/components/WorkspaceMockLayout.tsx",
    required: [
      "resolveAreaTileProcessContractReadiness",
      "restoredAreaTileProcessReadinessSignatureRef",
      "buildAreaSceneTileProcessReadinessSignature",
      "ui.workspace.areas.restore_tile_process_readiness_failed",
    ],
  },
  {
    id: "areas-runtime-cdp-capture-compares-parent-seed-and-canvas-scene",
    file: "backend/scripts/capture-areas-runtime-cdp.mjs",
    required: [
      "workspaceCanvasLayerDataset.externalSceneId",
      "canvasDataset.currentSceneId",
      "externalSceneSeedDataset",
      "canvasSceneDataset",
    ],
  },
  {
    id: "areas-runtime-exposes-placeable-model-dedupe-metrics",
    file: "frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx",
    required: [
      "uniqueModelUrlCount",
      "uniqueModelCacheKeyCount",
      "areaObjectSharedRendererUniqueModelUrlCount",
      "areaObjectSharedRendererUniqueModelCacheKeyCount",
      "modelUrlSample",
      "modelCacheKeySample",
    ],
  },
  {
    id: "areas-runtime-cdp-capture-records-placeable-model-dedupe-metrics",
    file: "backend/scripts/capture-areas-runtime-cdp.mjs",
    required: [
      "sharedRendererUniqueModelUrlCount",
      "sharedRendererUniqueModelCacheKeyCount",
      "sharedRendererModelUrlSample",
      "sharedRendererModelCacheKeySample",
    ],
  },
  {
    id: "areas-runtime-cdp-capture-writes-progress-frame-before-timeout",
    file: "backend/scripts/capture-areas-runtime-cdp.mjs",
    required: [
      "progressFramePath",
      "writeAreaRuntimeCaptureProgressFrame",
      "aurora-areas-runtime-cdp-progress/v1",
      "placeableModelLoadQueueDataset",
      "areaObjectRuntimeDataset",
    ],
  },
  {
    id: "areas-runtime-cdp-capture-records-placeable-model-queue-peaks",
    file: "backend/scripts/capture-areas-runtime-cdp.mjs",
    required: [
      "peakConcurrencyLimit",
      "peakStartsPerFrameLimit",
      "peakActiveCount",
      "peakPendingCount",
      "bulkModeActivated",
    ],
  },
  {
    id: "areas-runtime-cdp-capture-waits-for-cold-area-list",
    file: "backend/scripts/capture-areas-runtime-cdp.mjs",
    required: ["AREAS_WORKSPACE_LIST_WAIT_ATTEMPTS", "AREAS_WORKSPACE_LIST_WAIT_INTERVAL_MS", "areasWorkspaceWaitElapsedMs", "areaPanelText", "areaListLoading"],
  },
  {
    id: "areas-runtime-cdp-capture-opens-selected-area-after-react-selection",
    file: "backend/scripts/capture-areas-runtime-cdp.mjs",
    required: ["waitForAreaRowsToSettle", "waitForAreaRowSelection", "area_row_selection_did_not_settle", "aria-selected", "classList.contains(\"is-selected\")"],
  },
  {
    id: "areas-runtime-cdp-capture-waits-for-tile-model-loader-settlement",
    file: "backend/scripts/capture-areas-runtime-cdp.mjs",
    required: ["hasExpectedTileModelLoaderSettlement", "terrainSnapshot.contractTileCount", "materialTextureAppliedTileCount", "materialTextureContractTileCount", "loadedTileCount === tileCount", "failedTileCount > 0", "terrainSnapshot.status === \"blocked\"", "terrainSnapshot.blockerSummary !== \"none\""],
  },
  {
    id: "areas-runtime-cdp-capture-waits-for-placeable-model-loader-settlement",
    file: "backend/scripts/capture-areas-runtime-cdp.mjs",
    required: [
      "hasExpectedPlaceableModelLoadSettlement",
      "placeableModelLoadQueueDataset",
      "placeableModelLoadQueueActiveCount",
      "placeableModelLoadQueuePendingCount",
      "placeableModelLoadQueueCompletedCount",
      "placeableModelLoadQueueTotalCount",
      "backendRenderModelUrlReadyCount",
      "modelReadyCount + modelLoadFailedCount >= expectedModelUrlCount",
      "modelLoadQueue",
    ],
  },
  {
    id: "areas-runtime-cdp-capture-summarizes-placeable-payload-blockers",
    file: "backend/scripts/capture-areas-runtime-cdp.mjs",
    required: [
      "--summarizeFrame",
      "aurora-areas-runtime-actionability-summary/v1",
      "firstMissingObjects",
      "missingPayloadIdsSample",
      "queueRequestCounts",
      "payloadResponseCounts",
      "firstErrorReason",
      "Network.requestWillBeSent",
      "placeableProcessBatch",
      "placeableAssetContractsBatch",
      "buildConsoleSummary",
      "summarizeBlockerForConsole",
    ],
  },
  {
    id: "areas-runtime-cdp-capture-only-reports-visible-dom-blockers",
    file: "backend/scripts/capture-areas-runtime-cdp.mjs",
    required: [
      "window.getComputedStyle(element)",
      "style.display !== \"none\"",
      "style.visibility !== \"hidden\"",
      "opacity > 0.01",
      "areaSharedRendererSnapshotReady",
      "entry.selector !== \".canvas-placeable-load-overlay\"",
      ".filter((entry) => entry.visible)",
    ],
  },
  {
    id: "areas-canvas-surfaces-terrain-loading-and-object-placeholder-blockers",
    file: "frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx",
    required: ["AREA_TERRAIN_TILE_MODEL_RUNTIME_SNAPSHOT_EVENT", "resolveTerrainTileModelOverlayState", "Modele kafli Areas", "Modele PLC/DOR", "Area PLC/DOR placeholders", "formatAreaSharedRendererIssueSummary", "countAreaRuntimeIdList", "missing payloads", "canvas-area-runtime-alert", "canvas-placeable-load-spinner", "canvas-placeable-load-overlay-${placeableLoadOverlay.variant}"],
  },
  {
    id: "areas-renderer-caps-mass-primitive-placeholder-draws",
    file: "frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts",
    required: ["AREA_PRIMITIVE_FALLBACK_RENDER_LIMIT", "AREA_PRIMITIVE_FALLBACK_RENDER_SUPPRESSION_EVENT", "AREA_PRIMITIVE_FALLBACK_RENDER_SUPPRESSION_REASON", "areaPrimitiveFallbackSuppressedCount", "areaPrimitiveFallbackRenderSuppressionSnapshot", "area-mass-primitive-fallback-render-suppressed", "aurora-areas-primitive-fallback-render-suppression/v1"],
  },
  {
    id: "areas-ikea-reuses-normalized-placeable-model-prototypes",
    file: "frontend/src/modules/placeables/adapters/three/placeableThreeAssetLoader.ts",
    required: ["ensureNormalizedPlaceableModel", "buildNormalizedPlaceableModelCacheKey", "placeableNormalizedModelCacheByKey", "placeableNormalizedModelPendingByKey", "normalizePlaceableModelToObjectRadius(objectRadius, resolvedModel, options)", "PLACEABLE_SHARED_MODEL_GEOMETRY_FLAG", "PLACEABLE_NORMALIZED_MODEL_PRESENTATION_METRICS_KEY", "resolvePlaceableNormalizedModelPresentationMetrics(resolvedModel)"],
  },
  {
    id: "shared-placeables-model-loader-uses-bulk-window-for-large-area-queues",
    file: "frontend/src/modules/placeables/adapters/three/placeableThreeAssetLoader.ts",
    required: [
      "PLACEABLE_MODEL_BULK_LOAD_QUEUE_THRESHOLD",
      "PLACEABLE_MODEL_BULK_LOAD_CONCURRENCY_LIMIT",
      "PLACEABLE_MODEL_BULK_LOAD_STARTS_PER_FRAME_LIMIT",
      "PLACEABLE_MODEL_BULK_LOAD_QUEUE_THRESHOLD = 96",
      "PLACEABLE_MODEL_BULK_LOAD_CONCURRENCY_LIMIT = 32",
      "PLACEABLE_MODEL_BULK_LOAD_STARTS_PER_FRAME_LIMIT = 8",
      "isBulkPlaceableModelLoadQueue",
      "resolvePlaceableModelLoadConcurrencyLimit",
      "resolvePlaceableModelLoadStartsPerFrameLimit",
      "placeableModelLoadConcurrencyLimit",
      "placeableModelLoadStartsPerFrameLimit",
    ],
  },
  {
    id: "shared-placeables-model-loader-exposes-peak-bulk-queue-metrics",
    file: "frontend/src/modules/placeables/adapters/three/placeableThreeAssetLoader.ts",
    required: [
      "peakConcurrencyLimit",
      "peakStartsPerFrameLimit",
      "peakActiveCount",
      "peakPendingCount",
      "peakLoadTotal",
      "bulkModeActivated",
      "placeableModelLoadBulkModeActivated",
    ],
  },
  {
    id: "shared-placeables-model-loader-bulk-window-has-test",
    file: "frontend/tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts",
    required: [
      "uses the bulk loader window for large Area placeable model queues",
      "PLACEABLE_MODEL_BULK_LOAD_QUEUE_THRESHOLD",
      "PLACEABLE_MODEL_BULK_LOAD_CONCURRENCY_LIMIT",
      "PLACEABLE_MODEL_BULK_LOAD_STARTS_PER_FRAME_LIMIT",
    ],
  },
  {
    id: "areas-object-layer-preserves-shared-placeable-model-geometry",
    file: "frontend/src/modules/layout/adapters/three/workspaceObjectLayerDisposal.ts",
    required: ["PLACEABLE_SHARED_MODEL_GEOMETRY_FLAG", "node.geometry.userData?.[PLACEABLE_SHARED_MODEL_GEOMETRY_FLAG] !== true", "node.geometry.dispose()"],
  },
  {
    id: "areas-object-renderer-uses-normalized-placeable-model-cache",
    file: "frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts",
    required: ["ensureNormalizedPlaceableModel", "objectRenderPackageModelUrl", "objectRadius", "targetMaxAxisFactor: placeableModelTargetMaxAxisFactor", "resolvePlaceableNormalizedModelPresentationMetrics(resolvedModel)", "modelMetrics.boundsLabel"],
  },
  {
    id: "areas-runtime-snapshot-discloses-primitive-placeholder-render-cap",
    file: "frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx",
    required: ["AREA_PRIMITIVE_FALLBACK_RENDER_LIMIT", "primitiveFallbackRenderLimit", "primitiveFallbackSuppressedCount", "areaObjectSharedRendererPrimitiveFallbackRenderLimit", "areaObjectSharedRendererPrimitiveFallbackSuppressedCount", "render capped"],
  },
  {
    id: "areas-runtime-blocker-alerts-have-visible-canvas-styles",
    file: "frontend/src/styles.css",
    required: [".canvas-placeable-load-overlay-blocked", ".canvas-placeable-load-spinner", "font-variant-numeric: tabular-nums", ".canvas-area-runtime-alert", ".canvas-area-runtime-alert strong", ".canvas-area-runtime-alert span"],
  },
  {
    id: "areas-canvas-orbit-controls-disabled-during-asset-loading",
    file: "frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx",
    required: ["runtime.controls.enabled = !effectivePlaceableLoadOverlay.visible", "areaCanvasInteractionBlocked", "asset-loading", "areaCanvasInteractionBlockedSource", "runtime.renderer.domElement.style.cursor = effectivePlaceableLoadOverlay.visible"],
  },
  {
    id: "areas-placeable-model-overlay-clears-after-model-queue-settles",
    file: "frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx",
    required: [
      "!hasActivePlaceableModelLoadQueue(runtime)",
      "runtime.placeableModelPendingByUrl.size === 0",
      "AREA_SHARED_RENDERER_SNAPSHOT_EVENT",
      "isAreaSharedRendererModelLoadComplete",
      "isPlaceableModelOverlayLoadPhase",
      "isRuntimeAreaSharedRendererModelLoadComplete(runtime)",
      "areaSharedRendererModelLoadComplete",
      "effectivePlaceableLoadOverlay",
      "handleAreaSharedRendererSnapshot",
      "areaObjectSharedRendererStatus = status",
      "areaObjectSharedRendererPlaceholderStatus = placeholderStatus",
    ],
  },
];

const runtimeEvidenceChecks = [
  {
    id: "areas-ikea-runtime-cdp-evidence-is-structured",
    file: "backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/ikea-texture-applied-wait.frame.json",
    minimumScreenshotBytes: 100000,
  },
];

const failures = [];

for (const check of checks) {
  const absolutePath = resolve(repoRoot, check.file);
  if (!existsSync(absolutePath)) {
    failures.push({ id: check.id, file: check.file, missing: ["file"] });
    continue;
  }

  const content = readFileSync(absolutePath, "utf8");
  const missing = (check.required ?? []).filter((needle) => !content.includes(needle));
  const orderedMissing = [];
  if (Array.isArray(check.requiredOrdered)) {
    let searchFromIndex = 0;
    for (const needle of check.requiredOrdered) {
      const matchIndex = content.indexOf(needle, searchFromIndex);
      if (matchIndex < 0) {
        orderedMissing.push(needle);
        continue;
      }
      searchFromIndex = matchIndex + needle.length;
    }
  }
  missing.push(...orderedMissing.map((needle) => `ordered:${needle}`));
  if (missing.length > 0) {
    failures.push({ id: check.id, file: check.file, missing });
  }
}

for (const check of runtimeEvidenceChecks) {
  validateIkeaRuntimeEvidence(check);
}

if (failures.length > 0) {
  console.error("Areas render contract loop gate failed.");
  console.error(JSON.stringify({ failures }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      gate: "areas-render-contract-loop",
      checked: checks.map((check) => check.id),
      runtimeEvidence: runtimeEvidenceChecks.map((check) => check.id),
      contract: "Backend resolves Aurora render contracts; Areas pass ARE/GIT facts; frontend reuses Placeables renderer and only positions instances.",
    },
    null,
    2,
  ),
);

function validateIkeaRuntimeEvidence(check) {
  const absolutePath = resolve(repoRoot, check.file);
  if (!existsSync(absolutePath)) {
    failures.push({ id: check.id, file: check.file, missing: ["runtime_evidence_frame"] });
    return;
  }

  let frame = null;
  try {
    frame = JSON.parse(readFileSync(absolutePath, "utf8"));
  } catch (error) {
    failures.push({
      id: check.id,
      file: check.file,
      missing: ["valid_json"],
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  const missing = [];
  const terrainSnapshot = frame.terrainTileModelSnapshot ?? frame.domStatus?.terrainTileModelSnapshot;
  const tileProcessSnapshot = frame.tileProcessRuntimeSnapshot ?? frame.domStatus?.tileProcessRuntimeSnapshot;
  const canvasRect = frame.domStatus?.canvasRect ?? null;
  const screenshotPath = typeof frame.screenshotPath === "string" ? resolve(repoRoot, frame.screenshotPath) : null;

  expectEqual(missing, "version", frame.version, "aurora-areas-runtime-cdp-capture/v1");
  expectEqual(missing, "areaQuery", frame.areaQuery, "_ikea");
  expectEqual(missing, "openedArea.ok", frame.openedArea?.ok, true);
  expectEqual(missing, "openedArea.query", frame.openedArea?.query, "_ikea");
  expectEqual(missing, "openedArea.areaExpectation.width", frame.openedArea?.areaExpectation?.width, 16);
  expectEqual(missing, "openedArea.areaExpectation.height", frame.openedArea?.areaExpectation?.height, 16);
  expectAtLeast(missing, "openedArea.areaExpectation.objectCount", frame.openedArea?.areaExpectation?.objectCount, 1);
  expectEqual(missing, "domStatus.workspaceMode", frame.domStatus?.workspaceMode, "areas_mode");
  expectEqual(missing, "domStatus.canvasPresent", frame.domStatus?.canvasPresent, true);
  expectAtLeast(missing, "domStatus.canvasRect.width", canvasRect?.width, 600);
  expectAtLeast(missing, "domStatus.canvasRect.height", canvasRect?.height, 400);

  expectEqual(missing, "terrainTileModelSnapshot.version", terrainSnapshot?.version, "aurora-areas-terrain-tile-model-runtime/v1");
  expectEqual(missing, "terrainTileModelSnapshot.areaId", terrainSnapshot?.areaId, "area__ikea");
  expectEqual(missing, "terrainTileModelSnapshot.status", terrainSnapshot?.status, "ready");
  expectEqual(missing, "terrainTileModelSnapshot.layerName", terrainSnapshot?.layerName, "terrain-backend-tile-models");
  expectEqual(missing, "terrainTileModelSnapshot.renderStatus", terrainSnapshot?.renderStatus, "source_backed_tile_model_bridge");
  expectAtLeast(missing, "terrainTileModelSnapshot.tileCount", terrainSnapshot?.tileCount, 256);
  expectAtLeast(missing, "terrainTileModelSnapshot.loadedTileCount", terrainSnapshot?.loadedTileCount, 256);
  expectEqual(missing, "terrainTileModelSnapshot.failedTileCount", terrainSnapshot?.failedTileCount, 0);
  expectAtLeast(missing, "terrainTileModelSnapshot.materialTextureAppliedTileCount", terrainSnapshot?.materialTextureAppliedTileCount, 1);

  expectEqual(missing, "tileProcessRuntimeSnapshot.version", tileProcessSnapshot?.version, "aurora-areas-tile-process-runtime/v1");
  expectEqual(missing, "tileProcessRuntimeSnapshot.areaId", tileProcessSnapshot?.areaId, "area__ikea");
  expectEqual(missing, "tileProcessRuntimeSnapshot.status", tileProcessSnapshot?.status, "ready");
  expectAtLeast(missing, "tileProcessRuntimeSnapshot.checkedCandidateCount", tileProcessSnapshot?.checkedCandidateCount, 1);
  expectAtLeast(missing, "tileProcessRuntimeSnapshot.readyCandidateCount", tileProcessSnapshot?.readyCandidateCount, 1);
  expectAtLeast(missing, "tileProcessRuntimeSnapshot.glbGeometryReadyCount", tileProcessSnapshot?.glbGeometryReadyCount, 1);
  expectAtLeast(missing, "tileProcessRuntimeSnapshot.renderLoaderReadyCount", tileProcessSnapshot?.renderLoaderReadyCount, 1);
  expectEqual(missing, "tileProcessRuntimeSnapshot.materialBindingBlockedCount", tileProcessSnapshot?.materialBindingBlockedCount, 0);
  expectEqual(missing, "tileProcessRuntimeSnapshot.blockerSummary", tileProcessSnapshot?.blockerSummary, "none");
  expectIncludes(missing, "captureMethod", frame.captureMethod, "Page.captureScreenshot");
  expectEqual(missing, "canonicalParityPromoted", frame.canonicalParityPromoted, false);
  expectEqual(missing, "localOnlyNotRetailEvidence", frame.localOnlyNotRetailEvidence, true);

  if (!screenshotPath || !existsSync(screenshotPath)) {
    missing.push("screenshotPath:file_exists");
  } else {
    const actualBytes = statSync(screenshotPath).size;
    if (actualBytes !== frame.screenshotBytes) {
      missing.push(`screenshotBytes:${frame.screenshotBytes}!==${actualBytes}`);
    }
    if (actualBytes < check.minimumScreenshotBytes) {
      missing.push(`screenshotBytes:>=${check.minimumScreenshotBytes}`);
    }
    const signature = readFileSync(screenshotPath).subarray(0, 8).toString("hex");
    if (signature !== PNG_SIGNATURE_HEX) {
      missing.push("screenshotPath:png_signature");
    }
  }

  if (missing.length > 0) {
    failures.push({ id: check.id, file: check.file, missing });
  }
}

function expectEqual(missing, label, actual, expected) {
  if (actual !== expected) {
    missing.push(`${label}:${JSON.stringify(actual)}!==${JSON.stringify(expected)}`);
  }
}

function expectAtLeast(missing, label, actual, minimum) {
  if (!Number.isFinite(actual) || actual < minimum) {
    missing.push(`${label}:>=${minimum}`);
  }
}

function expectIncludes(missing, label, actual, needle) {
  if (typeof actual !== "string" || !actual.includes(needle)) {
    missing.push(`${label}:includes:${needle}`);
  }
}
