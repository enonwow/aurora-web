import { describe, expect, it } from "vitest";

import { createAreaPropertiesFacade } from "../../src/modules/areas/application/areaPropertiesFacade";
import { mapBackendAreaToScene } from "../../src/modules/areas/application/areaSceneMapper";
import {
  buildAreaWorkspaceDraftPayload,
  resolveAreaWorkspaceDraft,
} from "../../src/modules/areas/application/areaWorkspaceDraft";
import type { AreaApiDetail } from "../../src/modules/areas/contracts";
import type { AreaScene } from "../../src/modules/scene/contracts";

describe("Area visual-environment save/reopen smoke", () => {
  it("retains the complete target and renderer fields across a local draft round trip", () => {
    const sourceArea: AreaApiDetail = {
      areaId: "visual_smoke",
      name: "Visual Smoke",
      biome: "exterior",
      width: 1,
      height: 1,
      tags: [],
      visualEnvironment: {
        dayNightMode: "cycle",
        shadowOpacity: 70,
        chanceRain: 20,
        chanceSnow: 0,
        chanceLightning: 5,
        sun: {
          ambientColor: 0x112233,
          diffuseColor: 0x445566,
          fogColor: 0x778899,
          fogAmount: 5,
          shadows: true,
        },
        moon: {
          ambientColor: 0x223344,
          diffuseColor: 0x556677,
          fogColor: 0x8899aa,
          fogAmount: 10,
          shadows: false,
        },
      },
      visualEnvironmentScalarControls: {
        fogClipDistance: 80,
        windPower: 0,
      },
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
      lighting: {
        source: "are-root-fields",
        fields: [
          { field: "LightingScheme", value: 2 },
          { field: "FogClipDist", value: 80 },
          { field: "DayNightCycle", value: 1 },
          { field: "IsNight", value: 0 },
        ],
      },
      composition: {
        placeables: 0,
        doors: 0,
        creatures: 0,
        items: 0,
        sounds: 0,
        total: 0,
      },
      updatedAt: "2026-08-25T10:00:00.000Z",
      objects: [],
    };
    const base = mapBackendAreaToScene(sourceArea, () => 100);
    const scene = {
      ...base,
      auroraAreaEditing: { state: { areaResRef: "visual_smoke" } },
    } as AreaScene;
    const facade = createAreaPropertiesFacade(() => 200);
    const draft = facade.buildDraft(scene);
    const target = {
      ...draft.visualEnvironment!.value,
      dayNightMode: "always_night" as const,
      chanceLightning: 80,
      moon: {
        ...draft.visualEnvironment!.value.moon,
        fogColor: 0x010203,
        shadows: true,
      },
    };

    const applied = facade.apply(scene, {
      ...draft,
      visualEnvironment: { ...draft.visualEnvironment!, value: target },
      visualEnvironmentScalarControls: {
        ...draft.visualEnvironmentScalarControls!,
        value: { fogClipDistance: 120, windPower: 2 },
      },
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) throw new Error("Expected visual smoke mutation to succeed.");
    const payload = buildAreaWorkspaceDraftPayload(applied.value, {
      schemaVersion: "production-area-draft-payload.v1",
      provenance: {
        areaId: sourceArea.areaId,
        sourceUpdatedAt: sourceArea.updatedAt,
        processingCacheKey: "cache:visual-smoke",
      },
      sourceArea,
      editableScene: scene,
    });
    const reopened = resolveAreaWorkspaceDraft(payload);

    expect(reopened?.scene.areaVisualEnvironment).toEqual(target);
    expect(reopened?.scene.areaVisualEnvironmentScalarControls).toEqual({
      fogClipDistance: 120,
      windPower: 2,
    });
    expect(reopened?.scene.lighting?.fields).toEqual(expect.arrayContaining([
      { field: "LightingScheme", value: 2 },
      { field: "FogClipDist", value: 120 },
      { field: "WindPower", value: 2 },
      { field: "DayNightCycle", value: 0 },
      { field: "IsNight", value: 1 },
      { field: "ChanceLightning", value: 80 },
      { field: "MoonFogColor", value: 0x010203 },
      { field: "MoonShadows", value: 1 },
    ]));
    expect(facade.buildVisualEnvironmentMutation(reopened!.scene, sourceArea)).toEqual({
      expectedValue: sourceArea.visualEnvironment,
      value: target,
    });
    expect(facade.buildVisualEnvironmentScalarControlsMutation(
      reopened!.scene,
      sourceArea,
    )).toEqual({
      expectedValue: { fogClipDistance: 80, windPower: 0 },
      value: { fogClipDistance: 120, windPower: 2 },
    });
  });
});
