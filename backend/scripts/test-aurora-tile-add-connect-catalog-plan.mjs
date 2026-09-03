import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(scriptDirectory, "..");
const repoRoot = path.resolve(backendRoot, "..");
const controller = path.join(scriptDirectory, "aurora-tile-add-connect-matrix.mjs");
const catalogCompiler = path.join(scriptDirectory, "create-aurora-tileset-definition-catalog.ts");
const tsNode = path.join(backendRoot, "node_modules", "ts-node", "dist", "bin.js");
const testRoot = fs.mkdtempSync(path.join(repoRoot, ".codex-tmp", "tile-catalog-plan-test-"));

const sha256File = (filePath) => createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
const writeJson = (filePath, value) => fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
const runController = (...args) => spawnSync(process.execPath, [controller, ...args], {
  cwd: repoRoot,
  encoding: "utf8"
});

function fixtureSet(prefix) {
  return [
    "[GENERAL]",
    `Name=${prefix}`,
    "[TILES]",
    "Count=3",
    "[TILE0]",
    `Model=${prefix}_source`,
    "PathNode=A",
    "TopRight=grass",
    "BottomRight=grass",
    "Right=road",
    "[TILE1]",
    `Model=${prefix}_positive`,
    "PathNode=a",
    "TopLeft=grass",
    "BottomLeft=grass",
    "Left=road",
    "[TILE2]",
    ...(prefix === "alpha" ? ["Model=(null)"] : [`Model=${prefix}_negative`]),
    "PathNode=L",
    "TopLeft=grass",
    "BottomLeft=grass",
    "Left=road",
    ""
  ].join("\n");
}

