import {
  applyCrosserStroke,
  applyTerrainStroke,
  changeAuroraAreaTileHeight,
  placeAuroraAreaGroup,
  type AuroraAreaCandidateSelector,
  type AuroraAreaCell,
  type AuroraAreaEdge,
  type AuroraAreaCommandFailure,
  type AuroraAreaEditingState,
  type AuroraAreaTilesetDefinition,
  type AuroraAreaTilesetGroup
} from "./auroraAreaEditing";
import { createConservativeAuroraAreaEraserPlan } from "./auroraAreaEraser";
import {
  collectChangedAuroraAreaTileDefinitionIds as changedAreaTileDefinitionIds,
  collectChangedAuroraAreaTopologyTiles,
} from "./auroraAreaTileTopology";

/** The palette item being evaluated at the pointer's current Area cell. */
export type AuroraAreaPalettePlacement =
  | {
      kind: "terrain";
      terrain: string;
    }
  | {
      kind: "crosser";
      crosser: string;
      edge: AuroraAreaEdge;
    }
  | {
      kind: "height";
      delta: -1 | 1;
    }
  | {
      kind: "eraser";
    }
  | {
      kind: "group";
      groupId: string;
      orientation: 0 | 1 | 2 | 3;
    };

/**
 * The Aurora-only data needed to validate a palette placement. Its absence is
 * intentional: regular terrain editing still has a one-cell fallback preview.
 */
export interface AuroraAreaPlacementPayload {
  state: AuroraAreaEditingState;
  definition: AuroraAreaTilesetDefinition;
}

export interface AuroraAreaPlacementPreviewInput {
  payload?: AuroraAreaPlacementPayload | null;
  hoveredCell: AuroraAreaCell;
  selection: AuroraAreaPalettePlacement;
  /** Enables deterministic candidate selection in tests without changing state. */
  selector?: AuroraAreaCandidateSelector;
}

export type AuroraAreaPlacementPreviewSource = "aurora" | "terrain-fallback";

export type AuroraAreaPlacementPreviewStatus =
  | "valid"
  | "terrain-fallback"
  | "out-of-bounds"
  | "overlap"
  | "locked"
  | "no-matching-tile"
  | "unknown-group"
  | "payload-unavailable"
  | "height-limit"
  | "ambiguous-eraser"
  | "invalid-terrain";

export type AuroraAreaPlacementPreviewCode =
  | "OK"
  | "TERRAIN_FALLBACK"
  | "AURORA_PAYLOAD_REQUIRED"
  | "HEIGHT_LIMIT"
  | "AMBIGUOUS_ERASER"
  | "TERRAIN_EMPTY"
  | AuroraAreaCommandFailure["code"];

/**
 * A render-ready, ephemeral placement result. It deliberately excludes the
 * command's resulting Area state: previewing must never become a history edit.
 */
export interface AuroraAreaPlacementPreview {
  source: AuroraAreaPlacementPreviewSource;
  kind: AuroraAreaPalettePlacement["kind"];
  anchor: AuroraAreaCell;
  orientation?: 0 | 1 | 2 | 3;
  targetCells: AuroraAreaCell[];
  resultTileIds: number[];
  valid: boolean;
  status: AuroraAreaPlacementPreviewStatus;
  code: AuroraAreaPlacementPreviewCode;
  message: string;
}

/**
 * Resolves the cursor preview through the same immutable domain commands used
 * for a commit. The temporary command result is inspected only for validation
 * and is never returned or retained.
 */
