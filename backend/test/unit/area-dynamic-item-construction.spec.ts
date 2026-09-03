import { createHash } from "node:crypto";

import { parseRawGffDocument } from
  "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import {
  AreaObjectPairMutationError,
  mutateExistingAreaObjectsInGitGic,
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-object-pair-writer";

const ROOT_TYPE = 0xffffffff;
const DYNAMIC_PROFILE = "effective-catalog-uti-item-copy-v1";

describe("dynamic effective-catalog Area Item construction", () => {
  it.each([0, 1, 2, 3] as const)(
    "copies one arbitrary hash-bound ModelType=%i UTI into canonical type-0 GIT/GIC",
    (modelType) => {
      const pair = emptyPair();
      const addition = dynamicItemAddition(modelType);
      const input = {
        sourceGit: pair.git,
        sourceGic: pair.gic,
        deletions: [],
        additions: [addition],
      };

      const first = mutateExistingAreaObjectsInGitGic(input as never);
      const second = mutateExistingAreaObjectsInGitGic(input as never);

      expect(first.gitBytes).toEqual(second.gitBytes);
      expect(first.gicBytes).toEqual(second.gicBytes);
      expect(first.addedCounts.item).toBe(1);
      const gitItem = list(parseRawGffDocument(first.gitBytes), "List")!.value[0]!;
      const gicItem = list(parseRawGffDocument(first.gicBytes), "List")!.value[0]!;
      expect(gitItem.typeId).toBe(0);
      expect(gicItem).toEqual({
        typeId: 0,
        fields: [{ label: "Comment", type: "cexostring", value: `model-${modelType}` }],
      });
      expect(gitItem.fields).toEqual(expect.arrayContaining([
        { label: "TemplateResRef", type: "resref", value: `dynamic_${modelType}` },
        { label: "BaseItem", type: "int", value: modelType },
        { label: "Tag", type: "cexostring", value: `DYNAMIC_${modelType}` },
        { label: "Cursed", type: "byte", value: 0 },
        {
          label: "PropertiesList",
          type: "list",
          value: [{
            typeId: 0,
            fields: [
              { label: "PropertyName", type: "word", value: 15 },
              { label: "Subtype", type: "word", value: 66 },
              { label: "CostTable", type: "byte", value: 3 },
              { label: "CostValue", type: "word", value: 1 },
              { label: "Param1", type: "byte", value: 255 },
              { label: "Param1Value", type: "byte", value: 0 },
              { label: "ChanceAppear", type: "byte", value: 100 },
            ],
          }],
        },
        {
          label: "VarTable",
          type: "list",
          value: [{
            typeId: 0,
            fields: [
              { label: "Name", type: "cexostring", value: "Counter" },
              { label: "Type", type: "dword", value: 1 },
              { label: "Value", type: "int", value: -7 },
            ],
          }],
        },
      ]));
      expect(gitItem.fields.some((field) =>
        field.label === "PaletteID" || field.label === "Comment" ||
        field.label === "ItemList" || field.label === "Equip_ItemList",
      )).toBe(false);
      expectAppearance(gitItem.fields, modelType);
    },
  );

  it("applies Aurora common-field and appearance zero defaults", () => {
    const pair = emptyPair();
    const addition = dynamicItemAddition(2, {
      omitOptionalCommon: true,
      omitAppearance: true,
      omitProperties: true,
      omitVariables: true,
    });

    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [addition],
    } as never);
    const fields = list(parseRawGffDocument(result.gitBytes), "List")!.value[0]!.fields;

    expect(fields).toEqual(expect.arrayContaining([
      { label: "Charges", type: "byte", value: 50 },
      { label: "Cost", type: "dword", value: 0 },
      { label: "AddCost", type: "dword", value: 0 },
      { label: "StackSize", type: "word", value: 1 },
      { label: "Cursed", type: "byte", value: 0 },
      { label: "ModelPart1", type: "word", value: 0 },
      { label: "ModelPart2", type: "word", value: 0 },
      { label: "ModelPart3", type: "word", value: 0 },
      { label: "PropertiesList", type: "list", value: [] },
    ]));
    expect(fields.some((field) => field.label === "VarTable")).toBe(false);
  });

  it("recursively expands canonical ItemList and Equip_ItemList references", () => {
    const pair = emptyPair();
    const grandchild = dynamicItemAddition(2, { templateResRef: "nested_grand" });
    const child = dynamicItemAddition(1, {
      templateResRef: "nested_child",
      nested: { kind: "Equip_ItemList", resRef: "nested_grand", slotMask: 4 },
    });
    const root = {
      ...dynamicItemAddition(0, {
        templateResRef: "nested_root",
        nested: { kind: "ItemList", resRef: "nested_child", reposX: 3, reposY: 4 },
      }),
      blueprintDependencies: [dependency(child), dependency(grandchild)],
    };

    const input = {
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [root],
    };
    const first = mutateExistingAreaObjectsInGitGic(input as never);
    const second = mutateExistingAreaObjectsInGitGic(input as never);
    expect(first.gitBytes).toEqual(second.gitBytes);
    expect(first.gicBytes).toEqual(second.gicBytes);

    const rootFields = list(parseRawGffDocument(first.gitBytes), "List")!.value[0]!.fields;
    const rootInventory = fieldList(rootFields, "ItemList");
    expect(rootInventory.value).toHaveLength(1);
    const embeddedChild = rootInventory.value[0]!;
    expect(embeddedChild.typeId).toBe(0);
    expect(embeddedChild.fields).toEqual(expect.arrayContaining([
      { label: "XPosition", type: "float", value: -1 },
      { label: "YPosition", type: "float", value: -1 },
      { label: "ZPosition", type: "float", value: -1 },
      { label: "XOrientation", type: "float", value: 0 },
      { label: "YOrientation", type: "float", value: 1 },
      { label: "TemplateResRef", type: "resref", value: "nested_child" },
      { label: "BaseItem", type: "int", value: 1 },
      { label: "Repos_PosX", type: "word", value: 3 },
      { label: "Repos_Posy", type: "word", value: 4 },
    ]));
    expect(embeddedChild.fields.some((field) =>
      field.label === "InventoryRes" || field.label === "PaletteID" || field.label === "Comment",
    )).toBe(false);

    const equipped = fieldList(embeddedChild.fields, "Equip_ItemList");
    expect(equipped.value).toHaveLength(1);
    expect(equipped.value[0]!.typeId).toBe(4);
    expect(equipped.value[0]!.fields).toEqual(expect.arrayContaining([
      { label: "TemplateResRef", type: "resref", value: "nested_grand" },
      { label: "BaseItem", type: "int", value: 2 },
    ]));
    expect(equipped.value[0]!.fields.some((field) =>
      field.label === "EquippedRes" || field.label === "Repos_PosX" ||
      field.label === "Repos_Posy" || field.label === "PaletteID" || field.label === "Comment",
    )).toBe(false);
  });

  it("adds one exact dynamic UTI closure to an absent retained ground-Item ItemList", () => {
    const empty = emptyPair();
    const parent = dynamicItemAddition(0, { templateResRef: "retained_parent" });
    const retained = mutateExistingAreaObjectsInGitGic({
      sourceGit: empty.git,
      sourceGic: empty.gic,
      deletions: [],
      additions: [parent],
    } as never);
    const grandchild = dynamicItemAddition(2, { templateResRef: "added_grand" });
    const child = dynamicItemAddition(1, {
      templateResRef: "added_child",
      nested: { kind: "ItemList", resRef: "added_grand", reposX: 9, reposY: 10 },
    });
    const entry = {
      resRef: child.templateResRef,
      itemTemplateId: "itm_added_child",
      itemResRef: child.templateResRef,
      itemSourceProfileId: DYNAMIC_PROFILE,
      itemSourceObjectKey: child.sourceObjectKey,
      itemSourceSizeBytes: child.sourceSizeBytes,
      itemSourceFingerprint: child.sourceSha256,
      itemTag: child.tag,
      x: 7,
      y: 8,
      blueprintBytes: child.blueprintBytes,
      resolvedModelType: child.resolvedModelType,
      blueprintDependencies: [dependency(grandchild)],
    };
    const input = {
      sourceGit: retained.gitBytes,
      sourceGic: retained.gicBytes,
      deletions: [],
      propertyMutations: [{
        kind: "item",
        sourceIndex: 0,
        inventory: { expectedEntries: [], entries: [entry] },
      }],
    };

    const first = mutateExistingAreaObjectsInGitGic(input as never);
    const second = mutateExistingAreaObjectsInGitGic(input as never);
    expect(first.gitBytes).toEqual(second.gitBytes);
    expect(first.gicBytes).toEqual(retained.gicBytes);
    const parentFields = list(parseRawGffDocument(first.gitBytes), "List")!.value[0]!.fields;
    const itemList = fieldList(parentFields, "ItemList");
    expect(itemList.value).toHaveLength(1);
    expect(itemList.value[0]).toMatchObject({
      typeId: 0,
      fields: expect.arrayContaining([
        { label: "TemplateResRef", type: "resref", value: "added_child" },
        { label: "XPosition", type: "float", value: -1 },
        { label: "YPosition", type: "float", value: -1 },
        { label: "ZPosition", type: "float", value: -1 },
        { label: "XOrientation", type: "float", value: 0 },
        { label: "YOrientation", type: "float", value: 1 },
        { label: "Repos_PosX", type: "word", value: 7 },
        { label: "Repos_Posy", type: "word", value: 8 },
      ]),
    });
    const nested = fieldList(itemList.value[0]!.fields, "ItemList");
    expect(nested.value[0]!.fields).toEqual(expect.arrayContaining([
      { label: "TemplateResRef", type: "resref", value: "added_grand" },
      { label: "Repos_PosX", type: "word", value: 9 },
      { label: "Repos_Posy", type: "word", value: 10 },
    ]));
    expect(itemList.value[0]!.fields.some((field) =>
      field.label === "PaletteID" || field.label === "Comment",
    )).toBe(false);
  });

  it.each([
    ["missing", undefined],
    ["digest", "bad-digest"],
    ["unused", "unused"],
  ] as const)("fails closed for a %s dependency closure", (_label, fault) => {
    const pair = emptyPair();
    const child = dynamicItemAddition(1, { templateResRef: "nested_child" });
    const extra = dynamicItemAddition(3, { templateResRef: "unused_child" });
    const root = dynamicItemAddition(0, {
      templateResRef: "nested_root",
      nested: { kind: "ItemList", resRef: "nested_child", reposX: 0, reposY: 0 },
    });
    const dependencies = fault === undefined
      ? []
      : fault === "bad-digest"
        ? [{ ...dependency(child), sha256: "f".repeat(64) }]
        : [dependency(child), dependency(extra)];

    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{ ...root, blueprintDependencies: dependencies }],
    } as never)).toThrow(AreaObjectPairMutationError);
  });

  it("fails closed for a recursive UTI dependency cycle", () => {
    const pair = emptyPair();
    const root = dynamicItemAddition(0, {
      templateResRef: "cycle_root",
      nested: { kind: "ItemList", resRef: "cycle_child", reposX: 0, reposY: 0 },
    });
    const child = dynamicItemAddition(1, {
      templateResRef: "cycle_child",
      nested: { kind: "ItemList", resRef: "cycle_root", reposX: 0, reposY: 0 },
    });
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{ ...root, blueprintDependencies: [dependency(child)] }],
    } as never)).toThrow(AreaObjectPairMutationError);
  });

  it("fails closed for a dependency chain deeper than eight edges", () => {
    const pair = emptyPair();
    const chain = Array.from({ length: 10 }, (_unused, index) => dynamicItemAddition(
      (index % 4) as 0 | 1 | 2 | 3,
      {
        templateResRef: `depth_${index}`,
        ...(index < 9
          ? {
              nested: {
                kind: "ItemList" as const,
                resRef: `depth_${index + 1}`,
                reposX: 0,
                reposY: 0,
              },
            }
          : {}),
      },
    ));
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{
        ...chain[0]!,
        blueprintDependencies: chain.slice(1).map((entry) => dependency(entry)),
      }],
    } as never)).toThrow(AreaObjectPairMutationError);
  });

  it("fails closed for a non-one-hot equipment slot", () => {
    const pair = emptyPair();
    const child = dynamicItemAddition(1, { templateResRef: "slot_child" });
    const root = dynamicItemAddition(0, {
      templateResRef: "slot_root",
      nested: { kind: "Equip_ItemList", resRef: "slot_child", slotMask: 3 },
    });
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{ ...root, blueprintDependencies: [dependency(child)] }],
    } as never)).toThrow(AreaObjectPairMutationError);
  });

  it.each([
    ["wrong profile", { sourceProfileId: "nwn-base-key-uti-nw-cloth022-v1" }],
    ["missing object key", { sourceObjectKey: undefined }],
    ["wrong retained size", { sourceSizeBytes: 1 }],
    ["wrong model type", { resolvedModelType: 4 }],
    ["wrong source Tag", { tag: "OTHER_TAG" }],
  ])("rejects %s", (_label, patch) => {
    const pair = emptyPair();
    const addition = { ...dynamicItemAddition(0), ...patch };
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [addition],
    } as never)).toThrow(AreaObjectPairMutationError);
  });
});

