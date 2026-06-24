import { Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { executeInFlight } from "../../../common/async/in-flight.helpers";
import { AppException } from "../../../common/http/app-exception";
import { MemoryProcessingCacheStore } from "../../../common/processing-cache/memory-processing-cache.store";
import {
  RUNTIME_SETTINGS_REPOSITORY,
  type RuntimeSettingsRepositoryPort
} from "../../runtime-settings/application/ports/runtime-settings-repository.port";
import type { RuntimeSettingsRecord } from "../../runtime-settings/domain/runtime-settings.types";
import type { ProcessingJobOptions } from "../../processing-jobs/domain/processing-job.types";
import {
  buildAuroraVfxOutputCacheKeyFromPolicy,
  buildAuroraVfxOutputCacheKey,
  type AuroraVfxOutputCacheKeyInput
} from "../domain/aurora-vfx-cache-key";
import {
  buildAuroraVfxDependencyGraph,
  type AuroraVfxDependencyGraph,
  type AuroraVfxDependencyResolverTrace
} from "../domain/aurora-vfx-dependency-graph";
import type { AuroraMdlEmitterNode } from "../domain/aurora-mdl-vfx-source.parser";
import {
  buildAuroraVfxRuntimeRenderContract,
  type AuroraVfxRuntimeRenderContract
} from "../domain/aurora-vfx-render-contract";
import {
  buildAuroraEmitterRuntimeSnapshot,
  createAuroraEmitterRuntimeState,
  tickAuroraEmitterRuntime,
  type AuroraEmitterRuntimeState
} from "../domain/aurora-vfx-runtime-state";
import {
  buildAuroraVfxSourcePolicyTrace,
  type AuroraVfxSourcePolicyCandidate,
  type AuroraVfxSourcePolicyTrace
} from "../domain/aurora-vfx-source-policy";
import {
  buildAuroraVfxPhaseSchedule,
  parseAuroraVisualEffectsTwoDa,
  type AuroraVfxDiagnostic,
  type AuroraVisualEffectSourceRow
} from "../domain/aurora-vfx-source.parser";
import type {
  VfxBenchmarkCommand,
  VfxBenchmarkResult,
  VfxBenchmarkStageResult,
  VfxProcessCommand,
  VfxProcessingCacheDescriptor,
  VfxProcessingEnvelope,
  VfxResourceTraceInput,
  VfxRuntimePackage
} from "./vfx-processing.types";

const VFX_CACHE_MAX_ENTRIES = 512;
const VFX_CACHE_MAX_ENTRY_BYTES = 8 * 1024 * 1024;
const VFX_CACHE_TTL_MS = 10 * 60_000;
const DEFAULT_VFX_SOURCE_OBJECT_KEY = "fixtures/vfx/visualeffects.2da";
const DEFAULT_VFX_PROFILE = "aurora-vfx-source";
const DEFAULT_RUNTIME_DT_SECONDS = 0.25;
const DEFAULT_RUNTIME_PARTICLE_LIMIT = 64;
const DEFAULT_RUNTIME_SEED = 0x12345678;

export const DEFAULT_VFX_BENCHMARK_SOURCE_TABLE = [
  "2DA V2.0",
  "",
  "Label Type_FD ProgFX_Impact SoundImpact Imp_Impact_Node",
  "0 VFX_BENCH F 0 **** fx_bench_impact"
].join("\n");

@Injectable()
export class VfxApplicationService {
  private readonly cache = new MemoryProcessingCacheStore<VfxRuntimePackage>(
    VFX_CACHE_MAX_ENTRIES,
    VFX_CACHE_MAX_ENTRY_BYTES,
    VFX_CACHE_TTL_MS
  );
  private readonly inFlight = new Map<string, Promise<VfxProcessingEnvelope>>();

  constructor(
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly runtimeSettingsRepository: RuntimeSettingsRepositoryPort
  ) {}

  async processVfxPackage(command: VfxProcessCommand): Promise<VfxProcessingEnvelope> {
    this.assertSafeSourceInputs(command);

    const settings = await this.runtimeSettingsRepository.get();
    const sourceHash = command.sourceHash ?? hashString(command.sourceTableText);
    const sourceObjectKey = command.sourceObjectKey ?? DEFAULT_VFX_SOURCE_OBJECT_KEY;
    const sourcePolicyTrace = this.buildSourcePolicyTrace(command, settings, sourceHash, sourceObjectKey);
    const parsed = parseAuroraVisualEffectsTwoDa(command.sourceTableText, {
      profile: command.sourceProfile ?? DEFAULT_VFX_PROFILE,
      source: {
        objectKey: sourceObjectKey,
        layer: command.sourceLayer ?? sourcePolicyTrace.selectedSource?.layer ?? "external_fixture",
        hash: sourceHash
      }
    });
    const selectedSourceRow = selectSourceRow(parsed.rows, command.sourceRowId);
    const selectedRowDiagnostics =
      command.sourceRowId !== undefined && !selectedSourceRow
        ? [
            diagnostic(
              "VFX_SOURCE_ROW_NOT_FOUND",
              "error",
              "Requested visualeffects.2da source row was not found; package remains diagnostic-only."
            )
          ]
        : [];
    const phaseSchedule = selectedSourceRow
      ? buildAuroraVfxPhaseSchedule(selectedSourceRow, command.effectInstance)
      : undefined;
    const dependencyGraph = buildAuroraVfxDependencyGraph({
      sourceRow: selectedSourceRow,
      phaseSchedule,
      sourcePolicyTrace,
      resourceTraces: normalizeResourceTraces(command.resourceTraces ?? []),
      emitters: command.sourceEmitter
        ? [toDependencyEmitterSource(normalizeEmitter(command.sourceEmitter))]
        : []
    });
    const cacheKey = buildAuroraVfxOutputCacheKeyFromPolicy({
      packageKind: command.packageKind,
      sourceHash,
      sourceRowId: selectedSourceRow?.rowId,
      sourcePolicyTrace,
      dependencyGraph,
      runtime: normalizeRuntimeOptions(command.runtime)
    });

    if (!command.bypassCache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return {
          cache: toCacheDescriptor(cached, true),
          vfx: withCacheHit(cached.value, true)
        };
      }
    }

    const processMiss = async (): Promise<VfxProcessingEnvelope> => {
      const runtimeResult =
        command.packageKind === "runtime_package" && command.sourceEmitter
          ? buildRuntimeAndRender(
              normalizeEmitter(command.sourceEmitter),
              dependencyGraph,
              command.runtime
            )
          : undefined;
      const runtimeSourceDiagnostics =
        command.packageKind === "runtime_package" && !command.sourceEmitter
          ? [
              diagnostic(
                "VFX_RUNTIME_SOURCE_EMITTER_REQUIRED",
                "warn",
                "Runtime package processing requires an MDL emitter source node; source/diagnostic package was preserved without particle runtime."
              )
            ]
          : [];
      const diagnostics = mergeDiagnostics([
        ...sourcePolicyTrace.diagnostics,
        ...parsed.diagnostics,
        ...parsed.rows.flatMap((row) => row.diagnostics),
        ...selectedRowDiagnostics,
        ...(phaseSchedule?.diagnostics ?? []),
        ...dependencyGraph.diagnostics,
        ...(runtimeResult?.runtimeState.diagnostics ?? []),
        ...(runtimeResult?.runtimeState.lastTickDiagnostics ?? []),
        ...(runtimeResult?.renderContract.diagnostics ?? []),
        ...runtimeSourceDiagnostics
      ]);
      const runtimePackageStatus = resolveRuntimePackageStatus({
        packageKind: command.packageKind,
        selectedSourceRow,
        runtimeState: runtimeResult?.runtimeState,
        diagnostics
      });
      const renderContractStatus = resolveRenderContractStatus(
        runtimeResult?.renderContract,
        diagnostics
      );
      const processed: VfxRuntimePackage = {
        version: "aurora-vfx-package/v1",
        packageKind: command.packageKind,
        sourcePolicyTrace,
        sourceRows: parsed.rows,
        ...(selectedSourceRow ? { selectedSourceRow } : {}),
        ...(command.effectInstance ? { effectInstance: command.effectInstance } : {}),
        ...(phaseSchedule ? { phaseSchedule } : {}),
        dependencyGraph,
        ...(runtimeResult?.runtimeState ? { runtimeState: runtimeResult.runtimeState } : {}),
        ...(runtimeResult?.runtimeSnapshot
          ? { runtimeSnapshot: runtimeResult.runtimeSnapshot }
          : {}),
        ...(runtimeResult?.renderContract ? { renderContract: runtimeResult.renderContract } : {}),
        diagnostics,
        observability: {
          sourceHash,
          cacheHit: false,
          diagnosticsCount: diagnostics.length,
          unresolvedDependencyCount: countUnresolvedDependencies(dependencyGraph),
          runtimePackageStatus,
          renderContractStatus
        },
        ...(command.includeBenchmarkMetadata
          ? { benchmark: await this.benchmarkVfx({ iterations: 1, warmupIterations: 0, bypassCache: true }) }
          : {})
      };
      const stored = await this.cache.set(cacheKey, processed);
      return {
        cache: toCacheDescriptor(stored, false),
        vfx: processed
      };
    };

    return command.bypassCache
      ? processMiss()
      : executeInFlight(this.inFlight, cacheKey, processMiss);
  }

  async processVfxRuntimePackageFromJob(
    targetId: string,
    options: ProcessingJobOptions
  ): Promise<VfxProcessingEnvelope> {
    const input = options.vfx ?? {};
    if (typeof input.sourceTableText !== "string" || input.sourceTableText.trim().length === 0) {
      throw new AppException({
        status: 422,
        code: "VFX_JOB_SOURCE_TABLE_TEXT_REQUIRED",
        message:
          "process_vfx_runtime_package jobs require options.vfx.sourceTableText; no placeable preview fallback is allowed."
      });
    }
    return this.processVfxPackage({
      packageKind: input.packageKind === "source_parse" ? "source_parse" : "runtime_package",
      sourceTableText: input.sourceTableText,
      sourceObjectKey:
        typeof input.sourceObjectKey === "string" ? input.sourceObjectKey : targetId,
      sourceLayer: isSourceLayer(input.sourceLayer) ? input.sourceLayer : "external_fixture",
      sourceHash: typeof input.sourceHash === "string" ? input.sourceHash : undefined,
      sourceProfile: typeof input.sourceProfile === "string" ? input.sourceProfile : undefined,
      sourceRowId: typeof input.sourceRowId === "number" ? input.sourceRowId : undefined,
      selectedCandidateId:
        typeof input.selectedCandidateId === "string" ? input.selectedCandidateId : undefined,
      selectedTableHash:
        typeof input.selectedTableHash === "string" ? input.selectedTableHash : undefined,
      selectedResourceHash:
        typeof input.selectedResourceHash === "string" ? input.selectedResourceHash : undefined,
      sourceCandidates: Array.isArray(input.sourceCandidates)
        ? (input.sourceCandidates as VfxProcessCommand["sourceCandidates"])
        : undefined,
      resourceTraces: Array.isArray(input.resourceTraces)
        ? (input.resourceTraces as VfxProcessCommand["resourceTraces"])
        : undefined,
      effectInstance:
        input.effectInstance && typeof input.effectInstance === "object"
          ? (input.effectInstance as VfxProcessCommand["effectInstance"])
          : undefined,
      sourceEmitter:
        input.sourceEmitter && typeof input.sourceEmitter === "object"
          ? normalizeEmitter(input.sourceEmitter as Partial<AuroraMdlEmitterNode>)
          : undefined,
      runtime: input.runtime && typeof input.runtime === "object"
        ? (input.runtime as VfxProcessCommand["runtime"])
        : undefined,
      bypassCache: options.bypassCache,
      includeBenchmarkMetadata: options.includeBenchmarkMetadata
    });
  }

  async getProcessedVfx(cacheKey: string): Promise<VfxProcessingEnvelope> {
    const cached = await this.cache.get(cacheKey);
    if (!cached) {
      throw new AppException({
        status: 404,
        code: "VFX_CACHE_NOT_FOUND",
        message: "VFX cache entry was not found."
      });
    }
    return {
      cache: toCacheDescriptor(cached, true),
      vfx: withCacheHit(cached.value, true)
    };
  }

  async benchmarkVfx(command: VfxBenchmarkCommand): Promise<VfxBenchmarkResult> {
    const sourceText = command.sourceTableText ?? DEFAULT_VFX_BENCHMARK_SOURCE_TABLE;
    const sourceHash = hashString(sourceText);
    const settings = await this.runtimeSettingsRepository.get();
    const policyTrace = buildAuroraVfxSourcePolicyTrace({
      settings,
      candidates: [
        {
          candidateId: "benchmark:visualeffects.2da",
          layer: "external_fixture",
          resourceKind: "table",
          resourceKey: DEFAULT_VFX_SOURCE_OBJECT_KEY,
          sourceHash,
          tableHash: sourceHash
        }
      ],
      selectedCandidateId: "benchmark:visualeffects.2da",
      selectedTableHash: sourceHash
    });
    const iterations = Math.max(1, Math.min(250, Math.trunc(command.iterations)));
    const warmupIterations = Math.max(0, Math.min(100, Math.trunc(command.warmupIterations)));
    const sourceEmitter = buildBenchmarkEmitter();

    let parsedRows: AuroraVisualEffectSourceRow[] = [];
    let dependencyGraph: AuroraVfxDependencyGraph | undefined;
    let runtimeState: AuroraEmitterRuntimeState | undefined;
    let renderContract: AuroraVfxRuntimeRenderContract | undefined;

    const stages: VfxBenchmarkStageResult[] = [];
    stages.push(
      await runBenchmarkStage("source_parse", iterations, warmupIterations, () => {
        parsedRows = parseAuroraVisualEffectsTwoDa(sourceText, {
          profile: DEFAULT_VFX_PROFILE,
          source: {
            objectKey: DEFAULT_VFX_SOURCE_OBJECT_KEY,
            layer: "external_fixture",
            hash: sourceHash
          }
        }).rows;
        return parsedRows;
      })
    );

    stages.push(
      await runBenchmarkStage("dependency_graph_build", iterations, warmupIterations, () => {
        const sourceRow = parsedRows[0];
        const phaseSchedule = sourceRow
          ? buildAuroraVfxPhaseSchedule(sourceRow, {
              constructorKind: "EffectVisualEffect",
              sourceRowId: sourceRow.rowId,
              applicationMode: "object",
              durationType: "instant",
              targetRef: "benchmark-target"
            })
          : undefined;
        dependencyGraph = buildAuroraVfxDependencyGraph({
          sourceRow,
          phaseSchedule,
          sourcePolicyTrace: policyTrace,
          emitters: [toDependencyEmitterSource(sourceEmitter)]
        });
        return dependencyGraph;
      })
    );

    stages.push(
      await runBenchmarkStage("runtime_tick", iterations, warmupIterations, () => {
        const initialState = createAuroraEmitterRuntimeState(sourceEmitter, {
          particleLimit: DEFAULT_RUNTIME_PARTICLE_LIMIT,
          seed: DEFAULT_RUNTIME_SEED
        });
        runtimeState = tickAuroraEmitterRuntime(initialState, DEFAULT_RUNTIME_DT_SECONDS);
        return runtimeState;
      })
    );

    stages.push(
      await runBenchmarkStage("render_contract_build", iterations, warmupIterations, () => {
        if (!runtimeState) {
          const initialState = createAuroraEmitterRuntimeState(sourceEmitter);
          runtimeState = tickAuroraEmitterRuntime(initialState, DEFAULT_RUNTIME_DT_SECONDS);
        }
        renderContract = buildAuroraVfxRuntimeRenderContract({
          runtimeState,
          sourceEmitter,
          dependencyGraph
        });
        return renderContract;
      })
    );

    return {
      version: "aurora-vfx-benchmark/v1",
      stages,
      deterministicFingerprint: hashStable({
        sourceHash,
        policy: policyTrace.cacheKeyParts,
        stages: stages.map((stage) => ({
          stage: stage.stage,
          fingerprint: stage.fingerprint,
          diagnosticsCount: stage.diagnosticsCount
        }))
      })
    };
  }

  buildCacheKey(input: AuroraVfxOutputCacheKeyInput): string {
    return buildAuroraVfxOutputCacheKey(input);
  }

  private buildSourcePolicyTrace(
    command: VfxProcessCommand,
    settings: RuntimeSettingsRecord,
    sourceHash: string,
    sourceObjectKey: string
  ): AuroraVfxSourcePolicyTrace {
    const candidates = command.sourceCandidates?.length
      ? command.sourceCandidates
      : [
          {
            candidateId: "request:visualeffects.2da",
            layer: command.sourceLayer ?? "external_fixture",
            resourceKind: "table",
            resourceKey: sourceObjectKey,
            sourceHash,
            tableHash: command.selectedTableHash ?? sourceHash,
            resourceHash: command.selectedResourceHash
          }
        ];
    return buildAuroraVfxSourcePolicyTrace({
      settings,
      candidates: candidates as AuroraVfxSourcePolicyCandidate[],
      selectedCandidateId: command.selectedCandidateId,
      selectedTableHash: command.selectedTableHash ?? sourceHash,
      selectedResourceHash: command.selectedResourceHash
    });
  }

  private assertSafeSourceInputs(command: VfxProcessCommand): void {
    const unsafe = [
      command.sourceObjectKey,
      ...(command.sourceCandidates ?? []).flatMap((candidate) => [
        candidate.resourceKey,
        candidate.sourcePath,
        candidate.hakName
      ]),
      ...(command.resourceTraces ?? []).flatMap((trace) => [
        trace.requestedRef,
        trace.ownerPath,
        trace.selectedCandidate?.resourceKey,
        trace.selectedCandidate?.sourcePath,
        trace.selectedCandidate?.hakName,
        ...(trace.lowerPrecedenceCandidates ?? []).flatMap((candidate) => [
          candidate.resourceKey,
          candidate.sourcePath,
          candidate.hakName
        ])
      ])
    ].filter((value): value is string => typeof value === "string" && value.length > 0);
    const violation = unsafe.find((value) => !isSafeVfxResourceToken(value));
    if (violation) {
      throw new AppException({
        status: 422,
        code: "VFX_SOURCE_RESOURCE_PATH_UNSAFE",
        message:
          "VFX source/resource references must be relative resource keys; unsafe paths are rejected without fallback.",
        details: [{ path: "source", reason: violation }]
      });
    }
  }
}

