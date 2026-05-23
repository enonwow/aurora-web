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

export type TelemetryListener = (events: TelemetryEvent[]) => void;

export function cloneTelemetryEvent(event: TelemetryEvent): TelemetryEvent {
  return {
    id: event.id,
    name: event.name,
    timestamp: event.timestamp,
    payload: { ...event.payload }
  };
}
