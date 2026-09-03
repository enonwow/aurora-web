import type { AreaCreateIdempotencyEntry } from "../../domain/area-create-idempotency";
import type {
  AreaCreateModuleLease,
  AreaCreateModuleLockPort,
} from "./area-create-transaction.port";
import type { AreaDeleteAuthorizationPort } from "./area-delete.port";
import type { AreaDeleteCommand } from "../../domain/area-delete-command.validation";
import type {
  AreaDeleteCompiledCandidate,
  AreaDeleteJournalRecord,
  AreaDeleteJournalState,
  AreaDeleteModuleState,
  AreaDeletePersistedJournalRecord,
  AreaDeleteReadbackResult,
  AreaDeleteReceipt,
} from "../../domain/area-delete-transaction.types";

export const AREA_DELETE_MODULE_LOCK = Symbol("AREA_DELETE_MODULE_LOCK");
export const AREA_DELETE_IDEMPOTENCY = Symbol("AREA_DELETE_IDEMPOTENCY");
export const AREA_DELETE_JOURNAL = Symbol("AREA_DELETE_JOURNAL");
export const AREA_DELETE_TRANSACTION_STORAGE = Symbol("AREA_DELETE_TRANSACTION_STORAGE");
export const AREA_DELETE_RECOVERY_STORAGE = Symbol("AREA_DELETE_RECOVERY_STORAGE");
export const AREA_DELETE_COMPILER = Symbol("AREA_DELETE_COMPILER");

export type AreaDeleteModuleLockPort = AreaCreateModuleLockPort;

export interface AreaDeleteIdempotencyRepositoryPort {
  read(moduleId: string, key: string): Promise<AreaCreateIdempotencyEntry<AreaDeleteReceipt> | null>;
}

export interface AreaDeleteCompilerPort {
  compile(
    command: AreaDeleteCommand,
    moduleState: AreaDeleteModuleState,
    actorId: string,
    transactionId: string,
  ): Promise<AreaDeleteCompiledCandidate>;
}

export interface AreaDeleteTransactionStoragePort {
  readModuleState(moduleId: string): Promise<AreaDeleteModuleState>;
  stage(
    transactionId: string,
    moduleId: string,
    candidate: AreaDeleteCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<void>;
  commitResources(
    transactionId: string,
    moduleId: string,
    candidate: AreaDeleteCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<void>;
  commitModuleIfo(
    transactionId: string,
    moduleId: string,
    candidate: AreaDeleteCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<void>;
  readBack(
    transactionId: string,
    moduleId: string,
    candidate: AreaDeleteCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<AreaDeleteReadbackResult>;
  compensate(
    transactionId: string,
    moduleId: string,
    candidate: AreaDeleteCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<Readonly<{ restored: boolean; diagnostics: readonly string[] }>>;
  quarantine(
    moduleId: string,
    transactionId: string,
    diagnostics: readonly string[],
    lease: AreaCreateModuleLease,
  ): Promise<void>;
}

export interface AreaDeleteTransactionJournalPort {
  begin(record: AreaDeleteJournalRecord): Promise<void>;
  transition(
    transactionId: string,
    state: AreaDeleteJournalState,
    lease: AreaCreateModuleLease,
  ): Promise<void>;
  recordReadback(
    transactionId: string,
    lease: AreaCreateModuleLease,
    receipt: AreaDeleteReceipt,
  ): Promise<void>;
  finalize(
    transactionId: string,
    lease: AreaCreateModuleLease,
    entry: AreaCreateIdempotencyEntry<AreaDeleteReceipt>,
  ): Promise<void>;
  readJournal(transactionId: string): Promise<AreaDeletePersistedJournalRecord | null>;
  listRecoverable(limit: number): Promise<readonly AreaDeletePersistedJournalRecord[]>;
}

export interface AreaDeleteRecoveryStoragePort {
  verifyRecordedReadback(
    journal: AreaDeletePersistedJournalRecord,
    lease: AreaCreateModuleLease,
  ): Promise<Readonly<{ verified: boolean; diagnostics: readonly string[] }>>;
  compensate(
    journal: AreaDeletePersistedJournalRecord,
    lease: AreaCreateModuleLease,
  ): Promise<Readonly<{ restored: boolean; diagnostics: readonly string[] }>>;
  quarantine(
    journal: AreaDeletePersistedJournalRecord,
    lease: AreaCreateModuleLease,
    diagnostics: readonly string[],
  ): Promise<void>;
}

export interface AreaDeleteTransactionDependencies {
  readonly authorization: AreaDeleteAuthorizationPort;
  readonly lock: AreaDeleteModuleLockPort;
  readonly idempotency: AreaDeleteIdempotencyRepositoryPort;
  readonly storage: AreaDeleteTransactionStoragePort;
  readonly compiler: AreaDeleteCompilerPort;
  readonly journal: AreaDeleteTransactionJournalPort;
  readonly ids: Readonly<{ nextTransactionId(): string }>;
  readonly clock: Readonly<{ nowIso(): string }>;
}
