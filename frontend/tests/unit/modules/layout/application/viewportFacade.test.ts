import { describe, expect, it } from "vitest";
import { createViewportFacade } from "../../../../../src/modules/layout/application/viewportFacade";

describe("viewportFacade", () => {
  it("keeps gesture policy semantics", () => {
    const facade = createViewportFacade();

    expect(facade.isContextMenuGesture({ button: 2, ctrlKey: false })).toBe(true);
    expect(facade.isCtrlPanGesture({ button: 2, ctrlKey: true })).toBe(true);
    expect(facade.isContextMenuGesture({ button: 0, ctrlKey: false })).toBe(false);
  });

  it("builds grid segments with Aurora master-cell baseline", () => {
    const facade = createViewportFacade();
    const segments = facade.buildGridSegments(
      2,
      2,
      facade.defaultMasterCellsPerTile
    );

    expect(facade.defaultMasterCellsPerTile).toBe(10);
    expect(segments.length).toBe(42);
    expect(segments.some((segment) => segment.kind === "major")).toBe(true);
    expect(segments.some((segment) => segment.kind === "minor")).toBe(true);
  });
});

