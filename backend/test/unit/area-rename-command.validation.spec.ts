import {
  validateAndNormalizeAreaRenameCommand,
  validateAndNormalizeAreaRenamePreviewCommand,
} from "../../src/modules/areas/domain/area-rename-command.validation";

const REVISION = "a".repeat(64);
const PREVIEW = "b".repeat(64);

describe("Area rename command validation", () => {
  it("normalizes and deterministically hashes the strict preview command", () => {
    const input = {
      schemaVersion: "area-rename-preview-command.v1",
      moduleId: "workspace:rename",
      areaResRef: " OLD_AREA ",
      targetAreaResRef: " NEW_AREA ",
      expectedModuleRevision: REVISION.toUpperCase(),
      clientCommandId: "client-01",
    };

    const first = validateAndNormalizeAreaRenamePreviewCommand(input);
    const second = validateAndNormalizeAreaRenamePreviewCommand({ ...input });

    expect(first).toMatchObject({
      valid: true,
      value: { areaResRef: "old_area", targetAreaResRef: "new_area", expectedModuleRevision: REVISION },
      commandHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
    });
    expect(second).toEqual(first);
  });

  it("accepts an exact confirmed mutation and rejects mismatched confirmations", () => {
    const accepted = validateAndNormalizeAreaRenameCommand(command());
    expect(accepted).toMatchObject({ valid: true });

    const sourceMismatch = validateAndNormalizeAreaRenameCommand({
      ...command(),
      confirmation: { ...command().confirmation, sourceAreaResRef: "other" },
    });
    const targetMismatch = validateAndNormalizeAreaRenameCommand({
      ...command(),
      confirmation: { ...command().confirmation, targetAreaResRef: "other" },
    });
    expect(sourceMismatch).toMatchObject({ valid: false });
    expect(targetMismatch).toMatchObject({ valid: false });
  });

  it.each([
    ["same identities", { ...previewCommand(), targetAreaResRef: "old_area" }],
    ["uppercase noncanonical after distinctness", { ...previewCommand(), areaResRef: "OLD_AREA", targetAreaResRef: "old_area" }],
    ["invalid ResRef", { ...previewCommand(), targetAreaResRef: "new area" }],
    ["unknown field", { ...previewCommand(), force: true }],
  ])("rejects %s", (_label, input) => {
    expect(validateAndNormalizeAreaRenamePreviewCommand(input)).toMatchObject({ valid: false });
  });
});

function previewCommand() {
  return {
    schemaVersion: "area-rename-preview-command.v1",
    moduleId: "workspace:rename",
    areaResRef: "old_area",
    targetAreaResRef: "new_area",
    expectedModuleRevision: REVISION,
    clientCommandId: "client-01",
  };
}

function command() {
  return {
    schemaVersion: "area-rename-command.v1",
    moduleId: "workspace:rename",
    areaResRef: "old_area",
    targetAreaResRef: "new_area",
    expectedModuleRevision: REVISION,
    preview: { sha256: PREVIEW },
    confirmation: {
      sourceAreaResRef: "old_area",
      targetAreaResRef: "new_area",
      policy: "block_on_references",
    },
    clientCommandId: "client-01",
  };
}
