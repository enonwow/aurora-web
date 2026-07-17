import {
  buildGffBuffer,
  type SupportedGffField
} from "../../../../catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import type { ParsedAreaObjectMetadataPrimitive } from "./aurora-gff-area-parser";

export interface SerializableAreaItemPropertyListEntry {
  propertyName?: number;
  subtype?: number;
  costTable?: number;
  costValue?: number;
  param1?: number;
  param1Value?: number;
  chanceAppear?: number;
}

export interface SerializableAreaItemPlacement {
  templateResRef?: string;
  tag?: string;
  localizedName?: string;
  localizedNameStrRef?: number;
  description?: string;
  descriptionStrRef?: number;
  identifiedDescription?: string;
  identifiedDescriptionStrRef?: number;
  comments?: string;
  x: number;
  y: number;
  z?: number;
  bearing?: number;
  itemMetadata?: Record<string, ParsedAreaObjectMetadataPrimitive>;
}

const GIT_FILE_TYPE = "GIT ";
const ROOT_STRUCT_TYPE_ID = 0xffffffff;
const AREA_ITEM_STRUCT_TYPE_ID = 0;
const ITEM_PROPERTY_STRUCT_TYPE_ID = 0;

const ITEM_NUMBER_FIELD_LABELS = [
  ["baseItem", "BaseItem", "dword"],
  ["modelPart1", "ModelPart1", "byte"],
  ["modelPart2", "ModelPart2", "byte"],
  ["modelPart3", "ModelPart3", "byte"],
  ["cost", "Cost", "dword"],
  ["addCost", "AddCost", "dword"],
  ["costTable", "CostTable", "dword"],
  ["costValue", "CostValue", "dword"],
  ["charges", "Charges", "dword"],
  ["stackSize", "StackSize", "word"],
  ["paletteId", "PaletteID", "byte"],
  ["bodyPartRFoot", "ArmorPart_RFoot", "byte"],
  ["bodyPartLFoot", "ArmorPart_LFoot", "byte"],
  ["bodyPartRShin", "ArmorPart_RShin", "byte"],
  ["bodyPartLShin", "ArmorPart_LShin", "byte"],
  ["bodyPartLThigh", "ArmorPart_LThigh", "byte"],
  ["bodyPartRThigh", "ArmorPart_RThigh", "byte"],
  ["bodyPartPelvis", "ArmorPart_Pelvis", "byte"],
  ["bodyPartTorso", "ArmorPart_Torso", "byte"],
  ["bodyPartBelt", "ArmorPart_Belt", "byte"],
  ["bodyPartNeck", "ArmorPart_Neck", "byte"],
  ["bodyPartRFArm", "ArmorPart_RFArm", "byte"],
  ["bodyPartLFArm", "ArmorPart_LFArm", "byte"],
  ["bodyPartRBicep", "ArmorPart_RBicep", "byte"],
  ["bodyPartLBicep", "ArmorPart_LBicep", "byte"],
  ["bodyPartRShoul", "ArmorPart_RShoul", "byte"],
  ["bodyPartLShoul", "ArmorPart_LShoul", "byte"],
  ["bodyPartRHand", "ArmorPart_RHand", "byte"],
  ["bodyPartLHand", "ArmorPart_LHand", "byte"],
  ["bodyPartRobe", "ArmorPart_Robe", "byte"],
  ["leather1Color", "Leather1Color", "byte"],
  ["leather2Color", "Leather2Color", "byte"],
  ["cloth1Color", "Cloth1Color", "byte"],
  ["cloth2Color", "Cloth2Color", "byte"],
  ["metal1Color", "Metal1Color", "byte"],
  ["metal2Color", "Metal2Color", "byte"]
] as const;

const ITEM_BOOLEAN_FIELD_LABELS = [
  ["identified", "Identified"],
  ["stolen", "Stolen"],
  ["plot", "Plot"],
  ["cursed", "Cursed"]
] as const;

const ITEM_SCRIPT_FIELD_LABELS = [
  ["script.onused", "onused"],
  ["script.onheartbeat", "onheartbeat"],
  ["script.onuserdefined", "onuserdefined"],
  ["script.oninventorydisturbed", "oninvdisturbed"]
] as const;

export function serializeAreaItemPlacementsToGitGff(
  items: readonly SerializableAreaItemPlacement[]
): Buffer {
  return buildGffBuffer(
    [
      {
        label: "ItemList",
        type: "list",
        value: items.map((item) => ({
          typeId: AREA_ITEM_STRUCT_TYPE_ID,
          fields: buildAreaItemPlacementFields(item)
        }))
      }
    ],
    GIT_FILE_TYPE,
    ROOT_STRUCT_TYPE_ID
  );
}

