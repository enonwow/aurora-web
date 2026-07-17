import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, unlink, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { dirname, relative, resolve, sep } from "node:path";
import {
  AreaEditingApplicationService,
  __areaEditingApplicationServiceInternals,
  type AreaEditingPersistenceEnvelope
} from "../src/modules/areas/application/area-editing.application.service";
import { AreasApplicationService } from "../src/modules/areas/application/areas.application.service";
import { ModuleSnapshotAreaRepository } from "../src/modules/areas/adapters/outbound/blob/module-snapshot-area.repository";
import { moduleIfoContainsArea, patchModuleIfoAreaList } from "../src/modules/areas/adapters/outbound/blob/aurora-gff-module-ifo-area-writer";
import type { AreaEditingExportDraftRequest } from "../src/modules/areas/adapters/inbound/http/area-editing.schemas";
import type { AreaProcessingCachePort } from "../src/modules/areas/application/ports/area-processing-cache.port";
import type { AreaProcessingResult } from "../src/modules/areas/domain/area.types";
import type { ModuleBlobStoragePort, ModuleBlobObjectPayload, ModuleBlobObjectSummary } from "../src/modules/runtime-settings/application/ports/module-blob-storage.port";
import type { PackedModuleFile } from "../src/modules/runtime-settings/application/ports/packed-module-extractor.port";
import type { RuntimeSettingsRepositoryPort } from "../src/modules/runtime-settings/application/ports/runtime-settings-repository.port";
import type { RuntimeSettingsApplicationService } from "../src/modules/runtime-settings/application/runtime-settings.application.service";
import type { BlobStorageSettings } from "../src/modules/runtime-settings/domain/runtime-settings.types";

const BACKEND_ROOT = resolve(__dirname, "..");
export const DEFAULT_REAL_MODULE_IFO_FIXTURE = resolve(
  BACKEND_ROOT,
  "test/fixtures/area-editing/real-last-city-module.ifo.gz.base64"
);
export const DEFAULT_REAL_SET_FIXTURE = resolve(
  BACKEND_ROOT,
  "test/fixtures/area-editing/real-tms01.set.gz.base64"
);
export const PROOF_AREA_RESREF = "codex_reopen";
const MODULE_PREFIX = "snapshot";

export interface AreaNewPersistenceColdReopenProofOptions {
  sandboxRoot: string;
  artifactPath?: string;
  moduleIfoFixturePath?: string;
  tilesetFixturePath?: string;
}

export interface AreaNewPersistenceColdReopenProofArtifact {
  version: "aurora-area-new-persistence-cold-reopen-proof/v1";
  capturedAt: string;
  status: "captured";
  proofBoundary: {
    persistence: "AreaEditingApplicationService.persistNewArea";
    reopen: "new ModuleSnapshotAreaRepository and application service instances";
    toolsetReopen: false;
    runtimeRender: "not-run-no-durable-model-pack";
  };
  safety: {
    sandboxRoot: string;
    isolatedFilesystemStore: true;
    userModuleSnapshotMutated: false;
    decompilationOracleMutated: false;
  };
  sourceFixtures: {
    moduleIfo: ProofFileRecord;
    tilesetSet: ProofFileRecord;
  };
  persistence: {
    result: AreaEditingPersistenceEnvelope;
    moduleIfoSemanticAreaPresent: true;
    files: Record<"module.ifo" | "codex_reopen.are" | "codex_reopen.git" | "codex_reopen.gic", ProofReadbackRecord>;
  };
  coldReopen: {
    newRepositoryInstance: true;
    newAreasServiceInstance: true;
    newAreaEditingServiceInstance: true;
    area: {
      areaId: string;
      name: string;
      width: number;
      height: number;
      tilesetResRef: string;
      tileCount: number;
      objectCount: number;
    };
    editingSource: {
      areaFingerprint: string;
      tilesetFingerprint: string;
      tilesetTileCount: number;
      reopenedModelResRef: string | null;
    };
  };
}

interface ProofFileRecord {
  encodedFixturePath: string;
  bytes: number;
  sha256: string;
}

interface ProofReadbackRecord {
  key: string;
  bytes: number;
  expectedSha256: string;
  persistedSha256: string;
  exactBytes: true;
}

