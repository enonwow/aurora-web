const EDGE_ORDER = ["top", "right", "bottom", "left"];
const OPPOSITE_EDGE = Object.freeze({ top: "bottom", right: "left", bottom: "top", left: "right" });

// Derived data, not imported engine code. It is intentionally reference-only
// until a local Aurora/retail differential fixture confirms this corpus.
const REFERENCE_NODE_ROWS_V5 = Object.freeze({
  A: "0,5,0;-5,0,0;5,0,0;0,-5,0",
  B: "0,5,0;-5,2.5,0;-5,-2.5,1;-2.5,-5,1;2.5,-5,0;5,0,0",
  C: "-2.5,5,0;-5,0,0;-2.5,-5,0;2.5,-5,1;5,0,1;2.5,5,1",
  D: "-2.5,5,0;-5,2.5,0;-5,-2.5,1;-2.5,-5,1;2.5,-5,2;5,-2.5,2;5,2.5,3;2.5,5,3",
  E: "-2.5,5,0;-5,2.5,0;-5,-2.5,1;-2.5,-5,1;2.5,-5,2;5,0,2;2.5,5,2",
  F: "-2.5,5,0;-5,0,0;-2.5,-5,0;2.5,-5,0;5,0,0;2.5,5,0",
  G: "-2.5,5,0;-5,0,0;0,-5,0;5,0,0;2.5,5,0",
  H: "-5,0,0;0,-5,0",
  I: "0,5,0;-5,0,0;0,-5,0",
  J: "-5,0,0;0,-5,0;5,0,1;0,5,1",
  K: "-2.5,5,0;-5,0,0;0,-5,1;5,-2.5,1;5,2.5,2;2.5,5,2",
  L: "0,5,0;0,-5,0",
  M: "-2.5,5,0;-2.5,-5,0;2.5,5,1;2.5,-5,1",
  N: "0,5,0",
  O: "-2.5,5,0;-5,2.5,0;-5,-2.5,1;-2.5,-5,1;2.5,-5,2;5,-2.5,2;5,2.5,1;2.5,5,1",
  P: "",
  Q: "-2.5,5,0;-5,0,0;0,-5,1;5,0,1;2.5,5,1",
  R: "-2.5,-5,0;-5,0,0;0,5,1;5,0,1;2.5,-5,1",
  S: "-2.5,5,0;-5,0,0;2.5,5,1;5,0,1",
  T: "",
  U: "-5,0,0;0,-5,1;0,5,1;5,0,1",
  V: "0,5,0;0,-5,1;5,0,1",
  W: "0,5,0;0,-5,1;-5,0,1",
  X: "0,5,0;-5,0,1",
  Y: "0,5,0;0,-5,1",
  Z: "-5,2.5,0;-5,-2.5,0;-2.5,-5,0;2.5,-5,0;5,0,0;0,5,0",
  a: "-2.5,5,0;-5,0,0;0,-5,0;5,0,0;2.5,5,1",
  b: "-2.5,5,0;-5,0,1;0,-5,1;5,0,1;2.5,5,1",
  c: "-4,5,0;-5,0,0;0,-5,0;5,0,0;4,5,0;0,5,0",
  d: "-4,5,0;-5,0,0;0,-5,0;5,0,0;4,5,0;0,5,1",
  e: "0,5,0;-5,4,0;-5,0,1;-5,-4,2;-4,-5,2;0,-5,1;4,-5,0;5,0,0",
  f: "-4,5,2;-5,0,2;-4,-5,2;0,-5,1;4,-5,0;5,0,0;4,5,0;0,5,1",
  g: "-4,5,1;-5,0,1;-4,-5,1;0,-5,1;4,-5,0;5,0,0;4,5,0;0,5,1",
  h: "0,5,0;-5,4,0;-5,0,0;-5,-4,1;-4,-5,1;0,-5,0;4,-5,0;5,0,0",
  i: "0,5,1;-5,4,1;-5,0,2;-5,-4,1;0,-5,1;5,-4,1;5,0,0;5,4,1",
  j: "0,5,1;-5,4,1;-5,0,2;-5,-4,3;0,-5,3;5,-4,3;5,0,0;5,4,1",
  k: "-4,5,2;-5,4,2;-5,0,1;-5,-4,3;-4,-5,3;0,-5,1;4,-5,0;5,0,0;4,5,0;0,5,1",
  l: "-4,5,2;-5,4,2;-5,0,0;-5,-4,3;-4,-5,3;0,-5,0;4,-5,4;5,-4,4;5,0,0;5,4,1;4,5,1;0,5,0",
  m: "-4,5,2;-5,4,2;-5,-4,3;-4,-5,3;0,-5,0;4,-5,4;5,-4,4;5,4,1;4,5,1;0,5,0",
  n: "-4,5,2;-5,4,2;-5,-4,3;-4,-5,3;0,-5,4;4,-5,5;5,-4,5;5,4,1;4,5,1;0,5,0",
  o: "-4,5,2;-5,4,2;-5,-4,3;-4,-5,3;0,-5,1;4,-5,0;5,0,0;4,5,0;0,5,1",
  p: "-4,5,2;-5,4,2;-5,0,1;-5,-4,3;-4,-5,3;4,-5,0;5,0,0;4,5,0",
  q: "-4,5,1;-5,4,1;-5,0,0;-5,-4,2;-4,-5,2;4,-5,0;5,0,0;4,5,0",
  r: "-4,5,0;-5,4,0;-5,0,1;-5,-4,2;-4,-5,2;0,-5,3;4,-5,4;5,-4,4;5,0,5;5,4,6;4,5,6;0,5,7",
  s: "-4,5,0;-5,4,0;-5,0,1;-5,-4,2;-4,-5,2;0,-5,3;4,-5,4;5,-4,4;5,0,5;5,4,6;4,5,6",
  t: "-4,5,1;-5,4,1;-5,-4,2;-4,-5,2;0,-5,0;4,-5,3;5,-4,3;5,0,0;5,4,4;4,5,4",
  u: "-4,5,1;-5,4,1;-5,-4,2;-4,-5,2;0,-5,0;4,-5,3;5,-4,3;5,0,0;5,4,4;4,5,4;0,5,0",
  v: "-4,5,2;-5,4,2;-5,0,1;-5,-4,3;-4,-5,3;0,-5,0;4,-5,4;5,-4,4;5,0,0;5,4,5;4,5,5;0,5,0",
  w: "0,5,0;-5,0,1;5,0,2;0,-5,3",
  x: "-2.5,5,0;-5,2.5,0;-5,-2.5,1;-2.5,-5,1;2.5,-5,2;5,-2.5,2"
});

