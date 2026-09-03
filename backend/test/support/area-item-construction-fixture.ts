import { createHash } from "node:crypto";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";

export function itemBlueprintFixture(): Buffer {
  return buildGffBuffer(itemBlueprintFields(), "UTI ", 0xffffffff);
}

export function itemAdditionFixture(
  transform: Readonly<{ x: number; y: number; z: number; bearing: number }> = {
    x: 1.5,
    y: 2.25,
    z: 0.1,
    bearing: Math.PI / 4,
  },
) {
  const blueprintBytes = itemBlueprintFixture();
  return {
    kind: "item" as const,
    localObjectId: "itm_001",
    sourceProfileId: "nwn-base-key-uti-nw-cloth022-v1",
    templateResRef: "nw_cloth022",
    resRef: "nw_cloth022",
    tag: "NW_CLOTH022",
    sourceSha256: createHash("sha256").update(blueprintBytes).digest("hex"),
    blueprintBytes,
    ...transform,
  };
}

function itemBlueprintFields(): SupportedGffField[] {
  return [
    { label: "BaseItem", type: "int", value: 16 },
    { label: "StackSize", type: "word", value: 1 },
    { label: "ArmorPart_Pelvis", type: "byte", value: 3 },
    { label: "Stolen", type: "byte", value: 0 },
    { label: "LocalizedName", type: "cexolocstring", value: { strRef: 12923, entries: [] } },
    { label: "ArmorPart_RShoul", type: "byte", value: 0 },
    { label: "ArmorPart_LThigh", type: "byte", value: 3 },
    { label: "ArmorPart_Belt", type: "byte", value: 0 },
    { label: "Description", type: "cexolocstring", value: { strRef: 0xffffffff, entries: [] } },
    { label: "ArmorPart_RThigh", type: "byte", value: 3 },
    { label: "ArmorPart_LHand", type: "byte", value: 1 },
    { label: "Cost", type: "dword", value: 1 },
    { label: "ArmorPart_RFoot", type: "byte", value: 6 },
    { label: "ArmorPart_LShoul", type: "byte", value: 0 },
    { label: "DescIdentified", type: "cexolocstring", value: { strRef: 0xffffffff, entries: [] } },
    { label: "ArmorPart_LShin", type: "byte", value: 16 },
    { label: "Leather2Color", type: "byte", value: 14 },
    { label: "ArmorPart_RHand", type: "byte", value: 1 },
    { label: "PropertiesList", type: "list", value: [] },
    { label: "ArmorPart_Torso", type: "byte", value: 39 },
    { label: "Tag", type: "cexostring", value: "NW_CLOTH022" },
    { label: "Leather1Color", type: "byte", value: 11 },
    { label: "Cloth1Color", type: "byte", value: 11 },
    { label: "PaletteID", type: "byte", value: 5 },
    { label: "Comment", type: "cexostring", value: "1" },
    { label: "TemplateResRef", type: "resref", value: "nw_cloth022" },
    { label: "Charges", type: "byte", value: 0 },
    { label: "Identified", type: "byte", value: 1 },
    { label: "ArmorPart_RShin", type: "byte", value: 16 },
    { label: "Plot", type: "byte", value: 0 },
    { label: "ArmorPart_Neck", type: "byte", value: 1 },
    { label: "ArmorPart_LFoot", type: "byte", value: 6 },
    { label: "Cloth2Color", type: "byte", value: 7 },
    { label: "Metal1Color", type: "byte", value: 23 },
    { label: "AddCost", type: "dword", value: 0 },
    { label: "ArmorPart_RBicep", type: "byte", value: 1 },
    { label: "ArmorPart_RFArm", type: "byte", value: 1 },
    { label: "ArmorPart_LFArm", type: "byte", value: 1 },
    { label: "ArmorPart_LBicep", type: "byte", value: 1 },
    { label: "Metal2Color", type: "byte", value: 6 },
  ];
}
