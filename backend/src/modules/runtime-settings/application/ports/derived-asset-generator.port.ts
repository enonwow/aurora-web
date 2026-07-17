import type { PackedModuleFile } from "./packed-module-extractor.port";

export const DERIVED_ASSET_GENERATOR = Symbol("DERIVED_ASSET_GENERATOR");

export interface DerivedAssetGeneratorInput {
  settingsRevision: number;
  modulePrefix: string;
  sourceFiles: PackedModuleFile[];
}

export interface DerivedAssetGeneratorSummary {
  generator: string;
  generatedFiles: number;
  generatedBytes: number;
  candidateModels?: number;
  convertedModels?: number;
  failedModels?: number;
  failureReasons?: string[];
  skippedModels?: number;
  skippedReason?: string;
}

export interface DerivedAssetGeneratorResult {
  files: PackedModuleFile[];
  summary: DerivedAssetGeneratorSummary;
}

export interface DerivedAssetGeneratorPort {
  generateDerivedAssets(input: DerivedAssetGeneratorInput): Promise<DerivedAssetGeneratorResult>;
}