function freezeExit(exit) {
  return Object.freeze(exit);
}

function decodeExitRow(encoded) {
  if (!encoded) return Object.freeze([]);
  return Object.freeze(encoded.split(";").map((entry) => {
    const [x, y, region] = entry.split(",").map(Number);
    return freezeExit({ x, y, region });
  }));
}

const NODE_DEFINITIONS = Object.freeze(Object.fromEntries(
  Object.entries(REFERENCE_NODE_ROWS_V5).map(([symbol, encoded]) => [symbol, decodeExitRow(encoded)])
));

export const PATH_NODE_REFERENCE_CORPUS = Object.freeze({
  schema: "aurora-tile-path-node-reference-corpus/v1",
  authority: "external-reference-only",
  source: Object.freeze({
    url: "https://nwn.wiki/spaces/NWN1/pages/139689996/Tile%2BPath%2BNodes",
    version: 5,
    bodySha256: "0547fa1efcd2ed1dab2cb4a3567fba4ae5136ee3ac58a30098b2aee064edfe49",
    retrievedAt: "2026-07-20"
  }),
  nodes: NODE_DEFINITIONS,
  unsupportedSymbols: Object.freeze(["y", "z"])
});

function normalizePathNodeSymbol(value) {
  const symbol = typeof value === "string" ? value.trim() : "";
  return symbol.length === 1 ? symbol : null;
}

function normalizeOrientation(value) {
  const orientation = Number(value ?? 0);
  return Number.isInteger(orientation) && orientation >= 0 && orientation <= 3 ? orientation : null;
}

function rotateClockwise({ x, y }, orientation) {
  let result = { x, y };
  for (let turn = 0; turn < orientation; turn += 1) {
    result = { x: result.y, y: -result.x };
  }
  return {
    x: Object.is(result.x, -0) ? 0 : result.x,
    y: Object.is(result.y, -0) ? 0 : result.y
  };
}

