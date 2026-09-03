import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { NwnKeyBifResourceReader } from "../src/modules/runtime-settings/application/nwn-key-bif-resource-reader";

const SHADER_RESOURCE_TYPE = 2069;
const NWN_ROOT = "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights";
const SETTINGS_PATH = "C:/Users/enonw/Documents/Neverwinter Nights/settings.tml";
const TOOLSET_PATH = resolve(NWN_ROOT, "bin/win32/nwtoolset.exe");
const EXPECTED_TOOLSET_SHA256 =
  "4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24";
const BLOOM_GLOBALS = [
  { name: "downscaleOffset", va: 0x00cbfce8, type: "int", expected: 0 },
  { name: "downscaleSteps", va: 0x00cbfcec, type: "int", expected: 7 },
  { name: "threshold", va: 0x00cbfcf0, type: "float", expected: 1 },
  { name: "softness", va: 0x00cbfcf4, type: "float", expected: 0.9 },
  { name: "multiplier", va: 0x00cbfcf8, type: "float", expected: 1 }
] as const;
const OUTPUT_PATH = resolve(
  "docs/aurora-reverse/artifacts/vfx-bloom-2026-07-15/retail-bloom-shader-audit.json"
);

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function selectContractLines(source: string): string[] {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) =>
      /uniform|texture2D|threshold|softness|multiplier|frag(?:ment)?color|mix\(|smoothstep/i.test(
        line
      )
    )
    .slice(0, 80);
}

function toHex(value: number, width = 8): string {
  return `0x${value.toString(16).padStart(width, "0")}`;
}

function readToolsetBloomDefaults(bytes: Buffer) {
  const peOffset = bytes.readUInt32LE(0x3c);
  if (bytes.toString("ascii", peOffset, peOffset + 4) !== "PE\0\0") {
    throw new Error(`Invalid PE signature in ${TOOLSET_PATH}`);
  }
  const coffOffset = peOffset + 4;
  const sectionCount = bytes.readUInt16LE(coffOffset + 2);
  const optionalHeaderSize = bytes.readUInt16LE(coffOffset + 16);
  const optionalOffset = coffOffset + 20;
  const peMagic = bytes.readUInt16LE(optionalOffset);
  if (peMagic !== 0x10b) {
    throw new Error(`Expected PE32 nwtoolset.exe, got ${toHex(peMagic, 4)}`);
  }
  const imageBase = bytes.readUInt32LE(optionalOffset + 28);
  const sectionTableOffset = optionalOffset + optionalHeaderSize;
  const sections = Array.from({ length: sectionCount }, (_, index) => {
    const offset = sectionTableOffset + index * 40;
    return {
      name: bytes.toString("ascii", offset, offset + 8).replace(/\0+$/u, ""),
      virtualSize: bytes.readUInt32LE(offset + 8),
      virtualAddress: bytes.readUInt32LE(offset + 12),
      rawSize: bytes.readUInt32LE(offset + 16),
      rawPointer: bytes.readUInt32LE(offset + 20)
    };
  });
  const vaToFileOffset = (va: number) => {
    const rva = va - imageBase;
    const section = sections.find(
      (candidate) =>
        rva >= candidate.virtualAddress &&
        rva < candidate.virtualAddress + Math.max(candidate.virtualSize, candidate.rawSize)
    );
    if (!section) throw new Error(`PE section not found for VA ${toHex(va)}`);
    return {
      rva,
      section,
      fileOffset: section.rawPointer + (rva - section.virtualAddress)
    };
  };
  const values = BLOOM_GLOBALS.map((global) => {
    const { rva, section, fileOffset } = vaToFileOffset(global.va);
    const value =
      global.type === "float" ? bytes.readFloatLE(fileOffset) : bytes.readInt32LE(fileOffset);
    return {
      name: global.name,
      type: global.type,
      va: toHex(global.va),
      rva: toHex(rva),
      section: section.name,
      fileOffset: toHex(fileOffset),
      rawLittleEndian: bytes.subarray(fileOffset, fileOffset + 4).toString("hex"),
      value,
      expected: global.expected,
      matchesExpected: Math.abs(value - global.expected) < 0.000001
    };
  });
  const blendFactorTableVa = 0x00cc99f0;
  const blendFactorTable = vaToFileOffset(blendFactorTableVa);
  const sourceFactorIndex = 2;
  const destinationFactorIndex = 1;
  const sourceFactorGl = bytes.readUInt32LE(
    blendFactorTable.fileOffset + sourceFactorIndex * 4
  );
  const destinationFactorGl = bytes.readUInt32LE(
    blendFactorTable.fileOffset + destinationFactorIndex * 4
  );
  const finalBlendCallSequenceVa = 0x00a2250d;
  const finalBlendCallSequence = vaToFileOffset(finalBlendCallSequenceVa);
  const finalBlendCallBytes = bytes
    .subarray(finalBlendCallSequence.fileOffset, finalBlendCallSequence.fileOffset + 9)
    .toString("hex");
  const finalApplyBlend = {
    callSequenceVa: toHex(finalBlendCallSequenceVa),
    callSequenceBytes: finalBlendCallBytes,
    callSequenceMeaning:
      "push destination index 1; push source index 2; call FUN_00a7819c/glBlendFunc",
    factorTableVa: toHex(blendFactorTableVa),
    sourceFactorIndex,
    sourceFactorGl: toHex(sourceFactorGl, 4),
    sourceFactorName: "GL_ONE",
    destinationFactorIndex,
    destinationFactorGl: toHex(destinationFactorGl, 4),
    destinationFactorName: "GL_ONE_MINUS_SRC_ALPHA",
    composition: "bloom.rgb + scene.rgb * (1 - bloom.alpha)",
    matchesExpected:
      finalBlendCallBytes.startsWith("6a016a02e8") &&
      sourceFactorGl === 0x0001 &&
      destinationFactorGl === 0x0303
  };
  return {
    imageBase: toHex(imageBase),
    peMagic: toHex(peMagic, 4),
    values,
    profile: Object.fromEntries(values.map((entry) => [entry.name, entry.value])),
    allValuesMatchExpected: values.every((entry) => entry.matchesExpected),
    finalApplyBlend
  };
}

