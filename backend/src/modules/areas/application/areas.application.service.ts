import { Inject, Injectable, Optional } from "@nestjs/common";
import { executeInFlight } from "../../../common/async/in-flight.helpers";
import {
  buildBlobObjectHttpUrl,
  buildS3ObjectUrl
} from "../../../common/blob/blob-url.helpers";
import { AppException } from "../../../common/http/app-exception";
import { AppConfigService } from "../../../common/config/app-config.service";
import {
  MODULE_BLOB_STORAGE,
  type ModuleBlobObjectPayload,
  type ModuleBlobStoragePort
} from "../../runtime-settings/application/ports/module-blob-storage.port";
import { CatalogApplicationService } from "../../catalog/application/catalog.application.service";
import {
  RUNTIME_SETTINGS_REPOSITORY,
  type RuntimeSettingsRepositoryPort
} from "../../runtime-settings/application/ports/runtime-settings-repository.port";
import type { BlobStorageSettings } from "../../runtime-settings/domain/runtime-settings.types";
import {
  COMMITTED_MODULE_SNAPSHOT_READER,
  type CommittedModuleSnapshotReaderPort,
} from "../../module-snapshots/application/ports/committed-module-snapshot-reader.port";
import {
  AREA_PROCESSING_CACHE,
  type AreaProcessingCachePort
} from "./ports/area-processing-cache.port";
import {
  AREA_REPOSITORY,
  type AreaRepositoryPort
} from "./ports/area-repository.port";
import type {
  AreaDeliveryMode,
  AreaListQuery,
  AreaListResult,
  AreaProcessQuery,
  AreaProcessingResult,
  AreaRecord
} from "../domain/area.types";
import {
  buildAreaProcessCacheKey,
  countAreaObjectsByKind
} from "../domain/area-processing.builders";
import {
  buildAreaLightingEvidenceReport,
  type AreaCatalogLightSourceInput,
  type AreaProcessedMdlLightColor,
  type AreaProcessedMdlLightSourceEvidence,
  type AreaProcessedMdlLightVector3
} from "../domain/area-lighting-evidence";
import {
  buildAreaThumbnailPayload,
  withAreaPreviewImageUrl
} from "../domain/area-thumbnail";
import { buildAreaCapabilityCatalog } from "../domain/area-capability-catalog";
import { serializeAreaItemPlacementsToGitGff } from "../adapters/outbound/blob/aurora-gff-area-item-writer";
import {
  serializeAreaToAreGff,
  serializeAreaToGitGff
} from "../adapters/outbound/blob/aurora-gff-area-writer";

export interface AreaProcessingEnvelope {
  cache: {
    key: string;
    hit: boolean;
    storedAt: string;
    hits: number;
  };
  area: AreaProcessingResult;
}

export interface AreaTextureBlobEnvelope {
  cacheKey: string;
  textureAtlas: AreaProcessingResult["textureAtlas"];
  payload: ModuleBlobObjectPayload;
}

export interface AreaTextureDeliveryContract {
  mode: AreaDeliveryMode;
  atlasId: string;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  etag?: string;
  proxyPath: string;
  proxyUrl: string;
  directUrl?: string;
  s3Url?: string;
}

export interface AreaTextureDeliveryEnvelope {
  cacheKey: string;
  textureAtlas: AreaTextureDeliveryContract;
}

export interface AreaItemGitExportEnvelope {
  areaId: string;
  fileName: string;
  contentType: "application/octet-stream";
  size: number;
  bytes: Buffer;
  itemCount: number;
}

export interface AreaGitExportEnvelope {
  areaId: string;
  fileName: string;
  contentType: "application/octet-stream";
  size: number;
  bytes: Buffer;
  objectCounts: ReturnType<typeof countAreaObjectsByKind>;
}

export interface AreaAreExportEnvelope {
  areaId: string;
  fileName: string;
  contentType: "application/octet-stream";
  size: number;
  bytes: Buffer;
  tileCount: number;
}

const AREA_LIST_CACHE_TTL_MS = 60_000;
const AREA_LIST_CACHE_MAX_ENTRIES = 128;
const PROCESSED_MDL_LIGHT_SCAN_LIMIT = 24;
const AURORA_MDL_LIGHT_QUADRATIC_ATTEN_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:865404-865409 FUN_00a40b60 uploads lightQuadraticAtten = 9/(max(radius,0.1)^2*2)";
const AURORA_MDL_LIGHT_QUADRATIC_ATTEN_PROOF_STATUS =
  "source-backed-mdl-radius-quadratic-attenuation";
const AURORA_MDL_LIGHT_FIELD_PARSER_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:883029-883250 FUN_00a5872c parses AuroraLight color into +0x54, radius into +0x58, shadowradius into +0x60, verticaldisplacement into +0x64, multiplier into +0x8c, shadow into +0xc0, and lightpriority into +0xb0";
const AURORA_MDL_LIGHT_FIELD_PARSER_PROOF_STATUS =
  "source-backed-mdl-auroralight-field-parser";

interface AreaListCacheEntry {
  result: AreaListResult;
  expiresAtMs: number;
}

