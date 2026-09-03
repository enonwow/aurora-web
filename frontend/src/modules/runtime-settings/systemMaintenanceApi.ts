import { resolveWorkspaceBackendApiBaseUrl } from "../shared/workspaceBackendApiBaseUrl";

export type SystemMaintenanceState =
  | "idle"
  | "preflight"
  | "rebuilding"
  | "publishing"
  | "failed";

export interface SystemMaintenanceStatus {
  state: SystemMaintenanceState;
  maintenance: boolean;
  loginAvailable: boolean;
  phase: string;
  operationId?: string;
  updatedAt: string;
  retryAfterSeconds?: number;
  message: string;
}

export interface RuntimeCacheRebuildDetails {
  operationId?: string;
  state: SystemMaintenanceState;
  phase: string;
  triggeredBy?: string;
  startedAt?: string;
  updatedAt: string;
  activeRuntimeFingerprint?: string;
  candidateRuntimeFingerprint?: string;
  activeGeneration?: string;
  stagingGeneration?: string;
  participants: Array<{
    name: string;
    status: "pending" | "running" | "completed" | "skipped" | "failed";
    details?: Record<string, string | number | boolean | null>;
  }>;
  auditTrail: Array<{
    at: string;
    state: SystemMaintenanceState;
    phase: string;
    errorCode?: string;
  }>;
  error?: {
    code: string;
    message: string;
  };
}

export async function getSystemMaintenanceStatus(
  baseUrl = resolveWorkspaceBackendApiBaseUrl()
): Promise<SystemMaintenanceStatus> {
  const response = await fetch(`${baseUrl}/system/maintenance`);
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload || typeof payload !== "object" || !("data" in payload)) {
    throw new Error("Server maintenance status could not be read.");
  }
  const data = (payload as { data: SystemMaintenanceStatus }).data;
  if (
    typeof data.state !== "string" ||
    typeof data.maintenance !== "boolean" ||
    typeof data.loginAvailable !== "boolean" ||
    typeof data.phase !== "string"
  ) {
    throw new Error("Server maintenance status response is invalid.");
  }
  return data;
}

export async function retryRuntimeCacheRebuild(
  accessToken: string,
  operationId: string,
  baseUrl = resolveWorkspaceBackendApiBaseUrl()
): Promise<void> {
  await runAdminMaintenanceAction(
    `${baseUrl}/settings/runtime/cache-rebuilds/${encodeURIComponent(operationId)}/retry`,
    accessToken
  );
}

export async function getRuntimeCacheRebuildDetails(
  accessToken: string,
  operationId: string,
  baseUrl = resolveWorkspaceBackendApiBaseUrl()
): Promise<RuntimeCacheRebuildDetails> {
  const response = await fetch(
    `${baseUrl}/settings/runtime/cache-rebuilds/${encodeURIComponent(operationId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );
  const payload = await response.json().catch(() => null);
  if (
    !response.ok ||
    !payload ||
    typeof payload !== "object" ||
    !("data" in payload)
  ) {
    throw new Error("Runtime cache rebuild details could not be read.");
  }
  const data = (payload as { data: RuntimeCacheRebuildDetails }).data;
  if (
    typeof data.state !== "string" ||
    typeof data.phase !== "string" ||
    !Array.isArray(data.participants) ||
    !Array.isArray(data.auditTrail)
  ) {
    throw new Error("Runtime cache rebuild details response is invalid.");
  }
  return data;
}

export async function rollbackRuntimeCacheRebuild(
  accessToken: string,
  operationId: string,
  baseUrl = resolveWorkspaceBackendApiBaseUrl()
): Promise<void> {
  await runAdminMaintenanceAction(
    `${baseUrl}/settings/runtime/cache-rebuilds/${encodeURIComponent(operationId)}/rollback`,
    accessToken
  );
}

async function runAdminMaintenanceAction(
  url: string,
  accessToken: string
): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (response.ok) {
    return;
  }
  const payload = await response.json().catch(() => null);
  const message =
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
      ? payload.error.message
      : `Maintenance recovery request failed with status ${response.status}.`;
  throw new Error(message);
}
