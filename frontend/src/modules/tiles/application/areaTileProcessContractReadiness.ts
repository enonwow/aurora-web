import type { AreaApiTileInstance } from "../../areas/contracts";
import type { TileApiProcessResult } from "../contracts";
import type { TileApiPort } from "../ports/tileApiPort";

const TILE_PROCESS_CONTRACT_SUMMARY_SAMPLE_LIMIT = 6;
// A cold tile request may scan HAKs, extract its texture dependencies, and
// invoke the MDL -> GLB converter.  Submitting a whole Area as one batch made
// those native-source operations contend with each other and left the canvas
// in a half-restored state.  Keep this deliberately small: later tiles are
// published incrementally, so the viewport can render the proven ones first.
export const TILE_PROCESS_CONTRACT_BATCH_SIZE = 1;
export const DEFAULT_TILE_PROCESS_CONTRACT_TIMEOUT_MS = 120_000;

export type AreaTileProcessCandidateDisposition =
  | "process"
  | "blocked"
  | "excluded";

export interface AreaTileProcessContractCandidateInput {
  modelResRef?: string | null;
  tileDefinitionId?: number;
  disposition: AreaTileProcessCandidateDisposition;
  reasonCode?: string;
}

export type AreaTileMdlSourceAssetStatus =
  | "mdl_source_object_key_proven"
  | "source_object_key_proven_non_mdl"
  | "blocked_mdl_source_asset_key_missing"
  | "blocked_tile_process_contract_failed";

export type AreaTileGlbGeometryStatus =
  | "ready"
  | "blocked_tile_process_contract_missing_glb_geometry";

export type AreaTileMaterialReadinessStatus =
  | "ready"
  | "texture_proxy_contract_ready_material_bindings_unverified"
  | "blocked_tile_texture_delivery_contract_missing"
  | "blocked_tile_texture_contract_derived_model_only"
  | "blocked_tile_process_contract_missing_material_fields"
  | "blocked_tile_process_contract_missing_material_bindings"
  | "blocked_tile_material_binding_derived_model_only";

export interface AreaTileProcessContractEntry {
  modelResRef: string;
  tileId: string;
  status: "ready" | "blocked";
  processStatus: "ready" | "blocked";
  textureContractStatus: "ready" | "blocked" | "not_checked";
  mdlSourceAssetStatus: AreaTileMdlSourceAssetStatus;
  glbGeometryStatus: AreaTileGlbGeometryStatus;
  materialReadinessStatus: AreaTileMaterialReadinessStatus;
  cacheKey?: string;
  rendererPreset?: string;
  processedTileResref?: string;
  sourceAssetContractStatus: "ready" | "blocked";
  sourceObjectKey?: string;
  sourceObjectExtension?: string;
  sourceAssetOrigin?: string;
  sourceAssetRole?: string;
  mdlSourceContentSha256?: string;
  textureAtlasObjectKey?: string;
  textureAtlasContentType?: string;
  textureAtlasSizeBytes?: number;
  textureProxyUrl?: string;
  textureDeliveryStatus?: string;
  materialBindingStatus?: string;
  renderLoaderHandoffStatus: "ready" | "blocked_tile_model_geometry_loader_missing";
  modelDeliveryStatus?: "ready" | "blocked_tile_model_glb_missing";
  modelDeliveryUrl?: string;
  modelAssetObjectKey?: string;
  modelAssetExtension?: "glb" | "gltf";
  modelAssetContentSha256?: string;
  materialTextureAssets?: Array<{
    reference: string;
    deliveryUrl: string;
    resref: string;
    extension: string;
    objectKey: string;
    source: "module" | "hak" | "vanilla";
    contentSha256?: string;
  }>;
  expectedDerivedModelObjectKey?: string;
  renderAssetContractBlockers: string;
  mdlGlbMaterialBlockers: string;
  code?: string | null;
  message?: string;
}

export interface AreaTileProcessContractReadiness {
  status: "ready" | "partial" | "blocked";
  areaId: string;
  /** Full unique process-or-blocked model set for the current scene. */
  expectedCandidateCount?: number;
  /** Candidates not checked yet while incremental batches are still running. */
  pendingCandidateCount?: number;
  checkedCandidateCount: number;
  readyCandidateCount: number;
  blockedCandidateCount: number;
  candidateSample: string;
  readySample: string;
  sourceObjectKeySample: string;
  sourceAssetContractSample: string;
  blockerSummary: string;
  sourceAssetReadyCount: number;
  sourceAssetBlockedCount: number;
  mdlSourceReadyCount: number;
  mdlSourceBlockedCount: number;
  glbGeometryReadyCount: number;
  glbGeometryBlockedCount: number;
  materialTextureContractReadyCount: number;
  materialBindingBlockedCount: number;
  renderLoaderReadyCount: number;
  renderLoaderBlockedCount: number;
  textureMaterialBlockerSummary: string;
  renderAssetContractBlockerSummary: string;
  mdlGlbMaterialBlockerSummary: string;
  excludedTileDefinitionIds: number[];
  excludedTileDefinitionCount: number;
  entries: AreaTileProcessContractEntry[];
}

