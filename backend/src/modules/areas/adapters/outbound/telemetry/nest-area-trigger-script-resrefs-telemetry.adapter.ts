import { Injectable, Logger } from "@nestjs/common";
import type {
  AreaTriggerScriptResRefsTelemetryEvent,
  AreaTriggerScriptResRefsTelemetryPort,
} from "../../../application/ports/area-trigger-script-resrefs-telemetry.port";

@Injectable()
export class NestAreaTriggerScriptResRefsTelemetryAdapter
  implements AreaTriggerScriptResRefsTelemetryPort
{
  private readonly logger = new Logger(
    NestAreaTriggerScriptResRefsTelemetryAdapter.name,
  );

  emit(event: AreaTriggerScriptResRefsTelemetryEvent): void {
    const message = JSON.stringify(event);
    if (event.outcome === "failed") this.logger.warn(message);
    else this.logger.log(message);
  }
}
