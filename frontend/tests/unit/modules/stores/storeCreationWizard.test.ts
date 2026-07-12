import { describe, expect, it } from "vitest";
import {
  buildStoreBlueprintCreatePayloadFromDraft,
  createDuplicateStoreWizardDraftFromStore,
  createStoreWizardDraftFromStore,
  createStoreWizardDraft,
  sanitizeStoreCreationNumberInput,
  sanitizeStoreCreationResRef
} from "../../../../src/modules/stores/application/storeCreationWizard";

describe("storeCreationWizard", () => {
  it("builds Aurora UTM store blueprint payloads with five buckets and restrictions", () => {
    const draft = createStoreWizardDraft(12);
    draft.name = "Potion Store";
    draft.resRef = sanitizeStoreCreationResRef("Potion Store");
    draft.tag = "POTION_STORE";
    draft.markUp = "135";
    draft.markDown = "45";
    draft.blackMarket = true;
    draft.bmMarkDown = "25";
    draft.onOpenStore = "open_potion";
    draft.buckets[0] = {
      bucketTypeId: "0",
      itemListEntries: [
        {
          resRef: "nw_it_mpotion021",
          randomResRef: "",
          randomList: "",
          x: "2",
          y: "3",
          infinite: true
        },
        {
          resRef: "",
          randomResRef: "rnd_store_item",
          randomList: "rl_store_loot",
          x: "4",
          y: "5",
          infinite: false
        },
        {
          resRef: "",
          randomResRef: "",
          randomList: "",
          embeddedItem: {
            sourceStructTypeId: 4294967295,
            templateResRef: "emb_store_ring",
            tag: "EMB_STORE_RING",
            localizedName: "Embedded Store Ring",
            baseItem: 52,
            itemPropertyListCount: 1,
            fieldCount: 5
          },
          x: "6",
          y: "7",
          infinite: true
        }
      ]
    };
    draft.willNotBuyBaseItems = "16, 16 22";
    draft.willOnlyBuyBaseItems = "5";

    const payload = buildStoreBlueprintCreatePayloadFromDraft(draft);

    expect(payload).toMatchObject({
      resRef: "potion_store",
      name: "Potion Store",
      tag: "POTION_STORE",
      markUp: 135,
      markDown: 45,
      blackMarket: true,
      bmMarkDown: 25,
      onOpenStore: "open_potion",
      storeListEntries: [
        {
          bucketTypeId: 0,
          itemListEntries: [
            {
              resRef: "nw_it_mpotion021",
              x: 2,
              y: 3,
              infinite: true
            },
            {
              randomResRef: "rnd_store_item",
              randomList: "rl_store_loot",
              x: 4,
              y: 5,
              infinite: false
            },
            {
              embeddedItem: {
                sourceStructTypeId: 4294967295,
                templateResRef: "emb_store_ring",
                tag: "EMB_STORE_RING",
                localizedName: "Embedded Store Ring",
                baseItem: 52
              },
              x: 6,
              y: 7,
              infinite: true
            }
          ]
        },
        { bucketTypeId: 1, itemListEntries: [] },
        { bucketTypeId: 2, itemListEntries: [] },
        { bucketTypeId: 3, itemListEntries: [] },
        { bucketTypeId: 4, itemListEntries: [] }
      ],
      willNotBuyBaseItems: [16, 22],
      willOnlyBuyBaseItems: [5]
    });
  });

  it("sanitizes numeric inputs without allowing negatives", () => {
    expect(sanitizeStoreCreationNumberInput("-42abc", 10)).toBe("10");
    expect(sanitizeStoreCreationNumberInput("", 10)).toBe("");
  });

  it("hydrates store wizard drafts from parsed UTM metadata", () => {
    const draft = createStoreWizardDraftFromStore({
      templateId: "str_existing_store",
      resref: "existing_store",
      name: "Existing Store",
      category: "custom",
      tags: ["custom"],
      previewImageUrl: "",
      metadata: {
        templateResRef: "existing_store",
        localizedName: "Existing Potion Store",
        tag: "EXISTING_STORE",
        comments: "from UTM",
        markUp: 140,
        markDown: 35,
        blackMarket: true,
        bmMarkDown: 20,
        onOpenStore: "open_store",
        storeId: 9,
        storeListEntries: JSON.stringify([
          {
            bucketIndex: 0,
            bucketTypeId: 0,
            itemListEntries: [
              {
                resRef: "nw_it_mpotion021",
                randomResRef: "rnd_potion",
                randomList: "rl_potions",
                x: 2,
                y: 3,
                infinite: true
              }
            ]
          },
          {
            bucketIndex: 3,
            bucketTypeId: 3,
            itemListEntries: [
              { randomResRef: "rnd_ring", randomList: "rl_rings", x: 4, y: 5 },
              {
                embeddedItem: {
                  sourceStructTypeId: 4294967295,
                  templateResRef: "emb_store_ring",
                  tag: "EMB_STORE_RING",
                  localizedName: "Embedded Ring",
                  baseItem: 52,
                  itemPropertyListCount: 1,
                  fieldCount: 5
                },
                x: 6,
                y: 7,
                infinite: true
              }
            ]
          }
        ]),
        willNotBuyBaseItems: JSON.stringify([16, 22]),
        willOnlyBuyBaseItems: JSON.stringify([5])
      }
    });

    expect(draft).toMatchObject({
      name: "Existing Potion Store",
      resRef: "existing_store",
      tag: "EXISTING_STORE",
      comments: "from UTM",
      markUp: "140",
      markDown: "35",
      blackMarket: true,
      bmMarkDown: "20",
      onOpenStore: "open_store",
      storeId: "9",
      willNotBuyBaseItems: "16, 22",
      willOnlyBuyBaseItems: "5"
    });
    expect(draft.buckets).toHaveLength(5);
    expect(draft.buckets[0].itemListEntries[0]).toMatchObject({
      resRef: "nw_it_mpotion021",
      randomResRef: "rnd_potion",
      randomList: "rl_potions",
      x: "2",
      y: "3",
      infinite: true
    });
    expect(draft.buckets[3].itemListEntries[0]).toMatchObject({
      resRef: "",
      randomResRef: "rnd_ring",
      randomList: "rl_rings",
      x: "4",
      y: "5",
      infinite: false
    });
    expect(draft.buckets[3].itemListEntries[1]).toMatchObject({
      resRef: "",
      randomResRef: "",
      randomList: "",
      embeddedItem: {
        sourceStructTypeId: 4294967295,
        templateResRef: "emb_store_ring",
        tag: "EMB_STORE_RING",
        localizedName: "Embedded Ring",
        baseItem: 52,
        itemPropertyListCount: 1,
        fieldCount: 5
      },
      x: "6",
      y: "7",
      infinite: true
    });
  });

  it("builds duplicate store wizard drafts with bounded identifiers", () => {
    const duplicate = createDuplicateStoreWizardDraftFromStore(
      {
        templateId: "str_very_long_existing_store",
        resref: "very_long_existing_store",
        name: "Existing Store",
        category: "custom",
        tags: ["custom"],
        previewImageUrl: "",
        metadata: {
          templateResRef: "very_long_existing_store",
          tag: "VERY_LONG_EXISTING_STORE"
        }
      },
      42
    );

    expect(duplicate.name).toBe("Existing Store Copy");
    expect(duplicate.resRef).toBe("very_long_ex_042");
    expect(duplicate.resRef).toHaveLength(16);
    expect(duplicate.tag).toBe("VERY_LONG_EXISTING_STORE_042");
  });
});
