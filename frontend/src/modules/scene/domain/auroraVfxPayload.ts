import type {
  AuroraVfxDiagnosticGroupKey,
  AuroraVfxJsonValue,
  AuroraVfxPayload,
  AuroraVfxPayloadContracts,
  AuroraVfxPayloadDiagnostics,
  AuroraVfxPayloadProvenance,
  AuroraVfxRendererEligibility,
  AuroraVfxRetailParityStatus,
  AreaScene,
  SceneObject,
  SceneObjectVfxCanonicalStatus,
  SceneObjectVfxDiagnostic,
  SceneObjectVfxPreservePayload,
  SceneObjectVfxPreviewMode,
  SceneObjectVfxSourceKind
} from "../contracts";

const AURORA_VFX_PAYLOAD_VERSION: AuroraVfxPayload["version"] = "aurora-vfx-payload/v1";
const SCENE_VFX_PAYLOAD_VERSION: NonNullable<SceneObjectVfxPreservePayload["version"]> =
  "scene-object-vfx-preserve/v1";

const DIAGNOSTIC_GROUP_KEYS: AuroraVfxDiagnosticGroupKey[] = [
  "sourceRows",
  "effectInstance",
  "phaseSchedule",
  "dependencyGraph",
  "runtimeState",
  "renderContract",
  "payload"
];

const VFX_DIAGNOSTIC_SEVERITIES = new Set<SceneObjectVfxDiagnostic["severity"]>([
  "info",
  "warn",
  "error"
]);

const VFX_SOURCE_KINDS = new Set<SceneObjectVfxSourceKind>([
  "unknown",
  "placeable_preview",
  "source_mdl_graph",
  "visualeffects_2da",
  "effect_instance"
]);

const VFX_PREVIEW_MODES = new Set<SceneObjectVfxPreviewMode>([
  "none",
  "sprite_scaffold",
  "derived_model_preview",
  "static_model_preview",
  "aurora_emitter_particle_preview",
  "aurora_light_node_preview",
  "aurora_light_node_source_only",
  "texture_particle_preview",
  "chunk_model_source_only",
  "chunk_model_particle_preview"
]);

const VFX_CANONICAL_STATUSES = new Set<SceneObjectVfxCanonicalStatus>([
  "unmapped",
  "preview_only",
  "canonical"
]);

const VFX_RENDERER_ELIGIBILITY = new Set<AuroraVfxRendererEligibility>([
  "blocked",
  "preview_only",
  "source_backed"
]);

const VFX_RETAIL_PARITY_STATUSES = new Set<AuroraVfxRetailParityStatus>([
  "unproven",
  "blocked",
  "proven"
]);

export interface BuildSceneObjectVfxPayloadOptions {
  profile?: string;
  emitter?: string;
  script?: string;
  sourceLabel?: string;
  sourceResRef?: string;
  previewMode?: SceneObjectVfxPreviewMode;
}

export interface MapAuroraVfxPayloadToSceneObjectOptions
  extends BuildSceneObjectVfxPayloadOptions {
  id?: string;
  name?: string;
  tag?: string;
  resRef?: string;
  x?: number;
  y?: number;
  z?: number;
  bearing?: number;
  now?: () => number;
}

export interface MapAuroraVfxPayloadToSceneOptions
  extends MapAuroraVfxPayloadToSceneObjectOptions {
  sceneId?: string;
  areaName?: string;
  width?: number;
  height?: number;
}

export function normalizeAuroraVfxPayload(value: unknown): AuroraVfxPayload | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const diagnostics = normalizeDiagnosticsGroups(value);
  const requestedCanonicalStatus = readCanonicalStatus(value.canonicalStatus, "unmapped");
  const backendCanonical = value.backendCanonical === true || value.canonical === true;
  const canonicalStatus =
    requestedCanonicalStatus === "canonical" && !backendCanonical
      ? "preview_only"
      : requestedCanonicalStatus;
  const legacyRendererEligibility: AuroraVfxRendererEligibility =
    canonicalStatus === "canonical" && backendCanonical
      ? "source_backed"
      : canonicalStatus === "preview_only"
        ? "preview_only"
        : "blocked";
  const rendererEligibility = readEnum(
    value.rendererEligibility,
    VFX_RENDERER_ELIGIBILITY,
    legacyRendererEligibility
  );
  const retailParityStatus = readEnum(
    value.retailParityStatus,
    VFX_RETAIL_PARITY_STATUSES,
    value.canonicalParityPromoted === true ? "proven" : "unproven"
  );

  if (requestedCanonicalStatus === "canonical" && !backendCanonical) {
    diagnostics.payload.push({
      code: "VFX_CANONICAL_STATUS_BACKEND_MARK_REQUIRED",
      severity: "warn",
      message:
        "VFX payload requested canonical status without backendCanonical=true; frontend downgraded it to preview_only."
    });
  }

  return {
    version: AURORA_VFX_PAYLOAD_VERSION,
    canonicalStatus,
    backendCanonical: backendCanonical && canonicalStatus === "canonical",
    rendererEligibility,
    retailParityStatus,
    sourceKind: readSourceKind(value.sourceKind, "unknown"),
    previewMode: readPreviewMode(value.previewMode, "none"),
    diagnostics,
    contracts: normalizeContracts(value),
    provenance: normalizeProvenance(value)
  };
}

