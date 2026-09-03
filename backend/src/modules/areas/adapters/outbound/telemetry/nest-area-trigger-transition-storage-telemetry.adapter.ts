import { Injectable, Logger } from "@nestjs/common";
import type {
  AreaTriggerTransitionStorageTelemetryEvent,
  AreaTriggerTransitionStorageTelemetryPort,
} from "../../../application/ports/area-trigger-transition-storage-telemetry.port";

@Injectable()
export class NestAreaTriggerTransitionStorageTelemetryAdapter
  implements AreaTriggerTransitionStorageTelemetryPort
{
  private readonly logger = new Logger(
    NestAreaTriggerTransitionStorageTelemetryAdapter.name,
  );

  emit(event: AreaTriggerTransitionStorageTelemetryEvent): void {
    const message = JSON.stringify(event);
    if (event.outcome === "failed") this.logger.warn(message);
    else this.logger.log(message);
  }
}
