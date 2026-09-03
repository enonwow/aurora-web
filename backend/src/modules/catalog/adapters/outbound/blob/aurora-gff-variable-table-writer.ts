import {
  parseAuroraVariableTargetEntries,
  type AuroraVariableTargetEntry,
} from "../../../../../common/aurora/variable-table/aurora-variable-table";
import type { SupportedGffField } from "./aurora-gff-uti-writer";

const VARIABLE_STRUCT_TYPE_ID = 0;

type VariableTableField = Extract<SupportedGffField, { type: "list" }>;

export function buildAuroraVariableTableField(value: unknown): VariableTableField | null {
  if (value === undefined) {
    return null;
  }
  const entries = parseAuroraVariableTargetEntries(value);
  if (entries.length === 0) {
    return null;
  }
  return {
    label: "VarTable",
    type: "list",
    value: entries.map(buildAuroraVariableEntryFields),
  };
}

function buildAuroraVariableEntryFields(entry: AuroraVariableTargetEntry): {
  typeId: number;
  fields: SupportedGffField[];
} {
  const fields: SupportedGffField[] = [
    { label: "Name", type: "cexostring", value: entry.name },
    {
      label: "Type",
      type: "int",
      value: entry.type === "int" ? 1 : entry.type === "float" ? 2 : 3,
    },
  ];
  if (entry.type === "int") {
    fields.push({ label: "Value", type: "int", value: entry.value });
  } else if (entry.type === "float") {
    fields.push({ label: "Value", type: "float", value: entry.value });
  } else {
    fields.push({ label: "Value", type: "cexostring", value: entry.value });
  }
  return { typeId: VARIABLE_STRUCT_TYPE_ID, fields };
}
