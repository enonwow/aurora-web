import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { getAuthBenchmarks } from "./modules/auth/authBenchmarks";
import { isVitestRuntime } from "./modules/auth/application/authRuntimeEnvironment";
import { browserAppDependencies } from "./modules/auth/composition/createBrowserAppDependencies";
import type {
  AuthSession,
  AuthorizationResponse,
  IAuthFacade
} from "./modules/auth/contracts";
import type { TelemetryFacade } from "./modules/telemetry/application/telemetryFacade";
import type { TelemetryEvent, TelemetryPayload } from "./modules/telemetry/domain/telemetryEvent";
import { WorkspaceTopbar } from "./modules/layout/components/WorkspaceTopbar";
import { WorkspaceLayout } from "./modules/layout/components/WorkspaceLayout";
import {
  type WorkspaceChromeFacade,
  type ToolbarActionKey,
  type WorkspaceCommandSignal
} from "./modules/layout/application/workspaceChromeFacade";
import { createWorkspaceTopbarActionStateFacade } from "./modules/layout/application/workspaceTopbarActionStateFacade";
import { createSceneObjectCatalogQueryFacade } from "./modules/layout/application/sceneObjectCatalogQueryFacade";
import {
  type LayoutSettings,
  type WorkspaceOptionSettings
} from "./modules/layout/application/layoutPreferencesFacade";
import { createBrowserLayoutFacadeBundle } from "./modules/layout/composition/createBrowserLayoutFacadeBundle";
import { createBrowserSceneViewportPort } from "./modules/scene/composition/createBrowserSceneViewportPort";
import { createHttpAreaApiPort } from "./modules/areas/adapters/httpAreaApiPort";
import { createBrowserAreaEditingFacade } from "./modules/areas/composition/createBrowserAreaEditingFacade";
import { createHttpAreaCreateApiPort } from "./modules/areas/adapters/httpAreaCreateApiPort";
import { createAreaCreateFacade } from "./modules/areas/application/areaCreateFacade";
import { createHttpAreaUpdateApiPort } from "./modules/areas/adapters/httpAreaUpdateApiPort";
import { createAreaUpdateFacade } from "./modules/areas/application/areaUpdateFacade";
import { createHttpAreaDeleteApiPort } from "./modules/areas/adapters/httpAreaDeleteApiPort";
import { createAreaDeleteFacade } from "./modules/areas/application/areaDeleteFacade";
import { createHttpAreaRenameApiPort } from "./modules/areas/adapters/httpAreaRenameApiPort";
import { createAreaRenameFacade } from "./modules/areas/application/areaRenameFacade";
import { createHttpAreaLifecyclePort } from "./modules/areas/adapters/httpAreaLifecyclePort";
import { createAreaLifecycleFacade } from "./modules/areas/application/areaLifecycleFacade";
import { HttpAreaCapabilityPort } from "./modules/areas/adapters/httpAreaCapabilityPort";
import { createAreaCapabilityFacade } from "./modules/areas/application/areaCapabilityFacade";
import { HttpAreaEventScriptCatalogPort } from "./modules/areas/adapters/httpAreaEventScriptCatalogPort";
import { createAreaEventScriptCatalogFacade } from "./modules/areas/application/areaEventScriptCatalogFacade";
import { createBrowserAreaEventScriptPublicationFacade } from "./modules/areas/composition/createBrowserAreaEventScriptPublicationFacade";
import type { AreaWorkspaceDraftDocument } from "./modules/areas/areaWorkspaceDraftContracts";
import { createHttpTileApiPort } from "./modules/tiles/adapters/httpTileApiPort";
import { createHttpPlaceableApiPort } from "./modules/placeables/adapters/httpPlaceableApiPort";
import { createHttpCreatureApiPort } from "./modules/creatures/adapters/httpCreatureApiPort";
import { createBrowserCreatureAppearancePaletteFacade } from "./modules/creatures/composition/createBrowserCreatureAppearancePaletteFacade";
import { createCreatureAppearanceCatalogFacade } from "./modules/creatures/application/creatureAppearanceCatalogFacade";
import { createCreatureGenderCatalogFacade } from "./modules/creatures/application/creatureGenderCatalogFacade";
import { createCreatureAppendageCatalogFacade } from
  "./modules/creatures/application/creatureAppendageCatalogFacade";
import { createCreaturePerceptionRangeCatalogFacade } from
  "./modules/creatures/application/creaturePerceptionRangeCatalogFacade";
import { createCreatureWalkRateCatalogFacade } from
  "./modules/creatures/application/creatureWalkRateCatalogFacade";
import { createCreatureSoundSetCatalogFacade } from
  "./modules/creatures/application/creatureSoundSetCatalogFacade";
import { createCreatureStartingPackageCatalogFacade } from
  "./modules/creatures/application/creatureStartingPackageCatalogFacade";
import { createCreatureClassCatalogFacade } from
  "./modules/creatures/application/creatureClassCatalogFacade";
import { createCreatureSkillCatalogFacade } from
  "./modules/creatures/application/creatureSkillCatalogFacade";
import { createCreatureFeatCatalogFacade } from
  "./modules/creatures/application/creatureFeatCatalogFacade";
import { createCreatureSpecialAbilityCatalogFacade } from
  "./modules/creatures/application/creatureSpecialAbilityCatalogFacade";
