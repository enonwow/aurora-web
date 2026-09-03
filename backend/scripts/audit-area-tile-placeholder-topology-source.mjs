#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { loadSelectedAreaTilesetCorpus } from "./lib/area-tileset-source-corpus.mjs";
import {
  buildAreaTilePlaceholderTopologySourceAudit
} from "./lib/area-tile-placeholder-topology-source-audit.mjs";

const SHA256 = /^[a-f0-9]{64}$/u;

function parseArgs(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value || value.startsWith("--") || values.has(key)) {
      throw new Error(`Invalid or duplicate argument ${key ?? "<missing>"}.`);
    }
    values.set(key, value);
  }
  return values;
}

function requiredArg(args, name) {
  const value = args.get(name)?.trim();
  if (!value) throw new Error(`${name} <value> is required.`);
  return value;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

try {
  const args = parseArgs(process.argv.slice(2));
  const sourceRoot = path.resolve(requiredArg(args, "--source-root"));
  const inventoryPath = path.resolve(requiredArg(args, "--inventory"));
  const expectedInventorySha256 = requiredArg(args, "--inventory-sha256").toLowerCase();
  const outPath = path.resolve(requiredArg(args, "--out"));
  const generatedAt = requiredArg(args, "--generated-at");
  if (!SHA256.test(expectedInventorySha256)) {
    throw new Error("Inventory SHA-256 must be exact and lowercase.");
  }
  if (new Date(generatedAt).toISOString() !== generatedAt) {
    throw new Error("--generated-at must be a canonical ISO timestamp.");
  }
  if (!fs.existsSync(inventoryPath) || !fs.statSync(inventoryPath).isFile()) {
    throw new Error(`Inventory is missing: ${inventoryPath}.`);
  }
  const inventoryBytes = fs.readFileSync(inventoryPath);
  const inventorySha256 = sha256(inventoryBytes);
  if (inventorySha256 !== expectedInventorySha256) {
    throw new Error(
      `Inventory SHA-256 mismatch: expected ${expectedInventorySha256}, observed ${inventorySha256}.`
    );
  }
  const inventoryRows = JSON.parse(inventoryBytes.toString("utf8").replace(/^\uFEFF/u, ""));
  if (!Array.isArray(inventoryRows)) throw new Error("Inventory must be a JSON array.");
  const corpus = loadSelectedAreaTilesetCorpus(sourceRoot);
  const audit = buildAreaTilePlaceholderTopologySourceAudit({ corpus, inventoryRows });
  const output = {
    ...audit,
    generatedAt,
    inputs: {
      sourceRoot: corpus.sourceRoot.replaceAll("\\", "/"),
      selectedSetCount: corpus.selectedTilesets.length,
      selectedSetIdentitySha256: audit.corpusIdentitySha256,
      inventoryPath: inventoryPath.replaceAll("\\", "/"),
      inventoryBytes: inventoryBytes.length,
      inventorySha256
    },
    verdict: {
      status: "structural_correlation_only",
      certifiedPlaceholderExclusionCount: 0,
      note: "Undeclared topology is source structure, not by itself a native visibility or exclusion verdict."
    }
  };
  if (fs.existsSync(outPath)) throw new Error(`Output already exists: ${outPath}.`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, { flag: "wx" });
  process.stdout.write(`${JSON.stringify({
    output: outPath,
    outputSha256: sha256(fs.readFileSync(outPath)),
    summary: output.summary,
    verdict: output.verdict
  }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 2;
}
