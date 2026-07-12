import type { SceneObject } from "../../scene/contracts";
import { resolveItemArmorParts } from "./itemPresentation";

export const ITEM_THUMBNAIL_DEFAULT_MODEL_ROTATION_X_RADIANS = -Math.PI / 2;
export const ITEM_THUMBNAIL_WEAPON_FRONT_ROTATION_Y_RADIANS = -Math.PI / 2;

export type ItemThumbnailFrontFamily =
  | "armor"
  | "shield"
  | "weapon"
  | "ammunition"
  | "cloak"
  | "default-model"
  | "single-upright"
  | "single"
  | "misc";

export type ItemThumbnailCameraAxis = "positive-z" | "negative-x" | "positive-x";
export type ItemThumbnailBoundsAxis = "x" | "z";

export interface ItemThumbnailFrontConvention {
  readonly family: ItemThumbnailFrontFamily;
  readonly modelRotation: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
  readonly cameraAxis: ItemThumbnailCameraAxis;
  readonly widthAxis: ItemThumbnailBoundsAxis;
  readonly depthAxis: ItemThumbnailBoundsAxis;
  readonly verticalBias: number;
  readonly distanceScale: number;
  readonly padding: number;
  readonly source: string;
}

const ZERO_ROTATION = Object.freeze({ x: 0, y: 0, z: 0 });

const ARMOR_CONVENTION: ItemThumbnailFrontConvention = {
  family: "armor",
  modelRotation: ZERO_ROTATION,
  cameraAxis: "positive-z",
  widthAxis: "x",
  depthAxis: "z",
  verticalBias: 0.16,
  distanceScale: 1.35,
  padding: 1.18,
  source: "aurora-armor-modeltype-and-capart"
};

const SHIELD_CONVENTION: ItemThumbnailFrontConvention = {
  family: "shield",
  modelRotation: ZERO_ROTATION,
  cameraAxis: "negative-x",
  widthAxis: "z",
  depthAxis: "x",
  verticalBias: 0,
  distanceScale: 4,
  padding: 1.18,
  source: "aurora-shield-modeltype"
};

const WEAPON_FRONT_CONVENTION: ItemThumbnailFrontConvention = {
  family: "weapon",
  modelRotation: Object.freeze({
    x: 0,
    y: ITEM_THUMBNAIL_WEAPON_FRONT_ROTATION_Y_RADIANS,
    z: 0
  }),
  cameraAxis: "positive-z",
  widthAxis: "x",
  depthAxis: "z",
  verticalBias: 0,
  distanceScale: 4,
  padding: 1.32,
  source: "aurora-weapon-modeltype-front-contract"
};

const AMMUNITION_CONVENTION: ItemThumbnailFrontConvention = {
  family: "ammunition",
  modelRotation: Object.freeze({
    x: 0,
    y: ITEM_THUMBNAIL_WEAPON_FRONT_ROTATION_Y_RADIANS,
    z: 0
  }),
  cameraAxis: "positive-z",
  widthAxis: "x",
  depthAxis: "z",
  verticalBias: 0,
  distanceScale: 4,
  padding: 1.16,
  source: "aurora-ammunition-modeltype"
};

const CLOAK_CONVENTION: ItemThumbnailFrontConvention = {
  family: "cloak",
  modelRotation: ZERO_ROTATION,
  cameraAxis: "positive-z",
  widthAxis: "x",
  depthAxis: "z",
  verticalBias: 0.04,
  distanceScale: 2.6,
  padding: 1.2,
  source: "aurora-cloak-visual-role"
};

const DEFAULT_MODEL_CONVENTION: ItemThumbnailFrontConvention = {
  family: "default-model",
  modelRotation: Object.freeze({
    x: ITEM_THUMBNAIL_DEFAULT_MODEL_ROTATION_X_RADIANS,
    y: 0,
    z: 0
  }),
  cameraAxis: "positive-z",
  widthAxis: "x",
  depthAxis: "z",
  verticalBias: 0,
  distanceScale: 4,
  padding: 1.16,
  source: "aurora-defaultmodel-upright"
};

const SINGLE_UPRIGHT_MODEL_CONVENTION: ItemThumbnailFrontConvention = {
  family: "single-upright",
  modelRotation: Object.freeze({
    x: ITEM_THUMBNAIL_DEFAULT_MODEL_ROTATION_X_RADIANS,
    y: 0,
    z: 0
  }),
  cameraAxis: "positive-z",
  widthAxis: "x",
  depthAxis: "z",
  verticalBias: 0,
  distanceScale: 4,
  padding: 1.16,
  source: "aurora-single-model-upright"
};

const SINGLE_MODEL_CONVENTION: ItemThumbnailFrontConvention = {
  family: "single",
  modelRotation: ZERO_ROTATION,
  cameraAxis: "positive-z",
  widthAxis: "x",
  depthAxis: "z",
  verticalBias: 0,
  distanceScale: 4,
  padding: 1.16,
  source: "aurora-single-model-front"
};

const MISC_CONVENTION: ItemThumbnailFrontConvention = {
  family: "misc",
  modelRotation: ZERO_ROTATION,
  cameraAxis: "positive-z",
  widthAxis: "x",
  depthAxis: "z",
  verticalBias: 0,
  distanceScale: 4,
  padding: 1.16,
  source: "aurora-fallback-front"
};

