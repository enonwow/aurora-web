import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { NwnKeyBifResourceReader } from "../src/modules/runtime-settings/application/nwn-key-bif-resource-reader";
import {
  buildAuroraShaderProgramSourceBundle,
  extractAuroraShaderIncludeRefs,
  type AuroraMaterialShaderParameter
} from "../src/modules/vfx/domain/aurora-shader-source-graph";

const MTR_RESOURCE_TYPE = 2072;
const SHADER_RESOURCE_TYPE = 2069;
const DEFAULT_NWN_ROOT = "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights";
const DEFAULT_OUTPUT =
  "backend/docs/aurora-reverse/artifacts/vfx-material-framebuffer-2026-07-15/retail-material-framebuffer-audit.json";
const DEFAULT_PROBE_OUTPUT =
  "frontend/public/dev-fixtures/vfx-mtr-custom-shader/fixture.json";
const EXPECTED_TOOLSET_SHA256 =
  "4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24";
const AURORA_SHADER_PROFILE_DEFINES = [
  "MAX_NUM_LIGHTS",
  "MAX_NUM_BONES",
  "GAMMA_CORRECTION",
  "FRAGMENT_LIGHTING",
  "SHADER_QUALITY_MODE",
  "KEYHOLING_ENABLED",
  "SHADER_DEBUG_MODE",
  "NO_DISCARD",
  "POSTPROCESSING_TYPES_ENABLED"
] as const;

interface Options {
  nwnRoot: string;
  out: string;
  probeOut: string;
}

interface PeSection {
  virtualAddress: number;
  virtualSize: number;
  rawOffset: number;
  rawSize: number;
}

interface RetailShaderAuditEntry {
  resref: string;
  resolved: boolean;
  bytes?: number;
  sha256?: string;
  includeRefs?: string[];
  declaredUniforms?: string[];
  declaredAttributes?: string[];
  declaredVaryings?: string[];
  profileDefinesUsed?: string[];
  source?: string;
}

