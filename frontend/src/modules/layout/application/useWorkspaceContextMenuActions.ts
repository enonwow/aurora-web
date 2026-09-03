import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { TelemetryPayload } from "../../telemetry/domain/telemetryEvent";
import type { SceneViewportPort } from "../../scene/application/sceneViewportPort";
import type {
  SceneHistoryState,
  SceneObject,
  SceneObjectKind
} from "../contracts";
import type { WorkspaceToolbarState } from "./workspaceChromeFacade";
import { MOVE_ALLOWED_KINDS, isKindLocked } from "./workspaceSceneInteraction";

export interface ContextMenuState {
  x: number;
  y: number;
  objectId: string;
  objectKind: SceneObjectKind;
  anchorOffsetX: number;
  anchorOffsetY: number;
}

export type WorkspaceContextMenuAction =
  | "adjust_location"
  | "delete"
  | "variables"
  | "properties"
  | "duplicate"
  | "focus"
  | "copy_world_position"
  | "reset_transform";

interface UseWorkspaceContextMenuActionsArgs {
  contextMenu: ContextMenuState | null;
  setContextMenu: Dispatch<SetStateAction<ContextMenuState | null>>;
  sceneObjects: SceneObject[];
  visibleObjectIdsSet: ReadonlySet<string>;
  sceneViewportPort: SceneViewportPort;
  setSceneHistory: Dispatch<SetStateAction<SceneHistoryState>>;
  selectedObjectIds: string[];
  setSelectedObjectIds: Dispatch<SetStateAction<string[]>>;
  setSelectedTileId: Dispatch<SetStateAction<string | null>>;
  toolbarState: WorkspaceToolbarState;
  userId: string;
  trackTelemetry: (name: string, payload?: TelemetryPayload) => void;
  duplicateObjects: (sourceObjects: SceneObject[], source: string) => SceneObject[];
  focusCameraOnWorldPoint: (x: number, y: number) => void;
  openAdjustLocationDialog: (targets: SceneObject[]) => void;
  openAreaObjectPolygonDialog?: (target: SceneObject) => void;
  openWaypointPropertiesDialog?: (target: SceneObject) => void;
  openPlaceablePropertiesDialog: (target: SceneObject) => void;
  openSoundPropertiesDialog: (target: SceneObject) => void;
  openDoorPropertiesDialog: (target: SceneObject) => void;
  openCreaturePropertiesDialog: (target: SceneObject) => void;
  openItemPropertiesDialog: (target: SceneObject) => void;
  openStorePropertiesDialog?: (target: SceneObject) => void;
  clearAdjustLocationDialog: () => void;
  clearAreaObjectPolygonDialog?: () => void;
  clearWaypointPropertiesDialog?: () => void;
  clearPlaceablePropertiesDialog: () => void;
  clearSoundPropertiesDialog: () => void;
  clearDoorPropertiesDialog: () => void;
  clearCreaturePropertiesDialog: () => void;
  clearItemPropertiesDialog: () => void;
  clearStorePropertiesDialog?: () => void;
}

export function resolveContextMenuActionObject(input: {
  contextMenu: ContextMenuState | null;
  sceneObjects: readonly SceneObject[];
  visibleObjectIdsSet: ReadonlySet<string>;
}): SceneObject | null {
  if (!input.contextMenu || !input.visibleObjectIdsSet.has(input.contextMenu.objectId)) {
    return null;
  }
  return input.sceneObjects.find((object) => object.id === input.contextMenu?.objectId) ?? null;
}

export const resolveVisibleContextMenuTargetObject = resolveContextMenuActionObject;

export function resolveContextMenuAdjustLocationTargets(input: {
  contextObject: SceneObject;
  sceneObjects: readonly SceneObject[];
  selectedObjectIds: readonly string[];
  visibleObjectIdsSet: ReadonlySet<string>;
  toolbarState: WorkspaceToolbarState;
}): {
  editableTargets: SceneObject[];
  resolvedTargetCount: number;
} {
  const selectedObjects = input.selectedObjectIds
    .filter((id) => input.visibleObjectIdsSet.has(id))
    .map((id) => input.sceneObjects.find((object) => object.id === id) ?? null)
    .filter((object): object is SceneObject => Boolean(object));
  const selectionIncludesContext = selectedObjects.some(
    (object) => object.id === input.contextObject.id
  );
  const resolvedTargets =
    selectionIncludesContext && selectedObjects.length > 1
      ? selectedObjects
      : [input.contextObject];
  const editableTargets = resolvedTargets.filter(
    (object) =>
      MOVE_ALLOWED_KINDS.has(object.kind) &&
      !isKindLocked(input.toolbarState.canvasDebug, object.kind)
  );
  return {
    editableTargets,
    resolvedTargetCount: resolvedTargets.length
  };
}

