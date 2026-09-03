export type RuntimePathMode = "host" | "docker";

export type RuntimePathMountVariable =
  | "NWN_USER_DIR_HOST"
  | "NWN_INSTALL_DIR_HOST"
  | "AURORA_REFERENCE_DIR_HOST";

export interface RuntimePathEnvironmentMount {
  envVariable: RuntimePathMountVariable;
  hostPath: string;
  runtimePath: string;
  configured: boolean;
}

export interface RuntimePathEnvironment {
  mode: RuntimePathMode;
  mounts: RuntimePathEnvironmentMount[];
}

export interface RuntimePathTranslationIssue {
  code: "HOST_PATH_REQUIRED" | "RESTART_REQUIRED";
  message: string;
  envVariable: RuntimePathMountVariable;
  hostPath: string;
  runtimePath: string;
}

export type RuntimePathTranslation =
  | { ok: true; runtimePath: string }
  | { ok: false; issue: RuntimePathTranslationIssue };

interface RuntimeMountDefinition {
  envVariable: RuntimePathMountVariable;
  runtimePath: string;
}

const RUNTIME_MOUNTS: RuntimeMountDefinition[] = [
  {
    envVariable: "NWN_USER_DIR_HOST",
    runtimePath: "/host/nwn-user"
  },
  {
    envVariable: "NWN_INSTALL_DIR_HOST",
    runtimePath: "/host/nwn-game"
  },
  {
    envVariable: "AURORA_REFERENCE_DIR_HOST",
    runtimePath: "/host/aurora-reference"
  }
];

const LEGACY_DISPLAY_MOUNTS = [
  {
    runtimePath: "/host/nwn-docs",
    envVariable: "NWN_USER_DIR_HOST" as const
  }
] satisfies RuntimeMountDefinition[];

const HOST_LOCAL_DEFAULTS: Record<RuntimePathMountVariable, string> = {
  NWN_USER_DIR_HOST: "C:/Users/enonw/Documents/Neverwinter Nights",
  NWN_INSTALL_DIR_HOST:
    "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights",
  AURORA_REFERENCE_DIR_HOST: "C:/Projects/New Folder"
};

export function getRuntimePathEnvironment(
  env: NodeJS.ProcessEnv = process.env
): RuntimePathEnvironment {
  const mode: RuntimePathMode =
    env.AURORA_RUNTIME_PATH_MODE?.trim().toLowerCase() === "docker"
      ? "docker"
      : "host";

  return {
    mode,
    mounts: RUNTIME_MOUNTS.map((mount) => {
      const configuredHostPath = resolveConfiguredHostRoot(
        mount.envVariable,
        env,
        mode
      );
      return {
        ...mount,
        hostPath: configuredHostPath,
        configured: configuredHostPath.length > 0
      };
    })
  };
}

export function translateHostPathToRuntime(
  hostPath: string,
  preferredVariable: RuntimePathMountVariable,
  options: {
    restrictToPreferredMount?: boolean;
    env?: NodeJS.ProcessEnv;
  } = {}
): RuntimePathTranslation {
  const trimmed = hostPath.trim();
  const environment = getRuntimePathEnvironment(options.env);
  if (environment.mode === "host" || trimmed.length === 0) {
    return { ok: true, runtimePath: trimmed };
  }

  const preferredMount = environment.mounts.find(
    (mount) => mount.envVariable === preferredVariable
  )!;
  if (isRuntimeInternalPath(trimmed)) {
    return {
      ok: false,
      issue: {
        code: "HOST_PATH_REQUIRED",
        message:
          `Enter the real server-host path, not the internal Docker path ${trimmed}.`,
        envVariable: preferredVariable,
        hostPath: preferredMount.hostPath,
        runtimePath: preferredMount.runtimePath
      }
    };
  }

  const candidates = options.restrictToPreferredMount
    ? [preferredMount]
    : environment.mounts;
  const match = candidates
    .filter((mount) => mount.configured)
    .sort((left, right) => right.hostPath.length - left.hostPath.length)
    .find((mount) => isSameOrDescendantHostPath(trimmed, mount.hostPath));

  if (!match) {
    return {
      ok: false,
      issue: {
        code: "RESTART_REQUIRED",
        message: preferredMount.configured
          ? `The host path is outside the directory mounted by ${preferredVariable} (${preferredMount.hostPath}). Update .env and recreate Docker Compose.`
          : `Set ${preferredVariable} to the real host directory in .env and recreate Docker Compose.`,
        envVariable: preferredVariable,
        hostPath: preferredMount.hostPath,
        runtimePath: preferredMount.runtimePath
      }
    };
  }

  const suffix = relativeHostSuffix(trimmed, match.hostPath);
  return {
    ok: true,
    runtimePath: suffix
      ? `${match.runtimePath}/${suffix}`
      : match.runtimePath
  };
}

