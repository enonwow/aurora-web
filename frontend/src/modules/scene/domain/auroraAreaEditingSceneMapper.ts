import type { AreaScene, SceneTile } from "../contracts";
import {
  applyCrosserStroke,
  applyTerrainStroke,
  changeAuroraAreaTileHeight,
  changeAuroraAreaGroupHeightAtCell,
  placeAuroraAreaGroup,
  removeAuroraAreaGroupAtCell,
  resolveAuroraAreaGroupInstanceAtCell,
  rotateAuroraAreaGroupAtCell,
  type AuroraAreaCandidateSelector,
  type AuroraAreaEdge,
  type AuroraAreaEditingState,
  type AuroraAreaTilesetDefinition
} from "./auroraAreaEditing";
import { eraseAuroraAreaConservatively } from "./auroraAreaEraser";

export function applyAuroraAreaEraser(scene: AreaScene, tileId: string): AreaScene {
  const payload = scene.auroraAreaEditing;
  const selected = scene.tiles.find((tile) => tile.id === tileId);
  if (!payload || !selected) return scene;
  const result = eraseAuroraAreaConservatively(
    payload.state,
    payload.definition,
    { row: selected.row, col: selected.col }
  );
  return result.ok && result.changedTileIds.length > 0
    ? applyAuroraAreaEditingStateToScene(scene, result.state, payload.definition, payload.terrainBrush)
    : scene;
}

export function applyAuroraAreaCrosserBrush(
  scene: AreaScene,
  tileId: string,
  edge: AuroraAreaEdge,
  crosser: string,
  selector?: AuroraAreaCandidateSelector
): AreaScene {
  const payload = scene.auroraAreaEditing;
  const selected = scene.tiles.find((tile) => tile.id === tileId);
  if (!payload || !selected) return scene;
  const result = applyCrosserStroke(
    payload.state,
    payload.definition,
    [{ row: selected.row, col: selected.col, edge }],
    crosser,
    selector
  );
  return result.ok && result.changedTileIds.length > 0
    ? applyAuroraAreaEditingStateToScene(scene, result.state, payload.definition, payload.terrainBrush)
    : scene;
}

export function applyAuroraAreaHeightBrush(
  scene: AreaScene,
  tileId: string,
  delta: -1 | 1,
  selector?: AuroraAreaCandidateSelector
): AreaScene {
  const payload = scene.auroraAreaEditing;
  const selected = scene.tiles.find((tile) => tile.id === tileId);
  if (!payload || !selected) return scene;
  const result = changeAuroraAreaTileHeight(
    payload.state,
    payload.definition,
    { row: selected.row, col: selected.col },
    delta,
    selector
  );
  return result.ok && result.changedTileIds.length > 0
    ? applyAuroraAreaEditingStateToScene(scene, result.state, payload.definition, payload.terrainBrush)
    : scene;
}

/** Converts pure topology mutations into the render scene consumed by the viewport. */
export function applyAuroraAreaTerrainBrush(
  scene: AreaScene,
  tileId: string,
  terrain: string,
  selector?: AuroraAreaCandidateSelector
): AreaScene {
  const payload = scene.auroraAreaEditing;
  if (!payload) {
    return scene;
  }
  const selected = scene.tiles.find((tile) => tile.id === tileId);
  if (!selected) {
    return scene;
  }
  const result = applyTerrainStroke(
    payload.state,
    payload.definition,
    [{ row: selected.row, col: selected.col }],
    terrain,
    selector
  );
  if (!result.ok) {
    return scene;
  }
  return applyAuroraAreaEditingStateToScene(scene, result.state, payload.definition, terrain);
}

export function placeAuroraAreaGroupAtSceneTile(
  scene: AreaScene,
  tileId: string,
  groupId: string,
  orientation: 0 | 1 | 2 | 3,
  selector?: AuroraAreaCandidateSelector
): AreaScene {
  const payload = scene.auroraAreaEditing;
  const selected = scene.tiles.find((tile) => tile.id === tileId);
  if (!payload || !selected) {
    return scene;
  }
  const result = placeAuroraAreaGroup(
    payload.state,
    payload.definition,
    groupId,
    { row: selected.row, col: selected.col },
    orientation,
    selector
  );
  if (!result.ok) {
    return scene;
  }
  const next = applyAuroraAreaEditingStateToScene(
    scene,
    result.state,
    payload.definition,
    payload.terrainBrush
  );
  return {
    ...next,
    auroraAreaEditing: next.auroraAreaEditing
      ? { ...next.auroraAreaEditing, selectedGroupId: groupId, groupOrientation: orientation }
      : undefined
  };
}

/** Removes the whole SET group selected through any one of its rendered member tiles. */
export function removeAuroraAreaGroupAtSceneTile(scene: AreaScene, tileId: string): AreaScene {
  const payload = scene.auroraAreaEditing;
  const selected = scene.tiles.find((tile) => tile.id === tileId);
  if (!payload || !selected) {
    return scene;
  }

  const result = removeAuroraAreaGroupAtCell(
    payload.state,
    payload.definition,
    { row: selected.row, col: selected.col }
  );
  return result.ok
    ? applyAuroraAreaEditingStateToScene(
        scene,
        result.state,
        payload.definition,
        payload.terrainBrush
      )
    : scene;
}

