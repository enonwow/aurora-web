import type {
  AuroraMdlEmitterNode,
  AuroraMdlAnimationEvent,
  AuroraMdlEmitterSimulation,
  AuroraMdlMeshMaterialAnimation,
  AuroraMdlMeshMaterialState,
  AuroraMdlTransform,
  AuroraMdlTransformAnimation
} from "../domain/aurora-mdl-vfx-source.parser";
import type {
  AuroraWindManagerInput,
  AuroraWindManagerState
} from "../domain/aurora-vfx-wind-manager";
import type { AuroraVfxDependencyGraph } from "../domain/aurora-vfx-dependency-graph";
import type { AuroraVfxEffectBeamAttachmentRuntimeProfile } from "../domain/aurora-vfx-effect-beam-attachment";
import type {
  AuroraVfxMaterialSourceState,
  AuroraVfxRuntimeRenderContract
} from "../domain/aurora-vfx-render-contract";
import type {
  AuroraDetonateCallbackTraceRecord,
  AuroraDeterministicRngState,
  AuroraEmitterRuntimeContext,
  AuroraEmitterRuntimeSnapshot,
  AuroraEmitterRuntimeState,
  AuroraRuntimeVector3
} from "../domain/aurora-vfx-runtime-state";
import type {
  AuroraProgFxType10ProjectileOwnerTransform
} from "../domain/aurora-vfx-progfx-type10-projectile";
import type {
  AuroraAoeVisualAnimationDurations,
  AuroraAoeVisualFootprintContract,
  AuroraAoeVisualOwnerRuntimeSnapshot
} from "../domain/aurora-vfx-aoe-visual-runtime";
import type {
  AuroraObjectDurationVisualOwnerContract,
  AuroraObjectDurationVisualOwnerSnapshot
} from "../domain/aurora-vfx-object-duration-owner-runtime";
import type {
  AuroraVfxDiagnostic,
  AuroraVfxEffectInstance,
  AuroraVfxPhaseSchedule,
  AuroraProgFxSourceRow,
  AuroraVisualEffectSourceRow
} from "../domain/aurora-vfx-source.parser";
import type { AuroraVfxSourcePolicyTrace } from "../domain/aurora-vfx-source-policy";

export type VfxPackageKind = "source_parse" | "runtime_package" | "model_graph_runtime";
export type VfxRuntimePackageStatus = "source_only" | "runtime_ready" | "diagnostic_only";
export type VfxRenderContractStatus = "ready" | "source_only" | "diagnostic_only";

export interface VfxProcessingCacheDescriptor {
  key: string;
  hit: boolean;
  storedAt: string;
  hits: number;
}

export interface VfxSourceCandidateInput {
  candidateId?: string;
  layer: "module" | "hak" | "vanilla" | "external_fixture";
  resourceKind: "table" | "resource";
  resourceKey: string;
  sourcePath?: string;
  hakName?: string;
  sourceHash?: string;
  tableHash?: string;
  resourceHash?: string;
}

export interface VfxResourceTraceInput {
  requestedResourceClass:
    | "model"
    | "source_model"
    | "emitter_node"
    | "texture"
    | "txi"
    | "material"
    | "shader"
    | "chunk_model"
    | "sound"
    | "progfx_row"
    | "owner_slot";
  requestedRef: string;
  ownerPath?: string;
  selectedCandidate?: {
    candidateId?: string;
    sourceLayer: "module" | "hak" | "vanilla" | "external_fixture";
    resourceKey: string;
    sourcePath?: string;
    hakName?: string;
    sourceHash?: string;
    resourceHash?: string;
    precedenceRank?: number;
  };
  lowerPrecedenceCandidates?: Array<{
    candidateId?: string;
    sourceLayer: "module" | "hak" | "vanilla" | "external_fixture";
    resourceKey: string;
    sourcePath?: string;
    hakName?: string;
    sourceHash?: string;
    resourceHash?: string;
    precedenceRank?: number;
  }>;
}

export interface VfxEmitterMaterialStateInput {
  emitterIndex: number;
  emitterNodeName: string;
  materialState: AuroraVfxMaterialSourceState;
}

