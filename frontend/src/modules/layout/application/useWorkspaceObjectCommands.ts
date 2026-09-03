import { useCallback } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { TelemetryPayload } from "../../telemetry/domain/telemetryEvent";
import type { SceneViewportPort } from "../../scene/application/sceneViewportPort";
import { cloneSceneObjectVfxPayload } from "../../scene/domain/auroraVfxPayload";
import type { AreaScene, SceneHistoryState, SceneObject } from "../contracts";
import type { WorkspaceOptionSettings } from "./layoutPreferencesFacade";
import type { WorkspaceToolbarState } from "./workspaceChromeFacade";
import {
  cloneSceneObject,
  cloneSceneObjectCreatureProperties
} from "./workspaceSceneObjectClone";
import {
  clampTranslationDeltaToSceneBounds,
  filterUnlockedVisibleSelectedObjects,
  isKindLocked,
  resolveMovableVisibleSelection,
  snapAngleRadians,
  snapHeightValue
} from "./workspaceSceneInteraction";
import { cloneDoorTransitionPreserveOnlyPayload } from "./doorTransitionStorageProvenance";

interface UseWorkspaceObjectCommandsArgs {
  scene: AreaScene;
  visibleObjects: SceneObject[];
  sceneViewportPort: SceneViewportPort;
  selectedObjectIds: string[];
  setSelectedObjectIds: Dispatch<SetStateAction<string[]>>;
  setSelectedTileId: Dispatch<SetStateAction<string | null>>;
  setSceneHistory: Dispatch<SetStateAction<SceneHistoryState>>;
  toolbarState: WorkspaceToolbarState;
  workspaceOptions: WorkspaceOptionSettings;
  userId: string;
  lastPointerWorldRef: MutableRefObject<{ x: number; y: number } | null>;
  nextObjectSequenceRef: MutableRefObject<number>;
  clipboardObjectsRef: MutableRefObject<SceneObject[]>;
  trackTelemetry: (name: string, payload?: TelemetryPayload) => void;
}

