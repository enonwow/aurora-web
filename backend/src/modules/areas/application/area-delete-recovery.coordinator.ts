import { createAreaCreateIdempotencyEntry } from "../domain/area-create-idempotency";
import type { AreaDeletePersistedJournalRecord } from "../domain/area-delete-transaction.types";
import type { AreaCreateModuleLease } from "./ports/area-create-transaction.port";
import type {
  AreaDeleteModuleLockPort,
  AreaDeleteRecoveryStoragePort,
  AreaDeleteTransactionJournalPort,
} from "./ports/area-delete-transaction.port";

export type AreaDeleteRecoveryOutcome =
  | "completed"
  | "compensated"
  | "quarantined"
  | "lease_unavailable";

export interface AreaDeleteRecoveryResult {
  readonly transactionId: string;
  readonly outcome: AreaDeleteRecoveryOutcome;
  readonly diagnostics: readonly string[];
}

export interface AreaDeleteRecoveryDependencies {
  readonly lock: AreaDeleteModuleLockPort;
  readonly journal: AreaDeleteTransactionJournalPort;
  readonly storage: AreaDeleteRecoveryStoragePort;
  readonly ids: Readonly<{ nextRecoveryId(transactionId: string): string }>;
}

export class AreaDeleteRecoveryCoordinator {
  constructor(private readonly dependencies: AreaDeleteRecoveryDependencies) {}

  async recover(limit: number): Promise<readonly AreaDeleteRecoveryResult[]> {
    const journals = await this.dependencies.journal.listRecoverable(limit);
    const results: AreaDeleteRecoveryResult[] = [];
    for (const journal of journals) results.push(await this.recoverOne(journal));
    return Object.freeze(results);
  }

  private async recoverOne(
    listed: AreaDeletePersistedJournalRecord,
  ): Promise<AreaDeleteRecoveryResult> {
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
                createdAt: journal.receipt.deletedAt,
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
    journal: AreaDeletePersistedJournalRecord,
    lease: AreaCreateModuleLease,
    initialDiagnostics: readonly string[],
  ): Promise<AreaDeleteRecoveryResult> {
    const diagnostics = [...initialDiagnostics];
    try {
      if (journal.state !== "compensation_pending") {
        await this.dependencies.journal.transition(
          journal.transactionId, "compensation_pending", lease,
        );
      }
      const compensation = await this.dependencies.storage.compensate(journal, lease);
      diagnostics.push(...compensation.diagnostics);
      if (compensation.restored) {
        await this.dependencies.journal.transition(
          journal.transactionId, "compensated", lease,
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
      await this.dependencies.storage.quarantine(journal, lease, diagnostics);
    } catch (error) {
      diagnostics.push(`recovery quarantine: ${errorMessage(error)}`);
    }
    try {
      await this.dependencies.journal.transition(
        journal.transactionId, "quarantine_required", lease,
      );
    } catch (error) {
      diagnostics.push(`recovery journal quarantine: ${errorMessage(error)}`);
    }
    return result(journal.transactionId, "quarantined", diagnostics);
  }
}

function result(
  transactionId: string,
  outcome: AreaDeleteRecoveryOutcome,
  diagnostics: readonly string[],
): AreaDeleteRecoveryResult {
  return Object.freeze({
    transactionId, outcome, diagnostics: Object.freeze([...diagnostics]),
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