import { createCreaturePhenotypeCatalogFacade } from "./modules/creatures/application/creaturePhenotypeCatalogFacade";
import { createHttpEncounterApiPort } from "./modules/encounters/adapters/httpEncounterApiPort";
import { createHttpWaypointApiPort } from "./modules/waypoints/adapters/httpWaypointApiPort";
import { createHttpItemApiPort } from "./modules/items/adapters/httpItemApiPort";
import { createHttpSoundApiPort } from "./modules/sounds/adapters/httpSoundApiPort";
import { createHttpStoreApiPort } from "./modules/stores/adapters/httpStoreApiPort";
import { createBrowserClientAssetCachePort } from "./modules/shared/adapters/browserClientAssetCachePort";
import type { ClientAssetCacheDiagnosticEvent } from "./modules/shared/application/clientAssetCachePort";
import { enforceClientAssetCacheBudgetAtStartup } from "./modules/shared/application/clientAssetCacheLifecycle";
import { resolveWorkspaceBackendApiBaseUrl } from "./modules/shared/workspaceBackendApiBaseUrl";
import { probeBackendHealth } from "./modules/auth/adapters/httpBackendAuthFacade";
import {
  getDefaultWorkspaceModeId,
  resolveWorkspaceModeId,
  type WorkspaceModeId
} from "./modules/layout/workspaceModes";
import {
  isVfxFixtureRunnerPath,
  VfxFixtureRunner
} from "./modules/vfx/dev/VfxFixtureRunner";
import {
  isNwnVfxComparisonRunnerPath,
  NwnVfxComparisonRunner
} from "./modules/vfx/dev/NwnVfxComparisonRunner";
import {
  CatalogVfxPreviewRunner,
  isCatalogVfxPreviewRunnerPath
} from "./modules/vfx/dev/CatalogVfxPreviewRunner";
import {
  isMtrCustomShaderProbeRunnerPath,
  MtrCustomShaderProbeRunner
} from "./modules/placeables/dev/MtrCustomShaderProbeRunner";
import {
  CreatureLightPreviewRunner,
  isCreatureLightPreviewRunnerPath
} from "./modules/creatures/dev/CreatureLightPreviewRunner";
import {
  CreatureEquipmentAnimationProofRunner,
  isCreatureEquipmentAnimationProofRunnerPath
} from "./modules/creatures/dev/CreatureEquipmentAnimationProofRunner";
import {
  AreaLightShadowPreviewRunner,
  isAreaLightShadowPreviewRunnerPath
} from "./modules/areas/dev/AreaLightShadowPreviewRunner";
import {
  isItemPreviewProofRunnerPath,
  ItemPreviewProofRunner
} from "./modules/items/dev/ItemPreviewProofRunner";
import {
  isItemPropertiesDialogProofRunnerPath,
  ItemPropertiesDialogProofRunner
} from "./modules/items/dev/ItemPropertiesDialogProofRunner";
import {
  getRuntimePathReadiness,
  type RuntimePathReadiness
} from "./modules/runtime-settings/runtimePathOnboardingApi";
import { RuntimePathOnboardingScreen } from "./modules/runtime-settings/RuntimePathOnboardingScreen";
import {
  getSystemMaintenanceStatus,
  getRuntimeCacheRebuildDetails,
  retryRuntimeCacheRebuild,
  rollbackRuntimeCacheRebuild,
  type RuntimeCacheRebuildDetails,
  type SystemMaintenanceStatus
} from "./modules/runtime-settings/systemMaintenanceApi";
import { SystemMaintenanceScreen } from "./modules/runtime-settings/SystemMaintenanceScreen";

type AppRoute = "/login" | "/app" | "/settings/runtime" | "/maintenance";
type BackendHealthState = "checking" | "available" | "unavailable";

export const AUTH_SESSION_STORAGE_KEY = "aurora_web.auth_session.v1";
export const WORKSPACE_MODE_STORAGE_KEY = "aurora_web.workspace_mode.v1";
const SESSION_EXPIRY_SAFETY_MARGIN_MS = 1_000;
const SESSION_EXPIRY_TIMER_MAX_DELAY_MS = 2_147_483_647;
const WORKSPACE_BACKEND_API_BASE_URL = resolveWorkspaceBackendApiBaseUrl();

interface PersistedAuthState {
  session: AuthSession;
  authorization: AuthorizationResponse;
}

interface AppProps {
  authFacade?: IAuthFacade;
  telemetryFacade?: TelemetryFacade;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function resolveUserRole(value: unknown): AuthorizationResponse["role"] | null {
  return value === "viewer" || value === "builder" || value === "dm" || value === "admin"
    ? value
    : null;
}

function resolveSessionExpiryMs(session: Pick<AuthSession, "expiresAt">): number | null {
  const expiresAtMs = Date.parse(session.expiresAt);
  return Number.isFinite(expiresAtMs) ? expiresAtMs : null;
}

function isAuthSessionExpired(
  session: Pick<AuthSession, "expiresAt">,
  nowMs = Date.now()
): boolean {
  const expiresAtMs = resolveSessionExpiryMs(session);
  return expiresAtMs === null || expiresAtMs <= nowMs + SESSION_EXPIRY_SAFETY_MARGIN_MS;
}

function loadPersistedAuthState(storage: Storage): PersistedAuthState | null {
  try {
    const raw = storage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !isRecord(parsed.session) || !isRecord(parsed.authorization)) {
      return null;
    }
    const session = parsed.session;
    const user = session.user;
    if (!isRecord(user)) {
      return null;
    }
    const accessToken = readNonEmptyString(session.accessToken);
    const issuedAt = readNonEmptyString(session.issuedAt);
    const expiresAt = readNonEmptyString(session.expiresAt);
    const userId = readNonEmptyString(user.id);
    const username = readNonEmptyString(user.username);
    const displayName = readNonEmptyString(user.displayName);
    const sessionRole = resolveUserRole(user.role);
    const authorizationRole = resolveUserRole(parsed.authorization.role);
    if (
      !accessToken ||
      !issuedAt ||
      !expiresAt ||
      !userId ||
      !username ||
      !displayName ||
      !sessionRole ||
      !authorizationRole ||
      !Array.isArray(parsed.authorization.permissions)
    ) {
      return null;
    }
    const restoredState = {
      session: {
        accessToken,
        issuedAt,
        expiresAt,
        user: {
          id: userId,
          username,
          displayName,
          role: sessionRole
        }
      },
      authorization: {
        role: authorizationRole,
        permissions: parsed.authorization.permissions.filter(
          (permission): permission is string => typeof permission === "string"
        )
      }
    };
    if (isAuthSessionExpired(restoredState.session)) {
      clearPersistedAuthState(storage);
      return null;
    }
    return restoredState;
  } catch {
    return null;
  }
}

function persistAuthState(state: PersistedAuthState, storage: Storage): void {
  try {
    storage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota/availability issues; in-memory auth still works.
  }
}

function clearPersistedAuthState(storage: Storage): void {
  try {
    storage.removeItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage availability issues.
  }
}

function loadPersistedWorkspaceMode(storage: Storage): WorkspaceModeId {
  try {
    return resolveWorkspaceModeId(storage.getItem(WORKSPACE_MODE_STORAGE_KEY));
  } catch {
    return getDefaultWorkspaceModeId();
  }
}

function loadInitialWorkspaceMode(storage: Storage, search: string): WorkspaceModeId {
  const params = new URLSearchParams(search);
  return resolveWorkspaceModeId(
    params.get("mode") ?? loadPersistedWorkspaceMode(storage)
  );
}