function edgeForCoordinate({ x, y }) {
  if (y === 5) return "top";
  if (x === 5) return "right";
  if (y === -5) return "bottom";
  if (x === -5) return "left";
  throw new Error(`PathNode exit is not on a tile boundary: ${x},${y}.`);
}

function laneForCoordinate(edge, { x, y }) {
  return edge === "top" || edge === "bottom" ? x : y;
}

function buildExitsByEdge(exits) {
  const byEdge = Object.fromEntries(EDGE_ORDER.map((edge) => [edge, []]));
  for (const exit of exits) byEdge[exit.edge].push({ lane: exit.lane, region: exit.region });
  for (const edge of EDGE_ORDER) {
    byEdge[edge].sort((left, right) => left.lane - right.lane || left.region - right.region);
    Object.freeze(byEdge[edge]);
  }
  return Object.freeze(byEdge);
}

export function resolvePathNodeReference({ pathNode, orientation = 0 }) {
  const symbol = normalizePathNodeSymbol(pathNode);
  const normalizedOrientation = normalizeOrientation(orientation);
  if (normalizedOrientation === null) {
    return Object.freeze({ status: "reference-invalid-orientation", symbol, orientation });
  }
  const nativeExits = symbol ? NODE_DEFINITIONS[symbol] : null;
  if (!nativeExits) {
    return Object.freeze({
      status: "reference-unknown-symbol",
      symbol,
      orientation: normalizedOrientation,
      corpus: PATH_NODE_REFERENCE_CORPUS.source
    });
  }
  const exits = nativeExits.map((exit) => {
    const rotated = rotateClockwise(exit, normalizedOrientation);
    const edge = edgeForCoordinate(rotated);
    return freezeExit({ ...rotated, edge, lane: laneForCoordinate(edge, rotated), region: exit.region });
  });
  const exitsByEdge = buildExitsByEdge(exits);
  return Object.freeze({
    status: exits.length === 0 ? "reference-empty" : "reference-known",
    symbol,
    orientation: normalizedOrientation,
    exits: Object.freeze(exits),
    exitsByEdge,
    corpus: PATH_NODE_REFERENCE_CORPUS.source
  });
}

function sortedUnique(values) {
  return [...new Set(values)].sort((left, right) => left - right);
}

function groupRegionsByLane(exits) {
  return exits.map((exit) => ({ lane: exit.lane, regions: [exit.region] }));
}

export function comparePathNodeReferenceBoundary({ source, sourceEdge, partner, partnerEdge }) {
  if (OPPOSITE_EDGE[sourceEdge] !== partnerEdge) {
    return Object.freeze({ status: "reference-invalid-shared-edge", sourceEdge, partnerEdge });
  }
  const sourceResolved = resolvePathNodeReference(source ?? {});
  const partnerResolved = resolvePathNodeReference(partner ?? {});
  if (sourceResolved.status !== "reference-known" || partnerResolved.status !== "reference-known") {
    return Object.freeze({
      status: "reference-unavailable",
      source: sourceResolved,
      partner: partnerResolved,
      sourceEdge,
      partnerEdge
    });
  }
  const sourceExits = sourceResolved.exitsByEdge[sourceEdge];
  const partnerExits = partnerResolved.exitsByEdge[partnerEdge];
  const sourceLanes = sortedUnique(sourceExits.map((exit) => exit.lane));
  const partnerLanes = sortedUnique(partnerExits.map((exit) => exit.lane));
  const matchingLanes = sourceLanes.filter((lane) => partnerLanes.includes(lane));
  const sourceOnlyLanes = sourceLanes.filter((lane) => !partnerLanes.includes(lane));
  const partnerOnlyLanes = partnerLanes.filter((lane) => !sourceLanes.includes(lane));
  return Object.freeze({
    status: sourceLanes.length > 0 && sourceOnlyLanes.length === 0 && partnerOnlyLanes.length === 0
      ? "reference-match"
      : "reference-mismatch",
    source: sourceResolved,
    partner: partnerResolved,
    sourceEdge,
    partnerEdge,
    sourceLanes,
    partnerLanes,
    matchingLanes,
    sourceOnlyLanes,
    partnerOnlyLanes,
    sourceRegionsByLane: groupRegionsByLane(sourceExits),
    partnerRegionsByLane: groupRegionsByLane(partnerExits)
  });
}
