import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AppException } from "../../../common/http/app-exception";
import type { UserRole } from "../../auth/domain/auth.types";
import {
  SYSTEM_MAINTENANCE_REPOSITORY,
  type SystemMaintenanceRepositoryPort
} from "./ports/system-maintenance-repository.port";
import type {
  MaintenanceParticipantSummary,
  MaintenancePreflightLease,
  MaintenanceAuditEvent,
  PublicMaintenanceStatus,
  SystemMaintenanceRecord,
  SystemMaintenanceState
} from "../domain/system-maintenance.types";

type StateListener = (record: SystemMaintenanceRecord) => void;

@Injectable()
export class SystemMaintenanceApplicationService implements OnModuleInit {
  private cached: SystemMaintenanceRecord = {
    state: "idle",
    phase: "idle",
    updatedAt: new Date(0).toISOString(),
    fencingToken: 0,
    participants: []
  };
  private readonly listeners = new Set<StateListener>();

  constructor(
    @Inject(SYSTEM_MAINTENANCE_REPOSITORY)
    private readonly repository: SystemMaintenanceRepositoryPort
  ) {}

  async onModuleInit(): Promise<void> {
    const record = await this.refresh();
    if (
      record.state === "preflight" ||
      record.state === "rebuilding" ||
      record.state === "publishing"
    ) {
      await this.fail(
        record.operationId,
        "REBUILD_INTERRUPTED",
        "The backend restarted before the cache rebuild completed."
      );
    }
  }

  async getState(): Promise<SystemMaintenanceRecord> {
    return this.refresh();
  }

  getCurrentCacheNamespace(): string {
    return this.cached.activeGeneration?.trim() || "legacy";
  }

  isWorkspaceAvailableCached(): boolean {
    return this.cached.state === "idle" || this.cached.state === "preflight";
  }

