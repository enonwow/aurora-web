import { Injectable } from "@nestjs/common";
import { readdir, realpath, stat } from "node:fs/promises";
import {
  dirname,
  extname,
  isAbsolute,
  join,
  parse,
  relative,
  resolve
} from "node:path";
import { AppException } from "../../../common/http/app-exception";
import {
  getRuntimePathEnvironment,
  runtimeMountVariableForPath,
  translateHostPathToRuntime,
  translateRuntimePathToHost,
  type RuntimePathEnvironmentMount,
  type RuntimePathMountVariable
} from "./runtime-path-environment";

export const RUNTIME_PATH_BROWSER_SCOPES = [
  "nwn-user",
  "nwn-install",
  "module-decompiled",
  "module-packed",
  "hak-directory",
  "aurora-reference",
  "item-generator"
] as const;

export type RuntimePathBrowserScope =
  (typeof RUNTIME_PATH_BROWSER_SCOPES)[number];

export interface RuntimePathBrowserQuery {
  scope: RuntimePathBrowserScope;
  path: string;
}

export interface RuntimePathBrowserRoot {
  id: RuntimePathMountVariable | "filesystem";
  label: string;
  path: string;
  available: boolean;
}

export interface RuntimePathBrowserEntry {
  name: string;
  path: string;
  kind: "directory" | "file";
  selectable: boolean;
}

export interface RuntimePathBrowserResult {
  scope: RuntimePathBrowserScope;
  selectionKind: "directory" | "file";
  currentPath: string;
  parentPath?: string;
  roots: RuntimePathBrowserRoot[];
  entries: RuntimePathBrowserEntry[];
  truncated: boolean;
}

interface RuntimePathBrowserScopeDefinition {
  preferredVariable: RuntimePathMountVariable;
  restrictToPreferredMount: boolean;
  selectionKind: "directory" | "file";
  extensions?: ReadonlySet<string>;
}

const MAX_BROWSER_ENTRIES = 500;

const SCOPE_DEFINITIONS: Record<
  RuntimePathBrowserScope,
  RuntimePathBrowserScopeDefinition
> = {
  "nwn-user": {
    preferredVariable: "NWN_USER_DIR_HOST",
    restrictToPreferredMount: true,
    selectionKind: "directory"
  },
  "nwn-install": {
    preferredVariable: "NWN_INSTALL_DIR_HOST",
    restrictToPreferredMount: true,
    selectionKind: "directory"
  },
  "module-decompiled": {
    preferredVariable: "NWN_USER_DIR_HOST",
    restrictToPreferredMount: false,
    selectionKind: "directory"
  },
  "module-packed": {
    preferredVariable: "NWN_USER_DIR_HOST",
    restrictToPreferredMount: false,
    selectionKind: "file",
    extensions: new Set([".mod"])
  },
  "hak-directory": {
    preferredVariable: "NWN_USER_DIR_HOST",
    restrictToPreferredMount: false,
    selectionKind: "directory"
  },
  "aurora-reference": {
    preferredVariable: "AURORA_REFERENCE_DIR_HOST",
    restrictToPreferredMount: true,
    selectionKind: "directory"
  },
  "item-generator": {
    preferredVariable: "AURORA_REFERENCE_DIR_HOST",
    restrictToPreferredMount: false,
    selectionKind: "directory"
  }
};

