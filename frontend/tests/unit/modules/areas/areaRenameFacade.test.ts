import { describe, expect, it, vi } from "vitest";
import { createAreaRenameFacade } from "../../../../src/modules/areas/application/areaRenameFacade";
import type { AreaRenameApiPort } from "../../../../src/modules/areas/ports/areaRenameApiPort";

describe("areaRenameFacade", () => {
  it("keeps preview and mutation as separate port operations", async () => {
    const port = {
      preview: vi.fn<AreaRenameApiPort["preview"]>(),
      rename: vi.fn<AreaRenameApiPort["rename"]>()
    } satisfies AreaRenameApiPort;
    const facade = createAreaRenameFacade(port);
    const previewInput = { command: { schemaVersion: "area-rename-preview-command.v1" } } as never;
    const renameInput = { command: { schemaVersion: "area-rename-command.v1" } } as never;
    const previewResult = { ok: true, value: { previewSha256: "a".repeat(64) } } as never;
    const renameResult = { ok: true, value: { transactionId: "rename-01" } } as never;
    port.preview.mockResolvedValue(previewResult);
    port.rename.mockResolvedValue(renameResult);

    await expect(facade.commands.preview(previewInput)).resolves.toBe(previewResult);
    await expect(facade.commands.rename(renameInput)).resolves.toBe(renameResult);
    expect(port.preview).toHaveBeenCalledWith(previewInput);
    expect(port.rename).toHaveBeenCalledWith(renameInput);
  });

  it("normalizes an unexpected adapter exception", async () => {
    const port = {
      preview: vi.fn<AreaRenameApiPort["preview"]>().mockRejectedValue(new Error("private")),
      rename: vi.fn<AreaRenameApiPort["rename"]>()
    } satisfies AreaRenameApiPort;
    const facade = createAreaRenameFacade(port);

    await expect(facade.commands.preview({} as never)).resolves.toMatchObject({
      ok: false,
      error: { code: "AREA_RENAME_TRANSPORT_FAILED", operation: "preview_rename" }
    });
  });
});
