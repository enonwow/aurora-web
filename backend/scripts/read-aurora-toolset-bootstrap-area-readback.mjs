#!/usr/bin/env node
// Reads the saved ARE resource from a packed MOD. It has no UI or process side effects.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "CommonJS", moduleResolution: "node" });
require("ts-node/register/transpile-only");
const { readNwnErfResourceIndex, readNwnErfResourceFromIndex } = require("../src/modules/runtime-settings/adapters/outbound/nwn/nwn-erf-packed-module-extractor.service");
const { parseAreaMetadataFromAreGff } = require("../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser");

const options = parseArgs(process.argv.slice(2));
const modulePath = requiredPath(options.module, "--module");
const area = requiredText(options.area, "--area").toLowerCase();
const index = await readNwnErfResourceIndex(modulePath);
if (!index) throw new Error("bootstrap_area_module_index_missing");
const bytes = await readNwnErfResourceFromIndex(modulePath, index, area, 2012);
if (!bytes) throw new Error(`bootstrap_area_resource_missing:${area}`);
const metadata = parseAreaMetadataFromAreGff(bytes);
const width = Number(metadata.width), height = Number(metadata.height), tileCount = Array.isArray(metadata.tiles) ? metadata.tiles.length : NaN;
if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || !Number.isInteger(tileCount)) throw new Error("bootstrap_area_metadata_invalid");
const displayName = String(metadata.name ?? "").trim();
const tag = String(metadata.tag ?? "").trim();
const tileSet = String(metadata.tileSet ?? "").trim().toLowerCase();
const tiles = metadata.tiles.map((tile) => ({
  row: tile.row,
  col: tile.col,
  tileId: tile.tileId,
  orientation: tile.orientation,
  height: tile.height,
  mainLight1: tile.mainLight1,
  mainLight2: tile.mainLight2,
  sourceLight1: tile.sourceLight1,
  sourceLight2: tile.sourceLight2,
  animLoop1: tile.animLoop1,
  animLoop2: tile.animLoop2,
  animLoop3: tile.animLoop3,
}));
process.stdout.write(`${JSON.stringify({ version: "aurora-toolset-bootstrap-area-readback/v1", modulePath, moduleSha256: createHash("sha256").update(readFileSync(modulePath)).digest("hex"), area, areSha256: createHash("sha256").update(bytes).digest("hex"), displayName: displayName || null, tag: tag || null, tileSet: tileSet || null, width, height, tileCount, completeTileList: tileCount === width * height, tiles, dependencyFingerprint: metadata.dependencyFingerprint }, null, 2)}\n`);

function parseArgs(argv) { const parsed = {}; for (let i = 0; i < argv.length; i += 2) { const key = argv[i], value = argv[i + 1]; if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) throw new Error(`invalid:${key ?? "end"}`); parsed[key.slice(2)] = value; } return parsed; }
function requiredPath(value, name) { if (!value) throw new Error(`missing:${name}`); return resolve(value); }
function requiredText(value, name) { const result = String(value ?? "").trim(); if (!result) throw new Error(`missing:${name}`); return result; }
