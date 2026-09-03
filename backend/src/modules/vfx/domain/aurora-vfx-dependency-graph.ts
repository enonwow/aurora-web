import { createHash } from "node:crypto";
import type {
  AuroraVfxDiagnostic,
  AuroraVfxPhaseKind,
  AuroraVfxPhaseSchedule,
  AuroraVfxSourceRowBase,
  AuroraVisualEffectSourceRow
} from "./aurora-vfx-source.parser";
import type {
  AuroraVfxSourceLayer,
  AuroraVfxSourcePolicyTrace
} from "./aurora-vfx-source-policy";

export type AuroraVfxDependencyEdgeType =
  | "phase_model"
  | "source_model"
  | "emitter_node"
  | "texture"
  | "txi_sidecar"
  | "mtr_material"
  | "shader"
  | "chunk_model"
  | "sound"
  | "progfx_row"
  | "owner_slot";

export type AuroraVfxRequestedResourceClass =
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

export type AuroraVfxDependencyResolveStatus =
  | "resolved"
  | "unresolved"
  | "preserved"
  | "source_only";

export type AuroraVfxDependencyPreloadIntent =
  | "runtime_required"
  | "preview_optional"
  | "preserve_raw"
  | "none";

export interface AuroraVfxDependencyCandidate {
  candidateId?: string;
  sourceLayer: AuroraVfxSourceLayer;
  resourceKey: string;
  sourcePath?: string;
  hakName?: string;
  sourceHash?: string;
  resourceHash?: string;
  precedenceRank?: number;
}

export interface AuroraVfxDependencyResolverTrace {
  requestedResourceClass: AuroraVfxRequestedResourceClass;
  requestedRef: string;
  ownerPath?: string;
  selectedCandidate?: AuroraVfxDependencyCandidate;
  lowerPrecedenceCandidates?: AuroraVfxDependencyCandidate[];
  diagnostics?: AuroraVfxDiagnostic[];
}

export interface AuroraVfxDependencyEdgeCacheKeyParts {
  version: "aurora-vfx-dependency-edge/v1";
  edgeType: AuroraVfxDependencyEdgeType;
  ownerPath: string;
  requestedResourceClass: AuroraVfxRequestedResourceClass;
  requestedRef: string;
  sourceTable?: string;
  sourceRowId?: number;
  sourcePhase?: AuroraVfxPhaseKind;
  sourceLayer?: string;
  sourceHash?: string;
  selectedResourceKey?: string;
  selectedResourceHash?: string;
  runtimeSettingsRevision?: number;
  hakListHash?: string;
  sourcePolicyHash?: string;
  selectedTableHash?: string;
}

export interface AuroraVfxDependencyEdge {
  edgeId: string;
  edgeType: AuroraVfxDependencyEdgeType;
  ownerPath: string;
  requestedResourceClass: AuroraVfxRequestedResourceClass;
  requestedRef: string;
  sourceTable?: string;
  sourceRowId?: number;
  sourcePhase?: AuroraVfxPhaseKind;
  sourceLayer?: string;
  selectedCandidate?: AuroraVfxDependencyCandidate;
  lowerPrecedenceCandidates: AuroraVfxDependencyCandidate[];
  resolveStatus: AuroraVfxDependencyResolveStatus;
  diagnostics: AuroraVfxDiagnostic[];
  cacheKeyParts: AuroraVfxDependencyEdgeCacheKeyParts;
  preloadIntent: AuroraVfxDependencyPreloadIntent;
}

export interface AuroraVfxDependencyGraphCacheKeyParts {
  version: "aurora-vfx-dependency-graph/v1";
  sourceTable?: string;
  sourceRowId?: number;
  sourceHash?: string;
  runtimeSettingsRevision?: number;
  hakListHash?: string;
  sourcePolicyHash?: string;
  selectedTableHash?: string;
  selectedResourceHash?: string;
  edgeKeys: string[];
}

export interface AuroraVfxDependencyGraph {
  version: "aurora-vfx-dependency-graph/v1";
  sourceTable?: string;
  sourceRowId?: number;
  sourceHash?: string;
  sourceLayer?: string;
  edges: AuroraVfxDependencyEdge[];
  diagnostics: AuroraVfxDiagnostic[];
  cacheKeyParts: AuroraVfxDependencyGraphCacheKeyParts;
}

