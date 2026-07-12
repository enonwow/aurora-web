import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import {
  NWN_KEY_BIF_RESOURCE_TYPES,
  NwnKeyBifResourceReader
} from "../src/modules/runtime-settings/application/nwn-key-bif-resource-reader";
import { summarizeAuroraTgaTexture } from "../src/modules/runtime-settings/domain/aurora-tga-texture-summary";

const NWN_ROOT =
  process.argv[2] ?? "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights";
const KEY_FILES = ["nwn_base.key", "nwn_retail.key"] as const;
const SHADOW_TEXTURE_RESREF = "fxpa_dot01";

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

  let found:
    | {
        keyPath: string;
        tgaBytes: Buffer;
        txiBytes: Buffer | null;
      }
    | null = null;
  for (const entry of readers) {
    const tgaBytes = await entry.reader.read(
      SHADOW_TEXTURE_RESREF,
      NWN_KEY_BIF_RESOURCE_TYPES.TGA
    );
    if (tgaBytes) {
      found = {
        keyPath: entry.keyPath,
        tgaBytes,
        txiBytes: await entry.reader.read(
          SHADOW_TEXTURE_RESREF,
          NWN_KEY_BIF_RESOURCE_TYPES.TXI
        )
      };
      break;
    }
  }

  if (!found) {
    console.log(
      JSON.stringify(
        {
          status: "missing-shadow-texture",
          nwnRoot: NWN_ROOT,
          resref: SHADOW_TEXTURE_RESREF,
          searchedKeys: readers.map((entry) => entry.keyPath)
        },
        null,
        2
      )
    );
    return;
  }

  const tgaSummary = summarizeAuroraTgaTexture(found.tgaBytes);
  console.log(
    JSON.stringify(
      {
        status: "found",
        source: found.keyPath.replace(/\\/gu, "/"),
        resref: SHADOW_TEXTURE_RESREF,
        tgaSummary,
        txi: found.txiBytes?.toString("utf8") ?? null,
        txiByteLength: found.txiBytes?.length ?? null,
        proofStatus: "source-backed-retail-key-bif-fxpa-dot01-shadow-texture"
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
