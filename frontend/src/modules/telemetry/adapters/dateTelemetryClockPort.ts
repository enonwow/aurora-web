import type { TelemetryClockPort } from "../ports/telemetryClockPort";

export function createDateTelemetryClockPort(): TelemetryClockPort {
  return {
    nowIsoString() {
      return new Date().toISOString();
    }
  };
}
