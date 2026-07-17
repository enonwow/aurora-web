import type { AreaScene } from "../contracts";

export interface SceneDraftPort {
  loadByUserId(userId: string): AreaScene | null;
  saveByUserId(userId: string, scene: AreaScene): void;
}

