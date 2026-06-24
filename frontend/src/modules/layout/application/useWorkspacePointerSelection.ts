import { useCallback, useRef } from "react";
import type {
  Dispatch,
  MouseEvent as ReactMouseEvent,
  MutableRefObject,
  SetStateAction
} from "react";
import type { TelemetryPayload } from "../../telemetry/domain/telemetryEvent";
import type { SceneViewportPort } from "../../scene/application/sceneViewportPort";
import type {
  AreaScene,
  SceneHistoryState,
  SceneObject,
  SceneObjectKind,
  TerrainBrushKind
} from "../contracts";
import type { WorkspaceOptionSettings } from "./layoutPreferencesFacade";
import type { ViewportFacade } from "./viewportFacade";
import type { WorkspaceToolbarState } from "./workspaceChromeFacade";
import type { ContextMenuState } from "./useWorkspaceContextMenuActions";
import type {
  WorkspaceAnchoredOverlayRuntimePort,
  WorkspacePointerRuntimePort,
  WorkspaceRuntimeRef
} from "../ports/workspaceRenderRuntimePort";
import {
  CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_X_PX,
  CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_Y_PX,
  CONTEXT_MENU_FALLBACK_HEIGHT_PX,
  CONTEXT_MENU_FALLBACK_WIDTH_PX,
  normalizeContextMenuAnchorOffset
} from "../workspaceAnchoredOverlay";
import {
  MOVE_ALLOWED_KINDS,
  OBJECT_KIND_BY_SCOPE,
  findTileAtWorld,
  isKindLocked,
  resolveObjectPlacementFromWorldPoint,
  snapAngleRadians,
  snapHeightValue
} from "./workspaceSceneInteraction";

