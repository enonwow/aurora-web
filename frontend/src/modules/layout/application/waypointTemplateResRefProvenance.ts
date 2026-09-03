import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  canEditExistingWaypointTemplateResRef,
  isWaypointTemplateResRef,
  WAYPOINT_TEMPLATE_RESREF_MAX_CODE_UNITS,
} from "../../scene/domain/waypointTemplateResRef";

export {
  canEditExistingWaypointTemplateResRef,
  WAYPOINT_TEMPLATE_RESREF_MAX_CODE_UNITS,
};

export function reduceExistingWaypointTemplateResRef(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: string,
  candidateValue: unknown,
): string {
  return canEditExistingWaypointTemplateResRef(source) &&
    isWaypointTemplateResRef(candidateValue)
    ? candidateValue
    : currentValue;
}

export function materializeExistingWaypointTemplateResRef(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: string,
  draftValue: unknown,
): string {
  return reduceExistingWaypointTemplateResRef(source, currentValue, draftValue);
}
