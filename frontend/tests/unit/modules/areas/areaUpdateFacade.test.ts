import { describe, expect, it, vi } from "vitest";

import { createAreaUpdateFacade } from "../../../../src/modules/areas/application/areaUpdateFacade";
import type { AreaUpdateCommand } from "../../../../src/modules/areas/areaUpdateContracts";
import type { AreaUpdateApiPort } from "../../../../src/modules/areas/ports/areaUpdateApiPort";

const command = {
  schemaVersion: "area-update-command.v1",
  moduleId: "module-01",
  areaResRef: "crypt01",
  expectedModuleRevision: "revision-01",
  draft: { id: "draft-01", revision: 2, normalizedSha256: "a".repeat(64) },
  clientCommandId: "command-01"
} satisfies AreaUpdateCommand;

function port() {
  return {
    validate: vi.fn<AreaUpdateApiPort["validate"]>(),
    update: vi.fn<AreaUpdateApiPort["update"]>()
  } satisfies AreaUpdateApiPort;
}

describe("areaUpdateFacade", () => {
  it("keeps validation and mutation as separate exact port operations", async () => {
    const adapter = port();
    const facade = createAreaUpdateFacade(adapter);
    const validation = { ok: true, value: { validationId: "validation-01" }, metadata: {} } as never;
    const updated = { ok: true, value: { transactionId: "transaction-01" }, metadata: {} } as never;
    adapter.validate.mockResolvedValue(validation);
    adapter.update.mockResolvedValue(updated);

    const validationInput = {
      accessToken: "token",
      moduleId: command.moduleId,
      areaResRef: command.areaResRef,
      command: { ...command, schemaVersion: "area-update-validation.v1" as const }
    };
    const updateInput = {
      accessToken: "token",
      moduleId: command.moduleId,
      areaResRef: command.areaResRef,
      idempotencyKey: "idem-01",
      command
    };
    await expect(facade.commands.validate(validationInput)).resolves.toBe(validation);
    await expect(facade.commands.update(updateInput)).resolves.toBe(updated);
    expect(adapter.validate).toHaveBeenCalledWith(validationInput);
    expect(adapter.update).toHaveBeenCalledWith(updateInput);
  });

  it.each(["validate", "update"] as const)(
    "normalizes an unexpected %s exception into a deterministic failure",
    async (method) => {
      const adapter = port();
      const facade = createAreaUpdateFacade(adapter);
      adapter[method].mockRejectedValue(new Error("private adapter failure"));

      const result = method === "validate"
        ? await facade.commands.validate({
            accessToken: "token",
            moduleId: command.moduleId,
            areaResRef: command.areaResRef,
            command: { ...command, schemaVersion: "area-update-validation.v1" }
          })
        : await facade.commands.update({
            accessToken: "token",
            moduleId: command.moduleId,
            areaResRef: command.areaResRef,
            idempotencyKey: "idem-01",
            command
          });

      expect(result).toEqual({
        ok: false,
        error: {
          code: "AREA_UPDATE_TRANSPORT_FAILED",
          operation: method === "validate" ? "validate_update" : "update_area",
          status: null,
          message: "The Area Update port failed before returning a contract result.",
          retryable: true,
          details: []
        }
      });
    }
  );
});