export function resolveAuroraAreaPlacementPreview(
  input: AuroraAreaPlacementPreviewInput
): AuroraAreaPlacementPreview {
  const { hoveredCell, selection } = input;
  const anchor = copyCell(hoveredCell);
  const payload = input.payload ?? undefined;

  if (!payload) {
    return resolveWithoutAuroraPayload(anchor, selection);
  }

  if (selection.kind === "terrain") {
    return resolveTerrainPreview(payload, anchor, selection.terrain, input.selector);
  }
  if (selection.kind === "crosser") {
    return resolveCrosserPreview(payload, anchor, selection.edge, selection.crosser, input.selector);
  }
  if (selection.kind === "height") {
    return resolveHeightPreview(payload, anchor, selection.delta, input.selector);
  }
  if (selection.kind === "eraser") {
    const result = createConservativeAuroraAreaEraserPlan(
      payload.state,
      payload.definition,
      anchor
    );
    return result.ok
      ? preview({
          source: "aurora",
          kind: "eraser",
          anchor,
          targetCells: result.plan.affectedCells,
          resultTileIds: result.plan.replacements.map(
            (replacement) => replacement.tile.tileId,
          ),
          valid: true,
          status: "valid",
          code: "OK",
          message: `Eraser will retile ${result.plan.affectedCells.length} affected cell(s).`
        })
      : preview({
          source: "aurora",
          kind: "eraser",
          anchor,
          targetCells: [anchor],
          valid: false,
          status: "ambiguous-eraser",
          code: result.code,
          message: result.message
        });
  }
  return resolveGroupPreview(payload, anchor, selection.groupId, selection.orientation, input.selector);
}

function resolveWithoutAuroraPayload(
  anchor: AuroraAreaCell,
  selection: AuroraAreaPalettePlacement
): AuroraAreaPlacementPreview {
  if (selection.kind === "terrain") {
    if (!selection.terrain.trim()) {
      return preview({
        source: "terrain-fallback",
        kind: "terrain",
        anchor,
        targetCells: [anchor],
        valid: false,
        status: "invalid-terrain",
        code: "TERRAIN_EMPTY",
        message: "Select a terrain palette item before painting."
      });
    }
    return preview({
      source: "terrain-fallback",
      kind: "terrain",
      anchor,
      targetCells: [anchor],
      valid: true,
      status: "terrain-fallback",
      code: "TERRAIN_FALLBACK",
      message: "Terrain preview uses the non-Aurora one-cell fallback."
    });
  }

  if (selection.kind === "crosser" || selection.kind === "height" || selection.kind === "eraser") {
    return preview({
      source: "terrain-fallback",
      kind: selection.kind,
      anchor,
      targetCells: [anchor],
      valid: false,
      status: "payload-unavailable",
      code: "AURORA_PAYLOAD_REQUIRED",
      message: `SET ${selection.kind} editing requires an Aurora Area editing payload.`
    });
  }

  return preview({
    source: "terrain-fallback",
    kind: "group",
    anchor,
    orientation: selection.orientation,
    targetCells: [anchor],
    valid: false,
    status: "payload-unavailable",
    code: "AURORA_PAYLOAD_REQUIRED",
    message: "SET group placement requires an Aurora Area editing payload."
  });
}

function resolveCrosserPreview(
  payload: AuroraAreaPlacementPayload,
  anchor: AuroraAreaCell,
  edge: AuroraAreaEdge,
  crosser: string,
  selector: AuroraAreaCandidateSelector | undefined
): AuroraAreaPlacementPreview {
  const adjacent = adjacentCell(anchor, edge);
  const targetCells = [anchor, ...(withinBounds(payload.state, adjacent) ? [adjacent] : [])];
  const result = applyCrosserStroke(
    payload.state,
    payload.definition,
    [{ ...anchor, edge }],
    crosser,
    selector
  );
  const changedCells = result.ok ? changedAreaCells(payload.state, result.state) : [];
  return result.ok
    ? validPreview(
        "crosser",
        anchor,
        changedCells.length > 0 ? changedCells : targetCells,
        changedAreaTileDefinitionIds(payload.state, result.state),
      )
    : commandFailurePreview("crosser", anchor, targetCells, result);
}

