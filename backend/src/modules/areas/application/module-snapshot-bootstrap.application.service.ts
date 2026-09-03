import { createHash } from "node:crypto";
import { Inject, Injectable, Optional } from "@nestjs/common";
import {
  MODULE_BLOB_STORAGE,
  type ModuleBlobObjectSummary,
  type ModuleBlobStoragePort,
} from "../../runtime-settings/application/ports/module-blob-storage.port";
import {
  RUNTIME_SETTINGS_REPOSITORY,
  type RuntimeSettingsRepositoryPort,
} from "../../runtime-settings/application/ports/runtime-settings-repository.port";
import { nwnErfResourceTypeForFileName } from "../../runtime-settings/domain/nwn-erf-resource-types";
import type { BlobStorageSettings } from "../../runtime-settings/domain/runtime-settings.types";
import { deriveWorkspaceModuleId } from "../../module-snapshots/domain/workspace-module-id";
import {
  ATOMIC_MODULE_SNAPSHOT_REPOSITORY,
  type AtomicModuleSnapshotRepositoryPort,
  type ModuleSnapshotHead,
} from "./ports/atomic-module-snapshot.port";
import {
  buildModuleSnapshotManifestKey,
  createModuleSnapshotManifest,
  hashModuleSnapshotManifest,
  type ModuleSnapshotManifest,
} from "../domain/module-snapshot-manifest";

const LIST_PAGE_SIZE = 1_000;
const MAX_LIST_PAGES = 200;
export const MODULE_SNAPSHOT_BOOTSTRAP_CLOCK = Symbol(
  "MODULE_SNAPSHOT_BOOTSTRAP_CLOCK",
);

export interface ModuleSnapshotBootstrapResult {
  readonly status: "bootstrapped" | "already_bootstrapped";
  readonly head: ModuleSnapshotHead;
  readonly objectCount: number;
  readonly totalBytes: number;
}

interface MutableInventoryObject extends ModuleBlobObjectSummary {
  readonly logicalKey: string;
}

interface MutableInventory {
  readonly moduleHash?: string;
  readonly objects: readonly MutableInventoryObject[];
}

@Injectable()
export class ModuleSnapshotBootstrapApplicationService {
  private readonly inFlightByModuleId = new Map<
    string,
    Promise<ModuleSnapshotBootstrapResult>
  >();

  constructor(
    @Inject(ATOMIC_MODULE_SNAPSHOT_REPOSITORY)
    private readonly repository: AtomicModuleSnapshotRepositoryPort,
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly settingsRepository: RuntimeSettingsRepositoryPort,
    @Inject(MODULE_BLOB_STORAGE)
    private readonly blobStorage: ModuleBlobStoragePort,
    @Optional() @Inject(MODULE_SNAPSHOT_BOOTSTRAP_CLOCK)
    now?: () => Date,
  ) {
    this.now = now ?? (() => new Date());
  }

  private readonly now: () => Date;

  async ensureCurrentWorkspaceBootstrapped(): Promise<ModuleSnapshotBootstrapResult> {
    const { blobStorage: settings } = await this.settingsRepository.get();
    return this.ensureBootstrappedSingleFlight(
      deriveWorkspaceModuleId(settings),
      settings,
    );
  }

  async ensureBootstrapped(moduleId: string): Promise<ModuleSnapshotBootstrapResult> {
    const { blobStorage: settings } = await this.settingsRepository.get();
    return this.ensureBootstrappedSingleFlight(moduleId, settings);
  }

  private async ensureBootstrappedSingleFlight(
    moduleId: string,
    settings: BlobStorageSettings,
  ): Promise<ModuleSnapshotBootstrapResult> {
    const existing = this.inFlightByModuleId.get(moduleId);
    if (existing) {
      return existing;
    }
    const pending = this.ensureBootstrappedFromSettings(moduleId, settings);
    this.inFlightByModuleId.set(moduleId, pending);
    try {
      return await pending;
    } finally {
      if (this.inFlightByModuleId.get(moduleId) === pending) {
        this.inFlightByModuleId.delete(moduleId);
      }
    }
  }

