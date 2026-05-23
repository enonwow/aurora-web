import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UserRole } from "../../auth/contracts";
import type {
  KeyboardShortcut,
  ToolbarActionKey,
  ToolbarAction,
  ToolbarGroup,
  WorkspaceToolbarState
} from "../application/workspaceChromeFacade";
import {
  LAYOUT_THEME_OPTIONS,
  type LayoutThemeId,
  type SelectionBoxMode,
  type WorkspaceOptionSettings
} from "../application/layoutPreferencesFacade";
import { createWorkspaceChromeFacade } from "../application/workspaceChromeFacade";
import { createWorkspaceTopbarActionStateFacade } from "../application/workspaceTopbarActionStateFacade";

const workspaceChromeFacade = createWorkspaceChromeFacade();
const workspaceTopbarActionStateFacade = createWorkspaceTopbarActionStateFacade();

interface WorkspaceTopbarProps {
  isAuthenticated: boolean;
  role?: UserRole;
  toolbarState: WorkspaceToolbarState;
  layoutTheme: LayoutThemeId;
  onLayoutThemeChange: (theme: LayoutThemeId) => void;
  workspaceOptions: WorkspaceOptionSettings;
  onWorkspaceOptionsChange: (patch: Partial<WorkspaceOptionSettings>) => void;
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

const CANVAS_STATUS_OPTIONS: Array<{
  value: WorkspaceToolbarState["canvasDebug"]["statusMap"];
  label: string;
  actionKey: ToolbarActionKey;
}> = [
  { value: "off", label: "Off", actionKey: "debug_status_map_off" },
  { value: "placeables", label: "Placeables", actionKey: "debug_status_map_placeables" },
  { value: "doors", label: "Doors", actionKey: "debug_status_map_doors" },
  { value: "creatures", label: "Creatures", actionKey: "debug_status_map_creatures" },
  { value: "items", label: "Items", actionKey: "debug_status_map_items" },
  { value: "sounds", label: "Sounds", actionKey: "debug_status_map_sounds" },
  { value: "all", label: "All", actionKey: "debug_status_map_all" }
];

const CANVAS_TEXTURE_OPTIONS: Array<{
  value: WorkspaceToolbarState["canvasDebug"]["textureCompression"];
  label: string;
  actionKey: ToolbarActionKey;
}> = [
  { value: "none", label: "None", actionKey: "debug_texture_compression_none" },
  { value: "etc1s", label: "ETC1S", actionKey: "debug_texture_compression_etc1s" },
  { value: "uastc", label: "UASTC", actionKey: "debug_texture_compression_uastc" }
];

export function WorkspaceTopbar({
  isAuthenticated,
  role,
  toolbarState,
  layoutTheme,
  onLayoutThemeChange,
  workspaceOptions,
  onWorkspaceOptionsChange,
  onAction,
  showDebugPanel,
  onToggleDebug,
  onSignOut
}: WorkspaceTopbarProps) {
  const sectionGroups =
    isAuthenticated && role ? workspaceChromeFacade.getRoleToolbarGroups(role) : [];
  const quickActions =
    isAuthenticated && role ? workspaceChromeFacade.getRoleQuickActions(role) : [];
  const baseShortcuts =
    isAuthenticated && role ? workspaceChromeFacade.getRoleKeyboardShortcuts(role) : [];
  const shortcuts = useMemo(() => {
    if (!isAuthenticated || !role) {
      return [];
    }

    const viewportShortcuts: KeyboardShortcut[] = [
      { key: "MMB", description: "Rotate camera." },
      { key: "Ctrl + RMB", description: "Pan camera." },
      { key: "RMB on object", description: "Open object context menu." },
      { key: "Wheel", description: "Zoom camera." }
    ];
    const canvasWorkflowShortcuts: KeyboardShortcut[] = [
      { key: "Canvas menu", description: "Gizmo / snap / lock / isolate / debug toggles." },
      { key: "Ctrl/Cmd + C then Ctrl/Cmd + V", description: "Copy selected object(s)." },
      { key: "Del / Backspace", description: "Delete selected objects (unlocked layers only)." }
    ];

    return [
      ...baseShortcuts,
      ...viewportShortcuts,
      ...canvasWorkflowShortcuts
    ];
  }, [baseShortcuts, isAuthenticated, role]);
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

  const updateNumberOption = useCallback(
    (key: keyof WorkspaceOptionSettings, rawValue: string) => {
      const parsed = Number(rawValue);
      if (!Number.isFinite(parsed)) {
        return;
      }
      onWorkspaceOptionsChange({ [key]: parsed } as Partial<WorkspaceOptionSettings>);
    },
    [onWorkspaceOptionsChange]
  );

  const canvasActionMap = useMemo(() => {
    if (!activeGroup || activeGroup.key !== "canvas") {
      return null;
    }
    return new Map(activeGroup.actions.map((action) => [action.key, action]));
  }, [activeGroup]);

  const renderCanvasActionButton = useCallback(
    (actionKey: ToolbarActionKey, shortLabel?: string) => {
      const action = canvasActionMap?.get(actionKey);
      if (!action) {
        return null;
      }

      return (
        <button
          className={`topbar-nav-btn topbar-nav-btn-compact ${
            workspaceTopbarActionStateFacade.isActionActive(action.key, toolbarState)
              ? "is-active"
              : ""
          }`}
          type="button"
          key={action.key}
          onClick={() => onAction(action.key)}
          disabled={!action.supported}
          title={action.label}
        >
          <span>{shortLabel ?? action.label}</span>
        </button>
      );
    },
    [canvasActionMap, onAction, toolbarState]
  );

  const renderCanvasDrawer = () => (
    <section className="canvas-drawer-layout" aria-label="canvas compact commands">
      <section className="canvas-drawer-group">
        <h3>Transform</h3>
        <div className="topbar-nav-buttons topbar-nav-buttons-compact">
          {renderCanvasActionButton("canvas_gizmo_translate", "Move (W)")}
          {renderCanvasActionButton("canvas_gizmo_rotate", "Rotate (E)")}
          {renderCanvasActionButton("canvas_gizmo_scale", "Scale (R)")}
          {renderCanvasActionButton("snap_grid_toggle", "Snap Grid")}
          {renderCanvasActionButton("snap_angle_toggle", "Snap Angle")}
          {renderCanvasActionButton("snap_height_toggle", "Snap Height")}
        </div>
      </section>

      <section className="canvas-drawer-group">
        <h3>Layers</h3>
        <div className="topbar-nav-buttons topbar-nav-buttons-compact">
          {renderCanvasActionButton("lock_placeables", "Lock PLC")}
          {renderCanvasActionButton("lock_creatures", "Lock CRT")}
          {renderCanvasActionButton("lock_doors", "Lock DOR")}
          {renderCanvasActionButton("lock_items", "Lock ITM")}
          {renderCanvasActionButton("lock_sounds", "Lock SND")}
          {renderCanvasActionButton("unlock_all_layers", "Unlock All")}
        </div>
        <div className="topbar-nav-buttons topbar-nav-buttons-compact">
          {renderCanvasActionButton("isolate_placeables", "Iso PLC")}
          {renderCanvasActionButton("isolate_creatures", "Iso CRT")}
          {renderCanvasActionButton("isolate_doors", "Iso DOR")}
          {renderCanvasActionButton("isolate_items", "Iso ITM")}
          {renderCanvasActionButton("isolate_sounds", "Iso SND")}
          {renderCanvasActionButton("clear_isolation", "Clear Iso")}
        </div>
      </section>

      <section className="canvas-drawer-group">
        <h3>Selection</h3>
        <div className="topbar-nav-buttons topbar-nav-buttons-compact">
          {renderCanvasActionButton("select_same_resref", "Same ResRef")}
          {renderCanvasActionButton("select_invert", "Invert")}
          {renderCanvasActionButton("select_radius", "In Radius")}
          {renderCanvasActionButton("copy_selected_objects", "Copy Sel")}
          {renderCanvasActionButton("delete_selected_objects", "Delete Sel")}
          {renderCanvasActionButton("camera_bookmark_save_1", "Save #1")}
          {renderCanvasActionButton("camera_bookmark_load_1", "Load #1")}
        </div>
      </section>

      <section className="canvas-drawer-group">
        <h3>Display</h3>
        <div className="topbar-nav-buttons topbar-nav-buttons-compact">
          {renderCanvasActionButton("debug_wireframe", "Wireframe")}
          {renderCanvasActionButton("debug_textures", "Textures")}
          {renderCanvasActionButton("debug_grid", "Grid")}
          {renderCanvasActionButton("debug_axes", "Axes")}
          {renderCanvasActionButton("debug_bounds", "Bounds")}
          {renderCanvasActionButton("debug_hidden_meshes", "Hidden")}
          {renderCanvasActionButton("debug_show_non_render_meshes", "Non-render")}
        </div>
      </section>

      <section className="canvas-drawer-group canvas-drawer-group-inline">
        <h3>Status Map</h3>
        <select
          className="topbar-nav-select"
          aria-label="Status map"
          value={toolbarState.canvasDebug.statusMap}
          onChange={(event) => {
            const option = CANVAS_STATUS_OPTIONS.find(
              (entry) => entry.value === event.target.value
            );
            if (option) {
              onAction(option.actionKey);
            }
          }}
        >
          {CANVAS_STATUS_OPTIONS.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {entry.label}
            </option>
          ))}
        </select>
      </section>

