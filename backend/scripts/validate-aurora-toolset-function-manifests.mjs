#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const registryPath = resolve(process.argv[2] ?? "backend/docs/aurora-reverse/function-manifests/index.json");
const registry = JSON.parse(readFileSync(registryPath, "utf8"));
const failures = [];
const records = [];
const check = (value, code) => { if (!value) failures.push(code); };
const readJson = (path) => JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/u, ""));

check(registry.version === "aurora-toolset-function-manifest-registry/v1", "registry_version_invalid");
check(Array.isArray(registry.manifests) && registry.manifests.length > 0, "registry_empty");

for (const relativeManifest of registry.manifests ?? []) {
  const manifestPath = resolve(dirname(registryPath), relativeManifest);
  if (!existsSync(manifestPath)) {
    failures.push(`manifest_missing:${relativeManifest}`);
    continue;
  }
  const manifest = readJson(manifestPath);
  const prefix = `${manifest.functionId ?? relativeManifest}`;
  const localFailures = [];
  const localCheck = (value, code) => { if (!value) localFailures.push(code); };
  localCheck(manifest.version === "aurora-toolset-function-manifest/v1", "version_invalid");
  localCheck(/^AUR-S\d{2}-\d{2}$/.test(manifest.functionId ?? ""), "function_id_invalid");
  localCheck(["verified", "blocked", "failed", "missing"].includes(manifest.status), "status_invalid");
  localCheck(Boolean(manifest.profile) && Boolean(manifest.area), "scope_missing");
  localCheck(Boolean(manifest.target?.kind) && Boolean(manifest.target?.templateResRef), "target_identity_missing");
  localCheck(manifest.nativeAction?.globalInputUsed === false, "global_input_not_explicitly_false");
  localCheck(Array.isArray(manifest.artifacts) && manifest.artifacts.length >= 3, "artifact_contract_incomplete");
  for (const artifact of manifest.artifacts ?? []) localCheck(existsSync(resolve(repoRoot, artifact)), `artifact_missing:${artifact}`);
  const validatorPath = resolve(repoRoot, manifest.validator?.path ?? "");
  localCheck(Boolean(manifest.validator?.path) && existsSync(validatorPath), "validator_missing");

  let validator;
  if (existsSync(validatorPath)) {
    validator = readJson(validatorPath);
    localCheck(validator.ok === true, "validator_not_ok");
  }
  const acceptanceSummaryPath = manifest.validator?.acceptanceSummaryPath ? resolve(repoRoot, manifest.validator.acceptanceSummaryPath) : null;
  let acceptanceSummary = null;
  if (acceptanceSummaryPath) {
    localCheck(existsSync(acceptanceSummaryPath), "acceptance_summary_missing");
    if (existsSync(acceptanceSummaryPath)) acceptanceSummary = readJson(acceptanceSummaryPath);
  }
  if (manifest.status === "verified") {
    localCheck(manifest.blocker === null, "verified_has_blocker");
    for (const [key, value] of Object.entries(manifest.acceptance ?? {})) localCheck(value === true, `verified_acceptance_missing:${key}`);
    const accepted = validator?.[manifest.validator?.acceptedFunctionsField] ?? acceptanceSummary?.[manifest.validator?.acceptedFunctionsField] ?? [];
    localCheck(Array.isArray(accepted) && accepted.includes(manifest.functionId), "validator_does_not_accept_function");
  } else {
    localCheck(Boolean(manifest.blocker?.code) && Boolean(manifest.blocker?.resumeCondition), "blocked_without_resume_contract");
    localCheck(validator?.[manifest.validator?.functionAcceptedField] === false, "blocked_validator_does_not_reject_function");
  }
  if (localFailures.length > 0) failures.push(...localFailures.map((code) => `${prefix}:${code}`));
  records.push({ functionId: manifest.functionId, status: manifest.status, ok: localFailures.length === 0, failures: localFailures });
}

const result = {
  ok: failures.length === 0,
  validator: "aurora-toolset-function-manifests/v1",
  manifestCount: records.length,
  records,
  failures,
  checkedAt: new Date().toISOString()
};
const resultPath = resolve(dirname(registryPath), "validator-result.json");
writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
