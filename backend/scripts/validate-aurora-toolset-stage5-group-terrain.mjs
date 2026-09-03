#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const options=parseArgs(process.argv.slice(2));
const sourceRoot=resolve(options.sourceRoot??"backend/docs/aurora-reverse/evidence/stage5-live-2026-07-16/s05-01-single-tile");
const outRoot=resolve(options.outRoot??"backend/docs/aurora-reverse/evidence/stage5-live-2026-07-16/s05-02-group-terrain");
const diff=read(resolve(sourceRoot,"area001-single-point-diff.json"));
const action=read(resolve(sourceRoot,"area001-water-single-point-action.json"));
const rollback=read(resolve(sourceRoot,"area001-final-rollback.json"));
const changes=[...(diff.changes??[])].sort((a,b)=>a.index-b.index);
const unchangedFields=["height","mainLight1","mainLight2","sourceLight1","sourceLight2","animLoop1","animLoop2","animLoop3"];
const checks={
 exactFourTileFootprint:diff.changedCount===4&&JSON.stringify(changes.map(x=>x.index))===JSON.stringify([27,28,35,36]),
 exactTwoByTwoCoordinates:JSON.stringify(changes.map(x=>[x.before.row,x.before.col]))===JSON.stringify([[3,3],[3,4],[4,3],[4,4]]),
 exactTerrainMutation:changes.every(x=>x.before.tileId===183&&x.after.tileId===57),
 exactOrientations:JSON.stringify(changes.map(x=>x.after.orientation))===JSON.stringify([1,2,0,3]),
 collateralFieldsStable:changes.every(x=>unchangedFields.every(field=>x.before[field]===x.after[field])),
 pointPaint:action.action?.selectedText==="Water"&&action.action?.viewport?.placementMode==="point"&&action.action?.viewport?.points?.length===1,
 noGlobalInput:["usesGlobalCursor","usesGlobalKeyboard","usesGlobalMouse"].every(key=>action.safety?.[key]===false),
 completeRollback:rollback.ok===true&&rollback.changedCount===0&&rollback.tileCount===64,
};
const failures=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
const result={ok:failures.length===0,stage:"AUR-S05-02",areaResref:"area001",footprint:{rows:[3,4],cols:[3,4],indices:[27,28,35,36]},checks,failures,sourceRoot,outRoot};
mkdirSync(outRoot,{recursive:true});writeFileSync(resolve(outRoot,"validation.json"),`${JSON.stringify(result,null,2)}\n`);console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;

function read(path){const b=readFileSync(path);let text;if(b[0]===0xff&&b[1]===0xfe)text=b.subarray(2).toString("utf16le");else text=b.toString("utf8").replace(/^\uFEFF/,"");return JSON.parse(text);}
function parseArgs(argv){const out={};for(let i=0;i<argv.length;i+=2){const k=argv[i],v=argv[i+1];if(!k?.startsWith("--")||v===undefined)throw new Error(`Expected --name <value> near ${k??"end"}.`);out[k.slice(2)]=v;}return out;}
