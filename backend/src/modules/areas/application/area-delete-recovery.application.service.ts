import { randomUUID } from "node:crypto";
import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  AreaDeleteRecoveryCoordinator,
  type AreaDeleteRecoveryResult,
} from "./area-delete-recovery.coordinator";
import {
  AREA_DELETE_JOURNAL,
  AREA_DELETE_MODULE_LOCK,
  AREA_DELETE_RECOVERY_STORAGE,
  type AreaDeleteModuleLockPort,
  type AreaDeleteRecoveryStoragePort,
  type AreaDeleteTransactionJournalPort,
} from "./ports/area-delete-transaction.port";

const STARTUP_RECOVERY_LIMIT = 100;

@Injectable()
export class AreaDeleteRecoveryApplicationService implements OnModuleInit {
  private readonly logger = new Logger(AreaDeleteRecoveryApplicationService.name);
  private readonly coordinator: AreaDeleteRecoveryCoordinator;
  private lastResults: readonly AreaDeleteRecoveryResult[] = Object.freeze([]);

  constructor(
    @Inject(AREA_DELETE_MODULE_LOCK) lock: AreaDeleteModuleLockPort,
    @Inject(AREA_DELETE_JOURNAL) journal: AreaDeleteTransactionJournalPort,
    @Inject(AREA_DELETE_RECOVERY_STORAGE) storage: AreaDeleteRecoveryStoragePort,
  ) {
    this.coordinator = new AreaDeleteRecoveryCoordinator({
      lock,
      journal,
      storage,
      ids: {
        nextRecoveryId: (transactionId) =>
          `recovery-delete-${transactionId}-${randomUUID()}`,
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.recoverNow();
  }

  async recoverNow(limit = STARTUP_RECOVERY_LIMIT) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > STARTUP_RECOVERY_LIMIT) {
      throw new RangeError(
        `Area Delete recovery limit must be between 1 and ${STARTUP_RECOVERY_LIMIT}.`,
      );
    }
    const results = await this.coordinator.recover(limit);
    this.lastResults = Object.freeze([...results]);
    for (const result of results) {
      const message = JSON.stringify({
        event: "area_delete_recovery",
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

  getLastResults(): readonly AreaDeleteRecoveryResult[] {
    return this.lastResults;
  }
}
