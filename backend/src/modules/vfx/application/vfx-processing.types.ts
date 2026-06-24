import type { AuroraMdlEmitterNode } from "../domain/aurora-mdl-vfx-source.parser";
import type { AuroraVfxDependencyGraph } from "../domain/aurora-vfx-dependency-graph";
import type { AuroraVfxRuntimeRenderContract } from "../domain/aurora-vfx-render-contract";
import type {
  AuroraEmitterRuntimeSnapshot,
  AuroraEmitterRuntimeState
} from "../domain/aurora-vfx-runtime-state";
import type {
  AuroraVfxDiagnostic,
  AuroraVfxEffectInstance,
  AuroraVfxPhaseSchedule,
  AuroraVisualEffectSourceRow
} from "../domain/aurora-vfx-source.parser";
import type { AuroraVfxSourcePolicyTrace } from "../domain/aurora-vfx-source-policy";

export type VfxPackageKind = "source_parse" | "runtime_package";
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
    sourceLayer: "module" | "hak" | "vanilla" | "external_fixture";
    resourceKey: string;
    sourcePath?: string;
    hakName?: string;
    sourceHash?: string;
    resourceHash?: string;
    precedenceRank?: number;
  };
  lowerPrecedenceCandidates?: Array<{
    sourceLayer: "module" | "hak" | "vanilla" | "external_fixture";
    resourceKey: string;
    sourcePath?: string;
    hakName?: string;
    sourceHash?: string;
    resourceHash?: string;
    precedenceRank?: number;
  }>;
}

export interface VfxProcessCommand {
  packageKind: VfxPackageKind;
  sourceTableText: string;
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
  runtime?: {
    dtSeconds?: number;
    particleLimit?: number;
    seed?: number;
  };
  bypassCache: boolean;
  includeBenchmarkMetadata: boolean;
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
  selectedSourceRow?: AuroraVisualEffectSourceRow;
  effectInstance?: AuroraVfxEffectInstance;
  phaseSchedule?: AuroraVfxPhaseSchedule;
  dependencyGraph: AuroraVfxDependencyGraph;
  runtimeState?: AuroraEmitterRuntimeState;
  runtimeSnapshot?: AuroraEmitterRuntimeSnapshot;
  renderContract?: AuroraVfxRuntimeRenderContract;
  diagnostics: AuroraVfxDiagnostic[];
  observability: VfxProcessingObservability;
  benchmark?: VfxBenchmarkResult;
}

export interface VfxProcessingEnvelope {
  cache: VfxProcessingCacheDescriptor;
  vfx: VfxRuntimePackage;
}
