import type { SceneObject } from "../../scene/contracts";
import {
  resolveItemArmorPartModelResolutions,
  resolveItemModelPartResolutions
} from "./itemRenderAssetResolver";

export function shouldPreferItemModelThumbnailOverIcon(object: SceneObject): boolean {
  if (object.kind !== "items") {
    return false;
  }

  const armorResolutions = resolveItemArmorPartModelResolutions(object);
  if (armorResolutions.length > 0) {
    return true;
  }

  return resolveItemModelPartResolutions(object).length > 0;
}
