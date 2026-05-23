import { browserTelemetryFacade } from "./composition/browserTelemetrySingleton";
import type {
  TelemetryEvent,
  TelemetryListener,
  TelemetryPayload
} from "./domain/telemetryEvent";

export type { TelemetryEvent, TelemetryListener, TelemetryPayload };
export { browserTelemetryFacade as telemetryFacade };

export function trackTelemetry(
  name: string,
  payload: TelemetryPayload = {}
): TelemetryEvent {
  return browserTelemetryFacade.track(name, payload);
}

export function getTelemetryEvents(): TelemetryEvent[] {
  return browserTelemetryFacade.getEvents();
}

export function clearTelemetry() {
  browserTelemetryFacade.clear();
}

export function subscribeTelemetry(listener: TelemetryListener): () => void {
  return browserTelemetryFacade.subscribe(listener);
}
