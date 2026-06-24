import { createHash } from "node:crypto";
import { Inject, Injectable, Logger } from "@nestjs/common";
import type {
  ModuleBlobObjectSummary,
  ModuleBlobSnapshotSummary,
  ModuleBlobStoragePort
} from "../../../../runtime-settings/application/ports/module-blob-storage.port";
import { MODULE_BLOB_STORAGE } from "../../../../runtime-settings/application/ports/module-blob-storage.port";
import type { RuntimeSettingsRepositoryPort } from "../../../../runtime-settings/application/ports/runtime-settings-repository.port";
import { RUNTIME_SETTINGS_REPOSITORY } from "../../../../runtime-settings/application/ports/runtime-settings-repository.port";
import type { BlobStorageSettings } from "../../../../runtime-settings/domain/runtime-settings.types";
import {
  BLANK_CELL,
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow
} from "../../../../../common/aurora/two-da/aurora-two-da-table";
import { executeInFlight } from "../../../../../common/async/in-flight.helpers";
import type {
  DoorAppearanceModelLookupResult,
  PlaceableAppearanceModelLookupResult,
  TemplateCatalogRepositoryPort
} from "../../../application/ports/template-catalog-repository.port";
import {
  buildPlaceableProcessCacheKey,
  buildTemplateProcessCacheKey
} from "../../../domain/cache-key.builders";
import type {
  PlaceableSubtype,
  TemplateKind,
  TemplateListQuery,
  TemplateListResult,
  TemplateRecord
} from "../../../domain/template.types";
import {
  type ParsedTemplateBlueprint,
  parseTemplateBlueprintFromGff
} from "./aurora-gff-template-parser";

interface IndexedTemplate {
  record: TemplateRecord;
  searchable: string;
  categoryLower: string;
  tagsLower: Set<string>;
}

interface SnapshotIndex {
  fetchedAtMs: number;
  cacheKey: string;
  byKind: Map<TemplateKind, IndexedTemplate[]>;
  byKindAndId: Map<string, TemplateRecord>;
  byKindAndResref: Map<string, TemplateRecord>;
  placeableProcessingByIdAndSubtype: Map<string, string>;
  templateProcessingByKindAndId: Map<string, string>;
  placeableAppearanceModelByRowId: Map<number, PlaceableAppearanceModelLookupEntry>;
  doorTwoDaLookup: DoorTwoDaLookup;
}

interface TemplateCandidate {
  kind: TemplateKind;
  resref: string;
  extension: string;
  sourceKey: string;
  sourceSize: number;
  updatedAt: string;
  sourceEtag?: string;
  sourceFingerprint: string;
  parsedBlueprint?: ParsedTemplateBlueprint;
  placeables2daRow?: PlaceablesTwoDaRow;
}

export interface ParsedPlaceablesTwoDaRow {
  rowId: number;
  label?: string;
  modelResRef: string;
}

interface PlaceablesTwoDaRow extends ParsedPlaceablesTwoDaRow {
  sourceKey: string;
  sourceSize: number;
  updatedAt: string;
  sourceEtag?: string;
  sourceFingerprint: string;
}

interface LoadedPlaceablesTwoDaSource {
  key: string;
  sourceSize: number;
  updatedAt: string;
  sourceEtag?: string;
  rows: ParsedPlaceablesTwoDaRow[];
}

interface PlaceableAppearanceModelLookupEntry {
  modelResRef: string;
  rowId: number;
  requestedRowId?: number;
  sourceKey?: string;
  resolutionPath: "direct" | "nwic-user-row-minus-100";
}

type DoorTwoDaTableName = "doortypes.2da" | "genericdoors.2da";

interface ParsedDoorTwoDaRow {
  rowId: number;
  label?: string;
  modelResRef?: string;
  sourceTable: DoorTwoDaTableName;
}

interface DoorTwoDaRow extends ParsedDoorTwoDaRow {
  sourceKey: string;
  sourceSize: number;
  updatedAt: string;
  sourceEtag?: string;
  sourceFingerprint: string;
}

interface DoorTwoDaLookup {
  doortypesByRowId: Map<number, DoorTwoDaRow>;
  genericdoorsByRowId: Map<number, DoorTwoDaRow>;
  doortypesSourceKey?: string;
  genericdoorsSourceKey?: string;
}

interface DoorTwoDaLookupHints {
  appearanceId?: number;
  genericType?: number;
  doortypesSourceKey?: string;
  doortypesRowId?: number;
  doortypesLabel?: string;
  doortypesModelResRef?: string;
  genericdoorsSourceKey?: string;
  genericdoorsRowId?: number;
  genericdoorsLabel?: string;
  genericdoorsModelResRef?: string;
  modelResRef?: string;
  doortypesAvailable: boolean;
  genericdoorsAvailable: boolean;
}

const CANDIDATE_EXTENSIONS = new Set(["utp", "utd", "utc", "uti"]);
const DOOR_PATTERN = /(?:door|gdoor|sdoor|gate|portal|portcullis)/u;
const VFX_PATTERN =
  /(?:^|[^a-z0-9])(?:vfx|vvx|fx|emit|emitter|particle|fog|smoke|bubbles)(?=$|[^a-z0-9])/u;
const LIGHT_PATTERN =
  /(?:^|[^a-z0-9])(?:light(?:$|[^a-z0-9]|shaft|blob|beam|house)|lamp|torch|lantern|candle|brazier|sconce|fireplace|campfire|latarnia)/u;
const TRIGGER_PATTERN = /(trigger|trig|trap)/u;
const CONTAINER_PATTERN =
  /(container|chest|crate|barrel|box|drawer|coffin|sarcophagus|sack|skrzyn|beczk|szkatu)/u;
const REMAINS_PATTERN = /(corpse|corps|bodybag|body_bag|body bag|carcass|remains|bones|skeleton|zw.?oki)/u;
const PLACEABLES_TWO_DA_NWIC_USER_ROW_OFFSET = 100;
const SNAPSHOT_TEMPLATE_CATALOG_INDEX_TTL_MS = 5 * 60_000;

@Injectable()
export class ModuleSnapshotTemplateCatalogRepository implements TemplateCatalogRepositoryPort {
  private readonly logger = new Logger(ModuleSnapshotTemplateCatalogRepository.name);
  private snapshotIndex: SnapshotIndex | null = null;
  private readonly inFlightSnapshotIndex = new Map<string, Promise<SnapshotIndex | null>>();

  constructor(
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly runtimeSettingsRepository: RuntimeSettingsRepositoryPort,
    @Inject(MODULE_BLOB_STORAGE)
    private readonly moduleBlobStorage: ModuleBlobStoragePort
  ) {}

  async listByKind(kind: TemplateKind, query: TemplateListQuery): Promise<TemplateListResult> {
    const index = await this.getSnapshotIndex();
    if (!index) {
      return {
        items: [],
        total: 0,
        limit: query.limit,
        offset: query.offset
      };
    }

    const normalizedQuery = query.query?.toLowerCase().trim();
    const normalizedCategory = query.category?.toLowerCase().trim();
    const normalizedTag = query.tag?.toLowerCase().trim();
    const filtered = (index.byKind.get(kind) ?? [])
      .filter((item) => {
        if (!query.query) {
          return true;
        }
        return item.searchable.includes(normalizedQuery ?? "");
      })
      .filter((item) => {
        if (!query.category) {
          return true;
        }
        return item.categoryLower === normalizedCategory;
      })
      .filter((item) => {
        if (!query.tag) {
          return true;
        }
        return item.tagsLower.has(normalizedTag ?? "");
      })
      .filter((item) => {
        if (kind !== "placeable" || !query.subtype) {
          return true;
        }
        return item.record.placeableSubtype === query.subtype;
      })
      .filter((item) => {
        if (kind !== "placeable" || typeof query.benchmark !== "boolean") {
          return true;
        }
        return Boolean(item.record.benchmarkCandidate) === query.benchmark;
      });

    const items = filtered
      .slice(query.offset, query.offset + query.limit)
      .map((item) => item.record);

    return {
      items,
      total: filtered.length,
      limit: query.limit,
      offset: query.offset
    };
  }

  async findByKindAndId(kind: TemplateKind, templateId: string): Promise<TemplateRecord | null> {
    const index = await this.getSnapshotIndex();
    if (!index) {
      return null;
    }
    return index.byKindAndId.get(buildTemplateIdIndexKey(kind, templateId)) ?? null;
  }

  async findByKindAndResref(kind: TemplateKind, resref: string): Promise<TemplateRecord | null> {
    const index = await this.getSnapshotIndex();
    if (!index) {
      return null;
    }
    return index.byKindAndResref.get(buildTemplateResrefIndexKey(kind, resref)) ?? null;
  }

