import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const PROFILE_SCHEMA = "aurora-area-tile-placeholder-decompilation-profile/v1";
const SHA256 = /^[a-f0-9]{64}$/u;
const PROFILE_ID = /^[a-z0-9][a-z0-9._-]{0,127}$/u;
const PE32_ADDRESS = /^0x[0-9a-f]{8}$/u;
const PROJECT_NAME = /^[A-Za-z0-9._-]{1,64}$/u;
const PROGRAM_NAME = /^[A-Za-z0-9._-]{1,128}$/u;

export function validateAreaTilePlaceholderDecompilationProfile({
  profile,
  memory,
  repoRoot = process.cwd()
}) {
  const diagnostics = [];
  const add = (code, subject = null) => diagnostics.push({ code, subject });
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    return invalidResult([{ code: "profile_object_invalid", subject: null }], memory);
  }
  if (profile.schema !== PROFILE_SCHEMA) add("profile_schema_invalid");
  if (!PROFILE_ID.test(profile.profileId ?? "")) add("profile_id_invalid");
  if (!canonicalIsoTimestamp(profile.generatedAt)) add("profile_generated_at_invalid");

  validateFileRecord(profile.binary, "binary", repoRoot, add);
  validateFileRecord(profile.projectSnapshot, "project_snapshot", repoRoot, add);
  validateFileRecord(profile.toolchain?.archive, "toolchain_archive", repoRoot, add);
  validateRegularPath(profile.toolchain?.headlessPath, "toolchain_headless", repoRoot, add);
  if (profile.toolchain?.release !== "Ghidra 12.1.3") add("toolchain_release_invalid");
  if (!Number.isInteger(profile.toolchain?.maxHeapMiB) ||
      profile.toolchain.maxHeapMiB < 1024 || profile.toolchain.maxHeapMiB > 1536) {
    add("toolchain_heap_budget_invalid");
  }
  if (profile.toolchain?.maxCpu !== 1) add("toolchain_cpu_budget_invalid");

  validateFileRecord(profile.exporter, "exporter", repoRoot, add);
  validateFileRecord(profile.sourceGapManifest, "source_gap_manifest", repoRoot, add);
  if (!Array.isArray(profile.legacyDiscovery) || profile.legacyDiscovery.length !== 3) {
    add("legacy_discovery_contract_invalid");
  } else {
    profile.legacyDiscovery.forEach((record, index) => {
      if (record?.authority !== "discovery_only") {
        add("legacy_discovery_authority_invalid", `legacyDiscovery[${index}]`);
      }
      validateFileRecord(record, `legacy_discovery_${index}`, repoRoot, add);
    });
  }

  const addresses = profile.targets?.addresses;
  if (!Array.isArray(addresses) || addresses.length < 1 || addresses.length > 32) {
    add("target_address_count_invalid");
  } else {
    const canonical = [...addresses].sort((left, right) => left.localeCompare(right, "en"));
    if (JSON.stringify(addresses) !== JSON.stringify(canonical)) add("target_addresses_not_sorted");
    if (new Set(addresses).size !== addresses.length) add("target_address_duplicate");
    for (const address of addresses) {
      if (!PE32_ADDRESS.test(address ?? "")) add("target_address_invalid", address ?? null);
    }
  }
  if (!Number.isInteger(profile.targets?.timeoutSeconds) ||
      profile.targets.timeoutSeconds < 1 || profile.targets.timeoutSeconds > 60) {
    add("target_timeout_invalid");
  }

  validateAnalysisContract(profile.analysis, add);
  validateExecutionContract(profile.execution, repoRoot, add);

  const physicalThreshold = profile.resourceGate?.minimumFreePhysicalBytes;
  const virtualThreshold = profile.resourceGate?.minimumFreeVirtualBytes;
  if (!Number.isSafeInteger(physicalThreshold) || physicalThreshold < 8 * 1024 ** 3 ||
      !Number.isSafeInteger(virtualThreshold) || virtualThreshold < 6 * 1024 ** 3) {
    add("resource_gate_invalid");
  }
  validateOutputRoot(profile.outputRoot, repoRoot, add);
  if (profile.acceptance?.lineageV2ValidatorRequired !== true ||
      profile.acceptance?.selectedFunctionsMustDecompile !== true ||
      profile.acceptance?.semanticVerdictMustCiteFunctions !== true ||
      profile.acceptance?.runtimeBehaviorChangesAllowed !== false) {
    add("acceptance_contract_invalid");
  }

  if (diagnostics.length > 0) return invalidResult(diagnostics, memory);
  const freePhysicalBytes = memory?.freePhysicalBytes;
  const freeVirtualBytes = memory?.freeVirtualBytes;
  if (!Number.isSafeInteger(freePhysicalBytes) || !Number.isSafeInteger(freeVirtualBytes)) {
    return invalidResult([{ code: "memory_snapshot_invalid", subject: null }], memory);
  }
  if (freePhysicalBytes < physicalThreshold || freeVirtualBytes < virtualThreshold) {
    return {
      ok: true,
      executionReady: false,
      status: "blocked_resource_headroom",
      memory: { freePhysicalBytes, freeVirtualBytes },
      diagnostics: [{ code: "resource_headroom_insufficient", subject: null }]
    };
  }
  return {
    ok: true,
    executionReady: true,
    status: "ready",
    memory: { freePhysicalBytes, freeVirtualBytes },
    diagnostics: []
  };
}

