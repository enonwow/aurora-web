import { createHash } from "node:crypto";

export interface SvgThumbnailPayload {
  contentType: "image/svg+xml; charset=utf-8";
  size: number;
  etag: string;
  bytes: Buffer;
  fileName: string;
}

export function escapeSvgText(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&apos;");
}

export function truncateSvgText(value: string, maxLength: number): string {
  const normalized = value.trim().replace(/\s+/gu, " ");
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return normalized.slice(0, Math.max(1, maxLength - 1)).trimEnd() + "...";
}

export function buildSvgThumbnailPayload(input: {
  svg: string;
  fileName: string;
  etagSeed: string;
}): SvgThumbnailPayload {
  const bytes = Buffer.from(input.svg, "utf-8");
  const etagHash = createHash("sha256")
    .update(input.etagSeed)
    .update(bytes)
    .digest("hex")
    .slice(0, 24);

  return {
    contentType: "image/svg+xml; charset=utf-8",
    size: bytes.length,
    etag: `W/"${etagHash}"`,
    bytes,
    fileName: input.fileName
  };
}

export function normalizeThumbnailFileStem(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9._-]+/gu, "_");
  return normalized || "thumbnail";
}
