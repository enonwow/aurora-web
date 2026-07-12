import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import {
  NWN_KEY_BIF_RESOURCE_TYPES,
  NwnKeyBifResourceReader
} from "../src/modules/runtime-settings/application/nwn-key-bif-resource-reader";
import {
  parseAuroraProgFxTwoDa,
  parseAuroraVisualEffectsTwoDa,
  summarizeAuroraProgFxType4VisualEffectOwners,
  summarizeAuroraProgFxType4Rows
} from "../src/modules/vfx/domain/aurora-vfx-source.parser";

const NWN_ROOT =
  process.argv[2] ?? "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights";
const KEY_FILES = ["nwn_base.key", "nwn_retail.key"] as const;

async function existsAsFile(pathValue: string): Promise<boolean> {
  try {
    const stats = await stat(pathValue);
    return stats.isFile();
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const readers: Array<{ keyPath: string; reader: NwnKeyBifResourceReader }> = [];
  for (const keyFile of KEY_FILES) {
    const keyPath = resolve(NWN_ROOT, "data", keyFile);
    if (await existsAsFile(keyPath)) {
      readers.push({
        keyPath,
        reader: await NwnKeyBifResourceReader.open(keyPath, NWN_ROOT)
      });
    }
  }

  let foundProgFx:
    | {
        keyPath: string;
        bytes: Buffer;
      }
    | null = null;
  for (const entry of readers) {
    const bytes = await entry.reader.read("progfx", NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
    if (bytes) {
      foundProgFx = {
        keyPath: entry.keyPath,
        bytes
      };
      break;
    }
  }

  let foundVisualEffects:
    | {
        keyPath: string;
        bytes: Buffer;
      }
    | null = null;
  for (const entry of readers) {
    const bytes = await entry.reader.read("visualeffects", NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
    if (bytes) {
      foundVisualEffects = {
        keyPath: entry.keyPath,
        bytes
      };
      break;
    }
  }

  if (!foundProgFx) {
    console.log(
      JSON.stringify(
        {
          status: "missing-progfx-2da",
          nwnRoot: NWN_ROOT,
          searchedKeys: readers.map((entry) => entry.keyPath)
        },
        null,
        2
      )
    );
    return;
  }

  const parsedProgFx = parseAuroraProgFxTwoDa(foundProgFx.bytes, {
    profile: "retail-key-bif",
    sourceLayer: "vanilla",
    sourceObjectKey: `${foundProgFx.keyPath.replace(/\\/gu, "/")}::progfx.2da`
  });
  const summary = summarizeAuroraProgFxType4Rows(parsedProgFx.rows);
  const visualEffectsOwnerSummary = foundVisualEffects
    ? summarizeAuroraProgFxType4VisualEffectOwners(
        parseAuroraVisualEffectsTwoDa(foundVisualEffects.bytes, {
          profile: "retail-key-bif",
          sourceLayer: "vanilla",
          sourceObjectKey: `${foundVisualEffects.keyPath.replace(/\\/gu, "/")}::visualeffects.2da`
        }).rows,
        parsedProgFx.rows
      )
    : null;

  console.log(
    JSON.stringify(
      {
        status: "found",
        source: foundProgFx.keyPath.replace(/\\/gu, "/"),
        visualEffectsSource: foundVisualEffects?.keyPath.replace(/\\/gu, "/") ?? null,
        byteLength: foundProgFx.bytes.length,
        visualEffectsByteLength: foundVisualEffects?.bytes.length ?? null,
        diagnostics: parsedProgFx.diagnostics,
        summary,
        visualEffectsOwnerSummary
      },
      null,
      2
    )
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