  onStateChanged(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async getPublicStatus(): Promise<PublicMaintenanceStatus> {
    const record = await this.refresh();
    const maintenance = isBlockingState(record.state);
    return {
      state: record.state,
      maintenance,
      loginAvailable:
        record.state === "idle" ||
        record.state === "preflight" ||
        record.state === "failed",
      phase: record.phase,
      operationId: record.operationId,
      updatedAt: record.updatedAt,
      retryAfterSeconds: maintenance ? 2 : undefined,
      message: buildPublicMessage(record)
    };
  }

  async assertRequestAllowed(): Promise<void> {
    const record = await this.refresh();
    if (!isBlockingState(record.state)) {
      return;
    }
    throw maintenanceException(record);
  }

  async assertCanAuthenticate(role: UserRole): Promise<void> {
    const record = await this.refresh();
    if (record.state === "idle" || record.state === "preflight") {
      return;
    }
    if (record.state === "failed" && role === "admin") {
      return;
    }
    throw maintenanceException(record);
  }

  async assertProcessingAvailable(): Promise<void> {
    return this.assertRequestAllowed();
  }

  async beginPreflight(
    triggeredBy: string,
    idempotencyKey?: string
  ): Promise<MaintenancePreflightLease> {
    const base = await this.refresh();
    const now = new Date().toISOString();
    const operationId = randomUUID();
    const requested: SystemMaintenanceRecord = {
      state: "preflight",
      operationId,
      idempotencyKey: idempotencyKey?.trim() || undefined,
      leaseOwner: randomUUID(),
      phase: "fingerprinting",
      triggeredBy,
      startedAt: now,
      updatedAt: now,
      fencingToken: base.fencingToken,
      activeRuntimeFingerprint: base.activeRuntimeFingerprint,
      activeGeneration: base.activeGeneration,
      previousGeneration: base.activeGeneration,
      participants: [],
      auditTrail: appendAuditEvent(base.auditTrail, {
        at: now,
        operationId,
        state: "preflight",
        phase: "fingerprinting",
        triggeredBy
      })
    };
    const started = await this.repository.tryBeginPreflight(requested);
    if (!started) {
      const current = await this.refresh();
      if (
        requested.idempotencyKey &&
        current.idempotencyKey === requested.idempotencyKey
      ) {
        return { record: current, acquired: false };
      }
      throw new AppException({
        status: 409,
        code: "CACHE_REBUILD_ALREADY_RUNNING",
        message: "Another runtime cache rebuild operation is already active.",
        retryable: true
      });
    }
    return { record: await this.refresh(), acquired: true };
  }

  async completeNoChanges(
    operationId: string,
    activeRuntimeFingerprint: string,
    activeGeneration?: string
  ): Promise<SystemMaintenanceRecord> {
    const current = await this.requireOperation(operationId);
    return this.persist({
      ...current,
      state: "idle",
      phase: "no_changes",
      updatedAt: new Date().toISOString(),
      activeRuntimeFingerprint,
      activeGeneration: activeGeneration ?? current.activeGeneration,
      stagingGeneration: undefined,
      candidateSettings: undefined,
      previousSettings: undefined,
      participants: []
    });
  }

  async enterRebuilding(input: {
    operationId: string;
    candidateRuntimeFingerprint: string;
    stagingGeneration: string;
    candidateSettings: unknown;
    previousSettings: unknown;
    participants: MaintenanceParticipantSummary[];
  }): Promise<SystemMaintenanceRecord> {
    const current = await this.requireOperation(input.operationId);
    return this.persist({
      ...current,
      state: "rebuilding",
      phase: "building_generation",
      leaseOwner: randomUUID(),
      updatedAt: new Date().toISOString(),
      candidateRuntimeFingerprint: input.candidateRuntimeFingerprint,
      stagingGeneration: input.stagingGeneration,
      previousGeneration: current.activeGeneration,
      candidateSettings: input.candidateSettings,
      previousSettings: input.previousSettings,
      participants: input.participants,
      errorCode: undefined,
      errorMessage: undefined
    });
  }

  async abortPreflight(
    operationId: string,
    phase = "preflight_rejected"
  ): Promise<SystemMaintenanceRecord> {
    const current = await this.requireOperation(operationId);
    if (current.state !== "preflight") {
      return current;
    }
    return this.persist({
      ...current,
      state: "idle",
      phase,
      updatedAt: new Date().toISOString(),
      stagingGeneration: undefined,
      candidateSettings: undefined,
      previousSettings: undefined,
      participants: []
    });
  }

  async updateProgress(
    operationId: string,
    phase: string,
    participants: MaintenanceParticipantSummary[]
  ): Promise<SystemMaintenanceRecord> {
    const current = await this.requireOperation(operationId);
    return this.persist({
      ...current,
      phase,
      participants,
      updatedAt: new Date().toISOString()
    });
  }

  async enterPublishing(operationId: string): Promise<SystemMaintenanceRecord> {
    const current = await this.requireOperation(operationId);
    return this.persist({
      ...current,
      state: "publishing",
      phase: "publishing_generation",
      updatedAt: new Date().toISOString()
    });
  }

  async completePublished(
    operationId: string,
    activeRuntimeFingerprint: string,
    activeGeneration: string,
    participants: MaintenanceParticipantSummary[]
  ): Promise<SystemMaintenanceRecord> {
    const current = await this.requireOperation(operationId);
    return this.persist({
      ...current,
      state: "idle",
      phase: "completed",
      updatedAt: new Date().toISOString(),
      activeRuntimeFingerprint,
      activeGeneration,
      stagingGeneration: undefined,
      candidateSettings: undefined,
      previousSettings: undefined,
      participants
    });
  }

  async fail(
    operationId: string | undefined,
    errorCode: string,
    errorMessage: string
  ): Promise<SystemMaintenanceRecord> {
    const current = operationId
      ? await this.requireOperation(operationId)
      : await this.refresh();
    return this.persist({
      ...current,
      state: "failed",
      phase: "failed",
      updatedAt: new Date().toISOString(),
      errorCode,
      errorMessage
    });
  }

  async prepareRetry(
    operationId: string,
    stagingGeneration: string
  ): Promise<SystemMaintenanceRecord> {
    const current = await this.requireOperation(operationId);
    if (current.state !== "failed" || !current.candidateSettings) {
      throw new AppException({
        status: 409,
        code: "CACHE_REBUILD_NOT_RETRYABLE",
        message: "The cache rebuild operation is not retryable."
      });
    }
    return this.persist({
      ...current,
      state: "rebuilding",
      phase: "building_generation",
      leaseOwner: randomUUID(),
      stagingGeneration,
      updatedAt: new Date().toISOString(),
      errorCode: undefined,
      errorMessage: undefined,
      participants: current.participants.map((participant) => ({
        name: participant.name,
        status: "pending"
      }))
    });
  }

  async completeRollback(operationId: string): Promise<SystemMaintenanceRecord> {
    const current = await this.requireOperation(operationId);
    if (current.state !== "failed") {
      throw new AppException({
        status: 409,
        code: "CACHE_REBUILD_NOT_ROLLBACKABLE",
        message: "Only a failed cache rebuild can be rolled back."
      });
    }
    return this.persist({
      ...current,
      state: "idle",
      phase: "rolled_back",
      updatedAt: new Date().toISOString(),
      candidateRuntimeFingerprint: undefined,
      stagingGeneration: undefined,
      candidateSettings: undefined,
      previousSettings: undefined,
      errorCode: undefined,
      errorMessage: undefined,
      participants: []
    });
  }

  private async requireOperation(operationId: string): Promise<SystemMaintenanceRecord> {
    const current = await this.refresh();
    if (current.operationId !== operationId) {
      throw new AppException({
        status: 404,
        code: "CACHE_REBUILD_NOT_FOUND",
        message: "Runtime cache rebuild operation was not found."
      });
    }
    return current;
  }

  private async persist(record: SystemMaintenanceRecord): Promise<SystemMaintenanceRecord> {
    const expectedFencingToken = record.fencingToken;
    const nextRecord: SystemMaintenanceRecord = {
      ...record,
      fencingToken: expectedFencingToken + 1,
      auditTrail: appendAuditEvent(record.auditTrail, toAuditEvent(record))
    };
    const saved = await this.repository.save(nextRecord, expectedFencingToken);
    if (!saved) {
      await this.refresh();
      throw new AppException({
        status: 409,
        code: "CACHE_REBUILD_FENCED",
        message: "Runtime cache rebuild leadership changed; this operation was fenced.",
        retryable: true
      });
    }
    this.publish(nextRecord);
    return structuredClone(nextRecord);
  }

  private async refresh(): Promise<SystemMaintenanceRecord> {
    const record = await this.repository.get();
    this.publish(record);
    return structuredClone(record);
  }

  private publish(record: SystemMaintenanceRecord): void {
    const previousState = this.cached.state;
    const previousGeneration = this.cached.activeGeneration;
    this.cached = structuredClone(record);
    if (
      previousState !== record.state ||
      previousGeneration !== record.activeGeneration
    ) {
      for (const listener of this.listeners) {
        listener(structuredClone(record));
      }
    }
  }
}

function toAuditEvent(record: SystemMaintenanceRecord): MaintenanceAuditEvent {
  return {
    at: record.updatedAt,
    operationId: record.operationId,
    state: record.state,
    phase: record.phase,
    triggeredBy: record.triggeredBy,
    candidateRuntimeFingerprint: record.candidateRuntimeFingerprint,
    activeRuntimeFingerprint: record.activeRuntimeFingerprint,
    stagingGeneration: record.stagingGeneration,
    activeGeneration: record.activeGeneration,
    errorCode: record.errorCode
  };
}

function appendAuditEvent(
  current: MaintenanceAuditEvent[] | undefined,
  event: MaintenanceAuditEvent
): MaintenanceAuditEvent[] {
  const previous = current ?? [];
  const last = previous[previous.length - 1];
  if (
    last &&
    last.operationId === event.operationId &&
    last.state === event.state &&
    last.phase === event.phase &&
    last.errorCode === event.errorCode
  ) {
    return structuredClone(previous);
  }
  return [...previous, event].slice(-200);
}

function isBlockingState(state: SystemMaintenanceState): boolean {
  return state === "rebuilding" || state === "publishing" || state === "failed";
}

function maintenanceException(record: SystemMaintenanceRecord): AppException {
  return new AppException({
    status: 503,
    code:
      record.state === "failed"
        ? "MAINTENANCE_REBUILD_FAILED"
        : "MAINTENANCE_REBUILDING",
    message:
      record.state === "failed"
        ? "Server cache rebuild failed and requires administrator recovery."
        : "Server cache rebuild is in progress. Try again after maintenance completes.",
    retryable: record.state !== "failed",
    details: [
      { path: "maintenance.state", reason: record.state },
      { path: "maintenance.phase", reason: record.phase }
    ]
  });
}

function buildPublicMessage(record: SystemMaintenanceRecord): string {
  if (record.state === "failed") {
    return "Server maintenance requires administrator recovery.";
  }
  if (record.state === "rebuilding" || record.state === "publishing") {
    return "Server data is being rebuilt. Login will reopen automatically when it is ready.";
  }
  if (record.state === "preflight") {
    return "Server data is being checked for changes.";
  }
  return "Server is ready.";
}
