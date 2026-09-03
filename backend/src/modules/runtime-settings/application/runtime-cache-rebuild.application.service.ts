import { Inject, Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AppException } from "../../../common/http/app-exception";
import { AuthApplicationService } from "../../auth/application/auth.application.service";
import { SystemMaintenanceApplicationService } from "../../system-maintenance/application/system-maintenance.application.service";
import type {
  MaintenanceParticipantSummary,
  SystemMaintenanceRecord
} from "../../system-maintenance/domain/system-maintenance.types";
import {
  RUNTIME_SETTINGS_REPOSITORY,
  type RuntimeSettingsRepositoryPort
} from "./ports/runtime-settings-repository.port";
import { runtimeSettingsRecordSchema } from "../domain/runtime-settings.schema";
import type { RuntimeSettingsRecord } from "../domain/runtime-settings.types";
import type { RuntimeSettingsPayload } from "../domain/runtime-settings.types";
import {
  RuntimeSettingsApplicationService,
  extractGenerationFromPrefix,
  resolveBaseModulePrefix,
  type RuntimePathOnboardingInput
} from "./runtime-settings.application.service";

export interface RuntimeCacheRebuildStartResult {
  outcome: "NO_CHANGES" | "ACCEPTED";
  operationId: string;
  fingerprint: string;
  generation?: string;
  integrity: {
    valid: boolean;
    reason: string;
  };
}

export interface RuntimeCacheRebuildDetails {
  operationId?: string;
  state: SystemMaintenanceRecord["state"];
  phase: string;
  triggeredBy?: string;
  startedAt?: string;
  updatedAt: string;
  activeRuntimeFingerprint?: string;
  candidateRuntimeFingerprint?: string;
  activeGeneration?: string;
  stagingGeneration?: string;
  participants: MaintenanceParticipantSummary[];
  auditTrail: NonNullable<SystemMaintenanceRecord["auditTrail"]>;
  error?: {
    code: string;
    message: string;
  };
}

@Injectable()
export class RuntimeCacheRebuildApplicationService {
  private readonly logger = new Logger(RuntimeCacheRebuildApplicationService.name);

  constructor(
    private readonly runtimeSettings: RuntimeSettingsApplicationService,
    private readonly maintenance: SystemMaintenanceApplicationService,
    private readonly auth: AuthApplicationService,
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly repository: RuntimeSettingsRepositoryPort
  ) {}

  async startForPathOnboarding(
    input: RuntimePathOnboardingInput,
    triggeredBy: string,
    idempotencyKey?: string
  ): Promise<RuntimeCacheRebuildStartResult> {
    const candidate = await this.runtimeSettings.buildRuntimePathOnboardingCandidate(
      input,
      triggeredBy
    );
    return this.start(candidate, triggeredBy, idempotencyKey);
  }

  async startCurrent(
    triggeredBy: string,
    idempotencyKey?: string
  ): Promise<RuntimeCacheRebuildStartResult> {
    const current = await this.repository.get();
    const candidate: RuntimeSettingsRecord = {
      ...current,
      blobStorage: {
        ...current.blobStorage,
        modulePrefix: resolveBaseModulePrefix(current.blobStorage.modulePrefix)
      }
    };
    return this.start(candidate, triggeredBy, idempotencyKey);
  }

  async startForRuntimeSettings(
    payload: RuntimeSettingsPayload,
    triggeredBy: string,
    idempotencyKey?: string
  ): Promise<RuntimeCacheRebuildStartResult> {
    const candidate =
      await this.runtimeSettings.buildRuntimeSettingsCandidate(
        payload,
        triggeredBy
      );
    return this.start(candidate, triggeredBy, idempotencyKey);
  }

  async getOperation(operationId: string): Promise<RuntimeCacheRebuildDetails> {
    const record = await this.maintenance.getState();
    if (record.operationId !== operationId) {
      throw new AppException({
        status: 404,
        code: "CACHE_REBUILD_NOT_FOUND",
        message: "Runtime cache rebuild operation was not found."
      });
    }
    return toDetails(record);
  }

  async retry(
    operationId: string,
    triggeredBy: string
  ): Promise<RuntimeCacheRebuildDetails> {
    const record = await this.maintenance.getState();
    if (record.operationId !== operationId) {
      throw new AppException({
        status: 404,
        code: "CACHE_REBUILD_NOT_FOUND",
        message: "Runtime cache rebuild operation was not found."
      });
    }
    const candidate = parseStoredSettings(record.candidateSettings);
    const generation = createGenerationId();
    const retryRecord = await this.maintenance.prepareRetry(operationId, generation);
    await this.auth.revokeAllSessions();
    this.scheduleExecution(retryRecord, candidate, triggeredBy);
    return toDetails(retryRecord);
  }