export function buildSceneObjectVfxPayloadFromAuroraPayload(
  value: unknown,
  options: BuildSceneObjectVfxPayloadOptions = {}
): SceneObjectVfxPreservePayload | undefined {
  const auroraPayload = normalizeAuroraVfxPayload(value);
  if (!auroraPayload) {
    return undefined;
  }
  const sourceResRef =
    options.sourceResRef ??
    auroraPayload.provenance.sourceResRef ??
    readString((value as Record<string, unknown>).sourceResRef, "");
  const sourceLabel =
    options.sourceLabel ??
    auroraPayload.provenance.sourceLabel ??
    readString((value as Record<string, unknown>).sourceLabel, sourceResRef);

  return {
    version: SCENE_VFX_PAYLOAD_VERSION,
    profile:
      options.profile ??
      auroraPayload.provenance.runtimeProfile ??
      auroraPayload.provenance.sourceProfile ??
      "",
    emitter: options.emitter ?? readString((value as Record<string, unknown>).emitter, sourceResRef),
    script: options.script ?? readString((value as Record<string, unknown>).script, ""),
    sourceKind: auroraPayload.sourceKind,
    sourceProfile: auroraPayload.provenance.sourceProfile ?? "",
    sourceTable: auroraPayload.provenance.sourceTable ?? "",
    ...(typeof auroraPayload.provenance.sourceRowId === "number"
      ? { sourceRowId: auroraPayload.provenance.sourceRowId }
      : {}),
    sourceLabel,
    sourceResRef,
    previewMode: options.previewMode ?? auroraPayload.previewMode,
    canonicalStatus: auroraPayload.canonicalStatus,
    diagnostics: collectAuroraVfxPayloadDiagnostics(auroraPayload),
    auroraPayload,
    flags: {
      isAuroraVfxPayload: true,
      backendCanonical: auroraPayload.backendCanonical
    },
    extra: {
      auroraVfxPayloadVersion: auroraPayload.version,
      backendPayloadVersion: auroraPayload.provenance.backendPayloadVersion ?? ""
    }
  };
}

export function buildPreviewOnlyAuroraVfxPayload(input: {
  sourceKind: SceneObjectVfxSourceKind;
  previewMode: SceneObjectVfxPreviewMode;
  sourceProfile?: string;
  sourceTable?: string;
  sourceRowId?: number;
  sourceLabel?: string;
  sourceResRef?: string;
  diagnostics?: SceneObjectVfxDiagnostic[];
}): AuroraVfxPayload {
  return {
    version: AURORA_VFX_PAYLOAD_VERSION,
    canonicalStatus: "preview_only",
    backendCanonical: false,
    rendererEligibility: "preview_only",
    retailParityStatus: "blocked",
    sourceKind: input.sourceKind,
    previewMode: input.previewMode,
    diagnostics: {
      ...emptyDiagnosticGroups(),
      payload: [...(input.diagnostics ?? [])]
    },
    contracts: {},
    provenance: {
      ...(input.sourceProfile ? { sourceProfile: input.sourceProfile } : {}),
      ...(input.sourceTable ? { sourceTable: input.sourceTable } : {}),
      ...(typeof input.sourceRowId === "number" ? { sourceRowId: input.sourceRowId } : {}),
      ...(input.sourceLabel ? { sourceLabel: input.sourceLabel } : {}),
      ...(input.sourceResRef ? { sourceResRef: input.sourceResRef } : {})
    }
  };
}

