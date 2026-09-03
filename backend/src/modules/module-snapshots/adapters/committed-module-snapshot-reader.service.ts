import { Inject, Injectable, Optional } from "@nestjs/common";
import {
  MODULE_BLOB_STORAGE,
  type ModuleBlobObjectPayload,
  type ModuleBlobObjectSummary,
  type ModuleBlobStoragePort,
} from "../../runtime-settings/application/ports/module-blob-storage.port";
import {
  RUNTIME_SETTINGS_REPOSITORY,
  type RuntimeSettingsRepositoryPort,
} from "../../runtime-settings/application/ports/runtime-settings-repository.port";
import type { BlobStorageSettings } from "../../runtime-settings/domain/runtime-settings.types";
import {
  ATOMIC_MODULE_SNAPSHOT_REPOSITORY,
  type AtomicModuleSnapshotRepositoryPort,
} from "../../areas/application/ports/atomic-module-snapshot.port";
import {
  buildModuleSnapshotManifestKey,
  hashModuleSnapshotManifest,
  type ModuleSnapshotManifest,
} from "../../areas/domain/module-snapshot-manifest";
import type {
  CapturedCommittedModuleObjectDescriptor,
  CapturedCommittedModuleSnapshot,
  CommittedModuleSnapshotReaderPort,
} from "../application/ports/committed-module-snapshot-reader.port";
import { deriveWorkspaceModuleId } from "../domain/workspace-module-id";
import { ModuleSnapshotBootstrapApplicationService } from "../../areas/application/module-snapshot-bootstrap.application.service";

const MAX_INTERNAL_LIST_PAGES = 100;
const INTERNAL_LIST_PAGE_SIZE = 1_000;

@Injectable()
export class CommittedModuleSnapshotReaderService
  implements CommittedModuleSnapshotReaderPort
{
  constructor(
    @Inject(ATOMIC_MODULE_SNAPSHOT_REPOSITORY)
    private readonly repository: AtomicModuleSnapshotRepositoryPort,
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly settingsRepository: RuntimeSettingsRepositoryPort,
    @Inject(MODULE_BLOB_STORAGE)
    private readonly rawStorage: ModuleBlobStoragePort,
    @Optional()
    private readonly bootstrap?: ModuleSnapshotBootstrapApplicationService,
  ) {}

  async capture(): Promise<CapturedCommittedModuleSnapshot> {
    const settings = (await this.settingsRepository.get()).blobStorage;
    const moduleId = deriveWorkspaceModuleId(settings);
    let head = await this.repository.readHead(moduleId);
    if (!head && this.bootstrap) {
      await this.bootstrap.ensureBootstrapped(moduleId);
      head = await this.repository.readHead(moduleId);
    }
    if (!head || head.quarantined) {
      throw readerError(
        head?.quarantined
          ? "MODULE_SNAPSHOT_READER_QUARANTINED"
          : "MODULE_SNAPSHOT_READER_NOT_BOOTSTRAPPED",
        head?.quarantined
          ? "The committed module snapshot is quarantined."
          : "The committed module snapshot has not been bootstrapped.",
      );
    }
    const manifest = await this.repository.readManifest(head.manifestKey);
    if (
      !manifest ||
      manifest.moduleId !== moduleId ||
      manifest.revision !== head.revision ||
      buildModuleSnapshotManifestKey(manifest) !== head.manifestKey ||
      hashModuleSnapshotManifest(manifest) !== head.manifestSha256
    ) {
      throw readerError(
        "MODULE_SNAPSHOT_READER_MANIFEST_INVALID",
        "The captured head does not resolve to its exact committed manifest.",
      );
    }
    return new CapturedSnapshot(
      settings,
      manifest,
      head.updatedAt,
      this.repository,
      this.rawStorage,
    );
  }
}

class CapturedSnapshot implements CapturedCommittedModuleSnapshot {
  readonly moduleId: string;
  readonly revision: string;
  readonly capturedAt: string;
  private internalObjectsPromise?: Promise<readonly ModuleBlobObjectSummary[]>;
  private readonly committedDescriptors: readonly CapturedCommittedModuleObjectDescriptor[];
  private readonly descriptorByLogicalKey: ReadonlyMap<
    string,
    ModuleSnapshotManifest["objects"][number]
  >;

  constructor(
    private readonly settings: BlobStorageSettings,
    private readonly manifest: ModuleSnapshotManifest,
    capturedAt: string,
    private readonly repository: AtomicModuleSnapshotRepositoryPort,
    private readonly rawStorage: ModuleBlobStoragePort,
  ) {
    this.moduleId = manifest.moduleId;
    this.revision = manifest.revision;
    this.capturedAt = capturedAt;
    this.committedDescriptors = Object.freeze(
      manifest.objects.map((object) => Object.freeze({
        logicalKey: object.logicalKey,
        resourceType: object.resourceType,
        size: object.size,
        sha256: object.sha256,
      })),
    );
    this.descriptorByLogicalKey = new Map(
      manifest.objects.map((object) => [object.logicalKey.toLowerCase(), object]),
    );
  }

  listCommittedObjectDescriptors(): readonly CapturedCommittedModuleObjectDescriptor[] {
    return this.committedDescriptors;
  }

