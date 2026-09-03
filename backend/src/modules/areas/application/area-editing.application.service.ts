import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Inject, Injectable, Optional } from "@nestjs/common";
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
import type {
  BlobStorageSettings,
  RuntimePathSettings,
  RuntimeSettingsRecord
} from "../../runtime-settings/domain/runtime-settings.types";
import { extractModuleIfoHakList } from "../../runtime-settings/application/runtime-settings.application.service";
import {
  parseAuroraTilesetEditingDefinition,
  parseAuroraTilesetPresentation,
  type AuroraTilesetPresentation,
  type AuroraTilesetEditingDefinition
} from "../adapters/outbound/blob/aurora-set-tileset-parser";
import {
  serializeAreaEditingDraftToAreGff,
  validateAreaEditingSourceProvenance,
  type SerializableAreaEditingDraft
} from "../adapters/outbound/blob/aurora-gff-area-editing-writer";
import {
  serializeEmptyAreaGic,
  serializeEmptyAreaGit
} from "../adapters/outbound/blob/aurora-gff-area-companion-writer";
import {
  validateAreaCreationResourceSet,
  type AreaCreationResourceSet,
  type AreaCreationResourceSetValidationResult
} from "../adapters/outbound/blob/aurora-area-creation-resource-set-validator";
import { parseRawGffDocument } from "../../catalog/adapters/outbound/blob/aurora-gff-template-parser";
import type { AreaEditingExportDraftRequest } from "../adapters/inbound/http/area-editing.schemas";
import { AreasApplicationService } from "./areas.application.service";
import {
  moduleIfoContainsArea,
  patchModuleIfoAreaList
} from "../adapters/outbound/blob/aurora-gff-module-ifo-area-writer";
import {
  COMMITTED_MODULE_SNAPSHOT_READER,
  type CapturedCommittedModuleSnapshot,
  type CommittedModuleSnapshotReaderPort,
} from "../../module-snapshots/application/ports/committed-module-snapshot-reader.port";
import {
  TEMPLATE_CATALOG_REPOSITORY,
  type TemplateCatalogRepositoryPort,
} from "../../catalog/application/ports/template-catalog-repository.port";
import {
  AreaVisualEnvironmentCatalogSelectionMutationError,
  resolveAreaVisualEnvironmentCatalogSelectionMutation,
  type ExistingAreaVisualEnvironmentCatalogSelectionMutation,
  type ResolvedAreaVisualEnvironmentCatalogSelectionMutation,
} from "../domain/area-visual-environment-catalog-selection-mutation";

export interface AreaTilesetEditingSummary {
  tilesetResRef: string;
  /** Aurora Toolset picker label resolved from SET [GENERAL].DisplayName / dialog.tlk. */
  displayName: string;
  displayNameStrRef?: number;
  sourceKey: string;
  sourceSize: number;
  updatedAt?: string;
  etag?: string;
}

export interface AreaEditingSourceEnvelope {
  areaId: string;
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
  visualEnvironmentCatalogSelection?: ResolvedAreaVisualEnvironmentCatalogSelectionMutation;
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
  private capturedSnapshot: CapturedCommittedModuleSnapshot | null = null;

  constructor(
    private readonly areas: AreasApplicationService,
    @Inject(MODULE_BLOB_STORAGE)
    private readonly moduleBlobStorage: ModuleBlobStoragePort,
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly runtimeSettingsRepository: RuntimeSettingsRepositoryPort,
    @Optional() @Inject(COMMITTED_MODULE_SNAPSHOT_READER)
    private readonly committedSnapshotReader?: CommittedModuleSnapshotReaderPort,
    @Optional() @Inject(TEMPLATE_CATALOG_REPOSITORY)
    private readonly templateCatalogRepository?: TemplateCatalogRepositoryPort,
  ) {}

  invalidateSnapshotCache(): void {
    this.snapshotObjectCache = undefined;
    this.snapshotObjectLoads.clear();
    this.capturedSnapshot = null;
  }