export interface VfxProcessCommand {
  packageKind: VfxPackageKind;
  /** Required for 2DA-backed packages; source-MDL graph packages deliberately have no synthetic table. */
  sourceTableText?: string;
  progFxTableText?: string;
  sourceObjectKey?: string;
  sourceLayer?: "module" | "hak" | "vanilla" | "external_fixture";
  sourceHash?: string;
  sourceProfile?: string;
  sourceRowId?: number;
  selectedCandidateId?: string;
  selectedTableHash?: string;
  selectedResourceHash?: string;
  sourceCandidates?: VfxSourceCandidateInput[];
  resourceTraces?: VfxResourceTraceInput[];
  effectInstance?: AuroraVfxEffectInstance;
  sourceEmitter?: AuroraMdlEmitterNode;
  sourceEmitters?: AuroraMdlEmitterNode[];
  sourceEmitterMaterials?: VfxEmitterMaterialStateInput[];
  /** Animation-header events belong to the model, never implicitly to every emitter node. */
  sourceAnimationEvents?: AuroraMdlAnimationEvent[];
  sourceModelGraph?: {
    animationEvents?: AuroraMdlAnimationEvent[];
    nodes: Array<{
      nodeKind?: string;
      nodeName: string;
      parentNodeName?: string;
      transform?: AuroraMdlTransform;
      animationTracks?: AuroraMdlTransformAnimation[];
      meshMaterialState?: AuroraMdlMeshMaterialState;
      meshMaterialAnimationTracks?: AuroraMdlMeshMaterialAnimation[];
    }>;
  };
  runtime?: {
    dtSeconds?: number;
    /** Maximum Aurora scene-update step; output frames remain spaced by dtSeconds. */
    simulationStepSeconds?: number;
    tickCount?: number;
    /** Server resource budget only; not a canonical Aurora particle-count field. */
    executionParticleBudget?: number;
    /** @deprecated Use executionParticleBudget. */
    particleLimit?: number;
    seed?: number;
    /** Internal deterministic continuation point for one shared Aurora RNG stream. */
    initialRngState?: AuroraDeterministicRngState;
    /** Internal scheduler continuation; entries are matched by emitter source order and name. */
    initialEmitterStates?: Array<{
      emitterNodeName: string;
      runtimeState: AuroraEmitterRuntimeState;
    }>;
    /** Absolute model source-clock origin for bounded continuation slices. */
    sourceClockOffsetSeconds?: number;
    animation?: {
      animationName: string;
      previousTimeSeconds?: number;
      currentTimeSeconds: number;
      blendWeight?: number;
      playbackTickCount?: number;
      /** Owner animation playback; separate from the emitter particle loop flag. */
      loop?: boolean;
    };
    windManager?: AuroraWindManagerInput;
    /** Serializable active-camera position in Aurora/source coordinates. */
    cameraPosition?: AuroraRuntimeVector3;
    cameraContextSource?:
      | "aurora-active-camera-world-position"
      | "proof-calibrated-camera-relative-to-vfx-owner";
    effectBeamAttachmentRuntime?: AuroraVfxEffectBeamAttachmentRuntimeProfile;
    aoeVisualRuntime?: {
      contract: AuroraAoeVisualFootprintContract;
      animationDurations: AuroraAoeVisualAnimationDurations;
      stopAtMilliseconds?: number;
    };
    objectDurationVisualRuntime?: {
      contract: AuroraObjectDurationVisualOwnerContract;
    };
    /** In-process runtime services are intentionally excluded from serialized cache keys. */
    context?: AuroraEmitterRuntimeContext;
  };
  bypassCache: boolean;
  includeBenchmarkMetadata: boolean;
}

export interface VfxRuntimeTreeChildModelSource {
  requestedRef: string;
  command: Omit<VfxProcessCommand, "runtime" | "bypassCache" | "includeBenchmarkMetadata">;
  animation: {
    animationName: string;
    lengthSeconds: number;
    loop?: boolean;
  };
}

export interface VfxRuntimeTreeCommand {
  rootCommand: VfxProcessCommand;
  childModels: VfxRuntimeTreeChildModelSource[];
}

export interface AuroraVfxEmitterEvaluationSnapshot {
  emitterNodeName: string;
  emitterType?: string;
  renderModeRaw?: string;
  blendModeRaw?: string;
  chunkName?: string;
  simulation?: AuroraMdlEmitterSimulation;
  transform?: AuroraMdlTransform;
}

export interface AuroraVfxTickTrace {
  version: "aurora-vfx-tick-trace/v1";
  tickIndex: number;
  stageOrder: [
    "source_snapshot",
    "animation_evaluation",
    "event_scan",
    "event_callbacks",
    "family_update",
    "post_update_state",
    "render_input"
  ];
  sourceSnapshot: AuroraVfxEmitterEvaluationSnapshot;
  evaluatedSnapshot: AuroraVfxEmitterEvaluationSnapshot;
  animationEvaluation: {
    passApplied: boolean;
    animationName?: string;
    previousTimeSeconds?: number;
    currentTimeSeconds?: number;
    blendWeight?: number;
    sourceTransitionSeconds?: number;
    blendEquation: "evaluated*weight+existing*(1-weight)";
  };
  eventScan: {
    animationName?: string;
    previousTimeSeconds?: number;
    currentTimeSeconds?: number;
    wraps: boolean;
    includesAnimationOrigin: boolean;
    eventRowsFired: Array<{
      timeSeconds: number;
      animationName?: string;
      scope: "model-animation-header" | "emitter-local";
    }>;
    detonateFieldKey?: string;
  };
  eventCallbacks: AuroraDetonateCallbackTraceRecord[];
  familyUpdate: {
    family: AuroraEmitterRuntimeState["family"];
    activeParticleIdsBefore: number[];
    activeParticleIdsAfter: number[];
    diagnosticCodes: string[];
  };
  postUpdateState: {
    localClockSeconds: number;
    sourceClockSeconds: number;
    activeParticleIds: number[];
    freeParticleIds: number[];
  };
  renderInput: {
    activeParticleIds: number[];
    renderModeRaw?: string;
    blendModeRaw?: string;
    chunkName?: string;
  };
}

