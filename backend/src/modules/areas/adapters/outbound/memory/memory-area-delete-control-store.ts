import type { AreaCreateIdempotencyEntry } from "../../../domain/area-create-idempotency";
import { createAreaCreateIdempotencyEntry } from "../../../domain/area-create-idempotency";
import {
  canTransitionAreaCreateJournal,
  isAreaCreateJournalBlocking,
  isAreaCreateJournalRecoverable,
} from "../../../domain/area-create-journal-policy";
import { createAreaDeleteCandidateManifest } from "../../../domain/area-delete-journal-policy";
import type {
  AreaDeleteJournalRecord,
  AreaDeleteJournalState,
  AreaDeletePersistedJournalRecord,
  AreaDeleteReceipt,
} from "../../../domain/area-delete-transaction.types";
import type {
  AreaDeleteIdempotencyRepositoryPort,
  AreaDeleteTransactionJournalPort,
} from "../../../application/ports/area-delete-transaction.port";
import type { AreaCreateModuleLease } from "../../../application/ports/area-create-transaction.port";
import {
  MemoryAreaCreateControlStore,
  type MemoryAreaMutationBlockingJournal,
  type MemoryAreaMutationJournalSource,
} from "./memory-area-create-control-store";

interface Options {
  readonly now?: () => Date;
}

interface MutableJournal extends AreaDeletePersistedJournalRecord {
  leaseId: string;
  fencingToken: number;
  state: AreaDeleteJournalState;
  receipt?: AreaDeleteReceipt;
  diagnostics: readonly string[];
  updatedAt: string;
}

