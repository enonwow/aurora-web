import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MATRIX_RUNTIME_SOURCE_IDENTITY_SCHEMA =
  "aurora-tile-add-connect-runtime-source-identity/v1";
export const MATRIX_RUNTIME_SOURCE_IDENTITY_ALGORITHM =
  "sha256-canonical-sorted-path-size-file-sha256-v1";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(scriptDirectory, "..", "..", "..");
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const SOURCE_ROOTS = Object.freeze([
  "backend/src",
  "backend/scripts",
  "frontend/src",
  "scripts"
]);
const SOURCE_FILES = Object.freeze([
  "backend/package.json",
  "backend/package-lock.json",
  "backend/tsconfig.json",
  "frontend/package.json",
  "frontend/package-lock.json",
  "frontend/tsconfig.json",
  "frontend/vite.config.ts"
]);
const EXCLUDED_DIRECTORY_NAMES = new Set([
  ".stryker-tmp",
  "__pycache__",
  "coverage",
  "dist",
  "node_modules",
  "reports"
]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function repositoryPath(repoRoot, filePath) {
  return path.relative(repoRoot, filePath).replaceAll("\\", "/");
}

function enumerateFiles(directory) {
  const result = [];
  const visit = (current) => {
    const entries = fs.readdirSync(current, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const candidate = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRECTORY_NAMES.has(entry.name)) visit(candidate);
      } else if (entry.isFile()) {
        result.push(candidate);
      }
    }
  };
  visit(directory);
  return result;
}

export function readTileAddConnectVfxRuntimeRevision(
  repoRoot = defaultRepoRoot
) {
  const source = fs.readFileSync(
    path.join(repoRoot, "backend/src/health/health.controller.ts"),
    "utf8"
  );
  const match = /const VFX_RUNTIME_REVISION\s*=\s*\r?\n?\s*"([^"]+)";/u.exec(source);
  if (!match?.[1]) {
    throw new Error("Unable to read the backend VFX runtime revision exactly.");
  }
  return match[1];
}

export function computeTileAddConnectRuntimeSourceIdentity({
  repoRoot = defaultRepoRoot
} = {}) {
  const resolvedRepoRoot = path.resolve(repoRoot);
  const files = [
    ...SOURCE_ROOTS.flatMap((relative) => {
      const directory = path.join(resolvedRepoRoot, relative);
      if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
        throw new Error(`Runtime source root is missing: ${relative}`);
      }
      return enumerateFiles(directory);
    }),
    ...SOURCE_FILES.map((relative) => {
      const filePath = path.join(resolvedRepoRoot, relative);
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        throw new Error(`Runtime source file is missing: ${relative}`);
      }
      return filePath;
    })
  ];
  const records = Array.from(new Set(files.map((filePath) => path.resolve(filePath))))
    .sort((left, right) =>
      repositoryPath(resolvedRepoRoot, left).localeCompare(
        repositoryPath(resolvedRepoRoot, right)
      )
    )
    .map((filePath) => {
      const bytes = fs.readFileSync(filePath);
      return {
        path: repositoryPath(resolvedRepoRoot, filePath),
        bytes: bytes.byteLength,
        sha256: sha256(bytes)
      };
    });
  return {
    schema: MATRIX_RUNTIME_SOURCE_IDENTITY_SCHEMA,
    algorithm: MATRIX_RUNTIME_SOURCE_IDENTITY_ALGORITHM,
    sourceRoots: [...SOURCE_ROOTS],
    sourceFiles: [...SOURCE_FILES],
    fileCount: records.length,
    totalBytes: records.reduce((sum, record) => sum + record.bytes, 0),
    runtimeDigest: sha256(Buffer.from(JSON.stringify(records), "utf8")),
    vfxRuntimeRevision: readTileAddConnectVfxRuntimeRevision(resolvedRepoRoot),
    records
  };
}

export function summarizeTileAddConnectRuntimeSourceIdentity(identity) {
  return {
    schema: identity?.schema ?? null,
    algorithm: identity?.algorithm ?? null,
    runtimeDigest: identity?.runtimeDigest ?? null,
    fileCount: identity?.fileCount ?? null,
    totalBytes: identity?.totalBytes ?? null,
    vfxRuntimeRevision: identity?.vfxRuntimeRevision ?? null
  };
}

export function validateTileAddConnectRuntimeSourceIdentity(
  binding,
  identity
) {
  const errors = new Set();
  if (identity?.schema !== MATRIX_RUNTIME_SOURCE_IDENTITY_SCHEMA) {
    errors.add("MATRIX_RUNTIME_SOURCE_IDENTITY_SCHEMA_UNSUPPORTED");
  }
  if (identity?.algorithm !== MATRIX_RUNTIME_SOURCE_IDENTITY_ALGORITHM) {
    errors.add("MATRIX_RUNTIME_SOURCE_IDENTITY_ALGORITHM_UNSUPPORTED");
  }
  const digest = String(identity?.runtimeDigest ?? "");
  if (!SHA256_PATTERN.test(digest)) {
    errors.add("MATRIX_RUNTIME_SOURCE_IDENTITY_DIGEST_INVALID");
  }
  if (!Number.isInteger(identity?.fileCount) || identity.fileCount < 1) {
    errors.add("MATRIX_RUNTIME_SOURCE_IDENTITY_FILE_COUNT_INVALID");
  }
  if (!Number.isInteger(identity?.totalBytes) || identity.totalBytes < 1) {
    errors.add("MATRIX_RUNTIME_SOURCE_IDENTITY_TOTAL_BYTES_INVALID");
  }
  if (
    typeof identity?.vfxRuntimeRevision !== "string" ||
    identity.vfxRuntimeRevision.length === 0
  ) {
    errors.add("MATRIX_RUNTIME_SOURCE_IDENTITY_VFX_REVISION_INVALID");
  }
  if (SHA256_PATTERN.test(digest)) {
    const expectedCommit = `worktree-sha256-${digest}`;
    const expectedImageDigest = `sha256:${digest}`;
    if (binding?.frontend?.commit !== expectedCommit) {
      errors.add("MATRIX_RUNTIME_SOURCE_FRONTEND_COMMIT_MISMATCH");
    }
    if (binding?.backend?.commit !== expectedCommit) {
      errors.add("MATRIX_RUNTIME_SOURCE_BACKEND_COMMIT_MISMATCH");
    }
    if (binding?.frontend?.imageDigest !== expectedImageDigest) {
      errors.add("MATRIX_RUNTIME_SOURCE_FRONTEND_IMAGE_DIGEST_MISMATCH");
    }
    if (binding?.backend?.imageDigest !== expectedImageDigest) {
      errors.add("MATRIX_RUNTIME_SOURCE_BACKEND_IMAGE_DIGEST_MISMATCH");
    }
  }
  if (
    typeof identity?.vfxRuntimeRevision === "string" &&
    binding?.backend?.vfxRuntimeRevision !== identity.vfxRuntimeRevision
  ) {
    errors.add("MATRIX_RUNTIME_SOURCE_VFX_REVISION_MISMATCH");
  }
  return [...errors].sort((left, right) => left.localeCompare(right));
}
