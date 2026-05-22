import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getAuthBenchmarks } from "./modules/auth/authBenchmarks";
import type {
  AuthSession,
  AuthorizationResponse,
  UserRole,
  IAuthFacade
} from "./modules/auth/contracts";
import { mockAuthFacade } from "./modules/auth/mockAuthFacade";
import {
  getTelemetryEvents,
  subscribeTelemetry,
  trackTelemetry
} from "./modules/telemetry/telemetryStore";
import type { TelemetryEvent } from "./modules/telemetry/telemetryStore";
import { WorkspaceTopbar } from "./modules/layout/components/WorkspaceTopbar";
import { WorkspaceMockLayout } from "./modules/layout/components/WorkspaceMockLayout";
import {
  applyToolbarAction,
  createDefaultToolbarState,
  type ToolbarActionKey,
  type WorkspaceCommandSignal
} from "./modules/layout/roleTopbarPolicy";
import {
  applyLayoutThemeToDocument
} from "./modules/layout/themeSettings";
import {
  type LayoutSettings,
  loadLayoutSettingsFromStorage,
  persistLayoutSettingsToStorage
} from "./modules/layout/layoutSettings";
import {
  loadWorkspaceOptionSettingsFromStorage,
  persistWorkspaceOptionSettingsToStorage,
  type WorkspaceOptionSettings
} from "./modules/layout/workspaceOptionSettings";

type AppRoute = "/login" | "/app";

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
  authFacade = mockAuthFacade
}: {
  authFacade?: IAuthFacade;
}) {
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
    createDefaultToolbarState()
  );
  const [commandSignal, setCommandSignal] = useState<WorkspaceCommandSignal | null>(null);
  const [events, setEvents] = useState<TelemetryEvent[]>(() => getTelemetryEvents());
  const [layoutSettings, setLayoutSettings] = useState<LayoutSettings>(() =>
    loadLayoutSettingsFromStorage(window.localStorage)
  );
  const [workspaceOptions, setWorkspaceOptions] = useState<WorkspaceOptionSettings>(() =>
    loadWorkspaceOptionSettingsFromStorage(window.localStorage)
  );

  const navigate = useCallback((nextRoute: AppRoute) => {
    window.history.pushState({}, "", nextRoute);
    setRoute(nextRoute);
    trackTelemetry("route.changed", { route: nextRoute });
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeTelemetry((incomingEvents) => {
      setEvents(incomingEvents);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    persistLayoutSettingsToStorage(layoutSettings, window.localStorage);
    applyLayoutThemeToDocument(layoutSettings.theme, document.documentElement);
  }, [layoutSettings]);

  useEffect(() => {
    persistWorkspaceOptionSettingsToStorage(workspaceOptions, window.localStorage);
  }, [workspaceOptions]);

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
    trackTelemetry("route.changed", { route: normalized });

    const onPopState = () => {
      const next = resolveRoute(window.location.pathname);
      setRoute(next);
      trackTelemetry("route.changed.popstate", { route: next });
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const isMainView = Boolean(session) && Boolean(authorization) && route === "/app";
  const currentRole: UserRole | undefined = authorization?.role;

  useEffect(() => {
    if (route === "/app" && !isMainView) {
      window.history.replaceState({}, "", "/login");
      setRoute("/login");
      trackTelemetry("route.guard.redirect_anonymous", {
        from: "/app",
        to: "/login"
      });
    }
  }, [isMainView, route]);

  const handleSignIn = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      trackTelemetry("ui.auth.login_submit", { route });

      if (!username.trim() || !password.trim()) {
        setAuthError("Username and password are required.");
        trackTelemetry("ui.auth.login_blocked", { reason: "EMPTY_CREDENTIALS" });
        return;
      }

      setIsSigningIn(true);
      setAuthError(null);

      try {
        const authResult = await authFacade.authenticate({
          username: username.trim(),
          password
        });

        if (!authResult.ok) {
          setAuthError(authResult.error.message);
          trackTelemetry("ui.auth.login_failed", { code: authResult.error.code });
          return;
        }

        const authz = await authFacade.authorize(authResult.session);
        const reloadedLayoutSettings = loadLayoutSettingsFromStorage(window.localStorage);
        const reloadedWorkspaceOptions =
          loadWorkspaceOptionSettingsFromStorage(window.localStorage);
        setLayoutSettings(reloadedLayoutSettings);
        setWorkspaceOptions(reloadedWorkspaceOptions);
        setSession(authResult.session);
        setAuthorization(authz);
        setToolbarState(createDefaultToolbarState());
        setCommandSignal(null);
        trackTelemetry("ui.auth.login_success", { role: authz.role });
        navigate("/app");
      } finally {
        setIsSigningIn(false);
      }
    },
    [authFacade, navigate, password, route, username]
  );

  const handleSignOut = useCallback(async () => {
    if (session) {
      await authFacade.signOut(session);
    }

    setShowDebugPanel(false);
    setSession(null);
    setAuthorization(null);
    setUsername("");
    setPassword("");
    setIsSigningIn(false);
    setAuthError(null);
    setToolbarState(createDefaultToolbarState());
    setCommandSignal(null);
    trackTelemetry("ui.auth.logout", { route });
    navigate("/login");
  }, [authFacade, navigate, route, session]);

  const handleToolbarAction = useCallback(
    (actionKey: ToolbarActionKey) => {
      setToolbarState((current) => applyToolbarAction(current, actionKey));
      setCommandSignal((current) => ({
        actionKey,
        revision: (current?.revision ?? 0) + 1,
        issuedAtUnixMs: Date.now()
      }));
      trackTelemetry("ui.workspace.toolbar_action", {
        actionKey,
        role: currentRole ?? "anonymous"
      });
    },
    [currentRole]
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
        toolbarState={toolbarState}
        layoutTheme={layoutSettings.theme}
        onLayoutThemeChange={(theme) =>
          setLayoutSettings((current) => ({ ...current, theme }))
        }
        viewportControlPreset={layoutSettings.viewportControlPreset}
        onViewportControlPresetChange={(nextPreset) => {
          setLayoutSettings((current) => ({
            ...current,
            viewportControlPreset: nextPreset
          }));
          trackTelemetry("ui.workspace.viewport_control_preset_changed", {
            preset: nextPreset
          });
        }}
        workspaceOptions={workspaceOptions}
        onWorkspaceOptionsChange={(patch) => {
          setWorkspaceOptions((current) => {
            const next = { ...current, ...patch };
            trackTelemetry("ui.workspace.options.changed", patch);
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
            toolbarState={toolbarState}
            commandSignal={commandSignal}
        viewportControlPreset={layoutSettings.viewportControlPreset}
        workspaceOptions={workspaceOptions}
        leftCollapsed={layoutSettings.leftSidebarCollapsed}
        rightCollapsed={layoutSettings.rightSidebarCollapsed}
        onToggleLeftCollapsed={() =>
          setLayoutSettings((current) => {
            const nextCollapsed = !current.leftSidebarCollapsed;
            trackTelemetry("ui.workspace.sidebar.left_toggle", {
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
            trackTelemetry("ui.workspace.sidebar.right_toggle", {
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
