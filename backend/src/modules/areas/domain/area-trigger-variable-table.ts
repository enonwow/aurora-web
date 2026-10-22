export {
  MAX_AURORA_VARIABLE_ENTRIES as MAX_AREA_TRIGGER_VARIABLE_ENTRIES,
  MAX_AURORA_VARIABLE_NAME_CODE_UNITS as MAX_AREA_TRIGGER_VARIABLE_NAME_CODE_UNITS,
  MAX_AURORA_VARIABLE_STRING_CODE_UNITS as MAX_AREA_TRIGGER_VARIABLE_STRING_CODE_UNITS,
  MAX_AURORA_VARIABLE_TEXT_CODE_UNITS as MAX_AREA_TRIGGER_VARIABLE_TEXT_CODE_UNITS,
  AuroraVariableTableValidationError as AreaTriggerVariableTableValidationError,
  auroraVariableEntriesEqual as areaTriggerVariableEntriesEqual,
  auroraVariableSourceEntriesEqual as areaTriggerVariableSourceEntriesEqual,
  parseAuroraVariableMutation as parseAreaTriggerVariableMutation,
  parseAuroraVariableProvenance as parseAreaTriggerVariableProvenance,
  parseAuroraVariableSourceEntries as parseAreaTriggerVariableSourceEntries,
  parseAuroraVariableTargetEntries as parseAreaTriggerVariableTargetEntries,
} from "./aurora-variable-table";

export type {
  AuroraVariableMutation as ExistingAreaTriggerVariableMutation,
  AuroraVariableProvenance as AreaTriggerVariableProvenance,
  AuroraVariableSourceEntry as AreaTriggerVariableSourceEntry,
  AuroraVariableTargetEntry as AreaTriggerVariableTargetEntry,
} from "./aurora-variable-table";