export interface AuroraVfxDependencyEmitterSource {
  ownerPath?: string;
  nodeName: string;
  sourceModelRef?: string;
  texture?: string;
  texture0?: string;
  materialName?: string;
  mtr?: string;
  customShader?: string;
  chunkName?: string;
}

export interface AuroraVfxDependencyOwnerSlot {
  ownerPath: string;
  ownerKind: "spell" | "item" | "combat" | string;
  requestedRef: string;
  requestedResourceClass?: AuroraVfxRequestedResourceClass;
}

export interface BuildAuroraVfxDependencyGraphInput {
  sourceRow?: AuroraVisualEffectSourceRow | AuroraVfxSourceRowBase<string>;
  phaseSchedule?: AuroraVfxPhaseSchedule;
  sourcePolicyTrace?: AuroraVfxSourcePolicyTrace;
  resourceTraces?: AuroraVfxDependencyResolverTrace[];
  emitters?: AuroraVfxDependencyEmitterSource[];
  ownerSlots?: AuroraVfxDependencyOwnerSlot[];
}

interface AddEdgeInput {
  edgeType: AuroraVfxDependencyEdgeType;
  ownerPath: string;
  requestedResourceClass: AuroraVfxRequestedResourceClass;
  requestedRef: string;
  sourceTable?: string;
  sourceRowId?: number;
  sourcePhase?: AuroraVfxPhaseKind;
  sourceLayer?: string;
  sourceHash?: string;
  preloadIntent: AuroraVfxDependencyPreloadIntent;
  diagnostics?: AuroraVfxDiagnostic[];
}

export function buildAuroraVfxDependencyGraph(
  input: BuildAuroraVfxDependencyGraphInput
): AuroraVfxDependencyGraph {
  const diagnostics: AuroraVfxDiagnostic[] = [];
  if (!input.sourcePolicyTrace) {
    diagnostics.push(
      dependencyDiagnostic(
        "VFX_DEPENDENCY_GRAPH_SOURCE_TRACE_REQUIRED",
        "warn",
        "VFX dependency graph was built without a source-policy trace; cache keys will not include runtime-settings or HAK-list provenance."
      )
    );
  }

  const edges: AuroraVfxDependencyEdge[] = [];
  const addEdge = (edge: AddEdgeInput): void => {
    edges.push(buildDependencyEdge(edge, input.sourcePolicyTrace, input.resourceTraces ?? []));
  };
  const sourceIdentity = buildSourceIdentity(input.sourceRow, input.phaseSchedule);

  for (const phase of input.phaseSchedule?.phases ?? []) {
    for (const [column, modelRef] of Object.entries(phase.modelNodeRefs)) {
      addEdge({
        edgeType: "phase_model",
        ownerPath: `${sourceIdentity.ownerPath}/phase:${phase.phase}/model:${column}`,
        requestedResourceClass: "model",
        requestedRef: modelRef,
        sourcePhase: phase.phase,
        preloadIntent: "runtime_required",
        ...edgeSourceIdentity(sourceIdentity)
      });
    }
    if (phase.progFxRaw) {
      addEdge({
        edgeType: "progfx_row",
        ownerPath: `${sourceIdentity.ownerPath}/phase:${phase.phase}/progfx`,
        requestedResourceClass: "progfx_row",
        requestedRef: phase.progFxRaw,
        sourcePhase: phase.phase,
        preloadIntent: "runtime_required",
        ...edgeSourceIdentity(sourceIdentity)
      });
    }
    if (phase.soundRaw) {
      addEdge({
        edgeType: "sound",
        ownerPath: `${sourceIdentity.ownerPath}/phase:${phase.phase}/sound`,
        requestedResourceClass: "sound",
        requestedRef: phase.soundRaw,
        sourcePhase: phase.phase,
        preloadIntent: "runtime_required",
        ...edgeSourceIdentity(sourceIdentity)
      });
    }
  }

  for (const emitter of input.emitters ?? []) {
    addEmitterEdges(emitter, sourceIdentity, addEdge);
  }

  for (const ownerSlot of input.ownerSlots ?? []) {
    addEdge({
      edgeType: "owner_slot",
      ownerPath: ownerSlot.ownerPath,
      requestedResourceClass: ownerSlot.requestedResourceClass ?? "owner_slot",
      requestedRef: ownerSlot.requestedRef,
      preloadIntent: "runtime_required",
      ...edgeSourceIdentity(sourceIdentity)
    });
  }

  const cacheKeyParts: AuroraVfxDependencyGraphCacheKeyParts = {
    version: "aurora-vfx-dependency-graph/v1",
    ...(sourceIdentity.sourceTable ? { sourceTable: sourceIdentity.sourceTable } : {}),
    ...(typeof sourceIdentity.sourceRowId === "number"
      ? { sourceRowId: sourceIdentity.sourceRowId }
      : {}),
    ...(sourceIdentity.sourceHash ? { sourceHash: sourceIdentity.sourceHash } : {}),
    ...(input.sourcePolicyTrace
      ? {
          runtimeSettingsRevision:
            input.sourcePolicyTrace.cacheKeyParts.runtimeSettingsRevision,
          hakListHash: input.sourcePolicyTrace.cacheKeyParts.hakListHash,
          sourcePolicyHash: input.sourcePolicyTrace.cacheKeyParts.policyHash,
          ...(input.sourcePolicyTrace.cacheKeyParts.selectedTableHash
            ? { selectedTableHash: input.sourcePolicyTrace.cacheKeyParts.selectedTableHash }
            : {}),
          ...(input.sourcePolicyTrace.cacheKeyParts.selectedResourceHash
            ? {
                selectedResourceHash:
                  input.sourcePolicyTrace.cacheKeyParts.selectedResourceHash
              }
            : {})
        }
      : {}),
    edgeKeys: edges.map((edge) => hashStable(edge.cacheKeyParts))
  };

  return {
    version: "aurora-vfx-dependency-graph/v1",
    ...(sourceIdentity.sourceTable ? { sourceTable: sourceIdentity.sourceTable } : {}),
    ...(typeof sourceIdentity.sourceRowId === "number"
      ? { sourceRowId: sourceIdentity.sourceRowId }
      : {}),
    ...(sourceIdentity.sourceHash ? { sourceHash: sourceIdentity.sourceHash } : {}),
    ...(sourceIdentity.sourceLayer ? { sourceLayer: sourceIdentity.sourceLayer } : {}),
    edges,
    diagnostics,
    cacheKeyParts
  };
}

