import fs from "node:fs";
import path from "node:path";

const PLAN_SCHEMA = "aurora-area-tile-placeholder-decompilation-execution-plan/v1";
const SESSION_PREFIX = "ghidra-session-";
const SHA256 = /^[a-f0-9]{64}$/u;
const PROJECT_NAME = /^[A-Za-z0-9._-]{1,64}$/u;
const PROGRAM_NAME = /^[A-Za-z0-9._-]{1,128}$/u;
const PROJECT_ID = /^[a-z0-9][a-z0-9._-]{0,127}$/u;

export function buildAreaTilePlaceholderDecompilationExecutionPlan({
  profile,
  profilePath,
  profileSha256,
  repoRoot = process.cwd()
}) {
  const canonicalRepoRoot = path.resolve(repoRoot);
  if (!SHA256.test(profileSha256 ?? "")) throw new Error("profile_sha256_invalid");
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    throw new Error("profile_object_invalid");
  }
  if (!PROJECT_ID.test(profile.profileId ?? "")) throw new Error("profile_id_invalid");
  const analysis = validateAnalysis(profile.analysis);
  const packetRoot = resolveProfilePath(canonicalRepoRoot, profile.outputRoot);
  validatePacketRootLocation(packetRoot, canonicalRepoRoot);
  const ghidraWorkingDirectory = path.join(
    canonicalRepoRoot,
    "output",
    "proof",
    "area-tile-placeholder-ghidra-workspaces"
  );
  const projectLocation = path.join(ghidraWorkingDirectory, profile.profileId);
  validateFreshProjectWorkspace(projectLocation, ghidraWorkingDirectory, canonicalRepoRoot);
  const sessionId = `${SESSION_PREFIX}${profileSha256.slice(0, 16)}`;
  const portablePacketRoot = toPortablePath(canonicalRepoRoot, packetRoot);
  const paths = buildPaths(packetRoot, projectLocation);
  const portable = Object.fromEntries(
    Object.entries(paths).map(([key, value]) => [key, toPortablePath(canonicalRepoRoot, value)])
  );
  const stagedFiles = buildStagedFiles({
    profile,
    profilePath,
    profileSha256,
    repoRoot: canonicalRepoRoot,
    paths
  });
  const targets = profile.targets.addresses.join(",");
  const targetsBase64Url = Buffer.from(targets, "utf8").toString("base64url");
  const analyzerConfiguration = {
    schema: "aurora-ghidra-analyzer-configuration/v1",
    profileId: profile.profileId,
    profileSha256,
    analysisMode: analysis.mode,
    existingProjectSnapshot: true,
    automaticAnalysisEnabled: false,
    readOnly: true,
    maxCpu: profile.toolchain.maxCpu,
    maxHeapMiB: profile.toolchain.maxHeapMiB,
    targetAddresses: [...profile.targets.addresses],
    perTargetTimeoutSeconds: profile.targets.timeoutSeconds,
    projectRestoreContract: "ghidra-12.1.3-restore-task-compatible/v1",
    runtimeBehaviorChangesAllowed: profile.acceptance.runtimeBehaviorChangesAllowed
  };
  const ghidraArguments = [
    paths.projectLocation,
    analysis.projectName,
    "-process",
    analysis.programName,
    "-readOnly",
    "-noanalysis",
    "-max-cpu",
    String(profile.toolchain.maxCpu),
    "-scriptPath",
    paths.generation,
    "-log",
    paths.ghidraApplicationLog,
    "-scriptlog",
    paths.ghidraScriptLog,
    "-postScript",
    path.basename(paths.exporter),
    "--packet-root",
    packetRoot,
    "--session-id",
    sessionId,
    "--input-binary",
    paths.inputBinary,
    "--tool-distribution",
    paths.toolDistribution,
    "--project-snapshot",
    paths.projectSnapshot,
    "--analyzer-config",
    paths.analyzerConfiguration,
    "--invocation-log",
    paths.invocationRecord,
    "--exporter-script",
    paths.exporter,
    "--project-id",
    analysis.projectId,
    "--relocation-policy",
    analysis.relocationPolicy,
    "--timeout-seconds",
    String(profile.targets.timeoutSeconds),
    "--target-addresses-base64url",
    targetsBase64Url
  ];
  const ghidraExecutionArguments = ghidraArguments.map((value) =>
    path.isAbsolute(value) && isInside(canonicalRepoRoot, value)
      ? toExecutionPath(canonicalRepoRoot, ghidraWorkingDirectory, value)
      : value
  );
  const invocationRecord = {
    schema: "aurora-ghidra-headless-invocation/v1",
    profileId: profile.profileId,
    profileSha256,
    sessionId,
    workingDirectory: toPortablePath(canonicalRepoRoot, ghidraWorkingDirectory),
    executable: toExecutionPath(
      canonicalRepoRoot,
      ghidraWorkingDirectory,
      resolveProfilePath(canonicalRepoRoot, profile.toolchain.headlessPath)
    ),
    arguments: ghidraExecutionArguments,
    environment: {
      GHIDRA_HEADLESS_MAXMEM: `${profile.toolchain.maxHeapMiB}M`
    },
    exactSingleRun: true
  };
  const ghidraCommand = buildGhidraHostCommand(
    invocationRecord.executable,
    ghidraExecutionArguments
  );
  const generatedAtPlaceholder = "__GENERATED_AT__";
  const producerArguments = [
    paths.lineageProducer,
    "--packet-root", packetRoot,
    "--out", paths.producerPacket,
    "--generated-at", generatedAtPlaceholder,
    "--input-binary", paths.inputBinary,
    "--tool-distribution", paths.toolDistribution,
    "--project-snapshot", paths.projectSnapshot,
    "--analyzer-config", paths.analyzerConfiguration,
    "--session-attestation", paths.sessionAttestation,
    "--invocation-log", paths.invocationRecord,
    "--function-records", paths.functionRecords,
    "--failure-ledger", paths.failureLedger,
    "--call-graph", paths.callGraph,
    "--export-dir", paths.exportDirectory,
    "--export-script", paths.exporter
  ];
  const validatorArguments = [
    paths.lineageValidator,
    "--packet-root", packetRoot,
    "--packet", paths.producerPacket,
    "--out", paths.validatorResult,
    "--generated-at", generatedAtPlaceholder
  ];
  return {
    schema: PLAN_SCHEMA,
    profileId: profile.profileId,
    profileSha256,
    packetRoot,
    portablePacketRoot,
    sessionId,
    paths,
    portablePaths: portable,
    stagedFiles,
    analyzerConfiguration,
    invocationRecord,
    restore: {
      executable: "powershell.exe",
      arguments: [
        "-NoProfile",
        "-NonInteractive",
        "-File",
        paths.projectRestoreScript,
        "-ArchivePath",
        paths.projectSnapshot,
        "-ProjectLocation",
        paths.projectLocation,
        "-ProjectName",
        analysis.projectName
      ]
    },
    ghidra: {
      ...ghidraCommand,
      cwd: ghidraWorkingDirectory,
      environment: {
        GHIDRA_HEADLESS_MAXMEM: `${profile.toolchain.maxHeapMiB}M`
      }
    },
    producer: { executable: process.execPath, arguments: producerArguments },
    validator: { executable: process.execPath, arguments: validatorArguments }
  };
}

