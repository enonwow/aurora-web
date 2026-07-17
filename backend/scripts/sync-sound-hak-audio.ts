import { S3Client, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, extname, isAbsolute, resolve } from "node:path";
import { NwnErfPackedModuleExtractorService } from "../src/modules/runtime-settings/adapters/outbound/nwn/nwn-erf-packed-module-extractor.service";
import {
  NWN_KEY_BIF_RESOURCE_TYPES,
  NwnKeyBifResourceReader
} from "../src/modules/runtime-settings/application/nwn-key-bif-resource-reader";
import type { RuntimeSettingsRecord } from "../src/modules/runtime-settings/domain/runtime-settings.types";

interface CliArgs {
  write: boolean;
  discoverVanilla: boolean;
  includeVanilla: boolean;
  source: SoundSyncSourceSelection;
  vanillaManifestLimit: number;
  vanillaManifestMaxBytes: number;
  settingsPath: string;
}

interface AudioSnapshotSummary {
  totalObjects: number;
  audioObjects: number;
  bySource: Record<string, number>;
}

const SUPPORTED_AUDIO_EXTENSIONS = new Set(["wav", "ogg", "bmu", "mp3"]);
const SOUND_SYNC_SOURCE_SELECTIONS = new Set(["all", "haks", "vanilla"]);
const DEFAULT_VANILLA_MANIFEST_LIMIT = 10;
const DEFAULT_VANILLA_MANIFEST_MAX_BYTES = 50 * 1024 * 1024;
const VANILLA_KEY_FILE_CANDIDATES = ["nwn_base.key", "nwn_retail.key"] as const;
const VANILLA_SOUND_RESOURCE_CANDIDATES = [
  {
    extension: "wav",
    resourceType: NWN_KEY_BIF_RESOURCE_TYPES.WAV
  },
  {
    extension: "bmu",
    resourceType: NWN_KEY_BIF_RESOURCE_TYPES.BMU
  },
  {
    extension: "mp3",
    resourceType: NWN_KEY_BIF_RESOURCE_TYPES.MP3
  }
] as const;

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const settings = resolveEffectiveSoundSyncSettings(readRuntimeSettings(args.settingsPath), args);
  const client = createS3Client(settings);
  const before = await summarizeAudioSnapshot(client, settings);
  const result = await syncConfiguredSoundHaks({
    client,
    settings,
    write: args.write,
    source: args.source,
    includeVanilla: args.includeVanilla,
    vanillaManifestLimit: args.vanillaManifestLimit,
    vanillaManifestMaxBytes: args.vanillaManifestMaxBytes
  });
  const after = await summarizeAudioSnapshot(client, settings);

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        mode: args.write ? "write" : "dry-run",
        before,
        result,
        after
      },
      null,
      2
    )
  );
}

export function resolveConfiguredSoundHakEntries(settings: RuntimeSettingsRecord): string[] {
  const source = settings.sources.sound;
  if (!source.includeHaks) {
    return [];
  }

  const entries =
    source.hakPriorityList.length > 0
      ? source.hakPriorityList
      : settings.hakProfiles[source.hakProfileId] ?? [];
  const normalized = entries
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => (entry.toLowerCase().endsWith(".hak") ? entry : `${entry}.hak`));

  return [...new Set(normalized)];
}

export function isSupportedSoundAssetName(fileName: string): boolean {
  const extension = fileName.trim().toLowerCase().split(".").pop() ?? "";
  return SUPPORTED_AUDIO_EXTENSIONS.has(extension);
}

type SoundSyncSourceSelection = "all" | "haks" | "vanilla";

export function shouldSyncSoundSource(
  source: "haks" | "vanilla",
  selection: SoundSyncSourceSelection
): boolean {
  return selection === "all" || selection === source;
}

