import { describe, expect, it } from "vitest";
import {
  cloneItemVisualTransformStorage,
  itemVisualTransformStorageEqual,
  readItemVisualTransformStorage,
  sceneVisualTransformToItemStorage,
} from "../../../../../src/modules/scene/domain/itemVisualTransform";

const PRESENT = {
  present: true,
  value: {
    scaleX: 0.5,
    scaleY: 0.75,
    scaleZ: 1.25,
    rotateX: -15,
    rotateY: 30,
    rotateZ: 90,
    translateX: 20,
    translateY: -30,
    translateZ: 40,
  },
} as const;

describe("retained ground-item static visual transform", () => {
  it("reads and detaches exact absent and present storage", () => {
    expect(readItemVisualTransformStorage({ present: false })).toEqual({ present: false });
    const parsed = readItemVisualTransformStorage(PRESENT);
    const cloned = cloneItemVisualTransformStorage(parsed!);

    expect(parsed).toStrictEqual(PRESENT);
    expect(cloned).toStrictEqual(PRESENT);
    expect(cloned).not.toBe(parsed);
    if (cloned.present && parsed?.present) {
      expect(cloned.value).not.toBe(parsed.value);
    }
  });

  it.each([
    ["absent value", { present: false, value: PRESENT.value }],
    ["default present vector", {
      present: true,
      value: {
        scaleX: 1, scaleY: 1, scaleZ: 1,
        rotateX: 0, rotateY: 0, rotateZ: 0,
        translateX: 0, translateY: 0, translateZ: 0,
      },
    }],
    ["non-binary32", {
      ...PRESENT,
      value: { ...PRESENT.value, scaleX: 0.1 },
    }],
    ["unsafe scale", {
      ...PRESENT,
      value: { ...PRESENT.value, scaleX: 0.001 },
    }],
    ["unsafe rotation", {
      ...PRESENT,
      value: { ...PRESENT.value, rotateZ: 360_001 },
    }],
    ["unsafe translation", {
      ...PRESENT,
      value: { ...PRESENT.value, translateX: 1_000_001 },
    }],
    ["extra member", { ...PRESENT, alias: true }],
  ])("rejects %s", (_label, input) => {
    expect(readItemVisualTransformStorage(input)).toBeNull();
  });

  it("converts scene axes, radians, and tile offsets into exact native binary32 storage", () => {
    expect(sceneVisualTransformToItemStorage({
      scale: 9,
      scaleX: 0.5,
      scaleY: 0.75,
      scaleZ: 1.25,
      offsetX: 2,
      offsetY: -3,
      offsetZ: 4,
      pitch: -Math.PI / 12,
      roll: Math.PI / 6,
      yaw: Math.PI / 2,
    })).toStrictEqual(PRESENT);
  });

  it("uses uniform scene scale fallbacks and removes the native list for the default vector", () => {
    expect(sceneVisualTransformToItemStorage({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0,
    })).toStrictEqual({ present: false });
  });

  it("compares complete presence-sensitive storage without epsilon coercion", () => {
    expect(itemVisualTransformStorageEqual(PRESENT, cloneItemVisualTransformStorage(PRESENT)))
      .toBe(true);
    expect(itemVisualTransformStorageEqual(PRESENT, {
      ...PRESENT,
      value: { ...PRESENT.value, translateZ: 41 },
    })).toBe(false);
    expect(itemVisualTransformStorageEqual(PRESENT, { present: false })).toBe(false);
  });
});
