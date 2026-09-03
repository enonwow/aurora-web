import { createHash } from "node:crypto";
import {
  AREA_CREATE_SNAPSHOT_STAGE_SCHEMA_VERSION,
  type AreaCreateSnapshotStageDescriptor,
  type AtomicModuleSnapshotRepositoryPort,
  type ModuleSnapshotHead,
  type ModuleSnapshotHeadIdentity,
} from "../../../application/ports/atomic-module-snapshot.port";
import type { AreaCreateModuleLease } from "../../../application/ports/area-create-transaction.port";
import type {
  AreaEventScriptPublicationRecoveryStoragePort,
  AreaEventScriptPublicationStoragePort,
} from "../../../application/ports/area-event-script-publication-storage.port";
import {
  AREA_EVENT_SCRIPT_PUBLICATION_RECEIPT_SCHEMA_VERSION,
  validateAreaEventScriptPublicationCandidate,
  type AreaEventScriptPersistedResource,
  type AreaEventScriptPublicationCandidate,
  type AreaEventScriptPublicationPersistedJournalRecord,
  type AreaEventScriptPublicationReadbackResult,
} from "../../../domain/area-event-script-publication.types";
import {
  applyModuleSnapshotChanges,
  buildModuleSnapshotContentKey,
  buildModuleSnapshotManifestKey,
  hashModuleSnapshotManifest,
  validateModuleSnapshotManifest,
  type ModuleSnapshotManifest,
} from "../../../domain/module-snapshot-manifest";

