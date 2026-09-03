import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { SceneObject, SceneObjectKind } from "../contracts";
import type {
  WorkspaceAnchoredOverlayRuntimePort,
  WorkspaceRuntimeRef
} from "../ports/workspaceRenderRuntimePort";

export interface AnchoredDialogPositionState {
  objectId: string;
  windowX: number;
  windowY: number;
  anchorOffsetX: number;
  anchorOffsetY: number;
}

interface DialogWindowPositionState {
  windowX: number;
  windowY: number;
}

interface AnchoredContextMenuState {
  objectId: string;
  x: number;
  y: number;
  anchorOffsetX: number;
  anchorOffsetY: number;
}

interface ClampWorkspaceDialogPositionArgs {
  hostElement: HTMLElement | null;
  panelElement: HTMLElement | null;
  x: number;
  y: number;
  fallbackWidthPx: number;
  fallbackHeightPx: number;
  marginPx: number;
  panelRect?: DOMRect | null;
}

interface UseDialogEscapeArgs {
  enabled: boolean;
  onEscape: () => void;
}

interface UseAnchoredObjectDialogSyncArgs<
  TDialogState extends AnchoredDialogPositionState,
  TRuntime
> {
  dialog: TDialogState | null;
  setDialog: Dispatch<SetStateAction<TDialogState | null>>;
  runtimeRef: WorkspaceRuntimeRef<TRuntime>;
  anchoredOverlayRuntimePort: WorkspaceAnchoredOverlayRuntimePort<TRuntime>;
  panelRef: { current: HTMLElement | null };
  sceneObjects: SceneObject[];
  visibleObjectIdsSet: ReadonlySet<string>;
  objectKind: SceneObjectKind | readonly SceneObjectKind[];
  fallbackWidthPx: number;
  fallbackHeightPx: number;
  layoutKey?: unknown;
}

interface UseClampedDialogBoundsArgs<TDialogState extends DialogWindowPositionState> {
  dialog: TDialogState | null;
  setDialog: Dispatch<SetStateAction<TDialogState | null>>;
  clampPosition: (x: number, y: number) => { x: number; y: number };
  layoutKey?: unknown;
}

interface UseAnchoredContextMenuSyncArgs<
  TContextMenuState extends AnchoredContextMenuState,
  TRuntime
> {
  contextMenu: TContextMenuState | null;
  setContextMenu: Dispatch<SetStateAction<TContextMenuState | null>>;
  runtimeRef: WorkspaceRuntimeRef<TRuntime>;
  anchoredOverlayRuntimePort: WorkspaceAnchoredOverlayRuntimePort<TRuntime>;
  menuRef: { current: HTMLElement | null };
  sceneObjects: SceneObject[];
  visibleObjectIdsSet: Set<string>;
  fallbackWidthPx: number;
  fallbackHeightPx: number;
  onEscape: () => void;
}

export function clampWorkspaceDialogPosition({
  hostElement,
  panelElement,
  x,
  y,
  fallbackWidthPx,
  fallbackHeightPx,
  marginPx,
  panelRect
}: ClampWorkspaceDialogPositionArgs) {
  const hostRect = hostElement?.getBoundingClientRect();
  if (!hostRect) {
    return { x, y };
  }
  const measuredRect = panelRect ?? panelElement?.getBoundingClientRect() ?? null;
  const panelWidth = measuredRect?.width ?? fallbackWidthPx;
  const panelHeight = measuredRect?.height ?? fallbackHeightPx;
  const maxX = Math.max(marginPx, hostRect.width - panelWidth - marginPx);
  const maxY = Math.max(marginPx, hostRect.height - panelHeight - marginPx);
  return {
    x: Math.min(Math.max(x, marginPx), maxX),
    y: Math.min(Math.max(y, marginPx), maxY)
  };
}

export function useDialogEscape({ enabled, onEscape }: UseDialogEscapeArgs) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onEscape();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [enabled, onEscape]);
}

export function resolveAnchoredDialogTargetObject(input: {
  objectId: string;
  objectKind: SceneObjectKind | readonly SceneObjectKind[];
  sceneObjects: readonly SceneObject[];
  visibleObjectIdsSet: ReadonlySet<string>;
}): SceneObject | null {
  if (!input.visibleObjectIdsSet.has(input.objectId)) {
    return null;
  }
  const targetObject =
    input.sceneObjects.find((object) => object.id === input.objectId) ?? null;
  const acceptsKind = targetObject
    ? typeof input.objectKind === "string"
      ? targetObject.kind === input.objectKind
      : input.objectKind.includes(targetObject.kind)
    : false;
  if (!targetObject || !acceptsKind) {
    return null;
  }
  return targetObject;
}

export function resolveAnchoredDialogDragTargetObject(input: {
  objectId: string;
  sceneObjects: readonly SceneObject[];
  visibleObjectIdsSet: ReadonlySet<string>;
}): SceneObject | null {
  if (!input.visibleObjectIdsSet.has(input.objectId)) {
    return null;
  }
  return input.sceneObjects.find((object) => object.id === input.objectId) ?? null;
}

export function useAnchoredObjectDialogSync<
  TDialogState extends AnchoredDialogPositionState,
  TRuntime