export interface SelectionBoxState {
  active: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface DragMoveState {
  active: boolean;
  lastWorld: { x: number; y: number } | null;
  objectIds: string[];
}

interface UseWorkspacePointerSelectionArgs<TRuntime, TPointerRay> {
  runtimeRef: WorkspaceRuntimeRef<TRuntime>;
  pointerRuntimePort: WorkspacePointerRuntimePort<TRuntime, TPointerRay>;
  anchoredOverlayRuntimePort: WorkspaceAnchoredOverlayRuntimePort<TRuntime>;
  scene: AreaScene;
  sceneViewportPort: SceneViewportPort;
  viewportFacade: ViewportFacade;
  visibleObjects: SceneObject[];
  selectedObjectIds: string[];
  selectionBox: SelectionBoxState;
  setSelectionBox: Dispatch<SetStateAction<SelectionBoxState>>;
  setSelectedObjectIds: Dispatch<SetStateAction<string[]>>;
  setSelectedTileId: Dispatch<SetStateAction<string | null>>;
  setSceneHistory: Dispatch<SetStateAction<SceneHistoryState>>;
  setContextMenu: Dispatch<SetStateAction<ContextMenuState | null>>;
  toolbarState: WorkspaceToolbarState;
  workspaceOptions: WorkspaceOptionSettings;
  objectBrush: SceneObjectKind;
  terrainBrush: TerrainBrushKind;
  lastPointerWorldRef: MutableRefObject<{ x: number; y: number } | null>;
  nextObjectSequenceRef: MutableRefObject<number>;
  isSelectableByActiveFilters: (object: SceneObject) => boolean;
  moveSelectedObjectsByDelta: (
    delta: { x: number; y: number },
    source: string,
    targetObjectIds?: string[]
  ) => number;
  trackTelemetry: (name: string, payload?: TelemetryPayload) => void;
  userId: string;
}

export function useWorkspacePointerSelection<TRuntime, TPointerRay>({
  runtimeRef,
  pointerRuntimePort,
  anchoredOverlayRuntimePort,
  scene,
  sceneViewportPort,
  viewportFacade,
  visibleObjects,
  selectedObjectIds,
  selectionBox,
  setSelectionBox,
  setSelectedObjectIds,
  setSelectedTileId,
  setSceneHistory,
  setContextMenu,
  toolbarState,
  workspaceOptions,
  objectBrush,
  terrainBrush,
  lastPointerWorldRef,
  nextObjectSequenceRef,
  isSelectableByActiveFilters,
  moveSelectedObjectsByDelta,
  trackTelemetry,
  userId
}: UseWorkspacePointerSelectionArgs<TRuntime, TPointerRay>) {
  const dragMoveRef = useRef<DragMoveState>({
    active: false,
    lastWorld: null,
    objectIds: []
  });

  const commitBoxSelection = useCallback(
    (box: SelectionBoxState, ctrlAdditive: boolean) => {
      const runtime = runtimeRef.current;
      if (!runtime || !box.active) {
        return;
      }

      const minX = Math.min(box.startX, box.currentX);
      const maxX = Math.max(box.startX, box.currentX);
      const minY = Math.min(box.startY, box.currentY);
      const maxY = Math.max(box.startY, box.currentY);

      const idsInBox = visibleObjects
        .filter(
          (object) =>
            isSelectableByActiveFilters(object) &&
            !isKindLocked(toolbarState.canvasDebug, object.kind)
        )
        .filter((object) => {
          const screen = pointerRuntimePort.worldToScreen(runtime, object.x, object.y);
          return (
            screen.x >= minX &&
            screen.x <= maxX &&
            screen.y >= minY &&
            screen.y <= maxY
          );
        })
        .map((object) => object.id);

      setSelectedTileId(null);
      const mode = ctrlAdditive ? "add" : workspaceOptions.selectionBoxMode;
      setSelectedObjectIds((current) => {
        if (mode === "replace") {
          return idsInBox;
        }
        if (mode === "add") {
          const merged = new Set(current);
          idsInBox.forEach((id) => merged.add(id));
          return Array.from(merged);
        }
        if (mode === "subtract") {
          const boxSet = new Set(idsInBox);
          return current.filter((id) => !boxSet.has(id));
        }

        const boxSet = new Set(idsInBox);
        return current.filter((id) => boxSet.has(id));
      });
      trackTelemetry("scene.selection.box", {
        userId,
        mode,
        selectedInBox: idsInBox.length
      });
    },
    [
      isSelectableByActiveFilters,
      pointerRuntimePort,
      runtimeRef,
      setSelectedObjectIds,
      setSelectedTileId,
      toolbarState.canvasDebug,
      trackTelemetry,
      userId,
      visibleObjects,
      workspaceOptions.selectionBoxMode
    ]
  );

  const handleMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const runtime = runtimeRef.current;
      if (!runtime) {
        return;
      }
      if (
        event.button === 0 &&
        pointerRuntimePort.isTransformInteractionActive(runtime)
      ) {
        return;
      }

      const local = pointerRuntimePort.pointerToLocal(runtime, event);
      const pointerRay = pointerRuntimePort.pointerToRay(runtime, event);
      const groundHit = pointerRuntimePort.intersectionOnGround(runtime, pointerRay);
      if (groundHit) {
        lastPointerWorldRef.current = { x: groundHit.x, y: groundHit.y };
      } else {
        lastPointerWorldRef.current = null;
      }
      const findHitObjectId = (): string | null => {
        const candidateObjectIds = visibleObjects
          .filter((object) => isSelectableByActiveFilters(object))
          .map((object) => object.id);
        return pointerRuntimePort.findFirstObjectHitId(runtime, pointerRay, candidateObjectIds);
      };

      if (event.button === 2) {
        if (viewportFacade.isCtrlPanGesture({ button: event.button, ctrlKey: event.ctrlKey })) {
          setContextMenu(null);
          pointerRuntimePort.setOrbitPointerBindings(runtime, { ctrlPanEnabled: true });
          return;
        }

        if (
          viewportFacade.isContextMenuGesture({
            button: event.button,
            ctrlKey: event.ctrlKey
          })
        ) {
          const hitObjectId = findHitObjectId();
          const selectedVisibleId =
            selectedObjectIds.find((id) => visibleObjects.some((object) => object.id === id)) ??
            null;
          const targetObjectId = hitObjectId ?? selectedVisibleId;
          if (!targetObjectId) {
            setContextMenu(null);
            return;
          }

          const hitObject = visibleObjects.find((object) => object.id === targetObjectId) ?? null;
          if (!hitObject) {
            setContextMenu(null);
            return;
          }

          setSelectedTileId(null);
          setSelectedObjectIds((current) =>
            current.includes(hitObject.id) ? current : [hitObject.id]
          );
          const clickedDirectlyOnTarget = hitObjectId === hitObject.id;
          const anchorScreen = pointerRuntimePort.resolveContextMenuAnchorScreen(
            runtime,
            hitObject,
            hitObject.id
          );
          const relativeOffset = clickedDirectlyOnTarget
            ? normalizeContextMenuAnchorOffset(
                local.x - anchorScreen.x,
                local.y - anchorScreen.y
              )
            : {
                x: CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_X_PX,
                y: CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_Y_PX
              };
          const anchorOffsetX = relativeOffset.x;
          const anchorOffsetY = relativeOffset.y;
          const anchoredPosition = anchoredOverlayRuntimePort.resolveAnchoredObjectPosition(
            runtime,
            hitObject,
            hitObject.id,
            anchorOffsetX,
            anchorOffsetY,
            CONTEXT_MENU_FALLBACK_WIDTH_PX,
            CONTEXT_MENU_FALLBACK_HEIGHT_PX
          );
          setContextMenu({
            x: anchoredPosition.x,
            y: anchoredPosition.y,
            objectId: hitObject.id,
            objectKind: hitObject.kind,
            anchorOffsetX,
            anchorOffsetY
          });
          trackTelemetry("scene.context_menu.open", {
            userId,
            objectId: hitObject.id,
            objectKind: hitObject.kind
          });
          return;
        }
      }

      if (event.button !== 0) {
        return;
      }

      setContextMenu(null);
      if (event.shiftKey) {
        pointerRuntimePort.setControlsEnabled(runtime, false);
        setSelectionBox({
          active: true,
          startX: local.x,
          startY: local.y,
          currentX: local.x,
          currentY: local.y
        });
        return;
      }
      const tile = groundHit ? findTileAtWorld(scene, groundHit.x, groundHit.y) : null;

      if (toolbarState.selectionMode === "terrain") {
        if (!tile) {
          setSelectedTileId(null);
          return;
        }

        setSelectedTileId(tile.id);
        setSelectedObjectIds([]);
        const shouldTrackTerrainPaint = tile.terrain !== terrainBrush;

        setSceneHistory((current) => {
          const nextScene = sceneViewportPort.updateTileTerrain(
            current.present,
            tile.id,
            terrainBrush
          );
          if (nextScene === current.present) {
            return current;
          }
          return sceneViewportPort.commitHistory(current, nextScene);
        });
        if (shouldTrackTerrainPaint) {
          trackTelemetry("scene.tiles.paint", {
            userId,
            tileId: tile.id,
            terrain: terrainBrush
          });
        }
        return;
      }

      const hitObjectId = findHitObjectId() ?? undefined;

      if (hitObjectId) {
        const hitObject = visibleObjects.find((object) => object.id === hitObjectId) ?? null;
        if (
          hitObject &&
          isSelectableByActiveFilters(hitObject) &&
          !isKindLocked(toolbarState.canvasDebug, hitObject.kind)
        ) {
          setSelectedTileId(null);
          if (event.ctrlKey) {
            setSelectedObjectIds((current) => {
              if (current.includes(hitObject.id)) {
                return current.filter((id) => id !== hitObject.id);
              }
              return [...current, hitObject.id];
            });
            return;
          }

          const nextSelectionIds = selectedObjectIds.includes(hitObject.id)
            ? selectedObjectIds
            : [hitObject.id];
          setSelectedObjectIds(nextSelectionIds);

          if (
            groundHit &&
            !event.altKey &&
            !pointerRuntimePort.isTransformInteractionActive(runtime)
          ) {
            const selectedForDrag = scene.objects.filter((object) =>
              nextSelectionIds.includes(object.id)
            );
            const hasDoorInSelection = selectedForDrag.some(
              (object) => object.kind === "doors"
            );
            const hasUnlockedMovable = selectedForDrag.some(
              (object) =>
                MOVE_ALLOWED_KINDS.has(object.kind) &&
                !isKindLocked(toolbarState.canvasDebug, object.kind)
            );

            if (!hasDoorInSelection && hasUnlockedMovable) {
              dragMoveRef.current = {
                active: true,
                lastWorld: { x: groundHit.x, y: groundHit.y },
                objectIds: nextSelectionIds
              };
              pointerRuntimePort.setControlsEnabled(runtime, false);
            }
          }
          return;
        }
      }

      if (event.altKey && tile) {
        const newObjectSequence = nextObjectSequenceRef.current;
        nextObjectSequenceRef.current += 1;

        const kind =
          toolbarState.selectionScope === "all"
            ? objectBrush
            : (OBJECT_KIND_BY_SCOPE[toolbarState.selectionScope] ?? objectBrush);
        if (isKindLocked(toolbarState.canvasDebug, kind)) {
          trackTelemetry("scene.objects.add_blocked_locked_layer", {
            userId,
            kind
          });
          return;
        }

        const rawPlacementX = groundHit?.x ?? tile.col + 0.5;
        const rawPlacementY = groundHit?.y ?? tile.row + 0.5;
        const placement = resolveObjectPlacementFromWorldPoint(
          scene,
          rawPlacementX,
          rawPlacementY,
          toolbarState.canvasDebug.snapGrid,
          workspaceOptions.snapGridStep
        );
        const placementX = placement.x;
        const placementY = placement.y;

        const created = sceneViewportPort.createObject(
          kind,
          placementX,
          placementY,
          newObjectSequence
        );
        if (toolbarState.canvasDebug.snapAngle) {
          created.bearing = snapAngleRadians(created.bearing, workspaceOptions.snapAngleStepDeg);
        }
        if (toolbarState.canvasDebug.snapHeight) {
          created.z = snapHeightValue(created.z, workspaceOptions.snapHeightStep);
        }

        setSceneHistory((current) =>
          sceneViewportPort.commitHistory(
            current,
            sceneViewportPort.appendObjects(current.present, [created])
          )
        );

        setSelectedObjectIds([created.id]);
        setSelectedTileId(tile.id);
        trackTelemetry("scene.objects.add", {
          userId,
          kind,
          objectId: created.id
        });
        return;
      }

      if (!event.ctrlKey) {
        setSelectedObjectIds([]);
      }
      setSelectedTileId(tile?.id ?? null);
    },
    [
      isSelectableByActiveFilters,
      anchoredOverlayRuntimePort,
      objectBrush,
      pointerRuntimePort,
      runtimeRef,
      scene,
      sceneViewportPort,
      selectedObjectIds,
      setContextMenu,
      setSceneHistory,
      setSelectedObjectIds,
      setSelectedTileId,
      setSelectionBox,
      terrainBrush,
      toolbarState.selectionMode,
      toolbarState.selectionScope,
      toolbarState.canvasDebug,
      trackTelemetry,
      userId,
      viewportFacade,
      visibleObjects,
      workspaceOptions,
      lastPointerWorldRef,
      nextObjectSequenceRef
    ]
  );

  const handleMouseMove = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    const pointerRay = pointerRuntimePort.pointerToRay(runtime, event);
    const groundHit = pointerRuntimePort.intersectionOnGround(runtime, pointerRay);
    if (groundHit) {
      lastPointerWorldRef.current = { x: groundHit.x, y: groundHit.y };
    } else {
      lastPointerWorldRef.current = null;
    }

    if (dragMoveRef.current.active) {
      if (!(event.buttons & 1)) {
        dragMoveRef.current = {
          active: false,
          lastWorld: null,
          objectIds: []
        };
        pointerRuntimePort.setControlsEnabled(runtime, true);
        return;
      }

      const lastWorld = dragMoveRef.current.lastWorld;
      if (groundHit && lastWorld) {
        const deltaX = groundHit.x - lastWorld.x;
        const deltaY = groundHit.y - lastWorld.y;
        const moved = moveSelectedObjectsByDelta(
          { x: deltaX, y: deltaY },
          "mouse_drag",
          dragMoveRef.current.objectIds
        );
        if (moved > 0) {
          dragMoveRef.current.lastWorld = { x: groundHit.x, y: groundHit.y };
        }
      }
      return;
    }

    if (pointerRuntimePort.isTransformDragging(runtime)) {
      return;
    }

    if (!selectionBox.active) {
      return;
    }

    const local = pointerRuntimePort.pointerToLocal(runtime, event);
    setSelectionBox((current) => ({
      ...current,
      currentX: local.x,
      currentY: local.y
    }));
  }, [
    lastPointerWorldRef,
    moveSelectedObjectsByDelta,
    pointerRuntimePort,
    runtimeRef,
    selectionBox.active,
    setSelectionBox
  ]);

  const handleMouseUp = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (dragMoveRef.current.active) {
        dragMoveRef.current = {
          active: false,
          lastWorld: null,
          objectIds: []
        };
        const runtime = runtimeRef.current;
        if (runtime) {
          pointerRuntimePort.setControlsEnabled(runtime, true);
        }
      }

      if (!selectionBox.active) {
        return;
      }

      commitBoxSelection(selectionBox, Boolean(event.ctrlKey));
      const runtime = runtimeRef.current;
      if (runtime) {
        pointerRuntimePort.setControlsEnabled(runtime, true);
      }
      setSelectionBox({
        active: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0
      });
    },
    [commitBoxSelection, pointerRuntimePort, runtimeRef, selectionBox, setSelectionBox]
  );

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp
  };
}
