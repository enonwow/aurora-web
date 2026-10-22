import { Injectable, Logger } from "@nestjs/common";
import type {
  AreaTriggerCorePropertiesTelemetryEvent,
  AreaTriggerCorePropertiesTelemetryPort,
} from "../../../application/ports/area-trigger-core-properties-telemetry.port";

@Injectable()
export class NestAreaTriggerCorePropertiesTelemetryAdapter
  implements AreaTriggerCorePropertiesTelemetryPort
{
  private readonly logger = new Logger(
    NestAreaTriggerCorePropertiesTelemetryAdapter.name,
  );

  emit(event: AreaTriggerCorePropertiesTelemetryEvent): void {
    const message = JSON.stringify(event);
    if (event.outcome === "failed") this.logger.warn(message);
    else this.logger.log(message);
  }
}
