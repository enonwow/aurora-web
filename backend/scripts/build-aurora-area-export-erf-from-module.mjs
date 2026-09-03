#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const generatorPath = resolve(scriptDir, "create-last-city-apartment-area.mjs");
const options = parseArgs(process.argv.slice(2));
const modulePath = resolve(required(options.module, "--module"));
const area = required(options.area, "--area").toLowerCase();
const outputPath = resolve(required(options.output, "--output"));
const RESOURCE_TYPES = { are: 2012, git: 2023, gic: 2046 };

const source = readFileSync(generatorPath, "utf8");
const readErfEntries = extractFunction(source, "readErfEntries", "buildErfV10FromEntries");
const buildErfV10FromEntries = extractFunction(source, "buildErfV10FromEntries", "parseGff");
const moduleBytes = readFileSync(modulePath);
const moduleErf = readErfEntries(moduleBytes, modulePath);
const entries = Object.entries(RESOURCE_TYPES).map(([extension, type]) => {
  const entry = moduleErf.entries.find((candidate) => candidate.resref === area && candidate.type === type);
  if (!entry) throw new Error(`module_area_resource_missing:${area}.${extension}`);
  return { resref: area, type, bytes: entry.bytes };
});
const rawResources = entries.map((entry) => {
  const extension = Object.entries(RESOURCE_TYPES).find(([, type]) => type === entry.type)?.[0];
  const path = resolve(dirname(outputPath), `${area}.${extension}`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, entry.bytes);
  return summarize(path, entry.bytes);
});
const header = Buffer.from(moduleErf.header);
header.write("ERF ", 0, 4, "ascii");
header.write("V1.0", 4, 4, "ascii");
header.writeUInt32LE(0, 8);
header.writeUInt32LE(0, 12);
const output = buildErfV10FromEntries(header, Buffer.alloc(0), entries);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, output);

const verified = readErfEntries(readFileSync(outputPath), outputPath);
const signature = output.toString("ascii", 0, 4);
const version = output.toString("ascii", 4, 8);
if (signature !== "ERF " || version !== "V1.0" || verified.entries.length !== 3) {
  throw new Error("area_export_verification_failed");
}
const result = {
  ok: true,
  sourceModule: summarize(modulePath, moduleBytes),
  area,
  output: summarize(outputPath, output),
  signature,
  version,
  rawResources,
  entries: verified.entries.map((entry) => ({
    resref: entry.resref,
    type: entry.type,
    bytes: entry.bytes.length,
    sha256: createHash("sha256").update(entry.bytes).digest("hex"),
  })),
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

function extractFunction(text, name, nextName) {
  const start = text.indexOf(`function ${name}`);
  const end = text.indexOf(`function ${nextName}`, start);
  if (start < 0 || end <= start) throw new Error(`generator_function_missing:${name}`);
  return Function(`${text.slice(start, end)}\nreturn ${name};`)();
}
function summarize(path, bytes) {
  return { path, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
}
function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!args[i]?.startsWith("--") || args[i + 1] == null) throw new Error(`invalid_argument:${args[i] ?? "end"}`);
    result[args[i].slice(2)] = args[i + 1];
  }
  return result;
}
function required(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${name} is required`);
  return text;
}