export interface VfxEmitterRuntimePackage {
  emitterIndex: number;
  emitterNodeName: string;
  selectedAnimation?: {
    animationName: string;
    previousTimeSeconds: number;
    currentTimeSeconds: number;
    blendWeight: number;
    playbackTickCount?: number;
    loop?: boolean;
  };
  runtimeState: AuroraEmitterRuntimeState;
  runtimeSnapshot: AuroraEmitterRuntimeSnapshot;
  renderContract: AuroraVfxRuntimeRenderContract;
  sourceOwnerTransform?: AuroraProgFxType10ProjectileOwnerTransform;
  aoeVisualOwner?: AuroraAoeVisualOwnerRuntimeSnapshot;
  objectDurationVisualOwner?: AuroraObjectDurationVisualOwnerSnapshot;
  tickTraces?: AuroraVfxTickTrace[];
  runtimeFrames?: Array<{
    tickIndex: number;
    timeSeconds: number;
    selectedAnimation?: {
      animationName: string;
      previousTimeSeconds: number;
      currentTimeSeconds: number;
      blendWeight: number;
      playbackTickCount?: number;
      loop?: boolean;
    };
    runtimeState: AuroraEmitterRuntimeState;
    runtimeSnapshot: AuroraEmitterRuntimeSnapshot;
    renderContract: AuroraVfxRuntimeRenderContract;
    sourceOwnerTransform?: AuroraProgFxType10ProjectileOwnerTransform;
    aoeVisualOwner?: AuroraAoeVisualOwnerRuntimeSnapshot;
    objectDurationVisualOwner?: AuroraObjectDurationVisualOwnerSnapshot;
    tickTrace?: AuroraVfxTickTrace;
  }>;
}

export interface VfxBenchmarkCommand {
  iterations: number;
  warmupIterations: number;
  bypassCache: boolean;
  sourceTableText?: string;
}

export interface VfxProcessingObservability {
  sourceHash: string;
  cacheHit: boolean;
  diagnosticsCount: number;
  unresolvedDependencyCount: number;
  runtimePackageStatus: VfxRuntimePackageStatus;
  renderContractStatus: VfxRenderContractStatus;
}

export interface VfxBenchmarkStageResult {
  stage: "source_parse" | "dependency_graph_build" | "runtime_tick" | "render_contract_build";
  iterations: number;
  warmupIterations: number;
  durationMs: {
    min: number;
    max: number;
    mean: number;
  };
  fingerprint: string;
  diagnosticsCount: number;
}

export interface VfxBenchmarkResult {
  version: "aurora-vfx-benchmark/v1";
  stages: VfxBenchmarkStageResult[];
  deterministicFingerprint: string;
}

export interface VfxRuntimePackage {
  version: "aurora-vfx-package/v1";
  packageKind: VfxPackageKind;
  sourcePolicyTrace: AuroraVfxSourcePolicyTrace;
  sourceRows: AuroraVisualEffectSourceRow[];
  progFxRows?: AuroraProgFxSourceRow[];
  selectedSourceRow?: AuroraVisualEffectSourceRow;
  effectInstance?: AuroraVfxEffectInstance;
  phaseSchedule?: AuroraVfxPhaseSchedule;
  dependencyGraph: AuroraVfxDependencyGraph;
  runtimeEmitters?: VfxEmitterRuntimePackage[];
  runtimeState?: AuroraEmitterRuntimeState;
  runtimeSnapshot?: AuroraEmitterRuntimeSnapshot;
  renderContract?: AuroraVfxRuntimeRenderContract;
  windManagerSnapshot?: AuroraWindManagerState;
  runtimeSharedRng?: {
    version: "aurora-vfx-shared-rng-lineage/v1";
    initialState: AuroraDeterministicRngState;
    finalState: AuroraDeterministicRngState;
    schedulerOrder: "model-instance-insertion-order-then-emitter-source-order";
  };
  diagnostics: AuroraVfxDiagnostic[];
  observability: VfxProcessingObservability;
  benchmark?: VfxBenchmarkResult;
}

export interface VfxProcessingEnvelope {
  cache: VfxProcessingCacheDescriptor;
  vfx: VfxRuntimePackage;
}
