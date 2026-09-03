import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import {
  NwnKeyBifResourceReader
} from "../src/modules/runtime-settings/application/nwn-key-bif-resource-reader";

const SHADER_RESOURCE_TYPE = 2069;
const DEFAULT_NWN_ROOT = "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights";
const DEFAULT_OUTPUT =
  "backend/docs/aurora-reverse/artifacts/vfx-particle-shaders-2026-07-19/active-retail-particle-shader-audit.json";

interface Options {
  nwnRoot: string;
  out: string;
}

interface RetailShaderResourceFact {
  resref: string;
  resourceType: number;
  bytes: number;
  sha256: string;
  source: string;
}

interface PeSection {
  virtualAddress: number;
  virtualSize: number;
  rawOffset: number;
  rawSize: number;
}

function parseOptions(argv: string[]): Options {
  const options: Options = {
    nwnRoot: DEFAULT_NWN_ROOT,
    out: DEFAULT_OUTPUT
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--nwnRoot") {
      options.nwnRoot = requireValue(argument, argv[++index]);
    } else if (argument === "--out") {
      options.out = requireValue(argument, argv[++index]);
    } else if (argument === "--help" || argument === "-h") {
      console.log("Usage: ts-node scripts/audit-retail-particle-shaders.ts [--nwnRoot <path>] [--out <path>]");
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
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

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function resourceFact(resref: string, bytes: Uint8Array): RetailShaderResourceFact {
  return {
    resref,
    resourceType: SHADER_RESOURCE_TYPE,
    bytes: bytes.length,
    sha256: sha256(bytes),
    source: Buffer.from(bytes).toString("utf8")
  };
}

function resolveOutputPath(out: string): string {
  return isAbsolute(out) ? out : resolve(process.cwd(), "..", out);
}

function repoRelative(path: string): string {
  return relative(resolve(process.cwd(), ".."), path).replaceAll("\\", "/");
}

function readPeVirtualAddress(image: Buffer, virtualAddress: number, size: number): Buffer {
  const peOffset = image.readUInt32LE(0x3c);
  if (image.toString("ascii", peOffset, peOffset + 4) !== "PE\0\0") {
    throw new Error("nwtoolset.exe is not a PE image.");
  }
  const coffOffset = peOffset + 4;
  const sectionCount = image.readUInt16LE(coffOffset + 2);
  const optionalHeaderSize = image.readUInt16LE(coffOffset + 16);
  const optionalHeaderOffset = coffOffset + 20;
  if (image.readUInt16LE(optionalHeaderOffset) !== 0x10b) {
    throw new Error("Expected the 32-bit PE optional-header layout.");
  }
  const imageBase = image.readUInt32LE(optionalHeaderOffset + 28);
  const rva = virtualAddress - imageBase;
  const sectionTableOffset = optionalHeaderOffset + optionalHeaderSize;
  const sections: PeSection[] = Array.from({ length: sectionCount }, (_, index) => {
    const offset = sectionTableOffset + index * 40;
    return {
      virtualSize: image.readUInt32LE(offset + 8),
      virtualAddress: image.readUInt32LE(offset + 12),
      rawSize: image.readUInt32LE(offset + 16),
      rawOffset: image.readUInt32LE(offset + 20)
    };
  });
  const section = sections.find(
    (entry) =>
      rva >= entry.virtualAddress &&
      rva + size <= entry.virtualAddress + Math.max(entry.virtualSize, entry.rawSize)
  );
  if (!section) {
    throw new Error(`PE virtual address 0x${virtualAddress.toString(16)} is not mapped.`);
  }
  const rawOffset = section.rawOffset + rva - section.virtualAddress;
  return image.subarray(rawOffset, rawOffset + size);
}

function requireHex(bytes: Buffer, expected: string, label: string): void {
  const actual = bytes.toString("hex");
  if (actual !== expected) {
    throw new Error(`${label} signature mismatch: expected ${expected}, received ${actual}.`);
  }
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const nwnRoot = resolve(options.nwnRoot);
  const keyPath = resolve(nwnRoot, "data", "nwn_retail.key");
  const toolsetPath = resolve(nwnRoot, "bin", "win32", "nwtoolset.exe");
  const toolsetBytes = await readFile(toolsetPath);
  const uniformLocationQuery = readPeVirtualAddress(toolsetBytes, 0x00a70f76, 23);
  const alphaDiscardUpload = readPeVirtualAddress(toolsetBytes, 0x00a744b1, 45);
  const alphaDiscardConstants = readPeVirtualAddress(toolsetBytes, 0x00a74fc4, 8);
  requireHex(
    uniformLocationQuery,
    "8d8e3d050000518b8304010000508b17ff128983640b00",
    "fAlphaDiscardValue uniform-location field"
  );
  requireHex(
    alphaDiscardUpload,
    "6a01e8b8aaffff5984c07408d905c44fa700eb06d905c84fa70083c4fcd91c248b83640b000050e8e77affff83",
    "fAlphaDiscardValue state upload"
  );
  requireHex(alphaDiscardConstants, "cdcc4c3e000080bf", "alpha-discard constants");
  const reader = await NwnKeyBifResourceReader.open(keyPath, nwnRoot);
  const [
    fragmentBytes,
    vertexBytes,
    commonBytes,
    framebufferBytes,
    standardBytes,
    tonemapBytes
  ] = await Promise.all([
    reader.read("fsparticle", SHADER_RESOURCE_TYPE),
    reader.read("vsparticle", SHADER_RESOURCE_TYPE),
    reader.read("inc_common", SHADER_RESOURCE_TYPE),
    reader.read("inc_framebuffer", SHADER_RESOURCE_TYPE),
    reader.read("inc_standard", SHADER_RESOURCE_TYPE),
    reader.read("inc_tonemap", SHADER_RESOURCE_TYPE)
  ]);
  if (
    !fragmentBytes ||
    !vertexBytes ||
    !commonBytes ||
    !framebufferBytes ||
    !standardBytes ||
    !tonemapBytes
  ) {
    const missing = [
      !fragmentBytes ? "fsparticle" : undefined,
      !vertexBytes ? "vsparticle" : undefined,
      !commonBytes ? "inc_common" : undefined,
      !framebufferBytes ? "inc_framebuffer" : undefined,
      !standardBytes ? "inc_standard" : undefined,
      !tonemapBytes ? "inc_tonemap" : undefined
    ].filter((value): value is string => Boolean(value));
    throw new Error(`Retail particle shader resources are missing: ${missing.join(", ")}`);
  }
  const fragmentSource = fragmentBytes.toString("utf8");
  const vertexSource = vertexBytes.toString("utf8");
  const commonSource = commonBytes.toString("utf8");

  const payload = {
    version: "aurora-retail-particle-shader-audit/v3",
    generatedAt: new Date().toISOString(),
    status: "active-retail-source-and-alpha-discard-runtime-mapping-recovered",
    source: {
      nwnRoot,
      keyPath,
      toolset: {
        path: toolsetPath,
        bytes: toolsetBytes.length,
        sha256: sha256(toolsetBytes)
      },
      bifResourceType: SHADER_RESOURCE_TYPE,
      resources: [
        resourceFact("fsparticle", fragmentBytes),
        resourceFact("vsparticle", vertexBytes),
        resourceFact("inc_common", commonBytes),
        resourceFact("inc_framebuffer", framebufferBytes),
        resourceFact("inc_standard", standardBytes),
        resourceFact("inc_tonemap", tonemapBytes)
      ]
    },
    recovered: {
      fragmentMultipliesVertexColorAndTexture:
        /FragmentColor\s*=\s*VertexColor\s*\*\s*texture2D\(texUnit0/.test(fragmentSource),
      fragmentMainUsesColorSpaceConversion:
        /ApplyColorSpace|RevertColorSpace/.test(fragmentSource),
      fragmentMainClampsSampledRgba:
        /clamp\s*\(\s*FragmentColor/.test(fragmentSource),
      alphaDiscardAfterTextureSample: /AlphaDiscard\(FragmentColor\.a\);/.test(fragmentSource),
      blendModeUniform: /uniform\s+int\s+blendMode\s*;/.test(fragmentSource),
      additiveBranch: /blendMode\s*==\s*BLEND_MODE_ADDITIVE/.test(fragmentSource),
      punchThroughSymbolDefined: /#define\s+BLEND_MODE_PUNCHTHROUGH\s+2/.test(fragmentSource),
      punchThroughDirectFragmentBranch:
        /blendMode\s*==\s*BLEND_MODE_PUNCHTHROUGH/.test(fragmentSource),
      activeSoftParticleUniform:
        /uniform\s+float\s+particleSoftness\s*;/.test(fragmentSource),
      supersededBaseSoftParticleUniformsAbsent:
        !/uniform\s+float\s+particleSizeMax\s*;/.test(vertexSource) &&
        !/uniform\s+int\s+particleSoften\s*;/.test(fragmentSource),
      alphaDiscardUniform: /uniform\s+lowp\s+float\s+fAlphaDiscardValue\s*;/.test(commonSource),
      alphaDiscardComparison:
        /ALPHA_DISCARD_VALUE\s*>=\s*0\.0\s*&&\s*fAlphaValue\s*<=\s*ALPHA_DISCARD_VALUE/.test(
          commonSource
        ),
      discardCanBeCompiledOut: /#define\s+discard/.test(commonSource),
      alphaDiscardUniformLocationFieldMapped: true,
      alphaDiscardRuntimeWriteMapped: true,
      alphaDiscardEnabledValue: alphaDiscardConstants.readFloatLE(0),
      alphaDiscardDisabledValue: alphaDiscardConstants.readFloatLE(4)
    },
    runtimeAlphaDiscard: {
      uniformName: "fAlphaDiscardValue",
      uniformNameVirtualAddress: "0x00cca6dd",
      uniformLocationQueryVirtualAddress: "0x00a70f76",
      shaderProgramLocationFieldOffset: "0x0b64",
      rendererStateBit: 1,
      uploadBranchVirtualAddress: "0x00a744b1",
      enabledValue: alphaDiscardConstants.readFloatLE(0),
      disabledValue: alphaDiscardConstants.readFloatLE(4),
      scalarUniformWrapperVirtualAddress: "0x00a6bfc4",
      proofStatus: "confirmed-nwtoolset-disassembly-and-pe-signatures"
    },
    interpretation: {
      confirmed: [
        "The active retail override fsparticle samples texUnit0 and multiplies its full RGBA value by the unconverted vertex color before AlphaDiscard.",
        "The active particle main does not call ApplyColorSpace or RevertColorSpace and does not clamp FragmentColor after the texture/vertex multiplication.",
        "Retail AlphaDiscard is controlled by fAlphaDiscardValue and discards alpha values less than or equal to that non-negative uniform threshold.",
        "nwtoolset.exe stores the fAlphaDiscardValue uniform location at shader-program offset +0xb64 and uploads 0.2 when renderer state bit 1 is enabled, or -1.0 when disabled.",
        "Punch-Through particle mode 1 selects the alpha-discard shader variant; non-punch particle modes select the compiled-out variant.",
        "Retail fsparticle has an additive blendMode branch for fog behavior and declares a Punch-Through mode constant, but does not contain a direct Punch-Through fragment branch.",
        "The active retail override exposes the depth-based soft-particle scalar as particleSoftness; particleSoften and particleSizeMax belong to the superseded base shader."
      ],
      sourceAnchors: [
        "nwn_retail.key -> ovr.bif:fsparticle (resource type 2069)",
        "nwn_retail.key -> ovr.bif:vsparticle (resource type 2069)",
        "nwn_retail.key -> ovr.bif:inc_common (resource type 2069)",
        "nwn_retail.key -> ovr.bif:inc_framebuffer (resource type 2069)",
        "nwn_retail.key -> ovr.bif:inc_standard (resource type 2069)",
        "nwn_retail.key -> ovr.bif:inc_tonemap (resource type 2069)",
        "decompiled_all.c:853993-854017 (Punch-Through token maps to particle mode 1)",
        "decompiled_all.c:856771-856807 (particle renderer chooses shader variant before draw)",
        "nwtoolset.exe:0x00a70f76-0x00a70f8c (uniform location -> program +0xb64)",
        "nwtoolset.exe:0x00a744b1-0x00a744d8 (renderer state 1 -> 0.2/-1.0 scalar upload)",
        "nwtoolset.exe:0x00a74fc4-0x00a74fcb (0.2f and -1.0f constants)"
      ],
      unrecovered: [
        "Do not treat Three alphaTest=0.5 as a retail-derived cutoff.",
        "The Toolset alpha-discard binary mapping is corroborating evidence for that host; it does not replace the separately documented NWN retail runtime mapping.",
        "This audit does not by itself prove final framebuffer postprocessing or visual parity."
      ]
    }
  };

  const outputPath = resolveOutputPath(options.out);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ out: repoRelative(outputPath), status: payload.status }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
