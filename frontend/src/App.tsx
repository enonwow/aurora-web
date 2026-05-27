import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { getAuthBenchmarks } from "./modules/auth/authBenchmarks";
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
import { probeBackendHealth } from "./modules/auth/adapters/httpBackendAuthFacade";

type AppRoute = "/login" | "/app";
type BackendHealthState = "checking" | "available" | "unavailable";

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

export default function App({
  authFacade = browserAppDependencies.authFacade,
  telemetryFacade = browserAppDependencies.telemetryFacade
}: {
  authFacade?: IAuthFacade;
  telemetryFacade?: TelemetryFacade;
}) {
  const layoutFacades = useMemo(
    () =>
      createBrowserLayoutFacadeBundle({
        storage: window.localStorage,
        rootElement: document.documentElement
      }),
    []
  );
  const workspaceChromeFacade: WorkspaceChromeFacade = layoutFacades.chrome;
  const workspaceTopbarActionStateFacade = useMemo(
    () => createWorkspaceTopbarActionStateFacade(),
    []
  );
  const sceneViewportPort = useMemo(() => createBrowserSceneViewportPort(), []);
  const areaApiPort = useMemo(() => createHttpAreaApiPort(), []);
  const sceneObjectCatalogQueryFacade = useMemo(
    () => createSceneObjectCatalogQueryFacade(),
    []
  );
  const [route, setRoute] = useState<AppRoute>(() =>
    resolveRoute(window.location.pathname)
  );
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authorization, setAuthorization] = useState<AuthorizationResponse | null>(
    null
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [toolbarState, setToolbarState] = useState(() =>
    workspaceChromeFacade.createDefaultToolbarState()
  );
  const [commandSignal, setCommandSignal] = useState<WorkspaceCommandSignal | null>(null);
  const [events, setEvents] = useState<TelemetryEvent[]>(() =>
    telemetryFacade.getEvents()
  );
  const [backendAccessToken, setBackendAccessToken] = useState<string | null>(null);
  const [backendHealthState, setBackendHealthState] =
    useState<BackendHealthState>("unavailable");
  const [backendHealthService, setBackendHealthService] = useState<string | null>(null);
  const [layoutSettings, setLayoutSettings] = useState<LayoutSettings>(() =>
    layoutFacades.preferences.loadLayoutSettings()
  );
  const [workspaceOptions, setWorkspaceOptions] = useState<WorkspaceOptionSettings>(() =>
    layoutFacades.preferences.loadWorkspaceOptions()
  );

  const navigate = useCallback((nextRoute: AppRoute) => {
    window.history.pushState({}, "", nextRoute);
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
      window.history.replaceState({}, "", "/login");
      setRoute("/login");
      telemetryFacade.track("route.guard.redirect_anonymous", {
        from: "/app",
        to: "/login"
      });
    }
  }, [isMainView, route, telemetryFacade]);

  const runBackendHealthCheck = useCallback(async () => {
    if (import.meta.env.MODE === "test") {
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
        setToolbarState(workspaceChromeFacade.createDefaultToolbarState());
        setCommandSignal(null);
        telemetryFacade.track("ui.auth.login_success", {
          role: authz.role
        });
        navigate("/app");
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
    setUsername("");
    setPassword("");
    setIsSigningIn(false);
    setAuthError(null);
    setToolbarState(workspaceChromeFacade.createDefaultToolbarState());
    setCommandSignal(null);
    telemetryFacade.track("ui.auth.logout", { route });
    navigate("/login");
  }, [authFacade, navigate, route, session, telemetryFacade, workspaceChromeFacade]);

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
            backendAccessToken={backendAccessToken}
            sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
            trackTelemetryEvent={handleWorkspaceTelemetryEvent}
            toolbarState={toolbarState}
            commandSignal={commandSignal}
            workspaceOptions={workspaceOptions}
            leftCollapsed={layoutSettings.leftSidebarCollapsed}
            rightCollapsed={layoutSettings.rightSidebarCollapsed}
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