function addEmitterEdges(
  emitter: AuroraVfxDependencyEmitterSource,
  sourceIdentity: SourceIdentity,
  addEdge: (edge: AddEdgeInput) => void
): void {
  const emitterOwnerPath = emitter.ownerPath ?? `${sourceIdentity.ownerPath}/emitter:${emitter.nodeName}`;
  const hasNullTextureToken = [emitter.texture, emitter.texture0].some(
    (value) => value !== undefined && isAuroraVfxNoTextureToken(value)
  );
  const hasTextureResourceRef = [emitter.texture, emitter.texture0].some(
    (value) =>
      typeof value === "string" &&
      value.trim().length > 0 &&
      !isAuroraVfxNoTextureToken(value)
  );
  addEdge({
    edgeType: "emitter_node",
    ownerPath: emitterOwnerPath,
    requestedResourceClass: "emitter_node",
    requestedRef: emitter.nodeName,
    preloadIntent: "preserve_raw",
    diagnostics: [
      dependencyDiagnostic(
        "VFX_EMITTER_NODE_SOURCE_FACT_PRESERVED",
        "info",
        "Emitter node is preserved as source data; it does not prove particle runtime by itself."
      ),
      ...(hasNullTextureToken
        ? [
            dependencyDiagnostic(
              emitter.chunkName
                ? "VFX_CHUNKNAME_TEXTURE_NULL_STATE_SEPARATE"
                : "VFX_TEXTURE_NULL_NO_CHUNK_NO_TEXTURED_DRAW",
              "info",
              emitter.chunkName
                ? "Aurora texture NULL remains a no-texture source token while non-empty chunkName independently selects the chunk-model lane."
                : "Aurora texture NULL remains an explicit no-texture source state and does not create a texture or TXI dependency."
            )
          ]
        : [])
    ],
    ...edgeSourceIdentity(sourceIdentity)
  });

  if (emitter.sourceModelRef) {
    addEdge({
      edgeType: "source_model",
      ownerPath: `${emitterOwnerPath}/source-model`,
      requestedResourceClass: "source_model",
      requestedRef: emitter.sourceModelRef,
      preloadIntent: "runtime_required",
      ...edgeSourceIdentity(sourceIdentity)
    });
  }

  addTextureLane("texture", emitter.texture, emitter, emitterOwnerPath, sourceIdentity, addEdge);
  addTextureLane("texture0", emitter.texture0, emitter, emitterOwnerPath, sourceIdentity, addEdge);

  if (emitter.materialName) {
    addEdge({
      edgeType: "mtr_material",
      ownerPath: `${emitterOwnerPath}/materialname`,
      requestedResourceClass: "material",
      requestedRef: emitter.materialName,
      preloadIntent: "runtime_required",
      ...edgeSourceIdentity(sourceIdentity)
    });
  }
  if (emitter.mtr) {
    addEdge({
      edgeType: "mtr_material",
      ownerPath: `${emitterOwnerPath}/mtr`,
      requestedResourceClass: "material",
      requestedRef: emitter.mtr,
      preloadIntent: "runtime_required",
      ...edgeSourceIdentity(sourceIdentity)
    });
  }
  if (emitter.customShader) {
    addEdge({
      edgeType: "shader",
      ownerPath: `${emitterOwnerPath}/custom-shader`,
      requestedResourceClass: "shader",
      requestedRef: emitter.customShader,
      preloadIntent: "runtime_required",
      ...edgeSourceIdentity(sourceIdentity)
    });
  }
  if (emitter.chunkName) {
    addEdge({
      edgeType: "chunk_model",
      ownerPath: `${emitterOwnerPath}/chunkName`,
      requestedResourceClass: "chunk_model",
      requestedRef: emitter.chunkName,
      preloadIntent: "runtime_required",
      diagnostics: [
        ...(hasTextureResourceRef
          ? [
              dependencyDiagnostic(
                "VFX_CHUNKNAME_OVERRIDES_TEXTURE",
                "warn",
                "Emitter has texture and chunkName; chunkName selects the chunk-model lane while texture raw tokens remain preserved."
              )
            ]
          : [])
      ],
      ...edgeSourceIdentity(sourceIdentity)
    });
  }
}

