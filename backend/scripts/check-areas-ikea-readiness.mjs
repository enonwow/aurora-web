#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION = "aurora-areas-ikea-readiness/v1";
const TARGET = {
  areaId: "area__ikea",
  areaResRef: "_ikea",
};
const COMMAND_TIMEOUT_MS = 45000;
const PROBE_TIMEOUT_MS = 2500;
const MAX_CAPTURED_OUTPUT_CHARS = 12000;
const MAX_COMMAND_OUTPUT_BYTES = 64 * 1024 * 1024;
const PLC_DOR_RENDER_CLASSIFICATION = {
  missingPayload: {
    code: "plc_dor_missing_render_payloads",
    category: "frontend_backend_render_payload_contract_missing",
    finality: "final_missing_payload_after_queue_settled",
  },
  renderPayloadQueueInProgress: {
    code: "render_payload_queue_in_progress",
    category: "frontend_runtime_render_payload_queue_in_progress",
    finality: "in_progress_not_final_missing_payload",
  },
  payloadMissingModelUrl: {
    code: "plc_dor_payload_missing_model_url",
    category: "backend_render_payload_missing_model_url",
    finality: "final_payload_missing_model_url",
  },
  nonrenderableUserPlaceable: {
    code: "plc_dor_nonrenderable_user_placeable",
    category: "exact_source_nonrenderable_placeables_2da",
    finality: "final_exact_source_nonrenderable",
  },
  missingDerivedGlb: {
    code: "plc_dor_missing_derived_glb",
    category: "asset_pipeline_missing_derived_glb",
    finality: "final_missing_asset_pipeline",
  },
  assetPipelineBlocked: {
    code: "plc_dor_asset_pipeline_blocked",
    category: "asset_pipeline_blocker",
    finality: "final_asset_pipeline_blocker",
  },
  modelLoadFailed: {
    code: "plc_dor_model_load_failed",
    category: "frontend_model_loader_failed",
    finality: "final_model_loader_failed",
  },
  renderedPayloadReady: {
    code: "plc_dor_rendered_payload_ready",
    category: "real_rendered_payload",
    finality: "rendered_payload_evidence",
  },
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(scriptDir, "..");
const repoRoot = resolve(backendRoot, "..");
const generatedAt = new Date().toISOString();

const blockers = [];
const warnings = [];

const contractGate = buildContractGateStatus();
const tileSourceAudit = await buildTileSourceAuditStatus();
const runtimeCapture = buildRuntimeCaptureStatus();
const retailToolsetOracle = buildRetailToolsetOracleStatus();

const summary = {
  version: VERSION,
  generatedAt,
  cwd: backendRoot,
  target: TARGET,
  status: blockers.length > 0 ? "blocked" : "ready",
  canonicalParityPromoted: false,
  visualParityPromoted: false,
  exitsNonZeroOnlyForOwnFormatErrors: true,
  summary: {
    blockerCount: blockers.length,
    warningCount: warnings.length,
    contractGateStatus: contractGate.status,
    contractGateFailureCount: contractGate.failureCount,
    tileSourceAuditStatus: tileSourceAudit.status,
    runtimeCaptureStatus: runtimeCapture.status,
    canRunVisualComparison: retailToolsetOracle.canRunVisualComparison,
  },
  contractGate,
  tileSourceAudit,
  runtimeCapture,
  retailToolsetOracle,
  blockers,
  warnings,
};

const formatErrors = validateOwnSummaryFormat(summary);
summary.formatValidation = {
  ok: formatErrors.length === 0,
  errors: formatErrors,
};

console.log(JSON.stringify(summary, null, 2));
process.exit(formatErrors.length > 0 ? 1 : 0);

function buildContractGateStatus() {
  const command = runNodeScript("check-areas-render-contract-loop.mjs");
  const parsed = parseJsonFromCommandOutput(command);
  const failures = Array.isArray(parsed?.failures) ? parsed.failures : [];
  const status = command.exitCode === 0 ? "passed" : "failed";

  if (status !== "passed") {
    addBlocker("contractGate", "areas_contract_gate_failed", {
      failureCount: failures.length,
      exitCode: command.exitCode,
      command: command.displayCommand,
    });
  }
  if (status !== "passed" && failures.length === 0) {
    addBlocker("contractGate", "areas_contract_gate_failed_without_failure_json", {
      exitCode: command.exitCode,
      stderrTail: command.stderrTail,
    });
  }

  return {
    command: command.displayCommand,
    exitCode: command.exitCode,
    status,
    parsedOutput: Boolean(parsed),
    failureCount: failures.length,
    failures: failures.map((failure) => ({
      id: failure.id ?? null,
      file: failure.file ?? null,
      missing: Array.isArray(failure.missing) ? failure.missing : [],
      message: failure.message ?? null,
    })),
    timedOut: command.timedOut,
    error: command.error,
  };
}

async function buildTileSourceAuditStatus() {
  const localBlobMirror = resolveLocalBlobMirrorForTileAudit();
  const tileAuditArgs = localBlobMirror ? ["--localBlobMirror", localBlobMirror.argument] : [];
  const command = runNodeScript("check-areas-ikea-tile-source-readiness.mjs", tileAuditArgs);
  const parsed = parseJsonFromCommandOutput(command);
  const parsedReady = command.exitCode === 0 && parsed?.status === "ready" && parsed?.auditCompleted === true;
  const runtimeSettings = readJsonArtifact("backend/config/runtime-settings.json");
  const endpointEvidence = buildBlobEndpointEvidence(runtimeSettings.json?.blobStorage?.endpoint);
  const endpointProbes = [];

  for (const probeTarget of endpointEvidence.probeTargets) {
    endpointProbes.push(await probeEndpoint(probeTarget));
  }

  const generationArtifacts = [
    readJsonArtifact(
      "backend/docs/aurora-reverse/artifacts/areas-generation-v24/tcn01_c01_01-live-default-port-tile-model-sync-v24.json",
    ),
    readJsonArtifact(
      "backend/docs/aurora-reverse/artifacts/areas-generation-v24/tcn01_c01_01-live-alt-port-tile-model-sync-v24.json",
    ),
    readJsonArtifact(
      "backend/docs/aurora-reverse/artifacts/areas-generation-v24/tcn01_c01_01-live-tile-model-sync-v24.json",
    ),
    readJsonArtifact("backend/docs/aurora-reverse/artifacts/areas-generation-v22/live-area-tile-detail-scan-v22.json"),
  ];
  const ikeaAreaScan = resolveIkeaAreaScan(generationArtifacts[3]);

  const laneBlockers = [];
  if (command.exitCode !== 0 && !parsed?.blocker && !(Array.isArray(parsed?.topBlockers) && parsed.topBlockers.length > 0)) {
    laneBlockers.push({
      code: "tile_source_audit_exit_nonzero",
      exitCode: command.exitCode,
      blocker: parsed?.blocker ?? null,
      blockerDetails: parsed?.blockerDetails ?? null,
    });
  }
  if (parsed?.blocker) {
    laneBlockers.push({
      code: parsed.blocker,
      details: parsed.blockerDetails ?? parsed.error ?? null,
    });
  }
  for (const blocker of parsed?.topBlockers ?? []) {
    laneBlockers.push({
      code: blocker.blocker,
      count: blocker.count,
      sampleTileIds: blocker.sampleTileIds ?? [],
    });
  }
  if (!parsedReady) {
    for (const probe of endpointProbes) {
      if (!probe.available) {
        laneBlockers.push({
          code: probe.source === "runtime_settings" ? "seaweedfs_runtime_endpoint_unavailable_from_host" : "host_blob_storage_endpoint_unavailable",
          endpoint: probe.endpoint,
          source: probe.source,
          cause: probe.cause,
        });
      }
    }

    for (const artifact of generationArtifacts) {
      if (!artifact.exists) {
        laneBlockers.push({
          code: "tile_source_evidence_artifact_missing",
          artifact: artifact.path,
        });
      } else if (artifact.parseError) {
        laneBlockers.push({
          code: "tile_source_evidence_artifact_invalid_json",
          artifact: artifact.path,
          parseError: artifact.parseError,
        });
      }
    }
    if (ikeaAreaScan && ikeaAreaScan.detailTilesNull === true) {
      laneBlockers.push({
        code: "ikea_area_detail_tiles_null_in_v22_scan",
        artifact: generationArtifacts[3].path,
        detailTileCount: ikeaAreaScan.detailTileCount,
      });
    }
  }

  for (const blocker of laneBlockers) {
    addBlocker("tileSourceAudit", blocker.code, blocker);
  }

  const status = resolveLaneStatus({
    commandExitCode: command.exitCode,
    parsedStatus: parsed?.status,
    blockerCount: laneBlockers.length,
  });

  return {
    command: command.displayCommand,
    exitCode: command.exitCode,
    status,
    localBlobMirror: localBlobMirror
      ? {
          path: localBlobMirror.path,
          argument: localBlobMirror.argument,
          source: localBlobMirror.source,
        }
      : null,
    auditCompleted: parsed?.auditCompleted ?? false,
    parsedOutput: Boolean(parsed),
    parsedStatus: parsed?.status ?? null,
    blocker: parsed?.blocker ?? null,
    blockerDetails: parsed?.blockerDetails ?? null,
    runtimeBlobEndpoint: endpointEvidence.runtimeEndpoint,
    hostAuditEndpoint: endpointEvidence.hostEndpoint,
    endpointProbes,
    generationArtifacts: generationArtifacts.map((artifact) => summarizeArtifact(artifact, ["status", "route", "s3HeadEndpoint", "selectedArea", "selectedTileset"])),
    ikeaAreaScan,
    topBlockers: parsed?.topBlockers ?? [],
    totals: parsed?.totals ?? null,
    timedOut: command.timedOut,
    error: command.error,
    stdoutBytes: command.stdoutBytes,
    stderrBytes: command.stderrBytes,
    stdoutTruncatedInSummary: command.stdoutTruncatedInSummary,
    stderrTruncatedInSummary: command.stderrTruncatedInSummary,
    stdoutTail: command.stdoutTail,
    stderrTail: command.stderrTail,
  };
}

function buildRuntimeCaptureStatus() {
  const currentRuntimeFrame = readJsonArtifact(
    "backend/docs/aurora-reverse/artifacts/areas-runtime-capture/areas-runtime.frame.json",
  );
  const historicalRuntimeDir = resolve(repoRoot, "backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture");
  const latestHistoricalFrame = findLatestJsonFile(
    historicalRuntimeDir,
    (name) => name.startsWith("ikea") && name.endsWith(".frame.json"),
  );
  const historicalArtifact = latestHistoricalFrame ? readJsonArtifact(repoRelativePath(latestHistoricalFrame.absolutePath)) : null;
  const selected = currentRuntimeFrame.exists
    ? {
        source: "current_strict_runtime_frame",
        artifact: currentRuntimeFrame,
      }
    : historicalArtifact
      ? {
          source: "historical_named_ikea_frame_fallback",
          artifact: historicalArtifact,
        }
      : null;

  if (!selected) {
    addBlocker("runtimeCapture", "ikea_runtime_capture_frame_missing", {
      currentFrame: currentRuntimeFrame.path,
      historicalDirectory: repoRelativePath(historicalRuntimeDir),
    });
    return {
      status: "missing",
      artifact: null,
      source: null,
      capturedAt: null,
      terrainStatus: null,
      terrainBlockerSummary: null,
      tileProcessStatus: null,
      tileProcessBlockerSummary: null,
      historicalEvidence: null,
    };
  }

  const artifact = selected.artifact;
  if (!artifact.json) {
    addBlocker("runtimeCapture", "ikea_runtime_capture_frame_invalid_json", {
      artifact: artifact.path,
      parseError: artifact.parseError,
    });
    return {
      status: "invalid_json",
      artifact: artifact.path,
      source: selected.source,
      capturedAt: null,
      terrainStatus: null,
      terrainBlockerSummary: null,
      tileProcessStatus: null,
      tileProcessBlockerSummary: null,
      historicalEvidence: summarizeRuntimeEvidenceArtifact(historicalArtifact),
    };
  }

  const frame = artifact.json;
  const isCurrentRuntimeFrame = selected.source === "current_strict_runtime_frame";
  const runtimeActionabilitySummary =
    frame.runtimeActionabilitySummary ?? frame.domStatus?.runtimeActionabilitySummary ?? null;
  const networkCaptureSummary =
    frame.networkCaptureSummary ??
    frame.domStatus?.networkCaptureSummary ??
    runtimeActionabilitySummary?.network ??
    null;
  const terrainSnapshot = frame.terrainTileModelSnapshot ?? frame.domStatus?.terrainTileModelSnapshot ?? null;
  const tileProcessSnapshot = frame.tileProcessRuntimeSnapshot ?? frame.domStatus?.tileProcessRuntimeSnapshot ?? null;
  const sharedRendererSnapshot =
    frame.areaObjectSharedRendererSnapshot ??
    frame.domStatus?.areaObjectSharedRendererSnapshot ??
    runtimeActionabilitySummary?.sharedRenderer ??
    null;
  const plcDorSharedRenderer = summarizePlcDorSharedRenderer(
    sharedRendererSnapshot,
    runtimeActionabilitySummary,
    networkCaptureSummary,
  );
  const laneBlockers = collectPlcDorSharedRendererBlockers(plcDorSharedRenderer);
  const runtimeFrameBlockers = collectRuntimeFrameBlockers(frame);
  for (const blocker of runtimeFrameBlockers) {
    if (laneBlockers.length > 0 && isGenericVisibleRuntimeBlocker(blocker.code)) {
      continue;
    }
    laneBlockers.push(blocker);
  }
  if (laneBlockers.length === 0) {
    addRuntimeBlockerIfNeeded(laneBlockers, "terrain_tile_model_runtime_blocked", terrainSnapshot);
    addRuntimeBlockerIfNeeded(laneBlockers, "tile_process_runtime_blocked", tileProcessSnapshot);
    if (frame.openedArea?.ok !== true) {
      laneBlockers.push({
        code: "ikea_runtime_capture_area_not_open",
        openedArea: frame.openedArea ?? null,
      });
    }
    if (frame.domStatus?.canvasPresent !== true) {
      laneBlockers.push({
        code: "ikea_runtime_capture_canvas_missing",
        canvasPresent: frame.domStatus?.canvasPresent ?? null,
      });
    }
    if (frame.screenshotPath && frame.screenshotBytes) {
      const screenshotPath = resolve(repoRoot, frame.screenshotPath);
      if (!existsSync(screenshotPath)) {
        laneBlockers.push({
          code: "ikea_runtime_capture_screenshot_missing",
          screenshotPath: frame.screenshotPath,
        });
      }
    }
  }

  for (const blocker of laneBlockers) {
    addBlocker("runtimeCapture", blocker.code, blocker);
  }

  const resolvedStatus = frame.status === "ready" && laneBlockers.length === 0 ? "ready" : laneBlockers.length > 0 ? "blocked" : frame.status ?? "unknown";

  return {
    status: resolvedStatus,
    artifact: artifact.path,
    source: selected.source,
    currentFramePreferred: currentRuntimeFrame.exists,
    artifactMtime: artifact.mtime,
    capturedAt: frame.capturedAt ?? null,
    frameStatus: frame.status ?? null,
    areaQuery: frame.areaQuery ?? null,
    target: frame.target ?? null,
    openedAreaOk: frame.openedArea?.ok ?? null,
    openedAreaText: frame.openedArea?.areaText ?? null,
    screenshotPath: frame.screenshotPath ?? null,
    screenshotBytes: frame.screenshotBytes ?? null,
    strictVisualModeStatus: frame.strictVisualMode?.status ?? null,
    strictVisualModeFailureClass: frame.strictVisualMode?.failureClass ?? null,
    strictVisualModeBlockerCode: frame.strictVisualMode?.blockerCode ?? null,
    runtimeEnvironmentPreflightStatus: frame.runtimeEnvironmentPreflight?.status ?? null,
    directBlocker: frame.blocker ?? frame.runtimeBlockerSnapshot?.firstBlocker ?? null,
    terrainStatus: terrainSnapshot?.status ?? null,
    terrainBlockerSummary: terrainSnapshot?.blockerSummary ?? null,
    terrainLoadedTileCount: terrainSnapshot?.loadedTileCount ?? null,
    terrainFailedTileCount: terrainSnapshot?.failedTileCount ?? null,
    tileProcessStatus: tileProcessSnapshot?.status ?? null,
    tileProcessBlockerSummary: tileProcessSnapshot?.blockerSummary ?? null,
    tileProcessReadyCandidateCount: tileProcessSnapshot?.readyCandidateCount ?? null,
    tileProcessBlockedCandidateCount: tileProcessSnapshot?.blockedCandidateCount ?? null,
    runtimeActionabilityStatus: runtimeActionabilitySummary?.status ?? null,
    runtimeActionabilityFirstErrorReason: runtimeActionabilitySummary?.firstErrorReason ?? null,
    networkCaptureStatus: networkCaptureSummary ? "present" : "missing",
    networkCaptureObservedRequestCount: networkCaptureSummary?.observedRequestCount ?? null,
    plcDorSharedRenderer,
    canonicalParityPromoted: frame.canonicalParityPromoted ?? null,
    localOnlyNotRetailEvidence: frame.localOnlyNotRetailEvidence ?? null,
    historicalEvidence: isCurrentRuntimeFrame ? summarizeRuntimeEvidenceArtifact(historicalArtifact) : null,
    blockers: laneBlockers,
  };
}

function buildRetailToolsetOracleStatus() {
  const manifest = readJsonArtifact(
    "backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/aurora-toolset-ikea-oracle-manifest.json",
  );
  const currentState = readJsonArtifact(
    "backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-current-window-state.json",
  );
  const state = currentState.json ?? null;
  const manifestJson = manifest.json ?? null;
  const canRunVisualComparison =
    state?.comparison?.canRunVisualComparison ?? state?.canRunVisualComparison ?? manifestJson?.canRunVisualComparison ?? false;
  const blocker = state?.comparison?.blockedBy ?? state?.blocker ?? null;
  const laneBlockers = [];

  if (!manifest.exists) {
    laneBlockers.push({ code: "retail_toolset_oracle_manifest_missing", artifact: manifest.path });
  } else if (manifest.parseError) {
    laneBlockers.push({
      code: "retail_toolset_oracle_manifest_invalid_json",
      artifact: manifest.path,
      parseError: manifest.parseError,
    });
  }
  if (!currentState.exists) {
    laneBlockers.push({ code: "toolset_current_window_state_missing", artifact: currentState.path });
  } else if (currentState.parseError) {
    laneBlockers.push({
      code: "toolset_current_window_state_invalid_json",
      artifact: currentState.path,
      parseError: currentState.parseError,
    });
  }
  if (canRunVisualComparison !== true) {
    laneBlockers.push({
      code: blocker?.code ?? "toolset_visual_comparison_not_ready",
      blocker,
      reason: manifestJson?.reason ?? null,
    });
  }
  if (manifestJson?.canonicalParityPromoted === true) {
    laneBlockers.push({
      code: "retail_toolset_oracle_unexpected_canonical_promotion",
      artifact: manifest.path,
    });
  }

  for (const laneBlocker of laneBlockers) {
    addBlocker("retailToolsetOracle", laneBlocker.code, laneBlocker);
  }

  return {
    status: laneBlockers.length > 0 ? "blocked" : "ready",
    manifestArtifact: manifest.path,
    manifestMtime: manifest.mtime,
    currentStateArtifact: currentState.path,
    currentStateMtime: currentState.mtime,
    oracleStatus: manifestJson?.oracleStatus ?? null,
    canRunVisualComparison,
    current: state?.current ?? null,
    blocker,
    readyChecks: state?.readyChecks ?? null,
    reason: manifestJson?.reason ?? null,
    canonicalParityPromoted: manifestJson?.canonicalParityPromoted ?? null,
  };
}

function runNodeScript(scriptName, args = []) {
  const scriptPath = resolve(scriptDir, scriptName);
  const displayCommand = `node scripts/${scriptName}${args.length > 0 ? ` ${args.join(" ")}` : ""}`;
  if (!existsSync(scriptPath)) {
    return {
      displayCommand,
      exitCode: 127,
      stdout: "",
      stderr: "",
      stdoutTail: "",
      stderrTail: "",
      stdoutBytes: 0,
      stderrBytes: 0,
      stdoutTruncatedInSummary: false,
      stderrTruncatedInSummary: false,
      timedOut: false,
      error: "script_missing",
    };
  }
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: backendRoot,
    encoding: "utf8",
    timeout: COMMAND_TIMEOUT_MS,
    maxBuffer: MAX_COMMAND_OUTPUT_BYTES,
    windowsHide: true,
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  return {
    displayCommand,
    exitCode: typeof result.status === "number" ? result.status : result.error ? 1 : null,
    stdout,
    stderr,
    stdoutTail: tail(stdout),
    stderrTail: tail(stderr),
    stdoutBytes: Buffer.byteLength(stdout, "utf8"),
    stderrBytes: Buffer.byteLength(stderr, "utf8"),
    stdoutTruncatedInSummary: stdout.length > MAX_CAPTURED_OUTPUT_CHARS,
    stderrTruncatedInSummary: stderr.length > MAX_CAPTURED_OUTPUT_CHARS,
    timedOut: result.error?.code === "ETIMEDOUT",
    error: result.error ? formatErrorForReport(result.error) : null,
  };
}

function parseJsonFromCommandOutput(command) {
  return parseLastJson(command.stdout) ?? parseLastJson(command.stderr) ?? parseLastJson(command.stdoutTail) ?? parseLastJson(command.stderrTail);
}

function parseLastJson(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) {
    return null;
  }
  for (let index = trimmed.length - 1; index >= 0; index -= 1) {
    const char = trimmed[index];
    if (char !== "{" && char !== "[") {
      continue;
    }
    try {
      return JSON.parse(trimmed.slice(index));
    } catch {
      // Keep scanning backward until the outer JSON object/array is found.
    }
  }
  return null;
}

