#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { deriveSourceGridCalibratedYaw } from "./lib/aurora-world-grid-yaw.mjs";

const options = parseArgs(process.argv.slice(2));
const samplesPath = resolve(requiredText(options.samples, "--samples"));
if (!existsSync(samplesPath)) throw new Error(`--samples does not exist: ${samplesPath}`);
const output = resolve(requiredText(options.out, "--out"));
const source = JSON.parse(readFileSync(samplesPath, "utf8"));
const result = deriveSourceGridCalibratedYaw({ samples: source.samples ?? source, toleranceDegrees: options.toleranceDegrees === undefined ? undefined : Number(options.toleranceDegrees) });
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: result.status, yawDegrees: result.yawDegrees ?? null, blockerCode: result.blockerCode ?? null, out: output }, null, 2));

function parseArgs(argv) { const result = {}; for (let i = 0; i < argv.length; i += 1) { const key = argv[i]; const value = argv[i + 1]; if (!key.startsWith("--") || value === undefined || value.startsWith("--")) throw new Error(`Invalid argument near ${key}.`); result[key.slice(2)] = value; i += 1; } return result; }
function requiredText(value, name) { const text = String(value ?? "").trim(); if (!text) throw new Error(`${name} is required.`); return text; }
