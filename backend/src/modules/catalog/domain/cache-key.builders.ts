import { createHash } from "node:crypto";
import type { PlaceableSubtype } from "./template.types";

export function buildPlaceableProcessCacheKey(
  templateId: string,
  resref: string,
  subtype: PlaceableSubtype,
  fingerprint = "stable"
): string {
  return createHash("sha256")
    .update(`placeable-process/v2|${templateId}|${resref}|${subtype}|${fingerprint}`)
    .digest("hex");
}

export function buildTemplateProcessCacheKey(
  kind: "creature" | "item",
  templateId: string,
  resref: string,
  fingerprint = "stable"
): string {
  return createHash("sha256")
    .update(`template-process/v2|${kind}|${templateId}|${resref}|${fingerprint}`)
    .digest("hex");
}
