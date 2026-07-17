import type { SceneObjectEmbeddedItemSummary } from "../scene/contracts";

export type StoreApiMetadataPrimitive = string | number | boolean;

export interface StoreApiListQuery {
  query?: string;
  category?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}

export interface StoreApiListItem {
  templateId: string;
  resref: string;
  name: string;
  category: string;
  tags: string[];
  previewImageUrl: string;
  metadata?: Record<string, StoreApiMetadataPrimitive>;
}

export interface StoreApiListResult {
  items: StoreApiListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface StoreApiPreviewResult extends StoreApiListItem {
  kind: "store";
  benchmarkCandidate: boolean;
  benchmarkBucket?: string;
}

export interface StoreApiBlueprintEmbeddedItemEntry extends SceneObjectEmbeddedItemSummary {}

export interface StoreApiBlueprintItemEntry {
  resRef?: string;
  embeddedItem?: StoreApiBlueprintEmbeddedItemEntry;
  randomResRef?: string;
  randomList?: string;
  x?: number;
  y?: number;
  infinite?: boolean;
}

export interface StoreApiBlueprintBucketEntry {
  bucketTypeId?: number;
  itemListEntries?: StoreApiBlueprintItemEntry[];
}

export interface StoreApiBlueprintCreatePayload {
  resRef: string;
  name: string;
  tag?: string;
  comments?: string;
  markUp?: number;
  markDown?: number;
  blackMarket?: boolean;
  bmMarkDown?: number;
  onOpenStore?: string;
  storeId?: number;
  storeListEntries?: StoreApiBlueprintBucketEntry[];
  willNotBuyBaseItems?: number[];
  willOnlyBuyBaseItems?: number[];
  overwrite?: boolean;
}

export interface StoreApiBlueprintDescriptor {
  templateId: string;
  resref: string;
  name: string;
  objectKey: string;
  sizeBytes: number;
  etag?: string;
  sourceFileType: string;
  sourceFileVersion: string;
}

export interface StoreApiBlueprintCreateResult {
  blueprint: StoreApiBlueprintDescriptor;
  store: StoreApiListItem & { kind?: "store" };
}

export interface StoreApiBlueprintDeleteResult {
  resref: string;
  objectKey: string;
  deleted: boolean;
}