  async listTilesets(): Promise<AreaTilesetEditingSummary[]> {
    const settings = await this.runtimeSettingsRepository.get();
    const objects = await this.listAllSnapshotObjects(settings.blobStorage);
    const hakSourcePriority = await this.resolveTilesetHakSourcePriority(settings, objects);
    const sourcesByResRef = new Map<string, ModuleBlobObjectSummary[]>();
    for (const object of objects
      .filter((candidate) => candidate.key.toLowerCase().endsWith(".set"))
      .sort((left, right) => compareTilesetSources(left, right, hakSourcePriority))) {
      const tilesetResRef = toResRef(object.key);
      if (tilesetResRef) {
        const sources = sourcesByResRef.get(tilesetResRef) ?? [];
        sources.push(object);
        sourcesByResRef.set(tilesetResRef, sources);
      }
    }
    const parsed = await mapWithConcurrency(
      Array.from(sourcesByResRef),
      8,
      async ([tilesetResRef, sources]) => {
        // `sources` is ordered using Aurora's resource-resolution semantics.
        // Only its first SET is effective; lower-priority HAK duplicates are
        // neither presented nor loaded by Aurora.
        const object = sources[0]!;
        const payload = await this.readSnapshotObject(settings.blobStorage, object.key);
        const definition = payload ? parseAuroraTilesetPresentation(payload.bytes) : undefined;
        return { tilesetResRef, object, definitions: [definition] };
      }
    );
    const talkTableNames = await readAuroraTalkTableStrings(
      settings.paths,
      parsed
        .flatMap(({ definitions }) => definitions.map((definition) => definition?.displayNameStrRef))
        .filter((strRef): strRef is number => isAuroraTalkTableStrRef(strRef))
    );
    return parsed.map(({ tilesetResRef, object, definitions }) => {
      const label = resolveAuroraTilesetDisplayName(definitions, talkTableNames, tilesetResRef);
      return {
        tilesetResRef,
        displayName: label.value,
        ...(label.displayNameStrRef === undefined ? {} : { displayNameStrRef: label.displayNameStrRef }),
      sourceKey: object.key,
      sourceSize: object.size,
      ...(object.lastModified ? { updatedAt: object.lastModified } : {}),
      ...(object.etag ? { etag: object.etag } : {})
      };
    })
      .sort((left, right) =>
        left.tilesetResRef.localeCompare(right.tilesetResRef) || left.sourceKey.localeCompare(right.sourceKey)
      );
  }