@Injectable()
export class AreasApplicationService {
  private readonly inFlightAreaProcessing = new Map<string, Promise<AreaProcessingEnvelope>>();
  private readonly areaListCache = new Map<string, AreaListCacheEntry>();
  private readonly areaListInFlight = new Map<string, Promise<AreaListResult>>();

  constructor(
    @Inject(AREA_REPOSITORY)
    private readonly repository: AreaRepositoryPort,
    @Inject(AREA_PROCESSING_CACHE)
    private readonly processingCache: AreaProcessingCachePort,
    private readonly appConfig?: AppConfigService,
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly runtimeSettingsRepository?: RuntimeSettingsRepositoryPort,
    @Inject(MODULE_BLOB_STORAGE)
    private readonly moduleBlobStorage?: ModuleBlobStoragePort,
    @Optional()
    private readonly catalogService?: CatalogApplicationService,
    @Optional() @Inject(COMMITTED_MODULE_SNAPSHOT_READER)
    private readonly committedSnapshotReader?: CommittedModuleSnapshotReaderPort,
  ) {}

  getAreaCapabilities() {
    return buildAreaCapabilityCatalog();
  }

  listAreas(query: AreaListQuery) {
    const cacheKey = buildAreaListCacheKey(query);
    const now = Date.now();
    const cached = this.areaListCache.get(cacheKey);
    if (cached && cached.expiresAtMs > now) {
      this.areaListCache.delete(cacheKey);
      this.areaListCache.set(cacheKey, cached);
      return Promise.resolve(cached.result);
    }
    if (cached) {
      this.areaListCache.delete(cacheKey);
    }

    const inFlight = this.areaListInFlight.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const request = this.repository
      .list(query)
      .then((result) => this.withAreaListPreviewImageUrls(result))
      .then((result) => {
        this.areaListCache.set(cacheKey, {
          result,
          expiresAtMs: Date.now() + AREA_LIST_CACHE_TTL_MS
        });
        trimOldestMapEntries(this.areaListCache, AREA_LIST_CACHE_MAX_ENTRIES);
        return result;
      })
      .finally(() => {
        this.areaListInFlight.delete(cacheKey);
      });
    this.areaListInFlight.set(cacheKey, request);
    return request;
  }

  async getArea(areaId: string) {
    const area = await this.repository.findById(areaId);
    if (!area) {
      throw new AppException({
        status: 404,
        code: "AREA_NOT_FOUND",
        message: "Area was not found."
      });
    }

    const precomputed = this.repository.getPrecomputedAreaProcessing?.(area.areaId);
    const counts = precomputed?.composition ?? countAreaObjectsByKind(area.objects);
    return {
      areaId: area.areaId,
      name: area.name,
      biome: area.biome,
      width: area.width,
      height: area.height,
      tags: area.tags,
      ...(area.comments !== undefined ? { comments: area.comments } : {}),
      ...(area.eventScripts !== undefined
        ? { eventScripts: { ...area.eventScripts } }
        : {}),
      ...(area.basicIdentity !== undefined
        ? {
            basicIdentity: {
              ...area.basicIdentity,
              ...(area.basicIdentity.nameEntries
                ? { nameEntries: area.basicIdentity.nameEntries.map((entry) => ({ ...entry })) }
                : {}),
            },
          }
        : {}),
      ...(area.advancedFlags !== undefined
        ? {
            advancedFlags: {
              ...area.advancedFlags,
              ...(area.advancedFlags.terrainType
                ? { terrainType: { ...area.advancedFlags.terrainType } }
                : {}),
            },
          }
        : {}),
      ...(area.visualEnvironment
        ? {
            visualEnvironment: {
              ...area.visualEnvironment,
              sun: { ...area.visualEnvironment.sun },
              moon: { ...area.visualEnvironment.moon },
            },
          }
        : {}),
      ...(area.visualEnvironmentScalarControls
        ? {
            visualEnvironmentScalarControls: {
              ...area.visualEnvironmentScalarControls,
            },
          }
        : {}),
      ...(area.visualEnvironmentCatalogSelection
        ? {
            visualEnvironmentCatalogSelection: {
              ...area.visualEnvironmentCatalogSelection,
            },
          }
        : {}),
      ...(area.moduleStartLocation
        ? { moduleStartLocation: { ...area.moduleStartLocation } }
        : {}),
      ...(area.moduleStartLocationTargets
        ? { moduleStartLocationTargets: [...area.moduleStartLocationTargets] }
        : {}),
      ...(area.audioEnvironment
        ? { audioEnvironment: { ...area.audioEnvironment } }
        : {}),
      ...(area.variables
        ? { variables: cloneAreaVariables(area.variables) }
        : {}),
      ...(area.audioEnvironmentCatalogs
        ? { audioEnvironmentCatalogs: cloneAudioEnvironmentCatalogs(area.audioEnvironmentCatalogs) }
        : {}),
      ...(area.visualEnvironmentCatalogs
        ? {
            visualEnvironmentCatalogs: cloneVisualEnvironmentCatalogs(
              area.visualEnvironmentCatalogs,
            ),
          }
        : {}),
      ...(area.loadingScreenCatalog
        ? { loadingScreenCatalog: cloneLoadingScreenCatalog(area.loadingScreenCatalog) }
        : {}),
      ...(area.encounterDifficultyCatalog
        ? {
            encounterDifficultyCatalog:
              cloneEncounterDifficultyCatalog(area.encounterDifficultyCatalog),
          }
        : {}),
      benchmark: area.benchmark,
      previewImageUrl: withAreaPreviewImageUrl(area).previewImageUrl,
      textureAtlas: {
        atlasId: area.textureAtlasId,
        cacheKey: `${area.textureAtlasId}:${area.width}x${area.height}`,
        strategy: "blob-cache",
        objectKey: area.textureAtlasObjectKey,
        contentType: area.textureAtlasContentType,
        sizeBytes: area.textureAtlasSizeBytes,
        etag: area.textureAtlasEtag
      },
      tileSet: area.tileSet,
      tiles: area.tiles,
      ...(area.auroraVfxCollision ? { auroraVfxCollision: area.auroraVfxCollision } : {}),
      ...(area.auroraWorldTimer ? { auroraWorldTimer: area.auroraWorldTimer } : {}),
      ...(area.lighting ? { lighting: area.lighting } : {}),
      ...(area.placeableTrapTypeCatalog
        ? { placeableTrapTypeCatalog: area.placeableTrapTypeCatalog }
        : {}),
      ...(area.placeableBodyBagCatalog
        ? { placeableBodyBagCatalog: area.placeableBodyBagCatalog }
        : {}),
      ...(area.placeablePortraitCatalog
        ? { placeablePortraitCatalog: area.placeablePortraitCatalog }
        : {}),
      ...(area.creaturePortraitCatalog
        ? { creaturePortraitCatalog: area.creaturePortraitCatalog }
        : {}),
      ...(area.itemBaseItemCatalog
        ? { itemBaseItemCatalog: area.itemBaseItemCatalog }
        : {}),
      ...(area.placeableFactionCatalog
        ? { placeableFactionCatalog: area.placeableFactionCatalog }
        : {}),
      soundscape: area.soundscape,
      ...(area.sourceResources ? { sourceResources: area.sourceResources } : {}),
      composition: counts,
      objects: area.objects,
      updatedAt: area.updatedAt
    };
  }

