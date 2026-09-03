#!/usr/bin/env node
/**
 * Builds an accepted source-grid-to-viewport projection only from prior,
 * verified source-targeted selection transactions.  It deliberately refuses
 * visual guesses, stale samples, and a mixed Area/module calibration.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fitAuroraSourceGridProjection } from "./lib/aurora-source-grid-projection.mjs";

const options = parseArgs(process.argv.slice(2));
const inputPaths = required(options.inputs, "--inputs").split(",").map((value) => resolve(value.trim()));
const moduleName = required(options.module, "--module");
const area = required(options.area, "--area").toLowerCase();
const samples = inputPaths.map((path) => ({ path, proof: readJson(path) }));

for (const { path, proof } of samples) {
  if (proof?.status !== "verified" || proof?.evidenceKind !== "source-targeted-visual-selection/v1") {
    throw codedError("source_grid_projection_sample_unverified", `Selection proof is not verified: ${path}`);
  }
  if (String(proof?.plan?.module ?? "") !== moduleName || String(proof?.plan?.area ?? "").toLowerCase() !== area) {
    throw codedError("source_grid_projection_context_mismatch", `Selection proof targets a different module or Area: ${path}`);
  }
}

const projection = fitAuroraSourceGridProjection({
  samples: samples.map(({ proof }) => proof),
  maxResidualPixels: options.maxResidualPixels === undefined ? 8 : finiteNumber(options.maxResidualPixels, "--maxResidualPixels"),
});
const result = {
  ...projection,
  module: moduleName,
  area,
  inputProofPaths: inputPaths,
  calibrationRule: "All samples are verified source-targeted visual selections from the exact same module, Area, and live viewport context. No visual estimate is promoted to a projection.",
};
const out = resolve(required(options.out, "--out"));
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: result.status === "estimated", out, result }, null, 2));
process.exitCode = result.status === "estimated" ? 0 : 2;

function readJson(path) { return JSON.parse(readFileSync(path, "utf8")); }
function parseArgs(argv) { const result = {}; for (let index = 0; index < argv.length; index += 2) { const key = argv[index], value = argv[index + 1]; if (!key?.startsWith("--") || value === undefined) throw new Error("Expected --key value arguments."); result[key.slice(2)] = value; } return result; }
function required(value, name) { const text = String(value ?? "").trim(); if (!text) throw new Error(`${name} is required.`); return text; }
function finiteNumber(value, name) { const number = Number(value); if (!Number.isFinite(number) || number < 0) throw new Error(`${name} must be a non-negative finite number.`); return number; }
function codedError(code, message) { const error = new Error(`${code}: ${message}`); error.code = code; return error; }