async function syncConfiguredSoundHaks(input: {
  client: S3Client;
  settings: RuntimeSettingsRecord;
  write: boolean;
  source: SoundSyncSourceSelection;
  includeVanilla: boolean;
  vanillaManifestLimit: number;
  vanillaManifestMaxBytes: number;
}): Promise<{
  configuredHaks: string[];
  missingHaks: string[];
  scannedHaks: Array<{ hak: string; audioFiles: number; uploadedFiles: number }>;
  vanilla: {
    enabled: boolean;
    keyPath: string | null;
    resources: Array<{ extension: string; resourceType: number; count: number }>;
    directFiles: number;
    uploadedFiles: number;
    dryRunManifest: VanillaAudioDryRunManifest | null;
    blocker: string | null;
  };
}> {
  const configuredHaks = resolveConfiguredSoundHakEntries(input.settings);
  const extractor = new NwnErfPackedModuleExtractorService();
  const missingHaks: string[] = [];
  const scannedHaks: Array<{ hak: string; audioFiles: number; uploadedFiles: number }> = [];

  const shouldSyncHaks = shouldSyncSoundSource("haks", input.source);
  for (const hakEntry of shouldSyncHaks ? configuredHaks : []) {
    const hakPath = resolveHakPath(input.settings.paths.hakDirectoryPath, hakEntry);
    let extracted;
    try {
      extracted = await extractor.extractFromPackedModule(hakPath);
    } catch {
      missingHaks.push(hakEntry);
      continue;
    }

    const hakName = sanitizeSegment(basename(hakEntry, extname(hakEntry)));
    const audioFiles = extracted.filter((file) => isSupportedSoundAssetName(file.fileName));
    let uploadedFiles = 0;
    for (const file of audioFiles) {
      const fileName = `__aurora/sources/hak/${hakName}/${normalizeRelativePath(file.fileName)}`;
      if (input.write) {
        await putSnapshotObject(input.client, input.settings, fileName, Buffer.from(file.bytes));
      }
      uploadedFiles += input.write ? 1 : 0;
    }

    scannedHaks.push({
      hak: hakEntry,
      audioFiles: audioFiles.length,
      uploadedFiles
    });
  }

  const vanilla = await discoverVanillaSoundResources(
    {
      client: input.client,
      settings: input.settings,
      write: input.write,
      enabledBySourceSelection: shouldSyncSoundSource("vanilla", input.source),
      includeVanilla: input.includeVanilla
    },
    {
      candidateLimit: input.vanillaManifestLimit,
      maxBytes: input.vanillaManifestMaxBytes
    }
  );

  return {
    configuredHaks,
    missingHaks,
    scannedHaks,
    vanilla
  };
}

export function getVanillaSoundResourceCandidates(): Array<{
  extension: string;
  resourceType: number;
}> {
  return VANILLA_SOUND_RESOURCE_CANDIDATES.map((candidate) => ({ ...candidate }));
}

export function resolveEffectiveSoundSyncSettings(
  settings: RuntimeSettingsRecord,
  args: Pick<CliArgs, "write" | "discoverVanilla" | "includeVanilla">
): RuntimeSettingsRecord {
  if (args.discoverVanilla && args.write) {
    throw new Error("--discover-vanilla is dry-run only; do not combine it with --write.");
  }
  if (!args.discoverVanilla && !args.includeVanilla) {
    return settings;
  }
  return {
    ...settings,
    sources: {
      ...settings.sources,
      sound: {
        ...settings.sources.sound,
        includeVanilla: true
      }
    }
  };
}

interface VanillaAudioManifestSource {
  resref: string;
  extension: string;
  resourceType: number;
  sizeBytes: number;
  objectKey?: string;
  contentType?: string;
}

interface VanillaAudioUploadSource extends VanillaAudioManifestSource {
  bytes: Buffer;
}

interface VanillaAudioDryRunManifest {
  candidateLimit: number;
  maxBytes: number;
  includedCount: number;
  totalBytes: number;
  skippedDueToCandidateLimit: number;
  skippedDueToByteLimit: number;
  entries: Array<{
    resref: string;
    extension: string;
    resourceType: number;
    sizeBytes: number;
    objectKey: string;
    contentType: string;
  }>;
}