>({
  dialog,
  setDialog,
  runtimeRef,
  anchoredOverlayRuntimePort,
  panelRef,
  sceneObjects,
  visibleObjectIdsSet,
  objectKind,
  fallbackWidthPx,
  fallbackHeightPx,
  layoutKey
}: UseAnchoredObjectDialogSyncArgs<TDialogState, TRuntime>) {
  useEffect(() => {
    if (!dialog) {
      return;
    }

    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    const syncDialogToObject = () => {
      setDialog((current) => {
        if (!current) {
          return current;
        }
        const targetObject = resolveAnchoredDialogTargetObject({
          objectId: current.objectId,
          objectKind,
          sceneObjects,
          visibleObjectIdsSet
        });
        if (!targetObject) {
          return null;
        }
        const panelWidth = panelRef.current?.offsetWidth ?? fallbackWidthPx;
        const panelHeight = panelRef.current?.offsetHeight ?? fallbackHeightPx;
        const anchoredPosition = anchoredOverlayRuntimePort.resolveAnchoredObjectPosition(
          runtime,
          targetObject,
          current.objectId,
          current.anchorOffsetX,
          current.anchorOffsetY,
          panelWidth,
          panelHeight
        );
        if (
          Math.abs(anchoredPosition.x - current.windowX) < 0.5 &&
          Math.abs(anchoredPosition.y - current.windowY) < 0.5
        ) {
          return current;
        }
        return {
          ...current,
          windowX: anchoredPosition.x,
          windowY: anchoredPosition.y
        };
      });
    };

    syncDialogToObject();
    const removeCameraChangeListener = anchoredOverlayRuntimePort.addCameraChangeListener(
      runtime,
      syncDialogToObject
    );
    window.addEventListener("resize", syncDialogToObject);
    return () => {
      removeCameraChangeListener();
      window.removeEventListener("resize", syncDialogToObject);
    };
  }, [
    anchoredOverlayRuntimePort,
    dialog,
    dialog?.anchorOffsetX,
    dialog?.anchorOffsetY,
    dialog?.objectId,
    fallbackHeightPx,
    fallbackWidthPx,
    layoutKey,
    objectKind,
    panelRef,
    runtimeRef,
    sceneObjects,
    setDialog,
    visibleObjectIdsSet
  ]);
}

export function useClampedDialogBounds<TDialogState extends DialogWindowPositionState>({
  dialog,
  setDialog,
  clampPosition,
  layoutKey
}: UseClampedDialogBoundsArgs<TDialogState>) {
  useEffect(() => {
    if (!dialog) {
      return;
    }

    const clampCurrentPosition = () => {
      setDialog((current) => {
        if (!current) {
          return current;
        }
        const clamped = clampPosition(current.windowX, current.windowY);
        if (clamped.x === current.windowX && clamped.y === current.windowY) {
          return current;
        }
        return {
          ...current,
          windowX: clamped.x,
          windowY: clamped.y
        };
      });
    };

    clampCurrentPosition();
    window.addEventListener("resize", clampCurrentPosition);
    return () => window.removeEventListener("resize", clampCurrentPosition);
  }, [
    clampPosition,
    dialog,
    dialog?.windowX,
    dialog?.windowY,
    layoutKey,
    setDialog
  ]);
}

export function useAnchoredContextMenuSync<
  TContextMenuState extends AnchoredContextMenuState,
  TRuntime
>({
  contextMenu,
  setContextMenu,
  runtimeRef,
  anchoredOverlayRuntimePort,
  menuRef,
  sceneObjects,
  visibleObjectIdsSet,
  fallbackWidthPx,
  fallbackHeightPx,
  onEscape
}: UseAnchoredContextMenuSyncArgs<TContextMenuState, TRuntime>) {
  useDialogEscape({
    enabled: contextMenu !== null,
    onEscape
  });

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    const syncContextMenuToObject = () => {
      setContextMenu((current) => {
        if (!current) {
          return current;
        }
        const targetObject =
          sceneObjects.find((object) => object.id === current.objectId) ?? null;
        if (!targetObject || !visibleObjectIdsSet.has(targetObject.id)) {
          return null;
        }
        const menuWidth = menuRef.current?.offsetWidth ?? fallbackWidthPx;
        const menuHeight = menuRef.current?.offsetHeight ?? fallbackHeightPx;
        const anchoredPosition = anchoredOverlayRuntimePort.resolveAnchoredObjectPosition(
          runtime,
          targetObject,
          current.objectId,
          current.anchorOffsetX,
          current.anchorOffsetY,
          menuWidth,
          menuHeight
        );
        if (
          Math.abs(anchoredPosition.x - current.x) < 0.5 &&
          Math.abs(anchoredPosition.y - current.y) < 0.5
        ) {
          return current;
        }
        return {
          ...current,
          x: anchoredPosition.x,
          y: anchoredPosition.y
        };
      });
    };

    syncContextMenuToObject();
    const removeCameraChangeListener = anchoredOverlayRuntimePort.addCameraChangeListener(
      runtime,
      syncContextMenuToObject
    );
    window.addEventListener("resize", syncContextMenuToObject);

    return () => {
      removeCameraChangeListener();
      window.removeEventListener("resize", syncContextMenuToObject);
    };
  }, [
    anchoredOverlayRuntimePort,
    contextMenu,
    fallbackHeightPx,
    fallbackWidthPx,
    menuRef,
    runtimeRef,
    sceneObjects,
    setContextMenu,
    visibleObjectIdsSet
  ]);
}