  async resolvePlaceableAppearanceModel(
    appearanceType: number
  ): Promise<PlaceableAppearanceModelLookupResult | null> {
    if (!Number.isInteger(appearanceType) || appearanceType < 0) {
      return null;
    }
    const index = await this.getSnapshotIndex();
    const lookup = index?.placeableAppearanceModelByRowId.get(appearanceType);
    if (!lookup) {
      return null;
    }
    return {
      modelResRef: lookup.modelResRef,
      source2da: "placeables.2da",
      rowId: lookup.rowId,
      ...(lookup.requestedRowId !== undefined ? { requestedRowId: lookup.requestedRowId } : {}),
      ...(lookup.resolutionPath !== "direct" ? { resolutionPath: lookup.resolutionPath } : {}),
      ...(lookup.resolutionPath !== "direct" && lookup.sourceKey ? { sourceKey: lookup.sourceKey } : {})
    };
  }

  async resolveDoorAppearanceModel(input: {
    appearanceType?: number;
    genericType?: number;
  }): Promise<DoorAppearanceModelLookupResult | null> {
    const index = await this.getSnapshotIndex();
    if (!index) {
      return null;
    }
    const lookup = index.doorTwoDaLookup;
    const appearanceType =
      Number.isInteger(input.appearanceType ?? Number.NaN) && input.appearanceType !== undefined
        ? input.appearanceType
        : undefined;
    const genericType =
      Number.isInteger(input.genericType ?? Number.NaN) && input.genericType !== undefined
        ? input.genericType
        : undefined;
    const doortypesRow =
      appearanceType !== undefined ? lookup.doortypesByRowId.get(appearanceType) : undefined;
    const genericdoorsRow =
      genericType !== undefined ? lookup.genericdoorsByRowId.get(genericType) : undefined;
    const hasLookupInput = appearanceType !== undefined || genericType !== undefined;
    if (!hasLookupInput && lookup.doortypesByRowId.size === 0 && lookup.genericdoorsByRowId.size === 0) {
      return null;
    }

    return {
      appearanceType,
      genericType,
      doortypesSourceKey: doortypesRow?.sourceKey ?? lookup.doortypesSourceKey,
      doortypesRowId: doortypesRow?.rowId,
      doortypesLabel: doortypesRow?.label,
      doortypesModelResRef: doortypesRow?.modelResRef,
      genericdoorsSourceKey: genericdoorsRow?.sourceKey ?? lookup.genericdoorsSourceKey,
      genericdoorsRowId: genericdoorsRow?.rowId,
      genericdoorsLabel: genericdoorsRow?.label,
      genericdoorsModelResRef: genericdoorsRow?.modelResRef,
      modelResRef: genericdoorsRow?.modelResRef ?? doortypesRow?.modelResRef,
      doortypesAvailable: lookup.doortypesByRowId.size > 0,
      genericdoorsAvailable: lookup.genericdoorsByRowId.size > 0
    };
  }

  getPrecomputedPlaceableCacheKey(templateId: string, subtype: PlaceableSubtype): string | null {
    if (!this.snapshotIndex) {
      return null;
    }
    return (
      this.snapshotIndex.placeableProcessingByIdAndSubtype.get(
        buildPlaceableProcessingIndexKey(templateId, subtype)
      ) ?? null
    );
  }

  getPrecomputedTemplateCacheKey(kind: "creature" | "item", templateId: string): string | null {
    if (!this.snapshotIndex) {
      return null;
    }
    return (
      this.snapshotIndex.templateProcessingByKindAndId.get(
        buildTemplateProcessingIndexKey(kind, templateId)
      ) ?? null
    );
  }

  private async getSnapshotIndex(): Promise<SnapshotIndex | null> {
    const now = Date.now();
    if (
      this.snapshotIndex &&
      now - this.snapshotIndex.fetchedAtMs < SNAPSHOT_TEMPLATE_CATALOG_INDEX_TTL_MS
    ) {
      return this.snapshotIndex;
    }

    const settings = await this.runtimeSettingsRepository.get();
    const inFlightKey = [
      settings.blobStorage.bucket,
      normalizePrefixForLookup(settings.blobStorage.modulePrefix)
    ].join("|");

    const refreshedIndex = executeInFlight(this.inFlightSnapshotIndex, inFlightKey, async () => {
      const refreshNow = Date.now();
      if (
        this.snapshotIndex &&
        refreshNow - this.snapshotIndex.fetchedAtMs < SNAPSHOT_TEMPLATE_CATALOG_INDEX_TTL_MS
      ) {
        return this.snapshotIndex;
      }

      const snapshot = await this.listAllModuleSnapshotObjects(settings.blobStorage);
      const placeablesTwoDaSources = await this.loadPlaceablesTwoDaSources(
        settings.blobStorage,
        snapshot.objects
      );
      const candidates = await this.buildTemplateCandidatesFromSnapshot(
        settings.blobStorage,
        snapshot.objects,
        placeablesTwoDaSources
      );
      const placeableAppearanceModelLookup =
        this.buildPlaceableAppearanceModelLookup(placeablesTwoDaSources);
      const doorTwoDaLookup = await this.buildDoorTwoDaLookup(
        settings.blobStorage,
        snapshot.objects
      );

    if (candidates.length === 0) {
      this.logger.warn(
        "No template files detected in module snapshot (expected: utp/utd/utc/uti). Returning empty catalog for this snapshot."
      );
      const emptyFingerprint = createHash("sha256").update("").digest("hex");
      const emptyCacheKey = [
        settings.blobStorage.bucket,
        snapshot.prefix,
        snapshot.moduleHash ?? "unknown",
        String(snapshot.objects.length),
        "0",
        emptyFingerprint
      ].join("|");
      this.snapshotIndex = {
        fetchedAtMs: refreshNow,
        cacheKey: emptyCacheKey,
        byKind: new Map(),
        byKindAndId: new Map(),
        byKindAndResref: new Map(),
        placeableProcessingByIdAndSubtype: new Map(),
        templateProcessingByKindAndId: new Map(),
        placeableAppearanceModelByRowId: placeableAppearanceModelLookup,
        doorTwoDaLookup
      };
      return this.snapshotIndex;
    }

    const placeableBenchmarkIds = pickBenchmarkTemplateIds(candidates, "placeable");
    const creatureBenchmarkIds = pickBenchmarkTemplateIds(candidates, "creature");
    const itemBenchmarkIds = pickBenchmarkTemplateIds(candidates, "item");

    const mapped = candidates
      .map((candidate) => ({
        candidate,
        record: mapCandidateToTemplateRecord(candidate, {
          placeable: placeableBenchmarkIds,
          creature: creatureBenchmarkIds,
          item: itemBenchmarkIds
        }, placeableAppearanceModelLookup, doorTwoDaLookup)
      }))
      .sort((left, right) => left.record.templateId.localeCompare(right.record.templateId));

    const byKind = new Map<TemplateKind, IndexedTemplate[]>();
    const byKindAndId = new Map<string, TemplateRecord>();
    const byKindAndResref = new Map<string, TemplateRecord>();
    const placeableProcessingByIdAndSubtype = new Map<string, string>();
    const templateProcessingByKindAndId = new Map<string, string>();

    for (const { candidate, record } of mapped) {
      const indexed: IndexedTemplate = {
        record,
        searchable: buildTemplateSearchableText(record),
        categoryLower: record.category.toLowerCase(),
        tagsLower: new Set(record.tags.map((tag) => tag.toLowerCase()))
      };
      const bucket = byKind.get(record.kind);
      if (bucket) {
        bucket.push(indexed);
      } else {
        byKind.set(record.kind, [indexed]);
      }

      byKindAndId.set(buildTemplateIdIndexKey(record.kind, record.templateId), record);
      byKindAndResref.set(buildTemplateResrefIndexKey(record.kind, record.resref), record);

      if (record.kind === "placeable") {
        const subtypes: PlaceableSubtype[] = [
          "generic",
          "door",
          "vfx",
          "container",
          "light_source",
          "trigger_proxy"
        ];
        for (const subtype of subtypes) {
          placeableProcessingByIdAndSubtype.set(
            buildPlaceableProcessingIndexKey(record.templateId, subtype),
            buildPlaceableProcessCacheKey(
              record.templateId,
              record.resref,
              subtype,
              candidate.sourceFingerprint
            )
          );
        }
      } else {
        templateProcessingByKindAndId.set(
          buildTemplateProcessingIndexKey(record.kind, record.templateId),
          buildTemplateProcessCacheKey(
            record.kind,
            record.templateId,
            record.resref,
            candidate.sourceFingerprint
          )
        );
      }
    }

    const candidateFingerprint = createHash("sha256")
      .update(
        mapped
          .map(({ record, candidate }) => `${record.kind}:${record.resref}:${candidate.sourceFingerprint}`)
          .join("\n")
      )
      .digest("hex");

    const cacheKey = [
      settings.blobStorage.bucket,
      snapshot.prefix,
      snapshot.moduleHash ?? "unknown",
      String(snapshot.objects.length),
      String(mapped.length),
      candidateFingerprint
    ].join("|");

    this.snapshotIndex = {
      fetchedAtMs: refreshNow,
      cacheKey,
      byKind,
      byKindAndId,
      byKindAndResref,
      placeableProcessingByIdAndSubtype,
      templateProcessingByKindAndId,
      placeableAppearanceModelByRowId: placeableAppearanceModelLookup,
      doorTwoDaLookup
    };

      return this.snapshotIndex;
    });

    if (this.snapshotIndex) {
      const staleIndex = this.snapshotIndex;
      void refreshedIndex.catch((error: unknown) => {
        this.logger.warn(
          `Template snapshot index background refresh failed; keeping stale index: ${formatSnapshotIndexError(error)}`
        );
      });
      return staleIndex;
    }

    return refreshedIndex;
  }