  async rollback(
    operationId: string
  ): Promise<RuntimeCacheRebuildDetails> {
    const record = await this.maintenance.getState();
    if (record.operationId !== operationId) {
      throw new AppException({
        status: 404,
        code: "CACHE_REBUILD_NOT_FOUND",
        message: "Runtime cache rebuild operation was not found."
      });
    }
    const previous = parseStoredSettings(record.previousSettings);
    await this.runtimeSettings.persistRuntimeSettingsRecord(previous);
    const completed = await this.maintenance.completeRollback(operationId);
    return toDetails(completed);
  }

  private async start(
    candidate: RuntimeSettingsRecord,
    triggeredBy: string,
    idempotencyKey?: string
  ): Promise<RuntimeCacheRebuildStartResult> {
    const lease = await this.maintenance.beginPreflight(
      triggeredBy,
      idempotencyKey
    );
    const operation = lease.record;
    if (!lease.acquired) {
      return {
        outcome: operation.state === "idle" ? "NO_CHANGES" : "ACCEPTED",
        operationId: operation.operationId!,
        fingerprint:
          operation.candidateRuntimeFingerprint ??
          operation.activeRuntimeFingerprint ??
          "",
        generation: operation.stagingGeneration,
        integrity: {
          valid: operation.state === "idle",
          reason: operation.phase
        }
      };
    }
    if (operation.state !== "preflight") {
      return {
        outcome: operation.state === "idle" ? "NO_CHANGES" : "ACCEPTED",
        operationId: operation.operationId!,
        fingerprint:
          operation.candidateRuntimeFingerprint ??
          operation.activeRuntimeFingerprint ??
          "",
        generation: operation.stagingGeneration,
        integrity: {
          valid: operation.state === "idle",
          reason: operation.phase
        }
      };
    }

    try {
      const activeSettings = await this.repository.get();
      const fingerprint = await this.runtimeSettings.buildRuntimeInputFingerprint(
        candidate
      );
      const integrity = await this.runtimeSettings.validateRuntimeCacheIntegrity(
        activeSettings
      );
      if (
        integrity.valid &&
        operation.activeRuntimeFingerprint === fingerprint.fingerprint
      ) {
        const noChangeSettings: RuntimeSettingsRecord = {
          ...candidate,
          blobStorage: {
            ...candidate.blobStorage,
            modulePrefix: activeSettings.blobStorage.modulePrefix
          }
        };
        await this.runtimeSettings.persistRuntimeSettingsRecord(noChangeSettings);
        await this.maintenance.completeNoChanges(
          operation.operationId!,
          fingerprint.fingerprint,
          extractGenerationFromPrefix(activeSettings.blobStorage.modulePrefix) ??
            operation.activeGeneration
        );
        return {
          outcome: "NO_CHANGES",
          operationId: operation.operationId!,
          fingerprint: fingerprint.fingerprint,
          generation:
            extractGenerationFromPrefix(activeSettings.blobStorage.modulePrefix) ??
            operation.activeGeneration,
          integrity: {
            valid: true,
            reason: integrity.reason
          }
        };
      }

      const generation = createGenerationId();
      const participants = createParticipants();
      const rebuilding = await this.maintenance.enterRebuilding({
        operationId: operation.operationId!,
        candidateRuntimeFingerprint: fingerprint.fingerprint,
        stagingGeneration: generation,
        candidateSettings: candidate,
        previousSettings: activeSettings,
        participants
      });
      await this.auth.revokeAllSessions();
      this.scheduleExecution(rebuilding, candidate, triggeredBy);
      return {
        outcome: "ACCEPTED",
        operationId: operation.operationId!,
        fingerprint: fingerprint.fingerprint,
        generation,
        integrity: {
          valid: integrity.valid,
          reason: integrity.reason
        }
      };
    } catch (error) {
      await this.maintenance.abortPreflight(operation.operationId!);
      throw error;
    }
  }

  private scheduleExecution(
    record: SystemMaintenanceRecord,
    candidate: RuntimeSettingsRecord,
    triggeredBy: string
  ): void {
    setImmediate(() => {
      void this.execute(record, candidate, triggeredBy);
    });
  }