  async listModuleSnapshot(
    options: Readonly<{ limit?: number; continuationToken?: string }> = {},
  ) {
    const limit = Math.min(Math.max(Number(options.limit ?? 1_000), 1), 50_000);
    const offset = decodeContinuationToken(options.continuationToken, this.revision);
    const prefix = normalizePrefix(this.settings.modulePrefix);
    const committed: ModuleBlobObjectSummary[] = this.manifest.objects.map((object) => ({
      key: `${prefix}${object.logicalKey}`,
      size: object.size,
      etag: object.sha256,
      lastModified: this.capturedAt,
    }));
    const internal = await this.internalObjects();
    const all = [...committed, ...internal].sort((left, right) =>
      left.key.toLowerCase().localeCompare(right.key.toLowerCase(), "en"),
    );
    const page = all.slice(offset, offset + limit);
    const nextOffset = offset + page.length;
    const truncated = nextOffset < all.length;
    return Object.freeze({
      bucket: this.settings.bucket,
      prefix,
      moduleHash: this.revision,
      manifestFileCount: this.manifest.objects.length,
      totalFiles: all.length,
      totalBytes: all.reduce((sum, object) => sum + object.size, 0),
      objects: [...page],
      truncated,
      continuationToken: truncated
        ? encodeContinuationToken(this.revision, nextOffset)
        : undefined,
    });
  }

  async getModuleObject(key: string): Promise<ModuleBlobObjectPayload | null> {
    const prefix = normalizePrefix(this.settings.modulePrefix);
    if (!key.startsWith(prefix)) {
      return null;
    }
    const logicalKey = key.slice(prefix.length);
    if (isInternal(logicalKey)) {
      return this.rawStorage.getModuleObject(this.settings, key);
    }
    const descriptor = this.descriptorByLogicalKey.get(logicalKey.toLowerCase());
    if (!descriptor || descriptor.logicalKey !== logicalKey) {
      return null;
    }
    const content = await this.repository.readContent(descriptor.contentKey);
    if (
      !content ||
      content.size !== descriptor.size ||
      content.sha256 !== descriptor.sha256 ||
      content.bytes.length !== descriptor.size
    ) {
      throw readerError(
        "MODULE_SNAPSHOT_READER_CONTENT_INVALID",
        `Committed module content failed readback: ${logicalKey}.`,
      );
    }
    return Object.freeze({
      key,
      size: content.size,
      contentType: inferContentType(logicalKey),
      etag: content.sha256,
      lastModified: this.capturedAt,
      bytes: Buffer.from(content.bytes),
    });
  }

  private internalObjects(): Promise<readonly ModuleBlobObjectSummary[]> {
    this.internalObjectsPromise ??= listInternalObjects(this.rawStorage, this.settings);
    return this.internalObjectsPromise;
  }
}

async function listInternalObjects(
  storage: ModuleBlobStoragePort,
  settings: BlobStorageSettings,
): Promise<readonly ModuleBlobObjectSummary[]> {
  const prefix = `${normalizePrefix(settings.modulePrefix)}__aurora/`;
  const internalSettings = Object.freeze({
    ...settings,
    modulePrefix: prefix.slice(0, -1),
  });
  const objects: ModuleBlobObjectSummary[] = [];
  const seenTokens = new Set<string>();
  let continuationToken: string | undefined;
  for (let pageNumber = 0; pageNumber < MAX_INTERNAL_LIST_PAGES; pageNumber += 1) {
    const page = await storage.listModuleSnapshot(internalSettings, {
      limit: INTERNAL_LIST_PAGE_SIZE,
      continuationToken,
    });
    objects.push(
      ...page.objects.filter((object) => object.key.startsWith(prefix)),
    );
    if (!page.truncated) {
      return Object.freeze(objects);
    }
    const next = page.continuationToken;
    if (!next || seenTokens.has(next)) {
      throw readerError(
        "MODULE_SNAPSHOT_READER_INTERNAL_LIST_INVALID",
        "Internal source listing returned a missing or repeated continuation token.",
      );
    }
    seenTokens.add(next);
    continuationToken = next;
  }
  throw readerError(
    "MODULE_SNAPSHOT_READER_INTERNAL_LIST_BUDGET_EXCEEDED",
    `Internal source listing exceeded ${MAX_INTERNAL_LIST_PAGES} pages.`,
  );
}

function normalizePrefix(value: string): string {
  const normalized = value.trim().replace(/\\/gu, "/").replace(/^\/+|\/+$/gu, "");
  return normalized ? `${normalized}/` : "";
}

function isInternal(logicalKey: string): boolean {
  return logicalKey.split("/", 1)[0].toLowerCase() === "__aurora";
}

function encodeContinuationToken(revision: string, offset: number): string {
  return Buffer.from(JSON.stringify({ revision, offset }), "utf8").toString("base64url");
}

function decodeContinuationToken(token: string | undefined, revision: string): number {
  if (!token) return 0;
  try {
    const parsed = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as {
      revision?: unknown;
      offset?: unknown;
    };
    if (
      parsed.revision !== revision ||
      !Number.isSafeInteger(parsed.offset) ||
      Number(parsed.offset) < 0
    ) {
      throw new Error("invalid");
    }
    return Number(parsed.offset);
  } catch {
    throw readerError(
      "MODULE_SNAPSHOT_READER_CONTINUATION_INVALID",
      "The committed snapshot continuation token is invalid or belongs to another revision.",
    );
  }
}

function inferContentType(key: string): string {
  const lower = key.toLowerCase();
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".txt") || lower.endsWith(".2da") || lower.endsWith(".set")) {
    return "text/plain; charset=utf-8";
  }
  return "application/octet-stream";
}

function readerError(code: string, message: string): Error {
  return new Error(`${code}: ${message}`);
}
