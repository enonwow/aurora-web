import type { SceneObjectKind } from "../contracts";

export const OBJECT_ADD_DRAG_MIME = "application/x-aurora-object-template";

const OBJECT_ADD_ALLOWED_KINDS = new Set<SceneObjectKind>([
  "creatures",
  "doors",
  "items",
  "placeables",
  "sounds"
]);

export interface ObjectAddDragPayload {
  id: string;
  kind: SceneObjectKind;
  tag: string;
  resRef: string;
  name?: string;
}

let activeObjectAddDragPayload: ObjectAddDragPayload | null = null;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isObjectAddKind(value: unknown): value is SceneObjectKind {
  return typeof value === "string" && OBJECT_ADD_ALLOWED_KINDS.has(value as SceneObjectKind);
}

export function serializeObjectAddPayload(payload: ObjectAddDragPayload): string {
  return JSON.stringify(payload);
}

export function setCurrentObjectAddDragPayload(payload: ObjectAddDragPayload | null): void {
  activeObjectAddDragPayload = payload ? { ...payload } : null;
}

export function getCurrentObjectAddDragPayload(): ObjectAddDragPayload | null {
  return activeObjectAddDragPayload ? { ...activeObjectAddDragPayload } : null;
}

export function tryParseObjectAddPayload(
  raw: string | null | undefined
): ObjectAddDragPayload | null {
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

  return {
    id: candidate.id,
    kind: candidate.kind,
    tag: candidate.tag,
    resRef: candidate.resRef,
    ...(candidate.name !== undefined ? { name: candidate.name } : {})
  };
}
