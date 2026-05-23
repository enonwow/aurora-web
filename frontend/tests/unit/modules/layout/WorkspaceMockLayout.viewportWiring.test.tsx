import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceMockLayout } from "../../../../src/modules/layout/components/WorkspaceMockLayout";
import { createSceneObjectCatalogQueryFacade } from "../../../../src/modules/layout/application/sceneObjectCatalogQueryFacade";
import { createWorkspaceChromeFacade } from "../../../../src/modules/layout/application/workspaceChromeFacade";
import { DEFAULT_WORKSPACE_OPTION_SETTINGS } from "../../../../src/modules/layout/workspaceOptionSettings";
import { createBrowserSceneViewportPort } from "../../../../src/modules/scene/composition/createBrowserSceneViewportPort";

const mockWiring = vi.hoisted(() => {
  return {
    viewportPropsSpy: vi.fn()
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
    mockWiring.viewportPropsSpy.mockClear();
  });

  it("passes injected scene viewport port down to WorkspaceCanvasViewport", () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();

    render(
      <WorkspaceMockLayout
        role="viewer"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={vi.fn()}
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
    expect(mockWiring.viewportPropsSpy).toHaveBeenCalled();

    const firstViewportProps = mockWiring.viewportPropsSpy.mock.calls[0]?.[0] as {
      sceneViewportPort: unknown;
    };
    expect(firstViewportProps.sceneViewportPort).toBe(sceneViewportPort);
  });
});