      <section className="canvas-drawer-group canvas-drawer-group-inline">
        <h3>Texture Mode</h3>
        <select
          className="topbar-nav-select"
          aria-label="Texture mode"
          value={toolbarState.canvasDebug.textureCompression}
          onChange={(event) => {
            const option = CANVAS_TEXTURE_OPTIONS.find(
              (entry) => entry.value === event.target.value
            );
            if (option) {
              onAction(option.actionKey);
            }
          }}
        >
          {CANVAS_TEXTURE_OPTIONS.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {entry.label}
            </option>
          ))}
        </select>
      </section>

      <details className="canvas-drawer-advanced">
        <summary>Advanced Debug</summary>
        <div className="topbar-nav-buttons topbar-nav-buttons-compact">
          {renderCanvasActionButton("debug_chunks", "Chunk Bounds")}
          {renderCanvasActionButton("debug_object_labels", "Object Labels")}
          {renderCanvasActionButton("debug_perf_hud", "Perf HUD")}
          {renderCanvasActionButton("debug_walkmesh_overlay", "Walkmesh")}
          {renderCanvasActionButton("debug_collision_overlay", "Collision")}
          {renderCanvasActionButton("debug_controls_hint", "Controls Hint")}
          {renderCanvasActionButton("debug_runtime_hud", "Runtime Popup")}
          {renderCanvasActionButton("debug_export_status_report", "Export Report")}
        </div>
      </details>
    </section>
  );

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
                className={`topbar-btn ${
                  workspaceTopbarActionStateFacade.isActionActive(action.key, toolbarState)
                    ? "is-active"
                    : ""
                }`}
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
              <span key={group.key} className="topbar-nav-entry">
                {group.key === "canvas" ? (
                  <span className="topbar-nav-separator" aria-hidden="true" />
                ) : null}
                <button
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
              </span>
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
              {activeGroup.key === "canvas" ? (
                renderCanvasDrawer()
              ) : (
                <div className="topbar-nav-buttons">
                  {activeGroup.actions.map((action) => (
                    <button
                      className={`topbar-nav-btn ${
                        workspaceTopbarActionStateFacade.isActionActive(action.key, toolbarState)
                          ? "is-active"
                          : ""
                      }`}
                      type="button"
                      key={action.key}
                      onClick={() => onAction(action.key)}
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
              )}
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

            <details className="topbar-options-section" open role="group" aria-label="Viewport controls">
              <summary className="topbar-options-summary">
                <span>Viewport</span>
              </summary>
              <div className="topbar-options-content">
                <label className="topbar-options-label" htmlFor="camera-rotate-speed">
                  Camera rotate speed
                </label>
                <input
                  id="camera-rotate-speed"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="4"
                  className="topbar-options-select"
                  value={workspaceOptions.cameraRotateSpeed}
                  onChange={(event) => updateNumberOption("cameraRotateSpeed", event.target.value)}
                />

                <label className="topbar-options-label" htmlFor="camera-zoom-speed">
                  Camera zoom speed
                </label>
                <input
                  id="camera-zoom-speed"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="4"
                  className="topbar-options-select"
                  value={workspaceOptions.cameraZoomSpeed}
                  onChange={(event) => updateNumberOption("cameraZoomSpeed", event.target.value)}
                />

                <label className="topbar-options-label" htmlFor="camera-pan-speed">
                  Camera pan speed
                </label>
                <input
                  id="camera-pan-speed"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="4"
                  className="topbar-options-select"
                  value={workspaceOptions.cameraPanSpeed}
                  onChange={(event) => updateNumberOption("cameraPanSpeed", event.target.value)}
                />

                <label className="topbar-options-label" htmlFor="camera-damping-factor">
                  Camera damping
                </label>
                <input
                  id="camera-damping-factor"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="0.35"
                  className="topbar-options-select"
                  value={workspaceOptions.cameraDampingFactor}
                  onChange={(event) => updateNumberOption("cameraDampingFactor", event.target.value)}
                />
              </div>
            </details>

            <details className="topbar-options-section" open role="group" aria-label="Snap and selection">
              <summary className="topbar-options-summary">
                <span>Snap & Selection</span>
              </summary>
              <div className="topbar-options-content">
                <label className="topbar-options-label" htmlFor="snap-grid-step">
                  Grid step
                </label>
                <input
                  id="snap-grid-step"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="8"
                  className="topbar-options-select"
                  value={workspaceOptions.snapGridStep}
                  onChange={(event) => updateNumberOption("snapGridStep", event.target.value)}
                />

                <label className="topbar-options-label" htmlFor="snap-angle-step">
                  Angle step
                </label>
                <input
                  id="snap-angle-step"
                  type="number"
                  step="1"
                  min="1"
                  max="180"
                  className="topbar-options-select"
                  value={workspaceOptions.snapAngleStepDeg}
                  onChange={(event) => updateNumberOption("snapAngleStepDeg", event.target.value)}
                />

                <label className="topbar-options-label" htmlFor="snap-height-step">
                  Height step
                </label>
                <input
                  id="snap-height-step"
                  type="number"
                  step="0.05"
                  min="0.05"
                  max="8"
                  className="topbar-options-select"
                  value={workspaceOptions.snapHeightStep}
                  onChange={(event) => updateNumberOption("snapHeightStep", event.target.value)}
                />

                <label className="topbar-options-label" htmlFor="selection-box-mode">
                  Selection box mode
                </label>
                <select
                  id="selection-box-mode"
                  className="topbar-options-select"
                  value={workspaceOptions.selectionBoxMode}
                  onChange={(event) =>
                    onWorkspaceOptionsChange({
                      selectionBoxMode: event.target.value as SelectionBoxMode
                    })
                  }
                >
                  <option value="replace">replace</option>
                  <option value="add">add</option>
                  <option value="subtract">subtract</option>
                  <option value="intersect">intersect</option>
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


