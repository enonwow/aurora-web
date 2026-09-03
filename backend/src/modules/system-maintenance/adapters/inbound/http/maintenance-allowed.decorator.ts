import { SetMetadata } from "@nestjs/common";

export const MAINTENANCE_ALLOWED_KEY = "maintenanceAllowed";

export const MaintenanceAllowed = () =>
  SetMetadata(MAINTENANCE_ALLOWED_KEY, true);