export interface AreaTileProcessContractReadinessOptions {
  bypassCache?: boolean;
  timeoutMs?: number;
  /** Called after each safe tile batch, with the currently proven contracts. */
  onProgress?: (readiness: AreaTileProcessContractReadiness) => void;
}

type AreaTileProcessContractWorkerOptions = Omit<
  AreaTileProcessContractReadinessOptions,
  "onProgress"
> & {
  onEntriesProgress?: (entries: readonly AreaTileProcessContractEntry[]) => void;
};

export interface AreaTileProcessContractSource {
  areaId: string;
  tiles?: readonly Pick<AreaApiTileInstance, "modelResRef">[];
}

export interface AreaTileProcessRequestIdentity {
  sceneKey: string;
  revision: number;
}

export function isCurrentAreaTileProcessRequest(
  request: AreaTileProcessRequestIdentity | null,
  sceneKey: string,
  revision: number
): boolean {
  return request?.sceneKey === sceneKey && request.revision === revision;
}

export function scopeAreaTileProcessReadinessToScene(
  readiness: AreaTileProcessContractReadiness | null,
  readinessSceneKey: string | null,
  currentSceneKey: string | null
): AreaTileProcessContractReadiness | null {
  return readinessSceneKey === currentSceneKey ? readiness : null;
}

export function buildAreaTileProcessContractSceneKey(
  areaId: string,
  modelResRefs: readonly (string | null | undefined)[]
): string {
  const normalized = Array.from(
    new Set(
      modelResRefs
        .map((value) => value?.trim().toLowerCase() ?? "")
        .filter((value) => value.length > 0)
    )
  ).sort();
  return `${areaId}\u0000${normalized.join("\u0000")}`;
}

export function buildAreaTileProcessContractSceneKeyForCandidates(
  areaId: string,
  candidates: readonly AreaTileProcessContractCandidateInput[]
): string {
  const tokens = Array.from(
    new Set(
      candidates.map((candidate) => {
        const modelResRef = normalizeTileModelResRef(candidate.modelResRef) || "missing";
        const tileDefinitionId = normalizeTileDefinitionId(candidate.tileDefinitionId);
        const reasonCode = candidate.reasonCode?.trim() || "none";
        return [
          candidate.disposition,
          modelResRef,
          tileDefinitionId === null ? "missing" : String(tileDefinitionId),
          ...(candidate.disposition === "process" ? [] : [reasonCode])
        ].join(":");
      })
    )
  ).sort();
  return `${areaId}\u0000${tokens.join("\u0000")}`;
}

export function countAreaTileProcessContractCandidates(
  candidates: readonly AreaTileProcessContractCandidateInput[]
): number {
  return resolveAreaTileProcessCandidatePlan(candidates).candidates.length;
}

export function resolveAreaTileProcessReadinessPublicationDecision(input: {
  currentSceneKey: string | null;
  acceptedSceneKey: string | null;
  publishedSceneKey: string | null;
}): "accept" | "clear" | "ignore" {
  if (input.publishedSceneKey) {
    return input.currentSceneKey === input.publishedSceneKey ? "accept" : "ignore";
  }
  if (
    input.currentSceneKey &&
    input.acceptedSceneKey === input.currentSceneKey
  ) {
    return "ignore";
  }
  return "clear";
}

export function shouldRequestAreaTileProcessReadiness(input: {
  currentSceneKey: string | null;
  acceptedSceneKey: string | null;
  inFlightSceneKey: string | null;
  hasReadiness: boolean;
}): boolean {
  if (!input.currentSceneKey) return false;
  if (
    input.hasReadiness &&
    input.acceptedSceneKey === input.currentSceneKey
  ) {
    return false;
  }
  return input.inFlightSceneKey !== input.currentSceneKey;
}

export function isAreaTileProcessReadinessCompleteForExpectedCandidates(
  readiness: AreaTileProcessContractReadiness | null,
  expectedCandidateCount: number
): boolean {
  if (!readiness) return false;
  return (
    readiness.status === "ready" &&
    readiness.blockedCandidateCount === 0 &&
    (readiness.pendingCandidateCount ?? 0) === 0 &&
    readiness.checkedCandidateCount === expectedCandidateCount &&
    readiness.readyCandidateCount === expectedCandidateCount
  );
}

export async function resolveAreaTileProcessContractReadiness(
  tileApiPort: TileApiPort,
  accessToken: string,
  detail: AreaTileProcessContractSource,
  options: AreaTileProcessContractReadinessOptions = {}
): Promise<AreaTileProcessContractReadiness> {
  return resolveAreaTileProcessContractReadinessForCandidates(
    tileApiPort,
    accessToken,
    detail.areaId,
    (detail.tiles ?? []).map((tile) => ({
      modelResRef: tile.modelResRef,
      disposition: "process"
    })),
    options
  );
}