  async getTilesetDefinition(tilesetResRef: string): Promise<AuroraTilesetEditingDefinition> {
    const normalizedResRef = normalizeResRef(tilesetResRef);
    const settings = await this.runtimeSettingsRepository.get();
    const objects = await this.listAllSnapshotObjects(settings.blobStorage);
    const hakSourcePriority = await this.resolveTilesetHakSourcePriority(settings, objects);
    const source = objects
      .filter((object) => toResourceResRef(object.key, ".set") === normalizedResRef)
      .sort((left, right) => compareTilesetSources(left, right, hakSourcePriority))[0];
    if (!source) {
      throw new AppException({
        status: 404,
        code: "TILESET_DEFINITION_MISSING",
        message: `Tileset definition "${normalizedResRef}" was not found in the module snapshot.`
      });
    }
    const payload = await this.readSnapshotObject(settings.blobStorage, source.key);
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
    const area = await this.areas.getAreaTopologyMetadata(areaId);
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
      ? await this.readSnapshotObject(settings.blobStorage, source.key)
      : null;
    return {
      areaId: area.areaId,
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
    const visualEnvironmentCatalogSelection =
      await this.resolveVisualEnvironmentCatalogSelection(
        draft.visualEnvironmentCatalogSelection,
      );
    const serializable: SerializableAreaEditingDraft = {
      areaResRef: draft.areaResRef,
      name: draft.name,
      width: draft.width,
      height: draft.height,
      tilesetResRef: draft.tilesetResRef,
      ...(draft.comments ? { comments: draft.comments } : {}),
      ...(draft.eventScripts ? { eventScripts: draft.eventScripts } : {}),
      ...(draft.basicIdentity ? { basicIdentity: draft.basicIdentity } : {}),
      ...(draft.advancedFlags ? { advancedFlags: draft.advancedFlags } : {}),
      ...(draft.visualEnvironment ? { visualEnvironment: draft.visualEnvironment } : {}),
      ...(draft.visualEnvironmentScalarControls
        ? { visualEnvironmentScalarControls: draft.visualEnvironmentScalarControls }
        : {}),
      ...(visualEnvironmentCatalogSelection
        ? { visualEnvironmentCatalogSelection }
        : {}),
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
      ? await this.readSnapshotObject(settings.blobStorage, source.key)
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
      tilesetFingerprint: tileset.fingerprint,
      ...(visualEnvironmentCatalogSelection
        ? { visualEnvironmentCatalogSelection }
        : {}),
    };
  }

  private async resolveVisualEnvironmentCatalogSelection(
    mutation: ExistingAreaVisualEnvironmentCatalogSelectionMutation | undefined,
  ): Promise<ResolvedAreaVisualEnvironmentCatalogSelectionMutation | undefined> {
    if (!mutation) return undefined;
    const resolver = this.templateCatalogRepository
      ?.resolveEffectiveAreaVisualEnvironmentCatalogs;
    if (!resolver) {
      throw new AppException({
        status: 422,
        code: "AREA_VISUAL_ENVIRONMENT_CATALOG_UNAVAILABLE",
        message: "Effective Area visual-environment catalogs are unavailable.",
      });
    }
    let catalogs;
    try {
      catalogs = await resolver.call(this.templateCatalogRepository);
    } catch {
      throw new AppException({
        status: 422,
        code: "AREA_VISUAL_ENVIRONMENT_CATALOG_UNAVAILABLE",
        message: "Effective Area visual-environment catalogs could not be resolved.",
      });
    }
    if (!catalogs) {
      throw new AppException({
        status: 422,
        code: "AREA_VISUAL_ENVIRONMENT_CATALOG_UNAVAILABLE",
        message: "Effective Area visual-environment catalogs are unavailable.",
      });
    }
    try {
      return resolveAreaVisualEnvironmentCatalogSelectionMutation(
        mutation,
        catalogs,
      );
    } catch (error) {
      if (error instanceof AreaVisualEnvironmentCatalogSelectionMutationError) {
        const stale = error.code === "catalog_identity_mismatch";
        throw new AppException({
          status: stale ? 409 : 422,
          code: stale
            ? "AREA_VISUAL_ENVIRONMENT_CATALOG_STALE"
            : "AREA_VISUAL_ENVIRONMENT_CATALOG_SELECTION_INVALID",
          message: stale
            ? "Effective Area visual-environment catalogs changed. Reload the Area before saving."
            : "Area visual-environment catalog selection is invalid.",
          details: [{
            path: "visualEnvironmentCatalogSelection",
            reason: error.code,
          }],
        });
      }
      throw error;
    }
  }

  async verifyArea(draft: AreaEditingExportDraftRequest): Promise<AreaEditingVerificationEnvelope> {
    const tileset = await this.getTilesetDefinition(draft.tilesetResRef);
    const issues = analyzeDraft(draft, tileset);
    if (draft.visualEnvironmentCatalogSelection) {
      try {
        await this.resolveVisualEnvironmentCatalogSelection(
          draft.visualEnvironmentCatalogSelection,
        );
      } catch (error) {
        if (!(error instanceof AppException)) throw error;
        const response = error.getResponse();
        const message = typeof response === "object" && response !== null
          && "message" in response && typeof response.message === "string"
          ? response.message
          : "Area visual-environment catalog selection could not be verified.";
        issues.unshift({
          severity: "error",
          code: error.code,
          message,
        });
      }
    }
    if (tileset.fingerprint !== draft.tilesetFingerprint.toLowerCase()) {
      issues.unshift({
        severity: "error",
        code: "TILESET_FINGERPRINT_MISMATCH",
        message: "Tileset changed since this Area draft was opened. Reload it before saving."
      });
    }
    const tileById = new Map(tileset.tiles.map((tile) => [tile.tileId, tile]));
    const groupTileIds = new Set(
      tileset.tiles.filter(tileHasGroupMembership).map((tile) => tile.tileId)
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
    const gitBytes = serializeEmptyAreaGit();
    const gicBytes = serializeEmptyAreaGic();
    const files = [
      { extension: "are" as const, resourceType: 2012, bytes: exported.bytes },
      { extension: "git" as const, resourceType: 2023, bytes: gitBytes },
      { extension: "gic" as const, resourceType: 2046, bytes: gicBytes }
    ];
    const profileValidation = this.validateNewAreaResourceSet({
      are: exported.bytes,
      git: gitBytes,
      gic: gicBytes
    });
    if (!profileValidation.valid) {
      throw new AppException({
        status: 422,
        code: "AREA_CREATE_CANDIDATE_INVALID",
        message: "Generated Area resources do not match the admitted native creation profile.",
        details: profileValidation.diagnostics
          .filter((diagnostic) => diagnostic.severity === "ERROR")
          .map((diagnostic) => ({
            path: diagnostic.path,
            reason: `${diagnostic.code}: ${diagnostic.message}`
          }))
      });
    }
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
    const moduleIfoPayload = await this.readSnapshotObject(
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
        const persistedModuleIfo = await this.readSnapshotObject(
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
          const persisted = await this.readSnapshotObject(
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
          const remaining = await this.readSnapshotObject(settings.blobStorage, key);
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
          const restored = await this.readSnapshotObject(
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

  private validateNewAreaResourceSet(
    resources: AreaCreationResourceSet
  ): AreaCreationResourceSetValidationResult {
    return validateAreaCreationResourceSet(resources);
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
    const captured = this.committedSnapshotReader
      ? await this.committedSnapshotReader.capture()
      : null;
    if (captured) {
      this.capturedSnapshot = captured;
    }
    const objects: ModuleBlobObjectSummary[] = [];
    let continuationToken: string | undefined;
    do {
      const page = captured
        ? await captured.listModuleSnapshot({ limit: 50_000, continuationToken })
        : await this.moduleBlobStorage.listModuleSnapshot(settings, {
            limit: 50_000,
            continuationToken
          });
      objects.push(...page.objects);
      continuationToken = page.truncated ? page.continuationToken : undefined;
    } while (continuationToken);
    return objects;
  }

  private async readSnapshotObject(settings: BlobStorageSettings, key: string) {
    if (this.committedSnapshotReader) {
      this.capturedSnapshot ??= await this.committedSnapshotReader.capture();
      return this.capturedSnapshot.getModuleObject(key);
    }
    return this.moduleBlobStorage.getModuleObject(settings, key);
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

  /**
   * Aurora resolves a resource name against Mod_HakList in reverse list order:
   * the later HAK is the override.  A lexical HAK directory sort picked
   * cep3_tiles/tni01.set before q_tilesets/tni01.set here, even though this
   * module's actual City Interior Area uses Tile_ID 607 from q_tilesets.
   */
  private async resolveTilesetHakSourcePriority(
    settings: RuntimeSettingsRecord,
    objects: readonly ModuleBlobObjectSummary[]
  ): Promise<ReadonlyMap<string, number>> {
    const sourceSettings = settings.sources?.tile;
    // Older persisted settings and narrow unit fixtures predate per-asset
    // source policies. Preserve the previous deterministic fallback there.
    if (!sourceSettings) {
      return new Map();
    }
    if (!sourceSettings.includeHaks) {
      return new Map();
    }
    const inlinePriority = sourceSettings.hakPriorityList;
    if (inlinePriority.length > 0) {
      return buildAuroraHakSourcePriority(inlinePriority);
    }
    const moduleIfo = findWritableModuleIfo(objects);
    if (moduleIfo) {
      const payload = await this.readSnapshotObject(settings.blobStorage, moduleIfo.key);
      const hakList = payload ? extractModuleIfoHakList(payload.bytes) : [];
      if (hakList.length > 0) {
        return buildAuroraHakSourcePriority(hakList);
      }
    }
    return buildAuroraHakSourcePriority(settings.hakProfiles[sourceSettings.hakProfileId] ?? []);
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
    validateGroupInstances(draft, tileset, group);
  }
}

function analyzeDraft(
  draft: AreaEditingExportDraftRequest,
  tileset: AuroraTilesetEditingDefinition
): AreaEditingVerificationIssue[] {
  const issues: AreaEditingVerificationIssue[] = tileset.diagnostics.flatMap((diagnostic) =>
    diagnostic.severity === "info"
      ? []
      : [{
          severity: diagnostic.severity,
          code: `SET_${diagnostic.code}`,
          message: `${diagnostic.section}: ${diagnostic.message}`
        }]
  );
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

  for (const group of tileset.groups) {
    try {
      validateGroupInstances(draft, tileset, group);
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

/**
 * Aurora does not serialize a group-instance field in an ARE.  Membership is
 * reconstructed from the SET's ordered group members, their cell positions,
 * and their final orientations.  Counting group-member tile IDs alone would
 * therefore accept exports that cannot be restored by the editor on reload.
 */
function validateGroupInstances(
  draft: AreaEditingExportDraftRequest,
  tileset: AuroraTilesetEditingDefinition,
  group: AuroraTilesetEditingDefinition["groups"][number]
): void {
  const tilesetTileById = new Map(tileset.tiles.map((tile) => [tile.tileId, tile]));
  const groupTiles = draft.tiles.filter((tile) =>
    tileBelongsToGroup(tilesetTileById.get(tile.tileId), group.id)
  );
  if (groupTiles.length === 0) {
    return;
  }
  const memberCount = group.tileIds.filter((tileId): tileId is number => tileId !== null).length;
  if (memberCount === 0 || groupTiles.length % memberCount !== 0) {
    throw invalidTopology(`Tiles from ${group.name} do not form complete group instances.`);
  }

  const tileByCell = new Map(draft.tiles.map((tile) => [`${tile.row}:${tile.col}`, tile]));
  const matchedCells = new Set<string>();

  for (let row = 0; row < draft.height; row += 1) {
    for (let col = 0; col < draft.width; col += 1) {
      for (const orientation of [0, 1, 2, 3] as const) {
        const cells = group.tileIds.flatMap((tileId, index) => {
          if (tileId === null) {
            return [];
          }
          const sourceRow = Math.floor(index / group.columns);
          const sourceCol = index % group.columns;
          const rotated = rotateGroupCell(sourceRow, sourceCol, group.columns, group.rows, orientation);
          return [{ row: row + rotated.row, col: col + rotated.col, tileId }];
        });
        if (cells.some((cell) => cell.row < 0 || cell.col < 0 || cell.row >= draft.height || cell.col >= draft.width)) {
          continue;
        }
        const matches = cells.every((cell) => {
          const expectedTileId = cell.tileId;
          const expectedTile = tilesetTileById.get(expectedTileId);
          const actualTile = tileByCell.get(`${cell.row}:${cell.col}`);
          return (
            actualTile?.tileId === expectedTileId &&
            tileBelongsToGroup(tilesetTileById.get(actualTile.tileId), group.id) &&
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

function tileHasGroupMembership(
  tile: { groupId?: string; groupIds?: readonly string[] } | undefined
): boolean {
  return Boolean(tile?.groupId || tile?.groupIds?.length);
}

function tileBelongsToGroup(
  tile: { groupId?: string; groupIds?: readonly string[] } | undefined,
  groupId: string
): boolean {
  return tile?.groupId === groupId || tile?.groupIds?.includes(groupId) === true;
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
  right: ModuleBlobObjectSummary,
  hakSourcePriority: ReadonlyMap<string, number> = new Map()
): number {
  const priorityDelta =
    resolveTilesetSourcePriority(left.key, hakSourcePriority) -
    resolveTilesetSourcePriority(right.key, hakSourcePriority);
  if (priorityDelta !== 0) {
    return priorityDelta;
  }
  const depthDelta = left.key.split(/[\\/]+/u).length - right.key.split(/[\\/]+/u).length;
  return depthDelta || left.key.localeCompare(right.key);
}

/**
 * The Area Wizard enumerates all resource-layer variants of a SET. A module
 * override can omit presentation metadata, so resolve its picker label from
 * the first layer that supplies Aurora's localized or unlocalized label while
 * retaining the normal highest-priority source for the actual SET definition.
 */
function resolveAuroraTilesetDisplayName(
  definitions: ReadonlyArray<AuroraTilesetPresentation | undefined>,
  talkTableNames: ReadonlyMap<number, string>,
  fallback: string
): { value: string; displayNameStrRef?: number } {
  for (const definition of definitions) {
    const strRef = definition?.displayNameStrRef;
    const localized = strRef === undefined ? undefined : talkTableNames.get(strRef);
    if (localized) {
      return { value: localized, displayNameStrRef: strRef };
    }
  }
  for (const definition of definitions) {
    if (definition?.unlocalizedName) {
      return { value: definition.unlocalizedName };
    }
  }
  for (const definition of definitions) {
    if (definition?.name) {
      return { value: definition.name };
    }
  }
  return { value: fallback };
}

async function mapWithConcurrency<T, R>(
  entries: readonly T[],
  concurrency: number,
  mapper: (entry: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(entries.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(Math.max(concurrency, 1), entries.length) }, async () => {
    while (nextIndex < entries.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(entries[index]!);
    }
  });
  await Promise.all(workers);
  return results;
}

function resolveTilesetSourcePriority(key: string, hakSourcePriority: ReadonlyMap<string, number>): number {
  const normalized = key.replace(/\\/gu, "/").toLowerCase();
  if (!normalized.includes("/__aurora/sources/")) return 0;
  const hakName = extractHakSourceName(key);
  if (hakName) {
    return hakSourcePriority.get(hakName) ?? 10_000;
  }
  if (normalized.includes("/__aurora/sources/vanilla/")) return 20_000;
  return 30_000;
}

function buildAuroraHakSourcePriority(hakList: readonly string[]): ReadonlyMap<string, number> {
  const priority = new Map<string, number>();
  let nextPriority = 100;
  for (let index = hakList.length - 1; index >= 0; index -= 1) {
    const hakName = normalizeHakSourceName(hakList[index] ?? "");
    if (hakName && !priority.has(hakName)) {
      priority.set(hakName, nextPriority);
      nextPriority += 1;
    }
  }
  return priority;
}

function extractHakSourceName(key: string): string | undefined {
  const match = /\/__aurora\/sources\/hak\/([^/]+)\//iu.exec(key.replace(/\\/gu, "/"));
  return match?.[1] ? normalizeHakSourceName(match[1]) : undefined;
}

function normalizeHakSourceName(value: string): string {
  const fileName = value.replace(/\\/gu, "/").split("/").pop()?.trim().toLowerCase() ?? "";
  return fileName.endsWith(".hak") ? fileName.slice(0, -4) : fileName;
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

const AURORA_CUSTOM_TLK_STRREF_BASE = 0x01000000;
const AURORA_TLK_HEADER_SIZE = 20;
const AURORA_TLK_ENTRY_SIZE = 40;

/**
 * Aurora's New Area dialog resolves SET [GENERAL].DisplayName through the
 * configured base/custom talk tables. Keep the fallback to [GENERAL].Name so
 * custom content remains usable when its custom TLK is not installed.
 */
async function readAuroraTalkTableStrings(
  paths: RuntimePathSettings | undefined,
  strRefs: readonly number[]
): Promise<Map<number, string>> {
  const unique = Array.from(new Set(strRefs.filter(isAuroraTalkTableStrRef)));
  const base = unique
    .filter((strRef) => strRef < AURORA_CUSTOM_TLK_STRREF_BASE)
    .map((strRef) => ({ strRef, index: strRef }));
  const custom = unique
    .filter((strRef) => strRef >= AURORA_CUSTOM_TLK_STRREF_BASE)
    .map((strRef) => ({ strRef, index: strRef - AURORA_CUSTOM_TLK_STRREF_BASE }));
  const [baseNames, customNames] = await Promise.all([
    readAuroraTalkTableFile(paths?.tlkBasePath, base),
    readAuroraTalkTableFile(paths?.tlkCustomPath, custom)
  ]);
  return new Map([...baseNames, ...customNames]);
}

async function readAuroraTalkTableFile(
  filePath: string | undefined,
  requests: ReadonlyArray<{ strRef: number; index: number }>
): Promise<Map<number, string>> {
  const resolved = new Map<number, string>();
  const path = filePath?.trim();
  if (!path || requests.length === 0) return resolved;
  let bytes: Buffer;
  try {
    bytes = await readFile(path);
  } catch {
    return resolved;
  }
  if (!isAuroraTalkTableRangeReadable(bytes, 0, AURORA_TLK_HEADER_SIZE)) return resolved;
  if (bytes.subarray(0, 8).toString("ascii") !== "TLK V3.0") return resolved;
  const stringCount = bytes.readUInt32LE(12);
  const stringDataOffset = bytes.readUInt32LE(16);
  for (const request of requests) {
    if (request.index < 0 || request.index >= stringCount) continue;
    const entryOffset = AURORA_TLK_HEADER_SIZE + request.index * AURORA_TLK_ENTRY_SIZE;
    if (!isAuroraTalkTableRangeReadable(bytes, entryOffset, AURORA_TLK_ENTRY_SIZE)) continue;
    const textOffset = bytes.readUInt32LE(entryOffset + 28);
    const textSize = bytes.readUInt32LE(entryOffset + 32);
    const textStart = stringDataOffset + textOffset;
    if (!isAuroraTalkTableRangeReadable(bytes, textStart, textSize)) continue;
    const text = bytes.subarray(textStart, textStart + textSize).toString("latin1").replace(/\0/gu, "").trim();
    if (text) resolved.set(request.strRef, text);
  }
  return resolved;
}

function isAuroraTalkTableStrRef(value: number | undefined): value is number {
  if (typeof value !== "number") return false;
  return Number.isInteger(value) && value >= 0 && value !== 0xffffffff;
}

function isAuroraTalkTableRangeReadable(bytes: Buffer, offset: number, length: number): boolean {
  return Number.isInteger(offset) && Number.isInteger(length) && offset >= 0 && length >= 0
    ? offset + length <= bytes.length
    : false;
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
  buildAuroraHakSourcePriority,
  resolveTilesetSourcePriority,
  findWritableModuleIfo,
  relativeSnapshotFileName,
  expectedSnapshotObjectKey,
  validateGroupInstances,
  rotateGroupCell,
  normalizeOrientation
};
