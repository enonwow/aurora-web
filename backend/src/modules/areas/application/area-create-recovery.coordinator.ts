import {
  createAreaCreateIdempotencyEntry,
} from "../domain/area-create-idempotency";
import type {
  AreaCreateModuleLease,
  AreaCreateModuleLockPort,
  AreaCreateRecoveryStoragePort,
  AreaCreateTransactionJournalPort,
} from "./ports/area-create-transaction.port";
import type {
  AreaCreatePersistedJournalRecord,
} from "../domain/area-create-transaction.types";

export type AreaCreateRecoveryOutcome =
  | "completed"
  | "compensated"
  | "quarantined"
  | "lease_unavailable";

export interface AreaCreateRecoveryResult {
  readonly transactionId: string;
  readonly outcome: AreaCreateRecoveryOutcome;
  readonly diagnostics: readonly string[];
}

export interface AreaCreateRecoveryDependencies {
  readonly lock: AreaCreateModuleLockPort;
  readonly journal: AreaCreateTransactionJournalPort;
  readonly storage: AreaCreateRecoveryStoragePort;
  readonly ids: Readonly<{ nextRecoveryId(transactionId: string): string }>;
}

export class AreaCreateRecoveryCoordinator {
  constructor(private readonly dependencies: AreaCreateRecoveryDependencies) {}

  async recover(limit: number): Promise<readonly AreaCreateRecoveryResult[]> {
    const journals = await this.dependencies.journal.listRecoverable(limit);
    const results: AreaCreateRecoveryResult[] = [];
    for (const listed of journals) {
      results.push(await this.recoverOne(listed));
    }
    return Object.freeze(results);
  }

  private async recoverOne(
    listed: AreaCreatePersistedJournalRecord,
  ): Promise<AreaCreateRecoveryResult> {
    const lease = await this.dependencies.lock.acquire(
      listed.moduleId,
      this.dependencies.ids.nextRecoveryId(listed.transactionId),
      { recoveryOfTransactionId: listed.transactionId },
    );
    if (!lease) {
      return result(listed.transactionId, "lease_unavailable", []);
    }

    try {
      const journal = await this.dependencies.journal.readJournal(listed.transactionId);
      if (!journal) {
        return result(listed.transactionId, "quarantined", [
          "recovery journal disappeared after lease acquisition",
        ]);
      }

      if (journal.state === "readback_verified" && journal.receipt) {
        let verificationDiagnostics: readonly string[] = [];
        try {
          const verification = await this.dependencies.storage.verifyRecordedReadback(
            journal,
            lease,
          );
          verificationDiagnostics = verification.diagnostics;
          if (verification.verified) {
            const entry = createAreaCreateIdempotencyEntry({
              moduleId: journal.moduleId,
              key: journal.idempotencyKey,
              commandHash: journal.commandHash,
              createdAt: journal.receipt.createdAt,
              result: journal.receipt,
            });
            await this.dependencies.journal.finalize(
              journal.transactionId,
              lease,
              entry,
            );
            return result(journal.transactionId, "completed", verificationDiagnostics);
          }
        } catch (error) {
          verificationDiagnostics = [
            ...verificationDiagnostics,
            `recovery readback: ${errorMessage(error)}`,
          ];
        }
        const compensated = await this.compensate(
          journal,
          lease,
          verificationDiagnostics,
        );
        return compensated;
      }

      const diagnostics =
        journal.state === "readback_verified"
          ? ["recovery readback receipt is missing"]
          : [];
      const compensated = await this.compensate(journal, lease, diagnostics);
      return compensated;
    } finally {
      await this.dependencies.lock.release(lease);
    }
  }

  private async compensate(
    journal: AreaCreatePersistedJournalRecord,
    lease: AreaCreateModuleLease,
    initialDiagnostics: readonly string[],
  ): Promise<AreaCreateRecoveryResult> {
    const diagnostics = [...initialDiagnostics];
    try {
      if (journal.state !== "compensation_pending") {
        await this.dependencies.journal.transition(
          journal.transactionId,
          "compensation_pending",
          lease,
        );
      }
      const compensation = await this.dependencies.storage.compensate(journal, lease);
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
      await this.dependencies.storage.quarantine(journal, lease, diagnostics);
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
  outcome: AreaCreateRecoveryOutcome,
  diagnostics: readonly string[],
): AreaCreateRecoveryResult {
  return Object.freeze({
    transactionId,
    outcome,
    diagnostics: Object.freeze([...diagnostics]),
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
