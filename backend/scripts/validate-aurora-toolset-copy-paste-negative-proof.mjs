#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const summaryPath = resolve(process.argv[2] ?? "backend/docs/aurora-reverse/evidence/copy-paste-live-standard-2026-07-14/summary.json");
const root = dirname(summaryPath);
const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
const failures = [];
const check = (value, code) => { if (!value) failures.push(code); };
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), "utf8").replace(/^\uFEFF/u, ""));
const sha256 = (path) => createHash("sha256").update(readFileSync(resolve(root, path))).digest("hex").toUpperCase();

for (const [key, path] of Object.entries(summary.artifacts ?? {})) {
  check(Boolean(path) && existsSync(resolve(root, path)), `artifact_missing:${key}`);
}

const exact = readJson(summary.artifacts.exactCopyAction);
const menu = readJson(summary.artifacts.menuAfterCopy);
const close = readJson(summary.artifacts.exactSessionClose);
const unsafe = readJson(summary.artifacts.unsafeCopyAction);
const baseline = readJson(summary.artifacts.baselineManifest);
const recovered = readJson(summary.artifacts.recoveredManifest);
const finalState = readJson(summary.artifacts.finalState);
const edit = menu.items.find((item) => item.text === "&Edit");
const paste = edit?.children?.find((item) => item.id === 61);
const exactFrame = exact.invocation?.visibleToolsetWindows?.find((window) => window.className === "TfrmFrame");
const unsafeFrame = unsafe.invocation?.visibleToolsetWindows?.find((window) => window.className === "TfrmFrame");

check(summary.verdict === "blocked" && summary.functionAccepted === false, "negative_verdict_invalid");
check(summary.blockerCode === "paste_disabled_after_exact_tree_copy", "blocker_code_invalid");
check(exact.invocation?.text === "C&opy" && exact.invocation?.id === 10 && exact.invocation?.position === 4, "exact_copy_identity_invalid");
check(exact.invocation?.method === "targeted popup item-center WM_LBUTTONDOWN/UP", "exact_copy_method_invalid");
check(exact.safety?.usesGlobalCursor === false && exact.safety?.usesGlobalKeyboard === false && exact.safety?.usesGlobalMouse === false, "global_input_used");
check(exactFrame && !exactFrame.text.endsWith("*"), "exact_copy_unexpected_mutation");
check(paste?.enabled === false, "expected_paste_disabled_not_observed");
check(close.phase === "closed" && close.closeResult?.close?.afterProcesses?.length === 0, "session_not_closed");
check(unsafe.invocation?.method.includes("HOME plus position+1 DOWN"), "unsafe_regression_method_missing");
check(unsafeFrame?.text.endsWith("*"), "unsafe_regression_dirty_state_missing");
check(baseline.parsed?.git?.counts?.creatures === 6 && baseline.parsed?.git?.counts?.total === 18, "baseline_counts_invalid");
check(recovered.parsed?.git?.counts?.creatures === 6 && recovered.parsed?.git?.counts?.total === 18, "recovered_counts_invalid");
check(sha256(summary.artifacts.baselineObjects) === summary.unsafeHelperRegression.baselineObjectsCsvSha256, "baseline_objects_hash_invalid");
check(sha256(summary.artifacts.recoveredObjects) === summary.unsafeHelperRegression.recoveredObjectsCsvSha256, "recovered_objects_hash_invalid");
check(summary.unsafeHelperRegression.baselineObjectsCsvSha256 !== summary.unsafeHelperRegression.recoveredObjectsCsvSha256, "negative_reordering_not_preserved");
check(summary.module.workingSha256AfterClose === summary.module.approvedSha256, "working_module_not_restored");
check(summary.module.sourceModuleMutated === false, "source_module_mutated");
check(finalState.toolsetProcessCount === 0, "final_toolset_process_count_nonzero");
check(finalState.workingModule?.sha256 === summary.module.approvedSha256, "final_working_hash_invalid");
check(finalState.backupModule?.sha256 === summary.module.approvedSha256, "final_backup_hash_invalid");
check(finalState.sourceModule?.sha256 === summary.module.sourceModuleSha256, "final_source_hash_invalid");

const result = {
  ok: failures.length === 0,
  validator: "aurora-toolset-copy-paste-negative-proof/v1",
  functionAccepted: false,
  acceptedSubresult: summary.acceptedSubresult,
  blockerCode: summary.blockerCode,
  failures,
  checkedAt: new Date().toISOString()
};
writeFileSync(resolve(root, "validator-result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
