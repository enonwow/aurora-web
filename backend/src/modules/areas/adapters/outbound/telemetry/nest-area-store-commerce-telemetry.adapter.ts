import { Injectable, Logger } from "@nestjs/common";
import type {
  AreaStoreCommerceTelemetryEvent,
  AreaStoreCommerceTelemetryPort,
} from "../../../application/ports/area-store-commerce-telemetry.port";

@Injectable()
export class NestAreaStoreCommerceTelemetryAdapter
  implements AreaStoreCommerceTelemetryPort
{
  private readonly logger = new Logger(NestAreaStoreCommerceTelemetryAdapter.name);

  emit(event: AreaStoreCommerceTelemetryEvent): void {
    const message = JSON.stringify(event);
    if (event.outcome === "failed") this.logger.warn(message);
    else this.logger.log(message);
  }
}
