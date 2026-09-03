import { writeJsonAtomic } from "./runtime-tile-sweep-io.mjs";

export function buildSweepHeartbeat({
  runId,
  processId,
  phase,
  checkpointCursor,
  totalRuntimeTileIds,
  windowStartCursor,
  batches,
  startedAt,
  updatedAt = new Date().toISOString(),
  error = null
}) {
  const runtimeTileIds = batches.flat();
  const startedAtMs = Date.parse(startedAt);
  const updatedAtMs = Date.parse(updatedAt);
  return {
    version: "aurora-runtime-tile-contract-sweep-heartbeat/v1",
    runId,
    processId,
    phase,
    checkpoint: {
      cursor: checkpointCursor,
      totalRuntimeTileIds
    },
    window: {
      startCursor: windowStartCursor,
      endCursorExclusive: windowStartCursor + runtimeTileIds.length,
      batchCount: batches.length,
      requestedTileCount: runtimeTileIds.length,
      runtimeTileIds
    },
    timing: {
      startedAt,
      updatedAt,
      elapsedMs:
        Number.isFinite(startedAtMs) && Number.isFinite(updatedAtMs)
          ? Math.max(0, updatedAtMs - startedAtMs)
          : null
    },
    error
  };
}

export function writeSweepHeartbeat(filePath, heartbeat) {
  writeJsonAtomic(filePath, heartbeat);
}