function buildRuntimeAndRender(
  sourceEmitter: AuroraMdlEmitterNode,
  dependencyGraph: AuroraVfxDependencyGraph,
  runtimeOptions: VfxProcessCommand["runtime"]
) {
  const runtime = normalizeRuntimeOptions(runtimeOptions);
  const initialState = createAuroraEmitterRuntimeState(sourceEmitter, {
    particleLimit: runtime.particleLimit,
    seed: runtime.seed
  });
  const runtimeState = tickAuroraEmitterRuntime(initialState, runtime.dtSeconds);
  const runtimeSnapshot = buildAuroraEmitterRuntimeSnapshot(runtimeState);
  const renderContract = buildAuroraVfxRuntimeRenderContract({
    runtimeState,
    sourceEmitter,
    dependencyGraph
  });
  return { runtimeState, runtimeSnapshot, renderContract };
}

function normalizeRuntimeOptions(runtime: VfxProcessCommand["runtime"]) {
  return {
    dtSeconds: sanitizePositiveNumber(runtime?.dtSeconds, DEFAULT_RUNTIME_DT_SECONDS),
    particleLimit: Math.max(
      1,
      Math.trunc(sanitizePositiveNumber(runtime?.particleLimit, DEFAULT_RUNTIME_PARTICLE_LIMIT))
    ),
    seed: Math.trunc(sanitizePositiveNumber(runtime?.seed, DEFAULT_RUNTIME_SEED))
  };
}