  private async listAllModuleSnapshotObjects(
    settings: BlobStorageSettings
  ): Promise<ModuleBlobSnapshotSummary> {
    const objects: ModuleBlobObjectSummary[] = [];
    let continuationToken: string | undefined;
    let moduleHash: string | undefined;
    let prefix = normalizePrefixForLookup(settings.modulePrefix);

    do {
      const page = await this.moduleBlobStorage.listModuleSnapshot(settings, {
        limit: 1000,
        continuationToken
      });
      moduleHash = moduleHash ?? page.moduleHash;
      prefix = page.prefix;
      objects.push(...page.objects);
      continuationToken = page.continuationToken;
      if (!page.truncated || !continuationToken) {
        break;
      }
    } while (true);

    const totalBytes = objects.reduce((sum, object) => sum + object.size, 0);
    return {
      bucket: settings.bucket,
      prefix,
      moduleHash,
      totalFiles: objects.length,
      totalBytes,
      objects,
      truncated: false
    };
  }

  private async buildTemplateCandidatesFromSnapshot(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[],
    placeablesTwoDaSources: LoadedPlaceablesTwoDaSource[]
  ): Promise<TemplateCandidate[]> {
    const byKey = new Map<string, TemplateCandidate>();

    for (const object of objects) {
      const fileName = extractFileName(object.key);
      const extension = extractExtension(fileName);
      if (!CANDIDATE_EXTENSIONS.has(extension)) {
        continue;
      }

      const resref = normalizeResref(extractBasename(fileName));
      if (resref.length < 2) {
        continue;
      }

      const kind = classifyTemplateKind(extension);
      const key = `${kind}:${resref}`;
      const candidate: TemplateCandidate = {
        kind,
        resref,
        extension,
        sourceKey: object.key,
        sourceSize: object.size,
        updatedAt: object.lastModified ?? new Date().toISOString(),
        sourceEtag: object.etag,
        sourceFingerprint: buildSourceFingerprint([
          "raw",
          kind,
          resref,
          object.key,
          String(object.size),
          object.lastModified ?? "",
          object.etag ?? ""
        ])
      };

      const current = byKey.get(key);
      if (!current) {
        byKey.set(key, candidate);
        continue;
      }

      if (candidate.sourceSize > current.sourceSize) {
        byKey.set(key, candidate);
        continue;
      }
      if (candidate.sourceSize === current.sourceSize && candidate.updatedAt > current.updatedAt) {
        byKey.set(key, candidate);
      }
    }

    const candidates = [...byKey.values()];
    await mapWithConcurrency(candidates, 8, async (candidate) => {
      try {
        const payload = await this.moduleBlobStorage.getModuleObject(settings, candidate.sourceKey);
        if (!payload) {
          return;
        }

        const parsedBlueprint = parseTemplateBlueprintFromGff(payload.bytes);
        if (parsedBlueprint) {
          candidate.parsedBlueprint = parsedBlueprint;
        }

        const dependencyFingerprint = parsedBlueprint?.dependencyFingerprint ?? "none";
        candidate.sourceEtag = payload.etag ?? candidate.sourceEtag;
        candidate.sourceFingerprint = buildSourceFingerprint([
          "blob",
          candidate.kind,
          candidate.resref,
          candidate.sourceKey,
          String(payload.size),
          payload.lastModified ?? candidate.updatedAt,
          payload.etag ?? candidate.sourceEtag ?? "",
          parsedBlueprint?.sourceFileType ?? "",
          parsedBlueprint?.sourceFileVersion ?? "",
          String(parsedBlueprint?.sourceStructTypeId ?? -1),
          parsedBlueprint?.templateResRef ?? "",
          parsedBlueprint?.modelResRef ?? "",
          String(parsedBlueprint?.genericType ?? -1),
          dependencyFingerprint
        ]);
      } catch {
        // Keep candidate heuristics path if object payload is unavailable.
      }
    });

    const placeables2daRows = this.buildPlaceableCandidatesFromTwoDa(placeablesTwoDaSources);
    for (const row of placeables2daRows) {
      const key = `placeable:${row.modelResRef}`;
      if (byKey.has(key)) {
        continue;
      }

      const candidate: TemplateCandidate = {
        kind: "placeable",
        resref: row.modelResRef,
        extension: "2da",
        sourceKey: `${row.sourceKey}#row=${row.rowId}`,
        sourceSize: row.sourceSize,
        updatedAt: row.updatedAt,
        sourceEtag: row.sourceEtag,
        sourceFingerprint: row.sourceFingerprint,
        placeables2daRow: row
      };
      byKey.set(key, candidate);
      candidates.push(candidate);
    }

    return candidates;
  }

  private async loadPlaceablesTwoDaSources(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[]
  ): Promise<LoadedPlaceablesTwoDaSource[]> {
    const sources: LoadedPlaceablesTwoDaSource[] = [];
    const placeables2daKeys = collectPlaceables2daKeys(objects);
    if (placeables2daKeys.length === 0) {
      return sources;
    }

    const objectsByKey = new Map(objects.map((object) => [object.key, object]));
    for (const key of placeables2daKeys) {
      let payload;
      try {
        payload = await this.moduleBlobStorage.getModuleObject(settings, key);
      } catch {
        continue;
      }
      if (!payload) {
        continue;
      }

      const object = objectsByKey.get(key);
      const parsedRows = parsePlaceablesTwoDaRows(payload.bytes);
      sources.push({
        key,
        sourceSize: object?.size ?? payload.size,
        updatedAt: object?.lastModified ?? payload.lastModified ?? new Date(0).toISOString(),
        sourceEtag: object?.etag ?? payload.etag,
        rows: parsedRows
      });
    }

    return sources;
  }

  private buildPlaceableCandidatesFromTwoDa(
    sources: LoadedPlaceablesTwoDaSource[]
  ): PlaceablesTwoDaRow[] {
    const rows: PlaceablesTwoDaRow[] = [];
    const seenModelResrefs = new Set<string>();

    for (const source of sources) {
      for (const row of source.rows) {
        if (seenModelResrefs.has(row.modelResRef)) {
          continue;
        }
        seenModelResrefs.add(row.modelResRef);
        rows.push({
          ...row,
          sourceKey: source.key,
          sourceSize: source.sourceSize,
          updatedAt: source.updatedAt,
          sourceEtag: source.sourceEtag,
          sourceFingerprint: buildSourceFingerprint([
            "2da",
            "placeable",
            row.modelResRef,
            source.key,
            String(row.rowId),
            row.label ?? "",
            source.sourceEtag ?? ""
          ])
        });
      }
    }

    return rows;
  }

  private buildPlaceableAppearanceModelLookup(
    sources: LoadedPlaceablesTwoDaSource[]
  ): Map<number, PlaceableAppearanceModelLookupEntry> {
    const lookup = new Map<number, PlaceableAppearanceModelLookupEntry>();
    for (const source of sources) {
      const sourceRowById = new Map(source.rows.map((row) => [row.rowId, row]));
      for (const row of source.rows) {
        const modelResRef = normalizeRenderablePlaceableModelRef(row.modelResRef);
        if (!modelResRef) {
          continue;
        }
        if (!lookup.has(row.rowId)) {
          lookup.set(row.rowId, {
            modelResRef,
            rowId: row.rowId,
            sourceKey: source.key,
            resolutionPath: "direct"
          });
        }

        const aliasRowId = row.rowId + PLACEABLES_TWO_DA_NWIC_USER_ROW_OFFSET;
        const aliasRow = sourceRowById.get(aliasRowId);
        if (
          aliasRow &&
          !lookup.has(aliasRowId) &&
          isNwicPlaceablesTwoDaUserRowAlias(row, aliasRow)
        ) {
          lookup.set(aliasRowId, {
            modelResRef,
            rowId: row.rowId,
            requestedRowId: aliasRowId,
            sourceKey: source.key,
            resolutionPath: "nwic-user-row-minus-100"
          });
        }
      }
    }

    return lookup;
  }

