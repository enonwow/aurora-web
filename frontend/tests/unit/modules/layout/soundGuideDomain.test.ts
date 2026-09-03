import { describe, expect, it } from "vitest";
import {
  SOUND_GUIDE_NON_SERIALIZABLE_KEYS,
  hasSoundGuideNonSerializableState,
  isSoundGuideNonSerializableKey,
  normalizeSoundGuidePositioning,
  resolveSoundGuideWorldGeometry,
  resolveEditorSoundGuideOverlayFlags,
  resolveSoundGuideOverlayFlags,
  resolveSoundGuideOverlayFlagsFromPositioning,
  resolveSoundGuideOverlays,
  resolveSoundGuideOverlaysFromPositioning,
  stripSoundGuideNonSerializableState
} from "../../../../src/modules/layout/soundGuideDomain";

describe("soundGuideDomain normalizeSoundGuidePositioning", () => {
  it("returns deterministic baseline for empty payload", () => {
    expect(normalizeSoundGuidePositioning(undefined)).toEqual({
      mode: "specific",
      elevation: 0,
      maxVolumeDistance: 1,
      cutoffDistance: 10,
      randomRangeWestEast: 0,
      randomRangeNorthSouth: 0
    });
  });

  it("keeps signed elevation and random ranges while clamping invalid distances", () => {
    expect(
      normalizeSoundGuidePositioning({
        mode: "random",
        elevation: -3,
        maxVolumeDistance: 10,
        cutoffDistance: 2,
        randomRangeWestEast: Number.POSITIVE_INFINITY,
        randomRangeNorthSouth: -1
      })
    ).toEqual({
      mode: "random",
      elevation: -3,
      maxVolumeDistance: 10,
      cutoffDistance: 10,
      randomRangeWestEast: 0,
      randomRangeNorthSouth: 0
    });
  });

  it("zeroes random ranges outside random mode", () => {
    const specific = normalizeSoundGuidePositioning({
      mode: "specific",
      elevation: 1,
      maxVolumeDistance: 7,
      cutoffDistance: 8,
      randomRangeWestEast: 4,
      randomRangeNorthSouth: 5
    });
    const everywhere = normalizeSoundGuidePositioning({
      mode: "everywhere",
      elevation: 1,
      maxVolumeDistance: 7,
      cutoffDistance: 8,
      randomRangeWestEast: 4,
      randomRangeNorthSouth: 5
    });

    expect(specific.randomRangeWestEast).toBe(0);
    expect(specific.randomRangeNorthSouth).toBe(0);
    expect(everywhere.randomRangeWestEast).toBe(0);
    expect(everywhere.randomRangeNorthSouth).toBe(0);
  });

  it("uses fallback for corrupted payload fields", () => {
    expect(
      normalizeSoundGuidePositioning(
        {
          mode: "broken",
          elevation: "bad",
          maxVolumeDistance: null,
          cutoffDistance: undefined
        } as unknown as Record<string, unknown>,
        {
          mode: "random",
          elevation: 2,
          maxVolumeDistance: 12,
          cutoffDistance: 18,
          randomRangeWestEast: 3,
          randomRangeNorthSouth: 4
        }
      )
    ).toEqual({
      mode: "random",
      elevation: 2,
      maxVolumeDistance: 12,
      cutoffDistance: 18,
      randomRangeWestEast: 3,
      randomRangeNorthSouth: 4
    });
  });

  it("is stable across normalize -> serialize -> normalize roundtrip", () => {
    const normalized = normalizeSoundGuidePositioning({
      mode: "random",
      elevation: 1.5,
      maxVolumeDistance: 9,
      cutoffDistance: 12,
      randomRangeWestEast: 2,
      randomRangeNorthSouth: 3
    });

    const roundtripped = normalizeSoundGuidePositioning(
      JSON.parse(JSON.stringify(normalized)) as Record<string, unknown>
    );
    expect(roundtripped).toEqual(normalized);
  });
});

