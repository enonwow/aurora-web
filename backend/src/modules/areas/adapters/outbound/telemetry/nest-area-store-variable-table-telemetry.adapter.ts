import { Injectable, Logger } from "@nestjs/common";
import type {
  AreaStoreVariableTableTelemetryEvent,
  AreaStoreVariableTableTelemetryPort,
} from "../../../application/ports/area-store-variable-table-telemetry.port";

@Injectable()
export class NestAreaStoreVariableTableTelemetryAdapter
  implements AreaStoreVariableTableTelemetryPort
{
  private readonly logger = new Logger(
    NestAreaStoreVariableTableTelemetryAdapter.name,
  );

  emit(event: AreaStoreVariableTableTelemetryEvent): void {
    const message = JSON.stringify(event);
    if (event.outcome === "failed") this.logger.warn(message);
    else this.logger.log(message);
  }
}
