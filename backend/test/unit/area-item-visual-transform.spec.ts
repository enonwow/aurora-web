import {
  AREA_ITEM_VISUAL_TRANSFORM_DEFAULT_VALUE,
  AreaItemVisualTransformValidationError,
  areaItemVisualTransformStorageEqual,
  parseAreaItemVisualTransformMutation,
  parseAreaItemVisualTransformStorage,
} from "../../src/modules/areas/domain/area-item-visual-transform";

const VALUE = Object.freeze({
  scaleX: Math.fround(0.5),
  scaleY: Math.fround(0.75),
  scaleZ: Math.fround(1.25),
  rotateX: Math.fround(-15),
  rotateY: Math.fround(30),
  rotateZ: Math.fround(90),
  translateX: Math.fround(20),
  translateY: Math.fround(-30),
  translateZ: Math.fround(40),
});

describe("ground-Item static visual-transform contract", () => {
  it("admits exact physical absence", () => {
    expect(parseAreaItemVisualTransformStorage(
      { present: false },
      "source",
    )).toEqual({ present: false });
  });

  it("admits one exact non-default binary32 vector", () => {
    expect(parseAreaItemVisualTransformStorage(
      { present: true, value: VALUE },
      "source",
    )).toEqual({ present: true, value: VALUE });
  });

  it("freezes the complete parsed storage graph", () => {
    const parsed = parseAreaItemVisualTransformStorage(
      { present: true, value: VALUE },
      "source",
    );
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(parsed.present && Object.isFrozen(parsed.value)).toBe(true);
  });

  it.each([
    ["extra absence key", { present: false, value: VALUE }],
    ["missing present", { value: VALUE }],
    ["extra vector key", { present: true, value: { ...VALUE, scale: 1 } }],
    ["missing vector key", {
      present: true,
      value: (({ translateZ: _removed, ...rest }) => rest)(VALUE),
    }],
    ["non-binary32", { present: true, value: { ...VALUE, scaleX: 0.1 } }],
    ["scale below product floor", {
      present: true,
      value: { ...VALUE, scaleX: Math.fround(0.001) },
    }],
    ["unsafe rotation", {
      present: true,
      value: { ...VALUE, rotateZ: Math.fround(360001) },
    }],
    ["unsafe translation", {
      present: true,
      value: { ...VALUE, translateX: Math.fround(1000001) },
    }],
    ["physically present default vector", {
      present: true,
      value: AREA_ITEM_VISUAL_TRANSFORM_DEFAULT_VALUE,
    }],
  ])("rejects %s", (_label, input) => {
    expect(() => parseAreaItemVisualTransformStorage(input, "source"))
      .toThrow(AreaItemVisualTransformValidationError);
  });

  it("admits changed absence-to-present compare-and-swap", () => {
    expect(parseAreaItemVisualTransformMutation({
      expectedValue: { present: false },
      value: { present: true, value: VALUE },
    }, "mutation")).toEqual({
      expectedValue: { present: false },
      value: { present: true, value: VALUE },
    });
  });

  it("admits changed present-to-absence compare-and-swap", () => {
    expect(parseAreaItemVisualTransformMutation({
      expectedValue: { present: true, value: VALUE },
      value: { present: false },
    }, "mutation")).toEqual({
      expectedValue: { present: true, value: VALUE },
      value: { present: false },
    });
  });

  it("rejects unchanged compare-and-swap", () => {
    expect(() => parseAreaItemVisualTransformMutation({
      expectedValue: { present: true, value: VALUE },
      value: { present: true, value: VALUE },
    }, "mutation")).toThrow("must change");
  });

  it("compares presence and every native component exactly", () => {
    expect(areaItemVisualTransformStorageEqual(
      { present: true, value: VALUE },
      { present: true, value: { ...VALUE } },
    )).toBe(true);
    expect(areaItemVisualTransformStorageEqual(
      { present: false },
      { present: true, value: VALUE },
    )).toBe(false);
    expect(areaItemVisualTransformStorageEqual(
      { present: true, value: VALUE },
      { present: true, value: { ...VALUE, rotateY: Math.fround(31) } },
    )).toBe(false);
  });
});
