import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const CATALOG_SCHEMA = "aurora-tileset-definition-catalog/v2";
const BINDING_SCHEMA = "aurora-runtime-tile-sweep-definition-catalog-binding/v1";
const SHA256 = /^[a-f0-9]{64}$/u;
const RESREF = /^[a-z0-9_]{1,16}$/u;
const MODEL_SOURCE_STATUSES = new Set([
  "source_resolved",
  "source_missing",
  "intentional_placeholder",
  "invalid_missing_model_field"
]);

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function normalizeToken(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function parseJsonObject(bytes, label) {
  let parsed;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return parsed;
}

function isInside(parentDirectory, candidatePath) {
  const relative = path.relative(path.resolve(parentDirectory), path.resolve(candidatePath));
  return relative.length > 0 &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative);
}

function requireNonNegativeInteger(value, label) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
  return numeric;
}

function sourceDispositionForStatus(modelSourceStatus) {
  if (modelSourceStatus === "source_resolved") return "process";
  if (modelSourceStatus === "intentional_placeholder") return "excluded";
  return "blocked";
}

function sourceBlockerForStatus(modelSourceStatus) {
  if (modelSourceStatus === "source_missing") return "TILE_MODEL_SOURCE_MISSING";
  if (modelSourceStatus === "invalid_missing_model_field") {
    return "TILE_MODEL_DECLARATION_INVALID";
  }
  return null;
}

function validateDefinitionTile(rawTile, tilesetResRef, seenTileIds) {
  if (!rawTile || typeof rawTile !== "object" || Array.isArray(rawTile)) {
    throw new Error(`Definition ${tilesetResRef} contains a non-object tile row.`);
  }
  const tileId = requireNonNegativeInteger(
    rawTile.tileId,
    `Definition ${tilesetResRef} tileId`
  );
  if (seenTileIds.has(tileId)) {
    throw new Error(`Definition ${tilesetResRef} contains duplicate tile ${tileId}.`);
  }
  seenTileIds.add(tileId);
  const modelResRef = normalizeToken(rawTile.modelResRef);
  const modelSourceStatus = normalizeToken(rawTile.modelSourceStatus);
  if (!MODEL_SOURCE_STATUSES.has(modelSourceStatus)) {
    throw new Error(
      `Definition ${tilesetResRef}:${tileId} has unsupported modelSourceStatus ` +
      `${modelSourceStatus || "<missing>"}.`
    );
  }
  if (
    (modelSourceStatus === "source_resolved" || modelSourceStatus === "source_missing") &&
    !modelResRef
  ) {
    throw new Error(
      `Definition ${tilesetResRef}:${tileId} requires a model ResRef for ${modelSourceStatus}.`
    );
  }
  if (modelSourceStatus === "invalid_missing_model_field" && modelResRef) {
    throw new Error(
      `Definition ${tilesetResRef}:${tileId} declares a model for invalid_missing_model_field.`
    );
  }
  return Object.freeze({ tileId, modelResRef: modelResRef || null, modelSourceStatus });
}