export function translateRuntimePathToHost(
  runtimePath: string,
  env: NodeJS.ProcessEnv = process.env
): string {
  const trimmed = runtimePath.trim();
  if (trimmed.length === 0) {
    return "";
  }

  const environment = getRuntimePathEnvironment(env);
  const displayMounts = [
    ...environment.mounts,
    ...LEGACY_DISPLAY_MOUNTS.map((mount) => ({
      ...mount,
      hostPath: resolveConfiguredHostRoot(mount.envVariable, env, environment.mode),
      configured: true
    }))
  ];
  const match = displayMounts
    .filter((mount) => mount.hostPath.length > 0)
    .sort((left, right) => right.runtimePath.length - left.runtimePath.length)
    .find(
      (mount) =>
        trimmed === mount.runtimePath ||
        trimmed.startsWith(`${mount.runtimePath}/`)
    );
  if (!match) {
    return trimmed;
  }

  const suffix = trimmed
    .slice(match.runtimePath.length)
    .replace(/^[/\\]+/u, "");
  return appendHostSuffix(match.hostPath, suffix);
}

export function runtimeMountVariableForPath(
  runtimePath: string
): RuntimePathMountVariable | undefined {
  const normalized = runtimePath.trim().replace(/\\/gu, "/");
  const match = [...RUNTIME_MOUNTS, ...LEGACY_DISPLAY_MOUNTS].find(
    (mount) =>
      normalized === mount.runtimePath ||
      normalized.startsWith(`${mount.runtimePath}/`)
  );
  return match?.envVariable;
}

function resolveConfiguredHostRoot(
  variable: RuntimePathMountVariable,
  env: NodeJS.ProcessEnv,
  mode: RuntimePathMode
): string {
  const composeValue = env[variable]?.trim();
  if (composeValue) {
    return composeValue;
  }
  if (!isTruthyEnv(env.AURORA_HOST_LOCAL_RUNTIME)) {
    return "";
  }

  if (variable === "NWN_USER_DIR_HOST") {
    return (
      env.AURORA_HOST_NWN_DOCS_ROOT?.trim() ||
      HOST_LOCAL_DEFAULTS[variable]
    );
  }
  if (variable === "NWN_INSTALL_DIR_HOST") {
    return (
      env.AURORA_HOST_NWN_GAME_ROOT?.trim() ||
      HOST_LOCAL_DEFAULTS[variable]
    );
  }
  if (variable === "AURORA_REFERENCE_DIR_HOST") {
    return (
      env.AURORA_HOST_AURORA_REFERENCE_ROOT?.trim() ||
      HOST_LOCAL_DEFAULTS[variable]
    );
  }

  return mode === "host" ? HOST_LOCAL_DEFAULTS[variable] : "";
}

function isRuntimeInternalPath(value: string): boolean {
  return value.replace(/\\/gu, "/").toLowerCase().startsWith("/host/");
}

function isSameOrDescendantHostPath(value: string, root: string): boolean {
  const normalizedValue = normalizeHostPathForComparison(value);
  const normalizedRoot = normalizeHostPathForComparison(root);
  return (
    normalizedValue === normalizedRoot ||
    normalizedValue.startsWith(`${normalizedRoot}/`)
  );
}

function relativeHostSuffix(value: string, root: string): string {
  const normalizedValue = normalizeHostPath(value);
  const normalizedRoot = normalizeHostPath(root);
  return normalizedValue
    .slice(normalizedRoot.length)
    .replace(/^\/+/u, "");
}

function normalizeHostPath(value: string): string {
  return value.trim().replace(/\\/gu, "/").replace(/\/+$/u, "");
}

function normalizeHostPathForComparison(value: string): string {
  const normalized = normalizeHostPath(value);
  return /^[a-z]:\//iu.test(normalized)
    ? normalized.toLowerCase()
    : normalized;
}

function appendHostSuffix(hostRoot: string, suffix: string): string {
  if (!suffix) {
    return hostRoot;
  }
  const separator =
    hostRoot.includes("\\") || /^[a-z]:\\/iu.test(hostRoot) ? "\\" : "/";
  return `${hostRoot.replace(/[/\\]+$/u, "")}${separator}${suffix.replace(
    /[/\\]+/gu,
    separator
  )}`;
}

function isTruthyEnv(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
}
