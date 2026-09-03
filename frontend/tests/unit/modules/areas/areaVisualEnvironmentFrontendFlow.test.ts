import { describe, expect, it } from "vitest";

import { createAreaPropertiesFacade } from "../../../../src/modules/areas/application/areaPropertiesFacade";
import { mapBackendAreaToScene } from "../../../../src/modules/areas/application/areaSceneMapper";
import { parseAreaScene } from "../../../../src/modules/areas/application/areaWorkspaceDraft";
import type { AreaApiDetail } from "../../../../src/modules/areas/contracts";
import type { AreaVisualEnvironment } from "../../../../src/modules/areas/domain/areaVisualEnvironment";
import type { AreaVisualEnvironmentScalarControls } from "../../../../src/modules/areas/domain/areaVisualEnvironmentScalarControls";
import type { AreaScene } from "../../../../src/modules/scene/contracts";

const sourceEnvironment = (): AreaVisualEnvironment => ({
  dayNightMode: "cycle",
  shadowOpacity: 65,
  chanceRain: 25,
  chanceSnow: 5,
  chanceLightning: 10,
  sun: {
    ambientColor: 0x112233,
    diffuseColor: 0x445566,
    fogColor: 0x778899,
    fogAmount: 7,
    shadows: true,
  },
  moon: {
    ambientColor: 0x223344,
    diffuseColor: 0x556677,
    fogColor: 0x8899aa,
    fogAmount: 11,
    shadows: false,
  },
});

