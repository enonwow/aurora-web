#!/usr/bin/env node

import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "CommonJS", moduleResolution: "node" });
require("ts-node/register/transpile-only");
const { readNwnErfResourceIndex, readNwnErfResourceFromIndex, buildNwnErfResourceIndexKey } = require("../src/modules/runtime-settings/adapters/outbound/nwn/nwn-erf-packed-module-extractor.service");
const { parseAreaMetadataFromAreGff } = require("../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser");

const options = parseArgs(process.argv.slice(2));
const moduleArgument = options.module ?? options._?.[0];
const modulePath = resolve(moduleArgument ?? "");
if (!moduleArgument) throw new Error("Usage: node inspect-nwn-module-area-resources.mjs <module.mod> [--out result.json]");
const index = await readNwnErfResourceIndex(modulePath);
if (!index) throw new Error("packed_module_index_missing");
const areas = [];
for (const entry of index.values()) {
  if (entry.resourceType !== 2012) continue;
  const bytes = await readNwnErfResourceFromIndex(modulePath, index, entry.resref, 2012);
  const parsed = bytes ? parseAreaMetadataFromAreGff(bytes) : null;
  areas.push({
    resref: entry.resref,
    name: parsed?.name ?? null,
    tag: parsed?.tag ?? null,
    width: parsed?.width ?? null,
    height: parsed?.height ?? null,
    tileSet: parsed?.tileSet ?? null,
    tileCount: parsed?.tiles?.length ?? null,
    hasGit: index.has(buildNwnErfResourceIndexKey(entry.resref, 2023)),
    hasGic: index.has(buildNwnErfResourceIndexKey(entry.resref, 2046)),
    areBytes: entry.fileSize,
  });
}
areas.sort((left, right) => left.resref.localeCompare(right.resref));
const result = { ok: true, modulePath, areaCount: areas.length, areas };
if (options.out) {
  const outPath = resolve(options.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}
console.log(JSON.stringify(result, null, 2));

function parseArgs(argv) {
  const result = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) { result._.push(value); continue; }
    const next = argv[index + 1];
    if (next === undefined || next.startsWith("--")) throw new Error(`Expected value after ${value}.`);
    result[value.slice(2)] = next;
    index += 1;
  }
  return result;
}
