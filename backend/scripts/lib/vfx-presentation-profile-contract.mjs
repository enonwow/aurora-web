import { createHash } from "node:crypto";

export const VFX_PRESENTATION_PROFILE_VERSION = "aurora-vfx-render-profile/v1";

const PROFILE_KEYS = new Set([
  "version",
  "profileHash",
  "sourceEvidence",
  "viewProfile",
  "clearColor",
  "runtimeFrameMaterialization",
  "postprocessProfile",
  "diagnosticReference"
]);

export function calculateVfxPresentationProfileHash(profile) {
  const hashInput = structuredClone(profile);
  delete hashInput.profileHash;
  return createHash("sha256")
    .update(JSON.stringify(sortJsonValue(hashInput)))
    .digest("hex");
}

export function validateVfxPresentationProfile(profile) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    throw new Error("VFX presentation profile must be an object.");
  }
  const unknownKey = Object.keys(profile).find((key) => !PROFILE_KEYS.has(key));
  if (unknownKey) {
    throw new Error(`VFX presentation profile contains unknown field '${unknownKey}'.`);
  }
  if (profile.version !== VFX_PRESENTATION_PROFILE_VERSION) {
    throw new Error(`Unsupported VFX presentation profile version '${profile.version}'.`);
  }
  if (!/^[a-f0-9]{64}$/u.test(profile.profileHash ?? "")) {
    throw new Error("VFX presentation profile profileHash must be a lowercase SHA-256.");
  }
  if (
    !Array.isArray(profile.sourceEvidence) ||
    profile.sourceEvidence.length === 0 ||
    profile.sourceEvidence.length > 64 ||
    profile.sourceEvidence.some((entry) => typeof entry !== "string" || !entry.trim())
  ) {
    throw new Error("VFX presentation profile sourceEvidence is invalid.");
  }
  if (!profile.viewProfile || typeof profile.viewProfile !== "object") {
    throw new Error("VFX presentation profile viewProfile is missing.");
  }
  if (!/^#[a-f0-9]{6}$/iu.test(profile.clearColor ?? "")) {
    throw new Error("VFX presentation profile clearColor is invalid.");
  }
  if (!["eager", "lazy"].includes(profile.runtimeFrameMaterialization)) {
    throw new Error("VFX presentation profile runtimeFrameMaterialization is invalid.");
  }
  if (JSON.stringify(profile).length > 256 * 1024) {
    throw new Error("VFX presentation profile exceeds the 256 KiB budget.");
  }
  const expectedHash = calculateVfxPresentationProfileHash(profile);
  if (profile.profileHash !== expectedHash) {
    throw new Error(
      `VFX presentation profile profileHash mismatch: expected ${expectedHash}, received ${profile.profileHash}.`
    );
  }
  return profile;
}

function sortJsonValue(value) {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortJsonValue(value[key])])
  );
}
