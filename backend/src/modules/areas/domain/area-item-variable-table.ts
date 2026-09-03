export {
  MAX_AURORA_VARIABLE_ENTRIES as MAX_AREA_ITEM_VARIABLE_ENTRIES,
  MAX_AURORA_VARIABLE_NAME_CODE_UNITS as MAX_AREA_ITEM_VARIABLE_NAME_CODE_UNITS,
  MAX_AURORA_VARIABLE_STRING_CODE_UNITS as MAX_AREA_ITEM_VARIABLE_STRING_CODE_UNITS,
  MAX_AURORA_VARIABLE_TEXT_CODE_UNITS as MAX_AREA_ITEM_VARIABLE_TEXT_CODE_UNITS,
  AuroraVariableTableValidationError as AreaItemVariableTableValidationError,
  auroraVariableEntriesEqual as areaItemVariableEntriesEqual,
  auroraVariableSourceEntriesEqual as areaItemVariableSourceEntriesEqual,
  parseAuroraVariableMutation as parseAreaItemVariableMutation,
  parseAuroraVariableProvenance as parseAreaItemVariableProvenance,
  parseAuroraVariableSourceEntries as parseAreaItemVariableSourceEntries,
  parseAuroraVariableTargetEntries as parseAreaItemVariableTargetEntries,
} from "./aurora-variable-table";

export type {
  AuroraVariableMutation as ExistingAreaItemVariableMutation,
  AuroraVariableProvenance as AreaItemVariableProvenance,
  AuroraVariableSourceEntry as AreaItemVariableSourceEntry,
  AuroraVariableTargetEntry as AreaItemVariableTargetEntry,
} from "./aurora-variable-table";