function resolveAppSearchAfterLogin(search: string): string {
  const params = new URLSearchParams(search);
  params.delete("demo");
  const sanitizedSearch = params.toString();
  return sanitizedSearch ? `?${sanitizedSearch}` : "";
}

function persistWorkspaceMode(modeId: WorkspaceModeId, storage: Storage): void {
  try {
    storage.setItem(WORKSPACE_MODE_STORAGE_KEY, modeId);
  } catch {
    // Ignore storage quota/availability issues.
  }
}

function resolveRoute(pathname: string): AppRoute {
  if (
    pathname === "/app" ||
    pathname === "/settings/runtime" ||
    pathname === "/maintenance"
  ) {
    return pathname;
  }
  return "/login";
}

function averageDurationMs(values: number[]): string {
  if (values.length === 0) {
    return "n/a";
  }
  const average = values.reduce((sum, current) => sum + current, 0) / values.length;
  return `${average.toFixed(3)} ms`;
}

export default function App(props: AppProps) {
  if (isMtrCustomShaderProbeRunnerPath(window.location.pathname)) {
    return <MtrCustomShaderProbeRunner />;
  }
  if (isNwnVfxComparisonRunnerPath(window.location.pathname)) {
    return <NwnVfxComparisonRunner />;
  }
  if (isCreatureEquipmentAnimationProofRunnerPath(window.location.pathname)) {
    return <CreatureEquipmentAnimationProofRunner />;
  }
  if (isCreatureLightPreviewRunnerPath(window.location.pathname)) {
    return <CreatureLightPreviewRunner />;
  }
  if (isAreaLightShadowPreviewRunnerPath(window.location.pathname)) {
    return <AreaLightShadowPreviewRunner />;
  }
  if (isItemPreviewProofRunnerPath(window.location.pathname)) {
    return <ItemPreviewProofRunner />;
  }
  if (isItemPropertiesDialogProofRunnerPath(window.location.pathname)) {
    return <ItemPropertiesDialogProofRunner />;
  }
  if (isCatalogVfxPreviewRunnerPath(window.location.pathname)) {
    return <CatalogVfxPreviewRunner />;
  }
  if (isVfxFixtureRunnerPath(window.location.pathname)) {
    return <VfxFixtureRunner />;
  }
  return <AuthenticatedApp {...props} />;
}

