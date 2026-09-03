import { Injectable, Logger } from "@nestjs/common";
import type {
  AreaStoreRestrictionsTelemetryEvent,
  AreaStoreRestrictionsTelemetryPort,
} from "../../../application/ports/area-store-restrictions-telemetry.port";

@Injectable()
export class NestAreaStoreRestrictionsTelemetryAdapter
  implements AreaStoreRestrictionsTelemetryPort
{
  private readonly logger = new Logger(
    NestAreaStoreRestrictionsTelemetryAdapter.name,
  );

  emit(event: AreaStoreRestrictionsTelemetryEvent): void {
    const message = JSON.stringify(event);
    if (event.outcome === "failed") this.logger.warn(message);
    else this.logger.log(message);
  }
}
