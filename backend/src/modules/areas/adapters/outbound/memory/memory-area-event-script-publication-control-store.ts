import type { AreaCreateIdempotencyEntry } from "../../../domain/area-create-idempotency";
import { createAreaCreateIdempotencyEntry } from "../../../domain/area-create-idempotency";
import {
  canTransitionAreaCreateJournal,
  isAreaCreateJournalBlocking,
  isAreaCreateJournalRecoverable,
} from "../../../domain/area-create-journal-policy";
import {
  createAreaEventScriptPublicationCandidateManifest,
  type AreaEventScriptPublicationJournalRecord,
  type AreaEventScriptPublicationPersistedJournalRecord,
  type AreaEventScriptPublicationReceipt,
} from "../../../domain/area-event-script-publication.types";
import type {
  AreaEventScriptPublicationIdempotencyPort,
  AreaEventScriptPublicationJournalPort,
} from "../../../application/ports/area-event-script-publication.port";
import type { AreaCreateModuleLease } from "../../../application/ports/area-create-transaction.port";
import {
  MemoryAreaCreateControlStore,
  type MemoryAreaMutationBlockingJournal,
  type MemoryAreaMutationJournalSource,
} from "./memory-area-create-control-store";

interface MemoryAreaEventScriptPublicationControlStoreOptions {
  readonly now?: () => Date;
}

interface MutableJournal extends AreaEventScriptPublicationPersistedJournalRecord {
  leaseId: string;
  fencingToken: number;
  state: AreaEventScriptPublicationPersistedJournalRecord["state"];
  receipt?: AreaEventScriptPublicationReceipt;
  diagnostics: readonly string[];
  updatedAt: string;
}

