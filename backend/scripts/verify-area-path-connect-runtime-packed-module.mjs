#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { inspectPathConnectRuntimePackedModule } from "./lib/area-path-connect-runtime-packed-readback.mjs";

const options = parseArgs(process.argv.slice(2));
const modulePath = resolve(required(options.module, "--module"));
const outputPath = resolve(required(options.out, "--out"));
const report = {
  ...inspectPathConnectRuntimePackedModule(readFileSync(modulePath), {
    areaResref: required(options.area, "--area"),
    scriptResref: required(options.script, "--script"),
    expectedNormalizedSourceSha256: required(options.sourceSha256, "--sourceSha256"),
    expectedNcsSha256: required(options.ncsSha256, "--ncsSha256"),
  }),
  generatedAt: new Date().toISOString(),
  modulePath,
};
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: true, outputPath, status: report.status, module: report.module, area: report.area, script: report.script }, null, 2));

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index], value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) throw new Error(`invalid_argument:${key ?? "end"}`);
    result[key.slice(2)] = value;
  }
  return result;
}

function required(value, label) {
  const result = String(value ?? "").trim();
  if (!result) throw new Error(`missing:${label}`);
  return result;
}
