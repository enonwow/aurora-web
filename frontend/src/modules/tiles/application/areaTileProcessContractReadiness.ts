import type { AreaApiDetail, AreaApiTileInstance } from "../../areas/contracts";
import type { TileApiProcessResult } from "../contracts";
import type { TileApiPort } from "../ports/tileApiPort";

const TILE_PROCESS_CONTRACT_SUMMARY_SAMPLE_LIMIT = 6;
const TILE_PROCESS_CONTRACT_QUEUE_CONCURRENCY = 12;

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
  materialTextureAssets?: Array<{
    reference: string;
    deliveryUrl: string;
    resref: string;
    extension: string;
    objectKey: string;
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
  entries: AreaTileProcessContractEntry[];
}

export interface AreaTileProcessContractReadinessOptions {
  bypassCache?: boolean;
}

export async function resolveAreaTileProcessContractReadiness(
  tileApiPort: TileApiPort,
  accessToken: string,
  detail: AreaApiDetail,
  options: AreaTileProcessContractReadinessOptions = {}
): Promise<AreaTileProcessContractReadiness> {
  const candidates = resolveTileProcessCandidates(detail.tiles ?? []);
  if (candidates.length === 0) {
    return {
      status: "blocked",
      areaId: detail.areaId,
      checkedCandidateCount: 0,
      readyCandidateCount: 0,
      blockedCandidateCount: 0,
      candidateSample: "none",
      readySample: "none",
      sourceObjectKeySample: "none",
      sourceAssetContractSample: "none",
      blockerSummary: "blocked_no_tile_model_resrefs",
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
      textureMaterialBlockerSummary: "blocked_no_tile_model_resrefs",
      renderAssetContractBlockerSummary: "blocked_no_tile_model_resrefs",
      mdlGlbMaterialBlockerSummary: "blocked_no_tile_model_resrefs",
      entries: []
    };
  }

  const entries = await processTileContractCandidates(
    tileApiPort,
    accessToken,
    candidates,
    options
  );

  const readyCandidateCount = entries.filter((entry) => entry.status === "ready").length;
  const blockedCandidateCount = entries.length - readyCandidateCount;
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
    readyCandidateCount === entries.length
      ? "ready"
      : readyCandidateCount > 0
        ? "partial"
        : "blocked";

  return {
    status,
    areaId: detail.areaId,
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
    blockerSummary:
      formatEntrySample(
        entries.filter((entry) => entry.status === "blocked"),
        (entry) => `${entry.tileId}:${formatTileContractEntryBlocker(entry)}`,
        " | "
      ),
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
    entries
  };
}

async function processTileContractCandidates(
  tileApiPort: TileApiPort,
  accessToken: string,
  candidates: Array<{ modelResRef: string; tileId: string }>,
  options: AreaTileProcessContractReadinessOptions
): Promise<AreaTileProcessContractEntry[]> {
  const entries: AreaTileProcessContractEntry[] = new Array(candidates.length);
  let cursor = 0;
  const runWorker = async (): Promise<void> => {
    while (cursor < candidates.length) {
      const index = cursor;
      cursor += 1;
      const candidate = candidates[index];
      if (!candidate) {
        continue;
      }
      entries[index] = await resolveTileProcessContractEntry(
        tileApiPort,
        accessToken,
        candidate,
        options
      );
    }
  };

  const workerCount = Math.min(TILE_PROCESS_CONTRACT_QUEUE_CONCURRENCY, candidates.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
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
  } catch (error) {
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
      message: error instanceof Error ? error.message : "Tile process contract failed."
    };
  }
}

function resolveTileProcessCandidates(
  tiles: AreaApiTileInstance[]
): Array<{ modelResRef: string; tileId: string }> {
  const seen = new Set<string>();
  const candidates: Array<{ modelResRef: string; tileId: string }> = [];
  for (const tile of tiles) {
    const modelResRef = tile.modelResRef?.trim().toLowerCase() ?? "";
    if (!modelResRef || seen.has(modelResRef)) {
      continue;
    }
    seen.add(modelResRef);
    candidates.push({
      modelResRef,
      tileId: buildTileCatalogCandidateId(modelResRef)
    });
  }
  return candidates;
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
  materialTextureAssets: Array<{
    reference: string;
    deliveryUrl: string;
    resref: string;
    extension: string;
    objectKey: string;
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
    materialTextureAssets:
      renderAssetContract?.materialTextureAssets?.map((asset) => ({
        reference: asset.reference,
        deliveryUrl: asset.deliveryUrl,
        resref: asset.resref,
        extension: asset.extension,
        objectKey: asset.objectKey
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
    input.textureContractStatus !== "ready" ||
    input.glbGeometryStatus !== "ready" ||
    input.renderLoaderHandoffStatus.startsWith("blocked_") ||
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