  private async buildDoorTwoDaLookup(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[]
  ): Promise<DoorTwoDaLookup> {
    const doortypesRows = await this.buildDoorTwoDaRows(settings, objects, "doortypes.2da");
    const genericdoorsRows = await this.buildDoorTwoDaRows(settings, objects, "genericdoors.2da");

    return {
      doortypesByRowId: indexDoorTwoDaRowsById(doortypesRows),
      genericdoorsByRowId: indexDoorTwoDaRowsById(genericdoorsRows),
      doortypesSourceKey: doortypesRows[0]?.sourceKey,
      genericdoorsSourceKey: genericdoorsRows[0]?.sourceKey
    };
  }

  private async buildDoorTwoDaRows(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[],
    tableName: DoorTwoDaTableName
  ): Promise<DoorTwoDaRow[]> {
    const rows: DoorTwoDaRow[] = [];
    const seenRowIds = new Set<number>();
    const keys = collectTwoDaKeys(objects, tableName);
    if (keys.length === 0) {
      return rows;
    }

    const objectsByKey = new Map(objects.map((object) => [object.key, object]));
    for (const key of keys) {
      let payload;
      try {
        payload = await this.moduleBlobStorage.getModuleObject(settings, key);
      } catch {
        continue;
      }
      if (!payload) {
        continue;
      }

      const object = objectsByKey.get(key);
      const parsedRows = parseDoorTwoDaRows(payload.bytes, tableName, {
        sourceKey: key,
        sourceEtag: object?.etag ?? payload.etag
      });
      for (const row of parsedRows) {
        if (seenRowIds.has(row.rowId)) {
          continue;
        }
        seenRowIds.add(row.rowId);
        rows.push({
          ...row,
          sourceKey: key,
          sourceSize: object?.size ?? payload.size,
          updatedAt:
            object?.lastModified ?? payload.lastModified ?? new Date(0).toISOString(),
          sourceEtag: object?.etag ?? payload.etag,
          sourceFingerprint: buildSourceFingerprint([
            "2da",
            "door",
            tableName,
            key,
            String(row.rowId),
            row.label ?? "",
            row.modelResRef ?? "",
            object?.etag ?? payload.etag ?? ""
          ])
        });
      }
    }

    return rows;
  }
}

