import { hasExactRecordKeys, isPlainRecord } from "./auroraObjectTag";
import type { SceneObjectSourceMetadata } from "../contracts";

export const WAYPOINT_TEMPLATE_RESREF_MAX_CODE_UNITS = 16;

export type WaypointTemplateResRefStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "resref"; value: string }>;

export function isWaypointTemplateResRef(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9_]{1,16}$/u.test(value);
}

export function readWaypointTemplateResRefStorage(
  input: unknown,
): WaypointTemplateResRefStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactRecordKeys(input, ["present", "nativeType", "value"]) &&
    input.present === true &&
    input.nativeType === "resref" &&
    isWaypointTemplateResRef(input.value)
  ) {
    return Object.freeze({
      present: true,
      nativeType: "resref",
      value: input.value,
    });
  }
  return null;
}

export function canEditExistingWaypointTemplateResRef(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  const storage = readWaypointTemplateResRefStorage(source?.waypointTemplateResRef);
  return source?.type === "aurora_git" &&
    source.sourceKind === "waypoint" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0 &&
    storage?.present === true;
}
