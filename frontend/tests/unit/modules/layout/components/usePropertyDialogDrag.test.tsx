import { act, renderHook } from "@testing-library/react";
import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  DEFAULT_PROPERTY_DIALOG_DRAG_STATE,
  type PropertyDialogDragState,
  usePropertyDialogDrag
} from "../../../../../src/modules/layout/components/usePropertyDialogDrag";

interface TestDialogState {
  windowX: number;
  windowY: number;
  anchorOffsetX: number;
  anchorOffsetY: number;
}

interface PointerTargetStub {
  closest: ReturnType<typeof vi.fn>;
}

interface PointerCurrentTargetStub {
  setPointerCapture: ReturnType<typeof vi.fn>;
  hasPointerCapture: ReturnType<typeof vi.fn>;
  releasePointerCapture: ReturnType<typeof vi.fn>;
}

function createPointerCurrentTargetStub(): PointerCurrentTargetStub {
  return {
    setPointerCapture: vi.fn(),
    hasPointerCapture: vi.fn(() => true),
    releasePointerCapture: vi.fn()
  };
}

function createPointerTargetStub(closestResult: unknown = null): PointerTargetStub {
  return {
    closest: vi.fn(() => closestResult)
  };
}

function createPointerEvent(
  overrides: Partial<ReactPointerEvent<HTMLElement>> & {
    currentTarget: PointerCurrentTargetStub;
    target: PointerTargetStub;
    pointerId: number;
    clientX: number;
    clientY: number;
  }
): ReactPointerEvent<HTMLElement> {
  return {
    button: 0,
    preventDefault: vi.fn(),
    ...overrides
  } as unknown as ReactPointerEvent<HTMLElement>;
}

