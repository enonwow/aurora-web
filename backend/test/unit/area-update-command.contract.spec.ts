import {
  validateAndNormalizeAreaUpdateCommand,
} from "../../src/modules/areas/domain/area-update-command.validation";
import { checkAreaCreateRevisionPrecondition } from "../../src/modules/areas/domain/area-create-preconditions";

function command() {
  return {
    schemaVersion: "area-update-command.v1",
    moduleId: "workspace:module-01",
    areaResRef: "CRYPT01",
    expectedModuleRevision: "B".repeat(64),
    draft: {
      id: "draft_01",
      revision: 7,
      normalizedSha256: "A".repeat(64),
    },
    clientCommandId: "client-command-01",
  };
}

describe("Area Update materialization command contract", () => {
  it("accepts only the strict identity command and normalizes hashes and ResRef", () => {
    const result = validateAndNormalizeAreaUpdateCommand(command());

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.value).toEqual({
      ...command(),
      areaResRef: "crypt01",
      expectedModuleRevision: "b".repeat(64),
      draft: {
        ...command().draft,
        normalizedSha256: "a".repeat(64),
      },
    });
    expect(result.commandHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.draft)).toBe(true);
  });

  it("hashes fresh equivalent commands deterministically", () => {
    const first = validateAndNormalizeAreaUpdateCommand(command());
    const second = validateAndNormalizeAreaUpdateCommand({
      clientCommandId: "client-command-01",
      draft: {
        normalizedSha256: "A".repeat(64),
        revision: 7,
        id: "draft_01",
      },
      expectedModuleRevision: "B".repeat(64),
      areaResRef: "CRYPT01",
      moduleId: "workspace:module-01",
      schemaVersion: "area-update-command.v1",
    });

    expect(second).toEqual(first);
  });

  it.each([
    ["validation schema", { schemaVersion: "area-update-validation.v1" }, "schemaVersion"],
    ["unknown field", { extra: true }, "$"],
    ["non-SHA revision", { expectedModuleRevision: "revision-17" }, "expectedModuleRevision"],
    ["invalid ResRef", { areaResRef: "bad-resref" }, "areaResRef"],
    ["zero draft revision", { draft: { ...command().draft, revision: 0 } }, "draft.revision"],
    ["invalid draft hash", { draft: { ...command().draft, normalizedSha256: "bad" } }, "draft.normalizedSha256"],
  ])("rejects %s", (_label, patch, path) => {
    const result = validateAndNormalizeAreaUpdateCommand({ ...command(), ...patch });

    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path })]));
  });

  it("requires the body revision to match a strong current If-Match", () => {
    const revision = "b".repeat(64);
    expect(
      checkAreaCreateRevisionPrecondition({
        ifMatchHeader: `"${revision}"`,
        expectedModuleRevision: revision,
        currentModuleRevision: revision,
      }),
    ).toEqual({ matched: true, revision });
    expect(
      checkAreaCreateRevisionPrecondition({
        ifMatchHeader: revision,
        expectedModuleRevision: revision,
        currentModuleRevision: revision,
      }),
    ).toEqual({ matched: false, code: "invalid_if_match" });
  });
});