function dynamicItemAddition(
  modelType: 0 | 1 | 2 | 3,
  options: Readonly<{
    omitOptionalCommon?: boolean;
    omitAppearance?: boolean;
    omitProperties?: boolean;
    omitVariables?: boolean;
    templateResRef?: string;
    nested?: Readonly<{
      kind: "ItemList" | "Equip_ItemList";
      resRef: string;
      reposX?: number;
      reposY?: number;
      slotMask?: number;
    }>;
  }> = {},
) {
  const templateResRef = options.templateResRef ?? `dynamic_${modelType}`;
  const fields: SupportedGffField[] = [
    { label: "TemplateResRef", type: "resref", value: templateResRef },
    { label: "Tag", type: "cexostring", value: `DYNAMIC_${modelType}` },
    { label: "BaseItem", type: "int", value: modelType },
    { label: "Comment", type: "cexostring", value: `model-${modelType}` },
    { label: "PaletteID", type: "byte", value: 5 },
    ...(!options.omitOptionalCommon ? [
      { label: "LocalizedName", type: "cexolocstring" as const, value: {
        strRef: 0xffffffff,
        entries: [{ languageId: 0, text: `Dynamic ${modelType}` }],
      } },
      { label: "Description", type: "cexolocstring" as const, value: { strRef: 100, entries: [] } },
      { label: "DescIdentified", type: "cexolocstring" as const, value: { strRef: 101, entries: [] } },
      { label: "Charges", type: "byte" as const, value: 3 },
      { label: "Cost", type: "dword" as const, value: 44 },
      { label: "AddCost", type: "dword" as const, value: 7 },
      { label: "Stolen", type: "byte" as const, value: 1 },
      { label: "StackSize", type: "word" as const, value: 2 },
      { label: "Plot", type: "byte" as const, value: 1 },
      { label: "Identified", type: "byte" as const, value: 1 },
    ] : []),
    ...(!options.omitAppearance ? sourceAppearance(modelType) : []),
    ...(!options.omitProperties ? [{
      label: "PropertiesList",
      type: "list" as const,
      value: [{
        typeId: 0,
        fields: [
          { label: "PropertyName", type: "word" as const, value: 15 },
          { label: "Subtype", type: "word" as const, value: 66 },
          { label: "CostTable", type: "byte" as const, value: 3 },
          { label: "CostValue", type: "word" as const, value: 1 },
          { label: "Param1", type: "byte" as const, value: 255 },
          { label: "Param1Value", type: "byte" as const, value: 0 },
          { label: "ChanceAppear", type: "byte" as const, value: 100 },
        ],
      }],
    }] : []),
    ...(!options.omitVariables ? [{
      label: "VarTable",
      type: "list" as const,
      value: [{
        typeId: 0,
        fields: [
          { label: "Name", type: "cexostring" as const, value: "Counter" },
          { label: "Type", type: "dword" as const, value: 1 },
          { label: "Value", type: "int" as const, value: -7 },
        ],
      }],
    }] : []),
    ...(options.nested ? [{
      label: options.nested.kind,
      type: "list" as const,
      value: [{
        typeId: options.nested.kind === "ItemList" ? 0 : (options.nested.slotMask ?? 1),
        fields: options.nested.kind === "ItemList"
          ? [
              { label: "InventoryRes", type: "resref" as const, value: options.nested.resRef },
              { label: "Repos_PosX", type: "word" as const, value: options.nested.reposX ?? 0 },
              { label: "Repos_Posy", type: "word" as const, value: options.nested.reposY ?? 0 },
            ]
          : [{ label: "EquippedRes", type: "resref" as const, value: options.nested.resRef }],
      }],
    }] : []),
  ];
  const blueprintBytes = buildGffBuffer(fields, "UTI ", ROOT_TYPE);
  return {
    kind: "item" as const,
    localObjectId: `itm_dynamic_${modelType}`,
    sourceProfileId: DYNAMIC_PROFILE,
    sourceObjectKey: `modules/current/templates/${templateResRef}.uti`,
    sourceSizeBytes: blueprintBytes.length,
    templateResRef,
    resRef: templateResRef,
    tag: `DYNAMIC_${modelType}`,
    sourceSha256: createHash("sha256").update(blueprintBytes).digest("hex"),
    resolvedModelType: modelType,
    blueprintBytes,
    x: 1.25,
    y: 2.5,
    z: 0.125,
    bearing: Math.PI / 3,
  };
}