function addTextureLane(
  fieldName: "texture" | "texture0",
  requestedRef: string | undefined,
  emitter: AuroraVfxDependencyEmitterSource,
  emitterOwnerPath: string,
  sourceIdentity: SourceIdentity,
  addEdge: (edge: AddEdgeInput) => void
): void {
  if (!requestedRef || isAuroraVfxNoTextureToken(requestedRef)) {
    return;
  }
  const diagnostics: AuroraVfxDiagnostic[] = [];
  if (emitter.chunkName) {
    diagnostics.push(
      dependencyDiagnostic(
        "VFX_CHUNKNAME_OVERRIDES_TEXTURE",
        "warn",
        "Texture token is preserved, but chunkName selects the chunk-model runtime lane."
      )
    );
  }
  if (/\.plt$/iu.test(requestedRef)) {
    diagnostics.push(
      dependencyDiagnostic(
        "VFX_PLT_PROFILE_GATED",
        "warn",
        "PLT texture dependency is profile-gated and must not be treated as classic Aurora texture parity without profile evidence."
      )
    );
  }

  addEdge({
    edgeType: "texture",
    ownerPath: `${emitterOwnerPath}/${fieldName}`,
    requestedResourceClass: "texture",
    requestedRef,
    preloadIntent: emitter.chunkName ? "preserve_raw" : "runtime_required",
    diagnostics,
    ...edgeSourceIdentity(sourceIdentity)
  });
  addEdge({
    edgeType: "txi_sidecar",
    ownerPath: `${emitterOwnerPath}/${fieldName}.txi`,
    requestedResourceClass: "txi",
    requestedRef: `${stripKnownResourceExtension(requestedRef)}.txi`,
    preloadIntent: "preview_optional",
    ...edgeSourceIdentity(sourceIdentity)
  });
}

interface SourceIdentity {
  ownerPath: string;
  sourceTable?: string;
  sourceRowId?: number;
  sourceLayer?: string;
  sourceHash?: string;
}

export function isAuroraVfxNoTextureToken(value: string): boolean {
  return value.trim().toLowerCase() === "null";
}

