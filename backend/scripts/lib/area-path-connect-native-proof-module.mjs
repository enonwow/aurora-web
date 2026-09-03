const SHA256 = /^[a-f0-9]{64}$/u;
const RESREF = /^[a-z0-9_]{1,16}$/u;

export function derivePathConnectProofAreaTiles({ row, baseTiles, width, height }) {
  assertProofRow(row, width, height);
  const base = validateAndCloneBaseTiles(baseTiles, width, height);
  const source = cell(row, "source");
  const partner = cell(row, "partner");
  const negative = row.pathConnect.negativeControl;
  const positiveTiles = replaceCells(base, [
    { ...source, orientation: row.pathConnect.reference.source.orientation },
    { ...partner, orientation: row.pathConnect.reference.partner.orientation },
  ]);
  const negativeTiles = replaceCells(base, [
    negative.source,
    negative.partner,
  ]);
  return Object.freeze({
    positive: Object.freeze(positiveTiles),
    negative: Object.freeze(negativeTiles),
  });
}

export function buildPathConnectProofProfile({
  row,
  moduleSha256,
  positiveAreaResRef,
  negativeAreaResRef,
  width,
  height,
}) {
  assertProofRow(row, width, height);
  if (!SHA256.test(moduleSha256 ?? "")) throw invalid("module_sha256");
  if (!RESREF.test(positiveAreaResRef ?? "") || !RESREF.test(negativeAreaResRef ?? "") ||
    positiveAreaResRef === negativeAreaResRef) {
    throw invalid("area_resrefs");
  }
  const sourceCell = cell(row, "source");
  const partnerCell = cell(row, "partner");
  return {
    schema: "aurora-tile-path-connect-profile/v2",
    id: `${row.id.replace(/:/gu, "-")}-right-${partnerCell.tileId}-path-connect-v2`,
    approved: true,
    moduleSha256,
    positiveAreaResRef,
    negativeAreaResRef,
    areaWidth: width,
    areaHeight: height,
    tilesetResRef: row.tilesetResRef,
    definitionFingerprint: row.definitionFingerprint,
    rowId: row.id,
    source: {
      tileId: sourceCell.tileId,
      pathNode: row.pathConnect.sourcePathNode,
      orientation: row.pathConnect.reference.source.orientation,
      edge: row.pathConnect.reference.sourceEdge,
      row: sourceCell.row,
      col: sourceCell.col,
    },
    partner: {
      tileId: partnerCell.tileId,
      pathNode: row.pathConnect.partnerPathNode,
      orientation: row.pathConnect.reference.partner.orientation,
      edge: row.pathConnect.reference.partnerEdge,
      row: partnerCell.row,
      col: partnerCell.col,
    },
    matchingLanes: [...row.pathConnect.reference.matchingLanes],
    negativeControl: structuredClone(row.pathConnect.negativeControl),
  };
}

function assertProofRow(row, width, height) {
  if (!row || typeof row !== "object" || width !== 2 || height !== 2 ||
    row.fixture?.kind !== "tile" || row.fixture.width !== width || row.fixture.height !== height ||
    row.tilesetResRef !== "tms01" || !SHA256.test(row.definitionFingerprint ?? "") ||
    row.connect?.status !== "planned" || row.pathConnect?.status !== "blocked" ||
    row.pathConnect.reference?.status !== "reference-match" ||
    row.pathConnect.reference.sourceEdge !== "right" ||
    row.pathConnect.reference.partnerEdge !== "left" ||
    !Array.isArray(row.pathConnect.reference.matchingLanes) ||
    row.pathConnect.reference.matchingLanes.length === 0) {
    throw invalid("shape");
  }
  const source = cell(row, "source");
  const partner = cell(row, "partner");
  const control = row.pathConnect.negativeControl;
  if (!source || !partner || source.row !== 0 || source.col !== 0 ||
    partner.row !== 0 || partner.col !== 1 ||
    source.tileId !== control?.source?.tileId ||
    source.row !== control?.source?.row || source.col !== control?.source?.col ||
    partner.row !== control?.partner?.row || partner.col !== control?.partner?.col ||
    partner.tileId !== row.connect.partnerTileId ||
    control.referenceStatus !== "reference-mismatch" ||
    control.reason !== "path-node-reference-mismatch" ||
    control.partner.tileId === partner.tileId ||
    control.source.pathNode !== row.pathConnect.sourcePathNode ||
    control.partner.pathNode === row.pathConnect.partnerPathNode ||
    !orientation(row.pathConnect.reference.source?.orientation) ||
    !orientation(row.pathConnect.reference.partner?.orientation) ||
    !orientation(control.source.orientation) || !orientation(control.partner.orientation)) {
    throw invalid("binding");
  }
}

function cell(row, role) {
  const matches = Array.isArray(row?.fixture?.cells)
    ? row.fixture.cells.filter((candidate) => candidate?.role === role)
    : [];
  if (matches.length !== 1) throw invalid(`cell_${role}`);
  const value = matches[0];
  if (!Number.isInteger(value.row) || !Number.isInteger(value.col) ||
    !Number.isInteger(value.tileId) || value.tileId < 0) {
    throw invalid(`cell_${role}`);
  }
  return value;
}

function validateAndCloneBaseTiles(baseTiles, width, height) {
  if (!Array.isArray(baseTiles) || baseTiles.length !== width * height) {
    throw invalid("base_tiles");
  }
  return baseTiles.map((tile, index) => {
    const expectedRow = Math.floor(index / width);
    const expectedCol = index % width;
    if (tile?.row !== expectedRow || tile?.col !== expectedCol ||
      !Number.isInteger(tile.tileId) || tile.tileId < 0 || !orientation(tile.orientation)) {
      throw invalid(`base_tile_${index}`);
    }
    return { ...tile };
  });
}

function replaceCells(baseTiles, replacements) {
  const byCell = new Map(replacements.map((replacement) => [
    `${replacement.row}:${replacement.col}`,
    replacement,
  ]));
  if (byCell.size !== replacements.length) throw invalid("replacement_collision");
  return baseTiles.map((tile) => {
    const replacement = byCell.get(`${tile.row}:${tile.col}`);
    return replacement
      ? { ...tile, tileId: replacement.tileId, orientation: replacement.orientation }
      : { ...tile };
  });
}

function orientation(value) {
  return Number.isInteger(value) && value >= 0 && value <= 3;
}

function invalid(detail) {
  return new Error(`path_connect_proof_row_invalid:${detail}`);
}
