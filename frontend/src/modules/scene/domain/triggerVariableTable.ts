export {
  MAX_AURORA_VARIABLE_ENTRIES as MAX_TRIGGER_VARIABLE_ENTRIES,
  MAX_AURORA_VARIABLE_NAME_CODE_UNITS as MAX_TRIGGER_VARIABLE_NAME_CODE_UNITS,
  MAX_AURORA_VARIABLE_STRING_CODE_UNITS as MAX_TRIGGER_VARIABLE_STRING_CODE_UNITS,
  MAX_AURORA_VARIABLE_TEXT_CODE_UNITS as MAX_TRIGGER_VARIABLE_TEXT_CODE_UNITS,
  auroraVariableEntriesEqual as triggerVariableEntriesEqual,
  auroraVariableTargetEntriesEqual as triggerVariableTargetEntriesEqual,
  readAuroraVariableProvenance as readTriggerVariableProvenance,
  readAuroraVariableTargetEntries as readTriggerVariableTargetEntries,
} from "../../shared/domain/auroraVariableTable";
