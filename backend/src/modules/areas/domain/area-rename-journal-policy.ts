import type {
  AreaRenameCandidateManifest,
  AreaRenameJournalRecord,
  AreaRenameReceipt,
} from "./area-rename-transaction.types";

/** Creates the durable byte-free recovery identity for one Area rename. */
export function createAreaRenameCandidateManifest(
  record: AreaRenameJournalRecord,
): AreaRenameCandidateManifest {
  return Object.freeze({
    areaId: record.candidate.areaId,
    targetAreaId: record.candidate.targetAreaId,
    previewSha256: record.candidate.preview.previewSha256,
    resources: Object.freeze(record.candidate.resources.map((resource) => Object.freeze({
      extension: resource.extension,
      sourceKey: resource.sourceKey,
      targetKey: resource.targetKey,
      resourceType: resource.resourceType,
      baselineSize: resource.baselineSize,
      baselineSha256: resource.baselineSha256,
      candidateSize: resource.candidateSize,
      candidateSha256: resource.candidateSha256,
    }))),
    moduleIfo: Object.freeze({
      key: record.candidate.moduleIfo.key,
      resourceType: record.candidate.moduleIfo.resourceType,
      baselineSize: record.candidate.moduleIfo.baselineSize,
      baselineSha256: record.candidate.moduleIfo.baselineSha256,
      candidateSize: record.candidate.moduleIfo.candidateSize,
      candidateSha256: record.candidate.moduleIfo.candidateSha256,
    }),
    entryAreaUpdated: record.candidate.entryAreaUpdated,
    entryAreaResRef: record.candidate.preview.entryAreaResRef,
    survivorCount: record.candidate.survivorCount,
    baselineRevision: record.candidate.baselineManifest.revision,
    successorRevision: record.candidate.successorManifest.revision,
  });
}

/** Rejects a receipt that is not an exact projection of the durable byte-free candidate. */
export function isAreaRenameReceiptCandidateExact(
  receipt: AreaRenameReceipt,
  manifest: AreaRenameCandidateManifest,
): boolean {
  if (receipt.areaResRef !== manifest.areaId ||
      receipt.targetAreaResRef !== manifest.targetAreaId ||
      receipt.previewSha256 !== manifest.previewSha256 ||
      receipt.previousModuleRevision !== manifest.baselineRevision ||
      receipt.newModuleRevision !== manifest.successorRevision ||
      receipt.entryAreaUpdated !== manifest.entryAreaUpdated ||
      receipt.resources.length !== manifest.resources.length) {
    return false;
  }
  const receiptByExtension = new Map(
    receipt.resources.map((resource) => [resource.extension, resource]),
  );
  if (receiptByExtension.size !== receipt.resources.length) return false;
  for (const expected of manifest.resources) {
    const actual = receiptByExtension.get(expected.extension);
    if (!actual || actual.sourceKey !== expected.sourceKey ||
        actual.targetKey !== expected.targetKey ||
        actual.resourceType !== expected.resourceType ||
        actual.baselineSize !== expected.baselineSize ||
        actual.baselineSha256 !== expected.baselineSha256 ||
        actual.candidateSize !== expected.candidateSize ||
        actual.candidateSha256 !== expected.candidateSha256) {
      return false;
    }
  }
  const actualIfo = receipt.moduleIfo;
  const expectedIfo = manifest.moduleIfo;
  return actualIfo.key === expectedIfo.key &&
    actualIfo.baselineSize === expectedIfo.baselineSize &&
    actualIfo.baselineSha256 === expectedIfo.baselineSha256 &&
    actualIfo.candidateSize === expectedIfo.candidateSize &&
    actualIfo.candidateSha256 === expectedIfo.candidateSha256;
}