function AuthenticatedApp({
  authFacade = browserAppDependencies.authFacade,
  telemetryFacade = browserAppDependencies.telemetryFacade
}: AppProps) {
  const layoutFacades = useMemo(
    () =>
      createBrowserLayoutFacadeBundle({
        storage: window.localStorage,
        rootElement: document.documentElement
      }),
    []
  );
  const persistedAuthState = useMemo(
    () => loadPersistedAuthState(window.localStorage),
    []
  );
  const workspaceChromeFacade: WorkspaceChromeFacade = layoutFacades.chrome;
  const workspaceTopbarActionStateFacade = useMemo(
    () => createWorkspaceTopbarActionStateFacade(),
    []
  );
  const sceneViewportPort = useMemo(() => createBrowserSceneViewportPort(), []);
  const clientAssetCachePort = useMemo(() => createBrowserClientAssetCachePort(), []);
  const areaApiPort = useMemo(
    () => createHttpAreaApiPort(undefined, WORKSPACE_BACKEND_API_BASE_URL),
    []
  );
  const areaEditingFacade = useMemo(
    () => createBrowserAreaEditingFacade(WORKSPACE_BACKEND_API_BASE_URL),
    []
  );
  const areaCreateFacade = useMemo(
    () =>
      createAreaCreateFacade(
        createHttpAreaCreateApiPort(undefined, WORKSPACE_BACKEND_API_BASE_URL)
      ),
    []
  );
  const areaUpdateFacade = useMemo(
    () =>
      createAreaUpdateFacade(
        createHttpAreaUpdateApiPort(undefined, WORKSPACE_BACKEND_API_BASE_URL)
      ),
    []
  );
  const areaDeleteFacade = useMemo(
    () =>
      createAreaDeleteFacade(
        createHttpAreaDeleteApiPort(undefined, WORKSPACE_BACKEND_API_BASE_URL)
      ),
    []
  );
  const areaRenameFacade = useMemo(
    () =>
      createAreaRenameFacade(
        createHttpAreaRenameApiPort(undefined, WORKSPACE_BACKEND_API_BASE_URL)
      ),
    []
  );
  const areaCapabilityFacade = useMemo(
    () =>
      createAreaCapabilityFacade(
        new HttpAreaCapabilityPort(undefined, WORKSPACE_BACKEND_API_BASE_URL)
      ),
    []
  );
  const areaEventScriptCatalogFacade = useMemo(
    () => createAreaEventScriptCatalogFacade(
      new HttpAreaEventScriptCatalogPort(undefined, WORKSPACE_BACKEND_API_BASE_URL)
    ),
    []
  );
  const areaEventScriptPublicationFacade = useMemo(
    () => createBrowserAreaEventScriptPublicationFacade(WORKSPACE_BACKEND_API_BASE_URL),
    [],
  );
  const tileApiPort = useMemo(
    () => createHttpTileApiPort(undefined, WORKSPACE_BACKEND_API_BASE_URL),
    []
  );
  const placeableApiPort = useMemo(
    () => createHttpPlaceableApiPort(undefined, WORKSPACE_BACKEND_API_BASE_URL),
    []
  );
  const creatureApiPort = useMemo(() => createHttpCreatureApiPort(), []);
  const creatureAppearanceCatalogFacade = useMemo(
    () => createCreatureAppearanceCatalogFacade(creatureApiPort),
    [creatureApiPort]
  );
  const creatureGenderCatalogFacade = useMemo(
    () => createCreatureGenderCatalogFacade(creatureApiPort),
    [creatureApiPort]
  );
  const creatureAppendageCatalogFacade = useMemo(
    () => createCreatureAppendageCatalogFacade(creatureApiPort),
    [creatureApiPort]
  );
  const creaturePerceptionRangeCatalogFacade = useMemo(
    () => createCreaturePerceptionRangeCatalogFacade(creatureApiPort),
    [creatureApiPort]
  );
  const creatureWalkRateCatalogFacade = useMemo(
    () => createCreatureWalkRateCatalogFacade(creatureApiPort),
    [creatureApiPort]
  );
  const creatureSoundSetCatalogFacade = useMemo(
    () => createCreatureSoundSetCatalogFacade(creatureApiPort),
    [creatureApiPort]
  );
  const creatureStartingPackageCatalogFacade = useMemo(
    () => createCreatureStartingPackageCatalogFacade(creatureApiPort),
    [creatureApiPort]
  );
  const creatureClassCatalogFacade = useMemo(
    () => createCreatureClassCatalogFacade(creatureApiPort),
    [creatureApiPort]
  );
  const creatureSkillCatalogFacade = useMemo(
    () => createCreatureSkillCatalogFacade(creatureApiPort),
    [creatureApiPort]
  );
  const creatureFeatCatalogFacade = useMemo(
    () => createCreatureFeatCatalogFacade(creatureApiPort),
    [creatureApiPort]
  );
  const creatureSpecialAbilityCatalogFacade = useMemo(
    () => createCreatureSpecialAbilityCatalogFacade(creatureApiPort),
    [creatureApiPort]
  );
  const creaturePhenotypeCatalogFacade = useMemo(
    () => createCreaturePhenotypeCatalogFacade(creatureApiPort),
    [creatureApiPort]
  );
  const creatureAppearancePaletteFacade = useMemo(
    () => createBrowserCreatureAppearancePaletteFacade(),
    []
  );
  const encounterApiPort = useMemo(() => createHttpEncounterApiPort(), []);
  const waypointApiPort = useMemo(() => createHttpWaypointApiPort(), []);
  const itemApiPort = useMemo(() => createHttpItemApiPort(), []);
  const soundApiPort = useMemo(() => createHttpSoundApiPort(), []);
  const storeApiPort = useMemo(() => createHttpStoreApiPort(), []);
  const sceneObjectCatalogQueryFacade = useMemo(
    () => createSceneObjectCatalogQueryFacade(),
    []
  );
  const [route, setRoute] = useState<AppRoute>(() =>
    resolveRoute(window.location.pathname)
  );
  const [session, setSession] = useState<AuthSession | null>(
    () => persistedAuthState?.session ?? null
  );
  const [authorization, setAuthorization] = useState<AuthorizationResponse | null>(
    () => persistedAuthState?.authorization ?? null
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [isViewportFullscreen, setIsViewportFullscreen] = useState(false);
  const [activeWorkspaceModeId, setActiveWorkspaceModeId] = useState<WorkspaceModeId>(
    () => loadInitialWorkspaceMode(window.localStorage, window.location.search)
  );
  const [toolbarState, setToolbarState] = useState(() =>
    workspaceChromeFacade.createDefaultToolbarState()
  );
  const [commandSignal, setCommandSignal] = useState<WorkspaceCommandSignal | null>(null);
  const [events, setEvents] = useState<TelemetryEvent[]>(() =>
    telemetryFacade.getEvents()
  );
  const [backendAccessToken, setBackendAccessToken] = useState<string | null>(
    () => persistedAuthState?.session.accessToken ?? null
  );
  const areaLifecycleFacade = useMemo(() => {
    const port = createHttpAreaLifecyclePort<AreaWorkspaceDraftDocument>(
      undefined,
      WORKSPACE_BACKEND_API_BASE_URL,
      () => backendAccessToken
    );
    return createAreaLifecycleFacade({ queryPort: port, commandPort: port });
  }, [backendAccessToken]);
  const [runtimePathReadiness, setRuntimePathReadiness] =
    useState<RuntimePathReadiness | null>(() =>
      isVitestRuntime()
        ? { ready: true, issues: [], canConfigure: true }
        : null
    );
  const [maintenanceStatus, setMaintenanceStatus] =
    useState<SystemMaintenanceStatus | null>(() =>
      isVitestRuntime()
        ? {
            state: "idle",
            maintenance: false,
            loginAvailable: true,
            phase: "idle",
            updatedAt: new Date(0).toISOString(),
            message: "Server is ready."
          }
        : null
    );
  const [maintenanceDetails, setMaintenanceDetails] =
    useState<RuntimeCacheRebuildDetails | null>(null);
  const [backendHealthState, setBackendHealthState] =
    useState<BackendHealthState>(() => (persistedAuthState ? "available" : "unavailable"));
  const [backendHealthService, setBackendHealthService] = useState<string | null>(null);
  const [layoutSettings, setLayoutSettings] = useState<LayoutSettings>(() =>
    layoutFacades.preferences.loadLayoutSettings()
  );
  const [workspaceOptions, setWorkspaceOptions] = useState<WorkspaceOptionSettings>(() =>
    layoutFacades.preferences.loadWorkspaceOptions()
  );

  const navigate = useCallback((nextRoute: AppRoute, search = "") => {
    window.history.pushState({}, "", `${nextRoute}${search}`);
    setRoute(nextRoute);
    telemetryFacade.track("route.changed", { route: nextRoute });
  }, [telemetryFacade]);

  const clearLocalSessionForMaintenance = useCallback(() => {
    setShowDebugPanel(false);
    setSession(null);
    setAuthorization(null);
    setBackendAccessToken(null);
    setRuntimePathReadiness(null);
    clearPersistedAuthState(window.localStorage);
    setUsername("");
    setPassword("");
    setIsSigningIn(false);
    setAuthError(null);
    setActiveWorkspaceModeId(getDefaultWorkspaceModeId());
    persistWorkspaceMode(getDefaultWorkspaceModeId(), window.localStorage);
    setToolbarState(workspaceChromeFacade.createDefaultToolbarState());
    setCommandSignal(null);
  }, [workspaceChromeFacade]);

  const refreshMaintenanceStatus = useCallback(async () => {
    if (isVitestRuntime()) {
      return;
    }
    try {
      setMaintenanceStatus(await getSystemMaintenanceStatus());
    } catch {
      // Keep the last known state. Backend availability is reported separately.
    }
  }, []);

  useEffect(() => {
    if (isVitestRuntime()) {
      return;
    }
    void refreshMaintenanceStatus();
    const intervalId = window.setInterval(
      () => void refreshMaintenanceStatus(),
      maintenanceStatus?.maintenance ? 2_000 : 10_000
    );
    return () => window.clearInterval(intervalId);
  }, [maintenanceStatus?.maintenance, refreshMaintenanceStatus]);

  useEffect(() => {
    if (
      isVitestRuntime() ||
      maintenanceStatus?.state !== "failed" ||
      !maintenanceStatus.operationId ||
      session?.user.role !== "admin"
    ) {
      setMaintenanceDetails(null);
      return;
    }
    let cancelled = false;
    void getRuntimeCacheRebuildDetails(
      session.accessToken,
      maintenanceStatus.operationId
    )
      .then((details) => {
        if (!cancelled) {
          setMaintenanceDetails(details);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMaintenanceDetails(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [maintenanceStatus?.operationId, maintenanceStatus?.state, session]);

  useEffect(() => {
    if (!maintenanceStatus?.maintenance) {
      if (route === "/maintenance") {
        navigate("/login");
      }
      return;
    }
    const adminRecoverySession =
      maintenanceStatus.state === "failed" && session?.user.role === "admin";
    if (!adminRecoverySession && session) {
      clearLocalSessionForMaintenance();
    }
    const failedLoginRoute =
      maintenanceStatus.state === "failed" && route === "/login";
    if (route !== "/maintenance" && !adminRecoverySession && !failedLoginRoute) {
      navigate("/maintenance");
    }
  }, [
    clearLocalSessionForMaintenance,
    maintenanceStatus,
    navigate,
    route,
    session
  ]);

  useEffect(() => {
    const unsubscribe = telemetryFacade.subscribe((incomingEvents) => {
      setEvents(incomingEvents);
    });
    return unsubscribe;
  }, [telemetryFacade]);

  useEffect(() => {
    if (!session || !authorization) {
      return;
    }
    persistAuthState({ session, authorization }, window.localStorage);
  }, [authorization, session]);

  useEffect(() => {
    const adoptRefreshedAuthState = (event: StorageEvent) => {
      if (
        event.key !== AUTH_SESSION_STORAGE_KEY ||
        (event.storageArea !== null && event.storageArea !== window.localStorage)
      ) {
        return;
      }
      const refreshed = loadPersistedAuthState(window.localStorage);
      if (!refreshed || refreshed.session.accessToken === session?.accessToken) {
        return;
      }
      setSession(refreshed.session);
      setAuthError(null);
      setBackendHealthState("available");
      telemetryFacade.track("ui.auth.session_refreshed_from_storage", {
        userId: refreshed.session.user.id
      });
    };
    window.addEventListener("storage", adoptRefreshedAuthState);
    return () => window.removeEventListener("storage", adoptRefreshedAuthState);
  }, [session?.accessToken, telemetryFacade]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const expiresAtMs = resolveSessionExpiryMs(session);
    const delayMs =
      expiresAtMs === null
        ? 0
        : Math.max(0, expiresAtMs - Date.now() - SESSION_EXPIRY_SAFETY_MARGIN_MS);
    const timeoutId = window.setTimeout(
      () => {
        setShowDebugPanel(false);
        setSession(null);
        setAuthorization(null);
        setBackendAccessToken(null);
        clearPersistedAuthState(window.localStorage);
        setUsername("");
        setPassword("");
        setIsSigningIn(false);
        setAuthError("Session expired. Please sign in again.");
        setBackendHealthState("available");
        setActiveWorkspaceModeId(getDefaultWorkspaceModeId());
        persistWorkspaceMode(getDefaultWorkspaceModeId(), window.localStorage);
        setToolbarState(workspaceChromeFacade.createDefaultToolbarState());
        setCommandSignal(null);
        telemetryFacade.track("ui.auth.session_expired", {
          userId: session.user.id
        });
        navigate("/login");
      },
      Math.min(delayMs, SESSION_EXPIRY_TIMER_MAX_DELAY_MS)
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [navigate, session, telemetryFacade, workspaceChromeFacade]);

  useEffect(() => {
    if (!session) {
      return;
    }
    let cancelled = false;
    void authFacade
      .authorize(session)
      .then((authz) => {
        if (cancelled) {
          return;
        }
        setAuthorization(authz);
        setBackendAccessToken(session.accessToken);
        setBackendHealthState("available");
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setShowDebugPanel(false);
        setSession(null);
        setAuthorization(null);
        setBackendAccessToken(null);
        clearPersistedAuthState(window.localStorage);
        setAuthError("Session expired. Please sign in again.");
        setBackendHealthState("available");
        telemetryFacade.track("ui.auth.session_invalidated", {
          userId: session.user.id
        });
        navigate("/login");
      });
    return () => {
      cancelled = true;
    };
  }, [authFacade, navigate, session, telemetryFacade]);

  useEffect(() => {
    if (!session || !authorization) {
      if (!isVitestRuntime()) {
        setRuntimePathReadiness(null);
      }
      return;
    }
    if (isVitestRuntime()) {
      return;
    }
    let cancelled = false;
    void getRuntimePathReadiness(session.accessToken)
      .then((readiness) => {
        if (!cancelled) {
          setRuntimePathReadiness(readiness);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRuntimePathReadiness({
            ready: false,
            canConfigure: false,
            issues: [
              {
                field: "runtimeSettings",
                code: "PATH_NOT_FOUND",
                message: "The server configuration status could not be read."
              }
            ]
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [authorization, session]);

  useEffect(() => {
    layoutFacades.preferences.persistLayoutSettings(layoutSettings);
    layoutFacades.preferences.applyTheme(layoutSettings.theme);
  }, [layoutFacades, layoutSettings]);

  useEffect(() => {
    layoutFacades.preferences.persistWorkspaceOptions(workspaceOptions);
  }, [layoutFacades, workspaceOptions]);

  useEffect(() => {
    if (!showDebugPanel) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowDebugPanel(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showDebugPanel]);

  useEffect(() => {
    const normalized = resolveRoute(window.location.pathname);
    if (window.location.pathname !== normalized) {
      window.history.replaceState({}, "", normalized);
    }
    setRoute(normalized);
    telemetryFacade.track("route.changed", { route: normalized });

    const onPopState = () => {
      const next = resolveRoute(window.location.pathname);
      setRoute(next);
      telemetryFacade.track("route.changed.popstate", { route: next });
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [telemetryFacade]);

  const isAuthenticated = Boolean(session) && Boolean(authorization);
  const isMainView =
    isAuthenticated &&
    maintenanceStatus?.maintenance !== true &&
    runtimePathReadiness?.ready === true &&
    route === "/app";
  const currentRole = authorization?.role;
  const handleWorkspaceTelemetryEvent = useCallback(
    (name: string, payload?: TelemetryPayload) => {
      telemetryFacade.track(name, payload);
    },
    [telemetryFacade]
  );
  const handleClientAssetCacheDiagnostic = useCallback(
    (event: ClientAssetCacheDiagnosticEvent) => {
      telemetryFacade.track("ui.workspace.asset_cache", { ...event });
    },
    [telemetryFacade]
  );
  useEffect(() => {
    void enforceClientAssetCacheBudgetAtStartup(
      clientAssetCachePort,
      handleClientAssetCacheDiagnostic,
    );
  }, [clientAssetCachePort, handleClientAssetCacheDiagnostic]);
  const handleToggleViewportFullscreen = useCallback(() => {
    setIsViewportFullscreen((current) => {
      const next = !current;
      telemetryFacade.track("ui.workspace.viewport_fullscreen_toggled", {
        active: next
      });
      return next;
    });
  }, [telemetryFacade]);
  const handleExitViewportFullscreen = useCallback(() => {
    setIsViewportFullscreen((current) => {
      if (!current) {
        return current;
      }
      telemetryFacade.track("ui.workspace.viewport_fullscreen_toggled", {
        active: false,
        source: "exit"
      });
      return false;
    });
  }, [telemetryFacade]);

  useEffect(() => {
    if ((route === "/app" || route === "/settings/runtime") && !isAuthenticated) {
      const destination: AppRoute = maintenanceStatus?.maintenance
        ? "/maintenance"
        : "/login";
      window.history.replaceState({}, "", `${destination}${window.location.search}`);
      setRoute(destination);
      telemetryFacade.track("route.guard.redirect_anonymous", {
        from: route,
        to: destination
      });
    }
  }, [isAuthenticated, maintenanceStatus?.maintenance, route, telemetryFacade]);

  useEffect(() => {
    if (
      !isAuthenticated ||
      !runtimePathReadiness ||
      maintenanceStatus?.maintenance
    ) {
      return;
    }
    if (!runtimePathReadiness.ready && route !== "/settings/runtime") {
      navigate("/settings/runtime");
      return;
    }
  }, [
    isAuthenticated,
    maintenanceStatus?.maintenance,
    navigate,
    route,
    runtimePathReadiness
  ]);

  useEffect(() => {
    if (!isMainView && isViewportFullscreen) {
      setIsViewportFullscreen(false);
    }
  }, [isMainView, isViewportFullscreen]);

  useEffect(() => {
    if (!isMainView || route !== "/app") {
      return;
    }
    const sanitizedSearch = resolveAppSearchAfterLogin(window.location.search);
    if (sanitizedSearch === window.location.search) {
      return;
    }
    window.history.replaceState({}, "", `/app${sanitizedSearch}`);
    telemetryFacade.track("route.legacy_demo_query_removed", {
      route: "/app"
    });
  }, [isMainView, route, telemetryFacade]);

  const runBackendHealthCheck = useCallback(async () => {
    if (isVitestRuntime()) {
      setBackendHealthState("available");
      setBackendHealthService("test");
      return;
    }

    setBackendHealthState("checking");
    const result = await probeBackendHealth();
    if (result.available) {
      setBackendHealthState("available");
      setBackendHealthService(result.service);
      telemetryFacade.track("ui.backend.health.ok", {
        service: result.service ?? "unknown"
      });
      return;
    }

    setBackendHealthState("unavailable");
    setBackendHealthService(null);
    telemetryFacade.track("ui.backend.health.failed");
  }, [telemetryFacade]);

  const handleSignIn = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      telemetryFacade.track("ui.auth.login_submit", { route });

      const formData = new FormData(event.currentTarget);
      const submittedUsername = String(formData.get("username") ?? "").trim();
      const submittedPassword = String(formData.get("password") ?? "");

      setUsername(submittedUsername);
      setPassword(submittedPassword);

      if (maintenanceStatus?.maintenance && !maintenanceStatus.loginAvailable) {
        setAuthError("Login is disabled while server data is rebuilding.");
        navigate("/maintenance");
        return;
      }

      if (!submittedUsername || !submittedPassword) {
        setAuthError("Username and password are required.");
        telemetryFacade.track("ui.auth.login_blocked", {
          reason: "EMPTY_CREDENTIALS"
        });
        return;
      }

      setIsSigningIn(true);
      setAuthError(null);

      try {
        const authResult = await authFacade.authenticate({
          username: submittedUsername,
          password: submittedPassword
        });

        if (!authResult.ok) {
          setAuthError("Login failed.");
          telemetryFacade.track("ui.auth.login_failed", {
            code: authResult.error.code
          });
          return;
        }

        const authz = await authFacade.authorize(authResult.session);
        const reloadedLayoutSettings =
          layoutFacades.preferences.loadLayoutSettings();
        const reloadedWorkspaceOptions =
          layoutFacades.preferences.loadWorkspaceOptions();
        setLayoutSettings(reloadedLayoutSettings);
        setWorkspaceOptions(reloadedWorkspaceOptions);
        setSession(authResult.session);
        setAuthorization(authz);
        setBackendAccessToken(authResult.session.accessToken);
        setBackendHealthState("available");
        const loginSearch = resolveAppSearchAfterLogin(window.location.search);
        const loginParams = new URLSearchParams(loginSearch);
        const loginWorkspaceMode = loginParams.has("mode")
          ? loadInitialWorkspaceMode(window.localStorage, loginSearch)
          : getDefaultWorkspaceModeId();
        setActiveWorkspaceModeId(loginWorkspaceMode);
        persistWorkspaceMode(loginWorkspaceMode, window.localStorage);
        setToolbarState(workspaceChromeFacade.createDefaultToolbarState());
        setCommandSignal(null);
        telemetryFacade.track("ui.auth.login_success", {
          role: authz.role
        });
        navigate(
          maintenanceStatus?.state === "failed" ? "/maintenance" : "/app",
          maintenanceStatus?.state === "failed" ? "" : loginSearch
        );
      } finally {
        setIsSigningIn(false);
      }
    },
    [
      authFacade,
      layoutFacades,
      maintenanceStatus,
      navigate,
      route,
      telemetryFacade,
      workspaceChromeFacade
    ]
  );

  const handleSignOut = useCallback(async () => {
    if (session) {
      await authFacade.signOut(session);
    }

    setShowDebugPanel(false);
    setSession(null);
    setAuthorization(null);
    setBackendAccessToken(null);
    clearPersistedAuthState(window.localStorage);
    setUsername("");
    setPassword("");
    setIsSigningIn(false);
    setAuthError(null);
    setActiveWorkspaceModeId(getDefaultWorkspaceModeId());
    persistWorkspaceMode(getDefaultWorkspaceModeId(), window.localStorage);
    setToolbarState(workspaceChromeFacade.createDefaultToolbarState());
    setCommandSignal(null);
    telemetryFacade.track("ui.auth.logout", { route });
    navigate("/login");
  }, [authFacade, navigate, route, session, telemetryFacade, workspaceChromeFacade]);

  const handleBackendSessionInvalidated = useCallback(
    (
      source:
        | "placeables_catalog"
        | "creatures_catalog"
        | "encounters_catalog"
        | "waypoints_catalog"
        | "items_catalog"
        | "stores_catalog"
        | "sounds_catalog",
      invalidatedAccessToken: string
    ) => {
      if (!session) {
        return;
      }
      if (backendAccessToken && invalidatedAccessToken !== backendAccessToken) {
        telemetryFacade.track("ui.auth.session_invalidated_stale", {
          userId: session.user.id,
          source
        });
        return;
      }
      setShowDebugPanel(false);
      setSession(null);
      setAuthorization(null);
      setBackendAccessToken(null);
      clearPersistedAuthState(window.localStorage);
      setUsername("");
      setPassword("");
      setIsSigningIn(false);
      setAuthError("Session expired. Please sign in again.");
      setBackendHealthState("available");
      const defaultWorkspaceModeId = getDefaultWorkspaceModeId();
      setActiveWorkspaceModeId(defaultWorkspaceModeId);
      persistWorkspaceMode(defaultWorkspaceModeId, window.localStorage);
      setToolbarState(workspaceChromeFacade.createDefaultToolbarState());
      setCommandSignal(null);
      telemetryFacade.track("ui.auth.session_invalidated", {
        userId: session.user.id,
        source
      });
      navigate("/login");
    },
    [backendAccessToken, navigate, session, telemetryFacade, workspaceChromeFacade]
  );

  const handleToolbarAction = useCallback(
    (actionKey: ToolbarActionKey) => {
      setToolbarState((current) =>
        workspaceChromeFacade.applyToolbarAction(current, actionKey)
      );
      setCommandSignal((current) => ({
        actionKey,
        revision: (current?.revision ?? 0) + 1,
        issuedAtUnixMs: Date.now()
      }));
      telemetryFacade.track("ui.workspace.toolbar_action", {
        actionKey,
        role: currentRole ?? "anonymous"
      });
    },
    [currentRole, telemetryFacade, workspaceChromeFacade]
  );

  const handleWorkspaceModeChange = useCallback((modeId: WorkspaceModeId) => {
    setActiveWorkspaceModeId(modeId);
    persistWorkspaceMode(modeId, window.localStorage);
  }, []);

  const benchmarkSamples = getAuthBenchmarks();
  const authDurations = benchmarkSamples
    .filter((sample) => sample.operation === "authenticate")
    .map((sample) => sample.durationMs);
  const authzDurations = benchmarkSamples
    .filter((sample) => sample.operation === "authorize")
    .map((sample) => sample.durationMs);
  const pageContentClassName = isMainView
    ? "page-content page-content-workspace"
    : "page-content page-content-auth";

  return (
    <main className="app-shell">
      <WorkspaceTopbar
        isAuthenticated={isAuthenticated}
        role={currentRole}
        workspaceChromeFacade={workspaceChromeFacade}
        workspaceTopbarActionStateFacade={workspaceTopbarActionStateFacade}
        workspaceModeId={activeWorkspaceModeId}
        toolbarState={toolbarState}
        layoutTheme={layoutSettings.theme}
        onLayoutThemeChange={(theme) =>
          setLayoutSettings((current) => ({ ...current, theme }))
        }
        workspaceOptions={workspaceOptions}
        clientAssetCachePort={clientAssetCachePort}
        onClientAssetCacheDiagnostic={handleClientAssetCacheDiagnostic}
        onWorkspaceOptionsChange={(patch) => {
          setWorkspaceOptions((current) => {
            const next = { ...current, ...patch };
            telemetryFacade.track("ui.workspace.options.changed", patch);
            return next;
          });
        }}
        onAction={handleToolbarAction}
        showDebugPanel={showDebugPanel}
        onToggleDebug={() => setShowDebugPanel((current) => !current)}
        isViewportFullscreen={isViewportFullscreen}
        onToggleViewportFullscreen={isMainView ? handleToggleViewportFullscreen : undefined}
        onOpenRuntimeSettings={
          currentRole === "admin" ? () => navigate("/settings/runtime") : undefined
        }
        onSignOut={handleSignOut}
      />

      <section className={pageContentClassName}>
        {route === "/maintenance" && maintenanceStatus?.maintenance ? (
          <SystemMaintenanceScreen
            status={maintenanceStatus}
            details={maintenanceDetails}
            onRetryStatus={() => void refreshMaintenanceStatus()}
            accessToken={
              session?.user.role === "admin"
                ? session.accessToken
                : undefined
            }
            onAdminSignIn={() => navigate("/login")}
            onRetryRebuild={
              session?.user.role === "admin" && maintenanceStatus.operationId
                ? async () => {
                    await retryRuntimeCacheRebuild(
                      session.accessToken,
                      maintenanceStatus.operationId!
                    );
                    setMaintenanceStatus((current) =>
                      current
                        ? {
                            ...current,
                            state: "rebuilding",
                            maintenance: true,
                            loginAvailable: false,
                            phase: "building_generation",
                            message:
                              "Server data is being rebuilt. Login will reopen automatically when it is ready."
                          }
                        : current
                    );
                    clearLocalSessionForMaintenance();
                  }
                : undefined
            }
            onRollback={
              session?.user.role === "admin" && maintenanceStatus.operationId
                ? async () => {
                    await rollbackRuntimeCacheRebuild(
                      session.accessToken,
                      maintenanceStatus.operationId!
                    );
                    await refreshMaintenanceStatus();
                  }
                : undefined
            }
          />
        ) : isMainView ? (
          <WorkspaceLayout
            role={authorization!.role}
            userId={session!.user.id}
            workspaceChromeFacade={workspaceChromeFacade}
            sceneViewportPort={sceneViewportPort}
            clientAssetCachePort={clientAssetCachePort}
            areaLifecycleFacade={areaLifecycleFacade}
            areaApiPort={areaApiPort}
            areaEditingFacade={areaEditingFacade}
            areaCreateFacade={areaCreateFacade}
            areaUpdateFacade={areaUpdateFacade}
            areaDeleteFacade={areaDeleteFacade}
            areaRenameFacade={areaRenameFacade}
            areaCapabilityFacade={areaCapabilityFacade}
            areaEventScriptCatalogFacade={areaEventScriptCatalogFacade}
            areaEventScriptPublicationFacade={areaEventScriptPublicationFacade}
            tileApiPort={tileApiPort}
            placeableApiPort={placeableApiPort}
            creatureApiPort={creatureApiPort}
            creatureAppearanceCatalogFacade={creatureAppearanceCatalogFacade}
            creatureGenderCatalogFacade={creatureGenderCatalogFacade}
            creatureAppendageCatalogFacade={creatureAppendageCatalogFacade}
            creaturePerceptionRangeCatalogFacade={creaturePerceptionRangeCatalogFacade}
            creatureWalkRateCatalogFacade={creatureWalkRateCatalogFacade}
            creatureSoundSetCatalogFacade={creatureSoundSetCatalogFacade}
            creatureStartingPackageCatalogFacade={creatureStartingPackageCatalogFacade}
            creatureClassCatalogFacade={creatureClassCatalogFacade}
            creatureSkillCatalogFacade={creatureSkillCatalogFacade}
            creatureFeatCatalogFacade={creatureFeatCatalogFacade}
            creatureSpecialAbilityCatalogFacade={creatureSpecialAbilityCatalogFacade}
            creaturePhenotypeCatalogFacade={creaturePhenotypeCatalogFacade}
            creatureAppearancePaletteFacade={creatureAppearancePaletteFacade}
            encounterApiPort={encounterApiPort}
            waypointApiPort={waypointApiPort}
            itemApiPort={itemApiPort}
            soundApiPort={soundApiPort}
            storeApiPort={storeApiPort}
            backendAccessToken={backendAccessToken}
            sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
            trackTelemetryEvent={handleWorkspaceTelemetryEvent}
            activeBuilderModeId={activeWorkspaceModeId}
            onActiveBuilderModeChange={handleWorkspaceModeChange}
            toolbarState={toolbarState}
            commandSignal={commandSignal}
            workspaceOptions={workspaceOptions}
            leftCollapsed={layoutSettings.leftSidebarCollapsed}
            rightCollapsed={layoutSettings.rightSidebarCollapsed}
            viewportFullscreen={isViewportFullscreen}
            onExitViewportFullscreen={handleExitViewportFullscreen}
            onBackendSessionInvalidated={handleBackendSessionInvalidated}
            onToggleLeftCollapsed={() =>
              setLayoutSettings((current) => {
                const nextCollapsed = !current.leftSidebarCollapsed;
                telemetryFacade.track("ui.workspace.sidebar.left_toggle", {
                  collapsed: nextCollapsed
                });
                return {
                  ...current,
                  leftSidebarCollapsed: nextCollapsed
                };
              })
            }
            onToggleRightCollapsed={() =>
              setLayoutSettings((current) => {
                const nextCollapsed = !current.rightSidebarCollapsed;
                telemetryFacade.track("ui.workspace.sidebar.right_toggle", {
                  collapsed: nextCollapsed
                });
                return {
                  ...current,
                  rightSidebarCollapsed: nextCollapsed
                };
              })
            }
          />
        ) : isAuthenticated && runtimePathReadiness && backendAccessToken ? (
          <RuntimePathOnboardingScreen
            accessToken={backendAccessToken}
            readiness={runtimePathReadiness}
            onCompleted={(result) => {
              if (result.outcome === "NO_CHANGES") {
                setRuntimePathReadiness((current) => ({
                  ready: true,
                  issues: [],
                  canConfigure: current?.canConfigure ?? true,
                  values: current?.values,
                  environment: current?.environment
                }));
                navigate("/app");
                return;
              }
              setMaintenanceStatus({
                state: "rebuilding",
                maintenance: true,
                loginAvailable: false,
                phase: "building_generation",
                operationId: result.operationId,
                updatedAt: new Date().toISOString(),
                retryAfterSeconds: 2,
                message:
                  "Server data is being rebuilt. Login will reopen automatically when it is ready."
              });
              clearLocalSessionForMaintenance();
              navigate("/maintenance");
            }}
          />
        ) : isAuthenticated ? (
          <section className="card" aria-live="polite">
            <p className="eyebrow">Server configuration</p>
            <h1>Checking Aurora paths</h1>
            <p>The workspace will open when server configuration is ready.</p>
          </section>
        ) : (
          <section className="card">
            <p className="eyebrow">Authentication</p>
            <h1>Sign in to Aurora Web</h1>
            <form className="form-grid" onSubmit={handleSignIn}>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                value={username}
                onChange={(inputEvent) => setUsername(inputEvent.target.value)}
                autoComplete="username"
              />

              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(inputEvent) => setPassword(inputEvent.target.value)}
                autoComplete="current-password"
              />

              {authError ? <p className="error-text">{authError}</p> : null}
              <p className="auth-status-line" role="status" aria-live="polite">
                Backend:{" "}
                <strong>
                  {backendHealthState === "available"
                    ? "available"
                    : backendHealthState === "checking"
                      ? "checking"
                      : "unavailable"}
                </strong>
                {backendHealthService ? ` (${backendHealthService})` : ""}
              </p>
              <button
                className="topbar-btn"
                type="button"
                onClick={() => void runBackendHealthCheck()}
                disabled={backendHealthState === "checking"}
              >
                Check backend
              </button>

              <button className="primary-btn" type="submit" disabled={isSigningIn}>
                {isSigningIn ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </section>
        )}
      </section>

      {isMainView && showDebugPanel ? (
        <section
          className="debug-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowDebugPanel(false);
            }
          }}
        >
          <article className="debug-dialog" role="dialog" aria-modal="true" aria-label="debug panel">
            <header className="debug-dialog-header">
              <h2>Debug telemetry</h2>
              <button className="topbar-btn" type="button" onClick={() => setShowDebugPanel(false)}>
                Close
              </button>
            </header>
            <p>Route: {route}</p>
            <p>Auth benchmark avg: {averageDurationMs(authDurations)}</p>
            <p>Authorize benchmark avg: {averageDurationMs(authzDurations)}</p>
            <ul className="event-list">
              {events.map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.name}</strong> {JSON.stringify(entry.payload)}
                </li>
              ))}
            </ul>
          </article>
        </section>
      ) : null}
    </main>
  );
}