function readJsonArtifact(path) {
  const absolutePath = resolve(repoRoot, path);
  if (!existsSync(absolutePath)) {
    return {
      path,
      exists: false,
      size: null,
      mtime: null,
      json: null,
      parseError: null,
    };
  }
  const stat = statSync(absolutePath);
  try {
    const content = readFileSync(absolutePath, "utf8").replace(/^\uFEFF/u, "");
    return {
      path,
      exists: true,
      size: stat.size,
      mtime: stat.mtime.toISOString(),
      json: JSON.parse(content),
      parseError: null,
    };
  } catch (error) {
    return {
      path,
      exists: true,
      size: stat.size,
      mtime: stat.mtime.toISOString(),
      json: null,
      parseError: error instanceof Error ? error.message : String(error),
    };
  }
}

function summarizeArtifact(artifact, fields) {
  const selected = {};
  for (const field of fields) {
    selected[field] = artifact.json?.[field] ?? null;
  }
  return {
    path: artifact.path,
    exists: artifact.exists,
    size: artifact.size,
    mtime: artifact.mtime,
    parseError: artifact.parseError,
    ...selected,
  };
}

function resolveIkeaAreaScan(artifact) {
  if (!Array.isArray(artifact.json)) {
    return null;
  }
  const match =
    artifact.json.find((entry) => entry?.areaId === TARGET.areaId) ??
    artifact.json.find((entry) => String(entry?.name ?? "").toLowerCase() === TARGET.areaResRef);
  if (!match) {
    return null;
  }
  return {
    areaId: match.areaId ?? null,
    name: match.name ?? null,
    textureAtlasId: match.textureAtlasId ?? null,
    detailTileCount: match.detailTileCount ?? null,
    detailTilesNull: match.detailTilesNull ?? null,
    listTags: match.listTags ?? null,
  };
}

