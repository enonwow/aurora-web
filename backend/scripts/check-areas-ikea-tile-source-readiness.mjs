#!/usr/bin/env node
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
require("ts-node/register/transpile-only");

process.env.NODE_ENV = process.env.NODE_ENV === "test" ? "development" : process.env.NODE_ENV ?? "development";
process.env.AUTH_REPOSITORY_DRIVER = process.env.AUTH_REPOSITORY_DRIVER ?? "memory";
process.env.RUNTIME_SETTINGS_BOOTSTRAP_SYNC = process.env.RUNTIME_SETTINGS_BOOTSTRAP_SYNC ?? "false";

const { Test } = require("@nestjs/testing");
const { AppConfigModule } = require("../src/common/config/app-config.module");
const { RuntimeSettingsModule } = require("../src/modules/runtime-settings/runtime-settings.module");
const { AreasModule } = require("../src/modules/areas/areas.module");
const { TilesModule } = require("../src/modules/tiles/tiles.module");
const {
  RUNTIME_SETTINGS_REPOSITORY
} = require("../src/modules/runtime-settings/application/ports/runtime-settings-repository.port");
const {
  MODULE_BLOB_STORAGE
} = require("../src/modules/runtime-settings/application/ports/module-blob-storage.port");
const {
  RuntimeSettingsApplicationService
} = require("../src/modules/runtime-settings/application/runtime-settings.application.service");
const {
  AreasApplicationService
} = require("../src/modules/areas/application/areas.application.service");
const {
  AREA_REPOSITORY
} = require("../src/modules/areas/application/ports/area-repository.port");
const {
  TilesApplicationService,
  __tilesApplicationServiceInternals
} = require("../src/modules/tiles/application/tiles.application.service");
const {
  TILE_REPOSITORY
} = require("../src/modules/tiles/application/ports/tile-repository.port");
const {
  MemoryTileProcessingCacheRepository
} = require("../src/modules/tiles/adapters/outbound/memory/memory-tile-processing-cache.repository");
const {
  parseAreaMetadataFromAreGff,
  parseAreaObjectsFromGitGff
} = require("../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser");
const {
  __moduleSnapshotAreaRepositoryInternals
} = require("../src/modules/areas/adapters/outbound/blob/module-snapshot-area.repository");
const {
  NwnErfPackedModuleExtractorService,
  readNwnErfResource
} = require("../src/modules/runtime-settings/adapters/outbound/nwn/nwn-erf-packed-module-extractor.service");
const {
  NwnKeyBifResourceReader,
  NWN_KEY_BIF_RESOURCE_TYPES
} = require("../src/modules/runtime-settings/application/nwn-key-bif-resource-reader");
const {
  parseAuroraTwoDaTable
} = require("../src/common/aurora/two-da/aurora-two-da-table");
const {
  parseAuroraMdlVfxSource
} = require("../src/modules/vfx/domain/aurora-mdl-vfx-source.parser");
const {
  convertAuroraMdlToGlb
} = require("../src/modules/runtime-settings/adapters/outbound/derived/aurora-mdl-ascii-to-glb.converter");
const {
  buildTileProcessCacheKey
} = require("../src/modules/tiles/domain/tile-processing.builders");

const scriptDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(scriptDir, "..");

const VERSION = "aurora-areas-ikea-tile-source-readiness/v1";
const TARGET_AREA_ID = "area__ikea";
const TARGET_AREA_QUERY = "_ikea";
const DEFAULT_CONCURRENCY = 4;
const DEFAULT_SAMPLE_LIMIT = 12;
const DEFAULT_ENTRY_LIMIT = 64;
const TEXTURE_INDEX_FILE_NAME = "__aurora/meta/texture-index.v1.json";
const SOURCE_DIRECT_TEXTURE_RESOURCE_TYPES = [
  { extension: "dds", resourceType: NWN_KEY_BIF_RESOURCE_TYPES.DDS },
  { extension: "tga", resourceType: NWN_KEY_BIF_RESOURCE_TYPES.TGA },
  { extension: "txi", resourceType: NWN_KEY_BIF_RESOURCE_TYPES.TXI },
  { extension: "mtr", resourceType: NWN_KEY_BIF_RESOURCE_TYPES.MTR },
  { extension: "bmp", resourceType: NWN_KEY_BIF_RESOURCE_TYPES.BMP },
  { extension: "plt", resourceType: NWN_KEY_BIF_RESOURCE_TYPES.PLT }
];

class AuditBlockerError extends Error {
  constructor(message, details) {
    super(message);
    this.name = "AuditBlockerError";
    this.code = message;
    this.details = details;
  }
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  console.log(
    `
Usage:
  node scripts/check-areas-ikea-tile-source-readiness.mjs [--blobEndpoint <url>] [--localBlobMirror <path>] [--writeLocalBlobMirror] [--no-bypass-cache] [--include-entries] [--concurrency <n>]

Audits backend source/render asset readiness for tile models used by _IKEA.
No visual parity is promoted; this only reports backend contracts and exact blockers.
`.trim()
  );
  process.exit(0);
}

let app = null;
try {
  app = await Test.createTestingModule({
    imports: [AppConfigModule, RuntimeSettingsModule, TilesModule, AreasModule]
  }).compile();
  await app.init();

  const runtimeSettingsAudit = await configureAuditBlobEndpoint(app, options);
  if (runtimeSettingsAudit.storageSource === "source_direct_files") {
    const repository = app.get(RUNTIME_SETTINGS_REPOSITORY);
    const settings = await repository.get();
    const audit = await auditIkeaSourceDirectFiles(settings, {
      ...options,
      runtimeSettingsAudit
    });
    console.log(JSON.stringify(audit, null, 2));
    process.exitCode = audit.auditCompleted ? 0 : 1;
  } else {
  const areas = app.get(AreasApplicationService);
  const tiles = app.get(TilesApplicationService);
  const area = await resolveIkeaArea(areas);
  const audit = await auditIkeaTileSourceReadiness(area, tiles, {
    ...options,
    runtimeSettingsAudit
  });
  console.log(JSON.stringify(audit, null, 2));
  process.exitCode = audit.auditCompleted ? 0 : 1;
  }
} catch (error) {
  const blocker = classifyFatalBlocker(error);
  console.error(
    JSON.stringify(
      buildFatalAudit(error, {
        blocker: blocker.code,
        blockerDetails: blocker.details
      }),
      null,
      2
    )
  );
  process.exitCode = 1;
} finally {
  if (app) {
    await app.close();
  }
}

async function configureAuditBlobEndpoint(app, auditOptions) {
  const repository = app.get(RUNTIME_SETTINGS_REPOSITORY);
  const moduleBlobStorage = app.get(MODULE_BLOB_STORAGE);
  const originalGet = repository.get.bind(repository);
  const settings = await originalGet();
  const runtimeEndpoint = settings.blobStorage.endpoint;
  const override = resolveAuditBlobEndpoint(runtimeEndpoint, auditOptions);

  if (!override) {
    return {
      runtimeEndpoint,
      effectiveEndpoint: runtimeEndpoint,
      overrideApplied: false,
      overrideSource: null,
      storageSource: "module_blob_storage",
      hostProbe: null,
      localBlobMirror: null
    };
  }

  const hostProbe = await probeBlobEndpoint(override.endpoint);
  if (!hostProbe.available) {
    const localMirror = await resolveLocalBlobMirror(settings, auditOptions);
    if (localMirror.available && !auditOptions.writeLocalBlobMirror) {
      patchApplicationWithLocalBlobMirror(app, moduleBlobStorage, localMirror);
      return {
        runtimeEndpoint,
        effectiveEndpoint: override.endpoint,
        overrideApplied: false,
        overrideSource: override.source,
        storageSource: "local_blob_mirror",
        hostProbe,
        localBlobMirror: summarizeLocalMirror(localMirror)
      };
    }

    const localMirrorUnavailable = localMirror.available
      ? null
      : {
          blocker: "local_blob_mirror_unavailable",
          checkedPaths: localMirror.checkedPaths,
          checkedPathCount: localMirror.checkedPaths.length,
          localSourceEvidence: localMirror.localSourceEvidence,
          requiredMirrorShape: [
            "object root containing modules/current/_ikea.are or modules/current/_ikea.git",
            "object root containing modules/current/__aurora/... sources used by ModuleSnapshot repositories",
            "optional module snapshot manifest __aurora/meta/module-snapshots/<base64(modulePrefix)>.json"
          ]
        };

    return {
      runtimeEndpoint,
      effectiveEndpoint: override.endpoint,
      overrideApplied: false,
      overrideSource: override.source,
      storageSource: "source_direct_files",
      hostProbe,
      localBlobMirror: localMirror.available ? summarizeLocalMirror(localMirror) : null,
      localBlobMirrorBeforeWrite: localMirror.available ? summarizeLocalMirror(localMirror) : null,
      localBlobMirrorUnavailable: localMirrorUnavailable,
      writeLocalBlobMirrorRequested: auditOptions.writeLocalBlobMirror
    };
  }

  repository.get = async () => {
    const next = await originalGet();
    return {
      ...next,
      blobStorage: {
        ...next.blobStorage,
        endpoint: override.endpoint
      }
    };
  };

  return {
    runtimeEndpoint,
    effectiveEndpoint: override.endpoint,
    overrideApplied: true,
    overrideSource: override.source,
    storageSource: "module_blob_storage_endpoint_override",
    hostProbe,
    localBlobMirror: null
  };
}

function resolveAuditBlobEndpoint(runtimeEndpoint, auditOptions) {
  if (auditOptions.blobEndpoint) {
    return {
      endpoint: normalizeBlobEndpoint(auditOptions.blobEndpoint),
      source: auditOptions.blobEndpointSource
    };
  }

  if (isComposeSeaweedfsEndpoint(runtimeEndpoint)) {
    return {
      endpoint: "http://127.0.0.1:8333",
      source: "compose_dns_host_default"
    };
  }

  return null;
}

