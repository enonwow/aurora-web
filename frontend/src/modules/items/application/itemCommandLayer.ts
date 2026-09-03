import type {
  SceneObject,
  SceneObjectItemProperties,
  SceneObjectItemPropertyEntry
} from "../../scene/contracts";
import { createNewSceneObject } from "../../scene/domain/sceneFactory";
import type { ItemApiBlueprintCreatePayload } from "../contracts";
import { buildItemBlueprintCreatePayloadFromWizardSceneObject } from "./itemCreationWizard";

export type AuroraItemCommandIssueCode =
  | "ITEM_COMMAND_TARGET_NOT_FOUND"
  | "ITEM_COMMAND_SOURCE_NOT_ITEM"
  | "ITEM_COMMAND_PROPERTY_INDEX_NOT_FOUND"
  | "ITEM_COMMAND_PROPERTY_LIMIT_REACHED";

export interface AuroraItemCommandIssue {
  code: AuroraItemCommandIssueCode;
  severity: "warn" | "error";
  message: string;
}

export type AuroraItemCommand =
  | {
      type: "create";
      template: SceneObject;
      sequence: number;
      resRef?: string;
      tag?: string;
      name?: string;
      x?: number;
      y?: number;
      z?: number;
    }
  | {
      type: "copy";
      sourceId: string;
      sequence: number;
      resRef?: string;
      tag?: string;
      name?: string;
    }
  | {
      type: "set-identity";
      targetId: string;
      resRef?: string;
      tag?: string;
      name?: string;
      x?: number;
      y?: number;
      z?: number;
    }
  | {
      type: "set-charges";
      targetId: string;
      charges: number;
    }
  | {
      type: "set-stack-size";
      targetId: string;
      stackSize: number;
    }
  | {
      type: "set-flags";
      targetId: string;
      identified?: boolean;
      stolen?: boolean;
      cursed?: boolean;
      plot?: boolean;
    }
  | {
      type: "add-property";
      targetId: string;
      property: SceneObjectItemPropertyEntry;
    }
  | {
      type: "update-property";
      targetId: string;
      propertyIndex: number;
      property: Partial<SceneObjectItemPropertyEntry>;
    }
  | {
      type: "remove-property";
      targetId: string;
      propertyIndex: number;
    };

export interface AuroraItemCommandResult {
  objects: SceneObject[];
  changedObject: SceneObject | null;
  issues: AuroraItemCommandIssue[];
}

export interface AuroraItemCommandBatchResult {
  objects: SceneObject[];
  changedObjects: SceneObject[];
  issues: AuroraItemCommandIssue[];
}

