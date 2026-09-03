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

  it("maps exact effective UTM provenance into an Area-constructible Store template", () => {
    const object = mapStoreApiListItemToSceneObject({
      templateId: "str_nw_storemagic001",
      resref: "nw_storemagic001",
      name: "Magic Store",
      category: "Stores",
      tags: ["store"],
      previewImageUrl: "",
      metadata: {
        templateResRef: "nw_storemagic001",
        localizedName: "Retail Magic Store",
        tag: "Magic_Store_Tag",
        sourceObjectKey:
          "modules/current/__aurora/sources/vanilla/templates/nw_storemagic001.utm",
        sourceSizeBytes: 4096,
        sourceSha256: "b".repeat(64),
        sourceExtension: "utm",
        sourceFileType: "UTM ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
      },
    });

    expect(object).toMatchObject({
      id: "sto_template_str_nw_storemagic001",
      kind: "stores",
      name: "Retail Magic Store",
      resRef: "nw_storemagic001",
      tag: "Magic_Store_Tag",
      source: {
        type: "aurora_blueprint",
        sourceKind: "store",
        sourceProfileId: "effective-catalog-utm-store-copy-v1",
        templateId: "str_nw_storemagic001",
        templateResRef: "nw_storemagic001",
        sourceObjectKey:
          "modules/current/__aurora/sources/vanilla/templates/nw_storemagic001.utm",
        sourceSizeBytes: 4096,
        sourceEtag: "b".repeat(64),
        sourceFileType: "UTM ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
      },
    });
  });
});
