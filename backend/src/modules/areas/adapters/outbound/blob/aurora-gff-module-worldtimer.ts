import { createHash } from "node:crypto";
import {
  AURORA_WORLDTIMER_CONTRACT_VERSION,
  type AuroraWorldTimerContract
} from "../../../../../common/aurora/material/aurora-worldtimer.types";
import { parseRawGffDocument } from "../../../../catalog/adapters/outbound/blob/aurora-gff-template-parser";
import type { SupportedGffField } from "../../../../catalog/adapters/outbound/blob/aurora-gff-uti-writer";

const AURORA_REAL_MILLISECONDS_PER_HOUR_MINUTE = 60_000;
const AURORA_REAL_MILLISECONDS_PER_DAY_MINUTE = 24 * AURORA_REAL_MILLISECONDS_PER_HOUR_MINUTE;

export function parseAuroraWorldTimerFromModuleIfo(
  bytes: Buffer,
  sourceObjectKey: string
): AuroraWorldTimerContract | null {
  const document = parseRawGffDocument(bytes);
  if (!document || document.fileType !== "IFO " || document.fileVersion !== "V3.2") {
    return null;
  }

  const authoredMinutesPerHour = readNumericRootField(document.fields, "Mod_MinPerHour");
  const authoredStartHour = readNumericRootField(document.fields, "Mod_StartHour");
  if (authoredMinutesPerHour === null || authoredStartHour === null) {
    return null;
  }

  // CWorldTimer::SetMinutesPerHour maps zero to one before deriving the period.
  const minutesPerHour = Math.max(1, Math.min(0xff, Math.trunc(authoredMinutesPerHour)));
  const startHour = Math.max(0, Math.min(23, Math.trunc(authoredStartHour)));
  const dayLengthMs = minutesPerHour * AURORA_REAL_MILLISECONDS_PER_DAY_MINUTE;
  const startTimeOfDayMs = startHour * minutesPerHour * AURORA_REAL_MILLISECONDS_PER_HOUR_MINUTE;
  const sourceHash = createHash("sha256").update(bytes).digest("hex");
  const fingerprint = createHash("sha256")
    .update(
      [
        AURORA_WORLDTIMER_CONTRACT_VERSION,
        sourceObjectKey,
        sourceHash,
        minutesPerHour,
        startHour,
        startTimeOfDayMs,
        dayLengthMs
      ].join("|")
    )
    .digest("hex");

  return {
    version: AURORA_WORLDTIMER_CONTRACT_VERSION,
    status: "ready",
    source: "module-ifo",
    sourceObjectKey,
    sourceHash,
    fingerprint,
    minutesPerHour,
    startHour,
    startTimeOfDayMs,
    dayLengthMs,
    tickUnit: "milliseconds",
    advanceMode: "scene-animation-delta"
  };
}

function readNumericRootField(
  fields: readonly SupportedGffField[],
  label: string
): number | null {
  const normalizedLabel = label.toLowerCase();
  const field = fields.find((candidate) => candidate.label.toLowerCase() === normalizedLabel);
  if (!field || typeof field.value !== "number" || !Number.isFinite(field.value)) {
    return null;
  }
  return field.value;
}

export const __auroraGffModuleWorldTimerInternals = {
  AURORA_REAL_MILLISECONDS_PER_DAY_MINUTE,
  AURORA_REAL_MILLISECONDS_PER_HOUR_MINUTE
};
