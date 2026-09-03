import type {
  ClientAssetCacheDiagnosticSink,
  ClientAssetCachePort,
  ClientAssetCacheSnapshot,
} from "./clientAssetCachePort";

export async function enforceClientAssetCacheBudgetAtStartup(
  port: ClientAssetCachePort,
  onDiagnostic?: ClientAssetCacheDiagnosticSink,
): Promise<ClientAssetCacheSnapshot | null> {
  try {
    const snapshot = await port.enforceBudget();
    emitDiagnostic(onDiagnostic, {
      operation: "enforce",
      outcome: snapshot.status,
      budgetBytes: snapshot.budgetBytes,
      usedBytes: snapshot.usedBytes,
      entryCount: snapshot.entryCount,
    });
    return snapshot;
  } catch {
    emitDiagnostic(onDiagnostic, {
      operation: "enforce",
      outcome: "failed",
      errorCode: "CLIENT_ASSET_CACHE_STARTUP_ENFORCEMENT_FAILED",
    });
    return null;
  }
}

function emitDiagnostic(
  sink: ClientAssetCacheDiagnosticSink | undefined,
  event: Parameters<ClientAssetCacheDiagnosticSink>[0],
): void {
  try {
    sink?.(event);
  } catch {
    // Diagnostics must never break application startup.
  }
}
