import { describe, expect, it } from "vitest";
import { resolveItemVisualSupportInfo } from "../../../../src/modules/items/application/itemVisualSupport";
import type { SceneObject } from "../../../../src/modules/scene/contracts";

function buildSceneObject(overrides: Partial<SceneObject> = {}): SceneObject {
  return {
    id: "itm_template_item_test",
    kind: "items",
    name: "Test Item",
    resRef: "test_item",
    tag: "TEST_ITEM",
    x: 0,
    y: 0,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0
    },
    itemProperties: {
      baseItem: 77,
      baseItemLabel: "Test",
      baseItemDefaultIcon: "iinvalid_2x2"
    },
    ...overrides
  };
}

describe("itemVisualSupport", () => {
  it("marks Aurora invalid-icon items without renderable assets as unsupported", () => {
    expect(resolveItemVisualSupportInfo(buildSceneObject())).toMatchObject({
      kind: "unsupported",
      code: "invalid-icon-no-renderable-model",
      label: "Preview unsupported",
      detail: expect.stringContaining("Source-blocked"),
      tone: "warning"
    });
  });

  it("does not warn when a real icon texture asset is available", () => {
    const object = buildSceneObject({
      itemProperties: {
        baseItem: 6,
        baseItemLabel: "Longsword",
        baseItemDefaultIcon: "iiw_sword",
        modelAssetCandidates: [
          {
            assetId: "asset-icon",
            role: "texture",
            fileName: "iiw_sword.png",
            objectKey: "modules/current/iiw_sword.png",
            extension: "png",
            reference: "iiw_sword",
            assetUrl: "/api/v1/catalog/placeables/cache/icon/assets/asset-icon.png"
          }
        ]
      }
    });

    expect(resolveItemVisualSupportInfo(object)).toBeNull();
  });

  it("labels renderable model candidates without real icon assets as model-only", () => {
    const object = buildSceneObject({
      itemProperties: {
        baseItem: 22,
        baseItemLabel: "Dagger",
        baseItemDefaultIcon: "iwdagger",
        modelPartCandidates: [
          {
            resRef: "w_dgtr_011",
            partId: 11,
            glbUrl: "/api/v1/catalog/items/test/assets/w_dgtr_011.glb"
          }
        ]
      }
    });

    expect(resolveItemVisualSupportInfo(object)).toMatchObject({
      kind: "model-only",
      code: "model-without-real-icon",
      label: "3D model only",
      tone: "info"
    });
  });

  it("reports delivered empty item GLBs without real icon assets as unavailable", () => {
    const object = buildSceneObject({
      itemProperties: {
        baseItem: 36,
        baseItemLabel: "FISTER",
        baseItemDefaultIcon: "iwlcfg",
        modelPartCandidates: [
          {
            resRef: "wlcfg_049",
            partId: 49,
            assetId: "asset-empty-glb",
            glbUrl: "/api/v1/catalog/items/test/assets/wlcfg_049.glb"
          }
        ],
        modelAssetCandidates: [
          {
            assetId: "asset-empty-glb",
            role: "model",
            fileName: "wlcfg_049.glb",
            objectKey: "modules/current/__aurora/derived/models/wlcfg_049.glb",
            extension: "glb",
            reference: "wlcfg_049",
            assetUrl: "/api/v1/catalog/items/test/assets/wlcfg_049.glb",
            sizeBytes: 1396
          }
        ]
      }
    });

    expect(resolveItemVisualSupportInfo(object)).toMatchObject({
      kind: "empty-source-model",
      code: "empty-model-no-real-icon",
      label: "Preview unavailable",
      tone: "warning"
    });
  });

  it("reports missing visual source when metadata exists but no supported web asset is delivered", () => {
    const object = buildSceneObject({
      itemProperties: {
        baseItem: 36,
        baseItemLabel: "Gloves",
        baseItemDefaultIcon: "iwlcfg",
        modelPartCandidates: [
          {
            resRef: "wlcfg_049",
            partId: 49,
            modelUrl: "/api/v1/catalog/items/test/assets/wlcfg_049.mdl"
          }
        ]
      }
    });

    expect(resolveItemVisualSupportInfo(object)).toMatchObject({
      kind: "missing-source",
      code: "metadata-without-supported-asset",
      label: "Preview unavailable",
      detail: expect.stringContaining("Source-blocked"),
      tone: "warning"
    });
  });

  it("reports no-visual-source when neither metadata nor real assets exist", () => {
    const object = buildSceneObject({
      itemProperties: {
        baseItem: 99,
        baseItemLabel: "Unknown",
        baseItemDefaultIcon: "iunknown"
      }
    });

    expect(resolveItemVisualSupportInfo(object)).toMatchObject({
      kind: "missing-source",
      code: "no-visual-source",
      label: "Preview unavailable",
      detail: expect.stringContaining("Source-blocked"),
      tone: "warning"
    });
  });
});
