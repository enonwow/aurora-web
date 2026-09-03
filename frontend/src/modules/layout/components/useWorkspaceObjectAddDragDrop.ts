import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DragEvent as ReactDragEvent,
  MouseEvent as ReactMouseEvent,
  MutableRefObject
} from "react";
import type { Dispatch, SetStateAction } from "react";
import type { TelemetryPayload } from "../../telemetry/domain/telemetryEvent";
import type { SceneViewportPort } from "../../scene/application/sceneViewportPort";
import type { AreaScene, SceneHistoryState, SceneObject } from "../contracts";
import type { WorkspaceOptionSettings } from "../application/layoutPreferencesFacade";
import type { WorkspaceToolbarState } from "../application/workspaceChromeFacade";
import {
  cloneSceneObject,
  cloneSceneObjectCreatureProperties,
  cloneSceneObjectItemProperties
} from "../application/workspaceSceneObjectClone";
import type {
  CanvasObjectAddPreviewState,
  ObjectAddDropFeedbackState,
  ObjectAddPlacementCacheState
} from "../application/workspaceObjectAddTypes";
import {
  isKindLocked,
  findTileAtWorld,
  resolveCreatedObjectSelectionIds,
  resolveObjectAddDropPlacement,
  resolveObjectAddPayloadKey,
  resolveRenderObjectIdsSet,
  resolveSceneCoordinateMax,
  resolveSceneObjectRenderScale,
  shouldRenderAreaGeometry,
  snapAngleRadians,
  snapHeightValue
} from "../application/workspaceSceneInteraction";
import type {
  WorkspaceObjectAddRuntimePort,
  WorkspaceRuntimeRef
} from "../ports/workspaceRenderRuntimePort";
import {
  createObjectAddPayloadFromSceneObject,
  getCurrentObjectAddDragPayload,
  getCurrentObjectAddDragSourceTemplate,
  OBJECT_ADD_DRAG_MIME,
  setCurrentObjectAddDragPayload,
  setCurrentObjectAddDragSourceTemplate,
  tryParseObjectAddPayload,
  type ObjectAddDragPayload
} from "../application/objectAddDragPayload";
import { cloneDoorTransitionPreserveOnlyPayload } from "../application/doorTransitionStorageProvenance";

interface UseWorkspaceObjectAddDragDropArgs<TRuntime, TObjectAddGhost> {
  runtimeRef: WorkspaceRuntimeRef<TRuntime>;
  objectAddRuntimePort: WorkspaceObjectAddRuntimePort<TRuntime, TObjectAddGhost>;
  scene: AreaScene;
  sceneViewportPort: SceneViewportPort;
  renderObjectIds?: string[] | null;
  toolbarState: WorkspaceToolbarState;
  workspaceOptions: WorkspaceOptionSettings;
  nextObjectSequenceRef: MutableRefObject<number>;
  setSceneHistory: Dispatch<SetStateAction<SceneHistoryState>>;
  setSelectedObjectIds: Dispatch<SetStateAction<string[]>>;
  setSelectedTileId: Dispatch<SetStateAction<string | null>>;
  trackTelemetry: (name: string, payload?: TelemetryPayload) => void;
  userId: string;
}

interface ObjectAddPlacementModeState {
  payload: ObjectAddDragPayload;
  template: SceneObject;
  revision: number | null;
}

interface ResolvedObjectAddPlacement {
  x: number;
  y: number;
  tileId: string;
}

function resolveSceneCenterObjectAddPlacement(scene: AreaScene): ResolvedObjectAddPlacement | null {
  const maxX = resolveSceneCoordinateMax(scene.width);
  const maxY = resolveSceneCoordinateMax(scene.height);
  const centerX = Math.min(maxX, Math.max(0, scene.width / 2));
  const centerY = Math.min(maxY, Math.max(0, scene.height / 2));
  const centerTile =
    findTileAtWorld(scene, centerX, centerY) ??
    scene.tiles[Math.floor(scene.tiles.length / 2)] ??
    null;
  if (!centerTile) {
    return {
      x: centerX,
      y: centerY,
      tileId: "scene-center"
    };
  }

  return {
    x: Math.min(maxX, Math.max(0, centerTile.col + 0.5)),
    y: Math.min(maxY, Math.max(0, centerTile.row + 0.5)),
    tileId: centerTile.id
  };
}

