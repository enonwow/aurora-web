export type TelemetryDebugMode = "off" | "basic" | "full";

export interface RuntimeHostPathSettings {
  nwnUserDir: string;
  nwnInstallDir: string;
  auroraReferenceDir: string;
  hakDirectories: string[];
  itemGeneratorSourceDirectories: string[];
  moduleDecompiledPath: string;
  modulePackedPath: string;
  tlkCustomPath?: string;
}

export interface RuntimePathSettings {
  /**
   * Environment roots selected during the runtime-path onboarding flow.
   * The legacy explicit paths below remain the effective paths used by the
   * resource readers, which keeps existing settings files and fallbacks valid.
   */
  hostPaths?: RuntimeHostPathSettings;
  nwnUserDir?: string;
  nwnInstallDir?: string;
  auroraReferenceDir?: string;
  hakDirectories?: string[];
  itemGeneratorSourceDirectories?: string[];
  vanillaDataPath: string;
  hakDirectoryPath: string;
  moduleDecompiledPath: string;
  modulePackedPath: string;
  tlkBasePath: string;
  tlkCustomPath: string;
}

export interface BlobStorageSettings {
  endpoint: string;
  region: string;
  bucket: string;
  modulePrefix: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

export interface RuntimeSourceSettings {
  includeModuleTemp0: boolean;
  includeModulePacked: boolean;
  includeHaks: boolean;
  includeVanilla: boolean;
  hakProfileId: string;
  hakPriorityList: string[];
}

export interface RuntimeSourcesByAsset {
  placeable: RuntimeSourceSettings;
  tile: RuntimeSourceSettings;
  area: RuntimeSourceSettings;
  sound: RuntimeSourceSettings;
  vfx: RuntimeSourceSettings;
  creature?: RuntimeSourceSettings;
  item?: RuntimeSourceSettings;
}

export type RuntimeAssetKind = keyof RuntimeSourcesByAsset;
export type HakProfilesMap = Record<string, string[]>;

export interface BenchmarkCandidateMetrics {
  triangles: number;
  meshes: number;
  emitters: number;
  maxSingleMeshTriangles?: number;
}

export interface BenchmarkCandidateContext {
  source: string;
  areaResref?: string;
  doorIndex?: number;
  note?: string;
}

export interface BenchmarkCandidate {
  resref: string;
  metrics: BenchmarkCandidateMetrics;
  context: BenchmarkCandidateContext;
}

export interface BenchmarkCandidatesSettings {
  placeableHeavyNoVfx: BenchmarkCandidate;
  placeableHeavyVfx: BenchmarkCandidate;
  placeableVfxPlcAlternative: BenchmarkCandidate;
  doorHeavyInstance: BenchmarkCandidate;
  doorHeavySingleMesh: BenchmarkCandidate;
}

export interface RuntimeSettingsPayload {
  paths: RuntimePathSettings;
  blobStorage: BlobStorageSettings;
  telemetryDebugMode: TelemetryDebugMode;
  hakProfiles: HakProfilesMap;
  sources: RuntimeSourcesByAsset;
  benchmarkCandidates: BenchmarkCandidatesSettings;
}

export interface RuntimeSettingsRecord extends RuntimeSettingsPayload {
  revision: number;
  updatedAt: string;
  updatedBy: string;
}
