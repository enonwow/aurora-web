export interface WorkspaceBackendEnvironment {
  DEV: boolean;
  VITE_BACKEND_API_BASE_URL?: string;
}

// Keep the workspace control plane on the Vite same-origin proxy in development.
// A direct loopback request works from a terminal but is routinely blocked or
// isolated in browser-controlled proof sessions, leaving Areas unable to keep
// its authenticated tile-editing session alive.
const DEFAULT_DEV_BACKEND_API_BASE_URL = "/_aurora/v1";
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