function parseOptions(argv: string[]): Options {
  const options: Options = {
    nwnRoot: DEFAULT_NWN_ROOT,
    out: DEFAULT_OUTPUT,
    probeOut: DEFAULT_PROBE_OUTPUT
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--nwnRoot") {
      options.nwnRoot = requireValue(argument, argv[++index]);
    } else if (argument === "--out") {
      options.out = requireValue(argument, argv[++index]);
    } else if (argument === "--probeOut") {
      options.probeOut = requireValue(argument, argv[++index]);
    } else if (argument === "--help" || argument === "-h") {
      console.log(
        "Usage: ts-node scripts/audit-retail-material-framebuffer.ts [--nwnRoot <path>] [--out <path>] [--probeOut <path>]"
      );
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

function extractDirective(source: string, name: string): string | null {
  const match = source.match(new RegExp(`^\\s*${name}\\s+([^\\s#]+)`, "imu"));
  return match?.[1]?.trim().toLowerCase() ?? null;
}

function hasDirective(source: string, name: string): boolean {
  return new RegExp(`^\\s*${name}(?:\\s|$)`, "imu").test(source);
}

function extractMaterialParameters(source: string): AuroraMaterialShaderParameter[] {
  const parameters: AuroraMaterialShaderParameter[] = [];
  for (const line of source.split(/\r?\n/u)) {
    const tokens = line.trim().split(/\s+/u);
    if (tokens[0]?.toLowerCase() !== "parameter") continue;
    const kind = tokens[1]?.toLowerCase();
    const name = tokens[2];
    const values = tokens.slice(3).map(Number);
    if (
      !name ||
      (kind !== "float" && kind !== "int") ||
      values.length < 1 ||
      values.length > 4 ||
      values.some((value) => !Number.isFinite(value)) ||
      (kind === "int" && (values.length !== 1 || !Number.isInteger(values[0])))
    ) {
      continue;
    }
    parameters.push({
      name,
      kind,
      values,
      arity: values.length as 1 | 2 | 3 | 4
    });
  }
  return parameters;
}

function extractShaderDeclarations(source: string, qualifier: string): string[] {
  const names = new Set<string>();
  const pattern = new RegExp(
    `^\\s*${qualifier}\\s+(?:(?:lowp|mediump|highp)\\s+)?[A-Za-z_][A-Za-z0-9_]*\\s+([A-Za-z_][A-Za-z0-9_]*)`,
    "gmu"
  );
  for (const match of source.matchAll(pattern)) {
    if (match[1]) names.add(match[1]);
  }
  return [...names].sort((left, right) => left.localeCompare(right));
}

function collectSortedValues(entries: RetailShaderAuditEntry[], key: keyof RetailShaderAuditEntry): string[] {
  const values = new Set<string>();
  for (const entry of entries) {
    const current = entry[key];
    if (Array.isArray(current)) current.forEach((value) => values.add(value));
  }
  return [...values].sort((left, right) => left.localeCompare(right));
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const nwnRoot = resolve(options.nwnRoot);
  const keyPath = resolve(nwnRoot, "data", "nwn_base.key");
  const toolsetPath = resolve(nwnRoot, "bin", "win32", "nwtoolset.exe");
  const toolsetBytes = await readFile(toolsetPath);
  const toolsetHash = sha256(toolsetBytes);
  if (toolsetHash !== EXPECTED_TOOLSET_SHA256) {
    throw new Error(
      `Unexpected nwtoolset.exe SHA256: expected ${EXPECTED_TOOLSET_SHA256}, received ${toolsetHash}.`
    );
  }

  const mode2Classifier = readPeVirtualAddress(toolsetBytes, 0x00a7de9f, 42);
  const mode1Classifier = readPeVirtualAddress(toolsetBytes, 0x00a7dedb, 37);
  const volumetricClassifier = readPeVirtualAddress(toolsetBytes, 0x00a7df00, 60);
  const framebufferBinding = readPeVirtualAddress(toolsetBytes, 0x00a21ba4, 156);
  const framebufferCopyAndBindTail = readPeVirtualAddress(toolsetBytes, 0x00a21cb6, 42);
  const lane5Pass = readPeVirtualAddress(toolsetBytes, 0x00a82947, 63);
  const lane6Pass = readPeVirtualAddress(toolsetBytes, 0x00a82b12, 79);
  const shaderCompileHeader = readPeVirtualAddress(toolsetBytes, 0x00a71b1c, 0x92);
  const materialProgramRebind = readPeVirtualAddress(toolsetBytes, 0x00a45b3c, 0x61);
  const configuredMaxLights = readPeVirtualAddress(toolsetBytes, 0x00cc3098, 4).readUInt32LE(0);

  requireHex(
    mode2Classifier,
    "83bb8400000000740e8b83840000008b9084010000eb0233d283fa02750cc745ec06000000e9a0000000",
    "sample_framebuffer mode 2 -> runtime lane 6"
  );
  requireHex(
    mode1Classifier,
    "83bb8400000000740e8b83840000008b8884010000eb0233c9497509c745ec05000000eb69",
    "sample_framebuffer mode 1 -> runtime lane 5"
  );
  requireHex(
    volumetricClassifier,
    "83bb8400000000740e8b83840000008a9088010000eb0233d284d2741fc745ec050000006a026a01568b4508058001000050e89538010083c410eb2d",
    "volumetric -> runtime lane 5 and secondary queue"
  );
  requireHex(
    framebufferBinding,
    "558bec5356578b5d0c8b45088bd38b75108b7d188d1c5ac1e3032bdac1e30203d881c350050000f7c601000000741e837b100074188b451450e816650500598b4b10516a04e8c665050083c408f7c606000000741d837b0c00741757e8f3640500598b430c506a04e8a365050083c408eb23f7c602000000741b837b0400741557e8ce640500598b5304526a04e87e65050083c4085f5e5b5dc39090",
    "framebuffer attachment mask -> texture units"
  );
  requireHex(
    framebufferCopyAndBindTail,
    "508b4df88b01508b55fc8b0a51e8f865050083c41c807d140074126a0c6a0b8b4518505653e8c4feffff",
    "active framebuffer copy and units 11/12 bind"
  );
  requireHex(
    lane5Pass,
    "6a058d868001000050e87fef000083c40884c0742a84db741ba198fccb006a036a016a018b904c0500005250e8c8f2f9ff83c4146a0556e825abffff83c408",
    "mainscene lane 5 framebuffer pass"
  );
  requireHex(
    lane6Pass,
    "6a068d8e8001000051e8b4ed000083c40884c0743a84db741ba198fccb006a036a016a068b904c0500005250e8fdf0f9ff83c4146a00e81f56ffff596a01e83756ffff596a0656e84aa9ffff83c408",
    "mainscene lane 6 framebuffer pass"
  );
  requireHex(
    shaderCompileHeader,
    "81fe308b0000750d807ddb007407b84faecc00eb05b894aecc005081fe318b00007507ba48aecc00eb05ba4caecc00526a02e8010c0000595033c08a4510506845aecc006840aecc006a0ae8e80b000059506a08e8df0b000059506a07e8d60b000059506a01e8cd0b000059506a00e8c40b000059506a40e89702fdff50686baccc008d8d48fbffff51e8c190110083c43c",
    "Aurora shader compile profile header"
  );
  requireHex(
    materialProgramRebind,
    "558bec53807d10008b5d08742a8b836401000085c0744750e8572d03005953e8a4feffff596a018b550c5253e89ffeffff83c40c5b5dc38b836001000085c0741d50e82d2d03005953e87afeffff596a008b550c5253e875feffff83c40c5b5dc3",
    "custom material program variant rebind"
  );
  if (configuredMaxLights !== 32) {
    throw new Error(`Unexpected Toolset configured max-light count: ${configuredMaxLights}.`);
  }

  const reader = await NwnKeyBifResourceReader.open(keyPath, nwnRoot);
  const mtrResources = reader.list(MTR_RESOURCE_TYPE);
  const materials = [];
  const materialSources = new Map<string, string>();
  const customShaderRefs = new Set<string>();
  for (const resource of mtrResources) {
    const bytes = await reader.read(resource.resref, MTR_RESOURCE_TYPE);
    if (!bytes) continue;
    const source = bytes.toString("utf8");
    materialSources.set(resource.resref, source);
    const customShaderVS = extractDirective(source, "customshadervs");
    const customShaderFS = extractDirective(source, "customshaderfs");
    const customShaderGS = extractDirective(source, "customshadergs");
    [customShaderVS, customShaderFS, customShaderGS].forEach((value) => {
      if (value) customShaderRefs.add(value);
    });
    materials.push({
      resref: resource.resref,
      bytes: bytes.length,
      sha256: sha256(bytes),
      customShaderVS,
      customShaderFS,
      customShaderGS,
      parameters: extractMaterialParameters(source),
      usesSampleFramebuffer: hasDirective(source, "sample_framebuffer"),
      usesVolumetric: hasDirective(source, "volumetric")
    });
  }

  const shaders: RetailShaderAuditEntry[] = [];
  const pendingShaderRefs = [...customShaderRefs].sort();
  const visitedShaderRefs = new Set<string>();
  while (pendingShaderRefs.length > 0) {
    const resref = pendingShaderRefs.shift();
    if (!resref || visitedShaderRefs.has(resref)) continue;
    visitedShaderRefs.add(resref);
    const bytes = await reader.read(resref, SHADER_RESOURCE_TYPE);
    const source = bytes?.toString("utf8") ?? "";
    const includeRefs = bytes ? extractAuroraShaderIncludeRefs(source) : [];
    includeRefs.forEach((includeRef) => {
      if (!visitedShaderRefs.has(includeRef)) pendingShaderRefs.push(includeRef);
    });
    shaders.push({
      resref,
      resolved: Boolean(bytes),
      ...(bytes
        ? {
            bytes: bytes.length,
            sha256: sha256(bytes),
            includeRefs,
            declaredUniforms: extractShaderDeclarations(source, "uniform"),
            declaredAttributes: extractShaderDeclarations(source, "attribute"),
            declaredVaryings: extractShaderDeclarations(source, "varying"),
            profileDefinesUsed: AURORA_SHADER_PROFILE_DEFINES.filter((name) =>
              new RegExp(`\\b${name}\\b`, "u").test(source)
            ),
            source
          }
        : {})
    });
  }
  shaders.sort((left, right) => left.resref.localeCompare(right.resref));

  const payload = {
    version: "aurora-retail-material-framebuffer-audit/v1",
    generatedAt: new Date().toISOString(),
    status: "retail-mtr-framebuffer-pass-and-custom-shader-source-graph-recovered",
    source: {
      nwnRoot,
      keyPath,
      toolset: {
        path: toolsetPath,
        bytes: toolsetBytes.length,
        sha256: toolsetHash
      }
    },
    recovered: {
      materialOffsets: {
        sampleFramebuffer: "0x184",
        volumetric: "0x188"
      },
      classification: {
        sampleFramebufferMode1RuntimeLane: 5,
        sampleFramebufferMode2RuntimeLane: 6,
        volumetricRuntimeLane: 5
      },
      mainsceneFramebufferPass: {
        captureCondition: "queue-nonempty-and-scene-name-mainscene",
        sourceSlot: "active-framebuffer-slot-at-renderer+0x54c",
        lane5DestinationSlot: 1,
        lane6DestinationSlot: 6,
        attachmentBindingMask: 3,
        colorTextureUnit: 11,
        depthTextureUnit: 12,
        renderImmediatelyAfterCapture: true
      },
      customShaderCompileProfile: {
        maxNumLights: {
          configured: configuredMaxLights,
          cap: 128,
          effectiveForAdmittedBinary: Math.min(128, configuredMaxLights)
        },
        maxNumBones: 64,
        runtimeStateIndices: {
          gammaCorrection: 0,
          fragmentLighting: 1,
          postprocessingTypesEnabled: 2,
          shaderQualityMode: 7,
          keyholingEnabled: 8,
          shaderDebugMode: 10
        },
        buildVersion: "8193",
        buildRevision: "37",
        noDiscard: "compile-variant-argument-0-or-1",
        varyingQualifier: "out-for-vertex-in-for-fragment",
        legacyFragmentOutputCompatibility: "injected-only-when-gl_FragColor-is-present"
      },
      customShaderAttributeBindings: {
        source: "nwtoolset.exe FUN_00a707a8 glBindAttribLocation sequence",
        nativeSlots: {
          vPos: 0,
          vTcIn: 1,
          vColor: 2,
          vCustomColor: 3,
          vTangent: 4,
          fHandedness: 5,
          vStaticLightDir: 6,
          vNormal: 7,
          vIndex: 8,
          vWeight: 9,
          fProjectionFrontal: 10,
          vTcIn1: 11,
          vTcIn2: 12,
          vTcIn3: 13
        },
        browserBinding:
          "active attributes are resolved by shader name and supplied from same-named BufferGeometry attributes; numeric WebGL locations are adapter-owned"
      },
      customShaderUniformBinding: {
        locationResolution: "glGetUniformLocation-by-name-after-program-link",
        authoredParameterUpload:
          "MTR parameters are uploaded in source order after the selected custom program is rebound",
        sourceFunctions: ["FUN_00a707a8", "FUN_00a45a0c", "FUN_00a45b3c"]
      },
      materialProgramRebind: {
        customProgramSlotNoDiscard0: "material+0x160",
        customProgramSlotNoDiscard1: "material+0x164",
        particleSelection: "blend-mode-1-punch-selects-no-discard-0; non-punch-selects-1",
        order: [
          "bind-vsparticle-fsparticle-program",
          "bind-selected-custom-material-program-if-present",
          "apply-authored-material-parameters",
          "draw"
        ]
      },
      peSignatures: [
        { label: "mode2-classifier", virtualAddress: "0x00a7de9f", bytes: mode2Classifier.length },
        { label: "mode1-classifier", virtualAddress: "0x00a7dedb", bytes: mode1Classifier.length },
        { label: "volumetric-classifier", virtualAddress: "0x00a7df00", bytes: volumetricClassifier.length },
        { label: "attachment-binding", virtualAddress: "0x00a21ba4", bytes: framebufferBinding.length },
        { label: "copy-and-bind-tail", virtualAddress: "0x00a21cb6", bytes: framebufferCopyAndBindTail.length },
        { label: "lane5-pass", virtualAddress: "0x00a82947", bytes: lane5Pass.length },
        { label: "lane6-pass", virtualAddress: "0x00a82b12", bytes: lane6Pass.length },
        { label: "shader-compile-header", virtualAddress: "0x00a71b1c", bytes: shaderCompileHeader.length },
        { label: "material-program-rebind", virtualAddress: "0x00a45b3c", bytes: materialProgramRebind.length }
      ]
    },
    retailBaseInventory: {
      materialResourceType: MTR_RESOURCE_TYPE,
      materialCount: materials.length,
      materials,
      sampleFramebufferMaterialCount: materials.filter((entry) => entry.usesSampleFramebuffer).length,
      volumetricMaterialCount: materials.filter((entry) => entry.usesVolumetric).length,
      customShaderResourceType: SHADER_RESOURCE_TYPE,
      rootCustomShaderCount: customShaderRefs.size,
      rootCustomShaderRefs: [...customShaderRefs].sort(),
      reachableShaderCount: shaders.length,
      reachableShaderSourceBytes: shaders.reduce(
        (sum, entry) => sum + (typeof entry.bytes === "number" ? entry.bytes : 0),
        0
      ),
      unresolvedShaderRefs: shaders
        .filter((entry) => !entry.resolved)
        .map((entry) => entry.resref),
      reachableShaderInterface: {
        declaredUniforms: collectSortedValues(shaders, "declaredUniforms"),
        declaredAttributes: collectSortedValues(shaders, "declaredAttributes"),
        declaredVaryings: collectSortedValues(shaders, "declaredVaryings"),
        profileDefinesUsed: collectSortedValues(shaders, "profileDefinesUsed")
      },
      reachableShaders: shaders
    },
    interpretation: {
      confirmed: [
        "sample_framebuffer 1 is rendered in lane 5 and sample_framebuffer 2 is rendered in lane 6.",
        "A non-empty mainscene lane 5 or 6 copies the active framebuffer into slot 1 or 6 immediately before drawing that lane.",
        "The copied framebuffer color and depth attachments are bound on texture units 11 and 12 with attachment mask 3.",
        "MTR custom shader resrefs are source data and must be resolved together with their include graph before browser execution.",
        "Aurora compiles both NO_DISCARD custom-material variants, then rebinds the variant selected by the particle Punch/non-Punch branch after the particle shader and before draw.",
        "Aurora binds the custom-program vertex interface to fixed native slots 0 through 13 and resolves uniforms by name after link; authored MTR parameters are uploaded after program rebind."
      ],
      sourceAnchors: [
        "decompiled_all.c:868848-868873 (MTR sample_framebuffer and volumetric fields)",
        "decompiled_all.c:908278-908329 and 908377-908441 (lane classification)",
        "nwtoolset.exe:0x00a21ba4-0x00a21c3f (attachment mask and texture units)",
        "nwtoolset.exe:0x00a21cb6-0x00a21cdf (framebuffer copy and units 11/12 bind)",
        "nwtoolset.exe:0x00a82947-0x00a82985 (lane 5 pass)",
        "nwtoolset.exe:0x00a82b12-0x00a82b60 (lane 6 pass)",
        "nwtoolset.exe:0x00a71b1c-0x00a71bad (shader compile profile arguments)",
        "nwtoolset.exe:FUN_00a707a8 (custom-program attribute slots and named-uniform lookup)",
        "nwtoolset.exe:FUN_00a45a0c (authored material-parameter upload)",
        "decompiled_all.c:856771-856808 and nwtoolset.exe:0x00a45b3c-0x00a45b9c (material-program variant selection and ordered rebind)"
      ],
      openVisualGate: [
        "The retail base MTR inventory contains no sample_framebuffer or volumetric fixture, so it does not provide a matched visible oracle for these lanes.",
        "The browser adapter installs the recovered profile, complete SHD graph, same-named vertex inputs and uniforms, and ordered authored parameters. A separate oldf_head retail-source probe has passed real WebGL compile/render with a diagnostic non-retail environment sampler; matched retail visual proof and framebuffer-lane execution remain open."
      ]
    }
  };

  const outputPath = resolveOutputPath(options.out);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  const probeMaterial = materials.find((entry) => entry.resref === "oldf_head");
  if (!probeMaterial?.customShaderVS || !probeMaterial.customShaderFS) {
    throw new Error("Retail oldf_head MTR custom shader roots are unavailable.");
  }
  const probeProgram = buildAuroraShaderProgramSourceBundle({
    stageRoots: {
      vertex: probeMaterial.customShaderVS,
      fragment: probeMaterial.customShaderFS
    },
    sources: shaders.flatMap((entry) =>
      entry.resolved && entry.source
        ? [{ resref: entry.resref, source: entry.source, includeRefs: entry.includeRefs ?? [] }]
        : []
    )
  });
  if (probeProgram.status !== "complete") {
    throw new Error(
      `Retail oldf_head custom shader graph is incomplete: ${probeProgram.unresolvedRefs.join(", ")}.`
    );
  }
  const probePayload = {
    version: "aurora-mtr-custom-shader-webgl-probe/v1",
    generatedAt: payload.generatedAt,
    status: "retail-source-compile-probe-not-parity-proof",
    source: {
      materialResref: probeMaterial.resref,
      materialSha256: probeMaterial.sha256,
      materialSource: materialSources.get(probeMaterial.resref),
      toolsetSha256: toolsetHash,
      keyPath
    },
    materialState: {
      customShaderVS: probeMaterial.customShaderVS,
      customShaderFS: probeMaterial.customShaderFS,
      parameters: probeMaterial.parameters,
      customShaderProgram: probeProgram
    },
    parity: {
      retailVisualProof: false,
      purpose: "compile-and-render-capability-gate-only"
    }
  };
  const probeOutputPath = resolveOutputPath(options.probeOut);
  await mkdir(dirname(probeOutputPath), { recursive: true });
  await writeFile(probeOutputPath, `${JSON.stringify(probePayload, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        out: repoRelative(outputPath),
        probeOut: repoRelative(probeOutputPath),
        status: payload.status
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
