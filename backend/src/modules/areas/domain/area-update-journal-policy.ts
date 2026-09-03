import type {
  AreaUpdateCandidateManifest,
  AreaUpdateJournalRecord,
} from "./area-update-transaction.types";

export function createAreaUpdateCandidateManifest(
  record: AreaUpdateJournalRecord,
): AreaUpdateCandidateManifest {
  return Object.freeze({
    areaId: record.candidate.areaId,
    tileProductionAdmission: record.tileProductionAdmission,
    resources: Object.freeze(
      record.candidate.resources.map(({ bytes: _bytes, ...resource }) =>
        Object.freeze({ ...resource }),
      ),
    ),
    moduleIfo: Object.freeze({
      key: record.candidate.moduleIfo.key,
      fileName: record.candidate.moduleIfo.fileName,
      resourceType: record.candidate.moduleIfo.resourceType,
      baselineSize: record.candidate.moduleIfo.baselineBytes.length,
      baselineSha256: record.candidate.moduleIfo.baselineSha256,
      candidateSize: record.candidate.moduleIfo.candidateBytes.length,
      candidateSha256: record.candidate.moduleIfo.candidateSha256,
    }),
  });
}