export function buildVanillaAudioDryRunManifest(
  candidates: VanillaAudioManifestSource[],
  limits: { candidateLimit: number; maxBytes: number }
): VanillaAudioDryRunManifest {
  const candidateLimit = Math.max(0, Math.floor(limits.candidateLimit));
  const maxBytes = Math.max(0, Math.floor(limits.maxBytes));
  const consideredCandidates = candidates.slice(0, candidateLimit);
  const entries: VanillaAudioDryRunManifest["entries"] = [];
  let totalBytes = 0;
  let skippedDueToByteLimit = 0;

  for (const candidate of consideredCandidates) {
    if (totalBytes + candidate.sizeBytes > maxBytes) {
      skippedDueToByteLimit += 1;
      continue;
    }
    const extension = candidate.extension.trim().toLowerCase();
    entries.push({
      resref: normalizeVanillaResref(candidate.resref),
      extension,
      resourceType: candidate.resourceType,
      sizeBytes: candidate.sizeBytes,
      objectKey: candidate.objectKey ?? buildVanillaAudioObjectKey(candidate.resref, extension),
      contentType: candidate.contentType ?? inferAudioContentType(extension)
    });
    totalBytes += candidate.sizeBytes;
  }

  return {
    candidateLimit,
    maxBytes,
    includedCount: entries.length,
    totalBytes,
    skippedDueToCandidateLimit: Math.max(0, candidates.length - consideredCandidates.length),
    skippedDueToByteLimit,
    entries
  };
}

export function buildVanillaAudioObjectKey(resref: string, extension: string): string {
  const normalizedExtension = extension.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "");
  return `__aurora/sources/vanilla/audio/${normalizedExtension}/${normalizeVanillaResref(resref)}.${normalizedExtension}`;
}

async function discoverVanillaSoundResources(
  input: {
    client: S3Client;
    settings: RuntimeSettingsRecord;
    write: boolean;
    enabledBySourceSelection: boolean;
    includeVanilla: boolean;
  },
  manifestLimits: { candidateLimit: number; maxBytes: number }
): Promise<{
  enabled: boolean;
  keyPath: string | null;
  resources: Array<{ extension: string; resourceType: number; count: number }>;
  uploadedFiles: number;
  directFiles: number;
  dryRunManifest: VanillaAudioDryRunManifest | null;
  blocker: string | null;
}> {
  const settings = input.settings;
  if (!input.enabledBySourceSelection || !settings.sources.sound.includeVanilla) {
    return {
      enabled: false,
      keyPath: null,
      resources: [],
      directFiles: 0,
      uploadedFiles: 0,
      dryRunManifest: null,
      blocker: null
    };
  }

  const vanillaRoot = settings.paths.vanillaDataPath.trim();
  const keyPath = await resolveVanillaKeyFile(vanillaRoot);
  if (!keyPath) {
    return {
      enabled: true,
      keyPath: null,
      resources: [],
      directFiles: 0,
      uploadedFiles: 0,
      dryRunManifest: null,
      blocker: "Vanilla sound discovery is enabled, but no supported vanilla KEY file was found."
    };
  }

  const reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
  const resources = VANILLA_SOUND_RESOURCE_CANDIDATES.map((candidate) => ({
    extension: candidate.extension,
    resourceType: candidate.resourceType,
    count: reader.list(candidate.resourceType).length
  }));
  const directSources = await readDirectVanillaAudioSources(settings.paths.vanillaDataPath.trim());
  const keyBifSources = await readVanillaManifestSources(
    reader,
    Math.max(0, manifestLimits.candidateLimit - directSources.length)
  );
  const manifestSources = [...directSources, ...keyBifSources];
  const dryRunManifest = buildVanillaAudioDryRunManifest(manifestSources, manifestLimits);
  let uploadedFiles = 0;
  if (input.write && input.includeVanilla) {
    const sourceByObjectKey = new Map(
      manifestSources.map((source) => [
        source.objectKey ?? buildVanillaAudioObjectKey(source.resref, source.extension),
        source
      ])
    );
    for (const entry of dryRunManifest.entries) {
      const source = sourceByObjectKey.get(entry.objectKey);
      if (!source) {
        continue;
      }
      await putSnapshotObject(
        input.client,
        settings,
        entry.objectKey,
        source.bytes,
        entry.contentType
      );
      uploadedFiles += 1;
    }
  }
  return {
    enabled: true,
    keyPath,
    resources,
    uploadedFiles,
    directFiles: directSources.length,
    dryRunManifest,
    blocker:
      input.write && input.includeVanilla
        ? null
        : "Vanilla audio discovery is read-only unless --write and --include-vanilla are both provided."
  };
}