function readDefinitionShard(catalogDirectory, rawEntry) {
  const tilesetResRef = normalizeToken(rawEntry?.tilesetResRef);
  const sourceSha256 = normalizeToken(rawEntry?.sourceSha256);
  const definitionSha256 = normalizeToken(rawEntry?.definitionSha256);
  const definitionRelativePath = typeof rawEntry?.definitionPath === "string"
    ? rawEntry.definitionPath.trim()
    : "";
  const tileCount = requireNonNegativeInteger(
    rawEntry?.tileCount,
    `Catalog entry ${tilesetResRef || "<missing>"} tileCount`
  );
  if (!RESREF.test(tilesetResRef)) {
    throw new Error(`Catalog contains invalid tileset ResRef ${tilesetResRef || "<missing>"}.`);
  }
  if (!SHA256.test(sourceSha256) || !SHA256.test(definitionSha256)) {
    throw new Error(`Catalog entry ${tilesetResRef} has an invalid source or definition SHA-256.`);
  }
  if (!definitionRelativePath || path.isAbsolute(definitionRelativePath)) {
    throw new Error(`Catalog entry ${tilesetResRef} has an invalid definition path.`);
  }
  const definitionPath = path.resolve(catalogDirectory, definitionRelativePath);
  if (!isInside(catalogDirectory, definitionPath)) {
    throw new Error(`Catalog entry ${tilesetResRef} definition path escapes the catalog directory.`);
  }
  if (!fs.existsSync(definitionPath) || !fs.statSync(definitionPath).isFile()) {
    throw new Error(`Catalog definition shard is missing for ${tilesetResRef}: ${definitionPath}.`);
  }
  const definitionBytes = fs.readFileSync(definitionPath);
  const observedDefinitionSha256 = sha256Bytes(definitionBytes);
  if (observedDefinitionSha256 !== definitionSha256) {
    throw new Error(
      `Catalog definition SHA-256 mismatch for ${tilesetResRef}: expected ` +
      `${definitionSha256}, observed ${observedDefinitionSha256}.`
    );
  }
  const definition = parseJsonObject(definitionBytes, `Catalog definition ${tilesetResRef}`);
  if (
    definition.schemaVersion !== 1 ||
    normalizeToken(definition.tilesetResRef) !== tilesetResRef ||
    normalizeToken(definition.fingerprint) !== sourceSha256
  ) {
    throw new Error(`Catalog definition identity mismatch for ${tilesetResRef}.`);
  }
  if (!Array.isArray(definition.tiles) || definition.tiles.length !== tileCount) {
    throw new Error(`Catalog definition tile count mismatch for ${tilesetResRef}.`);
  }
  const seenTileIds = new Set();
  const tiles = definition.tiles.map((tile) =>
    validateDefinitionTile(tile, tilesetResRef, seenTileIds)
  );
  return Object.freeze({
    tilesetResRef,
    sourceSha256,
    definitionPath,
    definitionSha256,
    tileCount,
    tiles: Object.freeze(tiles),
    tilesById: new Map(tiles.map((tile) => [tile.tileId, tile]))
  });
}