  private async ensureBootstrappedFromSettings(
    moduleId: string,
    settings: BlobStorageSettings,
  ): Promise<ModuleSnapshotBootstrapResult> {
    const current = await this.repository.readHead(moduleId);
    if (current) {
      const manifest = await this.verifyHead(current);
      return freezeResult("already_bootstrapped", current, manifest);
    }

    const before = await this.inventory(settings);
    const captured = await this.captureContents(settings, before.objects);
    const after = await this.inventory(settings);
    if (!sameInventory(before, after)) {
      throw bootstrapError(
        "AREA_SNAPSHOT_BOOTSTRAP_UNSTABLE",
        "Mutable module snapshot changed while its baseline was being captured.",
      );
    }

    const manifest = createModuleSnapshotManifest({
      moduleId,
      parentRevision: null,
      objects: before.objects.map((object) => {
        const bytes = captured[object.logicalKey];
        return Object.freeze({
          logicalKey: object.logicalKey,
          resourceType: requireResourceType(object.logicalKey),
          size: bytes.length,
          sha256: sha256Hex(bytes),
        });
      }),
    });
    const head = await this.repository.bootstrap(
      manifest,
      captured,
      this.now().toISOString(),
    );
    const persisted = await this.verifyHead(head, captured);
    return freezeResult("bootstrapped", head, persisted);
  }

  private async inventory(settings: BlobStorageSettings): Promise<MutableInventory> {
    const expectedPrefix = normalizePrefix(settings.modulePrefix);
    if (!expectedPrefix) {
      throw bootstrapError(
        "AREA_SNAPSHOT_BOOTSTRAP_INVALID_SOURCE",
        "blobStorage.modulePrefix must not be empty.",
      );
    }
    const objects = new Map<string, MutableInventoryObject>();
    const continuationTokens = new Set<string>();
    let continuationToken: string | undefined;
    let moduleHash: string | undefined;

    for (let pageNumber = 0; pageNumber < MAX_LIST_PAGES; pageNumber += 1) {
      const page = await this.blobStorage.listModuleSnapshot(settings, {
        limit: LIST_PAGE_SIZE,
        continuationToken,
      });
      const pagePrefix = normalizePrefix(page.prefix);
      if (pagePrefix !== expectedPrefix) {
        throw bootstrapError(
          "AREA_SNAPSHOT_BOOTSTRAP_INVALID_SOURCE",
          "Blob listing returned an unexpected module prefix.",
        );
      }
      if (moduleHash !== undefined && page.moduleHash !== undefined && page.moduleHash !== moduleHash) {
        throw bootstrapError(
          "AREA_SNAPSHOT_BOOTSTRAP_UNSTABLE",
          "Mutable module manifest changed between listing pages.",
        );
      }
      moduleHash ??= page.moduleHash;

      for (const object of page.objects) {
        if (!object.key.startsWith(expectedPrefix)) {
          throw bootstrapError(
            "AREA_SNAPSHOT_BOOTSTRAP_INVALID_SOURCE",
            `Blob object is outside the configured module prefix: ${object.key}.`,
          );
        }
        const logicalKey = object.key.slice(expectedPrefix.length);
        if (!logicalKey || isNonModuleLogicalKey(logicalKey)) {
          continue;
        }
        if (objects.has(object.key)) {
          throw bootstrapError(
            "AREA_SNAPSHOT_BOOTSTRAP_INVALID_SOURCE",
            `Blob listing repeated module object: ${object.key}.`,
          );
        }
        requireResourceType(logicalKey);
        objects.set(
          object.key,
          Object.freeze({
            key: object.key,
            logicalKey,
            size: object.size,
            lastModified: object.lastModified,
            etag: object.etag,
          }),
        );
      }

      if (!page.truncated) {
        const sorted = [...objects.values()].sort((left, right) =>
          left.logicalKey.toLowerCase().localeCompare(right.logicalKey.toLowerCase(), "en"),
        );
        if (sorted.length === 0) {
          throw bootstrapError(
            "AREA_SNAPSHOT_BOOTSTRAP_EMPTY",
            "Mutable module snapshot contains no module resources.",
          );
        }
        return Object.freeze({ moduleHash, objects: Object.freeze(sorted) });
      }
      const next = page.continuationToken;
      if (!next || continuationTokens.has(next)) {
        throw bootstrapError(
          "AREA_SNAPSHOT_BOOTSTRAP_INVALID_SOURCE",
          "Blob listing returned a missing or repeated continuation token.",
        );
      }
      continuationTokens.add(next);
      continuationToken = next;
    }
    throw bootstrapError(
      "AREA_SNAPSHOT_BOOTSTRAP_BUDGET_EXCEEDED",
      `Mutable module listing exceeded ${MAX_LIST_PAGES} pages.`,
    );
  }

