export type AuthTelemetryPayload = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface AuthTelemetryPort {
  track(name: string, payload?: AuthTelemetryPayload): void;
}
