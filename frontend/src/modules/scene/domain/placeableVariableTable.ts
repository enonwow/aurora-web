export {
  MAX_AURORA_VARIABLE_ENTRIES as MAX_PLACEABLE_VARIABLE_ENTRIES,
  MAX_AURORA_VARIABLE_NAME_CODE_UNITS as MAX_PLACEABLE_VARIABLE_NAME_CODE_UNITS,
  MAX_AURORA_VARIABLE_STRING_CODE_UNITS as MAX_PLACEABLE_VARIABLE_STRING_CODE_UNITS,
  MAX_AURORA_VARIABLE_TEXT_CODE_UNITS as MAX_PLACEABLE_VARIABLE_TEXT_CODE_UNITS,
  auroraVariableEntriesEqual as placeableVariableEntriesEqual,
  auroraVariableTargetEntriesEqual as placeableVariableTargetEntriesEqual,
  readAuroraVariableProvenance as readPlaceableVariableProvenance,
  readAuroraVariableTargetEntries as readPlaceableVariableTargetEntries,
} from "../../shared/domain/auroraVariableTable";
