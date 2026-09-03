import type {
  AreaEditingDraftRequest,
  AreaEditingExportArtifact,
  AreaEditingTransferPort,
  AreaEditingVerificationResult,
} from "../ports/areaEditingPort";

export type { AreaEditingVerificationResult } from "../ports/areaEditingPort";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type AreaEditingHttpRequest = AreaEditingDraftRequest & {
  readonly fetchFn?: FetchLike;
  readonly baseUrl?: string;
};

export interface AreaEditingRequestErrorDetail {
  path: string;
  reason: string;
}

export class AreaEditingRequestError extends Error {
  readonly name = "AreaEditingRequestError";

  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details: readonly AreaEditingRequestErrorDetail[],
    readonly retryable: boolean
  ) {
    super(message);
  }
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

export async function exportAuroraAreaEditingAre(
  input: AreaEditingHttpRequest,
): Promise<AreaEditingExportArtifact> {
  const fetchFn = input.fetchFn ?? fetch.bind(globalThis);
  const baseUrl = (input.baseUrl ?? resolveBaseUrl()).replace(/\/+$/u, "");
  const response = await fetchFn(`${baseUrl}/areas/editing/export/area.are`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildAreaEditingDraftPayload(input))
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw readAreaEditingRequestError(payload, response.status, "Area export failed");
  }
  return {
    bytes: await response.arrayBuffer(),
    contentType: response.headers.get("content-type") ?? "application/octet-stream",
    fileName: `${input.state.areaResRef}.are`
  };
}

export async function verifyAuroraAreaEditing(
  input: AreaEditingHttpRequest,
): Promise<AreaEditingVerificationResult> {
  return postAreaEditingJson<AreaEditingVerificationResult>(
    input,
    "/areas/editing/verify"
  );
}

export async function persistNewAuroraArea(
  input: AreaEditingHttpRequest,
): Promise<NewAreaPersistenceResult> {
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

export function createHttpAreaEditingTransferPort(
  fetchFn: FetchLike = fetch.bind(globalThis),
  baseUrl = resolveBaseUrl(),
): AreaEditingTransferPort {
  return Object.freeze({
    verify(input: AreaEditingDraftRequest) {
      return verifyAuroraAreaEditing({ ...input, fetchFn, baseUrl });
    },
    exportAre(input: AreaEditingDraftRequest) {
      return exportAuroraAreaEditingAre({ ...input, fetchFn, baseUrl });
    },
  });
}

async function postAreaEditingJson<T>(
  input: AreaEditingHttpRequest,
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
    body: JSON.stringify(buildAreaEditingDraftPayload(input))
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw readAreaEditingRequestError(payload, response.status, "Area editing request failed");
  }
  return asRecord(payload).data as T;
}

