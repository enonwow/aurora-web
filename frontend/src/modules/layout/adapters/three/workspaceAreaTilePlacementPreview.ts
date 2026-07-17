import * as THREE from "three";
import type { RuntimeState } from "./workspaceThreeRuntime";

export const AREA_TILE_PLACEMENT_PREVIEW_OVERLAY_NAME =
  "aurora-area-tile-placement-preview-overlay";

const AREA_TILE_PLACEMENT_PREVIEW_CELL_NAME =
  "aurora-area-tile-placement-preview-cell";
const VALID_CELL_COLOR = 0x42d17a;
const INVALID_CELL_COLOR = 0xff5e73;
const DEFAULT_CELL_SIZE = 1;
const DEFAULT_ELEVATION = 0;
const DEFAULT_OPACITY = 0.42;
const CELL_INSET = 0.06;
const CELL_ELEVATION_OFFSET = 0.012;
const CELL_RENDER_ORDER = 960;

/** A tile-grid coordinate and whether placing the active tile there is allowed. */
export interface AreaTilePlacementPreviewCell {
  col: number;
  row: number;
  valid: boolean;
  /** Optional terrain-relative elevation for this individual cell. */
  elevation?: number;
}

export interface AreaTilePlacementPreviewInput {
  cells: readonly AreaTilePlacementPreviewCell[];
  /** Read-only proof metadata describing the domain preview shown by the overlay. */
  kind?: string;
  anchor?: { col: number; row: number };
  targetEdge?: "top" | "right" | "bottom" | "left";
  /** World units occupied by one tile-grid cell. Defaults to one Aurora tile. */
  cellSize?: number;
  /** Default elevation used when a cell does not supply one. */
  elevation?: number;
  opacity?: number;
}

type AreaTilePlacementPreviewRuntime = Pick<RuntimeState, "scene" | "container">;

function resolvePositiveFinite(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function resolveFinite(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function resolveOpacity(value: number | undefined): number {
  return Math.min(1, Math.max(0, resolveFinite(value, DEFAULT_OPACITY)));
}

function disposePreviewOverlay(overlay: THREE.Object3D): void {
  const disposedMaterials = new Set<THREE.Material>();
  const disposedGeometries = new Set<THREE.BufferGeometry>();

  overlay.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    if (!disposedGeometries.has(node.geometry)) {
      node.geometry.dispose();
      disposedGeometries.add(node.geometry);
    }
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      if (!disposedMaterials.has(material)) {
        material.dispose();
        disposedMaterials.add(material);
      }
    });
  });
}

function findPreviewOverlays(scene: THREE.Scene): THREE.Object3D[] {
  return scene.children.filter(
    (child) => child.name === AREA_TILE_PLACEMENT_PREVIEW_OVERLAY_NAME
  );
}

/** Removes every direct scene overlay owned by the area-tile placement preview. */
export function clearAreaTilePlacementPreviewOverlay(
  runtime: AreaTilePlacementPreviewRuntime
): void {
  findPreviewOverlays(runtime.scene).forEach((overlay) => {
    overlay.removeFromParent();
    disposePreviewOverlay(overlay);
  });
  runtime.container.dataset.areaTilePlacementPreviewStatus = "cleared";
  runtime.container.dataset.areaTilePlacementPreviewCellCount = "0";
  delete runtime.container.dataset.areaTilePlacementPreviewValid;
  delete runtime.container.dataset.areaTilePlacementPreviewCells;
  delete runtime.container.dataset.areaTilePlacementPreviewKind;
  delete runtime.container.dataset.areaTilePlacementPreviewAnchor;
  delete runtime.container.dataset.areaTilePlacementPreviewTargetEdge;
}

/**
 * Replaces the placement-preview overlay with transparent, non-interactive grid cells.
 * The helper deliberately owns only a named direct child of `runtime.scene`, so callers
 * can safely invoke it on every pointer update and clear it on cancellation/unmount.
 */
export function syncAreaTilePlacementPreviewOverlay(
  runtime: AreaTilePlacementPreviewRuntime,
  input: AreaTilePlacementPreviewInput
): THREE.Group | null {
  clearAreaTilePlacementPreviewOverlay(runtime);
  if (input.cells.length === 0) {
    return null;
  }

  const cellSize = resolvePositiveFinite(input.cellSize, DEFAULT_CELL_SIZE);
  const cellExtent = Math.max(0.02, cellSize - CELL_INSET * 2);
  const defaultElevation = resolveFinite(input.elevation, DEFAULT_ELEVATION);
  const opacity = resolveOpacity(input.opacity);
  const overlay = new THREE.Group();
  overlay.name = AREA_TILE_PLACEMENT_PREVIEW_OVERLAY_NAME;
  overlay.renderOrder = CELL_RENDER_ORDER;
  overlay.userData.auroraAreaTilePlacementPreview = true;

  input.cells.forEach((cell, index) => {
    if (!Number.isFinite(cell.col) || !Number.isFinite(cell.row)) {
      return;
    }
    const elevation = resolveFinite(cell.elevation, defaultElevation);
    const material = new THREE.MeshBasicMaterial({
      color: cell.valid ? VALID_CELL_COLOR : INVALID_CELL_COLOR,
      transparent: true,
      opacity,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(cellExtent, cellExtent), material);
    mesh.name = `${AREA_TILE_PLACEMENT_PREVIEW_CELL_NAME}-${index}`;
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(
      (cell.col + 0.5) * cellSize,
      elevation + CELL_ELEVATION_OFFSET,
      (cell.row + 0.5) * cellSize
    );
    mesh.renderOrder = CELL_RENDER_ORDER;
    mesh.raycast = () => undefined;
    mesh.userData.auroraAreaTilePlacementPreviewCell = {
      col: cell.col,
      row: cell.row,
      valid: cell.valid
    };
    overlay.add(mesh);
  });

  if (overlay.children.length === 0) {
    disposePreviewOverlay(overlay);
    return null;
  }
  runtime.scene.add(overlay);
  runtime.container.dataset.areaTilePlacementPreviewStatus = "visible";
  runtime.container.dataset.areaTilePlacementPreviewCellCount = String(overlay.children.length);
  runtime.container.dataset.areaTilePlacementPreviewValid = String(
    input.cells.every((cell) => cell.valid)
  );
  runtime.container.dataset.areaTilePlacementPreviewCells = JSON.stringify(
    input.cells.map((cell) => ({ col: cell.col, row: cell.row, valid: cell.valid }))
  );
  runtime.container.dataset.areaTilePlacementPreviewKind = input.kind ?? "unknown";
  runtime.container.dataset.areaTilePlacementPreviewAnchor = input.anchor
    ? JSON.stringify(input.anchor)
    : "";
  runtime.container.dataset.areaTilePlacementPreviewTargetEdge = input.targetEdge ?? "";
  return overlay;
}
