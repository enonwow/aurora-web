import type {
  SceneObject,
  SceneObjectItemMaterialColors,
  SceneObjectItemProperties,
  SceneObjectItemPropertyEntry
} from "../../scene/contracts";
import { normalizeAuroraPltPaletteRow } from "../../placeables/adapters/aurora/auroraPltPalette";

export interface ItemModelPartPresentation {
  readonly slot: "part1" | "part2" | "part3";
  readonly label: string;
  readonly value: number;
  readonly resRef?: string;
}

export interface ItemMaterialColorPresentation {
  readonly slot: keyof SceneObjectItemMaterialColors;
  readonly label: string;
  readonly value: number;
  readonly colorHex: string;
}

export interface ItemArmorPartPresentation {
  readonly slot: string;
  readonly label: string;
  readonly value: number;
}

const ITEM_MATERIAL_COLOR_LABELS: Record<keyof SceneObjectItemMaterialColors, string> = {
  leather1: "Leather 1",
  leather2: "Leather 2",
  cloth1: "Cloth 1",
  cloth2: "Cloth 2",
  metal1: "Metal 1",
  metal2: "Metal 2"
};

const ITEM_PART_SLOTS = ["part1", "part2", "part3"] as const;
const ITEM_ARMOR_PART_LABELS = {
  rFoot: "R Foot",
  lFoot: "L Foot",
  rShin: "R Shin",
  lShin: "L Shin",
  lThigh: "L Thigh",
  rThigh: "R Thigh",
  pelvis: "Pelvis",
  torso: "Torso",
  belt: "Belt",
  neck: "Neck",
  rFArm: "R Forearm",
  lFArm: "L Forearm",
  rBicep: "R Bicep",
  lBicep: "L Bicep",
  rShoul: "R Shoulder",
  lShoul: "L Shoulder",
  rHand: "R Hand",
  lHand: "L Hand",
  robe: "Robe"
} as const;
export const AURORA_ITEM_PLT_LAYER_BY_MATERIAL_COLOR: Readonly<
  Record<keyof SceneObjectItemMaterialColors, number>
> = {
  metal1: 2,
  metal2: 3,
  cloth1: 4,
  cloth2: 5,
  leather1: 6,
  leather2: 7
};
const ITEM_ARMOR_MATERIAL_COLOR_SLOT_BY_PART: Readonly<
  Record<string, keyof SceneObjectItemMaterialColors>
> = {
  rFoot: "leather2",
  lFoot: "leather2",
  rShin: "leather2",
  lShin: "leather2",
  rThigh: "leather2",
  lThigh: "leather2",
  pelvis: "leather2",
  torso: "leather1",
  belt: "cloth2",
  robe: "cloth1",
  neck: "metal1",
  rShoul: "metal1",
  lShoul: "metal1",
  rBicep: "metal2",
  lBicep: "metal2",
  rFArm: "metal2",
  lFArm: "metal2",
  rHand: "metal2",
  lHand: "metal2"
};
const MATERIAL_COLOR_HUES: Record<keyof SceneObjectItemMaterialColors, number> = {
  leather1: 28,
  leather2: 42,
  cloth1: 205,
  cloth2: 258,
  metal1: 214,
  metal2: 190
};

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const normalizedHue = ((hue % 360) + 360) % 360;
  const x = chroma * (1 - Math.abs(((normalizedHue / 60) % 2) - 1));
  const match = lightness - chroma / 2;
  const [r1, g1, b1] =
    normalizedHue < 60
      ? [chroma, x, 0]
      : normalizedHue < 120
        ? [x, chroma, 0]
        : normalizedHue < 180
          ? [0, chroma, x]
          : normalizedHue < 240
            ? [0, x, chroma]
            : normalizedHue < 300
              ? [x, 0, chroma]
              : [chroma, 0, x];

  const toHex = (component: number) =>
    clampByte((component + match) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
}

function readModelPartValues(properties: SceneObjectItemProperties | undefined): number[] {
  if (properties?.modelParts?.length) {
    return properties.modelParts;
  }
  return [properties?.modelPart1, properties?.modelPart2, properties?.modelPart3].filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  );
}

export function resolveItemModelParts(object: SceneObject): ItemModelPartPresentation[] {
  const values = readModelPartValues(object.itemProperties);
  const resRefs = object.itemProperties?.modelPartResRefs ?? [];
  const roles = object.itemProperties?.modelPartResRefRoles ?? [];
  return values.slice(0, ITEM_PART_SLOTS.length).map((value, index) => ({
    slot: ITEM_PART_SLOTS[index],
    label: roles[index] === "cloak" ? "Cloak" : `Part ${index + 1}`,
    value,
    ...(resRefs[index] ? { resRef: resRefs[index] } : {})
  }));
}

export function resolveItemMaterialColors(object: SceneObject): ItemMaterialColorPresentation[] {
  const materialColors = object.itemProperties?.materialColors;
  if (!materialColors) {
    return [];
  }
  return (Object.keys(ITEM_MATERIAL_COLOR_LABELS) as Array<keyof SceneObjectItemMaterialColors>)
    .map((slot) => {
      const value = materialColors[slot];
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return null;
      }
      return {
        slot,
        label: ITEM_MATERIAL_COLOR_LABELS[slot],
        value,
        colorHex: resolveItemMaterialColorHex(slot, value)
      };
    })
    .filter((entry): entry is ItemMaterialColorPresentation => Boolean(entry));
}

