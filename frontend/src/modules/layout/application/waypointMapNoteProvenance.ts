import type {
  SceneObjectSourceMetadata,
  SceneObjectWaypointMapNoteValue,
} from "../../scene/contracts";
import {
  canEditExistingWaypointMapNote as canEditExactWaypointMapNote,
  cloneWaypointMapNoteValue,
  readExistingWaypointMapNoteSourceValue,
  readWaypointMapNoteValue,
} from "../../scene/domain/waypointMapNote";

export function readExistingWaypointMapNote(
  source: SceneObjectSourceMetadata | undefined,
): SceneObjectWaypointMapNoteValue | undefined {
  return readExistingWaypointMapNoteSourceValue(source);
}

export function canEditExistingWaypointMapNote(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return canEditExactWaypointMapNote(source);
}

export function reduceExistingWaypointMapNote(
  source: SceneObjectSourceMetadata | undefined,
  current: SceneObjectWaypointMapNoteValue,
  candidate: unknown,
): SceneObjectWaypointMapNoteValue {
  const value = readWaypointMapNoteValue(candidate);
  return canEditExistingWaypointMapNote(source) && value
    ? cloneWaypointMapNoteValue(value)
    : current;
}

export function materializeExistingWaypointMapNote(
  source: SceneObjectSourceMetadata | undefined,
  current: SceneObjectWaypointMapNoteValue | undefined,
  candidate: unknown,
): SceneObjectWaypointMapNoteValue | undefined {
  const value = readWaypointMapNoteValue(candidate);
  return canEditExistingWaypointMapNote(source) && value
    ? cloneWaypointMapNoteValue(value)
    : current;
}