function normalizeEmitter(input: Partial<AuroraMdlEmitterNode>): AuroraMdlEmitterNode {
  return {
    nodeKind: "emitter",
    nodeName: typeof input.nodeName === "string" ? input.nodeName : "vfx_emitter",
    provenance: input.provenance ?? {
      sourceFormat: "aurora-mdl-ascii",
      sourceModelObjectKey: input.sourceModelObjectKey,
      sourceModelFileName: input.sourceModelFileName,
      sourceModelHash: input.sourceModelHash
    },
    sourceFormat: input.sourceFormat ?? "aurora-mdl-ascii",
    sourceModelObjectKey: input.sourceModelObjectKey,
    sourceModelFileName: input.sourceModelFileName,
    sourceModelHash: input.sourceModelHash,
    texture: input.texture,
    chunkName: input.chunkName,
    emitterType: input.emitterType ?? "Fountain",
    emitterTypeRaw: input.emitterTypeRaw ?? input.emitterType ?? "Fountain",
    renderMode: input.renderMode,
    renderModeRaw: input.renderModeRaw ?? input.renderMode,
    blendMode: input.blendMode,
    blendModeRaw: input.blendModeRaw ?? input.blendMode,
    atlas: input.atlas ?? {
      effectiveXGrid: 1,
      effectiveYGrid: 1
    },
    simulation: input.simulation ?? {
      birthrate: 4,
      lifeExp: 1,
      velocity: 0,
      sizeStart: 1,
      sizeEnd: 1,
      alphaStart: 1,
      alphaEnd: 1,
      colorStart: [1, 1, 1],
      colorEnd: [1, 1, 1]
    },
    transform: input.transform,
    orientation: input.orientation,
    referenceNodes: input.referenceNodes ?? [],
    events: input.events ?? [],
    animations: input.animations ?? [],
    animationPasses: input.animationPasses ?? [],
    sourceState: input.sourceState ?? {},
    directRows: input.directRows ?? [],
    keyRows: input.keyRows ?? [],
    bezierKeyRows: input.bezierKeyRows ?? [],
    colorTimelines: input.colorTimelines ?? {}
  };
}

