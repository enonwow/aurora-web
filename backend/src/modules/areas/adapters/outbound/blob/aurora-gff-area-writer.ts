import {
  buildGffBuffer,
  type SupportedGffField
} from "../../../../catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import type {
  AreaObjectPlacement,
  AreaObjectVisualTransform,
  AreaRecord,
  AreaTileInstance
} from "../../../domain/area.types";
import {
  buildAreaItemPlacementFields,
  type SerializableAreaItemPlacement
} from "./aurora-gff-area-item-writer";
import {
  buildCreatureInventoryListFields,
  type SerializableCreatureEquippedItemEntry,
  type SerializableCreatureInventoryItemEntry
} from "../../../../catalog/adapters/outbound/blob/aurora-gff-utc-writer";

const ARE_FILE_TYPE = "ARE ";
const GIT_FILE_TYPE = "GIT ";
const ROOT_STRUCT_TYPE_ID = 0xffffffff;
const AREA_OBJECT_STRUCT_TYPE_ID = 0;
const AREA_TILE_STRUCT_TYPE_ID = 0;
const AREA_VISUAL_TRANSFORM_STRUCT_TYPE_ID = 0;

const GIT_LIST_LABEL_BY_KIND = {
  placeable: "Placeable List",
  door: "Door List",
  creature: "Creature List",
  encounter: "EncounterList",
  item: "ItemList",
  sound: "SoundList",
  store: "StoreList",
  trigger: "TriggerList",
  waypoint: "WaypointList"
} as const satisfies Record<AreaObjectPlacement["kind"], string>;

export function serializeAreaToGitGff(area: AreaRecord): Buffer {
  const fields = Object.entries(GIT_LIST_LABEL_BY_KIND).map(([kind, label]) => ({
    label,
    type: "list" as const,
    value: area.objects
      .filter((object) => object.kind === kind)
      .map((object) => ({
        typeId: AREA_OBJECT_STRUCT_TYPE_ID,
        fields:
          object.kind === "item"
            ? buildItemPlacementFields(object)
            : object.kind === "creature"
              ? buildCreaturePlacementFields(object)
              : buildGenericPlacementFields(object)
      }))
  }));

  return buildGffBuffer(fields, GIT_FILE_TYPE, ROOT_STRUCT_TYPE_ID);
}

export function serializeAreaToAreGff(area: AreaRecord): Buffer {
  const fields: SupportedGffField[] = [];
  pushLocString(fields, "Name", area.name);
  pushCExoString(fields, "Tag", area.areaId);
  pushDword(fields, "Width", area.width);
  pushDword(fields, "Height", area.height);
  pushResRef(fields, "Tileset", area.tileSet);

  for (const field of area.lighting?.fields ?? []) {
    pushDword(fields, field.field, field.value);
  }

  const tiles = area.tiles ?? [];
  fields.push({
    label: "Tile_List",
    type: "list",
    value: tiles
      .slice()
      .sort((left, right) => left.tileIndex - right.tileIndex)
      .map((tile) => ({
        typeId: AREA_TILE_STRUCT_TYPE_ID,
        fields: buildTileFields(tile)
      }))
  });

  return buildGffBuffer(fields, ARE_FILE_TYPE, ROOT_STRUCT_TYPE_ID);
}

function buildGenericPlacementFields(object: AreaObjectPlacement): SupportedGffField[] {
  const fields: SupportedGffField[] = [];
  pushResRef(fields, "TemplateResRef", object.resRef ?? object.templateId);
  pushCExoString(fields, "Tag", object.tag);
  pushLocString(fields, "LocName", object.localizedName);
  pushLocString(fields, "Description", object.description);
  pushDword(fields, "Appearance", object.appearanceType);
  pushDword(fields, "GenericType", object.genericType);
  if (object.isStatic !== undefined) {
    pushByte(fields, "Static", object.isStatic ? 1 : 0);
  }
  pushPlacement(fields, object);
  pushVisualTransform(fields, object);
  return fields;
}

function buildItemPlacementFields(object: AreaObjectPlacement): SupportedGffField[] {
  const item: SerializableAreaItemPlacement = {
    templateResRef: object.resRef ?? object.templateId,
    tag: object.tag,
    localizedName: object.localizedName,
    description: object.description,
    x: object.x,
    y: object.y,
    z: object.z,
    bearing: object.bearing,
    itemMetadata: object.itemMetadata
  };
  return buildAreaItemPlacementFields(item);
}

function buildCreaturePlacementFields(object: AreaObjectPlacement): SupportedGffField[] {
  const fields = buildGenericPlacementFields(object);
  fields.push(
    ...buildCreatureInventoryListFields({
      inventoryItemListEntries: readCreatureItemEntries<SerializableCreatureInventoryItemEntry>(
        object,
        "inventoryItemListEntries"
      ),
      equipItemListEntries: readCreatureItemEntries<SerializableCreatureEquippedItemEntry>(
        object,
        "equipItemListEntries"
      )
    })
  );
  return fields;
}

function readCreatureItemEntries<T>(object: AreaObjectPlacement, key: string): T[] | undefined {
  const serialized = object.creatureMetadata?.[key];
  if (typeof serialized !== "string" || serialized.trim().length === 0) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(serialized);
    return Array.isArray(parsed)
      ? (parsed.filter(
          (entry) =>
            entry !== null &&
            typeof entry === "object" &&
            typeof (entry as { resRef?: unknown }).resRef === "string" &&
            (entry as { resRef: string }).resRef.trim().length > 0
        ) as T[])
      : undefined;
  } catch {
    return undefined;
  }
}

