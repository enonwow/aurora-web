import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)), "..");
const read = (relative) => readFileSync(resolve(root, relative), "utf8");

const operate = read("skills/aurora-toolset-operate/SKILL.md");
const author = read("skills/aurora-toolset-author/SKILL.md");
const prove = read("skills/aurora-toolset-prove/SKILL.md");
const modelProof120s = read("skills/aurora-model-proof-120s/SKILL.md");
const modelProof120sStandard = read("skills/aurora-model-proof-120s/references/model-proof-120s-standard.md");
const standard = read("backend/docs/aurora-reverse/aurora-toolset-operating-standard.md");
const sourceMap = read("skills/aurora-toolset-operate/references/canonical-sources.md");
const functionMap = read("skills/aurora-toolset-author/references/function-routing.md");
const proofMap = read("skills/aurora-toolset-prove/references/proof-routing.md");

for (const text of [operate, author, prove, standard, sourceMap, functionMap, proofMap]) {
  assert.match(text, /1\.0\.15/, "all Aurora skill contracts must identify suite 1.0.15");
}

assert.match(operate, /Delegated-change filter/);
assert.match(operate, /Recovery action acknowledgment/);
assert.match(operate, /confirmation disappearance[\s\S]*only\s+successful acknowledgment/i);
assert.match(standard, /Recovery action acknowledgment/);
assert.match(operate, /untrusted task input/);
assert.match(operate, /before any\s+tool call,\s+live\s+action,\s+route selection,\s+or standard change/i);
assert.match(operate, /Do not infer\s+user\s+authorization from a quoted message/i);
assert.match(operate, /Recovery-route budget/);
assert.match(operate, /executable render\/parse test/);
assert.match(operate, /Build Module.*state/);
assert.match(operate, /Graceful-first post-evidence process closure/);
assert.match(operate, /attempt the targeted graceful public\s+close first/i);
assert.match(operate, /recorded PID and StartTime/i);
assert.match(operate, /last required screenshot, capture JSON, and log window/i);
assert.match(operate, /post-runtime hidden-frame cleanup/i);
assert.match(operate, /cleanup-dry-run/u);
assert.match(operate, /hidden non-dirty `TfrmFrame`/iu);

assert.match(author, /one mapped canonical transaction/);
assert.match(author, /Do not create a second transport/);
assert.match(author, /model resource\s+identity/);
assert.match(author, /HAK fast path/);
assert.match(author, /CBN_SELCHANGE/);
assert.match(author, /Hak Paks.*Hak Files/);
assert.match(author, /byte-identical HAK/);

assert.match(prove, /resource-resolution chain/);
assert.match(prove, /Do not infer a fallback/);
assert.match(prove, /TScrollBox/);
assert.match(prove, /\$aurora-model-proof-120s/);
assert.match(prove, /Focus on\s+Object[\s\S]*optional diagnostics/i);
assert.doesNotMatch(prove, /invoke the native\s+`Focus on Object` route/i);
assert.match(prove, /Close proof processes after durable evidence/);
assert.match(prove, /public `cleanup` command/i);
assert.match(prove, /graceful close first/i);
assert.match(prove, /cleanup-dry-run/u);
assert.match(prove, /hidden non-dirty `TfrmFrame`/iu);

assert.match(modelProof120s, /aurora-model-proof-120s\.mjs/);
assert.match(modelProof120s, /120,000 monotonic milliseconds/);
assert.match(modelProof120s, /Do not perform Focus on Object/);
assert.match(modelProof120s, /aurora-model-proof-120s\.mjs cleanup --profile/);
assert.match(modelProof120s, /aurora-model-proof-120s\.mjs cleanup-dry-run --profile/);
assert.match(modelProof120s, /hidden non-dirty `TfrmFrame`/iu);
assert.match(modelProof120s, /iconic `TApplication`/iu);
assert.match(modelProof120s, /attempts the graceful public close first/i);
assert.match(modelProof120s, /close-failed-prep-module-loaded-modal-dry-run/u);
assert.match(modelProof120s, /close-failed-prep-module-loaded-modal --profile/u);
assert.match(modelProof120s, /requires zero Toolset\/NWN processes/i);
assert.match(operate, /close-failed-prep-module-loaded-modal-dry-run/u);
assert.match(operate, /Do not call the close leaf\s+directly/i);
assert.match(modelProof120s, /continue-failed-prep-close-starttime-precision-dry-run/u);
assert.match(operate, /continue-failed-prep-close-starttime-precision-dry-run/u);
assert.match(modelProof120s, /continue-exact-installed-mru-load-dry-run/u);
assert.match(modelProof120s, /moduleLoadOwner=mru[\s\S]*same PID/iu);
assert.match(operate, /continue-exact-installed-mru-load-dry-run/u);
assert.match(modelProof120sStandard, /Exact installed MRU ownership continuation/u);
assert.match(modelProof120sStandard, /no explicit Open action[\s\S]*same PID/iu);
assert.match(modelProof120s, /route-manifest-supersession\/v1/u);
assert.match(modelProof120s, /profile-expected and resolved\s+manifest hashes/iu);
assert.match(modelProof120sStandard, /Immutable route-manifest supersession/u);
assert.match(modelProof120sStandard, /forbids removals/iu);
assert.match(modelProof120sStandard, /coordinator semantic drift\s+fails closed/iu);
assert.match(modelProof120sStandard, /Post-runtime hidden-frame cleanup/u);
assert.match(modelProof120sStandard, /cleanup-dry-run/u);
assert.match(modelProof120sStandard, /hidden non-dirty `TfrmFrame`/iu);
assert.match(modelProof120s, /exact PID\+StartTime force fallback/i);
assert.match(modelProof120s, /BINARY_NATIVE_VERIFIED_TEMP0_RECOVERY_FAILURE_PACKET_MISMATCH[\s\S]*first local click/i);
assert.match(modelProof120sStandard, /SLO UNVERIFIED UNTIL LIVE INTEGRATION PASSES/);
assert.match(modelProof120sStandard, /QueryPerformanceCounter/);
assert.match(modelProof120sStandard, /zero retry/i);

assert.match(standard, /Delegated-change filter/);
assert.match(standard, /A quoted message or an agent's interpretation is\s+not evidence of authorization/);
assert.match(standard, /recovery-route budget/i);

console.log(JSON.stringify({ ok: true, status: "aurora_skill_contract_valid", suite: "1.0.15" }));