function dependency(addition: ReturnType<typeof dynamicItemAddition>) {
  return {
    templateResRef: addition.templateResRef,
    resourceType: 2025,
    sha256: addition.sourceSha256,
    bytes: addition.blueprintBytes,
    resolvedModelType: addition.resolvedModelType,
  };
}

function sourceAppearance(modelType: 0 | 1 | 2 | 3): SupportedGffField[] {
  const colors: SupportedGffField[] = [
    { label: "Leather1Color", type: "byte", value: 1 },
    { label: "Leather2Color", type: "byte", value: 2 },
    { label: "Cloth1Color", type: "byte", value: 3 },
    { label: "Cloth2Color", type: "byte", value: 4 },
    { label: "Metal1Color", type: "byte", value: 5 },
    { label: "Metal2Color", type: "byte", value: 6 },
  ];
  if (modelType === 0) return [{ label: "ModelPart1", type: "byte", value: 11 }];
  if (modelType === 1) return [
    { label: "ModelPart1", type: "byte", value: 12 },
    ...colors,
  ];
  if (modelType === 2) return [
    { label: "ModelPart1", type: "byte", value: 13 },
    { label: "ModelPart2", type: "word", value: 260 },
    { label: "ModelPart3", type: "byte", value: 15 },
  ];
  const labels = [
    "RFoot", "LFoot", "RShin", "LShin", "LThigh", "RThigh", "Pelvis", "Torso",
    "Belt", "Neck", "RFArm", "LFArm", "RBicep", "LBicep", "RShoul", "LShoul",
    "RHand", "LHand", "Robe",
  ];
  return [
    ...labels.map((label, index) => ({
      label: `ArmorPart_${label}`,
      type: index === 18 ? "word" as const : "byte" as const,
      value: index + 1,
    })),
    ...colors,
  ];
}

