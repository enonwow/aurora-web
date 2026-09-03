import { createHash } from "node:crypto";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseRawGffDocument } from
  "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";

export function dynamicWaypointBlueprintFields(): SupportedGffField[] {
  return [
    { label: "Comment", type: "cexostring", value: "Dynamic waypoint palette comment." },
    { label: "Description", type: "cexolocstring", value: {
      strRef: 0xffffffff,
      entries: [{ id: 0, text: "A dynamic waypoint." }],
    } },
    { label: "LinkedTo", type: "cexostring", value: "DESTINATION_A" },
    { label: "TemplateResRef", type: "resref", value: "wp_dynamic" },
    { label: "LocalizedName", type: "cexolocstring", value: {
      strRef: 0xffffffff,
      entries: [{ id: 0, text: "Dynamic Waypoint" }],
    } },
    { label: "Tag", type: "cexostring", value: "WP_DYNAMIC" },
    { label: "HasMapNote", type: "byte", value: 1 },
    { label: "Appearance", type: "byte", value: 7 },
    { label: "MapNote", type: "cexolocstring", value: {
      strRef: 0xffffffff,
      entries: [{ id: 0, text: "Map note" }],
    } },
    { label: "MapNoteEnabled", type: "byte", value: 0 },
    { label: "VarTable", type: "list", value: [{
      typeId: 0,
      fields: [
        { label: "Name", type: "cexostring", value: "Counter" },
        { label: "Type", type: "dword", value: 1 },
        { label: "Value", type: "int", value: -2 },
      ],
    }] },
    { label: "PaletteID", type: "byte", value: 5 },
  ];
}

export function dynamicWaypointBlueprintFixture(
  fields: SupportedGffField[] = dynamicWaypointBlueprintFields(),
): Buffer {
  return buildGffBuffer(fields, "UTW ", 0xffffffff);
}

export function dynamicWaypointAdditionFixture(
  transform: Readonly<{ x: number; y: number; z: number; bearing: number }> = {
    x: 3.25,
    y: 4.5,
    z: 0.125,
    bearing: Math.PI / 3,
  },
) {
  const blueprintBytes = dynamicWaypointBlueprintFixture();
  return {
    kind: "waypoint" as const,
    localObjectId: "wpt_dynamic",
    sourceProfileId: "effective-catalog-utw-waypoint-copy-v1",
    sourceObjectKey: "modules/current/blueprints/waypoints/wp_dynamic.utw",
    sourceSizeBytes: blueprintBytes.length,
    templateResRef: "wp_dynamic",
    resRef: "wp_dynamic",
    tag: "WP_DYNAMIC",
    sourceSha256: createHash("sha256").update(blueprintBytes).digest("hex"),
    blueprintBytes,
    ...transform,
  };
}

export function expectedDynamicWaypointGitFields(
  transform: Readonly<{ x: number; y: number; z: number; bearing: number }>,
): SupportedGffField[] {
  const document = parseRawGffDocument(dynamicWaypointBlueprintFixture());
  if (!document) throw new Error("Invalid dynamic Waypoint UTW fixture.");
  const source = new Map(document.fields.map((field) => [field.label, field]));
  const field = (label: string): SupportedGffField => structuredClone(source.get(label)!);
  return [
    field("Appearance"),
    field("LinkedTo"),
    field("TemplateResRef"),
    field("Tag"),
    field("LocalizedName"),
    field("Description"),
    field("HasMapNote"),
    field("MapNote"),
    field("MapNoteEnabled"),
    field("VarTable"),
    { label: "XPosition", type: "float", value: Math.fround(transform.x * 10) },
    { label: "YPosition", type: "float", value: Math.fround(transform.y * 10) },
    { label: "ZPosition", type: "float", value: Math.fround(transform.z * 10) },
    { label: "XOrientation", type: "float", value: Math.fround(Math.cos(transform.bearing)) },
    { label: "YOrientation", type: "float", value: Math.fround(-Math.sin(transform.bearing)) },
  ];
}
