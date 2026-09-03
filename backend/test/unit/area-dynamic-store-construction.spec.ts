import { createHash } from "node:crypto";

import { parseRawGffDocument } from
  "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import {
  mutateExistingAreaObjectsInGitGic,
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-object-pair-writer";

const ROOT_TYPE = 0xffffffff;

describe("dynamic effective-catalog Area Store construction", () => {
  it("copies a hash-bound UTM and expands its reference-form UTI inventory", () => {
    const { addition } = dynamicStoreFixture();
    const pair = emptyPair();

    const first = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [addition],
    });
    const second = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [addition],
    });
    expect(first.gitBytes).toEqual(second.gitBytes);
    expect(first.gicBytes).toEqual(second.gicBytes);
    const gitStore = list(parseRawGffDocument(first.gitBytes), "StoreList")!.value[0]!;
    const gicStore = list(parseRawGffDocument(first.gicBytes), "StoreList")!.value[0]!;
    expect(gitStore.typeId).toBe(11);
    expect(gicStore).toEqual({
      typeId: 11,
      fields: [{ label: "Comment", type: "cexostring", value: "Dynamic comment" }],
    });
    expect(gitStore.fields).toEqual(expect.arrayContaining([
      { label: "ResRef", type: "resref", value: "str_dynamic" },
      { label: "Tag", type: "cexostring", value: "Dynamic_Store" },
      { label: "MarkUp", type: "int", value: -10 },
      { label: "MarkDown", type: "int", value: 0 },
      { label: "BlackMarket", type: "byte", value: 0 },
      { label: "BM_MarkDown", type: "int", value: 0 },
      { label: "IdentifyPrice", type: "int", value: 100 },
      { label: "MaxBuyPrice", type: "int", value: -1 },
      { label: "StoreGold", type: "int", value: -1 },
      { label: "OnOpenStore", type: "resref", value: "" },
      { label: "OnStoreClosed", type: "resref", value: "" },
      { label: "WillNotBuy", type: "list", value: [] },
      { label: "WillOnlyBuy", type: "list", value: [] },
    ]));
    const repositories = fieldList(gitStore.fields, "StoreList");
    expect(repositories.value.map((bucket) => bucket.typeId)).toEqual([0, 4, 2, 3, 1]);
    const itemList = fieldList(repositories.value[0]!.fields, "ItemList");
    expect(itemList.value[0]).toMatchObject({
      typeId: 0,
      fields: expect.arrayContaining([
        { label: "TemplateResRef", type: "resref", value: "itm_store_child" },
        { label: "BaseItem", type: "int", value: 22 },
        { label: "Repos_PosX", type: "word", value: 1 },
        { label: "Repos_Posy", type: "word", value: 2 },
        { label: "Infinite", type: "byte", value: 1 },
      ]),
    });
  });

  it.each([
    ["digest", { sourceSha256: "f".repeat(64) }, "Object blueprint digest differs"],
    ["size", { sourceSizeBytes: 1 }, "Dynamic Store addition identity is invalid"],
    ["source key", { sourceObjectKey: "" }, "Dynamic Store addition identity is invalid"],
  ])("rejects a dynamic Store with mismatched %s provenance", (_label, patch, message) => {
    const pair = emptyPair();
    const { addition } = dynamicStoreFixture();
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{ ...addition, ...patch }],
    })).toThrow(message);
  });

  it("rejects an embedded/random Store item instead of a catalog UTI reference", () => {
    const pair = emptyPair();
    const storeBytes = buildCanonicalStoreBytes([
      { label: "TemplateResRef", type: "resref", value: "itm_store_child" },
      { label: "BaseItem", type: "int", value: 22 },
      { label: "Repos_PosX", type: "word", value: 1 },
      { label: "Repos_Posy", type: "word", value: 2 },
    ]);
    const { addition } = dynamicStoreFixture({ storeBytes });
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [addition],
    })).toThrow("Dynamic Store inventory entry native fields are invalid.");
  });

  it.each([
    ["missing", false, true, "Dynamic Item dependency is missing"],
    ["unused", true, false, "Dynamic Store dependency closure contains unused entries"],
  ])("rejects a %s UTI dependency closure", (_label, includeDependency, includeReference, message) => {
    const pair = emptyPair();
    const storeBytes = buildCanonicalStoreBytes(includeReference ? undefined : []);
    const { addition } = dynamicStoreFixture({ storeBytes, includeDependency });
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [addition],
    })).toThrow(message);
  });
});

