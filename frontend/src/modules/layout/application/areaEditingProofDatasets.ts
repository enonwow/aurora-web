import type {
  AreaScene,
  AuroraAreaEditingTool,
  SceneHistoryState
} from "../contracts";

export interface AreaEditingProofSelectionSnapshot {
  anchorTileId: string | null;
  tileIds: string[];
  cells: Array<{ row: number; col: number }>;
  group: {
    groupId: string;
    underlayPresent: boolean;
  } | null;
}

export interface AreaEditingProofHistorySnapshot {
  past: AreaEditingProofSceneRevisionSnapshot[];
  present: AreaEditingProofSceneRevisionSnapshot;
  future: AreaEditingProofSceneRevisionSnapshot[];
}

export interface AreaEditingProofSceneRevisionSnapshot {
  sceneId: string;
  updatedAtUnixMs: number;
  state: NonNullable<AreaScene["auroraAreaEditing"]>["state"] | null;
}

export interface AreaEditingProofCommandFeedback {
  variant: "success" | "error";
  message: string;
}

function canonicalizeProofValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeProofValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, entry]) => [key, canonicalizeProofValue(entry)])
    );
  }
  return value;
}

/** Canonical JSON keeps proof captures comparable across renders and engines. */
export function serializeAreaEditingProofValue(value: unknown): string {
  return JSON.stringify(canonicalizeProofValue(value));
}

/** Stable, dev-only proof payload for runtime Area-selection capture. */
export function buildAreaEditingProofSelectionSnapshot(
  scene: AreaScene,
  anchorTileId: string | null,
  selectedTileIds: readonly string[]
): AreaEditingProofSelectionSnapshot {
  const tileIds = [...new Set(selectedTileIds)].filter((tileId) =>
    scene.tiles.some((tile) => tile.id === tileId)
  );
  const cells = tileIds.flatMap((tileId) => {
    const tile = scene.tiles.find((candidate) => candidate.id === tileId);
    return tile ? [{ row: tile.row, col: tile.col }] : [];
  });
  const anchorTile = anchorTileId
    ? scene.tiles.find((tile) => tile.id === anchorTileId) ?? null
    : null;
  const group = anchorTile && scene.auroraAreaEditing
    ? scene.auroraAreaEditing.state.groupInstances.find((candidate) =>
        candidate.tileIds.includes(anchorTile.id) ||
        candidate.cells.some(
          (cell) => cell.row === anchorTile.row && cell.col === anchorTile.col
        )
      ) ?? null
    : null;

  return {
    anchorTileId: anchorTile?.id ?? null,
    tileIds,
    cells,
    group: group
      ? {
          groupId: group.groupId,
          underlayPresent: Boolean(group.underlay)
        }
      : null
  };
}

export function serializeAreaEditingProofSelection(
  scene: AreaScene,
  anchorTileId: string | null,
  selectedTileIds: readonly string[]
): string {
  return serializeAreaEditingProofValue(
    buildAreaEditingProofSelectionSnapshot(scene, anchorTileId, selectedTileIds)
  );
}

export function serializeAreaEditingProofState(scene: AreaScene): string {
  return serializeAreaEditingProofValue(scene.auroraAreaEditing?.state ?? null);
}

function buildAreaEditingProofSceneRevisionSnapshot(
  scene: AreaScene
): AreaEditingProofSceneRevisionSnapshot {
  return {
    sceneId: scene.sceneId,
    updatedAtUnixMs: scene.updatedAtUnixMs,
    state: scene.auroraAreaEditing?.state ?? null
  };
}

export function buildAreaEditingProofHistorySnapshot(
  history: SceneHistoryState
): AreaEditingProofHistorySnapshot {
  return {
    past: history.past.map(buildAreaEditingProofSceneRevisionSnapshot),
    present: buildAreaEditingProofSceneRevisionSnapshot(history.present),
    future: history.future.map(buildAreaEditingProofSceneRevisionSnapshot)
  };
}

export function serializeAreaEditingProofHistory(history: SceneHistoryState): string {
  return serializeAreaEditingProofValue(buildAreaEditingProofHistorySnapshot(history));
}

export function serializeAreaEditingProofTool(tool: AuroraAreaEditingTool): string {
  return serializeAreaEditingProofValue(tool);
}

export function serializeAreaEditingProofFeedback(
  feedback: AreaEditingProofCommandFeedback | null
): string {
  return serializeAreaEditingProofValue(feedback);
}