/** Rotates the whole SET group selected through any one of its rendered member tiles. */
export function rotateAuroraAreaGroupAtSceneTile(
  scene: AreaScene,
  tileId: string,
  delta: -1 | 1
): AreaScene {
  if (delta !== -1 && delta !== 1) {
    return scene;
  }
  const payload = scene.auroraAreaEditing;
  const selected = scene.tiles.find((tile) => tile.id === tileId);
  if (!payload || !selected) {
    return scene;
  }
  const selectedGroup = resolveAuroraAreaGroupInstanceAtCell(payload.state, {
    row: selected.row,
    col: selected.col
  });
  if (!selectedGroup) {
    return scene;
  }

  const result = rotateAuroraAreaGroupAtCell(
    payload.state,
    payload.definition,
    { row: selected.row, col: selected.col },
    delta
  );
  if (!result.ok) {
    return scene;
  }
  const next = applyAuroraAreaEditingStateToScene(
    scene,
    result.state,
    payload.definition,
    payload.terrainBrush
  );
  const rotatedGroup = result.state.groupInstances.find(
    (group) =>
      group.groupId === selectedGroup.groupId &&
      group.anchorRow === selectedGroup.anchorRow &&
      group.anchorCol === selectedGroup.anchorCol
  );
  return rotatedGroup && next.auroraAreaEditing
    ? {
        ...next,
        auroraAreaEditing: {
          ...next.auroraAreaEditing,
          selectedGroupId: rotatedGroup.groupId,
          groupOrientation: rotatedGroup.orientation
        }
      }
    : next;
}

/** Changes the common height of the SET group selected through a member tile. */
export function changeAuroraAreaGroupHeightAtSceneTile(
  scene: AreaScene,
  tileId: string,
  delta: -1 | 1
): AreaScene {
  if (delta !== -1 && delta !== 1) {
    return scene;
  }
  const payload = scene.auroraAreaEditing;
  const selected = scene.tiles.find((tile) => tile.id === tileId);
  if (!payload || !selected) {
    return scene;
  }

  const result = changeAuroraAreaGroupHeightAtCell(
    payload.state,
    payload.definition,
    { row: selected.row, col: selected.col },
    delta
  );
  return result.ok
    ? applyAuroraAreaEditingStateToScene(
        scene,
        result.state,
        payload.definition,
        payload.terrainBrush
      )
    : scene;
}

export function applyAuroraAreaEditingStateToScene(
  scene: AreaScene,
  state: AuroraAreaEditingState,
  definition: AuroraAreaTilesetDefinition,
  terrainBrush: string
): AreaScene {
  const previousByCell = new Map(scene.tiles.map((tile) => [`${tile.row}:${tile.col}`, tile]));
  const definitionById = new Map(definition.tiles.map((tile) => [tile.tileId, tile]));
  const tiles: SceneTile[] = state.tiles
    .slice()
    .sort((left, right) => left.row - right.row || left.col - right.col)
    .map((tile) => {
      const previous = previousByCell.get(`${tile.row}:${tile.col}`);
      const source = definitionById.get(tile.tileId);
      const mapped: SceneTile = {
        ...(previous ?? fallbackSceneTile(scene, tile.row, tile.col)),
        id: tile.id,
        row: tile.row,
        col: tile.col,
        terrain: resolveSceneTileTerrain(state, tile.row, tile.col, terrainBrush),
        orientation: tile.orientation,
        rotateTexture: tile.orientation % 2 === 1,
        plot: false,
        source: "aurora_tile_list",
        areaId: scene.sceneId,
        tileIndex: tile.row * state.width + tile.col,
        tileId: tile.tileId,
        tilesetResRef: state.tilesetResRef,
        modelResRef: source?.modelResRef,
        ...(source?.modelResRef ? { modelSource: "set-tile-section" as const } : {}),
        tilesetOrientation: source?.orientation ?? 0,
        height: tile.height,
        mainLight1: tile.mainLight1,
        mainLight2: tile.mainLight2,
        sourceLight1: tile.sourceLight1,
        sourceLight2: tile.sourceLight2,
        animLoop1: tile.animLoop1,
        animLoop2: tile.animLoop2,
        animLoop3: tile.animLoop3
      };
      // A local Area draft may originate from the blank seed scene. Once a
      // real SET Tile_ID/model mapping exists it must not retain seed fallback
      // metadata, otherwise the terrain renderer stays on the generic mesh.
      delete mapped.fallbackReason;
      return mapped;
    });
  return {
    ...scene,
    width: state.width,
    height: state.height,
    tileSource: {
      type: "aurora_tile_list",
      tilesetResRef: state.tilesetResRef,
      tileCount: tiles.length
    },
    tiles,
    auroraAreaEditing: {
      ...scene.auroraAreaEditing,
      state,
      definition,
      terrainBrush
    },
    source: scene.source === "aurora_area" ? "aurora_area" : "local_draft"
  };
}

function resolveSceneTileTerrain(
  state: AuroraAreaEditingState,
  row: number,
  col: number,
  fallback: string
): SceneTile["terrain"] {
  const topology = state.topology;
  const points = [
    [row * 2, col * 2],
    [row * 2, (col + 1) * 2],
    [(row + 1) * 2, (col + 1) * 2],
    [(row + 1) * 2, col * 2]
  ] as const;
  const terrains = points.map(([pointRow, pointCol]) =>
    topology.tokens[pointRow * topology.tokenWidth + pointCol]
  );
  const uniform = terrains[0];
  // SceneTile predates arbitrary SET terrain names and retains a narrow seed
  // union. Runtime Area scenes intentionally carry the real SET identifier.
  return (uniform && terrains.every((terrain) => terrain === uniform) ? uniform : fallback) as SceneTile["terrain"];
}

function fallbackSceneTile(scene: AreaScene, row: number, col: number): SceneTile {
  return {
    id: `aurora-area-fallback:${row}:${col}`,
    row,
    col,
    terrain: "corridor",
    orientation: 0,
    rotateTexture: false,
    plot: false,
    source: scene.source === "aurora_area" ? "aurora_tile_list" : "seed",
    areaId: scene.sceneId
  };
}
