import type { AreaCreateModuleLease } from "./area-create-transaction.port";
import type {
  AreaEventScriptPublicationCandidate,
  AreaEventScriptPublicationPersistedJournalRecord,
  AreaEventScriptPublicationReadbackResult,
} from "../../domain/area-event-script-publication.types";
import type { AreaCreateCompensationResult } from "./area-create-transaction.port";
import type { AreaCreateModuleState } from "../../domain/area-create-transaction.types";
import type { ModuleSnapshotPublicationResult } from "./atomic-module-snapshot.port";

export const AREA_EVENT_SCRIPT_PUBLICATION_STORAGE = Symbol(
  "AREA_EVENT_SCRIPT_PUBLICATION_STORAGE",
);
export const AREA_EVENT_SCRIPT_PUBLICATION_RECOVERY_STORAGE = Symbol(
  "AREA_EVENT_SCRIPT_PUBLICATION_RECOVERY_STORAGE",
);

export interface AreaEventScriptPublicationStoragePort {
  readModuleState(moduleId: string): Promise<AreaCreateModuleState>;
  stage(
    transactionId: string,
    moduleId: string,
    candidate: AreaEventScriptPublicationCandidate,
    lease: AreaCreateModuleLease,
    createdAt: string,
  ): Promise<void>;
  publish(
    transactionId: string,
    moduleId: string,
    candidate: AreaEventScriptPublicationCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<ModuleSnapshotPublicationResult>;
  readBack(
    transactionId: string,
    moduleId: string,
    candidate: AreaEventScriptPublicationCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<AreaEventScriptPublicationReadbackResult>;
  compensate(
    transactionId: string,
    moduleId: string,
    candidate: AreaEventScriptPublicationCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<AreaCreateCompensationResult>;
  quarantine(
    moduleId: string,
    transactionId: string,
    diagnostics: readonly string[],
    lease: AreaCreateModuleLease,
  ): Promise<void>;
}

export interface AreaEventScriptPublicationRecoveryStoragePort {
  verifyRecordedReadback(
    journal: AreaEventScriptPublicationPersistedJournalRecord,
    lease: AreaCreateModuleLease,
  ): Promise<Readonly<{ verified: boolean; diagnostics: readonly string[] }>>;
  restoreRecordedBaseline(
    journal: AreaEventScriptPublicationPersistedJournalRecord,
    lease: AreaCreateModuleLease,
  ): Promise<AreaCreateCompensationResult>;
  quarantineRecordedPublication(
    journal: AreaEventScriptPublicationPersistedJournalRecord,
    lease: AreaCreateModuleLease,
    diagnostics: readonly string[],
  ): Promise<void>;
}
