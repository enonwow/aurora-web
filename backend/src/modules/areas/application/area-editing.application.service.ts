import { createHash } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { AppException } from "../../../common/http/app-exception";
import {
  MODULE_BLOB_STORAGE,
  type ModuleBlobObjectSummary,
  type ModuleBlobStoragePort
} from "../../runtime-settings/application/ports/module-blob-storage.port";
import {
  RUNTIME_SETTINGS_REPOSITORY,
  type RuntimeSettingsRepositoryPort
} from "../../runtime-settings/application/ports/runtime-settings-repository.port";
import type { BlobStorageSettings } from "../../runtime-settings/domain/runtime-settings.types";
import {
  parseAuroraTilesetEditingDefinition,
  type AuroraTilesetEditingDefinition
} from "../adapters/outbound/blob/aurora-set-tileset-parser";
import {
  serializeAreaEditingDraftToAreGff,
  validateAreaEditingSourceProvenance,
  type SerializableAreaEditingDraft
} from "../adapters/outbound/blob/aurora-gff-area-editing-writer";
import { parseRawGffDocument } from "../../catalog/adapters/outbound/blob/aurora-gff-template-parser";
import { buildGffBuffer } from "../../catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import type { AreaEditingExportDraftRequest } from "../adapters/inbound/http/area-editing.schemas";
import { AreasApplicationService } from "./areas.application.service";
import {
  moduleIfoContainsArea,
  patchModuleIfoAreaList
} from "../adapters/outbound/blob/aurora-gff-module-ifo-area-writer";

export interface AreaTilesetEditingSummary {
  tilesetResRef: string;
  sourceKey: string;
  sourceSize: number;
  updatedAt?: string;
  etag?: string;
}

export interface AreaEditingSourceEnvelope {
  area: Awaited<ReturnType<AreasApplicationService["getArea"]>>;
  areaFingerprint: string;
  tileset: AuroraTilesetEditingDefinition;
}

export interface AreaEditingAreExportEnvelope {
  fileName: string;
  contentType: "application/octet-stream";
  size: number;
  bytes: Buffer;
  tileCount: number;
  tilesetFingerprint: string;
}

export interface AreaEditingVerificationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  row?: number;
  col?: number;
  tileId?: number;
}

export interface AreaEditingVerificationEnvelope {
  valid: boolean;
  issues: AreaEditingVerificationIssue[];
  stats: {
    width: number;
    height: number;
    expectedTileCount: number;
    tileCount: number;
    uniqueTileIds: number;
    groupTileCount: number;
    sourceProvenanceTileCount: number;
    modelResolvedTileCount: number;
    minHeight: number;
    maxHeight: number;
  };
  tilesetFingerprint: string;
}

export interface AreaEditingPersistenceEnvelope {
  areaResRef: string;
  areaFingerprint: string;
  created: true;
  resources: Array<{
    extension: "are" | "git" | "gic";
    key: string;
    size: number;
    etag?: string;
  }>;
  moduleIfo: {
    key: string;
    size: number;
    areaCount: number;
    etag?: string;
  };
}

const SNAPSHOT_OBJECT_CACHE_TTL_MS = 10 * 60 * 1_000;

interface SnapshotObjectCacheEntry {
  key: string;
  expiresAtMs: number;
  objects: ModuleBlobObjectSummary[];
}

@Injectable()
export class AreaEditingApplicationService {
  private snapshotObjectCache?: SnapshotObjectCacheEntry;
  private readonly snapshotObjectLoads = new Map<string, Promise<ModuleBlobObjectSummary[]>>();

  constructor(
    private readonly areas: AreasApplicationService,
    @Inject(MODULE_BLOB_STORAGE)
    private readonly moduleBlobStorage: ModuleBlobStoragePort,
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly runtimeSettingsRepository: RuntimeSettingsRepositoryPort
  ) {}

  async listTilesets(): Promise<AreaTilesetEditingSummary[]> {
    const settings = await this.runtimeSettingsRepository.get();
    const objects = await this.listAllSnapshotObjects(settings.blobStorage);
    const selectedByResRef = new Map<string, ModuleBlobObjectSummary>();
    for (const object of objects
      .filter((candidate) => candidate.key.toLowerCase().endsWith(".set"))
      .sort(compareTilesetSources)) {
      const tilesetResRef = toResRef(object.key);
      if (tilesetResRef && !selectedByResRef.has(tilesetResRef)) {
        selectedByResRef.set(tilesetResRef, object);
      }
    }
    return Array.from(selectedByResRef, ([tilesetResRef, object]) => ({
      tilesetResRef,
      sourceKey: object.key,
      sourceSize: object.size,
      ...(object.lastModified ? { updatedAt: object.lastModified } : {}),
      ...(object.etag ? { etag: object.etag } : {})
    }))
      .sort((left, right) =>
        left.tilesetResRef.localeCompare(right.tilesetResRef) || left.sourceKey.localeCompare(right.sourceKey)
      );
  }

