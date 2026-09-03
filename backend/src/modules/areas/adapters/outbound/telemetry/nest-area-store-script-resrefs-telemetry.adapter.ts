import { Injectable, Logger } from "@nestjs/common";
import type {
  AreaStoreScriptResRefsTelemetryEvent,
  AreaStoreScriptResRefsTelemetryPort,
} from "../../../application/ports/area-store-script-resrefs-telemetry.port";

@Injectable()
export class NestAreaStoreScriptResRefsTelemetryAdapter
  implements AreaStoreScriptResRefsTelemetryPort
{
  private readonly logger = new Logger(
    NestAreaStoreScriptResRefsTelemetryAdapter.name,
  );

  emit(event: AreaStoreScriptResRefsTelemetryEvent): void {
    const message = JSON.stringify(event);
    if (event.outcome === "failed") this.logger.warn(message);
    else this.logger.log(message);
  }
}
