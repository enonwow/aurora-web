import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  NwnKeyBifResourceReader,
  NWN_KEY_BIF_RESOURCE_TYPES
} from "../src/modules/runtime-settings/application/nwn-key-bif-resource-reader";

const repoRoot = resolve(__dirname, "../..");
const sourceRoot = resolve(
  repoRoot,
  "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/sources"
);
const nwnRoot =
  process.env.NWN_ROOT ?? "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights";
const keyPath = resolve(nwnRoot, "data/nwn_base.key");

async function main(): Promise<void> {
  const reader = await NwnKeyBifResourceReader.open(keyPath, nwnRoot);
  const [tga, txi] = await Promise.all([
    reader.read("fxpa_dirt", NWN_KEY_BIF_RESOURCE_TYPES.TGA),
    reader.read("fxpa_dirt", NWN_KEY_BIF_RESOURCE_TYPES.TXI)
  ]);
  if (!tga) {
    throw new Error(`Retail source ${keyPath} does not contain fxpa_dirt.tga.`);
  }
  if (!txi) {
    throw new Error(`Retail source ${keyPath} does not contain fxpa_dirt.txi.`);
  }

  await mkdir(sourceRoot, { recursive: true });
  const tgaPath = resolve(sourceRoot, "fxpa_dirt.tga");
  const txiPath = resolve(sourceRoot, "fxpa_dirt.txi");
  await Promise.all([writeFile(tgaPath, tga), writeFile(txiPath, txi)]);

  process.stdout.write(
    `${JSON.stringify(
      {
        source: "nwn_base.key",
        keyPath,
        assets: [
          { resref: "fxpa_dirt", type: "tga", path: tgaPath, sha256: sha256(tga) },
          { resref: "fxpa_dirt", type: "txi", path: txiPath, sha256: sha256(txi) }
        ]
      },
      null,
      2
    )}\n`
  );
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