  async getTilesetDefinition(tilesetResRef: string): Promise<AuroraTilesetEditingDefinition> {
    const normalizedResRef = normalizeResRef(tilesetResRef);
    const settings = await this.runtimeSettingsRepository.get();
    const objects = await this.listAllSnapshotObjects(settings.blobStorage);
    const source = objects
      .filter((object) => toResourceResRef(object.key, ".set") === normalizedResRef)
      .sort(compareTilesetSources)[0];
    if (!source) {
      throw new AppException({
        status: 404,
        code: "TILESET_DEFINITION_MISSING",
        message: `Tileset definition "${normalizedResRef}" was not found in the module snapshot.`
      });
    }
    const payload = await this.moduleBlobStorage.getModuleObject(settings.blobStorage, source.key);
    if (!payload) {
      throw new AppException({
        status: 404,
        code: "TILESET_DEFINITION_MISSING",
        message: `Tileset source "${source.key}" could not be read.`
      });
    }
    return parseAuroraTilesetEditingDefinition(payload.bytes, normalizedResRef);
  }

  async getAreaEditingSource(areaId: string): Promise<AreaEditingSourceEnvelope> {
    const area = await this.areas.getArea(areaId);
    if (!area.tileSet) {
      throw new AppException({
        status: 422,
        code: "TILESET_DEFINITION_MISSING",
        message: "Area does not declare a Tileset, so topology editing is unavailable."
      });
    }
    const tileset = await this.getTilesetDefinition(area.tileSet);
    const settings = await this.runtimeSettingsRepository.get();
    const source = await this.findSnapshotResource(settings.blobStorage, areaId.replace(/^area_/u, ""), ".are");
    const payload = source
      ? await this.moduleBlobStorage.getModuleObject(settings.blobStorage, source.key)
      : null;
    return {
      area,
      areaFingerprint: payload
        ? createHash("sha256").update(payload.bytes).digest("hex")
        : createHash("sha256").update(stableJson(area)).digest("hex"),
      tileset
    };
  }

  async exportAre(draft: AreaEditingExportDraftRequest): Promise<AreaEditingAreExportEnvelope> {
    const tileset = await this.getTilesetDefinition(draft.tilesetResRef);
    if (tileset.fingerprint !== draft.tilesetFingerprint.toLowerCase()) {
      throw new AppException({
        status: 409,
        code: "TILESET_FINGERPRINT_MISMATCH",
        message: "Tileset changed since this Area draft was opened. Reload it before exporting."
      });
    }
    validateDraft(draft, tileset);
    const serializable: SerializableAreaEditingDraft = {
      areaResRef: draft.areaResRef,
      name: draft.name,
      width: draft.width,
      height: draft.height,
      tilesetResRef: draft.tilesetResRef,
      tiles: draft.tiles
    };
    const settings = await this.runtimeSettingsRepository.get();
    const source = await this.findSnapshotResource(settings.blobStorage, draft.areaResRef, ".are");
    if (!source && draft.tiles.some((tile) => tile.sourceRow !== undefined || tile.sourceCol !== undefined)) {
      throw invalidTopology("A new Area cannot reference Tile_List provenance from a source ARE.");
    }
    if (!draft.areaFingerprint && source) {
      throw new AppException({
        status: 409,
        code: "AREA_SOURCE_COLLISION",
        message: "An Area with this ResRef already exists. Open it before exporting changes."
      });
    }
    if (draft.areaFingerprint && !source) {
      throw new AppException({
        status: 409,
        code: "AREA_SOURCE_MISSING",
        message: "Area source is no longer available. Reload it before exporting."
      });
    }
    const payload = source
      ? await this.moduleBlobStorage.getModuleObject(settings.blobStorage, source.key)
      : null;
    if (draft.areaFingerprint && !payload) {
      throw new AppException({
        status: 409,
        code: "AREA_SOURCE_MISSING",
        message: "Area source is no longer available. Reload it before exporting."
      });
    }
    const sourceFingerprint = payload
      ? createHash("sha256").update(payload.bytes).digest("hex")
      : undefined;
    if (draft.areaFingerprint && draft.areaFingerprint.toLowerCase() !== sourceFingerprint) {
      throw new AppException({
        status: 409,
        code: "AREA_FINGERPRINT_MISMATCH",
        message: "Area source changed since this draft was opened. Reload it before exporting."
      });
    }
    const preserved = payload ? parseRawGffDocument(payload.bytes) : null;
    if (payload && (!preserved || preserved.fileType !== "ARE ")) {
      throw new AppException({
        status: 422,
        code: "AREA_PRESERVE_UNAVAILABLE",
        message: "Area source could not be read losslessly, so export was refused rather than discard GFF fields."
      });
    }
    if (preserved) {
      const provenanceError = validateAreaEditingSourceProvenance(serializable, {
        fields: preserved.fields,
        rootStructTypeId: preserved.rootStructTypeId
      });
      if (provenanceError) {
        throw invalidTopology(provenanceError);
      }
    }
    const bytes = serializeAreaEditingDraftToAreGff(
      serializable,
      preserved
        ? { fields: preserved.fields, rootStructTypeId: preserved.rootStructTypeId }
        : undefined
    );
    return {
      fileName: `${draft.areaResRef}.are`,
      contentType: "application/octet-stream",
      size: bytes.length,
      bytes,
      tileCount: draft.tiles.length,
      tilesetFingerprint: tileset.fingerprint
    };
  }

