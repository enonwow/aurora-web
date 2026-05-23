export type TemplateKind = "placeable" | "creature" | "item";
export type PlaceableSubtype =
  | "generic"
  | "door"
  | "vfx"
  | "container"
  | "light_source"
  | "trigger_proxy";

export interface TemplateRecord {
  templateId: string;
  kind: TemplateKind;
  placeableSubtype?: PlaceableSubtype;
  benchmarkCandidate?: boolean;
  benchmarkBucket?: string;
  resref: string;
  name: string;
  category: string;
  tags: string[];
  previewImageUrl: string;
  metadata: Record<string, string | number | boolean>;
}

export interface TemplateListQuery {
  query?: string;
  category?: string;
  tag?: string;
  subtype?: PlaceableSubtype;
  benchmark?: boolean;
  limit: number;
  offset: number;
}

export interface TemplateListResult {
  items: TemplateRecord[];
  total: number;
  limit: number;
  offset: number;
}
