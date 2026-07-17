import {
  createTelemetryFacade,
  type TelemetryFacade
} from "../application/telemetryFacade";
import { createDateTelemetryClockPort } from "../adapters/dateTelemetryClockPort";
import { createIncrementalTelemetryIdSequencePort } from "../adapters/incrementalTelemetryIdSequencePort";
import { createInMemoryTelemetryStorePort } from "../adapters/inMemoryTelemetryStorePort";

export function createBrowserTelemetryFacade(): TelemetryFacade {
  return createTelemetryFacade({
    clockPort: createDateTelemetryClockPort(),
    idSequencePort: createIncrementalTelemetryIdSequencePort(1),
    storePort: createInMemoryTelemetryStorePort()
  });
}
