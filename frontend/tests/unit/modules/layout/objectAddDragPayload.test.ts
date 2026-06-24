import { describe, expect, it } from "vitest";
import {
  createObjectAddPayloadFromSceneObject,
  getCurrentObjectAddDragPayload,
  OBJECT_ADD_DRAG_MIME,
  serializeObjectAddPayload,
  setCurrentObjectAddDragPayload,
  tryParseObjectAddPayload,
  type ObjectAddDragPayload
} from "../../../../src/modules/layout/application/objectAddDragPayload";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

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

  it("roundtrips sound positioning metadata only for sound payloads", () => {
    const soundPositioning = {
      mode: "specific" as const,
      elevation: 1,
      maxVolumeDistance: 12,
      cutoffDistance: 24,
      randomRangeWestEast: 0,
      randomRangeNorthSouth: 0,
      preserve: {
        timeWindow: "always",
        hourMask: "0xFFFFFF",
        active: true,
        whenToPlay: "always" as const,
        dayNight: "both" as const,
        hoursStart: 0,
        hoursEnd: 23,
        playStyle: "repeat" as const,
        playOrder: "random" as const,
        intervalMs: 4000,
        intervalVariationMs: 500,
        volume: 80,
        volumeVariation: 10,
        pitchVariation: 0,
        priority: 5,
        flags: { backendBenchmark: true },
        extra: {
          backendSoundId: "sound_dia_hakon_add_12",
          soundTemplateSource: "backend-catalog"
        }
      }
    };
    const payload: ObjectAddDragPayload = {
      id: "snd_template_sound_dia_hakon_add_12",
      kind: "sounds",
      tag: "SOUND_DIA_HAKON_ADD_12",
      resRef: "dia_hakon_add_12",
      name: "dia_hakon_add_12",
      soundPositioning
    };

    expect(tryParseObjectAddPayload(serializeObjectAddPayload(payload))).toEqual(payload);

    setCurrentObjectAddDragPayload(payload);
    const snapshot = getCurrentObjectAddDragPayload();
    expect(snapshot).toEqual(payload);
    expect(snapshot?.soundPositioning).not.toBe(soundPositioning);
    expect(snapshot?.soundPositioning?.preserve?.extra).not.toBe(
      soundPositioning.preserve.extra
    );
    setCurrentObjectAddDragPayload(null);

    expect(
      tryParseObjectAddPayload(
        JSON.stringify({
          id: "plc_001",
          kind: "placeables",
          tag: "PLC_001",
          resRef: "plc_001",
          soundPositioning
        })
      )
    ).toEqual({
      id: "plc_001",
      kind: "placeables",
      tag: "PLC_001",
      resRef: "plc_001"
    });
  });

  it("creates a stable add payload from a scene object template", () => {
    const soundTemplate = {
      ...createNewSceneObject("sounds", 1, 2, 7),
      id: "snd_template_sound_dia_hakon_add_12",
      tag: "SOUND_DIA_HAKON_ADD_12",
      resRef: "dia_hakon_add_12",
      name: "dia_hakon_add_12",
      soundPositioning: {
        mode: "specific" as const,
        elevation: 1,
        maxVolumeDistance: 12,
        cutoffDistance: 24,
        randomRangeWestEast: 0,
        randomRangeNorthSouth: 0,
        preserve: {
          flags: { backendBenchmark: true },
          extra: {
            backendSoundId: "sound_dia_hakon_add_12",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    };

    const payload = createObjectAddPayloadFromSceneObject(soundTemplate);

    expect(payload).toEqual({
      id: "snd_template_sound_dia_hakon_add_12",
      kind: "sounds",
      tag: "SOUND_DIA_HAKON_ADD_12",
      resRef: "dia_hakon_add_12",
      name: "dia_hakon_add_12",
      soundPositioning: soundTemplate.soundPositioning
    });
    expect(payload.soundPositioning).not.toBe(soundTemplate.soundPositioning);
    expect(payload.soundPositioning?.preserve?.extra).not.toBe(
      soundTemplate.soundPositioning.preserve?.extra
    );
  });
});
