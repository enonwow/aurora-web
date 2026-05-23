export const PACKED_MODULE_EXTRACTOR = Symbol("PACKED_MODULE_EXTRACTOR");

export interface PackedModuleFile {
  fileName: string;
  resourceType: number;
  bytes: Buffer;
}

export interface PackedModuleExtractorPort {
  extractFromPackedModule(modulePackedPath: string): Promise<PackedModuleFile[]>;
}