  async getAreaPreview(areaId: string) {
    const area = await this.findLightweightAreaById(areaId);
    if (!area) {
      throw new AppException({
        status: 404,
        code: "AREA_NOT_FOUND",
        message: "Area was not found."
      });
    }

    const precomputed = this.repository.getPrecomputedAreaProcessing?.(area.areaId);
    return {
      areaId: area.areaId,
      name: area.name,
      previewImageUrl: withAreaPreviewImageUrl(area).previewImageUrl,
      benchmark: area.benchmark,
      dimensions: {
        width: area.width,
        height: area.height
      },
      textureAtlasId: area.textureAtlasId,
      soundscape: area.soundscape,
      objectCounts: precomputed?.composition ?? countAreaObjectsByKind(area.objects),
      updatedAt: area.updatedAt
    };
  }

  /**
   * The topology editor only needs the ARE's tileset identity and freshness
   * marker.  Do not route it through getArea(): that response includes every
   * placed object and can make opening the tile tools wait behind a very large
   * JSON serialization for otherwise small Areas.
   */
  async getAreaTopologyMetadata(areaId: string) {
    const area = await this.findLightweightAreaById(areaId);
    if (!area) {
      throw new AppException({
        status: 404,
        code: "AREA_NOT_FOUND",
        message: "Area was not found."
      });
    }
    return {
      areaId: area.areaId,
      tileSet: area.tileSet,
      updatedAt: area.updatedAt
    };
  }

  async getAreaLightingEvidence() {
    const areas = await this.loadAllAreasForLightingEvidence();
    const catalogLightSources = await this.loadCatalogLightSourcesForLightingEvidence();
    const processedMdlLightScan =
      await this.loadProcessedMdlLightsForLightingEvidence(catalogLightSources);
    return buildAreaLightingEvidenceReport(areas, catalogLightSources, processedMdlLightScan);
  }

  async getAreaThumbnail(areaId: string) {
    const area = await this.resolveLightweightAreaRecord(areaId);
    const precomputed = this.repository.getPrecomputedAreaProcessing?.(area.areaId);
    return buildAreaThumbnailPayload(
      area,
      precomputed?.composition ?? countAreaObjectsByKind(area.objects)
    );
  }

  async getAreaItemGitExport(areaId: string): Promise<AreaItemGitExportEnvelope> {
    const area = await this.resolveAreaRecord(areaId);
    const items = area.objects
      .filter((object) => object.kind === "item")
      .map((object) => ({
        templateResRef: object.resRef ?? object.templateId,
        tag: object.tag,
        localizedName: object.localizedName,
        description: object.description,
        x: object.x,
        y: object.y,
        z: object.z,
        bearing: object.bearing,
        itemMetadata: object.itemMetadata
      }));
    const bytes = serializeAreaItemPlacementsToGitGff(items);
    return {
      areaId: area.areaId,
      fileName: `${area.areaId}.items.git`,
      contentType: "application/octet-stream",
      size: bytes.length,
      bytes,
      itemCount: items.length
    };
  }

