import { createHash } from "node:crypto";
import path from "node:path";

export const MATRIX_RUNTIME_BUILD_PROFILE_SCHEMA =
  "aurora-tile-add-connect-runtime-build-profile/v1";
export const MATRIX_RUNTIME_BUILD_BINDING_SCHEMA =
  "aurora-tile-add-connect-runtime-build-binding/v1";
export const MATRIX_RUNTIME_BUILD_PROFILE_MAX_BYTES = 64 * 1024;

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const IMAGE_DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const PROFILE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/u;
const TOKEN_MAX_LENGTH = 256;

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value, expected) {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function normalizedToken(value) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function validToken(value) {
  const token = normalizedToken(value);
  return token !== null && token.length <= TOKEN_MAX_LENGTH && !/[\u0000\r\n]/u.test(token);
}

function validIsoUtc(value) {
  const token = normalizedToken(value);
  return token !== null && token.endsWith("Z") && Number.isFinite(Date.parse(token));
}

function parseLoopbackOrigin(value) {
  const token = normalizedToken(value);
  if (!token) return null;
  try {
    const parsed = new URL(token);
    if (
      parsed.protocol !== "http:" ||
      parsed.hostname !== "127.0.0.1" ||
      !parsed.port ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash ||
      parsed.origin !== token
    ) {
      return null;
    }
    const port = Number(parsed.port);
    return Number.isInteger(port) && port >= 1 && port <= 65535
      ? { origin: parsed.origin, port }
      : null;
  } catch {
    return null;
  }
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalJson(value[key])])
  );
}

function sha256Json(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalJson(value)))
    .digest("hex");
}

function normalizeProfile(profile) {
  return {
    schema: normalizedToken(profile?.schema),
    profileId: normalizedToken(profile?.profileId),
    createdAt: normalizedToken(profile?.createdAt),
    frontend: {
      commit: normalizedToken(profile?.frontend?.commit),
      imageDigest: normalizedToken(profile?.frontend?.imageDigest)?.toLowerCase() ?? null,
      builtAt: normalizedToken(profile?.frontend?.builtAt),
      baseUrl: normalizedToken(profile?.frontend?.baseUrl)
    },
    backend: {
      commit: normalizedToken(profile?.backend?.commit),
      imageDigest: normalizedToken(profile?.backend?.imageDigest)?.toLowerCase() ?? null,
      builtAt: normalizedToken(profile?.backend?.builtAt),
      baseUrl: normalizedToken(profile?.backend?.baseUrl),
      contractVersion: normalizedToken(profile?.backend?.contractVersion),
      vfxRuntimeRevision: normalizedToken(profile?.backend?.vfxRuntimeRevision)
    }
  };
}

