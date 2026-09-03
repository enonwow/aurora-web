import * as THREE from "three";
import type { AuroraWorldTimerContract } from "../../../scene/contracts";

interface AuroraWorldTimerRuntimeState {
  fingerprint: string;
  timeOfDayMs: number;
}

const runtimeStateByScene = new WeakMap<THREE.Scene, AuroraWorldTimerRuntimeState>();

export function advanceAuroraWorldTimerRuntime(
  scene: THREE.Scene,
  contract: AuroraWorldTimerContract | null | undefined,
  deltaSeconds: number
): number | null {
  if (!isUsableAuroraWorldTimerContract(contract)) {
    runtimeStateByScene.delete(scene);
    delete scene.userData.auroraWorldtimerTimeOfDay;
    delete scene.userData.auroraWorldtimerSourceObjectKey;
    delete scene.userData.auroraWorldtimerFingerprint;
    delete scene.userData.auroraWorldtimerMinutesPerHour;
    delete scene.userData.auroraWorldtimerDayLengthMs;
    scene.userData.auroraWorldtimerRuntimeStatus = "unavailable-no-module-ifo-contract";
    return null;
  }

  let state = runtimeStateByScene.get(scene);
  if (!state || state.fingerprint !== contract.fingerprint) {
    state = {
      fingerprint: contract.fingerprint,
      timeOfDayMs: positiveModulo(contract.startTimeOfDayMs, contract.dayLengthMs)
    };
    runtimeStateByScene.set(scene, state);
  }

  if (Number.isFinite(deltaSeconds) && deltaSeconds > 0) {
    state.timeOfDayMs = positiveModulo(
      state.timeOfDayMs + deltaSeconds * 1_000,
      contract.dayLengthMs
    );
  }

  const nativeIntegerTick = Math.trunc(state.timeOfDayMs);
  scene.userData.auroraWorldtimerTimeOfDay = nativeIntegerTick;
  scene.userData.auroraWorldtimerRuntimeStatus =
    "source-backed-module-ifo-cworldtimer-millisecond-replay";
  scene.userData.auroraWorldtimerSourceObjectKey = contract.sourceObjectKey;
  scene.userData.auroraWorldtimerFingerprint = contract.fingerprint;
  scene.userData.auroraWorldtimerMinutesPerHour = contract.minutesPerHour;
  scene.userData.auroraWorldtimerDayLengthMs = contract.dayLengthMs;
  return nativeIntegerTick;
}

function isUsableAuroraWorldTimerContract(
  contract: AuroraWorldTimerContract | null | undefined
): contract is AuroraWorldTimerContract {
  return Boolean(
    contract &&
      contract.version === "aurora-worldtimer/v1" &&
      contract.status === "ready" &&
      contract.source === "module-ifo" &&
      contract.tickUnit === "milliseconds" &&
      contract.advanceMode === "scene-animation-delta" &&
      Number.isInteger(contract.startTimeOfDayMs) &&
      contract.startTimeOfDayMs >= 0 &&
      Number.isInteger(contract.dayLengthMs) &&
      contract.dayLengthMs > 0
  );
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