async function readDirectVanillaAudioSources(
  vanillaRoot: string
): Promise<VanillaAudioUploadSource[]> {
  const root = resolve(vanillaRoot);
  return readDirectVanillaAudioSourcesFromDirectory(root, root);
}

async function readDirectVanillaAudioSourcesFromDirectory(
  rootPath: string,
  currentPath: string
): Promise<VanillaAudioUploadSource[]> {
  const output: VanillaAudioUploadSource[] = [];
  const entries = await readdir(currentPath, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = resolve(currentPath, entry.name);
    if (entry.isDirectory()) {
      output.push(...(await readDirectVanillaAudioSourcesFromDirectory(rootPath, absolutePath)));
      continue;
    }
    if (!entry.isFile() || !isSupportedSoundAssetName(entry.name)) {
      continue;
    }

    const extension = extname(entry.name).replace(/^\./u, "").toLowerCase();
    const bytes = await readFile(absolutePath);
    const relativePath = normalizeRelativePath(
      absolutePath.slice(rootPath.length).replace(/^[/\\]+/u, "")
    );
    output.push({
      resref: basename(entry.name, extname(entry.name)),
      extension,
      resourceType: getSoundResourceType(extension),
      sizeBytes: bytes.length,
      bytes,
      objectKey: `__aurora/sources/vanilla/audio/files/${relativePath}`,
      contentType: inferAudioContentType(extension)
    });
  }
  return output;
}

async function readVanillaManifestSources(
  reader: NwnKeyBifResourceReader,
  candidateLimit: number
): Promise<VanillaAudioUploadSource[]> {
  const manifestSources: VanillaAudioUploadSource[] = [];
  const maxCandidates = Math.max(0, Math.floor(candidateLimit));

  for (const candidate of VANILLA_SOUND_RESOURCE_CANDIDATES) {
    if (manifestSources.length >= maxCandidates) {
      break;
    }
    const resources = reader.list(candidate.resourceType);
    for (const resource of resources) {
      if (manifestSources.length >= maxCandidates) {
        break;
      }
      const bytes = await reader.read(resource.resref, candidate.resourceType);
      if (!bytes) {
        continue;
      }
      manifestSources.push({
        resref: resource.resref,
        extension: candidate.extension,
        resourceType: candidate.resourceType,
        sizeBytes: bytes.length,
        bytes
      });
    }
  }
  return manifestSources;
}

async function summarizeAudioSnapshot(
  client: S3Client,
  settings: RuntimeSettingsRecord
): Promise<AudioSnapshotSummary> {
  const prefix = normalizePrefix(settings.blobStorage.modulePrefix);
  let continuationToken: string | undefined;
  let totalObjects = 0;
  let audioObjects = 0;
  const bySource: Record<string, number> = {};

  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: settings.blobStorage.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000
      })
    );
    for (const object of page.Contents ?? []) {
      const key = object.Key ?? "";
      if (!key) {
        continue;
      }
      totalObjects += 1;
      if (!isSupportedSoundAssetName(key)) {
        continue;
      }
      audioObjects += 1;
      const source = resolveAudioSourceLabel(key);
      bySource[source] = (bySource[source] ?? 0) + 1;
    }
    continuationToken = page.NextContinuationToken;
  } while (continuationToken);

  return {
    totalObjects,
    audioObjects,
    bySource
  };
}

async function putSnapshotObject(
  client: S3Client,
  settings: RuntimeSettingsRecord,
  fileName: string,
  bytes: Buffer,
  contentType?: string
): Promise<void> {
  const key = `${normalizePrefix(settings.blobStorage.modulePrefix)}${fileName}`;
  await client.send(
    new PutObjectCommand({
      Bucket: settings.blobStorage.bucket,
      Key: key,
      Body: bytes,
      ContentType: contentType
    })
  );
}

function readRuntimeSettings(settingsPath: string): RuntimeSettingsRecord {
  return JSON.parse(readFileSync(resolve(settingsPath), "utf-8")) as RuntimeSettingsRecord;
}

