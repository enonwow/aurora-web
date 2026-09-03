import { afterAll, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  changeAuroraAreaGroupHeightAtCell,
  changeAuroraAreaTileHeight,
  hydrateAuroraAreaEditingState,
  placeAuroraAreaGroup,
  replaceAuroraAreaTileId,
  rotateAuroraAreaGroupAtCell,
  rotateAuroraAreaTile
} from "../../src/modules/scene/domain/auroraAreaEditing";
import { applyAuroraAreaEditingStateToScene } from "../../src/modules/scene/domain/auroraAreaEditingSceneMapper";
import { createBlankAreaScene } from "../../src/modules/scene/domain/sceneFactory";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const inputPath = path.resolve(
  repoRoot,
  process.env.AREA_TILE_PROOF_INPUT ??
    ".codex-tmp/all-area-tiles-audit-20260716/proof-input.json"
);
const outDirectory = path.resolve(
  repoRoot,
  process.env.AREA_TILE_PROOF_OUT ??
    ".codex-tmp/all-area-tiles-editor-proof-20260716"
);
const requestedTilesets = new Set(
  (process.env.AREA_TILE_PROOF_TILESET ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
);
const onlyTileset = requestedTilesets.size === 1 ? [...requestedTilesets][0] : undefined;
const limit = Math.max(0, Number(process.env.AREA_TILE_PROOF_LIMIT ?? 0));

type ProofRow = {
  tilesetResRef: string;
  tileId: number;
  modelResRef: string;
  kind: "loose" | "group";
  groupId: string;
  join: "compatible_pair" | "group_footprint" | "no_compatible_neighbour" | "new_area_failed";
  place: "ok" | "constrained" | "failed" | "not_applicable";
  rotate: "ok" | "constrained" | "failed" | "not_applicable";
  height: "ok" | "constrained" | "failed" | "not_applicable";
  // `not_applicable` means the editor could not produce a state to map. It is
  // deliberately separate from an actual scene/viewport mapping failure.
  viewport: "ok" | "failed" | "not_applicable";
  result: "ok" | "constrained" | "attention" | "blocked";
  detail: string;
};

const corners = ["topLeft", "topRight", "bottomRight", "bottomLeft"] as const;
const edges = ["top", "right", "bottom", "left"] as const;

function orient(tile: any, orientation: number) {
  const terrain: Record<string, string | null> = {};
  const crossers: Record<string, string | null> = {};
  const heights: Record<string, number> = {};
  for (let index = 0; index < corners.length; index += 1) {
    const corner = corners[index];
    const source = corners[(index - orientation + 4) % 4];
    terrain[corner] = tile.terrain?.[source] ?? null;
    heights[corner] = tile.cornerHeights?.[source] ?? 0;
  }
  for (let index = 0; index < edges.length; index += 1) {
    const edge = edges[index];
    const source = edges[(index - orientation + 4) % 4];
    crossers[edge] = tile.crossers?.[source] ?? null;
  }
  return { terrain, crossers, heights };
}

function edgeKey(signature: ReturnType<typeof orient>, edge: "top" | "right" | "bottom" | "left"): string {
  if (edge === "top") return [signature.terrain.topLeft, signature.terrain.topRight, signature.heights.topLeft, signature.heights.topRight, signature.crossers.top].join("|");
  if (edge === "right") return [signature.terrain.topRight, signature.terrain.bottomRight, signature.heights.topRight, signature.heights.bottomRight, signature.crossers.right].join("|");
  if (edge === "bottom") return [signature.terrain.bottomLeft, signature.terrain.bottomRight, signature.heights.bottomLeft, signature.heights.bottomRight, signature.crossers.bottom].join("|");
  return [signature.terrain.topLeft, signature.terrain.bottomLeft, signature.heights.topLeft, signature.heights.bottomLeft, signature.crossers.left].join("|");
}

function addSetValue(map: Map<string, Set<string>>, key: string, value: string) {
  const values = map.get(key) ?? new Set<string>();
  values.add(value);
  map.set(key, values);
}

function firstIntersection(
  left: ReadonlySet<string> | undefined,
  right: ReadonlySet<string> | undefined
): string | undefined {
  if (!left || !right) return undefined;
  const [smaller, larger] = left.size <= right.size ? [left, right] : [right, left];
  for (const value of smaller) {
    if (larger.has(value)) return value;
  }
  return undefined;
}

function createTopologyIndex(definition: any) {
  const groupedTileIds = new Set<number>(
    definition.groups.flatMap((group: any) => group.tileIds)
  );
  const variants = definition.tiles
    .filter((item: any) => !item.groupId && !groupedTileIds.has(item.tileId))
    .flatMap((candidate: any) => [0, 1, 2, 3].map((orientation) => ({ tile: candidate, orientation, signature: orient(candidate, orientation) })));
  const byLeft = new Map<string, any[]>();
  const byRight = new Map<string, any[]>();
  const byTop = new Map<string, any[]>();
  const byBottom = new Map<string, any[]>();
  const byTopAndLeft = new Map<string, any[]>();
  const byTopAndRight = new Map<string, any[]>();
  const byBottomAndLeft = new Map<string, any[]>();
  const byBottomAndRight = new Map<string, any[]>();
  const leftKeysByTop = new Map<string, Set<string>>();
  const rightKeysByTop = new Map<string, Set<string>>();
  const bottomKeysByLeft = new Map<string, Set<string>>();
  const topKeysByLeft = new Map<string, Set<string>>();
  const bottomKeysByRight = new Map<string, Set<string>>();
  const topKeysByRight = new Map<string, Set<string>>();
  const completionCache = new Map<
    string,
    { cells: any[]; targetCell: { row: number; col: number } } | null
  >();
  for (const variant of variants) {
    const left = edgeKey(variant.signature, "left");
    const right = edgeKey(variant.signature, "right");
    const top = edgeKey(variant.signature, "top");
    const bottom = edgeKey(variant.signature, "bottom");
    byLeft.set(left, [...(byLeft.get(left) ?? []), variant]);
    byRight.set(right, [...(byRight.get(right) ?? []), variant]);
    byTop.set(top, [...(byTop.get(top) ?? []), variant]);
    byBottom.set(bottom, [...(byBottom.get(bottom) ?? []), variant]);
    byTopAndLeft.set(`${top}\u0000${left}`, [...(byTopAndLeft.get(`${top}\u0000${left}`) ?? []), variant]);
    byTopAndRight.set(`${top}\u0000${right}`, [...(byTopAndRight.get(`${top}\u0000${right}`) ?? []), variant]);
    byBottomAndLeft.set(`${bottom}\u0000${left}`, [...(byBottomAndLeft.get(`${bottom}\u0000${left}`) ?? []), variant]);
    byBottomAndRight.set(`${bottom}\u0000${right}`, [...(byBottomAndRight.get(`${bottom}\u0000${right}`) ?? []), variant]);
    addSetValue(leftKeysByTop, top, left);
    addSetValue(rightKeysByTop, top, right);
    addSetValue(bottomKeysByLeft, left, bottom);
    addSetValue(topKeysByLeft, left, top);
    addSetValue(bottomKeysByRight, right, bottom);
    addSetValue(topKeysByRight, right, top);
  }
  return {
    variants,
    byLeft,
    byRight,
    byTop,
    byBottom,
    byTopAndLeft,
    byTopAndRight,
    byBottomAndLeft,
    byBottomAndRight,
    leftKeysByTop,
    rightKeysByTop,
    bottomKeysByLeft,
    topKeysByLeft,
    bottomKeysByRight,
    topKeysByRight,
    completionCache
  };
}

function compatibleGrid(tile: any, index: ReturnType<typeof createTopologyIndex>) {
  const target = { tile, orientation: tile.orientation ?? 0, signature: orient(tile, tile.orientation ?? 0) };
  const targetKey = edges.map((edge) => edgeKey(target.signature, edge)).join("\u0001");
  if (index.completionCache.has(targetKey)) {
    const cached = index.completionCache.get(targetKey);
    if (!cached) return null;
    const cells = [...cached.cells];
    cells[cached.targetCell.row * 2 + cached.targetCell.col] = target;
    return { cells, targetCell: cached.targetCell };
  }
  const complete = (
    cells: any[],
    targetCell: { row: number; col: number }
  ) => {
    const result = { cells, targetCell };
    index.completionCache.set(targetKey, result);
    return result;
  };
  const targetRight = edgeKey(target.signature, "right");
  const targetBottom = edgeKey(target.signature, "bottom");
  const rightBottomKeys = new Set(
    (index.byLeft.get(targetRight) ?? []).map((variant) =>
      edgeKey(variant.signature, "bottom")
    )
  );
  for (const rightBottom of rightBottomKeys) {
    const sharedEdge = firstIntersection(
      index.leftKeysByTop.get(rightBottom),
      index.rightKeysByTop.get(targetBottom)
    );
    if (sharedEdge !== undefined) {
      const right = index.byBottomAndLeft.get(`${rightBottom}\u0000${targetRight}`)?.[0];
      const bottom = index.byTopAndRight.get(`${targetBottom}\u0000${sharedEdge}`)?.[0];
      const diagonal = index.byTopAndLeft.get(`${rightBottom}\u0000${sharedEdge}`)?.[0];
      if (right && bottom && diagonal) {
        return complete([target, right, bottom, diagonal], { row: 0, col: 0 });
      }
    }
  }

  // A tile can be perfectly valid without having a completion when it is
  // artificially pinned to the top-left corner. Try every 2x2 position while
  // preserving the authored orientation before reporting a proof blocker. Each
  // completion is resolved from indexed edge pairs instead of an unbounded
  // backtracking search, so large tilesets cannot stall the proof worker.
  const targetLeft = edgeKey(target.signature, "left");
  const leftBottomKeys = new Set(
    (index.byRight.get(targetLeft) ?? []).map((variant) =>
      edgeKey(variant.signature, "bottom")
    )
  );
  for (const leftBottom of leftBottomKeys) {
    const sharedEdge = firstIntersection(
      index.rightKeysByTop.get(leftBottom),
      index.leftKeysByTop.get(targetBottom)
    );
    if (sharedEdge !== undefined) {
      const left = index.byBottomAndRight.get(`${leftBottom}\u0000${targetLeft}`)?.[0];
      const bottom = index.byTopAndLeft.get(`${targetBottom}\u0000${sharedEdge}`)?.[0];
      const diagonal = index.byTopAndRight.get(`${leftBottom}\u0000${sharedEdge}`)?.[0];
      if (left && bottom && diagonal) {
        return complete([left, target, diagonal, bottom], { row: 0, col: 1 });
      }
    }
  }

  const targetTop = edgeKey(target.signature, "top");
  const topRightKeys = new Set(
    (index.byBottom.get(targetTop) ?? []).map((variant) =>
      edgeKey(variant.signature, "right")
    )
  );
  for (const topRight of topRightKeys) {
    const sharedEdge = firstIntersection(
      index.bottomKeysByLeft.get(topRight),
      index.topKeysByLeft.get(targetRight)
    );
    if (sharedEdge !== undefined) {
      const top = index.byBottomAndRight.get(`${targetTop}\u0000${topRight}`)?.[0];
      const right = index.byTopAndLeft.get(`${sharedEdge}\u0000${targetRight}`)?.[0];
      const diagonal = index.byBottomAndLeft.get(`${sharedEdge}\u0000${topRight}`)?.[0];
      if (top && right && diagonal) {
        return complete([top, diagonal, target, right], { row: 1, col: 0 });
      }
    }
  }

  const topLeftKeys = new Set(
    (index.byBottom.get(targetTop) ?? []).map((variant) =>
      edgeKey(variant.signature, "left")
    )
  );
  for (const topLeft of topLeftKeys) {
    const sharedEdge = firstIntersection(
      index.bottomKeysByRight.get(topLeft),
      index.topKeysByRight.get(targetLeft)
    );
    if (sharedEdge !== undefined) {
      const top = index.byBottomAndLeft.get(`${targetTop}\u0000${topLeft}`)?.[0];
      const left = index.byTopAndRight.get(`${sharedEdge}\u0000${targetLeft}`)?.[0];
      const diagonal = index.byBottomAndRight.get(`${sharedEdge}\u0000${topLeft}`)?.[0];
      if (top && left && diagonal) {
        return complete([diagonal, top, left, target], { row: 1, col: 1 });
      }
    }
  }
  index.completionCache.set(targetKey, null);
  return null;
}

function createCompatibleGroupUnderlay(
  definition: any,
  width: number,
  height: number
) {
  const groupedTileIds = new Set<number>(
    definition.groups.flatMap((group: any) => group.tileIds)
  );
  const seed = definition.tiles
    .filter((tile: any) => !tile.groupId && !groupedTileIds.has(tile.tileId))
    .flatMap((tile: any) =>
      [0, 1, 2, 3].map((orientation) => ({
        tile,
        orientation,
        signature: orient(tile, orientation)
      }))
    )
    .find(({ signature }: any) =>
      edgeKey(signature, "left") === edgeKey(signature, "right") &&
      edgeKey(signature, "top") === edgeKey(signature, "bottom")
    );
  if (!seed) {
    return {
      ok: false as const,
      message: "No repeatable loose SET tile exists for the group proof underlay."
    };
  }
  return hydrateAuroraAreaEditingState({
    areaResRef: `proof_${definition.tilesetResRef}_groups`.slice(0, 16),
    width,
    height,
    definition,
    tiles: Array.from({ length: width * height }, (_, index) => {
      const row = Math.floor(index / width);
      const col = index % width;
      return {
        id: `${row}:${col}`,
        row,
        col,
        tileId: seed.tile.tileId,
        orientation: seed.orientation,
        height: 0
      };
    })
  });
}

function toViewport(state: any, definition: any): boolean {
  const scene = applyAuroraAreaEditingStateToScene(
    createBlankAreaScene(state.width, state.height),
    state,
    definition,
    definition.defaults?.defaultTerrain ?? definition.defaultTerrain ?? ""
  );
  return scene.tiles.length === state.width * state.height &&
    scene.tiles.every((tile) => tile.source === "aurora_tile_list") &&
    scene.auroraAreaEditing?.state.tiles.length === state.tiles.length;
}

function classifyTopologyCommand(result: any, inputUnchanged: boolean) {
  if (result.ok) return "ok" as const;
  if (result.code === "NO_MATCHING_TILE" && inputUnchanged) {
    return "constrained" as const;
  }
  return "failed" as const;
}

function csvCell(value: unknown): string {
  const text = String(value ?? "");
  return /[",\n\r]/u.test(text) ? `"${text.replace(/"/gu, '""')}"` : text;
}

function writeProof(rows: ProofRow[]) {
  fs.mkdirSync(outDirectory, { recursive: true });
  const headers = Object.keys(rows[0] ?? {}) as Array<keyof ProofRow>;
  fs.writeFileSync(path.join(outDirectory, "results.json"), `${JSON.stringify(rows, null, 2)}\n`);
  fs.writeFileSync(
    path.join(outDirectory, "results.csv"),
    [headers.join(","), ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(","))].join("\n") + "\n"
  );
  const summary = {
    generatedAt: new Date().toISOString(),
    total: rows.length,
    scope: requestedTilesets.size ? [...requestedTilesets].join(",") : "all tilesets",
    byResult: Object.fromEntries(["ok", "constrained", "attention", "blocked"].map((key) => [key, rows.filter((row) => row.result === key).length])),
    byOperation: {
      placeFailed: rows.filter((row) => row.place === "failed").length,
      placeConstrained: rows.filter((row) => row.place === "constrained").length,
      rotateFailed: rows.filter((row) => row.rotate === "failed").length,
      rotateConstrained: rows.filter((row) => row.rotate === "constrained").length,
      heightFailed: rows.filter((row) => row.height === "failed").length,
      heightConstrained: rows.filter((row) => row.height === "constrained").length,
      viewportFailed: rows.filter((row) => row.viewport === "failed").length,
      viewportNotApplicable: rows.filter((row) => row.viewport === "not_applicable").length
    }
  };
  fs.writeFileSync(path.join(outDirectory, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

async function exerciseDefinition(entry: any, rows: ProofRow[]) {
    const definition = entry.definition;
    const groupedTileIds = new Set(
      definition.groups.flatMap((group: any) => group.tileIds)
    );
    const looseTiles = definition.tiles.filter(
      (tile: any) => !groupedTileIds.has(tile.tileId)
    );
    const topologyIndex = createTopologyIndex(definition);
    let processedOperations = 0;
    for (const tile of looseTiles) {
      if (limit && rows.length >= limit) break;
      processedOperations += 1;
      // Keep the Vitest worker RPC responsive while the proof walks large SET
      // definitions. Some tilesets can spend more than the RPC timeout inside
      // 250 synchronous topology checks.
      if (processedOperations % 20 === 0) {
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
      const grid = compatibleGrid(tile, topologyIndex);
      if (!grid) {
        rows.push({ tilesetResRef: definition.tilesetResRef, tileId: tile.tileId, modelResRef: tile.modelResRef ?? "", kind: "loose", groupId: "", join: "no_compatible_neighbour", place: "not_applicable", rotate: "not_applicable", height: "not_applicable", viewport: "not_applicable", result: "blocked", detail: "No compatible loose 2x2 topology exists for the tile's authored orientation." });
        continue;
      }
      const initial = hydrateAuroraAreaEditingState({
        areaResRef: `proof_${definition.tilesetResRef}_${tile.tileId}`.slice(0, 16),
        width: 2,
        height: 2,
        definition,
        tiles: grid.cells.map((variant, index) => ({
          id: `${Math.floor(index / 2)}:${index % 2}`,
          row: Math.floor(index / 2),
          col: index % 2,
          tileId: variant.tile.tileId,
          orientation: variant.orientation,
          height: 0
        }))
      });
      if (!initial.ok) {
        rows.push({ tilesetResRef: definition.tilesetResRef, tileId: tile.tileId, modelResRef: tile.modelResRef ?? "", kind: "loose", groupId: "", join: "compatible_pair", place: "failed", rotate: "not_applicable", height: "not_applicable", viewport: "not_applicable", result: "blocked", detail: initial.message });
        continue;
      }
      const placed = replaceAuroraAreaTileId(
        initial.state,
        definition,
        grid.targetCell,
        tile.tileId,
        () => 0
      );
      if (!placed.ok) {
        rows.push({ tilesetResRef: definition.tilesetResRef, tileId: tile.tileId, modelResRef: tile.modelResRef ?? "", kind: "loose", groupId: "", join: "compatible_pair", place: "failed", rotate: "not_applicable", height: "not_applicable", viewport: "not_applicable", result: "blocked", detail: placed.message });
        continue;
      }
      // Exercise rotate and height independently from the explicit Tile_ID
      // replacement. A failure in one edit must not contaminate the other
      // operation's proof signal.
      const rotateInput = structuredClone(placed.state);
      const rotateInputSnapshot = JSON.stringify(rotateInput);
      const rotated = rotateAuroraAreaTile(rotateInput, definition, grid.targetCell, 1, () => 0);
      const rotateStatus = classifyTopologyCommand(
        rotated,
        JSON.stringify(rotateInput) === rotateInputSnapshot
      );
      const heightInput = structuredClone(placed.state);
      const heightInputSnapshot = JSON.stringify(heightInput);
      const raised = changeAuroraAreaTileHeight(heightInput, definition, grid.targetCell, 1, () => 0);
      const heightStatus = classifyTopologyCommand(
        raised,
        JSON.stringify(heightInput) === heightInputSnapshot
      );
      const viewport =
        toViewport(initial.state, definition) &&
        toViewport(placed.state, definition) &&
        (!rotated.ok || toViewport(rotated.state, definition)) &&
        (!raised.ok || toViewport(raised.state, definition));
      rows.push({
        tilesetResRef: definition.tilesetResRef, tileId: tile.tileId, modelResRef: tile.modelResRef ?? "", kind: "loose", groupId: "", join: "compatible_pair", place: "ok",
        rotate: rotateStatus, height: heightStatus, viewport: viewport ? "ok" : "failed",
        result: rotateStatus === "failed" || heightStatus === "failed" || !viewport
          ? "attention"
          : rotateStatus === "constrained" || heightStatus === "constrained"
            ? "constrained"
            : "ok",
        detail: rotateStatus === "failed"
          ? rotated.message
          : heightStatus === "failed"
            ? raised.message
            : !viewport
              ? "Viewport scene contract failed."
              : rotateStatus === "constrained" || heightStatus === "constrained"
                ? "Tile_ID replacement succeeded; topology-incompatible update was rejected atomically without mutating its input state."
                : "Joined, explicitly replaced by Tile_ID, rotated, raised and mapped into the viewport scene."
      });
    }
    for (const group of definition.groups) {
      if (limit && rows.length >= limit) break;
      processedOperations += 1;
      if (processedOperations % 20 === 0) {
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
      const squareFootprint = Math.max(group.columns, group.rows);
      const width = Math.max(2, squareFootprint);
      const height = Math.max(2, squareFootprint);
      const created = width <= 32 && height <= 32
        ? createCompatibleGroupUnderlay(definition, width, height)
        : { ok: false, message: "Group footprint exceeds Aurora Area limits." };
      const emit = (row: Omit<ProofRow, "tileId" | "modelResRef">) => group.tileIds.forEach((tileId: number) => {
        const tile = definition.tiles.find((candidate: any) => candidate.tileId === tileId);
        rows.push({ ...row, tileId, modelResRef: tile?.modelResRef ?? "" });
      });
      if (!created.ok) {
        emit({ tilesetResRef: definition.tilesetResRef, kind: "group", groupId: group.id, join: "new_area_failed", place: "failed", rotate: "not_applicable", height: "not_applicable", viewport: "not_applicable", result: "blocked", detail: created.message });
        continue;
      }
      const placeInputSnapshot = JSON.stringify(created.state);
      const placed = placeAuroraAreaGroup(created.state, definition, group.id, { row: 0, col: 0 }, 0, () => 0);
      const placeStatus = classifyTopologyCommand(
        placed,
        JSON.stringify(created.state) === placeInputSnapshot
      );
      const rotateInput = placed.ok ? structuredClone(placed.state) : undefined;
      const rotateInputSnapshot = rotateInput ? JSON.stringify(rotateInput) : "";
      const rotated = rotateInput
        ? rotateAuroraAreaGroupAtCell(rotateInput, definition, { row: 0, col: 0 }, 1, () => 0)
        : placed;
      const heightInput = placed.ok ? structuredClone(placed.state) : undefined;
      const heightInputSnapshot = heightInput ? JSON.stringify(heightInput) : "";
      const raised = heightInput
        ? changeAuroraAreaGroupHeightAtCell(heightInput, definition, { row: 0, col: 0 }, 1, () => 0)
        : placed;
      const rotateStatus = placed.ok
        ? classifyTopologyCommand(
          rotated,
          JSON.stringify(rotateInput) === rotateInputSnapshot
        )
        : "not_applicable";
      const heightStatus = placed.ok
        ? classifyTopologyCommand(
          raised,
          JSON.stringify(heightInput) === heightInputSnapshot
        )
        : "not_applicable";
      const viewport =
        toViewport(created.state, definition) &&
        (!placed.ok || toViewport(placed.state, definition)) &&
        (!rotated.ok || toViewport(rotated.state, definition)) &&
        (!raised.ok || toViewport(raised.state, definition));
      emit({
        tilesetResRef: definition.tilesetResRef, kind: "group", groupId: group.id, join: "group_footprint", place: placeStatus, rotate: rotateStatus, height: heightStatus, viewport: viewport ? "ok" : "failed",
        result: placeStatus === "failed" || rotateStatus === "failed" || heightStatus === "failed" || !viewport
          ? "attention"
          : placeStatus === "constrained" || rotateStatus === "constrained" || heightStatus === "constrained"
            ? "constrained"
            : "ok",
        detail: placeStatus === "failed"
          ? placed.message
          : rotateStatus === "failed"
            ? rotated.message
            : heightStatus === "failed"
              ? raised.message
              : !viewport
                ? "Viewport scene contract failed."
                : placeStatus === "constrained" || rotateStatus === "constrained" || heightStatus === "constrained"
                  ? "Topology-incompatible group edit was rejected atomically without mutating its input state."
                  : "Placed, rotated, raised and mapped group footprint into the viewport scene."
      });
    }
}

expect(fs.existsSync(inputPath), `Generate proof input first: ${inputPath}`).toBe(true);
const proofInput = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const proofEntries = (proofInput.definitions as Array<any>).filter(
  (entry) => !requestedTilesets.size || requestedTilesets.has(entry.tilesetResRef)
);
const expectedProofRowCount = proofEntries.reduce(
  (total, entry) => {
    const groupedTileIds = new Set(
      entry.definition.groups.flatMap((group: any) => group.tileIds)
    );
    return total +
      entry.definition.tiles.filter(
        (tile: any) => !groupedTileIds.has(tile.tileId)
      ).length +
      entry.definition.groups.reduce(
      (groupTotal: number, group: any) =>
        groupTotal + group.tileIds.length,
      0
    );
  },
  0
);
const proofRows: ProofRow[] = [];

for (const entry of proofEntries) {
  it(`proves Area tile editing for ${entry.tilesetResRef}`, async () => {
    if (limit && proofRows.length >= limit) return;
    await exerciseDefinition(entry, proofRows);
  }, 600_000);
}

afterAll(() => {
  const summary = writeProof(proofRows);
  expect(proofRows.length).toBeGreaterThan(0);
  if (!requestedTilesets.size && !limit) {
    expect(proofRows).toHaveLength(expectedProofRowCount);
  }
  expect(summary.byOperation.viewportFailed).toBe(0);
  expect(summary.byOperation.placeFailed).toBe(0);
  expect(summary.byOperation.rotateFailed).toBe(0);
  expect(summary.byOperation.heightFailed).toBe(0);
});
