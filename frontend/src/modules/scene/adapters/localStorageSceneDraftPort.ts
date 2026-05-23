import type { AreaScene } from "../contracts";
import {
  loadLocalSceneDraft,
  saveLocalSceneDraft
} from "../localDraftStore";
import type { SceneDraftPort } from "../ports/sceneDraftPort";

class NullSceneDraftPort implements SceneDraftPort {
  loadByUserId(): AreaScene | null {
    return null;
  }

  saveByUserId(): void {
    // no-op
  }
}

class LocalStorageSceneDraftPort implements SceneDraftPort {
  constructor(private readonly storage: Storage) {}

  loadByUserId(userId: string): AreaScene | null {
    return loadLocalSceneDraft(userId, this.storage);
  }

  saveByUserId(userId: string, scene: AreaScene): void {
    saveLocalSceneDraft(userId, scene, this.storage);
  }
}

export function createLocalStorageSceneDraftPort(storage: Storage | null): SceneDraftPort {
  if (!storage) {
    return new NullSceneDraftPort();
  }
  return new LocalStorageSceneDraftPort(storage);
}

