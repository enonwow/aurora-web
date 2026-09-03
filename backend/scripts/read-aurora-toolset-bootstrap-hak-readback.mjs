#!/usr/bin/env node
// Reads the serialized ordered Mod_HakList. It has no UI or process side effects.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "CommonJS", moduleResolution: "node" });
require("ts-node/register/transpile-only");
const { readNwnErfResourceIndex, readNwnErfResourceFromIndex } = require("../src/modules/runtime-settings/adapters/outbound/nwn/nwn-erf-packed-module-extractor.service");
const { extractModuleIfoHakList } = require("../src/modules/runtime-settings/application/runtime-settings.application.service");

const options = parseArgs(process.argv.slice(2));
const modulePath = requiredPath(options.module, "--module");
const index = await readNwnErfResourceIndex(modulePath);
if (!index) throw new Error("bootstrap_hak_module_index_missing");
const ifo = await readNwnErfResourceFromIndex(modulePath, index, "module", 2014);
if (!ifo) throw new Error("bootstrap_hak_module_ifo_missing");
const orderedHakResrefs = extractModuleIfoHakList(ifo).map((value) => String(value).toLowerCase());
process.stdout.write(`${JSON.stringify({
  version: "aurora-toolset-bootstrap-hak-readback/v1",
  modulePath,
  moduleSha256: createHash("sha256").update(readFileSync(modulePath)).digest("hex"),
  orderedHakResrefs,
}, null, 2)}\n`);

function parseArgs(argv) { const parsed = {}; for (let index = 0; index < argv.length; index += 2) { const key = argv[index], value = argv[index + 1]; if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) throw new Error(`invalid:${key ?? "end"}`); parsed[key.slice(2)] = value; } return parsed; }
function requiredPath(value, name) { if (!value) throw new Error(`missing:${name}`); return resolve(value); }
