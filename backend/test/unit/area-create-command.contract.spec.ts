import {
  canonicalizeAreaCreateCommand,
  validateAndNormalizeAreaCreateCommand,
} from "../../src/modules/areas/domain/area-create-command.validation";
import {
  checkAreaCreateRevisionPrecondition,
} from "../../src/modules/areas/domain/area-create-preconditions";
import {
  createAreaCreateIdempotencyEntry,
  parseAreaCreateIdempotencyKey,
  resolveAreaCreateIdempotency,
} from "../../src/modules/areas/domain/area-create-idempotency";

const SHA_A = "A".repeat(64);
const SHA_B = "b".repeat(64);

function validCommand(): Record<string, unknown> {
  return {
    schemaVersion: "area-create-command.v1",
    moduleId: "module:s05e0717",
    expectedModuleRevision: "revision-7",
    creationProfile: {
      id: "aurora-nwn-ee-empty-area-microset-v1",
      fingerprintSha256: SHA_A,
    },
    area: {
      name: "The Name",
      resRef: "AREA_NEW",
      tag: "Area_Tag_Distinct",
    },
    tileset: {
      resRef: "TMS01",
      setFingerprintSha256: SHA_B,
    },
    dimensions: { width: 2, height: 2 },
    initializer: {
      algorithmVersion: "aurora-native-lcg.v1",
      seed: 17,
    },
    tiles: [
      tile(0, 0, 1),
      tile(0, 1, 2),
      tile(1, 0, 3),
      tile(1, 1, 4),
    ],
    groupInstances: [],
    draft: {
      id: "draft:area-new",
      revision: 11,
      normalizedSha256: SHA_A,
    },
    clientCommandId: "command:area-new:11",
  };
}

function tile(row: number, col: number, tileId: number) {
  return {
    row,
    col,
    tileId,
    orientation: 0,
    height: 0,
    mainLight1: 0,
    mainLight2: 0,
    sourceLight1: 0,
    sourceLight2: 0,
    animLoop1: 1,
    animLoop2: 1,
    animLoop3: 1,
  };
}

