import { describe, expect, it } from "vitest";
import {
  SOUND_GUIDE_NON_SERIALIZABLE_KEYS,
  hasSoundGuideNonSerializableState,
  isSoundGuideNonSerializableKey,
  normalizeSoundGuidePositioning,
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

  it("keeps random mode ranges and clamps non-finite/negative values", () => {
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
      elevation: 0,
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
