import { describe, expect, it, vi } from "vitest";

import { createAreaDeleteFacade } from "../../../../src/modules/areas/application/areaDeleteFacade";
import type { AreaDeleteApiPort } from "../../../../src/modules/areas/ports/areaDeleteApiPort";

function port() {
  return {
    preview: vi.fn<AreaDeleteApiPort["preview"]>(),
    delete: vi.fn<AreaDeleteApiPort["delete"]>()
  } satisfies AreaDeleteApiPort;
}

const previewInput = {
  accessToken: "token",
  moduleId: "module-01",
  areaResRef: "crypt01",
  command: {
    schemaVersion: "area-delete-preview-command.v1" as const,
    moduleId: "module-01",
    areaResRef: "crypt01",
    expectedModuleRevision: "a".repeat(64),
    clientCommandId: "preview-01"
  }
};

const deleteInput = {
  ...previewInput,
  idempotencyKey: "delete-idem-01",
  command: {
    schemaVersion: "area-delete-command.v1" as const,
    moduleId: "module-01",
    areaResRef: "crypt01",
    expectedModuleRevision: "a".repeat(64),
    preview: { sha256: "b".repeat(64) },
    confirmation: { areaResRef: "crypt01", policy: "block_on_references" as const },
    clientCommandId: "delete-01"
  }
};

describe("areaDeleteFacade", () => {
  it("keeps impact preview and destructive mutation as separate operations", async () => {
    const adapter = port();
    const facade = createAreaDeleteFacade(adapter);
    const previewResult = { ok: true, value: { previewSha256: "b".repeat(64) } } as never;
    const deleteResult = { ok: true, value: { transactionId: "transaction-01" } } as never;
    adapter.preview.mockResolvedValue(previewResult);
    adapter.delete.mockResolvedValue(deleteResult);

    await expect(facade.commands.preview(previewInput)).resolves.toBe(previewResult);
    await expect(facade.commands.delete(deleteInput)).resolves.toBe(deleteResult);
    expect(adapter.preview).toHaveBeenCalledWith(previewInput);
    expect(adapter.delete).toHaveBeenCalledWith(deleteInput);
  });

  it.each(["preview", "delete"] as const)(
    "normalizes an unexpected %s port exception",
    async (method) => {
      const adapter = port();
      const facade = createAreaDeleteFacade(adapter);
      adapter[method].mockRejectedValue(new Error("private adapter failure"));
      const result = method === "preview"
        ? await facade.commands.preview(previewInput)
        : await facade.commands.delete(deleteInput);

      expect(result).toEqual({
        ok: false,
        error: {
          code: "AREA_DELETE_TRANSPORT_FAILED",
          operation: method === "preview" ? "preview_delete" : "delete_area",
          status: null,
          message: "The Area Delete port failed before returning a contract result.",
          retryable: true,
          details: []
        }
      });
    }
  );
});
