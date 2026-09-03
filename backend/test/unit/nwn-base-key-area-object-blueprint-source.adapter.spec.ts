import { Test } from "@nestjs/testing";
import { createHash } from "node:crypto";
import { NwnBaseKeyAreaObjectBlueprintSourceAdapter } from "../../src/modules/areas/adapters/outbound/blob/nwn-base-key-area-object-blueprint-source.adapter";
import { AreaObjectBlueprintSourceError } from "../../src/modules/areas/application/ports/area-object-blueprint-source.port";
import { RuntimeSettingsApplicationService } from "../../src/modules/runtime-settings/application/runtime-settings.application.service";
import { AREA_WAYPOINT_CONSTRUCTION_PROFILE } from "../../src/modules/areas/domain/area-waypoint-construction-profile";
import { AREA_SOUND_CONSTRUCTION_PROFILE } from "../../src/modules/areas/domain/area-sound-construction-profile";
import { AREA_PLACEABLE_CONSTRUCTION_PROFILE } from "../../src/modules/areas/domain/area-placeable-construction-profile";
import { AREA_ITEM_CONSTRUCTION_PROFILE } from "../../src/modules/areas/domain/area-item-construction-profile";
import { AREA_CREATURE_CONSTRUCTION_PROFILE } from "../../src/modules/areas/domain/area-creature-construction-profile";
import { AREA_STORE_CONSTRUCTION_PROFILE } from "../../src/modules/areas/domain/area-store-construction-profile";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import {
  storeBlueprintDependencyFixtures,
  storeBlueprintFixture,
  storeBlueprintFields,
} from "../support/area-store-construction-fixture";

const profile = AREA_WAYPOINT_CONSTRUCTION_PROFILE;
const request = Object.freeze({
  sourceKind: profile.sourceKind,
  sourceProfileId: profile.id,
  templateResRef: profile.templateResRef,
  expectedSha256: profile.sourceSha256,
});