export function collectAuroraVfxPayloadDiagnostics(
  payload: AuroraVfxPayload | undefined
): SceneObjectVfxDiagnostic[] {
  if (!payload) {
    return [];
  }
  return DIAGNOSTIC_GROUP_KEYS.flatMap((key) => payload.diagnostics[key].map((entry) => ({ ...entry })));
}

export function summarizeAuroraVfxDiagnosticGroups(
  payload: AuroraVfxPayload | undefined
): { label: string; title: string } | null {
  if (!payload) {
    return null;
  }
  const parts = DIAGNOSTIC_GROUP_KEYS.flatMap((key) => {
    const count = payload.diagnostics[key].length;
    return count > 0 ? [`${groupLabel(key)} ${count}`] : [];
  });
  if (parts.length === 0) {
    return null;
  }
  const title = DIAGNOSTIC_GROUP_KEYS.flatMap((key) =>
    payload.diagnostics[key].map((diagnostic) => `${groupLabel(key)}: ${diagnostic.code}`)
  ).join(", ");
  return {
    label: parts.join(", "),
    title
  };
}

export function cloneSceneObjectVfxPayload(
  payload: SceneObjectVfxPreservePayload | undefined
): SceneObjectVfxPreservePayload | undefined {
  if (!payload) {
    return undefined;
  }
  return {
    ...payload,
    diagnostics: payload.diagnostics.map((entry) => ({ ...entry })),
    ...(payload.auroraPayload ? { auroraPayload: cloneAuroraVfxPayload(payload.auroraPayload) } : {}),
    flags: { ...payload.flags },
    extra: { ...payload.extra }
  };
}

export function cloneAuroraVfxPayload(payload: AuroraVfxPayload): AuroraVfxPayload {
  return {
    ...payload,
    diagnostics: DIAGNOSTIC_GROUP_KEYS.reduce((groups, key) => {
      groups[key] = payload.diagnostics[key].map((entry) => ({ ...entry }));
      return groups;
    }, emptyDiagnosticGroups()),
    contracts: cloneContracts(payload.contracts),
    provenance: { ...payload.provenance }
  };
}

export function mapAuroraVfxPayloadToSceneObject(
  value: unknown,
  options: MapAuroraVfxPayloadToSceneObjectOptions = {}
): SceneObject | undefined {
  const vfxPayload = buildSceneObjectVfxPayloadFromAuroraPayload(value, options);
  if (!vfxPayload) {
    return undefined;
  }
  const sourceResRef = options.resRef ?? vfxPayload.sourceResRef ?? "aurora_vfx";
  const objectId =
    options.id ??
    `vfx:${sourceResRef}:${vfxPayload.sourceTable || "payload"}:${vfxPayload.sourceRowId ?? "na"}`;
  const objectName = options.name ?? vfxPayload.sourceLabel ?? sourceResRef;
  const tag = options.tag ?? objectName.toUpperCase().replace(/[^A-Z0-9_]+/gu, "_");
  return {
    id: objectId,
    kind: "placeables",
    name: objectName,
    resRef: sourceResRef,
    tag,
    isStatic: false,
    vfxPayload,
    x: options.x ?? 0,
    y: options.y ?? 0,
    z: options.z ?? 0,
    bearing: options.bearing ?? 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0
    }
  };
}

export function mapAuroraVfxPayloadToScene(
  value: unknown,
  options: MapAuroraVfxPayloadToSceneOptions = {}
): AreaScene | undefined {
  const object = mapAuroraVfxPayloadToSceneObject(value, options);
  if (!object) {
    return undefined;
  }
  const now = options.now ?? (() => Date.now());
  return {
    sceneId: options.sceneId ?? `${object.id}:scene`,
    areaName: options.areaName ?? `${object.name ?? object.tag} VFX`,
    width: options.width ?? 1,
    height: options.height ?? 1,
    tiles: [],
    objects: [object],
    updatedAtUnixMs: now(),
    source: "seed"
  };
}