function detail(
  visualEnvironment: AreaVisualEnvironment = sourceEnvironment(),
  visualEnvironmentScalarControls: AreaVisualEnvironmentScalarControls = {
    fogClipDistance: 80,
    windPower: 0,
  },
): AreaApiDetail {
  return {
    areaId: "visual01",
    name: "Visual Probe",
    biome: "exterior",
    width: 1,
    height: 1,
    tags: [],
    visualEnvironment,
    visualEnvironmentScalarControls,
    benchmark: false,
    previewImageUrl: "",
    textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
    lighting: {
      source: "are-root-fields",
      fields: [
        { field: "LightingScheme", value: 3 },
        { field: "DayNightCycle", value: 1 },
        { field: "IsNight", value: 0 },
        { field: "SunAmbientColor", value: 0x112233 },
        { field: "FogClipDist", value: 80 },
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
}

describe("Area visual-environment frontend flow", () => {
  it("maps and draft-validates one exact detached tuple", () => {
    const api = detail();
    const scene = mapBackendAreaToScene(api, () => 100);

    expect(scene.areaVisualEnvironment).toEqual(sourceEnvironment());
    expect(scene.areaVisualEnvironment).not.toBe(api.visualEnvironment);
    expect(scene.areaVisualEnvironment?.sun).not.toBe(api.visualEnvironment?.sun);
    expect(scene.areaVisualEnvironmentScalarControls).toEqual({
      fogClipDistance: 80,
      windPower: 0,
    });
    expect(scene.areaVisualEnvironmentScalarControls)
      .not.toBe(api.visualEnvironmentScalarControls);
    expect(parseAreaScene(scene)).toBe(scene);
    expect(parseAreaScene({
      ...scene,
      areaVisualEnvironment: { ...sourceEnvironment(), shadowOpacity: 101 },
    })).toBeNull();
  });

  it("builds scalar-control CAS and replaces only FogClipDist/WindPower lighting fields", () => {
    const facade = createAreaPropertiesFacade(() => 200);
    const source = {
      ...mapBackendAreaToScene(detail(), () => 100),
      auroraAreaEditing: { state: { areaResRef: "visual01" } },
    } as AreaScene;
    const draft = facade.buildDraft(source);
    expect(draft.visualEnvironmentScalarControls).toEqual({
      value: { fogClipDistance: 80, windPower: 0 },
      sourceValue: { fogClipDistance: 80, windPower: 0 },
      state: "editable",
    });

    const target = { fogClipDistance: 120, windPower: 2 };
    const applied = facade.apply(source, {
      ...draft,
      visualEnvironmentScalarControls: {
        ...draft.visualEnvironmentScalarControls!,
        value: target,
      },
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) throw new Error("Expected scalar-control edit to succeed.");
    expect(applied.value.areaVisualEnvironmentScalarControls).toEqual(target);
    expect(applied.value.areaVisualEnvironment).toEqual(sourceEnvironment());
    expect(applied.value.lighting?.fields).toEqual(expect.arrayContaining([
      { field: "LightingScheme", value: 3 },
      { field: "FogClipDist", value: 120 },
      { field: "WindPower", value: 2 },
    ]));
    expect(applied.value.lighting?.fields.filter(
      ({ field }) => field === "FogClipDist" || field === "WindPower",
    )).toHaveLength(2);
    expect(facade.buildVisualEnvironmentScalarControlsMutation(applied.value, detail()))
      .toEqual({
        expectedValue: { fogClipDistance: 80, windPower: 0 },
        value: target,
      });
  });

  it("builds full-tuple CAS and incrementally refreshes renderer lighting fields", () => {
    const facade = createAreaPropertiesFacade(() => 200);
    const source = {
      ...mapBackendAreaToScene(detail(), () => 100),
      auroraAreaEditing: { state: { areaResRef: "visual01" } },
    } as AreaScene;
    const draft = facade.buildDraft(source);
    expect(draft.visualEnvironment).toEqual({
      value: sourceEnvironment(),
      sourceValue: sourceEnvironment(),
      state: "editable",
    });
    const target: AreaVisualEnvironment = {
      ...sourceEnvironment(),
      dayNightMode: "always_night",
      shadowOpacity: 40,
      chanceRain: 90,
      sun: { ...sourceEnvironment().sun, ambientColor: 0xaabbcc, fogAmount: 4 },
      moon: { ...sourceEnvironment().moon, fogColor: 0x010203, shadows: true },
    };

    const applied = facade.apply(source, {
      ...draft,
      visualEnvironment: { ...draft.visualEnvironment!, value: target },
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) throw new Error("Expected visual-environment edit to succeed.");
    expect(applied.changed).toBe(true);
    expect(applied.value.areaVisualEnvironment).toEqual(target);
    expect(applied.value.lighting?.fields).toEqual(expect.arrayContaining([
      { field: "LightingScheme", value: 3 },
      { field: "FogClipDist", value: 80 },
      { field: "DayNightCycle", value: 0 },
      { field: "IsNight", value: 1 },
      { field: "ShadowOpacity", value: 40 },
      { field: "ChanceRain", value: 90 },
      { field: "SunAmbientColor", value: 0xaabbcc },
      { field: "SunFogAmount", value: 4 },
      { field: "MoonFogColor", value: 0x010203 },
      { field: "MoonShadows", value: 1 },
    ]));
    expect(applied.value.lighting?.fields).toHaveLength(18);
    expect(facade.buildVisualEnvironmentMutation(applied.value, {
      visualEnvironment: sourceEnvironment(),
    })).toEqual({ expectedValue: sourceEnvironment(), value: target });
  });

  it("keeps missing provenance preserve-only and rejects invalid targets", () => {
    const facade = createAreaPropertiesFacade(() => 200);
    const missing = mapBackendAreaToScene({ ...detail(), visualEnvironment: undefined });
    const missingDraft = facade.buildDraft(missing);
    expect(missingDraft.visualEnvironment?.state).toBe("preserve_only");
    expect(facade.apply(missing, {
      ...missingDraft,
      visualEnvironment: {
        ...missingDraft.visualEnvironment!,
        state: "editable",
        value: sourceEnvironment(),
      },
    })).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "AREA_VISUAL_ENVIRONMENT_PRESERVE_ONLY" }),
    });

    const source = {
      ...mapBackendAreaToScene(detail()),
      auroraAreaEditing: { state: { areaResRef: "visual01" } },
    } as AreaScene;
    const draft = facade.buildDraft(source);
    expect(facade.apply(source, {
      ...draft,
      visualEnvironment: {
        ...draft.visualEnvironment!,
        value: { ...sourceEnvironment(), chanceLightning: 101 },
      },
    })).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "AREA_VISUAL_ENVIRONMENT_INVALID" }),
    });
  });
});
