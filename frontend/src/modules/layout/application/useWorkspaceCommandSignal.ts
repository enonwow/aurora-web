import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { TelemetryPayload } from "../../telemetry/domain/telemetryEvent";
import type { SceneViewportPort } from "../../scene/application/sceneViewportPort";
import type { AreaLifecycleFacade } from "../../areas/application/areaLifecycleFacade";
import { createAreaDraftSaveQueue } from "../../areas/application/areaDraftSaveQueue";
import { buildAreaWorkspaceDraftPayload } from "../../areas/application/areaWorkspaceDraft";
import type { AreaWorkspaceStatusEvent } from "../../areas/application/areaWorkspaceStatus";
import type { AreaWorkspaceDraftDocument } from "../../areas/areaWorkspaceDraftContracts";
import type { AreaApiDetail } from "../../areas/contracts";
import type {
  AreaDraftSessionRegistry,
  ProductionAreaDraftPayload
} from "../../areas/ports/areaLifecyclePort";
import type {
  AreaScene,
  SceneHistoryState,
  SceneObject
} from "../contracts";
import type { AreaTileProcessContractReadiness } from "../../tiles/application/areaTileProcessContractReadiness";
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
  resolveRadiusSelectionObjectIds,
  resolveSelectSameResRefObjectIds
} from "./workspaceSceneInteraction";
import {
  buildAreaWorkspaceDiagnosticsFilename,
  buildAreaWorkspaceDiagnosticsReport
} from "./areaWorkspaceDiagnosticsReport";

const AREA_ORACLE_TOP_DOWN_CAMERA_EVENT = "aurora:areas:oracle-top-down-camera";

