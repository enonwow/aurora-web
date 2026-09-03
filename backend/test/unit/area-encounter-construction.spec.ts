import { createHash } from "node:crypto";
import { buildGffBuffer, type SupportedGffField } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseRawGffDocument } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import {
  AreaObjectPairMutationError,
  mutateExistingAreaObjectsInGitGic,
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-object-pair-writer";
import {
  NwnBaseKeyAreaObjectBlueprintSourceAdapter,
} from "../../src/modules/areas/adapters/outbound/blob/nwn-base-key-area-object-blueprint-source.adapter";
import {
  AREA_ENCOUNTER_CONSTRUCTION_PROFILE,
  AREA_ENCOUNTER_DYNAMIC_CONSTRUCTION_PROFILE,
} from "../../src/modules/areas/domain/area-encounter-construction-profile";
import type { RuntimeSettingsApplicationService } from "../../src/modules/runtime-settings/application/runtime-settings.application.service";
import {
  encounterAdditionFixture,
  encounterBlueprintFields,
  encounterBlueprintFixture,
  dynamicEncounterAdditionFixture,
  dynamicEncounterBlueprintFields,
  expectedEncounterGitFields,
  expectedDynamicEncounterGitFields,
} from "../support/area-encounter-construction-fixture";

const FAMILY_LISTS = Object.freeze([
  ["Creature List", 4],
  ["Door List", 8],
  ["Encounter List", 7],
  ["List", 0],
  ["Placeable List", 9],
  ["SoundList", 6],
  ["StoreList", 11],
  ["TriggerList", 1],
  ["WaypointList", 5],
] as const);

describe("exact base-UTE encounter construction", () => {
  it("binds the immutable x2_gnoll001 UTE identity and exact ordered field profile", () => {
    const bytes = encounterBlueprintFixture();
    const document = parseRawGffDocument(bytes);

    expect(bytes).toHaveLength(1072);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      "f3941f1eb580b55247f3ac226e8e0aa72841c3c81ba205c61319b8958a5daeed",
    );
    expect(document).toMatchObject({
      fileType: "UTE ",
      fileVersion: "V3.2",
      rootStructTypeId: 0xffffffff,
    });
    expect(document?.fields.map((field) => field.label)).toEqual([
      "Tag", "LocalizedName", "TemplateResRef", "Active", "Difficulty",
      "DifficultyIndex", "Faction", "MaxCreatures", "PlayerOnly", "RecCreatures",
      "Reset", "ResetTime", "Respawns", "SpawnOption", "OnEntered", "OnExit",
      "OnExhausted", "OnHeartbeat", "OnUserDefined", "CreatureList", "PaletteID",
      "Comment",
    ]);
    expect(AREA_ENCOUNTER_CONSTRUCTION_PROFILE).toEqual(expect.objectContaining({
      id: "nwn-base-key-ute-x2-gnoll001-v1",
      sourceKind: "encounter",
      sceneKind: "encounters",
      templateResRef: "x2_gnoll001",
      templateTag: "X2_GNOLL001",
      sourceSha256: "f3941f1eb580b55247f3ac226e8e0aa72841c3c81ba205c61319b8958a5daeed",
      fileType: "UTE ",
      fileVersion: "V3.2",
      rootStructTypeId: 0xffffffff,
      resourceType: 2040,
    }));
    expect(Object.isFrozen(AREA_ENCOUNTER_CONSTRUCTION_PROFILE)).toBe(true);
  });

  it("constructs the exact paired type-7 Encounter List instance and profile-owned polygon", () => {
    const pair = emptyPair();
    const transform = { x: 2.241201591491699, y: 4.51970329284668, z: 0.25, bearing: 0 };
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [encounterAdditionFixture(transform)],
    });

    expect(result.addedCounts).toEqual(expect.objectContaining({ encounter: 1 }));
    expect(result.candidate.total).toBe(1);
    const gitEntry = list(parseRawGffDocument(result.gitBytes), "Encounter List").value[0]!;
    const gicEntry = list(parseRawGffDocument(result.gicBytes), "Encounter List").value[0]!;
    expect(gitEntry).toEqual({ typeId: 7, fields: expectedEncounterGitFields(transform) });
    expect(gicEntry).toEqual({ typeId: 7, fields: [] });
    expect(gitEntry.fields).toHaveLength(25);
    expect(gitEntry.fields.some((field) => ["PaletteID", "Comment", "Orientation"].includes(field.label))).toBe(false);
  });

  it.each([
    ["source digest", { sourceSha256: "f".repeat(64) }, "encounter:addition=0:source_sha256_mismatch"],
    ["source profile", { sourceProfileId: "custom-ute" }, "encounter:addition=0:profile_or_identity_mismatch"],
    ["template", { templateResRef: "x2_gnoll002" }, "encounter:addition=0:profile_or_identity_mismatch"],
    ["ResRef", { resRef: "x2_gnoll002" }, "encounter:addition=0:profile_or_identity_mismatch"],
    ["Tag", { tag: "OVERRIDE" }, "encounter:addition=0:profile_or_identity_mismatch"],
    ["bearing", { bearing: 0.001 }, "encounter:addition=0:bearing=0.001:expected=0"],
  ])("rejects an encounter addition with invalid %s", (_label, patch, diagnostic) => {
    const pair = emptyPair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{ ...encounterAdditionFixture(), ...patch }],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [diagnostic],
    });
  });

  it.each([
    ["missing field", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "PaletteID"), "field_count=21:expected=22"],
    ["wrong Tag value", (fields: SupportedGffField[]) => fields.map((field) => field.label === "Tag" ? { ...field, value: "Drift" } as SupportedGffField : field), "Tag:value_mismatch"],
    ["wrong Active type", (fields: SupportedGffField[]) => fields.map((field) => field.label === "Active" ? { label: "Active", type: "int", value: 1 } : field), "Active:type=int:expected=byte"],
  ])("fails closed on an exact UTE profile with %s", (_label, mutate, diagnostic) => {
    const pair = emptyPair();
    const fields = mutate(encounterBlueprintFields()) as SupportedGffField[];
    const blueprintBytes = buildGffBuffer(fields, "UTE ", 0xffffffff);
    const addition = {
      ...encounterAdditionFixture(),
      blueprintBytes,
      sourceSha256: createHash("sha256").update(blueprintBytes).digest("hex"),
    };

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [addition],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [expect.stringContaining(diagnostic)],
    });
  });

  it.each([
    ["unparseable bytes", () => Buffer.from("not-a-gff"), "gff_identity"],
    ["wrong file type", () => buildGffBuffer(encounterBlueprintFields(), "UTW ", 0xffffffff), "gff_identity"],
    ["wrong file version", () => {
      const bytes = Buffer.from(encounterBlueprintFixture());
      bytes.write("V3.1", 4, "ascii");
      return bytes;
    }, "gff_identity"],
    ["wrong root struct", () => buildGffBuffer(encounterBlueprintFields(), "UTE ", 0), "gff_identity"],
    ["reordered fields", () => {
      const fields = encounterBlueprintFields();
      [fields[0], fields[1]] = [fields[1]!, fields[0]!];
      return buildGffBuffer(fields, "UTE ", 0xffffffff);
    }, "field=0:label=LocalizedName:expected=Tag"],
  ])("rejects encounter blueprint %s", (_label, buildBytes, diagnostic) => {
    const pair = emptyPair();
    const blueprintBytes = buildBytes();
    const addition = {
      ...encounterAdditionFixture(),
      blueprintBytes,
      sourceSha256: createHash("sha256").update(blueprintBytes).digest("hex"),
    };

    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [addition],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [expect.stringContaining(diagnostic)],
    });
  });

  it("resolves the exact admitted UTE through the immutable base-key port", async () => {
    const sourceBytes = encounterBlueprintFixture();
    const read = jest.fn(async () => sourceBytes);
    const runtimeSettings = {
      getRuntimeSettings: jest.fn(async () => ({ paths: { vanillaDataPath: "C:/NWN/data" } })),
    } as unknown as jest.Mocked<RuntimeSettingsApplicationService>;
    const openReader = jest.fn(async () => ({ read })) as never;
    const adapter = new NwnBaseKeyAreaObjectBlueprintSourceAdapter(runtimeSettings, {
      openReader,
      sha256: (bytes) => createHash("sha256").update(bytes).digest("hex"),
    });

    await expect(adapter.resolve({
      sourceKind: "encounter",
      sourceProfileId: AREA_ENCOUNTER_CONSTRUCTION_PROFILE.id,
      templateResRef: AREA_ENCOUNTER_CONSTRUCTION_PROFILE.templateResRef,
      expectedSha256: AREA_ENCOUNTER_CONSTRUCTION_PROFILE.sourceSha256,
    })).resolves.toEqual({
      sourceKind: "encounter",
      sourceProfileId: AREA_ENCOUNTER_CONSTRUCTION_PROFILE.id,
      templateResRef: AREA_ENCOUNTER_CONSTRUCTION_PROFILE.templateResRef,
      sha256: AREA_ENCOUNTER_CONSTRUCTION_PROFILE.sourceSha256,
      bytes: sourceBytes,
    });
    expect(read).toHaveBeenCalledWith("x2_gnoll001", 2040);
  });

  it.each([
    ["profile", { sourceProfileId: "custom-ute" }],
    ["template", { templateResRef: "x2_gnoll002" }],
    ["digest", { expectedSha256: "f".repeat(64) }],
  ])("rejects a mismatched encounter %s before source I/O", async (_label, patch) => {
    const runtimeSettings = { getRuntimeSettings: jest.fn() } as unknown as jest.Mocked<RuntimeSettingsApplicationService>;
    const openReader = jest.fn();
    const adapter = new NwnBaseKeyAreaObjectBlueprintSourceAdapter(runtimeSettings, {
      openReader,
      sha256: jest.fn(),
    });

    await expect(adapter.resolve({
      sourceKind: "encounter",
      sourceProfileId: AREA_ENCOUNTER_CONSTRUCTION_PROFILE.id,
      templateResRef: AREA_ENCOUNTER_CONSTRUCTION_PROFILE.templateResRef,
      expectedSha256: AREA_ENCOUNTER_CONSTRUCTION_PROFILE.sourceSha256,
      ...patch,
    })).rejects.toMatchObject({
      code: "AREA_OBJECT_BLUEPRINT_SOURCE_INVALID",
      message: "Encounter blueprint provenance is outside the admitted immutable profile.",
      diagnostics: ["profile_or_identity_mismatch"],
    });
    expect(runtimeSettings.getRuntimeSettings).not.toHaveBeenCalled();
    expect(openReader).not.toHaveBeenCalled();
  });

  it("does not let the encounter selector steal an admitted item request", async () => {
    const bytes = Buffer.from("item-fixture");
    const read = jest.fn(async () => bytes);
    const adapter = new NwnBaseKeyAreaObjectBlueprintSourceAdapter({
      getRuntimeSettings: jest.fn(async () => ({ paths: { vanillaDataPath: "C:/NWN/data" } })),
    } as unknown as jest.Mocked<RuntimeSettingsApplicationService>, {
      openReader: jest.fn(async () => ({ read })) as never,
      sha256: () => "606788a4d7e44de76e4c3f38ce4b2b7bae06d64721140995efa011066b5279a6",
    });

    await expect(adapter.resolve({
      sourceKind: "item",
      sourceProfileId: "nwn-base-key-uti-nw-cloth022-v1",
      templateResRef: "nw_cloth022",
      expectedSha256: "606788a4d7e44de76e4c3f38ce4b2b7bae06d64721140995efa011066b5279a6",
    })).resolves.toMatchObject({
      sourceKind: "item",
      sourceProfileId: "nwn-base-key-uti-nw-cloth022-v1",
      templateResRef: "nw_cloth022",
      bytes,
    });
    expect(read).toHaveBeenCalledWith("nw_cloth022", 2025);
  });
});

