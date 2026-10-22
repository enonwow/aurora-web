import { basename, isAbsolute, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";

const SHA256 = /^[a-f0-9]{64}$/u;
const RESREF = /^[a-z0-9_]{1,16}$/u;
export const ENTRY_REOPEN_PREP_PROFILE_VERSION = "aurora-entry-reopen-prep-profile/v1";

// The caller supplies an already validated saved-source inspection and binds
// the exact historical post-save JSON bytes before calling these pure adapters.
// No file, process, native state, or runtime proof is read or created here.
export function buildEntryReopenBinaryProfile({ source, postSaveProfile }) {
  validateBindings(source, postSaveProfile);
  const binaryProfile = structuredClone(postSaveProfile);
  // Correct only the known legacy metadata omission, in a NEW profile. The MOD
  // bytes and all authoring data, including entry direction, remain unchanged.
  binaryProfile.module.bytes = source.target.module.bytes;
  return binaryProfile;
}

// profilePath/profileSha256 identify the generated binary-profile.json after
// the caller has serialized it. Its path is fixed inside the new owned root;
// the caller must check the serialized hash and create output directories.
export function buildEntryReopenPrepContext({ source, postSaveProfile, rootDir, profilePath, profileSha256 }) {
  const binaryProfile = buildEntryReopenBinaryProfile({ source, postSaveProfile });
  check(typeof rootDir === "string" && isAbsolute(rootDir)
    && typeof profilePath === "string" && isAbsolute(profilePath)
    && samePath(profilePath, resolve(rootDir, "binary-profile.json"))
    && SHA256.test(profileSha256), "ENTRY_REOPEN_OUTPUT_IDENTITY_INVALID");
  const target = {
    moduleResref: source.target.module.resref,
    moduleName: `${source.target.module.resref}.mod`,
    installedModulePath: resolve(source.target.module.path),
    areaResref: source.target.area,
  };
  const prepProfile = {
    version: ENTRY_REOPEN_PREP_PROFILE_VERSION,
    id: `entry-reopen-${source.target.module.resref}-${source.target.module.sha256.slice(0, 12)}`,
    source: structuredClone(source.source),
    binaryProfile: { path: resolve(profilePath), sha256: profileSha256 },
    installedModule: prepIdentity(source.target.module),
    orderedHakList: source.target.orderedHakList.map((hak) => ({ resref: hak.resref, ...prepIdentity(hak) })),
    area: { ...structuredClone(postSaveProfile.area), entryPoint: [...source.target.entry.position],
      entryDirection: [...source.target.entry.direction] },
    outputRoot: resolve(rootDir, "live", "proof"),
    policy: { coldOnly: true, noSave: true, noBuild: true, noRepack: true, noFocus: true, noCamera: true, noRetry: true },
    nativePaintVerified: false,
    proofClaimed: false,
    runtimeClaimed: false,
  };
  return { binaryProfile, prepProfile, target };
}

function validateBindings(source, postSaveProfile) {
  check(source?.version === "aurora-binary-entry-surface-source/v2"
    && source.status === "native_entry_observation_missing"
    && source.semanticVerdict === "not_evaluated"
    && source.proofClaimed === false && source.runtimeClaimed === false
    && source.source?.kind === "binary_native_geometry_post_save"
    && ["manifest", "profile", "postSaveProfile"].every((key) => validIdentity(source.source[key]))
    && validIdentity(source.target?.module) && RESREF.test(source.target.module.resref)
    && basename(source.target.module.path).toLowerCase() === `${source.target.module.resref}.mod`
    && RESREF.test(source.target.area) && vector(source.target.entry?.position, 3)
    && vector(source.target.entry?.direction, 2), "ENTRY_REOPEN_SOURCE_INVALID");
  const saved = postSaveProfile;
  check(saved?.version === "aurora-toolset-binary-module-bootstrap-profile/v1"
    && saved.module?.sha256 === source.target.module.sha256
    && saved.module.resref === source.target.module.resref
    && samePath(saved.module.path, source.target.module.path)
    && Number.isSafeInteger(saved.module.bytes) && saved.module.bytes > 0
    && saved.area?.resref === source.target.area
    && typeof saved.area.displayName === "string" && saved.area.displayName.trim().length > 0
    && saved.entryPoint?.area === source.target.area
    && isDeepStrictEqual(saved.entryPoint.position, source.target.entry.position)
    && isDeepStrictEqual(saved.entryPoint.direction, source.target.entry.direction), "ENTRY_REOPEN_POST_SAVE_BINDING_INVALID");
  const actualHaks = source.target.orderedHakList;
  const declaredHaks = saved.orderedHakList;
  check(Array.isArray(actualHaks) && actualHaks.length > 0 && actualHaks.length <= 256
    && Array.isArray(declaredHaks) && declaredHaks.length === actualHaks.length
    && new Set(actualHaks.map((hak) => hak?.resref)).size === actualHaks.length,
  "ENTRY_REOPEN_HAK_BINDING_INVALID");
  for (const [index, actual] of actualHaks.entries()) {
    const declared = declaredHaks[index];
    check(validIdentity(actual) && RESREF.test(actual.resref)
      && basename(actual.path).toLowerCase() === `${actual.resref}.hak`
      && declared?.resref === actual.resref && declared.sha256 === actual.sha256
      && samePath(declared.path, actual.path)
      && (declared.bytes == null || declared.bytes === actual.bytes), "ENTRY_REOPEN_HAK_BINDING_INVALID");
  }
}

function prepIdentity(value) { return { path: resolve(value.path), sha256: value.sha256, byteLength: value.bytes }; }
function validIdentity(value) {
  return typeof value?.path === "string" && isAbsolute(value.path)
    && SHA256.test(value.sha256) && Number.isSafeInteger(value.bytes) && value.bytes > 0;
}
function vector(value, size) { return Array.isArray(value) && value.length === size && value.every(Number.isFinite); }
function samePath(a, b) { return typeof a === "string" && typeof b === "string" && resolve(a).toLowerCase() === resolve(b).toLowerCase(); }
function check(condition, code) { if (!condition) { const error = new Error(code); error.code = code; throw error; } }