export function buildAreaItemPlacementFields(
  item: SerializableAreaItemPlacement
): SupportedGffField[] {
  const metadata = item.itemMetadata ?? {};
  const fields: SupportedGffField[] = [];

  pushResRef(fields, "TemplateResRef", readString(metadata, "templateResRef") ?? item.templateResRef);
  pushCExoString(fields, "Tag", readString(metadata, "tag") ?? item.tag);
  pushLocString(
    fields,
    "LocName",
    readString(metadata, "localizedName") ?? item.localizedName,
    readNumber(metadata, "localizedNameStrRef") ?? item.localizedNameStrRef
  );
  pushLocString(
    fields,
    "Description",
    readString(metadata, "description") ?? item.description,
    readNumber(metadata, "descriptionStrRef") ?? item.descriptionStrRef
  );
  pushLocString(
    fields,
    "DescIdentified",
    readString(metadata, "identifiedDescription") ?? item.identifiedDescription,
    readNumber(metadata, "identifiedDescriptionStrRef") ?? item.identifiedDescriptionStrRef
  );
  pushCExoString(fields, "Comment", readString(metadata, "comments") ?? item.comments);

  pushFloat(fields, "XPosition", item.x);
  pushFloat(fields, "YPosition", item.y);
  pushFloat(fields, "ZPosition", item.z ?? 0);
  pushFloat(fields, "Bearing", degreesToRadians(item.bearing ?? 0));

  for (const [metadataKey, label, type] of ITEM_NUMBER_FIELD_LABELS) {
    pushNumber(fields, label, type, readNumber(metadata, metadataKey));
  }
  for (const [metadataKey, label] of ITEM_BOOLEAN_FIELD_LABELS) {
    const value = readBoolean(metadata, metadataKey);
    if (value !== undefined) {
      pushByte(fields, label, value ? 1 : 0);
    }
  }
  for (const [metadataKey, label] of ITEM_SCRIPT_FIELD_LABELS) {
    pushResRef(fields, label, readString(metadata, metadataKey));
  }

  const propertyEntries = readItemPropertyListEntries(metadata.itemPropertyListEntries);
  if (propertyEntries.length > 0) {
    fields.push({
      label: "PropertiesList",
      type: "list",
      value: propertyEntries.map((entry) => ({
        typeId: ITEM_PROPERTY_STRUCT_TYPE_ID,
        fields: buildItemPropertyFields(entry)
      }))
    });
  }

  return fields;
}

function buildItemPropertyFields(
  entry: SerializableAreaItemPropertyListEntry
): SupportedGffField[] {
  const fields: SupportedGffField[] = [];
  pushWord(fields, "PropertyName", entry.propertyName);
  pushWord(fields, "Subtype", entry.subtype);
  pushByte(fields, "CostTable", entry.costTable);
  pushWord(fields, "CostValue", entry.costValue);
  pushByte(fields, "Param1", entry.param1);
  pushByte(fields, "Param1Value", entry.param1Value);
  pushByte(fields, "ChanceAppear", entry.chanceAppear);
  return fields;
}

function readItemPropertyListEntries(
  value: ParsedAreaObjectMetadataPrimitive | undefined
): SerializableAreaItemPropertyListEntry[] {
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
      .map((entry) => ({
        propertyName: readObjectNumber(entry, "propertyName"),
        subtype: readObjectNumber(entry, "subtype"),
        costTable: readObjectNumber(entry, "costTable"),
        costValue: readObjectNumber(entry, "costValue"),
        param1: readObjectNumber(entry, "param1"),
        param1Value: readObjectNumber(entry, "param1Value"),
        chanceAppear: readObjectNumber(entry, "chanceAppear")
      }))
      .filter((entry) => Object.values(entry).some((entryValue) => entryValue !== undefined));
  } catch {
    return [];
  }
}

function pushNumber(
  fields: SupportedGffField[],
  label: string,
  type: "byte" | "word" | "dword",
  value: number | undefined
): void {
  if (value === undefined) {
    return;
  }
  fields.push({ label, type, value });
}

function pushByte(fields: SupportedGffField[], label: string, value: unknown): void {
  if (typeof value === "number" && Number.isFinite(value)) {
    fields.push({ label, type: "byte", value: Math.trunc(value) });
  }
}

function pushWord(fields: SupportedGffField[], label: string, value: unknown): void {
  if (typeof value === "number" && Number.isFinite(value)) {
    fields.push({ label, type: "word", value: Math.trunc(value) });
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
  strRef: unknown
): void {
  const normalizedText = typeof text === "string" ? text.trim() : "";
  const normalizedStrRef =
    typeof strRef === "number" && Number.isFinite(strRef) ? Math.trunc(strRef) : undefined;
  if (normalizedText || normalizedStrRef !== undefined) {
    fields.push({
      label,
      type: "cexolocstring",
      value: {
        ...(normalizedText ? { text: normalizedText } : {}),
        ...(normalizedStrRef !== undefined ? { strRef: normalizedStrRef } : {})
      }
    });
  }
}

function readString(
  metadata: Record<string, ParsedAreaObjectMetadataPrimitive>,
  key: string
): string | undefined {
  const value = metadata[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readNumber(
  metadata: Record<string, ParsedAreaObjectMetadataPrimitive>,
  key: string
): number | undefined {
  const value = metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : undefined;
}

function readBoolean(
  metadata: Record<string, ParsedAreaObjectMetadataPrimitive>,
  key: string
): boolean | undefined {
  const value = metadata[key];
  return typeof value === "boolean" ? value : undefined;
}

function readObjectNumber(source: Record<string, unknown>, key: string): number | undefined {
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : undefined;
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}