export async function resolveAreaTileProcessContractReadinessForCandidates(
  tileApiPort: TileApiPort,
  accessToken: string,
  areaId: string,
  inputs: readonly AreaTileProcessContractCandidateInput[],
  options: AreaTileProcessContractReadinessOptions = {}
): Promise<AreaTileProcessContractReadiness> {
  const plan = resolveAreaTileProcessCandidatePlan(inputs);
  const expectedCandidateCount = plan.candidates.length;
  if (expectedCandidateCount === 0) {
    return buildEmptyAreaTileProcessContractReadiness(
      areaId,
      plan.excludedTileDefinitionIds
    );
  }

  const blockedEntries = plan.candidates
    .filter((candidate) => candidate.disposition === "blocked")
    .map((candidate) =>
      buildTileProcessContractEntryFromFailure(candidate, {
        code: candidate.reasonCode ?? "TILE_MODEL_SOURCE_UNAVAILABLE",
        message: "Tile model processing is blocked by immutable certification."
      })
    );
  const processCandidates = plan.candidates.filter(
    (candidate): candidate is ResolvedAreaTileProcessCandidate & { disposition: "process" } =>
      candidate.disposition === "process"
  );
  if (blockedEntries.length > 0) {
    options.onProgress?.(
      buildAreaTileProcessContractReadiness(
        areaId,
        blockedEntries,
        expectedCandidateCount,
        plan.excludedTileDefinitionIds
      )
    );
  }

  const processedEntries = await processTileContractCandidates(
    tileApiPort,
    accessToken,
    processCandidates,
    {
      ...options,
      onEntriesProgress: (progressEntries) =>
        options.onProgress?.(
          buildAreaTileProcessContractReadiness(
            areaId,
            [...blockedEntries, ...progressEntries],
            expectedCandidateCount,
            plan.excludedTileDefinitionIds
          )
        )
    }
  );

  return buildAreaTileProcessContractReadiness(
    areaId,
    [...blockedEntries, ...processedEntries],
    expectedCandidateCount,
    plan.excludedTileDefinitionIds
  );
}

function buildAreaTileProcessContractReadiness(
  areaId: string,
  entries: AreaTileProcessContractEntry[],
  expectedCandidateCount: number = entries.length,
  excludedTileDefinitionIds: number[] = []
): AreaTileProcessContractReadiness {
  const readyCandidateCount = entries.filter((entry) => entry.status === "ready").length;
  const blockedCandidateCount = entries.length - readyCandidateCount;
  const pendingCandidateCount = Math.max(expectedCandidateCount - entries.length, 0);
  const sourceAssetReadyCount = entries.filter(
    (entry) => entry.sourceAssetContractStatus === "ready"
  ).length;
  const mdlSourceReadyCount = entries.filter(
    (entry) => entry.mdlSourceAssetStatus === "mdl_source_object_key_proven"
  ).length;
  const glbGeometryReadyCount = entries.filter(
    (entry) => !entry.glbGeometryStatus.startsWith("blocked_")
  ).length;
  const materialTextureContractReadyCount = entries.filter(
    (entry) => entry.textureContractStatus === "ready"
  ).length;
  const materialBindingBlockedCount = entries.filter((entry) =>
    isAreaTileMaterialBindingBlocked(entry.materialReadinessStatus)
  ).length;
  const renderLoaderReadyCount = entries.filter(
    (entry) => !entry.renderLoaderHandoffStatus.startsWith("blocked_")
  ).length;
  const status =
    pendingCandidateCount === 0 &&
    entries.length === expectedCandidateCount &&
    readyCandidateCount === expectedCandidateCount
      ? "ready"
      : readyCandidateCount > 0
        ? "partial"
        : "blocked";
  const checkedBlockerSummary = formatEntrySample(
    entries.filter((entry) => entry.status === "blocked"),
    (entry) => `${entry.tileId}:${formatTileContractEntryBlocker(entry)}`,
    " | "
  );
  const blockerSummary =
    pendingCandidateCount > 0
      ? [
          `pending_tile_process_contracts:${pendingCandidateCount}/${expectedCandidateCount}`,
          ...(checkedBlockerSummary === "none" ? [] : [checkedBlockerSummary])
        ].join(" | ")
      : checkedBlockerSummary;

  return {
    status,
    areaId,
    expectedCandidateCount,
    pendingCandidateCount,
    checkedCandidateCount: entries.length,
    readyCandidateCount,
    blockedCandidateCount,
    candidateSample: formatEntrySample(entries, (entry) => entry.tileId, ", "),
    readySample:
      formatEntrySample(
        entries.filter((entry) => entry.status === "ready"),
        (entry) => `${entry.tileId}:${entry.cacheKey ?? "cache?"}`,
        ", "
      ),
    sourceObjectKeySample:
      formatEntrySample(
        entries,
        (entry) => `${entry.tileId}:${entry.sourceObjectKey ?? "missing"}`,
        ", "
      ),
    sourceAssetContractSample:
      formatEntrySample(
        entries,
        (entry) =>
          `${entry.tileId}:${entry.sourceAssetContractStatus}:${entry.sourceAssetRole ?? "missing"}:${entry.sourceObjectExtension ?? "missing"}`,
        ", "
      ),
    blockerSummary,
    sourceAssetReadyCount,
    sourceAssetBlockedCount: entries.length - sourceAssetReadyCount,
    mdlSourceReadyCount,
    mdlSourceBlockedCount: entries.length - mdlSourceReadyCount,
    glbGeometryReadyCount,
    glbGeometryBlockedCount: entries.length - glbGeometryReadyCount,
    materialTextureContractReadyCount,
    materialBindingBlockedCount,
    renderLoaderReadyCount,
    renderLoaderBlockedCount: entries.length - renderLoaderReadyCount,
    textureMaterialBlockerSummary: formatEntrySample(
      entries.filter((entry) =>
        entry.textureContractStatus !== "ready" ||
        isAreaTileMaterialBindingBlocked(entry.materialReadinessStatus)
      ),
      (entry) =>
        `${entry.tileId}:texture=${entry.textureDeliveryStatus ?? entry.textureContractStatus}:material=${entry.materialReadinessStatus}`,
      " | "
    ),
    renderAssetContractBlockerSummary:
      formatEntrySample(
        entries,
        (entry) => `${entry.tileId}:${entry.renderAssetContractBlockers}`,
        " | "
      ),
    mdlGlbMaterialBlockerSummary:
      formatEntrySample(
        entries,
        (entry) => `${entry.tileId}:${entry.mdlGlbMaterialBlockers}`,
        " | "
      ),
    excludedTileDefinitionIds,
    excludedTileDefinitionCount: excludedTileDefinitionIds.length,
    entries
  };
}