  async getAreaGitExport(areaId: string): Promise<AreaGitExportEnvelope> {
    const area = await this.resolveAreaRecord(areaId);
    const bytes = serializeAreaToGitGff(area);
    return {
      areaId: area.areaId,
      fileName: `${area.areaId}.git`,
      contentType: "application/octet-stream",
      size: bytes.length,
      bytes,
      objectCounts: countAreaObjectsByKind(area.objects)
    };
  }

  async getAreaAreExport(areaId: string): Promise<AreaAreExportEnvelope> {
    const area = await this.resolveAreaRecord(areaId);
    const bytes = serializeAreaToAreGff(area);
    return {
      areaId: area.areaId,
      fileName: `${area.areaId}.are`,
      contentType: "application/octet-stream",
      size: bytes.length,
      bytes,
      tileCount: area.tiles?.length ?? 0
    };
  }

  private async loadAllAreasForLightingEvidence(): Promise<AreaRecord[]> {
    const areas: AreaRecord[] = [];
    const limit = 1000;
    let offset = 0;

    while (true) {
      const page = await this.repository.list({ limit, offset });
      for (const item of page.items) {
        const area = await this.findLightweightAreaById(item.areaId);
        if (area) {
          areas.push(area);
        }
      }

      offset += page.items.length;
      if (page.items.length === 0 || offset >= page.total) {
        break;
      }
    }

    return areas;
  }

  private async loadCatalogLightSourcesForLightingEvidence() {
    if (!this.catalogService) {
      return [];
    }

    const templates: AreaCatalogLightSourceInput[] = [];
    const limit = 1000;
    let offset = 0;

    while (true) {
      const page = await this.catalogService.listPlaceables({
        subtype: "light_source",
        limit,
        offset
      });
      templates.push(...page.items);

      offset += page.items.length;
      if (page.items.length === 0 || offset >= page.total) {
        break;
      }
    }

    return templates;
  }

  private async loadProcessedMdlLightsForLightingEvidence(
    catalogLightSources: readonly AreaCatalogLightSourceInput[]
  ): Promise<{
    processedMdlLightSources: AreaProcessedMdlLightSourceEvidence[];
    processedMdlLightTemplatesScanned: number;
    processedMdlLightScanLimit: number;
  }> {
    if (!this.catalogService || catalogLightSources.length === 0) {
      return {
        processedMdlLightSources: [],
        processedMdlLightTemplatesScanned: 0,
        processedMdlLightScanLimit: 0
      };
    }

    const candidates = catalogLightSources.slice(0, PROCESSED_MDL_LIGHT_SCAN_LIMIT);
    const batch = await this.catalogService.processPlaceablesBatch(
      candidates.map((candidate) => ({
        templateId: candidate.templateId,
        resref: candidate.resref,
        bypassCache: false,
        includeBenchmarkMetadata: false
      }))
    );

    return {
      processedMdlLightSources: batch.items.flatMap((item, index) => {
        const catalogLightSource = candidates[index];
        const lights = item.placeable.renderPackage?.auroraLight?.lights ?? [];
        if (!catalogLightSource || lights.length === 0) {
          return [];
        }
        return [
          {
            templateId: catalogLightSource.templateId,
            resref: catalogLightSource.resref,
            name: catalogLightSource.name,
            ...optionalText(
              "modelResRef",
              readLightingMetadataString(catalogLightSource.metadata, "modelResRef")
            ),
            ...optionalText(
              "lookupModelResRef",
              readLightingMetadataString(catalogLightSource.metadata, "lookupModelResRef")
            ),
            cacheKey: item.cache.key,
            cacheHit: item.cache.hit,
            nodes: lights.map((light) => {
              const quadraticAtten = resolveMdlLightQuadraticAtten(light.radius);
              return {
                source: light.source,
                sourceModelAssetId: light.sourceModelAssetId,
                sourceModelFileName: light.sourceModelFileName,
                sourceModelObjectKey: light.sourceModelObjectKey,
                nodeName: light.nodeName,
                ...optionalText("sourceNodeKind", light.sourceNodeKind),
                ...optionalText("parentNodeName", light.parentNodeName),
                ...optionalVector3("position", mapMdlVector3(light.transform?.position)),
                ...optionalNumber("scale", light.transform?.scale),
                ...optionalNumber("radius", light.radius),
                auroraLightFieldParserSource: AURORA_MDL_LIGHT_FIELD_PARSER_SOURCE,
                auroraLightFieldParserProofStatus: AURORA_MDL_LIGHT_FIELD_PARSER_PROOF_STATUS,
                ...optionalNumber("quadraticAtten", quadraticAtten),
                ...(quadraticAtten !== undefined
                  ? {
                      quadraticAttenSource: AURORA_MDL_LIGHT_QUADRATIC_ATTEN_SOURCE,
                      quadraticAttenProofStatus: AURORA_MDL_LIGHT_QUADRATIC_ATTEN_PROOF_STATUS
                    }
                  : {}),
                ...optionalNumber("shadowRadius", light.shadowRadius),
                ...optionalNumber("verticalDisplacement", light.verticalDisplacement),
                ...optionalNumber("multiplier", light.multiplier),
                ...optionalColor("color", mapMdlColor(light.color)),
                ...optionalBoolean("ambientOnly", light.ambientOnly),
                ...optionalNumber("dynamicType", light.dynamicType),
                ...optionalBoolean("affectDynamic", light.affectDynamic),
                ...optionalBoolean("shadow", light.shadow),
                ...optionalNumber("lightPriority", light.lightPriority),
                ...optionalBoolean("generateFlare", light.generateFlare),
                ...(light.textureNames?.length ? { textureNames: light.textureNames } : {}),
                ...(light.flareSizes?.length ? { flareSizes: light.flareSizes } : {}),
                ...(light.flarePositions?.length ? { flarePositions: light.flarePositions } : {}),
                ...(light.flareColorShifts?.length
                  ? {
                      flareColorShifts: light.flareColorShifts
                        .map(mapMdlColor)
                        .filter((color): color is NonNullable<ReturnType<typeof mapMdlColor>> =>
                          Boolean(color)
                        )
                    }
                  : {}),
                ...optionalNumber("flareRadius", light.flareRadius),
                ...optionalBoolean("lensFlares", light.lensFlares),
                ...optionalBoolean("fadingLight", light.fadingLight),
                ...(light.animations?.length
                  ? {
                      animationNames: light.animations.map((animation) => animation.animationName)
                    }
                  : {})
              };
            })
          }
        ];
      }),
      processedMdlLightTemplatesScanned: candidates.length,
      processedMdlLightScanLimit: PROCESSED_MDL_LIGHT_SCAN_LIMIT
    };
  }

