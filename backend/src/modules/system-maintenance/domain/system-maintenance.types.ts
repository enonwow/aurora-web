export type SystemMaintenanceState =
  | "idle"
  | "preflight"
  | "rebuilding"
  | "publishing"
  | "failed";

export interface MaintenanceParticipantSummary {
  name: string;
  status: "pending" | "running" | "completed" | "skipped" | "failed";
  details?: Record<string, string | number | boolean | null>;
}

export interface MaintenanceAuditEvent {
  at: string;
  operationId?: string;
  state: SystemMaintenanceState;
  phase: string;
  triggeredBy?: string;
  candidateRuntimeFingerprint?: string;
  activeRuntimeFingerprint?: string;
  stagingGeneration?: string;
  activeGeneration?: string;
  errorCode?: string;
}

export interface SystemMaintenanceRecord {
  state: SystemMaintenanceState;
  operationId?: string;
  idempotencyKey?: string;
  leaseOwner?: string;
  phase: string;
  triggeredBy?: string;
  startedAt?: string;
  updatedAt: string;
  fencingToken: number;
  candidateRuntimeFingerprint?: string;
  activeRuntimeFingerprint?: string;
  stagingGeneration?: string;
  activeGeneration?: string;
  previousGeneration?: string;
  candidateSettings?: unknown;
  previousSettings?: unknown;
  participants: MaintenanceParticipantSummary[];
  auditTrail?: MaintenanceAuditEvent[];
  errorCode?: string;
  errorMessage?: string;
}

export interface MaintenancePreflightLease {
  record: SystemMaintenanceRecord;
  acquired: boolean;
}

export interface PublicMaintenanceStatus {
  state: SystemMaintenanceState;
  maintenance: boolean;
  loginAvailable: boolean;
  phase: string;
  operationId?: string;
  updatedAt: string;
  retryAfterSeconds?: number;
  message: string;
}
