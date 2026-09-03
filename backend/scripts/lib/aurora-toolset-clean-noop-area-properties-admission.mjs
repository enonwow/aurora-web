const MODEL_FIXTURE_PROFILE_VERSION = "aurora-toolset-binary-module-bootstrap-profile/v1";
const DYNAMIC_PLACEABLE_PROFILE_VERSION = "aurora-toolset-binary-dynamic-placeable-profile/v1";
const DYNAMIC_PLACEABLE_PROOF_KIND = "dynamic-placeable-catalog-copy";
const DYNAMIC_PLACEABLE_SOURCE_PROFILE = "effective-catalog-utp-placeable-copy-v1";

function reject(code, detail) {
  const error = new Error(detail ? `${code}:${detail}` : code);
  error.code = code;
  throw error;
}

function sameText(left, right) {
  return typeof left === "string" && typeof right === "string" && left === right;
}

export function classifyCleanNoopAreaPropertiesProfile(profile) {
  if (profile?.version === MODEL_FIXTURE_PROFILE_VERSION) return "model-fixture";
  if (profile?.version === DYNAMIC_PLACEABLE_PROFILE_VERSION
    && profile?.proofKind === DYNAMIC_PLACEABLE_PROOF_KIND
    && profile?.fixture?.sourceProfileId === DYNAMIC_PLACEABLE_SOURCE_PROFILE) {
    return "dynamic-placeable";
  }
  return null;
}

export function validateCleanNoopAreaPropertiesLineage({
  profile,
  profilePath,
  profileSha256,
  manifest,
  moduleStat,
}) {
  const profileKind = classifyCleanNoopAreaPropertiesProfile(profile);
  if (profileKind == null) reject("BINARY_NATIVE_CLEAN_NOOP_PROFILE_REQUIRED", profile?.id ?? null);

  // Preserve the historical model-fixture continuation contract. Its caller
  // performs immediate module SHA-256 readback exactly as before.
  if (profileKind === "model-fixture") {
    return {
      profileKind,
      moduleIntegrityMode: "immediate-sha256",
      sha256RevalidationDeferredUntilToolsetClose: false,
    };
  }

  if (!/^[a-f0-9]{64}$/u.test(profileSha256 ?? "")
    || !sameText(manifest?.profilePath, profilePath)
    || !sameText(manifest?.profileSha256, profileSha256)
    || !sameText(manifest?.profileId, profile?.id)
    || !sameText(manifest?.area?.resref, profile?.area?.resref)) {
    reject("BINARY_NATIVE_CLEAN_NOOP_PROFILE_LINEAGE_DRIFT");
  }
  if (!sameText(manifest?.module?.resref, profile?.module?.resref)
    || !sameText(manifest?.module?.path, profile?.module?.path)
    || !sameText(manifest?.module?.sha256, profile?.module?.sha256)) {
    reject("BINARY_NATIVE_CLEAN_NOOP_MODULE_LINEAGE_DRIFT");
  }

  const manifestCreatedAtMs = Date.parse(manifest?.createdAt ?? "");
  if (!Number.isFinite(manifestCreatedAtMs)
    || !Number.isFinite(moduleStat?.size)
    || moduleStat.size <= 0
    || !Number.isFinite(moduleStat?.mtimeMs)
    || moduleStat.mtimeMs > manifestCreatedAtMs) {
    reject("BINARY_NATIVE_CLEAN_NOOP_MODULE_FILE_DRIFT", JSON.stringify({
      moduleBytes: moduleStat?.size ?? null,
      moduleLastWriteTimeMs: moduleStat?.mtimeMs ?? null,
      manifestCreatedAt: manifest?.createdAt ?? null,
    }));
  }

  return {
    profileKind,
    moduleIntegrityMode: "preflight-sha256-plus-locked-file-stat",
    sha256RevalidationDeferredUntilToolsetClose: true,
  };
}