  async verifyArea(draft: AreaEditingExportDraftRequest): Promise<AreaEditingVerificationEnvelope> {
    const tileset = await this.getTilesetDefinition(draft.tilesetResRef);
    const issues = analyzeDraft(draft, tileset);
    if (tileset.fingerprint !== draft.tilesetFingerprint.toLowerCase()) {
      issues.unshift({
        severity: "error",
        code: "TILESET_FINGERPRINT_MISMATCH",
        message: "Tileset changed since this Area draft was opened. Reload it before saving."
      });
    }
    const tileById = new Map(tileset.tiles.map((tile) => [tile.tileId, tile]));
    const groupTileIds = new Set(
      tileset.tiles.filter((tile) => tile.groupId).map((tile) => tile.tileId)
    );
    const heights = draft.tiles.map((tile) => tile.height);
    return {
      valid: !issues.some((issue) => issue.severity === "error"),
      issues,
      stats: {
        width: draft.width,
        height: draft.height,
        expectedTileCount: draft.width * draft.height,
        tileCount: draft.tiles.length,
        uniqueTileIds: new Set(draft.tiles.map((tile) => tile.tileId)).size,
        groupTileCount: draft.tiles.filter((tile) => groupTileIds.has(tile.tileId)).length,
        sourceProvenanceTileCount: draft.tiles.filter(
          (tile) => tile.sourceRow !== undefined && tile.sourceCol !== undefined
        ).length,
        modelResolvedTileCount: draft.tiles.filter(
          (tile) => Boolean(tileById.get(tile.tileId)?.modelResRef)
        ).length,
        minHeight: heights.length > 0 ? Math.min(...heights) : 0,
        maxHeight: heights.length > 0 ? Math.max(...heights) : 0
      },
      tilesetFingerprint: tileset.fingerprint
    };
  }

