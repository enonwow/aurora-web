import { AreaRenamePreviewApplicationService } from "../../src/modules/areas/application/area-rename-preview.application.service";

const MODULE_ID = "workspace:rename-http";
const REVISION = "1".repeat(64);

describe("AreaRenamePreviewApplicationService", () => {
  it("validates path/revision, authorizes, bootstraps, and scans", async () => {
    const harness = createHarness();

    const result = await harness.service.preview({
      actorId: "admin-01",
      moduleId: MODULE_ID,
      areaResRef: "old_area",
      ifMatchHeader: `"${REVISION}"`,
      body: command(),
    });

    expect(harness.dependencies.authorization.authorize).toHaveBeenCalledWith({
      actorId: "admin-01",
      moduleId: MODULE_ID,
      permission: "area.materialize.rename",
    });
    expect(harness.dependencies.scanner.scan).toHaveBeenCalledWith({
      moduleId: MODULE_ID,
      areaResRef: "old_area",
      targetAreaResRef: "new_area",
      expectedModuleRevision: REVISION,
    });
    expect(result).toEqual(harness.preview);
  });

  it("rejects path drift, missing If-Match, and unknown fields before scanning", async () => {
    for (const input of [
      { areaResRef: "other", ifMatchHeader: `"${REVISION}"`, body: command() },
      { areaResRef: "old_area", ifMatchHeader: undefined, body: command() },
      { areaResRef: "old_area", ifMatchHeader: `"${REVISION}"`, body: { ...command(), force: true } },
    ]) {
      const harness = createHarness();
      await expect(harness.service.preview({
        actorId: "admin-01", moduleId: MODULE_ID, ...input,
      })).rejects.toMatchObject({ code: "AREA_RENAME_INVALID" });
      expect(harness.dependencies.scanner.scan).not.toHaveBeenCalled();
    }
  });
});

function createHarness(): {
  preview: any;
  dependencies: any;
  service: AreaRenamePreviewApplicationService;
} {
  const preview = { moduleRevision: REVISION, previewSha256: "a".repeat(64) };
  const dependencies = {
    bootstrap: { ensureCurrentWorkspaceBootstrapped: jest.fn(async () => ({
      head: { moduleId: MODULE_ID, revision: REVISION },
    })) },
    authorization: { authorize: jest.fn(async () => true) },
    scanner: { scan: jest.fn(async () => preview) },
  };
  return {
    preview,
    dependencies,
    service: new AreaRenamePreviewApplicationService(dependencies as never),
  };
}

function command() {
  return {
    schemaVersion: "area-rename-preview-command.v1",
    moduleId: MODULE_ID,
    areaResRef: "old_area",
    targetAreaResRef: "new_area",
    expectedModuleRevision: REVISION,
    clientCommandId: "client-01",
  };
}
