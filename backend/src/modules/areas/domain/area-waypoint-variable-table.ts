export {
  MAX_AURORA_VARIABLE_ENTRIES as MAX_AREA_WAYPOINT_VARIABLE_ENTRIES,
  MAX_AURORA_VARIABLE_NAME_CODE_UNITS as MAX_AREA_WAYPOINT_VARIABLE_NAME_CODE_UNITS,
  MAX_AURORA_VARIABLE_STRING_CODE_UNITS as MAX_AREA_WAYPOINT_VARIABLE_STRING_CODE_UNITS,
  MAX_AURORA_VARIABLE_TEXT_CODE_UNITS as MAX_AREA_WAYPOINT_VARIABLE_TEXT_CODE_UNITS,
  AuroraVariableTableValidationError as AreaWaypointVariableTableValidationError,
  auroraVariableEntriesEqual as areaWaypointVariableEntriesEqual,
  auroraVariableSourceEntriesEqual as areaWaypointVariableSourceEntriesEqual,
  parseAuroraVariableMutation as parseAreaWaypointVariableMutation,
  parseAuroraVariableProvenance as parseAreaWaypointVariableProvenance,
  parseAuroraVariableSourceEntries as parseAreaWaypointVariableSourceEntries,
  parseAuroraVariableTargetEntries as parseAreaWaypointVariableTargetEntries,
} from "./aurora-variable-table";

export type {
  AuroraVariableMutation as ExistingAreaWaypointVariableMutation,
  AuroraVariableProvenance as AreaWaypointVariableProvenance,
  AuroraVariableSourceEntry as AreaWaypointVariableSourceEntry,
  AuroraVariableTargetEntry as AreaWaypointVariableTargetEntry,
} from "./aurora-variable-table";
