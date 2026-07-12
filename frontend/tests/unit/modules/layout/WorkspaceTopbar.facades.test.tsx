import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceTopbar } from "../../../../src/modules/layout/components/WorkspaceTopbar";
import {
  createWorkspaceChromeFacade,
  type KeyboardShortcut,
  type RoleWorkspacePanels,
  type ToolbarAction,
  type ToolbarGroup,
  type WorkspaceChromeFacade,
  type WorkspaceToolbarState
} from "../../../../src/modules/layout/application/workspaceChromeFacade";
import type { WorkspaceTopbarActionStateFacade } from "../../../../src/modules/layout/application/workspaceTopbarActionStateFacade";
import {
  DEFAULT_LAYOUT_THEME,
  DEFAULT_WORKSPACE_OPTION_SETTINGS
} from "../../../../src/modules/layout/application/layoutPreferencesFacade";

function createChromeFacadeMock(options?: {
  groups?: ToolbarGroup[];
  quickActions?: ToolbarAction[];
  shortcuts?: KeyboardShortcut[];
}): WorkspaceChromeFacade {
  const base = createWorkspaceChromeFacade();
  const emptyPanels: RoleWorkspacePanels = { left: [], right: [] };

  return {
    ...base,
    getRoleToolbarGroups: vi.fn(() => options?.groups ?? []),
    getRoleQuickActions: vi.fn(() => options?.quickActions ?? []),
    getRoleKeyboardShortcuts: vi.fn(() => options?.shortcuts ?? []),
    getRoleWorkspacePanels: vi.fn(() => emptyPanels)
  };
}

function createToolbarState(): WorkspaceToolbarState {
  return createWorkspaceChromeFacade().createDefaultToolbarState();
}

function createTopbarActionStateFacadeMock(
  isActionActive: WorkspaceTopbarActionStateFacade["isActionActive"] = () => false
): WorkspaceTopbarActionStateFacade {
  return {
    isActionActive: vi.fn(isActionActive)
  };
}

