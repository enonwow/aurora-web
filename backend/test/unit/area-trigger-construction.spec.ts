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
import { AREA_TRIGGER_CONSTRUCTION_PROFILE } from "../../src/modules/areas/domain/area-trigger-construction-profile";
import type { RuntimeSettingsApplicationService } from "../../src/modules/runtime-settings/application/runtime-settings.application.service";
import {
  expectedTriggerGitFields,
  triggerAdditionFixture,
  triggerBlueprintFields,
  triggerBlueprintFixture,
} from "../support/area-trigger-construction-fixture";

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

describe("exact base-UTT trigger construction", () => {
  it("binds the immutable newgeneric UTT identity and exact ordered field profile", () => {
    const bytes = triggerBlueprintFixture();
    const document = parseRawGffDocument(bytes);

    expect(bytes).toHaveLength(1025);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      "e855ae85a9b8511aca84ada06b9779126ff615f9bd816df4dbf39e1a1544001c",
    );
    expect(document).toMatchObject({
      fileType: "UTT ",
      fileVersion: "V3.2",
      rootStructTypeId: 0xffffffff,
    });
    expect(document?.fields.map((field) => field.label)).toEqual([
      "ScriptOnEnter", "Portrait", "TrapDetectDC", "TrapOneShot", "OnDisarm",
      "Tag", "HighlightHeight", "TrapType", "OnTrapTriggered", "ScriptHeartbeat",
      "TemplateResRef", "KeyName", "PaletteID", "TrapDisarmable", "LocalizedName",
      "Cursor", "TrapFlag", "AutoRemoveKey", "Comment", "LinkedTo", "PartyRequired",
      "Type", "DisarmDC", "OnClick", "Faction", "ScriptOnExit", "ScriptUserDefine",
      "LinkedToFlags",
    ]);
    expect(AREA_TRIGGER_CONSTRUCTION_PROFILE).toEqual(expect.objectContaining({
      id: "nwn-base-key-utt-newgeneric-v1",
      sourceKind: "trigger",
      sceneKind: "triggers",
      templateResRef: "newgeneric",
      templateTag: "GenericTrigger",
      sourceSha256: "e855ae85a9b8511aca84ada06b9779126ff615f9bd816df4dbf39e1a1544001c",
      fileType: "UTT ",
      fileVersion: "V3.2",
      rootStructTypeId: 0xffffffff,
      resourceType: 2032,
    }));
    expect(Object.isFrozen(AREA_TRIGGER_CONSTRUCTION_PROFILE)).toBe(true);
  });

  it("constructs the exact paired type-1 TriggerList instance and profile-owned polygon", () => {
    const pair = emptyPair();
    const transform = { x: 3.547599411010742, y: 4.491108703613281, z: 0.25, bearing: 0 };
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [triggerAdditionFixture(transform)],
    });

    expect(result.addedCounts).toEqual(expect.objectContaining({ trigger: 1 }));
    expect(result.candidate.total).toBe(1);
    const gitEntry = list(parseRawGffDocument(result.gitBytes), "TriggerList").value[0]!;
    const gicEntry = list(parseRawGffDocument(result.gicBytes), "TriggerList").value[0]!;
    expect(gitEntry).toEqual({ typeId: 1, fields: expectedTriggerGitFields(transform) });
    expect(gicEntry).toEqual({
      typeId: 1,
      fields: [{ label: "Comment", type: "cexostring", value: "" }],
    });
    expect(gitEntry.fields).toHaveLength(34);
    expect(gitEntry.fields.some((field) => ["PaletteID", "Portrait", "Comment"].includes(field.label))).toBe(false);
  });

  it.each([
    ["source digest", { sourceSha256: "f".repeat(64) }, "trigger:addition=0:source_sha256_mismatch"],
    ["source profile", { sourceProfileId: "custom-utt" }, "trigger:addition=0:profile_or_identity_mismatch"],
    ["template", { templateResRef: "newgeneric2" }, "trigger:addition=0:profile_or_identity_mismatch"],
    ["ResRef", { resRef: "newgeneric2" }, "trigger:addition=0:profile_or_identity_mismatch"],
    ["Tag", { tag: "OVERRIDE" }, "trigger:addition=0:profile_or_identity_mismatch"],
    ["bearing", { bearing: 0.001 }, "trigger:addition=0:bearing=0.001:expected=0"],
  ])("rejects a trigger addition with invalid %s", (_label, patch, diagnostic) => {
    const pair = emptyPair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{ ...triggerAdditionFixture(), ...patch }],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [diagnostic],
    });
  });

  it.each([
    ["missing field", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "PartyRequired"), "field_count=27:expected=28"],
    ["wrong Tag value", (fields: SupportedGffField[]) => fields.map((field) => field.label === "Tag" ? { ...field, value: "Drift" } as SupportedGffField : field), "Tag:value_mismatch"],
    ["wrong TrapDetectDC type", (fields: SupportedGffField[]) => fields.map((field) => field.label === "TrapDetectDC" ? { label: "TrapDetectDC", type: "int", value: 0 } : field), "TrapDetectDC:type=int:expected=byte"],
  ])("fails closed on an exact UTT profile with %s", (_label, mutate, diagnostic) => {
    const pair = emptyPair();
    const fields = mutate(triggerBlueprintFields()) as SupportedGffField[];
    const blueprintBytes = buildGffBuffer(fields, "UTT ", 0xffffffff);
    const addition = {
      ...triggerAdditionFixture(),
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
    ["wrong file type", () => buildGffBuffer(triggerBlueprintFields(), "UTW ", 0xffffffff), "gff_identity"],
    ["wrong file version", () => {
      const bytes = Buffer.from(triggerBlueprintFixture());
      bytes.write("V3.1", 4, "ascii");
      return bytes;
    }, "gff_identity"],
    ["wrong root struct", () => buildGffBuffer(triggerBlueprintFields(), "UTT ", 0), "gff_identity"],
    ["reordered fields", () => {
      const fields = triggerBlueprintFields();
      [fields[0], fields[1]] = [fields[1]!, fields[0]!];
      return buildGffBuffer(fields, "UTT ", 0xffffffff);
    }, "field=0:label=Portrait:expected=ScriptOnEnter"],
  ])("rejects trigger blueprint %s", (_label, buildBytes, diagnostic) => {
    const pair = emptyPair();
    const blueprintBytes = buildBytes();
    const addition = {
      ...triggerAdditionFixture(),
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

  it("resolves the exact admitted UTT through the immutable base-key port", async () => {
    const sourceBytes = triggerBlueprintFixture();
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
      sourceKind: "trigger",
      sourceProfileId: AREA_TRIGGER_CONSTRUCTION_PROFILE.id,
      templateResRef: AREA_TRIGGER_CONSTRUCTION_PROFILE.templateResRef,
      expectedSha256: AREA_TRIGGER_CONSTRUCTION_PROFILE.sourceSha256,
    })).resolves.toEqual({
      sourceKind: "trigger",
      sourceProfileId: AREA_TRIGGER_CONSTRUCTION_PROFILE.id,
      templateResRef: AREA_TRIGGER_CONSTRUCTION_PROFILE.templateResRef,
      sha256: AREA_TRIGGER_CONSTRUCTION_PROFILE.sourceSha256,
      bytes: sourceBytes,
    });
    expect(read).toHaveBeenCalledWith("newgeneric", 2032);
  });

  it.each([
    ["profile", { sourceProfileId: "custom-utt" }],
    ["template", { templateResRef: "newgeneric2" }],
    ["digest", { expectedSha256: "f".repeat(64) }],
  ])("rejects a mismatched trigger %s before source I/O", async (_label, patch) => {
    const runtimeSettings = { getRuntimeSettings: jest.fn() } as unknown as jest.Mocked<RuntimeSettingsApplicationService>;
    const openReader = jest.fn();
    const adapter = new NwnBaseKeyAreaObjectBlueprintSourceAdapter(runtimeSettings, {
      openReader,
      sha256: jest.fn(),
    });

    await expect(adapter.resolve({
      sourceKind: "trigger",
      sourceProfileId: AREA_TRIGGER_CONSTRUCTION_PROFILE.id,
      templateResRef: AREA_TRIGGER_CONSTRUCTION_PROFILE.templateResRef,
      expectedSha256: AREA_TRIGGER_CONSTRUCTION_PROFILE.sourceSha256,
      ...patch,
    })).rejects.toMatchObject({
      code: "AREA_OBJECT_BLUEPRINT_SOURCE_INVALID",
      message: "Trigger blueprint provenance is outside the admitted immutable profile.",
      diagnostics: ["profile_or_identity_mismatch"],
    });
    expect(runtimeSettings.getRuntimeSettings).not.toHaveBeenCalled();
    expect(openReader).not.toHaveBeenCalled();
  });

  it("does not let the trigger selector steal an admitted waypoint request", async () => {
    const bytes = Buffer.from("waypoint-fixture");
    const read = jest.fn(async () => bytes);
    const adapter = new NwnBaseKeyAreaObjectBlueprintSourceAdapter({
      getRuntimeSettings: jest.fn(async () => ({ paths: { vanillaDataPath: "C:/NWN/data" } })),
    } as unknown as jest.Mocked<RuntimeSettingsApplicationService>, {
      openReader: jest.fn(async () => ({ read })) as never,
      sha256: () => "13122a96b64f277c1c6aecb8984f1b5b9c133fb9fb514ce24a1bef564a53055a",
    });

    await expect(adapter.resolve({
      sourceKind: "waypoint",
      sourceProfileId: "nwn-base-key-utw-v1",
      templateResRef: "nw_waypoint001",
      expectedSha256: "13122a96b64f277c1c6aecb8984f1b5b9c133fb9fb514ce24a1bef564a53055a",
    })).resolves.toMatchObject({
      sourceKind: "waypoint",
      sourceProfileId: "nwn-base-key-utw-v1",
      templateResRef: "nw_waypoint001",
      bytes,
    });
    expect(read).toHaveBeenCalledWith("nw_waypoint001", 2058);
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