export function validateMatrixRuntimeBuildProfile(profile) {
  const errors = new Set();
  if (!isRecord(profile)) return ["MATRIX_RUNTIME_BUILD_PROFILE_MISSING"];
  let byteLength = Number.POSITIVE_INFINITY;
  try {
    byteLength = Buffer.byteLength(JSON.stringify(profile), "utf8");
  } catch {
    errors.add("MATRIX_RUNTIME_BUILD_PROFILE_NOT_SERIALIZABLE");
  }
  if (byteLength < 2 || byteLength > MATRIX_RUNTIME_BUILD_PROFILE_MAX_BYTES) {
    errors.add("MATRIX_RUNTIME_BUILD_PROFILE_BUDGET_EXCEEDED");
  }
  if (!exactKeys(profile, ["schema", "profileId", "createdAt", "frontend", "backend"])) {
    errors.add("MATRIX_RUNTIME_BUILD_PROFILE_KEYS_INVALID");
  }
  if (profile.schema !== MATRIX_RUNTIME_BUILD_PROFILE_SCHEMA) {
    errors.add("MATRIX_RUNTIME_BUILD_PROFILE_SCHEMA_UNSUPPORTED");
  }
  if (typeof profile.profileId !== "string" || !PROFILE_ID_PATTERN.test(profile.profileId)) {
    errors.add("MATRIX_RUNTIME_BUILD_PROFILE_ID_INVALID");
  }
  if (!validIsoUtc(profile.createdAt)) {
    errors.add("MATRIX_RUNTIME_BUILD_PROFILE_CREATED_AT_INVALID");
  }
  if (!exactKeys(profile.frontend, ["commit", "imageDigest", "builtAt", "baseUrl"])) {
    errors.add("MATRIX_RUNTIME_BUILD_PROFILE_FRONTEND_KEYS_INVALID");
  }
  if (!validToken(profile.frontend?.commit)) {
    errors.add("MATRIX_RUNTIME_BUILD_PROFILE_FRONTEND_COMMIT_INVALID");
  }
  if (!IMAGE_DIGEST_PATTERN.test(String(profile.frontend?.imageDigest ?? ""))) {
    errors.add("MATRIX_RUNTIME_BUILD_PROFILE_FRONTEND_IMAGE_DIGEST_INVALID");
  }
  if (!validIsoUtc(profile.frontend?.builtAt)) {
    errors.add("MATRIX_RUNTIME_BUILD_PROFILE_FRONTEND_BUILT_AT_INVALID");
  }
  const frontendOrigin = parseLoopbackOrigin(profile.frontend?.baseUrl);
  if (!frontendOrigin) {
    errors.add("MATRIX_RUNTIME_BUILD_PROFILE_FRONTEND_BASE_URL_INVALID");
  }
  if (
    !exactKeys(profile.backend, [
      "commit",
      "imageDigest",
      "builtAt",
      "baseUrl",
      "contractVersion",
      "vfxRuntimeRevision"
    ])
  ) {
    errors.add("MATRIX_RUNTIME_BUILD_PROFILE_BACKEND_KEYS_INVALID");
  }
  if (!validToken(profile.backend?.commit)) {
    errors.add("MATRIX_RUNTIME_BUILD_PROFILE_BACKEND_COMMIT_INVALID");
  }
  if (!IMAGE_DIGEST_PATTERN.test(String(profile.backend?.imageDigest ?? ""))) {
    errors.add("MATRIX_RUNTIME_BUILD_PROFILE_BACKEND_IMAGE_DIGEST_INVALID");
  }
  if (!validIsoUtc(profile.backend?.builtAt)) {
    errors.add("MATRIX_RUNTIME_BUILD_PROFILE_BACKEND_BUILT_AT_INVALID");
  }
  const backendOrigin = parseLoopbackOrigin(profile.backend?.baseUrl);
  if (!backendOrigin) {
    errors.add("MATRIX_RUNTIME_BUILD_PROFILE_BACKEND_BASE_URL_INVALID");
  }
  if (frontendOrigin && backendOrigin && frontendOrigin.port === backendOrigin.port) {
    errors.add("MATRIX_RUNTIME_BUILD_PROFILE_PORTS_NOT_DISTINCT");
  }
  if (!validToken(profile.backend?.contractVersion)) {
    errors.add("MATRIX_RUNTIME_BUILD_PROFILE_BACKEND_CONTRACT_VERSION_INVALID");
  }
  if (!validToken(profile.backend?.vfxRuntimeRevision)) {
    errors.add("MATRIX_RUNTIME_BUILD_PROFILE_BACKEND_VFX_RUNTIME_REVISION_INVALID");
  }
  return [...errors].sort((left, right) => left.localeCompare(right));
}

function bindingFingerprintPayload(binding) {
  return {
    schema: binding.schema,
    profile: binding.profile,
    frontend: binding.frontend,
    backend: binding.backend
  };
}

export function buildMatrixRuntimeBuildBinding({
  profile,
  profilePath,
  profileSha256
}) {
  const errors = validateMatrixRuntimeBuildProfile(profile);
  if (errors.length > 0) {
    throw new Error(`Invalid matrix runtime-build profile: ${errors.join(", ")}.`);
  }
  if (typeof profilePath !== "string" || !path.isAbsolute(profilePath) || profilePath.includes("\0")) {
    throw new Error("MATRIX_RUNTIME_BUILD_PROFILE_PATH_INVALID");
  }
  if (typeof profileSha256 !== "string" || !SHA256_PATTERN.test(profileSha256)) {
    throw new Error("MATRIX_RUNTIME_BUILD_PROFILE_SHA256_INVALID");
  }
  const normalized = normalizeProfile(profile);
  const unsigned = {
    schema: MATRIX_RUNTIME_BUILD_BINDING_SCHEMA,
    profile: {
      path: path.resolve(profilePath),
      sha256: profileSha256,
      schema: normalized.schema,
      profileId: normalized.profileId,
      createdAt: normalized.createdAt
    },
    frontend: normalized.frontend,
    backend: normalized.backend
  };
  return Object.freeze({
    ...unsigned,
    bindingSha256: sha256Json(unsigned)
  });
}