function buildAreaEditingDraftPayload(input: AreaEditingDraftRequest) {
  const { name, state } = input;
  return {
    areaResRef: state.areaResRef,
    name,
    width: state.width,
    height: state.height,
    tilesetResRef: state.tilesetResRef,
    tilesetFingerprint: state.tilesetFingerprint,
    areaFingerprint: state.sourceAreaFingerprint,
    ...(input.comments ? { comments: { ...input.comments } } : {}),
    ...(input.eventScripts
      ? {
          eventScripts: Object.fromEntries(
            Object.entries(input.eventScripts).map(([slot, mutation]) => [
              slot,
              mutation ? { ...mutation } : mutation,
            ]),
          ),
        }
      : {}),
    ...(input.basicIdentity
      ? {
          basicIdentity: Object.fromEntries(
            Object.entries(input.basicIdentity).map(([field, mutation]) => [
              field,
              mutation
                ? {
                    ...mutation,
                    ...(mutation.expectedEntries
                      ? {
                          expectedEntries: mutation.expectedEntries.map(
                            (entry: { languageId: number; text: string }) => ({ ...entry }),
                          ),
                        }
                      : {}),
                    ...(mutation.valueEntries
                      ? {
                          valueEntries: mutation.valueEntries.map(
                            (entry: { languageId: number; text: string }) => ({ ...entry }),
                          ),
                        }
                      : {}),
                  }
                : mutation,
            ]),
          ),
        }
      : {}),
    ...(input.advancedFlags
      ? {
          advancedFlags: Object.fromEntries(
            Object.entries(input.advancedFlags).map(([field, mutation]) => [
              field,
              mutation
                ? {
                    ...mutation,
                    ...(field === "terrainType"
                      ? {
                          expectedValue: { ...mutation.expectedValue as object },
                          value: { ...mutation.value as object },
                        }
                      : {}),
                  }
                : mutation,
            ]),
          ),
        }
      : {}),
    ...(input.visualEnvironment
      ? {
          visualEnvironment: {
            expectedValue: {
              ...input.visualEnvironment.expectedValue,
              sun: { ...input.visualEnvironment.expectedValue.sun },
              moon: { ...input.visualEnvironment.expectedValue.moon },
            },
            value: {
              ...input.visualEnvironment.value,
              sun: { ...input.visualEnvironment.value.sun },
              moon: { ...input.visualEnvironment.value.moon },
            },
          },
        }
      : {}),
    ...(input.visualEnvironmentScalarControls
      ? {
          visualEnvironmentScalarControls: {
            expectedValue: { ...input.visualEnvironmentScalarControls.expectedValue },
            value: { ...input.visualEnvironmentScalarControls.value },
          },
        }
      : {}),
    ...(input.visualEnvironmentCatalogSelection
      ? {
          visualEnvironmentCatalogSelection: {
            catalogIdentity: {
              ...input.visualEnvironmentCatalogSelection.catalogIdentity,
            },
            expectedValue: {
              ...input.visualEnvironmentCatalogSelection.expectedValue,
              visualEnvironment: cloneVisualEnvironment(
                input.visualEnvironmentCatalogSelection.expectedValue.visualEnvironment,
              ),
              visualEnvironmentScalarControls: {
                ...input.visualEnvironmentCatalogSelection.expectedValue
                  .visualEnvironmentScalarControls,
              },
            },
            value: {
              ...input.visualEnvironmentCatalogSelection.value,
              ...(input.visualEnvironmentCatalogSelection.value.visualEnvironmentOverride
                ? {
                    visualEnvironmentOverride: cloneVisualEnvironment(
                      input.visualEnvironmentCatalogSelection.value.visualEnvironmentOverride,
                    ),
                  }
                : {}),
              ...(input.visualEnvironmentCatalogSelection.value
                .visualEnvironmentScalarControlsOverride
                ? {
                    visualEnvironmentScalarControlsOverride: {
                      ...input.visualEnvironmentCatalogSelection.value
                        .visualEnvironmentScalarControlsOverride,
                    },
                  }
                : {}),
            },
          },
        }
      : {}),
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

function cloneVisualEnvironment<T extends {
  readonly sun: object;
  readonly moon: object;
}>(value: T): T {
  return {
    ...value,
    sun: { ...value.sun },
    moon: { ...value.moon },
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function readAreaEditingRequestError(
  payload: unknown,
  status: number,
  fallback: string
): AreaEditingRequestError {
  const envelope = asRecord(payload);
  const error = asRecord(envelope.error);
  const legacyMessage = typeof envelope.error === "string" ? envelope.error : undefined;
  const message = typeof error.message === "string"
    ? error.message
    : legacyMessage ?? `${fallback} (${status}).`;
  const code = typeof error.code === "string" ? error.code : `HTTP_${status}`;
  const retryable = error.retryable === true;
  const details = Array.isArray(error.details)
    ? error.details.flatMap((entry): AreaEditingRequestErrorDetail[] => {
        const detail = asRecord(entry);
        return typeof detail.path === "string" && typeof detail.reason === "string"
          ? [{ path: detail.path, reason: detail.reason }]
          : [];
      })
    : [];
  return new AreaEditingRequestError(message, status, code, details, retryable);
}

function resolveBaseUrl(): string {
  const candidate = import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined;
  return candidate?.trim() || (import.meta.env.DEV ? "/_aurora/v1" : "/api/v1");
}