describe("soundGuideDomain overlay mode gating", () => {
  it("maps mode to overlays deterministically", () => {
    expect(resolveSoundGuideOverlays("everywhere")).toEqual([]);
    expect(resolveSoundGuideOverlays("specific")).toEqual(["anchor", "range", "height"]);
    expect(resolveSoundGuideOverlays("random")).toEqual([
      "anchor",
      "range",
      "rand-box",
      "height"
    ]);
  });

  it("maps mode to overlay flags deterministically", () => {
    expect(resolveSoundGuideOverlayFlags("everywhere")).toEqual({
      anchor: false,
      range: false,
      randBox: false,
      height: false
    });
    expect(resolveSoundGuideOverlayFlags("specific")).toEqual({
      anchor: true,
      range: true,
      randBox: false,
      height: true
    });
    expect(resolveSoundGuideOverlayFlags("random")).toEqual({
      anchor: true,
      range: true,
      randBox: true,
      height: true
    });
  });

  it("gates overlays from optional positioning payload", () => {
    expect(resolveSoundGuideOverlaysFromPositioning(undefined)).toEqual([]);
    expect(resolveSoundGuideOverlaysFromPositioning(null)).toEqual([]);
    expect(resolveSoundGuideOverlayFlagsFromPositioning(undefined)).toEqual({
      anchor: false,
      range: false,
      randBox: false,
      height: false
    });
    expect(resolveSoundGuideOverlaysFromPositioning({ mode: "random" })).toEqual([
      "anchor",
      "range",
      "rand-box",
      "height"
    ]);
  });

  it("projects exact native distances to world geometry without losing signed elevation", () => {
    const geometry = resolveSoundGuideWorldGeometry(
      {
        mode: "random",
        elevation: -4,
        maxVolumeDistance: 6,
        cutoffDistance: 12,
        randomRangeWestEast: 4,
        randomRangeNorthSouth: 5
      },
      10
    );

    expect(geometry.metersToWorldScale).toBeCloseTo(0.1, 12);
    expect(geometry.elevationOffsetWorld).toBeCloseTo(-0.4, 12);
    expect(geometry.maxVolumeRadiusWorld).toBeCloseTo(0.6, 12);
    expect(geometry.cutoffRadiusWorld).toBeCloseTo(1.2, 12);
    expect(geometry.randomRangeHalfWidthWorld).toBeCloseTo(0.2, 12);
    expect(geometry.randomRangeHalfDepthWorld).toBeCloseTo(0.25, 12);
  });

  it("uses a deterministic safe world scale for invalid units-per-tile input", () => {
    expect(
      resolveSoundGuideWorldGeometry(
        {
          mode: "specific",
          elevation: -2,
          maxVolumeDistance: 1,
          cutoffDistance: 10,
          randomRangeWestEast: 0,
          randomRangeNorthSouth: 0
        },
        Number.NaN
      )
    ).toEqual({
      metersToWorldScale: 1,
      elevationOffsetWorld: -2,
      maxVolumeRadiusWorld: 1,
      cutoffRadiusWorld: 10,
      randomRangeHalfWidthWorld: 0,
      randomRangeHalfDepthWorld: 0
    });
  });

  it("keeps backend-created sound guides editor-only and gates locked or hidden layers", () => {
    const backendCreatedPositioning = normalizeSoundGuidePositioning({
      mode: "random",
      elevation: 1.5,
      maxVolumeDistance: 8,
      cutoffDistance: 16,
      randomRangeWestEast: 4,
      randomRangeNorthSouth: 5,
      preserve: {
        flags: {
          backendBenchmark: false
        },
        extra: {
          backendSoundId: "sound_dia_hakon_add_12",
          soundTemplateSource: "backend-catalog"
        }
      }
    } as unknown as Record<string, unknown>);

    expect(
      resolveEditorSoundGuideOverlayFlags(backendCreatedPositioning, {
        editorVisible: true
      })
    ).toEqual({
      anchor: true,
      range: true,
      randBox: true,
      height: true
    });
    expect(
      resolveEditorSoundGuideOverlayFlags(backendCreatedPositioning, {
        editorVisible: false
      })
    ).toEqual({
      anchor: false,
      range: false,
      randBox: false,
      height: false
    });
    expect(
      resolveEditorSoundGuideOverlayFlags(backendCreatedPositioning, {
        editorVisible: true,
        locked: true
      })
    ).toEqual({
      anchor: false,
      range: false,
      randBox: false,
      height: false
    });
  });
});

describe("soundGuideDomain non-serialization guards", () => {
  it("exposes non-serializable key set and key guard", () => {
    expect(SOUND_GUIDE_NON_SERIALIZABLE_KEYS).toEqual([
      "__soundGuideOverlayState",
      "__soundGuideGeometryCache",
      "__soundGuideDiagnostics"
    ]);
    expect(isSoundGuideNonSerializableKey("__soundGuideOverlayState")).toBe(true);
    expect(isSoundGuideNonSerializableKey("soundPositioning")).toBe(false);
  });

  it("detects and strips editor-only state keys", () => {
    const input = {
      id: "snd_001",
      soundPositioning: { mode: "specific" },
      __soundGuideOverlayState: { overlay: true },
      __soundGuideGeometryCache: { ring: [1, 2, 3] },
      __soundGuideDiagnostics: { lastMs: 5 }
    };

    expect(hasSoundGuideNonSerializableState(input)).toBe(true);
    expect(hasSoundGuideNonSerializableState({ id: "snd_001" })).toBe(false);
    expect(hasSoundGuideNonSerializableState(null)).toBe(false);

    const stripped = stripSoundGuideNonSerializableState(input);
    expect(stripped).toEqual({
      id: "snd_001",
      soundPositioning: { mode: "specific" }
    });
    expect(input).toHaveProperty("__soundGuideOverlayState");
    expect(input).toHaveProperty("__soundGuideGeometryCache");
    expect(input).toHaveProperty("__soundGuideDiagnostics");
  });

  it("returns same reference when no editor-only keys are present", () => {
    const clean = {
      id: "snd_002",
      soundPositioning: { mode: "random" }
    };
    const stripped = stripSoundGuideNonSerializableState(clean);
    expect(stripped).toBe(clean);
  });
});
