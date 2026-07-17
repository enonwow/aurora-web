import { resolve } from "node:path";

const HOST_LOCAL_MOUNT_MAPPINGS = [
  {
    mount: "/host/nwn-docs",
    envName: "AURORA_HOST_NWN_DOCS_ROOT",
    defaultRoot: "C:/Users/enonw/Documents/Neverwinter Nights"
  },
  {
    mount: "/host/nwn-game",
    envName: "AURORA_HOST_NWN_GAME_ROOT",
    defaultRoot: "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights"
  }
] as const;

export function resolveHostLocalMountedPath(pathValue: string): string | null {
  if (!isTruthyEnv(process.env.AURORA_HOST_LOCAL_RUNTIME)) {
    return null;
  }

  const normalized = pathValue
    .trim()
    .replace(/\\/gu, "/")
    .replace(/^[a-z]:\/host\//iu, "/host/")
    .replace(/\/+$/u, "");
  const match = HOST_LOCAL_MOUNT_MAPPINGS.find(
    (mapping) => normalized === mapping.mount || normalized.startsWith(`${mapping.mount}/`)
  );
  if (!match) {
    return null;
  }

  const configuredRoot = process.env[match.envName]?.trim();
  const localRoot = configuredRoot || match.defaultRoot;
  const suffix = normalized.slice(match.mount.length).replace(/^\/+/u, "");
  return suffix ? resolve(localRoot, ...suffix.split("/")) : resolve(localRoot);
}

function isTruthyEnv(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}