describe("NwnBaseKeyAreaObjectBlueprintSourceAdapter", () => {
  it("boots through Nest with default source dependencies", async () => {
    const module = await Test.createTestingModule({
      providers: [
        NwnBaseKeyAreaObjectBlueprintSourceAdapter,
        {
          provide: RuntimeSettingsApplicationService,
          useValue: { getRuntimeSettings: jest.fn() },
        },
      ],
    }).compile();

    expect(module.get(NwnBaseKeyAreaObjectBlueprintSourceAdapter)).toBeInstanceOf(
      NwnBaseKeyAreaObjectBlueprintSourceAdapter,
    );
  });

  it("rejects an unadmitted profile before reading runtime settings", async () => {
    const runtimeSettings = {
      getRuntimeSettings: jest.fn(),
    } as unknown as jest.Mocked<RuntimeSettingsApplicationService>;
    const adapter = new NwnBaseKeyAreaObjectBlueprintSourceAdapter(runtimeSettings);

    await expect(adapter.resolve({
      sourceKind: "waypoint",
      sourceProfileId: "custom-utw",
      templateResRef: AREA_WAYPOINT_CONSTRUCTION_PROFILE.templateResRef,
      expectedSha256: AREA_WAYPOINT_CONSTRUCTION_PROFILE.sourceSha256,
    })).rejects.toMatchObject({
      code: "AREA_OBJECT_BLUEPRINT_SOURCE_INVALID",
      message: "Waypoint blueprint provenance is outside the admitted immutable profile.",
      diagnostics: ["profile_or_identity_mismatch"],
    });
    expect(runtimeSettings.getRuntimeSettings).not.toHaveBeenCalled();
  });

  it.each([
    ["source profile", { ...request, sourceProfileId: "custom-utw" }],
    ["template ResRef", { ...request, templateResRef: "nw_waypoint002" }],
    ["expected SHA-256", { ...request, expectedSha256: "f".repeat(64) }],
  ])("rejects a mismatched %s independently", async (_label, input) => {
    const runtimeSettings = {
      getRuntimeSettings: jest.fn(),
    } as unknown as jest.Mocked<RuntimeSettingsApplicationService>;
    const openReader = jest.fn();
    const adapter = new NwnBaseKeyAreaObjectBlueprintSourceAdapter(runtimeSettings, {
      openReader,
      sha256: jest.fn(),
    });

    await expect(adapter.resolve(input)).rejects.toBeInstanceOf(
      AreaObjectBlueprintSourceError,
    );
    expect(runtimeSettings.getRuntimeSettings).not.toHaveBeenCalled();
    expect(openReader).not.toHaveBeenCalled();
  });

  it("reads the exact UTW resource and returns a defensive byte copy", async () => {
    const vanillaDataPath = "C:/NWN/data";
    const sourceBytes = Buffer.from("verified-waypoint-blueprint");
    const read = jest.fn(async () => sourceBytes);
    const openReader = jest.fn(async () => ({ read }));
    const sha256 = jest.fn(() => profile.sourceSha256);
    const runtimeSettings = {
      getRuntimeSettings: jest.fn(async () => ({
        paths: { vanillaDataPath: `  ${vanillaDataPath}  ` },
      })),
    } as unknown as jest.Mocked<RuntimeSettingsApplicationService>;
    const adapter = new NwnBaseKeyAreaObjectBlueprintSourceAdapter(runtimeSettings, {
      openReader: openReader as never,
      sha256,
    });

    const result = await adapter.resolve(request);

    expect(openReader).toHaveBeenCalledWith(
      "C:\\NWN\\data\\nwn_base.key",
      vanillaDataPath,
    );
    expect(read).toHaveBeenCalledWith(profile.templateResRef, profile.resourceType);
    expect(sha256).toHaveBeenCalledWith(sourceBytes);
    expect(result).toEqual({
      sourceProfileId: profile.id,
      sourceKind: "waypoint",
      templateResRef: profile.templateResRef,
      sha256: profile.sourceSha256,
      bytes: sourceBytes,
    });
    expect(result.bytes).not.toBe(sourceBytes);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("distinguishes a missing resource from source-reader failure", async () => {
    const runtimeSettings = {
      getRuntimeSettings: jest.fn(async () => ({ paths: { vanillaDataPath: "C:/NWN/data" } })),
    } as unknown as jest.Mocked<RuntimeSettingsApplicationService>;
    const adapter = new NwnBaseKeyAreaObjectBlueprintSourceAdapter(runtimeSettings, {
      openReader: jest.fn(async () => ({ read: jest.fn(async () => null) })) as never,
      sha256: jest.fn(),
    });

    await expect(adapter.resolve(request)).rejects.toMatchObject({
      code: "AREA_OBJECT_BLUEPRINT_SOURCE_UNAVAILABLE",
      message: "The configured immutable waypoint blueprint resource is unavailable.",
      diagnostics: ["waypoint_resource_unavailable"],
    });
  });

  it("rejects bytes whose computed digest differs from the admitted source", async () => {
    const runtimeSettings = {
      getRuntimeSettings: jest.fn(async () => ({ paths: { vanillaDataPath: "C:/NWN/data" } })),
    } as unknown as jest.Mocked<RuntimeSettingsApplicationService>;
    const adapter = new NwnBaseKeyAreaObjectBlueprintSourceAdapter(runtimeSettings, {
      openReader: jest.fn(async () => ({ read: jest.fn(async () => Buffer.from("wrong")) })) as never,
      sha256: jest.fn(() => "f".repeat(64)),
    });

    await expect(adapter.resolve(request)).rejects.toMatchObject({
      code: "AREA_OBJECT_BLUEPRINT_SOURCE_INVALID",
      message: "The configured waypoint blueprint bytes differ from the admitted immutable source.",
      diagnostics: ["source_sha256_mismatch"],
    });
  });

  it("treats an empty configured vanilla root as source unavailability", async () => {
    const runtimeSettings = {
      getRuntimeSettings: jest.fn(async () => ({ paths: { vanillaDataPath: "   " } })),
    } as unknown as jest.Mocked<RuntimeSettingsApplicationService>;
    const openReader = jest.fn();
    const adapter = new NwnBaseKeyAreaObjectBlueprintSourceAdapter(runtimeSettings, {
      openReader,
      sha256: jest.fn(),
    });

    await expect(adapter.resolve(request)).rejects.toMatchObject({
      code: "AREA_OBJECT_BLUEPRINT_SOURCE_UNAVAILABLE",
      diagnostics: ["nwn_base_key_unavailable"],
    });
    expect(openReader).not.toHaveBeenCalled();
  });

  it("maps source I/O failure to bounded diagnostics without exposing the host path", async () => {
    const sensitivePath = "Z:/sensitive/private/Neverwinter Nights/data";
    const runtimeSettings = {
      getRuntimeSettings: jest.fn(async () => ({
        paths: { vanillaDataPath: sensitivePath },
      })),
    } as unknown as jest.Mocked<RuntimeSettingsApplicationService>;
    const adapter = new NwnBaseKeyAreaObjectBlueprintSourceAdapter(runtimeSettings);

    let failure: AreaObjectBlueprintSourceError | undefined;
    try {
      await adapter.resolve({
        sourceKind: "waypoint",
        sourceProfileId: AREA_WAYPOINT_CONSTRUCTION_PROFILE.id,
        templateResRef: AREA_WAYPOINT_CONSTRUCTION_PROFILE.templateResRef,
        expectedSha256: AREA_WAYPOINT_CONSTRUCTION_PROFILE.sourceSha256,
      });
    } catch (error) {
      failure = error as AreaObjectBlueprintSourceError;
    }

    expect(failure).toMatchObject({
      code: "AREA_OBJECT_BLUEPRINT_SOURCE_UNAVAILABLE",
      message: "The configured immutable waypoint blueprint source is unavailable.",
      diagnostics: ["nwn_base_key_unavailable"],
    });
    expect(JSON.stringify(failure)).not.toContain(sensitivePath);
    expect(failure?.message).not.toContain(sensitivePath);
  });

  it("resolves the exact admitted UTS sound resource through the same generic port", async () => {
    const soundProfile = AREA_SOUND_CONSTRUCTION_PROFILE;
    const sourceBytes = Buffer.from("verified-sound-blueprint");
    const read = jest.fn(async () => sourceBytes);
    const runtimeSettings = {
      getRuntimeSettings: jest.fn(async () => ({ paths: { vanillaDataPath: "C:/NWN/data" } })),
    } as unknown as jest.Mocked<RuntimeSettingsApplicationService>;
    const adapter = new NwnBaseKeyAreaObjectBlueprintSourceAdapter(runtimeSettings, {
      openReader: jest.fn(async () => ({ read })) as never,
      sha256: jest.fn(() => soundProfile.sourceSha256),
    });

    await expect(adapter.resolve({
      sourceKind: "sound",
      sourceProfileId: soundProfile.id,
      templateResRef: soundProfile.templateResRef,
      expectedSha256: soundProfile.sourceSha256,
    })).resolves.toEqual({
      sourceKind: "sound",
      sourceProfileId: soundProfile.id,
      templateResRef: soundProfile.templateResRef,
      sha256: soundProfile.sourceSha256,
      bytes: sourceBytes,
    });
    expect(read).toHaveBeenCalledWith(soundProfile.templateResRef, soundProfile.resourceType);
  });

  it("resolves the exact admitted UTP placeable resource through the same generic port", async () => {
    const placeableProfile = AREA_PLACEABLE_CONSTRUCTION_PROFILE;
    const sourceBytes = Buffer.from("verified-placeable-blueprint");
    const read = jest.fn(async () => sourceBytes);
    const runtimeSettings = {
      getRuntimeSettings: jest.fn(async () => ({ paths: { vanillaDataPath: "C:/NWN/data" } })),
    } as unknown as jest.Mocked<RuntimeSettingsApplicationService>;
    const adapter = new NwnBaseKeyAreaObjectBlueprintSourceAdapter(runtimeSettings, {
      openReader: jest.fn(async () => ({ read })) as never,
      sha256: jest.fn(() => placeableProfile.sourceSha256),
    });

    await expect(adapter.resolve({
      sourceKind: "placeable",
      sourceProfileId: placeableProfile.id,
      templateResRef: placeableProfile.templateResRef,
      expectedSha256: placeableProfile.sourceSha256,
    })).resolves.toEqual({
      sourceKind: "placeable",
      sourceProfileId: placeableProfile.id,
      templateResRef: placeableProfile.templateResRef,
      sha256: placeableProfile.sourceSha256,
      bytes: sourceBytes,
    });
    expect(read).toHaveBeenCalledWith(placeableProfile.templateResRef, placeableProfile.resourceType);
  });

  it("resolves the exact admitted UTI ground-item resource through the same generic port", async () => {
    const itemProfile = AREA_ITEM_CONSTRUCTION_PROFILE;
    const sourceBytes = Buffer.from("verified-item-blueprint");
    const read = jest.fn(async () => sourceBytes);
    const runtimeSettings = {
      getRuntimeSettings: jest.fn(async () => ({ paths: { vanillaDataPath: "C:/NWN/data" } })),
    } as unknown as jest.Mocked<RuntimeSettingsApplicationService>;
    const adapter = new NwnBaseKeyAreaObjectBlueprintSourceAdapter(runtimeSettings, {
      openReader: jest.fn(async () => ({ read })) as never,
      sha256: jest.fn(() => itemProfile.sourceSha256),
    });

    await expect(adapter.resolve({
      sourceKind: itemProfile.sourceKind,
      sourceProfileId: itemProfile.id,
      templateResRef: itemProfile.templateResRef,
      expectedSha256: itemProfile.sourceSha256,
    })).resolves.toEqual({
      sourceKind: "item",
      sourceProfileId: itemProfile.id,
      templateResRef: itemProfile.templateResRef,
      sha256: itemProfile.sourceSha256,
      bytes: sourceBytes,
    });
    expect(read).toHaveBeenCalledWith(itemProfile.templateResRef, itemProfile.resourceType);
  });

  it("resolves the exact admitted UTC creature resource through the same generic port", async () => {
    const creatureProfile = AREA_CREATURE_CONSTRUCTION_PROFILE;
    const sourceBytes = Buffer.from("verified-creature-blueprint");
    const read = jest.fn(async () => sourceBytes);
    const runtimeSettings = {
      getRuntimeSettings: jest.fn(async () => ({ paths: { vanillaDataPath: "C:/NWN/data" } })),
    } as unknown as jest.Mocked<RuntimeSettingsApplicationService>;
    const adapter = new NwnBaseKeyAreaObjectBlueprintSourceAdapter(runtimeSettings, {
      openReader: jest.fn(async () => ({ read })) as never,
      sha256: jest.fn(() => creatureProfile.sourceSha256),
    });

    await expect(adapter.resolve({
      sourceKind: creatureProfile.sourceKind,
      sourceProfileId: creatureProfile.id,
      templateResRef: creatureProfile.templateResRef,
      expectedSha256: creatureProfile.sourceSha256,
    })).resolves.toEqual({
      sourceKind: "creature",
      sourceProfileId: creatureProfile.id,
      templateResRef: creatureProfile.templateResRef,
      sha256: creatureProfile.sourceSha256,
      bytes: sourceBytes,
    });
    expect(read).toHaveBeenCalledWith(creatureProfile.templateResRef, creatureProfile.resourceType);
  });

  it("resolves the exact admitted UTM store resource through the same generic port", async () => {
    const storeProfile = AREA_STORE_CONSTRUCTION_PROFILE;
    const sourceBytes = storeBlueprintFixture();
    const dependencies = storeBlueprintDependencyFixtures();
    const byResref = new Map<string, Buffer>(
      dependencies.map((dependency) => [dependency.templateResRef, dependency.bytes]),
    );
    const read = jest.fn(async (resref: string, resourceType: number) =>
      resref === storeProfile.templateResRef && resourceType === storeProfile.resourceType
        ? sourceBytes
        : byResref.get(resref) ?? null);
    const runtimeSettings = {
      getRuntimeSettings: jest.fn(async () => ({ paths: { vanillaDataPath: "C:/NWN/data" } })),
    } as unknown as jest.Mocked<RuntimeSettingsApplicationService>;
    const adapter = new NwnBaseKeyAreaObjectBlueprintSourceAdapter(runtimeSettings, {
      openReader: jest.fn(async () => ({ read })) as never,
      sha256: jest.fn((bytes) => createHash("sha256").update(bytes).digest("hex")),
    });

    await expect(adapter.resolve({
      sourceKind: storeProfile.sourceKind,
      sourceProfileId: storeProfile.id,
      templateResRef: storeProfile.templateResRef,
      expectedSha256: storeProfile.sourceSha256,
    })).resolves.toEqual({
      sourceKind: "store",
      sourceProfileId: storeProfile.id,
      templateResRef: storeProfile.templateResRef,
      sha256: storeProfile.sourceSha256,
      bytes: sourceBytes,
      dependencies,
    });
    expect(read).toHaveBeenCalledWith(storeProfile.templateResRef, storeProfile.resourceType);
    expect(read).toHaveBeenCalledTimes(56);
  });

  it("reports an unavailable store inventory dependency separately from the root UTM", async () => {
    const sourceBytes = storeBlueprintFixture();
    const dependencies = storeBlueprintDependencyFixtures();
    const byResref = new Map<string, Buffer>(
      dependencies.slice(1).map((dependency) => [dependency.templateResRef, dependency.bytes]),
    );
    const adapter = new NwnBaseKeyAreaObjectBlueprintSourceAdapter({
      getRuntimeSettings: jest.fn(async () => ({ paths: { vanillaDataPath: "C:/NWN/data" } })),
    } as unknown as jest.Mocked<RuntimeSettingsApplicationService>, {
      openReader: jest.fn(async () => ({
        read: async (resref: string, resourceType: number) =>
          resref === AREA_STORE_CONSTRUCTION_PROFILE.templateResRef &&
          resourceType === AREA_STORE_CONSTRUCTION_PROFILE.resourceType
            ? sourceBytes
            : byResref.get(resref) ?? null,
      })) as never,
      sha256: (bytes) => createHash("sha256").update(bytes).digest("hex"),
    });

    await expect(adapter.resolve({
      sourceKind: AREA_STORE_CONSTRUCTION_PROFILE.sourceKind,
      sourceProfileId: AREA_STORE_CONSTRUCTION_PROFILE.id,
      templateResRef: AREA_STORE_CONSTRUCTION_PROFILE.templateResRef,
      expectedSha256: AREA_STORE_CONSTRUCTION_PROFILE.sourceSha256,
    })).rejects.toMatchObject({
      code: "AREA_OBJECT_BLUEPRINT_SOURCE_UNAVAILABLE",
      diagnostics: ["store_dependency_unavailable"],
    });
  });

  it("reports a thrown store dependency read separately from an invalid manifest", async () => {
    const adapter = storeAdapterForBlueprint(storeBlueprintFixture(), { rejectDependency: true });

    await expect(resolveStore(adapter)).rejects.toMatchObject({
      code: "AREA_OBJECT_BLUEPRINT_SOURCE_UNAVAILABLE",
      message: "One or more immutable store inventory blueprint dependencies are unavailable.",
      diagnostics: ["store_dependency_unavailable"],
    });
  });

  it.each([
    ["unparseable root", () => Buffer.from("not-a-gff")],
    ["missing StoreList", () => buildGffBuffer(storeBlueprintFields().filter((field) => field.label !== "StoreList"), "UTM ", 0xffffffff)],
    ["duplicate StoreList", () => {
      const fields = storeBlueprintFields();
      fields.push(fields[14]!);
      return buildGffBuffer(fields, "UTM ", 0xffffffff);
    }],
    ["wrong StoreList type", () => {
      const fields = storeBlueprintFields();
      fields[14] = { label: "StoreList", type: "cexostring", value: "12345" };
      return buildGffBuffer(fields, "UTM ", 0xffffffff);
    }],
    ["wrong StoreList bucket count", () => {
      const fields = storeBlueprintFields();
      (fields[14] as Extract<SupportedGffField, { type: "list" }>).value.pop();
      return buildGffBuffer(fields, "UTM ", 0xffffffff);
    }],
    ["extra merchandise field", () => {
      const fields = storeBlueprintFields();
      (fields[14] as Extract<SupportedGffField, { type: "list" }>).value[4]!.fields.push({ label: "Drift", type: "int", value: 0 });
      return buildGffBuffer(fields, "UTM ", 0xffffffff);
    }],
    ["missing ItemList", () => {
      const fields = storeBlueprintFields();
      (fields[14] as Extract<SupportedGffField, { type: "list" }>).value[4]!.fields = [];
      return buildGffBuffer(fields, "UTM ", 0xffffffff);
    }],
    ["wrong ItemList label", () => {
      const fields = storeBlueprintFields();
      const merchandise = (fields[14] as Extract<SupportedGffField, { type: "list" }>).value[4]!;
      merchandise.fields[0] = { ...merchandise.fields[0]!, label: "WrongList" } as SupportedGffField;
      return buildGffBuffer(fields, "UTM ", 0xffffffff);
    }],
    ["duplicate ItemList", () => {
      const fields = storeBlueprintFields();
      const merchandise = (fields[14] as Extract<SupportedGffField, { type: "list" }>).value[4]!;
      merchandise.fields.push(merchandise.fields[0]!);
      return buildGffBuffer(fields, "UTM ", 0xffffffff);
    }],
    ["wrong ItemList type", () => {
      const fields = storeBlueprintFields();
      (fields[14] as Extract<SupportedGffField, { type: "list" }>).value[4]!.fields[0] = { label: "ItemList", type: "cexostring", value: "x".repeat(55) };
      return buildGffBuffer(fields, "UTM ", 0xffffffff);
    }],
    ["wrong ItemList count", () => {
      const fields = storeBlueprintFields();
      const itemList = (fields[14] as Extract<SupportedGffField, { type: "list" }>).value[4]!.fields[0] as Extract<SupportedGffField, { type: "list" }>;
      itemList.value.pop();
      return buildGffBuffer(fields, "UTM ", 0xffffffff);
    }],
    ["missing InventoryRes", () => {
      const fields = storeBlueprintFields();
      const itemList = (fields[14] as Extract<SupportedGffField, { type: "list" }>).value[4]!.fields[0] as Extract<SupportedGffField, { type: "list" }>;
      itemList.value[0]!.fields = itemList.value[0]!.fields.filter((field) => field.label !== "InventoryRes");
      return buildGffBuffer(fields, "UTM ", 0xffffffff);
    }],
    ["duplicate InventoryRes", () => {
      const fields = storeBlueprintFields();
      const itemList = (fields[14] as Extract<SupportedGffField, { type: "list" }>).value[4]!.fields[0] as Extract<SupportedGffField, { type: "list" }>;
      itemList.value[0]!.fields.push({ label: "InventoryRes", type: "resref", value: "x2_it_dyec23" });
      return buildGffBuffer(fields, "UTM ", 0xffffffff);
    }],
    ["wrong InventoryRes type", () => {
      const fields = storeBlueprintFields();
      const itemList = (fields[14] as Extract<SupportedGffField, { type: "list" }>).value[4]!.fields[0] as Extract<SupportedGffField, { type: "list" }>;
      itemList.value[0]!.fields[0] = { label: "InventoryRes", type: "cexostring", value: "x2_it_dyec23" };
      return buildGffBuffer(fields, "UTM ", 0xffffffff);
    }],
  ] as const)("fails closed on a store dependency manifest with %s", async (_label, buildBlueprint) => {
    const adapter = storeAdapterForBlueprint(buildBlueprint());

    await expect(resolveStore(adapter)).rejects.toMatchObject({
      code: "AREA_OBJECT_BLUEPRINT_SOURCE_INVALID",
      message: "The configured store blueprint dependency manifest is invalid.",
      diagnostics: ["store_dependency_manifest_invalid"],
    });
  });

  it("rejects a store dependency set whose ordered aggregate differs", async () => {
    const sourceBytes = storeBlueprintFixture();
    const dependencies = storeBlueprintDependencyFixtures();
    const byResref = new Map<string, Buffer>(
      dependencies.map((dependency) => [dependency.templateResRef, dependency.bytes]),
    );
    let hashIndex = 0;
    const adapter = new NwnBaseKeyAreaObjectBlueprintSourceAdapter({
      getRuntimeSettings: jest.fn(async () => ({ paths: { vanillaDataPath: "C:/NWN/data" } })),
    } as unknown as jest.Mocked<RuntimeSettingsApplicationService>, {
      openReader: jest.fn(async () => ({
        read: async (resref: string) => resref === AREA_STORE_CONSTRUCTION_PROFILE.templateResRef
          ? sourceBytes
          : byResref.get(resref) ?? null,
      })) as never,
      sha256: jest.fn((bytes) => {
        hashIndex += 1;
        return hashIndex === 2
          ? "f".repeat(64)
          : createHash("sha256").update(bytes).digest("hex");
      }),
    });

    await expect(adapter.resolve({
      sourceKind: AREA_STORE_CONSTRUCTION_PROFILE.sourceKind,
      sourceProfileId: AREA_STORE_CONSTRUCTION_PROFILE.id,
      templateResRef: AREA_STORE_CONSTRUCTION_PROFILE.templateResRef,
      expectedSha256: AREA_STORE_CONSTRUCTION_PROFILE.sourceSha256,
    })).rejects.toMatchObject({
      code: "AREA_OBJECT_BLUEPRINT_SOURCE_INVALID",
      diagnostics: ["store_dependency_set_sha256_mismatch"],
    });
  });

  it.each([
    ["source profile", { sourceProfileId: "custom-utm" }],
    ["template ResRef", { templateResRef: "x2_merc_other" }],
    ["expected SHA-256", { expectedSha256: "f".repeat(64) }],
  ])("rejects a store request with a mismatched %s before source I/O", async (_label, patch) => {
    const runtimeSettings = { getRuntimeSettings: jest.fn() } as unknown as jest.Mocked<RuntimeSettingsApplicationService>;
    const openReader = jest.fn();
    const adapter = new NwnBaseKeyAreaObjectBlueprintSourceAdapter(runtimeSettings, {
      openReader,
      sha256: jest.fn(),
    });

    await expect(adapter.resolve({
      sourceKind: AREA_STORE_CONSTRUCTION_PROFILE.sourceKind,
      sourceProfileId: AREA_STORE_CONSTRUCTION_PROFILE.id,
      templateResRef: AREA_STORE_CONSTRUCTION_PROFILE.templateResRef,
      expectedSha256: AREA_STORE_CONSTRUCTION_PROFILE.sourceSha256,
      ...patch,
    })).rejects.toMatchObject({
      code: "AREA_OBJECT_BLUEPRINT_SOURCE_INVALID",
      message: "Store blueprint provenance is outside the admitted immutable profile.",
      diagnostics: ["profile_or_identity_mismatch"],
    });
    expect(runtimeSettings.getRuntimeSettings).not.toHaveBeenCalled();
    expect(openReader).not.toHaveBeenCalled();
  });

  it.each([
    ["source profile", { sourceProfileId: "custom-utc" }],
    ["template ResRef", { templateResRef: "nw_chicken02" }],
    ["expected SHA-256", { expectedSha256: "f".repeat(64) }],
  ])("rejects a creature request with a mismatched %s before source I/O", async (_label, patch) => {
    const runtimeSettings = { getRuntimeSettings: jest.fn() } as unknown as jest.Mocked<RuntimeSettingsApplicationService>;
    const openReader = jest.fn();
    const adapter = new NwnBaseKeyAreaObjectBlueprintSourceAdapter(runtimeSettings, {
      openReader,
      sha256: jest.fn(),
    });

    await expect(adapter.resolve({
      sourceKind: AREA_CREATURE_CONSTRUCTION_PROFILE.sourceKind,
      sourceProfileId: AREA_CREATURE_CONSTRUCTION_PROFILE.id,
      templateResRef: AREA_CREATURE_CONSTRUCTION_PROFILE.templateResRef,
      expectedSha256: AREA_CREATURE_CONSTRUCTION_PROFILE.sourceSha256,
      ...patch,
    })).rejects.toMatchObject({
      code: "AREA_OBJECT_BLUEPRINT_SOURCE_INVALID",
      message: "Creature blueprint provenance is outside the admitted immutable profile.",
      diagnostics: ["profile_or_identity_mismatch"],
    });
    expect(runtimeSettings.getRuntimeSettings).not.toHaveBeenCalled();
    expect(openReader).not.toHaveBeenCalled();
  });

  it.each([
    ["source profile", { sourceProfileId: "custom-uti" }],
    ["template ResRef", { templateResRef: "nw_cloth021" }],
    ["expected SHA-256", { expectedSha256: "f".repeat(64) }],
  ])("rejects a ground-item request with a mismatched %s before source I/O", async (_label, patch) => {
    const runtimeSettings = { getRuntimeSettings: jest.fn() } as unknown as jest.Mocked<RuntimeSettingsApplicationService>;
    const openReader = jest.fn();
    const adapter = new NwnBaseKeyAreaObjectBlueprintSourceAdapter(runtimeSettings, {
      openReader,
      sha256: jest.fn(),
    });

    await expect(adapter.resolve({
      sourceKind: AREA_ITEM_CONSTRUCTION_PROFILE.sourceKind,
      sourceProfileId: AREA_ITEM_CONSTRUCTION_PROFILE.id,
      templateResRef: AREA_ITEM_CONSTRUCTION_PROFILE.templateResRef,
      expectedSha256: AREA_ITEM_CONSTRUCTION_PROFILE.sourceSha256,
      ...patch,
    })).rejects.toMatchObject({
      code: "AREA_OBJECT_BLUEPRINT_SOURCE_INVALID",
      message: "Item blueprint provenance is outside the admitted immutable profile.",
      diagnostics: ["profile_or_identity_mismatch"],
    });
    expect(runtimeSettings.getRuntimeSettings).not.toHaveBeenCalled();
    expect(openReader).not.toHaveBeenCalled();
  });

  it("rejects cross-kind profile substitution before reading runtime settings", async () => {
    const runtimeSettings = { getRuntimeSettings: jest.fn() } as unknown as jest.Mocked<RuntimeSettingsApplicationService>;
    const adapter = new NwnBaseKeyAreaObjectBlueprintSourceAdapter(runtimeSettings);

    await expect(adapter.resolve({
      sourceKind: "sound",
      sourceProfileId: profile.id,
      templateResRef: profile.templateResRef,
      expectedSha256: profile.sourceSha256,
    })).rejects.toMatchObject({
      code: "AREA_OBJECT_BLUEPRINT_SOURCE_INVALID",
      message: "Sound blueprint provenance is outside the admitted immutable profile.",
      diagnostics: ["profile_or_identity_mismatch"],
    });
    expect(runtimeSettings.getRuntimeSettings).not.toHaveBeenCalled();
  });
});

function storeAdapterForBlueprint(
  sourceBytes: Buffer,
  options: Readonly<{ rejectDependency?: boolean }> = {},
): NwnBaseKeyAreaObjectBlueprintSourceAdapter {
  const dependencies = storeBlueprintDependencyFixtures();
  const byResref = new Map<string, Buffer>(
    dependencies.map((dependency) => [dependency.templateResRef, dependency.bytes]),
  );
  let hashCall = 0;
  return new NwnBaseKeyAreaObjectBlueprintSourceAdapter({
    getRuntimeSettings: jest.fn(async () => ({ paths: { vanillaDataPath: "C:/NWN/data" } })),
  } as unknown as jest.Mocked<RuntimeSettingsApplicationService>, {
    openReader: jest.fn(async () => ({
      read: async (resref: string, resourceType: number) => {
        if (
          resref === AREA_STORE_CONSTRUCTION_PROFILE.templateResRef &&
          resourceType === AREA_STORE_CONSTRUCTION_PROFILE.resourceType
        ) return sourceBytes;
        if (options.rejectDependency) throw new Error("dependency read failed");
        return byResref.get(resref) ?? null;
      },
    })) as never,
    sha256: jest.fn((bytes) => {
      hashCall += 1;
      return hashCall === 1
        ? AREA_STORE_CONSTRUCTION_PROFILE.sourceSha256
        : createHash("sha256").update(bytes).digest("hex");
    }),
  });
}

function resolveStore(adapter: NwnBaseKeyAreaObjectBlueprintSourceAdapter) {
  return adapter.resolve({
    sourceKind: AREA_STORE_CONSTRUCTION_PROFILE.sourceKind,
    sourceProfileId: AREA_STORE_CONSTRUCTION_PROFILE.id,
    templateResRef: AREA_STORE_CONSTRUCTION_PROFILE.templateResRef,
    expectedSha256: AREA_STORE_CONSTRUCTION_PROFILE.sourceSha256,
  });
}