function mapCandidateToTemplateRecord(
  candidate: TemplateCandidate,
  benchmarkIds: Record<TemplateKind, Set<string>>,
  placeableAppearanceModelLookup: ReadonlyMap<number, PlaceableAppearanceModelLookupEntry>,
  doorTwoDaLookup: DoorTwoDaLookup
): TemplateRecord {
  const resolvedResref = resolveCandidateResref(candidate);
  const placeableSubtype =
    candidate.kind === "placeable" ? inferPlaceableSubtype(candidate) : undefined;

  const metadata: Record<string, string | number | boolean> = {
    sourceObjectKey: candidate.sourceKey,
    sourceSizeBytes: candidate.sourceSize,
    sourceExtension: candidate.extension,
    sourceFingerprint: candidate.sourceFingerprint
  };

  addOptionalMetadata(metadata, "sourceEtag", candidate.sourceEtag);
  addOptionalMetadata(metadata, "sourceFileType", candidate.parsedBlueprint?.sourceFileType);
  addOptionalMetadata(metadata, "sourceFileVersion", candidate.parsedBlueprint?.sourceFileVersion);
  addOptionalMetadata(
    metadata,
    "sourceStructTypeId",
    candidate.parsedBlueprint?.sourceStructTypeId
  );
  addOptionalMetadata(metadata, "templateResRef", candidate.parsedBlueprint?.templateResRef);
  addOptionalMetadata(metadata, "firstName", candidate.parsedBlueprint?.firstName);
  addOptionalMetadata(metadata, "lastName", candidate.parsedBlueprint?.lastName);
  addOptionalMetadata(metadata, "localizedName", candidate.parsedBlueprint?.localizedName);
  addOptionalMetadata(metadata, "displayName", candidate.parsedBlueprint?.displayName);
  addOptionalMetadata(metadata, "description", candidate.parsedBlueprint?.description);
  addOptionalMetadata(
    metadata,
    "identifiedDescription",
    candidate.parsedBlueprint?.identifiedDescription
  );
  addOptionalMetadata(metadata, "tag", candidate.parsedBlueprint?.tag);
  addOptionalMetadata(metadata, "conversation", candidate.parsedBlueprint?.conversation);
  addOptionalMetadata(metadata, "keyName", candidate.parsedBlueprint?.keyName);
  addOptionalMetadata(metadata, "baseItem", candidate.parsedBlueprint?.baseItem);
  addOptionalMetadata(metadata, "addCost", candidate.parsedBlueprint?.addCost);
  addOptionalMetadata(metadata, "costTable", candidate.parsedBlueprint?.costTable);
  addOptionalMetadata(metadata, "costValue", candidate.parsedBlueprint?.costValue);
  addOptionalMetadata(metadata, "charges", candidate.parsedBlueprint?.charges);
  addOptionalMetadata(metadata, "stackSize", candidate.parsedBlueprint?.stackSize);
  addOptionalMetadata(metadata, "identified", candidate.parsedBlueprint?.identified);
  addOptionalMetadata(metadata, "stolen", candidate.parsedBlueprint?.stolen);
  addOptionalMetadata(metadata, "modelResRef", candidate.parsedBlueprint?.modelResRef);
  addOptionalMetadata(
    metadata,
    "dependencyFingerprint",
    candidate.parsedBlueprint?.dependencyFingerprint
  );
  addOptionalMetadata(
    metadata,
    "dependencyCount",
    candidate.parsedBlueprint?.dependencyRefs.length
  );
  addOptionalMetadata(metadata, "sourceKind", candidate.placeables2daRow ? "2da" : undefined);
  addOptionalMetadata(metadata, "source2da", candidate.placeables2daRow ? "placeables.2da" : undefined);
  addOptionalMetadata(metadata, "source2daRow", candidate.placeables2daRow?.rowId);
  addOptionalMetadata(metadata, "source2daLabel", candidate.placeables2daRow?.label);
  if (isReservedPlaceablesTwoDaPlaceholder(candidate)) {
    addOptionalMetadata(metadata, "nonRenderablePlaceholder", true);
    addOptionalMetadata(metadata, "placeholderKind", "reserved_placeables_2da_row");
    addOptionalMetadata(metadata, "renderAuditEligibility", "non_renderable_placeholder");
    addOptionalMetadata(metadata, "renderAuditExcludeReason", "reserved_placeables_2da_model");
    addOptionalMetadata(metadata, "reservedModelResRef", candidate.placeables2daRow?.modelResRef);
  }
  if (candidate.kind === "placeable") {
    const lookupHints = buildPlaceableLookupHints(
      candidate,
      resolvedResref,
      placeableAppearanceModelLookup
    );
    addOptionalMetadata(metadata, "lookupTemplateResRef", lookupHints.templateResRef);
    addOptionalMetadata(metadata, "lookupModelResRef", lookupHints.modelResRef);
    addOptionalMetadata(metadata, "lookupModelSource2daRow", lookupHints.modelSource2daRow);
    addOptionalMetadata(
      metadata,
      "lookupRequestedAppearanceType",
      lookupHints.requestedAppearanceType
    );
    addOptionalMetadata(metadata, "lookupResolutionPath", lookupHints.resolutionPath);
    addOptionalMetadata(metadata, "lookupDependencyRefs", lookupHints.dependencyRefs);
    addOptionalMetadata(metadata, "lookupDependencyCount", lookupHints.dependencyCount);
  }
  if (candidate.kind === "placeable" && placeableSubtype === "door") {
    const doorLookupHints = buildDoorTwoDaLookupHints(candidate, doorTwoDaLookup);
    addOptionalMetadata(
      metadata,
      "doorLookupPath",
      "templateAppearanceGenericType>doortypes2da>genericdoors2da>modelAsset"
    );
    addOptionalMetadata(metadata, "doorLookupAppearanceId", doorLookupHints.appearanceId);
    addOptionalMetadata(metadata, "doorLookupGenericType", doorLookupHints.genericType);
    addOptionalMetadata(metadata, "doortypes2daAvailable", doorLookupHints.doortypesAvailable);
    addOptionalMetadata(metadata, "genericdoors2daAvailable", doorLookupHints.genericdoorsAvailable);
    addOptionalMetadata(
      metadata,
      "doortypes2daSource",
      doorLookupHints.doortypesSourceKey ? "doortypes.2da" : undefined
    );
    addOptionalMetadata(metadata, "doortypes2daSourceKey", doorLookupHints.doortypesSourceKey);
    addOptionalMetadata(metadata, "doortypes2daRow", doorLookupHints.doortypesRowId);
    addOptionalMetadata(metadata, "doortypes2daLabel", doorLookupHints.doortypesLabel);
    addOptionalMetadata(metadata, "doortypes2daModelResRef", doorLookupHints.doortypesModelResRef);
    addOptionalMetadata(
      metadata,
      "genericdoors2daSource",
      doorLookupHints.genericdoorsSourceKey ? "genericdoors.2da" : undefined
    );
    addOptionalMetadata(metadata, "genericdoors2daSourceKey", doorLookupHints.genericdoorsSourceKey);
    addOptionalMetadata(metadata, "genericdoors2daRow", doorLookupHints.genericdoorsRowId);
    addOptionalMetadata(metadata, "genericdoors2daLabel", doorLookupHints.genericdoorsLabel);
    addOptionalMetadata(
      metadata,
      "genericdoors2daModelResRef",
      doorLookupHints.genericdoorsModelResRef
    );
    addOptionalMetadata(metadata, "doorLookupModelResRef", doorLookupHints.modelResRef);
  }
  addOptionalMetadata(
    metadata,
    "appearanceId",
    candidate.parsedBlueprint?.appearanceId ?? candidate.placeables2daRow?.rowId
  );
  addOptionalMetadata(metadata, "genericType", candidate.parsedBlueprint?.genericType);
  addOptionalMetadata(metadata, "animationState", candidate.parsedBlueprint?.animationState);
  addOptionalMetadata(metadata, "hasInventory", candidate.parsedBlueprint?.hasInventory);
  addOptionalMetadata(metadata, "bodyBag", candidate.parsedBlueprint?.bodyBag);
  addOptionalMetadata(metadata, "useable", candidate.parsedBlueprint?.useable);
  addOptionalMetadata(metadata, "isStatic", candidate.parsedBlueprint?.isStatic);
  addOptionalMetadata(metadata, "autoRemoveKey", candidate.parsedBlueprint?.autoRemoveKey);
  addOptionalMetadata(metadata, "closeLockDc", candidate.parsedBlueprint?.closeLockDc);
  addOptionalMetadata(metadata, "openLockDc", candidate.parsedBlueprint?.openLockDc);
  addOptionalMetadata(metadata, "interruptable", candidate.parsedBlueprint?.interruptable);
  addOptionalMetadata(metadata, "invulnerable", candidate.parsedBlueprint?.invulnerable);
  addOptionalMetadata(metadata, "keyRequired", candidate.parsedBlueprint?.keyRequired);
  addOptionalMetadata(metadata, "lockable", candidate.parsedBlueprint?.lockable);
  addOptionalMetadata(metadata, "locked", candidate.parsedBlueprint?.locked);
  addOptionalMetadata(metadata, "trapDetectable", candidate.parsedBlueprint?.trapDetectable);
  addOptionalMetadata(metadata, "trapDetectDc", candidate.parsedBlueprint?.trapDetectDc);
  addOptionalMetadata(metadata, "trapDisarmable", candidate.parsedBlueprint?.trapDisarmable);
  addOptionalMetadata(metadata, "disarmDc", candidate.parsedBlueprint?.disarmDc);
  addOptionalMetadata(metadata, "trapFlag", candidate.parsedBlueprint?.trapFlag);
  addOptionalMetadata(metadata, "trapOneShot", candidate.parsedBlueprint?.trapOneShot);
  addOptionalMetadata(metadata, "trapType", candidate.parsedBlueprint?.trapType);
  addOptionalMetadata(metadata, "hardness", candidate.parsedBlueprint?.hardness);
  addOptionalMetadata(metadata, "lightState", candidate.parsedBlueprint?.lightState);
  addOptionalMetadata(metadata, "gender", candidate.parsedBlueprint?.gender);
  addOptionalMetadata(metadata, "race", candidate.parsedBlueprint?.race);
  addOptionalMetadata(metadata, "subrace", candidate.parsedBlueprint?.subrace);
  addOptionalMetadata(metadata, "deity", candidate.parsedBlueprint?.deity);
  addOptionalMetadata(metadata, "phenotype", candidate.parsedBlueprint?.phenotype);
  addOptionalMetadata(metadata, "portraitId", candidate.parsedBlueprint?.portraitId);
  addOptionalMetadata(metadata, "portraitResRef", candidate.parsedBlueprint?.portraitResRef);
  addOptionalMetadata(metadata, "soundSetFile", candidate.parsedBlueprint?.soundSetFile);
  addOptionalMetadata(metadata, "appearanceHead", candidate.parsedBlueprint?.appearanceHead);
  addOptionalMetadata(metadata, "bodyPartRFoot", candidate.parsedBlueprint?.bodyPartRFoot);
  addOptionalMetadata(metadata, "bodyPartLFoot", candidate.parsedBlueprint?.bodyPartLFoot);
  addOptionalMetadata(metadata, "bodyPartRShin", candidate.parsedBlueprint?.bodyPartRShin);
  addOptionalMetadata(metadata, "bodyPartLShin", candidate.parsedBlueprint?.bodyPartLShin);
  addOptionalMetadata(metadata, "bodyPartLThigh", candidate.parsedBlueprint?.bodyPartLThigh);
  addOptionalMetadata(metadata, "bodyPartRThigh", candidate.parsedBlueprint?.bodyPartRThigh);
  addOptionalMetadata(metadata, "bodyPartPelvis", candidate.parsedBlueprint?.bodyPartPelvis);
  addOptionalMetadata(metadata, "bodyPartTorso", candidate.parsedBlueprint?.bodyPartTorso);
  addOptionalMetadata(metadata, "bodyPartBelt", candidate.parsedBlueprint?.bodyPartBelt);
  addOptionalMetadata(metadata, "bodyPartNeck", candidate.parsedBlueprint?.bodyPartNeck);
  addOptionalMetadata(metadata, "bodyPartRFArm", candidate.parsedBlueprint?.bodyPartRFArm);
  addOptionalMetadata(metadata, "bodyPartLFArm", candidate.parsedBlueprint?.bodyPartLFArm);
  addOptionalMetadata(metadata, "bodyPartRBicep", candidate.parsedBlueprint?.bodyPartRBicep);
  addOptionalMetadata(metadata, "bodyPartLBicep", candidate.parsedBlueprint?.bodyPartLBicep);
  addOptionalMetadata(metadata, "bodyPartRShoul", candidate.parsedBlueprint?.bodyPartRShoul);
  addOptionalMetadata(metadata, "bodyPartLShoul", candidate.parsedBlueprint?.bodyPartLShoul);
  addOptionalMetadata(metadata, "bodyPartRHand", candidate.parsedBlueprint?.bodyPartRHand);
  addOptionalMetadata(metadata, "bodyPartLHand", candidate.parsedBlueprint?.bodyPartLHand);
  addOptionalMetadata(metadata, "bodyPartRobe", candidate.parsedBlueprint?.bodyPartRobe);
  addOptionalMetadata(metadata, "colorSkin", candidate.parsedBlueprint?.colorSkin);
  addOptionalMetadata(metadata, "colorHair", candidate.parsedBlueprint?.colorHair);
  addOptionalMetadata(metadata, "colorTattoo1", candidate.parsedBlueprint?.colorTattoo1);
  addOptionalMetadata(metadata, "colorTattoo2", candidate.parsedBlueprint?.colorTattoo2);
  addOptionalMetadata(metadata, "wingsNew", candidate.parsedBlueprint?.wingsNew);
  addOptionalMetadata(metadata, "tailNew", candidate.parsedBlueprint?.tailNew);
  addOptionalMetadata(metadata, "factionId", candidate.parsedBlueprint?.factionId);
  addOptionalMetadata(
    metadata,
    "challengeRating",
    candidate.parsedBlueprint?.challengeRating
  );
  addOptionalMetadata(metadata, "crAdjust", candidate.parsedBlueprint?.crAdjust);
  addOptionalMetadata(
    metadata,
    "perceptionRange",
    candidate.parsedBlueprint?.perceptionRange
  );
  addOptionalMetadata(metadata, "naturalAc", candidate.parsedBlueprint?.naturalAc);
  addOptionalMetadata(metadata, "hitPoints", candidate.parsedBlueprint?.hitPoints);
  addOptionalMetadata(
    metadata,
    "currentHitPoints",
    candidate.parsedBlueprint?.currentHitPoints
  );
  addOptionalMetadata(metadata, "maxHitPoints", candidate.parsedBlueprint?.maxHitPoints);
  addOptionalMetadata(metadata, "reflexBonus", candidate.parsedBlueprint?.reflexBonus);
  addOptionalMetadata(metadata, "willBonus", candidate.parsedBlueprint?.willBonus);
  addOptionalMetadata(
    metadata,
    "fortitudeBonus",
    candidate.parsedBlueprint?.fortitudeBonus
  );
  addOptionalMetadata(metadata, "goodEvil", candidate.parsedBlueprint?.goodEvil);
  addOptionalMetadata(
    metadata,
    "lawfulChaotic",
    candidate.parsedBlueprint?.lawfulChaotic
  );
  addOptionalMetadata(metadata, "classListCount", candidate.parsedBlueprint?.classListCount);
  addOptionalMetadata(metadata, "skillListCount", candidate.parsedBlueprint?.skillListCount);
  addOptionalMetadata(metadata, "featListCount", candidate.parsedBlueprint?.featListCount);
  addOptionalMetadata(
    metadata,
    "templateListCount",
    candidate.parsedBlueprint?.templateListCount
  );
  addOptionalMetadata(
    metadata,
    "specAbilityListCount",
    candidate.parsedBlueprint?.specAbilityListCount
  );
  addOptionalMetadata(
    metadata,
    "equipItemListCount",
    candidate.parsedBlueprint?.equipItemListCount
  );
  if (candidate.parsedBlueprint) {
    addOptionalMetadata(
      metadata,
      "scriptCount",
      Object.keys(candidate.parsedBlueprint.scripts).length
    );
  }

  for (const [label, scriptResref] of Object.entries(candidate.parsedBlueprint?.scripts ?? {})) {
    addOptionalMetadata(metadata, `script.${label}`, scriptResref);
  }

  return {
    templateId: buildTemplateId(candidate.kind, resolvedResref),
    kind: candidate.kind,
    placeableSubtype,
    benchmarkCandidate: benchmarkIds[candidate.kind].has(candidate.resref),
    benchmarkBucket: benchmarkIds[candidate.kind].has(candidate.resref)
      ? buildBenchmarkBucket(candidate.kind, placeableSubtype)
      : undefined,
    resref: resolvedResref,
    name: resolveTemplateName(candidate, resolvedResref),
    category: inferCategory(candidate, placeableSubtype),
    tags: buildTags(candidate, placeableSubtype),
    previewImageUrl: `/assets/previews/${candidate.kind}s/${resolvedResref}.webp`,
    metadata
  };
}

