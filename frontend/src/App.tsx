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
import { WorkspaceMockLayout } from "./modules/layout/components/WorkspaceMockLayout";
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
import { createHttpTileApiPort } from "./modules/tiles/adapters/httpTileApiPort";
import { createHttpPlaceableApiPort } from "./modules/placeables/adapters/httpPlaceableApiPort";
import { createHttpSoundApiPort } from "./modules/sounds/adapters/httpSoundApiPort";
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
  CatalogVfxPreviewRunner,
  isCatalogVfxPreviewRunnerPath
} from "./modules/vfx/dev/CatalogVfxPreviewRunner";

type AppRoute = "/login" | "/app";
type BackendHealthState = "checking" | "available" | "unavailable";

export const AUTH_SESSION_STORAGE_KEY = "aurora_web.auth_session.v1";
export const WORKSPACE_MODE_STORAGE_KEY = "aurora_web.workspace_mode.v1";
const SESSION_EXPIRY_SAFETY_MARGIN_MS = 1_000;
const SESSION_EXPIRY_TIMER_MAX_DELAY_MS = 2_147_483_647;

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
  return pathname === "/app" ? "/app" : "/login";
}

function averageDurationMs(values: number[]): string {
  if (values.length === 0) {
    return "n/a";
  }
  const average = values.reduce((sum, current) => sum + current, 0) / values.length;
  return `${average.toFixed(3)} ms`;
}

export default function App(props: AppProps) {
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
  const areaApiPort = useMemo(() => createHttpAreaApiPort(), []);
  const tileApiPort = useMemo(() => createHttpTileApiPort(), []);
  const placeableApiPort = useMemo(() => createHttpPlaceableApiPort(), []);
  const soundApiPort = useMemo(() => createHttpSoundApiPort(), []);
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

  const isMainView = Boolean(session) && Boolean(authorization) && route === "/app";
  const currentRole = authorization?.role;
  const handleWorkspaceTelemetryEvent = useCallback(
    (name: string, payload?: TelemetryPayload) => {
      telemetryFacade.track(name, payload);
    },
    [telemetryFacade]
  );

  useEffect(() => {
    if (route === "/app" && !isMainView) {
      window.history.replaceState({}, "", `/login${window.location.search}`);
      setRoute("/login");
      telemetryFacade.track("route.guard.redirect_anonymous", {
        from: "/app",
        to: "/login"
      });
    }
  }, [isMainView, route, telemetryFacade]);

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
        navigate("/app", loginSearch);
      } finally {
        setIsSigningIn(false);
      }
    },
    [
      authFacade,
      layoutFacades,
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
    (source: "placeables_catalog" | "sounds_catalog", invalidatedAccessToken: string) => {
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
        isAuthenticated={isMainView}
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
        onSignOut={handleSignOut}
      />

      <section className={pageContentClassName}>
        {isMainView ? (
          <WorkspaceMockLayout
            role={authorization!.role}
            userId={session!.user.id}
            workspaceChromeFacade={workspaceChromeFacade}
            sceneViewportPort={sceneViewportPort}
            areaApiPort={areaApiPort}
            tileApiPort={tileApiPort}
            placeableApiPort={placeableApiPort}
            soundApiPort={soundApiPort}
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
