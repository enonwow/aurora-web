import type { AuroraAreaEditingState } from "../../scene/domain/auroraAreaEditing";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface AreaEditingVerificationResult {
  valid: boolean;
  issues: Array<{
    severity: "error" | "warning";
    code: string;
    message: string;
    row?: number;
    col?: number;
    tileId?: number;
  }>;
  stats: {
    width: number;
    height: number;
    expectedTileCount: number;
    tileCount: number;
    uniqueTileIds: number;
    groupTileCount: number;
    sourceProvenanceTileCount: number;
    modelResolvedTileCount: number;
    minHeight: number;
    maxHeight: number;
  };
  tilesetFingerprint: string;
}

export interface NewAreaPersistenceResult {
  areaResRef: string;
  areaFingerprint: string;
  created: true;
  resources: Array<{
    extension: "are" | "git" | "gic";
    key: string;
    size: number;
    etag?: string;
  }>;
}

export async function exportAuroraAreaEditingAre(input: {
  accessToken: string;
  name: string;
  state: AuroraAreaEditingState;
  fetchFn?: FetchLike;
  baseUrl?: string;
}): Promise<{ bytes: ArrayBuffer; contentType: string; fileName: string }> {
  const fetchFn = input.fetchFn ?? fetch.bind(globalThis);
  const baseUrl = (input.baseUrl ?? resolveBaseUrl()).replace(/\/+$/u, "");
  const response = await fetchFn(`${baseUrl}/areas/editing/export/area.are`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildAreaEditingDraftPayload(input.name, input.state))
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload && typeof payload === "object" && "error" in payload
      ? String((payload as { error?: unknown }).error ?? "Area export failed.")
      : `Area export failed (${response.status}).`;
    throw new Error(message);
  }
  return {
    bytes: await response.arrayBuffer(),
    contentType: response.headers.get("content-type") ?? "application/octet-stream",
    fileName: `${input.state.areaResRef}.are`
  };
}

export async function verifyAuroraAreaEditing(input: {
  accessToken: string;
  name: string;
  state: AuroraAreaEditingState;
  fetchFn?: FetchLike;
  baseUrl?: string;
}): Promise<AreaEditingVerificationResult> {
  return postAreaEditingJson<AreaEditingVerificationResult>(
    input,
    "/areas/editing/verify"
  );
}

export async function persistNewAuroraArea(input: {
  accessToken: string;
  name: string;
  state: AuroraAreaEditingState;
  fetchFn?: FetchLike;
  baseUrl?: string;
}): Promise<NewAreaPersistenceResult> {
  if (input.state.sourceAreaFingerprint) {
    throw new Error("Only a new local Area draft can be persisted as a new module resource triplet.");
  }
  return postAreaEditingJson<NewAreaPersistenceResult>(
    input,
    "/areas/editing/persist/new-area"
  );
}

export function downloadAreaEditingAre(exported: {
  bytes: ArrayBuffer;
  contentType: string;
  fileName: string;
}): void {
  const url = URL.createObjectURL(new Blob([exported.bytes], { type: exported.contentType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = exported.fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function postAreaEditingJson<T>(
  input: {
    accessToken: string;
    name: string;
    state: AuroraAreaEditingState;
    fetchFn?: FetchLike;
    baseUrl?: string;
  },
  path: string
): Promise<T> {
  const fetchFn = input.fetchFn ?? fetch.bind(globalThis);
  const baseUrl = (input.baseUrl ?? resolveBaseUrl()).replace(/\/+$/u, "");
  const response = await fetchFn(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildAreaEditingDraftPayload(input.name, input.state))
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const record = asRecord(payload);
    const message = typeof record.error === "string"
      ? record.error
      : `Area editing request failed (${response.status}).`;
    throw new Error(message);
  }
  return asRecord(payload).data as T;
}

function buildAreaEditingDraftPayload(name: string, state: AuroraAreaEditingState) {
  return {
    areaResRef: state.areaResRef,
    name,
    width: state.width,
    height: state.height,
    tilesetResRef: state.tilesetResRef,
    tilesetFingerprint: state.tilesetFingerprint,
    areaFingerprint: state.sourceAreaFingerprint,
    tiles: state.tiles.map((tile) => ({
      row: tile.row,
      col: tile.col,
      sourceRow: tile.sourceRow,
      sourceCol: tile.sourceCol,
      tileId: tile.tileId,
      orientation: tile.orientation,
      height: tile.height,
      mainLight1: tile.mainLight1,
      mainLight2: tile.mainLight2,
      sourceLight1: tile.sourceLight1,
      sourceLight2: tile.sourceLight2,
      animLoop1: tile.animLoop1,
      animLoop2: tile.animLoop2,
      animLoop3: tile.animLoop3
    }))
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function resolveBaseUrl(): string {
  const candidate = import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined;
  return candidate?.trim() || (import.meta.env.DEV ? "/_aurora/v1" : "/api/v1");
}
