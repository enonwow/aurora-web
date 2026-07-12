import { describe, expect, it } from "vitest";
import {
  buildPlaceablesModePreviewSeed,
  mapPlaceablePreviewToScene,
  type PlaceablePreviewPayload
} from "../../../../src/modules/placeables/application/placeablePreviewSceneMapper";

describe("mapPlaceablePreviewToScene", () => {
  it("builds seed scene for placeables mode preview", () => {
    const payload: PlaceablePreviewPayload = {
      templateId: "plc_seed",
      resref: "plc_seed",
      name: "Seed",
      kind: "placeable"
    };
    const now = () => 1770000000100;

    const seed = buildPlaceablesModePreviewSeed(payload, { now, width: 2, height: 3 });

    expect(seed).toMatchObject({
      sceneId: "preview:plc_seed",
      areaName: "Seed Preview",
      width: 2,
      height: 3,
      source: "seed",
      updatedAtUnixMs: 1770000000100,
      objects: []
    });
    expect(seed.tiles).toHaveLength(0);
  });

  it("builds stable preview scene shape with exactly one placeable object", () => {
    const payload: PlaceablePreviewPayload = {
      templateId: "plc_a01",
      resref: "plc_a01",
      name: "Barrel",
      kind: "placeable"
    };
    const now = () => 1770000000123;

    const scene = mapPlaceablePreviewToScene(payload, { now });

    expect(scene).toMatchObject({
      sceneId: "preview:plc_a01",
      areaName: "Barrel Preview",
      width: 1,
      height: 1,
      source: "seed",
      updatedAtUnixMs: 1770000000123
    });
    expect(scene.tiles).toHaveLength(0);
    expect(scene.objects).toHaveLength(1);
    expect(scene.objects[0]).toMatchObject({
      id: "preview:plc_a01",
      kind: "placeables",
      name: "Barrel",
      resRef: "plc_a01",
      tag: "PLC_A01",
      isStatic: true,
      x: 0.5,
      y: 0.5,
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
      }
    });
  });

  it("uses metadata coordinates when provided", () => {
    const payload: PlaceablePreviewPayload = {
      templateId: "plc_table",
      resref: "plc_table",
      name: "Table",
      kind: "placeable",
      metadata: {
        x: 9.25,
        y: 4.5,
        z: 1.75,
        bearing: 270
      }
    };

    const scene = mapPlaceablePreviewToScene(payload);

    expect(scene.objects[0]).toMatchObject({
      x: 9.25,
      y: 4.5,
      z: 1.75,
      bearing: 270
    });
  });

  it("preserves top-level position and orientation when provided", () => {
    const payload: PlaceablePreviewPayload = {
      templateId: "plc_oriented",
      resref: "plc_oriented",
      name: "Oriented",
      kind: "placeable",
      x: 12.5,
      y: 13.75,
      z: 2,
      bearing: 315,
      metadata: {
        x: 1,
        y: 1,
        z: 1,
        bearing: 1
      }
    };

    const scene = mapPlaceablePreviewToScene(payload);

    expect(scene.objects[0]).toMatchObject({
      x: 12.5,
      y: 13.75,
      z: 2,
      bearing: 315
    });
  });

  it("falls back to safe defaults for invalid coordinates and invalid scene dimensions", () => {
    const payload: PlaceablePreviewPayload = {
      templateId: "plc_invalid",
      resref: "plc_invalid",
      name: "Invalid",
      kind: "placeable",
      metadata: {
        x: "NaN",
        y: "  ",
        z: "abc",
        bearing: Number.POSITIVE_INFINITY
      }
    };

    const scene = mapPlaceablePreviewToScene(payload, { width: -20, height: 0.2 });

    expect(scene.width).toBe(1);
    expect(scene.height).toBe(1);
    expect(scene.tiles).toHaveLength(0);
    expect(scene.objects[0]).toMatchObject({
      x: 0.5,
      y: 0.5,
      z: 0,
      bearing: 0
    });
  });

  it("uses metadata orientation fallback when bearing is missing", () => {
    const payload: PlaceablePreviewPayload = {
      templateId: "plc_orientation",
      resref: "plc_orientation",
      name: "Orientation",
      kind: "placeable",
      metadata: {
        orientation: 225
      }
    };

    const scene = mapPlaceablePreviewToScene(payload);

    expect(scene.objects[0].bearing).toBe(225);
  });

  it("maps decompiled UTP ItemList metadata into placeable inventory properties", () => {
    const payload: PlaceablePreviewPayload = {
      templateId: "plc_loot_chest",
      resref: "plc_loot_chest",
      name: "Loot Chest",
      kind: "placeable",
      metadata: {
        useable: true,
        hasInventory: true,
        inventoryItemListEntries: JSON.stringify([
          {
            resRef: "nw_it_mpotion001",
            randomResRef: "rnd_potion",
            randomList: "rl_potions",
            itemTemplateId: "item_nw_it_mpotion001",
            itemResref: "nw_it_mpotion001",
            x: 2,
            y: 3,
            dropable: true,
            pickpocketable: false,
            infinite: false
          },
          {
            embeddedItem: {
              sourceStructTypeId: 4294967295,
              templateResRef: "emb_chest_ring",
              tag: "EMB_CHEST_RING",
              localizedName: "Embedded Ring",
              baseItem: 52,
              itemPropertyListCount: 1,
              fieldCount: 5
            },
            x: 4,
            y: 5,
            dropable: true,
            pickpocketable: false,
            infinite: true
          }
        ])
      }
    };

    const scene = mapPlaceablePreviewToScene(payload);

    expect(scene.objects[0].placeableProperties).toMatchObject({
      useable: true,
      hasInventory: true,
      inventoryItems: [
        {
          resRef: "nw_it_mpotion001",
          randomResRef: "rnd_potion",
          randomList: "rl_potions",
          itemTemplateId: "item_nw_it_mpotion001",
          itemResRef: "nw_it_mpotion001",
          x: 2,
          y: 3,
          dropable: true,
          pickpocketable: false,
          infinite: false
        },
        {
          embeddedItem: {
            sourceStructTypeId: 4294967295,
            templateResRef: "emb_chest_ring",
            tag: "EMB_CHEST_RING",
            localizedName: "Embedded Ring",
            baseItem: 52,
            itemPropertyListCount: 1,
            fieldCount: 5
          },
          x: 4,
          y: 5,
          dropable: true,
          pickpocketable: false,
          infinite: true
        }
      ]
    });
  });

  it("adds Aurora-first preserve payload for VFX placeable previews", () => {
    const payload: PlaceablePreviewPayload = {
      templateId: "plc_cot_fx01",
      resref: "cot_fx01",
      name: "VFX: Smoke, Red",
      kind: "placeable",
      placeableSubtype: "vfx",
      metadata: {
        rendererPreset: "vfx-emitter",
        lookupModelResRef: "cot_fx01"
      }
    };

    const scene = mapPlaceablePreviewToScene(payload);

    expect(scene.objects[0].vfxPayload).toMatchObject({
      sourceKind: "placeable_preview",
      sourceProfile: "catalog-placeable-vfx",
      sourceTable: "placeable-template-catalog",
      sourceResRef: "cot_fx01",
      previewMode: "sprite_scaffold",
      canonicalStatus: "preview_only",
      flags: {
        isPlaceableVfx: true
      }
    });
    expect(scene.objects[0].vfxPayload?.diagnostics.map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        "VFX_PLACEABLE_KIND_NOT_EFFECTVISUALEFFECT",
        "VFX_PLACEABLE_VFX_PRESERVE_PAYLOAD_PREVIEW_ONLY"
      ])
    );
  });

  it("normalizes identity fields and keeps deterministic fallback shape", () => {
    const payload: PlaceablePreviewPayload = {
      templateId: "  ",
      resref: "   plc_trimmed_resref   ",
      name: "   ",
      kind: "placeable",
      tag: "   "
    };

    const scene = mapPlaceablePreviewToScene(payload);

    expect(scene).toMatchObject({
      sceneId: "preview:plc_trimmed_resref",
      areaName: "Placeable Preview"
    });
    expect(scene.objects[0]).toMatchObject({
      id: "preview:plc_trimmed_resref",
      resRef: "plc_trimmed_resref",
      name: "Placeable",
      tag: "PLC_TRIMMED_RESREF"
    });
  });
});