  /**
   * Adds a brand-new Area resource triplet to the editable module snapshot.
   * Existing AREs deliberately remain export-only: overwriting a source that
   * may come from a layered vanilla/hak snapshot would not be a safe write.
   */
  async persistNewArea(
    draft: AreaEditingExportDraftRequest
  ): Promise<AreaEditingPersistenceEnvelope> {
    if (draft.areaFingerprint) {
      throw new AppException({
        status: 409,
        code: "NEW_AREA_SOURCE_FORBIDDEN",
        message: "New Area persistence only accepts drafts without an existing ARE fingerprint."
      });
    }
    if (!this.moduleBlobStorage.putModuleObject || !this.moduleBlobStorage.deleteModuleObject) {
      throw new AppException({
        status: 501,
        code: "MODULE_SNAPSHOT_WRITE_UNAVAILABLE",
        message: "Module snapshot storage does not support transactional new Area writes."
      });
    }

    const exported = await this.exportAre(draft);
    const settings = await this.runtimeSettingsRepository.get();
    const objects = await this.listAllSnapshotObjects(settings.blobStorage);
    const collisions = ([".are", ".git", ".gic"] as const).filter((extension) =>
      objects.some(
        (object) => toResourceResRef(object.key, extension) === normalizeResRef(draft.areaResRef)
      )
    );
    if (collisions.length > 0) {
      throw new AppException({
        status: 409,
        code: "AREA_RESOURCE_COLLISION",
        message: `Area resources already exist for ${draft.areaResRef}: ${collisions.join(", ")}.`
      });
    }

    const moduleIfoSource = findWritableModuleIfo(objects);
    if (!moduleIfoSource) {
      throw new AppException({
        status: 422,
        code: "MODULE_IFO_MISSING",
        message: "The editable module snapshot does not contain a root module.ifo resource."
      });
    }
    const moduleIfoPayload = await this.moduleBlobStorage.getModuleObject(
      settings.blobStorage,
      moduleIfoSource.key
    );
    if (!moduleIfoPayload) {
      throw new AppException({
        status: 409,
        code: "MODULE_IFO_SOURCE_MISSING",
        message: "module.ifo disappeared before the new Area transaction could start."
      });
    }
    let patchedModuleIfo: ReturnType<typeof patchModuleIfoAreaList>;
    try {
      patchedModuleIfo = patchModuleIfoAreaList(moduleIfoPayload.bytes, draft.areaResRef);
    } catch (error) {
      throw new AppException({
        status: 422,
        code: "MODULE_IFO_PRESERVE_UNAVAILABLE",
        message: error instanceof Error ? error.message : "module.ifo could not be patched losslessly."
      });
    }
    if (patchedModuleIfo.alreadyPresent) {
      throw new AppException({
        status: 409,
        code: "MODULE_IFO_AREA_DUPLICATE",
        message: `module.ifo Mod_Area_list already contains ${draft.areaResRef}.`
      });
    }
    const moduleIfoFileName = relativeSnapshotFileName(
      settings.blobStorage.modulePrefix,
      moduleIfoSource.key
    );
    if (!moduleIfoFileName) {
      throw new AppException({
        status: 422,
        code: "MODULE_IFO_WRITE_TARGET_UNSAFE",
        message: "module.ifo is outside the configured editable snapshot prefix."
      });
    }

    const files = [
      { extension: "are" as const, resourceType: 2012, bytes: exported.bytes },
      { extension: "git" as const, resourceType: 2023, bytes: serializeEmptyAreaGit() },
      { extension: "gic" as const, resourceType: 2046, bytes: serializeEmptyAreaGic() }
    ];
    const stored: AreaEditingPersistenceEnvelope["resources"] = [];
    let storedModuleIfo: ModuleBlobObjectSummary | undefined;
    let moduleIfoWriteAttempted = false;
    try {
      moduleIfoWriteAttempted = true;
      storedModuleIfo = await this.moduleBlobStorage.putModuleObject(settings.blobStorage, {
        fileName: moduleIfoFileName,
        resourceType: 2014,
        bytes: patchedModuleIfo.bytes
      });
      for (const file of files) {
        const result = await this.moduleBlobStorage.putModuleObject(settings.blobStorage, {
          fileName: `${draft.areaResRef}.${file.extension}`,
          resourceType: file.resourceType,
          bytes: file.bytes
        });
        stored.push({
          extension: file.extension,
          key: result.key,
          size: result.size,
          ...(result.etag ? { etag: result.etag } : {})
        });
      }
      const verificationFailures: string[] = [];
      try {
        const persistedModuleIfo = await this.moduleBlobStorage.getModuleObject(
          settings.blobStorage,
          moduleIfoSource.key
        );
        if (!persistedModuleIfo) {
          verificationFailures.push(`read ${moduleIfoSource.key}: persisted module.ifo is missing.`);
        } else {
          if (!persistedModuleIfo.bytes.equals(patchedModuleIfo.bytes)) {
            verificationFailures.push(
              `read ${moduleIfoSource.key}: persisted bytes do not match the patched module.ifo.`
            );
          }
          if (!moduleIfoContainsArea(persistedModuleIfo.bytes, draft.areaResRef)) {
            verificationFailures.push(
              `read ${moduleIfoSource.key}: Mod_Area_list does not contain ${draft.areaResRef}.`
            );
          }
        }
        for (const [index, file] of files.entries()) {
          const resource = stored[index];
          const expectedKey = expectedSnapshotObjectKey(
            settings.blobStorage.modulePrefix,
            `${draft.areaResRef}.${file.extension}`
          );
          if (!resource || resource.key !== expectedKey) {
            verificationFailures.push(
              `read ${expectedKey}: storage returned unexpected key ${resource?.key ?? "<missing>"}.`
            );
            continue;
          }
          const persisted = await this.moduleBlobStorage.getModuleObject(
            settings.blobStorage,
            resource.key
          );
          if (!persisted) {
            verificationFailures.push(`read ${resource.key}: persisted resource is missing.`);
          } else if (!persisted.bytes.equals(file.bytes)) {
            verificationFailures.push(
              `read ${resource.key}: persisted bytes do not match the serialized ${file.extension.toUpperCase()}.`
            );
          }
        }
      } catch (verificationError) {
        verificationFailures.push(
          `read-back: ${verificationError instanceof Error ? verificationError.message : String(verificationError)}`
        );
      }
      if (verificationFailures.length > 0) {
        throw new AppException({
          status: 500,
          code: "AREA_PERSISTENCE_VERIFICATION_FAILED",
          message: "New Area resources were written but durable read-back verification failed.",
          details: verificationFailures.map((reason) => ({ path: "storage.readback", reason }))
        });
      }
    } catch (error) {
      const rollbackFailures: string[] = [];
      for (const file of files) {
        const key = expectedSnapshotObjectKey(
          settings.blobStorage.modulePrefix,
          `${draft.areaResRef}.${file.extension}`
        );
        try {
          const deleted = await this.moduleBlobStorage.deleteModuleObject!(settings.blobStorage, key);
          const remaining = await this.moduleBlobStorage.getModuleObject(settings.blobStorage, key);
          if (remaining) {
            rollbackFailures.push(`delete ${key}: resource still exists after rollback.`);
          } else if (!deleted && stored.some((resource) => resource.key === key)) {
            rollbackFailures.push(`delete ${key}: storage reported false for a confirmed write.`);
          }
        } catch (rollbackError) {
          rollbackFailures.push(
            `delete ${key}: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`
          );
        }
      }
      if (moduleIfoWriteAttempted) {
        try {
          await this.moduleBlobStorage.putModuleObject(settings.blobStorage, {
            fileName: moduleIfoFileName,
            resourceType: 2014,
            bytes: moduleIfoPayload.bytes
          });
          const restored = await this.moduleBlobStorage.getModuleObject(
            settings.blobStorage,
            moduleIfoSource.key
          );
          if (!restored || !restored.bytes.equals(moduleIfoPayload.bytes)) {
            rollbackFailures.push(
              `restore ${moduleIfoSource.key}: read-back bytes do not match the original module.ifo.`
            );
          }
        } catch (rollbackError) {
          rollbackFailures.push(
            `restore ${moduleIfoSource.key}: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`
          );
        }
      }
      this.snapshotObjectCache = undefined;
      if (rollbackFailures.length > 0) {
        throw new AppException({
          status: 500,
          code: "AREA_PERSISTENCE_ROLLBACK_FAILED",
          message: "New Area persistence failed and module snapshot recovery was incomplete.",
          details: rollbackFailures.map((reason) => ({ path: "storage.rollback", reason }))
        });
      }
      throw error;
    }
    this.snapshotObjectCache = undefined;
    return {
      areaResRef: draft.areaResRef,
      areaFingerprint: createHash("sha256").update(exported.bytes).digest("hex"),
      created: true,
      resources: stored,
      moduleIfo: {
        key: storedModuleIfo.key,
        size: storedModuleIfo.size,
        areaCount: patchedModuleIfo.areaCount,
        ...(storedModuleIfo.etag ? { etag: storedModuleIfo.etag } : {})
      }
    };
  }

