export type TelemetryPayload = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface TelemetryEvent {
  id: number;
  name: string;
  timestamp: string;
  payload: TelemetryPayload;
}

type TelemetryListener = (events: TelemetryEvent[]) => void;

let nextId = 1;
let events: TelemetryEvent[] = [];
const listeners = new Set<TelemetryListener>();

function notifyListeners() {
  const snapshot = [...events];
  listeners.forEach((listener) => listener(snapshot));
}

export function trackTelemetry(
  name: string,
  payload: TelemetryPayload = {}
): TelemetryEvent {
  const event: TelemetryEvent = {
    id: nextId++,
    name,
    timestamp: new Date().toISOString(),
    payload
  };

  events = [event, ...events];
  notifyListeners();
  return event;
}

export function getTelemetryEvents(): TelemetryEvent[] {
  return [...events];
}

export function clearTelemetry() {
  nextId = 1;
  events = [];
  notifyListeners();
}

export function subscribeTelemetry(listener: TelemetryListener): () => void {
  listeners.add(listener);
  listener([...events]);
  return () => listeners.delete(listener);
}