  async processArea(query: AreaProcessQuery) {
    let precomputed = this.repository.getPrecomputedAreaProcessing?.(query.areaId);
    if (!query.bypassCache && precomputed) {
      const cached = await this.processingCache.get(precomputed.cacheKey);
      if (cached) {
        const hydrated = this.withAreaProcessingPreviewImageUrl(
          await this.ensureAreaTextureAtlas(precomputed.cacheKey, cached.value)
        );
        return {
          cache: {
            key: precomputed.cacheKey,
            hit: true,
            storedAt: cached.storedAt,
            hits: cached.hits
          },
          area: hydrated
        };
      }
    }

    const area = await this.resolveAreaRecord(query.areaId);
    precomputed = precomputed ?? this.repository.getPrecomputedAreaProcessing?.(area.areaId);
    const cacheKey = precomputed?.cacheKey ?? buildAreaProcessCacheKey(area);

    if (!query.bypassCache && !precomputed) {
      const cached = await this.processingCache.get(cacheKey);
      if (cached) {
        const hydrated = this.withAreaProcessingPreviewImageUrl(
          await this.ensureAreaTextureAtlas(cacheKey, cached.value)
        );
        return {
          cache: {
            key: cacheKey,
            hit: true,
            storedAt: cached.storedAt,
            hits: cached.hits
          },
          area: hydrated
        };
      }
    }

    const processMiss = async (): Promise<AreaProcessingEnvelope> => {
      const composition = precomputed?.composition ?? countAreaObjectsByKind(area.objects);
      const textureAtlasCacheKey = `${area.textureAtlasId}:${area.width}x${area.height}`;
      const processed: AreaProcessingResult = {
        areaId: area.areaId,
        name: area.name,
        biome: area.biome,
        width: area.width,
        height: area.height,
        tags: area.tags,
        ...(area.comments !== undefined ? { comments: area.comments } : {}),
        ...(area.eventScripts !== undefined
          ? { eventScripts: { ...area.eventScripts } }
          : {}),
        ...(area.basicIdentity !== undefined
          ? {
              basicIdentity: {
                ...area.basicIdentity,
                ...(area.basicIdentity.nameEntries
                  ? { nameEntries: area.basicIdentity.nameEntries.map((entry) => ({ ...entry })) }
                  : {}),
              },
            }
          : {}),
        ...(area.advancedFlags !== undefined
          ? {
              advancedFlags: {
                ...area.advancedFlags,
                ...(area.advancedFlags.terrainType
                  ? { terrainType: { ...area.advancedFlags.terrainType } }
                  : {}),
              },
            }
          : {}),
        ...(area.visualEnvironment
          ? {
              visualEnvironment: {
                ...area.visualEnvironment,
                sun: { ...area.visualEnvironment.sun },
                moon: { ...area.visualEnvironment.moon },
              },
            }
          : {}),
        ...(area.visualEnvironmentScalarControls
          ? {
              visualEnvironmentScalarControls: {
                ...area.visualEnvironmentScalarControls,
              },
            }
          : {}),
        ...(area.visualEnvironmentCatalogSelection
          ? {
              visualEnvironmentCatalogSelection: {
                ...area.visualEnvironmentCatalogSelection,
              },
            }
          : {}),
        benchmark: area.benchmark,
        previewImageUrl: withAreaPreviewImageUrl(area).previewImageUrl,
        textureAtlas: {
          atlasId: area.textureAtlasId,
          cacheKey: textureAtlasCacheKey,
          strategy: "blob-cache",
          objectKey: area.textureAtlasObjectKey,
          contentType: area.textureAtlasContentType,
          sizeBytes: area.textureAtlasSizeBytes,
          etag: area.textureAtlasEtag
        },
        tileSet: area.tileSet,
        tiles: area.tiles,
        ...(area.auroraVfxCollision
          ? { auroraVfxCollision: area.auroraVfxCollision }
          : {}),
        ...(area.auroraWorldTimer ? { auroraWorldTimer: area.auroraWorldTimer } : {}),
        ...(area.moduleStartLocation
          ? { moduleStartLocation: { ...area.moduleStartLocation } }
          : {}),
        ...(area.moduleStartLocationTargets
          ? { moduleStartLocationTargets: [...area.moduleStartLocationTargets] }
          : {}),
        ...(area.audioEnvironment
          ? { audioEnvironment: { ...area.audioEnvironment } }
          : {}),
        ...(area.variables
          ? { variables: cloneAreaVariables(area.variables) }
          : {}),
        ...(area.audioEnvironmentCatalogs
          ? { audioEnvironmentCatalogs: cloneAudioEnvironmentCatalogs(area.audioEnvironmentCatalogs) }
          : {}),
        ...(area.visualEnvironmentCatalogs
          ? {
              visualEnvironmentCatalogs: cloneVisualEnvironmentCatalogs(
                area.visualEnvironmentCatalogs,
              ),
            }
          : {}),
        ...(area.loadingScreenCatalog
          ? { loadingScreenCatalog: cloneLoadingScreenCatalog(area.loadingScreenCatalog) }
          : {}),
        ...(area.encounterDifficultyCatalog
          ? {
              encounterDifficultyCatalog:
                cloneEncounterDifficultyCatalog(area.encounterDifficultyCatalog),
            }
          : {}),
        ...(area.lighting ? { lighting: area.lighting } : {}),
        ...(area.placeableTrapTypeCatalog
          ? { placeableTrapTypeCatalog: area.placeableTrapTypeCatalog }
          : {}),
        ...(area.placeableBodyBagCatalog
          ? { placeableBodyBagCatalog: area.placeableBodyBagCatalog }
          : {}),
        ...(area.placeablePortraitCatalog
          ? { placeablePortraitCatalog: area.placeablePortraitCatalog }
          : {}),
        ...(area.creaturePortraitCatalog
          ? { creaturePortraitCatalog: area.creaturePortraitCatalog }
          : {}),
        ...(area.itemBaseItemCatalog
          ? { itemBaseItemCatalog: area.itemBaseItemCatalog }
          : {}),
        ...(area.placeableFactionCatalog
          ? { placeableFactionCatalog: area.placeableFactionCatalog }
          : {}),
        soundscape: area.soundscape,
        ...(area.sourceResources ? { sourceResources: area.sourceResources } : {}),
        composition,
        objects: area.objects,
        updatedAt: area.updatedAt,
        processedAt: new Date().toISOString()
      };

      const stored = await this.processingCache.set(cacheKey, processed);
      return {
        cache: {
          key: cacheKey,
          hit: false,
          storedAt: stored.storedAt,
          hits: stored.hits
        },
        area: processed
      };
    };

    return query.bypassCache
      ? processMiss()
      : executeInFlight(this.inFlightAreaProcessing, cacheKey, processMiss);
  }