function validateAnalysisContract(analysis, add) {
  if (!analysis || typeof analysis !== "object" || Array.isArray(analysis) ||
      !PROJECT_NAME.test(analysis.projectName ?? "") ||
      !PROGRAM_NAME.test(analysis.programName ?? "") ||
      !PROFILE_ID.test(analysis.projectId ?? "") ||
      analysis.relocationPolicy !== "loader-default-recorded" ||
      analysis.mode !== "existing-analysis-read-only") {
    add("analysis_contract_invalid");
  }
}

function validateExecutionContract(execution, repoRoot, add) {
  if (!execution || typeof execution !== "object" || Array.isArray(execution)) {
    add("execution_contract_invalid");
    return;
  }
  const records = [
    ["runner", execution.runner],
    ["runner_library", execution.runnerLibrary],
    ["profile_validator_library", execution.profileValidatorLibrary],
    ["project_restore_script", execution.projectRestoreScript],
    ["lineage_producer", execution.lineageProducer],
    ["lineage_validator", execution.lineageValidator],
    ["lineage_library", execution.lineageLibrary]
  ];
  for (const [label, record] of records) {
    validateFileRecord(record, `execution_${label}`, repoRoot, add);
  }
}

function validateFileRecord(record, label, repoRoot, add) {
  if (!record || typeof record !== "object" || Array.isArray(record) ||
      typeof record.path !== "string" || !record.path || record.path.includes("\0") ||
      !Number.isSafeInteger(record.bytes) || record.bytes < 1 || !SHA256.test(record.sha256 ?? "")) {
    add(`${label}_record_invalid`);
    return;
  }
  const resolved = resolveProfilePath(repoRoot, record.path);
  let stats;
  try {
    stats = fs.lstatSync(resolved);
  } catch {
    add(`${label}_missing`);
    return;
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    add(`${label}_not_regular`);
    return;
  }
  if (stats.size !== record.bytes) add(`${label}_bytes_mismatch`);
  if (sha256File(resolved) !== record.sha256) add(`${label}_sha256_mismatch`);
}

function validateRegularPath(value, label, repoRoot, add) {
  if (typeof value !== "string" || !value || value.includes("\0")) {
    add(`${label}_path_invalid`);
    return;
  }
  const resolved = resolveProfilePath(repoRoot, value);
  try {
    const stats = fs.lstatSync(resolved);
    if (!stats.isFile() || stats.isSymbolicLink()) add(`${label}_not_regular`);
  } catch {
    add(`${label}_missing`);
  }
}

function validateOutputRoot(value, repoRoot, add) {
  if (typeof value !== "string" || !value || value.includes("\0")) {
    add("output_root_invalid");
    return;
  }
  const resolved = resolveProfilePath(repoRoot, value);
  if (path.parse(resolved).root === resolved) add("output_root_too_broad");
  if (fs.existsSync(resolved) && !fs.lstatSync(resolved).isDirectory()) {
    add("output_root_not_directory");
  }
}

function resolveProfilePath(repoRoot, value) {
  return path.isAbsolute(value) ? path.resolve(value) : path.resolve(repoRoot, value);
}

function sha256File(filePath) {
  const hash = createHash("sha256");
  const buffer = Buffer.allocUnsafe(64 * 1024);
  const descriptor = fs.openSync(filePath, "r");
  try {
    let bytesRead;
    do {
      bytesRead = fs.readSync(descriptor, buffer, 0, buffer.length, null);
      if (bytesRead > 0) hash.update(buffer.subarray(0, bytesRead));
    } while (bytesRead > 0);
  } finally {
    fs.closeSync(descriptor);
  }
  return hash.digest("hex");
}

function canonicalIsoTimestamp(value) {
  if (typeof value !== "string" || !value) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value;
}

function invalidResult(diagnostics, memory) {
  return {
    ok: false,
    executionReady: false,
    status: "invalid",
    memory: memory ?? null,
    diagnostics
  };
}
