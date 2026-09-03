#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const summaryPath=resolve(process.argv[2]??"backend/docs/aurora-reverse/evidence/object-selection-adjust-location-live-standard-2026-07-14/summary.json");
const root=dirname(summaryPath),failures=[];
const summary=readJson(summaryPath,"summary_missing");
check(summary?.status==="verified","summary_not_verified");
check(summary?.acceptedFunctions?.includes("AUR-S02-01"),"selection_not_accepted");
check(summary?.acceptedFunctions?.includes("AUR-S02-03"),"adjust_location_not_accepted");
check(summary?.session?.processCountAfterClose===0,"toolset_not_closed");
check(summary?.session?.usesGlobalCursor===false&&summary?.session?.usesGlobalKeyboard===false&&summary?.session?.usesGlobalMouse===false,"global_input_used");
check(summary?.module?.sourceSha256Before===summary?.module?.sourceSha256After,"source_hash_changed");
check(summary?.selection?.objectsButton?.checkedAfter===true&&summary?.selection?.terrainButton?.checkedAfter===false,"select_objects_state_not_proven");
check(summary?.adjustLocation?.exactRollback===true,"exact_rollback_not_claimed");
check(summary?.adjustLocation?.typedRollbackPersisted===false,"precision_negative_case_missing");

for(const key of["selectedScene","selectedProperties","adjustLocationBaseline","adjustLocationMutation","mutationApplied","rollbackValues","rollbackFinal"]){
  const path=artifact(key);check(path&&existsSync(path)&&statSync(path).size>1024,`artifact_missing_or_small:${key}`);
}
const baselineObjects=artifact("baselineObjects"),mutatedObjects=artifact("mutatedObjects"),undoObjects=artifact("undoObjects");
for(const [name,path] of Object.entries({baselineObjects,mutatedObjects,undoObjects}))check(path&&existsSync(path),`artifact_missing:${name}`);
if(baselineObjects&&undoObjects&&existsSync(baselineObjects)&&existsSync(undoObjects))check(readFileSync(baselineObjects,"utf8")===readFileSync(undoObjects,"utf8"),"objects_csv_not_exactly_rolled_back");

const baselineRows=baselineObjects&&existsSync(baselineObjects)?parseCsv(readFileSync(baselineObjects,"utf8")):[];
const mutatedRows=mutatedObjects&&existsSync(mutatedObjects)?parseCsv(readFileSync(mutatedObjects,"utf8")):[];
const undoRows=undoObjects&&existsSync(undoObjects)?parseCsv(readFileSync(undoObjects,"utf8")):[];
check(hasTarget(baselineRows,60.9686,27.1816,0),"baseline_target_missing");
check(hasTarget(mutatedRows,61.47,27.18,0.25),"mutated_target_missing");
check(hasTarget(undoRows,60.9686,27.1816,0),"undo_target_missing");
check(baselineRows.length===mutatedRows.length&&baselineRows.length===undoRows.length,"object_count_changed");

const baselineGit=readJson(artifact("baselineGit"),"baseline_git_missing"),mutatedGit=readJson(artifact("mutatedGit"),"mutated_git_missing"),undoGit=readJson(artifact("undoGit"),"undo_git_missing");
const baselineSha=baselineGit?.source?.sha256,mutatedSha=mutatedGit?.source?.sha256,undoSha=undoGit?.source?.sha256;
check(Boolean(baselineSha)&&baselineSha===undoSha,"git_payload_not_exactly_rolled_back");
check(Boolean(mutatedSha)&&mutatedSha!==baselineSha,"git_payload_did_not_change");
check(summary?.gitPayload?.baselineSha256===baselineSha&&summary?.gitPayload?.mutatedSha256===mutatedSha&&summary?.gitPayload?.undoSha256===undoSha,"summary_git_hash_mismatch");

const result={ok:failures.length===0,status:failures.length===0?"verified":"failed",summaryPath,checks:{baselineObjectCount:baselineRows.length,mutatedObjectCount:mutatedRows.length,undoObjectCount:undoRows.length,baselineGitSha256:baselineSha,mutatedGitSha256:mutatedSha,undoGitSha256:undoSha,baselineObjectsSha256:fileHash(baselineObjects),undoObjectsSha256:fileHash(undoObjects)},failureCount:failures.length,failures};
if(process.argv[3])writeFileSync(resolve(process.argv[3]),`${JSON.stringify(result,null,2)}\n`,"utf8");
console.log(JSON.stringify(result,null,2));if(failures.length)process.exitCode=2;

function artifact(key){const value=summary?.artifacts?.[key];return value?resolve(root,value):null;}
function readJson(path,code){if(!path||!existsSync(path)){failures.push(code);return null}try{return JSON.parse(readFileSync(path,"utf8"))}catch{failures.push(`${code}:invalid_json`);return null}}
function check(value,code){if(!value)failures.push(code)}
function hasTarget(rows,x,y,z){return rows.some(row=>row.kind==="creature"&&row.templateResRef==="nw_dwarfmerc001"&&row.tag==="NW_DWARFMERC001"&&near(row.x,x)&&near(row.y,y)&&near(row.z,z));}
function near(value,expected){return Math.abs(Number(value)-expected)<1e-5;}
function fileHash(path){return path&&existsSync(path)?createHash("sha256").update(readFileSync(path)).digest("hex"):null;}
function parseCsv(text){const lines=text.trim().split(/\r?\n/u);if(lines.length<2)return[];const headers=csvLine(lines[0]);return lines.slice(1).map(line=>{const values=csvLine(line),row={};headers.forEach((key,index)=>row[key]=values[index]??"");return row});}
function csvLine(line){const values=[];let value="",quoted=false;for(let i=0;i<line.length;i++){const char=line[i];if(char==='"'){if(quoted&&line[i+1]==='"'){value+='"';i++}else quoted=!quoted}else if(char===','&&!quoted){values.push(value);value=""}else value+=char}values.push(value);return values;}
