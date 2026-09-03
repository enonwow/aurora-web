import { resolveWorkspaceBackendApiBaseUrl } from "../shared/workspaceBackendApiBaseUrl";

export type RuntimePathReadinessCode =
  | "MOUNT_NOT_AVAILABLE"
  | "HOST_PATH_REQUIRED"
  | "RESTART_REQUIRED"
  | "RUNTIME_PATH_UPDATE_REQUIRED"
  | "PATH_NOT_FOUND"
  | "PATH_NOT_DIRECTORY"
  | "PATH_NOT_FILE"
  | "MODULE_SOURCE_REQUIRED";

export interface RuntimePathReadinessIssue {
  field: string;
  code: RuntimePathReadinessCode;
  message: string;
  envVariable?: string;
  hostPath?: string;
  runtimePath?: string;
}

export interface RuntimePathOnboardingInput {
  nwnUserDir: string;
  nwnInstallDir: string;
  auroraReferenceDir: string;
  hakDirectories: string[];
  itemGeneratorSourceDirectories: string[];
  moduleDecompiledPath: string;
  modulePackedPath: string;
  tlkCustomPath?: string;
}

export interface RuntimePathReadiness {
  ready: boolean;
  issues: RuntimePathReadinessIssue[];
  canConfigure: boolean;
  values?: RuntimePathOnboardingInput;
  environment?: {
    mode: "host" | "docker";
    mounts?: Array<{
      envVariable: string;
      hostPath: string;
      runtimePath: string;
      configured: boolean;
    }>;
  };
}

export type RuntimePathBrowserScope =
  | "nwn-user"
  | "nwn-install"
  | "module-decompiled"
  | "module-packed"
  | "hak-directory"
  | "aurora-reference"
  | "item-generator";

export interface RuntimePathBrowserRoot {
  id: string;
  label: string;
  path: string;
  available: boolean;
}

export interface RuntimePathBrowserEntry {
  name: string;
  path: string;
  kind: "directory" | "file";
  selectable: boolean;
}

export interface RuntimePathBrowserResult {
  scope: RuntimePathBrowserScope;
  selectionKind: "directory" | "file";
  currentPath: string;
  parentPath?: string;
  roots: RuntimePathBrowserRoot[];
  entries: RuntimePathBrowserEntry[];
  truncated: boolean;
}

export interface RuntimeCacheRebuildStartResult {
  outcome: "NO_CHANGES" | "ACCEPTED";
  operationId: string;
  fingerprint: string;
  generation?: string;
  integrity: {
    valid: boolean;
    reason: string;
  };
}

interface ApiErrorPayload {
  error?: { message?: string; details?: Array<{ path?: string; reason?: string; reasonCode?: string }> };
}

async function readPayload(response: Response): Promise<unknown> {
  const payload = await response.json().catch(() => null);
  if (response.ok) {
    return payload;
  }
  const error = payload as ApiErrorPayload | null;
  const message = error?.error?.message ?? `Backend request failed with status ${response.status}.`;
  throw new Error(message);
}

function parseReadiness(payload: unknown): RuntimePathReadiness {
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    throw new Error("Runtime path readiness response is invalid.");
  }
  const data = (payload as { data: RuntimePathReadiness }).data;
  if (typeof data.ready !== "boolean" || !Array.isArray(data.issues)) {
    throw new Error("Runtime path readiness response is invalid.");
  }
  return data;
}

function parseRebuildStart(payload: unknown): RuntimeCacheRebuildStartResult {
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    throw new Error("Runtime cache rebuild response is invalid.");
  }
  const data = (payload as { data: RuntimeCacheRebuildStartResult }).data;
  if (
    (data.outcome !== "NO_CHANGES" && data.outcome !== "ACCEPTED") ||
    typeof data.operationId !== "string" ||
    typeof data.fingerprint !== "string"
  ) {
    throw new Error("Runtime cache rebuild response is invalid.");
  }
  return data;
}

function parsePathBrowser(payload: unknown): RuntimePathBrowserResult {
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    throw new Error("Runtime path browser response is invalid.");
  }
  const data = (payload as { data: RuntimePathBrowserResult }).data;
  if (
    typeof data.currentPath !== "string" ||
    !Array.isArray(data.roots) ||
    !Array.isArray(data.entries)
  ) {
    throw new Error("Runtime path browser response is invalid.");
  }
  return data;
}

function authHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  };
}

export async function getRuntimePathReadiness(
  accessToken: string,
  baseUrl = resolveWorkspaceBackendApiBaseUrl()
): Promise<RuntimePathReadiness> {
  const response = await fetch(`${baseUrl}/settings/runtime/readiness`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return parseReadiness(await readPayload(response));
}

export async function browseRuntimePath(
  accessToken: string,
  scope: RuntimePathBrowserScope,
  path: string,
  baseUrl = resolveWorkspaceBackendApiBaseUrl()
): Promise<RuntimePathBrowserResult> {
  const query = new URLSearchParams({ scope });
  if (path.trim()) {
    query.set("path", path.trim());
  }
  const response = await fetch(
    `${baseUrl}/settings/runtime/path-browser?${query.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );
  return parsePathBrowser(await readPayload(response));
}

export async function saveRuntimePathOnboarding(
  accessToken: string,
  input: RuntimePathOnboardingInput,
  baseUrl = resolveWorkspaceBackendApiBaseUrl()
): Promise<RuntimeCacheRebuildStartResult> {
  const response = await fetch(`${baseUrl}/settings/runtime/onboarding`, {
    method: "PUT",
    headers: {
      ...authHeaders(accessToken),
      "Idempotency-Key": crypto.randomUUID()
    },
    body: JSON.stringify({
      ...input,
      confirmGlobalLogout: true
    })
  });
  return parseRebuildStart(await readPayload(response));
}

export async function validateRuntimePathOnboarding(
  accessToken: string,
  input: RuntimePathOnboardingInput,
  baseUrl = resolveWorkspaceBackendApiBaseUrl()
): Promise<RuntimePathReadiness> {
  const response = await fetch(
    `${baseUrl}/settings/runtime/onboarding/validate`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(input)
    }
  );
  return parseReadiness(await readPayload(response));
}

export async function startRuntimeCacheRebuild(
  accessToken: string,
  baseUrl = resolveWorkspaceBackendApiBaseUrl()
): Promise<RuntimeCacheRebuildStartResult> {
  const response = await fetch(`${baseUrl}/settings/runtime/cache-rebuilds`, {
    method: "POST",
    headers: {
      ...authHeaders(accessToken),
      "Idempotency-Key": crypto.randomUUID()
    },
    body: JSON.stringify({ confirmGlobalLogout: true })
  });
  return parseRebuildStart(await readPayload(response));
}
