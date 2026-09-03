import { beforeEach, describe, expect, it } from "vitest";
import {
  createNewSceneObject,
  createSeedAreaScene,
} from "../../../../src/modules/scene/domain/sceneFactory";
import {
  clearLocalSceneDraft,
  loadLocalSceneDraft,
  saveLocalSceneDraft
} from "../../../../src/modules/scene/adapters/localDraftStore";

describe("localDraftStore", () => {
  const userId = "u_builder_001";

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("saves and loads draft by user id", () => {
    const scene = createSeedAreaScene();
    saveLocalSceneDraft(userId, scene, window.localStorage);

    const loaded = loadLocalSceneDraft(userId, window.localStorage);
    expect(loaded).not.toBeNull();
    expect(loaded?.source).toBe("local_draft");
    expect(loaded?.tiles).toHaveLength(scene.tiles.length);
  });

  it("clears saved draft", () => {
    const scene = createSeedAreaScene();
    saveLocalSceneDraft(userId, scene, window.localStorage);
    clearLocalSceneDraft(userId, window.localStorage);

    const loaded = loadLocalSceneDraft(userId, window.localStorage);
    expect(loaded).toBeNull();
  });

  it("keeps drafts isolated per user", () => {
    const scene = createSeedAreaScene();
    saveLocalSceneDraft("u_a", { ...scene, areaName: "Area A" }, window.localStorage);
    saveLocalSceneDraft("u_b", { ...scene, areaName: "Area B" }, window.localStorage);

    const draftA = loadLocalSceneDraft("u_a", window.localStorage);
    const draftB = loadLocalSceneDraft("u_b", window.localStorage);

    expect(draftA?.areaName).toBe("Area A");
    expect(draftB?.areaName).toBe("Area B");
  });

  it("persists drafts under stable storage key", () => {
    const scene = createSeedAreaScene();
    saveLocalSceneDraft(userId, scene, window.localStorage);

    const raw = window.localStorage.getItem("aurora-web.local-area-drafts.v1");
    expect(raw).not.toBeNull();
    expect(raw).toContain(`"user:${userId}"`);
    expect(raw).toContain('"source":"local_draft"');
  });

  it("round-trips immutable Aurora blueprint provenance for a new waypoint", () => {
    const scene = createSeedAreaScene();
    scene.objects = [createNewSceneObject("waypoints", 3.5, 4.75, 9)];

    saveLocalSceneDraft(userId, scene, window.localStorage);

    expect(loadLocalSceneDraft(userId, window.localStorage)?.objects[0]).toMatchObject({
      id: "way_009",
      resRef: "nw_waypoint001",
      tag: "NW_WAYPOINT001",
      source: {
        type: "aurora_blueprint",
        sourceProfileId: "nwn-base-key-utw-v1",
        sourceEtag: "13122a96b64f277c1c6aecb8984f1b5b9c133fb9fb514ce24a1bef564a53055a",
      },
    });
  });

  it("round-trips immutable Aurora blueprint provenance for a new sound", () => {
    const scene = createSeedAreaScene();
    scene.objects = [createNewSceneObject("sounds", 3.75, 4.9, 10)];

    saveLocalSceneDraft(userId, scene, window.localStorage);

    expect(loadLocalSceneDraft(userId, window.localStorage)?.objects[0]).toMatchObject({
      id: "sou_010",
      resRef: "animalcriesday",
      tag: "AnimalCriesDay",
      bearing: 0,
      source: {
        type: "aurora_blueprint",
        sourceKind: "sound",
        sourceProfileId: "nwn-base-key-uts-animalcriesday-v1",
        sourceEtag: "a0d185c2813db9cd2649e104715e94c01511f83b97f3319a0ee3c31b8c3357b4",
      },
    });
  });

  it("round-trips immutable Aurora blueprint provenance for a new placeable", () => {
    const scene = createSeedAreaScene();
    scene.objects = [createNewSceneObject("placeables", 2.744, 2.976, 11)];

    saveLocalSceneDraft(userId, scene, window.localStorage);

    expect(loadLocalSceneDraft(userId, window.localStorage)?.objects[0]).toMatchObject({
      id: "pla_011",
      resRef: "plc_watertrough",
      tag: "WaterTrough",
      source: {
        type: "aurora_blueprint",
        sourceKind: "placeable",
        sourceProfileId: "nwn-base-key-utp-plc-watertrough-v1",
        sourceEtag: "a1b00834837b3c516d823f63e00054b2331044bdbccca1d49f1bc121f854c531",
      },
    });
  });

  it("round-trips immutable Aurora blueprint provenance for a new ground item", () => {
    const scene = createSeedAreaScene();
    scene.objects = [createNewSceneObject("items", 1.5, 2.25, 12)];

    saveLocalSceneDraft(userId, scene, window.localStorage);

    expect(loadLocalSceneDraft(userId, window.localStorage)?.objects[0]).toMatchObject({
      id: "ite_012",
      resRef: "nw_cloth022",
      tag: "NW_CLOTH022",
      source: {
        type: "aurora_blueprint",
        sourceKind: "item",
        sourceProfileId: "nwn-base-key-uti-nw-cloth022-v1",
        sourceEtag: "606788a4d7e44de76e4c3f38ce4b2b7bae06d64721140995efa011066b5279a6",
      },
    });
  });

  it("round-trips detached retained Store editor Comment provenance and target", () => {
    const scene = createSeedAreaScene();
    const store = createNewSceneObject("stores", 2.5, 3.25, 13);
    store.source = {
      type: "aurora_git",
      sourceKind: "store",
      sourceIndex: 0,
      sourceObjectId: "store:0:x2_merc_dye",
      storeEditorComment: "  source note  ",
      storeCommerce: {
        markUp: 100,
        markDown: 65,
        blackMarket: false,
        blackMarketMarkDown: 25,
        identifyPrice: 100,
        maxBuyPrice: -1,
        storeGold: -1,
      },
      storeScriptResRefs: {
        onOpenStore: "store_open",
        onStoreClosed: "store_closed",
      },
      storeVariables: { expectedEntries: [
        { sourceIndex: 0, name: "Counter", type: "int", value: 1 },
      ] },
      storeRestrictions: {
        expectedValue: {
          willNotBuy: { present: true, baseItemIds: [2, 1, 2] },
          willOnlyBuy: { present: false, baseItemIds: [] },
        },
        tableSha256: "e".repeat(64),
        tableRowCount: 4,
      },
    };
    store.storeProperties = {
      comments: "  changed note  ",
      commerce: {
        markUp: 125,
        markDown: 70,
        blackMarket: true,
        blackMarketMarkDown: 30,
        identifyPrice: 150,
        maxBuyPrice: 5000,
        storeGold: 20000,
      },
      scriptResRefs: {
        onOpenStore: "nw_store_open",
        onStoreClosed: "nw_store_close",
      },
      variables: [{ name: "Counter", type: "int", value: 2 }],
      restrictions: { willNotBuy: [1, 2, 1], willOnlyBuy: [0] },
    };
    scene.objects = [store];

    saveLocalSceneDraft(userId, scene, window.localStorage);

    const loaded = loadLocalSceneDraft(userId, window.localStorage)?.objects[0];
    expect(loaded).toMatchObject({
      source: {
        storeEditorComment: "  source note  ",
        storeCommerce: { markUp: 100, blackMarket: false },
        storeScriptResRefs: { onOpenStore: "store_open", onStoreClosed: "store_closed" },
        storeVariables: {
          expectedEntries: [{ sourceIndex: 0, name: "Counter", type: "int", value: 1 }],
        },
        storeRestrictions: {
          expectedValue: {
            willNotBuy: { present: true, baseItemIds: [2, 1, 2] },
            willOnlyBuy: { present: false, baseItemIds: [] },
          },
          tableSha256: "e".repeat(64),
          tableRowCount: 4,
        },
      },
      storeProperties: {
        comments: "  changed note  ",
        commerce: { markUp: 125, blackMarket: true },
        scriptResRefs: { onOpenStore: "nw_store_open", onStoreClosed: "nw_store_close" },
        variables: [{ name: "Counter", type: "int", value: 2 }],
        restrictions: { willNotBuy: [1, 2, 1], willOnlyBuy: [0] },
      },
    });
    expect(loaded?.source).not.toBe(store.source);
    expect(loaded?.storeProperties).not.toBe(store.storeProperties);
    expect(loaded?.source?.storeCommerce).not.toBe(store.source.storeCommerce);
    expect(loaded?.storeProperties?.commerce).not.toBe(store.storeProperties.commerce);
    expect(loaded?.source?.storeScriptResRefs).not.toBe(store.source.storeScriptResRefs);
    expect(loaded?.storeProperties?.scriptResRefs).not.toBe(store.storeProperties.scriptResRefs);
    expect(loaded?.source?.storeVariables).not.toBe(store.source.storeVariables);
    expect(loaded?.source?.storeVariables?.expectedEntries)
      .not.toBe(store.source.storeVariables.expectedEntries);
    expect(loaded?.storeProperties?.variables).not.toBe(store.storeProperties.variables);
    expect(loaded?.source?.storeRestrictions).not.toBe(store.source.storeRestrictions);
    expect(loaded?.source?.storeRestrictions?.expectedValue.willNotBuy.baseItemIds)
      .not.toBe(store.source.storeRestrictions.expectedValue.willNotBuy.baseItemIds);
    expect(loaded?.storeProperties?.restrictions).not.toBe(
      store.storeProperties.restrictions,
    );
    expect(loaded?.storeProperties?.restrictions?.willNotBuy).not.toBe(
      store.storeProperties.restrictions.willNotBuy,
    );
  });

  it("round-trips detached Item-wizard reference-form inventory targets", () => {
    const scene = createSeedAreaScene();
    const item = createNewSceneObject("items", 1.5, 2.25, 13);
    item.id = "itm_wizard_nested_item_13";
    item.itemProperties = {
      ...item.itemProperties,
      blueprintInventoryItems: [{ resRef: "itm_potion", x: 3, y: 4 }],
      blueprintEquippedItems: [{ resRef: "itm_ring", slotMask: 4 }],
    };
    scene.objects = [item];

    saveLocalSceneDraft(userId, scene, window.localStorage);

    expect(loadLocalSceneDraft(userId, window.localStorage)?.objects[0]?.itemProperties)
      .toMatchObject({
        blueprintInventoryItems: [{ resRef: "itm_potion", x: 3, y: 4 }],
        blueprintEquippedItems: [{ resRef: "itm_ring", slotMask: 4 }],
      });
  });

  it("round-trips an exact dynamic UTI addition to a retained ground-Item ItemList", () => {
    const scene = createSeedAreaScene();
    const item = createNewSceneObject("items", 1.5, 2.25, 14);
    item.source = {
      type: "aurora_git",
      sourceKind: "item",
      sourceIndex: 0,
      sourceObjectId: "item:0:dynamic_inventory",
      itemInventoryItems: [],
    };
    item.itemProperties = {
      ...item.itemProperties,
      inventoryItems: [{
        resRef: "nw_cloth022",
        itemTemplateId: "itm_nw_cloth022",
        itemResRef: "nw_cloth022",
        itemSourceProfileId: "effective-catalog-uti-item-copy-v1",
        itemSourceObjectKey: "modules/current/items/nw_cloth022.uti",
        itemSourceSizeBytes: 4096,
        itemSourceFingerprint: "a".repeat(64),
        itemTag: "NW_CLOTH022",
        x: 3,
        y: 4,
      }],
    };
    scene.objects = [item];

    saveLocalSceneDraft(userId, scene, window.localStorage);

    expect(loadLocalSceneDraft(userId, window.localStorage)?.objects[0]).toMatchObject({
      source: { itemInventoryItems: [] },
      itemProperties: {
        inventoryItems: [{
          resRef: "nw_cloth022",
          itemTemplateId: "itm_nw_cloth022",
          itemSourceFingerprint: "a".repeat(64),
          x: 3,
          y: 4,
        }],
      },
    });
  });

  it("round-trips immutable Aurora blueprint provenance for a new trigger", () => {
    const scene = createSeedAreaScene();
    scene.objects = [createNewSceneObject("triggers", 3.547599411010742, 4.491108703613281, 15)];

    saveLocalSceneDraft(userId, scene, window.localStorage);

    expect(loadLocalSceneDraft(userId, window.localStorage)?.objects[0]).toMatchObject({
      id: "tri_015",
      resRef: "newgeneric",
      tag: "GenericTrigger",
      bearing: 0,
      source: {
        type: "aurora_blueprint",
        sourceKind: "trigger",
        sourceProfileId: "nwn-base-key-utt-newgeneric-v1",
        sourceEtag: "e855ae85a9b8511aca84ada06b9779126ff615f9bd816df4dbf39e1a1544001c",
      },
    });
  });

  it("round-trips immutable Aurora blueprint provenance for a new encounter", () => {
    const scene = createSeedAreaScene();
    scene.objects = [createNewSceneObject("encounters", 2.241201591491699, 4.51970329284668, 15)];

    saveLocalSceneDraft(userId, scene, window.localStorage);

    expect(loadLocalSceneDraft(userId, window.localStorage)?.objects[0]).toMatchObject({
      id: "enc_015",
      resRef: "x2_gnoll001",
      tag: "X2_GNOLL001",
      bearing: 0,
      source: {
        type: "aurora_blueprint",
        sourceKind: "encounter",
        sourceProfileId: "nwn-base-key-ute-x2-gnoll001-v1",
        sourceEtag: "f3941f1eb580b55247f3ac226e8e0aa72841c3c81ba205c61319b8958a5daeed",
      },
    });
  });

  it("round-trips binary-free dynamic Encounter blueprint provenance", () => {
    const scene = createSeedAreaScene();
    const encounter = createNewSceneObject("encounters", 3.25, 4.5, 16);
    encounter.id = "enc_dynamic";
    encounter.resRef = "enc_dynamic";
    encounter.tag = "DYNAMIC_ENCOUNTER";
    encounter.source = {
      type: "aurora_blueprint",
      sourceKind: "encounter",
      sourceProfileId: "effective-catalog-ute-encounter-copy-v1",
      templateId: "enc_enc_dynamic",
      templateResRef: "enc_dynamic",
      sourceObjectKey: "modules/current/blueprints/encounters/enc_dynamic.ute",
      sourceSizeBytes: 2048,
      sourceEtag: "a".repeat(64),
      sourceFileType: "UTE ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    };
    scene.objects = [encounter];

    saveLocalSceneDraft(userId, scene, window.localStorage);

    expect(loadLocalSceneDraft(userId, window.localStorage)?.objects[0]).toMatchObject({
      id: "enc_dynamic",
      resRef: "enc_dynamic",
      tag: "DYNAMIC_ENCOUNTER",
      source: {
        type: "aurora_blueprint",
        sourceKind: "encounter",
        sourceProfileId: "effective-catalog-ute-encounter-copy-v1",
        templateId: "enc_enc_dynamic",
        templateResRef: "enc_dynamic",
        sourceObjectKey: "modules/current/blueprints/encounters/enc_dynamic.ute",
        sourceSizeBytes: 2048,
        sourceEtag: "a".repeat(64),
      },
    });
  });

  it("round-trips binary-free dynamic Waypoint blueprint provenance", () => {
    const scene = createSeedAreaScene();
    const waypoint = createNewSceneObject("waypoints", 3.25, 4.5, 17);
    waypoint.id = "wpt_dynamic";
    waypoint.resRef = "wp_dynamic";
    waypoint.tag = "WP_DYNAMIC";
    waypoint.bearing = Math.PI / 3;
    waypoint.source = {
      type: "aurora_blueprint",
      sourceKind: "waypoint",
      sourceProfileId: "effective-catalog-utw-waypoint-copy-v1",
      templateId: "wpt_wp_dynamic",
      templateResRef: "wp_dynamic",
      sourceObjectKey: "modules/current/blueprints/waypoints/wp_dynamic.utw",
      sourceSizeBytes: 1024,
      sourceEtag: "c".repeat(64),
      sourceFileType: "UTW ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    };
    scene.objects = [waypoint];

    saveLocalSceneDraft(userId, scene, window.localStorage);

    expect(loadLocalSceneDraft(userId, window.localStorage)?.objects[0]).toMatchObject({
      id: "wpt_dynamic",
      resRef: "wp_dynamic",
      tag: "WP_DYNAMIC",
      bearing: Math.PI / 3,
      source: {
        type: "aurora_blueprint",
        sourceKind: "waypoint",
        sourceProfileId: "effective-catalog-utw-waypoint-copy-v1",
        templateId: "wpt_wp_dynamic",
        templateResRef: "wp_dynamic",
        sourceObjectKey: "modules/current/blueprints/waypoints/wp_dynamic.utw",
        sourceSizeBytes: 1024,
        sourceEtag: "c".repeat(64),
      },
    });
  });

});
