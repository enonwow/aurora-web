import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  assertRuntimeTileSweepResumeBinding,
  loadRuntimeTileSweepDefinitionCatalog,
  resolveRuntimeTilesetSweepEntries
} from "./lib/runtime-tile-sweep-source-catalog.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const writeJson = (filePath, value) => {
  const json = `${JSON.stringify(value, null, 2)}\n`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, json, "utf8");
  return sha256(json);
};

const root = fs.mkdtempSync(path.join(os.tmpdir(), "aurora-runtime-tile-source-catalog-"));
try {
  const catalogDirectory = path.join(root, "catalog");
  const definitionPath = path.join(catalogDirectory, "definitions", "opaque01.json");
  const sourceSha256 = "1".repeat(64);
  const definition = {
    schemaVersion: 1,
    tilesetResRef: "opaque01",
    fingerprint: sourceSha256,
    tiles: [
      { tileId: 0, modelResRef: "ordinary_model", modelSourceStatus: "source_resolved" },
      { tileId: 1, modelResRef: "looks_renderable", modelSourceStatus: "intentional_placeholder" },
      { tileId: 2, modelResRef: "padding", modelSourceStatus: "source_missing" },
      { tileId: 3, modelSourceStatus: "invalid_missing_model_field" }
    ]
  };
  const definitionSha256 = writeJson(definitionPath, definition);
  const catalogPath = path.join(catalogDirectory, "catalog.json");
  const catalog = {
    schema: "aurora-tileset-definition-catalog/v2",
    generatedAt: "2026-09-01T12:00:00.000Z",
    summary: {
      tilesetCount: 1,
      totalTileCount: 4,
      sourceResolvedTileCount: 1,
      sourceMissingTileCount: 1,
      intentionalPlaceholderTileCount: 1,
      invalidMissingModelFieldTileCount: 1
    },
    entries: [{
      tilesetResRef: "opaque01",
      sourceSha256,
      definitionPath: "definitions/opaque01.json",
      definitionSha256,
      tileCount: 4
    }]
  };
  const catalogSha256 = writeJson(catalogPath, catalog);
  const loaded = loadRuntimeTileSweepDefinitionCatalog({
    catalogPath,
    expectedSha256: catalogSha256
  });

  const resolved = resolveRuntimeTilesetSweepEntries({
    catalog: loaded,
    tilesetDefinition: {
      schemaVersion: 1,
      tilesetResRef: "opaque01",
      fingerprint: sourceSha256,
      tiles: [
        { tileId: 0, modelResRef: "ordinary_model" },
        { tileId: 1, modelResRef: "looks_renderable" },
        { tileId: 2, modelResRef: "padding" },
        { tileId: 3 }
      ]
    }
  });

  assert.deepEqual(resolved.map((entry) => ({
    tileId: entry.tileId,
    modelSourceStatus: entry.modelSourceStatus,
    sourceDisposition: entry.sourceDisposition,
    runtimeTileId: entry.runtimeTileId,
    blockerCodes: entry.audit?.blockerCodes ?? []
  })), [
    {
      tileId: 0,
      modelSourceStatus: "source_resolved",
      sourceDisposition: "process",
      runtimeTileId: "tile_ordinary_model",
      blockerCodes: []
    },
    {
      tileId: 1,
      modelSourceStatus: "intentional_placeholder",
      sourceDisposition: "excluded",
      runtimeTileId: null,
      blockerCodes: []
    },
    {
      tileId: 2,
      modelSourceStatus: "source_missing",
      sourceDisposition: "blocked",
      runtimeTileId: null,
      blockerCodes: ["TILE_MODEL_SOURCE_MISSING"]
    },
    {
      tileId: 3,
      modelSourceStatus: "invalid_missing_model_field",
      sourceDisposition: "blocked",
      runtimeTileId: null,
      blockerCodes: ["TILE_MODEL_DECLARATION_INVALID"]
    }
  ]);
  assertRuntimeTileSweepResumeBinding(loaded, { definitionCatalog: loaded.binding }, resolved);

  assert.throws(
    () => assertRuntimeTileSweepResumeBinding(loaded, {}, resolved),
    /source-bound definition catalog binding/u
  );
  assert.throws(
    () => assertRuntimeTileSweepResumeBinding(
      loaded,
      { definitionCatalog: { ...loaded.binding, catalogSha256: "2".repeat(64) } },
      resolved
    ),
    /binding mismatch/u
  );
  assert.throws(
    () => loadRuntimeTileSweepDefinitionCatalog({
      catalogPath,
      expectedSha256: "3".repeat(64)
    }),
    /SHA-256 mismatch/u
  );
  assert.throws(
    () => resolveRuntimeTilesetSweepEntries({
      catalog: loaded,
      tilesetDefinition: {
        schemaVersion: 1,
        tilesetResRef: "opaque01",
        fingerprint: "4".repeat(64),
        tiles: definition.tiles
      }
    }),
    /fingerprint mismatch/u
  );

  const invalidDefinition = {
    ...definition,
    tiles: definition.tiles.map((tile) => ({ ...tile }))
  };
  invalidDefinition.tiles[0].modelSourceStatus = "guessed_present";
  const invalidDefinitionPath = path.join(catalogDirectory, "definitions", "invalid01.json");
  const invalidDefinitionSha256 = writeJson(invalidDefinitionPath, {
    ...invalidDefinition,
    tilesetResRef: "invalid01"
  });
  const invalidCatalogPath = path.join(catalogDirectory, "invalid-catalog.json");
  const invalidCatalogSha256 = writeJson(invalidCatalogPath, {
    ...catalog,
    entries: [{
      ...catalog.entries[0],
      tilesetResRef: "invalid01",
      definitionPath: "definitions/invalid01.json",
      definitionSha256: invalidDefinitionSha256
    }]
  });
  assert.throws(
    () => loadRuntimeTileSweepDefinitionCatalog({
      catalogPath: invalidCatalogPath,
      expectedSha256: invalidCatalogSha256
    }),
    /unsupported modelSourceStatus/u
  );

  const sweepSource = fs.readFileSync(
    new URL("./audit-all-runtime-tile-contracts.mjs", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(sweepSource, /INTENTIONAL_GROUP_COMPANION_MODEL_RESREFS/u);
  assert.doesNotMatch(sweepSource, /tpad_/u);
  assert.match(sweepSource, /resolveRuntimeTilesetSweepEntries/u);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

process.stdout.write("runtime tile sweep source catalog: PASS\n");