function buildBenchmarkEmitter(): AuroraMdlEmitterNode {
  return normalizeEmitter({
    nodeName: "vfx_benchmark_fountain",
    sourceModelObjectKey: "fixtures/vfx/benchmark.mdl",
    sourceModelFileName: "benchmark.mdl",
    sourceModelHash: hashString("benchmark.mdl"),
    texture: "fx_benchmark",
    renderMode: "Normal",
    renderModeRaw: "Normal",
    blendMode: "Normal",
    blendModeRaw: "Normal",
    emitterType: "Fountain",
    emitterTypeRaw: "Fountain",
    sourceState: {
      renderOrder: 10,
      twoSidedTexture: true
    }
  });
}

function toDependencyEmitterSource(emitter: AuroraMdlEmitterNode) {
  const maybeMaterialName = (emitter as AuroraMdlEmitterNode & { materialName?: string })
    .materialName;
  const maybeMtr = (emitter as AuroraMdlEmitterNode & { mtr?: string }).mtr;
  const maybeTexture0 = (emitter as AuroraMdlEmitterNode & { texture0?: string }).texture0;
  const maybeCustomShader = (emitter as AuroraMdlEmitterNode & { customShader?: string })
    .customShader;
  return {
    ownerPath: `mdl:${emitter.sourceModelFileName ?? emitter.sourceModelObjectKey ?? "unknown"}/emitter:${emitter.nodeName}`,
    nodeName: emitter.nodeName,
    sourceModelRef: emitter.sourceModelFileName ?? emitter.sourceModelObjectKey,
    texture: emitter.texture,
    texture0: maybeTexture0,
    materialName: maybeMaterialName,
    mtr: maybeMtr,
    customShader: maybeCustomShader,
    chunkName: emitter.chunkName
  };
}