describe("Area Create command contract", () => {
  it("accepts a strict complete command, preserves identity fields, and normalizes ResRefs/hashes", () => {
    const result = validateAndNormalizeAreaCreateCommand(validCommand());

    expect(result.valid).toBe(true);
    if (!result.valid) {
      throw new Error("Expected a valid Area Create command");
    }

    expect(result.value.area).toEqual({
      name: "The Name",
      resRef: "area_new",
      tag: "Area_Tag_Distinct",
    });
    expect(result.value.tileset.resRef).toBe("tms01");
    expect(result.value.creationProfile.fingerprintSha256).toBe(
      "a".repeat(64),
    );
    expect(result.value.tileset.setFingerprintSha256).toBe(SHA_B);
    expect(result.commandHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.tiles)).toBe(true);
    expect(Object.isFrozen(result.value.tiles[0])).toBe(true);
  });

  it("rejects unsupported schema versions and unknown fields at every object boundary", () => {
    const wrongVersion = {
      ...validCommand(),
      schemaVersion: "area-create-command.v2",
    };
    const unknownRoot = { ...validCommand(), unexpected: true };
    const unknownNested = validCommand();
    (unknownNested.area as Record<string, unknown>).unexpected = true;

    expect(validateAndNormalizeAreaCreateCommand(wrongVersion)).toEqual({
      valid: false,
      issues: [
        expect.objectContaining({
          code: "invalid_field",
          path: "schemaVersion",
        }),
      ],
    });
    expect(validateAndNormalizeAreaCreateCommand(unknownRoot)).toEqual({
      valid: false,
      issues: [
        expect.objectContaining({ code: "unknown_field", path: "$" }),
      ],
    });
    expect(validateAndNormalizeAreaCreateCommand(unknownNested)).toEqual({
      valid: false,
      issues: [
        expect.objectContaining({ code: "unknown_field", path: "area" }),
      ],
    });
    expect(validateAndNormalizeAreaCreateCommand(null)).toEqual({
      valid: false,
      issues: [
        expect.objectContaining({
          code: "invalid_field",
          path: "$",
          message: expect.any(String),
        }),
      ],
    });
  });

  it("enforces anchored identifier, ResRef, SHA-256, revision, and non-blank constraints", () => {
    const invalidInputs: Array<[Record<string, unknown>, string]> = [];

    const leadingFingerprintJunk = validCommand();
    (leadingFingerprintJunk.creationProfile as Record<string, unknown>).fingerprintSha256 =
      `x${"a".repeat(64)}`;
    invalidInputs.push([leadingFingerprintJunk, "creationProfile.fingerprintSha256"]);

    const trailingFingerprintJunk = validCommand();
    (trailingFingerprintJunk.creationProfile as Record<string, unknown>).fingerprintSha256 =
      `${"a".repeat(64)}x`;
    invalidInputs.push([trailingFingerprintJunk, "creationProfile.fingerprintSha256"]);

    const leadingResRefJunk = validCommand();
    (leadingResRefJunk.area as Record<string, unknown>).resRef = "!area_new";
    invalidInputs.push([leadingResRefJunk, "area.resRef"]);

    const trailingResRefJunk = validCommand();
    (trailingResRefJunk.area as Record<string, unknown>).resRef = "area_new!";
    invalidInputs.push([trailingResRefJunk, "area.resRef"]);

    const leadingIdJunk = validCommand();
    leadingIdJunk.moduleId = "!module";
    invalidInputs.push([leadingIdJunk, "moduleId"]);

    const trailingIdJunk = validCommand();
    trailingIdJunk.clientCommandId = "command!";
    invalidInputs.push([trailingIdJunk, "clientCommandId"]);

    const spacedRevision = validCommand();
    spacedRevision.expectedModuleRevision = " revision-7 ";
    invalidInputs.push([spacedRevision, "expectedModuleRevision"]);

    const blankName = validCommand();
    (blankName.area as Record<string, unknown>).name = "   ";
    invalidInputs.push([blankName, "area.name"]);

    for (const [input, path] of invalidInputs) {
      const result = validateAndNormalizeAreaCreateCommand(input);
      expect(result).toEqual({
        valid: false,
        issues: [expect.objectContaining({ code: "invalid_field", path })],
      });
    }

    const revisionResult = validateAndNormalizeAreaCreateCommand(spacedRevision);
    expect(revisionResult).toEqual({
      valid: false,
      issues: [
        expect.objectContaining({
          path: "expectedModuleRevision",
          message: "Revision cannot have surrounding whitespace.",
        }),
      ],
    });
    const blankNameResult = validateAndNormalizeAreaCreateCommand(blankName);
    expect(blankNameResult).toEqual({
      valid: false,
      issues: [
        expect.objectContaining({
          path: "area.name",
          message: "Value cannot be blank.",
        }),
      ],
    });

    const normalized = validCommand();
    (normalized.area as Record<string, unknown>).name = " Name retained ";
    (normalized.area as Record<string, unknown>).resRef = " AREA_NEW ";
    const result = validateAndNormalizeAreaCreateCommand(normalized);
    expect(result.valid).toBe(true);
    if (!result.valid) {
      throw new Error("Expected normalizable ResRef to be accepted");
    }
    expect(result.value.area).toEqual({
      name: " Name retained ",
      resRef: "area_new",
      tag: "Area_Tag_Distinct",
    });
  });

  it("accepts dimensions above the minimum and rejects values outside 2..32", () => {
    const threeByThree = validCommand();
    threeByThree.dimensions = { width: 3, height: 3 };
    threeByThree.tiles = Array.from({ length: 9 }, (_, index) =>
      tile(Math.floor(index / 3), index % 3, index),
    );
    expect(validateAndNormalizeAreaCreateCommand(threeByThree).valid).toBe(true);

    for (const dimensions of [
      { width: 1, height: 2 },
      { width: 2, height: 1 },
      { width: 33, height: 2 },
      { width: 2, height: 33 },
    ]) {
      const input = validCommand();
      input.dimensions = dimensions;
      expect(validateAndNormalizeAreaCreateCommand(input).valid).toBe(false);
    }
  });

  it("requires exactly one complete row-major tile entry for every cell", () => {
    const missing = validCommand();
    (missing.tiles as unknown[]).pop();

    const reordered = validCommand();
    const reorderedTiles = reordered.tiles as unknown[];
    [reorderedTiles[0], reorderedTiles[1]] = [reorderedTiles[1], reorderedTiles[0]];

    const duplicate = validCommand();
    (duplicate.tiles as Array<Record<string, unknown>>)[3] = tile(1, 0, 4);

    for (const input of [missing, reordered, duplicate]) {
      const result = validateAndNormalizeAreaCreateCommand(input);
      expect(result.valid).toBe(false);
      if (result.valid) {
        throw new Error("Expected dense grid validation to fail");
      }
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "invalid_tile_grid" }),
        ]),
      );
    }

    const wrongRowOnly = validCommand();
    (wrongRowOnly.tiles as Array<Record<string, unknown>>)[0].row = 1;
    expect(validateAndNormalizeAreaCreateCommand(wrongRowOnly)).toEqual({
      valid: false,
      issues: [
        expect.objectContaining({
          code: "invalid_tile_grid",
          path: "tiles.0",
          message: "Tile 0 must be the row-major cell (0, 0).",
        }),
      ],
    });

    const missingResult = validateAndNormalizeAreaCreateCommand(missing);
    expect(missingResult).toEqual({
      valid: false,
      issues: [
        {
          code: "invalid_tile_grid",
          path: "tiles",
          message: "Tile count must equal width * height (4).",
        },
      ],
    });
  });

  it("requires all ten typed Aurora tile fields and their structural ranges", () => {
    const missingField = validCommand();
    delete (missingField.tiles as Array<Record<string, unknown>>)[0].animLoop3;

    const invalidOrientation = validCommand();
    (invalidOrientation.tiles as Array<Record<string, unknown>>)[0].orientation = 4;

    const invalidByte = validCommand();
    (invalidByte.tiles as Array<Record<string, unknown>>)[0].sourceLight2 = 256;

    for (const input of [missingField, invalidOrientation, invalidByte]) {
      expect(validateAndNormalizeAreaCreateCommand(input).valid).toBe(false);
    }
  });

  it("canonicalizes object keys and declared group ordering before hashing", () => {
    const left = validCommand();
    left.groupInstances = [
      {
        groupId: "group-b",
        anchorRow: 1,
        anchorCol: 0,
        orientation: 0,
        cells: [{ row: 1, col: 1 }, { row: 1, col: 0 }],
      },
      {
        groupId: "group-a",
        anchorRow: 0,
        anchorCol: 0,
        orientation: 1,
        cells: [{ row: 0, col: 1 }, { row: 0, col: 0 }],
      },
    ];

    const right = {
      clientCommandId: left.clientCommandId,
      draft: left.draft,
      groupInstances: [...(left.groupInstances as unknown[])].reverse(),
      tiles: left.tiles,
      initializer: left.initializer,
      dimensions: left.dimensions,
      tileset: left.tileset,
      area: left.area,
      creationProfile: left.creationProfile,
      expectedModuleRevision: left.expectedModuleRevision,
      moduleId: left.moduleId,
      schemaVersion: left.schemaVersion,
    };

    const leftResult = validateAndNormalizeAreaCreateCommand(left);
    const rightResult = validateAndNormalizeAreaCreateCommand(right);

    expect(leftResult.valid).toBe(true);
    expect(rightResult.valid).toBe(true);
    if (!leftResult.valid || !rightResult.valid) {
      throw new Error("Expected equivalent group declarations to be valid");
    }
    expect(rightResult.canonicalJson).toBe(leftResult.canonicalJson);
    expect(rightResult.commandHash).toBe(leftResult.commandHash);
    expect(leftResult.value.groupInstances[0].groupId).toBe("group-a");
    expect(leftResult.value.groupInstances[0].cells).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);
    expect(leftResult.canonicalJson).toBe(
      canonicalizeAreaCreateCommand(leftResult.value),
    );
    expect(leftResult.canonicalJson.startsWith('{"area":')).toBe(true);
    expect(JSON.parse(leftResult.canonicalJson)).toEqual(leftResult.value);
  });

  it("rejects empty, duplicate, overlapping, and out-of-bounds group declarations", () => {
    const baseGroup = {
      groupId: "group-a",
      anchorRow: 0,
      anchorCol: 0,
      orientation: 0,
      cells: [{ row: 0, col: 0 }],
    };

    const cases = [
      [{ ...baseGroup, cells: [] }],
      [baseGroup, { ...baseGroup, cells: [{ row: 0, col: 1 }] }],
      [{ ...baseGroup, cells: [{ row: 0, col: 0 }, { row: 0, col: 0 }] }],
      [baseGroup, { ...baseGroup, groupId: "group-b", cells: [{ row: 0, col: 0 }] }],
      [{ ...baseGroup, cells: [{ row: 2, col: 0 }] }],
      [{ ...baseGroup, cells: [{ row: 0, col: 2 }] }],
    ];

    for (const groupInstances of cases) {
      const input = validCommand();
      input.groupInstances = groupInstances;
      const result = validateAndNormalizeAreaCreateCommand(input);
      expect(result.valid).toBe(false);
      if (!result.valid && groupInstances[0].cells.length > 0) {
        expect(result.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ code: "invalid_group_instance" }),
          ]),
        );
      }
    }


    const duplicateIdentity = validCommand();
    duplicateIdentity.groupInstances = cases[1];
    expect(validateAndNormalizeAreaCreateCommand(duplicateIdentity)).toEqual({
      valid: false,
      issues: [
        {
          code: "invalid_group_instance",
          path: "groupInstances.1",
          message: "Group instance identity must be unique.",
        },
      ],
    });

    const duplicateCell = validCommand();
    duplicateCell.groupInstances = cases[2];
    const duplicateCellResult = validateAndNormalizeAreaCreateCommand(duplicateCell);
    expect(duplicateCellResult).toEqual({
      valid: false,
      issues: [
        expect.objectContaining({
          code: "invalid_group_instance",
          path: "groupInstances.0.cells.1",
          message:
            "Group cells must be unique, in bounds, and owned by only one declared group.",
        }),
      ],
    });

    const normalizedGroup = validCommand();
    normalizedGroup.groupInstances = [
      {
        ...baseGroup,
        groupId: " GROUP-A ",
        cells: [{ row: 1, col: 0 }, { row: 0, col: 1 }],
      },
    ];
    const normalizedGroupResult = validateAndNormalizeAreaCreateCommand(normalizedGroup);
    expect(normalizedGroupResult.valid).toBe(true);
    if (!normalizedGroupResult.valid) {
      throw new Error("Expected group normalization to succeed");
    }
    expect(normalizedGroupResult.value.groupInstances[0]).toEqual({
      groupId: "group-a",
      anchorRow: 0,
      anchorCol: 0,
      orientation: 0,
      cells: [{ row: 0, col: 1 }, { row: 1, col: 0 }],
    });
  });

  it("uses anchor row, anchor column, group ID, and orientation as deterministic group sort keys", () => {
    const input = validCommand();
    input.groupInstances = [
      { groupId: "z", anchorRow: 1, anchorCol: 0, orientation: 0, cells: [{ row: 0, col: 0 }] },
      { groupId: "z", anchorRow: 0, anchorCol: 1, orientation: 0, cells: [{ row: 0, col: 1 }] },
      { groupId: "b", anchorRow: 0, anchorCol: 0, orientation: 1, cells: [{ row: 1, col: 0 }] },
      { groupId: "b", anchorRow: 0, anchorCol: 0, orientation: 0, cells: [{ row: 1, col: 1 }] },
    ];

    const result = validateAndNormalizeAreaCreateCommand(input);
    expect(result.valid).toBe(true);
    if (!result.valid) {
      throw new Error("Expected structurally distinct group instances");
    }
    expect(
      result.value.groupInstances.map(
        (group) =>
          `${group.anchorRow}:${group.anchorCol}:${group.groupId}:${group.orientation}`,
      ),
    ).toEqual(["0:0:b:0", "0:0:b:1", "0:1:z:0", "1:0:z:0"]);
  });

  it.each([
    ["name", (input: Record<string, unknown>) => {
      (input.area as Record<string, unknown>).name = "Changed Name";
    }],
    ["tag", (input: Record<string, unknown>) => {
      (input.area as Record<string, unknown>).tag = "Changed_Tag";
    }],
    ["tile", (input: Record<string, unknown>) => {
      (input.tiles as Array<Record<string, unknown>>)[2].height = 1;
    }],
    ["draft revision", (input: Record<string, unknown>) => {
      (input.draft as Record<string, unknown>).revision = 12;
    }],
  ])("changes the command hash after a material %s change", (_name, mutate) => {
    const baseline = validateAndNormalizeAreaCreateCommand(validCommand());
    const changedInput = validCommand();
    mutate(changedInput);
    const changed = validateAndNormalizeAreaCreateCommand(changedInput);

    expect(baseline.valid).toBe(true);
    expect(changed.valid).toBe(true);
    if (!baseline.valid || !changed.valid) {
      throw new Error("Expected valid commands");
    }
    expect(changed.commandHash).not.toBe(baseline.commandHash);
  });
});

