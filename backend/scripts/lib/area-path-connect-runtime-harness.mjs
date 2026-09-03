const RESREF = /^[a-z0-9_]{1,16}$/u;
const TAG = /^[A-Z0-9_]{1,32}$/u;
const PROFILE_ID = /^[a-z0-9][a-z0-9:_-]{2,127}$/u;
const ROW_ID = /^[a-z0-9_]+:[0-9]+$/u;

export const PATH_CONNECT_RUNTIME_SCRIPT_RESREF = "pc_tms01_run";

export function buildPathConnectRuntimeHarnessSource(binding) {
  assertBinding(binding);
  const source = binding.source;
  const target = binding.target;
  const settle = nwFloat(binding.settleSeconds);
  const trial = nwFloat(binding.trialSeconds);
  const edge = nwFloat(binding.sharedEdgeX);
  const reached = nwFloat(binding.reachedDistance);
  const script = PATH_CONNECT_RUNTIME_SCRIPT_RESREF;

  return `// Generated for the exact immutable ${binding.profileId} differential.\n` +
`const string PC_STAGE = "AURORA_PATH_CONNECT_STAGE";\n` +
`\n` +
`string PcBool(int nValue)\n` +
`{\n` +
`    if (nValue) return "true";\n` +
`    return "false";\n` +
`}\n` +
`\n` +
`location PcLocation(string sAreaTag, float fX, float fY, float fZ)\n` +
`{\n` +
`    object oArea = GetObjectByTag(sAreaTag, 0);\n` +
`    if (!GetIsObjectValid(oArea)) return GetLocation(OBJECT_SELF);\n` +
`    return Location(oArea, Vector(fX, fY, fZ), 90.0);\n` +
`}\n` +
`\n` +
`void PcWriteOutcome(string sMarker, int bCrossed, int bReached, vector vPosition)\n` +
`{\n` +
`    WriteTimestampedLogEntry(sMarker +\n` +
`        " crossedSharedEdge=" + PcBool(bCrossed) +\n` +
`        " reachedTarget=" + PcBool(bReached) +\n` +
`        " timedOut=false" +\n` +
`        " x=" + FloatToString(vPosition.x, 0, 3) +\n` +
`        " y=" + FloatToString(vPosition.y, 0, 3));\n` +
`}\n` +
`\n` +
`void main()\n` +
`{\n` +
`    object oModule = GetModule();\n` +
`    int nStage = GetLocalInt(oModule, PC_STAGE);\n` +
`    object oActor = OBJECT_SELF;\n` +
`\n` +
`    if (nStage == 0)\n` +
`    {\n` +
`        oActor = GetEnteringObject();\n` +
`        if (!GetIsPC(oActor) || GetLocalInt(oModule, "AURORA_PATH_CONNECT_STARTED")) return;\n` +
`        object oPositiveArea = GetObjectByTag("${binding.positiveAreaTag}", 0);\n` +
`        object oNegativeArea = GetObjectByTag("${binding.negativeAreaTag}", 0);\n` +
`        if (!GetIsObjectValid(oPositiveArea) || !GetIsObjectValid(oNegativeArea))\n` +
`        {\n` +
`            WriteTimestampedLogEntry("AURORA_PATH_CONNECT_FAILURE reason=area_lookup");\n` +
`            WriteTimestampedLogEntry("AURORA_PATH_CONNECT_COMPLETE failures=1");\n` +
`            return;\n` +
`        }\n` +
`        SetLocalInt(oModule, "AURORA_PATH_CONNECT_STARTED", TRUE);\n` +
`        SetLocalInt(oModule, PC_STAGE, 1);\n` +
`        WriteTimestampedLogEntry("AURORA_PATH_CONNECT_START profile=${binding.profileId} row=${binding.rowId}");\n` +
`        AssignCommand(oActor, ClearAllActions(TRUE));\n` +
`        AssignCommand(oActor, ActionJumpToLocation(PcLocation("${binding.positiveAreaTag}", ${nwFloat(source.x)}, ${nwFloat(source.y)}, ${nwFloat(source.z)})));\n` +
`        DelayCommand(${settle}, ExecuteScript("${script}", oActor));\n` +
`        return;\n` +
`    }\n` +
`\n` +
`    if (nStage == 1)\n` +
`    {\n` +
`        SetLocalInt(oModule, PC_STAGE, 2);\n` +
`        AssignCommand(oActor, ClearAllActions(TRUE));\n` +
`        AssignCommand(oActor, ActionMoveToLocation(PcLocation("${binding.positiveAreaTag}", ${nwFloat(target.x)}, ${nwFloat(target.y)}, ${nwFloat(target.z)}), TRUE));\n` +
`        DelayCommand(${trial}, ExecuteScript("${script}", oActor));\n` +
`        return;\n` +
`    }\n` +
`\n` +
`    if (nStage == 2)\n` +
`    {\n` +
`        vector vPositive = GetPosition(oActor);\n` +
`        location lPositiveTarget = PcLocation("${binding.positiveAreaTag}", ${nwFloat(target.x)}, ${nwFloat(target.y)}, ${nwFloat(target.z)});\n` +
`        int bPositiveCrossed = GetArea(oActor) == GetObjectByTag("${binding.positiveAreaTag}", 0) && vPositive.x > ${edge};\n` +
`        int bPositiveReached = GetDistanceBetweenLocations(GetLocation(oActor), lPositiveTarget) <= ${reached};\n` +
`        PcWriteOutcome("AURORA_PATH_CONNECT_POSITIVE", bPositiveCrossed, bPositiveReached, vPositive);\n` +
`        SetLocalInt(oModule, "AURORA_PATH_CONNECT_POSITIVE_OK", bPositiveCrossed && bPositiveReached);\n` +
`        SetLocalInt(oModule, PC_STAGE, 3);\n` +
`        AssignCommand(oActor, ClearAllActions(TRUE));\n` +
`        AssignCommand(oActor, ActionJumpToLocation(PcLocation("${binding.negativeAreaTag}", ${nwFloat(source.x)}, ${nwFloat(source.y)}, ${nwFloat(source.z)})));\n` +
`        DelayCommand(${settle}, ExecuteScript("${script}", oActor));\n` +
`        return;\n` +
`    }\n` +
`\n` +
`    if (nStage == 3)\n` +
`    {\n` +
`        SetLocalInt(oModule, PC_STAGE, 4);\n` +
`        AssignCommand(oActor, ClearAllActions(TRUE));\n` +
`        AssignCommand(oActor, ActionMoveToLocation(PcLocation("${binding.negativeAreaTag}", ${nwFloat(target.x)}, ${nwFloat(target.y)}, ${nwFloat(target.z)}), TRUE));\n` +
`        DelayCommand(${trial}, ExecuteScript("${script}", oActor));\n` +
`        return;\n` +
`    }\n` +
`\n` +
`    if (nStage == 4)\n` +
`    {\n` +
`        vector vNegative = GetPosition(oActor);\n` +
`        location lNegativeTarget = PcLocation("${binding.negativeAreaTag}", ${nwFloat(target.x)}, ${nwFloat(target.y)}, ${nwFloat(target.z)});\n` +
`        int bNegativeCrossed = GetArea(oActor) == GetObjectByTag("${binding.negativeAreaTag}", 0) && vNegative.x > ${edge};\n` +
`        int bNegativeReached = GetDistanceBetweenLocations(GetLocation(oActor), lNegativeTarget) <= ${reached};\n` +
`        PcWriteOutcome("AURORA_PATH_CONNECT_NEGATIVE", bNegativeCrossed, bNegativeReached, vNegative);\n` +
`        int nFailures = 0;\n` +
`        if (!GetLocalInt(oModule, "AURORA_PATH_CONNECT_POSITIVE_OK")) nFailures += 1;\n` +
`        if (bNegativeCrossed || bNegativeReached) nFailures += 1;\n` +
`        WriteTimestampedLogEntry("AURORA_PATH_CONNECT_COMPLETE failures=" + IntToString(nFailures));\n` +
`        SetLocalInt(oModule, PC_STAGE, 5);\n` +
`        AssignCommand(oActor, ClearAllActions(TRUE));\n` +
`    }\n` +
`}\n`;
}

