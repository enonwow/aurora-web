export {
  MAX_AURORA_VARIABLE_ENTRIES as MAX_AREA_CREATURE_VARIABLE_ENTRIES,
  MAX_AURORA_VARIABLE_NAME_CODE_UNITS as MAX_AREA_CREATURE_VARIABLE_NAME_CODE_UNITS,
  MAX_AURORA_VARIABLE_STRING_CODE_UNITS as MAX_AREA_CREATURE_VARIABLE_STRING_CODE_UNITS,
  MAX_AURORA_VARIABLE_TEXT_CODE_UNITS as MAX_AREA_CREATURE_VARIABLE_TEXT_CODE_UNITS,
  AuroraVariableTableValidationError as AreaCreatureVariableTableValidationError,
  auroraVariableEntriesEqual as areaCreatureVariableEntriesEqual,
  auroraVariableSourceEntriesEqual as areaCreatureVariableSourceEntriesEqual,
  parseAuroraVariableMutation as parseAreaCreatureVariableMutation,
  parseAuroraVariableProvenance as parseAreaCreatureVariableProvenance,
  parseAuroraVariableSourceEntries as parseAreaCreatureVariableSourceEntries,
  parseAuroraVariableTargetEntries as parseAreaCreatureVariableTargetEntries,
} from "./aurora-variable-table";

export type {
  AuroraVariableMutation as ExistingAreaCreatureVariableMutation,
  AuroraVariableProvenance as AreaCreatureVariableProvenance,
  AuroraVariableSourceEntry as AreaCreatureVariableSourceEntry,
  AuroraVariableTargetEntry as AreaCreatureVariableTargetEntry,
} from "./aurora-variable-table";
