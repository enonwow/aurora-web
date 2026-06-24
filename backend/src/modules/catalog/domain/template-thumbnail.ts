import {
  buildSvgThumbnailPayload,
  escapeSvgText,
  normalizeThumbnailFileStem,
  truncateSvgText,
  type SvgThumbnailPayload
} from "../../../common/preview/svg-thumbnail";
import type { PlaceableSubtype, TemplateRecord } from "./template.types";

const PLACEABLE_THUMBNAIL_WIDTH = 96;
const PLACEABLE_THUMBNAIL_HEIGHT = 72;

const SUBTYPE_COLORS: Record<PlaceableSubtype, string> = {
  generic: "#5f9cff",
  door: "#ffc970",
  vfx: "#bba0ff",
  container: "#91e8a5",
  light_source: "#ffe28a",
  trigger_proxy: "#ff8e78"
};

export function buildPlaceablePreviewImageUrl(templateId: string): string {
  return `/api/v1/catalog/placeables/${encodeURIComponent(templateId)}/thumbnail`;
}

export function withPlaceablePreviewImageUrl<TTemplate extends TemplateRecord>(
  template: TTemplate
): TTemplate {
  if (template.kind !== "placeable") {
    return template;
  }
  return {
    ...template,
    previewImageUrl: buildPlaceablePreviewImageUrl(template.templateId)
  };
}

export function buildPlaceableThumbnailPayload(template: TemplateRecord): SvgThumbnailPayload {
  const subtype = template.placeableSubtype ?? "generic";
  const accent = SUBTYPE_COLORS[subtype] ?? SUBTYPE_COLORS.generic;
  const label = escapeSvgText(truncateSvgText(template.resref || template.templateId, 16));
  const category = escapeSvgText(truncateSvgText(template.category, 18));
  const subtypeLabel = escapeSvgText(truncateSvgText(subtype.replace(/_/gu, " "), 14));
  const visual = buildSubtypeVisual(subtype, accent);
  const metadataLine = escapeSvgText(truncateSvgText(resolveTemplateMetadataLine(template), 20));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PLACEABLE_THUMBNAIL_WIDTH}" height="${PLACEABLE_THUMBNAIL_HEIGHT}" viewBox="0 0 ${PLACEABLE_THUMBNAIL_WIDTH} ${PLACEABLE_THUMBNAIL_HEIGHT}" role="img" aria-label="${label} placeable thumbnail">
  <defs>
    <radialGradient id="plc-glow" cx="0.5" cy="0.28" r="0.78">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.44"/>
      <stop offset="1" stop-color="#07111f" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="1" y="1" width="94" height="70" rx="7" fill="#081421" stroke="#34557d" stroke-width="2"/>
  <rect x="6" y="6" width="84" height="42" rx="5" fill="url(#plc-glow)"/>
  ${visual}
  <rect x="7" y="51" width="82" height="15" rx="3" fill="#07111f" fill-opacity="0.74"/>
  <text x="11" y="59" font-family="Segoe UI, Arial, sans-serif" font-size="7" font-weight="700" fill="#f0f6ff">${label}</text>
  <text x="11" y="66" font-family="Segoe UI, Arial, sans-serif" font-size="5.5" fill="#9fc4ec">${category}</text>
  <text x="85" y="59" text-anchor="end" font-family="Segoe UI, Arial, sans-serif" font-size="5.5" fill="#c7d9ee">${subtypeLabel}</text>
  <text x="85" y="66" text-anchor="end" font-family="Segoe UI, Arial, sans-serif" font-size="5.5" fill="#9fc4ec">${metadataLine}</text>
</svg>`;

  return buildSvgThumbnailPayload({
    svg,
    fileName: `${normalizeThumbnailFileStem(template.templateId)}.svg`,
    etagSeed: [
      "placeable-thumbnail/v1",
      template.templateId,
      template.resref,
      template.placeableSubtype ?? "",
      template.category,
      JSON.stringify(template.metadata)
    ].join("|")
  });
}

function buildSubtypeVisual(subtype: PlaceableSubtype, accent: string): string {
  switch (subtype) {
    case "door":
      return `<rect x="38" y="13" width="21" height="32" rx="2" fill="#20160d" stroke="${accent}" stroke-width="2"/>
  <line x1="48.5" y1="15" x2="48.5" y2="45" stroke="${accent}" stroke-opacity="0.55"/>
  <circle cx="53" cy="30" r="1.7" fill="#fff2c7"/>`;
    case "vfx":
      return `<circle cx="48" cy="28" r="14" fill="none" stroke="${accent}" stroke-width="2" stroke-opacity="0.75"/>
  <circle cx="48" cy="28" r="6" fill="${accent}" fill-opacity="0.45"/>
  <path d="M48 10 L52 24 L66 22 L55 31 L62 44 L48 35 L34 44 L41 31 L30 22 L44 24 Z" fill="${accent}" fill-opacity="0.28" stroke="${accent}" stroke-width="1"/>`;
    case "container":
      return `<path d="M28 26 L48 14 L68 26 L48 39 Z" fill="${accent}" fill-opacity="0.55" stroke="${accent}" stroke-width="1.5"/>
  <path d="M28 26 L28 42 L48 54 L48 39 Z" fill="#1b3550" stroke="${accent}" stroke-width="1.2"/>
  <path d="M68 26 L68 42 L48 54 L48 39 Z" fill="#10263f" stroke="${accent}" stroke-width="1.2"/>`;
    case "light_source":
      return `<circle cx="48" cy="28" r="18" fill="${accent}" fill-opacity="0.22"/>
  <circle cx="48" cy="28" r="8" fill="${accent}" fill-opacity="0.7"/>
  <rect x="45" y="35" width="6" height="12" rx="2" fill="#20344f" stroke="${accent}" stroke-width="1"/>`;
    case "trigger_proxy":
      return `<rect x="29" y="15" width="38" height="30" rx="5" fill="${accent}" fill-opacity="0.18" stroke="${accent}" stroke-width="2" stroke-dasharray="4 3"/>
  <path d="M37 30 H59 M48 19 V41" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>`;
    case "generic":
    default:
      return `<path d="M30 31 L48 17 L66 31 L48 45 Z" fill="${accent}" fill-opacity="0.62" stroke="${accent}" stroke-width="1.5"/>
  <path d="M30 31 L30 42 L48 55 L48 45 Z" fill="#193753" stroke="${accent}" stroke-opacity="0.75"/>
  <path d="M66 31 L66 42 L48 55 L48 45 Z" fill="#0e263f" stroke="${accent}" stroke-opacity="0.75"/>`;
  }
}

function resolveTemplateMetadataLine(template: TemplateRecord): string {
  const model = readMetadataString(template, "modelResRef");
  if (model) {
    return model;
  }
  const appearance = readMetadataNumber(template, "appearanceId");
  if (appearance !== null) {
    return `appearance ${appearance}`;
  }
  const genericType = readMetadataNumber(template, "genericType");
  if (genericType !== null) {
    return `generic ${genericType}`;
  }
  return template.benchmarkCandidate ? "benchmark" : "source";
}

function readMetadataString(template: TemplateRecord, key: string): string | null {
  const value = template.metadata[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readMetadataNumber(template: TemplateRecord, key: string): number | null {
  const value = template.metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