@Injectable()
export class RuntimePathBrowserApplicationService {
  async browse(query: RuntimePathBrowserQuery): Promise<RuntimePathBrowserResult> {
    const definition = SCOPE_DEFINITIONS[query.scope];
    const environment = getRuntimePathEnvironment();
    const roots = await buildBrowserRoots(
      environment.mode,
      environment.mounts,
      definition,
      query.path
    );
    const location =
      environment.mode === "docker"
        ? await resolveDockerLocation(query.path, definition, environment.mounts)
        : await resolveHostLocation(query.path, definition, environment.mounts);
    const directory = await resolveBrowseDirectory(location.runtimePath);
    const allowedRoot = await resolveExistingDirectory(location.rootRuntimePath);

    if (!isPathContained(allowedRoot, directory)) {
      throw pathBrowserException(
        "PATH_BROWSER_OUTSIDE_ROOT",
        "The requested path is outside the directory available to this selector.",
        query.path
      );
    }

    const rawEntries = await readdir(directory, { withFileTypes: true });
    const eligibleEntries = rawEntries
      .filter((entry) => !entry.name.startsWith(".") && !entry.isSymbolicLink())
      .flatMap<RuntimePathBrowserEntry>((entry) => {
        const kind = entry.isDirectory()
          ? "directory"
          : entry.isFile()
            ? "file"
            : undefined;
        if (!kind) {
          return [];
        }
        if (
          kind === "file" &&
          (definition.selectionKind !== "file" ||
            !isAllowedFile(entry.name, definition.extensions))
        ) {
          return [];
        }
        const runtimeEntryPath = join(directory, entry.name);
        return [
          {
            name: entry.name,
            path: translateRuntimePathToHost(runtimeEntryPath),
            kind,
            selectable:
              definition.selectionKind === "directory"
                ? kind === "directory"
                : kind === "file"
          }
        ];
      })
      .sort((left, right) => {
        if (left.kind !== right.kind) {
          return left.kind === "directory" ? -1 : 1;
        }
        return left.name.localeCompare(right.name, undefined, {
          numeric: true,
          sensitivity: "base"
        });
      });
    const entries = eligibleEntries.slice(0, MAX_BROWSER_ENTRIES);
    const parentRuntimePath =
      isSamePath(directory, allowedRoot) ? undefined : dirname(directory);

    return {
      scope: query.scope,
      selectionKind: definition.selectionKind,
      currentPath: translateRuntimePathToHost(directory),
      ...(parentRuntimePath
        ? { parentPath: translateRuntimePathToHost(parentRuntimePath) }
        : {}),
      roots,
      entries,
      truncated: eligibleEntries.length > MAX_BROWSER_ENTRIES
    };
  }
}

interface BrowserLocation {
  runtimePath: string;
  rootRuntimePath: string;
}

async function resolveDockerLocation(
  requestedHostPath: string,
  definition: RuntimePathBrowserScopeDefinition,
  mounts: RuntimePathEnvironmentMount[]
): Promise<BrowserLocation> {
  const preferredMount = mounts.find(
    (mount) => mount.envVariable === definition.preferredVariable
  )!;
  const hostPath = requestedHostPath.trim() || preferredMount.hostPath;
  if (!hostPath) {
    throw pathBrowserException(
      "PATH_BROWSER_ROOT_NOT_CONFIGURED",
      `Set ${definition.preferredVariable} in .env and recreate Docker Compose before browsing this path.`,
      definition.preferredVariable
    );
  }

  const translated = translateHostPathToRuntime(
    hostPath,
    definition.preferredVariable,
    { restrictToPreferredMount: definition.restrictToPreferredMount }
  );
  if (!translated.ok) {
    throw pathBrowserException(
      translated.issue.code,
      translated.issue.message,
      hostPath
    );
  }

  const mountVariable = runtimeMountVariableForPath(translated.runtimePath);
  const matchedMount = mounts.find(
    (mount) => mount.envVariable === mountVariable
  );
  if (!matchedMount) {
    throw pathBrowserException(
      "PATH_BROWSER_OUTSIDE_ROOT",
      "The requested host path is not part of an available Docker mount.",
      hostPath
    );
  }
  return {
    runtimePath: translated.runtimePath,
    rootRuntimePath: matchedMount.runtimePath
  };
}

async function resolveHostLocation(
  requestedPath: string,
  definition: RuntimePathBrowserScopeDefinition,
  mounts: RuntimePathEnvironmentMount[]
): Promise<BrowserLocation> {
  const preferredMount = mounts.find(
    (mount) => mount.envVariable === definition.preferredVariable
  );
  const candidate =
    requestedPath.trim() ||
    preferredMount?.hostPath ||
    process.cwd();
  const absoluteCandidate = isAbsolute(candidate) ? candidate : resolve(candidate);
  const root = parse(absoluteCandidate).root || parse(resolve(process.cwd())).root;
  return {
    runtimePath: absoluteCandidate,
    rootRuntimePath: root
  };
}

