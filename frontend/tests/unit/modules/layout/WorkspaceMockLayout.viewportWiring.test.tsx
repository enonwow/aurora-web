import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceMockLayout } from "../../../../src/modules/layout/components/WorkspaceMockLayout";
import { createSceneObjectCatalogQueryFacade } from "../../../../src/modules/layout/application/sceneObjectCatalogQueryFacade";
import { createWorkspaceChromeFacade } from "../../../../src/modules/layout/application/workspaceChromeFacade";
import { DEFAULT_WORKSPACE_OPTION_SETTINGS } from "../../../../src/modules/layout/workspaceOptionSettings";
import { createBrowserSceneViewportPort } from "../../../../src/modules/scene/composition/createBrowserSceneViewportPort";
import type { AreaApiPort } from "../../../../src/modules/areas/ports/areaApiPort";
import type { PlaceableApiPort } from "../../../../src/modules/placeables/ports/placeableApiPort";

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
  const placeableApiPortStub: PlaceableApiPort = {
    listPlaceables: vi.fn(async () => ({
      items: [
        {
          templateId: "plc_barrel_01",
          resref: "plc_a01",
          name: "PLC_BARREL_01",
          category: "placeables",
          placeableSubtype: "generic",
          tags: ["barrel"],
          previewImageUrl: "/preview/plc_barrel_01.png"
        },
        {
          templateId: "plc_table_02",
          resref: "plc_a02",
          name: "PLC_TABLE_02",
          category: "placeables",
          placeableSubtype: "generic",
          tags: ["table"],
          previewImageUrl: "/preview/plc_table_02.png"
        },
        {
          templateId: "plc_chair_03",
          resref: "plc_x02",
          name: "PLC_CHAIR_03",
          category: "placeables",
          placeableSubtype: "generic",
          tags: ["chair"],
          previewImageUrl: "/preview/plc_chair_03.png"
        },
        {
          templateId: "plc_crate_04",
          resref: "plc_a03",
          name: "PLC_CRATE_04",
          category: "placeables",
          placeableSubtype: "generic",
          tags: ["crate"],
          previewImageUrl: "/preview/plc_crate_04.png"
        }
      ],
      total: 4,
      limit: 100,
      offset: 0
    })),
    getPlaceablePreview: vi.fn(async (accessToken, templateId) => ({
      templateId,
      resref: templateId.replace("plc_", "plc_"),
      name: templateId.toUpperCase(),
      category: "placeables",
      previewImageUrl: `/preview/${templateId}.png`,
      metadata: {}
    })),
    processPlaceable: vi.fn(async () => ({
      cacheKey: "cache_key",
      cacheHit: false,
      storedAt: "2026-01-01T00:00:00.000Z",
      hits: 0,
      placeable: {
        templateId: "plc_barrel_01",
        resref: "plc_a01",
        name: "PLC_BARREL_01",
        category: "placeables",
        placeableSubtype: "generic",
        render: {
          backendType: "generic",
          frontendType: "placeable",
          rendererPreset: "default",
          isDoor: false,
          isVfx: false
        },
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-01-01T00:00:00.000Z",
          assetCount: 0,
          candidatesScanned: 0,
          assets: []
        }
      }
    })),
    getPlaceableAssetContracts: vi.fn(async () => ({
      cacheKey: "cache_key",
      assets: []
    }))
  };

  beforeEach(() => {
    mockWiring.viewportPropsSpy.mockClear();
    vi.clearAllMocks();
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
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
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
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
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

  it("switches builder workspace mode to placeables and renders placeables-only left panel", () => {
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
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
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
    expect(screen.getByRole("heading", { name: "Placeables" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Scene Objects" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: /add object type selector/i })
    ).not.toBeInTheDocument();
  });

  it("passes a single placeable renderObjectId in placeables mode and updates it after click", async () => {
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
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
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

    const initialLastCall =
      mockWiring.viewportPropsSpy.mock.calls[mockWiring.viewportPropsSpy.mock.calls.length - 1];
    const initialProps = initialLastCall?.[0] as {
      renderObjectIds?: string[] | null;
    };
    expect(initialProps.renderObjectIds ?? null).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /placeables mode/i }));

    await screen.findByRole("button", { name: /plc_table_02/i });
    await waitFor(() => {
      const placeablesLastCall =
        mockWiring.viewportPropsSpy.mock.calls[mockWiring.viewportPropsSpy.mock.calls.length - 1];
      const placeablesPropsBeforeSelect = placeablesLastCall?.[0] as {
        renderObjectIds?: string[] | null;
      };
      const initialRenderIds = placeablesPropsBeforeSelect.renderObjectIds ?? [];
      expect(Array.isArray(initialRenderIds)).toBe(true);
      expect(initialRenderIds).toHaveLength(1);
    });

    const placeablesLastCall =
      mockWiring.viewportPropsSpy.mock.calls[mockWiring.viewportPropsSpy.mock.calls.length - 1];
    const placeablesPropsBeforeSelect = placeablesLastCall?.[0] as {
      renderObjectIds?: string[] | null;
    };
    const initialRenderIds = placeablesPropsBeforeSelect.renderObjectIds ?? [];

    fireEvent.click(screen.getByRole("button", { name: /plc_table_02/i }));

    await waitFor(() => {
      const selectedLastCall =
        mockWiring.viewportPropsSpy.mock.calls[mockWiring.viewportPropsSpy.mock.calls.length - 1];
      const placeablesPropsAfterSelect = selectedLastCall?.[0] as {
        renderObjectIds?: string[] | null;
        externalSceneSeed?: { sceneId?: string; tiles?: unknown[]; objects?: Array<{ id: string }> } | null;
      };
      const selectedRenderIds = placeablesPropsAfterSelect.renderObjectIds ?? [];
      expect(selectedRenderIds).toHaveLength(1);
      expect(selectedRenderIds[0]).toMatch(/^preview:/i);
      expect(selectedRenderIds[0]).not.toBe(initialRenderIds[0]);
      expect(placeablesPropsAfterSelect.externalSceneSeed?.sceneId).toBe("preview:plc_table_02");
      expect(placeablesPropsAfterSelect.externalSceneSeed?.tiles ?? []).toHaveLength(0);
      expect(placeablesPropsAfterSelect.externalSceneSeed?.objects?.[0]?.id).toBe(
        selectedRenderIds[0]
      );
    });

    const placeablesList = screen.getByRole("list", { name: /placeables mode list/i });
    expect(within(placeablesList).getAllByRole("button")).toHaveLength(4);
    expect(screen.getByRole("button", { name: /plc_barrel_01/i })).toBeInTheDocument();
  });

  it("preserves distinct templates when backend items share the same resref", async () => {
    const workspaceChromeFacade = createWorkspaceChromeFacade();
    const sceneViewportPort = createBrowserSceneViewportPort();
    const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
    const toolbarState = workspaceChromeFacade.createDefaultToolbarState();
    const sameResrefPort: PlaceableApiPort = {
      ...placeableApiPortStub,
      listPlaceables: vi.fn(async () => ({
        items: [
          {
            templateId: "plc_shared_a",
            resref: "plc_shared",
            name: "PLC_SHARED_A",
            category: "placeables",
            placeableSubtype: "generic",
            tags: ["shared"],
            previewImageUrl: "/preview/plc_shared_a.png"
          },
          {
            templateId: "plc_shared_b",
            resref: "plc_shared",
            name: "PLC_SHARED_B",
            category: "placeables",
            placeableSubtype: "generic",
            tags: ["shared"],
            previewImageUrl: "/preview/plc_shared_b.png"
          }
        ],
        total: 2,
        limit: 100,
        offset: 0
      }))
    };

    render(
      <WorkspaceMockLayout
        role="builder"
        userId="u_builder_001"
        workspaceChromeFacade={workspaceChromeFacade}
        sceneViewportPort={sceneViewportPort}
        areaApiPort={areaApiPortStub}
        placeableApiPort={sameResrefPort}
        backendAccessToken={"token"}
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

    fireEvent.click(screen.getByRole("button", { name: /placeables mode/i }));
    const placeablesList = await screen.findByRole("list", { name: /placeables mode list/i });
    expect(within(placeablesList).getAllByRole("button")).toHaveLength(2);
    expect(within(placeablesList).getByRole("button", { name: /plc_shared_a/i })).toBeInTheDocument();
    expect(within(placeablesList).getByRole("button", { name: /plc_shared_b/i })).toBeInTheDocument();
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
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
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

  it("keeps areas mode behavior unchanged with no forced renderObjectIds", () => {
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
        placeableApiPort={placeableApiPortStub}
        backendAccessToken={"token"}
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

    const lastCall =
      mockWiring.viewportPropsSpy.mock.calls[mockWiring.viewportPropsSpy.mock.calls.length - 1];
    const lastProps = lastCall?.[0] as {
      renderObjectIds?: string[] | null;
    };

    expect(lastProps.renderObjectIds ?? null).toBeNull();
  });

  it("does not fall back to local placeables when backend token is missing", () => {
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
        placeableApiPort={placeableApiPortStub}
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

    fireEvent.click(screen.getByRole("button", { name: /placeables mode/i }));
    expect(
      screen.getByText(/backend placeables catalog is unavailable\./i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /plc_/i })).not.toBeInTheDocument();
  });
});
