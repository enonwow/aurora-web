import type {
  AreaCreateIdempotencyEntry,
} from "../../domain/area-create-idempotency";
import type { AreaCreateCommand } from "../../domain/area-create-command.types";
import type {
  AreaCreateCandidateValidationResult,
  AreaCreateCompiledCandidate,
  AreaCreateJournalRecord,
  AreaCreateJournalState,
  AreaCreateModuleState,
  AreaCreatePersistedJournalRecord,
  AreaCreateReadbackResult,
  AreaCreateReceipt,
} from "../../domain/area-create-transaction.types";
import type { AreaTileProductionAdmissionPort } from "./area-tile-production-admission.port";

export const AREA_CREATE_TRANSACTION_STORAGE = Symbol(
  "AREA_CREATE_TRANSACTION_STORAGE",
);
export const AREA_CREATE_RECOVERY_STORAGE = Symbol("AREA_CREATE_RECOVERY_STORAGE");
export const AREA_CREATE_AUTHORIZATION = Symbol("AREA_CREATE_AUTHORIZATION");
export const AREA_CREATE_MODULE_LOCK = Symbol("AREA_CREATE_MODULE_LOCK");
export const AREA_CREATE_IDEMPOTENCY = Symbol("AREA_CREATE_IDEMPOTENCY");
export const AREA_CREATE_JOURNAL = Symbol("AREA_CREATE_JOURNAL");
export const AREA_CREATE_COMPILER = Symbol("AREA_CREATE_COMPILER");
export const AREA_CREATE_CANDIDATE_VALIDATOR = Symbol(
  "AREA_CREATE_CANDIDATE_VALIDATOR",
);
export const AREA_CREATE_TILESET_SOURCE = Symbol("AREA_CREATE_TILESET_SOURCE");

export type AreaCreateCompilerFailureCode =
  | "AREA_CREATE_PROFILE_UNSUPPORTED"
  | "AREA_CREATE_PROFILE_STALE"
  | "AREA_CREATE_TILESET_STALE"
  | "AREA_CREATE_DRAFT_INVALID"
  | "AREA_CREATE_STORAGE_UNAVAILABLE";

export class AreaCreateCompilerFailure extends Error {
  constructor(
    readonly code: AreaCreateCompilerFailureCode,
    readonly status: number,
    message: string,
    readonly details: readonly string[] = [],
  ) {
    super(message);
    this.name = "AreaCreateCompilerFailure";
  }
}

export interface AreaCreateAuthorizationPort {
  authorize(input: {
    readonly actorId: string;
    readonly moduleId: string;
    readonly permission: "area.create";
  }): Promise<boolean>;
}

export interface AreaCreateModuleLease {
  readonly leaseId: string;
  readonly moduleId: string;
  readonly ownerTransactionId: string;
  readonly fencingToken: number;
  readonly expiresAt: string;
}

export interface AreaCreateModuleLockPort {
  acquire(
    moduleId: string,
    transactionId: string,
    options?: Readonly<{ recoveryOfTransactionId?: string }>,
  ): Promise<AreaCreateModuleLease | null>;
  release(lease: AreaCreateModuleLease): Promise<boolean>;
}

export interface AreaCreateIdempotencyRepositoryPort {
  read(
    moduleId: string,
    key: string,
  ): Promise<AreaCreateIdempotencyEntry<AreaCreateReceipt> | null>;
}

export interface AreaCreateCompilerPort {
  compile(
    command: AreaCreateCommand,
    moduleState: AreaCreateModuleState,
    transactionId: string,
  ): Promise<AreaCreateCompiledCandidate>;
}

export interface AreaCreateTilesetSourcePort {
  resolve(resRef: string): Promise<Readonly<{
    resRef: string;
    fingerprintSha256: string;
  }>>;
}

export interface AreaCreateCandidateValidatorPort {
  readonly version?: string;
  validate(
    command: AreaCreateCommand,
    candidate: AreaCreateCompiledCandidate,
  ): Promise<AreaCreateCandidateValidationResult>;
}

export interface AreaCreateCompensationResult {
  readonly restored: boolean;
  readonly diagnostics: readonly string[];
}

export interface AreaCreateTransactionStoragePort {
  readModuleState(moduleId: string): Promise<AreaCreateModuleState>;
  findResourceCollisions(
    moduleId: string,
    resRef: string,
    extensions: readonly ["are", "git", "gic"],
  ): Promise<readonly string[]>;
  stage(
    transactionId: string,
    moduleId: string,
    candidate: AreaCreateCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<void>;
  commitResources(
    transactionId: string,
    moduleId: string,
    candidate: AreaCreateCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<void>;
  commitModuleIfo(
    transactionId: string,
    moduleId: string,
    candidate: AreaCreateCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<void>;
  readBack(
    transactionId: string,
    moduleId: string,
    candidate: AreaCreateCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<AreaCreateReadbackResult>;
  compensate(
    transactionId: string,
    moduleId: string,
    candidate: AreaCreateCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<AreaCreateCompensationResult>;
  quarantine(
    moduleId: string,
    transactionId: string,
    diagnostics: readonly string[],
    lease: AreaCreateModuleLease,
  ): Promise<void>;
}

export interface AreaCreateTransactionJournalPort {
  begin(record: AreaCreateJournalRecord): Promise<void>;
  transition(
    transactionId: string,
    state: AreaCreateJournalState,
    lease: AreaCreateModuleLease,
  ): Promise<void>;
  /** Atomically records the verified receipt and advances ifo_committed -> readback_verified. */
  recordReadback(
    transactionId: string,
    lease: AreaCreateModuleLease,
    receipt: AreaCreateReceipt,
  ): Promise<void>;
  /**
   * Atomically retains the immutable idempotency result and marks the journal
   * complete. Implementations must not expose only one half of this write.
   */
  finalize(
    transactionId: string,
    lease: AreaCreateModuleLease,
    entry: AreaCreateIdempotencyEntry<AreaCreateReceipt>,
  ): Promise<void>;
  readJournal(transactionId: string): Promise<AreaCreatePersistedJournalRecord | null>;
  listRecoverable(limit: number): Promise<readonly AreaCreatePersistedJournalRecord[]>;
}

export interface AreaCreateTransactionDependencies {
  readonly authorization: AreaCreateAuthorizationPort;
  readonly lock: AreaCreateModuleLockPort;
  readonly idempotency: AreaCreateIdempotencyRepositoryPort;
  readonly storage: AreaCreateTransactionStoragePort;
  readonly compiler: AreaCreateCompilerPort;
  readonly validator: AreaCreateCandidateValidatorPort;
  readonly tileAdmission: AreaTileProductionAdmissionPort;
  readonly journal: AreaCreateTransactionJournalPort;
  readonly ids: Readonly<{ nextTransactionId(): string }>;
  readonly clock: Readonly<{ nowIso(): string }>;
}

export interface AreaCreateRecoveryStoragePort {
  verifyRecordedReadback(
    journal: AreaCreatePersistedJournalRecord,
    lease: AreaCreateModuleLease,
  ): Promise<Readonly<{ verified: boolean; diagnostics: readonly string[] }>>;
  compensate(
    journal: AreaCreatePersistedJournalRecord,
    lease: AreaCreateModuleLease,
  ): Promise<AreaCreateCompensationResult>;
  quarantine(
    journal: AreaCreatePersistedJournalRecord,
    lease: AreaCreateModuleLease,
    diagnostics: readonly string[],
  ): Promise<void>;
}
