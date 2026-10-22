import { Injectable, Logger } from "@nestjs/common";
import type {
  AreaTriggerVariableTableTelemetryEvent,
  AreaTriggerVariableTableTelemetryPort,
} from "../../../application/ports/area-trigger-variable-table-telemetry.port";

@Injectable()
export class NestAreaTriggerVariableTableTelemetryAdapter
  implements AreaTriggerVariableTableTelemetryPort
{
  private readonly logger = new Logger(
    NestAreaTriggerVariableTableTelemetryAdapter.name,
  );

  emit(event: AreaTriggerVariableTableTelemetryEvent): void {
    const message = JSON.stringify(event);
    if (event.outcome === "failed") this.logger.warn(message);
    else this.logger.log(message);
  }
}
