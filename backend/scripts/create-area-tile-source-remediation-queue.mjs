#!/usr/bin/env node

import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadSelectedAreaTilesetCorpus } from "./lib/area-tileset-source-corpus.mjs";
import { buildAreaTileSourceRemediationQueue } from "./lib/area-tile-source-remediation-queue.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..", "..");
const SHA256 = /^[a-f0-9]{64}$/u;
const MAX_INVENTORY_BYTES = 256 * 1024 * 1024;

function parseArguments(argv) {
  if (argv.length % 2 !== 0) throw new Error("Arguments must be exact --name value pairs.");
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined || result[key.slice(2)] !== undefined) {
      throw new Error(`Invalid or duplicate argument ${key ?? "<missing>"}.`);
    }
    result[key.slice(2)] = value;
  }
  for (const required of ["source-root", "inventory", "inventory-sha256", "generated-at", "output"]) {
    if (typeof result[required] !== "string" || !result[required].trim()) {
      throw new Error(`--${required} is required.`);
    }
  }
  const generatedAt = result["generated-at"].trim();
  if (!Number.isFinite(Date.parse(generatedAt)) || new Date(generatedAt).toISOString() !== generatedAt) {
    throw new Error("--generated-at must be a canonical UTC ISO-8601 timestamp.");
  }
  const inventorySha256 = result["inventory-sha256"].trim().toLowerCase();
  if (!SHA256.test(inventorySha256)) {
    throw new Error("--inventory-sha256 must be an exact lowercase SHA-256.");
  }
  return {
    sourceRoot: path.resolve(process.cwd(), result["source-root"]),
    inventory: path.resolve(process.cwd(), result.inventory),
    inventorySha256,
    generatedAt,
    output: path.resolve(process.cwd(), result.output),
  };
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function displayPath(filePath) {
  const relative = path.relative(repoRoot, path.resolve(filePath));
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative)
    ? relative.replaceAll("\\", "/")
    : path.resolve(filePath).replaceAll("\\", "/");
}

function readInventory(filePath, expectedSha256) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`Inventory is missing: ${filePath}`);
  }
  const bytes = fs.readFileSync(filePath);
  if (bytes.byteLength < 2 || bytes.byteLength > MAX_INVENTORY_BYTES) {
    throw new Error("Inventory byte budget is invalid.");
  }
  const observedSha256 = sha256(bytes);
  if (observedSha256 !== expectedSha256) {
    throw new Error(`Inventory SHA-256 mismatch: expected ${expectedSha256}, observed ${observedSha256}.`);
  }
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("Inventory JSON is invalid.");
  }
  if (!Array.isArray(value)) throw new Error("Inventory must be one JSON row array.");
  return { value, bytes: bytes.byteLength };
}

function writeJsonAtomic(filePath, value) {
  if (fs.existsSync(filePath)) throw new Error(`Immutable output already exists: ${filePath}`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`,
  );
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
  let descriptor = null;
  try {
    descriptor = fs.openSync(temporaryPath, "wx");
    fs.writeFileSync(descriptor, bytes);
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = null;
    fs.renameSync(temporaryPath, filePath);
  } finally {
    if (descriptor !== null) fs.closeSync(descriptor);
    if (fs.existsSync(temporaryPath)) fs.rmSync(temporaryPath, { force: true });
  }
  return { bytes: bytes.byteLength, sha256: sha256(bytes) };
}

function main() {
  const args = parseArguments(process.argv.slice(2));
  if (fs.existsSync(args.output)) throw new Error(`Immutable output already exists: ${args.output}`);
  const inventory = readInventory(args.inventory, args.inventorySha256);
  const corpus = loadSelectedAreaTilesetCorpus(args.sourceRoot);
  const queue = buildAreaTileSourceRemediationQueue({
    corpus,
    inventoryRows: inventory.value,
  });
  const artifact = {
    schema: "aurora-area-tile-source-remediation-queue-artifact/v1",
    generatedAt: args.generatedAt,
    sourceRoot: displayPath(args.sourceRoot),
    inventory: {
      path: displayPath(args.inventory),
      sha256: args.inventorySha256,
      bytes: inventory.bytes,
      rowCount: inventory.value.length,
    },
    queue,
  };
  const written = writeJsonAtomic(args.output, artifact);
  process.stdout.write(`${JSON.stringify({
    schema: "aurora-area-tile-source-remediation-queue-result/v1",
    output: {
      path: args.output,
      ...written,
    },
    queueIdentitySha256: queue.queueIdentitySha256,
    summary: queue.summary,
  }, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${String(error?.message ?? error)}\n`);
  process.exitCode = 1;
}
