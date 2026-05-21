import { useEffect, useMemo, useState } from "react";
import { useRef } from "react";
import type { UserRole } from "../../auth/contracts";
import type {
  KeyboardShortcut,
  ToolbarActionKey,
  ToolbarAction,
  ToolbarGroup,
  WorkspaceToolbarState
} from "../roleTopbarPolicy";
import {
  LAYOUT_THEME_OPTIONS,
  type LayoutThemeId
} from "../themeSettings";
import {
  getRoleKeyboardShortcuts,
  getRoleQuickActions,
  getRoleToolbarGroups
} from "../roleTopbarPolicy";

interface WorkspaceTopbarProps {
  isAuthenticated: boolean;
  role?: UserRole;
  toolbarState: WorkspaceToolbarState;
  layoutTheme: LayoutThemeId;
  onLayoutThemeChange: (theme: LayoutThemeId) => void;
  onAction: (actionKey: ToolbarActionKey) => void;
  showDebugPanel: boolean;
  onToggleDebug: () => void;
  onSignOut: () => void;
}

function statusLabel(status: "mvp" | "post_mvp" | "pending_estimate"): string {
  if (status === "mvp") {
    return "MVP";
  }
  if (status === "post_mvp") {
    return "Post-MVP";
  }
  return "Pending";
}

function isActionActive(
  actionKey: ToolbarActionKey,
  toolbarState: WorkspaceToolbarState
): boolean {
  if (toolbarState.lastCommand === actionKey) {
    return true;
  }

  if (
    (toolbarState.selectionMode === "terrain" && actionKey === "select_terrain") ||
    (toolbarState.selectionMode === "object" && actionKey === "select_object")
  ) {
    return true;
  }

  if (
    (toolbarState.selectionScope === "all" && actionKey === "scope_all") ||
    (toolbarState.selectionScope === "creatures" && actionKey === "scope_creatures") ||
    (toolbarState.selectionScope === "doors" && actionKey === "scope_doors") ||
    (toolbarState.selectionScope === "items" && actionKey === "scope_items") ||
    (toolbarState.selectionScope === "placeables" && actionKey === "scope_placeables") ||
    (toolbarState.selectionScope === "sounds" && actionKey === "scope_sounds")
  ) {
    return true;
  }

  if (
    (actionKey === "show_creatures" && toolbarState.visibility.creatures) ||
    (actionKey === "show_doors" && toolbarState.visibility.doors) ||
    (actionKey === "show_items" && toolbarState.visibility.items) ||
    (actionKey === "show_placeables" && toolbarState.visibility.placeables) ||
    (actionKey === "show_sounds" && toolbarState.visibility.sounds)
  ) {
    return true;
  }

  return false;
}

function resolveInitialGroup(groups: ToolbarGroup[]): string | null {
  if (!groups.length) {
    return null;
  }
  return groups[0].key;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true;
  }

  return target.isContentEditable;
}