export function validateMatrixRuntimeBuildBinding(binding) {
  const errors = new Set();
  if (!isRecord(binding)) return ["MATRIX_RUNTIME_BUILD_BINDING_MISSING"];
  if (!exactKeys(binding, ["schema", "profile", "frontend", "backend", "bindingSha256"])) {
    errors.add("MATRIX_RUNTIME_BUILD_BINDING_KEYS_INVALID");
  }
  if (binding.schema !== MATRIX_RUNTIME_BUILD_BINDING_SCHEMA) {
    errors.add("MATRIX_RUNTIME_BUILD_BINDING_SCHEMA_UNSUPPORTED");
  }
  if (
    !exactKeys(binding.profile, ["path", "sha256", "schema", "profileId", "createdAt"]) ||
    typeof binding.profile?.path !== "string" ||
    !path.isAbsolute(binding.profile.path) ||
    binding.profile.path.includes("\0")
  ) {
    errors.add("MATRIX_RUNTIME_BUILD_BINDING_PROFILE_INVALID");
  }
  if (!SHA256_PATTERN.test(String(binding.profile?.sha256 ?? ""))) {
    errors.add("MATRIX_RUNTIME_BUILD_BINDING_PROFILE_SHA256_INVALID");
  }
  const reconstructedProfile = {
    schema: binding.profile?.schema,
    profileId: binding.profile?.profileId,
    createdAt: binding.profile?.createdAt,
    frontend: binding.frontend,
    backend: binding.backend
  };
  validateMatrixRuntimeBuildProfile(reconstructedProfile).forEach((error) =>
    errors.add(error.replace("MATRIX_RUNTIME_BUILD_PROFILE_", "MATRIX_RUNTIME_BUILD_BINDING_"))
  );
  if (
    !SHA256_PATTERN.test(String(binding.bindingSha256 ?? "")) ||
    sha256Json(bindingFingerprintPayload(binding)) !== binding.bindingSha256
  ) {
    errors.add("MATRIX_RUNTIME_BUILD_BINDING_SHA256_MISMATCH");
  }
  return [...errors].sort((left, right) => left.localeCompare(right));
}

function missingOrMismatch(errors, prefix, field, observed, expected, validator = validToken) {
  const upperField = field.replace(/([A-Z])/gu, "_$1").toUpperCase();
  if (!validator(observed)) {
    errors.add(`${prefix}_${upperField}_MISSING`);
    return;
  }
  if (observed !== expected) errors.add(`${prefix}_${upperField}_MISMATCH`);
}

function validateBackendObservation(errors, label, observed, expected) {
  const prefix = `MATRIX_BACKEND_RUNTIME_BUILD_${label}`;
  missingOrMismatch(errors, prefix, "commit", observed?.commit, expected.commit);
  missingOrMismatch(
    errors,
    prefix,
    "imageDigest",
    observed?.imageDigest,
    expected.imageDigest,
    (value) => IMAGE_DIGEST_PATTERN.test(String(value ?? ""))
  );
  missingOrMismatch(errors, prefix, "builtAt", observed?.builtAt, expected.builtAt, validIsoUtc);
  missingOrMismatch(
    errors,
    prefix,
    "contractVersion",
    observed?.contractVersion,
    expected.contractVersion
  );
  missingOrMismatch(
    errors,
    prefix,
    "vfxRuntimeRevision",
    observed?.vfxRuntimeRevision,
    expected.vfxRuntimeRevision
  );
  if (!validIsoUtc(observed?.processStartedAt)) {
    errors.add(`${prefix}_PROCESS_STARTED_AT_MISSING`);
  } else if (
    validIsoUtc(expected?.builtAt) &&
    Date.parse(observed.processStartedAt) < Date.parse(expected.builtAt)
  ) {
    errors.add(`${prefix}_PROCESS_STARTED_BEFORE_BUILD`);
  }
}

export function validateMatrixRuntimeBuildObservations(binding, observations) {
  const errors = new Set(validateMatrixRuntimeBuildBinding(binding));
  if (!isRecord(observations)) {
    errors.add("MATRIX_RUNTIME_BUILD_OBSERVATIONS_MISSING");
    return [...errors].sort((left, right) => left.localeCompare(right));
  }
  const frontend = observations.frontend;
  missingOrMismatch(
    errors,
    "MATRIX_FRONTEND_RUNTIME_BUILD",
    "commit",
    frontend?.commit,
    binding?.frontend?.commit
  );
  missingOrMismatch(
    errors,
    "MATRIX_FRONTEND_RUNTIME_BUILD",
    "imageDigest",
    frontend?.imageDigest,
    binding?.frontend?.imageDigest,
    (value) => IMAGE_DIGEST_PATTERN.test(String(value ?? ""))
  );
  missingOrMismatch(
    errors,
    "MATRIX_FRONTEND_RUNTIME_BUILD",
    "builtAt",
    frontend?.builtAt,
    binding?.frontend?.builtAt,
    validIsoUtc
  );
  validateBackendObservation(errors, "PROXY", observations.backendProxy, binding?.backend ?? {});
  validateBackendObservation(errors, "DIRECT", observations.backendDirect, binding?.backend ?? {});
  const proxy = observations.backendProxy;
  const direct = observations.backendDirect;
  if (
    isRecord(proxy) &&
    isRecord(direct) &&
    [
      "commit",
      "imageDigest",
      "builtAt",
      "processStartedAt",
      "contractVersion",
      "vfxRuntimeRevision"
    ].some((field) => proxy[field] !== direct[field])
  ) {
    errors.add("MATRIX_BACKEND_RUNTIME_BUILD_PROXY_DIRECT_MISMATCH");
  }
  return [...errors].sort((left, right) => left.localeCompare(right));
}
