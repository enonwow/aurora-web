import { createHash } from "node:crypto";

export const AREA_TILE_SOURCE_REMEDIATION_QUEUE_SCHEMA =
  "aurora-area-tile-source-remediation-queue/v1";

const SHA256 = /^[a-f0-9]{64}$/u;
const CORNERS = Object.freeze(["topLeft", "topRight", "bottomRight", "bottomLeft"]);
const EDGES = Object.freeze(["top", "right", "bottom", "left"]);
const SUPPORTED_MODEL_STATUSES = new Set([
  "source_resolved",
  "source_missing",
  "intentional_placeholder",
  "invalid_missing_model_field",
]);

function normalizeToken(value) {
  return String(value ?? "").trim().toLowerCase();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "en"));
}

function normalizedGroupIds(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeToken).filter(Boolean);
}

function corpusGroupIds(tile) {
  return tile?.groupIds?.length
    ? normalizedGroupIds(tile.groupIds)
    : tile?.groupId
      ? [normalizeToken(tile.groupId)]
      : [];
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function topologyValues(tile, property, fields) {
  return fields.map((field) => normalizeToken(tile?.[property]?.[field]) || null);
}

function immutableArray(values) {
  return Object.freeze([...values]);
}

function freezeRow(row) {
  return Object.freeze({
    ...row,
    groupIds: immutableArray(row.groupIds),
    cornerTerrains: immutableArray(row.cornerTerrains),
    undeclaredCornerTerrains: immutableArray(row.undeclaredCornerTerrains),
    edgeCrossers: immutableArray(row.edgeCrossers),
    undeclaredEdgeCrossers: immutableArray(row.undeclaredEdgeCrossers),
  });
}

function queueIdentityPayload(queue) {
  return {
    schema: queue.schema,
    corpusIdentitySha256: queue.corpusIdentitySha256,
    inventoryIdentitySha256: queue.inventoryIdentitySha256,
    closurePolicy: queue.closurePolicy,
    summary: queue.summary,
    rows: queue.rows,
    modelBatches: queue.modelBatches,
  };
}

export function buildAreaTileSourceRemediationQueue({ corpus, inventoryRows }) {
  if (!Array.isArray(corpus?.selectedTilesets) || !Array.isArray(inventoryRows)) {
    throw new Error("Area tile source remediation queue inputs are invalid.");
  }

  const inventoryByRowId = new Map();
  for (const row of inventoryRows) {
    const tilesetResRef = normalizeToken(row?.tilesetResRef);
    const tileId = Number(row?.tileId);
    const rowId = `${tilesetResRef}:${tileId}`;
    const modelStatus = normalizeToken(row?.modelStatus);
    if (!tilesetResRef || !Number.isSafeInteger(tileId) || tileId < 0) {
      throw new Error("Area tile source remediation inventory row identity is invalid.");
    }
    if (inventoryByRowId.has(rowId)) {
      throw new Error(`Area tile source remediation duplicate inventory row ${rowId}.`);
    }
    if (!SUPPORTED_MODEL_STATUSES.has(modelStatus)) {
      throw new Error(`Area tile source remediation status is invalid for ${rowId}.`);
    }
    inventoryByRowId.set(rowId, row);
  }

  const rows = [];
  const seenRows = new Set();
  const corpusIdentityRows = [];

  for (const tileset of corpus.selectedTilesets) {
    const tilesetResRef = normalizeToken(tileset?.tilesetResRef);
    const setSha256 = normalizeToken(tileset?.setSha256);
    const tiles = tileset?.definition?.tiles;
    if (!tilesetResRef || !SHA256.test(setSha256) || !Array.isArray(tiles)) {
      throw new Error("Area tile source remediation corpus entry is invalid.");
    }
    const declaredTerrains = new Set(
      (tileset.definition.terrainTypes ?? [])
        .map((entry) => normalizeToken(entry?.name))
        .filter(Boolean),
    );
    const declaredCrossers = new Set(
      (tileset.definition.crosserTypes ?? [])
        .map((entry) => normalizeToken(entry?.name))
        .filter(Boolean),
    );
    corpusIdentityRows.push(`${tilesetResRef}:${setSha256}:${tiles.length}`);

    for (const tile of tiles) {
      const tileId = Number(tile?.tileId);
      const rowId = `${tilesetResRef}:${tileId}`;
      if (!Number.isSafeInteger(tileId) || tileId < 0 || seenRows.has(rowId)) {
        throw new Error(`Area tile source remediation corpus row identity is invalid: ${rowId}.`);
      }
      seenRows.add(rowId);
      const inventoryRow = inventoryByRowId.get(rowId);
      if (!inventoryRow) {
        throw new Error(`Area tile source remediation inventory membership mismatch at ${rowId}.`);
      }
      const modelResRef = normalizeToken(tile.modelResRef);
      if (modelResRef !== normalizeToken(inventoryRow.modelResRef)) {
        throw new Error(`Area tile source remediation model declaration mismatch for ${rowId}.`);
      }
      const expectedGroupIds = corpusGroupIds(tile);
      const inventoryGroupIds = normalizedGroupIds(inventoryRow.groupIds);
      if (!arraysEqual(expectedGroupIds, inventoryGroupIds)) {
        throw new Error(`Area tile source remediation group membership mismatch for ${rowId}.`);
      }

      if (normalizeToken(inventoryRow.modelStatus) !== "source_missing") continue;
      if (
        !modelResRef ||
        normalizeToken(inventoryRow.modelSourceLayer) ||
        normalizeToken(inventoryRow.modelSource)
      ) {
        throw new Error(`Area tile source remediation missing-source contract is invalid for ${rowId}.`);
      }

      const cornerTerrains = topologyValues(tile, "terrain", CORNERS);
      const edgeCrossers = topologyValues(tile, "crossers", EDGES);
      const undeclaredCornerTerrains = uniqueSorted(
        cornerTerrains
          .filter((value) => value === null || !declaredTerrains.has(value))
          .map((value) => value ?? "<missing>"),
      );
      const undeclaredEdgeCrossers = uniqueSorted(
        edgeCrossers.filter((value) => value !== null && !declaredCrossers.has(value)),
      );
      rows.push(freezeRow({
        rowId,
        tilesetResRef,
        tileId,
        setSha256,
        modelResRef,
        disposition: "blocked",
        requiredClosure: "exact_source_or_accepted_row_bound_native_evidence",
        groupIds: expectedGroupIds,
        groupMembership: expectedGroupIds.length > 0 ? "grouped" : "standalone",
        topologyCohort:
          undeclaredCornerTerrains.length > 0
            ? "contains_undeclared_corner_terrain"
            : "all_corner_terrains_declared",
        cornerTerrains,
        undeclaredCornerTerrains,
        edgeCrossers,
        undeclaredEdgeCrossers,
      }));
    }
  }

  if (seenRows.size !== inventoryByRowId.size) {
    throw new Error("Area tile source remediation inventory membership mismatch.");
  }

  rows.sort((left, right) => left.rowId.localeCompare(right.rowId, "en"));
  const batchesByModel = new Map();
  for (const row of rows) {
    const batchRows = batchesByModel.get(row.modelResRef) ?? [];
    batchRows.push(row);
    batchesByModel.set(row.modelResRef, batchRows);
  }
  const modelBatches = [...batchesByModel]
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([modelResRef, batchRows]) => Object.freeze({
      modelResRef,
      disposition: "blocked",
      requiredClosure: "exact_source_or_accepted_row_bound_native_evidence",
      rowCount: batchRows.length,
      tilesetResRefs: immutableArray(uniqueSorted(batchRows.map((row) => row.tilesetResRef))),
      rowIds: immutableArray(batchRows.map((row) => row.rowId)),
      groupedRowCount: batchRows.filter((row) => row.groupMembership === "grouped").length,
      standaloneRowCount: batchRows.filter((row) => row.groupMembership === "standalone").length,
      allCornerTerrainsDeclaredRowCount: batchRows.filter(
        (row) => row.topologyCohort === "all_corner_terrains_declared",
      ).length,
      containsUndeclaredCornerTerrainRowCount: batchRows.filter(
        (row) => row.topologyCohort === "contains_undeclared_corner_terrain",
      ).length,
    }));

  const summary = Object.freeze({
    selectedTilesetCount: corpus.selectedTilesets.length,
    selectedTileRowCount: seenRows.size,
    sourceMissingRowCount: rows.length,
    uniqueMissingModelCount: modelBatches.length,
    affectedTilesetCount: new Set(rows.map((row) => row.tilesetResRef)).size,
    groupedMissingRowCount: rows.filter((row) => row.groupMembership === "grouped").length,
    standaloneMissingRowCount: rows.filter((row) => row.groupMembership === "standalone").length,
    allCornerTerrainsDeclaredMissingRowCount: rows.filter(
      (row) => row.topologyCohort === "all_corner_terrains_declared",
    ).length,
    containsUndeclaredCornerTerrainMissingRowCount: rows.filter(
      (row) => row.topologyCohort === "contains_undeclared_corner_terrain",
    ).length,
    allEdgeCrossersDeclaredMissingRowCount: rows.filter(
      (row) => row.undeclaredEdgeCrossers.length === 0,
    ).length,
    containsUndeclaredEdgeCrosserMissingRowCount: rows.filter(
      (row) => row.undeclaredEdgeCrossers.length > 0,
    ).length,
  });
  const inventoryIdentityRows = [...inventoryByRowId]
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([rowId, row]) => [
      rowId,
      normalizeToken(row.modelResRef),
      normalizeToken(row.modelStatus),
      normalizeToken(row.modelSourceLayer),
      normalizeToken(row.modelSource),
      normalizedGroupIds(row.groupIds).join("|"),
    ].join(":"));
  const unsignedQueue = {
    schema: AREA_TILE_SOURCE_REMEDIATION_QUEUE_SCHEMA,
    corpusIdentitySha256: sha256(`${corpusIdentityRows.sort().join("\n")}\n`),
    inventoryIdentitySha256: sha256(`${inventoryIdentityRows.join("\n")}\n`),
    closurePolicy: Object.freeze({
      defaultDisposition: "blocked",
      acceptableClosures: Object.freeze([
        "exact_model_source",
        "accepted_row_bound_native_nonrenderable_evidence",
      ]),
      inferredAliasOrSiblingSubstitutionAllowed: false,
      assetNameClassificationAllowed: false,
    }),
    summary,
    rows: Object.freeze(rows),
    modelBatches: Object.freeze(modelBatches),
  };
  return Object.freeze({
    ...unsignedQueue,
    queueIdentitySha256: sha256(JSON.stringify(queueIdentityPayload(unsignedQueue))),
  });
}