function normalizeDiagnosticsGroups(source: Record<string, unknown>): AuroraVfxPayloadDiagnostics {
  const groups = emptyDiagnosticGroups();
  const diagnostics = isRecord(source.diagnostics) ? source.diagnostics : {};

  groups.sourceRows = normalizeDiagnosticArray(
    diagnostics.sourceRows ??
      source.sourceRowDiagnostics ??
      source.sourceDiagnostics ??
      readNested(source.sourceRows, "diagnostics")
  );
  groups.effectInstance = normalizeDiagnosticArray(
    diagnostics.effectInstance ??
      source.effectInstanceDiagnostics ??
      readNested(source.effectInstance, "diagnostics")
  );
  groups.phaseSchedule = normalizeDiagnosticArray(
    diagnostics.phaseSchedule ??
      source.phaseScheduleDiagnostics ??
      readNested(source.phaseSchedule, "diagnostics")
  );
  groups.dependencyGraph = normalizeDiagnosticArray(
    diagnostics.dependencyGraph ??
      source.dependencyGraphDiagnostics ??
      readNested(source.dependencyGraph, "diagnostics")
  );
  groups.runtimeState = normalizeDiagnosticArray(
    diagnostics.runtimeState ??
      source.runtimeDiagnostics ??
      readNested(source.runtimeState, "diagnostics")
  );
  groups.renderContract = normalizeDiagnosticArray(
    diagnostics.renderContract ??
      source.renderContractDiagnostics ??
      readNested(source.renderContract, "diagnostics")
  );
  groups.payload = normalizeDiagnosticArray(diagnostics.payload ?? source.payloadDiagnostics);

  return groups;
}

function normalizeContracts(source: Record<string, unknown>): AuroraVfxPayloadContracts {
  const nestedContracts = isRecord(source.contracts) ? source.contracts : {};
  return {
    ...(cloneJsonValue(source.sourceRows ?? nestedContracts.sourceRows) !== undefined
      ? { sourceRows: cloneJsonValue(source.sourceRows ?? nestedContracts.sourceRows)! }
      : {}),
    ...(cloneJsonValue(source.effectInstance ?? nestedContracts.effectInstance) !== undefined
      ? { effectInstance: cloneJsonValue(source.effectInstance ?? nestedContracts.effectInstance)! }
      : {}),
    ...(cloneJsonValue(source.aoeRuntimeObject ?? nestedContracts.aoeRuntimeObject) !== undefined
      ? {
          aoeRuntimeObject: cloneJsonValue(
            source.aoeRuntimeObject ?? nestedContracts.aoeRuntimeObject
          )!
        }
      : {}),
    ...(cloneJsonValue(source.phaseSchedule ?? nestedContracts.phaseSchedule) !== undefined
      ? { phaseSchedule: cloneJsonValue(source.phaseSchedule ?? nestedContracts.phaseSchedule)! }
      : {}),
    ...(cloneJsonValue(source.dependencyGraph ?? nestedContracts.dependencyGraph) !== undefined
      ? { dependencyGraph: cloneJsonValue(source.dependencyGraph ?? nestedContracts.dependencyGraph)! }
      : {}),
    ...(cloneJsonValue(source.runtimeReplayCommand ?? nestedContracts.runtimeReplayCommand) !==
    undefined
      ? {
          runtimeReplayCommand: cloneJsonValue(
            source.runtimeReplayCommand ?? nestedContracts.runtimeReplayCommand
          )!
        }
      : {}),
    ...(cloneJsonValue(source.runtimeEmitters ?? nestedContracts.runtimeEmitters) !== undefined
      ? { runtimeEmitters: cloneJsonValue(source.runtimeEmitters ?? nestedContracts.runtimeEmitters)! }
      : {}),
    ...(cloneJsonValue(
      source.runtimeEmittersDeferred ?? nestedContracts.runtimeEmittersDeferred
    ) !== undefined
      ? {
          runtimeEmittersDeferred: cloneJsonValue(
            source.runtimeEmittersDeferred ?? nestedContracts.runtimeEmittersDeferred
          )!
        }
      : {}),
    ...(cloneJsonValue(
      source.runtimeEmittersHydration ?? nestedContracts.runtimeEmittersHydration
    ) !== undefined
      ? {
          runtimeEmittersHydration: cloneJsonValue(
            source.runtimeEmittersHydration ?? nestedContracts.runtimeEmittersHydration
          )!
        }
      : {}),
    ...(cloneJsonValue(source.runtimeState ?? nestedContracts.runtimeState) !== undefined
      ? { runtimeState: cloneJsonValue(source.runtimeState ?? nestedContracts.runtimeState)! }
      : {}),
    ...(cloneJsonValue(source.runtimeSharedRng ?? nestedContracts.runtimeSharedRng) !==
    undefined
      ? {
          runtimeSharedRng: cloneJsonValue(
            source.runtimeSharedRng ?? nestedContracts.runtimeSharedRng
          )!
        }
      : {}),
    ...(cloneJsonValue(source.renderContract ?? nestedContracts.renderContract) !== undefined
      ? { renderContract: cloneJsonValue(source.renderContract ?? nestedContracts.renderContract)! }
      : {}),
    ...(cloneJsonValue(source.sourceModelGraph ?? nestedContracts.sourceModelGraph) !== undefined
      ? {
          sourceModelGraph: cloneJsonValue(
            source.sourceModelGraph ?? nestedContracts.sourceModelGraph
          )!
        }
      : {}),
    ...(cloneJsonValue(source.sourceMdlLights ?? nestedContracts.sourceMdlLights) !== undefined
      ? { sourceMdlLights: cloneJsonValue(source.sourceMdlLights ?? nestedContracts.sourceMdlLights)! }
      : {}),
    ...(cloneJsonValue(
      source.sourceMdlLightFeatureManifest ?? nestedContracts.sourceMdlLightFeatureManifest
    ) !== undefined
      ? {
          sourceMdlLightFeatureManifest: cloneJsonValue(
            source.sourceMdlLightFeatureManifest ?? nestedContracts.sourceMdlLightFeatureManifest
          )!
        }
      : {})
  };
}