function buildGhidraHostCommand(executable, args) {
  if (process.platform !== "win32") return { executable, arguments: args };
  const commandLine = [executable, ...args]
    .map(validateWindowsBatchLiteral)
    .join(" ");
  return {
    executable: "cmd.exe",
    arguments: ["/d", "/s", "/c", commandLine]
  };
}

function validateWindowsBatchLiteral(value) {
  const normalized = String(value).replaceAll("/", "\\");
  if (!normalized || /[\s\0"%!^&|<>()]/u.test(normalized)) {
    throw new Error("ghidra_batch_argument_invalid");
  }
  return normalized;
}

export function validateFreshAreaTilePlaceholderPacketRoot(packetRoot, repoRoot = process.cwd()) {
  const canonicalRepoRoot = path.resolve(repoRoot);
  const canonicalPacketRoot = path.resolve(packetRoot);
  validatePacketRootLocation(canonicalPacketRoot, canonicalRepoRoot);
  validateExistingAncestors(canonicalPacketRoot, canonicalRepoRoot);
  if (fs.existsSync(canonicalPacketRoot)) throw new Error("packet_root_already_exists");
  return canonicalPacketRoot;
}

function buildPaths(packetRoot, projectLocation) {
  return {
    projectLocation,
    generation: path.join(packetRoot, "generation"),
    exportDirectory: path.join(packetRoot, "export"),
    runtimeDirectory: path.join(packetRoot, "runtime"),
    profile: path.join(packetRoot, "profile", "profile.json"),
    inputBinary: path.join(packetRoot, "input", "nwtoolset.exe"),
    toolDistribution: path.join(packetRoot, "tool", "ghidra-distribution.zip"),
    projectSnapshot: path.join(packetRoot, "project", "project.gar"),
    exporter: path.join(packetRoot, "generation", "ExportAuroraDecompilationLineageV2.java"),
    sourceGapManifest: path.join(packetRoot, "research", "source-gap-manifest.json"),
    legacyDiscovery0: path.join(packetRoot, "research", "legacy-decompiled-all.c"),
    legacyDiscovery1: path.join(packetRoot, "research", "legacy-functions.tsv"),
    legacyDiscovery2: path.join(packetRoot, "research", "legacy-strings.tsv"),
    runner: path.join(packetRoot, "execution", "run-area-tile-placeholder-decompilation-pass.mjs"),
    runnerLibrary: path.join(packetRoot, "execution", "lib", "area-tile-placeholder-decompilation-run.mjs"),
    profileValidatorLibrary: path.join(packetRoot, "execution", "lib", "area-tile-placeholder-decompilation-profile.mjs"),
    projectRestoreScript: path.join(packetRoot, "execution", "RestoreGhidraProjectArchive.ps1"),
    lineageProducer: path.join(packetRoot, "execution", "create-aurora-decompilation-lineage-v2-packet.mjs"),
    lineageValidator: path.join(packetRoot, "execution", "validate-aurora-decompilation-lineage-v2.mjs"),
    lineageLibrary: path.join(packetRoot, "execution", "lib", "aurora-decompilation-lineage-v2.mjs"),
    analyzerConfiguration: path.join(packetRoot, "analysis", "analyzers.json"),
    invocationRecord: path.join(packetRoot, "generation", "invocation.log"),
    ghidraApplicationLog: path.join(packetRoot, "runtime", "ghidra-application.log"),
    ghidraScriptLog: path.join(packetRoot, "runtime", "ghidra-script.log"),
    functionRecords: path.join(packetRoot, "generation", "function-records.jsonl"),
    failureLedger: path.join(packetRoot, "generation", "failure-ledger.json"),
    callGraph: path.join(packetRoot, "generation", "call-graph.jsonl"),
    sessionAttestation: path.join(packetRoot, "generation", "session-attestation.json"),
    producerPacket: path.join(packetRoot, "producer-packet.json"),
    validatorResult: path.join(packetRoot, "validator-result.json"),
    executionResult: path.join(packetRoot, "execution-result.json")
  };
}

function validateFreshProjectWorkspace(projectLocation, workspaceRoot, repoRoot) {
  const canonicalWorkspaceRoot = path.resolve(workspaceRoot);
  const canonicalProjectLocation = path.resolve(projectLocation);
  if (!isInside(repoRoot, canonicalWorkspaceRoot) ||
      path.dirname(canonicalProjectLocation) !== canonicalWorkspaceRoot) {
    throw new Error("project_workspace_outside_fixed_root");
  }
  let current = canonicalProjectLocation;
  while (isInside(repoRoot, current) || current === path.resolve(repoRoot)) {
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
      throw new Error("project_workspace_ancestor_symlink");
    }
    if (current === path.resolve(repoRoot)) break;
    current = path.dirname(current);
  }
  if (fs.existsSync(canonicalProjectLocation)) {
    throw new Error("project_workspace_already_exists");
  }
}