function normalizeBlobEndpoint(value) {
  const endpoint = String(value ?? "").trim().replace(/\/+$/u, "");
  try {
    const parsed = new URL(endpoint);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }
    return endpoint;
  } catch (error) {
    throw new AuditBlockerError("audit_blob_endpoint_invalid", {
      endpoint,
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}

function isComposeSeaweedfsEndpoint(endpoint) {
  try {
    return new URL(endpoint).hostname.toLowerCase() === "seaweedfs";
  } catch {
    return String(endpoint ?? "").toLowerCase().includes("seaweedfs");
  }
}

async function probeBlobEndpoint(endpoint) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(endpoint, {
      method: "HEAD",
      signal: controller.signal
    });
    return {
      available: true,
      endpoint,
      status: response.status,
      statusText: response.statusText,
      cause: null
    };
  } catch (error) {
    return {
      available: false,
      endpoint,
      status: null,
      statusText: null,
      cause: formatNetworkCause(error)
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveLocalBlobMirror(settings, auditOptions) {
  const candidates = buildLocalBlobMirrorCandidates(settings, auditOptions);
  const checkedPaths = [];
  for (const candidate of candidates) {
    const inspected = await inspectLocalBlobMirrorCandidate(candidate, settings.blobStorage);
    checkedPaths.push(inspected.report);
    if (inspected.available) {
      return {
        available: true,
        candidate,
        objectRoot: inspected.objectRoot,
        prefix: inspected.prefix,
        objectCount: inspected.objectCount,
        sampleObjectKeys: inspected.sampleObjectKeys,
        checkedPaths,
        localSourceEvidence: await collectLocalSourceEvidence(settings)
      };
    }
  }

  return {
    available: false,
    checkedPaths,
    localSourceEvidence: await collectLocalSourceEvidence(settings)
  };
}

function buildLocalBlobMirrorCandidates(settings, auditOptions) {
  const candidates = [];
  const add = (pathValue, source) => {
    const normalized = normalizeLocalPath(pathValue);
    if (!normalized) {
      return;
    }
    candidates.push({
      path: normalized,
      source
    });
  };

  add(auditOptions.localBlobMirror, auditOptions.localBlobMirrorSource);
  add(resolve(backendRoot, ".module-blob-mirror"), "backend_default_local_blob_mirror");
  add(resolve(backendRoot, "..", ".codex-tmp", "module-blob-mirror"), "repo_tmp_local_blob_mirror");
  add(resolve(backendRoot, "..", ".codex-tmp", "aurora-module-assets"), "repo_tmp_bucket_mirror");
  add(resolve(backendRoot, "..", ".codex-tmp", "seaweedfs_data"), "repo_tmp_seaweedfs_volume_probe");
  add(
    resolve(backendRoot, "docs", "aurora-reverse", "artifacts", "areas-generation-v23"),
    "repo_area_generation_artifacts_probe"
  );

  add(mapRuntimeHostPath(settings.paths?.moduleDecompiledPath), "runtime_module_decompiled_path");
  add(mapRuntimeHostPath(settings.paths?.modulePackedPath), "runtime_module_packed_path");
  add(mapRuntimeHostPath(settings.paths?.hakDirectoryPath), "runtime_hak_directory_path");
  add(mapRuntimeHostPath(settings.paths?.vanillaDataPath), "runtime_vanilla_data_path");
  add(
    join("C:", "Users", "enonw", "Documents", "Neverwinter Nights", "modules"),
    "host_nwn_modules_directory_probe"
  );

  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = candidate.path.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function inspectLocalBlobMirrorCandidate(candidate, blobSettings) {
  const rootStat = await statSafe(candidate.path);
  const report = {
    path: candidate.path,
    source: candidate.source,
    exists: Boolean(rootStat),
    kind: rootStat ? resolveStatKind(rootStat) : "missing",
    mirror: false,
    reason: "path_missing",
    objectRoot: null,
    prefix: normalizePrefix(blobSettings.modulePrefix),
    objectCount: 0,
    sampleObjectKeys: []
  };

  if (!rootStat) {
    return {
      available: false,
      report
    };
  }
  if (!rootStat.isDirectory()) {
    report.reason = "not_a_directory_object_key_mirror";
    return {
      available: false,
      report
    };
  }

  const objectRoots = [
    { path: candidate.path, shape: "direct_object_root" },
    { path: join(candidate.path, blobSettings.bucket), shape: "bucket_subdirectory" },
    { path: join(candidate.path, "buckets", blobSettings.bucket), shape: "buckets_subdirectory" }
  ];
  for (const objectRoot of objectRoots) {
    const prefix = normalizePrefix(blobSettings.modulePrefix);
    const prefixPath = join(objectRoot.path, ...prefix.split("/").filter(Boolean));
    const prefixStat = await statSafe(prefixPath);
    if (!prefixStat?.isDirectory()) {
      continue;
    }

    const files = await listFilesUnder(prefixPath, 5000);
    const objectKeys = files.map((file) => `${prefix}${toObjectKey(relative(prefixPath, file.path))}`);
    const sampleObjectKeys = objectKeys.slice(0, DEFAULT_SAMPLE_LIMIT);
    const hasIkeaAreaObject = objectKeys.some(
      (key) => key.toLowerCase() === `${prefix}_ikea.are` || key.toLowerCase() === `${prefix}_ikea.git`
    );
    const hasAuroraSourceObjects = objectKeys.some((key) =>
      key.toLowerCase().startsWith(`${prefix}__aurora/`)
    );
    const hasSnapshotManifest = await fileExists(
      join(objectRoot.path, buildManifestKeyForPrefix(prefix))
    );

    report.reason = "object_prefix_checked";
    report.objectRoot = objectRoot.path;
    report.objectRootShape = objectRoot.shape;
    report.objectCount = objectKeys.length;
    report.sampleObjectKeys = sampleObjectKeys;

    if (objectKeys.length > 0 && (hasIkeaAreaObject || hasAuroraSourceObjects || hasSnapshotManifest)) {
      report.mirror = true;
      report.reason = "object_key_mirror_available";
      return {
        available: true,
        objectRoot: objectRoot.path,
        prefix,
        objectCount: objectKeys.length,
        sampleObjectKeys,
        report
      };
    }
  }

  if (report.reason === "path_missing") {
    report.reason = "missing_modules_current_object_prefix";
  }
  return {
    available: false,
    report
  };
}

function patchModuleBlobStorageWithLocalMirror(moduleBlobStorage, mirror) {
  const localAccess = createLocalBlobMirrorAccess(mirror);
  moduleBlobStorage.listModuleSnapshot = localAccess.listModuleSnapshot;
  moduleBlobStorage.getModuleObject = localAccess.getModuleObject;
  if (typeof moduleBlobStorage.putModuleObject === "function") {
    moduleBlobStorage.putModuleObject = async () => {
      throw new AuditBlockerError("local_blob_mirror_read_only_put_blocked", {
        source: "local_blob_mirror",
        objectRoot: mirror.objectRoot,
        reason: "audit local blob mirror fallback is read-only"
      });
    };
  }
}

function patchApplicationWithLocalBlobMirror(app, moduleBlobStorage, mirror) {
  patchModuleBlobStorageWithLocalMirror(moduleBlobStorage, mirror);
  const tilesApplication = safeGetProvider(app, TilesApplicationService);
  const memoryTileProcessingCache = safeGetProvider(app, MemoryTileProcessingCacheRepository);
  if (tilesApplication && memoryTileProcessingCache) {
    tilesApplication.processingCache = memoryTileProcessingCache;
  }
  const targets = [
    safeGetProvider(app, RuntimeSettingsApplicationService),
    safeGetProvider(app, AreasApplicationService),
    tilesApplication,
    safeGetProvider(app, AREA_REPOSITORY),
    safeGetProvider(app, TILE_REPOSITORY)
  ];
  for (const target of targets) {
    patchTargetModuleBlobStorage(target, moduleBlobStorage);
  }
}

function safeGetProvider(app, token) {
  try {
    return app.get(token, { strict: false });
  } catch {
    try {
      return app.get(token);
    } catch {
      return null;
    }
  }
}

function patchTargetModuleBlobStorage(target, moduleBlobStorage) {
  if (!target || typeof target !== "object") {
    return;
  }
  target.moduleBlobStorage = moduleBlobStorage;
  if ("textureIndexLookupCache" in target) {
    target.textureIndexLookupCache = null;
  }
  if ("snapshotIndex" in target) {
    target.snapshotIndex = null;
  }
  if ("snapshotIndexPromise" in target) {
    target.snapshotIndexPromise = null;
  }
}

function createLocalBlobMirrorAccess(mirror) {
  let indexPromise = null;
  const getIndex = async (settings) => {
    if (!indexPromise) {
      indexPromise = buildLocalBlobMirrorIndex(mirror.objectRoot, settings);
    }
    return indexPromise;
  };

  return {
    listModuleSnapshot: async (settings, options = {}) => {
      const index = await getIndex(settings);
      const limit = Math.min(Math.max(Number(options.limit ?? 200), 1), 1000);
      const offset = Math.max(Number.parseInt(String(options.continuationToken ?? "0"), 10) || 0, 0);
      const page = index.objects.slice(offset, offset + limit);
      const nextOffset = offset + page.length;
      const truncated = nextOffset < index.objects.length;
      return {
        bucket: settings.bucket,
        prefix: index.prefix,
        moduleHash: index.moduleHash,
        totalFiles: page.length,
        totalBytes: page.reduce((sum, object) => sum + object.size, 0),
        objects: page,
        truncated,
        continuationToken: truncated ? String(nextOffset) : undefined
      };
    },
    getModuleObject: async (settings, key) => {
      const normalizedKey = toObjectKey(String(key ?? ""));
      if (!normalizedKey) {
        return null;
      }
      const path = safeJoinObjectKey(mirror.objectRoot, normalizedKey);
      if (!path) {
        return null;
      }
      const fileStat = await statSafe(path);
      if (!fileStat?.isFile()) {
        return null;
      }
      const bytes = await readFile(path);
      return {
        key: normalizedKey,
        size: bytes.length,
        contentType: inferContentType(normalizedKey),
        etag: createHash("sha256").update(bytes).digest("hex"),
        lastModified: fileStat.mtime.toISOString(),
        bytes
      };
    }
  };
}

async function buildLocalBlobMirrorIndex(objectRoot, settings) {
  const prefix = normalizePrefix(settings.modulePrefix);
  const prefixPath = join(objectRoot, ...prefix.split("/").filter(Boolean));
  const files = await listFilesUnder(prefixPath, Number.POSITIVE_INFINITY);
  const objects = files
    .map((file) => ({
      key: `${prefix}${toObjectKey(relative(prefixPath, file.path))}`,
      size: file.size,
      lastModified: file.mtime.toISOString(),
      etag: file.etag
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
  const manifest = await readLocalMirrorManifest(objectRoot, prefix);
  return {
    prefix,
    moduleHash: manifest?.moduleHash,
    objects
  };
}

async function readLocalMirrorManifest(objectRoot, prefix) {
  const manifestPath = join(objectRoot, buildManifestKeyForPrefix(prefix));
  try {
    return JSON.parse(await readFile(manifestPath, "utf-8"));
  } catch {
    return null;
  }
}

async function listFilesUnder(root, limit) {
  const files = [];
  const visit = async (directory) => {
    if (files.length >= limit) {
      return;
    }
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (files.length >= limit) {
        return;
      }
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const fileStat = await stat(path);
      files.push({
        path,
        size: fileStat.size,
        mtime: fileStat.mtime,
        etag: createHash("sha256").update(`${path}:${fileStat.size}:${fileStat.mtimeMs}`).digest("hex")
      });
    }
  };
  await visit(root);
  return files;
}

async function collectLocalSourceEvidence(settings) {
  const moduleDecompiledPath = mapRuntimeHostPath(settings.paths?.moduleDecompiledPath);
  const hakDirectoryPath = mapRuntimeHostPath(settings.paths?.hakDirectoryPath);
  const vanillaDataPath = mapRuntimeHostPath(settings.paths?.vanillaDataPath);
  const moduleDirectoryPath = join("C:", "Users", "enonw", "Documents", "Neverwinter Nights", "modules");
  return {
    moduleDecompiledPath,
    ikeaAreaFiles: await collectExistingFiles(moduleDecompiledPath, ["_ikea.are", "_ikea.git", "mtt_ikea_v2.are", "mtt_ikea_v2.git"]),
    hakDirectoryPath,
    tileHakFiles: await collectExistingFiles(hakDirectoryPath, ["medieval.hak", "lc_slms_city.hak", "lc_legacy_tiles.hak"]),
    vanillaDataPath,
    moduleDirectoryPath,
    packedModuleFiles: await collectDirectoryMatches(moduleDirectoryPath, /the_last_city.*codex|the_last_city.*\.mod/iu, 8)
  };
}

async function collectExistingFiles(root, names) {
  if (!root) {
    return [];
  }
  const output = [];
  for (const name of names) {
    const path = join(root, name);
    const fileStat = await statSafe(path);
    if (fileStat?.isFile()) {
      output.push({
        path,
        size: fileStat.size,
        lastModified: fileStat.mtime.toISOString()
      });
    }
  }
  return output;
}

async function collectDirectoryMatches(root, pattern, limit) {
  const rootStat = await statSafe(root);
  if (!rootStat?.isDirectory()) {
    return [];
  }
  const entries = await readdir(root, { withFileTypes: true });
  const output = [];
  for (const entry of entries) {
    if (output.length >= limit || !entry.isFile() || !pattern.test(entry.name)) {
      continue;
    }
    const path = join(root, entry.name);
    const fileStat = await stat(path);
    output.push({
      path,
      size: fileStat.size,
      lastModified: fileStat.mtime.toISOString()
    });
  }
  return output;
}

function summarizeLocalMirror(localMirror) {
  return {
    source: "local_blob_mirror",
    path: localMirror.candidate.path,
    candidateSource: localMirror.candidate.source,
    objectRoot: localMirror.objectRoot,
    prefix: localMirror.prefix,
    objectCount: localMirror.objectCount,
    sampleObjectKeys: localMirror.sampleObjectKeys,
    checkedPaths: localMirror.checkedPaths
  };
}

function mapRuntimeHostPath(value) {
  const normalized = String(value ?? "").trim().replace(/\\/gu, "/");
  if (!normalized) {
    return null;
  }
  if (/^[a-z]:\//iu.test(normalized)) {
    return normalized;
  }
  const mappings = [
    {
      prefix: "/host/nwn-docs",
      hostRoot: join("C:", "Users", "enonw", "Documents", "Neverwinter Nights")
    },
    {
      prefix: "/host/nwn-game",
      hostRoot: join("C:", "Program Files (x86)", "Steam", "steamapps", "common", "Neverwinter Nights")
    }
  ];
  for (const mapping of mappings) {
    if (normalized === mapping.prefix || normalized.startsWith(`${mapping.prefix}/`)) {
      const suffix = normalized.slice(mapping.prefix.length).replace(/^\/+/u, "");
      return suffix ? join(mapping.hostRoot, ...suffix.split("/")) : mapping.hostRoot;
    }
  }
  return normalized;
}

function normalizeLocalPath(value) {
  const normalized = String(value ?? "").trim();
  return normalized ? resolve(normalized) : null;
}

function normalizePrefix(value) {
  const trimmed = String(value ?? "").trim().replace(/^\/+/u, "").replace(/\/+$/u, "");
  return trimmed ? `${trimmed}/` : "";
}

function toObjectKey(value) {
  return String(value ?? "").replace(/\\/gu, "/").replace(/^\/+/u, "");
}

function safeJoinObjectKey(root, key) {
  const rootPath = resolve(root);
  const fullPath = resolve(rootPath, ...toObjectKey(key).split("/").filter(Boolean));
  const normalizedRoot = rootPath.toLowerCase();
  const normalizedFull = fullPath.toLowerCase();
  if (normalizedFull !== normalizedRoot && !normalizedFull.startsWith(`${normalizedRoot.toLowerCase()}\\`)) {
    return null;
  }
  return fullPath;
}

async function statSafe(path) {
  if (!path) {
    return null;
  }
  try {
    return await stat(path);
  } catch {
    return null;
  }
}

async function fileExists(path) {
  const fileStat = await statSafe(path);
  return Boolean(fileStat?.isFile());
}

function resolveStatKind(value) {
  if (value.isDirectory()) {
    return "directory";
  }
  if (value.isFile()) {
    return "file";
  }
  return "other";
}

function buildManifestKeyForPrefix(prefix) {
  const encoded = Buffer.from(prefix, "utf-8")
    .toString("base64")
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_")
    .replace(/=+$/gu, "");
  return `__aurora/meta/module-snapshots/${encoded}.json`;
}

function inferContentType(fileName) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "glb":
      return "model/gltf-binary";
    case "gltf":
      return "model/gltf+json";
    case "dds":
      return "image/vnd-ms.dds";
    case "tga":
      return "image/x-tga";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "txt":
    case "ini":
    case "nss":
    case "2da":
    case "txi":
    case "mtr":
    case "set":
      return "text/plain; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

async function resolveIkeaArea(areas) {
  try {
    return await areas.getArea(TARGET_AREA_ID);
  } catch (directError) {
    const list = await areas.listAreas({
      query: TARGET_AREA_QUERY,
      limit: 1000,
      offset: 0
    });
    const match =
      list.items.find((item) => item.areaId === TARGET_AREA_ID) ??
      list.items.find((item) => normalizeComparable(item.name) === TARGET_AREA_QUERY);
    if (!match) {
      throw new AuditBlockerError("ikea_area_not_found_in_area_repository", {
        targetAreaId: TARGET_AREA_ID,
        targetAreaQuery: TARGET_AREA_QUERY,
        listTotal: list.total,
        directError: formatErrorForReport(directError)
      });
    }
    return areas.getArea(match.areaId);
  }
}

async function auditIkeaTileSourceReadiness(area, tiles, auditOptions) {
  const startedAt = Date.now();
  const areaTiles = Array.isArray(area.tiles) ? area.tiles : [];
  const candidates = resolveTileModelCandidates(areaTiles);
  const processBypassCache =
    auditOptions.runtimeSettingsAudit.storageSource === "local_blob_mirror"
      ? false
      : auditOptions.bypassCache;
  const areaTileModelMissingCount = areaTiles.filter(
    (tile) => !normalizeModelResRef(tile.modelResRef)
  ).length;
  const entries =
    candidates.length > 0
      ? await processTileCandidates(candidates, tiles, {
          bypassCache: processBypassCache,
          concurrency: auditOptions.concurrency
        })
      : [];
  const topBlockers = summarizeTopBlockers(entries, {
    areaTileModelMissingCount,
    tilesTotal: areaTiles.length
  });
  const totals = summarizeTotals(areaTiles, candidates, entries);
  const readinessStatus = resolveReadinessStatus(totals, topBlockers);
  const blockerSummary =
    topBlockers.length > 0
      ? topBlockers
          .slice(0, DEFAULT_SAMPLE_LIMIT)
          .map((entry) => `${entry.blocker}:${entry.count}`)
          .join(" | ")
      : "none";

  return {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    cwd: backendRoot,
    status: readinessStatus,
    auditCompleted: true,
    target: {
      areaId: area.areaId,
      areaName: area.name,
      requestedAreaId: TARGET_AREA_ID,
      requestedAreaQuery: TARGET_AREA_QUERY,
      tileSet: area.tileSet ?? null,
      dimensions: {
        width: area.width,
        height: area.height
      }
    },
    options: {
      bypassCache: auditOptions.bypassCache,
      processBypassCache,
      bypassCacheSuppressedForLocalBlobMirror:
        auditOptions.runtimeSettingsAudit.storageSource === "local_blob_mirror" &&
        auditOptions.bypassCache !== processBypassCache,
      concurrency: auditOptions.concurrency,
      blobEndpointOverride: auditOptions.runtimeSettingsAudit.overrideApplied
        ? auditOptions.runtimeSettingsAudit.effectiveEndpoint
        : null
    },
    runtimeSettingsAudit: auditOptions.runtimeSettingsAudit,
    canonicalParityPromoted: false,
    visualParityPromoted: false,
    localOnlyBackendAudit: true,
    totals,
    sampleTiles: areaTiles.slice(0, auditOptions.sampleLimit).map(formatAreaTileSample),
    sampleCandidates: entries.slice(0, auditOptions.sampleLimit).map(formatEntrySample),
    topBlockers,
    blockerSummary,
    elapsedMs: Date.now() - startedAt,
    ...(auditOptions.includeEntries
      ? { entries }
      : { entrySampleLimit: auditOptions.entryLimit, entriesSampled: entries.slice(0, auditOptions.entryLimit) })
  };
}

async function auditIkeaSourceDirectFiles(settings, auditOptions) {
  const startedAt = Date.now();
  const parserInventory = buildSourceDirectParserInventory();
  const missingParsers = Object.values(parserInventory)
    .filter((entry) => entry.required && !entry.available)
    .map((entry) => ({
      id: entry.id,
      api: entry.api,
      purpose: entry.purpose
    }));
  if (missingParsers.length > 0) {
    throw new AuditBlockerError("source_direct_parser_unavailable", {
      missingParsers,
      parserInventory
    });
  }

  const sourceFiles = await resolveSourceDirectAreaFiles(settings);
  if (!sourceFiles.are) {
    throw new AuditBlockerError("source_direct_area_source_unavailable", {
      checkedSources: sourceFiles.checkedSources,
      required: ["_ikea.are from runtime moduleDecompiledPath", "_ikea.are from the_last_city - codex.mod"]
    });
  }

  const parsedArea = parseAreaMetadataFromAreGff(sourceFiles.are.bytes);
  if (!parsedArea) {
    throw new AuditBlockerError("source_direct_area_parse_failed", {
      source: summarizeDirectSourceFile(sourceFiles.are),
      parser: "parseAreaMetadataFromAreGff"
    });
  }

  const parsedObjects = sourceFiles.git ? parseAreaObjectsFromGitGff(sourceFiles.git.bytes) : null;
  const tileSet = normalizeModelResRef(parsedArea.tileSet);
  const tilesetResolution = tileSet
    ? await resolveDirectTilesetSetSource(settings, tileSet)
    : {
        status: "blocked",
        blocker: "source_direct_tileset_missing_in_are",
        tileSet: null,
        attempts: [],
        bytes: null,
        source: null
      };
  const setTiles =
    tilesetResolution.bytes && typeof __moduleSnapshotAreaRepositoryInternals.parseAuroraSetTiles === "function"
      ? __moduleSnapshotAreaRepositoryInternals.parseAuroraSetTiles(tilesetResolution.bytes)
      : new Map();
  const entries = parsedArea.tiles.map((tile) =>
    buildSourceDirectTileEntry(tile, setTiles, tilesetResolution)
  );
  const sampleModelResRefs = summarizeSourceDirectModelSamples(entries, auditOptions.sampleLimit);
  const modelSourceAudit = await auditSourceDirectModelSources(
    settings,
    sampleModelResRefs.map((sample) => sample.modelResRef),
    auditOptions.sampleLimit
  );
  const localBlobMirrorWrite = auditOptions.writeLocalBlobMirror
    ? await writeSourceDirectLocalBlobMirror(settings, {
        sourceFiles,
        tilesetResolution,
        modelSourceAudit,
        auditOptions
      })
    : null;
  const effectiveRuntimeSettingsAudit = buildEffectiveRuntimeSettingsAuditAfterLocalMirrorWrite(
    auditOptions.runtimeSettingsAudit,
    localBlobMirrorWrite
  );
  const renderContractBridge = await buildSourceDirectRenderContractBridge(settings, modelSourceAudit, {
    runtimeSettingsAudit: effectiveRuntimeSettingsAudit,
    sampleLimit: auditOptions.sampleLimit
  });
  const totals = summarizeSourceDirectTotals(
    parsedArea,
    entries,
    setTiles,
    tilesetResolution,
    modelSourceAudit,
    renderContractBridge
  );
  const topBlockers = summarizeSourceDirectBlockers(entries, {
    runtimeSettingsAudit: effectiveRuntimeSettingsAudit,
    tilesetResolution,
    modelSourceAudit,
    renderContractBridge
  });
  const readinessStatus = resolveSourceDirectReadinessStatus(totals, topBlockers);

  return {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    cwd: backendRoot,
    status: readinessStatus,
    auditCompleted: true,
    target: {
      areaId: TARGET_AREA_ID,
      areaName: parsedArea.name ?? TARGET_AREA_QUERY,
      requestedAreaId: TARGET_AREA_ID,
      requestedAreaQuery: TARGET_AREA_QUERY,
      tileSet: tileSet || parsedArea.tileSet || null,
      dimensions: {
        width: parsedArea.width ?? null,
        height: parsedArea.height ?? null
      }
    },
    mode: "source_direct_files",
    options: {
      bypassCache: auditOptions.bypassCache,
      concurrency: auditOptions.concurrency,
      blobEndpointOverride: null,
      localBlobMirror: auditOptions.localBlobMirror ?? null,
      writeLocalBlobMirror: Boolean(auditOptions.writeLocalBlobMirror),
      writeLocalBlobMirrorSource: auditOptions.writeLocalBlobMirrorSource ?? null
    },
    runtimeSettingsAudit: effectiveRuntimeSettingsAudit,
    sourceDirect: {
      parserInventory,
      sourceFiles: {
        are: summarizeDirectSourceFile(sourceFiles.are),
        git: summarizeDirectSourceFile(sourceFiles.git),
        checkedSources: sourceFiles.checkedSources
      },
      gitObjectCounts: parsedObjects
        ? {
            placeables: parsedObjects.placeables.length,
            doors: parsedObjects.doors.length,
            creatures: parsedObjects.creatures.length,
            items: parsedObjects.items.length,
            sounds: parsedObjects.sounds.length
          }
        : null,
      tilesetResolution: summarizeDirectTilesetResolution(tilesetResolution),
      modelSourceAudit,
      renderContractBridge,
      localBlobMirrorWrite,
      localBlobMirrorUnavailable: effectiveRuntimeSettingsAudit.localBlobMirrorUnavailable ?? null
    },
    canonicalParityPromoted: false,
    visualParityPromoted: false,
    localOnlyBackendAudit: true,
    sourceDirectFilesAudit: true,
    totals,
    sampleTiles: entries.slice(0, auditOptions.sampleLimit).map(formatSourceDirectTileSample),
    sampleModelResRefs,
    topBlockers,
    blockerSummary:
      topBlockers.length > 0
        ? topBlockers.map((entry) => `${entry.blocker}:${entry.count}`).join(" | ")
        : "none",
    elapsedMs: Date.now() - startedAt,
    ...(auditOptions.includeEntries
      ? { entries }
      : { entrySampleLimit: auditOptions.entryLimit, entriesSampled: entries.slice(0, auditOptions.entryLimit) })
  };
}

function buildSourceDirectParserInventory() {
  return {
    gffAre: {
      id: "gff_are",
      required: true,
      available: typeof parseAreaMetadataFromAreGff === "function",
      api: "parseAreaMetadataFromAreGff",
      purpose: "read ARE metadata, dimensions, TileList, and tileset"
    },
    gffGit: {
      id: "gff_git",
      required: true,
      available: typeof parseAreaObjectsFromGitGff === "function",
      api: "parseAreaObjectsFromGitGff",
      purpose: "read GIT object counts for source sanity"
    },
    set: {
      id: "set",
      required: true,
      available: typeof __moduleSnapshotAreaRepositoryInternals.parseAuroraSetTiles === "function",
      api: "__moduleSnapshotAreaRepositoryInternals.parseAuroraSetTiles",
      purpose: "map ARE tile ids to SET model resrefs"
    },
    hakErf: {
      id: "hak_erf",
      required: true,
      available:
        typeof readNwnErfResource === "function" &&
        typeof NwnErfPackedModuleExtractorService === "function",
      api: "readNwnErfResource / NwnErfPackedModuleExtractorService",
      purpose: "read SET resources from HAK/MOD/ERF containers"
    },
    keyBif: {
      id: "key_bif",
      required: true,
      available:
        typeof NwnKeyBifResourceReader?.open === "function" &&
        typeof NWN_KEY_BIF_RESOURCE_TYPES?.SET === "number" &&
        typeof NWN_KEY_BIF_RESOURCE_TYPES?.MDL === "number" &&
        typeof NWN_KEY_BIF_RESOURCE_TYPES?.DDS === "number",
      api: "NwnKeyBifResourceReader",
      purpose: "read vanilla SET/MDL/texture resources from KEY/BIF"
    },
    twoDa: {
      id: "two_da",
      required: true,
      available: typeof parseAuroraTwoDaTable === "function",
      api: "parseAuroraTwoDaTable",
      purpose: "2DA parser exists for source-direct inventory; _IKEA tile count path does not require a 2DA table"
    },
    mdl: {
      id: "mdl",
      required: true,
      available: typeof parseAuroraMdlVfxSource === "function",
      api: "parseAuroraMdlVfxSource",
      purpose: "MDL parser exists for source-direct inventory; this audit reports model resrefs, not GLB conversion parity"
    },
    mdlTextureRefs: {
      id: "mdl_texture_refs",
      required: false,
      available: typeof __tilesApplicationServiceInternals?.collectTileMdlTextureReferences === "function",
      api: "__tilesApplicationServiceInternals.collectTileMdlTextureReferences",
      purpose: "extract MDL bitmap/texture refs for source-direct tile model texture readiness"
    },
    mdlGlbConverter: {
      id: "mdl_glb_converter",
      required: false,
      available: typeof convertAuroraMdlToGlb === "function",
      api: "convertAuroraMdlToGlb",
      purpose: "derive an in-memory GLB target from the real source-direct MDL for dry-run render contract readiness"
    },
    tileRenderContractBuilders: {
      id: "tile_render_contract_builders",
      required: false,
      available:
        typeof buildTileProcessCacheKey === "function" &&
        typeof __tilesApplicationServiceInternals?.buildTileSourceAssetContract === "function" &&
        typeof __tilesApplicationServiceInternals?.buildTileRenderAssetContract === "function",
      api: "buildTileProcessCacheKey / __tilesApplicationServiceInternals.buildTileRenderAssetContract",
      purpose: "build the existing backend source/render asset contract shape for source-direct dry-run bridge output"
    }
  };
}

async function resolveSourceDirectAreaFiles(settings) {
  const checkedSources = [];
  const decompiledRoot = mapRuntimeHostPath(settings.paths?.moduleDecompiledPath);
  const preferredResrefs = [TARGET_AREA_QUERY, "mtt_ikea_v2"];
  let are = null;
  let git = null;

  if (decompiledRoot) {
    for (const resref of preferredResrefs) {
      const arePath = join(decompiledRoot, `${resref}.are`);
      const gitPath = join(decompiledRoot, `${resref}.git`);
      const areStat = await statSafe(arePath);
      const gitStat = await statSafe(gitPath);
      checkedSources.push({
        source: "runtime_module_decompiled_path",
        resref,
        arePath,
        areExists: Boolean(areStat?.isFile()),
        gitPath,
        gitExists: Boolean(gitStat?.isFile())
      });
      if (!are && areStat?.isFile()) {
        are = await readDirectSourceFile(arePath, "decompiled_are", resref);
      }
      if (!git && gitStat?.isFile()) {
        git = await readDirectSourceFile(gitPath, "decompiled_git", resref);
      }
      if (are?.resref === TARGET_AREA_QUERY && git?.resref === TARGET_AREA_QUERY) {
        return {
          are,
          git,
          checkedSources
        };
      }
    }
  }

  const packedModules = await resolveSourceDirectPackedModuleCandidates(settings);
  for (const moduleFile of packedModules) {
    for (const resref of preferredResrefs) {
      checkedSources.push({
        source: "packed_module_erf_probe",
        modulePath: moduleFile.path,
        resref
      });
      if (!are) {
        const bytes = await readNwnErfResource(moduleFile.path, resref, 2012);
        if (bytes) {
          are = buildDirectSourceFile({
            path: moduleFile.path,
            source: "packed_module_are",
            resref,
            extension: "are",
            bytes
          });
        }
      }
      if (!git) {
        const bytes = await readNwnErfResource(moduleFile.path, resref, 2023);
        if (bytes) {
          git = buildDirectSourceFile({
            path: moduleFile.path,
            source: "packed_module_git",
            resref,
            extension: "git",
            bytes
          });
        }
      }
      if (are && git) {
        return {
          are,
          git,
          checkedSources
        };
      }
    }
  }

  return {
    are,
    git,
    checkedSources
  };
}

async function resolveDirectTilesetSetSource(settings, tileSet) {
  const attempts = [];
  const decompiledRoot = mapRuntimeHostPath(settings.paths?.moduleDecompiledPath);
  if (decompiledRoot) {
    const setPath = join(decompiledRoot, `${tileSet}.set`);
    const fileStat = await statSafe(setPath);
    attempts.push({
      source: "runtime_module_decompiled_path",
      path: setPath,
      exists: Boolean(fileStat?.isFile())
    });
    if (fileStat?.isFile()) {
      return {
        status: "ready",
        tileSet,
        source: {
          source: "decompiled_set",
          path: setPath,
          size: fileStat.size,
          lastModified: fileStat.mtime.toISOString()
        },
        bytes: await readFile(setPath),
        attempts
      };
    }
  }

  for (const hakPath of resolveTileHakPaths(settings)) {
    const fileStat = await statSafe(hakPath);
    const attempt = {
      source: "runtime_tile_hak_profile",
      path: hakPath,
      exists: Boolean(fileStat?.isFile()),
      resourceType: "SET",
      resref: tileSet
    };
    attempts.push(attempt);
    if (!fileStat?.isFile()) {
      continue;
    }
    try {
      const bytes = await readNwnErfResource(hakPath, tileSet, NWN_KEY_BIF_RESOURCE_TYPES.SET);
      attempt.found = Boolean(bytes);
      if (bytes) {
        return {
          status: "ready",
          tileSet,
          source: {
            source: "hak_erf_set",
            path: hakPath,
            resref: tileSet,
            size: bytes.length,
            containerSize: fileStat.size,
            lastModified: fileStat.mtime.toISOString()
          },
          bytes,
          attempts
        };
      }
    } catch (error) {
      attempt.error = formatNetworkCause(error);
    }
  }

  const vanillaDataPath = mapRuntimeHostPath(settings.paths?.vanillaDataPath);
  const keyCandidates = resolveVanillaKeyFileCandidates(vanillaDataPath);
  for (const keyPath of keyCandidates) {
    const keyStat = await statSafe(keyPath);
    const attempt = {
      source: "runtime_vanilla_key_bif",
      path: keyPath,
      exists: Boolean(keyStat?.isFile()),
      resourceType: "SET",
      resref: tileSet
    };
    attempts.push(attempt);
    if (!keyStat?.isFile() || !vanillaDataPath) {
      continue;
    }
    try {
      const reader = await NwnKeyBifResourceReader.open(keyPath, vanillaDataPath);
      attempt.readerOpened = true;
      attempt.hasResource = reader.has(tileSet, NWN_KEY_BIF_RESOURCE_TYPES.SET);
      const bytes = await reader.read(tileSet, NWN_KEY_BIF_RESOURCE_TYPES.SET);
      if (bytes) {
        return {
          status: "ready",
          tileSet,
          source: {
            source: "vanilla_key_bif_set",
            path: keyPath,
            resref: tileSet,
            size: bytes.length,
            lastModified: keyStat.mtime.toISOString()
          },
          bytes,
          attempts
        };
      }
    } catch (error) {
      attempt.error = formatNetworkCause(error);
    }
  }

  return {
    status: "blocked",
    blocker: "source_direct_tileset_set_unavailable",
    tileSet,
    source: null,
    bytes: null,
    attempts
  };
}

async function auditSourceDirectModelSources(settings, modelResRefs, sampleLimit) {
  const uniqueModelResRefs = [...new Set(modelResRefs.map(normalizeModelResRef).filter(Boolean))];
  const entries = [];
  for (const modelResRef of uniqueModelResRefs) {
    entries.push(await auditOneSourceDirectModelSource(settings, modelResRef, sampleLimit));
  }
  const textureRefSet = new Set();
  const missingTextureRefSet = new Set();
  for (const entry of entries) {
    for (const textureRef of entry.textureReferences?.refs ?? []) {
      textureRefSet.add(textureRef);
    }
    for (const textureRef of entry.textures?.missingTextureRefs ?? []) {
      missingTextureRefSet.add(textureRef);
    }
  }
  const topBlockers = summarizeSourceDirectModelAuditBlockers(entries);
  return {
    status: entries.length > 0 && topBlockers.length === 0 ? "ready" : entries.some((entry) => entry.mdl.status === "ready") ? "partial" : "blocked",
    statusCode: resolveSourceDirectModelAuditStatusCode(entries, topBlockers),
    modelResRefsChecked: uniqueModelResRefs.length,
    mdlFoundCount: entries.filter((entry) => entry.mdl.status === "ready").length,
    mdlMissingCount: entries.filter((entry) => entry.mdl.status !== "ready").length,
    textureReferenceParserAvailable:
      typeof __tilesApplicationServiceInternals?.collectTileMdlTextureReferences === "function",
    textureReferenceCount: textureRefSet.size,
    textureReferencesResolvedCount: entries.filter((entry) => entry.textureReferences.status === "ready").length,
    textureSourceReadyCount: entries.reduce((sum, entry) => sum + (entry.textures?.foundTextureCount ?? 0), 0),
    textureSourceMissingCount: missingTextureRefSet.size,
    sampleTextureRefs: [...textureRefSet].sort((left, right) => left.localeCompare(right)).slice(0, sampleLimit),
    missingTextureRefsSample: [...missingTextureRefSet].sort((left, right) => left.localeCompare(right)).slice(0, sampleLimit),
    entries,
    topBlockers
  };
}

async function auditOneSourceDirectModelSource(settings, modelResRef, sampleLimit) {
  const mdl = await resolveDirectMdlSource(settings, modelResRef);
  if (mdl.status !== "ready") {
    return {
      modelResRef,
      status: "blocked",
      statusCode: "source_direct_mdl_missing",
      mdl: summarizeDirectAssetResolution(mdl),
      textureReferences: {
        status: "not_checked",
        parser: "__tilesApplicationServiceInternals.collectTileMdlTextureReferences",
        refs: [],
        count: 0,
        sample: []
      },
      textures: {
        checkedTextureRefs: 0,
        foundTextureCount: 0,
        missingTextureCount: 0,
        foundTextureSample: [],
        missingTextureRefs: []
      }
    };
  }

  const textureReferences = collectSourceDirectMdlTextureReferences(mdl.bytes, sampleLimit);
  if (textureReferences.status !== "ready") {
    return {
      modelResRef,
      status: "blocked",
      statusCode: "source_direct_mdl_texture_refs_unavailable",
      mdl: summarizeDirectAssetResolution(mdl),
      textureReferences,
      textures: {
        checkedTextureRefs: 0,
        foundTextureCount: 0,
        missingTextureCount: 0,
        foundTextureSample: [],
        missingTextureRefs: []
      }
    };
  }

  const textures = await resolveDirectTextureSources(settings, textureReferences.refs, sampleLimit);
  const statusCode =
    textures.missingTextureCount > 0 ? "source_direct_texture_missing" : "source_direct_mdl_source_ready";
  return {
    modelResRef,
    status: textures.missingTextureCount > 0 ? "blocked" : "ready",
    statusCode,
    mdl: summarizeDirectAssetResolution(mdl),
    textureReferences,
    textures
  };
}

async function resolveDirectMdlSource(settings, modelResRef) {
  return resolveDirectResourceSource(settings, modelResRef, {
    resourceKind: "MDL",
    extension: "mdl",
    resourceTypes: [{ extension: "mdl", resourceType: NWN_KEY_BIF_RESOURCE_TYPES.MDL }],
    hakSource: "hak_erf_mdl",
    vanillaSource: "vanilla_key_bif_mdl",
    blocker: "source_direct_mdl_missing"
  });
}

async function resolveDirectTextureSource(settings, textureRef) {
  return resolveDirectResourceSource(settings, textureRef, {
    resourceKind: "TEXTURE",
    extension: "texture",
    resourceTypes: SOURCE_DIRECT_TEXTURE_RESOURCE_TYPES,
    hakSource: "hak_erf_texture",
    vanillaSource: "vanilla_key_bif_texture",
    blocker: "source_direct_texture_missing"
  });
}

async function resolveDirectResourceSource(settings, resref, options) {
  const normalizedResRef = normalizeModelResRef(resref);
  const attempts = [];
  for (const hakPath of resolveTileHakPaths(settings)) {
    const fileStat = await statSafe(hakPath);
    for (const resourceType of options.resourceTypes) {
      const attempt = {
        source: "runtime_tile_hak_profile",
        path: hakPath,
        exists: Boolean(fileStat?.isFile()),
        resourceType: options.resourceKind,
        extension: resourceType.extension,
        resref: normalizedResRef
      };
      attempts.push(attempt);
      if (!fileStat?.isFile()) {
        continue;
      }
      try {
        const bytes = await readNwnErfResource(hakPath, normalizedResRef, resourceType.resourceType);
        attempt.found = Boolean(bytes);
        if (bytes) {
          return {
            status: "ready",
            resref: normalizedResRef,
            source: {
              source: options.hakSource,
              path: hakPath,
              resref: normalizedResRef,
              extension: resourceType.extension,
              resourceType: options.resourceKind,
              size: bytes.length,
              containerSize: fileStat.size,
              lastModified: fileStat.mtime.toISOString()
            },
            bytes,
            attempts
          };
        }
      } catch (error) {
        attempt.error = formatNetworkCause(error);
      }
    }
  }

  const vanillaDataPath = mapRuntimeHostPath(settings.paths?.vanillaDataPath);
  const keyCandidates = resolveVanillaKeyFileCandidates(vanillaDataPath);
  for (const keyPath of keyCandidates) {
    const keyStat = await statSafe(keyPath);
    const attemptBase = {
      source: "runtime_vanilla_key_bif",
      path: keyPath,
      exists: Boolean(keyStat?.isFile()),
      resourceType: options.resourceKind,
      resref: normalizedResRef
    };
    if (!keyStat?.isFile() || !vanillaDataPath) {
      attempts.push(attemptBase);
      continue;
    }
    let reader = null;
    try {
      reader = await NwnKeyBifResourceReader.open(keyPath, vanillaDataPath);
    } catch (error) {
      attempts.push({ ...attemptBase, error: formatNetworkCause(error) });
      continue;
    }
    for (const resourceType of options.resourceTypes) {
      const attempt = { ...attemptBase, extension: resourceType.extension, readerOpened: true };
      attempts.push(attempt);
      try {
        attempt.hasResource = reader.has(normalizedResRef, resourceType.resourceType);
        const bytes = await reader.read(normalizedResRef, resourceType.resourceType);
        if (bytes) {
          return {
            status: "ready",
            resref: normalizedResRef,
            source: {
              source: options.vanillaSource,
              path: keyPath,
              resref: normalizedResRef,
              extension: resourceType.extension,
              resourceType: options.resourceKind,
              size: bytes.length,
              lastModified: keyStat.mtime.toISOString()
            },
            bytes,
            attempts
          };
        }
      } catch (error) {
        attempt.error = formatNetworkCause(error);
      }
    }
  }

  return {
    status: "blocked",
    blocker: options.blocker,
    resref: normalizedResRef,
    source: null,
    bytes: null,
    attempts
  };
}

function collectSourceDirectMdlTextureReferences(bytes, sampleLimit) {
  const parser = __tilesApplicationServiceInternals?.collectTileMdlTextureReferences;
  if (typeof parser !== "function") {
    return {
      status: "blocked",
      blocker: "source_direct_mdl_texture_refs_unavailable",
      parser: "__tilesApplicationServiceInternals.collectTileMdlTextureReferences",
      refs: [],
      count: 0,
      sample: []
    };
  }
  const refs = parser(Buffer.from(bytes));
  return {
    status: "ready",
    blocker: null,
    parser: "__tilesApplicationServiceInternals.collectTileMdlTextureReferences",
    refs,
    count: refs.length,
    sample: refs.slice(0, sampleLimit)
  };
}

async function resolveDirectTextureSources(settings, textureRefs, sampleLimit) {
  const found = [];
  const missing = [];
  for (const textureRef of textureRefs) {
    const resolution = await resolveDirectTextureSource(settings, textureRef);
    if (resolution.status === "ready") {
      found.push(summarizeDirectAssetResolution(resolution));
    } else {
      missing.push(textureRef);
    }
  }
  return {
    checkedTextureRefs: textureRefs.length,
    foundTextureCount: found.length,
    missingTextureCount: missing.length,
    foundTextureSample: found.slice(0, sampleLimit),
    missingTextureRefs: missing,
    missingTextureRefsSample: missing.slice(0, sampleLimit)
  };
}

function summarizeDirectAssetResolution(resolution) {
  return {
    status: resolution.status,
    blocker: resolution.blocker ?? null,
    resref: resolution.resref,
    source: resolution.source,
    attempts: resolution.attempts
  };
}

function summarizeSourceDirectModelAuditBlockers(entries) {
  const counts = new Map();
  const samples = new Map();
  for (const entry of entries) {
    if (entry.mdl.status !== "ready") {
      addBlocker(counts, samples, "source_direct_mdl_missing", entry.modelResRef);
    }
    if (entry.textureReferences.status !== "ready") {
      addBlocker(counts, samples, "source_direct_mdl_texture_refs_unavailable", entry.modelResRef);
    }
    for (const textureRef of entry.textures?.missingTextureRefs ?? []) {
      addBlocker(counts, samples, "source_direct_texture_missing", textureRef);
    }
  }
  return [...counts.entries()]
    .map(([blocker, count]) => ({
      blocker,
      count,
      sampleModelOrTextureRefs: samples.get(blocker) ?? []
    }))
    .sort((left, right) => right.count - left.count || left.blocker.localeCompare(right.blocker))
    .slice(0, DEFAULT_SAMPLE_LIMIT);
}

function resolveSourceDirectModelAuditStatusCode(entries, topBlockers) {
  if (entries.length === 0) {
    return "source_direct_mdl_missing";
  }
  const firstBlocker = topBlockers[0]?.blocker;
  if (firstBlocker) {
    return firstBlocker;
  }
  return "source_direct_mdl_source_ready";
}

async function writeSourceDirectLocalBlobMirror(settings, input) {
  const root = resolveWriteLocalBlobMirrorRoot(input.auditOptions);
  const objectFiles = await buildSourceDirectLocalMirrorObjectFiles(settings, input);
  const writtenFiles = [];
  for (const file of objectFiles) {
    const path = safeJoinObjectKey(root, file.objectKey);
    if (!path) {
      throw new AuditBlockerError("local_blob_mirror_write_path_invalid", {
        root,
        objectKey: file.objectKey
      });
    }
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, file.bytes);
    writtenFiles.push({
      kind: file.kind,
      objectKey: file.objectKey,
      path,
      size: file.bytes.length,
      sha256: sha256Hex(file.bytes),
      contentType: file.contentType,
      sourcePath: file.sourcePath
    });
  }

  const manifest = buildSourceDirectLocalMirrorManifest(objectFiles);
  const manifestKey = buildManifestKeyForPrefix(normalizePrefix(settings.blobStorage.modulePrefix));
  const manifestPath = safeJoinObjectKey(root, manifestKey);
  if (!manifestPath) {
    throw new AuditBlockerError("local_blob_mirror_manifest_path_invalid", {
      root,
      manifestKey
    });
  }
  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2), "utf-8");
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, manifestBytes);

  const inspected = await inspectLocalBlobMirrorCandidate(
    { path: root, source: "writeLocalBlobMirror" },
    settings.blobStorage
  );
  const mirrorSummary = inspected.available
    ? summarizeLocalMirror({
        available: true,
        candidate: { path: root, source: "writeLocalBlobMirror" },
        objectRoot: inspected.objectRoot,
        prefix: inspected.prefix,
        objectCount: inspected.objectCount,
        sampleObjectKeys: inspected.sampleObjectKeys,
        checkedPaths: [inspected.report],
        localSourceEvidence: input.auditOptions.runtimeSettingsAudit?.localBlobMirrorUnavailable?.localSourceEvidence ?? null
      })
    : null;

  return {
    status: inspected.available ? "written" : "blocked",
    statusCode: inspected.available ? "local_blob_mirror_written" : "local_blob_mirror_write_unverified",
    source: "local_blob_mirror",
    root,
    objectRoot: inspected.objectRoot ?? root,
    mirrorAvailableAfterWrite: inspected.available,
    canonicalParityPromoted: false,
    visualParityPromoted: false,
    fileCount: writtenFiles.length,
    totalBytes: writtenFiles.reduce((sum, file) => sum + file.size, 0),
    objectKeys: writtenFiles.map((file) => file.objectKey),
    files: writtenFiles,
    manifest: {
      objectKey: manifestKey,
      path: manifestPath,
      size: manifestBytes.length,
      sha256: sha256Hex(manifestBytes),
      moduleHash: manifest.moduleHash,
      fileCount: manifest.fileCount
    },
    mirror: mirrorSummary,
    inspectAfterWrite: inspected.report
  };
}

async function buildSourceDirectLocalMirrorObjectFiles(settings, input) {
  const files = [];
  const add = (file) => {
    if (!file?.objectKey || !file.bytes) {
      return;
    }
    files.push({
      ...file,
      objectKey: toObjectKey(file.objectKey),
      bytes: Buffer.from(file.bytes)
    });
  };

  if (input.sourceFiles.are) {
    add(buildLocalMirrorObjectFile(settings, {
      kind: "area_are_source",
      fileName: `${input.sourceFiles.are.resref}.are`,
      resourceType: 2012,
      bytes: input.sourceFiles.are.bytes,
      contentType: "application/octet-stream",
      sourcePath: input.sourceFiles.are.path
    }));
  }
  if (input.sourceFiles.git) {
    add(buildLocalMirrorObjectFile(settings, {
      kind: "area_git_source",
      fileName: `${input.sourceFiles.git.resref}.git`,
      resourceType: 2023,
      bytes: input.sourceFiles.git.bytes,
      contentType: "application/octet-stream",
      sourcePath: input.sourceFiles.git.path
    }));
  }
  if (input.tilesetResolution?.bytes && input.tilesetResolution.status === "ready") {
    const extension = "set";
    const fileName = buildSourceDirectProductionFileName(
      {
        resref: input.tilesetResolution.tileSet,
        source: input.tilesetResolution.source
      },
      extension,
      "tileset_set"
    );
    add(buildLocalMirrorObjectFile(settings, {
      kind: "tileset_set_source",
      fileName,
      resourceType: NWN_KEY_BIF_RESOURCE_TYPES.SET,
      bytes: input.tilesetResolution.bytes,
      contentType: "text/plain; charset=utf-8",
      sourcePath: input.tilesetResolution.source?.path ?? null
    }));
  }

  const textureFilesByName = new Map();
  for (const entry of input.modelSourceAudit.entries ?? []) {
    if (entry.mdl?.status !== "ready") {
      continue;
    }
    const mdl = await resolveDirectMdlSource(settings, entry.modelResRef);
    if (mdl.status !== "ready") {
      continue;
    }
    const sourceAssetFile = buildSourceDirectPackedFileFromResolution(mdl, {
      kind: "tile_model_mdl",
      fallbackExtension: "mdl"
    });
    add(buildLocalMirrorObjectFile(settings, {
      kind: "tile_model_source",
      fileName: sourceAssetFile.fileName,
      resourceType: sourceAssetFile.resourceType,
      bytes: sourceAssetFile.bytes,
      contentType: "application/octet-stream",
      sourcePath: mdl.source?.path ?? null
    }));

    const glb = tryGenerateSourceDirectGlb(mdl.bytes);
    if (glb.status === "generated") {
      add(buildLocalMirrorObjectFile(settings, {
        kind: "tile_model_derived_glb",
        fileName: `__aurora/derived/models/${entry.modelResRef}.glb`,
        resourceType: 0,
        bytes: glb.bytes,
        contentType: "model/gltf-binary",
        sourcePath: `generated:${sourceAssetFile.fileName}`
      }));
    }

    for (const textureRef of entry.textureReferences?.refs ?? []) {
      const texture = await resolveDirectTextureSource(settings, textureRef);
      if (texture.status !== "ready") {
        continue;
      }
      const textureFile = buildSourceDirectTextureFileFromResolution(texture);
      if (!textureFilesByName.has(textureFile.fileName)) {
        textureFilesByName.set(textureFile.fileName, textureFile);
      }
      add(buildLocalMirrorObjectFile(settings, {
        kind: "tile_material_texture_source",
        fileName: textureFile.fileName,
        resourceType: textureFile.resourceType,
        bytes: textureFile.bytes,
        contentType: inferSourceDirectTextureContentType(texture.source?.extension ?? "dds"),
        sourcePath: textureFile.sourcePath
      }));
    }
  }

  const textureFiles = [...textureFilesByName.values()];
  if (textureFiles.length > 0) {
    const textureIndexRecord = buildSourceDirectTextureIndexRecord(settings, textureFiles);
    add(buildLocalMirrorObjectFile(settings, {
      kind: "texture_index",
      fileName: TEXTURE_INDEX_FILE_NAME,
      resourceType: 0,
      bytes: Buffer.from(JSON.stringify(textureIndexRecord, null, 2), "utf-8"),
      contentType: "application/json",
      sourcePath: "generated:upsertTextureIndexFiles"
    }));
  }

  return dedupeLocalMirrorObjectFiles(files);
}

function buildLocalMirrorObjectFile(settings, file) {
  const objectKey = buildAuditObjectKey(settings, file.fileName);
  return {
    ...file,
    objectKey,
    bytes: Buffer.from(file.bytes)
  };
}

function dedupeLocalMirrorObjectFiles(files) {
  const byKey = new Map();
  for (const file of files) {
    byKey.set(file.objectKey, file);
  }
  return [...byKey.values()].sort((left, right) => left.objectKey.localeCompare(right.objectKey));
}

function buildSourceDirectLocalMirrorManifest(files) {
  const manifestFiles = {};
  for (const file of files) {
    manifestFiles[file.objectKey] = {
      sha256: sha256Hex(file.bytes),
      size: file.bytes.length
    };
  }
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    moduleHash: hashLocalMirrorManifestFiles(manifestFiles),
    fileCount: files.length,
    files: manifestFiles,
    source: "local_blob_mirror",
    canonicalParityPromoted: false,
    visualParityPromoted: false
  };
}

function hashLocalMirrorManifestFiles(files) {
  const keys = Object.keys(files).sort((left, right) => left.localeCompare(right));
  const hash = createHash("sha256");
  for (const key of keys) {
    const entry = files[key];
    hash.update(key);
    hash.update("\n");
    hash.update(entry.sha256);
    hash.update("\n");
    hash.update(String(entry.size));
    hash.update("\n");
  }
  return hash.digest("hex");
}

function resolveWriteLocalBlobMirrorRoot(auditOptions) {
  return normalizeLocalPath(auditOptions.localBlobMirror) ??
    resolve(backendRoot, "..", ".codex-tmp", "module-blob-mirror");
}

function buildEffectiveRuntimeSettingsAuditAfterLocalMirrorWrite(runtimeSettingsAudit, localBlobMirrorWrite) {
  if (!localBlobMirrorWrite?.mirrorAvailableAfterWrite) {
    return runtimeSettingsAudit;
  }
  return {
    ...runtimeSettingsAudit,
    localBlobMirror: localBlobMirrorWrite.mirror,
    localBlobMirrorAfterWrite: localBlobMirrorWrite.mirror,
    localBlobMirrorUnavailable: null
  };
}

async function buildSourceDirectRenderContractBridge(settings, modelSourceAudit, options) {
  const apiBlockers = [];
  if (typeof buildTileProcessCacheKey !== "function") {
    apiBlockers.push("source_direct_tile_process_cache_key_builder_unavailable");
  }
  if (typeof __tilesApplicationServiceInternals?.buildTileSourceAssetContract !== "function") {
    apiBlockers.push("source_direct_tile_source_contract_builder_unavailable");
  }
  if (typeof __tilesApplicationServiceInternals?.buildTileRenderAssetContract !== "function") {
    apiBlockers.push("source_direct_tile_render_contract_builder_unavailable");
  }
  if (typeof convertAuroraMdlToGlb !== "function") {
    apiBlockers.push("source_direct_mdl_glb_converter_unavailable");
  }

  const writeBlockers = resolveSourceDirectBridgeWriteBlockers(options.runtimeSettingsAudit);
  const modelEntries = (modelSourceAudit.entries ?? []).filter((entry) => entry.mdl?.status === "ready");
  if (modelEntries.length === 0) {
    apiBlockers.push("source_direct_bridge_no_ready_mdl_sources");
  }

  if (apiBlockers.length > 0) {
    return {
      mode: "source_direct_render_contract_bridge",
      status: "blocked",
      statusCode: apiBlockers[0],
      writeMode: "not_attempted",
      realWriteAttempted: false,
      readinessPromoted: false,
      contractArtifactStatus: "blocked",
      productionPath: {
        sourceSync: "RuntimeSettingsApplicationService.syncVanillaTileModelSources",
        blobWrite: "moduleBlobStorage.putModuleObject",
        contractBuilder: "__tilesApplicationServiceInternals.buildTileRenderAssetContract",
        cacheKeyBuilder: "buildTileProcessCacheKey"
      },
      storage: summarizeSourceDirectBridgeStorage(settings, options.runtimeSettingsAudit),
      entries: [],
      wouldWrite: buildEmptyWouldWriteSummary(settings),
      blockers: [...apiBlockers, ...writeBlockers.map((entry) => entry.blocker)]
    };
  }

  const entries = [];
  for (const entry of modelEntries) {
    entries.push(
      await buildSourceDirectRenderContractBridgeEntry(settings, entry, {
        writeBlockers,
        sampleLimit: options.sampleLimit
      })
    );
  }

  const wouldWriteFiles = dedupeWouldWriteFiles(entries.flatMap((entry) => entry.wouldWrite?.files ?? []));
  const bridgeBlockers = dedupeStrings([
    "source_direct_contract_dry_run_not_written",
    ...writeBlockers.map((entry) => entry.blocker),
    ...entries.flatMap((entry) => entry.blockers ?? [])
  ]);
  const contractArtifactReadyCount = entries.filter(
    (entry) => entry.contractArtifactStatus === "ready"
  ).length;
  const derivedModelGeneratedCount = entries.filter(
    (entry) => entry.derivedModelAsset?.status === "generated"
  ).length;
  const materialTextureContractCount = entries.reduce(
    (sum, entry) => sum + (entry.materialTextureAssets?.length ?? 0),
    0
  );

  return {
    mode: "source_direct_render_contract_bridge",
    status: "blocked",
    statusCode:
      writeBlockers[0]?.blocker ??
      (contractArtifactReadyCount > 0
        ? "source_direct_contract_dry_run_not_written"
        : bridgeBlockers[0] ?? "source_direct_contract_bridge_blocked"),
    writeMode: "dry_run_would_write",
    realWriteAttempted: false,
    readinessPromoted: false,
    contractArtifactStatus: contractArtifactReadyCount > 0 ? "ready" : "blocked",
    productionPath: {
      sourceSync: "RuntimeSettingsApplicationService.syncVanillaTileModelSources",
      blobWrite: "moduleBlobStorage.putModuleObject",
      contractBuilder: "__tilesApplicationServiceInternals.buildTileRenderAssetContract",
      cacheKeyBuilder: "buildTileProcessCacheKey",
      derivedAssetGenerator: "convertAuroraMdlToGlb"
    },
    storage: summarizeSourceDirectBridgeStorage(settings, options.runtimeSettingsAudit),
    wouldWrite: {
      fileCount: wouldWriteFiles.length,
      totalBytes: wouldWriteFiles.reduce((sum, file) => sum + file.size, 0),
      objectKeys: wouldWriteFiles.map((file) => file.objectKey),
      files: wouldWriteFiles,
      textureIndexObjectKey: buildAuditObjectKey(settings, TEXTURE_INDEX_FILE_NAME),
      moduleSnapshotManifestObjectKey: buildAuditManifestObjectKey(settings)
    },
    counts: {
      modelEntriesChecked: modelEntries.length,
      contractArtifactReadyCount,
      derivedModelGeneratedCount,
      materialTextureContractCount,
      realWriteCount: 0
    },
    blockers: bridgeBlockers,
    entries
  };
}

async function buildSourceDirectRenderContractBridgeEntry(settings, modelEntry, options) {
  const blockers = ["source_direct_contract_dry_run_not_written"];
  for (const blocker of options.writeBlockers) {
    blockers.push(blocker.blocker);
  }

  const mdl = await resolveDirectMdlSource(settings, modelEntry.modelResRef);
  if (mdl.status !== "ready") {
    blockers.push("source_direct_mdl_missing");
    return {
      modelResRef: modelEntry.modelResRef,
      status: "blocked",
      statusCode: "source_direct_mdl_missing",
      contractArtifactStatus: "blocked",
      mdl: summarizeDirectAssetResolution(mdl),
      blockers: dedupeStrings(blockers),
      wouldWrite: { files: [] }
    };
  }

  const sourceAssetFile = buildSourceDirectPackedFileFromResolution(mdl, {
    kind: "tile_model_mdl",
    fallbackExtension: "mdl"
  });
  const textureResolutions = [];
  const missingTextureRefs = [];
  for (const textureRef of modelEntry.textureReferences?.refs ?? []) {
    const texture = await resolveDirectTextureSource(settings, textureRef);
    if (texture.status === "ready") {
      textureResolutions.push(texture);
    } else {
      missingTextureRefs.push(textureRef);
    }
  }
  if (missingTextureRefs.length > 0) {
    blockers.push("source_direct_texture_missing");
  }

  const textureFiles = textureResolutions.map((texture) =>
    buildSourceDirectTextureFileFromResolution(texture)
  );
  const glb = tryGenerateSourceDirectGlb(mdl.bytes);
  const derivedFileName = `__aurora/derived/models/${modelEntry.modelResRef}.glb`;
  const derivedObjectKey = buildAuditObjectKey(settings, derivedFileName);
  if (glb.status !== "generated") {
    blockers.push("source_direct_glb_generation_failed");
  }

  const tileRecord = buildSourceDirectBridgeTileRecord(settings, {
    modelResRef: modelEntry.modelResRef,
    sourceAssetFile,
    sourceAssetObjectKey: buildAuditObjectKey(settings, sourceAssetFile.fileName),
    derivedObjectKey: glb.status === "generated" ? derivedObjectKey : undefined,
    derivedSize: glb.bytes?.length,
    glb
  });
  const cacheKey = buildTileProcessCacheKey(tileRecord);
  const materialTextureAssets = textureFiles.map((file) =>
    buildSourceDirectMaterialTextureAsset(settings, file)
  );
  const sourceAssetContract =
    __tilesApplicationServiceInternals.buildTileSourceAssetContract(tileRecord);
  const renderAssetContract =
    __tilesApplicationServiceInternals.buildTileRenderAssetContract(
      tileRecord,
      cacheKey,
      materialTextureAssets
    );
  const wouldWriteFiles = [
    buildWouldWriteFile(settings, sourceAssetFile, {
      kind: "tile_model_source",
      sourcePath: mdl.source?.path ?? null
    }),
    ...textureFiles.map((file) =>
      buildWouldWriteFile(settings, file, {
        kind: "tile_material_texture_source",
        sourcePath: file.sourcePath
      })
    )
  ];
  if (glb.status === "generated") {
    wouldWriteFiles.push(
      buildWouldWriteFile(settings, {
        fileName: derivedFileName,
        resourceType: 0,
        bytes: glb.bytes
      }, {
        kind: "tile_model_derived_glb",
        sourcePath: `generated:${sourceAssetFile.fileName}`,
        contentType: "model/gltf-binary"
      })
    );
  }
  if (textureFiles.length > 0) {
    const textureIndexRecord = buildSourceDirectTextureIndexRecord(settings, textureFiles);
    wouldWriteFiles.push(
      buildWouldWriteFile(settings, {
        fileName: TEXTURE_INDEX_FILE_NAME,
        resourceType: 0,
        bytes: Buffer.from(JSON.stringify(textureIndexRecord, null, 2), "utf-8")
      }, {
        kind: "texture_index",
        sourcePath: "generated:upsertTextureIndexFiles",
        contentType: "application/json"
      })
    );
  }

  return {
    modelResRef: modelEntry.modelResRef,
    status: "dry_run_would_write",
    statusCode: dedupeStrings(blockers)[0] ?? "source_direct_contract_dry_run_not_written",
    contractArtifactStatus: renderAssetContract.modelAsset ? "ready" : "blocked",
    readinessPromoted: false,
    cacheKey,
    tileRecord: summarizeSourceDirectBridgeTileRecord(tileRecord),
    sourceAsset: {
      sourcePath: mdl.source?.path ?? null,
      fileName: sourceAssetFile.fileName,
      objectKey: tileRecord.sourceAssetObjectKey,
      size: sourceAssetFile.bytes.length,
      sha256: sha256Hex(sourceAssetFile.bytes),
      contract: sourceAssetContract
    },
    derivedModelAsset: {
      status: glb.status,
      fileName: derivedFileName,
      objectKey: derivedObjectKey,
      size: glb.bytes?.length ?? 0,
      sha256: glb.bytes ? sha256Hex(glb.bytes) : null,
      targetKey: derivedObjectKey,
      generator: "convertAuroraMdlToGlb",
      metrics: glb.metrics,
      warnings: glb.warnings ?? [],
      blocker: glb.blocker ?? null
    },
    textureAssets: {
      requestedRefs: modelEntry.textureReferences?.refs ?? [],
      foundCount: textureFiles.length,
      missingRefs: missingTextureRefs,
      foundSample: textureFiles.slice(0, options.sampleLimit).map((file) => ({
        reference: basename(file.fileName, extname(file.fileName)),
        fileName: file.fileName,
        objectKey: buildAuditObjectKey(settings, file.fileName),
        sourcePath: file.sourcePath,
        size: file.bytes.length,
        sha256: sha256Hex(file.bytes)
      }))
    },
    materialTextureAssets,
    renderAssetContract,
    wouldWrite: {
      fileCount: wouldWriteFiles.length,
      totalBytes: wouldWriteFiles.reduce((sum, file) => sum + file.size, 0),
      files: wouldWriteFiles,
      derivedTargetKey: derivedObjectKey
    },
    blockers: dedupeStrings([...blockers, ...renderAssetContract.blockers])
  };
}

function tryGenerateSourceDirectGlb(bytes) {
  try {
    const result = convertAuroraMdlToGlb(Buffer.from(bytes));
    return {
      status: "generated",
      bytes: result.bytes,
      metrics: {
        modelName: result.modelName,
        meshCount: result.meshCount,
        vertexCount: result.vertexCount,
        triangleCount: result.triangleCount,
        textureReferences: result.textureReferences
      },
      warnings: result.warnings
    };
  } catch (error) {
    return {
      status: "blocked",
      blocker: "source_direct_glb_generation_failed",
      metrics: null,
      warnings: [],
      error: formatErrorForReport(error)
    };
  }
}

function buildSourceDirectPackedFileFromResolution(resolution, options) {
  const extension = resolution.source?.extension ?? options.fallbackExtension;
  return {
    fileName: buildSourceDirectProductionFileName(resolution, extension, options.kind),
    resourceType: inferSourceDirectResourceType(extension),
    bytes: Buffer.from(resolution.bytes)
  };
}

function buildSourceDirectTextureFileFromResolution(resolution) {
  const extension = resolution.source?.extension ?? "dds";
  return {
    fileName: buildSourceDirectProductionFileName(resolution, extension, "texture"),
    resourceType: inferSourceDirectResourceType(extension),
    bytes: Buffer.from(resolution.bytes),
    source: resolution.source?.source === "hak_erf_texture" ? "hak" : "vanilla",
    sourcePath: normalizeAuditRelativePath(
      resolution.source?.source === "hak_erf_texture"
        ? resolution.source?.path
        : `${resolution.resref}.${extension}`
    )
  };
}

function buildSourceDirectProductionFileName(resolution, extension, kind) {
  const resref = normalizeModelResRef(resolution.resref) || resolution.resref;
  const sourceKind = resolution.source?.source ?? "";
  if (sourceKind.startsWith("hak_erf")) {
    const hakName = sanitizeAuditSegment(
      basename(resolution.source?.path ?? "source", extname(resolution.source?.path ?? ""))
    );
    return normalizeAuditRelativePath(`__aurora/sources/hak/${hakName}/${resref}.${extension}`);
  }
  if (sourceKind.startsWith("vanilla_key_bif")) {
    const directory = kind === "texture" ? "textures" : extension === "mdl" ? "models" : "walkmeshes";
    return normalizeAuditRelativePath(`__aurora/sources/vanilla/${directory}/${resref}.${extension}`);
  }
  return normalizeAuditRelativePath(`__aurora/sources/source-direct/${resref}.${extension}`);
}

function buildSourceDirectBridgeTileRecord(settings, input) {
  const sourceSize = input.sourceAssetFile.bytes.length;
  const sourceObjectKey = input.sourceAssetObjectKey;
  const updatedAt = new Date().toISOString();
  const candidate = {
    resref: input.modelResRef,
    sourceKey: sourceObjectKey,
    extension: "mdl",
    sourceSize,
    sourceEtag: undefined,
    updatedAt
  };
  const tileset = inferSourceDirectBridgeTileset(candidate);
  const variant = inferSourceDirectBridgeVariant(candidate.resref);
  const walkmesh = inferSourceDirectBridgeWalkmesh(candidate);
  const metrics = input.glb.status === "generated"
    ? {
        triangles: input.glb.metrics.triangleCount,
        meshes: input.glb.metrics.meshCount,
        emitters: 0
      }
    : estimateSourceDirectBridgeMetrics(candidate);

  return {
    tileId: `tile_${candidate.resref}`.slice(0, 80),
    resref: candidate.resref,
    name: humanizeSourceDirectBridgeName(candidate.resref),
    tileset,
    variant,
    tags: buildSourceDirectBridgeTags(candidate, tileset, variant, walkmesh),
    benchmark: false,
    previewImageUrl: `/assets/previews/tiles/${candidate.resref}.webp`,
    textureAtlasId: `atlas_tile_${tileset}_v1`,
    textureAtlasObjectKey: sourceObjectKey,
    textureAtlasContentType: "application/octet-stream",
    textureAtlasSizeBytes: sourceSize,
    textureAtlasFingerprint: buildSourceDirectBridgeAtlasFingerprint(candidate),
    sourceAssetObjectKey: sourceObjectKey,
    sourceAssetExtension: "mdl",
    sourceAssetSizeBytes: sourceSize,
    sourceAssetOrigin: "module-snapshot",
    renderModelObjectKey: input.derivedObjectKey,
    renderModelExtension: input.derivedObjectKey ? "glb" : undefined,
    renderModelSizeBytes: input.derivedSize,
    walkmesh,
    metrics,
    updatedAt
  };
}

function buildSourceDirectMaterialTextureAsset(settings, file) {
  const entry = buildSourceDirectTextureIndexEntry(settings, file);
  const deliveryPath = `/api/v1/settings/runtime/module-cache/textures/${encodeURIComponent(entry.textureId)}`;
  return {
    reference: entry.resref,
    textureId: entry.textureId,
    resref: entry.resref,
    objectKey: entry.objectKey,
    extension: entry.extension,
    contentType: inferSourceDirectTextureContentType(entry.extension),
    sizeBytes: entry.sizeBytes,
    source: file.source,
    sourcePath: file.sourcePath,
    deliveryPath,
    deliveryUrl: deliveryPath,
    s3Url: buildAuditS3Url(settings, entry.objectKey)
  };
}

function buildSourceDirectTextureIndexRecord(settings, textureFiles) {
  const normalizedPrefix = normalizeAuditBlobPrefix(settings.blobStorage?.modulePrefix ?? "");
  const entries = textureFiles
    .map((file) => buildSourceDirectTextureIndexEntry(settings, file))
    .sort((left, right) => left.objectKey.localeCompare(right.objectKey));
  const byResref = {};
  for (const entry of entries) {
    const bucket = byResref[entry.resref] ?? [];
    bucket.push({
      objectKey: entry.objectKey,
      sha256: entry.sha256,
      sizeBytes: entry.sizeBytes,
      extension: entry.extension,
      source: entry.source,
      sourcePath: entry.sourcePath
    });
    byResref[entry.resref] = bucket;
  }
  return {
    version: "texture-index/v1",
    generatedAt: new Date().toISOString(),
    settingsRevision: settings.revision,
    modulePrefix: normalizedPrefix,
    totalTextures: entries.length,
    totalBytes: entries.reduce((sum, entry) => sum + entry.sizeBytes, 0),
    entries,
    byResref
  };
}

function buildSourceDirectTextureIndexEntry(settings, file) {
  const extension = extname(file.fileName).replace(/^\./u, "").toLowerCase();
  const resref = basename(file.fileName, extname(file.fileName)).toLowerCase();
  const objectKey = buildAuditObjectKey(settings, file.fileName);
  const sha256 = sha256Hex(file.bytes);
  return {
    textureId: createHash("sha256")
      .update(`${objectKey}|${sha256}|${file.bytes.length}`)
      .digest("hex")
      .slice(0, 24),
    resref,
    extension,
    objectKey,
    sizeBytes: file.bytes.length,
    sha256,
    source: file.source,
    sourcePath: file.sourcePath
  };
}

function buildWouldWriteFile(settings, file, options) {
  const objectKey = buildAuditObjectKey(settings, file.fileName);
  return {
    kind: options.kind,
    fileName: file.fileName,
    objectKey,
    resourceType: file.resourceType,
    size: file.bytes.length,
    sha256: sha256Hex(file.bytes),
    contentType: options.contentType ?? inferSourceDirectFileContentType(file.fileName),
    sourcePath: options.sourcePath ?? null
  };
}

function dedupeWouldWriteFiles(files) {
  const byKey = new Map();
  for (const file of files) {
    if (!byKey.has(file.objectKey)) {
      byKey.set(file.objectKey, file);
    }
  }
  return [...byKey.values()].sort((left, right) => left.objectKey.localeCompare(right.objectKey));
}

function resolveSourceDirectBridgeWriteBlockers(runtimeSettingsAudit) {
  const blockers = [];
  if (runtimeSettingsAudit.hostProbe?.available === false) {
    blockers.push({
      blocker: "host_blob_storage_endpoint_unavailable",
      sample: runtimeSettingsAudit.hostProbe.endpoint
    });
  }
  if (runtimeSettingsAudit.localBlobMirrorUnavailable) {
    blockers.push({
      blocker: "local_blob_mirror_unavailable",
      sample: "checkedPaths"
    });
  }
  return blockers;
}

function summarizeSourceDirectBridgeStorage(settings, runtimeSettingsAudit) {
  return {
    bucket: settings.blobStorage?.bucket ?? null,
    modulePrefix: settings.blobStorage?.modulePrefix ?? null,
    runtimeEndpoint: runtimeSettingsAudit.runtimeEndpoint,
    effectiveEndpoint: runtimeSettingsAudit.effectiveEndpoint,
    storageSource: runtimeSettingsAudit.storageSource,
    hostProbe: runtimeSettingsAudit.hostProbe
  };
}

function buildEmptyWouldWriteSummary(settings) {
  return {
    fileCount: 0,
    totalBytes: 0,
    objectKeys: [],
    files: [],
    textureIndexObjectKey: buildAuditObjectKey(settings, TEXTURE_INDEX_FILE_NAME),
    moduleSnapshotManifestObjectKey: buildAuditManifestObjectKey(settings)
  };
}

function summarizeSourceDirectBridgeTileRecord(tileRecord) {
  return {
    tileId: tileRecord.tileId,
    resref: tileRecord.resref,
    tileset: tileRecord.tileset,
    variant: tileRecord.variant,
    textureAtlasObjectKey: tileRecord.textureAtlasObjectKey,
    sourceAssetObjectKey: tileRecord.sourceAssetObjectKey,
    renderModelObjectKey: tileRecord.renderModelObjectKey,
    renderModelExtension: tileRecord.renderModelExtension,
    renderModelSizeBytes: tileRecord.renderModelSizeBytes,
    walkmesh: tileRecord.walkmesh,
    metrics: tileRecord.metrics
  };
}

function inferSourceDirectResourceType(extension) {
  const normalized = String(extension ?? "").toLowerCase();
  if (normalized === "mdl") {
    return NWN_KEY_BIF_RESOURCE_TYPES.MDL;
  }
  const textureType = SOURCE_DIRECT_TEXTURE_RESOURCE_TYPES.find((entry) => entry.extension === normalized);
  return textureType?.resourceType ?? 0;
}

function inferSourceDirectFileContentType(fileName) {
  const extension = extname(fileName).replace(/^\./u, "").toLowerCase();
  if (extension === "glb") {
    return "model/gltf-binary";
  }
  if (extension === "json") {
    return "application/json";
  }
  if (extension === "mdl") {
    return "application/octet-stream";
  }
  return inferSourceDirectTextureContentType(extension);
}

function inferSourceDirectTextureContentType(extension) {
  switch (String(extension ?? "").toLowerCase()) {
    case "dds":
      return "image/vnd-ms.dds";
    case "tga":
      return "image/x-tga";
    case "bmp":
      return "image/bmp";
    case "txi":
    case "mtr":
      return "text/plain; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

function buildAuditObjectKey(settings, fileName) {
  return `${normalizeAuditBlobPrefix(settings.blobStorage?.modulePrefix ?? "")}${normalizeAuditFileName(fileName)}`;
}

function buildAuditManifestObjectKey(settings) {
  const prefix = normalizeAuditBlobPrefix(settings.blobStorage?.modulePrefix ?? "");
  const encoded = Buffer.from(prefix, "utf-8")
    .toString("base64")
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_")
    .replace(/=+$/gu, "");
  return `__aurora/meta/module-snapshots/${encoded}.json`;
}

function normalizeAuditBlobPrefix(value) {
  const trimmed = String(value ?? "").trim().replace(/^\/+/u, "").replace(/\/+$/u, "");
  return trimmed ? `${trimmed}/` : "";
}

function normalizeAuditFileName(value) {
  return String(value ?? "").replace(/^[/\\]+/u, "").replace(/\\/gu, "/");
}

function normalizeAuditRelativePath(value) {
  return String(value ?? "").replace(/\\/gu, "/");
}

function buildAuditS3Url(settings, objectKey) {
  return `s3://${settings.blobStorage?.bucket ?? ""}/${objectKey}`;
}

function sanitizeAuditSegment(value) {
  const normalized = String(value ?? "").toLowerCase().replace(/[^a-z0-9._-]/gu, "_");
  return normalized || "source";
}

function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function dedupeStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

function inferSourceDirectBridgeTileset(candidate) {
  const normalized = candidate.sourceKey.replace(/\\/gu, "/").toLowerCase();
  const known = ["city", "forest", "dungeon", "swamp", "rural", "desert"];
  for (const value of known) {
    if (normalized.includes(value) || candidate.resref.includes(value)) {
      return value;
    }
  }
  const token = candidate.resref.split(/[_-]+/u)[0] ?? "generic";
  return token.slice(0, 12) || "generic";
}

function inferSourceDirectBridgeVariant(resref) {
  const tokens = resref.split(/[_-]+/u).filter((token) => token.length > 0);
  return tokens.length <= 1 ? "standard" : tokens[1].slice(0, 24);
}

function inferSourceDirectBridgeWalkmesh(candidate) {
  const normalized = `${candidate.resref}|${candidate.sourceKey}`.toLowerCase();
  if (/(water|river|swamp|shore)/u.test(normalized)) {
    return "water";
  }
  if (/(block|blocked|wall|rubble|closed)/u.test(normalized)) {
    return "blocked";
  }
  return "walkable";
}

function estimateSourceDirectBridgeMetrics(candidate) {
  return {
    triangles: clampNumber(Math.round(candidate.sourceSize / 180), 64, 20000),
    meshes: clampNumber(Math.round(candidate.sourceSize / 12000), 1, 64),
    emitters: /(vfx|emit|particle|fire|smoke)/u.test(candidate.sourceKey.toLowerCase()) ? 1 : 0
  };
}

function buildSourceDirectBridgeTags(candidate, tileset, variant, walkmesh) {
  const tags = new Set(["tile", tileset, variant, walkmesh, candidate.extension]);
  for (const token of candidate.resref.split(/[_-]+/u)) {
    if (token.length >= 3 && token.length <= 24) {
      tags.add(token);
    }
  }
  return [...tags].slice(0, 12);
}

function buildSourceDirectBridgeAtlasFingerprint(candidate) {
  return createHash("sha256")
    .update(`${candidate.resref}|${candidate.sourceKey}|${candidate.extension}|${candidate.sourceSize}`)
    .digest("hex");
}

function humanizeSourceDirectBridgeName(resref) {
  return resref
    .split(/[_-]+/u)
    .filter(Boolean)
    .map((token) => token.slice(0, 1).toUpperCase() + token.slice(1))
    .join(" ");
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildSourceDirectTileEntry(tile, setTiles, tilesetResolution) {
  const setTile = Number.isInteger(tile.tileId) ? setTiles.get(tile.tileId) : undefined;
  const modelResRef = normalizeModelResRef(tile.modelResRef ?? setTile?.modelResRef);
  const exactBlockers = [];
  if (!Number.isInteger(tile.tileId)) {
    exactBlockers.push("source_direct_tile_id_missing");
  }
  if (tilesetResolution.status !== "ready") {
    exactBlockers.push(tilesetResolution.blocker ?? "source_direct_tileset_set_unavailable");
  }
  if (!modelResRef) {
    exactBlockers.push("source_direct_model_resref_unresolved");
  }
  exactBlockers.push("source_direct_no_blob_object_keys");
  exactBlockers.push("source_direct_no_render_asset_contract");
  exactBlockers.push("source_direct_no_model_asset_contract");

  return {
    tileIndex: tile.index,
    row: tile.row,
    col: tile.col,
    tileId: tile.tileId ?? null,
    orientation: tile.orientation ?? null,
    height: tile.height ?? null,
    modelResRef: modelResRef || null,
    modelResRefSource: tile.modelResRef ? "are_tile_list" : setTile?.modelResRef ? "tileset_set" : null,
    status: modelResRef ? "source_resolved_no_render_contract" : "blocked",
    exactBlockers
  };
}

function summarizeSourceDirectTotals(
  parsedArea,
  entries,
  setTiles,
  tilesetResolution,
  modelSourceAudit,
  renderContractBridge
) {
  const uniqueModelResRefs = new Set(entries.map((entry) => entry.modelResRef).filter(Boolean));
  return {
    tilesTotal: parsedArea.tiles.length,
    parsedAreaTileCount: parsedArea.tileCount ?? parsedArea.tiles.length,
    expectedIkeaTileCount: 256,
    tileCountMatchesExpectedIkea256: parsedArea.tiles.length === 256,
    width: parsedArea.width ?? null,
    height: parsedArea.height ?? null,
    tileSet: normalizeModelResRef(parsedArea.tileSet) || parsedArea.tileSet || null,
    tilesWithTileId: entries.filter((entry) => Number.isInteger(entry.tileId)).length,
    tilesWithModelResRef: entries.filter((entry) => Boolean(entry.modelResRef)).length,
    tilesMissingModelResRef: entries.filter((entry) => !entry.modelResRef).length,
    uniqueModelResRefs: uniqueModelResRefs.size,
    setTileModelEntries: setTiles.size,
    tilesetSetResolved: tilesetResolution.status === "ready",
    sourceAssetCount: 0,
    sourceAssetReadyCount: 0,
    renderAssetContractCount: 0,
    modelAssetReadyCount: 0,
    modelSourceCheckedCount: modelSourceAudit.modelResRefsChecked,
    mdlSourceReadyCount: modelSourceAudit.mdlFoundCount,
    mdlSourceMissingCount: modelSourceAudit.mdlMissingCount,
    mdlTextureReferenceCount: modelSourceAudit.textureReferenceCount,
    mdlTextureReferencesResolvedCount: modelSourceAudit.textureReferencesResolvedCount,
    textureSourceReadyCount: modelSourceAudit.textureSourceReadyCount,
    textureSourceMissingCount: modelSourceAudit.textureSourceMissingCount,
    sourceDirectBridgeContractArtifactReadyCount:
      renderContractBridge.counts?.contractArtifactReadyCount ?? 0,
    sourceDirectBridgeDerivedModelGeneratedCount:
      renderContractBridge.counts?.derivedModelGeneratedCount ?? 0,
    sourceDirectBridgeMaterialTextureContractCount:
      renderContractBridge.counts?.materialTextureContractCount ?? 0,
    sourceDirectBridgeWouldWriteFileCount: renderContractBridge.wouldWrite?.fileCount ?? 0,
    sourceDirectBridgeWouldWriteByteCount: renderContractBridge.wouldWrite?.totalBytes ?? 0,
    sourceDirectBridgeRealWriteCount: renderContractBridge.counts?.realWriteCount ?? 0,
    sourceDirectBridgeReadinessPromoted: Boolean(renderContractBridge.readinessPromoted),
    modelDeliveryReadyCount: 0,
    glbGeometryReadyCount: 0,
    rendererHandoffReadyCount: 0,
    directSourceResolvedTileCount: entries.filter((entry) => Boolean(entry.modelResRef)).length,
    blockedCandidateCount: entries.filter((entry) => entry.exactBlockers.length > 0).length,
    readyCandidateCount: 0
  };
}

function summarizeSourceDirectBlockers(entries, context) {
  const counts = new Map();
  const samples = new Map();
  if (context.runtimeSettingsAudit.hostProbe?.available === false) {
    addBlocker(
      counts,
      samples,
      "host_blob_storage_endpoint_unavailable",
      context.runtimeSettingsAudit.hostProbe.endpoint
    );
  }
  if (context.runtimeSettingsAudit.localBlobMirrorUnavailable) {
    addBlocker(counts, samples, "local_blob_mirror_unavailable", "checkedPaths");
  }
  if (context.tilesetResolution.status !== "ready") {
    addBlocker(
      counts,
      samples,
      context.tilesetResolution.blocker ?? "source_direct_tileset_set_unavailable",
      context.tilesetResolution.tileSet ?? "missing_tileset"
    );
  }
  for (const blocker of context.modelSourceAudit?.topBlockers ?? []) {
    const sampleRefs = blocker.sampleModelOrTextureRefs ?? [];
    for (let index = 0; index < Math.max(1, blocker.count); index += 1) {
      addBlocker(
        counts,
        samples,
        blocker.blocker,
        sampleRefs[index % Math.max(1, sampleRefs.length)] ?? context.modelSourceAudit.statusCode
      );
    }
  }
  for (const blocker of context.renderContractBridge?.blockers ?? []) {
    addBlocker(
      counts,
      samples,
      blocker,
      context.renderContractBridge.entries?.[0]?.modelResRef ?? context.renderContractBridge.statusCode
    );
  }
  for (const entry of entries) {
    for (const blocker of entry.exactBlockers) {
      addBlocker(counts, samples, blocker, String(entry.tileId ?? entry.tileIndex));
    }
  }
  return [...counts.entries()]
    .map(([blocker, count]) => ({
      blocker,
      count,
      sampleTileIds: samples.get(blocker) ?? []
    }))
    .sort((left, right) => right.count - left.count || left.blocker.localeCompare(right.blocker))
    .slice(0, DEFAULT_SAMPLE_LIMIT);
}

function summarizeSourceDirectModelSamples(entries, limit) {
  const counts = new Map();
  for (const entry of entries) {
    if (!entry.modelResRef) {
      continue;
    }
    const current = counts.get(entry.modelResRef) ?? {
      modelResRef: entry.modelResRef,
      areaTileCount: 0,
      sampleTileIds: []
    };
    current.areaTileCount += 1;
    if (current.sampleTileIds.length < 6) {
      current.sampleTileIds.push(entry.tileId);
    }
    counts.set(entry.modelResRef, current);
  }
  return [...counts.values()]
    .sort((left, right) => right.areaTileCount - left.areaTileCount || left.modelResRef.localeCompare(right.modelResRef))
    .slice(0, limit);
}

function resolveSourceDirectReadinessStatus(totals, topBlockers) {
  if (totals.tilesTotal === 0) {
    return "blocked";
  }
  if (totals.tilesWithModelResRef > 0) {
    return topBlockers.length > 0 ? "partial" : "ready";
  }
  return "blocked";
}

function formatSourceDirectTileSample(entry) {
  return {
    tileIndex: entry.tileIndex,
    row: entry.row,
    col: entry.col,
    tileId: entry.tileId,
    modelResRef: entry.modelResRef,
    modelResRefSource: entry.modelResRefSource,
    orientation: entry.orientation,
    status: entry.status,
    exactBlockers: entry.exactBlockers
  };
}

async function readDirectSourceFile(path, source, resref) {
  const fileStat = await stat(path);
  return buildDirectSourceFile({
    path,
    source,
    resref,
    extension: path.split(".").pop()?.toLowerCase() ?? "",
    bytes: await readFile(path),
    size: fileStat.size,
    lastModified: fileStat.mtime.toISOString()
  });
}

function buildDirectSourceFile(input) {
  return {
    path: input.path,
    source: input.source,
    resref: input.resref,
    extension: input.extension,
    size: input.size ?? input.bytes.length,
    lastModified: input.lastModified ?? null,
    sha256: createHash("sha256").update(input.bytes).digest("hex"),
    bytes: input.bytes
  };
}

function summarizeDirectSourceFile(file) {
  if (!file) {
    return null;
  }
  return {
    path: file.path,
    source: file.source,
    resref: file.resref,
    extension: file.extension,
    size: file.size,
    lastModified: file.lastModified,
    sha256: file.sha256
  };
}

function summarizeDirectTilesetResolution(resolution) {
  return {
    status: resolution.status,
    blocker: resolution.blocker ?? null,
    tileSet: resolution.tileSet,
    source: resolution.source,
    attempts: resolution.attempts
  };
}

function resolveTileHakPaths(settings) {
  const hakRoot = mapRuntimeHostPath(settings.paths?.hakDirectoryPath);
  if (!hakRoot) {
    return [];
  }
  const profileId = settings.sources?.tile?.hakProfileId;
  const profileHaks = profileId ? settings.hakProfiles?.[profileId] ?? [] : [];
  const priorityHaks = settings.sources?.tile?.hakPriorityList ?? [];
  return [...priorityHaks, ...profileHaks]
    .filter((value) => String(value ?? "").trim().length > 0)
    .map((value) => join(hakRoot, String(value).trim()));
}

async function resolveSourceDirectPackedModuleCandidates(settings) {
  const candidates = [];
  const configuredPackedPath = mapRuntimeHostPath(settings.paths?.modulePackedPath);
  if (configuredPackedPath) {
    const fileStat = await statSafe(configuredPackedPath);
    if (fileStat?.isFile()) {
      candidates.push({
        path: configuredPackedPath,
        source: "runtime_module_packed_path",
        size: fileStat.size,
        lastModified: fileStat.mtime.toISOString()
      });
    }
  }
  const modulesRoot = join("C:", "Users", "enonw", "Documents", "Neverwinter Nights", "modules");
  const matches = await collectDirectoryMatches(
    modulesRoot,
    /the_last_city.*codex.*\.mod$|the_last_city.*\.mod$/iu,
    16
  );
  matches
    .sort((left, right) => scorePackedModuleName(right.path) - scorePackedModuleName(left.path))
    .forEach((match) => candidates.push({ ...match, source: "host_nwn_modules_directory" }));

  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = candidate.path.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function scorePackedModuleName(path) {
  const normalized = path.toLowerCase();
  let score = 0;
  if (normalized.includes("codex")) {
    score += 100;
  }
  if (normalized.includes("the_last_city")) {
    score += 50;
  }
  if (normalized.includes("pre-") || normalized.includes("backup") || normalized.includes("kopia")) {
    score -= 20;
  }
  return score;
}

function resolveVanillaKeyFileCandidates(vanillaDataPath) {
  if (!vanillaDataPath) {
    return [];
  }
  return ["nwn_base.key", "nwn_retail.key"].map((fileName) => join(vanillaDataPath, fileName));
}

function resolveTileModelCandidates(areaTiles) {
  const byModelResRef = new Map();
  for (const tile of areaTiles) {
    const modelResRef = normalizeModelResRef(tile.modelResRef);
    if (!modelResRef) {
      continue;
    }
    const current =
      byModelResRef.get(modelResRef) ??
      {
        modelResRef,
        tileId: buildTileCatalogCandidateId(modelResRef),
        areaTileCount: 0,
        sourceSamples: []
      };
    current.areaTileCount += 1;
    if (current.sourceSamples.length < DEFAULT_SAMPLE_LIMIT) {
      current.sourceSamples.push(formatAreaTileSample(tile));
    }
    byModelResRef.set(modelResRef, current);
  }
  return [...byModelResRef.values()].sort((left, right) =>
    left.modelResRef.localeCompare(right.modelResRef)
  );
}

async function processTileCandidates(candidates, tiles, processOptions) {
  const entries = new Array(candidates.length);
  let cursor = 0;
  const workerCount = Math.max(1, Math.min(processOptions.concurrency, candidates.length));
  const runWorker = async () => {
    while (cursor < candidates.length) {
      const index = cursor;
      cursor += 1;
      const candidate = candidates[index];
      entries[index] = await processOneTileCandidate(candidate, tiles, processOptions);
    }
  };
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return entries;
}

async function processOneTileCandidate(candidate, tiles, processOptions) {
  try {
    const processed = await tiles.processTile({
      tileId: candidate.tileId,
      bypassCache: processOptions.bypassCache
    });
    const tile = processed.tile;
    const renderAssetContract = tile.renderAssetContract ?? null;
    const sourceAsset = tile.sourceAsset ?? null;
    const blockers = resolveEntryBlockers({
      renderAssetContract,
      sourceAsset,
      processFailure: null
    });
    return {
      ...candidate,
      status: blockers.length > 0 ? "blocked" : "ready",
      processStatus: "ready",
      cacheKey: processed.cache.key,
      cacheHit: processed.cache.hit,
      processedTileResref: tile.resref,
      sourceAssetStatus: renderAssetContract?.sourceAssetStatus ?? (sourceAsset?.objectKey ? "ready" : "blocked"),
      sourceAssetRole: sourceAsset?.role ?? null,
      sourceAssetOrigin: sourceAsset?.origin ?? null,
      sourceAssetObjectKey: sourceAsset?.objectKey ?? null,
      sourceAssetExtension: sourceAsset?.extension ?? null,
      renderAssetContractPresent: Boolean(renderAssetContract),
      mdlSourceStatus: renderAssetContract?.mdlSourceStatus ?? null,
      mdlSourceObjectKey: renderAssetContract?.mdlSourceObjectKey ?? null,
      glbGeometryStatus: renderAssetContract?.glbGeometryStatus ?? null,
      textureDeliveryStatus: renderAssetContract?.textureDeliveryStatus ?? null,
      materialBindingStatus: renderAssetContract?.materialBindingStatus ?? null,
      rendererHandoffStatus: renderAssetContract?.rendererHandoffStatus ?? null,
      modelDeliveryStatus: renderAssetContract?.modelDeliveryStatus ?? null,
      modelAssetObjectKey: renderAssetContract?.modelAsset?.objectKey ?? null,
      modelAssetExtension: renderAssetContract?.modelAsset?.extension ?? null,
      modelAssetDeliveryUrl: renderAssetContract?.modelAsset?.deliveryUrl ?? null,
      materialTextureAssetCount: renderAssetContract?.materialTextureAssets?.length ?? 0,
      materialTextureAssetSample:
        renderAssetContract?.materialTextureAssets?.slice(0, 4).map((asset) => ({
          reference: asset.reference,
          resref: asset.resref,
          extension: asset.extension,
          objectKey: asset.objectKey,
          deliveryUrl: asset.deliveryUrl
        })) ?? [],
      expectedDerivedModelObjectKey: renderAssetContract?.expectedDerivedModelObjectKey ?? null,
      exactBlockers: blockers
    };
  } catch (error) {
    const blocker = formatProcessFailureBlocker(error);
    return {
      ...candidate,
      status: "blocked",
      processStatus: "failed",
      cacheKey: null,
      cacheHit: false,
      processedTileResref: null,
      sourceAssetStatus: "blocked",
      sourceAssetRole: null,
      sourceAssetOrigin: null,
      sourceAssetObjectKey: null,
      sourceAssetExtension: null,
      renderAssetContractPresent: false,
      mdlSourceStatus: null,
      mdlSourceObjectKey: null,
      glbGeometryStatus: null,
      textureDeliveryStatus: null,
      materialBindingStatus: null,
      rendererHandoffStatus: null,
      modelDeliveryStatus: null,
      modelAssetObjectKey: null,
      modelAssetExtension: null,
      modelAssetDeliveryUrl: null,
      materialTextureAssetCount: 0,
      materialTextureAssetSample: [],
      expectedDerivedModelObjectKey: null,
      exactBlockers: [blocker],
      error: formatErrorForReport(error)
    };
  }
}

function resolveEntryBlockers({ renderAssetContract, sourceAsset, processFailure }) {
  const blockers = new Set();
  if (processFailure) {
    blockers.add(processFailure);
  }
  if (!sourceAsset?.objectKey) {
    blockers.add("tile_source_asset_object_key_missing");
  }
  if (!renderAssetContract) {
    blockers.add("tile_render_asset_contract_missing");
    return [...blockers];
  }
  for (const blocker of renderAssetContract.blockers ?? []) {
    if (blocker && blocker !== "none") {
      blockers.add(blocker);
    }
  }
  if (renderAssetContract.sourceAssetStatus !== "ready") {
    blockers.add(`sourceAssetStatus:${renderAssetContract.sourceAssetStatus}`);
  }
  if (renderAssetContract.mdlSourceStatus !== "ready") {
    blockers.add(`mdlSourceStatus:${renderAssetContract.mdlSourceStatus}`);
  }
  if (renderAssetContract.glbGeometryStatus !== "ready") {
    blockers.add(renderAssetContract.glbGeometryStatus ?? "glbGeometryStatus:missing");
  }
  if (renderAssetContract.modelDeliveryStatus !== "ready") {
    blockers.add(renderAssetContract.modelDeliveryStatus ?? "modelDeliveryStatus:missing");
  }
  if (renderAssetContract.rendererHandoffStatus !== "ready") {
    blockers.add(renderAssetContract.rendererHandoffStatus ?? "rendererHandoffStatus:missing");
  }
  if (renderAssetContract.textureDeliveryStatus?.startsWith("blocked_")) {
    blockers.add(renderAssetContract.textureDeliveryStatus);
  }
  if (renderAssetContract.materialBindingStatus !== "ready") {
    blockers.add(renderAssetContract.materialBindingStatus ?? "materialBindingStatus:missing");
  }
  if (!renderAssetContract.modelAsset?.objectKey) {
    blockers.add("tile_model_asset_object_key_missing");
  }
  return [...blockers].sort((left, right) => left.localeCompare(right));
}

function summarizeTotals(areaTiles, candidates, entries) {
  return {
    tilesTotal: areaTiles.length,
    tilesWithModelResRef: areaTiles.filter((tile) => normalizeModelResRef(tile.modelResRef)).length,
    tilesMissingModelResRef: areaTiles.filter((tile) => !normalizeModelResRef(tile.modelResRef)).length,
    uniqueModelResRefs: candidates.length,
    processAttempted: entries.length,
    processReady: entries.filter((entry) => entry.processStatus === "ready").length,
    processFailed: entries.filter((entry) => entry.processStatus === "failed").length,
    sourceAssetCount: entries.filter((entry) => Boolean(entry.sourceAssetObjectKey)).length,
    sourceAssetReadyCount: entries.filter((entry) => entry.sourceAssetStatus === "ready").length,
    renderAssetContractCount: entries.filter((entry) => entry.renderAssetContractPresent).length,
    modelAssetReadyCount: entries.filter((entry) => Boolean(entry.modelAssetObjectKey)).length,
    modelDeliveryReadyCount: entries.filter((entry) => entry.modelDeliveryStatus === "ready").length,
    glbGeometryReadyCount: entries.filter((entry) => entry.glbGeometryStatus === "ready").length,
    rendererHandoffReadyCount: entries.filter((entry) => entry.rendererHandoffStatus === "ready").length,
    materialTextureAssetReadyCount: entries.filter((entry) => entry.materialTextureAssetCount > 0).length,
    materialBindingReadyCount: entries.filter((entry) => entry.materialBindingStatus === "ready").length,
    blockedCandidateCount: entries.filter((entry) => entry.status === "blocked").length,
    readyCandidateCount: entries.filter((entry) => entry.status === "ready").length
  };
}

function summarizeTopBlockers(entries, context) {
  const counts = new Map();
  const samples = new Map();
  if (context.tilesTotal === 0) {
    addBlocker(counts, samples, "area_tiles_missing_or_empty", "area__ikea");
  }
  if (context.areaTileModelMissingCount > 0) {
    addBlocker(
      counts,
      samples,
      "area_tile_model_resref_missing",
      `${context.areaTileModelMissingCount} tiles`
    );
  }
  for (const entry of entries) {
    for (const blocker of entry.exactBlockers) {
      addBlocker(counts, samples, blocker, entry.tileId);
    }
  }
  return [...counts.entries()]
    .map(([blocker, count]) => ({
      blocker,
      count,
      sampleTileIds: samples.get(blocker) ?? []
    }))
    .sort((left, right) => right.count - left.count || left.blocker.localeCompare(right.blocker))
    .slice(0, DEFAULT_SAMPLE_LIMIT);
}

function addBlocker(counts, samples, blocker, sample) {
  counts.set(blocker, (counts.get(blocker) ?? 0) + 1);
  const current = samples.get(blocker) ?? [];
  if (current.length < 6) {
    current.push(sample);
  }
  samples.set(blocker, current);
}

function resolveReadinessStatus(totals, topBlockers) {
  if (totals.tilesTotal === 0 || totals.uniqueModelResRefs === 0 || totals.processAttempted === 0) {
    return "blocked";
  }
  if (topBlockers.length === 0 && totals.readyCandidateCount === totals.processAttempted) {
    return "ready";
  }
  if (totals.readyCandidateCount > 0 || totals.modelAssetReadyCount > 0 || totals.sourceAssetReadyCount > 0) {
    return "partial";
  }
  return "blocked";
}

function formatAreaTileSample(tile) {
  return {
    tileInstanceId: tile.tileInstanceId,
    tileId: tile.tileId ?? null,
    modelResRef: tile.modelResRef ?? null,
    modelSource: tile.modelSource ?? null,
    tilesetResRef: tile.tilesetResRef,
    row: tile.row,
    col: tile.col,
    orientation: tile.orientation ?? null,
    fallbackReason: tile.fallbackReason ?? null
  };
}

function formatEntrySample(entry) {
  return {
    tileId: entry.tileId,
    modelResRef: entry.modelResRef,
    areaTileCount: entry.areaTileCount,
    status: entry.status,
    processStatus: entry.processStatus,
    sourceAssetStatus: entry.sourceAssetStatus,
    sourceAssetRole: entry.sourceAssetRole,
    sourceAssetObjectKey: entry.sourceAssetObjectKey,
    renderAssetContractPresent: entry.renderAssetContractPresent,
    modelDeliveryStatus: entry.modelDeliveryStatus,
    modelAssetObjectKey: entry.modelAssetObjectKey,
    materialBindingStatus: entry.materialBindingStatus,
    textureDeliveryStatus: entry.textureDeliveryStatus,
    exactBlockers: entry.exactBlockers
  };
}

function buildFatalAudit(error, context) {
  return {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    cwd: backendRoot,
    status: "error",
    auditCompleted: false,
    target: {
      requestedAreaId: TARGET_AREA_ID,
      requestedAreaQuery: TARGET_AREA_QUERY
    },
    canonicalParityPromoted: false,
    visualParityPromoted: false,
    localOnlyBackendAudit: true,
    blocker: context.blocker,
    blockerDetails: context.blockerDetails ?? null,
    error: formatErrorForReport(error)
  };
}

function classifyFatalBlocker(error) {
  const report = formatErrorForReport(error);
  const message = `${report.message ?? ""} ${report.code ?? ""}`.toLowerCase();
  if (report.code === "local_blob_mirror_unavailable") {
    return {
      code: "local_blob_mirror_unavailable",
      details: report.details
    };
  }
  if (report.code === "local_blob_mirror_read_only_put_blocked") {
    return {
      code: "local_blob_mirror_read_only_put_blocked",
      details: report.details
    };
  }
  if (report.code === "host_blob_storage_endpoint_unavailable") {
    return {
      code: "host_blob_storage_endpoint_unavailable",
      details: report.details
    };
  }
  if (report.code === "audit_blob_endpoint_invalid") {
    return {
      code: "audit_blob_endpoint_invalid",
      details: report.details
    };
  }
  if (report.code === "ENOTFOUND" && message.includes("seaweedfs")) {
    return {
      code: "module_blob_storage_endpoint_unresolvable",
      details:
        "runtime-settings blobStorage.endpoint resolves to seaweedfs; that DNS name is valid inside docker compose, but not from this host backend cwd process."
    };
  }
  if (
    report.code === "ECONNREFUSED" ||
    report.code === "ETIMEDOUT" ||
    report.code === "ENETUNREACH"
  ) {
    return {
      code: "module_blob_storage_endpoint_unreachable",
      details:
        "module snapshot blob storage could not be reached, so _IKEA tile source readiness could not inspect real snapshot objects."
    };
  }
  if (message.includes("area_not_found") || message.includes("ikea_area_not_found")) {
    return {
      code: "ikea_area_not_found_in_module_snapshot",
      details:
        "Areas repository did not expose area__ikea/_ikea from the active module snapshot."
    };
  }
  return {
    code: "backend_application_context_or_snapshot_unavailable",
    details:
      "Nest module context started, but a backend dependency failed before _IKEA tile source readiness could complete."
  };
}

function buildTileCatalogCandidateId(modelResRef) {
  const normalized = normalizeModelResRef(modelResRef);
  return normalized ? `tile_${normalized}`.slice(0, 80) : "tile_missing_model_resref";
}

function normalizeModelResRef(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gu, "_")
    .slice(0, 64);
}

function normalizeComparable(value) {
  return String(value ?? "").trim().toLowerCase();
}

function formatProcessFailureBlocker(error) {
  const report = formatErrorForReport(error);
  return `tile_process_failed:${report.code ?? "unknown"}:${normalizeBlockerText(report.message ?? report.name ?? "unknown_error")}`;
}

function normalizeBlockerText(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/gu, "_")
    .replace(/[^a-zA-Z0-9:_=./-]+/gu, "_")
    .slice(0, 180) || "empty_message";
}

function formatErrorForReport(error) {
  const response = typeof error?.getResponse === "function" ? error.getResponse() : null;
  const status = typeof error?.getStatus === "function" ? error.getStatus() : error?.status;
  const responseObject = typeof response === "object" && response !== null ? response : null;
  return {
    name: error instanceof Error ? error.name : typeof error,
    message:
      responseObject && typeof responseObject.message === "string"
        ? responseObject.message
        : error instanceof Error
          ? error.message
          : String(error),
    code:
      typeof error?.code === "string"
        ? error.code
        : responseObject && typeof responseObject.code === "string"
          ? responseObject.code
          : null,
    status: Number.isFinite(status) ? status : null,
    details: responseObject?.details ?? error?.details ?? null
  };
}

function parseArgs(argv) {
  const envBlobEndpoint = process.env.AREAS_AUDIT_BLOB_ENDPOINT?.trim() || null;
  const envLocalBlobMirror = process.env.AREAS_AUDIT_LOCAL_BLOB_MIRROR?.trim() || null;
  const envWriteLocalBlobMirror = parseBooleanEnv(process.env.AREAS_AUDIT_WRITE_LOCAL_BLOB_MIRROR);
  const parsed = {
    blobEndpoint: envBlobEndpoint,
    blobEndpointSource: envBlobEndpoint ? "env:AREAS_AUDIT_BLOB_ENDPOINT" : null,
    localBlobMirror: envLocalBlobMirror,
    localBlobMirrorSource: envLocalBlobMirror ? "env:AREAS_AUDIT_LOCAL_BLOB_MIRROR" : null,
    writeLocalBlobMirror: envWriteLocalBlobMirror,
    writeLocalBlobMirrorSource: envWriteLocalBlobMirror ? "env:AREAS_AUDIT_WRITE_LOCAL_BLOB_MIRROR" : null,
    bypassCache: true,
    includeEntries: false,
    concurrency: DEFAULT_CONCURRENCY,
    sampleLimit: DEFAULT_SAMPLE_LIMIT,
    entryLimit: DEFAULT_ENTRY_LIMIT,
    help: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }
    if (arg === "--no-bypass-cache") {
      parsed.bypassCache = false;
      continue;
    }
    if (arg === "--blobEndpoint") {
      parsed.blobEndpoint = argv[index + 1] ?? "";
      parsed.blobEndpointSource = "cli:--blobEndpoint";
      index += 1;
      continue;
    }
    if (arg === "--localBlobMirror") {
      parsed.localBlobMirror = argv[index + 1] ?? "";
      parsed.localBlobMirrorSource = "cli:--localBlobMirror";
      index += 1;
      continue;
    }
    if (arg === "--writeLocalBlobMirror") {
      parsed.writeLocalBlobMirror = true;
      parsed.writeLocalBlobMirrorSource = "cli:--writeLocalBlobMirror";
      continue;
    }
    if (arg === "--include-entries") {
      parsed.includeEntries = true;
      continue;
    }
    if (arg === "--concurrency") {
      parsed.concurrency = clampPositiveInteger(argv[index + 1], DEFAULT_CONCURRENCY, 16);
      index += 1;
      continue;
    }
    if (arg === "--sample-limit") {
      parsed.sampleLimit = clampPositiveInteger(argv[index + 1], DEFAULT_SAMPLE_LIMIT, 50);
      index += 1;
      continue;
    }
    if (arg === "--entry-limit") {
      parsed.entryLimit = clampPositiveInteger(argv[index + 1], DEFAULT_ENTRY_LIMIT, 500);
      index += 1;
    }
  }
  return parsed;
}

function parseBooleanEnv(value) {
  return /^(1|true|yes|on)$/iu.test(String(value ?? "").trim());
}

function clampPositiveInteger(value, fallback, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}

function formatNetworkCause(error) {
  if (error?.name === "AbortError") {
    return "probe_timeout";
  }
  const cause = error?.cause;
  if (cause?.code) {
    const address = cause.address ? ` ${cause.address}` : "";
    const port = cause.port ? `:${cause.port}` : "";
    return `${cause.code}${address}${port}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
