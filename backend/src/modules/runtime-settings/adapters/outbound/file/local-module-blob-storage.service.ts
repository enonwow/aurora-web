import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import type {
  ModuleBlobObjectPayload,
  ModuleBlobObjectSummary,
  ModuleBlobSnapshotSummary,
  ModuleBlobStoragePort,
  ModuleBlobSyncResult
} from "../../../application/ports/module-blob-storage.port";
import type { PackedModuleFile } from "../../../application/ports/packed-module-extractor.port";
import type { BlobStorageSettings } from "../../../domain/runtime-settings.types";

@Injectable()
export class LocalModuleBlobStorageService implements ModuleBlobStoragePort {
  constructor(private readonly config: AppConfigService) {}

  async replaceModuleSnapshot(
    settings: BlobStorageSettings,
    files: PackedModuleFile[]
  ): Promise<ModuleBlobSyncResult> {
    const prefix = normalizePrefix(settings.modulePrefix);
    const root = this.resolveRoot();
    const written: ModuleBlobObjectSummary[] = [];

    for (const file of files) {
      const key = `${prefix}${normalizeFileName(file.fileName)}`;
      const path = safeJoinObjectKey(root, key);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, Buffer.from(file.bytes));
      written.push({
        key,
        size: file.bytes.length,
        etag: sha256Hex(file.bytes),
        lastModified: new Date().toISOString()
      });
    }

    await this.writeManifest(root, prefix, written);

    return {
      bucket: settings.bucket,
      prefix,
      moduleHash: hashObjectSummaries(written),
      status: "updated",
      uploadedFiles: written.length,
      uploadedBytes: written.reduce((sum, object) => sum + object.size, 0),
      deletedFiles: 0,
      deletedBytes: 0,
      unchangedFiles: 0,
      totalFiles: written.length
    };
  }

  async listModuleSnapshot(
    settings: BlobStorageSettings,
    options: { limit?: number; continuationToken?: string } = {}
  ): Promise<ModuleBlobSnapshotSummary> {
    const prefix = normalizePrefix(settings.modulePrefix);
    const root = this.resolveRoot();
    const prefixPath = safeJoinObjectKey(root, prefix);
    const manifest = await readManifest(root, prefix);
    const prefixStat = await statSafe(prefixPath);
    const allObjects = prefixStat?.isDirectory()
      ? await listObjectFiles(prefixPath, prefix, manifest?.files ?? {})
      : [];
    const objects = allObjects.sort((left, right) => left.key.localeCompare(right.key));
    const offset = Math.max(Number.parseInt(String(options.continuationToken ?? "0"), 10) || 0, 0);
    const limit = Math.min(Math.max(Number(options.limit ?? 1000), 1), 1000);
    const page = objects.slice(offset, offset + limit);
    const nextOffset = offset + page.length;
    const truncated = nextOffset < objects.length;
    return {
      bucket: settings.bucket,
      prefix,
      moduleHash: manifest?.moduleHash ?? hashObjectSummaries(objects),
      totalFiles: objects.length,
      totalBytes: objects.reduce((sum, object) => sum + object.size, 0),
      objects: page,
      truncated,
      continuationToken: truncated ? String(nextOffset) : undefined
    };
  }

  async getModuleObject(
    settings: BlobStorageSettings,
    key: string
  ): Promise<ModuleBlobObjectPayload | null> {
    const normalizedKey = normalizeObjectKey(key);
    if (!normalizedKey) {
      return null;
    }

    const root = this.resolveRoot();
    const path = safeJoinObjectKey(root, normalizedKey);
    const fileStat = await statSafe(path);
    if (!fileStat?.isFile()) {
      return null;
    }

    const bytes = await readFile(path);
    return {
      key: normalizedKey,
      size: bytes.length,
      contentType: inferContentType(normalizedKey),
      etag: sha256Hex(bytes),
      lastModified: fileStat.mtime.toISOString(),
      bytes
    };
  }

  async putModuleObject(
    settings: BlobStorageSettings,
    file: PackedModuleFile
  ): Promise<ModuleBlobObjectSummary> {
    const prefix = normalizePrefix(settings.modulePrefix);
    const key = `${prefix}${normalizeFileName(file.fileName)}`;
    const root = this.resolveRoot();
    const path = safeJoinObjectKey(root, key);
    const bytes = Buffer.from(file.bytes);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes);
    return {
      key,
      size: bytes.length,
      etag: sha256Hex(bytes),
      lastModified: new Date().toISOString()
    };
  }

  private resolveRoot(): string {
    return resolve(process.cwd(), this.config.localBlobMirrorPath);
  }

  private async writeManifest(
    root: string,
    prefix: string,
    objects: ModuleBlobObjectSummary[]
  ): Promise<void> {
    const files: Record<string, { sha256: string; size: number }> = {};
    for (const object of objects) {
      files[object.key] = {
        sha256: object.etag ?? "",
        size: object.size
      };
    }
    const manifest = {
      version: 1,
      generatedAt: new Date().toISOString(),
      moduleHash: hashManifestFiles(files),
      fileCount: Object.keys(files).length,
      files,
      source: "local_blob_mirror",
      canonicalParityPromoted: false,
      visualParityPromoted: false
    };
    const path = safeJoinObjectKey(root, buildManifestKeyForPrefix(prefix));
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(manifest, null, 2), "utf-8");
  }
}

