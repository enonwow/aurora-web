import { Injectable } from "@nestjs/common";
import type { SystemMaintenanceRepositoryPort } from "../../../application/ports/system-maintenance-repository.port";
import type { SystemMaintenanceRecord } from "../../../domain/system-maintenance.types";

@Injectable()
export class MemorySystemMaintenanceRepository
  implements SystemMaintenanceRepositoryPort
{
  private record: SystemMaintenanceRecord = {
    state: "idle",
    phase: "idle",
    updatedAt: new Date(0).toISOString(),
    fencingToken: 0,
    participants: []
  };

  async get(): Promise<SystemMaintenanceRecord> {
    return structuredClone(this.record);
  }

  async tryBeginPreflight(record: SystemMaintenanceRecord): Promise<boolean> {
    if (this.record.state !== "idle") {
      return false;
    }
    this.record = {
      ...structuredClone(record),
      fencingToken: this.record.fencingToken + 1
    };
    return true;
  }

  async save(
    record: SystemMaintenanceRecord,
    expectedFencingToken: number
  ): Promise<boolean> {
    if (this.record.fencingToken !== expectedFencingToken) {
      return false;
    }
    this.record = structuredClone(record);
    return true;
  }
}
