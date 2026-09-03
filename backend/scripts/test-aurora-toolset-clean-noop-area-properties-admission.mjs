#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  classifyCleanNoopAreaPropertiesProfile,
  validateCleanNoopAreaPropertiesLineage,
} from "./lib/aurora-toolset-clean-noop-area-properties-admission.mjs";

const module = {
  resref: "contractmod",
  path: "C:\\proof\\contractmod.mod",
  sha256: "a".repeat(64),
};
const modelProfile = {
  version: "aurora-toolset-binary-module-bootstrap-profile/v1",
  id: "model-profile",
  module,
  area: { resref: "contractarea" },
};
const dynamicProfile = {
  version: "aurora-toolset-binary-dynamic-placeable-profile/v1",
  id: "dynamic-profile",
  proofKind: "dynamic-placeable-catalog-copy",
  module,
  area: { resref: "contractarea" },
  fixture: {
    sourceProfileId: "effective-catalog-utp-placeable-copy-v1",
  },
};
const profilePath = "C:\\proof\\profile.json";
const profileSha256 = "b".repeat(64);
const manifest = {
  profilePath,
  profileSha256,
  profileId: dynamicProfile.id,
  module,
  area: { resref: dynamicProfile.area.resref },
  createdAt: "2026-08-19T19:13:11.534Z",
};
const moduleStat = {
  size: 198407,
  mtimeMs: Date.parse("2026-08-19T19:09:21.859Z"),
};

assert.equal(classifyCleanNoopAreaPropertiesProfile(modelProfile), "model-fixture");
assert.equal(classifyCleanNoopAreaPropertiesProfile(dynamicProfile), "dynamic-placeable");
assert.equal(classifyCleanNoopAreaPropertiesProfile({ ...dynamicProfile, proofKind: "wrong" }), null);
assert.equal(classifyCleanNoopAreaPropertiesProfile({
  ...dynamicProfile,
  fixture: { sourceProfileId: "wrong" },
}), null);
assert.equal(classifyCleanNoopAreaPropertiesProfile({ ...dynamicProfile, version: "v2" }), null);

const admitted = validateCleanNoopAreaPropertiesLineage({
  profile: dynamicProfile,
  profilePath,
  profileSha256,
  manifest,
  moduleStat,
});
assert.deepEqual(admitted, {
  profileKind: "dynamic-placeable",
  moduleIntegrityMode: "preflight-sha256-plus-locked-file-stat",
  sha256RevalidationDeferredUntilToolsetClose: true,
});

assert.throws(
  () => validateCleanNoopAreaPropertiesLineage({
    profile: { ...dynamicProfile, proofKind: "wrong" },
    profilePath,
    profileSha256,
    manifest,
    moduleStat,
  }),
  (error) => error?.code === "BINARY_NATIVE_CLEAN_NOOP_PROFILE_REQUIRED",
);
assert.throws(
  () => validateCleanNoopAreaPropertiesLineage({
    profile: dynamicProfile,
    profilePath,
    profileSha256,
    manifest: { ...manifest, profileSha256: "c".repeat(64) },
    moduleStat,
  }),
  (error) => error?.code === "BINARY_NATIVE_CLEAN_NOOP_PROFILE_LINEAGE_DRIFT",
);
assert.throws(
  () => validateCleanNoopAreaPropertiesLineage({
    profile: dynamicProfile,
    profilePath,
    profileSha256,
    manifest: { ...manifest, module: { ...module, path: "C:\\proof\\other.mod" } },
    moduleStat,
  }),
  (error) => error?.code === "BINARY_NATIVE_CLEAN_NOOP_MODULE_LINEAGE_DRIFT",
);
assert.throws(
  () => validateCleanNoopAreaPropertiesLineage({
    profile: dynamicProfile,
    profilePath,
    profileSha256,
    manifest,
    moduleStat: { ...moduleStat, mtimeMs: Date.parse(manifest.createdAt) + 1 },
  }),
  (error) => error?.code === "BINARY_NATIVE_CLEAN_NOOP_MODULE_FILE_DRIFT",
);
assert.throws(
  () => validateCleanNoopAreaPropertiesLineage({
    profile: dynamicProfile,
    profilePath,
    profileSha256,
    manifest: { ...manifest, createdAt: "invalid" },
    moduleStat,
  }),
  (error) => error?.code === "BINARY_NATIVE_CLEAN_NOOP_MODULE_FILE_DRIFT",
);

const modelAdmitted = validateCleanNoopAreaPropertiesLineage({
  profile: modelProfile,
  profilePath,
  profileSha256,
  manifest: {
    ...manifest,
    profileId: modelProfile.id,
  },
  moduleStat,
});
assert.deepEqual(modelAdmitted, {
  profileKind: "model-fixture",
  moduleIntegrityMode: "immediate-sha256",
  sha256RevalidationDeferredUntilToolsetClose: false,
});

console.log(JSON.stringify({
  ok: true,
  status: "aurora_toolset_clean_noop_area_properties_admission_contract_valid",
}));
