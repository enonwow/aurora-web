import { Injectable, Logger } from "@nestjs/common";
import type {
  AreaEventScriptCatalogTelemetryEvent,
  AreaEventScriptCatalogTelemetryPort,
} from "../../../application/ports/area-event-script-catalog-telemetry.port";

@Injectable()
export class NestAreaEventScriptCatalogTelemetryAdapter
  implements AreaEventScriptCatalogTelemetryPort {
  private readonly logger = new Logger("AreaEventScriptCatalog");

  record(event: AreaEventScriptCatalogTelemetryEvent): void {
    const serialized = JSON.stringify(event);
    if (event.result === "failed") {
      this.logger.warn(serialized);
    } else {
      this.logger.log(serialized);
    }
  }
}
