import { createAreaCreateIdempotencyEntry } from "../domain/area-create-idempotency";
import type { AreaEventScriptPublicationPersistedJournalRecord } from "../domain/area-event-script-publication.types";
import type {
  AreaCreateModuleLease,
  AreaCreateModuleLockPort,
} from "./ports/area-create-transaction.port";
import type {
  AreaEventScriptPublicationJournalPort,
} from "./ports/area-event-script-publication.port";
import type {
  AreaEventScriptPublicationRecoveryStoragePort,
} from "./ports/area-event-script-publication-storage.port";

export type AreaEventScriptPublicationRecoveryOutcome =
  | "completed"
  | "compensated"
  | "quarantined"
  | "lease_unavailable";

export interface AreaEventScriptPublicationRecoveryResult {
  readonly transactionId: string;
  readonly outcome: AreaEventScriptPublicationRecoveryOutcome;
  readonly diagnostics: readonly string[];
}

export interface AreaEventScriptPublicationRecoveryDependencies {
  readonly lock: AreaCreateModuleLockPort;
  readonly journal: AreaEventScriptPublicationJournalPort;
  readonly storage: AreaEventScriptPublicationRecoveryStoragePort;
  readonly ids: Readonly<{ nextRecoveryId(transactionId: string): string }>;
}

export class AreaEventScriptPublicationRecoveryCoordinator {
  constructor(
    private readonly dependencies: AreaEventScriptPublicationRecoveryDependencies,
  ) {}

  async recover(
    limit: number,
  ): Promise<readonly AreaEventScriptPublicationRecoveryResult[]> {
    const journals = await this.dependencies.journal.listRecoverable(limit);
    const results: AreaEventScriptPublicationRecoveryResult[] = [];
    for (const journal of journals) results.push(await this.recoverOne(journal));
    return Object.freeze(results);
  }

  private async recoverOne(
    listed: AreaEventScriptPublicationPersistedJournalRecord,
  ): Promise<AreaEventScriptPublicationRecoveryResult> {
    const lease = await this.dependencies.lock.acquire(
      listed.moduleId,
      this.dependencies.ids.nextRecoveryId(listed.transactionId),
      { recoveryOfTransactionId: listed.transactionId },
    );
    if (!lease) return result(listed.transactionId, "lease_unavailable", []);

    try {
      const journal = await this.dependencies.journal.readJournal(listed.transactionId);
      if (!journal) {
        return result(listed.transactionId, "quarantined", [
          "recovery journal disappeared after lease acquisition",
        ]);
      }
      if (journal.state === "readback_verified" && journal.receipt) {
        let diagnostics: readonly string[] = [];
        try {
          const verification = await this.dependencies.storage.verifyRecordedReadback(
            journal,
            lease,
          );
          diagnostics = verification.diagnostics;
          if (verification.verified) {
            await this.dependencies.journal.finalize(
              journal.transactionId,
              lease,
              createAreaCreateIdempotencyEntry({
                moduleId: journal.moduleId,
                key: journal.idempotencyKey,
                commandHash: journal.commandHash,
                createdAt: journal.receipt.publishedAt,
                result: journal.receipt,
              }),
            );
            return result(journal.transactionId, "completed", diagnostics);
          }
        } catch (error) {
          diagnostics = [...diagnostics, `recovery readback: ${errorMessage(error)}`];
        }
        return this.compensate(journal, lease, diagnostics);
      }
      return this.compensate(
        journal,
        lease,
        journal.state === "readback_verified"
          ? ["recovery readback receipt is missing"]
          : [],
      );
    } finally {
      await this.dependencies.lock.release(lease);
    }
  }

  private async compensate(
    journal: AreaEventScriptPublicationPersistedJournalRecord,
    lease: AreaCreateModuleLease,
    initialDiagnostics: readonly string[],
  ): Promise<AreaEventScriptPublicationRecoveryResult> {
    const diagnostics = [...initialDiagnostics];
    try {
      if (journal.state !== "compensation_pending") {
        await this.dependencies.journal.transition(
          journal.transactionId,
          "compensation_pending",
          lease,
        );
      }
      const compensation = await this.dependencies.storage.restoreRecordedBaseline(
        journal,
        lease,
      );
      diagnostics.push(...compensation.diagnostics);
      if (compensation.restored) {
        await this.dependencies.journal.transition(
          journal.transactionId,
          "compensated",
          lease,
        );
        return result(journal.transactionId, "compensated", diagnostics);
      }
    } catch (error) {
      diagnostics.push(`recovery compensation: ${errorMessage(error)}`);
    }
    if (diagnostics.length === 0) {
      diagnostics.push("recovery could not prove baseline restoration");
    }
    try {
      await this.dependencies.storage.quarantineRecordedPublication(
        journal,
        lease,
        diagnostics,
      );
    } catch (error) {
      diagnostics.push(`recovery quarantine: ${errorMessage(error)}`);
    }
    try {
      await this.dependencies.journal.transition(
        journal.transactionId,
        "quarantine_required",
        lease,
      );
    } catch (error) {
      diagnostics.push(`recovery journal quarantine: ${errorMessage(error)}`);
    }
    return result(journal.transactionId, "quarantined", diagnostics);
  }
}

function result(
  transactionId: string,
  outcome: AreaEventScriptPublicationRecoveryOutcome,
  diagnostics: readonly string[],
): AreaEventScriptPublicationRecoveryResult {
  return Object.freeze({
    transactionId,
    outcome,
    diagnostics: Object.freeze([...diagnostics]),
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