try {
  const runtimeProfilePath = path.join(testRoot, "runtime-build-profile.json");
  writeJson(runtimeProfilePath, {
    schema: "aurora-tile-add-connect-runtime-build-profile/v1",
    profileId: "catalog-plan-v8",
    createdAt: "2026-08-21T16:00:00.000Z",
    frontend: {
      commit: "catalog-plan-build",
      imageDigest: `sha256:${"a".repeat(64)}`,
      builtAt: "2026-08-21T15:59:00.000Z",
      baseUrl: "http://127.0.0.1:5173"
    },
    backend: {
      commit: "catalog-plan-build",
      imageDigest: `sha256:${"b".repeat(64)}`,
      builtAt: "2026-08-21T15:59:00.000Z",
      baseUrl: "http://127.0.0.1:3000",
      contractVersion: "1.0.0",
      vfxRuntimeRevision: "catalog-plan-runtime"
    }
  });
  const runtimeProfileSha256 = sha256File(runtimeProfilePath);
  const sourceRoot = path.join(testRoot, "modules", "current", "__aurora", "sources", "hak", "control");
  fs.mkdirSync(sourceRoot, { recursive: true });
  const alphaPath = path.join(sourceRoot, "alpha01.set");
  const betaPath = path.join(sourceRoot, "beta01.set");
  fs.writeFileSync(alphaPath, fixtureSet("alpha"), "utf8");
  fs.writeFileSync(betaPath, fixtureSet("beta"), "utf8");

  const selectionPath = path.join(testRoot, "selection-summary.json");
  const relativeAlpha = path.relative(repoRoot, alphaPath).replaceAll("\\", "/");
  const relativeBeta = path.relative(repoRoot, betaPath).replaceAll("\\", "/");
  writeJson(selectionPath, {
    schemaVersion: 1,
    generatedAt: "2026-08-21T00:00:00.000Z",
    input: { sourceRoot: path.relative(repoRoot, testRoot).replaceAll("\\", "/"), selectedTilesets: 2 },
    totals: { tiles: 6 },
    tilesets: [
      { tilesetResRef: "beta01", setSource: relativeBeta, tileCount: 3 },
      { tilesetResRef: "alpha01", setSource: relativeAlpha, tileCount: 3 }
    ]
  });

  const modelSourceInventoryPath = path.join(testRoot, "model-source-inventory.json");
  const modelSourceRows = [
    {
      tilesetResRef: "alpha01",
      tileId: 0,
      modelResRef: "alpha_source",
      modelStatus: "source_resolved",
      modelSourceLayer: "hak",
      modelSource: "control.hak"
    },
    {
      tilesetResRef: "alpha01",
      tileId: 1,
      modelResRef: "alpha_positive",
      modelStatus: "source_missing",
      modelSourceLayer: "",
      modelSource: ""
    },
    {
      tilesetResRef: "alpha01",
      tileId: 2,
      modelResRef: "(null)",
      modelStatus: "intentional_placeholder",
      modelSourceLayer: "",
      modelSource: ""
    },
    ...["source", "positive", "negative"].map((suffix, tileId) => ({
      tilesetResRef: "beta01",
      tileId,
      modelResRef: `beta_${suffix}`,
      modelStatus: "source_resolved",
      modelSourceLayer: "hak",
      modelSource: "control.hak"
    }))
  ];
  writeJson(modelSourceInventoryPath, modelSourceRows);

  const catalogDirectory = path.join(testRoot, "catalog");
  const compiled = spawnSync(process.execPath, [
    tsNode,
    "--transpile-only",
    catalogCompiler,
    "--selection-inventory", selectionPath,
    "--selection-inventory-sha256", sha256File(selectionPath),
    "--model-source-inventory", modelSourceInventoryPath,
    "--model-source-inventory-sha256", sha256File(modelSourceInventoryPath),
    "--out-directory", catalogDirectory
  ], { cwd: backendRoot, encoding: "utf8" });
  assert.equal(compiled.status, 0, compiled.stderr || compiled.stdout);

  const compilerResult = JSON.parse(compiled.stdout);
  assert.equal(compilerResult.schema, "aurora-tileset-definition-catalog-result/v2");
  assert.equal(compilerResult.summary.tilesetCount, 2);
  assert.equal(compilerResult.summary.totalTileCount, 6);
  assert.equal(compilerResult.summary.sourceResolvedTileCount, 4);
  assert.equal(compilerResult.summary.sourceMissingTileCount, 1);
  assert.equal(compilerResult.summary.intentionalPlaceholderTileCount, 1);

  const catalogPath = path.join(catalogDirectory, "catalog.json");
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  assert.equal(catalog.schema, "aurora-tileset-definition-catalog/v2");
  assert.equal(catalog.modelSourceInventory.sha256, sha256File(modelSourceInventoryPath));
  assert.equal(catalog.modelSourceInventory.rowCount, 6);
  assert.deepEqual(catalog.entries.map((entry) => entry.tilesetResRef), ["alpha01", "beta01"]);
  assert.deepEqual(catalog.entries.map((entry) => entry.sourceKey), [
    path.relative(testRoot, alphaPath).replaceAll("\\", "/"),
    path.relative(testRoot, betaPath).replaceAll("\\", "/")
  ]);
  for (const entry of catalog.entries) {
    const definitionPath = path.resolve(catalogDirectory, entry.definitionPath);
    const definition = JSON.parse(fs.readFileSync(definitionPath, "utf8"));
    assert.equal(entry.sourceSha256, definition.fingerprint);
    assert.equal(entry.definitionSha256, sha256File(definitionPath));
    assert.equal(entry.tileCount, 3);
    assert.equal(
      definition.tiles.every((tile) => typeof tile.modelSourceStatus === "string"),
      true
    );
  }
  const alphaDefinition = JSON.parse(fs.readFileSync(
    path.resolve(catalogDirectory, catalog.entries.find((entry) => entry.tilesetResRef === "alpha01").definitionPath),
    "utf8"
  ));
  assert.equal(alphaDefinition.tiles.find((tile) => tile.tileId === 2).modelResRef, "(null)");
  const compilerSource = fs.readFileSync(catalogCompiler, "utf8");
  assert.doesNotMatch(compilerSource, /INTENTIONAL_NULL_MODEL_SENTINELS/u);

  const outDirectory = path.join(testRoot, "plan");
  const planned = runController(
    "plan-catalog",
    "--out-directory", outDirectory,
    "--catalog", catalogPath,
    "--catalog-sha256", sha256File(catalogPath),
    "--runtime-build-profile", runtimeProfilePath,
    "--runtime-build-profile-sha256", runtimeProfileSha256
  );
  assert.equal(planned.status, 0, planned.stderr || planned.stdout);
  const result = JSON.parse(planned.stdout);
  assert.equal(result.reused, false);
  assert.equal(result.planBinding.contractRevision, "path-node-aware-v8");
  assert.equal(result.summary.tilesetCount, 2);
  assert.equal(result.summary.totalRows, 6);
  assert.equal(result.summary.addPlannedRows, 4);

  const manifestPath = path.join(outDirectory, "manifest.json");
  const manifestText = fs.readFileSync(manifestPath, "utf8");
  assert.equal(manifestText.includes("\n  \""), false, "large catalog manifests must use compact streaming JSON");
  const manifest = JSON.parse(manifestText);
  assert.deepEqual([...new Set(manifest.rows.map((row) => row.tilesetResRef))], ["alpha01", "beta01"]);
  assert.equal(manifest.contract.revision, "path-node-aware-v8");
  assert.equal(
    manifest.rows.find((row) => row.id === "alpha01:1").add.blocker.code,
    "TILE_MODEL_SOURCE_MISSING"
  );
  assert.equal(
    manifest.rows.find((row) => row.id === "alpha01:2").add.blocker.code,
    "TILE_MODEL_INTENTIONAL_PLACEHOLDER"
  );
  assert.equal(
    manifest.rows.find((row) => row.id === "beta01:0").pathConnect.negativeControl.referenceStatus,
    "reference-mismatch"
  );
  assert.equal(manifest.summary.tilesetCount, 2);
  assert.equal(manifest.summary.totalRows, 6);
  assert.equal(manifest.summary.chunkCount, manifest.chunks.length);
  const checkpoint = JSON.parse(
    fs.readFileSync(path.join(outDirectory, "checkpoint.json"), "utf8")
  );
  assert.deepEqual(checkpoint.acceptedVisualReviews, []);
  assert.deepEqual(checkpoint.rejectedVisualReviews, []);

  const status = runController(
    "status",
    "--out-directory", outDirectory,
    "--plan-id", result.planBinding.planId
  );
  assert.equal(status.status, 0, status.stderr || status.stdout);
  assert.equal(JSON.parse(status.stdout).validation.status, "ready");

  const unboundDirectory = path.join(testRoot, "unbound-catalog");
  const unbound = spawnSync(process.execPath, [
    tsNode,
    "--transpile-only",
    catalogCompiler,
    "--selection-inventory", selectionPath,
    "--selection-inventory-sha256", sha256File(selectionPath),
    "--out-directory", unboundDirectory
  ], { cwd: backendRoot, encoding: "utf8" });
  assert.notEqual(unbound.status, 0);
  assert.match(unbound.stderr, /Missing required --model-source-inventory/u);
  assert.equal(fs.existsSync(unboundDirectory), false);

  const invalidSourceInventoryPath = path.join(testRoot, "invalid-model-source-inventory.json");
  const invalidSourceRows = structuredClone(modelSourceRows);
  invalidSourceRows[0].modelStatus = "guessed_present";
  writeJson(invalidSourceInventoryPath, invalidSourceRows);
  const invalidCatalogDirectory = path.join(testRoot, "invalid-source-catalog");
  const invalidCatalog = spawnSync(process.execPath, [
    tsNode,
    "--transpile-only",
    catalogCompiler,
    "--selection-inventory", selectionPath,
    "--selection-inventory-sha256", sha256File(selectionPath),
    "--model-source-inventory", invalidSourceInventoryPath,
    "--model-source-inventory-sha256", sha256File(invalidSourceInventoryPath),
    "--out-directory", invalidCatalogDirectory
  ], { cwd: backendRoot, encoding: "utf8" });
  assert.notEqual(invalidCatalog.status, 0);
  assert.match(invalidCatalog.stderr, /unsupported modelStatus/u);
  assert.equal(fs.existsSync(invalidCatalogDirectory), false);

  const tamperedDefinition = path.resolve(catalogDirectory, catalog.entries[0].definitionPath);
  fs.appendFileSync(tamperedDefinition, "tamper", "utf8");
  const rejectedDirectory = path.join(testRoot, "rejected-plan");
  const rejected = runController(
    "plan-catalog",
    "--out-directory", rejectedDirectory,
    "--catalog", catalogPath,
    "--catalog-sha256", sha256File(catalogPath),
    "--runtime-build-profile", runtimeProfilePath,
    "--runtime-build-profile-sha256", runtimeProfileSha256
  );
  assert.notEqual(rejected.status, 0);
  assert.equal(fs.existsSync(rejectedDirectory), false);

  process.stdout.write("tile add/connect hash-bound catalog plan: PASS\n");
} finally {
  fs.rmSync(testRoot, { recursive: true, force: true });
}