  async getProcessedArea(cacheKey: string) {
    const cached = await this.processingCache.get(cacheKey);
    if (!cached) {
      throw new AppException({
        status: 404,
        code: "AREA_CACHE_NOT_FOUND",
        message: "Area cache entry was not found."
      });
    }

    const hydrated = this.withAreaProcessingPreviewImageUrl(
      await this.ensureAreaTextureAtlas(cacheKey, cached.value)
    );
    return {
      cache: {
        key: cacheKey,
        hit: true,
        storedAt: cached.storedAt,
        hits: cached.hits
      },
      area: hydrated
    };
  }

  async getProcessedAreaTexture(cacheKey: string): Promise<AreaTextureBlobEnvelope> {
    const cached = await this.processingCache.get(cacheKey);
    if (!cached) {
      throw new AppException({
        status: 404,
        code: "AREA_CACHE_NOT_FOUND",
        message: "Area cache entry was not found."
      });
    }

    const hydrated = this.withAreaProcessingPreviewImageUrl(
      await this.ensureAreaTextureAtlas(cacheKey, cached.value)
    );
    if (
      !hydrated.textureAtlas.objectKey ||
      !hydrated.textureAtlas.contentType ||
      !hydrated.textureAtlas.sizeBytes
    ) {
      throw new AppException({
        status: 404,
        code: "AREA_TEXTURE_BLOB_NOT_FOUND",
        message: "Area texture blob metadata is missing in cache entry."
      });
    }

    const payload = await this.readModuleBlobObject(hydrated.textureAtlas.objectKey);
    if (!payload) {
      throw new AppException({
        status: 404,
        code: "AREA_TEXTURE_BLOB_NOT_FOUND",
        message: "Area texture blob object was not found."
      });
    }

    return {
      cacheKey,
      textureAtlas: hydrated.textureAtlas,
      payload
    };
  }

