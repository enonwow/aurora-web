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
import { createAuroraEffectBeamAttachmentResolver } from "../domain/aurora-vfx-effect-beam-attachment";
import {
  resolveAuroraProgFxType10ProjectileTrajectory,
  resolveAuroraProgFxType10ProjectileOwnerTransform,
  type AuroraProgFxType10ProjectileTrajectory
} from "../domain/aurora-vfx-progfx-type10-projectile";
import {
  sampleAuroraAoeVisualRuntime,
  type AuroraAoeVisualFootprintOwner,
  type AuroraAoeVisualOwnerRuntimeSnapshot
} from "../domain/aurora-vfx-aoe-visual-runtime";
import {
  sampleAuroraObjectDurationVisualOwner,
  type AuroraObjectDurationVisualOwnerSnapshot
} from "../domain/aurora-vfx-object-duration-owner-runtime";
import type {
  AuroraMdlEmitterNode,
  AuroraMdlAnimationEvent,
  AuroraMdlEmitterSimulation,
  AuroraMdlOrientation,
  AuroraMdlOrientationKeyframe,
  AuroraMdlTransform
} from "../domain/aurora-mdl-vfx-source.parser";
import {
  buildAuroraVfxRuntimeRenderContract,
  type AuroraParticleDrawRecord,
  type AuroraVfxChildParticleDrawFrame,
  type AuroraVfxMaterialSourceState,
  type AuroraVfxRuntimeRenderContract
} from "../domain/aurora-vfx-render-contract";
import {
  buildAuroraShaderProgramSourceBundle,
  type AuroraMaterialShaderParameter,
  type AuroraShaderProgramSourceBundle,
  type AuroraShaderSourceRecord
} from "../domain/aurora-shader-source-graph";
import {
  buildAuroraEmitterRuntimeSnapshot,
  createAuroraEmitterRuntimeState,
  NWN_EE_VFX_RNG_ALGORITHM,
  resolveAuroraEmitterSourceReferenceTargetContext,
  tickAuroraEmitterRuntime,
  type AuroraDeterministicRngState,
  type AuroraEmitterRuntimeContext,
  type AuroraEmitterRuntimeState
} from "../domain/aurora-vfx-runtime-state";
import {
  createAuroraWindContext,
  createAuroraWindManagerState,
  tickAuroraWindManager
} from "../domain/aurora-vfx-wind-manager";
import {
  buildAuroraVfxSourcePolicyTrace,
  type AuroraVfxSourcePolicyCandidate,
  type AuroraVfxSourcePolicyTrace
} from "../domain/aurora-vfx-source-policy";
import {
  buildAuroraVfxPhaseSchedule,
  parseAuroraProgFxTwoDa,
  parseAuroraVisualEffectsTwoDa,
  type AuroraVfxDiagnostic,
  type AuroraProgFxSourceRow,
  type AuroraVfxPhaseSchedule,
  type AuroraVisualEffectSourceRow
} from "../domain/aurora-vfx-source.parser";
import type {
  VfxBenchmarkCommand,
  VfxBenchmarkResult,
  VfxBenchmarkStageResult,
  AuroraVfxTickTrace,
  VfxEmitterRuntimePackage,
  VfxEmitterMaterialStateInput,
  VfxProcessCommand,
  VfxProcessingCacheDescriptor,
  VfxProcessingEnvelope,
  VfxResourceTraceInput,
  VfxRuntimeTreeCommand,
  VfxRuntimeTreeChildModelSource,
  VfxRuntimePackage
} from "./vfx-processing.types";

