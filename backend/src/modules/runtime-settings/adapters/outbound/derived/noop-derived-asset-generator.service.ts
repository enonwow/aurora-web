import { Injectable } from "@nestjs/common";
import type {
  DerivedAssetGeneratorInput,
  DerivedAssetGeneratorPort,
  DerivedAssetGeneratorResult
} from "../../../application/ports/derived-asset-generator.port";

@Injectable()
export class NoopDerivedAssetGeneratorService implements DerivedAssetGeneratorPort {
  async generateDerivedAssets(
    _input: DerivedAssetGeneratorInput
  ): Promise<DerivedAssetGeneratorResult> {
    return {
      files: [],
      summary: {
        generator: "noop",
        generatedFiles: 0,
        generatedBytes: 0,
        skippedReason: "converter_not_configured"
      }
    };
  }
}
