import { Injectable, Logger } from "@nestjs/common";
import type {
  AreaStoreInventoryTelemetryEvent,
  AreaStoreInventoryTelemetryPort,
} from "../../../application/ports/area-store-inventory-telemetry.port";

@Injectable()
export class NestAreaStoreInventoryTelemetryAdapter
  implements AreaStoreInventoryTelemetryPort
{
  private readonly logger = new Logger(NestAreaStoreInventoryTelemetryAdapter.name);

  emit(event: AreaStoreInventoryTelemetryEvent): void {
    const message = JSON.stringify(event);
    if (event.outcome === "failed") this.logger.warn(message);
    else this.logger.log(message);
  }
}
