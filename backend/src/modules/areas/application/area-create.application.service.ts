import { randomUUID } from "node:crypto";
import { Inject, Injectable, Optional } from "@nestjs/common";
import { AppException } from "../../../common/http/app-exception";
import type { AppRequest } from "../../../common/http/request.types";
import type { RuntimeSettingsRepositoryPort } from "../../runtime-settings/application/ports/runtime-settings-repository.port";
import { RUNTIME_SETTINGS_REPOSITORY } from "../../runtime-settings/application/ports/runtime-settings-repository.port";
import { deriveWorkspaceModuleId } from "../../module-snapshots/domain/workspace-module-id";
import { CatalogApplicationService } from "../../catalog/application/catalog.application.service";
import { ModuleSnapshotAreaRepository } from "../adapters/outbound/blob/module-snapshot-area.repository";
import { AreaEditingApplicationService } from "./area-editing.application.service";
import { validateAndNormalizeAreaCreateCommand } from "../domain/area-create-command.validation";
import {
  AUR_S05_05_CREATION_PROFILE_FINGERPRINT,
  getAurS0505CreationProfile,
} from "../domain/area-create-profile";
import { AreaCreateTransactionCoordinator, AreaCreateTransactionError } from "./area-create-transaction.coordinator";
import { ModuleSnapshotBootstrapApplicationService } from "./module-snapshot-bootstrap.application.service";
import {
  AREA_CREATE_MATERIALIZATION_GATE,
  type AreaCreateMaterializationGatePort,
} from "./ports/area-create-materialization-gate.port";
import {
  AREA_TILE_PRODUCTION_ADMISSION,
  AreaTileProductionAdmissionSourceError,
  type AreaTileProductionAdmissionPort,
} from "./ports/area-tile-production-admission.port";
import {
  areaTileProductionAdmissionDiagnosticMessages,
} from "./area-tile-production-admission.diagnostics";
import {
  AREA_CREATE_AUTHORIZATION,
  AREA_CREATE_CANDIDATE_VALIDATOR,
  AREA_CREATE_COMPILER,
  AREA_CREATE_IDEMPOTENCY,
  AREA_CREATE_JOURNAL,
  AREA_CREATE_MODULE_LOCK,
  AREA_CREATE_TILESET_SOURCE,
  AREA_CREATE_TRANSACTION_STORAGE,
  AreaCreateCompilerFailure,
  type AreaCreateAuthorizationPort,
  type AreaCreateCandidateValidatorPort,
  type AreaCreateCompilerPort,
  type AreaCreateIdempotencyRepositoryPort,
  type AreaCreateModuleLockPort,
  type AreaCreateTilesetSourcePort,
  type AreaCreateTransactionJournalPort,
  type AreaCreateTransactionStoragePort,
} from "./ports/area-create-transaction.port";

@Injectable()
export class AreaCreateApplicationService {
  private readonly coordinator: AreaCreateTransactionCoordinator;

  constructor(
    private readonly bootstrap: ModuleSnapshotBootstrapApplicationService,
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly settingsRepository: RuntimeSettingsRepositoryPort,
    @Inject(AREA_CREATE_AUTHORIZATION)
    private readonly authorization: AreaCreateAuthorizationPort,
    @Inject(AREA_CREATE_MODULE_LOCK)
    lock: AreaCreateModuleLockPort,
    @Inject(AREA_CREATE_IDEMPOTENCY)
    idempotency: AreaCreateIdempotencyRepositoryPort,
    @Inject(AREA_CREATE_TRANSACTION_STORAGE)
    private readonly storage: AreaCreateTransactionStoragePort,
    @Inject(AREA_CREATE_COMPILER)
    private readonly compiler: AreaCreateCompilerPort,
    @Inject(AREA_CREATE_CANDIDATE_VALIDATOR)
    private readonly validator: AreaCreateCandidateValidatorPort,
    @Inject(AREA_CREATE_JOURNAL)
    journal: AreaCreateTransactionJournalPort,
    @Inject(AREA_CREATE_TILESET_SOURCE)
    private readonly tilesetSource: AreaCreateTilesetSourcePort,
    @Inject(AREA_CREATE_MATERIALIZATION_GATE)
    private readonly materializationGate: AreaCreateMaterializationGatePort,
    @Inject(AREA_TILE_PRODUCTION_ADMISSION)
    private readonly tileAdmission: AreaTileProductionAdmissionPort,
    private readonly areaRepository: ModuleSnapshotAreaRepository,
    private readonly areaEditing: AreaEditingApplicationService,
    @Optional()
    private readonly catalog?: CatalogApplicationService,
  ) {
    this.coordinator = new AreaCreateTransactionCoordinator({
      authorization: this.authorization,
      lock,
      idempotency,
      storage,
      compiler,
      validator,
      tileAdmission: this.tileAdmission,
      journal,
      ids: { nextTransactionId: () => randomUUID() },
      clock: { nowIso: () => new Date().toISOString() },
    });
  }

