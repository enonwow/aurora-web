import { AreaUpdateRecoveryApplicationService } from "../../src/modules/areas/application/area-update-recovery.application.service";
import type { AreaCreateModuleLockPort } from "../../src/modules/areas/application/ports/area-create-transaction.port";
import type {
  AreaUpdateRecoveryStoragePort,
  AreaUpdateTransactionJournalPort,
} from "../../src/modules/areas/application/ports/area-update-transaction.port";

describe("AreaUpdateRecoveryApplicationService", () => {
  it("runs the durable Update recovery scan during module initialization", async () => {
    const journal = {
      listRecoverable: jest.fn(async () => []),
    } as unknown as AreaUpdateTransactionJournalPort;
    const service = new AreaUpdateRecoveryApplicationService(
      {} as AreaCreateModuleLockPort,
      journal,
      {} as AreaUpdateRecoveryStoragePort,
    );

    await service.onModuleInit();

    expect(journal.listRecoverable).toHaveBeenCalledWith(100);
    expect(service.getLastResults()).toEqual([]);
    expect(Object.isFrozen(service.getLastResults())).toBe(true);
  });

  it.each([0, 101, 1.5, Number.NaN])("rejects an unsafe recovery scan limit: %p", async (limit) => {
    const journal = {
      listRecoverable: jest.fn(async () => []),
    } as unknown as AreaUpdateTransactionJournalPort;
    const service = new AreaUpdateRecoveryApplicationService(
      {} as AreaCreateModuleLockPort,
      journal,
      {} as AreaUpdateRecoveryStoragePort,
    );

    await expect(service.recoverNow(limit)).rejects.toThrow(
      "Area Update recovery limit must be between 1 and 100.",
    );
  });
});
