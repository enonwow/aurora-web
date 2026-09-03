import { Injectable, Logger } from "@nestjs/common";
import type {
  AreaEventScriptPublicationTelemetryEvent,
  AreaEventScriptPublicationTelemetryPort,
} from "../../../application/ports/area-event-script-publication-telemetry.port";

@Injectable()
export class NestAreaEventScriptPublicationTelemetryAdapter
  implements AreaEventScriptPublicationTelemetryPort
{
  private readonly logger = new Logger(
    NestAreaEventScriptPublicationTelemetryAdapter.name,
  );

  emit(event: AreaEventScriptPublicationTelemetryEvent): void {
    const message = JSON.stringify(event);
    if (event.outcome === "failed") this.logger.warn(message);
    else this.logger.log(message);
  }
}
