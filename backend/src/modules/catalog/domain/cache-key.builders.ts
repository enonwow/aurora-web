import { createHash } from "node:crypto";
import type { PlaceableSubtype } from "./template.types";

export function buildPlaceableProcessCacheKey(
  templateId: string,
  resref: string,
  subtype: PlaceableSubtype
): string {
  return createHash("sha256")
    .update(`placeable-process/v1|${templateId}|${resref}|${subtype}`)
    .digest("hex");
}

export function buildTemplateProcessCacheKey(
  kind: "creature" | "item",
  templateId: string,
  resref: string
): string {
  return createHash("sha256")
    .update(`template-process/v1|${kind}|${templateId}|${resref}`)
    .digest("hex");
}
