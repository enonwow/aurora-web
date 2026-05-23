import type {
  TelemetryEvent,
  TelemetryListener
} from "../domain/telemetryEvent";

export interface TelemetryStorePort {
  append(event: TelemetryEvent): void;
  getEvents(): TelemetryEvent[];
  clear(): void;
  subscribe(listener: TelemetryListener): () => void;
}
