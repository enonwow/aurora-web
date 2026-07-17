import type { SceneObject } from "../../scene/contracts";
import { createNewSceneObject } from "../../scene/domain/sceneFactory";
import type {
  StoreApiListItem,
  StoreApiMetadataPrimitive
} from "../contracts";

const STORE_TEMPLATE_X = 0.5;
const STORE_TEMPLATE_Y = 0.5;

type StoreMetadata = Record<string, StoreApiMetadataPrimitive>;

function sanitizeIdentifier(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9_]+/gu, "_")
    .replace(/^_+|_+$/gu, "");
  return normalized.length > 0 ? normalized : fallback;
}

function readString(metadata: StoreMetadata | undefined, key: string): string | undefined {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readNumber(metadata: StoreMetadata | undefined, key: string): number | undefined {
  const value = metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function mapStoreApiListItemToSceneObject(
  store: StoreApiListItem,
  sequence = 1
): SceneObject {
  const metadata = store.metadata;
  const object = createNewSceneObject("stores", STORE_TEMPLATE_X, STORE_TEMPLATE_Y, sequence);
  const normalizedTemplateId = sanitizeIdentifier(store.templateId, `store_${sequence}`);
  const templateResRef = readString(metadata, "templateResRef") ?? store.resref;
  const tag = readString(metadata, "tag") ?? store.resref;
  const localizedName = readString(metadata, "localizedName") ?? readString(metadata, "displayName");

  return {
    ...object,
    id: `sto_template_${normalizedTemplateId}`,
    name: localizedName ?? store.name,
    resRef: templateResRef,
    tag: tag.toUpperCase(),
    previewImageUrl: store.previewImageUrl.trim() || undefined,
    isStatic: false,
    source: {
      type: "aurora_git",
      sourceObjectId: store.templateId,
      sourceKind: "store",
      templateId: store.templateId,
      sourceEtag: readString(metadata, "sourceEtag"),
      sourceFileType: readString(metadata, "sourceFileType"),
      sourceFileVersion: readString(metadata, "sourceFileVersion"),
      sourceStructTypeId: readNumber(metadata, "sourceStructTypeId"),
      localizedName,
      description: readString(metadata, "description")
    }
  };
}
