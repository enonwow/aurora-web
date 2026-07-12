import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  AREA_TILE_PLACEMENT_PREVIEW_OVERLAY_NAME,
  clearAreaTilePlacementPreviewOverlay,
  syncAreaTilePlacementPreviewOverlay
} from "../../../../src/modules/layout/adapters/three/workspaceAreaTilePlacementPreview";

function createRuntimeStub() {
  return { scene: new THREE.Scene(), container: document.createElement("div") };
}

describe("workspaceAreaTilePlacementPreview", () => {
  it("attaches non-interactive transparent green and red grid-cell overlays", () => {
    const runtime = createRuntimeStub();

    const overlay = syncAreaTilePlacementPreviewOverlay(runtime, {
      cells: [
        { col: 2, row: 3, valid: true },
        { col: 4, row: 5, valid: false, elevation: 1.5 }
      ]
    });

    expect(overlay).not.toBeNull();
    expect(runtime.scene.children).toEqual([overlay]);
    expect(overlay?.name).toBe(AREA_TILE_PLACEMENT_PREVIEW_OVERLAY_NAME);
    expect(overlay?.children).toHaveLength(2);

    const validCell = overlay?.children[0] as THREE.Mesh;
    const invalidCell = overlay?.children[1] as THREE.Mesh;
    const validMaterial = validCell.material as THREE.MeshBasicMaterial;
    const invalidMaterial = invalidCell.material as THREE.MeshBasicMaterial;

    expect(validCell).toBeInstanceOf(THREE.Mesh);
    expect(validCell.position.toArray()).toEqual([2.5, 0.012, 3.5]);
    expect(invalidCell.position.toArray()).toEqual([4.5, 1.512, 5.5]);
    expect(validCell.rotation.x).toBeCloseTo(-Math.PI / 2);
    expect(validMaterial.color.getHex()).toBe(0x42d17a);
    expect(invalidMaterial.color.getHex()).toBe(0xff5e73);
    expect(validMaterial.transparent).toBe(true);
    expect(validMaterial.opacity).toBeCloseTo(0.42);
    expect(validMaterial.depthTest).toBe(false);
    expect(validMaterial.depthWrite).toBe(false);
    expect(validCell.renderOrder).toBe(960);
    expect(validCell.raycast({} as THREE.Raycaster, [])).toBeUndefined();
    expect(runtime.container.dataset.areaTilePlacementPreviewStatus).toBe("visible");
    expect(runtime.container.dataset.areaTilePlacementPreviewCellCount).toBe("2");
    expect(runtime.container.dataset.areaTilePlacementPreviewValid).toBe("false");
  });

  it("replaces the named overlay and clears it without leaving duplicate cells", () => {
    const runtime = createRuntimeStub();
    const firstOverlay = syncAreaTilePlacementPreviewOverlay(runtime, {
      cells: [{ col: 0, row: 0, valid: true }]
    });

    const nextOverlay = syncAreaTilePlacementPreviewOverlay(runtime, {
      cells: [{ col: 7, row: 8, valid: false }],
      cellSize: 2,
      elevation: 0.5,
      opacity: 0.6
    });

    expect(firstOverlay?.parent).toBeNull();
    expect(runtime.scene.children).toEqual([nextOverlay]);
    expect(nextOverlay?.children).toHaveLength(1);
    const cell = nextOverlay?.children[0] as THREE.Mesh;
    expect(cell.position.toArray()).toEqual([15, 0.512, 17]);
    expect((cell.material as THREE.MeshBasicMaterial).opacity).toBeCloseTo(0.6);

    clearAreaTilePlacementPreviewOverlay(runtime);

    expect(runtime.scene.children).toHaveLength(0);
    expect(runtime.container.dataset.areaTilePlacementPreviewStatus).toBe("cleared");
    expect(runtime.container.dataset.areaTilePlacementPreviewCellCount).toBe("0");
  });

  it("removes the current overlay when no preview cells remain", () => {
    const runtime = createRuntimeStub();
    syncAreaTilePlacementPreviewOverlay(runtime, {
      cells: [{ col: 0, row: 0, valid: true }]
    });

    const overlay = syncAreaTilePlacementPreviewOverlay(runtime, { cells: [] });

    expect(overlay).toBeNull();
    expect(runtime.scene.getObjectByName(AREA_TILE_PLACEMENT_PREVIEW_OVERLAY_NAME)).toBeUndefined();
  });
});
