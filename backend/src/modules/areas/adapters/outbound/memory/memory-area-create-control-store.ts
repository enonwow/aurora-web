import { randomUUID } from "node:crypto";
import type {
  AreaCreateLeaseGuardPort,
} from "../../../application/ports/atomic-module-snapshot.port";
import type {
  AreaCreateIdempotencyEntry,
} from "../../../domain/area-create-idempotency";
import {
  createAreaCreateIdempotencyEntry,
} from "../../../domain/area-create-idempotency";
import type {
  AreaCreateIdempotencyRepositoryPort,
  AreaCreateModuleLease,
  AreaCreateModuleLockPort,
  AreaCreateTransactionJournalPort,
} from "../../../application/ports/area-create-transaction.port";
import type {
  AreaCreateJournalRecord,
  AreaCreateJournalState,
  AreaCreatePersistedJournalRecord,
  AreaCreateReceipt,
} from "../../../domain/area-create-transaction.types";
import {
  canTransitionAreaCreateJournal,
  createAreaCreateCandidateManifest,
  isAreaCreateJournalBlocking,
  isAreaCreateJournalRecoverable,
} from "../../../domain/area-create-journal-policy";
import { sameAreaTileProductionAdmissionBinding } from "../../../domain/area-tile-production-admission";

export const AREA_CREATE_DEFAULT_LEASE_DURATION_MS = 30_000;

export interface MemoryAreaMutationBlockingJournal {
  readonly transactionId: string;
  readonly state: AreaCreateJournalState;
}

export interface MemoryAreaMutationJournalSource {
  listBlocking(moduleId: string): readonly MemoryAreaMutationBlockingJournal[];
  transferRecoveryLease(
    transactionId: string,
    lease: AreaCreateModuleLease,
  ): boolean;
}

interface MemoryAreaCreateControlStoreOptions {
  readonly leaseDurationMs?: number;
  readonly now?: () => Date;
  readonly nextLeaseId?: () => string;
}

interface MutableLockRecord {
  moduleId: string;
  leaseId: string | null;
  ownerTransactionId: string | null;
  fencingToken: number;
  expiresAtMs: number;
}

interface MutableJournalRecord extends AreaCreatePersistedJournalRecord {
  leaseId: string;
  fencingToken: number;
  state: AreaCreateJournalState;
  receipt?: AreaCreateReceipt;
  diagnostics: readonly string[];
  updatedAt: string;
}

