import { describe, expect, it, vi } from "vitest";
import { HttpAreaRenameApiPort } from "../../../../src/modules/areas/adapters/httpAreaRenameApiPort";

const REVISION = "a".repeat(64);
const NEW_REVISION = "b".repeat(64);

describe("HttpAreaRenameApiPort", () => {
  it("posts preview and mutation to the dedicated endpoints with strong headers", async () => {
    const preview = previewFixture();
    const receipt = receiptFixture();
    const fetchStub = vi.fn()
      .mockResolvedValueOnce(Response.json(envelope(preview), {
        headers: { ETag: `"${REVISION}"` }
      }))
      .mockResolvedValueOnce(Response.json(envelope(receipt), {
        headers: { ETag: `"${NEW_REVISION}"`, "Idempotency-Status": "created" }
      }));
    const port = new HttpAreaRenameApiPort(fetchStub as unknown as typeof fetch, "/api/v1");
    const previewCommand = {
      schemaVersion: "area-rename-preview-command.v1" as const,
      moduleId: "module-01", areaResRef: "old_area", targetAreaResRef: "new_area",
      expectedModuleRevision: REVISION, clientCommandId: "preview-01"
    };
    const previewResult = await port.preview({
      accessToken: "token", moduleId: "module-01", areaResRef: "old_area",
      command: previewCommand
    });
    const renameCommand = {
      schemaVersion: "area-rename-command.v1" as const,
      moduleId: "module-01", areaResRef: "old_area", targetAreaResRef: "new_area",
      expectedModuleRevision: REVISION, preview: { sha256: "c".repeat(64) },
      confirmation: {
        sourceAreaResRef: "old_area", targetAreaResRef: "new_area",
        policy: "block_on_references" as const
      },
      clientCommandId: "rename-01"
    };
    const renameResult = await port.rename({
      accessToken: "token", moduleId: "module-01", areaResRef: "old_area",
      idempotencyKey: "rename-key", command: renameCommand
    });

    expect(fetchStub).toHaveBeenNthCalledWith(1,
      "/api/v1/modules/module-01/areas/old_area/rename-previews",
      expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "If-Match": `"${REVISION}"` }) })
    );
    expect(fetchStub).toHaveBeenNthCalledWith(2,
      "/api/v1/modules/module-01/areas/old_area/renames",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "If-Match": `"${REVISION}"`, "Idempotency-Key": "rename-key"
        })
      })
    );
    expect(previewResult).toMatchObject({ ok: true, value: { blockerCount: 0 } });
    expect(renameResult).toMatchObject({
      ok: true,
      value: { readbackStatus: "verified", targetAreaResRef: "new_area" }
    });
  });
});

function descriptor(logicalKey: string, resourceType: number, sha256: string) {
  return { logicalKey, resourceType, size: 10, sha256 };
}

function previewFixture() {
  return {
    schemaVersion: "area-rename-preview.v1",
    scanVersion: "area-rename-impact-scan.v1",
    moduleId: "module-01", areaResRef: "old_area", targetAreaResRef: "new_area",
    moduleRevision: REVISION,
    sourceResources: [
      descriptor("old_area.are", 2012, "1".repeat(64)),
      descriptor("old_area.gic", 2046, "2".repeat(64)),
      descriptor("old_area.git", 2023, "3".repeat(64))
    ],
    targetResourceKeys: ["new_area.are", "new_area.gic", "new_area.git"],
    moduleIfo: descriptor("module.ifo", 2014, "4".repeat(64)),
    sourceAreaRootResRef: "old_area",
    oldMembershipCount: 1, newMembershipCount: 0,
    entryAreaResRef: "old_area", entryAreaUpdated: true,
    scanBudgets: { maxObjects: 50000, maxObjectBytes: 16777216, maxTotalBytes: 536870912, maxFindings: 256 },
    findings: [], blockerCount: 0, warningCount: 0,
    previewSha256: "c".repeat(64), expiresAt: "2026-08-24T18:05:00.000Z"
  };
}

function receiptFixture() {
  return {
    schemaVersion: "area-rename-receipt.v1",
    transactionId: "rename-tx-01", moduleId: "module-01",
    areaResRef: "old_area", targetAreaResRef: "new_area",
    previousModuleRevision: REVISION, newModuleRevision: NEW_REVISION,
    commandHash: "d".repeat(64), previewSha256: "c".repeat(64),
    scanVersion: "area-rename-impact-scan.v1",
    resources: ["are", "gic", "git"].map((extension, index) => ({
      extension,
      sourceKey: `old_area.${extension}`,
      targetKey: `new_area.${extension}`,
      resourceType: extension === "are" ? 2012 : extension === "git" ? 2023 : 2046,
      baselineSize: 10, baselineSha256: `${index + 1}`.repeat(64),
      candidateSize: 10, candidateSha256: `${index + 5}`.repeat(64)
    })),
    moduleIfo: {
      key: "module.ifo", baselineSize: 20, baselineSha256: "4".repeat(64),
      candidateSize: 20, candidateSha256: "8".repeat(64)
    },
    entryAreaUpdated: true, blockerCount: 0, warningCount: 0,
    readbackStatus: "verified", warnings: [], renamedAt: "2026-08-24T18:00:01.000Z"
  };
}

function envelope(data: unknown) {
  return { contractVersion: "1.1.0", requestId: "request-rename-01", data };
}
