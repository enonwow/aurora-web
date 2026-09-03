import { useCallback, useEffect, useState } from "react";
import type {
  ClientAssetCacheDiagnosticSink,
  ClientAssetCachePort,
  ClientAssetCacheSnapshot,
} from "../../shared/application/clientAssetCachePort";

interface ClientAssetCacheControlProps {
  port: ClientAssetCachePort;
  onDiagnostic?: ClientAssetCacheDiagnosticSink;
}

export function ClientAssetCacheControl({ port, onDiagnostic }: ClientAssetCacheControlProps) {
  const [snapshot, setSnapshot] = useState<ClientAssetCacheSnapshot | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "clearing" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setState("loading");
    try {
      const inspected = await port.inspect();
      setSnapshot(inspected);
      setState("ready");
      onDiagnostic?.({
        operation: "inspect",
        outcome: inspected.status,
        budgetBytes: inspected.budgetBytes,
        usedBytes: inspected.usedBytes,
        entryCount: inspected.entryCount,
      });
    } catch {
      setState("error");
      setMessage("Could not inspect the immutable asset cache.");
      onDiagnostic?.({
        operation: "inspect",
        outcome: "failed",
        errorCode: "CLIENT_ASSET_CACHE_INSPECT_FAILED",
      });
    }
  }, [onDiagnostic, port]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const clear = async () => {
    setState("clearing");
    setMessage(null);
    try {
      const result = await port.clear();
      const inspected = await port.inspect();
      setSnapshot(inspected);
      setState("ready");
      onDiagnostic?.({
        operation: "clear",
        outcome: "ready",
        budgetBytes: inspected.budgetBytes,
        usedBytes: inspected.usedBytes,
        entryCount: inspected.entryCount,
        clearedBytes: result.clearedBytes,
        clearedEntries: result.clearedEntries,
      });
      setMessage(
        `Cleared ${result.clearedEntries} entries (${formatBytes(result.clearedBytes)}). Draft recovery and sign-in were preserved.`
      );
    } catch {
      setState("error");
      setMessage("Could not clear the immutable asset cache.");
      onDiagnostic?.({
        operation: "clear",
        outcome: "failed",
        errorCode: "CLIENT_ASSET_CACHE_CLEAR_FAILED",
      });
    }
  };

  return (
    <section className="client-asset-cache-control" aria-label="Client asset cache">
      <h3>Immutable asset cache</h3>
      <p>
        {snapshot
          ? `${formatBytes(snapshot.usedBytes)} / ${formatBytes(snapshot.budgetBytes)}`
          : "Measuring cache..."}
      </p>
      <p>{snapshot ? `${snapshot.entryCount} entries; 2 GiB hard cap with LRU eviction.` : null}</p>
      <button
        type="button"
        aria-label="Clear immutable asset cache"
        disabled={state === "loading" || state === "clearing" || snapshot?.status === "unsupported"}
        onClick={() => void clear()}
      >
        {state === "clearing" ? "Clearing..." : "Clear asset cache"}
      </button>
      {message ? <p role={state === "error" ? "alert" : "status"}>{message}</p> : null}
    </section>
  );
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KiB", "MiB", "GiB", "TiB"] as const;
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  return `${Number.isInteger(value) ? value : value.toFixed(1)} ${units[unitIndex]}`;
}