export function useWorkspaceObjectAddDragDrop<TRuntime, TObjectAddGhost>({
  runtimeRef,
  objectAddRuntimePort,
  scene,
  sceneViewportPort,
  renderObjectIds,
  toolbarState,
  workspaceOptions,
  nextObjectSequenceRef,
  setSceneHistory,
  setSelectedObjectIds,
  setSelectedTileId,
  trackTelemetry,
  userId
}: UseWorkspaceObjectAddDragDropArgs<TRuntime, TObjectAddGhost>) {
  const [objectAddPreview, setObjectAddPreview] = useState<CanvasObjectAddPreviewState | null>(
    null
  );
  const [objectAddPlacementMode, setObjectAddPlacementMode] =
    useState<ObjectAddPlacementModeState | null>(null);
  const [objectAddDropFeedback, setObjectAddDropFeedback] =
    useState<ObjectAddDropFeedbackState | null>(null);
  const objectAddPlacementCacheRef = useRef<ObjectAddPlacementCacheState | null>(null);
  const objectAddGhostRef = useRef<TObjectAddGhost | null>(null);

  const clearObjectAddGhost = useCallback(() => {
    objectAddRuntimePort.clearObjectAddGhost(objectAddGhostRef);
  }, [objectAddRuntimePort]);

  const clearObjectAddInteraction = useCallback(() => {
    setObjectAddPreview(null);
    setObjectAddPlacementMode(null);
    setCurrentObjectAddDragPayload(null);
    setCurrentObjectAddDragSourceTemplate(null);
    objectAddPlacementCacheRef.current = null;
    clearObjectAddGhost();
  }, [clearObjectAddGhost]);

  const syncObjectAddGhost = useCallback(
    (payload: ObjectAddDragPayload, placementX: number, placementY: number, isInsideCanvasArea: boolean) => {
      const runtime = runtimeRef.current;
      if (!runtime) {
        return;
      }
      const sceneScale = sceneViewportPort.getSceneScale(scene.width, scene.height);
      const objectRenderScale = resolveSceneObjectRenderScale(
        sceneScale,
        shouldRenderAreaGeometry(renderObjectIds)
      );
      objectAddRuntimePort.syncObjectAddGhost({
        runtime,
        ghostRef: objectAddGhostRef,
        payload,
        placementX,
        placementY,
        objectRenderScale,
        wireframe: toolbarState.canvasDebug.wireframe,
        isInsideCanvasArea
      });
    },
    [
      objectAddRuntimePort,
      renderObjectIds,
      runtimeRef,
      scene.height,
      scene.width,
      sceneViewportPort,
      toolbarState.canvasDebug.wireframe
    ]
  );

  useEffect(() => {
    window.addEventListener("dragend", clearObjectAddInteraction);
    window.addEventListener("drop", clearObjectAddInteraction);
    return () => {
      window.removeEventListener("dragend", clearObjectAddInteraction);
      window.removeEventListener("drop", clearObjectAddInteraction);
    };
  }, [clearObjectAddInteraction]);

  useEffect(
    () => () => {
      clearObjectAddGhost();
    },
    [clearObjectAddGhost]
  );

  useEffect(() => {
    if (!objectAddDropFeedback) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setObjectAddDropFeedback(null);
    }, 2600);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [objectAddDropFeedback]);

  const resolveCanvasObjectAddPlacement = useCallback(
    (clientX: number, clientY: number): { x: number; y: number; tileId: string | null } | null => {
      const runtime = runtimeRef.current;
      if (!runtime) {
        return null;
      }
      return objectAddRuntimePort.resolveCanvasObjectAddPlacement(runtime, scene, clientX, clientY);
    },
    [objectAddRuntimePort, runtimeRef, scene]
  );

  const addObjectFromPayload = useCallback(
    (
      payload: ObjectAddDragPayload,
      placement: ResolvedObjectAddPlacement,
      sourceTemplateOverride: SceneObject | null,
      source: "drop" | "click"
    ) => {
      setObjectAddDropFeedback(null);

      const newObjectSequence = nextObjectSequenceRef.current;
      nextObjectSequenceRef.current += 1;
      const created = payload.kind === "doors"
        ? sceneViewportPort.createDoorAtHook(scene, placement.x, placement.y, newObjectSequence)
        : sceneViewportPort.createObject(payload.kind, placement.x, placement.y, newObjectSequence);
      if (!created) {
        setObjectAddDropFeedback({
          variant: "warning",
          message: "This tile has no supported free door hook."
        });
        trackTelemetry("scene.objects.add_blocked_door_hook", {
          userId,
          kind: payload.kind,
          source,
          tileId: placement.tileId
        });
        return undefined;
      }
      if (payload.kind !== "doors" && toolbarState.canvasDebug.snapAngle) {
        created.bearing = snapAngleRadians(created.bearing, workspaceOptions.snapAngleStepDeg);
      }
      if (payload.kind !== "doors" && toolbarState.canvasDebug.snapHeight) {
        created.z = snapHeightValue(created.z, workspaceOptions.snapHeightStep);
      }

      if (payload.kind !== "doors") {
        created.resRef = payload.resRef;
        created.name = payload.name;
        created.tag = payload.tag;
        created.previewImageUrl = payload.previewImageUrl;

        const sourceTemplate =
          sourceTemplateOverride ?? scene.objects.find((object) => object.id === payload.id);
        if (sourceTemplate) {
          const sourceSnapshot = cloneSceneObject(sourceTemplate);
          created.resRef = sourceSnapshot.resRef;
          created.name = sourceSnapshot.name;
          created.tag = sourceSnapshot.tag;
          created.previewImageUrl = sourceSnapshot.previewImageUrl;
          created.isStatic = sourceSnapshot.isStatic;
          created.source = sourceSnapshot.source;
          created.placeableProperties = sourceSnapshot.placeableProperties
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
          created.creatureProperties = cloneSceneObjectCreatureProperties(
            sourceSnapshot.creatureProperties
          );
          created.itemProperties = cloneSceneObjectItemProperties(sourceSnapshot.itemProperties);
          created.soundPositioning = sourceSnapshot.soundPositioning
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
          created.doorTransition = cloneDoorTransitionPreserveOnlyPayload(
            sourceSnapshot.doorTransition,
          );
        }
        if (payload.kind === "sounds" && payload.soundPositioning && !sourceTemplate?.soundPositioning) {
          created.soundPositioning = {
            ...payload.soundPositioning,
            preserve: payload.soundPositioning.preserve
              ? {
                  ...payload.soundPositioning.preserve,
                  flags: { ...payload.soundPositioning.preserve.flags },
                  extra: { ...payload.soundPositioning.preserve.extra }
                }
              : undefined
          };
        }
      }

      setSceneHistory((current) =>
        sceneViewportPort.commitHistory(
          current,
          sceneViewportPort.appendObjects(current.present, [created])
        )
      );
      setSelectedObjectIds(
        resolveCreatedObjectSelectionIds({
          objectId: created.id,
          renderObjectIdsSet: resolveRenderObjectIdsSet(renderObjectIds)
        })
      );
      setSelectedTileId(placement.tileId);
      trackTelemetry("scene.objects.add_from_panel", {
        userId,
        kind: payload.kind,
        objectId: created.id,
        sourceTemplateId: payload.id ?? null,
        source
      });
      return created;
    },
    [
      nextObjectSequenceRef,
      renderObjectIds,
      scene,
      sceneViewportPort,
      setSceneHistory,
      setSelectedObjectIds,
      setSelectedTileId,
      toolbarState.canvasDebug.snapAngle,
      toolbarState.canvasDebug.snapHeight,
      trackTelemetry,
      userId,
      workspaceOptions.snapAngleStepDeg,
      workspaceOptions.snapHeightStep
    ]
  );

  const handleCanvasDragOver = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      const payload =
        tryParseObjectAddPayload(event.dataTransfer.getData(OBJECT_ADD_DRAG_MIME)) ??
        getCurrentObjectAddDragPayload();
      if (!payload) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";

      if (isKindLocked(toolbarState.canvasDebug, payload.kind)) {
        setObjectAddPreview(null);
        objectAddPlacementCacheRef.current = null;
        clearObjectAddGhost();
        return;
      }
      const payloadKey = resolveObjectAddPayloadKey(payload);

      const placement = resolveCanvasObjectAddPlacement(event.clientX, event.clientY);
      if (!placement) {
        setObjectAddPreview(null);
        clearObjectAddGhost();
        return;
      }
      objectAddPlacementCacheRef.current = {
        payloadKey,
        placementX: placement.x,
        placementY: placement.y,
        tileId: placement.tileId,
        updatedAtUnixMs: Date.now()
      };

      setObjectAddPreview({
        payload,
        placementX: placement.x,
        placementY: placement.y,
        screenX: event.clientX,
        screenY: event.clientY
      });
      syncObjectAddGhost(payload, placement.x, placement.y, placement.tileId !== null);
    },
    [
      clearObjectAddGhost,
      resolveCanvasObjectAddPlacement,
      setObjectAddPreview,
      syncObjectAddGhost,
      toolbarState.canvasDebug
    ]
  );

  const handleCanvasDragLeave = useCallback(() => {
    setObjectAddPreview(null);
    clearObjectAddGhost();
  }, [clearObjectAddGhost]);

  const handleCanvasDrop = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      const payload =
        tryParseObjectAddPayload(event.dataTransfer.getData(OBJECT_ADD_DRAG_MIME)) ??
        getCurrentObjectAddDragPayload();
      const activeSourceTemplate = getCurrentObjectAddDragSourceTemplate();
      const sourceTemplateOverride =
        activeSourceTemplate &&
        activeSourceTemplate.id === payload?.id &&
        activeSourceTemplate.kind === payload?.kind
          ? activeSourceTemplate
          : null;
      if (!payload) {
        objectAddPlacementCacheRef.current = null;
        setCurrentObjectAddDragPayload(null);
        setCurrentObjectAddDragSourceTemplate(null);
        clearObjectAddGhost();
        return;
      }
      event.preventDefault();
      if (isKindLocked(toolbarState.canvasDebug, payload.kind)) {
        objectAddPlacementCacheRef.current = null;
        setCurrentObjectAddDragPayload(null);
        setCurrentObjectAddDragSourceTemplate(null);
        clearObjectAddGhost();
        return;
      }

      const canResolveFromDropPoint =
        Number.isFinite(event.clientX) &&
        Number.isFinite(event.clientY) &&
        (event.clientX !== 0 || event.clientY !== 0);
      const dropPlacement = canResolveFromDropPoint
        ? resolveCanvasObjectAddPlacement(event.clientX, event.clientY)
        : null;
      const resolvedPlacement = resolveObjectAddDropPlacement({
        payload,
        scene,
        preview: objectAddPreview,
        cachedPlacement: objectAddPlacementCacheRef.current,
        dropPlacement,
        nowUnixMs: Date.now()
      });
      setObjectAddPreview(null);
      objectAddPlacementCacheRef.current = null;
      setCurrentObjectAddDragPayload(null);
      setCurrentObjectAddDragSourceTemplate(null);
      clearObjectAddGhost();
      if (!resolvedPlacement || !resolvedPlacement.tileId) {
        setObjectAddDropFeedback({
          variant: "warning",
          message: "Object dropped outside the canvas. Move it over an area tile and try again."
        });
        trackTelemetry("scene.objects.add_from_panel_blocked_outside_canvas", {
          userId,
          kind: payload.kind
        });
        return;
      }

      addObjectFromPayload(
        payload,
        {
          x: resolvedPlacement.x,
          y: resolvedPlacement.y,
          tileId: resolvedPlacement.tileId
        },
        sourceTemplateOverride,
        "drop"
      );
    },
    [
      addObjectFromPayload,
      clearObjectAddGhost,
      scene,
      toolbarState.canvasDebug,
      trackTelemetry,
      userId,
      objectAddPreview,
      resolveCanvasObjectAddPlacement,
      workspaceOptions.snapGridStep
    ]
  );

  const beginObjectAddPlacement = useCallback(
    (template: SceneObject, revision: number | null = null) => {
      const payload = createObjectAddPayloadFromSceneObject(template);
      if (isKindLocked(toolbarState.canvasDebug, payload.kind)) {
        setObjectAddDropFeedback({
          variant: "warning",
          message: "This layer is locked. Unlock this object type before adding it."
        });
        trackTelemetry("scene.objects.create_from_panel_blocked_locked_layer", {
          userId,
          objectId: template.id,
          objectKind: template.kind,
          revision
        });
        return;
      }

      setObjectAddDropFeedback(null);
      setObjectAddPreview(null);
      objectAddPlacementCacheRef.current = null;
      clearObjectAddGhost();
      setCurrentObjectAddDragPayload(payload);
      setObjectAddPlacementMode({
        payload,
        template,
        revision
      });
      trackTelemetry("scene.objects.add_from_panel_placement_started", {
        userId,
        kind: payload.kind,
        sourceTemplateId: payload.id,
        revision
      });
    },
    [clearObjectAddGhost, toolbarState.canvasDebug, trackTelemetry, userId]
  );

  const cancelObjectAddPlacement = useCallback(
    (reason: "escape" | "context_menu" | "scene_changed" | "manual" = "manual") => {
      if (!objectAddPlacementMode) {
        return;
      }
      clearObjectAddInteraction();
      trackTelemetry("scene.objects.add_from_panel_placement_cancelled", {
        userId,
        kind: objectAddPlacementMode.payload.kind,
        sourceTemplateId: objectAddPlacementMode.payload.id,
        reason,
        revision: objectAddPlacementMode.revision
      });
    },
    [clearObjectAddInteraction, objectAddPlacementMode, trackTelemetry, userId]
  );

  const placeObjectAddAtSceneCenter = useCallback(() => {
    if (!objectAddPlacementMode) {
      return false;
    }

    const payload = objectAddPlacementMode.payload;
    if (isKindLocked(toolbarState.canvasDebug, payload.kind)) {
      cancelObjectAddPlacement("manual");
      setObjectAddDropFeedback({
        variant: "warning",
        message: "This layer is locked. Unlock this object type before adding it."
      });
      return true;
    }

    const placement = resolveSceneCenterObjectAddPlacement(scene);
    if (!placement) {
      setObjectAddDropFeedback({
        variant: "warning",
        message: "No area tile is available for center placement."
      });
      return true;
    }

    const created = addObjectFromPayload(payload, placement, objectAddPlacementMode.template, "click");
    if (!created) {
      return true;
    }
    setObjectAddPreview(null);
    objectAddPlacementCacheRef.current = null;
    clearObjectAddGhost();
    setCurrentObjectAddDragPayload(payload);
    setObjectAddDropFeedback({
      variant: "success",
      message: `Placed ${objectAddPlacementMode.template.tag} at area center. Click another tile or press Esc.`
    });
    return true;
  }, [
    addObjectFromPayload,
    cancelObjectAddPlacement,
    clearObjectAddGhost,
    objectAddPlacementMode,
    scene,
    toolbarState.canvasDebug
  ]);

  const handleCanvasObjectAddMouseMove = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!objectAddPlacementMode) {
        return false;
      }
      event.preventDefault();
      event.stopPropagation();

      const payload = objectAddPlacementMode.payload;
      const placement = resolveCanvasObjectAddPlacement(event.clientX, event.clientY);
      if (!placement) {
        setObjectAddPreview(null);
        objectAddPlacementCacheRef.current = null;
        clearObjectAddGhost();
        return true;
      }

      const payloadKey = resolveObjectAddPayloadKey(payload);
      objectAddPlacementCacheRef.current = {
        payloadKey,
        placementX: placement.x,
        placementY: placement.y,
        tileId: placement.tileId,
        updatedAtUnixMs: Date.now()
      };
      setObjectAddPreview({
        payload,
        placementX: placement.x,
        placementY: placement.y,
        screenX: event.clientX,
        screenY: event.clientY
      });
      syncObjectAddGhost(payload, placement.x, placement.y, placement.tileId !== null);
      return true;
    },
    [
      clearObjectAddGhost,
      objectAddPlacementMode,
      resolveCanvasObjectAddPlacement,
      syncObjectAddGhost
    ]
  );

  const handleCanvasObjectAddMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!objectAddPlacementMode) {
        return false;
      }
      event.preventDefault();
      event.stopPropagation();

      if (event.button === 2) {
        cancelObjectAddPlacement("context_menu");
        return true;
      }
      if (event.button !== 0) {
        return true;
      }

      const payload = objectAddPlacementMode.payload;
      if (isKindLocked(toolbarState.canvasDebug, payload.kind)) {
        cancelObjectAddPlacement("manual");
        setObjectAddDropFeedback({
          variant: "warning",
          message: "This layer is locked. Unlock this object type before adding it."
        });
        return true;
      }

      const placement = resolveCanvasObjectAddPlacement(event.clientX, event.clientY);
      if (!placement || !placement.tileId) {
        setObjectAddDropFeedback({
          variant: "warning",
          message: "Click directly on an area tile to place the object."
        });
        setObjectAddPreview(null);
        objectAddPlacementCacheRef.current = null;
        clearObjectAddGhost();
        return true;
      }

      const created = addObjectFromPayload(
        payload,
        {
          x: placement.x,
          y: placement.y,
          tileId: placement.tileId
        },
        objectAddPlacementMode.template,
        "click"
      );
      if (!created) {
        return true;
      }
      setObjectAddPreview(null);
      objectAddPlacementCacheRef.current = null;
      clearObjectAddGhost();
      setCurrentObjectAddDragPayload(payload);
      setObjectAddDropFeedback({
        variant: "success",
        message: `Placed ${objectAddPlacementMode.template.tag}. Click another tile or press Esc.`
      });
      return true;
    },
    [
      addObjectFromPayload,
      cancelObjectAddPlacement,
      clearObjectAddGhost,
      objectAddPlacementMode,
      resolveCanvasObjectAddPlacement,
      toolbarState.canvasDebug
    ]
  );

  const handleCanvasObjectAddMouseLeave = useCallback(() => {
    if (!objectAddPlacementMode) {
      return false;
    }
    setObjectAddPreview(null);
    objectAddPlacementCacheRef.current = null;
    clearObjectAddGhost();
    return true;
  }, [clearObjectAddGhost, objectAddPlacementMode]);

  useEffect(() => {
    if (!objectAddPlacementMode) {
      return undefined;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cancelObjectAddPlacement("escape");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cancelObjectAddPlacement, objectAddPlacementMode]);

  const placementSceneIdRef = useRef(scene.sceneId);
  useEffect(() => {
    if (placementSceneIdRef.current === scene.sceneId) {
      return;
    }
    placementSceneIdRef.current = scene.sceneId;
    if (objectAddPlacementMode) {
      cancelObjectAddPlacement("scene_changed");
    }
  }, [cancelObjectAddPlacement, objectAddPlacementMode, scene.sceneId]);

  return {
    objectAddPlacementMode,
    objectAddDropFeedback,
    beginObjectAddPlacement,
    cancelObjectAddPlacement,
    placeObjectAddAtSceneCenter,
    handleCanvasDragOver,
    handleCanvasDragLeave,
    handleCanvasDrop,
    handleCanvasObjectAddMouseDown,
    handleCanvasObjectAddMouseMove,
    handleCanvasObjectAddMouseLeave
  };
}
