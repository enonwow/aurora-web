import { AreaCreateRecoveryApplicationService } from "../../src/modules/areas/application/area-create-recovery.application.service";
import type {
  AreaCreateModuleLockPort,
  AreaCreateRecoveryStoragePort,
  AreaCreateTransactionJournalPort,
} from "../../src/modules/areas/application/ports/area-create-transaction.port";

describe("AreaCreateRecoveryApplicationService", () => {
  it("runs the durable recovery scan during module initialization", async () => {
    const journal = {
      listRecoverable: jest.fn(async () => []),
    } as unknown as AreaCreateTransactionJournalPort;
    const service = new AreaCreateRecoveryApplicationService(
      {} as AreaCreateModuleLockPort,
      journal,
      {} as AreaCreateRecoveryStoragePort,
    );

    await service.onModuleInit();

    expect(journal.listRecoverable).toHaveBeenCalledWith(100);
    expect(service.getLastResults()).toEqual([]);
    expect(Object.isFrozen(service.getLastResults())).toBe(true);
  });

  it.each([0, 101, 1.5, Number.NaN])("rejects an unsafe recovery scan limit: %p", async (limit) => {
    const journal = {
      listRecoverable: jest.fn(async () => []),
    } as unknown as AreaCreateTransactionJournalPort;
    const service = new AreaCreateRecoveryApplicationService(
      {} as AreaCreateModuleLockPort,
      journal,
      {} as AreaCreateRecoveryStoragePort,
    );

    await expect(service.recoverNow(limit)).rejects.toThrow(
      "Area Create recovery limit must be between 1 and 100.",
    );
    expect(journal.listRecoverable).not.toHaveBeenCalled();
  });
});
