export type TerrainBrushKind =
  | "corridor"
  | "doorway"
  | "inn"
  | "kitchen"
  | "livingroom"
  | "shop"
  | "wall";

export type SceneObjectKind =
  | "creatures"
  | "doors"
  | "items"
  | "placeables"
  | "sounds";

export interface SceneTile {
  id: string;
  row: number;
  col: number;
  terrain: TerrainBrushKind;
  orientation: 0 | 1 | 2 | 3;
  rotateTexture: boolean;
  plot: boolean;
}

export interface SceneObjectVisualTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  pitch: number;
  roll: number;
  yaw: number;
}

export interface SceneObject {
  id: string;
  kind: SceneObjectKind;
  resRef: string;
  tag: string;
  x: number;
  y: number;
  bearing: number;
  visualTransform: SceneObjectVisualTransform;
}

export interface AreaScene {
  sceneId: string;
  areaName: string;
  width: number;
  height: number;
  tiles: SceneTile[];
  objects: SceneObject[];
  updatedAtUnixMs: number;
  source: "seed" | "local_draft";
}

export interface SceneHistoryState {
  past: AreaScene[];
  present: AreaScene;
  future: AreaScene[];
}
