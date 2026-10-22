import { Injectable, Logger } from "@nestjs/common";
import type {
  AreaTriggerTrapPropertiesTelemetryEvent,
  AreaTriggerTrapPropertiesTelemetryPort,
} from "../../../application/ports/area-trigger-trap-properties-telemetry.port";

@Injectable()
export class NestAreaTriggerTrapPropertiesTelemetryAdapter
  implements AreaTriggerTrapPropertiesTelemetryPort
{
  private readonly logger = new Logger(
    NestAreaTriggerTrapPropertiesTelemetryAdapter.name,
  );

  emit(event: AreaTriggerTrapPropertiesTelemetryEvent): void {
    const message = JSON.stringify(event);
    if (event.outcome === "failed") this.logger.warn(message);
    else this.logger.log(message);
  }
}
