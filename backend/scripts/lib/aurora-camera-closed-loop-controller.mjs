/**
 * Chooses exactly one next camera primitive from measured response models.
 * It never converts milliseconds into degrees or zoom; the caller must
 * re-observe after the returned primitive before asking for another plan.
 */
export function planAuroraCameraCorrection({ currentPose, targetPose, tolerance, responseModels }) {
  const current = normalizePose(currentPose, "currentPose");
  const target = normalizePose(targetPose, "targetPose");
  const accepted = normalizeTolerance(tolerance);
  const errors = {
    yawDegrees: signedPeriodicDelta(target.yawDegrees, current.yawDegrees, 360),
    pitchDegrees: target.pitchDegrees - current.pitchDegrees,
    zoomLogRatio: Math.log(target.zoomPixelsPerTile / current.zoomPixelsPerTile),
  };
  const candidates = [];
  if (Math.abs(errors.yawDegrees) > accepted.yawDegrees) candidates.push(findCorrectingModel(responseModels, "yawDegrees", errors.yawDegrees));
  if (Math.abs(errors.pitchDegrees) > accepted.pitchDegrees) candidates.push(findCorrectingModel(responseModels, "pitchDegrees", errors.pitchDegrees));
  if (Math.abs(errors.zoomLogRatio) > Math.log(1 + accepted.zoomRatio)) candidates.push(findCorrectingModel(responseModels, "zoomLogRatio", errors.zoomLogRatio));
  const blockedCandidate = candidates.find((candidate) => candidate.status === "blocked");
  if (blockedCandidate) return blockedCandidate;
  if (candidates.length === 0) return { status: "at_target", currentPose: current, targetPose: target, errors };
  candidates.sort((left, right) => right.normalizedError - left.normalizedError);
  const next = candidates[0];
  return {
    status: "dispatch_one_then_reobserve",
    command: next.command,
    controlledDimension: next.dimension,
    errorBefore: next.error,
    responseModel: next.model,
    invariant: "Dispatch one target-only primitive, capture a new viewport, and recompute numeric pose before any further command. Duration is not an angle or zoom unit.",
  };
}

function findCorrectingModel(models, dimension, error) {
  const choices = Object.entries(models ?? {}).map(([command, model]) => ({ command, model })).filter(({ model }) => model?.status === "measured" && Number.isFinite(Number(model[dimension])) && Number(model[dimension]) !== 0);
  const compatible = choices.filter(({ model }) => Math.sign(Number(model[dimension])) === Math.sign(error));
  if (compatible.length === 0) return blocked("camera_response_model_missing", `No measured ${dimension} response model moves toward the requested target.`, { dimension, error, availableCommands: choices.map(({ command }) => command) });
  compatible.sort((left, right) => Math.abs(Number(right.model[dimension])) - Math.abs(Number(left.model[dimension])));
  const selected = compatible[0];
  return { status: "candidate", command: selected.command, dimension, error, model: selected.model, normalizedError: Math.abs(error) / responseScale(dimension) };
}

function normalizePose(value, name) {
  const yawDegrees = bounded(value?.yawDegrees, `${name}.yawDegrees`, 0, 360, false);
  const pitchDegrees = bounded(value?.pitchDegrees, `${name}.pitchDegrees`, 0, 90, true);
  const zoomPixelsPerTile = positive(value?.zoomPixelsPerTile, `${name}.zoomPixelsPerTile`);
  return { yawDegrees, pitchDegrees, zoomPixelsPerTile };
}
function normalizeTolerance(value) { return { yawDegrees: positive(value?.yawDegrees, "tolerance.yawDegrees"), pitchDegrees: positive(value?.pitchDegrees, "tolerance.pitchDegrees"), zoomRatio: bounded(value?.zoomRatio, "tolerance.zoomRatio", 0, 1, false) }; }
function signedPeriodicDelta(target, current, period) { let delta=(target-current)%period; if(delta>period/2)delta-=period; if(delta<=-period/2)delta+=period; return round(delta); }
function responseScale(dimension) { return dimension === "zoomLogRatio" ? 0.1 : dimension === "yawDegrees" ? 20 : 10; }
function bounded(value,name,min,max,inclusiveMax){const n=Number(value);if(!Number.isFinite(n)||n<min||(inclusiveMax?n>max:n>=max))throw codedError("camera_controller_pose_invalid",`${name} is outside range.`);return n;}
function positive(value,name){const n=Number(value);if(!Number.isFinite(n)||n<=0)throw codedError("camera_controller_pose_invalid",`${name} must be positive.`);return n;}
function blocked(blockerCode,reason,details=undefined){return{status:"blocked",blockerCode,reason,...(details===undefined?{}:{details})};}
function codedError(code,message){const error=new Error(message);error.code=code;return error;}
function round(value){return Math.round(value*1e6)/1e6;}
