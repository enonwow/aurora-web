import { createHash } from "node:crypto";

import {
  isDword,
  isExactModuleFactionCatalog,
  isModuleFactionCatalogInputAdmitted,
  isModuleFactionName,
  MAX_MODULE_FACTION_COUNT,
  MODULE_FACTION_ROOT_TYPE_ID,
  type ModuleFactionCatalog,
  type ModuleFactionCatalogInput,
  type ModuleFactionCatalogRow,
} from "../../../domain/module-faction-catalog";
import { parseRawGffDocument } from "./aurora-gff-template-parser";
import type { SupportedGffField } from "./aurora-gff-uti-writer";

type ListField = Extract<SupportedGffField, { type: "list" }>;

function exactField<Type extends SupportedGffField["type"]>(
  fields: readonly SupportedGffField[],
  label: string,
  type: Type,
): Extract<SupportedGffField, { type: Type }> | null {
  const matches = fields.filter((field) => field.label === label);
  const field = matches[0];
  return matches.length === 1 && field?.type === type
    ? field as Extract<SupportedGffField, { type: Type }>
    : null;
}

function hasExactLabels(fields: readonly SupportedGffField[], labels: readonly string[]): boolean {
  return fields.length === labels.length && labels.every(
    (label) => fields.filter((field) => field.label === label).length === 1,
  );
}

export function parseModuleFactionCatalog(
  input: ModuleFactionCatalogInput,
): ModuleFactionCatalog | null {
  if (!isModuleFactionCatalogInputAdmitted(input)) return null;
  const document = parseRawGffDocument(input.bytes);
  if (!document || document.fileType !== "FAC " || document.fileVersion !== "V3.2" ||
    document.rootStructTypeId !== MODULE_FACTION_ROOT_TYPE_ID ||
    !hasExactLabels(document.fields, ["FactionList", "RepList"])) return null;

  const factionList = exactField(document.fields, "FactionList", "list") as ListField | null;
  const repList = exactField(document.fields, "RepList", "list") as ListField | null;
  if (!factionList || !repList || factionList.value.length < 1 ||
    factionList.value.length > MAX_MODULE_FACTION_COUNT ||
    repList.value.length > factionList.value.length * factionList.value.length) return null;

  const factionCount = factionList.value.length;
  const rows: ModuleFactionCatalogRow[] = [];
  for (let factionId = 0; factionId < factionCount; factionId += 1) {
    const entry = factionList.value[factionId];
    if (!entry || entry.typeId !== factionId || !hasExactLabels(entry.fields, [
      "FactionName", "FactionParentID", "FactionGlobal",
    ])) return null;
    const name = exactField(entry.fields, "FactionName", "cexostring");
    const parent = exactField(entry.fields, "FactionParentID", "dword");
    const global = exactField(entry.fields, "FactionGlobal", "word");
    if (!name || !parent || !global || !isModuleFactionName(name.value) ||
      !isDword(parent.value) ||
      !(parent.value === 0xffffffff || parent.value < factionCount) ||
      (global.value !== 0 && global.value !== 1)) return null;
    rows.push({
      factionId,
      name: name.value,
      parentFactionId: parent.value,
      isGlobal: global.value === 1,
    });
  }

  const reputationPairs = new Set<string>();
  for (const entry of repList.value) {
    if (!hasExactLabels(entry.fields, ["FactionID1", "FactionID2", "FactionRep"])) return null;
    const factionId1 = exactField(entry.fields, "FactionID1", "dword");
    const factionId2 = exactField(entry.fields, "FactionID2", "dword");
    const reputation = exactField(entry.fields, "FactionRep", "dword");
    if (!factionId1 || !factionId2 || !reputation ||
      !isDword(factionId1.value) || factionId1.value >= factionCount ||
      !isDword(factionId2.value) || factionId2.value >= factionCount ||
      !isDword(reputation.value) || reputation.value > 100) return null;
    const pair = `${factionId1.value}:${factionId2.value}`;
    if (reputationPairs.has(pair)) return null;
    reputationPairs.add(pair);
  }

  const catalog: ModuleFactionCatalog = {
    descriptor: {
      resourceName: "repute.fac",
      sourceObjectKey: input.sourceObjectKey,
      sha256: createHash("sha256").update(input.bytes).digest("hex"),
      sizeBytes: input.bytes.length,
      factionCount,
    },
    rows,
  };
  return isExactModuleFactionCatalog(catalog) ? catalog : null;
}
