import { createHash } from "node:crypto";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import {
  NWN_KEY_BIF_RESOURCE_TYPES,
  NwnKeyBifResourceReader
} from "../src/modules/runtime-settings/application/nwn-key-bif-resource-reader";
import { parseAuroraMdlVfxSource } from "../src/modules/vfx/domain/aurora-mdl-vfx-source.parser";

const DEFAULT_NWN_ROOT =
  "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights";
const DEFAULT_OUTPUT =
  "backend/docs/aurora-reverse/artifacts/shadowsize-retail-proof-2026-07-02/fx-shadow-mdl-parser-report.json";
const KEY_FILES = ["nwn_base.key", "nwn_retail.key"] as const;
const SHADOW_MDLS = ["fx_shadow_s", "fx_shadow_m", "fx_shadow_l"] as const;

interface Options {
  nwnRoot: string;
  output: string | null;
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    nwnRoot: process.env.AURORA_NWN_ROOT ?? DEFAULT_NWN_ROOT,
    output: DEFAULT_OUTPUT
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--nwnRoot") {
      index += 1;
      options.nwnRoot = requireValue(arg, argv[index]);
    } else if (arg === "--out" || arg === "--output") {
      index += 1;
      options.output = requireValue(arg, argv[index]);
    } else if (arg === "--stdout") {
      options.output = null;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function requireValue(flag: string, value: string | undefined): string {
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function printHelp(): void {
  console.log(`Usage: ts-node --transpile-only scripts/audit-retail-shadow-mdls.ts [options]

Options:
  --nwnRoot <path>    NWN install root. Defaults to AURORA_NWN_ROOT or Steam NWN root.
  --out <path>        Output parser report JSON path.
  --stdout            Print JSON only; do not write a file.
`);
}

async function existsAsFile(pathValue: string): Promise<boolean> {
  try {
    const stats = await stat(pathValue);
    return stats.isFile();
  } catch {
    return false;
  }
}

function toAbsolute(inputPath: string): string {
  return isAbsolute(inputPath) ? inputPath : resolve(process.cwd(), inputPath);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const nwnRoot = resolve(options.nwnRoot);
  const readers: Array<{ keyPath: string; reader: NwnKeyBifResourceReader }> = [];
  for (const keyFile of KEY_FILES) {
    const keyPath = resolve(nwnRoot, "data", keyFile);
    if (await existsAsFile(keyPath)) {
      readers.push({
        keyPath,
        reader: await NwnKeyBifResourceReader.open(keyPath, nwnRoot)
      });
    }
  }

  const report = [];
  for (const resref of SHADOW_MDLS) {
    let found:
      | {
          keyPath: string;
          bytes: Buffer;
        }
      | null = null;
    for (const entry of readers) {
      const bytes = await entry.reader.read(resref, NWN_KEY_BIF_RESOURCE_TYPES.MDL);
      if (bytes) {
        found = { keyPath: entry.keyPath, bytes };
        break;
      }
    }

    if (!found) {
      report.push({
        resref,
        found: false,
        searchedKeys: readers.map((entry) => entry.keyPath.replace(/\\/gu, "/"))
      });
      continue;
    }

    const sha256 = createHash("sha256").update(found.bytes).digest("hex");
    const parsed = parseAuroraMdlVfxSource(found.bytes, {
      sourceModelObjectKey: `${found.keyPath.replace(/\\/gu, "/")}::${resref}.mdl`,
      sourceModelFileName: `${resref}.mdl`,
      sourceModelHash: sha256
    });
    report.push({
      resref,
      found: true,
      source: found.keyPath.replace(/\\/gu, "/"),
      size: found.bytes.length,
      sha256,
      sourceFormat: parsed.sourceFormat,
      emitters: parsed.emitters.map((emitter) => ({
        nodeName: emitter.nodeName,
        texture: emitter.texture ?? null,
        emitterType: emitter.emitterType ?? null,
        emitterTypeRaw: emitter.emitterTypeRaw ?? null,
        renderMode: emitter.renderMode ?? null,
        renderModeRaw: emitter.renderModeRaw ?? null,
        blendMode: emitter.blendMode ?? null,
        blendModeRaw: emitter.blendModeRaw ?? null,
        position: emitter.transform?.position ?? null,
        simulation: emitter.simulation ?? null,
        sourceState: emitter.sourceState ?? null,
        provenance: emitter.provenance
      })),
      lights: parsed.lights,
      diagnostics: parsed.diagnostics
    });
  }

  const output = {
    version: "aurora-retail-shadow-mdl-parser-report/v1",
    generatedAt: new Date().toISOString(),
    status:
      readers.length === 0
        ? "blocked-retail-key-files-missing"
        : report.every((entry) => entry.found)
          ? "found"
          : "blocked-retail-shadow-mdl-missing",
    nwnRoot: nwnRoot.replace(/\\/gu, "/"),
    searchedKeys: readers.map((entry) => entry.keyPath.replace(/\\/gu, "/")),
    report
  };
  const json = `${JSON.stringify(output, null, 2)}\n`;
  if (options.output) {
    const outputPath = toAbsolute(options.output);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, json, "utf8");
  }
  console.log(json.trimEnd());
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