interface UseWorkspaceCommandSignalArgs<TRuntime, TCameraBookmark> {
  commandSignal: WorkspaceCommandSignal | null;
  commandRevisionRef: { current: number };
  runtimeRef: WorkspaceRuntimeRef<TRuntime>;
  bookmark1Ref: { current: TCameraBookmark | null };
  cameraRuntimePort: WorkspaceCameraRuntimePort<TRuntime, TCameraBookmark>;
  scene: AreaScene;
  sceneViewportPort: SceneViewportPort;
  areaLifecycleFacade?: AreaLifecycleFacade<AreaWorkspaceDraftDocument>;
  areaDraftSessionRegistry?: AreaDraftSessionRegistry;
  onAreaDraftPersisted?: () => void;
  createIdempotencyKey?: (commandRevision: number) => string;
  setSceneHistory: Dispatch<SetStateAction<SceneHistoryState>>;
  setSelectedObjectIds: Dispatch<SetStateAction<string[]>>;
  setSelectedTileId: Dispatch<SetStateAction<string | null>>;
  setLastSavedAtUnixMs: Dispatch<SetStateAction<number | null>>;
  onAreaWorkspaceStatusChange?: (event: AreaWorkspaceStatusEvent) => void;
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
  selectedTileIds?: readonly string[];
  tileProcessReadiness?: AreaTileProcessContractReadiness | null;
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
  areaLifecycleFacade,
  areaDraftSessionRegistry,
  onAreaDraftPersisted,
  createIdempotencyKey = defaultAreaDraftIdempotencyKey,
  setSceneHistory,
  setSelectedObjectIds,
  setSelectedTileId,
  setLastSavedAtUnixMs,
  onAreaWorkspaceStatusChange,
  copySelectedObjectsToClipboard,
  deleteSelectedObjects,
  duplicateObjects,
  isSelectableByActiveFilters,
  renderAreaGeometry,
  selectedObjectIds,
  selectedTileIds = [],
  tileProcessReadiness = null,
  toolbarState,
  userId,
  visibleObjects,
  trackTelemetry
}: UseWorkspaceCommandSignalArgs<TRuntime, TCameraBookmark>) {
  const internalAreaDraftSessionRegistry = useRef<
    AreaDraftSessionRegistry["current"]
  >({});
  const remoteAreaDraftSaveQueueRef = useRef(createAreaDraftSaveQueue());
  const activeAreaDraftSessionRegistry =
    areaDraftSessionRegistry ?? internalAreaDraftSessionRegistry;

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

    if (commandSignal.actionKey === "top_down_oracle_view") {
      const runtime = runtimeRef.current;
      const runtimeContainer = (runtime as { container?: EventTarget } | null)?.container;
      if (runtimeContainer) {
        runtimeContainer.dispatchEvent(
          new CustomEvent(AREA_ORACLE_TOP_DOWN_CAMERA_EVENT, {
            detail: {
              cleanCanvas: true,
              displayFog: false,
              tileLightsVisible: false,
              terrainVoidMasksVisible: false,
              useAreaLighting: false
            }
          })
        );
      }
      trackTelemetry("scene.camera.top_down_oracle", {
        userId,
        sceneId: scene.sceneId
      });
      return;
    }

    if (commandSignal.actionKey === "save_local_draft") {
      try {
        sceneViewportPort.saveLocalDraft(userId, scene);
        trackTelemetry("scene.save_local_draft", {
          userId,
          sceneId: scene.sceneId,
          objectCount: scene.objects.length,
          tileCount: scene.tiles.length
        });

        if (areaLifecycleFacade) {
          const commandRevision = commandSignal.revision;
          const sceneId = scene.sceneId;
          onAreaWorkspaceStatusChange?.({
            schemaVersion: "area-workspace-status.v1",
            lane: "draft",
            state: "saving",
            sceneId,
            sceneUpdatedAtUnixMs: scene.updatedAtUnixMs,
            commandRevision,
            occurredAtUnixMs: Date.now(),
            browserRecoveryAvailable: true,
            destination: "remote"
          });
          const queuedSave = remoteAreaDraftSaveQueueRef.current.enqueue(
            sceneId,
            async () => {
              const existingSession =
                activeAreaDraftSessionRegistry.current[sceneId];
              const productionSource = existingSession?.productionSource as
                | ProductionAreaDraftPayload<AreaApiDetail, AreaScene>
                | undefined;
              const document: AreaWorkspaceDraftDocument = {
                schemaVersion: "area-draft.v1",
                title: scene.areaName,
                source: productionSource
                  ? {
                      type: "production_area",
                      areaId: productionSource.provenance.areaId
                    }
                  : scene.source === "aurora_area"
                    ? { type: "production_area", areaId: scene.sceneId }
                    : { type: "new" },
                payload: buildAreaWorkspaceDraftPayload(scene, productionSource)
              };
              const draftId = existingSession?.draftId ?? sceneId;
              const expectedRevision = existingSession?.revision ?? 0;
              const result = await areaLifecycleFacade.commands.saveLocalDraft({
                draftId,
                expectedRevision,
                idempotencyKey: createIdempotencyKey(commandRevision),
                schemaVersion: document.schemaVersion,
                draft: document
              });
              if (!result.ok) {
                onAreaWorkspaceStatusChange?.({
                  schemaVersion: "area-workspace-status.v1",
                  lane: "draft",
                  state: result.error.code === "STALE_REVISION" ? "conflict" : "recovery",
                  sceneId,
                  sceneUpdatedAtUnixMs: scene.updatedAtUnixMs,
                  commandRevision,
                  occurredAtUnixMs: Date.now(),
                  browserRecoveryAvailable: true,
                  destination: "remote",
                  code: result.error.code,
                  expectedRevision: result.error.expectedRevision,
                  actualRevision: result.error.actualRevision
                });
                trackTelemetry("scene.save_local_draft_remote_failed", {
                  userId,
                  sceneId,
                  code: result.error.code,
                  recovery: result.error.recovery,
                  expectedRevision: result.error.expectedRevision,
                  actualRevision: result.error.actualRevision
                });
                return;
              }
              activeAreaDraftSessionRegistry.current[sceneId] = {
                draftId: result.value.draftId,
                revision: result.value.revision,
                normalizedSha256: result.value.normalizedSha256,
                persistedSceneUpdatedAtUnixMs: scene.updatedAtUnixMs,
                ...(productionSource ? { productionSource } : {})
              };
              setLastSavedAtUnixMs(Date.now());
              onAreaWorkspaceStatusChange?.({
                schemaVersion: "area-workspace-status.v1",
                lane: "draft",
                state: "saved",
                sceneId,
                sceneUpdatedAtUnixMs: scene.updatedAtUnixMs,
                commandRevision,
                occurredAtUnixMs: Date.now(),
                browserRecoveryAvailable: true,
                destination: "remote",
                draftId: result.value.draftId,
                revision: result.value.revision
              });
              onAreaDraftPersisted?.();
              trackTelemetry("scene.save_local_draft_remote", {
                userId,
                sceneId,
                draftId: result.value.draftId,
                revision: result.value.revision,
                idempotencyStatus: result.metadata.idempotencyStatus
              });
            }
          );
          void queuedSave.catch(() => {
            onAreaWorkspaceStatusChange?.({
              schemaVersion: "area-workspace-status.v1",
              lane: "draft",
              state: "recovery",
              sceneId,
              sceneUpdatedAtUnixMs: scene.updatedAtUnixMs,
              commandRevision,
              occurredAtUnixMs: Date.now(),
              browserRecoveryAvailable: true,
              destination: "remote",
              code: "PORT_FAILURE"
            });
            trackTelemetry("scene.save_local_draft_remote_failed", {
              userId,
              sceneId,
              code: "PORT_FAILURE",
              recovery: "retry"
            });
          });
        } else {
          setLastSavedAtUnixMs(Date.now());
          onAreaWorkspaceStatusChange?.({
            schemaVersion: "area-workspace-status.v1",
            lane: "draft",
            state: "saved",
            sceneId: scene.sceneId,
            sceneUpdatedAtUnixMs: scene.updatedAtUnixMs,
            commandRevision: commandSignal.revision,
            occurredAtUnixMs: Date.now(),
            browserRecoveryAvailable: true,
            destination: "browser"
          });
        }
      } catch {
        onAreaWorkspaceStatusChange?.({
          schemaVersion: "area-workspace-status.v1",
          lane: "draft",
          state: "failed",
          sceneId: scene.sceneId,
          sceneUpdatedAtUnixMs: scene.updatedAtUnixMs,
          commandRevision: commandSignal.revision,
          occurredAtUnixMs: Date.now(),
          browserRecoveryAvailable: false,
          code: "BROWSER_DRAFT_SAVE_FAILED"
        });
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
      const built = buildAreaWorkspaceDiagnosticsReport({
        generatedAtIso: new Date().toISOString(),
        scene,
        selectedObjectIds,
        selectedTileIds,
        tileProcessReadiness
      });
      if (!built.ok) {
        trackTelemetry("scene.debug.export_status_report_failed", {
          userId,
          sceneId: scene.sceneId,
          code: built.code
        });
        return;
      }

      try {
        const blob = new Blob([JSON.stringify(built.report, null, 2)], {
          type: "application/json"
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = buildAreaWorkspaceDiagnosticsFilename(scene.sceneId);
        anchor.click();
        URL.revokeObjectURL(url);
        trackTelemetry("scene.debug.export_status_report", {
          userId,
          sceneId: scene.sceneId,
          schemaVersion: built.report.schemaVersion,
          tileCount: built.report.area.tileCount,
          objectCount: built.report.area.objectCount,
          issueCount: built.report.summary.issueCount,
          resourceStatus: built.report.resources.status
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
    areaLifecycleFacade,
    activeAreaDraftSessionRegistry,
    cameraRuntimePort,
    commandRevisionRef,
    commandSignal,
    createIdempotencyKey,
    copySelectedObjectsToClipboard,
    deleteSelectedObjects,
    duplicateObjects,
    isSelectableByActiveFilters,
    onAreaDraftPersisted,
    onAreaWorkspaceStatusChange,
    renderAreaGeometry,
    runtimeRef,
    scene,
    sceneViewportPort,
    selectedObjectIds,
    selectedTileIds,
    setLastSavedAtUnixMs,
    setSceneHistory,
    setSelectedObjectIds,
    setSelectedTileId,
    toolbarState.canvasDebug,
    tileProcessReadiness,
    trackTelemetry,
    userId,
    visibleObjects
  ]);
}

function defaultAreaDraftIdempotencyKey(commandRevision: number): string {
  const randomId = globalThis.crypto?.randomUUID?.();
  return randomId
    ? `area-draft-save:${randomId}`
    : `area-draft-save:${Date.now()}:${commandRevision}`;
}
