import {
  isContextMenuGesture,
  isCtrlPanGesture
} from "../../../../src/modules/layout/viewportPointerPolicy";

describe("viewportPointerPolicy", () => {
  it("treats plain right-click as object context menu gesture", () => {
    expect(isContextMenuGesture({ button: 2, ctrlKey: false })).toBe(true);
    expect(isCtrlPanGesture({ button: 2, ctrlKey: false })).toBe(false);
  });

  it("treats ctrl+right-click as camera pan gesture", () => {
    expect(isContextMenuGesture({ button: 2, ctrlKey: true })).toBe(false);
    expect(isCtrlPanGesture({ button: 2, ctrlKey: true })).toBe(true);
  });

  it("ignores non-right mouse buttons for both gestures", () => {
    expect(isContextMenuGesture({ button: 0, ctrlKey: false })).toBe(false);
    expect(isCtrlPanGesture({ button: 0, ctrlKey: true })).toBe(false);
    expect(isContextMenuGesture({ button: 1, ctrlKey: false })).toBe(false);
    expect(isCtrlPanGesture({ button: 1, ctrlKey: true })).toBe(false);
  });
});