function resolveHeightPreview(
  payload: AuroraAreaPlacementPayload,
  anchor: AuroraAreaCell,
  delta: -1 | 1,
  selector: AuroraAreaCandidateSelector | undefined
): AuroraAreaPlacementPreview {
  const result = changeAuroraAreaTileHeight(
    payload.state,
    payload.definition,
    anchor,
    delta,
    selector
  );
  const changedCells = result.ok ? changedAreaCells(payload.state, result.state) : [];
  return result.ok
    ? result.changedTileIds.length === 0
      ? preview({
          source: "aurora",
          kind: "height",
          anchor,
          targetCells: [anchor],
          valid: false,
          status: "height-limit",
          code: "HEIGHT_LIMIT",
          message: delta > 0
            ? "Tile height is already at Aurora's maximum of 32."
            : "Tile height is already at Aurora's minimum of 0."
        })
      : validPreview(
          "height",
          anchor,
          changedCells.length > 0 ? changedCells : [anchor],
          changedAreaTileDefinitionIds(payload.state, result.state),
        )
    : commandFailurePreview("height", anchor, [anchor], result);
}

function adjacentCell(cell: AuroraAreaCell, edge: AuroraAreaEdge): AuroraAreaCell {
  if (edge === "top") return { row: cell.row - 1, col: cell.col };
  if (edge === "right") return { row: cell.row, col: cell.col + 1 };
  if (edge === "bottom") return { row: cell.row + 1, col: cell.col };
  return { row: cell.row, col: cell.col - 1 };
}

function resolveTerrainPreview(
  payload: AuroraAreaPlacementPayload,
  anchor: AuroraAreaCell,
  terrain: string,
  selector: AuroraAreaCandidateSelector | undefined
): AuroraAreaPlacementPreview {
  if (!terrain.trim()) {
    return preview({
      source: "aurora",
      kind: "terrain",
      anchor,
      targetCells: [anchor],
      valid: false,
      status: "invalid-terrain",
      code: "TERRAIN_EMPTY",
      message: "Select a terrain palette item before painting."
    });
  }

  // Keep command invocation even for an invalid anchor: the preview uses the
  // same pure validation path as commit, then normalizes the command's legacy
  // out-of-bounds no-op into an explicit cursor result.
  const result = applyTerrainStroke(payload.state, payload.definition, [anchor], terrain, selector);
  if (!withinBounds(payload.state, anchor)) {
    return preview({
      source: "aurora",
      kind: "terrain",
      anchor,
      targetCells: [anchor],
      valid: false,
      status: "out-of-bounds",
      code: "TILE_UNKNOWN",
      message: `Tile (${anchor.row},${anchor.col}) falls outside Area bounds.`
    });
  }
  const changedCells = result.ok ? changedAreaCells(payload.state, result.state) : [];
  return result.ok
    ? validPreview(
        "terrain",
        anchor,
        changedCells.length > 0 ? changedCells : [anchor],
        changedAreaTileDefinitionIds(payload.state, result.state),
      )
    : commandFailurePreview("terrain", anchor, [anchor], result);
}

function changedAreaCells(
  before: AuroraAreaEditingState,
  after: AuroraAreaEditingState
): AuroraAreaCell[] {
  return collectChangedAuroraAreaTopologyTiles(before, after)
    .map((tile) => ({ row: tile.row, col: tile.col }));
}

function resolveGroupPreview(
  payload: AuroraAreaPlacementPayload,
  anchor: AuroraAreaCell,
  groupId: string,
  orientation: 0 | 1 | 2 | 3,
  selector: AuroraAreaCandidateSelector | undefined
): AuroraAreaPlacementPreview {
  const group = payload.definition.groups.find((candidate) => candidate.id === groupId);
  const targetCells = group ? groupCells(group, anchor, orientation) : [anchor];
  const result = placeAuroraAreaGroup(payload.state, payload.definition, groupId, anchor, orientation, selector);
  return result.ok
    ? validPreview(
        "group",
        anchor,
        targetCells,
        changedAreaTileDefinitionIds(payload.state, result.state),
        orientation,
      )
    : commandFailurePreview("group", anchor, targetCells, result, orientation);
}

