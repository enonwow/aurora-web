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
  AreaRenameRecoveryStoragePort,
  AreaRenameTransactionStoragePort,
} from "../../../application/ports/area-rename-transaction.port";
import type {
  AreaRenameCandidateResource,
  AreaRenameCompiledCandidate,
  AreaRenamePersistedArtifact,
  AreaRenamePersistedJournalRecord,
  AreaRenameReadbackResult,
} from "../../../domain/area-rename-transaction.types";
import {
  buildModuleSnapshotManifestKey,
  hashModuleSnapshotManifest,
  normalizeModuleSnapshotLogicalKey,
  validateModuleSnapshotManifest,
  type ModuleSnapshotManifest,
  type ModuleSnapshotObjectDescriptor,
} from "../../../domain/module-snapshot-manifest";
import {
  readExactAreaRootResRef,
  readExactModuleAreaIdentity,
} from "../blob/aurora-gff-area-resref-rename-writer";

const REQUIRED_EXTENSIONS = ["are", "gic", "git"] as const;
const CANONICAL_RESREF = /^[a-z0-9_]{1,16}$/u;

/** Publishes the complete resource-bound Area rename through one head CAS. */
export class AtomicAreaRenameTransactionStorageAdapter
  implements AreaRenameTransactionStoragePort, AreaRenameRecoveryStoragePort
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
    candidate: AreaRenameCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<void> {
    assertLeaseScope(transactionId, moduleId, lease, false);
    const normalized = normalizeCandidate(candidate, moduleId);
    const retained = await this.repository.readStage(transactionId);
    if (retained) {
      const loaded = await this.loadCandidateStage(
        transactionId, moduleId, normalized, lease,
      );
      await this.verifySuccessorDelta(loaded.stage, loaded.baseline, loaded.successor, normalized);
      await this.assertHeadAtEither(loaded.stage);
      return;
    }

    const head = await this.requireMutableHead(moduleId);
    const baseline = await this.requireManifest(head.manifestKey);
    assertManifestIdentity(baseline, head);
    if (!sameManifestIdentity(baseline, normalized.baselineManifest)) {
      throw storageError(
        "AREA_RENAME_SNAPSHOT_BASELINE_MISMATCH",
        "Candidate baseline differs from the current module head.",
      );
    }
    await this.assertExactBaseline(baseline, normalized);
    for (const resource of normalized.resources) {
      await this.repository.putContentIfAbsent(
        resource.candidateBytes,
        resource.candidateSha256,
      );
    }
    await this.repository.putContentIfAbsent(
      normalized.moduleIfo.candidateBytes,
      normalized.moduleIfo.candidateSha256,
    );
    await this.repository.putManifestIfAbsent(normalized.successorManifest);
    const candidateLogicalKeys = [
      ...normalized.resources.map((entry) => entry.targetKey),
      normalized.moduleIfo.key,
    ].sort(compareLogicalKeys);
    const stage: AreaCreateSnapshotStageDescriptor = Object.freeze({
      schemaVersion: AREA_CREATE_SNAPSHOT_STAGE_SCHEMA_VERSION,
      transactionId,
      moduleId,
      leaseId: lease.leaseId,
      fencingToken: lease.fencingToken,
      base: headIdentity(head),
      successor: manifestIdentity(normalized.successorManifest),
      candidateLogicalKeys: Object.freeze(candidateLogicalKeys),
      createdAt: this.clock.nowIso(),
    });
    await this.repository.putStageIfAbsent(stage);
  }

  async commitResources(
    transactionId: string,
    moduleId: string,
    candidate: AreaRenameCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<void> {
    const loaded = await this.loadCandidateStage(transactionId, moduleId, candidate, lease);
    await this.verifySuccessorDelta(loaded.stage, loaded.baseline, loaded.successor, loaded.normalized);
    await this.assertHeadAtEither(loaded.stage);
  }

  async commitModuleIfo(
    transactionId: string,
    moduleId: string,
    candidate: AreaRenameCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<void> {
    const loaded = await this.loadCandidateStage(transactionId, moduleId, candidate, lease);
    await this.verifySuccessorDelta(loaded.stage, loaded.baseline, loaded.successor, loaded.normalized);
    await this.repository.compareAndSetHead(transactionId, lease);
  }

  async readBack(
    transactionId: string,
    moduleId: string,
    candidate: AreaRenameCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<AreaRenameReadbackResult> {
    const loaded = await this.loadCandidateStage(transactionId, moduleId, candidate, lease);
    const head = await this.requireHead(moduleId);
    if (!sameIdentity(head, loaded.stage.successor)) {
      throw storageError(
        "AREA_RENAME_SNAPSHOT_READBACK_HEAD_MISMATCH",
        "Rename readback did not capture the published successor head.",
      );
    }
    const verified = await this.verifySuccessorDelta(
      loaded.stage, loaded.baseline, loaded.successor, loaded.normalized,
    );
    const diagnostics = semanticRenameDiagnostics(
      verified.areBytes,
      verified.ifoBytes,
      loaded.normalized.areaId,
      loaded.normalized.targetAreaId,
      loaded.normalized.entryAreaUpdated,
      loaded.normalized.preview.entryAreaResRef,
    );
    return Object.freeze({
      verified: diagnostics.length === 0,
      newModuleRevision: head.revision,
      resources: Object.freeze(loaded.normalized.resources.map(persistedResource)),
      moduleIfo: Object.freeze({
        key: loaded.normalized.moduleIfo.key,
        baselineSize: loaded.normalized.moduleIfo.baselineSize,
        baselineSha256: loaded.normalized.moduleIfo.baselineSha256,
        candidateSize: loaded.normalized.moduleIfo.candidateSize,
        candidateSha256: loaded.normalized.moduleIfo.candidateSha256,
      }),
      survivorCount: loaded.normalized.survivorCount,
      entryAreaUpdated: loaded.normalized.entryAreaUpdated,
      diagnostics: Object.freeze(diagnostics),
    });
  }

  async compensate(
    transactionId: string,
    moduleId: string,
    candidate: AreaRenameCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<Readonly<{ restored: boolean; diagnostics: readonly string[] }>>;
  async compensate(
    journal: AreaRenamePersistedJournalRecord,
    lease: AreaCreateModuleLease,
  ): Promise<Readonly<{ restored: boolean; diagnostics: readonly string[] }>>;
  async compensate(
    transactionOrJournal: string | AreaRenamePersistedJournalRecord,
    moduleOrLease: string | AreaCreateModuleLease,
    candidate?: AreaRenameCompiledCandidate,
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
            "AREA_RENAME_SNAPSHOT_BASELINE_UNPROVEN",
            "Stage-free compensation cannot prove the exact baseline head.",
          );
        }
        const baseline = await this.requireManifest(head.manifestKey);
        assertManifestIdentity(baseline, head);
        if (typeof transactionOrJournal === "string") {
          const normalized = normalizeCandidate(candidate!, moduleId);
          if (!sameIdentity(head, manifestIdentity(normalized.baselineManifest))) {
            throw storageError(
              "AREA_RENAME_SNAPSHOT_BASELINE_UNPROVEN",
              "Stage-free compensation head differs from the candidate baseline.",
            );
          }
          await this.assertExactBaseline(baseline, normalized);
        } else {
          await this.assertJournalBaseline(baseline, transactionOrJournal);
        }
        return result(true, []);
      } catch (error) {
        return result(false, [
          `AREA_RENAME_SNAPSHOT_STAGE_MISSING_BASELINE_UNPROVEN:${errorMessage(error)}`,
        ]);
      }
    }
    if (stage.moduleId !== moduleId) {
      throw storageError(
        "AREA_RENAME_SNAPSHOT_STAGE_IDENTITY_MISMATCH",
        "Rename compensation module differs from the retained stage.",
      );
    }
    await this.repository.restoreBaseline(transactionId, lease);
    const restored = await this.requireHead(moduleId);
    if (!sameIdentity(restored, stage.base)) {
      return result(false, ["AREA_RENAME_SNAPSHOT_COMPENSATION_READBACK_MISMATCH"]);
    }
    return result(true, []);
  }

  async quarantine(
    moduleId: string,
    transactionId: string,
    diagnostics: readonly string[],
    lease: AreaCreateModuleLease,
  ): Promise<void>;
  async quarantine(
    journal: AreaRenamePersistedJournalRecord,
    lease: AreaCreateModuleLease,
    diagnostics: readonly string[],
  ): Promise<void>;
  async quarantine(
    moduleOrJournal: string | AreaRenamePersistedJournalRecord,
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
    journal: AreaRenamePersistedJournalRecord,
    lease: AreaCreateModuleLease,
  ): Promise<Readonly<{ verified: boolean; diagnostics: readonly string[] }>> {
    assertLeaseScope(journal.transactionId, journal.moduleId, lease, true);
    try {
      const manifest = journal.candidateManifest;
      const receipt = journal.receipt;
      if (!receipt || manifest.areaId !== journal.areaResRef ||
          manifest.targetAreaId !== journal.targetAreaResRef ||
          manifest.previewSha256 !== journal.previewSha256 ||
          manifest.baselineRevision !== journal.expectedModuleRevision ||
          receipt.newModuleRevision !== manifest.successorRevision) {
        return verificationResult(false, ["AREA_RENAME_SNAPSHOT_RECOVERY_IDENTITY_MISMATCH"]);
      }
      const stage = await this.requireStage(journal.transactionId);
      const head = await this.requireHead(journal.moduleId);
      if (!sameIdentity(head, stage.successor) ||
          stage.base.revision !== manifest.baselineRevision ||
          stage.successor.revision !== manifest.successorRevision) {
        return verificationResult(false, ["AREA_RENAME_SNAPSHOT_RECOVERY_HEAD_MISMATCH"]);
      }
      const baseline = await this.requireManifest(stage.base.manifestKey);
      const successor = await this.requireManifest(stage.successor.manifestKey);
      assertManifestIdentity(baseline, stage.base);
      assertManifestIdentity(successor, stage.successor);
      const diagnostics: string[] = [];
      const resources = validateRecoveryResources(journal, diagnostics);
      let areBytes: Buffer | null = null;
      const removed = new Set(resources.map((entry) => entry.sourceKey.toLowerCase()));
      for (const resource of resources) {
        if (findDescriptors(successor, resource.sourceKey).length !== 0) {
          diagnostics.push(`AREA_RENAME_SNAPSHOT_SOURCE_RETAINED:${resource.sourceKey}`);
        }
        const bytes = await this.verifyObject(successor, resource.targetKey, {
          resourceType: resource.resourceType,
          size: resource.candidateSize,
          sha256: resource.candidateSha256,
        });
        if (resource.extension === "are") areBytes = bytes;
      }
      const ifo = manifest.moduleIfo;
      const ifoBytes = await this.verifyObject(successor, ifo.key, {
        resourceType: ifo.resourceType,
        size: ifo.candidateSize,
        sha256: ifo.candidateSha256,
      });
      if (successor.objects.length !== manifest.survivorCount + resources.length ||
          baseline.objects.length !== successor.objects.length) {
        diagnostics.push("AREA_RENAME_SNAPSHOT_RECOVERY_CARDINALITY_MISMATCH");
      }
      for (const baselineObject of baseline.objects) {
        const key = baselineObject.logicalKey.toLowerCase();
        if (removed.has(key) || key === "module.ifo") continue;
        const retained = findDescriptors(successor, baselineObject.logicalKey);
        if (retained.length !== 1 || !sameDescriptor(retained[0]!, baselineObject)) {
          diagnostics.push(
            `AREA_RENAME_SNAPSHOT_RECOVERY_UNRELATED_OBJECT_CHANGED:${baselineObject.logicalKey}`,
          );
        }
      }
      if (!areBytes) diagnostics.push("AREA_RENAME_SNAPSHOT_RECOVERY_ARE_MISSING");
      else diagnostics.push(...semanticRenameDiagnostics(
        areBytes,
        ifoBytes,
        manifest.areaId,
        manifest.targetAreaId,
        manifest.entryAreaUpdated,
        manifest.entryAreaResRef,
      ));
      diagnostics.push(...receiptRecoveryDiagnostics(journal));
      return verificationResult(diagnostics.length === 0, diagnostics);
    } catch (error) {
      return verificationResult(
        false,
        [`AREA_RENAME_SNAPSHOT_RECOVERY_INVALID:${errorMessage(error)}`],
      );
    }
  }

  private async loadCandidateStage(
    transactionId: string,
    moduleId: string,
    candidate: AreaRenameCompiledCandidate,
    lease: AreaCreateModuleLease,
  ) {
    assertLeaseScope(transactionId, moduleId, lease, false);
    const normalized = normalizeCandidate(candidate, moduleId);
    const stage = await this.requireStage(transactionId);
    if (stage.moduleId !== moduleId || stage.leaseId !== lease.leaseId ||
        stage.fencingToken !== lease.fencingToken) {
      throw storageError(
        "AREA_RENAME_SNAPSHOT_STAGE_IDENTITY_MISMATCH",
        "Rename candidate does not match the retained stage lease.",
      );
    }
    const expectedKeys = [
      ...normalized.resources.map((entry) => entry.targetKey),
      normalized.moduleIfo.key,
    ].sort(compareLogicalKeys);
    if (JSON.stringify(expectedKeys) !== JSON.stringify(stage.candidateLogicalKeys)) {
      throw storageError(
        "AREA_RENAME_SNAPSHOT_STAGE_CONFLICT",
        "Rename candidate object set differs from the retained stage.",
      );
    }
    const baseline = await this.requireManifest(stage.base.manifestKey);
    const successor = await this.requireManifest(stage.successor.manifestKey);
    assertManifestIdentity(baseline, stage.base);
    assertManifestIdentity(successor, stage.successor);
    if (!sameManifestIdentity(baseline, normalized.baselineManifest) ||
        !sameManifestIdentity(successor, normalized.successorManifest)) {
      throw storageError(
        "AREA_RENAME_SNAPSHOT_STAGE_CONFLICT",
        "Retained stage manifests differ from the rename candidate.",
      );
    }
    return {
      stage,
      baseline,
      successor,
      normalized,
    } as Readonly<{
      stage: AreaCreateSnapshotStageDescriptor;
      baseline: ModuleSnapshotManifest;
      successor: ModuleSnapshotManifest;
      normalized: AreaRenameCompiledCandidate;
    }>;
  }

  private async assertExactBaseline(
    baseline: ModuleSnapshotManifest,
    candidate: AreaRenameCompiledCandidate,
  ): Promise<void> {
    for (const resource of candidate.resources) {
      await this.verifyObject(baseline, resource.sourceKey, {
        resourceType: resource.resourceType,
        size: resource.baselineSize,
        sha256: resource.baselineSha256,
        bytes: resource.baselineBytes,
      });
    }
    await this.verifyObject(baseline, candidate.moduleIfo.key, {
      resourceType: candidate.moduleIfo.resourceType,
      size: candidate.moduleIfo.baselineSize,
      sha256: candidate.moduleIfo.baselineSha256,
      bytes: candidate.moduleIfo.baselineBytes,
    });
  }

  private async assertJournalBaseline(
    baseline: ModuleSnapshotManifest,
    journal: AreaRenamePersistedJournalRecord,
  ): Promise<void> {
    const manifest = journal.candidateManifest;
    if (baseline.revision !== manifest.baselineRevision ||
        manifest.areaId !== journal.areaResRef ||
        manifest.targetAreaId !== journal.targetAreaResRef) {
      throw storageError(
        "AREA_RENAME_SNAPSHOT_BASELINE_UNPROVEN",
        "Journal identity differs from the retained baseline.",
      );
    }
    const diagnostics: string[] = [];
    const resources = validateRecoveryResources(journal, diagnostics);
    if (diagnostics.length > 0) {
      throw storageError("AREA_RENAME_SNAPSHOT_BASELINE_UNPROVEN", diagnostics.join(","));
    }
    for (const resource of resources) {
      await this.verifyObject(baseline, resource.sourceKey, {
        resourceType: resource.resourceType,
        size: resource.baselineSize,
        sha256: resource.baselineSha256,
      });
    }
    await this.verifyObject(baseline, manifest.moduleIfo.key, {
      resourceType: manifest.moduleIfo.resourceType,
      size: manifest.moduleIfo.baselineSize,
      sha256: manifest.moduleIfo.baselineSha256,
    });
  }

  private async verifySuccessorDelta(
    stage: AreaCreateSnapshotStageDescriptor,
    baseline: ModuleSnapshotManifest,
    successor: ModuleSnapshotManifest,
    candidate: AreaRenameCompiledCandidate,
  ): Promise<Readonly<{ areBytes: Buffer; ifoBytes: Buffer }>> {
    if (successor.parentRevision !== baseline.revision ||
        successor.objects.length !== baseline.objects.length ||
        candidate.survivorCount !== baseline.objects.length - candidate.resources.length) {
      throw storageError(
        "AREA_RENAME_SNAPSHOT_MANIFEST_CONFLICT",
        "Rename successor lineage or cardinality is invalid.",
      );
    }
    if (!sameIdentity(stage.base, manifestIdentity(baseline)) ||
        !sameIdentity(stage.successor, manifestIdentity(successor))) {
      throw storageError(
        "AREA_RENAME_SNAPSHOT_MANIFEST_CONFLICT",
        "Rename stage identity differs from its manifests.",
      );
    }
    let areBytes: Buffer | null = null;
    const removed = new Set(candidate.resources.map((entry) => entry.sourceKey.toLowerCase()));
    for (const resource of candidate.resources) {
      if (findDescriptors(successor, resource.sourceKey).length !== 0) {
        throw storageError(
          "AREA_RENAME_SNAPSHOT_SOURCE_RETAINED",
          `Rename successor still contains ${resource.sourceKey}.`,
        );
      }
      const bytes = await this.verifyObject(successor, resource.targetKey, {
        resourceType: resource.resourceType,
        size: resource.candidateSize,
        sha256: resource.candidateSha256,
        bytes: resource.candidateBytes,
      });
      if (resource.extension === "are") areBytes = bytes;
    }
    const ifoBytes = await this.verifyObject(successor, candidate.moduleIfo.key, {
      resourceType: candidate.moduleIfo.resourceType,
      size: candidate.moduleIfo.candidateSize,
      sha256: candidate.moduleIfo.candidateSha256,
      bytes: candidate.moduleIfo.candidateBytes,
    });
    for (const baselineObject of baseline.objects) {
      const key = baselineObject.logicalKey.toLowerCase();
      if (removed.has(key) || key === "module.ifo") continue;
      const retained = findDescriptors(successor, baselineObject.logicalKey);
      if (retained.length !== 1 || !sameDescriptor(retained[0]!, baselineObject)) {
        throw storageError(
          "AREA_RENAME_SNAPSHOT_MANIFEST_CONFLICT",
          `Unrelated snapshot object changed during Area rename: ${baselineObject.logicalKey}.`,
        );
      }
    }
    if (!areBytes) {
      throw storageError("AREA_RENAME_SNAPSHOT_CANDIDATE_INVALID", "Candidate ARE is missing.");
    }
    return Object.freeze({ areBytes, ifoBytes });
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
    if (matches.length !== 1 || matches[0]?.resourceType !== expected.resourceType ||
        matches[0].size !== expected.size || matches[0].sha256 !== expected.sha256) {
      throw storageError(
        "AREA_RENAME_SNAPSHOT_DESCRIPTOR_MISMATCH",
        `Snapshot descriptor differs for ${logicalKey}.`,
      );
    }
    const retained = await this.repository.readContent(matches[0].contentKey);
    if (!retained || retained.size !== expected.size || retained.sha256 !== expected.sha256 ||
        retained.bytes.length !== expected.size || sha256Hex(retained.bytes) !== expected.sha256 ||
        (expected.bytes && !sameBytes(retained.bytes, expected.bytes))) {
      throw storageError(
        "AREA_RENAME_SNAPSHOT_CONTENT_MISMATCH",
        `Snapshot content differs for ${logicalKey}.`,
      );
    }
    return Buffer.from(retained.bytes);
  }

  private async assertHeadAtEither(stage: AreaCreateSnapshotStageDescriptor): Promise<void> {
    const head = await this.requireHead(stage.moduleId);
    if (!sameIdentity(head, stage.base) && !sameIdentity(head, stage.successor)) {
      throw storageError(
        "AREA_RENAME_SNAPSHOT_HEAD_REVISION_CONFLICT",
        "Module head is outside the retained rename transition.",
      );
    }
  }

  private async requireHead(moduleId: string): Promise<ModuleSnapshotHead> {
    const head = await this.repository.readHead(moduleId);
    if (!head) throw storageError("AREA_RENAME_SNAPSHOT_HEAD_MISSING", "Module head is missing.");
    return head;
  }

  private async requireMutableHead(moduleId: string): Promise<ModuleSnapshotHead> {
    const head = await this.requireHead(moduleId);
    if (head.quarantined) {
      throw storageError(
        "AREA_RENAME_SNAPSHOT_MODULE_QUARANTINED",
        "A quarantined module cannot accept Area rename.",
      );
    }
    return head;
  }

  private async requireStage(transactionId: string): Promise<AreaCreateSnapshotStageDescriptor> {
    const stage = await this.repository.readStage(transactionId);
    if (!stage) throw storageError("AREA_RENAME_SNAPSHOT_STAGE_MISSING", "Rename stage is missing.");
    return stage;
  }

  private async requireManifest(manifestKey: string): Promise<ModuleSnapshotManifest> {
    const manifest = await this.repository.readManifest(manifestKey);
    if (!manifest) {
      throw storageError("AREA_RENAME_SNAPSHOT_MANIFEST_MISSING", "Module manifest is missing.");
    }
    return manifest;
  }
}

