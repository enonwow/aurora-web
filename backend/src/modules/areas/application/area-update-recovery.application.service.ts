import { randomUUID } from "node:crypto";
import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  AreaUpdateRecoveryCoordinator,
  type AreaUpdateRecoveryResult,
} from "./area-update-recovery.coordinator";
import {
  AREA_UPDATE_JOURNAL,
  AREA_UPDATE_MODULE_LOCK,
  AREA_UPDATE_RECOVERY_STORAGE,
  type AreaUpdateModuleLockPort,
  type AreaUpdateRecoveryStoragePort,
  type AreaUpdateTransactionJournalPort,
} from "./ports/area-update-transaction.port";

const STARTUP_RECOVERY_LIMIT = 100;

@Injectable()
export class AreaUpdateRecoveryApplicationService implements OnModuleInit {
  private readonly logger = new Logger(AreaUpdateRecoveryApplicationService.name);
  private readonly coordinator: AreaUpdateRecoveryCoordinator;
  private lastResults: readonly AreaUpdateRecoveryResult[] = Object.freeze([]);

  constructor(
    @Inject(AREA_UPDATE_MODULE_LOCK) lock: AreaUpdateModuleLockPort,
    @Inject(AREA_UPDATE_JOURNAL) journal: AreaUpdateTransactionJournalPort,
    @Inject(AREA_UPDATE_RECOVERY_STORAGE) storage: AreaUpdateRecoveryStoragePort,
  ) {
    this.coordinator = new AreaUpdateRecoveryCoordinator({
      lock,
      journal,
      storage,
      ids: {
        nextRecoveryId: (transactionId) =>
          `recovery-update-${transactionId}-${randomUUID()}`,
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.recoverNow();
  }

  async recoverNow(
    limit = STARTUP_RECOVERY_LIMIT,
  ): Promise<readonly AreaUpdateRecoveryResult[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > STARTUP_RECOVERY_LIMIT) {
      throw new RangeError(
        `Area Update recovery limit must be between 1 and ${STARTUP_RECOVERY_LIMIT}.`,
      );
    }
    const results = await this.coordinator.recover(limit);
    this.lastResults = Object.freeze([...results]);
    for (const result of results) {
      const message = JSON.stringify({
        event: "area_update_recovery",
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

  getLastResults(): readonly AreaUpdateRecoveryResult[] {
    return this.lastResults;
  }
}
