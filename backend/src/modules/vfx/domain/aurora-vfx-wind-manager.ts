import type {
  AuroraParticleWindContext,
  AuroraRuntimeVector3
} from "./aurora-vfx-runtime-state";

const AURORA_WIND_GRID_SIZE = 16;
const AURORA_WIND_GRID_CELL_COUNT = AURORA_WIND_GRID_SIZE * AURORA_WIND_GRID_SIZE;

export interface AuroraWindPointSourceInput {
  position: AuroraRuntimeVector3;
  radius: number;
  durationSeconds: number;
  timeRemainingSeconds?: number;
  intensity: number;
  sourceEmitterNodeName?: string;
}

export interface AuroraWindManagerInput {
  profileId: string;
  globalWindVector: AuroraRuntimeVector3;
  variationYawRadians?: number;
  variationPitchRadians?: number;
  noisePeriodSeconds?: number;
  noiseElapsedSeconds?: number;
  noiseGridPrevious16x16?: number[];
  noiseGridCurrent16x16?: number[];
  noiseSeed?: number;
  pointSources?: AuroraWindPointSourceInput[];
}

export interface AuroraWindPointSourceState extends AuroraWindPointSourceInput {
  timeRemainingSeconds: number;
}

export interface AuroraWindSample {
  emitterNodeName: string;
  particleId: number;
  position: AuroraRuntimeVector3;
  deltaSeconds: number;
  gridScalar: number;
  globalContribution: AuroraRuntimeVector3;
  pointSourceContribution: AuroraRuntimeVector3;
  finalWindDelta: AuroraRuntimeVector3;
}

export interface AuroraWindManagerState {
  version: "aurora-vfx-wind-manager-state/v1";
  profileId: string;
  globalWindVector: AuroraRuntimeVector3;
  variationYawRadians: number;
  variationPitchRadians: number;
  noisePeriodSeconds: number;
  noiseElapsedSeconds: number;
  noiseInterpolationAlpha: number;
  noiseGridPrevious16x16: number[];
  noiseGridCurrent16x16: number[];
  noiseSeed: number;
  pointSources: AuroraWindPointSourceState[];
  samples: AuroraWindSample[];
}

export function createAuroraWindManagerState(
  input: AuroraWindManagerInput
): AuroraWindManagerState {
  let noiseSeed = normalizeSeed(input.noiseSeed);
  const previousInput = normalizeNoiseGrid(input.noiseGridPrevious16x16);
  const currentInput = normalizeNoiseGrid(input.noiseGridCurrent16x16);
  const previousGenerated = previousInput ? undefined : generateAuroraWindNoiseGrid(noiseSeed);
  noiseSeed = previousGenerated?.nextSeed ?? noiseSeed;
  const currentGenerated = currentInput ? undefined : generateAuroraWindNoiseGrid(noiseSeed);
  noiseSeed = currentGenerated?.nextSeed ?? noiseSeed;
  const noisePeriodSeconds = finitePositive(input.noisePeriodSeconds, 130);
  const noiseElapsedSeconds = clamp(
    finiteNonNegative(input.noiseElapsedSeconds, 0),
    0,
    noisePeriodSeconds
  );
  return {
    version: "aurora-vfx-wind-manager-state/v1",
    profileId: input.profileId,
    globalWindVector: finiteVector(input.globalWindVector),
    variationYawRadians: finiteNumber(input.variationYawRadians, 0),
    variationPitchRadians: finiteNumber(input.variationPitchRadians, 0),
    noisePeriodSeconds,
    noiseElapsedSeconds,
    noiseInterpolationAlpha: noiseElapsedSeconds / noisePeriodSeconds,
    noiseGridPrevious16x16: previousInput ?? previousGenerated!.grid,
    noiseGridCurrent16x16: currentInput ?? currentGenerated!.grid,
    noiseSeed,
    pointSources: (input.pointSources ?? [])
      .filter((source) => source.radius > 0 && Number.isFinite(source.radius))
      .map((source) => ({
        ...source,
        position: finiteVector(source.position),
        durationSeconds: finiteNonNegative(source.durationSeconds, 0),
        timeRemainingSeconds: finiteNonNegative(
          source.timeRemainingSeconds,
          finiteNonNegative(source.durationSeconds, 0)
        ),
        intensity: finiteNumber(source.intensity, 0)
      })),
    samples: []
  };
}

