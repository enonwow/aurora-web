import assert from "node:assert/strict";
import {
  calculateVfxPresentationProfileHash,
  validateVfxPresentationProfile
} from "./lib/vfx-presentation-profile-contract.mjs";

const profile = {
  version: "aurora-vfx-render-profile/v1",
  sourceEvidence: ["proof/native.png"],
  viewProfile: {
    projection: "orthographic",
    viewportWidth: 960,
    viewportHeight: 540
  },
  clearColor: "#101214",
  runtimeFrameMaterialization: "eager"
};

const bound = {
  ...profile,
  profileHash: calculateVfxPresentationProfileHash(profile)
};

assert.equal(validateVfxPresentationProfile(bound).profileHash, bound.profileHash);
assert.throws(
  () => validateVfxPresentationProfile({ ...bound, clearColor: "#ffffff" }),
  /profileHash mismatch/u
);
assert.throws(
  () => validateVfxPresentationProfile({ ...bound, fixtureId: "alpha" }),
  /unknown field/u
);

console.log("VFX presentation profile contract tests passed.");
