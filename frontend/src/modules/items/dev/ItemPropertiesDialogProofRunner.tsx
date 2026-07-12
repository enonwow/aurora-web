import { useEffect, useMemo, useState } from "react";
import {
  applyItemApiProcessResultToSceneObject,
  mapItemApiListItemToSceneObject
} from "../application/itemSceneObjectMapper";
import type { ItemApiListItem, ItemApiProcessResult } from "../contracts";
import {
  buildItemPropertiesDraft,
  type ItemPropertiesTab
} from "../../layout/application/workspaceObjectPropertyDrafts";
import { ItemPropertiesDialog } from "../../layout/components/properties/ItemPropertiesDialog";
import type { SceneObject } from "../../scene/contracts";

const ITEM_PROPERTIES_DIALOG_PROOF_PATH = "/aurora-evidence/item-properties-dialog-proof";

interface LoadedDialogProof {
  accessToken: string | null;
  object: SceneObject | null;
  listItem: ItemApiListItem | null;
  processResult: ItemApiProcessResult | null;
  status: "loading" | "ready" | "error";
  message: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolveDialogProofTab(value: string | null): ItemPropertiesTab {
  return value === "basic" ||
    value === "visual" ||
    value === "colors" ||
    value === "properties" ||
    value === "scripts" ||
    value === "comments"
    ? value
    : "colors";
}

function findFixtureCase(rawCases: unknown[], caseKey: string): Record<string, unknown> | null {
  return (
    rawCases.find((entry): entry is Record<string, unknown> => {
      return isRecord(entry) && entry.key === caseKey;
    }) ?? null
  );
}

async function loginForDialogProof(): Promise<string | null> {
  try {
    const response = await fetch("/_aurora/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "builder.user", password: "builder123" })
    });
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    const token =
      isRecord(payload) &&
      isRecord(payload.data) &&
      isRecord(payload.data.session) &&
      typeof payload.data.session.accessToken === "string"
        ? payload.data.session.accessToken
        : null;
    return token;
  } catch {
    return null;
  }
}

export function isItemPropertiesDialogProofRunnerPath(pathname: string): boolean {
  return pathname === ITEM_PROPERTIES_DIALOG_PROOF_PATH;
}

export function ItemPropertiesDialogProofRunner() {
  const searchParams = new URLSearchParams(window.location.search);
  const fixturePath =
    searchParams.get("fixture")?.trim() ||
    "/aurora-evidence/item-preview-proof-2026-07-03-after-armor-layout/item-preview-fixture-aarcl009.json";
  const caseKey = searchParams.get("case")?.trim() || "armor-aarcl009";
  const [activeTab, setActiveTab] = useState<ItemPropertiesTab>(() =>
    resolveDialogProofTab(searchParams.get("tab"))
  );
  const [proof, setProof] = useState<LoadedDialogProof>({
    accessToken: null,
    object: null,
    listItem: null,
    processResult: null,
    status: "loading",
    message: "Loading item properties proof fixture..."
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
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
        const rawCase = findFixtureCase(rawCases, caseKey);
        const listItem = rawCase?.listItem as ItemApiListItem | undefined;
        const processResult = rawCase?.processResult as ItemApiProcessResult | undefined;
        if (!accessToken || !listItem || !processResult) {
          throw new Error(`Fixture does not contain ${caseKey}.`);
        }
        const refreshedAccessToken = (await loginForDialogProof()) ?? accessToken;
        const object = applyItemApiProcessResultToSceneObject(
          mapItemApiListItemToSceneObject(listItem, 1),
          processResult
        );
        if (!cancelled) {
          setProof({
            accessToken: refreshedAccessToken,
            object,
            listItem,
            processResult,
            status: "ready",
            message: "Real processed item properties dialog"
          });
        }
      } catch (error) {
        if (!cancelled) {
          setProof({
            accessToken: null,
            object: null,
            listItem: null,
            processResult: null,
            status: "error",
            message: error instanceof Error ? error.message : "Unknown dialog proof error."
          });
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [caseKey, fixturePath]);

  const dialogState = useMemo(() => {
    if (!proof.object) {
      return null;
    }
    const previewProcessingStatus: "ready" | "processing" =
      proof.status === "ready" ? "ready" : "processing";
    return {
      objectId: proof.object.id,
      snapshotObject: proof.object,
      draft: buildItemPropertiesDraft(proof.object),
      activeTab,
      windowX: 24,
      windowY: 24,
      anchorOffsetX: 0,
      anchorOffsetY: 0,
      collapsed: false,
      previewProcessingStatus
    };
  }, [activeTab, proof.object, proof.status]);

  return (
    <main
      className="item-properties-dialog-proof-runner"
      data-proof-runner="item-properties-dialog"
      data-proof-case={caseKey}
      data-proof-status={proof.status}
      data-proof-resref={proof.object?.resRef ?? ""}
      data-proof-cache-key={proof.processResult?.cache.key ?? ""}
      data-proof-tab={activeTab}
      data-proof-localized-name-str-ref={proof.object?.itemProperties?.localizedNameStrRef ?? ""}
      data-proof-description-str-ref={proof.object?.itemProperties?.descriptionStrRef ?? ""}
      data-proof-identified-description-str-ref={
        proof.object?.itemProperties?.identifiedDescriptionStrRef ?? ""
      }
    >
      {dialogState ? (
        <ItemPropertiesDialog
          itemPropertiesDialog={dialogState}
          toggleItemPropertiesDialogCollapsed={() => undefined}
          cancelItemPropertiesDialog={() => undefined}
          setItemPropertiesActiveTab={setActiveTab}
          updateItemPropertiesDraftField={() => undefined}
          updateItemArmorContextDraftField={() => undefined}
          updateItemArmorPartDraftField={() => undefined}
          updateItemMaterialColorDraftField={() => undefined}
          addItemPropertyEntry={() => undefined}
          updateItemPropertyEntry={() => undefined}
          removeItemPropertyEntry={() => undefined}
          addItemScriptEntry={() => undefined}
          updateItemScriptEntry={() => undefined}
          removeItemScriptEntry={() => undefined}
          applyItemPropertiesDraft={() => undefined}
          itemAssetAccessToken={proof.accessToken}
        />
      ) : (
        <section className="item-preview-proof-placeholder">
          <h1>Item Properties Dialog Proof</h1>
          <p>{proof.message}</p>
        </section>
      )}
    </main>
  );
}
