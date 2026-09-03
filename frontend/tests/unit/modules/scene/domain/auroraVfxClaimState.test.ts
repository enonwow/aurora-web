import { describe, expect, it } from "vitest";
import { resolveAuroraVfxClaimState } from "../../../../../src/modules/scene/domain/auroraVfxClaimState";

describe("resolveAuroraVfxClaimState", () => {
  it("keeps renderer eligibility independent from retail parity", () => {
    expect(
      resolveAuroraVfxClaimState({
        canonicalStatus: "canonical",
        backendCanonical: true,
        rendererEligibility: "source_backed",
        retailParityStatus: "blocked"
      })
    ).toEqual({
      rendererEligibility: "source_backed",
      retailParityStatus: "blocked",
      retailParityPromoted: false,
      legacyCanonicalLabelNonRetail: true
    });
  });

  it("supports the legacy canonical renderer fallback without promoting parity", () => {
    expect(
      resolveAuroraVfxClaimState({
        canonicalStatus: "canonical",
        backendCanonical: true
      })
    ).toEqual({
      rendererEligibility: "source_backed",
      retailParityStatus: "unproven",
      retailParityPromoted: false,
      legacyCanonicalLabelNonRetail: true
    });
  });

  it("uses the preserve-payload fallback only when the Aurora payload has no status", () => {
    expect(resolveAuroraVfxClaimState(undefined, "preview_only")).toMatchObject({
      rendererEligibility: "preview_only",
      retailParityStatus: "unproven"
    });
    expect(
      resolveAuroraVfxClaimState(
        { canonicalStatus: "unmapped", rendererEligibility: "blocked" },
        "preview_only"
      )
    ).toMatchObject({ rendererEligibility: "blocked" });
  });

  it("promotes only an explicit proven retail status", () => {
    expect(
      resolveAuroraVfxClaimState({
        canonicalStatus: "canonical",
        backendCanonical: true,
        rendererEligibility: "source_backed",
        retailParityStatus: "proven"
      })
    ).toMatchObject({
      retailParityStatus: "proven",
      retailParityPromoted: true,
      legacyCanonicalLabelNonRetail: false
    });
  });
});