  async getProcessedAreaTextureDelivery(
    cacheKey: string,
    mode: AreaDeliveryMode
  ): Promise<AreaTextureDeliveryEnvelope> {
    const cached = await this.processingCache.get(cacheKey);
    if (!cached) {
      throw new AppException({
        status: 404,
        code: "AREA_CACHE_NOT_FOUND",
        message: "Area cache entry was not found."
      });
    }

    const hydrated = this.withAreaProcessingPreviewImageUrl(
      await this.ensureAreaTextureAtlas(cacheKey, cached.value)
    );
    if (
      !hydrated.textureAtlas.objectKey ||
      !hydrated.textureAtlas.contentType ||
      !hydrated.textureAtlas.sizeBytes
    ) {
      throw new AppException({
        status: 404,
        code: "AREA_TEXTURE_BLOB_NOT_FOUND",
        message: "Area texture blob metadata is missing in cache entry."
      });
    }

    const blobSettings = await this.getBlobStorageSettings();
    if (mode === "direct" && !blobSettings) {
      throw new AppException({
        status: 422,
        code: "AREA_DIRECT_DELIVERY_UNAVAILABLE",
        message: "Direct area delivery is unavailable without blob storage settings."
      });
    }

    const proxyPath = buildAreaTextureDeliveryPath(cacheKey);
    return {
      cacheKey,
      textureAtlas: {
        mode,
        atlasId: hydrated.textureAtlas.atlasId,
        objectKey: hydrated.textureAtlas.objectKey,
        contentType: hydrated.textureAtlas.contentType,
        sizeBytes: hydrated.textureAtlas.sizeBytes,
        etag: hydrated.textureAtlas.etag,
        proxyPath,
        proxyUrl: proxyPath,
        directUrl:
          mode === "direct" && blobSettings
            ? buildBlobObjectHttpUrl(blobSettings, hydrated.textureAtlas.objectKey)
            : undefined,
        s3Url: blobSettings
          ? buildS3ObjectUrl(blobSettings.bucket, hydrated.textureAtlas.objectKey)
          : undefined
      }
    };
  }

  private async ensureAreaTextureAtlas(
    cacheKey: string,
    value: AreaProcessingResult
  ): Promise<AreaProcessingResult> {
    if (
      value.textureAtlas.objectKey &&
      value.textureAtlas.contentType &&
      (value.textureAtlas.sizeBytes ?? 0) > 0
    ) {
      return value;
    }

    const area = await this.repository.findById(value.areaId);
    if (!area) {
      return value;
    }

    const refreshed: AreaProcessingResult = {
      ...value,
      textureAtlas: {
        ...value.textureAtlas,
        objectKey: area.textureAtlasObjectKey,
        contentType: area.textureAtlasContentType,
        sizeBytes: area.textureAtlasSizeBytes,
        etag: area.textureAtlasEtag
      }
    };

    await this.processingCache.set(cacheKey, refreshed);
    return refreshed;
  }

  private async readModuleBlobObject(key: string): Promise<ModuleBlobObjectPayload | null> {
    if (!this.runtimeSettingsRepository || !this.moduleBlobStorage) {
      return null;
    }

    if (this.appConfig?.isTest && !this.appConfig.enableBlobAssetLookupInTest) {
      return null;
    }

    const settings = await this.runtimeSettingsRepository.get();
    return this.committedSnapshotReader
      ? (await this.committedSnapshotReader.capture()).getModuleObject(key)
      : this.moduleBlobStorage.getModuleObject(settings.blobStorage, key);
  }

  private async getBlobStorageSettings(): Promise<BlobStorageSettings | null> {
    if (!this.runtimeSettingsRepository) {
      return null;
    }

    const settings = await this.runtimeSettingsRepository.get();
    return settings.blobStorage;
  }

  private withAreaListPreviewImageUrls(result: AreaListResult): AreaListResult {
    return {
      ...result,
      items: result.items.map(withAreaPreviewImageUrl)
    };
  }

  private withAreaProcessingPreviewImageUrl(
    area: AreaProcessingResult
  ): AreaProcessingResult {
    return withAreaPreviewImageUrl(area);
  }

  private async resolveAreaRecord(areaId: string): Promise<AreaRecord> {
    const area = await this.repository.findById(areaId);
    if (!area) {
      throw new AppException({
        status: 404,
        code: "AREA_NOT_FOUND",
        message: "Area was not found."
      });
    }
    return area;
  }

  private findLightweightAreaById(areaId: string): Promise<AreaRecord | null> {
    return this.repository.findLightweightById?.(areaId) ?? this.repository.findById(areaId);
  }

  private async resolveLightweightAreaRecord(areaId: string): Promise<AreaRecord> {
    const area = await this.findLightweightAreaById(areaId);
    if (!area) {
      throw new AppException({
        status: 404,
        code: "AREA_NOT_FOUND",
        message: "Area was not found."
      });
    }
    return area;
  }

}

function cloneAudioEnvironmentCatalogs(
  catalogs: NonNullable<AreaRecord["audioEnvironmentCatalogs"]>,
): NonNullable<AreaRecord["audioEnvironmentCatalogs"]> {
  const clone = (catalog: typeof catalogs.ambientSound) => ({
    descriptor: { ...catalog.descriptor },
    rows: catalog.rows.map((row) => ({ ...row })),
  });
  return {
    schemaVersion: catalogs.schemaVersion,
    ambientSound: clone(catalogs.ambientSound),
    ambientMusic: clone(catalogs.ambientMusic),
    environmentalAudio: clone(catalogs.environmentalAudio),
  };
}

