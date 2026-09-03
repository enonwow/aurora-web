import { AreaEventScriptPublicationRecoveryApplicationService } from "../../src/modules/areas/application/area-event-script-publication-recovery.application.service";
import type { AreaCreateModuleLockPort } from "../../src/modules/areas/application/ports/area-create-transaction.port";
import type { AreaEventScriptPublicationJournalPort } from "../../src/modules/areas/application/ports/area-event-script-publication.port";
import type { AreaEventScriptPublicationRecoveryStoragePort } from "../../src/modules/areas/application/ports/area-event-script-publication-storage.port";

describe("AreaEventScriptPublicationRecoveryApplicationService", () => {
  it("runs the durable publication recovery scan during module initialization", async () => {
    const journal = {
      listRecoverable: jest.fn(async () => []),
    } as unknown as AreaEventScriptPublicationJournalPort;
    const service = new AreaEventScriptPublicationRecoveryApplicationService(
      {} as AreaCreateModuleLockPort,
      journal,
      {} as AreaEventScriptPublicationRecoveryStoragePort,
    );

    await service.onModuleInit();

    expect(journal.listRecoverable).toHaveBeenCalledWith(100);
    expect(service.getLastResults()).toEqual([]);
    expect(Object.isFrozen(service.getLastResults())).toBe(true);
  });

  it.each([0, 101, 1.5, Number.NaN])(
    "rejects an unsafe recovery scan limit: %p",
    async (limit) => {
      const journal = {
        listRecoverable: jest.fn(async () => []),
      } as unknown as AreaEventScriptPublicationJournalPort;
      const service = new AreaEventScriptPublicationRecoveryApplicationService(
        {} as AreaCreateModuleLockPort,
        journal,
        {} as AreaEventScriptPublicationRecoveryStoragePort,
      );

      await expect(service.recoverNow(limit)).rejects.toThrow(
        "Area event-script publication recovery limit must be between 1 and 100.",
      );
    },
  );
});