async function resolveBrowseDirectory(pathValue: string): Promise<string> {
  const existingPath = await resolveExistingPath(pathValue);
  const metadata = await stat(existingPath);
  return metadata.isDirectory() ? existingPath : dirname(existingPath);
}

async function resolveExistingDirectory(pathValue: string): Promise<string> {
  const existingPath = await resolveExistingPath(pathValue);
  const metadata = await stat(existingPath);
  if (!metadata.isDirectory()) {
    throw pathBrowserException(
      "PATH_BROWSER_ROOT_UNAVAILABLE",
      "The configured browser root is not a directory.",
      pathValue
    );
  }
  return existingPath;
}

async function resolveExistingPath(pathValue: string): Promise<string> {
  try {
    return await realpath(pathValue);
  } catch {
    throw pathBrowserException(
      "PATH_NOT_FOUND",
      "The requested path is not available to the backend. Enter it manually or choose an available root.",
      translateRuntimePathToHost(pathValue)
    );
  }
}

async function buildBrowserRoots(
  mode: "host" | "docker",
  mounts: RuntimePathEnvironmentMount[],
  definition: RuntimePathBrowserScopeDefinition,
  requestedPath: string
): Promise<RuntimePathBrowserRoot[]> {
  if (mode === "docker") {
    const allowedMounts = definition.restrictToPreferredMount
      ? mounts.filter(
          (mount) => mount.envVariable === definition.preferredVariable
        )
      : mounts;
    return Promise.all(
      allowedMounts
        .filter((mount) => mount.configured)
        .map(async (mount) => ({
          id: mount.envVariable,
          label: browserRootLabel(mount.envVariable),
          path: mount.hostPath,
          available: await isAvailableDirectory(mount.runtimePath)
        }))
    );
  }

  const candidates = [
    ...mounts
      .filter((mount) => mount.configured)
      .map((mount) => ({
        id: mount.envVariable as RuntimePathBrowserRoot["id"],
        label: browserRootLabel(mount.envVariable),
        path: mount.hostPath
      })),
    {
      id: "filesystem" as const,
      label: "Server filesystem",
      path:
        parse(
          isAbsolute(requestedPath.trim())
            ? requestedPath.trim()
            : resolve(requestedPath.trim() || process.cwd())
        ).root || parse(resolve(process.cwd())).root
    }
  ];
  const unique = new Map<string, (typeof candidates)[number]>();
  for (const candidate of candidates) {
    unique.set(normalizeComparablePath(candidate.path), candidate);
  }
  return Promise.all(
    Array.from(unique.values()).map(async (candidate) => ({
      ...candidate,
      available: await isAvailableDirectory(candidate.path)
    }))
  );
}

function browserRootLabel(variable: RuntimePathMountVariable): string {
  switch (variable) {
    case "NWN_USER_DIR_HOST":
      return "NWN user";
    case "NWN_INSTALL_DIR_HOST":
      return "NWN installation";
    case "AURORA_REFERENCE_DIR_HOST":
      return "Aurora reference";
  }
}

async function isAvailableDirectory(pathValue: string): Promise<boolean> {
  try {
    return (await stat(pathValue)).isDirectory();
  } catch {
    return false;
  }
}

function isAllowedFile(
  fileName: string,
  extensions: ReadonlySet<string> | undefined
): boolean {
  return !extensions || extensions.has(extname(fileName).toLowerCase());
}

function isPathContained(root: string, candidate: string): boolean {
  const suffix = relative(root, candidate);
  return (
    suffix === "" ||
    (!suffix.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) &&
      suffix !== ".." &&
      !isAbsolute(suffix))
  );
}

function isSamePath(left: string, right: string): boolean {
  return normalizeComparablePath(left) === normalizeComparablePath(right);
}

function normalizeComparablePath(pathValue: string): string {
  const normalized = pathValue.replace(/\\/gu, "/").replace(/\/+$/u, "");
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function pathBrowserException(
  code: string,
  message: string,
  pathValue: string
): AppException {
  return new AppException({
    status: code === "PATH_NOT_FOUND" ? 404 : 422,
    code,
    message,
    details: [{ path: "path", reason: pathValue }]
  });
}