function normalizeResourceTraces(
  traces: VfxResourceTraceInput[]
): AuroraVfxDependencyResolverTrace[] {
  return traces.map((trace) => ({
    requestedResourceClass: trace.requestedResourceClass,
    requestedRef: trace.requestedRef,
    ownerPath: trace.ownerPath,
    selectedCandidate: trace.selectedCandidate,
    lowerPrecedenceCandidates: trace.lowerPrecedenceCandidates
  }));
}

function selectSourceRow(
  rows: AuroraVisualEffectSourceRow[],
  sourceRowId: number | undefined
): AuroraVisualEffectSourceRow | undefined {
  if (typeof sourceRowId === "number") {
    return rows.find((row) => row.rowId === sourceRowId);
  }
  return rows[0];
}

async function runBenchmarkStage(
  stage: VfxBenchmarkStageResult["stage"],
  iterations: number,
  warmupIterations: number,
  run: () => unknown
): Promise<VfxBenchmarkStageResult> {
  for (let index = 0; index < warmupIterations; index += 1) {
    run();
  }

  const durations: number[] = [];
  let lastResult: unknown;
  for (let index = 0; index < iterations; index += 1) {
    const startedAt = performance.now();
    lastResult = run();
    durations.push(performance.now() - startedAt);
  }

  return {
    stage,
    iterations,
    warmupIterations,
    durationMs: {
      min: roundDuration(Math.min(...durations)),
      max: roundDuration(Math.max(...durations)),
      mean: roundDuration(durations.reduce((sum, value) => sum + value, 0) / durations.length)
    },
    fingerprint: hashStable(stripVolatileBenchmarkFields(lastResult)),
    diagnosticsCount: countDiagnostics(lastResult)
  };
}