function validPreview(
  kind: AuroraAreaPalettePlacement["kind"],
  anchor: AuroraAreaCell,
  targetCells: AuroraAreaCell[],
  resultTileIds: number[],
  orientation?: 0 | 1 | 2 | 3
): AuroraAreaPlacementPreview {
  return preview({
    source: "aurora",
    kind,
    anchor,
    ...(orientation === undefined ? {} : { orientation }),
    targetCells,
    resultTileIds,
    valid: true,
    status: "valid",
    code: "OK",
    message: "Placement is valid."
  });
}

function commandFailurePreview(
  kind: AuroraAreaPalettePlacement["kind"],
  anchor: AuroraAreaCell,
  targetCells: AuroraAreaCell[],
  failure: AuroraAreaCommandFailure,
  orientation?: 0 | 1 | 2 | 3
): AuroraAreaPlacementPreview {
  return preview({
    source: "aurora",
    kind,
    anchor,
    ...(orientation === undefined ? {} : { orientation }),
    targetCells,
    valid: false,
    status: statusForFailure(failure.code),
    code: failure.code,
    message: failure.message
  });
}

function statusForFailure(code: AuroraAreaCommandFailure["code"]): AuroraAreaPlacementPreviewStatus {
  switch (code) {
    case "GROUP_OUT_OF_BOUNDS":
      return "out-of-bounds";
    case "GROUP_OVERLAP":
      return "overlap";
    case "GROUP_LOCKED":
      return "locked";
    case "NO_MATCHING_TILE":
      return "no-matching-tile";
    case "AMBIGUOUS_ERASER":
      return "ambiguous-eraser";
    case "GROUP_UNKNOWN":
      return "unknown-group";
    case "CLIPBOARD_COLLISION":
      return "overlap";
    case "CLIPBOARD_EMPTY":
    case "CLIPBOARD_INCOMPATIBLE":
    case "AREA_SIZE_LIMIT":
    case "TILE_UNKNOWN":
      return "payload-unavailable";
  }
}

function groupCells(
  group: AuroraAreaTilesetGroup,
  anchor: AuroraAreaCell,
  orientation: 0 | 1 | 2 | 3
): AuroraAreaCell[] {
  return group.tileIds.flatMap((tileId, index) => {
    if (tileId === null) {
      return [];
    }
    const row = Math.floor(index / group.columns);
    const col = index % group.columns;
    const rotated = rotateCell(row, col, group.columns, group.rows, orientation);
    return { row: anchor.row + rotated.row, col: anchor.col + rotated.col };
  });
}

function rotateCell(
  row: number,
  col: number,
  width: number,
  height: number,
  turns: 0 | 1 | 2 | 3
): AuroraAreaCell {
  if (turns === 0) return { row, col };
  if (turns === 1) return { row: col, col: height - 1 - row };
  if (turns === 2) return { row: height - 1 - row, col: width - 1 - col };
  return { row: width - 1 - col, col: row };
}

function withinBounds(state: AuroraAreaEditingState, cell: AuroraAreaCell): boolean {
  return cell.row >= 0 && cell.col >= 0 && cell.row < state.height && cell.col < state.width;
}

type AuroraAreaPlacementPreviewDraft = Omit<
  AuroraAreaPlacementPreview,
  "resultTileIds"
> & {
  resultTileIds?: number[];
};

function preview(value: AuroraAreaPlacementPreviewDraft): AuroraAreaPlacementPreview {
  return {
    ...value,
    anchor: copyCell(value.anchor),
    targetCells: value.targetCells.map(copyCell),
    resultTileIds: [...new Set(value.resultTileIds ?? [])].sort(
      (left, right) => left - right,
    ),
  };
}

function copyCell(cell: AuroraAreaCell): AuroraAreaCell {
  return { row: cell.row, col: cell.col };
}