function expectAppearance(fields: SupportedGffField[], modelType: 0 | 1 | 2 | 3): void {
  if (modelType === 0) {
    expect(fields).toContainEqual({ label: "ModelPart1", type: "word", value: 11 });
    return;
  }
  if (modelType === 1) {
    expect(fields).toContainEqual({ label: "ModelPart1", type: "word", value: 12 });
    expect(fields).toContainEqual({ label: "Metal2Color", type: "byte", value: 6 });
    return;
  }
  if (modelType === 2) {
    expect(fields).toEqual(expect.arrayContaining([
      { label: "ModelPart1", type: "word", value: 13 },
      { label: "ModelPart2", type: "word", value: 260 },
      { label: "ModelPart3", type: "word", value: 15 },
    ]));
    return;
  }
  expect(fields).toContainEqual({ label: "ArmorPart_RFoot", type: "word", value: 1 });
  expect(fields).toContainEqual({ label: "ArmorPart_Robe", type: "word", value: 19 });
  expect(fields).toContainEqual({ label: "Metal2Color", type: "byte", value: 6 });
}

function emptyPair(): { git: Buffer; gic: Buffer } {
  const labels = [
    ["Creature List", 4], ["Door List", 8], ["Encounter List", 7], ["List", 0],
    ["Placeable List", 9], ["SoundList", 6], ["StoreList", 11], ["TriggerList", 1],
    ["WaypointList", 5],
  ] as const;
  const fields = labels.map(([label]) => ({
    label,
    type: "list" as const,
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

function pairError(run: () => unknown): AreaObjectPairMutationError {
  try {
    run();
  } catch (error) {
    if (error instanceof AreaObjectPairMutationError) return error;
    throw error;
  }
  throw new Error("Expected AreaObjectPairMutationError.");
}
