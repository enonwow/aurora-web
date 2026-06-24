import { describe, expect, it, vi } from "vitest";
import {
  createSoundsModeSceneSeed,
  mapSoundApiListItemToSceneObject
} from "../../../../src/modules/sounds/application/soundSceneObjectMapper";
import type { SoundApiListItem } from "../../../../src/modules/sounds/contracts";

const backendSound: SoundApiListItem = {
  soundId: "sound_dia_hakon_add_12",
  resref: "dia_hakon_add_12",
  name: "Dia Hakon Add 12",
  category: "effect",
  format: "wav",
  tags: ["dialog"],
  benchmark: false,
  previewWaveformUrl: "/api/v1/catalog/sounds/sound_dia_hakon_add_12/preview",
  spatialMode: "3d",
  playbackMode: "random",
  auroraUsage: {
    bindingKey: "GI_sound_rndm",
    sourceField: "RandomSound"
  },
  metrics: {
    durationMs: 1200,
    cues: 1,
    emitters: 1
  },
  updatedAt: "2026-06-16T10:00:00.000Z"
};

describe("soundSceneObjectMapper", () => {
  it("maps a backend sound catalog item into a selectable scene sound template", () => {
    const object = mapSoundApiListItemToSceneObject(backendSound);

    expect(object).toMatchObject({
      id: "snd_template_sound_dia_hakon_add_12",
      kind: "sounds",
      name: "Dia Hakon Add 12",
      resRef: "dia_hakon_add_12",
      tag: "SOUND_DIA_HAKON_ADD_12",
      x: 6,
      y: 6,
      z: 0
    });
    expect(object.soundPositioning).toMatchObject({
      mode: "specific",
      elevation: 0,
      maxVolumeDistance: 1,
      cutoffDistance: 10,
      randomRangeWestEast: 0,
      randomRangeNorthSouth: 0,
      preserve: {
        playStyle: "repeat",
        playOrder: "random",
        flags: {
          backendBenchmark: false
        },
        extra: {
          backendSoundId: "sound_dia_hakon_add_12",
          category: "effect",
          format: "wav",
          spatialMode: "3d",
          playbackMode: "random",
          auroraBindingKey: "GI_sound_rndm",
          auroraSourceField: "RandomSound",
          durationMs: 1200,
          soundTemplateSource: "backend-catalog"
        }
      }
    });
  });

  it("creates a focused Sounds Mode preview scene with only the placed sound object", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-16T10:15:00.000Z"));

    try {
      const scene = createSoundsModeSceneSeed(backendSound);

      expect(scene.sceneId).toBe("sounds_mode_preview_sound_dia_hakon_add_12");
      expect(scene.areaName).toBe("Sounds Mode Preview");
      expect(scene.width).toBe(12);
      expect(scene.height).toBe(12);
      expect(scene.objects).toHaveLength(1);
      expect(scene.objects[0]).toMatchObject({
        id: "snd_template_sound_dia_hakon_add_12",
        kind: "sounds",
        resRef: "dia_hakon_add_12"
      });
      expect(scene.updatedAtUnixMs).toBe(new Date("2026-06-16T10:15:00.000Z").getTime());
    } finally {
      vi.useRealTimers();
    }
  });
});
