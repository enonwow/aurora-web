import * as THREE from "three";
import type { AreaScene } from "../../contracts";
import type { RuntimeState } from "./workspaceThreeRuntime";

const CHUNK_SIZE = 4;

export function rebuildChunkBounds(
  runtime: RuntimeState,
  sceneData: AreaScene,
  enabled: boolean
): void {
  runtime.chunkLayer.children.forEach((child) => {
    if (child instanceof THREE.LineSegments) {
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
    }
  });
  runtime.chunkLayer.clear();

  if (!enabled) {
    return;
  }

  const points: number[] = [];
  const width = sceneData.width;
  const height = sceneData.height;
  for (let x = 0; x <= width; x += CHUNK_SIZE) {
    points.push(x, 0.02, 0, x, 0.02, height);
  }
  for (let y = 0; y <= height; y += CHUNK_SIZE) {
    points.push(0, 0.02, y, width, 0.02, y);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  const material = new THREE.LineBasicMaterial({
    color: new THREE.Color("#ffb873"),
    transparent: true,
    opacity: 0.72
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.name = "chunk-bounds";
  runtime.chunkLayer.add(lines);
}