export class MemoryAreaCreateControlStore
  implements
    AreaCreateLeaseGuardPort,
    AreaCreateModuleLockPort,
    AreaCreateIdempotencyRepositoryPort,
    AreaCreateTransactionJournalPort
{
  private readonly leaseDurationMs: number;
  private readonly now: () => Date;
  private readonly nextLeaseId: () => string;
  private readonly locks = new Map<string, MutableLockRecord>();
  private readonly journals = new Map<string, MutableJournalRecord>();
  private readonly externalJournalSources = new Set<MemoryAreaMutationJournalSource>();
  private readonly idempotency = new Map<
    string,
    AreaCreateIdempotencyEntry<AreaCreateReceipt>
  >();

  constructor(options: MemoryAreaCreateControlStoreOptions = {}) {
    this.leaseDurationMs =
      options.leaseDurationMs ?? AREA_CREATE_DEFAULT_LEASE_DURATION_MS;
    if (!Number.isInteger(this.leaseDurationMs) || this.leaseDurationMs <= 0) {
      throw new Error("Area Create lease duration must be a positive integer.");
    }
    this.now = options.now ?? (() => new Date());
    this.nextLeaseId = options.nextLeaseId ?? randomUUID;
  }

  registerExternalJournalSource(source: MemoryAreaMutationJournalSource): void {
    this.externalJournalSources.add(source);
  }

  hasActiveLease(input: Readonly<{
    moduleId: string;
    transactionId: string;
    leaseId: string;
    fencingToken: number;
  }>): boolean {
    const current = this.locks.get(input.moduleId);
    return Boolean(
      current?.leaseId === input.leaseId &&
      current.ownerTransactionId === input.transactionId &&
      current.fencingToken === input.fencingToken &&
      current.expiresAtMs > this.now().getTime(),
    );
  }

  async acquire(
    moduleId: string,
    transactionId: string,
    options: Readonly<{ recoveryOfTransactionId?: string }> = {},
  ): Promise<AreaCreateModuleLease | null> {
    const nowMs = this.now().getTime();
    const current = this.locks.get(moduleId);
    if (current?.leaseId && current.expiresAtMs > nowMs) {
      return null;
    }

    const blocking = this.blockingJournals(moduleId);
    const recoveryOf = options.recoveryOfTransactionId;
    if (blocking.length > 0) {
      if (
        blocking.length !== 1 ||
        blocking[0].transactionId !== recoveryOf ||
        blocking[0].state === "quarantine_required"
      ) {
        return null;
      }
    } else if (recoveryOf) {
      return null;
    }

    const ownerTransactionId = recoveryOf ?? transactionId;
    const leaseId = this.nextLeaseId();
    const fencingToken = (current?.fencingToken ?? 0) + 1;
    const expiresAtMs = nowMs + this.leaseDurationMs;
    const next: MutableLockRecord = {
      moduleId,
      leaseId,
      ownerTransactionId,
      fencingToken,
      expiresAtMs,
    };
    const lease = freezeClone({
      moduleId,
      leaseId,
      ownerTransactionId,
      fencingToken,
      expiresAt: new Date(expiresAtMs).toISOString(),
    });
    if (recoveryOf) {
      const journal = this.journals.get(recoveryOf);
      if (journal) {
        journal.leaseId = leaseId;
        journal.fencingToken = fencingToken;
        journal.updatedAt = this.nowIso();
      } else if (
        !blocking[0].source?.transferRecoveryLease(recoveryOf, lease)
      ) {
        return null;
      }
    }
    this.locks.set(moduleId, next);
    return lease;
  }

  async release(lease: AreaCreateModuleLease): Promise<boolean> {
    if (!this.isCurrentLease(lease)) {
      return false;
    }
    const current = this.locks.get(lease.moduleId)!;
    current.leaseId = null;
    current.ownerTransactionId = null;
    current.expiresAtMs = 0;
    return true;
  }

  async assertCurrent(lease: AreaCreateModuleLease): Promise<void> {
    this.assertCurrentLease(lease);
  }

  async read(
    moduleId: string,
    key: string,
  ): Promise<AreaCreateIdempotencyEntry<AreaCreateReceipt> | null> {
    return this.idempotency.get(scopeKey(moduleId, key)) ?? null;
  }

  async begin(record: AreaCreateJournalRecord): Promise<void> {
    const lease = leaseFromRecord(record);
    this.assertCurrentLease(lease);

    const existing = this.journals.get(record.transactionId);
    if (existing) {
      if (
        existing.moduleId === record.moduleId &&
        existing.commandHash === record.commandHash &&
        existing.idempotencyKey === record.idempotencyKey
      ) {
        return;
      }
      throw controlError(
        "AREA_CREATE_JOURNAL_CONFLICT",
        "Transaction ID is already bound to a different Area Create command.",
      );
    }

    const now = this.nowIso();
    this.journals.set(record.transactionId, {
      transactionId: record.transactionId,
      moduleId: record.moduleId,
      actorId: record.actorId,
      idempotencyKey: record.idempotencyKey,
      commandHash: record.commandHash,
      expectedModuleRevision: record.expectedModuleRevision,
      profileId: record.profileId,
      profileFingerprintSha256: record.profileFingerprintSha256,
      setFingerprintSha256: record.setFingerprintSha256,
      draftRevision: record.draftRevision,
      draftNormalizedSha256: record.draftNormalizedSha256,
      leaseId: record.leaseId,
      fencingToken: record.fencingToken,
      state: "prepared",
      candidateManifest: createAreaCreateCandidateManifest(record),
      diagnostics: Object.freeze([]),
      createdAt: record.createdAt,
      updatedAt: now,
    });
  }

  async transition(
    transactionId: string,
    state: AreaCreateJournalState,
    lease: AreaCreateModuleLease,
  ): Promise<void> {
    this.assertCurrentLease(lease);
    const journal = this.requireJournal(transactionId, lease);
    if (journal.state === state) {
      return;
    }
    if (!canTransitionAreaCreateJournal(journal.state, state)) {
      throw controlError(
        "AREA_CREATE_JOURNAL_TRANSITION_INVALID",
        `Area Create journal cannot transition from ${journal.state} to ${state}.`,
      );
    }
    journal.state = state;
    journal.updatedAt = this.nowIso();
  }

  async recordReadback(
    transactionId: string,
    lease: AreaCreateModuleLease,
    receipt: AreaCreateReceipt,
  ): Promise<void> {
    this.assertCurrentLease(lease);
    const journal = this.requireJournal(transactionId, lease);
    if (journal.state === "readback_verified") {
      if (journal.receipt && JSON.stringify(journal.receipt) === JSON.stringify(receipt)) {
        return;
      }
      throw controlError(
        "AREA_CREATE_READBACK_CONFLICT",
        "Readback receipt differs from the one already retained in the journal.",
      );
    }
    if (journal.state !== "ifo_committed") {
      throw controlError(
        "AREA_CREATE_JOURNAL_TRANSITION_INVALID",
        "Readback can be recorded only after IFO commit.",
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
    entry: AreaCreateIdempotencyEntry<AreaCreateReceipt>,
  ): Promise<void> {
    this.assertCurrentLease(lease);
    const journal = this.requireJournal(transactionId, lease);
    const storageKey = scopeKey(entry.moduleId, entry.key);
    const existing = this.idempotency.get(storageKey);

    if (journal.state === "complete") {
      if (existing && sameIdempotencyEntry(existing, entry)) {
        return;
      }
      throw controlError(
        "AREA_CREATE_IDEMPOTENCY_CONFLICT",
        "Completed journal does not match the retained idempotency result.",
      );
    }
    if (journal.state !== "readback_verified") {
      throw controlError(
        "AREA_CREATE_JOURNAL_TRANSITION_INVALID",
        "Only a readback-verified Area Create transaction can be finalized.",
      );
    }
    if (!journal.receipt || JSON.stringify(journal.receipt) !== JSON.stringify(entry.result)) {
      throw controlError(
        "AREA_CREATE_IDEMPOTENCY_CONFLICT",
        "Finalization result differs from the durable readback receipt.",
      );
    }
    if (
      entry.moduleId !== journal.moduleId ||
      entry.key !== journal.idempotencyKey ||
      entry.commandHash !== journal.commandHash ||
      entry.result.transactionId !== journal.transactionId
    ) {
      throw controlError(
        "AREA_CREATE_IDEMPOTENCY_CONFLICT",
        "Finalization result is outside the journal identity scope.",
      );
    }
    if (existing && !sameIdempotencyEntry(existing, entry)) {
      throw controlError(
        "AREA_CREATE_IDEMPOTENCY_CONFLICT",
        "Idempotency key is already retained for another Area Create result.",
      );
    }

    const retained = createAreaCreateIdempotencyEntry(entry);
    this.idempotency.set(storageKey, retained);
    journal.state = "complete";
    journal.updatedAt = this.nowIso();
  }

  async readJournal(
    transactionId: string,
  ): Promise<AreaCreatePersistedJournalRecord | null> {
    const journal = this.journals.get(transactionId);
    return journal ? freezeClone(journal) : null;
  }

  async listRecoverable(
    limit: number,
  ): Promise<readonly AreaCreatePersistedJournalRecord[]> {
    const normalizedLimit = Math.min(Math.max(Math.trunc(limit), 1), 1_000);
    const nowMs = this.now().getTime();
    return Array.from(this.journals.values())
      .filter((journal) => {
        if (!isAreaCreateJournalRecoverable(journal.state)) {
          return false;
        }
        const lock = this.locks.get(journal.moduleId);
        return !lock?.leaseId || lock.expiresAtMs <= nowMs;
      })
      .sort(
        (left, right) =>
          left.createdAt.localeCompare(right.createdAt) ||
          left.transactionId.localeCompare(right.transactionId),
      )
      .slice(0, normalizedLimit)
      .map((journal) => freezeClone(journal));
  }

  private blockingJournals(moduleId: string): Array<
    MemoryAreaMutationBlockingJournal & {
      readonly source?: MemoryAreaMutationJournalSource;
    }
  > {
    const own = Array.from(this.journals.values())
      .filter(
        (journal) =>
          journal.moduleId === moduleId &&
          isAreaCreateJournalBlocking(journal.state),
      )
      .map(({ transactionId, state }) => ({ transactionId, state }));
    const external = Array.from(this.externalJournalSources).flatMap((source) =>
      source
        .listBlocking(moduleId)
        .filter((journal) => isAreaCreateJournalBlocking(journal.state))
        .map((journal) => ({ ...journal, source })),
    );
    return [...own, ...external];
  }

  private requireJournal(
    transactionId: string,
    lease: AreaCreateModuleLease,
  ): MutableJournalRecord {
    const journal = this.journals.get(transactionId);
    if (!journal) {
      throw controlError(
        "AREA_CREATE_JOURNAL_MISSING",
        "Area Create journal does not exist.",
      );
    }
    if (
      journal.moduleId !== lease.moduleId ||
      journal.leaseId !== lease.leaseId ||
      journal.fencingToken !== lease.fencingToken ||
      journal.transactionId !== lease.ownerTransactionId
    ) {
      throw controlError(
        "AREA_CREATE_CONTROL_FENCED",
        "Area Create journal is owned by another fencing lease.",
      );
    }
    return journal;
  }

  private assertCurrentLease(lease: AreaCreateModuleLease): void {
    const failure = this.currentLeaseFailure(lease);
    if (failure) {
      throw controlError(
        "AREA_CREATE_CONTROL_FENCED",
        `Area Create module lease is missing, expired, or superseded (${failure}).`,
      );
    }
  }

  private isCurrentLease(lease: AreaCreateModuleLease): boolean {
    return this.currentLeaseFailure(lease) === null;
  }

  private currentLeaseFailure(lease: AreaCreateModuleLease): string | null {
    const current = this.locks.get(lease.moduleId);
    if (!current) return "lock_missing";
    if (current.leaseId !== lease.leaseId) return "lease_id_mismatch";
    if (current.ownerTransactionId !== lease.ownerTransactionId) {
      return "owner_transaction_mismatch";
    }
    if (current.fencingToken !== lease.fencingToken) return "fencing_token_mismatch";
    if (current.expiresAtMs <= this.now().getTime()) return "lease_expired";
    return null;
  }

  private nowIso(): string {
    return this.now().toISOString();
  }
}

function leaseFromRecord(record: AreaCreateJournalRecord): AreaCreateModuleLease {
  return {
    moduleId: record.moduleId,
    leaseId: record.leaseId,
    ownerTransactionId: record.transactionId,
    fencingToken: record.fencingToken,
    expiresAt: record.createdAt,
  };
}

function sameIdempotencyEntry(
  left: AreaCreateIdempotencyEntry<AreaCreateReceipt>,
  right: AreaCreateIdempotencyEntry<AreaCreateReceipt>,
): boolean {
  return (
    left.moduleId === right.moduleId &&
    left.key === right.key &&
    left.commandHash === right.commandHash &&
    left.createdAt === right.createdAt &&
    JSON.stringify(left.result) === JSON.stringify(right.result)
  );
}

function assertReceiptIdentity(
  journal: MutableJournalRecord,
  receipt: AreaCreateReceipt,
): void {
  if (
    receipt.transactionId !== journal.transactionId ||
    receipt.moduleId !== journal.moduleId ||
    receipt.commandHash !== journal.commandHash ||
    receipt.profileId !== journal.profileId ||
    receipt.profileFingerprintSha256 !== journal.profileFingerprintSha256 ||
    receipt.setFingerprintSha256 !== journal.setFingerprintSha256 ||
    !sameAreaTileProductionAdmissionBinding(
      receipt.tileProductionAdmission,
      journal.candidateManifest.tileProductionAdmission,
    ) ||
    receipt.draftNormalizedSha256 !== journal.draftNormalizedSha256 ||
    receipt.readbackStatus !== "verified"
  ) {
    throw controlError(
      "AREA_CREATE_READBACK_CONFLICT",
      "Readback receipt is outside the durable journal identity scope.",
    );
  }
}

function scopeKey(moduleId: string, key: string): string {
  return `${moduleId}\u0000${key}`;
}

function controlError(code: string, message: string): Error {
  return new Error(`${code}: ${message}`);
}

function freezeClone<T>(value: T): T {
  return deepFreeze(structuredClone(value));
}

function deepFreeze<T>(value: T): T {
  if (Object(value) !== value) {
    return value;
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}
