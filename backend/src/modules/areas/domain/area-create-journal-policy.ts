import type {
  AreaCreateCandidateManifest,
  AreaCreateJournalRecord,
  AreaCreateJournalState,
} from "./area-create-transaction.types";

const NON_BLOCKING_STATES = new Set<AreaCreateJournalState>([
  "complete",
  "compensated",
]);

const RECOVERABLE_STATES = new Set<AreaCreateJournalState>([
  "prepared",
  "staged",
  "resources_committed",
  "ifo_committed",
  "readback_verified",
  "compensation_pending",
]);

type AreaCreateNonTerminalJournalState = Exclude<
  AreaCreateJournalState,
  "complete" | "compensated" | "quarantine_required"
>;

const TERMINAL_STATES = new Set<AreaCreateJournalState>([
  "complete",
  "compensated",
  "quarantine_required",
]);

const ALLOWED_TRANSITIONS: Readonly<
  Record<AreaCreateNonTerminalJournalState, readonly AreaCreateJournalState[]>
> = Object.freeze({
  prepared: ["staged", "compensation_pending"],
  staged: ["resources_committed", "compensation_pending"],
  resources_committed: ["ifo_committed", "compensation_pending"],
  ifo_committed: ["compensation_pending"],
  readback_verified: ["compensation_pending"],
  compensation_pending: ["compensated", "quarantine_required"],
});

export function isAreaCreateJournalBlocking(state: AreaCreateJournalState): boolean {
  return !NON_BLOCKING_STATES.has(state);
}

export function isAreaCreateJournalRecoverable(
  state: AreaCreateJournalState,
): boolean {
  return RECOVERABLE_STATES.has(state);
}

export function canTransitionAreaCreateJournal(
  current: AreaCreateJournalState,
  next: AreaCreateJournalState,
): boolean {
  if (current === next) {
    return true;
  }
  if (TERMINAL_STATES.has(current)) {
    return false;
  }
  return ALLOWED_TRANSITIONS[current as AreaCreateNonTerminalJournalState].includes(next);
}

export function createAreaCreateCandidateManifest(
  record: AreaCreateJournalRecord,
): AreaCreateCandidateManifest {
  return {
    areaId: record.candidate.areaId,
    tileProductionAdmission: record.tileProductionAdmission,
    resources: record.candidate.resources.map(({ bytes: _bytes, ...resource }) => ({
      extension: resource.extension,
      key: resource.key,
      fileName: resource.fileName,
      resourceType: resource.resourceType,
      size: resource.size,
      sha256: resource.sha256,
    })),
    moduleIfo: {
      key: record.candidate.moduleIfo.key,
      fileName: record.candidate.moduleIfo.fileName,
      resourceType: record.candidate.moduleIfo.resourceType,
      baselineSize: record.candidate.moduleIfo.baselineBytes.length,
      baselineSha256: record.candidate.moduleIfo.baselineSha256,
      candidateSize: record.candidate.moduleIfo.candidateBytes.length,
      candidateSha256: record.candidate.moduleIfo.candidateSha256,
    },
  };
}
