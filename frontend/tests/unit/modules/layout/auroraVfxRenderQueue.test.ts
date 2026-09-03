import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import {
  attachAuroraVfxDrawQueueRecord,
  compareAuroraVfxOpaqueRenderItems,
  compareAuroraVfxTransparentRenderItems,
  installAuroraVfxRenderQueueSort
} from "../../../../src/modules/layout/adapters/three/auroraVfxRenderQueue";

function createRenderItem(input: {
  id: number;
  z: number;
  renderOrderShort?: number;
  contextKey?: string;
  laneKey?: string;
}) {
  const object = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshBasicMaterial()
  );
  if (input.renderOrderShort !== undefined) {
    attachAuroraVfxDrawQueueRecord(object, {
      laneKey: input.laneKey ?? "textured_quad:non_punch_transparent_lane",
      referencedObjectContextKey: input.contextKey ?? "object-a",
      renderOrderShort: input.renderOrderShort
    });
  }
  return {
    id: input.id,
    object,
    material: { id: input.id + 100 },
    materialVariant: 0,
    groupOrder: 0,
    renderOrder: object.renderOrder,
    z: input.z
  };
}

describe("Aurora VFX render queue", () => {
  it("uses camera depth before renderorder", () => {
    const near = createRenderItem({ id: 1, z: 1, renderOrderShort: 9 });
    const far = createRenderItem({ id: 2, z: 2, renderOrderShort: 1 });

    expect(compareAuroraVfxTransparentRenderItems(near, far)).toBeLessThan(0);
    expect(compareAuroraVfxOpaqueRenderItems(near, far)).toBeLessThan(0);
  });

  it("uses lower signed renderorder only when depth and object context tie", () => {
    const low = createRenderItem({
      id: 1,
      z: 3,
      renderOrderShort: -3,
      contextKey: "placeable-1"
    });
    const high = createRenderItem({
      id: 2,
      z: 3,
      renderOrderShort: 7,
      contextKey: "placeable-1"
    });

    expect(compareAuroraVfxTransparentRenderItems(low, high)).toBe(-10);
    expect(low.object.renderOrder).toBe(0);
    expect(low.object.userData.auroraVfxDrawQueueRenderOrderShort).toBe(-3);
  });

  it("does not invent a renderorder relation across referenced-object contexts", () => {
    const left = createRenderItem({
      id: 1,
      z: 3,
      renderOrderShort: -20,
      contextKey: "placeable-left"
    });
    const right = createRenderItem({
      id: 2,
      z: 3,
      renderOrderShort: 20,
      contextKey: "placeable-right"
    });

    expect(compareAuroraVfxTransparentRenderItems(left, right)).toBe(0);
  });

  it("retains Three fallback sorting outside a shared Aurora queue lane", () => {
    const left = createRenderItem({
      id: 1,
      z: 1,
      renderOrderShort: 0,
      laneKey: "textured_quad:non_punch_transparent_lane"
    });
    const right = createRenderItem({
      id: 2,
      z: 2,
      renderOrderShort: 0,
      laneKey: "chunk_model:non_punch_transparent_lane"
    });

    expect(compareAuroraVfxTransparentRenderItems(left, right)).toBeGreaterThan(0);
  });

  it("installs the Aurora comparator for opaque and transparent render lists", () => {
    const renderer = {
      setOpaqueSort: vi.fn(),
      setTransparentSort: vi.fn()
    };

    installAuroraVfxRenderQueueSort(renderer);

    expect(renderer.setOpaqueSort).toHaveBeenCalledWith(compareAuroraVfxOpaqueRenderItems);
    expect(renderer.setTransparentSort).toHaveBeenCalledWith(
      compareAuroraVfxTransparentRenderItems
    );
  });
});
