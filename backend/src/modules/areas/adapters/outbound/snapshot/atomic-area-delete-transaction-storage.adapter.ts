import { createHash, timingSafeEqual } from "node:crypto";
import type {
  AtomicModuleSnapshotRepositoryPort,
  AreaCreateSnapshotStageDescriptor,
  ModuleSnapshotHead,
  ModuleSnapshotHeadIdentity,
} from "../../../application/ports/atomic-module-snapshot.port";
import { AREA_CREATE_SNAPSHOT_STAGE_SCHEMA_VERSION } from "../../../application/ports/atomic-module-snapshot.port";
import type { AreaCreateModuleLease } from "../../../application/ports/area-create-transaction.port";
import type {
  AreaDeleteRecoveryStoragePort,
  AreaDeleteTransactionStoragePort,
} from "../../../application/ports/area-delete-transaction.port";
import type {
  AreaDeleteCompiledCandidate,
  AreaDeletePersistedJournalRecord,
  AreaDeleteReadbackResult,
} from "../../../domain/area-delete-transaction.types";
import type {
  AreaCreateCandidateResource,
  AreaCreatePersistedArtifact,
} from "../../../domain/area-create-transaction.types";
import {
  applyModuleSnapshotMutation,
  buildModuleSnapshotManifestKey,
  hashModuleSnapshotManifest,
  normalizeModuleSnapshotLogicalKey,
  type ModuleSnapshotManifest,
  type ModuleSnapshotObjectDescriptor,
} from "../../../domain/module-snapshot-manifest";
import {
  moduleIfoAreaMembershipCount,
  readModuleIfoEntryArea,
} from "../blob/aurora-gff-module-ifo-area-writer";

const REQUIRED_EXTENSIONS = ["are", "git", "gic"] as const;

/**
 * Publishes an Area deletion as one immutable snapshot-head CAS. No reader can
 * observe a removed triplet with the baseline IFO (or the inverse).
 */