function edgeSourceIdentity(sourceIdentity: SourceIdentity): Omit<SourceIdentity, "ownerPath"> {
  return {
    ...(sourceIdentity.sourceTable ? { sourceTable: sourceIdentity.sourceTable } : {}),
    ...(typeof sourceIdentity.sourceRowId === "number"
      ? { sourceRowId: sourceIdentity.sourceRowId }
      : {}),
    ...(sourceIdentity.sourceLayer ? { sourceLayer: sourceIdentity.sourceLayer } : {}),
    ...(sourceIdentity.sourceHash ? { sourceHash: sourceIdentity.sourceHash } : {})
  };
}

function buildSourceIdentity(
  sourceRow: BuildAuroraVfxDependencyGraphInput["sourceRow"],
  phaseSchedule: AuroraVfxPhaseSchedule | undefined
): SourceIdentity {
  const sourceTable = sourceRow?.sourceTable;
  const sourceRowId = sourceRow?.rowId ?? phaseSchedule?.sourceRowId;
  const ownerPath =
    sourceTable && typeof sourceRowId === "number"
      ? `${sourceTable}:${sourceRowId}`
      : typeof sourceRowId === "number"
        ? `visualeffects.2da:${sourceRowId}`
        : "vfx:unknown-source";

  return {
    ownerPath,
    ...(sourceTable ? { sourceTable } : {}),
    ...(typeof sourceRowId === "number" ? { sourceRowId } : {}),
    ...(sourceRow?.sourceLayer ? { sourceLayer: sourceRow.sourceLayer } : {}),
    ...(sourceRow?.sourceHash ? { sourceHash: sourceRow.sourceHash } : {})
  };
}

function buildDependencyEdge(
  edge: AddEdgeInput,
  sourcePolicyTrace: AuroraVfxSourcePolicyTrace | undefined,
  resourceTraces: AuroraVfxDependencyResolverTrace[]
): AuroraVfxDependencyEdge {
  const trace = findResolverTrace(edge, resourceTraces);
  const selectedCandidate = trace?.selectedCandidate;
  const diagnostics = [
    ...(edge.diagnostics ?? []),
    ...(trace?.diagnostics ?? []),
    ...(edge.edgeType === "texture" &&
    selectedCandidate?.resourceKey &&
    /\.plt$/iu.test(selectedCandidate.resourceKey) &&
    !/\.plt$/iu.test(edge.requestedRef)
      ? [
          dependencyDiagnostic(
            "VFX_PLT_PROFILE_GATED",
            "warn",
            "The selected texture candidate is PLT. Target-object layer colors and the EE PLT generation profile are required before canonical rendering."
          )
        ]
      : [])
  ];
  const resolveStatus = resolveEdgeStatus(edge, selectedCandidate);
  if (resolveStatus === "unresolved") {
    diagnostics.push(buildMissingResourceDiagnostic(edge));
  }
  const cacheKeyParts: AuroraVfxDependencyEdgeCacheKeyParts = {
    version: "aurora-vfx-dependency-edge/v1",
    edgeType: edge.edgeType,
    ownerPath: edge.ownerPath,
    requestedResourceClass: edge.requestedResourceClass,
    requestedRef: edge.requestedRef,
    ...(edge.sourceTable ? { sourceTable: edge.sourceTable } : {}),
    ...(typeof edge.sourceRowId === "number" ? { sourceRowId: edge.sourceRowId } : {}),
    ...(edge.sourcePhase ? { sourcePhase: edge.sourcePhase } : {}),
    ...(edge.sourceLayer ? { sourceLayer: edge.sourceLayer } : {}),
    ...(edge.sourceHash ? { sourceHash: edge.sourceHash } : {}),
    ...(selectedCandidate?.resourceKey
      ? { selectedResourceKey: selectedCandidate.resourceKey }
      : {}),
    ...(selectedCandidate?.resourceHash
      ? { selectedResourceHash: selectedCandidate.resourceHash }
      : {}),
    ...(sourcePolicyTrace
      ? {
          runtimeSettingsRevision: sourcePolicyTrace.cacheKeyParts.runtimeSettingsRevision,
          hakListHash: sourcePolicyTrace.cacheKeyParts.hakListHash,
          sourcePolicyHash: sourcePolicyTrace.cacheKeyParts.policyHash,
          ...(sourcePolicyTrace.cacheKeyParts.selectedTableHash
            ? { selectedTableHash: sourcePolicyTrace.cacheKeyParts.selectedTableHash }
            : {})
        }
      : {})
  };

  return {
    edgeId: `vfx-edge:${hashStable({
      edgeType: edge.edgeType,
      ownerPath: edge.ownerPath,
      requestedResourceClass: edge.requestedResourceClass,
      requestedRef: edge.requestedRef
    }).slice(0, 16)}`,
    edgeType: edge.edgeType,
    ownerPath: edge.ownerPath,
    requestedResourceClass: edge.requestedResourceClass,
    requestedRef: edge.requestedRef,
    ...(edge.sourceTable ? { sourceTable: edge.sourceTable } : {}),
    ...(typeof edge.sourceRowId === "number" ? { sourceRowId: edge.sourceRowId } : {}),
    ...(edge.sourcePhase ? { sourcePhase: edge.sourcePhase } : {}),
    ...(edge.sourceLayer ? { sourceLayer: edge.sourceLayer } : {}),
    ...(selectedCandidate ? { selectedCandidate } : {}),
    lowerPrecedenceCandidates: trace?.lowerPrecedenceCandidates ?? [],
    resolveStatus,
    diagnostics,
    cacheKeyParts,
    preloadIntent: edge.preloadIntent
  };
}

