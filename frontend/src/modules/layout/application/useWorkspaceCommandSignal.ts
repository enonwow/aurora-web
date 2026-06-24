import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { TelemetryPayload } from "../../telemetry/domain/telemetryEvent";
import type { SceneViewportPort } from "../../scene/application/sceneViewportPort";
import type {
  AreaScene,
  SceneHistoryState,
  SceneObject,
  SceneObjectKind
} from "../contracts";
import type {
  WorkspaceCommandSignal,
  WorkspaceToolbarState
} from "./workspaceChromeFacade";
import type {
  WorkspaceCameraRuntimePort,
  WorkspaceRuntimeRef
} from "../ports/workspaceRenderRuntimePort";
import {
  filterVisibleSelectableCommandObjects,
  resolveInvertSelectionObjectIds,
  resolveMockRenderStatus,
  resolveRadiusSelectionObjectIds,
  resolveSelectSameResRefObjectIds,
  type MockRenderStatus
} from "./workspaceSceneInteraction";

interface UseWorkspaceCommandSignalArgs<TRuntime, TCameraBookmark> {
  commandSignal: WorkspaceCommandSignal | null;
  commandRevisionRef: { current: number };
  runtimeRef: WorkspaceRuntimeRef<TRuntime>;
  bookmark1Ref: { current: TCameraBookmark | null };
  cameraRuntimePort: WorkspaceCameraRuntimePort<TRuntime, TCameraBookmark>;
  scene: AreaScene;
  sceneViewportPort: SceneViewportPort;
  setSceneHistory: Dispatch<SetStateAction<SceneHistoryState>>;
  setSelectedObjectIds: Dispatch<SetStateAction<string[]>>;
  setSelectedTileId: Dispatch<SetStateAction<string | null>>;
  setLastSavedAtUnixMs: Dispatch<SetStateAction<number | null>>;
  copySelectedObjectsToClipboard: (source: string) => SceneObject[];
  deleteSelectedObjects: (source: string) => number;
  duplicateObjects: (
    sourceObjects: SceneObject[],
    source: string,
    anchorOverride?: { x: number; y: number }
  ) => SceneObject[];
  isSelectableByActiveFilters: (object: SceneObject) => boolean;
  renderAreaGeometry: boolean;
  selectedObjectIds: string[];
  toolbarState: WorkspaceToolbarState;
  userId: string;
  visibleObjects: SceneObject[];
  trackTelemetry: (name: string, payload?: TelemetryPayload) => void;
}

