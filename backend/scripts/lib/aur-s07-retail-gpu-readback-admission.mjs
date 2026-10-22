import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";

const SHA256 = /^[a-f0-9]{64}$/;
const REQUIRED_VERTEX_INPUTS = Object.freeze(["vPos", "vColor", "vTcIn"]);
const REQUIRED_UNIFORMS = Object.freeze(["m_mv", "m_view_inv", "m_texture"]);
const REQUIRED_PIPELINE = Object.freeze(["program", "material"]);
const REQUIRED_CPU_CORRELATION = Object.freeze(["emitterCenter", "particleCenter", "explicitAbsence"]);

export function validateRetailGpuReadbackBootstrapProfile(profile) {
  failIf(!isRecord(profile), "root_invalid");
  failIf(profile.version !== "aur-s07-retail-gpu-readback-profile/v1", "version_invalid");
  failIf(!nonEmpty(profile.id), "id_invalid");

  const tool = profile.captureTool;
  failIf(!isRecord(tool) || tool.kind !== "renderdoc", "capture_tool_invalid");
  validateFileBinding(tool.executablePath, tool.executableSha256, "capture_tool");
  failIf(!nonEmpty(tool.version), "capture_tool_version_invalid");
  failIf(tool.architecture !== "x64", "capture_tool_architecture_invalid");

  const target = profile.target;
  failIf(!isRecord(target) || target.processName !== "nwmain.exe", "target_invalid");
  validateFileBinding(target.executablePath, target.executableSha256, "target_executable");
  failIf(!nonEmpty(target.fileVersion), "target_file_version_invalid");

  const module = profile.module;
  failIf(!isRecord(module) || !nonEmpty(module.area), "module_invalid");
  validateFileBinding(module.path, module.sha256, "module");

  failIf(!Array.isArray(profile.orderedHakList), "ordered_hak_list_invalid");
  profile.orderedHakList.forEach((hak, index) => {
    failIf(!isRecord(hak) || hak.order !== index || !nonEmpty(hak.name), "ordered_hak_entry_invalid");
    validateFileBinding(hak.path, hak.sha256, "ordered_hak_entry");
  });

  failIf(!Array.isArray(profile.resources) || profile.resources.length === 0, "resources_invalid");
  profile.resources.forEach((resource) => {
    failIf(!isRecord(resource) || !nonEmpty(resource.resref) || !nonEmpty(resource.type), "resource_entry_invalid");
    validateFileBinding(resource.path, resource.sha256, "resource_entry");
  });

  const display = profile.display;
  failIf(!isRecord(display) || display.logicalTarget !== "screen2" || display.primary !== false || !nonEmpty(display.expectedDevice), "display_invalid");

  const fixture = profile.fixture;
  failIf(!isRecord(fixture) || !finiteNumber(fixture.localPhase), "fixture_phase_invalid");
  failIf(!Array.isArray(fixture.instances) || fixture.instances.length !== 2, "fixture_instance_count_invalid");
  const [first, second] = fixture.instances;
  for (const instance of fixture.instances) validateFixtureInstance(instance);
  failIf(first.id === second.id, "fixture_instance_id_duplicate");
  failIf(equalTuple(first.position, second.position), "fixture_positions_not_distinct");
  failIf(first.yawDegrees === second.yawDegrees, "fixture_yaws_not_distinct");
  failIf(JSON.stringify(fixture.instances.map((instance) => instance.scale).sort((a, b) => a - b)) !== "[1,2]", "fixture_scales_invalid");

  const observation = profile.requiredObservation;
  failIf(!isRecord(observation), "required_observation_invalid");
  requireExactSet(observation.vertexInputs, REQUIRED_VERTEX_INPUTS, "vertex_inputs");
  requireExactSet(observation.uniforms, REQUIRED_UNIFORMS, "uniforms");
  requireExactSet(observation.pipeline, REQUIRED_PIPELINE, "pipeline");
  requireExactSet(observation.cpuCorrelation, REQUIRED_CPU_CORRELATION, "cpu_correlation");

  const ownership = profile.ownership;
  failIf(!isRecord(ownership) || ownership.owner !== "AUR-S07 central retail GPU readback route", "ownership_invalid");
  for (const field of ["admissionLeasePath", "cancellationReceiptPath", "recoveryReceiptPath"]) {
    failIf(!nonEmpty(ownership[field]), `ownership_${field}_invalid`);
  }

  const resume = profile.resume;
  failIf(!isRecord(resume), "resume_invalid");
  for (const field of ["manifestPath", "capturePath", "readbackPath"]) {
    failIf(!nonEmpty(resume[field]), `resume_${field}_invalid`);
  }

  return profile;
}