  private async captureContents(
    settings: BlobStorageSettings,
    objects: readonly MutableInventoryObject[],
  ): Promise<Readonly<Record<string, Buffer>>> {
    const contents: Record<string, Buffer> = Object.create(null) as Record<string, Buffer>;
    for (const object of objects) {
      const payload = await this.blobStorage.getModuleObject(settings, object.key);
      if (!payload) {
        throw bootstrapError(
          "AREA_SNAPSHOT_BOOTSTRAP_UNSTABLE",
          `Module object disappeared during bootstrap: ${object.key}.`,
        );
      }
      if (
        payload.key !== object.key ||
        payload.size !== object.size ||
        payload.bytes.length !== object.size ||
        (object.etag !== undefined &&
          payload.etag !== undefined &&
          payload.etag !== object.etag) ||
        (object.lastModified !== undefined &&
          payload.lastModified !== undefined &&
          payload.lastModified !== object.lastModified)
      ) {
        throw bootstrapError(
          "AREA_SNAPSHOT_BOOTSTRAP_UNSTABLE",
          `Module object changed during bootstrap: ${object.key}.`,
        );
      }
      contents[object.logicalKey] = Buffer.from(payload.bytes);
    }
    return Object.freeze(contents);
  }

  private async verifyHead(
    head: ModuleSnapshotHead,
    expectedContents?: Readonly<Record<string, Buffer>>,
  ): Promise<ModuleSnapshotManifest> {
    if (head.quarantined) {
      throw bootstrapError(
        "AREA_SNAPSHOT_MODULE_QUARANTINED",
        "Module snapshot is quarantined.",
      );
    }
    const manifest = await this.repository.readManifest(head.manifestKey);
    if (
      !manifest ||
      manifest.moduleId !== head.moduleId ||
      manifest.revision !== head.revision ||
      buildModuleSnapshotManifestKey(manifest) !== head.manifestKey ||
      hashModuleSnapshotManifest(manifest) !== head.manifestSha256
    ) {
      throw bootstrapError(
        "AREA_SNAPSHOT_BOOTSTRAP_READBACK_FAILED",
        "Module snapshot head does not resolve to its exact manifest.",
      );
    }
    for (const descriptor of manifest.objects) {
      const content = await this.repository.readContent(descriptor.contentKey);
      if (
        !content ||
        content.contentKey !== descriptor.contentKey ||
        content.size !== descriptor.size ||
        content.bytes.length !== descriptor.size ||
        content.sha256 !== descriptor.sha256 ||
        sha256Hex(content.bytes) !== descriptor.sha256 ||
        (expectedContents !== undefined &&
          (!expectedContents[descriptor.logicalKey] ||
            !content.bytes.equals(expectedContents[descriptor.logicalKey])))
      ) {
        throw bootstrapError(
          "AREA_SNAPSHOT_BOOTSTRAP_READBACK_FAILED",
          `Module snapshot content readback failed: ${descriptor.logicalKey}.`,
        );
      }
    }
    return manifest;
  }
}

function normalizePrefix(value: string): string {
  const normalized = value.trim().replace(/\\/gu, "/").replace(/^\/+|\/+$/gu, "");
  return normalized ? `${normalized}/` : "";
}

function isNonModuleLogicalKey(logicalKey: string): boolean {
  const root = logicalKey.split("/", 1)[0].toLowerCase();
  return root === "__aurora" || root === "cache";
}

function requireResourceType(logicalKey: string): number {
  const resourceType = nwnErfResourceTypeForFileName(logicalKey);
  if (resourceType === null) {
    throw bootstrapError(
      "AREA_SNAPSHOT_BOOTSTRAP_UNKNOWN_RESOURCE_TYPE",
      `Cannot derive an NWN resource type for ${logicalKey}.`,
    );
  }
  return resourceType;
}

function sameInventory(left: MutableInventory, right: MutableInventory): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function freezeResult(
  status: ModuleSnapshotBootstrapResult["status"],
  head: ModuleSnapshotHead,
  manifest: ModuleSnapshotManifest,
): ModuleSnapshotBootstrapResult {
  return Object.freeze({
    status,
    head,
    objectCount: manifest.objects.length,
    totalBytes: manifest.objects.reduce((sum, object) => sum + object.size, 0),
  });
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function bootstrapError(code: string, message: string): Error {
  return new Error(`${code}: ${message}`);
}
