import { describe, expect, it } from "vitest";
import {
  createPreviewPayload,
  parseCreatureLightPreviewRouteRequest
} from "../../../../src/modules/creatures/dev/CreatureLightPreviewRunner";

describe("CreatureLightPreviewRunner", () => {
  it("parses item/equipment light query controls for red bright proof routes", () => {
    expect(
      parseCreatureLightPreviewRouteRequest(
        "?equipmentLights=1&equipmentLightBrightness=bright&equipmentLightColor=red&maxLights=16"
      )
    ).toEqual({
      equipmentLightCount: 1,
      equipmentLightBrightnessValue: 4,
      equipmentLightColorValue: 3,
      maxLightsOverride: 16
    });
  });

  it("builds the first equipped ItemPropertyLight from route brightness and color values", () => {
    const payload = createPreviewPayload(1, {
      firstEquipmentLightBrightnessValue: 4,
      firstEquipmentLightColorValue: 3
    });
    const [candidate] = payload.renderPackage.equipmentModelCandidates;
    const [lightProperty] = candidate?.itemProperties ?? [];

    expect(lightProperty).toEqual(
      expect.objectContaining({
        propertyName: 44,
        propertyLabel: "Light",
        costValue: 4,
        costTableDefinition: "iprp_lightcost",
        param1Value: 3,
        param1Table: "iprp_color"
      })
    );
  });
});
