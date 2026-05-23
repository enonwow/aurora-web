import type { AreaScene } from "./contracts";

const DRAFT_STORAGE_KEY = "aurora-web.local-area-drafts.v1";

type LocalDraftCollection = Record<string, AreaScene>;

function safeParseCollection(
  raw: string | null
): LocalDraftCollection {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as LocalDraftCollection;
  } catch {
    return {};
  }
}

function cloneScene(scene: AreaScene): AreaScene {
  return JSON.parse(JSON.stringify(scene)) as AreaScene;
}

function isAreaSceneLike(value: unknown): value is AreaScene {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Partial<AreaScene>;
  return (
    typeof candidate.sceneId === "string" &&
    typeof candidate.areaName === "string" &&
    typeof candidate.width === "number" &&
    typeof candidate.height === "number" &&
    typeof candidate.updatedAtUnixMs === "number" &&
    (candidate.source === "seed" || candidate.source === "local_draft") &&
    Array.isArray(candidate.tiles) &&
    Array.isArray(candidate.objects)
  );
}

function draftKey(userId: string): string {
  return `user:${userId}`;
}

export function loadLocalSceneDraft(
  userId: string,
  storage: Storage
): AreaScene | null {
  const collection = safeParseCollection(storage.getItem(DRAFT_STORAGE_KEY));
  const found = collection[draftKey(userId)];
  if (!isAreaSceneLike(found)) {
    return null;
  }
  return cloneScene(found);
}

export function saveLocalSceneDraft(
  userId: string,
  scene: AreaScene,
  storage: Storage
): void {
  const collection = safeParseCollection(storage.getItem(DRAFT_STORAGE_KEY));
  collection[draftKey(userId)] = {
    ...cloneScene(scene),
    source: "local_draft",
    updatedAtUnixMs: Date.now()
  };
  storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(collection));
}

export function clearLocalSceneDraft(
  userId: string,
  storage: Storage
): void {
  const collection = safeParseCollection(storage.getItem(DRAFT_STORAGE_KEY));
  delete collection[draftKey(userId)];
  storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(collection));
}