export function tickAuroraWindManager(
  state: AuroraWindManagerState,
  deltaSeconds: number
): AuroraWindManagerState {
  const delta = finiteNonNegative(deltaSeconds, 0);
  let noiseElapsedSeconds = state.noiseElapsedSeconds + delta;
  let previous = state.noiseGridPrevious16x16;
  let current = state.noiseGridCurrent16x16;
  let seed = state.noiseSeed;
  if (noiseElapsedSeconds > state.noisePeriodSeconds) {
    previous = current;
    const generated = generateAuroraWindNoiseGrid(seed);
    current = generated.grid;
    seed = generated.nextSeed;
    noiseElapsedSeconds = 0;
  }
  return {
    ...state,
    noiseElapsedSeconds,
    noiseInterpolationAlpha: noiseElapsedSeconds / state.noisePeriodSeconds,
    noiseGridPrevious16x16: previous,
    noiseGridCurrent16x16: current,
    noiseSeed: seed,
    pointSources: state.pointSources
      .map((source) => ({
        ...source,
        timeRemainingSeconds: source.timeRemainingSeconds - delta
      }))
      .filter((source) => source.timeRemainingSeconds >= 0),
    samples: []
  };
}

export function cloneAuroraWindManagerState(
  state: AuroraWindManagerState
): AuroraWindManagerState {
  return {
    ...state,
    globalWindVector: { ...state.globalWindVector },
    noiseGridPrevious16x16: [...state.noiseGridPrevious16x16],
    noiseGridCurrent16x16: [...state.noiseGridCurrent16x16],
    pointSources: state.pointSources.map((source) => ({
      ...source,
      position: { ...source.position }
    })),
    samples: []
  };
}

export function createAuroraWindContext(
  state: AuroraWindManagerState
): AuroraParticleWindContext {
  return {
    source: "aurora-wind-manager",
    resolveDisplacement(input) {
      const sample = sampleAuroraWind(state, input);
      state.samples.push(sample);
      return sample.finalWindDelta;
    },
    registerPointSource(input) {
      state.pointSources.push({
        position: finiteVector(input.position),
        radius: Math.abs(finiteNumber(input.radius, 0)),
        durationSeconds: finiteNonNegative(input.durationSeconds, 0),
        timeRemainingSeconds: finiteNonNegative(input.durationSeconds, 0),
        intensity: finiteNumber(input.intensity, 0),
        sourceEmitterNodeName: input.sourceEmitterNodeName
      });
    }
  };
}

export function sampleAuroraWind(
  state: AuroraWindManagerState,
  input: {
    emitterNodeName: string;
    particleId: number;
    position: AuroraRuntimeVector3;
    deltaSeconds: number;
  }
): AuroraWindSample {
  const xIndex = windGridIndex(input.position.x);
  const yIndex = windGridIndex(input.position.y);
  const gridScalar = sampleNoiseCell(state, xIndex, yIndex);
  const globalContribution = scaleVector(
    state.globalWindVector,
    gridScalar * finiteNonNegative(input.deltaSeconds, 0)
  );
  const pointSourceContribution = samplePointSources(state.pointSources, input.position);
  const yawNoise = sampleNoiseCell(state, (xIndex + 8) % 16, (yIndex + 8) % 16);
  const pitchNoise = sampleNoiseCell(state, yIndex, xIndex);
  const yaw =
    (1 - gridScalar) * state.variationYawRadians * (yawNoise * 2 - 1);
  const pitch = state.variationPitchRadians * (pitchNoise * 2 - 1);
  const combined = addVector(globalContribution, pointSourceContribution);
  const finalWindDelta = rotateAroundZ(rotateAroundX(combined, pitch), yaw);
  return {
    emitterNodeName: input.emitterNodeName,
    particleId: input.particleId,
    position: { ...input.position },
    deltaSeconds: input.deltaSeconds,
    gridScalar,
    globalContribution,
    pointSourceContribution,
    finalWindDelta
  };
}

function samplePointSources(
  sources: AuroraWindPointSourceState[],
  position: AuroraRuntimeVector3
): AuroraRuntimeVector3 {
  return sources.reduce<AuroraRuntimeVector3>((total, source) => {
    const offset = subtractVector(position, source.position);
    const distance = Math.hypot(offset.x, offset.y, offset.z);
    if (!(distance < source.radius) || !(distance > 1e-12)) return total;
    const magnitude = ((source.radius - distance) * source.intensity) / source.radius;
    return addVector(total, scaleVector(offset, magnitude / distance));
  }, { x: 0, y: 0, z: 0 });
}

