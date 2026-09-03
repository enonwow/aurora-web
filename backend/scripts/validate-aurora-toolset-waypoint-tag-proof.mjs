#!/usr/bin/env node
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root=resolve(process.argv[2]??"backend/docs/aurora-reverse/evidence/waypoint-tag-live-standard-2026-07-14");const failures=[];
const before=read("baseline/raw.git.summary.json"),after=read("after-save/raw.git.summary.json"),session=read("session-state.json"),summary=read("summary.json");
if(JSON.stringify(before?.counts)!==JSON.stringify(after?.counts))failures.push("object_counts_changed");
const b=before?.objects?.waypoints?.[0],a=after?.objects?.waypoints?.[0];
for(const key of ["templateResRef","x","y","z","bearing"]){if(b?.[key]!==a?.[key])failures.push(`waypoint_${key}_changed`)}
if(b?.tag!=="NW_WAYPOINT001")failures.push("baseline_tag_invalid");if(a?.tag!=="CODEX_WAYPOINT_PROOF")failures.push("saved_tag_invalid");
if((before?.objects?.waypoints??[]).length!==1||(after?.objects?.waypoints??[]).length!==1)failures.push("expected_one_waypoint");
for(const file of ["01-before-properties.png","03-new-tag-properties.png"]){const p=resolve(root,file);if(!existsSync(p)||statSync(p).size<1000)failures.push(`${file}:missing_or_too_small`)}
if(session?.phase!=="closed"||(session?.closeResult?.close?.afterProcesses??[]).length!==0)failures.push("session_not_cleanly_closed");
if(summary?.verdict!=="verified")failures.push("summary_verdict_invalid");
const result={ok:failures.length===0,status:failures.length===0?"verified":"failed",root,failureCount:failures.length,failures};writeFileSync(resolve(root,"validator-result.json"),`${JSON.stringify(result,null,2)}\n`);console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;
function read(rel){const p=resolve(root,rel);if(!existsSync(p)){failures.push(`${rel}:missing`);return null}try{return JSON.parse(readFileSync(p,"utf8"))}catch(e){failures.push(`${rel}:invalid_json:${e.message}`);return null}}
