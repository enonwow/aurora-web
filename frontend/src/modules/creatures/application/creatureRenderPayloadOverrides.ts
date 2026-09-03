import type { SceneObject, SceneObjectCreatureAppearanceSettings } from "../../scene/contracts";
import type { CreatureApiProcessPayload } from "../contracts";

type CreatureAppearanceProcessOverride =
  NonNullable<CreatureApiProcessPayload["creatureAppearanceOverride"]>;

function parseNwnAppearanceNumber(value: string | undefined): number | undefined {
  const normalized = value?.trim();
  if (!normalized || !/^\d+$/u.test(normalized)) {
    return undefined;
  }
  return Math.max(0, Number.parseInt(normalized, 10));
}

function hasOwnKeys(value: object | undefined): boolean {
  return Boolean(value && Object.keys(value).length > 0);
}

function buildBodyPartOverrides(
  settings: SceneObjectCreatureAppearanceSettings
): CreatureAppearanceProcessOverride["bodyParts"] | undefined {
  const bodyParts: NonNullable<CreatureAppearanceProcessOverride["bodyParts"]> = {};
  const assign = (
    key: keyof NonNullable<CreatureAppearanceProcessOverride["bodyParts"]>,
    value: string | undefined
  ) => {
    const parsed = parseNwnAppearanceNumber(value);
    if (parsed !== undefined) {
      bodyParts[key] = parsed;
    }
  };

  assign("rFoot", settings.rightFoot);
  assign("lFoot", settings.leftFoot);
  assign("rShin", settings.rightShin);
  assign("lShin", settings.leftShin);
  assign("lThigh", settings.leftThigh);
  assign("rThigh", settings.rightThigh);
  assign("pelvis", settings.pelvis);
  assign("torso", settings.torso);
  assign("belt", settings.sourceOnlyParts?.belt);
  assign("neck", settings.neck);
  assign("rFArm", settings.rightForearm);
  assign("lFArm", settings.leftForearm);
  assign("rBicep", settings.rightBicep);
  assign("lBicep", settings.leftBicep);
  assign("rShoul", settings.sourceOnlyParts?.rightShoulder);
  assign("lShoul", settings.sourceOnlyParts?.leftShoulder);
  assign("rHand", settings.rightHand);
  assign("lHand", settings.leftHand);
  assign("robe", settings.sourceOnlyParts?.robe);

  return hasOwnKeys(bodyParts) ? bodyParts : undefined;
}

function buildColorOverrides(
  settings: SceneObjectCreatureAppearanceSettings
): CreatureAppearanceProcessOverride["colors"] | undefined {
  const colors: NonNullable<CreatureAppearanceProcessOverride["colors"]> = {};
  const assign = (
    key: keyof NonNullable<CreatureAppearanceProcessOverride["colors"]>,
    value: string | undefined
  ) => {
    const parsed = parseNwnAppearanceNumber(value);
    if (parsed !== undefined) {
      colors[key] = parsed;
    }
  };

  assign("skin", settings.colors?.skin);
  assign("hair", settings.colors?.hair);
  assign("tattoo1", settings.colors?.tattoo1);
  assign("tattoo2", settings.colors?.tattoo2);

  return hasOwnKeys(colors) ? colors : undefined;
}

export function buildCreatureAppearanceProcessOverride(
  object: SceneObject
): CreatureApiProcessPayload["creatureAppearanceOverride"] | undefined {
  if (object.kind !== "creatures") {
    return undefined;
  }
  const settings = object.creatureProperties?.appearanceSettings;
  const exactAppearanceType = object.creatureProperties?.appearanceType;
  const retainedAppearanceType = Number.isSafeInteger(exactAppearanceType) &&
    Number(exactAppearanceType) >= 0 && Number(exactAppearanceType) <= 0xffff
      ? Number(exactAppearanceType)
      : undefined;
  const exactPhenotype = object.creatureProperties?.phenotypeId;
  const retainedPhenotype = Number.isSafeInteger(exactPhenotype) &&
    Number(exactPhenotype) >= 0 && Number(exactPhenotype) <= 0xff && Number(exactPhenotype) !== 1
      ? Number(exactPhenotype)
      : undefined;
  if (!settings?.partBasedAppearance) {
    const override: CreatureAppearanceProcessOverride = {
      ...(retainedAppearanceType !== undefined ? { appearanceType: retainedAppearanceType } : {}),
      ...(retainedPhenotype !== undefined ? { phenotype: retainedPhenotype } : {}),
    };
    return hasOwnKeys(override) ? override : undefined;
  }
  const appearanceType = retainedAppearanceType ??
    parseNwnAppearanceNumber(object.creatureProperties?.appearance);

  const appearanceHead = parseNwnAppearanceNumber(settings.head);
  const wingsNew = parseNwnAppearanceNumber(settings.wings);
  const tailNew = parseNwnAppearanceNumber(settings.tail);
  const bodyParts = buildBodyPartOverrides(settings);
  const colors = buildColorOverrides(settings);
  const override: CreatureAppearanceProcessOverride = {
    ...(appearanceType !== undefined ? { appearanceType } : {}),
    ...(retainedPhenotype !== undefined ? { phenotype: retainedPhenotype } : {}),
    ...(appearanceHead !== undefined ? { appearanceHead } : {}),
    ...(wingsNew !== undefined ? { wingsNew } : {}),
    ...(tailNew !== undefined ? { tailNew } : {}),
    ...(bodyParts ? { bodyParts } : {}),
    ...(colors ? { colors } : {})
  };

  return hasOwnKeys(override) ? override : undefined;
}