  private async listAllSnapshotObjects(
    settings: BlobStorageSettings
  ): Promise<ModuleBlobObjectSummary[]> {
    const key = buildSnapshotObjectCacheKey(settings);
    const now = Date.now();
    if (
      this.snapshotObjectCache?.key === key &&
      this.snapshotObjectCache.expiresAtMs > now
    ) {
      return this.snapshotObjectCache.objects;
    }

    const inFlight = this.snapshotObjectLoads.get(key);
    if (inFlight) {
      return inFlight;
    }

    const load = this.loadAllSnapshotObjects(settings)
      .then((objects) => {
        this.snapshotObjectCache = {
          key,
          expiresAtMs: Date.now() + SNAPSHOT_OBJECT_CACHE_TTL_MS,
          objects
        };
        return objects;
      })
      .finally(() => {
        this.snapshotObjectLoads.delete(key);
      });
    this.snapshotObjectLoads.set(key, load);
    return load;
  }

  private async loadAllSnapshotObjects(
    settings: BlobStorageSettings
  ): Promise<ModuleBlobObjectSummary[]> {
    const objects: ModuleBlobObjectSummary[] = [];
    let continuationToken: string | undefined;
    do {
      const page = await this.moduleBlobStorage.listModuleSnapshot(settings, {
        limit: 50_000,
        continuationToken
      });
      objects.push(...page.objects);
      continuationToken = page.truncated ? page.continuationToken : undefined;
    } while (continuationToken);
    return objects;
  }

  private async findSnapshotResource(
    settings: BlobStorageSettings,
    resRef: string,
    extension: ".are" | ".set"
  ): Promise<ModuleBlobObjectSummary | undefined> {
    const normalizedResRef = normalizeResRef(resRef);
    const objects = await this.listAllSnapshotObjects(settings);
    return objects
      .filter((object) => toResourceResRef(object.key, extension) === normalizedResRef)
      .sort((left, right) => left.key.localeCompare(right.key))[0];
  }
}

