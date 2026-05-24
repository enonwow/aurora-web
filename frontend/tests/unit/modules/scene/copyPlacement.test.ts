import {
  computeCopyTranslationVector,
  getPointsCentroid,
  resolveCopyAnchorPoint
} from "../../../../src/modules/scene/domain/copyPlacement";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("copyPlacement", () => {
  it("computes centroid for source points", () => {
    const centroid = getPointsCentroid([
      { x: 2, y: 4 },
      { x: 6, y: 8 }
    ]);

    expect(centroid).toEqual({ x: 4, y: 6 });
  });

  it("returns null centroid for empty source", () => {
    expect(getPointsCentroid([])).toBeNull();
  });

  it("prefers cursor anchor over fallback anchor", () => {
    const anchor = resolveCopyAnchorPoint({
      cursorAnchor: { x: 15, y: 25 },
      sourcePoints: [
        { x: 1, y: 1 },
        { x: 3, y: 3 }
      ],
      fallbackOffset: 0.35
    });

    expect(anchor).toEqual({ x: 15, y: 25 });
  });

  it("uses centroid + fallback offset when cursor anchor is missing", () => {
    const anchor = resolveCopyAnchorPoint({
      cursorAnchor: null,
      sourcePoints: [
        { x: 1, y: 1 },
        { x: 3, y: 5 }
      ],
      fallbackOffset: 0.5
    });

    expect(anchor).toEqual({ x: 2.5, y: 3.5 });
  });

  it("computes translation vector without snap when snap is disabled", () => {
    const translation = computeCopyTranslationVector({
      sourcePoints: [
        { x: 2, y: 2 },
        { x: 4, y: 6 }
      ],
      anchor: { x: 10, y: 12 },
      snapGrid: false,
      snapGridStep: 1
    });

    expect(translation).toEqual({ x: 7, y: 8 });
  });

  it("snaps translation vector when snap grid is enabled", () => {
    const translation = computeCopyTranslationVector({
      sourcePoints: [
        { x: 1.1, y: 1.2 },
        { x: 2.1, y: 2.2 }
      ],
      anchor: { x: 5.9, y: 6.1 },
      snapGrid: true,
      snapGridStep: 0.5
    });

    expect(translation).toEqual({ x: 4.5, y: 4.5 });
  });

  it("clamps snap step to minimum baseline when non-positive step is provided", () => {
    const translation = computeCopyTranslationVector({
      sourcePoints: [
        { x: 1.05, y: 1.05 },
        { x: 2.05, y: 2.05 }
      ],
      anchor: { x: 4.11, y: 4.14 },
      snapGrid: true,
      snapGridStep: 0
    });

    expect(translation).toEqual({ x: 2.6, y: 2.6 });
  });

  it("preserves group geometry by applying one shared translation", () => {
    const source = [
      { x: 10, y: 10 },
      { x: 14, y: 13 },
      { x: 18, y: 20 }
    ];
    const originalVectors = [
      { dx: source[1].x - source[0].x, dy: source[1].y - source[0].y },
      { dx: source[2].x - source[0].x, dy: source[2].y - source[0].y }
    ];

    const translation = computeCopyTranslationVector({
      sourcePoints: source,
      anchor: { x: 30, y: 40 },
      snapGrid: false,
      snapGridStep: 1
    });
    expect(translation).not.toBeNull();
    const moved = source.map((point) => ({
      x: point.x + (translation?.x ?? 0),
      y: point.y + (translation?.y ?? 0)
    }));

    const movedVectors = [
      { dx: moved[1].x - moved[0].x, dy: moved[1].y - moved[0].y },
      { dx: moved[2].x - moved[0].x, dy: moved[2].y - moved[0].y }
    ];

    expect(movedVectors).toEqual(originalVectors);
  });

  it("keeps new metadata fields present in simulated copy-paste flow for placeables", () => {
    const source = createNewSceneObject("placeables", 1.25, 2.5, 1);
    const translation = computeCopyTranslationVector({
      sourcePoints: [{ x: source.x, y: source.y }],
      anchor: { x: 2.25, y: 4.5 },
      snapGrid: false,
      snapGridStep: 1
    });
    expect(translation).not.toBeNull();

    const pasted = createNewSceneObject(
      source.kind,
      source.x + (translation?.x ?? 0),
      source.y + (translation?.y ?? 0),
      2
    );
    pasted.resRef = source.resRef;
    pasted.tag = `${source.tag}_COPY`;
    pasted.visualTransform = { ...source.visualTransform };
    pasted.bearing = source.bearing;

    expect(pasted.placeableProperties).toEqual({
      plot: false,
      useable: false,
      hasInventory: false
    });
    expect(pasted.soundPositioning).toBeUndefined();
  });

  it("keeps new metadata fields present in simulated copy-paste flow for sounds", () => {
    const source = createNewSceneObject("sounds", 0.75, 1.5, 10);
    const translation = computeCopyTranslationVector({
      sourcePoints: [{ x: source.x, y: source.y }],
      anchor: { x: 1.75, y: 3.25 },
      snapGrid: false,
      snapGridStep: 1
    });
    expect(translation).not.toBeNull();

    const pasted = createNewSceneObject(
      source.kind,
      source.x + (translation?.x ?? 0),
      source.y + (translation?.y ?? 0),
      11
    );
    pasted.resRef = source.resRef;
    pasted.tag = `${source.tag}_COPY`;
    pasted.visualTransform = { ...source.visualTransform };
    pasted.bearing = source.bearing;

    expect(pasted.soundPositioning).toEqual({
      mode: "specific",
      elevation: 0,
      maxVolumeDistance: 8,
      cutoffDistance: 16,
      randomRangeWestEast: 0,
      randomRangeNorthSouth: 0
    });
    expect(pasted.placeableProperties).toBeUndefined();
  });
});
