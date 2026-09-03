import { createHash } from "node:crypto";
import { AURORA_MDL_TO_GLB_CONVERTER_VERSION } from "../../runtime-settings/domain/derived-asset-versions";
import type { PlaceableSubtype, TemplateKind } from "./template.types";

export const DEFAULT_PLACEABLE_PROCESS_FINGERPRINT =
  "stable|derived:on|source-scan:on|texture-lookup:on|appearance-lookup:v5-instance-alias-box-tokens";
export const CREATURE_TEMPLATE_RENDER_FINGERPRINT =
  "creature-render:runtime-body-candidates-v16-equipment-capart-hand-node-anchors";
export const ITEM_TEMPLATE_RENDER_FINGERPRINT =
  "item-render:baseitems-modeltype-v9-single-piece-item-source";

export function buildPlaceableProcessCacheKey(
  templateId: string,
  resref: string,
  subtype: PlaceableSubtype,
  fingerprint = DEFAULT_PLACEABLE_PROCESS_FINGERPRINT
): string {
  return createHash("sha256")
    .update(
      [
        "placeable-process/v8",
        AURORA_MDL_TO_GLB_CONVERTER_VERSION,
        templateId,
        resref,
        subtype,
        fingerprint
      ].join("|")
    )
    .digest("hex");
}

export function buildTemplateProcessCacheKey(
  kind: Exclude<TemplateKind, "placeable">,
  templateId: string,
  resref: string,
  fingerprint = "stable"
): string {
  const effectiveFingerprint =
    kind === "creature"
      ? `${fingerprint}|${CREATURE_TEMPLATE_RENDER_FINGERPRINT}`
      : kind === "item"
        ? `${fingerprint}|${ITEM_TEMPLATE_RENDER_FINGERPRINT}`
        : fingerprint;
  const cacheFingerprint =
    kind === "creature" || kind === "item"
      ? `${effectiveFingerprint}|${AURORA_MDL_TO_GLB_CONVERTER_VERSION}`
      : effectiveFingerprint;
  return createHash("sha256")
    .update(`template-process/v2|${kind}|${templateId}|${resref}|${cacheFingerprint}`)
    .digest("hex");
}
