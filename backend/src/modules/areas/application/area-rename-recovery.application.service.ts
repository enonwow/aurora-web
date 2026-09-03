import { randomUUID } from "node:crypto";
import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  AreaRenameRecoveryCoordinator,
  type AreaRenameRecoveryResult,
} from "./area-rename-recovery.coordinator";
import {
  AREA_RENAME_JOURNAL,
  AREA_RENAME_MODULE_LOCK,
  AREA_RENAME_RECOVERY_STORAGE,
  type AreaRenameModuleLockPort,
  type AreaRenameRecoveryStoragePort,
  type AreaRenameTransactionJournalPort,
} from "./ports/area-rename-transaction.port";

const STARTUP_RECOVERY_LIMIT = 100;

@Injectable()
export class AreaRenameRecoveryApplicationService implements OnModuleInit {
  private readonly logger = new Logger(AreaRenameRecoveryApplicationService.name);
  private readonly coordinator: AreaRenameRecoveryCoordinator;
  private lastResults: readonly AreaRenameRecoveryResult[] = Object.freeze([]);

  constructor(
    @Inject(AREA_RENAME_MODULE_LOCK) lock: AreaRenameModuleLockPort,
    @Inject(AREA_RENAME_JOURNAL) journal: AreaRenameTransactionJournalPort,
    @Inject(AREA_RENAME_RECOVERY_STORAGE) storage: AreaRenameRecoveryStoragePort,
  ) {
    this.coordinator = new AreaRenameRecoveryCoordinator({
      lock,
      journal,
      storage,
      ids: {
        nextRecoveryId: (transactionId) =>
          `recovery-rename-${transactionId}-${randomUUID()}`,
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.recoverNow();
  }

  async recoverNow(
    limit = STARTUP_RECOVERY_LIMIT,
  ): Promise<readonly AreaRenameRecoveryResult[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > STARTUP_RECOVERY_LIMIT) {
      throw new RangeError(
        `Area Rename recovery limit must be between 1 and ${STARTUP_RECOVERY_LIMIT}.`,
      );
    }
    const results = await this.coordinator.recover(limit);
    this.lastResults = Object.freeze([...results]);
    for (const result of results) {
      const message = JSON.stringify({
        event: "area_rename_recovery",
        transactionId: result.transactionId,
        outcome: result.outcome,
        diagnostics: result.diagnostics,
      });
      if (result.outcome === "quarantined") this.logger.error(message);
      else if (result.outcome === "lease_unavailable") this.logger.warn(message);
      else this.logger.log(message);
    }
    return this.lastResults;
  }

  getLastResults(): readonly AreaRenameRecoveryResult[] {
    return this.lastResults;
  }
}
