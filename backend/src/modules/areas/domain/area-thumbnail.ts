import {
  buildSvgThumbnailPayload,
  escapeSvgText,
  normalizeThumbnailFileStem,
  truncateSvgText,
  type SvgThumbnailPayload
} from "../../../common/preview/svg-thumbnail";
import { countAreaObjectsByKind } from "./area-processing.builders";
import type { AreaObjectCounts, AreaObjectKind, AreaRecord } from "./area.types";

const AREA_THUMBNAIL_WIDTH = 96;
const AREA_THUMBNAIL_HEIGHT = 72;
const AREA_MAP_MARGIN = 5;
const AREA_MAP_WIDTH = AREA_THUMBNAIL_WIDTH - AREA_MAP_MARGIN * 2;
const AREA_MAP_HEIGHT = AREA_THUMBNAIL_HEIGHT - AREA_MAP_MARGIN * 2;
const AREA_OBJECT_DOT_LIMIT = 180;

const AREA_OBJECT_COLORS: Record<AreaObjectKind, string> = {
  placeable: "#8bd3ff",
  door: "#ffc970",
  creature: "#ff8e78",
  item: "#91e8a5",
  sound: "#bba0ff"
};

export function buildAreaPreviewImageUrl(areaId: string): string {
  return `/api/v1/areas/${encodeURIComponent(areaId)}/thumbnail`;
}

export function withAreaPreviewImageUrl<TArea extends { areaId: string; previewImageUrl: string }>(
  area: TArea
): TArea {
  return {
    ...area,
    previewImageUrl: buildAreaPreviewImageUrl(area.areaId)
  };
}

export function buildAreaThumbnailPayload(
  area: AreaRecord,
  composition: AreaObjectCounts = countAreaObjectsByKind(area.objects)
): SvgThumbnailPayload {
  const mapGrid = buildAreaGrid(area);
  const objectDots = buildAreaObjectDots(area);
  const label = escapeSvgText(truncateSvgText(area.name || area.areaId, 16));
  const meta = escapeSvgText(truncateSvgText(`${area.width}x${area.height}`, 10));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${AREA_THUMBNAIL_WIDTH}" height="${AREA_THUMBNAIL_HEIGHT}" viewBox="0 0 ${AREA_THUMBNAIL_WIDTH} ${AREA_THUMBNAIL_HEIGHT}" role="img" aria-label="${label} area thumbnail">
  <defs>
    <filter id="area-shadow" x="-8%" y="-8%" width="116%" height="116%">
      <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000716" flood-opacity="0.7"/>
    </filter>
  </defs>
  <rect x="1" y="1" width="94" height="70" rx="7" fill="#07111f" stroke="#34557d" stroke-width="2"/>
  <g filter="url(#area-shadow)">
  <rect x="${AREA_MAP_MARGIN}" y="${AREA_MAP_MARGIN}" width="${AREA_MAP_WIDTH}" height="${AREA_MAP_HEIGHT}" rx="3" fill="#111821" stroke="#486f99" stroke-width="1"/>
  ${mapGrid}
  ${objectDots}
  </g>
  <rect x="7" y="56" width="82" height="10" rx="3" fill="#07111f" fill-opacity="0.76"/>
  <text x="11" y="64" font-family="Segoe UI, Arial, sans-serif" font-size="7" font-weight="700" fill="#f0f6ff">${label}</text>
  <text x="85" y="64" text-anchor="end" font-family="Segoe UI, Arial, sans-serif" font-size="6" fill="#9fc4ec">${meta}</text>
</svg>`;

  return buildSvgThumbnailPayload({
    svg,
    fileName: `${normalizeThumbnailFileStem(area.areaId)}.svg`,
    etagSeed: [
      "area-thumbnail/v1",
      area.areaId,
      area.updatedAt,
      area.width,
      area.height,
      composition.total,
      area.textureAtlasFingerprint
    ].join("|")
  });
}

function buildAreaGrid(area: AreaRecord): string {
  if (area.tiles && area.tiles.length > 0) {
    return buildAreaTileMosaic(area);
  }
  const cols = Math.max(1, Math.min(16, Math.round(area.width)));
  const rows = Math.max(1, Math.min(16, Math.round(area.height)));
  const cellWidth = AREA_MAP_WIDTH / cols;
  const cellHeight = AREA_MAP_HEIGHT / rows;
  const cells: string[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const fill = (row + col) % 2 === 0 ? "#173a54" : "#14324b";
      cells.push(
        `<rect x="${formatNumber(AREA_MAP_MARGIN + col * cellWidth)}" y="${formatNumber(
          AREA_MAP_MARGIN + row * cellHeight
        )}" width="${formatNumber(cellWidth + 0.2)}" height="${formatNumber(
          cellHeight + 0.2
        )}" fill="${fill}" fill-opacity="0.86"/>`
      );
    }
  }

  return cells.join("");
}

