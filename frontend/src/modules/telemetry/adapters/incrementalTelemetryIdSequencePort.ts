import type { TelemetryIdSequencePort } from "../ports/telemetryIdSequencePort";

export function createIncrementalTelemetryIdSequencePort(
  initialValue = 1
): TelemetryIdSequencePort {
  let nextValue = initialValue;

  return {
    next() {
      const current = nextValue;
      nextValue += 1;
      return current;
    },
    reset(startAt = initialValue) {
      nextValue = startAt;
    }
  };
}
