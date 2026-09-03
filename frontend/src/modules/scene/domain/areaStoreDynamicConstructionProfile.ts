import type { SceneObjectSourceMetadata } from "../contracts";

export const AREA_STORE_DYNAMIC_CONSTRUCTION_PROFILE = Object.freeze({
  id: "effective-catalog-utm-store-copy-v1",
  sourceKind: "store" as const,
  sceneKind: "stores" as const,
  sourceExtension: "utm" as const,
  fileType: "UTM " as const,
  fileVersion: "V3.2" as const,
  rootStructTypeId: 0xffffffff,
  maxSourceBytes: 1024 * 1024,
  maxSourceObjectKeyCodeUnits: 2048,
} as const);

export interface DynamicAreaStoreCatalogItem {
  readonly templateId: string;
  readonly resref: string;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface DynamicAreaStoreConstructionDefaults {
  readonly resRef: string;
  readonly tag: string;
  readonly source: Readonly<SceneObjectSourceMetadata & {
    type: "aurora_blueprint";
    sourceKind: "store";
    sourceProfileId: string;
    templateId: string;
    templateResRef: string;
    sourceObjectKey: string;
    sourceSizeBytes: number;
    sourceEtag: string;
    sourceFileType: "UTM ";
    sourceFileVersion: "V3.2";
    sourceStructTypeId: number;
  }>;
}

export function readDynamicAreaStoreConstructionDefaults(
  store: DynamicAreaStoreCatalogItem,
): DynamicAreaStoreConstructionDefaults | undefined {
  const profile = AREA_STORE_DYNAMIC_CONSTRUCTION_PROFILE;
  const metadata = store.metadata;
  if (!metadata || typeof store.templateId !== "string" ||
    !/^[A-Za-z0-9_-]{1,80}$/u.test(store.templateId) ||
    typeof store.resref !== "string" || !/^[a-z0-9_]{1,16}$/u.test(store.resref)) {
    return undefined;
  }

  const sourceObjectKey = metadata.sourceObjectKey;
  const sourceSizeBytes = metadata.sourceSizeBytes;
  const sourceSha256 = metadata.sourceSha256;
  const templateResRef = metadata.templateResRef;
  const tag = metadata.tag;
  if (typeof sourceObjectKey !== "string" || sourceObjectKey.trim().length < 1 ||
    sourceObjectKey.length > profile.maxSourceObjectKeyCodeUnits ||
    sourceObjectKey.includes("\0") || !Number.isSafeInteger(sourceSizeBytes) ||
    Number(sourceSizeBytes) < 1 || Number(sourceSizeBytes) > profile.maxSourceBytes ||
    typeof sourceSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(sourceSha256) ||
    metadata.sourceExtension !== profile.sourceExtension ||
    metadata.sourceFileType !== profile.fileType ||
    metadata.sourceFileVersion !== profile.fileVersion ||
    metadata.sourceStructTypeId !== profile.rootStructTypeId ||
    typeof templateResRef !== "string" || templateResRef !== store.resref ||
    typeof tag !== "string" || tag.length < 1 || tag.length > 256 || tag.includes("\0")) {
    return undefined;
  }

  const source = Object.freeze({
    type: "aurora_blueprint" as const,
    sourceKind: profile.sourceKind,
    sourceProfileId: profile.id,
    templateId: store.templateId,
    templateResRef,
    sourceObjectKey,
    sourceSizeBytes: Number(sourceSizeBytes),
    sourceEtag: sourceSha256,
    sourceFileType: profile.fileType,
    sourceFileVersion: profile.fileVersion,
    sourceStructTypeId: profile.rootStructTypeId,
  });
  return Object.freeze({ resRef: templateResRef, tag, source });
}
