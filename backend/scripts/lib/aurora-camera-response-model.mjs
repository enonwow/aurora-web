const DIMENSIONS = ["yawDegrees", "pitchDegrees", "zoomLogRatio"];

/** Aggregates independently measured transitions into command response models. */
export function estimateAuroraCameraResponseModels({ measurements, minimumSamples = 3, maxRelativeMad = 0.45 }) {
  const groups = new Map();
  for (const item of measurements ?? []) {
    const normalized = normalizeMeasurement(item);
    if (!groups.has(normalized.command)) groups.set(normalized.command, []);
    groups.get(normalized.command).push(normalized);
  }
  const models = {};
  const blockers = [];
  for (const [command, entries] of groups) {
    const result = estimateCommand(command, entries, minimumSamples, maxRelativeMad);
    if (result.status === "measured") models[command] = result;
    else blockers.push({ command, ...result });
  }
  return { status: blockers.length ? "blocked" : "measured", version: "aurora-camera-response-model/v1", minimumSamples: Number(minimumSamples), models, blockers };
}

function estimateCommand(command, entries, minimumSamples, maxRelativeMad) {
  if (entries.length < Number(minimumSamples)) return blocked("camera_response_samples_insufficient", `Command ${command} has ${entries.length} measurements; ${minimumSamples} required.`);
  const model = { status: "measured", command, sampleCount: entries.length, source: "measured_before_after_numeric_camera_pose" };
  let hasAny = false;
  for (const dimension of DIMENSIONS) {
    const values = entries.map((entry) => entry[dimension]).filter(Number.isFinite);
    if (!values.length) continue;
    if (values.every((value) => Math.abs(value) < 1e-9)) continue;
    const signs = new Set(values.map(Math.sign));
    if (signs.size !== 1 || signs.has(0)) return blocked("camera_response_direction_inconsistent", `Command ${command} has inconsistent ${dimension} direction.`, { dimension, values });
    const median = medianOf(values);
    const mad = medianOf(values.map((value) => Math.abs(value - median)));
    if (Math.abs(median) < 1e-9 || mad / Math.abs(median) > Number(maxRelativeMad)) return blocked("camera_response_variance_too_large", `Command ${command} has unstable ${dimension} response.`, { dimension, median, mad, maxRelativeMad: Number(maxRelativeMad), values });
    model[dimension] = round(median);
    model[`${dimension}Mad`] = round(mad);
    hasAny = true;
  }
  if (!hasAny) return blocked("camera_response_metric_missing", `Command ${command} does not carry a numeric camera delta.`);
  return model;
}

function normalizeMeasurement(value) {
  const command = String(value?.command ?? "").trim();
  if (!command) throw codedError("camera_response_command_missing", "Measurement command is required.");
  const before = value?.beforePose ?? value?.before;
  const after = value?.afterPose ?? value?.after;
  if (!before || !after) throw codedError("camera_response_pose_missing", "Each measurement requires before and after numeric poses.");
  const yawBefore=finite(before.yawDegrees), yawAfter=finite(after.yawDegrees);
  const pitchBefore=finite(before.pitchDegrees), pitchAfter=finite(after.pitchDegrees);
  const zoomBefore=finite(before.zoomPixelsPerTile), zoomAfter=finite(after.zoomPixelsPerTile);
  if (!yawBefore && !pitchBefore && !zoomBefore) throw codedError("camera_response_pose_missing", "No numeric camera dimensions exist in measurement.");
  return { command, yawDegrees: yawBefore&&yawAfter ? signedPeriodicDelta(after.yawDegrees,before.yawDegrees,360) : null, pitchDegrees: pitchBefore&&pitchAfter ? Number(after.pitchDegrees)-Number(before.pitchDegrees) : null, zoomLogRatio: zoomBefore&&zoomAfter ? Math.log(Number(after.zoomPixelsPerTile)/Number(before.zoomPixelsPerTile)) : null };
}
function finite(value){return Number.isFinite(Number(value));}
function medianOf(values){const sorted=[...values].sort((a,b)=>a-b);const mid=Math.floor(sorted.length/2);return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;}
function signedPeriodicDelta(after,before,period){let delta=(Number(after)-Number(before))%period;if(delta>period/2)delta-=period;if(delta<=-period/2)delta+=period;return delta;}
function blocked(blockerCode,reason,details=undefined){return{status:"blocked",blockerCode,reason,...(details===undefined?{}:{details})};}
function codedError(code,message){const error=new Error(message);error.code=code;return error;}
function round(value){return Math.round(value*1e6)/1e6;}
