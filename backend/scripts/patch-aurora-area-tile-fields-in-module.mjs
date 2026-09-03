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
const tileIndex = integer(options.tileIndex, "--tileIndex");
const set = parseJsonOption(options, "set");
const expect = options.expect || options.expectBase64 ? parseJsonOption(options, "expect") : {};
const backupPath = resolve(required(options.backup, "--backup"));
if (existsSync(backupPath)) throw new Error(`backup_destination_exists:${backupPath}`);

const FIELD_TYPE = { BYTE:0,CHAR:1,WORD:2,SHORT:3,DWORD:4,INT:5,FLOAT:8,CEXOSTRING:10,RESREF:11,CEXOLOCSTRING:12,VOID:13,STRUCT:14,LIST:15 };
const source = readFileSync(generatorPath, "utf8");
const readErfEntries = extractFunction(source, "readErfEntries", "buildErfV10FromEntries");
const buildErfV10FromEntries = extractFunction(source, "buildErfV10FromEntries", "parseGff");
const parseGff = extractFunction(source, "parseGff", "buildGff", FIELD_TYPE);
const buildGff = extractFunction(source, "buildGff", "deepClone", FIELD_TYPE);

const beforeBytes = readFileSync(modulePath);
const erf = readErfEntries(beforeBytes, modulePath);
const areEntry = erf.entries.find((entry) => entry.resref === area && entry.type === 2012);
if (!areEntry) throw new Error(`area_are_missing:${area}`);
const gff = parseGff(areEntry.bytes, `${area}.are`);
const tileList = field(gff.structs[0], "Tile_List");
if (!tileList || !Array.isArray(tileList.value) || tileIndex < 0 || tileIndex >= tileList.value.length) throw new Error(`tile_index_invalid:${tileIndex}`);
const tile = gff.structs[tileList.value[tileIndex]];
const before = {};
for (const [name, expected] of Object.entries(expect)) {
  const item = field(tile, name); if (!item) throw new Error(`tile_field_missing:${name}`);
  before[name] = item.value; if (item.value !== expected) throw new Error(`tile_field_expectation_failed:${name}:${item.value}:${expected}`);
}
for (const [name, value] of Object.entries(set)) {
  const item = field(tile, name); if (!item) throw new Error(`tile_field_missing:${name}`);
  if (!(name in before)) before[name] = item.value;
  item.value = value;
}
const nextAre = buildGff(gff);
let replaced = 0;
const entries = erf.entries.map((entry) => {
  if (entry.resref === area && entry.type === 2012) { replaced += 1; return { ...entry, bytes: nextAre }; }
  return entry;
});
if (replaced !== 1) throw new Error(`expected_one_are_replacement:${replaced}`);
const output = buildErfV10FromEntries(erf.header, erf.localizedStrings, entries);
copyFileSync(modulePath, backupPath);
writeFileSync(modulePath, output);

const verifyErf = readErfEntries(readFileSync(modulePath), modulePath);
const verifyGff = parseGff(verifyErf.entries.find((entry) => entry.resref === area && entry.type === 2012).bytes, `${area}.are`);
const verifyList = field(verifyGff.structs[0], "Tile_List").value;
const verifyTile = verifyGff.structs[verifyList[tileIndex]];
const after = Object.fromEntries(Object.keys(set).map((name) => [name, field(verifyTile, name)?.value]));
for (const [name, value] of Object.entries(set)) if (after[name] !== value) throw new Error(`tile_field_verification_failed:${name}`);
process.stdout.write(`${JSON.stringify({ok:true,module:modulePath,area,tileIndex,before,set,after,backup:backupPath,moduleSha256:hash(output)},null,2)}\n`);

function field(struct,name){return struct?.fields?.find((candidate)=>candidate.label===name);}
function hash(bytes){return createHash("sha256").update(bytes).digest("hex");}
function extractFunction(text,name,nextName,fieldType){const start=text.indexOf(`function ${name}`);const end=text.indexOf(`function ${nextName}`,start);if(start<0||end<=start)throw new Error(`generator_function_missing:${name}`);return fieldType?Function("FIELD_TYPE",`${text.slice(start,end)}\nreturn ${name};`)(fieldType):Function(`${text.slice(start,end)}\nreturn ${name};`)();}
function parseArgs(args){const out={};for(let i=0;i<args.length;i+=2){if(!args[i]?.startsWith("--")||args[i+1]==null)throw new Error(`invalid_argument:${args[i]??"end"}`);out[args[i].slice(2)]=args[i+1];}return out;}
function required(value,name){const text=String(value??"").trim();if(!text)throw new Error(`${name} is required`);return text;}
function integer(value,name){const parsed=Number(required(value,name));if(!Number.isInteger(parsed)||parsed<0)throw new Error(`${name} must be a non-negative integer`);return parsed;}
function parseJsonOption(values,name){
  const plain=values[name];
  const encoded=values[`${name}Base64`];
  if(plain&&encoded)throw new Error(`--${name} and --${name}Base64 are mutually exclusive`);
  const text=plain??(encoded?Buffer.from(encoded,"base64").toString("utf8"):undefined);
  const parsed=JSON.parse(required(text,`--${name} or --${name}Base64`));
  if(!parsed||Array.isArray(parsed)||typeof parsed!=="object")throw new Error(`--${name} must contain a JSON object`);
  return parsed;
}
