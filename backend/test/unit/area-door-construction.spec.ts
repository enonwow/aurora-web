import { createHash } from "node:crypto";
import { buildGffBuffer, type SupportedGffField } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseRawGffDocument } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import {
  AreaObjectPairMutationError,
  mutateExistingAreaObjectsInGitGic,
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-object-pair-writer";
import { NwnBaseKeyAreaObjectBlueprintSourceAdapter } from "../../src/modules/areas/adapters/outbound/blob/nwn-base-key-area-object-blueprint-source.adapter";
import { AREA_DOOR_CONSTRUCTION_PROFILE } from "../../src/modules/areas/domain/area-door-construction-profile";
import type { RuntimeSettingsApplicationService } from "../../src/modules/runtime-settings/application/runtime-settings.application.service";
import {
  doorAdditionFixture,
  doorBlueprintFields,
  doorBlueprintFixture,
  expectedDoorGitFields,
} from "../support/area-door-construction-fixture";

const FAMILY_LISTS = Object.freeze([
  ["Creature List", 4], ["Door List", 8], ["Encounter List", 7], ["List", 0],
  ["Placeable List", 9], ["SoundList", 6], ["StoreList", 11],
  ["TriggerList", 1], ["WaypointList", 5],
] as const);

describe("exact tin01 door-hook construction", () => {
  it("binds the immutable Barn Door UTD and exact hook identities", () => {
    const bytes = doorBlueprintFixture();
    const document = parseRawGffDocument(bytes);
    expect(bytes).toHaveLength(1803);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      "d7fc618b94e0b66c117d5e9d15dea3c0f34f5cc52810b50d146d7c73769406fa",
    );
    expect(document).toMatchObject({ fileType: "UTD ", fileVersion: "V3.2", rootStructTypeId: 0xffffffff });
    expect(document?.fields).toHaveLength(51);
    expect(AREA_DOOR_CONSTRUCTION_PROFILE).toEqual(expect.objectContaining({
      id: "nwn-base-key-utd-nw-door-ttr-04-tin01-121-0-v1",
      sourceKind: "door",
      sceneKind: "doors",
      templateResRef: "nw_door_ttr_04",
      templateTag: "Barn1Door",
      sourceSha256: "d7fc618b94e0b66c117d5e9d15dea3c0f34f5cc52810b50d146d7c73769406fa",
      fileType: "UTD ",
      fileVersion: "V3.2",
      rootStructTypeId: 0xffffffff,
      resourceType: 2042,
      hook: expect.objectContaining({ tileId: 121, tileOrientation: 0, hookIndex: 0, localY: 0.76 }),
    }));
    expect(Object.isFrozen(AREA_DOOR_CONSTRUCTION_PROFILE)).toBe(true);
    expect(Object.isFrozen(AREA_DOOR_CONSTRUCTION_PROFILE.hook)).toBe(true);
  });

  it("constructs the exact paired type-8 Door List instance", () => {
    const pair = emptyPair();
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [doorAdditionFixture(2, 3)],
    });
    const git = list(parseRawGffDocument(result.gitBytes), "Door List").value[0]!;
    const gic = list(parseRawGffDocument(result.gicBytes), "Door List").value[0]!;
    expect(result.addedCounts).toEqual(expect.objectContaining({ door: 1 }));
    expect(git).toEqual({ typeId: 8, fields: expectedDoorGitFields(2, 3) });
    expect(gic).toEqual({ typeId: 8, fields: [{ label: "Comment", type: "cexostring", value: "Barn 1 Door" }] });
  });

  it("rejects duplicate and retained hook occupancy but admits delete-and-replace", () => {
    const empty = emptyPair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: empty.git,
      sourceGic: empty.gic,
      deletions: [],
      additions: [doorAdditionFixture(), { ...doorAdditionFixture(), localObjectId: "doo_002" }],
    }))).toMatchObject({ diagnostics: ["door:addition=1:hook_occupied_by_addition=0"] });

    const occupied = mutateExistingAreaObjectsInGitGic({
      sourceGit: empty.git,
      sourceGic: empty.gic,
      deletions: [],
      additions: [doorAdditionFixture()],
    });
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: occupied.gitBytes,
      sourceGic: occupied.gicBytes,
      deletions: [],
      additions: [{ ...doorAdditionFixture(), localObjectId: "doo_002" }],
    }))).toMatchObject({ diagnostics: ["door:addition=0:hook_occupied_by_source=0"] });

    expect(mutateExistingAreaObjectsInGitGic({
      sourceGit: occupied.gitBytes,
      sourceGic: occupied.gicBytes,
      deletions: [{ kind: "door", sourceIndex: 0 }],
      additions: [{ ...doorAdditionFixture(), localObjectId: "doo_002" }],
    }).candidate.counts.door).toBe(1);
  });

  it.each(["X", "Y", "Z"] as const)(
    "does not report retained-hook occupancy when native %s differs",
    (label) => {
      const empty = emptyPair();
      const occupied = mutateExistingAreaObjectsInGitGic({
        sourceGit: empty.git,
        sourceGic: empty.gic,
        deletions: [],
        additions: [doorAdditionFixture()],
      });
      const git = parseRawGffDocument(occupied.gitBytes)!;
      const retained = list(git, "Door List").value[0]!;
      const coordinate = retained.fields.find((field) => field.label === label);
      if (coordinate?.type !== "float") throw new Error(`Missing ${label} coordinate.`);
      coordinate.value = Math.fround(coordinate.value + 1);
      const changedGit = buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId);

      expect(mutateExistingAreaObjectsInGitGic({
        sourceGit: changedGit,
        sourceGic: occupied.gicBytes,
        deletions: [],
        additions: [{ ...doorAdditionFixture(), localObjectId: `doo_free_${label.toLowerCase()}` }],
      }).candidate.counts.door).toBe(2);
    },
  );

  it.each([
    ["missing X", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "X")],
    ["duplicate X", (fields: SupportedGffField[]) => {
      const x = fields.find((field) => field.label === "X")!;
      return [...fields, structuredClone(x)];
    }],
    ["wrong X type", (fields: SupportedGffField[]) => fields.map((field) =>
      field.label === "X" ? { label: "X", type: "dword" as const, value: 5 } : field)],
    ["missing Y", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "Y")],
    ["wrong Y type", (fields: SupportedGffField[]) => fields.map((field) =>
      field.label === "Y" ? { label: "Y", type: "dword" as const, value: 5 } : field)],
    ["missing Z", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "Z")],
    ["wrong Z type", (fields: SupportedGffField[]) => fields.map((field) =>
      field.label === "Z" ? { label: "Z", type: "dword" as const, value: 0 } : field)],
  ] as Array<[string, (fields: SupportedGffField[]) => SupportedGffField[]]>)(
    "does not invent retained-hook occupancy from a %s field profile",
    (_label, mutateFields) => {
      const empty = emptyPair();
      const occupied = mutateExistingAreaObjectsInGitGic({
        sourceGit: empty.git,
        sourceGic: empty.gic,
        deletions: [],
        additions: [doorAdditionFixture()],
      });
      const git = parseRawGffDocument(occupied.gitBytes)!;
      const retained = list(git, "Door List").value[0]!;
      retained.fields = mutateFields(retained.fields);

      expect(mutateExistingAreaObjectsInGitGic({
        sourceGit: buildGffBuffer(git.fields, "GIT ", git.rootStructTypeId),
        sourceGic: occupied.gicBytes,
        deletions: [],
        additions: [{ ...doorAdditionFixture(), localObjectId: "doo_unoccupied" }],
      }).candidate.counts.door).toBe(2);
    },
  );

  it.each([
    ["profile", { sourceProfileId: "custom-utd" }, "profile_or_identity_mismatch"],
    ["template", { templateResRef: "nw_door_ttr_03" }, "profile_or_identity_mismatch"],
    ["ResRef", { resRef: "nw_door_ttr_03" }, "profile_or_identity_mismatch"],
    ["Tag", { tag: "OVERRIDE" }, "profile_or_identity_mismatch"],
    ["x", { x: 3.6 }, "hook_transform_mismatch"],
    ["y", { y: 3.7 }, "hook_transform_mismatch"],
    ["z", { z: 1 }, "hook_transform_mismatch"],
    ["bearing", { bearing: 0 }, "hook_transform_mismatch"],
    ["negative row", { doorHook: { ...doorAdditionFixture().doorHook, row: -1 } }, "hook_grid_invalid"],
    ["fractional row", { doorHook: { ...doorAdditionFixture().doorHook, row: 0.5 } }, "hook_grid_invalid"],
    ["negative column", { doorHook: { ...doorAdditionFixture().doorHook, col: -1 } }, "hook_grid_invalid"],
    ["fractional column", { doorHook: { ...doorAdditionFixture().doorHook, col: 0.5 } }, "hook_grid_invalid"],
  ])("rejects invalid door %s", (_label, patch, diagnostic) => {
    const pair = emptyPair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{ ...doorAdditionFixture(2, 3), ...patch }],
    }))).toMatchObject({ diagnostics: [expect.stringContaining(diagnostic)] });
  });

  it.each([
    ["missing hook", undefined],
    ...Object.entries(doorAdditionFixture().doorHook)
      .filter(([key]) => key !== "row" && key !== "col")
      .map(([key]) => [key, { ...doorAdditionFixture().doorHook, [key]: key === "profileId" ? "wrong" : -999 }] as [string, unknown]),
  ] as Array<[string, unknown]>)("rejects a Door addition with mismatched %s identity", (_label, doorHook) => {
    const pair = emptyPair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{ ...doorAdditionFixture(), doorHook } as never],
    }))).toMatchObject({ diagnostics: [expect.stringContaining("hook_identity_mismatch")] });
  });

  it("fails closed when the exact UTD field profile drifts", () => {
    const fields = doorBlueprintFields().map((field) =>
      field.label === "Appearance" ? { label: "Appearance", type: "int" as const, value: 0 } : field,
    ) as SupportedGffField[];
    const blueprintBytes = buildGffBuffer(fields, "UTD ", 0xffffffff);
    const addition = {
      ...doorAdditionFixture(),
      blueprintBytes,
      sourceSha256: createHash("sha256").update(blueprintBytes).digest("hex"),
    };
    const pair = emptyPair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [addition],
    }))).toMatchObject({ diagnostics: [expect.stringContaining("profile_or_identity_mismatch")] });
  });

  it("resolves and hash-binds the exact UTD and tin01 SET through the base-key port", async () => {
    const utd = doorBlueprintFixture();
    const set = Buffer.from("exact-tin01-set");
    const read = jest.fn(async (resref: string, type: number) =>
      resref === "nw_door_ttr_04" && type === 2042 ? utd
        : resref === "tin01" && type === 2013 ? set
          : null,
    );
    const adapter = new NwnBaseKeyAreaObjectBlueprintSourceAdapter({
      getRuntimeSettings: jest.fn(async () => ({ paths: { vanillaDataPath: "C:/NWN/data" } })),
    } as unknown as jest.Mocked<RuntimeSettingsApplicationService>, {
      openReader: jest.fn(async () => ({ read })) as never,
      sha256: (bytes) => bytes === set
        ? AREA_DOOR_CONSTRUCTION_PROFILE.hook.tilesetSha256
        : createHash("sha256").update(bytes).digest("hex"),
    });
    await expect(adapter.resolve({
      sourceKind: "door",
      sourceProfileId: AREA_DOOR_CONSTRUCTION_PROFILE.id,
      templateResRef: AREA_DOOR_CONSTRUCTION_PROFILE.templateResRef,
      expectedSha256: AREA_DOOR_CONSTRUCTION_PROFILE.sourceSha256,
    })).resolves.toMatchObject({
      sourceKind: "door",
      sha256: AREA_DOOR_CONSTRUCTION_PROFILE.sourceSha256,
      dependencies: [{
        templateResRef: "tin01",
        resourceType: 2013,
        sha256: AREA_DOOR_CONSTRUCTION_PROFILE.hook.tilesetSha256,
        bytes: set,
      }],
    });
    expect(read.mock.calls).toEqual([["nw_door_ttr_04", 2042], ["tin01", 2013]]);
  });

  it.each([
    ["profile", { sourceProfileId: "wrong-profile" }],
    ["template", { templateResRef: "wrong_template" }],
    ["expected digest", { expectedSha256: "0".repeat(64) }],
  ])("rejects a Door source request with mismatched %s before I/O", async (_label, patch) => {
    const openReader = jest.fn();
    const adapter = new NwnBaseKeyAreaObjectBlueprintSourceAdapter({
      getRuntimeSettings: jest.fn(),
    } as unknown as jest.Mocked<RuntimeSettingsApplicationService>, {
      openReader: openReader as never,
      sha256: (bytes) => createHash("sha256").update(bytes).digest("hex"),
    });

    await expect(adapter.resolve({
      sourceKind: "door",
      sourceProfileId: AREA_DOOR_CONSTRUCTION_PROFILE.id,
      templateResRef: AREA_DOOR_CONSTRUCTION_PROFILE.templateResRef,
      expectedSha256: AREA_DOOR_CONSTRUCTION_PROFILE.sourceSha256,
      ...patch,
    })).rejects.toMatchObject({
      code: "AREA_OBJECT_BLUEPRINT_SOURCE_INVALID",
      diagnostics: ["profile_or_identity_mismatch"],
    });
    expect(openReader).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", async (): Promise<Buffer | null> => null, "AREA_OBJECT_BLUEPRINT_SOURCE_UNAVAILABLE", "door_tileset_resource_unavailable"],
    ["unreadable", async (): Promise<Buffer | null> => { throw new Error("unreadable"); }, "AREA_OBJECT_BLUEPRINT_SOURCE_UNAVAILABLE", "door_tileset_resource_unavailable"],
    ["wrong digest", async (): Promise<Buffer | null> => Buffer.from("wrong-tin01-set"), "AREA_OBJECT_BLUEPRINT_SOURCE_INVALID", "door_tileset_sha256_mismatch"],
  ] as Array<[string, () => Promise<Buffer | null>, string, string]>)(
    "fails closed for a %s immutable Door SET dependency",
    async (_label, readSet, code, diagnostic) => {
      const utd = doorBlueprintFixture();
      const adapter = new NwnBaseKeyAreaObjectBlueprintSourceAdapter({
        getRuntimeSettings: jest.fn(async () => ({ paths: { vanillaDataPath: "C:/NWN/data" } })),
      } as unknown as jest.Mocked<RuntimeSettingsApplicationService>, {
        openReader: jest.fn(async () => ({
          read: async (resref: string, type: number) =>
            resref === "nw_door_ttr_04" && type === 2042 ? utd : readSet(),
        })) as never,
        sha256: (bytes) => bytes === utd
          ? AREA_DOOR_CONSTRUCTION_PROFILE.sourceSha256
          : "0".repeat(64),
      });

      await expect(adapter.resolve({
        sourceKind: "door",
        sourceProfileId: AREA_DOOR_CONSTRUCTION_PROFILE.id,
        templateResRef: AREA_DOOR_CONSTRUCTION_PROFILE.templateResRef,
        expectedSha256: AREA_DOOR_CONSTRUCTION_PROFILE.sourceSha256,
      })).rejects.toMatchObject({ code, diagnostics: [diagnostic] });
    },
  );
});

function emptyPair(): { git: Buffer; gic: Buffer } {
  const fields = FAMILY_LISTS.map(([label]) => ({ label, type: "list" as const, value: [] }));
  return { git: buildGffBuffer(fields, "GIT ", 0xffffffff), gic: buildGffBuffer(fields, "GIC ", 0xffffffff) };
}

function list(document: ReturnType<typeof parseRawGffDocument>, label: string) {
  const field = document?.fields.find((candidate) => candidate.label === label);
  if (field?.type !== "list") throw new Error(`Missing ${label} list.`);
  return field;
}

function pairError(action: () => unknown): AreaObjectPairMutationError {
  try { action(); } catch (error) {
    if (error instanceof AreaObjectPairMutationError) return error;
    throw error;
  }
  throw new Error("Expected AreaObjectPairMutationError.");
}