describe("usePropertyDialogDrag", () => {
  it("moves dialog with clamped pointer drag and releases pointer on end", () => {
    const hostElement = document.createElement("div");
    const panelElement = document.createElement("div");
    hostElement.getBoundingClientRect = vi.fn(
      () => new DOMRect(100, 50, 1200, 800)
    ) as typeof hostElement.getBoundingClientRect;
    panelElement.getBoundingClientRect = vi.fn(
      () => new DOMRect(130, 90, 400, 300)
    ) as typeof panelElement.getBoundingClientRect;

    const dragRef: { current: PropertyDialogDragState } = {
      current: { ...DEFAULT_PROPERTY_DIALOG_DRAG_STATE }
    };

    const { result } = renderHook(() => {
      const [dialog, setDialog] = useState<TestDialogState | null>({
        windowX: 30,
        windowY: 40,
        anchorOffsetX: 0,
        anchorOffsetY: 0
      });
      const hostRef = useRef<HTMLElement | null>(hostElement);
      const panelRef = useRef<HTMLElement | null>(panelElement);
      const handlers = usePropertyDialogDrag({
        dialog,
        setDialog,
        hostRef,
        panelRef,
        dragRef,
        clampPosition: (x, y) => ({ x: Math.max(0, x), y: Math.max(0, y) })
      });
      return { dialog, handlers };
    });

    const currentTarget = createPointerCurrentTargetStub();
    const startEvent = createPointerEvent({
      currentTarget,
      target: createPointerTargetStub(),
      pointerId: 41,
      clientX: 150,
      clientY: 120
    });

    act(() => {
      result.current.handlers.onHeaderPointerDown(startEvent);
    });

    expect(currentTarget.setPointerCapture).toHaveBeenCalledWith(41);

    const moveEvent = createPointerEvent({
      currentTarget,
      target: createPointerTargetStub(),
      pointerId: 41,
      clientX: 260,
      clientY: 230
    });

    act(() => {
      result.current.handlers.onHeaderPointerMove(moveEvent);
    });

    expect(result.current.dialog).toMatchObject({
      windowX: 140,
      windowY: 150
    });

    const endEvent = createPointerEvent({
      currentTarget,
      target: createPointerTargetStub(),
      pointerId: 41,
      clientX: 260,
      clientY: 230
    });

    act(() => {
      result.current.handlers.onHeaderPointerUp(endEvent);
    });

    expect(currentTarget.hasPointerCapture).toHaveBeenCalledWith(41);
    expect(currentTarget.releasePointerCapture).toHaveBeenCalledWith(41);
    expect(dragRef.current).toEqual(DEFAULT_PROPERTY_DIALOG_DRAG_STATE);
  });

  it("ignores drag start from button target and right-click", () => {
    const hostElement = document.createElement("div");
    const panelElement = document.createElement("div");
    hostElement.getBoundingClientRect = vi.fn(
      () => new DOMRect(0, 0, 1200, 800)
    ) as typeof hostElement.getBoundingClientRect;
    panelElement.getBoundingClientRect = vi.fn(
      () => new DOMRect(10, 10, 200, 100)
    ) as typeof panelElement.getBoundingClientRect;

    const dragRef: { current: PropertyDialogDragState } = {
      current: { ...DEFAULT_PROPERTY_DIALOG_DRAG_STATE }
    };

    const { result } = renderHook(() => {
      const [dialog, setDialog] = useState<TestDialogState | null>({
        windowX: 10,
        windowY: 10,
        anchorOffsetX: 0,
        anchorOffsetY: 0
      });
      const hostRef = useRef<HTMLElement | null>(hostElement);
      const panelRef = useRef<HTMLElement | null>(panelElement);
      const handlers = usePropertyDialogDrag({
        dialog,
        setDialog,
        hostRef,
        panelRef,
        dragRef,
        clampPosition: (x, y) => ({ x, y })
      });
      return { handlers };
    });

    const currentTarget = createPointerCurrentTargetStub();
    const buttonTargetEvent = createPointerEvent({
      currentTarget,
      target: createPointerTargetStub({ tagName: "BUTTON" }),
      pointerId: 7,
      clientX: 20,
      clientY: 20
    });

    act(() => {
      result.current.handlers.onHeaderPointerDown(buttonTargetEvent);
    });

    expect(currentTarget.setPointerCapture).not.toHaveBeenCalled();
    expect(dragRef.current.active).toBe(false);

    const rightClickEvent = createPointerEvent({
      button: 2,
      currentTarget,
      target: createPointerTargetStub(),
      pointerId: 8,
      clientX: 20,
      clientY: 20
    });

    act(() => {
      result.current.handlers.onHeaderPointerDown(rightClickEvent);
    });

    expect(currentTarget.setPointerCapture).not.toHaveBeenCalled();
    expect(dragRef.current.active).toBe(false);
  });

  it("applies mapPosition callback for anchored dialogs", () => {
    const hostElement = document.createElement("div");
    const panelElement = document.createElement("div");
    hostElement.getBoundingClientRect = vi.fn(
      () => new DOMRect(0, 0, 1200, 800)
    ) as typeof hostElement.getBoundingClientRect;
    panelElement.getBoundingClientRect = vi.fn(
      () => new DOMRect(100, 100, 250, 180)
    ) as typeof panelElement.getBoundingClientRect;

    const dragRef: { current: PropertyDialogDragState } = {
      current: { ...DEFAULT_PROPERTY_DIALOG_DRAG_STATE }
    };

    const { result } = renderHook(() => {
      const [dialog, setDialog] = useState<TestDialogState | null>({
        windowX: 100,
        windowY: 100,
        anchorOffsetX: 3,
        anchorOffsetY: 6
      });
      const hostRef = useRef<HTMLElement | null>(hostElement);
      const panelRef = useRef<HTMLElement | null>(panelElement);
      const handlers = usePropertyDialogDrag({
        dialog,
        setDialog,
        hostRef,
        panelRef,
        dragRef,
        clampPosition: (x, y) => ({ x, y }),
        mapPosition: (current, nextPosition) => ({
          ...current,
          windowX: nextPosition.x,
          windowY: nextPosition.y,
          anchorOffsetX: current.anchorOffsetX + 10,
          anchorOffsetY: current.anchorOffsetY + 20
        })
      });
      return { dialog, handlers };
    });

    const currentTarget = createPointerCurrentTargetStub();
    const startEvent = createPointerEvent({
      currentTarget,
      target: createPointerTargetStub(),
      pointerId: 99,
      clientX: 160,
      clientY: 170
    });
    const moveEvent = createPointerEvent({
      currentTarget,
      target: createPointerTargetStub(),
      pointerId: 99,
      clientX: 220,
      clientY: 240
    });

    act(() => {
      result.current.handlers.onHeaderPointerDown(startEvent);
      result.current.handlers.onHeaderPointerMove(moveEvent);
    });

    expect(result.current.dialog).toMatchObject({
      windowX: 160,
      windowY: 170,
      anchorOffsetX: 13,
      anchorOffsetY: 26
    });
  });
});
