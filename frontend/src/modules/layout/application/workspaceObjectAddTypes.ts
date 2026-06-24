import type { ObjectAddDragPayload } from "./objectAddDragPayload";

export interface CanvasObjectAddPreviewState {
  payload: ObjectAddDragPayload;
  placementX: number;
  placementY: number;
  screenX: number;
  screenY: number;
}

export interface ObjectAddPlacementCacheState {
  payloadKey: string;
  placementX: number;
  placementY: number;
  tileId: string | null;
  updatedAtUnixMs: number;
}

export interface ObjectAddDropFeedbackState {
  message: string;
  variant: "warning" | "success";
}