export async function runAreaNewPersistenceColdReopenProof(
  options: AreaNewPersistenceColdReopenProofOptions
): Promise<AreaNewPersistenceColdReopenProofArtifact> {
  const sandboxRoot = resolve(options.sandboxRoot);
  const moduleIfoFixturePath = resolve(options.moduleIfoFixturePath ?? DEFAULT_REAL_MODULE_IFO_FIXTURE);
  const tilesetFixturePath = resolve(options.tilesetFixturePath ?? DEFAULT_REAL_SET_FIXTURE);
  await mkdir(sandboxRoot, { recursive: true });

  const originalModuleIfo = await readGzipBase64Fixture(moduleIfoFixturePath);
  const realSet = await readGzipBase64Fixture(tilesetFixturePath);
  const store = new IsolatedFilesystemModuleBlobStore(sandboxRoot, MODULE_PREFIX);
  await store.seed("module.ifo", originalModuleIfo);
  await store.seed("__aurora/sources/vanilla/tilesets/tms01.set", realSet);

  const runtimeSettingsRepository = createRuntimeSettingsRepository();
  const warmService = new AreaEditingApplicationService(
    {} as AreasApplicationService,
    store,
    runtimeSettingsRepository
  );
  const tileset = await warmService.getTilesetDefinition("tms01");
  const draft = createProofDraft(tileset.fingerprint);
  const expectedAre = (await warmService.exportAre(draft)).bytes;
  const expectedGit = __areaEditingApplicationServiceInternals.serializeEmptyAreaGit();
  const expectedGic = __areaEditingApplicationServiceInternals.serializeEmptyAreaGic();
  const expectedModuleIfo = patchModuleIfoAreaList(originalModuleIfo, PROOF_AREA_RESREF).bytes;

  const result = await warmService.persistNewArea(draft);
  const persistedModuleIfo = await requireStoredBytes(store, `${MODULE_PREFIX}/module.ifo`);
  if (!moduleIfoContainsArea(persistedModuleIfo, PROOF_AREA_RESREF)) {
    throw new Error(`Persisted module.ifo does not contain ${PROOF_AREA_RESREF}.`);
  }

  const expectedFiles = {
    "module.ifo": { key: `${MODULE_PREFIX}/module.ifo`, bytes: expectedModuleIfo },
    "codex_reopen.are": { key: `${MODULE_PREFIX}/${PROOF_AREA_RESREF}.are`, bytes: expectedAre },
    "codex_reopen.git": { key: `${MODULE_PREFIX}/${PROOF_AREA_RESREF}.git`, bytes: expectedGit },
    "codex_reopen.gic": { key: `${MODULE_PREFIX}/${PROOF_AREA_RESREF}.gic`, bytes: expectedGic }
  } as const;
  const readbacks = {} as AreaNewPersistenceColdReopenProofArtifact["persistence"]["files"];
  for (const [fileName, expected] of Object.entries(expectedFiles) as Array<
    [keyof typeof expectedFiles, (typeof expectedFiles)[keyof typeof expectedFiles]]
  >) {
    const persisted = await requireStoredBytes(store, expected.key);
    if (!persisted.equals(expected.bytes)) {
      throw new Error(`${fileName} failed independent exact-byte read-back verification.`);
    }
    readbacks[fileName] = {
      key: expected.key,
      bytes: persisted.length,
      expectedSha256: sha256(expected.bytes),
      persistedSha256: sha256(persisted),
      exactBytes: true
    };
  }

  const coldRepository = new ModuleSnapshotAreaRepository(
    runtimeSettingsRepository,
    store,
    createNoSyncRuntimeSettingsService()
  );
  const coldAreasService = new AreasApplicationService(
    coldRepository,
    createNoopAreaProcessingCache()
  );
  const coldEditingService = new AreaEditingApplicationService(
    coldAreasService,
    store,
    runtimeSettingsRepository
  );
  const reopened = await coldAreasService.getArea(`area_${PROOF_AREA_RESREF}`);
  const reopenedEditingSource = await coldEditingService.getAreaEditingSource(
    `area_${PROOF_AREA_RESREF}`
  );
  const reopenedTiles = reopened.tiles ?? [];
  const reopenedModelResRef = reopenedTiles.find((tile) => tile.tileId === 12)?.modelResRef ?? null;

  if (
    reopened.width !== draft.width ||
    reopened.height !== draft.height ||
    reopened.tileSet?.toLowerCase() !== draft.tilesetResRef ||
    reopenedTiles.length !== draft.tiles.length ||
    reopenedEditingSource.areaFingerprint !== sha256(expectedAre) ||
    reopenedEditingSource.tileset.fingerprint !== tileset.fingerprint ||
    reopenedModelResRef !== "tms01_c01_01"
  ) {
    throw new Error("Cold repository reopen did not reconstruct the persisted Area and real SET contract exactly.");
  }

  const artifact: AreaNewPersistenceColdReopenProofArtifact = {
    version: "aurora-area-new-persistence-cold-reopen-proof/v1",
    capturedAt: new Date().toISOString(),
    status: "captured",
    proofBoundary: {
      persistence: "AreaEditingApplicationService.persistNewArea",
      reopen: "new ModuleSnapshotAreaRepository and application service instances",
      toolsetReopen: false,
      runtimeRender: "not-run-no-durable-model-pack"
    },
    safety: {
      sandboxRoot,
      isolatedFilesystemStore: true,
      userModuleSnapshotMutated: false,
      decompilationOracleMutated: false
    },
    sourceFixtures: {
      moduleIfo: {
        encodedFixturePath: moduleIfoFixturePath,
        bytes: originalModuleIfo.length,
        sha256: sha256(originalModuleIfo)
      },
      tilesetSet: {
        encodedFixturePath: tilesetFixturePath,
        bytes: realSet.length,
        sha256: sha256(realSet)
      }
    },
    persistence: {
      result,
      moduleIfoSemanticAreaPresent: true,
      files: readbacks
    },
    coldReopen: {
      newRepositoryInstance: true,
      newAreasServiceInstance: true,
      newAreaEditingServiceInstance: true,
      area: {
        areaId: reopened.areaId,
        name: reopened.name,
        width: reopened.width,
        height: reopened.height,
        tilesetResRef: reopened.tileSet ?? "",
        tileCount: reopenedTiles.length,
        objectCount: reopened.objects.length
      },
      editingSource: {
        areaFingerprint: reopenedEditingSource.areaFingerprint,
        tilesetFingerprint: reopenedEditingSource.tileset.fingerprint,
        tilesetTileCount: reopenedEditingSource.tileset.tiles.length,
        reopenedModelResRef
      }
    }
  };
  if (options.artifactPath) {
    const artifactPath = resolve(options.artifactPath);
    await mkdir(dirname(artifactPath), { recursive: true });
    await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  }
  return artifact;
}