function buildAreaTileMosaic(area: AreaRecord): string {
  const cols = Math.max(1, Math.round(area.width));
  const rows = Math.max(1, Math.round(area.height));
  const cellWidth = AREA_MAP_WIDTH / cols;
  const cellHeight = AREA_MAP_HEIGHT / rows;
  const cells: string[] = [];

  for (const tile of area.tiles ?? []) {
    const col = Math.min(Math.max(tile.col, 0), cols - 1);
    const row = Math.min(Math.max(tile.row, 0), rows - 1);
    const fill = resolveAreaTileColor(tile);
    const opacity = tile.modelSource === "set-tile-section" ? 0.96 : 0.82;
    const x = AREA_MAP_MARGIN + col * cellWidth;
    const y = AREA_MAP_MARGIN + row * cellHeight;
    cells.push(
      `<rect x="${formatNumber(x)}" y="${formatNumber(y)}" width="${formatNumber(
        cellWidth + 0.12
      )}" height="${formatNumber(cellHeight + 0.12)}" fill="${fill}" fill-opacity="${opacity}"/>`
    );
    if ((tile.orientation ?? 0) % 2 === 1) {
      cells.push(
        `<path d="M${formatNumber(x + cellWidth * 0.14)} ${formatNumber(
          y + cellHeight * 0.84
        )} L${formatNumber(x + cellWidth * 0.84)} ${formatNumber(
          y + cellHeight * 0.14
        )}" stroke="#e4edf6" stroke-opacity="0.13" stroke-width="0.65"/>`
      );
    }
  }

  return cells.join("");
}

function buildAreaObjectDots(area: AreaRecord): string {
  const visibleObjects = area.objects.slice(0, AREA_OBJECT_DOT_LIMIT);
  if (visibleObjects.length < 1) {
    return `<circle cx="48" cy="36" r="7" fill="#274b68" stroke="#5f9cff" stroke-width="1.5" stroke-dasharray="2 2"/>`;
  }

  return visibleObjects
    .map((object, index) => {
      const x = AREA_MAP_MARGIN + clampRatio(object.x / Math.max(area.width, 1)) * AREA_MAP_WIDTH;
      const y =
        AREA_MAP_MARGIN +
        AREA_MAP_HEIGHT -
        clampRatio(object.y / Math.max(area.height, 1)) * AREA_MAP_HEIGHT;
      const radius = index < 40 ? 1.35 : 0.92;
      const color = AREA_OBJECT_COLORS[object.kind] ?? "#e7f2ff";
      return `<circle cx="${formatNumber(x)}" cy="${formatNumber(y)}" r="${radius}" fill="${color}" fill-opacity="0.92" stroke="#07111f" stroke-width="0.35"/>`;
    })
    .join("");
}

function resolveAreaTileColor(tile: NonNullable<AreaRecord["tiles"]>[number]): string {
  const source = [
    tile.tilesetResRef,
    tile.modelResRef ?? "",
    tile.tileId ?? tile.tileIndex,
    tile.orientation ?? 0,
    tile.height ?? 0
  ].join(":");
  const hash = hashString(source);
  const hue = (hash % 48) + 184;
  const saturation = 14 + ((hash >> 5) % 16);
  const lightness = 24 + ((hash >> 10) % 18) + Math.min(8, Math.abs(tile.height ?? 0) * 2);
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(value, 0), 1);
}

function formatNumber(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/u, "");
}
