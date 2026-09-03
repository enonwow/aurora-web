import type * as THREE from "three";

export interface AuroraVfxDrawQueueRecord {
  version: "aurora-vfx-draw-queue/v1";
  laneKey: string;
  referencedObjectContextKey: string;
  renderOrderShort: number;
  depthKeySource: "three-render-item-camera-depth-z";
  comparatorSource: "aurora-fun-00a7fb8c";
  comparisonScope: "depth_then_renderorder_for_same_nonzero_context";
}

export interface AuroraVfxDrawQueueRecordInput {
  laneKey: string;
  referencedObjectContextKey: string;
  renderOrderShort: number;
}

interface AuroraThreeRenderItem {
  id: number;
  object: THREE.Object3D;
  material: { id: number };
  materialVariant?: number;
  groupOrder: number;
  renderOrder: number;
  z: number;
}

type AuroraThreeRenderItemComparator = (
  left: AuroraThreeRenderItem,
  right: AuroraThreeRenderItem
) => number;

interface AuroraVfxSortableRenderer {
  setOpaqueSort(method: AuroraThreeRenderItemComparator | null): void;
  setTransparentSort(method: AuroraThreeRenderItemComparator | null): void;
}

function normalizeSignedShort(value: number): number {
  const integer = Number.isFinite(value) ? Math.trunc(value) : 0;
  return ((integer + 0x8000) & 0xffff) - 0x8000;
}

function isRenderableDrawObject(object: THREE.Object3D): boolean {
  const candidate = object as THREE.Object3D & {
    isMesh?: boolean;
    isLine?: boolean;
    isPoints?: boolean;
    isSprite?: boolean;
  };
  return (
    candidate.isMesh === true ||
    candidate.isLine === true ||
    candidate.isPoints === true ||
    candidate.isSprite === true
  );
}

export function attachAuroraVfxDrawQueueRecord(
  root: THREE.Object3D,
  input: AuroraVfxDrawQueueRecordInput
): void {
  const record: AuroraVfxDrawQueueRecord = {
    version: "aurora-vfx-draw-queue/v1",
    laneKey: input.laneKey,
    referencedObjectContextKey: input.referencedObjectContextKey,
    renderOrderShort: normalizeSignedShort(input.renderOrderShort),
    depthKeySource: "three-render-item-camera-depth-z",
    comparatorSource: "aurora-fun-00a7fb8c",
    comparisonScope: "depth_then_renderorder_for_same_nonzero_context"
  };

  root.traverse((node) => {
    if (!isRenderableDrawObject(node)) {
      return;
    }
    node.renderOrder = 0;
    node.userData = {
      ...node.userData,
      auroraVfxDrawQueueRecord: record,
      auroraVfxDrawQueueLaneKey: record.laneKey,
      auroraVfxDrawQueueReferencedObjectContextKey:
        record.referencedObjectContextKey,
      auroraVfxDrawQueueRenderOrderShort: record.renderOrderShort,
      auroraVfxDrawQueueDepthKeySource: record.depthKeySource,
      auroraVfxDrawQueueComparatorSource: record.comparatorSource,
      auroraVfxDrawQueueComparisonScope: record.comparisonScope,
      auroraVfxThreeRenderOrderSourceTruth: false
    };
  });
}

function readAuroraVfxDrawQueueRecord(
  item: AuroraThreeRenderItem
): AuroraVfxDrawQueueRecord | undefined {
  const value = item.object.userData?.auroraVfxDrawQueueRecord as
    | Partial<AuroraVfxDrawQueueRecord>
    | undefined;
  return value?.version === "aurora-vfx-draw-queue/v1" &&
    typeof value.laneKey === "string" &&
    typeof value.referencedObjectContextKey === "string" &&
    typeof value.renderOrderShort === "number"
    ? (value as AuroraVfxDrawQueueRecord)
    : undefined;
}

function compareAuroraVfxDrawQueueItems(
  left: AuroraThreeRenderItem,
  right: AuroraThreeRenderItem
): number | undefined {
  const leftRecord = readAuroraVfxDrawQueueRecord(left);
  const rightRecord = readAuroraVfxDrawQueueRecord(right);
  if (!leftRecord || !rightRecord || leftRecord.laneKey !== rightRecord.laneKey) {
    return undefined;
  }
  if (!Number.isFinite(left.z) || !Number.isFinite(right.z)) {
    return 0;
  }
  if (left.z < right.z) {
    return -1;
  }
  if (left.z > right.z) {
    return 1;
  }
  if (
    leftRecord.referencedObjectContextKey.length > 0 &&
    leftRecord.referencedObjectContextKey === rightRecord.referencedObjectContextKey
  ) {
    return leftRecord.renderOrderShort - rightRecord.renderOrderShort;
  }
  return 0;
}

function compareOpaqueFallback(
  left: AuroraThreeRenderItem,
  right: AuroraThreeRenderItem
): number {
  return (
    left.groupOrder - right.groupOrder ||
    left.renderOrder - right.renderOrder ||
    left.material.id - right.material.id ||
    (left.materialVariant ?? 0) - (right.materialVariant ?? 0) ||
    left.z - right.z ||
    left.id - right.id
  );
}

function compareTransparentFallback(
  left: AuroraThreeRenderItem,
  right: AuroraThreeRenderItem
): number {
  return (
    left.groupOrder - right.groupOrder ||
    left.renderOrder - right.renderOrder ||
    right.z - left.z ||
    left.id - right.id
  );
}

export const compareAuroraVfxOpaqueRenderItems: AuroraThreeRenderItemComparator = (
  left,
  right
) => compareAuroraVfxDrawQueueItems(left, right) ?? compareOpaqueFallback(left, right);

export const compareAuroraVfxTransparentRenderItems: AuroraThreeRenderItemComparator = (
  left,
  right
) => compareAuroraVfxDrawQueueItems(left, right) ?? compareTransparentFallback(left, right);

export function installAuroraVfxRenderQueueSort(
  renderer: AuroraVfxSortableRenderer
): void {
  renderer.setOpaqueSort(compareAuroraVfxOpaqueRenderItems);
  renderer.setTransparentSort(compareAuroraVfxTransparentRenderItems);
}
