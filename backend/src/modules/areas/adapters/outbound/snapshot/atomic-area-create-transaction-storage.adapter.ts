import { createHash, timingSafeEqual } from "node:crypto";
import type {
  AtomicModuleSnapshotRepositoryPort,
  AreaCreateSnapshotStageDescriptor,
  ModuleSnapshotHead,
  ModuleSnapshotHeadIdentity,
} from "../../../application/ports/atomic-module-snapshot.port";
import { AREA_CREATE_SNAPSHOT_STAGE_SCHEMA_VERSION } from "../../../application/ports/atomic-module-snapshot.port";
import type { AreaCreatePersistedReadbackVerifierPort } from "../../../application/ports/area-create-readback-verifier.port";
import type {
  AreaCreateCompensationResult,
  AreaCreateModuleLease,
  AreaCreateRecoveryStoragePort,
  AreaCreateTransactionStoragePort,
} from "../../../application/ports/area-create-transaction.port";
import type {
  AreaCreateCandidateResource,
  AreaCreateCompiledCandidate,
  AreaCreatePersistedArtifact,
  AreaCreatePersistedJournalRecord,
  AreaCreateReadbackResult,
} from "../../../domain/area-create-transaction.types";
import type {
  AreaUpdateCompiledCandidate,
  AreaUpdatePersistedJournalRecord,
} from "../../../domain/area-update-transaction.types";
import type { AreaUpdateRecoveryStoragePort } from "../../../application/ports/area-update-transaction.port";
import { areaNameStorageProfileForEntries } from "../../../domain/area-basic-identity";
import {
  applyModuleSnapshotChanges,
  buildModuleSnapshotManifestKey,
  hashModuleSnapshotManifest,
  normalizeModuleSnapshotLogicalKey,
  type ModuleSnapshotManifest,
  type ModuleSnapshotObjectDescriptor,
} from "../../../domain/module-snapshot-manifest";

const REQUIRED_EXTENSIONS = ["are", "git", "gic"] as const;

