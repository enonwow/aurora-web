const RETRYABLE_RUNTIME_PROCESS_ERROR_CODES = new Set([
  "RUNTIME_PROCESS_REQUEST_FAILED",
  "RUNTIME_PROCESS_REQUEST_TIMEOUT"
]);

export function classifyRuntimeProcessFailure(error) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    status: "retry_pending",
    code: message.includes("timed out")
      ? "RUNTIME_PROCESS_REQUEST_TIMEOUT"
      : "RUNTIME_PROCESS_REQUEST_FAILED",
    message
  };
}

export function isRetryableRuntimeProcessErrorCode(code) {
  return RETRYABLE_RUNTIME_PROCESS_ERROR_CODES.has(String(code ?? ""));
}

export function windowHasRetryPending(batches, resultMaps) {
  return batches.some((runtimeTileIds, batchIndex) =>
    runtimeTileIds.some((runtimeTileId) => {
      const response = resultMaps[batchIndex]?.get(runtimeTileId);
      return (
        response?.status !== "ready" &&
        isRetryableRuntimeProcessErrorCode(response?.error?.code)
      );
    })
  );
}
