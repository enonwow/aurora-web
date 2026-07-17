import { describe, expect, it } from "vitest";
import { mapStoreApiListItemToSceneObject } from "../../../../src/modules/stores/application/storeSceneObjectMapper";

describe("storeSceneObjectMapper", () => {
  it("maps backend UTM catalog metadata into an Area-addable store object", () => {
    const object = mapStoreApiListItemToSceneObject(
      {
        templateId: "store_nw_storemagic001",
        resref: "nw_storemagic001",
        name: "Magic Store",
        category: "Stores",
        tags: ["store"],
        previewImageUrl: "",
        metadata: {
          templateResRef: "nw_storemagic001",
          localizedName: "Retail Magic Store",
          tag: "magic_shop",
          description: "Retail UTM with five StoreList buckets.",
          sourceFileType: "UTM ",
          sourceFileVersion: "V3.2",
          sourceStructTypeId: 2051
        }
      },
      7
    );

    expect(object).toMatchObject({
      id: "sto_template_store_nw_storemagic001",
      kind: "stores",
      name: "Retail Magic Store",
      resRef: "nw_storemagic001",
      tag: "MAGIC_SHOP",
      isStatic: false,
      source: {
        type: "aurora_git",
        sourceKind: "store",
        sourceObjectId: "store_nw_storemagic001",
        templateId: "store_nw_storemagic001",
        sourceFileType: "UTM ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 2051,
        localizedName: "Retail Magic Store",
        description: "Retail UTM with five StoreList buckets."
      }
    });
  });
});
