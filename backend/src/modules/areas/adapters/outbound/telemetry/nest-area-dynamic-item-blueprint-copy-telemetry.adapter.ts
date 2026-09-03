import { Injectable, Logger } from "@nestjs/common";
import type {
  AreaDynamicItemBlueprintCopyTelemetryEvent,
  AreaDynamicItemBlueprintCopyTelemetryPort,
} from "../../../application/ports/area-dynamic-item-blueprint-copy-telemetry.port";

@Injectable()
export class NestAreaDynamicItemBlueprintCopyTelemetryAdapter
  implements AreaDynamicItemBlueprintCopyTelemetryPort
{
  private readonly logger = new Logger(
    NestAreaDynamicItemBlueprintCopyTelemetryAdapter.name,
  );

  emit(event: AreaDynamicItemBlueprintCopyTelemetryEvent): void {
    const message = JSON.stringify(event);
    if (event.outcome === "failed") this.logger.warn(message);
    else this.logger.log(message);
  }
}