function resolveCandidateResref(candidate: TemplateCandidate): string {
  const parsedResref = candidate.parsedBlueprint?.templateResRef;
  if (!parsedResref || parsedResref.trim().length === 0) {
    return candidate.resref;
  }
  return normalizeResref(parsedResref);
}

function buildPlaceableLookupHints(
  candidate: TemplateCandidate,
  fallbackTemplateResref: string,
  placeableAppearanceModelLookup: ReadonlyMap<number, PlaceableAppearanceModelLookupEntry>
): {
  templateResRef?: string;
  modelResRef?: string;
  modelSource2daRow?: number;
  requestedAppearanceType?: number;
  resolutionPath?: string;
  dependencyRefs?: string;
  dependencyCount?: number;
} {
  const templateResRef = normalizeLookupRef(
    candidate.parsedBlueprint?.templateResRef ?? fallbackTemplateResref
  );
  const directModelResRef =
    normalizeLookupRef(candidate.parsedBlueprint?.modelResRef) ??
    normalizeLookupRef(candidate.placeables2daRow?.modelResRef);
  const appearanceId = candidate.parsedBlueprint?.appearanceId ?? candidate.placeables2daRow?.rowId;
  const lookupModelResRef =
    !directModelResRef && Number.isInteger(appearanceId ?? Number.NaN) && appearanceId !== undefined
      ? placeableAppearanceModelLookup.get(appearanceId)
      : undefined;
  const modelResRef = directModelResRef ?? lookupModelResRef?.modelResRef;
  const dependencyRefs = dedupeNormalizedLookupRefs([
    ...(candidate.parsedBlueprint?.dependencyRefs ?? []),
    candidate.parsedBlueprint?.templateResRef ?? fallbackTemplateResref,
    modelResRef
  ]);

  return {
    templateResRef,
    modelResRef,
    modelSource2daRow: lookupModelResRef?.rowId,
    requestedAppearanceType: lookupModelResRef?.requestedRowId,
    resolutionPath: lookupModelResRef?.resolutionPath,
    dependencyRefs: dependencyRefs.length > 0 ? dependencyRefs.join("|") : undefined,
    dependencyCount: dependencyRefs.length > 0 ? dependencyRefs.length : undefined
  };
}

function buildDoorTwoDaLookupHints(
  candidate: TemplateCandidate,
  lookup: DoorTwoDaLookup
): DoorTwoDaLookupHints {
  const appearanceId = candidate.parsedBlueprint?.appearanceId;
  const genericType = candidate.parsedBlueprint?.genericType;
  const doortypesRow =
    Number.isInteger(appearanceId ?? Number.NaN) && appearanceId !== undefined
      ? lookup.doortypesByRowId.get(appearanceId)
      : undefined;
  const genericdoorsRow =
    Number.isInteger(genericType ?? Number.NaN) && genericType !== undefined
      ? lookup.genericdoorsByRowId.get(genericType)
      : undefined;

  return {
    appearanceId,
    genericType,
    doortypesSourceKey: doortypesRow?.sourceKey ?? lookup.doortypesSourceKey,
    doortypesRowId: doortypesRow?.rowId,
    doortypesLabel: doortypesRow?.label,
    doortypesModelResRef: doortypesRow?.modelResRef,
    genericdoorsSourceKey: genericdoorsRow?.sourceKey ?? lookup.genericdoorsSourceKey,
    genericdoorsRowId: genericdoorsRow?.rowId,
    genericdoorsLabel: genericdoorsRow?.label,
    genericdoorsModelResRef: genericdoorsRow?.modelResRef,
    modelResRef: genericdoorsRow?.modelResRef ?? doortypesRow?.modelResRef,
    doortypesAvailable: lookup.doortypesByRowId.size > 0,
    genericdoorsAvailable: lookup.genericdoorsByRowId.size > 0
  };
}

function resolveTemplateName(candidate: TemplateCandidate, fallbackResref: string): string {
  const fromBlueprint = candidate.parsedBlueprint?.displayName;
  if (fromBlueprint && fromBlueprint.trim().length > 0) {
    return fromBlueprint.trim();
  }
  const fromTwoDa = candidate.placeables2daRow?.label;
  if (fromTwoDa && fromTwoDa.trim().length > 0) {
    return fromTwoDa.trim();
  }
  return humanizeName(fallbackResref);
}

function pickBenchmarkTemplateIds(
  candidates: TemplateCandidate[],
  kind: TemplateKind
): Set<string> {
  const filtered = candidates
    .filter((candidate) => candidate.kind === kind)
    .sort((left, right) => right.sourceSize - left.sourceSize);
  const count =
    filtered.length === 0 ? 0 : Math.min(10, Math.max(1, Math.ceil(filtered.length * 0.2)));
  return new Set(filtered.slice(0, count).map((candidate) => candidate.resref));
}

function classifyTemplateKind(extension: string): TemplateKind {
  if (extension === "utc") {
    return "creature";
  }
  if (extension === "uti") {
    return "item";
  }
  return "placeable";
}

function inferPlaceableSubtype(candidate: TemplateCandidate): PlaceableSubtype {
  if (candidate.extension === "utd") {
    return "door";
  }

  const blueprint = candidate.parsedBlueprint;
  const searchable = [
    candidate.resref,
    extractFileName(candidate.sourceKey),
    candidate.placeables2daRow?.label,
    blueprint?.tag,
    blueprint?.templateResRef,
    blueprint?.modelResRef,
    blueprint?.displayName,
    blueprint?.localizedName,
    blueprint?.description,
    ...(blueprint?.dependencyRefs ?? [])
  ]
    .filter((value): value is string => Boolean(value && value.length > 0))
    .join("|")
    .toLowerCase();

  if (DOOR_PATTERN.test(searchable)) {
    return "door";
  }
  if ((blueprint?.vfxEvidence.length ?? 0) > 0 || VFX_PATTERN.test(searchable)) {
    return "vfx";
  }
  if (blueprint?.bodyBag || REMAINS_PATTERN.test(searchable)) {
    return "generic";
  }
  if (blueprint?.hasInventory || CONTAINER_PATTERN.test(searchable)) {
    return "container";
  }
  if ((blueprint?.lightState ?? 0) > 0 || LIGHT_PATTERN.test(searchable)) {
    return "light_source";
  }
  if (isTriggerProxyBlueprint(blueprint) || TRIGGER_PATTERN.test(searchable)) {
    return "trigger_proxy";
  }
  return "generic";
}

