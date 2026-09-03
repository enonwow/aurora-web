import type { AuroraAreaTilesetDefinition } from "../../scene/domain/auroraAreaEditing";
import type {
  AreaEditingSourcePort,
  AreaTilesetEditingSummary,
} from "../ports/areaEditingPort";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type AreaTilesetEditingSummaryApi = AreaTilesetEditingSummary;
export type AreaEditingSourceApi = AreaEditingSourcePort;

export class HttpAreaEditingApi implements AreaEditingSourcePort {
  constructor(
    private readonly fetchFn: FetchLike = fetch.bind(globalThis),
    private readonly baseUrl = resolveBaseUrl()
  ) {}

  async listAreaTilesets(accessToken: string): Promise<AreaTilesetEditingSummary[]> {
    const data = await requestJson(
      this.fetchFn,
      `${this.baseUrl.replace(/\/+$/u, "")}/areas/editing/tilesets`,
      accessToken
    );
    return Array.isArray(data)
      ? data.flatMap((entry) => {
          const source = asRecord(entry);
          if (typeof source.tilesetResRef !== "string") return [];
          return [{
            tilesetResRef: source.tilesetResRef,
            displayName:
              typeof source.displayName === "string" && source.displayName.trim()
                ? source.displayName.trim()
                : source.tilesetResRef,
            ...(typeof source.displayNameStrRef === "number"
              ? { displayNameStrRef: source.displayNameStrRef }
              : {})
          }];
        })
      : [];
  }
  async getAreaTilesetDefinition(
    accessToken: string,
    tilesetResRef: string
  ): Promise<AuroraAreaTilesetDefinition> {
    const data = await requestJson(
      this.fetchFn,
      `${this.baseUrl.replace(/\/+$/u, "")}/areas/editing/tilesets/${encodeURIComponent(tilesetResRef)}`,
      accessToken
    );
    return mapDefinition(data);
  }

  async getAreaEditingDefinitionForArea(
    accessToken: string,
    areaId: string
  ): Promise<{ definition: AuroraAreaTilesetDefinition; areaFingerprint?: string }> {
    const data = await requestJson(
      this.fetchFn,
      `${this.baseUrl.replace(/\/+$/u, "")}/areas/editing/source/${encodeURIComponent(areaId)}`,
      accessToken
    );
    const source = asRecord(data);
    return {
      definition: mapDefinition(source.tileset),
      ...(typeof source.areaFingerprint === "string" ? { areaFingerprint: source.areaFingerprint } : {})
    };
  }
}

export function createHttpAreaEditingApi(
  fetchFn: FetchLike = fetch.bind(globalThis),
  baseUrl = resolveBaseUrl()
): AreaEditingSourcePort {
  return new HttpAreaEditingApi(fetchFn, baseUrl);
}

async function requestJson(fetchFn: FetchLike, url: string, accessToken: string): Promise<unknown> {
  const response = await fetchFn(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = asRecord(payload).error;
    throw new Error(typeof message === "string" ? message : `Area editing request failed (${response.status}).`);
  }
  return asRecord(payload).data;
}

function mapDefinition(value: unknown): AuroraAreaTilesetDefinition {
  const source = asRecord(value);
  const defaults = asRecord(source.defaults);
  if (typeof source.tilesetResRef !== "string" || typeof source.fingerprint !== "string") {
    throw new Error("Area editing response does not contain a valid SET definition.");
  }
  return {
    ...(source.schemaVersion === 1 ? { schemaVersion: 1 as const } : {}),
    tilesetResRef: source.tilesetResRef,
    ...(typeof source.name === "string" && source.name.trim() ? { name: source.name.trim() } : {}),
    ...(typeof source.unlocalizedName === "string" && source.unlocalizedName.trim()
      ? { unlocalizedName: source.unlocalizedName.trim() }
      : {}),
    ...(typeof source.displayNameStrRef === "number" ? { displayNameStrRef: source.displayNameStrRef } : {}),
    fingerprint: source.fingerprint,
    defaults: defaults as AuroraAreaTilesetDefinition["defaults"],
    terrainTypes: Array.isArray(source.terrainTypes)
      ? source.terrainTypes as NonNullable<AuroraAreaTilesetDefinition["terrainTypes"]>
      : [],
    crosserTypes: Array.isArray(source.crosserTypes)
      ? source.crosserTypes as NonNullable<AuroraAreaTilesetDefinition["crosserTypes"]>
      : [],
    diagnostics: Array.isArray(source.diagnostics)
      ? source.diagnostics as NonNullable<AuroraAreaTilesetDefinition["diagnostics"]>
      : [],
    defaultTerrain: typeof defaults.defaultTerrain === "string" ? defaults.defaultTerrain : undefined,
    transitionRules: Array.isArray(source.transitionRules) ? source.transitionRules as AuroraAreaTilesetDefinition["transitionRules"] : [],
    tiles: Array.isArray(source.tiles) ? source.tiles as AuroraAreaTilesetDefinition["tiles"] : [],
    groups: Array.isArray(source.groups) ? source.groups as AuroraAreaTilesetDefinition["groups"] : []
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function resolveBaseUrl(): string {
  const candidate = import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined;
  return candidate?.trim() || (import.meta.env.DEV ? "/_aurora/v1" : "/api/v1");
}