function cloneVisualEnvironmentCatalogs(
  catalogs: NonNullable<AreaRecord["visualEnvironmentCatalogs"]>,
): NonNullable<AreaRecord["visualEnvironmentCatalogs"]> {
  return {
    schemaVersion: catalogs.schemaVersion,
    lightingSchemes: {
      descriptor: { ...catalogs.lightingSchemes.descriptor },
      rows: catalogs.lightingSchemes.rows.map((row) => ({
        ...row,
        visualEnvironment: {
          ...row.visualEnvironment,
          sun: { ...row.visualEnvironment.sun },
          moon: { ...row.visualEnvironment.moon },
        },
        visualEnvironmentScalarControls: {
          ...row.visualEnvironmentScalarControls,
        },
      })),
    },
    skyBoxes: {
      descriptor: { ...catalogs.skyBoxes.descriptor },
      rows: catalogs.skyBoxes.rows.map((row) => ({ ...row })),
    },
  };
}

function cloneAreaVariables(
  variables: NonNullable<AreaRecord["variables"]>,
): NonNullable<AreaRecord["variables"]> {
  return {
    expectedEntries: variables.expectedEntries.map((entry) => ({ ...entry })),
  };
}

function cloneLoadingScreenCatalog(
  catalog: NonNullable<AreaRecord["loadingScreenCatalog"]>,
): NonNullable<AreaRecord["loadingScreenCatalog"]> {
  return {
    schemaVersion: catalog.schemaVersion,
    descriptor: { ...catalog.descriptor },
    rows: catalog.rows.map((row) => ({
      ...row,
      ...(row.imageAsset ? { imageAsset: { ...row.imageAsset } } : {}),
    })),
  };
}

function cloneEncounterDifficultyCatalog(
  catalog: NonNullable<AreaRecord["encounterDifficultyCatalog"]>,
): NonNullable<AreaRecord["encounterDifficultyCatalog"]> {
  return {
    schemaVersion: catalog.schemaVersion,
    descriptor: { ...catalog.descriptor },
    rows: catalog.rows.map((row) => ({ ...row })),
  };
}

function buildAreaListCacheKey(query: AreaListQuery): string {
  return [
    normalizeAreaListCacheValue(query.query ?? ""),
    normalizeAreaListCacheValue(query.biome ?? ""),
    normalizeAreaListCacheValue(query.tag ?? ""),
    typeof query.benchmark === "boolean" ? String(query.benchmark) : "",
    String(query.limit),
    String(query.offset)
  ].join("|");
}

function readLightingMetadataString(
  metadata: AreaCatalogLightSourceInput["metadata"],
  key: string
): string | undefined {
  const value = metadata[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function mapMdlVector3(
  value: [number, number, number] | undefined
): AreaProcessedMdlLightVector3 | undefined {
  return value ? { x: value[0], y: value[1], z: value[2] } : undefined;
}

function mapMdlColor(
  value: [number, number, number] | undefined
): AreaProcessedMdlLightColor | undefined {
  return value ? { red: value[0], green: value[1], blue: value[2] } : undefined;
}

function resolveMdlLightQuadraticAtten(radius: number | undefined): number | undefined {
  if (typeof radius !== "number" || !Number.isFinite(radius)) {
    return undefined;
  }
  const clampedRadius = Math.max(radius, 0.1);
  return 9 / (clampedRadius * clampedRadius * 2);
}

function optionalText<TKey extends string>(
  key: TKey,
  value: string | undefined
): { [K in TKey]?: string } {
  return value === undefined ? {} : ({ [key]: value } as { [K in TKey]?: string });
}

function optionalNumber<TKey extends string>(
  key: TKey,
  value: number | undefined
): { [K in TKey]?: number } {
  return value === undefined ? {} : ({ [key]: value } as { [K in TKey]?: number });
}

function optionalBoolean<TKey extends string>(
  key: TKey,
  value: boolean | undefined
): { [K in TKey]?: boolean } {
  return value === undefined ? {} : ({ [key]: value } as { [K in TKey]?: boolean });
}

function optionalVector3<TKey extends string>(
  key: TKey,
  value: AreaProcessedMdlLightVector3 | undefined
): { [K in TKey]?: AreaProcessedMdlLightVector3 } {
  return value === undefined ? {} : ({ [key]: value } as { [K in TKey]?: AreaProcessedMdlLightVector3 });
}

function optionalColor<TKey extends string>(
  key: TKey,
  value: AreaProcessedMdlLightColor | undefined
): { [K in TKey]?: AreaProcessedMdlLightColor } {
  return value === undefined ? {} : ({ [key]: value } as { [K in TKey]?: AreaProcessedMdlLightColor });
}

function normalizeAreaListCacheValue(value: string): string {
  return value.trim().toLowerCase();
}

function trimOldestMapEntries<TKey, TValue>(store: Map<TKey, TValue>, maxEntries: number): void {
  while (store.size > maxEntries) {
    const oldestKey = store.keys().next().value;
    if (typeof oldestKey === "undefined") {
      return;
    }
    store.delete(oldestKey);
  }
}

function buildAreaTextureDeliveryPath(cacheKey: string): string {
  const encodedCacheKey = encodeURIComponent(cacheKey);
  return `/api/v1/areas/cache/${encodedCacheKey}/textures`;
}