// Compatibility export for callers created before the bootstrap/live split.
export function validateRetailGpuReadbackProfile(profile) {
  return validateRetailGpuReadbackBootstrapProfile(profile);
}

export function validateRetailGpuReadbackLiveBinding(binding) {
  failLiveIf(!isRecord(binding), "root_invalid");
  failLiveIf(binding.version !== "aur-s07-retail-gpu-readback-live-binding/v1", "version_invalid");
  validateRuntimeIdentity(binding.runtimeIdentity, failLiveIf);

  const context = binding.graphicsContext;
  failLiveIf(!isRecord(context) || context.api !== "OpenGL", "graphics_context_api_invalid");
  failLiveIf(!["observed", "not-observed"].includes(context.status), "graphics_context_status_invalid");
  failLiveIf(!["core", "compatibility", "unknown"].includes(context.profile), "graphics_context_profile_invalid");
  failLiveIf(!Array.isArray(context.evidenceLines) || context.evidenceLines.some((line) => !nonEmpty(line)), "graphics_context_evidence_invalid");
  if (context.status === "observed") {
    failLiveIf(typeof context.version !== "string" || !/^\d+\.\d+$/.test(context.version), "graphics_context_version_invalid");
    failLiveIf(context.evidenceLines.length === 0, "graphics_context_evidence_missing");
  } else {
    failLiveIf(context.version !== null || context.profile !== "unknown" || context.evidenceLines.length !== 0, "graphics_context_not_observed_invalid");
  }
  return binding;
}

export function classifyRenderDocOpenGlContext(logText) {
  if (typeof logText !== "string") throw new Error("retail_gpu_readback_context_log_invalid");
  const evidenceLines = logText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /\bOpenGL\b/i.test(line) && /\b\d+\.\d+\b/.test(line));
  if (evidenceLines.length === 0) {
    return {
      status: "not-observed",
      api: "OpenGL",
      version: null,
      profile: "unknown",
      evidenceLines: [],
    };
  }

  const explicitCore = evidenceLines.some((line) => /\bcore\s+profile\b/i.test(line));
  const explicitCompatibility = evidenceLines.some((line) => /\bcompatibility\s+profile\b/i.test(line));
  const versionMatch = evidenceLines[0].match(/\b(\d+\.\d+)\b/);
  return {
    status: "observed",
    api: "OpenGL",
    version: versionMatch?.[1] ?? null,
    profile: explicitCore && !explicitCompatibility
      ? "core"
      : explicitCompatibility && !explicitCore
        ? "compatibility"
        : "unknown",
    evidenceLines,
  };
}

export function buildRetailGpuReadbackContextDiscoveryPlan(profile, runtimeIdentity) {
  validateRetailGpuReadbackBootstrapProfile(profile);
  validateRuntimeIdentity(runtimeIdentity, failIf);
  return {
    version: "aur-s07-retail-gpu-readback-context-discovery-plan/v1",
    profileId: profile.id,
    exactTarget: {
      pid: runtimeIdentity.pid,
      startedAtUtc: runtimeIdentity.startedAtUtc,
      hwnd: runtimeIdentity.hwnd,
      executableSha256: profile.target.executableSha256,
    },
    command: [
      profile.captureTool.executablePath,
      "inject",
      `--PID=${runtimeIdentity.pid}`,
      `--capture-file=${profile.resume.capturePath}`,
    ],
    contextExpectation: {
      api: "OpenGL",
      version: null,
      profile: "unknown",
      rule: "discover-and-record; do not default or require core before observation",
    },
    postInjectionAction: "obtain a capture through RenderDoc target control, then classify the exact RenderDoc log",
    safety: {
      executesCommand: false,
      launchesProcess: false,
      attachesToProcess: false,
      capturesFrame: false,
    },
  };
}