function buildStagedFiles({ profile, profilePath, profileSha256, repoRoot, paths }) {
  const records = [
    ["profile", { path: profilePath }, paths.profile],
    ["input_binary", profile.binary, paths.inputBinary],
    ["tool_distribution", profile.toolchain.archive, paths.toolDistribution],
    ["project_snapshot", profile.projectSnapshot, paths.projectSnapshot],
    ["exporter", profile.exporter, paths.exporter],
    ["source_gap_manifest", profile.sourceGapManifest, paths.sourceGapManifest],
    ...profile.legacyDiscovery.map((record, index) => [
      `legacy_discovery_${index}`,
      record,
      paths[`legacyDiscovery${index}`]
    ]),
    ["runner", profile.execution.runner, paths.runner],
    ["runner_library", profile.execution.runnerLibrary, paths.runnerLibrary],
    ["profile_validator_library", profile.execution.profileValidatorLibrary, paths.profileValidatorLibrary],
    ["project_restore_script", profile.execution.projectRestoreScript, paths.projectRestoreScript],
    ["lineage_producer", profile.execution.lineageProducer, paths.lineageProducer],
    ["lineage_validator", profile.execution.lineageValidator, paths.lineageValidator],
    ["lineage_library", profile.execution.lineageLibrary, paths.lineageLibrary]
  ];
  return records.map(([role, record, destination]) => ({
    role,
    source: resolveProfilePath(repoRoot, record.path),
    destination,
    expectedBytes: role === "profile" ? fs.statSync(profilePath).size : record.bytes,
    expectedSha256: role === "profile" ? profileSha256 : record.sha256
  }));
}

