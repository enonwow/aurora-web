import type {
  AreaDeleteCandidateManifest,
  AreaDeleteJournalRecord,
} from "./area-delete-transaction.types";

/** Creates the durable, byte-free recovery identity for one destructive mutation. */
export function createAreaDeleteCandidateManifest(
  record: AreaDeleteJournalRecord,
): AreaDeleteCandidateManifest {
  return Object.freeze({
    areaId: record.candidate.areaId,
    previewSha256: record.candidate.preview.previewSha256,
    removedResources: Object.freeze(
      record.candidate.removedResources.map(({ bytes: _bytes, ...resource }) =>
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
    survivorCount: record.candidate.survivorCount,
  });
}