function normalizeText(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeMany(values: ReadonlyArray<string | null | undefined>): string[] {
  return values.map(normalizeText).filter((value) => value.length > 0);
}

function hasAnyToken(value: string, tokens: ReadonlyArray<string>): boolean {
  return tokens.some((token) => value.includes(token));
}

function collectModelPartRoles(object: SceneObject): string[] {
  const propertyRoles = object.itemProperties?.modelPartResRefRoles ?? [];
  const candidateRoles =
    object.itemProperties?.modelPartCandidates?.map((candidate) => candidate.role ?? "") ?? [];
  return normalizeMany([...propertyRoles, ...candidateRoles]);
}

function collectModelReferences(object: SceneObject): string[] {
  const direct = object.itemProperties?.modelPartResRefs ?? [];
  const candidateRefs =
    object.itemProperties?.modelPartCandidates?.map((candidate) => candidate.resRef) ?? [];
  const armorCandidateRefs =
    object.itemProperties?.armorPartModelCandidates?.flatMap((candidate) => [
      candidate.modelResRef,
      candidate.partModelName ?? ""
    ]) ?? [];
  return normalizeMany([...direct, ...candidateRefs, ...armorCandidateRefs]);
}

function isArmorObject(object: SceneObject, modelType: string, label: string): boolean {
  return (
    object.itemProperties?.baseItem === 16 ||
    modelType.startsWith("aar") ||
    modelType === "armor" ||
    label.includes("armor") ||
    resolveItemArmorParts(object).length > 0 ||
    (object.itemProperties?.armorPartModelCandidates?.length ?? 0) > 0
  );
}

function isShieldObject(
  modelType: string,
  label: string,
  defaultIcon: string,
  modelReferences: ReadonlyArray<string>
): boolean {
  return (
    modelType.startsWith("ash") ||
    label.includes("shield") ||
    defaultIcon.startsWith("iash") ||
    defaultIcon.includes("shield") ||
    modelReferences.some((reference) => reference.startsWith("ash") || reference.includes("shield"))
  );
}

function isCloakObject(
  modelType: string,
  label: string,
  defaultIcon: string,
  modelReferences: ReadonlyArray<string>,
  roles: ReadonlyArray<string>
): boolean {
  return (
    modelType.includes("cloak") ||
    label.includes("cloak") ||
    defaultIcon.includes("cloak") ||
    roles.includes("cloak") ||
    modelReferences.some((reference) => reference.includes("cloak"))
  );
}

function isAmmunitionObject(
  modelType: string,
  label: string,
  defaultIcon: string,
  modelReferences: ReadonlyArray<string>
): boolean {
  return (
    modelType.startsWith("wam") ||
    typeof modelType === "string" && modelType.includes("ammo") ||
    hasAnyToken(label, ["arrow", "bolt", "bullet", "ammunition"]) ||
    defaultIcon.includes("arrow") ||
    defaultIcon.includes("bolt") ||
    defaultIcon.includes("bullet") ||
    modelReferences.some((reference) => reference.startsWith("wam") || reference.includes("arrow"))
  );
}

function isWeaponObject(
  modelType: string,
  label: string,
  defaultIcon: string,
  modelReferences: ReadonlyArray<string>
): boolean {
  return (
    (/^w(?!am)/u.test(modelType) && !modelType.includes("cloak")) ||
    modelType.startsWith("cnr_") ||
    defaultIcon.startsWith("iw") ||
    hasAnyToken(label, [
      "axe",
      "blade",
      "club",
      "dagger",
      "flail",
      "halberd",
      "hammer",
      "katana",
      "mace",
      "rapier",
      "scimitar",
      "sickle",
      "spear",
      "staff",
      "sword",
      "trident",
      "whip"
    ]) ||
    modelReferences.some((reference) => /^w(?!am)/u.test(reference) || reference.startsWith("cnr_"))
  );
}

function resolveWeaponConvention(): ItemThumbnailFrontConvention {
  return WEAPON_FRONT_CONVENTION;
}

function isSingleUprightObject(
  modelType: string,
  label: string,
  defaultIcon: string,
  modelReferences: ReadonlyArray<string>
): boolean {
  return (
    modelType.includes("torch") ||
    label.includes("torch") ||
    defaultIcon.includes("torch") ||
    modelReferences.some((reference) => reference.includes("torch"))
  );
}

export function resolveItemThumbnailFrontConvention(
  object: SceneObject
): ItemThumbnailFrontConvention {
  if (object.kind !== "items") {
    return MISC_CONVENTION;
  }

  const properties = object.itemProperties;
  const modelType = normalizeText(properties?.baseItemModelType);
  const label = normalizeText(properties?.baseItemLabel ?? object.name ?? object.tag);
  const defaultIcon = normalizeText(properties?.baseItemDefaultIcon);
  const roles = collectModelPartRoles(object);
  const modelReferences = collectModelReferences(object);

  if (isArmorObject(object, modelType, label)) {
    return ARMOR_CONVENTION;
  }

  if (isShieldObject(modelType, label, defaultIcon, modelReferences)) {
    return SHIELD_CONVENTION;
  }

  if (isCloakObject(modelType, label, defaultIcon, modelReferences, roles)) {
    return CLOAK_CONVENTION;
  }

  if (isAmmunitionObject(modelType, label, defaultIcon, modelReferences)) {
    return AMMUNITION_CONVENTION;
  }

  if (isWeaponObject(modelType, label, defaultIcon, modelReferences)) {
    return resolveWeaponConvention();
  }

  if (roles.includes("default")) {
    return DEFAULT_MODEL_CONVENTION;
  }

  if (isSingleUprightObject(modelType, label, defaultIcon, modelReferences)) {
    return SINGLE_UPRIGHT_MODEL_CONVENTION;
  }

  if (modelReferences.length === 1 || (properties?.modelPartCandidates?.length ?? 0) === 1) {
    return SINGLE_MODEL_CONVENTION;
  }

  return MISC_CONVENTION;
}