export class MemoryAreaDeleteControlStore
  implements
    AreaDeleteIdempotencyRepositoryPort,
    AreaDeleteTransactionJournalPort,
    MemoryAreaMutationJournalSource
{
  private readonly now: () => Date;
  private readonly journals = new Map<string, MutableJournal>();
  private readonly idempotency = new Map<
    string,
    AreaCreateIdempotencyEntry<AreaDeleteReceipt>
  >();

  constructor(
    private readonly locks: MemoryAreaCreateControlStore,
    options: Options = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.locks.registerExternalJournalSource(this);
  }

  async read(
    moduleId: string,
    key: string,
  ): Promise<AreaCreateIdempotencyEntry<AreaDeleteReceipt> | null> {
    return this.idempotency.get(scopeKey(moduleId, key)) ?? null;
  }

  async begin(record: AreaDeleteJournalRecord): Promise<void> {
    const lease = leaseFromRecord(record);
    await this.locks.assertCurrent(lease);
    const existing = this.journals.get(record.transactionId);
    if (existing) {
      if (
        existing.moduleId === record.moduleId &&
        existing.areaResRef === record.areaResRef &&
        existing.commandHash === record.commandHash &&
        existing.idempotencyKey === record.idempotencyKey &&
        existing.previewSha256 === record.previewSha256
      ) return;
      throw controlError(
        "AREA_DELETE_JOURNAL_CONFLICT",
        "Transaction ID is already bound to another Area Delete command.",
      );
    }
    const now = this.nowIso();
    this.journals.set(record.transactionId, {
      transactionId: record.transactionId,
      moduleId: record.moduleId,
      areaResRef: record.areaResRef,
      actorId: record.actorId,
      idempotencyKey: record.idempotencyKey,
      commandHash: record.commandHash,
      expectedModuleRevision: record.expectedModuleRevision,
      previewSha256: record.previewSha256,
      leaseId: record.leaseId,
      fencingToken: record.fencingToken,
      state: "prepared",
      candidateManifest: createAreaDeleteCandidateManifest(record),
      diagnostics: Object.freeze([]),
      createdAt: record.createdAt,
      updatedAt: now,
    });
  }

  async transition(
    transactionId: string,
    state: AreaDeleteJournalState,
    lease: AreaCreateModuleLease,
  ): Promise<void> {
    await this.locks.assertCurrent(lease);
    const journal = this.requireJournal(transactionId, lease);
    if (journal.state === state) return;
    if (!canTransitionAreaCreateJournal(journal.state, state)) {
      throw controlError(
        "AREA_DELETE_JOURNAL_TRANSITION_INVALID",
        `Area Delete journal cannot transition from ${journal.state} to ${state}.`,
      );
    }
    journal.state = state;
    journal.updatedAt = this.nowIso();
  }

  async recordReadback(
    transactionId: string,
    lease: AreaCreateModuleLease,
    receipt: AreaDeleteReceipt,
  ): Promise<void> {
    await this.locks.assertCurrent(lease);
    const journal = this.requireJournal(transactionId, lease);
    if (journal.state === "readback_verified") {
      if (journal.receipt && sameJson(journal.receipt, receipt)) return;
      throw readbackConflict("Readback receipt differs from the retained receipt.");
    }
    if (journal.state !== "ifo_committed") {
      throw controlError(
        "AREA_DELETE_JOURNAL_TRANSITION_INVALID",
        "Delete readback can be recorded only after module-head publication.",
      );
    }
    assertReceiptIdentity(journal, receipt);
    journal.receipt = freezeClone(receipt);
    journal.state = "readback_verified";
    journal.updatedAt = this.nowIso();
  }

  async finalize(
    transactionId: string,
    lease: AreaCreateModuleLease,
    entry: AreaCreateIdempotencyEntry<AreaDeleteReceipt>,
  ): Promise<void> {
    await this.locks.assertCurrent(lease);
    const journal = this.requireJournal(transactionId, lease);
    const key = scopeKey(entry.moduleId, entry.key);
    const existing = this.idempotency.get(key);
    if (journal.state === "complete") {
      if (existing && sameIdempotency(existing, entry)) return;
      throw idempotencyConflict("Completed Delete differs from its retained result.");
    }
    if (journal.state !== "readback_verified") {
      throw controlError(
        "AREA_DELETE_JOURNAL_TRANSITION_INVALID",
        "Only a readback-verified Area Delete can be finalized.",
      );
    }
    if (!journal.receipt || !sameJson(journal.receipt, entry.result)) {
      throw idempotencyConflict(
        "Finalization result differs from the durable Area Delete receipt.",
      );
    }
    if (
      entry.moduleId !== journal.moduleId ||
      entry.key !== journal.idempotencyKey ||
      entry.commandHash !== journal.commandHash ||
      entry.result.transactionId !== journal.transactionId
    ) {
      throw idempotencyConflict("Finalization is outside the Area Delete scope.");
    }
    if (existing && !sameIdempotency(existing, entry)) {
      throw idempotencyConflict("Idempotency key is retained for another Delete result.");
    }
    this.idempotency.set(key, createAreaCreateIdempotencyEntry(entry));
    journal.state = "complete";
    journal.updatedAt = this.nowIso();
  }

  async readJournal(
    transactionId: string,
  ): Promise<AreaDeletePersistedJournalRecord | null> {
    const journal = this.journals.get(transactionId);
    return journal ? freezeClone(journal) : null;
  }

  async listRecoverable(
    limit: number,
  ): Promise<readonly AreaDeletePersistedJournalRecord[]> {
    const normalizedLimit = Math.min(Math.max(Math.trunc(limit), 1), 1_000);
    return Array.from(this.journals.values())
      .filter((journal) =>
        isAreaCreateJournalRecoverable(journal.state) &&
        !this.locks.hasActiveLease({
          moduleId: journal.moduleId,
          transactionId: journal.transactionId,
          leaseId: journal.leaseId,
          fencingToken: journal.fencingToken,
        }))
      .sort((left, right) =>
        left.createdAt.localeCompare(right.createdAt) ||
        left.transactionId.localeCompare(right.transactionId))
      .slice(0, normalizedLimit)
      .map((journal) => freezeClone(journal));
  }

  listBlocking(moduleId: string): readonly MemoryAreaMutationBlockingJournal[] {
    return Array.from(this.journals.values())
      .filter((journal) =>
        journal.moduleId === moduleId && isAreaCreateJournalBlocking(journal.state))
      .map(({ transactionId, state }) => Object.freeze({ transactionId, state }));
  }

  transferRecoveryLease(transactionId: string, lease: AreaCreateModuleLease): boolean {
    const journal = this.journals.get(transactionId);
    if (
      !journal ||
      journal.moduleId !== lease.moduleId ||
      journal.transactionId !== lease.ownerTransactionId ||
      !isAreaCreateJournalRecoverable(journal.state)
    ) return false;
    journal.leaseId = lease.leaseId;
    journal.fencingToken = lease.fencingToken;
    journal.updatedAt = this.nowIso();
    return true;
  }

  private requireJournal(
    transactionId: string,
    lease: AreaCreateModuleLease,
  ): MutableJournal {
    const journal = this.journals.get(transactionId);
    if (!journal) {
      throw controlError("AREA_DELETE_JOURNAL_MISSING", "Area Delete journal is missing.");
    }
    if (
      journal.moduleId !== lease.moduleId ||
      journal.leaseId !== lease.leaseId ||
      journal.fencingToken !== lease.fencingToken ||
      journal.transactionId !== lease.ownerTransactionId
    ) {
      throw controlError(
        "AREA_DELETE_CONTROL_FENCED",
        "Area Delete journal is owned by another fencing lease.",
      );
    }
    return journal;
  }

  private nowIso(): string {
    return this.now().toISOString();
  }
}