function validateDraft(
  draft: AreaEditingExportDraftRequest,
  tileset: AuroraTilesetEditingDefinition
): void {
  const expectedCount = draft.width * draft.height;
  if (draft.tiles.length !== expectedCount) {
    throw invalidTopology(`Tile count must equal width*height (${expectedCount}).`);
  }
  const validTileIds = new Set(tileset.tiles.map((tile) => tile.tileId));
  const cells = new Set<string>();
  const sourceCells = new Set<string>();
  const groupIdByTileId = new Map(
    tileset.tiles
      .filter((tile) => tile.groupId)
      .map((tile) => [tile.tileId, tile.groupId as string])
  );
  for (const tile of draft.tiles) {
    if (tile.row >= draft.height || tile.col >= draft.width) {
      throw invalidTopology(`Tile (${tile.row},${tile.col}) falls outside the declared Area dimensions.`);
    }
    const coordinate = `${tile.row}:${tile.col}`;
    if (cells.has(coordinate)) {
      throw invalidTopology(`Tile (${tile.row},${tile.col}) is duplicated.`);
    }
    cells.add(coordinate);
    if ((tile.sourceRow === undefined) !== (tile.sourceCol === undefined)) {
      throw invalidTopology(`Tile (${tile.row},${tile.col}) has incomplete source provenance.`);
    }
    if (tile.sourceRow !== undefined && tile.sourceCol !== undefined) {
      const sourceCoordinate = `${tile.sourceRow}:${tile.sourceCol}`;
      if (sourceCells.has(sourceCoordinate)) {
        throw invalidTopology(`Source tile (${tile.sourceRow},${tile.sourceCol}) is referenced more than once.`);
      }
      sourceCells.add(sourceCoordinate);
    }
    if (!validTileIds.has(tile.tileId)) {
      throw invalidTopology(`Tile_ID ${tile.tileId} does not exist in the selected tileset.`);
    }
  }
  for (const group of tileset.groups) {
    validateGroupInstances(draft, tileset, group, groupIdByTileId);
  }
}

function analyzeDraft(
  draft: AreaEditingExportDraftRequest,
  tileset: AuroraTilesetEditingDefinition
): AreaEditingVerificationIssue[] {
  const issues: AreaEditingVerificationIssue[] = tileset.diagnostics.map((diagnostic) => ({
    severity: diagnostic.severity,
    code: `SET_${diagnostic.code}`,
    message: `${diagnostic.section}: ${diagnostic.message}`
  }));
  const expectedCount = draft.width * draft.height;
  if (draft.tiles.length !== expectedCount) {
    issues.push({
      severity: "error",
      code: "TILE_COUNT_MISMATCH",
      message: `Tile count must equal width*height (${expectedCount}).`
    });
  }
  const validTiles = new Map(tileset.tiles.map((tile) => [tile.tileId, tile]));
  const cells = new Set<string>();
  const sourceCells = new Set<string>();
  for (const tile of draft.tiles) {
    if (tile.row >= draft.height || tile.col >= draft.width) {
      issues.push({
        severity: "error",
        code: "TILE_OUT_OF_BOUNDS",
        message: `Tile (${tile.row},${tile.col}) falls outside the declared Area dimensions.`,
        row: tile.row,
        col: tile.col,
        tileId: tile.tileId
      });
    }
    const coordinate = `${tile.row}:${tile.col}`;
    if (cells.has(coordinate)) {
      issues.push({
        severity: "error",
        code: "DUPLICATE_TILE_CELL",
        message: `Tile (${tile.row},${tile.col}) is duplicated.`,
        row: tile.row,
        col: tile.col,
        tileId: tile.tileId
      });
    }
    cells.add(coordinate);
    if ((tile.sourceRow === undefined) !== (tile.sourceCol === undefined)) {
      issues.push({
        severity: "error",
        code: "INCOMPLETE_SOURCE_PROVENANCE",
        message: `Tile (${tile.row},${tile.col}) has incomplete source provenance.`,
        row: tile.row,
        col: tile.col,
        tileId: tile.tileId
      });
    } else if (tile.sourceRow !== undefined && tile.sourceCol !== undefined) {
      const sourceCoordinate = `${tile.sourceRow}:${tile.sourceCol}`;
      if (sourceCells.has(sourceCoordinate)) {
        issues.push({
          severity: "error",
          code: "DUPLICATE_SOURCE_PROVENANCE",
          message: `Source tile (${tile.sourceRow},${tile.sourceCol}) is referenced more than once.`,
          row: tile.row,
          col: tile.col,
          tileId: tile.tileId
        });
      }
      sourceCells.add(sourceCoordinate);
    }
    const definition = validTiles.get(tile.tileId);
    if (!definition) {
      issues.push({
        severity: "error",
        code: "UNKNOWN_TILE_ID",
        message: `Tile_ID ${tile.tileId} does not exist in the selected tileset.`,
        row: tile.row,
        col: tile.col,
        tileId: tile.tileId
      });
    } else if (!definition.modelResRef) {
      issues.push({
        severity: "warning",
        code: "TILE_MODEL_RESREF_MISSING",
        message: `Tile_ID ${tile.tileId} has no Model entry in the selected SET.`,
        row: tile.row,
        col: tile.col,
        tileId: tile.tileId
      });
    }
  }

  const groupIdByTileId = new Map(
    tileset.tiles.filter((tile) => tile.groupId).map((tile) => [tile.tileId, tile.groupId as string])
  );
  for (const group of tileset.groups) {
    try {
      validateGroupInstances(draft, tileset, group, groupIdByTileId);
    } catch (error) {
      issues.push({
        severity: "error",
        code: "INCOMPLETE_GROUP_INSTANCE",
        message: error instanceof Error ? error.message : `Invalid group instance: ${group.name}.`
      });
    }
  }
  return issues;
}

