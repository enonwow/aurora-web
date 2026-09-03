import { render, waitFor } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useWorkspaceCommandSignal } from "../../../../src/modules/layout/application/useWorkspaceCommandSignal";
import type { WorkspaceRuntimeRef } from "../../../../src/modules/layout/ports/workspaceRenderRuntimePort";
import { createDefaultToolbarState } from "../../../../src/modules/layout/roleTopbarPolicy";
import type { SceneViewportPort } from "../../../../src/modules/scene/application/sceneViewportPort";
import type { AreaScene } from "../../../../src/modules/scene/contracts";
import type { AreaTileProcessContractReadiness } from "../../../../src/modules/tiles/application/areaTileProcessContractReadiness";

const scene: AreaScene = {
  sceneId: "report_area",
  areaName: "Report Area",
  width: 1,
  height: 1,
  tiles: [
    {
      id: "tile-0",
      row: 0,
      col: 0,
      terrain: "stone",
      orientation: 0,
      rotateTexture: false,
      plot: false,
      tileId: 1,
      modelResRef: "tcn01_a01_01"
    }
  ],
  objects: [],
  updatedAtUnixMs: 7,
  source: "local_draft"
};

const readiness = {
  status: "ready",
  areaId: "report_area",
  expectedCandidateCount: 1,
  pendingCandidateCount: 0,
  checkedCandidateCount: 1,
  readyCandidateCount: 1,
  blockedCandidateCount: 0,
  sourceAssetReadyCount: 1,
  sourceAssetBlockedCount: 0,
  mdlSourceReadyCount: 1,
  mdlSourceBlockedCount: 0,
  glbGeometryReadyCount: 1,
  glbGeometryBlockedCount: 0,
  materialTextureContractReadyCount: 1,
  materialBindingBlockedCount: 0,
  renderLoaderReadyCount: 1,
  renderLoaderBlockedCount: 0,
  candidateSample: "tcn01_a01_01",
  readySample: "tcn01_a01_01",
  sourceObjectKeySample: "hak/tcn01_a01_01.mdl",
  sourceAssetContractSample: "ready",
  blockerSummary: "none",
  textureMaterialBlockerSummary: "none",
  renderAssetContractBlockerSummary: "none",
  mdlGlbMaterialBlockerSummary: "none",
  entries: []
} satisfies AreaTileProcessContractReadiness;

function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Blob read failed."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsText(blob);
  });
}

function Harness({ trackTelemetry }: { trackTelemetry: ReturnType<typeof vi.fn> }) {
  const commandRevisionRef = useRef(0);
  const runtimeRef: WorkspaceRuntimeRef<{ marker: string }> = useRef({ marker: "runtime" });
  const bookmark1Ref = useRef<unknown | null>(null);

  useWorkspaceCommandSignal({
    commandSignal: {
      actionKey: "debug_export_status_report",
      revision: 1,
      issuedAtUnixMs: 0
    },
    commandRevisionRef,
    runtimeRef,
    bookmark1Ref,
    cameraRuntimePort: {
      centerCameraForScene: vi.fn(),
      createCameraBookmark: vi.fn(() => ({})),
      restoreCameraBookmark: vi.fn()
    },
    scene,
    sceneViewportPort: {} as SceneViewportPort,
    setSceneHistory: vi.fn(),
    setSelectedObjectIds: vi.fn(),
    setSelectedTileId: vi.fn(),
    setLastSavedAtUnixMs: vi.fn(),
    copySelectedObjectsToClipboard: vi.fn(() => []),
    deleteSelectedObjects: vi.fn(() => 0),
    duplicateObjects: vi.fn(() => []),
    isSelectableByActiveFilters: vi.fn(() => true),
    renderAreaGeometry: true,
    selectedObjectIds: [],
    selectedTileIds: ["tile-0"],
    tileProcessReadiness: readiness,
    toolbarState: createDefaultToolbarState(),
    userId: "builder.user",
    visibleObjects: [],
    trackTelemetry
  });

  return null;
}

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(URL, "createObjectURL");
  Reflect.deleteProperty(URL, "revokeObjectURL");
});

describe("useWorkspaceCommandSignal status report", () => {
  it("downloads the unified report and emits schema-aware telemetry", async () => {
    const objectUrl = "blob:area-diagnostics";
    const createObjectUrl = vi.fn(() => objectUrl);
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrl
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrl
    });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const trackTelemetry = vi.fn();

    render(<Harness trackTelemetry={trackTelemetry} />);

    await waitFor(() => expect(createObjectUrl).toHaveBeenCalledTimes(1));
    const blob = createObjectUrl.mock.calls[0]?.[0];
    expect(blob).toBeInstanceOf(Blob);
    const report = JSON.parse(await readBlobText(blob as Blob));
    expect(report).toMatchObject({
      schemaVersion: "area-workspace-diagnostics.v1",
      area: { sceneId: "report_area", tileCount: 1, objectCount: 0 },
      selection: { tileIds: ["tile-0"], objectIds: [] },
      resources: { status: "ready", areaId: "report_area", readyCandidateCount: 1 }
    });
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith(objectUrl);
    expect(trackTelemetry).toHaveBeenCalledWith("scene.debug.export_status_report", {
      userId: "builder.user",
      sceneId: "report_area",
      schemaVersion: "area-workspace-diagnostics.v1",
      tileCount: 1,
      objectCount: 0,
      issueCount: 0,
      resourceStatus: "ready"
    });
  });
});
