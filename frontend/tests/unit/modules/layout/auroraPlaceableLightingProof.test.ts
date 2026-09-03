import { describe, expect, it } from "vitest";
import {
  AURORA_PLACEABLE_LIGHTING_PROOF_PROFILE_VERSION,
  evaluateAuroraPlaceableLightingProof,
  resolveAuroraPlaceableLightingProofProfile
} from "../../../../src/modules/layout/application/auroraPlaceableLightingProof";

describe("Aurora placeable lighting proof policy", () => {
  it("rejects the historical halo-on capture because its Area receiver is unlit and lanes are not isolated", () => {
    const profile = resolveAuroraPlaceableLightingProofProfile({});

    const result = evaluateAuroraPlaceableLightingProof({
      profile,
      areaReceiverMeshCount: 12,
      debugReceiverMeshCount: 0,
      reactiveReceiverMaterialCount: 0,
      unlitReceiverMaterialCount: 12,
      unknownReceiverMaterialCount: 0,
      pointLightCount: 1,
      assetSettlementStatus: "settled"
    });

    expect(profile.version).toBe(AURORA_PLACEABLE_LIGHTING_PROOF_PROFILE_VERSION);
    expect(result.status).toBe("blocked");
    expect(result.blockerCodes).toEqual(
      expect.arrayContaining([
        "APL-PROOF-HALO-ENABLED",
        "APL-PROOF-VFX-ENABLED",
        "APL-PROOF-SHADOW-ENABLED",
        "APL-PROOF-POSTPROCESS-ENABLED",
        "APL-PROOF-AREA-RECEIVER-UNLIT"
      ])
    );
  });

  it("admits only an isolated point-light frame with a real reactive Area receiver", () => {
    const profile = resolveAuroraPlaceableLightingProofProfile({
      receiver: "area",
      pointLight: true,
      halo: false,
      vfx: false,
      shadow: false,
      postprocess: false
    });

    const result = evaluateAuroraPlaceableLightingProof({
      profile,
      areaReceiverMeshCount: 3,
      debugReceiverMeshCount: 0,
      reactiveReceiverMaterialCount: 3,
      unlitReceiverMaterialCount: 0,
      unknownReceiverMaterialCount: 0,
      pointLightCount: 1,
      assetSettlementStatus: "settled"
    });

    expect(result.status).toBe("eligible_for_off_on_ablation");
    expect(result.blockerCodes).toEqual([]);
    expect(result.retailParityStatus).toBe("blocked_pending_matched_nwn_oracle");
  });

  it("rejects a debug receiver even when it is light-reactive", () => {
    const profile = resolveAuroraPlaceableLightingProofProfile({
      receiver: "debug",
      pointLight: true,
      halo: false,
      vfx: false,
      shadow: false,
      postprocess: false
    });

    const result = evaluateAuroraPlaceableLightingProof({
      profile,
      areaReceiverMeshCount: 0,
      debugReceiverMeshCount: 1,
      reactiveReceiverMaterialCount: 1,
      unlitReceiverMaterialCount: 0,
      unknownReceiverMaterialCount: 0,
      pointLightCount: 1,
      assetSettlementStatus: "settled"
    });

    expect(result.status).toBe("blocked");
    expect(result.blockerCodes).toContain(
      "APL-PROOF-RECEIVER-PROFILE-NOT-AREA"
    );
    expect(result.blockerCodes).toContain("APL-PROOF-DEBUG-RECEIVER");
    expect(result.blockerCodes).toContain("APL-PROOF-AREA-RECEIVER-MISSING");
  });

  it("rejects missing lights, unknown receiver materials, and unsettled assets", () => {
    const profile = resolveAuroraPlaceableLightingProofProfile({
      halo: false,
      vfx: false,
      shadow: false,
      postprocess: false
    });

    const result = evaluateAuroraPlaceableLightingProof({
      profile,
      areaReceiverMeshCount: 2,
      debugReceiverMeshCount: 0,
      reactiveReceiverMaterialCount: 0,
      unlitReceiverMaterialCount: 0,
      unknownReceiverMaterialCount: 2,
      pointLightCount: 0,
      assetSettlementStatus: "pending"
    });

    expect(result.blockerCodes).toEqual(
      expect.arrayContaining([
        "APL-PROOF-POINT-LIGHT-MISSING",
        "APL-PROOF-AREA-RECEIVER-UNKNOWN",
        "APL-PROOF-ASSETS-NOT-SETTLED"
      ])
    );
  });

  it("reports disabled point-light and debug-receiver facts independently", () => {
    const profile = resolveAuroraPlaceableLightingProofProfile({
      receiver: "area",
      pointLight: false,
      halo: false,
      vfx: false,
      shadow: false,
      postprocess: false
    });

    const result = evaluateAuroraPlaceableLightingProof({
      profile,
      areaReceiverMeshCount: 1,
      debugReceiverMeshCount: 1,
      reactiveReceiverMaterialCount: 1,
      unlitReceiverMaterialCount: 0,
      unknownReceiverMaterialCount: 0,
      pointLightCount: 1,
      assetSettlementStatus: "settled"
    });

    expect(result.blockerCodes).toContain("APL-PROOF-POINT-LIGHT-DISABLED");
    expect(result.blockerCodes).not.toContain("APL-PROOF-POINT-LIGHT-MISSING");
    expect(result.blockerCodes).toContain("APL-PROOF-DEBUG-RECEIVER");
    expect(result.blockerCodes).not.toContain(
      "APL-PROOF-RECEIVER-PROFILE-NOT-AREA"
    );
  });

  it("copies material-family evidence and normalizes a missing family list", () => {
    const profile = resolveAuroraPlaceableLightingProofProfile({
      halo: false,
      vfx: false,
      shadow: false,
      postprocess: false
    });
    const meshSamples = ["floor-a"];
    const families = [
      {
        family: "MeshStandardMaterial",
        reactiveness: "reactive" as const,
        materialCount: 1,
        meshSamples
      }
    ];

    const copied = evaluateAuroraPlaceableLightingProof({
      profile,
      areaReceiverMeshCount: 1,
      debugReceiverMeshCount: 0,
      reactiveReceiverMaterialCount: 1,
      unlitReceiverMaterialCount: 0,
      unknownReceiverMaterialCount: 0,
      pointLightCount: 1,
      assetSettlementStatus: "settled",
      receiverMaterialFamilies: families
    });
    const normalized = evaluateAuroraPlaceableLightingProof({
      profile,
      areaReceiverMeshCount: 1,
      debugReceiverMeshCount: 0,
      reactiveReceiverMaterialCount: 1,
      unlitReceiverMaterialCount: 0,
      unknownReceiverMaterialCount: 0,
      pointLightCount: 1,
      assetSettlementStatus: "settled"
    });

    expect(copied.facts.receiverMaterialFamilies).toEqual(families);
    expect(copied.facts.receiverMaterialFamilies).not.toBe(families);
    expect(copied.facts.receiverMaterialFamilies?.[0]?.meshSamples).not.toBe(
      meshSamples
    );
    expect(normalized.facts.receiverMaterialFamilies).toEqual([]);
  });

  it("rejects a debug profile even before its debug receiver is materialized", () => {
    const result = evaluateAuroraPlaceableLightingProof({
      profile: resolveAuroraPlaceableLightingProofProfile({
        receiver: "debug",
        halo: false,
        vfx: false,
        shadow: false,
        postprocess: false
      }),
      areaReceiverMeshCount: 1,
      debugReceiverMeshCount: 0,
      reactiveReceiverMaterialCount: 1,
      unlitReceiverMaterialCount: 0,
      unknownReceiverMaterialCount: 0,
      pointLightCount: 1,
      assetSettlementStatus: "settled"
    });

    expect(result.blockerCodes).toContain(
      "APL-PROOF-RECEIVER-PROFILE-NOT-AREA"
    );
    expect(result.blockerCodes).toContain("APL-PROOF-DEBUG-RECEIVER");
  });
});
