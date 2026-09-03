import type { AreaCreateIdempotencyEntry } from "../../domain/area-create-idempotency";
import type { AreaUpdateAuthorizationPort } from "./area-update-validation.port";
import type {
  AreaCreateModuleLease,
  AreaCreateModuleLockPort,
} from "./area-create-transaction.port";
import type { NwnScriptCompilerPort } from "./nwn-script-compiler.port";
import type { NwnScriptSourceSnapshotPort } from "./nwn-script-source-snapshot.port";
import type { AreaEventScriptPublicationStoragePort } from "./area-event-script-publication-storage.port";
import type {
  AreaEventScriptPublicationJournalRecord,
  AreaEventScriptPublicationPersistedJournalRecord,
  AreaEventScriptPublicationReceipt,
} from "../../domain/area-event-script-publication.types";
import type { AreaCreateJournalState } from "../../domain/area-create-transaction.types";

export const AREA_EVENT_SCRIPT_PUBLICATION_IDEMPOTENCY = Symbol(
  "AREA_EVENT_SCRIPT_PUBLICATION_IDEMPOTENCY",
);
export const AREA_EVENT_SCRIPT_PUBLICATION_JOURNAL = Symbol(
  "AREA_EVENT_SCRIPT_PUBLICATION_JOURNAL",
);

export interface AreaEventScriptPublicationIdempotencyPort {
  read(
    moduleId: string,
    key: string,
  ): Promise<AreaCreateIdempotencyEntry<AreaEventScriptPublicationReceipt> | null>;
}

export interface AreaEventScriptPublicationJournalPort {
  begin(record: AreaEventScriptPublicationJournalRecord): Promise<void>;
  transition(
    transactionId: string,
    state: AreaCreateJournalState,
    lease: AreaCreateModuleLease,
  ): Promise<void>;
  recordReadback(
    transactionId: string,
    lease: AreaCreateModuleLease,
    receipt: AreaEventScriptPublicationReceipt,
  ): Promise<void>;
  finalize(
    transactionId: string,
    lease: AreaCreateModuleLease,
    entry: AreaCreateIdempotencyEntry<AreaEventScriptPublicationReceipt>,
  ): Promise<void>;
  readJournal(
    transactionId: string,
  ): Promise<AreaEventScriptPublicationPersistedJournalRecord | null>;
  listRecoverable(
    limit: number,
  ): Promise<readonly AreaEventScriptPublicationPersistedJournalRecord[]>;
}

export interface AreaEventScriptPublicationTransactionDependencies {
  readonly authorization: AreaUpdateAuthorizationPort;
  readonly sourceSnapshot: NwnScriptSourceSnapshotPort;
  readonly compiler: NwnScriptCompilerPort;
  readonly lock: AreaCreateModuleLockPort;
  readonly idempotency: AreaEventScriptPublicationIdempotencyPort;
  readonly storage: AreaEventScriptPublicationStoragePort;
  readonly journal: AreaEventScriptPublicationJournalPort;
  readonly ids: Readonly<{ nextTransactionId(): string }>;
  readonly clock: Readonly<{ nowIso(): string }>;
}