function cloneContracts(contracts: AuroraVfxPayloadContracts): AuroraVfxPayloadContracts {
  return {
    ...(contracts.sourceRows !== undefined ? { sourceRows: cloneJsonValue(contracts.sourceRows)! } : {}),
    ...(contracts.effectInstance !== undefined
      ? { effectInstance: cloneJsonValue(contracts.effectInstance)! }
      : {}),
    ...(contracts.aoeRuntimeObject !== undefined
      ? { aoeRuntimeObject: cloneJsonValue(contracts.aoeRuntimeObject)! }
      : {}),
    ...(contracts.phaseSchedule !== undefined
      ? { phaseSchedule: cloneJsonValue(contracts.phaseSchedule)! }
      : {}),
    ...(contracts.dependencyGraph !== undefined
      ? { dependencyGraph: cloneJsonValue(contracts.dependencyGraph)! }
      : {}),
    ...(contracts.runtimeReplayCommand !== undefined
      ? { runtimeReplayCommand: cloneJsonValue(contracts.runtimeReplayCommand)! }
      : {}),
    ...(contracts.runtimeEmitters !== undefined
      ? { runtimeEmitters: cloneJsonValue(contracts.runtimeEmitters)! }
      : {}),
    ...(contracts.runtimeEmittersDeferred !== undefined
      ? { runtimeEmittersDeferred: cloneJsonValue(contracts.runtimeEmittersDeferred)! }
      : {}),
    ...(contracts.runtimeEmittersHydration !== undefined
      ? { runtimeEmittersHydration: cloneJsonValue(contracts.runtimeEmittersHydration)! }
      : {}),
    ...(contracts.runtimeState !== undefined
      ? { runtimeState: cloneJsonValue(contracts.runtimeState)! }
      : {}),
    ...(contracts.runtimeSharedRng !== undefined
      ? { runtimeSharedRng: cloneJsonValue(contracts.runtimeSharedRng)! }
      : {}),
    ...(contracts.renderContract !== undefined
      ? { renderContract: cloneJsonValue(contracts.renderContract)! }
      : {}),
    ...(contracts.sourceModelGraph !== undefined
      ? { sourceModelGraph: cloneJsonValue(contracts.sourceModelGraph)! }
      : {}),
    ...(contracts.sourceMdlLights !== undefined
      ? { sourceMdlLights: cloneJsonValue(contracts.sourceMdlLights)! }
      : {}),
    ...(contracts.sourceMdlLightFeatureManifest !== undefined
      ? {
          sourceMdlLightFeatureManifest: cloneJsonValue(
            contracts.sourceMdlLightFeatureManifest
          )!
        }
      : {})
  };
}

