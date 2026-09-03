export const AURORA_WORLDTIMER_CONTRACT_VERSION = "aurora-worldtimer/v1" as const;

export interface AuroraWorldTimerContract {
  version: typeof AURORA_WORLDTIMER_CONTRACT_VERSION;
  status: "ready";
  source: "module-ifo";
  sourceObjectKey: string;
  sourceHash: string;
  fingerprint: string;
  minutesPerHour: number;
  startHour: number;
  startTimeOfDayMs: number;
  dayLengthMs: number;
  tickUnit: "milliseconds";
  advanceMode: "scene-animation-delta";
}
