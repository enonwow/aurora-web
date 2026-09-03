export type AuroraVfxTextureTxiBlending = "additive" | "punchthrough";

export interface AuroraVfxTextureTxiSourceState {
  source: string;
  decal?: boolean;
  clamp?: 0 | 1 | 2 | 3;
  blending?: AuroraVfxTextureTxiBlending;
  mipmap?: boolean;
  filter?: boolean;
  bumpmaptexture?: string;
  envmaptexture?: string;
  proceduretype?: string;
  numx?: number;
  numy?: number;
  fps?: number;
  downsampleMin?: number;
  downsampleMax?: number;
}

/**
 * Parses behavior-bearing TXI fields without consulting the owning asset's
 * name, resref, table row, fixture, or model identity.
 */
export function parseAuroraTextureTxiSourceState(
  bytes: Buffer,
  source: string
): AuroraVfxTextureTxiSourceState {
  const state: AuroraVfxTextureTxiSourceState = { source };
  for (const rawLine of bytes.toString("utf8").split(/\r?\n/u)) {
    const line = rawLine
      .replace(/\/\/.*$/u, "")
      .replace(/#.*$/u, "")
      .replace(/;.*$/u, "")
      .trim();
    if (!line) continue;
    const tokens = line.split(/\s+/u);
    if (tokens.length < 2) continue;
    const key = tokens[0]!.toLowerCase();
    const rawValue = tokens.slice(1).join(" ");

    if (key === "decal" || key === "mipmap" || key === "filter") {
      const value = parseAuroraTxiBoolean(rawValue);
      if (value !== undefined) state[key] = value;
      continue;
    }
    if (key === "clamp") {
      const value = Number.parseInt(firstToken(rawValue), 10);
      if (value === 0 || value === 1 || value === 2 || value === 3) {
        state.clamp = value;
      }
      continue;
    }
    if (key === "blending") {
      const value = firstToken(rawValue).toLowerCase();
      if (value === "additive" || value === "punchthrough") {
        state.blending = value;
      }
      continue;
    }
    if (key === "bumpmaptexture" || key === "bumpmap") {
      const value = normalizeAuroraTxiTextureReference(rawValue);
      if (value) state.bumpmaptexture = value;
      continue;
    }
    if (key === "envmaptexture" || key === "envmap") {
      const value = normalizeAuroraTxiTextureReference(rawValue);
      if (value) state.envmaptexture = value;
      continue;
    }
    if (key === "proceduretype") {
      const value = firstToken(rawValue).toLowerCase();
      if (value) state.proceduretype = value;
      continue;
    }
    if (key === "numx" || key === "numy") {
      const value = Number.parseInt(firstToken(rawValue), 10);
      if (Number.isInteger(value) && value > 0) state[key] = value;
      continue;
    }
    if (key === "fps") {
      const value = Number.parseFloat(firstToken(rawValue));
      if (Number.isFinite(value) && value >= 0) state.fps = value;
      continue;
    }
    if (key === "downsamplemin" || key === "downsamplemax") {
      const value = Number.parseFloat(firstToken(rawValue));
      if (!Number.isFinite(value) || value < 0) continue;
      if (key === "downsamplemin") state.downsampleMin = value;
      else state.downsampleMax = value;
    }
  }
  return state;
}

function parseAuroraTxiBoolean(value: string): boolean | undefined {
  const normalized = firstToken(value).toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }
  return undefined;
}

function firstToken(value: string): string {
  return value.trim().split(/\s+/u)[0] ?? "";
}

function normalizeAuroraTxiTextureReference(value: string): string | undefined {
  const unquoted = firstToken(value).replace(/^["']+|["']+$/gu, "");
  if (!unquoted || /^(?:none|null)$/iu.test(unquoted)) return undefined;
  const fileName = unquoted.replace(/\\/gu, "/").split("/").pop() ?? "";
  const extensionIndex = fileName.lastIndexOf(".");
  const basename = (extensionIndex > 0 ? fileName.slice(0, extensionIndex) : fileName)
    .trim()
    .toLowerCase();
  return /[a-z0-9]/u.test(basename) ? basename : undefined;
}