function normalizeCandidate(
  candidate: AreaRenameCompiledCandidate,
  moduleId: string,
): AreaRenameCompiledCandidate {
  if (!candidate || typeof candidate !== "object" ||
      !CANONICAL_RESREF.test(candidate.areaId) || !CANONICAL_RESREF.test(candidate.targetAreaId) ||
      candidate.areaId === candidate.targetAreaId ||
      candidate.preview.moduleId !== moduleId || candidate.preview.areaResRef !== candidate.areaId ||
      candidate.preview.targetAreaResRef !== candidate.targetAreaId ||
      candidate.preview.blockerCount !== 0 ||
      !Array.isArray(candidate.resources) || candidate.resources.length !== 3 ||
      !Number.isSafeInteger(candidate.survivorCount) || candidate.survivorCount < 1) {
    throw storageError(
      "AREA_RENAME_SNAPSHOT_CANDIDATE_INVALID",
      "Area rename candidate identity or cardinality is invalid.",
    );
  }
  let baselineManifest: ModuleSnapshotManifest;
  let successorManifest: ModuleSnapshotManifest;
  try {
    baselineManifest = validateModuleSnapshotManifest(candidate.baselineManifest);
    successorManifest = validateModuleSnapshotManifest(candidate.successorManifest);
  } catch (error) {
    throw storageError(
      "AREA_RENAME_SNAPSHOT_CANDIDATE_INVALID",
      `Area rename manifests are invalid: ${errorMessage(error)}`,
    );
  }
  if (baselineManifest.moduleId !== moduleId || successorManifest.moduleId !== moduleId ||
      candidate.preview.moduleRevision !== baselineManifest.revision ||
      successorManifest.parentRevision !== baselineManifest.revision) {
    throw storageError(
      "AREA_RENAME_SNAPSHOT_CANDIDATE_INVALID",
      "Area rename manifest lineage differs from the preview.",
    );
  }
  const byExtension = new Map(candidate.resources.map((entry) => [entry.extension, entry]));
  if (byExtension.size !== 3 || REQUIRED_EXTENSIONS.some((extension) => !byExtension.has(extension))) {
    throw storageError(
      "AREA_RENAME_SNAPSHOT_CANDIDATE_INVALID",
      "Area rename candidate must contain exactly ARE, GIC, and GIT.",
    );
  }
  const resources = REQUIRED_EXTENSIONS.map((extension): AreaRenameCandidateResource => {
    const resource = byExtension.get(extension)!;
    const sourceKey = normalizeModuleSnapshotLogicalKey(resource.sourceKey);
    const targetKey = normalizeModuleSnapshotLogicalKey(resource.targetKey);
    if (sourceKey.toLowerCase() !== `${candidate.areaId}.${extension}` ||
        targetKey.toLowerCase() !== `${candidate.targetAreaId}.${extension}` ||
        resource.resourceType !== resourceType(extension) ||
        resource.baselineSize !== resource.baselineBytes.length ||
        resource.candidateSize !== resource.candidateBytes.length ||
        sha256Hex(resource.baselineBytes) !== resource.baselineSha256 ||
        sha256Hex(resource.candidateBytes) !== resource.candidateSha256 ||
        (extension !== "are" && !sameBytes(resource.baselineBytes, resource.candidateBytes))) {
      throw storageError(
        "AREA_RENAME_SNAPSHOT_CANDIDATE_INVALID",
        `Area rename ${extension.toUpperCase()} metadata is inconsistent.`,
      );
    }
    if (extension === "are" &&
        (readExactAreaRootResRef(resource.baselineBytes) !== candidate.areaId ||
         readExactAreaRootResRef(resource.candidateBytes) !== candidate.targetAreaId)) {
      throw storageError(
        "AREA_RENAME_SNAPSHOT_CANDIDATE_INVALID",
        "Area rename ARE identity delta is invalid.",
      );
    }
    return Object.freeze({
      ...resource,
      sourceKey,
      targetKey,
      baselineBytes: Buffer.from(resource.baselineBytes),
      candidateBytes: Buffer.from(resource.candidateBytes),
    });
  });
  const moduleIfo = candidate.moduleIfo;
  const baselineOld = readExactModuleAreaIdentity(moduleIfo.baselineBytes, candidate.areaId);
  const baselineNew = readExactModuleAreaIdentity(moduleIfo.baselineBytes, candidate.targetAreaId);
  const candidateOld = readExactModuleAreaIdentity(moduleIfo.candidateBytes, candidate.areaId);
  const candidateNew = readExactModuleAreaIdentity(moduleIfo.candidateBytes, candidate.targetAreaId);
  if (moduleIfo.key !== "module.ifo" || moduleIfo.resourceType !== 2014 ||
      moduleIfo.baselineSize !== moduleIfo.baselineBytes.length ||
      moduleIfo.candidateSize !== moduleIfo.candidateBytes.length ||
      sha256Hex(moduleIfo.baselineBytes) !== moduleIfo.baselineSha256 ||
      sha256Hex(moduleIfo.candidateBytes) !== moduleIfo.candidateSha256 ||
      !baselineOld || !baselineNew || !candidateOld || !candidateNew ||
      baselineOld.membershipCount !== 1 || baselineNew.membershipCount !== 0 ||
      candidateOld.membershipCount !== 0 || candidateNew.membershipCount !== 1 ||
      candidate.entryAreaUpdated !== (baselineOld.entryAreaResRef === candidate.areaId) ||
      candidateNew.entryAreaResRef !== (candidate.entryAreaUpdated
        ? candidate.targetAreaId
        : baselineOld.entryAreaResRef)) {
    throw storageError(
      "AREA_RENAME_SNAPSHOT_CANDIDATE_INVALID",
      "Area rename module IFO identity delta is invalid.",
    );
  }
  const normalized: AreaRenameCompiledCandidate = {
    ...candidate,
    resources: Object.freeze(resources),
    moduleIfo: Object.freeze({
      ...moduleIfo,
      baselineBytes: Buffer.from(moduleIfo.baselineBytes),
      candidateBytes: Buffer.from(moduleIfo.candidateBytes),
    }),
    baselineManifest,
    successorManifest,
  };
  return Object.freeze(normalized);
}

