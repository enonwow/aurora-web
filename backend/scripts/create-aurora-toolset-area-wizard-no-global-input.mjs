#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const options = parseArgs(process.argv.slice(2));
const moduleName = required(options.module, "--module");
const tileset = required(options.tileset ?? "MicroSet", "--tileset");
const size = required(options.size ?? "Tiny", "--size");
const out = options.out ? resolve(options.out) : null;
const here = dirname(fileURLToPath(import.meta.url));
const args = [resolve(here, "probe-aurora-toolset-area-wizard-atomic-no-global-input.mjs"), "--module", moduleName, "--itemPosition", "0", "--expectedId", "133", "--expectedClass", "TdlgAreaWizard", "--advanceToPage3", "true", "--tileset", tileset, "--size", size, "--finish", "true"];
if (out) args.push("--out", out);
const result = JSON.parse(execFileSync(process.execPath, args, { encoding: "utf8", windowsHide: true, timeout: 45_000, maxBuffer: 8 * 1024 * 1024 }).trim());
if (result?.ok !== true || result?.wizard?.closedWith !== "Finish" || result?.final?.moduleDirty !== true) throw new Error("area_wizard_finish_not_verified");
console.log(JSON.stringify(result, null, 2));

function parseArgs(argv){const result={};for(let i=0;i<argv.length;i+=2){const key=argv[i],value=argv[i+1];if(!key?.startsWith("--")||value===undefined)throw new Error(`Expected --name <value> near ${key??"end"}.`);result[key.slice(2)]=value;}return result;}
function required(value,name){const text=String(value??"").trim();if(!text)throw new Error(`${name} is required.`);return text;}
