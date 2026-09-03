export const AURORA_VFX_RENDER_PROFILE_VERSION =
  "aurora-vfx-render-profile/v1" as const;

const MAX_PROFILE_BYTES = 256 * 1024;
const MAX_EVIDENCE_ITEMS = 64;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const COLOR_PATTERN = /^#[a-f0-9]{6}$/iu;

export interface AuroraVfxComparisonViewProfile {
  projection: "orthographic" | "perspective";
  viewportWidth: number;
  viewportHeight: number;
  cameraHalfWidth: number;
  cameraHalfHeight: number;
  perspectiveFovDegrees: number;
  cameraPosition: [number, number, number];
  cameraUp: [number, number, number];
  cameraLookAt: [number, number, number];
  cameraViewOffsetPixels?: [number, number];
  receiverSize: [number, number];
  receiverPosition: [number, number, number];
  receiverRotationX: number;
  targetRadius: number;
  targetLength: number;
  targetPosition: [number, number, number];
  cameraStatus?: string;
  cameraSourceEvidence?: string[];
  cameraCalibration?: {
    status:
      | "saved-retail-origin-and-planar-receiver-fit"
      | "saved-retail-origin-and-table-fit"
      | "saved-retail-longitudinal-fit"
      | "saved-retail-source-centered-longitudinal-fit"
      | "saved-retail-source-target-span-fit";
    sourceFrame: string;
    rmsTolerancePixels: number;
    samples: Array<{
      worldPosition: [number, number, number];
      retailPixelPosition: [number, number];
    }>;
  };
}

export interface AuroraVfxPostprocessProfile {
  sharpenEnabled: boolean;
  dynamicContrastEnabled: boolean;
  dynamicContrastInputMode: "static" | "scene-area";
  dynamicContrastIntensity: number;
  dynamicContrastMidpoint: number;
  dynamicContrastMidpointSource: string;
  vibranceEnabled: boolean;
  vibrance: number;
  fogStart: number;
  fogEnd: number;
}

export interface AuroraVfxDiagnosticReferenceProfile {
  enabled: boolean;
  proofScenePolicy: "always" | "omit-when-present";
}

export interface AuroraVfxPresentationProfile {
  version: typeof AURORA_VFX_RENDER_PROFILE_VERSION;
  profileHash: string;
  sourceEvidence: string[];
  viewProfile: AuroraVfxComparisonViewProfile;
  clearColor: string;
  runtimeFrameMaterialization: "eager" | "lazy";
  postprocessProfile?: AuroraVfxPostprocessProfile;
  diagnosticReference?: AuroraVfxDiagnosticReferenceProfile;
}

const PROFILE_KEYS = new Set([
  "version",
  "profileHash",
  "sourceEvidence",
  "viewProfile",
  "clearColor",
  "runtimeFrameMaterialization",
  "postprocessProfile",
  "diagnosticReference"
]);

const VIEW_KEYS = new Set([
  "projection",
  "viewportWidth",
  "viewportHeight",
  "cameraHalfWidth",
  "cameraHalfHeight",
  "perspectiveFovDegrees",
  "cameraPosition",
  "cameraUp",
  "cameraLookAt",
  "cameraViewOffsetPixels",
  "receiverSize",
  "receiverPosition",
  "receiverRotationX",
  "targetRadius",
  "targetLength",
  "targetPosition",
  "cameraStatus",
  "cameraSourceEvidence",
  "cameraCalibration"
]);

const POSTPROCESS_KEYS = new Set([
  "sharpenEnabled",
  "dynamicContrastEnabled",
  "dynamicContrastInputMode",
  "dynamicContrastIntensity",
  "dynamicContrastMidpoint",
  "dynamicContrastMidpointSource",
  "vibranceEnabled",
  "vibrance",
  "fogStart",
  "fogEnd"
]);

