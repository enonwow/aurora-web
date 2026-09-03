export interface AuroraProgFxType10ProjectileVector3 {
  x: number;
  y: number;
  z: number;
}

export interface AuroraProgFxType10ProjectileRuntimeContext {
  sourceRef?: string;
  sourcePosition: AuroraProgFxType10ProjectileVector3;
  targetRef?: string;
  targetPosition: AuroraProgFxType10ProjectileVector3;
  provenance: "retail-client-disassembly" | "test-fixture";
}

export interface AuroraProgFxType10ProjectileTrajectory {
  version: "aurora-progfx-type10-projectile-trajectory/v2";
  proofStatus: "retail-client-disassembly-backed-type10-path4-log-distance";
  modelRef?: string;
  projectileRow?: number;
  orientationMode?: number;
  pathStyle: 4;
  timingProfile: "log";
  sourceRef?: string;
  sourcePosition: AuroraProgFxType10ProjectileVector3;
  targetRef?: string;
  targetPosition: AuroraProgFxType10ProjectileVector3;
  speedMetersPerSecond: number;
  distanceMeters: number;
  durationMilliseconds: number;
  durationSeconds: number;
  provenance: AuroraProgFxType10ProjectileRuntimeContext["provenance"];
  source:
    "nwmain.exe 0x14096a9a0 Type10 handler; 0x140c946b0 logf; 0x1409873c0 duration setter; 0x140987770 path selector; 0x1409845c0 path4 update";
}

export interface AuroraProgFxType10ProjectileSourceContract {
  modelRef?: string;
  projectileRow?: number;
  orientationMode?: number;
  pathStyle?: number;
  timingProfile?: string;
}

export type AuroraProgFxType10ProjectileTrajectoryBlockerCode =
  | "VFX_PROGFX_TYPE10_RUNTIME_CONTEXT_REQUIRED"
  | "VFX_PROGFX_TYPE10_PATH_STYLE_UNSUPPORTED"
  | "VFX_PROGFX_TYPE10_TIMING_PROFILE_UNSUPPORTED"
  | "VFX_PROGFX_TYPE10_ORIENTATION_MODE_UNPROVEN"
  | "VFX_PROGFX_TYPE10_POSITION_NON_FINITE"
  | "VFX_PROGFX_TYPE10_DISTANCE_TIMING_UNPROVEN";

export type AuroraProgFxType10ProjectileTrajectoryResolution =
  | {
      version: "aurora-progfx-type10-projectile-trajectory-resolution/v1";
      status: "ready";
      trajectory: AuroraProgFxType10ProjectileTrajectory;
    }
  | {
      version: "aurora-progfx-type10-projectile-trajectory-resolution/v1";
      status: "blocked";
      code: AuroraProgFxType10ProjectileTrajectoryBlockerCode;
      message: string;
    };

export interface AuroraProgFxType10ProjectileOwnerTransform {
  source: "progfx-type10-projectile-path4";
  proofStatus: AuroraProgFxType10ProjectileTrajectory["proofStatus"];
  position: [number, number, number];
  progress: number;
  active: boolean;
  durationSeconds: number;
  pathStyle: 4;
  timingProfile: "log";
}

export function buildAuroraProgFxType10ProjectileTrajectory(
  source: AuroraProgFxType10ProjectileSourceContract,
  context: AuroraProgFxType10ProjectileRuntimeContext | undefined
): AuroraProgFxType10ProjectileTrajectory | undefined {
  const resolution = resolveAuroraProgFxType10ProjectileTrajectory(source, context);
  return resolution.status === "ready" ? resolution.trajectory : undefined;
}