export function useWorkspaceObjectCommands({
  scene,
  visibleObjects,
  sceneViewportPort,
  selectedObjectIds,
  setSelectedObjectIds,
  setSelectedTileId,
  setSceneHistory,
  toolbarState,
  workspaceOptions,
  userId,
  lastPointerWorldRef,
  nextObjectSequenceRef,
  clipboardObjectsRef,
  trackTelemetry
}: UseWorkspaceObjectCommandsArgs) {
  const getUnlockedSelectedObjects = useCallback(
    (objects: SceneObject[]): SceneObject[] =>
      filterUnlockedVisibleSelectedObjects({
        selectedObjectIds,
        objects,
        toolbarState
      }),
    [selectedObjectIds, toolbarState.canvasDebug]
  );

  const resolveCopyAnchor = useCallback(
    (sourceObjects: SceneObject[]): { x: number; y: number } | null => {
      const fallbackOffset = toolbarState.canvasDebug.snapGrid
        ? Math.max(0.1, workspaceOptions.snapGridStep)
        : 0.35;
      return sceneViewportPort.resolveCopyAnchor({
        cursorAnchor: lastPointerWorldRef.current,
        sourcePoints: sourceObjects.map((object) => ({ x: object.x, y: object.y })),
        fallbackOffset
      });
    },
    [
      lastPointerWorldRef,
      sceneViewportPort,
      toolbarState.canvasDebug.snapGrid,
      workspaceOptions.snapGridStep
    ]
  );

  const duplicateObjects = useCallback(
    (
      sourceObjects: SceneObject[],
      source: string,
      anchorOverride?: { x: number; y: number }
    ): SceneObject[] => {
      if (sourceObjects.length === 0) {
        trackTelemetry("scene.objects.copy_skipped", {
          userId,
          source,
          reason: "empty_source"
        });
        return [];
      }

      const copyableObjects = sourceObjects.filter((object) => object.kind !== "doors");
      const blockedDoorCount = sourceObjects.length - copyableObjects.length;
      if (blockedDoorCount > 0) {
        trackTelemetry("scene.objects.copy_blocked_door_hook", {
          userId,
          source,
          blockedCount: blockedDoorCount
        });
      }
      if (copyableObjects.length === 0) {
        return [];
      }

      const anchor = anchorOverride ?? resolveCopyAnchor(copyableObjects);
      const translation = anchor
        ? sceneViewportPort.computeCopyTranslation({
            sourcePoints: copyableObjects.map((object) => ({ x: object.x, y: object.y })),
            anchor,
            snapGrid: toolbarState.canvasDebug.snapGrid,
            snapGridStep: workspaceOptions.snapGridStep
          })
        : null;
      if (!anchor || !translation) {
        trackTelemetry("scene.objects.copy_skipped", {
          userId,
          source,
          reason: "anchor_unresolved"
        });
        return [];
      }

      const copies = copyableObjects.map((sourceObject) => {
        const nextSequence = nextObjectSequenceRef.current;
        nextObjectSequenceRef.current += 1;
        const sourceSnapshot = cloneSceneObject(sourceObject);

        const copy = sceneViewportPort.createObject(
          sourceObject.kind,
          sourceObject.x + translation.x,
          sourceObject.y + translation.y,
          nextSequence
        );
        copy.name = sourceSnapshot.name;
        copy.resRef = sourceObject.resRef;
        copy.tag = `${sourceObject.tag}_COPY`;
        copy.isStatic = sourceSnapshot.isStatic;
        copy.visualTransform = { ...sourceSnapshot.visualTransform };
        copy.placeableProperties = sourceSnapshot.placeableProperties
          ? {
              ...sourceSnapshot.placeableProperties,
              scriptSlots: sourceSnapshot.placeableProperties.scriptSlots
                ? { ...sourceSnapshot.placeableProperties.scriptSlots }
                : undefined,
              disabledFlags: sourceSnapshot.placeableProperties.disabledFlags
                ? { ...sourceSnapshot.placeableProperties.disabledFlags }
                : undefined,
              lockSettings: sourceSnapshot.placeableProperties.lockSettings
                ? { ...sourceSnapshot.placeableProperties.lockSettings }
                : undefined,
              trapSettings: sourceSnapshot.placeableProperties.trapSettings
                ? { ...sourceSnapshot.placeableProperties.trapSettings }
                : undefined,
              advancedSettings: sourceSnapshot.placeableProperties.advancedSettings
                ? { ...sourceSnapshot.placeableProperties.advancedSettings }
                : undefined
            }
          : undefined;
        copy.creatureProperties = cloneSceneObjectCreatureProperties(
          sourceSnapshot.creatureProperties
        );
        copy.soundPositioning = sourceSnapshot.soundPositioning
          ? {
              ...sourceSnapshot.soundPositioning,
              preserve: sourceSnapshot.soundPositioning.preserve
                ? {
                    ...sourceSnapshot.soundPositioning.preserve,
                    flags: { ...sourceSnapshot.soundPositioning.preserve.flags },
                    extra: { ...sourceSnapshot.soundPositioning.preserve.extra }
                  }
                : undefined
            }
          : undefined;
        copy.doorTransition = cloneDoorTransitionPreserveOnlyPayload(
          sourceSnapshot.doorTransition,
        );
        copy.vfxPayload = cloneSceneObjectVfxPayload(sourceSnapshot.vfxPayload);
        copy.z = toolbarState.canvasDebug.snapHeight
          ? snapHeightValue(sourceObject.z, workspaceOptions.snapHeightStep)
          : sourceObject.z;
        copy.bearing = toolbarState.canvasDebug.snapAngle
          ? snapAngleRadians(sourceObject.bearing, workspaceOptions.snapAngleStepDeg)
          : sourceObject.bearing;
        return copy;
      });

      setSceneHistory((current) =>
        sceneViewportPort.commitHistory(
          current,
          sceneViewportPort.appendObjects(current.present, copies)
        )
      );
      setSelectedObjectIds(copies.map((object) => object.id));
      setSelectedTileId(null);
      trackTelemetry("scene.objects.copy_created", {
        userId,
        source,
        copiedCount: copies.length,
        anchorX: anchor.x,
        anchorY: anchor.y,
        preservedGeometry: true
      });
      return copies;
    },
    [
      nextObjectSequenceRef,
      resolveCopyAnchor,
      sceneViewportPort,
      setSceneHistory,
      setSelectedObjectIds,
      setSelectedTileId,
      toolbarState.canvasDebug.snapAngle,
      toolbarState.canvasDebug.snapGrid,
      toolbarState.canvasDebug.snapHeight,
      trackTelemetry,
      userId,
      workspaceOptions.snapAngleStepDeg,
      workspaceOptions.snapGridStep,
      workspaceOptions.snapHeightStep
    ]
  );

  const copySelectedObjectsToClipboard = useCallback(
    (source: string): SceneObject[] => {
      const selected = getUnlockedSelectedObjects(visibleObjects);
      clipboardObjectsRef.current = selected.map((object) => cloneSceneObject(object));
      trackTelemetry("scene.clipboard.copied", {
        userId,
        source,
        copiedCount: selected.length
      });
      return selected;
    },
    [
      clipboardObjectsRef,
      getUnlockedSelectedObjects,
      trackTelemetry,
      userId,
      visibleObjects
    ]
  );

  const pasteClipboardObjects = useCallback(
    (source: string): SceneObject[] => {
      const clipboardObjects = clipboardObjectsRef.current
        .map((object) => cloneSceneObject(object))
        .filter((object) => !isKindLocked(toolbarState.canvasDebug, object.kind));

      if (clipboardObjects.length === 0) {
        trackTelemetry("scene.clipboard.paste_skipped", {
          userId,
          source,
          reason: "clipboard_empty_or_locked"
        });
        return [];
      }

      return duplicateObjects(clipboardObjects, source);
    },
    [
      clipboardObjectsRef,
      duplicateObjects,
      toolbarState.canvasDebug,
      trackTelemetry,
      userId
    ]
  );

  const deleteSelectedObjects = useCallback(
    (source: string): number => {
      const deletableIds = getUnlockedSelectedObjects(visibleObjects).map((object) => object.id);
      if (deletableIds.length === 0) {
        trackTelemetry("scene.objects.delete_skipped", {
          userId,
          source,
          reason: "selection_empty_or_locked"
        });
        return 0;
      }

      const idSet = new Set(deletableIds);
      setSceneHistory((current) =>
        sceneViewportPort.commitHistory(
          current,
          sceneViewportPort.deleteObjectsByIds(current.present, deletableIds)
        )
      );
      setSelectedObjectIds((current) => current.filter((id) => !idSet.has(id)));
      setSelectedTileId(null);
      trackTelemetry("scene.objects.delete", {
        userId,
        source,
        deleted: deletableIds.length
      });
      return deletableIds.length;
    },
    [
      getUnlockedSelectedObjects,
      sceneViewportPort,
      setSceneHistory,
      setSelectedObjectIds,
      setSelectedTileId,
      trackTelemetry,
      userId,
      visibleObjects
    ]
  );

  const cutSelectedObjectsToClipboard = useCallback(
    (source: string): number => {
      const copied = copySelectedObjectsToClipboard(source);
      if (copied.length === 0) {
        return 0;
      }

      return deleteSelectedObjects(source);
    },
    [copySelectedObjectsToClipboard, deleteSelectedObjects]
  );

  const resolveMovableSelectionIds = useCallback(
    (targetObjectIds?: string[]): { ids: string[]; reason?: string } => {
      const targetIds = targetObjectIds ?? selectedObjectIds;
      return resolveMovableVisibleSelection({
        selectedObjectIds: targetIds,
        objects: visibleObjects,
        toolbarState
      });
    },
    [selectedObjectIds, toolbarState, visibleObjects]
  );

  const moveSelectedObjectsByDelta = useCallback(
    (
      delta: { x: number; y: number },
      source: string,
      targetObjectIds?: string[]
    ): number => {
      if (delta.x === 0 && delta.y === 0) {
        return 0;
      }

      const resolved = resolveMovableSelectionIds(targetObjectIds);
      if (resolved.ids.length === 0) {
        trackTelemetry("scene.objects.move_skipped", {
          userId,
          source,
          reason: resolved.reason ?? "selection_unavailable"
        });
        return 0;
      }

      const movableIds = new Set(resolved.ids);
      const movableObjects = scene.objects.filter((object) => movableIds.has(object.id));
      const boundedDelta = clampTranslationDeltaToSceneBounds(scene, movableObjects, delta);
      if (boundedDelta.x === 0 && boundedDelta.y === 0) {
        trackTelemetry("scene.objects.move_skipped", {
          userId,
          source,
          reason: "scene_bounds"
        });
        return 0;
      }

      setSceneHistory((current) =>
        sceneViewportPort.commitHistory(
          current,
          sceneViewportPort.translateObjectsByIds(
            current.present,
            resolved.ids,
            boundedDelta
          )
        )
      );
      setSelectedTileId(null);
      trackTelemetry("scene.objects.move", {
        userId,
        source,
        movedCount: resolved.ids.length,
        deltaX: boundedDelta.x,
        deltaY: boundedDelta.y
      });
      return resolved.ids.length;
    },
    [
      resolveMovableSelectionIds,
      scene,
      sceneViewportPort,
      setSceneHistory,
      setSelectedTileId,
      trackTelemetry,
      userId
    ]
  );

  return {
    copySelectedObjectsToClipboard,
    cutSelectedObjectsToClipboard,
    deleteSelectedObjects,
    duplicateObjects,
    getUnlockedSelectedObjects,
    moveSelectedObjectsByDelta,
    pasteClipboardObjects,
    resolveCopyAnchor,
    resolveMovableSelectionIds
  };
}