  private async execute(
    record: SystemMaintenanceRecord,
    candidate: RuntimeSettingsRecord,
    triggeredBy: string
  ): Promise<void> {
    const operationId = record.operationId!;
    const generation = record.stagingGeneration!;
    let participants = createParticipants();

    try {
      participants = updateParticipant(participants, "source-fingerprint", "completed", {
        fingerprint: record.candidateRuntimeFingerprint ?? ""
      });
      participants = updateParticipant(participants, "module-snapshot", "running");
      await this.maintenance.updateProgress(
        operationId,
        "building_module_snapshot",
        participants
      );

      const generationSettings = this.runtimeSettings.buildGenerationSettings(
        candidate,
        generation
      );
      const previousSettings = parseStoredSettings(record.previousSettings);
      const sync = await this.runtimeSettings.syncModuleBlobCacheForSettings(
        generationSettings,
        triggeredBy,
        {
          forceFull: false,
          baselineSettings: previousSettings
        }
      );
      participants = updateParticipant(participants, "module-snapshot", "completed", {
        uploadedFiles: sync.sync.uploadedFiles,
        totalFiles: sync.sync.totalFiles,
        moduleHash: sync.sync.moduleHash
      });

      participants = updateParticipant(participants, "integrity", "running");
      await this.maintenance.updateProgress(
        operationId,
        "validating_generation",
        participants
      );
      const integrity = await this.runtimeSettings.validateRuntimeCacheIntegrity(
        generationSettings,
        {
          moduleHash: sync.sync.moduleHash,
          totalFiles: sync.sync.totalFiles
        }
      );
      if (!integrity.valid) {
        throw new AppException({
          status: 409,
          code: "CACHE_GENERATION_INTEGRITY_FAILED",
          message: `Staging cache generation failed integrity validation: ${integrity.reason}.`
        });
      }
      participants = updateParticipant(participants, "integrity", "completed", {
        totalFiles: integrity.totalFiles,
        moduleHash: integrity.moduleHash ?? ""
      });

      const verifiedFingerprint =
        await this.runtimeSettings.buildRuntimeInputFingerprint(candidate);
      if (
        verifiedFingerprint.fingerprint !== record.candidateRuntimeFingerprint
      ) {
        throw new AppException({
          status: 409,
          code: "RUNTIME_SOURCE_CHANGED_DURING_REBUILD",
          message:
            "Runtime source files changed during rebuild. Run preflight again before publishing."
        });
      }

      participants = updateParticipant(participants, "publish", "running");
      await this.maintenance.updateProgress(
        operationId,
        "ready_to_publish",
        participants
      );
      await this.maintenance.enterPublishing(operationId);
      await this.runtimeSettings.persistRuntimeSettingsRecord(generationSettings);
      participants = updateParticipant(participants, "publish", "completed", {
        generation
      });
      await this.maintenance.completePublished(
        operationId,
        verifiedFingerprint.fingerprint,
        generation,
        participants
      );
    } catch (error) {
      const normalized = normalizeError(error);
      participants = participants.map((participant) =>
        participant.status === "running"
          ? { ...participant, status: "failed" as const }
          : participant
      );
      await this.maintenance
        .updateProgress(operationId, "failed", participants)
        .catch(() => undefined);
      await this.maintenance.fail(
        operationId,
        normalized.code,
        normalized.message
      );
      this.logger.error(
        `Runtime cache rebuild failed operationId=${operationId} code=${normalized.code}: ${normalized.message}`
      );
    }
  }
}

function createGenerationId(): string {
  return `g-${Date.now().toString(36)}-${randomUUID().replace(/-/gu, "").slice(0, 12)}`;
}

function createParticipants(): MaintenanceParticipantSummary[] {
  return [
    { name: "source-fingerprint", status: "pending" },
    { name: "module-snapshot", status: "pending" },
    { name: "integrity", status: "pending" },
    { name: "publish", status: "pending" }
  ];
}

function updateParticipant(
  participants: MaintenanceParticipantSummary[],
  name: string,
  status: MaintenanceParticipantSummary["status"],
  details?: MaintenanceParticipantSummary["details"]
): MaintenanceParticipantSummary[] {
  return participants.map((participant) =>
    participant.name === name
      ? {
          name,
          status,
          ...(details ? { details } : {})
        }
      : participant
  );
}

function parseStoredSettings(value: unknown): RuntimeSettingsRecord {
  const parsed = runtimeSettingsRecordSchema.safeParse(value);
  if (!parsed.success) {
    throw new AppException({
      status: 409,
      code: "CACHE_REBUILD_SETTINGS_UNAVAILABLE",
      message: "Stored runtime settings for this rebuild are unavailable."
    });
  }
  return parsed.data;
}

function normalizeError(error: unknown): { code: string; message: string } {
  if (error instanceof AppException) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof Error) {
    return { code: "CACHE_REBUILD_FAILED", message: error.message };
  }
  return {
    code: "CACHE_REBUILD_FAILED",
    message: "Unknown runtime cache rebuild failure."
  };
}

function toDetails(record: SystemMaintenanceRecord): RuntimeCacheRebuildDetails {
  return {
    operationId: record.operationId,
    state: record.state,
    phase: record.phase,
    triggeredBy: record.triggeredBy,
    startedAt: record.startedAt,
    updatedAt: record.updatedAt,
    activeRuntimeFingerprint: record.activeRuntimeFingerprint,
    candidateRuntimeFingerprint: record.candidateRuntimeFingerprint,
    activeGeneration: record.activeGeneration,
    stagingGeneration: record.stagingGeneration,
    participants: structuredClone(record.participants),
    auditTrail: structuredClone(record.auditTrail ?? []),
    error:
      record.errorCode && record.errorMessage
        ? { code: record.errorCode, message: record.errorMessage }
        : undefined
  };
}
