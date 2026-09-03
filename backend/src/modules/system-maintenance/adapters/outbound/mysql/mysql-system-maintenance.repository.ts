import { Injectable } from "@nestjs/common";
import type { ResultSetHeader } from "mysql2";
import { DatabaseService } from "../../../../../database/database.service";
import type { SystemMaintenanceRepositoryPort } from "../../../application/ports/system-maintenance-repository.port";
import type {
  MaintenanceParticipantSummary,
  MaintenanceAuditEvent,
  SystemMaintenanceRecord,
  SystemMaintenanceState
} from "../../../domain/system-maintenance.types";

interface MaintenanceRow {
  state: SystemMaintenanceState;
  operation_id: string | null;
  idempotency_key: string | null;
  lease_owner: string | null;
  phase: string;
  triggered_by: string | null;
  started_at: Date | null;
  updated_at: Date;
  fencing_token: number;
  candidate_runtime_fingerprint: string | null;
  active_runtime_fingerprint: string | null;
  staging_generation: string | null;
  active_generation: string | null;
  previous_generation: string | null;
  candidate_settings_json: string | Record<string, unknown> | null;
  previous_settings_json: string | Record<string, unknown> | null;
  participants_json: string | MaintenanceParticipantSummary[] | null;
  audit_json: string | MaintenanceAuditEvent[] | null;
  error_code: string | null;
  error_message: string | null;
}

@Injectable()
export class MySqlSystemMaintenanceRepository
  implements SystemMaintenanceRepositoryPort
{
  constructor(private readonly database: DatabaseService) {}

  async get(): Promise<SystemMaintenanceRecord> {
    const rows = await this.database.query<MaintenanceRow[]>(`
      SELECT
        state,
        operation_id,
        idempotency_key,
        lease_owner,
        phase,
        triggered_by,
        started_at,
        updated_at,
        fencing_token,
        candidate_runtime_fingerprint,
        active_runtime_fingerprint,
        staging_generation,
        active_generation,
        previous_generation,
        candidate_settings_json,
        previous_settings_json,
        participants_json,
        audit_json,
        error_code,
        error_message
      FROM system_maintenance
      WHERE singleton_id = 1
      LIMIT 1
    `);
    if (!rows[0]) {
      throw new Error("System maintenance singleton row is missing.");
    }
    return mapRow(rows[0]);
  }

  async tryBeginPreflight(record: SystemMaintenanceRecord): Promise<boolean> {
    const result = await this.database.query<ResultSetHeader>(
      `
        UPDATE system_maintenance
        SET
          state = 'preflight',
          operation_id = ?,
          idempotency_key = ?,
          lease_owner = ?,
          phase = ?,
          triggered_by = ?,
          started_at = ?,
          updated_at = ?,
          fencing_token = fencing_token + 1,
          candidate_runtime_fingerprint = NULL,
          staging_generation = NULL,
          previous_generation = active_generation,
          candidate_settings_json = NULL,
          previous_settings_json = NULL,
          participants_json = JSON_ARRAY(),
          audit_json = ?,
          error_code = NULL,
          error_message = NULL
        WHERE singleton_id = 1
          AND state = 'idle'
      `,
      [
        record.operationId ?? null,
        record.idempotencyKey ?? null,
        record.leaseOwner ?? null,
        record.phase,
        record.triggeredBy ?? null,
        toSqlDate(record.startedAt),
        toSqlDate(record.updatedAt),
        JSON.stringify(record.auditTrail ?? [])
      ]
    );
    return result.affectedRows === 1;
  }

  async save(
    record: SystemMaintenanceRecord,
    expectedFencingToken: number
  ): Promise<boolean> {
    const result = await this.database.query<ResultSetHeader>(
      `
        UPDATE system_maintenance
        SET
          state = ?,
          operation_id = ?,
          idempotency_key = ?,
          lease_owner = ?,
          phase = ?,
          triggered_by = ?,
          started_at = ?,
          updated_at = ?,
          candidate_runtime_fingerprint = ?,
          active_runtime_fingerprint = ?,
          staging_generation = ?,
          active_generation = ?,
          previous_generation = ?,
          candidate_settings_json = ?,
          previous_settings_json = ?,
          participants_json = ?,
          audit_json = ?,
          error_code = ?,
          error_message = ?,
          fencing_token = ?
        WHERE singleton_id = 1
          AND fencing_token = ?
      `,
      [
        record.state,
        record.operationId ?? null,
        record.idempotencyKey ?? null,
        record.leaseOwner ?? null,
        record.phase,
        record.triggeredBy ?? null,
        toSqlDate(record.startedAt),
        toSqlDate(record.updatedAt),
        record.candidateRuntimeFingerprint ?? null,
        record.activeRuntimeFingerprint ?? null,
        record.stagingGeneration ?? null,
        record.activeGeneration ?? null,
        record.previousGeneration ?? null,
        stringifyJson(record.candidateSettings),
        stringifyJson(record.previousSettings),
        JSON.stringify(record.participants),
        JSON.stringify(record.auditTrail ?? []),
        record.errorCode ?? null,
        record.errorMessage ?? null,
        record.fencingToken,
        expectedFencingToken
      ]
    );
    return result.affectedRows === 1;
  }
}

function mapRow(row: MaintenanceRow): SystemMaintenanceRecord {
  return {
    state: row.state,
    operationId: row.operation_id ?? undefined,
    idempotencyKey: row.idempotency_key ?? undefined,
    leaseOwner: row.lease_owner ?? undefined,
    phase: row.phase,
    triggeredBy: row.triggered_by ?? undefined,
    startedAt: row.started_at?.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    fencingToken: Number(row.fencing_token),
    candidateRuntimeFingerprint: row.candidate_runtime_fingerprint ?? undefined,
    activeRuntimeFingerprint: row.active_runtime_fingerprint ?? undefined,
    stagingGeneration: row.staging_generation ?? undefined,
    activeGeneration: row.active_generation ?? undefined,
    previousGeneration: row.previous_generation ?? undefined,
    candidateSettings: parseJson(row.candidate_settings_json),
    previousSettings: parseJson(row.previous_settings_json),
    participants: parseJson<MaintenanceParticipantSummary[]>(row.participants_json) ?? [],
    auditTrail: parseJson<MaintenanceAuditEvent[]>(row.audit_json) ?? [],
    errorCode: row.error_code ?? undefined,
    errorMessage: row.error_message ?? undefined
  };
}

function parseJson<T = unknown>(
  value: string | T | null
): T | undefined {
  if (value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

function stringifyJson(value: unknown): string | null {
  return value === undefined ? null : JSON.stringify(value);
}

function toSqlDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }
  return new Date(value);
}
