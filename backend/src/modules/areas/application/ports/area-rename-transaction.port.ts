import type { AreaCreateModuleLease } from "./area-create-transaction.port";
import type { AreaCreateModuleLockPort } from "./area-create-transaction.port";
import type { AreaCreateIdempotencyEntry } from "../../domain/area-create-idempotency";
import type { AreaRenameCommand } from "../../domain/area-rename-command.validation";
import type {
  AreaRenameCompiledCandidate,
  AreaRenameJournalRecord,
  AreaRenameJournalState,
  AreaRenameModuleState,
  AreaRenamePersistedJournalRecord,
  AreaRenameReadbackResult,
  AreaRenameReceipt,
} from "../../domain/area-rename-transaction.types";

export const AREA_RENAME_TRANSACTION_STORAGE = Symbol("AREA_RENAME_TRANSACTION_STORAGE");
export const AREA_RENAME_RECOVERY_STORAGE = Symbol("AREA_RENAME_RECOVERY_STORAGE");
export const AREA_RENAME_COMPILER = Symbol("AREA_RENAME_COMPILER");
export const AREA_RENAME_AUTHORIZATION = Symbol("AREA_RENAME_AUTHORIZATION");
export const AREA_RENAME_MODULE_LOCK = Symbol("AREA_RENAME_MODULE_LOCK");
export const AREA_RENAME_IDEMPOTENCY = Symbol("AREA_RENAME_IDEMPOTENCY");
export const AREA_RENAME_JOURNAL = Symbol("AREA_RENAME_JOURNAL");

export type AreaRenameModuleLockPort = AreaCreateModuleLockPort;

export interface AreaRenameAuthorizationPort {
  authorize(input: Readonly<{
    actorId: string;
    moduleId: string;
    permission: "area.materialize.rename";
  }>): Promise<boolean>;
}

export interface AreaRenameIdempotencyRepositoryPort {
  read(moduleId: string, key: string): Promise<AreaCreateIdempotencyEntry<AreaRenameReceipt> | null>;
}

export interface AreaRenameCompilerPort {
  compile(
    command: AreaRenameCommand,
    moduleState: AreaRenameModuleState,
    actorId: string,
    transactionId: string,
  ): Promise<AreaRenameCompiledCandidate>;
}

export interface AreaRenameTransactionJournalPort {
  begin(record: AreaRenameJournalRecord): Promise<void>;
  transition(
    transactionId: string,
    state: AreaRenameJournalState,
    lease: AreaCreateModuleLease,
  ): Promise<void>;
  recordReadback(
    transactionId: string,
    lease: AreaCreateModuleLease,
    receipt: AreaRenameReceipt,
  ): Promise<void>;
  finalize(
    transactionId: string,
    lease: AreaCreateModuleLease,
    entry: AreaCreateIdempotencyEntry<AreaRenameReceipt>,
  ): Promise<void>;
  readJournal(transactionId: string): Promise<AreaRenamePersistedJournalRecord | null>;
  listRecoverable(limit: number): Promise<readonly AreaRenamePersistedJournalRecord[]>;
}

export interface AreaRenameTransactionStoragePort {
  readModuleState(moduleId: string): Promise<AreaRenameModuleState>;
  stage(
    transactionId: string,
    moduleId: string,
    candidate: AreaRenameCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<void>;
  commitResources(
    transactionId: string,
    moduleId: string,
    candidate: AreaRenameCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<void>;
  commitModuleIfo(
    transactionId: string,
    moduleId: string,
    candidate: AreaRenameCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<void>;
  readBack(
    transactionId: string,
    moduleId: string,
    candidate: AreaRenameCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<AreaRenameReadbackResult>;
  compensate(
    transactionId: string,
    moduleId: string,
    candidate: AreaRenameCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<Readonly<{ restored: boolean; diagnostics: readonly string[] }>>;
  quarantine(
    moduleId: string,
    transactionId: string,
    diagnostics: readonly string[],
    lease: AreaCreateModuleLease,
  ): Promise<void>;
}

export interface AreaRenameRecoveryStoragePort {
  verifyRecordedReadback(
    journal: AreaRenamePersistedJournalRecord,
    lease: AreaCreateModuleLease,
  ): Promise<Readonly<{ verified: boolean; diagnostics: readonly string[] }>>;
  compensate(
    journal: AreaRenamePersistedJournalRecord,
    lease: AreaCreateModuleLease,
  ): Promise<Readonly<{ restored: boolean; diagnostics: readonly string[] }>>;
  quarantine(
    journal: AreaRenamePersistedJournalRecord,
    lease: AreaCreateModuleLease,
    diagnostics: readonly string[],
  ): Promise<void>;
}

export interface AreaRenameTransactionDependencies {
  readonly authorization: AreaRenameAuthorizationPort;
  readonly lock: AreaRenameModuleLockPort;
  readonly idempotency: AreaRenameIdempotencyRepositoryPort;
  readonly storage: AreaRenameTransactionStoragePort;
  readonly compiler: AreaRenameCompilerPort;
  readonly journal: AreaRenameTransactionJournalPort;
  readonly ids: Readonly<{ nextTransactionId(): string }>;
  readonly clock: Readonly<{ nowIso(): string }>;
}