function semanticRenameDiagnostics(
  areBytes: Buffer,
  ifoBytes: Buffer,
  source: string,
  target: string,
  entryAreaUpdated: boolean,
  baselineEntryArea: string | null,
): string[] {
  const diagnostics: string[] = [];
  if (readExactAreaRootResRef(areBytes) !== target) {
    diagnostics.push("AREA_RENAME_ARE_IDENTITY_READBACK_FAILED");
  }
  const oldIdentity = readExactModuleAreaIdentity(ifoBytes, source);
  const newIdentity = readExactModuleAreaIdentity(ifoBytes, target);
  if (!oldIdentity || !newIdentity ||
      oldIdentity.membershipCount !== 0 || newIdentity.membershipCount !== 1) {
    diagnostics.push("AREA_RENAME_IFO_MEMBERSHIP_READBACK_FAILED");
  }
  const expectedEntry = entryAreaUpdated ? target : baselineEntryArea;
  if (!newIdentity || newIdentity.entryAreaResRef !== expectedEntry) {
    diagnostics.push("AREA_RENAME_ENTRY_AREA_READBACK_FAILED");
  }
  return diagnostics;
}

function validateRecoveryResources(
  journal: AreaRenamePersistedJournalRecord,
  diagnostics: string[],
): readonly AreaRenamePersistedArtifact[] {
  const resources = journal.candidateManifest.resources;
  const byExtension = new Map(resources.map((entry) => [entry.extension, entry]));
  if (resources.length !== REQUIRED_EXTENSIONS.length || byExtension.size !== resources.length) {
    diagnostics.push("AREA_RENAME_SNAPSHOT_RECOVERY_RESOURCE_CARDINALITY_MISMATCH");
  }
  const normalized: AreaRenamePersistedArtifact[] = [];
  for (const extension of REQUIRED_EXTENSIONS) {
    const resource = byExtension.get(extension);
    if (!resource ||
        resource.sourceKey.toLowerCase() !== `${journal.areaResRef}.${extension}` ||
        resource.targetKey.toLowerCase() !== `${journal.targetAreaResRef}.${extension}` ||
        resource.resourceType !== resourceType(extension) ||
        resource.baselineSize < 0 || resource.candidateSize < 0 ||
        !/^[a-f0-9]{64}$/u.test(resource.baselineSha256) ||
        !/^[a-f0-9]{64}$/u.test(resource.candidateSha256)) {
      diagnostics.push(`AREA_RENAME_SNAPSHOT_RECOVERY_RESOURCE_INVALID:${extension}`);
      continue;
    }
    normalized.push(resource);
  }
  return Object.freeze(normalized);
}

