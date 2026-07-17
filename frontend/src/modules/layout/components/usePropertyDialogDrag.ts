import { useCallback } from "react";
import type {
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
  PointerEventHandler,
  RefObject
} from "react";

export interface PropertyDialogDragState {
  active: boolean;
  pointerId: number | null;
  offsetX: number;
  offsetY: number;
}

export interface PropertyDialogPosition {
  windowX: number;
  windowY: number;
}

interface UsePropertyDialogDragOptions<TDialog extends PropertyDialogPosition | null> {
  dialog: TDialog;
  setDialog: (updater: (current: TDialog) => TDialog) => void;
  hostRef: RefObject<HTMLElement | null>;
  panelRef: RefObject<HTMLElement | null>;
  dragRef: MutableRefObject<PropertyDialogDragState>;
  clampPosition: (x: number, y: number, panelRect?: DOMRect | null) => { x: number; y: number };
  shouldIgnoreTarget?: (target: HTMLElement | null) => boolean;
  mapPosition?: (
    current: NonNullable<TDialog>,
    nextPosition: { x: number; y: number }
  ) => NonNullable<TDialog>;
}

export const DEFAULT_PROPERTY_DIALOG_DRAG_STATE: PropertyDialogDragState = {
  active: false,
  pointerId: null,
  offsetX: 0,
  offsetY: 0
};

export function usePropertyDialogDrag<TDialog extends PropertyDialogPosition | null>({
  dialog,
  setDialog,
  hostRef,
  panelRef,
  dragRef,
  clampPosition,
  shouldIgnoreTarget,
  mapPosition
}: UsePropertyDialogDragOptions<TDialog>): {
  onHeaderPointerDown: PointerEventHandler<HTMLElement>;
  onHeaderPointerMove: PointerEventHandler<HTMLElement>;
  onHeaderPointerUp: PointerEventHandler<HTMLElement>;
  onHeaderPointerCancel: PointerEventHandler<HTMLElement>;
} {
  const onHeaderPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0 || !dialog) {
        return;
      }
      const targetElement = event.target as HTMLElement | null;
      const ignoreTarget = shouldIgnoreTarget
        ? shouldIgnoreTarget(targetElement)
        : Boolean(targetElement?.closest("button"));
      if (ignoreTarget) {
        return;
      }
      const hostRect = hostRef.current?.getBoundingClientRect();
      const panelRect = panelRef.current?.getBoundingClientRect();
      if (!hostRect) {
        return;
      }

      const resolvedX = panelRect ? panelRect.left - hostRect.left : dialog.windowX;
      const resolvedY = panelRect ? panelRect.top - hostRect.top : dialog.windowY;

      dragRef.current = {
        active: true,
        pointerId: event.pointerId,
        offsetX: event.clientX - (hostRect.left + resolvedX),
        offsetY: event.clientY - (hostRect.top + resolvedY)
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [dialog, dragRef, hostRef, panelRef, shouldIgnoreTarget]
  );

  const onHeaderPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag.active || drag.pointerId !== event.pointerId) {
        return;
      }
      const hostRect = hostRef.current?.getBoundingClientRect();
      if (!hostRect) {
        return;
      }
      const desiredX = event.clientX - hostRect.left - drag.offsetX;
      const desiredY = event.clientY - hostRect.top - drag.offsetY;
      const nextPosition = clampPosition(desiredX, desiredY);
      setDialog((current) => {
        if (!current) {
          return current;
        }
        const withPosition = mapPosition
          ? mapPosition(current as NonNullable<TDialog>, nextPosition)
          : ({
              ...(current as NonNullable<TDialog>),
              windowX: nextPosition.x,
              windowY: nextPosition.y
            } as NonNullable<TDialog>);
        return withPosition as TDialog;
      });
      event.preventDefault();
    },
    [clampPosition, dragRef, hostRef, mapPosition, setDialog]
  );

  const resetDragState = useCallback(() => {
    dragRef.current = { ...DEFAULT_PROPERTY_DIALOG_DRAG_STATE };
  }, [dragRef]);

  const onHeaderPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag.active || drag.pointerId !== event.pointerId) {
        return;
      }
      resetDragState();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [dragRef, resetDragState]
  );

  const onHeaderPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag.active || drag.pointerId !== event.pointerId) {
        return;
      }
      resetDragState();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [dragRef, resetDragState]
  );

  return {
    onHeaderPointerDown,
    onHeaderPointerMove,
    onHeaderPointerUp,
    onHeaderPointerCancel
  };
}