export function materializeVfxPresentationProfile(
  input: unknown
): AuroraVfxPresentationProfile {
  const profile = requireRecord(input, "VFX presentation profile");
  assertKnownKeys(profile, PROFILE_KEYS, "VFX presentation profile");
  if (JSON.stringify(profile).length > MAX_PROFILE_BYTES) {
    throw new Error("VFX presentation profile exceeds the 256 KiB budget.");
  }
  if (profile.version !== AURORA_VFX_RENDER_PROFILE_VERSION) {
    throw new Error("VFX presentation profile version is unsupported.");
  }
  if (typeof profile.profileHash !== "string" || !SHA256_PATTERN.test(profile.profileHash)) {
    throw new Error("VFX presentation profile profileHash must be a lowercase SHA-256.");
  }
  const sourceEvidence = requireStringArray(
    profile.sourceEvidence,
    "VFX presentation profile sourceEvidence"
  );
  const viewProfile = parseViewProfile(profile.viewProfile);
  if (typeof profile.clearColor !== "string" || !COLOR_PATTERN.test(profile.clearColor)) {
    throw new Error("VFX presentation profile clearColor must be #RRGGBB.");
  }
  if (!isOneOf(profile.runtimeFrameMaterialization, ["eager", "lazy"] as const)) {
    throw new Error("VFX presentation profile runtimeFrameMaterialization is invalid.");
  }

  return {
    version: AURORA_VFX_RENDER_PROFILE_VERSION,
    profileHash: profile.profileHash,
    sourceEvidence,
    viewProfile,
    clearColor: profile.clearColor,
    runtimeFrameMaterialization: profile.runtimeFrameMaterialization,
    ...(profile.postprocessProfile === undefined
      ? {}
      : { postprocessProfile: parsePostprocessProfile(profile.postprocessProfile) }),
    ...(profile.diagnosticReference === undefined
      ? {}
      : { diagnosticReference: parseDiagnosticReference(profile.diagnosticReference) })
  };
}

export function shouldMaterializeVfxDiagnosticReference(
  profile: AuroraVfxDiagnosticReferenceProfile | undefined,
  proofScenePresent: boolean
): boolean {
  if (!profile?.enabled) return false;
  return !(
    profile.proofScenePolicy === "omit-when-present" && proofScenePresent
  );
}

function parseViewProfile(input: unknown): AuroraVfxComparisonViewProfile {
  const profile = requireRecord(input, "VFX viewProfile");
  assertKnownKeys(profile, VIEW_KEYS, "VFX viewProfile");
  if (!isOneOf(profile.projection, ["orthographic", "perspective"] as const)) {
    throw new Error("VFX viewProfile projection is invalid.");
  }
  const scalarFields = [
    "viewportWidth",
    "viewportHeight",
    "cameraHalfWidth",
    "cameraHalfHeight",
    "perspectiveFovDegrees",
    "receiverRotationX",
    "targetRadius",
    "targetLength"
  ] as const;
  for (const field of scalarFields) requireFinite(profile[field], `VFX viewProfile ${field}`);
  if (Number(profile.viewportWidth) <= 0 || Number(profile.viewportHeight) <= 0) {
    throw new Error("VFX viewProfile viewport dimensions must be positive.");
  }
  if (profile.projection === "perspective" && Number(profile.perspectiveFovDegrees) <= 0) {
    throw new Error("VFX perspective viewProfile FOV must be positive.");
  }
  requireTuple(profile.cameraPosition, 3, "VFX viewProfile cameraPosition");
  requireTuple(profile.cameraUp, 3, "VFX viewProfile cameraUp");
  requireTuple(profile.cameraLookAt, 3, "VFX viewProfile cameraLookAt");
  requireTuple(profile.receiverSize, 2, "VFX viewProfile receiverSize");
  requireTuple(profile.receiverPosition, 3, "VFX viewProfile receiverPosition");
  requireTuple(profile.targetPosition, 3, "VFX viewProfile targetPosition");
  if (profile.cameraViewOffsetPixels !== undefined) {
    requireTuple(profile.cameraViewOffsetPixels, 2, "VFX viewProfile cameraViewOffsetPixels");
  }
  if (profile.cameraSourceEvidence !== undefined) {
    requireStringArray(profile.cameraSourceEvidence, "VFX viewProfile cameraSourceEvidence");
  }
  if (profile.cameraCalibration !== undefined) validateCameraCalibration(profile.cameraCalibration);
  return profile as unknown as AuroraVfxComparisonViewProfile;
}

