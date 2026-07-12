import { useEffect, useMemo, useState } from "react";
import { createHttpItemApiPort } from "../adapters/httpItemApiPort";
import type { ItemApiListItem, ItemApiProcessResult } from "../contracts";
import {
  applyItemApiProcessResultToSceneObject,
  mapItemApiListItemToSceneObject
} from "../application/itemSceneObjectMapper";
import { ItemModelPreviewPane } from "../../layout/components/properties/ItemModelPreviewPane";
import type { SceneObject } from "../../scene/contracts";

const ITEM_PREVIEW_PROOF_PATH = "/aurora-evidence/item-preview-proof";

interface ProofCase {
  key: string;
  label: string;
  query: string;
  preferredResRef?: string;
}

interface LoadedProofCase extends ProofCase {
  object: SceneObject | null;
  listItem: ItemApiListItem | null;
  processResult: ItemApiProcessResult | null;
  status: "loading" | "ready" | "unsupported" | "error";
  message: string;
}

const PROOF_CASES: ProofCase[] = [
  {
    key: "armor-aarcl009",
    label: "Armor / colored multipart",
    query: "aarcl009",
    preferredResRef: "aarcl009"
  },
  {
    key: "shield-large",
    label: "Shield",
    query: "large shield",
    preferredResRef: "l_lshd_0"
  },
  {
    key: "single-part-torch",
    label: "Single part item",
    query: "torch",
    preferredResRef: "nw_it_torch001"
  },
  {
    key: "unsupported-creature-item",
    label: "Unsupported / no model",
    query: "nw_it_creitemdr3",
    preferredResRef: "nw_it_creitemdr3"
  }
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function loginForProof(): Promise<string> {
  const response = await fetch("/_aurora/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "builder.user", password: "builder123" })
  });
  if (!response.ok) {
    throw new Error(`Login failed with ${response.status}.`);
  }
  const payload: unknown = await response.json();
  const token =
    isRecord(payload) &&
    isRecord(payload.data) &&
    isRecord(payload.data.session) &&
    typeof payload.data.session.accessToken === "string"
      ? payload.data.session.accessToken
      : null;
  if (!token) {
    throw new Error("Login response did not include an access token.");
  }
  return token;
}

function selectProofListItem(
  items: ItemApiListItem[],
  preferredResRef: string | undefined
): ItemApiListItem | null {
  if (items.length === 0) {
    return null;
  }
  const normalizedPreferred = preferredResRef?.trim().toLowerCase();
  if (normalizedPreferred) {
    const exact = items.find((item) => item.resref.trim().toLowerCase() === normalizedPreferred);
    if (exact) {
      return exact;
    }
  }
  return items[0] ?? null;
}

function has3dModelSupport(object: SceneObject): boolean {
  const armorCandidates = object.itemProperties?.armorPartModelCandidates ?? [];
  const partCandidates = object.itemProperties?.modelPartCandidates ?? [];
  return [...armorCandidates, ...partCandidates].some((candidate) =>
    Boolean((candidate.glbUrl ?? candidate.modelUrl ?? "").trim())
  );
}

export function isItemPreviewProofRunnerPath(pathname: string): boolean {
  return pathname === ITEM_PREVIEW_PROOF_PATH;
}

