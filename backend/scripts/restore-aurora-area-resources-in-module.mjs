#!/usr/bin/env node
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const generatorPath = resolve(scriptDir, "create-last-city-apartment-area.mjs");
const options = parseArgs(process.argv.slice(2));
const modulePath = resolve(required(options.module, "--module"));
const area = required(options.area, "--area").toLowerCase();
const sourceDir = resolve(required(options.sourceDir, "--sourceDir"));
const backupPath = resolve(required(options.backup, "--backup"));
if (existsSync(backupPath)) throw new Error(`backup_destination_exists:${backupPath}`);

const RESOURCE_TYPES = { are: 2012, git: 2023, gic: 2046 };
const generator = readFileSync(generatorPath, "utf8");
const readErfEntries = extractFunction(generator, "readErfEntries", "buildErfV10FromEntries");
const buildErfV10FromEntries = extractFunction(generator, "buildErfV10FromEntries", "parseGff");
const beforeBytes = readFileSync(modulePath);
const erf = readErfEntries(beforeBytes, modulePath);
const replacements = new Map();
for (const [extension, type] of Object.entries(RESOURCE_TYPES)) {
  const path = resolve(sourceDir, `${area}.${extension}`);
  if (!existsSync(path)) throw new Error(`replacement_missing:${path}`);
  replacements.set(type, { path, bytes: readFileSync(path) });
}

let replaced = 0;
const nextEntries = erf.entries.map((entry) => {
  const replacement = entry.resref === area ? replacements.get(entry.type) : undefined;
  if (!replacement) return entry;
  replaced += 1;
  return { resref: entry.resref, type: entry.type, bytes: replacement.bytes };
});
if (replaced !== 3) throw new Error(`expected_three_area_resources:${replaced}`);
const output = buildErfV10FromEntries(erf.header, erf.localizedStrings, nextEntries);
copyFileSync(modulePath, backupPath);
writeFileSync(modulePath, output);

const verified = readErfEntries(readFileSync(modulePath), modulePath);
const resources = [];
for (const [extension, type] of Object.entries(RESOURCE_TYPES)) {
  const expected = replacements.get(type).bytes;
  const actual = verified.entries.find((entry) => entry.resref === area && entry.type === type)?.bytes;
  if (!actual || !actual.equals(expected)) throw new Error(`replacement_verification_failed:${area}.${extension}`);
  resources.push({ extension, type, bytes: actual.length, sha256: hash(actual) });
}
const result = {
  ok: true,
  module: modulePath,
  area,
  before: { bytes: beforeBytes.length, sha256: hash(beforeBytes) },
  recoveryBackup: { path: backupPath, bytes: beforeBytes.length, sha256: hash(beforeBytes) },
  after: { bytes: output.length, sha256: hash(output) },
  resources,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

function hash(bytes){return createHash("sha256").update(bytes).digest("hex");}
function extractFunction(text,name,nextName){const start=text.indexOf(`function ${name}`);const end=text.indexOf(`function ${nextName}`,start);if(start<0||end<=start)throw new Error(`generator_function_missing:${name}`);return Function(`${text.slice(start,end)}\nreturn ${name};`)();}
function parseArgs(args){const out={};for(let i=0;i<args.length;i+=2){if(!args[i]?.startsWith("--")||args[i+1]==null)throw new Error(`invalid_argument:${args[i]??"end"}`);out[args[i].slice(2)]=args[i+1];}return out;}
function required(value,name){const text=String(value??"").trim();if(!text)throw new Error(`${name} is required`);return text;}