function assertReceiptIdentity(journal: MutableJournal, receipt: AreaDeleteReceipt): void {
  if (
    receipt.transactionId !== journal.transactionId ||
    receipt.moduleId !== journal.moduleId ||
    receipt.areaResRef !== journal.areaResRef ||
    receipt.commandHash !== journal.commandHash ||
    receipt.previousModuleRevision !== journal.expectedModuleRevision ||
    receipt.previewSha256 !== journal.previewSha256 ||
    receipt.scanVersion !== "area-delete-impact-scan.v1" ||
    receipt.survivorCount !== journal.candidateManifest.survivorCount ||
    receipt.blockerCount !== 0 ||
    receipt.readbackStatus !== "verified"
  ) {
    throw readbackConflict(
      "Readback receipt is outside the durable Area Delete journal identity.",
    );
  }
}

function leaseFromRecord(record: AreaDeleteJournalRecord): AreaCreateModuleLease {
  return {
    moduleId: record.moduleId,
    leaseId: record.leaseId,
    ownerTransactionId: record.transactionId,
    fencingToken: record.fencingToken,
    expiresAt: record.createdAt,
  };
}

function scopeKey(moduleId: string, key: string): string {
  return `${moduleId}\u0000${key}`;
}

function sameIdempotency(
  left: AreaCreateIdempotencyEntry<AreaDeleteReceipt>,
  right: AreaCreateIdempotencyEntry<AreaDeleteReceipt>,
): boolean {
  return left.moduleId === right.moduleId &&
    left.key === right.key &&
    left.commandHash === right.commandHash &&
    left.createdAt === right.createdAt &&
    sameJson(left.result, right.result);
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function readbackConflict(message: string): Error {
  return controlError("AREA_DELETE_READBACK_CONFLICT", message);
}

function idempotencyConflict(message: string): Error {
  return controlError("AREA_DELETE_IDEMPOTENCY_CONFLICT", message);
}

function controlError(code: string, message: string): Error {
  return new Error(`${code}: ${message}`);
}

function freezeClone<T>(value: T): T {
  return deepFreeze(structuredClone(value));
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  if (ArrayBuffer.isView(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
}