describe("dynamic effective-catalog UTE encounter construction", () => {
  it("freezes the bounded current-winner profile", () => {
    expect(AREA_ENCOUNTER_DYNAMIC_CONSTRUCTION_PROFILE).toEqual({
      id: "effective-catalog-ute-encounter-copy-v1",
      sourceKind: "encounter",
      sceneKind: "encounters",
      sourceExtension: "ute",
      fileType: "UTE ",
      fileVersion: "V3.2",
      rootStructTypeId: 0xffffffff,
      resourceType: 2040,
      maxSourceBytes: 1024 * 1024,
      maxSourceObjectKeyCodeUnits: 2048,
      maxAdditionsPerUpdate: 1024,
    });
    expect(Object.isFrozen(AREA_ENCOUNTER_DYNAMIC_CONSTRUCTION_PROFILE)).toBe(true);
  });

  it("copies one exact effective UTE through VarTable and CreatureList while excluding palette metadata", () => {
    const pair = emptyPair();
    const transform = { x: 3.25, y: 4.5, z: 0.125, bearing: 0 };
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [dynamicEncounterAdditionFixture(transform)],
    });

    const gitEntry = list(parseRawGffDocument(result.gitBytes), "Encounter List").value[0]!;
    const gicEntry = list(parseRawGffDocument(result.gicBytes), "Encounter List").value[0]!;
    expect(gitEntry).toEqual({ typeId: 7, fields: expectedDynamicEncounterGitFields(transform) });
    expect(gicEntry).toEqual({ typeId: 7, fields: [] });
    expect(gitEntry.fields.some((field) => ["PaletteID", "Comment"].includes(field.label)))
      .toBe(false);
  });

  it.each(["absent", "empty"] as const)(
    "omits an %s dynamic Encounter VarTable from the placed GIT",
    (variant) => {
      const pair = emptyPair();
      const sourceFields = dynamicEncounterBlueprintFields();
      const blueprintBytes = buildGffBuffer(
        variant === "absent"
          ? sourceFields.filter((field) => field.label !== "VarTable")
          : sourceFields.map((field) => field.label === "VarTable"
            ? { label: "VarTable", type: "list" as const, value: [] }
            : field),
        "UTE ",
        0xffffffff,
      );
      const addition = {
        ...dynamicEncounterAdditionFixture(),
        blueprintBytes,
        sourceSizeBytes: blueprintBytes.length,
        sourceSha256: createHash("sha256").update(blueprintBytes).digest("hex"),
      };

      const result = mutateExistingAreaObjectsInGitGic({
        sourceGit: pair.git,
        sourceGic: pair.gic,
        deletions: [],
        additions: [addition],
      });
      const gitEntry = list(parseRawGffDocument(result.gitBytes), "Encounter List").value[0]!;

      expect(gitEntry.fields.some((field) => field.label === "VarTable")).toBe(false);
      expect(gitEntry.fields.find((field) => field.label === "CreatureList"))
        .toMatchObject({ type: "list", value: [expect.objectContaining({ typeId: 0 })] });
    },
  );

  it.each([
    ["missing source key", { sourceObjectKey: undefined }, "profile_or_identity_mismatch"],
    ["wrong source size", { sourceSizeBytes: 1 }, "profile_or_identity_mismatch"],
    ["wrong template", { templateResRef: "enc_other" }, "source_identity_mismatch"],
    ["wrong tag", { tag: "OTHER" }, "source_identity_mismatch"],
    ["bearing", { bearing: 0.001 }, "bearing=0.001:expected=0"],
  ])("rejects a dynamic Encounter with %s", (_label, patch, diagnostic) => {
    const pair = emptyPair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{ ...dynamicEncounterAdditionFixture(), ...patch }],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [expect.stringContaining(diagnostic)],
    });
  });

  it.each([
    ["unknown root field", (fields: SupportedGffField[]) => [
      ...fields,
      { label: "Unknown", type: "byte" as const, value: 0 },
    ], "Unknown:byte"],
    ["duplicate field", (fields: SupportedGffField[]) => [fields[0]!, ...fields], "Tag:count=2"],
    ["malformed variable", (fields: SupportedGffField[]) => fields.map((field) =>
      field.label === "VarTable"
        ? { ...field, value: [{ typeId: 0, fields: [] }] } as SupportedGffField
        : field), "VarTable:entry=0"],
    ["malformed creature", (fields: SupportedGffField[]) => fields.map((field) =>
      field.label === "CreatureList"
        ? { ...field, value: [{ typeId: 1, fields: [] }] } as SupportedGffField
        : field), "CreatureList:entry=0"],
  ])("fails closed on a dynamic UTE with %s", (_label, mutate, diagnostic) => {
    const pair = emptyPair();
    const blueprintBytes = buildGffBuffer(
      mutate(dynamicEncounterBlueprintFields()) as SupportedGffField[],
      "UTE ",
      0xffffffff,
    );
    const addition = {
      ...dynamicEncounterAdditionFixture(),
      blueprintBytes,
      sourceSizeBytes: blueprintBytes.length,
      sourceSha256: createHash("sha256").update(blueprintBytes).digest("hex"),
    };
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [addition],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [expect.stringContaining(diagnostic)],
    });
  });
});

function emptyPair(): { git: Buffer; gic: Buffer } {
  const fields = FAMILY_LISTS.map(([label]) => ({ label, type: "list" as const, value: [] }));
  return {
    git: buildGffBuffer(fields, "GIT ", 0xffffffff),
    gic: buildGffBuffer(fields, "GIC ", 0xffffffff),
  };
}

function list(document: ReturnType<typeof parseRawGffDocument>, label: string) {
  const field = document?.fields.find((candidate) => candidate.label === label);
  if (field?.type !== "list") throw new Error(`Missing ${label} list.`);
  return field;
}

function pairError(action: () => unknown): AreaObjectPairMutationError {
  try {
    action();
  } catch (error) {
    if (error instanceof AreaObjectPairMutationError) return error;
    throw error;
  }
  throw new Error("Expected AreaObjectPairMutationError.");
}
