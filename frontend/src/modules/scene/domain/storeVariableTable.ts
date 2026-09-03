export {
  MAX_AURORA_VARIABLE_ENTRIES as MAX_STORE_VARIABLE_ENTRIES,
  MAX_AURORA_VARIABLE_NAME_CODE_UNITS as MAX_STORE_VARIABLE_NAME_CODE_UNITS,
  MAX_AURORA_VARIABLE_STRING_CODE_UNITS as MAX_STORE_VARIABLE_STRING_CODE_UNITS,
  MAX_AURORA_VARIABLE_TEXT_CODE_UNITS as MAX_STORE_VARIABLE_TEXT_CODE_UNITS,
  auroraVariableEntriesEqual as storeVariableEntriesEqual,
  auroraVariableTargetEntriesEqual as storeVariableTargetEntriesEqual,
  readAuroraVariableProvenance as readStoreVariableProvenance,
  readAuroraVariableTargetEntries as readStoreVariableTargetEntries,
} from "../../shared/domain/auroraVariableTable";
