import { parseRawGffDocument } from
  "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";

const ROOT_TYPE = 0xffffffff;
const FAMILY_PROFILES = [
  ["Creature List", 4],
  ["Door List", 8],
  ["Encounter List", 7],
  ["List", 0],
  ["Placeable List", 9],
  ["SoundList", 6],
  ["StoreList", 11],
  ["TriggerList", 1],
  ["WaypointList", 5],
] as const;

export function creatureAreaObjectPair(
  creatureFields: readonly SupportedGffField[],
): { git: Buffer; gic: Buffer } {
  const gitFields: SupportedGffField[] = FAMILY_PROFILES.map(([label, typeId]) => ({
    label,
    type: "list",
    value: label === "Creature List"
      ? [{
          typeId,
          fields: [
            ...creatureFields,
            { label: "Unrelated", type: "int", value: 77 },
          ],
        }]
      : [],
  }));
  const gicFields: SupportedGffField[] = FAMILY_PROFILES.map(([label, typeId]) => ({
    label,
    type: "list",
    value: label === "Creature List"
      ? [{ typeId, fields: [{ label: "Comment", type: "cexostring", value: "Guard" }] }]
      : [],
  }));
  return {
    git: buildGffBuffer(gitFields, "GIT ", ROOT_TYPE),
    gic: buildGffBuffer(gicFields, "GIC ", ROOT_TYPE),
  };
}

export function gffList(
  document: ReturnType<typeof parseRawGffDocument>,
  label: string,
) {
  const field = document?.fields.find((candidate) => candidate.label === label);
  return field?.type === "list" ? field : undefined;
}