export function parsePathConnectRuntimeLog(text, binding) {
  assertBinding(binding);
  if (typeof text !== "string") throw logInvalid("not_string");
  const start = occurrences(text, new RegExp(
    `AURORA_PATH_CONNECT_START profile=${escapeRegex(binding.profileId)} row=${escapeRegex(binding.rowId)}(?:\\s|$)`,
    "gu",
  ));
  const positive = parseOutcome(text, "POSITIVE");
  const negative = parseOutcome(text, "NEGATIVE");
  const complete = [...text.matchAll(/AURORA_PATH_CONNECT_COMPLETE failures=([0-9]+)(?:\s|$)/gu)];
  if (start !== 1 || complete.length !== 1 || Number(complete[0][1]) !== 0) throw logInvalid("envelope");
  if (!positive.crossedSharedEdge || !positive.reachedTarget || positive.timedOut ||
    negative.crossedSharedEdge || negative.reachedTarget || negative.timedOut) {
    throw logInvalid("outcome");
  }
  return {
    verified: true,
    engine: "nwmain",
    positive,
    negative,
    failures: [],
  };
}

function parseOutcome(text, label) {
  const pattern = new RegExp(
    `AURORA_PATH_CONNECT_${label} crossedSharedEdge=(true|false) reachedTarget=(true|false) timedOut=(true|false)(?:\\s|$)`,
    "gu",
  );
  const matches = [...text.matchAll(pattern)];
  if (matches.length !== 1) throw logInvalid(`outcome_${label.toLowerCase()}`);
  return {
    crossedSharedEdge: matches[0][1] === "true",
    reachedTarget: matches[0][2] === "true",
    timedOut: matches[0][3] === "true",
  };
}