class IsolatedFilesystemModuleBlobStore implements ModuleBlobStoragePort {
  constructor(private readonly root: string, private readonly prefix: string) {}

  async seed(fileName: string, bytes: Buffer): Promise<void> {
    const path = this.filePath(`${this.prefix}/${fileName}`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes);
  }

  async replaceModuleSnapshot(): Promise<never> {
    throw new Error("The isolated proof store forbids replacing an external module snapshot.");
  }

  async listModuleSnapshot(_settings: BlobStorageSettings): Promise<{
    bucket: string;
    prefix: string;
    totalFiles: number;
    totalBytes: number;
    objects: ModuleBlobObjectSummary[];
    truncated: false;
  }> {
    const objects = await this.listFiles(this.filePath(this.prefix));
    return {
      bucket: "isolated-proof",
      prefix: this.prefix,
      totalFiles: objects.length,
      totalBytes: objects.reduce((sum, object) => sum + object.size, 0),
      objects,
      truncated: false
    };
  }

  async getModuleObject(
    _settings: BlobStorageSettings,
    key: string
  ): Promise<ModuleBlobObjectPayload | null> {
    const path = this.filePath(key);
    try {
      const bytes = await readFile(path);
      const metadata = await stat(path);
      return {
        key: normalizeKey(key),
        size: bytes.length,
        contentType: "application/octet-stream",
        etag: sha256(bytes),
        lastModified: metadata.mtime.toISOString(),
        bytes
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async putModuleObject(
    _settings: BlobStorageSettings,
    file: PackedModuleFile
  ): Promise<ModuleBlobObjectSummary> {
    const key = `${this.prefix}/${normalizeKey(file.fileName)}`;
    const path = this.filePath(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, file.bytes);
    return { key, size: file.bytes.length, etag: sha256(file.bytes) };
  }

  async deleteModuleObject(_settings: BlobStorageSettings, key: string): Promise<boolean> {
    try {
      await unlink(this.filePath(key));
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw error;
    }
  }

  private filePath(key: string): string {
    const normalized = normalizeKey(key);
    const candidate = resolve(this.root, ...normalized.split("/"));
    const relativePath = relative(this.root, candidate);
    if (relativePath.startsWith(`..${sep}`) || relativePath === "..") {
      throw new Error(`Unsafe isolated store key: ${key}`);
    }
    return candidate;
  }

  private async listFiles(directory: string): Promise<ModuleBlobObjectSummary[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const objects: ModuleBlobObjectSummary[] = [];
    for (const entry of entries) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        objects.push(...await this.listFiles(path));
      } else if (entry.isFile()) {
        const bytes = await readFile(path);
        const metadata = await stat(path);
        objects.push({
          key: relative(this.root, path).split(sep).join("/"),
          size: bytes.length,
          lastModified: metadata.mtime.toISOString(),
          etag: sha256(bytes)
        });
      }
    }
    return objects.sort((left, right) => left.key.localeCompare(right.key));
  }
}

function createProofDraft(tilesetFingerprint: string): AreaEditingExportDraftRequest {
  return {
    areaResRef: PROOF_AREA_RESREF,
    name: "Codex sandbox cold reopen",
    width: 2,
    height: 2,
    tilesetResRef: "tms01",
    tilesetFingerprint,
    tiles: [
      { row: 0, col: 0, tileId: 12, orientation: 0, height: 0 },
      { row: 0, col: 1, tileId: 12, orientation: 0, height: 0 },
      { row: 1, col: 0, tileId: 12, orientation: 0, height: 0 },
      { row: 1, col: 1, tileId: 12, orientation: 0, height: 0 }
    ]
  };
}

function createRuntimeSettingsRepository(): RuntimeSettingsRepositoryPort {
  return {
    get: async () => ({ blobStorage: { modulePrefix: MODULE_PREFIX } })
  } as RuntimeSettingsRepositoryPort;
}

function createNoSyncRuntimeSettingsService(): RuntimeSettingsApplicationService {
  return {
    syncModuleAreaSourceFiles: async () => {
      throw new Error("Cold reopen unexpectedly attempted to sync an external module source.");
    },
    syncVanillaTilesetSetSources: async () => {
      throw new Error("Cold reopen unexpectedly attempted to sync external vanilla SET sources.");
    }
  } as unknown as RuntimeSettingsApplicationService;
}

function createNoopAreaProcessingCache(): AreaProcessingCachePort {
  return {
    get: async () => null,
    set: async (key: string, value: AreaProcessingResult) => ({
      key,
      value,
      storedAt: new Date().toISOString(),
      hits: 0
    })
  };
}

async function readGzipBase64Fixture(path: string): Promise<Buffer> {
  const encoded = (await readFile(path, "utf8")).replace(/\s/gu, "");
  return gunzipSync(Buffer.from(encoded, "base64"));
}

async function requireStoredBytes(store: ModuleBlobStoragePort, key: string): Promise<Buffer> {
  const payload = await store.getModuleObject({ modulePrefix: MODULE_PREFIX } as BlobStorageSettings, key);
  if (!payload) throw new Error(`Expected persisted proof object ${key}.`);
  return payload.bytes;
}

function normalizeKey(value: string): string {
  const normalized = value.replace(/\\/gu, "/").replace(/^\/+|\/+$/gu, "");
  if (!normalized || normalized.split("/").some((part) => part === ".." || part === ".")) {
    throw new Error(`Unsafe isolated store key: ${value}`);
  }
  return normalized;
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function main(): Promise<void> {
  const proofRoot = resolve(
    BACKEND_ROOT,
    "../.codex-tmp/aurora-area-tile-milestone-20260712/persistence-cold-reopen"
  );
  await mkdir(proofRoot, { recursive: true });
  const sandboxRoot = await mkdtemp(resolve(proofRoot, `sandbox-${randomUUID()}-`));
  const artifactPath = resolve(proofRoot, "new-area-persistence-cold-reopen.summary.json");
  const artifact = await runAreaNewPersistenceColdReopenProof({ sandboxRoot, artifactPath });
  process.stdout.write(`${JSON.stringify({ status: artifact.status, artifactPath, sandboxRoot }, null, 2)}\n`);
}

if (require.main === module) {
  main().catch(async (error) => {
    const failureRoot = resolve(
      BACKEND_ROOT,
      "../.codex-tmp/aurora-area-tile-milestone-20260712/persistence-cold-reopen"
    );
    await mkdir(failureRoot, { recursive: true });
    const failurePath = resolve(failureRoot, "new-area-persistence-cold-reopen.failure.json");
    await writeFile(failurePath, `${JSON.stringify({
      version: "aurora-area-new-persistence-cold-reopen-proof/v1",
      capturedAt: new Date().toISOString(),
      status: "failed",
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error)
    }, null, 2)}\n`, "utf8");
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
