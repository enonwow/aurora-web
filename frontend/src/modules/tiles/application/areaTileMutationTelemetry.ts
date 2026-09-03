import type { AreaScene, SceneTile } from "../../scene/contracts";
import {
  buildAreaTileProcessContractSceneKey,
  isAreaTileProcessReadinessCompleteForExpectedCandidates,
  type AreaTileProcessContractReadiness
} from "./areaTileProcessContractReadiness";

export type AreaTileMutationChangeKind = "created" | "updated" | "deleted";

export interface AreaTileMutationTileIdentity {
  sceneTileId: string;
  row: number;
  col: number;
  tileId: number | null;
  modelResRef: string | null;
  tilesetResRef: string | null;
  terrain: string;
  orientation: 0 | 1 | 2 | 3;
  rotateTexture: boolean;
  height: number | null;
}

export interface AreaTileMutationChangedTile {
  change: AreaTileMutationChangeKind;
  row: number;
  col: number;
  before: AreaTileMutationTileIdentity | null;
  after: AreaTileMutationTileIdentity | null;
}

export interface AreaTileMutationTrace {
  version: "aurora-area-tile-mutation-trace/v1";
  operationId: string;
  revision: number;
  sceneId: string;
  startedAt: string;
  contractSceneKeyBefore: string;
  contractSceneKeyAfter: string;
  tileStateDigestBefore: string;
  tileStateDigestAfter: string;
  changedTileCount: number;
  changedTiles: AreaTileMutationChangedTile[];
}

export interface AreaTileMutationTraceDatasetPayload
  extends Omit<AreaTileMutationTrace, "changedTiles"> {
  changedTileSampleCount: number;
  changedTileOmittedCount: number;
  changedTiles: AreaTileMutationChangedTile[];
}

export type AreaTileMutationContractSettlementStatus =
  | "idle"
  | "pending"
  | "blocked"
  | "ready";

export interface AreaTileMutationContractSettlement {
  version: "aurora-area-tile-mutation-contract-settlement/v1";
  operationId: string | null;
  revision: number | null;
  status: AreaTileMutationContractSettlementStatus;
  tileStateDigest: string | null;
  currentSceneKey: string | null;
  readinessSceneKey: string | null;
  requestPhase: "idle" | "loading" | "ready" | "failed";
  blockers: string[];
}

export interface AreaTileMutationContractSettlementInput {
  trace: AreaTileMutationTrace | null;
  appliedRevision: number;
  currentSceneKey: string | null;
  readinessSceneKey: string | null;
  requestPhase: "idle" | "loading" | "ready" | "failed";
  readiness: AreaTileProcessContractReadiness | null;
}

function canonicalizeTileStateValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeTileStateValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalizeTileStateValue(entry)])
    );
  }
  return value;
}

function buildCanonicalAreaTileState(scene: AreaScene): string {
  const tiles = [...scene.tiles]
    .sort(
      (left, right) =>
        left.row - right.row ||
        left.col - right.col ||
        left.id.localeCompare(right.id)
    )
    .map(canonicalizeTileStateValue);
  return JSON.stringify({
    sceneId: scene.sceneId,
    width: scene.width,
    height: scene.height,
    tiles
  });
}

function hashTileState(value: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.charCodeAt(index);
    hash ^= BigInt(codePoint & 0xff);
    hash = (hash * prime) & mask;
    hash ^= BigInt((codePoint >>> 8) & 0xff);
    hash = (hash * prime) & mask;
  }
  return `fnv1a64:${hash.toString(16).padStart(16, "0")}:${value.length}`;
}

export function buildAreaTileStateDigest(scene: AreaScene): string {
  return hashTileState(buildCanonicalAreaTileState(scene));
}

export function resolveAreaTileMutationChangedCellBand(
  changedTileCount: number
): "1" | "2-4" | "5-16" | "17+" {
  const normalized = Math.max(1, Math.trunc(changedTileCount));
  if (normalized === 1) {
    return "1";
  }
  if (normalized <= 4) {
    return "2-4";
  }
  if (normalized <= 16) {
    return "5-16";
  }
  return "17+";
}

export function buildAreaTileMutationTraceDatasetPayload(
  trace: AreaTileMutationTrace,
  sampleLimit = 32
): AreaTileMutationTraceDatasetPayload {
  const normalizedLimit = Math.max(0, Math.trunc(sampleLimit));
  const changedTiles = trace.changedTiles.slice(0, normalizedLimit);
  return {
    ...trace,
    changedTileSampleCount: changedTiles.length,
    changedTileOmittedCount: Math.max(
      0,
      trace.changedTileCount - changedTiles.length
    ),
    changedTiles
  };
}

function buildTileCoordinateKey(tile: Pick<SceneTile, "row" | "col">): string {
  return `${tile.row}:${tile.col}`;
}

function toMutationTileIdentity(tile: SceneTile): AreaTileMutationTileIdentity {
  return {
    sceneTileId: tile.id,
    row: tile.row,
    col: tile.col,
    tileId: Number.isFinite(tile.tileId) ? tile.tileId ?? null : null,
    modelResRef: tile.modelResRef?.trim().toLowerCase() || null,
    tilesetResRef: tile.tilesetResRef?.trim().toLowerCase() || null,
    terrain: tile.terrain,
    orientation: tile.orientation,
    rotateTexture: tile.rotateTexture,
    height: Number.isFinite(tile.height) ? tile.height ?? null : null
  };
}

function areTilesEqual(left: SceneTile, right: SceneTile): boolean {
  return (
    JSON.stringify(canonicalizeTileStateValue(left)) ===
    JSON.stringify(canonicalizeTileStateValue(right))
  );
}

