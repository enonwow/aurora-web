import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AreasModePanel } from "../../../../src/modules/layout/components/AreasModePanel";
import { createSceneObjectCatalogQueryFacade } from "../../../../src/modules/layout/application/sceneObjectCatalogQueryFacade";
import { getWorkspaceModeById } from "../../../../src/modules/layout/workspaceModes";
import type { AreaApiPort } from "../../../../src/modules/areas/ports/areaApiPort";
import type { AreaTileProcessContractReadiness } from "../../../../src/modules/tiles/application/areaTileProcessContractReadiness";

const panelHarness = vi.hoisted(() => ({ editingPanelProps: vi.fn() }));

vi.mock("../../../../src/modules/layout/components/AuroraAreaEditingPanel", () => ({
  AuroraAreaEditingPanel: (props: unknown) => {
    panelHarness.editingPanelProps(props);
    return <div data-testid="aurora-area-editing-panel-stub" />;
  }
}));

describe("AreasModePanel Area tile readiness transport", () => {
  it("passes the current settled asset contract to AuroraAreaEditingPanel", () => {
    const readiness = {
      status: "ready",
      areaId: "area_test",
      checkedCandidateCount: 4,
      readyCandidateCount: 4,
      blockedCandidateCount: 0
    } as AreaTileProcessContractReadiness;
    const areaApiPort = {
      listAreas: vi.fn(async () => ({ items: [], total: 0, limit: 100, offset: 0 }))
    } as unknown as AreaApiPort;

    render(
      <AreasModePanel
        userId="user_test"
        objects={[]}
        activeMode={getWorkspaceModeById("placeables_mode")}
        backendAccessToken="token"
        areaApiPort={areaApiPort}
        areaListClientCacheRef={{ current: null }}
        sceneObjectCatalogQueryFacade={createSceneObjectCatalogQueryFacade()}
        areaEditingTool={{ kind: "inspect" }}
        areaTileProcessReadiness={readiness}
        trackTelemetryEvent={vi.fn()}
        onAreaCanvasLoadingChange={vi.fn()}
        onAreaSceneSelected={vi.fn()}
        onAreaSceneMutation={vi.fn()}
        onAreaEditingToolChange={vi.fn()}
        onObjectCreate={vi.fn()}
      />
    );

    expect(panelHarness.editingPanelProps).toHaveBeenCalledWith(
      expect.objectContaining({ tileProcessReadiness: readiness })
    );
  });
});
