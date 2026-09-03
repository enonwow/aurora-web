export {
  MAX_AURORA_VARIABLE_ENTRIES as MAX_AREA_STORE_VARIABLE_ENTRIES,
  MAX_AURORA_VARIABLE_NAME_CODE_UNITS as MAX_AREA_STORE_VARIABLE_NAME_CODE_UNITS,
  MAX_AURORA_VARIABLE_STRING_CODE_UNITS as MAX_AREA_STORE_VARIABLE_STRING_CODE_UNITS,
  MAX_AURORA_VARIABLE_TEXT_CODE_UNITS as MAX_AREA_STORE_VARIABLE_TEXT_CODE_UNITS,
  AuroraVariableTableValidationError as AreaStoreVariableTableValidationError,
  auroraVariableEntriesEqual as areaStoreVariableEntriesEqual,
  auroraVariableSourceEntriesEqual as areaStoreVariableSourceEntriesEqual,
  parseAuroraVariableMutation as parseAreaStoreVariableMutation,
  parseAuroraVariableProvenance as parseAreaStoreVariableProvenance,
  parseAuroraVariableSourceEntries as parseAreaStoreVariableSourceEntries,
  parseAuroraVariableTargetEntries as parseAreaStoreVariableTargetEntries,
} from "./aurora-variable-table";

export type {
  AuroraVariableMutation as ExistingAreaStoreVariableMutation,
  AuroraVariableProvenance as AreaStoreVariableProvenance,
  AuroraVariableSourceEntry as AreaStoreVariableSourceEntry,
  AuroraVariableTargetEntry as AreaStoreVariableTargetEntry,
} from "./aurora-variable-table";
