import {
  buildGffBuffer,
  type SupportedGffField
} from "../../../../catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import type { ParsedAreaObjectMetadataPrimitive } from "./aurora-gff-area-parser";
import { AREA_ITEM_INSTANCE_STATE_FIELDS } from "../../../domain/area-item-instance-state";

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
  ["modelPart1", "ModelPart1", "word"],
  ["modelPart2", "ModelPart2", "word"],
  ["modelPart3", "ModelPart3", "word"],
  ["bodyPartRFoot", "ArmorPart_RFoot", "word"],
  ["bodyPartLFoot", "ArmorPart_LFoot", "word"],
  ["bodyPartRShin", "ArmorPart_RShin", "word"],
  ["bodyPartLShin", "ArmorPart_LShin", "word"],
  ["bodyPartLThigh", "ArmorPart_LThigh", "word"],
  ["bodyPartRThigh", "ArmorPart_RThigh", "word"],
  ["bodyPartPelvis", "ArmorPart_Pelvis", "word"],
  ["bodyPartTorso", "ArmorPart_Torso", "word"],
  ["bodyPartBelt", "ArmorPart_Belt", "word"],
  ["bodyPartNeck", "ArmorPart_Neck", "word"],
  ["bodyPartRFArm", "ArmorPart_RFArm", "word"],
  ["bodyPartLFArm", "ArmorPart_LFArm", "word"],
  ["bodyPartRBicep", "ArmorPart_RBicep", "word"],
  ["bodyPartLBicep", "ArmorPart_LBicep", "word"],
  ["bodyPartRShoul", "ArmorPart_RShoul", "word"],
  ["bodyPartLShoul", "ArmorPart_LShoul", "word"],
  ["bodyPartRHand", "ArmorPart_RHand", "word"],
  ["bodyPartLHand", "ArmorPart_LHand", "word"],
  ["bodyPartRobe", "ArmorPart_Robe", "word"],
  ["leather1Color", "Leather1Color", "byte"],
  ["leather2Color", "Leather2Color", "byte"],
  ["cloth1Color", "Cloth1Color", "byte"],
  ["cloth2Color", "Cloth2Color", "byte"],
  ["metal1Color", "Metal1Color", "byte"],
  ["metal2Color", "Metal2Color", "byte"]
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
  pushFloat(fields, "XPosition", item.x);
  pushFloat(fields, "YPosition", item.y);
  pushFloat(fields, "ZPosition", item.z ?? 0);
  pushFloat(fields, "Bearing", degreesToRadians(item.bearing ?? 0));

  pushNumber(fields, "BaseItem", "int", readNumber(metadata, "baseItem"));
  for (const profile of AREA_ITEM_INSTANCE_STATE_FIELDS) {
    if (profile.valueKind === "boolean") {
      const value = readBoolean(metadata, profile.key);
      if (value !== undefined) pushByte(fields, profile.label, value ? 1 : 0);
    } else {
      pushNumber(fields, profile.label, profile.nativeType, readNumber(metadata, profile.key));
    }
  }
  for (const [metadataKey, label, type] of ITEM_NUMBER_FIELD_LABELS) {
    pushNumber(fields, label, type, readNumber(metadata, metadataKey));
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
  type: "byte" | "word" | "dword" | "int",
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
