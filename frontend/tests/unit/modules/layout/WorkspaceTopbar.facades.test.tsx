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

  it("switches gizmo mode with 1/2 and keeps 3 + W/E/R inactive", () => {
    const groups: ToolbarGroup[] = [
      {
        key: "canvas",
        label: "Canvas",
        actions: [
          { key: "canvas_gizmo_translate", label: "Move", status: "mvp", supported: true },
          { key: "canvas_gizmo_rotate", label: "Rotate", status: "mvp", supported: true },
          { key: "canvas_gizmo_scale", label: "Scale", status: "post_mvp", supported: false }
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
    fireEvent.keyDown(window, { key: "w" });
    fireEvent.keyDown(window, { key: "e" });
    fireEvent.keyDown(window, { key: "r" });

    expect(onAction).toHaveBeenCalledWith("canvas_gizmo_translate");
    expect(onAction).toHaveBeenCalledWith("canvas_gizmo_rotate");
    expect(onAction).not.toHaveBeenCalledWith("canvas_gizmo_scale");
    expect(onAction.mock.calls).toHaveLength(2);
  });

  it("does not suggest scale shortcut in help when scale gizmo is reserved", () => {
    const groups: ToolbarGroup[] = [
      {
        key: "canvas",
        label: "Canvas",
        actions: [
          { key: "canvas_gizmo_translate", label: "Move", status: "mvp", supported: true },
          { key: "canvas_gizmo_rotate", label: "Rotate", status: "mvp", supported: true },
          { key: "canvas_gizmo_scale", label: "Scale", status: "post_mvp", supported: false }
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

    expect(
      screen.queryByText("Reserved for Visual Transform scale mode (not active yet).")
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/^3$/)).not.toBeInTheDocument();
  });

  it("marks scale button as reserved with post-mvp tooltip in canvas drawer", () => {
    const groups: ToolbarGroup[] = [
      {
        key: "canvas",
        label: "Canvas",
        actions: [
          {
            key: "canvas_gizmo_translate",
            label: "Gizmo Move (1)",
            status: "mvp",
            supported: true
          },
          {
            key: "canvas_gizmo_rotate",
            label: "Gizmo Rotate (2)",
            status: "mvp",
            supported: true
          },
          {
            key: "canvas_gizmo_scale",
            label: "Gizmo Scale (Reserved)",
            status: "post_mvp",
            supported: false
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

    const scaleButton = screen.getByRole("button", { name: /scale \(reserved\)/i });
    expect(scaleButton).toBeDisabled();
    expect(scaleButton).toHaveAttribute("title", "Gizmo Scale (Reserved) (Post-MVP, Reserved)");
  });

  it("filters gizmo keyboard shortcuts by supported actions", () => {
    const groups: ToolbarGroup[] = [
      {
        key: "canvas",
        label: "Canvas",
        actions: [
          { key: "canvas_gizmo_translate", label: "Move", status: "post_mvp", supported: false },
          { key: "canvas_gizmo_rotate", label: "Rotate", status: "mvp", supported: true }
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
    fireEvent.keyDown(window, { key: "1", code: "Numpad1" });

    expect(onAction).not.toHaveBeenCalledWith("canvas_gizmo_translate");
    expect(onAction).toHaveBeenCalledWith("canvas_gizmo_rotate");
    expect(onAction.mock.calls).toHaveLength(1);
  });

  it("shows scale shortcut in help only when scale action is supported", () => {
    const groups: ToolbarGroup[] = [
      {
        key: "canvas",
        label: "Canvas",
        actions: [
          { key: "canvas_gizmo_translate", label: "Move", status: "mvp", supported: true },
          { key: "canvas_gizmo_rotate", label: "Rotate", status: "mvp", supported: true },
          { key: "canvas_gizmo_scale", label: "Scale", status: "mvp", supported: true }
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

    expect(screen.getByText("Switch gizmo to Scale mode.")).toBeInTheDocument();
    expect(screen.getByText(/^3$/)).toBeInTheDocument();
  });
});
