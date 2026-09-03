import { describe, expect, it, vi } from "vitest";
import { createAreaEventScriptPublicationFacade } from "../../../../src/modules/areas/application/areaEventScriptPublicationFacade";
import { createAreaEventScriptSourceCommand } from "../../../../src/modules/areas/domain/areaEventScriptPublication";
import { AreaEventScriptPortError, type AreaEventScriptPublicationPort } from "../../../../src/modules/areas/ports/areaEventScriptPublicationPort";
import {
  SCRIPT_MODULE_ID,
  SCRIPT_REVISION,
  SCRIPT_SOURCE,
  areaEventScriptPublicationReceiptFixture,
  areaEventScriptSourceSnapshotFixture,
  areaEventScriptValidationFixture,
} from "./areaEventScriptPublicationFixture";

describe("createAreaEventScriptPublicationFacade", () => {
  it("delegates source, validation, and publication through the dedicated port", async () => {
    const port = createPort();
    const facade = createAreaEventScriptPublicationFacade(port, {
      nextIdempotencyKey: () => "script-key-1",
    });
    const command = commandFixture();

    await expect(facade.readSource("token", {
      moduleId: SCRIPT_MODULE_ID,
      targetResRef: "area_enter",
      expectedModuleRevision: SCRIPT_REVISION,
    })).resolves.toEqual({ ok: true, value: areaEventScriptSourceSnapshotFixture() });
    await expect(facade.validate("token", command))
      .resolves.toEqual({ ok: true, value: areaEventScriptValidationFixture() });
    await expect(facade.publish("token", command)).resolves.toEqual({
      ok: true,
      value: {
        idempotency: "created",
        receipt: areaEventScriptPublicationReceiptFixture(),
      },
    });
    expect(port.publish).toHaveBeenCalledWith("token", command, "script-key-1");
  });

  it("maps port failures to bounded operation-specific UI errors", async () => {
    const port = createPort();
    vi.mocked(port.readSource).mockRejectedValueOnce(new AreaEventScriptPortError(
      "secret backend message",
      404,
      "AREA_EVENT_SCRIPT_SOURCE_NOT_FOUND",
      false,
    ));
    const facade = createAreaEventScriptPublicationFacade(port, {
      nextIdempotencyKey: () => "script-key-1",
    });

    await expect(facade.readSource("token", {
      moduleId: SCRIPT_MODULE_ID,
      targetResRef: "area_enter",
      expectedModuleRevision: SCRIPT_REVISION,
    })).resolves.toEqual({
      ok: false,
      error: {
        code: "AREA_EVENT_SCRIPT_SOURCE_NOT_FOUND",
        status: 404,
        retryable: false,
        message: "The committed script source was not found.",
      },
    });
  });
});

function createPort(): AreaEventScriptPublicationPort {
  return {
    readSource: vi.fn().mockResolvedValue(areaEventScriptSourceSnapshotFixture()),
    validate: vi.fn().mockResolvedValue(areaEventScriptValidationFixture()),
    publish: vi.fn().mockResolvedValue({
      idempotency: "created",
      receipt: areaEventScriptPublicationReceiptFixture(),
    }),
  };
}

function commandFixture() {
  return createAreaEventScriptSourceCommand({
    moduleId: SCRIPT_MODULE_ID,
    targetResRef: "area_enter",
    expectedModuleRevision: SCRIPT_REVISION,
    sourceText: SCRIPT_SOURCE,
    includeResRefs: [],
  })!;
}