const AURORA_RESREF_MAX_LENGTH = 16;
const AURORA_TAG_MAX_LENGTH = 32;
const AURORA_MAX_ITEM_PROPERTY_COUNT = 255;

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function sanitizeResRef(value: string | undefined, fallback: string): string {
  const normalized = (value ?? fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .replace(/_{2,}/gu, "_")
    .slice(0, AURORA_RESREF_MAX_LENGTH);
  return normalized || fallback.slice(0, AURORA_RESREF_MAX_LENGTH);
}

function sanitizeTag(value: string | undefined, fallback: string): string {
  const normalized = (value ?? fallback)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .replace(/_{2,}/gu, "_")
    .slice(0, AURORA_TAG_MAX_LENGTH);
  return normalized || fallback.slice(0, AURORA_TAG_MAX_LENGTH).toUpperCase();
}

function cloneItemPropertyEntry(
  entry: SceneObjectItemPropertyEntry
): SceneObjectItemPropertyEntry {
  return { ...entry };
}

function cloneItemProperties(
  properties: SceneObjectItemProperties | undefined
): SceneObjectItemProperties | undefined {
  if (!properties) {
    return undefined;
  }
  return {
    ...properties,
    baseItemReqFeats: properties.baseItemReqFeats ? [...properties.baseItemReqFeats] : undefined,
    modelParts: properties.modelParts ? [...properties.modelParts] : undefined,
    modelPartResRefs: properties.modelPartResRefs ? [...properties.modelPartResRefs] : undefined,
    modelPartResRefRoles: properties.modelPartResRefRoles
      ? [...properties.modelPartResRefRoles]
      : undefined,
    cloakHiddenSlots: properties.cloakHiddenSlots ? [...properties.cloakHiddenSlots] : undefined,
    armorRobeHiddenSlots: properties.armorRobeHiddenSlots
      ? [...properties.armorRobeHiddenSlots]
      : undefined,
    armorPreviewContext: properties.armorPreviewContext
      ? { ...properties.armorPreviewContext }
      : undefined,
    modelPartCandidates: properties.modelPartCandidates
      ? properties.modelPartCandidates.map((entry) => ({ ...entry }))
      : undefined,
    armorPartModelCandidates: properties.armorPartModelCandidates
      ? properties.armorPartModelCandidates.map((entry) => ({ ...entry }))
      : undefined,
    modelAssetCandidates: properties.modelAssetCandidates
      ? properties.modelAssetCandidates.map((entry) => ({ ...entry }))
      : undefined,
    armorPartCostModifiers: properties.armorPartCostModifiers
      ? { ...properties.armorPartCostModifiers }
      : undefined,
    armorParts: properties.armorParts ? { ...properties.armorParts } : undefined,
    materialColors: properties.materialColors ? { ...properties.materialColors } : undefined,
    propertyList: properties.propertyList?.map(cloneItemPropertyEntry),
    inventoryItems: properties.inventoryItems?.map((entry) => ({ ...entry })),
    blueprintInventoryItems: properties.blueprintInventoryItems?.map((entry) => ({ ...entry })),
    blueprintEquippedItems: properties.blueprintEquippedItems?.map((entry) => ({ ...entry })),
    variables: properties.variables?.map((entry) => ({ ...entry })),
    scripts: properties.scripts ? { ...properties.scripts } : undefined
  };
}

function isItemObject(object: SceneObject): boolean {
  return object.kind === "items";
}

function buildItemClone(
  source: SceneObject,
  sequence: number,
  options: {
    resRef?: string;
    tag?: string;
    name?: string;
    x?: number;
    y?: number;
    z?: number;
  } = {}
): SceneObject {
  const fallbackResRef = `${source.resRef || "item"}_${String(sequence).padStart(3, "0")}`;
  const resRef = sanitizeResRef(options.resRef, fallbackResRef);
  const tag = sanitizeTag(options.tag, resRef);
  const object = createNewSceneObject(
    "items",
    options.x ?? source.x,
    options.y ?? source.y,
    sequence
  );
  return {
    ...object,
    id: `itm_cmd_${resRef}_${sequence}`,
    name: options.name?.trim() || source.name || tag,
    resRef,
    tag,
    z: options.z ?? source.z,
    bearing: source.bearing,
    previewImageUrl: source.previewImageUrl,
    isStatic: source.isStatic,
    source: source.source ? { ...source.source, sourceObjectId: source.id } : undefined,
    visualTransform: source.visualTransform ? { ...source.visualTransform } : object.visualTransform,
    itemProperties: cloneItemProperties(source.itemProperties)
  };
}

function mapObjectsReplacing(
  objects: readonly SceneObject[],
  changedObject: SceneObject
): SceneObject[] {
  return objects.map((object) => (object.id === changedObject.id ? changedObject : object));
}

function makeTargetMissingIssue(targetId: string): AuroraItemCommandIssue {
  return {
    code: "ITEM_COMMAND_TARGET_NOT_FOUND",
    severity: "error",
    message: `Item command target '${targetId}' was not found.`
  };
}

function findTarget(
  objects: readonly SceneObject[],
  targetId: string
): { object: SceneObject | null; issues: AuroraItemCommandIssue[] } {
  const object = objects.find((entry) => entry.id === targetId) ?? null;
  if (!object) {
    return { object: null, issues: [makeTargetMissingIssue(targetId)] };
  }
  if (!isItemObject(object)) {
    return {
      object: null,
      issues: [
        {
          code: "ITEM_COMMAND_SOURCE_NOT_ITEM",
          severity: "error",
          message: `Scene object '${targetId}' is not an item.`
        }
      ]
    };
  }
  return { object, issues: [] };
}

function updateItemProperties(
  object: SceneObject,
  patch: Partial<SceneObjectItemProperties>
): SceneObject {
  return {
    ...object,
    itemProperties: {
      ...(cloneItemProperties(object.itemProperties) ?? {}),
      ...patch
    }
  };
}

export function executeAuroraItemCommand(
  objects: readonly SceneObject[],
  command: AuroraItemCommand
): AuroraItemCommandResult {
  if (command.type === "create") {
    if (!isItemObject(command.template)) {
      return {
        objects: [...objects],
        changedObject: null,
        issues: [
          {
            code: "ITEM_COMMAND_SOURCE_NOT_ITEM",
            severity: "error",
            message: "CreateItem command requires an item template."
          }
        ]
      };
    }
    const created = buildItemClone(command.template, command.sequence, command);
    return {
      objects: [...objects, created],
      changedObject: created,
      issues: []
    };
  }

  if (command.type === "copy") {
    const { object, issues } = findTarget(objects, command.sourceId);
    if (!object) {
      return { objects: [...objects], changedObject: null, issues };
    }
    const copied = buildItemClone(object, command.sequence, command);
    return {
      objects: [...objects, copied],
      changedObject: copied,
      issues: []
    };
  }

  const { object, issues } = findTarget(objects, command.targetId);
  if (!object) {
    return { objects: [...objects], changedObject: null, issues };
  }

  if (command.type === "set-identity") {
    const resRef = sanitizeResRef(command.resRef, object.resRef || "item");
    const tag = sanitizeTag(command.tag, object.tag || resRef);
    const changedObject: SceneObject = {
      ...object,
      resRef,
      tag,
      name: command.name?.trim() || object.name,
      ...(command.x !== undefined ? { x: command.x } : {}),
      ...(command.y !== undefined ? { y: command.y } : {}),
      ...(command.z !== undefined ? { z: command.z } : {})
    };
    return {
      objects: mapObjectsReplacing(objects, changedObject),
      changedObject,
      issues: []
    };
  }

  if (command.type === "set-charges") {
    const changedObject = updateItemProperties(object, {
      charges: clampInteger(command.charges, 0, 0x7fffffff)
    });
    return {
      objects: mapObjectsReplacing(objects, changedObject),
      changedObject,
      issues: []
    };
  }

  if (command.type === "set-stack-size") {
    const changedObject = updateItemProperties(object, {
      stackSize: clampInteger(command.stackSize, 1, 65535)
    });
    return {
      objects: mapObjectsReplacing(objects, changedObject),
      changedObject,
      issues: []
    };
  }

  if (command.type === "set-flags") {
    const changedObject = updateItemProperties(object, {
      ...(command.identified !== undefined ? { identified: command.identified } : {}),
      ...(command.stolen !== undefined ? { stolen: command.stolen } : {}),
      ...(command.cursed !== undefined ? { cursed: command.cursed } : {}),
      ...(command.plot !== undefined ? { plot: command.plot } : {})
    });
    return {
      objects: mapObjectsReplacing(objects, changedObject),
      changedObject,
      issues: []
    };
  }

  if (command.type === "add-property") {
    const propertyList = object.itemProperties?.propertyList ?? [];
    const maxProps = object.itemProperties?.baseItemMaxProps ?? AURORA_MAX_ITEM_PROPERTY_COUNT;
    if (propertyList.length >= Math.min(maxProps, AURORA_MAX_ITEM_PROPERTY_COUNT)) {
      return {
        objects: [...objects],
        changedObject: object,
        issues: [
          {
            code: "ITEM_COMMAND_PROPERTY_LIMIT_REACHED",
            severity: "error",
            message: `Item '${object.resRef}' cannot accept more item properties.`
          }
        ]
      };
    }
    const changedObject = updateItemProperties(object, {
      propertyList: [...propertyList.map(cloneItemPropertyEntry), cloneItemPropertyEntry(command.property)]
    });
    return {
      objects: mapObjectsReplacing(objects, changedObject),
      changedObject,
      issues: []
    };
  }

  const propertyList = object.itemProperties?.propertyList ?? [];
  if (command.propertyIndex < 0 || command.propertyIndex >= propertyList.length) {
    return {
      objects: [...objects],
      changedObject: object,
      issues: [
        {
          code: "ITEM_COMMAND_PROPERTY_INDEX_NOT_FOUND",
          severity: "error",
          message: `Item property index ${command.propertyIndex} does not exist on '${object.resRef}'.`
        }
      ]
    };
  }
  if (command.type === "update-property") {
    const changedObject = updateItemProperties(object, {
      propertyList: propertyList.map((entry, index) =>
        index === command.propertyIndex
          ? { ...cloneItemPropertyEntry(entry), ...command.property }
          : cloneItemPropertyEntry(entry)
      )
    });
    return {
      objects: mapObjectsReplacing(objects, changedObject),
      changedObject,
      issues: []
    };
  }
  const changedObject = updateItemProperties(object, {
    propertyList: propertyList
      .filter((_, index) => index !== command.propertyIndex)
      .map(cloneItemPropertyEntry)
  });
  return {
    objects: mapObjectsReplacing(objects, changedObject),
    changedObject,
    issues: []
  };
}

export function executeAuroraItemCommandBatch(
  objects: readonly SceneObject[],
  commands: readonly AuroraItemCommand[]
): AuroraItemCommandBatchResult {
  let currentObjects = [...objects];
  const changedObjects: SceneObject[] = [];
  const issues: AuroraItemCommandIssue[] = [];

  for (const command of commands) {
    const result = executeAuroraItemCommand(currentObjects, command);
    currentObjects = result.objects;
    issues.push(...result.issues);
    if (result.changedObject) {
      changedObjects.push(result.changedObject);
    }
    if (result.issues.some((issue) => issue.severity === "error")) {
      break;
    }
  }

  return {
    objects: currentObjects,
    changedObjects,
    issues
  };
}

export function buildAuroraItemCommandBlueprintPayload(
  object: SceneObject | null | undefined,
  options: { overwrite?: boolean } = {}
): ItemApiBlueprintCreatePayload | null {
  if (!object || !isItemObject(object)) {
    return null;
  }
  return buildItemBlueprintCreatePayloadFromWizardSceneObject(object, options);
}