describe("WorkspaceTopbar facades injection", () => {
  it("does not query role chrome facade when user is not authenticated", () => {
    const chromeFacade = createChromeFacadeMock();
    const topbarActionStateFacade = createTopbarActionStateFacadeMock();

    render(
      <WorkspaceTopbar
        isAuthenticated={false}
        role={undefined}
        workspaceChromeFacade={chromeFacade}
        workspaceTopbarActionStateFacade={topbarActionStateFacade}
        toolbarState={createToolbarState()}
        layoutTheme={DEFAULT_LAYOUT_THEME}
        onLayoutThemeChange={() => undefined}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        onWorkspaceOptionsChange={() => undefined}
        onAction={() => undefined}
        showDebugPanel={false}
        onToggleDebug={() => undefined}
        onSignOut={() => undefined}
      />
    );

    expect(chromeFacade.getRoleToolbarGroups).not.toHaveBeenCalled();
    expect(chromeFacade.getRoleQuickActions).not.toHaveBeenCalled();
    expect(chromeFacade.getRoleKeyboardShortcuts).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument();
  });

  it("uses injected facades for toolbar data and action active state", () => {
    const groups: ToolbarGroup[] = [
      {
        key: "module",
        label: "Module",
        actions: [{ key: "save_local_draft", label: "Save", status: "mvp", supported: true }]
      }
    ];
    const quickActions: ToolbarAction[] = [
      { key: "undo", label: "Undo", status: "mvp", supported: true }
    ];
    const shortcuts: KeyboardShortcut[] = [{ key: "X", description: "Custom shortcut." }];
    const chromeFacade = createChromeFacadeMock({
      groups,
      quickActions,
      shortcuts
    });
    const topbarActionStateFacade = createTopbarActionStateFacadeMock(
      (actionKey) => actionKey === "undo"
    );
    const onAction = vi.fn();

    render(
      <WorkspaceTopbar
        isAuthenticated={true}
        role="builder"
        workspaceChromeFacade={chromeFacade}
        workspaceTopbarActionStateFacade={topbarActionStateFacade}
        toolbarState={createToolbarState()}
        layoutTheme={DEFAULT_LAYOUT_THEME}
        onLayoutThemeChange={() => undefined}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        onWorkspaceOptionsChange={() => undefined}
        onAction={onAction}
        showDebugPanel={false}
        onToggleDebug={() => undefined}
        onSignOut={() => undefined}
      />
    );

    expect(chromeFacade.getRoleToolbarGroups).toHaveBeenCalledWith("builder");
    expect(chromeFacade.getRoleQuickActions).toHaveBeenCalledWith("builder");
    expect(chromeFacade.getRoleKeyboardShortcuts).toHaveBeenCalledWith("builder");
    expect(screen.getByRole("button", { name: /^module$/i })).toBeInTheDocument();

    const undoButton = screen.getByRole("button", { name: /^undo$/i });
    expect(undoButton.className).toContain("is-active");
    fireEvent.click(undoButton);
    expect(onAction).toHaveBeenCalledWith("undo");
    expect(topbarActionStateFacade.isActionActive).toHaveBeenCalledWith(
      "undo",
      expect.any(Object)
    );
  });

  it("surfaces viewport fullscreen toggle when the workspace can expand the canvas", () => {
    const chromeFacade = createChromeFacadeMock();
    const onToggleViewportFullscreen = vi.fn();
    const baseProps = {
      isAuthenticated: true,
      role: "builder" as const,
      workspaceChromeFacade: chromeFacade,
      workspaceTopbarActionStateFacade: createTopbarActionStateFacadeMock(),
      toolbarState: createToolbarState(),
      layoutTheme: DEFAULT_LAYOUT_THEME,
      onLayoutThemeChange: () => undefined,
      workspaceOptions: DEFAULT_WORKSPACE_OPTION_SETTINGS,
      onWorkspaceOptionsChange: () => undefined,
      onAction: () => undefined,
      showDebugPanel: false,
      onToggleDebug: () => undefined,
      onSignOut: () => undefined,
      onToggleViewportFullscreen
    };

    const { rerender } = render(
      <WorkspaceTopbar {...baseProps} isViewportFullscreen={false} />
    );

    const openButton = screen.getByRole("button", {
      name: /open viewport fullscreen/i
    });
    expect(openButton).toHaveTextContent("Full View");
    expect(openButton).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(openButton);
    expect(onToggleViewportFullscreen).toHaveBeenCalledTimes(1);

    rerender(<WorkspaceTopbar {...baseProps} isViewportFullscreen={true} />);

    const exitButton = screen.getByRole("button", {
      name: /exit viewport fullscreen/i
    });
    expect(exitButton).toHaveTextContent("Exit View");
    expect(exitButton).toHaveAttribute("aria-pressed", "true");
    expect(exitButton.className).toContain("is-active");
  });

  it("keeps placeables mode topbar focused without area editor groups or options", () => {
    const groups: ToolbarGroup[] = [
      {
        key: "module",
        label: "Module",
        actions: [{ key: "save_local_draft", label: "Save", status: "mvp", supported: true }]
      },
      {
        key: "selection",
        label: "Selection",
        actions: [{ key: "select_object", label: "Select Object", status: "mvp", supported: true }]
      },
      {
        key: "canvas",
        label: "Canvas",
        actions: [{ key: "debug_grid", label: "Grid", status: "mvp", supported: true }]
      }
    ];
    const quickActions: ToolbarAction[] = [
      { key: "undo", label: "Undo", status: "mvp", supported: true }
    ];
    const chromeFacade = createChromeFacadeMock({ groups, quickActions, shortcuts: [] });

    render(
      <WorkspaceTopbar
        isAuthenticated={true}
        role="builder"
        workspaceChromeFacade={chromeFacade}
        workspaceTopbarActionStateFacade={createTopbarActionStateFacadeMock()}
        workspaceModeId="placeables_mode"
        toolbarState={createToolbarState()}
        layoutTheme={DEFAULT_LAYOUT_THEME}
        onLayoutThemeChange={() => undefined}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        onWorkspaceOptionsChange={() => undefined}
        onAction={() => undefined}
        showDebugPanel={false}
        onToggleDebug={() => undefined}
        onSignOut={() => undefined}
      />
    );

    expect(screen.getByRole("button", { name: /^undo$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^module$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^selection$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^canvas$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /open quick options/i }));

    expect(screen.getByRole("group", { name: /^layout$/i })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /viewport controls/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /snap and selection/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/grid step/i)).not.toBeInTheDocument();
  });

  it("surfaces the runtime max-lights workspace option for area editing", () => {
    const chromeFacade = createChromeFacadeMock();
    const onWorkspaceOptionsChange = vi.fn();

    render(
      <WorkspaceTopbar
        isAuthenticated={true}
        role="builder"
        workspaceChromeFacade={chromeFacade}
        workspaceTopbarActionStateFacade={createTopbarActionStateFacadeMock()}
        workspaceModeId="areas_mode"
        toolbarState={createToolbarState()}
        layoutTheme={DEFAULT_LAYOUT_THEME}
        onLayoutThemeChange={() => undefined}
        workspaceOptions={{
          ...DEFAULT_WORKSPACE_OPTION_SETTINGS,
          runtimeMaxLights: 64
        }}
        onWorkspaceOptionsChange={onWorkspaceOptionsChange}
        onAction={() => undefined}
        showDebugPanel={false}
        onToggleDebug={() => undefined}
        onSignOut={() => undefined}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /open quick options/i }));

    const maxLightsInput = screen.getByRole("spinbutton", { name: /max active lights/i });
    expect(maxLightsInput).toHaveValue(64);
    expect(screen.getByRole("group", { name: /^lighting$/i })).toBeInTheDocument();

    fireEvent.change(maxLightsInput, { target: { value: "16" } });

    expect(onWorkspaceOptionsChange).toHaveBeenCalledWith({ runtimeMaxLights: 16 });
  });

  it("surfaces Fit Area only for areas mode and keeps reorient for other modes", () => {
    const groups: ToolbarGroup[] = [
      {
        key: "camera",
        label: "Camera",
        actions: [
          { key: "fit_area_view", label: "Fit Area", status: "mvp", supported: true },
          {
            key: "reorient_camera",
            label: "Reorient Camera",
            status: "mvp",
            supported: true
          }
        ]
      },
      {
        key: "canvas",
        label: "Canvas",
        actions: [
          { key: "fit_area_view", label: "Fit Area", status: "mvp", supported: true },
          { key: "camera_bookmark_load_1", label: "Load Bookmark #1", status: "mvp", supported: true }
        ]
      }
    ];
    const quickActions: ToolbarAction[] = [
      { key: "fit_area_view", label: "Fit Area", status: "mvp", supported: true },
      { key: "undo", label: "Undo", status: "mvp", supported: true }
    ];
    const chromeFacade = createChromeFacadeMock({ groups, quickActions, shortcuts: [] });
    const onAction = vi.fn();

    const topbarProps = {
      isAuthenticated: true,
      role: "builder" as const,
      workspaceChromeFacade: chromeFacade,
      workspaceTopbarActionStateFacade: createTopbarActionStateFacadeMock(),
      toolbarState: createToolbarState(),
      layoutTheme: DEFAULT_LAYOUT_THEME,
      onLayoutThemeChange: () => undefined,
      workspaceOptions: DEFAULT_WORKSPACE_OPTION_SETTINGS,
      onWorkspaceOptionsChange: () => undefined,
      onAction,
      showDebugPanel: false,
      onToggleDebug: () => undefined,
      onSignOut: () => undefined
    };

    const { rerender } = render(
      <WorkspaceTopbar {...topbarProps} workspaceModeId="areas_mode" />
    );

    const fitQuickAction = screen.getByRole("button", { name: /^fit area$/i });
    fireEvent.click(fitQuickAction);
    expect(onAction).toHaveBeenCalledWith("fit_area_view");
    fireEvent.keyDown(window, { key: "r", ctrlKey: true });
    expect(onAction).toHaveBeenLastCalledWith("fit_area_view");

    fireEvent.click(screen.getByRole("button", { name: /^camera$/i }));
    expect(screen.getAllByRole("button", { name: /fit area/i })).toHaveLength(2);
    expect(
      screen.queryByRole("button", { name: /reorient camera/i })
    ).not.toBeInTheDocument();

    rerender(<WorkspaceTopbar {...topbarProps} workspaceModeId="sounds_mode" />);

    expect(screen.queryByRole("button", { name: /^fit area$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reorient camera/i })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "r", ctrlKey: true });
    expect(onAction).toHaveBeenLastCalledWith("reorient_camera");
  });

  it("handles keyboard actions from injected facade model (ctrl+s, ctrl+y, ctrl+shift+z)", () => {
    const groups: ToolbarGroup[] = [
      {
        key: "module",
        label: "Module",
        actions: [
          { key: "save_local_draft", label: "Save", status: "mvp", supported: true }
        ]
      }
    ];
    const quickActions: ToolbarAction[] = [
      { key: "undo", label: "Undo", status: "mvp", supported: true },
      { key: "redo", label: "Redo", status: "mvp", supported: true }
    ];
    const chromeFacade = createChromeFacadeMock({ groups, quickActions, shortcuts: [] });
    const topbarActionStateFacade = createTopbarActionStateFacadeMock();
    const onAction = vi.fn();

    render(
      <WorkspaceTopbar
        isAuthenticated={true}
        role="builder"
        workspaceChromeFacade={chromeFacade}
        workspaceTopbarActionStateFacade={topbarActionStateFacade}
        toolbarState={createToolbarState()}
        layoutTheme={DEFAULT_LAYOUT_THEME}
        onLayoutThemeChange={() => undefined}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        onWorkspaceOptionsChange={() => undefined}
        onAction={onAction}
        showDebugPanel={false}
        onToggleDebug={() => undefined}
        onSignOut={() => undefined}
      />
    );

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    fireEvent.keyDown(window, { key: "y", ctrlKey: true });
    fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });

    expect(onAction).toHaveBeenCalledWith("save_local_draft");
    expect(onAction).toHaveBeenCalledWith("redo");
    expect(onAction.mock.calls.filter(([action]) => action === "redo")).toHaveLength(2);
  });

  it("switches gizmo mode with 1/2/3/4/5 and keeps W/E/R inactive", () => {
    const groups: ToolbarGroup[] = [
      {
        key: "canvas",
        label: "Canvas",
        actions: [
          { key: "canvas_gizmo_translate", label: "Move", status: "mvp", supported: true },
          { key: "canvas_gizmo_rotate", label: "Rotate", status: "mvp", supported: true },
          { key: "canvas_gizmo_vt_rotate", label: "VT Rotate", status: "mvp", supported: true },
          { key: "canvas_gizmo_vt_translate", label: "VT Offset", status: "mvp", supported: true },
          { key: "canvas_gizmo_vt_scale", label: "VT Scale", status: "mvp", supported: true }
        ]
      }
    ];
    const chromeFacade = createChromeFacadeMock({ groups, quickActions: [], shortcuts: [] });
    const topbarActionStateFacade = createTopbarActionStateFacadeMock();
    const onAction = vi.fn();

    render(
      <WorkspaceTopbar
        isAuthenticated={true}
        role="builder"
        workspaceChromeFacade={chromeFacade}
        workspaceTopbarActionStateFacade={topbarActionStateFacade}
        toolbarState={createToolbarState()}
        layoutTheme={DEFAULT_LAYOUT_THEME}
        onLayoutThemeChange={() => undefined}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        onWorkspaceOptionsChange={() => undefined}
        onAction={onAction}
        showDebugPanel={false}
        onToggleDebug={() => undefined}
        onSignOut={() => undefined}
      />
    );

    fireEvent.keyDown(window, { key: "1" });
    fireEvent.keyDown(window, { key: "2" });
    fireEvent.keyDown(window, { key: "3" });
    fireEvent.keyDown(window, { key: "4" });
    fireEvent.keyDown(window, { key: "5" });
    fireEvent.keyDown(window, { key: "w" });
    fireEvent.keyDown(window, { key: "e" });
    fireEvent.keyDown(window, { key: "r" });

    expect(onAction).toHaveBeenCalledWith("canvas_gizmo_translate");
    expect(onAction).toHaveBeenCalledWith("canvas_gizmo_rotate");
    expect(onAction).toHaveBeenCalledWith("canvas_gizmo_vt_rotate");
    expect(onAction).toHaveBeenCalledWith("canvas_gizmo_vt_translate");
    expect(onAction).toHaveBeenCalledWith("canvas_gizmo_vt_scale");
    expect(onAction.mock.calls).toHaveLength(5);
  });

  it("filters VT shortcuts in help by supported actions", () => {
    const groups: ToolbarGroup[] = [
      {
        key: "canvas",
        label: "Canvas",
        actions: [
          { key: "canvas_gizmo_translate", label: "Move", status: "mvp", supported: true },
          { key: "canvas_gizmo_rotate", label: "Rotate", status: "mvp", supported: true },
          { key: "canvas_gizmo_vt_rotate", label: "VT Rotate", status: "mvp", supported: false },
          { key: "canvas_gizmo_vt_translate", label: "VT Offset", status: "mvp", supported: true },
          { key: "canvas_gizmo_vt_scale", label: "VT Scale", status: "mvp", supported: false }
        ]
      }
    ];
    const chromeFacade = createChromeFacadeMock({ groups, quickActions: [], shortcuts: [] });

    render(
      <WorkspaceTopbar
        isAuthenticated={true}
        role="builder"
        workspaceChromeFacade={chromeFacade}
        workspaceTopbarActionStateFacade={createTopbarActionStateFacadeMock()}
        toolbarState={createToolbarState()}
        layoutTheme={DEFAULT_LAYOUT_THEME}
        onLayoutThemeChange={() => undefined}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        onWorkspaceOptionsChange={() => undefined}
        onAction={() => undefined}
        showDebugPanel={false}
        onToggleDebug={() => undefined}
        onSignOut={() => undefined}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /shortcuts/i }));

    expect(screen.queryByText("Switch gizmo to VT Rotate mode (XYZ).")).not.toBeInTheDocument();
    expect(screen.getByText("Switch gizmo to VT Offset mode (XYZ).")).toBeInTheDocument();
    expect(screen.queryByText("Switch gizmo to VT Scale mode.")).not.toBeInTheDocument();
  });

  it("renders VT gizmo buttons with MVP titles in canvas drawer", () => {
    const groups: ToolbarGroup[] = [
      {
        key: "canvas",
        label: "Canvas",
        actions: [
          {
            key: "canvas_gizmo_translate",
            label: "World Move (1)",
            status: "mvp",
            supported: true
          },
          {
            key: "canvas_gizmo_rotate",
            label: "World Bearing (2)",
            status: "mvp",
            supported: true
          },
          {
            key: "canvas_gizmo_vt_rotate",
            label: "VT Rotate (3)",
            status: "mvp",
            supported: true
          },
          {
            key: "canvas_gizmo_vt_translate",
            label: "VT Offset (4)",
            status: "mvp",
            supported: true
          },
          {
            key: "canvas_gizmo_vt_scale",
            label: "VT Scale (5)",
            status: "mvp",
            supported: true
          },
          {
            key: "debug_show_vt_physical_anchor",
            label: "Show VT Physical Anchor",
            status: "mvp",
            supported: true
          }
        ]
      }
    ];
    const chromeFacade = createChromeFacadeMock({ groups, quickActions: [], shortcuts: [] });

    render(
      <WorkspaceTopbar
        isAuthenticated={true}
        role="builder"
        workspaceChromeFacade={chromeFacade}
        workspaceTopbarActionStateFacade={createTopbarActionStateFacadeMock()}
        toolbarState={createToolbarState()}
        layoutTheme={DEFAULT_LAYOUT_THEME}
        onLayoutThemeChange={() => undefined}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        onWorkspaceOptionsChange={() => undefined}
        onAction={() => undefined}
        showDebugPanel={false}
        onToggleDebug={() => undefined}
        onSignOut={() => undefined}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /^canvas$/i }));

    const vtScaleButton = screen.getByRole("button", { name: /vt scale \(5\)/i });
    const vtPhysicalButton = screen.getByRole("button", { name: /vt physical/i });
    expect(vtScaleButton).toBeEnabled();
    expect(vtPhysicalButton).toBeEnabled();
    expect(vtScaleButton).toHaveAttribute("title", "VT Scale (5) (MVP)");
    expect(vtPhysicalButton).toHaveAttribute("title", "Show VT Physical Anchor (MVP)");
  });

  it("filters gizmo keyboard shortcuts by supported actions", () => {
    const groups: ToolbarGroup[] = [
      {
        key: "canvas",
        label: "Canvas",
        actions: [
          { key: "canvas_gizmo_translate", label: "Move", status: "post_mvp", supported: false },
          { key: "canvas_gizmo_rotate", label: "Rotate", status: "mvp", supported: true },
          { key: "canvas_gizmo_vt_rotate", label: "VT Rotate", status: "mvp", supported: true },
          { key: "canvas_gizmo_vt_translate", label: "VT Offset", status: "mvp", supported: false },
          { key: "canvas_gizmo_vt_scale", label: "VT Scale", status: "mvp", supported: true }
        ]
      }
    ];
    const chromeFacade = createChromeFacadeMock({ groups, quickActions: [], shortcuts: [] });
    const onAction = vi.fn();

    render(
      <WorkspaceTopbar
        isAuthenticated={true}
        role="builder"
        workspaceChromeFacade={chromeFacade}
        workspaceTopbarActionStateFacade={createTopbarActionStateFacadeMock()}
        toolbarState={createToolbarState()}
        layoutTheme={DEFAULT_LAYOUT_THEME}
        onLayoutThemeChange={() => undefined}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        onWorkspaceOptionsChange={() => undefined}
        onAction={onAction}
        showDebugPanel={false}
        onToggleDebug={() => undefined}
        onSignOut={() => undefined}
      />
    );

    fireEvent.keyDown(window, { key: "1", code: "Digit1" });
    fireEvent.keyDown(window, { key: "2", code: "Digit2" });
    fireEvent.keyDown(window, { key: "3", code: "Digit3" });
    fireEvent.keyDown(window, { key: "4", code: "Digit4" });
    fireEvent.keyDown(window, { key: "5", code: "Digit5" });
    fireEvent.keyDown(window, { key: "1", code: "Numpad1" });

    expect(onAction).not.toHaveBeenCalledWith("canvas_gizmo_translate");
    expect(onAction).toHaveBeenCalledWith("canvas_gizmo_rotate");
    expect(onAction).toHaveBeenCalledWith("canvas_gizmo_vt_rotate");
    expect(onAction).toHaveBeenCalledWith("canvas_gizmo_vt_scale");
    expect(onAction).not.toHaveBeenCalledWith("canvas_gizmo_vt_translate");
    expect(onAction.mock.calls).toHaveLength(3);
  });

  it("shows VT shortcuts in help only when corresponding VT actions are supported", () => {
    const groups: ToolbarGroup[] = [
      {
        key: "canvas",
        label: "Canvas",
        actions: [
          { key: "canvas_gizmo_translate", label: "Move", status: "mvp", supported: true },
          { key: "canvas_gizmo_rotate", label: "Rotate", status: "mvp", supported: true },
          { key: "canvas_gizmo_vt_rotate", label: "VT Rotate", status: "mvp", supported: true },
          { key: "canvas_gizmo_vt_translate", label: "VT Offset", status: "mvp", supported: true },
          { key: "canvas_gizmo_vt_scale", label: "VT Scale", status: "mvp", supported: true }
        ]
      }
    ];
    const chromeFacade = createChromeFacadeMock({ groups, quickActions: [], shortcuts: [] });

    render(
      <WorkspaceTopbar
        isAuthenticated={true}
        role="builder"
        workspaceChromeFacade={chromeFacade}
        workspaceTopbarActionStateFacade={createTopbarActionStateFacadeMock()}
        toolbarState={createToolbarState()}
        layoutTheme={DEFAULT_LAYOUT_THEME}
        onLayoutThemeChange={() => undefined}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        onWorkspaceOptionsChange={() => undefined}
        onAction={() => undefined}
        showDebugPanel={false}
        onToggleDebug={() => undefined}
        onSignOut={() => undefined}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /shortcuts/i }));

    expect(screen.getByText("Switch gizmo to VT Rotate mode (XYZ).")).toBeInTheDocument();
    expect(screen.getByText("Switch gizmo to VT Offset mode (XYZ).")).toBeInTheDocument();
    expect(screen.getByText("Switch gizmo to VT Scale mode.")).toBeInTheDocument();
    expect(screen.getByText(/^3$/)).toBeInTheDocument();
    expect(screen.getByText(/^4$/)).toBeInTheDocument();
    expect(screen.getByText(/^5$/)).toBeInTheDocument();
  });
});
