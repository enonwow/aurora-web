import { randomUUID } from "node:crypto";
import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { AreaCreateRecoveryCoordinator, type AreaCreateRecoveryResult } from "./area-create-recovery.coordinator";
import {
  AREA_CREATE_JOURNAL,
  AREA_CREATE_MODULE_LOCK,
  AREA_CREATE_RECOVERY_STORAGE,
  type AreaCreateModuleLockPort,
  type AreaCreateRecoveryStoragePort,
  type AreaCreateTransactionJournalPort,
} from "./ports/area-create-transaction.port";

const STARTUP_RECOVERY_LIMIT = 100;

/**
 * Reconciles durable Area Create journals before the process accepts normal
 * authoring work. An unexpected repository failure is deliberately allowed to
 * fail Nest startup; running with unreconciled mutations would be less safe.
 */
@Injectable()
export class AreaCreateRecoveryApplicationService implements OnModuleInit {
  private readonly logger = new Logger(AreaCreateRecoveryApplicationService.name);
  private readonly coordinator: AreaCreateRecoveryCoordinator;
  private lastResults: readonly AreaCreateRecoveryResult[] = Object.freeze([]);

  constructor(
    @Inject(AREA_CREATE_MODULE_LOCK) lock: AreaCreateModuleLockPort,
    @Inject(AREA_CREATE_JOURNAL) journal: AreaCreateTransactionJournalPort,
    @Inject(AREA_CREATE_RECOVERY_STORAGE) storage: AreaCreateRecoveryStoragePort,
  ) {
    this.coordinator = new AreaCreateRecoveryCoordinator({
      lock,
      journal,
      storage,
      ids: {
        nextRecoveryId: (transactionId) =>
          `recovery-${transactionId}-${randomUUID()}`,
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.recoverNow();
  }

  async recoverNow(limit = STARTUP_RECOVERY_LIMIT): Promise<readonly AreaCreateRecoveryResult[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > STARTUP_RECOVERY_LIMIT) {
      throw new RangeError(`Area Create recovery limit must be between 1 and ${STARTUP_RECOVERY_LIMIT}.`);
    }
    const results = await this.coordinator.recover(limit);
    this.lastResults = Object.freeze([...results]);
    for (const result of results) {
      const message = JSON.stringify({
        event: "area_create_recovery",
        transactionId: result.transactionId,
        outcome: result.outcome,
        diagnostics: result.diagnostics,
      });
      if (result.outcome === "quarantined") {
        this.logger.error(message);
      } else if (result.outcome === "lease_unavailable") {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }
    }
    return this.lastResults;
  }

  getLastResults(): readonly AreaCreateRecoveryResult[] {
    return this.lastResults;
  }
}