export class AtomicAreaCreateTransactionStorageAdapter
  implements
    AreaCreateTransactionStoragePort,
    AreaCreateRecoveryStoragePort,
    AreaUpdateRecoveryStoragePort
{
  constructor(
    private readonly repository: AtomicModuleSnapshotRepositoryPort,
    private readonly readbackVerifier: AreaCreatePersistedReadbackVerifierPort,
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

  async findResourceCollisions(
    moduleId: string,
    resRef: string,
    extensions: readonly ["are", "git", "gic"],
  ): Promise<readonly string[]> {
    const head = await this.requireHead(moduleId);
    const manifest = await this.requireManifest(head.manifestKey);
    assertManifestHeadIdentity(manifest, head);
    const sought = new Set(
      extensions.map((extension) => `${resRef}.${extension}`.toLowerCase()),
    );
    return Object.freeze(
      manifest.objects
        .filter((object) => sought.has(object.logicalKey.toLowerCase()))
        .map((object) => object.logicalKey),
    );
  }

  async stage(
    transactionId: string,
    moduleId: string,
    candidate: AreaCreateCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<void> {
    assertLeaseScope(transactionId, moduleId, lease, false);
    const normalized = normalizeCandidate(candidate);
    if (await this.repository.readStage(transactionId)) {
      const replay = await this.loadCandidateStage(
        transactionId,
        moduleId,
        normalized,
        lease,
      );
      for (const resource of replay.normalized.resources) {
        await this.verifyCandidateObject(replay.successor, resource.fileName, {
          size: resource.size,
          sha256: resource.sha256,
          resourceType: resource.resourceType,
          bytes: resource.bytes,
        });
      }
      await this.verifyCandidateObject(
        replay.successor,
        replay.normalized.moduleIfo.fileName,
        {
          size: replay.normalized.moduleIfo.candidateBytes.length,
          sha256: replay.normalized.moduleIfo.candidateSha256,
          resourceType: replay.normalized.moduleIfo.resourceType,
          bytes: replay.normalized.moduleIfo.candidateBytes,
        },
      );
      await this.assertHeadAtEither(replay.stage);
      return;
    }
    const head = await this.requireMutableHead(moduleId);
    const baseline = await this.requireManifest(head.manifestKey);
    assertManifestHeadIdentity(baseline, head);
    await this.assertBaselineIfo(baseline, normalized);

    for (const resource of normalized.resources) {
      await this.repository.putContentIfAbsent(resource.bytes, resource.sha256);
    }
    await this.repository.putContentIfAbsent(
      normalized.moduleIfo.candidateBytes,
      normalized.moduleIfo.candidateSha256,
    );

    const successor = applyModuleSnapshotChanges(baseline, [
      ...normalized.resources.map((resource) => ({
        logicalKey: resource.fileName,
        resourceType: resource.resourceType,
        size: resource.size,
        sha256: resource.sha256,
      })),
      {
        logicalKey: normalized.moduleIfo.fileName,
        resourceType: normalized.moduleIfo.resourceType,
        size: normalized.moduleIfo.candidateBytes.length,
        sha256: normalized.moduleIfo.candidateSha256,
      },
    ]);
    await this.repository.putManifestIfAbsent(successor);
    const candidateLogicalKeys = [
      ...normalized.resources.map((resource) => resource.fileName),
      normalized.moduleIfo.fileName,
    ].sort((left, right) =>
      left.toLowerCase().localeCompare(right.toLowerCase(), "en"),
    );
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
    candidate: AreaCreateCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<void> {
    const { stage, successor, normalized } = await this.loadCandidateStage(
      transactionId,
      moduleId,
      candidate,
      lease,
    );
    for (const resource of normalized.resources) {
      await this.verifyCandidateObject(successor, resource.fileName, {
        size: resource.size,
        sha256: resource.sha256,
        resourceType: resource.resourceType,
        bytes: resource.bytes,
      });
    }
    await this.assertHeadAtEither(stage);
  }

  async commitModuleIfo(
    transactionId: string,
    moduleId: string,
    candidate: AreaCreateCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<void> {
    const { successor, normalized } = await this.loadCandidateStage(
      transactionId,
      moduleId,
      candidate,
      lease,
    );
    await this.verifyCandidateObject(successor, normalized.moduleIfo.fileName, {
      size: normalized.moduleIfo.candidateBytes.length,
      sha256: normalized.moduleIfo.candidateSha256,
      resourceType: normalized.moduleIfo.resourceType,
      bytes: normalized.moduleIfo.candidateBytes,
    });
    await this.repository.compareAndSetHead(transactionId, lease);
  }

  async readBack(
    transactionId: string,
    moduleId: string,
    candidate: AreaCreateCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<AreaCreateReadbackResult> {
    const { stage, successor, normalized } = await this.loadCandidateStage(
      transactionId,
      moduleId,
      candidate,
      lease,
    );
    const head = await this.requireHead(moduleId);
    if (!sameIdentity(head, stage.successor)) {
      throw storageError(
        "AREA_SNAPSHOT_READBACK_HEAD_MISMATCH",
        "Readback did not capture the published successor head.",
      );
    }

    const resources = [];
    for (const resource of normalized.resources) {
      const bytes = await this.verifyCandidateObject(successor, resource.fileName, {
        size: resource.size,
        sha256: resource.sha256,
        resourceType: resource.resourceType,
        bytes: resource.bytes,
      });
      resources.push(Object.freeze({ ...persistedResource(resource), bytes }));
    }
    const ifoBytes = await this.verifyCandidateObject(
      successor,
      normalized.moduleIfo.fileName,
      {
        size: normalized.moduleIfo.candidateBytes.length,
        sha256: normalized.moduleIfo.candidateSha256,
        resourceType: normalized.moduleIfo.resourceType,
        bytes: normalized.moduleIfo.candidateBytes,
      },
    );
    const moduleIfo = Object.freeze({
      key: normalized.moduleIfo.key,
      size: ifoBytes.length,
      sha256: normalized.moduleIfo.candidateSha256,
      bytes: ifoBytes,
    });
    const updateCandidate = candidate as AreaCreateCompiledCandidate &
      Partial<Pick<
        AreaUpdateCompiledCandidate,
        | "variableMutation"
        | "projectedDraft"
        | "visualEnvironmentCatalogSelectionMutation"
      >>;
    const basicIdentityMutation = updateCandidate.projectedDraft?.basicIdentity;
    const visualEnvironmentMutation = updateCandidate.projectedDraft?.visualEnvironment;
    const visualEnvironmentScalarControlsMutation =
      updateCandidate.projectedDraft?.visualEnvironmentScalarControls;
    const visualEnvironmentCatalogSelectionMutation =
      updateCandidate.visualEnvironmentCatalogSelectionMutation;
    const expectedVisualEnvironment = visualEnvironmentMutation?.value
      ?? (visualEnvironmentCatalogSelectionMutation?.lightingSchemeChanged
        ? visualEnvironmentCatalogSelectionMutation.value.visualEnvironment
        : undefined);
    const expectedVisualEnvironmentScalarControls =
      visualEnvironmentScalarControlsMutation?.value
      ?? (visualEnvironmentCatalogSelectionMutation?.lightingSchemeChanged
        ? visualEnvironmentCatalogSelectionMutation.value
          .visualEnvironmentScalarControls
        : undefined);
    const semantic = await this.readbackVerifier.verify({
      areaId: normalized.areaId,
      resources: Object.freeze(resources),
      moduleIfo,
      ...(updateCandidate.variableMutation
        ? {
            expectedAreaVariables: Object.freeze(
              updateCandidate.variableMutation.entries.map(
                (entry) => Object.freeze({ ...entry }),
              ),
            ),
          }
        : {}),
      ...(basicIdentityMutation
        ? {
            expectedAreaBasicIdentity: Object.freeze({
              ...(basicIdentityMutation.name
                ? {
                    name: basicIdentityMutation.name.value,
                    nameProfile: basicIdentityMutation.name.valueEntries
                      ? areaNameStorageProfileForEntries(
                          basicIdentityMutation.name.valueEntries,
                        )
                      : basicIdentityMutation.name.expectedProfile
                        ?? "simple_inline_ascii" as const,
                    ...(basicIdentityMutation.name.valueEntries
                      ? {
                          nameEntries: Object.freeze(
                            basicIdentityMutation.name.valueEntries.map(
                              (entry) => Object.freeze({ ...entry }),
                            ),
                          ),
                        }
                      : {}),
                  }
                : {}),
              ...(basicIdentityMutation.tag
                ? { tag: basicIdentityMutation.tag.value }
                : {}),
            }),
          }
        : {}),
      ...(expectedVisualEnvironment
        ? {
            expectedAreaVisualEnvironment: Object.freeze({
              ...expectedVisualEnvironment,
              sun: Object.freeze({ ...expectedVisualEnvironment.sun }),
              moon: Object.freeze({ ...expectedVisualEnvironment.moon }),
            }),
          }
        : {}),
      ...(expectedVisualEnvironmentScalarControls
        ? {
            expectedAreaVisualEnvironmentScalarControls: Object.freeze({
              ...expectedVisualEnvironmentScalarControls,
            }),
          }
        : {}),
      ...(visualEnvironmentCatalogSelectionMutation
        ? {
            expectedAreaVisualEnvironmentCatalogSelection: Object.freeze({
              lightingSchemeRowIndex:
                visualEnvironmentCatalogSelectionMutation.value
                  .lightingSchemeRowIndex,
              skyBoxRowIndex:
                visualEnvironmentCatalogSelectionMutation.value.skyBoxRowIndex,
            }),
          }
        : {}),
    });
    return Object.freeze({
      verified: semantic.valid,
      newModuleRevision: head.revision,
      resources: Object.freeze(resources.map(({ bytes: _bytes, ...resource }) => resource)),
      moduleIfo: Object.freeze({
        key: moduleIfo.key,
        size: moduleIfo.size,
        sha256: moduleIfo.sha256,
      }),
      diagnostics: Object.freeze([...semantic.diagnostics]),
    });
  }

  async compensate(
    transactionId: string,
    moduleId: string,
    candidate: AreaCreateCompiledCandidate,
    lease: AreaCreateModuleLease,
  ): Promise<AreaCreateCompensationResult>;
  async compensate(
    journal: AreaCreatePersistedJournalRecord,
    lease: AreaCreateModuleLease,
  ): Promise<AreaCreateCompensationResult>;
  async compensate(
    journal: AreaUpdatePersistedJournalRecord,
    lease: AreaCreateModuleLease,
  ): Promise<AreaCreateCompensationResult>;
  async compensate(
    transactionOrJournal:
      | string
      | AreaCreatePersistedJournalRecord
      | AreaUpdatePersistedJournalRecord,
    moduleOrLease: string | AreaCreateModuleLease,
    candidate?: AreaCreateCompiledCandidate,
    maybeLease?: AreaCreateModuleLease,
  ): Promise<AreaCreateCompensationResult> {
    const transactionId =
      typeof transactionOrJournal === "string"
        ? transactionOrJournal
        : transactionOrJournal.transactionId;
    const moduleId =
      typeof transactionOrJournal === "string"
        ? (moduleOrLease as string)
        : transactionOrJournal.moduleId;
    const lease =
      typeof transactionOrJournal === "string"
        ? maybeLease!
        : (moduleOrLease as AreaCreateModuleLease);
    assertLeaseScope(transactionId, moduleId, lease, true);
    const stage = await this.repository.readStage(transactionId);
    if (!stage) {
      const expected =
        typeof transactionOrJournal === "string"
          ? {
              fileName: candidate!.moduleIfo.fileName,
              resourceType: candidate!.moduleIfo.resourceType,
              size: candidate!.moduleIfo.baselineBytes.length,
              sha256: candidate!.moduleIfo.baselineSha256,
              bytes: candidate!.moduleIfo.baselineBytes,
            }
          : {
              fileName: transactionOrJournal.candidateManifest.moduleIfo.fileName,
              resourceType:
                transactionOrJournal.candidateManifest.moduleIfo.resourceType,
              size: transactionOrJournal.candidateManifest.moduleIfo.baselineSize,
              sha256:
                transactionOrJournal.candidateManifest.moduleIfo.baselineSha256,
            };
      try {
        const head = await this.requireHead(moduleId);
        if (head.quarantined) {
          throw storageError(
            "AREA_SNAPSHOT_MODULE_QUARANTINED",
            "A stage-free compensation cannot certify a quarantined head.",
          );
        }
        const manifest = await this.requireManifest(head.manifestKey);
        assertManifestHeadIdentity(manifest, head);
        await this.verifyCandidateObject(manifest, expected.fileName, expected);
        return Object.freeze({ restored: true, diagnostics: Object.freeze([]) });
      } catch (error) {
        return Object.freeze({
          restored: false,
          diagnostics: Object.freeze([
            `AREA_SNAPSHOT_STAGE_MISSING_BASELINE_UNPROVEN:${errorMessage(error)}`,
          ]),
        });
      }
    }
    if (stage.moduleId !== moduleId) {
      throw storageError(
        "AREA_SNAPSHOT_STAGE_IDENTITY_MISMATCH",
        "Compensation module does not match the retained stage.",
      );
    }
    await this.repository.restoreBaseline(transactionId, lease);
    const restored = await this.requireHead(moduleId);
    if (!sameIdentity(restored, stage.base)) {
      return Object.freeze({
        restored: false,
        diagnostics: Object.freeze(["AREA_SNAPSHOT_COMPENSATION_READBACK_MISMATCH"]),
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
    journal: AreaCreatePersistedJournalRecord,
    lease: AreaCreateModuleLease,
    diagnostics: readonly string[],
  ): Promise<void>;
  async quarantine(
    journal: AreaUpdatePersistedJournalRecord,
    lease: AreaCreateModuleLease,
    diagnostics: readonly string[],
  ): Promise<void>;
  async quarantine(
    moduleOrJournal:
      | string
      | AreaCreatePersistedJournalRecord
      | AreaUpdatePersistedJournalRecord,
    transactionOrLease: string | AreaCreateModuleLease,
    diagnostics: readonly string[],
    maybeLease?: AreaCreateModuleLease,
  ): Promise<void> {
    const moduleId =
      typeof moduleOrJournal === "string" ? moduleOrJournal : moduleOrJournal.moduleId;
    const transactionId =
      typeof moduleOrJournal === "string"
        ? (transactionOrLease as string)
        : moduleOrJournal.transactionId;
    const lease =
      typeof moduleOrJournal === "string"
        ? maybeLease!
        : (transactionOrLease as AreaCreateModuleLease);
    assertLeaseScope(transactionId, moduleId, lease, true);
    await this.repository.quarantine(transactionId, lease, diagnostics);
  }

  async verifyRecordedReadback(
    journal: AreaCreatePersistedJournalRecord | AreaUpdatePersistedJournalRecord,
    lease: AreaCreateModuleLease,
  ): Promise<Readonly<{ verified: boolean; diagnostics: readonly string[] }>> {
    assertLeaseScope(journal.transactionId, journal.moduleId, lease, true);
    const stage = await this.requireStage(journal.transactionId);
    const head = await this.requireHead(journal.moduleId);
    if (!sameIdentity(head, stage.successor)) {
      return Object.freeze({
        verified: false,
        diagnostics: Object.freeze(["AREA_SNAPSHOT_RECOVERY_HEAD_MISMATCH"]),
      });
    }
    const manifest = await this.requireManifest(head.manifestKey);
    const resources = [];
    for (const resource of journal.candidateManifest.resources) {
      const bytes = await this.verifyCandidateObject(manifest, resource.fileName, resource);
      resources.push(Object.freeze({ ...resource, bytes }));
    }
    const ifoBytes = await this.verifyCandidateObject(
      manifest,
      journal.candidateManifest.moduleIfo.fileName,
      {
        size: journal.candidateManifest.moduleIfo.candidateSize,
        sha256: journal.candidateManifest.moduleIfo.candidateSha256,
        resourceType: journal.candidateManifest.moduleIfo.resourceType,
      },
    );
    const semantic = await this.readbackVerifier.verify({
      areaId: journal.candidateManifest.areaId,
      resources: Object.freeze(resources),
      moduleIfo: Object.freeze({
        key: journal.candidateManifest.moduleIfo.key,
        size: journal.candidateManifest.moduleIfo.candidateSize,
        sha256: journal.candidateManifest.moduleIfo.candidateSha256,
        bytes: ifoBytes,
      }),
    });
    return Object.freeze({
      verified: semantic.valid,
      diagnostics: Object.freeze([...semantic.diagnostics]),
    });
  }

  private async loadCandidateStage(
    transactionId: string,
    moduleId: string,
    candidate: AreaCreateCompiledCandidate,
    lease: AreaCreateModuleLease,
  ) {
    assertLeaseScope(transactionId, moduleId, lease, false);
    const normalized = normalizeCandidate(candidate);
    const stage = await this.requireStage(transactionId);
    if (
      stage.moduleId !== moduleId ||
      stage.leaseId !== lease.leaseId ||
      stage.fencingToken !== lease.fencingToken
    ) {
      throw storageError(
        "AREA_SNAPSHOT_STAGE_IDENTITY_MISMATCH",
        "Candidate operation does not match the retained stage lease.",
      );
    }
    const expectedKeys = [
      ...normalized.resources.map((resource) => resource.fileName),
      normalized.moduleIfo.fileName,
    ].sort((left, right) =>
      left.toLowerCase().localeCompare(right.toLowerCase(), "en"),
    );
    if (JSON.stringify(expectedKeys) !== JSON.stringify(stage.candidateLogicalKeys)) {
      throw storageError(
        "AREA_SNAPSHOT_STAGE_CONFLICT",
        "Candidate object set differs from the retained stage.",
      );
    }
    const successor = await this.requireManifest(stage.successor.manifestKey);
    assertManifestIdentity(successor, stage.successor);
    return { stage, successor, normalized };
  }

  private async assertBaselineIfo(
    baseline: ModuleSnapshotManifest,
    candidate: AreaCreateCompiledCandidate,
  ): Promise<void> {
    const descriptor = requireDescriptor(baseline, candidate.moduleIfo.fileName);
    const retained = await this.repository.readContent(descriptor.contentKey);
    if (
      !retained ||
      descriptor.resourceType !== candidate.moduleIfo.resourceType ||
      descriptor.size !== candidate.moduleIfo.baselineBytes.length ||
      descriptor.sha256 !== candidate.moduleIfo.baselineSha256 ||
      retained.sha256 !== candidate.moduleIfo.baselineSha256 ||
      !sameBytes(retained.bytes, candidate.moduleIfo.baselineBytes)
    ) {
      throw storageError(
        "AREA_SNAPSHOT_BASELINE_IFO_MISMATCH",
        "Compiled candidate IFO does not derive from the captured baseline.",
      );
    }
  }

  private async verifyCandidateObject(
    manifest: ModuleSnapshotManifest,
    logicalKey: string,
    expected: Readonly<{
      size: number;
      sha256: string;
      resourceType: number;
      bytes?: Buffer;
    }>,
  ): Promise<Buffer> {
    const descriptor = requireDescriptor(manifest, logicalKey);
    if (
      descriptor.size !== expected.size ||
      descriptor.sha256 !== expected.sha256 ||
      descriptor.resourceType !== expected.resourceType
    ) {
      throw storageError(
        "AREA_SNAPSHOT_DESCRIPTOR_MISMATCH",
        `Snapshot descriptor differs for ${logicalKey}.`,
      );
    }
    const retained = await this.repository.readContent(descriptor.contentKey);
    if (
      !retained ||
      retained.size !== expected.size ||
      retained.sha256 !== expected.sha256 ||
      (expected.bytes && !sameBytes(retained.bytes, expected.bytes))
    ) {
      throw storageError(
        "AREA_SNAPSHOT_CONTENT_MISMATCH",
        `Snapshot content differs for ${logicalKey}.`,
      );
    }
    return Buffer.from(retained.bytes);
  }

  private async assertHeadAtEither(stage: AreaCreateSnapshotStageDescriptor) {
    const head = await this.requireHead(stage.moduleId);
    if (!sameIdentity(head, stage.base) && !sameIdentity(head, stage.successor)) {
      throw storageError(
        "AREA_SNAPSHOT_HEAD_REVISION_CONFLICT",
        "Module head is outside the retained stage transition.",
      );
    }
  }

  private async requireHead(moduleId: string): Promise<ModuleSnapshotHead> {
    const head = await this.repository.readHead(moduleId);
    if (!head) {
      throw storageError(
        "AREA_SNAPSHOT_HEAD_MISSING",
        "Module snapshot head does not exist.",
      );
    }
    return head;
  }

  private async requireMutableHead(moduleId: string): Promise<ModuleSnapshotHead> {
    const head = await this.requireHead(moduleId);
    if (head.quarantined) {
      throw storageError(
        "AREA_SNAPSHOT_MODULE_QUARANTINED",
        "Module snapshot is quarantined and cannot be staged.",
      );
    }
    return head;
  }

  private async requireStage(
    transactionId: string,
  ): Promise<AreaCreateSnapshotStageDescriptor> {
    const stage = await this.repository.readStage(transactionId);
    if (!stage) {
      throw storageError(
        "AREA_SNAPSHOT_STAGE_MISSING",
        "Area Create snapshot stage does not exist.",
      );
    }
    return stage;
  }

  private async requireManifest(manifestKey: string): Promise<ModuleSnapshotManifest> {
    const manifest = await this.repository.readManifest(manifestKey);
    if (!manifest) {
      throw storageError(
        "AREA_SNAPSHOT_MANIFEST_MISSING",
        "Module snapshot manifest does not exist.",
      );
    }
    return manifest;
  }
}

function normalizeCandidate(candidate: AreaCreateCompiledCandidate): AreaCreateCompiledCandidate {
  if (!candidate || typeof candidate !== "object" || candidate.resources.length !== 3) {
    throw storageError(
      "AREA_SNAPSHOT_CANDIDATE_INVALID",
      "Area Create candidate must contain exactly ARE, GIT, and GIC.",
    );
  }
  const byExtension = new Map(candidate.resources.map((resource) => [resource.extension, resource]));
  if (REQUIRED_EXTENSIONS.some((extension) => !byExtension.has(extension))) {
    throw storageError(
      "AREA_SNAPSHOT_CANDIDATE_INVALID",
      "Area Create candidate resource set is incomplete.",
    );
  }
  const resources = REQUIRED_EXTENSIONS.map((extension) => {
    const resource = byExtension.get(extension)!;
    const fileName = normalizeModuleSnapshotLogicalKey(resource.fileName);
    if (
      fileName.toLowerCase() !== `${candidate.areaId}.${extension}`.toLowerCase() ||
      resource.size !== resource.bytes.length ||
      sha256Hex(resource.bytes) !== resource.sha256
    ) {
      throw storageError(
        "AREA_SNAPSHOT_CANDIDATE_INVALID",
        `Area Create ${extension.toUpperCase()} candidate metadata is inconsistent.`,
      );
    }
    return Object.freeze({ ...resource, fileName, bytes: Buffer.from(resource.bytes) });
  });
  const ifoFileName = normalizeModuleSnapshotLogicalKey(candidate.moduleIfo.fileName);
  if (
    ifoFileName.toLowerCase() !== "module.ifo" ||
    sha256Hex(candidate.moduleIfo.baselineBytes) !== candidate.moduleIfo.baselineSha256 ||
    sha256Hex(candidate.moduleIfo.candidateBytes) !== candidate.moduleIfo.candidateSha256
  ) {
    throw storageError(
      "AREA_SNAPSHOT_CANDIDATE_INVALID",
      "Area Create module IFO candidate metadata is inconsistent.",
    );
  }
  return Object.freeze({
    areaId: candidate.areaId,
    resources: Object.freeze(resources),
    moduleIfo: Object.freeze({
      ...candidate.moduleIfo,
      fileName: ifoFileName,
      baselineBytes: Buffer.from(candidate.moduleIfo.baselineBytes),
      candidateBytes: Buffer.from(candidate.moduleIfo.candidateBytes),
    }),
  });
}

function requireDescriptor(
  manifest: ModuleSnapshotManifest,
  logicalKey: string,
): ModuleSnapshotObjectDescriptor {
  const lowered = logicalKey.toLowerCase();
  const descriptor = manifest.objects.find(
    (object) => object.logicalKey.toLowerCase() === lowered,
  );
  if (!descriptor) {
    throw storageError(
      "AREA_SNAPSHOT_DESCRIPTOR_MISSING",
      `Snapshot descriptor is missing for ${logicalKey}.`,
    );
  }
  return descriptor;
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
      "AREA_SNAPSHOT_STAGE_IDENTITY_MISMATCH",
      "Area Create operation does not own the target module transaction.",
    );
  }
}

function assertManifestHeadIdentity(
  manifest: ModuleSnapshotManifest,
  head: ModuleSnapshotHead,
): void {
  assertManifestIdentity(manifest, head);
}

function assertManifestIdentity(
  manifest: ModuleSnapshotManifest,
  identity: ModuleSnapshotHeadIdentity,
): void {
  if (
    manifest.revision !== identity.revision ||
    buildModuleSnapshotManifestKey(manifest) !== identity.manifestKey ||
    hashModuleSnapshotManifest(manifest) !== identity.manifestSha256
  ) {
    throw storageError(
      "AREA_SNAPSHOT_MANIFEST_CONFLICT",
      "Snapshot manifest does not match the captured identity.",
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
  head: ModuleSnapshotHead,
  identity: ModuleSnapshotHeadIdentity,
): boolean {
  return (
    head.revision === identity.revision &&
    head.manifestKey === identity.manifestKey &&
    head.manifestSha256 === identity.manifestSha256
  );
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return (
    left.byteLength === right.byteLength &&
    timingSafeEqual(Buffer.from(left), Buffer.from(right))
  );
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function storageError(code: string, message: string): Error {
  return new Error(`${code}: ${message}`);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
