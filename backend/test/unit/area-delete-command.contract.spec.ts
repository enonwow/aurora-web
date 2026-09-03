import {
  validateAndNormalizeAreaDeleteCommand,
  validateAndNormalizeAreaDeletePreviewCommand,
} from "../../src/modules/areas/domain/area-delete-command.validation";

const REVISION = "1".repeat(64);
const PREVIEW_HASH = "a".repeat(64);

describe("Area Delete command contracts", () => {
  it("normalizes and deterministically hashes the strict preview command", () => {
    const left = validateAndNormalizeAreaDeletePreviewCommand({
      schemaVersion: "area-delete-preview-command.v1",
      moduleId: "workspace:module-01",
      areaResRef: " DELETE01 ",
      expectedModuleRevision: REVISION.toUpperCase(),
      clientCommandId: "client-01",
    });
    const right = validateAndNormalizeAreaDeletePreviewCommand({
      clientCommandId: "client-01",
      expectedModuleRevision: REVISION,
      areaResRef: "delete01",
      moduleId: "workspace:module-01",
      schemaVersion: "area-delete-preview-command.v1",
    });

    expect(left).toEqual(right);
    expect(left).toMatchObject({
      valid: true,
      value: { areaResRef: "delete01", expectedModuleRevision: REVISION },
      commandHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
    });
  });

  it("requires exact preview binding and typed block-on-references confirmation", () => {
    const result = validateAndNormalizeAreaDeleteCommand({
      schemaVersion: "area-delete-command.v1",
      moduleId: "workspace:module-01",
      areaResRef: "DELETE01",
      expectedModuleRevision: REVISION,
      preview: { sha256: PREVIEW_HASH.toUpperCase() },
      confirmation: { areaResRef: "delete01", policy: "block_on_references" },
      clientCommandId: "client-01",
    });

    expect(result).toMatchObject({
      valid: true,
      value: {
        areaResRef: "delete01",
        preview: { sha256: PREVIEW_HASH },
        confirmation: { areaResRef: "delete01", policy: "block_on_references" },
      },
    });
  });

  it.each([
    { ...preview(), extra: true },
    { ...preview(), areaResRef: "bad-resref!" },
    { ...preview(), expectedModuleRevision: "short" },
    { ...preview(), clientCommandId: "bad id" },
  ])("rejects invalid or unknown preview input %#", (input) => {
    const result = validateAndNormalizeAreaDeletePreviewCommand(input);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues.length).toBeGreaterThan(0);
  });

  it.each([
    { ...deletion(), confirmation: { areaResRef: "other", policy: "block_on_references" } },
    { ...deletion(), confirmation: { areaResRef: "delete01", policy: "force" } },
    { ...deletion(), preview: { sha256: "short" } },
    { ...deletion(), unexpected: true },
  ])("rejects unsafe Delete input %#", (input) => {
    const result = validateAndNormalizeAreaDeleteCommand(input);
    expect(result.valid).toBe(false);
  });
});

function preview() {
  return {
    schemaVersion: "area-delete-preview-command.v1",
    moduleId: "workspace:module-01",
    areaResRef: "delete01",
    expectedModuleRevision: REVISION,
    clientCommandId: "client-01",
  };
}

function deletion() {
  return {
    schemaVersion: "area-delete-command.v1",
    moduleId: "workspace:module-01",
    areaResRef: "delete01",
    expectedModuleRevision: REVISION,
    preview: { sha256: PREVIEW_HASH },
    confirmation: { areaResRef: "delete01", policy: "block_on_references" },
    clientCommandId: "client-01",
  };
}
