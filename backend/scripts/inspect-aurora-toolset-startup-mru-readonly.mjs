#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const options = parseArgs(process.argv.slice(2));
const modulePath = resolve(required(options.modulePath, "--modulePath"));
const iniPath = resolve(options.iniPath ?? `${process.env.USERPROFILE ?? ""}\\Documents\\Neverwinter Nights\\nwtoolset.ini`);
if (!existsSync(modulePath)) throw new Error(`startup_mru_target_module_missing:${modulePath}`);
if (!existsSync(iniPath)) throw new Error(`startup_mru_ini_missing:${iniPath}`);
const lines = readFileSync(iniPath).toString("latin1").split(/\r?\n/u);
const raw = lines.find((line) => /^MRU0=/iu.test(line))?.slice(5).trim() ?? "";
const mru0 = normalize(raw);
const target = normalize(modulePath);
console.log(JSON.stringify({
  ok: true, command: "inspect-aurora-toolset-startup-mru-readonly", iniPath, modulePath,
  expectedModule: basename(modulePath), currentMru0: raw || null, currentMru0Normalized: mru0 || null,
  targetNormalized: target, exactTarget: Boolean(mru0 && mru0 === target),
  safety: { readOnly: true, startsToolset: false, startsNwn: false, usesGlobalInput: false, changesIniOrMru: false },
}, null, 2));
function parseArgs(argv){const result={};for(let i=0;i<argv.length;i+=2){const key=argv[i],value=argv[i+1];if(!key?.startsWith("--")||value===undefined||value.startsWith("--"))throw new Error(`invalid:${key??"end"}`);result[key.slice(2)]=value;}return result;}
function required(value,name){const text=String(value??"").trim();if(!text)throw new Error(`missing:${name}`);return text;}
function normalize(value){const text=String(value??"").trim().replace(/^"|"$/gu,"");return text?resolve(text).replaceAll("/","\\").toLowerCase():"";}