function buildTileFields(tile: AreaTileInstance): SupportedGffField[] {
  const fields: SupportedGffField[] = [];
  pushDword(fields, "Tile_ID", tile.tileId);
  pushResRef(fields, "Tile_ResRef", tile.modelResRef);
  pushByte(fields, "Tile_Orientation", tile.orientation ?? tile.tilesetOrientation);
  pushFloat(fields, "Tile_Height", tile.height);
  pushByte(fields, "Tile_MainLight1", tile.mainLight1);
  pushByte(fields, "Tile_MainLight2", tile.mainLight2);
  pushByte(fields, "Tile_SrcLight1", tile.sourceLight1);
  pushByte(fields, "Tile_SrcLight2", tile.sourceLight2);
  pushByte(fields, "Tile_AnimLoop1", tile.animLoop1);
  pushByte(fields, "Tile_AnimLoop2", tile.animLoop2);
  pushByte(fields, "Tile_AnimLoop3", tile.animLoop3);
  return fields;
}

function pushPlacement(fields: SupportedGffField[], object: AreaObjectPlacement): void {
  pushFloat(fields, "XPosition", object.x);
  pushFloat(fields, "YPosition", object.y);
  pushFloat(fields, "ZPosition", object.z);
  pushFloat(fields, "Bearing", degreesToRadians(object.bearing));
}

function pushVisualTransform(fields: SupportedGffField[], object: AreaObjectPlacement): void {
  const transform = object.visualTransform;
  if (!transform || isDefaultVisualTransform(transform)) {
    return;
  }
  const scaleX = transform.scaleX ?? transform.scale ?? 1;
  const scaleY = transform.scaleY ?? transform.scale ?? 1;
  const scaleZ = transform.scaleZ ?? transform.scale ?? 1;
  fields.push({
    label: "VisualTransform",
    type: "struct",
    value: {
      typeId: AREA_VISUAL_TRANSFORM_STRUCT_TYPE_ID,
      fields: [
        { label: "ScaleX", type: "float", value: scaleX },
        { label: "ScaleY", type: "float", value: scaleY },
        { label: "ScaleZ", type: "float", value: scaleZ },
        { label: "RotateX", type: "float", value: radiansToDegrees(transform.pitch ?? 0) },
        { label: "RotateY", type: "float", value: radiansToDegrees(transform.roll ?? 0) },
        { label: "RotateZ", type: "float", value: radiansToDegrees(transform.yaw ?? 0) },
        { label: "TranslateX", type: "float", value: transform.offsetX ?? 0 },
        { label: "TranslateY", type: "float", value: transform.offsetY ?? 0 },
        { label: "TranslateZ", type: "float", value: transform.offsetZ ?? 0 }
      ]
    }
  });
}

function isDefaultVisualTransform(transform: AreaObjectVisualTransform): boolean {
  const scaleX = transform.scaleX ?? transform.scale ?? 1;
  const scaleY = transform.scaleY ?? transform.scale ?? 1;
  const scaleZ = transform.scaleZ ?? transform.scale ?? 1;
  return (
    approximately(scaleX, 1) &&
    approximately(scaleY, 1) &&
    approximately(scaleZ, 1) &&
    approximately(transform.offsetX ?? 0, 0) &&
    approximately(transform.offsetY ?? 0, 0) &&
    approximately(transform.offsetZ ?? 0, 0) &&
    approximately(transform.pitch ?? 0, 0) &&
    approximately(transform.roll ?? 0, 0) &&
    approximately(transform.yaw ?? 0, 0)
  );
}

function approximately(left: number, right: number): boolean {
  return Math.abs(left - right) <= 1e-6;
}

function pushByte(fields: SupportedGffField[], label: string, value: unknown): void {
  if (typeof value === "number" && Number.isFinite(value)) {
    fields.push({ label, type: "byte", value: Math.trunc(value) });
  }
}

function pushDword(fields: SupportedGffField[], label: string, value: unknown): void {
  if (typeof value === "number" && Number.isFinite(value)) {
    fields.push({ label, type: "dword", value: Math.trunc(value) });
  }
}

function pushFloat(fields: SupportedGffField[], label: string, value: unknown): void {
  if (typeof value === "number" && Number.isFinite(value)) {
    fields.push({ label, type: "float", value });
  }
}

function pushCExoString(fields: SupportedGffField[], label: string, value: unknown): void {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (normalized) {
    fields.push({ label, type: "cexostring", value: normalized });
  }
}

function pushResRef(fields: SupportedGffField[], label: string, value: unknown): void {
  const normalized = typeof value === "string" ? value.trim().slice(0, 16) : "";
  if (normalized) {
    fields.push({ label, type: "resref", value: normalized });
  }
}

function pushLocString(
  fields: SupportedGffField[],
  label: string,
  text: unknown,
  strRef?: unknown
): void {
  const normalizedText = typeof text === "string" ? text.trim() : "";
  const normalizedStrRef =
    typeof strRef === "number" && Number.isFinite(strRef) ? Math.trunc(strRef) : undefined;
  if (!normalizedText && normalizedStrRef === undefined) {
    return;
  }
  fields.push({
    label,
    type: "cexolocstring",
    value: {
      ...(normalizedText ? { text: normalizedText } : {}),
      ...(normalizedStrRef !== undefined ? { strRef: normalizedStrRef } : {})
    }
  });
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
}
