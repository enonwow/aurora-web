import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { rebuildGridLayer } from "../../../../src/modules/layout/adapters/three/workspaceGridLayer";

function createRuntimeStub() {
  return {
    gridLayer: new THREE.Group(),
    tileOverlayLayer: new THREE.Group()
  };
}

const viewportFacade = {
  defaultMasterCellsPerTile: 10,
  buildGridSegments: () => [
    {
      kind: "major" as const,
      start: [0, 0, 0] as const,
      end: [20, 0, 0] as const
    },
    {
      kind: "major" as const,
      start: [0, 0, 10] as const,
      end: [20, 0, 10] as const
    },
    {
      kind: "minor" as const,
      start: [5, 0, 0] as const,
      end: [5, 0, 20] as const
    }
  ]
};

describe("workspaceGridLayer", () => {
  it("builds the Aurora tile overlay as an editor layer above rendered area geometry", () => {
    const runtime = createRuntimeStub();

    rebuildGridLayer(runtime, { width: 2, height: 2 }, viewportFacade, true);

    expect(runtime.tileOverlayLayer.children).toHaveLength(1);
    const overlayLines = runtime.tileOverlayLayer.children[0];
    expect(overlayLines).toBeInstanceOf(THREE.LineSegments);
    expect(overlayLines.renderOrder).toBe(950);
    expect(overlayLines.position.y).toBeCloseTo(0.004);

    const geometry = (overlayLines as THREE.LineSegments).geometry;
    expect(geometry.getAttribute("position").count).toBe(4);

    const material = (overlayLines as THREE.LineSegments).material;
    expect(material).toBeInstanceOf(THREE.LineBasicMaterial);
    const lineMaterial = material as THREE.LineBasicMaterial;
    expect(lineMaterial.color.getHex()).toBe(0xff3f51);
    expect(lineMaterial.transparent).toBe(true);
    expect(lineMaterial.opacity).toBeCloseTo(0.9);
    expect(lineMaterial.depthTest).toBe(false);
    expect(lineMaterial.depthWrite).toBe(false);
  });

  it("does not build the Aurora tile overlay when the option is disabled", () => {
    const runtime = createRuntimeStub();

    rebuildGridLayer(runtime, { width: 2, height: 2 }, viewportFacade, false);

    expect(runtime.tileOverlayLayer.children).toHaveLength(0);
  });
});