function isReservedPlaceablesTwoDaPlaceholder(candidate: TemplateCandidate): boolean {
  if (candidate.kind !== "placeable" || !candidate.placeables2daRow) {
    return false;
  }
  const modelResRef = candidate.placeables2daRow.modelResRef.trim().toLowerCase();
  return isNonRenderablePlaceablesTwoDaModelResRef(modelResRef);
}

function isTriggerProxyBlueprint(blueprint?: ParsedTemplateBlueprint): boolean {
  if (!blueprint) {
    return false;
  }
  const labels = Object.keys(blueprint.scripts);
  return labels.some((label) => TRIGGER_PATTERN.test(label));
}

function inferCategory(
  candidate: TemplateCandidate,
  placeableSubtype: PlaceableSubtype | undefined
): string {
  if (candidate.kind === "placeable") {
    if (placeableSubtype === "door") {
      return "door";
    }
    if (placeableSubtype === "vfx") {
      return "effects";
    }
  }

  const normalized = candidate.sourceKey.toLowerCase();
  if (candidate.kind === "creature") {
    if (normalized.includes("undead")) {
      return "undead";
    }
    if (normalized.includes("beast") || normalized.includes("animal")) {
      return "beast";
    }
    return "creature";
  }
  if (candidate.kind === "item") {
    if (normalized.includes("weapon")) {
      return "weapon";
    }
    if (normalized.includes("armor")) {
      return "armor";
    }
    return "item";
  }

  if (normalized.includes("urban") || normalized.includes("city")) {
    return "urban";
  }
  if (normalized.includes("dungeon")) {
    return "dungeon";
  }
  if (normalized.includes("forest")) {
    return "forest";
  }
  return "placeable";
}

function buildTags(
  candidate: TemplateCandidate,
  subtype: PlaceableSubtype | undefined
): string[] {
  const tags = new Set<string>();
  tags.add(candidate.kind);
  tags.add(candidate.extension);
  if (subtype) {
    tags.add(subtype);
  }

  for (const segment of candidate.sourceKey.replace(/\\/gu, "/").toLowerCase().split("/")) {
    if (segment.length >= 3 && segment.length <= 24 && /^[a-z0-9_-]+$/u.test(segment)) {
      tags.add(segment);
    }
  }

  for (const token of candidate.resref.split(/[_-]+/u)) {
    if (token.length >= 3 && token.length <= 24) {
      tags.add(token);
    }
  }

  for (const token of (candidate.parsedBlueprint?.dependencyRefs ?? []).flatMap((value) =>
    value.toLowerCase().split(/[_-]+/u)
  )) {
    if (token.length >= 3 && token.length <= 24 && /^[a-z0-9]+$/u.test(token)) {
      tags.add(token);
    }
  }

  return [...tags].slice(0, 16);
}

function buildBenchmarkBucket(
  kind: TemplateKind,
  subtype: PlaceableSubtype | undefined
): string {
  if (kind === "placeable") {
    if (subtype === "door") {
      return "door_heavy_candidate";
    }
    if (subtype === "vfx") {
      return "placeable_vfx_candidate";
    }
    return "placeable_heavy_candidate";
  }
  return `${kind}_heavy_candidate`;
}

function buildTemplateId(kind: TemplateKind, resref: string): string {
  if (kind === "placeable") {
    return `plc_${resref}`.slice(0, 80);
  }
  if (kind === "creature") {
    return `cre_${resref}`.slice(0, 80);
  }
  return `itm_${resref}`.slice(0, 80);
}

function buildTemplateSearchableText(template: TemplateRecord): string {
  return [template.name, template.templateId, template.resref, ...template.tags]
    .join("|")
    .toLowerCase();
}

function buildTemplateIdIndexKey(kind: TemplateKind, templateId: string): string {
  return `${kind}:${templateId}`;
}

function buildTemplateResrefIndexKey(kind: TemplateKind, resref: string): string {
  return `${kind}:${resref.trim().toLowerCase()}`;
}

function buildPlaceableProcessingIndexKey(templateId: string, subtype: PlaceableSubtype): string {
  return `${templateId}:${subtype}`;
}

function buildTemplateProcessingIndexKey(
  kind: "creature" | "item",
  templateId: string
): string {
  return `${kind}:${templateId}`;
}

function extractFileName(key: string): string {
  const normalized = key.replace(/\\/gu, "/");
  const segments = normalized.split("/");
  return segments[segments.length - 1] ?? normalized;
}

function extractExtension(fileName: string): string {
  const normalized = fileName.trim().toLowerCase();
  const index = normalized.lastIndexOf(".");
  if (index <= 0) {
    return "";
  }
  return normalized.slice(index + 1);
}

function extractBasename(fileName: string): string {
  const normalized = fileName.trim().toLowerCase();
  const index = normalized.lastIndexOf(".");
  if (index <= 0) {
    return normalized;
  }
  return normalized.slice(0, index);
}

function normalizeResref(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/gu, "_").slice(0, 64);
}

function normalizeLookupRef(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = normalizeResref(value);
  if (!normalized || !/[a-z0-9]/u.test(normalized)) {
    return undefined;
  }
  return normalized;
}

function normalizeRenderablePlaceableModelRef(value: string | undefined): string | undefined {
  const normalized = normalizeLookupRef(value);
  if (!normalized || isNonRenderablePlaceablesTwoDaModelResRef(normalized)) {
    return undefined;
  }
  return normalized;
}

function isNonRenderablePlaceablesTwoDaModelResRef(value: string): boolean {
  const normalized = normalizeResref(value);
  return normalized === "user" || normalized === "reserved" || normalized.endsWith("_reserved");
}

function isNwicPlaceablesTwoDaUserRowAlias(
  sourceRow: ParsedPlaceablesTwoDaRow,
  requestedRow: ParsedPlaceablesTwoDaRow
): boolean {
  const requestedModel = normalizeResref(requestedRow.modelResRef);
  if (requestedModel !== "user") {
    return false;
  }

  const sourceModel = normalizeRenderablePlaceableModelRef(sourceRow.modelResRef);
  if (!sourceModel?.startsWith("nwp_")) {
    return false;
  }

  return /^nwic:/iu.test(sourceRow.label?.trim() ?? "");
}

function dedupeNormalizedLookupRefs(values: readonly (string | undefined)[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const normalized = normalizeLookupRef(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    output.push(normalized);
  }

  return output;
}

function collectPlaceables2daKeys(objects: ModuleBlobObjectSummary[]): string[] {
  return collectTwoDaKeys(objects, "placeables.2da");
}

function collectTwoDaKeys(objects: ModuleBlobObjectSummary[], tableFileName: string): string[] {
  const normalizedTableFileName = tableFileName.trim().toLowerCase();
  const keys = objects
    .map((object) => object.key)
    .filter((key) => extractFileName(key).trim().toLowerCase() === normalizedTableFileName);

  keys.sort((left, right) => {
    const sourceDelta = resolveTwoDaSourcePriority(left) - resolveTwoDaSourcePriority(right);
    if (sourceDelta !== 0) {
      return sourceDelta;
    }

    const depthDelta = left.split("/").length - right.split("/").length;
    if (depthDelta !== 0) {
      return depthDelta;
    }

    return left.localeCompare(right);
  });

  return keys;
}

function resolveTwoDaSourcePriority(objectKey: string): number {
  const normalized = objectKey.replace(/\\/gu, "/").toLowerCase();
  if (normalized.includes("/__aurora/sources/hak/")) {
    return 1;
  }
  if (normalized.includes("/__aurora/sources/vanilla/")) {
    return 2;
  }
  if (normalized.includes("/__aurora/sources/")) {
    return 3;
  }
  return 0;
}

function resolveTwoDaSourceLayer(objectKey: string): string {
  const normalized = objectKey.replace(/\\/gu, "/").toLowerCase();
  if (normalized.includes("/__aurora/sources/hak/")) {
    return "hak";
  }
  if (normalized.includes("/__aurora/sources/vanilla/")) {
    return "vanilla";
  }
  if (normalized.includes("/__aurora/sources/")) {
    return "external_fixture";
  }
  return "module";
}

function indexDoorTwoDaRowsById(rows: DoorTwoDaRow[]): Map<number, DoorTwoDaRow> {
  const lookup = new Map<number, DoorTwoDaRow>();
  for (const row of rows) {
    if (!lookup.has(row.rowId)) {
      lookup.set(row.rowId, row);
    }
  }
  return lookup;
}

function parseDoorTwoDaRows(
  bytes: Buffer,
  tableName: DoorTwoDaTableName,
  source: { sourceKey: string; sourceEtag?: string }
): ParsedDoorTwoDaRow[] {
  const table = parseAuroraTwoDaTable(bytes, {
    tableName,
    profile: "aurora-areas",
    sourceObjectKey: source.sourceKey,
    sourceLayer: resolveTwoDaSourceLayer(source.sourceKey),
    sourceHash: source.sourceEtag
  });
  const rows: ParsedDoorTwoDaRow[] = [];
  for (const row of table.rows) {
    const label = readDoorTwoDaCell(row, ["label", "name"]);
    const modelResRef = normalizeLookupRef(
      readDoorTwoDaCell(row, [
        "modelname",
        "modelresref",
        "model",
        "resref",
        "mdl",
        "mdb",
        "mdbresref"
      ])
    );
    rows.push({
      rowId: row.rowId,
      ...(label ? { label } : {}),
      ...(modelResRef ? { modelResRef } : {}),
      sourceTable: tableName
    });
  }
  return rows;
}

function readDoorTwoDaCell(row: AuroraTwoDaRow, columnAliases: string[]): string | undefined {
  const normalizedAliases = new Set(columnAliases.map(normalizeTwoDaColumnName));
  for (const cell of row.cells) {
    if (!normalizedAliases.has(normalizeTwoDaColumnName(cell.column))) {
      continue;
    }
    const value = cell.value.trim();
    if (!value || value === BLANK_CELL || cell.blank || cell.missing) {
      return undefined;
    }
    return value;
  }
  return undefined;
}

function normalizeTwoDaColumnName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "");
}