function serializeEmptyAreaGit(): Buffer {
  const labels = [
    "Placeable List",
    "Door List",
    "Creature List",
    "Encounter List",
    "ItemList",
    "SoundList",
    "StoreList",
    "TriggerList",
    "WaypointList"
  ];
  return buildGffBuffer(
    [
      ...labels.map((label) => ({ label, type: "list" as const, value: [] })),
      {
        label: "AreaProperties",
        type: "struct" as const,
        value: { typeId: 0, fields: [] }
      }
    ],
    "GIT ",
    0xffffffff
  );
}

function serializeEmptyAreaGic(): Buffer {
  return buildGffBuffer([], "GIC ", 0xffffffff);
}

/**
 * Aurora does not serialize a group-instance field in an ARE.  Membership is
 * reconstructed from the SET's ordered group members, their cell positions,
 * and their final orientations.  Counting group-member tile IDs alone would
 * therefore accept exports that cannot be restored by the editor on reload.
 */
function validateGroupInstances(
  draft: AreaEditingExportDraftRequest,
  tileset: AuroraTilesetEditingDefinition,
  group: AuroraTilesetEditingDefinition["groups"][number],
  groupIdByTileId: ReadonlyMap<number, string>
): void {
  const groupTiles = draft.tiles.filter((tile) => groupIdByTileId.get(tile.tileId) === group.id);
  if (groupTiles.length === 0) {
    return;
  }
  if (groupTiles.length % group.tileIds.length !== 0) {
    throw invalidTopology(`Tiles from ${group.name} do not form complete group instances.`);
  }

  const tileByCell = new Map(draft.tiles.map((tile) => [`${tile.row}:${tile.col}`, tile]));
  const tilesetTileById = new Map(tileset.tiles.map((tile) => [tile.tileId, tile]));
  const matchedCells = new Set<string>();

  for (let row = 0; row < draft.height; row += 1) {
    for (let col = 0; col < draft.width; col += 1) {
      for (const orientation of [0, 1, 2, 3] as const) {
        const cells = group.tileIds.map((_tileId, index) => {
          const sourceRow = Math.floor(index / group.columns);
          const sourceCol = index % group.columns;
          const rotated = rotateGroupCell(sourceRow, sourceCol, group.columns, group.rows, orientation);
          return { row: row + rotated.row, col: col + rotated.col };
        });
        if (cells.some((cell) => cell.row < 0 || cell.col < 0 || cell.row >= draft.height || cell.col >= draft.width)) {
          continue;
        }
        const matches = cells.every((cell, index) => {
          const expectedTileId = group.tileIds[index];
          const expectedTile = tilesetTileById.get(expectedTileId);
          const actualTile = tileByCell.get(`${cell.row}:${cell.col}`);
          return (
            actualTile?.tileId === expectedTileId &&
            groupIdByTileId.get(actualTile.tileId) === group.id &&
            actualTile.orientation === normalizeOrientation((expectedTile?.orientation ?? 0) + orientation)
          );
        });
        if (matches && cells.every((cell) => !matchedCells.has(`${cell.row}:${cell.col}`))) {
          cells.forEach((cell) => matchedCells.add(`${cell.row}:${cell.col}`));
        }
      }
    }
  }

  if (groupTiles.some((tile) => !matchedCells.has(`${tile.row}:${tile.col}`))) {
    throw invalidTopology(`Tiles from ${group.name} do not form complete positioned group instances.`);
  }
}