function dynamicStoreFixture(options: Readonly<{
  storeBytes?: Buffer;
  includeDependency?: boolean;
}> = {}) {
  const itemBytes = buildGffBuffer([
    { label: "TemplateResRef", type: "resref", value: "itm_store_child" },
    { label: "Tag", type: "cexostring", value: "ITM_STORE_CHILD" },
    { label: "BaseItem", type: "int", value: 22 },
    { label: "Comment", type: "cexostring", value: "Store child" },
  ], "UTI ", ROOT_TYPE);
  const storeBytes = options.storeBytes ?? buildCanonicalStoreBytes();
  return {
    itemBytes,
    storeBytes,
    addition: {
      kind: "store" as const,
      localObjectId: "sto_dynamic",
      sourceProfileId: "effective-catalog-utm-store-copy-v1",
      sourceObjectKey: "modules/current/stores/str_dynamic.utm",
      sourceSizeBytes: storeBytes.length,
      templateResRef: "str_dynamic",
      resRef: "str_dynamic",
      tag: "Dynamic_Store",
      sourceSha256: digest(storeBytes),
      blueprintBytes: storeBytes,
      blueprintDependencies: options.includeDependency === false ? [] : [{
        templateResRef: "itm_store_child",
        resourceType: 2025,
        sha256: digest(itemBytes),
        bytes: itemBytes,
        resolvedModelType: 0 as const,
      }],
      x: 1.25,
      y: 2.5,
      z: 0.125,
      bearing: Math.PI / 3,
    },
  };
}

function buildCanonicalStoreBytes(
  itemFields: SupportedGffField[] | undefined = [
    { label: "Repos_Posy", type: "word", value: 2 },
    { label: "InventoryRes", type: "resref", value: "itm_store_child" },
    { label: "Infinite", type: "byte", value: 1 },
    { label: "Repos_PosX", type: "word", value: 1 },
  ],
): Buffer {
  return buildGffBuffer([
    { label: "ResRef", type: "resref", value: "str_dynamic" },
    { label: "LocName", type: "cexolocstring", value: "Dynamic Store" },
    { label: "Tag", type: "cexostring", value: "Dynamic_Store" },
    { label: "MarkUp", type: "int", value: -10 },
    {
      label: "StoreList",
      type: "list",
      value: [
        {
          typeId: 0,
          fields: itemFields.length === 0 ? [] : [{
            label: "ItemList",
            type: "list",
            value: [{ typeId: 0, fields: itemFields }],
          }],
        },
        { typeId: 4, fields: [] },
        { typeId: 2, fields: [] },
        { typeId: 3, fields: [] },
        { typeId: 1, fields: [] },
      ],
    },
    { label: "Comment", type: "cexostring", value: "Dynamic comment" },
  ], "UTM ", ROOT_TYPE);
}

function digest(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function emptyPair(): { git: Buffer; gic: Buffer } {
  const labels = [
    ["Creature List", 4], ["Door List", 8], ["Encounter List", 7], ["List", 0],
    ["Placeable List", 9], ["SoundList", 6], ["StoreList", 11], ["TriggerList", 1],
    ["WaypointList", 5],
  ] as const;
  const fields: SupportedGffField[] = labels.map(([label]) => ({
    label,
    type: "list",
    value: [],
  }));
  return {
    git: buildGffBuffer(fields, "GIT ", ROOT_TYPE),
    gic: buildGffBuffer(fields, "GIC ", ROOT_TYPE),
  };
}

function list(document: ReturnType<typeof parseRawGffDocument>, label: string) {
  const field = document?.fields.find((candidate) => candidate.label === label);
  return field?.type === "list" ? field : undefined;
}

function fieldList(fields: SupportedGffField[], label: string) {
  const field = fields.find((candidate) => candidate.label === label);
  if (field?.type !== "list") throw new Error(`Expected ${label} list.`);
  return field;
}