export function useWorkspaceCommandSignal<TRuntime, TCameraBookmark>({
  commandSignal,
  commandRevisionRef,
  runtimeRef,
  bookmark1Ref,
  cameraRuntimePort,
  scene,
  sceneViewportPort,
  setSceneHistory,
  setSelectedObjectIds,
  setSelectedTileId,
  setLastSavedAtUnixMs,
  copySelectedObjectsToClipboard,
  deleteSelectedObjects,
  duplicateObjects,
  isSelectableByActiveFilters,
  renderAreaGeometry,
  selectedObjectIds,
  toolbarState,
  userId,
  visibleObjects,
  trackTelemetry
}: UseWorkspaceCommandSignalArgs<TRuntime, TCameraBookmark>) {
  useEffect(() => {
    if (!commandSignal || commandSignal.revision <= commandRevisionRef.current) {
      return;
    }

    commandRevisionRef.current = commandSignal.revision;

    if (commandSignal.actionKey === "undo") {
      setSceneHistory((current) => sceneViewportPort.undoHistory(current));
      trackTelemetry("scene.undo", { userId });
      return;
    }

    if (commandSignal.actionKey === "redo") {
      setSceneHistory((current) => sceneViewportPort.redoHistory(current));
      trackTelemetry("scene.redo", { userId });
      return;
    }

    if (
      commandSignal.actionKey === "fit_area_view" ||
      commandSignal.actionKey === "reorient_camera"
    ) {
      const runtime = runtimeRef.current;
      if (runtime) {
        cameraRuntimePort.centerCameraForScene(runtime, scene, {
          objectPreview: !renderAreaGeometry
        });
      }
      trackTelemetry(
        commandSignal.actionKey === "fit_area_view"
          ? "scene.camera.fit_area"
          : "scene.camera.reorient",
        {
          userId,
          sceneId: scene.sceneId
        }
      );
      return;
    }

    if (commandSignal.actionKey === "save_local_draft") {
      try {
        sceneViewportPort.saveLocalDraft(userId, scene);
        const savedAt = Date.now();
        setLastSavedAtUnixMs(savedAt);
        trackTelemetry("scene.save_local_draft", {
          userId,
          sceneId: scene.sceneId,
          objectCount: scene.objects.length,
          tileCount: scene.tiles.length
        });
      } catch {
        trackTelemetry("scene.save_local_draft_failed", {
          userId,
          sceneId: scene.sceneId
        });
      }
      return;
    }

    if (commandSignal.actionKey === "copy_selected_objects") {
      const copied = copySelectedObjectsToClipboard("toolbar_canvas");
      if (copied.length > 0) {
        duplicateObjects(copied, "toolbar_canvas");
      }
      return;
    }

    if (commandSignal.actionKey === "delete_selected_objects") {
      deleteSelectedObjects("toolbar_canvas");
      return;
    }

    if (commandSignal.actionKey === "select_same_resref") {
      const selectableObjects = filterVisibleSelectableCommandObjects({
        visibleObjects,
        toolbarState,
        isSelectableByActiveFilters
      });
      const nextIds = resolveSelectSameResRefObjectIds({
        selectedObjectIds,
        selectableObjects
      });
      const anchor = selectableObjects.find((object) => selectedObjectIds.includes(object.id));
      if (anchor) {
        setSelectedObjectIds(nextIds);
        setSelectedTileId(null);
        trackTelemetry("scene.selection.same_resref", {
          userId,
          anchorObjectId: anchor.id,
          selectedCount: nextIds.length
        });
      }
      return;
    }

    if (commandSignal.actionKey === "select_invert") {
      const selectableObjects = filterVisibleSelectableCommandObjects({
        visibleObjects,
        toolbarState,
        isSelectableByActiveFilters
      });
      const inverted = resolveInvertSelectionObjectIds({
        selectedObjectIds,
        selectableObjects
      });
      setSelectedObjectIds(inverted);
      setSelectedTileId(null);
      trackTelemetry("scene.selection.invert", {
        userId,
        selectedCount: inverted.length
      });
      return;
    }

    if (commandSignal.actionKey === "select_radius") {
      const selectableObjects = filterVisibleSelectableCommandObjects({
        visibleObjects,
        toolbarState,
        isSelectableByActiveFilters
      });
      const radius = 3.6;
      const nextIds = resolveRadiusSelectionObjectIds({
        selectedObjectIds,
        selectableObjects,
        radius
      });
      if (nextIds.length > 0) {
        setSelectedObjectIds(nextIds);
        trackTelemetry("scene.selection.radius", {
          userId,
          selectedCount: nextIds.length,
          radius
        });
      }
      return;
    }

    if (commandSignal.actionKey === "camera_bookmark_save_1") {
      const runtime = runtimeRef.current;
      if (runtime) {
        bookmark1Ref.current = cameraRuntimePort.createCameraBookmark(runtime);
        trackTelemetry("scene.camera.bookmark_saved", {
          userId,
          slot: 1
        });
      }
      return;
    }

    if (commandSignal.actionKey === "camera_bookmark_load_1") {
      const runtime = runtimeRef.current;
      const bookmark = bookmark1Ref.current;
      if (runtime && bookmark) {
        cameraRuntimePort.restoreCameraBookmark(runtime, bookmark);
        trackTelemetry("scene.camera.bookmark_loaded", {
          userId,
          slot: 1
        });
      } else {
        trackTelemetry("scene.camera.bookmark_missing", {
          userId,
          slot: 1
        });
      }
      return;
    }

    if (commandSignal.actionKey === "debug_export_status_report") {
      const statusByKind = scene.objects.reduce<Record<SceneObjectKind, Record<MockRenderStatus, number>>>(
        (acc, object) => {
          const status = resolveMockRenderStatus(object);
          acc[object.kind][status] += 1;
          return acc;
        },
        {
          creatures: { ok: 0, warning: 0, error: 0, non_render: 0 },
          doors: { ok: 0, warning: 0, error: 0, non_render: 0 },
          items: { ok: 0, warning: 0, error: 0, non_render: 0 },
          placeables: { ok: 0, warning: 0, error: 0, non_render: 0 },
          sounds: { ok: 0, warning: 0, error: 0, non_render: 0 }
        }
      );

      const report = {
        generatedAtIso: new Date().toISOString(),
        sceneId: scene.sceneId,
        areaName: scene.areaName,
        objectCount: scene.objects.length,
        tileCount: scene.tiles.length,
        statusByKind
      };

      try {
        const blob = new Blob([JSON.stringify(report, null, 2)], {
          type: "application/json"
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${scene.sceneId}_status_report.json`;
        anchor.click();
        URL.revokeObjectURL(url);
        trackTelemetry("scene.debug.export_status_report", {
          userId,
          sceneId: scene.sceneId,
          objectCount: scene.objects.length
        });
      } catch {
        trackTelemetry("scene.debug.export_status_report_failed", {
          userId,
          sceneId: scene.sceneId
        });
      }
    }
  }, [
    bookmark1Ref,
    cameraRuntimePort,
    commandRevisionRef,
    commandSignal,
    copySelectedObjectsToClipboard,
    deleteSelectedObjects,
    duplicateObjects,
    isSelectableByActiveFilters,
    renderAreaGeometry,
    runtimeRef,
    scene,
    sceneViewportPort,
    selectedObjectIds,
    setLastSavedAtUnixMs,
    setSceneHistory,
    setSelectedObjectIds,
    setSelectedTileId,
    toolbarState.canvasDebug,
    trackTelemetry,
    userId,
    visibleObjects
  ]);
}