export function loadRuntimeTileSweepDefinitionCatalog({ catalogPath, expectedSha256 }) {
  const resolvedCatalogPath = path.resolve(String(catalogPath ?? ""));
  const normalizedExpectedSha256 = normalizeToken(expectedSha256);
  if (!SHA256.test(normalizedExpectedSha256)) {
    throw new Error("Definition catalog expected SHA-256 must be an exact lowercase SHA-256.");
  }
  if (!fs.existsSync(resolvedCatalogPath) || !fs.statSync(resolvedCatalogPath).isFile()) {
    throw new Error(`Definition catalog is missing: ${resolvedCatalogPath}.`);
  }
  const catalogBytes = fs.readFileSync(resolvedCatalogPath);
  const observedCatalogSha256 = sha256Bytes(catalogBytes);
  if (observedCatalogSha256 !== normalizedExpectedSha256) {
    throw new Error(
      `Definition catalog SHA-256 mismatch: expected ${normalizedExpectedSha256}, ` +
      `observed ${observedCatalogSha256}.`
    );
  }
  const rawCatalog = parseJsonObject(catalogBytes, "Definition catalog");
  if (rawCatalog.schema !== CATALOG_SCHEMA || !Array.isArray(rawCatalog.entries)) {
    throw new Error(`Definition catalog must use ${CATALOG_SCHEMA} with an entries array.`);
  }
  const summary = rawCatalog.summary;
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new Error("Definition catalog summary is missing.");
  }
  const declaredTilesetCount = requireNonNegativeInteger(
    summary.tilesetCount,
    "Definition catalog tilesetCount"
  );
  const declaredTotalTileCount = requireNonNegativeInteger(
    summary.totalTileCount,
    "Definition catalog totalTileCount"
  );
  if (rawCatalog.entries.length !== declaredTilesetCount || declaredTilesetCount === 0) {
    throw new Error("Definition catalog tileset count does not match its exact entries.");
  }
  const catalogDirectory = path.dirname(resolvedCatalogPath);
  const tilesets = rawCatalog.entries.map((entry) => readDefinitionShard(catalogDirectory, entry));
  const tilesetsByResRef = new Map();
  for (const tileset of tilesets) {
    if (tilesetsByResRef.has(tileset.tilesetResRef)) {
      throw new Error(`Definition catalog contains duplicate tileset ${tileset.tilesetResRef}.`);
    }
    tilesetsByResRef.set(tileset.tilesetResRef, tileset);
  }
  const totalTileCount = tilesets.reduce((sum, tileset) => sum + tileset.tileCount, 0);
  if (totalTileCount !== declaredTotalTileCount) {
    throw new Error("Definition catalog total tile count does not match its exact definition shards.");
  }
  const statusCounts = {
    source_resolved: 0,
    source_missing: 0,
    intentional_placeholder: 0,
    invalid_missing_model_field: 0
  };
  for (const tileset of tilesets) {
    for (const tile of tileset.tiles) statusCounts[tile.modelSourceStatus] += 1;
  }
  for (const [status, count] of Object.entries(statusCounts)) {
    const summaryField = {
      source_resolved: "sourceResolvedTileCount",
      source_missing: "sourceMissingTileCount",
      intentional_placeholder: "intentionalPlaceholderTileCount",
      invalid_missing_model_field: "invalidMissingModelFieldTileCount"
    }[status];
    if (requireNonNegativeInteger(summary[summaryField], `Definition catalog ${summaryField}`) !== count) {
      throw new Error(`Definition catalog ${summaryField} does not match its exact rows.`);
    }
  }
  const binding = Object.freeze({
    schema: BINDING_SCHEMA,
    catalogPath: resolvedCatalogPath,
    catalogSha256: observedCatalogSha256,
    catalogSchema: CATALOG_SCHEMA,
    tilesetCount: tilesets.length,
    totalTileCount
  });
  return Object.freeze({
    binding,
    tilesets: Object.freeze(tilesets),
    tilesetResRefs: Object.freeze(tilesets.map((tileset) => tileset.tilesetResRef).sort()),
    tilesetsByResRef
  });
}

export function resolveRuntimeTilesetSweepEntries({ catalog, tilesetDefinition }) {
  if (!catalog?.tilesetsByResRef || !(catalog.tilesetsByResRef instanceof Map)) {
    throw new Error("A validated runtime tile sweep definition catalog is required.");
  }
  const tilesetResRef = normalizeToken(tilesetDefinition?.tilesetResRef);
  const catalogTileset = catalog.tilesetsByResRef.get(tilesetResRef);
  if (!catalogTileset) {
    throw new Error(`Live tileset ${tilesetResRef || "<missing>"} is absent from the definition catalog.`);
  }
  if (normalizeToken(tilesetDefinition?.fingerprint) !== catalogTileset.sourceSha256) {
    throw new Error(`Live tileset fingerprint mismatch for ${tilesetResRef}.`);
  }
  if (
    tilesetDefinition?.schemaVersion !== 1 ||
    !Array.isArray(tilesetDefinition.tiles) ||
    tilesetDefinition.tiles.length !== catalogTileset.tileCount
  ) {
    throw new Error(`Live tileset membership mismatch for ${tilesetResRef}.`);
  }
  const seenTileIds = new Set();
  const entries = tilesetDefinition.tiles.map((liveTile) => {
    const tileId = requireNonNegativeInteger(liveTile?.tileId, `Live tileset ${tilesetResRef} tileId`);
    if (seenTileIds.has(tileId)) {
      throw new Error(`Live tileset ${tilesetResRef} contains duplicate tile ${tileId}.`);
    }
    seenTileIds.add(tileId);
    const catalogTile = catalogTileset.tilesById.get(tileId);
    if (!catalogTile) {
      throw new Error(`Live tileset ${tilesetResRef} contains uncataloged tile ${tileId}.`);
    }
    const modelResRef = normalizeToken(liveTile?.modelResRef) || null;
    if (modelResRef !== catalogTile.modelResRef) {
      throw new Error(`Live tileset model declaration mismatch for ${tilesetResRef}:${tileId}.`);
    }
    const sourceDisposition = sourceDispositionForStatus(catalogTile.modelSourceStatus);
    const blockerCode = sourceBlockerForStatus(catalogTile.modelSourceStatus);
    return {
      tilesetResRef,
      tileId,
      modelResRef,
      modelSourceStatus: catalogTile.modelSourceStatus,
      sourceDisposition,
      runtimeTileId: sourceDisposition === "process" ? `tile_${modelResRef}` : null,
      placeholder: sourceDisposition === "excluded",
      ...(blockerCode
        ? {
            audit: {
              status: "blocked",
              blockerCodes: [blockerCode],
              errorMessage: null,
              source: "definition_catalog"
            }
          }
        : {})
    };
  });
  if (seenTileIds.size !== catalogTileset.tilesById.size) {
    throw new Error(`Live tileset membership mismatch for ${tilesetResRef}.`);
  }
  return entries;
}

