import { Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { AppException } from "../../../common/http/app-exception";
import {
  PLACEABLE_PROCESSING_CACHE,
  type PlaceableProcessingCachePort,
  type PlaceableProcessingResult
} from "./ports/placeable-processing-cache.port";
import {
  TEMPLATE_CATALOG_REPOSITORY,
  type TemplateCatalogRepositoryPort
} from "./ports/template-catalog-repository.port";
import type {
  BenchmarkDurationSummary,
  PlaceableBenchmarkResult,
  PlaceableBenchmarkRunQuery,
  PlaceableProcessQuery,
  PlaceableRenderContract,
  PlaceableSubtype,
  TemplateProcessQuery,
  TemplateProcessingResult,
  TemplateKind,
  TemplateRenderContract,
  TemplateListQuery
} from "../domain/template.types";

@Injectable()
export class CatalogApplicationService {
  constructor(
    @Inject(TEMPLATE_CATALOG_REPOSITORY)
    private readonly repository: TemplateCatalogRepositoryPort,
    @Inject(PLACEABLE_PROCESSING_CACHE)
    private readonly placeableCache: PlaceableProcessingCachePort
  ) {}

  listPlaceables(query: TemplateListQuery) {
    return this.repository.listByKind("placeable", query);
  }

  listCreatures(query: TemplateListQuery) {
    return this.repository.listByKind("creature", query);
  }

  listItems(query: TemplateListQuery) {
    return this.repository.listByKind("item", query);
  }

  async getPlaceablePreview(templateId: string) {
    return this.getPreviewByKind("placeable", templateId);
  }

  async getCreaturePreview(templateId: string) {
    return this.getPreviewByKind("creature", templateId);
  }

  async getItemPreview(templateId: string) {
    return this.getPreviewByKind("item", templateId);
  }

  async processPlaceable(query: PlaceableProcessQuery) {
    const template = await this.resolvePlaceableTemplate(query);
    const classification = resolvePlaceableClassification(
      template.placeableSubtype,
      query.subtypeHint
    );
    const cacheKey = buildPlaceableCacheKey(template.templateId, template.resref, classification);

    if (!query.bypassCache) {
      const cached = await this.placeableCache.get<PlaceableProcessingResult>(cacheKey);
      if (cached) {
        return {
          cache: {
            key: cacheKey,
            hit: true,
            storedAt: cached.storedAt,
            hits: cached.hits
          },
          placeable: maybeStripBenchmarkMetadata(cached.value, query.includeBenchmarkMetadata)
        };
      }
    }

    const processed: PlaceableProcessingResult = {
      templateId: template.templateId,
      resref: template.resref,
      name: template.name,
      category: template.category,
      placeableSubtype: classification.normalizedSubtype,
      render: buildRenderContract(classification.normalizedSubtype),
      benchmarkCandidate: template.benchmarkCandidate ?? false,
      benchmarkBucket: template.benchmarkBucket,
      metadata: template.metadata,
      classification,
      processedAt: new Date().toISOString()
    };

    const stored = await this.placeableCache.set<PlaceableProcessingResult>(cacheKey, processed);
    return {
      cache: {
        key: cacheKey,
        hit: false,
        storedAt: stored.storedAt,
        hits: stored.hits
      },
      placeable: maybeStripBenchmarkMetadata(processed, query.includeBenchmarkMetadata)
    };
  }

  async getProcessedPlaceable(cacheKey: string) {
    const cached = await this.placeableCache.get<PlaceableProcessingResult>(cacheKey);
    if (!cached) {
      throw new AppException({
        status: 404,
        code: "PLACEABLE_CACHE_NOT_FOUND",
        message: "Placeable cache entry was not found."
      });
    }

    return {
      cache: {
        key: cacheKey,
        hit: true,
        storedAt: cached.storedAt,
        hits: cached.hits
      },
      placeable: cached.value
    };
  }

  async processCreature(query: TemplateProcessQuery) {
    const data = await this.processTemplateByKind("creature", query);
    return {
      cache: data.cache,
      creature: data.value
    };
  }

  async getProcessedCreature(cacheKey: string) {
    const data = await this.getProcessedTemplateByKind("creature", cacheKey);
    return {
      cache: data.cache,
      creature: data.value
    };
  }

  async processItem(query: TemplateProcessQuery) {
    const data = await this.processTemplateByKind("item", query);
    return {
      cache: data.cache,
      item: data.value
    };
  }

  async getProcessedItem(cacheKey: string) {
    const data = await this.getProcessedTemplateByKind("item", cacheKey);
    return {
      cache: data.cache,
      item: data.value
    };
  }

  async benchmarkPlaceables(
    query: PlaceableBenchmarkRunQuery
  ): Promise<PlaceableBenchmarkResult> {
    const candidates = await this.resolveBenchmarkCandidates(query.templateIds);
    const perCandidate: Array<{
      templateId: string;
      resref: string;
      placeableSubtype: PlaceableSubtype;
      metrics: BenchmarkDurationSummary;
    }> = [];
    const allDurations: number[] = [];
    const startedAt = new Date().toISOString();

    for (const candidate of candidates) {
      for (let warmup = 0; warmup < query.warmupIterations; warmup += 1) {
        await this.processPlaceable({
          templateId: candidate.templateId,
          subtypeHint: candidate.placeableSubtype,
          bypassCache: true,
          includeBenchmarkMetadata: true
        });
      }

      const durations: number[] = [];
      for (let iteration = 0; iteration < query.iterations; iteration += 1) {
        const started = process.hrtime.bigint();
        await this.processPlaceable({
          templateId: candidate.templateId,
          subtypeHint: candidate.placeableSubtype,
          bypassCache: query.bypassCache,
          includeBenchmarkMetadata: true
        });
        const ended = process.hrtime.bigint();
        const elapsedMs = Number(ended - started) / 1_000_000;
        durations.push(elapsedMs);
        allDurations.push(elapsedMs);
      }

      const candidateSubtype = candidate.placeableSubtype ?? "generic";
      perCandidate.push({
        templateId: candidate.templateId,
        resref: candidate.resref,
        placeableSubtype: candidateSubtype,
        metrics: summarizeDurations(durations)
      });
    }

    const finishedAt = new Date().toISOString();
    return {
      datasetFingerprint: buildBenchmarkFingerprint(candidates, query),
      config: {
        iterations: query.iterations,
        warmupIterations: query.warmupIterations,
        bypassCache: query.bypassCache,
        candidates: candidates.length
      },
      timing: {
        startedAt,
        finishedAt
      },
      metrics: {
        overall: summarizeDurations(allDurations),
        perCandidate
      }
    };
  }

  private async getPreviewByKind(kind: TemplateKind, templateId: string) {
    const template = await this.repository.findByKindAndId(kind, templateId);
    if (!template) {
      throw new AppException({
        status: 404,
        code: "TEMPLATE_NOT_FOUND",
        message: `${kind} template was not found.`
      });
    }

    return {
      templateId: template.templateId,
      kind: template.kind,
      placeableSubtype: template.placeableSubtype,
      benchmarkCandidate: template.benchmarkCandidate ?? false,
      benchmarkBucket: template.benchmarkBucket,
      resref: template.resref,
      name: template.name,
      category: template.category,
      previewImageUrl: template.previewImageUrl,
      metadata: template.metadata
    };
  }

  private async resolvePlaceableTemplate(query: PlaceableProcessQuery) {
    if (query.templateId) {
      const byId = await this.repository.findByKindAndId("placeable", query.templateId);
      if (byId) {
        return byId;
      }
    }

    if (query.resref) {
      const byResref = await this.repository.findByKindAndResref("placeable", query.resref);
      if (byResref) {
        return byResref;
      }
    }

    throw new AppException({
      status: 404,
      code: "TEMPLATE_NOT_FOUND",
      message: "placeable template was not found."
    });
  }

  private async resolveBenchmarkCandidates(templateIds?: string[]) {
    if (templateIds && templateIds.length > 0) {
      const resolved = await Promise.all(
        templateIds.map((templateId) =>
          this.repository.findByKindAndId("placeable", templateId)
        )
      );
      const candidates = resolved.filter((value): value is NonNullable<typeof value> =>
        Boolean(value)
      );
      if (candidates.length !== templateIds.length) {
        throw new AppException({
          status: 422,
          code: "VALIDATION_FAILED",
          message:
            "Benchmark payload references unknown placeable template ids."
        });
      }
      return candidates;
    }

    const benchmarkList = await this.repository.listByKind("placeable", {
      benchmark: true,
      limit: 200,
      offset: 0
    });

    if (benchmarkList.items.length === 0) {
      throw new AppException({
        status: 422,
        code: "VALIDATION_FAILED",
        message: "No benchmark placeables are configured."
      });
    }

    return benchmarkList.items;
  }

  private async processTemplateByKind(
    kind: "creature" | "item",
    query: TemplateProcessQuery
  ): Promise<{
    cache: {
      key: string;
      hit: boolean;
      storedAt: string;
      hits: number;
    };
    value: TemplateProcessingResult;
  }> {
    const template = await this.resolveTemplateByKind(kind, query);
    const cacheKey = buildTemplateCacheKey(kind, template.templateId, template.resref);

    if (!query.bypassCache) {
      const cached = await this.placeableCache.get<TemplateProcessingResult>(cacheKey);
      if (cached) {
        return {
          cache: {
            key: cacheKey,
            hit: true,
            storedAt: cached.storedAt,
            hits: cached.hits
          },
          value: maybeStripTemplateBenchmarkMetadata(
            cached.value,
            query.includeBenchmarkMetadata
          )
        };
      }
    }

    const processed: TemplateProcessingResult = {
      templateId: template.templateId,
      kind,
      resref: template.resref,
      name: template.name,
      category: template.category,
      benchmarkCandidate: template.benchmarkCandidate ?? false,
      benchmarkBucket: template.benchmarkBucket,
      metadata: template.metadata,
      render: buildTemplateRenderContract(kind),
      processedAt: new Date().toISOString()
    };

    const stored = await this.placeableCache.set<TemplateProcessingResult>(
      cacheKey,
      processed
    );
    return {
      cache: {
        key: cacheKey,
        hit: false,
        storedAt: stored.storedAt,
        hits: stored.hits
      },
      value: maybeStripTemplateBenchmarkMetadata(
        processed,
        query.includeBenchmarkMetadata
      )
    };
  }

  private async getProcessedTemplateByKind(kind: "creature" | "item", cacheKey: string) {
    const cached = await this.placeableCache.get<TemplateProcessingResult>(cacheKey);
    if (!cached) {
      throw new AppException({
        status: 404,
        code: `${kind.toUpperCase()}_CACHE_NOT_FOUND`,
        message: `${kind} cache entry was not found.`
      });
    }

    return {
      cache: {
        key: cacheKey,
        hit: true,
        storedAt: cached.storedAt,
        hits: cached.hits
      },
      value: cached.value
    };
  }

  private async resolveTemplateByKind(
    kind: "creature" | "item",
    query: TemplateProcessQuery
  ) {
    if (query.templateId) {
      const byId = await this.repository.findByKindAndId(kind, query.templateId);
      if (byId) {
        return byId;
      }
    }

    if (query.resref) {
      const byResref = await this.repository.findByKindAndResref(kind, query.resref);
      if (byResref) {
        return byResref;
      }
    }

    throw new AppException({
      status: 404,
      code: "TEMPLATE_NOT_FOUND",
      message: `${kind} template was not found.`
    });
  }
}

function resolvePlaceableClassification(
  templateSubtype: PlaceableSubtype | undefined,
  hint: string | undefined
) {
  const normalizedHint = normalizePlaceableSubtypeHint(hint);

  if (templateSubtype) {
    return {
      source: "template" as const,
      inputSubtype: hint,
      normalizedSubtype: templateSubtype,
      mismatchWithTemplate: Boolean(normalizedHint && normalizedHint !== templateSubtype)
    };
  }

  return {
    source: "hint" as const,
    inputSubtype: hint,
    normalizedSubtype: normalizedHint ?? "generic",
    mismatchWithTemplate: false
  };
}

function normalizePlaceableSubtypeHint(hint: string | undefined): PlaceableSubtype | null {
  if (!hint) {
    return null;
  }

  const normalized = hint.trim().toLowerCase();
  if (normalized === "vvx" || normalized === "vvxy") {
    return "vfx";
  }

  if (
    normalized === "generic" ||
    normalized === "door" ||
    normalized === "vfx" ||
    normalized === "container" ||
    normalized === "light_source" ||
    normalized === "trigger_proxy"
  ) {
    return normalized;
  }

  return null;
}

function buildPlaceableCacheKey(
  templateId: string,
  resref: string,
  classification: { normalizedSubtype: PlaceableSubtype }
) {
  return createHash("sha256")
    .update(
      `placeable-process/v1|${templateId}|${resref}|${classification.normalizedSubtype}`
    )
    .digest("hex");
}

function buildRenderContract(subtype: PlaceableSubtype): PlaceableRenderContract {
  if (subtype === "door") {
    return {
      backendType: subtype,
      frontendType: "door",
      rendererPreset: "door-standard",
      isDoor: true,
      isVfx: false
    };
  }

  if (subtype === "vfx") {
    return {
      backendType: subtype,
      frontendType: "vfx",
      rendererPreset: "vfx-emitter",
      isDoor: false,
      isVfx: true
    };
  }

  if (subtype === "container") {
    return {
      backendType: subtype,
      frontendType: "placeable",
      rendererPreset: "placeable-container",
      isDoor: false,
      isVfx: false
    };
  }

  if (subtype === "light_source") {
    return {
      backendType: subtype,
      frontendType: "placeable",
      rendererPreset: "placeable-light",
      isDoor: false,
      isVfx: false
    };
  }

  if (subtype === "trigger_proxy") {
    return {
      backendType: subtype,
      frontendType: "placeable",
      rendererPreset: "placeable-trigger-proxy",
      isDoor: false,
      isVfx: false
    };
  }

  return {
    backendType: subtype,
    frontendType: "placeable",
    rendererPreset: "placeable-generic",
    isDoor: false,
    isVfx: false
  };
}

function maybeStripBenchmarkMetadata(
  value: PlaceableProcessingResult,
  includeBenchmarkMetadata: boolean
): PlaceableProcessingResult {
  if (includeBenchmarkMetadata) {
    return value;
  }

  if (typeof value.benchmarkBucket === "undefined") {
    return value;
  }

  return {
    ...value,
    benchmarkBucket: undefined
  };
}

function maybeStripTemplateBenchmarkMetadata(
  value: TemplateProcessingResult,
  includeBenchmarkMetadata: boolean
): TemplateProcessingResult {
  if (includeBenchmarkMetadata) {
    return value;
  }

  if (typeof value.benchmarkBucket === "undefined") {
    return value;
  }

  return {
    ...value,
    benchmarkBucket: undefined
  };
}

function buildTemplateRenderContract(kind: "creature" | "item"): TemplateRenderContract {
  if (kind === "creature") {
    return {
      backendType: "creature",
      frontendType: "creature",
      rendererPreset: "creature-standard"
    };
  }

  return {
    backendType: "item",
    frontendType: "item",
    rendererPreset: "item-standard"
  };
}

function summarizeDurations(values: number[]): BenchmarkDurationSummary {
  if (values.length === 0) {
    return {
      minMs: 0,
      maxMs: 0,
      avgMs: 0,
      p50Ms: 0,
      p95Ms: 0,
      p99Ms: 0
    };
  }

  const sorted = [...values].sort((left, right) => left - right);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  return {
    minMs: roundMetric(sorted[0]),
    maxMs: roundMetric(sorted[sorted.length - 1]),
    avgMs: roundMetric(total / sorted.length),
    p50Ms: roundMetric(percentile(sorted, 0.5)),
    p95Ms: roundMetric(percentile(sorted, 0.95)),
    p99Ms: roundMetric(percentile(sorted, 0.99))
  };
}

function percentile(sorted: number[], ratio: number): number {
  const index = Math.ceil(sorted.length * ratio) - 1;
  return sorted[Math.min(Math.max(index, 0), sorted.length - 1)];
}

function roundMetric(value: number): number {
  return Number(value.toFixed(4));
}

function buildBenchmarkFingerprint(
  candidates: Array<{
    templateId: string;
    resref: string;
    placeableSubtype?: PlaceableSubtype;
  }>,
  query: PlaceableBenchmarkRunQuery
) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        type: "placeable-benchmark/v1",
        iterations: query.iterations,
        warmupIterations: query.warmupIterations,
        bypassCache: query.bypassCache,
        candidates: candidates.map((candidate) => ({
          templateId: candidate.templateId,
          resref: candidate.resref,
          placeableSubtype: candidate.placeableSubtype ?? "generic"
        }))
      })
    )
    .digest("hex");
}

function buildTemplateCacheKey(
  kind: "creature" | "item",
  templateId: string,
  resref: string
) {
  return createHash("sha256")
    .update(`template-process/v1|${kind}|${templateId}|${resref}`)
    .digest("hex");
}
