export interface TelemetryIdSequencePort {
  next(): number;
  reset(startAt?: number): void;
}