function sampleNoiseCell(state: AuroraWindManagerState, x: number, y: number): number {
  const index = x * AURORA_WIND_GRID_SIZE + y;
  return (
    state.noiseGridCurrent16x16[index]! * state.noiseInterpolationAlpha +
    state.noiseGridPrevious16x16[index]! * (1 - state.noiseInterpolationAlpha)
  );
}

function windGridIndex(value: number): number {
  const rounded = roundToNearestEven(Number.isFinite(value) ? value : 0) * 4;
  return ((rounded % AURORA_WIND_GRID_SIZE) + AURORA_WIND_GRID_SIZE) % AURORA_WIND_GRID_SIZE;
}

function roundToNearestEven(value: number): number {
  const lower = Math.floor(value);
  const fraction = value - lower;
  if (fraction < 0.5) return lower;
  if (fraction > 0.5) return lower + 1;
  return lower % 2 === 0 ? lower : lower + 1;
}

function generateAuroraWindNoiseGrid(seed: number): { grid: number[]; nextSeed: number } {
  const grid = Array<number>(AURORA_WIND_GRID_CELL_COUNT).fill(0);
  let nextSeed = seed;
  for (let blockSize = 16; blockSize > 0; blockSize = Math.floor(blockSize / 2)) {
    const modulus = 500 / (16 / blockSize);
    for (let rowStart = 0; rowStart < 16; rowStart += blockSize) {
      for (let columnStart = 0; columnStart < 16; columnStart += blockSize) {
        const sampled = nextNwnEeRand15(nextSeed);
        nextSeed = sampled.seed;
        const addition = (sampled.value % modulus) / 1000;
        for (let row = rowStart; row < rowStart + blockSize; row += 1) {
          for (let column = columnStart; column < columnStart + blockSize; column += 1) {
            grid[row * 16 + column] += addition;
          }
        }
      }
    }
  }
  return { grid, nextSeed };
}

function nextNwnEeRand15(seed: number): { value: number; seed: number } {
  const next = (Math.imul(seed >>> 0, 0x343fd) + 0x269ec3) >>> 0;
  return { value: (next >>> 16) & 0x7fff, seed: next };
}

function normalizeNoiseGrid(input: number[] | undefined): number[] | undefined {
  if (!input || input.length !== AURORA_WIND_GRID_CELL_COUNT || !input.every(Number.isFinite)) {
    return undefined;
  }
  return [...input];
}

function normalizeSeed(value: number | undefined): number {
  return Number.isFinite(value) ? Math.trunc(value!) >>> 0 : 0x12345678;
}

function finiteVector(value: AuroraRuntimeVector3): AuroraRuntimeVector3 {
  return {
    x: finiteNumber(value?.x, 0),
    y: finiteNumber(value?.y, 0),
    z: finiteNumber(value?.z, 0)
  };
}

function finiteNumber(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function finiteNonNegative(value: number | undefined, fallback: number): number {
  const normalized = finiteNumber(value, fallback);
  return normalized >= 0 ? normalized : fallback;
}

function finitePositive(value: number | undefined, fallback: number): number {
  const normalized = finiteNumber(value, fallback);
  return normalized > 0 ? normalized : fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function addVector(a: AuroraRuntimeVector3, b: AuroraRuntimeVector3): AuroraRuntimeVector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function subtractVector(a: AuroraRuntimeVector3, b: AuroraRuntimeVector3): AuroraRuntimeVector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scaleVector(value: AuroraRuntimeVector3, scale: number): AuroraRuntimeVector3 {
  return { x: value.x * scale, y: value.y * scale, z: value.z * scale };
}

function rotateAroundX(value: AuroraRuntimeVector3, angle: number): AuroraRuntimeVector3 {
  if (angle === 0) return value;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: value.x,
    y: value.y * cosine - value.z * sine,
    z: value.y * sine + value.z * cosine
  };
}

function rotateAroundZ(value: AuroraRuntimeVector3, angle: number): AuroraRuntimeVector3 {
  if (angle === 0) return value;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: value.x * cosine - value.y * sine,
    y: value.x * sine + value.y * cosine,
    z: value.z
  };
}
