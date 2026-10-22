import { createHash } from "node:crypto";
import { parseRawGffDocument } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import {
  AreaObjectPairMutationError,
  inspectAreaGitGicPair,
  mutateExistingAreaObjectsInGitGic,
  type ExistingAreaObjectPropertyMutation,
  verifyObjectEditorCommentMutations,
  verifyObjectPropertyMutations,
  verifyAreaObjectAdditionsReadback,
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-object-pair-writer";
import {
  creatureAdditionFixture,
  creatureBlueprintFixture,
  expectedCreatureGitFields,
} from "../support/area-creature-construction-fixture";
import {
  expectedStoreGitFields,
  storeAdditionFixture,
  storeBlueprintDependencyFixtures,
  storeBlueprintFixture,
  storeBlueprintFields,
} from "../support/area-store-construction-fixture";
import { itemBlueprintFixture } from "../support/area-item-construction-fixture";
import {
  AREA_ITEM_ARMOR_PART_KEYS,
  AREA_ITEM_MATERIAL_COLOR_KEYS,
} from "../../src/modules/areas/domain/area-item-base-appearance";
import type {
  AreaItemVisualTransformStorage,
  AreaItemVisualTransformValue,
} from "../../src/modules/areas/domain/area-item-visual-transform";

const ROOT_TYPE = 0xffffffff;
const PROFILES = [
  ["creature", "Creature List", 4],
  ["door", "Door List", 8],
  ["encounter", "Encounter List", 7],
  ["item", "List", 0],
  ["placeable", "Placeable List", 9],
  ["sound", "SoundList", 6],
  ["store", "StoreList", 11],
  ["trigger", "TriggerList", 1],
  ["waypoint", "WaypointList", 5],
] as const;

describe("Aurora GIT/GIC object pair writer", () => {
  it("constructs a paired native store with the complete verified x2_merc_dye inventory", () => {
    const pair = fixturePair();
    const transform = {
      x: 4.291445541381836,
      y: 5.039402770996094,
      z: 0.00000005,
      bearing: Math.PI * 1.5,
    };
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [storeAdditionFixture(transform)],
    });

    expect(result.addedCounts).toEqual(expect.objectContaining({
      creature: 0,
      item: 0,
      placeable: 0,
      sound: 0,
      store: 1,
      waypoint: 0,
    }));
    const gitEntry = list(parseRawGffDocument(result.gitBytes), "StoreList")!.value.at(-1)!;
    const gicEntry = list(parseRawGffDocument(result.gicBytes), "StoreList")!.value.at(-1)!;
    expect(gitEntry).toEqual({ typeId: 11, fields: expectedStoreGitFields(transform) });
    expect(gicEntry).toEqual({
      typeId: 11,
      fields: [{ label: "Comment", type: "cexostring", value: "Sample Dye Store" }],
    });
    expect(gitEntry.fields).toHaveLength(20);
    expect(gitEntry.fields.some((field) => ["ID", "Comment"].includes(field.label))).toBe(false);
    const inventory = gitEntry.fields.find((field) => field.label === "StoreList");
    expect(inventory).toEqual(expectedStoreGitFields(transform)[19]);
  });

  it.each([
    ["source digest", { sourceSha256: "f".repeat(64) }, ["store:addition=0:source_sha256_mismatch"]],
    ["source profile", { sourceProfileId: "custom-utm" }, ["store:addition=0:profile_or_identity_mismatch"]],
    ["template identity", { templateResRef: "x2_merc_other" }, ["store:addition=0:profile_or_identity_mismatch"]],
    ["scene ResRef", { resRef: "x2_merc_other" }, ["store:addition=0:profile_or_identity_mismatch"]],
    ["native instance Tag", { tag: "OVERRIDE" }, ["store:addition=0:profile_or_identity_mismatch"]],
    ["finite transform", { bearing: Number.NaN }, ["store:addition=0:bearing"]],
  ])("rejects a store addition with invalid %s", (_label, patch, diagnostics) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{ ...storeAdditionFixture(), ...patch }],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics,
    });
  });

  it.each([
    ["file type", () => buildGffBuffer(storeBlueprintFields(), "UTP ", ROOT_TYPE), ["store:addition=0:gff_identity"]],
    ["file version", () => withGffVersion(storeBlueprintFixture(), "V3.1"), ["store:addition=0:gff_identity"]],
    ["root type", () => buildGffBuffer(storeBlueprintFields(), "UTM ", 0), ["store:addition=0:gff_identity"]],
    ["field count", () => buildGffBuffer(storeBlueprintFields().slice(0, -1), "UTM ", ROOT_TYPE), ["store:addition=0:field_count=16:expected=17"]],
  ] as const)("rejects store blueprint %s drift", (_label, mutate, diagnostics) => {
    const pair = fixturePair();
    const bytes = mutate();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{
        ...storeAdditionFixture(),
        blueprintBytes: bytes,
        sourceSha256: createHash("sha256").update(bytes).digest("hex"),
      }],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics,
    });
  });

  it.each([
    ["ordered label", (fields: SupportedGffField[]) => {
      fields[0] = { label: "WrongResRef", type: "resref", value: "x2_merc_dye" };
    }, ["store:addition=0:field=0:expected=ResRef:resref:actual=WrongResRef:resref"]],
    ["ordered type", (fields: SupportedGffField[]) => {
      fields[0] = { label: "ResRef", type: "cexostring", value: "x2_merc_dye" };
    }, ["store:addition=0:field=0:expected=ResRef:resref:actual=ResRef:cexostring"]],
  ] as const)("rejects store blueprint field %s drift", (_label, mutate, diagnostics) => {
    const pair = fixturePair();
    const fields = storeBlueprintFields();
    mutate(fields);
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [storeAdditionWithBlueprint(fields)],
    }))).toMatchObject({ diagnostics });
  });

  it.each([
    ["ResRef", 0, { label: "ResRef", type: "resref", value: "x2_merc_other" }, ["store:addition=0:blueprint_identity"]],
    ["Tag", 2, { label: "Tag", type: "cexostring", value: "x2_merc_other" }, ["store:addition=0:blueprint_identity"]],
    ["ID", 15, { label: "ID", type: "byte", value: 6 }, ["store:addition=0:metadata_profile"]],
    ["Comment", 16, { label: "Comment", type: "cexostring", value: "drift" }, ["store:addition=0:metadata_profile"]],
  ] as const)("rejects store blueprint %s value drift", (_label, fieldIndex, replacement, diagnostics) => {
    const pair = fixturePair();
    const fields = storeBlueprintFields();
    fields[fieldIndex] = replacement;
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [storeAdditionWithBlueprint(fields)],
    }))).toMatchObject({ diagnostics });
  });

  it("keeps an orientation component exactly at the native normalization boundary", () => {
    const pair = fixturePair();
    const bearing = Math.acos(1e-6);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [storeAdditionFixture({ x: 1, y: 2, z: 3, bearing })],
    });
    const entry = list(parseRawGffDocument(result.gitBytes), "StoreList")!.value.at(-1)!;
    expect(entry.fields.find((field) => field.label === "XOrientation")).toEqual({
      label: "XOrientation",
      type: "float",
      value: Math.fround(Math.cos(bearing)),
    });
  });

  it.each([
    ["bucket count", (inventory: Extract<SupportedGffField, { type: "list" }>) => inventory.value.pop(), "store:addition=0:StoreList:count=4"],
    ["bucket type", (inventory: Extract<SupportedGffField, { type: "list" }>) => { inventory.value[0]!.typeId = 99; }, "store:addition=0:StoreList=0:type=99"],
    ["empty bucket fields", (inventory: Extract<SupportedGffField, { type: "list" }>) => { inventory.value[0]!.fields.push({ label: "Drift", type: "int", value: 0 }); }, "store:addition=0:StoreList=0:fields=1"],
    ["merchandise field count", (inventory: Extract<SupportedGffField, { type: "list" }>) => { inventory.value[4]!.fields.push({ label: "Drift", type: "int", value: 0 }); }, "store:addition=0:StoreList=4:fields=2"],
    ["item-list label", (inventory: Extract<SupportedGffField, { type: "list" }>) => { inventory.value[4]!.fields[0] = { label: "WrongList", type: "list", value: [] }; }, "store:addition=0:StoreList=4:ItemList:label"],
    ["item-list type", (inventory: Extract<SupportedGffField, { type: "list" }>) => { inventory.value[4]!.fields[0] = { label: "ItemList", type: "int", value: 0 }; }, "store:addition=0:StoreList=4:ItemList:type"],
    ["item-list count", (inventory: Extract<SupportedGffField, { type: "list" }>) => { const itemList = inventory.value[4]!.fields[0] as Extract<SupportedGffField, { type: "list" }>; itemList.value.pop(); }, "store:addition=0:StoreList=4:ItemList:count=54"],
  ] as const)("rejects store inventory %s drift", (_label, mutate, diagnostic) => {
    const pair = fixturePair();
    const fields = storeBlueprintFields();
    mutate(fields[14] as Extract<SupportedGffField, { type: "list" }>);
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [storeAdditionWithBlueprint(fields)],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it("rejects a store addition without the exact 55-resource UTI dependency set", () => {
    const pair = fixturePair();
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{ ...storeAdditionFixture(), blueprintDependencies: [] }],
    })).toThrow(expect.objectContaining({
      diagnostics: ["store:addition=0:dependencies=0:expected=55"],
    }));
  });

  it("rejects a store addition whose dependency set is absent", () => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{ ...storeAdditionFixture(), blueprintDependencies: undefined }],
    }))).toMatchObject({ diagnostics: ["store:addition=0:dependencies=0:expected=55"] });
  });

  it("rejects a store dependency that is out of inventory order", () => {
    const pair = fixturePair();
    const dependencies = [...storeAdditionFixture().blueprintDependencies];
    [dependencies[0], dependencies[1]] = [dependencies[1]!, dependencies[0]!];
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{ ...storeAdditionFixture(), blueprintDependencies: dependencies }],
    })).toThrow(expect.objectContaining({
      diagnostics: ["store:addition=0:StoreList=4:ItemList=0:dependency"],
    }));
  });

  it.each([
    ["resource type", (dependency: Record<string, unknown>) => { dependency.resourceType = 0; }],
    ["SHA-256 shape", (dependency: Record<string, unknown>) => { dependency.sha256 = "invalid"; }],
    ["byte container", (dependency: Record<string, unknown>) => { dependency.bytes = new Uint8Array(dependency.bytes as Buffer); }],
  ])("rejects a store dependency with invalid %s identity", (_label, mutate) => {
    const pair = fixturePair();
    const addition = storeAdditionFixture();
    const dependencies = addition.blueprintDependencies.map((entry) => ({ ...entry }));
    mutate(dependencies[0]!);
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{ ...addition, blueprintDependencies: dependencies as typeof addition.blueprintDependencies }],
    }))).toMatchObject({ diagnostics: ["store:addition=0:dependency=0:identity"] });
  });

  it.each([
    ["entry type", (entry: { typeId: number; fields: SupportedGffField[] }) => { entry.typeId = 99; }],
    ["field count", (entry: { typeId: number; fields: SupportedGffField[] }) => { entry.fields.pop(); }],
    ["field label", (entry: { typeId: number; fields: SupportedGffField[] }) => { entry.fields[1] = { label: "Wrong_PosX", type: "word", value: 0 }; }],
  ] as const)("rejects a store repository item with invalid %s", (_label, mutate) => {
    const pair = fixturePair();
    const fields = storeBlueprintFields();
    const inventory = fields[14] as Extract<SupportedGffField, { type: "list" }>;
    const itemList = inventory.value[4]!.fields[0] as Extract<SupportedGffField, { type: "list" }>;
    mutate(itemList.value[0]!);
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [storeAdditionWithBlueprint(fields)],
    }))).toMatchObject({ diagnostics: ["store:addition=0:StoreList=4:ItemList=0"] });
  });

  it("rejects a non-ResRef repository dependency field", () => {
    const pair = fixturePair();
    const fields = storeBlueprintFields();
    const inventory = fields[14] as Extract<SupportedGffField, { type: "list" }>;
    const itemList = inventory.value[4]!.fields[0] as Extract<SupportedGffField, { type: "list" }>;
    itemList.value[0]!.fields[0] = { label: "InventoryRes", type: "cexostring", value: "x2_it_dyec23" };
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [storeAdditionWithBlueprint(fields)],
    }))).toMatchObject({ diagnostics: ["store:addition=0:StoreList=4:ItemList=0:dependency"] });
  });

  it("rejects malformed UTI dependency content before accepting its aggregate", () => {
    const pair = fixturePair();
    const addition = storeAdditionFixture();
    const dependencies = [...addition.blueprintDependencies];
    const malformed = buildGffBuffer(
      parseRawGffDocument(dependencies[0]!.bytes)!.fields,
      "UTP ",
      ROOT_TYPE,
    );
    dependencies[0] = {
      ...dependencies[0]!,
      bytes: Buffer.from(malformed),
      sha256: createHash("sha256").update(malformed).digest("hex"),
    };
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{ ...addition, blueprintDependencies: dependencies }],
    })).toThrow(expect.objectContaining({
      diagnostics: ["store:addition=0:dependency=0:gff_identity"],
    }));
  });

  it.each([
    ["file version", (fields: SupportedGffField[], original: Buffer) => withGffVersion(original, "V3.1"), "gff_identity"],
    ["root type", (fields: SupportedGffField[]) => buildGffBuffer(fields, "UTI ", 0), "gff_identity"],
    ["field count", (fields: SupportedGffField[]) => buildGffBuffer(fields.slice(0, -1), "UTI ", ROOT_TYPE), "gff_identity"],
    ["field label", (fields: SupportedGffField[]) => { fields[1] = { label: "WrongBaseItem", type: "int", value: 73 }; return buildGffBuffer(fields, "UTI ", ROOT_TYPE); }, "field=1"],
    ["field type", (fields: SupportedGffField[]) => { fields[1] = { label: "BaseItem", type: "dword", value: 73 }; return buildGffBuffer(fields, "UTI ", ROOT_TYPE); }, "field=1"],
  ] as const)("rejects store UTI dependency %s drift", (_label, mutate, diagnosticSuffix) => {
    const pair = fixturePair();
    const addition = storeAdditionFixture();
    const dependencies = [...addition.blueprintDependencies];
    const original = dependencies[0]!.bytes;
    const fields = parseRawGffDocument(original)!.fields;
    const bytes = mutate(fields, original);
    dependencies[0] = {
      ...dependencies[0]!,
      bytes: Buffer.from(bytes),
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{ ...addition, blueprintDependencies: dependencies }],
    }))).toMatchObject({ diagnostics: [`store:addition=0:dependency=0:${diagnosticSuffix}`] });
  });

  it("rejects a dependency whose UTI TemplateResRef differs from its repository entry", () => {
    const pair = fixturePair();
    const addition = storeAdditionFixture();
    const dependencies = [...addition.blueprintDependencies];
    const fields = parseRawGffDocument(dependencies[0]!.bytes)!.fields;
    fields[0] = { label: "TemplateResRef", type: "resref", value: "x2_it_dyec00" };
    const bytes = buildGffBuffer(fields, "UTI ", ROOT_TYPE);
    dependencies[0] = { ...dependencies[0]!, bytes: Buffer.from(bytes), sha256: createHash("sha256").update(bytes).digest("hex") };
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{ ...addition, blueprintDependencies: dependencies }],
    }))).toMatchObject({ diagnostics: ["store:addition=0:dependency=0:template"] });
  });

  it("rejects a store dependency whose bytes differ from its retained digest", () => {
    const pair = fixturePair();
    const addition = storeAdditionFixture();
    const dependencies = [...addition.blueprintDependencies];
    const fields = parseRawGffDocument(dependencies[0]!.bytes)!.fields;
    fields[17] = { label: "Comment", type: "cexostring", value: "digest drift" };
    dependencies[0] = { ...dependencies[0]!, bytes: Buffer.from(buildGffBuffer(fields, "UTI ", ROOT_TYPE)) };
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{ ...addition, blueprintDependencies: dependencies }],
    }))).toMatchObject({ diagnostics: ["store:addition=0:dependency=0:source_sha256_mismatch"] });
  });

  it("rejects a structurally valid but non-admitted UTI dependency aggregate", () => {
    const pair = fixturePair();
    const addition = storeAdditionFixture();
    const dependencies = [...addition.blueprintDependencies];
    const fields = parseRawGffDocument(dependencies[0]!.bytes)!.fields.map((field) =>
      field.label === "Comment" ? { label: "Comment", type: "cexostring" as const, value: "drift" } : field);
    const drifted = buildGffBuffer(fields, "UTI ", ROOT_TYPE);
    dependencies[0] = {
      ...dependencies[0]!,
      bytes: Buffer.from(drifted),
      sha256: createHash("sha256").update(drifted).digest("hex"),
    };
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{ ...addition, blueprintDependencies: dependencies }],
    })).toThrow(expect.objectContaining({
      diagnostics: ["store:addition=0:dependency_set_sha256"],
    }));
  });

  it("constructs a paired native creature from the verified nw_chicken UTC blueprint", () => {
    const pair = fixturePair();
    const transform = { x: 1.5, y: 2.25, z: 0.1, bearing: Math.PI / 4 };
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [creatureAdditionFixture(transform)],
    });

    expect(result.addedCounts).toEqual(expect.objectContaining({
      creature: 1,
      item: 0,
      placeable: 0,
      sound: 0,
      waypoint: 0,
    }));
    const gitEntry = list(parseRawGffDocument(result.gitBytes), "Creature List")!.value.at(-1)!;
    const gicEntry = list(parseRawGffDocument(result.gicBytes), "Creature List")!.value.at(-1)!;
    expect(gitEntry).toEqual({ typeId: 4, fields: expectedCreatureGitFields(transform) });
    expect(gicEntry).toEqual({
      typeId: 4,
      fields: [{ label: "Comment", type: "cexostring", value: "" }],
    });
    expect(gitEntry.fields).toHaveLength(70);
    expect(gitEntry.fields.some((field) => ["PaletteID", "Comment", "Wings", "Tail"].includes(field.label))).toBe(false);
  });

  it.each([
    ["source digest", { sourceSha256: "f".repeat(64) }],
    ["source profile", { sourceProfileId: "custom-utc" }],
    ["template identity", { templateResRef: "nw_chicken02" }],
    ["scene ResRef", { resRef: "nw_chicken02" }],
    ["native instance Tag", { tag: "OVERRIDE" }],
    ["finite transform", { bearing: Number.NaN }],
  ])("rejects a creature addition with invalid %s", (_label, patch) => {
    const pair = fixturePair();
    const addition = { ...creatureAdditionFixture(), ...patch };
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [addition],
    })).toThrow(AreaObjectPairMutationError);
  });

  it.each([
    ["file type", () => buildGffBuffer(parseRawGffDocument(creatureBlueprintFixture())!.fields, "UTP ", ROOT_TYPE)],
    ["file version", () => withGffVersion(creatureBlueprintFixture(), "V3.1")],
    ["root type", () => buildGffBuffer(parseRawGffDocument(creatureBlueprintFixture())!.fields, "UTC ", 0)],
  ] as const)("rejects creature blueprint %s drift", (_label, mutate) => {
    const pair = fixturePair();
    const bytes = mutate();
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{
        ...creatureAdditionFixture(),
        blueprintBytes: bytes,
        sourceSha256: createHash("sha256").update(bytes).digest("hex"),
      }],
    })).toThrow(AreaObjectPairMutationError);
  });

  it("reports exact diagnostics for creature GFF identity drift", () => {
    const pair = fixturePair();
    const bytes = buildGffBuffer(parseRawGffDocument(creatureBlueprintFixture())!.fields, "UTP ", ROOT_TYPE);
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{
        ...creatureAdditionFixture(),
        blueprintBytes: bytes,
        sourceSha256: createHash("sha256").update(bytes).digest("hex"),
      }],
    })).toThrow(expect.objectContaining({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: ["creature:addition=0:gff_identity"],
    }));
  });

  it("reports exact diagnostics for creature profile identity drift", () => {
    const pair = fixturePair();
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{ ...creatureAdditionFixture(), sourceProfileId: "custom-utc" }],
    })).toThrow(expect.objectContaining({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: ["creature:addition=0:profile_or_identity_mismatch"],
    }));
  });

  it("reports exact diagnostics for creature field-count drift", () => {
    const pair = fixturePair();
    const document = parseRawGffDocument(creatureBlueprintFixture())!;
    const bytes = buildGffBuffer(document.fields.filter((field) => field.label !== "Deity"), "UTC ", ROOT_TYPE);
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{
        ...creatureAdditionFixture(),
        blueprintBytes: bytes,
        sourceSha256: createHash("sha256").update(bytes).digest("hex"),
      }],
    })).toThrow(expect.objectContaining({
      diagnostics: ["creature:addition=0:field_count=62:expected=63"],
    }));
  });

  it("reports exact diagnostics for creature field-value drift", () => {
    const pair = fixturePair();
    const document = parseRawGffDocument(creatureBlueprintFixture())!;
    const bytes = buildGffBuffer(document.fields.map((field) => field.label === "Deity"
      ? { label: "Deity", type: "cexostring" as const, value: "other" }
      : field), "UTC ", ROOT_TYPE);
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{
        ...creatureAdditionFixture(),
        blueprintBytes: bytes,
        sourceSha256: createHash("sha256").update(bytes).digest("hex"),
      }],
    })).toThrow(expect.objectContaining({
      diagnostics: ["creature:addition=0:Deity:value_mismatch"],
    }));
  });

  it("recognizes the native nine-family paired profile", () => {
    const pair = fixturePair();

    expect(inspectAreaGitGicPair(pair.git, pair.gic)).toEqual({
      counts: {
        creature: 2,
        door: 1,
        encounter: 1,
        item: 2,
        placeable: 2,
        sound: 1,
        store: 1,
        trigger: 1,
        waypoint: 1,
      },
      total: 12,
    });
  });

  it("deletes identical immutable ordinals from GIT and GIC while preserving every survivor field", () => {
    const pair = fixturePair();

    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [
        { kind: "creature", sourceIndex: 0 },
        { kind: "item", sourceIndex: 1 },
        { kind: "placeable", sourceIndex: 0 },
        { kind: "encounter", sourceIndex: 0 },
      ],
    });

    expect(result.source).toEqual({
      counts: expect.objectContaining({ creature: 2, item: 2, placeable: 2, encounter: 1 }),
      total: 12,
    });
    expect(result.candidate).toEqual({
      counts: {
        creature: 1,
        door: 1,
        encounter: 0,
        item: 1,
        placeable: 1,
        sound: 1,
        store: 1,
        trigger: 1,
        waypoint: 1,
      },
      total: 8,
    });
    expect(result.deletedCounts).toEqual({
      creature: 1,
      door: 0,
      encounter: 1,
      item: 1,
      placeable: 1,
      sound: 0,
      store: 0,
      trigger: 0,
      waypoint: 0,
    });

    const git = parseRawGffDocument(result.gitBytes);
    const gic = parseRawGffDocument(result.gicBytes);
    expect(git?.fields.find((field) => field.label === "AreaProperties")).toEqual(
      expect.objectContaining({ type: "struct" }),
    );
    expect(gic?.fields.find((field) => field.label === "EditorOnlyRoot")).toEqual({
      label: "EditorOnlyRoot",
      type: "cexostring",
      value: "preserve-gic-root",
    });
    expect(list(git, "Creature List")?.value[0]).toEqual(
      expect.objectContaining({
        typeId: 4,
        fields: expect.arrayContaining([
          { label: "Tag", type: "cexostring", value: "CREATURE_2" },
          { label: "UnknownCreatureF", type: "int", value: 202 },
        ]),
      }),
    );
    expect(list(gic, "Creature List")?.value[0]).toEqual(
      expect.objectContaining({
        typeId: 4,
        fields: [{ label: "Comment", type: "cexostring", value: "creature-comment-2" }],
      }),
    );
    expect(list(gic, "SoundList")?.value[0]).toEqual(
      expect.objectContaining({
        typeId: 6,
        fields: [
          { label: "PlayInToolset", type: "byte", value: 1 },
          { label: "Comment", type: "cexostring", value: "sound-comment-1" },
        ],
      }),
    );
    expect(inspectAreaGitGicPair(result.gitBytes, result.gicBytes)).toEqual(result.candidate);
  });

  it("returns the exact source bytes when no object membership changed", () => {
    const pair = fixturePair();

    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
    });

    expect(result.gitBytes).toEqual(pair.git);
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.candidate).toEqual(result.source);
    expect(result.transformedCounts.creature).toBe(0);
  });

  it("transforms one native creature while preserving GIC bytes and every other GIT field", () => {
    const pair = fixturePair();

    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{
        kind: "creature",
        sourceIndex: 1,
        x: 6.147,
        y: 2.718,
        z: 0.025,
        bearing: Math.PI * 1.5,
      }],
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.gitBytes).not.toEqual(pair.git);
    expect(result.candidate).toEqual(result.source);
    expect(result.transformedCounts).toEqual({
      creature: 1,
      door: 0,
      encounter: 0,
      item: 0,
      placeable: 0,
      sound: 0,
      store: 0,
      trigger: 0,
      waypoint: 0,
    });
    const creature = list(parseRawGffDocument(result.gitBytes), "Creature List")!.value[1]!;
    expect(creature.fields).toEqual(expect.arrayContaining([
      { label: "Tag", type: "cexostring", value: "CREATURE_2" },
      { label: "UnknownCreatureF", type: "int", value: 202 },
      { label: "XPosition", type: "float", value: Math.fround(61.47) },
      { label: "YPosition", type: "float", value: Math.fround(27.18) },
      { label: "ZPosition", type: "float", value: Math.fround(0.25) },
      { label: "XOrientation", type: "float", value: Math.fround(Math.cos(Math.PI * 1.5)) },
      { label: "YOrientation", type: "float", value: Math.fround(-Math.sin(Math.PI * 1.5)) },
    ]));
  });

  it("uses immutable source ordinals when combining a creature transform and deletion", () => {
    const pair = fixturePair();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [{ kind: "creature", sourceIndex: 0 }],
      transforms: [{ kind: "creature", sourceIndex: 1, x: 9, y: 8, z: 0.5, bearing: 0 }],
    });

    const survivor = list(parseRawGffDocument(result.gitBytes), "Creature List")!.value[0]!;
    expect(survivor.fields).toEqual(expect.arrayContaining([
      { label: "Tag", type: "cexostring", value: "CREATURE_2" },
      { label: "XPosition", type: "float", value: 90 },
      { label: "YPosition", type: "float", value: 80 },
      { label: "ZPosition", type: "float", value: 5 },
      { label: "XOrientation", type: "float", value: 1 },
      { label: "YOrientation", type: "float", value: -0 },
    ]));
    expect(list(parseRawGffDocument(result.gicBytes), "Creature List")!.value[0]!.fields)
      .toEqual([{ label: "Comment", type: "cexostring", value: "creature-comment-2" }]);
  });

  it("produces byte-identical deterministic candidates for the same transform input", () => {
    const pair = fixturePair();
    const input = {
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [{ kind: "item" as const, sourceIndex: 1 }],
      transforms: [{
        kind: "creature" as const,
        sourceIndex: 0,
        x: 6.09686,
        y: 2.71816,
        z: 0,
        bearing: Math.PI / 3,
      }],
    };

    const first = mutateExistingAreaObjectsInGitGic(input);
    const second = mutateExistingAreaObjectsInGitGic(input);

    expect(second.gitBytes).toEqual(first.gitBytes);
    expect(second.gicBytes).toEqual(first.gicBytes);
    expect(second.candidate).toEqual(first.candidate);
    expect(inspectAreaGitGicPair(first.gitBytes, first.gicBytes)).toEqual(first.candidate);
  });

  it("transforms native placeable X/Y/Z/Bearing without creating a VisualTransform payload", () => {
    const pair = fixturePair();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{
        kind: "placeable",
        sourceIndex: 1,
        x: 3.834,
        y: 2.086,
        z: 0.01,
        bearing: Math.PI / 4,
      }],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.transformedCounts).toEqual(expect.objectContaining({
      creature: 0,
      placeable: 1,
    }));
    const placeable = list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!;
    expect(placeable.fields).toEqual(expect.arrayContaining([
      { label: "Tag", type: "cexostring", value: "PLACEABLE_2" },
      { label: "UnknownPlaceable", type: "int", value: 202 },
      { label: "X", type: "float", value: Math.fround(38.34) },
      { label: "Y", type: "float", value: Math.fround(20.86) },
      { label: "Z", type: "float", value: Math.fround(0.1) },
      { label: "Bearing", type: "float", value: Math.fround(Math.PI / 4) },
    ]));
    expect(placeable.fields.some((field) => field.label === "VisualTransform")).toBe(false);
  });

  it("rewrites only one exact existing-placeable OnUsed ResRef and preserves GIC bytes", () => {
    const pair = fixturePair();
    const sourcePlaceable = list(parseRawGffDocument(pair.git), "Placeable List")!.value[1]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        expectedOnUsed: "old_script",
        onUsed: "s04_plcprobe",
      }],
    });
    const repeated = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        expectedOnUsed: "old_script",
        onUsed: "s04_plcprobe",
      }],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts).toEqual(expect.objectContaining({
      creature: 0,
      placeable: 1,
    }));
    const candidatePlaceable = list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!;
    expect(candidatePlaceable.fields.find((field) => field.label === "OnUsed")).toEqual({
      label: "OnUsed",
      type: "resref",
      value: "s04_plcprobe",
    });
    expect(candidatePlaceable.fields.filter((field) => field.label !== "OnUsed"))
      .toEqual(sourcePlaceable.fields.filter((field) => field.label !== "OnUsed"));
    expect(repeated.gitBytes).toEqual(result.gitBytes);
    expect(repeated.gicBytes).toEqual(result.gicBytes);

    const reverted = mutateExistingAreaObjectsInGitGic({
      sourceGit: result.gitBytes,
      sourceGic: result.gicBytes,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        expectedOnUsed: "s04_plcprobe",
        onUsed: "old_script",
      }],
    });
    const revertedPlaceable = list(parseRawGffDocument(reverted.gitBytes), "Placeable List")!.value[1]!;
    expect(revertedPlaceable.fields).toEqual(sourcePlaceable.fields);
    expect(reverted.gicBytes).toEqual(pair.gic);
  });

  it("rewrites exact placeable boolean bytes together with OnUsed and preserves every other field", () => {
    const pair = fixturePair();
    const sourcePlaceable = list(parseRawGffDocument(pair.git), "Placeable List")!.value[1]!;
    const mutation = {
      kind: "placeable" as const,
      sourceIndex: 1,
      expectedOnUsed: "old_script",
      onUsed: "s04_plcprobe",
      expectedStatic: true,
      static: false,
      expectedUseable: false,
      useable: true,
      expectedPlot: false,
      plot: true,
      expectedHasInventory: false,
      hasInventory: true,
    };
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [mutation],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.placeable).toBe(1);
    const candidatePlaceable = list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!;
    expect(candidatePlaceable.fields).toEqual(expect.arrayContaining([
      { label: "OnUsed", type: "resref", value: "s04_plcprobe" },
      { label: "Static", type: "byte", value: 0 },
      { label: "Useable", type: "byte", value: 1 },
      { label: "Plot", type: "byte", value: 1 },
      { label: "HasInventory", type: "byte", value: 1 },
    ]));
    const changedLabels = new Set(["OnUsed", "Static", "Useable", "Plot", "HasInventory"]);
    expect(candidatePlaceable.fields.filter((field) => !changedLabels.has(field.label)))
      .toEqual(sourcePlaceable.fields.filter((field) => !changedLabels.has(field.label)));

    const reverted = mutateExistingAreaObjectsInGitGic({
      sourceGit: result.gitBytes,
      sourceGic: result.gicBytes,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        expectedOnUsed: "s04_plcprobe",
        onUsed: "old_script",
        expectedStatic: false,
        static: true,
        expectedUseable: true,
        useable: false,
        expectedPlot: true,
        plot: false,
        expectedHasInventory: true,
        hasInventory: false,
      }],
    });
    expect(list(parseRawGffDocument(reverted.gitBytes), "Placeable List")!.value[1]!.fields)
      .toEqual(sourcePlaceable.fields);
  });

  it("rewrites all admitted placeable script ResRefs in one exact GIT mutation and preserves GIC bytes", () => {
    const pair = fixturePair();
    const sourcePlaceable = list(parseRawGffDocument(pair.git), "Placeable List")!.value[1]!;
    const scripts = [
      { field: "OnClick", expectedResRef: "old_click", resRef: "new_click" },
      { field: "OnClosed", expectedResRef: "old_closed", resRef: "new_closed" },
      { field: "OnDamaged", expectedResRef: "old_damaged", resRef: "new_damaged" },
      { field: "OnDeath", expectedResRef: "old_death", resRef: "new_death" },
      { field: "OnHeartbeat", expectedResRef: "old_heartbeat", resRef: "new_heartbeat" },
      { field: "OnInvDisturbed", expectedResRef: "old_inv", resRef: "new_inv" },
      { field: "OnLock", expectedResRef: "old_lock", resRef: "new_lock" },
      { field: "OnMeleeAttacked", expectedResRef: "old_melee", resRef: "new_melee" },
      { field: "OnOpen", expectedResRef: "old_open", resRef: "new_open" },
      { field: "OnSpellCastAt", expectedResRef: "old_spell", resRef: "new_spell" },
      { field: "OnUnlock", expectedResRef: "old_unlock", resRef: "new_unlock" },
      { field: "OnUserDefined", expectedResRef: "old_user", resRef: "new_user" },
    ] as const;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, scripts }],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.placeable).toBe(1);
    const candidatePlaceable = list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!;
    for (const script of scripts) {
      expect(candidatePlaceable.fields).toContainEqual({
        label: script.field,
        type: "resref",
        value: script.resRef,
      });
    }
    const changedLabels = new Set(scripts.map((entry) => entry.field));
    expect(candidatePlaceable.fields.filter((field) => !changedLabels.has(field.label as never)))
      .toEqual(sourcePlaceable.fields.filter((field) => !changedLabels.has(field.label as never)));
  });

  it("rewrites all admitted Placeable lock bytes and reverts the exact GIT struct", () => {
    const pair = fixturePair();
    const sourcePlaceable = list(parseRawGffDocument(pair.git), "Placeable List")!.value[1]!;
    const lockFields = [
      { field: "Locked" as const, expectedValue: false, value: true },
      { field: "Lockable" as const, expectedValue: false, value: true },
      { field: "AutoRemoveKey" as const, expectedValue: false, value: true },
      { field: "KeyRequired" as const, expectedValue: false, value: true },
      { field: "OpenLockDC" as const, expectedValue: 18, value: 255 },
      { field: "CloseLockDC" as const, expectedValue: 0, value: 12 },
    ];
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, lockFields }],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    const candidate = list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!;
    expect(candidate.fields).toEqual(expect.arrayContaining([
      { label: "Locked", type: "byte", value: 1 },
      { label: "Lockable", type: "byte", value: 1 },
      { label: "AutoRemoveKey", type: "byte", value: 1 },
      { label: "KeyRequired", type: "byte", value: 1 },
      { label: "OpenLockDC", type: "byte", value: 255 },
      { label: "CloseLockDC", type: "byte", value: 12 },
    ]));

    const reverted = mutateExistingAreaObjectsInGitGic({
      sourceGit: result.gitBytes,
      sourceGic: result.gicBytes,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        lockFields: lockFields.map((entry) => ({
          ...entry,
          expectedValue: entry.value,
          value: entry.expectedValue,
        })),
      }],
    });
    expect(list(parseRawGffDocument(reverted.gitBytes), "Placeable List")!.value[1]!.fields)
      .toEqual(sourcePlaceable.fields);
  });

  it("rewrites exact Placeable KeyName and reverts the complete GIT struct", () => {
    const pair = fixturePair();
    const sourcePlaceable = list(parseRawGffDocument(pair.git), "Placeable List")!.value[1]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        keyName: { expectedValue: "", value: "K".repeat(32) },
      }],
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!.fields)
      .toContainEqual({ label: "KeyName", type: "cexostring", value: "K".repeat(32) });

    const reverted = mutateExistingAreaObjectsInGitGic({
      sourceGit: result.gitBytes,
      sourceGic: result.gicBytes,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        keyName: { expectedValue: "K".repeat(32), value: "" },
      }],
    });
    expect(list(parseRawGffDocument(reverted.gitBytes), "Placeable List")!.value[1]!.fields)
      .toEqual(sourcePlaceable.fields);
  });

  it("rewrites ordered Placeable Hardness/Fort/Ref/Will Bytes and preserves every other GIT field and GIC byte", () => {
    const pair = fixturePair();
    const sourcePlaceable = list(parseRawGffDocument(pair.git), "Placeable List")!.value[1]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        basicByteFields: [
          { field: "Hardness", expectedValue: 5, value: 255 },
          { field: "Fort", expectedValue: 16, value: 20 },
          { field: "Ref", expectedValue: 0, value: 12 },
          { field: "Will", expectedValue: 0, value: 10 },
        ],
      } as never],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.placeable).toBe(1);
    const candidate = list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!;
    expect(candidate.fields).toEqual(expect.arrayContaining([
      { label: "Hardness", type: "byte", value: 255 },
      { label: "Fort", type: "byte", value: 20 },
      { label: "Ref", type: "byte", value: 12 },
      { label: "Will", type: "byte", value: 10 },
    ]));
    const changed = new Set(["Hardness", "Fort", "Ref", "Will"]);
    expect(candidate.fields.filter((field) => !changed.has(field.label)))
      .toEqual(sourcePlaceable.fields.filter((field) => !changed.has(field.label)));
  });

  it("rewrites a proper ordered subset of Placeable durability/save Bytes", () => {
    const pair = fixturePair();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        basicByteFields: [
          { field: "Fort", expectedValue: 16, value: 17 },
          { field: "Will", expectedValue: 0, value: 1 },
        ],
      } as never],
    });
    const candidate = list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!;
    expect(candidate.fields).toEqual(expect.arrayContaining([
      { label: "Hardness", type: "byte", value: 5 },
      { label: "Fort", type: "byte", value: 17 },
      { label: "Ref", type: "byte", value: 0 },
      { label: "Will", type: "byte", value: 1 },
    ]));
  });

  it.each([
    ["non-array list", null, "placeable:index=1:basicByteFields:invalid_list"],
    ["empty list", [], "placeable:index=1:basicByteFields:empty"],
    ["over-budget list", [
      { field: "Hardness", expectedValue: 5, value: 6 },
      { field: "Fort", expectedValue: 16, value: 17 },
      { field: "Ref", expectedValue: 0, value: 1 },
      { field: "Will", expectedValue: 0, value: 1 },
      { field: "Hardness", expectedValue: 5, value: 7 },
    ], "placeable:index=1:basicByteFields:count=5"],
    ["null entry", [null], "placeable:index=1:basicByteFields:entry=0:invalid"],
    ["array entry", [[]], "placeable:index=1:basicByteFields:entry=0:invalid"],
    ["primitive entry", [7], "placeable:index=1:basicByteFields:entry=0:invalid"],
    ["unsupported HP", [{ field: "HP", expectedValue: 15, value: 20 }], "placeable:index=1:HP:unsupported_basic_byte_field"],
    ["unexpected entry key", [{ field: "Hardness", expectedValue: 5, value: 6, hp: 10 }], "placeable:index=1:Hardness:unexpected_key=hp"],
    ["missing expected value", [{ field: "Hardness", value: 6 }], "placeable:index=1:Hardness:incomplete"],
    ["missing target value", [{ field: "Hardness", expectedValue: 5 }], "placeable:index=1:Hardness:incomplete"],
    ["invalid expected Byte", [{ field: "Hardness", expectedValue: "5", value: 6 }], "placeable:index=1:Hardness:invalid_expected_byte"],
    ["duplicate field", [
      { field: "Hardness", expectedValue: 5, value: 6 },
      { field: "Hardness", expectedValue: 5, value: 7 },
    ], "placeable:index=1:Hardness:duplicate"],
    ["out-of-order field", [
      { field: "Will", expectedValue: 0, value: 1 },
      { field: "Fort", expectedValue: 16, value: 17 },
    ], "placeable:index=1:Fort:out_of_order"],
    ["out-of-range target", [{ field: "Ref", expectedValue: 0, value: 256 }], "placeable:index=1:Ref:invalid_byte"],
    ["unchanged pair", [{ field: "Will", expectedValue: 0, value: 0 }], "placeable:index=1:Will:unchanged"],
  ])("rejects Placeable basic Byte mutation with %s", (_label, basicByteFields, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, basicByteFields } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["stale", [{ label: "Respawns", type: "int", value: 0 }],
      { respawns: 1 }, "encounter:index=0:Respawns:stale"],
    ["wrong type", [{ label: "Respawns", type: "dword", value: 0 }],
      { respawns: 0 },
      "encounter:index=0:Respawns:count=1:label=Respawns:type=dword"],
    ["duplicate", [
      { label: "Respawns", type: "int", value: 0 },
      { label: "Respawns", type: "int", value: 0 },
    ], { respawns: 0 },
    "encounter:index=0:Respawns:count=2:label=Respawns:type=int"],
    ["below sentinel", [{ label: "Respawns", type: "int", value: -2 }],
      { respawns: 0 }, "encounter:index=0:Respawns:noncanonical"],
    ["above finite range", [{ label: "Respawns", type: "int", value: 32_001 }],
      { respawns: 0 }, "encounter:index=0:Respawns:noncanonical"],
  ] as const)("rejects retained Encounter Respawns with %s source", (
    _label,
    replacements,
    expectedValue,
    diagnostic,
  ) => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const encounter = list(source, "Encounter List")!.value[0]!;
    encounter.fields = [
      ...encounter.fields.filter((field) => field.label !== "Respawns"),
      ...(replacements as SupportedGffField[]),
    ];

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(source.fields, "GIT ", source.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "encounter",
        sourceIndex: 0,
        respawns: {
          expectedValue,
          value: { respawns: expectedValue.respawns === -1 ? 0 : -1 },
        },
      } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["missing", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "Hardness"), "placeable:index=1:Hardness:count=0:type=missing"],
    ["wrong type", (fields: SupportedGffField[]) => fields.map((field) => field.label === "Hardness" ? { label: "Hardness", type: "word" as const, value: 5 } : field), "placeable:index=1:Hardness:count=1:type=word"],
    ["duplicate", (fields: SupportedGffField[]) => [...fields, { label: "Hardness", type: "byte" as const, value: 5 }], "placeable:index=1:Hardness:count=2:type=byte"],
    ["stale", (fields: SupportedGffField[]) => fields, "placeable:index=1:Hardness:expected=4:actual=5"],
  ])("rejects a %s native Placeable durability Byte", (_label, transform, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withSecondPlaceableFields(pair.git, transform),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        basicByteFields: [{
          field: "Hardness",
          expectedValue: _label === "stale" ? 4 : 5,
          value: 6,
        }],
      } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it("rewrites exact Placeable AnimationState and preserves every other GIT field and GIC byte", () => {
    const pair = fixturePair();
    const sourcePlaceable = list(parseRawGffDocument(pair.git), "Placeable List")!.value[1]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        animationState: { expectedValue: 0, value: 2 },
      } as never],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.placeable).toBe(1);
    const candidate = list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!;
    expect(candidate.fields).toContainEqual({ label: "AnimationState", type: "byte", value: 2 });
    expect(candidate.fields.filter((field) => field.label !== "AnimationState"))
      .toEqual(sourcePlaceable.fields.filter((field) => field.label !== "AnimationState"));
  });

  it("rewrites exact Placeable HP / CurrentHP Shorts and preserves every other GIT field and GIC byte", () => {
    const pair = fixturePair();
    const sourcePlaceable = list(parseRawGffDocument(pair.git), "Placeable List")!.value[1]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        hitPoints: {
          expectedHitPoints: 15,
          hitPoints: 30,
          expectedCurrentHitPoints: 15,
          currentHitPoints: 30,
        },
      } as never],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.placeable).toBe(1);
    const candidate = list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!;
    expect(candidate.fields).toContainEqual({ label: "HP", type: "short", value: 30 });
    expect(candidate.fields).toContainEqual({ label: "CurrentHP", type: "short", value: 30 });
    expect(candidate.fields.filter((field) => field.label !== "HP" && field.label !== "CurrentHP"))
      .toEqual(sourcePlaceable.fields.filter(
        (field) => field.label !== "HP" && field.label !== "CurrentHP",
      ));
  });

  it.each([
    ["non-object pair", null],
    ["unexpected key", {
      expectedHitPoints: 15, hitPoints: 30, expectedCurrentHitPoints: 15, currentHitPoints: 30, extra: true,
    }],
    ["missing target CurrentHP", {
      expectedHitPoints: 15, hitPoints: 30, expectedCurrentHitPoints: 15,
    }],
    ["zero target HP", {
      expectedHitPoints: 15, hitPoints: 0, expectedCurrentHitPoints: 15, currentHitPoints: 15,
    }],
    ["incorrect derived CurrentHP", {
      expectedHitPoints: 15, hitPoints: 30, expectedCurrentHitPoints: 15, currentHitPoints: 29,
    }],
    ["unchanged HP", {
      expectedHitPoints: 15, hitPoints: 15, expectedCurrentHitPoints: 15, currentHitPoints: 15,
    }],
  ])("rejects Placeable HP mutation with %s", (_label, hitPoints) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, hitPoints } as never],
    }))).toMatchObject({ diagnostics: ["placeable:index=1:HP:invalid_pair"] });
  });

  it.each([
    ["missing HP", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "HP"), "placeable:index=1:HP:count=0:type=missing"],
    ["wrong HP type", (fields: SupportedGffField[]) => fields.map((field) => field.label === "HP" ? { label: "HP", type: "word" as const, value: 15 } : field), "placeable:index=1:HP:count=1:type=word"],
    ["duplicate HP", (fields: SupportedGffField[]) => [...fields, { label: "HP", type: "short" as const, value: 15 }], "placeable:index=1:HP:count=2:type=short"],
    ["stale HP", (fields: SupportedGffField[]) => fields.map((field) => field.label === "HP" ? { label: "HP", type: "short" as const, value: 14 } : field), "placeable:index=1:HP:expected=15:actual=14"],
    ["missing CurrentHP", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "CurrentHP"), "placeable:index=1:CurrentHP:count=0:type=missing"],
    ["wrong CurrentHP type", (fields: SupportedGffField[]) => fields.map((field) => field.label === "CurrentHP" ? { label: "CurrentHP", type: "word" as const, value: 15 } : field), "placeable:index=1:CurrentHP:count=1:type=word"],
    ["duplicate CurrentHP", (fields: SupportedGffField[]) => [...fields, { label: "CurrentHP", type: "short" as const, value: 15 }], "placeable:index=1:CurrentHP:count=2:type=short"],
    ["stale CurrentHP", (fields: SupportedGffField[]) => fields.map((field) => field.label === "CurrentHP" ? { label: "CurrentHP", type: "short" as const, value: 14 } : field), "placeable:index=1:CurrentHP:expected=15:actual=14"],
  ])("rejects a %s native Placeable field", (_label, transform, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withSecondPlaceableFields(pair.git, transform),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        hitPoints: {
          expectedHitPoints: 15,
          hitPoints: 30,
          expectedCurrentHitPoints: 15,
          currentHitPoints: 30,
        },
      } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it("rewrites the exact Placeable Tag CExoString verbatim and preserves every other GIT field and GIC byte", () => {
    const pair = fixturePair();
    const sourcePlaceable = list(parseRawGffDocument(pair.git), "Placeable List")!.value[1]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        tag: { expectedValue: "PLACEABLE_2", value: " New Tag " },
      }],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.placeable).toBe(1);
    const candidate = list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!;
    expect(candidate.fields).toContainEqual({ label: "Tag", type: "cexostring", value: " New Tag " });
    expect(candidate.fields.filter((field) => field.label !== "Tag"))
      .toEqual(sourcePlaceable.fields.filter((field) => field.label !== "Tag"));
  });

  it("rewrites bounded LocName and Description storage and preserves every other GIT field and GIC byte", () => {
    const pair = fixturePair();
    const sourceGit = withSecondPlaceableFields(pair.git, (fields) => [
      ...fields,
      {
        label: "LocName",
        type: "cexolocstring",
        value: { strRef: 0xffff_ffff, entries: [{ languageId: 0, text: " Chest " }] },
      },
      {
        label: "Description",
        type: "cexolocstring",
        value: { strRef: 0xffff_ffff, entries: [{ languageId: 0, text: "Storage" }] },
      },
    ]);
    const sourcePlaceable = list(parseRawGffDocument(sourceGit), "Placeable List")!.value[1]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        localizedStrings: [
          { field: "LocName", expectedValue: " Chest ", value: " Chest 2 " },
          { field: "Description", expectedValue: "Storage", value: "" },
        ],
      } as never],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.placeable).toBe(1);
    const candidate = list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!;
    expect(candidate.fields).toContainEqual({
      label: "LocName",
      type: "cexolocstring",
      value: { strRef: 0xffff_ffff, entries: [{ languageId: 0, text: " Chest 2 " }] },
    });
    expect(candidate.fields).toContainEqual({
      label: "Description",
      type: "cexolocstring",
      value: { strRef: 0xffff_ffff, entries: [] },
    });
    expect(candidate.fields.filter((field) => !["LocName", "Description"].includes(field.label)))
      .toEqual(sourcePlaceable.fields.filter(
        (field) => !["LocName", "Description"].includes(field.label),
      ));
  });

  it("preserves unrelated legacy text payload bytes while changing bounded LocName", () => {
    const pair = fixturePair();
    const canonical = withSecondPlaceableFields(pair.git, (fields) => [
      ...fields,
      { label: "LegacyString", type: "cexostring", value: "LEGACY" },
      {
        label: "LegacyLocalized",
        type: "cexolocstring",
        value: { strRef: 0xffff_ffff, entries: [{ languageId: 2, text: "FOREIGN" }] },
      },
      {
        label: "LocName",
        type: "cexolocstring",
        value: { strRef: 0xffff_ffff, entries: [{ languageId: 0, text: "Chest" }] },
      },
      { label: "Description", type: "cexolocstring", value: { strRef: 0xffff_ffff, entries: [] } },
    ]);
    const legacyStringBytes = Buffer.from([0x80, 0x81, 0x82, 0x83, 0x84, 0x85]);
    const legacyLocalizedBytes = Buffer.from([0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96]);
    const sourceGit = replaceUniqueBytes(
      replaceUniqueBytes(canonical, Buffer.from("LEGACY", "ascii"), legacyStringBytes),
      Buffer.from("FOREIGN", "ascii"),
      legacyLocalizedBytes,
    );
    const parsedLegacyString = list(parseRawGffDocument(sourceGit), "Placeable List")!
      .value[1]!.fields.find((field) => field.label === "LegacyString")!;
    const rawPayloadSymbols = Object.getOwnPropertySymbols(parsedLegacyString);
    expect(rawPayloadSymbols).toHaveLength(1);
    expect(Object.getOwnPropertyDescriptor(parsedLegacyString, rawPayloadSymbols[0]!))
      .toMatchObject({ enumerable: false, configurable: false, writable: false });

    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        localizedStrings: [{ field: "LocName", expectedValue: "Chest", value: "New Chest" }],
      } as never],
    });

    expect(result.gitBytes.indexOf(legacyStringBytes)).toBeGreaterThanOrEqual(0);
    expect(result.gitBytes.indexOf(legacyLocalizedBytes)).toBeGreaterThanOrEqual(0);
    expect(result.gicBytes).toEqual(pair.gic);
  });

  it("rewrites an admitted empty native LocName to one inline language-0 value", () => {
    const pair = fixturePair();
    const sourceGit = withSecondPlaceableFields(pair.git, (fields) => [
      ...fields,
      { label: "LocName", type: "cexolocstring", value: { strRef: 0xffff_ffff, entries: [] } },
    ]);

    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        localizedStrings: [{ field: "LocName", expectedValue: "", value: "Named" }],
      } as never],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!.fields)
      .toContainEqual({
        label: "LocName",
        type: "cexolocstring",
        value: { strRef: 0xffff_ffff, entries: [{ languageId: 0, text: "Named" }] },
      });
  });

  it("writes an exact ordered Placeable localized-string target list", () => {
    const pair = fixturePair();
    const sourceGit = withSecondPlaceableFields(pair.git, (fields) => [
      ...fields,
      {
        label: "LocName",
        type: "cexolocstring",
        value: {
          strRef: 0xffff_ffff,
          entries: [
            { languageId: 0, text: "Chest" },
            { languageId: 2, text: "Coffre" },
          ],
        },
      },
    ]);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        localizedStrings: [{
          field: "LocName",
          expectedValue: "Chest",
          value: "Chest",
          expectedProfile: "multi_entry_inline_ascii",
          expectedEntries: [
            { languageId: 0, text: "Chest" },
            { languageId: 2, text: "Coffre" },
          ],
          valueEntries: [
            { languageId: 10, text: "Skrzynia" },
            { languageId: 0, text: "Chest" },
          ],
        }],
      } as never],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!.fields)
      .toContainEqual({
        label: "LocName",
        type: "cexolocstring",
        value: {
          strRef: 0xffff_ffff,
          entries: [
            { languageId: 10, text: "Skrzynia" },
            { languageId: 0, text: "Chest" },
          ],
        },
      });
  });

  it.each([
    ["non-array", null],
    ["empty", []],
    ["unexpected key", [{ field: "LocName", expectedValue: "Chest", value: "New", extra: true }]],
    ["reordered", [
      { field: "Description", expectedValue: "Storage", value: "New storage" },
      { field: "LocName", expectedValue: "Chest", value: "New chest" },
    ]],
    ["non-ASCII", [{ field: "LocName", expectedValue: "Chest", value: "Żółć" }]],
  ])("rejects Placeable localized-string mutation with %s", (_label, localizedStrings) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, localizedStrings } as never],
    }))).toMatchObject({ diagnostics: ["placeable:index=1:localizedStrings:invalid_pair"] });
  });

  it.each([
    ["missing", (fields: SupportedGffField[]) => fields, "placeable:index=1:LocName:count=0:type=missing"],
    ["wrong type", (fields: SupportedGffField[]) => [
      ...fields,
      { label: "LocName", type: "cexostring" as const, value: "Chest" },
    ], "placeable:index=1:LocName:count=1:type=cexostring"],
    ["duplicate", (fields: SupportedGffField[]) => [
      ...fields,
      { label: "LocName", type: "cexolocstring" as const, value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: "Chest" }],
      } },
      { label: "LocName", type: "cexolocstring" as const, value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: "Chest" }],
      } },
    ], "placeable:index=1:LocName:count=2:type=cexolocstring"],
    ["TLK backed", (fields: SupportedGffField[]) => [
      ...fields,
      { label: "LocName", type: "cexolocstring" as const, value: { strRef: 1, entries: [] } },
    ], "placeable:index=1:LocName:unsupported_source"],
    ["multiple inline entries", (fields: SupportedGffField[]) => [
      ...fields,
      { label: "LocName", type: "cexolocstring" as const, value: {
        strRef: 0xffff_ffff,
        entries: [
          { languageId: 0, text: "Chest" },
          { languageId: 0, text: "Other" },
        ],
      } },
    ], "placeable:index=1:LocName:unsupported_source"],
    ["non-English inline identifier", (fields: SupportedGffField[]) => [
      ...fields,
      { label: "LocName", type: "cexolocstring" as const, value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 2, text: "Chest" }],
      } },
    ], "placeable:index=1:LocName:unsupported_source"],
    ["explicit empty inline entry", (fields: SupportedGffField[]) => [
      ...fields,
      { label: "LocName", type: "cexolocstring" as const, value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: "" }],
      } },
    ], "placeable:index=1:LocName:unsupported_source"],
    ["non-ASCII inline source", (fields: SupportedGffField[]) => [
      ...fields,
      { label: "LocName", type: "cexolocstring" as const, value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: "Żółć" }],
      } },
    ], "placeable:index=1:LocName:unsupported_source"],
    ["stale", (fields: SupportedGffField[]) => [
      ...fields,
      { label: "LocName", type: "cexolocstring" as const, value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: "Actual" }],
      } },
    ], "placeable:index=1:LocName:expected=Chest:actual=Actual"],
  ])("rejects a %s native Placeable LocName", (_label, transform, diagnostic) => {
    const pair = fixturePair();
    const sourceGit = withSecondPlaceableFields(pair.git, transform);
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        localizedStrings: [{ field: "LocName", expectedValue: "Chest", value: "New" }],
      } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["non-object pair", null],
    ["unexpected key", { expectedValue: "PLACEABLE_2", value: "new", extra: true }],
    ["missing expected value", { value: "new" }],
    ["over-budget target", { expectedValue: "PLACEABLE_2", value: "x".repeat(33) }],
    ["NUL target", { expectedValue: "PLACEABLE_2", value: "new\u0000tag" }],
    ["unchanged pair", { expectedValue: "PLACEABLE_2", value: "PLACEABLE_2" }],
  ])("rejects Placeable Tag mutation with %s", (_label, tag) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, tag } as never],
    }))).toMatchObject({ diagnostics: ["placeable:index=1:Tag:invalid_pair"] });
  });

  it.each([
    ["missing", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "Tag"), "PLACEABLE_2", "placeable:index=1:Tag:count=0:type=missing"],
    ["wrong type", (fields: SupportedGffField[]) => fields.map((field) => field.label === "Tag" ? { label: "Tag", type: "resref" as const, value: "placeable_2" } : field), "PLACEABLE_2", "placeable:index=1:Tag:count=1:type=resref"],
    ["duplicate", (fields: SupportedGffField[]) => [...fields, { label: "Tag", type: "cexostring" as const, value: "PLACEABLE_2" }], "PLACEABLE_2", "placeable:index=1:Tag:count=2:type=cexostring"],
    ["stale", (fields: SupportedGffField[]) => fields, "OLD", "placeable:index=1:Tag:expected=OLD:actual=PLACEABLE_2"],
  ])("rejects a %s native Placeable Tag CExoString", (_label, transform, expectedValue, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withSecondPlaceableFields(pair.git, transform),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        tag: { expectedValue, value: "new" },
      }],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it("rewrites exact Placeable Appearance DWord and preserves every other GIT field and GIC byte", () => {
    const pair = fixturePair();
    const sourcePlaceable = list(parseRawGffDocument(pair.git), "Placeable List")!.value[1]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        appearance: {
          expectedValue: 104,
          value: 105,
          tableSha256: "c".repeat(64),
          rowCount: 200,
        },
      } as never],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.placeable).toBe(1);
    const candidate = list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!;
    expect(candidate.fields).toContainEqual({ label: "Appearance", type: "dword", value: 105 });
    expect(candidate.fields.filter((field) => field.label !== "Appearance"))
      .toEqual(sourcePlaceable.fields.filter((field) => field.label !== "Appearance"));
  });

  it("reports Appearance when the same immutable Placeable property mutation is duplicated", () => {
    const pair = fixturePair();
    const mutation = {
      kind: "placeable" as const,
      sourceIndex: 1,
      appearance: {
        expectedValue: 104,
        value: 105,
        tableSha256: "c".repeat(64),
        rowCount: 200,
      },
    };
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [mutation, mutation],
    }))).toMatchObject({ diagnostics: ["placeable:index=1:Appearance:duplicate"] });
  });

  it.each([
    ["non-object pair", null, "placeable:index=1:Appearance:invalid_pair"],
    ["unexpected key", { expectedValue: 104, value: 105, tableSha256: "c".repeat(64), rowCount: 200, label: "Chest" }, "placeable:index=1:Appearance:invalid_pair"],
    ["uppercase digest", { expectedValue: 104, value: 105, tableSha256: "C".repeat(64), rowCount: 200 }, "placeable:index=1:Appearance:invalid_pair"],
    ["target outside rows", { expectedValue: 104, value: 200, tableSha256: "c".repeat(64), rowCount: 200 }, "placeable:index=1:Appearance:invalid_pair"],
    ["unchanged pair", { expectedValue: 104, value: 104, tableSha256: "c".repeat(64), rowCount: 200 }, "placeable:index=1:Appearance:invalid_pair"],
  ])("rejects Placeable Appearance mutation with %s", (_label, appearance, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, appearance } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["missing", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "Appearance"), 104, "placeable:index=1:Appearance:count=0:type=missing"],
    ["wrong type", (fields: SupportedGffField[]) => fields.map((field) => field.label === "Appearance" ? { label: "Appearance", type: "word" as const, value: 104 } : field), 104, "placeable:index=1:Appearance:count=1:type=word"],
    ["duplicate", (fields: SupportedGffField[]) => [...fields, { label: "Appearance", type: "dword" as const, value: 104 }], 104, "placeable:index=1:Appearance:count=2:type=dword"],
    ["stale", (fields: SupportedGffField[]) => fields, 103, "placeable:index=1:Appearance:expected=103:actual=104"],
  ])("rejects a %s native Placeable Appearance DWord", (_label, transform, expectedValue, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withSecondPlaceableFields(pair.git, transform),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        appearance: {
          expectedValue,
          value: 105,
          tableSha256: "c".repeat(64),
          rowCount: 200,
        },
      } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it("rewrites exact Placeable TrapType Byte and preserves every other GIT field and GIC byte", () => {
    const pair = fixturePair();
    const sourcePlaceable = list(parseRawGffDocument(pair.git), "Placeable List")!.value[1]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        trapType: {
          expectedValue: 3,
          value: 7,
          tableSha256: "d".repeat(64),
          tableRowCount: 48,
        },
      } as never],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.placeable).toBe(1);
    const candidate = list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!;
    expect(candidate.fields).toContainEqual({ label: "TrapType", type: "byte", value: 7 });
    expect(candidate.fields.filter((field) => field.label !== "TrapType"))
      .toEqual(sourcePlaceable.fields.filter((field) => field.label !== "TrapType"));
  });

  it.each([
    ["invalid pair", null, "placeable:index=1:TrapType:invalid_pair"],
    ["unexpected key", { expectedValue: 3, value: 7, tableSha256: "d".repeat(64), tableRowCount: 48, extra: true }, "placeable:index=1:TrapType:invalid_pair"],
    ["target outside rows", { expectedValue: 3, value: 48, tableSha256: "d".repeat(64), tableRowCount: 48 }, "placeable:index=1:TrapType:invalid_pair"],
    ["unchanged", { expectedValue: 3, value: 3, tableSha256: "d".repeat(64), tableRowCount: 48 }, "placeable:index=1:TrapType:invalid_pair"],
  ])("rejects Placeable TrapType mutation with %s", (_label, trapType, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, trapType } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["missing", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "TrapType"), 3, "placeable:index=1:TrapType:count=0:type=missing"],
    ["wrong type", (fields: SupportedGffField[]) => fields.map((field) => field.label === "TrapType" ? { label: "TrapType", type: "word" as const, value: 3 } : field), 3, "placeable:index=1:TrapType:count=1:type=word"],
    ["duplicate", (fields: SupportedGffField[]) => [...fields, { label: "TrapType", type: "byte" as const, value: 3 }], 3, "placeable:index=1:TrapType:count=2:type=byte"],
    ["stale", (fields: SupportedGffField[]) => fields, 2, "placeable:index=1:TrapType:expected=2:actual=3"],
  ])("rejects a %s native Placeable TrapType Byte", (_label, transform, expectedValue, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withSecondPlaceableFields(pair.git, transform),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        trapType: {
          expectedValue,
          value: 7,
          tableSha256: "d".repeat(64),
          tableRowCount: 48,
        },
      } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it("rewrites only one exact Placeable BodyBag Byte and preserves GIC byte-for-byte", () => {
    const pair = fixturePair();
    const sourceGit = withSecondPlaceableFields(pair.git, (fields) => [
      ...fields,
      { label: "BodyBag", type: "byte", value: 0 },
    ]);
    const sourcePlaceable = list(parseRawGffDocument(sourceGit), "Placeable List")!.value[1]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        bodyBag: { expectedValue: 0, value: 3, tableSha256: "e".repeat(64), tableRowCount: 7 },
      } as never],
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.placeable).toBe(1);
    const candidate = list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!;
    expect(candidate.fields).toContainEqual({ label: "BodyBag", type: "byte", value: 3 });
    expect(candidate.fields.filter((field) => field.label !== "BodyBag"))
      .toEqual(sourcePlaceable.fields.filter((field) => field.label !== "BodyBag"));
  });

  it.each([
    [null, (fields: SupportedGffField[]) => [...fields, { label: "BodyBag", type: "byte" as const, value: 0 }], "placeable:index=1:BodyBag:invalid_pair"],
    [{ expectedValue: 0, value: 3, tableSha256: "e".repeat(64), tableRowCount: 7 }, (fields: SupportedGffField[]) => fields, "placeable:index=1:BodyBag:count=0:type=missing"],
    [{ expectedValue: 1, value: 3, tableSha256: "e".repeat(64), tableRowCount: 7 }, (fields: SupportedGffField[]) => [...fields, { label: "BodyBag", type: "byte" as const, value: 0 }], "placeable:index=1:BodyBag:expected=1:actual=0"],
    [{ expectedValue: 0, value: 3, tableSha256: "e".repeat(64), tableRowCount: 7 }, (fields: SupportedGffField[]) => [...fields, { label: "BodyBag", type: "word" as const, value: 0 }], "placeable:index=1:BodyBag:count=1:type=word"],
  ])("rejects malformed or stale Placeable BodyBag %#", (bodyBag, transform, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withSecondPlaceableFields(pair.git, transform),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, bodyBag } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it("rewrites only one exact Placeable PortraitId Word and preserves GIC byte-for-byte", () => {
    const pair = fixturePair();
    const sourceGit = withSecondPlaceableFields(pair.git, (fields) => [
      ...fields,
      { label: "PortraitId", type: "word", value: 462 },
    ]);
    const sourcePlaceable = list(parseRawGffDocument(sourceGit), "Placeable List")!.value[1]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        portrait: { expectedValue: 462, value: 463, tableSha256: "a".repeat(64), tableRowCount: 700 },
      } as never],
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.placeable).toBe(1);
    const candidate = list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!;
    expect(candidate.fields).toContainEqual({ label: "PortraitId", type: "word", value: 463 });
    expect(candidate.fields.filter((field) => field.label !== "PortraitId"))
      .toEqual(sourcePlaceable.fields.filter((field) => field.label !== "PortraitId"));
  });

  it.each([
    [null, (fields: SupportedGffField[]) => [...fields, { label: "PortraitId", type: "word" as const, value: 462 }], "placeable:index=1:PortraitId:invalid_pair"],
    [{ expectedValue: 462, value: 463, tableSha256: "a".repeat(64), tableRowCount: 700 }, (fields: SupportedGffField[]) => fields, "placeable:index=1:PortraitId:count=0:type=missing"],
    [{ expectedValue: 461, value: 463, tableSha256: "a".repeat(64), tableRowCount: 700 }, (fields: SupportedGffField[]) => [...fields, { label: "PortraitId", type: "word" as const, value: 462 }], "placeable:index=1:PortraitId:expected=461:actual=462"],
    [{ expectedValue: 462, value: 463, tableSha256: "a".repeat(64), tableRowCount: 700 }, (fields: SupportedGffField[]) => [...fields, { label: "PortraitId", type: "dword" as const, value: 462 }], "placeable:index=1:PortraitId:count=1:type=dword"],
  ])("rejects malformed or stale Placeable PortraitId %#", (portrait, transform, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withSecondPlaceableFields(pair.git, transform),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, portrait } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it("rewrites only one exact Placeable Faction DWord and preserves GIC byte-for-byte", () => {
    const pair = fixturePair();
    const sourceGit = withSecondPlaceableFields(pair.git, (fields) => [
      ...fields,
      { label: "Faction", type: "dword", value: 2 },
    ]);
    const sourcePlaceable = list(parseRawGffDocument(sourceGit), "Placeable List")!.value[1]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        faction: {
          expectedValue: 2,
          value: 3,
          catalogSha256: "f".repeat(64),
          catalogFactionCount: 5,
        },
      } as never],
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.placeable).toBe(1);
    const candidate = list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!;
    expect(candidate.fields).toContainEqual({ label: "Faction", type: "dword", value: 3 });
    expect(candidate.fields.filter((field) => field.label !== "Faction"))
      .toEqual(sourcePlaceable.fields.filter((field) => field.label !== "Faction"));
  });

  it.each([
    [null, (fields: SupportedGffField[]) => [...fields, { label: "Faction", type: "dword" as const, value: 2 }], "placeable:index=1:Faction:invalid_pair"],
    [{ expectedValue: 2, value: 3, catalogSha256: "f".repeat(64), catalogFactionCount: 5 }, (fields: SupportedGffField[]) => fields, "placeable:index=1:Faction:count=0:type=missing"],
    [{ expectedValue: 1, value: 3, catalogSha256: "f".repeat(64), catalogFactionCount: 5 }, (fields: SupportedGffField[]) => [...fields, { label: "Faction", type: "dword" as const, value: 2 }], "placeable:index=1:Faction:expected=1:actual=2"],
    [{ expectedValue: 2, value: 3, catalogSha256: "f".repeat(64), catalogFactionCount: 5 }, (fields: SupportedGffField[]) => [...fields, { label: "Faction", type: "word" as const, value: 2 }], "placeable:index=1:Faction:count=1:type=word"],
  ])("rejects malformed or stale Placeable Faction %#", (faction, transform, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withSecondPlaceableFields(pair.git, transform),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, faction } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it("rewrites the exact Placeable VarTable with all supported native types and preserves GIC", () => {
    const pair = fixturePair();
    const nativeList: SupportedGffField = {
      label: "VarTable", type: "list", value: [
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "Counter" },
          { label: "Type", type: "dword", value: 1 },
          { label: "Value", type: "int", value: 1 },
        ] },
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "Scale" },
          { label: "Type", type: "dword", value: 2 },
          { label: "Value", type: "float", value: 1.5 },
        ] },
      ],
    };
    const sourceGit = withSecondPlaceableFields(pair.git, (fields) => [...fields, nativeList]);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable", sourceIndex: 1,
        variables: {
          expectedEntries: [
            { sourceIndex: 0, name: "Counter", type: "int", value: 1 },
            { sourceIndex: 1, name: "Scale", type: "float", value: 1.5 },
          ],
          entries: [
            { name: "Label", type: "string", value: "ready" },
            { name: "Counter", type: "int", value: -4 },
            { name: "Scale", type: "float", value: 2.5 },
          ],
        },
      } as never],
    });
    expect(result.gicBytes).toEqual(pair.gic);
    const candidate = list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!;
    expect(candidate.fields.find((field) => field.label === "VarTable")).toEqual({
      label: "VarTable", type: "list", value: [
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "Label" },
          { label: "Type", type: "dword", value: 3 },
          { label: "Value", type: "cexostring", value: "ready" },
        ] },
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "Counter" },
          { label: "Type", type: "dword", value: 1 },
          { label: "Value", type: "int", value: -4 },
        ] },
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "Scale" },
          { label: "Type", type: "dword", value: 2 },
          { label: "Value", type: "float", value: 2.5 },
        ] },
      ],
    });
  });

  it("adds an absent Placeable VarTable and removes it again for an empty target", () => {
    const pair = fixturePair();
    const added = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git, sourceGic: pair.gic, deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, variables: {
        expectedEntries: [], entries: [{ name: "x", type: "int", value: 1 }],
      } } as never],
    });
    const addedPlaceable = list(parseRawGffDocument(added.gitBytes), "Placeable List")!.value[1]!;
    expect(addedPlaceable.fields.filter((field) => field.label === "VarTable")).toHaveLength(1);
    const removed = mutateExistingAreaObjectsInGitGic({
      sourceGit: added.gitBytes, sourceGic: pair.gic, deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, variables: {
        expectedEntries: [{ sourceIndex: 0, name: "x", type: "int", value: 1 }], entries: [],
      } } as never],
    });
    expect(list(parseRawGffDocument(removed.gitBytes), "Placeable List")!.value[1]!.fields
      .some((field) => field.label === "VarTable")).toBe(false);
  });

  it.each([
    ["stale value", { label: "VarTable", type: "list" as const, value: [{ typeId: 0, fields: [
      { label: "Name", type: "cexostring" as const, value: "x" },
      { label: "Type", type: "dword" as const, value: 1 },
      { label: "Value", type: "int" as const, value: 2 },
    ] }] }],
    ["wrong case", { label: "vartable", type: "list" as const, value: [] }],
  ])("rejects a %s native Placeable VarTable", (_label, nativeField) => {
    const pair = fixturePair();
    const expectedEntries = nativeField.label === "VarTable"
      ? [{ sourceIndex: 0, name: "x", type: "int" as const, value: 1 }]
      : [];
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withSecondPlaceableFields(pair.git, (fields) => [...fields, nativeField]),
      sourceGic: pair.gic, deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, variables: {
        expectedEntries, entries: [{ name: "x", type: "int", value: 3 }],
      } } as never],
    })).toThrow();
  });

  it("rewrites the exact Creature VarTable and preserves every GIC byte", () => {
    const pair = fixturePair();
    const sourceGit = withSecondCreatureFields(pair.git, (fields) => [...fields, {
      label: "VarTable",
      type: "list",
      value: [{ typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "Counter" },
        { label: "Type", type: "dword", value: 1 },
        { label: "Value", type: "int", value: 1 },
      ] }],
    }]);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 1,
        variables: {
          expectedEntries: [
            { sourceIndex: 0, name: "Counter", type: "int", value: 1 },
          ],
          entries: [
            { name: "Label", type: "string", value: "ready" },
            { name: "Scale", type: "float", value: 2.5 },
            { name: "Counter", type: "int", value: -4 },
          ],
        },
      } as never],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);
    const candidate = list(parseRawGffDocument(result.gitBytes), "Creature List")!.value[1]!;
    expect(candidate.fields.find((field) => field.label === "VarTable")).toEqual({
      label: "VarTable",
      type: "list",
      value: [
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "Label" },
          { label: "Type", type: "dword", value: 3 },
          { label: "Value", type: "cexostring", value: "ready" },
        ] },
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "Scale" },
          { label: "Type", type: "dword", value: 2 },
          { label: "Value", type: "float", value: 2.5 },
        ] },
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "Counter" },
          { label: "Type", type: "dword", value: 1 },
          { label: "Value", type: "int", value: -4 },
        ] },
      ],
    });
  });

  it("rejects a stale Creature VarTable compare-and-swap mutation", () => {
    const pair = fixturePair();
    const sourceGit = withSecondCreatureFields(pair.git, (fields) => [...fields, {
      label: "VarTable",
      type: "list",
      value: [{ typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "x" },
        { label: "Type", type: "dword", value: 1 },
        { label: "Value", type: "int", value: 2 },
      ] }],
    }]);

    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "creature", sourceIndex: 1, variables: {
        expectedEntries: [{ sourceIndex: 0, name: "x", type: "int", value: 1 }],
        entries: [{ name: "x", type: "int", value: 3 }],
      } } as never],
    })).toThrow();
  });

  it.each([
    ["non-object pair", null, "placeable:index=1:AnimationState:invalid_pair"],
    ["array pair", [], "placeable:index=1:AnimationState:invalid_pair"],
    ["primitive pair", 1, "placeable:index=1:AnimationState:invalid_pair"],
    ["missing expected value", { value: 1 }, "placeable:index=1:AnimationState:incomplete"],
    ["missing target value", { expectedValue: 0 }, "placeable:index=1:AnimationState:incomplete"],
    ["unexpected key", { expectedValue: 0, value: 1, animation: "open" }, "placeable:index=1:AnimationState:unexpected_key=animation"],
    ["invalid expected value", { expectedValue: 3, value: 1 }, "placeable:index=1:AnimationState:invalid_expected_value"],
    ["invalid target value", { expectedValue: 0, value: -1 }, "placeable:index=1:AnimationState:invalid_value"],
    ["non-integer target", { expectedValue: 0, value: 1.5 }, "placeable:index=1:AnimationState:invalid_value"],
    ["unchanged pair", { expectedValue: 1, value: 1 }, "placeable:index=1:AnimationState:unchanged"],
  ])("rejects Placeable AnimationState mutation with %s", (_label, animationState, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, animationState } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["missing", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "AnimationState"), 0, "placeable:index=1:AnimationState:count=0:type=missing"],
    ["wrong type", (fields: SupportedGffField[]) => fields.map((field) => field.label === "AnimationState" ? { label: "AnimationState", type: "word" as const, value: 0 } : field), 0, "placeable:index=1:AnimationState:count=1:type=word"],
    ["duplicate", (fields: SupportedGffField[]) => [...fields, { label: "AnimationState", type: "byte" as const, value: 0 }], 0, "placeable:index=1:AnimationState:count=2:type=byte"],
    ["out-of-set", (fields: SupportedGffField[]) => fields.map((field) => field.label === "AnimationState" ? { label: "AnimationState", type: "byte" as const, value: 3 } : field), 0, "placeable:index=1:AnimationState:invalid_byte=3"],
    ["stale", (fields: SupportedGffField[]) => fields, 1, "placeable:index=1:AnimationState:expected=1:actual=0"],
  ])("rejects a %s native Placeable AnimationState", (_label, transform, expectedValue, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withSecondPlaceableFields(pair.git, transform),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        animationState: { expectedValue, value: expectedValue === 2 ? 1 : 2 },
      } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it("mutates only the exact ordinal-paired GIC Placeable Comment and preserves every GIT byte", () => {
    const pair = fixturePair();
    const expectedGic = parseRawGffDocument(pair.gic)!;
    const expectedEntry = list(expectedGic, "Placeable List")!.value[1]!;
    expectedEntry.fields = expectedEntry.fields.map((field) => field.label === "Comment"
      ? { label: "Comment", type: "cexostring" as const, value: "  west wall note  " }
      : field);

    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        editorComment: {
          expectedValue: "placeable-comment-2",
          value: "  west wall note  ",
        },
      } as never],
    });

    expect(result.gitBytes).toEqual(pair.git);
    expect(result.gicBytes).not.toEqual(pair.gic);
    expect(parseRawGffDocument(result.gicBytes)).toEqual(expectedGic);
    expect(result.propertyUpdatedCounts).toMatchObject({ placeable: 1 });
  });

  it("mutates only the exact ordinal-paired GIC Creature Comment and preserves every GIT byte", () => {
    const pair = fixturePair();
    const expectedGic = parseRawGffDocument(pair.gic)!;
    const expectedEntry = list(expectedGic, "Creature List")!.value[1]!;
    expectedEntry.fields = expectedEntry.fields.map((field) => field.label === "Comment"
      ? { label: "Comment", type: "cexostring" as const, value: "  west guard note  " }
      : field);

    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 1,
        editorComment: {
          expectedValue: "creature-comment-2",
          value: "  west guard note  ",
        },
      } as never],
    });

    expect(result.gitBytes).toEqual(pair.git);
    expect(result.gicBytes).not.toEqual(pair.gic);
    expect(parseRawGffDocument(result.gicBytes)).toEqual(expectedGic);
    expect(result.propertyUpdatedCounts).toMatchObject({ creature: 1 });
  });

  it("mutates only the exact ordinal-paired GIC ground-item Comment and preserves every GIT byte", () => {
    const pair = fixturePair();
    const expectedGic = parseRawGffDocument(pair.gic)!;
    const expectedEntry = list(expectedGic, "List")!.value[1]!;
    expectedEntry.fields = expectedEntry.fields.map((field) => field.label === "Comment"
      ? { label: "Comment", type: "cexostring" as const, value: "  west item note  " }
      : field);

    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "item",
        sourceIndex: 1,
        editorComment: {
          expectedValue: "item-comment-2",
          value: "  west item note  ",
        },
      } as never],
    });

    expect(result.gitBytes).toEqual(pair.git);
    expect(result.gicBytes).not.toEqual(pair.gic);
    expect(parseRawGffDocument(result.gicBytes)).toEqual(expectedGic);
    expect(result.propertyUpdatedCounts).toMatchObject({ item: 1 });
  });

  it("mutates only the exact ordinal-paired GIC Store Comment and preserves every GIT byte", () => {
    const pair = fixturePair();
    const expectedGic = parseRawGffDocument(pair.gic)!;
    const expectedEntry = list(expectedGic, "StoreList")!.value[0]!;
    expectedEntry.fields = expectedEntry.fields.map((field) => field.label === "Comment"
      ? { label: "Comment", type: "cexostring" as const, value: "  west store note  " }
      : field);

    const input = {
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "store",
        sourceIndex: 0,
        editorComment: {
          expectedValue: "store-comment-1",
          value: "  west store note  ",
        },
      } as never],
    };
    const result = mutateExistingAreaObjectsInGitGic(input);
    const repeated = mutateExistingAreaObjectsInGitGic(input);

    expect(result.gitBytes).toEqual(pair.git);
    expect(result.gicBytes).not.toEqual(pair.gic);
    expect(parseRawGffDocument(result.gicBytes)).toEqual(expectedGic);
    expect(result.propertyUpdatedCounts).toMatchObject({ store: 1 });
    expect(repeated.gicBytes).toEqual(result.gicBytes);
  });

  it("mutates only the seven exact retained Store commerce fields and preserves every GIC byte", () => {
    const pair = fixturePair();
    const expectedGit = parseRawGffDocument(pair.git)!;
    const expectedEntry = list(expectedGit, "StoreList")!.value[0]!;
    const replacements = new Map<string, number>([
      ["MarkDown", 70],
      ["BlackMarket", 1],
      ["StoreGold", 2500],
    ]);
    expectedEntry.fields = expectedEntry.fields.map((field) => {
      const value = replacements.get(field.label);
      if (value === undefined) return field;
      return field.label === "BlackMarket"
        ? { label: field.label, type: "byte" as const, value }
        : { label: field.label, type: "int" as const, value };
    });
    const sourceCommerce = storeCommerce();
    const input = {
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "store" as const,
        sourceIndex: 0,
        commerce: {
          expectedValue: sourceCommerce,
          value: { ...sourceCommerce, markDown: 70, blackMarket: true, storeGold: 2500 },
        },
      }],
    };

    const result = mutateExistingAreaObjectsInGitGic(input);
    const repeated = mutateExistingAreaObjectsInGitGic(input);
    expect(result.gitBytes).not.toEqual(pair.git);
    expect(result.gicBytes).toEqual(pair.gic);
    expect(parseRawGffDocument(result.gitBytes)).toEqual(expectedGit);
    expect(result.propertyUpdatedCounts).toMatchObject({ store: 1 });
    expect(repeated.gitBytes).toEqual(result.gitBytes);
  });

  it("mutates only the exact retained Store script ResRefs and preserves every GIC byte", () => {
    const pair = fixturePair();
    const expectedGit = parseRawGffDocument(pair.git)!;
    const expectedEntry = list(expectedGit, "StoreList")!.value[0]!;
    expectedEntry.fields = expectedEntry.fields.map((field) => {
      if (field.label === "OnOpenStore") {
        return { label: field.label, type: "resref" as const, value: "nw_store_open" };
      }
      if (field.label === "OnStoreClosed") {
        return { label: field.label, type: "resref" as const, value: "nw_store_close" };
      }
      return field;
    });
    const input = {
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "store" as const,
        sourceIndex: 0,
        scripts: {
          expectedValue: { onOpenStore: "store_open", onStoreClosed: "store_closed" },
          value: { onOpenStore: "nw_store_open", onStoreClosed: "nw_store_close" },
        },
      }],
    };

    const result = mutateExistingAreaObjectsInGitGic(input);
    const repeated = mutateExistingAreaObjectsInGitGic(input);
    expect(result.gitBytes).not.toEqual(pair.git);
    expect(result.gicBytes).toEqual(pair.gic);
    expect(parseRawGffDocument(result.gitBytes)).toEqual(expectedGit);
    expect(result.propertyUpdatedCounts).toMatchObject({ store: 1 });
    expect(repeated.gitBytes).toEqual(result.gitBytes);
  });

  it.each([
    ["partial pair", {
      expectedValue: { onOpenStore: "store_open", onStoreClosed: "store_closed" },
      value: { onOpenStore: "nw_store_open" },
    }],
    ["uppercase target", {
      expectedValue: { onOpenStore: "store_open", onStoreClosed: "store_closed" },
      value: { onOpenStore: "NW_STORE_OPEN", onStoreClosed: "nw_store_close" },
    }],
    ["unchanged pair", {
      expectedValue: { onOpenStore: "store_open", onStoreClosed: "store_closed" },
      value: { onOpenStore: "store_open", onStoreClosed: "store_closed" },
    }],
  ])("rejects a Store script mutation with %s", (_label, scripts) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "store", sourceIndex: 0, scripts } as never],
    }))).toMatchObject({ diagnostics: ["store:index=0:scripts:invalid_pair"] });
  });

  it("rejects stale retained Store script storage without exposing either ResRef", () => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "store",
        sourceIndex: 0,
        scripts: {
          expectedValue: { onOpenStore: "stale", onStoreClosed: "store_closed" },
          value: { onOpenStore: "nw_store_open", onStoreClosed: "nw_store_close" },
        },
      } as never],
    }))).toMatchObject({ diagnostics: ["store:index=0:scripts:stale_storage"] });
  });

  it("creates and removes an exact retained Store VarTable while preserving every GIC byte", () => {
    const pair = fixturePair();
    const entries = [
      { name: "Label", type: "string" as const, value: "ready" },
      { name: "Counter", type: "int" as const, value: -4 },
      { name: "Scale", type: "float" as const, value: Math.fround(2.5) },
    ];
    const input = {
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "store" as const,
        sourceIndex: 0,
        variables: { expectedEntries: [], entries },
      }],
    };

    const added = mutateExistingAreaObjectsInGitGic(input);
    const addedStore = list(parseRawGffDocument(added.gitBytes), "StoreList")!.value[0]!;
    expect(addedStore.fields.filter((field) => field.label === "VarTable")).toEqual([{
      label: "VarTable",
      type: "list",
      value: [
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "Label" },
          { label: "Type", type: "dword", value: 3 },
          { label: "Value", type: "cexostring", value: "ready" },
        ] },
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "Counter" },
          { label: "Type", type: "dword", value: 1 },
          { label: "Value", type: "int", value: -4 },
        ] },
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "Scale" },
          { label: "Type", type: "dword", value: 2 },
          { label: "Value", type: "float", value: Math.fround(2.5) },
        ] },
      ],
    }]);
    expect(added.gicBytes).toEqual(pair.gic);
    expect(added.propertyUpdatedCounts.store).toBe(1);
    expect(mutateExistingAreaObjectsInGitGic(input).gitBytes).toEqual(added.gitBytes);

    const removed = mutateExistingAreaObjectsInGitGic({
      sourceGit: added.gitBytes,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "store",
        sourceIndex: 0,
        variables: {
          expectedEntries: entries.map((entry, sourceIndex) => ({ sourceIndex, ...entry })),
          entries: [],
        },
      } as never],
    });
    expect(list(parseRawGffDocument(removed.gitBytes), "StoreList")!.value[0]!.fields
      .some((field) => field.label === "VarTable")).toBe(false);
    expect(removed.gicBytes).toEqual(pair.gic);
  });

  it("rejects a stale retained Store VarTable CAS", () => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "store",
        sourceIndex: 0,
        variables: {
          expectedEntries: [{ sourceIndex: 0, name: "STALE", type: "int", value: 1 }],
          entries: [{ name: "Counter", type: "int", value: 2 }],
        },
      } as never],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: ["store:index=0:VarTable:count=0:label=missing:type=missing"],
    });
  });

  it("mutates retained Store inventory by cloning, reordering, repacking, and canonicalizing Infinite", () => {
    const pair = fixturePair();
    const document = parseRawGffDocument(pair.git)!;
    const store = list(document, "StoreList")!.value[0]!;
    store.fields = store.fields.map((field) => field.label === "StoreList"
      ? nativeStoreInventory()
      : field);
    const sourceGit = buildGffBuffer(document.fields, "GIT ", document.rootStructTypeId);
    const expectedBuckets = nativeStoreInventoryProvenance();

    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "store",
        sourceIndex: 0,
        inventory: {
          expectedBuckets,
          buckets: [
            {
              bucketTypeId: 0,
              entries: [
                { sourceIndex: 1, resRef: "itm_b", baseItemId: 1, infinite: true },
                { sourceIndex: 0, resRef: "itm_a", baseItemId: 0, infinite: false },
              ],
            },
            { bucketTypeId: 4, entries: [] },
            { bucketTypeId: 2, entries: [] },
            { bucketTypeId: 3, entries: [] },
            { bucketTypeId: 1, entries: [] },
          ],
          tableSha256: "e".repeat(64),
          tableRowCount: 2,
        },
      } as never],
    });

    const updated = list(parseRawGffDocument(result.gitBytes), "StoreList")!.value[0]!;
    const inventory = list({ fields: updated.fields } as any, "StoreList")!;
    expect(inventory.value.map((bucket) => bucket.typeId)).toEqual([0, 4, 2, 3, 1]);
    const itemList = inventory.value[0]!.fields[0];
    expect(itemList?.type).toBe("list");
    if (itemList?.type !== "list") throw new Error("missing ItemList");
    expect(itemList.value.map((entry) => entry.typeId)).toEqual([0, 1]);
    expect(itemList.value[0]!.fields).toEqual([
      { label: "TemplateResRef", type: "resref", value: "itm_b" },
      { label: "BaseItem", type: "int", value: 1 },
      { label: "OpaqueB", type: "cexostring", value: "preserve-b" },
      { label: "Repos_PosX", type: "word", value: 0 },
      { label: "Repos_Posy", type: "word", value: 0 },
      { label: "Infinite", type: "byte", value: 1 },
    ]);
    expect(itemList.value[1]!.fields).toEqual([
      { label: "TemplateResRef", type: "resref", value: "itm_a" },
      { label: "BaseItem", type: "int", value: 0 },
      { label: "OpaqueA", type: "int", value: 77 },
      { label: "Repos_PosX", type: "word", value: 1 },
      { label: "Repos_Posy", type: "word", value: 0 },
    ]);
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.store).toBe(1);
  });

  it("rejects noncanonical retained Store inventory without exposing embedded identity", () => {
    const pair = fixturePair();
    const document = parseRawGffDocument(pair.git)!;
    const store = list(document, "StoreList")!.value[0]!;
    const inventory = nativeStoreInventory();
    const itemList = inventory.value[0]!.fields[0];
    if (itemList?.type !== "list") throw new Error("invalid fixture");
    itemList.value[0]!.fields.push({ label: "Dropable", type: "byte", value: 1 });
    store.fields = store.fields.map((field) => field.label === "StoreList" ? inventory : field);

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(document.fields, "GIT ", document.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "store",
        sourceIndex: 0,
        inventory: {
          expectedBuckets: nativeStoreInventoryProvenance(),
          buckets: [
            { bucketTypeId: 0, entries: [] },
            { bucketTypeId: 4, entries: [] },
            { bucketTypeId: 2, entries: [] },
            { bucketTypeId: 3, entries: [] },
            { bucketTypeId: 1, entries: [] },
          ],
          tableSha256: "e".repeat(64),
          tableRowCount: 2,
        },
      } as never],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: ["store:index=0:inventory:invalid_source_profile"],
    });
  });

  it("replaces both exact Store restriction lists in order and preserves duplicate rows and GIC", () => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const sourceStore = list(source, "StoreList")!.value[0]!;
    const insertionIndex = sourceStore.fields.findIndex((field) => field.label === "StoreList");
    sourceStore.fields.splice(
      insertionIndex,
      0,
      nativeStoreRestrictionList("WillNotBuy", [2, 1, 2]),
      nativeStoreRestrictionList("WillOnlyBuy", [0]),
    );
    const sourceGit = buildGffBuffer(source.fields, "GIT ", source.rootStructTypeId);
    const expected = parseRawGffDocument(sourceGit)!;
    const expectedStore = list(expected, "StoreList")!.value[0]!;
    expectedStore.fields = expectedStore.fields.map((field) => {
      if (field.label === "WillNotBuy") {
        return nativeStoreRestrictionList("WillNotBuy", [1, 2, 1]);
      }
      if (field.label === "WillOnlyBuy") {
        return nativeStoreRestrictionList("WillOnlyBuy", [0, 0]);
      }
      return field;
    });
    const input = {
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "store" as const,
        sourceIndex: 0,
        restrictions: {
          expectedValue: {
            willNotBuy: { present: true, baseItemIds: [2, 1, 2] },
            willOnlyBuy: { present: true, baseItemIds: [0] },
          },
          value: { willNotBuy: [1, 2, 1], willOnlyBuy: [0, 0] },
          tableSha256: "e".repeat(64),
          tableRowCount: 4,
        },
      }],
    };

    const result = mutateExistingAreaObjectsInGitGic(input);
    const repeated = mutateExistingAreaObjectsInGitGic(input);

    expect(result.gicBytes).toEqual(pair.gic);
    expect(parseRawGffDocument(result.gitBytes)).toEqual(expected);
    expect(repeated.gitBytes).toEqual(result.gitBytes);
    expect(result.propertyUpdatedCounts).toMatchObject({ store: 1 });
  });

  it("creates an absent restriction canonically and clears it to present-empty without creating the other absent list", () => {
    const pair = fixturePair();
    const created = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "store",
        sourceIndex: 0,
        restrictions: {
          expectedValue: {
            willNotBuy: { present: false, baseItemIds: [] },
            willOnlyBuy: { present: false, baseItemIds: [] },
          },
          value: { willNotBuy: [1], willOnlyBuy: [] },
          tableSha256: "e".repeat(64),
          tableRowCount: 4,
        },
      }],
    });
    const createdStore = list(parseRawGffDocument(created.gitBytes), "StoreList")!.value[0]!;
    const onClosedIndex = createdStore.fields.findIndex((field) => field.label === "OnStoreClosed");
    const willNotBuyIndex = createdStore.fields.findIndex((field) => field.label === "WillNotBuy");
    const inventoryIndex = createdStore.fields.findIndex((field) => field.label === "StoreList");
    expect(onClosedIndex).toBeLessThan(willNotBuyIndex);
    expect(willNotBuyIndex).toBeLessThan(inventoryIndex);
    expect(createdStore.fields.filter((field) => field.label === "WillNotBuy"))
      .toEqual([nativeStoreRestrictionList("WillNotBuy", [1])]);
    expect(createdStore.fields.some((field) => field.label === "WillOnlyBuy")).toBe(false);
    expect(created.gicBytes).toEqual(pair.gic);

    const cleared = mutateExistingAreaObjectsInGitGic({
      sourceGit: created.gitBytes,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "store",
        sourceIndex: 0,
        restrictions: {
          expectedValue: {
            willNotBuy: { present: true, baseItemIds: [1] },
            willOnlyBuy: { present: false, baseItemIds: [] },
          },
          value: { willNotBuy: [], willOnlyBuy: [] },
          tableSha256: "e".repeat(64),
          tableRowCount: 4,
        },
      }],
    });
    const clearedStore = list(parseRawGffDocument(cleared.gitBytes), "StoreList")!.value[0]!;
    expect(clearedStore.fields.filter((field) => field.label === "WillNotBuy"))
      .toEqual([nativeStoreRestrictionList("WillNotBuy", [])]);
    expect(clearedStore.fields.some((field) => field.label === "WillOnlyBuy")).toBe(false);
    expect(cleared.gicBytes).toEqual(pair.gic);
  });

  it("rejects opaque Store restriction entry siblings without exposing row IDs", () => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const store = list(source, "StoreList")!.value[0]!;
    store.fields.push({
      label: "WillNotBuy",
      type: "list",
      value: [{
        typeId: 0x0001_7e4d,
        fields: [
          { label: "BaseItem", type: "int", value: 2 },
          { label: "Opaque", type: "int", value: 99 },
        ],
      }],
    });
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(source.fields, "GIT ", source.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "store",
        sourceIndex: 0,
        restrictions: {
          expectedValue: {
            willNotBuy: { present: true, baseItemIds: [2] },
            willOnlyBuy: { present: false, baseItemIds: [] },
          },
          value: { willNotBuy: [1], willOnlyBuy: [] },
          tableSha256: "e".repeat(64),
          tableRowCount: 4,
        },
      } as never],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: ["store:index=0:restrictions:invalid_source_profile"],
    });
  });

  it("atomically combines Store commerce and paired-GIC Comment on one immutable ordinal", () => {
    const pair = fixturePair();
    const sourceCommerce = storeCommerce();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "store",
        sourceIndex: 0,
        editorComment: { expectedValue: "store-comment-1", value: "updated store" },
        commerce: {
          expectedValue: sourceCommerce,
          value: { ...sourceCommerce, identifyPrice: 250 },
        },
      }],
    });

    const gitStore = list(parseRawGffDocument(result.gitBytes), "StoreList")!.value[0]!;
    const gicStore = list(parseRawGffDocument(result.gicBytes), "StoreList")!.value[0]!;
    expect(gitStore.fields).toEqual(expect.arrayContaining([
      { label: "IdentifyPrice", type: "int", value: 250 },
      { label: "UnknownStoreFiel", type: "int", value: 101 },
      { label: "OnOpenStore", type: "resref", value: "store_open" },
    ]));
    expect(gicStore.fields).toEqual(expect.arrayContaining([
      { label: "Comment", type: "cexostring", value: "updated store" },
    ]));
  });

  it("applies a Store transform and commerce CAS before exact combined readback", () => {
    const pair = fixturePair();
    const sourceCommerce = storeCommerce();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{
        kind: "store",
        sourceIndex: 0,
        x: 5,
        y: 6,
        z: 0.25,
        bearing: Math.PI / 2,
      }],
      propertyMutations: [{
        kind: "store",
        sourceIndex: 0,
        commerce: {
          expectedValue: sourceCommerce,
          value: { ...sourceCommerce, markUp: 125 },
        },
      }],
    });
    const store = list(parseRawGffDocument(result.gitBytes), "StoreList")!.value[0]!;
    expect(store.fields).toEqual(expect.arrayContaining([
      { label: "XPosition", type: "float", value: 50 },
      { label: "YPosition", type: "float", value: 60 },
      { label: "MarkUp", type: "int", value: 125 },
    ]));
    expect(result.gicBytes).toEqual(pair.gic);
  });

  it.each([
    ["partial pair", { expectedValue: storeCommerce(), value: { markUp: 125 } }, "store:index=0:commerce:invalid_pair"],
    ["unchanged pair", { expectedValue: storeCommerce(), value: storeCommerce() }, "store:index=0:commerce:invalid_pair"],
  ])("rejects a Store commerce mutation with %s", (_label, commerce, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "store", sourceIndex: 0, commerce } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["missing", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "StoreGold"), "store:index=0:StoreGold:count=0:type=missing"],
    ["wrong case", (fields: SupportedGffField[]) => fields.map((field) => field.label === "StoreGold" ? { ...field, label: "storegold" } : field), "store:index=0:StoreGold:count=1:type=int"],
    ["wrong type", (fields: SupportedGffField[]) => fields.map((field) => field.label === "StoreGold" ? { label: "StoreGold", type: "dword" as const, value: 1 } : field), "store:index=0:StoreGold:count=1:type=dword"],
    ["duplicate", (fields: SupportedGffField[]) => [...fields, { label: "StoreGold", type: "int" as const, value: -1 }], "store:index=0:StoreGold:count=2:type=int"],
    ["noncanonical byte", (fields: SupportedGffField[]) => fields.map((field) => field.label === "BlackMarket" ? { ...field, value: 2 } : field), "store:index=0:BlackMarket:value=noncanonical"],
  ])("rejects %s retained Store commerce storage", (_label, transform, diagnostic) => {
    const pair = fixturePair();
    const document = parseRawGffDocument(pair.git)!;
    const store = list(document, "StoreList")!.value[0]!;
    store.fields = transform(store.fields);
    const sourceGit = buildGffBuffer(document.fields, "GIT ", document.rootStructTypeId);
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "store",
        sourceIndex: 0,
        commerce: {
          expectedValue: storeCommerce(),
          value: { ...storeCommerce(), storeGold: 99 },
        },
      } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it("rejects stale retained Store commerce without placing values in diagnostics", () => {
    const pair = fixturePair();
    const stale = { ...storeCommerce(), storeGold: 99 };
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "store",
        sourceIndex: 0,
        commerce: { expectedValue: stale, value: { ...stale, storeGold: 100 } },
      } as never],
    }))).toMatchObject({ diagnostics: ["store:index=0:commerce:stale_storage"] });
  });

  it("applies one Store transform and paired-GIC Comment without cross-file readback interference", () => {
    const pair = fixturePair();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{
        kind: "store",
        sourceIndex: 0,
        x: 5,
        y: 6,
        z: 0.25,
        bearing: Math.PI / 2,
      }],
      propertyMutations: [{
        kind: "store",
        sourceIndex: 0,
        editorComment: {
          expectedValue: "store-comment-1",
          value: "transformed store",
        },
      }],
    });

    const gitStore = list(parseRawGffDocument(result.gitBytes), "StoreList")!.value[0]!;
    expect(gitStore.fields).toEqual(expect.arrayContaining([
      { label: "XPosition", type: "float", value: 50 },
      { label: "YPosition", type: "float", value: 60 },
      { label: "ZPosition", type: "float", value: 2.5 },
      { label: "XOrientation", type: "float", value: Math.fround(Math.cos(Math.PI / 2)) },
      { label: "YOrientation", type: "float", value: Math.fround(-Math.sin(Math.PI / 2)) },
    ]));
    const gicStore = list(parseRawGffDocument(result.gicBytes), "StoreList")!.value[0]!;
    expect(gicStore.fields).toEqual(expect.arrayContaining([
      { label: "Comment", type: "cexostring", value: "transformed store" },
    ]));
    expect(result.transformedCounts).toMatchObject({ store: 1 });
    expect(result.propertyUpdatedCounts).toMatchObject({ store: 1 });
  });

  it.each([
    ["null pair", null, "store:index=0:Comment:invalid_pair"],
    ["missing expected value", { value: "new" }, "store:index=0:Comment:incomplete"],
    ["unexpected key", { expectedValue: "store-comment-1", value: "new", trim: true }, "store:index=0:Comment:unexpected_key=trim"],
    ["NUL target value", { expectedValue: "store-comment-1", value: "new\0comment" }, "store:index=0:Comment:invalid_value"],
    ["unchanged pair", { expectedValue: "same", value: "same" }, "store:index=0:Comment:unchanged"],
  ])("rejects a Store editor Comment mutation with %s", (_label, editorComment, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "store", sourceIndex: 0, editorComment } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["missing", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "Comment"), "store:index=0:Comment:count=0:type=missing"],
    ["wrong type", (fields: SupportedGffField[]) => fields.map((field) => field.label === "Comment" ? { label: "Comment", type: "resref" as const, value: "store-comment-1" } : field), "store:index=0:Comment:count=1:type=resref"],
    ["duplicate", (fields: SupportedGffField[]) => [...fields, { label: "Comment", type: "cexostring" as const, value: "store-comment-1" }], "store:index=0:Comment:count=2:type=cexostring"],
    ["stale", (fields: SupportedGffField[]) => fields, "store:index=0:Comment:expected=stale:actual=store-comment-1"],
  ])("rejects a %s native paired GIC Store Comment", (_label, transform, diagnostic) => {
    const pair = fixturePair();
    const document = parseRawGffDocument(pair.gic)!;
    const store = list(document, "StoreList")!.value[0]!;
    store.fields = transform(store.fields);
    const sourceGic = buildGffBuffer(document.fields, "GIC ", document.rootStructTypeId);
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic,
      deletions: [],
      propertyMutations: [{
        kind: "store",
        sourceIndex: 0,
        editorComment: {
          expectedValue: _label === "stale" ? "stale" : "store-comment-1",
          value: "new comment",
        },
      } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it("rejects a Store Comment mutation colliding with deletion of the same immutable ordinal", () => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [{ kind: "store", sourceIndex: 0 }],
      propertyMutations: [{
        kind: "store",
        sourceIndex: 0,
        editorComment: { expectedValue: "store-comment-1", value: "new" },
      } as never],
    }))).toMatchObject({ diagnostics: ["store:index=0:deleted"] });
  });

  it("rejects duplicate Store Comment mutations for one immutable ordinal", () => {
    const pair = fixturePair();
    const mutation = {
      kind: "store" as const,
      sourceIndex: 0,
      editorComment: { expectedValue: "store-comment-1", value: "new" },
    };
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [mutation, mutation],
    }))).toMatchObject({ diagnostics: ["store:index=0:Comment:duplicate"] });
  });

  it("replaces only one exact retained ground-item Tag in place and preserves every GIC byte", () => {
    const pair = fixturePair();
    const expectedGit = parseRawGffDocument(pair.git)!;
    const expectedEntry = list(expectedGit, "List")!.value[1]!;
    expectedEntry.fields = expectedEntry.fields.map((field) => field.label === "Tag"
      ? { label: "Tag", type: "cexostring" as const, value: "  WEST_WALL_LOOT  " }
      : field);

    const input = {
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "item",
        sourceIndex: 1,
        tag: { expectedValue: "ITEM_2", value: "  WEST_WALL_LOOT  " },
      } as never],
    };
    const result = mutateExistingAreaObjectsInGitGic(input);
    const repeated = mutateExistingAreaObjectsInGitGic(input);

    expect(result.gitBytes).not.toEqual(pair.git);
    expect(parseRawGffDocument(result.gitBytes)).toEqual(expectedGit);
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts).toMatchObject({ item: 1 });
    expect(repeated.gitBytes).toEqual(result.gitBytes);
    expect(repeated.gicBytes).toEqual(result.gicBytes);
  });

  it.each([
    [
      "wrong type",
      (fields: SupportedGffField[]) => fields.map((field) => field.label === "Tag"
        ? { label: "Tag", type: "resref" as const, value: "item_2" }
        : field),
      "ITEM_2",
      "item:index=1:Tag:count=1:type=resref",
    ],
    [
      "duplicate",
      (fields: SupportedGffField[]) => [
        ...fields,
        { label: "Tag", type: "cexostring" as const, value: "ITEM_2" },
      ],
      "ITEM_2",
      "item:index=1:Tag:count=2:type=cexostring",
    ],
    [
      "stale expected value",
      (fields: SupportedGffField[]) => fields,
      "STALE",
      "item:index=1:Tag:expected=STALE:actual=ITEM_2",
    ],
  ])("rejects a retained ground-item Tag mutation with %s", (
    _label,
    mutateFields,
    expectedValue,
    diagnostic,
  ) => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const item = list(source, "List")!.value[1]!;
    item.fields = mutateFields(item.fields);
    const sourceGit = buildGffBuffer(source.fields, "GIT ", source.rootStructTypeId);

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "item",
        sourceIndex: 1,
        tag: { expectedValue, value: "NEW_TAG" },
      } as never],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [diagnostic],
    });
  });

  it("replaces only one exact retained Trigger Tag in place and preserves every GIC byte", () => {
    const pair = fixturePair();
    const expectedGit = parseRawGffDocument(pair.git)!;
    const expectedEntry = list(expectedGit, "TriggerList")!.value[0]!;
    expectedEntry.fields = expectedEntry.fields.map((field) => field.label === "Tag"
      ? { label: "Tag", type: "cexostring" as const, value: "  AREA_EXIT  " }
      : field);

    const input = {
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "trigger",
        sourceIndex: 0,
        tag: { expectedValue: "TRIGGER_1", value: "  AREA_EXIT  " },
      } as never],
    };
    const result = mutateExistingAreaObjectsInGitGic(input);
    const repeated = mutateExistingAreaObjectsInGitGic(input);

    expect(result.gitBytes).not.toEqual(pair.git);
    expect(parseRawGffDocument(result.gitBytes)).toEqual(expectedGit);
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts).toMatchObject({ trigger: 1 });
    expect(repeated.gitBytes).toEqual(result.gitBytes);
    expect(repeated.gicBytes).toEqual(result.gicBytes);
  });

  it.each([
    [
      "wrong type",
      (fields: SupportedGffField[]) => fields.map((field) => field.label === "Tag"
        ? { label: "Tag", type: "resref" as const, value: "trigger_1" }
        : field),
      "TRIGGER_1",
      "trigger:index=0:Tag:count=1:type=resref",
    ],
    [
      "duplicate",
      (fields: SupportedGffField[]) => [
        ...fields,
        { label: "Tag", type: "cexostring" as const, value: "TRIGGER_1" },
      ],
      "TRIGGER_1",
      "trigger:index=0:Tag:count=2:type=cexostring",
    ],
    [
      "stale expected value",
      (fields: SupportedGffField[]) => fields,
      "STALE",
      "trigger:index=0:Tag:expected=STALE:actual=TRIGGER_1",
    ],
  ])("rejects a retained Trigger Tag mutation with %s", (
    _label,
    mutateFields,
    expectedValue,
    diagnostic,
  ) => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const trigger = list(source, "TriggerList")!.value[0]!;
    trigger.fields = mutateFields(trigger.fields);
    const sourceGit = buildGffBuffer(source.fields, "GIT ", source.rootStructTypeId);

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "trigger",
        sourceIndex: 0,
        tag: { expectedValue, value: "AREA_EXIT" },
      } as never],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [diagnostic],
    });
  });

  it("replaces one complete retained Trigger script tuple in place and preserves every GIC byte", () => {
    const pair = fixturePair();
    const expectedGit = parseRawGffDocument(pair.git)!;
    const expectedEntry = list(expectedGit, "TriggerList")!.value[0]!;
    const expectedValue = triggerScriptValues();
    const value = { ...expectedValue, onClick: "trg_click", onEnter: "trg_inside" };
    const replacements = new Map([
      ["OnClick", value.onClick],
      ["ScriptOnEnter", value.onEnter],
    ]);
    expectedEntry.fields = expectedEntry.fields.map((field) => replacements.has(field.label)
      ? { label: field.label, type: "resref" as const, value: replacements.get(field.label)! }
      : field);

    const input = {
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "trigger",
        sourceIndex: 0,
        scripts: { expectedValue, value },
      } as never],
    };
    const result = mutateExistingAreaObjectsInGitGic(input);
    const repeated = mutateExistingAreaObjectsInGitGic(input);

    expect(parseRawGffDocument(result.gitBytes)).toEqual(expectedGit);
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts).toMatchObject({ trigger: 1 });
    expect(repeated.gitBytes).toEqual(result.gitBytes);
    expect(repeated.gicBytes).toEqual(result.gicBytes);
  });

  it("replaces one complete retained Trigger transition tuple and preserves every sibling and GIC byte", () => {
    const pair = fixturePair();
    const expectedGit = parseRawGffDocument(pair.git)!;
    const expectedEntry = list(expectedGit, "TriggerList")!.value[0]!;
    const expectedValue = triggerTransitionStorage();
    const value = {
      linkedTo: " NEW_DESTINATION ",
      linkedToFlags: 2,
      loadScreenId: 7,
    };
    const replacements = new Map<string, string | number>([
      ["LinkedTo", value.linkedTo],
      ["LinkedToFlags", value.linkedToFlags],
      ["LoadScreenID", value.loadScreenId],
    ]);
    expectedEntry.fields = expectedEntry.fields.map((field) => replacements.has(field.label)
      ? { ...field, value: replacements.get(field.label)! } as SupportedGffField
      : field);

    const input = {
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "trigger",
        sourceIndex: 0,
        transitionStorage: { expectedValue, value },
      } as never],
    };
    const result = mutateExistingAreaObjectsInGitGic(input);
    const repeated = mutateExistingAreaObjectsInGitGic(input);

    expect(parseRawGffDocument(result.gitBytes)).toEqual(expectedGit);
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts).toMatchObject({ trigger: 1 });
    expect(repeated.gitBytes).toEqual(result.gitBytes);
    expect(repeated.gicBytes).toEqual(result.gicBytes);
  });

  it("replaces one complete retained Trigger core-properties tuple in place and preserves every sibling and GIC byte", () => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const sourceEntry = list(source, "TriggerList")!.value[0]!;
    sourceEntry.fields.splice(1, 0, ...triggerCorePropertyFields());
    const sourceGit = buildGffBuffer(source.fields, "GIT ", source.rootStructTypeId);
    const expectedGit = parseRawGffDocument(sourceGit)!;
    const expectedEntry = list(expectedGit, "TriggerList")!.value[0]!;
    const expectedValue = triggerCoreProperties();
    const value = {
      autoRemoveKey: 1 as const,
      factionId: 2,
      cursorId: 3,
      highlightHeight: Math.fround(1.5),
      keyName: "gate_key",
      portraitId: 4,
      triggerType: 1,
    };
    const replacements = new Map<string, string | number>([
      ["AutoRemoveKey", value.autoRemoveKey],
      ["Faction", value.factionId],
      ["Cursor", value.cursorId],
      ["HighlightHeight", value.highlightHeight],
      ["KeyName", value.keyName],
      ["PortraitId", value.portraitId],
      ["Type", value.triggerType],
    ]);
    expectedEntry.fields = expectedEntry.fields.map((field) => replacements.has(field.label)
      ? { ...field, value: replacements.get(field.label)! } as SupportedGffField
      : field);

    const input = {
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "trigger",
        sourceIndex: 0,
        coreProperties: { expectedValue, value },
      } as never],
    };
    const result = mutateExistingAreaObjectsInGitGic(input);
    const repeated = mutateExistingAreaObjectsInGitGic(input);

    expect(parseRawGffDocument(result.gitBytes)).toEqual(expectedGit);
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts).toMatchObject({ trigger: 1 });
    expect(repeated.gitBytes).toEqual(result.gitBytes);
    expect(repeated.gicBytes).toEqual(result.gicBytes);
  });

  it.each([
    [
      "wrong type",
      (fields: SupportedGffField[]) => fields.map((field) => field.label === "Cursor"
        ? { label: "Cursor", type: "word" as const, value: 0 }
        : field),
      triggerCoreProperties(),
      "trigger:index=0:Cursor:count=1:type=word",
    ],
    [
      "duplicate",
      (fields: SupportedGffField[]) => [
        ...fields,
        { label: "PortraitId", type: "word" as const, value: 0 },
      ],
      triggerCoreProperties(),
      "trigger:index=0:PortraitId:count=2:type=word",
    ],
    [
      "stale expected value",
      (fields: SupportedGffField[]) => fields,
      { ...triggerCoreProperties(), factionId: 42 },
      "trigger:index=0:coreProperties:stale_storage",
    ],
  ])("rejects a retained Trigger core-properties mutation with %s", (
    _label,
    mutateFields,
    expectedValue,
    diagnostic,
  ) => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const trigger = list(source, "TriggerList")!.value[0]!;
    trigger.fields.splice(1, 0, ...triggerCorePropertyFields());
    trigger.fields = mutateFields(trigger.fields);
    const sourceGit = buildGffBuffer(source.fields, "GIT ", source.rootStructTypeId);

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "trigger",
        sourceIndex: 0,
        coreProperties: {
          expectedValue,
          value: { ...triggerCoreProperties(), autoRemoveKey: 1 },
        },
      } as never],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [diagnostic],
    });
  });

  it("replaces one complete retained Trigger trap-properties tuple in place and preserves every sibling and GIC byte", () => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const sourceEntry = list(source, "TriggerList")!.value[0]!;
    sourceEntry.fields.splice(1, 0, ...triggerTrapPropertyFields());
    const sourceGit = buildGffBuffer(source.fields, "GIT ", source.rootStructTypeId);
    const expectedGit = parseRawGffDocument(sourceGit)!;
    const expectedEntry = list(expectedGit, "TriggerList")!.value[0]!;
    const expectedValue = triggerTrapProperties();
    const value = {
      trapDetectable: 0,
      trapDetectDc: 17,
      trapDisarmable: 0,
      disarmDc: 23,
      trapFlag: 1,
      trapOneShot: 0,
      trapType: 7,
    };
    const replacements = new Map<string, number>([
      ["TrapDetectable", value.trapDetectable],
      ["TrapDetectDC", value.trapDetectDc],
      ["TrapDisarmable", value.trapDisarmable],
      ["DisarmDC", value.disarmDc],
      ["TrapFlag", value.trapFlag],
      ["TrapOneShot", value.trapOneShot],
      ["TrapType", value.trapType],
    ]);
    expectedEntry.fields = expectedEntry.fields.map((field) => replacements.has(field.label)
      ? { ...field, value: replacements.get(field.label)! } as SupportedGffField
      : field);

    const input = {
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "trigger",
        sourceIndex: 0,
        trapProperties: { expectedValue, value },
      } as never],
    };
    const result = mutateExistingAreaObjectsInGitGic(input);
    const repeated = mutateExistingAreaObjectsInGitGic(input);

    expect(parseRawGffDocument(result.gitBytes)).toEqual(expectedGit);
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts).toMatchObject({ trigger: 1 });
    expect(repeated.gitBytes).toEqual(result.gitBytes);
    expect(repeated.gicBytes).toEqual(result.gicBytes);
  });

  it.each([
    [
      "wrong type",
      (fields: SupportedGffField[]) => fields.map((field) => field.label === "TrapType"
        ? { label: "TrapType", type: "word" as const, value: 0 }
        : field),
      triggerTrapProperties(),
      "trigger:index=0:TrapType:count=1:type=word",
    ],
    [
      "duplicate",
      (fields: SupportedGffField[]) => [
        ...fields,
        { label: "TrapFlag", type: "byte" as const, value: 0 },
      ],
      triggerTrapProperties(),
      "trigger:index=0:TrapFlag:count=2:type=byte",
    ],
    [
      "stale expected value",
      (fields: SupportedGffField[]) => fields,
      { ...triggerTrapProperties(), disarmDc: 42 },
      "trigger:index=0:trapProperties:stale_storage",
    ],
  ])("rejects a retained Trigger trap-properties mutation with %s", (
    _label,
    mutateFields,
    expectedValue,
    diagnostic,
  ) => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const trigger = list(source, "TriggerList")!.value[0]!;
    trigger.fields.splice(1, 0, ...triggerTrapPropertyFields());
    trigger.fields = mutateFields(trigger.fields);
    const sourceGit = buildGffBuffer(source.fields, "GIT ", source.rootStructTypeId);

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "trigger",
        sourceIndex: 0,
        trapProperties: {
          expectedValue,
          value: { ...triggerTrapProperties(), trapFlag: 1 },
        },
      } as never],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [diagnostic],
    });
  });

  it.each([
    [
      "wrong type",
      (fields: SupportedGffField[]) => fields.map((field) => field.label === "OnClick"
        ? { label: "OnClick", type: "cexostring" as const, value: "" }
        : field),
      triggerScriptValues(),
      "trigger:index=0:OnClick:count=1:type=cexostring",
    ],
    [
      "duplicate",
      (fields: SupportedGffField[]) => [
        ...fields,
        { label: "ScriptOnEnter", type: "resref" as const, value: "trg_enter" },
      ],
      triggerScriptValues(),
      "trigger:index=0:ScriptOnEnter:count=2:type=resref",
    ],
    [
      "stale expected value",
      (fields: SupportedGffField[]) => fields,
      { ...triggerScriptValues(), onExit: "stale" },
      "trigger:index=0:scripts:stale_storage",
    ],
  ])("rejects a retained Trigger script mutation with %s", (
    _label,
    mutateFields,
    expectedValue,
    diagnostic,
  ) => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const trigger = list(source, "TriggerList")!.value[0]!;
    trigger.fields = mutateFields(trigger.fields);
    const sourceGit = buildGffBuffer(source.fields, "GIT ", source.rootStructTypeId);

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "trigger",
        sourceIndex: 0,
        scripts: {
          expectedValue,
          value: { ...triggerScriptValues(), onClick: "trg_click" },
        },
      } as never],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [diagnostic],
    });
  });

  it("replaces only one exact retained Waypoint Tag and preserves every GIC byte", () => {
    const pair = fixturePair();
    const expectedGit = parseRawGffDocument(pair.git)!;
    const expectedEntry = list(expectedGit, "WaypointList")!.value[0]!;
    expectedEntry.fields = expectedEntry.fields.map((field) => field.label === "Tag"
      ? { label: "Tag", type: "cexostring" as const, value: "  AREA_DESTINATION  " }
      : field);

    const input = {
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "waypoint",
        sourceIndex: 0,
        tag: { expectedValue: "WAYPOINT_1", value: "  AREA_DESTINATION  " },
      } as never],
    };
    const result = mutateExistingAreaObjectsInGitGic(input);
    const repeated = mutateExistingAreaObjectsInGitGic(input);

    expect(result.gitBytes).not.toEqual(pair.git);
    expect(parseRawGffDocument(result.gitBytes)).toEqual(expectedGit);
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts).toMatchObject({ waypoint: 1 });
    expect(repeated.gitBytes).toEqual(result.gitBytes);
    expect(repeated.gicBytes).toEqual(result.gicBytes);
  });

  it("replaces only one exact retained Waypoint TemplateResRef and preserves identity siblings and every GIC byte", () => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const sourceEntry = list(source, "WaypointList")!.value[0]!;
    sourceEntry.fields.splice(1, 0, {
      label: "TemplateResRef",
      type: "resref",
      value: "nw_waypoint001",
    });
    const sourceGit = buildGffBuffer(source.fields, "GIT ", source.rootStructTypeId);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "waypoint",
        sourceIndex: 0,
        templateResRef: {
          expectedResRef: "nw_waypoint001",
          resRef: "custom_waypoint",
        },
      } as never],
    });

    const candidate = list(
      parseRawGffDocument(result.gitBytes),
      "WaypointList",
    )!.value[0]!;
    expect(candidate.fields).toEqual(sourceEntry.fields.map((field) =>
      field.label === "TemplateResRef"
        ? { label: "TemplateResRef", type: "resref", value: "custom_waypoint" }
        : field
    ));
    expect(candidate.fields.find((field) => field.label === "Tag")?.value)
      .toBe("WAYPOINT_1");
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts).toMatchObject({ waypoint: 1 });
  });

  it.each([
    [
      "wrong type",
      (fields: SupportedGffField[]) => fields.map((field) =>
        field.label === "TemplateResRef"
          ? { label: "TemplateResRef", type: "cexostring" as const, value: "nw_waypoint001" }
          : field
      ),
      "nw_waypoint001",
      "waypoint:index=0:TemplateResRef:count=1:type=cexostring",
    ],
    [
      "duplicate",
      (fields: SupportedGffField[]) => [
        ...fields,
        { label: "TemplateResRef", type: "resref" as const, value: "nw_waypoint001" },
      ],
      "nw_waypoint001",
      "waypoint:index=0:TemplateResRef:count=2:type=resref",
    ],
    [
      "stale expected value",
      (fields: SupportedGffField[]) => fields,
      "stale_waypoint",
      "waypoint:index=0:TemplateResRef:expected=stale_waypoint:actual=nw_waypoint001",
    ],
  ])("rejects a retained Waypoint TemplateResRef mutation with %s", (
    _label,
    mutateFields,
    expectedResRef,
    diagnostic,
  ) => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const waypoint = list(source, "WaypointList")!.value[0]!;
    waypoint.fields = mutateFields([
      { label: "TemplateResRef", type: "resref", value: "nw_waypoint001" },
      ...waypoint.fields,
    ]);
    const sourceGit = buildGffBuffer(source.fields, "GIT ", source.rootStructTypeId);

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "waypoint",
        sourceIndex: 0,
        templateResRef: { expectedResRef, resRef: "custom_waypoint" },
      } as never],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [diagnostic],
    });
  });

  it("replaces exact retained Waypoint LocalizedName beside Tag without sibling drift", () => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const sourceEntry = list(source, "WaypointList")!.value[0]!;
    sourceEntry.fields.splice(2, 0, {
      label: "LocalizedName",
      type: "cexolocstring",
      value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: "Patrol Point" }],
      },
    });
    const sourceGit = buildGffBuffer(source.fields, "GIT ", source.rootStructTypeId);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "waypoint",
        sourceIndex: 0,
        tag: { expectedValue: "WAYPOINT_1", value: "NORTH_PATROL" },
        localizedName: {
          expectedValue: "Patrol Point",
          value: " North Patrol Point ",
        },
      } as never],
    });

    const candidate = list(
      parseRawGffDocument(result.gitBytes),
      "WaypointList",
    )!.value[0]!;
    expect(candidate.fields).toEqual(sourceEntry.fields.map((field) => {
      if (field.label === "Tag") {
        return { label: "Tag", type: "cexostring", value: "NORTH_PATROL" };
      }
      if (field.label === "LocalizedName") {
        return {
          label: "LocalizedName",
          type: "cexolocstring",
          value: {
            strRef: 0xffff_ffff,
            entries: [{ languageId: 0, text: " North Patrol Point " }],
          },
        };
      }
      return field;
    }));
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts).toMatchObject({ waypoint: 1 });
  });

  it("replaces exact retained Waypoint Description beside Tag and LocalizedName without sibling drift", () => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const sourceEntry = list(source, "WaypointList")!.value[0]!;
    sourceEntry.fields.splice(2, 0,
      {
        label: "LocalizedName",
        type: "cexolocstring",
        value: {
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, text: "Patrol Point" }],
        },
      },
      {
        label: "Description",
        type: "cexolocstring",
        value: {
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, text: "Patrol route" }],
        },
      },
    );
    const sourceGit = buildGffBuffer(source.fields, "GIT ", source.rootStructTypeId);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "waypoint",
        sourceIndex: 0,
        tag: { expectedValue: "WAYPOINT_1", value: "NORTH_PATROL" },
        localizedName: {
          expectedValue: "Patrol Point",
          value: " North Patrol Point ",
        },
        description: {
          expectedValue: "Patrol route",
          value: "Northern patrol route",
        },
      } as never],
    });

    const candidate = list(
      parseRawGffDocument(result.gitBytes),
      "WaypointList",
    )!.value[0]!;
    expect(candidate.fields).toEqual(sourceEntry.fields.map((field) => {
      if (field.label === "Tag") {
        return { label: "Tag", type: "cexostring", value: "NORTH_PATROL" };
      }
      if (field.label === "LocalizedName") {
        return {
          label: "LocalizedName",
          type: "cexolocstring",
          value: {
            strRef: 0xffff_ffff,
            entries: [{ languageId: 0, text: " North Patrol Point " }],
          },
        };
      }
      if (field.label === "Description") {
        return {
          label: "Description",
          type: "cexolocstring",
          value: {
            strRef: 0xffff_ffff,
            entries: [{ languageId: 0, text: "Northern patrol route" }],
          },
        };
      }
      return field;
    }));
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts).toMatchObject({ waypoint: 1 });
  });

  it("replaces only one exact paired-GIC Waypoint Comment and preserves every GIT byte", () => {
    const pair = fixturePair();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "waypoint",
        sourceIndex: 0,
        editorComment: {
          expectedValue: "waypoint-comment-1",
          value: "  updated waypoint note  ",
        },
      } as never],
    });

    expect(result.gitBytes).toEqual(pair.git);
    expect(result.gicBytes).not.toEqual(pair.gic);
    expect(list(parseRawGffDocument(result.gicBytes), "WaypointList")!.value[0]!.fields)
      .toEqual([{
        label: "Comment",
        type: "cexostring",
        value: "  updated waypoint note  ",
      }]);
    expect(result.propertyUpdatedCounts).toMatchObject({ waypoint: 1 });
  });

  it("composes retained Waypoint Tag CAS with its exact transform", () => {
    const pair = fixturePair();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{
        kind: "waypoint",
        sourceIndex: 0,
        x: 10,
        y: 20,
        z: 3,
        bearing: Math.PI / 2,
      }],
      propertyMutations: [{
        kind: "waypoint",
        sourceIndex: 0,
        tag: { expectedValue: "WAYPOINT_1", value: "DEST" },
      } as never],
    });

    const waypoint = list(parseRawGffDocument(result.gitBytes), "WaypointList")!.value[0]!;
    expect(waypoint.fields.find((field) => field.label === "Tag")?.value).toBe("DEST");
    expect(waypoint.fields.find((field) => field.label === "XPosition")?.value)
      .toBe(Math.fround(100));
    expect(result.gicBytes).toEqual(pair.gic);
  });

  it.each([
    [
      "wrong type",
      (fields: SupportedGffField[]) => fields.map((field) => field.label === "Tag"
        ? { label: "Tag", type: "resref" as const, value: "waypoint_1" }
        : field),
      "WAYPOINT_1",
      "waypoint:index=0:Tag:count=1:type=resref",
    ],
    [
      "duplicate",
      (fields: SupportedGffField[]) => [
        ...fields,
        { label: "Tag", type: "cexostring" as const, value: "WAYPOINT_1" },
      ],
      "WAYPOINT_1",
      "waypoint:index=0:Tag:count=2:type=cexostring",
    ],
    [
      "stale expected value",
      (fields: SupportedGffField[]) => fields,
      "STALE",
      "waypoint:index=0:Tag:expected=STALE:actual=WAYPOINT_1",
    ],
  ])("rejects a retained Waypoint Tag mutation with %s", (
    _label,
    mutateFields,
    expectedValue,
    diagnostic,
  ) => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const waypoint = list(source, "WaypointList")!.value[0]!;
    waypoint.fields = mutateFields(waypoint.fields);
    const sourceGit = buildGffBuffer(source.fields, "GIT ", source.rootStructTypeId);

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "waypoint",
        sourceIndex: 0,
        tag: { expectedValue, value: "DEST" },
      } as never],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [diagnostic],
    });
  });

  it("replaces only one exact retained Encounter Tag in place and preserves every GIC byte", () => {
    const pair = fixturePair();
    const expectedGit = parseRawGffDocument(pair.git)!;
    const expectedEntry = list(expectedGit, "Encounter List")!.value[0]!;
    expectedEntry.fields = expectedEntry.fields.map((field) => field.label === "Tag"
      ? { label: "Tag", type: "cexostring" as const, value: "  GNOLL_AMBUSH  " }
      : field);

    const input = {
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "encounter",
        sourceIndex: 0,
        tag: { expectedValue: "ENCOUNTER_1", value: "  GNOLL_AMBUSH  " },
      } as never],
    };
    const result = mutateExistingAreaObjectsInGitGic(input);
    const repeated = mutateExistingAreaObjectsInGitGic(input);

    expect(result.gitBytes).not.toEqual(pair.git);
    expect(parseRawGffDocument(result.gitBytes)).toEqual(expectedGit);
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts).toMatchObject({ encounter: 1 });
    expect(repeated.gitBytes).toEqual(result.gitBytes);
    expect(repeated.gicBytes).toEqual(result.gicBytes);
  });

  it("replaces only one exact retained Encounter TemplateResRef and preserves identity siblings and every GIC byte", () => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const sourceEntry = list(source, "Encounter List")!.value[0]!;
    sourceEntry.fields.splice(1, 0, {
      label: "TemplateResRef",
      type: "resref",
      value: "x2_gnoll001",
    });
    const sourceGit = buildGffBuffer(source.fields, "GIT ", source.rootStructTypeId);

    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "encounter",
        sourceIndex: 0,
        templateResRef: {
          expectedResRef: "x2_gnoll001",
          resRef: "custom_encounter",
        },
      } as never],
    });

    const candidate = list(
      parseRawGffDocument(result.gitBytes),
      "Encounter List",
    )!.value[0]!;
    expect(candidate.fields).toEqual(sourceEntry.fields.map((field) =>
      field.label === "TemplateResRef"
        ? { label: "TemplateResRef", type: "resref", value: "custom_encounter" }
        : field
    ));
    expect(candidate.fields.find((field) => field.label === "Tag")?.value)
      .toBe("ENCOUNTER_1");
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts).toMatchObject({ encounter: 1 });
  });

  it.each([
    [
      "missing field",
      (fields: SupportedGffField[]) => fields.filter(
        (field) => field.label !== "TemplateResRef",
      ),
      "x2_gnoll001",
      "encounter:index=0:TemplateResRef:count=0:type=missing",
    ],
    [
      "duplicate field",
      (fields: SupportedGffField[]) => [
        ...fields,
        { label: "TemplateResRef", type: "resref" as const, value: "duplicate" },
      ],
      "x2_gnoll001",
      "encounter:index=0:TemplateResRef:count=2:type=resref",
    ],
    [
      "wrong native type",
      (fields: SupportedGffField[]) => fields.map((field) => field.label === "TemplateResRef"
        ? { label: "TemplateResRef", type: "cexostring" as const, value: "x2_gnoll001" }
        : field),
      "x2_gnoll001",
      "encounter:index=0:TemplateResRef:count=1:type=cexostring",
    ],
    [
      "stale expected value",
      (fields: SupportedGffField[]) => fields,
      "stale_encounter",
      "encounter:index=0:TemplateResRef:expected=stale_encounter:actual=x2_gnoll001",
    ],
  ])("rejects a retained Encounter TemplateResRef mutation with %s", (
    _label,
    mutateFields,
    expectedResRef,
    diagnostic,
  ) => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const encounter = list(source, "Encounter List")!.value[0]!;
    encounter.fields.splice(1, 0, {
      label: "TemplateResRef",
      type: "resref",
      value: "x2_gnoll001",
    });
    encounter.fields = mutateFields(encounter.fields);
    const sourceGit = buildGffBuffer(source.fields, "GIT ", source.rootStructTypeId);

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "encounter",
        sourceIndex: 0,
        templateResRef: { expectedResRef, resRef: "custom_encounter" },
      } as never],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [diagnostic],
    });
  });

  it("replaces only one exact paired-GIC Encounter Comment and preserves every GIT byte", () => {
    const pair = fixturePair();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "encounter",
        sourceIndex: 0,
        editorComment: {
          expectedValue: "encounter-comment-1",
          value: "  updated encounter  ",
        },
      }],
    });

    expect(result.gitBytes).toEqual(pair.git);
    expect(result.gicBytes).not.toEqual(pair.gic);
    expect(list(parseRawGffDocument(result.gicBytes), "Encounter List")!.value[0]!.fields)
      .toEqual([{ label: "Comment", type: "cexostring", value: "  updated encounter  " }]);
    expect(result.propertyUpdatedCounts).toMatchObject({ encounter: 1 });
  });

  it("creates one exact ordered Encounter VarTable without sibling or GIC drift", () => {
    const pair = fixturePair();
    const expectedGit = parseRawGffDocument(pair.git)!;
    const expectedEntry = list(expectedGit, "Encounter List")!.value[0]!;
    expectedEntry.fields.push({
      label: "VarTable",
      type: "list",
      value: [
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "Counter" },
          { label: "Type", type: "dword", value: 1 },
          { label: "Value", type: "int", value: 7 },
        ] },
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "Counter" },
          { label: "Type", type: "dword", value: 3 },
          { label: "Value", type: "cexostring", value: " exact " },
        ] },
      ],
    });
    const input = {
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "encounter" as const,
        sourceIndex: 0,
        variables: {
          expectedEntries: [],
          entries: [
            { name: "Counter", type: "int" as const, value: 7 },
            { name: "Counter", type: "string" as const, value: " exact " },
          ],
        },
      }],
    };

    const result = mutateExistingAreaObjectsInGitGic(input);
    expect(parseRawGffDocument(result.gitBytes)).toEqual(expectedGit);
    expect(result.gicBytes).toEqual(pair.gic);
    expect(mutateExistingAreaObjectsInGitGic(input).gitBytes).toEqual(result.gitBytes);
  });

  it("replaces only one exact nested Encounter CreatureList SingleSpawn byte", () => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const encounter = list(source, "Encounter List")!.value[0]!;
    const creatureList = list(encounter, "CreatureList")!;
    const expectedGit = structuredClone(source);
    const expectedList = list(
      list(expectedGit, "Encounter List")!.value[0]!,
      "CreatureList",
    )!;
    expectedList.value[0]!.fields[3] = {
      label: "SingleSpawn", type: "byte", value: 1,
    };
    const expectedEntries = creatureList.value.map((entry, sourceIndex) => ({
      sourceIndex,
      appearance: Number(entry.fields[0]!.value),
      challengeRating: Number(entry.fields[1]!.value),
      resRef: String(entry.fields[2]!.value),
      singleSpawnByte: Number(entry.fields[3]!.value) as 0 | 1,
    }));

    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "encounter",
        sourceIndex: 0,
        creatureList: {
          expectedEntries,
          entries: [
            { ...expectedEntries[0]!, singleSpawnByte: 1 },
            expectedEntries[1]!,
          ],
        },
      }],
    });

    expect(parseRawGffDocument(result.gitBytes)).toEqual(expectedGit);
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts).toMatchObject({ encounter: 1 });
  });

  it("canonically replaces the complete Encounter CreatureList structure", () => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const encounter = list(source, "Encounter List")!.value[0]!;
    const creatureList = list(encounter, "CreatureList")!;
    const expectedEntries = creatureList.value.map((entry, sourceIndex) => ({
      sourceIndex,
      appearance: Number(entry.fields[0]!.value),
      challengeRating: Number(entry.fields[1]!.value),
      resRef: String(entry.fields[2]!.value),
      singleSpawnByte: Number(entry.fields[3]!.value) as 0 | 1,
    }));

    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "encounter",
        sourceIndex: 0,
        creatureList: {
          expectedEntries,
          entries: [
            { ...expectedEntries[1]!, sourceIndex: 0, singleSpawnByte: 0 },
            {
              sourceIndex: 1,
              appearance: 225,
              challengeRating: Math.fround(2.5),
              resRef: "nw_wolf001",
              singleSpawnByte: 1,
            },
          ],
        },
      }],
    });

    const candidate = parseRawGffDocument(result.gitBytes)!;
    expect(list(list(candidate, "Encounter List")!.value[0]!, "CreatureList"))
      .toEqual({
        label: "CreatureList",
        type: "list",
        value: [
          { typeId: 0, fields: [
            { label: "Appearance", type: "int", value: 389 },
            { label: "CR", type: "float", value: 3 },
            { label: "ResRef", type: "resref", value: "nw_gnoll002" },
            { label: "SingleSpawn", type: "byte", value: 0 },
          ] },
          { typeId: 0, fields: [
            { label: "Appearance", type: "int", value: 225 },
            { label: "CR", type: "float", value: 2.5 },
            { label: "ResRef", type: "resref", value: "nw_wolf001" },
            { label: "SingleSpawn", type: "byte", value: 1 },
          ] },
        ],
      });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts).toMatchObject({ encounter: 1 });
  });

  it("canonically adds, reorders, edits, and removes Encounter SpawnPointList entries", () => {
    const pair = fixturePair();
    const firstEntries = [
      { nativeX: 22.5, nativeY: 45.25, nativeZ: 0, orientation: 1.5 },
      { nativeX: -3.75, nativeY: 9.5, nativeZ: 0.125, orientation: -2.25 },
    ];
    const added = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "encounter",
        sourceIndex: 0,
        spawnPoints: { expectedEntries: [], entries: firstEntries },
      }],
    });
    const addedList = list(
      list(parseRawGffDocument(added.gitBytes), "Encounter List")!.value[0]!,
      "SpawnPointList",
    )!;
    expect(addedList).toEqual({
      label: "SpawnPointList",
      type: "list",
      value: [
        { typeId: 2, fields: [
          { label: "X", type: "float", value: 22.5 },
          { label: "Y", type: "float", value: 45.25 },
          { label: "Z", type: "float", value: 0 },
          { label: "Orientation", type: "float", value: 1.5 },
        ] },
        { typeId: 2, fields: [
          { label: "X", type: "float", value: -3.75 },
          { label: "Y", type: "float", value: 9.5 },
          { label: "Z", type: "float", value: 0.125 },
          { label: "Orientation", type: "float", value: -2.25 },
        ] },
      ],
    });
    expect(added.gicBytes).toEqual(pair.gic);

    const expectedEntries = firstEntries.map((entry, sourceIndex) => ({
      sourceIndex,
      ...entry,
    }));
    const finalEntries = [
      { ...firstEntries[1]!, orientation: Math.fround(2.5) },
    ];
    const reduced = mutateExistingAreaObjectsInGitGic({
      sourceGit: added.gitBytes,
      sourceGic: added.gicBytes,
      deletions: [],
      propertyMutations: [{
        kind: "encounter",
        sourceIndex: 0,
        spawnPoints: { expectedEntries, entries: finalEntries },
      }],
    });
    const reducedList = list(
      list(parseRawGffDocument(reduced.gitBytes), "Encounter List")!.value[0]!,
      "SpawnPointList",
    )!;
    expect(reducedList.value).toEqual([{ typeId: 2, fields: [
      { label: "X", type: "float", value: -3.75 },
      { label: "Y", type: "float", value: 9.5 },
      { label: "Z", type: "float", value: 0.125 },
      { label: "Orientation", type: "float", value: 2.5 },
    ] }]);
    expect(reduced.gicBytes).toEqual(pair.gic);
    expect(reduced.propertyUpdatedCounts).toMatchObject({ encounter: 1 });
  });

  it("rejects stale Encounter SpawnPointList provenance before writing", () => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "encounter",
        sourceIndex: 0,
        spawnPoints: {
          expectedEntries: [{
            sourceIndex: 0,
            nativeX: 22.5,
            nativeY: 45.25,
            nativeZ: 0,
            orientation: 1.5,
          }],
          entries: [],
        },
      }],
    }))).toMatchObject({
      diagnostics: ["encounter:index=0:SpawnPointList:stale"],
    });
  });

  it("replaces exact retained Encounter LocalizedName, properties, scripts, Faction, and Difficulty without sibling drift", () => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const sourceEntry = list(source, "Encounter List")!.value[0]!;

    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "encounter",
        sourceIndex: 0,
        localizedName: {
          expectedValue: "Gnoll Ambush",
          value: " Night Ambush ",
        },
        tag: { expectedValue: "ENCOUNTER_1", value: "GNOLL_AMBUSH" },
        active: {
          expectedValue: { activeByte: 1 },
          value: { activeByte: 0 },
        },
        playerOnly: {
          expectedValue: { playerOnlyByte: 1 },
          value: { playerOnlyByte: 0 },
        },
        reset: {
          expectedValue: { resetByte: 0 },
          value: { resetByte: 1 },
        },
        resetTime: {
          expectedValue: { resetTime: 60 },
          value: { resetTime: 90 },
        },
        spawnOption: {
          expectedValue: { spawnOption: 1 },
          value: { spawnOption: 0 },
        },
        respawns: {
          expectedValue: { respawns: 0 },
          value: { respawns: -1 },
        },
        creatureCounts: {
          expectedValue: { maxCreatures: 4, recCreatures: 2 },
          value: { maxCreatures: 3, recCreatures: 3 },
        },
        scripts: {
          expectedValue: {
            onEntered: "enc_enter",
            onExit: "enc_exit",
            onExhausted: "",
            onHeartbeat: "enc_heartbeat",
            onUserDefined: "enc_user",
          },
          value: {
            onEntered: "new_enter",
            onExit: "new_exit",
            onExhausted: "new_exhausted",
            onHeartbeat: "new_heartbeat",
            onUserDefined: "new_user",
          },
        },
        faction: {
          expectedValue: 1,
          value: 4,
          catalogSha256: "f".repeat(64),
          catalogFactionCount: 5,
        },
        difficulty: {
          expectedValue: { difficulty: 1, difficultyIndex: 2 },
          value: { difficulty: 3, difficultyIndex: 4 },
          catalogSha256: "d".repeat(64),
          catalogRowCount: 5,
        },
      }],
    });

    const candidate = list(parseRawGffDocument(result.gitBytes), "Encounter List")!.value[0]!;
    expect(candidate.fields).toEqual(sourceEntry.fields.map((field) => {
      if (field.label === "LocalizedName") {
        return {
          label: "LocalizedName",
          type: "cexolocstring",
          value: {
            strRef: 0xffff_ffff,
            entries: [{ languageId: 0, text: " Night Ambush " }],
          },
        };
      }
      if (field.label === "Tag") {
        return { label: "Tag", type: "cexostring", value: "GNOLL_AMBUSH" };
      }
      if (field.label === "Active") {
        return { label: "Active", type: "byte", value: 0 };
      }
      if (field.label === "PlayerOnly") {
        return { label: "PlayerOnly", type: "byte", value: 0 };
      }
      if (field.label === "Reset") {
        return { label: "Reset", type: "byte", value: 1 };
      }
      if (field.label === "ResetTime") {
        return { label: "ResetTime", type: "int", value: 90 };
      }
      if (field.label === "SpawnOption") {
        return { label: "SpawnOption", type: "int", value: 0 };
      }
      if (field.label === "Respawns") {
        return { label: "Respawns", type: "int", value: -1 };
      }
      if (field.label === "MaxCreatures") {
        return { label: "MaxCreatures", type: "int", value: 3 };
      }
      if (field.label === "RecCreatures") {
        return { label: "RecCreatures", type: "int", value: 3 };
      }
      const scriptValues: Record<string, string> = {
        OnEntered: "new_enter",
        OnExit: "new_exit",
        OnExhausted: "new_exhausted",
        OnHeartbeat: "new_heartbeat",
        OnUserDefined: "new_user",
      };
      if (Object.prototype.hasOwnProperty.call(scriptValues, field.label)) {
        return { label: field.label, type: "resref", value: scriptValues[field.label] };
      }
      if (field.label === "Faction") {
        return { label: "Faction", type: "dword", value: 4 };
      }
      if (field.label === "Difficulty") {
        return { label: "Difficulty", type: "int", value: 3 };
      }
      if (field.label === "DifficultyIndex") {
        return { label: "DifficultyIndex", type: "int", value: 4 };
      }
      return field;
    }));
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts).toMatchObject({ encounter: 1 });
  });

  it.each([
    ["stale", [{ label: "Faction", type: "dword", value: 1 }], 2,
      "encounter:index=0:Faction:stale"],
    ["wrong type", [{ label: "Faction", type: "word", value: 1 }], 1,
      "encounter:index=0:Faction:count=1:label=Faction:type=word"],
    ["duplicate", [
      { label: "Faction", type: "dword", value: 1 },
      { label: "Faction", type: "dword", value: 1 },
    ], 1, "encounter:index=0:Faction:count=2:label=Faction:type=dword"],
  ] as const)("rejects retained Encounter Faction with %s source", (
    _label,
    replacements,
    expectedValue,
    diagnostic,
  ) => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const encounter = list(source, "Encounter List")!.value[0]!;
    encounter.fields = [
      ...encounter.fields.filter((field) => field.label !== "Faction"),
      ...(replacements as SupportedGffField[]),
    ];

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(source.fields, "GIT ", source.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "encounter",
        sourceIndex: 0,
        faction: {
          expectedValue,
          value: 4,
          catalogSha256: "f".repeat(64),
          catalogFactionCount: 5,
        },
      } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["stale", [
      { label: "Difficulty", type: "int", value: 1 },
      { label: "DifficultyIndex", type: "int", value: 2 },
    ], { difficulty: 0, difficultyIndex: 2 },
    "encounter:index=0:Difficulty+DifficultyIndex:stale"],
    ["wrong type", [
      { label: "Difficulty", type: "word", value: 1 },
      { label: "DifficultyIndex", type: "int", value: 2 },
    ], { difficulty: 1, difficultyIndex: 2 },
    "encounter:index=0:Difficulty:count=1:label=Difficulty:type=word"],
    ["duplicate", [
      { label: "Difficulty", type: "int", value: 1 },
      { label: "Difficulty", type: "int", value: 1 },
      { label: "DifficultyIndex", type: "int", value: 2 },
    ], { difficulty: 1, difficultyIndex: 2 },
    "encounter:index=0:Difficulty:count=2:label=Difficulty:type=int"],
  ] as const)("rejects retained Encounter Difficulty with %s source", (
    _label,
    replacements,
    expectedValue,
    diagnostic,
  ) => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const encounter = list(source, "Encounter List")!.value[0]!;
    encounter.fields = [
      ...encounter.fields.filter((field) =>
        field.label !== "Difficulty" && field.label !== "DifficultyIndex"),
      ...(replacements as SupportedGffField[]),
    ];

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(source.fields, "GIT ", source.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "encounter",
        sourceIndex: 0,
        difficulty: {
          expectedValue,
          value: { difficulty: 3, difficultyIndex: 4 },
          catalogSha256: "d".repeat(64),
          catalogRowCount: 5,
        },
      } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["stale", [{ label: "Active", type: "byte", value: 1 }], { activeByte: 0 },
      "encounter:index=0:Active:stale"],
    ["wrong type", [{ label: "Active", type: "word", value: 1 }], { activeByte: 1 },
      "encounter:index=0:Active:count=1:label=Active:type=word"],
    ["duplicate", [
      { label: "Active", type: "byte", value: 1 },
      { label: "Active", type: "byte", value: 1 },
    ], { activeByte: 1 }, "encounter:index=0:Active:count=2:label=Active:type=byte"],
  ] as const)("rejects retained Encounter Active with %s source", (
    _label,
    replacements,
    expectedValue,
    diagnostic,
  ) => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const encounter = list(source, "Encounter List")!.value[0]!;
    encounter.fields = [
      ...encounter.fields.filter((field) => field.label !== "Active"),
      ...(replacements as SupportedGffField[]),
    ];

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(source.fields, "GIT ", source.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "encounter",
        sourceIndex: 0,
        active: { expectedValue, value: { activeByte: expectedValue.activeByte === 1 ? 0 : 1 } },
      } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["stale", [{ label: "PlayerOnly", type: "byte", value: 1 }],
      { playerOnlyByte: 0 }, "encounter:index=0:PlayerOnly:stale"],
    ["wrong type", [{ label: "PlayerOnly", type: "word", value: 1 }],
      { playerOnlyByte: 1 },
      "encounter:index=0:PlayerOnly:count=1:label=PlayerOnly:type=word"],
    ["duplicate", [
      { label: "PlayerOnly", type: "byte", value: 1 },
      { label: "PlayerOnly", type: "byte", value: 1 },
    ], { playerOnlyByte: 1 },
    "encounter:index=0:PlayerOnly:count=2:label=PlayerOnly:type=byte"],
  ] as const)("rejects retained Encounter PlayerOnly with %s source", (
    _label,
    replacements,
    expectedValue,
    diagnostic,
  ) => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const encounter = list(source, "Encounter List")!.value[0]!;
    encounter.fields = [
      ...encounter.fields.filter((field) => field.label !== "PlayerOnly"),
      ...(replacements as SupportedGffField[]),
    ];

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(source.fields, "GIT ", source.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "encounter",
        sourceIndex: 0,
        playerOnly: {
          expectedValue,
          value: { playerOnlyByte: expectedValue.playerOnlyByte === 1 ? 0 : 1 },
        },
      } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["stale", [{ label: "Reset", type: "byte", value: 0 }],
      { resetByte: 1 }, "encounter:index=0:Reset:stale"],
    ["wrong type", [{ label: "Reset", type: "word", value: 0 }],
      { resetByte: 0 },
      "encounter:index=0:Reset:count=1:label=Reset:type=word"],
    ["duplicate", [
      { label: "Reset", type: "byte", value: 0 },
      { label: "Reset", type: "byte", value: 0 },
    ], { resetByte: 0 },
    "encounter:index=0:Reset:count=2:label=Reset:type=byte"],
  ] as const)("rejects retained Encounter Reset with %s source", (
    _label,
    replacements,
    expectedValue,
    diagnostic,
  ) => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const encounter = list(source, "Encounter List")!.value[0]!;
    encounter.fields = [
      ...encounter.fields.filter((field) => field.label !== "Reset"),
      ...(replacements as SupportedGffField[]),
    ];

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(source.fields, "GIT ", source.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "encounter",
        sourceIndex: 0,
        reset: {
          expectedValue,
          value: { resetByte: expectedValue.resetByte === 1 ? 0 : 1 },
        },
      } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["stale", [{ label: "ResetTime", type: "int", value: 60 }],
      { resetTime: 90 }, "encounter:index=0:ResetTime:stale"],
    ["wrong type", [{ label: "ResetTime", type: "dword", value: 60 }],
      { resetTime: 60 },
      "encounter:index=0:ResetTime:count=1:label=ResetTime:type=dword"],
    ["duplicate", [
      { label: "ResetTime", type: "int", value: 60 },
      { label: "ResetTime", type: "int", value: 60 },
    ], { resetTime: 60 },
    "encounter:index=0:ResetTime:count=2:label=ResetTime:type=int"],
    ["out of range", [{ label: "ResetTime", type: "int", value: 0 }],
      { resetTime: 60 }, "encounter:index=0:ResetTime:out_of_range"],
  ] as const)("rejects retained Encounter ResetTime with %s source", (
    _label,
    replacements,
    expectedValue,
    diagnostic,
  ) => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const encounter = list(source, "Encounter List")!.value[0]!;
    encounter.fields = [
      ...encounter.fields.filter((field) => field.label !== "ResetTime"),
      ...(replacements as SupportedGffField[]),
    ];

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(source.fields, "GIT ", source.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "encounter",
        sourceIndex: 0,
        resetTime: {
          expectedValue,
          value: { resetTime: expectedValue.resetTime === 60 ? 90 : 60 },
        },
      } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["stale", [{ label: "SpawnOption", type: "int", value: 1 }],
      { spawnOption: 0 }, "encounter:index=0:SpawnOption:stale"],
    ["wrong type", [{ label: "SpawnOption", type: "dword", value: 1 }],
      { spawnOption: 1 },
      "encounter:index=0:SpawnOption:count=1:label=SpawnOption:type=dword"],
    ["duplicate", [
      { label: "SpawnOption", type: "int", value: 1 },
      { label: "SpawnOption", type: "int", value: 1 },
    ], { spawnOption: 1 },
    "encounter:index=0:SpawnOption:count=2:label=SpawnOption:type=int"],
    ["noncanonical", [{ label: "SpawnOption", type: "int", value: 2 }],
      { spawnOption: 1 }, "encounter:index=0:SpawnOption:noncanonical"],
  ] as const)("rejects retained Encounter SpawnOption with %s source", (
    _label,
    replacements,
    expectedValue,
    diagnostic,
  ) => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const encounter = list(source, "Encounter List")!.value[0]!;
    encounter.fields = [
      ...encounter.fields.filter((field) => field.label !== "SpawnOption"),
      ...(replacements as SupportedGffField[]),
    ];

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(source.fields, "GIT ", source.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "encounter",
        sourceIndex: 0,
        spawnOption: {
          expectedValue,
          value: { spawnOption: expectedValue.spawnOption === 0 ? 1 : 0 },
        },
      } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    [
      "wrong type",
      (fields: SupportedGffField[]) => fields.map((field) => field.label === "Tag"
        ? { label: "Tag", type: "resref" as const, value: "encounter_1" }
        : field),
      "ENCOUNTER_1",
      "encounter:index=0:Tag:count=1:type=resref",
    ],
    [
      "duplicate",
      (fields: SupportedGffField[]) => [
        ...fields,
        { label: "Tag", type: "cexostring" as const, value: "ENCOUNTER_1" },
      ],
      "ENCOUNTER_1",
      "encounter:index=0:Tag:count=2:type=cexostring",
    ],
    [
      "stale expected value",
      (fields: SupportedGffField[]) => fields,
      "STALE",
      "encounter:index=0:Tag:expected=STALE:actual=ENCOUNTER_1",
    ],
  ])("rejects a retained Encounter Tag mutation with %s", (
    _label,
    mutateFields,
    expectedValue,
    diagnostic,
  ) => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const encounter = list(source, "Encounter List")!.value[0]!;
    encounter.fields = mutateFields(encounter.fields);
    const sourceGit = buildGffBuffer(source.fields, "GIT ", source.rootStructTypeId);

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "encounter",
        sourceIndex: 0,
        tag: { expectedValue, value: "GNOLL_AMBUSH" },
      } as never],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [diagnostic],
    });
  });

  it("replaces only one exact retained ground-item TemplateResRef in place", () => {
    const pair = fixturePair();
    const sourceDocument = parseRawGffDocument(pair.git)!;
    const sourceItem = list(sourceDocument, "List")!.value[1]!;
    sourceItem.fields.splice(0, 0, {
      label: "TemplateResRef",
      type: "resref",
      value: "item_2",
    });
    const sourceGit = buildGffBuffer(
      sourceDocument.fields,
      "GIT ",
      sourceDocument.rootStructTypeId,
    );
    const expectedGit = parseRawGffDocument(sourceGit)!;
    const expectedItem = list(expectedGit, "List")!.value[1]!;
    expectedItem.fields = expectedItem.fields.map((field) => field.label === "TemplateResRef"
      ? { label: "TemplateResRef", type: "resref" as const, value: "custom_item_2" }
      : field);
    const input = {
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "item",
        sourceIndex: 1,
        templateResRef: {
          expectedResRef: "item_2",
          resRef: "custom_item_2",
        },
      } as never],
    };

    const result = mutateExistingAreaObjectsInGitGic(input);
    const repeated = mutateExistingAreaObjectsInGitGic(input);

    expect(result.gitBytes).not.toEqual(sourceGit);
    expect(parseRawGffDocument(result.gitBytes)).toEqual(expectedGit);
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts).toMatchObject({ item: 1 });
    expect(repeated.gitBytes).toEqual(result.gitBytes);
    expect(repeated.gicBytes).toEqual(result.gicBytes);
  });

  it("replaces selected ground-item localized strings in place and preserves GIC", () => {
    const pair = fixturePair();
    const sourceDocument = parseRawGffDocument(pair.git)!;
    const sourceItem = list(sourceDocument, "List")!.value[1]!;
    sourceItem.fields.splice(1, 0,
      {
        label: "LocalizedName",
        type: "cexolocstring",
        value: { strRef: 0xffff_ffff, entries: [{ languageId: 0, text: "Sword" }] },
      },
      {
        label: "Description",
        type: "cexolocstring",
        value: { strRef: 0xffff_ffff, entries: [] },
      },
      {
        label: "DescIdentified",
        type: "cexolocstring",
        value: { strRef: 0xffff_ffff, entries: [{ languageId: 0, text: "Known" }] },
      },
    );
    const sourceGit = buildGffBuffer(
      sourceDocument.fields,
      "GIT ",
      sourceDocument.rootStructTypeId,
    );
    const input = {
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "item",
        sourceIndex: 1,
        localizedStrings: [
          { field: "LocalizedName", expectedValue: "Sword", value: " Sword 2 " },
          { field: "DescIdentified", expectedValue: "Known", value: "Known blade" },
        ],
      } as never],
    };

    const result = mutateExistingAreaObjectsInGitGic(input);
    const candidate = list(parseRawGffDocument(result.gitBytes), "List")!.value[1]!;

    expect(candidate.fields.find((field) => field.label === "LocalizedName")).toEqual({
      label: "LocalizedName",
      type: "cexolocstring",
      value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: " Sword 2 " }],
      },
    });
    expect(candidate.fields.find((field) => field.label === "Description")).toEqual({
      label: "Description",
      type: "cexolocstring",
      value: { strRef: 0xffff_ffff, entries: [] },
    });
    expect(candidate.fields.find((field) => field.label === "DescIdentified")).toEqual({
      label: "DescIdentified",
      type: "cexolocstring",
      value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: "Known blade" }],
      },
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.item).toBe(1);
    expect(mutateExistingAreaObjectsInGitGic(input).gitBytes).toEqual(result.gitBytes);
  });

  it("replaces a complete ordered ground-item localized-string entry list in place", () => {
    const pair = fixturePair();
    const sourceDocument = parseRawGffDocument(pair.git)!;
    const sourceItem = list(sourceDocument, "List")!.value[1]!;
    sourceItem.fields.splice(1, 0, {
      label: "LocalizedName",
      type: "cexolocstring",
      value: {
        strRef: 0xffff_ffff,
        entries: [
          { languageId: 42, text: "Legacy" },
          { languageId: 0, text: "Sword" },
        ],
      },
    });
    const sourceGit = buildGffBuffer(
      sourceDocument.fields,
      "GIT ",
      sourceDocument.rootStructTypeId,
    );
    const localizedStrings = [{
      field: "LocalizedName",
      expectedValue: "Sword",
      value: "Sword 2",
      expectedProfile: "multi_entry_inline_ascii",
      expectedEntries: [
        { languageId: 42, text: "Legacy" },
        { languageId: 0, text: "Sword" },
      ],
      valueEntries: [
        { languageId: 0, text: "Sword 2" },
        { languageId: 2, text: "Epee" },
        { languageId: 42, text: "Legacy 2" },
      ],
    }];
    const input = {
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "item",
        sourceIndex: 1,
        localizedStrings,
      } as never],
    };

    const result = mutateExistingAreaObjectsInGitGic(input);
    const candidate = list(parseRawGffDocument(result.gitBytes), "List")!.value[1]!;

    expect(candidate.fields.find((field) => field.label === "LocalizedName")).toEqual({
      label: "LocalizedName",
      type: "cexolocstring",
      value: {
        strRef: 0xffff_ffff,
        entries: [
          { languageId: 0, text: "Sword 2" },
          { languageId: 2, text: "Epee" },
          { languageId: 42, text: "Legacy 2" },
        ],
      },
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(mutateExistingAreaObjectsInGitGic(input).gitBytes).toEqual(result.gitBytes);
  });

  it("replaces the exact ordered ground-item VarTable and preserves every GIC byte", () => {
    const pair = fixturePair();
    const sourceDocument = parseRawGffDocument(pair.git)!;
    const sourceItem = list(sourceDocument, "List")!.value[1]!;
    sourceItem.fields.push({
      label: "VarTable",
      type: "list",
      value: [
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "Counter" },
          { label: "Type", type: "dword", value: 1 },
          { label: "Value", type: "int", value: 1 },
        ] },
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "Label" },
          { label: "Type", type: "dword", value: 3 },
          { label: "Value", type: "cexostring", value: "before" },
        ] },
      ],
    });
    const sourceGit = buildGffBuffer(
      sourceDocument.fields,
      "GIT ",
      sourceDocument.rootStructTypeId,
    );
    const input = {
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "item",
        sourceIndex: 1,
        variables: {
          expectedEntries: [
            { sourceIndex: 0, name: "Counter", type: "int", value: 1 },
            { sourceIndex: 1, name: "Label", type: "string", value: "before" },
          ],
          entries: [
            { name: "Label", type: "string", value: "after" },
            { name: "Scale", type: "float", value: Math.fround(1.5) },
            { name: "Counter", type: "int", value: 2 },
          ],
        },
      } as never],
    };

    const result = mutateExistingAreaObjectsInGitGic(input);
    const candidate = list(parseRawGffDocument(result.gitBytes), "List")!.value[1]!;

    expect(candidate.fields.filter((field) => field.label === "VarTable")).toEqual([{
      label: "VarTable",
      type: "list",
      value: [
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "Label" },
          { label: "Type", type: "dword", value: 3 },
          { label: "Value", type: "cexostring", value: "after" },
        ] },
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "Scale" },
          { label: "Type", type: "dword", value: 2 },
          { label: "Value", type: "float", value: Math.fround(1.5) },
        ] },
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "Counter" },
          { label: "Type", type: "dword", value: 1 },
          { label: "Value", type: "int", value: 2 },
        ] },
      ],
    }]);
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.item).toBe(1);
    expect(mutateExistingAreaObjectsInGitGic(input).gitBytes).toEqual(result.gitBytes);
  });

  it("reorders retained ground-Item ItemList children, replaces repository Words, and preserves nested fields", () => {
    const pair = fixturePair();
    const sourceDocument = parseRawGffDocument(pair.git)!;
    const sourceItem = list(sourceDocument, "List")!.value[1]!;
    sourceItem.fields.splice(2, 0, {
      label: "ItemList",
      type: "list",
      value: [
        { typeId: 0, fields: [
          { label: "TemplateResRef", type: "resref", value: "nested_a" },
          { label: "Cost", type: "dword", value: 111 },
          { label: "Repos_PosX", type: "word", value: 1 },
          { label: "Repos_Posy", type: "word", value: 2 },
        ] },
        { typeId: 1, fields: [
          { label: "TemplateResRef", type: "resref", value: "nested_b" },
          { label: "Plot", type: "byte", value: 1 },
          { label: "Repos_PosX", type: "word", value: 3 },
          { label: "Repos_Posy", type: "word", value: 4 },
        ] },
      ],
    });
    const sourceGit = buildGffBuffer(
      sourceDocument.fields,
      "GIT ",
      sourceDocument.rootStructTypeId,
    );
    const input = {
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "item",
        sourceIndex: 1,
        inventory: {
          expectedEntries: [
            { sourceIndex: 0, resRef: "nested_a", x: 1, y: 2 },
            { sourceIndex: 1, resRef: "nested_b", x: 3, y: 4 },
          ],
          entries: [
            { sourceIndex: 1, resRef: "nested_b", x: 30, y: 40 },
            { sourceIndex: 0, resRef: "nested_a", x: 10, y: 20 },
          ],
        },
      } as never],
    };

    const result = mutateExistingAreaObjectsInGitGic(input);
    const candidateItem = list(parseRawGffDocument(result.gitBytes), "List")!.value[1]!;

    expect(candidateItem.fields.findIndex((field) => field.label === "ItemList")).toBe(2);
    expect(candidateItem.fields.filter((field) => field.label === "ItemList")).toEqual([{
      label: "ItemList",
      type: "list",
      value: [
        { typeId: 0, fields: [
          { label: "TemplateResRef", type: "resref", value: "nested_b" },
          { label: "Plot", type: "byte", value: 1 },
          { label: "Repos_PosX", type: "word", value: 30 },
          { label: "Repos_Posy", type: "word", value: 40 },
        ] },
        { typeId: 1, fields: [
          { label: "TemplateResRef", type: "resref", value: "nested_a" },
          { label: "Cost", type: "dword", value: 111 },
          { label: "Repos_PosX", type: "word", value: 10 },
          { label: "Repos_Posy", type: "word", value: 20 },
        ] },
      ],
    }]);
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.item).toBe(1);
    expect(mutateExistingAreaObjectsInGitGic(input).gitBytes).toEqual(result.gitBytes);
  });

  it("removes the canonical ground-Item ItemList for an empty retained target", () => {
    const pair = fixturePair();
    const sourceDocument = parseRawGffDocument(pair.git)!;
    const sourceItem = list(sourceDocument, "List")!.value[1]!;
    sourceItem.fields.push({
      label: "ItemList",
      type: "list",
      value: [{ typeId: 0, fields: [
        { label: "TemplateResRef", type: "resref", value: "nested_a" },
        { label: "Repos_PosX", type: "word", value: 1 },
        { label: "Repos_Posy", type: "word", value: 2 },
      ] }],
    });
    const sourceGit = buildGffBuffer(
      sourceDocument.fields,
      "GIT ",
      sourceDocument.rootStructTypeId,
    );

    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "item",
        sourceIndex: 1,
        inventory: {
          expectedEntries: [{ sourceIndex: 0, resRef: "nested_a", x: 1, y: 2 }],
          entries: [],
        },
      } as never],
    });

    expect(list(parseRawGffDocument(result.gitBytes), "List")!.value[1]!.fields
      .some((field) => field.label === "ItemList")).toBe(false);
    expect(result.gicBytes).toEqual(pair.gic);
  });

  it.each([
    ["mode flag", (fields: SupportedGffField[]) => [...fields, {
      label: "Dropable",
      type: "byte" as const,
      value: 1,
    }], "unsupported_mode_field=Dropable"],
    ["wrong coordinate type", (fields: SupportedGffField[]) => fields.map((field) =>
      field.label === "Repos_PosX"
        ? { label: "Repos_PosX", type: "dword" as const, value: 1 }
        : field), "Repos_PosX:count=1:type=dword"],
    ["coordinate alias", (fields: SupportedGffField[]) => fields.map((field) =>
      field.label === "Repos_PosX"
        ? { label: "ReposPosX", type: "word" as const, value: 1 }
        : field), "Repos_PosX:count=1:type=word"],
  ])("rejects a native ground-Item ItemList child with %s", (_label, transform, diagnostic) => {
    const pair = fixturePair();
    const sourceDocument = parseRawGffDocument(pair.git)!;
    const sourceItem = list(sourceDocument, "List")!.value[1]!;
    const fields: SupportedGffField[] = [
      { label: "TemplateResRef", type: "resref", value: "nested_a" },
      { label: "Repos_PosX", type: "word", value: 1 },
      { label: "Repos_Posy", type: "word", value: 2 },
    ];
    sourceItem.fields.push({
      label: "ItemList",
      type: "list",
      value: [{ typeId: 0, fields: transform(fields) }],
    });
    const sourceGit = buildGffBuffer(
      sourceDocument.fields,
      "GIT ",
      sourceDocument.rootStructTypeId,
    );

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "item",
        sourceIndex: 1,
        inventory: {
          expectedEntries: [{ sourceIndex: 0, resRef: "nested_a", x: 1, y: 2 }],
          entries: [],
        },
      } as never],
    }))).toMatchObject({
      diagnostics: [`item:index=1:ItemList:source=0:${diagnostic}`],
    });
  });

  it("creates one canonical static ground-Item VisTransformList from exact absence", () => {
    const pair = fixturePair();
    const sourceDocument = parseRawGffDocument(pair.git)!;
    const sourceItem = list(sourceDocument, "List")!.value[1]!;
    const sourceFieldCount = sourceItem.fields.length;
    const target = itemVisualTransformStorage();
    const input = {
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "item",
        sourceIndex: 1,
        visualTransform: {
          expectedValue: { present: false },
          value: target,
        },
      } as never],
    };

    const result = mutateExistingAreaObjectsInGitGic(input);
    const candidate = list(parseRawGffDocument(result.gitBytes), "List")!.value[1]!;

    expect(candidate.fields).toHaveLength(sourceFieldCount + 1);
    expect(candidate.fields.at(-1)).toEqual(itemVisualTransformField(target.value));
    expect(candidate.fields.slice(0, -1)).toEqual(sourceItem.fields);
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.item).toBe(1);
    expect(mutateExistingAreaObjectsInGitGic(input).gitBytes).toEqual(result.gitBytes);
  });

  it("replaces only static controller ValueTo floats and preserves VisTransformList order", () => {
    const pair = fixturePair();
    const sourceDocument = parseRawGffDocument(pair.git)!;
    const sourceItem = list(sourceDocument, "List")!.value[1]!;
    const source = itemVisualTransformStorage();
    const target = itemVisualTransformStorage({
      scaleX: 2,
      scaleY: 3,
      scaleZ: 4,
      rotateX: 45,
      rotateY: -90,
      rotateZ: 180,
      translateX: -125,
      translateY: 250,
      translateZ: 500,
    });
    sourceItem.fields.splice(1, 0, itemVisualTransformField(source.value));
    const sourceGit = buildGffBuffer(
      sourceDocument.fields,
      "GIT ",
      sourceDocument.rootStructTypeId,
    );

    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "item",
        sourceIndex: 1,
        visualTransform: { expectedValue: source, value: target },
      } as never],
    });
    const candidate = list(parseRawGffDocument(result.gitBytes), "List")!.value[1]!;

    expect(candidate.fields[1]).toEqual(itemVisualTransformField(target.value));
    expect(candidate.fields.filter((field) => field.label !== "VisTransformList"))
      .toEqual(sourceItem.fields.filter((field) => field.label !== "VisTransformList"));
    expect(result.gicBytes).toEqual(pair.gic);
  });

  it("removes only the canonical static ground-Item VisTransformList for the default target", () => {
    const pair = fixturePair();
    const sourceDocument = parseRawGffDocument(pair.git)!;
    const sourceItem = list(sourceDocument, "List")!.value[1]!;
    const source = itemVisualTransformStorage();
    sourceItem.fields.splice(1, 0, itemVisualTransformField(source.value));
    const sourceGit = buildGffBuffer(
      sourceDocument.fields,
      "GIT ",
      sourceDocument.rootStructTypeId,
    );

    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "item",
        sourceIndex: 1,
        visualTransform: {
          expectedValue: source,
          value: { present: false },
        },
      } as never],
    });
    const candidate = list(parseRawGffDocument(result.gitBytes), "List")!.value[1]!;

    expect(candidate.fields).toEqual(
      sourceItem.fields.filter((field) => field.label !== "VisTransformList"),
    );
    expect(result.gicBytes).toEqual(pair.gic);
  });

  it("rejects a case-insensitive ground-Item VisTransformList alias even when absence is expected", () => {
    const pair = fixturePair();
    const sourceDocument = parseRawGffDocument(pair.git)!;
    const sourceItem = list(sourceDocument, "List")!.value[1]!;
    const target = itemVisualTransformStorage();
    sourceItem.fields.push({
      ...itemVisualTransformField(target.value),
      label: "vistransformlist",
    });
    const sourceGit = buildGffBuffer(
      sourceDocument.fields,
      "GIT ",
      sourceDocument.rootStructTypeId,
    );

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "item",
        sourceIndex: 1,
        visualTransform: {
          expectedValue: { present: false },
          value: target,
        },
      } as never],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [
        "item:index=1:VisTransformList:count=1:label=vistransformlist:type=list",
      ],
    });
  });

  it("creates and removes an absent ground-item VarTable canonically", () => {
    const pair = fixturePair();
    const added = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "item", sourceIndex: 1,
        variables: {
          expectedEntries: [],
          entries: [{ name: "x", type: "int", value: 1 }],
        },
      } as never],
    });
    const removed = mutateExistingAreaObjectsInGitGic({
      sourceGit: added.gitBytes,
      sourceGic: added.gicBytes,
      deletions: [],
      propertyMutations: [{
        kind: "item", sourceIndex: 1,
        variables: {
          expectedEntries: [{ sourceIndex: 0, name: "x", type: "int", value: 1 }],
          entries: [],
        },
      } as never],
    });

    expect(list(parseRawGffDocument(removed.gitBytes), "List")!.value[1]!.fields
      .some((field) => field.label === "VarTable")).toBe(false);
    expect(removed.gicBytes).toEqual(pair.gic);
  });

  it("replaces one exact ground-item BaseItem and its complete Aurora appearance profile atomically", () => {
    const pair = fixturePair();
    const sourceDocument = parseRawGffDocument(pair.git)!;
    const sourceItem = list(sourceDocument, "List")!.value[1]!;
    const insertionIndex = 2;
    sourceItem.fields.splice(insertionIndex, 0,
      { label: "BaseItem", type: "int", value: 24 },
      { label: "ModelPart1", type: "word", value: 66 },
    );
    const sourceGit = buildGffBuffer(
      sourceDocument.fields,
      "GIT ",
      sourceDocument.rootStructTypeId,
    );
    const armorParts = Object.fromEntries(
      AREA_ITEM_ARMOR_PART_KEYS.map((key, index) => [key, index + 1]),
    );
    const materialColors = Object.fromEntries(
      AREA_ITEM_MATERIAL_COLOR_KEYS.map((key, index) => [key, index + 11]),
    );
    const input = {
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "item",
        sourceIndex: 1,
        baseAppearance: {
          expectedValue: {
            baseItem: 24,
            modelType: 0,
            appearance: { modelPart1: 66 },
          },
          value: {
            baseItem: 16,
            modelType: 3,
            appearance: { armorParts, materialColors },
          },
          tableSha256: "a".repeat(64),
          tableRowCount: 100,
        },
      } as never],
    };

    const result = mutateExistingAreaObjectsInGitGic(input);
    const candidateItem = list(parseRawGffDocument(result.gitBytes), "List")!.value[1]!;
    const expectedAppearanceFields: SupportedGffField[] = [
      ...[
        "ArmorPart_RFoot", "ArmorPart_LFoot", "ArmorPart_RShin", "ArmorPart_LShin",
        "ArmorPart_LThigh", "ArmorPart_RThigh", "ArmorPart_Pelvis", "ArmorPart_Torso",
        "ArmorPart_Belt", "ArmorPart_Neck", "ArmorPart_RFArm", "ArmorPart_LFArm",
        "ArmorPart_RBicep", "ArmorPart_LBicep", "ArmorPart_RShoul", "ArmorPart_LShoul",
        "ArmorPart_RHand", "ArmorPart_LHand", "ArmorPart_Robe",
      ].map((label, index) => ({ label, type: "word" as const, value: index + 1 })),
      ...[
        "Leather1Color", "Leather2Color", "Cloth1Color", "Cloth2Color",
        "Metal1Color", "Metal2Color",
      ].map((label, index) => ({ label, type: "byte" as const, value: index + 11 })),
    ];

    expect(candidateItem.fields.find((field) => field.label === "BaseItem")).toEqual({
      label: "BaseItem",
      type: "int",
      value: 16,
    });
    expect(candidateItem.fields.slice(insertionIndex + 1, insertionIndex + 1 + expectedAppearanceFields.length))
      .toEqual(expectedAppearanceFields);
    expect(candidateItem.fields.some((field) => field.label.startsWith("ModelPart"))).toBe(false);
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.item).toBe(1);
    expect(mutateExistingAreaObjectsInGitGic(input).gitBytes).toEqual(result.gitBytes);
  });

  it("rejects a stale ground-item BaseItem/appearance compare-and-swap", () => {
    const pair = fixturePair();
    const sourceDocument = parseRawGffDocument(pair.git)!;
    const sourceItem = list(sourceDocument, "List")!.value[1]!;
    sourceItem.fields.push(
      { label: "BaseItem", type: "int", value: 24 },
      { label: "ModelPart1", type: "word", value: 67 },
    );
    const sourceGit = buildGffBuffer(
      sourceDocument.fields,
      "GIT ",
      sourceDocument.rootStructTypeId,
    );

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "item",
        sourceIndex: 1,
        baseAppearance: {
          expectedValue: {
            baseItem: 24,
            modelType: 0,
            appearance: { modelPart1: 66 },
          },
          value: {
            baseItem: 25,
            modelType: 0,
            appearance: { modelPart1: 68 },
          },
          tableSha256: "a".repeat(64),
          tableRowCount: 100,
        },
      } as never],
    }))).toEqual(expect.objectContaining({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: ["item:index=1:BaseItem:stale_storage"],
    }));
  });

  it("replaces, reorders and expands one exact ground-item PropertiesList in place", () => {
    const pair = fixturePair();
    const sourceDocument = parseRawGffDocument(pair.git)!;
    const sourceItem = list(sourceDocument, "List")!.value[1]!;
    const sourceEntries = [
      itemPropertyEntry(1, 0xffff, 2, 3, 0xff, 0, 100),
      itemPropertyEntry(2, 4, 5, 6, 7, 8, 90),
    ];
    const insertionIndex = 2;
    sourceItem.fields.splice(insertionIndex, 0, {
      label: "PropertiesList",
      type: "list",
      value: sourceEntries,
    });
    const sourceFieldsWithoutProperties = sourceItem.fields.filter(
      (field) => field.label !== "PropertiesList",
    );
    const sourceGit = buildGffBuffer(
      sourceDocument.fields,
      "GIT ",
      sourceDocument.rootStructTypeId,
    );
    const expectedEntries = [
      itemPropertySourceEntry(0, 1, 0xffff, 2, 3, 0xff, 0, 100),
      itemPropertySourceEntry(1, 2, 4, 5, 6, 7, 8, 90),
    ];
    const entries = [
      itemPropertyTargetEntry(2, 4, 5, 60, 7, 8, 90),
      itemPropertyTargetEntry(48, 7, 24, 9, 1, 2, 75),
      itemPropertyTargetEntry(1, 0xffff, 2, 3, 0xff, 0, 100),
    ];
    const input = {
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "item",
        sourceIndex: 1,
        propertyList: {
          expectedValue: { present: true, expectedEntries },
          entries,
        },
      } as never],
    };

    const result = mutateExistingAreaObjectsInGitGic(input);
    const candidateItem = list(parseRawGffDocument(result.gitBytes), "List")!.value[1]!;
    const propertyFields = candidateItem.fields.filter(
      (field) => field.label === "PropertiesList",
    );

    expect(candidateItem.fields.findIndex((field) => field.label === "PropertiesList"))
      .toBe(insertionIndex);
    expect(propertyFields).toEqual([{
      label: "PropertiesList",
      type: "list",
      value: entries.map((entry) => itemPropertyEntry(
        entry.propertyName,
        entry.subtype,
        entry.costTable,
        entry.costValue,
        entry.param1,
        entry.param1Value,
        entry.chanceAppear,
      )),
    }]);
    expect(candidateItem.fields.filter((field) => field.label !== "PropertiesList"))
      .toEqual(sourceFieldsWithoutProperties);
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.item).toBe(1);
    expect(mutateExistingAreaObjectsInGitGic(input).gitBytes).toEqual(result.gitBytes);
  });

  it("keeps a physically present empty ground-item PropertiesList after removing all entries", () => {
    const pair = fixturePair();
    const sourceDocument = parseRawGffDocument(pair.git)!;
    const sourceItem = list(sourceDocument, "List")!.value[1]!;
    sourceItem.fields.push({
      label: "PropertiesList",
      type: "list",
      value: [itemPropertyEntry(1, 0xffff, 2, 3, 0xff, 0, 100)],
    });
    const sourceGit = buildGffBuffer(
      sourceDocument.fields,
      "GIT ",
      sourceDocument.rootStructTypeId,
    );

    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "item",
        sourceIndex: 1,
        propertyList: {
          expectedValue: {
            present: true,
            expectedEntries: [
              itemPropertySourceEntry(0, 1, 0xffff, 2, 3, 0xff, 0, 100),
            ],
          },
          entries: [],
        },
      } as never],
    });

    expect(list(parseRawGffDocument(result.gitBytes), "List")!.value[1]!.fields
      .filter((field) => field.label === "PropertiesList")).toEqual([{
        label: "PropertiesList",
        type: "list",
        value: [],
      }]);
    expect(result.gicBytes).toEqual(pair.gic);
  });

  it.each([
    [
      "wrong type",
      [{ label: "TemplateResRef", type: "cexostring" as const, value: "item_2" }],
      "item_2",
      "item:index=1:TemplateResRef:count=1:type=cexostring",
    ],
    [
      "duplicate",
      [
        { label: "TemplateResRef", type: "resref" as const, value: "item_2" },
        { label: "TemplateResRef", type: "resref" as const, value: "item_2" },
      ],
      "item_2",
      "item:index=1:TemplateResRef:count=2:type=resref",
    ],
    [
      "stale expected value",
      [{ label: "TemplateResRef", type: "resref" as const, value: "item_2" }],
      "stale",
      "item:index=1:TemplateResRef:expected=stale:actual=item_2",
    ],
  ])("rejects a retained ground-item TemplateResRef mutation with %s", (
    _label,
    templateFields,
    expectedResRef,
    diagnostic,
  ) => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const item = list(source, "List")!.value[1]!;
    item.fields = [
      ...templateFields,
      ...item.fields.filter((field) => field.label !== "TemplateResRef"),
    ];
    const sourceGit = buildGffBuffer(source.fields, "GIT ", source.rootStructTypeId);

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "item",
        sourceIndex: 1,
        templateResRef: { expectedResRef, resRef: "custom_item_2" },
      } as never],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [diagnostic],
    });
  });

  it("replaces and inserts the complete exact ground-item state in native order", () => {
    const pair = fixturePair();
    const sourceDocument = parseRawGffDocument(pair.git)!;
    const sourceItem = list(sourceDocument, "List")!.value[1]!;
    sourceItem.fields.splice(1, 0, { label: "Charges", type: "byte", value: 7 });
    sourceItem.fields.push({ label: "Plot", type: "byte", value: 0 });
    const sourceGit = buildGffBuffer(sourceDocument.fields, "GIT ", sourceDocument.rootStructTypeId);
    const sourceWithoutState = sourceItem.fields.filter(
      (field) => !["Charges", "Cost", "Stolen", "StackSize", "Plot", "AddCost", "Identified", "Cursed"]
        .includes(field.label),
    );
    const expectedValue = {
      presentFields: ["charges", "plot"],
      values: {
        charges: 7,
        cost: 0,
        stolen: false,
        stackSize: 1,
        plot: false,
        addCost: 0,
        identified: false,
        cursed: false,
      },
    } as const;
    const value = {
      charges: 8,
      cost: 0xffff_ffff,
      stolen: true,
      stackSize: 0xffff,
      plot: true,
      addCost: 99,
      identified: true,
      cursed: true,
    } as const;
    const input = {
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "item",
        sourceIndex: 1,
        instanceState: { expectedValue, value },
      } as never],
    };

    const result = mutateExistingAreaObjectsInGitGic(input);
    const repeated = mutateExistingAreaObjectsInGitGic(input);
    const candidate = list(parseRawGffDocument(result.gitBytes), "List")!.value[1]!;
    const stateFields = candidate.fields.filter((field) =>
      ["Charges", "Cost", "Stolen", "StackSize", "Plot", "AddCost", "Identified", "Cursed"]
        .includes(field.label));

    expect(stateFields).toEqual([
      { label: "Charges", type: "byte", value: 8 },
      { label: "Cost", type: "dword", value: 0xffff_ffff },
      { label: "Stolen", type: "byte", value: 1 },
      { label: "StackSize", type: "word", value: 0xffff },
      { label: "Plot", type: "byte", value: 1 },
      { label: "AddCost", type: "dword", value: 99 },
      { label: "Identified", type: "byte", value: 1 },
      { label: "Cursed", type: "byte", value: 1 },
    ]);
    expect(candidate.fields.filter((field) => !stateFields.includes(field))).toEqual(sourceWithoutState);
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.item).toBe(1);
    expect(repeated.gitBytes).toEqual(result.gitBytes);
    expect(repeated.gicBytes).toEqual(result.gicBytes);
  });

  it("combines a ground-item GIT state CAS with its independently admitted GIC Comment CAS", () => {
    const pair = fixturePair();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "item",
        sourceIndex: 1,
        instanceState: {
          expectedValue: {
            presentFields: [],
            values: {
              charges: 50, cost: 0, stolen: false, stackSize: 1,
              plot: false, addCost: 0, identified: false, cursed: false,
            },
          },
          value: {
            charges: 12, cost: 0, stolen: false, stackSize: 1,
            plot: false, addCost: 0, identified: false, cursed: false,
          },
        },
        editorComment: { expectedValue: "item-comment-2", value: "state changed" },
      } as never],
    });

    expect(list(parseRawGffDocument(result.gitBytes), "List")!.value[1]!.fields)
      .toContainEqual({ label: "Charges", type: "byte", value: 12 });
    expect(list(parseRawGffDocument(result.gicBytes), "List")!.value[1]!.fields)
      .toContainEqual({ label: "Comment", type: "cexostring", value: "state changed" });
  });

  it("combines retained ground-item Tag, instance state, and paired GIC Comment atomically", () => {
    const pair = fixturePair();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "item",
        sourceIndex: 1,
        tag: { expectedValue: "ITEM_2", value: "COMBINED_LOOT" },
        instanceState: {
          expectedValue: {
            presentFields: [],
            values: {
              charges: 50, cost: 0, stolen: false, stackSize: 1,
              plot: false, addCost: 0, identified: false, cursed: false,
            },
          },
          value: {
            charges: 11, cost: 0, stolen: false, stackSize: 1,
            plot: false, addCost: 0, identified: false, cursed: false,
          },
        },
        editorComment: { expectedValue: "item-comment-2", value: "combined item" },
      } as never],
    });

    const gitFields = list(parseRawGffDocument(result.gitBytes), "List")!.value[1]!.fields;
    expect(gitFields).toContainEqual({ label: "Tag", type: "cexostring", value: "COMBINED_LOOT" });
    expect(gitFields).toContainEqual({ label: "Charges", type: "byte", value: 11 });
    expect(list(parseRawGffDocument(result.gicBytes), "List")!.value[1]!.fields)
      .toContainEqual({ label: "Comment", type: "cexostring", value: "combined item" });
  });

  it("combines retained ground-item TemplateResRef, Tag, state, and Comment atomically", () => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    list(source, "List")!.value[1]!.fields.unshift({
      label: "TemplateResRef",
      type: "resref",
      value: "item_2",
    });
    const sourceGit = buildGffBuffer(source.fields, "GIT ", source.rootStructTypeId);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "item",
        sourceIndex: 1,
        templateResRef: { expectedResRef: "item_2", resRef: "custom_item_2" },
        tag: { expectedValue: "ITEM_2", value: "COMBINED_LOOT" },
        instanceState: {
          expectedValue: {
            presentFields: [],
            values: {
              charges: 50, cost: 0, stolen: false, stackSize: 1,
              plot: false, addCost: 0, identified: false, cursed: false,
            },
          },
          value: {
            charges: 11, cost: 0, stolen: false, stackSize: 1,
            plot: false, addCost: 0, identified: false, cursed: false,
          },
        },
        editorComment: { expectedValue: "item-comment-2", value: "combined item" },
      } as never],
    });

    const gitFields = list(parseRawGffDocument(result.gitBytes), "List")!.value[1]!.fields;
    expect(gitFields).toContainEqual({
      label: "TemplateResRef",
      type: "resref",
      value: "custom_item_2",
    });
    expect(gitFields).toContainEqual({ label: "Tag", type: "cexostring", value: "COMBINED_LOOT" });
    expect(gitFields).toContainEqual({ label: "Charges", type: "byte", value: 11 });
    expect(list(parseRawGffDocument(result.gicBytes), "List")!.value[1]!.fields)
      .toContainEqual({ label: "Comment", type: "cexostring", value: "combined item" });
  });

  it("rejects stale ground-item state presence and values before writing", () => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "item",
        sourceIndex: 1,
        instanceState: {
          expectedValue: {
            presentFields: ["charges"],
            values: {
              charges: 7, cost: 0, stolen: false, stackSize: 1,
              plot: false, addCost: 0, identified: false, cursed: false,
            },
          },
          value: {
            charges: 8, cost: 0, stolen: false, stackSize: 1,
            plot: false, addCost: 0, identified: false, cursed: false,
          },
        },
      } as never],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: ["item:index=1:instance_state:stale_storage"],
    });
  });

  it("rejects a stale paired-GIC ground-item Comment CAS value", () => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "item",
        sourceIndex: 1,
        editorComment: { expectedValue: "stale", value: "new" },
      } as never],
    }))).toMatchObject({
      diagnostics: ["item:index=1:Comment:expected=stale:actual=item-comment-2"],
    });
  });

  it("rejects a stale paired-GIC Creature Comment CAS value", () => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 1,
        editorComment: { expectedValue: "stale", value: "new" },
      } as never],
    }))).toMatchObject({
      diagnostics: [
        "creature:index=1:Comment:expected=stale:actual=creature-comment-2",
      ],
    });
  });

  it("applies a combined native GIT property and paired-GIC Comment mutation", () => {
    const pair = fixturePair();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        animationState: { expectedValue: 0, value: 2 },
        editorComment: {
          expectedValue: "placeable-comment-2",
          value: "combined comment",
        },
      } as never],
    });

    expect(result.gitBytes).not.toEqual(pair.git);
    expect(result.gicBytes).not.toEqual(pair.gic);
    expect(list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!.fields)
      .toEqual(expect.arrayContaining([
        { label: "AnimationState", type: "byte", value: 2 },
      ]));
    expect(list(parseRawGffDocument(result.gicBytes), "Placeable List")!.value[1]!.fields)
      .toEqual(expect.arrayContaining([
        { label: "Comment", type: "cexostring", value: "combined comment" },
      ]));
  });

  it("preserves every noncanonical source GIC byte for a GIT-only Placeable mutation", () => {
    const pair = fixturePair();
    const sourceGic = Buffer.concat([pair.gic, Buffer.from([0xde, 0xad, 0xbe, 0xef])]);
    expect(parseRawGffDocument(sourceGic)).not.toBeNull();

    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        animationState: { expectedValue: 0, value: 2 },
      } as never],
    });

    expect(result.gitBytes).not.toEqual(pair.git);
    expect(result.gicBytes).toEqual(sourceGic);
  });

  it("preserves a paired-GIC Placeable field adjacent to the mutated Comment", () => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.gic)!;
    list(source, "Placeable List")!.value[1]!.fields.push({
      label: "EditorPeer",
      type: "dword",
      value: 0x7f00ff00,
    });
    const sourceGic = buildGffBuffer(source.fields, "GIC ", source.rootStructTypeId);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        editorComment: {
          expectedValue: "placeable-comment-2",
          value: "new comment",
        },
      } as never],
    });

    expect(list(parseRawGffDocument(result.gicBytes), "Placeable List")!.value[1]!.fields)
      .toEqual(expect.arrayContaining([
        { label: "EditorPeer", type: "dword", value: 0x7f00ff00 },
        { label: "Comment", type: "cexostring", value: "new comment" },
      ]));
  });

  it("accepts the exact 4096-ECMAScript-unit editor Comment boundary", () => {
    const pair = fixturePair();
    const value = "x".repeat(4096);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        editorComment: { expectedValue: "placeable-comment-2", value },
      } as never],
    });
    const field = list(parseRawGffDocument(result.gicBytes), "Placeable List")!
      .value[1]!.fields.find((candidate) => candidate.label === "Comment");
    expect(field).toEqual({ label: "Comment", type: "cexostring", value });
    expect(result.gitBytes).toEqual(pair.git);
  });

  it.each([
    ["null pair", null, "placeable:index=1:Comment:invalid_pair"],
    ["array pair", [], "placeable:index=1:Comment:invalid_pair"],
    ["primitive pair", 1, "placeable:index=1:Comment:invalid_pair"],
    ["missing expected value", { value: "new" }, "placeable:index=1:Comment:incomplete"],
    ["missing target value", { expectedValue: "placeable-comment-2" }, "placeable:index=1:Comment:incomplete"],
    ["unexpected key", { expectedValue: "placeable-comment-2", value: "new", trim: true }, "placeable:index=1:Comment:unexpected_key=trim"],
    ["non-string expected value", { expectedValue: 1, value: "new" }, "placeable:index=1:Comment:invalid_expected_value"],
    ["non-string target value", { expectedValue: "placeable-comment-2", value: false }, "placeable:index=1:Comment:invalid_value"],
    ["over-budget expected value", { expectedValue: "x".repeat(4097), value: "new" }, "placeable:index=1:Comment:invalid_expected_value"],
    ["over-budget target value", { expectedValue: "placeable-comment-2", value: "x".repeat(4097) }, "placeable:index=1:Comment:invalid_value"],
    ["NUL expected value", { expectedValue: "placeable\0comment", value: "new" }, "placeable:index=1:Comment:invalid_expected_value"],
    ["NUL target value", { expectedValue: "placeable-comment-2", value: "new\0comment" }, "placeable:index=1:Comment:invalid_value"],
    ["unchanged pair", { expectedValue: "same", value: "same" }, "placeable:index=1:Comment:unchanged"],
  ])("rejects a Placeable editor Comment mutation with %s", (_label, editorComment, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, editorComment } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["missing", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "Comment"), "placeable:index=1:Comment:count=0:type=missing"],
    ["wrong type", (fields: SupportedGffField[]) => fields.map((field) => field.label === "Comment" ? { label: "Comment", type: "resref" as const, value: "placeable-comment-2" } : field), "placeable:index=1:Comment:count=1:type=resref"],
    ["duplicate", (fields: SupportedGffField[]) => [...fields, { label: "Comment", type: "cexostring" as const, value: "placeable-comment-2" }], "placeable:index=1:Comment:count=2:type=cexostring"],
    ["stale", (fields: SupportedGffField[]) => fields, "placeable:index=1:Comment:expected=stale:actual=placeable-comment-2"],
  ])("rejects a %s native paired GIC Placeable Comment", (_label, transform, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: withSecondPlaceableGicFields(pair.gic, transform),
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        editorComment: {
          expectedValue: _label === "stale" ? "stale" : "placeable-comment-2",
          value: "new comment",
        },
      } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["unpaired cardinality", (entries: Array<{ typeId: number; fields: SupportedGffField[] }>) => entries.slice(0, 1), "placeable:cardinality:git=2:gic=1"],
    ["wrong paired struct type", (entries: Array<{ typeId: number; fields: SupportedGffField[] }>) => entries.map((entry, index) => index === 1 ? { ...entry, typeId: 8 } : entry), "gic:placeable:1:struct_type=8:expected=9"],
    ["paired ordinal order drift", (entries: Array<{ typeId: number; fields: SupportedGffField[] }>) => [...entries].reverse(), "placeable:index=1:Comment:expected=placeable-comment-2:actual=placeable-comment-1"],
  ])("rejects Placeable editor Comment %s", (_label, transform, diagnostic) => {
    const pair = fixturePair();
    const document = parseRawGffDocument(pair.gic)!;
    const placeables = list(document, "Placeable List")!;
    placeables.value = transform([...placeables.value]);
    const sourceGic = buildGffBuffer(document.fields, "GIC ", document.rootStructTypeId);
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        editorComment: { expectedValue: "placeable-comment-2", value: "new" },
      } as never],
    })).diagnostics).toContain(diagnostic);
  });

  it("rejects an editor Comment mutation colliding with deletion of the same immutable ordinal", () => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [{ kind: "placeable", sourceIndex: 1 }],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        editorComment: { expectedValue: "placeable-comment-2", value: "new" },
      } as never],
    }))).toMatchObject({ diagnostics: ["placeable:index=1:deleted"] });
  });

  it("retains paired-GIC Comment identity after deletion shifts its candidate ordinal", () => {
    const pair = fixturePair();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [{ kind: "placeable", sourceIndex: 0 }],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        editorComment: { expectedValue: "placeable-comment-2", value: "shifted" },
      } as never],
    });

    const candidateList = list(parseRawGffDocument(result.gicBytes), "Placeable List")!;
    expect(candidateList.value).toHaveLength(1);
    expect(candidateList.value[0]!.fields).toEqual(expect.arrayContaining([
      { label: "Comment", type: "cexostring", value: "shifted" },
    ]));
  });

  it("does not shift paired-GIC Comment identity for a deletion after its source ordinal", () => {
    const pair = fixturePair();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [{ kind: "placeable", sourceIndex: 1 }],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 0,
        editorComment: { expectedValue: "placeable-comment-1", value: "before deletion" },
      } as never],
    });

    const candidateList = list(parseRawGffDocument(result.gicBytes), "Placeable List")!;
    expect(candidateList.value).toHaveLength(1);
    expect(candidateList.value[0]!.fields).toEqual(expect.arrayContaining([
      { label: "Comment", type: "cexostring", value: "before deletion" },
    ]));
  });

  it.each([
    ["invalid buffer", (candidate: Buffer) => Buffer.from("not-a-gff")],
    ["wrong file type", (candidate: Buffer) => {
      const document = parseRawGffDocument(candidate)!;
      return buildGffBuffer(document.fields, "GIT ", document.rootStructTypeId);
    }],
    ["wrong file version", (candidate: Buffer) => {
      const corrupted = Buffer.from(candidate);
      corrupted.write("V9.9", 4, 4, "ascii");
      return corrupted;
    }],
    ["missing candidate Placeable List", (candidate: Buffer) => {
      const document = parseRawGffDocument(candidate)!;
      return buildGffBuffer(
        document.fields.filter((field) => field.label !== "Placeable List"),
        "GIC ",
        document.rootStructTypeId,
      );
    }],
    ["wrong candidate Placeable List type", (candidate: Buffer) => {
      const document = parseRawGffDocument(candidate)!;
      const fields = document.fields.map((field) => field.label === "Placeable List"
        ? { label: "Placeable List", type: "dword" as const, value: 2 }
        : field);
      return buildGffBuffer(fields, "GIC ", document.rootStructTypeId);
    }],
  ])("rejects editor Comment readback from a %s", (_label, corrupt) => {
    const pair = fixturePair();
    const mutation = {
      kind: "placeable" as const,
      sourceIndex: 1,
      editorComment: { expectedValue: "placeable-comment-2", value: "new comment" },
    };
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [mutation],
    });
    expect(pairError(() => verifyObjectEditorCommentMutations(
      corrupt(result.gicBytes),
      new Map([["placeable:1:property", mutation]]),
      new Map(),
      parseRawGffDocument(pair.gic)!,
    ))).toMatchObject({ diagnostics: ["gic:placeable:Comment:readback_missing"] });
  });

  it.each([
    ["missing source Placeable List", (document: NonNullable<ReturnType<typeof parseRawGffDocument>>) => {
      document.fields = document.fields.filter((field) => field.label !== "Placeable List");
    }],
    ["wrong source Placeable List type", (document: NonNullable<ReturnType<typeof parseRawGffDocument>>) => {
      document.fields = document.fields.map((field) => field.label === "Placeable List"
        ? { label: "Placeable List", type: "dword" as const, value: 2 }
        : field);
    }],
  ])("rejects editor Comment readback with a %s", (_label, corrupt) => {
    const pair = fixturePair();
    const mutation = {
      kind: "placeable" as const,
      sourceIndex: 1,
      editorComment: { expectedValue: "placeable-comment-2", value: "new comment" },
    };
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [mutation],
    });
    const source = parseRawGffDocument(pair.gic)!;
    corrupt(source);
    expect(pairError(() => verifyObjectEditorCommentMutations(
      result.gicBytes,
      new Map([["placeable:1:property", mutation]]),
      new Map(),
      source,
    ))).toMatchObject({ diagnostics: ["gic:placeable:Comment:readback_missing"] });
  });

  it("rejects editor Comment readback when the candidate sourceIndex is missing", () => {
    const pair = fixturePair();
    const mutation = {
      kind: "placeable" as const,
      sourceIndex: 1,
      editorComment: { expectedValue: "placeable-comment-2", value: "new comment" },
    };
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [mutation],
    });
    const candidate = parseRawGffDocument(result.gicBytes)!;
    list(candidate, "Placeable List")!.value.splice(1, 1);
    const missing = buildGffBuffer(candidate.fields, "GIC ", candidate.rootStructTypeId);
    expect(pairError(() => verifyObjectEditorCommentMutations(
      missing,
      new Map([["placeable:1:property", mutation]]),
      new Map(),
      parseRawGffDocument(pair.gic)!,
    ))).toMatchObject({
      diagnostics: ["placeable:source=1:candidate=1:Comment:preservation_mismatch"],
    });
  });

  it.each([
    ["paired struct", (document: NonNullable<ReturnType<typeof parseRawGffDocument>>) => {
      const entry = list(document, "Placeable List")!.value[1]!;
      entry.fields = entry.fields.map((field) => field.label === "Comment"
        ? { label: "Comment", type: "cexostring" as const, value: "drift" }
        : field);
    }, "placeable:source=1:candidate=1:Comment:preservation_mismatch"],
    ["whole document", (document: NonNullable<ReturnType<typeof parseRawGffDocument>>) => {
      document.fields = document.fields.map((field) => field.label === "EditorOnlyRoot"
        ? { label: "EditorOnlyRoot", type: "cexostring" as const, value: "drift" }
        : field);
    }, "gic:document:Comment:preservation_mismatch"],
    ["whole-document extra field", (document: NonNullable<ReturnType<typeof parseRawGffDocument>>) => {
      document.fields.push({ label: "UnexpectedRoot", type: "byte", value: 1 });
    }, "gic:document:Comment:preservation_mismatch"],
  ])("rejects editor Comment %s readback drift", (_label, corrupt, diagnostic) => {
    const pair = fixturePair();
    const mutation = {
      kind: "placeable" as const,
      sourceIndex: 1,
      editorComment: { expectedValue: "placeable-comment-2", value: "new comment" },
    };
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [mutation],
    });
    const candidate = parseRawGffDocument(result.gicBytes)!;
    corrupt(candidate);
    const corrupted = buildGffBuffer(candidate.fields, "GIC ", candidate.rootStructTypeId);
    expect(pairError(() => verifyObjectEditorCommentMutations(
      corrupted,
      new Map([["placeable:1:property", mutation]]),
      new Map(),
      parseRawGffDocument(pair.gic)!,
    ))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it("rewrites exact Placeable Conversation and Interruptable fields while preserving every other GIT field and GIC byte", () => {
    const pair = fixturePair();
    const sourcePlaceable = list(parseRawGffDocument(pair.git), "Placeable List")!.value[1]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        conversation: { expectedResRef: "", resRef: "chest_dialog" },
        interruptable: { expectedValue: 1, value: 0 },
      } as never],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.placeable).toBe(1);
    const candidate = list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!;
    expect(candidate.fields).toEqual(expect.arrayContaining([
      { label: "Conversation", type: "resref", value: "chest_dialog" },
      { label: "Interruptable", type: "byte", value: 0 },
    ]));
    const changed = new Set(["Conversation", "Interruptable"]);
    expect(candidate.fields.filter((field) => !changed.has(field.label)))
      .toEqual(sourcePlaceable.fields.filter((field) => !changed.has(field.label)));
  });

  it("rewrites only the exact Placeable TemplateResRef and preserves renderer-independent siblings and GIC bytes", () => {
    const pair = fixturePair();
    const sourceGit = withSecondPlaceableFields(pair.git, (fields) => [
      ...fields,
      { label: "TemplateResRef", type: "resref", value: "plc_chest" },
    ]);
    const sourcePlaceable = list(parseRawGffDocument(sourceGit), "Placeable List")!.value[1]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        templateResRef: { expectedResRef: "plc_chest", resRef: "plc_chest_alt" },
      } as never],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.placeable).toBe(1);
    const candidate = list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!;
    expect(candidate.fields).toContainEqual({
      label: "TemplateResRef",
      type: "resref",
      value: "plc_chest_alt",
    });
    expect(candidate.fields.filter((field) => field.label !== "TemplateResRef"))
      .toEqual(sourcePlaceable.fields.filter((field) => field.label !== "TemplateResRef"));
  });

  it.each([
    [null, (fields: SupportedGffField[]) => fields, "placeable:index=1:TemplateResRef:invalid_pair"],
    [{ expectedResRef: "plc_chest" }, (fields: SupportedGffField[]) => fields, "placeable:index=1:TemplateResRef:incomplete"],
    [{ expectedResRef: "plc_chest", resRef: "plc_alt", extra: true }, (fields: SupportedGffField[]) => fields, "placeable:index=1:TemplateResRef:unexpected_key=extra"],
    [{ expectedResRef: "PLC_CHEST", resRef: "plc_alt" }, (fields: SupportedGffField[]) => fields, "placeable:index=1:TemplateResRef:invalid_expected_resref"],
    [{ expectedResRef: "plc_chest", resRef: "bad-alt" }, (fields: SupportedGffField[]) => fields, "placeable:index=1:TemplateResRef:invalid_resref"],
    [{ expectedResRef: "plc_chest", resRef: "plc_chest" }, (fields: SupportedGffField[]) => fields, "placeable:index=1:TemplateResRef:unchanged"],
    [{ expectedResRef: "plc_chest", resRef: "plc_alt" }, (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "TemplateResRef"), "placeable:index=1:TemplateResRef:count=0:type=missing"],
    [{ expectedResRef: "plc_chest", resRef: "plc_alt" }, (fields: SupportedGffField[]) => fields.map((field) => field.label === "TemplateResRef" ? { label: "TemplateResRef", type: "cexostring" as const, value: "plc_chest" } : field), "placeable:index=1:TemplateResRef:count=1:type=cexostring"],
    [{ expectedResRef: "plc_chest", resRef: "plc_alt" }, (fields: SupportedGffField[]) => [...fields, { label: "TemplateResRef", type: "resref" as const, value: "plc_chest" }], "placeable:index=1:TemplateResRef:count=2:type=resref"],
    [{ expectedResRef: "plc_other", resRef: "plc_alt" }, (fields: SupportedGffField[]) => fields, "placeable:index=1:TemplateResRef:expected=plc_other:actual=plc_chest"],
  ])("rejects malformed or stale Placeable TemplateResRef %#", (templateResRef, transform, diagnostic) => {
    const pair = fixturePair();
    const sourceGit = withSecondPlaceableFields(pair.git, (fields) => [
      ...fields,
      { label: "TemplateResRef", type: "resref", value: "plc_chest" },
    ]);
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withSecondPlaceableFields(sourceGit, transform),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, templateResRef } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it("rewrites a Conversation-only mutation without inventing Interruptable", () => {
    const pair = fixturePair();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        conversation: { expectedResRef: "", resRef: "chest_dialog" },
      } as never],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!.fields)
      .toEqual(expect.arrayContaining([
        { label: "Conversation", type: "resref", value: "chest_dialog" },
        { label: "Interruptable", type: "byte", value: 1 },
      ]));
  });

  it.each([
    ["non-object Conversation pair", { conversation: null }, "placeable:index=1:Conversation:invalid_pair"],
    ["primitive Conversation pair", { conversation: 42 }, "placeable:index=1:Conversation:invalid_pair"],
    ["incomplete Conversation pair", { conversation: { expectedResRef: "" } }, "placeable:index=1:Conversation:incomplete"],
    ["unknown Conversation key", { conversation: { expectedResRef: "", resRef: "dialog", tag: "x" } }, "placeable:index=1:Conversation:unexpected_key=tag"],
    ["invalid expected Conversation", { conversation: { expectedResRef: "bad-dialog", resRef: "dialog" } }, "placeable:index=1:Conversation:invalid_expected_resref"],
    ["invalid target Conversation", { conversation: { expectedResRef: "", resRef: "bad-dialog" } }, "placeable:index=1:Conversation:invalid_resref"],
    ["unchanged Conversation", { conversation: { expectedResRef: "", resRef: "" } }, "placeable:index=1:Conversation:unchanged"],
    ["non-object Interruptable pair", { interruptable: null }, "placeable:index=1:Interruptable:invalid_pair"],
    ["primitive Interruptable pair", { interruptable: 42 }, "placeable:index=1:Interruptable:invalid_pair"],
    ["incomplete Interruptable pair", { interruptable: { expectedValue: 1 } }, "placeable:index=1:Interruptable:incomplete"],
    ["unknown Interruptable key", { interruptable: { expectedValue: 1, value: 0, flag: true } }, "placeable:index=1:Interruptable:unexpected_key=flag"],
    ["invalid expected Interruptable", { interruptable: { expectedValue: 2, value: 0 } }, "placeable:index=1:Interruptable:invalid_expected_byte"],
    ["invalid target Interruptable", { interruptable: { expectedValue: 1, value: 2 } }, "placeable:index=1:Interruptable:invalid_byte"],
    ["unchanged Interruptable", { interruptable: { expectedValue: 1, value: 1 } }, "placeable:index=1:Interruptable:unchanged"],
  ])("rejects %s", (_label, values, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, ...values } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["missing Conversation", "Conversation", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "Conversation"), { conversation: { expectedResRef: "", resRef: "dialog" } }, "placeable:index=1:Conversation:count=0:type=missing"],
    ["wrong-type Conversation", "Conversation", (fields: SupportedGffField[]) => fields.map((field) => field.label === "Conversation" ? { label: "Conversation", type: "cexostring" as const, value: "" } : field), { conversation: { expectedResRef: "", resRef: "dialog" } }, "placeable:index=1:Conversation:count=1:type=cexostring"],
    ["duplicate Conversation", "Conversation", (fields: SupportedGffField[]) => [...fields, { label: "Conversation", type: "resref" as const, value: "" }], { conversation: { expectedResRef: "", resRef: "dialog" } }, "placeable:index=1:Conversation:count=2:type=resref"],
    ["stale Conversation", "Conversation", (fields: SupportedGffField[]) => fields, { conversation: { expectedResRef: "other", resRef: "dialog" } }, "placeable:index=1:Conversation:expected=other:actual="],
    ["missing Interruptable", "Interruptable", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "Interruptable"), { interruptable: { expectedValue: 1, value: 0 } }, "placeable:index=1:Interruptable:count=0:type=missing"],
    ["wrong-type Interruptable", "Interruptable", (fields: SupportedGffField[]) => fields.map((field) => field.label === "Interruptable" ? { label: "Interruptable", type: "word" as const, value: 1 } : field), { interruptable: { expectedValue: 1, value: 0 } }, "placeable:index=1:Interruptable:count=1:type=word"],
    ["duplicate Interruptable", "Interruptable", (fields: SupportedGffField[]) => [...fields, { label: "Interruptable", type: "byte" as const, value: 1 }], { interruptable: { expectedValue: 1, value: 0 } }, "placeable:index=1:Interruptable:count=2:type=byte"],
    ["invalid native Interruptable", "Interruptable", (fields: SupportedGffField[]) => fields.map((field) => field.label === "Interruptable" ? { label: "Interruptable", type: "byte" as const, value: 2 } : field), { interruptable: { expectedValue: 1, value: 0 } }, "placeable:index=1:Interruptable:invalid_byte=2"],
    ["stale Interruptable", "Interruptable", (fields: SupportedGffField[]) => fields, { interruptable: { expectedValue: 0, value: 1 } }, "placeable:index=1:Interruptable:expected=0:actual=1"],
  ])("rejects a %s native field", (_label, _field, transform, values, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withSecondPlaceableFields(pair.git, transform as (fields: SupportedGffField[]) => SupportedGffField[]),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, ...values } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it("rewrites all six ordered Placeable trap Bytes while preserving every other GIT field and GIC byte", () => {
    const pair = fixturePair();
    const sourcePlaceable = list(parseRawGffDocument(pair.git), "Placeable List")!.value[1]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        trapFields: [
          { field: "TrapFlag", expectedValue: 0, value: 1 },
          { field: "TrapDetectable", expectedValue: 1, value: 0 },
          { field: "TrapDisarmable", expectedValue: 1, value: 0 },
          { field: "TrapOneShot", expectedValue: 1, value: 0 },
          { field: "TrapDetectDC", expectedValue: 0, value: 25 },
          { field: "DisarmDC", expectedValue: 15, value: 30 },
        ],
      } as never],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.placeable).toBe(1);
    const candidate = list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!;
    expect(candidate.fields).toEqual(expect.arrayContaining([
      { label: "TrapFlag", type: "byte", value: 1 },
      { label: "TrapDetectable", type: "byte", value: 0 },
      { label: "TrapDisarmable", type: "byte", value: 0 },
      { label: "TrapOneShot", type: "byte", value: 0 },
      { label: "TrapDetectDC", type: "byte", value: 25 },
      { label: "DisarmDC", type: "byte", value: 30 },
      { label: "TrapType", type: "byte", value: 3 },
    ]));
    const changed = new Set([
      "TrapFlag",
      "TrapDetectable",
      "TrapDisarmable",
      "TrapOneShot",
      "TrapDetectDC",
      "DisarmDC",
    ]);
    expect(candidate.fields.filter((field) => !changed.has(field.label)))
      .toEqual(sourcePlaceable.fields.filter((field) => !changed.has(field.label)));
  });

  it("rewrites an ordered proper subset of Placeable trap Bytes", () => {
    const pair = fixturePair();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        trapFields: [
          { field: "TrapDetectable", expectedValue: 1, value: 0 },
          { field: "DisarmDC", expectedValue: 15, value: 16 },
        ],
      } as never],
    });
    const candidate = list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!;
    expect(candidate.fields).toEqual(expect.arrayContaining([
      { label: "TrapFlag", type: "byte", value: 0 },
      { label: "TrapDetectable", type: "byte", value: 0 },
      { label: "TrapDisarmable", type: "byte", value: 1 },
      { label: "TrapOneShot", type: "byte", value: 1 },
      { label: "TrapDetectDC", type: "byte", value: 0 },
      { label: "DisarmDC", type: "byte", value: 16 },
    ]));
  });

  it.each([
    ["non-array list", null, "placeable:index=1:trapFields:invalid_list"],
    ["empty list", [], "placeable:index=1:trapFields:empty"],
    ["over mutation budget", Array.from({ length: 7 }, () => ({ field: "TrapFlag", expectedValue: 0, value: 1 })), "placeable:index=1:trapFields:count=7"],
    ["null entry", [null], "placeable:index=1:trapFields:entry=0:invalid"],
    ["array entry", [[]], "placeable:index=1:trapFields:entry=0:invalid"],
    ["primitive entry", [1], "placeable:index=1:trapFields:entry=0:invalid"],
    ["unsupported TrapType", [{ field: "TrapType", expectedValue: 0, value: 1 }], "placeable:index=1:TrapType:unsupported_trap_byte_field"],
    ["unexpected entry key", [{ field: "TrapFlag", expectedValue: 0, value: 1, rogueModifier: 5 }], "placeable:index=1:TrapFlag:unexpected_key=rogueModifier"],
    ["duplicate field", [
      { field: "TrapFlag", expectedValue: 0, value: 1 },
      { field: "TrapFlag", expectedValue: 0, value: 1 },
    ], "placeable:index=1:TrapFlag:duplicate"],
    ["out-of-order field", [
      { field: "DisarmDC", expectedValue: 15, value: 16 },
      { field: "TrapDetectDC", expectedValue: 0, value: 1 },
    ], "placeable:index=1:TrapDetectDC:out_of_order"],
    ["invalid flag expected", [{ field: "TrapFlag", expectedValue: 2, value: 1 }], "placeable:index=1:TrapFlag:invalid_expected_byte"],
    ["invalid flag target", [{ field: "TrapFlag", expectedValue: 0, value: 2 }], "placeable:index=1:TrapFlag:invalid_byte"],
    ["out-of-range DC", [{ field: "TrapDetectDC", expectedValue: 0, value: 256 }], "placeable:index=1:TrapDetectDC:invalid_byte"],
    ["unchanged pair", [{ field: "DisarmDC", expectedValue: 15, value: 15 }], "placeable:index=1:DisarmDC:unchanged"],
  ])("rejects Placeable trap Byte mutation with %s", (_label, trapFields, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, trapFields } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["missing", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "TrapFlag"), "placeable:index=1:TrapFlag:count=0:type=missing"],
    ["wrong type", (fields: SupportedGffField[]) => fields.map((field) => field.label === "TrapFlag" ? { label: "TrapFlag", type: "word" as const, value: 0 } : field), "placeable:index=1:TrapFlag:count=1:type=word"],
    ["duplicate", (fields: SupportedGffField[]) => [...fields, { label: "TrapFlag", type: "byte" as const, value: 0 }], "placeable:index=1:TrapFlag:count=2:type=byte"],
    ["invalid flag", (fields: SupportedGffField[]) => fields.map((field) => field.label === "TrapFlag" ? { label: "TrapFlag", type: "byte" as const, value: 2 } : field), "placeable:index=1:TrapFlag:invalid_byte=2"],
    ["stale", (fields: SupportedGffField[]) => fields, "placeable:index=1:TrapFlag:expected=1:actual=0"],
  ])("rejects a %s native Placeable trap Byte", (_label, transform, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withSecondPlaceableFields(pair.git, transform),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        trapFields: [{
          field: "TrapFlag",
          expectedValue: _label === "stale" ? 1 : 0,
          value: _label === "stale" ? 0 : 1,
        }],
      } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it("reorders retained Placeable inventory entries, changes only repository Words, and preserves GIC", () => {
    const pair = fixturePair();
    const sourceGit = withPlaceableInventory(pair.git, [
      placeableInventorySourceEntry("first_item", 2, 3, 91),
      placeableInventorySourceEntry("second_item", 4, 5, 92),
    ]);
    const sourceInventory = placeableInventoryList(sourceGit);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        inventory: {
          expectedEntries: [
            { sourceIndex: 0, resRef: "first_item", x: 2, y: 3 },
            { sourceIndex: 1, resRef: "second_item", x: 4, y: 5 },
          ],
          entries: [
            { sourceIndex: 1, resRef: "second_item", x: 0xffff, y: 50 },
            { sourceIndex: 0, resRef: "first_item", x: 20, y: 30 },
          ],
        },
      } as never],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    const targetPlaceable = list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!;
    const targetInventory = placeableInventoryList(result.gitBytes);
    expect(targetPlaceable.fields.filter((field) => field.label === "ItemList")).toHaveLength(1);
    expect(targetPlaceable.fields).toContainEqual({
      label: "Tag",
      type: "cexostring",
      value: "PLACEABLE_2",
    });
    expect(targetInventory.map((entry) => entry.typeId)).toEqual([0, 1]);
    expect(targetInventory[0]!.fields).toEqual(sourceInventory[1]!.fields.map((field) =>
      field.label === "Repos_PosX"
        ? { label: "Repos_PosX", type: "word", value: 0xffff }
        : field.label === "Repos_Posy"
          ? { label: "Repos_Posy", type: "word", value: 50 }
          : field,
    ));
    expect(targetInventory[1]!.fields).toEqual(sourceInventory[0]!.fields.map((field) =>
      field.label === "Repos_PosX"
        ? { label: "Repos_PosX", type: "word", value: 20 }
        : field.label === "Repos_Posy"
          ? { label: "Repos_Posy", type: "word", value: 30 }
          : field,
    ));
  });

  it("expands the exact admitted nw_cloth022 UTI into a Placeable inventory item", () => {
    const pair = fixturePair();
    const blueprintBytes = itemBlueprintFixture();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        inventory: {
          expectedEntries: [],
          entries: [{
            resRef: "nw_cloth022",
            itemResRef: "nw_cloth022",
            itemSourceObjectKey: "nwn-base-key-uti-nw-cloth022-v1",
            itemSourceFingerprint: createHash("sha256").update(blueprintBytes).digest("hex"),
            blueprintBytes,
            x: 7,
            y: 8,
          }],
        },
      } as never],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    const [entry] = placeableInventoryList(result.gitBytes);
    expect(entry?.typeId).toBe(0);
    expect(entry?.fields.slice(0, 7)).toEqual([
      { label: "XPosition", type: "float", value: -1 },
      { label: "YPosition", type: "float", value: -1 },
      { label: "ZPosition", type: "float", value: -1 },
      { label: "XOrientation", type: "float", value: 0 },
      { label: "YOrientation", type: "float", value: 1 },
      { label: "TemplateResRef", type: "resref", value: "nw_cloth022" },
      { label: "BaseItem", type: "int", value: 16 },
    ]);
    expect(entry?.fields.slice(-2)).toEqual([
      { label: "Repos_PosX", type: "word", value: 7 },
      { label: "Repos_Posy", type: "word", value: 8 },
    ]);
    expect(entry?.fields.some((field) =>
      ["Dropable", "Pickpocketable", "Infinite"].includes(field.label)
    )).toBe(false);
  });

  it("removes ItemList when the Placeable inventory target is empty", () => {
    const pair = fixturePair();
    const sourceGit = withPlaceableInventory(pair.git, [
      placeableInventorySourceEntry("first_item", 2, 3, 91),
    ]);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        inventory: {
          expectedEntries: [{ sourceIndex: 0, resRef: "first_item", x: 2, y: 3 }],
          entries: [],
        },
      } as never],
    });

    const placeable = list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!;
    expect(placeable.fields.some((field) => field.label === "ItemList")).toBe(false);
    expect(placeable.fields).toContainEqual({
      label: "Tag",
      type: "cexostring",
      value: "PLACEABLE_2",
    });
    expect(result.gicBytes).toEqual(pair.gic);
  });

  it.each([
    ["unsupported mode flag", {
      expectedEntries: [],
      entries: [{ sourceIndex: 0, resRef: "first_item", x: 2, y: 3, dropable: true }],
    }, "placeable:index=1:ItemList:entry=0:unsupported_flag"],
    ["duplicate retained ordinal", {
      expectedEntries: [{ sourceIndex: 0, resRef: "first_item", x: 2, y: 3 }],
      entries: [
        { sourceIndex: 0, resRef: "first_item", x: 2, y: 3 },
        { sourceIndex: 0, resRef: "first_item", x: 3, y: 3 },
      ],
    }, "placeable:index=1:ItemList:entry=1:duplicate_source=0"],
    ["out-of-range Word", {
      expectedEntries: [{ sourceIndex: 0, resRef: "first_item", x: 2, y: 3 }],
      entries: [{ sourceIndex: 0, resRef: "first_item", x: 65536, y: 3 }],
    }, "placeable:index=1:ItemList:entry=0:x:invalid_word"],
    ["stale item identity", {
      expectedEntries: [{ sourceIndex: 0, resRef: "stale_item", x: 2, y: 3 }],
      entries: [],
    }, "placeable:index=1:ItemList:source=0:resref:expected=stale_item:actual=first_item"],
  ])("rejects Placeable inventory with %s", (_label, inventory, diagnostic) => {
    const pair = fixturePair();
    const sourceGit = withPlaceableInventory(pair.git, [
      placeableInventorySourceEntry("first_item", 2, 3, 91),
    ]);
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, inventory } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it("rejects non-Word repository coordinates and mode-2 flags in the native ItemList", () => {
    const pair = fixturePair();
    const wrongType = withPlaceableInventory(pair.git, [{
      ...placeableInventorySourceEntry("first_item", 2, 3, 91),
      fields: [
        { label: "TemplateResRef", type: "resref", value: "first_item" },
        { label: "UnknownNestedItem", type: "int", value: 91 },
        { label: "Repos_PosX", type: "byte", value: 2 },
        { label: "Repos_Posy", type: "word", value: 3 },
        { label: "Dropable", type: "byte", value: 1 },
      ],
    }]);
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: wrongType,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        inventory: {
          expectedEntries: [{ sourceIndex: 0, resRef: "first_item", x: 2, y: 3 }],
          entries: [],
        },
      } as never],
    }))).toMatchObject({
      diagnostics: ["placeable:index=1:ItemList:source=0:Repos_PosX:count=1:type=byte"],
    });
  });

  it("rejects a native Placeable mode-2 ItemList flag even when repository Words are valid", () => {
    const pair = fixturePair();
    const flagged = placeableInventorySourceEntry("first_item", 2, 3, 91);
    flagged.fields.push({ label: "Dropable", type: "byte", value: 1 });
    const sourceGit = withPlaceableInventory(pair.git, [flagged]);
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        inventory: {
          expectedEntries: [{ sourceIndex: 0, resRef: "first_item", x: 2, y: 3 }],
          entries: [],
        },
      } as never],
    }))).toMatchObject({
      diagnostics: ["placeable:index=1:ItemList:source=0:Dropable:unsupported_flag"],
    });
  });

  it.each([
    ["unresolved bytes", undefined, "placeable:index=1:ItemList:entry=0:missing_key=blueprintBytes"],
    ["stale bytes", Buffer.from("stale-uti"), "placeable:index=1:ItemList:entry=0:source_sha256_mismatch"],
  ])("rejects a Placeable inventory blueprint with %s", (_label, blueprintBytes, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        inventory: {
          expectedEntries: [],
          entries: [{
            resRef: "nw_cloth022",
            itemResRef: "nw_cloth022",
            itemSourceObjectKey: "nwn-base-key-uti-nw-cloth022-v1",
            itemSourceFingerprint: "606788a4d7e44de76e4c3f38ce4b2b7bae06d64721140995efa011066b5279a6",
            ...(blueprintBytes ? { blueprintBytes } : {}),
            x: 7,
            y: 8,
          }],
        },
      } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["pair", {
      expectedEntries: [], entries: [], unexpected: true,
    }, "placeable:index=1:ItemList:unexpected_key=unexpected"],
    ["expected source entry", {
      expectedEntries: [{ sourceIndex: 0, resRef: "first_item", x: 2, y: 3, unexpected: true }],
      entries: [],
    }, "placeable:index=1:ItemList:entry=0:unexpected_key=unexpected"],
    ["target source entry", {
      expectedEntries: [{ sourceIndex: 0, resRef: "first_item", x: 2, y: 3 }],
      entries: [{ sourceIndex: 0, resRef: "first_item", x: 3, y: 3, unexpected: true }],
    }, "placeable:index=1:ItemList:entry=0:unexpected_key=unexpected"],
    ["target blueprint entry", {
      expectedEntries: [],
      entries: [{
        resRef: "nw_cloth022",
        itemResRef: "nw_cloth022",
        itemSourceObjectKey: "nwn-base-key-uti-nw-cloth022-v1",
        itemSourceFingerprint: "606788a4d7e44de76e4c3f38ce4b2b7bae06d64721140995efa011066b5279a6",
        blueprintBytes: itemBlueprintFixture(),
        x: 1,
        y: 2,
        unexpected: true,
      }],
    }, "placeable:index=1:ItemList:entry=0:unexpected_key=unexpected"],
  ])("rejects an unknown key on the Placeable ItemList %s", (_label, inventory, diagnostic) => {
    const pair = fixturePair();
    const sourceGit = inventory.expectedEntries.length > 0
      ? withPlaceableInventory(pair.git, [placeableInventorySourceEntry("first_item", 2, 3, 91)])
      : pair.git;
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, inventory } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["expected", {
      expectedEntries: Array.from({ length: 1025 }, (_, sourceIndex) => ({
        sourceIndex, resRef: "first_item", x: 0, y: 0,
      })),
      entries: [],
    }],
    ["target", {
      expectedEntries: [],
      entries: Array.from({ length: 1025 }, () => ({
        resRef: "nw_cloth022",
        itemResRef: "nw_cloth022",
        itemSourceObjectKey: "nwn-base-key-uti-nw-cloth022-v1",
        itemSourceFingerprint: "606788a4d7e44de76e4c3f38ce4b2b7bae06d64721140995efa011066b5279a6",
        blueprintBytes: itemBlueprintFixture(),
        x: 0,
        y: 0,
      })),
    }],
  ])("enforces the dedicated Placeable ItemList %s-entry budget", (_label, inventory) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, inventory } as never],
    }))).toMatchObject({
      diagnostics: ["placeable:index=1:ItemList:entry_budget=1024"],
    });
  });

  it.each([
    ["null pair", null, "placeable:index=1:ItemList:invalid_pair"],
    ["primitive pair", 7, "placeable:index=1:ItemList:invalid_pair"],
    ["array pair", [], "placeable:index=1:ItemList:invalid_pair"],
    ["non-array expected list", { expectedEntries: null, entries: [] }, "placeable:index=1:ItemList:incomplete"],
    ["non-array target list", { expectedEntries: [], entries: null }, "placeable:index=1:ItemList:incomplete"],
    ["null expected entry", { expectedEntries: [null], entries: [] }, "placeable:index=1:ItemList:entry=0:invalid"],
    ["array expected entry", { expectedEntries: [[]], entries: [] }, "placeable:index=1:ItemList:entry=0:invalid"],
    ["primitive target entry", { expectedEntries: [], entries: ["item"] }, "placeable:index=1:ItemList:entry=0:invalid"],
    ["missing pair key", { expectedEntries: [] }, "placeable:index=1:ItemList:missing_key=entries"],
    ["missing source key", {
      expectedEntries: [{ sourceIndex: 0, resRef: "first_item", x: 0 }], entries: [],
    }, "placeable:index=1:ItemList:entry=0:missing_key=y"],
    ["negative source ordinal", {
      expectedEntries: [{ sourceIndex: -1, resRef: "first_item", x: 0, y: 0 }], entries: [],
    }, "placeable:index=1:ItemList:entry=0:invalid_source_index"],
    ["fractional source ordinal", {
      expectedEntries: [{ sourceIndex: 0.5, resRef: "first_item", x: 0, y: 0 }], entries: [],
    }, "placeable:index=1:ItemList:entry=0:invalid_source_index"],
    ["string source ordinal", {
      expectedEntries: [{ sourceIndex: "0", resRef: "first_item", x: 0, y: 0 }], entries: [],
    }, "placeable:index=1:ItemList:entry=0:invalid_source_index"],
    ["non-native expected ordinal", {
      expectedEntries: [{ sourceIndex: 1, resRef: "first_item", x: 0, y: 0 }], entries: [],
    }, "placeable:index=1:ItemList:entry=0:source_index=1"],
    ["non-string ResRef", {
      expectedEntries: [{ sourceIndex: 0, resRef: 7, x: 0, y: 0 }], entries: [],
    }, "placeable:index=1:ItemList:entry=0:invalid_resref"],
    ["invalid ResRef", {
      expectedEntries: [{ sourceIndex: 0, resRef: "bad-item", x: 0, y: 0 }], entries: [],
    }, "placeable:index=1:ItemList:entry=0:invalid_resref"],
    ["negative Word", {
      expectedEntries: [{ sourceIndex: 0, resRef: "first_item", x: -1, y: 0 }], entries: [],
    }, "placeable:index=1:ItemList:entry=0:x:invalid_word"],
    ["fractional Word", {
      expectedEntries: [{ sourceIndex: 0, resRef: "first_item", x: 0.5, y: 0 }], entries: [],
    }, "placeable:index=1:ItemList:entry=0:x:invalid_word"],
    ["missing retained source", {
      expectedEntries: [{ sourceIndex: 0, resRef: "first_item", x: 0, y: 0 }],
      entries: [{ sourceIndex: 1, resRef: "first_item", x: 0, y: 0 }],
    }, "placeable:index=1:ItemList:entry=0:source_identity_mismatch"],
    ["changed retained identity", {
      expectedEntries: [{ sourceIndex: 0, resRef: "first_item", x: 0, y: 0 }],
      entries: [{ sourceIndex: 0, resRef: "changed", x: 0, y: 0 }],
    }, "placeable:index=1:ItemList:entry=0:source_identity_mismatch"],
    ["unchanged exact list", {
      expectedEntries: [{ sourceIndex: 0, resRef: "first_item", x: 0, y: 0 }],
      entries: [{ sourceIndex: 0, resRef: "first_item", x: 0, y: 0 }],
    }, "placeable:index=1:ItemList:unchanged"],
  ])("rejects a normalized Placeable ItemList with %s", (_label, inventory, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, inventory } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["ResRef", { resRef: "other" }],
    ["item ResRef", { itemResRef: "other" }],
    ["profile", { itemSourceObjectKey: "other" }],
    ["fingerprint", { itemSourceFingerprint: "f".repeat(64) }],
  ])("rejects a Placeable ItemList blueprint with an unadmitted %s", (_label, override) => {
    const pair = fixturePair();
    const inventory = { expectedEntries: [], entries: [placeableInventoryBlueprint(override)] };
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, inventory } as never],
    }))).toMatchObject({
      diagnostics: ["placeable:index=1:ItemList:entry=0:profile_or_identity_mismatch"],
    });
  });

  it.each([
    ["non-buffer", "bytes", "placeable:index=1:ItemList:entry=0:blueprint_size"],
    ["oversized", Buffer.alloc(1024 * 1024 + 1), "placeable:index=1:ItemList:entry=0:blueprint_size"],
    ["exact budget", Buffer.alloc(1024 * 1024), "placeable:index=1:ItemList:entry=0:source_sha256_mismatch"],
  ])("rejects Placeable ItemList blueprint bytes that are %s", (_label, blueprintBytes, diagnostic) => {
    const pair = fixturePair();
    const inventory = {
      expectedEntries: [],
      entries: [placeableInventoryBlueprint({ blueprintBytes })],
    };
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, inventory } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["expected", {
      expectedEntries: Array.from({ length: 1024 }, (_, sourceIndex) => ({
        sourceIndex, resRef: "first_item", x: 0, y: 0,
      })),
      entries: [],
    }, "placeable:index=1:ItemList:count=0:type=missing"],
    ["target", {
      expectedEntries: [], entries: Array.from({ length: 1024 }, () => ({})),
    }, "placeable:index=1:ItemList:entry=0:missing_key=resRef"],
  ])("accepts the exact Placeable ItemList %s-entry budget", (_label, inventory, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, inventory } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["empty native list for empty provenance", (git: Buffer) => withPlaceableInventory(git, []), {
      expectedEntries: [], entries: [placeableInventoryBlueprint()],
    }, "placeable:index=1:ItemList:count=1:expected=0"],
    ["missing native list", (git: Buffer) => git, {
      expectedEntries: [{ sourceIndex: 0, resRef: "first_item", x: 2, y: 3 }], entries: [],
    }, "placeable:index=1:ItemList:count=0:type=missing"],
    ["duplicate native list", (git: Buffer) => withPlaceableInventory(
      withPlaceableInventory(git, [placeableInventorySourceEntry("first_item", 2, 3, 91)]),
      [placeableInventorySourceEntry("first_item", 2, 3, 91)],
    ), {
      expectedEntries: [{ sourceIndex: 0, resRef: "first_item", x: 2, y: 3 }], entries: [],
    }, "placeable:index=1:ItemList:count=2:type=list"],
    ["wrong native list type", (git: Buffer) => withSecondPlaceableFields(git, (fields) => [
      ...fields, { label: "ItemList", type: "byte" as const, value: 0 },
    ]), {
      expectedEntries: [{ sourceIndex: 0, resRef: "first_item", x: 2, y: 3 }], entries: [],
    }, "placeable:index=1:ItemList:count=1:type=byte"],
    ["native cardinality mismatch", (git: Buffer) => withPlaceableInventory(git, [
      placeableInventorySourceEntry("first_item", 2, 3, 91),
    ]), {
      expectedEntries: [
        { sourceIndex: 0, resRef: "first_item", x: 2, y: 3 },
        { sourceIndex: 1, resRef: "second_item", x: 4, y: 5 },
      ], entries: [],
    }, "placeable:index=1:ItemList:expected=2:actual=1"],
  ])("rejects %s", (_label, transform, inventory, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: transform(pair.git),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, inventory } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["missing TemplateResRef", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "TemplateResRef"), "TemplateResRef:count=0:type=missing"],
    ["wrong TemplateResRef type", (fields: SupportedGffField[]) => fields.map((field) => field.label === "TemplateResRef" ? { label: "TemplateResRef", type: "cexostring" as const, value: "first_item" } : field), "TemplateResRef:count=1:type=cexostring"],
    ["duplicate TemplateResRef", (fields: SupportedGffField[]) => [...fields, { label: "TemplateResRef", type: "resref" as const, value: "first_item" }], "TemplateResRef:count=2:type=resref"],
    ["missing X Word", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "Repos_PosX"), "Repos_PosX:count=0:type=missing"],
    ["duplicate Y Word", (fields: SupportedGffField[]) => [...fields, { label: "Repos_Posy", type: "word" as const, value: 3 }], "Repos_Posy:count=2:type=word"],
    ["stale X Word", (fields: SupportedGffField[]) => fields.map((field) => field.label === "Repos_PosX" ? { label: "Repos_PosX", type: "word" as const, value: 9 } : field), "Repos_PosX:expected=2:actual=9"],
    ["stale Y Word", (fields: SupportedGffField[]) => fields.map((field) => field.label === "Repos_Posy" ? { label: "Repos_Posy", type: "word" as const, value: 9 } : field), "Repos_Posy:expected=3:actual=9"],
  ])("rejects a native Placeable ItemList entry with %s", (_label, transform, detail) => {
    const pair = fixturePair();
    const entry = placeableInventorySourceEntry("first_item", 2, 3, 91);
    entry.fields = transform(entry.fields);
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withPlaceableInventory(pair.git, [entry]),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        inventory: {
          expectedEntries: [{ sourceIndex: 0, resRef: "first_item", x: 2, y: 3 }],
          entries: [],
        },
      } as never],
    }))).toMatchObject({ diagnostics: [`placeable:index=1:ItemList:source=0:${detail}`] });
  });

  it.each([
    ["non-object", null, "placeable:index=1:KeyName:invalid_pair"],
    ["primitive", 7, "placeable:index=1:KeyName:invalid_pair"],
    ["array", [], "placeable:index=1:KeyName:invalid_pair"],
    ["missing expected", { value: "key" }, "placeable:index=1:KeyName:incomplete"],
    ["missing target", { expectedValue: "" }, "placeable:index=1:KeyName:incomplete"],
    ["non-string expected", { expectedValue: 7, value: "key" }, "placeable:index=1:KeyName:invalid_expected"],
    ["over-limit target", { expectedValue: "", value: "K".repeat(33) }, "placeable:index=1:KeyName:invalid"],
    ["NUL target", { expectedValue: "", value: "bad\0key" }, "placeable:index=1:KeyName:invalid"],
    ["unchanged", { expectedValue: "", value: "" }, "placeable:index=1:KeyName:unchanged"],
  ])("rejects normalized Placeable KeyName that is %s", (_label, keyName, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, keyName } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["missing", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "KeyName"), "placeable:index=1:KeyName:count=0:type=missing"],
    ["wrong type", (fields: SupportedGffField[]) => fields.map((field) => field.label === "KeyName" ? { label: "KeyName", type: "resref" as const, value: "" } : field), "placeable:index=1:KeyName:count=1:type=resref"],
    ["duplicate", (fields: SupportedGffField[]) => [...fields, { label: "KeyName", type: "cexostring" as const, value: "" }], "placeable:index=1:KeyName:count=2:type=cexostring"],
    ["over-limit source", (fields: SupportedGffField[]) => fields.map((field) => field.label === "KeyName" ? { label: "KeyName", type: "cexostring" as const, value: "K".repeat(33) } : field), "placeable:index=1:KeyName:invalid_source"],
    ["NUL source", (fields: SupportedGffField[]) => fields.map((field) => field.label === "KeyName" ? { label: "KeyName", type: "cexostring" as const, value: "bad\0key" } : field), "placeable:index=1:KeyName:invalid_source"],
    ["stale", (fields: SupportedGffField[]) => fields, "placeable:index=1:KeyName:expected=other:actual="],
  ])("rejects a %s native Placeable KeyName", (_label, transform, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withSecondPlaceableFields(pair.git, transform),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        keyName: { expectedValue: _label === "stale" ? "other" : "", value: "key" },
      }] as never,
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["not an array", null, "placeable:index=1:lockFields:invalid_list"],
    ["empty", [], "placeable:index=1:lockFields:empty"],
    ["null entry", [null], "placeable:index=1:lockFields:entry=0:invalid"],
    ["primitive entry", [7], "placeable:index=1:lockFields:entry=0:invalid"],
    ["array entry", [[]], "placeable:index=1:lockFields:entry=0:invalid"],
    ["unsupported", [{ field: "KeyName", expectedValue: "", value: "key" }], "placeable:index=1:KeyName:unsupported_lock_field"],
    ["duplicate", [
      { field: "Locked", expectedValue: false, value: true },
      { field: "Locked", expectedValue: false, value: true },
    ], "placeable:index=1:Locked:duplicate"],
    ["out of order", [
      { field: "OpenLockDC", expectedValue: 18, value: 24 },
      { field: "Locked", expectedValue: false, value: true },
    ], "placeable:index=1:Locked:out_of_order"],
    ["partial", [{ field: "Locked", expectedValue: false }], "placeable:index=1:Locked:incomplete"],
    ["expected missing", [{ field: "Locked", value: true }], "placeable:index=1:Locked:incomplete"],
    ["invalid expected boolean", [{ field: "Locked", expectedValue: 0, value: true }], "placeable:index=1:Locked:invalid_expected_boolean"],
    ["invalid boolean", [{ field: "Locked", expectedValue: false, value: 1 }], "placeable:index=1:Locked:invalid_boolean"],
    ["invalid expected DC", [{ field: "OpenLockDC", expectedValue: "18", value: 24 }], "placeable:index=1:OpenLockDC:invalid_expected_byte"],
    ["invalid DC", [{ field: "OpenLockDC", expectedValue: 18, value: 256 }], "placeable:index=1:OpenLockDC:invalid_byte"],
    ["negative DC", [{ field: "OpenLockDC", expectedValue: 18, value: -1 }], "placeable:index=1:OpenLockDC:invalid_byte"],
    ["fractional DC", [{ field: "OpenLockDC", expectedValue: 18, value: 1.5 }], "placeable:index=1:OpenLockDC:invalid_byte"],
    ["unchanged", [{ field: "OpenLockDC", expectedValue: 18, value: 18 }], "placeable:index=1:OpenLockDC:unchanged"],
  ])("rejects normalized Placeable lock fields that are %s", (_label, lockFields, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, lockFields } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["missing", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "Locked"), "placeable:index=1:Locked:count=0:type=missing"],
    ["wrong type", (fields: SupportedGffField[]) => fields.map((field) => field.label === "Locked" ? { label: "Locked", type: "int" as const, value: 0 } : field), "placeable:index=1:Locked:count=1:type=int"],
    ["duplicate", (fields: SupportedGffField[]) => [...fields, { label: "Locked", type: "byte" as const, value: 0 }], "placeable:index=1:Locked:count=2:type=byte"],
    ["stale", (fields: SupportedGffField[]) => fields, "placeable:index=1:Locked:expected=true:actual=false"],
    ["non-boolean", (fields: SupportedGffField[]) => fields.map((field) => field.label === "Locked" ? { label: "Locked", type: "byte" as const, value: 2 } : field), "placeable:index=1:Locked:invalid_byte=2"],
  ])("rejects a %s native Placeable lock Byte", (_label, transform, diagnostic) => {
    const pair = fixturePair();
    const sourceGit = withSecondPlaceableFields(pair.git, transform);
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        lockFields: [{ field: "Locked", expectedValue: _label === "stale", value: _label !== "stale" }],
      }],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it("rewrites both placeable trap script ResRefs while preserving every other field and GIC byte", () => {
    const pair = fixturePair();
    const sourcePlaceable = list(parseRawGffDocument(pair.git), "Placeable List")!.value[1]!;
    const trapScripts = [
      { field: "OnDisarm", expectedResRef: "old_disarm", resRef: "new_disarm" },
      { field: "OnTrapTriggered", expectedResRef: "old_trap", resRef: "new_trap" },
    ] as const;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, trapScripts }],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.placeable).toBe(1);
    const candidate = list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[1]!;
    expect(candidate.fields).toEqual(expect.arrayContaining([
      { label: "OnDisarm", type: "resref", value: "new_disarm" },
      { label: "OnTrapTriggered", type: "resref", value: "new_trap" },
    ]));
    const labels = new Set(["OnDisarm", "OnTrapTriggered"]);
    expect(candidate.fields.filter((field) => !labels.has(field.label)))
      .toEqual(sourcePlaceable.fields.filter((field) => !labels.has(field.label)));
  });

  it.each([
    ["a non-array list", "invalid", "placeable:index=1:trapScripts:invalid_list"],
    ["an empty list", [], "placeable:index=1:trapScripts:empty"],
    ["an invalid entry", [null], "placeable:index=1:trapScripts:entry=0:invalid"],
    ["a primitive entry", ["invalid"], "placeable:index=1:trapScripts:entry=0:invalid"],
    ["an array entry", [[]], "placeable:index=1:trapScripts:entry=0:invalid"],
    ["an unsupported field", [{ field: "OnOpen", expectedResRef: "old_open", resRef: "new_open" }], "placeable:index=1:OnOpen:unsupported_trap_field"],
    ["a duplicate field", [
      { field: "OnDisarm", expectedResRef: "old_disarm", resRef: "new_disarm" },
      { field: "OnDisarm", expectedResRef: "old_disarm", resRef: "other_disarm" },
    ], "placeable:index=1:OnDisarm:duplicate"],
    ["an incomplete pair", [{ field: "OnDisarm", expectedResRef: "old_disarm" }], "placeable:index=1:OnDisarm:incomplete"],
    ["a pair without an expected value", [{ field: "OnDisarm", resRef: "new_disarm" }], "placeable:index=1:OnDisarm:incomplete"],
    ["an invalid expected value", [{ field: "OnDisarm", expectedResRef: "bad-script", resRef: "new_disarm" }], "placeable:index=1:OnDisarm:invalid_expected_resref"],
    ["an invalid target value", [{ field: "OnDisarm", expectedResRef: "old_disarm", resRef: "bad-script" }], "placeable:index=1:OnDisarm:invalid_resref"],
    ["an unchanged value", [{ field: "OnDisarm", expectedResRef: "old_disarm", resRef: "old_disarm" }], "placeable:index=1:OnDisarm:unchanged"],
  ])("rejects a normalized placeable trap script mutation with %s", (_label, trapScripts, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, trapScripts } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["missing", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "OnDisarm"), "placeable:index=1:OnDisarm:count=0:type=missing"],
    ["wrong type", (fields: SupportedGffField[]) => fields.map((field) => field.label === "OnDisarm" ? { label: "OnDisarm", type: "cexostring" as const, value: "old_disarm" } : field), "placeable:index=1:OnDisarm:count=1:type=cexostring"],
    ["duplicate", (fields: SupportedGffField[]) => [...fields, { label: "OnDisarm", type: "resref" as const, value: "old_disarm" }], "placeable:index=1:OnDisarm:count=2:type=resref"],
    ["stale", (fields: SupportedGffField[]) => fields, "placeable:index=1:OnDisarm:expected=stale:actual=old_disarm"],
  ])("rejects a placeable trap script with a %s native field", (label, transform, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withSecondPlaceableFields(pair.git, transform),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        trapScripts: [{
          field: "OnDisarm",
          expectedResRef: label === "stale" ? "stale" : "old_disarm",
          resRef: "new_disarm",
        }],
      }],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["a non-array list", "invalid", "placeable:index=1:scripts:invalid_list"],
    ["an empty list", [], "placeable:index=1:scripts:empty"],
    ["an invalid entry", [null], "placeable:index=1:scripts:entry=0:invalid"],
    ["a primitive entry", ["invalid"], "placeable:index=1:scripts:entry=0:invalid"],
    ["an array entry", [[]], "placeable:index=1:scripts:entry=0:invalid"],
    ["an unsupported field", [{ field: "OnFailToOpen", expectedResRef: "", resRef: "new_fail" }], "placeable:index=1:OnFailToOpen:unsupported_field"],
    ["an incomplete pair", [{ field: "OnOpen", expectedResRef: "old_open" }], "placeable:index=1:OnOpen:incomplete"],
    ["a pair without an expected value", [{ field: "OnOpen", resRef: "new_open" }], "placeable:index=1:OnOpen:incomplete"],
    ["an invalid expected ResRef", [{ field: "OnOpen", expectedResRef: "bad-script", resRef: "new_open" }], "placeable:index=1:OnOpen:invalid_expected_resref"],
    ["an invalid target ResRef", [{ field: "OnOpen", expectedResRef: "old_open", resRef: "bad-script" }], "placeable:index=1:OnOpen:invalid_resref"],
    ["an unchanged value", [{ field: "OnOpen", expectedResRef: "old_open", resRef: "old_open" }], "placeable:index=1:OnOpen:unchanged"],
    ["a duplicate field", [
      { field: "OnOpen", expectedResRef: "old_open", resRef: "new_open" },
      { field: "OnOpen", expectedResRef: "old_open", resRef: "other_open" },
    ], "placeable:index=1:OnOpen:duplicate"],
  ])("rejects a normalized placeable script mutation with %s", (_label, scripts, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, scripts } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["missing", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "OnOpen"), "placeable:index=1:OnOpen:count=0:type=missing"],
    ["wrong native type", (fields: SupportedGffField[]) => fields.map((field) => field.label === "OnOpen" ? { label: "OnOpen", type: "cexostring" as const, value: "old_open" } : field), "placeable:index=1:OnOpen:count=1:type=cexostring"],
    ["duplicate", (fields: SupportedGffField[]) => [...fields, { label: "OnOpen", type: "resref" as const, value: "old_open" }], "placeable:index=1:OnOpen:count=2:type=resref"],
    ["stale", (fields: SupportedGffField[]) => fields, "placeable:index=1:OnOpen:expected=stale:actual=old_open"],
  ])("rejects a placeable script mutation with a %s native field", (label, transform, diagnostic) => {
    const pair = fixturePair();
    const sourceGit = withSecondPlaceableFields(pair.git, transform);
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        scripts: [{
          field: "OnOpen",
          expectedResRef: label === "stale" ? "stale" : "old_open",
          resRef: "new_open",
        }],
      }],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["missing Static", "Static", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "Static"), "placeable:index=1:Static:count=0:type=missing"],
    ["wrong Static type", "Static", (fields: SupportedGffField[]) => fields.map((field) => field.label === "Static" ? { label: "Static", type: "int" as const, value: 1 } : field), "placeable:index=1:Static:count=1:type=int"],
    ["duplicate Static", "Static", (fields: SupportedGffField[]) => [...fields, { label: "Static", type: "byte" as const, value: 1 }], "placeable:index=1:Static:count=2:type=byte"],
    ["non-boolean Static byte", "Static", (fields: SupportedGffField[]) => fields.map((field) => field.label === "Static" ? { label: "Static", type: "byte" as const, value: 2 } : field), "placeable:index=1:Static:invalid_byte=2"],
    ["missing Useable", "Useable", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "Useable"), "placeable:index=1:Useable:count=0:type=missing"],
    ["wrong Useable type", "Useable", (fields: SupportedGffField[]) => fields.map((field) => field.label === "Useable" ? { label: "Useable", type: "int" as const, value: 0 } : field), "placeable:index=1:Useable:count=1:type=int"],
    ["duplicate Useable", "Useable", (fields: SupportedGffField[]) => [...fields, { label: "Useable", type: "byte" as const, value: 0 }], "placeable:index=1:Useable:count=2:type=byte"],
    ["non-boolean Useable byte", "Useable", (fields: SupportedGffField[]) => fields.map((field) => field.label === "Useable" ? { label: "Useable", type: "byte" as const, value: 2 } : field), "placeable:index=1:Useable:invalid_byte=2"],
    ["missing Plot", "Plot", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "Plot"), "placeable:index=1:Plot:count=0:type=missing"],
    ["wrong Plot type", "Plot", (fields: SupportedGffField[]) => fields.map((field) => field.label === "Plot" ? { label: "Plot", type: "int" as const, value: 0 } : field), "placeable:index=1:Plot:count=1:type=int"],
    ["duplicate Plot", "Plot", (fields: SupportedGffField[]) => [...fields, { label: "Plot", type: "byte" as const, value: 0 }], "placeable:index=1:Plot:count=2:type=byte"],
    ["non-boolean Plot byte", "Plot", (fields: SupportedGffField[]) => fields.map((field) => field.label === "Plot" ? { label: "Plot", type: "byte" as const, value: 2 } : field), "placeable:index=1:Plot:invalid_byte=2"],
    ["missing HasInventory", "HasInventory", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "HasInventory"), "placeable:index=1:HasInventory:count=0:type=missing"],
    ["wrong HasInventory type", "HasInventory", (fields: SupportedGffField[]) => fields.map((field) => field.label === "HasInventory" ? { label: "HasInventory", type: "int" as const, value: 0 } : field), "placeable:index=1:HasInventory:count=1:type=int"],
    ["duplicate HasInventory", "HasInventory", (fields: SupportedGffField[]) => [...fields, { label: "HasInventory", type: "byte" as const, value: 0 }], "placeable:index=1:HasInventory:count=2:type=byte"],
    ["non-boolean HasInventory byte", "HasInventory", (fields: SupportedGffField[]) => fields.map((field) => field.label === "HasInventory" ? { label: "HasInventory", type: "byte" as const, value: 2 } : field), "placeable:index=1:HasInventory:invalid_byte=2"],
  ])("rejects a placeable with %s", (_label, fieldLabel, transform, diagnostic) => {
    const pair = fixturePair();
    const sourceGit = withSecondPlaceableFields(pair.git, transform);
    const propertyMutation = fieldLabel === "Static"
      ? { kind: "placeable" as const, sourceIndex: 1, expectedStatic: true, static: false }
      : fieldLabel === "Useable"
        ? { kind: "placeable" as const, sourceIndex: 1, expectedUseable: false, useable: true }
        : fieldLabel === "Plot"
          ? { kind: "placeable" as const, sourceIndex: 1, expectedPlot: false, plot: true }
          : { kind: "placeable" as const, sourceIndex: 1, expectedHasInventory: false, hasInventory: true };
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [propertyMutation],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["invalid target", { expectedOnUsed: "old_script", onUsed: "bad-script" }, "placeable:index=1:OnUsed:invalid_resref"],
    ["stale expected value", { expectedOnUsed: "stale", onUsed: "s04_plcprobe" }, "placeable:index=1:OnUsed:expected=stale:actual=old_script"],
  ])("rejects an existing-placeable OnUsed mutation with %s", (_label, values, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, ...values }],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [diagnostic],
    });
  });

  it.each([
    ["unsupported family", { kind: "door", sourceIndex: 0, expectedOnUsed: "old_script", onUsed: "new_script" }, "kind=door"],
    ["negative ordinal", { kind: "placeable", sourceIndex: -1, expectedOnUsed: "old_script", onUsed: "new_script" }, "placeable:index=-1:count=2"],
    ["fractional ordinal", { kind: "placeable", sourceIndex: 0.5, expectedOnUsed: "old_script", onUsed: "new_script" }, "placeable:index=0.5:count=2"],
    ["ordinal at count", { kind: "placeable", sourceIndex: 2, expectedOnUsed: "old_script", onUsed: "new_script" }, "placeable:index=2:count=2"],
    ["invalid expected", { kind: "placeable", sourceIndex: 1, expectedOnUsed: "bad-script", onUsed: "new_script" }, "placeable:index=1:OnUsed:invalid_expected_resref"],
    ["unchanged value", { kind: "placeable", sourceIndex: 1, expectedOnUsed: "old_script", onUsed: "old_script" }, "placeable:index=1:OnUsed:unchanged"],
  ])("rejects a normalized placeable property mutation with %s", (_label, mutation, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [mutation as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["empty payload", {}, "placeable:index=1:property:empty"],
    ["OnUsed expected only", { expectedOnUsed: "old_script" }, "placeable:index=1:OnUsed:invalid_resref"],
    ["OnUsed target only", { onUsed: "new_script" }, "placeable:index=1:OnUsed:invalid_expected_resref"],
    ["Static expected only", { expectedStatic: true }, "placeable:index=1:Static:invalid_boolean"],
    ["Static target only", { static: false }, "placeable:index=1:Static:invalid_expected_boolean"],
    ["invalid Static expected", { expectedStatic: 1, static: false }, "placeable:index=1:Static:invalid_expected_boolean"],
    ["invalid Static target", { expectedStatic: true, static: 0 }, "placeable:index=1:Static:invalid_boolean"],
    ["unchanged Static", { expectedStatic: true, static: true }, "placeable:index=1:Static:unchanged"],
    ["Useable expected only", { expectedUseable: false }, "placeable:index=1:Useable:invalid_boolean"],
    ["Useable target only", { useable: true }, "placeable:index=1:Useable:invalid_expected_boolean"],
    ["invalid Useable expected", { expectedUseable: 0, useable: true }, "placeable:index=1:Useable:invalid_expected_boolean"],
    ["invalid Useable target", { expectedUseable: false, useable: 1 }, "placeable:index=1:Useable:invalid_boolean"],
    ["unchanged Useable", { expectedUseable: false, useable: false }, "placeable:index=1:Useable:unchanged"],
    ["Plot expected only", { expectedPlot: false }, "placeable:index=1:Plot:invalid_boolean"],
    ["Plot target only", { plot: true }, "placeable:index=1:Plot:invalid_expected_boolean"],
    ["invalid Plot expected", { expectedPlot: 0, plot: true }, "placeable:index=1:Plot:invalid_expected_boolean"],
    ["invalid Plot target", { expectedPlot: false, plot: 1 }, "placeable:index=1:Plot:invalid_boolean"],
    ["unchanged Plot", { expectedPlot: false, plot: false }, "placeable:index=1:Plot:unchanged"],
    ["HasInventory expected only", { expectedHasInventory: false }, "placeable:index=1:HasInventory:invalid_boolean"],
    ["HasInventory target only", { hasInventory: true }, "placeable:index=1:HasInventory:invalid_expected_boolean"],
    ["invalid HasInventory expected", { expectedHasInventory: 0, hasInventory: true }, "placeable:index=1:HasInventory:invalid_expected_boolean"],
    ["invalid HasInventory target", { expectedHasInventory: false, hasInventory: 1 }, "placeable:index=1:HasInventory:invalid_boolean"],
    ["unchanged HasInventory", { expectedHasInventory: false, hasInventory: false }, "placeable:index=1:HasInventory:unchanged"],
  ])("rejects a normalized placeable property mutation with %s", (_label, values, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, ...values } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    ["Static", { expectedStatic: false, static: true }, "placeable:index=1:Static:expected=false:actual=true"],
    ["Useable", { expectedUseable: true, useable: false }, "placeable:index=1:Useable:expected=true:actual=false"],
    ["Plot", { expectedPlot: true, plot: false }, "placeable:index=1:Plot:expected=true:actual=false"],
    ["HasInventory", { expectedHasInventory: true, hasInventory: false }, "placeable:index=1:HasInventory:expected=true:actual=false"],
  ])("rejects stale %s provenance at the native Byte writer", (_label, values, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "placeable", sourceIndex: 1, ...values }],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it("rejects duplicate normalized placeable property mutations", () => {
    const pair = fixturePair();
    const mutation = {
      kind: "placeable" as const,
      sourceIndex: 1,
      expectedOnUsed: "old_script",
      onUsed: "new_script",
    };
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [mutation, mutation],
    }))).toMatchObject({ diagnostics: ["placeable:index=1:OnUsed:duplicate"] });
  });

  it("labels duplicate normalized ItemList-only mutations with the exact native field", () => {
    const pair = fixturePair();
    const mutation = {
      kind: "placeable" as const,
      sourceIndex: 1,
      inventory: {
        expectedEntries: [],
        entries: [placeableInventoryBlueprint()],
      },
    } as never;
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [mutation, mutation],
    }))).toMatchObject({ diagnostics: ["placeable:index=1:ItemList:duplicate"] });
  });

  it.each([
    ["Conversation", { conversation: { expectedResRef: "", resRef: "dialog" } }, "placeable:index=1:Conversation:duplicate"],
    ["Interruptable", { interruptable: { expectedValue: 1, value: 0 } }, "placeable:index=1:Interruptable:duplicate"],
    ["AnimationState", { animationState: { expectedValue: 0, value: 1 } }, "placeable:index=1:AnimationState:duplicate"],
    ["Comment", { editorComment: { expectedValue: "placeable-comment-2", value: "new" } }, "placeable:index=1:Comment:duplicate"],
    ["HP / CurrentHP", { hitPoints: {
      expectedHitPoints: 15,
      hitPoints: 30,
      expectedCurrentHitPoints: 15,
      currentHitPoints: 30,
    } }, "placeable:index=1:HP+CurrentHP:duplicate"],
    ["Tag", { tag: { expectedValue: "PLACEABLE_2", value: "new" } }, "placeable:index=1:Tag:duplicate"],
    ["trap Byte", { trapFields: [{ field: "TrapFlag", expectedValue: 0, value: 1 }] }, "placeable:index=1:TrapFlag:duplicate"],
  ])("labels duplicate normalized %s-only mutations with the exact native field", (_label, values, diagnostic) => {
    const pair = fixturePair();
    const mutation = {
      kind: "placeable" as const,
      sourceIndex: 1,
      ...values,
    } as never;
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [mutation, mutation],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it("labels a combined duplicate AnimationState and Comment mutation with both native fields", () => {
    const pair = fixturePair();
    const mutation = {
      kind: "placeable" as const,
      sourceIndex: 1,
      animationState: { expectedValue: 0, value: 1 },
      editorComment: { expectedValue: "placeable-comment-2", value: "new" },
    } as const;
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [mutation, mutation],
    }))).toMatchObject({
      diagnostics: ["placeable:index=1:AnimationState+Comment:duplicate"],
    });
  });

  it("labels duplicate normalized KeyName-only mutations with the exact native field", () => {
    const pair = fixturePair();
    const mutation = {
      kind: "placeable" as const,
      sourceIndex: 1,
      keyName: { expectedValue: "", value: "key" },
    };
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [mutation, mutation],
    }))).toMatchObject({ diagnostics: ["placeable:index=1:KeyName:duplicate"] });
  });

  it("labels a duplicate Static-only property mutation without inventing OnUsed", () => {
    const pair = fixturePair();
    const mutation = {
      kind: "placeable" as const,
      sourceIndex: 1,
      expectedStatic: true,
      static: false,
    };
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [mutation, mutation],
    }))).toMatchObject({ diagnostics: ["placeable:index=1:Static:duplicate"] });
  });

  it("rejects deleting and mutating the same immutable placeable ordinal", () => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [{ kind: "placeable", sourceIndex: 1 }],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        expectedOnUsed: "old_script",
        onUsed: "s04_plcprobe",
      }],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: ["placeable:index=1:deleted"],
    });
  });

  it.each([
    [
      "missing",
      (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "OnUsed"),
      "placeable:index=1:OnUsed:count=0:type=missing",
    ],
    [
      "wrong native type",
      (fields: SupportedGffField[]) => fields.map((field) => field.label === "OnUsed"
        ? { label: "OnUsed", type: "cexostring" as const, value: "old_script" }
        : field),
      "placeable:index=1:OnUsed:count=1:type=cexostring",
    ],
    [
      "duplicate",
      (fields: SupportedGffField[]) => [
        ...fields,
        { label: "OnUsed", type: "resref" as const, value: "old_script" },
      ],
      "placeable:index=1:OnUsed:count=2:type=resref",
    ],
  ])("rejects a placeable with a %s OnUsed field", (_label, transform, diagnostic) => {
    const pair = fixturePair();
    const sourceGit = withSecondPlaceableFields(pair.git, transform);
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "placeable",
        sourceIndex: 1,
        expectedOnUsed: "old_script",
        onUsed: "s04_plcprobe",
      }],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [diagnostic],
    });
  });

  it("verifies the independent candidate with the correct ordinal shift after an earlier deletion", () => {
    const pair = fixturePair();
    const mutation = {
      kind: "placeable" as const,
      sourceIndex: 1,
      expectedOnUsed: "old_script",
      onUsed: "s04_plcprobe",
    };
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [{ kind: "placeable", sourceIndex: 0 }],
      propertyMutations: [mutation],
    });
    expect(list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value).toHaveLength(1);
    expect(list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value[0]!.fields)
      .toContainEqual({ label: "OnUsed", type: "resref", value: "s04_plcprobe" });
  });

  it("fails closed when independent OnUsed readback is absent or differs", () => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const mutation = {
      kind: "placeable" as const,
      sourceIndex: 1,
      expectedOnUsed: "old_script",
      onUsed: "s04_plcprobe",
    };
    const mutations = new Map([["placeable:1", mutation]]);
    expect(() => verifyObjectPropertyMutations(
      buildGffBuffer(source.fields.filter((field) => field.label !== "Placeable List"), "GIT ", ROOT_TYPE),
      mutations,
      new Map(),
      source,
    )).toThrow(expect.objectContaining({
      code: "AREA_UPDATE_COMPANION_MISMATCH",
      diagnostics: ["git:placeable:OnUsed:readback_missing"],
    }));
    expect(() => verifyObjectPropertyMutations(pair.git, mutations, new Map(), source))
      .toThrow(expect.objectContaining({
        diagnostics: ["placeable:source=1:candidate=1:OnUsed:preservation_mismatch"],
      }));
    const candidate = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [{ kind: "placeable", sourceIndex: 0 }],
      propertyMutations: [mutation],
    }).gitBytes;
    expect(() => verifyObjectPropertyMutations(
      candidate,
      mutations,
      new Map([["placeable", new Set([0, 2])]]),
      source,
    )).not.toThrow();
    expect(() => verifyObjectPropertyMutations(
      candidate,
      mutations,
      new Map([["placeable", new Set([0, 1])]]),
      source,
    )).not.toThrow();
    const sourceWithoutPlaceables = parseRawGffDocument(buildGffBuffer(
      source.fields.filter((field) => field.label !== "Placeable List"),
      "GIT ",
      ROOT_TYPE,
    ))!;
    expect(() => verifyObjectPropertyMutations(candidate, mutations, new Map(), sourceWithoutPlaceables))
      .toThrow(expect.objectContaining({
        diagnostics: ["git:placeable:OnUsed:readback_missing"],
      }));
    expect(() => verifyObjectPropertyMutations(Buffer.from("invalid"), new Map(), new Map(), source))
      .not.toThrow();
  });

  it("fails closed with the exact native script label when placeable script readback differs", () => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const mutation = {
      kind: "placeable" as const,
      sourceIndex: 1,
      scripts: [{ field: "OnOpen" as const, expectedResRef: "old_open", resRef: "new_open" }],
    };
    const mutations = new Map([["placeable:1", mutation]]);

    expect(() => verifyObjectPropertyMutations(
      buildGffBuffer(source.fields.filter((field) => field.label !== "Placeable List"), "GIT ", ROOT_TYPE),
      mutations,
      new Map(),
      source,
    )).toThrow(expect.objectContaining({
      diagnostics: ["git:placeable:OnOpen:readback_missing"],
    }));
    expect(() => verifyObjectPropertyMutations(pair.git, mutations, new Map(), source))
      .toThrow(expect.objectContaining({
        diagnostics: ["placeable:source=1:candidate=1:OnOpen:preservation_mismatch"],
      }));
  });

  it("fails closed with combined property labels when Static and Useable readback is unavailable or unchanged", () => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const mutation = {
      kind: "placeable" as const,
      sourceIndex: 1,
      expectedOnUsed: "old_script",
      onUsed: "s04_plcprobe",
      expectedStatic: true,
      static: false,
      expectedUseable: false,
      useable: true,
    };
    const mutations = new Map([["placeable:1", mutation]]);
    expect(pairError(() => verifyObjectPropertyMutations(
      buildGffBuffer(source.fields.filter((field) => field.label !== "Placeable List"), "GIT ", ROOT_TYPE),
      mutations,
      new Map(),
      source,
    ))).toMatchObject({
      diagnostics: ["git:placeable:property:readback_missing"],
    });
    expect(() => verifyObjectPropertyMutations(pair.git, mutations, new Map(), source))
      .toThrow(expect.objectContaining({
        diagnostics: ["placeable:source=1:candidate=1:OnUsed+Static+Useable:preservation_mismatch"],
      }));

    const mixedMutations = new Map<string, ExistingAreaObjectPropertyMutation>([
      ["placeable:0", {
        kind: "placeable",
        sourceIndex: 0,
        expectedStatic: true,
        static: false,
      }],
      ["placeable:1", {
        kind: "placeable",
        sourceIndex: 1,
        expectedOnUsed: "old_script",
        onUsed: "s04_plcprobe",
      }],
    ]);
    expect(pairError(() => verifyObjectPropertyMutations(
      buildGffBuffer(source.fields.filter((field) => field.label !== "Placeable List"), "GIT ", ROOT_TYPE),
      mixedMutations,
      new Map(),
      source,
    ))).toMatchObject({
      diagnostics: ["git:placeable:property:readback_missing"],
    });
  });

  it("transforms native waypoint position and orientation-vector fields while preserving GIC bytes", () => {
    const pair = fixturePair();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{
        kind: "waypoint",
        sourceIndex: 0,
        x: 3.5,
        y: 4.75,
        z: 0.35,
        bearing: Math.PI * 1.25,
      }],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.transformedCounts).toEqual(expect.objectContaining({
      creature: 0,
      placeable: 0,
      waypoint: 1,
    }));
    const waypoint = list(parseRawGffDocument(result.gitBytes), "WaypointList")!.value[0]!;
    expect(waypoint.fields).toEqual(expect.arrayContaining([
      { label: "Tag", type: "cexostring", value: "WAYPOINT_1" },
      { label: "UnknownWaypointF", type: "int", value: 101 },
      { label: "XPosition", type: "float", value: 35 },
      { label: "YPosition", type: "float", value: 47.5 },
      { label: "ZPosition", type: "float", value: 3.5 },
      { label: "XOrientation", type: "float", value: Math.fround(Math.cos(Math.PI * 1.25)) },
      { label: "YOrientation", type: "float", value: Math.fround(-Math.sin(Math.PI * 1.25)) },
    ]));
  });

  it("constructs a paired native waypoint from a verified UTW blueprint", () => {
    const pair = fixturePair();
    const blueprint = waypointBlueprint();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [waypointAddition(blueprint, {
        x: 3.3116241455078125,
        y: 4.7747222900390625,
        z: 0.35019426345825195,
        bearing: Math.PI * 1.5,
      })],
    });

    expect(result.addedCounts).toEqual({
      creature: 0,
      door: 0,
      encounter: 0,
      item: 0,
      placeable: 0,
      sound: 0,
      store: 0,
      trigger: 0,
      waypoint: 1,
    });
    expect(result.candidate.counts.waypoint).toBe(result.source.counts.waypoint + 1);
    const gitEntry = list(parseRawGffDocument(result.gitBytes), "WaypointList")!.value.at(-1)!;
    const gicEntry = list(parseRawGffDocument(result.gicBytes), "WaypointList")!.value.at(-1)!;
    expect(gitEntry).toEqual({
      typeId: 5,
      fields: [
        { label: "Appearance", type: "byte", value: 1 },
        { label: "LinkedTo", type: "cexostring", value: "" },
        { label: "TemplateResRef", type: "resref", value: "nw_waypoint001" },
        { label: "Tag", type: "cexostring", value: "NW_WAYPOINT001" },
        { label: "LocalizedName", type: "cexolocstring", value: { strRef: 14817, entries: [] } },
        { label: "Description", type: "cexolocstring", value: { strRef: 0xffffffff, entries: [] } },
        { label: "HasMapNote", type: "byte", value: 0 },
        { label: "MapNote", type: "cexolocstring", value: { strRef: 0xffffffff, entries: [] } },
        { label: "MapNoteEnabled", type: "byte", value: 1 },
        { label: "XPosition", type: "float", value: Math.fround(33.116241455078125) },
        { label: "YPosition", type: "float", value: Math.fround(47.747222900390625) },
        { label: "ZPosition", type: "float", value: Math.fround(3.5019426345825195) },
        { label: "XOrientation", type: "float", value: Math.fround(Math.cos(Math.PI * 1.5)) },
        { label: "YOrientation", type: "float", value: Math.fround(-Math.sin(Math.PI * 1.5)) },
      ],
    });
    expect(gicEntry).toEqual({
      typeId: 5,
      fields: [{ label: "Comment", type: "cexostring", value: "Patrol path waypoint." }],
    });
    expect(gitEntry.fields.some((field) => field.label === "PaletteID")).toBe(false);
  });

  it("constructs a paired native sound from the verified animalcriesday UTS blueprint", () => {
    const pair = fixturePair();
    const blueprint = soundBlueprint();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [soundAddition(blueprint, { x: 3.775657653808594, y: 4.936048889160156, z: 0.15100003480911255, bearing: 0 })],
    });

    expect(result.addedCounts).toEqual(expect.objectContaining({ sound: 1, waypoint: 0 }));
    expect(result.candidate.counts.sound).toBe(result.source.counts.sound + 1);
    const gitEntry = list(parseRawGffDocument(result.gitBytes), "SoundList")!.value.at(-1)!;
    const gicEntry = list(parseRawGffDocument(result.gicBytes), "SoundList")!.value.at(-1)!;
    expect(gitEntry).toEqual({
      typeId: 6,
      fields: [
        { label: "Tag", type: "cexostring", value: "AnimalCriesDay" },
        { label: "LocName", type: "cexolocstring", value: { strRef: 67786, entries: [] } },
        { label: "TemplateResRef", type: "resref", value: "animalcriesday" },
        { label: "Active", type: "byte", value: 1 },
        { label: "Continuous", type: "byte", value: 1 },
        { label: "Looping", type: "byte", value: 0 },
        { label: "Positional", type: "byte", value: 1 },
        { label: "RandomPosition", type: "byte", value: 1 },
        { label: "Random", type: "byte", value: 1 },
        { label: "Elevation", type: "float", value: 1.5 },
        { label: "MaxDistance", type: "float", value: 10 },
        { label: "MinDistance", type: "float", value: 1 },
        { label: "RandomRangeX", type: "float", value: 10 },
        { label: "RandomRangeY", type: "float", value: 10 },
        { label: "Interval", type: "dword", value: 25000 },
        { label: "IntervalVrtn", type: "dword", value: 5000 },
        { label: "PitchVariation", type: "float", value: Math.fround(0.2) },
        { label: "Priority", type: "byte", value: 20 },
        { label: "Hours", type: "dword", value: 0 },
        { label: "Times", type: "byte", value: 3 },
        { label: "Volume", type: "byte", value: 127 },
        { label: "VolumeVrtn", type: "byte", value: 0 },
        {
          label: "Sounds",
          type: "list",
          value: ["as_an_cryday1", "as_an_cryday2", "as_an_cryday3", "as_an_cryday4"].map((value) => ({
            typeId: 0,
            fields: [{ label: "Sound", type: "resref" as const, value }],
          })),
        },
        { label: "GeneratedType", type: "dword", value: 0 },
        { label: "XPosition", type: "float", value: Math.fround(37.75657653808594) },
        { label: "YPosition", type: "float", value: Math.fround(49.36048889160156) },
        { label: "ZPosition", type: "float", value: Math.fround(1.5100003480911255) },
      ],
    });
    expect(gicEntry).toEqual({
      typeId: 6,
      fields: [
        { label: "PlayInToolset", type: "byte", value: 1 },
        { label: "Comment", type: "cexostring", value: "" },
      ],
    });
    expect(gitEntry.fields.some((field) => field.label === "PaletteID")).toBe(false);
  });

  it("constructs a paired native placeable from the verified plc_watertrough UTP blueprint", () => {
    const pair = fixturePair();
    const blueprint = placeableBlueprint();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [placeableAddition(blueprint, {
        x: 2.744,
        y: 2.976,
        z: 0.125,
        bearing: Math.PI / 3,
      })],
    });

    expect(result.addedCounts).toEqual(expect.objectContaining({ placeable: 1, sound: 0, waypoint: 0 }));
    expect(result.candidate.counts.placeable).toBe(result.source.counts.placeable + 1);
    const gitEntry = list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value.at(-1)!;
    const gicEntry = list(parseRawGffDocument(result.gicBytes), "Placeable List")!.value.at(-1)!;
    expect(gitEntry).toEqual({
      typeId: 9,
      fields: [
        { label: "Tag", type: "cexostring", value: "WaterTrough" },
        { label: "LocName", type: "cexolocstring", value: { strRef: 5747, entries: [] } },
        { label: "Description", type: "cexolocstring", value: { strRef: 14751, entries: [] } },
        { label: "TemplateResRef", type: "resref", value: "plc_watertrough" },
        { label: "AutoRemoveKey", type: "byte", value: 0 },
        { label: "CloseLockDC", type: "byte", value: 0 },
        { label: "Conversation", type: "resref", value: "" },
        { label: "Interruptable", type: "byte", value: 1 },
        { label: "Faction", type: "dword", value: 1 },
        { label: "Plot", type: "byte", value: 0 },
        { label: "KeyRequired", type: "byte", value: 0 },
        { label: "Lockable", type: "byte", value: 0 },
        { label: "Locked", type: "byte", value: 0 },
        { label: "OpenLockDC", type: "byte", value: 18 },
        { label: "PortraitId", type: "word", value: 462 },
        { label: "TrapDetectable", type: "byte", value: 1 },
        { label: "TrapDetectDC", type: "byte", value: 0 },
        { label: "TrapDisarmable", type: "byte", value: 1 },
        { label: "DisarmDC", type: "byte", value: 15 },
        { label: "TrapFlag", type: "byte", value: 0 },
        { label: "TrapOneShot", type: "byte", value: 1 },
        { label: "TrapType", type: "byte", value: 0 },
        { label: "KeyName", type: "cexostring", value: "" },
        { label: "AnimationState", type: "byte", value: 0 },
        { label: "Appearance", type: "dword", value: 104 },
        { label: "HP", type: "short", value: 15 },
        { label: "CurrentHP", type: "short", value: 15 },
        { label: "Hardness", type: "byte", value: 5 },
        { label: "Fort", type: "byte", value: 16 },
        { label: "Ref", type: "byte", value: 0 },
        { label: "Will", type: "byte", value: 0 },
        { label: "OnClosed", type: "resref", value: "" },
        { label: "OnDamaged", type: "resref", value: "" },
        { label: "OnDeath", type: "resref", value: "" },
        { label: "OnDisarm", type: "resref", value: "" },
        { label: "OnHeartbeat", type: "resref", value: "" },
        { label: "OnLock", type: "resref", value: "" },
        { label: "OnMeleeAttacked", type: "resref", value: "" },
        { label: "OnOpen", type: "resref", value: "" },
        { label: "OnSpellCastAt", type: "resref", value: "" },
        { label: "OnTrapTriggered", type: "resref", value: "" },
        { label: "OnUnlock", type: "resref", value: "" },
        { label: "OnUserDefined", type: "resref", value: "" },
        { label: "OnClick", type: "resref", value: "" },
        { label: "HasInventory", type: "byte", value: 0 },
        { label: "BodyBag", type: "byte", value: 0 },
        { label: "Static", type: "byte", value: 1 },
        { label: "Type", type: "byte", value: 0 },
        { label: "Useable", type: "byte", value: 0 },
        { label: "OnInvDisturbed", type: "resref", value: "" },
        { label: "OnUsed", type: "resref", value: "" },
        { label: "X", type: "float", value: Math.fround(27.44) },
        { label: "Y", type: "float", value: Math.fround(29.76) },
        { label: "Z", type: "float", value: Math.fround(1.25) },
        { label: "Bearing", type: "float", value: Math.fround(Math.PI / 3) },
      ],
    });
    expect(gicEntry).toEqual({
      typeId: 9,
      fields: [{ label: "Comment", type: "cexostring", value: "Water Trough" }],
    });
    expect(gitEntry.fields.some((field) => ["PaletteID", "Portrait", "ItemList"].includes(field.label))).toBe(false);
  });

  it("constructs a dynamic catalog Placeable by copying exact UTP identity and Aurora defaults", () => {
    const pair = fixturePair();
    const blueprintBytes = placeableBlueprint();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{
        ...placeableAddition(blueprintBytes, {
          x: 1.25,
          y: 2.5,
          z: 0.75,
          bearing: Math.PI / 4,
        }),
        sourceProfileId: "effective-catalog-utp-placeable-copy-v1",
        sourceObjectKey: "modules/current/__aurora/sources/vanilla/templates/plc_watertrough.utp",
        tag: "Water Trough",
        resolvedPortraitId: 462,
      }],
    });

    const gitEntry = list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value.at(-1)!;
    const gicEntry = list(parseRawGffDocument(result.gicBytes), "Placeable List")!.value.at(-1)!;
    expect(gitEntry.typeId).toBe(9);
    expect(gitEntry.fields).toContainEqual({ label: "Tag", type: "cexostring", value: "Water Trough" });
    expect(gitEntry.fields).toContainEqual({ label: "TemplateResRef", type: "resref", value: "plc_watertrough" });
    expect(gitEntry.fields).toContainEqual({ label: "PortraitId", type: "word", value: 462 });
    expect(gitEntry.fields).toContainEqual({ label: "BodyBag", type: "byte", value: 0 });
    expect(gitEntry.fields).toContainEqual({ label: "Static", type: "byte", value: 1 });
    expect(gitEntry.fields).toContainEqual({ label: "OnClick", type: "resref", value: "" });
    expect(gitEntry.fields).toContainEqual({ label: "X", type: "float", value: Math.fround(12.5) });
    expect(gitEntry.fields).toContainEqual({ label: "Y", type: "float", value: Math.fround(25) });
    expect(gitEntry.fields).toContainEqual({ label: "Z", type: "float", value: Math.fround(7.5) });
    expect(gitEntry.fields).toContainEqual({ label: "Bearing", type: "float", value: Math.fround(Math.PI / 4) });
    expect(gitEntry.fields.some((field) => ["PaletteID", "Portrait", "Comment", "ItemList"].includes(field.label))).toBe(false);
    expect(gicEntry).toEqual({
      typeId: 9,
      fields: [{ label: "Comment", type: "cexostring", value: "Water Trough" }],
    });
  });

  it("preserves a dynamic UTP PortraitId, empty-container flag, and canonical VarTable", () => {
    const pair = fixturePair();
    const source = parseRawGffDocument(placeableBlueprint())!;
    const blueprintBytes = buildGffBuffer([
      ...source.fields
        .filter((field) => !["Portrait", "Tag", "TemplateResRef", "Comment", "Useable"].includes(field.label))
        .map((field) => field.label === "HasInventory" ? { ...field, value: 1 } as SupportedGffField : field),
      { label: "PortraitId", type: "word", value: 15157 },
      { label: "Tag", type: "cexostring", value: "Daggers Flag" },
      { label: "TemplateResRef", type: "resref", value: "dd_pl_dagflag1" },
      { label: "Comment", type: "cexostring", value: "Flag comment" },
      { label: "Useable", type: "byte", value: 1 },
      {
        label: "VarTable",
        type: "list",
        value: [{
          typeId: 0,
          fields: [
            { label: "Name", type: "cexostring", value: "State" },
            { label: "Type", type: "dword", value: 1 },
            { label: "Value", type: "int", value: 7 },
          ],
        }],
      },
    ], "UTP ", ROOT_TYPE);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{
        ...placeableAddition(blueprintBytes, { x: 1, y: 1, z: 0, bearing: 0 }),
        sourceProfileId: "effective-catalog-utp-placeable-copy-v1",
        sourceObjectKey: "modules/current/__aurora/sources/vanilla/templates/dd_pl_dagflag1.utp",
        templateResRef: "dd_pl_dagflag1",
        resRef: "dd_pl_dagflag1",
        tag: "Daggers Flag",
        resolvedPortraitId: 15157,
      }],
    });

    const fields = list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value.at(-1)!.fields;
    expect(fields).toContainEqual({ label: "PortraitId", type: "word", value: 15157 });
    expect(fields).toContainEqual({ label: "HasInventory", type: "byte", value: 1 });
    expect(fields).toContainEqual({ label: "Static", type: "byte", value: 0 });
    expect(fields).toContainEqual({
      label: "VarTable",
      type: "list",
      value: [{
        typeId: 0,
        fields: [
          { label: "Name", type: "cexostring", value: "State" },
          { label: "Type", type: "dword", value: 1 },
          { label: "Value", type: "int", value: 7 },
        ],
      }],
    });
    expect(fields.some((field) => field.label === "ItemList")).toBe(false);
  });

  it("expands the admitted plc_fenbush UTP ItemList from one verified effective UTI dependency", () => {
    const pair = fixturePair();
    const blueprintBytes = dynamicPlaceableInventoryBlueprint(
      "plc_fenbush",
      "Fern Bush",
      [{ inventoryRes: "nw_it_msmlmisc12", x: 0, y: 0 }],
    );
    const dependencyBytes = miscItemBlueprint("nw_it_msmlmisc12", 66);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [dynamicInventoryPlaceableAddition(
        blueprintBytes,
        "plc_fenbush",
        "Fern Bush",
        [{ templateResRef: "nw_it_msmlmisc12", bytes: dependencyBytes }],
      )],
    });

    const fields = list(parseRawGffDocument(result.gitBytes), "Placeable List")!.value.at(-1)!.fields;
    const itemList = fields.find((field) => field.label === "ItemList") as Extract<SupportedGffField, { type: "list" }>;
    expect(itemList.value).toHaveLength(1);
    expect(itemList.value[0]).toEqual({
      typeId: 0,
      fields: [
        { label: "XPosition", type: "float", value: -1 },
        { label: "YPosition", type: "float", value: -1 },
        { label: "ZPosition", type: "float", value: -1 },
        { label: "XOrientation", type: "float", value: 0 },
        { label: "YOrientation", type: "float", value: 1 },
        { label: "TemplateResRef", type: "resref", value: "nw_it_msmlmisc12" },
        { label: "BaseItem", type: "int", value: 24 },
        { label: "LocalizedName", type: "cexolocstring", value: { strRef: 13494, entries: [] } },
        { label: "Description", type: "cexolocstring", value: { strRef: 0xffffffff, entries: [] } },
        { label: "DescIdentified", type: "cexolocstring", value: { strRef: 58566, entries: [] } },
        { label: "Tag", type: "cexostring", value: "NW_IT_MSMLMISC12" },
        { label: "Charges", type: "byte", value: 0 },
        { label: "Cost", type: "dword", value: 0 },
        { label: "Stolen", type: "byte", value: 0 },
        { label: "StackSize", type: "word", value: 1 },
        { label: "Plot", type: "byte", value: 0 },
        { label: "AddCost", type: "dword", value: 0 },
        { label: "Identified", type: "byte", value: 1 },
        { label: "Cursed", type: "byte", value: 0 },
        { label: "ModelPart1", type: "byte", value: 66 },
        { label: "xModelPart1", type: "word", value: 66 },
        { label: "PropertiesList", type: "list", value: [] },
        { label: "Repos_PosX", type: "word", value: 0 },
        { label: "Repos_Posy", type: "word", value: 0 },
      ],
    });
  });

  it("preserves exact ItemList order, struct ordinals, and repository Words for x0_treepine2", () => {
    const pair = fixturePair();
    const blueprintBytes = dynamicPlaceableInventoryBlueprint(
      "x0_treepine2",
      "Pine Tree",
      [
        { inventoryRes: "nw_it_msmlmisc12", x: 0, y: 0 },
        { inventoryRes: "nw_it_msmlmisc11", x: 1, y: 0 },
      ],
    );
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [dynamicInventoryPlaceableAddition(
        blueprintBytes,
        "x0_treepine2",
        "Pine Tree",
        [
          { templateResRef: "nw_it_msmlmisc12", bytes: miscItemBlueprint("nw_it_msmlmisc12", 66) },
          { templateResRef: "nw_it_msmlmisc11", bytes: miscItemBlueprint("nw_it_msmlmisc11", 68) },
        ],
      )],
    });

    const itemList = list(parseRawGffDocument(result.gitBytes), "Placeable List")!
      .value.at(-1)!.fields.find(
        (field): field is Extract<SupportedGffField, { type: "list" }> =>
          field.label === "ItemList" && field.type === "list",
      )!;
    expect(itemList.value.map((entry) => ({
      typeId: entry.typeId,
      templateResRef: entry.fields.find((field) => field.label === "TemplateResRef")?.value,
      x: entry.fields.find((field) => field.label === "Repos_PosX")?.value,
      y: entry.fields.find((field) => field.label === "Repos_Posy")?.value,
    }))).toEqual([
      { typeId: 0, templateResRef: "nw_it_msmlmisc12", x: 0, y: 0 },
      { typeId: 1, templateResRef: "nw_it_msmlmisc11", x: 1, y: 0 },
    ]);
  });

  it("fails closed on unsupported dynamic UTP ItemList manifests", () => {
    const cases: ReadonlyArray<Readonly<{
      templateResRef: string;
      tag: string;
      entries: ReadonlyArray<Readonly<{ inventoryRes: string; x: number; y: number }>>;
    }>> = [
      { templateResRef: "plc_watertrough", tag: "Water Trough", entries: [{ inventoryRes: "nw_it_msmlmisc12", x: 0, y: 0 }] },
      { templateResRef: "plc_fenbush", tag: "Fern Bush", entries: [{ inventoryRes: "nw_it_msmlmisc11", x: 0, y: 0 }] },
      { templateResRef: "plc_pilestones", tag: "Pile of Stones", entries: [{ inventoryRes: "nw_it_msmlmisc11", x: 1, y: 0 }] },
    ];
    for (const candidate of cases) {
      const blueprintBytes = dynamicPlaceableInventoryBlueprint(
        candidate.templateResRef,
        candidate.tag,
        candidate.entries,
      );
      const dependencies = candidate.entries.map((entry) => ({
        templateResRef: entry.inventoryRes,
        bytes: miscItemBlueprint(entry.inventoryRes, entry.inventoryRes.endsWith("11") ? 68 : 66),
      }));
      expect(() => mutateExistingAreaObjectsInGitGic({
        sourceGit: fixturePair().git,
        sourceGic: fixturePair().gic,
        deletions: [],
        additions: [dynamicInventoryPlaceableAddition(
          blueprintBytes,
          candidate.templateResRef,
          candidate.tag,
          dependencies,
        )],
      })).toThrow(/ItemList|inventory.*profile/iu);
    }
  });

  it("fails closed on a missing, misordered, stale, or malformed ItemList dependency", () => {
    const blueprintBytes = dynamicPlaceableInventoryBlueprint(
      "plc_fenbush",
      "Fern Bush",
      [{ inventoryRes: "nw_it_msmlmisc12", x: 0, y: 0 }],
    );
    const validBytes = miscItemBlueprint("nw_it_msmlmisc12", 66);
    const malformed = buildGffBuffer(
      parseRawGffDocument(validBytes)!.fields.filter((field) => field.label !== "PropertiesList"),
      "UTI ",
      ROOT_TYPE,
    );
    const cases: ReadonlyArray<ReadonlyArray<Readonly<{
      templateResRef: string;
      bytes: Buffer;
      sha256?: string;
    }>>> = [
      [],
      [{ templateResRef: "nw_it_msmlmisc11", bytes: miscItemBlueprint("nw_it_msmlmisc11", 68) }],
      [{ templateResRef: "nw_it_msmlmisc12", bytes: validBytes, sha256: "f".repeat(64) }],
      [{ templateResRef: "nw_it_msmlmisc12", bytes: malformed }],
    ];
    for (const dependencies of cases) {
      expect(() => mutateExistingAreaObjectsInGitGic({
        sourceGit: fixturePair().git,
        sourceGic: fixturePair().gic,
        deletions: [],
        additions: [dynamicInventoryPlaceableAddition(
          blueprintBytes,
          "plc_fenbush",
          "Fern Bush",
          dependencies,
        )],
      })).toThrow(/ItemList|dependency|inventory item blueprint/iu);
    }
  });

  it("constructs a paired native ground item from the verified nw_cloth022 UTI blueprint", () => {
    const pair = fixturePair();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [itemAddition(itemBlueprint(), {
        x: 1.5,
        y: 2.25,
        z: 0.1,
        bearing: Math.PI / 4,
      })],
    });

    expect(result.addedCounts).toEqual(expect.objectContaining({ item: 1, placeable: 0, sound: 0, waypoint: 0 }));
    const gitEntry = list(parseRawGffDocument(result.gitBytes), "List")!.value.at(-1)!;
    const gicEntry = list(parseRawGffDocument(result.gicBytes), "List")!.value.at(-1)!;
    const armorParts = [
      ["RFoot", "RFoot", 6], ["LFoot", "LFoot", 6],
      ["RShin", "RShin", 16], ["LShin", "LShin", 16],
      ["LThigh", "LThig", 3], ["RThigh", "RThig", 3],
      ["Pelvis", "Pelvi", 3], ["Torso", "Torso", 39],
      ["Belt", "Belt", 0], ["Neck", "Neck", 1],
      ["RFArm", "RFArm", 1], ["LFArm", "LFArm", 1],
      ["RBicep", "RBice", 1], ["LBicep", "LBice", 1],
      ["RShoul", "RShou", 0], ["LShoul", "LShou", 0],
      ["RHand", "RHand", 1], ["LHand", "LHand", 1],
      ["Robe", "Robe", 0],
    ] as const;
    expect(gitEntry).toEqual({
      typeId: 0,
      fields: [
        { label: "XPosition", type: "float", value: Math.fround(15) },
        { label: "YPosition", type: "float", value: Math.fround(22.5) },
        { label: "ZPosition", type: "float", value: Math.fround(1) },
        { label: "XOrientation", type: "float", value: Math.fround(Math.cos(Math.PI / 4)) },
        { label: "YOrientation", type: "float", value: Math.fround(-Math.sin(Math.PI / 4)) },
        { label: "TemplateResRef", type: "resref", value: "nw_cloth022" },
        { label: "BaseItem", type: "int", value: 16 },
        { label: "LocalizedName", type: "cexolocstring", value: { strRef: 12923, entries: [] } },
        { label: "Description", type: "cexolocstring", value: { strRef: 0xffffffff, entries: [] } },
        { label: "DescIdentified", type: "cexolocstring", value: { strRef: 0xffffffff, entries: [] } },
        { label: "Tag", type: "cexostring", value: "NW_CLOTH022" },
        { label: "Charges", type: "byte", value: 0 },
        { label: "Cost", type: "dword", value: 1 },
        { label: "Stolen", type: "byte", value: 0 },
        { label: "StackSize", type: "word", value: 1 },
        { label: "Plot", type: "byte", value: 0 },
        { label: "AddCost", type: "dword", value: 0 },
        { label: "Identified", type: "byte", value: 1 },
        { label: "Cursed", type: "byte", value: 0 },
        ...armorParts.flatMap(([legacy, extended, value]) => [
          { label: `ArmorPart_${legacy}`, type: "byte" as const, value },
          { label: `xArmorPart_${extended}`, type: "word" as const, value },
        ]),
        { label: "Leather1Color", type: "byte", value: 11 },
        { label: "Leather2Color", type: "byte", value: 14 },
        { label: "Cloth1Color", type: "byte", value: 11 },
        { label: "Cloth2Color", type: "byte", value: 7 },
        { label: "Metal1Color", type: "byte", value: 23 },
        { label: "Metal2Color", type: "byte", value: 6 },
        { label: "PropertiesList", type: "list", value: [] },
      ],
    });
    expect(gicEntry).toEqual({
      typeId: 0,
      fields: [{ label: "Comment", type: "cexostring", value: "1" }],
    });
    expect(gitEntry.fields).toHaveLength(64);
    expect(gitEntry.fields.some((field) => ["PaletteID", "Comment", "Bearing", "ItemList"].includes(field.label))).toBe(false);
  });

  it.each([
    ["source digest", { sourceSha256: "f".repeat(64) }],
    ["source profile", { sourceProfileId: "custom-uti" }],
    ["template identity", { templateResRef: "nw_cloth021" }],
    ["scene ResRef", { resRef: "nw_cloth021" }],
    ["native instance Tag", { tag: "OVERRIDE" }],
    ["finite transform", { bearing: Number.NaN }],
  ])("rejects a ground-item addition with invalid %s", (_label, patch) => {
    const pair = fixturePair();
    const addition = { ...itemAddition(itemBlueprint(), { x: 1, y: 2, z: 0, bearing: 0 }), ...patch };
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [addition],
    })).toThrow(AreaObjectPairMutationError);
  });

  it("reports exact bounded diagnostics for ground-item profile identity drift", () => {
    const pair = fixturePair();
    const addition = {
      ...itemAddition(itemBlueprint(), { x: 1, y: 2, z: 0, bearing: 0 }),
      sourceProfileId: "custom-uti",
    };
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [addition],
    })).toThrow(expect.objectContaining({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: ["item:addition=0:profile_or_identity_mismatch"],
    }));
  });

  it.each([
    ["file type", () => buildGffBuffer(parseRawGffDocument(itemBlueprint())!.fields, "UTP ", ROOT_TYPE), "gff_identity"],
    ["file version", () => withGffVersion(itemBlueprint(), "V3.1"), "gff_identity"],
    ["root type", () => buildGffBuffer(parseRawGffDocument(itemBlueprint())!.fields, "UTI ", 0), "gff_identity"],
  ] as const)("rejects ground-item blueprint %s drift", (_label, mutate, diagnostic) => {
    const pair = fixturePair();
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [itemAddition(mutate(), { x: 1, y: 2, z: 0, bearing: 0 })],
    })).toThrow(expect.objectContaining({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [`item:addition=0:${diagnostic}`],
    }));
  });

  it.each([
    ["BaseItem", "int", 17],
    ["StackSize", "word", 2],
    ["ArmorPart_Pelvis", "byte", 4],
    ["Stolen", "byte", 1],
    ["LocalizedName", "cexolocstring", { strRef: 12924, entries: [] }],
    ["ArmorPart_RShoul", "byte", 1],
    ["ArmorPart_LThigh", "byte", 4],
    ["ArmorPart_Belt", "byte", 1],
    ["Description", "cexolocstring", { strRef: 0, entries: [] }],
    ["ArmorPart_RThigh", "byte", 4],
    ["ArmorPart_LHand", "byte", 2],
    ["Cost", "dword", 2],
    ["ArmorPart_RFoot", "byte", 7],
    ["ArmorPart_LShoul", "byte", 1],
    ["DescIdentified", "cexolocstring", { strRef: 0, entries: [] }],
    ["ArmorPart_LShin", "byte", 17],
    ["Leather2Color", "byte", 15],
    ["ArmorPart_RHand", "byte", 2],
    ["PropertiesList", "list", [{ typeId: 0, fields: [] }]],
    ["ArmorPart_Torso", "byte", 40],
    ["Tag", "cexostring", "OTHER"],
    ["Leather1Color", "byte", 12],
    ["Cloth1Color", "byte", 12],
    ["PaletteID", "byte", 6],
    ["Comment", "cexostring", "2"],
    ["TemplateResRef", "resref", "nw_cloth021"],
    ["Charges", "byte", 1],
    ["Identified", "byte", 0],
    ["ArmorPart_RShin", "byte", 17],
    ["Plot", "byte", 1],
    ["ArmorPart_Neck", "byte", 2],
    ["ArmorPart_LFoot", "byte", 7],
    ["Cloth2Color", "byte", 8],
    ["Metal1Color", "byte", 24],
    ["AddCost", "dword", 1],
    ["ArmorPart_RBicep", "byte", 2],
    ["ArmorPart_RFArm", "byte", 2],
    ["ArmorPart_LFArm", "byte", 2],
    ["ArmorPart_LBicep", "byte", 2],
    ["Metal2Color", "byte", 7],
  ] as const)("rejects ground-item blueprint %s value drift", (label, type, value) => {
    const pair = fixturePair();
    const blueprint = mutateItemBlueprintField(label, { label, type, value } as SupportedGffField);
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [itemAddition(blueprint, { x: 1, y: 2, z: 0, bearing: 0 })],
    })).toThrow(expect.objectContaining({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [`item:addition=0:${label}:value_mismatch`],
    }));
  });

  it.each([
    ["missing field", (fields: SupportedGffField[]) => fields.map((field) => field.label === "BaseItem" ? { label: "Unknown", type: "int", value: 16 } as SupportedGffField : field), "BaseItem:count=0:type=missing"],
    ["duplicate field", (fields: SupportedGffField[]) => fields.map((field) => field.label === "StackSize" ? { label: "BaseItem", type: "int", value: 16 } as SupportedGffField : field), "BaseItem:count=2:type=int"],
    ["wrong field type", (fields: SupportedGffField[]) => fields.map((field) => field.label === "BaseItem" ? { label: "BaseItem", type: "dword", value: 16 } as SupportedGffField : field), "BaseItem:count=1:type=dword"],
  ] as const)("reports exact diagnostics for a ground-item blueprint with a %s", (_label, mutate, diagnostic) => {
    const pair = fixturePair();
    const document = parseRawGffDocument(itemBlueprint())!;
    const blueprint = buildGffBuffer(mutate([...document.fields]), "UTI ", document.rootStructTypeId);
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [itemAddition(blueprint, { x: 1, y: 2, z: 0, bearing: 0 })],
    })).toThrow(expect.objectContaining({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [`item:addition=0:${diagnostic}`],
    }));
  });

  it.each([
    ["missing", (fields: SupportedGffField[]) => fields.slice(1), 39],
    ["extra", (fields: SupportedGffField[]) => [...fields, { label: "Extra", type: "byte", value: 0 } as SupportedGffField], 41],
  ] as const)("rejects a ground-item blueprint with an %s top-level field", (_label, mutate, count) => {
    const pair = fixturePair();
    const document = parseRawGffDocument(itemBlueprint())!;
    const blueprint = buildGffBuffer(mutate([...document.fields]), "UTI ", document.rootStructTypeId);
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [itemAddition(blueprint, { x: 1, y: 2, z: 0, bearing: 0 })],
    })).toThrow(expect.objectContaining({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [`item:addition=0:field_count=${count}:expected=40`],
    }));
  });

  it.each([
    ["source profile", { sourceProfileId: "custom-utp" }],
    ["template identity", { templateResRef: "plc_other" }],
    ["scene ResRef", { resRef: "plc_other" }],
    ["native instance Tag", { tag: "Water Trough" }],
    ["finite transform", { bearing: Number.NaN }],
  ])("rejects a placeable addition with invalid %s", (_label, patch) => {
    const pair = fixturePair();
    const addition = { ...placeableAddition(placeableBlueprint(), { x: 1, y: 2, z: 0, bearing: 0 }), ...patch };
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [addition],
    })).toThrow(AreaObjectPairMutationError);
  });

  it.each([
    ["file type", () => buildGffBuffer(parseRawGffDocument(placeableBlueprint())!.fields, "UTW ", ROOT_TYPE), "gff_identity"],
    ["file version", () => withGffVersion(placeableBlueprint(), "V3.1"), "gff_identity"],
    ["root type", () => buildGffBuffer(parseRawGffDocument(placeableBlueprint())!.fields, "UTP ", 9), "gff_identity"],
    ["blueprint Tag", () => mutatePlaceableBlueprintField("Tag", { label: "Tag", type: "cexostring", value: "Other" }), "Tag:value_mismatch"],
    ["portrait", () => mutatePlaceableBlueprintField("Portrait", { label: "Portrait", type: "resref", value: "po_other" }), "Portrait:value_mismatch"],
    ["inventory flag", () => mutatePlaceableBlueprintField("HasInventory", { label: "HasInventory", type: "byte", value: 1 }), "HasInventory:value_mismatch"],
  ] as const)("rejects placeable blueprint %s drift", (_label, mutate, diagnostic) => {
    const pair = fixturePair();
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [placeableAddition(mutate(), { x: 1, y: 2, z: 0, bearing: 0 })],
    })).toThrow(expect.objectContaining({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [`placeable:addition=0:${diagnostic}`],
    }));
  });

  it("reports the exact duplicate-field diagnostics for a placeable blueprint", () => {
    const pair = fixturePair();
    const document = parseRawGffDocument(placeableBlueprint())!;
    const portrait = document.fields.find((field) => field.label === "Portrait")!;
    const duplicatePortrait = buildGffBuffer(
      [...document.fields, portrait],
      "UTP ",
      document.rootStructTypeId,
    );
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [placeableAddition(duplicatePortrait, { x: 1, y: 2, z: 0, bearing: 0 })],
    })).toThrow(expect.objectContaining({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: ["placeable:addition=0:Portrait:count=2:type=resref"],
    }));
  });

  it("reports exact bounded diagnostics for placeable profile identity drift", () => {
    const pair = fixturePair();
    const addition = {
      ...placeableAddition(placeableBlueprint(), { x: 1, y: 2, z: 0, bearing: 0 }),
      sourceProfileId: "custom-utp",
    };
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [addition],
    })).toThrow(expect.objectContaining({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: ["placeable:addition=0:profile_or_identity_mismatch"],
    }));
  });

  it.each([
    ["source digest", { sourceSha256: "f".repeat(64) }],
    ["source profile", { sourceProfileId: "custom-uts" }],
    ["template identity", { tag: "OVERRIDE" }],
    ["nonzero bearing", { bearing: 0.001 }],
    ["finite transform", { x: Number.NaN }],
  ])("rejects a sound addition with invalid %s", (_label, patch) => {
    const pair = fixturePair();
    const addition = { ...soundAddition(soundBlueprint(), { x: 1, y: 2, z: 0, bearing: 0 }), ...patch };
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [addition],
    })).toThrow(AreaObjectPairMutationError);
  });

  it("reports the exact zero-bearing diagnostic for sound construction", () => {
    const pair = fixturePair();
    const addition = soundAddition(soundBlueprint(), { x: 1, y: 2, z: 0, bearing: 0.001 });
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [addition],
    })).toThrow(expect.objectContaining({ diagnostics: ["sound:addition=0:bearing"] }));
  });

  it.each([
    ["TemplateResRef", { label: "TemplateResRef", type: "resref" as const, value: "other" }],
    ["Tag", { label: "Tag", type: "cexostring" as const, value: "Other" }],
  ])("rejects sound blueprint %s identity drift independently from retained scene identity", (_label, replacement) => {
    const pair = fixturePair();
    const bytes = mutateSoundBlueprintField(replacement.label, replacement);
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [soundAddition(bytes, { x: 1, y: 2, z: 0, bearing: 0 })],
    })).toThrow(expect.objectContaining({ diagnostics: ["sound:addition=0:blueprint_identity"] }));
  });

  it.each([
    ["LocName", "cexolocstring", { strRef: 1, entries: [] }],
    ["Active", "byte", 0],
    ["Continuous", "byte", 0],
    ["Looping", "byte", 1],
    ["Positional", "byte", 0],
    ["RandomPosition", "byte", 0],
    ["Random", "byte", 0],
    ["Elevation", "float", 2],
    ["MaxDistance", "float", 9],
    ["MinDistance", "float", 2],
    ["RandomRangeX", "float", 9],
    ["RandomRangeY", "float", 9],
    ["Interval", "dword", 24999],
    ["IntervalVrtn", "dword", 4999],
    ["PitchVariation", "float", 0.1],
    ["Priority", "byte", 19],
    ["Hours", "dword", 1],
    ["Times", "byte", 2],
    ["Volume", "byte", 126],
    ["VolumeVrtn", "byte", 1],
    ["PaletteID", "byte", 5],
    ["Comment", "cexostring", "override"],
  ] as const)("rejects sound blueprint %s value drift", (label, type, value) => {
    const pair = fixturePair();
    const blueprint = mutateSoundBlueprintField(label, { label, type, value } as SupportedGffField);
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [soundAddition(blueprint, { x: 1, y: 2, z: 0, bearing: 0 })],
    })).toThrow(expect.objectContaining({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [`sound:addition=0:${label}:value_mismatch`],
    }));
  });

  it.each([
    ["wrong nested struct type", (entry: any) => ({ ...entry, typeId: 0 })],
    ["wrong nested ResRef", (entry: any) => ({ ...entry, fields: [{ label: "Sound", type: "resref", value: "other" }] })],
    ["extra nested field", (entry: any) => ({ ...entry, fields: [...entry.fields, { label: "Extra", type: "byte", value: 1 }] })],
    ["wrong nested label", (entry: any) => ({ ...entry, fields: [{ label: "Other", type: "resref", value: "as_an_cryday1" }] })],
    ["wrong nested field type", (entry: any) => ({ ...entry, fields: [{ label: "Sound", type: "cexostring", value: "as_an_cryday1" }] })],
    ["missing nested field", (entry: any) => ({ ...entry, fields: [] })],
  ])("rejects a sound blueprint with %s", (_label, mutate) => {
    const pair = fixturePair();
    const document = parseRawGffDocument(soundBlueprint())!;
    const sounds = list(document, "Sounds")!;
    sounds.value[0] = mutate(sounds.value[0]);
    const bytes = buildGffBuffer(document.fields, "UTS ", document.rootStructTypeId);
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [soundAddition(bytes, { x: 1, y: 2, z: 0, bearing: 0 })],
    })).toThrow(expect.objectContaining({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: ["sound:addition=0:Sounds=0:profile_mismatch"],
    }));
  });

  it("shares the bounded addition budget across waypoint and sound construction", () => {
    const pair = fixturePair();
    const waypoint = waypointAddition(waypointBlueprint(), { x: 1, y: 2, z: 0, bearing: 0 });
    const additions = Array.from({ length: 1024 }, (_, index) => ({
      ...waypoint,
      localObjectId: `wpt_${index}`,
    }));
    additions.push(soundAddition(soundBlueprint(), { x: 1, y: 2, z: 0, bearing: 0 }) as never);

    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions,
    })).toThrow(expect.objectContaining({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: ["object:additions=1025:max=1024"],
    }));
  });

  it.each(["git", "gic"] as const)("fails independent %s addition readback after structural candidate corruption", (resource) => {
    const pair = fixturePair();
    const addition = soundAddition(soundBlueprint(), { x: 1, y: 2, z: 0, bearing: 0 });
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [addition],
    });
    const git = parseRawGffDocument(result.gitBytes)!;
    const gic = parseRawGffDocument(result.gicBytes)!;
    const expected = {
      kind: "sound" as const,
      localObjectId: addition.localObjectId,
      git: structuredClone(list(git, "SoundList")!.value.at(-1)!),
      gic: structuredClone(list(gic, "SoundList")!.value.at(-1)!),
    };
    const document = resource === "git" ? git : gic;
    list(document, "SoundList")!.value.at(-1)!.fields.push({
      label: "ReadbackDrift",
      type: "byte",
      value: 1,
    });
    const corrupted = buildGffBuffer(
      document.fields,
      resource === "git" ? "GIT " : "GIC ",
      document.rootStructTypeId,
    );

    expect(() => verifyAreaObjectAdditionsReadback(
      resource === "git" ? corrupted : result.gitBytes,
      resource === "gic" ? corrupted : result.gicBytes,
      [expected],
      result.source.counts,
      result.deletedCounts,
    )).toThrow(expect.objectContaining({
      code: "AREA_UPDATE_COMPANION_MISMATCH",
      diagnostics: [`sound:addition=0:candidate=1:${resource}_mismatch`],
    }));
  });

  it.each([
    ["file type", (bytes: Buffer) => { const copy = Buffer.from(bytes); copy.write("UTW ", 0, 4, "ascii"); return copy; }, "gff_identity"],
    ["file version", (bytes: Buffer) => withGffVersion(bytes, "V3.1"), "gff_identity"],
    ["root type", () => buildGffBuffer(parseRawGffDocument(soundBlueprint())!.fields, "UTS ", 6), "gff_identity"],
    ["sound count", () => mutateSoundBlueprintField("Sounds", { label: "Sounds", type: "list", value: [] }), "Sounds:count=0"],
  ] as const)("rejects sound blueprint %s drift", (_label, mutate, diagnostic) => {
    const pair = fixturePair();
    const bytes = mutate(soundBlueprint());
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [soundAddition(bytes, { x: 1, y: 2, z: 0, bearing: 0 })],
    })).toThrow(expect.objectContaining({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [`sound:addition=0:${diagnostic}`],
    }));
  });

  it.each([
    ["template", { templateResRef: "other" }],
    ["scene ResRef", { resRef: "other" }],
    ["scene Tag", { tag: "Other" }],
  ])("rejects sound addition %s identity drift with exact diagnostics", (_label, patch) => {
    const pair = fixturePair();
    const addition = { ...soundAddition(soundBlueprint(), { x: 1, y: 2, z: 0, bearing: 0 }), ...patch };
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [addition],
    })).toThrow(expect.objectContaining({
      diagnostics: ["sound:addition=0:profile_or_identity_mismatch"],
    }));
  });

  it("rejects an unknown construction family before blueprint work", () => {
    const pair = fixturePair();
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{ ...soundAddition(soundBlueprint(), { x: 1, y: 2, z: 0, bearing: 0 }), kind: "effect" } as never],
    })).toThrow(expect.objectContaining({
      diagnostics: ["object:addition=0:kind=effect"],
    }));
  });

  it("applies source-ordinal mutation before appending deterministic waypoint additions", () => {
    const pair = fixturePair();
    const blueprint = waypointBlueprint();
    const input = {
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [{ kind: "waypoint" as const, sourceIndex: 0 }],
      additions: [waypointAddition(blueprint, { x: 1, y: 2, z: 0, bearing: 0 })],
    };

    const first = mutateExistingAreaObjectsInGitGic(input);
    const second = mutateExistingAreaObjectsInGitGic(input);

    expect(second.gitBytes).toEqual(first.gitBytes);
    expect(second.gicBytes).toEqual(first.gicBytes);
    expect(first.candidate.counts.waypoint).toBe(first.source.counts.waypoint);
    expect(list(parseRawGffDocument(first.gitBytes), "WaypointList")!.value).toHaveLength(1);
    expect(list(parseRawGffDocument(first.gitBytes), "WaypointList")!.value[0]!.fields)
      .toEqual(expect.arrayContaining([
        { label: "TemplateResRef", type: "resref", value: "nw_waypoint001" },
        { label: "Tag", type: "cexostring", value: "NW_WAYPOINT001" },
      ]));
  });

  it.each([
    ["source digest", (value: ReturnType<typeof waypointAddition>) => ({ ...value, sourceSha256: "f".repeat(64) })],
    ["source profile", (value: ReturnType<typeof waypointAddition>) => ({ ...value, sourceProfileId: "custom-utw" })],
    ["template identity", (value: ReturnType<typeof waypointAddition>) => ({ ...value, tag: "OVERRIDE" })],
    ["finite transform", (value: ReturnType<typeof waypointAddition>) => ({ ...value, x: Number.NaN })],
  ])("rejects a waypoint addition with invalid %s", (_label, mutate) => {
    const pair = fixturePair();
    const addition = mutate(waypointAddition(waypointBlueprint(), { x: 1, y: 2, z: 0, bearing: 0 }));
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [addition],
    })).toThrow(AreaObjectPairMutationError);
  });

  it("rejects more additions than the bounded profile allows before per-object work", () => {
    const pair = fixturePair();
    const blueprint = waypointBlueprint();
    const addition = waypointAddition(blueprint, { x: 1, y: 2, z: 0, bearing: 0 });
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: Array.from({ length: 1025 }, () => addition),
    })).toThrow(expect.objectContaining({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      message: "Too many object additions were requested in one Area update.",
      diagnostics: ["object:additions=1025:max=1024"],
    }));
  });

  it("admits exactly 1024 waypoint additions", () => {
    const pair = fixturePair();
    const blueprint = waypointBlueprint();
    const additions = Array.from({ length: 1024 }, (_, index) => ({
      ...waypointAddition(blueprint, { x: index, y: 2, z: 0, bearing: 0 }),
      localObjectId: `wpt_${index}`,
    }));
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions,
    });
    expect(result.addedCounts.waypoint).toBe(1024);
    expect(result.candidate.counts.waypoint).toBe(result.source.counts.waypoint + 1024);
  });

  it.each([
    ["empty", ""],
    ["unsafe", "waypoint:1"],
    ["too long", "w".repeat(81)],
  ])("rejects an %s waypoint local identity", (_label, localObjectId) => {
    const pair = fixturePair();
    const addition = {
      ...waypointAddition(waypointBlueprint(), { x: 1, y: 2, z: 0, bearing: 0 }),
      localObjectId,
    };
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [addition],
    })).toThrow(expect.objectContaining({ diagnostics: ["waypoint:addition=0:local_object_id"] }));
  });

  it("rejects duplicate waypoint local identities", () => {
    const pair = fixturePair();
    const addition = waypointAddition(waypointBlueprint(), { x: 1, y: 2, z: 0, bearing: 0 });
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [addition, addition],
    })).toThrow(expect.objectContaining({ diagnostics: ["waypoint:addition=1:duplicate_local_object_id"] }));
  });

  it.each([
    ["source profile", { sourceProfileId: "custom-utw" }],
    ["template", { templateResRef: "nw_waypoint002" }],
    ["scene ResRef", { resRef: "nw_waypoint002" }],
    ["scene Tag", { tag: "OVERRIDE" }],
  ])("rejects an independently mismatched waypoint %s", (_label, patch) => {
    const pair = fixturePair();
    const addition = {
      ...waypointAddition(waypointBlueprint(), { x: 1, y: 2, z: 0, bearing: 0 }),
      ...patch,
    };
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [addition],
    })).toThrow(expect.objectContaining({ diagnostics: ["waypoint:addition=0:profile_or_identity_mismatch"] }));
  });

  it.each([
    ["missing bytes", null],
    ["oversized bytes", Buffer.alloc(1024 * 1024 + 1)],
  ])("rejects %s for the waypoint blueprint", (_label, blueprintBytes) => {
    const pair = fixturePair();
    const addition = {
      ...waypointAddition(waypointBlueprint(), { x: 1, y: 2, z: 0, bearing: 0 }),
      blueprintBytes: blueprintBytes as never,
    };
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [addition],
    })).toThrow(expect.objectContaining({ diagnostics: ["waypoint:addition=0:blueprint_size"] }));
  });

  it("passes an exact one-megabyte Buffer to GFF validation rather than rejecting its size", () => {
    const pair = fixturePair();
    const blueprintBytes = Buffer.alloc(1024 * 1024);
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [waypointAddition(blueprintBytes, { x: 1, y: 2, z: 0, bearing: 0 })],
    })).toThrow(expect.objectContaining({ diagnostics: ["waypoint:addition=0:gff_identity"] }));
  });

  it.each([
    ["malformed", "not-a-sha"],
    ["uppercase", "A".repeat(64)],
    ["different", "f".repeat(64)],
    ["valid prefix with suffix", `${"a".repeat(64)}x`],
    ["valid suffix with prefix", `x${"a".repeat(64)}`],
  ])("rejects a %s waypoint source digest", (_label, sourceSha256) => {
    const pair = fixturePair();
    const addition = {
      ...waypointAddition(waypointBlueprint(), { x: 1, y: 2, z: 0, bearing: 0 }),
      sourceSha256,
    };
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [addition],
    })).toThrow(expect.objectContaining({ diagnostics: ["waypoint:addition=0:source_sha256_mismatch"] }));
  });

  it.each(["x", "y", "z", "bearing"] as const)(
    "rejects invalid %s independently for a waypoint addition",
    (field) => {
      const pair = fixturePair();
      for (const value of [Number.NaN, Number.POSITIVE_INFINITY, 1_000_001, -1_000_001]) {
        const addition = {
          ...waypointAddition(waypointBlueprint(), { x: 1, y: 2, z: 0, bearing: 0 }),
          [field]: value,
        };
        expect(() => mutateExistingAreaObjectsInGitGic({
          sourceGit: pair.git,
          sourceGic: pair.gic,
          deletions: [],
          additions: [addition],
        })).toThrow(expect.objectContaining({ diagnostics: [`waypoint:addition=0:${field}`] }));
      }
    },
  );

  it("admits the exact finite transform boundary", () => {
    const pair = fixturePair();
    const addition = waypointAddition(waypointBlueprint(), {
      x: 1_000_000,
      y: -1_000_000,
      z: 1_000_000,
      bearing: -1_000_000,
    });
    expect(mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [addition],
    }).addedCounts.waypoint).toBe(1);
  });

  it.each([
    ["unparseable", Buffer.from("not-a-gff")],
    ["wrong file type", waypointBlueprint({ fileType: "UTP " })],
    ["wrong root type", waypointBlueprint({ rootType: 0 })],
    ["wrong file version", withGffVersion(waypointBlueprint(), "V3.1")],
  ])("rejects a waypoint blueprint with %s identity", (_label, blueprintBytes) => {
    const pair = fixturePair();
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [waypointAddition(blueprintBytes, { x: 1, y: 2, z: 0, bearing: 0 })],
    })).toThrow(expect.objectContaining({ diagnostics: ["waypoint:addition=0:gff_identity"] }));
  });

  it.each([
    ["TemplateResRef", "resref"],
    ["Tag", "cexostring"],
    ["LinkedTo", "cexostring"],
    ["LocalizedName", "cexolocstring"],
    ["Description", "cexolocstring"],
    ["HasMapNote", "byte"],
    ["Comment", "cexostring"],
    ["PaletteID", "byte"],
  ] as const)("requires exactly one correctly typed %s blueprint field", (label, expectedType) => {
    const pair = fixturePair();
    const sourceFields = waypointBlueprintFields();
    const field = sourceFields.find((entry) => entry.label === label)!;
    const cases = [
      sourceFields.filter((entry) => entry.label !== label),
      [...sourceFields, field],
      sourceFields.map((entry) => entry.label === label
        ? wrongTypeField(label, expectedType)
        : entry),
    ];
    cases.forEach((fields, caseIndex) => {
      const bytes = buildGffBuffer(fields, "UTW ", ROOT_TYPE);
      expect(() => mutateExistingAreaObjectsInGitGic({
        sourceGit: pair.git,
        sourceGic: pair.gic,
        deletions: [],
        additions: [waypointAddition(bytes, { x: 1, y: 2, z: 0, bearing: 0 })],
      })).toThrow(expect.objectContaining({
        diagnostics: [expect.stringMatching(new RegExp(`^waypoint:addition=0:${label}:`, "u"))],
      }));
      expect(caseIndex).toBeGreaterThanOrEqual(0);
    });
  });

  it.each([
    ["TemplateResRef", { label: "TemplateResRef", type: "resref" as const, value: "nw_waypoint002" }],
    ["Tag", { label: "Tag", type: "cexostring" as const, value: "OTHER" }],
  ])("rejects a blueprint %s that differs from retained scene identity", (_label, replacement) => {
    const pair = fixturePair();
    const fields = waypointBlueprintFields().map((field) => field.label === replacement.label ? replacement : field);
    const bytes = buildGffBuffer(fields, "UTW ", ROOT_TYPE);
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [waypointAddition(bytes, { x: 1, y: 2, z: 0, bearing: 0 })],
    })).toThrow(expect.objectContaining({ diagnostics: ["waypoint:addition=0:blueprint_identity"] }));
  });

  it("copies admitted optional waypoint fields when the UTW explicitly carries them", () => {
    const pair = fixturePair();
    const fields: SupportedGffField[] = [
      ...waypointBlueprintFields(),
      { label: "Appearance", type: "byte", value: 7 },
      { label: "MapNote", type: "cexolocstring", value: { strRef: 42, entries: [{ languageId: 0, text: "Marker" }] } },
      { label: "MapNoteEnabled", type: "byte", value: 0 },
    ];
    const bytes = buildGffBuffer(fields, "UTW ", ROOT_TYPE);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [waypointAddition(bytes, { x: 1, y: 2, z: 0, bearing: 0 })],
    });
    const entry = list(parseRawGffDocument(result.gitBytes), "WaypointList")!.value.at(-1)!;
    expect(entry.fields).toEqual(expect.arrayContaining([
      { label: "Appearance", type: "byte", value: 7 },
      { label: "MapNote", type: "cexolocstring", value: { strRef: 42, entries: [{ languageId: 0, text: "Marker" }] } },
      { label: "MapNoteEnabled", type: "byte", value: 0 },
    ]));
  });

  it.each([
    ["Appearance", { label: "Appearance", type: "byte" as const, value: 7 }],
    ["MapNote", { label: "MapNote", type: "cexolocstring" as const, value: { strRef: 42, entries: [] } }],
    ["MapNoteEnabled", { label: "MapNoteEnabled", type: "byte" as const, value: 0 }],
  ])("rejects duplicate or wrongly typed optional %s fields", (label, field) => {
    const pair = fixturePair();
    const wrong = wrongTypeField(label, field.type);
    for (const optionals of [[field, field], [wrong]]) {
      const bytes = buildGffBuffer([...waypointBlueprintFields(), ...optionals], "UTW ", ROOT_TYPE);
      expect(() => mutateExistingAreaObjectsInGitGic({
        sourceGit: pair.git,
        sourceGic: pair.gic,
        deletions: [],
        additions: [waypointAddition(bytes, { x: 1, y: 2, z: 0, bearing: 0 })],
      })).toThrow(expect.objectContaining({
        diagnostics: [expect.stringMatching(new RegExp(`^waypoint:addition=0:${label}:`, "u"))],
      }));
    }
  });

  it("transforms native ground-item position and orientation-vector fields while preserving GIC bytes", () => {
    const pair = fixturePair();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{
        kind: "item",
        sourceIndex: 1,
        x: 5.5,
        y: 4.25,
        z: 0.2,
        bearing: Math.PI / 3,
      }],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.transformedCounts).toEqual(expect.objectContaining({
      creature: 0,
      item: 1,
      placeable: 0,
      waypoint: 0,
    }));
    const item = list(parseRawGffDocument(result.gitBytes), "List")!.value[1]!;
    expect(item.fields).toEqual(expect.arrayContaining([
      { label: "Tag", type: "cexostring", value: "ITEM_2" },
      { label: "UnknownItemField", type: "int", value: 202 },
      { label: "XPosition", type: "float", value: 55 },
      { label: "YPosition", type: "float", value: 42.5 },
      { label: "ZPosition", type: "float", value: 2 },
      { label: "XOrientation", type: "float", value: Math.fround(Math.cos(Math.PI / 3)) },
      { label: "YOrientation", type: "float", value: Math.fround(-Math.sin(Math.PI / 3)) },
    ]));
  });

  it("transforms only native sound position fields while preserving GIC and all other GIT fields", () => {
    const pair = fixturePair();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{
        kind: "sound",
        sourceIndex: 0,
        x: 2.75,
        y: 3.25,
        z: 0.5,
      }],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.transformedCounts).toEqual(expect.objectContaining({
      creature: 0,
      item: 0,
      sound: 1,
      waypoint: 0,
    }));
    const sound = list(parseRawGffDocument(result.gitBytes), "SoundList")!.value[0]!;
    expect(sound.fields).toEqual(expect.arrayContaining([
      { label: "Tag", type: "cexostring", value: "SOUND_1" },
      { label: "UnknownSoundFiel", type: "int", value: 101 },
      { label: "XPosition", type: "float", value: 27.5 },
      { label: "YPosition", type: "float", value: 32.5 },
      { label: "ZPosition", type: "float", value: 5 },
    ]));
    expect(sound.fields.some((field) =>
      field.label === "Bearing" ||
      field.label === "XOrientation" ||
      field.label === "YOrientation"
    )).toBe(false);
  });

  it("mutates the exact retained Sound interval/variation tuple with full-struct readback", () => {
    const pair = fixturePair();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{ kind: "sound", sourceIndex: 0, x: 2.75, y: 3.25, z: 0.5 }],
      soundIntervalVariationMutations: [{
        kind: "sound",
        sourceObjectId: "obj_sound_0",
        sourceIndex: 0,
        expectedValue: {
          intervalMilliseconds: 25_000,
          intervalVariationMilliseconds: 5_000,
          pitchVariationHundredths: 20,
          volumeVariationByte: 64,
        },
        value: {
          intervalMilliseconds: 12_340,
          intervalVariationMilliseconds: 1_230,
          pitchVariationHundredths: 35,
          volumeVariationByte: 127,
        },
      }],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.soundIntervalVariationUpdatedCounts).toEqual(expect.objectContaining({
      sound: 1,
      placeable: 0,
    }));
    const sound = list(parseRawGffDocument(result.gitBytes), "SoundList")!.value[0]!;
    expect(sound.fields).toEqual(expect.arrayContaining([
      { label: "UnknownSoundFiel", type: "int", value: 101 },
      { label: "XPosition", type: "float", value: 27.5 },
      { label: "Interval", type: "dword", value: 12_340 },
      { label: "IntervalVrtn", type: "dword", value: 1_230 },
      { label: "PitchVariation", type: "float", value: Math.fround(0.35) },
      { label: "VolumeVrtn", type: "byte", value: 127 },
    ]));
  });

  it("mutates exact retained Sound base volume alongside interval storage with full-struct readback", () => {
    const pair = fixturePair();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      soundVolumeMutations: [{
        kind: "sound", sourceObjectId: "obj_sound_0", sourceIndex: 0,
        expectedValue: { volumeByte: 64 }, value: { volumeByte: 127 },
      }],
      soundIntervalVariationMutations: [{
        kind: "sound", sourceObjectId: "obj_sound_0", sourceIndex: 0,
        expectedValue: {
          intervalMilliseconds: 25_000, intervalVariationMilliseconds: 5_000,
          pitchVariationHundredths: 20, volumeVariationByte: 64,
        },
        value: {
          intervalMilliseconds: 12_340, intervalVariationMilliseconds: 1_230,
          pitchVariationHundredths: 35, volumeVariationByte: 127,
        },
      }],
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.soundVolumeUpdatedCounts).toEqual(expect.objectContaining({
      sound: 1, placeable: 0,
    }));
    const sound = list(parseRawGffDocument(result.gitBytes), "SoundList")!.value[0]!;
    expect(sound.fields).toEqual(expect.arrayContaining([
      { label: "UnknownSoundFiel", type: "int", value: 101 },
      { label: "Volume", type: "byte", value: 127 },
      { label: "Interval", type: "dword", value: 12_340 },
      { label: "VolumeVrtn", type: "byte", value: 127 },
    ]));
  });

  it("rejects stale, duplicate, deleted, and malformed exact Sound base-volume targets", () => {
    const pair = fixturePair();
    const mutation = {
      kind: "sound" as const, sourceObjectId: "obj_sound_0", sourceIndex: 0,
      expectedValue: { volumeByte: 64 }, value: { volumeByte: 127 },
    };
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git, sourceGic: pair.gic, deletions: [],
      soundVolumeMutations: [{ ...mutation, expectedValue: { volumeByte: 63 } }],
    }))).toMatchObject({ diagnostics: ["sound:index=0:Volume:stale"] });
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git, sourceGic: pair.gic, deletions: [],
      soundVolumeMutations: [mutation, mutation],
    }))).toMatchObject({ diagnostics: ["sound:index=0"] });
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git, sourceGic: pair.gic,
      deletions: [{ kind: "sound", sourceIndex: 0 }], soundVolumeMutations: [mutation],
    }))).toMatchObject({ diagnostics: ["sound:index=0"] });
    const git = parseRawGffDocument(pair.git)!;
    const sound = list(git, "SoundList")!.value[0]!;
    sound.fields = sound.fields.map((field) => field.label === "Volume"
      ? { label: "Volume", type: "word" as const, value: 64 }
      : field);
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      sourceGic: pair.gic, deletions: [], soundVolumeMutations: [mutation],
    }))).toMatchObject({
      diagnostics: ["sound:index=0:Volume:count=1:label=Volume:type=word"],
    });
  });

  it("mutates exact retained Sound Hours/Times schedule alongside base volume with full-struct readback", () => {
    const pair = fixturePair();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      soundScheduleMutations: [{
        kind: "sound", sourceObjectId: "obj_sound_0", sourceIndex: 0,
        expectedValue: { hoursMask: 0, timesByte: 3 },
        value: { hoursMask: 0x800001, timesByte: 0 },
      }],
      soundVolumeMutations: [{
        kind: "sound", sourceObjectId: "obj_sound_0", sourceIndex: 0,
        expectedValue: { volumeByte: 64 }, value: { volumeByte: 127 },
      }],
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.soundScheduleUpdatedCounts).toEqual(expect.objectContaining({
      sound: 1, placeable: 0,
    }));
    const sound = list(parseRawGffDocument(result.gitBytes), "SoundList")!.value[0]!;
    expect(sound.fields).toEqual(expect.arrayContaining([
      { label: "UnknownSoundFiel", type: "int", value: 101 },
      { label: "Hours", type: "dword", value: 0x800001 },
      { label: "Times", type: "byte", value: 0 },
      { label: "Volume", type: "byte", value: 127 },
      { label: "Interval", type: "dword", value: 25_000 },
      { label: "VolumeVrtn", type: "byte", value: 64 },
    ]));
  });

  it("rejects stale, duplicate, deleted, and malformed exact Sound Hours/Times schedule targets", () => {
    const pair = fixturePair();
    const mutation = {
      kind: "sound" as const, sourceObjectId: "obj_sound_0", sourceIndex: 0,
      expectedValue: { hoursMask: 0, timesByte: 3 },
      value: { hoursMask: 0x800001, timesByte: 0 },
    };
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git, sourceGic: pair.gic, deletions: [],
      soundScheduleMutations: [{ ...mutation, expectedValue: { hoursMask: 1, timesByte: 3 } }],
    }))).toMatchObject({ diagnostics: ["sound:index=0:Hours:stale"] });
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git, sourceGic: pair.gic, deletions: [],
      soundScheduleMutations: [{ ...mutation, expectedValue: { hoursMask: 0, timesByte: 2 } }],
    }))).toMatchObject({ diagnostics: ["sound:index=0:Times:stale"] });
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git, sourceGic: pair.gic, deletions: [],
      soundScheduleMutations: [mutation, mutation],
    }))).toMatchObject({ diagnostics: ["sound:index=0"] });
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git, sourceGic: pair.gic,
      deletions: [{ kind: "sound", sourceIndex: 0 }], soundScheduleMutations: [mutation],
    }))).toMatchObject({ diagnostics: ["sound:index=0"] });
    const git = parseRawGffDocument(pair.git)!;
    const sound = list(git, "SoundList")!.value[0]!;
    sound.fields = sound.fields.map((field) => field.label === "Times"
      ? { label: "Times", type: "word" as const, value: 3 }
      : field);
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      sourceGic: pair.gic, deletions: [], soundScheduleMutations: [mutation],
    }))).toMatchObject({
      diagnostics: ["sound:index=0:Times:count=1:label=Times:type=word"],
    });
  });

  it("mutates exact retained Sound Active alongside schedule with full-struct readback", () => {
    const pair = fixturePair();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      soundActiveMutations: [{
        kind: "sound", sourceObjectId: "obj_sound_0", sourceIndex: 0,
        expectedValue: { activeByte: 1 }, value: { activeByte: 0 },
      }],
      soundPlayOrderMutations: [{
        kind: "sound", sourceObjectId: "obj_sound_0", sourceIndex: 0,
        expectedValue: { randomByte: 0 }, value: { randomByte: 1 },
      }],
      soundScheduleMutations: [{
        kind: "sound", sourceObjectId: "obj_sound_0", sourceIndex: 0,
        expectedValue: { hoursMask: 0, timesByte: 3 },
        value: { hoursMask: 0x800001, timesByte: 0 },
      }],
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.soundActiveUpdatedCounts).toEqual(expect.objectContaining({
      sound: 1, placeable: 0,
    }));
    expect(result.soundPlayOrderUpdatedCounts).toEqual(expect.objectContaining({
      sound: 1, placeable: 0,
    }));
    const sound = list(parseRawGffDocument(result.gitBytes), "SoundList")!.value[0]!;
    expect(sound.fields).toEqual(expect.arrayContaining([
      { label: "UnknownSoundFiel", type: "int", value: 101 },
      { label: "Active", type: "byte", value: 0 },
      { label: "Random", type: "byte", value: 1 },
      { label: "Hours", type: "dword", value: 0x800001 },
      { label: "Times", type: "byte", value: 0 },
      { label: "Volume", type: "byte", value: 64 },
      { label: "Interval", type: "dword", value: 25_000 },
    ]));
  });

  it("rejects stale and wrong-type exact Sound Play Order targets", () => {
    const pair = fixturePair();
    const mutation = {
      kind: "sound" as const, sourceObjectId: "obj_sound_0", sourceIndex: 0,
      expectedValue: { randomByte: 0 as const }, value: { randomByte: 1 as const },
    };
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git, sourceGic: pair.gic, deletions: [],
      soundPlayOrderMutations: [{
        ...mutation, expectedValue: { randomByte: 1 }, value: { randomByte: 0 },
      }],
    }))).toMatchObject({ diagnostics: ["sound:index=0:Random:stale"] });
    const git = parseRawGffDocument(pair.git)!;
    const sound = list(git, "SoundList")!.value[0]!;
    sound.fields = sound.fields.map((field) => field.label === "Random"
      ? { label: "Random", type: "word" as const, value: 0 }
      : field);
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      sourceGic: pair.gic, deletions: [], soundPlayOrderMutations: [mutation],
    }))).toMatchObject({
      diagnostics: ["sound:index=0:Random:count=1:label=Random:type=word"],
    });
  });

  it("mutates canonical Sound Play Style and its derived Priority as one complete CAS", () => {
    const pair = fixturePair();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      soundPlayStyleMutations: [{
        kind: "sound", sourceObjectId: "obj_sound_0", sourceIndex: 0,
        expectedValue: {
          loopingByte: 0, continuousByte: 1, priorityByte: 20, positionalByte: 1,
          soundsCount: 2, intervalDword: 25_000, intervalVariationDword: 5_000,
        },
        value: {
          loopingByte: 1, continuousByte: 0, priorityByte: 3, positionalByte: 1,
          soundsCount: 2, intervalDword: 25_000, intervalVariationDword: 5_000,
        },
      }],
    } as any) as any;
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.soundPlayStyleUpdatedCounts).toEqual(expect.objectContaining({
      sound: 1, placeable: 0,
    }));
    const sound = list(parseRawGffDocument(result.gitBytes), "SoundList")!.value[0]!;
    expect(sound.fields).toEqual(expect.arrayContaining([
      { label: "Continuous", type: "byte", value: 0 },
      { label: "Looping", type: "byte", value: 1 },
      { label: "Priority", type: "byte", value: 3 },
      { label: "Positional", type: "byte", value: 1 },
      { label: "Interval", type: "dword", value: 25_000 },
      { label: "IntervalVrtn", type: "dword", value: 5_000 },
    ]));
  });

  it("atomically mutates exact Sound playback list, Play Style, and derived Priority", () => {
    const pair = fixturePair();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      soundPlaybackMutations: [{
        kind: "sound", sourceObjectId: "obj_sound_0", sourceIndex: 0,
        expectedValue: {
          sounds: ["snd_a", "snd_b"],
          loopingByte: 0, continuousByte: 1, priorityByte: 20, positionalByte: 1,
          intervalDword: 25_000, intervalVariationDword: 5_000,
        },
        value: {
          sounds: ["snd_b", "snd_b", "snd_c"],
          loopingByte: 1, continuousByte: 0, priorityByte: 3, positionalByte: 1,
          intervalDword: 25_000, intervalVariationDword: 5_000,
        },
      }],
    } as any) as any;
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.soundPlaybackUpdatedCounts).toEqual(expect.objectContaining({
      sound: 1, placeable: 0,
    }));
    const sound = list(parseRawGffDocument(result.gitBytes), "SoundList")!.value[0]!;
    expect(sound.fields).toEqual(expect.arrayContaining([
      { label: "UnknownSoundFiel", type: "int", value: 101 },
      { label: "Continuous", type: "byte", value: 0 },
      { label: "Looping", type: "byte", value: 1 },
      { label: "Priority", type: "byte", value: 3 },
      { label: "Positional", type: "byte", value: 1 },
      { label: "Interval", type: "dword", value: 25_000 },
      { label: "IntervalVrtn", type: "dword", value: 5_000 },
    ]));
    const sounds = list({ fields: sound.fields } as any, "Sounds")!;
    expect(sounds.value).toEqual([
      { typeId: 0, fields: [{ label: "Sound", type: "resref", value: "snd_b" }] },
      { typeId: 0, fields: [{ label: "Sound", type: "resref", value: "snd_b" }] },
      { typeId: 0, fields: [{ label: "Sound", type: "resref", value: "snd_c" }] },
    ]);
  });

  it("rejects malformed source Sound playback child structure", () => {
    const pair = fixturePair();
    const git = parseRawGffDocument(pair.git)!;
    const sound = list(git, "SoundList")!.value[0]!;
    const sounds = list({ fields: sound.fields } as any, "Sounds")!;
    sounds.value[0]!.fields.push({ label: "Extra", type: "byte", value: 1 });
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      soundPlaybackMutations: [{
        kind: "sound", sourceObjectId: "obj_sound_0", sourceIndex: 0,
        expectedValue: {
          sounds: ["snd_a", "snd_b"],
          loopingByte: 0, continuousByte: 1, priorityByte: 20, positionalByte: 1,
          intervalDword: 25_000, intervalVariationDword: 5_000,
        },
        value: {
          sounds: ["snd_b"],
          loopingByte: 0, continuousByte: 1, priorityByte: 20, positionalByte: 1,
          intervalDword: 25_000, intervalVariationDword: 5_000,
        },
      }],
    } as any))).toMatchObject({
      diagnostics: ["sound:index=0:Sounds=0:profile_mismatch"],
    });
  });

  it("atomically mutates one exact Sound playback and spatial profile", () => {
    const pair = fixturePair();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      soundProfileMutations: [{
        kind: "sound", sourceObjectId: "obj_sound_0", sourceIndex: 0,
        expectedValue: {
          sounds: ["snd_a", "snd_b"],
          loopingByte: 0, continuousByte: 1, priorityByte: 20,
          positionalByte: 1, randomPositionByte: 0,
          elevationFloat32: 0, maxDistanceFloat32: 14, minDistanceFloat32: 2,
          randomRangeXFloat32: 0, randomRangeYFloat32: 0,
          intervalDword: 25_000, intervalVariationDword: 5_000,
        },
        value: {
          sounds: ["snd_b", "snd_b", "snd_c"],
          loopingByte: 1, continuousByte: 0, priorityByte: 3,
          positionalByte: 1, randomPositionByte: 1,
          elevationFloat32: 1.25, maxDistanceFloat32: 20, minDistanceFloat32: 4,
          randomRangeXFloat32: 8, randomRangeYFloat32: 9,
          intervalDword: 25_000, intervalVariationDword: 5_000,
        },
      }],
    } as any) as any;
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.soundProfileUpdatedCounts).toEqual(expect.objectContaining({
      sound: 1, placeable: 0,
    }));
    const sound = list(parseRawGffDocument(result.gitBytes), "SoundList")!.value[0]!;
    expect(sound.fields).toEqual(expect.arrayContaining([
      { label: "UnknownSoundFiel", type: "int", value: 101 },
      { label: "Continuous", type: "byte", value: 0 },
      { label: "Looping", type: "byte", value: 1 },
      { label: "Priority", type: "byte", value: 3 },
      { label: "Positional", type: "byte", value: 1 },
      { label: "RandomPosition", type: "byte", value: 1 },
      { label: "Elevation", type: "float", value: 1.25 },
      { label: "MaxDistance", type: "float", value: 20 },
      { label: "MinDistance", type: "float", value: 4 },
      { label: "RandomRangeX", type: "float", value: 8 },
      { label: "RandomRangeY", type: "float", value: 9 },
      { label: "Interval", type: "dword", value: 25_000 },
      { label: "IntervalVrtn", type: "dword", value: 5_000 },
    ]));
    expect(list({ fields: sound.fields } as any, "Sounds")!.value).toEqual([
      { typeId: 0, fields: [{ label: "Sound", type: "resref", value: "snd_b" }] },
      { typeId: 0, fields: [{ label: "Sound", type: "resref", value: "snd_b" }] },
      { typeId: 0, fields: [{ label: "Sound", type: "resref", value: "snd_c" }] },
    ]);
  });

  it("rejects stale, duplicate, deleted, and malformed exact Sound Active targets", () => {
    const pair = fixturePair();
    const mutation = {
      kind: "sound" as const, sourceObjectId: "obj_sound_0", sourceIndex: 0,
      expectedValue: { activeByte: 1 as const }, value: { activeByte: 0 as const },
    };
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git, sourceGic: pair.gic, deletions: [],
      soundActiveMutations: [{
        ...mutation, expectedValue: { activeByte: 0 }, value: { activeByte: 1 },
      }],
    }))).toMatchObject({ diagnostics: ["sound:index=0:Active:stale"] });
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git, sourceGic: pair.gic, deletions: [],
      soundActiveMutations: [mutation, mutation],
    }))).toMatchObject({ diagnostics: ["sound:index=0"] });
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git, sourceGic: pair.gic,
      deletions: [{ kind: "sound", sourceIndex: 0 }], soundActiveMutations: [mutation],
    }))).toMatchObject({ diagnostics: ["sound:index=0"] });
    const git = parseRawGffDocument(pair.git)!;
    const sound = list(git, "SoundList")!.value[0]!;
    sound.fields = sound.fields.map((field) => field.label === "Active"
      ? { label: "Active", type: "word" as const, value: 1 }
      : field);
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      sourceGic: pair.gic, deletions: [], soundActiveMutations: [mutation],
    }))).toMatchObject({
      diagnostics: ["sound:index=0:Active:count=1:label=Active:type=word"],
    });
  });

  it("rejects stale, duplicate, deleted, and malformed exact Sound interval/variation targets", () => {
    const pair = fixturePair();
    const mutation = {
      kind: "sound" as const,
      sourceObjectId: "obj_sound_0",
      sourceIndex: 0,
      expectedValue: {
        intervalMilliseconds: 25_000,
        intervalVariationMilliseconds: 5_000,
        pitchVariationHundredths: 20,
        volumeVariationByte: 64,
      },
      value: {
        intervalMilliseconds: 10_000,
        intervalVariationMilliseconds: 1_000,
        pitchVariationHundredths: 10,
        volumeVariationByte: 32,
      },
    };
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      soundIntervalVariationMutations: [{
        ...mutation,
        expectedValue: { ...mutation.expectedValue, intervalMilliseconds: 24_000 },
      }],
    }))).toMatchObject({ diagnostics: ["sound:index=0:Interval:stale"] });
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      soundIntervalVariationMutations: [mutation, mutation],
    }))).toMatchObject({ diagnostics: ["sound:index=0"] });
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [{ kind: "sound", sourceIndex: 0 }],
      soundIntervalVariationMutations: [mutation],
    }))).toMatchObject({ diagnostics: ["sound:index=0"] });

    const git = parseRawGffDocument(pair.git)!;
    const sound = list(git, "SoundList")!.value[0]!;
    sound.fields = sound.fields.map((field) => field.label === "VolumeVrtn"
      ? { label: "VolumeVrtn", type: "word" as const, value: 64 }
      : field);
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      soundIntervalVariationMutations: [mutation],
    }))).toMatchObject({
      diagnostics: ["sound:index=0:VolumeVrtn:count=1:label=VolumeVrtn:type=word"],
    });
  });

  it.each(["Bearing", "XOrientation", "YOrientation"])(
    "rejects ambiguous native %s on a sound position transform",
    (label) => {
      const pair = fixturePair();
      const git = parseRawGffDocument(pair.git)!;
      const sound = list(git, "SoundList")!.value[0]!;
      sound.fields.push({ label, type: "float", value: 0 });

      expect(pairError(() => mutateExistingAreaObjectsInGitGic({
        sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
        sourceGic: pair.gic,
        deletions: [],
        transforms: [{ kind: "sound", sourceIndex: 0, x: 1, y: 2, z: 3 }],
      }))).toMatchObject({
        code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
        message: "Sound transform requires one unambiguous native float field for each transform component.",
        diagnostics: [`sound:index=0:${label}:count=1`],
      });
    },
  );

  it("transforms native store position and orientation-vector fields while preserving GIC and commerce fields", () => {
    const pair = fixturePair();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{
        kind: "store",
        sourceIndex: 0,
        x: 4.75,
        y: 5.25,
        z: 0.1,
        bearing: Math.PI / 3,
      }],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.transformedCounts).toEqual(expect.objectContaining({
      sound: 0,
      store: 1,
      waypoint: 0,
    }));
    const store = list(parseRawGffDocument(result.gitBytes), "StoreList")!.value[0]!;
    expect(store.fields).toEqual(expect.arrayContaining([
      { label: "Tag", type: "cexostring", value: "STORE_1" },
      { label: "UnknownStoreFiel", type: "int", value: 101 },
      { label: "MarkUp", type: "int", value: 100 },
      { label: "OnOpenStore", type: "resref", value: "store_open" },
      { label: "StoreList", type: "list", value: [{
        typeId: 0,
        fields: [{ label: "ItemList", type: "list", value: [] }],
      }] },
      { label: "XPosition", type: "float", value: 47.5 },
      { label: "YPosition", type: "float", value: 52.5 },
      { label: "ZPosition", type: "float", value: 1 },
      { label: "XOrientation", type: "float", value: Math.fround(Math.cos(Math.PI / 3)) },
      { label: "YOrientation", type: "float", value: Math.fround(-Math.sin(Math.PI / 3)) },
    ]));
  });

  it("rejects an ambiguous native Bearing field on a store transform", () => {
    const pair = fixturePair();
    const git = parseRawGffDocument(pair.git)!;
    const store = list(git, "StoreList")!.value[0]!;
    store.fields.push({ label: "Bearing", type: "float", value: 0 });

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{ kind: "store", sourceIndex: 0, x: 1, y: 2, z: 3, bearing: 0 }],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      message: "Store transform requires one unambiguous native float field for each transform component.",
      diagnostics: ["store:index=0:Bearing:count=1"],
    });
  });

  it("transforms only a native trigger origin while preserving orientation, geometry, GIC, and other fields", () => {
    const pair = fixturePair();
    const sourceTrigger = list(parseRawGffDocument(pair.git), "TriggerList")!.value[0]!;
    const sourceGeometry = sourceTrigger.fields.find((field) => field.label === "Geometry");

    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{
        kind: "trigger",
        sourceIndex: 0,
        x: 4.25,
        y: 5.75,
        z: 0.5,
      }],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.transformedCounts).toEqual(expect.objectContaining({
      store: 0,
      trigger: 1,
      waypoint: 0,
    }));
    const trigger = list(parseRawGffDocument(result.gitBytes), "TriggerList")!.value[0]!;
    expect(trigger.fields).toEqual(expect.arrayContaining([
      { label: "Tag", type: "cexostring", value: "TRIGGER_1" },
      { label: "UnknownTriggerFi", type: "int", value: 101 },
      { label: "XPosition", type: "float", value: 42.5 },
      { label: "YPosition", type: "float", value: 57.5 },
      { label: "ZPosition", type: "float", value: 5 },
      { label: "XOrientation", type: "float", value: 0 },
      { label: "YOrientation", type: "float", value: 0 },
      { label: "ZOrientation", type: "float", value: 0 },
      sourceGeometry!,
    ]));
    expect(trigger.fields.some((field) => field.label === "Bearing")).toBe(false);
  });

  it("rejects an ambiguous native Bearing field on a trigger position transform", () => {
    const pair = fixturePair();
    const git = parseRawGffDocument(pair.git)!;
    const trigger = list(git, "TriggerList")!.value[0]!;
    trigger.fields.push({ label: "Bearing", type: "float", value: 0 });

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{ kind: "trigger", sourceIndex: 0, x: 1, y: 2, z: 3 }],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      message: "Trigger transform requires one unambiguous native float field for each transform component.",
      diagnostics: ["trigger:index=0:Bearing:count=1"],
    });
  });

  it("rejects malformed trigger geometry before changing its origin", () => {
    const pair = fixturePair();
    const git = parseRawGffDocument(pair.git)!;
    const trigger = list(git, "TriggerList")!.value[0]!;
    const geometry = trigger.fields.find((field) => field.label === "Geometry");
    if (geometry?.type !== "list") throw new Error("Trigger fixture geometry is missing.");
    geometry.value[0]!.fields = geometry.value[0]!.fields.filter((field) => field.label !== "PointZ");

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{ kind: "trigger", sourceIndex: 0, x: 1, y: 2, z: 3 }],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      message: "Trigger transform requires one preserved native polygon geometry and orientation profile.",
      diagnostics: ["trigger:index=0:Geometry:point=0:PointZ:count=0:type=missing"],
    });
  });

  it("rejects a trigger position target with a missing preserved orientation field", () => {
    const pair = fixturePair();
    const git = parseRawGffDocument(pair.git)!;
    const trigger = list(git, "TriggerList")!.value[0]!;
    trigger.fields = trigger.fields.filter((field) => field.label !== "ZOrientation");

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{ kind: "trigger", sourceIndex: 0, x: 1, y: 2, z: 3 }],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      message: "Trigger transform requires one preserved native polygon geometry and orientation profile.",
      diagnostics: ["trigger:index=0:ZOrientation:count=0:type=missing"],
    });
  });

  it("rejects a trigger position target with a wrongly typed preserved orientation field", () => {
    const pair = fixturePair();
    const git = parseRawGffDocument(pair.git)!;
    const trigger = list(git, "TriggerList")!.value[0]!;
    trigger.fields = trigger.fields.map((field) =>
      field.label === "YOrientation"
        ? { label: "YOrientation", type: "int" as const, value: 0 }
        : field,
    );

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{ kind: "trigger", sourceIndex: 0, x: 1, y: 2, z: 3 }],
    }))).toMatchObject({
      diagnostics: ["trigger:index=0:YOrientation:count=1:type=int"],
    });
  });

  it("rejects a trigger position target with a duplicate preserved orientation field", () => {
    const pair = fixturePair();
    const git = parseRawGffDocument(pair.git)!;
    const trigger = list(git, "TriggerList")!.value[0]!;
    const xOrientation = trigger.fields.find((field) => field.label === "XOrientation")!;
    trigger.fields.push(xOrientation);

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{ kind: "trigger", sourceIndex: 0, x: 1, y: 2, z: 3 }],
    }))).toMatchObject({
      diagnostics: ["trigger:index=0:XOrientation:count=2:type=float"],
    });
  });

  it("rejects a trigger position target without native Geometry", () => {
    const pair = fixturePair();
    const git = parseRawGffDocument(pair.git)!;
    const trigger = list(git, "TriggerList")!.value[0]!;
    trigger.fields = trigger.fields.filter((field) => field.label !== "Geometry");

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{ kind: "trigger", sourceIndex: 0, x: 1, y: 2, z: 3 }],
    }))).toMatchObject({
      diagnostics: ["trigger:index=0:Geometry:count=0:type=missing"],
    });
  });

  it("rejects a trigger position target with duplicate native Geometry", () => {
    const pair = fixturePair();
    const git = parseRawGffDocument(pair.git)!;
    const trigger = list(git, "TriggerList")!.value[0]!;
    const geometry = trigger.fields.find((field) => field.label === "Geometry")!;
    trigger.fields.push(geometry);

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{ kind: "trigger", sourceIndex: 0, x: 1, y: 2, z: 3 }],
    }))).toMatchObject({
      diagnostics: ["trigger:index=0:Geometry:count=2:type=list"],
    });
  });

  it("rejects a trigger position target with wrongly typed native Geometry", () => {
    const pair = fixturePair();
    const git = parseRawGffDocument(pair.git)!;
    const trigger = list(git, "TriggerList")!.value[0]!;
    trigger.fields = trigger.fields.map((field) =>
      field.label === "Geometry"
        ? { label: "Geometry", type: "int" as const, value: 0 }
        : field,
    );

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{ kind: "trigger", sourceIndex: 0, x: 1, y: 2, z: 3 }],
    }))).toMatchObject({
      diagnostics: ["trigger:index=0:Geometry:count=1:type=int"],
    });
  });

  it("rejects a trigger polygon with fewer than three points", () => {
    const pair = fixturePair();
    const git = parseRawGffDocument(pair.git)!;
    const trigger = list(git, "TriggerList")!.value[0]!;
    const geometry = trigger.fields.find((field) => field.label === "Geometry");
    if (geometry?.type !== "list") throw new Error("Trigger fixture geometry is missing.");
    geometry.value.splice(2);

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{ kind: "trigger", sourceIndex: 0, x: 1, y: 2, z: 3 }],
    }))).toMatchObject({
      diagnostics: ["trigger:index=0:Geometry:count=2:min=3"],
    });
  });

  it("accepts a trigger polygon with exactly three points", () => {
    const pair = fixturePair();
    const git = parseRawGffDocument(pair.git)!;
    const trigger = list(git, "TriggerList")!.value[0]!;
    const geometry = trigger.fields.find((field) => field.label === "Geometry");
    if (geometry?.type !== "list") throw new Error("Trigger fixture geometry is missing.");
    geometry.value.splice(3);

    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{ kind: "trigger", sourceIndex: 0, x: 1, y: 2, z: 3 }],
    });
    const candidateTrigger = list(parseRawGffDocument(result.gitBytes), "TriggerList")!.value[0]!;
    const candidateGeometry = candidateTrigger.fields.find((field) => field.label === "Geometry");
    expect(candidateGeometry).toMatchObject({ type: "list" });
    if (candidateGeometry?.type !== "list") throw new Error("Candidate trigger geometry is missing.");
    expect(candidateGeometry.value).toHaveLength(3);
  });

  it("rejects a trigger polygon point with the wrong native struct type", () => {
    const pair = fixturePair();
    const git = parseRawGffDocument(pair.git)!;
    const trigger = list(git, "TriggerList")!.value[0]!;
    const geometry = trigger.fields.find((field) => field.label === "Geometry");
    if (geometry?.type !== "list") throw new Error("Trigger fixture geometry is missing.");
    geometry.value[0]!.typeId = 2;

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{ kind: "trigger", sourceIndex: 0, x: 1, y: 2, z: 3 }],
    }))).toMatchObject({
      diagnostics: ["trigger:index=0:Geometry:point=0:type=2:expected=3"],
    });
  });

  it("rejects a trigger polygon point with a wrongly typed coordinate", () => {
    const pair = fixturePair();
    const git = parseRawGffDocument(pair.git)!;
    const trigger = list(git, "TriggerList")!.value[0]!;
    const geometry = trigger.fields.find((field) => field.label === "Geometry");
    if (geometry?.type !== "list") throw new Error("Trigger fixture geometry is missing.");
    geometry.value[0]!.fields = geometry.value[0]!.fields.map((field) =>
      field.label === "PointY"
        ? { label: "PointY", type: "int" as const, value: 0 }
        : field,
    );

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{ kind: "trigger", sourceIndex: 0, x: 1, y: 2, z: 3 }],
    }))).toMatchObject({
      diagnostics: ["trigger:index=0:Geometry:point=0:PointY:count=1:type=int"],
    });
  });

  it("rejects a trigger polygon point with a duplicate coordinate", () => {
    const pair = fixturePair();
    const git = parseRawGffDocument(pair.git)!;
    const trigger = list(git, "TriggerList")!.value[0]!;
    const geometry = trigger.fields.find((field) => field.label === "Geometry");
    if (geometry?.type !== "list") throw new Error("Trigger fixture geometry is missing.");
    const pointX = geometry.value[0]!.fields.find((field) => field.label === "PointX")!;
    geometry.value[0]!.fields.push(pointX);

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{ kind: "trigger", sourceIndex: 0, x: 1, y: 2, z: 3 }],
    }))).toMatchObject({
      diagnostics: ["trigger:index=0:Geometry:point=0:PointX:count=2:type=float"],
    });
  });

  it("rejects a trigger polygon point with a non-finite coordinate", () => {
    const pair = fixturePair();
    const git = parseRawGffDocument(pair.git)!;
    const trigger = list(git, "TriggerList")!.value[0]!;
    const geometry = trigger.fields.find((field) => field.label === "Geometry");
    if (geometry?.type !== "list") throw new Error("Trigger fixture geometry is missing.");
    const pointZ = geometry.value[0]!.fields.find((field) => field.label === "PointZ");
    if (pointZ?.type !== "float") throw new Error("Trigger fixture PointZ is missing.");
    pointZ.value = Number.NaN;

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{ kind: "trigger", sourceIndex: 0, x: 1, y: 2, z: 3 }],
    }))).toMatchObject({
      diagnostics: ["trigger:index=0:Geometry:point=0:PointZ:value=non_finite"],
    });
  });

  it("transforms only a native encounter origin while preserving geometry, empty spawn points, GIC, and other fields", () => {
    const pair = fixturePair();
    const sourceEncounter = list(parseRawGffDocument(pair.git), "Encounter List")!.value[0]!;
    const sourceGeometry = sourceEncounter.fields.find((field) => field.label === "Geometry");
    const sourceSpawnPoints = sourceEncounter.fields.find((field) => field.label === "SpawnPointList");

    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{ kind: "encounter", sourceIndex: 0, x: 4.25, y: 5.75, z: 0.5 }],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.transformedCounts).toEqual(expect.objectContaining({
      encounter: 1,
      trigger: 0,
    }));
    const encounter = list(parseRawGffDocument(result.gitBytes), "Encounter List")!.value[0]!;
    expect(encounter.fields).toEqual(expect.arrayContaining([
      { label: "Tag", type: "cexostring", value: "ENCOUNTER_1" },
      { label: "UnknownEncounter", type: "int", value: 101 },
      { label: "XPosition", type: "float", value: 42.5 },
      { label: "YPosition", type: "float", value: 57.5 },
      { label: "ZPosition", type: "float", value: 5 },
      sourceGeometry!,
      sourceSpawnPoints!,
    ]));
    expect(encounter.fields.some((field) => [
      "Bearing", "Facing", "Orientation", "XOrientation", "YOrientation", "ZOrientation",
    ].includes(field.label))).toBe(false);
  });

  it("admits the native minimum of exactly three encounter geometry points", () => {
    const pair = fixturePair();
    const git = parseRawGffDocument(pair.git)!;
    const encounter = list(git, "Encounter List")!.value[0]!;
    const geometry = encounter.fields.find((field) => field.label === "Geometry");
    if (geometry?.type !== "list") throw new Error("Encounter fixture Geometry is missing.");
    geometry.value.splice(3);

    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{ kind: "encounter", sourceIndex: 0, x: 4.25, y: 5.75, z: 0.5 }],
    });

    expect(list(parseRawGffDocument(result.gitBytes), "Encounter List")!.value[0]!.fields)
      .toContainEqual({ label: "XPosition", type: "float", value: 42.5 });
  });

  it.each(["Bearing", "Facing", "Orientation", "XOrientation", "YOrientation", "ZOrientation"])(
    "rejects ambiguous native %s on an encounter position transform",
    (label) => {
      const pair = fixturePair();
      const git = parseRawGffDocument(pair.git)!;
      const encounter = list(git, "Encounter List")!.value[0]!;
      encounter.fields.push({ label, type: "float", value: 0 });

      expect(pairError(() => mutateExistingAreaObjectsInGitGic({
        sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
        sourceGic: pair.gic,
        deletions: [],
        transforms: [{ kind: "encounter", sourceIndex: 0, x: 1, y: 2, z: 3 }],
      }))).toMatchObject({
        code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
        message: "Encounter transform requires one unambiguous native float field for each transform component.",
        diagnostics: [`encounter:index=0:${label}:count=1`],
      });
    },
  );

  it("rejects an encounter position transform with a populated native SpawnPointList", () => {
    const pair = fixturePair();
    const git = parseRawGffDocument(pair.git)!;
    const encounter = list(git, "Encounter List")!.value[0]!;
    const spawnPoints = encounter.fields.find((field) => field.label === "SpawnPointList");
    if (spawnPoints?.type !== "list") throw new Error("Encounter fixture SpawnPointList is missing.");
    spawnPoints.value.push({
      typeId: 2,
      fields: [
        { label: "X", type: "float", value: 1 },
        { label: "Y", type: "float", value: 2 },
        { label: "Z", type: "float", value: 0 },
        { label: "Orientation", type: "float", value: 0 },
      ],
    });

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{ kind: "encounter", sourceIndex: 0, x: 1, y: 2, z: 3 }],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      message: "Encounter transform requires one preserved native polygon and an empty spawn-point profile.",
      diagnostics: ["encounter:index=0:SpawnPointList:entries=1:expected=0"],
    });
  });

  it.each([
    ["missing Geometry", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "Geometry"), "encounter:index=0:Geometry:count=0:type=missing"],
    ["duplicate Geometry", (fields: SupportedGffField[]) => [...fields, fields.find((field) => field.label === "Geometry")!], "encounter:index=0:Geometry:count=2:type=list"],
    ["wrongly typed Geometry", (fields: SupportedGffField[]) => fields.map((field) => field.label === "Geometry" ? { label: "Geometry", type: "int" as const, value: 0 } : field), "encounter:index=0:Geometry:count=1:type=int"],
    ["missing SpawnPointList", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "SpawnPointList"), "encounter:index=0:SpawnPointList:count=0:type=missing"],
    ["duplicate SpawnPointList", (fields: SupportedGffField[]) => [...fields, fields.find((field) => field.label === "SpawnPointList")!], "encounter:index=0:SpawnPointList:count=2:type=list"],
    ["wrongly typed SpawnPointList", (fields: SupportedGffField[]) => fields.map((field) => field.label === "SpawnPointList" ? { label: "SpawnPointList", type: "int" as const, value: 0 } : field), "encounter:index=0:SpawnPointList:count=1:type=int"],
  ])("rejects an encounter position target with %s", (_label, mutateFields, diagnostic) => {
    const pair = fixturePair();
    const git = parseRawGffDocument(pair.git)!;
    const encounter = list(git, "Encounter List")!.value[0]!;
    encounter.fields = mutateFields(encounter.fields);

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{ kind: "encounter", sourceIndex: 0, x: 1, y: 2, z: 3 }],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      message: "Encounter transform requires one preserved native polygon and an empty spawn-point profile.",
      diagnostics: [diagnostic],
    });
  });

  it.each([
    ["fewer than three points", (geometry: Extract<SupportedGffField, { type: "list" }>) => geometry.value.splice(2), "encounter:index=0:Geometry:count=2:min=3"],
    ["wrong point struct type", (geometry: Extract<SupportedGffField, { type: "list" }>) => { geometry.value[0]!.typeId = 3; }, "encounter:index=0:Geometry:point=0:type=3:expected=1"],
    ["missing coordinate", (geometry: Extract<SupportedGffField, { type: "list" }>) => { geometry.value[0]!.fields = geometry.value[0]!.fields.filter((field) => field.label !== "Z"); }, "encounter:index=0:Geometry:point=0:Z:count=0:type=missing"],
    ["duplicate coordinate", (geometry: Extract<SupportedGffField, { type: "list" }>) => { geometry.value[0]!.fields.push(geometry.value[0]!.fields.find((field) => field.label === "X")!); }, "encounter:index=0:Geometry:point=0:X:count=2:type=float"],
    ["wrong coordinate type", (geometry: Extract<SupportedGffField, { type: "list" }>) => { geometry.value[0]!.fields = geometry.value[0]!.fields.map((field) => field.label === "Y" ? { label: "Y", type: "int" as const, value: 0 } : field); }, "encounter:index=0:Geometry:point=0:Y:count=1:type=int"],
    ["non-finite coordinate", (geometry: Extract<SupportedGffField, { type: "list" }>) => { const z = geometry.value[0]!.fields.find((field) => field.label === "Z"); if (z?.type === "float") z.value = Number.NaN; }, "encounter:index=0:Geometry:point=0:Z:value=non_finite"],
  ])("rejects encounter geometry with %s", (_label, mutateGeometry, diagnostic) => {
    const pair = fixturePair();
    const git = parseRawGffDocument(pair.git)!;
    const encounter = list(git, "Encounter List")!.value[0]!;
    const geometry = encounter.fields.find((field) => field.label === "Geometry");
    if (geometry?.type !== "list") throw new Error("Encounter fixture Geometry is missing.");
    mutateGeometry(geometry);

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{ kind: "encounter", sourceIndex: 0, x: 1, y: 2, z: 3 }],
    }))).toMatchObject({
      diagnostics: [diagnostic],
    });
  });

  it.each([
    ["x", { x: Number.NaN, y: 2, z: 3 }, "sound:index=0:x"],
    ["y", { x: 1, y: Number.POSITIVE_INFINITY, z: 3 }, "sound:index=0:y"],
    ["z", { x: 1, y: 2, z: 1_000_000.0001 }, "sound:index=0:z"],
  ])("rejects a non-finite or out-of-range sound %s position", (_field, position, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{ kind: "sound", sourceIndex: 0, ...position }],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      message: "Sound transform contains a non-finite or out-of-range scene value.",
      diagnostics: [diagnostic],
    });
  });

  it("rejects a non-finite bearing for an orientation-vector transform", () => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{
        kind: "creature",
        sourceIndex: 0,
        x: 1,
        y: 2,
        z: 3,
        bearing: Number.POSITIVE_INFINITY,
      }],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      message: "Creature transform contains a non-finite or out-of-range scene value.",
      diagnostics: ["creature:index=0:bearing"],
    });
  });

  it("rejects an ambiguous inventory-style Bearing field on a ground-item transform", () => {
    const pair = fixturePair();
    const git = parseRawGffDocument(pair.git)!;
    const item = list(git, "List")!.value[0]!;
    item.fields.push({ label: "Bearing", type: "float", value: 0 });

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{ kind: "item", sourceIndex: 0, x: 1, y: 2, z: 3, bearing: 0 }],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      message: "Item transform requires one unambiguous native float field for each transform component.",
      diagnostics: ["item:index=0:Bearing:count=1"],
    });
  });

  it("rejects an ambiguous native Bearing field on a waypoint transform", () => {
    const pair = fixturePair();
    const git = parseRawGffDocument(pair.git)!;
    const waypoint = list(git, "WaypointList")!.value[0]!;
    waypoint.fields.push({ label: "Bearing", type: "float", value: 0 });

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{ kind: "waypoint", sourceIndex: 0, x: 1, y: 2, z: 3, bearing: 0 }],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      message: "Waypoint transform requires one unambiguous native float field for each transform component.",
      diagnostics: ["waypoint:index=0:Bearing:count=1"],
    });
  });

  it.each([
    ["unsupported transform family", [{ kind: "door", sourceIndex: 0, x: 1, y: 2, z: 3, bearing: 0 }], [], "Existing object transform identifies an unsupported family."],
    ["fractional transform ordinal", [{ kind: "creature", sourceIndex: 0.5, x: 1, y: 2, z: 3, bearing: 0 }], [], "Creature transform source ordinal is outside the immutable family list."],
    ["duplicate transform", [{ kind: "creature", sourceIndex: 0, x: 1, y: 2, z: 3, bearing: 0 }, { kind: "creature", sourceIndex: 0, x: 4, y: 5, z: 6, bearing: 1 }], [], "The same immutable creature ordinal was transformed more than once."],
    ["transform deletion collision", [{ kind: "creature", sourceIndex: 0, x: 1, y: 2, z: 3, bearing: 0 }], [{ kind: "creature", sourceIndex: 0 }], "One immutable creature ordinal cannot be transformed and deleted."],
    ["non-finite transform", [{ kind: "creature", sourceIndex: 0, x: Number.NaN, y: 2, z: 3, bearing: 0 }], [], "Creature transform contains a non-finite or out-of-range scene value."],
  ])("fails closed for %s", (_label, transforms, deletions, message) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: deletions as never,
      transforms: transforms as never,
    }))).toMatchObject({ code: "AREA_UPDATE_OBJECT_MUTATION_INVALID", message });
  });

  it("accepts the exact scene-value bound and rejects values just outside it", () => {
    const pair = fixturePair();
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{
        kind: "creature",
        sourceIndex: 0,
        x: 1_000_000,
        y: -1_000_000,
        z: 1_000_000,
        bearing: -1_000_000,
      }],
    })).not.toThrow();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{
        kind: "creature",
        sourceIndex: 0,
        x: 1_000_000.0001,
        y: 0,
        z: 0,
        bearing: 0,
      }],
    })).diagnostics).toEqual(["creature:index=0:x"]);
  });

  it.each([
    [-1, "creature:index=-1:count=2"],
    [2, "creature:index=2:count=2"],
  ])("rejects creature transform ordinal %s with exact diagnostics", (sourceIndex, diagnostic) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{ kind: "creature", sourceIndex, x: 1, y: 2, z: 3, bearing: 0 }],
    }))).toMatchObject({
      message: "Creature transform source ordinal is outside the immutable family list.",
      diagnostics: [diagnostic],
    });
  });

  it.each([
    ["missing field", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "ZPosition"), "creature:index=0:ZPosition:count=0:type=missing"],
    ["duplicate field", (fields: SupportedGffField[]) => [...fields, { label: "XPosition", type: "float" as const, value: 1 }], "creature:index=0:XPosition:count=2:type=float"],
    ["wrong field type", (fields: SupportedGffField[]) => fields.map((field) => field.label === "YOrientation" ? { label: field.label, type: "int" as const, value: 1 } : field), "creature:index=0:YOrientation:count=1:type=int"],
    ["ambiguous Bearing", (fields: SupportedGffField[]) => [...fields, { label: "Bearing", type: "float" as const, value: 0 }], "creature:index=0:Bearing:count=1"],
  ])("rejects a native creature transform with %s", (_label, mutateFields, diagnostic) => {
    const pair = fixturePair();
    const git = parseRawGffDocument(pair.git)!;
    const creature = list(git, "Creature List")!.value[0]!;
    creature.fields = mutateFields(creature.fields);
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      sourceGic: pair.gic,
      deletions: [],
      transforms: [{ kind: "creature", sourceIndex: 0, x: 1, y: 2, z: 3, bearing: 0 }],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      message: "Creature transform requires one unambiguous native float field for each transform component.",
      diagnostics: [diagnostic],
    });
  });

  it.each([
    ["duplicate deletion", [{ kind: "item", sourceIndex: 0 }, { kind: "item", sourceIndex: 0 }]],
    ["negative ordinal", [{ kind: "item", sourceIndex: -1 }]],
    ["out-of-range ordinal", [{ kind: "door", sourceIndex: 1 }]],
  ])("rejects %s", (_label, deletions) => {
    const pair = fixturePair();

    expect(() =>
      mutateExistingAreaObjectsInGitGic({
        sourceGit: pair.git,
        sourceGic: pair.gic,
        deletions: deletions as never,
      }),
    ).toThrow(AreaObjectPairMutationError);
  });

  it("fails closed on a pre-existing GIT/GIC cardinality mismatch", () => {
    const pair = fixturePair();
    const gic = parseRawGffDocument(pair.gic)!;
    const itemList = list(gic, "List")!;
    itemList.value.pop();
    const mismatchedGic = buildGffBuffer(gic.fields, "GIC ", gic.rootStructTypeId);

    expect(() => inspectAreaGitGicPair(pair.git, mismatchedGic)).toThrow(
      expect.objectContaining({ code: "AREA_UPDATE_COMPANION_MISMATCH" }),
    );
  });

  it.each([
    ["missing canonical lane", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "StoreList")],
    ["wrong list type", (fields: SupportedGffField[]) => fields.map((field) => field.label === "Door List" ? { label: field.label, type: "int" as const, value: 0 } : field)],
  ])("fails closed on %s", (_label, mutate) => {
    const pair = fixturePair();
    const git = parseRawGffDocument(pair.git)!;
    const invalidGit = buildGffBuffer(mutate(git.fields), "GIT ", git.rootStructTypeId);

    expect(() => inspectAreaGitGicPair(invalidGit, pair.gic)).toThrow(
      expect.objectContaining({ code: "AREA_UPDATE_COMPANION_MISMATCH" }),
    );
  });

  it("reports exact canonical list diagnostics for missing, duplicate, and wrong-type lanes", () => {
    const pair = fixturePair();
    const git = parseRawGffDocument(pair.git)!;
    const missing = buildGffBuffer(
      git.fields.filter((field) => field.label !== "StoreList"),
      "GIT ",
      git.rootStructTypeId,
    );
    expect(pairError(() => inspectAreaGitGicPair(missing, pair.gic))).toMatchObject({
      code: "AREA_UPDATE_COMPANION_MISMATCH",
      message: "Area GIT/GIC does not satisfy the canonical nine-family paired profile.",
      diagnostics: ["git:store:list_count=0"],
    });

    const store = git.fields.find((field) => field.label === "StoreList")!;
    const duplicate = buildGffBuffer([...git.fields, store], "GIT ", git.rootStructTypeId);
    expect(pairError(() => inspectAreaGitGicPair(duplicate, pair.gic)).diagnostics)
      .toEqual(["git:store:list_count=2"]);

    const wrongType = buildGffBuffer(
      git.fields.map((field) => field.label === "Door List"
        ? { label: field.label, type: "int" as const, value: 0 }
        : field),
      "GIT ",
      git.rootStructTypeId,
    );
    expect(pairError(() => inspectAreaGitGicPair(wrongType, pair.gic)).diagnostics)
      .toEqual(["git:door:list_type=int"]);
  });

  it("rejects wrong native struct type IDs independently in GIT and GIC", () => {
    const pair = fixturePair();
    const git = parseRawGffDocument(pair.git)!;
    const gic = parseRawGffDocument(pair.gic)!;
    list(git, "Creature List")!.value[0]!.typeId = 400;
    list(gic, "Door List")!.value[0]!.typeId = 800;
    const error = pairError(() => inspectAreaGitGicPair(
      buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
      buildGffBuffer(gic.fields, "GIC ", gic.rootStructTypeId),
    ));
    expect(error.diagnostics).toEqual([
      "git:creature:0:struct_type=400:expected=4",
      "gic:door:0:struct_type=800:expected=8",
    ]);
  });

  it.each([
    ["invalid GIT bytes", Buffer.from("bad"), undefined, ["git:invalid_gff_identity"]],
    ["invalid GIC bytes", undefined, Buffer.from("bad"), ["gic:invalid_gff_identity"]],
    ["invalid pair", Buffer.from("bad"), Buffer.from("bad"), ["git:invalid_gff_identity", "gic:invalid_gff_identity"]],
  ])("reports exact native identity diagnostics for %s", (_label, gitOverride, gicOverride, diagnostics) => {
    const pair = fixturePair();
    expect(pairError(() => inspectAreaGitGicPair(
      gitOverride ?? pair.git,
      gicOverride ?? pair.gic,
    ))).toMatchObject({
      code: "AREA_UPDATE_COMPANION_MISMATCH",
      message: "Area GIT/GIC could not be parsed as a native V3.2 pair.",
      diagnostics,
    });
  });

  it("rejects wrong GIT and GIC file types and versions independently", () => {
    const pair = fixturePair();
    const wrongGitType = Buffer.from(pair.git);
    wrongGitType.write("GIC ", 0, 4, "ascii");
    const wrongGicVersion = Buffer.from(pair.gic);
    wrongGicVersion.write("V9.9", 4, 4, "ascii");
    expect(pairError(() => inspectAreaGitGicPair(wrongGitType, wrongGicVersion)).diagnostics)
      .toEqual(["git:invalid_gff_identity", "gic:invalid_gff_identity"]);
  });

  it.each([
    ["unsupported family", [{ kind: "unsupported", sourceIndex: 0 }], "Object deletion identifies an unsupported family.", ["kind=unsupported"]],
    ["fractional ordinal", [{ kind: "item", sourceIndex: 0.5 }], "Object deletion source ordinal is outside the immutable family list.", ["item:index=0.5:count=2"]],
    ["negative ordinal", [{ kind: "item", sourceIndex: -1 }], "Object deletion source ordinal is outside the immutable family list.", ["item:index=-1:count=2"]],
    ["upper-bound ordinal", [{ kind: "door", sourceIndex: 1 }], "Object deletion source ordinal is outside the immutable family list.", ["door:index=1:count=1"]],
    ["duplicate ordinal", [{ kind: "item", sourceIndex: 0 }, { kind: "item", sourceIndex: 0 }], "The same immutable object ordinal was deleted more than once.", ["item:index=0"]],
  ])("returns exact mutation diagnostics for %s", (_label, deletions, message, diagnostics) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: deletions as never,
    }))).toMatchObject({
      name: "AreaObjectPairMutationError",
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      message,
      diagnostics,
    });
  });

  it("constructs the exported mutation error with immutable default diagnostics", () => {
    const error = new AreaObjectPairMutationError(
      "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      "diagnostic",
    );
    expect(error).toMatchObject({
      name: "AreaObjectPairMutationError",
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      message: "diagnostic",
      diagnostics: [],
    });
  });

  it.each(["trigger", "encounter"] as const)(
    "replaces one exact retained %s Geometry list and preserves the paired GIC",
    (kind) => {
      const pair = fixturePair();
      const sourceEntry = list(
        parseRawGffDocument(pair.git),
        kind === "trigger" ? "TriggerList" : "Encounter List",
      )!.value[0]!;
      const expectedGeometry = polygonGeometryFromEntry(sourceEntry, kind);
      const geometry = {
        coordinateSpace: "native_local" as const,
        points: [
          { x: -2, y: -1, z: 0.25 },
          { x: 3, y: -1, z: 0.5 },
          { x: 0, y: 4, z: 0.75 },
        ],
      };
      const result = mutateExistingAreaObjectsInGitGic({
        sourceGit: pair.git,
        sourceGic: pair.gic,
        deletions: [],
        polygonMutations: [{
          kind,
          sourceObjectId: `${kind}:0:retained`,
          sourceIndex: 0,
          expectedGeometry,
          geometry,
        }],
        ...(kind === "trigger"
          ? { transforms: [{ kind: "trigger" as const, sourceIndex: 0, x: 4, y: 5, z: 0.5 }] }
          : {}),
      });

      expect(result.gicBytes).toEqual(pair.gic);
      expect(result.polygonUpdatedCounts[kind]).toBe(1);
      expect(result.transformedCounts[kind]).toBe(kind === "trigger" ? 1 : 0);
      const candidateEntry = list(
        parseRawGffDocument(result.gitBytes),
        kind === "trigger" ? "TriggerList" : "Encounter List",
      )!.value[0]!;
      expect(polygonGeometryFromEntry(candidateEntry, kind)).toEqual(geometry);
      expect(candidateEntry.fields.find((field) => field.label.startsWith("Unknown")))
        .toEqual(sourceEntry.fields.find((field) => field.label.startsWith("Unknown")));
    },
  );

  it("rejects stale polygon provenance and a polygon/deletion collision", () => {
    const pair = fixturePair();
    const sourceEntry = list(parseRawGffDocument(pair.git), "TriggerList")!.value[0]!;
    const expectedGeometry = polygonGeometryFromEntry(sourceEntry, "trigger");
    const geometry = {
      coordinateSpace: "native_local" as const,
      points: [
        { x: -2, y: -1, z: 0 },
        { x: 3, y: -1, z: 0 },
        { x: 0, y: 4, z: 0 },
      ],
    };
    const mutation = {
      kind: "trigger" as const,
      sourceObjectId: "trigger:0:retained",
      sourceIndex: 0,
      expectedGeometry,
      geometry,
    };

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      polygonMutations: [{
        ...mutation,
        expectedGeometry: {
          ...expectedGeometry,
          points: expectedGeometry.points.map((point, index) =>
            index === 0 ? { ...point, x: point.x - 1 } : point),
        },
      }],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: ["trigger:index=0:Geometry:stale"],
    });

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [{ kind: "trigger", sourceIndex: 0 }],
      polygonMutations: [mutation],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: ["trigger:index=0"],
    });
  });

  it("mutates one exact retained Door transition trio and preserves the paired GIC", () => {
    const pair = fixturePair();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      doorTransitionMutations: [{
        kind: "door",
        sourceIndex: 0,
        transition: {
          expectedValue: { linkedTo: "OLD_DEST", linkedToFlags: 1, loadScreenId: 0 },
          value: { linkedTo: "NEW_DEST", linkedToFlags: 2, loadScreenId: 7 },
        },
      }],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.door).toBe(1);
    expect(list(parseRawGffDocument(result.gitBytes), "Door List")?.value[0]?.fields)
      .toEqual(expect.arrayContaining([
        { label: "LinkedTo", type: "cexostring", value: "NEW_DEST" },
        { label: "LinkedToFlags", type: "byte", value: 2 },
        { label: "LoadScreenID", type: "word", value: 7 },
      ]));
  });

  it.each([
    ["stale LinkedTo", { linkedTo: "STALE", linkedToFlags: 1, loadScreenId: 0 }],
    ["stale LinkedToFlags", { linkedTo: "OLD_DEST", linkedToFlags: 2, loadScreenId: 0 }],
    ["stale LoadScreenID", { linkedTo: "OLD_DEST", linkedToFlags: 1, loadScreenId: 7 }],
  ])("rejects a Door transition mutation with %s provenance", (_label, expectedValue) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      doorTransitionMutations: [{
        kind: "door",
        sourceIndex: 0,
        transition: {
          expectedValue,
          value: { linkedTo: "NEW_DEST", linkedToFlags: 2, loadScreenId: 7 },
        },
      }],
    }))).toMatchObject({ code: "AREA_UPDATE_OBJECT_MUTATION_INVALID" });
  });

  it("rejects a Door transition mutation targeting a deleted ordinal", () => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [{ kind: "door", sourceIndex: 0 }],
      doorTransitionMutations: [{
        kind: "door",
        sourceIndex: 0,
        transition: {
          expectedValue: { linkedTo: "OLD_DEST", linkedToFlags: 1, loadScreenId: 0 },
          value: { linkedTo: "NEW_DEST", linkedToFlags: 2, loadScreenId: 7 },
        },
      }],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: ["door:index=0"],
    });
  });

  it("rewrites one exact Creature Tag verbatim and preserves every unrelated GIT field and GIC byte", () => {
    const pair = fixturePair();
    const source = parseRawGffDocument(pair.git)!;
    const sourceCreature = list(source, "Creature List")!.value[0]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        tag: { expectedValue: "CREATURE_1", value: "  renamed creature  " },
      }],
    });

    const candidateCreature = list(
      parseRawGffDocument(result.gitBytes),
      "Creature List",
    )!.value[0]!;
    expect(candidateCreature).toEqual({
      typeId: sourceCreature.typeId,
      fields: sourceCreature.fields.map((field) => field.label === "Tag"
        ? { label: "Tag", type: "cexostring", value: "  renamed creature  " }
        : field),
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);
  });

  it("rewrites one exact Creature Conversation ResRef and round-trips the complete GIT struct", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureConversationFields(pair.git, [{
      label: "Conversation",
      type: "resref",
      value: "Guard_Dialog",
    }]);
    const sourceCreature = list(parseRawGffDocument(sourceGit), "Creature List")!.value[0]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        conversation: { expectedResRef: "Guard_Dialog", resRef: "guard_dialog" },
      }],
    });

    const candidateCreature = list(
      parseRawGffDocument(result.gitBytes),
      "Creature List",
    )!.value[0]!;
    expect(candidateCreature).toEqual({
      typeId: sourceCreature.typeId,
      fields: sourceCreature.fields.map((field) => field.label === "Conversation"
        ? { label: "Conversation", type: "resref", value: "guard_dialog" }
        : field),
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);

    const reverted = mutateExistingAreaObjectsInGitGic({
      sourceGit: result.gitBytes,
      sourceGic: result.gicBytes,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        conversation: { expectedResRef: "guard_dialog", resRef: "" },
      }],
    });
    expect(list(parseRawGffDocument(reverted.gitBytes), "Creature List")!.value[0]!.fields)
      .toEqual(sourceCreature.fields.map((field) => field.label === "Conversation"
        ? { label: "Conversation", type: "resref", value: "" }
        : field));
    expect(reverted.gicBytes).toEqual(pair.gic);
  });

  it("rewrites one exact Creature Interruptable Byte and round-trips the complete GIT struct", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureInterruptableFields(pair.git, [{
      label: "Interruptable",
      type: "byte",
      value: 1,
    }]);
    const sourceCreature = list(parseRawGffDocument(sourceGit), "Creature List")!.value[0]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        interruptable: { expectedValue: 1, value: 0 },
      }],
    });

    const candidateCreature = list(
      parseRawGffDocument(result.gitBytes),
      "Creature List",
    )!.value[0]!;
    expect(candidateCreature).toEqual({
      typeId: sourceCreature.typeId,
      fields: sourceCreature.fields.map((field) => field.label === "Interruptable"
        ? { label: "Interruptable", type: "byte", value: 0 }
        : field),
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);

    const reverted = mutateExistingAreaObjectsInGitGic({
      sourceGit: result.gitBytes,
      sourceGic: result.gicBytes,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        interruptable: { expectedValue: 0, value: 1 },
      }],
    });
    expect(list(parseRawGffDocument(reverted.gitBytes), "Creature List")!.value[0]!.fields)
      .toEqual(sourceCreature.fields);
    expect(reverted.gicBytes).toEqual(pair.gic);
  });

  it("rewrites an exact subset of Creature advanced Byte flags and round-trips the complete GIT struct", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureAdvancedFlagFields(pair.git, [
      { label: "Disarmable", type: "byte", value: 1 },
      { label: "Plot", type: "byte", value: 0 },
      { label: "IsImmortal", type: "byte", value: 0 },
      { label: "Lootable", type: "byte", value: 1 },
      { label: "NoPermDeath", type: "byte", value: 0 },
    ]);
    const sourceCreature = list(parseRawGffDocument(sourceGit), "Creature List")!.value[0]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        advancedFlags: {
          disarmable: { expectedValue: 1, value: 0 },
          plot: { expectedValue: 0, value: 1 },
        },
      } as never],
    });

    const candidateCreature = list(
      parseRawGffDocument(result.gitBytes),
      "Creature List",
    )!.value[0]!;
    expect(candidateCreature).toEqual({
      typeId: sourceCreature.typeId,
      fields: sourceCreature.fields.map((field) => {
        if (field.label === "Disarmable") {
          return { label: "Disarmable", type: "byte", value: 0 };
        }
        if (field.label === "Plot") {
          return { label: "Plot", type: "byte", value: 1 };
        }
        return field;
      }),
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);

    const reverted = mutateExistingAreaObjectsInGitGic({
      sourceGit: result.gitBytes,
      sourceGic: result.gicBytes,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        advancedFlags: {
          disarmable: { expectedValue: 0, value: 1 },
          plot: { expectedValue: 1, value: 0 },
        },
      } as never],
    });
    expect(list(parseRawGffDocument(reverted.gitBytes), "Creature List")!.value[0]!.fields)
      .toEqual(sourceCreature.fields);
    expect(reverted.gicBytes).toEqual(pair.gic);
  });

  it("rewrites exact Creature BodyBag and DecayTime fields and round-trips the complete GIT struct", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureDeathRemainsFields(pair.git, [
      { label: "BodyBag", type: "byte", value: 0 },
      { label: "DecayTime", type: "dword", value: 5000 },
    ]);
    const sourceCreature = list(parseRawGffDocument(sourceGit), "Creature List")!.value[0]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        bodyBag: {
          expectedValue: 0,
          value: 3,
          tableSha256: "e".repeat(64),
          tableRowCount: 7,
        },
        decayTime: { expectedMilliseconds: 5000, valueMilliseconds: 12_000 },
      } as never],
    });

    const candidateCreature = list(
      parseRawGffDocument(result.gitBytes),
      "Creature List",
    )!.value[0]!;
    expect(candidateCreature).toEqual({
      typeId: sourceCreature.typeId,
      fields: sourceCreature.fields.map((field) => {
        if (field.label === "BodyBag") {
          return { label: "BodyBag", type: "byte", value: 3 };
        }
        if (field.label === "DecayTime") {
          return { label: "DecayTime", type: "dword", value: 12_000 };
        }
        return field;
      }),
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);

    const reverted = mutateExistingAreaObjectsInGitGic({
      sourceGit: result.gitBytes,
      sourceGic: result.gicBytes,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        bodyBag: {
          expectedValue: 3,
          value: 0,
          tableSha256: "e".repeat(64),
          tableRowCount: 7,
        },
        decayTime: { expectedMilliseconds: 12_000, valueMilliseconds: 5000 },
      } as never],
    });
    expect(list(parseRawGffDocument(reverted.gitBytes), "Creature List")!.value[0]!.fields)
      .toEqual(sourceCreature.fields);
    expect(reverted.gicBytes).toEqual(pair.gic);
  });

  it("rewrites only one exact Creature FactionID Word and preserves GIC byte-for-byte", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureFactionFields(pair.git, [
      { label: "FactionID", type: "word", value: 1 },
    ]);
    const sourceCreature = list(parseRawGffDocument(sourceGit), "Creature List")!.value[0]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        faction: {
          expectedValue: 1,
          value: 4,
          catalogSha256: "f".repeat(64),
          catalogFactionCount: 5,
        },
      } as never],
    });
    const candidate = list(parseRawGffDocument(result.gitBytes), "Creature List")!.value[0]!;
    expect(candidate.fields).toContainEqual({ label: "FactionID", type: "word", value: 4 });
    expect(candidate.fields.filter((field) => field.label !== "FactionID"))
      .toEqual(sourceCreature.fields.filter((field) => field.label !== "FactionID"));
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withCreatureFactionFields(pair.git, [
        { label: "FactionID", type: "dword", value: 1 },
      ]),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        faction: {
          expectedValue: 1,
          value: 4,
          catalogSha256: "f".repeat(64),
          catalogFactionCount: 5,
        },
      } as never],
    }))).toMatchObject({ diagnostics: ["creature:index=0:FactionID:count=1:type=dword"] });
  });

  it("rewrites only one exact Creature TemplateResRef and preserves GIC byte-for-byte", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureTemplateResRefFields(pair.git, [
      { label: "TemplateResRef", type: "resref", value: "nw_guard" },
    ]);
    const sourceCreature = list(parseRawGffDocument(sourceGit), "Creature List")!.value[0]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        templateResRef: {
          expectedResRef: "nw_guard",
          resRef: "nw_guard_alt",
        },
      } as never],
    });
    const candidate = list(parseRawGffDocument(result.gitBytes), "Creature List")!.value[0]!;
    expect(candidate.fields).toContainEqual({
      label: "TemplateResRef",
      type: "resref",
      value: "nw_guard_alt",
    });
    expect(candidate.fields.filter((field) => field.label !== "TemplateResRef"))
      .toEqual(sourceCreature.fields.filter((field) => field.label !== "TemplateResRef"));
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withCreatureTemplateResRefFields(pair.git, [
        { label: "TemplateResRef", type: "cexostring", value: "nw_guard" },
      ]),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        templateResRef: {
          expectedResRef: "nw_guard",
          resRef: "nw_guard_alt",
        },
      } as never],
    }))).toMatchObject({
      diagnostics: ["creature:index=0:TemplateResRef:count=1:type=cexostring"],
    });
  });

  it("rewrites exact Creature Subrace and Deity fields independently and preserves GIC", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureSpecialIdentityStringFields(pair.git, [
      { label: "Subrace", type: "cexostring", value: "Moon Elf" },
      { label: "Deity", type: "cexostring", value: "Mystra" },
    ]);
    const sourceCreature = list(parseRawGffDocument(sourceGit), "Creature List")!.value[0]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        specialIdentityStrings: {
          subrace: { expectedValue: "Moon Elf", value: "Sun Elf" },
        },
      } as never],
    });
    const candidate = list(parseRawGffDocument(result.gitBytes), "Creature List")!.value[0]!;
    expect(candidate.fields).toContainEqual({
      label: "Subrace",
      type: "cexostring",
      value: "Sun Elf",
    });
    expect(candidate.fields).toContainEqual({
      label: "Deity",
      type: "cexostring",
      value: "Mystra",
    });
    expect(candidate.fields.filter((field) => field.label !== "Subrace"))
      .toEqual(sourceCreature.fields.filter((field) => field.label !== "Subrace"));
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withCreatureSpecialIdentityStringFields(pair.git, [
        { label: "Subrace", type: "resref", value: "moon_elf" },
      ]),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        specialIdentityStrings: {
          subrace: { expectedValue: "Moon Elf", value: "Sun Elf" },
        },
      } as never],
    }))).toMatchObject({
      diagnostics: ["creature:index=0:Subrace:count=1:type=resref"],
    });
  });

  it("rewrites exact Creature script ResRefs in canonical order and preserves every sibling and GIC", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureScriptResRefFields(pair.git, [
      { label: "ScriptHeartbeat", type: "resref", value: "NW_C2_DEFAULT1" },
      { label: "ScriptSpawn", type: "resref", value: "nw_c2_default9" },
      { label: "ScriptDeath", type: "resref", value: "nw_c2_default7" },
    ]);
    const sourceCreature = list(parseRawGffDocument(sourceGit), "Creature List")!.value[0]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        scripts: [
          {
            field: "ScriptHeartbeat",
            expectedResRef: "NW_C2_DEFAULT1",
            resRef: "main",
          },
          {
            field: "ScriptSpawn",
            expectedResRef: "nw_c2_default9",
            resRef: "spawn_probe",
          },
        ],
      }],
    });
    const candidate = list(parseRawGffDocument(result.gitBytes), "Creature List")!.value[0]!;
    expect(candidate.fields).toContainEqual({
      label: "ScriptHeartbeat",
      type: "resref",
      value: "main",
    });
    expect(candidate.fields).toContainEqual({
      label: "ScriptSpawn",
      type: "resref",
      value: "spawn_probe",
    });
    expect(candidate.fields).toContainEqual({
      label: "ScriptDeath",
      type: "resref",
      value: "nw_c2_default7",
    });
    const replacedLabels = new Set(["ScriptHeartbeat", "ScriptSpawn"]);
    expect(candidate.fields.filter((field) => !replacedLabels.has(field.label)))
      .toEqual(sourceCreature.fields.filter((field) => !replacedLabels.has(field.label)));
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);
  });

  it.each([
    [
      "missing field",
      [] as readonly SupportedGffField[],
      "nw_c2_default9",
      "creature:index=0:ScriptSpawn:count=0:type=missing",
    ],
    [
      "wrong case",
      [{ label: "scriptspawn", type: "resref" as const, value: "nw_c2_default9" }],
      "nw_c2_default9",
      "creature:index=0:ScriptSpawn:count=0:type=missing",
    ],
    [
      "wrong type",
      [{ label: "ScriptSpawn", type: "cexostring" as const, value: "nw_c2_default9" }],
      "nw_c2_default9",
      "creature:index=0:ScriptSpawn:count=1:type=cexostring",
    ],
    [
      "duplicate field",
      [
        { label: "ScriptSpawn", type: "resref" as const, value: "nw_c2_default9" },
        { label: "ScriptSpawn", type: "resref" as const, value: "main" },
      ],
      "nw_c2_default9",
      "creature:index=0:ScriptSpawn:count=2:type=resref",
    ],
    [
      "stale source",
      [{ label: "ScriptSpawn", type: "resref" as const, value: "nw_c2_default9" }],
      "main",
      "creature:index=0:ScriptSpawn:stale_source",
    ],
  ] as const)("rejects Creature script ResRef writing with %s", (
    _label,
    fields,
    expectedResRef,
    diagnostic,
  ) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withCreatureScriptResRefFields(pair.git, fields),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        scripts: [{ field: "ScriptSpawn", expectedResRef, resRef: "spawn_probe" }],
      }],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    [
      "missing field",
      [{ label: "DecayTime", type: "dword" as const, value: 5000 }],
      { expectedValue: 0, value: 3, tableSha256: "e".repeat(64), tableRowCount: 7 },
      "creature:index=0:BodyBag:count=0:type=missing",
    ],
    [
      "wrong case",
      [{ label: "bodybag", type: "byte" as const, value: 0 }],
      { expectedValue: 0, value: 3, tableSha256: "e".repeat(64), tableRowCount: 7 },
      "creature:index=0:BodyBag:count=0:type=missing",
    ],
    [
      "wrong type",
      [{ label: "BodyBag", type: "word" as const, value: 0 }],
      { expectedValue: 0, value: 3, tableSha256: "e".repeat(64), tableRowCount: 7 },
      "creature:index=0:BodyBag:count=1:type=word",
    ],
    [
      "duplicate field",
      [
        { label: "BodyBag", type: "byte" as const, value: 0 },
        { label: "BodyBag", type: "byte" as const, value: 1 },
      ],
      { expectedValue: 0, value: 3, tableSha256: "e".repeat(64), tableRowCount: 7 },
      "creature:index=0:BodyBag:count=2:type=byte",
    ],
    [
      "stale source",
      [{ label: "BodyBag", type: "byte" as const, value: 0 }],
      { expectedValue: 1, value: 3, tableSha256: "e".repeat(64), tableRowCount: 7 },
      "creature:index=0:BodyBag:stale_source",
    ],
  ] as const)("rejects Creature BodyBag writing with %s", (
    _label,
    fields,
    bodyBag,
    diagnostic,
  ) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withCreatureDeathRemainsFields(pair.git, fields),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "creature", sourceIndex: 0, bodyBag } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it.each([
    [
      "missing field",
      [{ label: "BodyBag", type: "byte" as const, value: 0 }],
      { expectedMilliseconds: 5000, valueMilliseconds: 12_000 },
      "creature:index=0:DecayTime:count=0:type=missing",
    ],
    [
      "wrong case",
      [{ label: "decaytime", type: "dword" as const, value: 5000 }],
      { expectedMilliseconds: 5000, valueMilliseconds: 12_000 },
      "creature:index=0:DecayTime:count=0:type=missing",
    ],
    [
      "wrong type",
      [{ label: "DecayTime", type: "int" as const, value: 5000 }],
      { expectedMilliseconds: 5000, valueMilliseconds: 12_000 },
      "creature:index=0:DecayTime:count=1:type=int",
    ],
    [
      "duplicate field",
      [
        { label: "DecayTime", type: "dword" as const, value: 5000 },
        { label: "DecayTime", type: "dword" as const, value: 6000 },
      ],
      { expectedMilliseconds: 5000, valueMilliseconds: 12_000 },
      "creature:index=0:DecayTime:count=2:type=dword",
    ],
    [
      "stale source",
      [{ label: "DecayTime", type: "dword" as const, value: 5000 }],
      { expectedMilliseconds: 6000, valueMilliseconds: 12_000 },
      "creature:index=0:DecayTime:stale_source",
    ],
    [
      "noncanonical mutation pair",
      [{ label: "DecayTime", type: "dword" as const, value: 5000 }],
      { expectedMilliseconds: 5001, valueMilliseconds: 12_000 },
      "creature:index=0:DecayTime:invalid_pair",
    ],
  ] as const)("rejects Creature DecayTime writing with %s", (
    _label,
    fields,
    decayTime,
    diagnostic,
  ) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withCreatureDeathRemainsFields(pair.git, fields),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "creature", sourceIndex: 0, decayTime } as never],
    }))).toMatchObject({ diagnostics: [diagnostic] });
  });

  it("rewrites one exact Creature Appearance_Type Word and round-trips the complete GIT struct", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureAppearanceFields(pair.git, [{
      label: "Appearance_Type",
      type: "word",
      value: 249,
    }]);
    const sourceCreature = list(parseRawGffDocument(sourceGit), "Creature List")!.value[0]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        appearance: {
          expectedValue: 249,
          value: 52,
          tableSha256: "a".repeat(64),
          rowCount: 1000,
        },
      }],
    });

    const candidateCreature = list(
      parseRawGffDocument(result.gitBytes),
      "Creature List",
    )!.value[0]!;
    expect(candidateCreature).toEqual({
      typeId: sourceCreature.typeId,
      fields: sourceCreature.fields.map((field) => field.label === "Appearance_Type"
        ? { label: "Appearance_Type", type: "word", value: 52 }
        : field),
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);

    const reverted = mutateExistingAreaObjectsInGitGic({
      sourceGit: result.gitBytes,
      sourceGic: result.gicBytes,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        appearance: {
          expectedValue: 52,
          value: 249,
          tableSha256: "a".repeat(64),
          rowCount: 1000,
        },
      }],
    });
    expect(list(parseRawGffDocument(reverted.gitBytes), "Creature List")!.value[0]!.fields)
      .toEqual(sourceCreature.fields);
    expect(reverted.gicBytes).toEqual(pair.gic);
  });

  it("rewrites one exact Creature Gender Byte and preserves paired GIC bytes", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureGenderFields(pair.git, [{
      label: "Gender",
      type: "byte",
      value: 4,
    }]);
    const sourceCreature = list(parseRawGffDocument(sourceGit), "Creature List")!.value[0]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        gender: {
          expectedValue: 4,
          value: 0,
          tableSha256: "c".repeat(64),
          rowCount: 5,
        },
      }],
    });
    const candidateCreature = list(
      parseRawGffDocument(result.gitBytes),
      "Creature List",
    )!.value[0]!;
    expect(candidateCreature).toEqual({
      typeId: sourceCreature.typeId,
      fields: sourceCreature.fields.map((field) => field.label === "Gender"
        ? { label: "Gender", type: "byte", value: 0 }
        : field),
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);
  });

  it("rewrites one exact Creature PerceptionRange Byte and preserves paired GIC bytes", () => {
    const pair = fixturePair();
    const sourceGit = withCreaturePerceptionRangeFields(pair.git, [{
      label: "PerceptionRange",
      type: "byte",
      value: 11,
    }]);
    const sourceCreature = list(parseRawGffDocument(sourceGit), "Creature List")!.value[0]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        perceptionRange: {
          expectedValue: 11,
          value: 9,
          tableSha256: "e".repeat(64),
          rowCount: 12,
        },
      }],
    });
    const candidateCreature = list(
      parseRawGffDocument(result.gitBytes),
      "Creature List",
    )!.value[0]!;
    expect(candidateCreature).toEqual({
      typeId: sourceCreature.typeId,
      fields: sourceCreature.fields.map((field) => field.label === "PerceptionRange"
        ? { label: "PerceptionRange", type: "byte", value: 9 }
        : field),
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);
  });

  it("rejects a duplicate, wrong-case, wrong-type, or stale Creature PerceptionRange", () => {
    const pair = fixturePair();
    for (const fields of [
      [
        { label: "PerceptionRange", type: "byte" as const, value: 11 },
        { label: "PerceptionRange", type: "byte" as const, value: 10 },
      ],
      [{ label: "perceptionrange", type: "byte" as const, value: 11 }],
      [{ label: "PerceptionRange", type: "word" as const, value: 11 }],
      [{ label: "PerceptionRange", type: "byte" as const, value: 10 }],
    ]) {
      const sourceGit = withCreaturePerceptionRangeFields(pair.git, fields);
      expect(() => mutateExistingAreaObjectsInGitGic({
        sourceGit,
        sourceGic: pair.gic,
        deletions: [],
        propertyMutations: [{
          kind: "creature",
          sourceIndex: 0,
          perceptionRange: {
            expectedValue: 11,
            value: 9,
            tableSha256: "e".repeat(64),
            rowCount: 12,
          },
        }],
      })).toThrow();
    }
  });

  it("rewrites one exact Creature WalkRate Int and preserves paired GIC bytes", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureWalkRateFields(pair.git, [{
      label: "WalkRate",
      type: "int",
      value: 4,
    }]);
    const sourceCreature = list(parseRawGffDocument(sourceGit), "Creature List")!.value[0]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        walkRate: {
          expectedValue: 4,
          value: 2,
          tableSha256: "d".repeat(64),
          rowCount: 9,
        },
      }],
    });
    const candidateCreature = list(
      parseRawGffDocument(result.gitBytes),
      "Creature List",
    )!.value[0]!;
    expect(candidateCreature).toEqual({
      typeId: sourceCreature.typeId,
      fields: sourceCreature.fields.map((field) => field.label === "WalkRate"
        ? { label: "WalkRate", type: "int", value: 2 }
        : field),
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);
  });

  it("rejects a duplicate, wrong-case, wrong-type, or stale Creature WalkRate", () => {
    const pair = fixturePair();
    for (const fields of [
      [
        { label: "WalkRate", type: "int" as const, value: 4 },
        { label: "WalkRate", type: "int" as const, value: 2 },
      ],
      [{ label: "walkrate", type: "int" as const, value: 4 }],
      [{ label: "WalkRate", type: "byte" as const, value: 4 }],
      [{ label: "WalkRate", type: "int" as const, value: 3 }],
    ]) {
      const sourceGit = withCreatureWalkRateFields(pair.git, fields);
      expect(() => mutateExistingAreaObjectsInGitGic({
        sourceGit,
        sourceGic: pair.gic,
        deletions: [],
        propertyMutations: [{
          kind: "creature",
          sourceIndex: 0,
          walkRate: {
            expectedValue: 4,
            value: 2,
            tableSha256: "d".repeat(64),
            rowCount: 9,
          },
        }],
      })).toThrow();
    }
  });

  it("rewrites one exact Creature SoundSetFile Word including row zero and preserves paired GIC bytes", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureSoundSetFileFields(pair.git, [{
      label: "SoundSetFile",
      type: "word",
      value: 0,
    }]);
    const sourceCreature = list(parseRawGffDocument(sourceGit), "Creature List")!.value[0]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        soundSetFile: {
          expectedValue: 0,
          value: 27,
          tableSha256: "a".repeat(64),
          rowCount: 5_100,
        },
      }],
    });
    const candidateCreature = list(
      parseRawGffDocument(result.gitBytes),
      "Creature List",
    )!.value[0]!;
    expect(candidateCreature).toEqual({
      typeId: sourceCreature.typeId,
      fields: sourceCreature.fields.map((field) => field.label === "SoundSetFile"
        ? { label: "SoundSetFile", type: "word", value: 27 }
        : field),
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);
  });

  it("rejects a duplicate, wrong-case, wrong-type, or stale Creature SoundSetFile", () => {
    const pair = fixturePair();
    for (const fields of [
      [
        { label: "SoundSetFile", type: "word" as const, value: 0 },
        { label: "SoundSetFile", type: "word" as const, value: 27 },
      ],
      [{ label: "soundsetfile", type: "word" as const, value: 0 }],
      [{ label: "SoundSetFile", type: "int" as const, value: 0 }],
      [{ label: "SoundSetFile", type: "word" as const, value: 1 }],
    ]) {
      const sourceGit = withCreatureSoundSetFileFields(pair.git, fields);
      expect(() => mutateExistingAreaObjectsInGitGic({
        sourceGit,
        sourceGic: pair.gic,
        deletions: [],
        propertyMutations: [{
          kind: "creature",
          sourceIndex: 0,
          soundSetFile: {
            expectedValue: 0,
            value: 27,
            tableSha256: "a".repeat(64),
            rowCount: 5_100,
          },
        }],
      })).toThrow();
    }
  });

  it("rewrites a complete Creature SkillList Byte vector, preserves opaque siblings, and expands canonically", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureSkillListFields(pair.git, [{
      label: "SkillList",
      type: "list",
      value: [
        {
          typeId: 0,
          fields: [
            { label: "Rank", type: "byte", value: 4 },
            { label: "Opaque", type: "cexostring", value: "preserve" },
          ],
        },
        { typeId: 0, fields: [{ label: "Rank", type: "byte", value: 0 }] },
      ],
    }]);
    const sourceCreature = list(parseRawGffDocument(sourceGit), "Creature List")!.value[0]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        skillList: {
          expectedRanks: [4, 0],
          ranks: [7, 0, 2],
          tableSha256: "c".repeat(64),
          rowCount: 3,
          resizeMode: "expand_zero_tail",
          confirmTruncation: false,
        },
      }],
    });

    const candidateCreature = list(
      parseRawGffDocument(result.gitBytes),
      "Creature List",
    )!.value[0]!;
    expect(candidateCreature).toEqual({
      typeId: sourceCreature.typeId,
      fields: sourceCreature.fields.map((field) => field.label === "SkillList"
        ? {
            label: "SkillList",
            type: "list",
            value: [
              {
                typeId: 0,
                fields: [
                  { label: "Rank", type: "byte", value: 7 },
                  { label: "Opaque", type: "cexostring", value: "preserve" },
                ],
              },
              { typeId: 0, fields: [{ label: "Rank", type: "byte", value: 0 }] },
              { typeId: 0, fields: [{ label: "Rank", type: "byte", value: 2 }] },
            ],
          }
        : field),
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);
  });

  it("rewrites one exact Creature StartingPackage Byte with unchanged ClassList and GIC bytes", () => {
    const pair = fixturePair();
    const classList = {
      label: "ClassList" as const,
      type: "list" as const,
      value: [{
        typeId: 2,
        fields: [
          { label: "Class", type: "int" as const, value: 4 },
          { label: "ClassLevel", type: "short" as const, value: 3 },
        ],
      }],
    };
    const sourceGit = withCreatureStartingPackageFields(pair.git, [
      { label: "StartingPackage", type: "byte", value: 0 },
      classList,
    ]);
    const sourceCreature = list(parseRawGffDocument(sourceGit), "Creature List")!.value[0]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        startingPackage: {
          expectedValue: 0,
          value: 2,
          expectedClassIds: [4],
          tableSha256: "c".repeat(64),
          rowCount: 132,
        },
      }],
    });
    const candidateCreature = list(
      parseRawGffDocument(result.gitBytes),
      "Creature List",
    )!.value[0]!;
    expect(candidateCreature).toEqual({
      typeId: sourceCreature.typeId,
      fields: sourceCreature.fields.map((field) => field.label === "StartingPackage"
        ? { label: "StartingPackage", type: "byte", value: 2 }
        : field),
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);
  });

  it("rejects stale Creature StartingPackage ClassList provenance", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureStartingPackageFields(pair.git, [
      { label: "StartingPackage", type: "byte", value: 0 },
      {
        label: "ClassList",
        type: "list",
        value: [{
          typeId: 2,
          fields: [
            { label: "Class", type: "int", value: 2 },
            { label: "ClassLevel", type: "short", value: 3 },
          ],
        }],
      },
    ]);
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        startingPackage: {
          expectedValue: 0,
          value: 2,
          expectedClassIds: [4],
          tableSha256: "c".repeat(64),
          rowCount: 132,
        },
      }],
    })).toThrow();
  });

  it("rewrites only canonical Creature PortraitId Word and preserves legacy Portrait plus GIC", () => {
    const pair = fixturePair();
    const sourceGit = withCreaturePortraitFields(pair.git, [
      { label: "PortraitId", type: "word", value: 10 },
      { label: "Portrait", type: "resref", value: "legacy_portrait" },
    ]);
    const sourceCreature = list(parseRawGffDocument(sourceGit), "Creature List")!.value[0]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        portrait: {
          expectedValue: 10,
          value: 11,
          tableSha256: "f".repeat(64),
          rowCount: 16_001,
          genderExpectedValue: 0,
          raceExpectedValue: 4,
        },
      }],
    });
    const candidateCreature = list(
      parseRawGffDocument(result.gitBytes),
      "Creature List",
    )!.value[0]!;
    expect(candidateCreature).toEqual({
      typeId: sourceCreature.typeId,
      fields: sourceCreature.fields.map((field) => field.label === "PortraitId"
        ? { label: "PortraitId", type: "word", value: 11 }
        : field),
    });
    expect(candidateCreature.fields).toContainEqual({
      label: "Portrait",
      type: "resref",
      value: "legacy_portrait",
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);

    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        portrait: {
          expectedValue: 9,
          value: 11,
          tableSha256: "f".repeat(64),
          rowCount: 16_001,
          genderExpectedValue: 0,
          raceExpectedValue: 4,
        },
      }],
    })).toThrow(/differs from retained provenance/u);
  });

  it("rewrites one exact Creature ChallengeRating Float and preserves paired GIC bytes", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureChallengeRatingFields(pair.git, [{
      label: "ChallengeRating",
      type: "float",
      value: 11.5,
    }]);
    const sourceCreature = list(parseRawGffDocument(sourceGit), "Creature List")!.value[0]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        challengeRating: {
          expectedValue: 11.5,
          value: 0.1,
        },
      }],
    });
    const candidateCreature = list(
      parseRawGffDocument(result.gitBytes),
      "Creature List",
    )!.value[0]!;
    expect(candidateCreature).toEqual({
      typeId: sourceCreature.typeId,
      fields: sourceCreature.fields.map((field) => field.label === "ChallengeRating"
        ? { label: "ChallengeRating", type: "float", value: Math.fround(0.1) }
        : field),
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);
  });

  it("rewrites one exact Creature NaturalAC Byte and preserves paired GIC bytes", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureNaturalArmorClassFields(pair.git, [{
      label: "NaturalAC",
      type: "byte",
      value: 0,
    }]);
    const sourceCreature = list(parseRawGffDocument(sourceGit), "Creature List")!.value[0]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        naturalArmorClass: { expectedValue: 0, value: 2 },
      } as never],
    });
    const candidateCreature = list(
      parseRawGffDocument(result.gitBytes),
      "Creature List",
    )!.value[0]!;
    expect(candidateCreature).toEqual({
      typeId: sourceCreature.typeId,
      fields: sourceCreature.fields.map((field) => field.label === "NaturalAC"
        ? { label: "NaturalAC", type: "byte", value: 2 }
        : field),
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);
  });

  it("rewrites changed exact Creature saving-throw Shorts in native order and preserves paired GIC bytes", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureSavingThrowBonusFields(pair.git, [
      { label: "refbonus", type: "short", value: 1 },
      { label: "willbonus", type: "short", value: 2 },
      { label: "fortbonus", type: "short", value: 3 },
    ]);
    const sourceCreature = list(parseRawGffDocument(sourceGit), "Creature List")!.value[0]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        savingThrowBonuses: {
          reflex: { expectedValue: 1, value: 4 },
          fortitude: { expectedValue: 3, value: 5 },
        },
      } as never],
    });
    const candidateCreature = list(
      parseRawGffDocument(result.gitBytes),
      "Creature List",
    )!.value[0]!;
    expect(candidateCreature).toEqual({
      typeId: sourceCreature.typeId,
      fields: sourceCreature.fields.map((field) => {
        if (field.label === "refbonus") {
          return { label: "refbonus", type: "short", value: 4 };
        }
        if (field.label === "fortbonus") {
          return { label: "fortbonus", type: "short", value: 5 };
        }
        return field;
      }),
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);
  });

  it("rewrites both exact Creature alignment Bytes as one coupled CAS mutation", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureAlignmentFields(pair.git, [
      { label: "GoodEvil", type: "byte", value: 50 },
      { label: "LawfulChaotic", type: "byte", value: 50 },
    ]);
    const sourceCreature = list(parseRawGffDocument(sourceGit), "Creature List")!.value[0]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        alignment: {
          expectedGoodEvil: 50,
          expectedLawfulChaotic: 50,
          goodEvil: 100,
          lawfulChaotic: 100,
        },
      }],
    });
    const candidateCreature = list(
      parseRawGffDocument(result.gitBytes),
      "Creature List",
    )!.value[0]!;
    expect(candidateCreature).toEqual({
      typeId: sourceCreature.typeId,
      fields: sourceCreature.fields.map((field) => {
        if (field.label === "GoodEvil") {
          return { label: "GoodEvil", type: "byte", value: 100 };
        }
        if (field.label === "LawfulChaotic") {
          return { label: "LawfulChaotic", type: "byte", value: 100 };
        }
        return field;
      }),
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);
  });

  it("rewrites changed exact Creature base ability-score Bytes and preserves paired GIC bytes", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureAbilityScoreFields(pair.git, [
      { label: "Str", type: "byte", value: 15 },
      { label: "Dex", type: "byte", value: 12 },
      { label: "Con", type: "byte", value: 14 },
      { label: "Int", type: "byte", value: 10 },
      { label: "Wis", type: "byte", value: 11 },
      { label: "Cha", type: "byte", value: 8 },
    ]);
    const sourceCreature = list(parseRawGffDocument(sourceGit), "Creature List")!.value[0]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        abilityScores: {
          strength: { expectedValue: 15, value: 17 },
          charisma: { expectedValue: 8, value: 10 },
        },
      }],
    });

    const candidateCreature = list(
      parseRawGffDocument(result.gitBytes),
      "Creature List",
    )!.value[0]!;
    expect(candidateCreature).toEqual({
      typeId: sourceCreature.typeId,
      fields: sourceCreature.fields.map((field) => field.label === "Str"
        ? { label: "Str", type: "byte", value: 17 }
        : field.label === "Cha"
          ? { label: "Cha", type: "byte", value: 10 }
          : field),
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);
  });

  it("rewrites changed exact Creature appearance-color Bytes and preserves paired GIC bytes", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureAppearanceColorFields(pair.git, [
      { label: "Color_Skin", type: "byte", value: 11 },
      { label: "Color_Hair", type: "byte", value: 22 },
      { label: "Color_Tattoo1", type: "byte", value: 33 },
      { label: "Color_Tattoo2", type: "byte", value: 44 },
    ]);
    const sourceCreature = list(parseRawGffDocument(sourceGit), "Creature List")!.value[0]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        appearanceColors: {
          skin: { expectedValue: 11, value: 12 },
          tattoo2: { expectedValue: 44, value: 45 },
        },
      }],
    });

    const candidateCreature = list(
      parseRawGffDocument(result.gitBytes),
      "Creature List",
    )!.value[0]!;
    expect(candidateCreature).toEqual({
      typeId: sourceCreature.typeId,
      fields: sourceCreature.fields.map((field) => field.label === "Color_Skin"
        ? { label: "Color_Skin", type: "byte", value: 12 }
        : field.label === "Color_Tattoo2"
          ? { label: "Color_Tattoo2", type: "byte", value: 45 }
          : field),
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);
  });

  it("rewrites only a modern Creature appendage DWord and preserves its legacy Byte sibling", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureAppendageFields(pair.git, [
      { label: "Wings_New", type: "dword", value: 1 },
      { label: "Wings", type: "byte", value: 2 },
      { label: "Tail_New", type: "dword", value: 3 },
    ]);
    const sourceCreature = list(parseRawGffDocument(sourceGit), "Creature List")!.value[0]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        appendages: {
          wings: {
            expectedValue: 1,
            value: 7,
            tableSha256: "a".repeat(64),
            rowCount: 8,
          },
        },
      }],
    });

    const candidateCreature = list(
      parseRawGffDocument(result.gitBytes),
      "Creature List",
    )!.value[0]!;
    expect(candidateCreature).toEqual({
      typeId: sourceCreature.typeId,
      fields: sourceCreature.fields.map((field) => field.label === "Wings_New"
        ? { label: "Wings_New", type: "dword", value: 7 }
        : field),
    });
    expect(candidateCreature.fields).toContainEqual({
      label: "Wings",
      type: "byte",
      value: 2,
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);
  });

  it("rejects a legacy-only Creature appendage mutation", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureAppendageFields(pair.git, [
      { label: "Tail", type: "byte", value: 3 },
    ]);
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        appendages: {
          tail: {
            expectedValue: 3,
            value: 4,
            tableSha256: "a".repeat(64),
            rowCount: 8,
          },
        },
      }],
    })).toThrow("modern DWord");
  });

  it("rewrites the coupled Creature HP Short triplet and preserves paired GIC bytes", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureHitPointFields(pair.git, [
      { label: "HitPoints", type: "short", value: 10 },
      { label: "CurrentHitPoints", type: "short", value: 7 },
      { label: "MaxHitPoints", type: "short", value: 99 },
      { label: "Con", type: "byte", value: 14 },
      { label: "Race", type: "byte", value: 1 },
    ]);
    const sourceCreature = list(parseRawGffDocument(sourceGit), "Creature List")!.value[0]!;
    const hitPoints = {
      expectedHitPoints: 10,
      expectedCurrentHitPoints: 7,
      expectedMaxHitPoints: 99,
      hitPoints: 12,
      currentHitPoints: 10,
      maxHitPoints: 27,
      expectedConstitution: 14,
      constitution: 14,
      race: 1,
      classLevels: [3, 2],
      featRow40Present: false,
      racialConstitutionAdjust: 2,
      racialTypesSha256: "a".repeat(64),
      racialTypesRowCount: 5,
    };
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "creature", sourceIndex: 0, hitPoints }],
    });
    const candidateCreature = list(
      parseRawGffDocument(result.gitBytes),
      "Creature List",
    )!.value[0]!;
    expect(candidateCreature).toEqual({
      typeId: sourceCreature.typeId,
      fields: sourceCreature.fields.map((field) => {
        if (field.label === "HitPoints") return { ...field, value: 12 };
        if (field.label === "CurrentHitPoints") return { ...field, value: 10 };
        if (field.label === "MaxHitPoints") return { ...field, value: 27 };
        return field;
      }),
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);
  });

  it("rewrites only same-roster ClassLevel Shorts with the coupled HP triplet", () => {
    const pair = fixturePair();
    const classList = {
      label: "ClassList" as const,
      type: "list" as const,
      value: [
        {
          typeId: 2,
          fields: [
            { label: "Class", type: "int" as const, value: 4 },
            { label: "ClassLevel", type: "short" as const, value: 3 },
            { label: "KnownList0", type: "list" as const, value: [] },
            { label: "Opaque", type: "cexostring" as const, value: "preserve" },
          ],
        },
        {
          typeId: 2,
          fields: [
            { label: "Class", type: "int" as const, value: 7 },
            { label: "ClassLevel", type: "short" as const, value: 2 },
            { label: "MemorizedList0", type: "list" as const, value: [] },
          ],
        },
      ],
    };
    const withClassList = withCreatureStartingPackageFields(pair.git, [classList]);
    const sourceGit = withCreatureHitPointFields(withClassList, [
      { label: "HitPoints", type: "short", value: 10 },
      { label: "CurrentHitPoints", type: "short", value: 7 },
      { label: "MaxHitPoints", type: "short", value: 99 },
      { label: "Con", type: "byte", value: 14 },
      { label: "Race", type: "byte", value: 1 },
    ]);
    const sourceCreature = list(parseRawGffDocument(sourceGit), "Creature List")!.value[0]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        classLevels: {
          expectedClassIds: [4, 7],
          expectedLevels: [3, 2],
          levels: [4, 3],
          opaqueSiblingFieldCounts: [2, 1],
        },
        hitPoints: {
          expectedHitPoints: 10,
          expectedCurrentHitPoints: 7,
          expectedMaxHitPoints: 99,
          hitPoints: 10,
          currentHitPoints: 4,
          maxHitPoints: 31,
          expectedConstitution: 14,
          constitution: 14,
          race: 1,
          classLevels: [3, 2],
          targetClassLevels: [4, 3],
          featRow40Present: false,
          racialConstitutionAdjust: 2,
          racialTypesSha256: "a".repeat(64),
          racialTypesRowCount: 5,
        },
      }],
    });
    const candidateCreature = list(
      parseRawGffDocument(result.gitBytes),
      "Creature List",
    )!.value[0]!;
    expect(candidateCreature).toEqual({
      typeId: sourceCreature.typeId,
      fields: sourceCreature.fields.map((field) => {
        if (field.label === "ClassList" && field.type === "list") {
          return {
            ...field,
            value: field.value.map((entry, index) => ({
              ...entry,
              fields: entry.fields.map((nested) => nested.label === "ClassLevel"
                ? { ...nested, value: index === 0 ? 4 : 3 }
                : nested),
            })),
          };
        }
        if (field.label === "CurrentHitPoints") return { ...field, value: 4 };
        if (field.label === "MaxHitPoints") return { ...field, value: 31 };
        return field;
      }),
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);
  });

  it("rejects a ClassLevel mutation without its coupled HP target", () => {
    const pair = fixturePair();
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        classLevels: {
          expectedClassIds: [4],
          expectedLevels: [3],
          levels: [4],
          opaqueSiblingFieldCounts: [0],
        },
      }],
    })).toThrow("requires the coupled hit-point mutation");
  });

  it("rejects an HP mutation when any raw sibling or Constitution is stale", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureHitPointFields(pair.git, [
      { label: "HitPoints", type: "short", value: 10 },
      { label: "CurrentHitPoints", type: "short", value: 8 },
      { label: "MaxHitPoints", type: "short", value: 99 },
      { label: "Con", type: "byte", value: 14 },
      { label: "Race", type: "byte", value: 1 },
    ]);
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        hitPoints: {
          expectedHitPoints: 10,
          expectedCurrentHitPoints: 7,
          expectedMaxHitPoints: 99,
          hitPoints: 12,
          currentHitPoints: 10,
          maxHitPoints: 27,
          expectedConstitution: 14,
          constitution: 14,
          race: 1,
          classLevels: [3, 2],
          featRow40Present: false,
          racialConstitutionAdjust: 2,
          racialTypesSha256: "a".repeat(64),
          racialTypesRowCount: 5,
        },
      }],
    })).toThrow("source differs from retained provenance");
  });

  it("rewrites exact Creature FirstName, LastName, and Description fields and preserves GIC", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureNameLocalizedStringFields(pair.git, [
      { label: "FirstName", type: "cexolocstring", value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: "Guard" }],
      } },
      { label: "LastName", type: "cexolocstring", value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: "Old" }],
      } },
      { label: "Description", type: "cexolocstring", value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: "Old description" }],
      } },
    ]);
    const sourceCreature = list(parseRawGffDocument(sourceGit), "Creature List")!.value[0]!;
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        localizedStrings: [
          { field: "FirstName", expectedValue: "Guard", value: " Captain " },
          { field: "LastName", expectedValue: "Old", value: "" },
          { field: "Description", expectedValue: "Old description", value: "New description" },
        ],
      } as never],
    });

    const candidateCreature = list(
      parseRawGffDocument(result.gitBytes),
      "Creature List",
    )!.value[0]!;
    expect(candidateCreature).toEqual({
      typeId: sourceCreature.typeId,
      fields: sourceCreature.fields.map((field) => field.label === "FirstName"
        ? { label: "FirstName", type: "cexolocstring", value: {
            strRef: 0xffff_ffff,
            entries: [{ languageId: 0, text: " Captain " }],
          } }
        : field.label === "LastName"
          ? { label: "LastName", type: "cexolocstring", value: {
              strRef: 0xffff_ffff,
              entries: [],
            } }
          : field.label === "Description"
            ? { label: "Description", type: "cexolocstring", value: {
                strRef: 0xffff_ffff,
                entries: [{ languageId: 0, text: "New description" }],
              } }
          : field),
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);
  });

  it("rewrites a complete ordered Creature localized-string list and preserves exact order", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureNameLocalizedStringFields(pair.git, [{
      label: "FirstName",
      type: "cexolocstring",
      value: {
        strRef: 0xffff_ffff,
        entries: [
          { languageId: 42, text: "Legacy" },
          { languageId: 0, text: "Guard" },
        ],
      },
    }]);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        localizedStrings: [{
          field: "FirstName",
          expectedValue: "Guard",
          value: "Captain",
          expectedProfile: "multi_entry_inline_ascii",
          expectedEntries: [
            { languageId: 42, text: "Legacy" },
            { languageId: 0, text: "Guard" },
          ],
          valueEntries: [
            { languageId: 0, text: "Captain" },
            { languageId: 2, text: "Capitaine" },
            { languageId: 42, text: "Legacy 2" },
          ],
        }],
      } as never],
    });

    const candidateCreature = list(
      parseRawGffDocument(result.gitBytes),
      "Creature List",
    )!.value[0]!;
    expect(candidateCreature.fields.find((field) => field.label === "FirstName")).toEqual({
      label: "FirstName",
      type: "cexolocstring",
      value: {
        strRef: 0xffff_ffff,
        entries: [
          { languageId: 0, text: "Captain" },
          { languageId: 2, text: "Capitaine" },
          { languageId: 42, text: "Legacy 2" },
        ],
      },
    });
    expect(result.gicBytes).toEqual(pair.gic);
  });

  it.each([
    ["missing field", [], "Guard", "creature:index=0:FirstName:count=0:type=missing"],
    ["wrong-case label", [{ label: "firstname", type: "cexolocstring" as const, value: {
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, text: "Guard" }],
    } }], "Guard", "creature:index=0:FirstName:count=0:type=missing"],
    ["wrong type", [{ label: "FirstName", type: "cexostring" as const, value: "Guard" }], "Guard", "creature:index=0:FirstName:count=1:type=cexostring"],
    ["duplicate field", [
      { label: "FirstName", type: "cexolocstring" as const, value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: "Guard" }],
      } },
      { label: "FirstName", type: "cexolocstring" as const, value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: "Other" }],
      } },
    ], "Guard", "creature:index=0:FirstName:count=2:type=cexolocstring"],
    ["stale expected value", [{ label: "FirstName", type: "cexolocstring" as const, value: {
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, text: "Guard" }],
    } }], "Stale", "creature:index=0:FirstName:stale_source"],
    ["TLK-backed source", [{ label: "FirstName", type: "cexolocstring" as const, value: {
      strRef: 12_416,
      entries: [],
    } }], "Chicken", "creature:index=0:FirstName:unsupported_source"],
  ] as const)("rejects a Creature FirstName mutation with %s", (
    _label,
    nameFields,
    expectedValue,
    diagnostic,
  ) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withCreatureNameLocalizedStringFields(pair.git, nameFields),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        localizedStrings: [{ field: "FirstName", expectedValue, value: "Captain" }],
      } as never],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [diagnostic],
    });
  });

  it.each([
    ["missing field", [], "CREATURE_1", "creature:index=0:Tag:count=0:type=missing"],
    ["wrong-case label", [{ label: "tag", type: "cexostring" as const, value: "CREATURE_1" }], "CREATURE_1", "creature:index=0:Tag:count=0:type=missing"],
    ["wrong type", [{ label: "Tag", type: "resref" as const, value: "creature_1" }], "creature_1", "creature:index=0:Tag:count=1:type=resref"],
    ["duplicate field", [
      { label: "Tag", type: "cexostring" as const, value: "CREATURE_1" },
      { label: "Tag", type: "cexostring" as const, value: "CREATURE_2" },
    ], "CREATURE_1", "creature:index=0:Tag:count=2:type=cexostring"],
    ["stale expected value", [{ label: "Tag", type: "cexostring" as const, value: "CREATURE_1" }], "STALE", "creature:index=0:Tag:expected=STALE:actual=CREATURE_1"],
  ] as const)("rejects a Creature Tag mutation with %s", (
    _label,
    tagFields,
    expectedValue,
    diagnostic,
  ) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withCreatureTagFields(pair.git, tagFields),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        tag: { expectedValue, value: "CREATURE_RENAMED" },
      }],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [diagnostic],
    });
  });

  it.each([
    ["missing field", [], "guard_dialog", "creature:index=0:Conversation:count=0:type=missing"],
    ["wrong-case label", [{ label: "conversation", type: "resref" as const, value: "guard_dialog" }], "guard_dialog", "creature:index=0:Conversation:count=0:type=missing"],
    ["wrong type", [{ label: "Conversation", type: "cexostring" as const, value: "guard_dialog" }], "guard_dialog", "creature:index=0:Conversation:count=1:type=cexostring"],
    ["duplicate field", [
      { label: "Conversation", type: "resref" as const, value: "guard_dialog" },
      { label: "Conversation", type: "resref" as const, value: "other_dialog" },
    ], "guard_dialog", "creature:index=0:Conversation:count=2:type=resref"],
    ["stale expected value", [{ label: "Conversation", type: "resref" as const, value: "guard_dialog" }], "stale_dialog", "creature:index=0:Conversation:stale_source"],
  ] as const)("rejects a Creature Conversation mutation with %s", (
    _label,
    conversationFields,
    expectedResRef,
    diagnostic,
  ) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withCreatureConversationFields(pair.git, conversationFields),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        conversation: { expectedResRef, resRef: "new_dialog" },
      }],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [diagnostic],
    });
  });

  it.each([
    ["uppercase target", { expectedResRef: "guard_dialog", resRef: "New_Dialog" }],
    ["invalid target byte", { expectedResRef: "guard_dialog", resRef: "new-dialog" }],
    ["unchanged pair", { expectedResRef: "guard_dialog", resRef: "guard_dialog" }],
    ["unknown key", { expectedResRef: "guard_dialog", resRef: "new_dialog", extra: true }],
  ])("rejects a Creature Conversation %s pair", (_label, conversation) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withCreatureConversationFields(pair.git, [{
        label: "Conversation",
        type: "resref",
        value: "guard_dialog",
      }]),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "creature", sourceIndex: 0, conversation } as never],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: ["creature:index=0:Conversation:invalid_pair"],
    });
  });

  it.each([
    ["missing field", [], 1, "creature:index=0:Interruptable:count=0:type=missing"],
    ["wrong-case label", [{ label: "interruptable", type: "byte" as const, value: 1 }], 1, "creature:index=0:Interruptable:count=0:type=missing"],
    ["wrong type", [{ label: "Interruptable", type: "word" as const, value: 1 }], 1, "creature:index=0:Interruptable:count=1:type=word"],
    ["duplicate field", [
      { label: "Interruptable", type: "byte" as const, value: 1 },
      { label: "Interruptable", type: "byte" as const, value: 0 },
    ], 1, "creature:index=0:Interruptable:count=2:type=byte"],
    ["invalid source value", [{ label: "Interruptable", type: "byte" as const, value: 2 }], 1, "creature:index=0:Interruptable:count=1:type=byte:value=2"],
    ["stale expected value", [{ label: "Interruptable", type: "byte" as const, value: 1 }], 0, "creature:index=0:Interruptable:stale_source"],
  ] as const)("rejects a Creature Interruptable mutation with %s", (
    _label,
    interruptableFields,
    expectedValue,
    diagnostic,
  ) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withCreatureInterruptableFields(pair.git, interruptableFields),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        interruptable: { expectedValue, value: expectedValue === 1 ? 0 : 1 },
      } as never],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [diagnostic],
    });
  });

  it.each([
    ["null", null],
    ["unchanged", { expectedValue: 1, value: 1 }],
    ["non-binary target", { expectedValue: 1, value: 2 }],
    ["unknown key", { expectedValue: 1, value: 0, extra: true }],
  ])("rejects a Creature Interruptable %s pair", (_label, interruptable) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withCreatureInterruptableFields(pair.git, [{
        label: "Interruptable",
        type: "byte",
        value: 1,
      }]),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "creature", sourceIndex: 0, interruptable } as never],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: ["creature:index=0:Interruptable:invalid_pair"],
    });
  });

  it.each([
    ["missing field", [], 0, "creature:index=0:Plot:count=0:type=missing"],
    ["wrong-case label", [{ label: "plot", type: "byte" as const, value: 0 }], 0, "creature:index=0:Plot:count=0:type=missing"],
    ["wrong type", [{ label: "Plot", type: "word" as const, value: 0 }], 0, "creature:index=0:Plot:count=1:type=word"],
    ["duplicate field", [
      { label: "Plot", type: "byte" as const, value: 0 },
      { label: "Plot", type: "byte" as const, value: 1 },
    ], 0, "creature:index=0:Plot:count=2:type=byte"],
    ["invalid source value", [{ label: "Plot", type: "byte" as const, value: 2 }], 0, "creature:index=0:Plot:count=1:type=byte:value=2"],
    ["stale expected value", [{ label: "Plot", type: "byte" as const, value: 0 }], 1, "creature:index=0:Plot:stale_source"],
  ] as const)("rejects a Creature advanced flag mutation with %s", (
    _label,
    advancedFlagFields,
    expectedValue,
    diagnostic,
  ) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withCreatureAdvancedFlagFields(pair.git, advancedFlagFields),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        advancedFlags: {
          plot: { expectedValue, value: expectedValue === 1 ? 0 : 1 },
        },
      } as never],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [diagnostic],
    });
  });

  it.each([
    ["null", null],
    ["empty", {}],
    ["unchanged", { plot: { expectedValue: 0, value: 0 } }],
    ["non-binary target", { plot: { expectedValue: 0, value: 2 } }],
    ["unknown key", { plot: { expectedValue: 0, value: 1 }, extra: true }],
  ])("rejects a Creature advanced flag %s mutation group", (_label, advancedFlags) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withCreatureAdvancedFlagFields(pair.git, [{
        label: "Plot",
        type: "byte",
        value: 0,
      }]),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "creature", sourceIndex: 0, advancedFlags } as never],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: ["creature:index=0:advancedFlags:invalid_group"],
    });
  });

  it.each([
    ["missing field", [], 249, "creature:index=0:Appearance_Type:count=0:type=missing"],
    ["wrong-case label", [{ label: "appearance_type", type: "word" as const, value: 249 }], 249, "creature:index=0:Appearance_Type:count=0:type=missing"],
    ["wrong type", [{ label: "Appearance_Type", type: "dword" as const, value: 249 }], 249, "creature:index=0:Appearance_Type:count=1:type=dword"],
    ["duplicate field", [
      { label: "Appearance_Type", type: "word" as const, value: 249 },
      { label: "Appearance_Type", type: "word" as const, value: 52 },
    ], 249, "creature:index=0:Appearance_Type:count=2:type=word"],
    ["stale expected value", [{ label: "Appearance_Type", type: "word" as const, value: 249 }], 248, "creature:index=0:Appearance_Type:stale_source"],
  ] as const)("rejects a Creature Appearance_Type mutation with %s", (
    _label,
    appearanceFields,
    expectedValue,
    diagnostic,
  ) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withCreatureAppearanceFields(pair.git, appearanceFields),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        appearance: {
          expectedValue,
          value: 52,
          tableSha256: "a".repeat(64),
          rowCount: 1000,
        },
      }],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [diagnostic],
    });
  });

  it.each([
    ["unchanged pair", { expectedValue: 249, value: 249, tableSha256: "a".repeat(64), rowCount: 1000 }],
    ["out-of-table target", { expectedValue: 249, value: 1000, tableSha256: "a".repeat(64), rowCount: 1000 }],
    ["out-of-Word target", { expectedValue: 249, value: 65536, tableSha256: "a".repeat(64), rowCount: 100000 }],
    ["unknown key", { expectedValue: 249, value: 52, tableSha256: "a".repeat(64), rowCount: 1000, extra: true }],
  ])("rejects a Creature Appearance_Type %s", (_label, appearance) => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: withCreatureAppearanceFields(pair.git, [{
        label: "Appearance_Type",
        type: "word",
        value: 249,
      }]),
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{ kind: "creature", sourceIndex: 0, appearance } as never],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: ["creature:index=0:Appearance_Type:invalid_pair"],
    });
  });

  it("rewrites one exact retained Creature ItemList and preserves the paired GIC byte-for-byte", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureInventory(pair.git, [
      creatureInventorySourceEntry("first_item", 2, 3, 0, true, false, 91),
      creatureInventorySourceEntry("second_item", 4, 5, 1, false, true, 92),
    ]);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        inventory: {
          expectedEntries: [
            creatureInventoryProvenance("first_item", 2, 3, 0, true, false),
            creatureInventoryProvenance("second_item", 4, 5, 1, false, true),
          ],
          entries: [
            creatureInventoryProvenance("second_item", 7, 8, 1, true, false),
            creatureInventoryProvenance("first_item", 9, 10, 0, false, true),
          ],
        },
      }],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);
    expect(creatureInventoryList(result.gitBytes)).toEqual([
      {
        typeId: 0,
        fields: [
          { label: "TemplateResRef", type: "resref", value: "second_item" },
          { label: "NestedProbe", type: "int", value: 92 },
          { label: "Repos_PosX", type: "word", value: 7 },
          { label: "Repos_Posy", type: "word", value: 8 },
          { label: "Dropable", type: "byte", value: 1 },
        ],
      },
      {
        typeId: 1,
        fields: [
          { label: "TemplateResRef", type: "resref", value: "first_item" },
          { label: "NestedProbe", type: "int", value: 91 },
          { label: "Repos_PosX", type: "word", value: 9 },
          { label: "Repos_Posy", type: "word", value: 10 },
          { label: "Pickpocketable", type: "byte", value: 1 },
        ],
      },
    ]);
  });

  it("expands the admitted immutable UTI into a new Creature ItemList entry", () => {
    const pair = fixturePair();
    const blueprintBytes = itemBlueprintFixture();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        inventory: {
          expectedEntries: [],
          entries: [{
            resRef: "nw_cloth022",
            itemResRef: "nw_cloth022",
            itemSourceObjectKey: "nwn-base-key-uti-nw-cloth022-v1",
            itemSourceFingerprint: createHash("sha256").update(blueprintBytes).digest("hex"),
            blueprintBytes,
            x: 11,
            y: 12,
            dropable: true,
            pickpocketable: false,
          }],
        },
      }],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    const [entry] = creatureInventoryList(result.gitBytes);
    expect(entry?.typeId).toBe(0);
    expect(entry?.fields).toEqual(expect.arrayContaining([
      { label: "TemplateResRef", type: "resref", value: "nw_cloth022" },
      { label: "XPosition", type: "float", value: -1 },
      { label: "YPosition", type: "float", value: -1 },
      { label: "ZPosition", type: "float", value: -1 },
      { label: "XOrientation", type: "float", value: 0 },
      { label: "YOrientation", type: "float", value: 1 },
      { label: "Repos_PosX", type: "word", value: 11 },
      { label: "Repos_Posy", type: "word", value: 12 },
      { label: "Dropable", type: "byte", value: 1 },
    ]));
    expect(entry?.fields.some((field) =>
      ["Droppable", "Pickpocketable", "Infinite"].includes(field.label)
    )).toBe(false);
  });

  it("removes Creature ItemList when the exact target list is empty", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureInventory(pair.git, [
      creatureInventorySourceEntry("first_item", 2, 3, 0, false, false, 91),
    ]);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        inventory: {
          expectedEntries: [
            creatureInventoryProvenance("first_item", 2, 3, 0, false, false),
          ],
          entries: [],
        },
      }],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    const creature = list(parseRawGffDocument(result.gitBytes), "Creature List")!.value[0]!;
    expect(creature.fields.some((field) => field.label === "ItemList")).toBe(false);
  });

  it.each([
    ["Infinite", { label: "Infinite", type: "byte" as const, value: 1 }, "Infinite:unsupported_flag"],
    ["Droppable alias", { label: "Droppable", type: "byte" as const, value: 1 }, "Droppable:unsupported_flag"],
    ["false-valued Dropable", { label: "Dropable", type: "byte" as const, value: 0 }, "Dropable:value=0"],
    ["wrong-type Pickpocketable", { label: "Pickpocketable", type: "int" as const, value: 1 }, "Pickpocketable:count=1:type=int"],
  ])("rejects a native Creature ItemList with %s", (_label, field, diagnostic) => {
    const pair = fixturePair();
    const entry = creatureInventorySourceEntry("first_item", 2, 3, 0, false, false, 91);
    entry.fields.push(field);
    const sourceGit = withCreatureInventory(pair.git, [entry]);

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        inventory: {
          expectedEntries: [
            creatureInventoryProvenance("first_item", 2, 3, 0, false, false),
          ],
          entries: [
            creatureInventoryProvenance("first_item", 3, 3, 0, false, false),
          ],
        },
      }],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [`creature:index=0:ItemList:source=0:${diagnostic}`],
    });
  });

  it("rejects a Creature ItemList mutation that targets a deleted creature", () => {
    const pair = fixturePair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [{ kind: "creature", sourceIndex: 0 }],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        inventory: {
          expectedEntries: [],
          entries: [{
            ...creatureInventoryBlueprint(),
            blueprintBytes: itemBlueprintFixture(),
          }],
        },
      }],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: ["creature:index=0:deleted"],
    });
  });

  it("rewrites retained Creature Equip_ItemList entries in ascending slot order and preserves GIC", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureEquipment(pair.git, [
      creatureEquipmentSourceEntry("nw_sword001", 16, true, false, 71),
      creatureEquipmentSourceEntry("nw_helm001", 1, false, false, 72),
    ]);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        equipment: {
          expectedEntries: [
            creatureEquipmentProvenance("nw_sword001", 16, 0, true, false),
            creatureEquipmentProvenance("nw_helm001", 1, 1, false, false),
          ],
          entries: [
            creatureEquipmentProvenance("nw_helm001", 1, 1, false, true),
            creatureEquipmentProvenance("nw_sword001", 16, 0, false, false),
          ],
        },
      }],
    });

    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts.creature).toBe(1);
    expect(creatureEquipmentList(result.gitBytes)).toEqual([
      {
        typeId: 1,
        fields: [
          { label: "TemplateResRef", type: "resref", value: "nw_helm001" },
          { label: "EquipmentProbe", type: "int", value: 72 },
          { label: "Pickpocketable", type: "byte", value: 1 },
        ],
      },
      {
        typeId: 16,
        fields: [
          { label: "TemplateResRef", type: "resref", value: "nw_sword001" },
          { label: "EquipmentProbe", type: "int", value: 71 },
        ],
      },
    ]);
  });

  it("applies Creature Tag, Conversation, ItemList and Equip_ItemList changes through one atomic property mutation", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureConversationFields(withCreatureEquipment(withCreatureInventory(pair.git, [
      creatureInventorySourceEntry("nw_potion001", 0, 0, 0, false, false, 61),
    ]), [
      creatureEquipmentSourceEntry("nw_helm001", 1, false, false, 62),
    ]), [{ label: "Conversation", type: "resref", value: "guard_dialog" }]);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        tag: { expectedValue: "CREATURE_1", value: "CREATURE_RENAMED" },
        conversation: { expectedResRef: "guard_dialog", resRef: "new_dialog" },
        inventory: {
          expectedEntries: [
            creatureInventoryProvenance("nw_potion001", 0, 0, 0, false, false),
          ],
          entries: [],
        },
        equipment: {
          expectedEntries: [
            creatureEquipmentProvenance("nw_helm001", 1, 0, false, false),
          ],
          entries: [
            creatureEquipmentProvenance("nw_helm001", 1, 0, true, false),
          ],
        },
      }],
    });

    const creature = list(parseRawGffDocument(result.gitBytes), "Creature List")!.value[0]!;
    expect(creature.fields.find((field) => field.label === "Tag")).toEqual({
      label: "Tag",
      type: "cexostring",
      value: "CREATURE_RENAMED",
    });
    expect(creature.fields.find((field) => field.label === "Conversation")).toEqual({
      label: "Conversation",
      type: "resref",
      value: "new_dialog",
    });
    expect(creature.fields.some((field) => field.label === "ItemList")).toBe(false);
    expect(creatureEquipmentList(result.gitBytes)[0]?.fields).toEqual(expect.arrayContaining([
      { label: "Dropable", type: "byte", value: 1 },
    ]));
    expect(result.gicBytes).toEqual(pair.gic);
  });

  it("removes Creature Equip_ItemList when the retained target is empty", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureEquipment(pair.git, [
      creatureEquipmentSourceEntry("nw_helm001", 1, false, false, 81),
    ]);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        equipment: {
          expectedEntries: [
            creatureEquipmentProvenance("nw_helm001", 1, 0, false, false),
          ],
          entries: [],
        },
      }],
    });

    const creature = list(parseRawGffDocument(result.gitBytes), "Creature List")!.value[0]!;
    expect(creature.fields.some((field) => field.label === "Equip_ItemList")).toBe(false);
  });

  it("rejects a Creature Equip_ItemList target that changes a retained slot", () => {
    const pair = fixturePair();
    const sourceGit = withCreatureEquipment(pair.git, [
      creatureEquipmentSourceEntry("nw_helm001", 1, false, false, 82),
    ]);

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        equipment: {
          expectedEntries: [
            creatureEquipmentProvenance("nw_helm001", 1, 0, false, false),
          ],
          entries: [
            creatureEquipmentProvenance("nw_helm001", 2, 0, true, false),
          ],
        },
      }],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [expect.stringContaining("slotMask")],
    });
  });
});

function storeAdditionWithBlueprint(fields: SupportedGffField[]) {
  const blueprintBytes = buildGffBuffer(fields, "UTM ", ROOT_TYPE);
  return {
    ...storeAdditionFixture(),
    blueprintBytes,
    sourceSha256: createHash("sha256").update(blueprintBytes).digest("hex"),
  };
}

function polygonGeometryFromEntry(
  entry: { fields: SupportedGffField[] },
  kind: "trigger" | "encounter",
) {
  const geometry = entry.fields.find(
    (field): field is Extract<SupportedGffField, { type: "list" }> =>
      field.label === "Geometry" && field.type === "list",
  );
  const labels = kind === "trigger"
    ? (["PointX", "PointY", "PointZ"] as const)
    : (["X", "Y", "Z"] as const);
  if (!geometry) throw new Error("Fixture polygon Geometry is missing.");
  return {
    coordinateSpace: "native_local" as const,
    points: geometry.value.map((point) => ({
      x: Number(point.fields.find((field) => field.label === labels[0])?.value),
      y: Number(point.fields.find((field) => field.label === labels[1])?.value),
      z: Number(point.fields.find((field) => field.label === labels[2])?.value),
    })),
  };
}

function itemPropertyTargetEntry(
  propertyName: number,
  subtype: number,
  costTable: number,
  costValue: number,
  param1: number,
  param1Value: number,
  chanceAppear: number,
) {
  return { propertyName, subtype, costTable, costValue, param1, param1Value, chanceAppear };
}

function itemPropertySourceEntry(
  sourceIndex: number,
  propertyName: number,
  subtype: number,
  costTable: number,
  costValue: number,
  param1: number,
  param1Value: number,
  chanceAppear: number,
) {
  return {
    sourceIndex,
    ...itemPropertyTargetEntry(
      propertyName,
      subtype,
      costTable,
      costValue,
      param1,
      param1Value,
      chanceAppear,
    ),
  };
}

function itemPropertyEntry(
  propertyName: number,
  subtype: number,
  costTable: number,
  costValue: number,
  param1: number,
  param1Value: number,
  chanceAppear: number,
) {
  return {
    typeId: 0,
    fields: [
      { label: "PropertyName", type: "word" as const, value: propertyName },
      { label: "Subtype", type: "word" as const, value: subtype },
      { label: "CostTable", type: "byte" as const, value: costTable },
      { label: "CostValue", type: "word" as const, value: costValue },
      { label: "Param1", type: "byte" as const, value: param1 },
      { label: "Param1Value", type: "byte" as const, value: param1Value },
      { label: "ChanceAppear", type: "byte" as const, value: chanceAppear },
    ],
  };
}

function itemVisualTransformStorage(
  patch: Partial<AreaItemVisualTransformValue> = {},
): Extract<AreaItemVisualTransformStorage, { readonly present: true }> {
  return {
    present: true,
    value: {
      scaleX: 0.5,
      scaleY: 0.75,
      scaleZ: 1.25,
      rotateX: -15,
      rotateY: 30,
      rotateZ: 90,
      translateX: 20,
      translateY: -30,
      translateZ: 40,
      ...patch,
    },
  };
}

function itemVisualTransformField(
  value: AreaItemVisualTransformValue,
): SupportedGffField {
  const controllerValues = [
    ["AnimationSpeed", 1],
    ["ScaleX", value.scaleX],
    ["ScaleY", value.scaleY],
    ["ScaleZ", value.scaleZ],
    ["RotateX", value.rotateX],
    ["RotateY", value.rotateY],
    ["RotateZ", value.rotateZ],
    ["TranslateX", value.translateX],
    ["TranslateY", value.translateY],
    ["TranslateZ", value.translateZ],
  ] as const;
  return {
    label: "VisTransformList",
    type: "list",
    value: [{
      typeId: 6,
      fields: [
        { label: "Scope", type: "int", value: 0 },
        ...controllerValues.map(([label, controllerValue]) => ({
          label,
          type: "struct" as const,
          value: {
            typeId: 0,
            fields: [
              { label: "TimerType", type: "int" as const, value: 0 },
              { label: "ValueTo", type: "float" as const, value: controllerValue },
              { label: "LerpType", type: "int" as const, value: 0 },
            ],
          },
        })),
      ],
    }],
  };
}

function fixturePair(): { git: Buffer; gic: Buffer } {
  const counts = new Map<string, number>([
    ["Creature List", 2],
    ["Door List", 1],
    ["Encounter List", 1],
    ["List", 2],
    ["Placeable List", 2],
    ["SoundList", 1],
    ["StoreList", 1],
    ["TriggerList", 1],
    ["WaypointList", 1],
  ]);
  const gitFields: SupportedGffField[] = [
    {
      label: "AreaProperties",
      type: "struct",
      value: { typeId: 100, fields: [{ label: "MusicDay", type: "int", value: 20 }] },
    },
    ...PROFILES.map(([kind, label, typeId]) => ({
      label,
      type: "list" as const,
      value: Array.from({ length: counts.get(label) ?? 0 }, (_, index) => ({
        typeId,
        fields: [
          { label: "Tag", type: "cexostring" as const, value: `${kind.toUpperCase()}_${index + 1}` },
          { label: `Unknown${capitalize(kind)}Field`, type: "int" as const, value: (index + 1) * 101 },
          ...(kind === "door" ? [
            { label: "LinkedTo", type: "cexostring" as const, value: "OLD_DEST" },
            { label: "LinkedToFlags", type: "byte" as const, value: 1 },
            { label: "LoadScreenID", type: "word" as const, value: 0 },
          ] : []),
          ...(kind === "store" ? [
            { label: "MarkUp", type: "int" as const, value: 100 },
            { label: "MarkDown", type: "int" as const, value: 65 },
            { label: "BlackMarket", type: "byte" as const, value: 0 },
            { label: "BM_MarkDown", type: "int" as const, value: 25 },
            { label: "IdentifyPrice", type: "int" as const, value: 100 },
            { label: "MaxBuyPrice", type: "int" as const, value: -1 },
            { label: "StoreGold", type: "int" as const, value: -1 },
            { label: "OnOpenStore", type: "resref" as const, value: "store_open" },
            { label: "OnStoreClosed", type: "resref" as const, value: "store_closed" },
            {
              label: "StoreList",
              type: "list" as const,
              value: [{
                typeId: 0,
                fields: [{ label: "ItemList", type: "list" as const, value: [] }],
              }],
            },
          ] : []),
          ...(kind === "encounter" ? [
            {
              label: "LocalizedName",
              type: "cexolocstring" as const,
              value: {
                strRef: 0xffff_ffff,
                entries: [{ languageId: 0, text: "Gnoll Ambush" }],
              },
            },
            { label: "Active", type: "byte" as const, value: 1 },
            { label: "PlayerOnly", type: "byte" as const, value: 1 },
            { label: "Reset", type: "byte" as const, value: 0 },
            { label: "ResetTime", type: "int" as const, value: 60 },
            { label: "SpawnOption", type: "int" as const, value: 1 },
            { label: "Respawns", type: "int" as const, value: 0 },
            { label: "MaxCreatures", type: "int" as const, value: 4 },
            { label: "RecCreatures", type: "int" as const, value: 2 },
            { label: "OnEntered", type: "resref" as const, value: "enc_enter" },
            { label: "OnExit", type: "resref" as const, value: "enc_exit" },
            { label: "OnExhausted", type: "resref" as const, value: "" },
            { label: "OnHeartbeat", type: "resref" as const, value: "enc_heartbeat" },
            { label: "OnUserDefined", type: "resref" as const, value: "enc_user" },
            {
              label: "CreatureList",
              type: "list" as const,
              value: [
                { typeId: 0, fields: [
                  { label: "Appearance", type: "int" as const, value: 388 },
                  { label: "CR", type: "float" as const, value: 1 },
                  { label: "ResRef", type: "resref" as const, value: "nw_gnoll001" },
                  { label: "SingleSpawn", type: "byte" as const, value: 0 },
                ] },
                { typeId: 0, fields: [
                  { label: "Appearance", type: "int" as const, value: 389 },
                  { label: "CR", type: "float" as const, value: 3 },
                  { label: "ResRef", type: "resref" as const, value: "nw_gnoll002" },
                  { label: "SingleSpawn", type: "byte" as const, value: 1 },
                ] },
              ],
            },
            { label: "Faction", type: "dword" as const, value: 1 },
            { label: "Difficulty", type: "int" as const, value: 1 },
            { label: "DifficultyIndex", type: "int" as const, value: 2 },
            { label: "XPosition", type: "float" as const, value: 22.412015914916992 },
            { label: "YPosition", type: "float" as const, value: 45.1970329284668 },
            { label: "ZPosition", type: "float" as const, value: 0 },
            {
              label: "Geometry",
              type: "list" as const,
              value: [
                encounterGeometryPoint(-0.13086700439453125, -6.151325225830078, 0.0250005591660738),
                encounterGeometryPoint(6.059123992919922, -6.1513214111328125, 0.025000499561429024),
                encounterGeometryPoint(6.059125900268555, 0.038669586181640625, 0.025000059977173805),
                encounterGeometryPoint(0, 0, 0.02500000037252903),
              ],
            },
            { label: "SpawnPointList", type: "list" as const, value: [] },
          ] : kind === "trigger" ? [
            ...triggerScriptFields(),
            { label: "LinkedTo", type: "cexostring" as const, value: " OLD_DESTINATION " },
            { label: "LinkedToFlags", type: "byte" as const, value: 1 },
            { label: "LoadScreenID", type: "word" as const, value: 0 },
            { label: "XPosition", type: "float" as const, value: 35.47599411010742 },
            { label: "YPosition", type: "float" as const, value: 44.91108703613281 },
            { label: "ZPosition", type: "float" as const, value: 0 },
            { label: "XOrientation", type: "float" as const, value: 0 },
            { label: "YOrientation", type: "float" as const, value: 0 },
            { label: "ZOrientation", type: "float" as const, value: 0 },
            {
              label: "Geometry",
              type: "list" as const,
              value: [
                geometryPoint(-0.2990303039550781, -4.833713531494141, 0.02500000037252903),
                geometryPoint(4.8592987060546875, -4.833709716796875, 0.025000499561429024),
                geometryPoint(4.8592987060546875, 0.324615478515625, 0.025000499561429024),
                geometryPoint(0, 0, 3.125),
              ],
            },
          ] : kind === "creature" || kind === "item" || kind === "store" || kind === "waypoint" ? [
            { label: "XPosition", type: "float" as const, value: 10 + index },
            { label: "YPosition", type: "float" as const, value: 20 + index },
            { label: "ZPosition", type: "float" as const, value: 0 },
            { label: "XOrientation", type: "float" as const, value: 0 },
            { label: "YOrientation", type: "float" as const, value: -1 },
          ] : kind === "sound" ? [
            { label: "XPosition", type: "float" as const, value: 10 + index },
            { label: "YPosition", type: "float" as const, value: 20 + index },
            { label: "ZPosition", type: "float" as const, value: 0 },
            { label: "Interval", type: "dword" as const, value: 25_000 },
            { label: "IntervalVrtn", type: "dword" as const, value: 5_000 },
            { label: "PitchVariation", type: "float" as const, value: Math.fround(0.2) },
            { label: "VolumeVrtn", type: "byte" as const, value: 64 },
            { label: "Volume", type: "byte" as const, value: 64 },
            { label: "Hours", type: "dword" as const, value: 0 },
            { label: "Times", type: "byte" as const, value: 3 },
            { label: "Active", type: "byte" as const, value: 1 },
            { label: "Random", type: "byte" as const, value: 0 },
            { label: "Continuous", type: "byte" as const, value: 1 },
            { label: "Looping", type: "byte" as const, value: 0 },
            { label: "Positional", type: "byte" as const, value: 1 },
            { label: "RandomPosition", type: "byte" as const, value: 0 },
            { label: "Elevation", type: "float" as const, value: 0 },
            { label: "MaxDistance", type: "float" as const, value: 14 },
            { label: "MinDistance", type: "float" as const, value: 2 },
            { label: "RandomRangeX", type: "float" as const, value: 0 },
            { label: "RandomRangeY", type: "float" as const, value: 0 },
            { label: "Priority", type: "byte" as const, value: 20 },
            {
              label: "Sounds",
              type: "list" as const,
              value: ["snd_a", "snd_b"].map((value) => ({
                typeId: 0,
                fields: [{ label: "Sound", type: "resref" as const, value }],
              })),
            },
          ] : kind === "placeable" ? [
            { label: "OnUsed", type: "resref" as const, value: index === 0 ? "" : "old_script" },
            { label: "OnClick", type: "resref" as const, value: index === 0 ? "" : "old_click" },
            { label: "OnClosed", type: "resref" as const, value: index === 0 ? "" : "old_closed" },
            { label: "OnDamaged", type: "resref" as const, value: index === 0 ? "" : "old_damaged" },
            { label: "OnDeath", type: "resref" as const, value: index === 0 ? "" : "old_death" },
            { label: "OnHeartbeat", type: "resref" as const, value: index === 0 ? "" : "old_heartbeat" },
            { label: "OnInvDisturbed", type: "resref" as const, value: index === 0 ? "" : "old_inv" },
            { label: "OnLock", type: "resref" as const, value: index === 0 ? "" : "old_lock" },
            { label: "OnMeleeAttacked", type: "resref" as const, value: index === 0 ? "" : "old_melee" },
            { label: "OnOpen", type: "resref" as const, value: index === 0 ? "" : "old_open" },
            { label: "OnSpellCastAt", type: "resref" as const, value: index === 0 ? "" : "old_spell" },
            { label: "OnUnlock", type: "resref" as const, value: index === 0 ? "" : "old_unlock" },
            { label: "OnUserDefined", type: "resref" as const, value: index === 0 ? "" : "old_user" },
            { label: "OnDisarm", type: "resref" as const, value: index === 0 ? "" : "old_disarm" },
            { label: "OnTrapTriggered", type: "resref" as const, value: index === 0 ? "" : "old_trap" },
            { label: "Static", type: "byte" as const, value: 1 },
            { label: "Useable", type: "byte" as const, value: 0 },
            { label: "Plot", type: "byte" as const, value: 0 },
            { label: "HasInventory", type: "byte" as const, value: 0 },
            { label: "Hardness", type: "byte" as const, value: 5 },
            { label: "Fort", type: "byte" as const, value: 16 },
            { label: "Ref", type: "byte" as const, value: 0 },
            { label: "Will", type: "byte" as const, value: 0 },
            { label: "AnimationState", type: "byte" as const, value: 0 },
            { label: "Appearance", type: "dword" as const, value: 104 },
            { label: "HP", type: "short" as const, value: 15 },
            { label: "CurrentHP", type: "short" as const, value: 15 },
            { label: "Conversation", type: "resref" as const, value: "" },
            { label: "Interruptable", type: "byte" as const, value: 1 },
            { label: "TrapFlag", type: "byte" as const, value: 0 },
            { label: "TrapDetectable", type: "byte" as const, value: 1 },
            { label: "TrapDisarmable", type: "byte" as const, value: 1 },
            { label: "TrapOneShot", type: "byte" as const, value: 1 },
            { label: "TrapDetectDC", type: "byte" as const, value: 0 },
            { label: "DisarmDC", type: "byte" as const, value: 15 },
            { label: "TrapType", type: "byte" as const, value: 3 },
            { label: "Locked", type: "byte" as const, value: 0 },
            { label: "Lockable", type: "byte" as const, value: 0 },
            { label: "AutoRemoveKey", type: "byte" as const, value: 0 },
            { label: "KeyRequired", type: "byte" as const, value: 0 },
            { label: "KeyName", type: "cexostring" as const, value: "" },
            { label: "OpenLockDC", type: "byte" as const, value: 18 },
            { label: "CloseLockDC", type: "byte" as const, value: 0 },
            { label: "X", type: "float" as const, value: 30 + index },
            { label: "Y", type: "float" as const, value: 20 + index },
            { label: "Z", type: "float" as const, value: 0 },
            { label: "Bearing", type: "float" as const, value: 0 },
          ] : []),
        ],
      })),
    })),
  ];
  const gicFields: SupportedGffField[] = [
    ...PROFILES.map(([kind, label, typeId]) => ({
      label,
      type: "list" as const,
      value: Array.from({ length: counts.get(label) ?? 0 }, (_, index) => ({
        typeId,
        fields: [
          ...(kind === "sound"
            ? [{ label: "PlayInToolset", type: "byte" as const, value: 1 }]
            : []),
          { label: "Comment", type: "cexostring" as const, value: `${kind}-comment-${index + 1}` },
        ],
      })),
    })),
    { label: "EditorOnlyRoot", type: "cexostring", value: "preserve-gic-root" },
  ];
  return {
    git: buildGffBuffer(gitFields, "GIT ", ROOT_TYPE),
    gic: buildGffBuffer(gicFields, "GIC ", ROOT_TYPE),
  };
}

function triggerScriptValues() {
  return {
    onDisarm: "trg_disarm",
    onTrapTriggered: "trg_trapped",
    onClick: "",
    onHeartbeat: "trg_heartbeat",
    onEnter: "trg_enter",
    onExit: "trg_exit",
    onUserDefined: "trg_user",
  };
}

function triggerTransitionStorage() {
  return {
    linkedTo: " OLD_DESTINATION ",
    linkedToFlags: 1,
    loadScreenId: 0,
  };
}

function triggerCoreProperties() {
  return {
    autoRemoveKey: 0 as const,
    factionId: 1,
    cursorId: 0,
    highlightHeight: Math.fround(0),
    keyName: "",
    portraitId: 0,
    triggerType: 0,
  };
}

function triggerCorePropertyFields(): SupportedGffField[] {
  const value = triggerCoreProperties();
  return [
    { label: "AutoRemoveKey", type: "byte", value: value.autoRemoveKey },
    { label: "Faction", type: "dword", value: value.factionId },
    { label: "Cursor", type: "byte", value: value.cursorId },
    { label: "HighlightHeight", type: "float", value: value.highlightHeight },
    { label: "KeyName", type: "cexostring", value: value.keyName },
    { label: "PortraitId", type: "word", value: value.portraitId },
    { label: "Type", type: "int", value: value.triggerType },
  ];
}

function triggerTrapProperties() {
  return {
    trapDetectable: 1,
    trapDetectDc: 0,
    trapDisarmable: 1,
    disarmDc: 15,
    trapFlag: 0,
    trapOneShot: 1,
    trapType: 0,
  };
}

function triggerTrapPropertyFields(): SupportedGffField[] {
  const value = triggerTrapProperties();
  return [
    { label: "TrapDetectable", type: "byte", value: value.trapDetectable },
    { label: "TrapDetectDC", type: "byte", value: value.trapDetectDc },
    { label: "TrapDisarmable", type: "byte", value: value.trapDisarmable },
    { label: "DisarmDC", type: "byte", value: value.disarmDc },
    { label: "TrapFlag", type: "byte", value: value.trapFlag },
    { label: "TrapOneShot", type: "byte", value: value.trapOneShot },
    { label: "TrapType", type: "byte", value: value.trapType },
  ];
}

function triggerScriptFields(): SupportedGffField[] {
  const value = triggerScriptValues();
  return [
    { label: "OnDisarm", type: "resref", value: value.onDisarm },
    { label: "OnTrapTriggered", type: "resref", value: value.onTrapTriggered },
    { label: "OnClick", type: "resref", value: value.onClick },
    { label: "ScriptHeartbeat", type: "resref", value: value.onHeartbeat },
    { label: "ScriptOnEnter", type: "resref", value: value.onEnter },
    { label: "ScriptOnExit", type: "resref", value: value.onExit },
    { label: "ScriptUserDefine", type: "resref", value: value.onUserDefined },
  ];
}

function storeCommerce() {
  return {
    markUp: 100,
    markDown: 65,
    blackMarket: false,
    blackMarketMarkDown: 25,
    identifyPrice: 100,
    maxBuyPrice: -1,
    storeGold: -1,
  } as const;
}

function nativeStoreRestrictionList(
  label: "WillNotBuy" | "WillOnlyBuy",
  baseItemIds: readonly number[],
): SupportedGffField {
  return {
    label,
    type: "list",
    value: baseItemIds.map((value) => ({
      typeId: 0x0001_7e4d,
      fields: [{ label: "BaseItem", type: "int", value }],
    })),
  };
}

function nativeStoreInventory(): Extract<SupportedGffField, { type: "list" }> {
  return {
    label: "StoreList",
    type: "list",
    value: [
      {
        typeId: 0,
        fields: [{
          label: "ItemList",
          type: "list",
          value: [
            {
              typeId: 0,
              fields: [
                { label: "TemplateResRef", type: "resref", value: "itm_a" },
                { label: "BaseItem", type: "int", value: 0 },
                { label: "OpaqueA", type: "int", value: 77 },
                { label: "Repos_PosX", type: "word", value: 0 },
                { label: "Repos_Posy", type: "word", value: 0 },
                { label: "Infinite", type: "byte", value: 1 },
              ],
            },
            {
              typeId: 1,
              fields: [
                { label: "TemplateResRef", type: "resref", value: "itm_b" },
                { label: "BaseItem", type: "int", value: 1 },
                { label: "OpaqueB", type: "cexostring", value: "preserve-b" },
                { label: "Repos_PosX", type: "word", value: 2 },
                { label: "Repos_Posy", type: "word", value: 0 },
              ],
            },
          ],
        }],
      },
      { typeId: 4, fields: [] },
      { typeId: 2, fields: [] },
      { typeId: 3, fields: [] },
      { typeId: 1, fields: [] },
    ],
  };
}

function nativeStoreInventoryProvenance() {
  return [
    {
      bucketTypeId: 0,
      entries: [
        {
          sourceIndex: 0,
          resRef: "itm_a",
          baseItemId: 0,
          slotWidth: 2,
          slotHeight: 2,
          x: 0,
          y: 0,
          infinite: true,
        },
        {
          sourceIndex: 1,
          resRef: "itm_b",
          baseItemId: 1,
          slotWidth: 1,
          slotHeight: 3,
          x: 2,
          y: 0,
          infinite: false,
        },
      ],
    },
    { bucketTypeId: 4, entries: [] },
    { bucketTypeId: 2, entries: [] },
    { bucketTypeId: 3, entries: [] },
    { bucketTypeId: 1, entries: [] },
  ];
}

function withSecondPlaceableFields(
  git: Buffer,
  transform: (fields: SupportedGffField[]) => SupportedGffField[],
): Buffer {
  const document = parseRawGffDocument(git)!;
  const fields = document.fields.map((field) => {
    if (field.label !== "Placeable List" || field.type !== "list") {
      return field;
    }
    return {
      ...field,
      value: field.value.map((entry, index) => index === 1
        ? { ...entry, fields: transform([...entry.fields]) }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function withSecondCreatureFields(
  git: Buffer,
  transform: (fields: SupportedGffField[]) => SupportedGffField[],
): Buffer {
  const document = parseRawGffDocument(git)!;
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") {
      return field;
    }
    return {
      ...field,
      value: field.value.map((entry, index) => index === 1
        ? { ...entry, fields: transform([...entry.fields]) }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function withSecondPlaceableGicFields(
  gic: Buffer,
  transform: (fields: SupportedGffField[]) => SupportedGffField[],
): Buffer {
  const document = parseRawGffDocument(gic)!;
  const fields = document.fields.map((field) => {
    if (field.label !== "Placeable List" || field.type !== "list") {
      return field;
    }
    return {
      ...field,
      value: field.value.map((entry, index) => index === 1
        ? { ...entry, fields: transform([...entry.fields]) }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIC ", ROOT_TYPE);
}

function placeableInventorySourceEntry(
  resRef: string,
  x: number,
  y: number,
  unknownValue: number,
): { typeId: number; fields: SupportedGffField[] } {
  return {
    typeId: 77,
    fields: [
      { label: "TemplateResRef", type: "resref" as const, value: resRef },
      { label: "UnknownNestedItem", type: "int" as const, value: unknownValue },
      { label: "Repos_PosX", type: "word" as const, value: x },
      { label: "Repos_Posy", type: "word" as const, value: y },
    ],
  };
}

function placeableInventoryBlueprint(overrides: Readonly<Record<string, unknown>> = {}) {
  const blueprintBytes = itemBlueprintFixture();
  return {
    resRef: "nw_cloth022",
    itemResRef: "nw_cloth022",
    itemSourceObjectKey: "nwn-base-key-uti-nw-cloth022-v1",
    itemSourceFingerprint: createHash("sha256").update(blueprintBytes).digest("hex"),
    blueprintBytes,
    x: 0,
    y: 0,
    ...overrides,
  };
}

function withPlaceableInventory(
  git: Buffer,
  entries: Array<{ typeId: number; fields: SupportedGffField[] }>,
): Buffer {
  return withSecondPlaceableFields(git, (fields) => [
    ...fields,
    { label: "ItemList", type: "list", value: entries },
  ]);
}

function placeableInventoryList(git: Buffer) {
  const placeable = list(parseRawGffDocument(git), "Placeable List")!.value[1]!;
  const inventory = placeable.fields.find((field) => field.label === "ItemList");
  if (!inventory || inventory.type !== "list") {
    throw new Error("Expected Placeable ItemList fixture.");
  }
  return inventory.value;
}

function creatureInventorySourceEntry(
  resRef: string,
  x: number,
  y: number,
  sourceIndex: number,
  dropable: boolean,
  pickpocketable: boolean,
  unknownValue: number,
): { typeId: number; fields: SupportedGffField[] } {
  return {
    typeId: sourceIndex,
    fields: [
      { label: "TemplateResRef", type: "resref", value: resRef },
      { label: "NestedProbe", type: "int", value: unknownValue },
      { label: "Repos_PosX", type: "word", value: x },
      { label: "Repos_Posy", type: "word", value: y },
      ...(dropable ? [{ label: "Dropable", type: "byte" as const, value: 1 }] : []),
      ...(pickpocketable
        ? [{ label: "Pickpocketable", type: "byte" as const, value: 1 }]
        : []),
    ],
  };
}

function creatureInventoryProvenance(
  resRef: string,
  x: number,
  y: number,
  sourceIndex: number,
  dropable: boolean,
  pickpocketable: boolean,
) {
  return { sourceIndex, resRef, x, y, dropable, pickpocketable };
}

function creatureInventoryBlueprint() {
  const blueprintBytes = itemBlueprintFixture();
  return {
    resRef: "nw_cloth022",
    itemResRef: "nw_cloth022",
    itemSourceObjectKey: "nwn-base-key-uti-nw-cloth022-v1",
    itemSourceFingerprint: createHash("sha256").update(blueprintBytes).digest("hex"),
    x: 0,
    y: 0,
    dropable: false,
    pickpocketable: false,
  };
}

function withCreatureInventory(
  git: Buffer,
  entries: Array<{ typeId: number; fields: SupportedGffField[] }>,
): Buffer {
  const document = parseRawGffDocument(git)!;
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") return field;
    return {
      ...field,
      value: field.value.map((entry, index) => index === 0
        ? { ...entry, fields: [...entry.fields, { label: "ItemList", type: "list" as const, value: entries }] }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function withCreatureTagFields(
  git: Buffer,
  tagFields: readonly SupportedGffField[],
): Buffer {
  const document = parseRawGffDocument(git)!;
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") return field;
    return {
      ...field,
      value: field.value.map((entry, index) => index === 0
        ? {
            ...entry,
            fields: [
              ...tagFields,
              ...entry.fields.filter((candidate) => candidate.label.toLowerCase() !== "tag"),
            ],
          }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function withCreatureConversationFields(
  git: Buffer,
  conversationFields: readonly SupportedGffField[],
): Buffer {
  const document = parseRawGffDocument(git)!;
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") return field;
    return {
      ...field,
      value: field.value.map((entry, index) => index === 0
        ? {
            ...entry,
            fields: [
              ...conversationFields,
              ...entry.fields.filter(
                (candidate) => candidate.label.toLowerCase() !== "conversation",
              ),
            ],
          }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function withCreatureInterruptableFields(
  git: Buffer,
  interruptableFields: readonly SupportedGffField[],
): Buffer {
  const document = parseRawGffDocument(git)!;
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") return field;
    return {
      ...field,
      value: field.value.map((entry, index) => index === 0
        ? {
            ...entry,
            fields: [
              ...interruptableFields,
              ...entry.fields.filter(
                (candidate) => candidate.label.toLowerCase() !== "interruptable",
              ),
            ],
          }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function withCreatureAdvancedFlagFields(
  git: Buffer,
  advancedFlagFields: readonly SupportedGffField[],
): Buffer {
  const labels = new Set([
    "disarmable",
    "plot",
    "isimmortal",
    "lootable",
    "nopermdeath",
  ]);
  const document = parseRawGffDocument(git)!;
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") return field;
    return {
      ...field,
      value: field.value.map((entry, index) => index === 0
        ? {
            ...entry,
            fields: [
              ...advancedFlagFields,
              ...entry.fields.filter(
                (candidate) => !labels.has(candidate.label.toLowerCase()),
              ),
            ],
          }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function withCreatureDeathRemainsFields(
  git: Buffer,
  deathRemainsFields: readonly SupportedGffField[],
): Buffer {
  const labels = new Set(["bodybag", "decaytime"]);
  const document = parseRawGffDocument(git)!;
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") return field;
    return {
      ...field,
      value: field.value.map((entry, index) => index === 0
        ? {
            ...entry,
            fields: [
              ...deathRemainsFields,
              ...entry.fields.filter(
                (candidate) => !labels.has(candidate.label.toLowerCase()),
              ),
            ],
          }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function withCreatureFactionFields(
  git: Buffer,
  factionFields: readonly SupportedGffField[],
): Buffer {
  const document = parseRawGffDocument(git)!;
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") return field;
    return {
      ...field,
      value: field.value.map((entry, index) => index === 0
        ? {
            ...entry,
            fields: [
              ...factionFields,
              ...entry.fields.filter(
                (candidate) => candidate.label.toLowerCase() !== "factionid",
              ),
            ],
          }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function withCreatureTemplateResRefFields(
  git: Buffer,
  templateResRefFields: readonly SupportedGffField[],
): Buffer {
  const document = parseRawGffDocument(git)!;
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") return field;
    return {
      ...field,
      value: field.value.map((entry, index) => index === 0
        ? {
            ...entry,
            fields: [
              ...templateResRefFields,
              ...entry.fields.filter(
                (candidate) => candidate.label.toLowerCase() !== "templateresref",
              ),
            ],
          }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function withCreatureSpecialIdentityStringFields(
  git: Buffer,
  specialIdentityStringFields: readonly SupportedGffField[],
): Buffer {
  const document = parseRawGffDocument(git)!;
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") return field;
    return {
      ...field,
      value: field.value.map((entry, index) => index === 0
        ? {
            ...entry,
            fields: [
              ...specialIdentityStringFields,
              ...entry.fields.filter((candidate) =>
                candidate.label.toLowerCase() !== "subrace" &&
                candidate.label.toLowerCase() !== "deity"
              ),
            ],
          }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function withCreatureScriptResRefFields(
  git: Buffer,
  scriptFields: readonly SupportedGffField[],
): Buffer {
  const nativeLabels = new Set([
    "scriptheartbeat",
    "scriptonnotice",
    "scriptspellat",
    "scriptattacked",
    "scriptdamaged",
    "scriptdisturbed",
    "scriptendround",
    "scriptdialogue",
    "scriptspawn",
    "scriptrested",
    "scriptdeath",
    "scriptuserdefine",
    "scriptonblocked",
  ]);
  const document = parseRawGffDocument(git)!;
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") return field;
    return {
      ...field,
      value: field.value.map((entry, index) => index === 0
        ? {
            ...entry,
            fields: [
              ...scriptFields,
              ...entry.fields.filter(
                (candidate) => !nativeLabels.has(candidate.label.toLowerCase()),
              ),
            ],
          }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function withCreatureAppearanceFields(
  git: Buffer,
  appearanceFields: readonly SupportedGffField[],
): Buffer {
  const document = parseRawGffDocument(git)!;
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") return field;
    return {
      ...field,
      value: field.value.map((entry, index) => index === 0
        ? {
            ...entry,
            fields: [
              ...appearanceFields,
              ...entry.fields.filter(
                (candidate) => candidate.label.toLowerCase() !== "appearance_type",
              ),
            ],
          }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function withCreatureGenderFields(
  git: Buffer,
  genderFields: readonly SupportedGffField[],
): Buffer {
  const document = parseRawGffDocument(git)!;
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") return field;
    return {
      ...field,
      value: field.value.map((entry, index) => index === 0
        ? {
            ...entry,
            fields: [
              ...genderFields,
              ...entry.fields.filter(
                (candidate) => candidate.label.toLowerCase() !== "gender",
              ),
            ],
          }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function withCreaturePerceptionRangeFields(
  git: Buffer,
  perceptionRangeFields: readonly SupportedGffField[],
): Buffer {
  const document = parseRawGffDocument(git)!;
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") return field;
    return {
      ...field,
      value: field.value.map((entry, index) => index === 0
        ? {
            ...entry,
            fields: [
              ...perceptionRangeFields,
              ...entry.fields.filter(
                (candidate) => candidate.label.toLowerCase() !== "perceptionrange",
              ),
            ],
          }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function withCreatureWalkRateFields(
  git: Buffer,
  walkRateFields: readonly SupportedGffField[],
): Buffer {
  const document = parseRawGffDocument(git)!;
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") return field;
    return {
      ...field,
      value: field.value.map((entry, index) => index === 0
        ? {
            ...entry,
            fields: [
              ...walkRateFields,
              ...entry.fields.filter(
                (candidate) => candidate.label.toLowerCase() !== "walkrate",
              ),
            ],
          }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function withCreatureSoundSetFileFields(
  git: Buffer,
  soundSetFileFields: readonly SupportedGffField[],
): Buffer {
  const document = parseRawGffDocument(git)!;
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") return field;
    return {
      ...field,
      value: field.value.map((entry, index) => index === 0
        ? {
            ...entry,
            fields: [
              ...soundSetFileFields,
              ...entry.fields.filter(
                (candidate) => candidate.label.toLowerCase() !== "soundsetfile",
              ),
            ],
          }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function withCreatureStartingPackageFields(
  git: Buffer,
  startingPackageFields: readonly SupportedGffField[],
): Buffer {
  const document = parseRawGffDocument(git)!;
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") return field;
    return {
      ...field,
      value: field.value.map((entry, index) => index === 0
        ? {
            ...entry,
            fields: [
              ...startingPackageFields,
              ...entry.fields.filter((candidate) =>
                candidate.label.toLowerCase() !== "startingpackage" &&
                candidate.label.toLowerCase() !== "classlist"),
            ],
          }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function withCreatureSkillListFields(
  git: Buffer,
  skillListFields: readonly SupportedGffField[],
): Buffer {
  const document = parseRawGffDocument(git)!;
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") return field;
    return {
      ...field,
      value: field.value.map((entry, index) => index === 0
        ? {
            ...entry,
            fields: [
              ...skillListFields,
              ...entry.fields.filter(
                (candidate) => candidate.label.toLowerCase() !== "skilllist",
              ),
            ],
          }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function withCreaturePortraitFields(
  git: Buffer,
  portraitFields: readonly SupportedGffField[],
): Buffer {
  const document = parseRawGffDocument(git)!;
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") return field;
    return {
      ...field,
      value: field.value.map((entry, index) => index === 0
        ? {
            ...entry,
            fields: [
              ...portraitFields,
              ...entry.fields.filter(
                (candidate) => candidate.label.toLowerCase() !== "portraitid" &&
                  candidate.label !== "Portrait",
              ),
            ],
          }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function withCreatureChallengeRatingFields(
  git: Buffer,
  challengeRatingFields: readonly SupportedGffField[],
): Buffer {
  const document = parseRawGffDocument(git)!;
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") return field;
    return {
      ...field,
      value: field.value.map((entry, index) => index === 0
        ? {
            ...entry,
            fields: [
              ...challengeRatingFields,
              ...entry.fields.filter(
                (candidate) => candidate.label.toLowerCase() !== "challengerating",
              ),
            ],
          }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function withCreatureAbilityScoreFields(
  git: Buffer,
  abilityScoreFields: readonly SupportedGffField[],
): Buffer {
  const document = parseRawGffDocument(git)!;
  const labels = new Set(["str", "dex", "con", "int", "wis", "cha"]);
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") return field;
    return {
      ...field,
      value: field.value.map((entry, index) => index === 0
        ? {
            ...entry,
            fields: [
              ...abilityScoreFields,
              ...entry.fields.filter(
                (candidate) => !labels.has(candidate.label.toLowerCase()),
              ),
            ],
          }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function withCreatureAppearanceColorFields(
  git: Buffer,
  appearanceColorFields: readonly SupportedGffField[],
): Buffer {
  const document = parseRawGffDocument(git)!;
  const labels = new Set([
    "color_skin", "color_hair", "color_tattoo1", "color_tattoo2",
  ]);
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") return field;
    return {
      ...field,
      value: field.value.map((entry, index) => index === 0
        ? {
            ...entry,
            fields: [
              ...appearanceColorFields,
              ...entry.fields.filter(
                (candidate) => !labels.has(candidate.label.toLowerCase()),
              ),
            ],
          }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function withCreatureAppendageFields(
  git: Buffer,
  appendageFields: readonly SupportedGffField[],
): Buffer {
  const document = parseRawGffDocument(git)!;
  const labels = new Set(["wings_new", "wings", "tail_new", "tail"]);
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") return field;
    return {
      ...field,
      value: field.value.map((entry, index) => index === 0
        ? {
            ...entry,
            fields: [
              ...appendageFields,
              ...entry.fields.filter(
                (candidate) => !labels.has(candidate.label.toLowerCase()),
              ),
            ],
          }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function withCreatureHitPointFields(
  git: Buffer,
  hitPointFields: readonly SupportedGffField[],
): Buffer {
  const document = parseRawGffDocument(git)!;
  const labels = new Set([
    "hitpoints", "currenthitpoints", "maxhitpoints", "con", "race",
  ]);
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") return field;
    return {
      ...field,
      value: field.value.map((entry, index) => index === 0
        ? {
            ...entry,
            fields: [
              ...hitPointFields,
              ...entry.fields.filter(
                (candidate) => !labels.has(candidate.label.toLowerCase()),
              ),
            ],
          }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function withCreatureNaturalArmorClassFields(
  git: Buffer,
  naturalArmorClassFields: readonly SupportedGffField[],
): Buffer {
  const document = parseRawGffDocument(git)!;
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") return field;
    return {
      ...field,
      value: field.value.map((entry, index) => index === 0
        ? {
            ...entry,
            fields: [
              ...naturalArmorClassFields,
              ...entry.fields.filter(
                (candidate) => candidate.label.toLowerCase() !== "naturalac",
              ),
            ],
          }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function withCreatureSavingThrowBonusFields(
  git: Buffer,
  savingThrowFields: readonly SupportedGffField[],
): Buffer {
  const document = parseRawGffDocument(git)!;
  const labels = new Set(["refbonus", "willbonus", "fortbonus"]);
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") return field;
    return {
      ...field,
      value: field.value.map((entry, index) => index === 0
        ? {
            ...entry,
            fields: [
              ...savingThrowFields,
              ...entry.fields.filter(
                (candidate) => !labels.has(candidate.label.toLowerCase()),
              ),
            ],
          }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function withCreatureAlignmentFields(
  git: Buffer,
  alignmentFields: readonly SupportedGffField[],
): Buffer {
  const document = parseRawGffDocument(git)!;
  const labels = new Set(["goodevil", "lawfulchaotic"]);
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") return field;
    return {
      ...field,
      value: field.value.map((entry, index) => index === 0
        ? {
            ...entry,
            fields: [
              ...alignmentFields,
              ...entry.fields.filter(
                (candidate) => !labels.has(candidate.label.toLowerCase()),
              ),
            ],
          }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function withCreatureNameLocalizedStringFields(
  git: Buffer,
  nameFields: readonly SupportedGffField[],
): Buffer {
  const document = parseRawGffDocument(git)!;
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") return field;
    return {
      ...field,
      value: field.value.map((entry, index) => index === 0
        ? {
            ...entry,
            fields: [
              ...nameFields,
              ...entry.fields.filter((candidate) =>
                candidate.label.toLowerCase() !== "firstname" &&
                candidate.label.toLowerCase() !== "lastname"
              ),
            ],
          }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function creatureInventoryList(git: Buffer) {
  const creature = list(parseRawGffDocument(git), "Creature List")!.value[0]!;
  const inventory = creature.fields.find((field) => field.label === "ItemList");
  if (!inventory || inventory.type !== "list") {
    throw new Error("Expected Creature ItemList fixture.");
  }
  return inventory.value;
}

function creatureEquipmentSourceEntry(
  resRef: string,
  slotMask: number,
  dropable: boolean,
  pickpocketable: boolean,
  unknownValue: number,
): { typeId: number; fields: SupportedGffField[] } {
  return {
    typeId: slotMask,
    fields: [
      { label: "TemplateResRef", type: "resref", value: resRef },
      { label: "EquipmentProbe", type: "int", value: unknownValue },
      ...(dropable ? [{ label: "Dropable", type: "byte" as const, value: 1 }] : []),
      ...(pickpocketable
        ? [{ label: "Pickpocketable", type: "byte" as const, value: 1 }]
        : []),
    ],
  };
}

function creatureEquipmentProvenance(
  resRef: string,
  slotMask: number,
  sourceIndex: number,
  dropable: boolean,
  pickpocketable: boolean,
) {
  return { sourceIndex, resRef, slotMask, dropable, pickpocketable };
}

function withCreatureEquipment(
  git: Buffer,
  entries: Array<{ typeId: number; fields: SupportedGffField[] }>,
): Buffer {
  const document = parseRawGffDocument(git)!;
  const fields = document.fields.map((field) => {
    if (field.label !== "Creature List" || field.type !== "list") return field;
    return {
      ...field,
      value: field.value.map((entry, index) => index === 0
        ? {
            ...entry,
            fields: [
              ...entry.fields,
              { label: "Equip_ItemList", type: "list" as const, value: entries },
            ],
          }
        : entry),
    };
  });
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function creatureEquipmentList(git: Buffer) {
  const creature = list(parseRawGffDocument(git), "Creature List")!.value[0]!;
  const equipment = creature.fields.find((field) => field.label === "Equip_ItemList");
  if (!equipment || equipment.type !== "list") {
    throw new Error("Expected Creature Equip_ItemList fixture.");
  }
  return equipment.value;
}

function geometryPoint(x: number, y: number, z: number) {
  return {
    typeId: 3,
    fields: [
      { label: "PointX", type: "float" as const, value: x },
      { label: "PointY", type: "float" as const, value: y },
      { label: "PointZ", type: "float" as const, value: z },
    ],
  };
}

function encounterGeometryPoint(x: number, y: number, z: number) {
  return {
    typeId: 1,
    fields: [
      { label: "X", type: "float" as const, value: x },
      { label: "Y", type: "float" as const, value: y },
      { label: "Z", type: "float" as const, value: z },
    ],
  };
}

function list(document: ReturnType<typeof parseRawGffDocument>, label: string) {
  const field = document?.fields.find((candidate) => candidate.label === label);
  return field?.type === "list" ? field : undefined;
}

function waypointBlueprint(options: Readonly<{
  fileType?: string;
  rootType?: number;
}> = {}): Buffer {
  return buildGffBuffer(
    waypointBlueprintFields(),
    options.fileType ?? "UTW ",
    options.rootType ?? ROOT_TYPE,
  );
}

function waypointBlueprintFields(): SupportedGffField[] {
  return [
    { label: "Comment", type: "cexostring", value: "Patrol path waypoint." },
    { label: "Description", type: "cexolocstring", value: { strRef: 0xffffffff, entries: [] } },
    { label: "LinkedTo", type: "cexostring", value: "" },
    { label: "TemplateResRef", type: "resref", value: "nw_waypoint001" },
    { label: "LocalizedName", type: "cexolocstring", value: { strRef: 14817, entries: [] } },
    { label: "Tag", type: "cexostring", value: "NW_WAYPOINT001" },
    { label: "HasMapNote", type: "byte", value: 0 },
    { label: "PaletteID", type: "byte", value: 5 },
  ];
}

function withGffVersion(bytes: Buffer, version: string): Buffer {
  const copy = Buffer.from(bytes);
  copy.write(version, 4, 4, "ascii");
  return copy;
}

function wrongTypeField(
  label: string,
  expectedType: SupportedGffField["type"],
): SupportedGffField {
  return expectedType === "byte"
    ? { label, type: "cexostring", value: "wrong" }
    : { label, type: "byte", value: 1 };
}

function waypointAddition(
  blueprintBytes: Buffer,
  transform: Readonly<{ x: number; y: number; z: number; bearing: number }>,
) {
  return {
    kind: "waypoint" as const,
    localObjectId: "wpt_001",
    sourceProfileId: "nwn-base-key-utw-v1",
    templateResRef: "nw_waypoint001",
    resRef: "nw_waypoint001",
    tag: "NW_WAYPOINT001",
    sourceSha256: createHash("sha256").update(blueprintBytes).digest("hex"),
    blueprintBytes,
    ...transform,
  };
}

function soundBlueprint(): Buffer {
  return buildGffBuffer([
    { label: "Tag", type: "cexostring", value: "AnimalCriesDay" },
    { label: "LocName", type: "cexolocstring", value: { strRef: 67786, entries: [] } },
    { label: "TemplateResRef", type: "resref", value: "animalcriesday" },
    { label: "Active", type: "byte", value: 1 },
    { label: "Continuous", type: "byte", value: 1 },
    { label: "Looping", type: "byte", value: 0 },
    { label: "Positional", type: "byte", value: 1 },
    { label: "RandomPosition", type: "byte", value: 1 },
    { label: "Random", type: "byte", value: 1 },
    { label: "Elevation", type: "float", value: 1.5 },
    { label: "MaxDistance", type: "float", value: 10 },
    { label: "MinDistance", type: "float", value: 1 },
    { label: "RandomRangeX", type: "float", value: 10 },
    { label: "RandomRangeY", type: "float", value: 10 },
    { label: "Interval", type: "dword", value: 25000 },
    { label: "IntervalVrtn", type: "dword", value: 5000 },
    { label: "PitchVariation", type: "float", value: 0.2 },
    { label: "Priority", type: "byte", value: 18 },
    { label: "Hours", type: "dword", value: 0 },
    { label: "Times", type: "byte", value: 3 },
    { label: "Volume", type: "byte", value: 127 },
    { label: "VolumeVrtn", type: "byte", value: 0 },
    {
      label: "Sounds",
      type: "list",
      value: ["as_an_cryday1", "as_an_cryday2", "as_an_cryday3", "as_an_cryday4"].map((value) => ({
        typeId: 1243572,
        fields: [{ label: "Sound", type: "resref" as const, value }],
      })),
    },
    { label: "PaletteID", type: "byte", value: 6 },
    { label: "Comment", type: "cexostring", value: "" },
  ], "UTS ", ROOT_TYPE);
}

function soundAddition(
  blueprintBytes: Buffer,
  transform: Readonly<{ x: number; y: number; z: number; bearing: number }>,
) {
  return {
    kind: "sound" as const,
    localObjectId: "sou_001",
    sourceProfileId: "nwn-base-key-uts-animalcriesday-v1",
    templateResRef: "animalcriesday",
    resRef: "animalcriesday",
    tag: "AnimalCriesDay",
    sourceSha256: createHash("sha256").update(blueprintBytes).digest("hex"),
    blueprintBytes,
    ...transform,
  };
}

function placeableBlueprint(): Buffer {
  return buildGffBuffer([
    { label: "Ref", type: "byte", value: 0 },
    { label: "OnUsed", type: "resref", value: "" },
    { label: "Portrait", type: "resref", value: "po_plc_n02_" },
    { label: "KeyName", type: "cexostring", value: "" },
    { label: "OnUserDefined", type: "resref", value: "" },
    { label: "HasInventory", type: "byte", value: 0 },
    { label: "OnDamaged", type: "resref", value: "" },
    { label: "TemplateResRef", type: "resref", value: "plc_watertrough" },
    { label: "Faction", type: "dword", value: 1 },
    { label: "Locked", type: "byte", value: 0 },
    { label: "CloseLockDC", type: "byte", value: 0 },
    { label: "Appearance", type: "dword", value: 104 },
    { label: "OnOpen", type: "resref", value: "" },
    { label: "Tag", type: "cexostring", value: "Water Trough" },
    { label: "HP", type: "short", value: 15 },
    { label: "Description", type: "cexolocstring", value: { strRef: 14751, entries: [] } },
    { label: "TrapDetectable", type: "byte", value: 1 },
    { label: "PaletteID", type: "byte", value: 9 },
    { label: "OnClosed", type: "resref", value: "" },
    { label: "Conversation", type: "resref", value: "" },
    { label: "DisarmDC", type: "byte", value: 15 },
    { label: "OnMeleeAttacked", type: "resref", value: "" },
    { label: "Hardness", type: "byte", value: 5 },
    { label: "LocName", type: "cexolocstring", value: { strRef: 5747, entries: [] } },
    { label: "KeyRequired", type: "byte", value: 0 },
    { label: "AnimationState", type: "byte", value: 0 },
    { label: "CurrentHP", type: "short", value: 15 },
    { label: "TrapOneShot", type: "byte", value: 1 },
    { label: "Interruptable", type: "byte", value: 1 },
    { label: "OnLock", type: "resref", value: "" },
    { label: "OnTrapTriggered", type: "resref", value: "" },
    { label: "Type", type: "byte", value: 0 },
    { label: "Useable", type: "byte", value: 0 },
    { label: "TrapType", type: "byte", value: 0 },
    { label: "OnDeath", type: "resref", value: "" },
    { label: "OnUnlock", type: "resref", value: "" },
    { label: "Comment", type: "cexostring", value: "Water Trough" },
    { label: "TrapDisarmable", type: "byte", value: 1 },
    { label: "Lockable", type: "byte", value: 0 },
    { label: "OnHeartbeat", type: "resref", value: "" },
    { label: "OpenLockDC", type: "byte", value: 18 },
    { label: "TrapDetectDC", type: "byte", value: 0 },
    { label: "OnSpellCastAt", type: "resref", value: "" },
    { label: "Fort", type: "byte", value: 16 },
    { label: "Will", type: "byte", value: 0 },
    { label: "OnInvDisturbed", type: "resref", value: "" },
    { label: "TrapFlag", type: "byte", value: 0 },
    { label: "AutoRemoveKey", type: "byte", value: 0 },
    { label: "Plot", type: "byte", value: 0 },
    { label: "OnDisarm", type: "resref", value: "" },
  ], "UTP ", ROOT_TYPE);
}

function itemBlueprint(): Buffer {
  return buildGffBuffer([
    { label: "BaseItem", type: "int", value: 16 },
    { label: "StackSize", type: "word", value: 1 },
    { label: "ArmorPart_Pelvis", type: "byte", value: 3 },
    { label: "Stolen", type: "byte", value: 0 },
    { label: "LocalizedName", type: "cexolocstring", value: { strRef: 12923, entries: [] } },
    { label: "ArmorPart_RShoul", type: "byte", value: 0 },
    { label: "ArmorPart_LThigh", type: "byte", value: 3 },
    { label: "ArmorPart_Belt", type: "byte", value: 0 },
    { label: "Description", type: "cexolocstring", value: { strRef: 0xffffffff, entries: [] } },
    { label: "ArmorPart_RThigh", type: "byte", value: 3 },
    { label: "ArmorPart_LHand", type: "byte", value: 1 },
    { label: "Cost", type: "dword", value: 1 },
    { label: "ArmorPart_RFoot", type: "byte", value: 6 },
    { label: "ArmorPart_LShoul", type: "byte", value: 0 },
    { label: "DescIdentified", type: "cexolocstring", value: { strRef: 0xffffffff, entries: [] } },
    { label: "ArmorPart_LShin", type: "byte", value: 16 },
    { label: "Leather2Color", type: "byte", value: 14 },
    { label: "ArmorPart_RHand", type: "byte", value: 1 },
    { label: "PropertiesList", type: "list", value: [] },
    { label: "ArmorPart_Torso", type: "byte", value: 39 },
    { label: "Tag", type: "cexostring", value: "NW_CLOTH022" },
    { label: "Leather1Color", type: "byte", value: 11 },
    { label: "Cloth1Color", type: "byte", value: 11 },
    { label: "PaletteID", type: "byte", value: 5 },
    { label: "Comment", type: "cexostring", value: "1" },
    { label: "TemplateResRef", type: "resref", value: "nw_cloth022" },
    { label: "Charges", type: "byte", value: 0 },
    { label: "Identified", type: "byte", value: 1 },
    { label: "ArmorPart_RShin", type: "byte", value: 16 },
    { label: "Plot", type: "byte", value: 0 },
    { label: "ArmorPart_Neck", type: "byte", value: 1 },
    { label: "ArmorPart_LFoot", type: "byte", value: 6 },
    { label: "Cloth2Color", type: "byte", value: 7 },
    { label: "Metal1Color", type: "byte", value: 23 },
    { label: "AddCost", type: "dword", value: 0 },
    { label: "ArmorPart_RBicep", type: "byte", value: 1 },
    { label: "ArmorPart_RFArm", type: "byte", value: 1 },
    { label: "ArmorPart_LFArm", type: "byte", value: 1 },
    { label: "ArmorPart_LBicep", type: "byte", value: 1 },
    { label: "Metal2Color", type: "byte", value: 6 },
  ], "UTI ", ROOT_TYPE);
}

function miscItemBlueprint(templateResRef: string, modelPart1: number): Buffer {
  const isEleven = templateResRef === "nw_it_msmlmisc11";
  return buildGffBuffer([
    { label: "PaletteID", type: "byte", value: isEleven ? 23 : 54 },
    { label: "BaseItem", type: "int", value: 24 },
    { label: "PropertiesList", type: "list", value: [] },
    { label: "StackSize", type: "word", value: 1 },
    { label: "Cost", type: "dword", value: isEleven ? 10 : 0 },
    { label: "LocalizedName", type: "cexolocstring", value: { strRef: isEleven ? 13493 : 13494, entries: [] } },
    { label: "ModelPart1", type: "byte", value: modelPart1 },
    { label: "TemplateResRef", type: "resref", value: templateResRef },
    { label: "Comment", type: "cexostring", value: "1" },
    { label: "DescIdentified", type: "cexolocstring", value: { strRef: isEleven ? 58565 : 58566, entries: [] } },
    { label: "Tag", type: "cexostring", value: templateResRef.toUpperCase() },
    { label: "Charges", type: "byte", value: 0 },
    { label: "Description", type: "cexolocstring", value: { strRef: 0xffffffff, entries: [] } },
    { label: "Stolen", type: "byte", value: 0 },
    { label: "AddCost", type: "dword", value: isEleven ? 10 : 0 },
    { label: "Plot", type: "byte", value: 0 },
    { label: "Identified", type: "byte", value: 1 },
  ], "UTI ", ROOT_TYPE);
}

function dynamicPlaceableInventoryBlueprint(
  templateResRef: string,
  tag: string,
  entries: readonly Readonly<{ inventoryRes: string; x: number; y: number }>[],
): Buffer {
  const source = parseRawGffDocument(placeableBlueprint())!;
  return buildGffBuffer([
    ...source.fields
      .filter((field) => !["TemplateResRef", "Tag", "ItemList"].includes(field.label)),
    { label: "TemplateResRef", type: "resref", value: templateResRef },
    { label: "Tag", type: "cexostring", value: tag },
    {
      label: "ItemList",
      type: "list",
      value: entries.map((entry, sourceIndex) => ({
        typeId: sourceIndex,
        fields: [
          { label: "InventoryRes", type: "resref" as const, value: entry.inventoryRes },
          { label: "Repos_PosX", type: "word" as const, value: entry.x },
          { label: "Repos_Posy", type: "word" as const, value: entry.y },
        ],
      })),
    },
  ], "UTP ", ROOT_TYPE);
}

function dynamicInventoryPlaceableAddition(
  blueprintBytes: Buffer,
  templateResRef: string,
  tag: string,
  dependencies: readonly Readonly<{ templateResRef: string; bytes: Buffer; sha256?: string }>[],
) {
  return {
    ...placeableAddition(blueprintBytes, { x: 0, y: 0, z: 0, bearing: 0 }),
    sourceProfileId: "effective-catalog-utp-placeable-copy-v1",
    sourceObjectKey: `modules/current/__aurora/sources/vanilla/templates/${templateResRef}.utp`,
    templateResRef,
    resRef: templateResRef,
    tag,
    resolvedPortraitId: 462,
    blueprintDependencies: dependencies.map((dependency) => ({
      templateResRef: dependency.templateResRef,
      resourceType: 2025,
      sha256: dependency.sha256 ?? createHash("sha256").update(dependency.bytes).digest("hex"),
      bytes: dependency.bytes,
    })),
  };
}

function itemAddition(
  blueprintBytes: Buffer,
  transform: Readonly<{ x: number; y: number; z: number; bearing: number }>,
) {
  return {
    kind: "item" as const,
    localObjectId: "itm_001",
    sourceProfileId: "nwn-base-key-uti-nw-cloth022-v1",
    templateResRef: "nw_cloth022",
    resRef: "nw_cloth022",
    tag: "NW_CLOTH022",
    sourceSha256: createHash("sha256").update(blueprintBytes).digest("hex"),
    blueprintBytes,
    ...transform,
  };
}

function placeableAddition(
  blueprintBytes: Buffer,
  transform: Readonly<{ x: number; y: number; z: number; bearing: number }>,
) {
  return {
    kind: "placeable" as const,
    localObjectId: "pla_001",
    sourceProfileId: "nwn-base-key-utp-plc-watertrough-v1",
    templateResRef: "plc_watertrough",
    resRef: "plc_watertrough",
    tag: "WaterTrough",
    sourceSha256: createHash("sha256").update(blueprintBytes).digest("hex"),
    blueprintBytes,
    ...transform,
  };
}

function mutateItemBlueprintField(label: string, replacement: SupportedGffField): Buffer {
  const document = parseRawGffDocument(itemBlueprint())!;
  return buildGffBuffer(
    document.fields.map((field) => field.label === label ? replacement : field),
    "UTI ",
    document.rootStructTypeId,
  );
}

function mutatePlaceableBlueprintField(label: string, replacement: SupportedGffField): Buffer {
  const document = parseRawGffDocument(placeableBlueprint())!;
  return buildGffBuffer(
    document.fields.map((field) => field.label === label ? replacement : field),
    "UTP ",
    document.rootStructTypeId,
  );
}

function mutateSoundBlueprintField(label: string, replacement: SupportedGffField): Buffer {
  const document = parseRawGffDocument(soundBlueprint())!;
  return buildGffBuffer(
    document.fields.map((field) => field.label === label ? replacement : field),
    "UTS ",
    document.rootStructTypeId,
  );
}

function capitalize(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function replaceUniqueBytes(source: Buffer, needle: Buffer, replacement: Buffer): Buffer {
  expect(replacement.length).toBe(needle.length);
  const first = source.indexOf(needle);
  expect(first).toBeGreaterThanOrEqual(0);
  expect(source.indexOf(needle, first + 1)).toBe(-1);
  const result = Buffer.from(source);
  replacement.copy(result, first);
  return result;
}

function pairError(action: () => unknown): AreaObjectPairMutationError {
  try {
    action();
  } catch (error) {
    if (error instanceof AreaObjectPairMutationError) return error;
    throw error;
  }
  throw new Error("Expected paired Area object operation to fail.");
}