interface LocalBlobMirrorManifest {
  moduleHash?: string;
  files?: Record<string, { sha256?: string; size?: number }>;
}

async function listObjectFiles(
  root: string,
  prefix: string,
  manifestFiles: Record<string, { sha256?: string; size?: number }>
): Promise<ModuleBlobObjectSummary[]> {
  const output: ModuleBlobObjectSummary[] = [];
  const visit = async (directory: string): Promise<void> => {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const fileStat = await stat(path);
      const relative = path
        .slice(root.length)
        .replace(/^[/\\]+/u, "")
        .replace(/\\/gu, "/");
      const key = `${prefix}${relative}`;
      const manifestFile = manifestFiles[key] ?? manifestFiles[relative];
      output.push({
        key,
        size: fileStat.size,
        lastModified: fileStat.mtime.toISOString(),
        etag: manifestFile?.sha256
      });
    }
  };
  await visit(root);
  return output;
}

async function readManifest(root: string, prefix: string): Promise<LocalBlobMirrorManifest | null> {
  try {
    return JSON.parse(
      await readFile(safeJoinObjectKey(root, buildManifestKeyForPrefix(prefix)), "utf-8")
    ) as LocalBlobMirrorManifest;
  } catch {
    return null;
  }
}

async function statSafe(path: string) {
  try {
    return await stat(path);
  } catch {
    return null;
  }
}

function safeJoinObjectKey(root: string, key: string): string {
  const rootPath = resolve(root);
  const fullPath = resolve(rootPath, ...normalizeObjectKey(key).split("/").filter(Boolean));
  const normalizedRoot = rootPath.toLowerCase();
  const normalizedFull = fullPath.toLowerCase();
  if (normalizedFull !== normalizedRoot && !normalizedFull.startsWith(`${normalizedRoot}\\`)) {
    throw new Error(`Local blob mirror object key escapes root: ${key}`);
  }
  return fullPath;
}

function normalizePrefix(value: string): string {
  const trimmed = String(value ?? "").trim().replace(/^\/+/u, "").replace(/\/+$/u, "");
  return trimmed ? `${trimmed}/` : "";
}

function normalizeFileName(value: string): string {
  return String(value ?? "").replace(/^[/\\]+/u, "").replace(/\\/gu, "/");
}

function normalizeObjectKey(value: string): string {
  return normalizeFileName(value).trim();
}

function buildManifestKeyForPrefix(prefix: string): string {
  const encoded = Buffer.from(prefix, "utf-8")
    .toString("base64")
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_")
    .replace(/=+$/gu, "");
  return `__aurora/meta/module-snapshots/${encoded}.json`;
}

function hashObjectSummaries(objects: ModuleBlobObjectSummary[]): string {
  const files: Record<string, { sha256: string; size: number }> = {};
  for (const object of objects) {
    files[object.key] = {
      sha256: object.etag ?? "",
      size: object.size
    };
  }
  return hashManifestFiles(files);
}

function hashManifestFiles(files: Record<string, { sha256: string; size: number }>): string {
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

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function inferContentType(fileName: string): string {
  const extension = extname(fileName).replace(/^\./u, "").toLowerCase();
  switch (extension) {
    case "glb":
      return "model/gltf-binary";
    case "gltf":
      return "model/gltf+json";
    case "dds":
      return "image/vnd-ms.dds";
    case "tga":
      return "image/x-tga";
    case "bmp":
      return "image/bmp";
    case "json":
      return "application/json";
    case "set":
    case "2da":
    case "txi":
    case "mtr":
      return "text/plain; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}