  async getProfiles(actorId: string) {
    await this.assertActor(actorId);
    const settings = await this.settingsRepository.get();
    const moduleId = deriveWorkspaceModuleId(settings.blobStorage);
    if (!(await this.authorizeActor(actorId, moduleId))) {
      throw appError(403, "AREA_CREATE_PERMISSION_DENIED", "Actor cannot create Areas.");
    }
    const bootstrap = await this.bootstrap.ensureCurrentWorkspaceBootstrapped();
    const profile = getAurS0505CreationProfile();
    const tileset = await this.tilesetSource.resolve(profile.tilesetResRef);
    const materialization = await this.materializationGate.resolve({
      profileId: profile.id,
      profileFingerprintSha256: AUR_S05_05_CREATION_PROFILE_FINGERPRINT,
    });
    return Object.freeze({
      moduleId: bootstrap.head.moduleId,
      moduleRevision: bootstrap.head.revision,
      profiles: Object.freeze([
        Object.freeze({
          ...profile,
          fingerprintSha256: AUR_S05_05_CREATION_PROFILE_FINGERPRINT,
          setFingerprintSha256: tileset.fingerprintSha256,
          ...materialization,
        }),
      ]),
    });
  }

  async validate(moduleId: string, actorId: string, body: unknown) {
    await this.assertWorkspaceModule(moduleId);
    const normalized = parseCommand(body, moduleId);
    await this.bootstrap.ensureCurrentWorkspaceBootstrapped();
    const authorized = await this.authorizeActor(actorId, moduleId);
    if (!authorized) {
      throw appError(403, "AREA_CREATE_PERMISSION_DENIED", "Actor cannot create Areas.");
    }
    const moduleState = await this.storage.readModuleState(moduleId);
    if (
      moduleState.quarantined ||
      moduleState.revision !== normalized.value.expectedModuleRevision
    ) {
      throw appError(
        moduleState.quarantined ? 503 : 412,
        moduleState.quarantined
          ? "AREA_CREATE_STORAGE_UNAVAILABLE"
          : "AREA_CREATE_MODULE_REVISION_CONFLICT",
        "The module state is quarantined or no longer matches the draft revision.",
      );
    }
    const collisions = await this.storage.findResourceCollisions(
      moduleId,
      normalized.value.area.resRef,
      ["are", "git", "gic"],
    );
    if (collisions.length > 0) {
      throw appError(409, "AREA_CREATE_RESOURCE_COLLISION", "Area resources already exist.", collisions);
    }
    let candidate;
    try {
      candidate = await this.compiler.compile(
        normalized.value,
        moduleState,
        `validation-${randomUUID()}`,
      );
    } catch (error) {
      if (error instanceof AreaCreateCompilerFailure) {
        throw appError(error.status, error.code, error.message, error.details);
      }
      throw error;
    }
    const validation = await this.validator.validate(normalized.value, candidate);
    if (!validation.valid) {
      throw appError(
        422,
        "AREA_CREATE_CANDIDATE_INVALID",
        "Compiled Area candidate failed independent validation.",
        validation.issues.map((issue) => `${issue.code}: ${issue.message}`),
      );
    }
    let tileAdmission;
    try {
      tileAdmission = await this.tileAdmission.evaluateProductionAdmission({
        tilesetResRef: normalized.value.tileset.resRef,
        candidateTileIds: normalized.value.tiles.map((tile) => tile.tileId),
      });
    } catch (error) {
      if (error instanceof AreaTileProductionAdmissionSourceError) {
        throw appError(503, error.code, error.message);
      }
      throw error;
    }
    if (!tileAdmission.allowed) {
      throw appError(
        422,
        tileAdmission.code,
        "The complete Area candidate is not admitted for production materialization.",
        areaTileProductionAdmissionDiagnosticMessages(tileAdmission.diagnostics),
      );
    }
    const createdAt = new Date();
    return Object.freeze({
      validationId: randomUUID(),
      commandHash: normalized.commandHash,
      moduleId,
      moduleRevision: moduleState.revision,
      profileFingerprintSha256: normalized.value.creationProfile.fingerprintSha256,
      setFingerprintSha256: normalized.value.tileset.setFingerprintSha256,
      tileProductionAdmission: tileAdmission.admission,
      validatorVersion: this.validator.version ?? "area-create-resource-set-validator.v1",
      resources: Object.freeze(
        candidate.resources.map(({ extension, fileName, resourceType, size, sha256 }) =>
          Object.freeze({ extension, fileName, resourceType, size, sha256 }),
        ),
      ),
      moduleIfo: Object.freeze({
        fileName: candidate.moduleIfo.fileName,
        size: candidate.moduleIfo.candidateBytes.length,
        sha256: candidate.moduleIfo.candidateSha256,
      }),
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + 5 * 60_000).toISOString(),
    });
  }

  async create(input: Readonly<{
    moduleId: string;
    actorId: string;
    idempotencyKey: string | undefined;
    ifMatchHeader: string | undefined;
    body: unknown;
  }>) {
    await this.assertWorkspaceModule(input.moduleId);
    const normalized = parseCommand(input.body, input.moduleId);
    const materialization = await this.materializationGate.resolve({
      profileId: normalized.value.creationProfile.id,
      profileFingerprintSha256:
        normalized.value.creationProfile.fingerprintSha256,
    });
    if (!materialization.materializationAllowed) {
      throw appError(
        501,
        "AREA_CREATE_PROFILE_NOT_CERTIFIED",
        "This Area creation profile is available for validation only until native certification is complete.",
        materialization.blockingProofs,
      );
    }
    await this.bootstrap.ensureCurrentWorkspaceBootstrapped();
    try {
      const result = await this.coordinator.execute({
        actorId: input.actorId,
        idempotencyKey: input.idempotencyKey ?? "",
        ifMatchHeader: input.ifMatchHeader,
        command: normalized.value,
        commandHash: normalized.commandHash,
      });
      this.areaRepository.invalidateSnapshotIndex();
      this.areaEditing.invalidateSnapshotCache();
      this.catalog?.invalidateTemplateSnapshotCaches();
      return result;
    } catch (error) {
      if (error instanceof AreaCreateTransactionError) {
        throw appError(error.status, error.code, error.message, error.details);
      }
      throw error;
    }
  }

  private async assertWorkspaceModule(moduleId: string): Promise<void> {
    const settings = await this.settingsRepository.get();
    if (deriveWorkspaceModuleId(settings.blobStorage) !== moduleId) {
      throw appError(404, "AREA_CREATE_STORAGE_UNAVAILABLE", "Module ID does not identify the current workspace.");
    }
  }

  private async assertActor(actorId: string): Promise<void> {
    if (!actorId) {
      throw appError(401, "AREA_CREATE_PERMISSION_DENIED", "Authenticated actor is missing.");
    }
  }

  private async authorizeActor(actorId: string, moduleId: string): Promise<boolean> {
    await this.assertActor(actorId);
    // Validation uses the same authorization adapter as the committing coordinator.
    return this.authorization.authorize({ actorId, moduleId, permission: "area.create" });
  }
}

function parseCommand(body: unknown, moduleId: string) {
  const normalized = validateAndNormalizeAreaCreateCommand(body);
  if (!normalized.valid) {
    throw new AppException({
      status: 422,
      code: "AREA_CREATE_DRAFT_INVALID",
      message: "Area Create command is invalid.",
      details: normalized.issues.map((issue) => ({ path: issue.path, reason: issue.message })),
    });
  }
  if (normalized.value.moduleId !== moduleId) {
    throw appError(422, "AREA_CREATE_DRAFT_INVALID", "Path and command module IDs differ.");
  }
  return normalized;
}

function appError(
  status: number,
  code: string,
  message: string,
  details: readonly string[] = [],
): AppException {
  return new AppException({
    status,
    code,
    message,
    details: details.slice(0, 32).map((reason, index) => ({
      path: `details.${index}`,
      reason: reason.slice(0, 256),
    })),
    retryable: status === 503,
  });
}

export function areaCreateActorId(request: AppRequest): string {
  return request.auth?.user.id ?? "";
}
