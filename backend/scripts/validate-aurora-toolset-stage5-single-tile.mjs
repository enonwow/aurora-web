#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const options=parseArgs(process.argv.slice(2));
const root=resolve(options.root??"backend/docs/aurora-reverse/evidence/stage5-live-2026-07-16/s05-01-single-tile");
const diff=read("area001-feature-1x1-diff.json"),persistence=read("area001-reopen-persistence.json"),rollback=read("area001-final-rollback.json"),action=read("area001-feature-1x1-action.json");
const change=diff.changes?.[0];
const checks={
 exactSingleTile:diff.changedCount===1&&diff.changes?.length===1,
 exactSourceIdentity:change?.index===35&&change?.before?.row===4&&change?.before?.col===3,
 exactTileMutation:change?.before?.tileId===183&&change?.after?.tileId===34,
 pointPaint:action.action?.selectedText==="Ground with grass patch"&&action.action?.viewport?.placementMode==="point"&&action.action?.viewport?.points?.length===1,
 noGlobalInput:["usesGlobalCursor","usesGlobalKeyboard","usesGlobalMouse"].every(key=>action.safety?.[key]===false),
 persistedAfterReopen:persistence.ok===true&&persistence.changedBetweenSaveAndReopen===0&&persistence.tileCount===64,
 exactRollback:rollback.ok===true&&rollback.changedCount===0&&rollback.tileCount===64,
 proofPacksExist:[diff.baseline,diff.after,persistence.saved,persistence.reopened,rollback.baseline,rollback.rollback].every(path=>typeof path==="string"&&existsSync(path)),
};
const failures=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
const result={ok:failures.length===0,stage:"AUR-S05-01",areaResref:"area001",checks,failures,evidenceRoot:root};
writeFileSync(resolve(root,"validation.json"),`${JSON.stringify(result,null,2)}\n`);
console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;

function read(name){const buffer=readFileSync(resolve(root,name));let text;if(buffer[0]===0xff&&buffer[1]===0xfe)text=buffer.subarray(2).toString("utf16le");else if(buffer[0]===0xfe&&buffer[1]===0xff){const swapped=Buffer.allocUnsafe(buffer.length-2);for(let i=2;i<buffer.length;i+=2){swapped[i-2]=buffer[i+1];swapped[i-1]=buffer[i];}text=swapped.toString("utf16le");}else text=buffer.toString("utf8").replace(/^\uFEFF/,"");return JSON.parse(text);}
function parseArgs(argv){const out={};for(let i=0;i<argv.length;i+=2){const k=argv[i],v=argv[i+1];if(!k?.startsWith("--")||v===undefined)throw new Error(`Expected --name <value> near ${k??"end"}.`);out[k.slice(2)]=v;}return out;}
