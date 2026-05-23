import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceMockLayout } from "../../../../src/modules/layout/components/WorkspaceMockLayout";
import { createWorkspaceChromeFacade } from "../../../../src/modules/layout/application/workspaceChromeFacade";
import { DEFAULT_WORKSPACE_OPTION_SETTINGS } from "../../../../src/modules/layout/workspaceOptionSettings";

const mockWiring = vi.hoisted(() => {
  const mockPort = { marker: "scene-viewport-port" };
  return {
    mockPort,
    createBrowserSceneViewportPortMock: vi.fn(() => mockPort),
    viewportPropsSpy: vi.fn()
  };
});

vi.mock("../../../../src/modules/scene/composition/createBrowserSceneViewportPort", async () => {
  const actual = await vi.importActual<
    typeof import("../../../../src/modules/scene/composition/createBrowserSceneViewportPort")
  >("../../../../src/modules/scene/composition/createBrowserSceneViewportPort");
  return {
    ...actual,
    createBrowserSceneViewportPort: mockWiring.createBrowserSceneViewportPortMock
  };
});

vi.mock("../../../../src/modules/layout/components/WorkspaceCanvasViewport", () => ({
  WorkspaceCanvasViewport: (props: unknown) => {
    mockWiring.viewportPropsSpy(props);
    return <div data-testid="workspace-canvas-viewport-stub" />;
  }
}));

describe("WorkspaceMockLayout viewport wiring", () => {
  beforeEach(() => {
    mockWiring.createBrowserSceneViewportPortMock.mockClear();
    mockWiring.viewportPropsSpy.mockClear();
  });

  it("builds scene dependencies in layout composition and passes viewport port down", () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();

    render(
      <WorkspaceMockLayout
        role="viewer"
        userId="u_builder_001"
        toolbarState={toolbarState}
        commandSignal={null}
        workspaceOptions={DEFAULT_WORKSPACE_OPTION_SETTINGS}
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeftCollapsed={() => undefined}
        onToggleRightCollapsed={() => undefined}
      />
    );

    expect(screen.getByTestId("workspace-canvas-viewport-stub")).toBeInTheDocument();
    expect(mockWiring.createBrowserSceneViewportPortMock).toHaveBeenCalledTimes(1);
    expect(mockWiring.viewportPropsSpy).toHaveBeenCalled();

    const firstViewportProps = mockWiring.viewportPropsSpy.mock.calls[0]?.[0] as {
      sceneViewportPort: unknown;
    };
    expect(firstViewportProps.sceneViewportPort).toBe(mockWiring.mockPort);
  });
});