export function resolveAuroraProgFxType10ProjectileTrajectory(
  source: AuroraProgFxType10ProjectileSourceContract,
  context: AuroraProgFxType10ProjectileRuntimeContext | undefined
): AuroraProgFxType10ProjectileTrajectoryResolution {
  if (!context) {
    return blockedTrajectory(
      "VFX_PROGFX_TYPE10_RUNTIME_CONTEXT_REQUIRED",
      "ProgFX Type10 requires source and target runtime context; the projectile owner remains diagnostic-only."
    );
  }
  if (source.pathStyle !== 4) {
    return blockedTrajectory(
      "VFX_PROGFX_TYPE10_PATH_STYLE_UNSUPPORTED",
      `ProgFX Type10 path style ${formatDiagnosticValue(source.pathStyle)} is not source-backed by the current path-4 runtime.`
    );
  }
  if (source.timingProfile?.trim().toLowerCase() !== "log") {
    return blockedTrajectory(
      "VFX_PROGFX_TYPE10_TIMING_PROFILE_UNSUPPORTED",
      `ProgFX Type10 timing profile ${formatDiagnosticValue(source.timingProfile)} is not source-backed by the current log-distance runtime.`
    );
  }
  const orientationMode = source.orientationMode ?? 0;
  if (orientationMode !== 0) {
    return blockedTrajectory(
      "VFX_PROGFX_TYPE10_ORIENTATION_MODE_UNPROVEN",
      `ProgFX Type10 orientation mode ${formatDiagnosticValue(orientationMode)} requires an unimplemented retail direction-to-orientation contract.`
    );
  }
  if (!isFiniteVector(context.sourcePosition) || !isFiniteVector(context.targetPosition)) {
    return blockedTrajectory(
      "VFX_PROGFX_TYPE10_POSITION_NON_FINITE",
      "ProgFX Type10 source and target positions must contain only finite coordinates."
    );
  }
  const distanceMeters = vectorDistanceFloat32(
    context.sourcePosition,
    context.targetPosition
  );
  const speedMetersPerSecond = resolveLogDistanceSpeedFloat32(distanceMeters);
  if (!(distanceMeters > 0) || !Number.isFinite(distanceMeters)) {
    return blockedTrajectory(
      "VFX_PROGFX_TYPE10_DISTANCE_TIMING_UNPROVEN",
      "ProgFX Type10 distance must be positive and finite before log timing."
    );
  }
  if (!(speedMetersPerSecond > 0)) {
    return blockedTrajectory(
      "VFX_PROGFX_TYPE10_DISTANCE_TIMING_UNPROVEN",
      "ProgFX Type10 log-distance speed is non-positive in an unproven short-distance timing region."
    );
  }
  const durationMilliseconds = resolveDurationMillisecondsFloat32(
    distanceMeters,
    speedMetersPerSecond
  );
  const durationSeconds = durationMilliseconds / 1000;
  return {
    version: "aurora-progfx-type10-projectile-trajectory-resolution/v1",
    status: "ready",
    trajectory: {
      version: "aurora-progfx-type10-projectile-trajectory/v2",
      proofStatus: "retail-client-disassembly-backed-type10-path4-log-distance",
      ...(source.modelRef ? { modelRef: source.modelRef } : {}),
      ...(source.projectileRow !== undefined ? { projectileRow: source.projectileRow } : {}),
      orientationMode,
      pathStyle: 4,
      timingProfile: "log",
      ...(context.sourceRef ? { sourceRef: context.sourceRef } : {}),
      sourcePosition: { ...context.sourcePosition },
      ...(context.targetRef ? { targetRef: context.targetRef } : {}),
      targetPosition: { ...context.targetPosition },
      speedMetersPerSecond,
      distanceMeters,
      durationMilliseconds,
      durationSeconds,
      provenance: context.provenance,
      source:
        "nwmain.exe 0x14096a9a0 Type10 handler; 0x140c946b0 logf; 0x1409873c0 duration setter; 0x140987770 path selector; 0x1409845c0 path4 update"
    }
  };
}

export function resolveAuroraProgFxType10ProjectileOwnerTransform(
  trajectory: AuroraProgFxType10ProjectileTrajectory | undefined,
  timeSeconds: number
): AuroraProgFxType10ProjectileOwnerTransform | undefined {
  if (!trajectory) {
    return undefined;
  }
  const progress =
    trajectory.durationSeconds > 0
      ? clampFinite(timeSeconds / trajectory.durationSeconds, 0, 1)
      : 1;
  const active =
    trajectory.durationSeconds > 0 &&
    Math.max(0, timeSeconds) <= trajectory.durationSeconds + Number.EPSILON;
  return {
    source: "progfx-type10-projectile-path4",
    proofStatus: trajectory.proofStatus,
    position: [
      lerp(trajectory.sourcePosition.x, trajectory.targetPosition.x, progress),
      lerp(trajectory.sourcePosition.y, trajectory.targetPosition.y, progress),
      lerp(trajectory.sourcePosition.z, trajectory.targetPosition.z, progress)
    ],
    progress,
    active,
    durationSeconds: trajectory.durationSeconds,
    pathStyle: 4,
    timingProfile: "log"
  };
}

function vectorDistanceFloat32(
  left: AuroraProgFxType10ProjectileVector3,
  right: AuroraProgFxType10ProjectileVector3
): number {
  const x = Math.fround(right.x - left.x);
  const y = Math.fround(right.y - left.y);
  const z = Math.fround(right.z - left.z);
  const xySquared = Math.fround(
    Math.fround(x * x) + Math.fround(y * y)
  );
  const lengthSquared = Math.fround(xySquared + Math.fround(z * z));
  return Math.fround(Math.sqrt(lengthSquared));
}

function blockedTrajectory(
  code: AuroraProgFxType10ProjectileTrajectoryBlockerCode,
  message: string
): AuroraProgFxType10ProjectileTrajectoryResolution {
  return {
    version: "aurora-progfx-type10-projectile-trajectory-resolution/v1",
    status: "blocked",
    code,
    message
  };
}

function isFiniteVector(value: AuroraProgFxType10ProjectileVector3): boolean {
  return Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z);
}

function formatDiagnosticValue(value: unknown): string {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  return value === undefined ? "<missing>" : String(value);
}

function resolveLogDistanceSpeedFloat32(distanceMeters: number): number {
  if (!(distanceMeters > 0) || !Number.isFinite(distanceMeters)) {
    return 0;
  }
  const logarithm = Math.fround(Math.log(distanceMeters));
  return Math.fround(Math.fround(logarithm * 3) + 1.5);
}

function resolveDurationMillisecondsFloat32(
  distanceMeters: number,
  speedMetersPerSecond: number
): number {
  if (!(speedMetersPerSecond > 0) || !Number.isFinite(speedMetersPerSecond)) {
    return 0;
  }
  const seconds = Math.fround(distanceMeters / speedMetersPerSecond);
  return Math.trunc(Math.fround(seconds * 1000));
}

function clampFinite(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) {
    return minimum;
  }
  return Math.min(maximum, Math.max(minimum, value));
}

function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}
