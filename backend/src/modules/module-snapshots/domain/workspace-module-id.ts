import { createHash } from "node:crypto";
import type { BlobStorageSettings } from "../../runtime-settings/domain/runtime-settings.types";

export function deriveWorkspaceModuleId(settings: BlobStorageSettings): string {
  const identity = JSON.stringify({
    endpoint: settings.endpoint.trim().replace(/\/+$/gu, "").toLowerCase(),
    bucket: settings.bucket.trim().toLowerCase(),
    modulePrefix: settings.modulePrefix
      .trim()
      .replace(/\\/gu, "/")
      .replace(/^\/+|\/+$/gu, ""),
  });
  const digest = createHash("sha256").update(identity, "utf8").digest("hex");
  return `workspace-${digest.slice(0, 32)}`;
}
