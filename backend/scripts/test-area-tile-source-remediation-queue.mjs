import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { loadSelectedAreaTilesetCorpus } from "./lib/area-tileset-source-corpus.mjs";
import { buildAreaTileSourceRemediationQueue } from "./lib/area-tile-source-remediation-queue.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(scriptDirectory, "..");
const repoRoot = path.resolve(backendRoot, "..");
const cliPath = path.join(scriptDirectory, "create-area-tile-source-remediation-queue.mjs");
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aurora-area-tile-source-remediation-"));

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function write(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

function alphaSet(model = "ghost_model") {
  return [
    "[GENERAL]",
    "Name=Alpha",
    "[TERRAIN TYPES]",
    "Count=1",
    "[TERRAIN0]",
    "Name=grass",
    "[CROSSER TYPES]",
    "Count=1",
    "[CROSSER0]",
    "Name=road",
    "[TILE0]",
    `Model=${model}`,
    "TopLeft=grass",
    "TopRight=grass",
    "BottomRight=grass",
    "BottomLeft=grass",
    "Top=road",
    "[TILE1]",
    `Model=${model}`,
    "TopLeft=missing-terrain",
    "TopRight=grass",
    "BottomRight=grass",
    "BottomLeft=grass",
    "[TILE2]",
    "Model=resolved_model",
    "TopLeft=grass",
    "TopRight=grass",
    "BottomRight=grass",
    "BottomLeft=grass",
    "[GROUPS]",
    "Count=1",
    "[GROUP0]",
    "Name=One",
    "Rows=1",
    "Columns=1",
    "Tile0=0",
    "",
  ].join("\n");
}

function betaSet() {
  return [
    "[GENERAL]",
    "Name=Beta",
    "[TERRAIN TYPES]",
    "Count=1",
    "[TERRAIN0]",
    "Name=stone",
    "[TILE0]",
    "Model=other_missing",
    "TopLeft=stone",
    "TopRight=stone",
    "BottomRight=stone",
    "BottomLeft=stone",
    "",
  ].join("\n");
}

function inventoryRows(model = "ghost_model") {
  return [
    {
      tilesetResRef: "beta",
      tileId: 0,
      modelResRef: "other_missing",
      modelStatus: "source_missing",
      modelSourceLayer: "",
      modelSource: "",
      groupIds: [],
    },
    {
      tilesetResRef: "alpha",
      tileId: 2,
      modelResRef: "resolved_model",
      modelStatus: "source_resolved",
      modelSourceLayer: "hak",
      modelSource: "fixture.hak",
      groupIds: [],
    },
    {
      tilesetResRef: "alpha",
      tileId: 1,
      modelResRef: model,
      modelStatus: "source_missing",
      modelSourceLayer: "",
      modelSource: "",
      groupIds: [],
    },
    {
      tilesetResRef: "alpha",
      tileId: 0,
      modelResRef: model,
      modelStatus: "source_missing",
      modelSourceLayer: "",
      modelSource: "",
      groupIds: ["group0"],
    },
  ];
}

try {
  const sourceRoot = path.join(fixtureRoot, "source");
  write(path.join(sourceRoot, "alpha.set"), alphaSet());
  write(path.join(sourceRoot, "beta.set"), betaSet());
  const corpus = loadSelectedAreaTilesetCorpus(sourceRoot);
  const inventory = inventoryRows();
  const queue = buildAreaTileSourceRemediationQueue({ corpus, inventoryRows: inventory });

  assert.equal(queue.schema, "aurora-area-tile-source-remediation-queue/v1");
  assert.deepEqual(queue.summary, {
    selectedTilesetCount: 2,
    selectedTileRowCount: 4,
    sourceMissingRowCount: 3,
    uniqueMissingModelCount: 2,
    affectedTilesetCount: 2,
    groupedMissingRowCount: 1,
    standaloneMissingRowCount: 2,
    allCornerTerrainsDeclaredMissingRowCount: 2,
    containsUndeclaredCornerTerrainMissingRowCount: 1,
    allEdgeCrossersDeclaredMissingRowCount: 3,
    containsUndeclaredEdgeCrosserMissingRowCount: 0,
  });
  assert.deepEqual(queue.rows.map((row) => row.rowId), ["alpha:0", "alpha:1", "beta:0"]);
  assert.deepEqual(queue.rows[0].groupIds, ["group0"]);
  assert.equal(queue.rows[0].topologyCohort, "all_corner_terrains_declared");
  assert.equal(queue.rows[1].topologyCohort, "contains_undeclared_corner_terrain");
  assert.deepEqual(queue.rows[1].undeclaredCornerTerrains, ["missing-terrain"]);
  assert.equal(queue.rows.every((row) => row.disposition === "blocked"), true);
  assert.equal(
    queue.rows.every((row) => row.requiredClosure === "exact_source_or_accepted_row_bound_native_evidence"),
    true,
  );
  assert.deepEqual(queue.modelBatches.map((batch) => batch.modelResRef), [
    "ghost_model",
    "other_missing",
  ]);
  assert.deepEqual(queue.modelBatches[0].rowIds, ["alpha:0", "alpha:1"]);

  const reordered = buildAreaTileSourceRemediationQueue({
    corpus,
    inventoryRows: [...inventory].reverse(),
  });
  assert.equal(reordered.queueIdentitySha256, queue.queueIdentitySha256);

  const renamedSourceRoot = path.join(fixtureRoot, "renamed-source");
  write(path.join(renamedSourceRoot, "alpha.set"), alphaSet("opaque_other"));
  write(path.join(renamedSourceRoot, "beta.set"), betaSet());
  const renamed = buildAreaTileSourceRemediationQueue({
    corpus: loadSelectedAreaTilesetCorpus(renamedSourceRoot),
    inventoryRows: inventoryRows("opaque_other"),
  });
  assert.deepEqual(
    renamed.rows.map(({ disposition, requiredClosure, topologyCohort }) => ({
      disposition,
      requiredClosure,
      topologyCohort,
    })),
    queue.rows.map(({ disposition, requiredClosure, topologyCohort }) => ({
      disposition,
      requiredClosure,
      topologyCohort,
    })),
  );

  assert.throws(
    () => buildAreaTileSourceRemediationQueue({ corpus, inventoryRows: inventory.slice(1) }),
    /membership mismatch/u,
  );
  assert.throws(
    () => buildAreaTileSourceRemediationQueue({
      corpus,
      inventoryRows: inventory.map((row) =>
        row.tilesetResRef === "alpha" && row.tileId === 1
          ? { ...row, modelResRef: "wrong_model" }
          : row),
    }),
    /model declaration mismatch/u,
  );
  assert.throws(
    () => buildAreaTileSourceRemediationQueue({
      corpus,
      inventoryRows: [...inventory, inventory[0]],
    }),
    /duplicate inventory row/u,
  );

  const inventoryPath = path.join(fixtureRoot, "inventory.json");
  const inventoryBytes = `${JSON.stringify(inventory, null, 2)}\n`;
  write(inventoryPath, inventoryBytes);
  const outputPath = path.join(fixtureRoot, "queue.json");
  const cli = spawnSync(process.execPath, [
    cliPath,
    "--source-root", sourceRoot,
    "--inventory", inventoryPath,
    "--inventory-sha256", sha256(inventoryBytes),
    "--generated-at", "2026-09-02T00:00:00.000Z",
    "--output", outputPath,
  ], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr || cli.stdout);
  const cliResult = JSON.parse(cli.stdout);
  const emitted = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  assert.equal(cliResult.schema, "aurora-area-tile-source-remediation-queue-result/v1");
  assert.equal(emitted.generatedAt, "2026-09-02T00:00:00.000Z");
  assert.equal(emitted.inventory.sha256, sha256(inventoryBytes));
  assert.equal(emitted.queue.queueIdentitySha256, queue.queueIdentitySha256);

  const badHash = spawnSync(process.execPath, [
    cliPath,
    "--source-root", sourceRoot,
    "--inventory", inventoryPath,
    "--inventory-sha256", "0".repeat(64),
    "--generated-at", "2026-09-02T00:00:00.000Z",
    "--output", path.join(fixtureRoot, "bad-hash.json"),
  ], { cwd: repoRoot, encoding: "utf8" });
  assert.notEqual(badHash.status, 0);
  assert.match(badHash.stderr, /SHA-256 mismatch/u);

  const overwrite = spawnSync(process.execPath, [
    cliPath,
    "--source-root", sourceRoot,
    "--inventory", inventoryPath,
    "--inventory-sha256", sha256(inventoryBytes),
    "--generated-at", "2026-09-02T00:00:00.000Z",
    "--output", outputPath,
  ], { cwd: repoRoot, encoding: "utf8" });
  assert.notEqual(overwrite.status, 0);
  assert.match(overwrite.stderr, /already exists/u);

  process.stdout.write("Area tile source remediation queue: PASS\n");
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}
