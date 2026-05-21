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
  const [events, setEvents] = useState<TelemetryEvent[]>(() => getTelemetryEvents());

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
        setSession(authResult.session);
        setAuthorization(authz);
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
    trackTelemetry("ui.auth.logout", { route });
    navigate("/login");
  }, [authFacade, navigate, route, session]);

  const benchmarkSamples = getAuthBenchmarks();
  const authDurations = benchmarkSamples
    .filter((sample) => sample.operation === "authenticate")
    .map((sample) => sample.durationMs);
  const authzDurations = benchmarkSamples
    .filter((sample) => sample.operation === "authorize")
    .map((sample) => sample.durationMs);

  return (
    <main className="app-shell">
      <WorkspaceTopbar
        isAuthenticated={isMainView}
        role={currentRole}
        showDebugPanel={showDebugPanel}
        onToggleDebug={() => setShowDebugPanel((current) => !current)}
        onSignOut={handleSignOut}
      />

      <section className="page-content">
        {isMainView ? (
          <section className="card">
            <h1>Aurora Web Workspace</h1>
            <p>
              Logged as <strong>{session?.user.displayName}</strong> (
              {authorization?.role}).
            </p>
            <p>Permissions:</p>
            <ul>
              {authorization?.permissions.map((permission) => (
                <li key={permission}>{permission}</li>
              ))}
            </ul>
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

              <button className="primary-btn" type="submit" disabled={isSigningIn}>
                {isSigningIn ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </section>
        )}
      </section>

      {isMainView && showDebugPanel ? (
        <section className="debug-card" aria-label="debug panel">
          <h2>Debug telemetry</h2>
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
        </section>
      ) : null}
    </main>
  );
}
