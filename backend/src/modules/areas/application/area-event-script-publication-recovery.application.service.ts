import { randomUUID } from "node:crypto";
import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  AreaEventScriptPublicationRecoveryCoordinator,
  type AreaEventScriptPublicationRecoveryResult,
} from "./area-event-script-publication-recovery.coordinator";
import type { AreaCreateModuleLockPort } from "./ports/area-create-transaction.port";
import {
  AREA_EVENT_SCRIPT_PUBLICATION_JOURNAL,
  type AreaEventScriptPublicationJournalPort,
} from "./ports/area-event-script-publication.port";
import {
  AREA_EVENT_SCRIPT_PUBLICATION_RECOVERY_STORAGE,
  type AreaEventScriptPublicationRecoveryStoragePort,
} from "./ports/area-event-script-publication-storage.port";
import { AREA_CREATE_MODULE_LOCK } from "./ports/area-create-transaction.port";

const STARTUP_RECOVERY_LIMIT = 100;

@Injectable()
export class AreaEventScriptPublicationRecoveryApplicationService
  implements OnModuleInit
{
  private readonly logger = new Logger(
    AreaEventScriptPublicationRecoveryApplicationService.name,
  );
  private readonly coordinator: AreaEventScriptPublicationRecoveryCoordinator;
  private lastResults: readonly AreaEventScriptPublicationRecoveryResult[] =
    Object.freeze([]);

  constructor(
    @Inject(AREA_CREATE_MODULE_LOCK) lock: AreaCreateModuleLockPort,
    @Inject(AREA_EVENT_SCRIPT_PUBLICATION_JOURNAL)
    journal: AreaEventScriptPublicationJournalPort,
    @Inject(AREA_EVENT_SCRIPT_PUBLICATION_RECOVERY_STORAGE)
    storage: AreaEventScriptPublicationRecoveryStoragePort,
  ) {
    this.coordinator = new AreaEventScriptPublicationRecoveryCoordinator({
      lock,
      journal,
      storage,
      ids: {
        nextRecoveryId: (transactionId) =>
          `recovery-script-${transactionId}-${randomUUID()}`,
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.recoverNow();
  }

  async recoverNow(
    limit = STARTUP_RECOVERY_LIMIT,
  ): Promise<readonly AreaEventScriptPublicationRecoveryResult[]> {
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > STARTUP_RECOVERY_LIMIT
    ) {
      throw new RangeError(
        `Area event-script publication recovery limit must be between 1 and ${STARTUP_RECOVERY_LIMIT}.`,
      );
    }
    const results = await this.coordinator.recover(limit);
    this.lastResults = Object.freeze([...results]);
    for (const result of results) {
      const message = JSON.stringify({
        event: "area_event_script_publication_recovery",
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

  getLastResults(): readonly AreaEventScriptPublicationRecoveryResult[] {
    return this.lastResults;
  }
}