async function main(): Promise<void> {
  const keyPaths = ["nwn_base.key", "nwn_retail.key"].map((name) =>
    resolve(NWN_ROOT, "data", name)
  );
  const scans = await Promise.all(
    keyPaths.map(async (keyPath) => {
      const reader = await NwnKeyBifResourceReader.open(keyPath, NWN_ROOT);
      const shaderResrefs = reader.list(SHADER_RESOURCE_TYPE).map((entry) => entry.resref);
      const candidateResrefs = shaderResrefs.filter((resref) => /bloom|fb/i.test(resref));
      const resources = await Promise.all(
        candidateResrefs.map(async (resref) => {
          const bytes = await reader.read(resref, SHADER_RESOURCE_TYPE);
          if (!bytes) throw new Error(`Retail framebuffer shader is missing: ${resref}`);
          const source = bytes.toString("utf8");
          return {
            resref,
            bytes: bytes.length,
            sha256: sha256(bytes),
            source,
            contractLines: selectContractLines(source)
          };
        })
      );
      return { keyPath, shaderResourceCount: shaderResrefs.length, candidateResrefs, resources };
    })
  );
  const resources = scans.flatMap((scan) => scan.resources);
  const bloomResrefs = [
    ...new Set(scans.flatMap((scan) => scan.candidateResrefs).filter((resref) => /bloom/i.test(resref)))
  ];
  const settings = await readFile(SETTINGS_PATH, "utf8");
  const toolsetBytes = await readFile(TOOLSET_PATH);
  const toolsetSha256 = sha256(toolsetBytes);
  const binaryDefaults = readToolsetBloomDefaults(toolsetBytes);
  const requiredBloomShadersRecovered = ["fsfbbloom", "vsfbbloom"].every((resref) =>
    bloomResrefs.includes(resref)
  );
  const binaryMatchesOracle = toolsetSha256 === EXPECTED_TOOLSET_SHA256;
  const payload = {
    version: "aurora-retail-bloom-shader-audit/v3",
    generatedAt: new Date().toISOString(),
    status:
      requiredBloomShadersRecovered &&
      binaryMatchesOracle &&
      binaryDefaults.allValuesMatchExpected &&
      binaryDefaults.finalApplyBlend.matchesExpected
        ? "retail-bloom-source-and-default-profile-recovered"
        : "incomplete",
    source: {
      keyScans: scans,
      resourceType: SHADER_RESOURCE_TYPE,
      resources,
      decompilationAnchors: [
        "decompiled_all.c:847753-847757 registers bloom downscale/threshold/softness/multiplier",
        "decompiled_all.c:849466-849477 uploads threshold/softness/multiplier to scalar slots 15/16/17 and clamps downscale steps to 8",
        "decompiled_all.c:849501-849503 binds vsFBBLOOM/fsFBBLOOM",
        "decompiled_all.c:849595-849667 performs bloom extract/downscale/composite passes",
        "nwtoolset.exe:0x00a2250d pushes blend factor indices 1/2 before FUN_00a7819c; table 0x00cc99f0 maps source 2 to GL_ONE and destination 1 to GL_ONE_MINUS_SRC_ALPHA"
      ],
      toolsetBinary: {
        path: TOOLSET_PATH,
        sha256: toolsetSha256,
        expectedSha256: EXPECTED_TOOLSET_SHA256,
        matchesApprovedOracle: binaryMatchesOracle,
        ...binaryDefaults
      },
      captureSettingsPath: SETTINGS_PATH,
      captureHdrBloomEnabled:
        /\[graphics\.fbo\.hdr-bloom\][\s\S]*?enabled\s*=\s*true/.test(settings)
    }
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ output: OUTPUT_PATH, status: payload.status, bloomResrefs }, null, 2));
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
