import * as THREE from "three";

const TILE_OVERLAY_GRID_COLOR = 0xff3f51;

interface GridLayerRuntime {
  gridLayer: THREE.Group;
  tileOverlayLayer: THREE.Group;
}

interface GridSegment {
  kind: "major" | "minor";
  start: readonly [number, number, number];
  end: readonly [number, number, number];
}

interface GridLayerViewportFacade {
  defaultMasterCellsPerTile: number;
  buildGridSegments(
    widthTiles: number,
    heightTiles: number,
    masterCellsPerTile: number
  ): GridSegment[];
}

export function disposeGridLayer(gridLayer: THREE.Group): void {
  gridLayer.children.forEach((child) => {
    if (child instanceof THREE.LineSegments) {
      child.geometry.dispose();
      const material = child.material;
      if (Array.isArray(material)) {
        material.forEach((entry) => entry.dispose());
      } else {
        material.dispose();
      }
    }
  });
  gridLayer.clear();
}

export function rebuildGridLayer(
  runtime: GridLayerRuntime,
  sceneData: { width: number; height: number },
  viewportFacade: GridLayerViewportFacade,
  showTileGridOverlay: boolean
): void {
  disposeGridLayer(runtime.gridLayer);
  disposeGridLayer(runtime.tileOverlayLayer);

  const segments = viewportFacade.buildGridSegments(
    sceneData.width,
    sceneData.height,
    viewportFacade.defaultMasterCellsPerTile
  );

  const majorPoints: number[] = [];
  const minorPoints: number[] = [];

  segments.forEach((segment) => {
    const target = segment.kind === "major" ? majorPoints : minorPoints;
    target.push(...segment.start, ...segment.end);
  });

  const minorGeometry = new THREE.BufferGeometry();
  minorGeometry.setAttribute("position", new THREE.Float32BufferAttribute(minorPoints, 3));
  const minorMaterial = new THREE.LineBasicMaterial({
    color: 0x1e3551,
    transparent: true,
    opacity: 0.86
  });
  const minorLines = new THREE.LineSegments(minorGeometry, minorMaterial);
  minorLines.position.set(0, -0.003, 0);
  runtime.gridLayer.add(minorLines);

  const majorGeometry = new THREE.BufferGeometry();
  majorGeometry.setAttribute("position", new THREE.Float32BufferAttribute(majorPoints, 3));
  const majorMaterial = new THREE.LineBasicMaterial({
    color: 0x2a4c73,
    transparent: true,
    opacity: 0.96
  });
  const majorLines = new THREE.LineSegments(majorGeometry, majorMaterial);
  majorLines.position.set(0, -0.002, 0);
  runtime.gridLayer.add(majorLines);

  if (!showTileGridOverlay || majorPoints.length === 0) {
    return;
  }

  const overlayGeometry = new THREE.BufferGeometry();
  overlayGeometry.setAttribute("position", new THREE.Float32BufferAttribute(majorPoints, 3));
  const overlayMaterial = new THREE.LineBasicMaterial({
    color: TILE_OVERLAY_GRID_COLOR,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
  });
  const overlayLines = new THREE.LineSegments(overlayGeometry, overlayMaterial);
  overlayLines.position.set(0, 0.004, 0);
  overlayLines.renderOrder = 950;
  runtime.tileOverlayLayer.add(overlayLines);
}