export class AtomicAreaDeleteTransactionStorageAdapter
  implements AreaDeleteTransactionStoragePort, AreaDeleteRecoveryStoragePort
{
  constructor(
    private readonly repository: AtomicModuleSnapshotRepositoryPort,
    private readonly clock: Readonly<{ nowIso(): string }> = {
      nowIso: () => new Date().toISOString(),
    },
  ) {}

  async readModuleState(moduleId: string) {
    const head = await this.requireHead(moduleId);
    return Object.freeze({
      moduleId: head.moduleId,
      revision: head.revision,
      quarantined: head.quarantined,
    });
  }

  async stage(
    transactionId: string,
    moduleId: string,
    candidate: AreaDeleteCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<void> {
    assertLeaseScope(transactionId, moduleId, lease, false);
    const normalized = normalizeCandidate(candidate, moduleId);
    const retainedStage = await this.repository.readStage(transactionId);
    if (retainedStage) {
      const loaded = await this.loadCandidateStage(
        transactionId,
        moduleId,
        normalized,
        lease,
      );
      await this.verifySuccessorDelta(loaded.stage, loaded.successor, normalized);
      await this.assertHeadAtEither(loaded.stage);
      return;
    }

    const head = await this.requireMutableHead(moduleId);
    const baseline = await this.requireManifest(head.manifestKey);
    assertManifestIdentity(baseline, head);
    await this.assertExactBaseline(baseline, normalized);
    await this.repository.putContentIfAbsent(
      normalized.moduleIfo.candidateBytes,
      normalized.moduleIfo.candidateSha256,
    );

    const successor = applyModuleSnapshotMutation(baseline, {
      removals: normalized.removedResources.map((resource) => resource.fileName),
      upserts: [{
        logicalKey: normalized.moduleIfo.fileName,
        resourceType: normalized.moduleIfo.resourceType,
        size: normalized.moduleIfo.candidateBytes.length,
        sha256: normalized.moduleIfo.candidateSha256,
      }],
    });
    await this.repository.putManifestIfAbsent(successor);
    // The shared stage schema lists materialized successor objects. Removed
    // keys are bound by the immutable base/successor identities and are
    // independently checked by verifySuccessorDelta.
    const candidateLogicalKeys = [normalized.moduleIfo.fileName];
    const stage: AreaCreateSnapshotStageDescriptor = Object.freeze({
      schemaVersion: AREA_CREATE_SNAPSHOT_STAGE_SCHEMA_VERSION,
      transactionId,
      moduleId,
      leaseId: lease.leaseId,
      fencingToken: lease.fencingToken,
      base: headIdentity(head),
      successor: manifestIdentity(successor),
      candidateLogicalKeys: Object.freeze(candidateLogicalKeys),
      createdAt: this.clock.nowIso(),
    });
    await this.repository.putStageIfAbsent(stage);
  }

  async commitResources(
    transactionId: string,
    moduleId: string,
    candidate: AreaDeleteCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<void> {
    const loaded = await this.loadCandidateStage(
      transactionId,
      moduleId,
      candidate,
      lease,
    );
    await this.verifySuccessorDelta(loaded.stage, loaded.successor, loaded.normalized);
    await this.assertHeadAtEither(loaded.stage);
  }

  async commitModuleIfo(
    transactionId: string,
    moduleId: string,
    candidate: AreaDeleteCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<void> {
    const loaded = await this.loadCandidateStage(
      transactionId,
      moduleId,
      candidate,
      lease,
    );
    await this.verifySuccessorDelta(loaded.stage, loaded.successor, loaded.normalized);
    await this.repository.compareAndSetHead(transactionId, lease);
  }

  async readBack(
    transactionId: string,
    moduleId: string,
    candidate: AreaDeleteCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<AreaDeleteReadbackResult> {
    const loaded = await this.loadCandidateStage(
      transactionId,
      moduleId,
      candidate,
      lease,
    );
    const head = await this.requireHead(moduleId);
    if (!sameIdentity(head, loaded.stage.successor)) {
      throw storageError(
        "AREA_DELETE_SNAPSHOT_READBACK_HEAD_MISMATCH",
        "Delete readback did not capture the published successor head.",
      );
    }
    const ifoBytes = await this.verifySuccessorDelta(
      loaded.stage,
      loaded.successor,
      loaded.normalized,
    );
    const diagnostics = semanticDeletionDiagnostics(
      ifoBytes,
      loaded.normalized.areaId,
    );
    return Object.freeze({
      verified: diagnostics.length === 0,
      newModuleRevision: head.revision,
      removedResources: Object.freeze(
        loaded.normalized.removedResources.map(persistedResource),
      ),
      moduleIfo: Object.freeze({
        key: loaded.normalized.moduleIfo.key,
        size: ifoBytes.length,
        sha256: loaded.normalized.moduleIfo.candidateSha256,
      }),
      survivorCount: loaded.successor.objects.length,
      diagnostics: Object.freeze(diagnostics),
    });
  }

  async compensate(
    transactionId: string,
    moduleId: string,
    candidate: AreaDeleteCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<Readonly<{ restored: boolean; diagnostics: readonly string[] }>>;
  async compensate(
    journal: AreaDeletePersistedJournalRecord,
    lease: AreaCreateModuleLease,
  ): Promise<Readonly<{ restored: boolean; diagnostics: readonly string[] }>>;
  async compensate(
    transactionOrJournal: string | AreaDeletePersistedJournalRecord,
    moduleOrLease: string | AreaCreateModuleLease,
    candidate?: AreaDeleteCompiledCandidate,
    maybeLease?: AreaCreateModuleLease,
  ): Promise<Readonly<{ restored: boolean; diagnostics: readonly string[] }>> {
    const transactionId = typeof transactionOrJournal === "string"
      ? transactionOrJournal
      : transactionOrJournal.transactionId;
    const moduleId = typeof transactionOrJournal === "string"
      ? moduleOrLease as string
      : transactionOrJournal.moduleId;
    const lease = typeof transactionOrJournal === "string"
      ? maybeLease!
      : moduleOrLease as AreaCreateModuleLease;
    assertLeaseScope(transactionId, moduleId, lease, true);
    const stage = await this.repository.readStage(transactionId);
    if (!stage) {
      try {
        const head = await this.requireHead(moduleId);
        if (head.quarantined) {
          throw storageError(
            "AREA_DELETE_SNAPSHOT_MODULE_QUARANTINED",
            "A stage-free compensation cannot certify a quarantined head.",
          );
        }
        const manifest = await this.requireManifest(head.manifestKey);
        assertManifestIdentity(manifest, head);
        if (typeof transactionOrJournal === "string") {
          await this.assertExactBaseline(
            manifest,
            normalizeCandidate(candidate!, moduleId),
          );
        } else {
          await this.assertJournalBaseline(manifest, transactionOrJournal);
        }
        return Object.freeze({ restored: true, diagnostics: Object.freeze([]) });
      } catch (error) {
        return Object.freeze({
          restored: false,
          diagnostics: Object.freeze([
            `AREA_DELETE_SNAPSHOT_STAGE_MISSING_BASELINE_UNPROVEN:${errorMessage(error)}`,
          ]),
        });
      }
    }
    if (stage.moduleId !== moduleId) {
      throw storageError(
        "AREA_DELETE_SNAPSHOT_STAGE_IDENTITY_MISMATCH",
        "Delete compensation module differs from the retained stage.",
      );
    }
    await this.repository.restoreBaseline(transactionId, lease);
    const restored = await this.requireHead(moduleId);
    if (!sameIdentity(restored, stage.base)) {
      return Object.freeze({
        restored: false,
        diagnostics: Object.freeze(["AREA_DELETE_SNAPSHOT_COMPENSATION_READBACK_MISMATCH"]),
      });
    }
    return Object.freeze({ restored: true, diagnostics: Object.freeze([]) });
  }

  async quarantine(
    moduleId: string,
    transactionId: string,
    diagnostics: readonly string[],
    lease: AreaCreateModuleLease,
  ): Promise<void>;
  async quarantine(
    journal: AreaDeletePersistedJournalRecord,
    lease: AreaCreateModuleLease,
    diagnostics: readonly string[],
  ): Promise<void>;
  async quarantine(
    moduleOrJournal: string | AreaDeletePersistedJournalRecord,
    transactionOrLease: string | AreaCreateModuleLease,
    diagnostics: readonly string[],
    maybeLease?: AreaCreateModuleLease,
  ): Promise<void> {
    const moduleId = typeof moduleOrJournal === "string"
      ? moduleOrJournal
      : moduleOrJournal.moduleId;
    const transactionId = typeof moduleOrJournal === "string"
      ? transactionOrLease as string
      : moduleOrJournal.transactionId;
    const lease = typeof moduleOrJournal === "string"
      ? maybeLease!
      : transactionOrLease as AreaCreateModuleLease;
    assertLeaseScope(transactionId, moduleId, lease, true);
    await this.repository.quarantine(transactionId, lease, diagnostics);
  }

  async verifyRecordedReadback(
    journal: AreaDeletePersistedJournalRecord,
    lease: AreaCreateModuleLease,
  ): Promise<Readonly<{ verified: boolean; diagnostics: readonly string[] }>> {
    assertLeaseScope(journal.transactionId, journal.moduleId, lease, true);
    try {
      const stage = await this.requireStage(journal.transactionId);
      const head = await this.requireHead(journal.moduleId);
      if (!sameIdentity(head, stage.successor)) {
        return result(false, ["AREA_DELETE_SNAPSHOT_RECOVERY_HEAD_MISMATCH"]);
      }
      const successor = await this.requireManifest(head.manifestKey);
      assertManifestIdentity(successor, head);
      const diagnostics: string[] = [];
      for (const resource of journal.candidateManifest.removedResources) {
        if (findDescriptors(successor, resource.fileName).length !== 0) {
          diagnostics.push(`AREA_DELETE_SNAPSHOT_RESOURCE_RETAINED:${resource.fileName}`);
        }
      }
      const ifo = journal.candidateManifest.moduleIfo;
      const ifoBytes = await this.verifyObject(successor, ifo.fileName, {
        resourceType: ifo.resourceType,
        size: ifo.candidateSize,
        sha256: ifo.candidateSha256,
      });
      diagnostics.push(...semanticDeletionDiagnostics(ifoBytes, journal.areaResRef));
      if (successor.objects.length !== journal.candidateManifest.survivorCount) {
        diagnostics.push("AREA_DELETE_SNAPSHOT_SURVIVOR_COUNT_MISMATCH");
      }
      return result(diagnostics.length === 0, diagnostics);
    } catch (error) {
      return result(false, [`AREA_DELETE_SNAPSHOT_RECOVERY_INVALID:${errorMessage(error)}`]);
    }
  }

  private async loadCandidateStage(
    transactionId: string,
    moduleId: string,
    candidate: AreaDeleteCompiledCandidate,
    lease: AreaCreateModuleLease,
  ) {
    assertLeaseScope(transactionId, moduleId, lease, false);
    const normalized = normalizeCandidate(candidate, moduleId);
    const stage = await this.requireStage(transactionId);
    if (
      stage.moduleId !== moduleId ||
      stage.leaseId !== lease.leaseId ||
      stage.fencingToken !== lease.fencingToken
    ) {
      throw storageError(
        "AREA_DELETE_SNAPSHOT_STAGE_IDENTITY_MISMATCH",
        "Delete candidate does not match the retained stage lease.",
      );
    }
    const expectedKeys = [normalized.moduleIfo.fileName];
    if (JSON.stringify(expectedKeys) !== JSON.stringify(stage.candidateLogicalKeys)) {
      throw storageError(
        "AREA_DELETE_SNAPSHOT_STAGE_CONFLICT",
        "Delete candidate object set differs from the retained stage.",
      );
    }
    const successor = await this.requireManifest(stage.successor.manifestKey);
    assertManifestIdentity(successor, stage.successor);
    return { stage, successor, normalized };
  }

  private async assertExactBaseline(
    baseline: ModuleSnapshotManifest,
    candidate: AreaDeleteCompiledCandidate,
  ): Promise<void> {
    for (const resource of candidate.removedResources) {
      try {
        await this.verifyObject(baseline, resource.fileName, resource);
      } catch (error) {
        throw storageError(
          "AREA_DELETE_SNAPSHOT_BASELINE_RESOURCE_MISMATCH",
          `Destructive candidate does not match retained ${resource.fileName}: ${errorMessage(error)}`,
        );
      }
    }
    try {
      await this.verifyObject(baseline, candidate.moduleIfo.fileName, {
        resourceType: candidate.moduleIfo.resourceType,
        size: candidate.moduleIfo.baselineBytes.length,
        sha256: candidate.moduleIfo.baselineSha256,
        bytes: candidate.moduleIfo.baselineBytes,
      });
    } catch (error) {
      throw storageError(
        "AREA_DELETE_SNAPSHOT_BASELINE_IFO_MISMATCH",
        `Destructive candidate IFO does not derive from the retained baseline: ${errorMessage(error)}`,
      );
    }
    if (baseline.objects.length - candidate.removedResources.length !== candidate.survivorCount) {
      throw storageError(
        "AREA_DELETE_SNAPSHOT_CANDIDATE_INVALID",
        "Delete survivor count differs from the retained baseline.",
      );
    }
  }

  private async assertJournalBaseline(
    baseline: ModuleSnapshotManifest,
    journal: AreaDeletePersistedJournalRecord,
  ): Promise<void> {
    for (const resource of journal.candidateManifest.removedResources) {
      await this.verifyObject(baseline, resource.fileName, resource);
    }
    const ifo = journal.candidateManifest.moduleIfo;
    await this.verifyObject(baseline, ifo.fileName, {
      resourceType: ifo.resourceType,
      size: ifo.baselineSize,
      sha256: ifo.baselineSha256,
    });
  }

  private async verifySuccessorDelta(
    stage: AreaCreateSnapshotStageDescriptor,
    successor: ModuleSnapshotManifest,
    candidate: AreaDeleteCompiledCandidate,
  ): Promise<Buffer> {
    const baseline = await this.requireManifest(stage.base.manifestKey);
    assertManifestIdentity(baseline, stage.base);
    if (successor.parentRevision !== baseline.revision) {
      throw storageError(
        "AREA_DELETE_SNAPSHOT_MANIFEST_CONFLICT",
        "Delete successor does not directly descend from the retained baseline.",
      );
    }
    const removed = new Set(
      candidate.removedResources.map((resource) => resource.fileName.toLowerCase()),
    );
    if (
      successor.objects.length !== candidate.survivorCount ||
      candidate.survivorCount !== baseline.objects.length - removed.size
    ) {
      throw storageError(
        "AREA_DELETE_SNAPSHOT_SURVIVOR_COUNT_MISMATCH",
        "Delete successor has an unexpected survivor count.",
      );
    }
    for (const logicalKey of removed) {
      if (successor.objects.some((entry) => entry.logicalKey.toLowerCase() === logicalKey)) {
        throw storageError(
          "AREA_DELETE_SNAPSHOT_RESOURCE_RETAINED",
          `Delete successor still contains ${logicalKey}.`,
        );
      }
    }
    const ifoKey = candidate.moduleIfo.fileName.toLowerCase();
    for (const baselineObject of baseline.objects) {
      const key = baselineObject.logicalKey.toLowerCase();
      if (removed.has(key) || key === ifoKey) continue;
      const retained = findDescriptors(successor, baselineObject.logicalKey);
      if (retained.length !== 1 || !sameDescriptor(retained[0], baselineObject)) {
        throw storageError(
          "AREA_DELETE_SNAPSHOT_MANIFEST_CONFLICT",
          `Unrelated snapshot object changed during Area Delete: ${baselineObject.logicalKey}.`,
        );
      }
    }
    return this.verifyObject(successor, candidate.moduleIfo.fileName, {
      resourceType: candidate.moduleIfo.resourceType,
      size: candidate.moduleIfo.candidateBytes.length,
      sha256: candidate.moduleIfo.candidateSha256,
      bytes: candidate.moduleIfo.candidateBytes,
    });
  }

  private async verifyObject(
    manifest: ModuleSnapshotManifest,
    logicalKey: string,
    expected: Readonly<{
      resourceType: number;
      size: number;
      sha256: string;
      bytes?: Buffer;
    }>,
  ): Promise<Buffer> {
    const matches = findDescriptors(manifest, logicalKey);
    if (
      matches.length !== 1 ||
      matches[0].resourceType !== expected.resourceType ||
      matches[0].size !== expected.size ||
      matches[0].sha256 !== expected.sha256
    ) {
      throw storageError(
        "AREA_DELETE_SNAPSHOT_DESCRIPTOR_MISMATCH",
        `Snapshot descriptor differs for ${logicalKey}.`,
      );
    }
    const retained = await this.repository.readContent(matches[0].contentKey);
    if (
      !retained ||
      retained.size !== expected.size ||
      retained.sha256 !== expected.sha256 ||
      sha256Hex(retained.bytes) !== expected.sha256 ||
      (expected.bytes && !sameBytes(retained.bytes, expected.bytes))
    ) {
      throw storageError(
        "AREA_DELETE_SNAPSHOT_CONTENT_MISMATCH",
        `Snapshot content differs for ${logicalKey}.`,
      );
    }
    return Buffer.from(retained.bytes);
  }

  private async assertHeadAtEither(stage: AreaCreateSnapshotStageDescriptor): Promise<void> {
    const head = await this.requireHead(stage.moduleId);
    if (!sameIdentity(head, stage.base) && !sameIdentity(head, stage.successor)) {
      throw storageError(
        "AREA_DELETE_SNAPSHOT_HEAD_REVISION_CONFLICT",
        "Module head is outside the retained Delete transition.",
      );
    }
  }

  private async requireHead(moduleId: string): Promise<ModuleSnapshotHead> {
    const head = await this.repository.readHead(moduleId);
    if (!head) {
      throw storageError("AREA_DELETE_SNAPSHOT_HEAD_MISSING", "Module head is missing.");
    }
    return head;
  }

  private async requireMutableHead(moduleId: string): Promise<ModuleSnapshotHead> {
    const head = await this.requireHead(moduleId);
    if (head.quarantined) {
      throw storageError(
        "AREA_DELETE_SNAPSHOT_MODULE_QUARANTINED",
        "A quarantined module cannot accept Area Delete.",
      );
    }
    return head;
  }

  private async requireStage(transactionId: string): Promise<AreaCreateSnapshotStageDescriptor> {
    const stage = await this.repository.readStage(transactionId);
    if (!stage) {
      throw storageError("AREA_DELETE_SNAPSHOT_STAGE_MISSING", "Delete stage is missing.");
    }
    return stage;
  }

  private async requireManifest(manifestKey: string): Promise<ModuleSnapshotManifest> {
    const manifest = await this.repository.readManifest(manifestKey);
    if (!manifest) {
      throw storageError(
        "AREA_DELETE_SNAPSHOT_MANIFEST_MISSING",
        "Module manifest is missing.",
      );
    }
    return manifest;
  }
}

function normalizeCandidate(
  candidate: AreaDeleteCompiledCandidate,
  moduleId: string,
): AreaDeleteCompiledCandidate {
  if (
    !candidate ||
    typeof candidate !== "object" ||
    !Array.isArray(candidate.removedResources) ||
    candidate.removedResources.length !== REQUIRED_EXTENSIONS.length ||
    candidate.preview.moduleId !== moduleId ||
    candidate.preview.areaResRef.toLowerCase() !== candidate.areaId.toLowerCase() ||
    candidate.preview.blockerCount !== 0 ||
    !Number.isSafeInteger(candidate.survivorCount) ||
    candidate.survivorCount < 1
  ) {
    throw storageError(
      "AREA_DELETE_SNAPSHOT_CANDIDATE_INVALID",
      "Area Delete candidate identity or cardinality is invalid.",
    );
  }
  const byExtension = new Map(
    candidate.removedResources.map((resource) => [resource.extension, resource]),
  );
  if (byExtension.size !== 3 || REQUIRED_EXTENSIONS.some((value) => !byExtension.has(value))) {
    throw storageError(
      "AREA_DELETE_SNAPSHOT_CANDIDATE_INVALID",
      "Area Delete candidate must contain exactly ARE, GIT, and GIC.",
    );
  }
  const removedResources = REQUIRED_EXTENSIONS.map((extension) => {
    const resource = byExtension.get(extension)!;
    const fileName = normalizeModuleSnapshotLogicalKey(resource.fileName);
    if (
      fileName.toLowerCase() !== `${candidate.areaId}.${extension}`.toLowerCase() ||
      resource.size !== resource.bytes.length ||
      resource.resourceType !== resourceType(extension) ||
      sha256Hex(resource.bytes) !== resource.sha256
    ) {
      throw storageError(
        "AREA_DELETE_SNAPSHOT_CANDIDATE_INVALID",
        `Area Delete ${extension.toUpperCase()} metadata is inconsistent.`,
      );
    }
    return Object.freeze({ ...resource, fileName, bytes: Buffer.from(resource.bytes) });
  });
  const ifoFileName = normalizeModuleSnapshotLogicalKey(candidate.moduleIfo.fileName);
  if (
    ifoFileName.toLowerCase() !== "module.ifo" ||
    candidate.moduleIfo.resourceType !== 2014 ||
    sha256Hex(candidate.moduleIfo.baselineBytes) !== candidate.moduleIfo.baselineSha256 ||
    sha256Hex(candidate.moduleIfo.candidateBytes) !== candidate.moduleIfo.candidateSha256 ||
    moduleIfoAreaMembershipCount(candidate.moduleIfo.baselineBytes, candidate.areaId) !== 1 ||
    moduleIfoAreaMembershipCount(candidate.moduleIfo.candidateBytes, candidate.areaId) !== 0
  ) {
    throw storageError(
      "AREA_DELETE_SNAPSHOT_CANDIDATE_INVALID",
      "Area Delete module IFO candidate metadata or membership delta is invalid.",
    );
  }
  return Object.freeze({
    ...candidate,
    removedResources: Object.freeze(removedResources),
    moduleIfo: Object.freeze({
      ...candidate.moduleIfo,
      fileName: ifoFileName,
      baselineBytes: Buffer.from(candidate.moduleIfo.baselineBytes),
      candidateBytes: Buffer.from(candidate.moduleIfo.candidateBytes),
    }),
  });
}

function semanticDeletionDiagnostics(ifoBytes: Buffer, areaResRef: string): string[] {
  const diagnostics: string[] = [];
  const membershipCount = moduleIfoAreaMembershipCount(ifoBytes, areaResRef);
  if (membershipCount !== 0) {
    diagnostics.push(`AREA_DELETE_IFO_MEMBERSHIP_READBACK_FAILED:${membershipCount}`);
  }
  if (readModuleIfoEntryArea(ifoBytes)?.toLowerCase() === areaResRef.toLowerCase()) {
    diagnostics.push("AREA_DELETE_ENTRY_AREA_READBACK_FAILED");
  }
  return diagnostics;
}

function persistedResource(resource: AreaCreateCandidateResource): AreaCreatePersistedArtifact {
  return Object.freeze({
    extension: resource.extension,
    key: resource.key,
    fileName: resource.fileName,
    resourceType: resource.resourceType,
    size: resource.size,
    sha256: resource.sha256,
  });
}

function findDescriptors(
  manifest: ModuleSnapshotManifest,
  logicalKey: string,
): readonly ModuleSnapshotObjectDescriptor[] {
  const lowered = logicalKey.toLowerCase();
  return manifest.objects.filter((entry) => entry.logicalKey.toLowerCase() === lowered);
}

function sameDescriptor(
  left: ModuleSnapshotObjectDescriptor,
  right: ModuleSnapshotObjectDescriptor,
): boolean {
  return left.logicalKey === right.logicalKey &&
    left.resourceType === right.resourceType &&
    left.size === right.size &&
    left.sha256 === right.sha256 &&
    left.contentKey === right.contentKey;
}

function assertManifestIdentity(
  manifest: ModuleSnapshotManifest,
  identity: ModuleSnapshotHeadIdentity,
): void {
  let manifestKey: string;
  let manifestSha256: string;
  try {
    manifestKey = buildModuleSnapshotManifestKey(manifest);
    manifestSha256 = hashModuleSnapshotManifest(manifest);
  } catch (error) {
    throw storageError(
      "AREA_DELETE_SNAPSHOT_MANIFEST_CONFLICT",
      `Snapshot manifest is not canonical: ${errorMessage(error)}`,
    );
  }
  if (
    manifest.revision !== identity.revision ||
    manifestKey !== identity.manifestKey ||
    manifestSha256 !== identity.manifestSha256
  ) {
    throw storageError(
      "AREA_DELETE_SNAPSHOT_MANIFEST_CONFLICT",
      "Snapshot manifest differs from its captured identity.",
    );
  }
}

function headIdentity(head: ModuleSnapshotHead): ModuleSnapshotHeadIdentity {
  return Object.freeze({
    revision: head.revision,
    manifestKey: head.manifestKey,
    manifestSha256: head.manifestSha256,
  });
}

function manifestIdentity(manifest: ModuleSnapshotManifest): ModuleSnapshotHeadIdentity {
  return Object.freeze({
    revision: manifest.revision,
    manifestKey: buildModuleSnapshotManifestKey(manifest),
    manifestSha256: hashModuleSnapshotManifest(manifest),
  });
}

function sameIdentity(
  left: ModuleSnapshotHeadIdentity,
  right: ModuleSnapshotHeadIdentity,
): boolean {
  return left.revision === right.revision &&
    left.manifestKey === right.manifestKey &&
    left.manifestSha256 === right.manifestSha256;
}

function assertLeaseScope(
  transactionId: string,
  moduleId: string,
  lease: AreaCreateModuleLease,
  recovery: boolean,
): void {
  if (
    lease.moduleId !== moduleId ||
    lease.ownerTransactionId !== transactionId ||
    (!recovery && lease.fencingToken < 1)
  ) {
    throw storageError(
      "AREA_DELETE_SNAPSHOT_STAGE_IDENTITY_MISMATCH",
      "Area Delete does not own the target module transaction.",
    );
  }
}

function resourceType(extension: "are" | "git" | "gic"): number {
  return extension === "are" ? 2012 : extension === "git" ? 2023 : 2046;
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && timingSafeEqual(left, right);
}

function result(
  verified: boolean,
  diagnostics: readonly string[],
): Readonly<{ verified: boolean; diagnostics: readonly string[] }> {
  return Object.freeze({ verified, diagnostics: Object.freeze([...diagnostics]) });
}

function storageError(code: string, message: string): Error {
  return new Error(`${code}: ${message}`);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
