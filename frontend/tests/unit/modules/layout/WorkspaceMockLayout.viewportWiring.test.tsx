import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceMockLayout } from "../../../../src/modules/layout/components/WorkspaceMockLayout";
import { createSceneObjectCatalogQueryFacade } from "../../../../src/modules/layout/application/sceneObjectCatalogQueryFacade";
import { createWorkspaceChromeFacade } from "../../../../src/modules/layout/application/workspaceChromeFacade";
import { DEFAULT_WORKSPACE_OPTION_SETTINGS } from "../../../../src/modules/layout/workspaceOptionSettings";
import { createBrowserSceneViewportPort } from "../../../../src/modules/scene/composition/createBrowserSceneViewportPort";
import type { AreaApiPort } from "../../../../src/modules/areas/ports/areaApiPort";

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
  const areaApiPortStub: AreaApiPort = {
    login: vi.fn(async () => ({ accessToken: "token" })),
    listAreas: vi.fn(async () => ({ items: [], total: 0, limit: 100, offset: 0 })),
    getAreaById: vi.fn(async () => ({
      areaId: "area_stub",
      name: "Area Stub",
      biome: "urban",
      width: 2,
      height: 2,
      tags: [],
      benchmark: false,
      updatedAt: "2026-01-01T00:00:00.000Z",
      objects: []
    }))
  };

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
        areaApiPort={areaApiPortStub}
        backendAccessToken={null}
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

  it("renders builder left panel with only Add Objects runtime section", () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();

    render(
      <WorkspaceMockLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        backendAccessToken={null}
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

    expect(screen.getByRole("heading", { name: "Workspace Mode" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /areas mode/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("heading", { name: "Areas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Add Objects" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Tile Catalog" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Paint Tools" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Asset Browser" })).not.toBeInTheDocument();
  });

  it("switches builder workspace mode to placeables and hides area selection panel", () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();

    render(
      <WorkspaceMockLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        backendAccessToken={null}
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

    expect(screen.getByRole("heading", { name: "Areas" })).toBeInTheDocument();
    const placeablesModeButton = screen.getByRole("button", { name: /placeables mode/i });
    fireEvent.click(placeablesModeButton);

    expect(placeablesModeButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("heading", { name: "Areas" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Add Objects" })).toBeInTheDocument();
  });

  it("does not render workspace mode switch for non-builder roles", () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();

    render(
      <WorkspaceMockLayout
        role="viewer"
        userId="u_viewer_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        backendAccessToken={null}
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

    expect(screen.queryByRole("heading", { name: "Workspace Mode" })).not.toBeInTheDocument();
  });
});