function normalizeProvenance(source: Record<string, unknown>): AuroraVfxPayloadProvenance {
  const sourceRows = source.sourceRows;
  const nestedContracts = isRecord(source.contracts) ? source.contracts : {};
  const renderContract = source.renderContract ?? nestedContracts.renderContract;
  const provenance = isRecord(source.provenance) ? source.provenance : {};
  const sourceRowId =
    readOptionalNumber(provenance.sourceRowId) ??
    readOptionalNumber(source.sourceRowId) ??
    readOptionalNumber(readNested(sourceRows, "rowId"));
  return {
    ...(readOptionalString(source.version) ? { backendPayloadVersion: readOptionalString(source.version)! } : {}),
    ...(readOptionalString(provenance.sourceProfile) ?? readOptionalString(source.sourceProfile)
      ? {
          sourceProfile:
            readOptionalString(provenance.sourceProfile) ?? readOptionalString(source.sourceProfile)!
        }
      : {}),
    ...(readOptionalString(provenance.sourceTable) ?? readOptionalString(source.sourceTable)
      ? {
          sourceTable:
            readOptionalString(provenance.sourceTable) ?? readOptionalString(source.sourceTable)!
        }
      : {}),
    ...(typeof sourceRowId === "number" ? { sourceRowId } : {}),
    ...(readOptionalString(provenance.sourceLabel) ?? readOptionalString(source.sourceLabel)
      ? {
          sourceLabel:
            readOptionalString(provenance.sourceLabel) ?? readOptionalString(source.sourceLabel)!
        }
      : {}),
    ...(readOptionalString(provenance.sourceResRef) ?? readOptionalString(source.sourceResRef)
      ? {
          sourceResRef:
            readOptionalString(provenance.sourceResRef) ?? readOptionalString(source.sourceResRef)!
        }
      : {}),
    ...(readOptionalString(provenance.effectInstanceId) ?? readOptionalString(source.effectInstanceId)
      ? {
          effectInstanceId:
            readOptionalString(provenance.effectInstanceId) ??
            readOptionalString(source.effectInstanceId)!
        }
      : {}),
    ...(readOptionalString(provenance.runtimeProfile) ?? readOptionalString(source.runtimeProfile)
      ? {
          runtimeProfile:
            readOptionalString(provenance.runtimeProfile) ?? readOptionalString(source.runtimeProfile)!
        }
      : {}),
    ...(readOptionalString(readNested(renderContract, "version"))
      ? { renderContractVersion: readOptionalString(readNested(renderContract, "version"))! }
      : {})
  };
}

function emptyDiagnosticGroups(): AuroraVfxPayloadDiagnostics {
  return {
    sourceRows: [],
    effectInstance: [],
    phaseSchedule: [],
    dependencyGraph: [],
    runtimeState: [],
    renderContract: [],
    payload: []
  };
}

function normalizeDiagnosticArray(value: unknown): SceneObjectVfxDiagnostic[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }
    const code = readString(entry.code, "").trim();
    if (!code) {
      return [];
    }
    return [
      {
        code,
        severity: readEnum(entry.severity, VFX_DIAGNOSTIC_SEVERITIES, "warn"),
        message: readString(entry.message, "")
      }
    ];
  });
}

function cloneJsonValue(value: unknown): AuroraVfxJsonValue | undefined {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      const cloned = cloneJsonValue(entry);
      return cloned === undefined ? [] : [cloned];
    });
  }
  if (!isRecord(value)) {
    return undefined;
  }
  const result: { [key: string]: AuroraVfxJsonValue } = {};
  Object.entries(value).forEach(([key, entry]) => {
    const cloned = cloneJsonValue(entry);
    if (cloned !== undefined) {
      result[key] = cloned;
    }
  });
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNested(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined;
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readEnum<TValue extends string>(
  value: unknown,
  allowed: ReadonlySet<TValue>,
  fallback: TValue
): TValue {
  return typeof value === "string" && allowed.has(value as TValue)
    ? (value as TValue)
    : fallback;
}

function readSourceKind(value: unknown, fallback: SceneObjectVfxSourceKind): SceneObjectVfxSourceKind {
  return readEnum(value, VFX_SOURCE_KINDS, fallback);
}

function readPreviewMode(value: unknown, fallback: SceneObjectVfxPreviewMode): SceneObjectVfxPreviewMode {
  return readEnum(value, VFX_PREVIEW_MODES, fallback);
}

function readCanonicalStatus(
  value: unknown,
  fallback: SceneObjectVfxCanonicalStatus
): SceneObjectVfxCanonicalStatus {
  return readEnum(value, VFX_CANONICAL_STATUSES, fallback);
}

function groupLabel(key: AuroraVfxDiagnosticGroupKey): string {
  switch (key) {
    case "sourceRows":
      return "source";
    case "effectInstance":
      return "effect";
    case "phaseSchedule":
      return "schedule";
    case "dependencyGraph":
      return "dependency";
    case "runtimeState":
      return "runtime";
    case "renderContract":
      return "render";
    default:
      return "payload";
  }
}
