export type EncounterApiMetadataPrimitive = string | number | boolean;

export interface EncounterApiListQuery {
  query?: string;
  category?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}

export interface EncounterApiListItem {
  templateId: string;
  resref: string;
  name: string;
  category: string;
  tags: string[];
  previewImageUrl: string;
  metadata?: Record<string, EncounterApiMetadataPrimitive>;
}

export interface EncounterApiListResult {
  items: EncounterApiListItem[];
  total: number;
  limit: number;
  offset: number;
}