export function parsePlaceablesTwoDaRows(bytes: Buffer): ParsedPlaceablesTwoDaRow[] {
  const rows: ParsedPlaceablesTwoDaRow[] = [];
  const content = bytes.toString("utf-8").replace(/^\uFEFF/u, "");
  const lines = content.split(/\r?\n/gu);
  const significantLines = lines
    .map((line) => stripTwoDaComment(line))
    .map((line) => ({ raw: line, text: line.trim() }))
    .filter((line) => line.text.length > 0);
  if (significantLines.length === 0) {
    return rows;
  }

  if (!/^2da\b/iu.test(significantLines[0].text)) {
    return rows;
  }

  let headerLineIndex = -1;
  let modelColumnIndex = -1;
  let labelColumnIndex = -1;
  let strRefColumnIndex = -1;
  let headerTokens: string[] = [];
  for (let index = 1; index < significantLines.length; index += 1) {
    const tokens = tokenizeTwoDaLine(significantLines[index].text);
    if (tokens.length === 0) {
      continue;
    }

    const foundModelColumnIndex = tokens.findIndex(
      (token) => token.trim().toLowerCase() === "modelname"
    );
    if (foundModelColumnIndex >= 0) {
      headerLineIndex = index;
      modelColumnIndex = foundModelColumnIndex;
      labelColumnIndex = tokens.findIndex((token) => token.trim().toLowerCase() === "label");
      strRefColumnIndex = tokens.findIndex((token) => token.trim().toLowerCase() === "strref");
      headerTokens = tokens;
      break;
    }
  }

  if (headerLineIndex < 0 || modelColumnIndex < 0) {
    return rows;
  }

  for (let index = headerLineIndex + 1; index < significantLines.length; index += 1) {
    const line = significantLines[index];
    const tokens = tokenizeTwoDaLine(line.text);
    if (tokens.length < 2) {
      continue;
    }

    const rowId = Number.parseInt(tokens[0], 10);
    if (!Number.isInteger(rowId) || rowId < 0) {
      continue;
    }

    const rowValues = tokens.slice(1);
    const resolvedRow = resolvePlaceablesTwoDaRowValues({
      rowValues,
      headerTokens,
      labelColumnIndex,
      modelColumnIndex,
      strRefColumnIndex
    });
    const rawModelResRef = resolvedRow.modelResRef;
    const normalizedModelResRef = normalizeLookupRef(rawModelResRef);
    if (!normalizedModelResRef) {
      continue;
    }

    const rawLabel = resolvedRow.label;
    const label = rawLabel && rawLabel !== "****" ? rawLabel.trim() : undefined;
    rows.push({
      rowId,
      ...(label ? { label } : {}),
      modelResRef: normalizedModelResRef
    });
  }

  return rows;
}

function tokenizeTwoDaLine(line: string): string[] {
  const rawTokens = line.match(/"[^"]*"|[^\s]+/gu) ?? [];
  return rawTokens.map((token) => {
    const trimmed = token.trim();
    if (trimmed.startsWith("\"") && trimmed.endsWith("\"") && trimmed.length >= 2) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  });
}

function resolvePlaceablesTwoDaRowValues(input: {
  rowValues: string[];
  headerTokens: string[];
  labelColumnIndex: number;
  modelColumnIndex: number;
  strRefColumnIndex: number;
}): { label?: string; modelResRef?: string } {
  const directLabel =
    input.labelColumnIndex >= 0 ? input.rowValues[input.labelColumnIndex] : undefined;
  const directModelResRef = input.rowValues[input.modelColumnIndex];
  if (input.rowValues.length <= input.headerTokens.length) {
    return {
      label: directLabel,
      modelResRef: directModelResRef
    };
  }

  const strRefTokenIndex = findPlaceablesStrRefTokenIndex(input);
  if (strRefTokenIndex >= 0) {
    return {
      label:
        input.labelColumnIndex >= 0
          ? input.rowValues.slice(input.labelColumnIndex, strRefTokenIndex).join(" ").trim()
          : directLabel,
      modelResRef: input.rowValues[strRefTokenIndex + 1]
    };
  }

  if (input.labelColumnIndex >= 0 && input.modelColumnIndex > input.labelColumnIndex) {
    const nonLabelColumnCount = Math.max(0, input.headerTokens.length - 1);
    const labelTokenCount = Math.max(1, input.rowValues.length - nonLabelColumnCount);
    const modelTokenIndex = input.modelColumnIndex + labelTokenCount - 1;
    return {
      label: input.rowValues
        .slice(input.labelColumnIndex, input.labelColumnIndex + labelTokenCount)
        .join(" ")
        .trim(),
      modelResRef: input.rowValues[modelTokenIndex]
    };
  }

  return {
    label: directLabel,
    modelResRef: directModelResRef
  };
}

function findPlaceablesStrRefTokenIndex(input: {
  rowValues: string[];
  labelColumnIndex: number;
  modelColumnIndex: number;
  strRefColumnIndex: number;
}): number {
  if (
    input.strRefColumnIndex < 0 ||
    input.strRefColumnIndex >= input.modelColumnIndex ||
    input.labelColumnIndex < 0
  ) {
    return -1;
  }

  for (
    let index = input.labelColumnIndex + 1;
    index < input.rowValues.length - 1;
    index += 1
  ) {
    const value = input.rowValues[index];
    const nextValue = input.rowValues[index + 1];
    const strRefLike = value === "****" || /^\d+$/u.test(value);
    if (strRefLike && normalizeLookupRef(nextValue)) {
      return index;
    }
  }
  return -1;
}

function stripTwoDaComment(line: string): string {
  const commentStart = line.indexOf("//");
  if (commentStart < 0) {
    return line;
  }
  return line.slice(0, commentStart);
}

function humanizeName(resref: string): string {
  return resref
    .split(/[_-]+/u)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizePrefixForLookup(value: string): string {
  const trimmed = value.trim().replace(/^\/+/u, "").replace(/\/+$/u, "");
  if (!trimmed) {
    return "";
  }
  return `${trimmed}/`;
}

function buildSourceFingerprint(parts: readonly string[]): string {
  return createHash("sha256").update(parts.join("|"), "utf-8").digest("hex");
}

function addOptionalMetadata(
  metadata: Record<string, string | number | boolean>,
  key: string,
  value: string | number | boolean | undefined
): void {
  if (value === undefined) {
    return;
  }
  metadata[key] = value;
}

function formatSnapshotIndexError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

async function mapWithConcurrency<T>(
  values: T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<void>
): Promise<void> {
  if (values.length === 0) {
    return;
  }

  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, values.length)) }, () =>
    (async () => {
      while (true) {
        const index = cursor;
        cursor += 1;
        if (index >= values.length) {
          return;
        }
        await mapper(values[index], index);
      }
    })()
  );

  await Promise.all(workers);
}