export function resolveContextMenuDuplicateSourceObjects(input: {
  contextMenu: ContextMenuState | null;
  sceneObjects: readonly SceneObject[];
  visibleObjectIdsSet: ReadonlySet<string>;
}): SceneObject[] {
  const contextObject = resolveContextMenuActionObject(input);
  return contextObject ? [contextObject] : [];
}

export const resolveContextMenuDeleteTargetObject = resolveVisibleContextMenuTargetObject;

export const resolveContextMenuReadOnlyTargetObject = resolveVisibleContextMenuTargetObject;

export const resolveContextMenuResetTransformTargetObject = resolveVisibleContextMenuTargetObject;

export function useWorkspaceContextMenuActions({
  contextMenu,
  setContextMenu,
  sceneObjects,
  visibleObjectIdsSet,
  sceneViewportPort,
  setSceneHistory,
  selectedObjectIds,
  setSelectedObjectIds,
  setSelectedTileId,
  toolbarState,
  userId,
  trackTelemetry,
  duplicateObjects,
  focusCameraOnWorldPoint,
  openAdjustLocationDialog,
  openAreaObjectPolygonDialog = () => undefined,
  openWaypointPropertiesDialog = () => undefined,
  openPlaceablePropertiesDialog,
  openSoundPropertiesDialog,
  openDoorPropertiesDialog,
  openCreaturePropertiesDialog,
  openItemPropertiesDialog,
  openStorePropertiesDialog = () => undefined,
  clearAdjustLocationDialog,
  clearAreaObjectPolygonDialog = () => undefined,
  clearWaypointPropertiesDialog = () => undefined,
  clearPlaceablePropertiesDialog,
  clearSoundPropertiesDialog,
  clearDoorPropertiesDialog,
  clearCreaturePropertiesDialog,
  clearItemPropertiesDialog,
  clearStorePropertiesDialog = () => undefined,
}: UseWorkspaceContextMenuActionsArgs) {
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, [setContextMenu]);

  const handleContextAction = useCallback(
    (action: WorkspaceContextMenuAction) => {
      if (!contextMenu) {
        return;
      }

      const contextObj = resolveContextMenuActionObject({
        contextMenu,
        sceneObjects,
        visibleObjectIdsSet
      });
      if (!contextObj) {
        closeContextMenu();
        return;
      }

      if (isKindLocked(toolbarState.canvasDebug, contextObj.kind)) {
        trackTelemetry("scene.context_menu.action_blocked_locked_layer", {
          userId,
          objectId: contextObj.id,
          objectKind: contextObj.kind,
          action
        });
        closeContextMenu();
        return;
      }

      if (action === "adjust_location") {
        const { editableTargets, resolvedTargetCount } = resolveContextMenuAdjustLocationTargets({
          contextObject: contextObj,
          sceneObjects,
          selectedObjectIds,
          visibleObjectIdsSet,
          toolbarState
        });
        if (
          editableTargets.length === 0 ||
          editableTargets.some((object) => object.kind === "doors")
        ) {
          trackTelemetry("scene.adjust_location.blocked", {
            userId,
            objectId: contextObj.id,
            objectKind: contextObj.kind,
            selectedCount: resolvedTargetCount
          });
          closeContextMenu();
          return;
        }

        setSelectedTileId(null);
        setSelectedObjectIds(editableTargets.map((object) => object.id));
        clearPlaceablePropertiesDialog();
        clearSoundPropertiesDialog();
        clearDoorPropertiesDialog();
        clearCreaturePropertiesDialog();
        clearItemPropertiesDialog();
        clearStorePropertiesDialog();
        openAdjustLocationDialog(editableTargets);
        trackTelemetry("scene.context_menu.action", {
          userId,
          objectId: contextObj.id,
          objectKind: contextObj.kind,
          action
        });
        closeContextMenu();
        return;
      }

      if (action === "properties") {
        if (
          contextObj.kind !== "placeables" &&
          contextObj.kind !== "sounds" &&
          contextObj.kind !== "doors" &&
          contextObj.kind !== "creatures" &&
          contextObj.kind !== "items" &&
          contextObj.kind !== "stores" &&
          contextObj.kind !== "triggers" &&
          contextObj.kind !== "encounters" &&
          contextObj.kind !== "waypoints"
        ) {
          trackTelemetry("scene.object_properties.blocked_kind", {
            userId,
            objectId: contextObj.id,
            objectKind: contextObj.kind
          });
          closeContextMenu();
          return;
        }

        setSelectedTileId(null);
        setSelectedObjectIds([contextObj.id]);
        clearAdjustLocationDialog();
        if (contextObj.kind === "placeables") {
          clearAreaObjectPolygonDialog();
          clearWaypointPropertiesDialog();
          clearSoundPropertiesDialog();
          clearDoorPropertiesDialog();
          clearCreaturePropertiesDialog();
          clearItemPropertiesDialog();
          clearStorePropertiesDialog();
          openPlaceablePropertiesDialog(contextObj);
        } else if (contextObj.kind === "sounds") {
          clearAreaObjectPolygonDialog();
          clearWaypointPropertiesDialog();
          clearPlaceablePropertiesDialog();
          clearDoorPropertiesDialog();
          clearCreaturePropertiesDialog();
          clearItemPropertiesDialog();
          clearStorePropertiesDialog();
          openSoundPropertiesDialog(contextObj);
        } else if (contextObj.kind === "creatures") {
          clearAreaObjectPolygonDialog();
          clearWaypointPropertiesDialog();
          clearPlaceablePropertiesDialog();
          clearSoundPropertiesDialog();
          clearDoorPropertiesDialog();
          clearItemPropertiesDialog();
          clearStorePropertiesDialog();
          openCreaturePropertiesDialog(contextObj);
        } else if (contextObj.kind === "items") {
          clearAreaObjectPolygonDialog();
          clearWaypointPropertiesDialog();
          clearPlaceablePropertiesDialog();
          clearSoundPropertiesDialog();
          clearDoorPropertiesDialog();
          clearCreaturePropertiesDialog();
          clearStorePropertiesDialog();
          openItemPropertiesDialog(contextObj);
        } else if (contextObj.kind === "stores") {
          clearAreaObjectPolygonDialog();
          clearWaypointPropertiesDialog();
          clearPlaceablePropertiesDialog();
          clearSoundPropertiesDialog();
          clearDoorPropertiesDialog();
          clearCreaturePropertiesDialog();
          clearItemPropertiesDialog();
          openStorePropertiesDialog(contextObj);
        } else if (contextObj.kind === "doors") {
          clearAreaObjectPolygonDialog();
          clearWaypointPropertiesDialog();
          clearPlaceablePropertiesDialog();
          clearSoundPropertiesDialog();
          clearCreaturePropertiesDialog();
          clearItemPropertiesDialog();
          clearStorePropertiesDialog();
          openDoorPropertiesDialog(contextObj);
        } else if (contextObj.kind === "waypoints") {
          clearAreaObjectPolygonDialog();
          clearPlaceablePropertiesDialog();
          clearSoundPropertiesDialog();
          clearDoorPropertiesDialog();
          clearCreaturePropertiesDialog();
          clearItemPropertiesDialog();
          clearStorePropertiesDialog();
          openWaypointPropertiesDialog(contextObj);
        } else {
          clearWaypointPropertiesDialog();
          clearPlaceablePropertiesDialog();
          clearSoundPropertiesDialog();
          clearDoorPropertiesDialog();
          clearCreaturePropertiesDialog();
          clearItemPropertiesDialog();
          clearStorePropertiesDialog();
          openAreaObjectPolygonDialog(contextObj);
        }
        trackTelemetry("scene.context_menu.action", {
          userId,
          objectId: contextObj.id,
          objectKind: contextObj.kind,
          action
        });
        closeContextMenu();
        return;
      }

      if (action === "delete") {
        const deleteTarget = resolveContextMenuDeleteTargetObject({
          contextMenu,
          sceneObjects,
          visibleObjectIdsSet
        });
        if (!deleteTarget) {
          closeContextMenu();
          return;
        }
        setSceneHistory((current) => {
          const nextScene = sceneViewportPort.deleteObjectById(
            current.present,
            deleteTarget.id
          );
          if (nextScene === current.present) {
            return current;
          }
          return sceneViewportPort.commitHistory(current, nextScene);
        });
        setSelectedObjectIds((current) =>
          current.filter((selectedId) => selectedId !== deleteTarget.id)
        );
        trackTelemetry("scene.context_menu.delete_object", {
          userId,
          objectId: deleteTarget.id,
          objectKind: deleteTarget.kind
        });
        trackTelemetry("scene.context_menu.action", {
          userId,
          objectId: deleteTarget.id,
          objectKind: deleteTarget.kind,
          action
        });
      } else if (action === "duplicate") {
        const duplicateSources = resolveContextMenuDuplicateSourceObjects({
          contextMenu,
          sceneObjects,
          visibleObjectIdsSet
        });
        if (duplicateSources.length === 0) {
          closeContextMenu();
          return;
        }
        duplicateObjects(duplicateSources, "context_menu");
        trackTelemetry("scene.context_menu.action", {
          userId,
          objectId: contextObj.id,
          objectKind: contextObj.kind,
          action
        });
      } else if (action === "focus") {
        const readOnlyTarget = resolveContextMenuReadOnlyTargetObject({
          contextMenu,
          sceneObjects,
          visibleObjectIdsSet
        });
        if (!readOnlyTarget) {
          closeContextMenu();
          return;
        }
        focusCameraOnWorldPoint(readOnlyTarget.x, readOnlyTarget.y);
        trackTelemetry("scene.context_menu.action", {
          userId,
          objectId: readOnlyTarget.id,
          objectKind: readOnlyTarget.kind,
          action
        });
      } else if (action === "copy_world_position") {
        const readOnlyTarget = resolveContextMenuReadOnlyTargetObject({
          contextMenu,
          sceneObjects,
          visibleObjectIdsSet
        });
        if (!readOnlyTarget) {
          closeContextMenu();
          return;
        }
        const payload = JSON.stringify({
          x: readOnlyTarget.x,
          y: readOnlyTarget.y,
          z: readOnlyTarget.z
        });
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          void navigator.clipboard.writeText(payload).then(
            () =>
              trackTelemetry("scene.context_menu.copy_world_position", {
                userId,
                objectId: readOnlyTarget.id,
                copied: true
              }),
            () =>
              trackTelemetry("scene.context_menu.copy_world_position", {
                userId,
                objectId: readOnlyTarget.id,
                copied: false
              })
          );
        }
      } else if (action === "reset_transform") {
        const resetTarget = resolveContextMenuResetTransformTargetObject({
          contextMenu,
          sceneObjects,
          visibleObjectIdsSet
        });
        if (!resetTarget) {
          closeContextMenu();
          return;
        }
        setSceneHistory((current) => {
          const nextScene = sceneViewportPort.resetObjectTransform(
            current.present,
            resetTarget.id
          );
          if (nextScene === current.present) {
            return current;
          }
          return sceneViewportPort.commitHistory(current, nextScene);
        });
        trackTelemetry("scene.context_menu.action", {
          userId,
          objectId: resetTarget.id,
          objectKind: resetTarget.kind,
          action
        });
      } else {
        trackTelemetry("scene.context_menu.action", {
          userId,
          objectId: contextMenu.objectId,
          objectKind: contextMenu.objectKind,
          action
        });
      }

      closeContextMenu();
    },
    [
      clearAdjustLocationDialog,
      clearAreaObjectPolygonDialog,
      clearWaypointPropertiesDialog,
      clearCreaturePropertiesDialog,
      clearDoorPropertiesDialog,
      clearItemPropertiesDialog,
      clearPlaceablePropertiesDialog,
      clearSoundPropertiesDialog,
      clearStorePropertiesDialog,
      closeContextMenu,
      contextMenu,
      duplicateObjects,
      focusCameraOnWorldPoint,
      openAdjustLocationDialog,
      openAreaObjectPolygonDialog,
      openWaypointPropertiesDialog,
      openCreaturePropertiesDialog,
      openDoorPropertiesDialog,
      openItemPropertiesDialog,
      openPlaceablePropertiesDialog,
      openSoundPropertiesDialog,
      openStorePropertiesDialog,
      sceneObjects,
      sceneViewportPort,
      selectedObjectIds,
      setSceneHistory,
      setSelectedObjectIds,
      setSelectedTileId,
      toolbarState.canvasDebug,
      trackTelemetry,
      userId,
      visibleObjectIdsSet
    ]
  );

  return { closeContextMenu, handleContextAction };
}
