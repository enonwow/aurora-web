import type {
  SceneObject,
  SceneObjectKind,
  SceneObjectSoundPositioning
} from "../../scene/contracts";
import { cloneSceneObject } from "./workspaceSceneObjectClone";

export const OBJECT_ADD_DRAG_MIME = "application/x-aurora-object-template";

const OBJECT_ADD_ALLOWED_KINDS = new Set<SceneObjectKind>([
  "creatures",
  "doors",
  "encounters",
  "items",
  "placeables",
  "sounds",
  "stores",
  "triggers",
  "waypoints"
]);

export interface ObjectAddDragPayload {
  id: string;
  kind: SceneObjectKind;
  tag: string;
  resRef: string;
  name?: string;
  previewImageUrl?: string;
  soundPositioning?: SceneObjectSoundPositioning;
}

let activeObjectAddDragPayload: ObjectAddDragPayload | null = null;
let activeObjectAddDragSourceTemplate: SceneObject | null = null;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isObjectAddKind(value: unknown): value is SceneObjectKind {
  return typeof value === "string" && OBJECT_ADD_ALLOWED_KINDS.has(value as SceneObjectKind);
}

export function serializeObjectAddPayload(payload: ObjectAddDragPayload): string {
  return JSON.stringify(payload);
}

function cloneSoundPositioning(
  value: SceneObjectSoundPositioning | undefined
): SceneObjectSoundPositioning | undefined {
  return value ? JSON.parse(JSON.stringify(value)) as SceneObjectSoundPositioning : undefined;
}

export function createObjectAddPayloadFromSceneObject(
  object: SceneObject
): ObjectAddDragPayload {
  const soundPositioning =
    object.kind === "sounds" ? cloneSoundPositioning(object.soundPositioning) : undefined;
  return {
    id: object.id,
    kind: object.kind,
    tag: object.tag,
    resRef: object.resRef,
    name: object.name,
    previewImageUrl: object.previewImageUrl,
    ...(soundPositioning ? { soundPositioning } : {})
  };
}

export function setCurrentObjectAddDragPayload(payload: ObjectAddDragPayload | null): void {
  activeObjectAddDragPayload = payload
    ? { ...payload, soundPositioning: cloneSoundPositioning(payload.soundPositioning) }
    : null;
  if (!payload) {
    activeObjectAddDragSourceTemplate = null;
  }
}

export function getCurrentObjectAddDragPayload(): ObjectAddDragPayload | null {
  return activeObjectAddDragPayload
    ? {
        ...activeObjectAddDragPayload,
        soundPositioning: cloneSoundPositioning(activeObjectAddDragPayload.soundPositioning)
      }
    : null;
}

export function setCurrentObjectAddDragSourceTemplate(template: SceneObject | null): void {
  activeObjectAddDragSourceTemplate = template ? cloneSceneObject(template) : null;
}

export function getCurrentObjectAddDragSourceTemplate(): SceneObject | null {
  return activeObjectAddDragSourceTemplate
    ? cloneSceneObject(activeObjectAddDragSourceTemplate)
    : null;
}

export function tryParseObjectAddPayload(raw: string | null | undefined): ObjectAddDragPayload | null {
  if (typeof raw !== "string" || raw.length === 0) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const candidate = parsed as Record<string, unknown>;
  if (!isNonEmptyString(candidate.id)) {
    return null;
  }
  if (!isObjectAddKind(candidate.kind)) {
    return null;
  }
  if (!isNonEmptyString(candidate.tag)) {
    return null;
  }
  if (!isNonEmptyString(candidate.resRef)) {
    return null;
  }
  if (candidate.name !== undefined && !isNonEmptyString(candidate.name)) {
    return null;
  }
  if (candidate.previewImageUrl !== undefined && !isNonEmptyString(candidate.previewImageUrl)) {
    return null;
  }

  const soundPositioning =
    candidate.kind === "sounds" &&
    candidate.soundPositioning !== undefined &&
    typeof candidate.soundPositioning === "object" &&
    candidate.soundPositioning !== null
      ? cloneSoundPositioning(candidate.soundPositioning as SceneObjectSoundPositioning)
      : undefined;

  return {
    id: candidate.id,
    kind: candidate.kind,
    tag: candidate.tag,
    resRef: candidate.resRef,
    ...(candidate.name !== undefined ? { name: candidate.name } : {}),
    ...(candidate.previewImageUrl !== undefined
      ? { previewImageUrl: candidate.previewImageUrl }
      : {}),
    ...(soundPositioning ? { soundPositioning } : {})
  };
}
