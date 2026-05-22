import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  VIEWPORT_CONTROL_OPTIONS,
  type ViewportControlPresetId
} from "../viewportControlSettings";
import type {
  WorkspaceOptionSettings,
  SelectionBoxMode
} from "../workspaceOptionSettings";
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
  viewportControlPreset: ViewportControlPresetId;
  onViewportControlPresetChange: (
    preset: ViewportControlPresetId
  ) => void;
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

  if (
    actionKey === "show_none" &&
    !toolbarState.visibility.creatures &&
    !toolbarState.visibility.doors &&
    !toolbarState.visibility.items &&
    !toolbarState.visibility.placeables &&
    !toolbarState.visibility.sounds
  ) {
    return true;
  }

  if (
    (actionKey === "debug_wireframe" && toolbarState.canvasDebug.wireframe) ||
    (actionKey === "debug_textures" && toolbarState.canvasDebug.textures) ||
    (actionKey === "debug_grid" && toolbarState.canvasDebug.grid) ||
    (actionKey === "debug_axes" && toolbarState.canvasDebug.axes) ||
    (actionKey === "debug_bounds" && toolbarState.canvasDebug.bounds) ||
    (actionKey === "debug_hidden_meshes" && toolbarState.canvasDebug.hiddenMeshes) ||
    (actionKey === "debug_show_non_render_meshes" &&
      toolbarState.canvasDebug.showNonRenderMeshes)
  ) {
    return true;
  }

  if (
    (actionKey === "debug_status_map_off" && toolbarState.canvasDebug.statusMap === "off") ||
    (actionKey === "debug_status_map_placeables" &&
      toolbarState.canvasDebug.statusMap === "placeables") ||
    (actionKey === "debug_status_map_doors" &&
      toolbarState.canvasDebug.statusMap === "doors") ||
    (actionKey === "debug_status_map_creatures" &&
      toolbarState.canvasDebug.statusMap === "creatures") ||
    (actionKey === "debug_status_map_items" &&
      toolbarState.canvasDebug.statusMap === "items") ||
    (actionKey === "debug_status_map_sounds" &&
      toolbarState.canvasDebug.statusMap === "sounds") ||
    (actionKey === "debug_status_map_all" && toolbarState.canvasDebug.statusMap === "all")
  ) {
    return true;
  }

  if (
    (actionKey === "debug_texture_compression_none" &&
      toolbarState.canvasDebug.textureCompression === "none") ||
    (actionKey === "debug_texture_compression_etc1s" &&
      toolbarState.canvasDebug.textureCompression === "etc1s") ||
    (actionKey === "debug_texture_compression_uastc" &&
      toolbarState.canvasDebug.textureCompression === "uastc")
  ) {
    return true;
  }

  if (
    (actionKey === "canvas_gizmo_translate" &&
      toolbarState.canvasDebug.gizmoMode === "translate") ||
    (actionKey === "canvas_gizmo_rotate" &&
      toolbarState.canvasDebug.gizmoMode === "rotate") ||
    (actionKey === "canvas_gizmo_scale" &&
      toolbarState.canvasDebug.gizmoMode === "scale")
  ) {
    return true;
  }

  if (
    (actionKey === "snap_grid_toggle" && toolbarState.canvasDebug.snapGrid) ||
    (actionKey === "snap_angle_toggle" && toolbarState.canvasDebug.snapAngle) ||
    (actionKey === "snap_height_toggle" && toolbarState.canvasDebug.snapHeight)
  ) {
    return true;
  }

  if (
    (actionKey === "lock_creatures" && toolbarState.canvasDebug.lockedKinds.creatures) ||
    (actionKey === "lock_doors" && toolbarState.canvasDebug.lockedKinds.doors) ||
    (actionKey === "lock_items" && toolbarState.canvasDebug.lockedKinds.items) ||
    (actionKey === "lock_placeables" && toolbarState.canvasDebug.lockedKinds.placeables) ||
    (actionKey === "lock_sounds" && toolbarState.canvasDebug.lockedKinds.sounds)
  ) {
    return true;
  }

  if (
    (actionKey === "isolate_creatures" && toolbarState.canvasDebug.isolateKind === "creatures") ||
    (actionKey === "isolate_doors" && toolbarState.canvasDebug.isolateKind === "doors") ||
    (actionKey === "isolate_items" && toolbarState.canvasDebug.isolateKind === "items") ||
    (actionKey === "isolate_placeables" && toolbarState.canvasDebug.isolateKind === "placeables") ||
    (actionKey === "isolate_sounds" && toolbarState.canvasDebug.isolateKind === "sounds")
  ) {
    return true;
  }

  if (
    actionKey === "unlock_all_layers" &&
    !toolbarState.canvasDebug.lockedKinds.creatures &&
    !toolbarState.canvasDebug.lockedKinds.doors &&
    !toolbarState.canvasDebug.lockedKinds.items &&
    !toolbarState.canvasDebug.lockedKinds.placeables &&
    !toolbarState.canvasDebug.lockedKinds.sounds
  ) {
    return true;
  }

  if (actionKey === "clear_isolation" && toolbarState.canvasDebug.isolateKind === "none") {
    return true;
  }

  if (
    (actionKey === "debug_chunks" && toolbarState.canvasDebug.chunkBounds) ||
    (actionKey === "debug_object_labels" && toolbarState.canvasDebug.objectLabels) ||
    (actionKey === "debug_perf_hud" && toolbarState.canvasDebug.perfHud) ||
    (actionKey === "debug_controls_hint" && toolbarState.canvasDebug.controlsHint) ||
    (actionKey === "debug_runtime_hud" && toolbarState.canvasDebug.runtimeHud) ||
    (actionKey === "debug_walkmesh_overlay" &&
      toolbarState.canvasDebug.walkmeshOverlay) ||
    (actionKey === "debug_collision_overlay" &&
      toolbarState.canvasDebug.collisionOverlay)
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
  viewportControlPreset,
  onViewportControlPresetChange,
  workspaceOptions,
  onWorkspaceOptionsChange,
  onAction,
  showDebugPanel,
  onToggleDebug,
  onSignOut
}: WorkspaceTopbarProps) {
  const sectionGroups = isAuthenticated && role ? getRoleToolbarGroups(role) : [];
  const quickActions = isAuthenticated && role ? getRoleQuickActions(role) : [];
  const baseShortcuts = isAuthenticated && role ? getRoleKeyboardShortcuts(role) : [];
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
      { key: "Del / Backspace", description: "Delete selected objects (unlocked layers only)." }
    ];

    if (viewportControlPreset !== "blender-viewport") {
      return [...baseShortcuts, ...viewportShortcuts, ...canvasWorkflowShortcuts];
    }

    return [
      ...baseShortcuts,
      ...viewportShortcuts,
      ...canvasWorkflowShortcuts,
      { key: "Shift + A", description: "Arm add-object placement on canvas." },
      { key: "F", description: "Focus camera on selected object/tile." },
      { key: "Esc", description: "Cancel add-object placement mode." }
    ];
  }, [baseShortcuts, isAuthenticated, role, viewportControlPreset]);
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
              <div className="topbar-nav-buttons">
                {activeGroup.actions.map((action) => (
                  <button
                    className={`topbar-nav-btn ${isActionActive(action.key, toolbarState) ? "is-active" : ""}`}
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
                <span>Viewport Controls</span>
              </summary>
              <div className="topbar-options-content">
                <label className="topbar-options-label" htmlFor="viewport-control-select">
                  Control scheme
                </label>
                <select
                  id="viewport-control-select"
                  className="topbar-options-select"
                  value={viewportControlPreset}
                  onChange={(event) =>
                    onViewportControlPresetChange(
                      event.target.value as ViewportControlPresetId
                    )
                  }
                >
                  {VIEWPORT_CONTROL_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>

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

            <details className="topbar-options-section" open role="group" aria-label="Autosave">
              <summary className="topbar-options-summary">
                <span>Local Autosave</span>
              </summary>
              <div className="topbar-options-content">
                <label className="topbar-options-checkbox" htmlFor="autosave-enabled">
                  <input
                    id="autosave-enabled"
                    type="checkbox"
                    checked={workspaceOptions.autosaveEnabled}
                    onChange={(event) =>
                      onWorkspaceOptionsChange({ autosaveEnabled: event.target.checked })
                    }
                  />
                  Autosave enabled
                </label>

                <label className="topbar-options-label" htmlFor="autosave-interval-sec">
                  Autosave interval
                </label>
                <input
                  id="autosave-interval-sec"
                  type="number"
                  step="1"
                  min="10"
                  max="600"
                  className="topbar-options-select"
                  value={workspaceOptions.autosaveIntervalSec}
                  onChange={(event) => updateNumberOption("autosaveIntervalSec", event.target.value)}
                />

                <label className="topbar-options-label" htmlFor="autosave-max-entries">
                  Autosave max entries
                </label>
                <input
                  id="autosave-max-entries"
                  type="number"
                  step="1"
                  min="1"
                  max="100"
                  className="topbar-options-select"
                  value={workspaceOptions.autosaveMaxEntries}
                  onChange={(event) => updateNumberOption("autosaveMaxEntries", event.target.value)}
                />
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


