export interface CopyPoint2D {
  x: number;
  y: number;
}

function snapGridValue(value: number, step: number): number {
  const normalizedStep = Math.max(0.1, step);
  return Math.round(value / normalizedStep) * normalizedStep;
}

export function getPointsCentroid(points: CopyPoint2D[]): CopyPoint2D | null {
  if (points.length === 0) {
    return null;
  }

  const sum = points.reduce(
    (acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y
    }),
    { x: 0, y: 0 }
  );

  return {
    x: sum.x / points.length,
    y: sum.y / points.length
  };
}

export function resolveCopyAnchorPoint(params: {
  cursorAnchor: CopyPoint2D | null;
  sourcePoints: CopyPoint2D[];
  fallbackOffset: number;
}): CopyPoint2D | null {
  if (params.cursorAnchor) {
    return params.cursorAnchor;
  }

  const centroid = getPointsCentroid(params.sourcePoints);
  if (!centroid) {
    return null;
  }

  return {
    x: centroid.x + params.fallbackOffset,
    y: centroid.y + params.fallbackOffset
  };
}

export function computeCopyTranslationVector(params: {
  sourcePoints: CopyPoint2D[];
  anchor: CopyPoint2D;
  snapGrid: boolean;
  snapGridStep: number;
}): CopyPoint2D | null {
  const centroid = getPointsCentroid(params.sourcePoints);
  if (!centroid) {
    return null;
  }

  let dx = params.anchor.x - centroid.x;
  let dy = params.anchor.y - centroid.y;

  if (params.snapGrid) {
    dx = snapGridValue(dx, params.snapGridStep);
    dy = snapGridValue(dy, params.snapGridStep);
  }

  return { x: dx, y: dy };
}