export function resolveItemArmorParts(object: SceneObject): ItemArmorPartPresentation[] {
  const armorParts = object.itemProperties?.armorParts;
  if (!armorParts) {
    return [];
  }
  const entries: ItemArmorPartPresentation[] = [];
  (Object.keys(ITEM_ARMOR_PART_LABELS) as Array<keyof typeof ITEM_ARMOR_PART_LABELS>).forEach(
    (slot) => {
      const value = armorParts[slot];
      if (typeof value === "number" && Number.isFinite(value)) {
        entries.push({
          slot,
          label: ITEM_ARMOR_PART_LABELS[slot],
          value
        });
      }
    }
  );
  return entries;
}

export function resolveItemArmorMaterialColorSlot(
  armorPartSlot: string | undefined
): keyof SceneObjectItemMaterialColors {
  if (!armorPartSlot) {
    return "leather1";
  }
  return ITEM_ARMOR_MATERIAL_COLOR_SLOT_BY_PART[armorPartSlot] ?? "leather1";
}

export function buildItemPltPaletteRowsByLayer(
  colors: SceneObjectItemMaterialColors | undefined
): Record<number, number> | undefined {
  if (!colors) {
    return undefined;
  }

  const rowsByLayer: Record<number, number> = {};
  (Object.keys(AURORA_ITEM_PLT_LAYER_BY_MATERIAL_COLOR) as Array<
    keyof SceneObjectItemMaterialColors
  >).forEach((slot) => {
    const value = colors[slot];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return;
    }
    rowsByLayer[AURORA_ITEM_PLT_LAYER_BY_MATERIAL_COLOR[slot]] =
      normalizeAuroraPltPaletteRow(value);
  });

  return Object.keys(rowsByLayer).length > 0 ? rowsByLayer : undefined;
}

export function resolveItemMaterialColorHex(
  slot: keyof SceneObjectItemMaterialColors,
  value: number
): string {
  const hue = MATERIAL_COLOR_HUES[slot] + (value % 12) * 4;
  const saturation = slot.startsWith("metal") ? 0.26 : 0.48;
  const lightness = slot.startsWith("metal")
    ? 0.42 + (value % 7) * 0.035
    : 0.34 + (value % 9) * 0.035;
  return hslToHex(hue, saturation, Math.min(lightness, 0.72));
}

export function summarizeItemAssembly(object: SceneObject): string {
  const properties = object.itemProperties;
  const baseItem =
    properties?.baseItemLabel ??
    (typeof properties?.baseItem === "number" ? `Base ${properties.baseItem}` : "Base -");
  const modelType = properties?.baseItemModelType ? `Model ${properties.baseItemModelType}` : "";
  const parts = resolveItemModelParts(object)
    .map((part) => part.value)
    .join("/");
  const armorParts = resolveItemArmorParts(object);
  const robeHiddenSlots = properties?.armorRobeHiddenSlots ?? [];
  const cloak =
    typeof properties?.cloakModel === "number"
      ? `Cloak model ${properties.cloakModel}`
      : "";
  return [baseItem, modelType, parts ? `Parts ${parts}` : ""]
    .concat(cloak ? [cloak] : [])
    .concat(!parts && armorParts.length > 0 ? [`Armor ${armorParts.length}`] : [])
    .concat(robeHiddenSlots.length > 0 ? [`Robe hides ${robeHiddenSlots.length}`] : [])
    .filter((value) => value.length > 0)
    .join(" | ");
}

export function formatItemPropertyEntry(entry: SceneObjectItemPropertyEntry): string {
  const propertyLabel =
    entry.propertyLabel && typeof entry.propertyName === "number"
      ? `${entry.propertyLabel} (${entry.propertyName})`
      : entry.propertyLabel;
  const subtypeLabel =
    entry.subTypeTable && typeof entry.subtype === "number"
      ? `${entry.subTypeTable}:${entry.subtype}`
      : typeof entry.subtype === "number"
        ? `sub ${entry.subtype}`
        : "";
  const costLabel =
    entry.costTableDefinition && typeof entry.costValue === "number"
      ? `${entry.costTableDefinition}:${entry.costValue}`
      : [
          typeof entry.costTable === "number" ? `ct ${entry.costTable}` : "",
          typeof entry.costValue === "number" ? `cv ${entry.costValue}` : ""
        ]
          .filter((value) => value.length > 0)
          .join(" / ");
  return [
    propertyLabel ?? (typeof entry.propertyName === "number" ? `prop ${entry.propertyName}` : ""),
    subtypeLabel,
    costLabel,
    entry.param1Table && typeof entry.param1Value === "number"
      ? `${entry.param1Table}:${entry.param1Value}`
      : ""
  ]
    .filter((value) => value.length > 0)
    .join(" / ");
}
