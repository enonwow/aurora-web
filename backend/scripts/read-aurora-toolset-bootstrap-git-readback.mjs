#!/usr/bin/env node
// Reads the GIT written by the native Toolset save.  It has no UI or process side effects.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "CommonJS", moduleResolution: "node" });
require("ts-node/register/transpile-only");
const { readNwnErfResourceIndex, readNwnErfResourceFromIndex } = require("../src/modules/runtime-settings/adapters/outbound/nwn/nwn-erf-packed-module-extractor.service");
const { parseAreaObjectsFromGitGff } = require("../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser");

const options = parseArgs(process.argv.slice(2));
const modulePath = requiredPath(options.module, "--module");
const area = requiredText(options.area, "--area").toLowerCase();
const index = await readNwnErfResourceIndex(modulePath);
if (!index) throw new Error("bootstrap_git_module_index_missing");
const bytes = await readNwnErfResourceFromIndex(modulePath, index, area, 2023);
if (!bytes) throw new Error(`bootstrap_git_resource_missing:${area}`);
const parsedObjects = parseAreaObjectsFromGitGff(bytes);
const creatureObjects = Array.isArray(parsedObjects)
  ? parsedObjects.filter((object) => object?.listKind === "creature")
  : Array.isArray(parsedObjects?.creatures)
    ? parsedObjects.creatures
    : null;
if (!creatureObjects) throw new Error("bootstrap_git_object_schema_invalid");
const objectKinds = ["placeables", "doors", "creatures", "encounters", "items", "sounds", "stores", "triggers", "waypoints"];
const objectLists = Object.fromEntries(objectKinds.map((kind) => {
  if (Array.isArray(parsedObjects)) {
    const singular = kind === "creatures" ? "creature" : kind.slice(0, -1);
    return [kind, parsedObjects.filter((object) => object?.listKind === singular)];
  }
  const list = parsedObjects?.[kind];
  if (!Array.isArray(list)) throw new Error(`bootstrap_git_object_schema_invalid:${kind}`);
  return [kind, list];
}));
const objectCounts = Object.fromEntries(objectKinds.map((kind) => [kind, objectLists[kind].length]));
objectCounts.total = objectKinds.reduce((sum, kind) => sum + objectCounts[kind], 0);
const creatures = creatureObjects.map((object) => ({
  templateResRef: String(object.templateResRef ?? "").toLowerCase(), tag: object.tag ?? null,
  localizedName: object.localizedName ?? null, appearanceType: object.appearanceType ?? null,
  position: [object.x, object.y, object.z],
}));
const placeables = objectLists.placeables.map((object) => ({
  templateResRef: String(object.templateResRef ?? "").toLowerCase(),
  tag: object.tag ?? null,
  appearanceType: object.appearanceType ?? null,
  portraitId: object.placeablePortraitId?.present === true
    ? object.placeablePortraitId.value
    : null,
  position: [object.x, object.y, object.z],
  bearing: object.bearing,
}));
process.stdout.write(`${JSON.stringify({ version: "aurora-toolset-bootstrap-git-readback/v1", modulePath, moduleSha256: createHash("sha256").update(readFileSync(modulePath)).digest("hex"), area, gitSha256: createHash("sha256").update(bytes).digest("hex"), objectCounts, creatures, placeables }, null, 2)}\n`);

function parseArgs(argv) { const parsed = {}; for (let i = 0; i < argv.length; i += 2) { const key = argv[i], value = argv[i + 1]; if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) throw new Error(`invalid:${key ?? "end"}`); parsed[key.slice(2)] = value; } return parsed; }
function requiredPath(value, name) { if (!value) throw new Error(`missing:${name}`); return resolve(value); }
function requiredText(value, name) { const result = String(value ?? "").trim(); if (!result) throw new Error(`missing:${name}`); return result; }
