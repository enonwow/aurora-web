import {
  cloneTelemetryEvent,
  type TelemetryEvent,
  type TelemetryListener,
  type TelemetryPayload
} from "../domain/telemetryEvent";
import type { TelemetryClockPort } from "../ports/telemetryClockPort";
import type { TelemetryIdSequencePort } from "../ports/telemetryIdSequencePort";
import type { TelemetryStorePort } from "../ports/telemetryStorePort";

export interface TelemetryFacade {
  track(name: string, payload?: TelemetryPayload): TelemetryEvent;
  getEvents(): TelemetryEvent[];
  clear(): void;
  subscribe(listener: TelemetryListener): () => void;
}

interface TelemetryFacadeDependencies {
  clockPort: TelemetryClockPort;
  idSequencePort: TelemetryIdSequencePort;
  storePort: TelemetryStorePort;
}

export function createTelemetryFacade(
  dependencies: TelemetryFacadeDependencies
): TelemetryFacade {
  const { clockPort, idSequencePort, storePort } = dependencies;

  return {
    track(name, payload = {}) {
      const event: TelemetryEvent = {
        id: idSequencePort.next(),
        name,
        timestamp: clockPort.nowIsoString(),
        payload: { ...payload }
      };
      storePort.append(event);
      return cloneTelemetryEvent(event);
    },
    getEvents() {
      return storePort.getEvents().map(cloneTelemetryEvent);
    },
    clear() {
      idSequencePort.reset(1);
      storePort.clear();
    },
    subscribe(listener) {
      return storePort.subscribe(listener);
    }
  };
}
