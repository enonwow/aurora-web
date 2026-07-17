export interface WorkspaceBackendEnvironment {
  DEV: boolean;
  VITE_BACKEND_API_BASE_URL?: string;
}

const DEFAULT_DEV_BACKEND_API_BASE_URL = "http://127.0.0.1:3000/api/v1";
const DEFAULT_PRODUCTION_BACKEND_API_BASE_URL = "/api/v1";

export function resolveWorkspaceBackendApiBaseUrl(
  environment: WorkspaceBackendEnvironment = import.meta.env
): string {
  const override = environment.VITE_BACKEND_API_BASE_URL?.trim();
  if (override) {
    return override.replace(/\/+$/u, "");
  }
  return environment.DEV
    ? DEFAULT_DEV_BACKEND_API_BASE_URL
    : DEFAULT_PRODUCTION_BACKEND_API_BASE_URL;
}