function stripVolatileBenchmarkFields(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(stripVolatileBenchmarkFields);
  }
  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.keys(record)
      .filter((key) => !["storedAt", "processedAt"].includes(key))
      .sort((left, right) => left.localeCompare(right))
      .map((key) => [key, stripVolatileBenchmarkFields(record[key])])
  );
}

function countDiagnostics(value: unknown): number {
  if (!value || typeof value !== "object") {
    return 0;
  }
  if (Array.isArray(value)) {
    return value.reduce((sum, entry) => sum + countDiagnostics(entry), 0);
  }
  const record = value as Record<string, unknown>;
  const ownDiagnostics = Array.isArray(record.diagnostics) ? record.diagnostics.length : 0;
  return (
    ownDiagnostics +
    Object.entries(record)
      .filter(([key]) => key !== "diagnostics")
      .reduce((sum, [, entry]) => sum + countDiagnostics(entry), 0)
  );
}

function toCacheDescriptor(
  entry: { key: string; storedAt: string; hits: number },
  hit: boolean
): VfxProcessingCacheDescriptor {
  return {
    key: entry.key,
    hit,
    storedAt: entry.storedAt,
    hits: entry.hits
  };
}

function withCacheHit(value: VfxRuntimePackage, cacheHit: boolean): VfxRuntimePackage {
  return {
    ...value,
    observability: {
      ...value.observability,
      cacheHit
    }
  };
}

