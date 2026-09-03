import { useCallback, useEffect, useRef } from "react";
import type {
  Dispatch,
  MouseEvent as ReactMouseEvent,
  MutableRefObject,
  SetStateAction
} from "react";
import type { TelemetryPayload } from "../../telemetry/domain/telemetryEvent";
import {
  collectChangedAuroraAreaTileDefinitionIds,
  evaluateAreaTileProductionPlacementAdmission,
  formatAreaTileProductionPlacementBlocker,
  type AreaTileProductionCertificationSource,
  type AreaTileProductionPlacementAdmissionResult,
} from "../../areas/application/areaTileProductionPlacementAdmission";
import type { SceneViewportPort } from "../../scene/application/sceneViewportPort";
import type {
  AreaScene,
  AuroraAreaEditingTool,
  SceneHistoryState,
  SceneObject,
  SceneObjectKind,
  SceneTile,
  TerrainBrushKind
} from "../contracts";
import type { WorkspaceOptionSettings } from "./layoutPreferencesFacade";
import type { SelectionBoxMode } from "../workspaceOptionSettings";
import type { ViewportFacade } from "./viewportFacade";
import type { WorkspaceToolbarState } from "./workspaceChromeFacade";
import {
  resolveAuroraAreaPlacementPreview,
  type AuroraAreaPalettePlacement,
  type AuroraAreaPlacementPreview
} from "../../scene/domain/auroraAreaPlacementPreview";
import type { AuroraAreaEdge } from "../../scene/domain/auroraAreaEditing";
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

interface AuroraAreaPaintStrokeState {
  active: boolean;
  historyCommitted: boolean;
  visitedTargets: Set<string>;
}

interface AuroraAreaPointerPlacementEvaluation {
  preview: AuroraAreaPlacementPreview;
  productionAdmission: AreaTileProductionPlacementAdmissionResult | null;
  valid: boolean;
  message: string;
}

interface AuroraAreaPointerPlacementPreview extends AuroraAreaPointerPlacementEvaluation {
  sceneId: string;
  tileId: string;
}

interface AuroraAreaPlacementPreviewOverlayInput {
  cells: readonly {
    col: number;
    row: number;
    valid: boolean;
    elevation?: number;
  }[];
  kind?: AuroraAreaPlacementPreview["kind"];
  anchor?: { col: number; row: number };
  targetEdge?: AuroraAreaEdge;
}

export function createAuroraAreaPlacementSelector(
  sceneId: string,
  row: number,
  col: number,
  tool: Exclude<AuroraAreaEditingTool, { kind: "inspect" }>
): (candidateCount: number) => number {
  const toolKey = tool.kind === "group"
    ? `group:${tool.groupId}:${tool.orientation}`
    : tool.kind === "terrain"
      ? `terrain:${tool.terrain}`
      : tool.kind === "crosser"
        ? `crosser:${tool.crosser}`
        : tool.kind === "height"
          ? `height:${tool.delta}`
          : "eraser";
  const key = `${sceneId}:${row}:${col}:${toolKey}`;
  let state = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    state ^= key.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }
  return (candidateCount: number) => {
    if (candidateCount <= 1) {
      return 0;
    }
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) % candidateCount;
  };
}

/** Maps the half-grid crosser cursor to the nearest edge of its Area tile. */
export function resolveAuroraAreaEdgeAtWorld(world: { x: number; y: number }): AuroraAreaEdge {
  const x = world.x - Math.floor(world.x);
  const y = world.y - Math.floor(world.y);
  const distances: Array<{ edge: AuroraAreaEdge; distance: number }> = [
    { edge: "top", distance: y },
    { edge: "right", distance: 1 - x },
    { edge: "bottom", distance: 1 - y },
    { edge: "left", distance: x }
  ];
  return distances.reduce((best, candidate) =>
    candidate.distance < best.distance ? candidate : best
  ).edge;
}

