import type { SystemMaintenanceRecord } from "../../domain/system-maintenance.types";

export const SYSTEM_MAINTENANCE_REPOSITORY = Symbol("SYSTEM_MAINTENANCE_REPOSITORY");

export interface SystemMaintenanceRepositoryPort {
  get(): Promise<SystemMaintenanceRecord>;
  tryBeginPreflight(record: SystemMaintenanceRecord): Promise<boolean>;
  save(record: SystemMaintenanceRecord, expectedFencingToken: number): Promise<boolean>;
}
