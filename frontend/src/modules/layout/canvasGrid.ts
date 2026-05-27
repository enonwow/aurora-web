export const MASTER_CELLS_PER_TILE = 10;

export interface GridSegment {
  kind: "major" | "minor";
  start: [number, number, number];
  end: [number, number, number];
}

function isMajorLine(index: number, masterCellsPerTile: number): boolean {
  return index % masterCellsPerTile === 0;
}

export function buildCanvasGridSegments(
  widthTiles: number,
  heightTiles: number,
  masterCellsPerTile = MASTER_CELLS_PER_TILE
): GridSegment[] {
  const safeWidthTiles = Math.max(1, widthTiles);
  const safeHeightTiles = Math.max(1, heightTiles);
  const safeMasterCells = Math.max(1, masterCellsPerTile);
  const segments: GridSegment[] = [];

  const xDivisions = safeWidthTiles * safeMasterCells;
  const zDivisions = safeHeightTiles * safeMasterCells;

  for (let xIndex = 0; xIndex <= xDivisions; xIndex += 1) {
    const x = xIndex / safeMasterCells;
    segments.push({
      kind: isMajorLine(xIndex, safeMasterCells) ? "major" : "minor",
      start: [x, 0, 0],
      end: [x, 0, safeHeightTiles]
    });
  }

  for (let zIndex = 0; zIndex <= zDivisions; zIndex += 1) {
    const z = zIndex / safeMasterCells;
    segments.push({
      kind: isMajorLine(zIndex, safeMasterCells) ? "major" : "minor",
      start: [0, 0, z],
      end: [safeWidthTiles, 0, z]
    });
  }

  return segments;
}
