import { createHash } from "node:crypto";

const SCHEMA = "aurora-area-tile-placeholder-topology-source-audit/v1";
const CORNERS = Object.freeze(["topLeft", "topRight", "bottomRight", "bottomLeft"]);
const EDGES = Object.freeze(["top", "right", "bottom", "left"]);
const SHA256 = /^[a-f0-9]{64}$/u;

function normalizeToken(value) {
  return String(value ?? "").trim().toLowerCase();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "en"));
}

function immutableArray(values) {
  return Object.freeze([...values]);
}

function readTopologyValues(tile, fields, property) {
  const source = tile?.[property];
  return fields.map((field) => normalizeToken(source?.[field]) || null);
}

function countStatusTopology(statusCounts, status, hasUndeclaredCornerTerrain) {
  const current = statusCounts.get(status) ?? {
    total: 0,
    allCornerTerrainsDeclared: 0,
    containsUndeclaredCornerTerrain: 0
  };
  current.total += 1;
  current[
    hasUndeclaredCornerTerrain
      ? "containsUndeclaredCornerTerrain"
      : "allCornerTerrainsDeclared"
  ] += 1;
  statusCounts.set(status, current);
}

export function buildAreaTilePlaceholderTopologySourceAudit({ corpus, inventoryRows }) {
  if (!Array.isArray(corpus?.selectedTilesets) || !Array.isArray(inventoryRows)) {
    throw new Error("Area tile topology source audit inputs are invalid.");
  }

  const inventoryByRowId = new Map();
  for (const row of inventoryRows) {
    const tilesetResRef = normalizeToken(row?.tilesetResRef);
    const tileId = Number(row?.tileId);
    const rowId = `${tilesetResRef}:${tileId}`;
    if (!tilesetResRef || !Number.isSafeInteger(tileId) || tileId < 0) {
      throw new Error("Area tile topology source audit inventory row identity is invalid.");
    }
    if (inventoryByRowId.has(rowId)) {
      throw new Error(`Area tile topology source audit duplicate inventory row ${rowId}.`);
    }
    inventoryByRowId.set(rowId, row);
  }

  const summary = {
    tilesetCount: corpus.selectedTilesets.length,
    tileCount: 0,
    allCornerTerrainsDeclared: 0,
    containsUndeclaredCornerTerrain: 0,
    allEdgeCrossersDeclared: 0,
    containsUndeclaredEdgeCrosser: 0,
    legacyIntentionalPlaceholderCount: 0,
    legacyIntentionalPlaceholderAllCornerTerrainsDeclared: 0,
    legacyIntentionalPlaceholderContainsUndeclaredCornerTerrain: 0,
    legacyIntentionalPlaceholderGrouped: 0,
    legacyIntentionalPlaceholderStandalone: 0,
    nonLegacyPlaceholderContainsUndeclaredCornerTerrain: 0
  };
  const seenRows = new Set();
  const statusTopologyCounts = new Map();
  const reviewRows = [];
  const corpusIdentityRows = [];

  for (const tileset of corpus.selectedTilesets) {
    const tilesetResRef = normalizeToken(tileset?.tilesetResRef);
    const setSha256 = normalizeToken(tileset?.setSha256);
    if (!tilesetResRef || !SHA256.test(setSha256) || !Array.isArray(tileset?.definition?.tiles)) {
      throw new Error("Area tile topology source audit corpus entry is invalid.");
    }
    const declaredTerrains = new Set(
      (tileset.definition.terrainTypes ?? []).map((entry) => normalizeToken(entry?.name)).filter(Boolean)
    );
    const declaredCrossers = new Set(
      (tileset.definition.crosserTypes ?? []).map((entry) => normalizeToken(entry?.name)).filter(Boolean)
    );
    corpusIdentityRows.push(`${tilesetResRef}:${setSha256}:${tileset.definition.tiles.length}`);

    for (const tile of tileset.definition.tiles) {
      const tileId = Number(tile?.tileId);
      const rowId = `${tilesetResRef}:${tileId}`;
      if (!Number.isSafeInteger(tileId) || tileId < 0 || seenRows.has(rowId)) {
        throw new Error(`Area tile topology source audit corpus row identity is invalid: ${rowId}.`);
      }
      seenRows.add(rowId);
      const inventoryRow = inventoryByRowId.get(rowId);
      if (!inventoryRow) {
        throw new Error(`Area tile topology source audit inventory membership mismatch at ${rowId}.`);
      }
      const modelResRef = normalizeToken(tile.modelResRef) || null;
      const inventoryModelResRef = normalizeToken(inventoryRow.modelResRef) || null;
      if (modelResRef !== inventoryModelResRef) {
        throw new Error(`Area tile topology source audit model declaration mismatch for ${rowId}.`);
      }
      const legacyModelStatus = normalizeToken(inventoryRow.modelStatus);
      if (!legacyModelStatus) {
        throw new Error(`Area tile topology source audit legacy status is missing for ${rowId}.`);
      }

      const cornerTerrains = readTopologyValues(tile, CORNERS, "terrain");
      const edgeCrossers = readTopologyValues(tile, EDGES, "crossers");
      const undeclaredCornerTerrains = uniqueSorted(
        cornerTerrains.filter((value) => value === null || !declaredTerrains.has(value))
          .map((value) => value ?? "<missing>")
      );
      const undeclaredEdgeCrossers = uniqueSorted(
        edgeCrossers.filter((value) => value !== null && !declaredCrossers.has(value))
      );
      const hasUndeclaredCornerTerrain = undeclaredCornerTerrains.length > 0;
      const hasUndeclaredEdgeCrosser = undeclaredEdgeCrossers.length > 0;
      const legacyIntentionalPlaceholder = legacyModelStatus === "intentional_placeholder";
      const groupIds = tile.groupIds?.length
        ? [...tile.groupIds]
        : tile.groupId
          ? [tile.groupId]
          : [];

      summary.tileCount += 1;
      summary[
        hasUndeclaredCornerTerrain
          ? "containsUndeclaredCornerTerrain"
          : "allCornerTerrainsDeclared"
      ] += 1;
      summary[
        hasUndeclaredEdgeCrosser
          ? "containsUndeclaredEdgeCrosser"
          : "allEdgeCrossersDeclared"
      ] += 1;
      countStatusTopology(statusTopologyCounts, legacyModelStatus, hasUndeclaredCornerTerrain);

      if (legacyIntentionalPlaceholder) {
        summary.legacyIntentionalPlaceholderCount += 1;
        summary[
          hasUndeclaredCornerTerrain
            ? "legacyIntentionalPlaceholderContainsUndeclaredCornerTerrain"
            : "legacyIntentionalPlaceholderAllCornerTerrainsDeclared"
        ] += 1;
        summary[
          groupIds.length > 0
            ? "legacyIntentionalPlaceholderGrouped"
            : "legacyIntentionalPlaceholderStandalone"
        ] += 1;
      } else if (hasUndeclaredCornerTerrain) {
        summary.nonLegacyPlaceholderContainsUndeclaredCornerTerrain += 1;
      }

      if (legacyIntentionalPlaceholder || hasUndeclaredCornerTerrain || hasUndeclaredEdgeCrosser) {
        reviewRows.push(Object.freeze({
          rowId,
          tilesetResRef,
          tileId,
          setSha256,
          modelResRef,
          legacyModelStatus,
          groupIds: immutableArray(groupIds),
          cornerTerrains: immutableArray(cornerTerrains),
          undeclaredCornerTerrains: immutableArray(undeclaredCornerTerrains),
          edgeCrossers: immutableArray(edgeCrossers),
          undeclaredEdgeCrossers: immutableArray(undeclaredEdgeCrossers)
        }));
      }
    }
  }

  if (seenRows.size !== inventoryByRowId.size) {
    throw new Error("Area tile topology source audit inventory membership mismatch.");
  }

  const legacyStatusTopologyCounts = Object.fromEntries(
    [...statusTopologyCounts]
      .sort(([left], [right]) => left.localeCompare(right, "en"))
      .map(([status, counts]) => [status, Object.freeze({ ...counts })])
  );
  const inventoryIdentityRows = [...inventoryByRowId]
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([rowId, row]) => `${rowId}:${normalizeToken(row.modelResRef)}:${normalizeToken(row.modelStatus)}`);

  return Object.freeze({
    schema: SCHEMA,
    corpusIdentitySha256: sha256(`${corpusIdentityRows.sort().join("\n")}\n`),
    inventoryIdentitySha256: sha256(`${inventoryIdentityRows.join("\n")}\n`),
    summary: Object.freeze(summary),
    legacyStatusTopologyCounts: Object.freeze(legacyStatusTopologyCounts),
    reviewRows: Object.freeze(reviewRows)
  });
}
