import { describe, expect, it } from "vitest";
import {
  getCurrentObjectAddDragPayload,
  OBJECT_ADD_DRAG_MIME,
  serializeObjectAddPayload,
  setCurrentObjectAddDragPayload,
  tryParseObjectAddPayload,
  type ObjectAddDragPayload
} from "../../../../src/modules/layout/components/objectAddDragPayload";

describe("objectAddDragPayload", () => {
  it("exports stable drag MIME and roundtrips valid payload", () => {
    expect(OBJECT_ADD_DRAG_MIME).toBe("application/x-aurora-object-template");

    const payload: ObjectAddDragPayload = {
      id: "obj_001",
      kind: "placeables",
      tag: "barrel_a",
      resRef: "plc_barrel01",
      name: "Barrel"
    };

    const serialized = serializeObjectAddPayload(payload);
    expect(serialized).toContain("\"kind\":\"placeables\"");
    expect(tryParseObjectAddPayload(serialized)).toEqual(payload);
  });

  it("accepts payload without optional name", () => {
    const serialized = JSON.stringify({
      id: "obj_002",
      kind: "creatures",
      tag: "wolf_a",
      resRef: "cre_wolf01"
    });

    expect(tryParseObjectAddPayload(serialized)).toEqual({
      id: "obj_002",
      kind: "creatures",
      tag: "wolf_a",
      resRef: "cre_wolf01"
    });
  });

  it("returns null for nullish/invalid JSON/non-object input", () => {
    expect(tryParseObjectAddPayload(undefined)).toBeNull();
    expect(tryParseObjectAddPayload(null)).toBeNull();
    expect(tryParseObjectAddPayload("")).toBeNull();
    expect(tryParseObjectAddPayload("{")).toBeNull();
    expect(tryParseObjectAddPayload("\"text\"")).toBeNull();
    expect(tryParseObjectAddPayload("42")).toBeNull();
    expect(tryParseObjectAddPayload("[]")).toBeNull();
  });

  it("returns null when required fields are missing or empty", () => {
    expect(
      tryParseObjectAddPayload(
        JSON.stringify({
          kind: "items",
          tag: "item_a",
          resRef: "itm_a"
        })
      )
    ).toBeNull();

    expect(
      tryParseObjectAddPayload(
        JSON.stringify({
          id: "obj_003",
          kind: "items",
          tag: " ",
          resRef: "itm_a"
        })
      )
    ).toBeNull();

    expect(
      tryParseObjectAddPayload(
        JSON.stringify({
          id: "obj_003",
          kind: "items",
          tag: "item_a",
          resRef: ""
        })
      )
    ).toBeNull();
  });

  it("returns null for invalid kind and invalid field types", () => {
    expect(
      tryParseObjectAddPayload(
        JSON.stringify({
          id: "obj_004",
          kind: "vfx",
          tag: "fx_a",
          resRef: "fx_01"
        })
      )
    ).toBeNull();

    expect(
      tryParseObjectAddPayload(
        JSON.stringify({
          id: 7,
          kind: "doors",
          tag: "door_a",
          resRef: "dor_a"
        })
      )
    ).toBeNull();

    expect(
      tryParseObjectAddPayload(
        JSON.stringify({
          id: "obj_005",
          kind: "doors",
          tag: "door_a",
          resRef: "dor_a",
          name: 123
        })
      )
    ).toBeNull();
  });

  it("stores active payload for dragover fallback and clears it", () => {
    const payload: ObjectAddDragPayload = {
      id: "obj_006",
      kind: "sounds",
      tag: "SOUND_CAVES_02",
      resRef: "as_amb_caves"
    };

    setCurrentObjectAddDragPayload(payload);
    expect(getCurrentObjectAddDragPayload()).toEqual(payload);

    const snapshot = getCurrentObjectAddDragPayload();
    expect(snapshot).not.toBe(payload);

    setCurrentObjectAddDragPayload(null);
    expect(getCurrentObjectAddDragPayload()).toBeNull();
  });
});
