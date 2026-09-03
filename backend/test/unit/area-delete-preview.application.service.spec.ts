import { AreaDeletePreviewError } from "../../src/modules/areas/application/area-delete-impact-scanner";
import { AreaDeletePreviewApplicationService } from "../../src/modules/areas/application/area-delete-preview.application.service";

const MODULE_ID = "workspace:module-01";
const REVISION = "1".repeat(64);

describe("AreaDeletePreviewApplicationService", () => {
  it("validates preconditions, authorizes the narrow permission, bootstraps, and scans", async () => {
    const harness = createHarness();

    const result = await harness.service.preview({
      actorId: "admin-01",
      moduleId: MODULE_ID,
      areaResRef: "delete01",
      ifMatchHeader: `"${REVISION}"`,
      body: command(),
    });

    expect(harness.dependencies.authorization.authorize).toHaveBeenCalledWith({
      actorId: "admin-01",
      moduleId: MODULE_ID,
      permission: "area.materialize.delete",
    });
    expect(harness.dependencies.bootstrap.ensureCurrentWorkspaceBootstrapped).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.scanner.scan).toHaveBeenCalledWith({
      moduleId: MODULE_ID,
      areaResRef: "delete01",
      expectedModuleRevision: REVISION,
    });
    expect(result).toEqual(harness.preview);
  });

  it.each([
    ["", MODULE_ID, "delete01", `"${REVISION}"`, command(), 401, "AREA_DELETE_PERMISSION_DENIED"],
    ["admin-01", "workspace:other", "delete01", `"${REVISION}"`, command(), 422, "AREA_DELETE_INVALID"],
    ["admin-01", MODULE_ID, "other", `"${REVISION}"`, command(), 422, "AREA_DELETE_INVALID"],
    ["admin-01", MODULE_ID, "delete01", undefined, command(), 422, "AREA_DELETE_INVALID"],
    ["admin-01", MODULE_ID, "delete01", `"${"2".repeat(64)}"`, command(), 422, "AREA_DELETE_INVALID"],
    ["admin-01", MODULE_ID, "delete01", `"${REVISION}"`, { ...command(), extra: true }, 422, "AREA_DELETE_INVALID"],
  ] as const)(
    "fails before scanning for invalid boundary case %#",
    async (actorId, moduleId, areaResRef, ifMatchHeader, body, status, code) => {
      const harness = createHarness();
      await expect(harness.service.preview({
        actorId,
        moduleId,
        areaResRef,
        ifMatchHeader,
        body,
      })).rejects.toMatchObject({ code });
      try {
        await harness.service.preview({ actorId, moduleId, areaResRef, ifMatchHeader, body });
      } catch (error) {
        expect((error as { getStatus(): number }).getStatus()).toBe(status);
      }
      expect(harness.dependencies.scanner.scan).not.toHaveBeenCalled();
    },
  );

  it("denies a mapped actor and rejects a module outside the bootstrapped workspace", async () => {
    const denied = createHarness();
    denied.dependencies.authorization.authorize.mockResolvedValue(false);
    await expect(denied.service.preview(validInput())).rejects.toMatchObject({
      code: "AREA_DELETE_PERMISSION_DENIED",
    });

    const wrongModule = createHarness();
    wrongModule.dependencies.bootstrap.ensureCurrentWorkspaceBootstrapped.mockResolvedValue({
      head: { moduleId: "workspace:other", revision: REVISION },
    });
    await expect(wrongModule.service.preview(validInput())).rejects.toMatchObject({
      code: "AREA_DELETE_SOURCE_MISSING",
    });
    expect(wrongModule.dependencies.scanner.scan).not.toHaveBeenCalled();
  });

  it("maps bounded scanner failures to the common HTTP envelope", async () => {
    const harness = createHarness();
    harness.dependencies.scanner.scan.mockRejectedValue(new AreaDeletePreviewError(
      "AREA_DELETE_MODULE_REVISION_CONFLICT",
      412,
      "revision changed",
      ["expected=1", "actual=2"],
    ));

    await expect(harness.service.preview(validInput())).rejects.toMatchObject({
      code: "AREA_DELETE_MODULE_REVISION_CONFLICT",
      retryable: false,
      details: [
        { path: "preview", reason: "expected=1" },
        { path: "preview", reason: "actual=2" },
      ],
    });
  });
});

function createHarness() {
  const preview = { moduleRevision: REVISION, previewSha256: "a".repeat(64) };
  const dependencies = {
    bootstrap: {
      ensureCurrentWorkspaceBootstrapped: jest.fn(async () => ({
        head: { moduleId: MODULE_ID, revision: REVISION },
      })),
    },
    authorization: { authorize: jest.fn(async () => true) },
    scanner: { scan: jest.fn(async () => preview) },
  };
  return {
    preview,
    dependencies,
    service: new AreaDeletePreviewApplicationService(dependencies as never),
  };
}

function command() {
  return {
    schemaVersion: "area-delete-preview-command.v1",
    moduleId: MODULE_ID,
    areaResRef: "delete01",
    expectedModuleRevision: REVISION,
    clientCommandId: "client-01",
  };
}

function validInput() {
  return {
    actorId: "admin-01",
    moduleId: MODULE_ID,
    areaResRef: "delete01",
    ifMatchHeader: `"${REVISION}"`,
    body: command(),
  };
}
