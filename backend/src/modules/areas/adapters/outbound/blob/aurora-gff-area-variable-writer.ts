import { createHash } from "node:crypto";
import { parseRawGffDocument } from "../../../../catalog/adapters/outbound/blob/aurora-gff-template-parser";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../../../catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import {
  auroraVariableEntriesEqual,
  type AuroraVariableTargetEntry,
} from "../../../domain/aurora-variable-table";
import {
  parseExistingAreaVariableMutation,
  type AreaVariableProvenance,
  type ExistingAreaVariableMutation,
} from "../../../domain/area-variable-table";
import { parseAreaVariablesFromGitGff } from "./aurora-gff-area-parser";
import {
  cloneSupportedGffField,
  cloneSupportedGffFields,
} from "./aurora-gff-supported-field-cloner";

const NATIVE_OBJECT_LIST_LABELS = new Set([
  "Creature List",
  "Door List",
  "Encounter List",
  "List",
  "Placeable List",
  "SoundList",
  "StoreList",
  "TriggerList",
  "WaypointList",
]);

export interface UpdatedGitAreaVariables {
  readonly bytes: Buffer;
  readonly variables: AreaVariableProvenance;
}

/** Replaces only the exact top-level GIT VarTable and independently reads it back. */
export function updateGitAreaVariables(
  candidateBytes: Buffer,
  rawMutation: ExistingAreaVariableMutation,
  originalSourceBytes: Buffer = candidateBytes,
): UpdatedGitAreaVariables {
  const mutation = parseExistingAreaVariableMutation(rawMutation);
  const actualSourceSha256 = createHash("sha256")
    .update(originalSourceBytes)
    .digest("hex");
  if (actualSourceSha256 !== mutation.sourceGitSha256) {
    throw new Error("Area VarTable source GIT digest is stale.");
  }
  const original = parseAreaVariablesFromGitGff(originalSourceBytes);
  if (!original || !auroraVariableEntriesEqual(
    original.expectedEntries,
    mutation.expectedEntries,
  )) {
    throw new Error("Area VarTable original source provenance is missing or stale.");
  }
  const document = parseRawGffDocument(candidateBytes);
  if (!document || document.fileType !== "GIT ") {
    throw new Error("Area companion is not a readable GIT GFF document.");
  }
  if (document.fileVersion !== "V3.2") {
    throw new Error(`Unsupported Area GIT version ${document.fileVersion}.`);
  }
  const current = parseAreaVariablesFromGitGff(candidateBytes);
  if (!current || !auroraVariableEntriesEqual(
    current.expectedEntries,
    mutation.expectedEntries,
  )) {
    throw new Error("Area VarTable source provenance is missing or stale.");
  }

  const rootIndexes = document.fields.flatMap((field, index) =>
    field.label.toLowerCase() === "vartable" ? [index] : []);
  if (rootIndexes.length > 1) {
    throw new Error("GIT contains duplicate top-level VarTable fields.");
  }
  const rootIndex = rootIndexes[0] ?? -1;
  if (rootIndex >= 0) {
    const field = document.fields[rootIndex];
    if (field?.label !== "VarTable" || field.type !== "list") {
      throw new Error("GIT top-level VarTable has a noncanonical label or type.");
    }
  }

  let fields = cloneSupportedGffFields(document.fields);
  if (mutation.entries.length === 0) {
    if (rootIndex >= 0) fields.splice(rootIndex, 1);
  } else {
    const variableField = buildVariableField(mutation.entries);
    if (rootIndex >= 0) {
      fields[rootIndex] = variableField;
    } else {
      const firstObjectListIndex = fields.findIndex((field) =>
        NATIVE_OBJECT_LIST_LABELS.has(field.label));
      fields.splice(firstObjectListIndex < 0 ? fields.length : firstObjectListIndex, 0, variableField);
    }
  }
  fields = fields.map(cloneSupportedGffField);
  const bytes = buildGffBuffer(fields, document.fileType, document.rootStructTypeId);
  const readback = parseAreaVariablesFromGitGff(bytes);
  if (!readback || !auroraVariableEntriesEqual(readback.expectedEntries, mutation.entries)) {
    throw new Error("Area VarTable candidate failed independent typed ordered readback.");
  }
  return Object.freeze({ bytes, variables: readback });
}

function buildVariableField(
  entries: readonly AuroraVariableTargetEntry[],
): SupportedGffField {
  return {
    label: "VarTable",
    type: "list",
    value: entries.map((entry) => ({
      typeId: 0,
      fields: [
        { label: "Name", type: "cexostring", value: entry.name },
        { label: "Type", type: "dword", value: variableTypeId(entry) },
        entry.type === "int"
          ? { label: "Value", type: "int", value: entry.value }
          : entry.type === "float"
            ? { label: "Value", type: "float", value: entry.value }
            : { label: "Value", type: "cexostring", value: entry.value },
      ],
    })),
  };
}

function variableTypeId(entry: AuroraVariableTargetEntry): 1 | 2 | 3 {
  return entry.type === "int" ? 1 : entry.type === "float" ? 2 : 3;
}