export function assessRetailGpuReadbackAdmission(profile, io = {}) {
  validateRetailGpuReadbackBootstrapProfile(profile);
  const fileExists = io.exists ?? existsSync;
  const read = io.readFile ?? readFileSync;
  const stat = io.stat ?? statSync;
  const blockers = [];

  checkBinding(profile.captureTool.executablePath, profile.captureTool.executableSha256, "renderdoc_executable", blockers, fileExists, read, stat);
  checkBinding(profile.target.executablePath, profile.target.executableSha256, "target_executable", blockers, fileExists, read, stat);
  checkBinding(profile.module.path, profile.module.sha256, "module", blockers, fileExists, read, stat);
  profile.orderedHakList.forEach((hak, index) => checkBinding(hak.path, hak.sha256, `ordered_hak_${index}`, blockers, fileExists, read, stat));
  profile.resources.forEach((resource, index) => checkBinding(resource.path, resource.sha256, `resource_${index}`, blockers, fileExists, read, stat));

  return {
    version: "aur-s07-retail-gpu-readback-admission/v1",
    profileId: profile.id,
    status: blockers.length === 0 ? "offline-admitted" : "blocked",
    blockers,
    exactTarget: {
      executableSha256: profile.target.executableSha256,
      moduleSha256: profile.module.sha256,
      orderedHakSha256: profile.orderedHakList.map((hak) => hak.sha256),
      resourceSha256: profile.resources.map((resource) => resource.sha256),
    },
    safety: {
      launchesProcess: false,
      attachesToProcess: false,
      capturesFrame: false,
      mutatesModuleOrHak: false,
      closesSession: false,
    },
  };
}

function checkBinding(path, expectedSha256, code, blockers, exists, read, stat) {
  if (!exists(path)) {
    blockers.push(`${code}_missing`);
    return;
  }
  try {
    if (!stat(path).isFile()) {
      blockers.push(`${code}_not_file`);
      return;
    }
    const actual = createHash("sha256").update(read(path)).digest("hex");
    if (actual !== expectedSha256) blockers.push(`${code}_hash_mismatch`);
  } catch {
    blockers.push(`${code}_unreadable`);
  }
}

function validateFileBinding(path, sha256, prefix) {
  failIf(!nonEmpty(path), `${prefix}_path_invalid`);
  failIf(typeof sha256 !== "string" || !SHA256.test(sha256), `${prefix}_sha256_invalid`);
}

function validateFixtureInstance(instance) {
  failIf(!isRecord(instance) || !nonEmpty(instance.id), "fixture_instance_invalid");
  failIf(!Array.isArray(instance.position) || instance.position.length !== 3 || instance.position.some((value) => !finiteNumber(value)), "fixture_instance_position_invalid");
  failIf(!finiteNumber(instance.yawDegrees), "fixture_instance_yaw_invalid");
  failIf(!finiteNumber(instance.scale), "fixture_instance_scale_invalid");
}

function requireExactSet(actual, expected, name) {
  failIf(!Array.isArray(actual) || actual.length !== expected.length, `required_observation_${name}_invalid`);
  failIf(expected.some((value) => !actual.includes(value)) || new Set(actual).size !== actual.length, `required_observation_${name}_invalid`);
}

function equalTuple(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function positiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateRuntimeIdentity(identity, fail) {
  fail(!isRecord(identity) || !positiveInteger(identity.pid) || !positiveInteger(identity.hwnd), "runtime_identity_invalid");
  fail(!nonEmpty(identity?.startedAtUtc) || Number.isNaN(Date.parse(identity.startedAtUtc)), "runtime_identity_started_at_invalid");
}

function failIf(condition, code) {
  if (condition) throw new Error(`retail_gpu_readback_profile_${code}`);
}

function failLiveIf(condition, code) {
  if (condition) throw new Error(`retail_gpu_readback_live_binding_${code}`);
}