export function ItemPreviewProofRunner() {
  const searchParams = new URLSearchParams(window.location.search);
  const selectedCaseKey = searchParams.get("case")?.trim() ?? "";
  const fixturePath = searchParams.get("fixture")?.trim() ?? "";
  const selectedProofCases = useMemo(
    () =>
      selectedCaseKey.length > 0
        ? PROOF_CASES.filter((proofCase) => proofCase.key === selectedCaseKey)
        : PROOF_CASES,
    [selectedCaseKey]
  );
  const [cases, setCases] = useState<LoadedProofCase[]>(
    selectedProofCases.map((proofCase) => ({
      ...proofCase,
      object: null,
      listItem: null,
      processResult: null,
      status: "loading",
      message: "Loading real item data..."
    }))
  );
  const [token, setToken] = useState<string | null>(null);
  const api = useMemo(() => createHttpItemApiPort(), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (fixturePath.length > 0) {
          const response = await fetch(fixturePath);
          if (!response.ok) {
            throw new Error(`Fixture load failed with ${response.status}.`);
          }
          const payload: unknown = await response.json();
          const accessToken =
            isRecord(payload) && typeof payload.accessToken === "string"
              ? payload.accessToken
              : null;
          const rawCases =
            isRecord(payload) && Array.isArray(payload.cases) ? payload.cases : [];
          if (!accessToken) {
            throw new Error("Fixture did not include an access token.");
          }
          if (cancelled) {
            return;
          }
          setToken((await loginForProof().catch(() => null)) ?? accessToken);
          const loadedCases = selectedProofCases.map((proofCase): LoadedProofCase => {
            const rawCase = rawCases.find(
              (entry) => isRecord(entry) && entry.key === proofCase.key
            );
            const listItem = isRecord(rawCase) ? (rawCase.listItem as ItemApiListItem) : null;
            const processResult = isRecord(rawCase)
              ? (rawCase.processResult as ItemApiProcessResult)
              : null;
            const object =
              listItem && processResult
                ? applyItemApiProcessResultToSceneObject(
                    mapItemApiListItemToSceneObject(listItem, 1),
                    processResult
                  )
                : null;
            return {
              ...proofCase,
              listItem,
              processResult,
              object,
              status: object
                ? has3dModelSupport(object)
                  ? "ready"
                  : "unsupported"
                : "error",
              message: object
                ? has3dModelSupport(object)
                  ? "Real processed item model"
                  : "Unsupported: no processable 3D model candidates"
                : "Fixture case missing."
            };
          });
          setCases(loadedCases);
          return;
        }

        const accessToken = await loginForProof();
        if (cancelled) {
          return;
        }
        setToken(accessToken);

        for (const proofCase of selectedProofCases) {
          try {
            const listResult = await api.listItems(accessToken, {
              query: proofCase.query,
              limit: 25
            });
            const listItem = selectProofListItem(listResult.items, proofCase.preferredResRef);
            if (!listItem) {
              throw new Error(`No catalog item matched ${proofCase.query}.`);
            }
            const baseObject = mapItemApiListItemToSceneObject(listItem, 1);
            const processResult = await api.processItem(accessToken, {
              templateId: listItem.templateId,
              resref: listItem.resref,
              bypassCache: false,
              includeBenchmarkMetadata: true
            });
            const object = applyItemApiProcessResultToSceneObject(baseObject, processResult);
            if (cancelled) {
              return;
            }
            setCases((current) =>
              current.map((entry) =>
                entry.key === proofCase.key
                  ? {
                      ...entry,
                      object,
                      listItem,
                      processResult,
                      status: has3dModelSupport(object) ? "ready" : "unsupported",
                      message: has3dModelSupport(object)
                        ? "Real processed item model"
                        : "Unsupported: no processable 3D model candidates"
                    }
                  : entry
              )
            );
          } catch (error) {
            if (cancelled) {
              return;
            }
            setCases((current) =>
              current.map((entry) =>
                entry.key === proofCase.key
                  ? {
                      ...entry,
                      status: "error",
                      message: error instanceof Error ? error.message : "Unknown proof error."
                    }
                  : entry
              )
            );
          }
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        setCases((current) =>
          current.map((entry) => ({
            ...entry,
            status: "error",
            message: error instanceof Error ? error.message : "Proof login failed."
          }))
        );
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [api, fixturePath, selectedProofCases]);

  return (
    <main className="item-preview-proof-runner" data-proof-runner="item-preview">
      <header className="item-preview-proof-header">
        <h1>Item Preview Proof</h1>
        <p>Real processed Aurora item data, no placeholder models.</p>
      </header>
      <section className="item-preview-proof-grid">
        {cases.map((proofCase) => {
          const object = proofCase.object;
          const textureAssetCount =
            object?.itemProperties?.modelAssetCandidates?.filter(
              (candidate) => candidate.role.trim().toLowerCase() === "texture"
            ).length ?? 0;
          const modelPartCount =
            (object?.itemProperties?.armorPartModelCandidates?.length ?? 0) +
            (object?.itemProperties?.modelPartCandidates?.length ?? 0);
          const supportedModelPartCount = [
            ...(object?.itemProperties?.armorPartModelCandidates ?? []),
            ...(object?.itemProperties?.modelPartCandidates ?? [])
          ].filter((candidate) => (candidate.glbUrl ?? candidate.modelUrl ?? "").trim().length > 0)
            .length;
          return (
            <article
              className={`item-preview-proof-card item-preview-proof-card-${proofCase.status}`}
              data-proof-case={proofCase.key}
              data-proof-status={proofCase.status}
              data-proof-resref={object?.resRef ?? proofCase.preferredResRef ?? proofCase.query}
              data-proof-model-part-count={modelPartCount}
              data-proof-supported-model-part-count={supportedModelPartCount}
              data-proof-texture-asset-count={textureAssetCount}
              data-proof-cache-key={proofCase.processResult?.cache.key ?? ""}
              key={proofCase.key}
            >
              <div className="item-preview-proof-card-header">
                <div>
                  <h2>{proofCase.label}</h2>
                  <p>{object ? `${object.name ?? object.tag} / ${object.resRef}` : proofCase.query}</p>
                </div>
                <span>{proofCase.status}</span>
              </div>
              {object && token ? (
                <ItemModelPreviewPane
                  object={object}
                  previewImageUrl={object.previewImageUrl}
                  previewImageAlt={`${object.name ?? object.tag} icon`}
                  assetAccessToken={token}
                  processingStatus={proofCase.status === "ready" ? "ready" : "idle"}
                />
              ) : (
                <div className="item-preview-proof-placeholder">{proofCase.message}</div>
              )}
              <dl className="item-preview-proof-facts">
                <div>
                  <dt>Template</dt>
                  <dd>{proofCase.listItem?.templateId ?? "-"}</dd>
                </div>
                <div>
                  <dt>Model parts</dt>
                  <dd>{modelPartCount}</dd>
                </div>
                <div>
                  <dt>Texture assets</dt>
                  <dd>{textureAssetCount}</dd>
                </div>
                <div>
                  <dt>Message</dt>
                  <dd>{proofCase.message}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </section>
    </main>
  );
}
