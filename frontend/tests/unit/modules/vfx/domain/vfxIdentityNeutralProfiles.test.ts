import { describe, expect, it } from "vitest";
import {
  materializeVfxPresentationProfile,
  shouldMaterializeVfxDiagnosticReference,
  type AuroraVfxPresentationProfile
} from "../../../../../src/modules/vfx/domain/vfxIdentityNeutralProfiles";

const VIEW = {
  projection: "perspective" as const,
  viewportWidth: 880,
  viewportHeight: 750,
  cameraHalfWidth: 0,
  cameraHalfHeight: 0,
  perspectiveFovDegrees: 48,
  cameraPosition: [0, 3, -4] as [number, number, number],
  cameraUp: [0, 1, 0] as [number, number, number],
  cameraLookAt: [0, 1, 0] as [number, number, number],
  receiverSize: [4, 3] as [number, number],
  receiverPosition: [0, 0, 0] as [number, number, number],
  receiverRotationX: 0,
  targetRadius: 0.2,
  targetLength: 1,
  targetPosition: [0, 1, 0] as [number, number, number]
};

function profile(overrides: Partial<AuroraVfxPresentationProfile> = {}) {
  return {
    version: "aurora-vfx-render-profile/v1" as const,
    profileHash: "a".repeat(64),
    sourceEvidence: ["proof/native-frame.png"],
    viewProfile: VIEW,
    clearColor: "#101214",
    runtimeFrameMaterialization: "eager" as const,
    ...overrides
  };
}

describe("identity-neutral VFX presentation profiles", () => {
  it("derives behavior exclusively from profile data, not fixture identity", () => {
    const input = profile();

    const alpha = materializeVfxPresentationProfile(input);
    const beta = materializeVfxPresentationProfile({ ...input });

    expect(alpha).toEqual(beta);
    expect(alpha.clearColor).toBe("#101214");
    expect(alpha.viewProfile.cameraPosition).toEqual([0, 3, -4]);
  });

  it("swaps behavior when profile values are swapped without an identity argument", () => {
    const dark = materializeVfxPresentationProfile(profile());
    const light = materializeVfxPresentationProfile(
      profile({
        profileHash: "b".repeat(64),
        clearColor: "#686d70",
        runtimeFrameMaterialization: "lazy"
      })
    );

    expect(dark.clearColor).toBe("#101214");
    expect(light.clearColor).toBe("#686d70");
    expect(light.runtimeFrameMaterialization).toBe("lazy");
  });

  it("fails closed for unknown fields and invalid provenance", () => {
    expect(() =>
      materializeVfxPresentationProfile({
        ...profile(),
        fixtureId: "forbidden-behavior-key"
      })
    ).toThrow(/unknown field/i);
    expect(() =>
      materializeVfxPresentationProfile({
        ...profile(),
        profileHash: "not-a-sha256"
      })
    ).toThrow(/profileHash/i);
    expect(() =>
      materializeVfxPresentationProfile({
        ...profile(),
        sourceEvidence: []
      })
    ).toThrow(/sourceEvidence/i);
  });

  it("uses a declarative proof-scene policy for diagnostic references", () => {
    expect(
      shouldMaterializeVfxDiagnosticReference(
        { enabled: true, proofScenePolicy: "always" },
        true
      )
    ).toBe(true);
    expect(
      shouldMaterializeVfxDiagnosticReference(
        { enabled: true, proofScenePolicy: "omit-when-present" },
        true
      )
    ).toBe(false);
    expect(
      shouldMaterializeVfxDiagnosticReference(
        { enabled: true, proofScenePolicy: "omit-when-present" },
        false
      )
    ).toBe(true);
  });
});
