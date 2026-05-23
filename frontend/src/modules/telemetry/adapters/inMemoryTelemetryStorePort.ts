import {
  cloneTelemetryEvent,
  type TelemetryEvent,
  type TelemetryListener
} from "../domain/telemetryEvent";
import type { TelemetryStorePort } from "../ports/telemetryStorePort";

export function createInMemoryTelemetryStorePort(): TelemetryStorePort {
  let events: TelemetryEvent[] = [];
  const listeners = new Set<TelemetryListener>();

  const getSnapshot = () => events.map(cloneTelemetryEvent);
  const notify = () => {
    const snapshot = getSnapshot();
    listeners.forEach((listener) => listener(snapshot));
  };

  return {
    append(event) {
      events = [cloneTelemetryEvent(event), ...events];
      notify();
    },
    getEvents() {
      return getSnapshot();
    },
    clear() {
      events = [];
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(getSnapshot());
      return () => {
        listeners.delete(listener);
      };
    }
  };
}
