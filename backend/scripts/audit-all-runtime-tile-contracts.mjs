#!/usr/bin/env node
/**
 * Resumable runtime contract sweep for every Area-editor tileset entry.
 *
 * Source-file inventories alone are insufficient: the editor resolves tile
 * sources through the active module/HAK chain and materializes GLB/texture
 * contracts on demand. This script audits that exact authenticated API path,
 * persists a checkpoint after every batch, and records every SET entry even
 * where several entries reuse one runtime model resref.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSweepHeartbeat,
  writeSweepHeartbeat
} from "./runtime-tile-sweep-heartbeat.mjs";
import {
  classifyRuntimeProcessFailure,
  isRetryableRuntimeProcessErrorCode,
  windowHasRetryPending
} from "./runtime-tile-sweep-classification.mjs";
import { writeJsonAtomic } from "./runtime-tile-sweep-io.mjs";
import {
  assertRuntimeTileSweepResumeBinding,
  loadRuntimeTileSweepDefinitionCatalog,
  resolveRuntimeTilesetSweepEntries
} from "./lib/runtime-tile-sweep-source-catalog.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..", "..");
const DEFAULT_BASE_URL = "http://127.0.0.1:5173/_aurora/v1";
const DEFAULT_BATCH_SIZE = 200;

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function requiredOption(name) {
  const value = option(name, "").trim();
  if (!value) throw new Error(`${name} <value> is required.`);
  return value;
}

function positiveInteger(value, name, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 1) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

function nonNegativeInteger(value, name, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 0) throw new Error(`${name} must be a non-negative integer.`);
  return parsed;
}

const baseUrl = option("--base-url", DEFAULT_BASE_URL).replace(/\/+$/u, "");
const username = option("--username", "builder.user");
const password = option("--password", "builder123");
const batchSize = Math.min(200, positiveInteger(option("--batch-size", "200"), "--batch-size", 200));
const requestConcurrency = Math.min(
  12,
  positiveInteger(option("--request-concurrency", "1"), "--request-concurrency", 1)
);
const maxBatches = nonNegativeInteger(option("--max-batches", "0"), "--max-batches", 0);
const retryBlocked = process.argv.includes("--retry-blocked");
const retryBlockedOnly = process.argv.includes("--retry-blocked-only");
const requiredModelPathSegment = option("--required-model-path-segment", "").trim();
const requestTimeoutMs = positiveInteger(
  option("--request-timeout-ms", "240000"),
  "--request-timeout-ms",
  240000
);
const outDirectory = path.resolve(repoRoot, option(
  "--out-directory",
  ".codex-tmp/runtime-tile-contract-sweep"
));
const definitionCatalogPath = path.resolve(repoRoot, requiredOption("--definition-catalog"));
const definitionCatalogSha256 = requiredOption("--definition-catalog-sha256").toLowerCase();
const checkpointPath = path.join(outDirectory, "checkpoint.json");
const entriesPath = path.join(outDirectory, "entries.json");
const summaryPath = path.join(outDirectory, "summary.json");
const heartbeatPath = path.join(outDirectory, "runtime-heartbeat.json");
const sweepRunId = `runtime-tile-sweep-${Date.now()}-${process.pid}`;

function writeJson(filePath, value) {
  writeJsonAtomic(filePath, value);
}

async function request(url, init = {}) {
  let response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(requestTimeoutMs) });
  } catch (error) {
    if (error?.name === "TimeoutError") {
      const method = init.method ?? "GET";
      throw new Error(`${method} ${url} timed out after ${requestTimeoutMs}ms.`);
    }
    throw error;
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${url} failed with ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

let activeAccessToken = null;
let authRefreshPromise = null;

async function refreshAccessToken(staleToken = null) {
  if (staleToken && activeAccessToken && staleToken !== activeAccessToken) {
    return activeAccessToken;
  }
  if (!authRefreshPromise) {
    authRefreshPromise = request(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password })
    })
      .then((login) => {
        const accessToken = login.data?.session?.accessToken;
        if (!accessToken) {
          throw new Error("Authenticated runtime sweep could not obtain an access token.");
        }
        activeAccessToken = accessToken;
        return accessToken;
      })
      .finally(() => {
        authRefreshPromise = null;
      });
  }
  return authRefreshPromise;
}

async function authenticatedRequest(url, init = {}) {
  let token = activeAccessToken ?? await refreshAccessToken();
  const execute = () =>
    request(url, {
      ...init,
      headers: {
        ...init.headers,
        authorization: `Bearer ${token}`
      }
    });
  try {
    return await execute();
  } catch (error) {
    if (!String(error?.message ?? error).includes(" failed with 401:")) {
      throw error;
    }
    token = await refreshAccessToken(token);
    return execute();
  }
}

async function processRuntimeTileIds(runtimeTileIds) {
  try {
    const payload = await authenticatedRequest(`${baseUrl}/catalog/tiles/process/batch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: runtimeTileIds.map((tileId) => ({ tileId, bypassCache: false })) })
    });
    return new Map(
      (Array.isArray(payload.data?.items) ? payload.data.items : []).map((item) => [item.tileId, item])
    );
  } catch (batchError) {
    // A one-item request has already exercised the exact runtime contract
    // path. Retrying the same request with the same long timeout prevents the
    // checkpoint from advancing and can stall the all-tileset sweep for many
    // minutes on one pathological source asset.
    if (runtimeTileIds.length === 1) {
      const failure = classifyRuntimeProcessFailure(batchError);
      return new Map([[runtimeTileIds[0], {
        tileId: runtimeTileIds[0],
        status: "blocked",
        error: {
          code: failure.code,
          message: failure.message
        }
      }]]);
    }
    process.stderr.write(
      `Batch request failed for ${runtimeTileIds.length} tile(s); retrying individually: ${batchError.message}\n`
    );
    const results = new Map();
    for (const tileId of runtimeTileIds) {
      try {
        const payload = await authenticatedRequest(`${baseUrl}/catalog/tiles/process/batch`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ items: [{ tileId, bypassCache: false }] })
        });
        const item = Array.isArray(payload.data?.items) ? payload.data.items[0] : null;
        results.set(tileId, item ?? { tileId, status: "blocked", error: {
          code: "TILE_BATCH_RESULT_MISSING",
          message: "Single-tile fallback returned no result."
        } });
      } catch (error) {
        const failure = classifyRuntimeProcessFailure(error);
        results.set(tileId, { tileId, status: "blocked", error: {
          code: failure.code,
          message: failure.message
        } });
      }
    }
    return results;
  }
}

function isReadyContractStatus(status) {
  const normalized = String(status ?? "");
  return (
    normalized.includes("ready") ||
    // Textureless geometry can legitimately expose only the source texture
    // blob metadata. The backend pairs this state with a ready material
    // binding when no per-material texture assets are required.
    normalized === "texture_source_blob_metadata_present"
  );
}

function summarizeContract(result) {
  const contract = result?.tile?.renderAssetContract;
  if (!contract) {
    return { status: "invalid_missing_render_contract", blockerCodes: ["MISSING_RENDER_CONTRACT"] };
  }
  const statuses = [
    contract.sourceAssetStatus,
    contract.mdlSourceStatus,
    contract.glbGeometryStatus,
    contract.textureDeliveryStatus,
    contract.materialBindingStatus,
    contract.rendererHandoffStatus,
    contract.modelDeliveryStatus
  ];
  const blockerCodes = Array.isArray(contract.blockers)
    ? contract.blockers.map((blocker) =>
      typeof blocker === "string" ? blocker : blocker?.code ?? "UNKNOWN_BLOCKER"
    )
    : [];
  const modelAssetObjectKey =
    typeof contract.modelAsset?.objectKey === "string" ? contract.modelAsset.objectKey : null;
  const converterPathCurrent =
    !requiredModelPathSegment ||
    Boolean(modelAssetObjectKey?.includes(requiredModelPathSegment));
  if (!converterPathCurrent) {
    blockerCodes.push("STALE_CONVERTER_MODEL_PATH");
  }
  return {
    status:
      statuses.every(isReadyContractStatus) &&
      blockerCodes.length === 0
      ? "ready"
      : "not_ready",
    sourceAssetStatus: contract.sourceAssetStatus ?? null,
    mdlSourceStatus: contract.mdlSourceStatus ?? null,
    glbGeometryStatus: contract.glbGeometryStatus ?? null,
    textureDeliveryStatus: contract.textureDeliveryStatus ?? null,
    materialBindingStatus: contract.materialBindingStatus ?? null,
    rendererHandoffStatus: contract.rendererHandoffStatus ?? null,
    modelDeliveryStatus: contract.modelDeliveryStatus ?? null,
    modelAssetObjectKey,
    converterPathCurrent,
    blockerCodes
  };
}

function buildSummary(entries, checkpoint) {
  const processed = entries.filter((entry) => entry.audit);
  const ready = processed.filter((entry) => entry.audit?.status === "ready");
  const retryPending = processed.filter((entry) => entry.audit?.status === "retry_pending");
  const blocked = processed.filter(
    (entry) => entry.audit?.status !== "ready" && entry.audit?.status !== "retry_pending"
  );
  const byTileset = new Map();
  for (const entry of entries) {
    const row = byTileset.get(entry.tilesetResRef) ?? {
      tilesetResRef: entry.tilesetResRef,
      totalEntries: 0,
      processedEntries: 0,
      readyEntries: 0,
      blockedEntries: 0,
      placeholderEntries: 0,
      sourceBlockedEntries: 0
    };
    row.totalEntries += 1;
    if (entry.placeholder) row.placeholderEntries += 1;
    if (entry.sourceDisposition === "blocked") row.sourceBlockedEntries += 1;
    if (entry.audit) row.processedEntries += 1;
    if (entry.audit?.status === "ready") row.readyEntries += 1;
    if (entry.audit && entry.audit.status !== "ready" && entry.audit.status !== "retry_pending") {
      row.blockedEntries += 1;
    }
    byTileset.set(entry.tilesetResRef, row);
  }
  return {
    version: "aurora-all-runtime-tile-contract-sweep/v3-source-catalog-bound",
    generatedAt: new Date().toISOString(),
    complete: checkpoint.cursor >= checkpoint.uniqueRuntimeTileIds.length,
    batchSize,
    requestConcurrency,
    requiredModelPathSegment: requiredModelPathSegment || null,
    definitionCatalog: checkpoint.definitionCatalog,
    checkpoint,
    totals: {
      tilesetEntries: entries.length,
      uniqueRuntimeTileIds: checkpoint.uniqueRuntimeTileIds.length,
      processedEntries: processed.length,
      readyEntries: ready.length,
      blockedEntries: blocked.length,
      retryPendingEntries: retryPending.length,
      intentionalPlaceholderEntries: entries.filter((entry) => entry.placeholder).length,
      sourceBlockedEntries: entries.filter((entry) => entry.sourceDisposition === "blocked").length
    },
    tilesets: [...byTileset.values()].sort((left, right) => left.tilesetResRef.localeCompare(right.tilesetResRef)),
    blockedSample: blocked.slice(0, 100).map((entry) => ({
      tilesetResRef: entry.tilesetResRef,
      tileId: entry.tileId,
      modelResRef: entry.modelResRef,
      modelSourceStatus: entry.modelSourceStatus,
      sourceDisposition: entry.sourceDisposition,
      runtimeTileId: entry.runtimeTileId,
      audit: entry.audit
    })),
    retryPendingSample: retryPending.slice(0, 100).map((entry) => ({
      tilesetResRef: entry.tilesetResRef,
      tileId: entry.tileId,
      modelResRef: entry.modelResRef,
      runtimeTileId: entry.runtimeTileId,
      audit: entry.audit
    }))
  };
}

const definitionCatalog = loadRuntimeTileSweepDefinitionCatalog({
  catalogPath: definitionCatalogPath,
  expectedSha256: definitionCatalogSha256
});
fs.mkdirSync(outDirectory, { recursive: true });
await refreshAccessToken();

let entries;
let checkpoint;
if (fs.existsSync(entriesPath) && fs.existsSync(checkpointPath)) {
  entries = JSON.parse(fs.readFileSync(entriesPath, "utf8"));
  checkpoint = JSON.parse(fs.readFileSync(checkpointPath, "utf8"));
  assertRuntimeTileSweepResumeBinding(definitionCatalog, checkpoint, entries);
  const expectedRuntimeTileIds = [...new Set(
    entries.map((entry) => entry.runtimeTileId).filter(Boolean)
  )].sort();
  if (JSON.stringify(checkpoint.uniqueRuntimeTileIds) !== JSON.stringify(expectedRuntimeTileIds)) {
    throw new Error("Runtime tile sweep checkpoint runtime membership mismatches the bound catalog entries.");
  }
} else {
  const tilesetsPayload = await authenticatedRequest(`${baseUrl}/areas/editing/tilesets`);
  const tilesets = Array.isArray(tilesetsPayload.data) ? tilesetsPayload.data : [];
  const liveTilesetResRefs = tilesets.map((tileset) =>
    String(tileset.tilesetResRef ?? "").trim().toLowerCase()
  ).sort();
  if (
    liveTilesetResRefs.length !== new Set(liveTilesetResRefs).size ||
    JSON.stringify(liveTilesetResRefs) !== JSON.stringify(definitionCatalog.tilesetResRefs)
  ) {
    throw new Error("Live tileset membership does not exactly match the bound definition catalog.");
  }
  entries = [];
  for (const tileset of tilesets) {
    const tilesetResRef = String(tileset.tilesetResRef ?? "").trim().toLowerCase();
    if (!tilesetResRef) continue;
    const definitionPayload = await authenticatedRequest(
      `${baseUrl}/areas/editing/tilesets/${encodeURIComponent(tilesetResRef)}`,
      {}
    );
    entries.push(...resolveRuntimeTilesetSweepEntries({
      catalog: definitionCatalog,
      tilesetDefinition: definitionPayload.data
    }));
  }
  const uniqueRuntimeTileIds = [...new Set(entries.map((entry) => entry.runtimeTileId).filter(Boolean))].sort();
  checkpoint = {
    createdAt: new Date().toISOString(),
    cursor: 0,
    batchesCompleted: 0,
    definitionCatalog: definitionCatalog.binding,
    uniqueRuntimeTileIds
  };
  writeJson(entriesPath, entries);
  writeJson(checkpointPath, checkpoint);
}

const entriesByRuntimeTileId = new Map();
for (const entry of entries) {
  if (!entry.runtimeTileId) continue;
  const rows = entriesByRuntimeTileId.get(entry.runtimeTileId) ?? [];
  rows.push(entry);
  entriesByRuntimeTileId.set(entry.runtimeTileId, rows);
}

function applyBatchAuditResults(runtimeTileIds, resultByTileId) {
  for (const runtimeTileId of runtimeTileIds) {
    const response = resultByTileId.get(runtimeTileId);
    const audit = response?.status === "ready"
      ? summarizeContract(response.result)
      : {
          status: isRetryableRuntimeProcessErrorCode(response?.error?.code)
            ? "retry_pending"
            : "blocked",
          blockerCodes: [response?.error?.code ?? "TILE_BATCH_RESULT_MISSING"],
          errorMessage: response?.error?.message ?? null
        };
    for (const entry of entriesByRuntimeTileId.get(runtimeTileId) ?? []) entry.audit = audit;
  }
}

if (retryBlocked) {
  const runtimeTileIds = [...new Set(
    entries
      .filter((entry) => entry.runtimeTileId && entry.audit && entry.audit.status !== "ready")
      .map((entry) => entry.runtimeTileId)
  )];
  for (let start = 0; start < runtimeTileIds.length; start += batchSize) {
    const batch = runtimeTileIds.slice(start, start + batchSize);
    applyBatchAuditResults(batch, await processRuntimeTileIds(batch));
    writeJson(entriesPath, entries);
    writeJson(checkpointPath, checkpoint);
    writeJson(summaryPath, buildSummary(entries, checkpoint));
    process.stdout.write(`retry ${Math.min(start + batch.length, runtimeTileIds.length)}/${runtimeTileIds.length}\n`);
  }
}

let batchesThisRun = 0;
while (!retryBlockedOnly && checkpoint.cursor < checkpoint.uniqueRuntimeTileIds.length) {
  if (maxBatches > 0 && batchesThisRun >= maxBatches) break;
  const remainingBatchBudget =
    maxBatches > 0
      ? Math.min(requestConcurrency, maxBatches - batchesThisRun)
      : requestConcurrency;
  const windowStart = checkpoint.cursor;
  const batches = Array.from({ length: remainingBatchBudget }, (_, index) =>
    checkpoint.uniqueRuntimeTileIds.slice(
      windowStart + index * batchSize,
      windowStart + (index + 1) * batchSize
    )
  ).filter((batch) => batch.length > 0);
  const windowStartedAt = new Date().toISOString();
  let heartbeatPhase = "in_flight";
  let heartbeatError = null;
  const persistHeartbeat = () => writeSweepHeartbeat(
    heartbeatPath,
    buildSweepHeartbeat({
      runId: sweepRunId,
      processId: process.pid,
      phase: heartbeatPhase,
      checkpointCursor: checkpoint.cursor,
      totalRuntimeTileIds: checkpoint.uniqueRuntimeTileIds.length,
      windowStartCursor: windowStart,
      batches,
      startedAt: windowStartedAt,
      error: heartbeatError
    })
  );
  persistHeartbeat();
  const heartbeatTimer = setInterval(persistHeartbeat, 15000);
  let resultMaps;
  try {
    resultMaps = await Promise.all(
      batches.map((runtimeTileIds) => processRuntimeTileIds(runtimeTileIds))
    );
    heartbeatPhase = "responses_received";
    persistHeartbeat();
  } catch (error) {
    heartbeatPhase = "failed";
    heartbeatError = {
      message: error instanceof Error ? error.message : String(error)
    };
    persistHeartbeat();
    throw error;
  } finally {
    clearInterval(heartbeatTimer);
  }
  if (windowHasRetryPending(batches, resultMaps)) {
    for (const [index, runtimeTileIds] of batches.entries()) {
      applyBatchAuditResults(runtimeTileIds, resultMaps[index]);
    }
    writeJson(entriesPath, entries);
    writeJson(checkpointPath, checkpoint);
    writeJson(summaryPath, buildSummary(entries, checkpoint));
    heartbeatPhase = "retry_pending";
    persistHeartbeat();
    process.stderr.write(
      `Window ${windowStart}-${windowStart + batches.flat().length} contains transport failures; ` +
      `checkpoint remains at ${checkpoint.cursor}.\n`
    );
    break;
  }
  for (const [index, runtimeTileIds] of batches.entries()) {
    applyBatchAuditResults(runtimeTileIds, resultMaps[index]);
    checkpoint.cursor += runtimeTileIds.length;
    checkpoint.batchesCompleted += 1;
    checkpoint.updatedAt = new Date().toISOString();
    writeJson(entriesPath, entries);
    writeJson(checkpointPath, checkpoint);
    writeJson(summaryPath, buildSummary(entries, checkpoint));
    batchesThisRun += 1;
    process.stdout.write(
      `batch ${checkpoint.batchesCompleted}: ${checkpoint.cursor}/${checkpoint.uniqueRuntimeTileIds.length}\n`
    );
  }
  heartbeatPhase = "checkpointed";
  persistHeartbeat();
}

writeJson(summaryPath, buildSummary(entries, checkpoint));
console.log(JSON.stringify(buildSummary(entries, checkpoint), null, 2));