/** Resolves delivery contracts from the current edited scene, not a stale source ARE snapshot. */
export function resolveAreaTileProcessContractReadinessForModelResRefs(
  tileApiPort: TileApiPort,
  accessToken: string,
  areaId: string,
  modelResRefs: readonly (string | null | undefined)[],
  options: AreaTileProcessContractReadinessOptions = {}
): Promise<AreaTileProcessContractReadiness> {
  return resolveAreaTileProcessContractReadinessForCandidates(
    tileApiPort,
    accessToken,
    areaId,
    modelResRefs.map((modelResRef) => ({ modelResRef, disposition: "process" })),
    options
  );
}

function resolveTileProcessContractTimeoutMs(timeoutMs: number | undefined): number {
  if (typeof timeoutMs === "number" && Number.isFinite(timeoutMs)) {
    return Math.max(0, timeoutMs);
  }
  return DEFAULT_TILE_PROCESS_CONTRACT_TIMEOUT_MS;
}

async function withTileProcessContractTimeout(
  promise: Promise<AreaTileProcessContractEntry[]>,
  candidates: Array<{ modelResRef: string; tileId: string }>,
  timeoutMs: number | undefined
): Promise<AreaTileProcessContractEntry[]> {
  const resolvedTimeoutMs = resolveTileProcessContractTimeoutMs(timeoutMs);
  if (resolvedTimeoutMs === 0) {
    return promise;
  }
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<AreaTileProcessContractEntry[]>((resolve) => {
    timeoutId = setTimeout(() => {
      resolve(
        candidates.map((candidate) =>
          buildTileProcessContractEntryFromFailure(candidate, {
            code: "TILE_PROCESS_CONTRACT_TIMEOUT",
            message: `Tile process contract readiness timed out after ${resolvedTimeoutMs}ms.`
          })
        )
      );
    }, resolvedTimeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
}

async function processTileContractCandidates(
  tileApiPort: TileApiPort,
  accessToken: string,
  candidates: Array<{ modelResRef: string; tileId: string }>,
  options: AreaTileProcessContractWorkerOptions
): Promise<AreaTileProcessContractEntry[]> {
  if (tileApiPort.processTiles) {
    return processTileContractCandidatesBatch(tileApiPort, accessToken, candidates, options);
  }

  const entries: AreaTileProcessContractEntry[] = new Array(candidates.length);
  for (const [index, candidate] of candidates.entries()) {
    const [entry] = await withTileProcessContractTimeout(
      resolveTileProcessContractEntry(
        tileApiPort,
        accessToken,
        candidate,
        options
      ).then((resolvedEntry) => [resolvedEntry]),
      [candidate],
      options.timeoutMs
    );
    entries[index] =
      entry ??
      buildTileProcessContractEntryFromFailure(candidate, {
        code: "TILE_PROCESS_CONTRACT_RESULT_MISSING",
        message: "Tile process contract readiness returned no result."
      });
    options.onEntriesProgress?.(entries.slice(0, index + 1));
  }
  return entries;
}

async function processTileContractCandidatesBatch(
  tileApiPort: TileApiPort,
  accessToken: string,
  candidates: Array<{ modelResRef: string; tileId: string }>,
  options: AreaTileProcessContractWorkerOptions
): Promise<AreaTileProcessContractEntry[]> {
  const entries: AreaTileProcessContractEntry[] = [];
  for (let offset = 0; offset < candidates.length; offset += TILE_PROCESS_CONTRACT_BATCH_SIZE) {
    const batchCandidates = candidates.slice(offset, offset + TILE_PROCESS_CONTRACT_BATCH_SIZE);
    const batchEntries = await withTileProcessContractTimeout(
      tileApiPort.processTiles!(
        accessToken,
        batchCandidates.map((candidate) => ({
          tileId: candidate.tileId,
          bypassCache: options.bypassCache ?? false
        }))
      ).then((batch) => {
        const itemsByTileId = new Map(batch.items.map((item) => [item.tileId, item]));
        return batchCandidates.map((candidate) => {
          const item = itemsByTileId.get(candidate.tileId);
          if (item?.status === "ready") {
            return buildTileProcessContractEntryFromProcessed(candidate, item.result);
          }
          return buildTileProcessContractEntryFromFailure(candidate, {
            code: item?.status === "blocked" ? item.error.code : "TILE_BATCH_RESULT_MISSING",
            message:
              item?.status === "blocked"
                ? item.error.message
                : "Tile batch result was not returned."
          });
        });
      }),
      batchCandidates,
      options.timeoutMs
    );
    entries.push(...batchEntries);
    options.onEntriesProgress?.(entries);
  }
  return entries;
}

function formatEntrySample(
  entries: AreaTileProcessContractEntry[],
  format: (entry: AreaTileProcessContractEntry) => string,
  separator: string
): string {
  if (entries.length === 0) {
    return "none";
  }
  const sample = entries
    .slice(0, TILE_PROCESS_CONTRACT_SUMMARY_SAMPLE_LIMIT)
    .map(format)
    .join(separator);
  const remaining = entries.length - TILE_PROCESS_CONTRACT_SUMMARY_SAMPLE_LIMIT;
  return remaining > 0 ? `${sample}${separator}+${remaining} more` : sample;
}

async function resolveTileProcessContractEntry(
  tileApiPort: TileApiPort,
  accessToken: string,
  candidate: { modelResRef: string; tileId: string },
  options: AreaTileProcessContractReadinessOptions
): Promise<AreaTileProcessContractEntry> {
  try {
    const processed = await tileApiPort.processTile(accessToken, candidate.tileId, {
      bypassCache: options.bypassCache ?? false
    });
    return buildTileProcessContractEntryFromProcessed(candidate, processed);
  } catch (error) {
    return buildTileProcessContractEntryFromFailure(candidate, error);
  }
}

function buildTileProcessContractEntryFromProcessed(
  candidate: { modelResRef: string; tileId: string },
  processed: TileApiProcessResult
): AreaTileProcessContractEntry {
  const sourceEvidence = resolveProcessedTileSourceEvidence(processed);
  const renderAssetEvidence = resolveProcessedTileRenderAssetEvidence(processed);
  const textureContractStatus =
    renderAssetEvidence.materialTextureAssets.length > 0 ? "ready" : "not_checked";
  const materialReadinessStatus =
    textureContractStatus !== "ready" &&
    renderAssetEvidence.textureDeliveryStatus?.startsWith("blocked_tile_texture")
      ? resolveAreaTileTextureDeliveryFailureStatus(renderAssetEvidence.textureDeliveryStatus)
      : resolveAreaTileMaterialReadinessStatus(renderAssetEvidence.materialBindingStatus);
  return {
    ...candidate,
    status: resolveAreaTileProcessEntryStatus({
      textureContractStatus,
      glbGeometryStatus: renderAssetEvidence.glbGeometryStatus,
      renderLoaderHandoffStatus: renderAssetEvidence.renderLoaderHandoffStatus,
      materialReadinessStatus
    }),
    processStatus: "ready",
    textureContractStatus,
    mdlSourceAssetStatus: sourceEvidence.mdlSourceAssetStatus,
    glbGeometryStatus: renderAssetEvidence.glbGeometryStatus,
    materialReadinessStatus,
    cacheKey: processed.cache.key,
    rendererPreset: processed.tile.render.rendererPreset,
    processedTileResref: processed.tile.resref,
    sourceAssetContractStatus: sourceEvidence.sourceAssetContractStatus,
    sourceObjectKey: sourceEvidence.sourceObjectKey,
    sourceObjectExtension: sourceEvidence.sourceObjectExtension,
    sourceAssetOrigin: sourceEvidence.sourceAssetOrigin,
    sourceAssetRole: sourceEvidence.sourceAssetRole,
    mdlSourceContentSha256: renderAssetEvidence.mdlSourceContentSha256,
    textureAtlasObjectKey: processed.tile.textureAtlas.objectKey,
    textureAtlasContentType: processed.tile.textureAtlas.contentType,
    textureAtlasSizeBytes: processed.tile.textureAtlas.sizeBytes,
    textureDeliveryStatus: renderAssetEvidence.textureDeliveryStatus,
    materialBindingStatus: renderAssetEvidence.materialBindingStatus,
    renderLoaderHandoffStatus: renderAssetEvidence.renderLoaderHandoffStatus,
    modelDeliveryStatus: renderAssetEvidence.modelDeliveryStatus,
    modelDeliveryUrl: renderAssetEvidence.modelDeliveryUrl,
    modelAssetObjectKey: renderAssetEvidence.modelAssetObjectKey,
    modelAssetExtension: renderAssetEvidence.modelAssetExtension,
    modelAssetContentSha256: renderAssetEvidence.modelAssetContentSha256,
    materialTextureAssets: renderAssetEvidence.materialTextureAssets,
    expectedDerivedModelObjectKey: renderAssetEvidence.expectedDerivedModelObjectKey,
    renderAssetContractBlockers: renderAssetEvidence.renderAssetContractBlockers,
    mdlGlbMaterialBlockers: buildMdlGlbMaterialBlockers(
      sourceEvidence.mdlSourceAssetStatus,
      renderAssetEvidence.glbGeometryStatus,
      materialReadinessStatus,
      renderAssetEvidence.renderAssetContractBlockers
    )
  };
}

function buildTileProcessContractEntryFromFailure(
  candidate: { modelResRef: string; tileId: string },
  error: unknown
): AreaTileProcessContractEntry {
  const processFailureBlocker = formatTileProcessContractFailureBlocker(error);
  return {
    ...candidate,
    status: "blocked",
    processStatus: "blocked",
    textureContractStatus: "not_checked",
    mdlSourceAssetStatus: "blocked_tile_process_contract_failed",
    glbGeometryStatus: "blocked_tile_process_contract_missing_glb_geometry",
    materialReadinessStatus: "blocked_tile_process_contract_missing_material_fields",
    sourceAssetContractStatus: "blocked",
    renderLoaderHandoffStatus: "blocked_tile_model_geometry_loader_missing",
    renderAssetContractBlockers: processFailureBlocker,
    mdlGlbMaterialBlockers: buildMdlGlbMaterialBlockers(
      "blocked_tile_process_contract_failed",
      "blocked_tile_process_contract_missing_glb_geometry",
      "blocked_tile_process_contract_missing_material_fields",
      processFailureBlocker
    ),
    code: getStringField(error, "code"),
    message:
      error instanceof Error
        ? error.message
        : getStringField(error, "message") ?? "Tile process contract failed."
  };
}

interface ResolvedAreaTileProcessCandidate {
  modelResRef: string;
  tileId: string;
  tileDefinitionId: number | null;
  disposition: "process" | "blocked";
  reasonCode?: string;
}

function resolveAreaTileProcessCandidatePlan(
  inputs: readonly AreaTileProcessContractCandidateInput[]
): {
  candidates: ResolvedAreaTileProcessCandidate[];
  excludedTileDefinitionIds: number[];
} {
  const excludedTileDefinitionIds = Array.from(
    new Set(
      inputs
        .filter((candidate) => candidate.disposition === "excluded")
        .map((candidate) => normalizeTileDefinitionId(candidate.tileDefinitionId))
        .filter((tileId): tileId is number => tileId !== null)
    )
  ).sort((left, right) => left - right);
  const candidatesByIdentity = new Map<string, ResolvedAreaTileProcessCandidate>();

  for (const input of inputs) {
    if (input.disposition === "excluded") continue;
    const tileDefinitionId = normalizeTileDefinitionId(input.tileDefinitionId);
    const modelResRef = normalizeTileModelResRef(input.modelResRef);
    if (!modelResRef && input.disposition === "process") continue;
    const identity = modelResRef || `missing_model_resref:${tileDefinitionId ?? "unknown"}`;
    const candidate: ResolvedAreaTileProcessCandidate = {
      modelResRef: identity,
      tileId: buildTileCatalogCandidateId(identity),
      tileDefinitionId,
      disposition: input.disposition,
      ...(input.reasonCode?.trim() ? { reasonCode: input.reasonCode.trim() } : {})
    };
    const current = candidatesByIdentity.get(identity);
    if (!current || (current.disposition === "process" && candidate.disposition === "blocked")) {
      candidatesByIdentity.set(identity, candidate);
    }
  }

  return {
    candidates: Array.from(candidatesByIdentity.values()),
    excludedTileDefinitionIds
  };
}

function buildEmptyAreaTileProcessContractReadiness(
  areaId: string,
  excludedTileDefinitionIds: number[]
): AreaTileProcessContractReadiness {
  const hasExcludedDefinitions = excludedTileDefinitionIds.length > 0;
  const blocker = hasExcludedDefinitions ? "none" : "blocked_no_tile_model_resrefs";
  return {
    status: hasExcludedDefinitions ? "ready" : "blocked",
    areaId,
    expectedCandidateCount: 0,
    pendingCandidateCount: 0,
    checkedCandidateCount: 0,
    readyCandidateCount: 0,
    blockedCandidateCount: 0,
    candidateSample: "none",
    readySample: "none",
    sourceObjectKeySample: "none",
    sourceAssetContractSample: "none",
    blockerSummary: blocker,
    sourceAssetReadyCount: 0,
    sourceAssetBlockedCount: 0,
    mdlSourceReadyCount: 0,
    mdlSourceBlockedCount: 0,
    glbGeometryReadyCount: 0,
    glbGeometryBlockedCount: 0,
    materialTextureContractReadyCount: 0,
    materialBindingBlockedCount: 0,
    renderLoaderReadyCount: 0,
    renderLoaderBlockedCount: 0,
    textureMaterialBlockerSummary: blocker,
    renderAssetContractBlockerSummary: blocker,
    mdlGlbMaterialBlockerSummary: blocker,
    excludedTileDefinitionIds,
    excludedTileDefinitionCount: excludedTileDefinitionIds.length,
    entries: []
  };
}

function normalizeTileModelResRef(modelResRef: string | null | undefined): string {
  return modelResRef?.trim().toLowerCase() ?? "";
}

function normalizeTileDefinitionId(tileDefinitionId: number | undefined): number | null {
  return Number.isInteger(tileDefinitionId) && (tileDefinitionId ?? -1) >= 0
    ? tileDefinitionId ?? null
    : null;
}

function buildTileCatalogCandidateId(modelResRef: string): string {
  const normalized = modelResRef
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gu, "_")
    .slice(0, 64);
  return normalized ? `tile_${normalized}`.slice(0, 80) : "tile_missing_model_resref";
}

function resolveProcessedTileSourceEvidence(
  processed: TileApiProcessResult
): {
  sourceObjectKey?: string;
  sourceObjectExtension?: string;
  sourceAssetOrigin?: string;
  sourceAssetRole?: string;
  sourceAssetContractStatus: "ready" | "blocked";
  mdlSourceAssetStatus: AreaTileMdlSourceAssetStatus;
} {
  const sourceAsset = processed.tile.sourceAsset;
  const sourceObjectKey =
    sourceAsset?.objectKey.trim() || processed.tile.textureAtlas.objectKey?.trim();
  const sourceObjectExtension = sourceObjectKey
    ? sourceAsset?.extension ?? getObjectKeyExtension(sourceObjectKey)
    : undefined;
  if (!sourceObjectKey) {
    return {
      sourceAssetContractStatus: "blocked",
      mdlSourceAssetStatus: "blocked_mdl_source_asset_key_missing"
    };
  }

  const mdlSourceProven =
    processed.tile.renderAssetContract?.mdlSourceStatus === "ready" ||
    sourceAsset?.role === "mdl_source" ||
    sourceObjectExtension === "mdl";

  return {
    sourceObjectKey,
    sourceObjectExtension,
    sourceAssetOrigin: sourceAsset?.origin,
    sourceAssetRole: sourceAsset?.role,
    sourceAssetContractStatus:
      processed.tile.renderAssetContract?.sourceAssetStatus ?? "ready",
    mdlSourceAssetStatus: mdlSourceProven
      ? "mdl_source_object_key_proven"
      : "source_object_key_proven_non_mdl"
  };
}

function resolveProcessedTileRenderAssetEvidence(
  processed: TileApiProcessResult
): {
  textureDeliveryStatus?: string;
  materialBindingStatus?: string;
  glbGeometryStatus: AreaTileGlbGeometryStatus;
  renderLoaderHandoffStatus: "ready" | "blocked_tile_model_geometry_loader_missing";
  modelDeliveryStatus?: "ready" | "blocked_tile_model_glb_missing";
  modelDeliveryUrl?: string;
  modelAssetObjectKey?: string;
  modelAssetExtension?: "glb" | "gltf";
  mdlSourceContentSha256?: string;
  modelAssetContentSha256?: string;
  materialTextureAssets: Array<{
    reference: string;
    deliveryUrl: string;
    resref: string;
    extension: string;
    objectKey: string;
    source: "module" | "hak" | "vanilla";
    contentSha256?: string;
  }>;
  expectedDerivedModelObjectKey?: string;
  renderAssetContractBlockers: string;
} {
  const renderAssetContract = processed.tile.renderAssetContract;
  const renderAssetContractBlockers = renderAssetContract?.blockers ?? [];
  return {
    textureDeliveryStatus: renderAssetContract?.textureDeliveryStatus,
    materialBindingStatus: renderAssetContract?.materialBindingStatus,
    glbGeometryStatus:
      renderAssetContract?.glbGeometryStatus ??
      "blocked_tile_process_contract_missing_glb_geometry",
    renderLoaderHandoffStatus:
      renderAssetContract?.rendererHandoffStatus ??
      "blocked_tile_model_geometry_loader_missing",
    modelDeliveryStatus: renderAssetContract?.modelDeliveryStatus,
    modelDeliveryUrl: renderAssetContract?.modelAsset?.deliveryUrl,
    modelAssetObjectKey: renderAssetContract?.modelAsset?.objectKey,
    modelAssetExtension: renderAssetContract?.modelAsset?.extension,
    mdlSourceContentSha256: renderAssetContract?.mdlSourceContentSha256,
    modelAssetContentSha256: renderAssetContract?.modelAsset?.contentSha256,
    materialTextureAssets:
      renderAssetContract?.materialTextureAssets?.map((asset) => ({
        reference: asset.reference,
        deliveryUrl: asset.deliveryUrl,
        resref: asset.resref,
        extension: asset.extension,
        objectKey: asset.objectKey,
        source: asset.source,
        contentSha256: asset.contentSha256
      })) ?? [],
    expectedDerivedModelObjectKey: renderAssetContract?.expectedDerivedModelObjectKey,
    renderAssetContractBlockers:
      renderAssetContractBlockers.length > 0
        ? renderAssetContractBlockers.join(", ")
        : "none"
  };
}

function resolveAreaTileMaterialReadinessStatus(
  materialBindingStatus: string | undefined
): AreaTileMaterialReadinessStatus {
  if (materialBindingStatus === "ready") {
    return "ready";
  }
  if (materialBindingStatus === "blocked_tile_material_binding_derived_model_only") {
    return "blocked_tile_material_binding_derived_model_only";
  }
  if (materialBindingStatus === "blocked_tile_process_contract_missing_material_bindings") {
    return "blocked_tile_process_contract_missing_material_bindings";
  }
  return "texture_proxy_contract_ready_material_bindings_unverified";
}

function resolveAreaTileTextureDeliveryFailureStatus(
  textureDeliveryStatus: string | undefined
): AreaTileMaterialReadinessStatus {
  return textureDeliveryStatus === "blocked_tile_texture_contract_derived_model_only"
    ? "blocked_tile_texture_contract_derived_model_only"
    : "blocked_tile_texture_delivery_contract_missing";
}

function resolveAreaTileProcessEntryStatus(input: {
  textureContractStatus: AreaTileProcessContractEntry["textureContractStatus"];
  glbGeometryStatus: AreaTileGlbGeometryStatus;
  renderLoaderHandoffStatus: AreaTileProcessContractEntry["renderLoaderHandoffStatus"];
  materialReadinessStatus: AreaTileMaterialReadinessStatus;
}): AreaTileProcessContractEntry["status"] {
  if (
    input.glbGeometryStatus !== "ready" ||
    input.renderLoaderHandoffStatus.startsWith("blocked_") ||
    input.materialReadinessStatus === "blocked_tile_texture_delivery_contract_missing" ||
    input.materialReadinessStatus === "blocked_tile_texture_contract_derived_model_only" ||
    isAreaTileMaterialBindingBlocked(input.materialReadinessStatus)
  ) {
    return "blocked";
  }
  return "ready";
}

function isAreaTileMaterialBindingBlocked(status: AreaTileMaterialReadinessStatus): boolean {
  return status.startsWith("blocked_tile_material_binding_") ||
    status === "blocked_tile_process_contract_missing_material_bindings" ||
    status === "blocked_tile_process_contract_missing_material_fields";
}

function formatTileContractEntryBlocker(entry: AreaTileProcessContractEntry): string {
  if (entry.code || entry.message) {
    return `${entry.code ?? "blocked"}:${entry.message ?? "blocked"}`;
  }
  if (entry.mdlGlbMaterialBlockers && entry.mdlGlbMaterialBlockers !== "none") {
    return entry.mdlGlbMaterialBlockers;
  }
  if (entry.renderAssetContractBlockers && entry.renderAssetContractBlockers !== "none") {
    return entry.renderAssetContractBlockers;
  }
  return "blocked";
}

function formatTileProcessContractFailureBlocker(error: unknown): string {
  const code = getStringField(error, "code") ?? "unknown_error";
  const message =
    error instanceof Error ? error.message : "Tile process contract failed.";
  const normalizedMessage = message
    .trim()
    .replace(/\s+/gu, "_")
    .replace(/[^a-zA-Z0-9:_=./-]+/gu, "_")
    .slice(0, 180);
  return `tile_process_contract_failed:${code}:${normalizedMessage || "no_message"}`;
}

function buildMdlGlbMaterialBlockers(
  mdlSourceAssetStatus: AreaTileMdlSourceAssetStatus,
  glbGeometryStatus: AreaTileGlbGeometryStatus,
  materialReadinessStatus: AreaTileMaterialReadinessStatus,
  renderAssetContractBlockers: string
): string {
  const blockers: string[] = [];
  if (mdlSourceAssetStatus !== "mdl_source_object_key_proven") {
    blockers.push(mdlSourceAssetStatus);
  }
  if (glbGeometryStatus !== "ready") {
    blockers.push(glbGeometryStatus);
  }
  if (
    materialReadinessStatus === "texture_proxy_contract_ready_material_bindings_unverified"
  ) {
    blockers.push("per_tile_material_binding_contract_not_exposed");
  } else if (materialReadinessStatus === "ready") {
    // Material binding is fully represented by backend materialTextureAssets.
  } else {
    blockers.push(materialReadinessStatus);
  }
  if (renderAssetContractBlockers !== "none") {
    blockers.push(renderAssetContractBlockers);
  }
  const uniqueBlockers = Array.from(new Set(blockers));
  return uniqueBlockers.length > 0 ? uniqueBlockers.join(", ") : "none";
}

function getObjectKeyExtension(objectKey: string): string {
  const normalized = objectKey.replace(/\\/gu, "/").trim().toLowerCase();
  const fileName = normalized.split("/").pop() ?? normalized;
  const index = fileName.lastIndexOf(".");
  return index > -1 ? fileName.slice(index + 1) : "unknown";
}

function getStringField(value: unknown, field: string): string | null {
  if (typeof value !== "object" || value === null || !(field in value)) {
    return null;
  }
  const candidate = (value as Record<string, unknown>)[field];
  return typeof candidate === "string" ? candidate : null;
}