function rotateGroupCell(
  row: number,
  col: number,
  width: number,
  height: number,
  orientation: 0 | 1 | 2 | 3
): { row: number; col: number } {
  if (orientation === 0) return { row, col };
  if (orientation === 1) return { row: col, col: height - 1 - row };
  if (orientation === 2) return { row: height - 1 - row, col: width - 1 - col };
  return { row: width - 1 - col, col: row };
}

function normalizeOrientation(value: number): 0 | 1 | 2 | 3 {
  return ((value % 4 + 4) % 4) as 0 | 1 | 2 | 3;
}

function invalidTopology(message: string): AppException {
  return new AppException({ status: 422, code: "INVALID_AREA_TOPOLOGY", message });
}

function toResRef(key: string): string {
  return toResourceResRef(key, ".set");
}

function compareTilesetSources(
  left: ModuleBlobObjectSummary,
  right: ModuleBlobObjectSummary
): number {
  const priorityDelta = resolveTilesetSourcePriority(left.key) - resolveTilesetSourcePriority(right.key);
  if (priorityDelta !== 0) {
    return priorityDelta;
  }
  const depthDelta = left.key.split(/[\\/]+/u).length - right.key.split(/[\\/]+/u).length;
  return depthDelta || left.key.localeCompare(right.key);
}

function resolveTilesetSourcePriority(key: string): number {
  const normalized = key.replace(/\\/gu, "/").toLowerCase();
  if (!normalized.includes("/__aurora/sources/")) return 0;
  if (normalized.includes("/__aurora/sources/hak/")) return 1;
  if (normalized.includes("/__aurora/sources/vanilla/")) return 2;
  return 3;
}

function toResourceResRef(key: string, extension: string): string {
  const fileName = key.replace(/\\/gu, "/").split("/").pop() ?? "";
  return normalizeResRef(fileName.replace(new RegExp(`${extension.replace(".", "\\.")}$`, "iu"), ""));
}

function findWritableModuleIfo(
  objects: readonly ModuleBlobObjectSummary[]
): ModuleBlobObjectSummary | undefined {
  return objects
    .filter((object) => {
      const normalized = object.key.replace(/\\/gu, "/").toLowerCase();
      return normalized.endsWith("/module.ifo") && !normalized.includes("/__aurora/sources/");
    })
    .sort((left, right) => {
      const depthDelta = left.key.split(/[\\/]+/u).length - right.key.split(/[\\/]+/u).length;
      return depthDelta || left.key.localeCompare(right.key);
    })[0];
}

function relativeSnapshotFileName(modulePrefix: string | undefined, objectKey: string): string | null {
  const normalizedKey = objectKey.replace(/^[/\\]+/u, "").replace(/\\/gu, "/");
  const normalizedPrefix = String(modulePrefix ?? "")
    .trim()
    .replace(/^[/\\]+/u, "")
    .replace(/\\/gu, "/")
    .replace(/\/+$/u, "");
  if (!normalizedPrefix) return normalizedKey;
  const prefix = `${normalizedPrefix}/`;
  return normalizedKey.toLowerCase().startsWith(prefix.toLowerCase())
    ? normalizedKey.slice(prefix.length)
    : null;
}

function expectedSnapshotObjectKey(modulePrefix: string | undefined, fileName: string): string {
  const normalizedPrefix = String(modulePrefix ?? "")
    .trim()
    .replace(/^[/\\]+/u, "")
    .replace(/\\/gu, "/")
    .replace(/\/+$/u, "");
  const normalizedFileName = fileName.replace(/^[/\\]+/u, "").replace(/\\/gu, "/");
  return normalizedPrefix ? `${normalizedPrefix}/${normalizedFileName}` : normalizedFileName;
}

function normalizeResRef(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]/gu, "").slice(0, 16);
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return entry;
    }
    return Object.fromEntries(Object.entries(entry).sort(([left], [right]) => left.localeCompare(right)));
  });
}

function buildSnapshotObjectCacheKey(settings: BlobStorageSettings): string {
  return [
    settings.endpoint?.trim() ?? "",
    settings.region?.trim() ?? "",
    settings.bucket?.trim() ?? "",
    settings.modulePrefix?.trim() ?? "",
    settings.forcePathStyle ? "path" : "host"
  ].join("\u0000");
}

export const __areaEditingApplicationServiceInternals = {
  validateDraft,
  analyzeDraft,
  serializeEmptyAreaGit,
  serializeEmptyAreaGic,
  compareTilesetSources,
  resolveTilesetSourcePriority,
  findWritableModuleIfo,
  relativeSnapshotFileName,
  expectedSnapshotObjectKey,
  validateGroupInstances,
  rotateGroupCell,
  normalizeOrientation
};
