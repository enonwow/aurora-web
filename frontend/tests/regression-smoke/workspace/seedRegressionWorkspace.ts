import { saveLocalSceneDraft } from "../../../src/modules/scene/adapters/localDraftStore";
import type { AreaSoundProfileStorage } from "../../../src/modules/areas/domain/areaSoundProfileStorage";
import {
  createNewSceneObject,
  createSeedAreaScene,
} from "../../../src/modules/scene/domain/sceneFactory";

export function seedBuilderWorkspace(): void {
  saveLocalSceneDraft("u_builder_001", createSeedAreaScene(), window.localStorage);
}

export function seedBuilderWorkspaceWithExactStoreComment(): void {
  const scene = createSeedAreaScene();
  const store = createNewSceneObject("stores", 3.5, 4.25, 19);
  store.id = `${scene.sceneId}:store:0:x2_merc_dye`;
  store.tag = "STORE_DYE_01";
  store.resRef = "x2_merc_dye";
  store.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceObjectId: "store:0:x2_merc_dye",
    sourceIndex: 0,
    sourceKind: "store",
    storeEditorComment: "  source store note  ",
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
        willOnlyBuy: { present: true, baseItemIds: [] },
      },
      tableSha256: "e".repeat(64),
      tableRowCount: 4,
    },
    storeInventory: {
      expectedBuckets: [
        {
          bucketTypeId: 0,
          entries: [
            {
              sourceIndex: 0, resRef: "itm_a", baseItemId: 0,
              slotWidth: 1, slotHeight: 1, x: 0, y: 0, infinite: true,
            },
            {
              sourceIndex: 1, resRef: "itm_b", baseItemId: 1,
              slotWidth: 1, slotHeight: 1, x: 1, y: 0, infinite: false,
            },
          ],
        },
        { bucketTypeId: 4, entries: [] },
        { bucketTypeId: 2, entries: [] },
        { bucketTypeId: 3, entries: [] },
        { bucketTypeId: 1, entries: [] },
      ],
      tableSha256: "e".repeat(64),
      tableRowCount: 4,
    },
  };
  store.storeProperties = {
    comments: "  source store note  ",
    commerce: {
      markUp: 100,
      markDown: 65,
      blackMarket: false,
      blackMarketMarkDown: 25,
      identifyPrice: 100,
      maxBuyPrice: -1,
      storeGold: -1,
    },
    scriptResRefs: {
      onOpenStore: "store_open",
      onStoreClosed: "store_closed",
    },
    variables: [{ name: "Counter", type: "int", value: 1 }],
    restrictions: { willNotBuy: [2, 1, 2], willOnlyBuy: [] },
    inventoryBuckets: [
      {
        bucketTypeId: 0,
        entries: [
          { sourceIndex: 0, resRef: "itm_a", baseItemId: 0, infinite: true },
          { sourceIndex: 1, resRef: "itm_b", baseItemId: 1, infinite: false },
        ],
      },
      { bucketTypeId: 4, entries: [] },
      { bucketTypeId: 2, entries: [] },
      { bucketTypeId: 3, entries: [] },
      { bucketTypeId: 1, entries: [] },
    ],
  };
  saveLocalSceneDraft(
    "u_builder_001",
    {
      ...scene,
      itemBaseItemCatalog: {
        descriptor: {
          resourceName: "baseitems.2da",
          sourceObjectKey: "modules/current/baseitems.2da",
          sourceLayer: "module",
          sha256: "e".repeat(64),
          sizeBytes: 4096,
          rowCount: 4,
        },
        rows: Array.from({ length: 4 }, (_, rowIndex) => ({
          rowIndex,
          modelType: 0 as const,
          displayName: `Base item ${rowIndex}`,
          invSlotWidth: 1,
          invSlotHeight: 1,
        })),
      },
      objects: [...scene.objects, store],
    },
    window.localStorage,
  );
}

export function seedBuilderWorkspaceWithExactSoundEditing(): void {
  const scene = createSeedAreaScene();
  const profile: AreaSoundProfileStorage = {
    sounds: ["as_amb_forest"],
    loopingByte: 0,
    continuousByte: 1,
    priorityByte: 3,
    positionalByte: 1,
    randomPositionByte: 0,
    elevationFloat32: 0,
    maxDistanceFloat32: 12,
    minDistanceFloat32: Math.fround(1.2),
    randomRangeXFloat32: 0,
    randomRangeYFloat32: 0,
    intervalDword: 0,
    intervalVariationDword: 0,
  };
  const active = { activeByte: 1 as const };
  const schedule = { hoursMask: 0, timesByte: 3 };
  const playOrder = { randomByte: 0 as const };
  const playStyle = {
    loopingByte: 0 as const,
    continuousByte: 1 as const,
    priorityByte: 3 as const,
    positionalByte: 1 as const,
    soundsCount: 1,
    intervalDword: 0,
    intervalVariationDword: 0,
  };
  const intervalVariation = {
    intervalMilliseconds: 0,
    intervalVariationMilliseconds: 0,
    pitchVariationHundredths: 0,
    volumeVariationByte: 0,
  };
  saveLocalSceneDraft(
    "u_builder_001",
    {
      ...scene,
      objects: scene.objects.map((object) => {
        if (object.tag === "SOUND_FOREST_01") return {
            ...object,
            soundPositioning: {
              mode: "specific" as const,
              elevation: profile.elevationFloat32,
              maxVolumeDistance: profile.minDistanceFloat32,
              cutoffDistance: profile.maxDistanceFloat32,
              randomRangeWestEast: profile.randomRangeXFloat32,
              randomRangeNorthSouth: profile.randomRangeYFloat32,
            },
            soundProfile: profile,
            source: {
              type: "aurora_git" as const,
              areaId: scene.sceneId,
              sourceObjectId: object.id,
              sourceIndex: 0,
              sourceKind: "sound" as const,
              soundProfileStorage: profile,
            },
          };
        if (object.tag === "SOUND_CAVES_02") return {
          ...object,
          soundActive: active,
          soundSchedule: schedule,
          soundPlayOrder: playOrder,
          soundPlayStyle: playStyle,
          soundIntervalVariation: intervalVariation,
          source: {
            type: "aurora_git" as const,
            areaId: scene.sceneId,
            sourceObjectId: object.id,
            sourceIndex: 1,
            sourceKind: "sound" as const,
            soundActiveStorage: active,
            soundScheduleStorage: schedule,
            soundPlayOrderStorage: playOrder,
            soundPlayStyleStorage: playStyle,
            soundIntervalVariationStorage: intervalVariation,
          },
        };
        return object;
      }),
    },
    window.localStorage,
  );
}