function receiptRecoveryDiagnostics(
  journal: AreaRenamePersistedJournalRecord,
): string[] {
  const receipt = journal.receipt;
  if (!receipt) return ["AREA_RENAME_SNAPSHOT_RECOVERY_RECEIPT_MISSING"];
  const manifest = journal.candidateManifest;
  const diagnostics: string[] = [];
  if (receipt.transactionId !== journal.transactionId ||
      receipt.moduleId !== journal.moduleId ||
      receipt.areaResRef !== journal.areaResRef ||
      receipt.targetAreaResRef !== journal.targetAreaResRef ||
      receipt.previousModuleRevision !== manifest.baselineRevision ||
      receipt.newModuleRevision !== manifest.successorRevision ||
      receipt.commandHash !== journal.commandHash ||
      receipt.previewSha256 !== journal.previewSha256 ||
      receipt.entryAreaUpdated !== manifest.entryAreaUpdated ||
      receipt.blockerCount !== 0 || receipt.readbackStatus !== "verified") {
    diagnostics.push("AREA_RENAME_SNAPSHOT_RECOVERY_RECEIPT_IDENTITY_MISMATCH");
  }
  const receiptByExtension = new Map(receipt.resources.map((entry) => [entry.extension, entry]));
  if (receipt.resources.length !== manifest.resources.length ||
      receiptByExtension.size !== receipt.resources.length) {
    diagnostics.push("AREA_RENAME_SNAPSHOT_RECOVERY_RECEIPT_RESOURCE_MISMATCH");
  }
  for (const expected of manifest.resources) {
    const actual = receiptByExtension.get(expected.extension);
    if (!actual || actual.sourceKey !== expected.sourceKey || actual.targetKey !== expected.targetKey ||
        actual.resourceType !== expected.resourceType ||
        actual.baselineSize !== expected.baselineSize ||
        actual.baselineSha256 !== expected.baselineSha256 ||
        actual.candidateSize !== expected.candidateSize ||
        actual.candidateSha256 !== expected.candidateSha256) {
      diagnostics.push(
        `AREA_RENAME_SNAPSHOT_RECOVERY_RECEIPT_RESOURCE_MISMATCH:${expected.extension}`,
      );
    }
  }
  const actualIfo = receipt.moduleIfo;
  const expectedIfo = manifest.moduleIfo;
  if (actualIfo.key !== expectedIfo.key || actualIfo.baselineSize !== expectedIfo.baselineSize ||
      actualIfo.baselineSha256 !== expectedIfo.baselineSha256 ||
      actualIfo.candidateSize !== expectedIfo.candidateSize ||
      actualIfo.candidateSha256 !== expectedIfo.candidateSha256) {
    diagnostics.push("AREA_RENAME_SNAPSHOT_RECOVERY_RECEIPT_IFO_MISMATCH");
  }
  return diagnostics;
}