function bindingMatches(left, right) {
  return left?.schema === right.schema &&
    left?.catalogPath === right.catalogPath &&
    left?.catalogSha256 === right.catalogSha256 &&
    left?.catalogSchema === right.catalogSchema &&
    left?.tilesetCount === right.tilesetCount &&
    left?.totalTileCount === right.totalTileCount;
}

export function assertRuntimeTileSweepResumeBinding(catalog, checkpoint, entries) {
  if (!bindingMatches(checkpoint?.definitionCatalog, catalog.binding)) {
    if (!checkpoint?.definitionCatalog) {
      throw new Error(
        "Runtime tile sweep checkpoint lacks a source-bound definition catalog binding; " +
        "start a new immutable output directory."
      );
    }
    throw new Error("Runtime tile sweep definition catalog binding mismatch.");
  }
  if (!Array.isArray(entries) || entries.length !== catalog.binding.totalTileCount) {
    throw new Error("Runtime tile sweep entries do not match the bound catalog row count.");
  }
  const catalogRows = new Map();
  for (const tileset of catalog.tilesets) {
    for (const tile of tileset.tiles) {
      catalogRows.set(`${tileset.tilesetResRef}:${tile.tileId}`, tile);
    }
  }
  const seen = new Set();
  for (const entry of entries) {
    const key = `${normalizeToken(entry?.tilesetResRef)}:${Number(entry?.tileId)}`;
    if (seen.has(key) || !catalogRows.has(key)) {
      throw new Error(`Runtime tile sweep entry membership mismatch at ${key}.`);
    }
    seen.add(key);
    const catalogTile = catalogRows.get(key);
    const modelResRef = normalizeToken(entry?.modelResRef) || null;
    const expectedDisposition = sourceDispositionForStatus(catalogTile.modelSourceStatus);
    const expectedRuntimeTileId = expectedDisposition === "process" ? `tile_${modelResRef}` : null;
    const expectedBlocker = sourceBlockerForStatus(catalogTile.modelSourceStatus);
    if (
      modelResRef !== catalogTile.modelResRef ||
      entry?.modelSourceStatus !== catalogTile.modelSourceStatus ||
      entry?.sourceDisposition !== expectedDisposition ||
      entry?.runtimeTileId !== expectedRuntimeTileId ||
      entry?.placeholder !== (expectedDisposition === "excluded") ||
      (expectedBlocker && !entry?.audit?.blockerCodes?.includes(expectedBlocker))
    ) {
      throw new Error(`Runtime tile sweep entry source binding mismatch at ${key}.`);
    }
  }
  if (seen.size !== catalogRows.size) {
    throw new Error("Runtime tile sweep entries do not exactly cover the bound catalog rows.");
  }
}
