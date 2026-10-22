import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("capture-vfx-app-route-cdp placeable-lighting proof manifest", () => {
  it("records the fail-closed placeable-lighting snapshot without promoting it to retail parity", async () => {
    const script = await readFile(
      resolve(__dirname, "../../scripts/capture-vfx-app-route-cdp.mjs"),
      "utf8"
    );

    expect(script).toContain("__auroraAreaPlaceableLightingGetProofSnapshot");
    expect(script).toContain("placeableLightingProof");
    expect(script).toContain("data-placeable-lighting-proof-status");
    expect(script).toContain("data-placeable-lighting-proof-blockers");
    expect(script).toContain("data-placeable-lighting-proof-receiver-material-families");
    expect(script).toContain("#area-light-shadow-preview-frame");
    expect(script).toContain("areaFrameJson");
    expect(script).toContain("blocked_pending_matched_nwn_oracle");
    expect(script).toContain("data-placeable-source-lineage-status");
    expect(script).toContain("area-placeable-source-lineage-not-retail");
    expect(script).toContain("data-terrain-source-lineage-status");
    expect(script).toContain("data-terrain-source-model-hashes");
    expect(script).toContain("data-terrain-model-asset-hashes");
    expect(script).toContain("data-terrain-texture-hashes");
    expect(script).toContain("area-placeable-terrain-source-lineage-not-retail");
    expect(script).toContain("data-placeable-light-projection-status");
    expect(script).toContain("data-placeable-light-projection-blockers");
    expect(script).toContain("area-placeable-light-projection-invalid");
    expect(script).toContain("isAlsOracleCampfirePointLightEnabledCapture");
    expect(script).toContain('new URL(route).searchParams.get("oracleFixture")');
    expect(script).toContain("area-placeable-oracle-fixture-mismatch");
    expect(script).toContain(
      'finalDomStatus?.routePath === "/dev/area-light-shadow-preview"'
    );
    expect(script).not.toContain(
      'finalDomStatus?.routePath === "/dev/area-light-shadow-preview" &&\n    areaPlaceableLightingProof !== null'
    );
    expect(script).toContain("captureIntegrityAccepted");
    expect(script).toContain("retailParityAccepted");
    expect(script).toContain("const retailParityAccepted = false");
    expect(script).toContain(
      "accepted: isAreaPlaceableLightingCapture\n      ? retailParityAccepted\n      : captureIntegrityAccepted"
    );
  });

  it("requires actual placeable texture settlement for every Area lighting capture", async () => {
    const script = await readFile(
      resolve(__dirname, "../../scripts/capture-vfx-app-route-cdp.mjs"),
      "utf8"
    );

    expect(script).toContain("isAreaPlaceableLightingRoute");
    expect(script).toContain("areaPlaceableModelTextureSettled");
    expect(script).toContain("area-placeable-texture-not-settled");
    expect(script).toContain(
      'areaRunner?.getAttribute("data-placeable-model-texture-status")'
    );
    expect(script).toContain(
      'areaRunner?.getAttribute("data-placeable-model-texture-settled") === "true"'
    );
  });

  it("does not require visible VFX for a deterministic point-light-only ablation", async () => {
    const script = await readFile(
      resolve(__dirname, "../../scripts/capture-vfx-app-route-cdp.mjs"),
      "utf8"
    );

    expect(script).toContain(
      "Number.isFinite(captureTimeSeconds) &&\n    !isAreaPlaceableLightingVfxDisabled"
    );
  });
});
