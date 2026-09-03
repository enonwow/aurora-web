import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { AuroraAreaCreateCompiler } from "../src/modules/areas/adapters/outbound/blob/aurora-area-create-compiler";
import { AuroraAreaCreateCandidateValidator } from "../src/modules/areas/adapters/outbound/blob/aurora-area-create-candidate-validator";
import { MemoryAtomicModuleSnapshotRepository } from "../src/modules/areas/adapters/outbound/memory/memory-atomic-module-snapshot.repository";
import type { AreaCreateCommand } from "../src/modules/areas/domain/area-create-command.types";
import {
  AUR_S05_05_CREATION_PROFILE_FINGERPRINT,
  getAurS0505CreationProfile,
} from "../src/modules/areas/domain/area-create-profile";
import { createModuleSnapshotManifest } from "../src/modules/areas/domain/module-snapshot-manifest";
import {
  buildNwnErfV10,
  parseNwnErfV10,
  type NwnErfResourceEntry,
} from "../src/modules/runtime-settings/domain/nwn-erf-v10";
import { nwnErfResourceExtension } from "../src/modules/runtime-settings/domain/nwn-erf-resource-types";
import { extractModuleIfoHakList } from "../src/modules/runtime-settings/application/runtime-settings.application.service";

const BACKEND_ROOT = resolve(__dirname, "..");
const MODULES_DIR = resolve(
  process.env.USERPROFILE ?? "",
  "Documents",
  "Neverwinter Nights",
  "modules",
);
const HAK_DIR = resolve(
  process.env.USERPROFILE ?? "",
  "Documents",
  "Neverwinter Nights",
  "hak",
);
const DEFAULT_BASE_MODULE = resolve(MODULES_DIR, "s05e0717.mod");
const DEFAULT_SET_FIXTURE = resolve(
  BACKEND_ROOT,
  "test",
  "fixtures",
  "area-editing",
  "real-tms01.set.gz.base64",
);
const RESOURCE_TYPES = Object.freeze({ are: 2012, ifo: 2014, git: 2023, gic: 2046 });

interface CliOptions {
  readonly baseModulePath: string;
  readonly outputModulePath: string;
  readonly manifestPath: string;
  readonly setFixturePath: string;
  readonly areaResRef: string;
  readonly areaName: string;
  readonly areaTag: string;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  assertSafePaths(options);
  await requireFile(options.baseModulePath, "base module");
  await requireFile(options.setFixturePath, "tms01 SET fixture");

  const generatedAt = new Date().toISOString();
  const baseModuleBytes = await readFile(options.baseModulePath);
  const baseArchive = parseNwnErfV10(baseModuleBytes, options.baseModulePath);
  if (baseArchive.signature !== "MOD ") {
    throw new Error("The Area Create native proof base must be a MOD archive.");
  }
  assertNoCollision(baseArchive.entries, options.areaResRef);
  const moduleIfo = requireResource(baseArchive.entries, "module", RESOURCE_TYPES.ifo);
  const setBytes = await readGzipBase64Fixture(options.setFixturePath);
  const setFingerprintSha256 = sha256(setBytes);

  const moduleId = `proof:${sha256(baseModuleBytes).slice(0, 32)}`;
  const repository = new MemoryAtomicModuleSnapshotRepository({
    assertCurrent: async () => undefined,
  });
  const contentsByLogicalKey: Record<string, Buffer> = Object.create(null) as Record<
    string,
    Buffer
  >;
  const snapshotObjects = baseArchive.entries.map((entry) => {
    const logicalKey = `${entry.resref}.${nwnErfResourceExtension(entry.type)}`;
    contentsByLogicalKey[logicalKey] = Buffer.from(entry.bytes);
    return {
      logicalKey,
      resourceType: entry.type,
      size: entry.bytes.length,
      sha256: sha256(entry.bytes),
    };
  });
  const baselineManifest = createModuleSnapshotManifest({
    moduleId,
    parentRevision: null,
    objects: snapshotObjects,
  });
  const head = await repository.bootstrap(
    baselineManifest,
    contentsByLogicalKey,
    generatedAt,
  );
  const tilesetSource = {
    resolve: async (resRef: string) => {
      if (resRef !== "tms01") {
        throw new Error(`Unexpected proof tileset ResRef: ${resRef}.`);
      }
      return Object.freeze({ resRef, fingerprintSha256: setFingerprintSha256 });
    },
  };
  const profile = getAurS0505CreationProfile();
  const command: AreaCreateCommand = Object.freeze({
    schemaVersion: "area-create-command.v1",
    moduleId,
    expectedModuleRevision: head.revision,
    creationProfile: {
      id: profile.id,
      fingerprintSha256: AUR_S05_05_CREATION_PROFILE_FINGERPRINT,
    },
    area: {
      name: options.areaName,
      resRef: options.areaResRef,
      tag: options.areaTag,
    },
    tileset: { resRef: profile.tilesetResRef, setFingerprintSha256 },
    dimensions: { width: profile.width, height: profile.height },
    initializer: {
      algorithmVersion: profile.initializerAlgorithmVersion,
      seed: profile.initializerSeed,
    },
    tiles: profile.tiles,
    groupInstances: profile.groupInstances,
    draft: {
      id: `native-proof-${options.areaResRef}`,
      revision: 1,
      normalizedSha256: sha256(
        Buffer.from(
          JSON.stringify({
            area: options.areaResRef,
            profile: AUR_S05_05_CREATION_PROFILE_FINGERPRINT,
            set: setFingerprintSha256,
          }),
          "utf8",
        ),
      ),
    },
    clientCommandId: `native-proof-${options.areaResRef}-01`,
  });
  const compiler = new AuroraAreaCreateCompiler(repository, tilesetSource);
  const candidate = await compiler.compile(command, {
    moduleId,
    revision: head.revision,
    quarantined: false,
  }, "native-proof-transaction-01");
  const validator = new AuroraAreaCreateCandidateValidator();
  const validation = await validator.validate(command, candidate);
  if (!validation.valid) {
    throw new Error(
      `The current application compiler emitted an invalid proof candidate: ${validation.issues
        .map((issue) => `${issue.code}:${issue.message}`)
        .join("; ")}`,
    );
  }