function resolveLocalBlobMirrorForTileAudit() {
  const candidates = [
    {
      path: resolve(repoRoot, ".codex-tmp", "module-blob-mirror"),
      source: "repo_tmp_module_blob_mirror",
    },
    {
      path: resolve(backendRoot, ".module-blob-mirror"),
      source: "backend_default_local_blob_mirror",
    },
  ];
  for (const candidate of candidates) {
    if (!existsSync(candidate.path) || !statSync(candidate.path).isDirectory()) {
      continue;
    }
    return {
      ...candidate,
      argument: relative(backendRoot, candidate.path).replace(/\//gu, "\\"),
    };
  }
  return null;
}

function buildBlobEndpointEvidence(runtimeEndpoint) {
  const normalizedEndpoint = normalizeEndpoint(runtimeEndpoint);
  const hostEndpoint = isSeaweedfsEndpoint(normalizedEndpoint) ? "http://127.0.0.1:8333" : null;
  const probeTargets = [];
  if (normalizedEndpoint) {
    probeTargets.push({
      source: "runtime_settings",
      endpoint: normalizedEndpoint,
    });
  }
  if (hostEndpoint) {
    probeTargets.push({
      source: "host_endpoint_override",
      endpoint: hostEndpoint,
    });
  }
  return {
    runtimeEndpoint: normalizedEndpoint,
    hostEndpoint,
    probeTargets,
  };
}

async function probeEndpoint(target) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(target.endpoint, {
      method: "HEAD",
      signal: controller.signal,
    });
    return {
      source: target.source,
      endpoint: target.endpoint,
      available: true,
      status: response.status,
      statusText: response.statusText,
      cause: null,
    };
  } catch (error) {
    return {
      source: target.source,
      endpoint: target.endpoint,
      available: false,
      status: null,
      statusText: null,
      cause: formatEndpointProbeError(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function findLatestJsonFile(directory, predicate) {
  if (!existsSync(directory)) {
    return null;
  }
  const candidates = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && predicate(entry.name))
    .map((entry) => {
      const absolutePath = resolve(directory, entry.name);
      const stat = statSync(absolutePath);
      return {
        absolutePath,
        name: entry.name,
        mtimeMs: stat.mtimeMs,
      };
    })
    .sort((left, right) => right.mtimeMs - left.mtimeMs || right.name.localeCompare(left.name));
  return candidates[0] ?? null;
}

function collectRuntimeFrameBlockers(frame) {
  const blockersByCode = new Map();
  const add = (blocker, fallbackCode, context = {}) => {
    const code = normalizeBlockerCode(blocker?.code ?? fallbackCode);
    if (!code || blockersByCode.has(code)) {
      return;
    }
    blockersByCode.set(code, {
      code,
      source: context.source ?? blocker?.lane ?? null,
      summary: blocker?.summary ?? context.summary ?? null,
      status: context.status ?? null,
      failureClass: context.failureClass ?? null,
      details: blocker?.details ?? context.details ?? null,
    });
  };

  const primaryBlocker = frame.blocker ?? frame.runtimeBlockerSnapshot?.firstBlocker ?? null;
  if (primaryBlocker) {
    add(primaryBlocker, primaryBlocker.code, { source: "current_runtime_frame" });
  } else if (Array.isArray(frame.runtimeBlockerSnapshot?.blockers)) {
    for (const blocker of frame.runtimeBlockerSnapshot.blockers) {
      add(blocker, blocker?.code, { source: "runtime_blocker_snapshot" });
    }
  }

  if (frame.strictVisualMode?.status === "failed") {
    add(
      null,
      frame.strictVisualMode.blockerCode ?? frame.strictVisualMode.failureClass ?? "strict_visual_mode_failed",
      {
        source: "strict_visual_mode",
        status: frame.strictVisualMode.status,
        failureClass: frame.strictVisualMode.failureClass ?? null,
        details: {
          screenshot: frame.strictVisualMode.screenshot ?? null,
        },
      },
    );
  }

  if (blockersByCode.size === 0 && frame.status && frame.status !== "ready") {
    add(null, frame.strictVisualMode?.failureClass ?? frame.status, {
      source: "runtime_frame_status",
      status: frame.status,
      failureClass: frame.strictVisualMode?.failureClass ?? null,
    });
  }

  return [...blockersByCode.values()];
}

function summarizePlcDorSharedRenderer(snapshot, runtimeActionabilitySummary = null, networkCaptureSummary = null) {
  const renderPayloadQueue = summarizeRenderPayloadQueue(runtimeActionabilitySummary, networkCaptureSummary);
  if (!snapshot) {
    const classifications = buildPlcDorRenderClassifications({
      snapshot: {
        total: renderPayloadQueue.total,
        missingPayloadCount: renderPayloadQueue.remaining,
        missingPayloadIdsSample: [],
      },
      reasonCounts: {},
      reasonIds: {},
      renderPayloadQueue,
      renderedPayloadCount: null,
    });
    return {
      present: false,
      status: "missing",
      blockerSummary: "shared_renderer_snapshot_missing",
      runtimeActionabilityStatus: runtimeActionabilitySummary?.status ?? null,
      runtimeActionabilityFirstErrorReason: runtimeActionabilitySummary?.firstErrorReason ?? null,
      renderPayloadQueue,
      total: null,
      payloadBoundCount: null,
      modelReadyCount: null,
      primitiveFallbackCount: null,
      primitiveFallbackSuppressedCount: null,
      missingPayloadCount: null,
      payloadMissingModelUrlCount: null,
      assetContractBlockedCount: null,
      modelLoadFailedCount: null,
      missingPayloadIdSample: [],
      assetContractBlockedIdSample: [],
      renderedPayloadCount: null,
      classifications,
    };
  }
  const reasonCounts = snapshot.placeholderReasonCounts ?? {};
  const reasonIds = snapshot.placeholderReasonIds ?? {};
  const payloadBoundCount = numberOrNull(snapshot.payloadBoundCount);
  const modelReadyCount = numberOrNull(snapshot.modelReadyCount);
  const renderedPayloadCount =
    payloadBoundCount === null || modelReadyCount === null
      ? null
      : Math.max(0, Math.min(payloadBoundCount, modelReadyCount));
  const classifications = buildPlcDorRenderClassifications({
    snapshot,
    reasonCounts,
    reasonIds,
    renderPayloadQueue,
    renderedPayloadCount,
  });
  return {
    present: true,
    version: snapshot.version ?? null,
    path: snapshot.path ?? null,
    status: snapshot.status ?? null,
    placeholderStatus: snapshot.placeholderStatus ?? null,
    runtimeActionabilityStatus: runtimeActionabilitySummary?.status ?? null,
    runtimeActionabilityFirstErrorReason: runtimeActionabilitySummary?.firstErrorReason ?? null,
    renderPayloadQueue,
    total: snapshot.total ?? null,
    payloadBoundCount,
    modelReadyCount,
    primitiveFallbackCount: snapshot.primitiveFallbackCount ?? null,
    primitiveFallbackRenderLimit: snapshot.primitiveFallbackRenderLimit ?? null,
    primitiveFallbackSuppressedCount: snapshot.primitiveFallbackSuppressedCount ?? null,
    missingPayloadCount: reasonCount(reasonCounts, "missing-payload", snapshot.missingPayloadCount),
    payloadMissingModelUrlCount: reasonCounts["payload-missing-model-url"] ?? 0,
    assetContractBlockedCount: reasonCounts["asset-contract-blocked"] ?? 0,
    modelLoadFailedCount: reasonCounts["model-load-failed"] ?? 0,
    stillLoadingCount: reasonCounts["still-loading"] ?? 0,
    missingPayloadIdSample: sampleReasonIds(reasonIds, "missing-payload", snapshot.missingPayloadIdsSample),
    payloadMissingModelUrlIdSample: sampleReasonIds(reasonIds, "payload-missing-model-url"),
    assetContractBlockedIdSample: sampleReasonIds(reasonIds, "asset-contract-blocked"),
    modelLoadFailedIdSample: sampleReasonIds(reasonIds, "model-load-failed"),
    renderedPayloadCount,
    classifications,
  };
}

function collectPlcDorSharedRendererBlockers(summary) {
  const laneBlockers = [];
  if (!summary?.present) {
    for (const classification of summary?.classifications ?? []) {
      if (classification.severity !== "blocker") {
        continue;
      }
      laneBlockers.push({
        code: classification.code,
        source: "runtimeActionabilitySummary",
        summary: classification.summary,
        details: classification,
      });
    }
    if (laneBlockers.length > 0) {
      return laneBlockers;
    }
    laneBlockers.push({
      code: "plc_dor_shared_renderer_snapshot_missing",
      source: "area_object_shared_renderer_snapshot",
      summary: "Area PLC/DOR shared renderer snapshot is missing from current runtime capture.",
      details: summary ?? null,
    });
    return laneBlockers;
  }
  for (const classification of summary.classifications ?? []) {
    if (classification.severity !== "blocker") {
      continue;
    }
    laneBlockers.push({
      code: classification.code,
      source: "area_object_shared_renderer_snapshot",
      summary: classification.summary,
      details: {
        ...classification,
        total: summary.total,
        payloadBoundCount: summary.payloadBoundCount,
        modelReadyCount: summary.modelReadyCount,
        primitiveFallbackCount: summary.primitiveFallbackCount,
        primitiveFallbackSuppressedCount: summary.primitiveFallbackSuppressedCount,
      },
    });
  }
  if (laneBlockers.length === 0 && summary.status && summary.status !== "ready") {
    laneBlockers.push({
      code: "plc_dor_shared_renderer_blocked",
      source: "area_object_shared_renderer_snapshot",
      summary: `Area PLC/DOR shared renderer status is ${summary.status}.`,
      details: summary,
    });
  }
  return laneBlockers;
}

function buildPlcDorRenderClassifications({ snapshot, reasonCounts, reasonIds, renderPayloadQueue, renderedPayloadCount }) {
  const classifications = [];
  const add = (definition, input) => {
    classifications.push({
      code: definition.code,
      category: definition.category,
      finality: definition.finality,
      severity: input.severity,
      count: input.count,
      source: input.source,
      summary: input.summary,
      userVisibleBlocker: input.userVisibleBlocker ?? input.summary,
      sampleObjectIds: input.sampleObjectIds ?? [],
      evidence: input.evidence ?? null,
    });
  };

  const total = snapshot.total ?? null;
  const missingPayloadCount = reasonCount(reasonCounts, "missing-payload", snapshot.missingPayloadCount);
  const queueInProgress = isRenderPayloadQueueInProgress(renderPayloadQueue);
  if (queueInProgress) {
    const placeableProcessBatch = renderPayloadQueue.batchDiagnostics?.placeableProcessBatch ?? null;
    add(PLC_DOR_RENDER_CLASSIFICATION.renderPayloadQueueInProgress, {
      severity: "blocker",
      count: renderPayloadQueue.remaining ?? missingPayloadCount,
      source: "runtimeActionabilitySummary",
      summary: `Area PLC/DOR render payload queue is still in progress (${formatQueueProgress(renderPayloadQueue)}; ${formatBatchProgress(renderPayloadQueue)}); this is not a final missing-payload failure.`,
      userVisibleBlocker: `Area PLC/DOR payload queue is still loading (${formatQueueProgress(renderPayloadQueue)}; ${formatBatchProgress(renderPayloadQueue)}). Do not classify this as final missing payload yet.`,
      sampleObjectIds: sampleReasonIds(reasonIds, "missing-payload", snapshot.missingPayloadIdsSample),
      evidence: {
        queueLoaded: renderPayloadQueue.loaded,
        queueTotal: renderPayloadQueue.total,
        queueRemaining: renderPayloadQueue.remaining,
        queueStatus: renderPayloadQueue.status,
        finalMissingPayload: false,
        firstErrorReason: renderPayloadQueue.firstErrorReason,
        batchRequestCounts: renderPayloadQueue.batchRequestCounts,
        payloadResponseCounts: renderPayloadQueue.payloadResponseCounts,
        batchDiagnostics: renderPayloadQueue.batchDiagnostics,
        hangingPlaceableProcessBatch: placeableProcessBatch?.hangingRequests?.[0] ?? null,
        hangingPlaceableProcessBatchItemSamples: placeableProcessBatch?.hangingRequestItemSamples ?? [],
        pendingMissingPayloadCount: missingPayloadCount,
        suppressedFailureCode: PLC_DOR_RENDER_CLASSIFICATION.missingPayload.code,
      },
    });
  }
  if (missingPayloadCount > 0 && !queueInProgress) {
    add(PLC_DOR_RENDER_CLASSIFICATION.missingPayload, {
      severity: "blocker",
      count: missingPayloadCount,
      source: "placeholderReasonCounts.missing-payload",
      summary: `Area PLC/DOR renderer has ${missingPayloadCount}/${total ?? "unknown"} final missing render payloads after queue-in-progress checks.`,
      userVisibleBlocker: `Area PLC/DOR render payloads are missing after the queue is not in progress: ${missingPayloadCount}/${total ?? "unknown"}.`,
      sampleObjectIds: sampleReasonIds(reasonIds, "missing-payload"),
      evidence: {
        contractBoundary: "frontend/backend render payload flow",
        queueInProgress: false,
        finalMissingPayload: true,
        batchRequestCounts: renderPayloadQueue.batchRequestCounts,
        payloadResponseCounts: renderPayloadQueue.payloadResponseCounts,
        batchDiagnostics: renderPayloadQueue.batchDiagnostics,
      },
    });
  }

  const payloadMissingModelUrlCount = reasonCount(reasonCounts, "payload-missing-model-url");
  if (payloadMissingModelUrlCount > 0) {
    add(PLC_DOR_RENDER_CLASSIFICATION.payloadMissingModelUrl, {
      severity: "blocker",
      count: payloadMissingModelUrlCount,
      source: "placeholderReasonCounts.payload-missing-model-url",
      summary: `Area PLC/DOR renderer has ${payloadMissingModelUrlCount} render payloads without model URLs.`,
      sampleObjectIds: sampleReasonIds(reasonIds, "payload-missing-model-url"),
      evidence: {
        contractBoundary: "backend render payload contains no web-renderable model URL",
      },
    });
  }

  const nonrenderableUserEvidence = detectNonrenderableUserPlaceableEvidence(snapshot);
  if (nonrenderableUserEvidence.detected) {
    add(PLC_DOR_RENDER_CLASSIFICATION.nonrenderableUserPlaceable, {
      severity: "blocker",
      count: nonrenderableUserEvidence.count,
      source: nonrenderableUserEvidence.source,
      summary: "Area PLC/DOR renderer includes USER/reserved placeables.2da entries that are exact-source nonrenderable placeholders.",
      sampleObjectIds: nonrenderableUserEvidence.sampleObjectIds,
      evidence: nonrenderableUserEvidence.evidence,
    });
  }

  const assetContractBlockedCount = reasonCount(reasonCounts, "asset-contract-blocked");
  if (assetContractBlockedCount > 0) {
    const missingDerivedGlbEvidence = detectMissingDerivedGlbEvidence(snapshot);
    add(
      missingDerivedGlbEvidence.detected
        ? PLC_DOR_RENDER_CLASSIFICATION.missingDerivedGlb
        : PLC_DOR_RENDER_CLASSIFICATION.assetPipelineBlocked,
      {
        severity: "blocker",
        count: assetContractBlockedCount,
        source: "placeholderReasonCounts.asset-contract-blocked",
        summary: missingDerivedGlbEvidence.detected
          ? `Area PLC/DOR renderer has ${assetContractBlockedCount} missing derived GLB asset blockers.`
          : `Area PLC/DOR renderer has ${assetContractBlockedCount} asset pipeline blockers without derived GLB evidence in the snapshot.`,
        sampleObjectIds: sampleReasonIds(reasonIds, "asset-contract-blocked"),
        evidence: missingDerivedGlbEvidence.detected
          ? missingDerivedGlbEvidence.evidence
          : {
              missingSpecificDerivedGlbEvidence: true,
              expectedEvidenceKeys: ["expectedDerivedModelObjectKey", "__aurora/derived/models/", ".glb"],
            },
      },
    );
  }

  const modelLoadFailedCount = reasonCount(reasonCounts, "model-load-failed");
  if (modelLoadFailedCount > 0) {
    add(PLC_DOR_RENDER_CLASSIFICATION.modelLoadFailed, {
      severity: "blocker",
      count: modelLoadFailedCount,
      source: "placeholderReasonCounts.model-load-failed",
      summary: `Area PLC/DOR renderer has ${modelLoadFailedCount} model load failures.`,
      sampleObjectIds: sampleReasonIds(reasonIds, "model-load-failed"),
    });
  }

  if ((renderedPayloadCount ?? 0) > 0) {
    add(PLC_DOR_RENDER_CLASSIFICATION.renderedPayloadReady, {
      severity: "evidence",
      count: renderedPayloadCount,
      source: "modelReadyCount",
      summary: `Area PLC/DOR renderer has ${renderedPayloadCount} real rendered payloads with model URLs.`,
      sampleObjectIds: [],
      evidence: {
        payloadBoundCount: snapshot.payloadBoundCount ?? null,
        modelReadyCount: snapshot.modelReadyCount ?? null,
      },
    });
  }

  return classifications;
}

function summarizeRenderPayloadQueue(runtimeActionabilitySummary, networkCaptureSummary = null) {
  const batchDiagnostics = summarizeBatchNetworkDiagnostics(networkCaptureSummary);
  if (!runtimeActionabilitySummary || typeof runtimeActionabilitySummary !== "object") {
    const hasNetworkBatchEvidence =
      batchDiagnostics.placeableProcessBatch.requestCount > 0 ||
      batchDiagnostics.placeableAssetContractsBatch.requestCount > 0;
    const hasInFlightBatch =
      batchDiagnostics.placeableProcessBatch.inFlightRequestCount > 0 ||
      batchDiagnostics.placeableAssetContractsBatch.inFlightRequestCount > 0;
    return {
      present: hasNetworkBatchEvidence,
      status: hasInFlightBatch ? "in_progress" : null,
      loaded: null,
      total: null,
      remaining: null,
      firstErrorReason: batchDiagnostics.firstErrorReason,
      queueRequestCounts: null,
      batchRequestCounts: buildBatchRequestCounts(null, null, batchDiagnostics),
      payloadResponseCounts: null,
      batchDiagnostics,
    };
  }

  const queue = runtimeActionabilitySummary.queue ?? null;
  const queueRequestCounts = runtimeActionabilitySummary.queueRequestCounts ?? null;
  const payloadResponseCounts = runtimeActionabilitySummary.payloadResponseCounts ?? null;
  const normalizedPayloadResponseCounts = normalizePayloadResponseCounts(payloadResponseCounts);
  const loaded = numberOrNull(queue?.loaded ?? queueRequestCounts?.overlayLoaded);
  const total = numberOrNull(queue?.total ?? queueRequestCounts?.overlayTotal);
  const remaining =
    numberOrNull(queue?.remaining ?? queueRequestCounts?.overlayRemaining) ??
    (loaded !== null && total !== null ? Math.max(0, total - loaded) : null);
  const firstErrorReason = runtimeActionabilitySummary.firstErrorReason ?? null;
  const inProgress =
    firstErrorReason?.code === PLC_DOR_RENDER_CLASSIFICATION.renderPayloadQueueInProgress.code ||
    queue?.status === "in_progress" ||
    (remaining ?? 0) > 0;

  return {
    present: Boolean(queue || queueRequestCounts || payloadResponseCounts || firstErrorReason),
    status: inProgress ? "in_progress" : queue?.status ?? null,
    loaded,
    total,
    remaining,
    text: queue?.text ?? null,
    firstErrorReason,
    queueRequestCounts: normalizeQueueRequestCounts(queueRequestCounts),
    batchRequestCounts: buildBatchRequestCounts(queueRequestCounts, normalizedPayloadResponseCounts, batchDiagnostics),
    payloadResponseCounts: normalizedPayloadResponseCounts,
    batchDiagnostics,
  };
}

function buildBatchRequestCounts(queueRequestCounts, payloadResponseCounts, batchDiagnostics) {
  return {
    placeableProcessBatchRequests: numberOrZero(
      queueRequestCounts?.placeableProcessBatchRequests ??
        batchDiagnostics.placeableProcessBatch.requestCount,
    ),
    placeableProcessBatchRequestedItems: numberOrZero(
      queueRequestCounts?.placeableProcessBatchRequestedItems ??
        batchDiagnostics.placeableProcessBatch.requestedItemCount,
    ),
    placeableProcessBatchResponses: numberOrZero(
      payloadResponseCounts?.placeableProcessBatchResponses ??
        batchDiagnostics.placeableProcessBatch.responseCount,
    ),
    placeableProcessBatchResponseItems: numberOrZero(
      payloadResponseCounts?.placeableProcessBatchResponseItems ??
        batchDiagnostics.placeableProcessBatch.responseItemCount,
    ),
    placeableProcessBatchFailedRequests: numberOrZero(
      payloadResponseCounts?.placeableProcessBatchFailedRequests ??
        batchDiagnostics.placeableProcessBatch.failedRequestCount,
    ),
    placeableProcessBatchInFlightRequests: numberOrZero(
      queueRequestCounts?.placeableProcessBatchInFlightRequests ??
        batchDiagnostics.placeableProcessBatch.inFlightRequestCount,
    ),
    placeableProcessBatchInFlightRequestedItems: numberOrZero(
      queueRequestCounts?.placeableProcessBatchInFlightRequestedItems ??
        batchDiagnostics.placeableProcessBatch.inFlightRequestedItemCount,
    ),
    placeableProcessBatchOldestInFlightAgeMs: numberOrNull(
      queueRequestCounts?.placeableProcessBatchOldestInFlightAgeMs ??
        batchDiagnostics.placeableProcessBatch.oldestInFlightAgeMs,
    ),
    placeableAssetContractsBatchRequests: numberOrZero(
      queueRequestCounts?.placeableAssetContractsBatchRequests ??
        batchDiagnostics.placeableAssetContractsBatch.requestCount,
    ),
    placeableAssetContractsBatchRequestedItems: numberOrZero(
      queueRequestCounts?.placeableAssetContractsBatchRequestedItems ??
        batchDiagnostics.placeableAssetContractsBatch.requestedItemCount,
    ),
    placeableAssetContractsBatchResponses: numberOrZero(
      payloadResponseCounts?.placeableAssetContractsBatchResponses ??
        batchDiagnostics.placeableAssetContractsBatch.responseCount,
    ),
    placeableAssetContractsBatchResponseItems: numberOrZero(
      payloadResponseCounts?.placeableAssetContractsBatchResponseItems ??
        batchDiagnostics.placeableAssetContractsBatch.responseItemCount,
    ),
    placeableAssetContractsBatchFailedRequests: numberOrZero(
      payloadResponseCounts?.placeableAssetContractsBatchFailedRequests ??
        batchDiagnostics.placeableAssetContractsBatch.failedRequestCount,
    ),
    placeableAssetContractsBatchInFlightRequests: numberOrZero(
      queueRequestCounts?.placeableAssetContractsBatchInFlightRequests ??
        batchDiagnostics.placeableAssetContractsBatch.inFlightRequestCount,
    ),
    placeableAssetContractsBatchInFlightRequestedItems: numberOrZero(
      queueRequestCounts?.placeableAssetContractsBatchInFlightRequestedItems ??
        batchDiagnostics.placeableAssetContractsBatch.inFlightRequestedItemCount,
    ),
    placeableAssetContractsBatchOldestInFlightAgeMs: numberOrNull(
      queueRequestCounts?.placeableAssetContractsBatchOldestInFlightAgeMs ??
        batchDiagnostics.placeableAssetContractsBatch.oldestInFlightAgeMs,
    ),
  };
}

function normalizeQueueRequestCounts(counts) {
  if (!counts || typeof counts !== "object") {
    return null;
  }
  return {
    overlayLoaded: numberOrNull(counts.overlayLoaded),
    overlayTotal: numberOrNull(counts.overlayTotal),
    overlayRemaining: numberOrNull(counts.overlayRemaining),
    placeableProcessBatchRequests: numberOrZero(counts.placeableProcessBatchRequests),
    placeableProcessBatchRequestedItems: numberOrZero(counts.placeableProcessBatchRequestedItems),
    placeableProcessBatchInFlightRequests: numberOrZero(counts.placeableProcessBatchInFlightRequests),
    placeableProcessBatchInFlightRequestedItems: numberOrZero(counts.placeableProcessBatchInFlightRequestedItems),
    placeableProcessBatchOldestInFlightAgeMs: numberOrNull(counts.placeableProcessBatchOldestInFlightAgeMs),
    placeableAssetContractsBatchRequests: numberOrZero(counts.placeableAssetContractsBatchRequests),
    placeableAssetContractsBatchRequestedItems: numberOrZero(counts.placeableAssetContractsBatchRequestedItems),
    placeableAssetContractsBatchInFlightRequests: numberOrZero(counts.placeableAssetContractsBatchInFlightRequests),
    placeableAssetContractsBatchInFlightRequestedItems: numberOrZero(counts.placeableAssetContractsBatchInFlightRequestedItems),
    placeableAssetContractsBatchOldestInFlightAgeMs: numberOrNull(counts.placeableAssetContractsBatchOldestInFlightAgeMs),
  };
}

function normalizePayloadResponseCounts(counts) {
  if (!counts || typeof counts !== "object") {
    return null;
  }
  return {
    placeableProcessBatchResponses: numberOrZero(counts.placeableProcessBatchResponses),
    placeableProcessBatchResponseItems: numberOrZero(counts.placeableProcessBatchResponseItems),
    placeableProcessBatchFailedRequests: numberOrZero(counts.placeableProcessBatchFailedRequests),
    placeableAssetContractsBatchResponses: numberOrZero(counts.placeableAssetContractsBatchResponses),
    placeableAssetContractsBatchResponseItems: numberOrZero(counts.placeableAssetContractsBatchResponseItems),
    placeableAssetContractsBatchFailedRequests: numberOrZero(counts.placeableAssetContractsBatchFailedRequests),
    unsupportedCount: numberOrZero(counts.unsupportedCount),
    userResRefLikeCount: numberOrZero(counts.userResRefLikeCount),
    missingDerivedCount: numberOrZero(counts.missingDerivedCount),
    renderedModelUrlCount: numberOrZero(counts.renderedModelUrlCount),
    renderPackageStatusCounts: counts.renderPackageStatusCounts ?? {},
  };
}

function summarizeBatchNetworkDiagnostics(networkCaptureSummary) {
  const groups = networkCaptureSummary?.groups ?? {};
  return {
    source: networkCaptureSummary ? "networkCaptureSummary" : "missing",
    observedRequestCount: numberOrZero(networkCaptureSummary?.observedRequestCount),
    firstErrorReason: networkCaptureSummary?.firstErrorReason ?? null,
    placeableProcessBatch: summarizeBatchNetworkGroupDiagnostics(groups.placeableProcessBatch),
    placeableAssetContractsBatch: summarizeBatchNetworkGroupDiagnostics(groups.placeableAssetContractsBatch),
  };
}

function summarizeBatchNetworkGroupDiagnostics(group) {
  if (!group || typeof group !== "object") {
    return {
      present: false,
      requestCount: 0,
      requestedItemCount: 0,
      responseCount: 0,
      responseItemCount: 0,
      failedRequestCount: 0,
      inFlightRequestCount: 0,
      inFlightRequestedItemCount: 0,
      oldestInFlightAgeMs: null,
      firstErrorReason: null,
      responseStatusCounts: {},
      hangingRequests: [],
      hangingRequestItemSamples: [],
    };
  }

  const firstRequests = Array.isArray(group.firstRequests) ? group.firstRequests : [];
  const hangingRequests = firstRequests
    .map((request, requestOrdinal) => ({
      ...request,
      requestOrdinal,
    }))
    .filter((request) => request?.inFlight === true)
    .slice(0, 4)
    .map((request) => summarizeBatchRequestForDiagnostics(request, request.requestOrdinal));
  const hangingRequestItemSamples = hangingRequests.flatMap((request) =>
    request.requestItemSample.map((item) => ({
      ...item,
      requestOrdinal: request.requestOrdinal,
    })),
  );
  const fallbackRequestItemSamples =
    hangingRequestItemSamples.length > 0
      ? []
      : (Array.isArray(group.requestItemSample) ? group.requestItemSample : [])
          .slice(0, 12)
          .map((item) => summarizeBatchRequestItemForDiagnostics(item, "requestItemSample_fallback_no_inflight_first_request"));

  return {
    present: true,
    requestCount: numberOrZero(group.requestCount),
    requestedItemCount: numberOrZero(group.requestedItemCount),
    responseCount: numberOrZero(group.responseCount),
    responseItemCount: numberOrZero(group.responseItemCount),
    failedRequestCount: numberOrZero(group.failedRequestCount),
    inFlightRequestCount: numberOrZero(group.inFlightRequestCount),
    inFlightRequestedItemCount: numberOrZero(group.inFlightRequestedItemCount),
    oldestInFlightAgeMs: numberOrNull(group.oldestInFlightAgeMs),
    firstErrorReason: group.firstErrorReason ?? null,
    responseStatusCounts: group.responseStatusCounts ?? {},
    hangingRequests,
    hangingRequestItemSamples:
      hangingRequestItemSamples.length > 0 ? hangingRequestItemSamples.slice(0, 12) : fallbackRequestItemSamples,
  };
}

function summarizeBatchRequestForDiagnostics(request, fallbackOrdinal) {
  const requestOrdinal = numberOrNull(request?.requestOrdinal) ?? fallbackOrdinal;
  return {
    requestOrdinal,
    urlPath: summarizeUrlPath(request?.url),
    method: request?.method ?? null,
    status: request?.status ?? null,
    requestedItemCount: numberOrNull(request?.requestedItemCount),
    responseItemCount: numberOrNull(request?.responseItemCount),
    elapsedMs: numberOrNull(request?.elapsedMs),
    inFlight: request?.inFlight === true,
    inFlightAgeMs: numberOrNull(request?.inFlightAgeMs),
    errorReason: request?.errorReason ?? null,
    postDataPayloadKeys: Array.isArray(request?.postDataPayloadKeys) ? request.postDataPayloadKeys : [],
    requestItemSample: (Array.isArray(request?.requestItemSample) ? request.requestItemSample : [])
      .slice(0, 8)
      .map((item) => summarizeBatchRequestItemForDiagnostics(item, "hanging_first_request")),
  };
}

function summarizeUrlPath(url) {
  if (!url) {
    return null;
  }
  try {
    return new URL(url).pathname;
  } catch {
    return String(url);
  }
}

function summarizeBatchRequestItemForDiagnostics(item, source) {
  return {
    source,
    requestOrdinal: numberOrNull(item?.requestOrdinal),
    index: numberOrNull(item?.index),
    key: item?.key === null || item?.key === undefined ? null : String(item.key),
    resref: item?.resref === null || item?.resref === undefined ? null : String(item.resref),
    templateId: item?.templateId === null || item?.templateId === undefined ? null : String(item.templateId),
    appearanceType: numberOrNull(item?.appearanceType),
    genericType: numberOrNull(item?.genericType),
    subtypeHint: item?.subtypeHint === null || item?.subtypeHint === undefined ? null : String(item.subtypeHint),
  };
}

function isRenderPayloadQueueInProgress(queue) {
  return (
    queue?.status === "in_progress" ||
    queue?.firstErrorReason?.code === PLC_DOR_RENDER_CLASSIFICATION.renderPayloadQueueInProgress.code ||
    (queue?.remaining ?? 0) > 0
  );
}

function formatQueueProgress(queue) {
  const loaded = queue?.loaded ?? "?";
  const total = queue?.total ?? "?";
  const remaining = queue?.remaining;
  return remaining === null || remaining === undefined ? `${loaded}/${total}` : `${loaded}/${total}, remaining ${remaining}`;
}

function formatBatchProgress(queue) {
  const counts = queue?.batchRequestCounts ?? {};
  const started = counts.placeableProcessBatchRequests ?? 0;
  const returned = counts.placeableProcessBatchResponses ?? 0;
  const inFlight = counts.placeableProcessBatchInFlightRequests ?? 0;
  const requestedItems = counts.placeableProcessBatchRequestedItems ?? 0;
  const responseItems = counts.placeableProcessBatchResponseItems ?? 0;
  const inFlightItems = counts.placeableProcessBatchInFlightRequestedItems ?? 0;
  const age = counts.placeableProcessBatchOldestInFlightAgeMs;
  const ageText = age === null || age === undefined ? "" : `, oldest in-flight ${age}ms`;
  return `process/batch started ${started}, returned ${returned}, in-flight ${inFlight}, items ${responseItems}/${requestedItems}, in-flight items ${inFlightItems}${ageText}`;
}

function detectNonrenderableUserPlaceableEvidence(snapshot) {
  const evidenceRecords = collectObjectsWithMetadata(snapshot, (metadata) => {
    const source2da = readMetadataText(metadata, "source2da").toLowerCase();
    const placeholderKind = readMetadataText(metadata, "placeholderKind").toLowerCase();
    const renderAuditEligibility = readMetadataText(metadata, "renderAuditEligibility").toLowerCase();
    const renderAuditExcludeReason = readMetadataText(metadata, "renderAuditExcludeReason").toLowerCase();
    const reservedModelResRef = readMetadataText(metadata, "reservedModelResRef").toLowerCase();
    return (
      source2da === "placeables.2da" &&
      (placeholderKind === "reserved_placeables_2da_row" ||
        renderAuditEligibility === "non_renderable_placeholder" ||
        renderAuditExcludeReason === "reserved_placeables_2da_model" ||
        reservedModelResRef === "user" ||
        reservedModelResRef === "reserved")
    );
  });
  if (evidenceRecords.length > 0) {
    return {
      detected: true,
      count: evidenceRecords.length,
      source: "placeable.metadata.source2da",
      sampleObjectIds: evidenceRecords.map((record) => record.id).filter(Boolean).slice(0, 12),
      evidence: {
        source2da: "placeables.2da",
        exactSourceBlocker: "USER/reserved non-renderable placeholder",
        samples: evidenceRecords.slice(0, 3),
      },
    };
  }

  const text = safeStringify(snapshot).toLowerCase();
  const detected =
    text.includes("placeables.2da") &&
    (text.includes("non_renderable_placeholder") ||
      text.includes("reserved_placeables_2da_row") ||
      text.includes("reserved_placeables_2da_model") ||
      text.includes('"user"'));
  return {
    detected,
    count: detected ? 1 : 0,
    source: "snapshot_text_scan",
    sampleObjectIds: [],
    evidence: detected
      ? {
          source2da: "placeables.2da",
          exactSourceBlocker: "USER/reserved non-renderable placeholder",
        }
      : null,
  };
}

function detectMissingDerivedGlbEvidence(snapshot) {
  const evidenceRecords = collectObjectsWithMetadata(snapshot, (metadata) => {
    const expectedObjectKey = readMetadataText(metadata, "expectedDerivedModelObjectKey").toLowerCase();
    const objectKey = readMetadataText(metadata, "objectKey").toLowerCase();
    const renderModelObjectKey = readMetadataText(metadata, "renderModelObjectKey").toLowerCase();
    return [expectedObjectKey, objectKey, renderModelObjectKey].some(
      (value) => value.includes("__aurora/derived/models/") && value.endsWith(".glb"),
    );
  });
  if (evidenceRecords.length > 0) {
    return {
      detected: true,
      evidence: {
        expectedDerivedModelObjectKey: true,
        samples: evidenceRecords.slice(0, 3),
      },
    };
  }

  const text = safeStringify(snapshot).toLowerCase();
  const detected =
    (text.includes("expectedderivedmodelobjectkey") ||
      text.includes("__aurora/derived/models/") ||
      text.includes("derived model glb") ||
      text.includes("missing derived")) &&
    text.includes(".glb");
  return {
    detected,
    evidence: detected
      ? {
          expectedDerivedModelObjectKey: text.includes("expectedderivedmodelobjectkey"),
          derivedModelObjectKey: text.includes("__aurora/derived/models/"),
          extension: ".glb",
        }
      : null,
  };
}

function collectObjectsWithMetadata(value, predicate, records = []) {
  if (!value || typeof value !== "object" || records.length >= 24) {
    return records;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectObjectsWithMetadata(item, predicate, records);
      if (records.length >= 24) {
        break;
      }
    }
    return records;
  }

  const metadata = value.metadata;
  if (metadata && typeof metadata === "object" && predicate(metadata)) {
    records.push({
      id: typeof value.id === "string" ? value.id : typeof value.objectId === "string" ? value.objectId : null,
      metadata: pickEvidenceMetadata(metadata),
    });
  }

  for (const item of Object.values(value)) {
    collectObjectsWithMetadata(item, predicate, records);
    if (records.length >= 24) {
      break;
    }
  }
  return records;
}

function pickEvidenceMetadata(metadata) {
  const keys = [
    "source2da",
    "source2daRow",
    "source2daLabel",
    "placeholderKind",
    "renderAuditEligibility",
    "renderAuditExcludeReason",
    "reservedModelResRef",
    "expectedDerivedModelObjectKey",
    "renderModelObjectKey",
    "lookupModelResRef",
  ];
  return Object.fromEntries(keys.filter((key) => metadata[key] !== undefined).map((key) => [key, metadata[key]]));
}

function readMetadataText(metadata, key) {
  const value = metadata?.[key];
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value).trim() : "";
}

