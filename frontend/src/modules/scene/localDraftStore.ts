import type { AreaScene } from "./contracts";

const DRAFT_STORAGE_KEY = "aurora-web.local-area-drafts.v1";
const AUTOSAVE_STORAGE_KEY = "aurora-web.local-area-autosaves.v1";

type LocalDraftCollection = Record<string, AreaScene>;
type LocalAutosaveCollection = Record<string, AreaScene[]>;

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

function draftKey(userId: string): string {
  return `user:${userId}`;
}

function safeParseAutosaves(raw: string | null): LocalAutosaveCollection {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as LocalAutosaveCollection;
  } catch {
    return {};
  }
}

export function loadLocalSceneDraft(
  userId: string,
  storage: Storage
): AreaScene | null {
  const collection = safeParseCollection(storage.getItem(DRAFT_STORAGE_KEY));
  const found = collection[draftKey(userId)];
  return found ? cloneScene(found) : null;
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

export function loadLocalSceneAutosaves(
  userId: string,
  storage: Storage
): AreaScene[] {
  const collection = safeParseAutosaves(storage.getItem(AUTOSAVE_STORAGE_KEY));
  const autosaves = collection[draftKey(userId)] ?? [];
  return autosaves.map((entry) => cloneScene(entry));
}

export function saveLocalSceneAutosave(
  userId: string,
  scene: AreaScene,
  storage: Storage,
  maxEntries: number
): AreaScene[] {
  const collection = safeParseAutosaves(storage.getItem(AUTOSAVE_STORAGE_KEY));
  const currentAutosaves = collection[draftKey(userId)] ?? [];
  const nextAutosave: AreaScene = {
    ...cloneScene(scene),
    source: "local_draft",
    updatedAtUnixMs: Date.now()
  };

  const normalizedMax = Math.max(1, Math.floor(maxEntries));
  const nextAutosaves = [nextAutosave, ...currentAutosaves].slice(0, normalizedMax);
  collection[draftKey(userId)] = nextAutosaves;
  storage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(collection));
  return nextAutosaves.map((entry) => cloneScene(entry));
}
