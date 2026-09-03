import type { AreaCreateIdempotencyEntry } from "../../domain/area-create-idempotency";
import type {
  AreaCreateModuleLease,
  AreaCreateModuleLockPort,
  AreaCreateTransactionStoragePort,
} from "./area-create-transaction.port";
import type { AreaUpdateAuthorizationPort } from "./area-update-validation.port";
import type { AreaTileProductionAdmissionPort } from "./area-tile-production-admission.port";
import type { AreaUpdateCommand } from "../../domain/area-update-command.types";
import type {
  AreaUpdateCompiledCandidate,
  AreaUpdateJournalRecord,
  AreaUpdateJournalState,
  AreaUpdateModuleState,
  AreaUpdatePersistedJournalRecord,
  AreaUpdateReceipt,
} from "../../domain/area-update-transaction.types";

export const AREA_UPDATE_MODULE_LOCK = Symbol("AREA_UPDATE_MODULE_LOCK");
export const AREA_UPDATE_IDEMPOTENCY = Symbol("AREA_UPDATE_IDEMPOTENCY");
export const AREA_UPDATE_JOURNAL = Symbol("AREA_UPDATE_JOURNAL");
export const AREA_UPDATE_TRANSACTION_STORAGE = Symbol("AREA_UPDATE_TRANSACTION_STORAGE");
export const AREA_UPDATE_RECOVERY_STORAGE = Symbol("AREA_UPDATE_RECOVERY_STORAGE");
export const AREA_UPDATE_COMPILER = Symbol("AREA_UPDATE_COMPILER");

export type AreaUpdateModuleLockPort = AreaCreateModuleLockPort;

export interface AreaUpdateIdempotencyRepositoryPort {
  read(
    moduleId: string,
    key: string,
  ): Promise<AreaCreateIdempotencyEntry<AreaUpdateReceipt> | null>;
}

export type AreaUpdateTransactionStoragePort = Pick<
  AreaCreateTransactionStoragePort,
  | "readModuleState"
  | "stage"
  | "commitResources"
  | "commitModuleIfo"
  | "readBack"
  | "compensate"
  | "quarantine"
>;

export interface AreaUpdateCompilerPort {
  compile(
    command: AreaUpdateCommand,
    moduleState: AreaUpdateModuleState,
    actorId: string,
    transactionId: string,
  ): Promise<AreaUpdateCompiledCandidate>;
}

export interface AreaUpdateTransactionJournalPort {
  begin(record: AreaUpdateJournalRecord): Promise<void>;
  transition(
    transactionId: string,
    state: AreaUpdateJournalState,
    lease: AreaCreateModuleLease,
  ): Promise<void>;
  recordReadback(
    transactionId: string,
    lease: AreaCreateModuleLease,
    receipt: AreaUpdateReceipt,
  ): Promise<void>;
  finalize(
    transactionId: string,
    lease: AreaCreateModuleLease,
    entry: AreaCreateIdempotencyEntry<AreaUpdateReceipt>,
  ): Promise<void>;
  readJournal(transactionId: string): Promise<AreaUpdatePersistedJournalRecord | null>;
  listRecoverable(limit: number): Promise<readonly AreaUpdatePersistedJournalRecord[]>;
}

export interface AreaUpdateRecoveryStoragePort {
  verifyRecordedReadback(
    journal: AreaUpdatePersistedJournalRecord,
    lease: AreaCreateModuleLease,
  ): Promise<Readonly<{ verified: boolean; diagnostics: readonly string[] }>>;
  compensate(
    journal: AreaUpdatePersistedJournalRecord,
    lease: AreaCreateModuleLease,
  ): Promise<Readonly<{ restored: boolean; diagnostics: readonly string[] }>>;
  quarantine(
    journal: AreaUpdatePersistedJournalRecord,
    lease: AreaCreateModuleLease,
    diagnostics: readonly string[],
  ): Promise<void>;
}

export interface AreaUpdateTransactionDependencies {
  readonly authorization: AreaUpdateAuthorizationPort;
  readonly lock: AreaUpdateModuleLockPort;
  readonly idempotency: AreaUpdateIdempotencyRepositoryPort;
  readonly storage: AreaUpdateTransactionStoragePort;
  readonly compiler: AreaUpdateCompilerPort;
  readonly tileAdmission: AreaTileProductionAdmissionPort;
  readonly journal: AreaUpdateTransactionJournalPort;
  readonly ids: Readonly<{ nextTransactionId(): string }>;
  readonly clock: Readonly<{ nowIso(): string }>;
}
