import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type AppRoute = "/login" | "/app";

type TelemetryEvent = {
  id: number;
  name: string;
  route: AppRoute;
  timestamp: string;
};

function resolveRoute(pathname: string): AppRoute {
  return pathname === "/app" ? "/app" : "/login";
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() =>
    resolveRoute(window.location.pathname)
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [events, setEvents] = useState<TelemetryEvent[]>([]);

  const trackEvent = useCallback((name: string, currentRoute: AppRoute) => {
    setEvents((previous) => [
      {
        id: previous.length + 1,
        name,
        route: currentRoute,
        timestamp: new Date().toISOString()
      },
      ...previous
    ]);
  }, []);

  const navigate = useCallback(
    (nextRoute: AppRoute) => {
      window.history.pushState({}, "", nextRoute);
      setRoute(nextRoute);
      trackEvent("route.changed", nextRoute);
    },
    [trackEvent]
  );

  useEffect(() => {
    const normalized = resolveRoute(window.location.pathname);
    if (window.location.pathname !== normalized) {
      window.history.replaceState({}, "", normalized);
    }
    setRoute(normalized);
    trackEvent("route.changed", normalized);

    const onPopState = () => {
      const next = resolveRoute(window.location.pathname);
      setRoute(next);
      trackEvent("route.changed.popstate", next);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [trackEvent]);

  const handleSignIn = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      trackEvent("auth.login_submit", route);

      if (!username.trim() || !password.trim()) {
        trackEvent("auth.login_blocked", route);
        return;
      }

      setIsAuthenticated(true);
      trackEvent("auth.login_success", route);
      navigate("/app");
    },
    [navigate, password, route, trackEvent, username]
  );

  const handleSignOut = useCallback(() => {
    setIsAuthenticated(false);
    trackEvent("auth.logout", route);
    navigate("/login");
  }, [navigate, route, trackEvent]);

  const isMainView = useMemo(
    () => isAuthenticated && route === "/app",
    [isAuthenticated, route]
  );

  return (
    <main className="app-shell">
      <button
        className="debug-toggle"
        type="button"
        onClick={() => setShowDebugPanel((current) => !current)}
      >
        {showDebugPanel ? "Hide debug panel" : "Show debug panel"}
      </button>

      {isMainView ? (
        <section className="card">
          <p className="eyebrow">Aurora Web</p>
          <h1>Aurora Web Workspace</h1>
          <p>
            Login mock succeeded. This is the main view placeholder for the next
            MOCA screens.
          </p>
          <button className="primary-btn" type="button" onClick={handleSignOut}>
            Sign out
          </button>
        </section>
      ) : (
        <section className="card">
          <p className="eyebrow">Aurora Web</p>
          <h1>Sign in to Aurora Web</h1>
          <form className="form-grid" onSubmit={handleSignIn}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />

            <button className="primary-btn" type="submit">
              Sign in
            </button>
          </form>
        </section>
      )}

      {showDebugPanel ? (
        <section className="debug-card" aria-label="debug panel">
          <h2>Debug telemetry</h2>
          <p>Route: {route}</p>
          <ul className="event-list">
            {events.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.name}</strong> @ {entry.route}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