function createS3Client(settings: RuntimeSettingsRecord): S3Client {
  return new S3Client({
    endpoint: settings.blobStorage.endpoint,
    region: settings.blobStorage.region,
    credentials: {
      accessKeyId: settings.blobStorage.accessKeyId,
      secretAccessKey: settings.blobStorage.secretAccessKey
    },
    forcePathStyle: settings.blobStorage.forcePathStyle
  });
}

function resolveHakPath(hakDirectoryPath: string, entry: string): string {
  return isAbsolute(entry) ? entry : resolve(hakDirectoryPath, entry);
}

async function resolveVanillaKeyFile(vanillaRoot: string): Promise<string | null> {
  if (!vanillaRoot) {
    return null;
  }
  for (const fileName of VANILLA_KEY_FILE_CANDIDATES) {
    const candidate = resolve(vanillaRoot, fileName);
    try {
      const metadata = await stat(candidate);
      if (metadata.isFile()) {
        return candidate;
      }
    } catch {
      // Try the next known vanilla KEY name.
    }
  }
  return null;
}

function resolveAudioSourceLabel(key: string): string {
  const match = key.match(/__aurora\/sources\/hak\/([^/]+)\//u);
  if (match) {
    return `hak/${match[1]}`;
  }
  if (key.includes("__aurora/sources/vanilla/")) {
    return "vanilla";
  }
  return "other";
}

function inferAudioContentType(extension: string): string {
  if (extension === "wav") {
    return "audio/wav";
  }
  if (extension === "mp3" || extension === "bmu") {
    return "audio/mpeg";
  }
  return "audio/ogg";
}

function getSoundResourceType(extension: string): number {
  if (extension === "wav") {
    return NWN_KEY_BIF_RESOURCE_TYPES.WAV;
  }
  if (extension === "bmu") {
    return NWN_KEY_BIF_RESOURCE_TYPES.BMU;
  }
  if (extension === "mp3") {
    return NWN_KEY_BIF_RESOURCE_TYPES.MP3;
  }
  return 0;
}

function normalizeVanillaResref(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/gu, "_")
      .replace(/^_+|_+$/gu, "")
      .slice(0, 64) || "sound"
  );
}

function sanitizeSegment(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9._-]+/gu, "_").replace(/^_+|_+$/gu, "") || "hak";
}

function normalizePrefix(value: string): string {
  const trimmed = value.trim().replace(/^\/+/u, "").replace(/\/+$/u, "");
  return trimmed ? `${trimmed}/` : "";
}

function normalizeRelativePath(value: string): string {
  return value.replace(/\\/gu, "/").replace(/^\/+/u, "");
}

function parseArgs(argv: string[]): CliArgs {
  const flags = new Set(argv);
  const settingsIndex = argv.indexOf("--settings");
  const vanillaManifestLimit = parsePositiveIntegerFlag(
    argv,
    "--vanilla-manifest-limit",
    DEFAULT_VANILLA_MANIFEST_LIMIT
  );
  const vanillaManifestMaxBytes = parsePositiveIntegerFlag(
    argv,
    "--vanilla-manifest-max-bytes",
    DEFAULT_VANILLA_MANIFEST_MAX_BYTES
  );
  return {
    write: flags.has("--write"),
    discoverVanilla: flags.has("--discover-vanilla"),
    includeVanilla: flags.has("--include-vanilla"),
    source: parseSoundSyncSourceSelection(argv),
    vanillaManifestLimit,
    vanillaManifestMaxBytes,
    settingsPath:
      settingsIndex >= 0 && argv[settingsIndex + 1]
        ? argv[settingsIndex + 1]
        : "config/runtime-settings.json"
  };
}

function parseSoundSyncSourceSelection(argv: string[]): SoundSyncSourceSelection {
  const sourceIndex = argv.indexOf("--source");
  const rawValue = sourceIndex >= 0 ? argv[sourceIndex + 1] : undefined;
  const normalized = rawValue?.trim().toLowerCase();
  return normalized && SOUND_SYNC_SOURCE_SELECTIONS.has(normalized)
    ? (normalized as SoundSyncSourceSelection)
    : "all";
}

function parsePositiveIntegerFlag(argv: string[], name: string, fallback: number): number {
  const index = argv.indexOf(name);
  if (index < 0) {
    return fallback;
  }
  const raw = argv[index + 1];
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

if (require.main === module) {
  main().catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });
}