export class AtomicAreaEventScriptPublicationStorageAdapter
  implements
    AreaEventScriptPublicationStoragePort,
    AreaEventScriptPublicationRecoveryStoragePort
{
  constructor(private readonly repository: AtomicModuleSnapshotRepositoryPort) {}

  async readModuleState(moduleId: string) {
    const head = await this.repository.readHead(moduleId);
    if (!head) throw storageError("Committed module snapshot head is missing.");
    return Object.freeze({
      moduleId: head.moduleId,
      revision: head.revision,
      quarantined: head.quarantined,
    });
  }

  async stage(
    transactionId: string,
    moduleId: string,
    rawCandidate: AreaEventScriptPublicationCandidate,
    lease: AreaCreateModuleLease,
    createdAt: string,
  ): Promise<void> {
    const candidate = validateAreaEventScriptPublicationCandidate(rawCandidate);
    assertOperationIdentity(transactionId, moduleId, lease);
    const base = await this.requireHeadAndManifest(moduleId);
    if (base.head.quarantined) throw storageError("Committed module is quarantined.");
    if (base.head.revision !== candidate.expectedModuleRevision) {
      throw storageError("AREA_EVENT_SCRIPT_MODULE_REVISION_CONFLICT");
    }
    for (const resource of candidate.resources) {
      const stored = await this.repository.putContentIfAbsent(
        resource.bytes,
        resource.sha256,
      );
      if (
        stored.contentKey !== buildModuleSnapshotContentKey(resource.sha256) ||
        stored.size !== resource.size ||
        stored.sha256 !== resource.sha256
      ) {
        throw storageError("Immutable content store returned another artifact identity.");
      }
    }
    const successor = applyModuleSnapshotChanges(
      base.manifest,
      candidate.resources.map((resource) => ({
        logicalKey: resource.logicalKey,
        resourceType: resource.resourceType,
        size: resource.size,
        sha256: resource.sha256,
      })),
    );
    const persistedSuccessor = await this.repository.putManifestIfAbsent(successor);
    if (persistedSuccessor.revision !== successor.revision) {
      throw storageError("Immutable manifest store returned another successor.");
    }
    const stage: AreaCreateSnapshotStageDescriptor = Object.freeze({
      schemaVersion: AREA_CREATE_SNAPSHOT_STAGE_SCHEMA_VERSION,
      transactionId,
      moduleId,
      leaseId: lease.leaseId,
      fencingToken: lease.fencingToken,
      base: identity(base.manifest),
      successor: identity(successor),
      candidateLogicalKeys: Object.freeze(
        candidate.resources.map((resource) => resource.logicalKey),
      ),
      createdAt,
    });
    await this.repository.putStageIfAbsent(stage);
  }

  async publish(
    transactionId: string,
    moduleId: string,
    candidate: AreaEventScriptPublicationCandidate,
    lease: AreaCreateModuleLease,
  ) {
    assertOperationIdentity(transactionId, moduleId, lease);
    await this.requireMatchingStage(transactionId, moduleId, candidate);
    return this.repository.compareAndSetHead(transactionId, lease);
  }

  async readBack(
    transactionId: string,
    moduleId: string,
    rawCandidate: AreaEventScriptPublicationCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<AreaEventScriptPublicationReadbackResult> {
    const candidate = validateAreaEventScriptPublicationCandidate(rawCandidate);
    assertOperationIdentity(transactionId, moduleId, lease);
    const stage = await this.requireMatchingStage(transactionId, moduleId, candidate);
    const head = await this.repository.readHead(moduleId);
    if (!head || head.quarantined || !sameIdentity(head, stage.successor)) {
      return failedReadback("Committed head does not match the staged successor.");
    }
    const rawManifest = await this.repository.readManifest(head.manifestKey);
    let manifest: ModuleSnapshotManifest;
    try {
      if (!rawManifest) throw new Error("missing");
      manifest = validateModuleSnapshotManifest(rawManifest);
    } catch {
      return failedReadback("Committed successor manifest failed validation.");
    }
    if (!sameManifestIdentity(manifest, stage.successor)) {
      return failedReadback("Committed successor manifest identity changed.");
    }
    const resources: AreaEventScriptPersistedResource[] = [];
    for (const resource of candidate.resources) {
      const matches = manifest.objects.filter(
        (entry) => entry.logicalKey.toLowerCase() === resource.logicalKey,
      );
      if (
        matches.length !== 1 ||
        matches[0].logicalKey !== resource.logicalKey ||
        matches[0].resourceType !== resource.resourceType ||
        matches[0].size !== resource.size ||
        matches[0].sha256 !== resource.sha256
      ) {
        return failedReadback("Committed script resource descriptor differs.");
      }
      const content = await this.repository.readContent(matches[0].contentKey);
      if (
        !content ||
        content.contentKey !== matches[0].contentKey ||
        content.size !== resource.size ||
        content.sha256 !== resource.sha256 ||
        content.bytes.length !== resource.size ||
        sha256(content.bytes) !== resource.sha256 ||
        !content.bytes.equals(resource.bytes)
      ) {
        return failedReadback("Committed script resource content differs.");
      }
      resources.push(Object.freeze({
        extension: resource.extension,
        logicalKey: resource.logicalKey,
        resourceType: resource.resourceType,
        size: resource.size,
        sha256: resource.sha256,
      }));
    }
    return Object.freeze({
      verified: true,
      newModuleRevision: head.revision,
      resources: Object.freeze(resources),
      diagnostics: Object.freeze([]),
    });
  }

  async compensate(
    transactionId: string,
    moduleId: string,
    candidate: AreaEventScriptPublicationCandidate,
    lease: AreaCreateModuleLease,
  ) {
    assertOperationIdentity(transactionId, moduleId, lease);
    const stage = await this.requireMatchingStage(transactionId, moduleId, candidate);
    await this.repository.restoreBaseline(transactionId, lease);
    const head = await this.repository.readHead(moduleId);
    const restored = Boolean(head && !head.quarantined && sameIdentity(head, stage.base));
    return Object.freeze({
      restored,
      diagnostics: restored
        ? Object.freeze([])
        : Object.freeze(["Baseline head identity was not restored."]),
    });
  }

  async quarantine(
    moduleId: string,
    transactionId: string,
    diagnostics: readonly string[],
    lease: AreaCreateModuleLease,
  ): Promise<void> {
    assertOperationIdentity(transactionId, moduleId, lease);
    await this.repository.quarantine(transactionId, lease, diagnostics);
  }

  async verifyRecordedReadback(
    journal: AreaEventScriptPublicationPersistedJournalRecord,
    lease: AreaCreateModuleLease,
  ): Promise<Readonly<{ verified: boolean; diagnostics: readonly string[] }>> {
    assertOperationIdentity(journal.transactionId, journal.moduleId, lease);
    try {
      const stage = await this.repository.readStage(journal.transactionId);
      if (!stage || !stageMatchesJournal(stage, journal)) {
        return recoveryReadbackFailure("AREA_EVENT_SCRIPT_RECOVERY_STAGE_MISMATCH");
      }
      if (!receiptMatchesJournalAndStage(journal, stage)) {
        return recoveryReadbackFailure("AREA_EVENT_SCRIPT_RECOVERY_RECEIPT_MISMATCH");
      }
      const head = await this.repository.readHead(journal.moduleId);
      if (
        !head ||
        head.quarantined ||
        !sameIdentity(head, stage.successor) ||
        head.revision !== journal.receipt!.newModuleRevision
      ) {
        return recoveryReadbackFailure("AREA_EVENT_SCRIPT_RECOVERY_HEAD_MISMATCH");
      }
      const rawManifest = await this.repository.readManifest(head.manifestKey);
      if (!rawManifest) {
        return recoveryReadbackFailure("AREA_EVENT_SCRIPT_RECOVERY_MANIFEST_MISMATCH");
      }
      const manifest = validateModuleSnapshotManifest(rawManifest);
      if (!sameManifestIdentity(manifest, stage.successor)) {
        return recoveryReadbackFailure("AREA_EVENT_SCRIPT_RECOVERY_MANIFEST_MISMATCH");
      }
      for (const resource of journal.candidateManifest.resources) {
        const matches = manifest.objects.filter(
          (entry) => entry.logicalKey.toLowerCase() === resource.logicalKey,
        );
        if (
          matches.length !== 1 ||
          matches[0].logicalKey !== resource.logicalKey ||
          matches[0].resourceType !== resource.resourceType ||
          matches[0].size !== resource.size ||
          matches[0].sha256 !== resource.sha256 ||
          matches[0].contentKey !== buildModuleSnapshotContentKey(resource.sha256)
        ) {
          return recoveryReadbackFailure("AREA_EVENT_SCRIPT_RECOVERY_RESOURCE_MISMATCH");
        }
        const content = await this.repository.readContent(matches[0].contentKey);
        if (
          !content ||
          content.contentKey !== matches[0].contentKey ||
          content.size !== resource.size ||
          content.sha256 !== resource.sha256 ||
          content.bytes.length !== resource.size ||
          sha256(content.bytes) !== resource.sha256
        ) {
          return recoveryReadbackFailure("AREA_EVENT_SCRIPT_RECOVERY_RESOURCE_MISMATCH");
        }
      }
      return Object.freeze({ verified: true, diagnostics: Object.freeze([]) });
    } catch {
      return recoveryReadbackFailure("AREA_EVENT_SCRIPT_RECOVERY_READBACK_UNAVAILABLE");
    }
  }

  async restoreRecordedBaseline(
    journal: AreaEventScriptPublicationPersistedJournalRecord,
    lease: AreaCreateModuleLease,
  ) {
    assertOperationIdentity(journal.transactionId, journal.moduleId, lease);
    try {
      const stage = await this.repository.readStage(journal.transactionId);
      if (!stage) {
        if (journal.state !== "prepared") {
          return recoveryCompensationFailure("AREA_EVENT_SCRIPT_RECOVERY_STAGE_MISSING");
        }
        const head = await this.repository.readHead(journal.moduleId);
        if (
          !head ||
          head.quarantined ||
          head.revision !== journal.expectedModuleRevision ||
          !await this.headManifestIsSelfConsistent(head)
        ) {
          return recoveryCompensationFailure(
            "AREA_EVENT_SCRIPT_RECOVERY_BASELINE_UNPROVEN",
          );
        }
        return Object.freeze({ restored: true, diagnostics: Object.freeze([]) });
      }
      if (!stageMatchesJournal(stage, journal)) {
        return recoveryCompensationFailure("AREA_EVENT_SCRIPT_RECOVERY_STAGE_MISMATCH");
      }
      await this.repository.restoreBaseline(journal.transactionId, lease);
      const head = await this.repository.readHead(journal.moduleId);
      if (
        !head ||
        head.quarantined ||
        !sameIdentity(head, stage.base) ||
        !await this.headManifestIsSelfConsistent(head)
      ) {
        return recoveryCompensationFailure(
          "AREA_EVENT_SCRIPT_RECOVERY_BASELINE_UNPROVEN",
        );
      }
      return Object.freeze({ restored: true, diagnostics: Object.freeze([]) });
    } catch {
      return recoveryCompensationFailure(
        "AREA_EVENT_SCRIPT_RECOVERY_BASELINE_UNAVAILABLE",
      );
    }
  }

  async quarantineRecordedPublication(
    journal: AreaEventScriptPublicationPersistedJournalRecord,
    lease: AreaCreateModuleLease,
    diagnostics: readonly string[],
  ): Promise<void> {
    assertOperationIdentity(journal.transactionId, journal.moduleId, lease);
    const stage = await this.repository.readStage(journal.transactionId);
    if (!stage) {
      await this.repository.quarantineModule(
        journal.moduleId,
        journal.transactionId,
        lease,
        diagnostics,
      );
      return;
    }
    if (!stageMatchesJournal(stage, journal)) {
      throw storageError("Recovery quarantine stage identity differs.");
    }
    await this.repository.quarantine(journal.transactionId, lease, diagnostics);
  }

  private async requireHeadAndManifest(moduleId: string): Promise<{
    head: ModuleSnapshotHead;
    manifest: ModuleSnapshotManifest;
  }> {
    const head = await this.repository.readHead(moduleId);
    if (!head) throw storageError("Committed module snapshot head is missing.");
    const raw = await this.repository.readManifest(head.manifestKey);
    let manifest: ModuleSnapshotManifest;
    try {
      if (!raw) throw new Error("missing");
      manifest = validateModuleSnapshotManifest(raw);
    } catch {
      throw storageError("Committed module snapshot manifest is invalid.");
    }
    if (!sameManifestIdentity(manifest, head)) {
      throw storageError("Committed module head and manifest identities differ.");
    }
    return { head, manifest };
  }

  private async headManifestIsSelfConsistent(head: ModuleSnapshotHead): Promise<boolean> {
    const manifest = await this.repository.readManifest(head.manifestKey);
    return Boolean(manifest && sameManifestIdentity(manifest, head));
  }

  private async requireMatchingStage(
    transactionId: string,
    moduleId: string,
    rawCandidate: AreaEventScriptPublicationCandidate,
  ): Promise<AreaCreateSnapshotStageDescriptor> {
    const candidate = validateAreaEventScriptPublicationCandidate(rawCandidate);
    const stage = await this.repository.readStage(transactionId);
    const keys = candidate.resources.map((resource) => resource.logicalKey);
    if (
      !stage ||
      stage.moduleId !== moduleId ||
      stage.transactionId !== transactionId ||
      stage.base.revision !== candidate.expectedModuleRevision ||
      JSON.stringify(stage.candidateLogicalKeys) !== JSON.stringify(keys)
    ) {
      throw storageError("Staged script publication identity differs from its candidate.");
    }
    const manifest = await this.repository.readManifest(stage.successor.manifestKey);
    if (!manifest || !sameManifestIdentity(manifest, stage.successor)) {
      throw storageError("Staged script successor manifest is unavailable.");
    }
    for (const resource of candidate.resources) {
      const descriptor = manifest.objects.find(
        (entry) => entry.logicalKey === resource.logicalKey,
      );
      if (
        !descriptor ||
        descriptor.resourceType !== resource.resourceType ||
        descriptor.size !== resource.size ||
        descriptor.sha256 !== resource.sha256
      ) {
        throw storageError("Staged script successor does not contain the exact candidate.");
      }
    }
    return stage;
  }
}

function stageMatchesJournal(
  stage: AreaCreateSnapshotStageDescriptor,
  journal: AreaEventScriptPublicationPersistedJournalRecord,
): boolean {
  const expectedKeys = journal.candidateManifest.resources.map(
    (resource) => resource.logicalKey,
  );
  return stage.transactionId === journal.transactionId &&
    stage.moduleId === journal.moduleId &&
    stage.base.revision === journal.expectedModuleRevision &&
    JSON.stringify(stage.candidateLogicalKeys) === JSON.stringify(expectedKeys) &&
    persistedManifestIsValid(journal);
}

function persistedManifestIsValid(
  journal: AreaEventScriptPublicationPersistedJournalRecord,
): boolean {
  const manifest = journal.candidateManifest;
  const expected = [
    ["ncs", 2010],
    ["ndb", 2064],
    ["nss", 2009],
  ] as const;
  if (
    manifest.targetResRef !== journal.targetResRef ||
    !/^[a-z0-9_]{1,16}$/u.test(manifest.targetResRef) ||
    manifest.targetResRef === "nwscript" ||
    !isSha256(manifest.sourceSha256) ||
    !isSha256(manifest.includeSetSha256) ||
    !isSha256(manifest.executionProfileSha256) ||
    !isSha256(manifest.compilerReceiptSha256) ||
    !Array.isArray(manifest.resources) ||
    manifest.resources.length !== expected.length
  ) return false;
  return expected.every(([extension, resourceType], index) => {
    const resource = manifest.resources[index];
    return resource.extension === extension &&
      resource.logicalKey === `${journal.targetResRef}.${extension}` &&
      resource.resourceType === resourceType &&
      Number.isSafeInteger(resource.size) &&
      resource.size >= 0 &&
      isSha256(resource.sha256) &&
      (extension !== "nss" || resource.sha256 === manifest.sourceSha256);
  });
}

function receiptMatchesJournalAndStage(
  journal: AreaEventScriptPublicationPersistedJournalRecord,
  stage: AreaCreateSnapshotStageDescriptor,
): boolean {
  const receipt = journal.receipt;
  const manifest = journal.candidateManifest;
  if (!receipt) return false;
  return receipt.schemaVersion === AREA_EVENT_SCRIPT_PUBLICATION_RECEIPT_SCHEMA_VERSION &&
    receipt.transactionId === journal.transactionId &&
    receipt.moduleId === journal.moduleId &&
    receipt.targetResRef === journal.targetResRef &&
    receipt.previousModuleRevision === journal.expectedModuleRevision &&
    receipt.newModuleRevision === stage.successor.revision &&
    receipt.commandHash === journal.commandHash &&
    receipt.sourceSha256 === manifest.sourceSha256 &&
    receipt.includeSetSha256 === manifest.includeSetSha256 &&
    receipt.executionProfileSha256 === manifest.executionProfileSha256 &&
    receipt.compilerReceiptSha256 === manifest.compilerReceiptSha256 &&
    receipt.readbackStatus === "verified" &&
    sameJson(receipt.provider, manifest.provider) &&
    sameJson(receipt.resources, manifest.resources) &&
    isCanonicalIso(receipt.publishedAt);
}

function recoveryReadbackFailure(
  code: string,
): Readonly<{ verified: false; diagnostics: readonly string[] }> {
  return Object.freeze({
    verified: false,
    diagnostics: Object.freeze([code]),
  });
}

function recoveryCompensationFailure(code: string) {
  return Object.freeze({
    restored: false,
    diagnostics: Object.freeze([code]),
  });
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

function isCanonicalIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}

function identity(manifest: ModuleSnapshotManifest): ModuleSnapshotHeadIdentity {
  return Object.freeze({
    revision: manifest.revision,
    manifestKey: buildModuleSnapshotManifestKey(manifest),
    manifestSha256: hashModuleSnapshotManifest(manifest),
  });
}

function sameManifestIdentity(
  manifest: ModuleSnapshotManifest,
  expected: ModuleSnapshotHeadIdentity,
): boolean {
  try {
    const actual = identity(validateModuleSnapshotManifest(manifest));
    return sameIdentity(actual, expected);
  } catch {
    return false;
  }
}

function sameIdentity(
  actual: ModuleSnapshotHeadIdentity,
  expected: ModuleSnapshotHeadIdentity,
): boolean {
  return actual.revision === expected.revision &&
    actual.manifestKey === expected.manifestKey &&
    actual.manifestSha256 === expected.manifestSha256;
}

function assertOperationIdentity(
  transactionId: string,
  moduleId: string,
  lease: AreaCreateModuleLease,
): void {
  if (
    lease.moduleId !== moduleId ||
    lease.ownerTransactionId !== transactionId
  ) {
    throw storageError("Script publication does not own the module lease.");
  }
}

function failedReadback(message: string): AreaEventScriptPublicationReadbackResult {
  return Object.freeze({
    verified: false,
    newModuleRevision: "",
    resources: Object.freeze([]),
    diagnostics: Object.freeze([message]),
  });
}

function storageError(message: string): Error {
  return new Error(`AREA_EVENT_SCRIPT_STORAGE_UNAVAILABLE: ${message}`);
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
