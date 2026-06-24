import { NestFactory } from "@nestjs/core";
import { basename, extname, resolve } from "node:path";
import { AppModule } from "../src/app.module";
import {
  MODULE_BLOB_STORAGE,
  type ModuleBlobStoragePort
} from "../src/modules/runtime-settings/application/ports/module-blob-storage.port";
import {
  PACKED_MODULE_EXTRACTOR,
  type PackedModuleExtractorPort
} from "../src/modules/runtime-settings/application/ports/packed-module-extractor.port";
import { RuntimeSettingsApplicationService } from "../src/modules/runtime-settings/application/runtime-settings.application.service";
import {
  NWN_KEY_BIF_RESOURCE_TYPES,
  NwnKeyBifResourceReader
} from "../src/modules/runtime-settings/application/nwn-key-bif-resource-reader";

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["log", "warn", "error"]
  });

  try {
    const runtimeSettings = app.get(RuntimeSettingsApplicationService);
    const blobStorage = app.get<ModuleBlobStoragePort>(MODULE_BLOB_STORAGE);
    const packedExtractor = app.get<PackedModuleExtractorPort>(PACKED_MODULE_EXTRACTOR);
    if (!blobStorage.putModuleObject) {
      throw new Error("Module blob storage does not support targeted putModuleObject.");
    }

    const settings = await runtimeSettings.getRuntimeSettings();
    const resolved = await runtimeSettings.getResolvedHakSettings();
    const restored: Array<{ key: string; size: number }> = [];

    if (settings.sources.placeable.includeVanilla) {
      const vanillaRoot = settings.paths.vanillaDataPath.trim();
      const keyPath = await resolveVanillaKeyFile(vanillaRoot);
      if (keyPath) {
        const reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
        const bytes = await reader.read("placeables", NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
        if (bytes) {
          const result = await blobStorage.putModuleObject(settings.blobStorage, {
            fileName: "__aurora/sources/vanilla/placeables.2da",
            resourceType: NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
            bytes
          });
          restored.push({ key: result.key, size: result.size });
        }
      }
    }

    for (const hakPath of resolved.placeable.hakPaths) {
      const extracted = await packedExtractor.extractFromPackedModule(hakPath);
      const placeables2da = extracted.find(
        (entry) => basename(entry.fileName).trim().toLowerCase() === "placeables.2da"
      );
      if (!placeables2da) {
        continue;
      }

      const hakName = sanitizeSegment(basename(hakPath, extname(hakPath)));
      const result = await blobStorage.putModuleObject(settings.blobStorage, {
        fileName: `__aurora/sources/hak/${hakName}/placeables.2da`,
        resourceType: placeables2da.resourceType,
        bytes: Buffer.from(placeables2da.bytes)
      });
      restored.push({ key: result.key, size: result.size });
    }

    console.log(
      JSON.stringify(
        {
          restoredCount: restored.length,
          restored
        },
        null,
        2
      )
    );
  } finally {
    await app.close();
  }
}

async function resolveVanillaKeyFile(vanillaRoot: string): Promise<string | null> {
  for (const name of ["nwn_base.key", "nwn_retail.key"]) {
    const candidate = resolve(vanillaRoot, name);
    try {
      await import("node:fs/promises").then((fs) => fs.stat(candidate));
      return candidate;
    } catch {
      // Try the next known vanilla KEY name.
    }
  }
  return null;
}

function sanitizeSegment(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9._-]/gu, "_");
  return normalized || "source";
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