function countUnresolvedDependencies(graph: AuroraVfxDependencyGraph): number {
  return graph.edges.filter((edge) => edge.resolveStatus === "unresolved").length;
}

function resolveRuntimePackageStatus(input: {
  packageKind: VfxProcessCommand["packageKind"];
  selectedSourceRow?: AuroraVisualEffectSourceRow;
  runtimeState?: AuroraEmitterRuntimeState;
  diagnostics: AuroraVfxDiagnostic[];
}) {
  if (input.diagnostics.some((entry) => entry.severity === "error")) {
    return "diagnostic_only" as const;
  }
  if (input.packageKind === "runtime_package" && input.runtimeState) {
    return "runtime_ready" as const;
  }
  return input.selectedSourceRow ? "source_only" as const : "diagnostic_only" as const;
}

function resolveRenderContractStatus(
  renderContract: AuroraVfxRuntimeRenderContract | undefined,
  diagnostics: AuroraVfxDiagnostic[]
) {
  if (diagnostics.some((entry) => entry.severity === "error")) {
    return "diagnostic_only" as const;
  }
  return renderContract ? "ready" as const : "source_only" as const;
}

function mergeDiagnostics(diagnostics: AuroraVfxDiagnostic[]): AuroraVfxDiagnostic[] {
  const seen = new Set<string>();
  const merged: AuroraVfxDiagnostic[] = [];
  for (const entry of diagnostics) {
    const key = `${entry.severity}:${entry.code}:${entry.message}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(entry);
  }
  return merged;
}

function diagnostic(
  code: string,
  severity: AuroraVfxDiagnostic["severity"],
  message: string
): AuroraVfxDiagnostic {
  return { code, severity, message };
}

function sanitizePositiveNumber(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function roundDuration(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function isSourceLayer(value: unknown): value is VfxProcessCommand["sourceLayer"] {
  return (
    value === "module" ||
    value === "hak" ||
    value === "vanilla" ||
    value === "external_fixture"
  );
}

function isSafeVfxResourceToken(value: string): boolean {
  const normalized = value.trim();
  if (!normalized) {
    return false;
  }
  if (normalized.includes("\0") || normalized.includes("\\") || normalized.includes("://")) {
    return false;
  }
  if (/^[a-z]:/iu.test(normalized) || normalized.startsWith("/") || normalized.startsWith(".")) {
    return false;
  }
  return !normalized.split("/").some((part) => part === ".." || part === "");
}

function hashString(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashStable(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const entries = Object.keys(record)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);
  return `{${entries.join(",")}}`;
}