export function WorkspaceTopbar({
  isAuthenticated,
  role,
  toolbarState,
  layoutTheme,
  onLayoutThemeChange,
  onAction,
  showDebugPanel,
  onToggleDebug,
  onSignOut
}: WorkspaceTopbarProps) {
  const sectionGroups = isAuthenticated && role ? getRoleToolbarGroups(role) : [];
  const quickActions = isAuthenticated && role ? getRoleQuickActions(role) : [];
  const shortcuts = isAuthenticated && role ? getRoleKeyboardShortcuts(role) : [];
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(
    resolveInitialGroup(sectionGroups)
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isQuickOptionsOpen, setIsQuickOptionsOpen] = useState(false);
  const [isLayoutOptionsExpanded, setIsLayoutOptionsExpanded] = useState(true);
  const topbarCenterRef = useRef<HTMLDivElement | null>(null);
  const shortcutsDialogRef = useRef<HTMLDivElement | null>(null);
  const optionsDialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setActiveGroupKey(resolveInitialGroup(sectionGroups));
    setIsDrawerOpen(false);
    setIsShortcutsOpen(false);
    setIsQuickOptionsOpen(false);
    setIsLayoutOptionsExpanded(true);
  }, [role, isAuthenticated, sectionGroups.length]);

  const activeGroup = useMemo(() => {
    if (!activeGroupKey) {
      return sectionGroups[0] ?? null;
    }
    return sectionGroups.find((group) => group.key === activeGroupKey) ?? sectionGroups[0] ?? null;
  }, [activeGroupKey, sectionGroups]);

  useEffect(() => {
    if (!isDrawerOpen) {
      return;
    }

    const handleOutsidePointerDown = (event: MouseEvent) => {
      const current = topbarCenterRef.current;
      if (!current) {
        return;
      }
      if (!current.contains(event.target as Node)) {
        setIsDrawerOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDrawerOpen(false);
      }
    };

    window.addEventListener("mousedown", handleOutsidePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handleOutsidePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isDrawerOpen]);

  useEffect(() => {
    if (!isAuthenticated || !role) {
      return;
    }

    const hasUndo = quickActions.some((action) => action.key === "undo");
    const hasRedo = quickActions.some((action) => action.key === "redo");

    const handleKeyboardShortcuts = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const isMeta = event.ctrlKey || event.metaKey;
      const lowerKey = event.key.toLowerCase();

      if (event.key === "?" && !isMeta && !event.altKey) {
        event.preventDefault();
        setIsShortcutsOpen(true);
        return;
      }

      if (event.key === "Escape") {
        setIsShortcutsOpen(false);
        setIsQuickOptionsOpen(false);
        return;
      }

      if (isMeta && lowerKey === "z" && !event.shiftKey && hasUndo) {
        event.preventDefault();
        onAction("undo");
        return;
      }

      if (
        hasRedo &&
        isMeta &&
        ((lowerKey === "y" && !event.shiftKey) || (lowerKey === "z" && event.shiftKey))
      ) {
        event.preventDefault();
        onAction("redo");
        return;
      }

      if (isMeta && lowerKey === "s") {
        const saveAction = sectionGroups
          .flatMap((group) => group.actions)
          .find((action) => action.key === "save_local_draft" && action.supported);
        if (saveAction) {
          event.preventDefault();
          onAction("save_local_draft");
        }
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcuts);
    return () => window.removeEventListener("keydown", handleKeyboardShortcuts);
  }, [isAuthenticated, onAction, quickActions, role, sectionGroups]);

  useEffect(() => {
    if (!isShortcutsOpen) {
      return;
    }

    shortcutsDialogRef.current?.focus();
  }, [isShortcutsOpen]);

  useEffect(() => {
    if (!isQuickOptionsOpen) {
      return;
    }

    optionsDialogRef.current?.focus();
  }, [isQuickOptionsOpen]);

  const handleGroupToggle = (groupKey: string) => {
    if (activeGroupKey === groupKey) {
      setIsDrawerOpen((current) => !current);
      return;
    }
    setActiveGroupKey(groupKey);
    setIsDrawerOpen(true);
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <p className="topbar-brand">Aurora Web</p>
        {quickActions.length ? (
          <div className="topbar-quick-actions" aria-label="quick actions">
            {quickActions.map((action: ToolbarAction) => (
              <button
                key={action.key}
                type="button"
                className={`topbar-btn ${isActionActive(action.key, toolbarState) ? "is-active" : ""}`}
                onClick={() => onAction(action.key)}
                title={`${action.label} (${statusLabel(action.status)})`}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {sectionGroups.length > 0 ? (
        <div className="topbar-center-wrap" ref={topbarCenterRef}>
          <span className="topbar-major-separator" aria-hidden="true" />
          <div className="topbar-center">
          <nav className="topbar-nav" aria-label="workspace sections">
            {sectionGroups.map((group) => (
              <button
                key={group.key}
                type="button"
                className={`topbar-group-tab ${activeGroup?.key === group.key ? "is-active" : ""}`}
                onClick={() => handleGroupToggle(group.key)}
                onMouseEnter={() => {
                  if (isDrawerOpen) {
                    setActiveGroupKey(group.key);
                  }
                }}
                aria-expanded={activeGroup?.key === group.key && isDrawerOpen}
                aria-controls="workspace-toolbar-drawer"
              >
                {group.label}
              </button>
            ))}
          </nav>
          {activeGroup && isDrawerOpen ? (
            <section
              className="topbar-drawer"
              aria-label={`${activeGroup.label} commands`}
              id="workspace-toolbar-drawer"
            >
              <header className="topbar-drawer-header">
                <span>{activeGroup.label} Commands</span>
              </header>
              <div className="topbar-nav-buttons">
                {activeGroup.actions.map((action) => (
                  <button
                    className={`topbar-nav-btn ${isActionActive(action.key, toolbarState) ? "is-active" : ""}`}
                    type="button"
                    key={action.key}
                    onClick={() => {
                      onAction(action.key);
                      setIsDrawerOpen(false);
                    }}
                    disabled={!action.supported}
                    title={`${action.label} (${statusLabel(action.status)})`}
                  >
                    <span>{action.label}</span>
                    <span className={`toolbar-status toolbar-status-${action.status}`}>
                      {statusLabel(action.status)}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
          </div>
        </div>
      ) : null}

      <div className="topbar-actions" data-testid="topbar-actions">
        {isAuthenticated ? (
          <>
            <button
              className="topbar-btn"
              type="button"
              onClick={() => setIsShortcutsOpen(true)}
            >
              Shortcuts
            </button>
            <button className="topbar-btn" type="button" onClick={onToggleDebug}>
              {showDebugPanel ? "Hide debug panel" : "Show debug panel"}
            </button>
            <button
              className="topbar-btn"
              type="button"
              aria-label="Open quick options"
              aria-haspopup="dialog"
              aria-expanded={isQuickOptionsOpen}
              onClick={() => setIsQuickOptionsOpen((current) => !current)}
              title="Options"
            >
              Options
            </button>
            <button className="topbar-btn" type="button" onClick={onSignOut}>
              Sign out
            </button>
          </>
        ) : null}
      </div>

      {isQuickOptionsOpen ? (
        <section
          className="options-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsQuickOptionsOpen(false);
            }
          }}
        >
          <article
            className="options-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Quick options"
            tabIndex={-1}
            ref={optionsDialogRef}
          >
            <header className="options-dialog-header">
              <h2>Options</h2>
              <button
                type="button"
                className="topbar-btn"
                onClick={() => setIsQuickOptionsOpen(false)}
              >
                Close
              </button>
            </header>

            <details
              className="topbar-options-section"
              open={isLayoutOptionsExpanded}
              role="group"
              aria-label="Layout"
              onToggle={(event) =>
                setIsLayoutOptionsExpanded((event.currentTarget as HTMLDetailsElement).open)
              }
            >
              <summary className="topbar-options-summary">
                <span>Layout</span>
                <span className="topbar-options-summary-right">
                  <span className="topbar-options-summary-state">
                    {isLayoutOptionsExpanded ? "Expanded" : "Collapsed"}
                  </span>
                  <span
                    className={`topbar-options-chevron ${isLayoutOptionsExpanded ? "is-open" : ""}`}
                    aria-hidden="true"
                  >
                    v
                  </span>
                </span>
              </summary>
              <div className="topbar-options-content">
                <label className="topbar-options-label" htmlFor="app-style-select">
                  App style
                </label>
                <select
                  id="app-style-select"
                  className="topbar-options-select"
                  value={layoutTheme}
                  onChange={(event) => onLayoutThemeChange(event.target.value as LayoutThemeId)}
                >
                  {LAYOUT_THEME_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </details>
          </article>
        </section>
      ) : null}

      {isShortcutsOpen ? (
        <section
          className="shortcuts-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsShortcutsOpen(false);
            }
          }}
        >
          <article
            className="shortcuts-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-title"
            tabIndex={-1}
            ref={shortcutsDialogRef}
          >
            <header className="shortcuts-header">
              <h2 id="shortcuts-title">Keyboard Shortcuts</h2>
              <button
                type="button"
                className="topbar-btn"
                onClick={() => setIsShortcutsOpen(false)}
              >
                Close
              </button>
            </header>
            <ul className="shortcuts-list">
              {shortcuts.map((shortcut: KeyboardShortcut) => (
                <li key={shortcut.key + shortcut.description}>
                  <kbd>{shortcut.key}</kbd>
                  <span>{shortcut.description}</span>
                </li>
              ))}
            </ul>
          </article>
        </section>
      ) : null}
    </header>
  );
}