  const outputEntries: NwnErfResourceEntry[] = baseArchive.entries.map((entry) =>
    entry.resref === "module" && entry.type === RESOURCE_TYPES.ifo
      ? {
          resref: "module",
          type: RESOURCE_TYPES.ifo,
          bytes: Buffer.from(candidate.moduleIfo.candidateBytes),
        }
      : { ...entry, bytes: Buffer.from(entry.bytes) },
  );
  for (const resource of candidate.resources) {
    outputEntries.push({
      resref: candidate.areaId,
      type: resource.resourceType,
      bytes: Buffer.from(resource.bytes),
    });
  }
  const outputModuleBytes = buildNwnErfV10({
    header: baseArchive.header,
    localizedStrings: baseArchive.localizedStrings,
    entries: outputEntries,
  });
  await mkdir(dirname(options.outputModulePath), { recursive: true });
  await writeFile(options.outputModulePath, outputModuleBytes, { flag: "wx" });

  const readbackBytes = await readFile(options.outputModulePath);
  const readback = parseNwnErfV10(readbackBytes, options.outputModulePath);
  assertExactResource(
    readback.entries,
    "module",
    RESOURCE_TYPES.ifo,
    candidate.moduleIfo.candidateBytes,
  );
  for (const resource of candidate.resources) {
    assertExactResource(
      readback.entries,
      candidate.areaId,
      resource.resourceType,
      resource.bytes,
    );
  }
  const baseModuleAfter = await readFile(options.baseModulePath);
  if (!baseModuleAfter.equals(baseModuleBytes)) {
    throw new Error("The read-only base module changed while building the proof module.");
  }

  const candidateModuleIfo = requireResource(readback.entries, "module", RESOURCE_TYPES.ifo).bytes;
  const orderedHakResrefs = extractModuleIfoHakList(candidateModuleIfo).map((value) =>
    String(value).toLowerCase(),
  );
  const orderedHaks = await Promise.all(
    orderedHakResrefs.map(async (resref) => {
      const path = resolve(HAK_DIR, `${resref}.hak`);
      await requireFile(path, `ordered module HAK ${resref}`);
      return { resref, ...(await fileRecord(path, await readFile(path))) };
    }),
  );
  const manifest = {
    schemaVersion: "aurora-area-create-native-proof-module.v1",
    generatedAt,
    status: "candidate-built-awaiting-live-certification",
    safety: {
      baseModuleReadOnly: true,
      baseModuleBytesUnchanged: true,
      outputCreatedExclusively: true,
      publicAreaCreateGateRemainsClosed: true,
    },
    claimBoundary: {
      exactCurrentApplicationCompilerCandidate: true,
      independentStructuralValidation: "verified",
      toolsetOpenSaveBuild: "missing",
      nwnRuntimeLoad: "missing",
      pathConnect: "not-claimed",
      wokSeam: "not-claimed",
    },
    compiler: {
      source: "backend/src/modules/areas/adapters/outbound/blob/aurora-area-create-compiler.ts",
      profileId: profile.id,
      profileFingerprintSha256: AUR_S05_05_CREATION_PROFILE_FINGERPRINT,
      validatorVersion: validator.version,
    },
    command,
    source: {
      baseModule: await fileRecord(options.baseModulePath, baseModuleBytes),
      tilesetSetFixture: await fileRecord(options.setFixturePath, setBytes),
      tilesetSetFingerprintSha256: setFingerprintSha256,
      orderedHaks,
    },
    candidate: {
      baselineModuleRevision: head.revision,
      resources: candidate.resources.map((resource) => ({
        extension: resource.extension,
        resref: candidate.areaId,
        resourceType: resource.resourceType,
        bytes: resource.size,
        sha256: resource.sha256,
      })),
      moduleIfo: {
        baselineBytes: moduleIfo.bytes.length,
        baselineSha256: candidate.moduleIfo.baselineSha256,
        candidateBytes: candidate.moduleIfo.candidateBytes.length,
        candidateSha256: candidate.moduleIfo.candidateSha256,
      },
    },
    output: {
      module: await fileRecord(options.outputModulePath, readbackBytes),
      entryCount: readback.entries.length,
      exactCandidateReadback: true,
    },
  };
  await mkdir(dirname(options.manifestPath), { recursive: true });
  await writeFile(options.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  process.stdout.write(
    `${JSON.stringify({
      status: manifest.status,
      outputModulePath: options.outputModulePath,
      manifestPath: options.manifestPath,
      areaResRef: options.areaResRef,
      outputSha256: manifest.output.module.sha256,
      resources: manifest.candidate.resources,
      moduleIfo: manifest.candidate.moduleIfo,
    }, null, 2)}\n`,
  );
}

function parseOptions(args: readonly string[]): CliOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith("--") || !value) {
      throw new Error("Arguments must be supplied as --name value pairs.");
    }
    values.set(key.slice(2), value);
  }
  const stamp = new Date().toISOString().replace(/[:.]/gu, "-");
  const outputModulePath = resolve(
    values.get("output") ?? resolve(MODULES_DIR, `aw_area_create_proof_${stamp}.mod`),
  );
  return {
    baseModulePath: resolve(values.get("base") ?? DEFAULT_BASE_MODULE),
    outputModulePath,
    manifestPath: resolve(
      values.get("manifest") ??
        resolve(
          BACKEND_ROOT,
          "docs",
          "aurora-reverse",
          "evidence",
          "area-create-native-proof-2026-08-07",
          `${basename(outputModulePath, ".mod")}.candidate.json`,
        ),
    ),
    setFixturePath: resolve(values.get("set-fixture") ?? DEFAULT_SET_FIXTURE),
    areaResRef: values.get("area-resref") ?? "awcr_s0505_01",
    areaName: values.get("area-name") ?? "Aurora Web Create Proof 01",
    areaTag: values.get("area-tag") ?? "AWCR_S0505_01",
  };
}