const VFX_CACHE_MAX_ENTRIES = 512;
const VFX_CACHE_MAX_ENTRY_BYTES = 8 * 1024 * 1024;
const VFX_CACHE_TTL_MS = 10 * 60_000;
const DEFAULT_VFX_SOURCE_OBJECT_KEY = "fixtures/vfx/visualeffects.2da";
const DEFAULT_VFX_PROFILE = "aurora-vfx-source";
const DEFAULT_RUNTIME_DT_SECONDS = 0.25;
const DEFAULT_RUNTIME_EXECUTION_PARTICLE_BUDGET = 4096;
const MAX_RUNTIME_EXECUTION_PARTICLE_BUDGET = 65_536;
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
    if (command.runtime?.context && !command.bypassCache) {
      throw new AppException({
        status: 422,
        code: "VFX_RUNTIME_CONTEXT_REQUIRES_CACHE_BYPASS",
        message:
          "In-process VFX runtime services cannot participate in a serialized cache key; set bypassCache when supplying runtime.context."
      });
    }

    const sourceTableText = command.sourceTableText?.trim();
    if (!sourceTableText && command.packageKind !== "model_graph_runtime") {
      throw new AppException({
        status: 422,
        code: "VFX_SOURCE_TABLE_TEXT_REQUIRED",
        message:
          "2DA-backed VFX packages require sourceTableText; model_graph_runtime packages must carry source-MDL emitters instead."
      });
    }
    const settings = await this.runtimeSettingsRepository.get();
    const sourceHash =
      command.sourceHash ??
      hashString(
        sourceTableText ??
          stableStringify({
            sourceObjectKey: command.sourceObjectKey,
            sourceEmitters: command.sourceEmitters ?? (command.sourceEmitter ? [command.sourceEmitter] : []),
            sourceEmitterMaterials: command.sourceEmitterMaterials ?? [],
            sourceAnimationEvents: command.sourceAnimationEvents ?? command.sourceModelGraph?.animationEvents
          })
      );
    const sourceObjectKey =
      command.sourceObjectKey ??
      command.sourceEmitters?.[0]?.sourceModelObjectKey ??
      command.sourceEmitter?.sourceModelObjectKey ??
      DEFAULT_VFX_SOURCE_OBJECT_KEY;
    const sourcePolicyTrace = this.buildSourcePolicyTrace(command, settings, sourceHash, sourceObjectKey);
    const parsed = sourceTableText
      ? parseAuroraVisualEffectsTwoDa(sourceTableText, {
          profile: command.sourceProfile ?? DEFAULT_VFX_PROFILE,
          source: {
            objectKey: sourceObjectKey,
            layer: command.sourceLayer ?? sourcePolicyTrace.selectedSource?.layer ?? "external_fixture",
            hash: sourceHash
          }
        })
      : { rows: [], diagnostics: [] };
    const progFxHash =
      typeof command.progFxTableText === "string"
        ? hashString(command.progFxTableText)
        : undefined;
    const parsedProgFx =
      typeof command.progFxTableText === "string"
        ? parseAuroraProgFxTwoDa(command.progFxTableText, {
            profile: command.sourceProfile
              ? `${command.sourceProfile}:progfx`
              : `${DEFAULT_VFX_PROFILE}:progfx`,
            source: {
              objectKey: "fixtures/vfx/progfx.2da",
              layer:
                command.sourceLayer ??
                sourcePolicyTrace.selectedSource?.layer ??
                "external_fixture",
              hash: progFxHash
            }
          })
        : undefined;
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
    const sourceEmitters = normalizeCommandSourceEmitters(command);
    const sourceEmitterMaterials = normalizeCommandSourceEmitterMaterials(command);
    const sourceAnimationEvents = normalizeCommandSourceAnimationEvents(
      command.sourceAnimationEvents ?? command.sourceModelGraph?.animationEvents
    );
    const dependencyGraph = buildAuroraVfxDependencyGraph({
      sourceRow: selectedSourceRow,
      phaseSchedule,
      sourcePolicyTrace,
      resourceTraces: normalizeResourceTraces(command.resourceTraces ?? []),
      emitters: sourceEmitters.map((emitter) => toDependencyEmitterSource(emitter))
    });
    const cacheKey = buildAuroraVfxOutputCacheKeyFromPolicy({
      packageKind: command.packageKind,
      sourceHash,
      ...(progFxHash ? { progFxHash } : {}),
      sourceRowId: selectedSourceRow?.rowId,
      sourcePolicyTrace,
      dependencyGraph,
      sourceEmitterMaterials,
      sourceAnimationEvents,
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
        isRuntimePackageKind(command.packageKind) && sourceEmitters.length > 0
          ? buildRuntimeAndRender(
              sourceEmitters,
              sourceEmitterMaterials,
              dependencyGraph,
              command.runtime,
              command.sourceModelGraph,
              sourceAnimationEvents,
              phaseSchedule,
              parsedProgFx?.rows
            )
          : undefined;
      const runtimeSourceDiagnostics =
        isRuntimePackageKind(command.packageKind) && sourceEmitters.length === 0
          ? [
              diagnostic(
                "VFX_RUNTIME_SOURCE_EMITTER_REQUIRED",
                "warn",
                "Runtime VFX package processing requires an MDL emitter source node; source/diagnostic package was preserved without particle runtime."
              )
            ]
          : [];
      const diagnostics = mergeDiagnostics([
        ...sourcePolicyTrace.diagnostics,
        ...parsed.diagnostics,
        ...parsed.rows.flatMap((row) => row.diagnostics),
        ...(parsedProgFx?.diagnostics ?? []),
        ...(parsedProgFx?.rows.flatMap((row) => row.diagnostics) ?? []),
        ...selectedRowDiagnostics,
        ...(phaseSchedule?.diagnostics ?? []),
        ...dependencyGraph.diagnostics,
        ...(runtimeResult?.runtimeEmitters.flatMap((entry) => [
          ...entry.runtimeState.diagnostics,
          ...entry.runtimeState.lastTickDiagnostics,
          ...entry.renderContract.diagnostics
        ]) ?? []),
        ...(runtimeResult?.diagnostics ?? []),
        ...runtimeSourceDiagnostics
      ]);
      const primaryRuntimeEmitter = runtimeResult?.runtimeEmitters[0];
      const runtimePackageStatus = resolveRuntimePackageStatus({
        packageKind: command.packageKind,
        selectedSourceRow,
        runtimeState: primaryRuntimeEmitter?.runtimeState,
        diagnostics
      });
      const renderContractStatus = resolveRenderContractStatus(
        primaryRuntimeEmitter?.renderContract,
        diagnostics
      );
      const processed: VfxRuntimePackage = {
        version: "aurora-vfx-package/v1",
        packageKind: command.packageKind,
        sourcePolicyTrace,
        sourceRows: parsed.rows,
        ...(parsedProgFx ? { progFxRows: parsedProgFx.rows } : {}),
        ...(selectedSourceRow ? { selectedSourceRow } : {}),
        ...(command.effectInstance ? { effectInstance: command.effectInstance } : {}),
        ...(phaseSchedule ? { phaseSchedule } : {}),
        dependencyGraph,
        ...(runtimeResult?.runtimeEmitters.length
          ? { runtimeEmitters: runtimeResult.runtimeEmitters }
          : {}),
        ...(primaryRuntimeEmitter?.runtimeState
          ? { runtimeState: primaryRuntimeEmitter.runtimeState }
          : {}),
        ...(primaryRuntimeEmitter?.runtimeSnapshot
          ? { runtimeSnapshot: primaryRuntimeEmitter.runtimeSnapshot }
          : {}),
        ...(primaryRuntimeEmitter?.renderContract
          ? { renderContract: primaryRuntimeEmitter.renderContract }
          : {}),
        ...(runtimeResult?.windManagerSnapshot
          ? { windManagerSnapshot: runtimeResult.windManagerSnapshot }
          : {}),
        ...(runtimeResult?.runtimeSharedRng
          ? { runtimeSharedRng: runtimeResult.runtimeSharedRng }
          : {}),
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
      if (command.bypassCache) {
        return {
          cache: {
            key: cacheKey,
            hit: false,
            storedAt: new Date().toISOString(),
            hits: 0
          },
          vfx: processed
        };
      }
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

  async processVfxRuntimeTree(
    command: VfxRuntimeTreeCommand
  ): Promise<VfxProcessingEnvelope> {
    const rootRuntime = normalizeRuntimeOptions(command.rootCommand.runtime);
    const childSources = new Map(
      command.childModels.map((source) => [
        normalizeRuntimeTreeResourceRef(source.requestedRef),
        source
      ])
    );
    if (childSources.size !== command.childModels.length) {
      throw new AppException({
        status: 422,
        code: "VFX_RUNTIME_TREE_CHILD_RESOURCE_DUPLICATE",
        message:
          "Recursive VFX runtime child models require one identity-neutral source per normalized requested resource."
      });
    }

    let sharedRngState: AuroraDeterministicRngState = {
      ...rootRuntime.initialRngState
    };
    let rootEmitterStates: NonNullable<
      NonNullable<VfxProcessCommand["runtime"]>["initialEmitterStates"]
    > | undefined;
    let latestRootEnvelope: VfxProcessingEnvelope | undefined;
    const rootFramesByEmitter = new Map<string, NonNullable<VfxEmitterRuntimePackage["runtimeFrames"]>>();
    const instances = new Map<string, RuntimeTreeChildInstance>();
    const initialSharedRngState = { ...sharedRngState };

    for (let tickIndex = 0; tickIndex < rootRuntime.tickCount; tickIndex += 1) {
      const rootEnvelope = await this.processVfxPackage({
        ...command.rootCommand,
        runtime: buildRuntimeTreeSliceOptions({
          base: command.rootCommand.runtime,
          sourceEmitter: command.rootCommand.sourceEmitters?.[0] ??
            command.rootCommand.sourceEmitter,
          tickIndex,
          totalTickCount: rootRuntime.tickCount,
          rngState: sharedRngState,
          emitterStates: rootEmitterStates,
          sourceClockOffsetSeconds: tickIndex * rootRuntime.dtSeconds
        }),
        bypassCache: true,
        includeBenchmarkMetadata: false
      });
      latestRootEnvelope = rootEnvelope;
      sharedRngState = {
        ...(rootEnvelope.vfx.runtimeSharedRng?.finalState ?? sharedRngState)
      };
      rootEmitterStates = buildRuntimeTreeContinuationStates(
        rootEnvelope.vfx.runtimeEmitters
      );
      const liveInstanceRefs = new Set<string>();
      collectRuntimeTreeChildSpawns(
        rootEnvelope.vfx.runtimeEmitters,
        "root",
        childSources,
        instances,
        liveInstanceRefs
      );

      const orderedInstances = [...instances.values()];
      for (let instanceIndex = 0; instanceIndex < orderedInstances.length; instanceIndex += 1) {
        const instance = orderedInstances[instanceIndex]!;
        if (!liveInstanceRefs.has(instance.modelInstanceRef)) continue;
        const localClockSeconds = instance.tickCount * rootRuntime.dtSeconds;
        const nextLocalClockSeconds = localClockSeconds + rootRuntime.dtSeconds;
        const childEnvelope = await this.processVfxPackage({
          ...instance.source.command,
          runtime: {
            dtSeconds: rootRuntime.dtSeconds,
            simulationStepSeconds: rootRuntime.simulationStepSeconds,
            tickCount: 1,
            executionParticleBudget: rootRuntime.executionParticleBudget,
            ...(rootRuntime.particleLimit !== undefined
              ? { particleLimit: rootRuntime.particleLimit }
              : {}),
            seed: sharedRngState.seed,
            initialRngState: sharedRngState,
            ...(instance.emitterStates
              ? { initialEmitterStates: instance.emitterStates }
              : {}),
            sourceClockOffsetSeconds: localClockSeconds,
            animation: {
              animationName: instance.source.animation.animationName,
              previousTimeSeconds: resolveRuntimeTreeAnimationClock(
                localClockSeconds,
                instance.source.animation.lengthSeconds,
                instance.source.animation.loop === true
              ),
              currentTimeSeconds: resolveRuntimeTreeAnimationClock(
                nextLocalClockSeconds,
                instance.source.animation.lengthSeconds,
                instance.source.animation.loop === true
              ),
              blendWeight: 1,
              playbackTickCount: 1,
              ...(instance.source.animation.loop === true ? { loop: true } : {})
            }
          },
          bypassCache: true,
          includeBenchmarkMetadata: false
        });
        instance.latestEnvelope = childEnvelope;
        instance.emitterStates = buildRuntimeTreeContinuationStates(
          childEnvelope.vfx.runtimeEmitters
        );
        instance.tickCount += 1;
        sharedRngState = {
          ...(childEnvelope.vfx.runtimeSharedRng?.finalState ?? sharedRngState)
        };
        collectRuntimeTreeChildSpawns(
          childEnvelope.vfx.runtimeEmitters,
          instance.modelInstanceRef,
          childSources,
          instances,
          liveInstanceRefs
        );
        if (instances.size > orderedInstances.length) {
          orderedInstances.push(...[...instances.values()].slice(orderedInstances.length));
        }
      }

      for (const [modelInstanceRef] of instances) {
        if (!liveInstanceRefs.has(modelInstanceRef)) {
          instances.delete(modelInstanceRef);
        }
      }
      const childFrames = buildRuntimeTreeChildFrames(instances);
      const enrichedRootEmitters = attachRuntimeTreeChildFrames(
        rootEnvelope.vfx.runtimeEmitters,
        childFrames
      );
      for (const emitter of enrichedRootEmitters) {
        const frames = rootFramesByEmitter.get(emitter.emitterNodeName) ?? [];
        const sliceFrames = emitter.runtimeFrames ?? [];
        if (frames.length === 0 && sliceFrames[0]) {
          frames.push({ ...sliceFrames[0], tickIndex: 0 });
        }
        const finalFrame = sliceFrames.at(-1);
        if (finalFrame) {
          frames.push({
            ...finalFrame,
            tickIndex: tickIndex + 1,
            renderContract: emitter.renderContract
          });
        }
        rootFramesByEmitter.set(emitter.emitterNodeName, frames);
      }
      latestRootEnvelope = {
        ...rootEnvelope,
        vfx: {
          ...rootEnvelope.vfx,
          runtimeEmitters: enrichedRootEmitters
        }
      };
    }

    if (!latestRootEnvelope) {
      throw new AppException({
        status: 422,
        code: "VFX_RUNTIME_TREE_ROOT_RUNTIME_REQUIRED",
        message: "Recursive VFX runtime requires at least one bounded root runtime tick."
      });
    }
    const runtimeEmitters = (latestRootEnvelope.vfx.runtimeEmitters ?? []).map((emitter) => ({
      ...emitter,
      runtimeFrames: rootFramesByEmitter.get(emitter.emitterNodeName) ?? []
    }));
    const primary = runtimeEmitters[0];
    return {
      ...latestRootEnvelope,
      vfx: {
        ...latestRootEnvelope.vfx,
        runtimeEmitters,
        ...(primary?.runtimeState ? { runtimeState: primary.runtimeState } : {}),
        ...(primary?.runtimeSnapshot ? { runtimeSnapshot: primary.runtimeSnapshot } : {}),
        ...(primary?.renderContract ? { renderContract: primary.renderContract } : {}),
        runtimeSharedRng: {
          version: "aurora-vfx-shared-rng-lineage/v1",
          initialState: initialSharedRngState,
          finalState: sharedRngState,
          schedulerOrder: "model-instance-insertion-order-then-emitter-source-order"
        }
      }
    };
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
      progFxTableText:
        typeof input.progFxTableText === "string" ? input.progFxTableText : undefined,
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
      sourceEmitters: Array.isArray(input.sourceEmitters)
        ? input.sourceEmitters
            .filter((entry): entry is Partial<AuroraMdlEmitterNode> => Boolean(entry) && typeof entry === "object")
            .map((entry) => normalizeEmitter(entry))
        : undefined,
      sourceAnimationEvents: Array.isArray(input.sourceAnimationEvents)
        ? (input.sourceAnimationEvents as AuroraMdlAnimationEvent[])
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
          executionParticleBudget: DEFAULT_RUNTIME_EXECUTION_PARTICLE_BUDGET,
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
          candidateId:
            command.packageKind === "model_graph_runtime"
              ? "request:source-mdl"
              : "request:visualeffects.2da",
          layer: command.sourceLayer ?? "external_fixture",
          resourceKind: command.packageKind === "model_graph_runtime" ? "resource" : "table",
          resourceKey: sourceObjectKey,
          sourceHash,
          ...(command.packageKind === "model_graph_runtime"
            ? { resourceHash: command.selectedResourceHash ?? sourceHash }
            : {
                tableHash: command.selectedTableHash ?? sourceHash,
                resourceHash: command.selectedResourceHash
              })
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
      ]),
      ...(command.sourceEmitterMaterials ?? []).map(
        (entry) => entry.materialState.materialRef
      )
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

type RuntimeTreeContinuationStates = NonNullable<
  NonNullable<VfxProcessCommand["runtime"]>["initialEmitterStates"]
>;

interface RuntimeTreeChildInstance {
  modelInstanceRef: string;
  parentInstanceRef: string;
  source: VfxRuntimeTreeChildModelSource;
  tickCount: number;
  emitterStates?: RuntimeTreeContinuationStates;
  latestEnvelope?: VfxProcessingEnvelope;
}

function normalizeRuntimeTreeResourceRef(value: string): string {
  const normalized = value.trim().replace(/\\/gu, "/").toLowerCase();
  const basename = normalized.split("/").at(-1) ?? normalized;
  return basename.replace(/\.(?:mdl|glb)$/u, "");
}

function buildRuntimeTreeContinuationStates(
  runtimeEmitters: VfxEmitterRuntimePackage[] | undefined
): RuntimeTreeContinuationStates | undefined {
  if (!runtimeEmitters?.length) return undefined;
  return runtimeEmitters.map((emitter) => ({
    emitterNodeName: emitter.emitterNodeName,
    runtimeState: emitter.runtimeState
  }));
}

function buildRuntimeTreeSliceOptions(input: {
  base: VfxProcessCommand["runtime"];
  sourceEmitter: AuroraMdlEmitterNode | undefined;
  tickIndex: number;
  totalTickCount: number;
  rngState: AuroraDeterministicRngState;
  emitterStates: RuntimeTreeContinuationStates | undefined;
  sourceClockOffsetSeconds: number;
}): NonNullable<VfxProcessCommand["runtime"]> {
  const normalized = normalizeRuntimeOptions(input.base);
  const normalizedAnimation = normalizeRuntimeAnimation(input.base?.animation);
  const animation =
    input.sourceEmitter && normalizedAnimation
      ? resolveRuntimeAnimationBoundary(
          input.sourceEmitter,
          normalizedAnimation,
          input.tickIndex + 1,
          input.totalTickCount
        )
      : undefined;
  return {
    ...(input.base ?? {}),
    dtSeconds: normalized.dtSeconds,
    simulationStepSeconds: normalized.simulationStepSeconds,
    tickCount: 1,
    executionParticleBudget: normalized.executionParticleBudget,
    ...(normalized.particleLimit !== undefined
      ? { particleLimit: normalized.particleLimit }
      : {}),
    seed: input.rngState.seed,
    initialRngState: input.rngState,
    ...(input.emitterStates ? { initialEmitterStates: input.emitterStates } : {}),
    sourceClockOffsetSeconds: input.sourceClockOffsetSeconds,
    ...(animation
      ? {
          animation: {
            ...animation,
            playbackTickCount: 1
          }
        }
      : { animation: undefined })
  };
}

function resolveRuntimeTreeAnimationClock(
  clockSeconds: number,
  lengthSeconds: number,
  loop: boolean
): number {
  const safeLength = Math.max(0, lengthSeconds);
  if (safeLength <= 0) return 0;
  if (!loop) return Math.min(safeLength, Math.max(0, clockSeconds));
  return ((clockSeconds % safeLength) + safeLength) % safeLength;
}

function collectRuntimeTreeChildSpawns(
  runtimeEmitters: VfxEmitterRuntimePackage[] | undefined,
  parentInstanceRef: string,
  childSources: ReadonlyMap<string, VfxRuntimeTreeChildModelSource>,
  instances: Map<string, RuntimeTreeChildInstance>,
  liveInstanceRefs: Set<string>
): void {
  for (const emitter of runtimeEmitters ?? []) {
    const lane = emitter.renderContract.chunkLane;
    if (!lane) continue;
    const requestedRef = normalizeRuntimeTreeResourceRef(
      lane.resolvedResource?.requestedRef ?? lane.chunkName ?? ""
    );
    const source = childSources.get(requestedRef);
    if (!source) continue;
    for (const particle of lane.particleInstances) {
      const modelInstanceRef = particle.modelInstanceRef?.trim();
      if (!modelInstanceRef || particle.modelRuntimeStatus === "released") continue;
      liveInstanceRefs.add(modelInstanceRef);
      if (!instances.has(modelInstanceRef)) {
        instances.set(modelInstanceRef, {
          modelInstanceRef,
          parentInstanceRef,
          source,
          tickCount: 0
        });
      }
    }
  }
}

function attachRuntimeTreeChildFrames(
  runtimeEmitters: VfxEmitterRuntimePackage[] | undefined,
  framesByInstanceRef: ReadonlyMap<
    string,
    NonNullable<
      NonNullable<
        NonNullable<VfxEmitterRuntimePackage["renderContract"]["chunkLane"]>
      >["particleInstances"][number]["modelRuntimeFrame"]
    >
  >
): VfxEmitterRuntimePackage[] {
  return (runtimeEmitters ?? []).map((emitter) => {
    const lane = emitter.renderContract.chunkLane;
    if (!lane) return emitter;
    const renderContract = {
      ...emitter.renderContract,
      chunkLane: {
        ...lane,
        particleInstances: lane.particleInstances.map((particle) => {
          const frame = particle.modelInstanceRef
            ? framesByInstanceRef.get(particle.modelInstanceRef)
            : undefined;
          return frame ? { ...particle, modelRuntimeFrame: frame } : particle;
        })
      }
    };
    return { ...emitter, renderContract };
  });
}

function buildRuntimeTreeChildFrames(
  instances: ReadonlyMap<string, RuntimeTreeChildInstance>
): Map<
  string,
  NonNullable<
    NonNullable<
      NonNullable<VfxEmitterRuntimePackage["renderContract"]["chunkLane"]>
    >["particleInstances"][number]["modelRuntimeFrame"]
  >
> {
  const frames = new Map<
    string,
    NonNullable<
      NonNullable<
        NonNullable<VfxEmitterRuntimePackage["renderContract"]["chunkLane"]>
      >["particleInstances"][number]["modelRuntimeFrame"]
    >
  >();
  const ordered = [...instances.values()];
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    const instance = ordered[index]!;
    if (!instance.latestEnvelope?.vfx.runtimeEmitters) continue;
    const runtimeEmitters = attachRuntimeTreeChildFrames(
      instance.latestEnvelope.vfx.runtimeEmitters,
      frames
    ).map((emitter) => ({
      emitterIndex: emitter.emitterIndex,
      emitterNodeName: emitter.emitterNodeName,
      ...(emitter.selectedAnimation
        ? { selectedAnimation: emitter.selectedAnimation }
        : {}),
      runtimeState: {
        sourceClockSeconds: emitter.runtimeState.sourceClockSeconds,
        source: {
          nodeName: emitter.emitterNodeName,
          ...(emitter.runtimeState.source.simulation
            ? {
                simulation: {
                  inherit:
                    emitter.runtimeState.source.simulation.inherit === true,
                  inheritLocal:
                    emitter.runtimeState.source.simulation.inheritLocal === true,
                  inheritPart:
                    emitter.runtimeState.source.simulation.inheritPart === true
                }
              }
            : {})
        }
      },
      runtimeSnapshot: {
        activeParticleCount: emitter.runtimeSnapshot.activeParticles.length
      },
      renderContractFrame: {
        version: "aurora-vfx-child-render-contract-frame/v1" as const,
        activeParticleCount: emitter.renderContract.activeParticleCount,
        drawParticleCount: emitter.renderContract.drawParticleCount,
        verticesPerDrawParticle: emitter.renderContract.verticesPerDrawParticle,
        drawVertexCount: emitter.renderContract.drawVertexCount,
        drawLane: emitter.renderContract.drawLane,
        compactDrawRecords: emitter.renderContract.drawRecords.map(
          buildRuntimeTreeCompactDrawRecord
        ),
        ...(emitter.renderContract.chunkLane
          ? { chunkLane: emitter.renderContract.chunkLane }
          : {}),
        ...(emitter.renderContract.progFxType4Light
          ? { progFxType4Light: emitter.renderContract.progFxType4Light }
          : {})
      }
    }));
    frames.set(instance.modelInstanceRef, {
      version: "aurora-vfx-child-model-runtime-frame/v1",
      modelInstanceRef: instance.modelInstanceRef,
      ...(instance.source.command.sourceObjectKey
        ? { sourceModelObjectKey: instance.source.command.sourceObjectKey }
        : {}),
      localClockSeconds:
        instance.latestEnvelope.vfx.runtimeEmitters[0]?.runtimeState
          .sourceClockSeconds ?? 0,
      rngLineage: {
        algorithm: NWN_EE_VFX_RNG_ALGORITHM,
        initialSeed:
          instance.latestEnvelope.vfx.runtimeSharedRng?.initialState.seed ?? 0,
        finalSeed:
          instance.latestEnvelope.vfx.runtimeSharedRng?.finalState.seed ?? 0
      },
      runtimeEmitters
    });
  }
  return frames;
}

function buildRuntimeTreeCompactDrawRecord(
  record: AuroraParticleDrawRecord
): AuroraVfxChildParticleDrawFrame {
  return {
    drawRecordId: record.drawRecordId,
    lane: record.lane,
    particleId: record.particleId,
    particleIndex: record.particleIndex,
    ageSeconds: record.ageSeconds,
    lifetimeSeconds: record.lifetimeSeconds,
    ...(record.linkedNextParticleId !== undefined
      ? { linkedNextParticleId: record.linkedNextParticleId }
      : {}),
    ...(record.linkedNextPosition
      ? { linkedNextPosition: record.linkedNextPosition }
      : {}),
    ...(record.emitterOrientation
      ? { emitterOrientation: record.emitterOrientation }
      : {}),
    ...(record.particleOrientation
      ? { particleOrientation: record.particleOrientation }
      : {}),
    position: record.position,
    ...(record.previousPosition
      ? { previousPosition: record.previousPosition }
      : {}),
    velocity: record.velocity,
    ...(record.direction ? { direction: record.direction } : {}),
    landed: record.landed,
    ...(record.contactNormal ? { contactNormal: record.contactNormal } : {}),
    splat: record.splat,
    ...(record.inheritedVelocityMagnitude !== undefined
      ? { inheritedVelocityMagnitude: record.inheritedVelocityMagnitude }
      : {}),
    ...(record.inheritedVelocityDirection
      ? { inheritedVelocityDirection: record.inheritedVelocityDirection }
      : {}),
    inheritPart: record.inheritPart,
    rotationRadians: record.rotationRadians,
    color: record.color,
    alpha: record.alpha,
    size: record.size,
    atlasUv: record.atlasUv,
    diagnostics: record.diagnostics
  };
}

function buildRuntimeAndRender(
  sourceEmitters: AuroraMdlEmitterNode[],
  sourceEmitterMaterials: VfxEmitterMaterialStateInput[],
  dependencyGraph: AuroraVfxDependencyGraph,
  runtimeOptions: VfxProcessCommand["runtime"],
  sourceModelGraph?: VfxProcessCommand["sourceModelGraph"],
  sourceAnimationEvents: AuroraMdlAnimationEvent[] = [],
  phaseSchedule?: AuroraVfxPhaseSchedule,
  progFxRows?: AuroraProgFxSourceRow[]
) {
  const runtime = normalizeRuntimeOptions(runtimeOptions);
  const runtimeContext = resolveRuntimeContext(runtimeOptions);
  const type7BeamOwner = resolveProgFxType7BeamOwner(phaseSchedule, progFxRows);
  const type10ProjectileOwner = resolveProgFxType10ProjectileOwner(phaseSchedule, progFxRows);
  const type10ProjectileResolution = type10ProjectileOwner
    ? resolveAuroraProgFxType10ProjectileTrajectory(
        type10ProjectileOwner.type10Projectile ?? {},
        runtimeContext?.progFxType10Projectile
      )
    : undefined;
  const type10ProjectileTrajectory =
    type10ProjectileResolution?.status === "ready"
      ? type10ProjectileResolution.trajectory
      : undefined;
  const type10ProjectileDiagnostics: AuroraVfxDiagnostic[] =
    type10ProjectileResolution?.status === "blocked"
      ? [
          {
            code: type10ProjectileResolution.code,
            severity: "error",
            message: type10ProjectileResolution.message
          }
        ]
      : [];
  const sourceOwnerEntries: Array<{
    sourceEmitter: AuroraMdlEmitterNode;
    aoeVisualOwner?: AuroraAoeVisualFootprintOwner;
  }> = runtime.aoeVisualRuntime
    ? runtime.aoeVisualRuntime.contract.owners.flatMap((aoeVisualOwner) =>
        sourceEmitters.map((sourceEmitter) => ({ sourceEmitter, aoeVisualOwner }))
      )
    : sourceEmitters.map((sourceEmitter) => ({ sourceEmitter }));
  const initialSourceTimeSeconds = runtime.sourceClockOffsetSeconds;
  const entries = sourceOwnerEntries.map((sourceOwnerEntry, emitterIndex) => {
    const { sourceEmitter } = sourceOwnerEntry;
    const initialAoeVisualOwner = sourceOwnerEntry.aoeVisualOwner
      ? resolveAoeVisualOwnerSnapshot(
          runtime,
          sourceOwnerEntry.aoeVisualOwner,
          initialSourceTimeSeconds
        )
      : undefined;
    const initialObjectDurationVisualOwner =
      resolveObjectDurationVisualOwnerSnapshot(runtime, initialSourceTimeSeconds);
    const initialAnimation = resolveEntryRuntimeAnimationBoundary(
      sourceEmitter,
      runtime,
      0,
      initialAoeVisualOwner,
      initialObjectDurationVisualOwner
    );
    const initialSourceEmitter = applyObjectDurationVisualOwnerToEmitter(
      applyAoeVisualOwnerToEmitter(
        resolveProgFxType10ProjectileEmitterTransform(
          resolveEffectBeamType7EmitterTransform(
            resolveDirectAnimationPassEmitter(
              resolveBaseEmitterTransformAtTime(
                sourceEmitter,
                initialSourceTimeSeconds
              ),
              initialAnimation
            ),
            sourceModelGraph,
            initialSourceTimeSeconds,
            initialAnimation,
            type7BeamOwner,
            runtimeContext
          ),
          sourceModelGraph,
          initialSourceTimeSeconds,
          initialAnimation,
          type10ProjectileTrajectory
        ),
        initialAoeVisualOwner
      ),
      initialObjectDurationVisualOwner
    );
    const continuedState = runtime.initialEmitterStates?.[emitterIndex];
    const runtimeState =
      continuedState &&
      continuedState.emitterNodeName.trim().toLowerCase() ===
        sourceEmitter.nodeName.trim().toLowerCase()
        ? structuredClone(continuedState.runtimeState)
        : createAuroraEmitterRuntimeState(initialSourceEmitter, {
            executionParticleBudget: runtime.executionParticleBudget,
            ...(runtime.particleLimit !== undefined
              ? { particleLimit: runtime.particleLimit }
              : {}),
            rngAlgorithm: NWN_EE_VFX_RNG_ALGORITHM,
            seed: runtime.initialRngState.seed
          });
    return {
      emitterIndex,
      sourceEmitter,
      ...(sourceOwnerEntry.aoeVisualOwner
        ? { aoeVisualOwnerContract: sourceOwnerEntry.aoeVisualOwner }
        : {}),
      ...(initialAoeVisualOwner ? { aoeVisualOwner: initialAoeVisualOwner } : {}),
      ...(initialObjectDurationVisualOwner
        ? { objectDurationVisualOwner: initialObjectDurationVisualOwner }
        : {}),
      materialState: resolveEmitterMaterialState(
        sourceEmitterMaterials,
        emitterIndex,
        sourceEmitter.nodeName
      ),
      runtimeSourceEmitter: initialSourceEmitter,
      runtimeState,
      tickTraces: [] as AuroraVfxTickTrace[],
      runtimeFrames: [] as NonNullable<VfxEmitterRuntimePackage["runtimeFrames"]>
    };
  });
  entries.forEach((entry) => {
    entry.runtimeFrames.push(
      buildEmitterRuntimeFrame(
        entry.runtimeState,
        entry.runtimeSourceEmitter,
        entry.materialState,
        dependencyGraph,
        phaseSchedule,
        progFxRows,
        0,
        resolveEntryRuntimeAnimationBoundary(
          entry.sourceEmitter,
          runtime,
          0,
          entry.aoeVisualOwner,
          entry.objectDurationVisualOwner
        ),
        resolveAuroraProgFxType10ProjectileOwnerTransform(type10ProjectileTrajectory, 0),
        undefined,
        entry.aoeVisualOwner,
        entry.objectDurationVisualOwner
      )
    );
  });
  let windManagerState = runtime.windManager
    ? createAuroraWindManagerState(runtime.windManager)
    : undefined;
  const simulationSubstepCount = Math.max(
    1,
    Math.ceil(runtime.dtSeconds / runtime.simulationStepSeconds)
  );
  const simulationDtSeconds = runtime.dtSeconds / simulationSubstepCount;
  const initialSharedEmitterRngState: AuroraDeterministicRngState = {
    ...runtime.initialRngState
  };
  let sharedEmitterRngState: AuroraDeterministicRngState = {
    ...initialSharedEmitterRngState
  };
  for (let tickIndex = 0; tickIndex < runtime.tickCount; tickIndex += 1) {
    const tickTraceStates = entries.map((entry) => ({
      activeParticleIdsBefore: [...entry.runtimeState.activeParticleIds],
      callbackTraceStart: entry.runtimeState.detonateCallbackTrace.length,
      eventRowsFired: [] as AuroraVfxTickTrace["eventScan"]["eventRowsFired"],
      detonateFieldKey: undefined as string | undefined
    }));
    for (let substepIndex = 0; substepIndex < simulationSubstepCount; substepIndex += 1) {
      windManagerState = windManagerState
        ? tickAuroraWindManager(windManagerState, simulationDtSeconds)
        : undefined;
      const windContext = windManagerState
        ? createAuroraWindContext(windManagerState)
        : undefined;
      const previousBoundaryIndex = tickIndex + substepIndex / simulationSubstepCount;
      const currentBoundaryIndex = tickIndex + (substepIndex + 1) / simulationSubstepCount;
      const previousTimeSeconds =
        runtime.sourceClockOffsetSeconds + previousBoundaryIndex * runtime.dtSeconds;
      const currentTimeSeconds =
        runtime.sourceClockOffsetSeconds + currentBoundaryIndex * runtime.dtSeconds;
      entries.forEach((entry, entryIndex) => {
        const { sourceEmitter } = entry;
        const previousAoeVisualOwner = entry.aoeVisualOwnerContract
          ? resolveAoeVisualOwnerSnapshot(
              runtime,
              entry.aoeVisualOwnerContract,
              previousTimeSeconds
            )
          : undefined;
        const currentAoeVisualOwner = entry.aoeVisualOwnerContract
          ? resolveAoeVisualOwnerSnapshot(
              runtime,
              entry.aoeVisualOwnerContract,
              currentTimeSeconds
            )
          : undefined;
        const previousObjectDurationVisualOwner =
          resolveObjectDurationVisualOwnerSnapshot(runtime, previousTimeSeconds);
        const currentObjectDurationVisualOwner =
          resolveObjectDurationVisualOwnerSnapshot(runtime, currentTimeSeconds);
        const previousAnimation = resolveEntryRuntimeAnimationBoundary(
          sourceEmitter,
          runtime,
          previousBoundaryIndex,
          previousAoeVisualOwner,
          previousObjectDurationVisualOwner
        );
        const currentAnimationBoundary = resolveEntryRuntimeAnimationBoundary(
          sourceEmitter,
          runtime,
          currentBoundaryIndex,
          currentAoeVisualOwner,
          currentObjectDurationVisualOwner
        );
        const currentAnimation =
          currentAnimationBoundary &&
          shouldIncludeAnimationOrigin(previousAnimation, currentAnimationBoundary)
            ? { ...currentAnimationBoundary, includesAnimationOrigin: true }
            : currentAnimationBoundary;
        const previousSourceEmitter = applyObjectDurationVisualOwnerToEmitter(
          applyAoeVisualOwnerToEmitter(
            resolveProgFxType10ProjectileEmitterTransform(
              resolveEffectBeamType7EmitterTransform(
                resolveDirectAnimationPassEmitter(
                  resolveBaseEmitterTransformAtTime(sourceEmitter, previousTimeSeconds),
                  previousAnimation
                ),
                sourceModelGraph,
                previousTimeSeconds,
                previousAnimation,
                type7BeamOwner,
                runtimeContext
              ),
              sourceModelGraph,
              previousTimeSeconds,
              previousAnimation,
              type10ProjectileTrajectory
            ),
            previousAoeVisualOwner
          ),
          previousObjectDurationVisualOwner
        );
        entry.runtimeSourceEmitter = applyObjectDurationVisualOwnerToEmitter(
          applyAoeVisualOwnerToEmitter(
            resolveProgFxType10ProjectileEmitterTransform(
              resolveEffectBeamType7EmitterTransform(
                resolveDirectAnimationPassEmitter(
                  resolveBaseEmitterTransformAtTime(sourceEmitter, currentTimeSeconds),
                  currentAnimation
                ),
                sourceModelGraph,
                currentTimeSeconds,
                currentAnimation,
                type7BeamOwner,
                runtimeContext
              ),
              sourceModelGraph,
              currentTimeSeconds,
              currentAnimation,
              type10ProjectileTrajectory
            ),
            currentAoeVisualOwner
          ),
          currentObjectDurationVisualOwner
        );
        entry.aoeVisualOwner = currentAoeVisualOwner;
        entry.objectDurationVisualOwner = currentObjectDurationVisualOwner;
        const stepRuntime = {
          ...runtime,
          dtSeconds: simulationDtSeconds,
          animation: currentAnimation
        };
        const detonateEventContext = resolveSourceAnimationDetonateContext(
          sourceEmitter,
          currentAnimation,
          sourceAnimationEvents,
          entry.runtimeState.family === "Explosion"
        );
        const detonateFieldContext = resolveDirectDetonateFieldContext(
          entry.runtimeSourceEmitter,
          currentAnimation
        );
        const traceState = tickTraceStates[entryIndex]!;
        traceState.eventRowsFired.push(...detonateEventContext.eventRowsFired);
        if (detonateFieldContext.detonateFieldKey) {
          traceState.detonateFieldKey = detonateFieldContext.detonateFieldKey;
        }
        const emitterGraphMotionContexts = type7BeamOwner || type10ProjectileTrajectory
          ? {}
          : resolveEmitterParentMotionContexts(
              previousSourceEmitter,
              entry.runtimeSourceEmitter,
              sourceModelGraph,
              stepRuntime,
              previousTimeSeconds,
              currentTimeSeconds
            );
        entry.runtimeState = {
          ...entry.runtimeState,
          source: buildEvaluatedRuntimeEmitterSource(
            entry.runtimeState.source,
            entry.runtimeSourceEmitter
          )
        };
        const targetContext = type7BeamOwner
          ? resolveEffectBeamType7TargetContext(
              phaseSchedule,
              runtimeContext,
              currentTimeSeconds
            )
          : resolveEmitterReferenceTargetContext(
              entry.runtimeSourceEmitter,
              sourceModelGraph,
              stepRuntime
            );
        const visualOwnerStates = [
          currentAoeVisualOwner
            ? currentAoeVisualOwner.phase !== "released"
            : undefined,
          currentObjectDurationVisualOwner?.active
        ].filter((value): value is boolean => value !== undefined);
        entry.runtimeState = tickAuroraEmitterRuntime({
          ...entry.runtimeState,
          rng: { ...sharedEmitterRngState }
        }, simulationDtSeconds, {
          ...(runtimeContext ?? {}),
          ...(visualOwnerStates.length > 0
            ? { visualOwnerActive: visualOwnerStates.every(Boolean) }
            : {}),
          ...(type10ProjectileTrajectory
            ? {
                progFxType10ProjectileActive:
                  resolveAuroraProgFxType10ProjectileOwnerTransform(
                    type10ProjectileTrajectory,
                    currentTimeSeconds
                  )?.active
              }
            : {}),
          ...targetContext,
          ...detonateEventContext,
          ...detonateFieldContext,
          sourceMotion: resolveRuntimeEmitterSourceMotionContext(
            runtimeContext,
            previousSourceEmitter,
            entry.runtimeSourceEmitter,
            previousTimeSeconds,
            currentTimeSeconds,
            simulationDtSeconds,
            emitterGraphMotionContexts.sourceMotion
          ),
          ...(emitterGraphMotionContexts.ownerMotion
            ? { ownerMotion: emitterGraphMotionContexts.ownerMotion }
            : {}),
          ...(emitterGraphMotionContexts.partMotion
            ? { partMotion: emitterGraphMotionContexts.partMotion }
            : {}),
          ...(windContext ? { windContext } : {})
        });
        sharedEmitterRngState = { ...entry.runtimeState.rng };
      });
    }
    entries.forEach((entry, entryIndex) => {
      const traceState = tickTraceStates[entryIndex]!;
      const currentAnimation = resolveEntryRuntimeAnimationBoundary(
        entry.sourceEmitter,
        runtime,
        tickIndex + 1,
        entry.aoeVisualOwner,
        entry.objectDurationVisualOwner
      );
      entry.tickTraces.push(
        buildAuroraVfxTickTrace({
          tickIndex: tickIndex + 1,
          sourceEmitter: entry.sourceEmitter,
          evaluatedEmitter: entry.runtimeSourceEmitter,
          selectedAnimation: currentAnimation,
          eventRowsFired: traceState.eventRowsFired,
          detonateFieldKey: traceState.detonateFieldKey,
          callbacksFired: entry.runtimeState.detonateCallbackTrace.slice(
            traceState.callbackTraceStart
          ),
          activeParticleIdsBefore: traceState.activeParticleIdsBefore,
          runtimeState: entry.runtimeState
        })
      );
    });
    entries.forEach((entry) => {
      entry.runtimeFrames.push(
        buildEmitterRuntimeFrame(
          entry.runtimeState,
          entry.runtimeSourceEmitter,
          entry.materialState,
          dependencyGraph,
          phaseSchedule,
          progFxRows,
          tickIndex + 1,
          resolveEntryRuntimeAnimationBoundary(
            entry.sourceEmitter,
            runtime,
            tickIndex + 1,
            entry.aoeVisualOwner,
            entry.objectDurationVisualOwner
          ),
          resolveAuroraProgFxType10ProjectileOwnerTransform(
            type10ProjectileTrajectory,
            (tickIndex + 1) * runtime.dtSeconds
          ),
          entry.tickTraces[tickIndex],
          entry.aoeVisualOwner,
          entry.objectDurationVisualOwner
        )
      );
    });
  }
  const runtimeEmitters: VfxEmitterRuntimePackage[] = entries.map((entry) => {
    const runtimeSnapshot = buildAuroraEmitterRuntimeSnapshot(entry.runtimeState);
    const renderContract = buildAuroraVfxRuntimeRenderContract({
      runtimeState: entry.runtimeState,
      sourceEmitter: entry.runtimeSourceEmitter,
      materialState: entry.materialState,
      dependencyGraph,
      phaseSchedule,
      progFxRows
    });
    return {
      emitterIndex: entry.emitterIndex,
      emitterNodeName: entry.runtimeSourceEmitter.nodeName,
      ...(runtime.animation &&
      !runtime.aoeVisualRuntime &&
      !runtime.objectDurationVisualRuntime
        ? { selectedAnimation: runtime.animation }
        : {}),
      runtimeState: entry.runtimeState,
      runtimeSnapshot,
      renderContract,
      ...(entry.aoeVisualOwner ? { aoeVisualOwner: entry.aoeVisualOwner } : {}),
      ...(entry.objectDurationVisualOwner
        ? { objectDurationVisualOwner: entry.objectDurationVisualOwner }
        : {}),
      ...(resolveAuroraProgFxType10ProjectileOwnerTransform(
        type10ProjectileTrajectory,
        entry.runtimeState.sourceClockSeconds
      )
        ? {
            sourceOwnerTransform: resolveAuroraProgFxType10ProjectileOwnerTransform(
              type10ProjectileTrajectory,
              entry.runtimeState.sourceClockSeconds
            )
          }
        : {}),
      tickTraces: entry.tickTraces,
      runtimeFrames: entry.runtimeFrames
    };
  });
  return {
    runtimeEmitters,
    diagnostics: type10ProjectileDiagnostics,
    runtimeSharedRng: {
      version: "aurora-vfx-shared-rng-lineage/v1" as const,
      initialState: initialSharedEmitterRngState,
      finalState: sharedEmitterRngState,
      schedulerOrder:
        "model-instance-insertion-order-then-emitter-source-order" as const
    },
    ...(windManagerState ? { windManagerSnapshot: windManagerState } : {})
  };
}

function resolveProgFxType7BeamOwner(
  phaseSchedule: AuroraVfxPhaseSchedule | undefined,
  progFxRows: AuroraProgFxSourceRow[] | undefined
): AuroraProgFxSourceRow | undefined {
  if (phaseSchedule?.effectInstance?.constructorKind !== "EffectBeam" || !progFxRows?.length) {
    return undefined;
  }
  const linkedRowIds = new Set(
    phaseSchedule.phases.flatMap((phase) =>
      typeof phase.progFxRowId === "number" ? [phase.progFxRowId] : []
    )
  );
  return progFxRows.find((row) => linkedRowIds.has(row.rowId) && row.type === 7 && row.type7Beam);
}

function resolveProgFxType10ProjectileOwner(
  phaseSchedule: AuroraVfxPhaseSchedule | undefined,
  progFxRows: AuroraProgFxSourceRow[] | undefined
): AuroraProgFxSourceRow | undefined {
  if (
    phaseSchedule?.effectInstance?.constructorKind !== "EffectVisualEffect" ||
    !progFxRows?.length
  ) {
    return undefined;
  }
  const linkedRowIds = new Set(
    phaseSchedule.phases.flatMap((phase) =>
      typeof phase.progFxRowId === "number" ? [phase.progFxRowId] : []
    )
  );
  return progFxRows.find(
    (row) => linkedRowIds.has(row.rowId) && row.type === 10 && row.type10Projectile
  );
}

function resolveEffectBeamType7TargetContext(
  phaseSchedule: AuroraVfxPhaseSchedule | undefined,
  context: AuroraEmitterRuntimeContext | undefined,
  sourceTimeSeconds: number
): AuroraEmitterRuntimeContext {
  const attachment = resolveEffectBeamAttachmentAtTime(context, sourceTimeSeconds);
  return {
    targetRef: attachment?.targetRef ?? phaseSchedule?.effectInstance?.targetRef,
    targetPosition: attachment?.targetPosition,
    targetForward: attachment?.targetForward,
    ...(attachment ? { effectBeamAttachment: attachment } : {}),
    targetContextSource: attachment
      ? "effect-beam-type7-reference-reattach"
      : undefined
  };
}

function resolveEffectBeamType7EmitterTransform(
  emitter: AuroraMdlEmitterNode,
  sourceModelGraph: VfxProcessCommand["sourceModelGraph"],
  sourceTimeSeconds: number,
  animation: NormalizedRuntimeAnimation | undefined,
  type7BeamOwner: AuroraProgFxSourceRow | undefined,
  context: AuroraEmitterRuntimeContext | undefined
): AuroraMdlEmitterNode {
  const attachment = resolveEffectBeamAttachmentAtTime(context, sourceTimeSeconds);
  if (!type7BeamOwner || !attachment) {
    return emitter;
  }
  const modelWorld = sourceModelGraph?.nodes.length
    ? resolveGraphNodeWorldTransform(
        sourceModelGraph,
        emitter.nodeName,
        sourceTimeSeconds,
        animation,
        animation?.currentTimeSeconds
      )
    : undefined;
  const rootWorld = resolveEffectBeamType7RootTransform(attachment, sourceTimeSeconds);
  const emitterWorld = composeGraphTransforms(
    rootWorld,
    modelWorld ?? evaluatedGraphTransformFromEmitter(emitter)
  );
  return {
    ...emitter,
    transform: {
      ...emitter.transform,
      position: emitterWorld.position,
      orientation: emitterWorld.orientation,
      scale: emitterWorld.scale
    }
  };
}

function resolveProgFxType10ProjectileEmitterTransform(
  emitter: AuroraMdlEmitterNode,
  sourceModelGraph: VfxProcessCommand["sourceModelGraph"],
  sourceTimeSeconds: number,
  animation: NormalizedRuntimeAnimation | undefined,
  trajectory: AuroraProgFxType10ProjectileTrajectory | undefined
): AuroraMdlEmitterNode {
  const ownerTransform = resolveAuroraProgFxType10ProjectileOwnerTransform(
    trajectory,
    sourceTimeSeconds
  );
  if (!ownerTransform) {
    return emitter;
  }
  const modelWorld = sourceModelGraph?.nodes.length
    ? resolveGraphNodeWorldTransform(
        sourceModelGraph,
        emitter.nodeName,
        sourceTimeSeconds,
        animation,
        animation?.currentTimeSeconds
      )
    : undefined;
  const emitterWorld = composeGraphTransforms(
    {
      position: ownerTransform.position,
      orientation: { axis: [0, 0, 1], angleRadians: 0 },
      scale: 1
    },
    modelWorld ?? evaluatedGraphTransformFromEmitter(emitter)
  );
  return {
    ...emitter,
    transform: {
      ...emitter.transform,
      position: emitterWorld.position,
      orientation: emitterWorld.orientation,
      scale: emitterWorld.scale
    }
  };
}

function resolveEffectBeamAttachmentAtTime(
  context: AuroraEmitterRuntimeContext | undefined,
  sourceTimeSeconds: number
): AuroraEmitterRuntimeContext["effectBeamAttachment"] {
  return context?.effectBeamAttachmentResolver?.resolve(sourceTimeSeconds)
    ?? context?.effectBeamAttachment;
}

function resolveEffectBeamType7RootTransform(
  attachment: NonNullable<AuroraEmitterRuntimeContext["effectBeamAttachment"]>,
  sourceTimeSeconds: number
): EvaluatedGraphTransform {
  const sourceOrientation = attachment.sourceOrientation ?? {
    axis: [0, 0, 1] as [number, number, number],
    angleRadians: 0
  };
  const sourcePosition: [number, number, number] = [
    attachment.sourcePosition.x,
    attachment.sourcePosition.y,
    attachment.sourcePosition.z
  ];
  let rootOrientation = sourceOrientation;
  if (sourceTimeSeconds <= 0) {
    const sourceQuaternion = orientationToQuaternion(sourceOrientation);
    const currentRootZ = rotateTupleByQuaternion([0, 0, 1], sourceQuaternion);
    const targetDelta: [number, number, number] = [
      attachment.targetPosition.x - sourcePosition[0],
      attachment.targetPosition.y - sourcePosition[1],
      attachment.targetPosition.z - sourcePosition[2]
    ];
    // ReattachReference writes qArc*qRoot once. The first subsequent
    // CAurBehaviorAttach control copies the live source-part orientation over it.
    rootOrientation = quaternionToOrientation(
      multiplyQuaternions(
        rotationArcQuaternion(currentRootZ, targetDelta),
        sourceQuaternion
      )
    );
  }
  return {
    position: sourcePosition,
    orientation: rootOrientation,
    scale: 1
  };
}

function buildEmitterRuntimeFrame(
  runtimeState: AuroraEmitterRuntimeState,
  runtimeSourceEmitter: AuroraMdlEmitterNode,
  materialState: AuroraVfxMaterialSourceState | undefined,
  dependencyGraph: AuroraVfxDependencyGraph,
  phaseSchedule: AuroraVfxPhaseSchedule | undefined,
  progFxRows: AuroraProgFxSourceRow[] | undefined,
  tickIndex: number,
  selectedAnimation: NormalizedRuntimeAnimation | undefined,
  sourceOwnerTransform?: NonNullable<
    VfxEmitterRuntimePackage["runtimeFrames"]
  >[number]["sourceOwnerTransform"],
  tickTrace?: AuroraVfxTickTrace,
  aoeVisualOwner?: AuroraAoeVisualOwnerRuntimeSnapshot,
  objectDurationVisualOwner?: AuroraObjectDurationVisualOwnerSnapshot
): NonNullable<VfxEmitterRuntimePackage["runtimeFrames"]>[number] {
  return {
    tickIndex,
    timeSeconds: runtimeState.sourceClockSeconds,
    ...(selectedAnimation ? { selectedAnimation } : {}),
    runtimeState,
    runtimeSnapshot: buildAuroraEmitterRuntimeSnapshot(runtimeState),
    ...(sourceOwnerTransform ? { sourceOwnerTransform } : {}),
    ...(aoeVisualOwner ? { aoeVisualOwner } : {}),
    ...(objectDurationVisualOwner
      ? { objectDurationVisualOwner }
      : {}),
    ...(tickTrace ? { tickTrace } : {}),
    renderContract: buildAuroraVfxRuntimeRenderContract({
      runtimeState,
      sourceEmitter: runtimeSourceEmitter,
      materialState,
      dependencyGraph,
      phaseSchedule,
      progFxRows
    })
  };
}

function buildAuroraVfxTickTrace(input: {
  tickIndex: number;
  sourceEmitter: AuroraMdlEmitterNode;
  evaluatedEmitter: AuroraMdlEmitterNode;
  selectedAnimation: NormalizedRuntimeAnimation | undefined;
  eventRowsFired: AuroraVfxTickTrace["eventScan"]["eventRowsFired"];
  detonateFieldKey?: string;
  callbacksFired: AuroraEmitterRuntimeState["detonateCallbackTrace"];
  activeParticleIdsBefore: number[];
  runtimeState: AuroraEmitterRuntimeState;
}): AuroraVfxTickTrace {
  const sourcePass = input.selectedAnimation
    ? input.sourceEmitter.animationPasses?.find(
        (pass) =>
          pass.animationName.trim().toLowerCase() ===
          input.selectedAnimation!.animationName.trim().toLowerCase()
      )
    : undefined;
  return {
    version: "aurora-vfx-tick-trace/v1",
    tickIndex: input.tickIndex,
    stageOrder: [
      "source_snapshot",
      "animation_evaluation",
      "event_scan",
      "event_callbacks",
      "family_update",
      "post_update_state",
      "render_input"
    ],
    sourceSnapshot: buildEmitterEvaluationSnapshot(input.sourceEmitter),
    evaluatedSnapshot: buildEmitterEvaluationSnapshot(input.evaluatedEmitter),
    animationEvaluation: {
      passApplied: Boolean(sourcePass),
      ...(input.selectedAnimation
        ? {
            animationName: input.selectedAnimation.animationName,
            previousTimeSeconds: input.selectedAnimation.previousTimeSeconds,
            currentTimeSeconds: input.selectedAnimation.currentTimeSeconds,
            blendWeight: input.selectedAnimation.blendWeight
          }
        : {}),
      ...(typeof sourcePass?.transitionSeconds === "number"
        ? { sourceTransitionSeconds: sourcePass.transitionSeconds }
        : {}),
      blendEquation: "evaluated*weight+existing*(1-weight)"
    },
    eventScan: {
      ...(input.selectedAnimation
        ? {
            animationName: input.selectedAnimation.animationName,
            previousTimeSeconds: input.selectedAnimation.previousTimeSeconds,
            currentTimeSeconds: input.selectedAnimation.currentTimeSeconds
          }
        : {}),
      wraps: Boolean(
        input.selectedAnimation &&
          input.selectedAnimation.currentTimeSeconds < input.selectedAnimation.previousTimeSeconds
      ),
      includesAnimationOrigin: input.selectedAnimation?.includesAnimationOrigin === true,
      eventRowsFired: input.eventRowsFired.map((event) => ({ ...event })),
      ...(input.detonateFieldKey ? { detonateFieldKey: input.detonateFieldKey } : {})
    },
    eventCallbacks: input.callbacksFired.map((entry) => ({ ...entry })),
    familyUpdate: {
      family: input.runtimeState.family,
      activeParticleIdsBefore: [...input.activeParticleIdsBefore],
      activeParticleIdsAfter: [...input.runtimeState.activeParticleIds],
      diagnosticCodes: input.runtimeState.lastTickDiagnostics.map((entry) => entry.code)
    },
    postUpdateState: {
      localClockSeconds: input.runtimeState.localClockSeconds,
      sourceClockSeconds: input.runtimeState.sourceClockSeconds,
      activeParticleIds: [...input.runtimeState.activeParticleIds],
      freeParticleIds: [...input.runtimeState.freeParticleIds]
    },
    renderInput: {
      activeParticleIds: [...input.runtimeState.activeParticleIds],
      ...(input.evaluatedEmitter.renderModeRaw
        ? { renderModeRaw: input.evaluatedEmitter.renderModeRaw }
        : {}),
      ...(input.evaluatedEmitter.blendModeRaw
        ? { blendModeRaw: input.evaluatedEmitter.blendModeRaw }
        : {}),
      ...(input.evaluatedEmitter.chunkName ? { chunkName: input.evaluatedEmitter.chunkName } : {})
    }
  };
}

function buildEmitterEvaluationSnapshot(
  emitter: AuroraMdlEmitterNode
): AuroraVfxTickTrace["sourceSnapshot"] {
  return {
    emitterNodeName: emitter.nodeName,
    ...(emitter.emitterType ? { emitterType: emitter.emitterType } : {}),
    ...(emitter.renderModeRaw ? { renderModeRaw: emitter.renderModeRaw } : {}),
    ...(emitter.blendModeRaw ? { blendModeRaw: emitter.blendModeRaw } : {}),
    ...(emitter.chunkName ? { chunkName: emitter.chunkName } : {}),
    ...(emitter.simulation ? { simulation: emitter.simulation } : {}),
    ...(emitter.transform ? { transform: emitter.transform } : {})
  };
}

function buildEvaluatedRuntimeEmitterSource(
  current: AuroraEmitterRuntimeState["source"],
  emitter: AuroraMdlEmitterNode
): AuroraEmitterRuntimeState["source"] {
  return {
    ...current,
    ...(emitter.emitterType ? { emitterType: emitter.emitterType } : {}),
    ...(emitter.chunkName ? { chunkName: emitter.chunkName } : {}),
    ...(emitter.simulation ? { simulation: emitter.simulation } : {}),
    ...(emitter.sourceState ? { sourceState: emitter.sourceState } : {}),
    ...(emitter.atlas ? { atlas: emitter.atlas } : {}),
    ...(emitter.transform ? { transform: emitter.transform } : {}),
    ...(emitter.renderModeRaw ?? emitter.renderMode
      ? { renderModeRaw: emitter.renderModeRaw ?? emitter.renderMode }
      : {})
  };
}

function resolveEmitterSourceMotionContext(
  previousEmitter: AuroraMdlEmitterNode,
  currentEmitter: AuroraMdlEmitterNode,
  deltaSeconds: number
): NonNullable<AuroraEmitterRuntimeContext["sourceMotion"]> {
  const previousPosition = previousEmitter.transform?.position ?? [0, 0, 0];
  const currentPosition = currentEmitter.transform?.position ?? [0, 0, 0];
  return {
    previousPosition: {
      x: previousPosition[0],
      y: previousPosition[1],
      z: previousPosition[2]
    },
    currentPosition: {
      x: currentPosition[0],
      y: currentPosition[1],
      z: currentPosition[2]
    },
    ...(previousEmitter.transform?.orientation
      ? { previousOrientation: previousEmitter.transform.orientation }
      : {}),
    ...(currentEmitter.transform?.orientation
      ? { currentOrientation: currentEmitter.transform.orientation }
      : {}),
    ...(typeof previousEmitter.transform?.scale === "number"
      ? { previousScale: previousEmitter.transform.scale }
      : {}),
    ...(typeof currentEmitter.transform?.scale === "number"
      ? { currentScale: currentEmitter.transform.scale }
      : {}),
    deltaSeconds
  };
}

function resolveRuntimeEmitterSourceMotionContext(
  context: AuroraEmitterRuntimeContext | undefined,
  previousEmitter: AuroraMdlEmitterNode,
  currentEmitter: AuroraMdlEmitterNode,
  previousTimeSeconds: number,
  currentTimeSeconds: number,
  deltaSeconds: number,
  modelGraphSourceMotion?: NonNullable<AuroraEmitterRuntimeContext["sourceMotion"]>
): NonNullable<AuroraEmitterRuntimeContext["sourceMotion"]> {
  const resolved = context?.sourceMotionResolver?.resolve({
    emitterNodeName: currentEmitter.nodeName,
    previousTimeSeconds,
    currentTimeSeconds,
    ...(previousEmitter.transform
      ? { previousTransform: previousEmitter.transform }
      : {}),
    ...(currentEmitter.transform
      ? { currentTransform: currentEmitter.transform }
      : {})
  });
  if (resolved) {
    return {
      ...resolved,
      deltaSeconds: resolved.deltaSeconds ?? deltaSeconds
    };
  }
  if (modelGraphSourceMotion) {
    return modelGraphSourceMotion;
  }
  return resolveEmitterSourceMotionContext(
    previousEmitter,
    currentEmitter,
    deltaSeconds
  );
}

function resolveEmitterReferenceTargetContext(
  emitter: AuroraMdlEmitterNode,
  sourceModelGraph: VfxProcessCommand["sourceModelGraph"],
  runtime: ReturnType<typeof normalizeRuntimeOptions>
): AuroraEmitterRuntimeContext {
  const directReferences = emitter.referenceNodes ?? [];
  if (directReferences.length !== 1 || !sourceModelGraph?.nodes.length) {
    return resolveAuroraEmitterSourceReferenceTargetContext(emitter);
  }
  const reference = directReferences[0]!;
  if (normalizeGraphNodeName(reference.parentNodeName) !== normalizeGraphNodeName(emitter.nodeName)) {
    return {};
  }
  const graphNode = sourceModelGraph.nodes.find(
    (candidate) =>
      normalizeGraphNodeName(candidate.nodeName) === normalizeGraphNodeName(reference.nodeName) &&
      normalizeGraphNodeName(candidate.parentNodeName) === normalizeGraphNodeName(emitter.nodeName)
  );
  if (!graphNode) {
    return resolveAuroraEmitterSourceReferenceTargetContext(emitter);
  }
  const evaluatedReference = resolveGraphNodeLocalTransform(
    graphNode,
    runtime.dtSeconds,
    runtime.animation,
    runtime.animation?.currentTimeSeconds
  );
  return resolveAuroraEmitterSourceReferenceTargetContext({
    ...emitter,
    referenceNodes: [
      {
        ...reference,
        transform: {
          ...reference.transform,
          position: evaluatedReference.position,
          orientation: evaluatedReference.orientation,
          scale: evaluatedReference.scale
        }
      }
    ]
  });
}

function resolveEmitterParentMotionContexts(
  previousEmitter: AuroraMdlEmitterNode,
  currentEmitter: AuroraMdlEmitterNode,
  sourceModelGraph: VfxProcessCommand["sourceModelGraph"],
  runtime: ReturnType<typeof normalizeRuntimeOptions>,
  previousTimeSeconds: number,
  currentTimeSeconds: number
): Pick<AuroraEmitterRuntimeContext, "sourceMotion" | "ownerMotion" | "partMotion"> {
  const parentNodeName = currentEmitter.parentNodeName?.trim();
  if (!parentNodeName || !sourceModelGraph?.nodes.length) {
    return {};
  }
  const previous = resolveGraphNodeWorldTransform(
    sourceModelGraph,
    parentNodeName,
    previousTimeSeconds,
    runtime.animation,
    runtime.animation?.previousTimeSeconds
  );
  const current = resolveGraphNodeWorldTransform(
    sourceModelGraph,
    parentNodeName,
    currentTimeSeconds,
    runtime.animation,
    runtime.animation?.currentTimeSeconds
  );
  if (!previous || !current) {
    return {};
  }
  const ownerMotion: NonNullable<AuroraEmitterRuntimeContext["ownerMotion"]> = {
    previousPosition: tupleToRuntimeVector(previous.position),
    currentPosition: tupleToRuntimeVector(current.position),
    previousOrientation: previous.orientation,
    currentOrientation: current.orientation,
    previousScale: previous.scale,
    currentScale: current.scale,
    deltaSeconds: runtime.dtSeconds
  };
  const previousEmitterWorld = composeGraphTransforms(
    previous,
    evaluatedGraphTransformFromEmitter(previousEmitter)
  );
  const currentEmitterWorld = composeGraphTransforms(
    current,
    evaluatedGraphTransformFromEmitter(currentEmitter)
  );
  return {
    sourceMotion: {
      previousPosition: tupleToRuntimeVector(previousEmitterWorld.position),
      currentPosition: tupleToRuntimeVector(currentEmitterWorld.position),
      previousOrientation: previousEmitterWorld.orientation,
      currentOrientation: currentEmitterWorld.orientation,
      previousScale: previousEmitterWorld.scale,
      currentScale: currentEmitterWorld.scale,
      deltaSeconds: runtime.dtSeconds
    },
    ownerMotion,
    partMotion: {
      previousPosition: tupleToRuntimeVector(previousEmitterWorld.position),
      currentPosition: tupleToRuntimeVector(currentEmitterWorld.position),
      previousOrientation: previous.orientation,
      currentOrientation: current.orientation,
      previousScale: previous.scale,
      currentScale: current.scale,
      deltaSeconds: runtime.dtSeconds
    }
  };
}

type EvaluatedGraphTransform = {
  position: [number, number, number];
  orientation: AuroraMdlOrientation;
  scale: number;
};

function evaluatedGraphTransformFromEmitter(
  emitter: AuroraMdlEmitterNode
): EvaluatedGraphTransform {
  return {
    position: emitter.transform?.position ?? [0, 0, 0],
    orientation:
      emitter.transform?.orientation ?? { axis: [0, 0, 1], angleRadians: 0 },
    scale:
      typeof emitter.transform?.scale === "number" && Number.isFinite(emitter.transform.scale)
        ? emitter.transform.scale
        : 1
  };
}

function resolveGraphNodeWorldTransform(
  sourceModelGraph: NonNullable<VfxProcessCommand["sourceModelGraph"]>,
  nodeName: string,
  sourceTimeSeconds: number,
  animation: NormalizedRuntimeAnimation | undefined,
  animationTimeSeconds: number | undefined,
  visited = new Set<string>()
): EvaluatedGraphTransform | undefined {
  const lookupName = normalizeGraphNodeName(nodeName);
  if (!lookupName || visited.has(lookupName)) {
    return undefined;
  }
  const node = sourceModelGraph.nodes.find(
    (candidate) => normalizeGraphNodeName(candidate.nodeName) === lookupName
  );
  if (!node) {
    return undefined;
  }
  visited.add(lookupName);
  const local = resolveGraphNodeLocalTransform(
    node,
    sourceTimeSeconds,
    animation,
    animationTimeSeconds
  );
  const parentName = node.parentNodeName?.trim();
  if (!parentName || normalizeGraphNodeName(parentName) === "null") {
    return local;
  }
  const parent = resolveGraphNodeWorldTransform(
    sourceModelGraph,
    parentName,
    sourceTimeSeconds,
    animation,
    animationTimeSeconds,
    visited
  );
  return parent ? composeGraphTransforms(parent, local) : local;
}

function resolveGraphNodeLocalTransform(
  node: NonNullable<VfxProcessCommand["sourceModelGraph"]>["nodes"][number],
  sourceTimeSeconds: number,
  animation: NormalizedRuntimeAnimation | undefined,
  animationTimeSeconds: number | undefined
): EvaluatedGraphTransform {
  const base = resolveTransformSnapshot(node.transform, sourceTimeSeconds);
  const animationTrack = animation
    ? node.animationTracks?.find(
        (track) => track.animationName.trim().toLowerCase() === animation.animationName.toLowerCase()
      )
    : undefined;
  const sampled = animationTrack
    ? sampleLinearAnimationTransform(
        animationTrack.transform,
        base,
        animationTimeSeconds ?? animation!.currentTimeSeconds,
        animation!.blendWeight
      )
    : base;
  return {
    position: sampled.position ?? [0, 0, 0],
    orientation: sampled.orientation ?? { axis: [0, 0, 1], angleRadians: 0 },
    scale:
      typeof sampled.scale === "number" && Number.isFinite(sampled.scale)
        ? sampled.scale
        : 1
  };
}

function resolveTransformSnapshot(
  transform: AuroraMdlTransform | undefined,
  timeSeconds: number
): AuroraMdlTransform {
  if (!transform) {
    return {};
  }
  const position = sampleAuroraVector3Keyframes(transform.positionTimeline, timeSeconds);
  const orientation = sampleSphericalOrientationKeyframes(
    transform.orientationTimeline,
    timeSeconds
  );
  const scale = sampleAuroraNumberKeyframes(transform.scaleTimeline, timeSeconds);
  return {
    ...transform,
    ...(position ? { position } : {}),
    ...(orientation ? { orientation } : {}),
    ...(scale !== undefined ? { scale } : {})
  };
}

function composeGraphTransforms(
  parent: EvaluatedGraphTransform,
  local: EvaluatedGraphTransform
): EvaluatedGraphTransform {
  const parentQuaternion = orientationToQuaternion(parent.orientation);
  const localQuaternion = orientationToQuaternion(local.orientation);
  const scaledLocalPosition: [number, number, number] = [
    local.position[0] * parent.scale,
    local.position[1] * parent.scale,
    local.position[2] * parent.scale
  ];
  const rotatedLocalPosition = rotateTupleByQuaternion(
    scaledLocalPosition,
    parentQuaternion
  );
  return {
    position: [
      parent.position[0] + rotatedLocalPosition[0],
      parent.position[1] + rotatedLocalPosition[1],
      parent.position[2] + rotatedLocalPosition[2]
    ],
    orientation: quaternionToOrientation(
      multiplyQuaternions(parentQuaternion, localQuaternion)
    ),
    scale: parent.scale * local.scale
  };
}

function multiplyQuaternions(
  [ax, ay, az, aw]: AuroraQuaternion,
  [bx, by, bz, bw]: AuroraQuaternion
): AuroraQuaternion {
  return normalizeQuaternion([
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz
  ]);
}

function rotateTupleByQuaternion(
  [x, y, z]: [number, number, number],
  quaternion: AuroraQuaternion
): [number, number, number] {
  const [qx, qy, qz, qw] = quaternion;
  const ix = qw * x + qy * z - qz * y;
  const iy = qw * y + qz * x - qx * z;
  const iz = qw * z + qx * y - qy * x;
  const iw = -qx * x - qy * y - qz * z;
  return [
    ix * qw + iw * -qx + iy * -qz - iz * -qy,
    iy * qw + iw * -qy + iz * -qx - ix * -qz,
    iz * qw + iw * -qz + ix * -qy - iy * -qx
  ];
}

function rotationArcQuaternion(
  source: [number, number, number],
  target: [number, number, number]
): AuroraQuaternion {
  const sourceLength = Math.hypot(...source);
  const targetLength = Math.hypot(...target);
  if (!(sourceLength > 1e-12) || !(targetLength > 1e-12)) {
    return [0, 0, 0, 1];
  }
  const from: [number, number, number] = [
    source[0] / sourceLength,
    source[1] / sourceLength,
    source[2] / sourceLength
  ];
  const to: [number, number, number] = [
    target[0] / targetLength,
    target[1] / targetLength,
    target[2] / targetLength
  ];
  const dot = from[0] * to[0] + from[1] * to[1] + from[2] * to[2];
  if (dot <= -1) {
    return [1, 0, 0, 0];
  }
  const scale = Math.sqrt(2 * (1 + dot));
  return normalizeQuaternion([
    (from[1] * to[2] - from[2] * to[1]) / scale,
    (from[2] * to[0] - from[0] * to[2]) / scale,
    (from[0] * to[1] - from[1] * to[0]) / scale,
    scale * 0.5
  ]);
}

function tupleToRuntimeVector([x, y, z]: [number, number, number]) {
  return { x, y, z };
}

function normalizeGraphNodeName(value: string | undefined): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function resolveBaseEmitterTransformAtTime(
  emitter: AuroraMdlEmitterNode,
  timeSeconds: number
): AuroraMdlEmitterNode {
  const transform = emitter.transform;
  if (!transform) return emitter;
  const position = sampleAuroraVector3Keyframes(transform.positionTimeline, timeSeconds);
  const orientation = sampleSphericalOrientationKeyframes(
    transform.orientationTimeline,
    timeSeconds
  );
  const scale = sampleAuroraNumberKeyframes(transform.scaleTimeline, timeSeconds);
  if (!position && !orientation && scale === undefined) return emitter;
  return {
    ...emitter,
    transform: {
      ...transform,
      ...(position ? { position } : {}),
      ...(orientation ? { orientation } : {}),
      ...(scale !== undefined ? { scale } : {})
    }
  };
}

function resolveDirectAnimationPassEmitter(
  emitter: AuroraMdlEmitterNode,
  animation: NormalizedRuntimeAnimation | undefined
): AuroraMdlEmitterNode {
  if (!animation) {
    return emitter;
  }
  const pass = emitter.animationPasses?.find((candidate) => candidate.animationName === animation.animationName);
  const state = pass?.emitterState;
  if (!state) {
    return emitter;
  }
  if (!state.simulation && !state.transform) {
    return emitter;
  }
  return {
    ...emitter,
    ...(state.simulation
      ? {
          simulation: {
            ...emitter.simulation,
            ...sampleLinearAnimationSimulation(
              state.simulation,
              emitter.simulation,
              animation.currentTimeSeconds,
              animation.blendWeight
            )
          }
        }
      : {}),
    ...(state.transform
      ? {
          transform: {
            ...emitter.transform,
            ...sampleLinearAnimationTransform(
              state.transform,
              emitter.transform,
              animation.currentTimeSeconds,
              animation.blendWeight
            )
          }
        }
      : {})
  };
}

function sampleLinearAnimationSimulation(
  simulation: AuroraMdlEmitterSimulation,
  baseSimulation: AuroraMdlEmitterSimulation | undefined,
  timeSeconds: number,
  blendWeight: number
): AuroraMdlEmitterSimulation {
  const sampled = { ...simulation } as AuroraMdlEmitterSimulation & Record<string, unknown>;
  const base = baseSimulation as (AuroraMdlEmitterSimulation & Record<string, unknown>) | undefined;
  Object.entries(simulation.timeline ?? {}).forEach(([field, frames]) => {
    const value = sampleAuroraNumberKeyframes(frames, timeSeconds);
    if (value !== undefined) {
      sampled[field] = blendLinearNumber(base?.[field], value, blendWeight);
    }
  });
  Object.entries(simulation.colorTimeline ?? {}).forEach(([field, frames]) => {
    const value = sampleAuroraVector3Keyframes(frames, timeSeconds);
    if (value !== undefined) {
      sampled[field] = blendLinearVector3(base?.[field], value, blendWeight);
    }
  });
  return sampled;
}

function sampleLinearAnimationTransform(
  transform: AuroraMdlTransform,
  baseTransform: AuroraMdlTransform | undefined,
  timeSeconds: number,
  blendWeight: number
): AuroraMdlTransform {
  const position = sampleAuroraVector3Keyframes(transform.positionTimeline, timeSeconds);
  const orientation = sampleSphericalOrientationKeyframes(
    transform.orientationTimeline,
    timeSeconds
  );
  const scale = sampleAuroraNumberKeyframes(transform.scaleTimeline, timeSeconds);
  return {
    ...transform,
    ...(position
      ? { position: blendLinearVector3(baseTransform?.position, position, blendWeight) }
      : {}),
    ...(orientation
      ? {
          orientation: blendSphericalOrientation(
            baseTransform?.orientation,
            orientation,
            blendWeight
          )
        }
      : {}),
    ...(scale !== undefined
      ? { scale: blendLinearNumber(baseTransform?.scale, scale, blendWeight) }
      : {})
  };
}

function blendLinearNumber(baseValue: unknown, evaluatedValue: number, blendWeight: number): number {
  return typeof baseValue === "number" && Number.isFinite(baseValue)
    ? evaluatedValue * blendWeight + baseValue * (1 - blendWeight)
    : evaluatedValue;
}

function blendLinearVector3(
  baseValue: unknown,
  evaluatedValue: [number, number, number],
  blendWeight: number
): [number, number, number] {
  if (!Array.isArray(baseValue) || baseValue.length < 3 || !baseValue.every(Number.isFinite)) {
    return evaluatedValue;
  }
  return [
    evaluatedValue[0] * blendWeight + baseValue[0] * (1 - blendWeight),
    evaluatedValue[1] * blendWeight + baseValue[1] * (1 - blendWeight),
    evaluatedValue[2] * blendWeight + baseValue[2] * (1 - blendWeight)
  ];
}

function sampleSphericalOrientationKeyframes(
  frames: ReadonlyArray<AuroraMdlOrientationKeyframe> | undefined,
  timeSeconds: number
): AuroraMdlOrientation | undefined {
  if (!frames || frames.length === 0) return undefined;
  if (frames.some((frame) => frame.interpolation === "bezier")) return undefined;
  const nextIndex = frames.findIndex((frame) => timeSeconds <= frame.time);
  if (nextIndex < 0) return frames.at(-1)?.value;
  if (nextIndex === 0) return frames[0]?.value;
  const previous = frames[nextIndex - 1]!;
  const next = frames[nextIndex]!;
  const span = next.time - previous.time;
  if (!(span > 0)) return next.value;
  return blendSphericalOrientation(
    previous.value,
    next.value,
    (timeSeconds - previous.time) / span
  );
}

function blendSphericalOrientation(
  baseValue: AuroraMdlOrientation | undefined,
  evaluatedValue: AuroraMdlOrientation,
  blendWeight: number
): AuroraMdlOrientation {
  if (!baseValue) return evaluatedValue;
  return quaternionToOrientation(
    slerpQuaternion(
      orientationToQuaternion(baseValue),
      orientationToQuaternion(evaluatedValue),
      blendWeight
    )
  );
}

type AuroraQuaternion = [number, number, number, number];

function orientationToQuaternion(orientation: AuroraMdlOrientation): AuroraQuaternion {
  const [x, y, z] = orientation.axis;
  const length = Math.hypot(x, y, z);
  if (!(length > 1e-12) || !Number.isFinite(orientation.angleRadians)) {
    return [0, 0, 0, 1];
  }
  const sine = Math.sin(orientation.angleRadians * 0.5) / length;
  return [x * sine, y * sine, z * sine, Math.cos(orientation.angleRadians * 0.5)];
}

function quaternionToOrientation([x, y, z, w]: AuroraQuaternion): AuroraMdlOrientation {
  const normalizedLength = Math.hypot(x, y, z, w);
  const nx = x / normalizedLength;
  const ny = y / normalizedLength;
  const nz = z / normalizedLength;
  const nw = Math.max(-1, Math.min(1, w / normalizedLength));
  const sine = Math.hypot(nx, ny, nz);
  if (!(sine > 1e-12)) {
    return { axis: [0, 0, 1], angleRadians: 0 };
  }
  return {
    axis: [nx / sine, ny / sine, nz / sine],
    angleRadians: 2 * Math.atan2(sine, nw)
  };
}

function slerpQuaternion(
  source: AuroraQuaternion,
  target: AuroraQuaternion,
  t: number
): AuroraQuaternion {
  let [tx, ty, tz, tw] = target;
  let dot = source[0] * tx + source[1] * ty + source[2] * tz + source[3] * tw;
  if (dot < 0) {
    dot = -dot;
    tx = -tx;
    ty = -ty;
    tz = -tz;
    tw = -tw;
  }
  if (dot > 0.9995) {
    return normalizeQuaternion([
      source[0] + (tx - source[0]) * t,
      source[1] + (ty - source[1]) * t,
      source[2] + (tz - source[2]) * t,
      source[3] + (tw - source[3]) * t
    ]);
  }
  const theta = Math.acos(Math.max(-1, Math.min(1, dot)));
  const sine = Math.sin(theta);
  const sourceWeight = Math.sin((1 - t) * theta) / sine;
  const targetWeight = Math.sin(t * theta) / sine;
  return normalizeQuaternion([
    source[0] * sourceWeight + tx * targetWeight,
    source[1] * sourceWeight + ty * targetWeight,
    source[2] * sourceWeight + tz * targetWeight,
    source[3] * sourceWeight + tw * targetWeight
  ]);
}

function normalizeQuaternion([x, y, z, w]: AuroraQuaternion): AuroraQuaternion {
  const length = Math.hypot(x, y, z, w);
  return length > 1e-12 ? [x / length, y / length, z / length, w / length] : [0, 0, 0, 1];
}

function sampleAuroraNumberKeyframes(
  frames:
    | ReadonlyArray<{
        time: number;
        value: number;
        interpolation?: "bezier";
        bezierIncomingTangent?: number;
        bezierOutgoingTangent?: number;
      }>
    | undefined,
  timeSeconds: number
): number | undefined {
  if (!frames || frames.length === 0) return undefined;
  const nextIndex = frames.findIndex((frame) => timeSeconds <= frame.time);
  if (nextIndex < 0) return frames.at(-1)?.value;
  if (nextIndex === 0) return frames[0]?.value;
  const previous = frames[nextIndex - 1]!;
  const next = frames[nextIndex]!;
  const span = next.time - previous.time;
  if (!(span > 0)) return next.value;
  const t = (timeSeconds - previous.time) / span;
  if (previous.interpolation === "bezier" || next.interpolation === "bezier") {
    if (
      previous.bezierOutgoingTangent === undefined ||
      next.bezierIncomingTangent === undefined
    ) {
      return undefined;
    }
    return evaluateAuroraCubicBezier(
      previous.value,
      previous.value + previous.bezierOutgoingTangent,
      next.value + next.bezierIncomingTangent,
      next.value,
      t
    );
  }
  return previous.value * (1 - t) + next.value * t;
}

function sampleAuroraVector3Keyframes(
  frames:
    | ReadonlyArray<{
        time: number;
        value: [number, number, number];
        interpolation?: "bezier";
        bezierIncomingTangent?: [number, number, number];
        bezierOutgoingTangent?: [number, number, number];
      }>
    | undefined,
  timeSeconds: number
): [number, number, number] | undefined {
  if (!frames || frames.length === 0) return undefined;
  const nextIndex = frames.findIndex((frame) => timeSeconds <= frame.time);
  if (nextIndex < 0) return frames.at(-1)?.value;
  if (nextIndex === 0) return frames[0]?.value;
  const previous = frames[nextIndex - 1]!;
  const next = frames[nextIndex]!;
  const span = next.time - previous.time;
  if (!(span > 0)) return next.value;
  const t = (timeSeconds - previous.time) / span;
  if (previous.interpolation === "bezier" || next.interpolation === "bezier") {
    const outgoing = previous.bezierOutgoingTangent;
    const incoming = next.bezierIncomingTangent;
    if (!outgoing || !incoming) return undefined;
    return [
      evaluateAuroraCubicBezier(
        previous.value[0],
        previous.value[0] + outgoing[0],
        next.value[0] + incoming[0],
        next.value[0],
        t
      ),
      evaluateAuroraCubicBezier(
        previous.value[1],
        previous.value[1] + outgoing[1],
        next.value[1] + incoming[1],
        next.value[1],
        t
      ),
      evaluateAuroraCubicBezier(
        previous.value[2],
        previous.value[2] + outgoing[2],
        next.value[2] + incoming[2],
        next.value[2],
        t
      )
    ];
  }
  return [
    previous.value[0] * (1 - t) + next.value[0] * t,
    previous.value[1] * (1 - t) + next.value[1] * t,
    previous.value[2] * (1 - t) + next.value[2] * t
  ];
}

function evaluateAuroraCubicBezier(
  start: number,
  startControl: number,
  endControl: number,
  end: number,
  t: number
): number {
  const inverse = 1 - t;
  return (
    inverse * inverse * inverse * start +
    3 * inverse * inverse * t * startControl +
    3 * inverse * t * t * endControl +
    t * t * t * end
  );
}

function normalizeCommandSourceEmitters(command: VfxProcessCommand): AuroraMdlEmitterNode[] {
  if (Array.isArray(command.sourceEmitters) && command.sourceEmitters.length > 0) {
    return command.sourceEmitters.map((emitter) => normalizeEmitter(emitter));
  }
  return command.sourceEmitter ? [normalizeEmitter(command.sourceEmitter)] : [];
}

function normalizeCommandSourceEmitterMaterials(
  command: VfxProcessCommand
): VfxEmitterMaterialStateInput[] {
  if (!Array.isArray(command.sourceEmitterMaterials)) {
    return [];
  }
  return command.sourceEmitterMaterials.flatMap((entry) => {
    const emitterIndex = Number.isFinite(entry?.emitterIndex)
      ? Math.trunc(entry.emitterIndex)
      : -1;
    const emitterNodeName =
      typeof entry?.emitterNodeName === "string" ? entry.emitterNodeName.trim() : "";
    const state = entry?.materialState;
    if (emitterIndex < 0 || !emitterNodeName || state?.source !== "aurora-mtr") {
      return [];
    }
    const materialRef =
      typeof state.materialRef === "string" && state.materialRef.trim()
        ? state.materialRef.trim()
        : undefined;
    const renderHint =
      typeof state.renderHint === "string" && state.renderHint.trim()
        ? state.renderHint.trim()
        : undefined;
    const customShaderVS =
      typeof state.customShaderVS === "string" && state.customShaderVS.trim()
        ? state.customShaderVS.trim()
        : undefined;
    const customShaderFS =
      typeof state.customShaderFS === "string" && state.customShaderFS.trim()
        ? state.customShaderFS.trim()
        : undefined;
    const customShaderGS =
      typeof state.customShaderGS === "string" && state.customShaderGS.trim()
        ? state.customShaderGS.trim()
        : undefined;
    const customShaderProgram = normalizeAuroraShaderProgramSource(state.customShaderProgram);
    const parameters = normalizeAuroraMaterialShaderParameters(state.parameters);
    const sampleFramebuffer =
      typeof state.sampleFramebuffer === "number" && Number.isFinite(state.sampleFramebuffer)
        ? Math.trunc(state.sampleFramebuffer)
        : undefined;
    return [
      {
        emitterIndex,
        emitterNodeName,
        materialState: {
          source: "aurora-mtr" as const,
          ...(materialRef ? { materialRef } : {}),
          ...(renderHint ? { renderHint } : {}),
          ...(customShaderVS ? { customShaderVS } : {}),
          ...(customShaderFS ? { customShaderFS } : {}),
          ...(customShaderGS ? { customShaderGS } : {}),
          ...(customShaderProgram ? { customShaderProgram } : {}),
          ...(parameters.length > 0 ? { parameters } : {}),
          ...(typeof state.transparency === "boolean"
            ? { transparency: state.transparency }
            : {}),
          ...(typeof state.twoSided === "boolean" ? { twoSided: state.twoSided } : {}),
          ...(sampleFramebuffer !== undefined ? { sampleFramebuffer } : {}),
          ...(typeof state.volumetric === "boolean" ? { volumetric: state.volumetric } : {})
        }
      }
    ];
  });
}

function normalizeAuroraMaterialShaderParameters(
  values: AuroraMaterialShaderParameter[] | undefined
): AuroraMaterialShaderParameter[] {
  if (!Array.isArray(values)) return [];
  return values.flatMap((parameter): AuroraMaterialShaderParameter[] => {
    const name = typeof parameter?.name === "string" ? parameter.name.trim() : "";
    const kind = parameter?.kind;
    const numericValues = Array.isArray(parameter?.values)
      ? parameter.values.filter(
          (value): value is number => typeof value === "number" && Number.isFinite(value)
        )
      : [];
    if (
      !name ||
      (kind !== "float" && kind !== "int") ||
      numericValues.length < 1 ||
      numericValues.length > 4 ||
      numericValues.length !== parameter.arity ||
      (kind === "int" &&
        (numericValues.length !== 1 || !Number.isInteger(numericValues[0])))
    ) {
      return [];
    }
    return [{
      name,
      kind,
      values: numericValues,
      arity: numericValues.length as 1 | 2 | 3 | 4
    }];
  });
}

function normalizeAuroraShaderProgramSource(
  value: AuroraShaderProgramSourceBundle | undefined
): AuroraShaderProgramSourceBundle | undefined {
  if (value?.version !== "aurora-shader-program-source/v1") {
    return undefined;
  }
  const sources = Array.isArray(value.sources)
    ? value.sources.flatMap((source): AuroraShaderSourceRecord[] => {
        if (
          typeof source?.resref !== "string" ||
          !source.resref.trim() ||
          typeof source.source !== "string" ||
          !source.source
        ) {
          return [];
        }
        return [{
          resref: source.resref.trim(),
          source: source.source,
          includeRefs: Array.isArray(source.includeRefs)
            ? source.includeRefs.filter((entry): entry is string => typeof entry === "string")
            : [],
          ...(typeof source.sourceAssetId === "string" && source.sourceAssetId.trim()
            ? { sourceAssetId: source.sourceAssetId.trim() }
            : {}),
          ...(typeof source.sourceObjectKey === "string" && source.sourceObjectKey.trim()
            ? { sourceObjectKey: source.sourceObjectKey.trim() }
            : {})
        }];
      })
    : [];
  return buildAuroraShaderProgramSourceBundle({
    stageRoots: {
      vertex: value.stageRoots?.vertex,
      fragment: value.stageRoots?.fragment,
      geometry: value.stageRoots?.geometry
    },
    sources
  });
}

function resolveEmitterMaterialState(
  inputs: VfxEmitterMaterialStateInput[],
  emitterIndex: number,
  emitterNodeName: string
): AuroraVfxMaterialSourceState | undefined {
  return inputs.find(
    (entry) =>
      entry.emitterIndex === emitterIndex && entry.emitterNodeName === emitterNodeName
  )?.materialState;
}

function normalizeCommandSourceAnimationEvents(
  input: AuroraMdlAnimationEvent[] | undefined
): AuroraMdlAnimationEvent[] {
  if (!Array.isArray(input)) {
    return [];
  }
  return input
    .map((event): AuroraMdlAnimationEvent | undefined => {
      const time = event?.time;
      const type = typeof event?.type === "string" ? event.type.trim() : "";
      const animationName =
        typeof event?.animationName === "string" ? event.animationName.trim() : undefined;
      if (!(typeof time === "number" && Number.isFinite(time) && time >= 0) || !type) {
        return undefined;
      }
      return {
        time,
        type,
        ...(animationName ? { animationName } : {})
      };
    })
    .filter((event): event is AuroraMdlAnimationEvent => Boolean(event))
    .sort((left, right) => left.time - right.time);
}

function normalizeRuntimeOptions(runtime: VfxProcessCommand["runtime"]) {
  const dtSeconds = sanitizePositiveNumber(runtime?.dtSeconds, DEFAULT_RUNTIME_DT_SECONDS);
  const legacyParticleLimit = runtime?.particleLimit === undefined
    ? undefined
    : Math.max(1, Math.trunc(runtime.particleLimit));
  const requestedExecutionParticleBudget =
    runtime?.executionParticleBudget ??
    Math.max(
      DEFAULT_RUNTIME_EXECUTION_PARTICLE_BUDGET,
      legacyParticleLimit ?? DEFAULT_RUNTIME_EXECUTION_PARTICLE_BUDGET
    );
  const seed = Math.trunc(sanitizePositiveNumber(runtime?.seed, DEFAULT_RUNTIME_SEED));
  const initialRngSeed =
    runtime?.initialRngState && Number.isFinite(runtime.initialRngState.seed)
      ? Math.trunc(runtime.initialRngState.seed) >>> 0
      : seed >>> 0;
  return {
    dtSeconds,
    simulationStepSeconds: Math.min(
      dtSeconds,
      sanitizePositiveNumber(runtime?.simulationStepSeconds, dtSeconds)
    ),
    tickCount: Math.max(1, Math.min(4096, Math.trunc(runtime?.tickCount ?? 1))),
    executionParticleBudget: Math.min(
      MAX_RUNTIME_EXECUTION_PARTICLE_BUDGET,
      Math.max(
        1,
        Math.trunc(
          sanitizePositiveNumber(
            requestedExecutionParticleBudget,
            DEFAULT_RUNTIME_EXECUTION_PARTICLE_BUDGET
          )
        )
      )
    ),
    ...(legacyParticleLimit !== undefined
      ? { particleLimit: legacyParticleLimit }
      : {}),
    seed,
    initialRngState: {
      algorithm: NWN_EE_VFX_RNG_ALGORITHM,
      seed: initialRngSeed
    },
    initialEmitterStates: runtime?.initialEmitterStates,
    sourceClockOffsetSeconds: Math.max(
      0,
      typeof runtime?.sourceClockOffsetSeconds === "number" &&
        Number.isFinite(runtime.sourceClockOffsetSeconds)
        ? runtime.sourceClockOffsetSeconds
        : 0
    ),
    animation: normalizeRuntimeAnimation(runtime?.animation),
    aoeVisualRuntime: runtime?.aoeVisualRuntime,
    objectDurationVisualRuntime: runtime?.objectDurationVisualRuntime,
    windManager: runtime?.windManager,
    cameraPosition: runtime?.cameraPosition,
    cameraContextSource: runtime?.cameraContextSource,
    effectBeamAttachmentRuntime: runtime?.effectBeamAttachmentRuntime
  };
}

function resolveRuntimeContext(
  runtime: VfxProcessCommand["runtime"]
): AuroraEmitterRuntimeContext | undefined {
  const profileResolver = runtime?.effectBeamAttachmentRuntime
    ? createAuroraEffectBeamAttachmentResolver(runtime.effectBeamAttachmentRuntime)
    : undefined;
  if (!runtime?.context && !profileResolver && !runtime?.cameraPosition) {
    return undefined;
  }
  return {
    ...(runtime?.context ?? {}),
    ...(runtime?.cameraPosition
      ? {
          cameraPosition: runtime.cameraPosition,
          ...(runtime.cameraContextSource
            ? { cameraContextSource: runtime.cameraContextSource }
            : {})
        }
      : {}),
    ...(profileResolver && !runtime?.context?.effectBeamAttachmentResolver
      ? { effectBeamAttachmentResolver: profileResolver }
      : {})
  };
}

type NormalizedRuntimeAnimation = {
  animationName: string;
  previousTimeSeconds: number;
  currentTimeSeconds: number;
  blendWeight: number;
  playbackTickCount?: number;
  loop?: boolean;
  includesAnimationOrigin?: boolean;
};

function shouldIncludeAnimationOrigin(
  previousAnimation: NormalizedRuntimeAnimation | undefined,
  currentAnimation: NormalizedRuntimeAnimation
): boolean {
  if (
    currentAnimation.previousTimeSeconds !== 0 ||
    currentAnimation.currentTimeSeconds <= 0 ||
    currentAnimation.currentTimeSeconds < currentAnimation.previousTimeSeconds
  ) {
    return false;
  }
  return (
    !previousAnimation ||
    previousAnimation.animationName.trim().toLowerCase() !==
      currentAnimation.animationName.trim().toLowerCase() ||
    previousAnimation.currentTimeSeconds === 0
  );
}

function resolveEntryRuntimeAnimationBoundary(
  emitter: AuroraMdlEmitterNode,
  runtime: ReturnType<typeof normalizeRuntimeOptions>,
  boundaryIndex: number,
  aoeVisualOwner: AuroraAoeVisualOwnerRuntimeSnapshot | undefined,
  objectDurationVisualOwner: AuroraObjectDurationVisualOwnerSnapshot | undefined
): NormalizedRuntimeAnimation | undefined {
  if (objectDurationVisualOwner) {
    if (!objectDurationVisualOwner.active) {
      return undefined;
    }
    return {
      animationName: objectDurationVisualOwner.phase,
      previousTimeSeconds: Math.max(
        0,
        objectDurationVisualOwner.animationTimeMilliseconds / 1000 -
          runtime.dtSeconds
      ),
      currentTimeSeconds:
        objectDurationVisualOwner.animationTimeMilliseconds / 1000,
      blendWeight: 1,
      ...(objectDurationVisualOwner.animationLoop ? { loop: true } : {})
    };
  }
  if (!aoeVisualOwner) {
    return resolveRuntimeAnimationBoundary(
      emitter,
      runtime.animation,
      boundaryIndex,
      runtime.tickCount
    );
  }
  if (
    aoeVisualOwner.phase === "waiting" ||
    aoeVisualOwner.phase === "released"
  ) {
    return undefined;
  }
  const animationName = aoeVisualOwner.phase;
  const animationLengthSeconds = emitter.animationPasses?.find(
    (pass) =>
      pass.animationName.trim().toLowerCase() === animationName
  )?.lengthSeconds;
  const phaseTimeSeconds = aoeVisualOwner.phaseElapsedMilliseconds / 1000;
  const previousPhaseTimeSeconds = Math.max(
    0,
    phaseTimeSeconds - runtime.dtSeconds
  );
  const loops =
    animationName === "duration" &&
    typeof animationLengthSeconds === "number" &&
    Number.isFinite(animationLengthSeconds) &&
    animationLengthSeconds > 0;
  const wrap = (value: number) =>
    loops ? ((value % animationLengthSeconds!) + animationLengthSeconds!) %
      animationLengthSeconds! : value;
  return {
    animationName,
    previousTimeSeconds: wrap(previousPhaseTimeSeconds),
    currentTimeSeconds: wrap(phaseTimeSeconds),
    blendWeight: 1,
    ...(loops ? { loop: true } : {})
  };
}

function resolveObjectDurationVisualOwnerSnapshot(
  runtime: ReturnType<typeof normalizeRuntimeOptions>,
  timeSeconds: number
): AuroraObjectDurationVisualOwnerSnapshot | undefined {
  const contract = runtime.objectDurationVisualRuntime?.contract;
  return contract
    ? sampleAuroraObjectDurationVisualOwner(
        contract,
        Math.max(0, timeSeconds) * 1000,
        { updateStepMilliseconds: runtime.dtSeconds * 1000 }
      )
    : undefined;
}

function resolveAoeVisualOwnerSnapshot(
  runtime: ReturnType<typeof normalizeRuntimeOptions>,
  owner: AuroraAoeVisualFootprintOwner,
  timeSeconds: number
): AuroraAoeVisualOwnerRuntimeSnapshot {
  const aoeRuntime = runtime.aoeVisualRuntime;
  if (!aoeRuntime) {
    throw new Error("AOE visual owner resolution requires aoeVisualRuntime.");
  }
  const snapshot = sampleAuroraAoeVisualRuntime(
    aoeRuntime.contract,
    Math.max(0, timeSeconds) * 1000,
    aoeRuntime.animationDurations,
    aoeRuntime.stopAtMilliseconds === undefined
      ? {}
      : { stopAtMilliseconds: aoeRuntime.stopAtMilliseconds }
  ).owners[owner.globalIndex];
  if (!snapshot || snapshot.ownerId !== owner.ownerId) {
    throw new Error(`AOE visual owner '${owner.ownerId}' is missing from its runtime snapshot.`);
  }
  return snapshot;
}

function applyAoeVisualOwnerToEmitter(
  emitter: AuroraMdlEmitterNode,
  owner: AuroraAoeVisualOwnerRuntimeSnapshot | undefined
): AuroraMdlEmitterNode {
  if (!owner) return emitter;
  const basePosition = emitter.transform?.position ?? [0, 0, 0];
  const position = owner.position
    ? [
        basePosition[0] + owner.position.x,
        basePosition[1] + owner.position.y,
        basePosition[2] + owner.position.z
      ] as [number, number, number]
    : basePosition;
  const inactive = owner.phase === "waiting" || owner.phase === "released";
  return {
    ...emitter,
    nodeName: `${emitter.nodeName}@${owner.ownerId}`,
    transform: {
      ...(emitter.transform ?? {}),
      position
    },
    ...(inactive
      ? {
          simulation: {
            ...(emitter.simulation ?? {}),
            birthrate: 0
          }
        }
      : {})
  };
}

function applyObjectDurationVisualOwnerToEmitter(
  emitter: AuroraMdlEmitterNode,
  owner: AuroraObjectDurationVisualOwnerSnapshot | undefined
): AuroraMdlEmitterNode {
  if (!owner || owner.active) return emitter;
  return {
    ...emitter,
    simulation: {
      ...(emitter.simulation ?? {}),
      birthrate: 0
    }
  };
}

function resolveRuntimeAnimationBoundary(
  emitter: AuroraMdlEmitterNode,
  animation: NormalizedRuntimeAnimation | undefined,
  boundaryIndex: number,
  tickCount: number
): NormalizedRuntimeAnimation | undefined {
  if (!animation) {
    return undefined;
  }
  const animationLengthSeconds = emitter.animationPasses?.find(
    (pass) => pass.animationName.trim().toLowerCase() === animation.animationName.toLowerCase()
  )?.lengthSeconds;
  const sampleBoundary = (index: number): number => {
    const playbackTickCount = Math.max(
      1,
      Math.min(tickCount, animation.playbackTickCount ?? tickCount)
    );
    const ratio = animation.loop === true
      ? Math.max(0, index / playbackTickCount)
      : Math.max(0, Math.min(1, index / playbackTickCount));
    if (
      animation.loop === true &&
      typeof animationLengthSeconds === "number" &&
      Number.isFinite(animationLengthSeconds) &&
      animationLengthSeconds > 0
    ) {
      const playbackDistance = animation.currentTimeSeconds < animation.previousTimeSeconds
        ? animationLengthSeconds - animation.previousTimeSeconds + animation.currentTimeSeconds
        : animation.currentTimeSeconds - animation.previousTimeSeconds;
      const sampled = animation.previousTimeSeconds + playbackDistance * ratio;
      return ((sampled % animationLengthSeconds) + animationLengthSeconds) % animationLengthSeconds;
    }
    if (
      animation.currentTimeSeconds < animation.previousTimeSeconds &&
      typeof animationLengthSeconds === "number" &&
      Number.isFinite(animationLengthSeconds) &&
      animationLengthSeconds > 0
    ) {
      const wrappedDistance =
        animationLengthSeconds - animation.previousTimeSeconds + animation.currentTimeSeconds;
      const sampled = animation.previousTimeSeconds + wrappedDistance * ratio;
      return sampled > animationLengthSeconds ? sampled - animationLengthSeconds : sampled;
    }
    return (
      animation.previousTimeSeconds +
      (animation.currentTimeSeconds - animation.previousTimeSeconds) * ratio
    );
  };
  return {
    ...animation,
    previousTimeSeconds: sampleBoundary(Math.max(0, boundaryIndex - 1)),
    currentTimeSeconds: sampleBoundary(boundaryIndex)
  };
}

function normalizeRuntimeAnimation(
  runtime:
    | {
        animationName: string;
        previousTimeSeconds?: number;
        currentTimeSeconds: number;
        blendWeight?: number;
        playbackTickCount?: number;
        loop?: boolean;
      }
    | undefined
): NormalizedRuntimeAnimation | undefined {
  if (!runtime || typeof runtime !== "object") {
    return undefined;
  }
  const input = runtime as {
    animationName?: unknown;
    previousTimeSeconds?: unknown;
    currentTimeSeconds?: unknown;
    blendWeight?: unknown;
    playbackTickCount?: unknown;
    loop?: unknown;
  };
  if (typeof input.animationName !== "string" || input.animationName.trim().length === 0) {
    return undefined;
  }
  if (!(typeof input.currentTimeSeconds === "number" && Number.isFinite(input.currentTimeSeconds) && input.currentTimeSeconds >= 0)) {
    return undefined;
  }
  const previousTimeSeconds =
    typeof input.previousTimeSeconds === "number" &&
    Number.isFinite(input.previousTimeSeconds) &&
    input.previousTimeSeconds >= 0
      ? input.previousTimeSeconds
      : 0;
  const blendWeight =
    typeof input.blendWeight === "number" &&
    Number.isFinite(input.blendWeight) &&
    input.blendWeight >= 0 &&
    input.blendWeight <= 1
      ? input.blendWeight
      : 1;
  const playbackTickCount =
    typeof input.playbackTickCount === "number" &&
    Number.isFinite(input.playbackTickCount) &&
    input.playbackTickCount >= 1
      ? Math.max(1, Math.trunc(input.playbackTickCount))
      : undefined;
  return {
    animationName: input.animationName.trim(),
    previousTimeSeconds,
    currentTimeSeconds: input.currentTimeSeconds,
    blendWeight,
    ...(playbackTickCount !== undefined ? { playbackTickCount } : {}),
    ...(input.loop === true ? { loop: true } : {})
  };
}

function resolveSourceAnimationDetonateContext(
  emitter: AuroraMdlEmitterNode,
  animation: NormalizedRuntimeAnimation | undefined,
  sourceAnimationEvents: AuroraMdlAnimationEvent[],
  acceptsModelAnimationEvents: boolean
): {
  detonateEvents?: AuroraEmitterRuntimeContext["detonateEvents"];
  eventRowsFired: AuroraVfxTickTrace["eventScan"]["eventRowsFired"];
} {
  if (!animation) {
    return { eventRowsFired: [] };
  }
  const animationLengthSeconds = emitter.animationPasses?.find(
    (pass) => pass.animationName === animation.animationName
  )?.lengthSeconds;
  const wraps = animation.currentTimeSeconds < animation.previousTimeSeconds;
  if (
    wraps &&
    !(typeof animationLengthSeconds === "number" && Number.isFinite(animationLengthSeconds) && animationLengthSeconds > 0)
  ) {
    return { eventRowsFired: [] };
  }
  const events = [
    ...(acceptsModelAnimationEvents
      ? sourceAnimationEvents.map((event) => ({ ...event, scope: "model-animation-header" as const }))
      : []),
    ...(emitter.events ?? []).map((event) => ({ ...event, scope: "emitter-local" as const }))
  ];
  const eventRowsFired = events
    .filter(
      (event) =>
        event.type.trim().toLowerCase() === "detonate" &&
        event.animationName?.trim().toLowerCase() === animation.animationName.trim().toLowerCase() &&
        (wraps
          ? event.time > animation.previousTimeSeconds || event.time <= animation.currentTimeSeconds
          : ((animation.includesAnimationOrigin === true && event.time === 0) ||
              event.time > animation.previousTimeSeconds) &&
            event.time <= animation.currentTimeSeconds)
    )
    .map((event) => ({
      timeSeconds: event.time,
      ...(event.animationName ? { animationName: event.animationName } : {}),
      scope: event.scope
    }));
  return {
    ...(eventRowsFired.length > 0
      ? {
          detonateEvents: eventRowsFired.map(({ timeSeconds, animationName }) => ({
            timeSeconds,
            ...(animationName ? { animationName } : {})
          }))
        }
      : {}),
    eventRowsFired
  };
}

function resolveDirectDetonateFieldContext(
  emitter: AuroraMdlEmitterNode,
  animation: NormalizedRuntimeAnimation | undefined
) {
  const detonate = emitter.simulation?.detonate;
  if (!(typeof detonate === "number" && Number.isFinite(detonate) && detonate !== 0)) {
    return {};
  }
  return {
    detonateFieldKey: `field:${animation?.animationName ?? "base"}:${detonate}`
  };
}

function normalizeEmitter(input: Partial<AuroraMdlEmitterNode>): AuroraMdlEmitterNode {
  return {
    nodeKind: "emitter",
    nodeName: typeof input.nodeName === "string" ? input.nodeName : "vfx_emitter",
    ...(typeof input.parentNodeName === "string" && input.parentNodeName.trim()
      ? { parentNodeName: input.parentNodeName.trim() }
      : {}),
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
    texture: emitter.textureRaw ?? emitter.texture,
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
  if (isRuntimePackageKind(input.packageKind) && input.runtimeState) {
    return "runtime_ready" as const;
  }
  return input.selectedSourceRow ? "source_only" as const : "diagnostic_only" as const;
}

function isRuntimePackageKind(packageKind: VfxProcessCommand["packageKind"]): boolean {
  return packageKind === "runtime_package" || packageKind === "model_graph_runtime";
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
