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
import type { TemplateCatalogRepositoryPort } from "../../../application/ports/template-catalog-repository.port";
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
import { StaticTemplateCatalogRepository } from "../memory/static-template-catalog.repository";

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
}

const CANDIDATE_EXTENSIONS = new Set(["utp", "utd", "utc", "uti"]);
const DOOR_PATTERN = /(door|gdoor|sdoor|gate)/u;
const VFX_PATTERN = /(vfx|vvx|emit|emitter|particle|fx_)/u;
const LIGHT_PATTERN = /(light|lamp|torch|lantern)/u;
const TRIGGER_PATTERN = /(trigger|trig|trap)/u;
const CONTAINER_PATTERN = /(container|chest|crate|barrel)/u;

@Injectable()
export class ModuleSnapshotTemplateCatalogRepository implements TemplateCatalogRepositoryPort {
  private readonly logger = new Logger(ModuleSnapshotTemplateCatalogRepository.name);
  private readonly fallback = new StaticTemplateCatalogRepository();
  private snapshotIndex: SnapshotIndex | null = null;

  constructor(
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly runtimeSettingsRepository: RuntimeSettingsRepositoryPort,
    @Inject(MODULE_BLOB_STORAGE)
    private readonly moduleBlobStorage: ModuleBlobStoragePort
  ) {}

  async listByKind(kind: TemplateKind, query: TemplateListQuery): Promise<TemplateListResult> {
    const index = await this.getSnapshotIndex();
    if (!index) {
      return this.fallback.listByKind(kind, query);
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
      return this.fallback.findByKindAndId(kind, templateId);
    }
    return index.byKindAndId.get(buildTemplateIdIndexKey(kind, templateId)) ?? null;
  }

  async findByKindAndResref(kind: TemplateKind, resref: string): Promise<TemplateRecord | null> {
    const index = await this.getSnapshotIndex();
    if (!index) {
      return this.fallback.findByKindAndResref(kind, resref);
    }
    return index.byKindAndResref.get(buildTemplateResrefIndexKey(kind, resref)) ?? null;
  }

  getPrecomputedPlaceableCacheKey(templateId: string, subtype: PlaceableSubtype): string | null {
    if (!this.snapshotIndex) {
      return this.fallback.getPrecomputedPlaceableCacheKey?.(templateId, subtype) ?? null;
    }
    return (
      this.snapshotIndex.placeableProcessingByIdAndSubtype.get(
        buildPlaceableProcessingIndexKey(templateId, subtype)
      ) ?? null
    );
  }

  getPrecomputedTemplateCacheKey(kind: "creature" | "item", templateId: string): string | null {
    if (!this.snapshotIndex) {
      return this.fallback.getPrecomputedTemplateCacheKey?.(kind, templateId) ?? null;
    }
    return (
      this.snapshotIndex.templateProcessingByKindAndId.get(
        buildTemplateProcessingIndexKey(kind, templateId)
      ) ?? null
    );
  }

  private async getSnapshotIndex(): Promise<SnapshotIndex | null> {
    const now = Date.now();
    if (this.snapshotIndex && now - this.snapshotIndex.fetchedAtMs < 30_000) {
      return this.snapshotIndex;
    }

    const settings = await this.runtimeSettingsRepository.get();
    const snapshot = await this.listAllModuleSnapshotObjects(settings.blobStorage);
    const candidates = await this.buildTemplateCandidatesFromSnapshot(
      settings.blobStorage,
      snapshot.objects
    );

    if (candidates.length === 0) {
      this.logger.warn(
        "No template files detected in module snapshot (expected: utp/utd/utc/uti). Falling back to static repository."
      );
      this.snapshotIndex = null;
      return null;
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
        })
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
      fetchedAtMs: now,
      cacheKey,
      byKind,
      byKindAndId,
      byKindAndResref,
      placeableProcessingByIdAndSubtype,
      templateProcessingByKindAndId
    };

    return this.snapshotIndex;
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
    objects: ModuleBlobObjectSummary[]
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
          dependencyFingerprint
        ]);
      } catch {
        // Keep candidate heuristics path if object payload is unavailable.
      }
    });

    return candidates;
  }
}

function mapCandidateToTemplateRecord(
  candidate: TemplateCandidate,
  benchmarkIds: Record<TemplateKind, Set<string>>
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
  addOptionalMetadata(metadata, "displayName", candidate.parsedBlueprint?.displayName);
  addOptionalMetadata(metadata, "description", candidate.parsedBlueprint?.description);
  addOptionalMetadata(metadata, "tag", candidate.parsedBlueprint?.tag);
  addOptionalMetadata(metadata, "conversation", candidate.parsedBlueprint?.conversation);
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
  addOptionalMetadata(metadata, "appearanceId", candidate.parsedBlueprint?.appearanceId);
  addOptionalMetadata(metadata, "hasInventory", candidate.parsedBlueprint?.hasInventory);
  addOptionalMetadata(metadata, "useable", candidate.parsedBlueprint?.useable);
  addOptionalMetadata(metadata, "isStatic", candidate.parsedBlueprint?.isStatic);
  addOptionalMetadata(metadata, "lightState", candidate.parsedBlueprint?.lightState);
  addOptionalMetadata(metadata, "gender", candidate.parsedBlueprint?.gender);
  addOptionalMetadata(metadata, "race", candidate.parsedBlueprint?.race);
  addOptionalMetadata(metadata, "subrace", candidate.parsedBlueprint?.subrace);
  addOptionalMetadata(metadata, "deity", candidate.parsedBlueprint?.deity);
  addOptionalMetadata(metadata, "phenotype", candidate.parsedBlueprint?.phenotype);
  addOptionalMetadata(metadata, "portraitId", candidate.parsedBlueprint?.portraitId);
  addOptionalMetadata(metadata, "portraitResRef", candidate.parsedBlueprint?.portraitResRef);
  addOptionalMetadata(metadata, "soundSetFile", candidate.parsedBlueprint?.soundSetFile);
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

function resolveTemplateName(candidate: TemplateCandidate, fallbackResref: string): string {
  const fromBlueprint = candidate.parsedBlueprint?.displayName;
  if (fromBlueprint && fromBlueprint.trim().length > 0) {
    return fromBlueprint.trim();
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
    candidate.sourceKey,
    blueprint?.tag,
    blueprint?.templateResRef,
    blueprint?.modelResRef,
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