function reasonCount(reasonCounts, key, fallback = 0) {
  const value = Number(reasonCounts?.[key] ?? fallback ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function sampleReasonIds(reasonIds, key, fallback = []) {
  const value = reasonIds?.[key];
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).filter(Boolean).slice(0, 12);
  }
  if (typeof value === "string") {
    return value
      .split("|")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  if (Array.isArray(fallback)) {
    return fallback.map((entry) => String(entry)).filter(Boolean).slice(0, 12);
  }
  if (typeof fallback === "string") {
    return fallback
      .split("|")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  return [];
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function numberOrZero(value) {
  return numberOrNull(value) ?? 0;
}

function safeStringify(value) {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return "";
  }
}

function isGenericVisibleRuntimeBlocker(code) {
  return ["first_visible_blocker", "blocked", "area-mass-primitive-fallback-render-suppressed"].includes(String(code ?? ""));
}

function summarizeRuntimeEvidenceArtifact(artifact) {
  if (!artifact) {
    return null;
  }
  const frame = artifact.json ?? null;
  const terrainSnapshot = frame?.terrainTileModelSnapshot ?? frame?.domStatus?.terrainTileModelSnapshot ?? null;
  const tileProcessSnapshot = frame?.tileProcessRuntimeSnapshot ?? frame?.domStatus?.tileProcessRuntimeSnapshot ?? null;
  return {
    path: artifact.path,
    exists: artifact.exists,
    mtime: artifact.mtime,
    parseError: artifact.parseError,
    status: frame?.status ?? null,
    capturedAt: frame?.capturedAt ?? null,
    areaQuery: frame?.areaQuery ?? null,
    screenshotBytes: frame?.screenshotBytes ?? null,
    terrainStatus: terrainSnapshot?.status ?? null,
    tileProcessStatus: tileProcessSnapshot?.status ?? null,
    canonicalParityPromoted: frame?.canonicalParityPromoted ?? null,
    localOnlyNotRetailEvidence: frame?.localOnlyNotRetailEvidence ?? null,
  };
}

function addRuntimeBlockerIfNeeded(laneBlockers, code, snapshot) {
  if (!snapshot) {
    laneBlockers.push({ code, status: "missing", blockerSummary: "snapshot_missing" });
    return;
  }
  const blockerSummary = snapshot.blockerSummary ?? null;
  if (snapshot.status !== "ready" || (blockerSummary && blockerSummary !== "none")) {
    laneBlockers.push({
      code,
      status: snapshot.status ?? null,
      blockerSummary,
    });
  }
}

function normalizeBlockerCode(value) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function resolveLaneStatus({ commandExitCode, parsedStatus, blockerCount }) {
  if (parsedStatus === "ready" && blockerCount === 0) {
    return "ready";
  }
  if (parsedStatus === "partial") {
    return "partial";
  }
  if (commandExitCode !== 0 || blockerCount > 0 || parsedStatus === "blocked" || parsedStatus === "error") {
    return "blocked";
  }
  return parsedStatus ?? "unknown";
}

function addBlocker(lane, code, details) {
  blockers.push({
    lane,
    code,
    details: details ?? null,
  });
}

function validateOwnSummaryFormat(value) {
  const errors = [];
  if (value.version !== VERSION) {
    errors.push("version");
  }
  if (typeof value.generatedAt !== "string" || Number.isNaN(Date.parse(value.generatedAt))) {
    errors.push("generatedAt");
  }
  if (value.target?.areaId !== TARGET.areaId || value.target?.areaResRef !== TARGET.areaResRef) {
    errors.push("target");
  }
  if (!["ready", "blocked"].includes(value.status)) {
    errors.push("status");
  }
  for (const key of ["contractGate", "tileSourceAudit", "runtimeCapture", "retailToolsetOracle"]) {
    if (!value[key] || typeof value[key] !== "object") {
      errors.push(key);
    }
  }
  if (!Array.isArray(value.blockers)) {
    errors.push("blockers");
  }
  return errors;
}

function normalizeEndpoint(value) {
  const endpoint = String(value ?? "").trim().replace(/\/+$/u, "");
  return endpoint.length > 0 ? endpoint : null;
}

function isSeaweedfsEndpoint(endpoint) {
  if (!endpoint) {
    return false;
  }
  try {
    return new URL(endpoint).hostname.toLowerCase() === "seaweedfs";
  } catch {
    return endpoint.toLowerCase().includes("seaweedfs");
  }
}

function repoRelativePath(absolutePath) {
  return relative(repoRoot, absolutePath).replace(/\\/gu, "/");
}

function tail(value) {
  const text = String(value ?? "");
  return text.length <= MAX_CAPTURED_OUTPUT_CHARS ? text : text.slice(-MAX_CAPTURED_OUTPUT_CHARS);
}

function formatEndpointProbeError(error) {
  const cause = error?.cause;
  return {
    name: error instanceof Error ? error.name : typeof error,
    message: error instanceof Error ? error.message : String(error),
    code: typeof error?.code === "string" ? error.code : typeof cause?.code === "string" ? cause.code : null,
    errno: typeof cause?.errno === "number" ? cause.errno : null,
    syscall: typeof cause?.syscall === "string" ? cause.syscall : null,
    hostname: typeof cause?.hostname === "string" ? cause.hostname : null,
  };
}

function formatErrorForReport(error) {
  return {
    name: error instanceof Error ? error.name : typeof error,
    message: error instanceof Error ? error.message : String(error),
    code: typeof error?.code === "string" ? error.code : null,
  };
}