function resolveChangedTiles(
  before: AreaScene,
  after: AreaScene
): AreaTileMutationChangedTile[] {
  const beforeByCoordinate = new Map(
    before.tiles.map((tile) => [buildTileCoordinateKey(tile), tile])
  );
  const afterByCoordinate = new Map(
    after.tiles.map((tile) => [buildTileCoordinateKey(tile), tile])
  );
  const coordinateKeys = new Set([
    ...beforeByCoordinate.keys(),
    ...afterByCoordinate.keys()
  ]);
  const changed: AreaTileMutationChangedTile[] = [];

  [...coordinateKeys]
    .sort((left, right) => {
      const [leftRow, leftCol] = left.split(":").map(Number);
      const [rightRow, rightCol] = right.split(":").map(Number);
      return leftRow - rightRow || leftCol - rightCol;
    })
    .forEach((coordinate) => {
      const previousTile = beforeByCoordinate.get(coordinate) ?? null;
      const nextTile = afterByCoordinate.get(coordinate) ?? null;
      if (previousTile && nextTile && areTilesEqual(previousTile, nextTile)) {
        return;
      }
      const source = nextTile ?? previousTile;
      if (!source) {
        return;
      }
      changed.push({
        change: previousTile ? (nextTile ? "updated" : "deleted") : "created",
        row: source.row,
        col: source.col,
        before: previousTile ? toMutationTileIdentity(previousTile) : null,
        after: nextTile ? toMutationTileIdentity(nextTile) : null
      });
    });

  return changed;
}

export function buildAreaTileMutationTrace(
  before: AreaScene | null,
  after: AreaScene,
  revision: number,
  startedAt: string
): AreaTileMutationTrace | null {
  if (!before || before.sceneId !== after.sceneId) {
    return null;
  }
  const changedTiles = resolveChangedTiles(before, after);
  if (changedTiles.length === 0) {
    return null;
  }
  const normalizedRevision = Math.max(1, Math.trunc(revision));
  return {
    version: "aurora-area-tile-mutation-trace/v1",
    operationId: `area-tile-mutation:${after.sceneId}:${normalizedRevision}`,
    revision: normalizedRevision,
    sceneId: after.sceneId,
    startedAt,
    contractSceneKeyBefore: buildAreaTileProcessContractSceneKey(
      before.sceneId,
      before.tiles.map((tile) => tile.modelResRef)
    ),
    contractSceneKeyAfter: buildAreaTileProcessContractSceneKey(
      after.sceneId,
      after.tiles.map((tile) => tile.modelResRef)
    ),
    tileStateDigestBefore: buildAreaTileStateDigest(before),
    tileStateDigestAfter: buildAreaTileStateDigest(after),
    changedTileCount: changedTiles.length,
    changedTiles
  };
}

export function evaluateAreaTileMutationContractSettlement(
  input: AreaTileMutationContractSettlementInput
): AreaTileMutationContractSettlement {
  const trace = input.trace;
  if (!trace) {
    return {
      version: "aurora-area-tile-mutation-contract-settlement/v1",
      operationId: null,
      revision: null,
      status: "idle",
      tileStateDigest: null,
      currentSceneKey: input.currentSceneKey,
      readinessSceneKey: input.readinessSceneKey,
      requestPhase: input.requestPhase,
      blockers: ["mutation_trace_missing"]
    };
  }

  const pendingBlockers: string[] = [];
  const blockingFailures: string[] = [];
  if (input.appliedRevision < trace.revision) {
    pendingBlockers.push("mutation_revision_not_applied");
  } else if (input.appliedRevision > trace.revision) {
    blockingFailures.push("mutation_trace_revision_stale");
  }
  if (input.currentSceneKey !== trace.contractSceneKeyAfter) {
    pendingBlockers.push("current_contract_scene_key_not_converged");
  }
  if (
    !input.readinessSceneKey ||
    input.readinessSceneKey !== input.currentSceneKey
  ) {
    pendingBlockers.push("readiness_contract_scene_key_not_converged");
  }
  if (input.requestPhase === "failed") {
    blockingFailures.push("tile_process_request_failed");
  } else if (input.requestPhase !== "ready") {
    pendingBlockers.push(`tile_process_request_${input.requestPhase}`);
  }
  if (!input.readiness) {
    pendingBlockers.push("tile_process_readiness_missing");
  } else {
    const expectedCandidateCount =
      input.readiness.expectedCandidateCount ??
      input.readiness.checkedCandidateCount;
    if (
      input.readiness.status === "blocked" ||
      input.readiness.blockedCandidateCount > 0
    ) {
      blockingFailures.push("tile_process_contract_blocked");
    } else if (
      !isAreaTileProcessReadinessCompleteForExpectedCandidates(
        input.readiness,
        expectedCandidateCount
      )
    ) {
      pendingBlockers.push("tile_process_contract_not_fully_settled");
    }
  }

  const blockers = [...blockingFailures, ...pendingBlockers];
  return {
    version: "aurora-area-tile-mutation-contract-settlement/v1",
    operationId: trace.operationId,
    revision: trace.revision,
    status:
      blockingFailures.length > 0
        ? "blocked"
        : pendingBlockers.length > 0
          ? "pending"
          : "ready",
    tileStateDigest: trace.tileStateDigestAfter,
    currentSceneKey: input.currentSceneKey,
    readinessSceneKey: input.readinessSceneKey,
    requestPhase: input.requestPhase,
    blockers
  };
}