function assertSafePaths(options: CliOptions): void {
  if (dirname(options.outputModulePath).toLowerCase() !== MODULES_DIR.toLowerCase()) {
    throw new Error(`Proof module output must stay directly in ${MODULES_DIR}.`);
  }
  if (!basename(options.outputModulePath).toLowerCase().startsWith("aw_area_create_proof_")) {
    throw new Error("Proof module filename must start with aw_area_create_proof_.");
  }
  if (options.outputModulePath.toLowerCase() === options.baseModulePath.toLowerCase()) {
    throw new Error("Proof output must not overwrite the base module.");
  }
  if (existsSync(options.outputModulePath) || existsSync(options.manifestPath)) {
    throw new Error("Proof output or manifest already exists; choose a fresh identity.");
  }
  if (!/^[a-z0-9_]{1,16}$/u.test(options.areaResRef)) {
    throw new Error("Area proof ResRef must be lowercase NWN-safe and at most 16 characters.");
  }
  if (options.areaName.trim().length === 0 || options.areaTag.trim().length === 0) {
    throw new Error("Area proof Name and Tag must be non-blank.");
  }
}

function assertNoCollision(entries: readonly NwnErfResourceEntry[], resref: string): void {
  const areaResourceTypes: readonly number[] = [
    RESOURCE_TYPES.are,
    RESOURCE_TYPES.git,
    RESOURCE_TYPES.gic,
  ];
  const collisions = entries.filter(
    (entry) =>
      entry.resref === resref &&
      areaResourceTypes.includes(entry.type),
  );
  if (collisions.length > 0) {
    throw new Error(`Base module already contains Area proof resources for ${resref}.`);
  }
}

function requireResource(
  entries: readonly NwnErfResourceEntry[],
  resref: string,
  type: number,
): NwnErfResourceEntry {
  const entry = entries.find((candidate) => candidate.resref === resref && candidate.type === type);
  if (!entry) throw new Error(`Required ERF resource is missing: ${resref}:${type}.`);
  return entry;
}

function assertExactResource(
  entries: readonly NwnErfResourceEntry[],
  resref: string,
  type: number,
  expected: Uint8Array,
): void {
  const actual = requireResource(entries, resref, type).bytes;
  if (!actual.equals(Buffer.from(expected))) {
    throw new Error(`Packed proof resource failed exact readback: ${resref}:${type}.`);
  }
}

async function readGzipBase64Fixture(path: string): Promise<Buffer> {
  const encoded = (await readFile(path, "utf8")).replace(/\s+/gu, "");
  return gunzipSync(Buffer.from(encoded, "base64"));
}

async function requireFile(path: string, label: string): Promise<void> {
  const details = await stat(path).catch(() => null);
  if (!details?.isFile() || details.size === 0) {
    throw new Error(`Required ${label} is missing or empty: ${path}.`);
  }
}

async function fileRecord(path: string, bytes: Uint8Array) {
  const details = await stat(path);
  return Object.freeze({
    path,
    bytes: details.size,
    sha256: sha256(bytes),
    lastModified: details.mtime.toISOString(),
  });
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