function findResolverTrace(
  edge: AddEdgeInput,
  resourceTraces: AuroraVfxDependencyResolverTrace[]
): AuroraVfxDependencyResolverTrace | undefined {
  return resourceTraces.find(
    (trace) =>
      trace.requestedResourceClass === edge.requestedResourceClass &&
      normalizeResourceRef(trace.requestedRef) === normalizeResourceRef(edge.requestedRef) &&
      (!trace.ownerPath || trace.ownerPath === edge.ownerPath)
  );
}

function resolveEdgeStatus(
  edge: AddEdgeInput,
  selectedCandidate: AuroraVfxDependencyCandidate | undefined
): AuroraVfxDependencyResolveStatus {
  if (edge.edgeType === "emitter_node") {
    return "source_only";
  }
  if (edge.preloadIntent === "preserve_raw") {
    return selectedCandidate ? "resolved" : "preserved";
  }
  return selectedCandidate ? "resolved" : "unresolved";
}

function buildMissingResourceDiagnostic(edge: AddEdgeInput): AuroraVfxDiagnostic {
  if (edge.edgeType === "texture") {
    return dependencyDiagnostic(
      "VFX_TEXTURE_RESOURCE_MISSING_DIAGNOSTIC",
      "warn",
      `Texture '${edge.requestedRef}' remains an unresolved VFX dependency edge.`
    );
  }
  if (edge.edgeType === "chunk_model") {
    return dependencyDiagnostic(
      "VFX_CHUNK_MODEL_MISSING",
      "warn",
      `Chunk model '${edge.requestedRef}' remains unresolved; do not fall back to textured billboard semantics.`
    );
  }
  if (edge.edgeType === "shader") {
    return dependencyDiagnostic(
      "VFX_SHADER_RESOURCE_MISSING",
      "warn",
      `Shader '${edge.requestedRef}' remains an unresolved VFX dependency edge.`
    );
  }
  if (edge.edgeType === "sound") {
    return dependencyDiagnostic(
      "VFX_SOUND_RESOURCE_MISSING",
      "warn",
      `Sound '${edge.requestedRef}' remains an unresolved VFX dependency edge.`
    );
  }
  return dependencyDiagnostic(
    "VFX_DEPENDENCY_RESOURCE_UNRESOLVED",
    "warn",
    `${edge.edgeType} dependency '${edge.requestedRef}' remains unresolved.`
  );
}

function dependencyDiagnostic(
  code: string,
  severity: AuroraVfxDiagnostic["severity"],
  message: string
): AuroraVfxDiagnostic {
  return { code, severity, message };
}

function stripKnownResourceExtension(value: string): string {
  return value.trim().replace(/\.(tga|dds|plt|txi|mtr|mdl|mdb|wav|bmu)$/iu, "");
}

function normalizeResourceRef(value: string): string {
  return value.trim().replace(/\\/gu, "/").toLowerCase();
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
