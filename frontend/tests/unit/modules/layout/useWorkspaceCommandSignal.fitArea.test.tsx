import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useRef } from "react";
import { useWorkspaceCommandSignal } from "../../../../src/modules/layout/application/useWorkspaceCommandSignal";
import { createDefaultToolbarState } from "../../../../src/modules/layout/roleTopbarPolicy";
import type { SceneViewportPort } from "../../../../src/modules/scene/application/sceneViewportPort";
import type {
  AreaScene,
  SceneHistoryState,
  SceneObject,
  SceneObjectKind
} from "../../../../src/modules/scene/contracts";
import type {
  WorkspaceCameraRuntimePort,
  WorkspaceRuntimeRef
} from "../../../../src/modules/layout/ports/workspaceRenderRuntimePort";
import type { ToolbarActionKey } from "../../../../src/modules/layout/application/workspaceChromeFacade";

interface RuntimeStub {
  marker: string;
}

interface HarnessProps {
  actionKey: ToolbarActionKey;
  cameraRuntimePort: WorkspaceCameraRuntimePort<RuntimeStub, unknown>;
  runtimeRef: WorkspaceRuntimeRef<RuntimeStub>;
  scene: AreaScene;
  trackTelemetry: ReturnType<typeof vi.fn>;
}

const emptyHistory: SceneHistoryState = {
  past: [],
  present: {
    sceneId: "current",
    areaName: "Current",
    width: 1,
    height: 1,
    tiles: [],
    objects: [],
    updatedAtUnixMs: 0,
    source: "seed"
  },
  future: []
};

const sceneViewportPort = {
  createInitialHistory: vi.fn(() => emptyHistory),
  createHistoryFromScene: vi.fn(() => emptyHistory),
  saveLocalDraft: vi.fn(),
  commitHistory: vi.fn((history: SceneHistoryState) => history),
  undoHistory: vi.fn((history: SceneHistoryState) => history),
  redoHistory: vi.fn((history: SceneHistoryState) => history),
  appendObjects: vi.fn((scene: AreaScene) => scene),
  deleteObjectsByIds: vi.fn((scene: AreaScene) => scene),
  deleteObjectById: vi.fn((scene: AreaScene) => scene),
  setPlaceablePropertiesByIds: vi.fn((scene: AreaScene) => scene),
  setObjectsAbsoluteLocationByIds: vi.fn((scene: AreaScene) => scene),
  setObjectsVisualTransformByIds: vi.fn((scene: AreaScene) => scene),
  restoreObjectsPlacementBySnapshots: vi.fn((scene: AreaScene) => scene),
  translateObjectsByIds: vi.fn((scene: AreaScene) => scene),
  adjustObjectsHeightByIds: vi.fn((scene: AreaScene) => scene),
  rotateObjectsBearingByIds: vi.fn((scene: AreaScene) => scene),
  updateTileTerrain: vi.fn((scene: AreaScene) => scene),
  resetObjectTransform: vi.fn((scene: AreaScene) => scene),
  createObject: vi.fn((kind: SceneObjectKind, x: number, y: number, sequence: number) => ({
    id: `${kind}:${sequence}`,
    kind,
    name: "Object",
    x,
    y,
    z: 0,
    bearing: 0,
    isStatic: true
  }) as SceneObject),
  resolveCopyAnchor: vi.fn(() => null),
  computeCopyTranslation: vi.fn(() => null),
  getSceneScale: vi.fn(() => 1)
} as unknown as SceneViewportPort;

function Harness({
  actionKey,
  cameraRuntimePort,
  runtimeRef,
  scene,
  trackTelemetry
}: HarnessProps) {
  const commandRevisionRef = useRef(0);
  const bookmark1Ref = useRef<unknown | null>(null);

  useWorkspaceCommandSignal({
    commandSignal: {
      actionKey,
      revision: 1,
      issuedAtUnixMs: 0
    },
    commandRevisionRef,
    runtimeRef,
    bookmark1Ref,
    cameraRuntimePort,
    scene,
    sceneViewportPort,
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
    toolbarState: createDefaultToolbarState(),
    userId: "builder.user",
    visibleObjects: [],
    trackTelemetry
  });

  return null;
}

describe("useWorkspaceCommandSignal fit area", () => {
  it("centers the camera against area geometry when Fit Area is issued", () => {
    const scene: AreaScene = {
      sceneId: "_ikea",
      areaName: "_IKEA",
      width: 16,
      height: 16,
      tiles: [],
      objects: [],
      updatedAtUnixMs: 0,
      source: "aurora_area"
    };
    const runtime: RuntimeStub = { marker: "runtime" };
    const centerCameraForScene = vi.fn();
    const cameraRuntimePort: WorkspaceCameraRuntimePort<RuntimeStub, unknown> = {
      centerCameraForScene,
      createCameraBookmark: vi.fn(() => ({})),
      restoreCameraBookmark: vi.fn()
    };
    const trackTelemetry = vi.fn();

    render(
      <Harness
        actionKey="fit_area_view"
        cameraRuntimePort={cameraRuntimePort}
        runtimeRef={{ current: runtime }}
        scene={scene}
        trackTelemetry={trackTelemetry}
      />
    );

    expect(centerCameraForScene).toHaveBeenCalledWith(runtime, scene, {
      objectPreview: false
    });
    expect(trackTelemetry).toHaveBeenCalledWith("scene.camera.fit_area", {
      userId: "builder.user",
      sceneId: "_ikea"
    });
  });
});
