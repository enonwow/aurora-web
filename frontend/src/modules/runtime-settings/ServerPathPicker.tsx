import { useEffect, useId, useState } from "react";
import {
  browseRuntimePath,
  type RuntimePathBrowserResult,
  type RuntimePathBrowserScope
} from "./runtimePathOnboardingApi";

interface ServerPathPickerProps {
  accessToken: string;
  scope: RuntimePathBrowserScope;
  selectionKind: "directory" | "file";
  value: string;
  onChange(value: string): void;
  fallbackPath?: string;
  inputId?: string;
  ariaLabel?: string;
  placeholder?: string;
  issue?: string;
}

export function ServerPathPicker({
  accessToken,
  scope,
  selectionKind,
  value,
  onChange,
  fallbackPath = "",
  inputId,
  ariaLabel,
  placeholder,
  issue
}: ServerPathPickerProps) {
  const generatedId = useId();
  const resolvedInputId = inputId ?? `server-path-${generatedId}`;
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [browser, setBrowser] = useState<RuntimePathBrowserResult | null>(null);
  const [browserError, setBrowserError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  const loadPath = async (path: string, retryPath = "") => {
    setIsLoading(true);
    setBrowserError(null);
    try {
      setBrowser(await browseRuntimePath(accessToken, scope, path));
    } catch (cause) {
      if (retryPath && retryPath.trim() !== path.trim()) {
        try {
          setBrowser(await browseRuntimePath(accessToken, scope, retryPath));
          setBrowserError(
            "The current value is not browsable. Showing the nearest configured root."
          );
          return;
        } catch {
          // Report the original error below because it describes the entered value.
        }
      }
      setBrowserError(
        cause instanceof Error ? cause.message : "The server path could not be opened."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const openBrowser = () => {
    setIsOpen(true);
    setBrowser(null);
    void loadPath(value.trim() || fallbackPath.trim(), fallbackPath.trim());
  };

  const selectPath = (path: string) => {
    onChange(path);
    setIsOpen(false);
  };

  return (
    <>
      <div className={`server-path-picker${issue ? " has-error" : ""}`}>
        <input
          id={resolvedInputId}
          aria-label={ariaLabel}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          className="secondary-btn server-path-browse-btn"
          type="button"
          onClick={openBrowser}
        >
          Browse
        </button>
      </div>
      {issue ? <p className="server-path-inline-issue">{issue}</p> : null}
      {isOpen ? (
        <div
          className="server-path-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <section
            className="server-path-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${resolvedInputId}-dialog-title`}
          >
            <header className="server-path-dialog-header">
              <div>
                <p className="eyebrow">Server filesystem</p>
                <h2 id={`${resolvedInputId}-dialog-title`}>
                  Select {selectionKind === "directory" ? "a directory" : "a .mod file"}
                </h2>
              </div>
              <button
                className="secondary-btn"
                type="button"
                aria-label="Close path browser"
                onClick={() => setIsOpen(false)}
              >
                Close
              </button>
            </header>

            {browser?.roots.length ? (
              <nav className="server-path-roots" aria-label="Available server roots">
                {browser.roots.map((root) => (
                  <button
                    key={`${root.id}:${root.path}`}
                    className="secondary-btn"
                    type="button"
                    disabled={!root.available || isLoading}
                    title={root.available ? root.path : "Mount is not available to the backend"}
                    onClick={() => void loadPath(root.path)}
                  >
                    {root.label}
                  </button>
                ))}
              </nav>
            ) : null}

            <div className="server-path-location">
              <button
                className="secondary-btn"
                type="button"
                disabled={!browser?.parentPath || isLoading}
                aria-label="Open parent directory"
                onClick={() => {
                  if (browser?.parentPath) {
                    void loadPath(browser.parentPath);
                  }
                }}
              >
                Up
              </button>
              <code title={browser?.currentPath}>
                {browser?.currentPath || "Loading server path..."}
              </code>
            </div>

            {browserError ? (
              <p className="server-path-browser-message error-text">{browserError}</p>
            ) : null}
            {isLoading ? (
              <p className="server-path-browser-message">Loading directories...</p>
            ) : null}

            {!isLoading && browser ? (
              <div className="server-path-entry-list" role="list">
                {browser.entries.length === 0 ? (
                  <p className="server-path-browser-message">
                    No matching directories or files are available here.
                  </p>
                ) : (
                  browser.entries.map((entry) => (
                    <div
                      className="server-path-entry"
                      role="listitem"
                      key={`${entry.kind}:${entry.path}`}
                    >
                      <button
                        className="server-path-entry-open"
                        type="button"
                        title={entry.path}
                        onClick={() => {
                          if (entry.kind === "directory") {
                            void loadPath(entry.path);
                          } else {
                            selectPath(entry.path);
                          }
                        }}
                      >
                        <span aria-hidden="true">
                          {entry.kind === "directory" ? "📁" : "📄"}
                        </span>
                        <span>{entry.name}</span>
                      </button>
                      {entry.kind === "directory" &&
                      selectionKind === "directory" &&
                      entry.selectable ? (
                        <button
                          className="secondary-btn"
                          type="button"
                          onClick={() => selectPath(entry.path)}
                        >
                          Select
                        </button>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            ) : null}

            {browser?.truncated ? (
              <p className="server-path-browser-message">
                Only the first 500 matching entries are shown.
              </p>
            ) : null}

            <footer className="server-path-dialog-footer">
              <p>
                This browser can only see paths available to the backend. You can still
                enter a different real host path manually.
              </p>
              {selectionKind === "directory" && browser ? (
                <button
                  className="primary-btn"
                  type="button"
                  onClick={() => selectPath(browser.currentPath)}
                >
                  Use this directory
                </button>
              ) : null}
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