describe("Area Create revision precondition", () => {
  it("accepts exactly one matching strong If-Match value", () => {
    expect(
      checkAreaCreateRevisionPrecondition({
        ifMatchHeader: '"revision-7"',
        expectedModuleRevision: "revision-7",
        currentModuleRevision: "revision-7",
      }),
    ).toEqual({ matched: true, revision: "revision-7" });
  });

  it.each([
    [undefined, "missing_if_match"],
    ["", "missing_if_match"],
    ["revision-7", "invalid_if_match"],
    ['W/"revision-7"', "invalid_if_match"],
    ['"revision-7", "revision-8"', "invalid_if_match"],
    ["*", "invalid_if_match"],
  ])("rejects an absent or malformed If-Match value", (header, code) => {
    expect(
      checkAreaCreateRevisionPrecondition({
        ifMatchHeader: header,
        expectedModuleRevision: "revision-7",
        currentModuleRevision: "revision-7",
      }),
    ).toEqual(expect.objectContaining({ matched: false, code }));
  });

  it("distinguishes body/header mismatch from a locked-current stale revision", () => {
    expect(
      checkAreaCreateRevisionPrecondition({
        ifMatchHeader: '"revision-6"',
        expectedModuleRevision: "revision-7",
        currentModuleRevision: "revision-7",
      }),
    ).toEqual(
      expect.objectContaining({ matched: false, code: "body_header_mismatch" }),
    );

    expect(
      checkAreaCreateRevisionPrecondition({
        ifMatchHeader: '"revision-7"',
        expectedModuleRevision: "revision-7",
        currentModuleRevision: "revision-8",
      }),
    ).toEqual(
      expect.objectContaining({ matched: false, code: "stale_revision" }),
    );
  });
});