export function resolveAuroraAreaInspectSelection(
  current: readonly string[],
  tileId: string,
  additive: boolean
): string[] {
  if (!additive) return [tileId];
  return current.includes(tileId)
    ? current.filter((id) => id !== tileId)
    : [...current, tileId];
}

export function resolveAuroraAreaBoxSelection(
  current: readonly string[],
  tileIdsInBox: readonly string[],
  mode: SelectionBoxMode
): string[] {
  const boxIds = [...new Set(tileIdsInBox)];
  if (mode === "replace") return boxIds;
  if (mode === "add") {
    const merged = new Set(current);
    boxIds.forEach((id) => merged.add(id));
    return [...merged];
  }
  const boxSet = new Set(boxIds);
  return mode === "subtract"
    ? current.filter((id) => !boxSet.has(id))
    : current.filter((id) => boxSet.has(id));
}

const MAX_AURORA_AREA_CONNECTED_SELECTION_TILES = 65_536;

/**
 * Web-editor selection extension: resolve the exact four-neighbour component
 * with the anchor's projected terrain token. The clicked tile is kept last so
 * the existing multi-selection state retains it as the property anchor.
 */
export function resolveAuroraAreaConnectedTerrainSelection(
  tiles: readonly SceneTile[],
  anchorTileId: string
): string[] {
  if (
    anchorTileId.length < 1 ||
    tiles.length < 1 ||
    tiles.length > MAX_AURORA_AREA_CONNECTED_SELECTION_TILES
  ) {
    return [];
  }
  const byId = new Map<string, SceneTile>();
  const byCell = new Map<string, SceneTile>();
  for (const tile of tiles) {
    if (
      tile.id.length < 1 ||
      !Number.isInteger(tile.row) ||
      tile.row < 0 ||
      !Number.isInteger(tile.col) ||
      tile.col < 0 ||
      typeof tile.terrain !== "string" ||
      tile.terrain.length < 1
    ) {
      return [];
    }
    const cellKey = `${tile.row}:${tile.col}`;
    if (byId.has(tile.id) || byCell.has(cellKey)) {
      return [];
    }
    byId.set(tile.id, tile);
    byCell.set(cellKey, tile);
  }
  const anchor = byId.get(anchorTileId);
  if (!anchor) return [];

  const queue = [anchor];
  const visited = new Set([`${anchor.row}:${anchor.col}`]);
  const selected: SceneTile[] = [];
  for (let index = 0; index < queue.length; index += 1) {
    const tile = queue[index];
    selected.push(tile);
    const neighbours = [
      [tile.row - 1, tile.col],
      [tile.row, tile.col + 1],
      [tile.row + 1, tile.col],
      [tile.row, tile.col - 1]
    ] as const;
    for (const [row, col] of neighbours) {
      const cellKey = `${row}:${col}`;
      if (visited.has(cellKey)) continue;
      const neighbour = byCell.get(cellKey);
      if (!neighbour || neighbour.terrain !== anchor.terrain) continue;
      visited.add(cellKey);
      queue.push(neighbour);
    }
  }
  const ordered = selected
    .filter((tile) => tile.id !== anchor.id)
    .sort((left, right) => left.row - right.row || left.col - right.col || left.id.localeCompare(right.id))
    .map((tile) => tile.id);
  return [...ordered, anchor.id];
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
  selectedTileIds?: readonly string[];
  selectionBox: SelectionBoxState;
  setSelectionBox: Dispatch<SetStateAction<SelectionBoxState>>;
  setSelectedObjectIds: Dispatch<SetStateAction<string[]>>;
  setSelectedTileId: Dispatch<SetStateAction<string | null>>;
  setSelectedTileIds?: Dispatch<SetStateAction<string[]>>;
  setSceneHistory: Dispatch<SetStateAction<SceneHistoryState>>;
  setContextMenu: Dispatch<SetStateAction<ContextMenuState | null>>;
  toolbarState: WorkspaceToolbarState;
  workspaceOptions: WorkspaceOptionSettings;
  objectBrush: SceneObjectKind;
  terrainBrush: TerrainBrushKind;
  areaEditingTool: AuroraAreaEditingTool;
  tileProductionCertification: AreaTileProductionCertificationSource;
  syncAuroraAreaPlacementPreview?: (
    runtime: TRuntime,
    input: AuroraAreaPlacementPreviewOverlayInput
  ) => void;
  clearAuroraAreaPlacementPreview?: (runtime: TRuntime) => void;
  onAuroraAreaEditingFeedback?: (feedback: {
    variant: "success" | "error";
    message: string;
  } | null) => void;
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
  selectedTileIds = [],
  selectionBox,
  setSelectionBox,
  setSelectedObjectIds,
  setSelectedTileId,
  setSelectedTileIds,
  setSceneHistory,
  setContextMenu,
  toolbarState,
  workspaceOptions,
  objectBrush,
  terrainBrush,
  areaEditingTool,
  tileProductionCertification,
  syncAuroraAreaPlacementPreview,
  clearAuroraAreaPlacementPreview,
  onAuroraAreaEditingFeedback,
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
  const auroraAreaPaintStrokeRef = useRef<AuroraAreaPaintStrokeState>({
    active: false,
    historyCommitted: false,
    visitedTargets: new Set()
  });
  const auroraAreaPlacementPreviewRef = useRef<AuroraAreaPointerPlacementPreview | null>(null);
  const selectedAuroraAreaCellRef = useRef<{
    sceneId: string;
    row: number;
    col: number;
  } | null>(null);
  const selectedAuroraAreaCellsRef = useRef<{
    sceneId: string;
    cells: Array<{ row: number; col: number }>;
  } | null>(null);

  const clearAuroraAreaPlacementPreviewState = useCallback(() => {
    auroraAreaPlacementPreviewRef.current = null;
    const runtime = runtimeRef.current;
    if (runtime) {
      clearAuroraAreaPlacementPreview?.(runtime);
    }
  }, [clearAuroraAreaPlacementPreview, runtimeRef]);

  const reportBlockedProductionAdmission = useCallback((
    admission: AreaTileProductionPlacementAdmissionResult,
    operationKind: Exclude<AuroraAreaEditingTool["kind"], "inspect">,
  ) => {
    auroraAreaPaintStrokeRef.current = {
      active: false,
      historyCommitted: false,
      visitedTargets: new Set(),
    };
    const firstDiagnostic = admission.diagnostics[0];
    onAuroraAreaEditingFeedback?.({
      variant: "error",
      message: formatAreaTileProductionPlacementBlocker(admission),
    });
    trackTelemetry("scene.area_tiles.production_admission.blocked", {
      userId,
      code: admission.code,
      operationKind,
      tilesetResRef: admission.tilesetResRef,
      changedTileIdCount: admission.tileIds.length,
      firstBlockedTileId: firstDiagnostic?.tileId,
      firstBlockedStage: firstDiagnostic?.stage,
    });
  }, [onAuroraAreaEditingFeedback, trackTelemetry, userId]);

  const admitAuroraAreaCandidate = useCallback((
    beforeScene: AreaScene,
    afterScene: AreaScene,
    operationKind: Exclude<AuroraAreaEditingTool["kind"], "inspect">,
  ): boolean => {
    const before = beforeScene.auroraAreaEditing;
    const after = afterScene.auroraAreaEditing;
    if (!before || !after) return true;
    const candidateTileIds = collectChangedAuroraAreaTileDefinitionIds(
      before.state,
      after.state,
    );
    if (candidateTileIds.length === 0) return true;
    const admission = evaluateAreaTileProductionPlacementAdmission({
      tilesetResRef: after.definition.tilesetResRef,
      candidateTileIds,
      certification: tileProductionCertification,
    });
    if (admission.allowed) return true;
    reportBlockedProductionAdmission(admission, operationKind);
    return false;
  }, [
    reportBlockedProductionAdmission,
    tileProductionCertification,
  ]);

  const resolveAuroraAreaPointerPlacementPreview = useCallback(
    (world: { x: number; y: number }): AuroraAreaPointerPlacementEvaluation | null => {
      const payload = scene.auroraAreaEditing;
      if (
        !payload ||
        areaEditingTool.kind === "inspect"
      ) {
        clearAuroraAreaPlacementPreviewState();
        return null;
      }

      const tile = findTileAtWorld(scene, world.x, world.y);
      if (!tile) {
        clearAuroraAreaPlacementPreviewState();
        return null;
      }

      const selection: AuroraAreaPalettePlacement = areaEditingTool.kind === "group"
        ? {
            kind: "group",
            groupId: areaEditingTool.groupId,
            orientation: areaEditingTool.orientation
          }
        : areaEditingTool.kind === "terrain"
          ? { kind: "terrain", terrain: areaEditingTool.terrain }
          : areaEditingTool.kind === "crosser"
            ? {
                kind: "crosser",
                crosser: areaEditingTool.crosser,
                edge: resolveAuroraAreaEdgeAtWorld(world)
              }
            : areaEditingTool.kind === "height"
              ? { kind: "height", delta: areaEditingTool.delta }
              : { kind: "eraser" };
      const preview = resolveAuroraAreaPlacementPreview({
        payload: { state: payload.state, definition: payload.definition },
        hoveredCell: { row: tile.row, col: tile.col },
        selection,
        selector: createAuroraAreaPlacementSelector(
          scene.sceneId,
          tile.row,
          tile.col,
          areaEditingTool
        )
      });
      const productionAdmission = preview.valid && preview.resultTileIds.length > 0
        ? evaluateAreaTileProductionPlacementAdmission({
            tilesetResRef: payload.definition.tilesetResRef,
            candidateTileIds: preview.resultTileIds,
            certification: tileProductionCertification,
          })
        : null;
      const evaluation: AuroraAreaPointerPlacementEvaluation = {
        preview,
        productionAdmission,
        valid: preview.valid && productionAdmission?.allowed !== false,
        message: productionAdmission?.allowed === false
          ? formatAreaTileProductionPlacementBlocker(productionAdmission)
          : preview.message,
      };
      auroraAreaPlacementPreviewRef.current = {
        ...evaluation,
        sceneId: scene.sceneId,
        tileId: tile.id
      };

      const runtime = runtimeRef.current;
      if (runtime) {
        const elevationByCell = new Map(
          scene.tiles.map((candidate) => [
            `${candidate.row}:${candidate.col}`,
            candidate.height ?? 0
          ])
        );
        syncAuroraAreaPlacementPreview?.(runtime, {
          cells: preview.targetCells.map((cell) => ({
            row: cell.row,
            col: cell.col,
            valid: evaluation.valid,
            elevation: elevationByCell.get(`${cell.row}:${cell.col}`) ?? 0
          })),
          kind: preview.kind,
          anchor: preview.anchor,
          targetEdge: selection.kind === "crosser" ? selection.edge : undefined
        });
      }
      return evaluation;
    },
    [
      areaEditingTool,
      clearAuroraAreaPlacementPreviewState,
      runtimeRef,
      scene,
      syncAuroraAreaPlacementPreview,
      tileProductionCertification,
      toolbarState.selectionMode
    ]
  );

  useEffect(() => {
    if (selectedTileIds.length === 0) {
      selectedAuroraAreaCellsRef.current = null;
      return;
    }
    selectedAuroraAreaCellsRef.current = {
      sceneId: scene.sceneId,
      cells: selectedTileIds.flatMap((id) => {
        const tile = scene.tiles.find((candidate) => candidate.id === id);
        return tile ? [{ row: tile.row, col: tile.col }] : [];
      })
    };
  }, [scene.sceneId, selectedTileIds]);

  // Topology operations can replace runtime tile ids. Preserve every selected
  // Area cell and remap it after the next scene projection.
  useEffect(() => {
    const selectedCells = selectedAuroraAreaCellsRef.current;
    if (setSelectedTileIds) {
      if (selectedCells?.sceneId === scene.sceneId && selectedCells.cells.length > 0) {
        setSelectedTileIds(
          selectedCells.cells.flatMap((cell) => {
            const tile = scene.tiles.find(
              (candidate) => candidate.row === cell.row && candidate.col === cell.col
            );
            return tile ? [tile.id] : [];
          })
        );
      }
      return;
    }
    const selectedCell = selectedAuroraAreaCellRef.current;
    if (!selectedCell || selectedCell.sceneId !== scene.sceneId) {
      return;
    }
    const projectedTile = scene.tiles.find(
      (tile) => tile.row === selectedCell.row && tile.col === selectedCell.col
    );
    setSelectedTileId(projectedTile?.id ?? null);
  }, [scene.sceneId, scene.tiles, setSelectedTileId, setSelectedTileIds]);

  // Palette changes and external Area scene updates invalidate any cursor result.
  useEffect(() => {
    clearAuroraAreaPlacementPreviewState();
    return clearAuroraAreaPlacementPreviewState;
  }, [
    clearAuroraAreaPlacementPreviewState,
    scene.sceneId,
    scene.auroraAreaEditing?.state,
    scene.auroraAreaEditing?.definition,
    scene.auroraAreaEditing?.terrainBrush,
    scene.auroraAreaEditing?.selectedGroupId,
    scene.auroraAreaEditing?.groupOrientation,
    areaEditingTool,
    toolbarState.selectionMode
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearAuroraAreaPlacementPreviewState();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clearAuroraAreaPlacementPreviewState]);

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

      const mode = ctrlAdditive ? "add" : workspaceOptions.selectionBoxMode;
      if (scene.auroraAreaEditing && areaEditingTool.kind === "inspect" && setSelectedTileIds) {
        const tileIdsInBox = scene.tiles
          .slice()
          .sort((left, right) => left.row - right.row || left.col - right.col)
          .filter((tile) => {
            const corners = [
              pointerRuntimePort.worldToScreen(runtime, tile.col, tile.row),
              pointerRuntimePort.worldToScreen(runtime, tile.col + 1, tile.row),
              pointerRuntimePort.worldToScreen(runtime, tile.col, tile.row + 1),
              pointerRuntimePort.worldToScreen(runtime, tile.col + 1, tile.row + 1)
            ];
            const tileMinX = Math.min(...corners.map((corner) => corner.x));
            const tileMaxX = Math.max(...corners.map((corner) => corner.x));
            const tileMinY = Math.min(...corners.map((corner) => corner.y));
            const tileMaxY = Math.max(...corners.map((corner) => corner.y));
            return tileMaxX >= minX && tileMinX <= maxX && tileMaxY >= minY && tileMinY <= maxY;
          })
          .map((tile) => tile.id);
        setSelectedObjectIds([]);
        setSelectedTileIds((current) =>
          resolveAuroraAreaBoxSelection(current, tileIdsInBox, mode)
        );
        trackTelemetry("scene.area_tiles.selection.box", {
          userId,
          mode,
          selectedInBox: tileIdsInBox.length
        });
        return;
      }

      setSelectedTileId(null);
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
      areaEditingTool.kind,
      pointerRuntimePort,
      runtimeRef,
      scene,
      setSelectedObjectIds,
      setSelectedTileId,
      setSelectedTileIds,
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

      auroraAreaPaintStrokeRef.current = {
        active: false,
        historyCommitted: false,
        visitedTargets: new Set()
      };
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

      const auroraAreaPaintToolActive = Boolean(
        scene.auroraAreaEditing && areaEditingTool.kind !== "inspect"
      );
      if (toolbarState.selectionMode === "terrain" || auroraAreaPaintToolActive) {
        if (!tile) {
          setSelectedTileId(null);
          clearAuroraAreaPlacementPreviewState();
          return;
        }

        selectedAuroraAreaCellRef.current = {
          sceneId: scene.sceneId,
          row: tile.row,
          col: tile.col
        };
        const payload = scene.auroraAreaEditing;
        if (payload && areaEditingTool.kind === "inspect" && event.ctrlKey && setSelectedTileIds) {
          setSelectedTileIds((current) =>
            resolveAuroraAreaInspectSelection(current, tile.id, true)
          );
        } else {
          setSelectedTileId(tile.id);
        }
        setSelectedObjectIds([]);
        if (payload && areaEditingTool.kind === "inspect") {
          onAuroraAreaEditingFeedback?.(null);
          clearAuroraAreaPlacementPreviewState();
          return;
        }
        const activeTerrainBrush = areaEditingTool.kind === "terrain"
          ? areaEditingTool.terrain
          : payload?.terrainBrush ?? terrainBrush;
        const preview = payload
          ? resolveAuroraAreaPointerPlacementPreview({ x: groundHit!.x, y: groundHit!.y })
          : null;
        if (payload && !preview?.valid) {
          if (preview?.productionAdmission?.allowed === false) {
            reportBlockedProductionAdmission(
              preview.productionAdmission,
              areaEditingTool.kind === "inspect" ? "terrain" : areaEditingTool.kind,
            );
          } else {
            onAuroraAreaEditingFeedback?.({
              variant: "error",
              message: preview?.message ?? "This Area tile operation is not valid at the selected cell."
            });
          }
          return;
        }

        if (payload) {
          onAuroraAreaEditingFeedback?.(null);
        }

        const shouldTrackTerrainPaint = tile.terrain !== activeTerrainBrush;
        const supportsPaintStroke = Boolean(
          payload &&
          (areaEditingTool.kind === "terrain" ||
            areaEditingTool.kind === "crosser" ||
            areaEditingTool.kind === "height")
        );
        if (supportsPaintStroke) {
          const target = areaEditingTool.kind === "crosser"
            ? `${tile.row}:${tile.col}:${resolveAuroraAreaEdgeAtWorld(groundHit!)}`
            : `${tile.row}:${tile.col}`;
          auroraAreaPaintStrokeRef.current = {
            active: true,
            historyCommitted: false,
            visitedTargets: new Set([target])
          };
        }

        setSceneHistory((current) => {
          const currentPayload = current.present.auroraAreaEditing;
          const selector = areaEditingTool.kind === "inspect"
            ? undefined
            : createAuroraAreaPlacementSelector(
                current.present.sceneId,
                tile.row,
                tile.col,
                areaEditingTool
              );
          const nextScene = currentPayload
            ? areaEditingTool.kind === "group"
              ? sceneViewportPort.placeAuroraAreaGroup(
                  current.present,
                  tile.id,
                  areaEditingTool.groupId,
                  areaEditingTool.orientation,
                  selector
                )
              : areaEditingTool.kind === "eraser"
                ? sceneViewportPort.applyAuroraAreaEraser(current.present, tile.id)
              : areaEditingTool.kind === "crosser"
                ? sceneViewportPort.applyAuroraAreaCrosserBrush(
                    current.present,
                    tile.id,
                    resolveAuroraAreaEdgeAtWorld(groundHit!),
                    areaEditingTool.crosser,
                    selector
                  )
                : areaEditingTool.kind === "height"
                  ? sceneViewportPort.applyAuroraAreaHeightBrush(
                      current.present,
                      tile.id,
                      areaEditingTool.delta,
                      selector
                    )
                  : sceneViewportPort.applyAuroraAreaTerrainBrush(
                  current.present,
                  tile.id,
                  activeTerrainBrush,
                  selector
                  )
            : sceneViewportPort.updateTileTerrain(current.present, tile.id, terrainBrush);
          if (nextScene === current.present) {
            return current;
          }
          if (
            currentPayload &&
            areaEditingTool.kind !== "inspect" &&
            !admitAuroraAreaCandidate(current.present, nextScene, areaEditingTool.kind)
          ) {
            return current;
          }
          if (supportsPaintStroke) {
            auroraAreaPaintStrokeRef.current.historyCommitted = true;
          }
          return sceneViewportPort.commitHistory(current, nextScene);
        });
        if (areaEditingTool.kind === "terrain" && shouldTrackTerrainPaint) {
          trackTelemetry("scene.tiles.paint", {
            userId,
            tileId: tile.id,
            terrain: activeTerrainBrush
          });
        }
        if (payload) {
          clearAuroraAreaPlacementPreviewState();
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

        const created = kind === "doors"
          ? sceneViewportPort.createDoorAtHook(scene, placementX, placementY, newObjectSequence)
          : sceneViewportPort.createObject(kind, placementX, placementY, newObjectSequence);
        if (!created) {
          setSelectedTileId(tile.id);
          trackTelemetry("scene.objects.add_blocked_door_hook", {
            userId,
            kind,
            source: "alt_click",
            tileId: tile.id
          });
          return;
        }
        if (kind !== "doors" && toolbarState.canvasDebug.snapAngle) {
          created.bearing = snapAngleRadians(created.bearing, workspaceOptions.snapAngleStepDeg);
        }
        if (kind !== "doors" && toolbarState.canvasDebug.snapHeight) {
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
      areaEditingTool,
      admitAuroraAreaCandidate,
      isSelectableByActiveFilters,
      anchoredOverlayRuntimePort,
      clearAuroraAreaPlacementPreviewState,
      objectBrush,
      pointerRuntimePort,
      runtimeRef,
      scene,
      sceneViewportPort,
      selectedObjectIds,
      selectedTileIds,
      setContextMenu,
      setSceneHistory,
      setSelectedObjectIds,
      setSelectedTileId,
      setSelectedTileIds,
      setSelectionBox,
      terrainBrush,
      resolveAuroraAreaPointerPlacementPreview,
      reportBlockedProductionAdmission,
      toolbarState.selectionMode,
      toolbarState.selectionScope,
      toolbarState.canvasDebug,
      trackTelemetry,
      userId,
      viewportFacade,
      visibleObjects,
      workspaceOptions,
      lastPointerWorldRef,
      nextObjectSequenceRef,
      onAuroraAreaEditingFeedback
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

    const areaPaintStroke = auroraAreaPaintStrokeRef.current;
    if (areaPaintStroke.active) {
      if (!(event.buttons & 1)) {
        auroraAreaPaintStrokeRef.current = {
          active: false,
          historyCommitted: false,
          visitedTargets: new Set()
        };
        return;
      }
      const hoveredTile = groundHit ? findTileAtWorld(scene, groundHit.x, groundHit.y) : null;
      if (
        hoveredTile &&
        (areaEditingTool.kind === "terrain" ||
          areaEditingTool.kind === "crosser" ||
          areaEditingTool.kind === "height")
      ) {
        const targetEdge = areaEditingTool.kind === "crosser"
          ? resolveAuroraAreaEdgeAtWorld(groundHit!)
          : undefined;
        const targetKey = targetEdge
          ? `${hoveredTile.row}:${hoveredTile.col}:${targetEdge}`
          : `${hoveredTile.row}:${hoveredTile.col}`;
        if (!areaPaintStroke.visitedTargets.has(targetKey)) {
          areaPaintStroke.visitedTargets.add(targetKey);
          setSceneHistory((current) => {
            const currentTile = current.present.tiles.find(
              (tile) => tile.row === hoveredTile.row && tile.col === hoveredTile.col
            );
            if (!currentTile || !current.present.auroraAreaEditing) {
              return current;
            }
            const selector = createAuroraAreaPlacementSelector(
              current.present.sceneId,
              currentTile.row,
              currentTile.col,
              areaEditingTool
            );
            const nextScene = areaEditingTool.kind === "crosser"
              ? sceneViewportPort.applyAuroraAreaCrosserBrush(
                  current.present,
                  currentTile.id,
                  targetEdge!,
                  areaEditingTool.crosser,
                  selector
                )
              : areaEditingTool.kind === "height"
                ? sceneViewportPort.applyAuroraAreaHeightBrush(
                    current.present,
                    currentTile.id,
                    areaEditingTool.delta,
                    selector
                  )
                : sceneViewportPort.applyAuroraAreaTerrainBrush(
                    current.present,
                    currentTile.id,
                    areaEditingTool.terrain,
                    selector
                  );
            if (nextScene === current.present) {
              return current;
            }
            if (!admitAuroraAreaCandidate(
              current.present,
              nextScene,
              areaEditingTool.kind,
            )) {
              return current;
            }
            if (!areaPaintStroke.historyCommitted) {
              areaPaintStroke.historyCommitted = true;
              return sceneViewportPort.commitHistory(current, nextScene);
            }
            return {
              ...current,
              present: nextScene,
              future: []
            };
          });
          clearAuroraAreaPlacementPreviewState();
        }
      }
      return;
    }

    if (pointerRuntimePort.isTransformDragging(runtime)) {
      return;
    }

    if (selectionBox.active) {
      const local = pointerRuntimePort.pointerToLocal(runtime, event);
      setSelectionBox((current) => ({
        ...current,
        currentX: local.x,
        currentY: local.y
      }));
      return;
    }

    if (
      toolbarState.selectionMode === "terrain" ||
      Boolean(scene.auroraAreaEditing && areaEditingTool.kind !== "inspect")
    ) {
      if (groundHit) {
        resolveAuroraAreaPointerPlacementPreview({ x: groundHit.x, y: groundHit.y });
      } else {
        clearAuroraAreaPlacementPreviewState();
      }
      return;
    }
  }, [
    clearAuroraAreaPlacementPreviewState,
    admitAuroraAreaCandidate,
    areaEditingTool,
    lastPointerWorldRef,
    moveSelectedObjectsByDelta,
    pointerRuntimePort,
    runtimeRef,
    scene,
    sceneViewportPort,
    selectionBox.active,
    setSceneHistory,
    setSelectionBox,
    resolveAuroraAreaPointerPlacementPreview,
    toolbarState.selectionMode
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

      if (auroraAreaPaintStrokeRef.current.active) {
        auroraAreaPaintStrokeRef.current = {
          active: false,
          historyCommitted: false,
          visitedTargets: new Set()
        };
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

  const handleDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const runtime = runtimeRef.current;
      if (
        !runtime ||
        event.button !== 0 ||
        !scene.auroraAreaEditing ||
        areaEditingTool.kind !== "inspect" ||
        !setSelectedTileIds ||
        pointerRuntimePort.isTransformInteractionActive(runtime)
      ) {
        return;
      }
      const pointerRay = pointerRuntimePort.pointerToRay(runtime, event);
      const groundHit = pointerRuntimePort.intersectionOnGround(runtime, pointerRay);
      const anchor = groundHit ? findTileAtWorld(scene, groundHit.x, groundHit.y) : null;
      if (!anchor) return;
      const connectedTileIds = resolveAuroraAreaConnectedTerrainSelection(
        scene.tiles,
        anchor.id
      );
      if (connectedTileIds.length < 1) return;
      setSelectedObjectIds([]);
      setSelectedTileIds(connectedTileIds);
      trackTelemetry("scene.area_tiles.selection.connected_terrain", {
        userId,
        anchorTileId: anchor.id,
        terrain: anchor.terrain,
        selectedCount: connectedTileIds.length
      });
    },
    [
      areaEditingTool.kind,
      pointerRuntimePort,
      runtimeRef,
      scene,
      setSelectedObjectIds,
      setSelectedTileIds,
      trackTelemetry,
      userId
    ]
  );

  const handleMouseLeave = useCallback(() => {
    auroraAreaPaintStrokeRef.current = {
      active: false,
      historyCommitted: false,
      visitedTargets: new Set()
    };
    clearAuroraAreaPlacementPreviewState();
  }, [clearAuroraAreaPlacementPreviewState]);

  return {
    handleMouseDown,
    handleDoubleClick,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave
  };
}