function assertBinding(value) {
  const keys = [
    "profileId", "rowId", "positiveAreaTag", "negativeAreaTag", "sharedEdgeX",
    "source", "target", "settleSeconds", "trialSeconds", "reachedDistance",
  ];
  if (!value || typeof value !== "object" || Array.isArray(value) ||
    !exactKeys(value, keys) || !PROFILE_ID.test(value.profileId ?? "") || !ROW_ID.test(value.rowId ?? "") ||
    !TAG.test(value.positiveAreaTag ?? "") || !TAG.test(value.negativeAreaTag ?? "") ||
    value.positiveAreaTag === value.negativeAreaTag || !point(value.source) || !point(value.target) ||
    !Number.isFinite(value.sharedEdgeX) || !(value.source.x < value.sharedEdgeX) || !(value.target.x > value.sharedEdgeX) ||
    value.source.y !== value.target.y || value.source.z !== value.target.z ||
    !positiveFinite(value.settleSeconds) || !positiveFinite(value.trialSeconds) || !positiveFinite(value.reachedDistance) ||
    !RESREF.test(PATH_CONNECT_RUNTIME_SCRIPT_RESREF)) {
    throw new Error("path_connect_runtime_binding_invalid");
  }
}

function point(value) {
  return value && typeof value === "object" && !Array.isArray(value) &&
    exactKeys(value, ["x", "y", "z"]) && [value.x, value.y, value.z].every(Number.isFinite);
}

function exactKeys(value, keys) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function positiveFinite(value) {
  return Number.isFinite(value) && value > 0;
}

function nwFloat(value) {
  if (!Number.isFinite(value)) throw new Error("path_connect_runtime_binding_invalid");
  const rendered = Number(value).toFixed(3).replace(/0+$/u, "").replace(/\.$/u, "");
  return rendered.includes(".") ? rendered : `${rendered}.0`;
}

function occurrences(text, expression) {
  return [...text.matchAll(expression)].length;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function logInvalid(detail) {
  return new Error(`path_connect_runtime_log_invalid:${detail}`);
}
