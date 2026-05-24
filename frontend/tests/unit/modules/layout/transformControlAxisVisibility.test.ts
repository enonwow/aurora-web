import { describe, expect, it } from "vitest";
import { resolveTransformControlAxisVisibility } from "../../../../src/modules/layout/transformControlAxisVisibility";

describe("transformControlAxisVisibility", () => {
  it("keeps all translate axes visible, including vertical handle", () => {
    expect(resolveTransformControlAxisVisibility("translate")).toEqual({
      showX: true,
      showY: true,
      showZ: true
    });
  });

  it("keeps only Y rotation handle visible in rotate mode", () => {
    expect(resolveTransformControlAxisVisibility("rotate")).toEqual({
      showX: false,
      showY: true,
      showZ: false
    });
  });

  it("hides all handles in unsupported scale mode path", () => {
    expect(resolveTransformControlAxisVisibility("scale")).toEqual({
      showX: false,
      showY: false,
      showZ: false
    });
  });
});