function validateCameraCalibration(input: unknown): void {
  const calibration = requireRecord(input, "VFX cameraCalibration");
  assertKnownKeys(
    calibration,
    new Set(["status", "sourceFrame", "rmsTolerancePixels", "samples"]),
    "VFX cameraCalibration"
  );
  if (
    !isOneOf(calibration.status, [
      "saved-retail-origin-and-planar-receiver-fit",
      "saved-retail-origin-and-table-fit",
      "saved-retail-longitudinal-fit",
      "saved-retail-source-centered-longitudinal-fit",
      "saved-retail-source-target-span-fit"
    ] as const)
  ) {
    throw new Error("VFX cameraCalibration status is invalid.");
  }
  requireNonEmptyString(calibration.sourceFrame, "VFX cameraCalibration sourceFrame");
  requireFinite(calibration.rmsTolerancePixels, "VFX cameraCalibration rmsTolerancePixels");
  if (!Array.isArray(calibration.samples) || calibration.samples.length > 64) {
    throw new Error("VFX cameraCalibration samples are invalid.");
  }
  for (const sampleInput of calibration.samples) {
    const sample = requireRecord(sampleInput, "VFX cameraCalibration sample");
    assertKnownKeys(
      sample,
      new Set(["worldPosition", "retailPixelPosition"]),
      "VFX cameraCalibration sample"
    );
    requireTuple(sample.worldPosition, 3, "VFX cameraCalibration worldPosition");
    requireTuple(sample.retailPixelPosition, 2, "VFX cameraCalibration retailPixelPosition");
  }
}

function parsePostprocessProfile(input: unknown): AuroraVfxPostprocessProfile {
  const profile = requireRecord(input, "VFX postprocessProfile");
  assertKnownKeys(profile, POSTPROCESS_KEYS, "VFX postprocessProfile");
  for (const field of ["sharpenEnabled", "dynamicContrastEnabled", "vibranceEnabled"] as const) {
    if (typeof profile[field] !== "boolean") {
      throw new Error(`VFX postprocessProfile ${field} must be boolean.`);
    }
  }
  if (!isOneOf(profile.dynamicContrastInputMode, ["static", "scene-area"] as const)) {
    throw new Error("VFX postprocessProfile dynamicContrastInputMode is invalid.");
  }
  for (const field of [
    "dynamicContrastIntensity",
    "dynamicContrastMidpoint",
    "vibrance",
    "fogStart",
    "fogEnd"
  ] as const) {
    requireFinite(profile[field], `VFX postprocessProfile ${field}`);
  }
  requireNonEmptyString(
    profile.dynamicContrastMidpointSource,
    "VFX postprocessProfile dynamicContrastMidpointSource"
  );
  return profile as unknown as AuroraVfxPostprocessProfile;
}

function parseDiagnosticReference(input: unknown): AuroraVfxDiagnosticReferenceProfile {
  const profile = requireRecord(input, "VFX diagnosticReference");
  assertKnownKeys(
    profile,
    new Set(["enabled", "proofScenePolicy"]),
    "VFX diagnosticReference"
  );
  if (typeof profile.enabled !== "boolean") {
    throw new Error("VFX diagnosticReference enabled must be boolean.");
  }
  if (!isOneOf(profile.proofScenePolicy, ["always", "omit-when-present"] as const)) {
    throw new Error("VFX diagnosticReference proofScenePolicy is invalid.");
  }
  return profile as unknown as AuroraVfxDiagnosticReferenceProfile;
}

function requireRecord(input: unknown, label: string): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(`${label} must be an object.`);
  }
  return input as Record<string, unknown>;
}

function assertKnownKeys(
  input: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  label: string
): void {
  const unknown = Object.keys(input).find((key) => !allowed.has(key));
  if (unknown) throw new Error(`${label} contains unknown field '${unknown}'.`);
}

function requireFinite(input: unknown, label: string): asserts input is number {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    throw new Error(`${label} must be finite.`);
  }
}

function requireTuple(input: unknown, length: number, label: string): void {
  if (
    !Array.isArray(input) ||
    input.length !== length ||
    input.some((entry) => typeof entry !== "number" || !Number.isFinite(entry))
  ) {
    throw new Error(`${label} must be a finite ${length}-tuple.`);
  }
}

function requireStringArray(input: unknown, label: string): string[] {
  if (
    !Array.isArray(input) ||
    input.length === 0 ||
    input.length > MAX_EVIDENCE_ITEMS ||
    input.some((entry) => typeof entry !== "string" || !entry.trim() || entry.length > 4096)
  ) {
    throw new Error(`${label} must contain 1-${MAX_EVIDENCE_ITEMS} bounded strings.`);
  }
  return [...input];
}

function requireNonEmptyString(input: unknown, label: string): asserts input is string {
  if (typeof input !== "string" || !input.trim() || input.length > 4096) {
    throw new Error(`${label} must be a non-empty bounded string.`);
  }
}

function isOneOf<const T extends readonly unknown[]>(
  value: unknown,
  allowed: T
): value is T[number] {
  return allowed.includes(value);
}