function persistedResource(resource: AreaRenameCandidateResource): AreaRenamePersistedArtifact {
  return Object.freeze({
    extension: resource.extension,
    sourceKey: resource.sourceKey,
    targetKey: resource.targetKey,
    resourceType: resource.resourceType,
    baselineSize: resource.baselineSize,
    baselineSha256: resource.baselineSha256,
    candidateSize: resource.candidateSize,
    candidateSha256: resource.candidateSha256,
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
  return left.logicalKey === right.logicalKey && left.resourceType === right.resourceType &&
    left.size === right.size && left.sha256 === right.sha256 && left.contentKey === right.contentKey;
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
      "AREA_RENAME_SNAPSHOT_MANIFEST_CONFLICT",
      `Snapshot manifest is not canonical: ${errorMessage(error)}`,
    );
  }
  if (manifest.revision !== identity.revision || manifestKey !== identity.manifestKey ||
      manifestSha256 !== identity.manifestSha256) {
    throw storageError(
      "AREA_RENAME_SNAPSHOT_MANIFEST_CONFLICT",
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

function sameManifestIdentity(left: ModuleSnapshotManifest, right: ModuleSnapshotManifest): boolean {
  return sameIdentity(manifestIdentity(left), manifestIdentity(right));
}

function sameIdentity(left: ModuleSnapshotHeadIdentity, right: ModuleSnapshotHeadIdentity): boolean {
  return left.revision === right.revision && left.manifestKey === right.manifestKey &&
    left.manifestSha256 === right.manifestSha256;
}

function assertLeaseScope(
  transactionId: string,
  moduleId: string,
  lease: AreaCreateModuleLease,
  recovery: boolean,
): void {
  if (lease.moduleId !== moduleId || lease.ownerTransactionId !== transactionId ||
      (!recovery && lease.fencingToken < 1)) {
    throw storageError(
      "AREA_RENAME_SNAPSHOT_STAGE_IDENTITY_MISMATCH",
      "Area rename does not own the target module transaction.",
    );
  }
}

function resourceType(extension: typeof REQUIRED_EXTENSIONS[number]): number {
  return extension === "are" ? 2012 : extension === "git" ? 2023 : 2046;
}

function compareLogicalKeys(left: string, right: string): number {
  return left.toLowerCase().localeCompare(right.toLowerCase(), "en");
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && timingSafeEqual(left, right);
}

function result(
  restored: boolean,
  diagnostics: readonly string[],
): Readonly<{ restored: boolean; diagnostics: readonly string[] }> {
  return Object.freeze({ restored, diagnostics: Object.freeze([...diagnostics]) });
}

function verificationResult(
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
