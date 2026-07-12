import { describe, expect, it } from "vitest";
import { composeItemIconPreview } from "../../../../src/modules/items/application/itemIconComposer";
import type { SceneObject } from "../../../../src/modules/scene/contracts";

function buildSceneObject(overrides: Partial<SceneObject> = {}): SceneObject {
  return {
    id: "itm_template_item_nw_wswm001",
    kind: "items",
    name: "Longsword",
    resRef: "nw_wswm001",
    tag: "NW_WSWM001",
    previewImageUrl: "",
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
      baseItem: 6,
      baseItemLabel: "Longsword",
      baseItemDefaultIcon: "iiw_sword",
      modelParts: [2, 1, 3],
      modelPartResRefs: ["w_swlss_002", "w_swlss_001", "w_swlss_003"],
      materialColors: {
        leather1: 12,
        metal1: 16
      }
    },
    ...overrides
  };
}

describe("itemIconComposer", () => {
  it("does not compose icons for non-item scene objects", () => {
    const object = buildSceneObject({
      kind: "placeables",
      itemProperties: undefined
    });

    expect(composeItemIconPreview(object)).toBeNull();
  });

  it("does not synthesize an item preview from DefaultIcon metadata alone", () => {
    const result = composeItemIconPreview(buildSceneObject());

    expect(result).toBeNull();
  });

  it("ignores Aurora invalid placeholder icons even when their texture asset exists", () => {
    const result = composeItemIconPreview(
      buildSceneObject({
        itemProperties: {
          baseItem: 77,
          baseItemLabel: "creatureitem",
          baseItemDefaultIcon: "iinvalid_2x2",
          modelParts: [1],
          modelPartResRefs: ["it_cr_item_001"],
          modelAssetCandidates: [
            {
              assetId: "asset-invalid-icon",
              role: "texture",
              fileName: "iinvalid_2x2.tga",
              objectKey: "modules/current/iinvalid_2x2.tga",
              extension: "tga",
              reference: "iinvalid_2x2",
              assetUrl: "/api/v1/catalog/placeables/cache/icon/assets/asset-invalid-icon.tga"
            }
          ]
        }
      })
    );

    expect(result).toBeNull();
  });

  it("uses a browser-displayable texture asset when it matches DefaultIcon", () => {
    const result = composeItemIconPreview(
      buildSceneObject({
        itemProperties: {
          baseItem: 6,
          baseItemLabel: "Longsword",
          baseItemDefaultIcon: "iiw_sword",
          baseItemInvSlotWidth: 1,
          baseItemInvSlotHeight: 3,
          modelAssetCandidates: [
            {
              assetId: "asset-icon-png",
              role: "texture",
              fileName: "iiw_sword.png",
              objectKey: "modules/current/iiw_sword.png",
              extension: "png",
              reference: "iiw_sword",
              assetUrl: "/api/v1/catalog/placeables/cache/icon/assets/asset-icon-png.png"
            }
          ]
        }
      })
    );

    expect(result).toMatchObject({
      iconResRef: "iiw_sword",
      source: "asset-texture",
      assetId: "asset-icon-png",
      assetExtension: "png",
      previewImageUrl: "/api/v1/catalog/placeables/cache/icon/assets/asset-icon-png.png",
      inventoryGrid: {
        widthSlots: 1,
        heightSlots: 3,
        cellCount: 3,
        aspectRatio: 1 / 3
      }
    });
  });

  it("exposes raw Aurora texture assets for async decoding without a synthetic preview", () => {
    const result = composeItemIconPreview(
      buildSceneObject({
        itemProperties: {
          baseItem: 6,
          baseItemLabel: "Longsword",
          baseItemDefaultIcon: "iiw_sword",
          modelAssetCandidates: [
            {
              assetId: "asset-icon-tga",
              role: "texture",
              fileName: "iiw_sword.tga",
              objectKey: "modules/current/iiw_sword.tga",
              extension: "tga",
              reference: "iiw_sword",
              assetUrl: "/api/v1/catalog/placeables/cache/icon/assets/asset-icon-tga.tga"
            }
          ]
        }
      })
    );

    expect(result).toMatchObject({
      iconResRef: "iiw_sword",
      source: "raw-texture",
      assetId: "asset-icon-tga",
      assetExtension: "tga",
      rawAssetUrl: "/api/v1/catalog/placeables/cache/icon/assets/asset-icon-tga.tga",
      rawAssetExtension: "tga"
    });
    expect(result?.previewImageUrl).toBeUndefined();
  });

  it("matches Aurora indexed icon texture variants for a DefaultIcon", () => {
    const result = composeItemIconPreview(
      buildSceneObject({
        itemProperties: {
          baseItem: 36,
          baseItemLabel: "Gloves",
          baseItemDefaultIcon: "iwlcfg",
          modelParts: [49],
          modelPartResRefs: ["wlcfg_b_049"],
          modelAssetCandidates: [
            {
              assetId: "asset-indexed-gloves-tga",
              role: "texture",
              fileName: "iwlcfg_049.tga",
              objectKey: "modules/current/__aurora/sources/hak/lc_icons/iwlcfg_049.tga",
              extension: "tga",
              reference: "iwlcfg_049",
              assetUrl:
                "/api/v1/catalog/placeables/cache/icon/assets/asset-indexed-gloves-tga.tga"
            }
          ]
        }
      })
    );

    expect(result).toMatchObject({
      iconResRef: "iwlcfg",
      source: "raw-texture",
      assetId: "asset-indexed-gloves-tga",
      rawAssetUrl:
        "/api/v1/catalog/placeables/cache/icon/assets/asset-indexed-gloves-tga.tga",
      rawAssetExtension: "tga"
    });
    expect(result?.previewImageUrl).toBeUndefined();
  });

  it("exposes BMP icon textures for async raw decoding", () => {
    const result = composeItemIconPreview(
      buildSceneObject({
        itemProperties: {
          baseItem: 6,
          baseItemLabel: "Longsword",
          baseItemDefaultIcon: "iiw_sword",
          modelAssetCandidates: [
            {
              assetId: "asset-icon-bmp",
              role: "texture",
              fileName: "iiw_sword.bmp",
              objectKey: "modules/current/iiw_sword.bmp",
              extension: "bmp",
              reference: "iiw_sword",
              assetUrl: "/api/v1/catalog/placeables/cache/icon/assets/asset-icon-bmp.bmp"
            }
          ]
        }
      })
    );

    expect(result).toMatchObject({
      iconResRef: "iiw_sword",
      source: "raw-texture",
      assetId: "asset-icon-bmp",
      assetExtension: "bmp",
      rawAssetUrl: "/api/v1/catalog/placeables/cache/icon/assets/asset-icon-bmp.bmp",
      rawAssetExtension: "bmp"
    });
  });

  it.each(["dds", "plt", "tpc"])("exposes %s icon textures for async raw decoding", (extension) => {
    const result = composeItemIconPreview(
      buildSceneObject({
        itemProperties: {
          baseItem: 6,
          baseItemLabel: "Longsword",
          baseItemDefaultIcon: "iiw_sword",
          modelAssetCandidates: [
            {
              assetId: `asset-icon-${extension}`,
              role: "texture",
              fileName: `iiw_sword.${extension}`,
              objectKey: `modules/current/iiw_sword.${extension}`,
              extension,
              reference: "iiw_sword",
              assetUrl: `/api/v1/catalog/placeables/cache/icon/assets/asset-icon-${extension}.${extension}`
            }
          ]
        }
      })
    );

    expect(result).toMatchObject({
      iconResRef: "iiw_sword",
      source: "raw-texture",
      assetId: `asset-icon-${extension}`,
      assetExtension: extension,
      rawAssetUrl: `/api/v1/catalog/placeables/cache/icon/assets/asset-icon-${extension}.${extension}`,
      rawAssetExtension: extension
    });
  });

  it("passes Aurora item material colors as PLT palette rows for real colored icon decode", () => {
    const result = composeItemIconPreview(
      buildSceneObject({
        itemProperties: {
          baseItem: 16,
          baseItemLabel: "Armor",
          baseItemDefaultIcon: "iaarcl",
          materialColors: {
            leather1: 12,
            leather2: 13,
            cloth1: 22,
            cloth2: 23,
            metal1: 45,
            metal2: 46
          },
          modelAssetCandidates: [
            {
              assetId: "asset-armor-icon-plt",
              role: "texture",
              fileName: "iaarcl.plt",
              objectKey: "modules/current/iaarcl.plt",
              extension: "plt",
              reference: "iaarcl",
              assetUrl: "/api/v1/catalog/placeables/cache/icon/assets/asset-armor-icon-plt.plt"
            }
          ]
        }
      })
    );

    expect(result).toMatchObject({
      iconResRef: "iaarcl",
      source: "raw-texture",
      rawAssetExtension: "plt",
      pltPaletteRowsByLayer: {
        2: 45,
        3: 46,
        4: 22,
        5: 23,
        6: 12,
        7: 13
      }
    });
  });

  it("uses the first resolved model part resref only when a real matching asset exists", () => {
    const result = composeItemIconPreview(
      buildSceneObject({
        itemProperties: {
          baseItem: 22,
          baseItemLabel: "Dagger",
          modelParts: [11, 13, 63],
          modelPartResRefs: ["w_dgtr_011", "w_dgtr_013", "w_dgtr_063"],
          modelAssetCandidates: [
            {
              assetId: "asset-dagger-part",
              role: "texture",
              fileName: "w_dgtr_011.png",
              objectKey: "modules/current/w_dgtr_011.png",
              extension: "png",
              reference: "w_dgtr_011",
              assetUrl: "/api/v1/catalog/placeables/cache/icon/assets/asset-dagger-part.png"
            }
          ]
        }
      })
    );

    expect(result).toMatchObject({
      iconResRef: "w_dgtr_011",
      source: "asset-texture",
      assetId: "asset-dagger-part",
      previewImageUrl: "/api/v1/catalog/placeables/cache/icon/assets/asset-dagger-part.png",
      modelPartCount: 3
    });
  });

  it("uses the item resref only when a real matching asset exists", () => {
    const result = composeItemIconPreview(
      buildSceneObject({
        resRef: "custom_hide_armor",
        itemProperties: {
          baseItem: 16,
          baseItemLabel: "Armor",
          materialColors: {
            leather1: 5,
            metal1: 17
          },
          modelAssetCandidates: [
            {
              assetId: "asset-custom-armor-icon",
              role: "texture",
              fileName: "custom_hide_armor.webp",
              objectKey: "modules/current/custom_hide_armor.webp",
              extension: "webp",
              reference: "custom_hide_armor",
              assetUrl: "/api/v1/catalog/placeables/cache/icon/assets/custom_hide_armor.webp"
            }
          ]
        }
      })
    );

    expect(result).toMatchObject({
      iconResRef: "custom_hide_armor",
      source: "asset-texture",
      modelPartCount: 0,
      previewImageUrl: "/api/v1/catalog/placeables/cache/icon/assets/custom_hide_armor.webp"
    });
    expect(result?.swatches).toHaveLength(2);
  });

  it("does not synthesize a preview from model part or item resref metadata alone", () => {
    expect(
      composeItemIconPreview(
        buildSceneObject({
          itemProperties: {
            baseItem: 22,
            baseItemLabel: "Dagger",
            modelParts: [11, 13, 63],
            modelPartResRefs: ["w_dgtr_011", "w_dgtr_013", "w_dgtr_063"]
          }
        })
      )
    ).toBeNull();

    expect(
      composeItemIconPreview(
        buildSceneObject({
          resRef: "custom_hide_armor",
          itemProperties: {
            baseItem: 16,
            baseItemLabel: "Armor"
          }
        })
      )
    ).toBeNull();
  });
});
