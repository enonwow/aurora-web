import {
  validateAndNormalizeAreaUpdateValidationCommand,
} from "../../src/modules/areas/domain/area-update-validation-command.validation";

function command() {
  return {
    schemaVersion: "area-update-validation.v1",
    moduleId: "workspace:module-01",
    areaResRef: "CRYPT01",
    expectedModuleRevision: "revision-17",
    draft: {
      id: "draft_01",
      revision: 7,
      normalizedSha256: "A".repeat(64),
    },
    clientCommandId: "client-command-01",
  };
}

describe("Area Update validation command contract", () => {
  it("accepts a strict identity-only command and normalizes ResRef/hash fields", () => {
    const result = validateAndNormalizeAreaUpdateValidationCommand(command());

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.value).toEqual({
      ...command(),
      areaResRef: "crypt01",
      draft: {
        ...command().draft,
        normalizedSha256: "a".repeat(64),
      },
    });
    expect(result.commandHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.draft)).toBe(true);
  });

  it("is deterministic across fresh equivalent inputs", () => {
    const first = validateAndNormalizeAreaUpdateValidationCommand(command());
    const second = validateAndNormalizeAreaUpdateValidationCommand({
      clientCommandId: "client-command-01",
      draft: {
        normalizedSha256: "A".repeat(64),
        revision: 7,
        id: "draft_01",
      },
      expectedModuleRevision: "revision-17",
      areaResRef: "CRYPT01",
      moduleId: "workspace:module-01",
      schemaVersion: "area-update-validation.v1",
    });

    expect(second).toEqual(first);
  });

  it.each([
    ["unknown top-level field", { extra: true }, "unknown_field", "$"],
    ["unknown nested field", { draft: { ...command().draft, extra: true } }, "unknown_field", "draft"],
    ["invalid ResRef", { areaResRef: "bad-resref" }, "invalid_field", "areaResRef"],
    ["non-positive draft revision", { draft: { ...command().draft, revision: 0 } }, "invalid_field", "draft.revision"],
    ["non-canonical hash", { draft: { ...command().draft, normalizedSha256: "not-a-hash" } }, "invalid_field", "draft.normalizedSha256"],
    ["blank module revision", { expectedModuleRevision: " revision-17" }, "invalid_field", "expectedModuleRevision"],
  ])("rejects %s", (_label, patch, code, path) => {
    const input = {
      ...command(),
      ...patch,
    };
    const result = validateAndNormalizeAreaUpdateValidationCommand(input);

    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code, path })]),
    );
  });
});