describe("Area Create idempotency contract", () => {
  it("requires a bounded canonical Idempotency-Key without trimming", () => {
    expect(parseAreaCreateIdempotencyKey("area-create.123:_-ABC")).toEqual({
      valid: true,
      value: "area-create.123:_-ABC",
    });
    expect(parseAreaCreateIdempotencyKey(undefined)).toEqual({
      valid: false,
      code: "missing",
    });
    expect(parseAreaCreateIdempotencyKey("")).toEqual({
      valid: false,
      code: "missing",
    });
    expect(parseAreaCreateIdempotencyKey(" key-with-space ")).toEqual({
      valid: false,
      code: "invalid",
    });
    expect(parseAreaCreateIdempotencyKey("x".repeat(129))).toEqual({
      valid: false,
      code: "invalid",
    });
  });

  it("returns new, immutable replay, or conflict without changing the retained result", () => {
    const attempt = {
      moduleId: "module:s05e0717",
      key: "area-create-1",
      commandHash: "a".repeat(64),
    };
    expect(resolveAreaCreateIdempotency(null, attempt)).toEqual({ kind: "new" });

    const mutableResult = {
      areaId: "area_new",
      resources: [{ extension: "are", sha256: "b".repeat(64) }],
    };
    const entry = createAreaCreateIdempotencyEntry({
      ...attempt,
      createdAt: "2026-08-07T12:00:00.000Z",
      result: mutableResult,
    });
    mutableResult.areaId = "mutated-after-store";

    const replay = resolveAreaCreateIdempotency(entry, attempt);
    expect(replay).toEqual({
      kind: "replay",
      entry: expect.objectContaining({
        moduleId: attempt.moduleId,
        key: attempt.key,
        commandHash: attempt.commandHash,
        result: expect.objectContaining({ areaId: "area_new" }),
      }),
    });
    expect(Object.isFrozen(entry)).toBe(true);
    expect(Object.isFrozen(entry.result)).toBe(true);
    expect(Object.isFrozen(entry.result.resources)).toBe(true);
    expect(Object.isFrozen(entry.result.resources[0])).toBe(true);
    expect(Array.isArray(entry.result.resources)).toBe(true);
    expect(entry.result.resources).toEqual([
      { extension: "are", sha256: "b".repeat(64) },
    ]);

    expect(
      resolveAreaCreateIdempotency(entry, {
        ...attempt,
        commandHash: "c".repeat(64),
      }),
    ).toEqual({
      kind: "conflict",
      existingCommandHash: "a".repeat(64),
      attemptedCommandHash: "c".repeat(64),
    });
  });

  it("fails closed when a repository returns an entry from another scope", () => {
    const entry = createAreaCreateIdempotencyEntry({
      moduleId: "module:other",
      key: "area-create-1",
      commandHash: "a".repeat(64),
      createdAt: "2026-08-07T12:00:00.000Z",
      result: { areaId: "area_other" },
    });

    expect(
      resolveAreaCreateIdempotency(entry, {
        moduleId: "module:s05e0717",
        key: "area-create-1",
        commandHash: "a".repeat(64),
      }),
    ).toEqual({ kind: "scope_mismatch" });

    expect(
      resolveAreaCreateIdempotency(entry, {
        moduleId: "module:other",
        key: "different-key",
        commandHash: "a".repeat(64),
      }),
    ).toEqual({ kind: "scope_mismatch" });
  });

  it("rejects non-canonical hashes when creating the immutable retained entry", () => {
    for (const commandHash of [
      `x${"a".repeat(64)}`,
      `${"a".repeat(64)}x`,
      "A".repeat(64),
    ]) {
      expect(() =>
        createAreaCreateIdempotencyEntry({
          moduleId: "module:s05e0717",
          key: "area-create-1",
          commandHash,
          createdAt: "2026-08-07T12:00:00.000Z",
          result: { areaId: "area_new" },
        }),
      ).toThrow("Area Create idempotency command hash must be lowercase SHA-256.");
    }
  });

  it("rejects non-JSON values before retaining an idempotent response", () => {
    class NonJsonResult {
      readonly value = "not-a-plain-object";
    }
    for (const result of [
      { value: undefined },
      { value: Number.NaN },
      { value: new Date("2026-08-07T12:00:00.000Z") },
      { value: new NonJsonResult() },
    ]) {
      expect(() =>
        createAreaCreateIdempotencyEntry({
          moduleId: "module:s05e0717",
          key: "area-create-1",
          commandHash: "a".repeat(64),
          createdAt: "2026-08-07T12:00:00.000Z",
          result,
        }),
      ).toThrow(/JSON/u);
    }
  });

  it("accepts a plain JSON result cloned into the host realm", () => {
    const result = structuredClone({
      areaId: "area_new",
      resources: [{ extension: "are", size: 3 }],
    });

    expect(
      createAreaCreateIdempotencyEntry({
        moduleId: "module:s05e0717",
        key: "area-create-1",
        commandHash: "a".repeat(64),
        createdAt: "2026-08-07T12:00:00.000Z",
        result,
      }).result,
    ).toEqual(result);
  });

  it("preserves every JSON primitive and a null-prototype object", () => {
    const nullPrototype = Object.assign(Object.create(null) as Record<string, unknown>, {
      value: true,
    });
    for (const result of [null, true, false, 0, 1.25, "value", nullPrototype]) {
      expect(
        createAreaCreateIdempotencyEntry({
          moduleId: "module:s05e0717",
          key: "area-create-1",
          commandHash: "a".repeat(64),
          createdAt: "2026-08-07T12:00:00.000Z",
          result,
        }).result,
      ).toEqual(result);
    }
  });

  it("rejects objects that spoof a plain-object constructor or toString tag", () => {
    const nonFunctionConstructor = Object.create({
      constructor: { name: "Object" },
    }) as Record<PropertyKey, unknown>;
    nonFunctionConstructor.value = "invalid";
    const spoofedTag = Object.create({
      constructor: function Object() {
        return undefined;
      },
    }) as Record<PropertyKey, unknown>;
    spoofedTag.value = "invalid";
    spoofedTag[Symbol.toStringTag] = "Map";

    for (const result of [nonFunctionConstructor, spoofedTag]) {
      expect(() =>
        createAreaCreateIdempotencyEntry({
          moduleId: "module:s05e0717",
          key: "area-create-1",
          commandHash: "a".repeat(64),
          createdAt: "2026-08-07T12:00:00.000Z",
          result,
        }),
      ).toThrow(/JSON/u);
    }
  });
});