export class MemoryAreaEventScriptPublicationControlStore
  implements
    AreaEventScriptPublicationIdempotencyPort,
    AreaEventScriptPublicationJournalPort,
    MemoryAreaMutationJournalSource
{
  private readonly now: () => Date;
  private readonly journals = new Map<string, MutableJournal>();
  private readonly idempotency = new Map<
    string,
    AreaCreateIdempotencyEntry<AreaEventScriptPublicationReceipt>
  >();

  constructor(
    private readonly locks: MemoryAreaCreateControlStore,
    options: MemoryAreaEventScriptPublicationControlStoreOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.locks.registerExternalJournalSource(this);
  }

  async read(
    moduleId: string,
    key: string,
  ): Promise<AreaCreateIdempotencyEntry<AreaEventScriptPublicationReceipt> | null> {
    return this.idempotency.get(scopeKey(moduleId, key)) ?? null;
  }

  async begin(record: AreaEventScriptPublicationJournalRecord): Promise<void> {
    const lease = leaseFromRecord(record);
    await this.locks.assertCurrent(lease);
    const existing = this.journals.get(record.transactionId);
    if (existing) {
      if (
        existing.moduleId === record.moduleId &&
        existing.targetResRef === record.targetResRef &&
        existing.commandHash === record.commandHash &&
        existing.idempotencyKey === record.idempotencyKey
      ) return;
      throw controlError(
        "AREA_EVENT_SCRIPT_JOURNAL_CONFLICT",
        "Transaction ID is already bound to another script publication.",
      );
    }
    this.journals.set(record.transactionId, {
      transactionId: record.transactionId,
      moduleId: record.moduleId,
      targetResRef: record.targetResRef,
      actorId: record.actorId,
      idempotencyKey: record.idempotencyKey,
      commandHash: record.commandHash,
      expectedModuleRevision: record.expectedModuleRevision,
      leaseId: record.leaseId,
      fencingToken: record.fencingToken,
      state: "prepared",
      candidateManifest: createAreaEventScriptPublicationCandidateManifest(record.candidate),
      diagnostics: Object.freeze([]),
      createdAt: record.createdAt,
      updatedAt: this.nowIso(),
    });
  }

  async transition(
    transactionId: string,
    state: AreaEventScriptPublicationPersistedJournalRecord["state"],
    lease: AreaCreateModuleLease,
  ): Promise<void> {
    await this.locks.assertCurrent(lease);
    const journal = this.requireJournal(transactionId, lease);
    if (journal.state === state) return;
    if (!canTransitionAreaCreateJournal(journal.state, state)) {
      throw controlError(
        "AREA_EVENT_SCRIPT_JOURNAL_TRANSITION_INVALID",
        `Script publication journal cannot transition from ${journal.state} to ${state}.`,
      );
    }
    journal.state = state;
    journal.updatedAt = this.nowIso();
  }

  async recordReadback(
    transactionId: string,
    lease: AreaCreateModuleLease,
    receipt: AreaEventScriptPublicationReceipt,
  ): Promise<void> {
    await this.locks.assertCurrent(lease);
    const journal = this.requireJournal(transactionId, lease);
    if (journal.state === "readback_verified") {
      if (journal.receipt && sameJson(journal.receipt, receipt)) return;
      throw readbackConflict("Readback receipt differs from the retained receipt.");
    }
    if (journal.state !== "ifo_committed") {
      throw controlError(
        "AREA_EVENT_SCRIPT_JOURNAL_TRANSITION_INVALID",
        "Readback can be recorded only after module-head publication.",
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
    entry: AreaCreateIdempotencyEntry<AreaEventScriptPublicationReceipt>,
  ): Promise<void> {
    await this.locks.assertCurrent(lease);
    const journal = this.requireJournal(transactionId, lease);
    const key = scopeKey(entry.moduleId, entry.key);
    const existing = this.idempotency.get(key);
    if (journal.state === "complete") {
      if (existing && sameIdempotency(existing, entry)) return;
      throw idempotencyConflict("Completed journal differs from retained idempotency.");
    }
    if (journal.state !== "readback_verified" || !journal.receipt) {
      throw controlError(
        "AREA_EVENT_SCRIPT_JOURNAL_TRANSITION_INVALID",
        "Only a readback-verified script publication can be finalized.",
      );
    }
    if (
      !sameJson(journal.receipt, entry.result) ||
      entry.moduleId !== journal.moduleId ||
      entry.key !== journal.idempotencyKey ||
      entry.commandHash !== journal.commandHash ||
      entry.result.transactionId !== journal.transactionId
    ) {
      throw idempotencyConflict("Finalization is outside the journal identity.");
    }
    if (existing && !sameIdempotency(existing, entry)) {
      throw idempotencyConflict("Idempotency key is retained for another publication.");
    }
    this.idempotency.set(key, createAreaCreateIdempotencyEntry(entry));
    journal.state = "complete";
    journal.updatedAt = this.nowIso();
  }

  async readJournal(
    transactionId: string,
  ): Promise<AreaEventScriptPublicationPersistedJournalRecord | null> {
    const journal = this.journals.get(transactionId);
    return journal ? freezeClone(journal) : null;
  }

  async listRecoverable(
    limit: number,
  ): Promise<readonly AreaEventScriptPublicationPersistedJournalRecord[]> {
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

  transferRecoveryLease(
    transactionId: string,
    lease: AreaCreateModuleLease,
  ): boolean {
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
      throw controlError("AREA_EVENT_SCRIPT_JOURNAL_MISSING", "Journal does not exist.");
    }
    if (
      journal.moduleId !== lease.moduleId ||
      journal.leaseId !== lease.leaseId ||
      journal.fencingToken !== lease.fencingToken ||
      journal.transactionId !== lease.ownerTransactionId
    ) {
      throw controlError(
        "AREA_EVENT_SCRIPT_CONTROL_FENCED",
        "Script publication journal is owned by another fencing lease.",
      );
    }
    return journal;
  }

  private nowIso(): string {
    return this.now().toISOString();
  }
}

function assertReceiptIdentity(
  journal: MutableJournal,
  receipt: AreaEventScriptPublicationReceipt,
): void {
  const manifest = journal.candidateManifest;
  if (
    receipt.transactionId !== journal.transactionId ||
    receipt.moduleId !== journal.moduleId ||
    receipt.targetResRef !== journal.targetResRef ||
    receipt.commandHash !== journal.commandHash ||
    receipt.previousModuleRevision !== journal.expectedModuleRevision ||
    receipt.sourceSha256 !== manifest.sourceSha256 ||
    receipt.includeSetSha256 !== manifest.includeSetSha256 ||
    receipt.executionProfileSha256 !== manifest.executionProfileSha256 ||
    receipt.compilerReceiptSha256 !== manifest.compilerReceiptSha256 ||
    !sameJson(receipt.provider, manifest.provider) ||
    !sameJson(receipt.resources, manifest.resources) ||
    receipt.readbackStatus !== "verified"
  ) {
    throw readbackConflict("Readback receipt is outside the durable journal identity.");
  }
}

function leaseFromRecord(
  record: AreaEventScriptPublicationJournalRecord,
): AreaCreateModuleLease {
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
  left: AreaCreateIdempotencyEntry<AreaEventScriptPublicationReceipt>,
  right: AreaCreateIdempotencyEntry<AreaEventScriptPublicationReceipt>,
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
  return controlError("AREA_EVENT_SCRIPT_READBACK_CONFLICT", message);
}

function idempotencyConflict(message: string): Error {
  return controlError("AREA_EVENT_SCRIPT_IDEMPOTENCY_CONFLICT", message);
}

function controlError(code: string, message: string): Error {
  return new Error(`${code}: ${message}`);
}

function freezeClone<T>(value: T): T {
  return deepFreeze(structuredClone(value));
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
}
