import type { SceneObject } from "../../scene/contracts";
import {
  resolveItemThumbnailFrontConvention,
  type ItemThumbnailFrontFamily
} from "./itemThumbnailFrontConvention";

export type ItemThumbnail2dRotationReason =
  | "aurora-weapon-square-slot-diagonal"
  | "aurora-weapon-vertical-slot"
  | "aurora-weapon-horizontal-slot"
  | "aurora-front-frame";

export interface ItemThumbnail2dContract {
  readonly family: ItemThumbnailFrontFamily;
  readonly defaultIcon: string;
  readonly slotWidth: number | null;
  readonly slotHeight: number | null;
  readonly slotAspectRatio: number | null;
  readonly canRotateIcon: number | null;
  readonly renderedImageRotationRadians: number;
  readonly renderedImageRotationDegrees: number;
  readonly rotationReason: ItemThumbnail2dRotationReason;
  readonly source: "aurora-baseitems-2da";
}

const RIGHT_ANGLE_RADIANS = Math.PI / 2;
const DIAGONAL_ICON_RADIANS = Math.PI / 4;

function normalizeText(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function readPositiveInteger(value: number | null | undefined): number | null {
  if (!Number.isInteger(value) || (value ?? 0) < 1) {
    return null;
  }
  return Math.trunc(value ?? 0);
}

function readBaseItemFlag(value: number | null | undefined): number | null {
  if (!Number.isInteger(value)) {
    return null;
  }
  return Math.trunc(value ?? 0);
}

function radiansToDegrees(value: number): number {
  return Math.round((value * 180) / Math.PI);
}

function resolveRenderedImageRotation(
  family: ItemThumbnailFrontFamily,
  slotWidth: number | null,
  slotHeight: number | null
): Pick<ItemThumbnail2dContract, "renderedImageRotationRadians" | "renderedImageRotationDegrees" | "rotationReason"> {
  if (family !== "weapon" || slotWidth === null || slotHeight === null) {
    return {
      renderedImageRotationRadians: 0,
      renderedImageRotationDegrees: 0,
      rotationReason: "aurora-front-frame"
    };
  }

  if (slotWidth === slotHeight) {
    return {
      renderedImageRotationRadians: DIAGONAL_ICON_RADIANS,
      renderedImageRotationDegrees: radiansToDegrees(DIAGONAL_ICON_RADIANS),
      rotationReason: "aurora-weapon-square-slot-diagonal"
    };
  }

  if (slotHeight > slotWidth) {
    return {
      renderedImageRotationRadians: RIGHT_ANGLE_RADIANS,
      renderedImageRotationDegrees: radiansToDegrees(RIGHT_ANGLE_RADIANS),
      rotationReason: "aurora-weapon-vertical-slot"
    };
  }

  return {
    renderedImageRotationRadians: 0,
    renderedImageRotationDegrees: 0,
    rotationReason: "aurora-weapon-horizontal-slot"
  };
}

export function resolveItemThumbnail2dContract(object: SceneObject): ItemThumbnail2dContract {
  const convention = resolveItemThumbnailFrontConvention(object);
  const properties = object.itemProperties;
  const slotWidth = readPositiveInteger(properties?.baseItemInvSlotWidth);
  const slotHeight = readPositiveInteger(properties?.baseItemInvSlotHeight);
  const rotation = resolveRenderedImageRotation(convention.family, slotWidth, slotHeight);

  return {
    family: convention.family,
    defaultIcon: normalizeText(properties?.baseItemDefaultIcon),
    slotWidth,
    slotHeight,
    slotAspectRatio:
      slotWidth !== null && slotHeight !== null ? Number((slotWidth / slotHeight).toFixed(6)) : null,
    canRotateIcon: readBaseItemFlag(properties?.baseItemCanRotateIcon),
    ...rotation,
    source: "aurora-baseitems-2da"
  };
}