function validateAnalysis(analysis) {
  if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) {
    throw new Error("analysis_contract_invalid");
  }
  if (!PROJECT_NAME.test(analysis.projectName ?? "") ||
      !PROGRAM_NAME.test(analysis.programName ?? "") ||
      !PROJECT_ID.test(analysis.projectId ?? "") ||
      analysis.relocationPolicy !== "loader-default-recorded" ||
      analysis.mode !== "existing-analysis-read-only") {
    throw new Error("analysis_contract_invalid");
  }
  return analysis;
}

function validatePacketRootLocation(packetRoot, repoRoot) {
  if (!isInside(repoRoot, packetRoot)) throw new Error("packet_root_outside_repo");
  if (packetRoot === repoRoot) throw new Error("packet_root_too_broad");
}

function validateExistingAncestors(packetRoot, repoRoot) {
  let current = path.dirname(packetRoot);
  while (isInside(repoRoot, current) || current === repoRoot) {
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
      throw new Error("packet_root_ancestor_symlink");
    }
    if (current === repoRoot) break;
    current = path.dirname(current);
  }
}

function isInside(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function resolveProfilePath(repoRoot, value) {
  if (typeof value !== "string" || !value || value.includes("\0")) {
    throw new Error("profile_path_invalid");
  }
  return path.isAbsolute(value) ? path.resolve(value) : path.resolve(repoRoot, value);
}

function toPortablePath(repoRoot, value) {
  const absolute = path.resolve(value);
  if (!isInside(repoRoot, absolute)) throw new Error("portable_path_outside_repo");
  return path.relative(repoRoot, absolute).replaceAll("\\", "/");
}

function toExecutionPath(repoRoot, workingDirectory, value) {
  const absolute = path.resolve(value);
  if (absolute !== path.resolve(repoRoot) && !isInside(repoRoot, absolute)) {
    throw new Error("execution_path_outside_repo");
  }
  const relative = path.relative(path.resolve(workingDirectory), absolute);
  return (relative || ".").replaceAll("\\", "/");
}
